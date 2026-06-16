'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@easy-cms/db';
import { requireSession, requirePermission } from '@/lib/guards';
import { ensurePersonalOrg, uniqueSiteSlug } from '@/lib/data/orgs';

/**
 * Creates a new site in the user's (personal) organization, seeds it with a
 * default theme + a published-ready Home page, then redirects into the builder.
 */
export async function createSite(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  if (!name) throw new Error('Site name is required');

  const organizationId = await ensurePersonalOrg(session.user);
  await requirePermission(organizationId, 'site:create');

  const slug = await uniqueSiteSlug(name);
  const theme = await prisma.theme.findFirst({ where: { isDefault: true } });

  const site = await prisma.site.create({
    data: {
      organizationId,
      name,
      description,
      slug,
      themeId: theme?.id,
      pages: {
        create: {
          title: 'Home',
          slug: 'home',
          type: 'HOME',
          isHomePage: true,
          content: [
            {
              id: 'blk_hero',
              type: 'section',
              variant: 'hero-centered',
              props: {
                heading: name,
                subheading: description ?? 'Welcome to your new site.',
                ctaLabel: 'Get started',
                ctaHref: '#',
              },
              children: [],
            },
          ],
        },
      },
    },
    include: { pages: true },
  });

  redirect(`/sites/${site.id}/builder/${site.pages[0]!.id}`);
}
