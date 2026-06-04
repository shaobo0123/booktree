<template>
  <main class="column-scrollbar flex min-h-0 flex-1 overflow-x-auto bg-slate-50">
    <div v-if="loading" class="flex w-full items-center justify-center text-sm text-slate-500">
      加载中...
    </div>

    <div v-else-if="error" class="flex w-full items-center justify-center px-6 text-center text-sm text-rose-600">
      {{ error }}
    </div>

    <div v-else-if="tree.length === 0" class="flex w-full items-center justify-center px-6 text-center text-sm text-slate-500">
      暂无书签，点击“新建总书签”开始。
    </div>

    <template v-else>
      <BookmarkColumn
        v-for="column in columns"
        :key="column.key"
        :nodes="column.nodes"
        :selected-id="column.selectedId"
        :title="column.title"
        @delete="$emit('delete', $event)"
        @edit="$emit('edit', $event)"
        @open="$emit('open', $event)"
        @select="$emit('select', $event)"
      />
      <div class="w-12 flex-shrink-0" />
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
  const result: Array<{ key: string; title: string; nodes: BookmarkNode[]; selectedId: string | null }> = [
    {
      key: 'root',
      title: '总书签',
      nodes: props.tree,
      selectedId: props.selectedPath[0] ?? null
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
      selectedId: props.selectedPath[index + 1] ?? null
    });
  }

  return result;
});
</script>
