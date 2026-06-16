'use client';

import { useDraggable } from '@dnd-kit/core';
import { PALETTE, type RegistryEntry } from './registry';

/** Left rail of draggable blocks, grouped by category. */
export function Palette() {
  const groups = PALETTE.reduce<Record<string, RegistryEntry[]>>((acc, entry) => {
    (acc[entry.category] ??= []).push(entry);
    return acc;
  }, {});

  return (
    <aside className="w-56 overflow-y-auto border-r p-3">
      {Object.entries(groups).map(([category, entries]) => (
        <div key={category} className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {category}
          </h3>
          <ul className="space-y-1">
            {entries.map((entry) => (
              <PaletteItem key={entry.variant} entry={entry} />
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

function PaletteItem({ entry }: { entry: RegistryEntry }) {
  // id is prefixed so the editor's drag handler can distinguish a new-block
  // drop from a reorder of an existing canvas block.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${entry.variant}`,
  });

  return (
    <li>
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="w-full cursor-grab rounded border px-3 py-2 text-left text-sm hover:bg-gray-50"
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        {entry.label}
      </button>
    </li>
  );
}
