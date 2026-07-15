<script setup lang="ts">
import { computed } from "vue";
import type { PerformanceTimelinePoint } from "../services/types";

const props = defineProps<{
  points: PerformanceTimelinePoint[];
  selectedDate: string | null;
}>();

const emit = defineEmits<{
  selectPoint: [date: string];
}>();

const PADDING = { top: 20, right: 16, bottom: 32, left: 44 };
const WIDTH = 480;
const HEIGHT = 200;
const chartW = WIDTH - PADDING.left - PADDING.right;
const chartH = HEIGHT - PADDING.top - PADDING.bottom;

const yRange = computed(() => {
  if (props.points.length === 0) return { min: -5, max: 5 };
  const all = props.points.flatMap((p) => [p.portfolioReturn, p.benchmarkReturn]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const margin = (max - min) * 0.15 || 2;
  return { min: min - margin, max: max + margin };
});

function toX(index: number): number {
  if (props.points.length <= 1) return PADDING.left;
  return PADDING.left + (index / (props.points.length - 1)) * chartW;
}

function toY(value: number): number {
  const { min, max } = yRange.value;
  const ratio = (value - min) / (max - min);
  return PADDING.top + chartH * (1 - ratio);
}

const portfolioPath = computed(() => {
  return props.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.portfolioReturn)}`)
    .join(" ");
});

const benchmarkPath = computed(() => {
  return props.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.benchmarkReturn)}`)
    .join(" ");
});

const yTicks = computed(() => {
  const { min, max } = yRange.value;
  const step = (max - min) / 4;
  return Array.from({ length: 5 }, (_, i) => {
    const value = min + step * i;
    return { value, y: toY(value), label: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%` };
  });
});

const xLabels = computed(() => {
  if (props.points.length <= 2)
    return props.points.map((p, i) => ({ x: toX(i), label: p.date.slice(5) }));
  const step = Math.max(1, Math.floor(props.points.length / 5));
  const labels: Array<{ x: number; label: string }> = [];
  for (let i = 0; i < props.points.length; i += step) {
    labels.push({ x: toX(i), label: props.points[i]!.date.slice(5) });
  }
  return labels;
});

const zeroY = computed(() => toY(0));
</script>

<template>
  <svg
    class="chart"
    :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="績效走勢圖"
  >
    <!-- Grid -->
    <line
      v-for="tick in yTicks"
      :key="tick.value"
      :x1="PADDING.left"
      :y1="tick.y"
      :x2="WIDTH - PADDING.right"
      :y2="tick.y"
      class="grid-line"
    />

    <!-- Zero line -->
    <line
      :x1="PADDING.left"
      :y1="zeroY"
      :x2="WIDTH - PADDING.right"
      :y2="zeroY"
      class="zero-line"
    />

    <!-- Y labels -->
    <text
      v-for="tick in yTicks"
      :key="'lbl-' + tick.value"
      :x="PADDING.left - 6"
      :y="tick.y + 4"
      class="axis-label"
      text-anchor="end"
    >
      {{ tick.label }}
    </text>

    <!-- X labels -->
    <text
      v-for="lbl in xLabels"
      :key="'x-' + lbl.label"
      :x="lbl.x"
      :y="HEIGHT - 6"
      class="axis-label"
      text-anchor="middle"
    >
      {{ lbl.label }}
    </text>

    <!-- Benchmark line -->
    <path :d="benchmarkPath" class="line-benchmark" fill="none" />

    <!-- Portfolio line -->
    <path :d="portfolioPath" class="line-portfolio" fill="none" />

    <!-- Clickable markers -->
    <circle
      v-for="(point, i) in points"
      :key="point.date"
      :cx="toX(i)"
      :cy="toY(point.portfolioReturn)"
      :r="selectedDate === point.date ? 5 : 3"
      :class="['marker', { selected: selectedDate === point.date }]"
      @click="emit('selectPoint', point.date)"
    />
  </svg>
</template>

<style scoped>
.chart {
  width: 100%;
  height: auto;
  max-height: 220px;
}

.grid-line {
  stroke: var(--line);
  stroke-width: 0.5;
  stroke-dasharray: 2 2;
}

.zero-line {
  stroke: var(--muted);
  stroke-width: 0.75;
  stroke-dasharray: 4 2;
}

.axis-label {
  font-size: 9px;
  fill: var(--muted);
  font-family: inherit;
}

.line-portfolio {
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line-benchmark {
  stroke: var(--muted);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 4 3;
}

.marker {
  fill: var(--accent);
  cursor: pointer;
  transition: r 0.15s;
}

.marker:hover {
  r: 5;
}

.marker.selected {
  fill: var(--action-primary);
  stroke: var(--surface);
  stroke-width: 2;
}
</style>
