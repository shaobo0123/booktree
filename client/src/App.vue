<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
    <Toolbar
      v-model:query="searchQuery"
      @create-root="openCreateRoot"
      @export="openExportModal"
      @import="handleImport"
    />

    <!-- Search Results -->
    <section v-if="searchQuery.trim()" class="border-b border-slate-100 bg-white px-5 py-3">
      <div class="mb-2.5 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-800">搜索结果</h2>
        <span class="text-xs text-slate-400">{{ searchLoading ? '搜索中...' : `${searchResults.length} 项` }}</span>
      </div>
      <div v-if="searchError" class="text-sm text-rose-500">{{ searchError }}</div>
      <div v-else-if="!searchLoading && searchResults.length === 0" class="py-3 text-center text-sm text-slate-400">
        没有匹配的书签
      </div>
      <div v-else class="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="result in searchResults"
          :key="result.id"
          class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50/60 hover:shadow-sm"
          type="button"
          @click="openBookmark(result)"
        >
          <BookmarkNodeIcon :node="result" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px] font-medium text-slate-800">{{ result.title }}</span>
            <span class="block truncate text-xs text-slate-400">{{ result.url }}</span>
          </span>
        </button>
      </div>
    </section>

    <ColumnTree
      :error="loadError"
      :loading="loading"
      :tree="tree"
      @create-bookmark="handleCreateBookmark"
      @create-folder="handleCreateFolder"
      @delete="handleDelete"
      @edit="openEdit"
      @open="openBookmark"
      @reorder="handleReorder"
    />

    <!-- Modal for root-level create and all edits -->
    <BookmarkFormModal
      v-if="modalOpen"
      :default-parent-id="modalDefaultParentId"
      :default-type="modalDefaultType"
      :initial="editingNode"
      :show-context-fields="modalShowContextFields"
      :title="modalTitle"
      :tree="tree"
      @close="closeModal"
      @delete="handleDeleteFromModal"
      @save="handleSave"
    />

    <ExportModal
      v-if="exportModalOpen"
      :default-root-id="null"
      :tree="tree"
      @close="closeExportModal"
      @export="handleExport"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import {
  createBookmark,
  deleteBookmark,
  exportBookmarks,
  getBookmarkTree,
  importBookmarks,
  refreshBookmarkIcon,
  reorderBookmarks,
  searchBookmarks,
  updateBookmark
} from './api/bookmarks';
import BookmarkNodeIcon from './components/BookmarkNodeIcon.vue';
import BookmarkFormModal from './components/BookmarkFormModal.vue';
import ColumnTree from './components/ColumnTree.vue';
import ExportModal from './components/ExportModal.vue';
import Toolbar from './components/Toolbar.vue';
import type { BookmarkFormPayload, BookmarkNode, BookmarkType } from './types/bookmark';

const tree = ref<BookmarkNode[]>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);
const modalOpen = ref(false);
const modalTitle = ref('新增');
const modalDefaultType = ref<BookmarkType>('folder');
const modalDefaultParentId = ref<string | null>(null);
const modalShowContextFields = ref(true);
const editingNode = ref<BookmarkNode | null>(null);
const exportModalOpen = ref(false);
const searchQuery = ref('');
const searchResults = ref<BookmarkNode[]>([]);
const searchLoading = ref(false);
const searchError = ref<string | null>(null);
let searchTimer: number | undefined;
let metadataRefreshTimer: number | undefined;

async function loadTree() {
  loading.value = true;
  loadError.value = null;
  try {
    tree.value = await getBookmarkTree();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function openBookmark(node: BookmarkNode) {
  if (node.url) {
    void refreshBookmarkIcon(node.id)
      .then(() => {
        window.clearTimeout(metadataRefreshTimer);
        metadataRefreshTimer = window.setTimeout(loadTree, 3500);
      })
      .catch(() => {});
    window.open(node.url, '_blank', 'noopener,noreferrer');
  }
}

// --- Root-level: modal create ---
function openCreateRoot() {
  editingNode.value = null;
  modalDefaultType.value = 'folder';
  modalDefaultParentId.value = null;
  modalShowContextFields.value = true;
  modalTitle.value = '新建环境';
  modalOpen.value = true;
}

// --- Child-level: inline create via API ---
async function handleCreateFolder(data: { parentId: string; title: string }) {
  try {
    await createBookmark({ type: 'folder', title: data.title, parent_id: data.parentId });
    await loadTree();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '创建失败');
  }
}

async function handleCreateBookmark(data: { parentId: string; title: string; url: string }) {
  try {
    await createBookmark({ type: 'bookmark', title: data.title, url: data.url || undefined, parent_id: data.parentId });
    await loadTree();
    window.clearTimeout(metadataRefreshTimer);
    metadataRefreshTimer = window.setTimeout(loadTree, 3500);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '创建失败');
  }
}

// --- Edit modal ---
function openEdit(node: BookmarkNode) {
  editingNode.value = node;
  modalDefaultType.value = node.type;
  modalDefaultParentId.value = node.parent_id;
  modalShowContextFields.value = true;
  modalTitle.value = '编辑书签';
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

async function handleSave(payload: BookmarkFormPayload) {
  try {
    if (editingNode.value) {
      await updateBookmark(editingNode.value.id, payload);
    } else {
      await createBookmark(payload);
    }
    closeModal();
    await loadTree();
    window.clearTimeout(metadataRefreshTimer);
    metadataRefreshTimer = window.setTimeout(loadTree, 3500);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '保存失败');
  }
}

async function handleDeleteFromModal(node: BookmarkNode) {
  closeModal();
  await handleDelete(node);
}

async function handleDelete(node: BookmarkNode) {
  const message = node.type === 'folder' ? `确定删除文件夹"${node.title}"及其所有子节点吗？` : `确定删除书签"${node.title}"吗？`;
  if (!window.confirm(message)) return;

  try {
    await deleteBookmark(node.id);
    await loadTree();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '删除失败');
  }
}

function findAndReorder(nodes: BookmarkNode[], parentId: string, orderedIds: string[]): boolean {
  for (const node of nodes) {
    if (node.id === parentId) {
      const idToChild = new Map(node.children.map((c) => [c.id, c]));
      node.children = orderedIds.map((id) => idToChild.get(id)!).filter(Boolean);
      return true;
    }
    if (node.children.length > 0 && findAndReorder(node.children, parentId, orderedIds)) {
      return true;
    }
  }
  return false;
}

async function handleReorder(parentId: string | null, orderedIds: string[]) {
  // Optimistic: update local tree immediately, no flash
  if (parentId) {
    findAndReorder(tree.value, parentId, orderedIds);
  } else {
    const idToNode = new Map(tree.value.map((n) => [n.id, n]));
    tree.value = orderedIds.map((id) => idToNode.get(id)!).filter(Boolean);
  }
  // Persist in background
  try {
    await reorderBookmarks(parentId, orderedIds);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '排序失败');
    await loadTree();
  }
}

async function handleImport(file: File) {
  try {
    const result = await importBookmarks(file);
    await loadTree();
    window.alert(`已导入新环境，共 ${result.imported} 个节点`);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '导入失败');
  }
}

function openExportModal() {
  exportModalOpen.value = true;
}

function closeExportModal() {
  exportModalOpen.value = false;
}

function handleExport(rootId: string | null) {
  closeExportModal();
  exportBookmarks(rootId);
}

watch(searchQuery, (value) => {
  window.clearTimeout(searchTimer);
  const query = value.trim();
  if (!query) {
    searchResults.value = [];
    searchError.value = null;
    searchLoading.value = false;
    return;
  }
  searchLoading.value = true;
  searchTimer = window.setTimeout(async () => {
    try {
      searchResults.value = await searchBookmarks(query);
      searchError.value = null;
    } catch (error) {
      searchError.value = error instanceof Error ? error.message : '搜索失败';
    } finally {
      searchLoading.value = false;
    }
  }, 250);
});

onMounted(loadTree);
</script>
