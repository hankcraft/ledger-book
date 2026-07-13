# Developer Guide

## Purpose

Ledger Book demonstrates a low-friction portfolio import, XIRR/TWR performance views, and date-scoped factual analysis. It must not provide investment recommendations.

## Start locally

Requires Bun.

```sh
bun install
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

## Current POC

The runnable application is intentionally deterministic and in memory.

- `apps/web`: Vue 3 + Vite UI.
- `apps/api`: Bun + Elysia API, fixed prices/evidence, demo ledger store.
- `packages/contracts`: shared request and response types.
- Restarting the API resets the import and generated reports.
- PostgreSQL, Redis, CMoney ingestion, and Bedrock are not integrated yet.

Use the demo API with camel-case JSON fields:

```text
POST /api/demo-imports                         { "portfolioId": "demo-portfolio" }
GET  /api/portfolios/demo-portfolio/dashboard?asOfDate=YYYY-MM-DD
POST /api/portfolios/demo-portfolio/time-travel-reports
GET  /api/time-travel-reports/:reportId
```

The report request body is `{ "securityId": "2330", "asOfDate": "YYYY-MM-DD" }`.

## Non-negotiable behavior

- Ledger entries are append-only. Corrections become reversal entries in the target design.
- Keep XIRR on `node-irr` and TWR on `@railpath/finance-toolkit`; tests protect known results.
- Resolve valuations from the latest seeded price on or before the selected date.
- Report evidence must match the selected security and be dated on or before the selected date.
- Block buy, sell, hold, and equivalent recommendation language. Show facts, citations, and descriptive sentiment only.
- Change shared API shapes in `packages/contracts` before changing API or web consumers.

## Target architecture

[C4 handoff](architecture/c4-model.md) and [LikeC4 source](architecture/ledger-book.c4) describe the persistent target MVP:

- PostgreSQL: immutable ledger, prices, evidence, snapshots, and report audit data.
- Redis: dashboard and passed-report cache only; not a quote cache for this seeded demo.
- AWS Bedrock: external AgentCore and Knowledge Base containers. The API calls AgentCore synchronously; the seed loader indexes authorized RAG chunks.
- No queue, worker, authentication, live quote API, or mixed-currency support in this MVP.

The C4 model is architecture intent, not a claim about the current in-memory implementation. Update `c4-model.md` and `ledger-book.c4` together when container responsibilities or cross-boundary calls change.

Validate diagram changes:

```sh
bunx likec4@1.53.0 validate --json --no-layout --file docs/architecture/ledger-book.c4 docs/architecture
```
