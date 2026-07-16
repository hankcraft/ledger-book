# 投資搭檔

> 中長期投資人的「決策守護者」——自動化量化真實績效，結合 AI 客觀質化分析，讓你冷靜面對市場波動。

## 專案簡介

投資搭檔解決中長期投資人的「決策焦慮」。透過一鍵匯入持股，即時產出 XIRR / TWR 績效指標與大盤對比，並由 AI Agent 統整法人籌碼與社群輿情，產出客觀降噪報告——嚴格不提供任何買賣建議。

### 核心功能

- **零摩擦庫存匯入** — 一鍵匯入 CSV 對帳單，3 秒內看到績效
- **雙重量化指標** — XIRR（真實資金成長率）+ TWR（選股能力，直接對比大盤）
- **AI 時間回溯分析** — 點擊圖表任一日期，取得該時點的客觀籌碼與社群情緒摘要
- **視覺化情緒暗示** — 以紅/綠色彩呈現多空情緒，不以文字給出買賣建議

## 技術架構

| 層級 | 技術 | 說明 |
|------|------|------|
| Frontend | Vue 3 + Vite | SPA，支援 ECharts 圖表 |
| Backend API | Elysia.js + Bun | TypeScript 型別安全 REST API |
| Database | PostgreSQL + Prisma ORM | Append-only 不可變帳本 |
| Cache | Redis | 市場數據快取（未來） |
| AI Agent | AWS Bedrock + AgentCore | 質化事實統整，籌碼與社群分析 |
| Infrastructure | Terraform + AWS (CloudFront, App Runner, Aurora, S3) | 雲原生部署 |

### Monorepo 結構

```
├── apps/
│   ├── web/        # @ledger-book/web — Vue 3 SPA
│   ├── api/        # @ledger-book/api — Elysia.js API
│   └── agent/      # @ledger-book/agent — AWS AgentCore Runtime
├── packages/
│   └── contracts/  # @ledger-book/contracts — 共用型別
├── infra/
│   └── terraform/  # AWS 基礎建設
├── data/           # CMoney Hackathon 資料集
└── docs/           # 設計文件、架構圖、部署指南
```

## 快速開始

### 前置需求

- [Bun](https://bun.sh/) >= 1.x
- [Docker](https://docs.docker.com/get-docker/) >= 24.x

### 安裝與啟動

```sh
# 1. 啟動 PostgreSQL + Redis
docker compose up -d

# 2. 安裝依賴
bun install

# 3. 初始化資料庫
cd apps/api && bun run db:push && cd ../..

# 4. 啟動開發伺服器（API + Web 同時啟動）
bun run dev
```

API: `http://localhost:3000`  
Web: `http://localhost:5173`（Vite dev server，自動 proxy `/api` 至 API）

### 環境變數

複製 `.env.example` 為 `.env` 並填入設定：

```sh
cp .env.example .env
```

## 常用指令

| 指令 | 用途 |
|------|------|
| `bun run dev` | 同時啟動 API + Web + Agent |
| `bun run build` | 型別檢查並建置所有 workspace |
| `bun run test` | 執行 API 與計算測試 |
| `bun run typecheck` | 檢查所有 workspace 型別 |
| `bun run lint` | 執行 oxlint |
| `bun run format:check` | 檢查格式 |
| `bun run deploy` | 一鍵部署（Terraform + Docker + S3） |
| `bun run c4:view` | 瀏覽 C4 架構圖 |

### 資料庫指令

```sh
bun run db:push       # 套用 Prisma schema（開發用）
bun run db:migrate    # 建立並套用 migration
bun run db:generate   # 重新產生 Prisma client
bun run db:studio     # 開啟 Prisma Studio GUI
```

## 部署

詳見 [docs/DEPLOY.md](docs/DEPLOY.md)。

部署目標為 AWS `ap-northeast-1`，架構包含：
- CloudFront → S3（前端 SPA）
- CloudFront → App Runner（API，含 VPC Connector 連接 Aurora）
- Aurora PostgreSQL Serverless v2
- OpenSearch Serverless（Agent RAG）

```sh
bun run deploy:init   # 首次初始化 Terraform
bun run deploy        # 完整部署
bun run deploy:web    # 僅部署前端
bun run deploy:api    # 僅部署 API
```

## 文件

- [docs/spec.md](docs/spec.md) — 專案規格書
- [docs/DESIGN.md](docs/DESIGN.md) — 設計系統
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — 開發指南
- [docs/DEPLOY.md](docs/DEPLOY.md) — 部署指南
- [docs/ai-native.md](docs/ai-native.md) — AI Native 設計
- [docs/architecture/c4-model.md](docs/architecture/c4-model.md) — C4 架構模型

## 法遵聲明

本系統嚴格遵守台灣投顧法規：
- AI 僅產出客觀事實統整，**絕不提供買進/賣出/持有建議**
- 情緒分析以視覺色彩呈現，不以文字指引交易行為

## License

Private — CMoney × AWS AI Hackathon 2026
