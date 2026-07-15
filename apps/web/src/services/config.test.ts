import { describe, expect, test } from "bun:test";

import { resolveApiMode } from "./config";

describe("resolveApiMode", () => {
  test("uses mock mode when no explicit mode is configured", () => {
    expect(resolveApiMode(undefined)).toBe("mock");
  });

  test("allows only the explicit real mode", () => {
    expect(resolveApiMode("real")).toBe("real");
    expect(resolveApiMode("unexpected")).toBe("mock");
  });
});
