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

const sentimentLabel: Record<string, string> = {
  bullish: "偏多",
  bearish: "偏空",
  neutral: "中性",
};

const sentimentClass: Record<string, string> = {
  bullish: "sentiment-bullish",
  bearish: "sentiment-bearish",
  neutral: "sentiment-neutral",
};
</script>

<template>
  <div class="detail-card">
    <div class="detail-header">
      <component :is="iconMap[event.type]" :size="16" class="detail-icon" />
      <span class="detail-type">{{ labelMap[event.type] }}</span>
      <span v-if="event.sentiment" class="sentiment-badge" :class="sentimentClass[event.sentiment]">
        {{ sentimentLabel[event.sentiment] }}
      </span>
      <span class="detail-date">{{ event.date }}</span>
    </div>

    <!-- Trade details table -->
    <div v-if="event.trades && event.trades.length > 0" class="trades-table">
      <div v-for="trade in event.trades" :key="`${trade.symbol}-${trade.type}`" class="trade-row">
        <span class="trade-name">{{ trade.name }}</span>
        <span class="trade-qty">{{ trade.quantity.toLocaleString() }} 股</span>
        <span class="trade-price">@{{ trade.unitPrice }}</span>
        <span class="trade-amount">${{ trade.amount.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Fallback summary if no trades detail -->
    <p v-else class="detail-summary">{{ event.summary }}</p>
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
  gap: var(--space-3);
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

.sentiment-badge {
  font-size: var(--text-xs, 0.6875rem);
  font-weight: 600;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm, 4px);
}

.sentiment-bullish {
  background: var(--positive-subtle);
  color: var(--positive);
}

.sentiment-bearish {
  background: var(--negative-subtle);
  color: var(--negative);
}

.sentiment-neutral {
  background: var(--neutral-subtle);
  color: var(--muted);
}

.detail-date {
  margin-left: auto;
  font-size: var(--text-small);
  color: var(--muted);
}

.trades-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.trade-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--line);
  font-size: var(--text-caption);
}

.trade-row:last-child {
  border-bottom: none;
}

.trade-name {
  font-weight: 500;
  color: var(--ink);
}

.trade-qty {
  color: var(--muted);
  text-align: right;
}

.trade-price {
  color: var(--muted);
  text-align: right;
}

.trade-amount {
  font-weight: 600;
  color: var(--ink);
  text-align: right;
}

.detail-summary {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--muted);
  line-height: 1.5;
}
</style>
