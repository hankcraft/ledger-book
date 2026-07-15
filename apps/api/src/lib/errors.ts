import type { ApiError } from "@ledger-book/contracts";

/** Core API error factory (used by legacy routes) */
export function apiError(code: string, message: string): ApiError {
  return { code, message };
}

/** V1 error envelope factory */
export function v1Error(code: string, message: string) {
  return { error: { code, message } };
}
