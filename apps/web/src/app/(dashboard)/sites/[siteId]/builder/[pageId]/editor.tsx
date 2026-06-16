'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { createBlock, type PageContent, type Breakpoint } from '@easy-cms/core';
import { useEditor } from '@/lib/store/editor';
import { getRegistryEntry } from '@/components/builder/registry';
import { Palette } from '@/components/builder/palette';
import { Canvas } from '@/components/builder/canvas';
import { Inspector } from '@/components/builder/inspector';
import { savePage } from './actions';
import { cn } from '@/lib/utils';

const FRAME_WIDTHS: Record<Breakpoint, string> = {
  desktop: 'w-full',
  tablet: 'w-[768px]',
  mobile: 'w-[390px]',
};

/**
 * Builder editor shell.
 *
 * Layout: palette (left) · responsive canvas (center) · inspector (right),
 * with a toolbar for breakpoint switching, undo/redo, and publish.
 *
 * A single DndContext spans the palette and canvas: dragging a palette item
 * inserts a new block; dragging a canvas section reorders it.
 */
export function BuilderEditor({
  siteId,
  pageId,
  title,
  initialContent,
}: {
  siteId: string;
  pageId: string;
  title: string;
  initialContent: PageContent;
}) {
  const { content, breakpoint, dirty, init, insertBlock, moveBlock, setBreakpoint, select, undo, redo, markSaved } =
    useEditor();
  const [saving, setSaving] = useState(false);
  const autosave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    init(initialContent);
  }, [init, initialContent]);

  // Debounced autosave whenever the tree is dirty.
  useEffect(() => {
    if (!dirty) return;
    clearTimeout(autosave.current);
    autosave.current = setTimeout(async () => {
      await savePage({ siteId, pageId, content, label: 'Autosave' });
      markSaved();
    }, 2000);
    return () => clearTimeout(autosave.current);
  }, [dirty, content, siteId, pageId, markSaved]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);

    if (activeId.startsWith('palette:')) {
      const variant = activeId.slice('palette:'.length);
      const entry = getRegistryEntry(variant);
      if (!entry) return;
      const block = createBlock(entry.type, variant, { ...entry.defaults });
      const overIndex = content.findIndex((n) => n.id === over.id);
      insertBlock(block, overIndex === -1 ? undefined : overIndex);
      return;
    }

    if (activeId !== over.id) moveBlock(activeId, String(over.id));
  }

  async function handlePublish() {
    setSaving(true);
    await savePage({ siteId, pageId, content, publish: true });
    markSaved();
    setSaving(false);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{title}</span>
            <span className="text-xs text-gray-400">{dirty ? 'Unsaved…' : 'Saved'}</span>
          </div>
          <div className="flex items-center gap-2">
            {(['desktop', 'tablet', 'mobile'] as Breakpoint[]).map((bp) => (
              <button
                key={bp}
                onClick={() => setBreakpoint(bp)}
                className={cn('rounded px-2 py-1 text-sm capitalize', breakpoint === bp && 'bg-gray-100')}
              >
                {bp}
              </button>
            ))}
            <button onClick={undo} className="rounded border px-3 py-1 text-sm">
              Undo
            </button>
            <button onClick={redo} className="rounded border px-3 py-1 text-sm">
              Redo
            </button>
            <button
              onClick={handlePublish}
              disabled={saving}
              className="rounded bg-primary px-4 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <Palette />
          <main
            className="flex-1 overflow-y-auto bg-gray-50 p-6"
            onClick={() => select(null)}
          >
            <div className={cn('mx-auto bg-white shadow-sm transition-all', FRAME_WIDTHS[breakpoint])}>
              <Canvas />
            </div>
          </main>
          <Inspector />
        </div>
      </div>
    </DndContext>
  );
}
