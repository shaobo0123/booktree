<template>
  <div
    class="group flex min-h-[60px] items-center gap-3 border-b border-slate-100 px-3 py-2 transition"
    :class="selected ? 'bg-emerald-50' : 'hover:bg-slate-50'"
  >
    <button class="flex min-w-0 flex-1 items-center gap-3 text-left" type="button" @click="handlePrimaryClick">
      <span
        class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
        :class="node.type === 'folder' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'"
      >
        <Folder v-if="node.type === 'folder'" class="h-4 w-4" />
        <LinkIcon v-else class="h-4 w-4" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium" :class="selected ? 'text-emerald-900' : 'text-slate-800'">
          {{ node.title }}
        </span>
        <span v-if="node.type === 'bookmark'" class="block truncate text-xs text-slate-500">
          {{ node.url }}
        </span>
        <span v-else class="block text-xs text-slate-500">
          {{ node.children.length }} 项
        </span>
      </span>
      <ChevronRight v-if="node.type === 'folder'" class="h-4 w-4 flex-shrink-0 text-slate-400" />
      <ExternalLink v-else class="h-4 w-4 flex-shrink-0 text-slate-400" />
    </button>

    <div class="flex flex-shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
      <button class="icon-button" title="编辑" type="button" @click.stop="$emit('edit', node)">
        <Pencil class="h-4 w-4" />
      </button>
      <button class="icon-button text-rose-600 hover:bg-rose-50" title="删除" type="button" @click.stop="$emit('delete', node)">
        <Trash2 class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, ExternalLink, Folder, Link as LinkIcon, Pencil, Trash2 } from 'lucide-vue-next';
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
.icon-button {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900;
}
</style>
