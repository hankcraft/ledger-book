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

    <div v-if="phase === 'recognizing'" class="recognition" role="status">
      <span class="scan-mark" aria-hidden="true"></span>
      <div>
        <strong>AI 正在辨識示範對帳資料</strong>
        <p>建立不可變交易帳本與績效快照。</p>
      </div>
    </div>

    <div v-else-if="phase === 'loading'" class="recognition" role="status">
      <span class="scan-mark scan-mark--still" aria-hidden="true"></span>
      <div>
        <strong>讀取帳本狀態</strong>
        <p>確認示範資料是否已建立。</p>
      </div>
    </div>

    <template v-else>
      <button class="import-button" type="button" @click="emit('import')">匯入示範對帳資料</button>
      <p class="hint">不需上傳真實資料。示範使用台股 2330、00878 與 0050 基準。</p>
    </template>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.import-panel {
  width: min(100%, 43rem);
  padding: 2rem;
  border: 1px solid var(--line);
  background: var(--surface);
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.title {
  max-width: 12ch;
  margin: 0;
  color: var(--ink);
  font-family: "Iowan Old Style", "Noto Serif TC", serif;
  font-size: clamp(2.25rem, 8vw, 4.5rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.02;
}

.lede {
  max-width: 34rem;
  margin: 1.5rem 0 2rem;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.7;
}

.import-button {
  border: 0;
  padding: 0.875rem 1rem;
  color: var(--on-ink);
  background: var(--ink);
  font-weight: 700;
}

.import-button:hover {
  background: var(--ink-hover);
}

.hint,
.error {
  margin: 0.875rem 0 0;
  font-size: 0.875rem;
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
  gap: 1rem;
  min-height: 5.5rem;
  padding: 1rem;
  border: 1px solid var(--line);
  background: var(--canvas);
}

.recognition strong,
.recognition p {
  display: block;
  margin: 0;
}

.recognition p {
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: 0.875rem;
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
    padding: 3.5rem;
  }
}
</style>
