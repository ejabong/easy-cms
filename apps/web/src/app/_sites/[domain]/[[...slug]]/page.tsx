import { notFound } from 'next/navigation';
import { resolveTenant, pageContentSchema } from '@easy-cms/core';
import { getSiteByHost, getPublishedPage, getHomePage } from '@/lib/data/sites';
import { BlockRenderer } from '@/components/builder/block-renderer';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'localhost:3000';

// Incremental Static Regeneration: published pages are cached and revalidated.
export const revalidate = 60;
export const dynamicParams = true;

type Params = { domain: string; slug?: string[] };

export default async function SitePage({ params }: { params: Promise<Params> }) {
  const { domain, slug } = await params;
  const host = decodeURIComponent(domain);

  const site = await getSiteByHost(resolveTenant(host, ROOT_DOMAIN));
  if (!site || site.status === 'SUSPENDED') notFound();

  const path = slug?.join('/') ?? '';
  const page = path ? await getPublishedPage(site.id, path) : await getHomePage(site.id);
  if (!page) notFound();

  const parsed = pageContentSchema.safeParse(page.content);
  const nodes = parsed.success ? parsed.data : [];

  return (
    <main data-site={site.slug}>
      <BlockRenderer nodes={nodes} />
    </main>
  );
}
