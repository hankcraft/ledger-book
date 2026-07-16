<script setup lang="ts">
import { ref } from "vue";
import type { ArtifactSaveData } from "../types";

defineProps<{ data: ArtifactSaveData; disabled?: boolean }>();
const emit = defineEmits<{ save: [artifact: { type: "principle" | "memory"; text: string }] }>();

const saved = ref(false);

function handleSave(type: "principle" | "memory", text: string): void {
  if (saved.value) return;
  saved.value = true;
  emit("save", { type, text });
}
</script>

<template>
  <div class="artifact-card" :class="{ saved }">
    <div class="artifact-icon">{{ data.artifactType === "principle" ? "📌" : "💬" }}</div>
    <div class="artifact-body">
      <span class="artifact-label">{{ data.label }}</span>
      <p class="artifact-text">{{ data.text }}</p>
      <div class="artifact-actions">
        <button
          v-if="!saved"
          class="save-btn"
          :disabled="disabled"
          @click="handleSave(data.artifactType, data.text)"
        >
          {{ data.artifactType === "principle" ? "記住這個原則" : "記住這段話" }}
        </button>
        <span v-else class="saved-label">✓ 已記住</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.artifact-card {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--primary-subtle);
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: var(--radius-lg);
  transition:
    background var(--duration-fast),
    border-color var(--duration-fast);
}

.artifact-card.saved {
  background: var(--positive-subtle);
  border-color: rgba(16, 185, 129, 0.3);
}

.artifact-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.artifact-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.artifact-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.artifact-card.saved .artifact-label {
  color: var(--positive);
}

.artifact-text {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--ink);
  line-height: 1.5;
}

.artifact-actions {
  margin-top: var(--space-1);
}

.save-btn {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--primary);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--primary);
  border-radius: var(--radius-pill);
  transition:
    background var(--duration-fast),
    color var(--duration-fast);
}

.save-btn:hover:not(:disabled) {
  background: var(--primary);
  color: var(--on-ink);
}

.saved-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--positive);
}
</style>
