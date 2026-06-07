<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px]" @click.self="$emit('close')">
      <div class="w-full max-w-lg max-h-[80vh] rounded-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.18)] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 class="text-base font-semibold text-slate-900">权限管理</h2>
          <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" type="button" @click="$emit('close')">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Tree list -->
        <div class="flex-1 overflow-y-auto column-scrollbar px-3 py-2">
          <div v-if="flatNodes.length === 0" class="py-10 text-center text-sm text-slate-400">
            没有私有项目
          </div>
          <div
            v-for="item in flatNodes"
            :key="item.id"
            class="flex items-center gap-2 h-9 px-2 rounded-lg text-[13px] transition-colors hover:bg-slate-50"
            :style="{ paddingLeft: `${item.depth * 20 + 8}px` }"
          >
            <Folder v-if="item.type === 'folder'" class="h-4 w-4 flex-shrink-0 text-amber-500" :stroke-width="2" />
            <BookmarkNodeIcon v-else :node="{ type: 'bookmark' } as any" size="sm" />
            <span class="min-w-0 flex-1 truncate text-slate-700">{{ item.title }}</span>
            <Lock class="h-3.5 w-3.5 flex-shrink-0 text-amber-500" :stroke-width="2.5" />
            <button
              class="inline-flex items-center justify-center h-6 w-6 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              title="取消私有"
              @click="$emit('unlock', item.id)"
            >
              <X class="h-3.5 w-3.5" :stroke-width="2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Folder, Lock, X } from 'lucide-vue-next';
import BookmarkNodeIcon from '../shared/BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
}>();

defineEmits<{ close: []; unlock: [id: string] }>();

interface FlatNode {
  id: string;
  title: string;
  type: string;
  depth: number;
  read_permission: string;
}

function flatten(nodes: BookmarkNode[], depth: number): FlatNode[] {
  const result: FlatNode[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, title: n.title, type: n.type, depth, read_permission: n.read_permission });
    if (n.children.length > 0) {
      result.push(...flatten(n.children, depth + 1));
    }
  }
  return result;
}

const flatNodes = computed(() => flatten(props.tree, 0).filter(n => n.read_permission === 'private'));
</script>
