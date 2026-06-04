<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <form class="modal-panel" @submit.prevent="handleSubmit">
        <div class="flex items-center justify-between px-6 py-4">
          <h2 class="text-base font-semibold text-slate-900">{{ title }}</h2>
          <button class="icon-btn" type="button" title="关闭" @click="$emit('close')">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-4 px-6 py-5">
          <label v-if="showContextFields" class="form-label">
            <span>类型</span>
            <select v-model="form.type" :disabled="Boolean(initial)" class="form-control">
              <option value="folder">文件夹</option>
              <option value="bookmark">书签</option>
            </select>
          </label>

          <label class="form-label">
            <span>标题</span>
            <input
              v-model.trim="form.title"
              class="form-control"
              :placeholder="form.type === 'bookmark' ? '留空则自动获取网页标题' : '输入标题'"
              :required="form.type === 'folder'"
            />
          </label>

          <label v-if="form.type === 'bookmark'" class="form-label">
            <span>URL</span>
            <input v-model.trim="form.url" class="form-control" placeholder="https://example.com" type="url" />
          </label>

          <label v-if="showContextFields" class="form-label">
            <span>父级</span>
            <FolderTreeSelect
              v-model="form.parent_id"
              :block-folder-id="initial?.type === 'folder' ? initial.id : null"
              :tree="tree"
              empty-text="暂无可选文件夹"
              list-height="256px"
              root-description="顶层"
              root-label="根级"
              searchable
              variant="dropdown"
            />
          </label>

        </div>

        <div class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button class="btn-ghost" type="button" @click="$emit('close')">取消</button>
          <button class="btn-primary" type="submit">保存</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { X } from 'lucide-vue-next';
import FolderTreeSelect from './FolderTreeSelect.vue';
import type { BookmarkFormPayload, BookmarkNode, BookmarkType } from '../types/bookmark';

const props = defineProps<{
  title: string;
  initial: BookmarkNode | null;
  tree: BookmarkNode[];
  defaultType: BookmarkType;
  defaultParentId: string | null;
  showContextFields: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [payload: BookmarkFormPayload];
}>();

interface BookmarkFormState {
  title: string;
  type: BookmarkType;
  url: string;
  parent_id: string | null;
}

const form = reactive<BookmarkFormState>({
  title: '',
  type: 'folder',
  url: '',
  parent_id: null
});

watch(
  () => [props.initial, props.defaultType, props.defaultParentId] as const,
  () => {
    form.title = props.initial?.title ?? '';
    form.type = props.initial?.type ?? props.defaultType;
    form.url = props.initial?.url ?? '';
    form.parent_id = props.initial?.parent_id ?? props.defaultParentId;
  },
  { immediate: true }
);

function handleSubmit() {
  emit('save', {
    title: form.title,
    type: form.type,
    url: form.type === 'bookmark' ? form.url : null,
    parent_id: form.parent_id
  });
}
</script>

<style scoped>
.modal-backdrop {
  @apply fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px];
  animation: fadeIn 0.15s ease-out;
}

.modal-panel {
  @apply w-full max-w-lg rounded-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.18)];
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

.form-label {
  @apply grid gap-1.5 text-sm font-medium text-slate-700;
}

.form-control {
  @apply h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] disabled:bg-slate-50 disabled:text-slate-500;
}

.icon-btn {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700;
}

.btn-ghost {
  @apply rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50;
}

.btn-primary {
  @apply rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700;
}
</style>
