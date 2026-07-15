import { describe, expect, test } from "bun:test";

import {
  clearOnboardingCompletion,
  readOnboardingCompletion,
  resolveOnboardingHydration,
  writeOnboardingCompletion,
  type KeyValueStorage,
} from "./onboarding-state";

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("onboarding completion storage", () => {
  test("persists completion across a new store instance", () => {
    const storage = createMemoryStorage();

    writeOnboardingCompletion(storage);

    expect(readOnboardingCompletion(storage)).toBe(true);
  });

  test("clears an invalidated completion marker", () => {
    const storage = createMemoryStorage();
    writeOnboardingCompletion(storage);

    clearOnboardingCompletion(storage);

    expect(readOnboardingCompletion(storage)).toBe(false);
  });

  test("keeps completed onboarding when context hydration fails transiently", () => {
    expect(resolveOnboardingHydration(true, false)).toEqual({
      onboardingComplete: true,
      shouldClearCompletionMarker: false,
      shouldReportLoadError: true,
    });
  });
});
