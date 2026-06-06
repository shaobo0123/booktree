<template>
  <nav class="flex items-center gap-1 text-[13px]" aria-label="面包屑导航">
    <button
      class="inline-flex items-center gap-1 px-1.5 py-[3px] rounded-md border-none bg-transparent text-[13px] text-slate-500 cursor-pointer transition-colors whitespace-nowrap hover:bg-slate-100 hover:text-slate-700"
      :class="selectedFolderId === null ? 'text-slate-900 font-semibold cursor-default hover:bg-transparent hover:text-slate-900' : ''"
      @click="$emit('select', null)"
    >
      <Folder class="h-3.5 w-3.5" :stroke-width="2" />
      <span>全部</span>
    </button>

    <template v-for="(segment, index) in path" :key="segment.id">
      <ChevronRight class="h-3.5 w-3.5 flex-shrink-0 text-slate-300" :stroke-width="2" />
      <button
        class="breadcrumb-item"
        :class="index === path.length - 1 ? 'text-slate-900 font-semibold cursor-default hover:bg-transparent hover:text-slate-900' : ''"
        @click="$emit('select', segment.id)"
      >
        <span>{{ segment.title }}</span>
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { ChevronRight, Folder } from 'lucide-vue-next';
import type { BookmarkNode } from '../../types/bookmark';

defineProps<{
  path: BookmarkNode[];
  selectedFolderId: string | null;
}>();

defineEmits<{
  select: [id: string | null];
}>();
</script>
