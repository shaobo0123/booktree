<template>
  <div class="mind-node" :style="{ '--accent': accentColor }">
    <!-- Node Card -->
    <div
      class="mind-card"
      :class="[
        node.type === 'folder' ? 'mind-card-folder' : 'mind-card-bookmark',
        isFolderExpanded ? 'mind-card-expanded' : ''
      ]"
      @click="handleClick"
      @contextmenu.prevent="showMenu"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <!-- Drag handle: inside left edge -->
      <span class="node-drag-handle" title="拖拽排序">
        <GripVertical class="h-3.5 w-3.5" :stroke-width="2" />
      </span>

      <span class="mind-card-icon">
        <BookmarkNodeIcon :node="node" />
      </span>
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
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="menuVisible"
        class="mind-context-menu"
        :style="{ left: menuX + 'px', top: menuY + 'px' }"
        @click.stop
      >
        <button class="ctx-item" @click="menuEdit">
          <Pencil class="h-3.5 w-3.5" :stroke-width="2" />
          编辑
        </button>
        <button class="ctx-item ctx-item-danger" @click="menuDelete">
          <Trash2 class="h-3.5 w-3.5" :stroke-width="2" />
          删除
        </button>
      </div>
    </Teleport>

    <!-- Backdrop to dismiss menu -->
    <Teleport to="body">
      <div v-if="menuVisible" class="mind-menu-backdrop" @click="menuVisible = false" @contextmenu.prevent="menuVisible = false" />
    </Teleport>

    <!-- Children branch -->
    <Transition name="mind-slide">
      <div v-if="isFolderExpanded || addingType" class="mind-branch">
        <draggable
          v-if="localChildren.length > 0"
          v-model="localChildren"
          item-key="id"
          class="mind-children"
          ghost-class="mind-drag-ghost"
          handle=".node-drag-handle"
          :animation="180"
          @change="onReorder"
        >
          <template #item="{ element: child }">
            <div class="mind-child">
              <MindMapNode
                :node="child"
                :expanded-ids="expandedIds"
                :depth="depth + 1"
                @toggle="$emit('toggle', $event)"
                @open="$emit('open', $event)"
                @edit="$emit('edit', $event)"
                @delete="(n: BookmarkNode) => $emit('delete', n)"
                @reorder="(pId: string, ids: string[]) => $emit('reorder', pId, ids)"
                @create-bookmark="$emit('create-bookmark', $event)"
                @create-folder="$emit('create-folder', $event)"
              />
            </div>
          </template>
        </draggable>

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
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Check, ChevronRight, FolderPlus, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-vue-next';
import draggable from 'vuedraggable';
import BookmarkNodeIcon from './BookmarkNodeIcon.vue';
import type { BookmarkNode, BookmarkType } from '../types/bookmark';

const props = withDefaults(defineProps<{
  node: BookmarkNode;
  expandedIds: Set<string>;
  depth?: number;
}>(), {
  depth: 0
});

const emit = defineEmits<{
  toggle: [id: string];
  open: [node: BookmarkNode];
  edit: [node: BookmarkNode];
  delete: [node: BookmarkNode];
  reorder: [parentId: string, orderedIds: string[]];
  'create-bookmark': [data: { parentId: string; title: string; url: string }];
  'create-folder': [data: { parentId: string; title: string }];
}>();

const isExpanded = computed(() => props.expandedIds.has(props.node.id));
const isFolderExpanded = computed(() => props.node.type === 'folder' && isExpanded.value);

const childNodes = computed(() => {
  if (props.node.type !== 'folder') return [];
  return [...props.node.children].sort((a, b) => a.sort_order - b.sort_order);
});

// Local mutable copy for vuedraggable v-model
const localChildren = ref<BookmarkNode[]>([...childNodes.value]);
let ignoreSync = false;

watch(childNodes, (val) => {
  if (ignoreSync) return;
  localChildren.value = [...val];
}, { deep: true });

const ACCENT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e'];
const accentColor = computed(() => ACCENT_COLORS[Math.min(props.depth, ACCENT_COLORS.length - 1)]);

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

// --- Drag reorder ---
function onReorder() {
  ignoreSync = true;
  emit('reorder', props.node.id, localChildren.value.map((n) => n.id));
  nextTick(() => { ignoreSync = false; });
}

// --- Card click ---
function handleClick() {
  if (props.node.type === 'folder') {
    emit('toggle', props.node.id);
  } else {
    emit('open', props.node);
  }
}

// --- Context menu ---
const menuVisible = ref(false);
const menuX = ref(0);
const menuY = ref(0);

function showMenu(e: MouseEvent) {
  menuX.value = e.clientX;
  menuY.value = e.clientY;
  menuVisible.value = true;
}

function menuEdit() {
  menuVisible.value = false;
  emit('edit', props.node);
}

function menuDelete() {
  menuVisible.value = false;
  emit('delete', props.node);
}

// --- Long press (mobile) ---
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let longPressPos: { x: number; y: number } = { x: 0, y: 0 };

function onPointerDown(e: PointerEvent) {
  longPressPos = { x: e.clientX, y: e.clientY };
  longPressTimer = setTimeout(() => {
    showMenu(new MouseEvent('contextmenu', { clientX: longPressPos.x, clientY: longPressPos.y }));
  }, 500);
}

function onPointerUp() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
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
/* ==================== Node: horizontal layout ==================== */
.mind-node {
  display: flex;
  align-items: flex-start;
}

/* ==================== Card ==================== */
.mind-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 24px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  border-left: 4px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
  cursor: pointer;
  transition: border-left-color 0.25s ease, box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  width: fit-content;
  min-width: 240px;
  max-width: 420px;
  flex-shrink: 0;
}

.mind-card:hover {
  border-color: #e2e8f0;
  border-left-color: var(--accent, #10b981);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.mind-card-expanded {
  border-left-color: var(--accent, #10b981);
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
}

.mind-card-folder {
  padding-top: 12px;
  padding-bottom: 12px;
}

.mind-card-bookmark {
  padding-top: 10px;
  padding-bottom: 10px;
}

/* Curved connector: card → branch */
.mind-card-expanded::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 28px;
  width: 10px;
  height: 14px;
  border-top: 1.5px solid #dde1e7;
  border-right: 1.5px solid #dde1e7;
  border-top-right-radius: 6px;
}

.mind-card-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.mind-card-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mind-card-url {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.4;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mind-card-meta {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.4;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mind-card-arrow {
  height: 18px;
  width: 18px;
  flex-shrink: 0;
  color: #cbd5e1;
  transition: transform 0.25s ease, color 0.2s ease;
}

.mind-card-arrow-open {
  transform: rotate(90deg);
  color: var(--accent, #10b981);
}

/* ==================== Drag handle: inside left edge ==================== */
.node-drag-handle {
  position: absolute;
  left: 3px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  height: 24px;
  width: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #cbd5e1;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.12s ease;
  z-index: 5;
}

.mind-card:hover .node-drag-handle {
  opacity: 1;
}

.node-drag-handle:active {
  cursor: grabbing;
}

.node-drag-handle:hover {
  color: #64748b;
}

/* Icon */
.mind-card-icon {
  position: relative;
  flex-shrink: 0;
  border-radius: 8px;
}

/* Inline form utility buttons */
.node-act {
  display: inline-flex;
  height: 26px;
  width: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.12s ease, background-color 0.12s ease;
}

.node-act:hover {
  background-color: #f1f5f9;
  color: #475569;
}

/* Drag ghost */
.mind-drag-ghost {
  opacity: 0.3;
}

/* ==================== Branch & connectors ==================== */
.mind-branch {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 12px;
  padding-top: 6px;
  padding-bottom: 2px;
  border-left: 1.5px solid #dde1e7;
}

.mind-child {
  position: relative;
  padding: 2px 0;
}

/* Horizontal connector */
.mind-child::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 26px;
  width: 8px;
  border-top: 1.5px solid #dde1e7;
}

/* Junction dot */
.mind-child::after {
  content: '';
  position: absolute;
  left: -14px;
  top: 23.5px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent, #10b981);
}

/* Last child: cap the vertical line */
.mind-child:last-child {
  padding-bottom: 0;
}

.mind-children {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ==================== Context Menu ==================== */
.mind-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 130px;
  padding: 6px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ctx-item {
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
  transition: background 0.1s ease;
}

.ctx-item:hover {
  background: #f1f5f9;
}

.ctx-item-danger {
  color: #ef4444;
}

.ctx-item-danger:hover {
  background: #fef2f2;
}

.mind-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

/* ==================== Transition animations ==================== */
.mind-slide-enter-active {
  transition: all 0.25s ease-out;
  overflow: hidden;
}

.mind-slide-leave-active {
  transition: all 0.15s ease-in;
  overflow: hidden;
}

.mind-slide-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateX(-8px);
}

.mind-slide-enter-to {
  opacity: 1;
  max-height: 5000px;
  transform: translateX(0);
}

.mind-slide-leave-from {
  opacity: 1;
  max-height: 5000px;
  transform: translateX(0);
}

.mind-slide-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateX(-8px);
}

/* ==================== Inline add form ==================== */
.mind-inline-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 2px dashed #6ee7b7;
  background: rgba(209, 250, 229, 0.35);
  flex-shrink: 0;
}

.mind-inline-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mind-inline-input {
  height: 26px;
  width: 180px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0 10px;
  font-size: 13px;
  color: #1e293b;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.mind-inline-input::placeholder {
  color: #94a3b8;
}

.mind-inline-input:focus {
  border-color: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.15);
}

/* ==================== Add buttons ==================== */
.mind-add-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1.5px dashed #cbd5e1;
  font-size: 12px;
  color: #94a3b8;
  background: none;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.add-btn:hover {
  color: #10b981;
  border-color: #6ee7b7;
  background-color: rgba(209, 250, 229, 0.3);
}

/* ==================== Focus ring ==================== */
.mind-card:focus-visible {
  outline: 2px solid var(--accent, #10b981);
  outline-offset: 2px;
}

/* ==================== Mobile: vertical layout (≤768px) ==================== */
@media (max-width: 768px) {
  .mind-node {
    flex-direction: column;
    align-items: stretch;
  }

  /* Redirect connector: card bottom → branch (curves down-left) */
  .mind-card-expanded::after {
    left: 30px;
    top: 100%;
    width: 14px;
    height: 10px;
    border: none;
    border-bottom: 1.5px solid #dde1e7;
    border-left: 1.5px solid #dde1e7;
    border-bottom-left-radius: 6px;
  }

  .mind-branch {
    border-left: none;
    padding-left: 26px;
    padding-top: 4px;
  }

  /* Vertical drop connector from above */
  .mind-child::before {
    left: -14px;
    top: 0;
    width: 0;
    height: 26px;
    border: none;
    border-left: 1.5px solid #dde1e7;
  }

  /* Junction dot at top of child */
  .mind-child::after {
    left: -16px;
    top: 24px;
  }

  .mind-child:last-child::before {
    height: 26px;
  }

  .node-drag-handle {
    opacity: 0.25;
  }
}
</style>
