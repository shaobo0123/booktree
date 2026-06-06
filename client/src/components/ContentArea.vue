<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto column-scrollbar">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <div class="space-y-3 text-center">
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
        <p class="text-sm text-slate-400">加载中...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-1 items-center justify-center px-6 text-center text-sm text-rose-500">
      {{ error }}
    </div>

    <!-- Empty: no tree at all -->
    <div v-else-if="tree.length === 0" class="flex flex-1 items-center justify-center px-6">
      <div class="max-w-xs space-y-5 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <LibraryBig class="h-8 w-8 text-slate-300" :stroke-width="1.5" />
        </div>
        <div>
          <p class="text-[15px] font-semibold text-slate-700">欢迎使用 Tree Bookmarks</p>
          <p class="mt-1.5 text-[13px] leading-relaxed text-slate-400">
            创建第一个文件夹来组织你的书签
          </p>
        </div>
        <button
          class="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-[13px] font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-600"
          @click="$emit('create-folder', null)"
        >
          <FolderPlus class="h-4 w-4" :stroke-width="2" />
          创建文件夹
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="mx-auto w-full max-w-[960px] px-8 py-6">
      <!-- Header -->
      <div class="mb-6">
        <Breadcrumb
          :path="breadcrumbPath"
          :selected-folder-id="selectedFolderId"
          @select="(id: string | null) => $emit('select-folder', id)"
        />

        <div class="mt-3 flex items-baseline gap-3">
          <h1 class="text-lg font-bold text-slate-900">
            {{ currentFolderTitle }}
          </h1>
          <span class="text-[13px] text-slate-400">
            {{ folderCount }} 个文件夹 · {{ bookmarkCount }} 个书签
          </span>
        </div>
      </div>

      <!-- Actions bar -->
      <div class="mb-5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="action-btn action-btn-primary" @click="$emit('create-folder', selectedFolderId)">
            <FolderPlus class="h-3.5 w-3.5" :stroke-width="2" />
            <span>新建文件夹</span>
          </button>
          <button class="action-btn" @click="$emit('create-bookmark', selectedFolderId)">
            <Plus class="h-3.5 w-3.5" :stroke-width="2" />
            <span>新建书签</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <!-- View mode toggle -->
          <div class="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              class="view-toggle-btn"
              :class="viewMode === 'list' ? 'view-toggle-active' : ''"
              title="列表视图"
              @click="$emit('update:viewMode', 'list')"
            >
              <AlignJustify class="h-3.5 w-3.5" :stroke-width="2" />
            </button>
            <button
              class="view-toggle-btn"
              :class="viewMode === 'grid' ? 'view-toggle-active' : ''"
              title="网格视图"
              @click="$emit('update:viewMode', 'grid')"
            >
              <LayoutGrid class="h-3.5 w-3.5" :stroke-width="2" />
            </button>
          </div>
        </div>
      </div>

      <!-- Empty current folder -->
      <div v-if="folders.length === 0 && bookmarks.length === 0" class="py-16 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Inbox class="h-6 w-6 text-slate-300" :stroke-width="2" />
        </div>
        <p class="mt-3 text-sm font-medium text-slate-500">此文件夹为空</p>
        <p class="mt-1 text-xs text-slate-400">添加文件夹或书签来填充它</p>
        <div class="mt-4 flex items-center justify-center gap-2">
          <button class="action-btn action-btn-primary" @click="$emit('create-folder', selectedFolderId)">
            <FolderPlus class="h-3.5 w-3.5" :stroke-width="2" />
            <span>新建文件夹</span>
          </button>
          <button class="action-btn" @click="$emit('create-bookmark', selectedFolderId)">
            <Plus class="h-3.5 w-3.5" :stroke-width="2" />
            <span>新建书签</span>
          </button>
        </div>
      </div>

      <template v-else>
        <!-- FOLDERS section -->
        <section v-if="folders.length > 0" class="mb-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">文件夹</span>
            <span class="text-[11px] text-slate-300">{{ folders.length }}</span>
          </div>

          <!-- List View for Folders -->
          <draggable
            v-if="viewMode === 'list'"
            v-model="localFolders"
            item-key="id"
            class="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white"
            handle=".drag-handle"
            ghost-class="opacity-30"
            :animation="200"
            @change="onFolderDragEnd"
          >
            <template #item="{ element: folder }">
              <FolderRow
                :node="folder"
                @click="$emit('select-folder', folder.id)"
                @edit="(n) => $emit('edit', n)"
                @delete="(n) => $emit('delete', n)"
                @contextmenu="(payload) => $emit('contextmenu', payload)"
              />
            </template>
          </draggable>

          <!-- Grid View for Folders -->
          <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            <BookmarkCard
              v-for="folder in orderedFolders"
              :key="folder.id"
              :node="folder"
              @click="$emit('select-folder', folder.id)"
              @edit="(n) => $emit('edit', n)"
              @delete="(n) => $emit('delete', n)"
              @contextmenu="(payload) => $emit('contextmenu', payload)"
            />
          </div>
        </section>

        <!-- BOOKMARKS section -->
        <section v-if="bookmarks.length > 0">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">书签</span>
            <span class="text-[11px] text-slate-300">{{ bookmarks.length }}</span>
          </div>

          <!-- List View for Bookmarks -->
          <draggable
            v-if="viewMode === 'list'"
            v-model="localBookmarks"
            item-key="id"
            class="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white"
            handle=".drag-handle"
            ghost-class="opacity-30"
            :animation="200"
            @change="onBookmarkDragEnd"
          >
            <template #item="{ element: bookmark }">
              <BookmarkRow
                :node="bookmark"
                @click="$emit('open-bookmark', bookmark)"
                @edit="(n) => $emit('edit', n)"
                @delete="(n) => $emit('delete', n)"
                @contextmenu="(payload) => $emit('contextmenu', payload)"
              />
            </template>
          </draggable>

          <!-- Grid View for Bookmarks -->
          <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            <BookmarkCard
              v-for="bookmark in orderedBookmarks"
              :key="bookmark.id"
              :node="bookmark"
              @click="$emit('open-bookmark', bookmark)"
              @edit="(n) => $emit('edit', n)"
              @delete="(n) => $emit('delete', n)"
              @contextmenu="(payload) => $emit('contextmenu', payload)"
            />
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import {
  AlignJustify,
  FolderPlus,
  Inbox,
  LayoutGrid,
  LibraryBig,
  Plus
} from 'lucide-vue-next';
import Breadcrumb from './Breadcrumb.vue';
import FolderRow from './FolderRow.vue';
import BookmarkRow from './BookmarkRow.vue';
import BookmarkCard from './BookmarkCard.vue';
import type { BookmarkNode, ViewMode } from '../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
  loading: boolean;
  error: string | null;
  selectedFolderId: string | null;
  viewMode: ViewMode;
}>();

const emit = defineEmits<{
  'select-folder': [id: string | null];
  'open-bookmark': [node: BookmarkNode];
  'edit': [node: BookmarkNode];
  'delete': [node: BookmarkNode];
  'reorder': [parentId: string | null, orderedIds: string[]];
  'create-folder': [parentId: string | null];
  'create-bookmark': [parentId: string | null];
  'contextmenu': [payload: { node: BookmarkNode; x: number; y: number }];
  'update:viewMode': [mode: ViewMode];
}>();

function findNodeById(id: string, nodes: BookmarkNode[] = props.tree): BookmarkNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(id, node.children);
    if (found) return found;
  }
  return null;
}

const children = computed(() => {
  if (!props.selectedFolderId) {
    return props.tree;
  }
  const folder = findNodeById(props.selectedFolderId);
  return folder ? folder.children : [];
});

const folders = computed(() =>
  children.value.filter((n) => n.type === 'folder')
);

const bookmarks = computed(() =>
  children.value.filter((n) => n.type === 'bookmark')
);

const orderedFolders = computed(() =>
  [...folders.value].sort((a, b) => a.sort_order - b.sort_order)
);

const orderedBookmarks = computed(() =>
  [...bookmarks.value].sort((a, b) => a.sort_order - b.sort_order)
);

const folderCount = computed(() => folders.value.length);
const bookmarkCount = computed(() => bookmarks.value.length);

const currentFolderTitle = computed(() => {
  if (!props.selectedFolderId) return '全部书签';
  const folder = findNodeById(props.selectedFolderId);
  return folder ? folder.title : '全部书签';
});

const breadcrumbPath = computed(() => {
  if (!props.selectedFolderId) return [];

  function findPath(
    id: string,
    nodes: BookmarkNode[],
    path: BookmarkNode[] = []
  ): BookmarkNode[] | null {
    for (const node of nodes) {
      if (node.type !== 'folder') continue;
      if (node.id === id) return [...path, node];
      const found = findPath(id, node.children, [...path, node]);
      if (found) return found;
    }
    return null;
  }

  return findPath(props.selectedFolderId, props.tree) ?? [];
});

// --- Draggable local state ---
const localFolders = ref<BookmarkNode[]>([...orderedFolders.value]);
const localBookmarks = ref<BookmarkNode[]>([...orderedBookmarks.value]);

watch(orderedFolders, (val) => { localFolders.value = [...val]; });
watch(orderedBookmarks, (val) => { localBookmarks.value = [...val]; });

function onFolderDragEnd() {
  const folderIds = localFolders.value.map((n) => n.id);
  const bookmarkIds = orderedBookmarks.value.map((n) => n.id);
  emit('reorder', props.selectedFolderId, [...folderIds, ...bookmarkIds]);
}

function onBookmarkDragEnd() {
  const folderIds = orderedFolders.value.map((n) => n.id);
  const bookmarkIds = localBookmarks.value.map((n) => n.id);
  emit('reorder', props.selectedFolderId, [...folderIds, ...bookmarkIds]);
}
</script>

<style scoped>
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.1s ease, border-color 0.1s ease;
}
.action-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.action-btn-primary {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #059669;
}
.action-btn-primary:hover {
  background: #d1fae5;
  border-color: #6ee7b7;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  width: 32px;
  border-radius: 6px;
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  transition: background-color 0.1s ease, color 0.1s ease;
}
.view-toggle-btn:hover {
  color: #475569;
}
.view-toggle-active {
  background: #f1f5f9;
  color: #0f172a;
}
</style>
