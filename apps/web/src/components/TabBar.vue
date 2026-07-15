<script setup lang="ts">
import { useRoute } from "vue-router";
import { Home, TrendingUp, MessageCircle, User } from "lucide-vue-next";

const route = useRoute();

const tabs = [
  { path: "/", label: "首頁", icon: Home },
  { path: "/performance", label: "績效", icon: TrendingUp },
  { path: "/agent", label: "對話", icon: MessageCircle },
  { path: "/my-data", label: "我的資料", icon: User },
] as const;
</script>

<template>
  <nav class="tab-bar" aria-label="主要導覽">
    <router-link
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="tab-item"
      :class="{ 'tab-item--active': route.path === tab.path }"
    >
      <component :is="tab.icon" class="tab-icon" :size="22" :stroke-width="1.75" />
      <span class="tab-label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding: var(--space-2) 0;
  padding-bottom: max(var(--space-2), env(safe-area-inset-bottom));
  z-index: 50;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  text-decoration: none;
  color: var(--muted);
  transition: color 0.15s;
}

.tab-item--active {
  color: var(--action-primary);
}

.tab-icon {
  flex-shrink: 0;
}

.tab-label {
  font-size: var(--text-small);
  font-weight: 500;
}
</style>
