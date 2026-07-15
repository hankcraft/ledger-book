<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <header class="page-header">
    <div class="page-header-text">
      <h1 class="page-header-title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.action" class="page-header-action">
      <slot name="action" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.page-header-text {
  flex: 1;
  min-width: 0;
}

.page-header-title {
  margin: 0;
  font-size: var(--text-heading);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--ink);
}

.page-header-subtitle {
  margin: var(--space-1) 0 0;
  font-size: var(--text-caption);
  color: var(--muted);
  line-height: var(--leading-normal);
}

.page-header-action {
  flex-shrink: 0;
}
</style>
