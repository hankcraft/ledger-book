<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import { useRouter } from "vue-router";

import ActionOptions from "../components/ActionOptions.vue";
import AttentionItem from "../components/AttentionItem.vue";
import ContextualInsight from "../components/ContextualInsight.vue";
import DailyPerformanceBanner from "../components/DailyPerformanceBanner.vue";
import HomePageSkeleton from "../components/HomePageSkeleton.vue";
import PageHeader from "../components/PageHeader.vue";
import { BRAND } from "../constants/brand";
import { useApi } from "../services";
import type { DailyPerformance } from "../services/types";
import type { Scenario } from "../types";

const api = useApi();
const router = useRouter();
const scenario = shallowRef<Scenario | null>(cachedScenario);
const performance = shallowRef<DailyPerformance | null>(cachedPerformance);
const error = shallowRef<string | null>(null);
const loading = shallowRef(false);

async function loadData(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const [perf, scen] = await Promise.all([
      api.home.getDailyPerformance(),
      api.home.getCurrentScenario(),
    ]);
    performance.value = perf;
    scenario.value = scen;
    cachedPerformance = perf;
    cachedScenario = scen;
  } catch {
    error.value = "暫時無法整理你的投資狀況，請稍後再試。";
  } finally {
    loading.value = false;
  }
}

async function handleAction(action: string): Promise<void> {
  try {
    const { initialPrompt } = await api.home.selectAction(action);
    await router.push({ name: "agent", query: { prompt: initialPrompt } });
  } catch {
    error.value = "暫時無法開始，請稍後再試。";
  }
}

onMounted(() => {
  // Only fetch if no cached data (first visit or explicit refresh)
  if (!cachedScenario) {
    void loadData();
  }
});
</script>

<script lang="ts">
import type { DailyPerformance as DP } from "../services/types";
import type { Scenario as Sc } from "../types";

// Module-level cache — survives component unmount/remount across navigation
let cachedScenario: Sc | null = null;
let cachedPerformance: DP | null = null;
</script>

<template>
  <main class="home" :aria-busy="loading">
    <PageHeader :title="BRAND.appName" />

    <DailyPerformanceBanner
      v-if="performance"
      :portfolio-return="performance.portfolioReturn"
      :benchmark-return="performance.benchmarkReturn"
    />

    <p v-if="error" class="error-message" role="alert">{{ error }}</p>

    <Transition name="content-fade" mode="out-in">
      <template v-if="scenario">
        <div class="home-content">
          <section class="greeting">
            <p>{{ scenario.greeting }}</p>
          </section>

          <ContextualInsight :insight="scenario.insight" />

          <section
            v-if="scenario.attentionItems.length > 0"
            class="attention-section"
            aria-label="注意事項"
          >
            <h2 class="section-label">需要留意</h2>
            <div class="attention-list">
              <AttentionItem v-for="item in scenario.attentionItems" :key="item.id" :item="item" />
            </div>
          </section>

          <ActionOptions :actions="scenario.actions" @select="handleAction" />
        </div>
      </template>
    </Transition>

    <HomePageSkeleton v-if="loading && !scenario" />
  </main>
</template>

<style scoped>
.home {
  padding: var(--space-6) var(--space-4);
  padding-bottom: calc(var(--space-8) + var(--tab-bar-height));
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.home-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.greeting p {
  margin: 0;
  color: var(--muted);
  line-height: var(--leading-relaxed);
}

.attention-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-label {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.attention-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.error-message {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--negative-subtle);
  color: var(--negative);
  font-size: var(--text-caption);
}

/* Content fade-in transition */
.content-fade-enter-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}

.content-fade-enter-from {
  opacity: 0;
}
</style>
