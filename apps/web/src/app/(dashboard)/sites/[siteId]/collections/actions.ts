'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma, type Prisma, type FieldType, type ContentStatus } from '@easy-cms/db';
import { buildRecordSchema, FIELD_TYPES, type FieldDefinition } from '@easy-cms/core';
import { requirePermission } from '@/lib/guards';
import { slugify } from '@/lib/utils';

async function orgIdForSite(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) throw new Error('Site not found');
  return site.organizationId;
}

// ── Collections ────────────────────────────────────────────────────────────

export async function createCollection(formData: FormData) {
  const siteId = String(formData.get('siteId'));
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Collection name is required');
  await requirePermission(await orgIdForSite(siteId), 'content:create');

  const base = slugify(name) || 'collection';
  let slug = base;
  let n = 1;
  while (await prisma.collection.findFirst({ where: { siteId, slug } })) slug = `${base}-${n++}`;

  const collection = await prisma.collection.create({ data: { siteId, name, slug } });
  redirect(`/sites/${siteId}/collections/${collection.id}`);
}

export async function deleteCollection(siteId: string, collectionId: string) {
  await requirePermission(await orgIdForSite(siteId), 'content:edit');
  const collection = await prisma.collection.findFirst({ where: { id: collectionId, siteId } });
  if (collection?.isSystem) throw new Error('System collections cannot be deleted');
  await prisma.collection.delete({ where: { id: collectionId } });
  redirect(`/sites/${siteId}/collections`);
}

// ── Fields ──────────────────────────────────────────────────────────────────

export async function addField(formData: FormData) {
  const siteId = String(formData.get('siteId'));
  const collectionId = String(formData.get('collectionId'));
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? 'TEXT') as FieldType;
  const required = formData.get('required') === 'on';
  const optionsRaw = String(formData.get('options') ?? '').trim();

  if (!name) throw new Error('Field name is required');
  if (!FIELD_TYPES.includes(type as never)) throw new Error('Invalid field type');
  await requirePermission(await orgIdForSite(siteId), 'content:edit');

  // Machine key, unique within the collection.
  const base = slugify(name).replace(/-/g, '_') || 'field';
  let key = base;
  let n = 1;
  while (await prisma.collectionField.findFirst({ where: { collectionId, key } })) {
    key = `${base}_${n++}`;
  }

  // SELECT/MULTI_SELECT options: one "value:Label" (or "value") per line.
  let config: Prisma.InputJsonValue | undefined;
  if ((type === 'SELECT' || type === 'MULTI_SELECT') && optionsRaw) {
    const options = optionsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, label] = line.split(':').map((s) => s.trim());
        return { value: value!, label: label || value! };
      });
    config = { options };
  }

  const count = await prisma.collectionField.count({ where: { collectionId } });
  await prisma.collectionField.create({
    data: { collectionId, name, key, type, required, order: count, ...(config && { config }) },
  });

  revalidatePath(`/sites/${siteId}/collections/${collectionId}`);
}

export async function deleteField(siteId: string, collectionId: string, fieldId: string) {
  await requirePermission(await orgIdForSite(siteId), 'content:edit');
  await prisma.collectionField.delete({ where: { id: fieldId } });
  revalidatePath(`/sites/${siteId}/collections/${collectionId}`);
}

// ── Records ──────────────────────────────────────────────────────────────────

/** Coerce raw form values into typed values per the collection's field defs. */
function parseRecordData(
  fields: { key: string; type: FieldType }[],
  formData: FormData,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(field.key);
    switch (field.type) {
      case 'NUMBER':
        if (raw !== null && raw !== '') data[field.key] = Number(raw);
        break;
      case 'BOOLEAN':
        data[field.key] = raw === 'on';
        break;
      case 'DATE':
        if (raw) data[field.key] = new Date(String(raw)).toISOString();
        break;
      case 'MULTI_SELECT':
        data[field.key] = formData.getAll(field.key).map(String);
        break;
      case 'IMAGE':
        if (raw) data[field.key] = { id: 'external', url: String(raw) };
        break;
      case 'JSON':
      case 'GALLERY':
      case 'RICH_TEXT':
        if (raw) {
          try {
            data[field.key] = JSON.parse(String(raw));
          } catch {
            throw new Error(`Field "${field.key}" must be valid JSON`);
          }
        }
        break;
      default: // TEXT, TEXTAREA, SELECT, REFERENCE
        if (raw !== null && raw !== '') data[field.key] = String(raw);
    }
  }
  return data;
}

async function loadFields(siteId: string, collectionId: string) {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, siteId },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
  if (!collection) throw new Error('Collection not found');
  return collection.fields;
}

export async function saveRecord(formData: FormData) {
  const siteId = String(formData.get('siteId'));
  const collectionId = String(formData.get('collectionId'));
  const recordId = String(formData.get('recordId') ?? '');
  const publish = formData.get('publish') === 'true';
  await requirePermission(await orgIdForSite(siteId), publish ? 'content:publish' : 'content:edit');

  const fields = await loadFields(siteId, collectionId);
  const raw = parseRecordData(fields, formData);
  const data = buildRecordSchema(fields as FieldDefinition[]).parse(raw) as Prisma.InputJsonValue;
  const status: ContentStatus | undefined = publish ? 'PUBLISHED' : undefined;

  if (recordId) {
    await prisma.record.update({
      where: { id: recordId },
      data: { data, ...(status && { status, publishedAt: new Date() }) },
    });
  } else {
    await prisma.record.create({
      data: {
        collectionId,
        data,
        status: status ?? 'DRAFT',
        ...(status && { publishedAt: new Date() }),
      },
    });
  }

  redirect(`/sites/${siteId}/collections/${collectionId}`);
}

export async function deleteRecord(siteId: string, collectionId: string, recordId: string) {
  await requirePermission(await orgIdForSite(siteId), 'content:edit');
  await prisma.record.delete({ where: { id: recordId } });
  revalidatePath(`/sites/${siteId}/collections/${collectionId}`);
}
