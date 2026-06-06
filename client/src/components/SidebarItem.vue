<template>
  <div>
    <div
      class="flex items-center gap-1.5 h-[34px] pr-2 rounded-md text-slate-600 cursor-pointer transition-colors select-none hover:bg-slate-100"
      :class="{
        '!bg-emerald-50 !text-emerald-700 !font-semibold': selectedId === node.id,
        'shadow-[inset_0_0_0_2px_#6ee7b7] bg-emerald-50': dragOver
      }"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      draggable="true"
      @click="handleClick"
      @contextmenu.prevent="handleContextMenu"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Expand/Collapse arrow -->
      <button
        v-if="hasSubFolders"
        class="inline-flex items-center justify-center w-4 h-4 flex-shrink-0 rounded-sm border-none bg-transparent p-0 text-slate-400 cursor-pointer transition-transform hover:text-slate-600"
        :class="isExpandedLocal ? 'rotate-90' : ''"
        @click.stop="handleToggle"
      >
        <ChevronRight class="h-3.5 w-3.5" :stroke-width="2.25" />
      </button>
      <span v-else class="inline-block w-4 flex-shrink-0" />

      <!-- Folder Icon -->
      <Folder
        v-if="!isExpandedLocal || !hasSubFolders"
        class="h-4 w-4 flex-shrink-0 text-amber-500"
        :stroke-width="2"
      />
      <FolderOpen
        v-else
        class="h-4 w-4 flex-shrink-0 text-amber-500"
        :stroke-width="2"
      />

      <!-- Title -->
      <span class="min-w-0 flex-1 truncate text-[13px]">{{ node.title }}</span>

      <!-- Child count badge -->
      <span
        v-if="subFolderCount > 0"
        class="flex-shrink-0 text-[11px] text-slate-400"
      >{{ subFolderCount }}</span>
    </div>

    <!-- Children (recursive) -->
    <div v-if="isExpandedLocal && hasSubFolders">
      <SidebarItem
        v-for="child in subFolders"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        @select="(id: string) => $emit('select', id)"
        @toggle="(id: string) => $emit('toggle', id)"
        @contextmenu="(payload) => $emit('contextmenu', payload)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronRight, Folder, FolderOpen } from 'lucide-vue-next';
import { useSidebarState } from '../composables/useSidebarState';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  node: BookmarkNode;
  depth: number;
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string];
  toggle: [id: string];
  contextmenu: [payload: { node: BookmarkNode; x: number; y: number }];
}>();

const { isExpanded, toggleExpanded } = useSidebarState();

const isExpandedLocal = computed(() => isExpanded(props.node.id));
const dragOver = ref(false);

const subFolders = computed(() =>
  props.node.children.filter((n) => n.type === 'folder')
);

const hasSubFolders = computed(() => subFolders.value.length > 0);

const subFolderCount = computed(
  () => props.node.children.filter((n) => n.type === 'folder').length
);

function handleClick() {
  if (hasSubFolders.value && !isExpandedLocal.value) {
    toggleExpanded(props.node.id);
  }
  emit('select', props.node.id);
}

function handleToggle() {
  toggleExpanded(props.node.id);
}

function handleContextMenu(e: MouseEvent) {
  emit('contextmenu', { node: props.node, x: e.clientX, y: e.clientY });
}

function onDragStart(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', props.node.id);
    e.dataTransfer.effectAllowed = 'move';
  }
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  dragOver.value = true;
}

function onDragLeave() {
  dragOver.value = false;
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const draggedId = e.dataTransfer?.getData('text/plain');
  if (draggedId && draggedId !== props.node.id) {
    // Emit a custom event that App.vue can handle to move the node
    const event = new CustomEvent('bookmark-drop', {
      detail: { draggedId, targetFolderId: props.node.id }
    });
    window.dispatchEvent(event);
  }
}
</script>
