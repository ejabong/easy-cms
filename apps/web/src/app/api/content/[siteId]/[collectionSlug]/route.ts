import type { NextRequest } from 'next/server';
import { prisma } from '@easy-cms/db';
import {
  getCollectionBySlug,
  listPublishedRecords,
  expandReferences,
} from '@/lib/data/collections';
import { ok, err } from '@/lib/api/response';
import type { ViewField } from '@/components/cms/record-view';

/**
 * Content Delivery API — list published records of a collection.
 *
 *   GET /api/content/:siteId/:collectionSlug?limit=20&offset=0&expand=true
 *
 * Read-only; serves only PUBLISHED content of PUBLISHED sites. Scoped by site.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; collectionSlug: string }> },
) {
  const { siteId, collectionSlug } = await params;

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.status !== 'PUBLISHED') return err('site_not_found', 'Site not found', 404);

  const collection = await getCollectionBySlug(siteId, collectionSlug);
  if (!collection) return err('collection_not_found', 'Collection not found', 404);

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') ?? '20');
  const offset = Number(searchParams.get('offset') ?? '0');
  const expand = searchParams.get('expand') === 'true';

  const { records, total } = await listPublishedRecords(collection.id, { limit, offset });
  const fields = collection.fields as ViewField[];

  const data = expand
    ? await Promise.all(
        records.map(async (r) => ({
          id: r.id,
          publishedAt: r.publishedAt,
          data: await expandReferences(siteId, fields, r.data as Record<string, unknown>),
        })),
      )
    : records.map((r) => ({ id: r.id, publishedAt: r.publishedAt, data: r.data }));

  return ok(data, { total, limit, offset, collection: collection.slug });
}
