<template>
  <div
    class="relative flex min-h-[96px] items-center gap-5 rounded-xl px-6 py-4 cursor-pointer transition-colors group"
    :class="selected ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'"
    @click="onClick"
    @contextmenu.prevent="onContextMenu"
    @pointerdown="onPointerDown"
    @pointerleave="clearLongPress"
    @pointerup="clearLongPress"
    @pointercancel="clearLongPress"
  >
    <span
      v-if="editMode || selected"
      class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors"
      :class="selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent bg-white'"
    >
      <Check class="h-3 w-3" :stroke-width="3" />
    </span>

    <!-- Drag handle: only shown in edit mode -->
    <span
      v-if="editMode"
      class="flex items-center justify-center mt-0.5 flex-shrink-0 text-slate-400 cursor-grab active:cursor-grabbing drag-handle"
    >
      <GripVertical class="h-4 w-4" :stroke-width="1.5" />
    </span>

    <BookmarkNodeIcon :node="node" size="lg" class="flex-shrink-0" />
    <div class="min-w-0 flex-1">
      <span class="block truncate text-[15px] font-medium leading-5 text-slate-800">{{ node.title }}</span>
      <span class="mt-1 block truncate text-[13px] leading-5 text-slate-400">{{ subtitle }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, GripVertical } from 'lucide-vue-next';
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

let longPressTimer: number | undefined;

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

function onPointerDown(e: PointerEvent) {
  if (props.editMode || e.pointerType === 'mouse') return;
  clearLongPress();
  longPressTimer = window.setTimeout(() => {
    emit('contextmenu', { node: props.node, x: e.clientX, y: e.clientY });
  }, 550);
}

function clearLongPress() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = undefined;
  }
}
</script>
