import type { BlockNode } from '@easy-cms/core';

type Stat = { value: string; label: string };

export function StatsSection({ node }: { node: BlockNode }) {
  const p = node.props as { items?: Stat[] };
  const items = p.items ?? [];
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center md:grid-cols-3">
        {items.map((s, i) => (
          <div key={i}>
            <div className="text-4xl font-bold text-primary">{s.value}</div>
            <div className="mt-1 text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
