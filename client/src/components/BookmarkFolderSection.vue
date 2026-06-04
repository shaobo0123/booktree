<template>
  <section
    class="bookmark-section"
    :class="depth > 0 ? 'bookmark-section-nested' : ''"
    :style="{ '--section-depth': Math.min(depth, 5) }"
  >
    <div class="section-header">
      <div class="flex min-w-0 items-start gap-2">
        <div class="folder-drag-handle drag-handle-folder" title="拖动排序">
          <GripVertical class="h-4 w-4" :stroke-width="2.25" />
        </div>
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-2">
            <span class="section-marker" />
            <h2 class="truncate text-sm font-semibold text-slate-900">{{ folder.title }}</h2>
          </div>
          <p class="mt-0.5 truncate text-xs text-slate-500">
            {{ localBookmarks.length }} 个书签
            <span v-if="localFolders.length > 0"> · {{ localFolders.length }} 个子分组</span>
            <span v-if="subtitle"> · {{ subtitle }}</span>
          </p>
        </div>
      </div>

      <div class="flex flex-shrink-0 items-center gap-1">
        <button class="section-action" type="button" title="添加书签" @click="$emit('create-bookmark', folder.id)">
          <BookmarkPlus class="h-4 w-4" :stroke-width="2.25" />
        </button>
        <button class="section-action" type="button" title="编辑分组" @click="$emit('edit', folder)">
          <Pencil class="h-4 w-4" :stroke-width="2.25" />
        </button>
        <button
          class="section-action text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          type="button"
          title="删除分组"
          @click="$emit('delete', folder)"
        >
          <Trash2 class="h-4 w-4" :stroke-width="2.25" />
        </button>
      </div>
    </div>

    <div v-if="localBookmarks.length === 0 && localFolders.length === 0" class="empty-section">
      暂无书签
    </div>

    <draggable
      v-if="localBookmarks.length > 0"
      :list="localBookmarks"
      :animation="200"
      class="content-grid"
      item-key="id"
      ghost-class="opacity-30"
      handle=".drag-handle"
      @end="onBookmarkDragEnd"
    >
      <template #item="{ element }">
        <BookmarkItem
          :node="element"
          :selected="false"
          @delete="$emit('delete', $event)"
          @edit="$emit('edit', $event)"
          @open="$emit('open', $event)"
        />
      </template>
    </draggable>

    <draggable
      v-if="localFolders.length > 0"
      :list="localFolders"
      :animation="200"
      class="mt-5 space-y-5"
      item-key="id"
      ghost-class="opacity-30"
      handle=".drag-handle-folder"
      @end="onFolderDragEnd"
    >
      <template #item="{ element }">
        <BookmarkFolderSection
          :folder="element"
          :depth="depth + 1"
          :subtitle="nextSubtitle"
          @create-bookmark="$emit('create-bookmark', $event)"
          @delete="$emit('delete', $event)"
          @edit="$emit('edit', $event)"
          @open="$emit('open', $event)"
          @reorder="(parentId, orderedIds) => $emit('reorder', parentId, orderedIds)"
        />
      </template>
    </draggable>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { BookmarkPlus, GripVertical, Pencil, Trash2 } from 'lucide-vue-next';
import BookmarkItem from './BookmarkItem.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  folder: BookmarkNode;
  depth: number;
  subtitle: string;
}>();

const emit = defineEmits<{
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  reorder: [parentId: string | null, orderedIds: string[]];
  'create-bookmark': [parentId: string | null];
}>();

const localBookmarks = ref<BookmarkNode[]>([]);
const localFolders = ref<BookmarkNode[]>([]);

const nextSubtitle = computed(() => (props.subtitle ? `${props.subtitle} / ${props.folder.title}` : props.folder.title));

watch(
  () => props.folder.children,
  (children) => {
    localBookmarks.value = children.filter((node) => node.type === 'bookmark');
    localFolders.value = children.filter((node) => node.type === 'folder');
  },
  { deep: true, immediate: true }
);

function mergeOrderedIds(type: 'bookmark' | 'folder') {
  const bookmarkIds = [...localBookmarks.value.map((node) => node.id)];
  const folderIds = [...localFolders.value.map((node) => node.id)];

  return props.folder.children.map((node) => {
    if (type === 'bookmark' && node.type === 'bookmark') {
      return bookmarkIds.shift()!;
    }
    if (type === 'folder' && node.type === 'folder') {
      return folderIds.shift()!;
    }
    return node.id;
  });
}

function onBookmarkDragEnd() {
  emit('reorder', props.folder.id, mergeOrderedIds('bookmark'));
}

function onFolderDragEnd() {
  emit('reorder', props.folder.id, mergeOrderedIds('folder'));
}
</script>

<style scoped>
.bookmark-section {
  margin-left: calc(var(--section-depth) * 18px);
  @apply border-l border-slate-200 pl-3 sm:pl-4;
}

.bookmark-section-nested {
  @apply border-l-2 border-l-emerald-200;
}

.section-header {
  @apply mb-3 flex min-h-9 items-center justify-between gap-3;
}

.section-marker {
  @apply h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500;
}

.folder-drag-handle {
  @apply flex h-6 w-4 flex-shrink-0 cursor-grab items-center justify-center rounded text-slate-400 opacity-60 transition-colors hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing;
}

.section-action {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900;
}

.empty-section {
  @apply flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400;
}

.content-grid {
  --grid-gap: 10px;
  --item-min-width: 320px;
  --four-column-width: calc(25% - 7.5px);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, max(var(--item-min-width), var(--four-column-width))), 1fr));
  gap: var(--grid-gap);
}
</style>
