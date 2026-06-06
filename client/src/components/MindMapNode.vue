<template>
  <div class="mind-node">
    <!-- Node Card -->
    <div
      class="mind-card group"
      :class="[
        node.type === 'folder' ? 'mind-card-folder' : 'mind-card-bookmark',
        isFolderExpanded ? 'mind-card-expanded' : ''
      ]"
      @click="handleClick"
    >
      <BookmarkNodeIcon :node="node" />
      <div class="mind-card-text">
        <span class="mind-card-title">{{ node.title }}</span>
        <span v-if="node.type === 'bookmark' && node.url" class="mind-card-url">{{ cleanUrl(node.url) }}</span>
        <span v-if="node.type === 'folder'" class="mind-card-meta">
          {{ totalBookmarks }} 书签
          <template v-if="subFolderCount > 0"> · {{ subFolderCount }} 分组</template>
        </span>
      </div>
      <ChevronRight
        v-if="node.type === 'folder' && node.children.length > 0"
        class="mind-card-arrow"
        :class="isFolderExpanded ? 'mind-card-arrow-open' : ''"
        :stroke-width="2.25"
      />

      <!-- Hover actions (only edit/delete) -->
      <div class="mind-card-actions">
        <button class="node-act" title="编辑" @click.stop="$emit('edit', node)">
          <Pencil class="h-3 w-3" :stroke-width="2" />
        </button>
        <button class="node-act node-act-danger" title="删除" @click.stop="$emit('delete', node)">
          <Trash2 class="h-3 w-3" :stroke-width="2" />
        </button>
      </div>
    </div>

    <!-- Children branch (horizontal expansion) -->
    <div v-if="isFolderExpanded || addingType" class="mind-branch">
      <div v-if="childNodes.length > 0" class="mind-children">
        <div v-for="child in childNodes" :key="child.id" class="mind-child">
          <MindMapNode
            :node="child"
            :expanded-ids="expandedIds"
            @toggle="$emit('toggle', $event)"
            @open="$emit('open', $event)"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
            @create-bookmark="$emit('create-bookmark', $event)"
            @create-folder="$emit('create-folder', $event)"
          />
        </div>
      </div>

      <!-- Inline add form at bottom -->
      <div v-if="addingType" class="mind-child">
        <div class="mind-inline-card" @click.stop>
          <BookmarkNodeIcon :node="addingIconNode" />
          <div class="mind-inline-fields">
            <input
              ref="titleInputRef"
              v-model="newTitle"
              class="mind-inline-input"
              :placeholder="addingType === 'folder' ? '文件夹名称' : '标题'"
              @keydown.enter="onTitleEnter"
              @keydown.escape="cancelAdd"
            />
            <input
              v-if="addingType === 'bookmark'"
              ref="urlInputRef"
              v-model="newUrl"
              class="mind-inline-input"
              placeholder="https://..."
              @keydown.enter="submitAdd"
              @keydown.escape="cancelAdd"
            />
          </div>
          <button class="node-act" title="确认" @click.stop="submitAdd">
            <Check class="h-3.5 w-3.5 text-emerald-600" :stroke-width="2" />
          </button>
          <button class="node-act" title="取消" @click.stop="cancelAdd">
            <X class="h-3.5 w-3.5 text-slate-400" :stroke-width="2" />
          </button>
        </div>
      </div>

      <!-- Add buttons at bottom of list -->
      <div v-if="!addingType" class="mind-add-bar">
        <button class="add-btn" @click.stop="startAdd('folder')">
          <FolderPlus class="h-3 w-3" :stroke-width="2" /> 文件夹
        </button>
        <button class="add-btn" @click.stop="startAdd('bookmark')">
          <Plus class="h-3 w-3" :stroke-width="2" /> 书签
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { Check, ChevronRight, FolderPlus, Pencil, Plus, Trash2, X } from 'lucide-vue-next';
import BookmarkNodeIcon from './BookmarkNodeIcon.vue';
import type { BookmarkNode, BookmarkType } from '../types/bookmark';

const props = defineProps<{
  node: BookmarkNode;
  expandedIds: Set<string>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  'create-bookmark': [data: { parentId: string; title: string; url: string }];
  'create-folder': [data: { parentId: string; title: string }];
}>();

const isExpanded = computed(() => props.expandedIds.has(props.node.id));
const isFolderExpanded = computed(() => props.node.type === 'folder' && isExpanded.value);

const childNodes = computed(() => {
  if (props.node.type !== 'folder') return [];
  const folders = props.node.children.filter((n) => n.type === 'folder');
  const bookmarks = props.node.children.filter((n) => n.type === 'bookmark');
  return [...folders, ...bookmarks];
});

const totalBookmarks = computed(() => countBookmarks(props.node));
const subFolderCount = computed(() => props.node.children.filter((n) => n.type === 'folder').length);

// --- Inline add state ---
const addingType = ref<BookmarkType | null>(null);
const newTitle = ref('');
const newUrl = ref('');
const titleInputRef = ref<HTMLInputElement | null>(null);
const urlInputRef = ref<HTMLInputElement | null>(null);

const addingIconNode = computed<BookmarkNode>(() => ({
  id: '__adding__',
  parent_id: props.node.id,
  title: '',
  type: (addingType.value ?? 'folder') as BookmarkType,
  url: null,
  favicon_url: null,
  favicon_base64: null,
  favicon_mime: null,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  children: []
}));

function startAdd(type: BookmarkType) {
  // Auto-expand folder if not expanded
  if (!isExpanded.value) {
    emit('toggle', props.node.id);
  }
  addingType.value = type;
  newTitle.value = '';
  newUrl.value = '';
  nextTick(() => {
    titleInputRef.value?.focus();
  });
}

function onTitleEnter() {
  if (addingType.value === 'folder') {
    submitAdd();
  } else {
    // For bookmarks, move focus to URL field
    urlInputRef.value?.focus();
  }
}

function submitAdd() {
  const title = newTitle.value.trim();
  if (!title) return;

  if (addingType.value === 'bookmark') {
    emit('create-bookmark', {
      parentId: props.node.id,
      title,
      url: newUrl.value.trim() || ''
    });
  } else {
    emit('create-folder', {
      parentId: props.node.id,
      title
    });
  }
  addingType.value = null;
}

function cancelAdd() {
  addingType.value = null;
}

// --- Card click ---
function handleClick() {
  if (props.node.type === 'folder') {
    emit('toggle', props.node.id);
  } else {
    emit('open', props.node);
  }
}

function countBookmarks(node: BookmarkNode): number {
  return node.children.reduce((c, n) => c + (n.type === 'bookmark' ? 1 : countBookmarks(n)), 0);
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}
</script>

<style scoped>
/* ==================== Node: horizontal flex ==================== */
.mind-node {
  display: flex;
  align-items: flex-start;
}

/* ==================== Card ==================== */
.mind-card {
  @apply relative flex flex-shrink-0 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white pl-3 pr-2 transition-all;
  @apply hover:border-slate-300 hover:shadow-sm;
  cursor: pointer;
}

.mind-card-folder {
  @apply py-2.5;
}

.mind-card-bookmark {
  @apply py-2;
}

/* Horizontal connector from card to children branch */
.mind-card-expanded::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  width: 24px;
  height: 0;
  border-top: 2px solid #cbd5e1;
  transform: translateY(-1px);
}

.mind-card-text {
  @apply min-w-0 flex-1 overflow-hidden;
}

.mind-card-title {
  @apply block truncate text-[13px] font-medium leading-snug text-slate-800;
}

.mind-card-url {
  @apply mt-0.5 block truncate text-[11px] leading-snug text-slate-400;
}

.mind-card-meta {
  @apply mt-0.5 block truncate text-[11px] leading-snug text-slate-400;
}

.mind-card-arrow {
  @apply h-4 w-4 flex-shrink-0 text-slate-300 transition-transform duration-150;
}

.mind-card-arrow-open {
  @apply rotate-90 text-slate-500;
}

/* ==================== Hover actions ==================== */
.mind-card-actions {
  @apply ml-1 flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity;
}

.mind-card:hover .mind-card-actions,
.mind-card:focus-within .mind-card-actions {
  @apply opacity-100;
}

.node-act {
  @apply inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600;
}

.node-act-danger {
  @apply hover:bg-rose-50 hover:text-rose-500;
}

/* ==================== Branch ==================== */
.mind-branch {
  display: flex;
  flex-direction: column;
  padding-left: 24px;
  border-left: 2px solid #cbd5e1;
  margin-left: 0;
  gap: 4px;
  padding-top: 4px;
  padding-bottom: 4px;
}

.mind-child {
  position: relative;
  padding: 2px 0;
}

.mind-child::before {
  content: '';
  position: absolute;
  left: -24px;
  top: 50%;
  width: 24px;
  height: 0;
  border-top: 2px solid #cbd5e1;
  transform: translateY(-1px);
}

.mind-children {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ==================== Inline add form ==================== */
.mind-inline-card {
  @apply flex flex-shrink-0 items-center gap-2.5 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 pl-3 pr-2 py-2;
}

.mind-inline-fields {
  @apply flex flex-col gap-1;
}

.mind-inline-input {
  @apply h-6 w-44 rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100;
}

/* ==================== Empty state ==================== */
.mind-add-bar {
  @apply flex items-center gap-2 py-1.5;
}

.add-btn {
  @apply inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 text-[11px] text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700;
}
</style>
