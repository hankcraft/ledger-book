<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from "vue";

import DashboardView from "./components/DashboardView.vue";
import ImportPanel from "./components/ImportPanel.vue";
import { useLedgerBook } from "./composables/useLedgerBook";

const {
  availableDates,
  dashboardBusy,
  dashboardError,
  dashboardFocusRequested,
  clearDashboardFocusRequest,
  importDemo,
  importPhase,
  landingError,
  loadDashboard,
  readyDashboard,
  report,
  reportError,
  reportPhase,
  retryReport,
  selectDate,
  selectedDate,
  selectHolding,
  selectedSecurityId,
} = useLedgerBook();

const dashboardView = useTemplateRef<InstanceType<typeof DashboardView>>("dashboardView");

watch(dashboardFocusRequested, async (requested) => {
  if (!requested || !readyDashboard.value) {
    return;
  }

  await nextTick();
  dashboardView.value?.focusHeading();
  clearDashboardFocusRequest();
});
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳至主要內容</a>
    <header class="site-header">
      <a class="brand" href="/" aria-label="股票帳本首頁">Ledger Book</a>
      <p class="site-subtitle">投資記錄與客觀回溯</p>
    </header>

    <main id="main-content" class="main-content">
      <DashboardView
        v-if="readyDashboard"
        ref="dashboardView"
        :dashboard="readyDashboard"
        :dashboard-busy="dashboardBusy"
        :dashboard-error="dashboardError"
        :available-dates="availableDates"
        :report="report"
        :report-error="reportError"
        :report-phase="reportPhase"
        :selected-date="selectedDate"
        :selected-security-id="selectedSecurityId"
        @retry-dashboard="loadDashboard"
        @retry-report="retryReport"
        @select-date="selectDate"
        @select-holding="selectHolding"
      />
      <ImportPanel v-else :error="landingError" :phase="importPhase" @import="importDemo" />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--canvas);
}

.site-header {
  position: sticky;
  z-index: 1;
  top: 0;
  display: flex;
  min-height: 4.75rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: min(100%, 95rem);
  margin: 0 auto;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--line);
  background: var(--canvas);
}

.brand {
  color: var(--action-primary);
  font-size: var(--text-heading);
  font-weight: 700;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.site-subtitle {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-meta);
}

.main-content {
  display: grid;
  width: min(100%, 95rem);
  min-height: calc(100vh - 4.75rem);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) calc(var(--space-8) * 2);
  place-items: start;
}

@media (min-width: 48rem) {
  .site-header {
    padding-right: var(--space-6);
    padding-left: var(--space-6);
  }

  .main-content {
    padding: calc(var(--space-8) * 1.125) var(--space-6) calc(var(--space-8) * 2.25);
  }
}

@media (max-width: 47.5rem) {
  .site-header {
    position: static;
  }
}
</style>
