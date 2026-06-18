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

// ── Public content delivery ──────────────────────────────────────────────────

/** Fetch a collection by its public slug (scoped to a site), with fields. */
export function getCollectionBySlug(siteId: string, slug: string) {
  return prisma.collection.findFirst({
    where: { siteId, slug },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
}

/** Published records of a collection, newest first, paginated. */
export async function listPublishedRecords(
  collectionId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
) {
  const where = { collectionId, status: 'PUBLISHED' as const };
  const [records, total] = await Promise.all([
    prisma.record.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
    }),
    prisma.record.count({ where }),
  ]);
  return { records, total };
}

export function getPublishedRecord(collectionId: string, recordId: string) {
  return prisma.record.findFirst({
    where: { id: recordId, collectionId, status: 'PUBLISHED' },
  });
}

/**
 * Resolve REFERENCE fields one level deep. For each reference field, the stored
 * id(s) are replaced with the published target record(s), scoped to the site so
 * references can never cross a tenant boundary. Batches lookups to avoid N+1.
 */
export async function expandReferences(
  siteId: string,
  fields: { key: string; type: string }[],
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const refFields = fields.filter((f) => f.type === 'REFERENCE');
  if (refFields.length === 0) return data;

  const ids = new Set<string>();
  for (const f of refFields) {
    const v = data[f.key];
    if (typeof v === 'string') ids.add(v);
    else if (Array.isArray(v)) v.forEach((x) => typeof x === 'string' && ids.add(x));
  }
  if (ids.size === 0) return data;

  const targets = await prisma.record.findMany({
    where: { id: { in: [...ids] }, status: 'PUBLISHED', collection: { siteId } },
  });
  const byId = new Map(targets.map((r) => [r.id, { id: r.id, data: r.data }]));

  const out: Record<string, unknown> = { ...data };
  for (const f of refFields) {
    const v = data[f.key];
    if (typeof v === 'string') out[f.key] = byId.get(v) ?? null;
    else if (Array.isArray(v)) out[f.key] = v.map((x) => (typeof x === 'string' ? byId.get(x) ?? null : null));
  }
  return out;
}
