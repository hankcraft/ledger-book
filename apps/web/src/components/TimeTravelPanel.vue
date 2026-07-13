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
    <p v-else-if="phase === 'loading'" class="placeholder" role="status">
      正在整理客觀資料與來源。
    </p>
    <div v-else-if="phase === 'error'" class="report-error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="emit('retry')">重試整理</button>
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
    <p v-else class="placeholder">選擇持倉後，這裡會顯示有來源的歷史資料摘要。</p>
  </section>
</template>

<style scoped>
.time-travel {
  padding: 1.5rem;
  border: 1px solid var(--line);
  background: var(--surface);
}

.section-heading h2,
.section-heading p {
  margin: 0;
}

.section-heading h2 {
  margin-top: 0.25rem;
  color: var(--ink);
  font-family: "Iowan Old Style", "Noto Serif TC", serif;
  font-size: 1.5rem;
  font-weight: 600;
}

.eyebrow {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.as-of {
  margin-top: 0.5rem !important;
  color: var(--muted);
  font-size: 0.8125rem;
}

.placeholder,
.summary,
.report-error p {
  margin: 1.25rem 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.report-error button {
  margin-top: 0.75rem;
  border: 1px solid var(--ink);
  border-radius: 0;
  padding: 0.5rem 0.75rem;
  color: var(--ink);
  background: transparent;
  font-weight: 700;
}

.report {
  margin-top: 1.25rem;
}

.sentiment {
  display: inline-block;
  margin: 0;
  border: 1px solid currentcolor;
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
}

.sentiment--bullish {
  color: var(--positive);
}

.sentiment--bearish {
  color: var(--negative);
}

.sentiment--neutral {
  color: var(--muted);
}

.summary {
  color: var(--ink);
}

.citations {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
}

.citations h3 {
  margin: 0;
  color: var(--muted);
  font-size: 0.8125rem;
}

.citations ul {
  display: grid;
  gap: 0.75rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

.citations li {
  display: grid;
  gap: 0.125rem;
  font-size: 0.8125rem;
}

.citations span {
  color: var(--muted);
}
</style>
