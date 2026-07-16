import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import type { PrismaClient } from "@prisma/client";

import { createImportService } from "./services/import.service.ts";
import { createLedgerService } from "./services/ledger.service.ts";
import { createPortfolioService } from "./services/portfolio.service.ts";
import { createTimeTravelService } from "./services/time-travel.service.ts";
import { createContextService } from "./services/context.service.ts";
import { createConversationService } from "./services/conversation.service.ts";
import { createOpenSearchService } from "./services/opensearch.service.ts";

import { healthRoutes } from "./routes/health.ts";
import { createDemoImportRoutes } from "./routes/demo-imports.ts";
import { createPortfolioRoutes } from "./routes/portfolios.ts";
import { createTimeTravelRoutes } from "./routes/time-travel.ts";
import { createAgentChatRoutes } from "./routes/agent-chat.ts";
import { createOnboardingRoutes } from "./routes/v1/onboarding.ts";
import { createContextRoutes } from "./routes/v1/context.ts";
import { createHomeRoutes } from "./routes/v1/home.ts";
import { createPerformanceRoutes } from "./routes/v1/performance.ts";
import { createConversationRoutes } from "./routes/v1/conversations.ts";
import { createHoldingsRoutes } from "./routes/v1/holdings.ts";

export interface AppConfig {
  db: PrismaClient;
  /** CSV content for the demo import flow (empty string disables it) */
  demoCsv?: string;
  /** Default portfolio ID for agent-chat context */
  defaultPortfolioId?: string;
  /** Function to resolve current user ID (MVP: returns seed user) */
  getUserId?: () => string;
}

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_PORTFOLIO_ID = "demo-portfolio";

export function createApp(config: AppConfig) {
  const { db, demoCsv = "", defaultPortfolioId = DEFAULT_PORTFOLIO_ID } = config;
  const getUserId = config.getUserId ?? (() => DEFAULT_USER_ID);

  // Create services
  const importService = createImportService(db);
  const ledgerService = createLedgerService(db);
  const portfolioService = createPortfolioService(db);
  const timeTravelService = createTimeTravelService(db);
  const contextService = createContextService(db);
  const conversationService = createConversationService(db);
  const openSearchService = createOpenSearchService();

  // For V1 performance route
  const getPortfolioId = () => defaultPortfolioId;

  // Compose Elysia app
  return new Elysia({ name: "ledger-book-api" })
    .use(cors({ origin: true }))
    .use(healthRoutes)
    .use(createDemoImportRoutes(importService, demoCsv))
    .use(createPortfolioRoutes(portfolioService, ledgerService, importService))
    .use(createTimeTravelRoutes(timeTravelService, importService, portfolioService))
    .use(createAgentChatRoutes(portfolioService, ledgerService, importService, defaultPortfolioId))
    .use(createOnboardingRoutes(contextService, getUserId))
    .use(createContextRoutes(contextService, getUserId))
    .use(createHomeRoutes(contextService, getUserId))
    .use(createPerformanceRoutes(portfolioService, getPortfolioId, db, openSearchService))
    .use(createConversationRoutes(conversationService, contextService, getUserId))
    .use(createHoldingsRoutes(db, getUserId));
}
