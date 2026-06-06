<template>
  <section :class="mb ? 'mb-8' : ''">
    <div class="mb-3 flex items-center gap-2">
      <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ label }}</span>
      <span class="text-[11px] text-slate-300">{{ items.length }}</span>
    </div>

    <!-- List -->
    <draggable v-if="viewMode === 'list'" v-model="local" item-key="id" class="flex flex-col gap-2" handle=".drag-handle" ghost-class="opacity-30" :animation="200" :disabled="!draggableEnabled" @change="onDragChange">
      <template #item="{ element: item }">
        <ListItem :node="item" :subtitle="subtitleFn(item)" :draggable="draggableEnabled" @click="$emit('click-item', item)" @contextmenu="(p) => $emit('contextmenu', p)" />
      </template>
    </draggable>

    <!-- Grid -->
    <div v-else class="grid gap-3" :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}, 1fr))` }">
      <GridCard v-for="item in items" :key="item.id" :node="item" :subtitle="subtitleFn(item)" @click="$emit('click-item', item)" @contextmenu="(p) => $emit('contextmenu', p)" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import ListItem from './ListItem.vue';
import GridCard from './GridCard.vue';
import type { BookmarkNode, ViewMode } from '../../types/bookmark';

const props = defineProps<{
  items: BookmarkNode[];
  label: string;
  subtitleFn: (n: BookmarkNode) => string;
  viewMode: ViewMode;
  gridMinWidth: string;
  mb?: boolean;
  draggable?: boolean;
}>();

const emit = defineEmits<{ 'click-item': [n: BookmarkNode]; reorder: [orderedIds: string[]]; contextmenu: [p: { node: BookmarkNode; x: number; y: number }] }>();

const draggableEnabled = computed(() => props.draggable !== false);

const local = ref<BookmarkNode[]>([...props.items]);
watch(() => props.items, v => { local.value = [...v]; });

function onDragChange() {
  emit('reorder', local.value.map(item => item.id));
}
</script>
