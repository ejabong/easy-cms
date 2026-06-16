import type { BlockNode } from '@easy-cms/core';

type Feature = { title: string; description: string };

export function FeatureGrid({ node }: { node: BlockNode }) {
  const p = node.props as { heading?: string; features?: Feature[] };
  const features = p.features ?? [];
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        {p.heading && <h2 className="mb-12 text-center text-3xl font-bold">{p.heading}</h2>}
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="rounded-lg border p-6">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
