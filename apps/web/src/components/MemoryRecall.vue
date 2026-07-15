<script setup lang="ts">
import type { MemoryRecallData } from "../types";
defineProps<{ data: MemoryRecallData }>();
</script>
<template>
  <div class="recall">
    <div class="badge">🧠 記憶</div>
    <p class="context">{{ data.context }}</p>
    <blockquote class="quote">「{{ data.quote }}」</blockquote>
    <span class="date">— {{ data.date }}</span>
  </div>
</template>
<style scoped>
.recall {
  background: var(--memory-bg);
  border: 1px solid var(--memory-border);
  border-left: 3px solid var(--warning);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-top: var(--space-2);
}
.badge {
  display: inline-block;
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--warning);
  background: var(--warning-subtle);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
  margin-bottom: var(--space-3);
}
.context {
  margin: 0 0 var(--space-3);
  font-size: var(--text-caption);
  color: var(--muted);
  line-height: 1.5;
}
.quote {
  margin: 0 0 var(--space-2);
  padding: 0;
  font-size: var(--text-body);
  font-style: italic;
  color: var(--ink);
  line-height: 1.7;
}
.date {
  font-size: var(--text-small);
  color: var(--muted);
}
</style>
