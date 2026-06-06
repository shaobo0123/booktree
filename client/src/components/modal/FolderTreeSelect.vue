<template>
  <div ref="selectRef" class="relative">
    <button
      v-if="variant === 'dropdown'"
      class="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 outline-none transition-all hover:border-slate-300 hover:bg-slate-50 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <span class="flex min-w-0 items-center gap-2.5">
        <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Folder class="h-4 w-4" :stroke-width="2.25" />
        </span>
        <span class="min-w-0 text-left">
          <span class="block truncate">{{ selectedLabel }}</span>
          <span class="block truncate text-[11px] font-normal text-slate-400">{{ selectedDescription }}</span>
        </span>
      </span>
      <ChevronDown
        class="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform"
        :class="open ? 'rotate-180' : ''"
        :stroke-width="2.25"
      />
    </button>

    <div v-if="panelVisible" :class="variant === 'dropdown' ? 'absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)]' : 'space-y-3'">
      <label v-if="searchable" class="relative block border-b border-slate-100">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" :stroke-width="2.25" />
        <input v-model.trim="query" class="h-10 w-full bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" :placeholder="searchPlaceholder" type="search" />
      </label>

      <button
        class="flex min-h-10 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
        :class="[modelValue === null ? '!border-emerald-300 !bg-emerald-50/60 !text-emerald-800 shadow-[0_0_0_3px_rgba(16,185,129,0.1)] hover:!bg-emerald-50/70 hover:!text-emerald-900' : '', variant === 'dropdown' ? 'rounded-none border-x-0 border-t-0' : '']"
        type="button"
        role="option"
        :aria-selected="modelValue === null"
        @click="selectValue(null)"
      >
        <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Folder class="h-4 w-4" :stroke-width="2.25" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium">{{ rootLabel }}</span>
          <span v-if="rootDescription" class="block truncate text-[11px] font-normal text-slate-400">{{ rootDescription }}</span>
        </span>
        <Check v-if="modelValue === null" class="h-4 w-4 flex-shrink-0 text-emerald-500" :stroke-width="2.25" />
      </button>

      <div class="overflow-y-auto rounded-xl border border-slate-200 bg-white column-scrollbar" :class="{ 'rounded-none border-0': variant === 'dropdown' }" :style="listStyle" role="listbox">
        <div v-if="visibleRows.length === 0" class="flex h-full min-h-24 items-center justify-center px-4 text-center text-sm text-slate-400">
          {{ query ? '没有匹配的文件夹' : emptyText }}
        </div>

        <div v-else class="py-1">
          <div
            v-for="row in visibleRows"
            :key="row.id"
            class="flex min-h-10 items-center gap-1 border-b border-slate-50 pr-2 text-sm text-slate-700 transition-colors last:border-b-0 hover:bg-slate-50 hover:text-slate-950"
            :class="modelValue === row.id ? '!border-emerald-100 !bg-emerald-50/60 !text-emerald-800 shadow-none' : ''"
            role="option"
            :aria-selected="modelValue === row.id"
            :style="{ paddingLeft: `${row.depth * 18 + 8}px` }"
          >
            <button
              class="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              :class="!row.hasChildren || query ? 'invisible' : ''"
              type="button"
              :aria-label="expandedIds.has(row.id) ? '收起子文件夹' : '展开子文件夹'"
              @click="toggleExpanded(row.id)"
            >
              <ChevronRight
                class="h-4 w-4 transition-transform"
                :class="expandedIds.has(row.id) ? 'rotate-90' : ''"
                :stroke-width="2.25"
              />
            </button>

            <button class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left" type="button" @click="selectValue(row.id)">
              <Folder class="h-4 w-4 flex-shrink-0 text-amber-500" :stroke-width="2.25" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ row.title }}</span>
                <span v-if="row.depth > 0 || query" class="block truncate text-[11px] font-normal text-slate-400">
                  {{ row.path }}
                </span>
              </span>
              <span class="flex-shrink-0 text-[11px] text-slate-400">{{ row.childCount }}</span>
              <Check v-if="modelValue === row.id" class="h-4 w-4 flex-shrink-0 text-emerald-500" :stroke-width="2.25" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, ChevronDown, ChevronRight, Folder, Search } from 'lucide-vue-next';
import type { BookmarkNode } from '../../types/bookmark';

interface FolderRow {
  id: string;
  parentId: string | null;
  title: string;
  path: string;
  depth: number;
  ancestorIds: string[];
  hasChildren: boolean;
  childCount: number;
}

const props = withDefaults(
  defineProps<{
    tree: BookmarkNode[];
    modelValue: string | null;
    variant?: 'dropdown' | 'panel';
    rootLabel?: string;
    rootDescription?: string;
    emptyText?: string;
    searchPlaceholder?: string;
    searchable?: boolean;
    blockFolderId?: string | null;
    listHeight?: string;
  }>(),
  {
    variant: 'panel',
    rootLabel: '根级',
    rootDescription: '顶层',
    emptyText: '暂无文件夹',
    searchPlaceholder: '搜索文件夹',
    searchable: false,
    blockFolderId: null,
    listHeight: '320px'
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const selectRef = ref<HTMLElement | null>(null);
const open = ref(false);
const query = ref('');
const expandedIds = ref<Set<string>>(new Set());

const variant = computed(() => props.variant);
const panelVisible = computed(() => props.variant === 'panel' || open.value);

const allRows = computed<FolderRow[]>(() => {
  const rows: FolderRow[] = [];

  function visit(nodes: BookmarkNode[], depth: number, ancestorIds: string[], parentLabels: string[]) {
    for (const node of nodes) {
      if (node.type !== 'folder') {
        continue;
      }

      const childFolders = node.children.filter((child) => child.type === 'folder');
      const path = [...parentLabels, node.title].join(' / ');
      rows.push({
        id: node.id,
        parentId: node.parent_id,
        title: node.title,
        path,
        depth,
        ancestorIds,
        hasChildren: childFolders.length > 0,
        childCount: childFolders.length
      });

      visit(node.children, depth + 1, [...ancestorIds, node.id], [...parentLabels, node.title]);
    }
  }

  visit(props.tree, 0, [], []);
  return rows;
});

const allowedRows = computed(() => {
  if (!props.blockFolderId) {
    return allRows.value;
  }

  return allRows.value.filter((row) => row.id !== props.blockFolderId && !row.ancestorIds.includes(props.blockFolderId!));
});

const childCountByParentId = computed(() => {
  const counts = new Map<string | null, number>();
  for (const row of allowedRows.value) {
    counts.set(row.parentId, (counts.get(row.parentId) ?? 0) + 1);
  }
  return counts;
});

const rowsWithAllowedChildren = computed(() =>
  allowedRows.value.map((row) => ({
    ...row,
    hasChildren: (childCountByParentId.value.get(row.id) ?? 0) > 0,
    childCount: childCountByParentId.value.get(row.id) ?? 0
  }))
);

const visibleRows = computed(() => {
  const trimmedQuery = query.value.trim().toLowerCase();
  if (trimmedQuery) {
    return rowsWithAllowedChildren.value.filter((row) => `${row.title} ${row.path}`.toLowerCase().includes(trimmedQuery));
  }

  return rowsWithAllowedChildren.value.filter((row) => {
    if (row.parentId === null) {
      return true;
    }
    return row.ancestorIds.every((ancestorId) => expandedIds.value.has(ancestorId));
  });
});

const selectedRow = computed(() => rowsWithAllowedChildren.value.find((row) => row.id === props.modelValue) ?? null);

const selectedLabel = computed(() => selectedRow.value?.title ?? props.rootLabel);
const selectedDescription = computed(() => {
  if (!selectedRow.value) {
    return props.rootDescription;
  }
  return selectedRow.value.depth === 0 ? '顶层文件夹' : selectedRow.value.path;
});

const listStyle = computed(() => {
  if (props.variant === 'panel') {
    return { height: props.listHeight };
  }
  return { maxHeight: props.listHeight };
});

watch(
  () => [allowedRows.value, props.modelValue] as const,
  ([rows, value]) => {
    if (value && !rows.some((row) => row.id === value)) {
      emit('update:modelValue', null);
    }
  },
  { immediate: true }
);

watch(
  selectedRow,
  (row) => {
    if (props.variant === 'panel' && row) {
      expandRowPath(row);
    }
  },
  { immediate: true }
);

function toggleOpen() {
  open.value = !open.value;
  if (open.value) {
    if (selectedRow.value) {
      expandRowPath(selectedRow.value);
    }
    return;
  }
  query.value = '';
}

function selectValue(value: string | null) {
  emit('update:modelValue', value);
  const row = rowsWithAllowedChildren.value.find((item) => item.id === value);
  if (row) {
    expandRowPath(row);
  }

  if (props.variant === 'dropdown') {
    open.value = false;
    query.value = '';
  }
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

function expandRowPath(row: FolderRow) {
  expandedIds.value = new Set([...expandedIds.value, ...row.ancestorIds, row.id]);
}

function handlePointerDown(event: PointerEvent) {
  if (props.variant !== 'dropdown' || !open.value || !selectRef.value) {
    return;
  }

  if (!selectRef.value.contains(event.target as Node)) {
    open.value = false;
    query.value = '';
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handlePointerDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown);
});
</script>
