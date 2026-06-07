import { ref, computed, inject, provide, type InjectionKey, type Ref } from 'vue';
import type { BookmarkNode } from '../types/bookmark';

export interface ClipboardData {
  ids: string[];
}

export interface SelectionState {
  selectedIds: Ref<Set<string>>;
  lastClickedId: Ref<string | null>;
  count: Ref<number>;
  isEmpty: Ref<boolean>;
  editMode: Ref<boolean>;
  clipboard: Ref<ClipboardData | null>;
  isSelected: (id: string) => boolean;
  toggle: (id: string, event?: MouseEvent) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  selectRange: (ids: string[], event?: MouseEvent) => void;
  selectAll: (items: BookmarkNode[]) => void;
  clear: () => void;
  toggleEditMode: () => void;
  enterEditMode: () => void;
  exitEditMode: () => void;
  cut: () => void;
  clearClipboard: () => void;
}

export const SELECTION_KEY: InjectionKey<SelectionState> = Symbol('selection');

export function createSelectionState(): SelectionState {
  const selectedIds = ref<Set<string>>(new Set());
  const lastClickedId = ref<string | null>(null);
  const editMode = ref(false);

  const count = computed(() => selectedIds.value.size);
  const isEmpty = computed(() => selectedIds.value.size === 0);

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id);
  }

  function toggle(id: string, event?: MouseEvent) {
    const next = new Set(selectedIds.value);

    if (event?.shiftKey && lastClickedId.value) {
      return;
    }

    if (event?.ctrlKey || event?.metaKey) {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    } else {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }

    selectedIds.value = next;
    lastClickedId.value = next.has(id) ? id : null;
  }

  function select(id: string) {
    const next = new Set(selectedIds.value);
    next.add(id);
    selectedIds.value = next;
    lastClickedId.value = id;
  }

  function deselect(id: string) {
    const next = new Set(selectedIds.value);
    next.delete(id);
    selectedIds.value = next;
    if (lastClickedId.value === id) lastClickedId.value = null;
  }

  function selectRange(ids: string[], event?: MouseEvent) {
    if (event?.shiftKey && lastClickedId.value) {
      const lastIdx = ids.indexOf(lastClickedId.value);
      const next = new Set(selectedIds.value);
      if (lastIdx !== -1) {
        const start = Math.min(lastIdx, ids.length - 1);
        const end = Math.max(lastIdx, ids.length - 1);
        for (let i = start; i <= end; i++) {
          next.add(ids[i]);
        }
      }
      selectedIds.value = next;
    } else {
      toggle(ids[ids.length - 1], event);
    }
  }

  function selectAll(items: BookmarkNode[]) {
    const ids = new Set(items.map((n) => n.id));
    selectedIds.value = ids;
    if (items.length > 0) lastClickedId.value = items[items.length - 1].id;
  }

  function clear() {
    selectedIds.value = new Set();
    lastClickedId.value = null;
  }

  function toggleEditMode() {
    editMode.value = !editMode.value;
    if (!editMode.value) {
      clear();
    }
  }

  function enterEditMode() {
    editMode.value = true;
  }

  function exitEditMode() {
    editMode.value = false;
    clear();
  }

  // --- Clipboard ---
  const clipboard = ref<ClipboardData | null>(null);

  function cut() {
    if (selectedIds.value.size === 0) return;
    clipboard.value = { ids: [...selectedIds.value] };
  }

  function clearClipboard() {
    clipboard.value = null;
  }

  return {
    selectedIds,
    lastClickedId,
    count,
    isEmpty,
    editMode,
    clipboard,
    isSelected,
    toggle,
    select,
    deselect,
    selectRange,
    selectAll,
    clear,
    toggleEditMode,
    enterEditMode,
    exitEditMode,
    cut,
    clearClipboard
  };
}

export function provideSelection(): SelectionState {
  const state = createSelectionState();
  provide(SELECTION_KEY, state);
  return state;
}

export function useSelection(): SelectionState {
  const state = inject(SELECTION_KEY);
  if (!state) {
    const empty = ref<Set<string>>(new Set());
    return {
      selectedIds: empty,
      lastClickedId: ref(null),
      count: computed(() => 0),
      isEmpty: computed(() => true),
      editMode: ref(false),
      clipboard: ref(null),
      isSelected: () => false,
      toggle: () => {},
      select: () => {},
      deselect: () => {},
      selectRange: () => {},
      selectAll: () => {},
      clear: () => {},
      toggleEditMode: () => {},
      enterEditMode: () => {},
      exitEditMode: () => {},
      cut: () => {},
      clearClipboard: () => {}
    };
  }
  return state;
}
