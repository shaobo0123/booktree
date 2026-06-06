<template>
  <div
    class="bookmark-row group"
    draggable="true"
    @click="$emit('click')"
    @contextmenu.prevent="(e) => $emit('contextmenu', { node, x: e.clientX, y: e.clientY })"
    @dragstart="onDragStart"
  >
    <!-- Drag handle -->
    <span class="drag-handle opacity-0 transition-opacity group-hover:opacity-100">
      <GripVertical class="h-4 w-4" :stroke-width="2" />
    </span>

    <!-- Favicon / Icon -->
    <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded">
      <img
        v-if="faviconSrc && !iconFailed"
        :src="faviconSrc"
        alt=""
        class="h-4 w-4 rounded-sm object-contain"
        @error="iconFailed = true"
      />
      <LinkIcon v-else class="h-4 w-4 text-slate-400" :stroke-width="2" />
    </span>

    <!-- Title + Domain -->
    <div class="min-w-0 flex-1">
      <span class="block truncate text-[13px] font-medium text-slate-800">{{ node.title }}</span>
      <span class="block truncate text-[12px] text-slate-400">{{ cleanUrl(node.url || '') }}</span>
    </div>

    <!-- Actions (hover) -->
    <div class="bookmark-row-actions">
      <button
        class="row-action-btn"
        title="编辑"
        @click.stop="$emit('edit', node)"
      >
        <Pencil class="h-3.5 w-3.5" :stroke-width="2" />
      </button>
      <button
        class="row-action-btn row-action-danger"
        title="删除"
        @click.stop="$emit('delete', node)"
      >
        <Trash2 class="h-3.5 w-3.5" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { GripVertical, Link as LinkIcon, Pencil, Trash2 } from 'lucide-vue-next';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  node: BookmarkNode;
}>();

defineEmits<{
  click: [];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  contextmenu: [payload: { node: BookmarkNode; x: number; y: number }];
}>();

const iconFailed = ref(false);

const faviconSrc = computed(() => {
  if (props.node.favicon_base64 && props.node.favicon_mime) {
    return `data:${props.node.favicon_mime};base64,${props.node.favicon_base64}`;
  }
  return props.node.favicon_url;
});

watch(
  () => [props.node.id, props.node.favicon_url, props.node.favicon_base64],
  () => { iconFailed.value = false; }
);

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function onDragStart(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', props.node.id);
    e.dataTransfer.effectAllowed = 'move';
  }
}
</script>

<style scoped>
.bookmark-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  background: #fff;
  cursor: pointer;
  transition: background-color 0.1s ease;
  position: relative;
}
.bookmark-row:hover {
  background-color: #f8fafc;
}
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #94a3b8;
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}
.bookmark-row-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.1s ease;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #fff;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.bookmark-row:hover .bookmark-row-actions {
  opacity: 1;
}
.row-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  width: 26px;
  border-radius: 5px;
  border: none;
  background: none;
  color: #64748b;
  cursor: pointer;
  transition: background-color 0.1s ease;
}
.row-action-btn:hover {
  background: #f1f5f9;
}
.row-action-danger:hover {
  background: #fef2f2;
  color: #ef4444;
}
</style>
