import type { PrismaClient } from "@prisma/client";
import type { CreateEntryRequest, LedgerEntry, BatchCreateResult } from "@ledger-book/contracts";

export interface LedgerService {
  getEntries(portfolioId: string): Promise<LedgerEntry[]>;
  createEntry(portfolioId: string, request: CreateEntryRequest): Promise<LedgerEntry>;
  createEntries(portfolioId: string, requests: CreateEntryRequest[]): Promise<BatchCreateResult>;
  hasEntries(portfolioId: string): Promise<boolean>;
}

interface EntryRow {
  id: string;
  portfolioId: string;
  sequence: number;
  occurredOn: string;
  entryType: string;
  securityId: string | null;
  quantity: unknown;
  unitPrice: unknown;
  grossCashAmount: unknown;
  feeAmount: unknown;
}

function toContract(row: EntryRow): LedgerEntry {
  const entry: LedgerEntry = {
    id: row.id,
    portfolioId: row.portfolioId as LedgerEntry["portfolioId"],
    sequence: row.sequence,
    occurredOn: row.occurredOn,
    entryType: row.entryType as LedgerEntry["entryType"],
    grossCashAmount: Number(row.grossCashAmount),
    feeAmount: Number(row.feeAmount),
  };
  if (row.securityId) entry.securityId = row.securityId;
  if (row.quantity !== null) entry.quantity = Number(row.quantity);
  if (row.unitPrice !== null) entry.unitPrice = Number(row.unitPrice);
  return entry;
}

export function createLedgerService(db: PrismaClient): LedgerService {
  async function nextSequence(portfolioId: string): Promise<number> {
    const last = await db.ledgerEntry.findFirst({
      where: { portfolioId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    return (last?.sequence ?? 0) + 1;
  }

  return {
    async getEntries(portfolioId) {
      const rows = await db.ledgerEntry.findMany({
        where: { portfolioId },
        orderBy: { sequence: "asc" },
      });
      return rows.map(toContract);
    },

    async createEntry(portfolioId, request) {
      const sequence = await nextSequence(portfolioId);
      const row = await db.ledgerEntry.create({
        data: {
          portfolioId,
          sequence,
          occurredOn: request.occurredOn,
          entryType: request.entryType,
          securityId: request.securityId ?? null,
          quantity: request.quantity ?? null,
          unitPrice: request.unitPrice ?? null,
          grossCashAmount: request.grossCashAmount,
          feeAmount: request.feeAmount,
        },
      });
      return toContract(row);
    },

    async createEntries(portfolioId, requests) {
      const created: LedgerEntry[] = [];
      const errors: Array<{ index: number; message: string }> = [];

      // Sequential within transaction — ordering matters for sequence numbers
      await db.$transaction(async (tx) => {
        let sequence = await nextSequence(portfolioId);
        for (let i = 0; i < requests.length; i++) {
          const req = requests[i]!;
          try {
            const row = await tx.ledgerEntry.create({
              // eslint-disable-line no-await-in-loop
              data: {
                portfolioId,
                sequence,
                occurredOn: req.occurredOn,
                entryType: req.entryType,
                securityId: req.securityId ?? null,
                quantity: req.quantity ?? null,
                unitPrice: req.unitPrice ?? null,
                grossCashAmount: req.grossCashAmount,
                feeAmount: req.feeAmount,
              },
            });
            created.push(toContract(row));
            sequence++;
          } catch (err) {
            errors.push({ index: i, message: err instanceof Error ? err.message : "未知錯誤" });
          }
        }
      });

      return { created, errors };
    },

    async hasEntries(portfolioId) {
      const count = await db.ledgerEntry.count({ where: { portfolioId }, take: 1 });
      return count > 0;
    },
  };
}
