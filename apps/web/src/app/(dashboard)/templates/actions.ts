'use server';

import { redirect } from 'next/navigation';
import { prisma, type Prisma, type PageType } from '@easy-cms/db';
import { getTemplateBlueprint, type TemplateManifest } from '@easy-cms/core';
import { requireSession, requirePermission } from '@/lib/guards';
import { ensurePersonalOrg, uniqueSiteSlug } from '@/lib/data/orgs';

/**
 * Installs a template into a new site: clones the template's theme into the
 * user's org and creates a site with all of the template's pages, then opens
 * the home page in the builder.
 */
export async function installTemplate(formData: FormData) {
  const session = await requireSession();
  const slug = String(formData.get('templateSlug') ?? '');
  const name = String(formData.get('name') ?? '').trim();

  const template = await prisma.template.findUnique({
    where: { slug },
    include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!template) throw new Error('Template not found');

  // Prefer the stored manifest; fall back to the in-code catalog blueprint.
  const manifest =
    (template.versions[0]?.manifest as unknown as TemplateManifest | undefined) ??
    getTemplateBlueprint(slug)?.manifest;
  if (!manifest) throw new Error('Template has no manifest');

  const organizationId = await ensurePersonalOrg(session.user);
  await requirePermission(organizationId, 'site:create');

  const siteName = name || template.name;
  const siteSlug = await uniqueSiteSlug(siteName);

  // Clone the template theme into an org-owned theme so edits stay isolated.
  const theme = await prisma.theme.create({
    data: {
      organizationId,
      name: `${siteName} theme`,
      tokens: manifest.themeTokens as Prisma.InputJsonValue,
    },
  });

  const site = await prisma.site.create({
    data: {
      organizationId,
      name: siteName,
      slug: siteSlug,
      description: template.description,
      themeId: theme.id,
      templateId: template.id,
      pages: {
        create: manifest.pages.map((page) => ({
          title: page.title,
          slug: page.slug,
          type: page.type as PageType,
          isHomePage: page.isHomePage ?? false,
          content: page.content as unknown as Prisma.InputJsonValue,
        })),
      },
    },
    include: { pages: true },
  });

  await prisma.template.update({
    where: { id: template.id },
    data: { installs: { increment: 1 } },
  });

  const home = site.pages.find((p) => p.isHomePage) ?? site.pages[0]!;
  redirect(`/sites/${site.id}/builder/${home.id}`);
}
