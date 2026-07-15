#!/bin/bash
# Deploy agent code to S3 (Terraform manages the runtime infrastructure)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENT_DIR="${REPO_ROOT}/apps/agent"
ZIP_PATH="${AGENT_DIR}/deployment_package.zip"

# Read config from terraform outputs (or fall back to defaults)
TF_DIR="${REPO_ROOT}/infra/terraform"
if [ -d "$TF_DIR/.terraform" ]; then
  BUCKET=$(cd "$TF_DIR" && terraform output -raw agent_code_bucket 2>/dev/null) || true
  AGENT_NAME=$(cd "$TF_DIR" && terraform output -raw 2>/dev/null | true)
fi
BUCKET="${BUCKET:-bedrock-agentcore-code-414208189972-us-east-1}"
AGENT_NAME="${AGENT_NAME:-cmoney_stock_node}"
REGION="us-east-1"

echo "▶ Building agent package..."
cd "$AGENT_DIR"
bun run package

echo "▶ Uploading to s3://${BUCKET}/${AGENT_NAME}/deployment_package.zip..."
aws s3 cp "$ZIP_PATH" \
  "s3://${BUCKET}/${AGENT_NAME}/deployment_package.zip" \
  --region "$REGION"

echo "✔ Agent code deployed. Runtime will pick up the new code automatically."
