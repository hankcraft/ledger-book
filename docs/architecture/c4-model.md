# C4 Model — 投資搭檔 Ledger Book

> Current implementation architecture. PostgreSQL is the system of record. The Agent runtime queries OpenSearch Serverless for structured market data and invokes Bedrock Nova Pro for grounded analysis.

## System Context

投資搭檔 helps a single demo investor import an immutable portfolio ledger, inspect XIRR/TWR performance, converse with an AI agent for personalized portfolio insights, and request date-scoped factual analysis. CMoney supplies authorized historical evidence during data ingestion. AWS provides the external Bedrock (LLM) and OpenSearch Serverless (structured search) services; neither may provide investment advice.

```
+----------------------------+
| investor                   |
| [person]                   |
| Investor                   |
+----------------------------+
              |
              | imports ledger, views performance, chats with AI / HTTPS
              v
+= ledger-book : 投資搭檔 Ledger Book ==================================+
|                                                                         |
|                     (opened in Containers section)                     |
|                                                                         |
+=========================================================================+
              |                                      |
              | imports authorized historical         | queries market data + generates analysis
              | evidence / controlled data transfer   | / SigV4 HTTPS + AWS SDK
              v                                      v
+----------------------------+        +----------------------------+
| cmoney                     |        | aws-cloud                  |
| [existingsystem]           |        | [existingsystem]           |
| Authorized CMoney Data     |        | AWS (Bedrock + OpenSearch) |
+----------------------------+        +----------------------------+
```

```
investor --[imports ledger, views performance, chats with AI / HTTPS]--> ledger-book
ledger-book --[imports authorized historical evidence / controlled data transfer]--> cmoney
ledger-book --[queries market data + generates analysis / SigV4 HTTPS + AWS SDK]--> aws-cloud
```

## Containers

The Ledger Book boundary contains one browser SPA, one synchronous Bun/Elysia API, an Agent runtime (deployed to AWS Bedrock AgentCore), PostgreSQL, and a shared type contracts package. The API owns request-path orchestration; no queue or worker exists. External AWS services (Bedrock for LLM, OpenSearch Serverless for structured market data) are outside the system boundary but shown for data-flow clarity.

```
+----------------+       += ledger-book : 投資搭檔 Ledger Book ===========================+
| investor       |       |                                                               |
| [person]       |       | +----------------+  +----------------+  +----------------+ |
| Investor       |       | | web-spa        |  | ledger-api     |  | agent-runtime  | |
+----------------+       | | [spa]          |  | [container]    |  | [container]    | |
                         | | Vue 3 + Vite   |  | Bun + Elysia   |  | Node 22 + AWS  | |
                         | +----------------+  +----------------+  +----------------+ |
                         |                                                               |
                         | +-------------------+  +-------------------+                 |
                         | | ledger-db         |  | contracts         |                 |
                         | | [database]        |  | [library]         |                 |
                         | | PostgreSQL        |  | TypeScript types  |                 |
                         | +-------------------+  +-------------------+                 |
                         |                                                               |
                         +===============================================================+

+= aws-cloud : AWS Cloud Services =============================================+
| +-------------------+  +----------------------------+                        |
| | bedrock           |  | opensearch-serverless      |                        |
| | [existingsystem]  |  | [existingsystem]           |                        |
| | Bedrock Nova Pro  |  | OpenSearch Serverless      |                        |
| +-------------------+  +----------------------------+                        |
+==============================================================================+

+----------------+
| cmoney         |
| [existingsystem] |
| CMoney Data    |
+----------------+
```

```
investor --[uses / HTTPS]--> web-spa
web-spa --[calls APIs / HTTPS + JSON]--> ledger-api
ledger-api --[reads and writes / SQL]--> ledger-db
ledger-api --[invokes analysis / HTTPS + SSE]--> agent-runtime
agent-runtime --[queries structured market data / SigV4 HTTPS]--> opensearch-serverless
agent-runtime --[generates grounded analysis / AWS SDK ConverseStream]--> bedrock
contracts --[shared types / TypeScript import]--> web-spa
contracts --[shared types / TypeScript import]--> ledger-api
```

## Components — ledger-api

The API enforces immutable ledger writes, derives investment-performance views, manages user context and conversations, and mediates the compliance-sensitive agent call. Route handlers remain thin Elysia plugins; services own each business boundary.

```
+= ledger-api : Ledger Book API =======================================================+
|                                                                                       |
|   +---------------------+  +---------------------+  +---------------------+          |
|   | import-routes       |  | portfolio-routes    |  | time-travel-routes  |          |
|   | [component]         |  | [component]         |  | [component]         |          |
|   | Elysia route        |  | Elysia route        |  | Elysia route        |          |
|   +---------------------+  +---------------------+  +---------------------+          |
|                                                                                       |
|   +---------------------+  +---------------------+  +---------------------+          |
|   | onboarding-routes   |  | home-routes         |  | conversation-routes |          |
|   | [component]         |  | [component]         |  | [component]         |          |
|   | Elysia route (v1)   |  | Elysia route (v1)   |  | Elysia route (v1)   |          |
|   +---------------------+  +---------------------+  +---------------------+          |
|                                                                                       |
|   +---------------------+  +---------------------+  +---------------------+          |
|   | context-routes      |  | performance-routes  |  | agent-chat-routes   |          |
|   | [component]         |  | [component]         |  | [component]         |          |
|   | Elysia route (v1)   |  | Elysia route (v1)   |  | Elysia route        |          |
|   +---------------------+  +---------------------+  +---------------------+          |
|          |                       |                       |                             |
|          v                       v                       v                             |
|   +---------------------+  +---------------------+  +---------------------+          |
|   | import-service      |  | portfolio-service   |  | conversation-service|          |
|   | [component]         |  | [component]         |  | [component]         |          |
|   | TypeScript          |  | node-irr + toolkit  |  | TypeScript          |          |
|   +---------------------+  +---------------------+  +---------------------+          |
|                                                                                       |
|   +---------------------+  +---------------------+  +---------------------+          |
|   | ledger-service      |  | time-travel-service |  | context-service     |          |
|   | [component]         |  | [component]         |  | [component]         |          |
|   | TypeScript          |  | TypeScript          |  | TypeScript          |          |
|   +---------------------+  +---------------------+  +---------------------+          |
|                                                                                       |
|   +---------------------+  +---------------------+                                   |
|   | agent-client        |  | compliance-check    |                                   |
|   | [component]         |  | [component]         |                                   |
|   | HTTP fetch + SSE    |  | regex validation    |                                   |
|   +---------------------+  +---------------------+                                   |
|                                                                                       |
+=======================================================================================+
```

```
web-spa --[starts import / HTTPS + JSON]--> import-routes
web-spa --[loads portfolio + dashboard / HTTPS + JSON]--> portfolio-routes
web-spa --[requests time-travel report / HTTPS + JSON]--> time-travel-routes
web-spa --[onboarding flow / HTTPS + JSON]--> onboarding-routes
web-spa --[loads home scenario / HTTPS + JSON]--> home-routes
web-spa --[manages context / HTTPS + JSON]--> context-routes
web-spa --[loads performance data / HTTPS + JSON]--> performance-routes
web-spa --[AI chat / HTTPS + SSE]--> agent-chat-routes
web-spa --[conversation history / HTTPS + JSON]--> conversation-routes

import-routes --[imports entries / TypeScript]--> import-service
import-service --[appends ledger / TypeScript]--> ledger-service
ledger-service --[appends immutable entries / SQL]--> ledger-db

portfolio-routes --[computes metrics / TypeScript]--> portfolio-service
portfolio-service --[reads snapshots, prices, ledger / SQL]--> ledger-db

time-travel-routes --[creates report / TypeScript]--> time-travel-service
time-travel-service --[reads evidence, writes report / SQL]--> ledger-db
time-travel-service --[checks compliance / TypeScript]--> compliance-check

agent-chat-routes --[invokes agent / TypeScript]--> agent-client
agent-client --[streams analysis / HTTPS + SSE]--> agent-runtime

onboarding-routes --[manages onboarding / TypeScript]--> context-service
context-routes --[CRUD context / TypeScript]--> context-service
home-routes --[generates scenario / TypeScript]--> context-service
context-service --[reads and writes user context / SQL]--> ledger-db

conversation-routes --[manages conversations / TypeScript]--> conversation-service
conversation-service --[reads and writes conversations / SQL]--> ledger-db
```

## Components — agent-runtime

The Agent runtime is a standalone Node.js 22 HTTP server that implements the AWS Bedrock AgentCore contract (`GET /ping`, `POST /invocations`). It retrieves structured market data from OpenSearch Serverless and invokes Bedrock Nova Pro for grounded portfolio analysis.

```
+= agent-runtime : Stock Analysis Agent ============================================+
|                                                                                    |
|   +------------------------+  +------------------------+                          |
|   | http-server            |  | opensearch-client      |                          |
|   | [component]            |  | [component]            |                          |
|   | Node.js HTTP (port 8080)| | SigV4 signed requests  |                          |
|   +------------------------+  +------------------------+                          |
|                                                                                    |
|   +------------------------+  +------------------------+                          |
|   | bedrock-client         |  | prompt-builder         |                          |
|   | [component]            |  | [component]            |                          |
|   | AWS SDK ConverseStream |  | system + user prompts  |                          |
|   +------------------------+  +------------------------+                          |
|                                                                                    |
+====================================================================================+
```

```
ledger-api --[POST /invocations / HTTPS + JSON]--> http-server
http-server --[queries stock indices / TypeScript]--> opensearch-client
opensearch-client --[structured queries / SigV4 HTTPS]--> opensearch-serverless
http-server --[builds prompt context / TypeScript]--> prompt-builder
http-server --[invokes LLM / TypeScript]--> bedrock-client
bedrock-client --[ConverseStream / AWS SDK]--> bedrock
http-server --[streams SSE response / HTTPS]--> ledger-api
```

## Components — web-spa

The SPA has 5 pages with a tab-bar navigation and an onboarding guard.

| Page | Path | Description |
|------|------|-------------|
| OnboardingPage | `/onboarding` | Stock selection and quick entry for initial context |
| HomePage | `/` | Daily scenario greeting, attention items, action suggestions |
| PerformancePage | `/performance` | XIRR/TWR charts, holdings, benchmark comparison |
| AgentPage | `/agent` | AI chat interface with structured card responses |
| MyDataPage | `/my-data` | View/edit context: principles, memories, behaviors |

## Components — ledger-db (skipped: managed database)

## Components — opensearch-serverless

Hosts 8 CMoney-derived stock market indices used by the Agent runtime for structured queries:

| Index | Content |
|-------|---------|
| `stock-summary` | Company overview and fundamentals |
| `stock-price` | Historical price data |
| `stock-institutional` | Institutional (法人) trading data |
| `stock-returns` | Return metrics |
| `stock-momentum` | Technical momentum indicators |
| `stock-forum` | Social discussion sentiment |
| `stock-dividend` | Dividend history |
| `stock-industry` | Industry classification |

## Data Ingestion

Data ingestion is handled by `apps/agent/scripts/ingest-opensearch.ts` — a Bun script that parses CMoney CSV files and bulk-indexes them into OpenSearch Serverless. It is not a standalone container but a one-time operational script.

```
ingest-opensearch.ts --[reads CSV files / filesystem]--> cmoney (data/ directory)
ingest-opensearch.ts --[bulk indexes / SigV4 HTTPS]--> opensearch-serverless
```

## Element Registry

| id | kind | parent | label | technology | description |
| --- | --- | --- | --- | --- | --- |
| investor | person |  | Investor |  | Single demo user who imports a portfolio, views performance, and chats with AI agent. |
| ledger-book | softwaresystem |  | 投資搭檔 Ledger Book |  | Quantifies portfolio performance and provides non-advisory AI-powered portfolio insights. |
| cmoney | existingsystem |  | Authorized CMoney Data |  | Authorized historical price, chip, fundamental, and discussion evidence source. |
| aws-cloud | existingsystem |  | AWS Cloud Services |  | External managed cloud services (Bedrock, OpenSearch Serverless). |
| web-spa | spa | ledger-book | Browser SPA | Vue 3 + Vite + Vue Router | Onboarding, home scenario, performance dashboard, AI chat, and context management. |
| ledger-api | container | ledger-book | Ledger Book API | Bun + TypeScript + Elysia | Synchronous REST API, business orchestration, and agent proxy. |
| agent-runtime | container | ledger-book | Stock Analysis Agent | Node.js 22 + AWS SDK | AgentCore-compatible runtime: queries OpenSearch, invokes Bedrock Nova Pro, streams analysis. |
| ledger-db | database | ledger-book | Ledger Book Database | PostgreSQL 16 + Prisma | System of record for append-only ledger, user context, conversations, and report audit data. |
| contracts | library | ledger-book | Shared Type Contracts | TypeScript | Shared domain types and V1 AI-native contracts between web-spa and ledger-api. |
| bedrock | existingsystem | aws-cloud | Amazon Bedrock | Nova Pro v1 (ConverseStream) | Foundation model inference for grounded portfolio analysis. |
| opensearch-serverless | existingsystem | aws-cloud | OpenSearch Serverless | SEARCH type collection | Hosts structured stock market indices for Agent RAG queries. |
| import-service | component | ledger-api | Import Service | TypeScript | Parses CSV and creates immutable ledger entries via ledger-service. |
| ledger-service | component | ledger-api | Immutable Ledger Service | TypeScript | Appends entries with sequence numbers; creates reversals. |
| portfolio-service | component | ledger-api | Portfolio Service | TypeScript + node-irr + @railpath/finance-toolkit | Builds valuations, XIRR, TWR, and benchmark values from ledger data. |
| time-travel-service | component | ledger-api | Time-Travel Service | TypeScript | Creates date-scoped factual reports from evidence with compliance check. |
| context-service | component | ledger-api | Context Service | TypeScript | Manages user holdings, principles, memories, inferences, behaviors. |
| conversation-service | component | ledger-api | Conversation Service | TypeScript | Manages multi-turn AI conversation state and history. |
| agent-client | component | ledger-api | Agent Client | TypeScript + fetch | HTTP client that invokes agent-runtime and transforms SSE into V1 stream messages. |
| compliance-check | component | ledger-api | Compliance Check | TypeScript regex | Rejects investment-advice language (buy/sell/hold) in generated summaries. |

## Relationships

| source | target | label | technology |
| --- | --- | --- | --- |
| investor | ledger-book | imports ledger, views performance, chats with AI | HTTPS |
| ledger-book | cmoney | imports authorized historical evidence | controlled data transfer |
| ledger-book | aws-cloud | queries market data + generates analysis | SigV4 HTTPS + AWS SDK |
| investor | web-spa | uses | HTTPS |
| web-spa | ledger-api | calls APIs | HTTPS + JSON |
| ledger-api | ledger-db | reads and writes | SQL (Prisma) |
| ledger-api | agent-runtime | invokes analysis | HTTPS + SSE |
| agent-runtime | opensearch-serverless | queries structured market data | SigV4 HTTPS |
| agent-runtime | bedrock | generates grounded analysis | AWS SDK ConverseStream |
| contracts | web-spa | shared types | TypeScript import |
| contracts | ledger-api | shared types | TypeScript import |
| web-spa | import-routes | starts import | HTTPS + JSON |
| web-spa | portfolio-routes | loads portfolio and dashboard | HTTPS + JSON |
| web-spa | time-travel-routes | requests time-travel report | HTTPS + JSON |
| web-spa | onboarding-routes | onboarding flow | HTTPS + JSON |
| web-spa | home-routes | loads scenario | HTTPS + JSON |
| web-spa | context-routes | manages user context | HTTPS + JSON |
| web-spa | performance-routes | loads performance data | HTTPS + JSON |
| web-spa | agent-chat-routes | AI chat | HTTPS + SSE |
| web-spa | conversation-routes | conversation history | HTTPS + JSON |
| import-service | ledger-service | appends entries | TypeScript |
| ledger-service | ledger-db | appends immutable ledger | SQL |
| portfolio-service | ledger-db | reads snapshots, prices, ledger | SQL |
| time-travel-service | ledger-db | reads evidence, writes report | SQL |
| time-travel-service | compliance-check | validates summary | TypeScript |
| context-service | ledger-db | reads and writes user context | SQL |
| conversation-service | ledger-db | reads and writes conversations | SQL |
| agent-client | agent-runtime | streams analysis | HTTPS + SSE |

## Deployment (AWS `us-east-1`)

| Resource | Service | Notes |
|----------|---------|-------|
| Web SPA | CloudFront → S3 | Static site distribution |
| API | CloudFront → ALB → ECS Fargate | Bun container, VPC with private subnets |
| Database | RDS PostgreSQL (Aurora-compatible) | Private subnet, Prisma migrations |
| Agent Runtime | AWS Bedrock AgentCore | Code in S3, NODE_22 runtime |
| Search | OpenSearch Serverless (SEARCH) | 8 stock market indices |
| Agent Code | S3 | deployment_package.zip |
