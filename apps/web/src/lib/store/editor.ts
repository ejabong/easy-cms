import { create } from 'zustand';
import type { BlockNode, PageContent, Breakpoint } from '@easy-cms/core';

/**
 * Editor store for the drag-and-drop builder.
 *
 * Undo/redo is implemented with past/future content snapshots (immutable).
 * Every mutation pushes the previous tree onto `past` and clears `future`.
 * Autosave is debounced by the editor shell, which calls `markSaved()`.
 */
interface EditorState {
  content: PageContent;
  past: PageContent[];
  future: PageContent[];
  selectedId: string | null;
  breakpoint: Breakpoint;
  dirty: boolean;

  init: (content: PageContent) => void;
  select: (id: string | null) => void;
  setBreakpoint: (bp: Breakpoint) => void;

  setContent: (next: PageContent) => void;
  updateProps: (id: string, props: Record<string, unknown>) => void;
  removeBlock: (id: string) => void;
  insertBlock: (block: BlockNode, index?: number) => void;

  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

const HISTORY_LIMIT = 50;

function replaceNode(nodes: BlockNode[], id: string, patch: (n: BlockNode) => BlockNode): BlockNode[] {
  return nodes.map((n) =>
    n.id === id ? patch(n) : { ...n, children: replaceNode(n.children, id, patch) },
  );
}

function removeNode(nodes: BlockNode[], id: string): BlockNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNode(n.children, id) }));
}

export const useEditor = create<EditorState>((set, get) => ({
  content: [],
  past: [],
  future: [],
  selectedId: null,
  breakpoint: 'desktop',
  dirty: false,

  init: (content) => set({ content, past: [], future: [], dirty: false }),
  select: (id) => set({ selectedId: id }),
  setBreakpoint: (bp) => set({ breakpoint: bp }),

  setContent: (next) =>
    set((s) => ({
      content: next,
      past: [...s.past, s.content].slice(-HISTORY_LIMIT),
      future: [],
      dirty: true,
    })),

  updateProps: (id, props) =>
    get().setContent(
      replaceNode(get().content, id, (n) => ({ ...n, props: { ...n.props, ...props } })),
    ),

  removeBlock: (id) => get().setContent(removeNode(get().content, id)),

  insertBlock: (block, index) => {
    const next = [...get().content];
    next.splice(index ?? next.length, 0, block);
    get().setContent(next);
  },

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1]!;
      return {
        content: previous,
        past: s.past.slice(0, -1),
        future: [s.content, ...s.future],
        dirty: true,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0]!;
      return {
        content: next,
        past: [...s.past, s.content],
        future: s.future.slice(1),
        dirty: true,
      };
    }),

  markSaved: () => set({ dirty: false }),
}));
