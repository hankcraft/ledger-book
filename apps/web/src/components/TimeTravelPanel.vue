<script setup lang="ts">
import { computed } from "vue";

import type { Holding, TimeTravelReport } from "@ledger-book/contracts";

import { formatDate } from "../lib/format";

const props = defineProps<{
  asOfDate: string;
  error: string | null;
  holding: Holding | null;
  phase: "error" | "idle" | "loading";
  report: TimeTravelReport | null;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const sentiment = computed(() => {
  if (!props.report) {
    return null;
  }

  return {
    className: `sentiment--${props.report.sentiment}`,
    label:
      props.report.sentiment === "bullish"
        ? "偏多情緒"
        : props.report.sentiment === "bearish"
          ? "偏空情緒"
          : "中性情緒",
  };
});
</script>

<template>
  <section class="time-travel" aria-labelledby="report-heading">
    <div class="section-heading">
      <p class="eyebrow">時間點回溯</p>
      <h2 id="report-heading">{{ holding ? `${holding.symbol} 的當時資料` : "選擇一個持倉" }}</h2>
      <p v-if="asOfDate" class="as-of">{{ formatDate(asOfDate) }}</p>
    </div>

    <p v-if="!holding" class="placeholder">從持倉列表選擇標的，系統會整理該日期以前的資料。</p>
    <div v-else-if="phase === 'error'" class="report-error" role="alert">
      <p>{{ error }}</p>
      <button class="report-button" type="button" @click="emit('retry')">重試整理</button>
    </div>
    <article v-else-if="report" class="report">
      <p v-if="sentiment" class="sentiment" :class="sentiment.className">{{ sentiment.label }}</p>
      <p class="summary">{{ report.summary }}</p>
      <div class="citations">
        <h3>資料來源</h3>
        <ul>
          <li v-for="citation in report.citations" :key="citation.id">
            <strong>{{ citation.source }}</strong>
            <span>{{ citation.label }} · {{ formatDate(citation.observedOn) }}</span>
          </li>
        </ul>
      </div>
    </article>
    <div v-else class="report-empty">
      <p v-if="phase === 'loading'" class="placeholder" role="status" aria-live="polite">
        正在整理客觀資料與來源。
      </p>
      <p v-else class="placeholder">尚未整理此標的的歷史資料摘要。</p>
      <button
        class="report-button"
        type="button"
        :disabled="phase === 'loading'"
        @click="emit('retry')"
      >
        {{ phase === "loading" ? "正在整理資料" : `整理 ${holding?.symbol} 當時資料` }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.time-travel {
  padding: var(--space-6);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.section-heading h2,
.section-heading p {
  margin: 0;
}

.section-heading h2 {
  margin-top: var(--space-1);
  color: var(--ink);
  font-size: var(--text-heading);
  font-weight: 600;
  line-height: 1.5;
}

.eyebrow {
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.as-of {
  margin-top: var(--space-2) !important;
  color: var(--muted);
  font-size: var(--text-meta);
}

.placeholder,
.summary,
.report-error p {
  margin: var(--space-6) 0 0;
  color: var(--muted);
  line-height: 1.5;
}

.report-button {
  margin-top: var(--space-3);
  border: 0;
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-4);
  color: var(--on-ink);
  background: var(--action-primary);
  font-weight: 700;
  transition:
    background 120ms ease-out,
    transform 80ms ease-out;
}

@media (hover: hover) {
  .report-button:hover:not(:disabled) {
    background: var(--action-hover);
  }
}

.report-button:active:not(:disabled) {
  background: var(--action-active);
  transform: scale(0.98);
}

.report-button:disabled {
  opacity: 0.7;
}

.report {
  margin-top: var(--space-6);
}

.sentiment {
  display: inline-block;
  margin: 0;
  border: 1px solid currentcolor;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
  font-size: var(--text-meta);
  font-weight: 700;
}

.sentiment--bullish {
  color: var(--positive);
  background: var(--success-subtle);
}

.sentiment--bearish {
  border-color: var(--tertiary);
  color: var(--negative);
  background: var(--danger-subtle);
}

.sentiment--neutral {
  color: var(--muted);
  background: var(--neutral-subtle);
}

.summary {
  color: var(--ink);
}

.citations {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}

.citations h3 {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-meta);
}

.citations ul {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.citations li {
  display: grid;
  gap: var(--space-1);
  font-size: var(--text-meta);
}

.citations span {
  color: var(--muted);
}
</style>
