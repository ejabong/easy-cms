import type { BlockNode } from '@easy-cms/core';

type Props = { node: BlockNode };

export function HeroCentered({ node }: Props) {
  const p = node.props as { heading?: string; subheading?: string; ctaLabel?: string; ctaHref?: string };
  return (
    <section className="px-6 py-24 text-center">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-5xl font-bold tracking-tight">{p.heading ?? 'Your headline'}</h1>
        {p.subheading && <p className="mt-6 text-lg text-gray-600">{p.subheading}</p>}
        {p.ctaLabel && (
          <a
            href={p.ctaHref ?? '#'}
            className="mt-8 inline-block rounded-md bg-primary px-6 py-3 font-medium text-white"
          >
            {p.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

export function HeroSplit({ node }: Props) {
  const p = node.props as { heading?: string; subheading?: string; image?: string };
  return (
    <section className="grid items-center gap-8 px-6 py-24 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{p.heading ?? 'Your headline'}</h1>
        {p.subheading && <p className="mt-4 text-lg text-gray-600">{p.subheading}</p>}
      </div>
      <div className="aspect-video rounded-lg bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image && <img src={p.image} alt="" className="h-full w-full rounded-lg object-cover" />}
      </div>
    </section>
  );
}
