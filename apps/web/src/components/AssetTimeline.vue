<script setup lang="ts">
import { computed } from "vue";

import type { TimelinePoint } from "@ledger-book/contracts";

import { createTimelinePath } from "../lib/chart";
import { formatCurrency, formatDate } from "../lib/format";

const props = defineProps<{
  benchmarkSymbol: string;
  loading: boolean;
  selectedDate: string;
  timelinePoints: readonly TimelinePoint[];
}>();

const bounds = { height: 116, width: 328 };
const portfolioPath = computed(() =>
  createTimelinePath(props.timelinePoints, "marketValue", bounds),
);
const benchmarkPath = computed(() =>
  createTimelinePath(props.timelinePoints, "benchmarkValue", bounds),
);
const selectedPoint = computed(
  () =>
    props.timelinePoints.find((point) => point.date === props.selectedDate) ??
    props.timelinePoints.at(-1),
);
const selectedValue = computed(() =>
  selectedPoint.value ? formatCurrency(selectedPoint.value.marketValue) : "—",
);
</script>

<template>
  <section class="asset-timeline" :aria-busy="loading" aria-labelledby="timeline-heading">
    <div class="timeline-header">
      <div>
        <p class="eyebrow">期間績效</p>
        <h2 id="timeline-heading">{{ selectedValue }}</h2>
      </div>
      <p class="timeline-date">截至 {{ formatDate(selectedDate) }}</p>
    </div>

    <svg
      class="chart"
      viewBox="0 0 360 148"
      role="img"
      aria-labelledby="chart-title chart-description"
      aria-describedby="chart-summary"
    >
      <title id="chart-title">投資組合與 {{ benchmarkSymbol }} 基準走勢</title>
      <desc id="chart-description">藍線為投資組合資產，灰線為 {{ benchmarkSymbol }} 基準。</desc>
      <g class="chart-grid" transform="translate(16 16)">
        <line x1="0" x2="328" y1="0" y2="0" />
        <line x1="0" x2="328" y1="58" y2="58" />
        <line x1="0" x2="328" y1="116" y2="116" />
      </g>
      <g transform="translate(16 16)">
        <path class="benchmark-line" :d="benchmarkPath" />
        <path class="portfolio-line" :d="portfolioPath" />
      </g>
    </svg>

    <p id="chart-summary" class="sr-only">圖表資料可由下方的「查看圖表資料」展開閱讀。</p>

    <div class="legend" aria-label="圖表圖例">
      <span
        ><span class="legend-line legend-line--portfolio" aria-hidden="true"></span>投資組合</span
      >
      <span
        ><span class="legend-line legend-line--benchmark" aria-hidden="true"></span
        >{{ benchmarkSymbol }} 基準</span
      >
    </div>

    <details class="chart-data">
      <summary>查看圖表資料</summary>
      <table>
        <caption>
          投資組合與
          {{
            benchmarkSymbol
          }}
          基準歷史資料
        </caption>
        <thead>
          <tr>
            <th scope="col">日期</th>
            <th scope="col">投資組合</th>
            <th scope="col">{{ benchmarkSymbol }} 基準</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="point in timelinePoints" :key="point.date">
            <td>{{ formatDate(point.date) }}</td>
            <td>{{ formatCurrency(point.marketValue) }}</td>
            <td>{{ formatCurrency(point.benchmarkValue) }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </section>
</template>

<style scoped>
.asset-timeline {
  padding: var(--space-6);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.timeline-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
}

.eyebrow,
.timeline-header h2 {
  margin: 0;
}

.eyebrow {
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.timeline-header h2 {
  margin-top: var(--space-1);
  color: var(--ink);
  font-size: var(--text-heading);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.timeline-date {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-meta);
  font-variant-numeric: tabular-nums;
}

.chart {
  display: block;
  width: 100%;
  height: auto;
  margin-top: var(--space-4);
}

.chart-grid line {
  stroke: var(--line);
  stroke-width: 1;
}

.benchmark-line,
.portfolio-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.benchmark-line {
  stroke: var(--benchmark);
}

.portfolio-line {
  stroke: var(--accent);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-1);
  color: var(--muted);
  font-size: var(--text-meta);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.legend-line {
  display: inline-block;
  width: 1.25rem;
  border-top: 0.1875rem solid;
}

.legend-line--portfolio {
  border-color: var(--accent);
}

.legend-line--benchmark {
  border-color: var(--benchmark);
}

.chart-data {
  margin-top: var(--space-4);
  color: var(--muted);
  font-size: var(--text-meta);
}

.chart-data summary {
  width: fit-content;
  color: var(--action-primary);
  cursor: pointer;
  font-weight: 600;
}

.chart-data table {
  width: 100%;
  margin-top: var(--space-3);
  border-collapse: collapse;
  color: var(--ink);
  text-align: left;
}

.chart-data caption {
  margin-bottom: var(--space-2);
  color: var(--muted);
  text-align: left;
}

.chart-data th,
.chart-data td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--line);
}

.chart-data th:not(:first-child),
.chart-data td:not(:first-child) {
  text-align: right;
}

@media (max-width: 30rem) {
  .timeline-header {
    align-items: start;
    flex-direction: column;
  }
}
</style>
