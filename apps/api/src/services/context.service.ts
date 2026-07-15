import type { PrismaClient } from "@prisma/client";
import type {
  V1UserContext,
  V1Holding,
  V1Principle,
  V1Memory,
  V1Inference,
  V1Behavior,
} from "@ledger-book/contracts";
import { findTemplate, type LedgerTemplate } from "../data/ledger-templates.ts";

export interface ContextService {
  getContext(userId: string): Promise<V1UserContext>;
  confirmInference(userId: string, inferenceId: string): Promise<V1Principle | null>;
  denyInference(userId: string, inferenceId: string, reason: string): Promise<boolean>;
  archiveMemory(userId: string, memoryId: string): Promise<boolean>;
  togglePrinciple(userId: string, principleId: string): Promise<V1Principle | null>;
  deletePrinciple(userId: string, principleId: string): Promise<boolean>;
  toggleBehavior(userId: string, behaviorId: string): Promise<V1Behavior | null>;
  applyCorrection(
    userId: string,
    text: string,
  ): Promise<{ response: string; inferences: V1Inference[] }>;
  completeOnboarding(userId: string, data: OnboardingData): Promise<V1UserContext>;
  applyTemplate(userId: string, templateId: string): Promise<V1UserContext>;
}

export interface OnboardingData {
  stockName: string;
  holdingStatus: string;
  pnlStatus: string;
  cost?: number;
  weightPercent?: number;
}

function toHolding(row: {
  id: string;
  name: string;
  weight: number;
  cost: unknown;
  plPercent: unknown;
  purchaseDate?: string | null;
}): V1Holding {
  const h: V1Holding = {
    id: row.id,
    name: row.name,
    weight: row.weight,
    cost: Number(row.cost),
    plPercent: Number(row.plPercent),
  };
  if (row.purchaseDate) h.purchaseDate = row.purchaseDate;
  return h;
}

function toPrinciple(row: {
  id: string;
  statement: string;
  confirmedAt: string | null;
  source: string;
  paused: boolean;
  badge: string | null;
}): V1Principle {
  const p: V1Principle = {
    id: row.id,
    statement: row.statement,
    confirmedAt: row.confirmedAt ?? "",
    source: row.source,
    paused: row.paused,
  };
  if (row.badge) p.badge = row.badge;
  return p;
}

function toMemory(row: {
  id: string;
  quote: string;
  date: string;
  source: string;
  archived: boolean;
}): V1Memory {
  return {
    id: row.id,
    quote: row.quote,
    date: row.date,
    source: row.source,
    archived: row.archived,
  };
}

function toInference(row: {
  id: string;
  statement: string;
  confidence: string;
  evidence: string;
  status: string;
  denyReason: string | null;
}): V1Inference {
  const i: V1Inference = {
    id: row.id,
    statement: row.statement,
    confidence: row.confidence as V1Inference["confidence"],
    evidence: row.evidence,
    status: row.status as V1Inference["status"],
  };
  if (row.denyReason) i.denyReason = row.denyReason;
  return i;
}

function toBehavior(row: {
  id: string;
  label: string;
  value: string;
  detail: string | null;
  excluded: boolean;
}): V1Behavior {
  const b: V1Behavior = { id: row.id, label: row.label, value: row.value, excluded: row.excluded };
  if (row.detail) b.detail = row.detail;
  return b;
}

const DEFAULT_PORTFOLIO_ID = "demo-portfolio";
const BENCHMARK_SYMBOL = "0050";

/**
 * Seeds portfolio-level data (securities, ledger entries, market prices)
 * from a template so the performance page has data to render.
 */
async function seedPortfolioFromTemplate(
  db: PrismaClient,
  userId: string,
  template: LedgerTemplate,
): Promise<void> {
  const portfolioId = DEFAULT_PORTFOLIO_ID;

  // Ensure portfolio exists
  await db.portfolio.upsert({
    where: { id: portfolioId },
    update: {},
    create: {
      id: portfolioId,
      userId,
      name: "台股核心－衛星帳本",
      baseCurrency: "TWD",
      benchmarkSymbol: BENCHMARK_SYMBOL,
    },
  });

  // Clear existing ledger entries and market prices for a clean slate
  await db.ledgerEntry.deleteMany({ where: { portfolioId } });

  // Upsert securities and collect IDs
  const holdingSecurities: Array<{ securityId: string; holding: (typeof template.holdings)[0] }> =
    [];
  for (const h of template.holdings) {
    const security = await db.security.upsert({
      where: { market_symbol: { market: "TWSE", symbol: h.name } },
      update: {},
      create: {
        symbol: h.name,
        market: "TWSE",
        name: h.name,
        assetType: "stock",
        currency: "TWD",
      },
    });
    holdingSecurities.push({ securityId: security.id, holding: h });
  }

  // Upsert benchmark security (0050)
  const benchmark = await db.security.upsert({
    where: { market_symbol: { market: "TWSE", symbol: BENCHMARK_SYMBOL } },
    update: {},
    create: {
      symbol: BENCHMARK_SYMBOL,
      market: "TWSE",
      name: "元大台灣50",
      assetType: "etf",
      currency: "TWD",
    },
  });

  // Determine timeline: earliest purchase date → today
  const purchaseDates = template.holdings.map((h) => h.purchaseDate).toSorted();
  const earliestDate = purchaseDates[0]!;
  const today = new Date().toISOString().slice(0, 10);

  // Calculate total investment (assume 1000 shares per holding for simplicity)
  const SHARES_PER_HOLDING = 1000;
  const totalInvestment = template.holdings.reduce(
    (sum, h) => sum + h.cost * SHARES_PER_HOLDING,
    0,
  );

  // Create ledger entries: one cash deposit + one buy per holding
  let sequence = 1;

  // Cash deposit on earliest date
  await db.ledgerEntry.create({
    data: {
      portfolioId,
      sequence: sequence++,
      occurredOn: earliestDate,
      entryType: "cash_deposit",
      grossCashAmount: totalInvestment,
      feeAmount: 0,
    },
  });

  // Buy entries for each holding
  for (const { securityId, holding } of holdingSecurities) {
    await db.ledgerEntry.create({
      data: {
        portfolioId,
        sequence: sequence++,
        occurredOn: holding.purchaseDate,
        entryType: "buy",
        securityId,
        quantity: SHARES_PER_HOLDING,
        unitPrice: holding.cost,
        grossCashAmount: -(holding.cost * SHARES_PER_HOLDING),
        feeAmount: 0,
      },
    });
  }

  // Seed market prices: purchase-date price + today's price for each security
  // Generate intermediate weekly prices for a smoother chart
  for (const { securityId, holding } of holdingSecurities) {
    const currentPrice = holding.cost * (1 + holding.plPercent / 100);
    const dates = generateWeeklyDates(holding.purchaseDate, today);

    const priceData = dates.map((date, i) => {
      // Linear interpolation from cost → currentPrice
      const progress = dates.length > 1 ? i / (dates.length - 1) : 1;
      const price = holding.cost + (currentPrice - holding.cost) * progress;
      return {
        securityId,
        tradedOn: date,
        closePrice: Math.round(price * 100) / 100,
        source: "template",
      };
    });

    for (const p of priceData) {
      await db.marketPrice.upsert({
        where: { securityId_tradedOn: { securityId: p.securityId, tradedOn: p.tradedOn } },
        update: { closePrice: p.closePrice },
        create: p,
      });
    }
  }

  // Benchmark prices: simulate ~5% return over the same period
  const benchmarkDates = generateWeeklyDates(earliestDate, today);
  const benchmarkBasePrice = 150; // approximate 0050 price
  for (let i = 0; i < benchmarkDates.length; i++) {
    const progress = benchmarkDates.length > 1 ? i / (benchmarkDates.length - 1) : 1;
    const price = benchmarkBasePrice * (1 + 0.05 * progress);
    await db.marketPrice.upsert({
      where: { securityId_tradedOn: { securityId: benchmark.id, tradedOn: benchmarkDates[i]! } },
      update: { closePrice: Math.round(price * 100) / 100 },
      create: {
        securityId: benchmark.id,
        tradedOn: benchmarkDates[i]!,
        closePrice: Math.round(price * 100) / 100,
        source: "template",
      },
    });
  }
}

/** Generate weekly date strings between start and end (inclusive of both). */
function generateWeeklyDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 7);
  }

  // Always include the end date
  const lastDate = dates.at(-1);
  if (lastDate !== end && new Date(end) > new Date(lastDate!)) {
    dates.push(end);
  }

  return dates;
}

export function createContextService(db: PrismaClient): ContextService {
  return {
    async getContext(userId) {
      const [holdings, principles, memories, inferences, behaviors] = await Promise.all([
        db.v1Holding.findMany({ where: { userId } }),
        db.v1Principle.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
        db.v1Memory.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
        db.v1Inference.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
        db.v1Behavior.findMany({ where: { userId } }),
      ]);

      return {
        holdings: holdings.map(toHolding),
        principles: principles.map(toPrinciple),
        memories: memories.map(toMemory),
        inferences: inferences.map(toInference),
        behaviors: behaviors.map(toBehavior),
      };
    },

    async confirmInference(userId, inferenceId) {
      const inference = await db.v1Inference.findFirst({ where: { id: inferenceId, userId } });
      if (!inference) return null;

      await db.v1Inference.update({ where: { id: inferenceId }, data: { status: "CONFIRMED" } });

      const principle = await db.v1Principle.create({
        data: {
          userId,
          statement: inference.statement,
          confirmedAt: new Date().toISOString().slice(0, 10),
          source: "AI 推論確認",
          badge: "剛確認",
        },
      });

      return toPrinciple(principle);
    },

    async denyInference(userId, inferenceId, reason) {
      const inference = await db.v1Inference.findFirst({ where: { id: inferenceId, userId } });
      if (!inference) return false;

      await db.v1Inference.update({
        where: { id: inferenceId },
        data: { status: "DENIED", denyReason: reason },
      });
      return true;
    },

    async archiveMemory(userId, memoryId) {
      const memory = await db.v1Memory.findFirst({ where: { id: memoryId, userId } });
      if (!memory) return false;

      await db.v1Memory.update({ where: { id: memoryId }, data: { archived: true } });
      return true;
    },

    async togglePrinciple(userId, principleId) {
      const principle = await db.v1Principle.findFirst({ where: { id: principleId, userId } });
      if (!principle) return null;

      const updated = await db.v1Principle.update({
        where: { id: principleId },
        data: { paused: !principle.paused },
      });
      return toPrinciple(updated);
    },

    async deletePrinciple(userId, principleId) {
      const principle = await db.v1Principle.findFirst({ where: { id: principleId, userId } });
      if (!principle) return false;

      await db.v1Principle.delete({ where: { id: principleId } });
      return true;
    },

    async toggleBehavior(userId, behaviorId) {
      const behavior = await db.v1Behavior.findFirst({ where: { id: behaviorId, userId } });
      if (!behavior) return null;

      const updated = await db.v1Behavior.update({
        where: { id: behaviorId },
        data: { excluded: !behavior.excluded },
      });
      return toBehavior(updated);
    },

    async applyCorrection(userId, text) {
      // Find first pending inference and deny it with correction context
      const pendingInference = await db.v1Inference.findFirst({
        where: { userId, status: "PENDING" },
      });

      if (pendingInference) {
        await db.v1Inference.update({
          where: { id: pendingInference.id },
          data: { status: "DENIED", denyReason: `使用者修正：${text}` },
        });
      }

      const inferences = await db.v1Inference.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      const response = pendingInference
        ? `好的，我已根據你的說明「${text}」重新評估「${pendingInference.statement}」。`
        : `好的，我已記錄你的說明「${text}」。`;

      return { response, inferences: inferences.map(toInference) };
    },

    async completeOnboarding(userId, data) {
      const plPercent = data.pnlStatus === "PROFIT" ? 12 : data.pnlStatus === "LOSS" ? -5 : 1;

      // Upsert user's primary holding from onboarding
      await db.v1Holding.create({
        data: {
          userId,
          name: data.stockName,
          weight: data.weightPercent ?? 30,
          cost: data.cost ?? 500,
          plPercent,
        },
      });

      // Return full context
      return this.getContext(userId);
    },

    async applyTemplate(userId, templateId) {
      const template = findTemplate(templateId);
      if (!template) {
        throw new Error(`Template "${templateId}" not found`);
      }

      // Clear existing V1 context for this user
      await Promise.all([
        db.v1Holding.deleteMany({ where: { userId } }),
        db.v1Principle.deleteMany({ where: { userId } }),
        db.v1Memory.deleteMany({ where: { userId } }),
        db.v1Inference.deleteMany({ where: { userId } }),
        db.v1Behavior.deleteMany({ where: { userId } }),
      ]);

      // Bulk-insert template data
      await Promise.all([
        db.v1Holding.createMany({
          data: template.holdings.map((h) => ({
            userId,
            name: h.name,
            weight: h.weight,
            cost: h.cost,
            plPercent: h.plPercent,
            purchaseDate: h.purchaseDate,
          })),
        }),
        db.v1Principle.createMany({
          data: template.principles.map((p) => ({
            userId,
            statement: p.statement,
            confirmedAt: p.confirmedAt,
            source: p.source,
            paused: p.paused,
          })),
        }),
        db.v1Memory.createMany({
          data: template.memories.map((m) => ({
            userId,
            quote: m.quote,
            date: m.date,
            source: m.source,
            archived: false,
          })),
        }),
        db.v1Inference.createMany({
          data: template.inferences.map((i) => ({
            userId,
            statement: i.statement,
            confidence: i.confidence,
            evidence: i.evidence,
            status: "PENDING",
          })),
        }),
        db.v1Behavior.createMany({
          data: template.behaviors.map((b) => ({
            userId,
            label: b.label,
            value: b.value,
            detail: b.detail ?? null,
            excluded: false,
          })),
        }),
      ]);

      // ── Seed portfolio data so the performance page can render ──
      await seedPortfolioFromTemplate(db, userId, template);

      return this.getContext(userId);
    },
  };
}
