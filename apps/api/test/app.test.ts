import { describe, expect, test } from "bun:test";
import { isIsoDate, isLedgerEntryType, isObjectiveSummary } from "../src/lib/validation.ts";
import { calculateAnnualXirr, calculateTwr } from "../src/services/portfolio.service.ts";

describe("validation helpers", () => {
  test("isIsoDate accepts valid dates", () => {
    expect(isIsoDate("2025-01-02")).toBe(true);
    expect(isIsoDate("2025-12-31")).toBe(true);
  });

  test("isIsoDate rejects invalid dates", () => {
    expect(isIsoDate("not-a-date")).toBe(false);
    expect(isIsoDate("2025-13-01")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  test("isLedgerEntryType accepts valid types", () => {
    expect(isLedgerEntryType("buy")).toBe(true);
    expect(isLedgerEntryType("sell")).toBe(true);
    expect(isLedgerEntryType("dividend")).toBe(true);
    expect(isLedgerEntryType("reversal")).toBe(true);
  });

  test("isLedgerEntryType rejects invalid types", () => {
    expect(isLedgerEntryType("unknown")).toBe(false);
    expect(isLedgerEntryType("")).toBe(false);
  });

  test("isObjectiveSummary rejects recommendation language", () => {
    expect(isObjectiveSummary("建議買進這檔股票")).toBe(false);
    expect(isObjectiveSummary("建議買入這檔股票")).toBe(false);
    expect(isObjectiveSummary("建議賣出")).toBe(false);
    expect(isObjectiveSummary("應該持有")).toBe(false);
    expect(isObjectiveSummary("you should buy")).toBe(false);
    expect(isObjectiveSummary("recommend sell")).toBe(false);
    expect(isObjectiveSummary("hold the stock")).toBe(false);
  });

  test("isObjectiveSummary accepts factual language", () => {
    expect(isObjectiveSummary("法人連續買超三日")).toBe(true);
    expect(isObjectiveSummary("成交量較前期增加")).toBe(true);
    expect(isObjectiveSummary("The stock rose 5%")).toBe(true);
  });
});

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
