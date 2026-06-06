<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      v-if="visible"
      class="context-menu-backdrop"
      @click="$emit('close')"
      @contextmenu.prevent="$emit('close')"
    />

    <!-- Menu -->
    <div
      v-if="visible"
      class="context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <template v-for="(item, index) in items" :key="index">
        <div v-if="item.separator" class="context-menu-separator" />
        <button
          class="context-menu-item"
          :class="{ 'context-menu-item-danger': item.danger }"
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

<style scoped>
.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 160px;
  padding: 4px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
}
.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  background: none;
  border-radius: 7px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  transition: background-color 0.1s ease;
}
.context-menu-item:hover {
  background: #f1f5f9;
}
.context-menu-item-danger {
  color: #ef4444;
}
.context-menu-item-danger:hover {
  background: #fef2f2;
}
.context-menu-separator {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 8px;
}
</style>
