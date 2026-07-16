/**
 * OpenSearch Service — structured queries for market data
 *
 * Queries the OpenSearch Serverless collection for:
 * - Social sentiment (stock-forum index)
 * - Dividend events (stock-dividend index)
 * - Benchmark returns (stock-price index for 0050)
 */

import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";

// ─── Configuration ──────────────────────────────────────────────────────────

const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT ?? "";
const REGION = process.env.AWS_REGION ?? "us-east-1";

const credentialProvider = defaultProvider();
const signer = new SignatureV4({
  service: "aoss",
  region: REGION,
  credentials: credentialProvider,
  sha256: Sha256,
});

// ─── Core Query ─────────────────────────────────────────────────────────────

interface OsHit {
  _source: Record<string, unknown>;
}

interface OsResult {
  hits: { hits: OsHit[] };
}

/** Extract source documents from an OpenSearch response */
function extractDocs(result: OsResult): Array<Record<string, unknown>> {
  return result.hits.hits.map((hit) => hit._source); // eslint-disable-line no-underscore-dangle
}

async function osQuery(path: string, body: object): Promise<OsResult> {
  if (!OPENSEARCH_ENDPOINT) {
    return { hits: { hits: [] } };
  }

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
    console.error(`[opensearch] ${res.status} ${path}: ${err.slice(0, 200)}`);
    return { hits: { hits: [] } };
  }
  return (await res.json()) as OsResult;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ForumSentiment {
  date: string;
  stockCode: string;
  stockName: string;
  postCount: number;
  posterCount: number;
  bullishPosts: number;
  bearishPosts: number;
  neutralPosts: number;
  replyCount: number;
}

export interface DividendEvent {
  stockCode: string;
  stockName: string;
  exDividendDate: string;
  cashDividend: number;
  yieldPercent: number;
}

export interface BenchmarkPricePoint {
  date: string;
  closePrice: number;
  changePercent: number;
}

export interface OpenSearchService {
  /** Get social sentiment for stocks on a specific date */
  getForumSentiment(stockCodes: string[], date: string): Promise<ForumSentiment[]>;
  /** Get forum sentiment for stocks over a date range */
  getForumSentimentRange(
    stockCodes: string[],
    fromDate: string,
    toDate: string,
  ): Promise<ForumSentiment[]>;
  /** Get dividend events for stocks */
  getDividendEvents(stockCodes: string[]): Promise<DividendEvent[]>;
  /** Get benchmark (0050) daily prices over a date range */
  getBenchmarkPrices(fromDate: string, toDate: string): Promise<BenchmarkPricePoint[]>;
  /** Check if OpenSearch is configured */
  isAvailable(): boolean;
}

export function createOpenSearchService(): OpenSearchService {
  return {
    isAvailable() {
      return OPENSEARCH_ENDPOINT.length > 0;
    },

    async getForumSentiment(stockCodes: string[], date: string): Promise<ForumSentiment[]> {
      // Date format in OpenSearch is basic_date (yyyyMMdd)
      const dateFormatted = date.replace(/-/g, "");
      const result = await osQuery("/stock-forum/_search", {
        query: {
          bool: {
            filter: [{ terms: { 股票代號: stockCodes } }, { term: { 日期: dateFormatted } }],
          },
        },
        size: stockCodes.length,
      });

      return extractDocs(result).map((doc) => ({
        date,
        stockCode: String(doc["股票代號"]),
        stockName: String(doc["股票名稱"]),
        postCount: Number(doc["發文則數"] ?? 0),
        posterCount: Number(doc["發文人數"] ?? 0),
        bullishPosts: Number(doc["看多發文"] ?? 0),
        bearishPosts: Number(doc["看空發文"] ?? 0),
        neutralPosts: Number(doc["中性發文"] ?? 0),
        replyCount: Number(doc["回文則數"] ?? 0),
      }));
    },

    async getForumSentimentRange(
      stockCodes: string[],
      fromDate: string,
      toDate: string,
    ): Promise<ForumSentiment[]> {
      const from = fromDate.replace(/-/g, "");
      const to = toDate.replace(/-/g, "");
      const result = await osQuery("/stock-forum/_search", {
        query: {
          bool: {
            filter: [
              { terms: { 股票代號: stockCodes } },
              { range: { 日期: { gte: from, lte: to } } },
            ],
          },
        },
        size: stockCodes.length * 30,
        sort: [{ 日期: { order: "desc" } }],
      });

      return extractDocs(result).map((doc) => {
        const rawDate = String(doc["日期"]);
        const formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
        return {
          date: formattedDate,
          stockCode: String(doc["股票代號"]),
          stockName: String(doc["股票名稱"]),
          postCount: Number(doc["發文則數"] ?? 0),
          posterCount: Number(doc["發文人數"] ?? 0),
          bullishPosts: Number(doc["看多發文"] ?? 0),
          bearishPosts: Number(doc["看空發文"] ?? 0),
          neutralPosts: Number(doc["中性發文"] ?? 0),
          replyCount: Number(doc["回文則數"] ?? 0),
        };
      });
    },

    async getDividendEvents(stockCodes: string[]): Promise<DividendEvent[]> {
      const result = await osQuery("/stock-dividend/_search", {
        query: {
          bool: {
            filter: [{ terms: { 股票代號: stockCodes } }],
          },
        },
        size: stockCodes.length,
      });

      return extractDocs(result)
        .filter((doc) => doc["除息日"] && String(doc["除息日"]).length > 0)
        .map((doc) => ({
          stockCode: String(doc["股票代號"]),
          stockName: String(doc["股票名稱"]),
          exDividendDate: String(doc["除息日"]),
          cashDividend: Number(doc["現金股利合計(元)"] ?? 0),
          yieldPercent: Number(doc["現金股利殖利率(%)"] ?? 0),
        }));
    },

    async getBenchmarkPrices(fromDate: string, toDate: string): Promise<BenchmarkPricePoint[]> {
      const from = fromDate.replace(/-/g, "");
      const to = toDate.replace(/-/g, "");
      const result = await osQuery("/stock-price/_search", {
        query: {
          bool: {
            filter: [{ term: { 股票代號: "0050" } }, { range: { 日期: { gte: from, lte: to } } }],
          },
        },
        size: 365,
        sort: [{ 日期: { order: "asc" } }],
      });

      return extractDocs(result).map((doc) => {
        const rawDate = String(doc["日期"]);
        const formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
        return {
          date: formattedDate,
          closePrice: Number(doc["收盤價"] ?? 0),
          changePercent: Number(doc["漲幅(%)"] ?? 0),
        };
      });
    },
  };
}
