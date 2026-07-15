<script setup lang="ts">
import { useQuickEntry } from "../composables/useQuickEntry";

const { form, submitting, error, grossAmount, isValid, submitEntry } = useQuickEntry();

const emit = defineEmits<{
  success: [];
}>();

async function handleSubmit(): Promise<void> {
  const ok = await submitEntry();
  if (ok) emit("success");
}

function formatAmount(value: number): string {
  if (value === 0) return "—";
  const formatted = Math.abs(value).toLocaleString("zh-TW");
  return value < 0 ? `-$${formatted}` : `+$${formatted}`;
}
</script>

<template>
  <form class="entry-form" @submit.prevent="handleSubmit">
    <!-- Entry type -->
    <div class="form-group">
      <label class="form-label">交易類型</label>
      <div class="segmented">
        <button
          type="button"
          class="seg-btn"
          :class="{ active: form.entryType === 'buy' }"
          @click="form.entryType = 'buy'"
        >
          買進
        </button>
        <button
          type="button"
          class="seg-btn"
          :class="{ active: form.entryType === 'sell' }"
          @click="form.entryType = 'sell'"
        >
          賣出
        </button>
      </div>
    </div>

    <!-- Date -->
    <div class="form-group">
      <label class="form-label" for="entry-date">日期</label>
      <input
        id="entry-date"
        v-model="form.date"
        type="date"
        class="form-input"
        :max="new Date().toISOString().slice(0, 10)"
        :disabled="submitting"
      />
    </div>

    <!-- Security -->
    <div class="form-group">
      <label class="form-label" for="entry-security">標的代號</label>
      <input
        id="entry-security"
        v-model="form.securityId"
        type="text"
        class="form-input"
        placeholder="如 2330"
        :disabled="submitting"
      />
    </div>

    <!-- Quantity -->
    <div class="form-group">
      <label class="form-label" for="entry-qty">數量（股）</label>
      <input
        id="entry-qty"
        v-model="form.quantity"
        type="number"
        class="form-input"
        placeholder="1000"
        min="1"
        :disabled="submitting"
      />
    </div>

    <!-- Unit price -->
    <div class="form-group">
      <label class="form-label" for="entry-price">單價（元）</label>
      <input
        id="entry-price"
        v-model="form.unitPrice"
        type="number"
        class="form-input"
        placeholder="580"
        min="0.01"
        step="0.01"
        :disabled="submitting"
      />
    </div>

    <!-- Calculated amount -->
    <div class="form-group">
      <span class="form-label">預估金額</span>
      <span
        class="calculated-amount"
        :class="{ negative: grossAmount < 0, positive: grossAmount > 0 }"
      >
        {{ formatAmount(grossAmount) }}
      </span>
    </div>

    <!-- Error -->
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>

    <!-- Submit -->
    <button type="submit" class="submit-btn" :disabled="!isValid || submitting">
      {{ submitting ? "新增中…" : "新增" }}
    </button>
  </form>
</template>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: var(--text-caption);
  color: var(--muted);
  font-weight: 500;
}

.form-input {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  font-size: var(--text-body);
  color: var(--ink);
}

.form-input:focus {
  border-color: var(--accent);
  outline: none;
}

.segmented {
  display: flex;
  gap: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.seg-btn {
  flex: 1;
  padding: var(--space-3);
  font-size: var(--text-caption);
  font-weight: 500;
  background: var(--surface);
  color: var(--muted);
  transition:
    background 0.15s,
    color 0.15s;
}

.seg-btn.active {
  background: var(--action-primary);
  color: var(--on-ink);
}

.seg-btn:not(.active):hover {
  background: var(--neutral-subtle);
}

.calculated-amount {
  font-size: var(--text-large);
  font-weight: 700;
  color: var(--muted);
}

.calculated-amount.positive {
  color: var(--positive);
}

.calculated-amount.negative {
  color: var(--negative);
}

.form-error {
  margin: 0;
  padding: var(--space-3);
  background: var(--danger-subtle);
  color: var(--danger);
  border-radius: var(--radius-card);
  font-size: var(--text-caption);
}

.submit-btn {
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-card);
  background: var(--action-primary);
  color: var(--on-ink);
  font-weight: 500;
  font-size: var(--text-body);
  transition: background 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: var(--action-hover);
}
</style>
