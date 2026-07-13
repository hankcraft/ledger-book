# C4 Model — 股票帳本 Ledger Book

> Target MVP architecture. PostgreSQL is the system of record; Redis only caches derived dashboard and passed-report responses.

## System Context

Ledger Book helps a single demo investor import an immutable portfolio ledger, inspect XIRR/TWR performance, and request date-scoped factual analysis. CMoney supplies authorized historical evidence during data seeding. AWS Bedrock provides the external AgentCore and Knowledge Base services used for grounded report generation; neither may provide investment advice.

```
+----------------------------+
| investor                   |
| [person]                   |
| Investor                   |
+----------------------------+
              |
              | imports demo ledger, views performance, requests analysis / HTTPS
              v
+= ledger-book : 股票帳本 Ledger Book ==================================+
|                                                                         |
|                     (opened in Containers section)                     |
|                                                                         |
+=========================================================================+
              |                                      |
              | imports authorized historical         | generates factual reports
              | evidence / controlled data transfer   | / AWS SDK + HTTPS
              v                                      v
+----------------------------+        +----------------------------+
| cmoney                     |        | aws-bedrock                |
| [existingsystem]           |        | [existingsystem]           |
| Authorized CMoney Data     |        | AWS Bedrock                |
+----------------------------+        +----------------------------+
```

```
investor --[imports demo ledger, views performance, requests analysis / HTTPS]--> ledger-book
ledger-book --[imports authorized historical evidence / controlled data transfer]--> cmoney
ledger-book --[generates factual reports / AWS SDK + HTTPS]--> aws-bedrock
```

## Containers

The Ledger Book boundary contains one browser SPA, one synchronous Bun/Elysia API, PostgreSQL, Redis, and a repeatable data-seed loader. The API owns request-path orchestration; no queue or worker exists in this MVP. AWS Bedrock is outside the system boundary, but its two managed containers are opened here to make the AgentCore-to-Knowledge-Base path explicit.

```
+----------------+       += ledger-book : 股票帳本 Ledger Book ===========================+
| investor       |       |                                                               |
| [person]       |       | +----------------+  +----------------+  +----------------+ |
| Investor       |       | | web-spa        |  | ledger-api     |  | ledger-db      | |
+----------------+       | | [spa]          |  | [container]    |  | [database]     | |
                         | | Vue 3 + Vite   |  | Bun + Elysia   |  | PostgreSQL     | |
                         | +----------------+  +----------------+  +----------------+ |
                         |                                                               |
                         | +-------------------+  +----------------+                    |
                         | | ledger-cache      |  | seed-loader    |                    |
                         | | [container]       |  | [container]    |                    |
                         | | Redis             |  | Bun + TS CLI   |                    |
                         | +-------------------+  +----------------+                    |
                         |                                                               |
                         +===============================================================+

+----------------+       += aws-bedrock : AWS Bedrock =================================+
| cmoney         |       | +----------------+  +-------------------+                  |
| [existingsystem] |     | | agentcore      |  | knowledge-base    |                  |
| CMoney Data    |       | | [container]    |  | [container]       |                  |
+----------------+       | | AgentCore      |  | Knowledge Bases   |                  |
                         | +----------------+  +-------------------+                  |
                         +===============================================================+
```

```
investor --[uses / HTTPS]--> web-spa
web-spa --[calls portfolio APIs / HTTPS + JSON]--> ledger-api
ledger-api --[reads and writes / SQL]--> ledger-db
ledger-api --[reads and writes derived responses / Redis protocol]--> ledger-cache
ledger-api --[invokes grounded analysis / AWS SDK + HTTPS]--> agentcore
seed-loader --[imports authorized evidence / controlled data transfer]--> cmoney
seed-loader --[seeds prices, evidence, and demo data / SQL]--> ledger-db
seed-loader --[indexes RAG chunks / AWS SDK + HTTPS]--> knowledge-base
agentcore --[retrieves scoped evidence / Bedrock internal API]--> knowledge-base
```

## Components — ledger-api

The API is opened because it enforces immutable ledger writes, derives investment-performance views, and mediates the compliance-sensitive Bedrock call. Controllers remain thin Elysia route handlers; services own each business boundary.

```
+= ledger-api : Ledger Book API =======================================================+
|                                                                                     |
|   +----------------------+  +----------------------+  +----------------------+   |
|   | import-controller    |  | dashboard-controller |  | report-controller    |   |
|   | [component]          |  | [component]          |  | [component]          |   |
|   | Elysia route         |  | Elysia route         |  | Elysia route         |   |
|   +----------------------+  +----------------------+  +----------------------+   |
|          |                       |                       |                        |
|          v                       v                       v                        |
|   +----------------------+  +----------------------+  +----------------------+   |
|   | ledger-service       |  | performance-service  |  | analysis-service     |   |
|   | [component]          |  | [component]          |  | [component]          |   |
|   | TypeScript           |  | node-irr + toolkit   |  | AWS SDK              |   |
|   +----------------------+  +----------------------+  +----------------------+   |
|                                                       |                             |
|                                                       v                             |
|                                              +-------------------+                  |
|                                              | compliance-gate   |                  |
|                                              | [component]       |                  |
|                                              | TypeScript policy |                  |
|                                              +-------------------+                  |
|                                                                                     |
+=====================================================================================+
```

```
web-spa --[starts import / HTTPS + JSON]--> import-controller
web-spa --[loads dashboard / HTTPS + JSON]--> dashboard-controller
web-spa --[requests report / HTTPS + JSON]--> report-controller
import-controller --[imports immutable entries / TypeScript]--> ledger-service
ledger-service --[appends ledger / SQL]--> ledger-db
ledger-service --[invalidates dashboard cache / Redis protocol]--> ledger-cache
dashboard-controller --[loads dashboard / TypeScript]--> performance-service
performance-service --[reads snapshots, prices, and ledger / SQL]--> ledger-db
performance-service --[gets or stores dashboard / Redis protocol]--> ledger-cache
report-controller --[creates or reads report / TypeScript]--> analysis-service
analysis-service --[retrieves evidence and stores report audit data / SQL]--> ledger-db
analysis-service --[invokes factual synthesis / AWS SDK + HTTPS]--> agentcore
analysis-service --[checks generated report / TypeScript]--> compliance-gate
analysis-service --[caches passed report / Redis protocol]--> ledger-cache
compliance-gate --[records compliance status / SQL]--> ledger-db
```

## Components — web-spa (skipped: presentation container)

## Components — ledger-db (skipped: managed database)

## Components — ledger-cache (skipped: managed cache)

## Components — seed-loader (skipped: one-purpose seed CLI)

## Components — agentcore (skipped: managed AWS service)

## Components — knowledge-base (skipped: managed AWS service)

## Element Registry

| id | kind | parent | label | technology | description |
| --- | --- | --- | --- | --- | --- |
| investor | person |  | Investor |  | Single demo user who imports a portfolio and reads factual analysis. |
| ledger-book | softwaresystem |  | 股票帳本 Ledger Book |  | Quantifies portfolio performance and provides non-advisory historical analysis. |
| cmoney | existingsystem |  | Authorized CMoney Data |  | Authorized historical price, chip, fundamental, and discussion evidence source. |
| aws-bedrock | existingsystem |  | AWS Bedrock |  | External managed AI platform. |
| web-spa | spa | ledger-book | Browser SPA | Vue 3 + Vite | Demo import, dashboard, and time-travel report interface. |
| ledger-api | container | ledger-book | Ledger Book API | Bun + TypeScript + Elysia | Synchronous REST API and business orchestration. |
| ledger-db | database | ledger-book | Ledger Book Database | PostgreSQL + Prisma | System of record for append-only ledger, seeds, derived data, report audit data. |
| ledger-cache | container | ledger-book | Derived Response Cache | Redis | Caches dashboard responses and passed time-travel reports. |
| seed-loader | container | ledger-book | Demo Data Seed Loader | Bun + TypeScript CLI | Repeatably loads approved demo data and RAG chunks. |
| agentcore | container | aws-bedrock | Bedrock AgentCore | AWS Bedrock AgentCore | Orchestrates factual, scoped analysis generation. |
| knowledge-base | container | aws-bedrock | Bedrock Knowledge Base | Amazon Bedrock Knowledge Bases | Holds authorized RAG chunks with security and date metadata. |
| import-controller | component | ledger-api | Demo Import Controller | Elysia route handler | Starts one hardcoded demo import. |
| ledger-service | component | ledger-api | Immutable Ledger Service | TypeScript | Appends entries, creates reversals, and invalidates derived dashboard cache. |
| dashboard-controller | component | ledger-api | Dashboard Controller | Elysia route handler | Serves the selected-date dashboard resource. |
| performance-service | component | ledger-api | Performance Service | TypeScript + node-irr + @railpath/finance-toolkit | Builds valuations, XIRR, TWR, and benchmark values. |
| report-controller | component | ledger-api | Time-Travel Report Controller | Elysia route handler | Creates or retrieves a selected-date report. |
| analysis-service | component | ledger-api | Analysis Service | TypeScript + AWS SDK | Retrieves evidence, invokes AgentCore, persists audit data, and caches passed reports. |
| compliance-gate | component | ledger-api | Compliance Gate | TypeScript policy | Rejects investment-advice language and records report status. |

## Relationships

| source | target | label | technology |
| --- | --- | --- | --- |
| investor | ledger-book | imports demo ledger, views performance, requests analysis | HTTPS |
| ledger-book | cmoney | imports authorized historical evidence | controlled data transfer |
| ledger-book | aws-bedrock | generates factual reports | AWS SDK + HTTPS |
| investor | web-spa | uses | HTTPS |
| web-spa | ledger-api | calls portfolio APIs | HTTPS + JSON |
| ledger-api | ledger-db | reads and writes | SQL |
| ledger-api | ledger-cache | reads and writes derived responses | Redis protocol |
| ledger-api | agentcore | invokes grounded analysis | AWS SDK + HTTPS |
| seed-loader | cmoney | imports authorized evidence | controlled data transfer |
| seed-loader | ledger-db | seeds prices, evidence, and demo data | SQL |
| seed-loader | knowledge-base | indexes RAG chunks | AWS SDK + HTTPS |
| agentcore | knowledge-base | retrieves scoped evidence | Bedrock internal API |
| web-spa | import-controller | starts import | HTTPS + JSON |
| web-spa | dashboard-controller | loads dashboard | HTTPS + JSON |
| web-spa | report-controller | requests report | HTTPS + JSON |
| import-controller | ledger-service | imports immutable entries | TypeScript |
| ledger-service | ledger-db | appends ledger | SQL |
| ledger-service | ledger-cache | invalidates dashboard cache | Redis protocol |
| dashboard-controller | performance-service | loads dashboard | TypeScript |
| performance-service | ledger-db | reads snapshots, prices, and ledger | SQL |
| performance-service | ledger-cache | gets or stores dashboard | Redis protocol |
| report-controller | analysis-service | creates or reads report | TypeScript |
| analysis-service | ledger-db | retrieves evidence and stores report audit data | SQL |
| analysis-service | agentcore | invokes factual synthesis | AWS SDK + HTTPS |
| analysis-service | compliance-gate | checks generated report | TypeScript |
| analysis-service | ledger-cache | caches passed report | Redis protocol |
| compliance-gate | ledger-db | records compliance status | SQL |
