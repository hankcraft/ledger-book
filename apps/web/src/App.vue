<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

import AppDrawer from "./components/AppDrawer.vue";
import QuickEntryForm from "./components/QuickEntryForm.vue";
import TabBar from "./components/TabBar.vue";
import { useAppStore } from "./composables/useAppStore";
import { useQuickEntry } from "./composables/useQuickEntry";

const { state } = useAppStore();
const { drawerOpen, closeDrawer, openDrawer } = useQuickEntry();

function handleGlobalOpen(): void {
  openDrawer();
}

onMounted(() => {
  window.addEventListener("open-quick-entry", handleGlobalOpen);
});

onUnmounted(() => {
  window.removeEventListener("open-quick-entry", handleGlobalOpen);
});
</script>

<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>

    <Transition name="toast">
      <div v-if="state.toast" class="global-toast">{{ state.toast }}</div>
    </Transition>

    <TabBar v-if="state.onboardingComplete" />

    <AppDrawer :open="drawerOpen" title="新增交易" @close="closeDrawer">
      <QuickEntryForm @success="closeDrawer" />
    </AppDrawer>
  </div>
</template>

<style scoped>
.app-shell {
  max-width: 520px;
  margin: 0 auto;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.global-toast {
  position: fixed;
  top: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  background: var(--positive);
  color: var(--on-ink);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-card);
  font-size: var(--text-caption);
  font-weight: 500;
  z-index: 200;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
