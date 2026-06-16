import Link from 'next/link';
import { requireSession } from '@/lib/guards';
import { createSite } from '../actions';

export default async function NewSitePage() {
  await requireSession();

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Create a new site</h1>
      <p className="mt-1 text-sm text-gray-500">
        We&apos;ll set up a starter Home page you can edit in the builder.
      </p>

      <form action={createSite} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Site name</label>
          <input
            name="name"
            required
            placeholder="Acme Inc."
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description (optional)</label>
          <textarea
            name="description"
            rows={3}
            placeholder="A short description of your site."
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <button className="rounded-md bg-primary px-5 py-2.5 font-medium text-white">
          Create site
        </button>
      </form>
    </div>
  );
}
