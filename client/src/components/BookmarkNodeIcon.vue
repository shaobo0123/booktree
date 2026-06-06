<template>
  <span
    class="flex flex-shrink-0 items-center justify-center rounded-xl transition-colors"
    :class="[
      size === 'lg'
        ? node.type === 'folder'
          ? 'h-12 w-12 bg-amber-50 text-amber-500 group-hover:bg-amber-100'
          : 'h-12 w-12 bg-slate-100 text-slate-500 group-hover:bg-slate-200/70'
        : node.type === 'folder'
          ? 'h-8 w-8 bg-amber-50 text-amber-600 group-hover:bg-amber-100'
          : 'h-8 w-8 bg-slate-100 text-slate-500 group-hover:bg-slate-200/70'
    ]"
  >
    <Folder v-if="node.type === 'folder'" :class="size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'" :stroke-width="2.25" />
    <img v-else-if="iconSrc && !iconFailed" :src="iconSrc" alt="" :class="size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'" class="rounded-sm object-contain" @error="iconFailed = true" />
    <LinkIcon v-else :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'" :stroke-width="2.25" />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Folder, Link as LinkIcon } from 'lucide-vue-next';
import type { BookmarkNode } from '../types/bookmark';

const props = withDefaults(defineProps<{
  node: BookmarkNode;
  size?: 'sm' | 'lg';
}>(), {
  size: 'sm'
});

const iconFailed = ref(false);

const iconSrc = computed(() => {
  if (props.node.type !== 'bookmark') {
    return null;
  }

  if (props.node.favicon_base64 && props.node.favicon_mime) {
    return `data:${props.node.favicon_mime};base64,${props.node.favicon_base64}`;
  }

  return props.node.favicon_url;
});

watch(
  () => [props.node.id, props.node.favicon_url, props.node.favicon_base64, props.node.favicon_mime],
  () => {
    iconFailed.value = false;
  }
);
</script>
