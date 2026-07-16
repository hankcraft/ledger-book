import { Elysia, t } from "elysia";
import type { PortfolioService } from "../services/portfolio.service.ts";
import type { LedgerService } from "../services/ledger.service.ts";
import type { ImportService } from "../services/import.service.ts";
import { apiError } from "../lib/errors.ts";
import { invokeAgent } from "../agent-client.ts";

export function createAgentChatRoutes(
  portfolioService: PortfolioService,
  ledgerService: LedgerService,
  importService: ImportService,
  defaultPortfolioId: string,
) {
  return new Elysia({ name: "routes:agent-chat" }).post(
    "/api/agent/chat",
    async ({ body, set }) => {
      const hasImported = await importService.hasImported(defaultPortfolioId);
      if (!hasImported) {
        set.status = 409;
        return apiError("demo_import_required", "請先匯入 Fake Demo。");
      }

      const ledger = await ledgerService.getEntries(defaultPortfolioId);
      const dashboard = await portfolioService.getDashboard(defaultPortfolioId, "2025-12-31");

      const holdingsSummary =
        dashboard?.state === "ready"
          ? dashboard.holdings
              .map(
                (h) =>
                  `${h.symbol} ${h.name}: ${h.quantity}股, 市值${h.marketValue}, 漲跌${h.changePercent}%`,
              )
              .join("\n")
          : "";

      const ledgerSummary = ledger
        .slice(-20)
        .map(
          (e) =>
            `${e.occurredOn} ${e.entryType} ${e.securityId ?? ""} ${e.quantity ?? ""} $${e.grossCashAmount}`,
        )
        .join("\n");

      const portfolioContext = [
        "## 用戶持股組合",
        holdingsSummary,
        "",
        "## 最近交易紀錄（最近20筆）",
        ledgerSummary,
      ].join("\n");

      try {
        const agentText = await invokeAgent({
          prompt: body.message,
          portfolioContext,
          timeout: 60_000,
        });

        // Stream the response as SSE for compatibility
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(agentText)}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (err) {
        console.error(`[agent-chat] ${err instanceof Error ? err.message : err}`);
        set.status = 502;
        return apiError("agent_unavailable", "AI 助手暫時無法回應，請稍後再試。");
      }
    },
    { body: t.Object({ message: t.String({ minLength: 1 }) }) },
  );
}
