import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FIELD_TYPES } from '@easy-cms/core';
import { requireSiteAccess } from '@/lib/guards';
import { getCollection, listRecords, recordLabel } from '@/lib/data/collections';
import { addField, deleteField, deleteCollection, deleteRecord } from '../actions';
import { cn } from '@/lib/utils';

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; collectionId: string }>;
}) {
  const { siteId, collectionId } = await params;
  await requireSiteAccess(siteId);

  const collection = await getCollection(siteId, collectionId);
  if (!collection) notFound();
  const records = await listRecords(collectionId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/sites/${siteId}/collections`}
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Collections
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{collection.name}</h1>
          <span className="text-sm text-gray-400">/{collection.slug}</span>
        </div>
        {!collection.isSystem && (
          <form action={deleteCollection.bind(null, siteId, collectionId)}>
            <button className="text-sm text-red-500 hover:text-red-700">Delete collection</button>
          </form>
        )}
      </div>

      {/* Fields */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Fields</h2>
        {collection.fields.length === 0 ? (
          <p className="text-sm text-gray-500">No fields yet — add one below.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {collection.fields.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="text-sm">
                  <span className="font-medium">{f.name}</span>
                  <code className="ml-2 text-xs text-gray-400">{f.key}</code>
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs">{f.type}</span>
                  {f.required && <span className="ml-1 text-xs text-red-500">*</span>}
                </div>
                <form action={deleteField.bind(null, siteId, collectionId, f.id)}>
                  <button className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addField} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border p-4">
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="collectionId" value={collectionId} />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Field name</label>
            <input name="name" required placeholder="Title" className="rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Type</label>
            <select name="type" className="rounded-md border px-3 py-2 text-sm">
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="required" /> Required
          </label>
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-xs text-gray-500">
              Options (SELECT — one <code>value:Label</code> per line)
            </label>
            <textarea
              name="options"
              rows={2}
              placeholder={'draft:Draft\npublished:Published'}
              className="w-full rounded-md border px-3 py-2 text-sm sm:w-64"
            />
          </div>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
            Add field
          </button>
        </form>
      </section>

      {/* Records */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Records</h2>
          {collection.fields.length > 0 && (
            <Link
              href={`/sites/${siteId}/collections/${collectionId}/records/new`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Add record
            </Link>
          )}
        </div>

        {collection.fields.length === 0 ? (
          <p className="text-sm text-gray-500">Add at least one field before creating records.</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-500">No records yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {records.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/sites/${siteId}/collections/${collectionId}/records/${r.id}`}
                    className="font-medium hover:underline"
                  >
                    {recordLabel(collection.fields, r.data as Record<string, unknown>, r.id)}
                  </Link>
                  <span
                    className={cn(
                      'ml-2 rounded px-1.5 py-0.5 text-xs',
                      r.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {r.status}
                  </span>
                </div>
                <form action={deleteRecord.bind(null, siteId, collectionId, r.id)}>
                  <button className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
