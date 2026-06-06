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
import { computed, onMounted, ref, watch } from 'vue';
import { Folder } from 'lucide-vue-next';
import type { BookmarkNode } from '../../types/bookmark';
import { useFaviconFetcher } from '../../composables/useFaviconFetcher';

const props = withDefaults(defineProps<{ node: BookmarkNode; size?: 'sm' | 'lg' }>(), { size: 'sm' });

const imgError = ref(false);
const { fetchFavicon, faviconCache } = useFaviconFetcher();

const fetchedFavicon = computed(() => faviconCache.get(props.node.id));

const faviconSrc = computed(() => {
  if (imgError.value) return null;
  if (props.node.type !== 'bookmark') return null;

  // From DB cache (returned by getBookmarkTree)
  if (props.node.favicon_base64 && props.node.favicon_mime) {
    return `data:${props.node.favicon_mime};base64,${props.node.favicon_base64}`;
  }

  // From on-demand fetch cache (frontend composable)
  if (fetchedFavicon.value) {
    return `data:${fetchedFavicon.value.mime};base64,${fetchedFavicon.value.base64}`;
  }

  return null;
});

const firstLetter = computed(() => (props.node.title || '?')[0].toUpperCase());

const containerClass = computed(() => {
  const s = props.size;
  if (props.node.type === 'bookmark') return s === 'lg' ? 'h-10 w-10 bg-slate-100' : 'h-6 w-6 bg-slate-100';
  return s === 'lg' ? 'h-12 w-12 bg-amber-50 text-amber-600' : 'h-8 w-8 bg-amber-50 text-amber-600';
});

function maybeFetchFavicon() {
  if (props.node.type !== 'bookmark' || !props.node.url) return;
  if (props.node.favicon_base64) return; // Already cached in DB
  fetchFavicon(props.node.id);
}

// Fetch on first render
onMounted(() => { maybeFetchFavicon(); });

// Re-fetch when bookmark changes or DB cache expired after tree reload
watch([() => props.node.id, () => props.node.favicon_base64], () => {
  imgError.value = false;
  maybeFetchFavicon();
});
</script>
