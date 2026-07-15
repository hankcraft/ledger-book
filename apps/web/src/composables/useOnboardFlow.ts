import { computed, ref } from "vue";

import { useApi } from "../services";
import type { OnboardingInput } from "../services/types";

export type StepType =
  | "intro"
  | "stock-input"
  | "choice"
  | "insight"
  | "time-estimate"
  | "cost-input"
  | "final-insight";

export interface Step {
  id: number;
  type: StepType;
  question: string;
  benefit?: string;
  choices?: string[];
}

const steps: Step[] = [
  {
    id: 0,
    type: "intro",
    question: "投資搭檔幫你做什麼",
  },
  {
    id: 1,
    type: "stock-input",
    question: "最近有哪一檔股票，讓你特別想了解？",
    benefit: "告訴我一檔，我就能開始幫你整理思緒。",
  },
  {
    id: 2,
    type: "choice",
    question: "你目前有持有嗎？",
    choices: ["有", "曾經有", "正在觀察"],
    benefit: "這會影響我怎麼幫你分析這檔股票。",
  },
  {
    id: 3,
    type: "choice",
    question: "大概是賺錢、接近成本，還是虧損？",
    choices: ["賺錢", "接近成本", "虧損"],
    benefit: "知道盈虧方向，我能更準確判斷你的焦慮來源。",
  },
  {
    id: 4,
    type: "insight",
    question: "",
  },
  {
    id: 5,
    type: "time-estimate",
    question: "大約什麼時候買的？",
    choices: ["一週內", "一個月內", "三個月內", "半年前", "一年以上"],
    benefit: "有了時間，我就能算出你的真實年化報酬，而不只是帳面數字。",
  },
  {
    id: 6,
    type: "cost-input",
    question: "補上大約成本與部位占比，我可以更精準幫你判斷。",
    benefit: "成本和占比決定了這筆投資對你整體的影響有多大。",
  },
  {
    id: 7,
    type: "final-insight",
    question: "",
  },
];

export function useOnboardFlow() {
  const api = useApi();
  const currentStepIndex = ref(0);
  const stockName = ref("");
  const holdingStatus = ref<OnboardingInput["holdingStatus"] | null>(null);
  const pnlStatus = ref<OnboardingInput["pnlStatus"] | null>(null);
  const purchaseTimeEstimate = ref<OnboardingInput["purchaseTimeEstimate"] | undefined>(undefined);
  const costPrice = ref("");
  const weightPercent = ref("30");
  const midInsight = ref("");
  const finalInsight = ref("");
  const isGeneratingInsight = ref(false);

  const currentStep = computed(() => steps[currentStepIndex.value]!);
  const totalSteps = steps.length;

  function startOnboarding(): void {
    currentStepIndex.value = 1;
  }

  function submitStock(name: string): void {
    stockName.value = name;
    currentStepIndex.value = 2;
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

  function submitTimeEstimate(estimate: string): void {
    purchaseTimeEstimate.value = estimate as OnboardingInput["purchaseTimeEstimate"];
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
        purchaseTimeEstimate: purchaseTimeEstimate.value,
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
    purchaseTimeEstimate,
    costPrice,
    weightPercent,
    midInsight,
    finalInsight,
    isGeneratingInsight,
    startOnboarding,
    submitStock,
    submitChoice,
    acknowledgeInsight,
    submitTimeEstimate,
    submitCostAndWeight,
  };
}
