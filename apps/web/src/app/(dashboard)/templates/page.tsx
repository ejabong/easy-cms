import Link from 'next/link';
import { prisma } from '@easy-cms/db';
import { requireSession } from '@/lib/guards';
import { installTemplate } from './actions';

export default async function TemplatesPage() {
  await requireSession();

  const templates = await prisma.template.findMany({
    where: { isPublished: true },
    orderBy: { installs: 'desc' },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold">Templates</h1>
      <p className="mt-1 text-sm text-gray-500">
        Start from a professionally designed template, or build from scratch.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/sites/new"
          className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-gray-500 hover:border-primary hover:text-primary"
        >
          <span className="text-2xl">+</span>
          Start from scratch
        </Link>

        {templates.map((t) => (
          <div key={t.id} className="flex flex-col overflow-hidden rounded-lg border">
            <div className="flex aspect-video items-center justify-center bg-gray-100 text-gray-400">
              {t.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.thumbnail} alt={t.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm">{t.name}</span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t.name}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {t.category.replace('_', ' ').toLowerCase()}
                </span>
              </div>
              {t.description && <p className="mt-1 text-sm text-gray-500">{t.description}</p>}
              {t.installs > 0 && (
                <p className="mt-1 text-xs text-gray-400">{t.installs} installs</p>
              )}

              <form action={installTemplate} className="mt-auto flex gap-2 pt-4">
                <input type="hidden" name="templateSlug" value={t.slug} />
                <input
                  name="name"
                  placeholder="Site name (optional)"
                  className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm"
                />
                <button className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white">
                  Use
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
