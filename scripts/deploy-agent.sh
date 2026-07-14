#!/bin/bash
# AgentCore Runtime 部署腳本（bash 版，使用 AWS CLI）
# 使用 direct code deployment (zip) 方式部署到 AgentCore
#
# 注意：主要的 Node.js 部署路徑請用 apps/agent 的 `bun run deploy`
# 此腳本保留供需要 bash/CLI 部署的場景使用

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ACCOUNT_ID="414208189972"
REGION="us-east-1"
AGENT_NAME="cmoney_stock_node"
S3_BUCKET="bedrock-agentcore-code-${ACCOUNT_ID}-${REGION}"
AGENT_DIR="${REPO_ROOT}/apps/agent"
ZIP_PATH="${AGENT_DIR}/deployment_package.zip"

echo "================================================"
echo "CMoney Stock Insights Agent - Deploy to AgentCore"
echo "================================================"
echo ""

# Step 1: 確認 zip 存在
if [ ! -f "$ZIP_PATH" ]; then
    echo "[0/4] Building deployment package..."
    cd "$AGENT_DIR"
    bun run package
fi

# Step 2: 確認 S3 bucket
echo "[1/4] 確認 S3 bucket..."
aws s3api head-bucket --bucket "$S3_BUCKET" --region "$REGION" 2>/dev/null || \
    aws s3api create-bucket --bucket "$S3_BUCKET" --region "$REGION"
echo "  ✅ Bucket: $S3_BUCKET"

# Step 3: 上傳到 S3
echo ""
echo "[2/4] 上傳到 S3..."
aws s3 cp "$ZIP_PATH" \
    "s3://${S3_BUCKET}/${AGENT_NAME}/deployment_package.zip" \
    --region "$REGION"
echo "  ✅ S3 位置: s3://${S3_BUCKET}/${AGENT_NAME}/deployment_package.zip"

# Step 4: 建立或更新 AgentCore Runtime
echo ""
echo "[3/4] 部署 AgentCore Runtime..."
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/AgentCoreRuntime_cmoney-stock-insights"

# 檢查是否已存在
EXISTING=$(aws bedrock-agentcore-control list-agent-runtimes --region "$REGION" \
    --query "agentRuntimes[?agentRuntimeName=='${AGENT_NAME}'].agentRuntimeId" \
    --output text 2>/dev/null || echo "")

if [ -z "$EXISTING" ] || [ "$EXISTING" = "None" ]; then
    echo "  建立新 AgentCore Runtime..."
    aws bedrock-agentcore-control create-agent-runtime \
        --agent-runtime-name "$AGENT_NAME" \
        --agent-runtime-artifact "{
            \"codeConfiguration\": {
                \"code\": {
                    \"s3\": {
                        \"bucket\": \"${S3_BUCKET}\",
                        \"prefix\": \"${AGENT_NAME}/deployment_package.zip\"
                    }
                },
                \"runtime\": \"NODE_22\",
                \"entryPoint\": [\"agent.js\"]
            }
        }" \
        --network-configuration '{"networkMode": "PUBLIC"}' \
        --role-arn "$ROLE_ARN" \
        --lifecycle-configuration '{
            "idleRuntimeSessionTimeout": 600,
            "maxLifetime": 3600
        }' \
        --region "$REGION"
else
    echo "  更新現有 AgentCore Runtime (ID: $EXISTING)..."
    aws bedrock-agentcore-control update-agent-runtime \
        --agent-runtime-id "$EXISTING" \
        --agent-runtime-artifact "{
            \"codeConfiguration\": {
                \"code\": {
                    \"s3\": {
                        \"bucket\": \"${S3_BUCKET}\",
                        \"prefix\": \"${AGENT_NAME}/deployment_package.zip\"
                    }
                },
                \"runtime\": \"NODE_22\",
                \"entryPoint\": [\"agent.js\"]
            }
        }" \
        --network-configuration '{"networkMode": "PUBLIC"}' \
        --role-arn "$ROLE_ARN" \
        --region "$REGION"
fi

echo ""
echo "[4/4] 部署完成！"
echo ""
echo "查看狀態："
echo "  aws bedrock-agentcore-control list-agent-runtimes --region $REGION"
