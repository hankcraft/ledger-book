<script setup lang="ts">
import type { ScenarioData } from "../types";
defineProps<{ data: ScenarioData }>();
</script>
<template>
  <div class="sc">
    <div class="badge">🔀 情境分析</div>
    <div class="grid">
      <div v-for="s in data.scenarios" :key="s.id" class="card">
        <h4 class="title">{{ s.title }}</h4>
        <span
          class="likelihood"
          :class="s.likelihood === '高' ? 'high' : s.likelihood === '中' ? 'mid' : 'low'"
          >可能性：{{ s.likelihood }}</span
        >
        <p class="desc">{{ s.description }}</p>
        <div class="action"><strong>建議：</strong>{{ s.action }}</div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.sc {
  margin-top: var(--space-2);
}
.badge {
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--accent);
  margin-bottom: var(--space-3);
}
.grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
}
@media (min-width: 440px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}
.title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-caption);
  font-weight: 600;
}
.likelihood {
  display: inline-block;
  font-size: var(--text-small);
  font-weight: 600;
  padding: 2px var(--space-2);
  border-radius: var(--radius-control);
  margin-bottom: var(--space-2);
}
.high {
  background: var(--danger-subtle);
  color: var(--danger);
}
.mid {
  background: var(--warning-subtle);
  color: var(--warning);
}
.low {
  background: var(--success-subtle);
  color: var(--positive);
}
.desc {
  margin: 0;
  font-size: var(--text-small);
  color: var(--muted);
  line-height: 1.5;
  flex: 1;
}
.action {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
  font-size: var(--text-small);
}
.action strong {
  color: var(--accent);
}
</style>
