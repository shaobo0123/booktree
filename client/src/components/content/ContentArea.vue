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
          <p class="mt-1.5 text-[13px] leading-relaxed text-slate-400">创建第一个文件夹来组织你的书签</p>
        </div>
        <button class="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-[13px] font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-600" @click="$emit('create-folder', null)">
          <FolderPlus class="h-4 w-4" :stroke-width="2" /> 创建文件夹
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="mx-auto w-full max-w-[960px] px-8 py-6">
      <!-- Header -->
      <div class="mb-6">
        <Breadcrumb :path="breadcrumbPath" :selected-folder-id="selectedFolderId" @select="(id) => $emit('select-folder', id)" />
        <div class="mt-3 flex items-baseline gap-3">
          <h1 class="text-lg font-bold text-slate-900">{{ currentFolderTitle }}</h1>
          <span class="text-[13px] text-slate-400">{{ folderCount }} 个文件夹 · {{ bookmarkCount }} 个书签</span>
        </div>
      </div>

      <!-- Actions bar -->
      <div class="mb-5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-[13px] text-emerald-700 cursor-pointer transition-colors hover:bg-emerald-100 hover:border-emerald-300" @click="$emit('create-folder', selectedFolderId)">
            <FolderPlus class="h-3.5 w-3.5" :stroke-width="2" /><span>新建文件夹</span>
          </button>
          <button class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-600 cursor-pointer transition-colors hover:bg-slate-50 hover:border-slate-300" @click="$emit('create-bookmark', selectedFolderId)">
            <Plus class="h-3.5 w-3.5" :stroke-width="2" /><span>新建书签</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button class="inline-flex items-center justify-center h-7 w-8 rounded-md border-none bg-transparent text-slate-400 cursor-pointer transition-colors hover:text-slate-600" :class="viewMode === 'list' ? 'bg-slate-100 text-slate-900' : ''" title="列表视图" @click="$emit('update:viewMode', 'list')">
              <AlignJustify class="h-3.5 w-3.5" :stroke-width="2" />
            </button>
            <button class="inline-flex items-center justify-center h-7 w-8 rounded-md border-none bg-transparent text-slate-400 cursor-pointer transition-colors hover:text-slate-600" :class="viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : ''" title="网格视图" @click="$emit('update:viewMode', 'grid')">
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
          <button class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-[13px] text-emerald-700 cursor-pointer transition-colors hover:bg-emerald-100 hover:border-emerald-300" @click="$emit('create-folder', selectedFolderId)">
            <FolderPlus class="h-3.5 w-3.5" :stroke-width="2" /><span>新建文件夹</span>
          </button>
          <button class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-600 cursor-pointer transition-colors hover:bg-slate-50 hover:border-slate-300" @click="$emit('create-bookmark', selectedFolderId)">
            <Plus class="h-3.5 w-3.5" :stroke-width="2" /><span>新建书签</span>
          </button>
        </div>
      </div>

      <template v-else>
        <SectionList v-if="orderedFolders.length > 0" :items="orderedFolders" label="文件夹" :subtitle-fn="folderStats" :view-mode="viewMode" grid-min-width="200px" mb
          @click-item="(f) => $emit('select-folder', f.id)" @reorder="onFolderDragEnd" @contextmenu="(p) => $emit('contextmenu', p)" />
        <SectionList v-if="orderedBookmarks.length > 0" :items="orderedBookmarks" label="书签" :subtitle-fn="(b) => cleanUrl(b.url || '')" :view-mode="viewMode" grid-min-width="180px"
          @click-item="(b) => $emit('open-bookmark', b)" @reorder="onBookmarkDragEnd" @contextmenu="(p) => $emit('contextmenu', p)" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AlignJustify, FolderPlus, Inbox, LayoutGrid, LibraryBig, Plus } from 'lucide-vue-next';
import Breadcrumb from '../layout/Breadcrumb.vue';
import SectionList from './SectionList.vue';
import type { BookmarkNode, ViewMode } from '../../types/bookmark';

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
  for (const node of nodes) { if (node.id === id) return node; const f = findNodeById(id, node.children); if (f) return f; }
  return null;
}

const children = computed(() => !props.selectedFolderId ? props.tree : (findNodeById(props.selectedFolderId)?.children ?? []));
const folders = computed(() => children.value.filter(n => n.type === 'folder'));
const bookmarks = computed(() => children.value.filter(n => n.type === 'bookmark'));
const orderedFolders = computed(() => [...folders.value].sort((a, b) => a.sort_order - b.sort_order));
const orderedBookmarks = computed(() => [...bookmarks.value].sort((a, b) => a.sort_order - b.sort_order));
const folderCount = computed(() => folders.value.length);
const bookmarkCount = computed(() => bookmarks.value.length);

const currentFolderTitle = computed(() => !props.selectedFolderId ? '全部书签' : (findNodeById(props.selectedFolderId)?.title ?? '全部书签'));

const breadcrumbPath = computed(() => {
  if (!props.selectedFolderId) return [];
  function walk(id: string, nodes: BookmarkNode[], path: BookmarkNode[] = []): BookmarkNode[] | null {
    for (const n of nodes) { if (n.type !== 'folder') continue; if (n.id === id) return [...path, n]; const r = walk(id, n.children, [...path, n]); if (r) return r; }
    return null;
  }
  return walk(props.selectedFolderId, props.tree) ?? [];
});

function onFolderDragEnd() {
  emit('reorder', props.selectedFolderId, [...orderedFolders.value.map(n => n.id), ...orderedBookmarks.value.map(n => n.id)]);
}
function onBookmarkDragEnd() {
  emit('reorder', props.selectedFolderId, [...orderedFolders.value.map(n => n.id), ...orderedBookmarks.value.map(n => n.id)]);
}

// --- Shared helpers ---
function cleanUrl(url: string): string { try { const u = new URL(url); return u.host + u.pathname.replace(/\/$/, ''); } catch { return url; } }
function folderStats(node: BookmarkNode): string {
  let bms = 0, flds = 0;
  for (const c of node.children) { if (c.type === 'bookmark') bms++; else flds++; }
  const p: string[] = []; if (bms > 0) p.push(`${bms} 书签`); if (flds > 0) p.push(`${flds} 子文件夹`);
  return p.join(' · ') || '空';
}
</script>
