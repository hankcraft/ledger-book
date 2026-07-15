export type ApiMode = "mock" | "real";

export function resolveApiMode(value: string | undefined): ApiMode {
  return value === "real" ? "real" : "mock";
}

export function resolveApiBaseUrl(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized || "/api/v1";
}
