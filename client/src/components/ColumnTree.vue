<template>
  <main class="column-scrollbar flex min-h-0 flex-1 overflow-x-auto bg-slate-100/70">
    <div v-if="loading" class="flex w-full items-center justify-center">
      <div class="space-y-3 text-center">
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
        <p class="text-sm text-slate-400">加载中...</p>
      </div>
    </div>

    <div v-else-if="error" class="flex w-full items-center justify-center px-6 text-center text-sm text-rose-500">
      {{ error }}
    </div>

    <div v-else-if="tree.length === 0" class="flex w-full items-center justify-center px-6">
      <div class="space-y-4 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <FolderTree class="h-7 w-7 text-slate-300" />
        </div>
        <div>
          <p class="text-sm font-medium text-slate-600">暂无书签</p>
          <p class="mt-1 text-xs text-slate-400">点击「新建总书签」开始使用</p>
        </div>
      </div>
    </div>

    <template v-else>
      <BookmarkColumn
        v-for="column in columns"
        :key="column.key"
        :nodes="column.nodes"
        :parent-id="column.parentId"
        :selected-id="column.selectedId"
        :title="column.title"
        @create-bookmark="$emit('create-bookmark', $event)"
        @create-folder="$emit('create-folder', $event)"
        @delete="$emit('delete', $event)"
        @edit="$emit('edit', $event)"
        @open="$emit('open', $event)"
        @reorder="(parentId, ids) => $emit('reorder', parentId, ids)"
        @select="$emit('select', $event)"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FolderTree } from 'lucide-vue-next';
import BookmarkColumn from './BookmarkColumn.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
  selectedPath: string[];
  loading: boolean;
  error: string | null;
}>();

defineEmits<{
  select: [node: BookmarkNode];
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  reorder: [parentId: string | null, orderedIds: string[]];
  'create-folder': [parentId: string | null];
  'create-bookmark': [parentId: string | null];
}>();

function findIn(nodes: BookmarkNode[], id: string): BookmarkNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const child = findIn(node.children, id);
    if (child) {
      return child;
    }
  }
  return null;
}

const columns = computed(() => {
  const result: Array<{ key: string; title: string; nodes: BookmarkNode[]; selectedId: string | null; parentId: string | null }> = [
    {
      key: 'root',
      title: '根书签',
      nodes: props.tree,
      selectedId: props.selectedPath[0] ?? null,
      parentId: null
    }
  ];

  for (let index = 0; index < props.selectedPath.length; index += 1) {
    const selected = findIn(props.tree, props.selectedPath[index]);
    if (!selected || selected.type !== 'folder') {
      break;
    }

    result.push({
      key: selected.id,
      title: selected.title,
      nodes: selected.children,
      selectedId: props.selectedPath[index + 1] ?? null,
      parentId: selected.id
    });
  }

  return result;
});
</script>
