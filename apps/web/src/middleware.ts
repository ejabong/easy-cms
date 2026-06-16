import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@easy-cms/core';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'localhost:3000';

/**
 * Tenant routing.
 *
 * Platform host (apex / app.) → serves the dashboard & marketing app normally.
 * Any other host (custom domain or {slug}.{root}) → internally rewritten to
 * the `/_sites/[host]/...` route group which renders the published site.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const url = req.nextUrl;

  // Never rewrite framework/asset/auth/api paths.
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/_sites') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const tenant = resolveTenant(host, ROOT_DOMAIN);

  if (tenant.kind === 'platform') {
    return NextResponse.next();
  }

  // Rewrite to the site-rendering route group, keyed by host.
  const rewriteUrl = new URL(req.url);
  rewriteUrl.pathname = `/_sites/${host}${url.pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
