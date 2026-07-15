output "cloudfront_url" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.web.domain_name
}

output "api_url" {
  description = "App Runner service URL"
  value       = aws_apprunner_service.api.service_url
}

output "s3_bucket_name" {
  description = "S3 bucket for web assets"
  value       = aws_s3_bucket.web_assets.id
}

output "ecr_repo_url" {
  description = "ECR repository URL for the API image"
  value       = aws_ecr_repository.api.repository_url
}

output "database_endpoint" {
  description = "RDS Aurora PostgreSQL cluster endpoint"
  value       = aws_rds_cluster.main.endpoint
}

# --- Agent Outputs ------------------------------------------------------------

output "agent_runtime_arn" {
  description = "AgentCore runtime ARN"
  value       = aws_bedrockagentcore_agent_runtime.stock_agent.agent_runtime_arn
}

output "agent_runtime_id" {
  description = "AgentCore runtime ID"
  value       = aws_bedrockagentcore_agent_runtime.stock_agent.agent_runtime_id
}

output "agent_endpoint_arn" {
  description = "AgentCore runtime endpoint ARN"
  value       = aws_bedrockagentcore_agent_runtime_endpoint.stock_agent.agent_runtime_endpoint_arn
}

output "agent_code_bucket" {
  description = "S3 bucket for agent code deployment"
  value       = aws_s3_bucket.agent_code.id
}

output "opensearch_endpoint" {
  description = "OpenSearch Serverless collection endpoint"
  value       = aws_opensearchserverless_collection.stock_data.collection_endpoint
}
