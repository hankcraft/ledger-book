<script setup lang="ts">
import type { Holding } from "../types";
defineProps<{ holding: Holding }>();
</script>
<template>
  <div class="hc">
    <div class="top">
      <span class="name">{{ holding.name }}</span
      ><span class="pl" :class="holding.plPercent >= 0 ? 'pos' : 'neg'"
        >{{ holding.plPercent >= 0 ? "+" : "" }}{{ holding.plPercent }}%</span
      >
    </div>
    <div class="bar-row">
      <div class="bar"><div class="fill" :style="{ width: holding.weight + '%' }"></div></div>
      <span class="weight">{{ holding.weight }}%</span>
    </div>
    <div class="bot">
      <span class="cost">成本 ${{ holding.cost.toLocaleString() }}</span>
    </div>
  </div>
</template>
<style scoped>
.hc {
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
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
  font-size: var(--text-small);
  font-weight: 600;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
}
.pos {
  background: var(--success-subtle);
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
  font-size: var(--text-small);
  color: var(--muted);
  min-width: 2.5rem;
  text-align: right;
}
.bot {
  display: flex;
  justify-content: space-between;
}
.cost {
  font-size: var(--text-small);
  color: var(--muted);
}
</style>
