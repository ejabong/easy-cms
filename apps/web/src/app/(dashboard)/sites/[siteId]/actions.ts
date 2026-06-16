'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma, type PageType } from '@easy-cms/db';
import { requirePermission } from '@/lib/guards';
import { slugify } from '@/lib/utils';

async function orgIdForSite(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) throw new Error('Site not found');
  return site.organizationId;
}

/** Creates a blank page in a site, then opens it in the builder. */
export async function createPage(formData: FormData) {
  const siteId = String(formData.get('siteId'));
  const title = String(formData.get('title') ?? '').trim();
  const type = (String(formData.get('type') ?? 'CUSTOM') as PageType) ?? 'CUSTOM';
  if (!title) throw new Error('Page title is required');

  await requirePermission(await orgIdForSite(siteId), 'page:create');

  // Slug must be unique within the site.
  const base = slugify(title) || 'page';
  let slug = base;
  let n = 1;
  while (await prisma.page.findFirst({ where: { siteId, slug } })) slug = `${base}-${n++}`;

  const page = await prisma.page.create({
    data: { siteId, title, slug, type, content: [] },
  });

  redirect(`/sites/${siteId}/builder/${page.id}`);
}

/** Publishes or unpublishes the whole site. */
export async function setSiteStatus(siteId: string, status: 'PUBLISHED' | 'DRAFT') {
  await requirePermission(await orgIdForSite(siteId), 'site:publish');
  await prisma.site.update({
    where: { id: siteId },
    data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : null },
  });
  revalidatePath(`/sites/${siteId}`);
}

export async function deletePage(siteId: string, pageId: string) {
  await requirePermission(await orgIdForSite(siteId), 'page:edit');
  await prisma.page.delete({ where: { id: pageId } });
  revalidatePath(`/sites/${siteId}`);
}
