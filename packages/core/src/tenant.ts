/**
 * Tenant resolution helpers.
 *
 * A request's host maps to a Site via either:
 *  - a custom domain (Domain.hostname), or
 *  - a system subdomain: {site.slug}.{ROOT_DOMAIN}
 *
 * The platform app (dashboard/admin) lives on the apex / `app.` subdomain.
 */

export type TenantResolution =
  | { kind: 'platform' }
  | { kind: 'site-subdomain'; slug: string }
  | { kind: 'site-domain'; hostname: string };

export function resolveTenant(host: string, rootDomain: string): TenantResolution {
  const cleanHost = host.split(':')[0]!.toLowerCase();
  const cleanRoot = rootDomain.split(':')[0]!.toLowerCase();

  // Platform surfaces.
  if (cleanHost === cleanRoot || cleanHost === `app.${cleanRoot}` || cleanHost === 'localhost') {
    return { kind: 'platform' };
  }

  // System subdomain: <slug>.<root>
  if (cleanHost.endsWith(`.${cleanRoot}`)) {
    const slug = cleanHost.slice(0, -(cleanRoot.length + 1));
    if (slug && slug !== 'www' && slug !== 'app') {
      return { kind: 'site-subdomain', slug };
    }
  }

  // Otherwise treat as a custom domain.
  return { kind: 'site-domain', hostname: cleanHost };
}
