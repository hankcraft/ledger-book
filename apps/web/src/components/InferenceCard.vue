<script setup lang="ts">
import { ref } from "vue";
import type { Inference } from "../types";
defineProps<{ inference: Inference }>();
const emit = defineEmits<{ confirm: [id: string]; deny: [id: string, reason: string] }>();
const showDeny = ref(false);
const reason = ref("");
const animOut = ref(false);

function handleConfirm(id: string) {
  animOut.value = true;
  setTimeout(() => emit("confirm", id), 400);
}
function handleDeny(id: string) {
  emit("deny", id, reason.value);
  showDeny.value = false;
  reason.value = "";
}
</script>

<template>
  <div class="ic" :class="{ out: animOut }">
    <div class="header">
      <span>🔍</span><span class="stmt">{{ inference.statement }}</span>
    </div>
    <div class="badges">
      <span class="badge unconfirmed">未確認</span>
      <span
        class="badge"
        :class="inference.confidence === '高' ? 'hi' : inference.confidence === '中' ? 'mid' : 'lo'"
        >信心：{{ inference.confidence }}</span
      >
    </div>
    <div class="evidence"><strong>依據：</strong>{{ inference.evidence }}</div>
    <div v-if="!showDeny" class="actions">
      <button class="confirm-btn" @click="handleConfirm(inference.id)">確認 ✓</button>
      <button class="deny-btn" @click="showDeny = true">不太對 ✗</button>
    </div>
    <div v-else class="deny-form">
      <textarea v-model="reason" class="textarea" placeholder="讓我說明..." rows="2"></textarea>
      <button class="submit" :disabled="!reason.trim()" @click="handleDeny(inference.id)">
        送出
      </button>
    </div>
  </div>
</template>

<style scoped>
.ic {
  padding: var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition:
    transform 0.4s,
    opacity 0.4s;
}
.ic.out {
  transform: scale(0.9) translateY(-10px);
  opacity: 0;
}
.header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.stmt {
  flex: 1;
  font-weight: 500;
}
.badges {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding-left: 1.75rem;
}
.badge {
  font-size: var(--text-small);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
}
.unconfirmed {
  background: var(--warning-subtle);
  color: #b45309;
}
.hi {
  background: #fef2f2;
  color: var(--danger);
}
.mid {
  background: var(--warning-subtle);
  color: #92400e;
}
.lo {
  background: var(--neutral-subtle);
  color: var(--muted);
}
.evidence {
  font-size: var(--text-small);
  color: var(--muted);
  margin-bottom: var(--space-3);
  padding-left: 1.75rem;
  line-height: 1.5;
}
.actions {
  display: flex;
  gap: var(--space-3);
  padding-left: 1.75rem;
}
.confirm-btn {
  background: var(--success-subtle);
  color: var(--positive);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-control);
  font-weight: 500;
  font-size: var(--text-caption);
}
.confirm-btn:hover {
  background: #d1f0e0;
}
.deny-btn {
  background: #fef2f2;
  color: var(--danger);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-control);
  font-weight: 500;
  font-size: var(--text-caption);
}
.deny-form {
  padding-left: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.textarea {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  font-size: var(--text-caption);
  resize: vertical;
  line-height: 1.5;
}
.textarea:focus {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}
.submit {
  align-self: flex-end;
  background: var(--action-primary);
  color: var(--on-ink);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-control);
  font-size: var(--text-caption);
  font-weight: 500;
}
</style>
