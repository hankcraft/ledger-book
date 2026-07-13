import { expect, test } from "bun:test";

import { formatPercent } from "./format";

test("renders unavailable performance metrics as an em dash", () => {
  expect(formatPercent(null)).toBe("—");
});
