<template>
  <span
    class="flex flex-shrink-0 items-center justify-center rounded-lg transition-colors"
    :class="containerClass"
  >
    <Folder v-if="node.type === 'folder'" :class="size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'" :stroke-width="2" />
    <img v-else-if="faviconSrc" :src="faviconSrc" alt="" :class="size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'" class="rounded-sm object-contain" @error="imgError = true" />
    <span v-else-if="node.type === 'bookmark'" class="font-semibold text-slate-500" :class="size === 'lg' ? 'text-base' : 'text-[11px]'">{{ firstLetter }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Folder } from 'lucide-vue-next';
import { useFaviconCache } from '../../composables/useFaviconCache';
import type { BookmarkNode } from '../../types/bookmark';

const props = withDefaults(defineProps<{ node: BookmarkNode; size?: 'sm' | 'lg' }>(), { size: 'sm' });

const { getFaviconUrl } = useFaviconCache();
const imgError = ref(false);

const faviconState = computed(() => {
  if (props.node.type !== 'bookmark' || !props.node.url) return { url: null, loading: false };
  return getFaviconUrl(props.node.url, props.node.favicon_url);
});

const faviconSrc = computed(() => {
  if (imgError.value) return null;
  return faviconState.value.url;
});

const firstLetter = computed(() => (props.node.title || '?')[0].toUpperCase());

const containerClass = computed(() => {
  const s = props.size;
  if (props.node.type === 'bookmark') return s === 'lg' ? 'h-10 w-10 bg-slate-100' : 'h-6 w-6 bg-slate-100';
  return s === 'lg' ? 'h-12 w-12 bg-amber-50 text-amber-600' : 'h-8 w-8 bg-amber-50 text-amber-600';
});

// Reset img error when url changes
watch(() => props.node.url, () => { imgError.value = false; });
</script>
