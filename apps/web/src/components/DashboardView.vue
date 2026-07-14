<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from "vue";

import type {
  Holding,
  LedgerEntry,
  ReadyDashboard,
  TimeTravelReport,
} from "@ledger-book/contracts";

import AssetTimeline from "./AssetTimeline.vue";
import LedgerList from "./LedgerList.vue";
import PerformanceSummary from "./PerformanceSummary.vue";
import TimeTravelPanel from "./TimeTravelPanel.vue";
import { formatDate } from "../lib/format";

const props = defineProps<{
  availableDates: readonly string[];
  dashboard: ReadyDashboard;
  dashboardBusy: boolean;
  dashboardError: string | null;
  ledgerEntries: readonly LedgerEntry[];
  ledgerError: string | null;
  ledgerLoading: boolean;
  report: TimeTravelReport | null;
  reportError: string | null;
  reportPhase: "error" | "idle" | "loading";
  selectedDate: string;
  selectedSecurityId: string;
}>();

const emit = defineEmits<{
  retryDashboard: [];
  retryLedger: [];
  retryReport: [];
  selectDate: [date: string];
  selectHolding: [securityId: string];
}>();

const selectedHolding = computed<Holding | null>(
  () =>
    props.dashboard.holdings.find((holding) => holding.securityId === props.selectedSecurityId) ??
    null,
);

const heading = useTemplateRef<HTMLHeadingElement>("heading");
const workbenchView = shallowRef<"ledger" | "performance">("performance");

function selectDate(event: Event): void {
  if (event.target instanceof HTMLSelectElement) {
    emit("selectDate", event.target.value);
  }
}

function focusHeading(): void {
  heading.value?.focus();
}

defineExpose({ focusHeading });
</script>

<template>
  <section class="dashboard" :aria-busy="dashboardBusy">
    <header class="dashboard-header">
      <div class="dashboard-introduction">
        <p class="eyebrow">
          {{ dashboard.portfolio.benchmarkSymbol }} 基準 · {{ dashboard.portfolio.baseCurrency }}
        </p>
        <h1 ref="heading" tabindex="-1">{{ dashboard.portfolio.name }}</h1>
        <p class="dashboard-purpose">檢視所選估值日的資產、績效與客觀回溯資料。</p>
      </div>
      <button
        class="refresh"
        type="button"
        :disabled="dashboardBusy"
        @click="emit('retryDashboard')"
      >
        {{ dashboardBusy ? "更新中" : "重新整理" }}
      </button>
    </header>

    <p v-if="dashboardError" class="dashboard-error" role="alert">{{ dashboardError }}</p>

    <section class="dashboard-workbench" :data-workbench-view="workbenchView">
      <div class="workbench-switch" role="group" aria-label="工作檯視圖">
        <button
          type="button"
          :aria-pressed="workbenchView === 'performance'"
          @click="workbenchView = 'performance'"
        >
          績效
        </button>
        <button
          type="button"
          :aria-pressed="workbenchView === 'ledger'"
          @click="workbenchView = 'ledger'"
        >
          帳本
        </button>
      </div>
      <LedgerList
        class="workbench-panel workbench-panel--ledger"
        :entries="ledgerEntries"
        :error="ledgerError"
        :holdings="dashboard.holdings"
        :loading="ledgerLoading"
        :selected-security-id="selectedSecurityId"
        @retry="emit('retryLedger')"
        @select-holding="emit('selectHolding', $event)"
      />
      <aside class="performance-pane workbench-panel workbench-panel--performance">
        <section class="valuation-controls" aria-labelledby="valuation-heading">
          <div>
            <p class="eyebrow">計算範圍</p>
            <h2 id="valuation-heading">估值日</h2>
          </div>
          <label class="valuation-select">
            <span>從已載入的估值日選擇</span>
            <select :value="selectedDate" @change="selectDate">
              <option v-for="date in availableDates" :key="date" :value="date">
                {{ formatDate(date) }}
              </option>
            </select>
          </label>
          <p class="valuation-helper">績效與回溯資料會同步更新至此日期；帳本保留完整交易歷史。</p>
        </section>

        <PerformanceSummary
          compact
          :closing-value="dashboard.latestSnapshot.marketValue"
          :metrics="dashboard.metrics"
          :portfolio="dashboard.portfolio"
          :warnings="dashboard.warnings"
        />

        <AssetTimeline
          :benchmark-symbol="dashboard.benchmark.symbol"
          :loading="dashboardBusy"
          :selected-date="selectedDate"
          :timeline-points="dashboard.timelinePoints"
        />
      </aside>
    </section>

    <TimeTravelPanel
      :as-of-date="selectedDate"
      :error="reportError"
      :holding="selectedHolding"
      :phase="reportPhase"
      :report="report"
      @retry="emit('retryReport')"
    />

    <p class="dashboard-method">
      績效以不可變示範帳本與預載歷史價格計算；回溯摘要只引用所選日期以前的資料。
    </p>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  width: 100%;
  gap: var(--space-3);
}

.dashboard-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.dashboard-header h1,
.dashboard-header p {
  margin: 0;
}

.dashboard-header h1 {
  margin-top: var(--space-1);
  color: var(--ink);
  font-size: var(--text-heading);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.5;
}

.dashboard-purpose {
  max-width: 42rem;
  margin: var(--space-2) 0 0;
  color: var(--muted);
  line-height: 1.5;
}

.eyebrow {
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.refresh {
  flex: 0 0 auto;
  border: 1px solid var(--action-primary);
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-4);
  color: var(--action-primary);
  background: var(--surface);
  font-size: var(--text-meta);
  font-weight: 700;
  transition:
    background 120ms ease-out,
    color 120ms ease-out,
    transform 80ms ease-out;
}

@media (hover: hover) {
  .refresh:hover:not(:disabled) {
    color: var(--on-ink);
    background: var(--action-primary);
  }
}

.refresh:active:not(:disabled) {
  background: var(--action-active);
  transform: scale(0.98);
}

.refresh:disabled {
  cursor: wait;
  opacity: 0.6;
}

.dashboard-error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--danger);
  border-radius: var(--radius-control);
  color: var(--danger);
  background: var(--danger-subtle);
  font-size: var(--text-meta);
}

.valuation-controls {
  display: grid;
  gap: var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  background: var(--surface);
}

.performance-pane {
  display: grid;
  gap: var(--space-3);
}

.valuation-controls h2,
.valuation-controls p {
  margin: 0;
}

.valuation-controls h2 {
  margin-top: var(--space-1);
  font-size: var(--text-heading);
  font-weight: 600;
}

.valuation-select {
  display: grid;
  gap: var(--space-1);
  color: var(--muted);
  font-size: var(--text-meta);
  font-weight: 700;
}

.valuation-select select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-3);
  color: var(--ink);
  background: var(--surface);
}

.valuation-helper {
  color: var(--muted);
  font-size: var(--text-meta);
  line-height: 1.5;
}

.dashboard-workbench {
  display: grid;
  gap: var(--space-3);
}

.workbench-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: var(--space-2);
  background: var(--surface);
}

.workbench-switch button {
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  color: var(--muted);
  background: var(--surface);
  font-weight: 700;
}

.workbench-switch button[aria-pressed="true"] {
  border-color: var(--accent);
  color: var(--action-primary);
  background: var(--primary-subtle);
}

.workbench-panel {
  min-width: 0;
}

.dashboard-workbench[data-workbench-view="ledger"] .workbench-panel--performance,
.dashboard-workbench[data-workbench-view="performance"] .workbench-panel--ledger {
  display: none;
}

.dashboard-method {
  margin: var(--space-2) 0 0;
  color: var(--muted);
  font-size: var(--text-meta);
  line-height: 1.5;
}

@media (min-width: 47.5625rem) {
  .workbench-switch {
    display: none;
  }

  .workbench-panel {
    display: block !important;
  }

  .performance-pane.workbench-panel {
    display: grid !important;
  }
}

@media (min-width: 70.0625rem) {
  .dashboard-workbench {
    grid-template-columns: minmax(0, 1.35fr) minmax(26.25rem, 1fr);
    align-items: start;
  }
}

@media (max-width: 30rem) {
  .dashboard-header {
    align-items: start;
    flex-direction: column;
  }
}
</style>
