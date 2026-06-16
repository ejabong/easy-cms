import { prisma } from '@easy-cms/db';
import { slugify } from '@/lib/utils';

/**
 * Ensures the user has at least one organization (their personal workspace),
 * creating one on first use with the user as ADMIN and a Free subscription.
 * Returns the organization id to use as the active tenant context.
 */
export async function ensurePersonalOrg(user: {
  id: string;
  name?: string | null;
  email: string;
}): Promise<string> {
  const existing = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing.organizationId;

  const base = slugify(user.name ?? user.email.split('@')[0] ?? 'workspace') || 'workspace';
  const slug = await uniqueOrgSlug(base);

  const org = await prisma.organization.create({
    data: {
      name: user.name ? `${user.name}'s Workspace` : 'My Workspace',
      slug,
      ownerId: user.id,
      members: { create: { userId: user.id, role: 'ADMIN' } },
    },
  });

  // Attach the Free plan if it exists (seeded).
  const free = await prisma.plan.findUnique({ where: { name: 'Free' } });
  if (free) {
    await prisma.subscription.create({
      data: { organizationId: org.id, planId: free.id, status: 'ACTIVE' },
    });
  }

  return org.id;
}

async function uniqueOrgSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

/** Generates a globally-unique Site slug from a desired base. */
export async function uniqueSiteSlug(base: string): Promise<string> {
  const start = slugify(base) || 'site';
  let slug = start;
  let n = 1;
  while (await prisma.site.findUnique({ where: { slug } })) {
    slug = `${start}-${n++}`;
  }
  return slug;
}
