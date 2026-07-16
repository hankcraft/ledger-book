import { hasInjectionContext, inject, type InjectionKey } from "vue";

import { createRealApiService } from "./client";
import { resolveApiBaseUrl, resolveApiMode, type ApiMode } from "./config";
import { createMockApiService } from "./mock";
import type { IApiService } from "./types";

export const ApiServiceKey: InjectionKey<IApiService> = Symbol("ApiService");

let configuredApiService: IApiService | null = null;

export interface CreateApiServiceOptions {
  mode?: ApiMode;
  baseUrl?: string;
}

/**
 * Creates the single frontend API boundary.
 *
 * Mock mode is the safe default for local development.
 * Production builds set VITE_API_MODE=real via the deploy script.
 */
export function createApiService(options: CreateApiServiceOptions = {}): IApiService {
  const mode = options.mode ?? resolveApiMode(import.meta.env.VITE_API_MODE);

  if (mode === "real") {
    return createRealApiService({
      baseUrl: options.baseUrl ?? resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
    });
  }

  return createMockApiService();
}

/** Registers the app-wide instance for stores and global router guards. */
export function setApiService(service: IApiService): void {
  configuredApiService = service;
}

export function useApi(): IApiService {
  const injected = hasInjectionContext() ? inject(ApiServiceKey, null) : null;
  const service = injected ?? configuredApiService;

  if (!service) {
    throw new Error("API service has not been configured.");
  }

  return service;
}
