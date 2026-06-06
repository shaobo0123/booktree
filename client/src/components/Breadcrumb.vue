<template>
  <nav class="flex items-center gap-1 text-[13px]" aria-label="面包屑导航">
    <button
      class="breadcrumb-item"
      :class="selectedFolderId === null ? 'breadcrumb-current' : ''"
      @click="$emit('select', null)"
    >
      <Folder class="h-3.5 w-3.5" :stroke-width="2" />
      <span>全部</span>
    </button>

    <template v-for="(segment, index) in path" :key="segment.id">
      <ChevronRight class="h-3.5 w-3.5 flex-shrink-0 text-slate-300" :stroke-width="2" />
      <button
        class="breadcrumb-item"
        :class="index === path.length - 1 ? 'breadcrumb-current' : ''"
        @click="$emit('select', segment.id)"
      >
        <span>{{ segment.title }}</span>
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { ChevronRight, Folder } from 'lucide-vue-next';
import type { BookmarkNode } from '../types/bookmark';

defineProps<{
  path: BookmarkNode[];
  selectedFolderId: string | null;
}>();

defineEmits<{
  select: [id: string | null];
}>();
</script>

<style scoped>
.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 6px;
  border: none;
  background: none;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.1s ease, color 0.1s ease;
  white-space: nowrap;
}
.breadcrumb-item:hover {
  background-color: #f1f5f9;
  color: #334155;
}
.breadcrumb-current {
  color: #0f172a;
  font-weight: 600;
  cursor: default;
}
.breadcrumb-current:hover {
  background: none;
  color: #0f172a;
}
</style>
