import { Elysia, t } from "elysia";
import type { ContextService } from "../../services/context.service.ts";
import { invokeAgent, buildPortfolioContext, extractFollowUpOptions } from "../../agent-client.ts";

export function createHomeRoutes(contextService: ContextService, getUserId: () => string) {
  return new Elysia({ name: "routes:v1:home", prefix: "/api/v1/home" })
    .get("/daily-performance", async () => {
      const userId = getUserId();
      const ctx = await contextService.getContext(userId);

      const totalWeight = ctx.holdings.reduce((sum, h) => sum + h.weight, 0);
      const portfolioReturn =
        totalWeight > 0
          ? ctx.holdings.reduce((sum, h) => sum + (h.plPercent * h.weight) / totalWeight, 0) * 0.1
          : 0;

      return {
        portfolioReturn: Math.round(portfolioReturn * 100) / 100,
        benchmarkReturn: 0.8,
        asOf: new Date().toISOString().slice(0, 10),
      };
    })
    .get("/scenario", async () => {
      const userId = getUserId();
      const ctx = await contextService.getContext(userId);

      // Build a scenario from the user's actual holdings
      const topHolding = ctx.holdings.toSorted((a, b) => b.weight - a.weight)[0];
      const scenario = {
        id: `scenario-${Date.now()}`,
        greeting: "我今天替你看了庫存，有件事情值得注意。",
        insight: topHolding
          ? `你持有 ${ctx.holdings.length} 檔股票，其中 ${topHolding.name} 佔比最高（${topHolding.weight}%）。`
          : "你目前還沒有持股資料。",
        attentionItems: ctx.holdings
          .filter((h) => h.weight > 30)
          .map((h) => ({
            id: `attention-${h.id}`,
            label: `${h.name} 佔比偏高`,
            detail: `${h.name} 佔你持倉 ${h.weight}%，超過建議的單一個股上限。`,
            severity: "WARNING" as const,
          })),
        actions: [
          "為什麼我比大盤跌得多？",
          "這是短期波動還是配置問題？",
          "我現在很焦慮，幫我整理一下",
        ],
      };

      // Try agent enrichment
      try {
        const portfolioContext = buildPortfolioContext(ctx.holdings);
        const prompt =
          "根據這位投資者的持股組合，用一句話（50字內）指出目前最值得注意的一件事。不要給投資建議，只陳述觀察。";
        const agentInsight = await invokeAgent({ prompt, portfolioContext, timeout: 15_000 });
        if (agentInsight && agentInsight.length > 5) {
          const { text } = extractFollowUpOptions(agentInsight);
          scenario.insight = text || agentInsight;
        }
      } catch (err) {
        console.log(
          "[v1] Agent unavailable for scenario:",
          err instanceof Error ? err.message : err,
        );
      }

      return scenario;
    })
    .post("/action", ({ body }) => ({ initialPrompt: body.action }), {
      body: t.Object({ action: t.String() }),
    });
}
