<script setup lang="ts">
import { X } from "lucide-vue-next";

defineProps<{
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-overlay" @click.self="emit('close')">
        <aside class="drawer-panel" role="dialog" :aria-label="title">
          <header class="drawer-header">
            <h2 class="drawer-title">{{ title }}</h2>
            <button class="drawer-close" aria-label="關閉" @click="emit('close')">
              <X :size="20" />
            </button>
          </header>
          <div class="drawer-body">
            <slot />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: min(85vw, 400px);
  height: 100%;
  background: var(--canvas);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--line);
}

.drawer-title {
  margin: 0;
  font-size: var(--text-large);
  font-weight: 600;
}

.drawer-close {
  color: var(--muted);
  padding: var(--space-2);
  border-radius: var(--radius-control);
}

.drawer-close:hover {
  background: var(--neutral-subtle);
  color: var(--ink);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

/* Transitions */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.2s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}
</style>
