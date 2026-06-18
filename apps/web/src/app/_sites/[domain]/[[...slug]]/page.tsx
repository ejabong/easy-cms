import { notFound } from 'next/navigation';
import { resolveTenant, pageContentSchema } from '@easy-cms/core';
import { getSiteByHost, getPublishedPage, getHomePage } from '@/lib/data/sites';
import {
  getCollectionBySlug,
  listPublishedRecords,
  getPublishedRecord,
  expandReferences,
} from '@/lib/data/collections';
import { BlockRenderer } from '@/components/builder/block-renderer';
import { RecordList, RecordDetail, type ViewField } from '@/components/cms/record-view';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'localhost:3000';

// Incremental Static Regeneration: published content is cached and revalidated.
export const revalidate = 60;
export const dynamicParams = true;

type Params = { domain: string; slug?: string[] };

export default async function SitePage({ params }: { params: Promise<Params> }) {
  const { domain, slug } = await params;
  const host = decodeURIComponent(domain);

  const site = await getSiteByHost(resolveTenant(host, ROOT_DOMAIN));
  if (!site || site.status === 'SUSPENDED') notFound();

  const segments = slug ?? [];

  // 1. Home page.
  if (segments.length === 0) {
    const home = await getHomePage(site.id);
    if (home) return renderPage(site.slug, home.content);
    notFound();
  }

  // 2. A built page that exactly matches the path.
  const path = segments.join('/');
  const page = await getPublishedPage(site.id, path);
  if (page) return renderPage(site.slug, page.content);

  // 3. CMS collection routes: /[collectionSlug] and /[collectionSlug]/[recordId].
  const collection = await getCollectionBySlug(site.id, segments[0]!);
  if (collection) {
    const fields = collection.fields as ViewField[];
    const basePath = `/${collection.slug}`;

    if (segments.length === 1) {
      const { records } = await listPublishedRecords(collection.id, { limit: 60 });
      return (
        <main data-site={site.slug}>
          <h1 className="px-6 pt-12 text-center text-3xl font-bold">{collection.name}</h1>
          <RecordList basePath={basePath} fields={fields} records={records} />
        </main>
      );
    }

    if (segments.length === 2) {
      const record = await getPublishedRecord(collection.id, segments[1]!);
      if (!record) notFound();
      const data = await expandReferences(
        site.id,
        fields,
        record.data as Record<string, unknown>,
      );
      return (
        <main data-site={site.slug}>
          <RecordDetail fields={fields} data={data} />
        </main>
      );
    }
  }

  notFound();
}

function renderPage(siteSlug: string, content: unknown) {
  const parsed = pageContentSchema.safeParse(content);
  return (
    <main data-site={siteSlug}>
      <BlockRenderer nodes={parsed.success ? parsed.data : []} />
    </main>
  );
}
