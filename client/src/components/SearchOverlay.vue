<template>
  <Teleport to="body">
    <div class="search-overlay-backdrop" @click="$emit('close')">
      <div class="search-overlay-panel" @click.stop>
        <!-- Search input -->
        <div class="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search class="h-5 w-5 flex-shrink-0 text-slate-400" :stroke-width="2" />
          <input
            ref="inputRef"
            v-model="query"
            class="h-12 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="搜索书签、文件夹、URL..."
            type="text"
            @keydown.escape="$emit('close')"
            @keydown.arrow-down.prevent="moveSelection(1)"
            @keydown.arrow-up.prevent="moveSelection(-1)"
            @keydown.enter.prevent="activateSelection"
          />
          <kbd class="search-kbd">Esc</kbd>
        </div>

        <!-- Results -->
        <div class="max-h-80 overflow-y-auto column-scrollbar p-2">
          <!-- Loading -->
          <div v-if="loading" class="flex items-center justify-center py-8">
            <div class="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
          </div>

          <!-- Empty -->
          <div v-else-if="!query.trim()" class="py-8 text-center text-[13px] text-slate-400">
            输入关键词开始搜索
          </div>

          <!-- No results -->
          <div v-else-if="results.length === 0" class="py-8 text-center">
            <p class="text-[13px] text-slate-500">没有找到匹配的结果</p>
            <p class="mt-1 text-[12px] text-slate-400">试试其他关键词</p>
          </div>

          <!-- Results -->
          <div v-else class="flex flex-col gap-0.5">
            <!-- Folders -->
            <template v-if="folderResults.length > 0">
              <div class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">文件夹</div>
              <button
                v-for="(item, index) in folderResults"
                :key="item.id"
                class="search-result-item"
                :class="selectedIndex === index ? 'search-result-selected' : ''"
                @click="selectFolder(item.id)"
              >
                <Folder class="h-4 w-4 flex-shrink-0 text-amber-500" :stroke-width="2" />
                <span class="min-w-0 flex-1 truncate text-left text-[13px]">{{ item.title }}</span>
                <span class="flex-shrink-0 text-[12px] text-slate-400">文件夹</span>
              </button>
            </template>

            <!-- Bookmarks -->
            <template v-if="bookmarkResults.length > 0">
              <div class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">书签</div>
              <button
                v-for="(item, index) in bookmarkResults"
                :key="item.id"
                class="search-result-item"
                :class="selectedIndex === folderResults.length + index ? 'search-result-selected' : ''"
                @click="openBookmark(item)"
              >
                <BookmarkNodeIcon :node="item" />
                <div class="min-w-0 flex-1 text-left">
                  <span class="block truncate text-[13px]">{{ item.title }}</span>
                  <span class="block truncate text-[12px] text-slate-400">{{ cleanUrl(item.url || '') }}</span>
                </div>
                <span class="flex-shrink-0 text-[12px] text-slate-400">书签</span>
              </button>
            </template>
          </div>
        </div>

        <!-- Footer hint -->
        <div class="flex items-center gap-4 border-t border-slate-100 px-4 py-2">
          <span class="text-[11px] text-slate-400">
            <kbd class="hint-kbd">↑↓</kbd> 导航
          </span>
          <span class="text-[11px] text-slate-400">
            <kbd class="hint-kbd">Enter</kbd> 打开
          </span>
          <span class="text-[11px] text-slate-400">
            <kbd class="hint-kbd">Esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Folder, Search } from 'lucide-vue-next';
import { searchBookmarks } from '../api/bookmarks';
import BookmarkNodeIcon from './BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../types/bookmark';

const emit = defineEmits<{
  close: [];
  'select-folder': [id: string];
  'open-bookmark': [node: BookmarkNode];
}>();

const query = ref('');
const results = ref<BookmarkNode[]>([]);
const loading = ref(false);
const selectedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

let searchTimer: number | undefined;

const folderResults = computed(() =>
  results.value.filter((n) => n.type === 'folder')
);

const bookmarkResults = computed(() =>
  results.value.filter((n) => n.type === 'bookmark')
);

watch(query, (value) => {
  window.clearTimeout(searchTimer);
  selectedIndex.value = 0;
  const q = value.trim();
  if (!q) {
    results.value = [];
    return;
  }
  loading.value = true;
  searchTimer = window.setTimeout(async () => {
    try {
      results.value = await searchBookmarks(q);
    } catch {
      results.value = [];
    } finally {
      loading.value = false;
    }
  }, 250);
});

function moveSelection(dir: number) {
  const total = results.value.length;
  if (total === 0) return;
  selectedIndex.value = (selectedIndex.value + dir + total) % total;
}

function activateSelection() {
  const item = results.value[selectedIndex.value];
  if (!item) return;
  if (item.type === 'folder') {
    selectFolder(item.id);
  } else {
    openBookmark(item);
  }
}

function selectFolder(id: string) {
  emit('select-folder', id);
}

function openBookmark(node: BookmarkNode) {
  emit('open-bookmark', node);
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

onMounted(() => {
  nextTick(() => {
    inputRef.value?.focus();
  });
});
</script>

<style scoped>
.search-overlay-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: center;
  padding-top: 15vh;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.15s ease-out;
}
.search-overlay-panel {
  width: 560px;
  max-height: 480px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 80px -12px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  transition: background-color 0.1s ease;
}
.search-result-item:hover {
  background: #f1f5f9;
}
.search-result-selected {
  background: #ecfdf5;
}
.search-kbd {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 6px;
  border-radius: 5px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-family: inherit;
  font-size: 11px;
  color: #94a3b8;
}
.hint-kbd {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-family: inherit;
  font-size: 10px;
  color: #94a3b8;
}
</style>
