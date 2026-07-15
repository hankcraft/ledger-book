<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import ChoiceSelector from "../components/ChoiceSelector.vue";
import InsightFeedback from "../components/InsightFeedback.vue";
import ProgressIndicator from "../components/ProgressIndicator.vue";
import StepQuestion from "../components/StepQuestion.vue";
import StockInput from "../components/StockInput.vue";
import { useAppStore } from "../composables/useAppStore";
import { useOnboardFlow } from "../composables/useOnboardFlow";

const router = useRouter();
const { state, completeOnboarding, skipOnboarding, showToast } = useAppStore();
const {
  currentStep,
  currentStepIndex,
  totalSteps,
  stockName,
  holdingStatus,
  pnlStatus,
  midInsight,
  finalInsight,
  isGeneratingInsight,
  submitStock,
  submitChoice,
  acknowledgeInsight,
  submitCostAndWeight,
} = useOnboardFlow();

const costInput = ref("");
const weightInput = ref("30");
const transitionKey = ref(0);
const isSubmittingStep = ref(false);

const hasCost = computed(
  () => String(costInput.value).trim().length > 0 && Number(costInput.value) > 0,
);

function handleStockSubmit(name: string): void {
  transitionKey.value++;
  submitStock(name);
}

async function handleChoiceSelect(choice: string): Promise<void> {
  if (isSubmittingStep.value) return;
  isSubmittingStep.value = true;

  try {
    await submitChoice(choice);
    transitionKey.value++;
  } catch {
    showToast("暫時無法產生洞察，請稍後再試。");
  } finally {
    isSubmittingStep.value = false;
  }
}

function handleInsightContinue(): void {
  transitionKey.value++;
  acknowledgeInsight();
}

async function handleCostSubmit(): Promise<void> {
  if (!hasCost.value || isSubmittingStep.value) return;
  isSubmittingStep.value = true;

  try {
    await submitCostAndWeight(String(costInput.value), weightInput.value);
    transitionKey.value++;
  } catch {
    showToast("暫時無法完成分析，請稍後再試。");
  } finally {
    isSubmittingStep.value = false;
  }
}

async function handleComplete(): Promise<void> {
  if (!holdingStatus.value || !pnlStatus.value) return;

  try {
    await completeOnboarding({
      stockName: stockName.value,
      holdingStatus: holdingStatus.value,
      pnlStatus: pnlStatus.value,
      cost: Number(costInput.value) || 500,
      weightPercent: Number(weightInput.value),
    });
    await router.push("/");
  } catch {
    showToast("無法完成設定，請稍後再試。");
  }
}

async function handleSkip(): Promise<void> {
  try {
    await skipOnboarding();
    await router.push("/");
  } catch {
    showToast("暫時無法進入範例模式，請稍後再試。");
  }
}
</script>

<template>
  <main class="onboard" :aria-busy="isSubmittingStep || state.loading">
    <ProgressIndicator :current="currentStepIndex + 1" :total="totalSteps" />

    <Transition name="step" mode="out-in">
      <div :key="transitionKey" class="step-content">
        <template v-if="currentStep.type === 'stock-input'">
          <StepQuestion :question="currentStep.question" />
          <StockInput @submit="handleStockSubmit" />
        </template>

        <template v-else-if="currentStep.type === 'choice'">
          <StepQuestion :question="currentStep.question" />
          <ChoiceSelector
            :choices="currentStep.choices!"
            :disabled="isSubmittingStep"
            @select="handleChoiceSelect"
          />
        </template>

        <template v-else-if="currentStep.type === 'insight'">
          <InsightFeedback
            :text="midInsight"
            :show-continue="true"
            @continue="handleInsightContinue"
          />
        </template>

        <template v-else-if="currentStep.type === 'cost-input'">
          <StepQuestion :question="currentStep.question" />
          <div class="cost-form">
            <div class="form-group">
              <label for="cost">大約成本（元）</label>
              <input
                id="cost"
                v-model="costInput"
                type="number"
                class="form-input"
                placeholder="例如 580"
                :disabled="isSubmittingStep"
                @keydown.enter="handleCostSubmit"
              />
            </div>
            <div class="form-group">
              <label for="weight"
                >部位占比：<strong>{{ weightInput }}%</strong></label
              >
              <input
                id="weight"
                v-model="weightInput"
                type="range"
                class="slider"
                min="1"
                max="100"
                step="1"
                :disabled="isSubmittingStep"
              />
              <div class="slider-labels"><span>1%</span><span>50%</span><span>100%</span></div>
            </div>
            <button
              class="primary-btn"
              :disabled="!hasCost || isSubmittingStep"
              @click="handleCostSubmit"
            >
              {{ isGeneratingInsight ? "分析中…" : "分析看看" }}
            </button>
          </div>
        </template>

        <template v-else-if="currentStep.type === 'final-insight'">
          <InsightFeedback :text="finalInsight" />
          <button class="primary-btn" :disabled="state.loading" @click="handleComplete">
            {{ state.loading ? "建立中…" : "開始使用持倉鏡" }}
          </button>
        </template>
      </div>
    </Transition>

    <button class="skip-btn" :disabled="state.loading" @click="handleSkip">
      先跳過，之後再設定
    </button>
  </main>
</template>

<style scoped>
.onboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: var(--space-6);
  gap: var(--space-8);
}

.step-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-enter-active,
.step-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.step-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.step-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.cost-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
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

.slider {
  width: 100%;
  height: 6px;
  appearance: none;
  background: var(--line);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--action-primary);
  cursor: pointer;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-caption);
  color: var(--muted);
}

.primary-btn {
  margin-top: var(--space-6);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-card);
  background: var(--action-primary);
  color: var(--on-ink);
  font-weight: 500;
  transition: background 0.2s;
}

.primary-btn:hover:not(:disabled) {
  background: var(--action-hover);
}

.skip-btn {
  margin-top: auto;
  padding: var(--space-3) var(--space-4);
  color: var(--muted);
  font-size: var(--text-caption);
  transition: color 0.15s;
}

.skip-btn:hover:not(:disabled) {
  color: var(--ink);
}
</style>
