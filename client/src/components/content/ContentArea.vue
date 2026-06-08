<template>
  <div ref="containerRef" class="flex min-h-0 flex-1 flex-col overflow-y-auto column-scrollbar" @scroll.passive="onContainerScroll">
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <div class="space-y-3 text-center">
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
        <p class="text-sm text-slate-400">加载中...</p>
      </div>
    </div>

    <div v-else-if="error" class="flex flex-1 items-center justify-center px-6 text-center text-sm text-rose-500">
      {{ error }}
    </div>

    <div v-else-if="tree.length === 0" class="flex flex-1 items-center justify-center px-6">
      <div class="max-w-xs space-y-5 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <LibraryBig class="h-8 w-8 text-slate-300" :stroke-width="1.5" />
        </div>
        <div>
          <p class="text-[15px] font-semibold text-slate-700">欢迎使用 Tree Bookmarks</p>
          <p class="mt-1.5 text-[13px] leading-relaxed text-slate-400">{{ isLoggedIn ? '进入管理后台创建第一个书签' : '请登录后开始创建书签' }}</p>
        </div>
      </div>
    </div>

    <div v-else class="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
      <div class="mb-6">
        <Breadcrumb :path="breadcrumbPath" :selected-folder-id="selectedFolderId" @select="(id) => $emit('select-folder', id)" />
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 class="text-lg font-bold text-slate-900">{{ pageTitle }}</h1>
            <span class="text-[13px] text-slate-400">{{ visibleFolderCount }} 个文件夹 · {{ visibleBookmarkCount }} 个书签</span>
            <span v-if="viewScope === 'all' && selectedAnchorTitle" class="text-[13px] text-emerald-600">定位：{{ selectedAnchorTitle }}</span>
          </div>
          <div class="inline-flex h-8 rounded-lg border border-slate-200 bg-white p-0.5">
            <button class="rounded-md px-2.5 text-[13px] transition-colors" :class="viewScope === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'" @click="setViewScope('all')">全局</button>
            <button class="rounded-md px-2.5 text-[13px] transition-colors" :class="viewScope === 'current' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'" @click="setViewScope('current')">当前</button>
          </div>
        </div>
      </div>

      <div v-if="isCurrentPageEmpty" class="py-16 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Inbox class="h-6 w-6 text-slate-300" :stroke-width="2" />
        </div>
        <p class="mt-3 text-sm font-medium text-slate-500">此文件夹为空</p>
        <p class="mt-1 text-xs text-slate-400">可在管理后台添加文件夹或书签</p>
      </div>

      <SectionList
        v-else-if="viewScope === 'current'"
        :items="orderedChildren"
        label=""
        :subtitle-fn="childSubtitle"
        view-mode="grid"
        grid-min-width="180px"
        :draggable="false"
        :edit-mode="false"
        :selected-ids="emptySelectedIds"
        @click-item="onCurrentItemClick"
        @contextmenu="(p) => $emit('contextmenu', p)"
      />

      <div v-else class="space-y-3">
          <template v-for="block in displayBlocks" :key="block.key">
            <div
              v-if="block.kind === 'folder'"
              :id="folderAnchorId(block.node.id)"
              :data-folder-anchor="block.node.id"
              class="group flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 transition-colors"
              :class="[folderHeadingClass(block.depth), selectedFolderId === block.node.id ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'text-slate-700 hover:bg-slate-50']"
              :style="{ paddingLeft: `${headingIndent(block.depth)}px` }"
              :title="block.path"
              @click="$emit('select-folder', block.node.id)"
              @contextmenu.prevent="(e) => $emit('contextmenu', { node: block.node, x: e.clientX, y: e.clientY })"
              @pointerdown="(e) => onFolderPointerDown(block.node, e)"
              @pointerleave="clearLongPress"
              @pointerup="clearLongPress"
              @pointercancel="clearLongPress"
            >
              <Folder class="h-4 w-4 flex-shrink-0 text-amber-500" :stroke-width="2" />
              <span class="min-w-0 flex-1 truncate">{{ block.node.title }}</span>
              <span class="flex-shrink-0 text-[11px] font-normal text-slate-400">{{ folderStats(block.node) }}</span>
            </div>

            <SectionList
              v-else
              :items="block.items"
              label=""
              :subtitle-fn="childSubtitle"
              view-mode="grid"
              grid-min-width="180px"
              :draggable="false"
              :edit-mode="false"
              :selected-ids="emptySelectedIds"
              :mb="false"
              @click-item="(item) => $emit('open-bookmark', item)"
              @contextmenu="(p) => $emit('contextmenu', p)"
            />
          </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { Folder, Inbox, LibraryBig } from 'lucide-vue-next';
import Breadcrumb from '../layout/Breadcrumb.vue';
import SectionList from './SectionList.vue';
import { useSidebarState } from '../../composables/useSidebarState';
import type { BookmarkNode, ViewMode } from '../../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
  loading: boolean;
  error: string | null;
  selectedFolderId: string | null;
  viewMode: ViewMode;
  isLoggedIn: boolean;
}>();

const emit = defineEmits<{
  'select-folder': [id: string | null];
  'open-bookmark': [node: BookmarkNode];
  'contextmenu': [payload: { node: BookmarkNode; x: number; y: number }];
}>();

type ContentBlock =
  | { kind: 'folder'; key: string; node: BookmarkNode; depth: number; path: string }
  | { kind: 'bookmarks'; key: string; parentId: string | null; items: BookmarkNode[] };
type ViewScope = 'all' | 'current';

const VIEW_SCOPE_STORAGE_KEY = 'tree-bookmarks.content-scope';

const { expandToNode } = useSidebarState();
const containerRef = ref<HTMLElement | null>(null);
const emptySelectedIds = new Set<string>();
const selectionFromScroll = ref(false);
const viewScope = ref<ViewScope>(loadViewScope());
let scrollFrame: number | null = null;
let suppressScrollSelectionUntil = 0;
let longPressTimer: number | undefined;

function findNodeById(id: string, nodes: BookmarkNode[] = props.tree): BookmarkNode | null {
  for (const node of nodes) { if (node.id === id) return node; const f = findNodeById(id, node.children); if (f) return f; }
  return null;
}

const currentFolder = computed(() => props.selectedFolderId ? findNodeById(props.selectedFolderId) : null);
const children = computed(() => currentFolder.value ? currentFolder.value.children : props.tree);
const orderedChildren = computed(() => [...children.value].sort(sortNodes));
const displayBlocks = computed(() => buildContentBlocks(props.tree));
const visibleFolderCount = computed(() => viewScope.value === 'current' ? children.value.filter(node => node.type === 'folder').length : countFolders(props.tree));
const visibleBookmarkCount = computed(() => viewScope.value === 'current' ? children.value.filter(node => node.type === 'bookmark').length : countBookmarks(props.tree));
const selectedAnchorTitle = computed(() => props.selectedFolderId ? findNodeById(props.selectedFolderId)?.title ?? null : null);
const pageTitle = computed(() => viewScope.value === 'current' && currentFolder.value ? currentFolder.value.title : '全部书签');
const isCurrentPageEmpty = computed(() => viewScope.value === 'current' ? orderedChildren.value.length === 0 : displayBlocks.value.length === 0);

const breadcrumbPath = computed(() => {
  if (!props.selectedFolderId) return [];
  function walk(id: string, nodes: BookmarkNode[], path: BookmarkNode[] = []): BookmarkNode[] | null {
    for (const n of nodes) { if (n.type !== 'folder') continue; if (n.id === id) return [...path, n]; const r = walk(id, n.children, [...path, n]); if (r) return r; }
    return null;
  }
  return walk(props.selectedFolderId, props.tree) ?? [];
});

function childSubtitle(node: BookmarkNode): string {
  if (node.type === 'folder') return folderStats(node);
  return cleanUrl(node.url || '');
}

function onCurrentItemClick(node: BookmarkNode) {
  if (node.type === 'folder') {
    emit('select-folder', node.id);
    return;
  }
  emit('open-bookmark', node);
}

onMounted(() => scrollToSelectedFolder());
onUnmounted(() => {
  if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
  clearLongPress();
});

watch(() => props.selectedFolderId, () => {
  if (selectionFromScroll.value) {
    selectionFromScroll.value = false;
    return;
  }
  scrollToSelectedFolder();
}, { flush: 'post' });
watch(displayBlocks, () => scrollToSelectedFolder(), { flush: 'post' });

function cleanUrl(url: string): string { try { const u = new URL(url); return u.host + u.pathname.replace(/\/$/, ''); } catch { return url; } }
function setViewScope(scope: ViewScope) {
  viewScope.value = scope;
  try {
    window.localStorage.setItem(VIEW_SCOPE_STORAGE_KEY, scope);
  } catch {}
}
function loadViewScope(): ViewScope {
  try {
    return window.localStorage.getItem(VIEW_SCOPE_STORAGE_KEY) === 'current' ? 'current' : 'all';
  } catch {
    return 'all';
  }
}
function folderStats(node: BookmarkNode): string {
  const bms = countBookmarks(node.children);
  const flds = node.children.filter(c => c.type === 'folder').length;
  const p: string[] = []; if (bms > 0) p.push(`${bms} 书签`); if (flds > 0) p.push(`${flds} 子文件夹`);
  return p.join(' · ') || '空';
}
function buildContentBlocks(nodes: BookmarkNode[], depth = 0, parentId: string | null = null, path: string[] = []): ContentBlock[] {
  const sorted = [...nodes].sort(sortNodes);
  const directBookmarks = sorted.filter((node) => node.type === 'bookmark');
  const blocks: ContentBlock[] = [];

  if (directBookmarks.length > 0) {
    blocks.push({ kind: 'bookmarks', key: `bookmarks-${parentId ?? 'root'}`, parentId, items: directBookmarks });
  }

  for (const node of sorted) {
    if (node.type !== 'folder') continue;
    const nextPath = [...path, node.title];
    blocks.push({ kind: 'folder', key: `folder-${node.id}`, node, depth, path: nextPath.join(' / ') });
    blocks.push(...buildContentBlocks(node.children, depth + 1, node.id, nextPath));
  }

  return blocks;
}
function sortNodes(a: BookmarkNode, b: BookmarkNode): number {
  return a.sort_order - b.sort_order || a.title.localeCompare(b.title);
}
function countBookmarks(nodes: BookmarkNode[]): number {
  return nodes.reduce((total, node) => node.type === 'bookmark' ? total + 1 : total + countBookmarks(node.children), 0);
}
function countFolders(nodes: BookmarkNode[]): number {
  return nodes.reduce((total, node) => node.type === 'folder' ? total + 1 + countFolders(node.children) : total, 0);
}
function folderAnchorId(id: string): string {
  return `folder-anchor-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}
function headingIndent(depth: number): number {
  return Math.min(depth, 2) * 14 + 8;
}
function folderHeadingClass(depth: number): string {
  if (depth === 0) return 'mt-5 text-[15px] font-semibold';
  if (depth === 1) return 'mt-3 text-[14px] font-semibold';
  return 'mt-2 text-[13px] font-medium';
}
function onContainerScroll() {
  if (viewScope.value !== 'all') return;
  if (Date.now() < suppressScrollSelectionUntil) return;
  if (scrollFrame !== null) return;

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    updateSelectedFolderFromScroll();
  });
}
function onFolderPointerDown(node: BookmarkNode, event: PointerEvent) {
  if (event.pointerType === 'mouse') return;
  clearLongPress();
  longPressTimer = window.setTimeout(() => {
    emit('contextmenu', { node, x: event.clientX, y: event.clientY });
  }, 550);
}
function clearLongPress() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = undefined;
  }
}
function updateSelectedFolderFromScroll() {
  const container = containerRef.value;
  if (!container) return;

  const headings = [...container.querySelectorAll<HTMLElement>('[data-folder-anchor]')];
  const containerTop = container.getBoundingClientRect().top;
  const activationLine = containerTop + 120;
  let activeId: string | null = null;

  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= activationLine) activeId = heading.dataset.folderAnchor ?? null;
    else break;
  }

  if (container.scrollTop < 24) activeId = null;

  if (activeId !== props.selectedFolderId) {
    if (activeId) expandToNode(findAncestorFolderIds(activeId));
    selectionFromScroll.value = true;
    emit('select-folder', activeId);
  }
}
function findAncestorFolderIds(id: string): string[] {
  function walk(nodes: BookmarkNode[], path: string[] = []): string[] | null {
    for (const node of nodes) {
      if (node.type !== 'folder') continue;
      if (node.id === id) return path;
      const found = walk(node.children, [...path, node.id]);
      if (found) return found;
    }
    return null;
  }
  return walk(props.tree) ?? [];
}
async function scrollToSelectedFolder() {
  await nextTick();
  const container = containerRef.value;
  if (!container) return;

  suppressScrollSelectionUntil = Date.now() + 700;

  if (!props.selectedFolderId || viewScope.value !== 'all') {
    container.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  document.getElementById(folderAnchorId(props.selectedFolderId))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>
