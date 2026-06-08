<template>
  <div class="flex h-full flex-col overflow-hidden bg-slate-50">
    <Toolbar
      v-model:query="searchQuery"
      :breadcrumb-path="breadcrumbPath"
      :selected-folder-id="selectedFolderId"
      :sidebar-open="sidebarOpen"
      :is-logged-in="isLoggedIn"
      :username="username"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @select-breadcrumb="(id) => $emit('select-folder', id)"
      @admin="$emit('admin')"
      @login="$emit('login')"
      @logout="$emit('logout')"
    />

    <div class="flex min-h-0 flex-1 relative">
      <!-- Sidebar: fixed mode -->
      <aside v-if="sidebarOpen && sidebarPinned" class="flex h-full flex-shrink-0 flex-col border-r border-slate-200 bg-white relative" :style="{ width: sidebarWidth + 'px' }">
        <div class="flex items-center justify-between px-3 py-3">
            <span class="text-[13px] font-semibold text-slate-700">目录</span>
            <div class="flex items-center gap-1">
              <button class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="取消固定" @click="sidebarPinned = false"><PinOff class="h-4 w-4" :stroke-width="2" /></button>
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto column-scrollbar px-1.5 pb-4">
            <Sidebar :tree="tree" :selected-id="selectedFolderId" @select="(id) => $emit('select-folder', id)" @toggle="(id) => $emit('toggle-sidebar', id)" />
          </div>
          <div class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-400 transition-colors" @mousedown="onResizeStart" />
      </aside>

      <!-- Sidebar: overlay mode -->
      <Transition name="sidebar-slide">
        <aside v-if="sidebarOpen && !sidebarPinned" class="absolute left-0 top-0 z-30 flex h-full w-[280px] flex-shrink-0 flex-col border-r border-slate-200 bg-white shadow-lg">
          <div class="flex items-center justify-between px-3 py-3">
            <span class="text-[13px] font-semibold text-slate-700">目录</span>
            <div class="flex items-center gap-1">
              <button class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="固定侧边栏" @click="sidebarPinned = true"><Pin class="h-4 w-4" :stroke-width="2" /></button>
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto column-scrollbar px-1.5 pb-4">
            <Sidebar :tree="tree" :selected-id="selectedFolderId" @select="(id) => { $emit('select-folder', id); sidebarOpen = false; }" @toggle="(id) => $emit('toggle-sidebar', id)" />
          </div>
        </aside>
      </Transition>

      <Transition name="fade">
        <div v-if="sidebarOpen && !sidebarPinned" class="absolute inset-0 z-20 bg-black/20" @click="sidebarOpen = false" />
      </Transition>

      <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <section v-if="searchQuery.trim()" class="border-b border-slate-100 bg-white px-5 py-3">
          <div class="mb-2.5 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-800">搜索结果</h2>
            <span class="text-xs text-slate-400">{{ searchLoading ? '搜索中...' : `${searchResults.length} 项` }}</span>
          </div>
          <div v-if="searchError" class="text-sm text-rose-500">{{ searchError }}</div>
          <div v-else-if="!searchLoading && searchResults.length === 0" class="py-3 text-center text-sm text-slate-400">没有匹配的书签</div>
          <div v-else class="grid max-h-44 gap-2 overflow-y-auto grid-cols-2">
            <button v-for="result in searchResults" :key="result.id" class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50/60 hover:shadow-sm" type="button" @click="$emit('open-bookmark', result)">
              <BookmarkNodeIcon :node="result" />
              <span class="min-w-0 flex-1"><span class="block truncate text-[13px] font-medium text-slate-800">{{ result.title }}</span><span class="block truncate text-xs text-slate-400">{{ result.url }}</span></span>
            </button>
          </div>
        </section>

        <ContentArea
          :tree="tree" :loading="loading" :error="error" :selected-folder-id="selectedFolderId" :view-mode="viewMode"
          :is-logged-in="isLoggedIn"
          @select-folder="(id) => { $emit('select-folder', id); if (!sidebarPinned) sidebarOpen = false; }"
          @open-bookmark="(node) => $emit('open-bookmark', node)"
          @contextmenu="(payload) => $emit('contextmenu', payload)"
        />
      </div>
    </div>

    <SearchOverlay
      v-if="searchOpen"
      @close="$emit('update:searchOpen', false)"
      @select-folder="(id) => { $emit('select-folder', id); $emit('update:searchOpen', false); }"
      @open-bookmark="(node) => { $emit('open-bookmark', node); $emit('update:searchOpen', false); }"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Pin, PinOff } from 'lucide-vue-next';
import Sidebar from '../sidebar/Sidebar.vue';
import Toolbar from './Toolbar.vue';
import ContentArea from '../content/ContentArea.vue';
import SearchOverlay from '../modal/SearchOverlay.vue';
import BookmarkNodeIcon from '../shared/BookmarkNodeIcon.vue';
import { searchBookmarks } from '../../api/bookmarks';
import type { BookmarkNode } from '../../types/bookmark';
import type { ViewMode } from '../../types/bookmark';

defineProps<{
  tree: BookmarkNode[]; loading: boolean; error: string | null;
  selectedFolderId: string | null; viewMode: ViewMode;
  breadcrumbPath: BookmarkNode[]; searchOpen: boolean;
  isLoggedIn: boolean; username: string | null;
}>();

const emit = defineEmits<{
  'select-folder': [id: string | null]; 'open-bookmark': [node: BookmarkNode];
  'reorder': [parentId: string | null, orderedIds: string[]];
  'create-folder': [parentId: string | null]; 'create-bookmark': [parentId: string | null];
  'contextmenu': [payload: { node: BookmarkNode; x: number; y: number }];
  'export': []; 'import': [file: File]; 'toggle-sidebar': [id: string]; 'clear-favicons': [];
  'permission-overview': [];
  'admin': [];
  'login': []; 'logout': [];
  'update:searchOpen': [value: boolean]; 'update:viewMode': [mode: ViewMode];
  'edit-selected': [];
  'batch-delete': [];
  'batch-permission': [permission: 'public' | 'private'];
  'paste': [targetFolderId: string | null];
}>();

const sidebarOpen = ref(true);
const sidebarPinned = ref(window.innerWidth >= 768);
const sidebarWidth = ref(280);

onMounted(() => { sidebarPinned.value = window.innerWidth >= 768; });

function onResizeStart(e: MouseEvent) {
  e.preventDefault();
  const startX = e.clientX;
  const startW = sidebarWidth.value;
  const onMove = (ev: MouseEvent) => { sidebarWidth.value = Math.min(500, Math.max(180, startW + ev.clientX - startX)); };
  const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
const searchQuery = ref('');
const searchResults = ref<BookmarkNode[]>([]);
const searchLoading = ref(false);
const searchError = ref<string | null>(null);
let searchTimer: number | undefined;

watch(searchQuery, (value) => {
  window.clearTimeout(searchTimer);
  const q = value.trim();
  if (!q) { searchResults.value = []; searchError.value = null; searchLoading.value = false; return; }
  searchLoading.value = true;
  searchTimer = window.setTimeout(async () => {
    try { searchResults.value = await searchBookmarks(q); searchError.value = null; }
    catch (e) { searchError.value = e instanceof Error ? e.message : '搜索失败'; }
    finally { searchLoading.value = false; }
  }, 250);
});
</script>

<style>
.sidebar-slide-enter-active, .sidebar-slide-leave-active { transition: transform 0.2s ease; }
.sidebar-slide-enter-from, .sidebar-slide-leave-to { transform: translateX(-100%); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
