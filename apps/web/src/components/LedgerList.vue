<script setup lang="ts">
import type { LedgerEntry, LedgerEntryType } from "@ledger-book/contracts";

import { formatCurrency, formatDate } from "../lib/format";

const props = defineProps<{
  entries: readonly LedgerEntry[];
  error: string | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const entryLabels: Record<LedgerEntryType, string> = {
  buy: "買進",
  sell: "賣出",
  cash_deposit: "現金存入",
  cash_withdrawal: "現金提領",
  dividend: "股利",
  fee: "費用",
  reversal: "沖回",
};

function cashEffect(entry: LedgerEntry): number {
  return entry.grossCashAmount - entry.feeAmount;
}

function cashEffectClass(entry: LedgerEntry): string {
  return cashEffect(entry) >= 0 ? "cash-effect--positive" : "cash-effect--negative";
}
</script>

<template>
  <section class="ledger-list" :aria-busy="loading" aria-labelledby="ledger-heading">
    <div class="section-heading">
      <p class="eyebrow">帳本</p>
      <h2 id="ledger-heading">不可變交易帳本</h2>
      <p class="ledger-description">所有資金與交易事件依發生順序保留。</p>
    </div>

    <div v-if="error" class="ledger-error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="emit('retry')">重新載入帳本</button>
    </div>

    <div v-else-if="entries.length" class="ledger-table-wrap">
      <table>
        <caption class="sr-only">
          不可變交易帳本
        </caption>
        <thead>
          <tr>
            <th scope="col">日期</th>
            <th scope="col">類型</th>
            <th scope="col">標的</th>
            <th scope="col">數量</th>
            <th scope="col">現金影響</th>
            <th scope="col">費用</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.id">
            <td>{{ formatDate(entry.occurredOn) }}</td>
            <td>{{ entryLabels[entry.entryType] }}</td>
            <td>{{ entry.securityId ?? "—" }}</td>
            <td>{{ entry.quantity?.toLocaleString("zh-TW") ?? "—" }}</td>
            <td :class="cashEffectClass(entry)">{{ formatCurrency(cashEffect(entry)) }}</td>
            <td>{{ formatCurrency(entry.feeAmount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="ledger-loading" aria-live="polite">正在載入交易帳本…</p>
  </section>
</template>

<style scoped>
.ledger-list {
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

.ledger-description,
.ledger-loading {
  margin-top: var(--space-2) !important;
  color: var(--muted);
  font-size: var(--text-meta);
  line-height: 1.5;
}

.ledger-table-wrap {
  overflow-x: auto;
  margin-top: var(--space-6);
}

table {
  width: 100%;
  min-width: 47.5rem;
  border-collapse: collapse;
  color: var(--ink);
  font-size: var(--text-meta);
  text-align: left;
}

th,
td {
  padding: var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

th {
  color: var(--muted);
  font-weight: 700;
}

th:nth-last-child(-n + 3),
td:nth-last-child(-n + 3) {
  text-align: right;
}

.cash-effect--positive {
  color: var(--positive);
}

.cash-effect--negative {
  color: var(--negative);
}

.ledger-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding: var(--space-3);
  border: 1px solid var(--danger);
  border-radius: var(--radius-control);
  color: var(--danger);
  background: var(--danger-subtle);
  font-size: var(--text-meta);
}

.ledger-error p {
  margin: 0;
}

.ledger-error button {
  flex: 0 0 auto;
  border: 1px solid currentColor;
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-3);
  color: var(--danger);
  background: var(--surface);
  font-weight: 700;
}

@media (max-width: 30rem) {
  .ledger-error {
    align-items: start;
    flex-direction: column;
  }
}
</style>
