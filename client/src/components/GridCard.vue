<template>
  <div
    class="relative rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-md group"
    @click="$emit('click')"
    @contextmenu.prevent="(e) => $emit('contextmenu', { node, x: e.clientX, y: e.clientY })"
  >
    <div class="flex flex-col items-center gap-2 px-3 py-4 text-center cursor-pointer">
      <BookmarkNodeIcon :node="node" size="lg" />
      <div class="w-full min-w-0 overflow-hidden">
        <span class="block truncate text-[13px] font-medium text-slate-800">{{ node.title }}</span>
        <span class="mt-0.5 block truncate text-[11px] text-slate-400">{{ subtitle }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BookmarkNodeIcon from './BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../types/bookmark';

defineProps<{ node: BookmarkNode; subtitle: string }>();
defineEmits<{ click: []; contextmenu: [payload: { node: BookmarkNode; x: number; y: number }] }>();
</script>
