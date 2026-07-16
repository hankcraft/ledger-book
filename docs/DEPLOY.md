# Deployment Guide

## Prerequisites

| Tool      | Version  | Install                                      |
|-----------|----------|----------------------------------------------|
| AWS CLI   | >= 2.x   | https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html |
| Terraform | >= 1.5   | https://developer.hashicorp.com/terraform/install |
| Docker    | >= 24.x  | https://docs.docker.com/get-docker/          |
| Bun       | >= 1.x   | https://bun.sh/docs/installation             |

AWS credentials must be configured with access to account `414208189972`.

## Architecture

```
┌─────────────────────────── us-east-1 ─────────────────────────────────────┐
│                                                                            │
│  ┌───────────────────── CloudFront ─────────────────────┐                 │
│  │   /*  → S3 (Vue SPA)                                 │                 │
│  │   /api/* → ALB (ECS Fargate)                         │                 │
│  └───────────────────────────────────────────────────────┘                │
│                              │                                             │
│          ┌───────────────────┼───────────────────┐                        │
│          ▼                   ▼                   │                         │
│  ┌──────────────┐   ┌──────────────┐            │                         │
│  │  S3 Bucket   │   │ ECS Fargate  │────────┐   │                         │
│  │  (Vue SPA)   │   │  (Bun API)   │        │   │                         │
│  └──────────────┘   └──────────────┘        │   │                         │
│                        │  VPC / ALB          │   │                         │
│                        ▼                     │   │                         │
│              ┌──────────────────┐            │   │                         │
│              │ Aurora Postgres   │            │   │                         │
│              │ (Serverless v2)   │            │   │                         │
│              └──────────────────┘            │   │                         │
│                                              │   │                         │
│  ┌──────────────┐                            │   │                         │
│  │     ECR      │ ◀── Docker image           │   │                         │
│  └──────────────┘                            │   │                         │
│                                              │   │                         │
│  ┌──────────────────────────────────┐        │   │                         │
│  │  AgentCore Runtime (NODE_22)     │◀───────┘   │                         │
│  │  cmoney_stock_node               │  AGENT_ENDPOINT                      │
│  └──────────────────────────────────┘                                      │
│              │                                                              │
│              ▼                                                              │
│  ┌──────────────────────────────────┐                                      │
│  │  OpenSearch Serverless (AOSS)    │                                      │
│  │  Stock market data indices       │                                      │
│  └──────────────────────────────────┘                                      │
│                                                                            │
│  ┌──────────────────────────────────┐                                      │
│  │  S3 (Agent Code Bucket)          │                                      │
│  └──────────────────────────────────┘                                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Component Summary

| Component | Service | Region | Purpose |
|-----------|---------|--------|---------|
| Web SPA | S3 + CloudFront | us-east-1 | Vue 3 static hosting with CDN |
| API | ECS Fargate + ALB + ECR | us-east-1 | Bun/Elysia REST API |
| Database | Aurora Serverless v2 | us-east-1 | PostgreSQL 16.4 (Prisma ORM) |
| Agent | AgentCore Runtime | us-east-1 | Stock analysis with Bedrock Nova Pro |
| Data Store | OpenSearch Serverless | us-east-1 | CMoney stock market indices (8 indices) |

## Terraform Structure

```
infra/terraform/
├── main.tf                  # Provider, backend, locals
├── variables.tf             # Input variables
├── outputs.tf               # Exported values
├── terraform.tfvars.example # Example configuration
├── web.tf                   # S3 + CloudFront (SPA)
├── api.tf                   # ECR + ECS Fargate + ALB + RDS + VPC
├── agent.tf                 # AgentCore Runtime + IAM + S3
└── opensearch.tf            # OpenSearch Serverless collection
```

## First-Time Setup

1. **Configure AWS credentials:**

   ```bash
   aws configure
   # Region: us-east-1
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Copy and customise variables (optional):**

   ```bash
   cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
   ```

4. **Deploy with --init:**

   ```bash
   bun run deploy:init
   ```

   This runs `terraform init` → `terraform apply` → Docker build → ECR push → S3 sync → CloudFront invalidation.

5. **Run database migrations:**

   Migrations run automatically on container start (`prisma migrate deploy`). For the first deploy, ensure the Docker image has been pushed before ECS starts the task.

6. **Deploy agent code:**

   ```bash
   bun run agent:deploy
   ```

   This builds the agent zip and uploads to the S3 code bucket. The AgentCore runtime picks up new code automatically.

7. **Ingest stock data to OpenSearch:**

   ```bash
   cd apps/agent
   OPENSEARCH_ENDPOINT=$(cd ../../infra/terraform && terraform output -raw opensearch_endpoint)
   OPENSEARCH_ENDPOINT=$OPENSEARCH_ENDPOINT bun run ingest
   ```

## Regular Deployment

### Full Deploy

```bash
bun run deploy
```

### Partial Deploys

```bash
# Web frontend only
bun run deploy:web

# API only (Docker build + ECR push + ECS service update)
bun run deploy:api

# Infrastructure only (terraform apply)
bun run deploy:infra

# Agent code only
bun run agent:deploy
```

### Deploy Script Options

| Flag           | Description                              |
|----------------|------------------------------------------|
| `--init`       | Run `terraform init` (first deploy only) |
| `--skip-infra` | Skip `terraform apply`                   |
| `--skip-api`   | Skip Docker build & ECR push             |
| `--skip-web`   | Skip S3 sync & CloudFront invalidation   |
| `-h, --help`   | Show usage help                          |

## Terraform Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `project_name` | `ledger-book` | Resource naming prefix |
| `environment` | `demo` | Environment tag |
| `aws_region` | `us-east-1` | AWS region for all resources |
| `api_image_tag` | `latest` | Docker tag for API |
| `api_port` | `3000` | API listen port |
| `api_cpu` | `1024` | ECS task CPU (1024 = 1 vCPU) |
| `api_memory` | `2048` | ECS task memory (MB) |
| `agent_runtime_name` | `cmoney_stock_node` | AgentCore runtime name |

## Terraform Outputs

After `terraform apply`, these values are available:

```bash
cd infra/terraform
terraform output cloudfront_url       # Live demo URL
terraform output s3_bucket_name       # Web assets bucket
terraform output ecr_repo_url         # Docker registry URL
terraform output database_endpoint    # RDS cluster endpoint
terraform output agent_runtime_arn    # AgentCore ARN
terraform output agent_runtime_id     # AgentCore ID
terraform output agent_endpoint_arn   # AgentCore endpoint ARN
terraform output agent_code_bucket    # Agent S3 code bucket
terraform output opensearch_endpoint  # AOSS collection endpoint
```

## Database

- **Engine:** Aurora PostgreSQL 16.4 (Serverless v2)
- **Scaling:** 0.5–2 ACU (scales based on load)
- **Access:** Private subnets only, reachable via ECS tasks in the same VPC
- **Migrations:** Auto-applied on container start via `prisma migrate deploy`

To run migrations manually:

```bash
DATABASE_URL="postgresql://postgres:<password>@<endpoint>:5432/ledger_book?schema=public" \
  bunx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

The database password is generated by Terraform (`random_password`) and stored in state. To retrieve it:

```bash
cd infra/terraform
terraform show -json | jq -r '.values.root_module.resources[] | select(.address=="random_password.db") | .values.result'
```

## Teardown

```bash
cd infra/terraform
terraform destroy
```

This deletes **all** resources: CloudFront, S3, ECS, ALB, ECR, RDS, VPC, AgentCore, and OpenSearch.

> **Warning:** The RDS cluster has `deletion_protection = false` and `skip_final_snapshot = true` for demo convenience. Data will be permanently lost.

## Cost Estimation

| Service | Estimated Monthly Cost | Notes |
|---------|----------------------|-------|
| S3 (web) | ~$0.03 | < 1 GB storage |
| CloudFront | ~$0.00 | Free tier: 1 TB transfer |
| ECS Fargate | ~$5–10 | 1 vCPU, 2 GB |
| ALB | ~$16 | Hourly charge + LCU |
| ECR | ~$0.10 | < 1 GB image storage |
| Aurora Serverless v2 | ~$5–15 | 0.5 ACU minimum when active |
| OpenSearch Serverless | ~$7–10 | 2 OCU minimum (search + index) |
| AgentCore | ~$0–2 | Pay per invocation |
| S3 (agent code) | ~$0.01 | < 10 MB |
| **Total** | **~$35–55/month** | At demo traffic levels |

### Cost Reduction Tips

- Run `terraform destroy` when not actively demoing
- Aurora scales to 0.5 ACU when idle but doesn't pause completely
- OpenSearch Serverless has a minimum 2 OCU charge when collection exists
- AgentCore charges only per invocation (no idle cost)
- ECS Fargate charges while tasks are running; set desired count to 0 when idle
- For the cheapest demo: destroy and redeploy only when needed (~5 min)
