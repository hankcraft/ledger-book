import { describe, expect, test } from "bun:test";
import { DEMO_PORTFOLIO_ID } from "@ledger-book/contracts";

import {
  calculateAnnualXirr,
  calculateTwr,
  createApp,
  createDemoStore,
  isObjectiveSummary,
} from "../src/app.ts";

function importRequest(): Request {
  return new Request("http://localhost/api/demo-imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ portfolioId: DEMO_PORTFOLIO_ID }),
  });
}

describe("performance calculations", () => {
  test("annualizes a one-year 10% XIRR", () => {
    expect(
      calculateAnnualXirr([
        { amount: -100, date: "2023-01-01" },
        { amount: 110, date: "2024-01-01" },
      ]),
    ).toBeCloseTo(0.1, 5);
  });

  test("calculates TWR without cash-flow timing", () => {
    expect(calculateTwr([100, 120], [0, 10])).toBeCloseTo(1 / 11, 8);
  });
});

describe("demo API", () => {
  test("shows an empty dashboard until the immutable demo ledger is imported", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request(`http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/dashboard`),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "empty" });
  });

  test("imports a 2025 five-ticker trading ledger with dashboard snapshots", async () => {
    const app = createApp();

    const first = await app.handle(importRequest());
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ status: "completed" });

    const duplicate = await app.handle(importRequest());
    expect(duplicate.status).toBe(409);

    const dashboard = await app.handle(
      new Request(`http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/dashboard`),
    );
    const body = (await dashboard.json()) as {
      benchmark: { return: number; symbol: string };
      holdings: { symbol: string }[];
      latestSnapshot: { asOfDate: string; cashValue: number; marketValue: number };
      timelinePoints: unknown[];
    };

    expect(body.latestSnapshot).toMatchObject({
      asOfDate: "2025-12-31",
      cashValue: expect.any(Number),
      marketValue: expect.any(Number),
    });
    expect(body.holdings.map((holding) => holding.symbol)).toEqual([
      "0050",
      "00878",
      "2330",
      "2317",
      "2454",
    ]);
    expect(body.timelinePoints.length).toBeGreaterThanOrEqual(6);
    expect(body.benchmark).toMatchObject({ symbol: "0050", return: expect.any(Number) });

    const opening = await app.handle(
      new Request(
        `http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/dashboard?asOfDate=2025-01-02`,
      ),
    );
    expect(opening.status).toBe(200);
    expect(await opening.json()).toMatchObject({ state: "ready", metrics: { twr: 0, xirr: 0 } });

    const betweenValuations = await app.handle(
      new Request(
        `http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/dashboard?asOfDate=2025-08-30`,
      ),
    );
    const intermediate = (await betweenValuations.json()) as {
      holdings: { quantity: number; symbol: string }[];
      latestSnapshot: { asOfDate: string };
    };
    expect(intermediate.latestSnapshot.asOfDate).toBe("2025-08-29");
    expect(intermediate.holdings.find((holding) => holding.symbol === "2330")?.quantity).toBe(120);
  });

  test("keeps 2025 blueprint ledger activity immutable", () => {
    const store = createDemoStore();
    store.importDemo();
    const entries = store.getLedgerEntries();

    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries[0]!)).toBe(true);
    expect(new Set(entries.flatMap((entry) => entry.securityId ?? [])).size).toBe(5);
    expect(entries[0]?.occurredOn).toBe("2025-01-02");
    expect(entries[0]?.sequence).toBe(1);
    expect(entries[1]).toMatchObject({ grossCashAmount: -155_200, feeAmount: 221 });
    expect(entries.at(-1)?.occurredOn).toBe("2025-12-29");
    expect(entries.some((entry) => entry.entryType === "sell")).toBe(true);
    expect(entries.some((entry) => entry.entryType === "dividend")).toBe(true);
  });

  test("exposes the imported immutable ledger as the dashboard's canonical event list", async () => {
    const app = createApp();
    const ledgerUrl = `http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/ledger`;

    const beforeImport = await app.handle(new Request(ledgerUrl));
    expect(beforeImport.status).toBe(200);
    expect(await beforeImport.json()).toEqual([]);

    await app.handle(importRequest());
    const response = await app.handle(new Request(ledgerUrl));
    const entries = (await response.json()) as {
      entryType: string;
      occurredOn: string;
      sequence: number;
    }[];

    expect(response.status).toBe(200);
    expect(entries).toHaveLength(23);
    expect(entries[0]).toMatchObject({
      occurredOn: "2025-01-02",
      entryType: "cash_deposit",
      sequence: 1,
    });
    expect(entries.at(-1)).toMatchObject({ occurredOn: "2025-12-29", sequence: 23 });
  });

  test("returns only dated evidence and rejects advice wording", async () => {
    const app = createApp();
    await app.handle(importRequest());

    const response = await app.handle(
      new Request(`http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/time-travel-reports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ securityId: "2330", asOfDate: "2025-06-30" }),
      }),
    );
    const report = (await response.json()) as {
      citations: { observedOn: string }[];
      uiColor: string;
    };

    expect(response.status).toBe(201);
    expect(report.citations.every(({ observedOn }) => observedOn <= "2025-06-30")).toBe(true);
    expect(report.uiColor).toBe("red");
    expect(isObjectiveSummary("建議買進這檔股票")).toBe(false);
    expect(isObjectiveSummary("建議買入這檔股票")).toBe(false);
  });
});
