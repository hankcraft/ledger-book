# Developer Guide

## Purpose

Ledger Book demonstrates a low-friction portfolio import, XIRR/TWR performance views, and date-scoped factual analysis. It must not provide investment recommendations.

## Start locally

Requires Bun and Docker (for PostgreSQL).

```sh
docker compose up -d          # Start PostgreSQL
bun install
cd apps/api && bun run db:push  # Apply schema to local DB
cd ../..
bun run dev
```

The API listens on `http://localhost:3000`. Vite proxies `/api` to that address; set `API_PROXY_TARGET` to point the web app at another API.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start API and web app together. |
| `bun run test` | Run API and calculation tests. |
| `bun run typecheck` | Check all workspaces. |
| `bun run build` | Type-check and build all workspaces. |
| `bun run lint` | Run oxlint. |
| `bun run format:check` | Check formatting. |
| `bun run c4:view` | View C4 diagrams with live reload. |
| `bun run c4:validate` | Validate the LikeC4 model. |

### Database commands (from `apps/api/`)

| Command | Purpose |
| --- | --- |
| `bun run db:push` | Apply Prisma schema to the DB (dev). |
| `bun run db:migrate` | Create and apply a migration. |
| `bun run db:generate` | Regenerate Prisma client. |
| `bun run db:studio` | Open Prisma Studio GUI. |

## Architecture

The API uses a layered architecture backed by PostgreSQL (Prisma ORM):

```
src/
├── index.ts          # Entry: PrismaClient → createApp → listen
├── app.ts            # Elysia composition (route plugins + CORS)
├── db.ts             # PrismaClient singleton
├── agent-client.ts   # Agent endpoint communication
├── lib/              # Shared: errors.ts, validation.ts
├── services/         # Business logic (DI via PrismaClient)
│   ├── ledger.service.ts
│   ├── portfolio.service.ts
│   ├── import.service.ts
│   ├── time-travel.service.ts
│   ├── context.service.ts
│   └── conversation.service.ts
└── routes/           # Thin Elysia handlers
    ├── health.ts, demo-imports.ts, portfolios.ts, ...
    └── v1/ (onboarding, context, home, performance, conversations)
```

- `apps/web`: Vue 3 + Vite UI.
- `apps/api`: Bun + Elysia API with PostgreSQL persistence.
- `packages/contracts`: shared request and response types.
- Data persists across API restarts (stored in PostgreSQL).
- The app starts with empty tables — seed data via the API endpoints.

### Core API

```text
POST /api/demo-imports                         { "portfolioId": "<uuid>" }
GET  /api/portfolios/:id/dashboard?asOfDate=YYYY-MM-DD
GET  /api/portfolios/:id/ledger
POST /api/portfolios/:id/entries
POST /api/portfolios/:id/entries/batch
POST /api/portfolios/:id/time-travel-reports
GET  /api/time-travel-reports/:reportId
POST /api/agent/chat                           { "message": "..." }
```

### V1 AI-Native API

```text
POST /api/v1/onboarding/insight
POST /api/v1/onboarding/final-insight
POST /api/v1/onboarding/complete
GET  /api/v1/context
POST /api/v1/context/inferences/:id/confirm
POST /api/v1/context/inferences/:id/deny
POST /api/v1/context/memories/:id/archive
POST /api/v1/context/principles/:id/toggle
DELETE /api/v1/context/principles/:id
POST /api/v1/context/behaviors/:id/toggle
POST /api/v1/context/corrections
GET  /api/v1/home/daily-performance
GET  /api/v1/home/scenario
POST /api/v1/home/action
GET  /api/v1/performance/timeline
GET  /api/v1/performance/events/:date
GET  /api/v1/conversations
POST /api/v1/conversations
POST /api/v1/conversations/:id/messages
POST /api/v1/conversations/:id/resume
POST /api/v1/conversations/:id/select
```

## Non-negotiable behavior

- Ledger entries are append-only. Corrections become reversal entries in the target design.
- Keep XIRR on `node-irr` and TWR on `@railpath/finance-toolkit`; tests protect known results.
- Resolve valuations from the latest seeded price on or before the selected date.
- Report evidence must match the selected security and be dated on or before the selected date.
- Block buy, sell, hold, and equivalent recommendation language. Show facts, citations, and descriptive sentiment only.
- Change shared API shapes in `packages/contracts` before changing API or web consumers.

## Target architecture

[C4 handoff](architecture/c4-model.md) and [LikeC4 source](architecture/ledger-book.c4) describe the persistent target MVP:

- PostgreSQL: immutable ledger, prices, evidence, snapshots, report audit, V1 user context.
- Agent Runtime: Node.js 22 AgentCore-compatible server. Queries OpenSearch Serverless for structured market data and invokes Bedrock Nova Pro for analysis. The API calls the agent via HTTP/SSE.
- OpenSearch Serverless: 8 stock market indices (ingested from CMoney CSV via `apps/agent/scripts/ingest-opensearch.ts`).
- No queue, worker, authentication, live quote API, or mixed-currency support in this MVP.

The C4 model is architecture intent, not a claim about every feature being production-ready. Update `c4-model.md` and `ledger-book.c4` together when container responsibilities or cross-boundary calls change.

Validate diagram changes:

```sh
bun run c4:validate
```
