import type { PrismaClient } from "@prisma/client";
import type { DemoImportResult, LedgerEntryType } from "@ledger-book/contracts";
import { isIsoDate, isLedgerEntryType } from "../lib/validation.ts";

export interface ImportService {
  importDemo(portfolioId: string, csvContent: string): Promise<DemoImportResult | null>;
  getImport(importId: string): Promise<DemoImportResult | null>;
  hasImported(portfolioId: string): Promise<boolean>;
}

interface ParsedEntry {
  id: string;
  occurredOn: string;
  entryType: LedgerEntryType;
  grossCashAmount: number;
  feeAmount: number;
  securityId: string | null;
  quantity: number | null;
}

function parseCsv(csv: string): ParsedEntry[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (header !== "id,occurred_on,entry_type,gross_cash_amount,fee_amount,security_id,quantity") {
    throw new Error("Demo ledger CSV header is invalid.");
  }

  return rows.map((row) => {
    const [
      id = "",
      occurredOn = "",
      entryType = "",
      grossCashAmount = "",
      feeAmount = "",
      securityId = "",
      quantity = "",
    ] = row.split(",");
    const parsedGross = Number(grossCashAmount);
    const parsedFee = Number(feeAmount);
    const parsedQuantity = quantity === "" ? null : Number(quantity);

    if (
      !id ||
      !occurredOn ||
      !isIsoDate(occurredOn) ||
      !isLedgerEntryType(entryType) ||
      !Number.isFinite(parsedGross) ||
      !Number.isFinite(parsedFee) ||
      parsedFee < 0
    ) {
      throw new Error(`Invalid CSV row: ${row}`);
    }

    return {
      id,
      occurredOn,
      entryType,
      grossCashAmount: parsedGross,
      feeAmount: parsedFee,
      securityId: securityId || null,
      quantity: parsedQuantity,
    };
  });
}

interface ImportBatchRow {
  id: string;
  portfolioId: string;
  status: string;
  completedAt: Date | null;
}

function toResult(row: ImportBatchRow): DemoImportResult {
  return {
    importId: row.id,
    portfolioId: row.portfolioId as DemoImportResult["portfolioId"],
    status: row.status as DemoImportResult["status"],
    completedAt: row.completedAt?.toISOString() ?? "",
  };
}

export function createImportService(db: PrismaClient): ImportService {
  return {
    async importDemo(portfolioId, csvContent) {
      // Check if already imported
      const existing = await db.importBatch.findFirst({
        where: { portfolioId, status: "completed" },
      });
      if (existing) return null;

      const parsed = parseCsv(csvContent);
      const now = new Date();

      // Get next sequence
      const lastEntry = await db.ledgerEntry.findFirst({
        where: { portfolioId },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      let sequence = (lastEntry?.sequence ?? 0) + 1;

      // Create import batch and entries in a transaction
      const batch = await db.$transaction(async (tx) => {
        const importBatch = await tx.importBatch.create({
          data: {
            portfolioId,
            sourcePayload: { type: "demo-csv", entryCount: parsed.length },
            status: "completed",
            startedAt: now,
            completedAt: now,
          },
        });

        for (const entry of parsed) {
          // Resolve securityId if symbol was provided
          let resolvedSecurityId: string | null = null;
          if (entry.securityId) {
            const security = await tx.security.findFirst({
              // eslint-disable-line no-await-in-loop
              where: { symbol: entry.securityId },
              select: { id: true },
            });
            resolvedSecurityId = security?.id ?? null;
          }

          await tx.ledgerEntry.create({
            // eslint-disable-line no-await-in-loop
            data: {
              portfolioId,
              importBatchId: importBatch.id,
              sequence,
              occurredOn: entry.occurredOn,
              entryType: entry.entryType,
              securityId: resolvedSecurityId,
              quantity: entry.quantity,
              grossCashAmount: entry.grossCashAmount,
              feeAmount: entry.feeAmount,
            },
          });
          sequence++;
        }

        return importBatch;
      });

      return toResult(batch);
    },

    async getImport(importId) {
      const row = await db.importBatch.findUnique({ where: { id: importId } });
      if (!row) return null;
      return toResult(row);
    },

    async hasImported(portfolioId) {
      const count = await db.importBatch.count({
        where: { portfolioId, status: "completed" },
      });
      return count > 0;
    },
  };
}
