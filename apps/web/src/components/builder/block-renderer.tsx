import type { BlockNode } from '@easy-cms/core';
import { getRegistryEntry } from './registry';

/**
 * Recursively renders a block tree to React. Used both for the public
 * (server-rendered, published) site and inside the editor canvas.
 *
 * Unknown variants fall back to rendering their children so the tree never
 * breaks if a block type is missing.
 */
export function BlockRenderer({ nodes, editing }: { nodes: BlockNode[]; editing?: boolean }) {
  return (
    <>
      {nodes.map((node) => (
        <BlockView key={node.id} node={node} editing={editing} />
      ))}
    </>
  );
}

function BlockView({ node, editing }: { node: BlockNode; editing?: boolean }) {
  const entry = getRegistryEntry(node.variant);

  if (!entry) {
    return <BlockRenderer nodes={node.children} editing={editing} />;
  }

  const Component = entry.render;
  return <Component node={node} editing={editing} />;
}
