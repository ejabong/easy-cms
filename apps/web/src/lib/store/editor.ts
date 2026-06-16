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
  moveBlock: (activeId: string, overId: string) => void;
  duplicateBlock: (id: string) => void;
  findBlock: (id: string) => BlockNode | undefined;

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

function findNode(nodes: BlockNode[], id: string): BlockNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return undefined;
}

function cloneWithNewIds(node: BlockNode): BlockNode {
  return {
    ...node,
    id: `blk_${Math.random().toString(36).slice(2, 10)}`,
    children: node.children.map(cloneWithNewIds),
  };
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
    set({ selectedId: block.id });
  },

  // Reorders top-level sections (the primary drag target on the canvas).
  moveBlock: (activeId, overId) => {
    const nodes = get().content;
    const from = nodes.findIndex((n) => n.id === activeId);
    const to = nodes.findIndex((n) => n.id === overId);
    if (from === -1 || to === -1 || from === to) return;
    const next = [...nodes];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    get().setContent(next);
  },

  duplicateBlock: (id) => {
    const original = findNode(get().content, id);
    if (!original) return;
    const copy = cloneWithNewIds(original);
    const index = get().content.findIndex((n) => n.id === id);
    get().insertBlock(copy, index === -1 ? undefined : index + 1);
  },

  findBlock: (id) => findNode(get().content, id),

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
