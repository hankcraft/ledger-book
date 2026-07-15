<script setup lang="ts">
defineProps<{
  choices: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{ select: [choice: string] }>();
</script>

<template>
  <div class="choice-selector">
    <button
      v-for="choice in choices"
      :key="choice"
      class="choice-btn"
      :disabled="disabled"
      @click="emit('select', choice)"
    >
      {{ choice }}
    </button>
  </div>
</template>

<style scoped>
.choice-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.choice-btn {
  padding: var(--space-4) var(--space-6);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--text-body);
  font-weight: 500;
  text-align: center;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.1s;
}

.choice-btn:hover:not(:disabled) {
  background: var(--primary-subtle);
  border-color: var(--accent);
}

.choice-btn:active:not(:disabled) {
  transform: scale(0.98);
}
</style>
