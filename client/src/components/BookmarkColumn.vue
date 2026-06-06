<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <!-- Empty state -->
    <div v-if="localBookmarks.length === 0 && localFolders.length === 0" class="flex flex-1 items-center justify-center px-6 text-center">
      <div class="space-y-4">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <Inbox class="h-6 w-6 text-slate-300" :stroke-width="2.25" />
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

    <!-- Content -->
    <div v-else class="column-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      <div class="flex flex-col gap-5">
        <!-- Folders: horizontal flex wrap -->
        <div v-if="localFolders.length > 0" class="flex flex-wrap gap-2.5">
          <button
            v-for="folder in localFolders"
            :key="folder.id"
            class="folder-chip group"
            type="button"
            @click="$emit('navigate', folder)"
          >
            <Folder class="h-4 w-4 flex-shrink-0 text-amber-500 transition-colors group-hover:text-amber-600" :stroke-width="2.25" />
            <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ folder.title }}</span>
            <span class="flex-shrink-0 text-xs text-slate-400">
              {{ countDirectBookmarks(folder) }}<span v-if="countSubFolders(folder) > 0">+{{ countSubFolders(folder) }}</span>
            </span>
            <ChevronRight class="h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" :stroke-width="2.25" />

            <!-- Hover actions -->
            <span class="folder-chip-actions">
              <button
                class="chip-action"
                type="button"
                title="编辑"
                @click.stop="$emit('edit', folder)"
              >
                <Pencil class="h-3 w-3" :stroke-width="2.25" />
              </button>
              <button
                class="chip-action chip-action-danger"
                type="button"
                title="删除"
                @click.stop="$emit('delete', folder)"
              >
                <Trash2 class="h-3 w-3" :stroke-width="2.25" />
              </button>
            </span>
          </button>
        </div>

        <!-- Bookmarks: grid -->
        <draggable
          v-if="localBookmarks.length > 0"
          :list="localBookmarks"
          :animation="200"
          class="bookmark-grid"
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
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { BookmarkPlus, ChevronRight, Folder, FolderPlus, Inbox, Pencil, Trash2 } from 'lucide-vue-next';
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
  navigate: [node: BookmarkNode];
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

function countDirectBookmarks(folder: BookmarkNode): number {
  return folder.children.filter((n) => n.type === 'bookmark').length;
}

function countSubFolders(folder: BookmarkNode): number {
  return folder.children.filter((n) => n.type === 'folder').length;
}

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
</script>

<style scoped>
/* --- Empty state --- */
.empty-add-btn {
  @apply inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800;
}

.empty-add-primary {
  @apply border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100;
}

/* --- Folder chips: pill-shaped navigation buttons --- */
.folder-chip {
  @apply relative inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200/80 bg-white pl-3 pr-2.5 text-left transition-all hover:border-amber-200 hover:bg-amber-50/60;
}

.folder-chip-actions {
  @apply absolute -right-1 -top-2.5 flex gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 opacity-0 shadow-sm transition-opacity;
}

.folder-chip:hover .folder-chip-actions {
  @apply opacity-100;
}

.chip-action {
  @apply inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600;
}

.chip-action-danger {
  @apply hover:bg-rose-50 hover:text-rose-500;
}

/* --- Bookmark grid --- */
.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
</style>
