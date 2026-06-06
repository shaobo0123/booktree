<template>
  <div class="flex h-full overflow-hidden bg-slate-50">
    <!-- Left Sidebar -->
    <aside
      class="flex w-[260px] flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white"
    >
      <div class="flex items-center justify-between px-3 py-3">
        <span class="text-[13px] font-semibold text-slate-700">目录</span>
        <button
          class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="新建根级文件夹"
          @click="$emit('create-folder', null)"
        >
          <FolderPlus class="h-4 w-4" :stroke-width="2" />
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto column-scrollbar px-1.5 pb-4">
        <Sidebar
          :tree="tree"
          :selected-id="selectedFolderId"
          @select="(id) => $emit('select-folder', id)"
          @toggle="(id: string) => $emit('toggle-sidebar', id)"
          @contextmenu="(payload) => $emit('contextmenu', payload)"
        />
      </div>
    </aside>

    <!-- Right Content -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Toolbar -->
      <Toolbar
        v-model:query="searchQuery"
        :breadcrumb-path="breadcrumbPath"
        :selected-folder-id="selectedFolderId"
        @export="$emit('export')"
        @import="(file) => $emit('import', file)"
        @select-breadcrumb="(id) => $emit('select-folder', id)"
        @new-folder="(parentId) => $emit('create-folder', parentId)"
        @new-bookmark="(parentId) => $emit('create-bookmark', parentId)"
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
            @click="$emit('open-bookmark', result)"
          >
            <BookmarkNodeIcon :node="result" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13px] font-medium text-slate-800">{{ result.title }}</span>
              <span class="block truncate text-xs text-slate-400">{{ result.url }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- Main Content Area -->
      <ContentArea
        :tree="tree"
        :loading="loading"
        :error="error"
        :selected-folder-id="selectedFolderId"
        :view-mode="viewMode"
        @select-folder="(id) => $emit('select-folder', id)"
        @open-bookmark="(node) => $emit('open-bookmark', node)"
        @edit="(node) => $emit('edit', node)"
        @delete="(node) => $emit('delete', node)"
        @reorder="(parentId, ids) => $emit('reorder', parentId, ids)"
        @update:viewMode="(mode) => $emit('update:viewMode', mode)"
        @create-folder="(parentId) => $emit('create-folder', parentId)"
        @create-bookmark="(parentId) => $emit('create-bookmark', parentId)"
        @contextmenu="(payload) => $emit('contextmenu', payload)"
      />
    </div>

    <!-- Search Overlay -->
    <SearchOverlay
      v-if="searchOpen"
      @close="$emit('update:searchOpen', false)"
      @select-folder="(id) => { $emit('select-folder', id); $emit('update:searchOpen', false); }"
      @open-bookmark="(node) => { $emit('open-bookmark', node); $emit('update:searchOpen', false); }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { FolderPlus } from 'lucide-vue-next';
import Sidebar from './Sidebar.vue';
import Toolbar from './Toolbar.vue';
import ContentArea from './ContentArea.vue';
import SearchOverlay from './SearchOverlay.vue';
import BookmarkNodeIcon from './BookmarkNodeIcon.vue';
import { searchBookmarks } from '../api/bookmarks';
import type { BookmarkNode } from '../types/bookmark';
import type { ViewMode } from '../types/bookmark';

defineProps<{
  tree: BookmarkNode[];
  loading: boolean;
  error: string | null;
  selectedFolderId: string | null;
  viewMode: ViewMode;
  breadcrumbPath: BookmarkNode[];
  searchOpen: boolean;
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
  'export': [];
  'import': [file: File];
  'toggle-sidebar': [id: string];
  'update:searchOpen': [value: boolean];
  'update:viewMode': [mode: ViewMode];
}>();
const searchQuery = ref('');
const searchResults = ref<BookmarkNode[]>([]);
const searchLoading = ref(false);
const searchError = ref<string | null>(null);
let searchTimer: number | undefined;

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
    } catch (e) {
      searchError.value = e instanceof Error ? e.message : '搜索失败';
    } finally {
      searchLoading.value = false;
    }
  }, 250);
});
</script>
