<script setup lang="ts">
import type { ContextSummaryData } from "../types";
defineProps<{ data: ContextSummaryData }>();
</script>
<template>
  <div class="context-card" aria-label="對話背景摘要">
    <div class="header">
      <span class="badge">📋 背景</span>
    </div>
    <ul class="items">
      <li class="item">
        <span class="label">持倉</span>
        <span class="value"
          >{{ data.portfolio.totalStocks }} 檔，最大持股 {{ data.portfolio.topHolding }}（{{
            data.portfolio.topWeight
          }}%）</span
        >
      </li>
      <li class="item">
        <span class="label">市況</span>
        <span class="value">{{ data.marketSnapshot }}</span>
      </li>
      <li v-if="data.userProfile" class="item">
        <span class="label">風格</span>
        <span class="value">{{ data.userProfile }}</span>
      </li>
    </ul>
  </div>
</template>
<style scoped>
.context-card {
  background: var(--neutral-subtle);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-2);
}

.header {
  margin-bottom: var(--space-2);
}

.badge {
  font-size: var(--text-small);
  color: var(--muted);
  font-weight: 600;
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--text-caption);
  line-height: var(--leading-relaxed);
}

.label {
  flex-shrink: 0;
  color: var(--muted);
  min-width: 2.5em;
}

.value {
  color: var(--ink);
}
</style>
