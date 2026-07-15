import { computed, reactive } from "vue";

import {
  clearOnboardingCompletion,
  readOnboardingCompletion,
  resolveOnboardingHydration,
  writeOnboardingCompletion,
} from "../lib/onboarding-state";
import { useApi } from "../services";
import type { OnboardingInput, UserContext } from "../services/types";
import type { Behavior, Holding, Inference, Memory, Principle } from "../types";

interface AppState {
  hydrated: boolean;
  onboardingComplete: boolean;
  holdings: Holding[];
  principles: Principle[];
  memories: Memory[];
  inferences: Inference[];
  behaviors: Behavior[];
  toast: string | null;
  loading: boolean;
}

const state = reactive<AppState>({
  hydrated: false,
  onboardingComplete: false,
  holdings: [],
  principles: [],
  memories: [],
  inferences: [],
  behaviors: [],
  toast: null,
  loading: false,
});

let hydrationPromise: Promise<void> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string): void {
  state.toast = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.toast = null;
  }, 2500);
}

function applyContext(context: UserContext): void {
  state.holdings = context.holdings;
  state.principles = context.principles;
  state.memories = context.memories;
  state.inferences = context.inferences;
  state.behaviors = context.behaviors;
}

function applyContextPatch(context: Partial<UserContext>): void {
  if (context.holdings) state.holdings = context.holdings;
  if (context.principles) state.principles = context.principles;
  if (context.memories) state.memories = context.memories;
  if (context.inferences) state.inferences = context.inferences;
  if (context.behaviors) state.behaviors = context.behaviors;
}

export function useAppStore() {
  const api = useApi();
  const activeMemories = computed(() => state.memories.filter((memory) => !memory.archived));
  const pendingInferences = computed(() =>
    state.inferences.filter((inference) => inference.status === "pending"),
  );

  async function hydrate(): Promise<void> {
    if (state.hydrated) return;
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      const hasCompletionMarker = readOnboardingCompletion();
      if (!hasCompletionMarker) {
        state.hydrated = true;
        return;
      }

      state.loading = true;
      try {
        applyContext(await api.context.getContext());
        state.onboardingComplete = resolveOnboardingHydration(true, true).onboardingComplete;
      } catch {
        const decision = resolveOnboardingHydration(true, false);
        if (decision.shouldClearCompletionMarker) clearOnboardingCompletion();
        state.onboardingComplete = decision.onboardingComplete;
        if (decision.shouldReportLoadError) {
          showToast("暫時載入不了上次的資料，請稍後重試。");
        }
      } finally {
        state.loading = false;
        state.hydrated = true;
      }
    })();

    return hydrationPromise;
  }

  async function completeOnboarding(input: OnboardingInput): Promise<void> {
    state.loading = true;
    try {
      applyContext(await api.onboarding.completeOnboarding(input));
      state.onboardingComplete = true;
      writeOnboardingCompletion();
      showToast("歡迎！我已經開始整理你的投資狀況。");
    } finally {
      state.loading = false;
    }
  }

  async function skipOnboarding(): Promise<void> {
    state.loading = true;
    try {
      applyContext(await api.context.getContext());
      state.onboardingComplete = true;
      writeOnboardingCompletion();
      showToast("已跳過設定，使用範例庫存。隨時可以到「我的資料」修改。");
    } finally {
      state.loading = false;
    }
  }

  async function applyTemplate(templateId: string): Promise<void> {
    state.loading = true;
    try {
      applyContext(await api.onboarding.applyTemplate(templateId));
      state.onboardingComplete = true;
      writeOnboardingCompletion();
      showToast("已套用範本，歡迎開始使用！");
    } finally {
      state.loading = false;
    }
  }

  async function confirmInference(id: string): Promise<void> {
    const inference = state.inferences.find((item) => item.id === id);
    if (!inference) return;

    try {
      const { newPrinciple } = await api.context.confirmInference(id);
      inference.status = "confirmed";
      state.principles.push(newPrinciple);
      showToast("已確認並加入你的原則 ✓");
    } catch {
      showToast("沒成功，等一下再試？");
    }
  }

  async function denyInference(id: string, reason: string): Promise<void> {
    const inference = state.inferences.find((item) => item.id === id);
    if (!inference) return;

    try {
      await api.context.denyInference(id, reason);
      inference.status = "denied";
      inference.denyReason = reason;
      showToast("已記錄你的回饋。");
    } catch {
      showToast("沒成功，等一下再試？");
    }
  }

  async function archiveMemory(id: string): Promise<void> {
    const memory = state.memories.find((item) => item.id === id);
    if (!memory) return;

    try {
      await api.context.archiveMemory(id);
      memory.archived = true;
    } catch {
      showToast("沒成功，等一下再試？");
    }
  }

  async function pausePrinciple(id: string): Promise<void> {
    const principle = state.principles.find((item) => item.id === id);
    if (!principle) return;

    try {
      const updated = await api.context.togglePrinciple(id);
      principle.paused = updated.paused;
    } catch {
      showToast("沒成功，等一下再試？");
    }
  }

  async function deletePrinciple(id: string): Promise<void> {
    try {
      await api.context.deletePrinciple(id);
      const index = state.principles.findIndex((item) => item.id === id);
      if (index !== -1) state.principles.splice(index, 1);
    } catch {
      showToast("沒成功，等一下再試？");
    }
  }

  async function toggleBehaviorExclusion(id: string): Promise<void> {
    const behavior = state.behaviors.find((item) => item.id === id);
    if (!behavior) return;

    try {
      const updated = await api.context.toggleBehaviorExclusion(id);
      behavior.excluded = updated.excluded;
    } catch {
      showToast("沒成功，等一下再試？");
    }
  }

  async function submitCorrection(text: string): Promise<string | null> {
    try {
      const result = await api.context.submitCorrection(text);
      applyContextPatch(result.updatedContext);
      showToast("已更新你的資料。");
      return result.response;
    } catch {
      showToast("修正沒送出，等一下再試？");
      return null;
    }
  }

  function logout(): void {
    clearOnboardingCompletion();
    // Also clear mock API state for a fresh onboarding experience
    try {
      window.sessionStorage.removeItem("ledger-book:mock-api-state");
    } catch {
      // Ignore storage access errors
    }
    state.onboardingComplete = false;
    state.holdings = [];
    state.principles = [];
    state.memories = [];
    state.inferences = [];
    state.behaviors = [];
    state.hydrated = false;
    hydrationPromise = null;
  }

  return {
    state,
    activeMemories,
    pendingInferences,
    hydrate,
    completeOnboarding,
    skipOnboarding,
    applyTemplate,
    logout,
    confirmInference,
    denyInference,
    archiveMemory,
    pausePrinciple,
    deletePrinciple,
    toggleBehaviorExclusion,
    submitCorrection,
    showToast,
  };
}
