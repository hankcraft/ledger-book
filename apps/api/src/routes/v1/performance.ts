import { Elysia } from "elysia";
import type { PortfolioService } from "../../services/portfolio.service.ts";

export function createPerformanceRoutes(
  portfolioService: PortfolioService,
  getPortfolioId: () => string,
) {
  return new Elysia({ name: "routes:v1:performance", prefix: "/api/v1/performance" })
    .get("/timeline", async () => {
      const portfolioId = getPortfolioId();
      const dashboard = await portfolioService.getDashboard(portfolioId, "2025-12-31");

      // If we have real dashboard data, use it
      if (dashboard?.state === "ready" && dashboard.timelinePoints.length > 0) {
        const first = dashboard.timelinePoints[0]!;
        const points = dashboard.timelinePoints.map((p) => ({
          date: p.date,
          portfolioReturn: Math.round((p.marketValue / first.marketValue - 1) * 100 * 100) / 100,
          benchmarkReturn:
            Math.round((p.benchmarkValue / first.benchmarkValue - 1) * 100 * 100) / 100,
        }));
        return {
          points,
          metrics: {
            xirr: dashboard.metrics.xirr
              ? Math.round(Number(dashboard.metrics.xirr) * 1000) / 10
              : 0,
            twr: dashboard.metrics.twr ? Math.round(Number(dashboard.metrics.twr) * 1000) / 10 : 0,
            benchmarkReturn: dashboard.metrics.benchmarkReturn
              ? Math.round(Number(dashboard.metrics.benchmarkReturn) * 1000) / 10
              : 0,
          },
        };
      }

      // Fallback: empty timeline
      return { points: [], metrics: { xirr: 0, twr: 0, benchmarkReturn: 0 } };
    })
    .get("/events/:date", ({ params }) => {
      // Events are stored in ledger — return null if no matching event
      // In a full implementation, this would query ledger_entries + market events
      void params;
      return null;
    });
}
