export const DEMO_PORTFOLIO_ID = "demo-portfolio" as const;

export interface DemoImportRequest {
  portfolioId: typeof DEMO_PORTFOLIO_ID;
}

export type ImportStatus = "pending" | "recognizing" | "completed" | "failed";

export interface DemoImportResult {
  importId: string;
  portfolioId: typeof DEMO_PORTFOLIO_ID;
  status: ImportStatus;
  completedAt: string;
}

export interface PortfolioSummary {
  id: typeof DEMO_PORTFOLIO_ID;
  name: string;
  baseCurrency: "TWD";
  benchmarkSymbol: "0050";
}

export type LedgerEntryType =
  | "buy"
  | "sell"
  | "cash_deposit"
  | "cash_withdrawal"
  | "dividend"
  | "fee"
  | "reversal";

export interface LedgerEntry {
  id: string;
  portfolioId: typeof DEMO_PORTFOLIO_ID;
  sequence: number;
  occurredOn: string;
  entryType: LedgerEntryType;
  securityId?: string;
  quantity?: number;
  unitPrice?: number;
  grossCashAmount: number;
  feeAmount: number;
}

export interface EmptyDashboard {
  state: "empty";
  portfolio: PortfolioSummary;
}

export interface Holding {
  securityId: string;
  symbol: string;
  name: string;
  quantity: number;
  unitPrice: number;
  marketValue: number;
  changePercent: number;
}

export interface PortfolioSnapshot {
  asOfDate: string;
  marketValue: number;
  cashValue: number;
  holdings: Holding[];
}

export interface TimelinePoint {
  date: string;
  marketValue: number;
  benchmarkValue: number;
}

export interface PerformanceMetrics {
  xirr: number | null;
  twr: number | null;
  benchmarkReturn: number | null;
}

export interface Benchmark {
  symbol: string;
  return: number | null;
}

export interface ReadyDashboard {
  state: "ready";
  portfolio: PortfolioSummary;
  latestSnapshot: PortfolioSnapshot;
  timelinePoints: TimelinePoint[];
  holdings: Holding[];
  metrics: PerformanceMetrics;
  benchmark: Benchmark;
  warnings: string[];
}

export type Dashboard = EmptyDashboard | ReadyDashboard;

export interface TimeTravelReportRequest {
  securityId: string;
  asOfDate: string;
}

export type Sentiment = "bullish" | "bearish" | "neutral";
export type SentimentColor = "red" | "green" | "gray";

export interface EvidenceCitation {
  id: string;
  observedOn: string;
  source: string;
  label: string;
}

export interface TimeTravelReport {
  id: string;
  portfolioId: typeof DEMO_PORTFOLIO_ID;
  securityId: string;
  symbol: string;
  asOfDate: string;
  sentiment: Sentiment;
  uiColor: SentimentColor;
  summary: string;
  citations: EvidenceCitation[];
  complianceStatus: "passed" | "rejected";
}

export interface CreateEntryRequest {
  occurredOn: string;
  entryType: LedgerEntryType;
  securityId?: string;
  quantity?: number;
  unitPrice?: number;
  grossCashAmount: number;
  feeAmount: number;
}

export interface CreateEntryResult {
  entry: LedgerEntry;
}

export interface BatchCreateRequest {
  entries: CreateEntryRequest[];
}

export interface BatchCreateResult {
  created: LedgerEntry[];
  errors: Array<{ index: number; message: string }>;
}

export interface ApiError {
  code: string;
  message: string;
}

export * from "./v1";
