<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  count: number;
  expanded: boolean;
  accentColor?: string;
}>();
const emit = defineEmits<{ toggle: [] }>();
</script>
<template>
  <button
    class="sh"
    :style="{ '--accent-c': accentColor ?? 'var(--accent)' }"
    :aria-expanded="expanded"
    @click="emit('toggle')"
  >
    <span class="icon">{{ icon }}</span>
    <span class="title">{{ title }}</span>
    <span class="count">{{ count }}</span>
    <span class="chevron" :class="{ open: expanded }">▾</span>
  </button>
</template>
<style scoped>
.sh {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-4);
  border-left: 3px solid var(--accent-c);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: background 0.15s;
}
.sh:hover {
  background: var(--neutral-subtle);
}
.icon {
  font-size: 1.25rem;
}
.title {
  flex: 1;
  text-align: left;
  font-weight: 600;
  font-size: var(--text-caption);
}
.count {
  background: var(--primary-subtle);
  color: var(--accent);
  font-size: var(--text-small);
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
}
.chevron {
  transition: transform 0.2s;
  color: var(--muted);
}
.chevron.open {
  transform: rotate(180deg);
}
</style>
