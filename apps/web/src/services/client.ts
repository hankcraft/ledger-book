/**
 * Real API Client — connects apps/web to /api/v1 endpoints.
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
import type {
  Behavior,
  DisplayMessage,
  Holding,
  Inference,
  Memory,
  Principle,
  Scenario,
} from "../types";

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
}

// ─── Enum translation (UI display ↔ API machine values) ──────

const holdingStatusMap: Record<string, string> = {
  有: "HELD",
  曾經有: "FORMER",
  正在觀察: "WATCHING",
};
const pnlStatusMap: Record<string, string> = {
  賺錢: "PROFIT",
  接近成本: "BREAKEVEN",
  虧損: "LOSS",
};
const confidenceFromApi: Record<string, "高" | "中" | "低"> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};
const severityFromApi: Record<string, "warning" | "info" | "danger"> = {
  WARNING: "warning",
  INFO: "info",
  DANGER: "danger",
};
const inferenceStatusFromApi: Record<string, "pending" | "confirmed" | "denied"> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  DENIED: "denied",
};

function mapHolding(h: Record<string, unknown>): Holding {
  return {
    id: h.id as string,
    name: h.name as string,
    weight: h.weight as number,
    cost: h.cost as number,
    plPercent: h.plPercent as number,
  };
}

function mapPrinciple(p: Record<string, unknown>): Principle {
  return {
    id: p.id as string,
    statement: p.statement as string,
    confirmedAt: p.confirmedAt as string,
    source: p.source as string,
    paused: p.paused as boolean,
    badge: p.badge as string | undefined,
  };
}

function mapMemory(m: Record<string, unknown>): Memory {
  return {
    id: m.id as string,
    quote: m.quote as string,
    date: m.date as string,
    source: m.source as string,
    archived: m.archived as boolean,
  };
}

function mapInference(i: Record<string, unknown>): Inference {
  return {
    id: i.id as string,
    statement: i.statement as string,
    confidence: confidenceFromApi[i.confidence as string] ?? "中",
    evidence: i.evidence as string,
    status: inferenceStatusFromApi[i.status as string] ?? "pending",
    denyReason: i.denyReason as string | undefined,
  };
}

function mapBehavior(b: Record<string, unknown>): Behavior {
  return {
    id: b.id as string,
    label: b.label as string,
    value: b.value as string,
    detail: b.detail as string | undefined,
    excluded: b.excluded as boolean,
  };
}

function mapContext(raw: Record<string, unknown>): UserContext {
  const ctx = raw as {
    holdings: Record<string, unknown>[];
    principles: Record<string, unknown>[];
    memories: Record<string, unknown>[];
    inferences: Record<string, unknown>[];
    behaviors: Record<string, unknown>[];
  };
  return {
    holdings: ctx.holdings.map(mapHolding),
    principles: ctx.principles.map(mapPrinciple),
    memories: ctx.memories.map(mapMemory),
    inferences: ctx.inferences.map(mapInference),
    behaviors: ctx.behaviors.map(mapBehavior),
  };
}

function mapScenario(raw: Record<string, unknown>): Scenario {
  const s = raw as {
    id: string;
    greeting: string;
    insight: string;
    attentionItems: Array<{ id: string; label: string; detail: string; severity: string }>;
    actions: string[];
  };
  return {
    id: s.id,
    greeting: s.greeting,
    insight: s.insight,
    attentionItems: s.attentionItems.map((a) => ({
      id: a.id,
      label: a.label,
      detail: a.detail,
      severity: severityFromApi[a.severity] ?? "info",
    })),
    actions: s.actions,
  };
}

// ─── HTTP helpers ────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function createFetcher(config: ApiClientConfig) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${config.baseUrl}${path}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = config.getToken?.();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return undefined as T;

    const payload: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const err = payload as { error?: { code?: string; message?: string } } | null;
      throw new ApiError(
        err?.error?.message ?? `Request failed (${res.status})`,
        res.status,
        err?.error?.code,
      );
    }

    return payload as T;
  }

  return { request };
}

// ─── Service implementations ─────────────────────────────────

class RealOnboardingService implements IOnboardingService {
  constructor(private readonly fetch: ReturnType<typeof createFetcher>) {}

  async getMidInsight(stockName: string, holdingStatus: string): Promise<string> {
    const res = await this.fetch.request<{ insight: string }>("POST", "/onboarding/insight", {
      stockName,
      holdingStatus: holdingStatusMap[holdingStatus] ?? holdingStatus,
    });
    return res.insight;
  }

  async getFinalInsight(input: OnboardingInput): Promise<string> {
    const res = await this.fetch.request<{ insight: string }>("POST", "/onboarding/final-insight", {
      stockName: input.stockName,
      holdingStatus: holdingStatusMap[input.holdingStatus] ?? input.holdingStatus,
      pnlStatus: pnlStatusMap[input.pnlStatus] ?? input.pnlStatus,
      cost: input.cost,
      weightPercent: input.weightPercent,
    });
    return res.insight;
  }

  async completeOnboarding(input: OnboardingInput): Promise<UserContext> {
    const res = await this.fetch.request<{ context: Record<string, unknown> }>(
      "POST",
      "/onboarding/complete",
      {
        stockName: input.stockName,
        holdingStatus: holdingStatusMap[input.holdingStatus] ?? input.holdingStatus,
        pnlStatus: pnlStatusMap[input.pnlStatus] ?? input.pnlStatus,
        cost: input.cost,
        weightPercent: input.weightPercent,
      },
    );
    return mapContext(res.context);
  }

  async applyTemplate(templateId: string): Promise<UserContext> {
    const res = await this.fetch.request<{ context: Record<string, unknown> }>(
      "POST",
      "/onboarding/apply-template",
      { templateId },
    );
    return mapContext(res.context);
  }
}

class RealContextService implements IContextService {
  constructor(private readonly fetch: ReturnType<typeof createFetcher>) {}

  async getContext(): Promise<UserContext> {
    const raw = await this.fetch.request<Record<string, unknown>>("GET", "/context");
    return mapContext(raw);
  }

  async confirmInference(id: string): Promise<{ newPrinciple: Principle }> {
    const res = await this.fetch.request<{ newPrinciple: Record<string, unknown> }>(
      "POST",
      `/context/inferences/${id}/confirm`,
    );
    return { newPrinciple: mapPrinciple(res.newPrinciple) };
  }

  async denyInference(id: string, reason: string): Promise<void> {
    await this.fetch.request("POST", `/context/inferences/${id}/deny`, { reason });
  }

  async archiveMemory(id: string): Promise<void> {
    await this.fetch.request("POST", `/context/memories/${id}/archive`);
  }

  async togglePrinciple(id: string): Promise<Principle> {
    const res = await this.fetch.request<{ principle: Record<string, unknown> }>(
      "POST",
      `/context/principles/${id}/toggle`,
    );
    return mapPrinciple(res.principle);
  }

  async deletePrinciple(id: string): Promise<void> {
    await this.fetch.request("DELETE", `/context/principles/${id}`);
  }

  async toggleBehaviorExclusion(id: string): Promise<Behavior> {
    const res = await this.fetch.request<{ behavior: Record<string, unknown> }>(
      "POST",
      `/context/behaviors/${id}/toggle`,
    );
    return mapBehavior(res.behavior);
  }

  async submitCorrection(
    text: string,
  ): Promise<{ response: string; updatedContext: Partial<UserContext> }> {
    const res = await this.fetch.request<{
      response: string;
      updatedContext: Record<string, unknown>;
    }>("POST", "/context/corrections", { text });
    const patch: Partial<UserContext> = {};
    const raw = res.updatedContext;
    if (Array.isArray(raw.inferences))
      patch.inferences = (raw.inferences as Record<string, unknown>[]).map(mapInference);
    if (Array.isArray(raw.holdings))
      patch.holdings = (raw.holdings as Record<string, unknown>[]).map(mapHolding);
    if (Array.isArray(raw.principles))
      patch.principles = (raw.principles as Record<string, unknown>[]).map(mapPrinciple);
    if (Array.isArray(raw.memories))
      patch.memories = (raw.memories as Record<string, unknown>[]).map(mapMemory);
    if (Array.isArray(raw.behaviors))
      patch.behaviors = (raw.behaviors as Record<string, unknown>[]).map(mapBehavior);
    return { response: res.response, updatedContext: patch };
  }

  async getHoldingTrades(holdingId: string) {
    const res = await this.fetch.request<{
      trades: Array<{
        id: string;
        date: string;
        type: "buy" | "sell";
        quantity: number;
        unitPrice: number;
        amount: number;
      }>;
    }>("GET", `/holdings/${holdingId}/trades`);
    return res.trades;
  }
}

class RealHomeService implements IHomeService {
  constructor(private readonly fetch: ReturnType<typeof createFetcher>) {}

  async getDailyPerformance() {
    return this.fetch.request<{ portfolioReturn: number; benchmarkReturn: number; asOf: string }>(
      "GET",
      "/home/daily-performance",
    );
  }

  async getCurrentScenario(): Promise<Scenario> {
    const raw = await this.fetch.request<Record<string, unknown>>("GET", "/home/scenario");
    return mapScenario(raw);
  }

  async selectAction(action: string): Promise<{ initialPrompt: string }> {
    return this.fetch.request("POST", "/home/action", { action });
  }
}

class RealAgentService implements IAgentService {
  constructor(
    private readonly fetch: ReturnType<typeof createFetcher>,
    private readonly config: ApiClientConfig,
  ) {}

  async startConversation(prompt: string): Promise<{ conversationId: string }> {
    return this.fetch.request("POST", "/conversations", { prompt });
  }

  async *sendMessage(conversationId: string, text: string): AsyncIterable<DisplayMessage> {
    const url = `${this.config.baseUrl}/conversations/${conversationId}/messages`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = this.config.getToken?.();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new ApiError(payload?.error?.message ?? `Stream failed (${res.status})`, res.status);
    }

    if (!res.body) throw new ApiError("No stream body", 502);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") return;

        try {
          const msg = JSON.parse(payload) as DisplayMessage;
          yield msg;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  async resumeConversation(
    conversationId: string,
  ): Promise<{ conversationId: string; contextSummary: string; messages?: DisplayMessage[] }> {
    const response = await this.fetch.request<{
      conversationId: string;
      contextSummary?: string;
      messages?: Array<{
        id: string;
        role: string;
        text?: string | null;
        cardData?: unknown;
        createdAt?: string;
      }>;
    }>("POST", `/conversations/${conversationId}/resume`);

    // Map stored messages to DisplayMessage format
    const messages: DisplayMessage[] = (response.messages ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "agent",
      text: m.text ?? undefined,
      card: m.cardData as DisplayMessage["card"],
      timestamp: m.createdAt,
    }));

    return {
      conversationId: response.conversationId,
      contextSummary: response.contextSummary ?? "",
      messages,
    };
  }

  async getPastConversations(): Promise<ConversationSummary[]> {
    return this.fetch.request("GET", "/conversations");
  }

  async selectOption(
    conversationId: string,
    option: string,
    artifact?: { type: "principle" | "memory"; text: string },
  ): Promise<void> {
    await this.fetch.request("POST", `/conversations/${conversationId}/select`, {
      option,
      ...(artifact ? { artifact } : {}),
    });
  }

  async getSuggestedPrompts(): Promise<string[]> {
    const res = await this.fetch.request<{ prompts: string[] }>(
      "GET",
      "/conversations/suggested-prompts",
    );
    return res.prompts;
  }
}

// ─── Factory ─────────────────────────────────────────────────

class RealPerformanceService implements IPerformanceService {
  constructor(private readonly fetch: ReturnType<typeof createFetcher>) {}

  async getPerformanceTimeline(): Promise<PerformanceTimeline> {
    return this.fetch.request("GET", "/performance/timeline");
  }

  async getTimePointEvent(date: string): Promise<TimePointEvent | null> {
    return this.fetch.request("GET", `/performance/events/${date}`);
  }
}

export function createRealApiService(config: ApiClientConfig): IApiService {
  const fetcher = createFetcher(config);
  return {
    onboarding: new RealOnboardingService(fetcher),
    context: new RealContextService(fetcher),
    home: new RealHomeService(fetcher),
    agent: new RealAgentService(fetcher, config),
    performance: new RealPerformanceService(fetcher),
  };
}
