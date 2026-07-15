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
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-4);
  border-left: 4px solid var(--primary);
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-left: 4px solid var(--primary);
  transition:
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out);
}

.insight-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.insight-text {
  margin: 0;
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-relaxed);
  color: var(--ink);
}
</style>
