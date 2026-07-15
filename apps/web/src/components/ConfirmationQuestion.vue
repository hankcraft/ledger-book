<script setup lang="ts">
import type { ConfirmationData } from "../types";

const props = withDefaults(
  defineProps<{
    data: ConfirmationData;
    disabled?: boolean;
    selectedOption?: string | null;
  }>(),
  {
    disabled: false,
    selectedOption: null,
  },
);

const emit = defineEmits<{ select: [option: string] }>();

function selectOption(option: string): void {
  if (props.disabled || props.selectedOption !== null) return;
  emit("select", option);
}
</script>

<template>
  <div class="cq">
    <p class="question">{{ data.question }}</p>
    <div class="options">
      <button
        v-for="option in data.options"
        :key="option"
        class="pill"
        :class="{ selected: selectedOption === option }"
        :disabled="disabled || selectedOption !== null"
        @click.stop="selectOption(option)"
      >
        {{ option }}
      </button>
    </div>
    <p v-if="selectedOption" class="feedback">✓ 我會依照你的選擇繼續整理。</p>
  </div>
</template>

<style scoped>
.cq {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-top: var(--space-2);
  box-shadow: var(--shadow-card);
}

.question {
  margin: 0 0 var(--space-3);
  font-weight: 500;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.pill {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--neutral-subtle);
  color: var(--ink);
  font-size: var(--text-caption);
  font-weight: 500;
  border: 1px solid var(--line);
  transition: all 0.15s;
}

.pill:hover:not(:disabled) {
  background: var(--primary-subtle);
  border-color: var(--accent);
}

.pill.selected {
  background: var(--action-primary);
  color: var(--on-ink);
  border-color: var(--action-primary);
}

.feedback {
  margin: var(--space-3) 0 0;
  font-size: var(--text-caption);
  color: var(--positive);
}
</style>
