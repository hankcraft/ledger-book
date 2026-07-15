<script setup lang="ts">
import { onMounted, ref, shallowRef } from "vue";

import PerformanceChart from "../components/PerformanceChart.vue";
import TimePointDetail from "../components/TimePointDetail.vue";
import { useApi } from "../services";
import type { PerformanceTimeline, TimePointEvent } from "../services/types";

const api = useApi();
const timeline = shallowRef<PerformanceTimeline | null>(null);
const selectedDate = ref<string | null>(null);
const selectedEvent = shallowRef<TimePointEvent | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function loadTimeline(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    timeline.value = await api.performance.getPerformanceTimeline();
  } catch {
    error.value = "無法載入績效資料，請稍後再試。";
  } finally {
    loading.value = false;
  }
}

async function handleSelectPoint(date: string): Promise<void> {
  if (selectedDate.value === date) {
    selectedDate.value = null;
    selectedEvent.value = null;
    return;
  }
  selectedDate.value = date;
  selectedEvent.value = null;

  const event = await api.performance.getTimePointEvent(date);
  if (selectedDate.value === date) {
    selectedEvent.value = event;
  }
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

onMounted(() => {
  void loadTimeline();
});
</script>

<template>
  <main class="performance" :aria-busy="loading">
    <header class="page-header">
      <h1 class="page-title">績效</h1>
    </header>

    <p v-if="error" class="error-message" role="alert">{{ error }}</p>

    <template v-else-if="timeline">
      <!-- Metrics cards -->
      <div class="metrics-strip">
        <div class="metric-card">
          <span
            class="metric-value"
            :class="{ positive: timeline.metrics.xirr >= 0, negative: timeline.metrics.xirr < 0 }"
          >
            {{ formatPercent(timeline.metrics.xirr) }}
          </span>
          <span class="metric-label">真實年化報酬</span>
        </div>
        <div class="metric-card">
          <span
            class="metric-value"
            :class="{ positive: timeline.metrics.twr >= 0, negative: timeline.metrics.twr < 0 }"
          >
            {{ formatPercent(timeline.metrics.twr) }}
          </span>
          <span class="metric-label">選股能力</span>
        </div>
        <div class="metric-card">
          <span class="metric-value muted-value">
            {{ formatPercent(timeline.metrics.benchmarkReturn) }}
          </span>
          <span class="metric-label">同期大盤</span>
        </div>
      </div>

      <!-- Chart -->
      <section class="chart-section">
        <PerformanceChart
          :points="timeline.points"
          :selected-date="selectedDate"
          @select-point="handleSelectPoint"
        />
        <div class="chart-legend">
          <span class="legend-item legend-portfolio">我的投組</span>
          <span class="legend-item legend-benchmark">大盤 (0050)</span>
        </div>
      </section>

      <!-- Selected event detail -->
      <TimePointDetail v-if="selectedEvent" :event="selectedEvent" />
      <p v-else-if="selectedDate" class="no-event">這天沒有特別事件記錄。</p>
      <p v-else class="hint">點擊圖表上的時間點，查看當天發生了什麼。</p>
    </template>

    <p v-else-if="loading" class="loading-message">讓我整理你的績效…</p>
  </main>
</template>

<style scoped>
.performance {
  padding: var(--space-6) var(--space-4);
  padding-bottom: calc(var(--space-8) + 60px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.page-header {
  display: flex;
  align-items: center;
}

.page-title {
  font-size: var(--text-heading);
  font-weight: 700;
  margin: 0;
}

.metrics-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-2);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
}

.metric-value {
  font-size: var(--text-large);
  font-weight: 700;
}

.metric-value.positive {
  color: var(--positive);
}

.metric-value.negative {
  color: var(--negative);
}

.metric-value.muted-value {
  color: var(--muted);
}

.metric-label {
  font-size: var(--text-small);
  color: var(--muted);
  text-align: center;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
}

.legend-item {
  font-size: var(--text-small);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.legend-item::before {
  content: "";
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.legend-portfolio::before {
  background: var(--accent);
}

.legend-benchmark::before {
  background: var(--muted);
  border-style: dashed;
}

.hint,
.no-event,
.loading-message {
  text-align: center;
  color: var(--muted);
  font-size: var(--text-caption);
  margin: 0;
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
