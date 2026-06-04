<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 py-6">
    <form class="w-full max-w-lg rounded-lg bg-white shadow-soft" @submit.prevent="handleSubmit">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 class="text-base font-semibold text-slate-950">{{ title }}</h2>
        <button class="icon-button" type="button" title="关闭" @click="$emit('close')">
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="space-y-4 px-5 py-5">
        <label class="form-label">
          <span>类型</span>
          <select v-model="form.type" :disabled="Boolean(initial)" class="form-control">
            <option value="folder">文件夹</option>
            <option value="bookmark">书签</option>
          </select>
        </label>

        <label class="form-label">
          <span>标题</span>
          <input v-model.trim="form.title" class="form-control" required placeholder="输入标题" />
        </label>

        <label v-if="form.type === 'bookmark'" class="form-label">
          <span>URL</span>
          <input v-model.trim="form.url" class="form-control" placeholder="https://example.com" type="url" />
        </label>

        <label class="form-label">
          <span>父级</span>
          <select v-model="form.parent_id" class="form-control">
            <option :value="null">根级</option>
            <option v-for="folder in parentOptions" :key="folder.id" :value="folder.id">
              {{ folder.label }}
            </option>
          </select>
        </label>

        <label class="form-label">
          <span>排序</span>
          <input v-model.number="form.sort_order" class="form-control" min="0" step="1" type="number" />
        </label>
      </div>

      <div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button" @click="$emit('close')">
          取消
        </button>
        <button class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700" type="submit">
          保存
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { X } from 'lucide-vue-next';
import type { BookmarkFormPayload, BookmarkNode, BookmarkType } from '../types/bookmark';

interface FolderOption {
  id: string;
  label: string;
}

const props = defineProps<{
  title: string;
  initial: BookmarkNode | null;
  folders: FolderOption[];
  defaultType: BookmarkType;
  defaultParentId: string | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [payload: BookmarkFormPayload];
}>();

const form = reactive<BookmarkFormPayload>({
  title: '',
  type: 'folder',
  url: '',
  parent_id: null,
  sort_order: 10
});

const parentOptions = computed(() => props.folders.filter((folder) => folder.id !== props.initial?.id));

watch(
  () => [props.initial, props.defaultType, props.defaultParentId] as const,
  () => {
    form.title = props.initial?.title ?? '';
    form.type = props.initial?.type ?? props.defaultType;
    form.url = props.initial?.url ?? '';
    form.parent_id = props.initial?.parent_id ?? props.defaultParentId;
    form.sort_order = props.initial?.sort_order ?? 10;
  },
  { immediate: true }
);

function handleSubmit() {
  emit('save', {
    title: form.title,
    type: form.type,
    url: form.type === 'bookmark' ? form.url : null,
    parent_id: form.parent_id,
    sort_order: Number(form.sort_order) || 0
  });
}
</script>

<style scoped>
.form-label {
  @apply grid gap-1.5 text-sm font-medium text-slate-700;
}

.form-control {
  @apply h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500;
}

.icon-button {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900;
}
</style>
