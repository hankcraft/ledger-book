# CMoney 持股分析 Agent — 開發者文件

## 架構總覽

```
┌─────────────────────────────────────────────────────────────────────┐
│                         使用者輸入持股                                │
│         (股票代號 / 成本 / 股數 / 買進日期)                           │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AgentCore Runtime (NODE_22, Code Deployment)            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  agent.js (bun build bundle from src/agent.ts)                 │  │
│  │  ├─ handleInvocation(body)                                     │  │
│  │  │    ├─ extractStockCodes(prompt)                             │  │
│  │  │    ├─ queryStockData(codes) ─────────────────┐              │  │
│  │  │    └─ invokeModel(prompt, context) ─────┐    │              │  │
│  │  └─ http.createServer (port 8080)          │    │              │  │
│  │      GET  /ping         → Health check     │    │              │  │
│  │      POST /invocations  → Main handler     │    │              │  │
│  └────────────────────────────────────────────┼────┼──────────────┘  │
└───────────────────────────────────────────────┼────┼────────────────┘
                                                │    │
                    ┌───────────────────────────┘    │
                    ▼                                ▼
┌──────────────────────────────┐  ┌─────────────────────────────────┐
│   Amazon Bedrock              │  │  OpenSearch Serverless (AOSS)    │
│   Nova Pro (FM)               │  │  ├─ stock-price (72K docs)      │
│   - converse API              │  │  ├─ stock-institutional (72K)   │
│   - 生成個人化分析             │  │  ├─ stock-returns (72K)         │
└──────────────────────────────┘  │  ├─ stock-momentum (64K)        │
                                   │  ├─ stock-forum (106K)          │
                                   │  ├─ stock-dividend (290)        │
                                   │  ├─ stock-consecutive-dividend  │
                                   │  ├─ stock-industry (301)        │
                                   │  └─ stock-summary (300)         │
                                   └─────────────────────────────────┘
```

**查詢方式**: 精確結構化查詢（filter by 股票代號 + 日期 range）
**部署方式**: bun build → zip (~1MB) → S3 → AgentCore NODE_22 Code Deployment
**冷啟動**: < 1 秒

---

## 快速開始

### 前置需求

- AWS CLI v2 已設定
- Bun 1.3+（monorepo 管理與建置）
- 帳號 Region: `us-east-1`
- OpenSearch Serverless collection endpoint

### 安裝依賴

```bash
bun install
```

### 匯入資料到 OpenSearch

```bash
# 全量匯入（~388K docs, 預計 2-5 分鐘）
OPENSEARCH_ENDPOINT=https://xxx.us-east-1.aoss.amazonaws.com \
  bun run --filter '@ledger-book/agent' ingest

# 先 dry-run 確認解析正確
OPENSEARCH_ENDPOINT=https://xxx.us-east-1.aoss.amazonaws.com \
  bun apps/agent/scripts/ingest-opensearch.ts --dry-run
```

### 本地開發

```bash
# 從 monorepo 根目錄
OPENSEARCH_ENDPOINT=https://xxx.us-east-1.aoss.amazonaws.com \
  bun run agent:dev
```

測試：

```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "我持有台積電 2330 十張、鴻海 2317 二十張，分析我的投資組合"}'
```

### Invoke AgentCore Agent

```bash
PAYLOAD=$(echo -n '{"prompt": "我持有台積電 2330 十張、鴻海 2317 二十張，分析產業集中度"}' | base64 -w 0)

aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A" \
  --qualifier "DEFAULT" \
  --payload "$PAYLOAD" \
  --region us-east-1 \
  /tmp/response.json

cat /tmp/response.json | python3 -m json.tool
```

---

## 資料架構

### OpenSearch Indices

| Index | 來源 CSV | 行數 | 說明 |
|-------|---------|------|------|
| `stock-price` | 01_Price_Valuation | 72K | 逐日行情（開高低收、成交量、本益比） |
| `stock-institutional` | 02_Institutional_Trading | 72K | 逐日法人買賣超、持股比率 |
| `stock-returns` | 03_Return_Rate | 72K | 逐日報酬率（日/週/月/季/年） |
| `stock-momentum` | 04_Distance_from_High_Low | 64K | 逐日動能（乖離、創新高、漲跌幅） |
| `stock-forum` | 10_Forum_Posts_Replies | 106K | 同學會逐日統計（多空情緒） |
| `stock-dividend` | 05_Dividend_Ex_Dividend | 290 | 2025 年度股利 |
| `stock-consecutive-dividend` | 06 + 06b | 302 | 連續配息年數 |
| `stock-industry` | 07_Industry_Classification | 301 | 產業分類 |
| `stock-summary` | 09_Wide_Table_Summary | 300 | 每股一列快照 |

### 查詢模式

Agent 從使用者 prompt 中提取股票代號（regex），然後用 OpenSearch `bool.filter` + `terms` 做精確查詢：

```typescript
// 範例：查詢 2330, 2317 的近期法人買賣超
{
  "query": {
    "bool": {
      "filter": [
        { "terms": { "股票代號": ["2330", "2317"] } }
      ]
    }
  },
  "sort": [{ "日期": "desc" }],
  "size": 40
}
```

**優勢**：
- 精確查到「這檔股票」的「這些日期」的「這些欄位」
- 零語意模糊（不會把「鴻海」的資料混入「鴻準」）
- 支援時序分析（法人連續 N 天買超、動能趨勢）
- 全部 388K rows 可用（不再只有 300 row 快照）

---

## 專案結構（Bun Monorepo）

```
ledger-book-poc/
├── apps/
│   ├── agent/                     # ⭐ AgentCore Agent
│   │   ├── src/
│   │   │   ├── agent.ts          # Agent 主程式（OpenSearch + Bedrock）
│   │   │   └── opensearch-mappings.ts  # Index mappings 定義
│   │   ├── scripts/
│   │   │   ├── ingest-opensearch.ts    # CSV → OpenSearch 匯入
│   │   │   └── deploy.mjs        # 部署腳本
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api/                       # Elysia REST API
│   └── web/                       # Vue 前端
├── data/
│   ├── Delivery_Hackathon_DataPackage_20260624/  # CMoney 原始 CSV
│   │   ├── 01_Price_Valuation_2025.csv
│   │   ├── 02_Institutional_Trading_2025.csv
│   │   ├── ...
│   │   └── 10_Forum_Posts_Replies_Daily_Stats_2025.csv
│   └── kb-docs/                   # PDF 參考文件
├── scripts/
│   └── deploy-agent.sh
├── docs/
│   └── agent/
│       ├── DEVELOPER_GUIDE.md
│       └── INTEGRATION_GUIDE.md
├── package.json
├── tsconfig.base.json
└── bun.lock
```

---

## Agent 開發指南

### 查詢邏輯（src/agent.ts）

```
1. 收到 prompt
2. extractStockCodes() → regex 提取 4-6 位代號
3. queryStockData() → 8 個 OpenSearch 並行查詢
4. 格式化為結構化 context 文本
5. invokeModel() → Bedrock Nova Pro 生成分析
6. 返回 JSON { result }
```

### 修改 Agent

1. 編輯 `apps/agent/src/agent.ts`
2. 驗證：
   ```bash
   bun run typecheck
   bun run agent:build
   ```
3. 部署：
   ```bash
   bun run agent:deploy
   ```

### 新增 Index / 欄位

1. 編輯 `apps/agent/src/opensearch-mappings.ts`
2. 重新執行 ingestion：
   ```bash
   OPENSEARCH_ENDPOINT=https://xxx.aoss.amazonaws.com bun run --filter '@ledger-book/agent' ingest
   ```
3. 在 `agent.ts` 的 `queryStockData()` 加入新查詢

---

## Monorepo 指令參考

| 指令 | 說明 |
|------|------|
| `bun run agent:dev` | 啟動 agent 本地開發 server（port 8080） |
| `bun run agent:build` | Bundle agent 為 `apps/agent/dist/agent.js` |
| `bun run agent:deploy` | Build + zip + 上傳 S3 + 更新 AgentCore |
| `bun run --filter '@ledger-book/agent' ingest` | 匯入 CSV 到 OpenSearch |
| `bun run typecheck` | 全 monorepo type check |
| `bun run build` | 全 monorepo build |

---

## 環境變數

| 變數 | 說明 | 預設 |
|------|------|------|
| `OPENSEARCH_ENDPOINT` | OpenSearch Serverless endpoint URL | (必填) |
| `AWS_REGION` | AWS Region | `us-east-1` |

AgentCore Runtime 需在部署時將 `OPENSEARCH_ENDPOINT` 設為環境變數，或寫入 agent.ts 常數。

---

## 資源清單

| 資源類型 | 名稱 / ID | 用途 |
|---------|-----------|------|
| S3 Bucket | `bedrock-agentcore-code-414208189972-us-east-1` | Agent 部署包 |
| OpenSearch Serverless | `cmoney-kb-vectors` (3u3wi3ls4y9qbiwuxtqi) | 結構化數據儲存 |
| AgentCore Runtime | `cmoney_stock_node-J4sKEEDt4A` | Agent 運行時 (NODE_22) |
| AgentCore Endpoint | `cmoney_node_ep` | 對外服務端點 |

### IAM Roles

| Role | 用途 |
|------|------|
| `AgentCoreRuntime_cmoney-stock-insights` | Agent 執行（Bedrock、AOSS、S3） |

---

## 成本估算

| 服務 | 計費方式 | 預估月成本 (低用量) |
|------|---------|-------------------|
| OpenSearch Serverless | OCU-hours | ~$350/月 (最低 2 OCU) |
| Bedrock Nova Pro | Input/Output tokens | ~$5-20/月 |
| AgentCore Runtime | Code 執行時間 | 按需（idle timeout 後停止） |
| S3 | 儲存 + PUT/GET | < $1/月 |

> ⚠️ OpenSearch Serverless 有最低 2 OCU 常駐成本。Hackathon 結束後記得刪除 collection。

---

## 清理資源

```bash
# 停止 AgentCore Runtime
aws bedrock-agentcore-control delete-agent-runtime-endpoint \
  --agent-runtime-id cmoney_stock_node-J4sKEEDt4A \
  --endpoint-name cmoney_node_ep --region us-east-1

aws bedrock-agentcore-control delete-agent-runtime \
  --agent-runtime-id cmoney_stock_node-J4sKEEDt4A --region us-east-1

# 刪除 OpenSearch Serverless（停止計費）
aws opensearchserverless delete-collection \
  --id 3u3wi3ls4y9qbiwuxtqi --region us-east-1

# 刪除 S3 bucket
aws s3 rb s3://bedrock-agentcore-code-414208189972-us-east-1 --force

# 刪除 IAM Role
aws iam delete-role-policy --role-name AgentCoreRuntime_cmoney-stock-insights --policy-name AgentCoreRuntimePolicy
aws iam delete-role --role-name AgentCoreRuntime_cmoney-stock-insights
```

---

## 技術決策紀錄

| 決策 | 選項 | 選擇 | 原因 |
|------|------|------|------|
| 資料檢索 | Bedrock KB (向量) / OpenSearch (結構化) | **OpenSearch 精確查詢** | 數據本質是結構化的；精確查詢零模糊；可用全部 388K rows 而非 300 row 快照 |
| Vector Store | 保留 / 移除 | **移除 KB** | 不再需要語意搜索；同一 AOSS 做結構化查詢更有效 |
| FM | Claude / Nova Pro / Llama | Nova Pro | 帳號可用、中文品質好、成本低 |
| 部署方式 | Code Deploy / Container | **Code Deploy (NODE_22)** | 冷啟動 < 1s、部署包小 |
| Build 工具 | esbuild / bun build | **bun build** | Monorepo 統一工具 |
| 資料匯入 | Python / TypeScript | **TypeScript (Bun)** | 統一語言、共用 mapping 定義 |

---

*最後更新: 2026-07-14*
