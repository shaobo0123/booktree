<template>
  <div
    class="bookmark-card group"
    @click="$emit('click')"
    @contextmenu.prevent="(e) => $emit('contextmenu', { node, x: e.clientX, y: e.clientY })"
  >
    <div class="card-actions">
      <button class="card-action-btn" title="编辑" @click.stop="$emit('edit', node)">
        <Pencil class="h-3 w-3" :stroke-width="2.25" />
      </button>
      <button class="card-action-btn card-action-danger" title="删除" @click.stop="$emit('delete', node)">
        <Trash2 class="h-3 w-3" :stroke-width="2.25" />
      </button>
    </div>

    <div class="card-body">
      <BookmarkNodeIcon :node="node" size="lg" />
      <div class="card-text">
        <span class="card-title">{{ node.title }}</span>
        <span v-if="node.type === 'bookmark' && node.url" class="card-url">{{ cleanUrl(node.url) }}</span>
        <span v-if="node.type === 'folder'" class="card-meta">{{ statsText }}</span>
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

<style scoped>
.bookmark-card {
  position: relative;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.bookmark-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.card-actions {
  position: absolute;
  right: 6px;
  top: 6px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.1s ease;
  background: #fff;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  z-index: 1;
}
.bookmark-card:hover .card-actions { opacity: 1; }
.card-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px; width: 24px;
  border-radius: 5px;
  border: none;
  background: none;
  color: #64748b;
  cursor: pointer;
  transition: background-color 0.1s ease;
}
.card-action-btn:hover { background: #f1f5f9; }
.card-action-danger:hover { background: #fef2f2; color: #ef4444; }
.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
}
.card-text { width: 100%; min-width: 0; overflow: hidden; }
.card-title {
  display: block;
  font-size: 13px; font-weight: 500;
  color: #1e293b;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card-url, .card-meta {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
