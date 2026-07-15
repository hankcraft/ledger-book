/**
 * Deploy agent code — builds zip and uploads to S3.
 * Terraform manages the AgentCore runtime infrastructure.
 *
 * Usage: bun scripts/deploy.mjs (from apps/agent/)
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = resolve(scriptDir, "..");

const ACCOUNT_ID = "414208189972";
const REGION = "us-east-1";
const AGENT_NAME = "cmoney_stock_node";
const BUCKET = `bedrock-agentcore-code-${ACCOUNT_ID}-${REGION}`;
const ZIP_PATH = resolve(AGENT_ROOT, "deployment_package.zip");
const S3_KEY = `${AGENT_NAME}/deployment_package.zip`;

const s3 = new S3Client({ region: REGION });

async function main() {
  console.log(`[1/2] Uploading ${ZIP_PATH} to s3://${BUCKET}/${S3_KEY}...`);
  const zipContent = readFileSync(ZIP_PATH);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: S3_KEY,
      Body: zipContent,
      ExpectedBucketOwner: ACCOUNT_ID,
    }),
  );
  console.log(`  ✅ Uploaded (${(zipContent.length / 1024).toFixed(1)} KB)`);

  console.log(`[2/2] Done — runtime will pick up the new code automatically.`);
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
