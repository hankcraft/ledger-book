import { afterEach, describe, expect, test } from "bun:test";

import { requestJson } from "./api";

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");

function mockFetch(response: Response): void {
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: () => Promise.resolve(response),
    writable: true,
  });
}

afterEach(() => {
  if (originalFetch) {
    Object.defineProperty(globalThis, "fetch", originalFetch);
  }
});

describe("requestJson", () => {
  test("returns the API payload for successful responses", async () => {
    mockFetch(new Response(JSON.stringify({ state: "empty" }), { status: 200 }));

    await expect(requestJson<{ state: string }>("/api/dashboard")).resolves.toEqual({
      state: "empty",
    });
  });

  test("keeps the API error code for recovery flows", async () => {
    mockFetch(
      new Response(JSON.stringify({ code: "demo_already_imported", message: "示範資料已匯入。" }), {
        status: 409,
      }),
    );

    await expect(requestJson("/api/demo-imports")).rejects.toMatchObject({
      code: "demo_already_imported",
      message: "示範資料已匯入。",
      status: 409,
    });
  });
});
