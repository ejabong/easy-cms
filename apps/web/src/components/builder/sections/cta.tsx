import type { BlockNode } from '@easy-cms/core';

export function CTASection({ node }: { node: BlockNode }) {
  const p = node.props as { heading?: string; ctaLabel?: string; ctaHref?: string };
  return (
    <section className="bg-primary px-6 py-20 text-center text-white">
      <h2 className="text-3xl font-bold">{p.heading ?? 'Ready to get started?'}</h2>
      {p.ctaLabel && (
        <a
          href={p.ctaHref ?? '#'}
          className="mt-6 inline-block rounded-md bg-white px-6 py-3 font-medium text-primary"
        >
          {p.ctaLabel}
        </a>
      )}
    </section>
  );
}
