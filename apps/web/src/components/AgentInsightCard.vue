<script setup lang="ts">
import type { InsightData } from "../types";
defineProps<{ data: InsightData }>();
</script>
<template>
  <div class="card">
    <div class="header">
      <span class="badge">📊 洞察</span>
      <h3 class="title">{{ data.title }}</h3>
    </div>
    <div class="comparison">
      <div class="metric">
        <span class="label">你的持倉</span
        ><span class="value negative">{{ data.portfolioChange }}</span>
      </div>
      <div class="vs">vs</div>
      <div class="metric">
        <span class="label">大盤</span><span class="value muted">{{ data.marketChange }}</span>
      </div>
    </div>
    <ul class="breakdown">
      <li v-for="item in data.breakdown" :key="item.label" class="row">
        <span class="row-label">{{ item.label }}</span>
        <span class="row-value">{{ item.value }}</span>
        <span v-if="item.note" class="row-note">{{ item.note }}</span>
      </li>
    </ul>
  </div>
</template>
<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-top: var(--space-2);
  box-shadow: var(--shadow-card);
}
.header {
  margin-bottom: var(--space-3);
}
.badge {
  display: inline-block;
  font-size: var(--text-small);
  color: var(--accent);
  font-weight: 600;
  margin-bottom: var(--space-1);
}
.title {
  margin: 0;
  font-size: var(--text-body);
  font-weight: 600;
}
.comparison {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--neutral-subtle);
  border-radius: var(--radius-control);
  margin-bottom: var(--space-3);
}
.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}
.label {
  font-size: var(--text-small);
  color: var(--muted);
  margin-bottom: var(--space-1);
}
.value {
  font-size: var(--text-heading);
  font-weight: 700;
}
.negative {
  color: var(--negative);
}
.muted {
  color: var(--muted);
}
.vs {
  font-size: var(--text-caption);
  color: var(--muted);
}
.breakdown {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--line);
  font-size: var(--text-caption);
}
.row:last-child {
  border-bottom: none;
}
.row-label {
  flex: 1;
}
.row-value {
  font-weight: 600;
  color: var(--negative);
}
.row-note {
  color: var(--muted);
  font-size: var(--text-small);
}
</style>
