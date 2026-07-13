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

export interface EmptyDashboard {
  state: "empty";
  portfolio: PortfolioSummary;
}

export interface TimelinePoint {
  date: string;
  marketValue: number;
  benchmarkValue: number;
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

export interface PerformanceMetrics {
  xirr: number;
  twr: number;
  benchmarkReturn: number;
}

export interface ReadyDashboard {
  state: "ready";
  portfolio: PortfolioSummary;
  asOfDate: string;
  timeline: TimelinePoint[];
  holdings: Holding[];
  metrics: PerformanceMetrics;
  warnings: string[];
}

export type Dashboard = EmptyDashboard | ReadyDashboard;

export interface TimeTravelReportRequest {
  securityId: string;
  asOfDate: string;
}

export type Sentiment = "bullish" | "bearish" | "neutral";

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
  summary: string;
  citations: EvidenceCitation[];
  complianceStatus: "passed" | "rejected";
}

export interface ApiError {
  code: string;
  message: string;
}
