import Link from 'next/link';
import { prisma } from '@easy-cms/db';
import { requireSession } from '@/lib/guards';

export default async function DashboardPage() {
  const session = await requireSession();

  // Sites across all orgs the user belongs to.
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { organization: { include: { sites: true } } },
  });

  const sites = memberships.flatMap((m) => m.organization.sites);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your sites</h1>
        <Link href="/sites/new" className="rounded-md bg-primary px-4 py-2 font-medium text-white">
          New site
        </Link>
      </div>

      {sites.length === 0 ? (
        <p className="text-gray-500">No sites yet. Create your first site to get started.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <li key={site.id} className="rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{site.name}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{site.status}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">/{site.slug}</p>
              <Link
                href={`/sites/${site.id}`}
                className="mt-4 inline-block text-sm font-medium text-primary"
              >
                Manage →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
