<template>
  <main class="flex min-h-0 flex-1 bg-slate-100/70">
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
          <p class="mt-1 text-xs text-slate-400">点击「新建环境」开始使用</p>
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-0 w-full flex-1 flex-col lg:flex-row">
      <aside class="flex w-full flex-shrink-0 flex-col border-b border-slate-200/90 bg-white lg:w-72 lg:border-b-0 lg:border-r">
        <div class="hidden h-12 items-center gap-2.5 border-b border-slate-100 px-4 lg:flex">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <FolderTree class="h-4 w-4" :stroke-width="2.25" />
          </span>
          <div class="min-w-0">
            <h2 class="truncate text-sm font-semibold text-slate-800">环境分区</h2>
          </div>
        </div>

        <div class="column-scrollbar flex gap-2 overflow-x-auto px-3 py-1.5 lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-0 lg:overflow-x-hidden lg:overflow-y-auto lg:px-2 lg:py-2">
          <div class="folder-root-label">
            <Home class="h-4 w-4 flex-shrink-0" :stroke-width="2.25" />
            <span class="min-w-0 flex-1 truncate">全部环境</span>
            <span class="folder-count">{{ countBookmarks(tree) }}</span>
          </div>

          <draggable
            :list="localTopLevelFolders"
            :animation="200"
            class="flex gap-2 lg:block"
            item-key="id"
            ghost-class="opacity-30"
            handle=".top-folder-drag-handle"
            @end="onTopLevelFolderDragEnd"
          >
            <template #item="{ element }">
              <button
                class="folder-node-button"
                :class="currentRootFolderId === element.id ? 'folder-nav-active' : ''"
                type="button"
                @click="selectFolderNode(element)"
              >
                <span class="top-folder-drag-handle flex h-6 w-3 flex-shrink-0 cursor-grab items-center justify-center text-slate-400 opacity-60 active:cursor-grabbing">
                  <GripVertical class="h-4 w-4" :stroke-width="2.25" />
                </span>
                <FolderOpen v-if="currentRootFolderId === element.id" class="h-4 w-4 flex-shrink-0 text-amber-600" :stroke-width="2.25" />
                <Folder v-else class="h-4 w-4 flex-shrink-0 text-amber-500" :stroke-width="2.25" />
                <span class="min-w-0 flex-1 truncate">{{ element.title }}</span>
                <span class="folder-count">{{ countBookmarks(element.children) }}</span>
              </button>
            </template>
          </draggable>
        </div>
      </aside>

      <section v-if="!currentRootFolder" class="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-slate-50 px-6 text-center">
        <div class="space-y-3">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)]">
            <FolderTree class="h-5 w-5" :stroke-width="2.25" />
          </div>
          <div>
            <p class="text-sm font-medium text-slate-700">选择一个环境</p>
            <p class="mt-1 text-xs text-slate-400">左侧环境分区用于切换不同书签空间</p>
          </div>
        </div>
      </section>

      <section v-else class="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50">
        <header class="border-b border-slate-200/80 bg-white px-3 py-1.5 sm:px-5 sm:py-3">
          <nav class="mb-3 hidden min-w-0 items-center gap-1 overflow-hidden text-xs text-slate-500 sm:flex">
            <span class="breadcrumb-label">环境分区</span>
            <ChevronRight class="h-3.5 w-3.5 flex-shrink-0 text-slate-300" :stroke-width="2.25" />
            <button class="breadcrumb-button" type="button" @click="selectFolderNode(currentRootFolder)">
              {{ currentRootFolder.title }}
            </button>
          </nav>

          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2 sm:gap-3">
              <span class="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 sm:flex">
                <FolderOpen class="h-4 w-4" :stroke-width="2.25" />
              </span>
              <div class="min-w-0">
                <h1 class="truncate text-sm font-semibold text-slate-900 sm:text-base">{{ currentTitle }}</h1>
                <p class="hidden mt-0.5 text-xs text-slate-500 sm:block">{{ summaryLabel }} · {{ countBookmarks(currentNodes) }} 个书签</p>
              </div>
            </div>

            <div class="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              <button class="content-action" type="button" title="新建文件夹" @click="emit('create-folder', currentParentId)">
                <FolderPlus class="h-4 w-4" :stroke-width="2.25" />
                <span class="hidden sm:inline">新建文件夹</span>
              </button>
              <button class="content-primary" type="button" title="新建书签" @click="emit('create-bookmark', currentParentId)">
                <BookmarkPlus class="h-4 w-4" :stroke-width="2.25" />
                <span class="hidden sm:inline">新建书签</span>
              </button>
            </div>
          </div>
        </header>

        <BookmarkColumn
          :nodes="currentNodes"
          :parent-id="currentParentId"
          :title="currentTitle"
          @create-bookmark="emit('create-bookmark', $event)"
          @create-folder="emit('create-folder', $event)"
          @delete="emit('delete', $event)"
          @edit="emit('edit', $event)"
          @open="emit('open', $event)"
          @reorder="(parentId, ids) => emit('reorder', parentId, ids)"
        />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { BookmarkPlus, ChevronRight, Folder, FolderOpen, FolderPlus, FolderTree, GripVertical, Home } from 'lucide-vue-next';
import BookmarkColumn from './BookmarkColumn.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
  selectedPath: string[];
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  select: [node: BookmarkNode];
  'select-root': [];
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  reorder: [parentId: string | null, orderedIds: string[]];
  'create-folder': [parentId: string | null];
  'create-bookmark': [parentId: string | null];
}>();

const topLevelFolders = computed(() => props.tree.filter((node) => node.type === 'folder'));
const currentRootFolderId = computed(() => props.selectedPath[0] ?? null);
const currentRootFolder = computed(() => topLevelFolders.value.find((folder) => folder.id === currentRootFolderId.value) ?? null);
const currentParentId = computed(() => currentRootFolder.value?.id ?? null);
const currentNodes = computed(() => currentRootFolder.value?.children ?? props.tree);
const currentTitle = computed(() => currentRootFolder.value?.title ?? '全部环境');
const localTopLevelFolders = ref<BookmarkNode[]>([]);
const summaryLabel = computed(() => (currentRootFolder.value ? `${countFolders(currentNodes.value)} 个分组` : `${topLevelFolders.value.length} 个环境`));

watch(
  topLevelFolders,
  (folders) => {
    localTopLevelFolders.value = [...folders];
  },
  { deep: true, immediate: true }
);

function countBookmarks(nodes: BookmarkNode[]): number {
  return nodes.reduce((count, node) => count + (node.type === 'bookmark' ? 1 : countBookmarks(node.children)), 0);
}

function countFolders(nodes: BookmarkNode[]): number {
  return nodes.reduce((count, node) => count + (node.type === 'folder' ? 1 + countFolders(node.children) : 0), 0);
}

function selectFolderNode(node: BookmarkNode) {
  if (node.type !== 'folder') {
    return;
  }

  emit('select', node);
}

function onTopLevelFolderDragEnd() {
  const folderIds = localTopLevelFolders.value.map((node) => node.id);
  const nextFolderIds = [...folderIds];
  const orderedIds = props.tree.map((node) => (node.type === 'folder' ? nextFolderIds.shift()! : node.id));
  emit('reorder', null, orderedIds);
}
</script>

<style scoped>
.folder-node-button {
  @apply flex h-8 min-w-32 flex-shrink-0 items-center gap-2 rounded-lg px-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 lg:mb-1 lg:h-9 lg:w-full lg:min-w-36;
}

.folder-root-label {
  @apply flex h-8 min-w-32 flex-shrink-0 items-center gap-2 rounded-lg px-2 text-left text-sm font-medium text-slate-500 lg:mb-1 lg:h-9 lg:w-full lg:min-w-36;
}

.folder-nav-active {
  @apply bg-emerald-50 text-emerald-900 shadow-[inset_3px_0_0_0_theme(colors.emerald.500)] hover:bg-emerald-50;
}

.folder-count {
  @apply flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-medium text-slate-500;
}

.breadcrumb-button {
  @apply min-w-0 truncate rounded-md px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800;
}

.breadcrumb-label {
  @apply min-w-0 truncate px-1.5 py-1 font-medium text-slate-400;
}

.content-action {
  @apply inline-flex h-8 w-8 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 sm:h-9 sm:w-auto sm:px-3;
}

.content-primary {
  @apply inline-flex h-8 w-8 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-[13px] font-medium text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700 active:bg-emerald-800 sm:h-9 sm:w-auto sm:px-3;
}
</style>
