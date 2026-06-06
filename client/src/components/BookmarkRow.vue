<template>
  <div
    class="flex items-center gap-2.5 h-10 px-3 bg-white cursor-pointer transition-colors relative hover:bg-slate-50 group"
    draggable="true"
    @click="$emit('click')"
    @contextmenu.prevent="(e) => $emit('contextmenu', { node, x: e.clientX, y: e.clientY })"
    @dragstart="onDragStart"
  >
    <!-- Drag handle -->
    <span class="flex items-center justify-center w-5 h-5 flex-shrink-0 text-slate-400 cursor-grab active:cursor-grabbing opacity-0 transition-opacity group-hover:opacity-100">
      <GripVertical class="h-4 w-4" :stroke-width="2" />
    </span>

    <!-- Favicon / Icon -->
    <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded">
      <img
        v-if="faviconSrc && !iconFailed"
        :src="faviconSrc"
        alt=""
        class="h-4 w-4 rounded-sm object-contain"
        @error="iconFailed = true"
      />
      <LinkIcon v-else class="h-4 w-4 text-slate-400" :stroke-width="2" />
    </span>

    <!-- Title + Domain -->
    <div class="min-w-0 flex-1">
      <span class="block truncate text-[13px] font-medium text-slate-800">{{ node.title }}</span>
      <span class="block truncate text-[12px] text-slate-400">{{ cleanUrl(node.url || '') }}</span>
    </div>

    <!-- Actions (hover) -->
    <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 bg-white p-0.5 rounded-md border border-slate-200 shadow-sm">
      <button
        class="inline-flex items-center justify-center h-[26px] w-[26px] rounded-[5px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-slate-100"
        title="编辑"
        @click.stop="$emit('edit', node)"
      >
        <Pencil class="h-3.5 w-3.5" :stroke-width="2" />
      </button>
      <button
        class="inline-flex items-center justify-center h-[26px] w-[26px] rounded-[5px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-red-50 hover:text-red-500"
        title="删除"
        @click.stop="$emit('delete', node)"
      >
        <Trash2 class="h-3.5 w-3.5" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { GripVertical, Link as LinkIcon, Pencil, Trash2 } from 'lucide-vue-next';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  node: BookmarkNode;
}>();

defineEmits<{
  click: [];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  contextmenu: [payload: { node: BookmarkNode; x: number; y: number }];
}>();

const iconFailed = ref(false);

const faviconSrc = computed(() => {
  if (props.node.favicon_base64 && props.node.favicon_mime) {
    return `data:${props.node.favicon_mime};base64,${props.node.favicon_base64}`;
  }
  return props.node.favicon_url;
});

watch(
  () => [props.node.id, props.node.favicon_url, props.node.favicon_base64],
  () => { iconFailed.value = false; }
);

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function onDragStart(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', props.node.id);
    e.dataTransfer.effectAllowed = 'move';
  }
}
</script>
