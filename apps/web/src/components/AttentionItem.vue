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
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  border-left: 3px solid var(--line);
}

.attention-item.severity-warning {
  border-left-color: var(--brand-accent);
  background: var(--warning-subtle);
}

.attention-item.severity-danger {
  border-left-color: var(--negative);
  background: var(--negative-subtle);
}

.attention-item.severity-info {
  border-left-color: var(--action-primary);
  background: var(--brand-light);
}

.label {
  margin: 0 0 var(--space-1);
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  color: var(--ink);
}

.detail {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--muted);
  line-height: var(--leading-normal);
}
</style>
