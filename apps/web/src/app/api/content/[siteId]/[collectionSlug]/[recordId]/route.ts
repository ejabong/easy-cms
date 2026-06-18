import type { NextRequest } from 'next/server';
import { prisma } from '@easy-cms/db';
import { getCollectionBySlug, getPublishedRecord, expandReferences } from '@/lib/data/collections';
import { ok, err } from '@/lib/api/response';
import type { ViewField } from '@/components/cms/record-view';

/**
 * Content Delivery API — fetch a single published record.
 *
 *   GET /api/content/:siteId/:collectionSlug/:recordId?expand=true
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; collectionSlug: string; recordId: string }> },
) {
  const { siteId, collectionSlug, recordId } = await params;

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.status !== 'PUBLISHED') return err('site_not_found', 'Site not found', 404);

  const collection = await getCollectionBySlug(siteId, collectionSlug);
  if (!collection) return err('collection_not_found', 'Collection not found', 404);

  const record = await getPublishedRecord(collection.id, recordId);
  if (!record) return err('record_not_found', 'Record not found', 404);

  const expand = new URL(req.url).searchParams.get('expand') === 'true';
  const fields = collection.fields as ViewField[];
  const data = expand
    ? await expandReferences(siteId, fields, record.data as Record<string, unknown>)
    : record.data;

  return ok({ id: record.id, publishedAt: record.publishedAt, data });
}
