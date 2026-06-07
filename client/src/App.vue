<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
    <MainLayout
      :tree="tree"
      :loading="loading"
      :error="loadError"
      :selected-folder-id="selectedFolderId"
      :view-mode="viewMode"
      :breadcrumb-path="breadcrumbPath"
      :search-open="searchOpen"
      :is-logged-in="isLoggedIn"
      :username="username"
      @select-folder="selectFolder"
      @open-bookmark="openBookmark"
      @reorder="handleReorder"
      @create-folder="handleCreateFolderInline"
      @create-bookmark="handleCreateBookmarkInline"
      @contextmenu="handleContextMenu"
      @export="openExportModal"
      @import="handleImport"
      @toggle-sidebar="toggleSidebarExpanded"
      @clear-favicons="handleClearFavicons"
      @login="handleOpenLoginModal"
      @logout="handleLogout"
      @update:searchOpen="(val: boolean) => searchOpen = val"
      @update:viewMode="(mode: ViewMode) => viewMode = mode"
      @edit-selected="handleEditSelected"
      @batch-delete="handleBatchDelete"
      @paste="handlePaste"
    />

    <!-- Context Menu -->
    <Teleport to="body">
      <div v-if="contextMenuVisible" class="fixed inset-0 z-[9998]" @click="contextMenuVisible = false" @contextmenu.prevent="contextMenuVisible = false" />
      <div v-if="contextMenuVisible" class="fixed z-[9999] min-w-[160px] p-1 bg-white border border-slate-200 rounded-[10px] shadow-[0_8px_30px_rgba(15,23,42,0.12)] flex flex-col" :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }" @click.stop>
        <template v-for="(item, index) in contextMenuItems" :key="index">
          <div v-if="item.separator" class="h-px bg-slate-200 mx-2 my-1" />
          <button class="flex items-center gap-2 px-2.5 py-[7px] border-none bg-transparent rounded-[7px] text-[13px] text-slate-700 cursor-pointer transition-colors hover:bg-slate-100" :class="{ 'text-red-500 hover:bg-red-50': item.danger }" @click="item.action(); contextMenuVisible = false">
            <component :is="item.icon" v-if="item.icon" class="h-3.5 w-3.5" :stroke-width="2" />
            <span class="flex-1 text-left">{{ item.label }}</span>
            <span v-if="item.shortcut" class="text-[11px] text-slate-400">{{ item.shortcut }}</span>
          </button>
        </template>
      </div>
    </Teleport>

    <!-- Bookmark Form Modal -->
    <BookmarkFormModal
      v-if="modalOpen"
      :default-parent-id="modalDefaultParentId"
      :default-type="modalDefaultType"
      :initial="editingNode"
      :show-context-fields="modalShowContextFields"
      :title="modalTitle"
      @close="closeModal"
      @delete="handleDeleteFromModal"
      @save="handleSave"
    />

    <!-- Export Modal -->
    <ExportModal
      v-if="exportModalOpen"
      :default-root-id="null"
      :tree="tree"
      @close="closeExportModal"
      @export="handleExport"
    />

    <!-- Login Modal -->
    <LoginModal
      v-if="loginModalOpen"
      :error="loginError"
      :loading="loginLoading"
      @close="closeLoginModal"
      @login="handleLogin"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Copy,
  ExternalLink,
  LogIn,
  LogOut,
  Pencil,
  Scissors,
  Trash2
} from 'lucide-vue-next';
import {
  batchDeleteBookmarks,
  batchMoveBookmarks,
  clearFavicons,
  createBookmark,
  deleteBookmark,
  exportBookmarks,
  getBookmarkTree,
  importBookmarks,
  reorderBookmarks,
  updateBookmark
} from './api/bookmarks';
import MainLayout from './components/layout/MainLayout.vue';
import BookmarkFormModal from './components/modal/BookmarkFormModal.vue';
import ExportModal from './components/modal/ExportModal.vue';
import LoginModal from './components/modal/LoginModal.vue';
import { useAuth } from './composables/useAuth';
import { useSidebarState } from './composables/useSidebarState';
import { provideSelection } from './composables/useSelection';
import { useKeyboard } from './composables/useKeyboard';
import type { BookmarkFormPayload, BookmarkNode, BookmarkType, ViewMode } from './types/bookmark';
interface MenuItem { label: string; icon?: any; shortcut?: string; danger?: boolean; separator?: boolean; action: () => void; }

// --- Tree state ---
const tree = ref<BookmarkNode[]>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);
const route = useRoute();
const router = useRouter();

const selectedFolderId = ref<string | null>(route.params.id as string ?? null);
const viewMode = ref<ViewMode>('list');
const searchOpen = ref(false);

// --- Selection ---
const selection = provideSelection();

// --- Auth ---
const { isLoggedIn, username, loginModalOpen, initAuth, login, logout, openLoginModal, closeLoginModal } = useAuth();
const loginLoading = ref(false);
const loginError = ref<string | null>(null);

// Sync URL ← selectedFolderId
watch(selectedFolderId, (id) => {
  selection.clear();
  if (!id) { if (route.path !== '/') router.replace('/'); return; }
  const node = findNodeInTree(tree.value, id);
  const title = node ? encodeURIComponent(node.title) : '';
  const target = title ? `/folder/${id}/${title}` : `/folder/${id}`;
  if (route.path !== target) router.replace(target);
});

function findNodeInTree(nodes: BookmarkNode[], id: string): BookmarkNode | null {
  for (const n of nodes) { if (n.id === id) return n; const f = findNodeInTree(n.children, id); if (f) return f; }
  return null;
}

// Sync selectedFolderId ← URL (back/forward navigation)
watch(() => route.params.id, (id) => {
  selectedFolderId.value = (id as string) ?? null;
});

// --- Sidebar ---
const { toggleExpanded } = useSidebarState();

function toggleSidebarExpanded(id: string) {
  toggleExpanded(id);
}

// --- Breadcrumb ---
const breadcrumbPath = computed(() => {
  if (!selectedFolderId.value) return [];

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

  return findPath(selectedFolderId.value, tree.value) ?? [];
});

function selectFolder(id: string | null) {
  selection.exitEditMode();
  selectedFolderId.value = id;
}

// --- Tree loading ---
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

// --- Auth actions ---
function handleOpenLoginModal() {
  loginError.value = null;
  openLoginModal();
}

async function handleLogin(password: string) {
  loginLoading.value = true;
  loginError.value = null;
  try {
    await login(password);
    closeLoginModal();
    await loadTree(); // reload tree with full permissions
  } catch (e) {
    loginError.value = e instanceof Error ? e.message : '登录失败';
  } finally {
    loginLoading.value = false;
  }
}

async function handleLogout() {
  logout();
  await loadTree(); // reload tree with public-only filter
}

// --- Bookmark actions ---
function openBookmark(node: BookmarkNode) {
  if (node.url) window.open(node.url, '_blank', 'noopener,noreferrer');
}

// --- Create ---
function handleCreateFolderInline(parentId: string | null) {
  editingNode.value = null;
  modalDefaultType.value = 'folder';
  modalDefaultParentId.value = parentId ?? selectedFolderId.value;
  modalShowContextFields.value = false;
  modalTitle.value = '新建文件夹';
  modalOpen.value = true;
}

function handleCreateBookmarkInline(parentId: string | null) {
  editingNode.value = null;
  modalDefaultType.value = 'bookmark';
  modalDefaultParentId.value = parentId ?? selectedFolderId.value;
  modalShowContextFields.value = false;
  modalTitle.value = '新建书签';
  modalOpen.value = true;
}

// --- Edit modal ---
const modalOpen = ref(false);
const modalTitle = ref('新建');
const modalDefaultType = ref<BookmarkType>('folder');
const modalDefaultParentId = ref<string | null>(null);
const modalShowContextFields = ref(true);
const editingNode = ref<BookmarkNode | null>(null);

function openEdit(node: BookmarkNode) {
  editingNode.value = node;
  modalDefaultType.value = node.type;
  modalDefaultParentId.value = node.parent_id;
  modalShowContextFields.value = false;
  modalTitle.value = node.type === 'folder' ? '文件夹编辑' : '书签编辑';
  modalOpen.value = true;
}

function selectForEdit(node: BookmarkNode) {
  if (node.parent_id !== selectedFolderId.value) {
    selectFolder(node.parent_id);
  }
  selection.enterEditMode();
  selection.select(node.id);
}

function cutToClipboard(node: BookmarkNode) {
  if (node.parent_id !== selectedFolderId.value) {
    selectFolder(node.parent_id);
  }
  selection.clear();
  selection.select(node.id);
  selection.cut();
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
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '保存失败');
  }
}

async function handleDeleteFromModal(node: BookmarkNode) {
  closeModal();
  await handleDelete(node);
}

// --- Delete ---
async function handleDelete(node: BookmarkNode) {
  const message =
    node.type === 'folder'
      ? `确定删除文件夹"${node.title}"及其所有子节点吗？`
      : `确定删除书签"${node.title}"吗？`;
  if (!window.confirm(message)) return;

  try {
    await deleteBookmark(node.id);
    selection.clear();
    await loadTree();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '删除失败');
  }
}

// --- Batch operations ---
async function handleBatchDelete() {
  const ids = [...selection.selectedIds.value];
  if (ids.length === 0) return;
  const message = `确定删除选中的 ${ids.length} 个项目及其子节点吗？此操作不可撤销。`;
  if (!window.confirm(message)) return;

  try {
    await batchDeleteBookmarks(ids);
    selection.exitEditMode();
    await loadTree();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '批量删除失败');
  }
}

async function handlePaste(targetFolderId: string | null) {
  const cb = selection.clipboard.value;
  if (!cb || cb.ids.length === 0) return;

  try {
    await batchMoveBookmarks(cb.ids, targetFolderId);
    selection.clearClipboard();
    await loadTree();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '粘贴失败');
  }
}

function handleEditSelected() {
  const ids = [...selection.selectedIds.value];
  if (ids.length !== 1) return;
  const node = findNodeInTree(tree.value, ids[0]);
  if (node) {
    selection.exitEditMode();
    openEdit(node);
  }
}

// --- Reorder ---
function applyReorder(
  nodes: BookmarkNode[],
  parentId: string,
  orderedIds: string[]
): BookmarkNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      const idToChild = new Map(node.children.map((c) => [c.id, c]));
      return {
        ...node,
        children: orderedIds
          .map((id, index) => {
            const child = idToChild.get(id);
            return child ? { ...child, sort_order: (index + 1) * 10 } : null;
          })
          .filter(Boolean) as BookmarkNode[]
      };
    }
    if (node.children.length > 0) {
      return { ...node, children: applyReorder(node.children, parentId, orderedIds) };
    }
    return node;
  });
}

async function handleReorder(parentId: string | null, orderedIds: string[]) {
  if (parentId) {
    tree.value = applyReorder(tree.value, parentId, orderedIds);
  } else {
    const idToNode = new Map(tree.value.map((n) => [n.id, n]));
    tree.value = orderedIds
      .map((id, index) => {
        const node = idToNode.get(id);
        return node ? { ...node, sort_order: (index + 1) * 10 } : null;
      })
      .filter(Boolean) as BookmarkNode[];
  }
  try {
    await reorderBookmarks(parentId, orderedIds);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '排序失败');
    await loadTree();
  }
}

// --- Context menu ---
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuNode = ref<BookmarkNode | null>(null);

const contextMenuItems = computed<MenuItem[]>(() => {
  const node = contextMenuNode.value;
  if (!node) return [];

  const items: MenuItem[] = [];

  if (isLoggedIn.value) {
    items.push({
      label: '编辑',
      icon: Pencil,
      action: () => { if (node) selectForEdit(node); }
    });
    items.push({
      label: '剪切',
      icon: Scissors,
      action: () => { if (node) cutToClipboard(node); }
    });
  }

  if (node.type === 'bookmark') {
    items.push({
      label: '打开链接',
      icon: ExternalLink,
      action: () => {
        if (node) openBookmark(node);
      }
    });
    items.push({
      label: '复制链接',
      icon: Copy,
      action: () => {
        if (node.url) {
          navigator.clipboard.writeText(node.url).catch(() => {});
        }
      }
    });
  }

  if (isLoggedIn.value) {
    items.push({ separator: true, label: '', action: () => {} });

    items.push({
      label: '删除',
      icon: Trash2,
      danger: true,
      action: () => {
        if (node) handleDelete(node);
      }
    });
  }

  return items;
});

function handleContextMenu(payload: { node: BookmarkNode; x: number; y: number }) {
  contextMenuNode.value = payload.node;
  contextMenuX.value = payload.x;
  contextMenuY.value = payload.y;
  contextMenuVisible.value = true;
}

// --- Import / Export ---
const exportModalOpen = ref(false);

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

async function handleImport(file: File) {
  try {
    const result = await importBookmarks(file);
    await loadTree();
    window.alert(`已导入，共 ${result.imported} 个节点`);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '导入失败');
  }
}

async function handleClearFavicons() {
  try {
    await clearFavicons();
    await loadTree();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '清除失败');
  }
}

// --- Drag-drop move from content to sidebar ---
function handleBookmarkDrop(e: Event) {
  const detail = (e as CustomEvent).detail as {
    draggedId: string;
    targetFolderId: string;
  };
  if (detail.draggedId && detail.targetFolderId) {
    updateBookmark(detail.draggedId, {
      parent_id: detail.targetFolderId
    })
      .then(() => loadTree())
      .catch((err) =>
        window.alert(err instanceof Error ? err.message : '移动失败')
      );
  }
}

// --- Keyboard shortcuts ---
const shortcutsEnabled = ref(true);
useKeyboard(
  [
    {
      key: 'k',
      meta: true,
      handler: () => {
        searchOpen.value = true;
      }
    },
    {
      key: 'k',
      ctrl: true,
      handler: () => {
        searchOpen.value = true;
      }
    },
    {
      key: 'n',
      handler: () => {
        if (!isLoggedIn.value) return;
        handleCreateBookmarkInline(selectedFolderId.value);
      }
    },
    {
      key: 'N',
      shift: true,
      handler: () => {
        if (!isLoggedIn.value) return;
        handleCreateFolderInline(selectedFolderId.value);
      }
    },
    {
      key: 'Delete',
      handler: () => {
        if (!isLoggedIn.value) return;
        if (contextMenuNode.value) {
          handleDelete(contextMenuNode.value);
        }
      }
    },
    {
      key: 'Escape',
      handler: () => {
        contextMenuVisible.value = false;
        modalOpen.value = false;
        exportModalOpen.value = false;
      }
    }
  ],
  shortcutsEnabled
);

// --- Lifecycle ---
onMounted(async () => {
  await initAuth();
  loadTree();
  window.addEventListener('bookmark-drop', handleBookmarkDrop);
});

onUnmounted(() => {
  window.removeEventListener('bookmark-drop', handleBookmarkDrop);
});
</script>
