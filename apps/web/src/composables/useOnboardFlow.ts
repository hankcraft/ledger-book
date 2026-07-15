import { computed, ref } from "vue";

import { useApi } from "../services";
import type { OnboardingInput } from "../services/types";

export type StepType = "stock-input" | "choice" | "insight" | "cost-input" | "final-insight";

export interface Step {
  id: number;
  type: StepType;
  question: string;
  choices?: string[];
}

const steps: Step[] = [
  { id: 1, type: "stock-input", question: "最近有哪一檔股票，最讓你在意？" },
  { id: 2, type: "choice", question: "你目前有持有嗎？", choices: ["有", "曾經有", "正在觀察"] },
  {
    id: 3,
    type: "choice",
    question: "大概是賺錢、接近成本，還是虧損？",
    choices: ["賺錢", "接近成本", "虧損"],
  },
  { id: 4, type: "insight", question: "" },
  {
    id: 5,
    type: "cost-input",
    question: "補上大約成本與部位占比，我可以判斷這是價格焦慮，還是配置焦慮。",
  },
  { id: 6, type: "final-insight", question: "" },
];

export function useOnboardFlow() {
  const api = useApi();
  const currentStepIndex = ref(0);
  const stockName = ref("");
  const holdingStatus = ref<OnboardingInput["holdingStatus"] | null>(null);
  const pnlStatus = ref<OnboardingInput["pnlStatus"] | null>(null);
  const costPrice = ref("");
  const weightPercent = ref("30");
  const midInsight = ref("");
  const finalInsight = ref("");
  const isGeneratingInsight = ref(false);

  const currentStep = computed(() => steps[currentStepIndex.value]!);
  const totalSteps = steps.length;

  function submitStock(name: string): void {
    stockName.value = name;
    currentStepIndex.value = 1;
  }

  async function submitChoice(choice: string): Promise<void> {
    const stepId = currentStep.value.id;

    if (stepId === 2) {
      holdingStatus.value = choice as OnboardingInput["holdingStatus"];
      currentStepIndex.value++;
      return;
    }

    if (stepId !== 3) return;

    pnlStatus.value = choice as OnboardingInput["pnlStatus"];
    if (!holdingStatus.value) return;

    isGeneratingInsight.value = true;
    try {
      midInsight.value = await api.onboarding.getMidInsight(stockName.value, holdingStatus.value);
      currentStepIndex.value++;
    } finally {
      isGeneratingInsight.value = false;
    }
  }

  function acknowledgeInsight(): void {
    currentStepIndex.value++;
  }

  async function submitCostAndWeight(cost: string, weight: string): Promise<void> {
    if (!holdingStatus.value || !pnlStatus.value) return;

    isGeneratingInsight.value = true;

    try {
      finalInsight.value = await api.onboarding.getFinalInsight({
        stockName: stockName.value,
        holdingStatus: holdingStatus.value,
        pnlStatus: pnlStatus.value,
        cost: Number(cost),
        weightPercent: Number(weight),
      });
      costPrice.value = cost;
      weightPercent.value = weight;
      currentStepIndex.value++;
    } finally {
      isGeneratingInsight.value = false;
    }
  }

  return {
    currentStep,
    currentStepIndex,
    totalSteps,
    stockName,
    holdingStatus,
    pnlStatus,
    costPrice,
    weightPercent,
    midInsight,
    finalInsight,
    isGeneratingInsight,
    submitStock,
    submitChoice,
    acknowledgeInsight,
    submitCostAndWeight,
  };
}
