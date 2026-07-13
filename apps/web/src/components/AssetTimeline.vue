<script setup lang="ts">
import { computed } from "vue";

import type { TimelinePoint } from "@ledger-book/contracts";

import { createTimelinePath } from "../lib/chart";
import { formatCurrency, formatDate } from "../lib/format";

const props = defineProps<{
  availableDates: readonly string[];
  loading: boolean;
  selectedDate: string;
  timeline: readonly TimelinePoint[];
}>();

const emit = defineEmits<{
  selectDate: [date: string];
}>();

const bounds = { height: 116, width: 328 };
const portfolioPath = computed(() => createTimelinePath(props.timeline, "marketValue", bounds));
const benchmarkPath = computed(() => createTimelinePath(props.timeline, "benchmarkValue", bounds));
const selectedPoint = computed(
  () => props.timeline.find((point) => point.date === props.selectedDate) ?? props.timeline.at(-1),
);
const selectedValue = computed(() =>
  selectedPoint.value ? formatCurrency(selectedPoint.value.marketValue) : "—",
);

function selectDate(event: Event): void {
  if (event.target instanceof HTMLSelectElement) {
    emit("selectDate", event.target.value);
  }
}
</script>

<template>
  <section class="asset-timeline" :aria-busy="loading" aria-labelledby="timeline-heading">
    <div class="timeline-header">
      <div>
        <p class="eyebrow">資產走勢</p>
        <h2 id="timeline-heading">{{ selectedValue }}</h2>
      </div>
      <label class="date-control">
        <span>估值日</span>
        <select :value="selectedDate" @change="selectDate">
          <option v-for="date in availableDates" :key="date" :value="date">
            {{ formatDate(date) }}
          </option>
        </select>
      </label>
    </div>

    <svg
      class="chart"
      viewBox="0 0 360 148"
      role="img"
      aria-labelledby="chart-title chart-description"
    >
      <title id="chart-title">投資組合與 0050 基準走勢</title>
      <desc id="chart-description">深色線為投資組合資產，淺色線為 0050 基準。</desc>
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

    <div class="legend" aria-label="圖表圖例">
      <span><i class="legend-line legend-line--portfolio" aria-hidden="true"></i>投資組合</span>
      <span><i class="legend-line legend-line--benchmark" aria-hidden="true"></i>0050 基準</span>
    </div>
  </section>
</template>

<style scoped>
.asset-timeline {
  padding: 1.5rem;
  border: 1px solid var(--line);
  background: var(--surface);
}

.timeline-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow,
.timeline-header h2 {
  margin: 0;
}

.eyebrow {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.timeline-header h2 {
  margin-top: 0.25rem;
  color: var(--ink);
  font-size: clamp(1.5rem, 6vw, 2.25rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
}

.date-control {
  display: grid;
  gap: 0.25rem;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.date-control select {
  max-width: 10rem;
  border: 1px solid var(--line);
  border-radius: 0;
  padding: 0.5rem;
  color: var(--ink);
  background: var(--canvas);
}

.chart {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 1rem;
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
  gap: 1rem;
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: 0.8125rem;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
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

@media (max-width: 30rem) {
  .timeline-header {
    align-items: start;
    flex-direction: column;
  }
}
</style>
