import type { BlockNode } from '@easy-cms/core';

export function RichTextSection({ node }: { node: BlockNode }) {
  const p = node.props as { html?: string };
  return (
    <section className="px-6 py-16">
      <div
        className="prose mx-auto max-w-3xl"
        dangerouslySetInnerHTML={{ __html: p.html ?? '<p>Rich text content…</p>' }}
      />
    </section>
  );
}
