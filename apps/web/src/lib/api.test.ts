import { afterEach, describe, expect, test } from "bun:test";

import { ApiRequestError, requestJson } from "./api";

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

  test("uses the API error message when a request fails", async () => {
    mockFetch(
      new Response(JSON.stringify({ code: "demo_already_imported", message: "示範資料已匯入。" }), {
        status: 409,
      }),
    );

    await expect(requestJson("/api/demo-imports")).rejects.toEqual(
      new ApiRequestError("示範資料已匯入。", 409),
    );
  });
});
