<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { ChevronDown } from "lucide-vue-next";

import { useApi } from "../services";
import type { Holding } from "../types";
import type { HoldingTrade } from "../services/types";

const props = defineProps<{ holding: Holding }>();

const api = useApi();
const expanded = ref(false);
const trades = shallowRef<HoldingTrade[]>([]);
const loadingTrades = ref(false);
const loaded = ref(false);

async function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && !loaded.value) {
    loadingTrades.value = true;
    try {
      trades.value = await api.context.getHoldingTrades(props.holding.id);
    } catch {
      // Silently fail — will show "no trades" state
    } finally {
      loadingTrades.value = false;
      loaded.value = true;
    }
  }
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${Number(parts[1])}/${Number(parts[2])}`;
  return dateStr;
}
</script>

<template>
  <div class="hc" :class="{ expanded }" @click="toggle">
    <div class="top">
      <span class="name">{{ holding.name }}</span>
      <span class="pl" :class="holding.plPercent >= 0 ? 'pos' : 'neg'">
        {{ holding.plPercent >= 0 ? "+" : "" }}{{ holding.plPercent }}%
      </span>
    </div>
    <div class="bar-row">
      <div class="bar"><div class="fill" :style="{ width: holding.weight + '%' }"></div></div>
      <span class="weight">{{ holding.weight }}%</span>
    </div>
    <div class="bot">
      <span class="cost">成本 ${{ holding.cost.toLocaleString() }}</span>
      <span v-if="holding.purchaseDate" class="date">{{ holding.purchaseDate }}</span>
      <ChevronDown class="chevron" :class="{ rotated: expanded }" :size="14" />
    </div>

    <!-- Trade history panel -->
    <Transition name="trades-slide">
      <div v-if="expanded" class="trades-panel" @click.stop>
        <div v-if="loadingTrades" class="trades-loading">載入交易紀錄…</div>
        <div v-else-if="trades.length === 0" class="trades-empty">尚無交易紀錄</div>
        <ul v-else class="trades-list">
          <li v-for="trade in trades" :key="trade.id" class="trade-item">
            <span class="trade-date">{{ formatDate(trade.date) }}</span>
            <span class="trade-type" :class="trade.type === 'buy' ? 'trade-buy' : 'trade-sell'">
              {{ trade.type === "buy" ? "買" : "賣" }}
            </span>
            <span class="trade-qty">{{ trade.quantity.toLocaleString() }} 股</span>
            <span class="trade-price">@{{ trade.unitPrice.toLocaleString() }}</span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hc {
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition:
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out),
    border-color var(--duration-fast);
}

.hc:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.hc.expanded {
  border-color: var(--action-primary);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.name {
  font-weight: 600;
}

.pl {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}

.pos {
  background: var(--positive-subtle);
  color: var(--positive);
}

.neg {
  background: var(--negative-subtle);
  color: var(--negative);
}

.bar-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.bar {
  flex: 1;
  height: 8px;
  background: var(--neutral-subtle);
  border-radius: 4px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.3s;
}

.weight {
  font-size: var(--text-caption);
  color: var(--muted);
  min-width: 2.5rem;
  text-align: right;
}

.bot {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.cost {
  font-size: var(--text-caption);
  color: var(--muted);
}

.date {
  font-size: var(--text-caption);
  color: var(--muted);
}

.chevron {
  margin-left: auto;
  color: var(--muted);
  transition: transform var(--duration-fast);
}

.chevron.rotated {
  transform: rotate(180deg);
}

/* ─── Trade History Panel ─── */
.trades-panel {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}

.trades-loading,
.trades-empty {
  font-size: var(--text-caption);
  color: var(--muted);
  text-align: center;
  padding: var(--space-2) 0;
}

.trades-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.trade-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-caption);
}

.trade-date {
  color: var(--muted);
  min-width: 3rem;
}

.trade-type {
  font-weight: 600;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.trade-buy {
  background: var(--positive-subtle);
  color: var(--positive);
}

.trade-sell {
  background: var(--negative-subtle);
  color: var(--negative);
}

.trade-qty {
  color: var(--ink);
}

.trade-price {
  margin-left: auto;
  color: var(--muted);
}

/* ─── Transition ─── */
.trades-slide-enter-active,
.trades-slide-leave-active {
  transition:
    opacity var(--duration-normal),
    max-height var(--duration-normal) var(--ease-out);
  overflow: hidden;
}

.trades-slide-enter-from,
.trades-slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.trades-slide-enter-to,
.trades-slide-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
