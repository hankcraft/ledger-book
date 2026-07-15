<script setup lang="ts">
defineProps<{ role: "user" | "agent" }>();
</script>
<template>
  <div class="msg" :class="[`msg--${role}`]">
    <div class="avatar">{{ role === "user" ? "👤" : "🪞" }}</div>
    <div class="body"><slot /></div>
  </div>
</template>
<style scoped>
.msg {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  animation: fadeIn 0.35s ease-out both;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.msg--user {
  flex-direction: row-reverse;
}
.msg--user .body {
  background: var(--primary-subtle);
  border-radius: var(--radius-card) var(--radius-card) var(--radius-control) var(--radius-card);
  padding: var(--space-3) var(--space-4);
  max-width: 80%;
}
.msg--agent .body {
  flex: 1;
  min-width: 0;
}
.msg--agent .body > :deep(p) {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card) var(--radius-card) var(--radius-card) var(--radius-control);
  padding: var(--space-3) var(--space-4);
}
.avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  border-radius: 50%;
  background: var(--neutral-subtle);
}
</style>
