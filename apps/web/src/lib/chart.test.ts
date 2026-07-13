import { describe, expect, test } from "bun:test";

import { createTimelinePath } from "./chart";

describe("createTimelinePath", () => {
  test("fits timeline values into the requested SVG bounds", () => {
    const path = createTimelinePath(
      [
        { date: "2025-01-01", marketValue: 100, benchmarkValue: 100 },
        { date: "2025-02-01", marketValue: 150, benchmarkValue: 125 },
        { date: "2025-03-01", marketValue: 200, benchmarkValue: 150 },
      ],
      "marketValue",
      { width: 100, height: 100 },
    );

    expect(path).toBe("M 0 100 L 50 50 L 100 0");
  });

  test("keeps a flat series visible", () => {
    const path = createTimelinePath(
      [
        { date: "2025-01-01", marketValue: 100, benchmarkValue: 100 },
        { date: "2025-02-01", marketValue: 100, benchmarkValue: 100 },
      ],
      "benchmarkValue",
      { width: 100, height: 100 },
    );

    expect(path).toBe("M 0 50 L 100 50");
  });
});
