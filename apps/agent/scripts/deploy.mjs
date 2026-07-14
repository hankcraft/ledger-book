/**
 * Deploy script — uploads zip to S3 and creates/updates AgentCore Runtime.
 * Usage: bun scripts/deploy.mjs  (from apps/agent/)
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  BedrockAgentCoreControlClient,
  CreateAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore-control";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = resolve(scriptDir, "..");

const ACCOUNT_ID = "414208189972";
const REGION = "us-east-1";
const AGENT_NAME = "cmoney_stock_node";
const BUCKET = `bedrock-agentcore-code-${ACCOUNT_ID}-${REGION}`;
const ROLE_ARN = `arn:aws:iam::${ACCOUNT_ID}:role/AgentCoreRuntime_cmoney-stock-insights`;
const ZIP_PATH = resolve(AGENT_ROOT, "deployment_package.zip");
const S3_KEY = `${AGENT_NAME}/deployment_package.zip`;

const s3 = new S3Client({ region: REGION });
const agentcore = new BedrockAgentCoreControlClient({ region: REGION });

async function main() {
  // 1. Upload zip to S3
  console.log(`[1/3] Uploading ${ZIP_PATH} to s3://${BUCKET}/${S3_KEY}...`);
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

  // 2. Create or update runtime
  console.log(`[2/3] Deploying AgentCore Runtime...`);
  const artifact = {
    codeConfiguration: {
      code: { s3: { bucket: BUCKET, prefix: S3_KEY } },
      runtime: "NODE_22",
      entryPoint: ["agent.js"],
    },
  };

  let runtimeId;
  try {
    const response = await agentcore.send(
      new CreateAgentRuntimeCommand({
        agentRuntimeName: AGENT_NAME,
        agentRuntimeArtifact: artifact,
        networkConfiguration: { networkMode: "PUBLIC" },
        roleArn: ROLE_ARN,
        lifecycleConfiguration: {
          idleRuntimeSessionTimeout: 600,
          maxLifetime: 3600,
        },
      }),
    );
    runtimeId = response.agentRuntimeId;
    console.log(`  ✅ Created new runtime: ${runtimeId}`);
  } catch (err) {
    if (err.name === "ConflictException" || err.message?.includes("already exists")) {
      console.log(`  Runtime exists, updating...`);
      runtimeId = `${AGENT_NAME}-EXISTING`;
      console.log(`  ⚠️  Update requires runtime ID. Use AWS CLI to update.`);
    } else {
      throw err;
    }
  }

  // 3. Done
  console.log(`[3/3] Runtime deployed!`);
  console.log(`\n  Runtime ID: ${runtimeId}`);
  console.log(`  Region: ${REGION}`);
  console.log(`\n  Test with:`);
  console.log(`  PAYLOAD=$(echo -n '{"prompt":"分析台積電 2330"}' | base64 -w 0)`);
  console.log(
    `  aws bedrock-agentcore invoke-agent-runtime --agent-runtime-arn "arn:aws:bedrock-agentcore:${REGION}:${ACCOUNT_ID}:runtime/${runtimeId}" --qualifier DEFAULT --payload "$PAYLOAD" --region ${REGION} response.json`,
  );
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
