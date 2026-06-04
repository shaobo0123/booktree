<template>
  <header class="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
        <LibraryBig class="h-5 w-5" />
      </div>
      <div>
        <h1 class="text-lg font-semibold text-slate-950">Tree Bookmarks</h1>
        <p class="text-xs text-slate-500">Column tree bookmark manager</p>
      </div>
    </div>

    <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div class="flex flex-wrap items-center gap-2">
        <button class="toolbar-button bg-emerald-600 text-white hover:bg-emerald-700" type="button" @click="$emit('create-root')">
          <Plus class="h-4 w-4" />
          <span>新建总书签</span>
        </button>
        <button class="toolbar-button" type="button" @click="$emit('create-folder')">
          <FolderPlus class="h-4 w-4" />
          <span>新建文件夹</span>
        </button>
        <button class="toolbar-button" type="button" @click="$emit('create-bookmark')">
          <BookmarkPlus class="h-4 w-4" />
          <span>新建书签</span>
        </button>
        <button class="toolbar-button" type="button" @click="openFilePicker">
          <Upload class="h-4 w-4" />
          <span>导入</span>
        </button>
        <button class="toolbar-button" type="button" @click="$emit('export')">
          <Download class="h-4 w-4" />
          <span>导出</span>
        </button>
      </div>

      <label class="relative block min-w-[260px]">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          :value="query"
          class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          placeholder="搜索标题或 URL"
          type="search"
          @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <input ref="fileInput" accept=".html,.htm,text/html" class="hidden" type="file" @change="handleFileChange" />
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { BookmarkPlus, Download, FolderPlus, LibraryBig, Plus, Search, Upload } from 'lucide-vue-next';

defineProps<{
  query: string;
}>();

const emit = defineEmits<{
  'update:query': [value: string];
  'create-root': [];
  'create-folder': [];
  'create-bookmark': [];
  import: [file: File];
  export: [];
}>();

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

<style scoped>
.toolbar-button {
  @apply inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60;
}
</style>
