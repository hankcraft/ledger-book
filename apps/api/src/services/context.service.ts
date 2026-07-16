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
  /** Add a new principle from a conversation conclusion */
  addPrinciple(userId: string, statement: string, source: string): Promise<V1Principle>;
  /** Add a new memory from a conversation conclusion */
  addMemory(userId: string, quote: string, source: string): Promise<V1Memory>;
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
 * Seeds portfolio-level data (securities, ledger entries, market prices,
 * importBatch, and analysisEvidence) from a template so that the
 * performance page, time-travel, and v1 APIs all have data to render.
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

  // ── Clean slate: remove old time-travel reports, evidence, ledger, and imports ──
  // Delete report→evidence links first (FK constraint)
  const existingReports = await db.timeTravelReport.findMany({
    where: { portfolioId },
    select: { id: true },
  });
  if (existingReports.length > 0) {
    await db.timeTravelReportEvidence.deleteMany({
      where: { reportId: { in: existingReports.map((r) => r.id) } },
    });
    await db.timeTravelReport.deleteMany({ where: { portfolioId } });
  }
  await db.ledgerEntry.deleteMany({ where: { portfolioId } });
  await db.importBatch.deleteMany({ where: { portfolioId } });

  // Upsert securities using the template's symbol (stock code)
  const holdingSecurities: Array<{ securityId: string; holding: (typeof template.holdings)[0] }> =
    [];
  for (const h of template.holdings) {
    const security = await db.security.upsert({
      where: { market_symbol: { market: "TWSE", symbol: h.symbol } },
      update: { name: h.name },
      create: {
        symbol: h.symbol,
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

  // Determine timeline: earliest purchase date → end of 2025
  // All seed data lives in 2025; cap to 2025-12-31 regardless of real clock.
  const purchaseDates = template.holdings.map((h) => h.purchaseDate).toSorted();
  const earliestDate = purchaseDates[0]!;
  const today = "2025-12-31";

  // Calculate total investment (assume 1000 shares per holding for simplicity)
  const SHARES_PER_HOLDING = 1000;
  const totalInvestment = template.holdings.reduce(
    (sum, h) => sum + h.cost * SHARES_PER_HOLDING,
    0,
  );

  // ── Seed importBatch so time-travel's hasImported check passes ──
  await db.importBatch.create({
    data: {
      portfolioId,
      sourcePayload: { type: "template", templateId: template.id },
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

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

  // Build a unified set of all timeline dates (weekly from each holding's purchase).
  // Every security (including benchmark) will have a price at every relevant date
  // so that priceOnOrBefore always finds an exact match and avoids stale-price jumps.
  const allTimelineDates = new Set<string>();
  for (const { holding } of holdingSecurities) {
    for (const d of generateWeeklyDates(holding.purchaseDate, today)) {
      allTimelineDates.add(d);
    }
  }
  const sortedTimelineDates = [...allTimelineDates].toSorted();

  // Total days for time-based interpolation
  const totalDays = Math.max(
    1,
    (new Date(today).getTime() - new Date(earliestDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  // Seed market prices for each holding at ALL timeline dates from its purchase onward
  for (const { securityId, holding } of holdingSecurities) {
    const currentPrice = holding.cost * (1 + holding.plPercent / 100);
    const purchaseTime = new Date(holding.purchaseDate).getTime();
    const holdingTotalDays = Math.max(
      1,
      (new Date(today).getTime() - purchaseTime) / (1000 * 60 * 60 * 24),
    );

    // Only seed dates on or after this holding's purchase date
    const holdingDates = sortedTimelineDates.filter((d) => new Date(d).getTime() >= purchaseTime);

    for (const date of holdingDates) {
      const daysSincePurchase = (new Date(date).getTime() - purchaseTime) / (1000 * 60 * 60 * 24);
      const progress = daysSincePurchase / holdingTotalDays;
      const price = holding.cost + (currentPrice - holding.cost) * progress;
      await db.marketPrice.upsert({
        where: { securityId_tradedOn: { securityId, tradedOn: date } },
        update: { closePrice: Math.round(price * 100) / 100 },
        create: {
          securityId,
          tradedOn: date,
          closePrice: Math.round(price * 100) / 100,
          source: "template",
        },
      });
    }
  }

  // Benchmark prices: simulate ~5% return over the same period.
  // Seed at every unified timeline date so priceOnOrBefore always has an exact match.
  const benchmarkBasePrice = 150; // approximate 0050 price
  for (const date of sortedTimelineDates) {
    const daysSinceStart =
      (new Date(date).getTime() - new Date(earliestDate).getTime()) / (1000 * 60 * 60 * 24);
    const progress = daysSinceStart / totalDays;
    const price = benchmarkBasePrice * (1 + 0.05 * progress);
    await db.marketPrice.upsert({
      where: { securityId_tradedOn: { securityId: benchmark.id, tradedOn: date } },
      update: { closePrice: Math.round(price * 100) / 100 },
      create: {
        securityId: benchmark.id,
        tradedOn: date,
        closePrice: Math.round(price * 100) / 100,
        source: "template",
      },
    });
  }

  // ── Seed analysisEvidence so time-travel createReport can find data ──
  // For each security, create evidence records at multiple dates within the timeline.
  for (const { securityId, holding } of holdingSecurities) {
    // Remove old evidence for this security (from previous template applications)
    await db.analysisEvidence.deleteMany({ where: { securityId, sourceName: "template-seed" } });

    // Generate evidence at purchase date and ~monthly intervals until today
    const evidenceDates = generateMonthlyDates(holding.purchaseDate, today);
    for (const date of evidenceDates) {
      await db.analysisEvidence.create({
        data: {
          securityId,
          evidenceType: "institutional_chip",
          observedOn: date,
          sourceName: "template-seed",
          payload: { label: `${holding.name} 法人買賣超資料（${date}）` },
        },
      });
      await db.analysisEvidence.create({
        data: {
          securityId,
          evidenceType: "forum_sentiment",
          observedOn: date,
          sourceName: "template-seed",
          payload: { label: `${holding.name} 社群討論情緒摘要（${date}）` },
        },
      });
    }
  }

  // Link V1Holdings to their securities via securityId
  for (const { securityId, holding } of holdingSecurities) {
    await db.v1Holding.updateMany({
      where: { userId, name: holding.name, securityId: null },
      data: { securityId },
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

/** Generate monthly date strings between start and end (inclusive of both). */
function generateMonthlyDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setMonth(current.getMonth() + 1);
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

      // Upsert security for the onboarded stock
      const security = await db.security.upsert({
        where: { market_symbol: { market: "TWSE", symbol: data.stockName } },
        update: {},
        create: {
          symbol: data.stockName,
          market: "TWSE",
          name: data.stockName,
          assetType: "stock",
          currency: "TWD",
        },
      });

      // Create holding linked to security
      await db.v1Holding.create({
        data: {
          userId,
          name: data.stockName,
          weight: data.weightPercent ?? 30,
          cost: data.cost ?? 500,
          plPercent,
          securityId: security.id,
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

    async addPrinciple(userId, statement, source) {
      const row = await db.v1Principle.create({
        data: {
          userId,
          statement,
          confirmedAt: new Date().toISOString().slice(0, 10),
          source,
          paused: false,
          badge: "對話結論",
        },
      });
      return toPrinciple(row);
    },

    async addMemory(userId, quote, source) {
      const row = await db.v1Memory.create({
        data: {
          userId,
          quote,
          date: new Date().toISOString().slice(0, 10),
          source,
          archived: false,
        },
      });
      return toMemory(row);
    },
  };
}
