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

  test("imports a two-year, seven-ticker trading ledger", async () => {
    const app = createApp();

    const first = await app.handle(importRequest());
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ status: "completed" });

    const duplicate = await app.handle(importRequest());
    expect(duplicate.status).toBe(409);

    const dashboard = await app.handle(
      new Request(`http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/dashboard`),
    );
    const body = (await dashboard.json()) as { asOfDate: string; holdings: { symbol: string }[] };

    expect(body.asOfDate).toBe("2025-12-31");
    expect(body.holdings.map((holding) => holding.symbol)).toEqual([
      "0050",
      "00878",
      "2330",
      "2317",
      "2454",
      "2308",
      "2881",
    ]);

    const opening = await app.handle(
      new Request(
        `http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/dashboard?asOfDate=2024-01-02`,
      ),
    );
    expect(opening.status).toBe(200);
    expect(await opening.json()).toMatchObject({ state: "ready", metrics: { twr: 0, xirr: 0 } });
  });

  test("keeps two years of trading activity immutable", () => {
    const store = createDemoStore();
    store.importDemo();
    const entries = store.getLedgerEntries();

    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries[0]!)).toBe(true);
    expect(new Set(entries.flatMap((entry) => entry.securityId ?? [])).size).toBe(7);
    expect(entries[0]?.occurredOn).toBe("2024-01-02");
    expect(entries.at(-1)?.occurredOn).toBe("2025-12-22");
    expect(entries.some((entry) => entry.kind === "sell")).toBe(true);
    expect(entries.some((entry) => entry.kind === "cash_dividend")).toBe(true);
  });

  test("returns only dated evidence and rejects advice wording", async () => {
    const app = createApp();
    await app.handle(importRequest());

    const response = await app.handle(
      new Request(`http://localhost/api/portfolios/${DEMO_PORTFOLIO_ID}/time-travel-reports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ securityId: "2330", asOfDate: "2024-06-28" }),
      }),
    );
    const report = (await response.json()) as { citations: { observedOn: string }[] };

    expect(response.status).toBe(201);
    expect(report.citations.every(({ observedOn }) => observedOn <= "2024-06-28")).toBe(true);
    expect(isObjectiveSummary("建議買進這檔股票")).toBe(false);
    expect(isObjectiveSummary("建議買入這檔股票")).toBe(false);
  });
});
