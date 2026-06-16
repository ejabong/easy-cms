import { notFound } from 'next/navigation';
import { prisma } from '@easy-cms/db';
import { pageContentSchema } from '@easy-cms/core';
import { requireSession } from '@/lib/guards';
import { BuilderEditor } from './editor';

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ siteId: string; pageId: string }>;
}) {
  await requireSession();
  const { siteId, pageId } = await params;

  const page = await prisma.page.findFirst({ where: { id: pageId, siteId } });
  if (!page) notFound();

  const parsed = pageContentSchema.safeParse(page.content);

  return (
    <BuilderEditor
      siteId={siteId}
      pageId={pageId}
      title={page.title}
      initialContent={parsed.success ? parsed.data : []}
    />
  );
}
