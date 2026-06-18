import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@easy-cms/db';
import { requireSession } from '@/lib/guards';
import { createPage, setSiteStatus, deletePage } from './actions';
import { cn } from '@/lib/utils';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'localhost:3000';

export default async function SiteDashboard({ params }: { params: Promise<{ siteId: string }> }) {
  const session = await requireSession();
  const { siteId } = await params;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { pages: { orderBy: { updatedAt: 'desc' } }, domains: true },
  });
  if (!site) notFound();

  // Access check: must be a member of the owning org (or platform super admin).
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.platformRole !== 'SUPER_ADMIN') {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId: session.user.id, organizationId: site.organizationId },
      },
    });
    if (!membership) notFound();
  }

  const isPublished = site.status === 'PUBLISHED';
  const publicUrl = `https://${site.slug}.${ROOT_DOMAIN}`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
        ← All sites
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {site.slug}.{ROOT_DOMAIN} ↗
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
            )}
          >
            {site.status}
          </span>
          <form action={setSiteStatus.bind(null, site.id, isPublished ? 'DRAFT' : 'PUBLISHED')}>
            <button className="rounded-md border px-3 py-1.5 text-sm font-medium">
              {isPublished ? 'Unpublish' : 'Publish site'}
            </button>
          </form>
        </div>
      </div>

      <nav className="mt-6 flex gap-4 border-b text-sm">
        <span className="-mb-px border-b-2 border-primary pb-2 font-medium">Pages</span>
        <Link
          href={`/sites/${site.id}/collections`}
          className="pb-2 text-gray-500 hover:text-gray-900"
        >
          Collections
        </Link>
      </nav>

      {/* Pages */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Pages</h2>
        <ul className="divide-y rounded-lg border">
          {site.pages.map((page) => (
            <li key={page.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium">{page.title}</span>
                <span className="ml-2 text-xs text-gray-400">/{page.slug}</span>
                <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs">{page.status}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/sites/${site.id}/builder/${page.id}`} className="text-primary">
                  Edit
                </Link>
                {!page.isHomePage && (
                  <form action={deletePage.bind(null, site.id, page.id)}>
                    <button className="text-red-500 hover:text-red-700">Delete</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* New page */}
      <section className="mt-8 rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Add a page</h3>
        <form action={createPage} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="siteId" value={site.id} />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Title</label>
            <input name="title" required placeholder="About" className="rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Type</label>
            <select name="type" className="rounded-md border px-3 py-2 text-sm">
              {['CUSTOM', 'ABOUT', 'CONTACT', 'LANDING_PAGE', 'BLOG'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
            Create page
          </button>
        </form>
      </section>
    </div>
  );
}
