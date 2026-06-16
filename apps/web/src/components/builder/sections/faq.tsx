import type { BlockNode } from '@easy-cms/core';

type QA = { q: string; a: string };

export function FAQSection({ node }: { node: BlockNode }) {
  const p = node.props as { heading?: string; items?: QA[] };
  const items = p.items ?? [];
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        {p.heading && <h2 className="mb-10 text-center text-3xl font-bold">{p.heading}</h2>}
        <div className="divide-y">
          {items.map((item, i) => (
            <details key={i} className="py-4">
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-2 text-gray-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
