const onboardingCompletionKey = "ledger-book:onboarding-complete";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface OnboardingHydrationDecision {
  onboardingComplete: boolean;
  shouldClearCompletionMarker: boolean;
  shouldReportLoadError: boolean;
}

function getBrowserStorage(): KeyValueStorage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readOnboardingCompletion(storage = getBrowserStorage()): boolean {
  return storage?.getItem(onboardingCompletionKey) === "true";
}

export function writeOnboardingCompletion(storage = getBrowserStorage()): void {
  storage?.setItem(onboardingCompletionKey, "true");
}

export function clearOnboardingCompletion(storage = getBrowserStorage()): void {
  storage?.removeItem(onboardingCompletionKey);
}

/**
 * A network failure does not prove that an existing onboarding context is gone.
 * Keep the user in the protected flow and surface a retryable loading failure.
 */
export function resolveOnboardingHydration(
  hasCompletionMarker: boolean,
  contextLoaded: boolean,
): OnboardingHydrationDecision {
  if (!hasCompletionMarker) {
    return {
      onboardingComplete: false,
      shouldClearCompletionMarker: false,
      shouldReportLoadError: false,
    };
  }

  if (!contextLoaded) {
    return {
      onboardingComplete: true,
      shouldClearCompletionMarker: false,
      shouldReportLoadError: true,
    };
  }

  return {
    onboardingComplete: true,
    shouldClearCompletionMarker: false,
    shouldReportLoadError: false,
  };
}
