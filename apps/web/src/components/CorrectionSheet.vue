<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  open: boolean;
  submitting: boolean;
  response: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [text: string];
}>();

const input = ref("");

function handleSubmit(): void {
  const text = input.value.trim();
  if (text) emit("submit", text);
}

function handleClose(): void {
  input.value = "";
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="overlay" @click.self="handleClose">
        <div class="sheet">
          <div class="sheet-header">
            <h3 class="sheet-title">對話修正</h3>
            <button class="close-btn" @click="handleClose">✕</button>
          </div>
          <p class="desc">用自然語言告訴 AI 哪些理解需要修正</p>
          <textarea
            v-model="input"
            class="input"
            placeholder="例如：我最近開始看技術面了..."
            rows="3"
            :disabled="submitting || response !== null"
          ></textarea>
          <button
            v-if="response === null"
            class="submit-btn"
            :disabled="!input.trim() || submitting"
            @click="handleSubmit"
          >
            {{ submitting ? "送出中…" : "送出" }}
          </button>
          <div v-else class="response">
            <div class="response-header">🤖 AI 回應</div>
            <pre class="response-text">{{ response }}</pre>
            <button class="done-btn" @click="handleClose">完成</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.sheet {
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  padding: var(--space-6);
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  overflow-y: auto;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.sheet-title {
  margin: 0;
  font-size: 1.125rem;
}

.close-btn {
  font-size: 1.25rem;
  color: var(--muted);
  padding: var(--space-2);
}

.desc {
  font-size: var(--text-caption);
  color: var(--muted);
  margin: 0 0 var(--space-4);
}

.input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  font-size: var(--text-caption);
  resize: vertical;
  line-height: 1.5;
  margin-bottom: var(--space-3);
}

.input:focus {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}

.submit-btn,
.done-btn {
  width: 100%;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-caption);
}

.submit-btn {
  background: var(--action-primary);
  color: var(--on-ink);
}

.submit-btn:hover:not(:disabled) {
  background: var(--action-hover);
}

.response {
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--primary-subtle);
  border-radius: var(--radius-card);
}

.response-header {
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.response-text {
  font-size: var(--text-caption);
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0 0 var(--space-4);
  line-height: 1.6;
}

.done-btn {
  background: var(--positive);
  color: var(--on-ink);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.3s;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
