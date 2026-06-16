'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type Prisma } from '@easy-cms/db';
import { pageContentSchema } from '@easy-cms/core';
import { requirePermission } from '@/lib/guards';

/**
 * Persist the builder's block tree for a page. Validates the tree, writes a
 * new PageVersion snapshot, and updates the live content. RBAC-gated.
 */
export async function savePage(input: {
  siteId: string;
  pageId: string;
  content: unknown;
  publish?: boolean;
  label?: string;
}) {
  const site = await prisma.site.findUnique({ where: { id: input.siteId } });
  if (!site) throw new Error('Site not found');

  await requirePermission(site.organizationId, input.publish ? 'page:publish' : 'page:edit');

  // Validated, then cast to Prisma's JSON input type (the typed BlockNode[]
  // shape isn't structurally a Prisma InputJsonValue).
  const content = pageContentSchema.parse(input.content) as unknown as Prisma.InputJsonValue;

  const lastVersion = await prisma.pageVersion.findFirst({
    where: { pageId: input.pageId },
    orderBy: { version: 'desc' },
  });

  await prisma.$transaction([
    prisma.pageVersion.create({
      data: {
        pageId: input.pageId,
        version: (lastVersion?.version ?? 0) + 1,
        content,
        label: input.label ?? (input.publish ? 'Published' : 'Manual save'),
      },
    }),
    prisma.page.update({
      where: { id: input.pageId },
      data: {
        content,
        ...(input.publish && { status: 'PUBLISHED', publishedAt: new Date() }),
      },
    }),
  ]);

  revalidatePath(`/sites/${input.siteId}/builder/${input.pageId}`);
  return { ok: true };
}
