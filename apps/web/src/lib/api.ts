import type { ApiError } from "@ledger-book/contracts";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = isApiError(payload) ? payload : undefined;
    throw new ApiRequestError(
      error?.message ?? "服務暫時無法回應，請再試一次。",
      response.status,
      error?.code,
    );
  }

  return payload as T;
}
