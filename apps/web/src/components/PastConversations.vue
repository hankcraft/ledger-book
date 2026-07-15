<script setup lang="ts">
import type { ConversationSummary } from "../services/types";

defineProps<{ conversations: ConversationSummary[] }>();
const emit = defineEmits<{ resume: [id: string] }>();
</script>

<template>
  <div class="past-conversations">
    <div v-for="conv in conversations" :key="conv.id" class="conv-card">
      <div class="conv-header">
        <span class="conv-date">{{ conv.date }}</span>
        <span class="conv-trigger">「{{ conv.trigger }}」</span>
      </div>
      <div class="conv-conclusion">
        <span class="conv-conclusion-icon">💡</span>
        <span>{{ conv.conclusion }}</span>
      </div>
      <div v-if="conv.artifact" class="conv-artifact">
        <span
          v-if="conv.artifact.type === 'principle'"
          class="artifact-badge artifact-badge--principle"
          >📌 產出原則</span
        >
        <span v-else class="artifact-badge artifact-badge--memory">🧠 記憶</span>
        <span class="artifact-text">{{ conv.artifact.text }}</span>
      </div>
      <button class="resume-btn" @click="emit('resume', conv.id)">繼續這個話題 →</button>
    </div>
  </div>
</template>

<style scoped>
.past-conversations {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
}

.conv-card {
  padding: var(--space-3);
  background: var(--neutral-subtle);
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
}

.conv-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.conv-date {
  font-size: var(--text-small);
  color: var(--muted);
  font-weight: 600;
  min-width: 2.5rem;
}

.conv-trigger {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--ink);
}

.conv-conclusion {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-small);
  color: var(--muted);
  margin-bottom: var(--space-2);
  line-height: 1.4;
}

.conv-conclusion-icon {
  flex-shrink: 0;
}

.conv-artifact {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  font-size: var(--text-small);
}

.artifact-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px var(--space-2);
  border-radius: var(--radius-control);
  white-space: nowrap;
}

.artifact-badge--principle {
  background: var(--success-subtle);
  color: var(--positive);
}

.artifact-badge--memory {
  background: var(--warning-subtle);
  color: var(--warning);
}

.artifact-text {
  color: var(--muted);
  font-size: var(--text-small);
}

.resume-btn {
  font-size: var(--text-small);
  color: var(--accent);
  padding: var(--space-1) 0;
  font-weight: 500;
}

.resume-btn:hover {
  text-decoration: underline;
}
</style>
