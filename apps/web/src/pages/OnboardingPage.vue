<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import ChoiceSelector from "../components/ChoiceSelector.vue";
import InsightFeedback from "../components/InsightFeedback.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import ProgressIndicator from "../components/ProgressIndicator.vue";
import StepQuestion from "../components/StepQuestion.vue";
import StockInput from "../components/StockInput.vue";
import { useAppStore } from "../composables/useAppStore";
import { useOnboardFlow } from "../composables/useOnboardFlow";
import { BRAND } from "../constants/brand";
import { ledgerTemplates } from "../data/ledger-templates";

const router = useRouter();
const { state, completeOnboarding, skipOnboarding, applyTemplate, showToast } = useAppStore();
const {
  currentStep,
  currentStepIndex,
  totalSteps,
  stockName,
  holdingStatus,
  pnlStatus,
  purchaseTimeEstimate,
  midInsight,
  finalInsight,
  isGeneratingInsight,
  startOnboarding,
  submitStock,
  submitChoice,
  acknowledgeInsight,
  submitTimeEstimate,
  submitCostAndWeight,
} = useOnboardFlow();

const costInput = ref("");
const weightInput = ref("30");
const transitionKey = ref(0);
const isSubmittingStep = ref(false);

const hasCost = computed(
  () => String(costInput.value).trim().length > 0 && Number(costInput.value) > 0,
);

const introBullets = [
  "了解你的真實報酬率，不只看帳面數字",
  "釐清焦慮是來自價格，還是配置",
  "逐步建立屬於你的投資原則",
];

function handleStart(): void {
  transitionKey.value++;
  startOnboarding();
}

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
    showToast("暫時沒辦法繼續，請稍後再試。");
  } finally {
    isSubmittingStep.value = false;
  }
}

function handleInsightContinue(): void {
  transitionKey.value++;
  acknowledgeInsight();
}

function handleTimeEstimate(estimate: string): void {
  transitionKey.value++;
  submitTimeEstimate(estimate);
}

async function handleCostSubmit(): Promise<void> {
  if (!hasCost.value || isSubmittingStep.value) return;
  isSubmittingStep.value = true;

  try {
    await submitCostAndWeight(String(costInput.value), weightInput.value);
    transitionKey.value++;
  } catch {
    showToast("暫時沒辦法完成分析，請稍後再試。");
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
      purchaseTimeEstimate: purchaseTimeEstimate.value,
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
    showToast("暫時無法進入，請稍後再試。");
  }
}

async function handleTemplateSelect(templateId: string): Promise<void> {
  if (state.loading) return;
  try {
    await applyTemplate(templateId);
    await router.push("/");
  } catch {
    showToast("無法套用範本，請稍後再試。");
  }
}
</script>

<template>
  <main class="onboard" :aria-busy="isSubmittingStep || state.loading">
    <ProgressIndicator :current="currentStepIndex + 1" :total="totalSteps" />

    <Transition name="step" mode="out-in">
      <div :key="transitionKey" class="step-content">
        <!-- Intro step -->
        <template v-if="currentStep.type === 'intro'">
          <div class="intro-card">
            <h1 class="intro-title">{{ BRAND.appName }}</h1>
            <p class="intro-tagline">{{ BRAND.tagline }}</p>
            <ul class="intro-bullets">
              <li v-for="bullet in introBullets" :key="bullet">{{ bullet }}</li>
            </ul>
            <button class="primary-btn" @click="handleStart">開始設定</button>

            <div class="template-section">
              <p class="template-divider"><span>或者，選擇範本快速開始</span></p>
              <div class="template-grid">
                <button
                  v-for="template in ledgerTemplates"
                  :key="template.id"
                  class="template-card"
                  :disabled="state.loading"
                  @click="handleTemplateSelect(template.id)"
                >
                  <span class="template-icon">{{ template.icon }}</span>
                  <span class="template-name">{{ template.name }}</span>
                  <span class="template-tagline">{{ template.tagline }}</span>
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Stock input -->
        <template v-else-if="currentStep.type === 'stock-input'">
          <StepQuestion :question="currentStep.question" />
          <p v-if="currentStep.benefit" class="benefit-text">{{ currentStep.benefit }}</p>
          <StockInput @submit="handleStockSubmit" />
        </template>

        <!-- Choice -->
        <template v-else-if="currentStep.type === 'choice'">
          <StepQuestion :question="currentStep.question" />
          <p v-if="currentStep.benefit" class="benefit-text">{{ currentStep.benefit }}</p>
          <ChoiceSelector
            :choices="currentStep.choices!"
            :disabled="isSubmittingStep"
            @select="handleChoiceSelect"
          />
        </template>

        <!-- Insight -->
        <template v-else-if="currentStep.type === 'insight'">
          <InsightFeedback
            :text="midInsight"
            :show-continue="true"
            @continue="handleInsightContinue"
          />
        </template>

        <!-- Time estimate -->
        <template v-else-if="currentStep.type === 'time-estimate'">
          <StepQuestion :question="currentStep.question" />
          <p v-if="currentStep.benefit" class="benefit-text">{{ currentStep.benefit }}</p>
          <ChoiceSelector
            :choices="currentStep.choices!"
            :disabled="isSubmittingStep"
            @select="handleTimeEstimate"
          />
        </template>

        <!-- Cost input -->
        <template v-else-if="currentStep.type === 'cost-input'">
          <StepQuestion :question="currentStep.question" />
          <p v-if="currentStep.benefit" class="benefit-text">{{ currentStep.benefit }}</p>
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
              <LoadingSpinner v-if="isGeneratingInsight" :size="14" />
              {{ isGeneratingInsight ? "整理中…" : "看看分析" }}
            </button>
          </div>
        </template>

        <!-- Final insight -->
        <template v-else-if="currentStep.type === 'final-insight'">
          <InsightFeedback :text="finalInsight" />
          <button class="primary-btn" :disabled="state.loading" @click="handleComplete">
            <LoadingSpinner v-if="state.loading" :size="14" />
            {{ state.loading ? "建立中…" : "開始使用" }}
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

/* Intro */
.intro-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.intro-title {
  font-size: var(--text-heading);
  font-weight: 700;
  margin: 0;
}

.intro-tagline {
  color: var(--muted);
  margin: 0;
  font-size: var(--text-body);
}

.intro-bullets {
  list-style: none;
  padding: 0;
  margin: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: left;
  width: 100%;
}

.intro-bullets li {
  padding-left: var(--space-6);
  position: relative;
  color: var(--ink);
  line-height: 1.6;
}

.intro-bullets li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--positive);
  font-weight: 700;
}

/* Benefit text */
.benefit-text {
  margin: var(--space-2) 0 var(--space-4);
  font-size: var(--text-small);
  color: var(--muted);
  text-align: center;
  line-height: 1.5;
}

/* Cost form */
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
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

/* Template selection */
.template-section {
  width: 100%;
  margin-top: var(--space-6);
}

.template-divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-4);
  font-size: var(--text-caption);
  color: var(--muted);
}

.template-divider::before,
.template-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}

.template-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.template-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--duration-fast),
    box-shadow var(--duration-fast),
    transform var(--duration-fast);
}

.template-card:hover:not(:disabled) {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.template-card:active:not(:disabled) {
  transform: translateY(0);
}

.template-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.template-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.template-name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
}

.template-tagline {
  font-size: var(--text-caption);
  color: var(--muted);
  margin-left: auto;
}
</style>
