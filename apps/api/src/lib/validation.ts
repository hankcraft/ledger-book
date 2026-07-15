import type { LedgerEntryType } from "@ledger-book/contracts";

const VALID_ENTRY_TYPES = new Set<string>([
  "buy",
  "sell",
  "cash_deposit",
  "cash_withdrawal",
  "dividend",
  "fee",
  "reversal",
]);

export function isIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function isLedgerEntryType(value: string): value is LedgerEntryType {
  return VALID_ENTRY_TYPES.has(value);
}

const prohibitedSummaryTerms = /買進|買入|賣出|持有|\bbuy\b|\bsell\b|\bhold\b/i;

export function isObjectiveSummary(summary: string): boolean {
  return !prohibitedSummaryTerms.test(summary);
}
