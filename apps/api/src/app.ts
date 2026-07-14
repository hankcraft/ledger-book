import { calculateTimeWeightedReturn } from "@railpath/finance-toolkit";
import {
  DEMO_PORTFOLIO_ID,
  type ApiError,
  type Dashboard,
  type DemoImportResult,
  type EvidenceCitation,
  type Holding,
  type LedgerEntry,
  type LedgerEntryType,
  type PerformanceMetrics,
  type PortfolioSnapshot,
  type PortfolioSummary,
  type TimeTravelReport,
} from "@ledger-book/contracts";
import { Elysia, t } from "elysia";
import { convertRate, xirr } from "node-irr";

import demoLedgerCsv from "./data/demo-ledger.csv" with { type: "text" };

const portfolio: PortfolioSummary = {
  id: DEMO_PORTFOLIO_ID,
  name: "台股核心－衛星帳本",
  baseCurrency: "TWD",
  benchmarkSymbol: "0050",
};

const securities = [
  { id: "0050", symbol: "0050", name: "元大台灣50" },
  { id: "00878", symbol: "00878", name: "國泰永續高股息" },
  { id: "2330", symbol: "2330", name: "台積電" },
  { id: "2317", symbol: "2317", name: "鴻海" },
  { id: "2454", symbol: "2454", name: "聯發科" },
] as const;

type SecurityId = (typeof securities)[number]["id"];

interface Price {
  symbol: SecurityId;
  date: string;
  close: number;
}

const prices: readonly Price[] = [
  { symbol: "0050", date: "2024-01-02", close: 145 },
  { symbol: "00878", date: "2024-01-02", close: 20.5 },
  { symbol: "2330", date: "2024-01-02", close: 590 },
  { symbol: "2317", date: "2024-01-02", close: 102 },
  { symbol: "2454", date: "2024-01-02", close: 900 },
  { symbol: "0050", date: "2024-04-30", close: 166 },
  { symbol: "00878", date: "2024-04-30", close: 21.8 },
  { symbol: "2330", date: "2024-04-30", close: 780 },
  { symbol: "2317", date: "2024-04-30", close: 164 },
  { symbol: "2454", date: "2024-04-30", close: 1_000 },
  { symbol: "0050", date: "2024-08-30", close: 185 },
  { symbol: "00878", date: "2024-08-30", close: 22.1 },
  { symbol: "2330", date: "2024-08-30", close: 970 },
  { symbol: "2317", date: "2024-08-30", close: 185 },
  { symbol: "2454", date: "2024-08-30", close: 1_200 },
  { symbol: "0050", date: "2024-12-31", close: 192 },
  { symbol: "00878", date: "2024-12-31", close: 21.7 },
  { symbol: "2330", date: "2024-12-31", close: 1_060 },
  { symbol: "2317", date: "2024-12-31", close: 180 },
  { symbol: "2454", date: "2024-12-31", close: 1_350 },
  { symbol: "0050", date: "2025-03-31", close: 178 },
  { symbol: "00878", date: "2025-03-31", close: 20.7 },
  { symbol: "2330", date: "2025-03-31", close: 960 },
  { symbol: "2317", date: "2025-03-31", close: 150 },
  { symbol: "2454", date: "2025-03-31", close: 1_250 },
  { symbol: "0050", date: "2025-06-30", close: 194 },
  { symbol: "00878", date: "2025-06-30", close: 21.3 },
  { symbol: "2330", date: "2025-06-30", close: 1_080 },
  { symbol: "2317", date: "2025-06-30", close: 165 },
  { symbol: "2454", date: "2025-06-30", close: 1_450 },
  { symbol: "0050", date: "2025-09-30", close: 202 },
  { symbol: "00878", date: "2025-09-30", close: 21.8 },
  { symbol: "2330", date: "2025-09-30", close: 1_200 },
  { symbol: "2317", date: "2025-09-30", close: 185 },
  { symbol: "2454", date: "2025-09-30", close: 1_600 },
  { symbol: "0050", date: "2025-12-31", close: 210 },
  { symbol: "00878", date: "2025-12-31", close: 22.5 },
  { symbol: "2330", date: "2025-12-31", close: 1_350 },
  { symbol: "2317", date: "2025-12-31", close: 200 },
  { symbol: "2454", date: "2025-12-31", close: 1_800 },
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

function isLedgerEntryType(value: string): value is LedgerEntryType {
  return ["buy", "sell", "cash_deposit", "cash_withdrawal", "dividend", "fee", "reversal"].includes(
    value as LedgerEntryType,
  );
}

function parseDemoLedger(csv: string): readonly LedgerEntry[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (header !== "id,occurred_on,entry_type,gross_cash_amount,fee_amount,security_id,quantity") {
    throw new Error("Demo ledger CSV header is invalid.");
  }

  return rows.map((row, index) => {
    const [
      id = "",
      occurredOn = "",
      entryType = "",
      grossCashAmount = "",
      feeAmount = "",
      securityId = "",
      quantity = "",
    ] = row.split(",");
    const parsedGrossCashAmount = Number(grossCashAmount);
    const parsedFeeAmount = Number(feeAmount);
    const parsedSecurityId =
      securityId === "" ? undefined : isSecurityId(securityId) ? securityId : undefined;
    const parsedQuantity = quantity === "" ? undefined : Number(quantity);

    if (
      !id ||
      !occurredOn ||
      !entryType ||
      !isIsoDate(occurredOn) ||
      !isLedgerEntryType(entryType) ||
      !Number.isFinite(parsedGrossCashAmount) ||
      !Number.isFinite(parsedFeeAmount) ||
      parsedFeeAmount < 0 ||
      (securityId !== "" && parsedSecurityId === undefined) ||
      (parsedQuantity !== undefined &&
        (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0)) ||
      ((entryType === "buy" || entryType === "sell") &&
        (parsedSecurityId === undefined || parsedQuantity === undefined)) ||
      ((entryType === "cash_deposit" || entryType === "cash_withdrawal") &&
        parsedSecurityId !== undefined) ||
      (entryType === "dividend" && parsedSecurityId === undefined)
    ) {
      throw new Error(`Demo ledger CSV row is invalid: ${row}`);
    }

    const entry: LedgerEntry = {
      id,
      portfolioId: DEMO_PORTFOLIO_ID,
      sequence: index + 1,
      occurredOn,
      entryType,
      grossCashAmount: parsedGrossCashAmount,
      feeAmount: parsedFeeAmount,
    };
    if (parsedSecurityId !== undefined) entry.securityId = parsedSecurityId;
    if (parsedQuantity !== undefined) entry.quantity = parsedQuantity;
    return entry;
  });
}

const demoLedger = parseDemoLedger(demoLedgerCsv);

function cashEffect(entry: LedgerEntry): number {
  return entry.grossCashAmount - entry.feeAmount;
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
      const quantity = entries
        .filter(
          (entry) =>
            entry.occurredOn <= asOfDate &&
            entry.securityId === security.id &&
            (entry.entryType === "buy" || entry.entryType === "sell"),
        )
        .reduce(
          (total, entry) =>
            total + (entry.entryType === "buy" ? entry.quantity! : -entry.quantity!),
          0,
        );
      const current = priceOnOrBefore(security.id, asOfDate);
      const initial = priceOnOrBefore(security.id, "2024-01-02");

      if (quantity <= 0 || !current || !initial) return undefined;

      return {
        securityId: security.id,
        symbol: security.symbol,
        name: security.name,
        quantity,
        unitPrice: current.close,
        marketValue: quantity * current.close,
        changePercent: current.close / initial.close - 1,
      };
    });

    const readyHoldings = holdings.filter((holding): holding is Holding => holding !== undefined);
    return readyHoldings.length === securities.length ? readyHoldings : undefined;
  }

  function getDashboard(requestedDate: string): Dashboard | undefined {
    if (!imported) return { state: "empty", portfolio };

    const dates = knownPriceDates(requestedDate);
    const initialBenchmark = priceOnOrBefore("0050", "2024-01-02");
    if (dates.length === 0 || !initialBenchmark) return undefined;

    const snapshotDate = dates.at(-1);
    if (!snapshotDate) return undefined;
    const holdings = getHoldings(snapshotDate);
    if (!holdings) return undefined;

    const initialInvestment = entries
      .filter((entry) => entry.entryType === "cash_deposit" && entry.occurredOn <= snapshotDate)
      .reduce((total, entry) => total + cashEffect(entry), 0);
    const timeline = dates.map((date) => {
      const pointHoldings = getHoldings(date);
      const benchmark = priceOnOrBefore("0050", date);
      const cash = entries
        .filter((entry) => entry.occurredOn <= date)
        .reduce((total, entry) => total + cashEffect(entry), 0);
      if (!pointHoldings || !benchmark) return undefined;

      return {
        date,
        marketValue:
          cash + pointHoldings.reduce((total, holding) => total + holding.marketValue, 0),
        benchmarkValue: initialInvestment * (benchmark.close / initialBenchmark.close),
      };
    });

    if (timeline.some((point) => point === undefined)) return undefined;
    const readyTimeline = timeline.filter(
      (point): point is NonNullable<typeof point> => point !== undefined,
    );
    const finalPoint = readyTimeline.at(-1);
    const firstPoint = readyTimeline[0];
    if (!firstPoint || !finalPoint) return undefined;

    const xirrCashFlows = entries
      .filter((entry) => entry.entryType === "cash_deposit" && entry.occurredOn <= snapshotDate)
      .map((entry) => ({ amount: -cashEffect(entry), date: entry.occurredOn }));
    const metrics: PerformanceMetrics = {
      xirr: xirrCashFlows.some((cashFlow) => cashFlow.date < finalPoint.date)
        ? calculateAnnualXirr([
            ...xirrCashFlows,
            { amount: finalPoint.marketValue, date: finalPoint.date },
          ])
        : 0,
      twr:
        readyTimeline.length > 1
          ? calculateTwr(
              readyTimeline.map((point) => point.marketValue),
              readyTimeline.map(() => 0),
            )
          : 0,
      benchmarkReturn: finalPoint.benchmarkValue / firstPoint.benchmarkValue - 1,
    };
    const cashValue = entries
      .filter((entry) => entry.occurredOn <= snapshotDate)
      .reduce((total, entry) => total + cashEffect(entry), 0);
    const latestSnapshot: PortfolioSnapshot = {
      asOfDate: finalPoint.date,
      marketValue: finalPoint.marketValue,
      cashValue,
      holdings,
    };

    return {
      state: "ready",
      portfolio,
      latestSnapshot,
      timelinePoints: readyTimeline,
      holdings,
      metrics,
      benchmark: { symbol: portfolio.benchmarkSymbol, return: metrics.benchmarkReturn },
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
        completedAt: "2025-12-31T08:00:00.000Z",
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
        uiColor: securityId === "2330" ? "red" : "gray",
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

        const asOfDate = query.asOfDate ?? "2025-12-31";
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
    .get("/api/portfolios/:portfolioId/ledger", ({ params, set }) => {
      if (params.portfolioId !== DEMO_PORTFOLIO_ID) {
        set.status = 404;
        return error("portfolio_not_found", "找不到投資組合。");
      }
      if (!store.hasImported()) {
        set.status = 409;
        return error("demo_import_required", "請先匯入 Fake Demo。");
      }
      return store.getLedgerEntries();
    })
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
