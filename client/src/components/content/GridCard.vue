<template>
  <div
    class="relative flex items-start gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-colors group"
    :class="selected ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'"
    @click="onClick"
    @contextmenu.prevent="onContextMenu"
  >
    <span
      v-if="editMode || selected"
      class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors"
      :class="selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent bg-white'"
    >
      <Check class="h-3 w-3" :stroke-width="3" />
    </span>

    <BookmarkNodeIcon :node="node" size="lg" class="mt-0.5 flex-shrink-0" />
    <div class="min-w-0 flex-1">
      <span class="block truncate text-[13px] font-medium text-slate-800">{{ node.title }}</span>
      <span class="mt-0.5 block truncate text-[11px] text-slate-400">{{ subtitle }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import BookmarkNodeIcon from '../shared/BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../../types/bookmark';

const props = defineProps<{
  node: BookmarkNode;
  subtitle: string;
  selected?: boolean;
  editMode?: boolean;
}>();

const emit = defineEmits<{
  click: [event?: MouseEvent];
  contextmenu: [payload: { node: BookmarkNode; x: number; y: number }];
  'toggle-select': [event?: MouseEvent];
}>();

function onClick(e: MouseEvent) {
  if (props.editMode || props.selected) {
    emit('toggle-select', e);
  } else {
    emit('click', e);
  }
}

function onContextMenu(e: MouseEvent) {
  if (props.editMode) return;
  emit('contextmenu', { node: props.node, x: e.clientX, y: e.clientY });
}
</script>
