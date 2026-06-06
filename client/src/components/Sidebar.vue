<template>
  <!-- ROOT: folder list -->
  <div v-if="!node" class="flex flex-col gap-0.5">
    <button
      class="flex items-center gap-2 h-[34px] px-3 rounded-md text-[13px] text-slate-600 border-none bg-transparent cursor-pointer transition-colors hover:bg-slate-100 w-full"
      :class="selectedId === null ? '!bg-emerald-50 !text-emerald-700 !font-semibold' : ''"
      @click="$emit('select', null)"
      @contextmenu.prevent
    >
      <BookmarkIcon class="h-4 w-4 flex-shrink-0 text-slate-400" :stroke-width="2" />
      <span class="min-w-0 flex-1 truncate text-left">全部书签</span>
    </button>

    <div v-if="rootFolders.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
      暂无文件夹，点击上方 + 创建
    </div>

    <Sidebar
      v-for="folder in rootFolders"
      :key="folder.id"
      :node="folder"
      :depth="0"
      :selected-id="selectedId"
      @select="(id) => $emit('select', id)"
      @toggle="(id) => $emit('toggle', id)"
      @contextmenu="(payload) => $emit('contextmenu', payload)"
    />
  </div>

  <!-- RECURSIVE: tree node -->
  <div v-else>
    <div
      class="flex items-center gap-1.5 h-[34px] pr-2 rounded-md text-slate-600 cursor-pointer transition-colors select-none hover:bg-slate-100"
      :class="{
        '!bg-emerald-50 !text-emerald-700 !font-semibold': selectedId === node.id,
        'shadow-[inset_0_0_0_2px_#6ee7b7] bg-emerald-50': dragOver
      }"
      :style="{ paddingLeft: `${depth! * 16 + 12}px` }"
      draggable="true"
      @click="handleClick"
      @contextmenu.prevent="handleContextMenu"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <button
        v-if="hasSubFolders"
        class="inline-flex items-center justify-center w-4 h-4 flex-shrink-0 rounded-sm border-none bg-transparent p-0 text-slate-400 cursor-pointer transition-transform hover:text-slate-600"
        :class="isExpandedLocal ? 'rotate-90' : ''"
        @click.stop="handleToggle"
      >
        <ChevronRight class="h-3.5 w-3.5" :stroke-width="2.25" />
      </button>
      <span v-else class="inline-block w-4 flex-shrink-0" />

      <Folder
        v-if="!isExpandedLocal || !hasSubFolders"
        class="h-4 w-4 flex-shrink-0 text-amber-500" :stroke-width="2"
      />
      <FolderOpen v-else class="h-4 w-4 flex-shrink-0 text-amber-500" :stroke-width="2" />

      <span class="min-w-0 flex-1 truncate text-[13px]">{{ node.title }}</span>

      <span v-if="subFolderCount > 0" class="flex-shrink-0 text-[11px] text-slate-400">{{ subFolderCount }}</span>
    </div>

    <div v-if="isExpandedLocal && hasSubFolders">
      <Sidebar
        v-for="child in subFolders"
        :key="child.id"
        :node="child"
        :depth="(depth ?? 0) + 1"
        :selected-id="selectedId"
        @select="(id) => $emit('select', id)"
        @toggle="(id) => $emit('toggle', id)"
        @contextmenu="(payload) => $emit('contextmenu', payload)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { BookmarkIcon, ChevronRight, Folder, FolderOpen } from 'lucide-vue-next';
import { useSidebarState } from '../composables/useSidebarState';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  tree?: BookmarkNode[];
  node?: BookmarkNode;
  depth?: number;
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string | null];
  toggle: [id: string];
  contextmenu: [payload: { node: BookmarkNode; x: number; y: number }];
}>();

const { isExpanded, toggleExpanded } = useSidebarState();
const dragOver = ref(false);

// --- Root mode ---
const rootFolders = computed(() =>
  (props.tree ?? []).filter((n) => n.type === 'folder')
);

// --- Node mode ---
const subFolders = computed(() =>
  (props.node?.children ?? []).filter((n) => n.type === 'folder')
);
const hasSubFolders = computed(() => subFolders.value.length > 0);
const subFolderCount = computed(() => subFolders.value.length);
const isExpandedLocal = computed(() => isExpanded(props.node?.id ?? ''));

function handleClick() {
  if (hasSubFolders.value && !isExpandedLocal.value) {
    toggleExpanded(props.node!.id);
  }
  emit('select', props.node!.id);
}
function handleToggle() { toggleExpanded(props.node!.id); }
function handleContextMenu(e: MouseEvent) {
  emit('contextmenu', { node: props.node!, x: e.clientX, y: e.clientY });
}
function onDragStart(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', props.node!.id);
    e.dataTransfer.effectAllowed = 'move';
  }
}
function onDragOver(e: DragEvent) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOver.value = true;
}
function onDragLeave() { dragOver.value = false; }
function onDrop(e: DragEvent) {
  dragOver.value = false;
  const draggedId = e.dataTransfer?.getData('text/plain');
  if (draggedId && draggedId !== props.node!.id) {
    window.dispatchEvent(new CustomEvent('bookmark-drop', {
      detail: { draggedId, targetFolderId: props.node!.id }
    }));
  }
}
</script>
