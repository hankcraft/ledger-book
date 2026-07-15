<script setup lang="ts">
import { computed } from "vue";
import { Sparkles, UserRound } from "lucide-vue-next";

const props = defineProps<{
  role: "user" | "agent";
  timestamp?: string;
}>();

const timeLabel = computed(() => {
  if (!props.timestamp) return "";
  const d = new Date(props.timestamp);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
});
</script>
<template>
  <div class="msg" :class="[`msg--${role}`]">
    <div class="avatar">
      <UserRound v-if="role === 'user'" :size="18" :stroke-width="1.75" />
      <Sparkles v-else :size="18" :stroke-width="1.75" />
    </div>
    <div class="body">
      <slot />
      <span v-if="timeLabel" class="msg-time">{{ timeLabel }}</span>
    </div>
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
  border-radius: 50%;
  background: var(--neutral-subtle);
  color: var(--muted);
}
.msg--agent .avatar {
  background: var(--brand-light, var(--primary-subtle));
  color: var(--action-primary);
}
.msg-time {
  display: block;
  font-size: var(--text-xs, 0.6875rem);
  color: var(--muted);
  margin-top: var(--space-1);
  opacity: 0.7;
}
.msg--user .msg-time {
  text-align: right;
}
</style>
