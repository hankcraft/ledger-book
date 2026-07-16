<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import { Plus } from "lucide-vue-next";

import PageHeader from "../components/PageHeader.vue";
import PerformanceChart from "../components/PerformanceChart.vue";
import PerformancePageSkeleton from "../components/PerformancePageSkeleton.vue";
import TimePointDetail from "../components/TimePointDetail.vue";
import { useApi } from "../services";
import type { PerformanceTimeline, TimePointEvent } from "../services/types";

const api = useApi();
const timeline = shallowRef<PerformanceTimeline | null>(null);
const selectedDate = ref<string | null>(null);
const selectedEvent = shallowRef<TimePointEvent | null>(null);
const events = shallowRef<TimePointEvent[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function loadTimeline(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    timeline.value = await api.performance.getPerformanceTimeline();
  } catch {
    error.value = "無法載入績效資料，請稍後再試。";
    loading.value = false;
    return;
  }

  // Load events separately so chart still renders if event loading fails
  try {
    const eventDates = timeline.value.eventDates ?? [];
    if (eventDates.length > 0) {
      const loaded = await Promise.all(
        eventDates.map((date) => api.performance.getTimePointEvent(date)),
      );
      events.value = loaded.filter((e): e is TimePointEvent => e !== null);
    }
  } catch {
    // Event loading failed silently — chart still works
  }

  loading.value = false;
}

async function handleSelectPoint(date: string): Promise<void> {
  selectedDate.value = date;
  selectedEvent.value = null;

  const event = await api.performance.getTimePointEvent(date);
  if (selectedDate.value === date) {
    selectedEvent.value = event;
  }
}

function openQuickEntry(): void {
  window.dispatchEvent(new CustomEvent("open-quick-entry"));
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const eventTypeLabel: Record<string, string> = {
  buy: "買進",
  sell: "賣出",
  dividend: "配息",
  market: "市場",
};

const eventTypeClass: Record<string, string> = {
  buy: "type-buy",
  sell: "type-sell",
  dividend: "type-dividend",
  market: "type-market",
};

const hasEvents = computed(() => events.value.length > 0);
const hasMissingDates = computed(() => timeline.value?.missingDates ?? false);

onMounted(() => {
  void loadTimeline();
});
</script>

<template>
  <main class="performance" :aria-busy="loading">
    <PageHeader title="績效">
      <template #action>
        <button class="add-trade-btn" @click="openQuickEntry">
          <Plus :size="16" :stroke-width="2" />
          新增交易
        </button>
      </template>
    </PageHeader>

    <!-- Missing-date nudge -->
    <div v-if="hasMissingDates" class="nudge-banner" role="status">
      <span class="nudge-icon">📅</span>
      <div class="nudge-content">
        <p class="nudge-text">有庫存還沒填交易日期</p>
        <p class="nudge-detail">補上日期後，績效圖會更準確，也能看到當天的交易情緒回顧。</p>
      </div>
    </div>

    <p v-if="error" class="error-message" role="alert">{{ error }}</p>

    <Transition name="content-fade" mode="out-in">
      <div v-if="timeline" class="perf-content">
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
            :event-dates="timeline.eventDates"
            @select-point="handleSelectPoint"
          />
          <div class="chart-legend">
            <span class="legend-item legend-portfolio">我的投組</span>
            <span class="legend-item legend-benchmark">大盤 (0050)</span>
            <span class="legend-item legend-event">有事件</span>
          </div>
        </section>

        <!-- Selected event detail -->
        <TimePointDetail v-if="selectedEvent" :event="selectedEvent" />

        <!-- Event list -->
        <section v-if="hasEvents" class="event-list" aria-label="近期事件">
          <h2 class="event-list-title">近期事件</h2>
          <ul class="events">
            <li
              v-for="event in events"
              :key="event.date"
              class="event-item"
              :class="{ active: selectedDate === event.date }"
              @click="handleSelectPoint(event.date)"
            >
              <span class="event-date">{{ formatDate(event.date) }}</span>
              <span class="event-type" :class="eventTypeClass[event.type]">
                {{ eventTypeLabel[event.type] }}
              </span>
              <span class="event-summary">{{ event.summary }}</span>
            </li>
          </ul>
        </section>

        <p v-else-if="!selectedEvent && !selectedDate" class="hint">
          點擊圖表上的亮點，查看當天發生了什麼。
        </p>
      </div>
    </Transition>

    <PerformancePageSkeleton v-if="loading && !timeline" />
  </main>
</template>

<style scoped>
.performance {
  padding: var(--space-6) var(--space-4);
  padding-bottom: calc(var(--space-8) + var(--tab-bar-height));
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ─── Add Trade Button ─── */
.add-trade-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--action-primary);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--action-primary);
  border-radius: var(--radius-md);
  transition:
    background var(--duration-fast),
    color var(--duration-fast);
}

.add-trade-btn:hover {
  background: var(--brand-light, var(--primary-subtle));
}

/* ─── Missing-date Nudge ─── */
.nudge-banner {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--warning-subtle, #fff8e1);
  border: 1px solid var(--warning, #f59e0b);
  border-radius: var(--radius-card);
}

.nudge-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.nudge-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nudge-text {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--ink);
}

.nudge-detail {
  margin: 0;
  font-size: var(--text-small, 0.75rem);
  color: var(--muted);
  line-height: 1.5;
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
  border-radius: var(--radius-md);
}

.metric-value {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
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
  font-size: var(--text-caption);
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
  font-size: var(--text-caption);
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

.legend-event::before {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-accent);
}

/* ─── Event List ─── */
.event-list-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
}

.events {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.event-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    border-color var(--duration-fast),
    background var(--duration-fast);
}

.event-item:hover {
  border-color: var(--action-primary);
}

.event-item.active {
  border-color: var(--action-primary);
  background: var(--brand-light);
}

.event-date {
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  color: var(--muted);
  min-width: 3rem;
}

.event-type {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.type-buy {
  background: var(--positive-subtle);
  color: var(--positive);
}

.type-sell {
  background: var(--negative-subtle);
  color: var(--negative);
}

.type-dividend {
  background: var(--warning-subtle);
  color: var(--warning);
}

.type-market {
  background: var(--neutral-subtle);
  color: var(--muted);
}

.event-summary {
  flex: 1;
  font-size: var(--text-caption);
  color: var(--ink);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint {
  text-align: center;
  color: var(--muted);
  font-size: var(--text-caption);
  margin: 0;
}

.error-message {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--negative-subtle);
  color: var(--negative);
  font-size: var(--text-caption);
}

/* ─── Content wrapper & transition ─── */
.perf-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.content-fade-enter-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}

.content-fade-enter-from {
  opacity: 0;
}
</style>
