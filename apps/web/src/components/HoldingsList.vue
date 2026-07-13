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

.holdings {
  display: grid;
  gap: 0.5rem;
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;
}

.holding {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--line);
  border-radius: 0;
  padding: 0.875rem;
  color: var(--ink);
  background: var(--surface);
  text-align: left;
}

.holding:hover,
.holding--selected {
  border-color: var(--ink);
  background: var(--canvas);
}

.holding-identity,
.holding-value {
  display: grid;
  gap: 0.1875rem;
}

.holding-identity span,
.holding-value span {
  color: var(--muted);
  font-size: 0.8125rem;
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
