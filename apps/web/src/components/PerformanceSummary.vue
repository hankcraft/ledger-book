<script setup lang="ts">
import { computed } from "vue";

import type { PerformanceMetrics, PortfolioSummary } from "@ledger-book/contracts";

import { formatCurrency, formatPercent } from "../lib/format";

const props = defineProps<{
  closingValue: number;
  metrics: PerformanceMetrics;
  portfolio: PortfolioSummary;
  warnings: readonly string[];
}>();

const metricItems = computed(() => [
  { label: "XIRR", note: "資金進出後的年化報酬", value: formatPercent(props.metrics.xirr) },
  { label: "TWR", note: "排除資金時點的績效", value: formatPercent(props.metrics.twr) },
  {
    label: props.portfolio.benchmarkSymbol,
    note: "同期基準報酬",
    value: formatPercent(props.metrics.benchmarkReturn),
  },
  {
    label: "期末資產",
    note: "所選估值日的總資產",
    value: formatCurrency(props.closingValue, props.portfolio.baseCurrency),
  },
]);
</script>

<template>
  <section class="performance-summary" aria-labelledby="performance-heading">
    <div class="section-heading">
      <p class="eyebrow">績效快照</p>
      <h2 id="performance-heading">所選期間的績效快照</h2>
    </div>

    <dl class="metrics">
      <div v-for="item in metricItems" :key="item.label" class="metric">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
        <p>{{ item.note }}</p>
      </div>
    </dl>

    <ul v-if="warnings.length" class="warnings" aria-label="績效計算提醒">
      <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
    </ul>
  </section>
</template>

<style scoped>
.performance-summary {
  padding: var(--space-6);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.section-heading h2,
.section-heading p {
  margin: 0;
}

.section-heading h2 {
  margin-top: var(--space-1);
  color: var(--ink);
  font-size: var(--text-heading);
  font-weight: 600;
  line-height: 1.5;
}

.eyebrow {
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: var(--space-6) 0 0;
}

.metric {
  min-width: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}

.metric dt,
.metric dd,
.metric p {
  margin: 0;
}

.metric dt {
  color: var(--muted);
  font-size: var(--text-meta);
  font-weight: 700;
}

.metric dd {
  margin-top: var(--space-2);
  color: var(--ink);
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.metric p {
  margin-top: var(--space-2);
  color: var(--muted);
  font-size: var(--text-meta);
  line-height: 1.5;
}

.warnings {
  margin: var(--space-6) 0 0;
  padding: var(--space-3) 0 0 var(--space-6);
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: var(--text-meta);
  line-height: 1.5;
}

@media (min-width: 48rem) {
  .metrics {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 24rem) {
  .metrics {
    grid-template-columns: 1fr;
  }
}
</style>
