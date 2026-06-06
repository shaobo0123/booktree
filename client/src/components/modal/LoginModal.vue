<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="w-full max-w-sm rounded-2xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.18)]">
        <div class="flex items-center justify-between px-6 py-4">
          <h2 class="text-base font-semibold text-slate-900">登录</h2>
          <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" type="button" @click="$emit('close')">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="space-y-4 px-6 pb-6" @submit.prevent="handleSubmit">
          <p class="text-[13px] leading-relaxed text-slate-500">
            请输入管理员密码以解锁编辑、排序和导入导出功能。
          </p>

          <label class="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>密码</span>
            <input
              v-model="password"
              class="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
              placeholder="输入密码"
              type="password"
              autofocus
            />
          </label>

          <div v-if="error" class="text-[13px] text-rose-500">{{ error }}</div>

          <div class="flex justify-end gap-2 pt-1">
            <button class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50" type="button" @click="$emit('close')">取消</button>
            <button class="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50" type="submit" :disabled="loading || !password.trim()">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { X } from 'lucide-vue-next';

defineProps<{
  error: string | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  close: [];
  login: [password: string];
}>();

const password = ref('');

onMounted(() => {
  password.value = '';
});

function handleSubmit() {
  if (!password.value.trim()) return;
  emit('login', password.value);
}
</script>
