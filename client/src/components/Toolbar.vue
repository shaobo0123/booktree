<template>
  <header class="flex h-12 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4">
    <!-- Left: Logo + Breadcrumb -->
    <div class="flex min-w-0 items-center gap-3">
      <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
        <LibraryBig class="h-4 w-4" :stroke-width="2.25" />
      </div>
      <Breadcrumb
        :path="breadcrumbPath"
        :selected-folder-id="selectedFolderId"
        @select="(id: string | null) => $emit('select-breadcrumb', id)"
      />
    </div>

    <!-- Right: Search + Actions -->
    <div class="flex items-center gap-2">
      <!-- Search -->
      <label class="relative">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" :stroke-width="2" />
        <input
          :value="query"
          class="h-8 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          placeholder="搜索..."
          type="search"
          @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
          @keydown.escape="($event.target as HTMLInputElement).blur()"
        />
        <kbd class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">⌘K</kbd>
      </label>

      <!-- Divider -->
      <div class="mx-0.5 h-5 w-px bg-slate-200" />

      <!-- New Folder -->
      <button class="inline-flex items-center justify-center h-[30px] w-[30px] rounded-[7px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-slate-100 hover:text-slate-700" title="新建文件夹 (Shift+N)" @click="$emit('new-folder', selectedFolderId)">
        <FolderPlus class="h-4 w-4" :stroke-width="2" />
      </button>

      <!-- New Bookmark -->
      <button class="inline-flex items-center justify-center h-[30px] w-[30px] rounded-[7px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-slate-100 hover:text-slate-700" title="新建书签 (N)" @click="$emit('new-bookmark', selectedFolderId)">
        <BookmarkPlus class="h-4 w-4" :stroke-width="2" />
      </button>

      <!-- More actions dropdown -->
      <div class="relative">
        <button class="inline-flex items-center justify-center h-[30px] w-[30px] rounded-[7px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-slate-100 hover:text-slate-700" title="更多操作" @click="moreOpen = !moreOpen">
          <MoreHorizontal class="h-4 w-4" :stroke-width="2" />
        </button>
        <div v-if="moreOpen" class="absolute right-0 top-full mt-1 z-20 min-w-[140px] p-1 bg-white border border-slate-200 rounded-[10px] shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
          <button class="flex items-center gap-2 w-full px-2.5 py-[7px] rounded-[7px] border-none bg-transparent text-[13px] text-slate-700 cursor-pointer transition-colors hover:bg-slate-100" @click="openFilePicker(); moreOpen = false">
            <Upload class="h-3.5 w-3.5" :stroke-width="2" />
            <span>导入书签</span>
          </button>
          <button class="flex items-center gap-2 w-full px-2.5 py-[7px] rounded-[7px] border-none bg-transparent text-[13px] text-slate-700 cursor-pointer transition-colors hover:bg-slate-100" @click="$emit('export'); moreOpen = false">
            <Download class="h-3.5 w-3.5" :stroke-width="2" />
            <span>导出书签</span>
          </button>
        </div>
      </div>

      <input ref="fileInput" accept=".html,.htm,text/html" class="hidden" type="file" @change="handleFileChange" />

      <!-- Backdrop for dropdown -->
      <div v-if="moreOpen" class="fixed inset-0 z-10" @click="moreOpen = false" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  BookmarkPlus,
  Download,
  FolderPlus,
  LibraryBig,
  MoreHorizontal,
  Search,
  Upload
} from 'lucide-vue-next';
import Breadcrumb from './Breadcrumb.vue';
import type { BookmarkNode } from '../types/bookmark';

defineProps<{
  query: string;
  breadcrumbPath: BookmarkNode[];
  selectedFolderId: string | null;
}>();

const emit = defineEmits<{
  'update:query': [value: string];
  'select-breadcrumb': [id: string | null];
  'new-folder': [parentId: string | null];
  'new-bookmark': [parentId: string | null];
  'export': [];
  'import': [file: File];
}>();

const moreOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function openFilePicker() {
  fileInput.value?.click();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit('import', file);
  }
  input.value = '';
}
</script>
