<template>
  <div
    class="bookmark-card group"
    :class="selected ? 'bookmark-card-active' : ''"
  >
    <!-- Drag handle -->
    <div class="drag-handle absolute left-1 top-1 flex h-5 w-5 cursor-grab items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-50 active:cursor-grabbing">
      <GripVertical class="h-3 w-3 text-slate-400" :stroke-width="2.25" />
    </div>

    <!-- Hover actions -->
    <div class="bookmark-card-actions">
      <button class="card-action" title="编辑" type="button" aria-label="编辑" @click.stop="$emit('edit', node)">
        <Pencil class="h-3 w-3" :stroke-width="2.25" />
      </button>
      <button class="card-action card-action-danger" title="删除" type="button" aria-label="删除" @click.stop="$emit('delete', node)">
        <Trash2 class="h-3 w-3" :stroke-width="2.25" />
      </button>
    </div>

    <!-- Clickable content -->
    <button class="bookmark-card-body" type="button" @click="handlePrimaryClick">
      <BookmarkNodeIcon :node="node" size="lg" />
      <div class="bookmark-card-text">
        <span class="bookmark-card-title">{{ node.title }}</span>
        <span v-if="node.type === 'bookmark' && node.url" class="bookmark-card-url">{{ cleanUrl(node.url) }}</span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { GripVertical, Pencil, Trash2 } from 'lucide-vue-next';
import BookmarkNodeIcon from './BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  node: BookmarkNode;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [node: BookmarkNode];
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
}>();

function handlePrimaryClick() {
  if (props.node.type === 'folder') {
    emit('select', props.node);
    return;
  }
  emit('open', props.node);
}

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
  @apply relative rounded-xl border border-slate-200/70 bg-white transition-all hover:border-slate-300 hover:shadow-md;
}

.bookmark-card-active {
  @apply border-emerald-200 bg-emerald-50/50;
}

.bookmark-card-actions {
  @apply absolute right-1.5 top-1.5 flex gap-0.5 rounded-lg border border-slate-200 bg-white/90 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity;
}

.bookmark-card:hover .bookmark-card-actions {
  @apply opacity-100;
}

.bookmark-card-body {
  @apply flex w-full flex-col items-center gap-3 p-4 text-center;
}

.bookmark-card-text {
  @apply w-full min-w-0 overflow-hidden;
}

.bookmark-card-title {
  @apply block truncate text-[13px] font-medium leading-snug text-slate-800;
}

.bookmark-card-url {
  @apply mt-0.5 block truncate text-[11px] leading-snug text-slate-400;
}

.card-action {
  @apply inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600;
}

.card-action-danger {
  @apply hover:bg-rose-50 hover:text-rose-500;
}
</style>
