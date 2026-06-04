<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 py-6">
    <form class="w-full max-w-2xl rounded-lg bg-white shadow-soft" @submit.prevent="submit">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 class="text-base font-semibold text-slate-950">导出书签</h2>
        <button class="icon-button" type="button" title="关闭" @click="$emit('close')">
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="space-y-4 px-5 py-5">
        <div>
          <span class="mb-2 block text-sm font-medium text-slate-700">导出层级</span>
          <button
            class="mb-3 flex h-10 w-full items-center justify-between rounded-lg border px-3 text-left text-sm transition"
            :class="selectedRootId === null ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
            type="button"
            @click="selectAll"
          >
            <span class="font-medium">全部书签</span>
            <Check v-if="selectedRootId === null" class="h-4 w-4" />
          </button>

          <div class="h-[340px] overflow-y-auto rounded-lg border border-slate-200 bg-white">
            <div v-if="visibleRows.length === 0" class="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
              暂无可导出的文件夹
            </div>

            <div v-else class="py-1">
              <div
                v-for="row in visibleRows"
                :key="row.node.id"
                class="flex min-h-11 items-center gap-1 border-b border-slate-100 pr-2 text-sm last:border-b-0"
                :style="{ paddingLeft: `${row.depth * 18 + 8}px` }"
              >
                <button
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-0"
                  :disabled="!row.hasChildren"
                  :title="expandedIds.has(row.node.id) ? '收起' : '展开'"
                  type="button"
                  @click="toggleExpanded(row.node.id)"
                >
                  <ChevronDown v-if="expandedIds.has(row.node.id)" class="h-4 w-4" />
                  <ChevronRight v-else class="h-4 w-4" />
                </button>

                <button
                  class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition"
                  :class="selectedRootId === row.node.id ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700 hover:bg-slate-50'"
                  type="button"
                  @click="selectFolder(row.node)"
                >
                  <Folder class="h-4 w-4 flex-shrink-0 text-amber-600" />
                  <span class="min-w-0 flex-1 truncate font-medium">{{ row.node.title }}</span>
                  <span class="flex-shrink-0 text-xs text-slate-400">{{ row.folderCount }}</span>
                  <Check v-if="selectedRootId === row.node.id" class="h-4 w-4 flex-shrink-0 text-emerald-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <p class="text-sm text-slate-500">
          当前选择：<span class="font-medium text-slate-700">{{ selectedLabel }}</span>。选择文件夹时会导出该文件夹及其所有子节点。
        </p>
      </div>

      <div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button" @click="$emit('close')">
          取消
        </button>
        <button class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700" type="submit">
          导出
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, ChevronDown, ChevronRight, Folder, X } from 'lucide-vue-next';
import type { BookmarkNode } from '../types/bookmark';

interface VisibleFolderRow {
  node: BookmarkNode;
  depth: number;
  hasChildren: boolean;
  folderCount: number;
}

const props = defineProps<{
  tree: BookmarkNode[];
  defaultRootId: string | null;
}>();

const emit = defineEmits<{
  close: [];
  export: [rootId: string | null];
}>();

const selectedRootId = ref<string | null>(props.defaultRootId);
const selectedPath = ref<string[]>([]);
const expandedIds = ref<Set<string>>(new Set());

function folderChildren(nodes: BookmarkNode[]) {
  return nodes.filter((node) => node.type === 'folder');
}

function findPath(nodes: BookmarkNode[], id: string, parents: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.type !== 'folder') {
      continue;
    }

    const path = [...parents, node.id];
    if (node.id === id) {
      return path;
    }

    const childPath = findPath(node.children, id, path);
    if (childPath) {
      return childPath;
    }
  }

  return null;
}

function findNode(nodes: BookmarkNode[], id: string): BookmarkNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const child = findNode(node.children, id);
    if (child) {
      return child;
    }
  }

  return null;
}

function syncPath(rootId: string | null) {
  selectedRootId.value = rootId;
  selectedPath.value = rootId ? findPath(props.tree, rootId) ?? [] : [];
  expandedIds.value = new Set([...expandedIds.value, ...selectedPath.value]);
}

const visibleRows = computed(() => {
  const result: VisibleFolderRow[] = [];

  function visit(nodes: BookmarkNode[], depth: number) {
    for (const node of folderChildren(nodes)) {
      const childFolders = folderChildren(node.children);
      result.push({
        node,
        depth,
        hasChildren: childFolders.length > 0,
        folderCount: childFolders.length
      });

      if (expandedIds.value.has(node.id)) {
        visit(node.children, depth + 1);
      }
    }
  }

  visit(props.tree, 0);
  return result;
});

const selectedLabel = computed(() => {
  if (!selectedRootId.value) {
    return '全部书签';
  }

  const names = selectedPath.value.map((id) => findNode(props.tree, id)?.title).filter(Boolean);
  return names.length > 0 ? names.join(' / ') : '全部书签';
});

watch(
  () => [props.defaultRootId, props.tree] as const,
  (value) => {
    syncPath(value[0]);
  },
  { immediate: true }
);

function selectAll() {
  syncPath(null);
}

function selectFolder(folder: BookmarkNode) {
  selectedRootId.value = folder.id;
  selectedPath.value = findPath(props.tree, folder.id) ?? [folder.id];
  expandedIds.value = new Set([...expandedIds.value, ...selectedPath.value]);
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

function submit() {
  emit('export', selectedRootId.value);
}
</script>

<style scoped>
.icon-button {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900;
}
</style>
