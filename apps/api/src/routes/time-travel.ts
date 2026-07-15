import { Elysia, t } from "elysia";
import type { TimeTravelService } from "../services/time-travel.service.ts";
import type { ImportService } from "../services/import.service.ts";
import type { PortfolioService } from "../services/portfolio.service.ts";
import { apiError } from "../lib/errors.ts";
import { isIsoDate } from "../lib/validation.ts";

export function createTimeTravelRoutes(
  timeTravelService: TimeTravelService,
  importService: ImportService,
  portfolioService: PortfolioService,
) {
  return new Elysia({ name: "routes:time-travel" })
    .post(
      "/api/portfolios/:portfolioId/time-travel-reports",
      async ({ params, body, set }) => {
        const exists = await portfolioService.portfolioExists(params.portfolioId);
        if (!exists) {
          set.status = 404;
          return apiError("portfolio_not_found", "找不到投資組合。");
        }
        const hasImported = await importService.hasImported(params.portfolioId);
        if (!hasImported) {
          set.status = 409;
          return apiError("demo_import_required", "請先匯入 Fake Demo。");
        }
        if (!body.securityId || !isIsoDate(body.asOfDate)) {
          set.status = 400;
          return apiError("invalid_request", "標的或日期無效。");
        }

        const report = await timeTravelService.createReport(
          params.portfolioId,
          body.securityId,
          body.asOfDate,
        );
        if (!report) {
          set.status = 404;
          return apiError("historical_evidence_missing", "所選日期沒有可引用資料。");
        }
        set.status = 201;
        return report;
      },
      {
        body: t.Object({
          securityId: t.String({ minLength: 1 }),
          asOfDate: t.String({ minLength: 1 }),
        }),
      },
    )
    .get("/api/time-travel-reports/:reportId", async ({ params, set }) => {
      const report = await timeTravelService.getReport(params.reportId);
      if (!report) {
        set.status = 404;
        return apiError("report_not_found", "找不到回溯報告。");
      }
      return report;
    });
}
