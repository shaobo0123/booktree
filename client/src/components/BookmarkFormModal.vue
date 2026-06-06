<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px]" @click.self="$emit('close')">
      <form class="w-full max-w-lg rounded-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.18)]" @submit.prevent="handleSubmit">
        <div class="flex items-center justify-between px-6 py-4">
          <h2 class="text-base font-semibold text-slate-900">{{ title }}</h2>
          <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" type="button" title="关闭" @click="$emit('close')">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-4 px-6 py-5">
          <label v-if="showContextFields" class="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>类型</span>
            <select v-model="form.type" :disabled="Boolean(initial)" class="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] disabled:bg-slate-50 disabled:text-slate-500">
              <option value="folder">文件夹</option>
              <option value="bookmark">书签</option>
            </select>
          </label>

          <label class="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>标题</span>
            <input
              v-model.trim="form.title"
              class="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] disabled:bg-slate-50 disabled:text-slate-500"
              :placeholder="form.type === 'bookmark' ? '留空则自动获取网页标题' : '输入标题'"
              :required="form.type === 'folder'"
            />
          </label>

          <label v-if="form.type === 'bookmark'" class="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>URL</span>
            <input v-model.trim="form.url" class="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] disabled:bg-slate-50 disabled:text-slate-500" placeholder="https://example.com" type="url" />
          </label>

        </div>

        <div class="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
          <button v-if="initial" class="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:border-rose-300" type="button" @click="$emit('delete', initial)">
            <Trash2 class="h-4 w-4" />
            删除
          </button>
          <span v-else />
          <div class="flex gap-2">
            <button class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50" type="button" @click="$emit('close')">取消</button>
            <button class="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700" type="submit">保存</button>
          </div>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { Trash2, X } from 'lucide-vue-next';
import type { BookmarkFormPayload, BookmarkNode, BookmarkType } from '../types/bookmark';

const props = defineProps<{
  title: string;
  initial: BookmarkNode | null;
  defaultType: BookmarkType;
  defaultParentId: string | null;
  showContextFields: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [payload: BookmarkFormPayload];
  delete: [node: BookmarkNode];
}>();

interface BookmarkFormState {
  title: string;
  type: BookmarkType;
  url: string;
}

const form = reactive<BookmarkFormState>({
  title: '',
  type: 'folder',
  url: ''
});

watch(
  () => [props.initial, props.defaultType] as const,
  () => {
    form.title = props.initial?.title ?? '';
    form.type = props.initial?.type ?? props.defaultType;
    form.url = props.initial?.url ?? '';
  },
  { immediate: true }
);

function handleSubmit() {
  emit('save', {
    title: form.title,
    type: form.type,
    url: form.type === 'bookmark' ? form.url : null,
    parent_id: props.initial?.parent_id ?? props.defaultParentId
  });
}
</script>
