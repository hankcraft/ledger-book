<script setup lang="ts">
import type { AttentionItem } from "../types";
defineProps<{ item: AttentionItem }>();
</script>
<template>
  <article class="attention-item" :class="`severity-${item.severity}`">
    <h3 class="label">{{ item.label }}</h3>
    <p class="detail">{{ item.detail }}</p>
  </article>
</template>
<style scoped>
.attention-item {
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: var(--space-4) var(--space-6);
  border-left: 3px solid var(--line);
}
.attention-item.severity-warning {
  border-left-color: var(--brand-surface);
  background: #fffcf5;
}
.attention-item.severity-danger {
  border-left-color: var(--danger);
  background: var(--danger-subtle);
}
.attention-item.severity-info {
  border-left-color: var(--accent);
  background: var(--primary-subtle);
}
.label {
  margin: 0 0 var(--space-1);
  font-size: var(--text-body);
  font-weight: 600;
}
.detail {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--muted);
  line-height: 1.5;
}
</style>
