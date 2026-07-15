import { Elysia, t } from "elysia";
import type { PortfolioService } from "../services/portfolio.service.ts";
import type { LedgerService } from "../services/ledger.service.ts";
import type { ImportService } from "../services/import.service.ts";
import { apiError } from "../lib/errors.ts";

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

      const agentEndpoint = Bun.env.AGENT_ENDPOINT ?? "http://localhost:8080";
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

      const context = [
        "## 用戶持股組合",
        holdingsSummary,
        "",
        "## 最近交易紀錄（最近20筆）",
        ledgerSummary,
      ].join("\n");

      const prompt = `${context}\n\n---\n\n用戶提問：${body.message}`;

      try {
        const res = await fetch(`${agentEndpoint}/invocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error(`[agent-chat] Agent responded ${res.status}: ${text.slice(0, 200)}`);
          set.status = 502;
          return apiError("agent_unavailable", "AI 助手暫時無法回應，請稍後再試。");
        }

        if (!res.body) {
          set.status = 502;
          return apiError("agent_invalid_response", "AI 助手回應格式異常。");
        }

        set.headers["content-type"] = "text/event-stream";
        set.headers["cache-control"] = "no-cache";
        set.headers["connection"] = "keep-alive";

        return new Response(res.body, {
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
