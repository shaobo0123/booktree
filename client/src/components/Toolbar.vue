<template>
  <header class="flex flex-col gap-2 border-b border-slate-100 bg-white/90 px-3 py-2 sm:px-5 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-900/15 sm:h-9 sm:w-9">
          <LibraryBig class="h-4 w-4 sm:h-5 sm:w-5" :stroke-width="2.25" />
        </div>
        <span class="truncate text-sm font-semibold text-slate-950 sm:text-base">Tree Bookmarks</span>
      </div>

      <div class="flex flex-shrink-0 items-center gap-1.5 xl:hidden">
        <button class="toolbar-primary" type="button" @click="$emit('create-root')">
          <Plus class="h-4 w-4" :stroke-width="2.25" />
          <span class="hidden sm:inline">新建环境</span>
        </button>
        <button class="toolbar-button" type="button" @click="openFilePicker">
          <Upload class="h-4 w-4" :stroke-width="2.25" />
          <span class="hidden sm:inline">导入环境</span>
        </button>
        <button class="toolbar-button" type="button" @click="$emit('export')">
          <Download class="h-4 w-4" :stroke-width="2.25" />
          <span class="hidden sm:inline">导出</span>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2 xl:flex-row xl:items-center">
      <div class="hidden flex-wrap items-center gap-2 xl:flex">
        <button class="toolbar-primary" type="button" @click="$emit('create-root')">
          <Plus class="h-4 w-4" :stroke-width="2.25" />
          <span>新建环境</span>
        </button>
        <button class="toolbar-button" type="button" @click="openFilePicker">
          <Upload class="h-4 w-4" :stroke-width="2.25" />
          <span>导入环境</span>
        </button>
        <button class="toolbar-button" type="button" @click="$emit('export')">
          <Download class="h-4 w-4" :stroke-width="2.25" />
          <span>导出</span>
        </button>
      </div>

      <label class="relative block min-w-0 xl:min-w-[240px]">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" :stroke-width="2.25" />
        <input
          :value="query"
          class="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:h-9"
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
import { Download, LibraryBig, Plus, Search, Upload } from 'lucide-vue-next';

defineProps<{
  query: string;
}>();

const emit = defineEmits<{
  'update:query': [value: string];
  'create-root': [];
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
.toolbar-primary {
  @apply inline-flex h-8 w-8 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-[13px] font-medium text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700 active:bg-emerald-800 sm:h-9 sm:w-auto sm:px-3;
}

.toolbar-button {
  @apply inline-flex h-8 w-8 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:bg-slate-100 sm:h-9 sm:w-auto sm:px-3;
}
</style>
