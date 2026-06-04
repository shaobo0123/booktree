<template>
  <section class="flex h-full w-[320px] flex-shrink-0 flex-col border-r border-slate-200 bg-white">
    <div class="flex h-12 items-center justify-between border-b border-slate-200 px-3">
      <div class="min-w-0">
        <h2 class="truncate text-sm font-semibold text-slate-800">{{ title }}</h2>
        <p class="text-xs text-slate-500">{{ nodes.length }} 项</p>
      </div>
    </div>

    <div v-if="nodes.length === 0" class="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
      当前文件夹为空
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <BookmarkItem
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :selected="node.id === selectedId"
        @delete="$emit('delete', $event)"
        @edit="$emit('edit', $event)"
        @open="$emit('open', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import BookmarkItem from './BookmarkItem.vue';
import type { BookmarkNode } from '../types/bookmark';

defineProps<{
  title: string;
  nodes: BookmarkNode[];
  selectedId: string | null;
}>();

defineEmits<{
  select: [node: BookmarkNode];
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
}>();
</script>
