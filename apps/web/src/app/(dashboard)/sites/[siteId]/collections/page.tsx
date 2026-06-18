import Link from 'next/link';
import { requireSiteAccess } from '@/lib/guards';
import { listCollections } from '@/lib/data/collections';
import { createCollection } from './actions';

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);
  const collections = await listCollections(siteId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href={`/sites/${siteId}`} className="text-sm text-gray-500 hover:text-gray-900">
        ← Site dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Collections</h1>
      <p className="mt-1 text-sm text-gray-500">
        Model any content type — products, team members, case studies — then add records.
      </p>

      <section className="mt-8">
        {collections.length === 0 ? (
          <p className="text-gray-500">No collections yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {collections.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/sites/${siteId}/collections/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <span className="ml-2 text-xs text-gray-400">/{c.slug}</span>
                  {c.isSystem && (
                    <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                      system
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {c._count.fields} fields · {c._count.records} records
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">New collection</h2>
        <form action={createCollection} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="siteId" value={siteId} />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Name</label>
            <input
              name="name"
              required
              placeholder="Products"
              className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
            Create collection
          </button>
        </form>
      </section>
    </div>
  );
}
