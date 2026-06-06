<template>
  <div
    class="flex items-center gap-3 px-4 rounded-lg border border-slate-200 bg-white cursor-pointer transition-colors relative hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm group"
    :class="node.type === 'folder' ? 'h-14' : 'h-12'"
    draggable="true"
    @click="$emit('click')"
    @contextmenu.prevent="(e) => $emit('contextmenu', { node, x: e.clientX, y: e.clientY })"
    @dragstart="(e) => { e.dataTransfer!.setData('text/plain', node.id); e.dataTransfer!.effectAllowed = 'move'; }"
  >
    <span v-if="draggable !== false" class="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity drag-handle">
      <GripVertical class="h-4 w-4" :stroke-width="1.5" />
    </span>
    <Folder v-if="node.type === 'folder'" class="h-6 w-6 flex-shrink-0 text-amber-500" :stroke-width="2" />
    <span v-else class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded">
      <BookmarkNodeIcon :node="node" size="sm" />
    </span>
    <div class="min-w-0 flex-1">
      <span class="block truncate text-sm font-semibold text-slate-800">{{ node.title }}</span>
      <span class="block truncate text-[13px] text-slate-400">{{ subtitle }}</span>
    </div>
    <ChevronRight v-if="node.type === 'folder'" class="h-5 w-5 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" :stroke-width="2" />
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, Folder, GripVertical } from 'lucide-vue-next';
import BookmarkNodeIcon from '../shared/BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../../types/bookmark';

defineProps<{ node: BookmarkNode; subtitle: string; draggable?: boolean }>();
defineEmits<{ click: []; contextmenu: [payload: { node: BookmarkNode; x: number; y: number }] }>();
</script>
