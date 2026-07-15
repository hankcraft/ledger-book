<script setup lang="ts">
import { ShoppingCart, TrendingDown, Coins, BarChart3 } from "lucide-vue-next";
import type { TimePointEvent } from "../services/types";

defineProps<{
  event: TimePointEvent;
}>();

const iconMap = {
  buy: ShoppingCart,
  sell: TrendingDown,
  dividend: Coins,
  market: BarChart3,
} as const;

const labelMap = {
  buy: "買進",
  sell: "賣出",
  dividend: "配息",
  market: "市場事件",
} as const;
</script>

<template>
  <div class="detail-card">
    <div class="detail-header">
      <component :is="iconMap[event.type]" :size="16" class="detail-icon" />
      <span class="detail-type">{{ labelMap[event.type] }}</span>
      <span class="detail-date">{{ event.date }}</span>
    </div>
    <p class="detail-summary">{{ event.summary }}</p>
  </div>
</template>

<style scoped>
.detail-card {
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.detail-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.detail-type {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--ink);
}

.detail-date {
  margin-left: auto;
  font-size: var(--text-small);
  color: var(--muted);
}

.detail-summary {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--muted);
  line-height: 1.5;
}
</style>
