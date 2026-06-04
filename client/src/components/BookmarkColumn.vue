<template>
  <section class="flex min-w-[280px] max-w-[380px] flex-1 flex-shrink-0 flex-col bg-white/80">
    <div class="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
        <FolderOpen class="h-4 w-4" :stroke-width="2.25" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-sm font-semibold text-slate-800">{{ title }}</h2>
      </div>
      <div class="flex flex-shrink-0 items-center gap-1">
        <span class="mr-1 flex h-5 items-center rounded-full bg-slate-100 px-2 text-[11px] font-medium text-slate-500">
          {{ nodes.length }}
        </span>
        <button class="column-action" type="button" title="新建文件夹" @click="$emit('create-folder', parentId)">
          <FolderPlus class="h-4 w-4" :stroke-width="2.25" />
        </button>
        <button class="column-action" type="button" title="新建书签" @click="$emit('create-bookmark', parentId)">
          <BookmarkPlus class="h-4 w-4" :stroke-width="2.25" />
        </button>
      </div>
    </div>

    <div v-if="nodes.length === 0" class="flex flex-1 items-center justify-center px-6 text-center">
      <div class="space-y-3">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
          <Inbox class="h-6 w-6 text-slate-400" :stroke-width="2.25" />
        </div>
        <p class="text-xs text-slate-400">当前文件夹为空</p>
        <button class="empty-add-btn" type="button" @click="$emit('create-bookmark', parentId)">
          <BookmarkPlus class="h-4 w-4" :stroke-width="2.25" />
          <span>添加书签</span>
        </button>
      </div>
    </div>

    <div v-else class="column-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
      <draggable
        :list="localNodes"
        :animation="200"
        item-key="id"
        ghost-class="opacity-30"
        handle=".drag-handle"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <BookmarkItem
            :node="element"
            :selected="element.id === selectedId"
            @delete="$emit('delete', $event)"
            @edit="$emit('edit', $event)"
            @open="$emit('open', $event)"
            @select="$emit('select', $event)"
          />
        </template>
      </draggable>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { BookmarkPlus, FolderOpen, FolderPlus, Inbox } from 'lucide-vue-next';
import BookmarkItem from './BookmarkItem.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  title: string;
  nodes: BookmarkNode[];
  selectedId: string | null;
  parentId: string | null;
}>();

const emit = defineEmits<{
  select: [node: BookmarkNode];
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  reorder: [parentId: string | null, orderedIds: string[]];
  'create-folder': [parentId: string | null];
  'create-bookmark': [parentId: string | null];
}>();

const localNodes = ref<BookmarkNode[]>([...props.nodes]);

watch(
  () => props.nodes,
  (newNodes) => {
    localNodes.value = [...newNodes];
  },
  { deep: true }
);

function onDragEnd() {
  const orderedIds = localNodes.value.map((n) => n.id);
  emit('reorder', props.parentId, orderedIds);
}
</script>

<style scoped>
.column-action {
  @apply inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900;
}

.empty-add-btn {
  @apply inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800;
}
</style>
