import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@easy-cms/db';
import { can, type Permission, type Role } from '@easy-cms/core';

/** Require an authenticated session, else redirect to login. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return session;
}

/**
 * Require that the current user has `permission` within `organizationId`.
 * SUPER_ADMIN bypasses the membership check.
 */
export async function requirePermission(organizationId: string, permission: Permission) {
  const session = await requireSession();

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.platformRole === 'SUPER_ADMIN') return { session, role: 'ADMIN' as Role };

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId } },
  });

  if (!membership || !can(membership.role as Role, permission)) {
    throw new Error('Forbidden');
  }
  return { session, role: membership.role as Role };
}
