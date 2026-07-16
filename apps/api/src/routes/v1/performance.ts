import { Elysia } from "elysia";
import type { PrismaClient } from "@prisma/client";
import type { PortfolioService } from "../../services/portfolio.service.ts";
import type { OpenSearchService } from "../../services/opensearch.service.ts";

export function createPerformanceRoutes(
  portfolioService: PortfolioService,
  getPortfolioId: () => string,
  db?: PrismaClient,
  openSearch?: OpenSearchService,
) {
  return new Elysia({ name: "routes:v1:performance", prefix: "/api/v1/performance" })
    .get("/timeline", async () => {
      const portfolioId = getPortfolioId();
      // All seed/demo data lives in 2025; cap asOfDate to 2025-12-31.
      const today = "2025-12-31";
      const dashboard = await portfolioService.getDashboard(portfolioId, today);

      // ─── Collect event dates from social sentiment + dividend (NOT buy/sell) ───
      let eventDates: string[] = [];
      let missingDates = false;

      if (db) {
        // Check if any V1 holdings lack purchaseDate
        const holdingsWithoutDate = await db.v1Holding.count({
          where: {
            user: { portfolios: { some: { id: portfolioId } } },
            purchaseDate: null,
          },
        });
        missingDates = holdingsWithoutDate > 0;
      }

      // Get user's held stock codes for event queries
      const heldStockCodes = await getHeldStockCodes(portfolioId, db);

      // Gather event dates from OpenSearch: dividend ex-dates and notable sentiment days
      if (openSearch?.isAvailable() && heldStockCodes.length > 0) {
        const dividendEvents = await openSearch.getDividendEvents(heldStockCodes);
        const dividendDates = dividendEvents
          .map((d) => d.exDividendDate)
          .filter((d) => d.length > 0);
        eventDates.push(...dividendDates);

        // Get sentiment events: days with significant bullish/bearish activity
        if (dashboard?.state === "ready" && dashboard.timelinePoints.length > 0) {
          const firstDate = dashboard.timelinePoints[0]!.date;
          const lastDate = dashboard.timelinePoints.at(-1)!.date;
          const forumData = await openSearch.getForumSentimentRange(
            heldStockCodes,
            firstDate,
            lastDate,
          );
          // Mark dates with notable sentiment (high bullish or bearish ratio)
          const sentimentDates = forumData
            .filter((f) => {
              const total = f.bullishPosts + f.bearishPosts + f.neutralPosts;
              if (total < 5) return false;
              const ratio = Math.max(f.bullishPosts, f.bearishPosts) / total;
              return ratio > 0.4; // Notable sentiment when > 40% lean one direction
            })
            .map((f) => f.date);
          // Deduplicate and limit to avoid too many event markers
          const uniqueSentimentDates = [...new Set(sentimentDates)].slice(0, 10);
          eventDates.push(...uniqueSentimentDates);
        }
      }

      // Deduplicate and sort
      eventDates = [...new Set(eventDates)].toSorted();

      // ─── Build timeline with benchmark from OpenSearch ───
      if (dashboard?.state === "ready" && dashboard.timelinePoints.length > 0) {
        const first = dashboard.timelinePoints[0]!;
        const firstDate = first.date;
        const lastDate = dashboard.timelinePoints.at(-1)!.date;

        // Try to get benchmark from OpenSearch (0050 prices)
        let benchmarkPoints: Map<string, number> | null = null;
        if (openSearch?.isAvailable()) {
          const osBenchmark = await openSearch.getBenchmarkPrices(firstDate, lastDate);
          if (osBenchmark.length > 0) {
            const firstBenchmarkPrice = osBenchmark[0]!.closePrice;
            benchmarkPoints = new Map(
              osBenchmark.map((p) => [
                p.date,
                Math.round((p.closePrice / firstBenchmarkPrice - 1) * 100 * 100) / 100,
              ]),
            );
          }
        }

        const points = dashboard.timelinePoints.map((p) => ({
          date: p.date,
          portfolioReturn: Math.round((p.marketValue / first.marketValue - 1) * 100 * 100) / 100,
          benchmarkReturn:
            benchmarkPoints?.get(p.date) ??
            Math.round((p.benchmarkValue / first.benchmarkValue - 1) * 100 * 100) / 100,
        }));

        // Calculate overall benchmark return from OpenSearch if available
        let benchmarkReturn = dashboard.metrics.benchmarkReturn
          ? Math.round(Number(dashboard.metrics.benchmarkReturn) * 1000) / 10
          : 0;
        if (benchmarkPoints && benchmarkPoints.size > 0) {
          const lastBenchmarkReturn = [...benchmarkPoints.values()].at(-1);
          if (lastBenchmarkReturn !== undefined) {
            benchmarkReturn = lastBenchmarkReturn;
          }
        }

        return {
          points,
          metrics: {
            xirr: dashboard.metrics.xirr
              ? Math.round(Number(dashboard.metrics.xirr) * 1000) / 10
              : 0,
            twr: dashboard.metrics.twr ? Math.round(Number(dashboard.metrics.twr) * 1000) / 10 : 0,
            benchmarkReturn,
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
      const portfolioId = getPortfolioId();
      const heldStockCodes = await getHeldStockCodes(portfolioId, db);

      if (!openSearch?.isAvailable() || heldStockCodes.length === 0) return null;

      // Check if this date is a dividend ex-date
      const dividendEvents = await openSearch.getDividendEvents(heldStockCodes);
      const dividendOnDate = dividendEvents.find((d) => d.exDividendDate === params.date);

      if (dividendOnDate) {
        return {
          date: params.date,
          type: "dividend",
          summary: `${dividendOnDate.stockName} 除息，現金股利 ${dividendOnDate.cashDividend} 元，殖利率 ${dividendOnDate.yieldPercent}%`,
          sentiment: "neutral" as const,
        };
      }

      // Otherwise return social sentiment for that date
      const forumData = await openSearch.getForumSentiment(heldStockCodes, params.date);
      if (forumData.length === 0) return null;

      // Aggregate sentiment across held stocks
      const totalBullish = forumData.reduce((sum, f) => sum + f.bullishPosts, 0);
      const totalBearish = forumData.reduce((sum, f) => sum + f.bearishPosts, 0);
      const totalPosts = forumData.reduce((sum, f) => sum + f.postCount, 0);

      let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
      if (totalBullish > totalBearish * 2) sentiment = "bullish";
      else if (totalBearish > totalBullish * 2) sentiment = "bearish";

      const summaryParts = forumData
        .toSorted((a, b) => b.postCount - a.postCount)
        .slice(0, 3)
        .map((f) => `${f.stockName} 看多${f.bullishPosts}/看空${f.bearishPosts}`);

      return {
        date: params.date,
        type: "market",
        summary: `社群情緒：${summaryParts.join("、")}（共 ${totalPosts} 則討論）`,
        sentiment,
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

      // Sync V1Holding: ensure a holding exists for this security
      const portfolio = await db.portfolio.findUnique({
        where: { id: portfolioId },
        select: { userId: true },
      });
      if (portfolio) {
        const existingHolding = await db.v1Holding.findFirst({
          where: { userId: portfolio.userId, securityId: security.id },
        });
        if (!existingHolding) {
          // Create a V1Holding linked to this security
          await db.v1Holding.create({
            data: {
              userId: portfolio.userId,
              name: security.name,
              weight: 0,
              cost: unitPrice,
              plPercent: 0,
              purchaseDate: date,
              securityId: security.id,
            },
          });
        }
      }

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

/** Get stock codes from user's held securities */
async function getHeldStockCodes(portfolioId: string, db?: PrismaClient): Promise<string[]> {
  if (!db) return [];

  const portfolio = await db.portfolio.findUnique({
    where: { id: portfolioId },
    select: { userId: true },
  });
  if (!portfolio) return [];

  // Primary path: V1Holdings with securityId FK
  const holdings = await db.v1Holding.findMany({
    where: { userId: portfolio.userId },
    select: { name: true, security: { select: { symbol: true } } },
  });

  const codes = new Set<string>();

  for (const h of holdings) {
    if (h.security?.symbol) {
      // Linked via FK — use the symbol directly
      codes.add(h.security.symbol);
    } else {
      // Fallback: name→code mapping for legacy holdings without securityId
      const code = STOCK_NAME_TO_CODE[h.name];
      if (code) codes.add(code);
    }
  }

  // Also include symbols from ledger entries (covers trades not yet in V1Holding)
  const ledgerSecurities = await db.ledgerEntry.findMany({
    where: { portfolioId, securityId: { not: null } },
    select: { security: { select: { symbol: true } } },
    distinct: ["securityId"],
  });
  for (const entry of ledgerSecurities) {
    if (entry.security?.symbol) codes.add(entry.security.symbol);
  }

  return [...codes];
}

/** Fallback mapping for holdings without securityId (legacy/migration) */
const STOCK_NAME_TO_CODE: Record<string, string> = {
  台積電: "2330",
  聯發科: "2454",
  長榮: "2603",
  聯電: "2303",
  鴻海: "2317",
  元大高股息: "0056",
  元大台灣50: "0050",
  中華電: "2412",
  台泥: "1101",
  兆豐金: "2886",
  統一: "1216",
  中鋼: "2002",
  廣達: "2382",
  緯創: "3231",
  陽明: "2609",
  華航: "2610",
  國巨: "2327",
};
