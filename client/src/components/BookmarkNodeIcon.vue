<template>
  <span
    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
    :class="node.type === 'folder'
      ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-200/70'
      : 'bg-sky-100 text-sky-700 group-hover:bg-sky-200/70'"
  >
    <Folder v-if="node.type === 'folder'" class="h-4 w-4" :stroke-width="2.25" />
    <img v-else-if="iconSrc && !iconFailed" :src="iconSrc" alt="" class="h-5 w-5 rounded-sm object-contain" @error="iconFailed = true" />
    <LinkIcon v-else class="h-4 w-4" :stroke-width="2.25" />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Folder, Link as LinkIcon } from 'lucide-vue-next';
import type { BookmarkNode } from '../types/bookmark';

const props = defineProps<{
  node: BookmarkNode;
}>();

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
