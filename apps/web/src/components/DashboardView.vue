<script setup lang="ts">
import { computed } from "vue";

import type { Holding, ReadyDashboard, TimeTravelReport } from "@ledger-book/contracts";

import AssetTimeline from "./AssetTimeline.vue";
import HoldingsList from "./HoldingsList.vue";
import PerformanceSummary from "./PerformanceSummary.vue";
import TimeTravelPanel from "./TimeTravelPanel.vue";

const props = defineProps<{
  availableDates: readonly string[];
  dashboard: ReadyDashboard;
  dashboardBusy: boolean;
  dashboardError: string | null;
  report: TimeTravelReport | null;
  reportError: string | null;
  reportPhase: "error" | "idle" | "loading";
  selectedDate: string;
  selectedSecurityId: string;
}>();

const emit = defineEmits<{
  retryDashboard: [];
  retryReport: [];
  selectDate: [date: string];
  selectHolding: [securityId: string];
}>();

const selectedHolding = computed<Holding | null>(
  () =>
    props.dashboard.holdings.find((holding) => holding.securityId === props.selectedSecurityId) ??
    null,
);
</script>

<template>
  <section class="dashboard" :aria-busy="dashboardBusy">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">
          {{ dashboard.portfolio.benchmarkSymbol }} 基準 · {{ dashboard.portfolio.baseCurrency }}
        </p>
        <h1>{{ dashboard.portfolio.name }}</h1>
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

    <div class="dashboard-grid">
      <PerformanceSummary :metrics="dashboard.metrics" :warnings="dashboard.warnings" />
      <AssetTimeline
        :available-dates="availableDates"
        :loading="dashboardBusy"
        :selected-date="selectedDate"
        :timeline="dashboard.timeline"
        @select-date="emit('selectDate', $event)"
      />
      <HoldingsList
        :holdings="dashboard.holdings"
        :selected-security-id="selectedSecurityId"
        @select-holding="emit('selectHolding', $event)"
      />
      <TimeTravelPanel
        :as-of-date="selectedDate"
        :error="reportError"
        :holding="selectedHolding"
        :phase="reportPhase"
        :report="report"
        @retry="emit('retryReport')"
      />
    </div>
  </section>
</template>

<style scoped>
.dashboard {
  width: min(100%, 70rem);
}

.dashboard-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.dashboard-header h1,
.dashboard-header p {
  margin: 0;
}

.dashboard-header h1 {
  margin-top: 0.25rem;
  color: var(--ink);
  font-family: "Iowan Old Style", "Noto Serif TC", serif;
  font-size: clamp(2rem, 7vw, 3.5rem);
  font-weight: 600;
  letter-spacing: -0.045em;
}

.eyebrow {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.refresh {
  flex: 0 0 auto;
  border: 1px solid var(--ink);
  border-radius: 0;
  padding: 0.5rem 0.75rem;
  color: var(--ink);
  background: transparent;
  font-size: 0.875rem;
  font-weight: 700;
}

.refresh:hover:not(:disabled) {
  color: var(--surface);
  background: var(--ink);
}

.refresh:disabled {
  cursor: wait;
  opacity: 0.6;
}

.dashboard-error {
  margin: 0 0 1rem;
  color: var(--danger);
  font-size: 0.875rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 60rem) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1.15fr) minmax(19rem, 0.85fr);
  }

  .dashboard-grid > :first-child,
  .dashboard-grid > :nth-child(2) {
    grid-column: span 2;
  }
}

@media (max-width: 30rem) {
  .dashboard-header {
    align-items: start;
    flex-direction: column;
  }
}
</style>
