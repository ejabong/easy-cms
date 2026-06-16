/**
 * Role-Based Access Control.
 *
 * Platform-level: SUPER_ADMIN bypasses org checks.
 * Org-level roles (Membership.role): ADMIN > EDITOR > AUTHOR > MEMBER.
 */

export type Role = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'MEMBER';

export const PERMISSIONS = [
  'site:create',
  'site:edit',
  'site:delete',
  'site:publish',
  'page:create',
  'page:edit',
  'page:publish',
  'content:create',
  'content:edit',
  'content:publish',
  'media:upload',
  'media:delete',
  'form:manage',
  'user:manage',
  'billing:manage',
  'template:manage',
  'settings:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  EDITOR: [
    'site:edit',
    'site:publish',
    'page:create',
    'page:edit',
    'page:publish',
    'content:create',
    'content:edit',
    'content:publish',
    'media:upload',
    'media:delete',
    'form:manage',
  ],
  AUTHOR: [
    'page:create',
    'page:edit',
    'content:create',
    'content:edit',
    'media:upload',
  ],
  MEMBER: [],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

const RANK: Record<Role, number> = { ADMIN: 3, EDITOR: 2, AUTHOR: 1, MEMBER: 0 };

/** True if `role` is at least as privileged as `min`. */
export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}
