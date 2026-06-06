<template>
  <div
    class="relative rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-md group"
    @click="$emit('click')"
    @contextmenu.prevent="(e) => $emit('contextmenu', { node, x: e.clientX, y: e.clientY })"
  >
    <div class="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-0.5 rounded-md border border-slate-200 shadow-sm z-[1]">
      <button class="inline-flex items-center justify-center h-6 w-6 rounded-[5px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-slate-100" title="编辑" @click.stop="$emit('edit', node)">
        <Pencil class="h-3 w-3" :stroke-width="2.25" />
      </button>
      <button class="inline-flex items-center justify-center h-6 w-6 rounded-[5px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-red-50 hover:text-red-500" title="删除" @click.stop="$emit('delete', node)">
        <Trash2 class="h-3 w-3" :stroke-width="2.25" />
      </button>
    </div>

    <div class="flex flex-col items-center gap-2 px-3 py-4 text-center cursor-pointer">
      <BookmarkNodeIcon :node="node" size="lg" />
      <div class="w-full min-w-0 overflow-hidden">
        <span class="block truncate text-[13px] font-medium text-slate-800">{{ node.title }}</span>
        <span v-if="node.type === 'bookmark' && node.url" class="mt-0.5 block truncate text-[11px] text-slate-400">{{ cleanUrl(node.url) }}</span>
        <span v-if="node.type === 'folder'" class="mt-0.5 block truncate text-[11px] text-slate-400">{{ statsText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, Trash2 } from 'lucide-vue-next';
import BookmarkNodeIcon from './BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{ node: BookmarkNode }>();

defineEmits<{
  click: [];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  contextmenu: [payload: { node: BookmarkNode; x: number; y: number }];
}>();

const statsText = computed(() => {
  if (props.node.type !== 'folder') return '';
  let bookmarks = 0;
  let folders = 0;
  for (const child of props.node.children) {
    if (child.type === 'bookmark') bookmarks++;
    else folders++;
  }
  const parts: string[] = [];
  if (bookmarks > 0) parts.push(`${bookmarks} 书签`);
  if (folders > 0) parts.push(`${folders} 文件夹`);
  return parts.join(' · ') || '空';
});

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}
</script>
