import type { PrismaClient } from "@prisma/client";
import type {
  V1UserContext,
  V1Holding,
  V1Principle,
  V1Memory,
  V1Inference,
  V1Behavior,
} from "@ledger-book/contracts";

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
}): V1Holding {
  return {
    id: row.id,
    name: row.name,
    weight: row.weight,
    cost: Number(row.cost),
    plPercent: Number(row.plPercent),
  };
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
  };
}
