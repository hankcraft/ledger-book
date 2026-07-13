<script setup lang="ts">
type ImportPhase = "empty" | "loading" | "recognizing";

defineProps<{
  phase: ImportPhase;
  error: string | null;
}>();

const emit = defineEmits<{
  import: [];
}>();
</script>

<template>
  <section class="import-panel" :aria-busy="phase !== 'empty'">
    <p class="eyebrow">示範帳本</p>
    <h1 class="title">看清投資旅程，少一點焦慮。</h1>
    <p class="lede">匯入固定示範資料，查看真實資產變化、持倉與指定時點的客觀資料整理。</p>

    <button
      class="import-button"
      type="button"
      :disabled="phase !== 'empty'"
      @click="emit('import')"
    >
      {{ phase === "empty" ? "匯入示範對帳資料" : "正在匯入示範資料" }}
    </button>

    <div v-if="phase === 'recognizing'" class="recognition" role="status" aria-live="polite">
      <span class="scan-mark" aria-hidden="true"></span>
      <div>
        <strong>正在建立示範帳本</strong>
        <p>建立不可變交易帳本與績效快照。</p>
      </div>
    </div>

    <div v-else-if="phase === 'loading'" class="recognition" role="status" aria-live="polite">
      <span class="scan-mark scan-mark--still" aria-hidden="true"></span>
      <div>
        <strong>讀取帳本狀態</strong>
        <p>確認示範資料是否已建立。</p>
      </div>
    </div>

    <template v-else>
      <p class="hint">不需上傳真實資料。示範帳本涵蓋 7 檔台股、兩年交易與股利。</p>
    </template>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.import-panel {
  width: min(100%, 43rem);
  padding: var(--space-8);
  border: 1px solid var(--line);
  border-top: 4px solid var(--brand-surface);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.eyebrow {
  margin: 0 0 var(--space-3);
  color: var(--muted);
  font-size: var(--text-meta);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.title {
  max-width: 12ch;
  margin: 0;
  color: var(--ink);
  font-size: var(--text-heading);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.5;
}

.lede {
  max-width: 34rem;
  margin: var(--space-6) 0 var(--space-8);
  color: var(--muted);
  font-size: var(--text-body);
  line-height: 1.5;
}

.import-button {
  border: 0;
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-4);
  color: var(--on-ink);
  background: var(--action-primary);
  font-weight: 700;
  transition:
    background 120ms ease-out,
    opacity 120ms ease-out,
    transform 80ms ease-out;
}

@media (hover: hover) {
  .import-button:hover:not(:disabled) {
    background: var(--action-hover);
  }
}

.import-button:active:not(:disabled) {
  background: var(--action-active);
  transform: scale(0.98);
}

.import-button:disabled {
  opacity: 0.7;
}

.hint,
.error {
  margin: var(--space-3) 0 0;
  font-size: var(--text-meta);
  line-height: 1.5;
}

.hint {
  color: var(--muted);
}

.error {
  color: var(--danger);
}

.recognition {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-height: 5.5rem;
  margin-top: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-control);
  background: var(--primary-subtle);
}

.recognition strong,
.recognition p {
  display: block;
  margin: 0;
}

.recognition p {
  margin-top: var(--space-1);
  color: var(--muted);
  font-size: var(--text-meta);
}

.scan-mark {
  width: 2.5rem;
  height: 2.5rem;
  border: 2px solid var(--accent);
  border-left-color: transparent;
  border-radius: 50%;
  animation: turn 0.8s linear infinite;
}

.scan-mark--still {
  border-left-color: var(--accent);
  animation: none;
}

@keyframes turn {
  to {
    transform: rotate(1turn);
  }
}

@media (min-width: 48rem) {
  .import-panel {
    padding: calc(var(--space-8) * 1.5);
  }
}
</style>
