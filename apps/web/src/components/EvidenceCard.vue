<script setup lang="ts">
import { ref } from "vue";
import type { EvidenceData } from "../types";
defineProps<{ data: EvidenceData }>();
const isExpanded = ref(false);
</script>
<template>
  <div class="card">
    <button class="header" :aria-expanded="isExpanded" @click.stop="isExpanded = !isExpanded">
      <span class="badge">📋 依據</span>
      <span class="title">{{ data.title }}</span>
      <span class="confidence"
        >信心度 <strong>{{ data.confidence }}%</strong></span
      >
      <span class="toggle">{{ isExpanded ? "▾" : "▸" }}</span>
    </button>
    <div v-if="isExpanded" class="body">
      <ul class="sources">
        <li v-for="s in data.sources" :key="s.name" class="source">
          <span class="kind" :class="s.kind">{{ s.kind === "fact" ? "事實" : "推論" }}</span>
          <span>{{ s.name }}</span>
        </li>
      </ul>
      <p class="summary">{{ data.summary }}</p>
    </div>
  </div>
</template>
<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  margin-top: var(--space-2);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  text-align: left;
  min-height: auto;
}
.badge {
  font-size: var(--text-small);
  color: var(--accent);
  font-weight: 600;
}
.title {
  flex: 1;
  font-size: var(--text-caption);
  font-weight: 500;
}
.confidence {
  font-size: var(--text-small);
  color: var(--muted);
}
.confidence strong {
  color: var(--positive);
}
.toggle {
  color: var(--muted);
}
.body {
  padding: 0 var(--space-4) var(--space-4);
  border-top: 1px solid var(--line);
  animation: slideDown 0.2s ease-out;
}
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.sources {
  list-style: none;
  margin: var(--space-3) 0;
  padding: 0;
}
.source {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  font-size: var(--text-caption);
}
.kind {
  font-size: var(--text-small);
  font-weight: 600;
  padding: 2px var(--space-2);
  border-radius: var(--radius-control);
}
.kind.fact {
  background: var(--success-subtle);
  color: var(--positive);
}
.kind.inference {
  background: var(--warning-subtle);
  color: var(--warning);
}
.summary {
  margin: var(--space-3) 0 0;
  font-size: var(--text-caption);
  color: var(--muted);
  line-height: 1.6;
}
</style>
