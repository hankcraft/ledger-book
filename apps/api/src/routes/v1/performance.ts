import { Elysia } from "elysia";
import type { PrismaClient } from "@prisma/client";
import type { PortfolioService } from "../../services/portfolio.service.ts";

export function createPerformanceRoutes(
  portfolioService: PortfolioService,
  getPortfolioId: () => string,
  db?: PrismaClient,
) {
  return new Elysia({ name: "routes:v1:performance", prefix: "/api/v1/performance" })
    .get("/timeline", async () => {
      const portfolioId = getPortfolioId();
      const today = new Date().toISOString().slice(0, 10);
      const dashboard = await portfolioService.getDashboard(portfolioId, today);

      // Gather event dates from ledger entries (buy/sell only)
      let eventDates: string[] = [];
      let missingDates = false;

      if (db) {
        const entries = await db.ledgerEntry.findMany({
          where: {
            portfolioId,
            entryType: { in: ["buy", "sell"] },
          },
          select: { occurredOn: true },
          distinct: ["occurredOn"],
          orderBy: { occurredOn: "asc" },
        });
        eventDates = entries.map((e) => e.occurredOn);

        // Check if any V1 holdings lack purchaseDate
        const holdingsWithoutDate = await db.v1Holding.count({
          where: {
            user: { portfolios: { some: { id: portfolioId } } },
            purchaseDate: null,
          },
        });
        missingDates = holdingsWithoutDate > 0;
      }

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
          eventDates,
          missingDates,
        };
      }

      // Fallback: empty timeline
      return {
        points: [],
        metrics: { xirr: 0, twr: 0, benchmarkReturn: 0 },
        eventDates,
        missingDates,
      };
    })
    .get("/events/:date", async ({ params }) => {
      if (!db) return null;

      const portfolioId = getPortfolioId();
      const entries = await db.ledgerEntry.findMany({
        where: {
          portfolioId,
          occurredOn: params.date,
          entryType: { in: ["buy", "sell"] },
        },
        include: { security: { select: { name: true, symbol: true } } },
        orderBy: { sequence: "asc" },
      });

      if (entries.length === 0) return null;

      const trades = entries.map((e) => ({
        name: e.security?.name ?? "未知",
        symbol: e.security?.symbol ?? "",
        type: e.entryType as "buy" | "sell",
        quantity: Number(e.quantity ?? 0),
        unitPrice: Number(e.unitPrice ?? 0),
        amount: Math.abs(Number(e.grossCashAmount)),
      }));

      // Derive a simple sentiment from the trade pattern
      const buyCount = trades.filter((t) => t.type === "buy").length;
      const sellCount = trades.filter((t) => t.type === "sell").length;
      let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
      if (buyCount > 0 && sellCount === 0) sentiment = "bullish";
      else if (sellCount > 0 && buyCount === 0) sentiment = "bearish";

      const summaryParts = trades.map(
        (t) => `${t.type === "buy" ? "買" : "賣"} ${t.name} ${t.quantity}股 @${t.unitPrice}`,
      );

      return {
        date: params.date,
        type: buyCount >= sellCount ? "buy" : "sell",
        summary: summaryParts.join("、"),
        sentiment,
        trades,
      };
    })
    .post("/trades", async ({ body, set }) => {
      if (!db) {
        set.status = 500;
        return { error: { code: "NO_DB", message: "Database not available" } };
      }

      const { symbol, entryType, quantity, unitPrice, date } = body as {
        symbol: string;
        entryType: "buy" | "sell";
        quantity: number;
        unitPrice: number;
        date: string;
      };

      if (!symbol || !entryType || !quantity || !unitPrice || !date) {
        set.status = 400;
        return { error: { code: "INVALID_INPUT", message: "缺少必要欄位" } };
      }

      const portfolioId = getPortfolioId();

      // Resolve or create security by symbol
      const security = await db.security.upsert({
        where: { market_symbol: { market: "TWSE", symbol } },
        update: {},
        create: {
          symbol,
          market: "TWSE",
          name: symbol,
          assetType: "stock",
          currency: "TWD",
        },
      });

      // Get next sequence
      const last = await db.ledgerEntry.findFirst({
        where: { portfolioId },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      const sequence = (last?.sequence ?? 0) + 1;

      const amount = quantity * unitPrice;
      const grossCashAmount = entryType === "buy" ? -amount : amount;

      const entry = await db.ledgerEntry.create({
        data: {
          portfolioId,
          sequence,
          occurredOn: date,
          entryType,
          securityId: security.id,
          quantity,
          unitPrice,
          grossCashAmount,
          feeAmount: 0,
        },
      });

      // Seed a market price for this date so the chart can pick it up
      await db.marketPrice.upsert({
        where: { securityId_tradedOn: { securityId: security.id, tradedOn: date } },
        update: { closePrice: unitPrice },
        create: { securityId: security.id, tradedOn: date, closePrice: unitPrice, source: "trade" },
      });

      set.status = 201;
      return {
        entry: {
          id: entry.id,
          date: entry.occurredOn,
          type: entry.entryType,
          symbol: security.symbol,
          name: security.name,
          quantity: Number(entry.quantity),
          unitPrice: Number(entry.unitPrice),
          amount: Math.abs(Number(entry.grossCashAmount)),
        },
      };
    });
}
