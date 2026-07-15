# =============================================================================
# OpenSearch Serverless — Collection + Access Policies
# =============================================================================
#
# Hosts CMoney stock market data indices used by the AgentCore runtime.
# Collection type: SEARCH (vector not needed — structured queries only)
# =============================================================================

# --- Encryption Policy (required before collection creation) ------------------

resource "aws_opensearchserverless_security_policy" "stock_data_encryption" {
  name = "${local.name_prefix}-enc"
  type = "encryption"

  policy = jsonencode({
    Rules = [
      {
        Resource     = ["collection/${local.name_prefix}-stock-data"]
        ResourceType = "collection"
      }
    ]
    AWSOwnedKey = true
  })
}

# --- Network Policy -----------------------------------------------------------

resource "aws_opensearchserverless_security_policy" "stock_data_network" {
  name = "${local.name_prefix}-net"
  type = "network"

  policy = jsonencode([
    {
      Description = "Public access for ${local.name_prefix} stock data collection"
      Rules = [
        {
          Resource     = ["collection/${local.name_prefix}-stock-data"]
          ResourceType = "collection"
        },
        {
          Resource     = ["collection/${local.name_prefix}-stock-data"]
          ResourceType = "dashboard"
        }
      ]
      AllowFromPublic = true
    }
  ])
}

# --- Data Access Policy -------------------------------------------------------

resource "aws_opensearchserverless_access_policy" "stock_data" {
  name = "${local.name_prefix}-data"
  type = "data"

  policy = jsonencode([
    {
      Description = "Allow AgentCore runtime and admin access"
      Rules = [
        {
          Resource     = ["index/${local.name_prefix}-stock-data/*"]
          Permission   = ["aoss:ReadDocument", "aoss:DescribeIndex", "aoss:SearchIndex"]
          ResourceType = "index"
        },
        {
          Resource     = ["collection/${local.name_prefix}-stock-data"]
          Permission   = ["aoss:DescribeCollectionItems", "aoss:CreateCollectionItems"]
          ResourceType = "collection"
        }
      ]
      Principal = [
        aws_iam_role.agentcore_runtime.arn,
        data.aws_caller_identity.current.arn
      ]
    }
  ])
}

# --- OpenSearch Serverless Collection -----------------------------------------

resource "aws_opensearchserverless_collection" "stock_data" {
  name = "${local.name_prefix}-stock-data"
  type = "SEARCH"

  depends_on = [
    aws_opensearchserverless_security_policy.stock_data_encryption,
    aws_opensearchserverless_security_policy.stock_data_network,
  ]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-stock-data"
  })
}
