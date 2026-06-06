<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      v-if="visible"
      class="fixed inset-0 z-[9998]"
      @click="$emit('close')"
      @contextmenu.prevent="$emit('close')"
    />

    <!-- Menu -->
    <div
      v-if="visible"
      class="fixed z-[9999] min-w-[160px] p-1 bg-white border border-slate-200 rounded-[10px] shadow-[0_8px_30px_rgba(15,23,42,0.12)] flex flex-col"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <template v-for="(item, index) in items" :key="index">
        <div v-if="item.separator" class="h-px bg-slate-200 mx-2 my-1" />
        <button
          class="flex items-center gap-2 px-2.5 py-[7px] border-none bg-transparent rounded-[7px] text-[13px] text-slate-700 cursor-pointer transition-colors hover:bg-slate-100"
          :class="{ 'text-red-500 hover:bg-red-50': item.danger }"
          @click="handleAction(item)"
        >
          <component :is="item.icon" v-if="item.icon" class="h-3.5 w-3.5" :stroke-width="2" />
          <span class="flex-1 text-left">{{ item.label }}</span>
          <span v-if="item.shortcut" class="text-[11px] text-slate-400">{{ item.shortcut }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

export interface ContextMenuItem {
  label: string;
  icon?: Component;
  shortcut?: string;
  danger?: boolean;
  separator?: boolean;
  action: () => void;
}

defineProps<{
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}>();

const emit = defineEmits<{
  close: [];
}>();

function handleAction(item: ContextMenuItem) {
  item.action();
  emit('close');
}
</script>
