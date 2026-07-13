<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

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

const heading = useTemplateRef<HTMLHeadingElement>("heading");

function focusHeading(): void {
  heading.value?.focus();
}

defineExpose({ focusHeading });
</script>

<template>
  <section class="dashboard" :aria-busy="dashboardBusy">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">
          {{ dashboard.portfolio.benchmarkSymbol }} 基準 · {{ dashboard.portfolio.baseCurrency }}
        </p>
        <h1 ref="heading" tabindex="-1">{{ dashboard.portfolio.name }}</h1>
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
  gap: var(--space-4);
  margin-bottom: var(--space-6);
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
  margin: 0 0 var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--danger);
  border-radius: var(--radius-control);
  color: var(--danger);
  background: var(--danger-subtle);
  font-size: var(--text-meta);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
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
