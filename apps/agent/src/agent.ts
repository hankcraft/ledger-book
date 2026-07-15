/**
 * CMoney 持股分析 Agent — Node.js / TypeScript
 *
 * AgentCore Runtime contract:
 *   GET  /ping         → { status: "Healthy" }
 *   POST /invocations  → { result: "..." }
 *
 * Data retrieval: OpenSearch structured queries (replaces Bedrock KB).
 * Generation: Amazon Bedrock Nova Pro via Converse API.
 */

import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";
import http from "node:http";

// ─── Configuration ──────────────────────────────────────────────────────────

const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT ?? "";
const REGION = process.env.AWS_REGION ?? "us-east-1";
const MODEL_ID = "amazon.nova-pro-v1:0";
const PORT = 8080;

// ─── AWS Clients ────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: REGION });
const credentialProvider = defaultProvider();
const signer = new SignatureV4({
  service: "aoss",
  region: REGION,
  credentials: credentialProvider,
  sha256: Sha256,
});

// ─── OpenSearch Signed Requests ─────────────────────────────────────────────

async function osQuery(path: string, body: object): Promise<unknown> {
  const url = new URL(path, OPENSEARCH_ENDPOINT);
  const request = new HttpRequest({
    method: "POST",
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      host: url.hostname,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const signed = await signer.sign(request);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: signed.headers as Record<string, string>,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[os-query] ${res.status} ${path}: ${err.slice(0, 200)}`);
    return { hits: { hits: [] } };
  }
  return res.json();
}

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是 CMoney 的 AI 持股分析助手。你的任務是理解使用者的真實持股組合，並從中產生個人化的投資洞察——讓使用者覺得「這個 App 比別的更懂我」。

## 時間基準
所有資料以 2025 年 12 月 31 日為「現在」。使用者的持股與提問皆設定在此時點。

## 你需要做到的六件事
1. **投資風格判斷** — 追高？存股？賺價差？（根據報酬率、殖利率、估值）
2. **資產配置分析** — 產業集中度、市值分佈
3. **集中風險** — 單一個股壓注比例
4. **投資習慣** — 進場時機、持有週期（根據距高低點、還原報酬）
5. **常見錯誤** — 越攤越平、賺小賠大（成本 × 現價 × 區間）
6. **決策焦慮** — 現在最想問的問題（法人動向、社群情緒）

## 回應風格
- 使用繁體中文
- 語氣專業但親切，像一位懂你的投資夥伴
- 用具體數據支持每個觀點
- 主動提出使用者可能沒想到的洞察
- 在適當時候追問使用者的成本、買進日期等資訊以提供更深度分析

## 重要提醒
- 不提供投資建議或買賣推薦
- 僅做分析和觀察，讓使用者自己做決策
- 如果資料不足以判斷，誠實說明

## 可用資料
你有完整的 2025 全年逐日數據：行情估值、法人買賣超、報酬率、動能技術面、社群情緒。
也有靜態資料：股利配息、連續配息年數、產業分類。
回答時請引用具體數字。`;

// ─── Stock Code Extraction ──────────────────────────────────────────────────

function extractStockCodes(text: string): string[] {
  // Match 4-6 digit stock codes (e.g. 2330, 00878, 006208)
  const matches = text.match(/\b(0{0,2}\d{4,6}[A-Z]?)\b/g) ?? [];
  // Deduplicate
  return [...new Set(matches)];
}

// ─── OpenSearch Data Retrieval ──────────────────────────────────────────────

interface OsHit {
  _source: Record<string, unknown>;
}

interface OsResult {
  hits: { hits: OsHit[] };
}

async function queryStockData(stockCodes: string[]): Promise<string> {
  if (stockCodes.length === 0) {
    return "未偵測到股票代號。請提供持股的股票代號（如 2330、0050）。";
  }

  const filter = { terms: { 股票代號: stockCodes } };
  const latestDateSort = [{ 日期: { order: "desc" as const } }];

  // Parallel queries across indices
  const [summary, priceRecent, institutional, returns, momentum, forum, dividend, industry] =
    await Promise.all([
      // Summary (one row per stock)
      osQuery("/stock-summary/_search", {
        query: { bool: { filter: [filter] } },
        size: stockCodes.length,
      }) as Promise<OsResult>,

      // Latest 5 days price
      osQuery("/stock-price/_search", {
        query: { bool: { filter: [filter] } },
        size: stockCodes.length * 5,
        sort: latestDateSort,
      }) as Promise<OsResult>,

      // Latest 20 days institutional
      osQuery("/stock-institutional/_search", {
        query: { bool: { filter: [filter] } },
        size: stockCodes.length * 20,
        sort: latestDateSort,
      }) as Promise<OsResult>,

      // Latest 5 days returns
      osQuery("/stock-returns/_search", {
        query: { bool: { filter: [filter] } },
        size: stockCodes.length * 5,
        sort: latestDateSort,
      }) as Promise<OsResult>,

      // Latest 5 days momentum
      osQuery("/stock-momentum/_search", {
        query: { bool: { filter: [filter] } },
        size: stockCodes.length * 5,
        sort: latestDateSort,
      }) as Promise<OsResult>,

      // Latest 10 days forum
      osQuery("/stock-forum/_search", {
        query: { bool: { filter: [filter] } },
        size: stockCodes.length * 10,
        sort: latestDateSort,
      }) as Promise<OsResult>,

      // Dividend (static)
      osQuery("/stock-dividend/_search", {
        query: { bool: { filter: [filter] } },
        size: stockCodes.length,
      }) as Promise<OsResult>,

      // Industry (static)
      osQuery("/stock-industry/_search", {
        query: { bool: { filter: [filter] } },
        size: stockCodes.length,
      }) as Promise<OsResult>,
    ]);

  // Format results into structured context
  const sections: string[] = [];

  // Summary
  const summaryHits = summary.hits.hits.map((h) => h._source);
  if (summaryHits.length > 0) {
    sections.push("## 個股總覽（2025年底快照）");
    for (const s of summaryHits) {
      sections.push(
        `### ${s["股票代號"]} ${s["股票名稱"]} (${s["產業"]})`,
        `收盤價: ${s["收盤價"]}元 | 總市值: ${s["總市值(億)"]}億 | 本益比: ${s["本益比(近四季)"]} | PB: ${s["股價淨值比"]}`,
        `年報酬: ${s["年報酬(%)"]}% | 季報酬: ${s["季報酬(%)"]}% | 殖利率: ${s["殖利率(%)"]}% | 買點分位: ${s["買點分位(%)"]}%`,
        `法人近20日買賣超: ${s["近20日法人買賣超"]}張 | 外資持股: ${s["外資持股率(%)"]}% | 法人持股: ${s["法人持股率(%)"]}%`,
        `連續配息: ${s["連續配息年數"]}年 | 今年新高: ${s["今年新高"]} | 今年新低: ${s["今年新低"]} | 創歷史新高: ${s["創歷史新高"] === 1 ? "是" : "否"}`,
        "",
      );
    }
  }

  // Recent price action
  const priceHits = priceRecent.hits.hits.map((h) => h._source);
  if (priceHits.length > 0) {
    sections.push("## 近期行情（最近5日）");
    for (const code of stockCodes) {
      const rows = priceHits.filter((h) => h["股票代號"] === code);
      if (rows.length === 0) continue;
      sections.push(`### ${code}`);
      for (const r of rows) {
        sections.push(
          `${r["日期"]} | 開${r["開盤價"]} 高${r["最高價"]} 低${r["最低價"]} 收${r["收盤價"]} | 漲跌${r["漲跌"]} (${r["漲幅(%)"]}%) | 量${r["成交量"]}`,
        );
      }
      sections.push("");
    }
  }

  // Institutional trading
  const instHits = institutional.hits.hits.map((h) => h._source);
  if (instHits.length > 0) {
    sections.push("## 法人買賣超（最近20日）");
    for (const code of stockCodes) {
      const rows = instHits.filter((h) => h["股票代號"] === code);
      if (rows.length === 0) continue;
      sections.push(`### ${code}`);
      for (const r of rows.slice(0, 10)) {
        sections.push(
          `${r["日期"]} | 外資${r["外資買賣超"]} 投信${r["投信買賣超"]} 自營${r["自營商買賣超"]} 合計${r["買賣超合計"]} | 外資持股率${r["外資持股比率(%)"]}%`,
        );
      }
      if (rows.length > 10) sections.push(`  ...及更早 ${rows.length - 10} 天`);
      sections.push("");
    }
  }

  // Returns
  const returnHits = returns.hits.hits.map((h) => h._source);
  if (returnHits.length > 0) {
    sections.push("## 報酬率（最新）");
    for (const code of stockCodes) {
      const rows = returnHits.filter((h) => h["股票代號"] === code);
      if (rows.length === 0) continue;
      const latest = rows[0]!;
      sections.push(
        `${code}: 日${latest["日報酬率(%)"]}% | 週${latest["週報酬率(%)"]}% | 月${latest["月報酬率(%)"]}% | 季${latest["季報酬率(%)"]}% | 年${latest["年報酬率(%)"]}% | 殖利率${latest["殖利率(%)"]}%`,
      );
    }
    sections.push("");
  }

  // Momentum
  const momentumHits = momentum.hits.hits.map((h) => h._source);
  if (momentumHits.length > 0) {
    sections.push("## 技術動能（最新）");
    for (const code of stockCodes) {
      const rows = momentumHits.filter((h) => h["股票代號"] === code);
      if (rows.length === 0) continue;
      const latest = rows[0]!;
      sections.push(
        `${code}: 今年漲跌${latest["今年以來漲跌幅%"]}% | 近5日${latest["近5日漲跌幅%"]}% | 近20日${latest["近20日漲跌幅%"]}% | 乖離年線${latest["股價乖離年線(%)"]}% | 創新高${latest["股價創歷史新高"] === 1 ? "是" : "否"} | 連漲${latest["股價連N日漲"]}日`,
      );
    }
    sections.push("");
  }

  // Forum sentiment
  const forumHits = forum.hits.hits.map((h) => h._source);
  if (forumHits.length > 0) {
    sections.push("## 社群情緒（同學會近10日）");
    for (const code of stockCodes) {
      const rows = forumHits.filter((h) => h["股票代號"] === code);
      if (rows.length === 0) continue;
      sections.push(`### ${code}`);
      for (const r of rows.slice(0, 5)) {
        sections.push(
          `${r["日期"]} | 發文${r["發文則數"]}則(${r["發文人數"]}人) | 看多${r["看多發文"]} 看空${r["看空發文"]} 中性${r["中性發文"]} | 回文${r["回文則數"]}則`,
        );
      }
      sections.push("");
    }
  }

  // Industry
  const industryHits = industry.hits.hits.map((h) => h._source);
  if (industryHits.length > 0) {
    sections.push("## 產業分類");
    for (const r of industryHits) {
      sections.push(
        `${r["股票代號"]} ${r["股票名稱"]}: ${r["主產業"]}${r["全部產業標籤"] ? ` (${r["全部產業標籤"]})` : ""}`,
      );
    }
    sections.push("");
  }

  // Dividend
  const dividendHits = dividend.hits.hits.map((h) => h._source);
  if (dividendHits.length > 0) {
    sections.push("## 股利配息（2025年度）");
    for (const r of dividendHits) {
      sections.push(
        `${r["股票代號"]} ${r["股票名稱"]}: 現金股利${r["現金股利合計(元)"]}元 | 殖利率${r["現金股利殖利率(%)"]}% | 發放率${r["股利發放率(%)"]}% | 除息日${r["除息日"] || "未定"}`,
      );
    }
    sections.push("");
  }

  if (sections.length === 0) {
    return `未找到以下股票代號的資料：${stockCodes.join(", ")}。請確認是否在 300 檔示範籃子中。`;
  }

  return sections.join("\n");
}

// ─── Model Invocation (Streaming) ───────────────────────────────────────────

async function* invokeModelStream(
  prompt: string,
  context: string,
): AsyncGenerator<string, void, unknown> {
  const response = await bedrockClient.send(
    new ConverseStreamCommand({
      modelId: MODEL_ID,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: [
            {
              text: `以下是從資料庫查詢到的精確數據：\n\n${context}\n\n---\n\n使用者問題：${prompt}`,
            },
          ],
        },
      ],
      inferenceConfig: { maxTokens: 2048, temperature: 0.4 },
    }),
  );

  const stream = response.stream;
  if (!stream) {
    yield "無法生成回應";
    return;
  }

  for await (const event of stream) {
    if (event.contentBlockDelta?.delta && "text" in event.contentBlockDelta.delta) {
      const text = event.contentBlockDelta.delta.text;
      if (text) yield text;
    }
  }
}

// ─── Request Handler (Streaming SSE) ────────────────────────────────────────

async function handleStreamInvocation(body: string, res: http.ServerResponse): Promise<void> {
  let prompt: string;
  try {
    const payload = JSON.parse(body);
    prompt = payload.prompt ?? payload.message ?? JSON.stringify(payload);
  } catch {
    prompt = body || "Hello";
  }

  console.log(`[invoke] prompt: ${prompt.slice(0, 100)}...`);

  const stockCodes = extractStockCodes(prompt);
  console.log(`[invoke] detected stocks: ${stockCodes.join(", ") || "(none)"}`);

  const context = await queryStockData(stockCodes);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  for await (const chunk of invokeModelStream(prompt, context)) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
}

// ─── HTTP Server (AgentCore Contract) ───────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === "/ping" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "Healthy" }));
    return;
  }

  // Streaming invocations
  if (req.url === "/invocations" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        await handleStreamInvocation(body, res);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[error] ${message}`);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        } else {
          res.end();
        }
      }
    });
    return;
  }

  // Fallback
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CMoney Stock Insights Agent listening on port ${PORT}`);
  console.log(`  OpenSearch: ${OPENSEARCH_ENDPOINT || "(not configured)"}`);
  console.log(`  Region: ${REGION}`);
});
