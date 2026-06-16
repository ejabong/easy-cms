'use client';

import { useEffect, useRef, useState } from 'react';
import { createBlock, type PageContent, type Breakpoint } from '@easy-cms/core';
import { useEditor } from '@/lib/store/editor';
import { PALETTE } from '@/components/builder/registry';
import { BlockRenderer } from '@/components/builder/block-renderer';
import { savePage } from './actions';
import { cn } from '@/lib/utils';

const FRAME_WIDTHS: Record<Breakpoint, string> = {
  desktop: 'w-full',
  tablet: 'w-[768px]',
  mobile: 'w-[390px]',
};

/**
 * Builder editor shell. Left = block palette, center = responsive canvas,
 * top = toolbar (undo/redo, breakpoint, save/publish). Drag-and-drop wiring
 * uses dnd-kit (palette → canvas); here we provide click-to-insert plus the
 * full editor store so the data flow is complete and testable.
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
  const { content, breakpoint, dirty, init, insertBlock, setBreakpoint, undo, redo, markSaved } =
    useEditor();
  const [saving, setSaving] = useState(false);
  const autosave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  async function handlePublish() {
    setSaving(true);
    await savePage({ siteId, pageId, content, publish: true });
    markSaved();
    setSaving(false);
  }

  return (
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
              className={cn('rounded px-2 py-1 text-sm', breakpoint === bp && 'bg-gray-100')}
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
        <aside className="w-56 overflow-y-auto border-r p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Blocks</h3>
          <ul className="space-y-1">
            {PALETTE.map((entry) => (
              <li key={entry.variant}>
                <button
                  onClick={() => insertBlock(createBlock(entry.type, entry.variant))}
                  className="w-full rounded border px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className={cn('mx-auto bg-white shadow-sm transition-all', FRAME_WIDTHS[breakpoint])}>
            <BlockRenderer nodes={content} editing />
          </div>
        </main>
      </div>
    </div>
  );
}
