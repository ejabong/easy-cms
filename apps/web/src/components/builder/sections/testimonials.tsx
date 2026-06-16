import type { BlockNode } from '@easy-cms/core';

type Item = { quote: string; author: string; role?: string };

export function TestimonialsSection({ node }: { node: BlockNode }) {
  const p = node.props as { heading?: string; items?: Item[] };
  const items = p.items ?? [];
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        {p.heading && <h2 className="mb-12 text-center text-3xl font-bold">{p.heading}</h2>}
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((t, i) => (
            <figure key={i} className="rounded-lg border p-6">
              <blockquote className="text-lg">“{t.quote}”</blockquote>
              <figcaption className="mt-4 text-sm text-gray-500">
                <span className="font-medium text-gray-900">{t.author}</span>
                {t.role && ` · ${t.role}`}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
