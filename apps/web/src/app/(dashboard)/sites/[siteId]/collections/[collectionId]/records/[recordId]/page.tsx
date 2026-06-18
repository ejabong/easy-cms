import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSiteAccess } from '@/lib/guards';
import { getCollection, getRecord, toFieldDTOs } from '@/lib/data/collections';
import { RecordForm } from '../record-form';

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ siteId: string; collectionId: string; recordId: string }>;
}) {
  const { siteId, collectionId, recordId } = await params;
  await requireSiteAccess(siteId);

  const collection = await getCollection(siteId, collectionId);
  if (!collection) notFound();
  const record = await getRecord(collectionId, recordId);
  if (!record) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href={`/sites/${siteId}/collections/${collectionId}`}
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← {collection.name}
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-bold">Edit record</h1>
      <RecordForm
        siteId={siteId}
        collectionId={collectionId}
        recordId={recordId}
        fields={toFieldDTOs(collection.fields)}
        data={record.data as Record<string, unknown>}
      />
    </div>
  );
}
