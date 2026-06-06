<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px]" @click.self="$emit('close')">
      <form class="w-full max-w-2xl rounded-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.18)]" @submit.prevent="submit">
        <div class="flex items-center justify-between px-6 py-4">
          <h2 class="text-base font-semibold text-slate-900">导出书签</h2>
          <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" type="button" title="关闭" @click="$emit('close')">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-4 px-6 py-5">
          <div>
            <span class="mb-2 block text-sm font-medium text-slate-700">导出层级</span>
            <FolderTreeSelect
              v-model="selectedRootId"
              :tree="tree"
              empty-text="暂无可导出的文件夹"
              list-height="320px"
              root-description=""
              root-label="全部书签"
              variant="panel"
            />
          </div>

          <p class="text-[13px] text-slate-500">
            当前选择：<span class="font-medium text-slate-700">{{ selectedLabel }}</span>
          </p>
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50" type="button" @click="$emit('close')">取消</button>
          <button class="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700" type="submit">导出</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { X } from 'lucide-vue-next';
import FolderTreeSelect from './FolderTreeSelect.vue';
import type { BookmarkNode } from '../../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
  defaultRootId: string | null;
}>();

const emit = defineEmits<{
  close: [];
  export: [rootId: string | null];
}>();

const selectedRootId = ref<string | null>(props.defaultRootId);

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

const selectedLabel = computed(() => {
  if (!selectedRootId.value) {
    return '全部书签';
  }

  const selectedPath = findPath(props.tree, selectedRootId.value) ?? [];
  const names = selectedPath.map((id) => findNode(props.tree, id)?.title).filter(Boolean);
  return names.length > 0 ? names.join(' / ') : '全部书签';
});

watch(
  () => props.defaultRootId,
  (value) => {
    selectedRootId.value = value;
  },
  { immediate: true }
);

watch(
  () => props.tree,
  () => {
    if (selectedRootId.value && !findNode(props.tree, selectedRootId.value)) {
      selectedRootId.value = null;
    }
  }
);

function submit() {
  emit('export', selectedRootId.value);
}
</script>
