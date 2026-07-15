import type { PrismaClient } from "@prisma/client";
import type {
  Dashboard,
  Holding,
  PerformanceMetrics,
  PortfolioSnapshot,
  PortfolioSummary,
} from "@ledger-book/contracts";
import { calculateTimeWeightedReturn } from "@railpath/finance-toolkit";
import { convertRate, xirr } from "node-irr";

export interface PortfolioService {
  getPortfolio(portfolioId: string): Promise<PortfolioSummary | null>;
  getDashboard(portfolioId: string, asOfDate: string): Promise<Dashboard | null>;
  portfolioExists(portfolioId: string): Promise<boolean>;
}

export function calculateAnnualXirr(inputs: { amount: number; date: string }[]): number {
  return convertRate(xirr(inputs).rate, 365);
}

export function calculateTwr(portfolioValues: number[], cashFlows: number[]): number {
  return calculateTimeWeightedReturn({
    portfolioValues,
    cashFlows,
    annualizationFactor: 1,
  }).twr;
}

export function createPortfolioService(db: PrismaClient): PortfolioService {
  async function getPortfolioRow(portfolioId: string) {
    return db.portfolio.findUnique({
      where: { id: portfolioId },
      include: { user: true },
    });
  }

  /** Get the latest market price on or before a given date for a security */
  async function priceOnOrBefore(securityId: string, asOfDate: string): Promise<number | null> {
    const row = await db.marketPrice.findFirst({
      where: { securityId, tradedOn: { lte: asOfDate } },
      orderBy: { tradedOn: "desc" },
      select: { closePrice: true },
    });
    return row ? Number(row.closePrice) : null;
  }

  /** Get all known price dates for the portfolio's securities on or before asOfDate */
  async function getKnownPriceDates(portfolioId: string, asOfDate: string): Promise<string[]> {
    // Get security IDs from ledger entries
    const entries = await db.ledgerEntry.findMany({
      where: { portfolioId, securityId: { not: null } },
      select: { securityId: true },
      distinct: ["securityId"],
    });
    const securityIds = entries.map((e) => e.securityId!);
    if (securityIds.length === 0) return [];

    const prices = await db.marketPrice.findMany({
      where: { securityId: { in: securityIds }, tradedOn: { lte: asOfDate } },
      select: { tradedOn: true },
      distinct: ["tradedOn"],
      orderBy: { tradedOn: "asc" },
    });
    return prices.map((p) => p.tradedOn);
  }

  /** Compute holdings at a specific date from the ledger */
  async function computeHoldings(portfolioId: string, asOfDate: string): Promise<Holding[] | null> {
    // Get all securities involved in this portfolio
    const securityEntries = await db.ledgerEntry.findMany({
      where: { portfolioId, securityId: { not: null }, occurredOn: { lte: asOfDate } },
      select: { securityId: true, entryType: true, quantity: true },
    });

    // Group by security and compute net quantity
    const quantityMap = new Map<string, number>();
    for (const entry of securityEntries) {
      if (!entry.securityId || entry.quantity === null) continue;
      const qty = Number(entry.quantity);
      const current = quantityMap.get(entry.securityId) ?? 0;
      if (entry.entryType === "buy") {
        quantityMap.set(entry.securityId, current + qty);
      } else if (entry.entryType === "sell") {
        quantityMap.set(entry.securityId, current - qty);
      }
    }

    // Get security details and prices
    const holdings: Holding[] = [];
    for (const [securityId, quantity] of quantityMap) {
      if (quantity <= 0) continue;

      const security = await db.security.findUnique({
        where: { id: securityId },
        select: { id: true, symbol: true, name: true },
      });
      if (!security) continue;

      const currentPrice = await priceOnOrBefore(securityId, asOfDate);
      // Get the earliest available price to compute change
      const firstPrice = await db.marketPrice.findFirst({
        where: { securityId },
        orderBy: { tradedOn: "asc" },
        select: { closePrice: true },
      });

      if (currentPrice === null || !firstPrice) return null;

      const initialPrice = Number(firstPrice.closePrice);
      holdings.push({
        securityId: security.id,
        symbol: security.symbol,
        name: security.name,
        quantity,
        unitPrice: currentPrice,
        marketValue: quantity * currentPrice,
        changePercent: currentPrice / initialPrice - 1,
      });
    }

    return holdings.length > 0 ? holdings : null;
  }

  /** Calculate total cash value from ledger entries */
  async function computeCash(portfolioId: string, asOfDate: string): Promise<number> {
    const entries = await db.ledgerEntry.findMany({
      where: { portfolioId, occurredOn: { lte: asOfDate } },
      select: { grossCashAmount: true, feeAmount: true },
    });
    return entries.reduce((total, e) => total + Number(e.grossCashAmount) - Number(e.feeAmount), 0);
  }

  return {
    async getPortfolio(portfolioId) {
      const row = await getPortfolioRow(portfolioId);
      if (!row) return null;
      return {
        id: row.id as PortfolioSummary["id"],
        name: row.name,
        baseCurrency: row.baseCurrency as PortfolioSummary["baseCurrency"],
        benchmarkSymbol: (row.benchmarkSymbol ?? "0050") as PortfolioSummary["benchmarkSymbol"],
      };
    },

    async getDashboard(portfolioId, asOfDate) {
      const portfolioRow = await getPortfolioRow(portfolioId);
      if (!portfolioRow) return null;

      const portfolio: PortfolioSummary = {
        id: portfolioRow.id as PortfolioSummary["id"],
        name: portfolioRow.name,
        baseCurrency: portfolioRow.baseCurrency as PortfolioSummary["baseCurrency"],
        benchmarkSymbol: (portfolioRow.benchmarkSymbol ??
          "0050") as PortfolioSummary["benchmarkSymbol"],
      };

      // Check if portfolio has any entries
      const hasEntries = await db.ledgerEntry.count({ where: { portfolioId } });
      if (hasEntries === 0) {
        return { state: "empty" as const, portfolio };
      }

      // Get all known price dates
      const dates = await getKnownPriceDates(portfolioId, asOfDate);
      if (dates.length === 0) return null;

      const snapshotDate = dates.at(-1)!;
      const holdings = await computeHoldings(portfolioId, snapshotDate);
      if (!holdings) return null;

      // Find benchmark security
      const benchmarkSymbol = portfolioRow.benchmarkSymbol ?? "0050";
      const benchmarkSecurity = await db.security.findFirst({
        where: { symbol: benchmarkSymbol },
        select: { id: true },
      });

      const initialBenchmarkPrice = benchmarkSecurity
        ? await db.marketPrice.findFirst({
            where: { securityId: benchmarkSecurity.id },
            orderBy: { tradedOn: "asc" },
            select: { closePrice: true },
          })
        : null;

      if (!initialBenchmarkPrice) return null;
      const initialBenchmark = Number(initialBenchmarkPrice.closePrice);

      // Get initial investment (cash deposits)
      const depositEntries = await db.ledgerEntry.findMany({
        where: { portfolioId, entryType: "cash_deposit", occurredOn: { lte: snapshotDate } },
        select: { grossCashAmount: true, feeAmount: true },
      });
      const initialInvestment = depositEntries.reduce(
        (total, e) => total + Number(e.grossCashAmount) - Number(e.feeAmount),
        0,
      );

      // Build timeline points
      const timelinePoints: Array<{ date: string; marketValue: number; benchmarkValue: number }> =
        [];
      for (const date of dates) {
        const pointHoldings = await computeHoldings(portfolioId, date);
        if (!pointHoldings) continue;

        const benchmarkPrice = benchmarkSecurity
          ? await priceOnOrBefore(benchmarkSecurity.id, date)
          : null;
        if (benchmarkPrice === null) continue;

        const cash = await computeCash(portfolioId, date);
        const marketValue = cash + pointHoldings.reduce((sum, h) => sum + h.marketValue, 0);
        const benchmarkValue = initialInvestment * (benchmarkPrice / initialBenchmark);

        timelinePoints.push({ date, marketValue, benchmarkValue });
      }

      if (timelinePoints.length === 0) return null;
      const firstPoint = timelinePoints[0]!;
      const finalPoint = timelinePoints.at(-1)!;

      // Calculate XIRR
      const xirrEntries = await db.ledgerEntry.findMany({
        where: { portfolioId, entryType: "cash_deposit", occurredOn: { lte: snapshotDate } },
        select: { grossCashAmount: true, feeAmount: true, occurredOn: true },
      });
      const xirrCashFlows = xirrEntries.map((e) => ({
        amount: -(Number(e.grossCashAmount) - Number(e.feeAmount)),
        date: e.occurredOn,
      }));

      const xirrValue = xirrCashFlows.some((cf) => cf.date < finalPoint.date)
        ? calculateAnnualXirr([
            ...xirrCashFlows,
            { amount: finalPoint.marketValue, date: finalPoint.date },
          ])
        : 0;

      // Calculate TWR
      const twrValue =
        timelinePoints.length > 1
          ? calculateTwr(
              timelinePoints.map((p) => p.marketValue),
              timelinePoints.map(() => 0),
            )
          : 0;

      const benchmarkReturn = finalPoint.benchmarkValue / firstPoint.benchmarkValue - 1;

      const metrics: PerformanceMetrics = {
        xirr: xirrValue,
        twr: twrValue,
        benchmarkReturn,
      };

      const cashValue = await computeCash(portfolioId, snapshotDate);
      const latestSnapshot: PortfolioSnapshot = {
        asOfDate: finalPoint.date,
        marketValue: finalPoint.marketValue,
        cashValue,
        holdings,
      };

      return {
        state: "ready" as const,
        portfolio,
        latestSnapshot,
        timelinePoints,
        holdings,
        metrics,
        benchmark: { symbol: benchmarkSymbol, return: metrics.benchmarkReturn },
        warnings: [],
      };
    },

    async portfolioExists(portfolioId) {
      const count = await db.portfolio.count({ where: { id: portfolioId } });
      return count > 0;
    },
  };
}
