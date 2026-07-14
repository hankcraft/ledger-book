<script setup lang="ts">
import { LineChart } from "echarts/charts";
import {
  AriaComponent,
  AxisPointerComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use, type ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";

import type { TimelinePoint } from "@ledger-book/contracts";
import type { EChartsOption } from "echarts";

import { formatCurrency, formatDate } from "../lib/format";

use([
  AriaComponent,
  AxisPointerComponent,
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  LineChart,
  TooltipComponent,
]);

const props = defineProps<{
  benchmarkSymbol: string;
  loading: boolean;
  selectedDate: string;
  timelinePoints: readonly TimelinePoint[];
}>();

const emit = defineEmits<{
  selectDate: [date: string];
}>();

const chartElement = useTemplateRef<HTMLDivElement>("chartElement");
const chart = shallowRef<ECharts | null>(null);
const selectedPoint = computed(
  () =>
    props.timelinePoints.find((point) => point.date === props.selectedDate) ??
    props.timelinePoints.at(-1),
);
const selectedValue = computed(() =>
  selectedPoint.value ? formatCurrency(selectedPoint.value.marketValue) : "—",
);
let resizeObserver: ResizeObserver | undefined;

function renderChart(): void {
  const instance = chart.value;
  if (!instance) {
    return;
  }

  const option: EChartsOption = {
    animation: false,
    aria: { enabled: true },
    grid: { top: 16, right: 8, bottom: 44, left: 68 },
    legend: {
      bottom: 0,
      data: ["投資組合", `${props.benchmarkSymbol} 基準`],
      icon: "roundRect",
      itemHeight: 3,
      itemWidth: 20,
      textStyle: { color: "#595959", fontSize: 14 },
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      axisLabel: {
        color: "#595959",
        formatter: (value: string) => value.slice(5).replace("-", "/"),
      },
      axisLine: { lineStyle: { color: "#e5e7eb" } },
      axisTick: { show: false },
      boundaryGap: false,
      data: props.timelinePoints.map((point) => point.date),
      type: "category",
    },
    yAxis: {
      axisLabel: { color: "#595959", formatter: (value: number) => formatCurrency(value) },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#e5e7eb" } },
      type: "value",
    },
    series: [
      {
        data: props.timelinePoints.map((point) => point.marketValue),
        itemStyle: { color: "#0b8be3" },
        lineStyle: { color: "#0b8be3", width: 3 },
        name: "投資組合",
        showSymbol: true,
        symbolSize: 6,
        type: "line",
      },
      {
        data: props.timelinePoints.map((point) => point.benchmarkValue),
        itemStyle: { color: "#8b968f" },
        lineStyle: { color: "#8b968f", width: 3 },
        name: `${props.benchmarkSymbol} 基準`,
        showSymbol: true,
        symbolSize: 6,
        type: "line",
      },
    ],
  };

  instance.setOption(option, { notMerge: true });
}

onMounted(() => {
  if (!chartElement.value) {
    return;
  }

  chart.value = init(chartElement.value, undefined, { renderer: "canvas" });
  chart.value.on("click", (event) => {
    if (event.componentType !== "series" || typeof event.dataIndex !== "number") {
      return;
    }

    const point = props.timelinePoints[event.dataIndex];
    if (point) {
      emit("selectDate", point.date);
    }
  });
  resizeObserver = new ResizeObserver(() => chart.value?.resize());
  resizeObserver.observe(chartElement.value);
  renderChart();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart.value?.dispose();
  chart.value = null;
});

watch(() => [props.benchmarkSymbol, props.timelinePoints] as const, renderChart);
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

    <div
      ref="chartElement"
      class="chart"
      role="img"
      :aria-label="`投資組合與 ${benchmarkSymbol} 基準走勢；點選資料點可切換估值日。`"
      aria-describedby="chart-summary"
    ></div>

    <p id="chart-summary" class="sr-only">圖表資料可由下方的「查看圖表資料」展開閱讀。</p>

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
  height: 15rem;
  margin-top: var(--space-4);
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
