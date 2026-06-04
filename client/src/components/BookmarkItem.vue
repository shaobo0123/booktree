<template>
  <div
    class="group relative my-1 flex min-h-[56px] items-center gap-3 rounded-lg px-3 py-2 transition-all duration-150"
    :class="selected
      ? 'bg-emerald-50/80 shadow-[inset_3px_0_0_0_theme(colors.emerald.500)]'
      : 'hover:bg-slate-50'"
  >
    <div class="drag-handle flex h-8 w-3 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing">
      <GripVertical class="h-4 w-4 text-slate-400" :stroke-width="2.25" />
    </div>

    <button class="flex min-w-0 flex-1 items-center gap-3 text-left" type="button" @click="handlePrimaryClick">
      <BookmarkNodeIcon :node="node" />

      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium leading-snug" :class="selected ? 'text-emerald-900' : 'text-slate-800'">
          {{ node.title }}
        </span>
        <span v-if="node.type === 'bookmark'" class="block truncate text-xs leading-snug text-slate-500">
          {{ node.url }}
        </span>
        <span v-else class="block text-xs leading-snug text-slate-500">
          {{ node.children.length }} 项
        </span>
      </span>

      <ChevronRight v-if="node.type === 'folder'" class="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" :stroke-width="2.25" />
      <ExternalLink v-else class="h-4 w-4 flex-shrink-0 text-slate-400" :stroke-width="2.25" />
    </button>

    <div class="flex flex-shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
      <button class="icon-btn" title="编辑" type="button" aria-label="编辑" @click.stop="$emit('edit', node)">
        <Pencil class="h-4 w-4" :stroke-width="2.25" />
      </button>
      <button class="icon-btn text-rose-600 hover:bg-rose-50 hover:text-rose-700" title="删除" type="button" aria-label="删除" @click.stop="$emit('delete', node)">
        <Trash2 class="h-4 w-4" :stroke-width="2.25" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, ExternalLink, GripVertical, Pencil, Trash2 } from 'lucide-vue-next';
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
</script>

<style scoped>
.icon-btn {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900;
}
</style>
