/**
 * Mock API Service Implementation
 *
 * Uses fake data and simulated delays to mimic a stateful backend.
 * Replace with ./client.ts when the v1 backend is ready.
 */

import type {
  IApiService,
  IOnboardingService,
  IContextService,
  IHomeService,
  IAgentService,
  IPerformanceService,
  OnboardingInput,
  UserContext,
  ConversationSummary,
  PerformanceTimeline,
  TimePointEvent,
} from "./types";
import type { Holding, Principle, Behavior, DisplayMessage, ContextSummaryData } from "../types";
import {
  seedHoldings,
  seedPrinciples,
  seedMemories,
  seedInferences,
  seedBehaviors,
  scenarios,
  conversationScript,
  getStockResponse,
} from "../data/seed";
import { ledgerTemplates } from "../data/ledger-templates";

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createSeedContext(): UserContext {
  return clone({
    holdings: seedHoldings,
    principles: seedPrinciples,
    memories: seedMemories,
    inferences: seedInferences,
    behaviors: seedBehaviors,
  });
}

async function* streamMockConversation(index = 0): AsyncIterable<DisplayMessage> {
  if (index >= conversationScript.length) return;

  const step = conversationScript[index]!;
  if (step.role !== "user") {
    await delay(Math.min(step.delay, 80));
    yield {
      id: `mock-turn-${index}`,
      role: step.role,
      text: step.text,
      card: clone(step.card),
    };
  }

  yield* streamMockConversation(index + 1);
}

interface MockBackendState {
  context: UserContext;
  scenarioIndex: number;
}

const mockStateStorageKey = "ledger-book:mock-api-state";

function createMockBackendState(): MockBackendState {
  return {
    context: createSeedContext(),
    scenarioIndex: 0,
  };
}

function getMockStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function isMockBackendState(value: unknown): value is MockBackendState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<MockBackendState>;
  return (
    typeof candidate.scenarioIndex === "number" &&
    typeof candidate.context === "object" &&
    candidate.context !== null &&
    Array.isArray(candidate.context.holdings) &&
    Array.isArray(candidate.context.principles) &&
    Array.isArray(candidate.context.memories) &&
    Array.isArray(candidate.context.inferences) &&
    Array.isArray(candidate.context.behaviors)
  );
}

function loadMockBackendState(): MockBackendState {
  try {
    const serialized = getMockStorage()?.getItem(mockStateStorageKey);
    if (!serialized) return createMockBackendState();
    const parsed: unknown = JSON.parse(serialized);
    return isMockBackendState(parsed) ? clone(parsed) : createMockBackendState();
  } catch {
    return createMockBackendState();
  }
}

function persistMockBackendState(state: MockBackendState): void {
  try {
    getMockStorage()?.setItem(mockStateStorageKey, JSON.stringify(state));
  } catch {
    // Mock data remains in memory if storage is unavailable.
  }
}

class MockOnboardingService implements IOnboardingService {
  constructor(
    private readonly state: MockBackendState,
    private readonly persist: () => void,
  ) {}

  async getMidInsight(stockName: string, _holdingStatus: string): Promise<string> {
    await delay(500);
    return getStockResponse(stockName).midInsight;
  }

  async getFinalInsight(input: OnboardingInput): Promise<string> {
    await delay(600);
    const response = getStockResponse(input.stockName);
    return response.finalInsight(
      input.holdingStatus,
      input.pnlStatus,
      String(input.cost ?? 500),
      String(input.weightPercent ?? 30),
    );
  }

  async completeOnboarding(input: OnboardingInput): Promise<UserContext> {
    await delay(400);
    const userHolding: Holding = {
      id: "h-onboard",
      name: input.stockName,
      weight: input.weightPercent ?? 30,
      cost: input.cost ?? 500,
      plPercent: input.pnlStatus === "賺錢" ? 12 : input.pnlStatus === "虧損" ? -5 : 1,
    };

    this.state.context = {
      ...createSeedContext(),
      holdings: [
        userHolding,
        ...clone(seedHoldings).filter((holding) => holding.name !== input.stockName),
      ],
    };
    this.persist();

    return clone(this.state.context);
  }

  async applyTemplate(templateId: string): Promise<UserContext> {
    await delay(300);
    const template = ledgerTemplates.find((t) => t.id === templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    this.state.context = clone(template.context);
    this.persist();

    return clone(this.state.context);
  }
}

class MockContextService implements IContextService {
  constructor(
    private readonly state: MockBackendState,
    private readonly persist: () => void,
  ) {}

  async getContext(): Promise<UserContext> {
    await delay(200);
    return clone(this.state.context);
  }

  async confirmInference(id: string): Promise<{ newPrinciple: Principle }> {
    await delay(300);
    const inference = this.state.context.inferences.find((item) => item.id === id);
    if (!inference) throw new Error(`Inference ${id} not found`);

    inference.status = "confirmed";
    const newPrinciple: Principle = {
      id: `p-from-${id}`,
      statement: inference.statement,
      confirmedAt: new Date().toISOString().slice(0, 10),
      source: "對話確認",
      paused: false,
      badge: "剛確認",
    };
    this.state.context.principles.push(newPrinciple);
    this.persist();

    return { newPrinciple: clone(newPrinciple) };
  }

  async denyInference(id: string, reason: string): Promise<void> {
    await delay(200);
    const inference = this.state.context.inferences.find((item) => item.id === id);
    if (inference) {
      inference.status = "denied";
      inference.denyReason = reason;
      this.persist();
    }
  }

  async archiveMemory(id: string): Promise<void> {
    await delay(200);
    const memory = this.state.context.memories.find((item) => item.id === id);
    if (memory) {
      memory.archived = true;
      this.persist();
    }
  }

  async togglePrinciple(id: string): Promise<Principle> {
    await delay(200);
    const principle = this.state.context.principles.find((item) => item.id === id);
    if (!principle) throw new Error(`Principle ${id} not found`);
    principle.paused = !principle.paused;
    this.persist();
    return clone(principle);
  }

  async deletePrinciple(id: string): Promise<void> {
    await delay(200);
    const index = this.state.context.principles.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.state.context.principles.splice(index, 1);
      this.persist();
    }
  }

  async toggleBehaviorExclusion(id: string): Promise<Behavior> {
    await delay(200);
    const behavior = this.state.context.behaviors.find((item) => item.id === id);
    if (!behavior) throw new Error(`Behavior ${id} not found`);
    behavior.excluded = !behavior.excluded;
    this.persist();
    return clone(behavior);
  }

  async submitCorrection(
    text: string,
  ): Promise<{ response: string; updatedContext: Partial<UserContext> }> {
    await delay(800);
    const inference = this.state.context.inferences.find((item) => item.status === "pending");

    if (inference) {
      inference.status = "denied";
      inference.denyReason = `使用者修正：${text}`;
      this.persist();
    }

    return {
      response: inference
        ? `好的，我已根據你的說明「${text}」重新評估「${inference.statement}」。這項推論暫時不會再用於你的投資判讀。`
        : `好的，我已記錄你的說明「${text}」，未來會以此更新對你的理解。`,
      updatedContext: { inferences: clone(this.state.context.inferences) },
    };
  }

  async getHoldingTrades(holdingId: string) {
    await delay(200);
    // Mock: return sample trades for demo purposes
    const holding = this.state.context.holdings.find((h) => h.id === holdingId);
    if (!holding) return [];
    return [
      {
        id: `trade-${holdingId}-1`,
        date: "2025-09-15",
        type: "buy" as const,
        quantity: 2000,
        unitPrice: holding.cost * 0.95,
        amount: 2000 * holding.cost * 0.95,
      },
      {
        id: `trade-${holdingId}-2`,
        date: "2025-11-02",
        type: "buy" as const,
        quantity: 1000,
        unitPrice: holding.cost * 1.02,
        amount: 1000 * holding.cost * 1.02,
      },
    ];
  }
}

class MockHomeService implements IHomeService {
  constructor(
    private readonly state: MockBackendState,
    private readonly persist: () => void,
  ) {}

  async getDailyPerformance() {
    await delay(100);
    return {
      portfolioReturn: 1.2,
      benchmarkReturn: 0.8,
      asOf: "2025-12-31",
    };
  }

  async getCurrentScenario() {
    await delay(200);
    const scenario = scenarios[this.state.scenarioIndex % scenarios.length]!;
    this.state.scenarioIndex++;
    this.persist();
    return clone(scenario);
  }

  async selectAction(action: string) {
    await delay(100);
    return { initialPrompt: action };
  }
}

interface MockConversation {
  hasInitialResponse: boolean;
  selectedOption: string | null;
  prompt: string;
}

class MockAgentService implements IAgentService {
  private readonly conversations = new Map<string, MockConversation>();
  private readonly history: ConversationSummary[] = [
    {
      id: "conv-1",
      date: "7/12",
      trigger: "想全部賣掉",
      conclusion: "短期波動，你後來決定觀察 2 天",
      artifact: { type: "principle", text: "單一個股不超過 30%" },
    },
    {
      id: "conv-2",
      date: "7/8",
      trigger: "聯發科要不要停損",
      conclusion: "你確認買進理由仍在，繼續持有",
      artifact: { type: "memory", text: "覺得跌很多，大家都說會反彈" },
    },
    {
      id: "conv-3",
      date: "7/5",
      trigger: "為什麼我比大盤跌得多",
      conclusion: "68% 集中於 AI 題材是主因",
      artifact: null,
    },
  ];

  async startConversation(prompt: string): Promise<{ conversationId: string }> {
    await delay(200);
    const conversationId = `conv-${Date.now()}`;
    this.conversations.set(conversationId, {
      hasInitialResponse: false,
      selectedOption: null,
      prompt,
    });
    return { conversationId };
  }

  async *sendMessage(conversationId: string, text: string): AsyncIterable<DisplayMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

    if (!conversation.hasInitialResponse) {
      conversation.hasInitialResponse = true;

      // Emit context-summary card as the very first message
      const contextCard: ContextSummaryData = {
        type: "context-summary",
        portfolio: { totalStocks: 4, topHolding: "台積電", topWeight: 40 },
        marketSnapshot: "大盤今日 -1.5%，電子類股偏弱",
        userProfile: "偏好長期持有、科技股為主",
      };
      await delay(100);
      yield {
        id: `mock-context-${Date.now()}`,
        role: "agent",
        card: contextCard,
      };

      yield* streamMockConversation();

      // Persist to history after first response
      const now = new Date();
      const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
      this.history.unshift({
        id: conversationId,
        date: dateStr,
        trigger: conversation.prompt,
        conclusion: "剛完成的對話",
        artifact: null,
      });
      return;
    }

    await delay(300);
    yield {
      id: `mock-follow-up-${Date.now()}`,
      role: "agent",
      text: `你選擇先釐清「${conversation.selectedOption ?? text}」。我會把這個問題和你的持倉、過去記憶一起整理。`,
    };
  }

  async resumeConversation(
    conversationId: string,
  ): Promise<{ conversationId: string; contextSummary: string; messages?: DisplayMessage[] }> {
    await delay(300);
    const resumedConversationId = `conv-resume-${Date.now()}`;
    this.conversations.set(resumedConversationId, {
      hasInitialResponse: true,
      selectedOption: null,
      prompt: "",
    });
    return {
      conversationId: resumedConversationId,
      contextSummary: `延續上次對話 ${conversationId} 的脈絡…`,
      messages: [],
    };
  }

  async getPastConversations(): Promise<ConversationSummary[]> {
    await delay(200);
    return clone(this.history);
  }

  async selectOption(
    conversationId: string,
    option: string,
    _artifact?: { type: "principle" | "memory"; text: string },
  ): Promise<void> {
    await delay(100);
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);
    conversation.selectedOption = option;
  }

  async getSuggestedPrompts(): Promise<string[]> {
    await delay(150);
    return [
      "台積電佔比 40% 會不會太高？",
      "聯發科虧損中，該怎麼看？",
      "最近大盤跌，我的持倉受多少影響？",
    ];
  }
}

class MockPerformanceService implements IPerformanceService {
  private readonly timeline: PerformanceTimeline;
  private readonly events: Map<string, TimePointEvent>;

  constructor() {
    const points = this.generateTimeline(30);
    this.events = new Map([
      [
        points[8]!.date,
        {
          date: points[8]!.date,
          type: "market",
          summary: "社群情緒：台積電 看多 85/看空 12、聯發科 看多 32/看空 28（共 420 則討論）",
          sentiment: "bullish",
        },
      ],
      [
        points[15]!.date,
        {
          date: points[15]!.date,
          type: "dividend",
          summary: "長榮除息，現金股利 3.5 元，殖利率 4.2%",
          sentiment: "neutral",
        },
      ],
      [
        points[22]!.date,
        {
          date: points[22]!.date,
          type: "market",
          summary: "社群情緒：台積電 看多 15/看空 68、聯電 看多 8/看空 22（共 310 則討論）",
          sentiment: "bearish",
        },
      ],
    ]);
    this.timeline = {
      points,
      metrics: { xirr: 14.2, twr: 12.8, benchmarkReturn: 9.5 },
      eventDates: [...this.events.keys()],
    };
  }

  private generateTimeline(days: number) {
    const points = [];
    // All demo data lives in 2025; anchor the timeline to end on 2025-12-31.
    const endDate = new Date("2025-12-31");
    let portfolioAcc = 0;
    let benchmarkAcc = 0;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);

      // Simulate daily returns with some variance
      const pDaily = (Math.random() - 0.45) * 1.8;
      const bDaily = (Math.random() - 0.45) * 1.0;
      portfolioAcc += pDaily;
      benchmarkAcc += bDaily;

      points.push({
        date: dateStr,
        portfolioReturn: Math.round(portfolioAcc * 100) / 100,
        benchmarkReturn: Math.round(benchmarkAcc * 100) / 100,
      });
    }
    return points;
  }

  async getPerformanceTimeline(): Promise<PerformanceTimeline> {
    await delay(150);
    return clone(this.timeline);
  }

  async getTimePointEvent(date: string): Promise<TimePointEvent | null> {
    await delay(100);
    return this.events.get(date) ?? null;
  }
}

export function createMockApiService(): IApiService {
  const state = loadMockBackendState();
  const persist = () => persistMockBackendState(state);

  return {
    onboarding: new MockOnboardingService(state, persist),
    context: new MockContextService(state, persist),
    home: new MockHomeService(state, persist),
    agent: new MockAgentService(),
    performance: new MockPerformanceService(),
  };
}
