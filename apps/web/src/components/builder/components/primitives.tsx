import type { BlockNode } from '@easy-cms/core';

export function ButtonComponent({ node }: { node: BlockNode }) {
  const p = node.props as { label?: string; href?: string };
  return (
    <a href={p.href ?? '#'} className="inline-block rounded-md bg-primary px-5 py-2.5 font-medium text-white">
      {p.label ?? 'Button'}
    </a>
  );
}

export function HeadingComponent({ node }: { node: BlockNode }) {
  const p = node.props as { text?: string; level?: 1 | 2 | 3 };
  const Tag = (`h${p.level ?? 2}`) as 'h1' | 'h2' | 'h3';
  return <Tag className="font-bold tracking-tight">{p.text ?? 'Heading'}</Tag>;
}

export function ImageComponent({ node }: { node: BlockNode }) {
  const p = node.props as { src?: string; alt?: string };
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p.src ?? ''} alt={p.alt ?? ''} className="h-auto w-full rounded-lg" />;
}
