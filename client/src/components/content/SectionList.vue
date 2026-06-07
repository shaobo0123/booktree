<template>
  <section :class="mb ? 'mb-8' : ''">
    <div class="mb-3 flex items-center gap-2">
      <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ label }}</span>
      <span class="text-[11px] text-slate-300">{{ items.length }}</span>
    </div>

    <!-- List -->
    <draggable v-if="viewMode === 'list'" v-model="local" item-key="id" class="flex flex-col gap-2" handle=".drag-handle" ghost-class="opacity-30" :animation="200" :disabled="!draggableEnabled" @change="onDragChange">
      <template #item="{ element: item }">
        <ListItem
          :node="item"
          :subtitle="subtitleFn(item)"
          :draggable="draggableEnabled"
          :selected="selectedIds?.has(item.id) ?? false"
          :edit-mode="editMode"
          @click="(e) => onItemClick(item, e)"
          @contextmenu="(p) => $emit('contextmenu', p)"
          @toggle-select="(e) => $emit('toggle-select', item.id, e)"
        />
      </template>
    </draggable>

    <!-- Grid -->
    <div v-else class="grid gap-3" :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}, 1fr))` }">
      <GridCard
        v-for="item in items"
        :key="item.id"
        :node="item"
        :subtitle="subtitleFn(item)"
        :selected="selectedIds?.has(item.id) ?? false"
        :edit-mode="editMode"
        @click="(e) => onItemClick(item, e)"
        @contextmenu="(p) => $emit('contextmenu', p)"
        @toggle-select="(e) => $emit('toggle-select', item.id, e)"
      />
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
  editMode?: boolean;
  selectedIds?: Set<string>;
}>();

const emit = defineEmits<{
  'click-item': [n: BookmarkNode, event?: MouseEvent];
  reorder: [orderedIds: string[]];
  contextmenu: [p: { node: BookmarkNode; x: number; y: number }];
  'toggle-select': [id: string, event?: MouseEvent];
}>();

const draggableEnabled = computed(() => props.draggable !== false && !!props.editMode);

const local = ref<BookmarkNode[]>([...props.items]);
watch(() => props.items, v => { local.value = [...v]; });

function onItemClick(item: BookmarkNode, event?: MouseEvent) {
  emit('click-item', item, event);
}

function onDragChange() {
  emit('reorder', local.value.map(item => item.id));
}
</script>
