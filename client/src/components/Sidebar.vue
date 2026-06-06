<template>
  <div class="flex flex-col gap-0.5">
    <!-- Root-level "all bookmarks" item -->
    <button
      class="sidebar-root-item"
      :class="selectedId === null ? 'sidebar-item-selected' : ''"
      @click="$emit('select', null)"
      @contextmenu.prevent
    >
      <BookmarkIcon class="h-4 w-4 flex-shrink-0 text-slate-400" :stroke-width="2" />
      <span class="min-w-0 flex-1 truncate text-left">全部书签</span>
    </button>

    <div v-if="rootFolders.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
      暂无文件夹，点击上方 + 创建
    </div>

    <SidebarItem
      v-for="folder in rootFolders"
      :key="folder.id"
      :node="folder"
      :depth="0"
      :selected-id="selectedId"
      @select="(id: string) => $emit('select', id)"
      @toggle="(id: string) => $emit('toggle', id)"
      @contextmenu="(payload) => $emit('contextmenu', payload)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BookmarkIcon } from 'lucide-vue-next';
import SidebarItem from './SidebarItem.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
  selectedId: string | null;
}>();

defineEmits<{
  select: [id: string | null];
  toggle: [id: string];
  contextmenu: [payload: { node: BookmarkNode; x: number; y: number }];
}>();

const rootFolders = computed(() =>
  props.tree.filter((n) => n.type === 'folder')
);
</script>

<style scoped>
.sidebar-root-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #475569;
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color 0.1s ease;
  width: 100%;
}
.sidebar-root-item:hover {
  background-color: #f1f5f9;
}
.sidebar-item-selected {
  background-color: #ecfdf5 !important;
  color: #059669;
  font-weight: 600;
}
</style>
