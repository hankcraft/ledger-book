<script setup lang="ts">
import type { Holding } from "@ledger-book/contracts";

import { formatCurrency, formatPercent } from "../lib/format";

defineProps<{
  holdings: readonly Holding[];
  selectedSecurityId: string;
}>();

const emit = defineEmits<{
  selectHolding: [securityId: string];
}>();

function changeClass(value: number): string {
  return value >= 0 ? "change--positive" : "change--negative";
}
</script>

<template>
  <section class="holdings-list" aria-labelledby="holdings-heading">
    <div class="section-heading">
      <p class="eyebrow">持倉</p>
      <h2 id="holdings-heading">選擇標的查看當時資料</h2>
    </div>

    <ul class="holdings">
      <li v-for="holding in holdings" :key="holding.securityId">
        <button
          class="holding"
          :class="{ 'holding--selected': holding.securityId === selectedSecurityId }"
          type="button"
          :aria-pressed="holding.securityId === selectedSecurityId"
          @click="emit('selectHolding', holding.securityId)"
        >
          <span class="holding-identity">
            <strong>{{ holding.symbol }}</strong>
            <span>{{ holding.name }}</span>
          </span>
          <span class="holding-value">
            <strong>{{ formatCurrency(holding.marketValue) }}</strong>
            <span :class="changeClass(holding.changePercent)">
              {{ formatPercent(holding.changePercent) }}
            </span>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.holdings-list {
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

.holdings {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

.holding {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-3);
  color: var(--ink);
  background: var(--surface);
  text-align: left;
  transition:
    background 120ms ease-out,
    border-color 120ms ease-out,
    transform 80ms ease-out;
}

.holding--selected {
  border-color: var(--accent);
  background: var(--primary-subtle);
}

@media (hover: hover) {
  .holding:hover {
    border-color: var(--accent);
    background: var(--primary-subtle);
  }
}

.holding:active {
  transform: scale(0.99);
}

.holding-identity,
.holding-value {
  display: grid;
  gap: var(--space-1);
}

.holding-identity span,
.holding-value span {
  color: var(--muted);
  font-size: var(--text-meta);
}

.holding-value {
  text-align: right;
}

.holding-value strong {
  font-variant-numeric: tabular-nums;
}

.change--positive {
  color: var(--positive) !important;
}

.change--negative {
  color: var(--negative) !important;
}
</style>
