import { prisma } from '@easy-cms/db';

/**
 * Tenant-scoped data access for sites & published pages.
 *
 * Public site rendering resolves a Site by custom domain or system subdomain,
 * then fetches only PUBLISHED content. All queries are scoped by siteId.
 */

export async function getSiteByHost(resolution: {
  kind: string;
  slug?: string;
  hostname?: string;
}) {
  if (resolution.kind === 'site-subdomain' && resolution.slug) {
    return prisma.site.findUnique({
      where: { slug: resolution.slug },
      include: { theme: true },
    });
  }
  if (resolution.kind === 'site-domain' && resolution.hostname) {
    const domain = await prisma.domain.findUnique({
      where: { hostname: resolution.hostname },
      include: { site: { include: { theme: true } } },
    });
    return domain?.status === 'ACTIVE' ? domain.site : null;
  }
  return null;
}

export async function getPublishedPage(siteId: string, slug: string) {
  return prisma.page.findFirst({
    where: { siteId, slug, status: 'PUBLISHED' },
  });
}

export async function getHomePage(siteId: string) {
  return prisma.page.findFirst({
    where: { siteId, isHomePage: true, status: 'PUBLISHED' },
  });
}

/** Sites a member can access within an organization (RBAC enforced upstream). */
export async function listSitesForOrg(organizationId: string) {
  return prisma.site.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
  });
}
