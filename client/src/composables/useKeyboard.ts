import { onMounted, onUnmounted, type Ref } from 'vue';

export interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
}

export function useKeyboard(shortcuts: ShortcutHandler[], enabled: Ref<boolean>) {
  function onKeydown(e: KeyboardEvent) {
    if (!enabled.value) return;

    // Don't fire shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
      // Allow Escape in inputs
      if (e.key !== 'Escape') return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
        e.preventDefault();
        shortcut.handler();
        return;
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
  });
}
