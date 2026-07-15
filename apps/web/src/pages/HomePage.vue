<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import { useRouter } from "vue-router";

import ActionOptions from "../components/ActionOptions.vue";
import AttentionItem from "../components/AttentionItem.vue";
import ContextualInsight from "../components/ContextualInsight.vue";
import { useApi } from "../services";
import type { Scenario } from "../types";

const api = useApi();
const router = useRouter();
const scenario = shallowRef<Scenario | null>(null);
const error = shallowRef<string | null>(null);
const loading = shallowRef(false);

async function loadScenario(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    scenario.value = await api.home.getCurrentScenario();
  } catch {
    error.value = "暫時無法整理你的投資情境，請稍後再試。";
  } finally {
    loading.value = false;
  }
}

async function handleAction(action: string): Promise<void> {
  try {
    const { initialPrompt } = await api.home.selectAction(action);
    await router.push({ name: "agent", query: { prompt: initialPrompt } });
  } catch {
    error.value = "暫時無法開始這段反思，請稍後再試。";
  }
}

onMounted(() => {
  void loadScenario();
});
</script>

<template>
  <main class="home" :aria-busy="loading">
    <header class="header">
      <span class="logo">持倉鏡</span>
      <button class="scenario-btn" :disabled="loading" @click="loadScenario">
        {{ loading ? "整理中…" : "切換情境" }}
      </button>
    </header>

    <p v-if="error" class="error-message" role="alert">{{ error }}</p>

    <template v-else-if="scenario">
      <section class="greeting">
        <p>{{ scenario.greeting }}</p>
      </section>
      <ContextualInsight :insight="scenario.insight" />
      <section class="attention" aria-label="注意事項">
        <AttentionItem v-for="item in scenario.attentionItems" :key="item.id" :item="item" />
      </section>
      <ActionOptions :actions="scenario.actions" @select="handleAction" />
    </template>

    <p v-else-if="loading" class="loading-message">正在整理你的投資情境…</p>
  </main>
</template>

<style scoped>
.home {
  padding: var(--space-6) var(--space-4);
  padding-bottom: calc(var(--space-8) + 60px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: var(--text-heading);
  font-weight: 700;
}

.scenario-btn {
  font-size: var(--text-small);
  color: var(--muted);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
}

.scenario-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.greeting p,
.loading-message {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.attention {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.error-message {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-card);
  background: var(--danger-subtle);
  color: var(--danger);
  font-size: var(--text-caption);
}
</style>
