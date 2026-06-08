<template>
  <div class="flex h-full flex-col overflow-hidden bg-slate-50">
    <header class="flex h-12 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
      <div class="flex min-w-0 items-center gap-2">
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700" title="返回浏览" @click="$emit('back')">
          <ArrowLeft class="h-4 w-4" :stroke-width="2" />
        </button>
        <div>
          <h1 class="text-sm font-semibold text-slate-800">管理后台</h1>
          <p class="text-[11px] text-slate-400">{{ rows.length }} 个可见项目</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <template v-if="isLoggedIn">
          <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100" title="导入" @click="fileInput?.click()"><Upload class="h-4 w-4" :stroke-width="2" /></button>
          <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100" title="导出" @click="$emit('export')"><Download class="h-4 w-4" :stroke-width="2" /></button>
          <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100" title="权限总览" @click="$emit('permission-overview')"><Lock class="h-4 w-4" :stroke-width="2" /></button>
          <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50" title="清空图标缓存" @click="$emit('clear-favicons')"><Trash2 class="h-4 w-4" :stroke-width="2" /></button>
        </template>
        <button v-else class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100" @click="$emit('login')">
          <LogIn class="h-4 w-4" :stroke-width="2" />
          登录
        </button>
        <input ref="fileInput" accept=".html,.htm,text/html" class="hidden" type="file" @change="onImport" />
      </div>
    </header>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-slate-400">加载中...</div>
    <div v-else-if="error" class="flex flex-1 items-center justify-center px-6 text-center text-sm text-rose-500">{{ error }}</div>
    <div v-else class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div v-if="!isLoggedIn" class="mx-auto mt-16 max-w-sm text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Lock class="h-6 w-6 text-slate-300" :stroke-width="2" />
        </div>
        <p class="mt-3 text-sm font-medium text-slate-600">管理后台需要登录</p>
      </div>

      <template v-else>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-400">
          <span>管理树默认收起，展开文件夹后操作对应层级。</span>
          <span>{{ rows.length }} 个可见项目</span>
        </div>

        <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div class="hidden grid-cols-[minmax(260px,1fr)_90px_90px_180px] gap-3 border-b border-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-400 md:grid">
            <span>名称</span>
            <span>类型</span>
            <span>权限</span>
            <span class="text-right">操作</span>
          </div>

          <div v-if="rows.length === 0" class="px-4 py-10 text-center text-sm text-slate-400">暂无项目</div>

          <div v-else class="divide-y divide-slate-100">
            <div v-for="row in rows" :key="row.node.id" class="grid gap-2 px-3 py-3 md:grid-cols-[minmax(260px,1fr)_90px_90px_180px] md:items-center md:gap-3 md:px-4">
              <div class="flex min-w-0 items-center gap-2" :style="{ paddingLeft: `${row.depth * 20}px` }">
                <button v-if="row.node.type === 'folder'" class="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" @click="toggle(row.node.id)">
                  <ChevronRight class="h-4 w-4 transition-transform" :class="expanded.has(row.node.id) ? 'rotate-90' : ''" :stroke-width="2" />
                </button>
                <span v-else class="h-6 w-6 flex-shrink-0" />
                <BookmarkNodeIcon :node="row.node" />
                <span class="min-w-0">
                  <span class="block truncate text-[13px] font-medium text-slate-800">{{ row.node.title }}</span>
                  <span class="block truncate text-[12px] text-slate-400">{{ row.node.type === 'folder' ? folderStats(row.node) : cleanUrl(row.node.url || '') }}</span>
                </span>
              </div>

              <div class="text-[12px] text-slate-500 md:text-[13px]">{{ row.node.type === 'folder' ? '文件夹' : '书签' }}</div>
              <button class="inline-flex h-7 w-fit items-center rounded-md border px-2 text-[12px] transition-colors" :class="row.node.read_permission === 'public' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'" @click="$emit('set-permission', row.node, row.node.read_permission === 'public' ? 'private' : 'public')">
                {{ row.node.read_permission === 'public' ? '公开' : '私有' }}
              </button>

              <div class="flex items-center justify-end gap-1">
                <button class="icon-btn" :disabled="row.index === 0" title="上移" @click="move(row, -1)"><ArrowUp class="h-4 w-4" :stroke-width="2" /></button>
                <button class="icon-btn" :disabled="row.index === row.siblingIds.length - 1" title="下移" @click="move(row, 1)"><ArrowDown class="h-4 w-4" :stroke-width="2" /></button>
                <button v-if="row.node.type === 'folder'" class="icon-btn" title="新建子书签" @click="$emit('create-bookmark', row.node.id)"><Plus class="h-4 w-4" :stroke-width="2" /></button>
                <button class="icon-btn" title="编辑" @click="$emit('edit-node', row.node)"><Pencil class="h-4 w-4" :stroke-width="2" /></button>
                <button class="icon-btn text-rose-400 hover:bg-rose-50 hover:text-rose-600" title="删除" @click="$emit('delete-node', row.node)"><Trash2 class="h-4 w-4" :stroke-width="2" /></button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, Download, Lock, LogIn, Pencil, Plus, Trash2, Upload } from 'lucide-vue-next';
import BookmarkNodeIcon from '../shared/BookmarkNodeIcon.vue';
import type { BookmarkNode } from '../../types/bookmark';

const props = defineProps<{
  tree: BookmarkNode[];
  loading: boolean;
  error: string | null;
  selectedFolderId: string | null;
  isLoggedIn: boolean;
}>();

const emit = defineEmits<{
  back: [];
  login: [];
  export: [];
  import: [file: File];
  'permission-overview': [];
  'clear-favicons': [];
  'create-folder': [parentId: string | null];
  'create-bookmark': [parentId: string | null];
  'edit-node': [node: BookmarkNode];
  'delete-node': [node: BookmarkNode];
  'set-permission': [node: BookmarkNode, permission: 'public' | 'private'];
  reorder: [parentId: string | null, orderedIds: string[]];
}>();

interface Row {
  node: BookmarkNode;
  depth: number;
  parentId: string | null;
  index: number;
  siblingIds: string[];
}

const expanded = ref(new Set<string>());
const fileInput = ref<HTMLInputElement | null>(null);

const rows = computed(() => buildRows(props.tree, 0, null));

function buildRows(nodes: BookmarkNode[], depth: number, parentId: string | null): Row[] {
  const sorted = [...nodes].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  const siblingIds = sorted.map(node => node.id);
  return sorted.flatMap((node, index) => [
    { node, depth, parentId, index, siblingIds },
    ...(node.type === 'folder' && expanded.value.has(node.id) ? buildRows(node.children, depth + 1, node.id) : [])
  ]);
}

function toggle(id: string) {
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}

function move(row: Row, offset: -1 | 1) {
  const target = row.index + offset;
  if (target < 0 || target >= row.siblingIds.length) return;
  const next = [...row.siblingIds];
  const [id] = next.splice(row.index, 1);
  next.splice(target, 0, id);
  emit('reorder', row.parentId, next);
}

function findNode(id: string, nodes: BookmarkNode[] = props.tree): BookmarkNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(id, node.children);
    if (found) return found;
  }
  return null;
}

function onImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit('import', file);
  input.value = '';
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function folderStats(node: BookmarkNode): string {
  const folders = node.children.filter(child => child.type === 'folder').length;
  const bookmarks = node.children.length - folders;
  return [folders ? `${folders} 文件夹` : '', bookmarks ? `${bookmarks} 书签` : ''].filter(Boolean).join(' · ') || '空';
}
</script>

<style scoped>
.icon-btn {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30;
}
</style>
