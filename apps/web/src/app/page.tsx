import Link from 'next/link';

export default function MarketingHome() {
  return (
    <main>
      <header className="flex items-center justify-between px-6 py-5">
        <span className="text-xl font-bold">easy-cms</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Log in
          </Link>
          <Link href="/signup" className="rounded-md bg-primary px-4 py-2 font-medium text-white">
            Get started
          </Link>
        </nav>
      </header>

      <section className="px-6 py-28 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Build beautiful websites, <span className="text-primary">fast</span>.
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            A multi-tenant website builder & headless CMS. Drag, drop, and publish —
            no code required.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/signup" className="rounded-md bg-primary px-6 py-3 font-medium text-white">
              Start building free
            </Link>
            <Link href="/templates" className="rounded-md border px-6 py-3 font-medium">
              Browse templates
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-8 px-6 py-16 md:grid-cols-3 mx-auto max-w-5xl">
        {[
          ['Drag & drop builder', 'Compose pages from pre-built sections and components.'],
          ['Headless CMS', 'Model any content with custom collections and fields.'],
          ['Multi-site', 'Manage all your sites and clients from one dashboard.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border p-6">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-gray-600">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
