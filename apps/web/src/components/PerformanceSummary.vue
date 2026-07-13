<script setup lang="ts">
import { computed } from "vue";

import type { PerformanceMetrics } from "@ledger-book/contracts";

import { formatPercent } from "../lib/format";

const props = defineProps<{
  metrics: PerformanceMetrics;
  warnings: readonly string[];
}>();

const metricItems = computed(() => [
  { label: "XIRR", note: "資金進出後的年化報酬", value: formatPercent(props.metrics.xirr) },
  { label: "TWR", note: "排除資金時點的績效", value: formatPercent(props.metrics.twr) },
  { label: "0050", note: "同期基準報酬", value: formatPercent(props.metrics.benchmarkReturn) },
]);
</script>

<template>
  <section class="performance-summary" aria-labelledby="performance-heading">
    <div class="section-heading">
      <p class="eyebrow">績效快照</p>
      <h2 id="performance-heading">回報不只看帳面漲跌</h2>
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
  padding: 1.5rem;
  border: 1px solid var(--line);
  background: var(--surface);
}

.section-heading h2,
.section-heading p {
  margin: 0;
}

.section-heading h2 {
  margin-top: 0.25rem;
  color: var(--ink);
  font-family: "Iowan Old Style", "Noto Serif TC", serif;
  font-size: 1.5rem;
  font-weight: 600;
}

.eyebrow {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 1.5rem 0 0;
}

.metric {
  min-width: 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line);
}

.metric dt,
.metric dd,
.metric p {
  margin: 0;
}

.metric dt {
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.metric dd {
  margin-top: 0.375rem;
  color: var(--ink);
  font-size: clamp(1.125rem, 4vw, 1.875rem);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.metric p {
  margin-top: 0.5rem;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.warnings {
  margin: 1.25rem 0 0;
  padding: 0.75rem 0 0 1.25rem;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.8125rem;
  line-height: 1.5;
}

@media (max-width: 24rem) {
  .metrics {
    grid-template-columns: 1fr;
  }
}
</style>
