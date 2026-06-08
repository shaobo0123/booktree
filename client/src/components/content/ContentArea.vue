<template>
  <div ref="containerRef" class="flex min-h-0 flex-1 flex-col overflow-y-auto column-scrollbar" @scroll.passive="onContainerScroll">
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
          <p class="mt-1.5 text-[13px] leading-relaxed text-slate-400">{{ isLoggedIn ? '创建第一个文件夹来组织你的书签' : '请登录后开始创建书签' }}</p>
        </div>
        <button v-if="isLoggedIn" class="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-[13px] font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-600" @click="$emit('create-folder', null)">
          <FolderPlus class="h-4 w-4" :stroke-width="2" /> 创建文件夹
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
      <!-- Header -->
      <div class="mb-6">
        <Breadcrumb :path="breadcrumbPath" :selected-folder-id="selectedFolderId" @select="(id) => $emit('select-folder', id)" />
        <div class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 class="text-lg font-bold text-slate-900">{{ currentFolderTitle }}</h1>
          <span class="text-[13px] text-slate-400">{{ headerFolderCount }} 个文件夹 · {{ headerBookmarkCount }} 个书签</span>
          <span v-if="activePage === 'overview' && selectedAnchorTitle" class="text-[13px] text-emerald-600">定位：{{ selectedAnchorTitle }}</span>
        </div>
      </div>

      <!-- Unified actions bar -->
      <div class="mb-5 flex items-start gap-2">
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div class="inline-flex h-8 rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              class="inline-flex items-center gap-[5px] rounded-md px-2.5 text-[13px] transition-colors"
              :class="activePage === 'overview' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'"
              @click="activePage = 'overview'"
            >
              <ListTree class="h-3.5 w-3.5" :stroke-width="2" /><span>全局</span>
            </button>
            <button
              class="inline-flex items-center gap-[5px] rounded-md px-2.5 text-[13px] transition-colors"
              :class="activePage === 'manage' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'"
              @click="activePage = 'manage'"
            >
              <FolderCog class="h-3.5 w-3.5" :stroke-width="2" /><span>当前</span>
            </button>
          </div>

          <button
            v-if="activePage === 'manage' && isLoggedIn"
            class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border text-[13px] font-medium cursor-pointer transition-colors"
            :class="selection.editMode.value ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'"
            @click="selection.toggleEditMode()"
          >
            <Pencil v-if="!selection.editMode.value" class="h-3.5 w-3.5" :stroke-width="2" />
            <X v-else class="h-3.5 w-3.5" :stroke-width="2" />
            <span>{{ selection.editMode.value ? '完成' : '编辑' }}</span>
          </button>

          <template v-if="activePage === 'manage' && isLoggedIn">
            <button
              class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border text-[13px] transition-colors"
              :class="selection.editMode.value ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100 hover:border-emerald-300'"
              :disabled="selection.editMode.value"
              @click="!selection.editMode.value && $emit('create-folder', selectedFolderId)"
            >
              <FolderPlus class="h-3.5 w-3.5" :stroke-width="2" /><span>新建文件夹</span>
            </button>
            <button
              class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border text-[13px] transition-colors"
              :class="selection.editMode.value ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-600 cursor-pointer hover:bg-slate-50 hover:border-slate-300'"
              :disabled="selection.editMode.value"
              @click="!selection.editMode.value && $emit('create-bookmark', selectedFolderId)"
            >
              <Plus class="h-3.5 w-3.5" :stroke-width="2" /><span>新建书签</span>
            </button>
          </template>
          <span v-if="activePage === 'manage' && !isLoggedIn" class="text-[13px] text-slate-400">只读模式</span>
          <span v-if="activePage === 'overview'" class="text-[13px] text-slate-400">全局视图仅用于浏览和定位</span>

          <button
            v-if="activePage === 'manage' && selection.clipboard.value && isLoggedIn"
            class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 text-[13px] text-amber-700 font-medium cursor-pointer transition-colors hover:bg-amber-100 hover:border-amber-300"
            @click="$emit('paste', selectedFolderId)"
          >
            <ClipboardPaste class="h-3.5 w-3.5" :stroke-width="2" />
            <span>粘贴 {{ selection.clipboard.value.ids.length }} 项</span>
          </button>

          <template v-if="activePage === 'manage' && selection.editMode.value && isLoggedIn">
            <button
              v-for="btn in editActions"
              :key="btn.label"
              class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border text-[13px] transition-colors"
              :class="btn.disabled ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' : btn.danger ? 'border-red-200 bg-red-50 text-red-600 cursor-pointer hover:bg-red-100 hover:border-red-300' : 'border-slate-200 bg-white text-slate-600 cursor-pointer hover:bg-slate-50 hover:border-slate-300'"
              :disabled="btn.disabled"
              @click="!btn.disabled && btn.action()"
            >
              <component :is="btn.icon" class="h-3.5 w-3.5" :stroke-width="2" />
              <span>{{ btn.label }}</span>
            </button>
          </template>
        </div>
      </div>

      <!-- Empty current page -->
      <div v-if="isCurrentPageEmpty" class="py-16 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Inbox class="h-6 w-6 text-slate-300" :stroke-width="2" />
        </div>
        <p class="mt-3 text-sm font-medium text-slate-500">此文件夹为空</p>
        <p class="mt-1 text-xs text-slate-400">添加文件夹或书签来填充它</p>
        <div v-if="activePage === 'manage' && isLoggedIn" class="mt-4 flex items-center justify-center gap-2">
          <button class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-[13px] text-emerald-700 cursor-pointer transition-colors hover:bg-emerald-100 hover:border-emerald-300" @click="$emit('create-folder', selectedFolderId)">
            <FolderPlus class="h-3.5 w-3.5" :stroke-width="2" /><span>新建文件夹</span>
          </button>
          <button class="inline-flex items-center gap-[5px] h-8 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-600 cursor-pointer transition-colors hover:bg-slate-50 hover:border-slate-300" @click="$emit('create-bookmark', selectedFolderId)">
            <Plus class="h-3.5 w-3.5" :stroke-width="2" /><span>新建书签</span>
          </button>
        </div>
      </div>

      <template v-else>
        <!-- Manage page: old editable style -->
        <template v-if="activePage === 'manage'">
          <div v-if="selection.editMode.value && allSelectable.length > 0" class="flex items-center justify-end gap-2 mb-2 pr-1">
            <span v-if="!selection.isEmpty.value" class="text-[13px] font-semibold text-emerald-700">已选 {{ selection.count.value }} 项</span>
            <span class="text-[13px] text-slate-500 cursor-pointer select-none" @click="toggleSelectAll">全选</span>
            <span
              class="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 cursor-pointer transition-colors"
              :class="allSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'"
              @click="toggleSelectAll"
            >
              <Check class="h-3 w-3" :stroke-width="3" />
            </span>
          </div>

          <SectionList
            v-if="orderedChildren.length > 0"
            :items="orderedChildren"
            label=""
            :subtitle-fn="childSubtitle"
            view-mode="grid"
            grid-min-width="160px"
            :draggable="isLoggedIn"
            :edit-mode="selection.editMode.value"
            :selected-ids="selection.selectedIds.value"
            @click-item="(item, e) => onManageItemClick(item, e)"
            @reorder="(ids) => $emit('reorder', selectedFolderId, ids)"
            @contextmenu="(p) => $emit('contextmenu', p)"
            @toggle-select="onToggleSelect"
          />
        </template>

        <!-- Overview page: full hierarchy, read-only -->
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
            />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { Check, ClipboardPaste, Folder, FolderCog, FolderPlus, Inbox, LibraryBig, ListTree, Lock, Pencil, Plus, Scissors, Trash2, X } from 'lucide-vue-next';
import Breadcrumb from '../layout/Breadcrumb.vue';
import SectionList from './SectionList.vue';
import { useSidebarState } from '../../composables/useSidebarState';
import { useSelection } from '../../composables/useSelection';
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
  'reorder': [parentId: string | null, orderedIds: string[]];
  'create-folder': [parentId: string | null];
  'create-bookmark': [parentId: string | null];
  'contextmenu': [payload: { node: BookmarkNode; x: number; y: number }];
  'update:viewMode': [mode: ViewMode];
  'edit-selected': [];
  'batch-delete': [];
  'batch-permission': [permission: 'public' | 'private'];
  'paste': [targetFolderId: string | null];
}>();

type ContentBlock =
  | { kind: 'folder'; key: string; node: BookmarkNode; depth: number; path: string }
  | { kind: 'bookmarks'; key: string; parentId: string | null; items: BookmarkNode[] };
type ContentPage = 'overview' | 'manage';

const ACTIVE_PAGE_STORAGE_KEY = 'tree-bookmarks.content-page';

const selection = useSelection();
const { expandToNode } = useSidebarState();
const activePage = ref<ContentPage>(loadActivePage());
const containerRef = ref<HTMLElement | null>(null);
const emptySelectedIds = new Set<string>();
const selectionFromScroll = ref(false);
let scrollFrame: number | null = null;
let suppressScrollSelectionUntil = 0;

function findNodeById(id: string, nodes: BookmarkNode[] = props.tree): BookmarkNode | null {
  for (const node of nodes) { if (node.id === id) return node; const f = findNodeById(id, node.children); if (f) return f; }
  return null;
}

const children = computed(() => !props.selectedFolderId ? props.tree : (findNodeById(props.selectedFolderId)?.children ?? []));
const folders = computed(() => children.value.filter(n => n.type === 'folder'));
const bookmarks = computed(() => children.value.filter(n => n.type === 'bookmark'));
const orderedChildren = computed(() => [...children.value].sort((a, b) => a.sort_order - b.sort_order));
const folderCount = computed(() => folders.value.length);
const bookmarkCount = computed(() => bookmarks.value.length);

const displayBlocks = computed(() => buildContentBlocks(props.tree));
const totalFolderCount = computed(() => countFolders(props.tree));
const totalBookmarkCount = computed(() => countBookmarks(props.tree));
const selectedAnchorTitle = computed(() => props.selectedFolderId ? findNodeById(props.selectedFolderId)?.title ?? null : null);
const headerFolderCount = computed(() => activePage.value === 'overview' ? totalFolderCount.value : folderCount.value);
const headerBookmarkCount = computed(() => activePage.value === 'overview' ? totalBookmarkCount.value : bookmarkCount.value);
const isCurrentPageEmpty = computed(() => activePage.value === 'overview' ? displayBlocks.value.length === 0 : orderedChildren.value.length === 0);

function childSubtitle(node: BookmarkNode): string {
  if (node.type === 'folder') return folderStats(node);
  return cleanUrl(node.url || '');
}

const allSelectable = computed(() => activePage.value === 'manage' ? [...orderedChildren.value] : []);

const allSelected = computed(() =>
  allSelectable.value.length > 0 && allSelectable.value.every(n => selection.selectedIds.value.has(n.id))
);

function toggleSelectAll() {
  if (allSelected.value) {
    selection.clear();
  } else {
    selection.selectAll(allSelectable.value);
  }
}

const editActions = computed(() => [
  { label: '修改', icon: Pencil, disabled: selection.count.value !== 1, danger: false, action: () => emit('edit-selected') },
  { label: '剪切', icon: Scissors, disabled: selection.isEmpty.value, danger: false, action: () => handleCut() },
  { label: togglePermissionLabel.value, icon: Lock, disabled: selection.isEmpty.value, danger: false, action: () => emit('batch-permission', togglePermissionTarget.value) },
  { label: '删除', icon: Trash2, disabled: selection.isEmpty.value, danger: true, action: () => emit('batch-delete') },
]);

const togglePermissionTarget = computed(() => {
  const ids = [...selection.selectedIds.value];
  const allPrivate = ids.length > 0 && ids.every(id => {
    const node = findNodeById(id);
    return node?.read_permission === 'private';
  });
  return allPrivate ? 'public' : 'private';
});

const togglePermissionLabel = computed(() => {
  return togglePermissionTarget.value === 'public' ? '设为公开' : '设为私有';
});

const currentFolderTitle = computed(() => {
  if (activePage.value === 'overview') return '全部书签';
  return !props.selectedFolderId ? '全部书签' : (findNodeById(props.selectedFolderId)?.title ?? '全部书签');
});

const breadcrumbPath = computed(() => {
  if (!props.selectedFolderId) return [];
  function walk(id: string, nodes: BookmarkNode[], path: BookmarkNode[] = []): BookmarkNode[] | null {
    for (const n of nodes) { if (n.type !== 'folder') continue; if (n.id === id) return [...path, n]; const r = walk(id, n.children, [...path, n]); if (r) return r; }
    return null;
  }
  return walk(props.selectedFolderId, props.tree) ?? [];
});

function onManageItemClick(item: BookmarkNode, event?: MouseEvent) {
  if (selection.editMode.value) {
    onToggleSelect(item.id, event);
  } else if (selection.isEmpty.value && !(event?.ctrlKey || event?.metaKey || event?.shiftKey)) {
    if (item.type === 'folder') {
      emit('select-folder', item.id);
    } else {
      emit('open-bookmark', item);
    }
  } else {
    onToggleSelect(item.id, event);
  }
}

function onToggleSelect(id: string, event?: MouseEvent) {
  const allIds = allSelectable.value.map(n => n.id);
  if (event?.shiftKey && selection.lastClickedId.value) {
    selection.selectRange(allIds, event);
  } else {
    selection.toggle(id, event);
  }
}

function handleCut() {
  selection.cut();
  selection.exitEditMode();
}

// --- Keyboard shortcuts ---
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    selection.exitEditMode();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag !== 'input' && tag !== 'textarea' && !target.isContentEditable && activePage.value === 'manage') {
      e.preventDefault();
      selection.selectAll(allSelectable.value);
    }
  }
  if (e.key === 'Delete' && activePage.value === 'manage' && !selection.isEmpty.value && props.isLoggedIn) {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag !== 'input' && tag !== 'textarea' && !target.isContentEditable) {
      e.preventDefault();
      emit('batch-delete');
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  if (scrollFrame !== null) {
    window.cancelAnimationFrame(scrollFrame);
  }
});

watch(activePage, (page) => {
  saveActivePage(page);
  selection.exitEditMode();
  selection.clear();
  if (page === 'overview') scrollToSelectedFolder();
});
watch(() => props.selectedFolderId, () => {
  if (selectionFromScroll.value) {
    selectionFromScroll.value = false;
    return;
  }
  scrollToSelectedFolder();
}, { flush: 'post' });
watch(displayBlocks, () => scrollToSelectedFolder(), { flush: 'post' });

// --- Shared helpers ---
function cleanUrl(url: string): string { try { const u = new URL(url); return u.host + u.pathname.replace(/\/$/, ''); } catch { return url; } }
function loadActivePage(): ContentPage {
  try {
    const stored = window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);
    return stored === 'manage' || stored === 'overview' ? stored : 'overview';
  } catch {
    return 'overview';
  }
}
function saveActivePage(page: ContentPage) {
  try {
    window.localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, page);
  } catch {
    // Ignore storage failures; the view still works for the current session.
  }
}
function folderStats(node: BookmarkNode): string {
  const bms = countBookmarks(node.children);
  const flds = node.children.filter(c => c.type === 'folder').length;
  const p: string[] = []; if (bms > 0) p.push(`${bms} 书签`); if (flds > 0) p.push(`${flds} 子文件夹`);
  return p.join(' · ') || '空';
}
function buildContentBlocks(nodes: BookmarkNode[], depth = 0, parentId: string | null = null, path: string[] = []): ContentBlock[] {
  const sorted = [...nodes].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  const directBookmarks = sorted.filter((node) => node.type === 'bookmark');
  const blocks: ContentBlock[] = [];

  if (directBookmarks.length > 0) {
    blocks.push({
      kind: 'bookmarks',
      key: `bookmarks-${parentId ?? 'root'}`,
      parentId,
      items: directBookmarks
    });
  }

  for (const node of sorted) {
    if (node.type !== 'folder') continue;
    const nextPath = [...path, node.title];
    blocks.push({
      kind: 'folder',
      key: `folder-${node.id}`,
      node,
      depth,
      path: nextPath.join(' / ')
    });
    blocks.push(...buildContentBlocks(node.children, depth + 1, node.id, nextPath));
  }

  return blocks;
}
function countBookmarks(nodes: BookmarkNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.type === 'bookmark') return total + 1;
    return total + countBookmarks(node.children);
  }, 0);
}
function countFolders(nodes: BookmarkNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.type !== 'folder') return total;
    return total + 1 + countFolders(node.children);
  }, 0);
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
  if (activePage.value !== 'overview' || Date.now() < suppressScrollSelectionUntil) return;
  if (scrollFrame !== null) return;

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    updateSelectedFolderFromScroll();
  });
}
function updateSelectedFolderFromScroll() {
  const container = containerRef.value;
  if (!container || activePage.value !== 'overview') return;

  const headings = [...container.querySelectorAll<HTMLElement>('[data-folder-anchor]')];
  const containerTop = container.getBoundingClientRect().top;
  const activationLine = containerTop + 120;
  let activeId: string | null = null;

  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= activationLine) {
      activeId = heading.dataset.folderAnchor ?? null;
    } else {
      break;
    }
  }

  if (container.scrollTop < 24) {
    activeId = null;
  }

  if (activeId !== props.selectedFolderId) {
    if (activeId) {
      expandToNode(findAncestorFolderIds(activeId));
    }
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
  if (!container || activePage.value !== 'overview') return;

  suppressScrollSelectionUntil = Date.now() + 700;

  if (!props.selectedFolderId) {
    container.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const target = document.getElementById(folderAnchorId(props.selectedFolderId));
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>
