<template>
  <div
    class="flex items-center gap-2.5 px-3 rounded-lg border transition-colors relative group cursor-pointer"
    :class="[
      node.type === 'folder' ? 'h-14' : 'h-12',
      selected ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
    ]"
    :draggable="draggable ? 'true' : 'false'"
    @click="onRowClick"
    @contextmenu.prevent="onContextMenu"
    @pointerdown="onPointerDown"
    @pointerleave="clearLongPress"
    @pointerup="clearLongPress"
    @pointercancel="clearLongPress"
    @dragstart="onDragStart"
  >
    <!-- Drag handle: flex item, only shown in edit mode -->
    <span
      v-if="draggable !== false"
      class="flex items-center justify-center h-full w-5 flex-shrink-0 text-slate-400 cursor-grab active:cursor-grabbing drag-handle"
    >
      <GripVertical class="h-4 w-4" :stroke-width="1.5" />
    </span>

    <Folder v-if="node.type === 'folder'" class="h-6 w-6 flex-shrink-0 text-amber-500" :stroke-width="2" />
    <span v-else class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded">
      <BookmarkNodeIcon :node="node" size="sm" />
    </span>
    <div class="min-w-0 flex-1">
      <span class="block truncate text-sm font-semibold text-slate-800">{{ node.title }}</span>
      <span class="block truncate text-[13px] text-slate-400">{{ subtitle }}</span>
    </div>

    <!-- Selection checkbox (edit mode: always shown) -->
    <span
      v-if="editMode || selected"
      class="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors"
      :class="selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'"
    >
      <Check class="h-3 w-3" :stroke-width="3" />
    </span>
    <ChevronRight v-else-if="node.type === 'folder'" class="h-5 w-5 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" :stroke-width="2" />
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronRight, Folder, GripVertical } from 'lucide-vue-next';
import BookmarkNodeIcon from '../shared/BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../../types/bookmark';

const props = defineProps<{
  node: BookmarkNode;
  subtitle: string;
  draggable?: boolean;
  selected?: boolean;
  editMode?: boolean;
}>();

const emit = defineEmits<{
  click: [event?: MouseEvent];
  contextmenu: [payload: { node: BookmarkNode; x: number; y: number }];
  'toggle-select': [event?: MouseEvent];
}>();

let longPressTimer: number | undefined;

function onRowClick(e: MouseEvent) {
  if (props.editMode || props.selected) {
    emit('toggle-select', e);
  } else {
    emit('click', e);
  }
}

function onContextMenu(e: MouseEvent) {
  if (props.editMode) return; // disabled in edit mode
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

function onDragStart(e: DragEvent) {
  if (!props.editMode) {
    e.preventDefault();
    return;
  }
  e.dataTransfer!.setData('text/plain', props.node.id);
  e.dataTransfer!.effectAllowed = 'move';
}
</script>
