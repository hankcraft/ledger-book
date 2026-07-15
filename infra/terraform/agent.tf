# =============================================================================
# AgentCore Infrastructure — S3 Code Bucket + IAM + Runtime + Endpoint
# =============================================================================
#
# Region: us-east-1 (AgentCore availability; separate from web/api in ap-northeast-1)
# Deploy model: S3 code deployment (zip), Node 22 runtime
# =============================================================================

# --- Provider alias for us-east-1 (AgentCore region) -------------------------

provider "aws" {
  alias  = "agent"
  region = var.agent_region
}

# --- S3 Bucket for Agent Code -------------------------------------------------

resource "aws_s3_bucket" "agent_code" {
  provider = aws.agent
  bucket   = "bedrock-agentcore-code-${data.aws_caller_identity.current.account_id}-${var.agent_region}"

  tags = merge(local.common_tags, {
    Name = "bedrock-agentcore-code-${data.aws_caller_identity.current.account_id}-${var.agent_region}"
  })
}

resource "aws_s3_bucket_public_access_block" "agent_code" {
  provider = aws.agent
  bucket   = aws_s3_bucket.agent_code.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- IAM Role for AgentCore Runtime -------------------------------------------

data "aws_iam_policy_document" "agentcore_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["bedrock-agentcore.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "agentcore_permissions" {
  # S3 read for code artifact
  statement {
    actions   = ["s3:GetObject", "s3:GetObjectVersion"]
    effect    = "Allow"
    resources = ["${aws_s3_bucket.agent_code.arn}/*"]
  }

  # Bedrock model invocation (Nova Pro)
  statement {
    actions   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    effect    = "Allow"
    resources = ["arn:aws:bedrock:${var.agent_region}::foundation-model/*"]
  }

  # OpenSearch Serverless data access
  statement {
    actions   = ["aoss:APIAccessAll"]
    effect    = "Allow"
    resources = [aws_opensearchserverless_collection.stock_data.arn]
  }
}

resource "aws_iam_role" "agentcore_runtime" {
  provider           = aws.agent
  name               = "${local.name_prefix}-agentcore-runtime"
  assume_role_policy = data.aws_iam_policy_document.agentcore_assume_role.json

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-agentcore-runtime"
  })
}

resource "aws_iam_role_policy" "agentcore_runtime" {
  provider = aws.agent
  name     = "agentcore-runtime-permissions"
  role     = aws_iam_role.agentcore_runtime.id
  policy   = data.aws_iam_policy_document.agentcore_permissions.json
}

# --- AgentCore Runtime --------------------------------------------------------

resource "aws_bedrockagentcore_agent_runtime" "stock_agent" {
  provider           = aws.agent
  agent_runtime_name = var.agent_runtime_name
  description        = "CMoney 持股分析 Agent — stock insights with OpenSearch data"
  role_arn           = aws_iam_role.agentcore_runtime.arn

  agent_runtime_artifact {
    code_configuration {
      entry_point = ["agent.js"]
      runtime     = "NODE_22"
      code {
        s3 {
          bucket = aws_s3_bucket.agent_code.id
          prefix = "${var.agent_runtime_name}/deployment_package.zip"
        }
      }
    }
  }

  environment_variables = {
    OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.stock_data.collection_endpoint
    AWS_REGION          = var.agent_region
  }

  network_configuration {
    network_mode = "PUBLIC"
  }

  lifecycle_configuration {
    idle_runtime_session_timeout = 600
    max_lifetime                 = 3600
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-stock-agent"
  })
}

# --- AgentCore Runtime Endpoint -----------------------------------------------

resource "aws_bedrockagentcore_agent_runtime_endpoint" "stock_agent" {
  provider         = aws.agent
  name             = "${var.agent_runtime_name}-ep"
  agent_runtime_id = aws_bedrockagentcore_agent_runtime.stock_agent.agent_runtime_id
  description      = "Public endpoint for stock insights agent"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-stock-agent-ep"
  })
}
