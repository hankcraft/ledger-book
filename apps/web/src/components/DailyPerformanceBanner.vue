<script setup lang="ts">
import { computed } from "vue";
import { TrendingUp, TrendingDown } from "lucide-vue-next";

const props = defineProps<{
  portfolioReturn: number;
  benchmarkReturn: number;
}>();

const diff = computed(() => props.portfolioReturn - props.benchmarkReturn);
const isPositive = computed(() => props.portfolioReturn >= 0);
const isAhead = computed(() => diff.value > 0);

function formatReturn(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

const diffText = computed(() => {
  const absDiff = Math.abs(diff.value).toFixed(1);
  if (diff.value > 0) return `高於大盤 ${absDiff}%`;
  if (diff.value < 0) return `落後大盤 ${absDiff}%`;
  return "與大盤持平";
});
</script>

<template>
  <div class="banner">
    <div class="portfolio-row">
      <component :is="isPositive ? TrendingUp : TrendingDown" :size="18" class="trend-icon" />
      <span class="portfolio-return" :class="{ positive: isPositive, negative: !isPositive }">
        今日 {{ formatReturn(portfolioReturn) }}
      </span>
    </div>
    <div class="detail-row">
      <span class="benchmark">大盤 {{ formatReturn(benchmarkReturn) }}</span>
      <span class="diff" :class="{ ahead: isAhead, behind: !isAhead }">{{ diffText }}</span>
    </div>
  </div>
</template>

<style scoped>
.banner {
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.portfolio-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.trend-icon {
  flex-shrink: 0;
}

.portfolio-return {
  font-size: var(--text-large);
  font-weight: 700;
}

.portfolio-return.positive {
  color: var(--positive);
}

.portfolio-return.negative {
  color: var(--negative);
}

.detail-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-caption);
}

.benchmark {
  color: var(--muted);
}

.diff {
  font-weight: 500;
}

.diff.ahead {
  color: var(--positive);
}

.diff.behind {
  color: var(--negative);
}
</style>
