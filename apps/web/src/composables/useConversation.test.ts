import { describe, expect, test } from "bun:test";

import { setApiService } from "../services";
import type {
  IAgentService,
  IApiService,
  IContextService,
  IHomeService,
  IOnboardingService,
  UserContext,
} from "../services/types";
import type { DisplayMessage } from "../types";
import { useConversation } from "./useConversation";

const emptyContext: UserContext = {
  holdings: [],
  principles: [],
  memories: [],
  inferences: [],
  behaviors: [],
};

interface ConversationApiOptions {
  failFirstSelection?: boolean;
  failFollowUpStream?: boolean;
}

function createConversationApi(options: ConversationApiOptions = {}): IApiService {
  let selectionAttempts = 0;
  let streamAttempts = 0;

  const onboarding: IOnboardingService = {
    completeOnboarding: async () => emptyContext,
    getFinalInsight: async () => "",
    getMidInsight: async () => "",
  };

  const context: IContextService = {
    archiveMemory: async () => undefined,
    confirmInference: async () => {
      throw new Error("not used");
    },
    deletePrinciple: async () => undefined,
    denyInference: async () => undefined,
    getContext: async () => emptyContext,
    submitCorrection: async () => ({ response: "", updatedContext: {} }),
    toggleBehaviorExclusion: async () => {
      throw new Error("not used");
    },
    togglePrinciple: async () => {
      throw new Error("not used");
    },
  };

  const home: IHomeService = {
    getDailyPerformance: async () => ({
      portfolioReturn: 0,
      benchmarkReturn: 0,
      asOf: "2026-01-01",
    }),
    getCurrentScenario: async () => {
      throw new Error("not used");
    },
    selectAction: async (action) => ({ initialPrompt: action }),
  };

  const agent: IAgentService = {
    getPastConversations: async () => [],
    resumeConversation: async () => ({ conversationId: "resume", contextSummary: "" }),
    selectOption: async () => {
      selectionAttempts++;
      if (options.failFirstSelection && selectionAttempts === 1) {
        throw new Error("temporary selection failure");
      }
    },
    sendMessage: async function* (): AsyncIterable<DisplayMessage> {
      streamAttempts++;
      if (options.failFollowUpStream && streamAttempts === 2) {
        throw new Error("temporary stream failure");
      }
      yield { id: `agent-reply-${streamAttempts}`, role: "agent", text: "已繼續整理。" };
    },
    startConversation: async () => ({ conversationId: "conversation-1" }),
  };

  return {
    onboarding,
    context,
    home,
    agent,
    performance: {
      getPerformanceTimeline: async () => ({
        points: [],
        metrics: { xirr: 0, twr: 0, benchmarkReturn: 0 },
      }),
      getTimePointEvent: async () => null,
    },
  };
}

function selectedTurnCount(conversation: ReturnType<typeof useConversation>): number {
  return conversation.messages.value.filter((message) => message.text === "我的部位是不是太重")
    .length;
}

describe("useConversation.selectOption", () => {
  test("allows a rejected option selection to retry without duplicating the user turn", async () => {
    setApiService(createConversationApi({ failFirstSelection: true }));
    const conversation = useConversation();

    await conversation.startNewConversation("初始問題");

    await expect(conversation.selectOption("我的部位是不是太重")).resolves.toBe(false);
    expect(selectedTurnCount(conversation)).toBe(0);

    await expect(conversation.selectOption("我的部位是不是太重")).resolves.toBe(true);
    expect(conversation.error.value).toBeNull();
    expect(selectedTurnCount(conversation)).toBe(1);
  });

  test("keeps a persisted option locked when only the follow-up stream fails", async () => {
    setApiService(createConversationApi({ failFollowUpStream: true }));
    const conversation = useConversation();

    await conversation.startNewConversation("初始問題");

    await expect(conversation.selectOption("我的部位是不是太重")).resolves.toBe(true);
    expect(conversation.error.value).toBe("AI 助手暫時無法回應，請稍後再試。");
    expect(selectedTurnCount(conversation)).toBe(1);
  });
});
