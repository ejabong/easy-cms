'use client';

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BlockNode } from '@easy-cms/core';
import { useEditor } from '@/lib/store/editor';
import { getRegistryEntry } from './registry';
import { cn } from '@/lib/utils';

/**
 * Editable canvas. Top-level sections are sortable (dnd-kit) and selectable.
 * Each section renders its real block component, wrapped with a selection
 * outline + drag handle so the WYSIWYG matches the published output exactly.
 */
export function Canvas() {
  const content = useEditor((s) => s.content);

  if (content.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-gray-400">
        Drag a block here or click one in the palette to start.
      </div>
    );
  }

  return (
    <SortableContext items={content.map((n) => n.id)} strategy={verticalListSortingStrategy}>
      {content.map((node) => (
        <SortableSection key={node.id} node={node} />
      ))}
    </SortableContext>
  );
}

function SortableSection({ node }: { node: BlockNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const entry = getRegistryEntry(node.variant);
  const Component = entry?.render;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        select(node.id);
      }}
      className={cn(
        'group relative cursor-pointer outline-offset-2',
        selectedId === node.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-gray-300',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-2 top-2 z-10 hidden rounded bg-gray-900/80 px-2 py-0.5 text-xs text-white group-hover:block"
        aria-label="Drag to reorder"
      >
        ⠿ {entry?.label ?? node.type}
      </button>
      {Component ? <Component node={node} editing /> : <div className="p-4 text-sm">{node.type}</div>}
    </div>
  );
}
