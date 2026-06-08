<template>
  <header class="flex h-12 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4">
    <!-- Left: toggle + logo -->
    <div class="flex min-w-0 items-center gap-2">
      <button class="inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 transition-colors hover:bg-slate-100" @click="$emit('toggle-sidebar')">
        <PanelLeft class="h-4 w-4" :stroke-width="2" />
      </button>
      <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
        <LibraryBig class="h-4 w-4" :stroke-width="2.25" />
      </div>
    </div>

    <!-- Right: Search + Actions -->
    <div class="flex items-center gap-2">
      <!-- Search -->
      <label class="relative">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" :stroke-width="2" />
        <input
          :value="query"
          class="h-8 w-full min-w-[120px] max-w-[200px] rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          placeholder="搜索..."
          type="search"
          @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
          @keydown.escape="($event.target as HTMLInputElement).blur()"
        />
        <kbd class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">⌘K</kbd>
      </label>

      <!-- Divider -->
      <div class="mx-0.5 h-5 w-px bg-slate-200" />

      <!-- Auth-required actions (only when logged in) -->
      <template v-if="isLoggedIn">
        <button class="inline-flex items-center justify-center h-[30px] w-[30px] rounded-[7px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-slate-100 hover:text-slate-700" title="管理后台" @click="$emit('admin')">
          <Settings class="h-4 w-4" :stroke-width="2" />
        </button>

        <!-- Logout button -->
        <button class="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-[7px] border-none bg-transparent text-slate-500 cursor-pointer transition-colors hover:bg-slate-100 hover:text-slate-700 text-[13px]" title="退出登录" @click="$emit('logout')">
          <LogOut class="h-4 w-4" :stroke-width="2" />
        </button>
      </template>

      <!-- Login button (only when not logged in) -->
      <button v-else class="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-[7px] border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-pointer transition-colors hover:bg-emerald-100 text-[13px] font-medium" @click="$emit('login')">
        <LogIn class="h-4 w-4" :stroke-width="2" />
        <span>登录</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  LibraryBig,
  LogIn,
  LogOut,
  PanelLeft,
  Search,
  Settings
} from 'lucide-vue-next';
import type { BookmarkNode } from '../../types/bookmark';

defineProps<{
  query: string;
  breadcrumbPath: BookmarkNode[];
  selectedFolderId: string | null;
  sidebarOpen: boolean;
  isLoggedIn: boolean;
  username: string | null;
}>();

const emit = defineEmits<{
  'update:query': [value: string];
  'select-breadcrumb': [id: string | null];
  'toggle-sidebar': [];
  'new-folder': [parentId: string | null];
  'new-bookmark': [parentId: string | null];
  admin: [];
  'login': [];
  'logout': [];
}>();
</script>
