import { Elysia, t } from "elysia";
import type { PortfolioService } from "../services/portfolio.service.ts";
import type { LedgerService } from "../services/ledger.service.ts";
import type { ImportService } from "../services/import.service.ts";
import { apiError } from "../lib/errors.ts";
import { isIsoDate, isLedgerEntryType } from "../lib/validation.ts";
import type { CreateEntryRequest } from "@ledger-book/contracts";

export function createPortfolioRoutes(
  portfolioService: PortfolioService,
  ledgerService: LedgerService,
  importService: ImportService,
) {
  return new Elysia({ name: "routes:portfolios" })
    .get(
      "/api/portfolios/:portfolioId/dashboard",
      async ({ params, query, set }) => {
        const exists = await portfolioService.portfolioExists(params.portfolioId);
        if (!exists) {
          set.status = 404;
          return apiError("portfolio_not_found", "找不到投資組合。");
        }

        const asOfDate = query.asOfDate ?? "2025-12-31";
        if (!isIsoDate(asOfDate)) {
          set.status = 400;
          return apiError("invalid_as_of_date", "asOfDate 必須是 YYYY-MM-DD。");
        }

        const dashboard = await portfolioService.getDashboard(params.portfolioId, asOfDate);
        if (!dashboard) {
          set.status = 404;
          return apiError("valuation_data_missing", "所選日期沒有估值資料。");
        }
        return dashboard;
      },
      { query: t.Object({ asOfDate: t.Optional(t.String()) }) },
    )
    .get("/api/portfolios/:portfolioId/ledger", async ({ params, set }) => {
      const exists = await portfolioService.portfolioExists(params.portfolioId);
      if (!exists) {
        set.status = 404;
        return apiError("portfolio_not_found", "找不到投資組合。");
      }

      const hasImported = await importService.hasImported(params.portfolioId);
      const hasEntries = await ledgerService.hasEntries(params.portfolioId);
      if (!hasImported && !hasEntries) {
        return [];
      }
      return ledgerService.getEntries(params.portfolioId);
    })
    .post(
      "/api/portfolios/:portfolioId/entries",
      async ({ params, body, set }) => {
        const exists = await portfolioService.portfolioExists(params.portfolioId);
        if (!exists) {
          set.status = 404;
          return apiError("portfolio_not_found", "找不到投資組合。");
        }
        if (!isIsoDate(body.occurredOn)) {
          set.status = 400;
          return apiError("invalid_date", "occurredOn 必須是有效的 YYYY-MM-DD。");
        }
        if (!isLedgerEntryType(body.entryType)) {
          set.status = 400;
          return apiError("invalid_entry_type", "entryType 無效。");
        }
        const entry = await ledgerService.createEntry(
          params.portfolioId,
          body as unknown as CreateEntryRequest,
        );
        set.status = 201;
        return { entry };
      },
      {
        body: t.Object({
          occurredOn: t.String({ minLength: 1 }),
          entryType: t.String({ minLength: 1 }),
          securityId: t.Optional(t.String()),
          quantity: t.Optional(t.Number()),
          unitPrice: t.Optional(t.Number()),
          grossCashAmount: t.Number(),
          feeAmount: t.Number(),
        }),
      },
    )
    .post(
      "/api/portfolios/:portfolioId/entries/batch",
      async ({ params, body, set }) => {
        const exists = await portfolioService.portfolioExists(params.portfolioId);
        if (!exists) {
          set.status = 404;
          return apiError("portfolio_not_found", "找不到投資組合。");
        }
        if (!Array.isArray(body.entries) || body.entries.length === 0) {
          set.status = 400;
          return apiError("empty_batch", "批次不能為空。");
        }
        for (const entry of body.entries) {
          if (!isIsoDate(entry.occurredOn) || !isLedgerEntryType(entry.entryType)) {
            set.status = 400;
            return apiError("invalid_entry", "批次中含有無效的日期或類型。");
          }
        }
        const result = await ledgerService.createEntries(
          params.portfolioId,
          body.entries as unknown as CreateEntryRequest[],
        );
        set.status = 201;
        return result;
      },
      {
        body: t.Object({
          entries: t.Array(
            t.Object({
              occurredOn: t.String({ minLength: 1 }),
              entryType: t.String({ minLength: 1 }),
              securityId: t.Optional(t.String()),
              quantity: t.Optional(t.Number()),
              unitPrice: t.Optional(t.Number()),
              grossCashAmount: t.Number(),
              feeAmount: t.Number(),
            }),
          ),
        }),
      },
    );
}
