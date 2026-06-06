import { ref, watch } from 'vue';

const STORAGE_KEY = 'tree-bookmarks-sidebar-expanded';

const expandedIds = ref<Set<string>>(loadExpandedIds());

function loadExpandedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function saveExpandedIds() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds.value]));
  } catch {
    // ignore storage errors
  }
}

// Auto-persist on changes
watch(expandedIds, saveExpandedIds, { deep: true });

export function useSidebarState() {
  function isExpanded(id: string): boolean {
    return expandedIds.value.has(id);
  }

  function toggleExpanded(id: string) {
    const next = new Set(expandedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    expandedIds.value = next;
  }

  function expandToNode(ancestorIds: string[]) {
    const next = new Set(expandedIds.value);
    for (const id of ancestorIds) {
      next.add(id);
    }
    expandedIds.value = next;
  }

  return {
    expandedIds,
    isExpanded,
    toggleExpanded,
    expandToNode
  };
}
