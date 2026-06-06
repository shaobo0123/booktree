<template>
  <main class="flex min-h-0 flex-1">
    <!-- Loading -->
    <div v-if="loading" class="flex w-full items-center justify-center bg-slate-50">
      <div class="space-y-3 text-center">
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
        <p class="text-sm text-slate-400">加载中...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex w-full items-center justify-center bg-slate-50 px-6 text-center text-sm text-rose-500">
      {{ error }}
    </div>

    <!-- Empty -->
    <div v-else-if="tree.length === 0" class="flex w-full items-center justify-center bg-slate-50 px-6">
      <div class="space-y-4 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <FolderTree class="h-7 w-7 text-slate-300" />
        </div>
        <div>
          <p class="text-sm font-medium text-slate-600">暂无书签</p>
          <p class="mt-1 text-xs text-slate-400">点击「新建环境」开始使用</p>
        </div>
      </div>
    </div>

    <!-- Canvas -->
    <div v-else class="mind-canvas column-scrollbar min-h-0 flex-1 overflow-auto">
      <div class="mind-canvas-inner">
        <div class="mind-root-list">
          <div v-for="node in rootNodes" :key="node.id" class="mind-root-item">
            <MindMapNode
              :node="node"
              :expanded-ids="expandedIds"
              @toggle="toggleExpanded"
              @open="emit('open', $event)"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @create-bookmark="emit('create-bookmark', $event)"
              @create-folder="emit('create-folder', $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { FolderTree } from 'lucide-vue-next';
import MindMapNode from './MindMapNode.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  'create-folder': [data: { parentId: string; title: string }];
  'create-bookmark': [data: { parentId: string; title: string; url: string }];
  reorder: [parentId: string | null, orderedIds: string[]];
}>();

const expandedIds = ref<Set<string>>(new Set());

function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedIds.value = next;
}

const rootNodes = computed(() => {
  const folders = props.tree.filter((n) => n.type === 'folder');
  const bookmarks = props.tree.filter((n) => n.type === 'bookmark');
  return [...folders, ...bookmarks];
});
</script>

<style scoped>
.mind-canvas {
  background-color: #f8fafc;
  background-image: radial-gradient(circle, #e2e8f0 1px, transparent 1px);
  background-size: 24px 24px;
}

.mind-canvas-inner {
  @apply inline-block min-w-full min-h-full p-8;
}

.mind-root-list {
  @apply flex flex-col gap-6;
}

.mind-root-item {
  @apply relative;
}
</style>
