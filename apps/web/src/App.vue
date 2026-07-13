<script setup lang="ts">
import DashboardView from "./components/DashboardView.vue";
import ImportPanel from "./components/ImportPanel.vue";
import { useLedgerBook } from "./composables/useLedgerBook";

const {
  availableDates,
  dashboardBusy,
  dashboardError,
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
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="股票帳本首頁">Ledger Book</a>
      <p class="site-subtitle">投資記錄與客觀回溯</p>
    </header>

    <main class="main-content">
      <DashboardView
        v-if="readyDashboard"
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
  padding: 1rem;
  background: var(--canvas);
}

.site-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  width: min(100%, 70rem);
  margin: 0 auto;
  padding-bottom: 2rem;
}

.brand {
  color: var(--ink);
  font-family: "Iowan Old Style", "Noto Serif TC", serif;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  text-decoration: none;
}

.site-subtitle {
  margin: 0;
  color: var(--muted);
  font-size: 0.8125rem;
}

.main-content {
  display: grid;
  width: min(100%, 70rem);
  min-height: calc(100vh - 5rem);
  margin: 0 auto;
  place-items: start;
}

@media (min-width: 48rem) {
  .app-shell {
    padding: 1.5rem 2rem;
  }

  .site-header {
    padding-bottom: 3.5rem;
  }
}
</style>
