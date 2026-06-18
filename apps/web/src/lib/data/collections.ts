import { prisma, type CollectionField } from '@easy-cms/db';
import type { FieldType } from '@easy-cms/core';

/** Serializable field shape passed to the client record form. */
export interface FieldDTO {
  id: string;
  key: string;
  name: string;
  type: FieldType;
  required: boolean;
  config: { options?: { value: string; label: string }[] } | null;
}

export function toFieldDTOs(fields: CollectionField[]): FieldDTO[] {
  return fields.map((f) => ({
    id: f.id,
    key: f.key,
    name: f.name,
    type: f.type as FieldType,
    required: f.required,
    config: (f.config as unknown as FieldDTO['config']) ?? null,
  }));
}

/**
 * Tenant-scoped data access for the headless CMS.
 * Every query is scoped through a known `siteId`; records are reached via
 * their collection, which belongs to the site.
 */

export function listCollections(siteId: string) {
  return prisma.collection.findMany({
    where: { siteId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { records: true, fields: true } } },
  });
}

/** Fetch a collection (scoped to its site) with ordered fields. */
export function getCollection(siteId: string, collectionId: string) {
  return prisma.collection.findFirst({
    where: { id: collectionId, siteId },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
}

export function listRecords(collectionId: string) {
  return prisma.record.findMany({
    where: { collectionId },
    orderBy: { updatedAt: 'desc' },
  });
}

export function getRecord(collectionId: string, recordId: string) {
  return prisma.record.findFirst({ where: { id: recordId, collectionId } });
}

/**
 * Derive a human label for a record from its data: the first TEXT/TEXTAREA
 * field value, falling back to the record id.
 */
export function recordLabel(
  fields: { key: string; type: string }[],
  data: Record<string, unknown>,
  fallback: string,
): string {
  const titleField = fields.find((f) => f.type === 'TEXT' || f.type === 'TEXTAREA');
  const value = titleField ? data[titleField.key] : undefined;
  return typeof value === 'string' && value.trim() ? value : fallback;
}
