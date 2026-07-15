<script setup lang="ts">
import { useAppStore } from "./composables/useAppStore";
import TabBar from "./components/TabBar.vue";

const { state } = useAppStore();
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
