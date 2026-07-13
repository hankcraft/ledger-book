import { calculateTimeWeightedReturn } from "@railpath/finance-toolkit";
import {
  DEMO_PORTFOLIO_ID,
  type ApiError,
  type Dashboard,
  type DemoImportResult,
  type EvidenceCitation,
  type Holding,
  type PerformanceMetrics,
  type PortfolioSummary,
  type TimeTravelReport,
} from "@ledger-book/contracts";
import { Elysia, t } from "elysia";
import { convertRate, xirr } from "node-irr";

const portfolio: PortfolioSummary = {
  id: DEMO_PORTFOLIO_ID,
  name: "台股核心－衛星帳本",
  baseCurrency: "TWD",
  benchmarkSymbol: "0050",
};

const securities = [
  { id: "2330", symbol: "2330", name: "台積電" },
  { id: "00878", symbol: "00878", name: "國泰永續高股息" },
] as const;

type SecurityId = (typeof securities)[number]["id"];

interface Price {
  symbol: SecurityId | "0050";
  date: string;
  close: number;
}

const prices: readonly Price[] = [
  { symbol: "2330", date: "2024-01-02", close: 600 },
  { symbol: "00878", date: "2024-01-02", close: 20 },
  { symbol: "0050", date: "2024-01-02", close: 145 },
  { symbol: "2330", date: "2024-06-28", close: 950 },
  { symbol: "00878", date: "2024-06-28", close: 22.5 },
  { symbol: "0050", date: "2024-06-28", close: 180 },
  { symbol: "2330", date: "2024-12-31", close: 1075 },
  { symbol: "00878", date: "2024-12-31", close: 21.8 },
  { symbol: "0050", date: "2024-12-31", close: 190 },
];

interface LedgerEntry {
  id: string;
  occurredOn: string;
  kind: "cash_deposit" | "buy";
  amount: number;
  securityId?: SecurityId;
  quantity?: number;
}

const demoLedger: readonly LedgerEntry[] = [
  {
    id: "entry-1",
    occurredOn: "2024-01-02",
    kind: "cash_deposit",
    amount: 100_000,
  },
  {
    id: "entry-2",
    occurredOn: "2024-01-02",
    kind: "buy",
    amount: -30_000,
    securityId: "2330",
    quantity: 50,
  },
  {
    id: "entry-3",
    occurredOn: "2024-01-02",
    kind: "buy",
    amount: -20_000,
    securityId: "00878",
    quantity: 1_000,
  },
];

interface Evidence extends EvidenceCitation {
  securityId: SecurityId;
}

const evidence: readonly Evidence[] = [
  {
    id: "evidence-2330-1",
    securityId: "2330",
    observedOn: "2024-06-27",
    source: "CMoney 籌碼資料",
    label: "三大法人連續兩日淨買超",
  },
  {
    id: "evidence-2330-2",
    securityId: "2330",
    observedOn: "2024-06-28",
    source: "CMoney 社群資料",
    label: "討論量較前五日均值增加",
  },
  {
    id: "evidence-00878-1",
    securityId: "00878",
    observedOn: "2024-06-28",
    source: "CMoney 籌碼資料",
    label: "受益人數與成交量皆高於月初",
  },
];

const prohibitedSummaryTerms = /買進|買入|賣出|持有|\bbuy\b|\bsell\b|\bhold\b/i;

export function isObjectiveSummary(summary: string): boolean {
  return !prohibitedSummaryTerms.test(summary);
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

function freezeEntry(entry: LedgerEntry): Readonly<LedgerEntry> {
  return Object.freeze({ ...entry });
}

function priceOnOrBefore(symbol: Price["symbol"], asOfDate: string): Price | undefined {
  return prices.findLast((price) => price.symbol === symbol && price.date <= asOfDate);
}

function knownPriceDates(asOfDate: string): string[] {
  const dates = prices.filter((price) => price.date <= asOfDate).map((price) => price.date);
  return [...new Set(dates)];
}

function isIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isSecurityId(value: string): value is SecurityId {
  return securities.some((security) => security.id === value);
}

export interface DemoStore {
  importDemo(): DemoImportResult | undefined;
  getImport(importId: string): DemoImportResult | undefined;
  getLedgerEntries(): readonly Readonly<LedgerEntry>[];
  getDashboard(asOfDate: string): Dashboard | undefined;
  createReport(securityId: SecurityId, asOfDate: string): TimeTravelReport | undefined;
  getReport(reportId: string): TimeTravelReport | undefined;
  hasImported(): boolean;
}

export function createDemoStore(): DemoStore {
  let imported = false;
  let importResult: DemoImportResult | undefined;
  const entries: LedgerEntry[] = [];
  const reports = new Map<string, TimeTravelReport>();

  function getHoldings(asOfDate: string): Holding[] | undefined {
    const holdings: Array<Holding | undefined> = securities.map((security) => {
      const entry = entries.find(
        (candidate) => candidate.kind === "buy" && candidate.securityId === security.id,
      );
      const current = priceOnOrBefore(security.id, asOfDate);
      const initial = priceOnOrBefore(security.id, "2024-01-02");

      if (!entry?.quantity || !current || !initial) return undefined;

      return {
        securityId: security.id,
        symbol: security.symbol,
        name: security.name,
        quantity: entry.quantity,
        unitPrice: current.close,
        marketValue: entry.quantity * current.close,
        changePercent: current.close / initial.close - 1,
      };
    });

    const readyHoldings = holdings.filter((holding): holding is Holding => holding !== undefined);
    return readyHoldings.length === securities.length ? readyHoldings : undefined;
  }

  function getDashboard(asOfDate: string): Dashboard | undefined {
    if (!imported) return { state: "empty", portfolio };

    const dates = knownPriceDates(asOfDate);
    const initialBenchmark = priceOnOrBefore("0050", "2024-01-02");
    if (dates.length === 0 || !initialBenchmark) return undefined;

    const holdings = getHoldings(asOfDate);
    if (!holdings) return undefined;

    const cash = entries.reduce((total, entry) => total + entry.amount, 0);
    const timeline = dates.map((date) => {
      const pointHoldings = getHoldings(date);
      const benchmark = priceOnOrBefore("0050", date);
      if (!pointHoldings || !benchmark) return undefined;

      return {
        date,
        marketValue:
          cash + pointHoldings.reduce((total, holding) => total + holding.marketValue, 0),
        benchmarkValue: 100_000 * (benchmark.close / initialBenchmark.close),
      };
    });

    if (timeline.some((point) => point === undefined)) return undefined;
    const readyTimeline = timeline.filter(
      (point): point is NonNullable<typeof point> => point !== undefined,
    );
    const finalPoint = readyTimeline.at(-1);
    const firstPoint = readyTimeline[0];
    if (!firstPoint || !finalPoint) return undefined;

    const metrics: PerformanceMetrics = {
      xirr: calculateAnnualXirr([
        { amount: -100_000, date: "2024-01-02" },
        { amount: finalPoint.marketValue, date: finalPoint.date },
      ]),
      twr: calculateTwr(
        readyTimeline.map((point) => point.marketValue),
        readyTimeline.map(() => 0),
      ),
      benchmarkReturn: finalPoint.benchmarkValue / firstPoint.benchmarkValue - 1,
    };

    return {
      state: "ready",
      portfolio,
      asOfDate: finalPoint.date,
      timeline: readyTimeline,
      holdings,
      metrics,
      warnings: [],
    };
  }

  return {
    importDemo() {
      if (imported) return undefined;

      imported = true;
      for (const entry of demoLedger) entries.push({ ...entry });
      importResult = {
        importId: "demo-import-1",
        portfolioId: DEMO_PORTFOLIO_ID,
        status: "completed",
        completedAt: "2024-12-31T08:00:00.000Z",
      };
      return importResult;
    },
    getImport(importId) {
      return importResult?.importId === importId ? importResult : undefined;
    },
    getLedgerEntries() {
      return Object.freeze(entries.map(freezeEntry));
    },
    getDashboard,
    createReport(securityId, asOfDate) {
      const citations = evidence
        .filter((item) => item.securityId === securityId && item.observedOn <= asOfDate)
        .map(({ securityId: _securityId, ...citation }) => citation);
      const security = securities.find((item) => item.id === securityId);
      if (citations.length === 0 || !security) return undefined;

      const summary = `${security.name}在所選日期前的資料顯示：${citations
        .map((citation) => citation.label)
        .join("；")}。`;
      if (!isObjectiveSummary(summary)) return undefined;

      const report: TimeTravelReport = {
        id: `report-${reports.size + 1}`,
        portfolioId: DEMO_PORTFOLIO_ID,
        securityId,
        symbol: security.symbol,
        asOfDate,
        sentiment: securityId === "2330" ? "bullish" : "neutral",
        summary,
        citations,
        complianceStatus: "passed",
      };
      reports.set(report.id, report);
      return report;
    },
    getReport(reportId) {
      return reports.get(reportId);
    },
    hasImported() {
      return imported;
    },
  };
}

function error(code: string, message: string): ApiError {
  return { code, message };
}

export function createApp(store = createDemoStore()) {
  return new Elysia({ name: "ledger-book-api" })
    .get("/api/health", () => ({ ok: true }))
    .post(
      "/api/demo-imports",
      ({ set }) => {
        const result = store.importDemo();
        if (!result) {
          set.status = 409;
          return error("demo_already_imported", "Fake Demo 已匯入此投資組合。");
        }

        set.status = 201;
        return result;
      },
      { body: t.Object({ portfolioId: t.Literal(DEMO_PORTFOLIO_ID) }) },
    )
    .get("/api/demo-imports/:importId", ({ params, set }) => {
      const result = store.getImport(params.importId);
      if (!result) {
        set.status = 404;
        return error("import_not_found", "找不到匯入紀錄。");
      }
      return result;
    })
    .get(
      "/api/portfolios/:portfolioId/dashboard",
      ({ params, query, set }) => {
        if (params.portfolioId !== DEMO_PORTFOLIO_ID) {
          set.status = 404;
          return error("portfolio_not_found", "找不到投資組合。");
        }

        const asOfDate = query.asOfDate ?? "2024-12-31";
        if (!isIsoDate(asOfDate)) {
          set.status = 400;
          return error("invalid_as_of_date", "asOfDate 必須是 YYYY-MM-DD。");
        }

        const dashboard = store.getDashboard(asOfDate);
        if (!dashboard) {
          set.status = 404;
          return error("valuation_data_missing", "所選日期沒有估值資料。");
        }
        return dashboard;
      },
      { query: t.Object({ asOfDate: t.Optional(t.String()) }) },
    )
    .post(
      "/api/portfolios/:portfolioId/time-travel-reports",
      ({ params, body, set }) => {
        if (params.portfolioId !== DEMO_PORTFOLIO_ID) {
          set.status = 404;
          return error("portfolio_not_found", "找不到投資組合。");
        }
        if (!store.hasImported()) {
          set.status = 409;
          return error("demo_import_required", "請先匯入 Fake Demo。");
        }
        if (!isSecurityId(body.securityId) || !isIsoDate(body.asOfDate)) {
          set.status = 400;
          return error("invalid_request", "標的或日期無效。");
        }

        const report = store.createReport(body.securityId, body.asOfDate);
        if (!report) {
          set.status = 404;
          return error("historical_evidence_missing", "所選日期沒有可引用資料。");
        }
        set.status = 201;
        return report;
      },
      {
        body: t.Object({
          securityId: t.String({ minLength: 1 }),
          asOfDate: t.String({ minLength: 1 }),
        }),
      },
    )
    .get("/api/time-travel-reports/:reportId", ({ params, set }) => {
      const report = store.getReport(params.reportId);
      if (!report) {
        set.status = 404;
        return error("report_not_found", "找不到回溯報告。");
      }
      return report;
    });
}
