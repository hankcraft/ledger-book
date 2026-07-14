#!/usr/bin/env bun
/**
 * Ingest CMoney CSV data into OpenSearch.
 *
 * Usage:
 *   bun apps/agent/scripts/ingest-opensearch.ts [--endpoint URL] [--data-dir PATH]
 *
 * Env:
 *   OPENSEARCH_ENDPOINT  - OpenSearch Serverless endpoint (https://...)
 *   AWS_REGION           - Default: us-east-1
 *
 * This script:
 *   1. Creates indices with mappings (or skips if exist)
 *   2. Parses each CSV and bulk-indexes into the appropriate index
 *   3. Reports row counts and timing
 */

import { parseArgs } from "node:util";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { INDEX_MAPPINGS, CSV_TO_INDEX } from "../src/opensearch-mappings.ts";

// ─── CLI Args ───────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    endpoint: { type: "string", default: process.env.OPENSEARCH_ENDPOINT ?? "" },
    "data-dir": {
      type: "string",
      default: resolve(
        import.meta.dirname,
        "../../../data/Delivery_Hackathon_DataPackage_20260624",
      ),
    },
    region: { type: "string", default: process.env.AWS_REGION ?? "us-east-1" },
    "batch-size": { type: "string", default: "500" },
    "dry-run": { type: "boolean", default: false },
  },
});

const ENDPOINT = values.endpoint;
const DATA_DIR = values["data-dir"]!;
const REGION = values.region!;
const BATCH_SIZE = parseInt(values["batch-size"]!, 10);
const DRY_RUN = values["dry-run"]!;

if (!ENDPOINT) {
  console.error("Error: OPENSEARCH_ENDPOINT env or --endpoint flag required.");
  console.error("Example: OPENSEARCH_ENDPOINT=https://xxx.us-east-1.aoss.amazonaws.com bun ...");
  process.exit(1);
}

// ─── AWS SigV4 Signing ──────────────────────────────────────────────────────

import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";

const credentialProvider = defaultProvider();
const signer = new SignatureV4({
  service: "aoss",
  region: REGION,
  credentials: credentialProvider,
  sha256: Sha256,
});

async function signedFetch(path: string, method: string, body?: string): Promise<Response> {
  const url = new URL(path, ENDPOINT);

  const request = new HttpRequest({
    method,
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      host: url.hostname,
      "content-type": "application/json",
    },
    body: body ?? undefined,
  });

  const signed = await signer.sign(request);

  return fetch(url.toString(), {
    method,
    headers: signed.headers as Record<string, string>,
    body: body ?? undefined,
  });
}

// ─── CSV Parser ─────────────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Remove BOM
  const headerLine = lines[0]!.replace(/^\uFEFF/, "");
  const headers = headerLine.split(",").map((h) => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = (cells[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

// ─── Type Coercion ──────────────────────────────────────────────────────────

type MappingProps = Record<string, { type: string }>;

function coerceRow(
  row: Record<string, string>,
  properties: MappingProps,
): Record<string, unknown> | null {
  const doc: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(row)) {
    if (!(field in properties)) continue;
    const fieldType = properties[field]!.type;

    if (!value && value !== "0") {
      // Skip empty fields
      continue;
    }

    switch (fieldType) {
      case "float": {
        const n = parseFloat(value);
        if (!Number.isNaN(n)) doc[field] = n;
        break;
      }
      case "long":
      case "integer":
      case "byte": {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n)) doc[field] = n;
        break;
      }
      case "date": {
        // Normalize: 2025-01-02 → 20250102, 2025/01/02 → 20250102
        doc[field] = value.replace(/[-/]/g, "");
        break;
      }
      case "keyword":
      case "text":
      default:
        doc[field] = value;
    }
  }

  // Must have 股票代號
  if (!doc["股票代號"]) return null;
  return doc;
}

// ─── Index Management ───────────────────────────────────────────────────────

async function createIndex(indexName: string, config: { mappings: unknown; settings: unknown }) {
  const res = await signedFetch(
    `/${indexName}`,
    "PUT",
    JSON.stringify({
      mappings: config.mappings,
      settings: config.settings,
    }),
  );

  if (res.status === 200) {
    console.log(`  ✅ Created index: ${indexName}`);
  } else if (res.status === 400) {
    const body = await res.text();
    if (body.includes("already_exists") || body.includes("resource_already_exists")) {
      console.log(`  ⏭️  Index already exists: ${indexName}`);
    } else {
      console.error(`  ❌ Failed to create ${indexName}: ${body}`);
    }
  } else {
    console.error(`  ❌ Unexpected ${res.status} creating ${indexName}: ${await res.text()}`);
  }
}

// ─── Bulk Indexing ──────────────────────────────────────────────────────────

async function bulkIndex(indexName: string, docs: Record<string, unknown>[]): Promise<number> {
  let indexed = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const ndjson =
      batch
        .map((doc) => {
          const action = JSON.stringify({ index: { _index: indexName } });
          const source = JSON.stringify(doc);
          return `${action}\n${source}`;
        })
        .join("\n") + "\n";

    if (DRY_RUN) {
      indexed += batch.length;
      continue;
    }

    const res = await signedFetch("/_bulk", "POST", ndjson);
    if (res.status !== 200) {
      const errBody = await res.text();
      console.error(`  ❌ Bulk error at batch ${i}: ${errBody.slice(0, 200)}`);
      continue;
    }

    const result = (await res.json()) as { errors: boolean; items: unknown[] };
    if (result.errors) {
      console.error(`  ⚠️  Partial errors in batch starting at row ${i}`);
    }
    indexed += batch.length;
  }

  return indexed;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  CMoney Data → OpenSearch Ingestion");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Endpoint:   ${ENDPOINT}`);
  console.log(`  Data dir:   ${DATA_DIR}`);
  console.log(`  Region:     ${REGION}`);
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  Dry run:    ${DRY_RUN}`);
  console.log("");

  // 1. Create all indices
  console.log("[1/2] Creating indices...");
  for (const [indexName, config] of Object.entries(INDEX_MAPPINGS)) {
    await createIndex(indexName, config);
  }
  console.log("");

  // 2. Ingest CSVs
  console.log("[2/2] Ingesting CSV data...");
  const files = readdirSync(DATA_DIR).filter(
    (f) => f.endsWith(".csv") && f !== "00_Field_Dictionary_and_Usage_Notes.csv",
  );
  const startTime = Date.now();
  let totalDocs = 0;

  for (const file of files) {
    const indexName = CSV_TO_INDEX[file];
    if (!indexName) {
      console.log(`  ⏭️  Skipping ${file} (no index mapping)`);
      continue;
    }

    const mapping = INDEX_MAPPINGS[indexName];
    const properties = mapping.mappings.properties as MappingProps;

    const filePath = resolve(DATA_DIR, file);
    const content = readFileSync(filePath, "utf-8");
    const rows = parseCSV(content);

    const docs: Record<string, unknown>[] = [];
    for (const row of rows) {
      const doc = coerceRow(row, properties);
      if (doc) docs.push(doc);
    }

    const t0 = Date.now();
    const indexed = await bulkIndex(indexName, docs);
    const elapsed = Date.now() - t0;

    console.log(`  📄 ${file}`);
    console.log(`     → ${indexName}: ${indexed.toLocaleString()} docs (${elapsed}ms)`);
    totalDocs += indexed;
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log(`✅ Done! ${totalDocs.toLocaleString()} total documents indexed in ${totalElapsed}s`);
  if (DRY_RUN) {
    console.log("   (dry-run mode — nothing was actually sent to OpenSearch)");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
