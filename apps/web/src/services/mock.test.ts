import { describe, expect, test } from "bun:test";

import { createMockApiService } from "./mock";

describe("MockApiService", () => {
  test("keeps an onboarding portfolio available through the context service", async () => {
    const api = createMockApiService();

    await api.onboarding.completeOnboarding({
      stockName: "長榮",
      holdingStatus: "有",
      pnlStatus: "接近成本",
      cost: 168,
      weightPercent: 30,
    });

    const context = await api.context.getContext();

    expect(context.holdings[0]?.name).toBe("長榮");
    expect(context.holdings[0]?.cost).toBe(168);
  });

  test("returns context snapshots that callers cannot mutate", async () => {
    const api = createMockApiService();
    const first = await api.context.getContext();

    first.holdings[0]!.name = "tampered";

    const second = await api.context.getContext();

    expect(second.holdings[0]?.name).toBe("台積電");
  });

  test("keeps home actions as prompts instead of creating an orphaned conversation", async () => {
    const api = createMockApiService();
    const result = await api.home.selectAction("我的部位是不是太重");

    expect(result).toEqual({ initialPrompt: "我的部位是不是太重" });
  });

  test("continues a selected reflection option without replaying the initial response", async () => {
    const api = createMockApiService();
    const { conversationId } = await api.agent.startConversation("今天跌很多，我有點想全部賣掉。");

    const initial = [];
    for await (const message of api.agent.sendMessage(
      conversationId,
      "今天跌很多，我有點想全部賣掉。",
    )) {
      initial.push(message);
    }

    await api.agent.selectOption(conversationId, "我的部位是不是太重");

    const followUp = [];
    for await (const message of api.agent.sendMessage(conversationId, "我的部位是不是太重")) {
      followUp.push(message);
    }

    expect(initial.length).toBeGreaterThan(1);
    expect(followUp).toHaveLength(1);
    expect(followUp[0]?.text).toContain("我的部位是不是太重");
  });

  test("returns and persists a context update after a correction", async () => {
    const api = createMockApiService();

    const result = await api.context.submitCorrection("我最近開始看技術面了");
    const context = await api.context.getContext();

    expect(result.updatedContext.inferences?.[0]?.status).toBe("denied");
    expect(context.inferences[0]?.status).toBe("denied");
  });
});
