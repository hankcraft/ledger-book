<script setup lang="ts">
defineProps<{ insight: string }>();
</script>
<template>
  <section class="insight-card" aria-label="主要觀察">
    <p class="insight-text">{{ insight }}</p>
  </section>
</template>
<style scoped>
.insight-card {
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: var(--space-6);
  border-left: 4px solid var(--action-primary);
}
.insight-text {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.6;
  color: var(--ink);
}
</style>
