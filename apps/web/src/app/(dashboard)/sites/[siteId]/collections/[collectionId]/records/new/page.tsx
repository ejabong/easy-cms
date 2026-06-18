import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSiteAccess } from '@/lib/guards';
import { getCollection } from '@/lib/data/collections';
import { RecordForm } from '../record-form';
import { toFieldDTOs } from '@/lib/data/collections';

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ siteId: string; collectionId: string }>;
}) {
  const { siteId, collectionId } = await params;
  await requireSiteAccess(siteId);

  const collection = await getCollection(siteId, collectionId);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href={`/sites/${siteId}/collections/${collectionId}`}
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← {collection.name}
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-bold">New {collection.name} record</h1>
      <RecordForm
        siteId={siteId}
        collectionId={collectionId}
        fields={toFieldDTOs(collection.fields)}
        data={{}}
      />
    </div>
  );
}
