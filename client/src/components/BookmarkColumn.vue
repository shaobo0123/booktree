<template>
  <section class="flex min-h-0 flex-1 flex-col bg-slate-50">
    <div v-if="localBookmarks.length === 0 && localFolders.length === 0" class="flex flex-1 items-center justify-center px-6 text-center">
      <div class="space-y-4">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white">
          <Inbox class="h-6 w-6 text-slate-400" :stroke-width="2.25" />
        </div>
        <div>
          <p class="text-sm font-medium text-slate-600">当前视图为空</p>
          <p class="mt-1 text-xs text-slate-400">可以先建一个分组，或者直接添加书签</p>
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <button class="empty-add-btn" type="button" @click="$emit('create-folder', parentId)">
            <FolderPlus class="h-4 w-4" :stroke-width="2.25" />
            <span>分组</span>
          </button>
          <button class="empty-add-btn empty-add-primary" type="button" @click="$emit('create-bookmark', parentId)">
            <BookmarkPlus class="h-4 w-4" :stroke-width="2.25" />
            <span>书签</span>
          </button>
        </div>
      </div>
    </div>

    <div v-else class="column-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
      <div class="space-y-6">
        <section v-if="localBookmarks.length > 0" class="root-bookmark-section">
          <div class="section-header">
            <div class="min-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <span class="section-marker" />
                <h2 class="truncate text-sm font-semibold text-slate-900">{{ title }}</h2>
              </div>
              <p class="mt-0.5 truncate text-xs text-slate-500">{{ localBookmarks.length }} 个书签</p>
            </div>

            <button class="section-action" type="button" title="添加书签" @click="$emit('create-bookmark', parentId)">
              <BookmarkPlus class="h-4 w-4" :stroke-width="2.25" />
            </button>
          </div>

          <draggable
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
        </section>

        <draggable
          v-if="localFolders.length > 0"
          :list="localFolders"
          :animation="200"
          class="space-y-5"
          item-key="id"
          ghost-class="opacity-30"
          handle=".drag-handle-folder"
          @end="onFolderDragEnd"
        >
          <template #item="{ element }">
            <BookmarkFolderSection
              :folder="element"
              :depth="0"
              subtitle=""
              @create-bookmark="$emit('create-bookmark', $event)"
              @delete="$emit('delete', $event)"
              @edit="$emit('edit', $event)"
              @open="$emit('open', $event)"
              @reorder="(sectionParentId, orderedIds) => $emit('reorder', sectionParentId, orderedIds)"
            />
          </template>
        </draggable>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { BookmarkPlus, FolderPlus, Inbox } from 'lucide-vue-next';
import BookmarkFolderSection from './BookmarkFolderSection.vue';
import BookmarkItem from './BookmarkItem.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  title: string;
  nodes: BookmarkNode[];
  parentId: string | null;
}>();

const emit = defineEmits<{
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  reorder: [parentId: string | null, orderedIds: string[]];
  'create-folder': [parentId: string | null];
  'create-bookmark': [parentId: string | null];
}>();

const localBookmarks = ref<BookmarkNode[]>([]);
const localFolders = ref<BookmarkNode[]>([]);

watch(
  () => props.nodes,
  (nodes) => {
    localBookmarks.value = nodes.filter((node) => node.type === 'bookmark');
    localFolders.value = nodes.filter((node) => node.type === 'folder');
  },
  { deep: true, immediate: true }
);

function mergeOrderedIds(type: 'bookmark' | 'folder') {
  const bookmarkIds = [...localBookmarks.value.map((node) => node.id)];
  const folderIds = [...localFolders.value.map((node) => node.id)];

  return props.nodes.map((node) => {
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
  emit('reorder', props.parentId, mergeOrderedIds('bookmark'));
}

function onFolderDragEnd() {
  emit('reorder', props.parentId, mergeOrderedIds('folder'));
}
</script>

<style scoped>
.root-bookmark-section {
  @apply border-l border-slate-200 pl-3 sm:pl-4;
}

.section-header {
  @apply mb-3 flex min-h-9 items-center justify-between gap-3;
}

.section-marker {
  @apply h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500;
}

.section-action {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900;
}

.empty-add-btn {
  @apply inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800;
}

.empty-add-primary {
  @apply border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100;
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
