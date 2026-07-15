/**
 * V1 AI-Native API Routes
 *
 * Provides /api/v1 endpoints consumed by apps/web service client.
 * Backed by an in-memory store (same pattern as the legacy demo store).
 * Will be replaced by PostgreSQL in a future phase.
 */

import { Elysia, t } from "elysia";
import type {
  V1UserContext,
  V1Holding,
  V1Principle,
  V1Memory,
  V1Inference,
  V1Behavior,
  V1Scenario,
  V1ConversationSummary,
  V1StreamMessage,
} from "@ledger-book/contracts";
import { invokeAgent, streamAgentAsV1Messages, buildPortfolioContext } from "./agent-client";

// ─── Seed Data ───────────────────────────────────────────────

const seedHoldings: V1Holding[] = [
  { id: "h1", name: "台積電", weight: 40, cost: 980, plPercent: 12 },
  { id: "h2", name: "聯發科", weight: 28, cost: 1280, plPercent: -5 },
  { id: "h3", name: "長榮", weight: 20, cost: 168, plPercent: 8 },
  { id: "h4", name: "聯電", weight: 12, cost: 52, plPercent: 3 },
];

const seedPrinciples: V1Principle[] = [
  { id: "p1", statement: "單一個股不超過 30%", confirmedAt: "2026-07-10", source: "集中度超標", paused: false },
  { id: "p2", statement: "科技股集中是我刻意的", confirmedAt: "2026-07-08", source: "產業配置", paused: false },
  { id: "p3", statement: "以長期持有為主", confirmedAt: "2026-07-05", source: "投資風格", paused: false },
];

const seedMemories: V1Memory[] = [
  { id: "m1", quote: "其實最難受的是不知道發生什麼，不一定是真的想賣", date: "2026-07-05", source: "台積電下跌", archived: false },
  { id: "m2", quote: "覺得跌很多，大家都說會反彈", date: "2026-06-28", source: "買進聯發科", archived: false },
  { id: "m3", quote: "我不太看技術分析，主要看公司基本面", date: "2026-06-20", source: "投資方法", archived: false },
  { id: "m4", quote: "最近工作很忙，沒時間看盤", date: "2026-07-12", source: "使用頻率下降", archived: false },
  { id: "m5", quote: "電動車我不太懂，不想碰", date: "2026-06-15", source: "選股範圍", archived: false },
];

const seedInferences: V1Inference[] = [
  { id: "i1", statement: "你可能比較容易在市場熱度上升時進場", confidence: "MEDIUM", evidence: "近5次買進中4次發生在個股月漲幅>10%時", status: "PENDING" },
  { id: "i2", statement: "實際操作比自述策略更短線——平均持有 18 天 vs 自述長期", confidence: "HIGH", evidence: "交易紀錄顯示平均持有天數18天", status: "PENDING" },
];

const seedBehaviors: V1Behavior[] = [
  { id: "b1", label: "平均持有天數", value: "18 天", excluded: false },
  { id: "b2", label: "日均開啟次數", value: "2.3 次", detail: "虧損日 ×3.1", excluded: false },
  { id: "b3", label: "查看虧損股頻率", value: "獲利股的 4.2 倍", excluded: false },
];

const scenarios: V1Scenario[] = [
  {
    id: "concentration-risk",
    greeting: "我今天替你看了庫存，有兩件事情值得注意。",
    insight: "你持有 4 檔股票，但實際有 68% 的風險來自同一個 AI 伺服器題材。",
    attentionItems: [
      { id: "theme-overlap", label: "題材高度重疊", detail: "台積電、聯發科、聯電都跟 AI 半導體相關，漲跌方向一致的天數佔 78%。", severity: "WARNING" },
      { id: "single-sector", label: "電子股佔比過高", detail: "你的持倉 80% 集中在電子產業，缺乏其他產業的對沖。", severity: "DANGER" },
    ],
    actions: ["為什麼我比大盤跌得多？", "這是短期波動還是配置問題？", "我現在很焦慮，幫我整理一下"],
  },
  {
    id: "market-drop",
    greeting: "今天開盤大盤跌了 1.8%，我幫你看了持股的影響。",
    insight: "你的投資組合今天帳面下跌約 3.2 萬，但其中 2.4 萬來自台積電一檔的貢獻。",
    attentionItems: [
      { id: "single-stock-impact", label: "單一個股影響過大", detail: "台積電佔你總部位 40%，今天下跌 4.1%，貢獻了整體虧損的 75%。", severity: "DANGER" },
      { id: "vs-benchmark", label: "相對大盤表現", detail: "大盤跌 1.8%，你跌 2.6%。差異主要來自集中持股。", severity: "INFO" },
    ],
    actions: ["幫我算如果繼續跌 5% 的影響", "我該不該減碼台積電？", "歷史上類似跌幅通常多久恢復？"],
  },
];

const pastConversations: V1ConversationSummary[] = [
  { id: "conv-1", date: "7/12", trigger: "想全部賣掉", conclusion: "短期波動，你後來決定觀察 2 天", artifact: { type: "principle", text: "單一個股不超過 30%" } },
  { id: "conv-2", date: "7/8", trigger: "聯發科要不要停損", conclusion: "你確認買進理由仍在，繼續持有", artifact: { type: "memory", text: "覺得跌很多，大家都說會反彈" } },
  { id: "conv-3", date: "7/5", trigger: "為什麼我比大盤跌得多", conclusion: "68% 集中於 AI 題材是主因", artifact: null },
];

// ─── Stock insight generation (deterministic for PoC) ─────────

function generateMidInsight(stockName: string): string {
  const insights: Record<string, string> = {
    台積電: "台積電目前位於年度相對高檔，近三個月外資持續加碼。以你的持有狀態來看，這個位置容易產生「要不要獲利了結」的焦慮——這很正常。",
    聯發科: "聯發科近期受惠 AI 手機題材，股價從底部反彈約 25%。法人看法分歧，短線波動較大。現階段的核心問題是：你買的是「題材」還是「基本面」？",
    長榮: "長榮目前處於航運景氣循環的相對高點，殖利率仍具吸引力但股價已反映大部分利多。關鍵問題是：你是存股領息，還是賺價差？",
  };
  return insights[stockName] ?? "以你的持有狀態來看，重要的不是漲跌預測，而是釐清你的焦慮來源——是怕虧損？怕錯過？還是不確定該不該動？";
}

function generateFinalInsight(stockName: string, pnlStatus: string, cost: number, weight: number): string {
  const costStr = String(cost);
  const weightStr = String(weight);
  if (pnlStatus === "PROFIT") return `你在${stockName}的成本約 ${costStr} 元，佔部位 ${weightStr}%。目前帳面獲利中，但佔比${weight > 30 ? "偏高" : "適中"}。你的焦慮更像是「配置焦慮」。`;
  if (pnlStatus === "LOSS") return `你在${stockName}的成本約 ${costStr} 元，佔部位 ${weightStr}%，目前處於虧損。這是典型的「價格焦慮」。問題是：你能等多久？`;
  return `你在${stockName}的成本約 ${costStr} 元，佔部位 ${weightStr}%，目前接近成本價。建議設定明確的停利停損點。`;
}

// ─── Conversation script for demo streaming ──────────────────

function createDemoStreamMessages(_prompt: string): V1StreamMessage[] {
  const messages: V1StreamMessage[] = [
    { id: "turn-1", role: "agent", text: "我先幫你分清楚：今天真的發生了多大的變化？" },
    { id: "turn-2", role: "agent", card: { type: "insight", title: "今日持倉變化", portfolioChange: "-2.8%", marketChange: "-1.5%", breakdown: [{ label: "台積電", value: "-3.2%", note: "佔持倉 40%" }, { label: "聯發科", value: "-4.1%", note: "佔持倉 28%" }] } },
    { id: "turn-3", role: "agent", card: { type: "memory-recall", date: "2026-07-05", context: "上次你也是在單日跌幅超過 2.5% 時表示想離場", quote: "其實最難受的是不知道發生什麼，不一定是真的想賣。" } },
    { id: "turn-4", role: "agent", card: { type: "scenario-comparison", scenarios: [{ id: "v", title: "短期波動", likelihood: "高", description: "基本面未變，持續持有歷史勝率較高。", action: "觀察 2-3 天" }, { id: "o", title: "部位過重", likelihood: "中", description: "科技股佔比 68%，可考慮減碼。", action: "減碼至目標比例" }, { id: "f", title: "基本面改變", likelihood: "低", description: "營收穩定，無重大利空。", action: "重新檢視買進理由" }] } },
    { id: "turn-5", role: "agent", card: { type: "confirmation-question", question: "你現在最想先釐清哪一件事？", options: ["這次下跌原因", "我的部位是不是太重", "原本買進理由是否改變"] } },
  ];
  return messages;
}

// ─── In-Memory Store ─────────────────────────────────────────

interface V1Store {
  context: V1UserContext;
  scenarioIndex: number;
  conversations: Map<string, { selectedOption: string | null; hasResponded: boolean }>;
}

function createV1Store(): V1Store {
  return {
    context: {
      holdings: structuredClone(seedHoldings),
      principles: structuredClone(seedPrinciples),
      memories: structuredClone(seedMemories),
      inferences: structuredClone(seedInferences),
      behaviors: structuredClone(seedBehaviors),
    },
    scenarioIndex: 0,
    conversations: new Map(),
  };
}

// ─── Route Factory ───────────────────────────────────────────

function v1Error(code: string, message: string) {
  return { error: { code, message } };
}

export function createV1Routes(store = createV1Store()) {

  return new Elysia({ prefix: "/api/v1" })
    // ─── Onboarding ──────────────────────────────────────
    .post("/onboarding/insight", async ({ body }) => {
      try {
        console.log("[v1] Using agent for onboarding/insight");
        const prompt = `分析 ${body.stockName} 對一位目前持有中的投資者，目前的市場位置和可能的焦慮來源。請用繁體中文，簡潔回答，150字以內。不要給投資建議。`;
        const insight = await invokeAgent({ prompt });
        return { insight };
      } catch (err) {
        console.log("[v1] Agent unavailable for insight, using fallback:", err instanceof Error ? err.message : err);
        return { insight: generateMidInsight(body.stockName) };
      }
    }, {
      body: t.Object({ stockName: t.String(), holdingStatus: t.String() }),
    })
    .post("/onboarding/final-insight", async ({ body }) => {
      try {
        console.log("[v1] Using agent for onboarding/final-insight");
        const pnlLabel = body.pnlStatus === "PROFIT" ? "獲利中" : body.pnlStatus === "LOSS" ? "虧損中" : "接近成本";
        const prompt = `投資者持有 ${body.stockName}，成本約 ${body.cost ?? 500} 元，佔部位 ${body.weightPercent ?? 30}%，目前${pnlLabel}。分析這位投資者的焦慮來源是「價格焦慮」還是「配置焦慮」，並給出觀察。請用繁體中文，200字以內。不要給投資建議。`;
        const insight = await invokeAgent({ prompt });
        return { insight };
      } catch (err) {
        console.log("[v1] Agent unavailable for final-insight, using fallback:", err instanceof Error ? err.message : err);
        return { insight: generateFinalInsight(body.stockName, body.pnlStatus, body.cost ?? 500, body.weightPercent ?? 30) };
      }
    }, {
      body: t.Object({ stockName: t.String(), holdingStatus: t.String(), pnlStatus: t.String(), cost: t.Optional(t.Number()), weightPercent: t.Optional(t.Number()) }),
    })
    .post("/onboarding/complete", ({ body, set }) => {
      const userHolding: V1Holding = {
        id: "h-onboard",
        name: body.stockName,
        weight: body.weightPercent ?? 30,
        cost: body.cost ?? 500,
        plPercent: body.pnlStatus === "PROFIT" ? 12 : body.pnlStatus === "LOSS" ? -5 : 1,
      };
      store.context = {
        holdings: [userHolding, ...seedHoldings.filter((h) => h.name !== body.stockName)],
        principles: structuredClone(seedPrinciples),
        memories: structuredClone(seedMemories),
        inferences: structuredClone(seedInferences),
        behaviors: structuredClone(seedBehaviors),
      };
      set.status = 201;
      return { context: structuredClone(store.context) };
    }, {
      body: t.Object({ stockName: t.String(), holdingStatus: t.String(), pnlStatus: t.String(), cost: t.Optional(t.Number()), weightPercent: t.Optional(t.Number()) }),
    })
    // ─── Context ─────────────────────────────────────────
    .get("/context", () => structuredClone(store.context))
    .post("/context/inferences/:id/confirm", ({ params, set }) => {
      const inference = store.context.inferences.find((i) => i.id === params.id);
      if (!inference) { set.status = 404; return v1Error("NOT_FOUND", "Inference not found"); }
      inference.status = "CONFIRMED";
      const newPrinciple: V1Principle = {
        id: `p-from-${params.id}`,
        statement: inference.statement,
        confirmedAt: new Date().toISOString().slice(0, 10),
        source: "AI 推論確認",
        paused: false,
        badge: "剛確認",
      };
      store.context.principles.push(newPrinciple);
      return { newPrinciple: structuredClone(newPrinciple) };
    })
    .post("/context/inferences/:id/deny", ({ params, body, set }) => {
      const inference = store.context.inferences.find((i) => i.id === params.id);
      if (!inference) { set.status = 404; return v1Error("NOT_FOUND", "Inference not found"); }
      inference.status = "DENIED";
      inference.denyReason = body.reason;
    }, { body: t.Object({ reason: t.String() }) })
    .post("/context/memories/:id/archive", ({ params, set }) => {
      const memory = store.context.memories.find((m) => m.id === params.id);
      if (!memory) { set.status = 404; return v1Error("NOT_FOUND", "Memory not found"); }
      memory.archived = true;
    })
    .post("/context/principles/:id/toggle", ({ params, set }) => {
      const principle = store.context.principles.find((p) => p.id === params.id);
      if (!principle) { set.status = 404; return v1Error("NOT_FOUND", "Principle not found"); }
      principle.paused = !principle.paused;
      return { principle: structuredClone(principle) };
    })
    .delete("/context/principles/:id", ({ params, set }) => {
      const idx = store.context.principles.findIndex((p) => p.id === params.id);
      if (idx === -1) { set.status = 404; return v1Error("NOT_FOUND", "Principle not found"); }
      store.context.principles.splice(idx, 1);
      set.status = 204;
    })
    .post("/context/behaviors/:id/toggle", ({ params, set }) => {
      const behavior = store.context.behaviors.find((b) => b.id === params.id);
      if (!behavior) { set.status = 404; return v1Error("NOT_FOUND", "Behavior not found"); }
      behavior.excluded = !behavior.excluded;
      return { behavior: structuredClone(behavior) };
    })
    .post("/context/corrections", ({ body }) => {
      const inference = store.context.inferences.find((i) => i.status === "PENDING");
      if (inference) {
        inference.status = "DENIED";
        inference.denyReason = `使用者修正：${body.text}`;
      }
      return {
        response: inference
          ? `好的，我已根據你的說明「${body.text}」重新評估「${inference.statement}」。`
          : `好的，我已記錄你的說明「${body.text}」。`,
        updatedContext: { inferences: structuredClone(store.context.inferences) },
      };
    }, { body: t.Object({ text: t.String() }) })
    // ─── Home ────────────────────────────────────────────
    .get("/home/scenario", async () => {
      const scenario = structuredClone(scenarios[store.scenarioIndex % scenarios.length]!);
      store.scenarioIndex++;

      try {
        console.log("[v1] Using agent for home/scenario insight enrichment");
        const portfolioContext = buildPortfolioContext(store.context.holdings);
        const prompt = `根據這位投資者的持股組合，用一句話（50字內）指出目前最值得注意的一件事。不要給投資建議，只陳述觀察。`;
        const agentInsight = await invokeAgent({ prompt, portfolioContext, timeout: 15_000 });
        if (agentInsight && agentInsight.length > 5) {
          scenario.insight = agentInsight;
        }
      } catch (err) {
        console.log("[v1] Agent unavailable for scenario, using seed insight:", err instanceof Error ? err.message : err);
      }

      return scenario;
    })
    .post("/home/action", ({ body }) => {
      return { initialPrompt: body.action };
    }, { body: t.Object({ action: t.String() }) })
    // ─── Conversations ───────────────────────────────────
    .get("/conversations", () => structuredClone(pastConversations))
    .post("/conversations", ({ set }) => {
      const id = `conv-${Date.now()}`;
      store.conversations.set(id, { selectedOption: null, hasResponded: false });
      set.status = 201;
      return { conversationId: id };
    }, { body: t.Object({ prompt: t.String() }) })
    .post("/conversations/:id/messages", async ({ params, body, set }) => {
      const conv = store.conversations.get(params.id);
      if (!conv) { set.status = 404; return v1Error("NOT_FOUND", "Conversation not found"); }

      // Try real Agent first
      try {
        console.log("[v1] Using agent for conversation message");
        const portfolioContext = buildPortfolioContext(
          store.context.holdings,
          store.context.principles,
          store.context.memories,
        );
        const turnId = `turn-${Date.now()}`;
        conv.hasResponded = true;
        return await streamAgentAsV1Messages(
          { prompt: body.text, portfolioContext },
          turnId,
          {
            holdings: store.context.holdings,
            memories: store.context.memories,
          },
        );
      } catch (err) {
        console.log("[v1] Agent unavailable for conversation, using fallback:", err instanceof Error ? err.message : err);
      }

      // Fallback: scripted demo messages
      let messages: V1StreamMessage[];
      if (!conv.hasResponded) {
        conv.hasResponded = true;
        messages = createDemoStreamMessages(body.text);
      } else {
        messages = [{ id: `follow-up-${Date.now()}`, role: "agent", text: `你選擇先釐清「${conv.selectedOption ?? body.text}」。我會把這個問題和你的持倉、過去記憶一起整理。` }];
      }

      set.headers["content-type"] = "text/event-stream";
      set.headers["cache-control"] = "no-cache";
      set.headers["connection"] = "keep-alive";

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for (const msg of messages) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
            await new Promise((r) => setTimeout(r, 80));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }, { body: t.Object({ text: t.String() }) })
    .post("/conversations/:id/resume", ({ params }) => {
      const newId = `conv-resume-${Date.now()}`;
      store.conversations.set(newId, { selectedOption: null, hasResponded: true });
      return { conversationId: newId, contextSummary: `延續上次對話 ${params.id} 的脈絡…` };
    })
    .post("/conversations/:id/select", ({ params, body, set }) => {
      const conv = store.conversations.get(params.id);
      if (!conv) { set.status = 404; return v1Error("NOT_FOUND", "Conversation not found"); }
      conv.selectedOption = body.option;
      set.status = 204;
    }, { body: t.Object({ option: t.String() }) });
}
