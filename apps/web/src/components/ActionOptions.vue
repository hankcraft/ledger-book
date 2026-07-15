<script setup lang="ts">
defineProps<{ actions: string[] }>();
const emit = defineEmits<{ select: [action: string] }>();
</script>

<template>
  <section class="action-options" aria-label="建議行動">
    <h2 class="heading">你想先了解什麼？</h2>
    <div class="list">
      <button v-for="action in actions" :key="action" class="pill" @click="emit('select', action)">
        {{ action }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.action-options {
  margin-top: var(--space-4);
}

.heading {
  margin: 0 0 var(--space-3);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--muted);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.pill {
  display: block;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--text-caption);
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.pill:hover {
  border-color: var(--action-primary);
  background: var(--primary-subtle);
}
</style>
