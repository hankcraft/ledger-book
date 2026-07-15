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
  background: var(--brand-light);
  border-radius: var(--radius-md);
  padding: var(--space-5) var(--space-4);
  border-left: 4px solid var(--action-primary);
}

.insight-text {
  margin: 0;
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-relaxed);
  color: var(--ink);
}
</style>
