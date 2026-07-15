# Deployment Guide

## Prerequisites

| Tool      | Version  | Install                                      |
|-----------|----------|----------------------------------------------|
| AWS CLI   | >= 2.x   | https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html |
| Terraform | >= 1.5   | https://developer.hashicorp.com/terraform/install |
| Docker    | >= 24.x  | https://docs.docker.com/get-docker/          |
| Bun       | >= 1.x   | https://bun.sh/docs/installation             |

AWS credentials must be configured (`aws configure` or environment variables).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CloudFront                               │
│                    (HTTPS + Caching + SPA)                       │
├────────────────────────────┬────────────────────────────────────┤
│        /* (default)        │           /api/*                   │
│             ↓              │              ↓                     │
│    ┌────────────────┐      │    ┌──────────────────┐           │
│    │   S3 Bucket    │      │    │   App Runner     │           │
│    │  (Vue SPA)     │      │    │   (Bun API)      │           │
│    └────────────────┘      │    └──────────────────┘           │
│                            │              ↑                     │
│                            │    ┌──────────────────┐           │
│                            │    │   ECR (Docker)   │           │
│                            │    └──────────────────┘           │
└────────────────────────────┴────────────────────────────────────┘
```

- **CloudFront** — CDN with OAC access to S3, proxies `/api/*` to App Runner
- **S3** — Private bucket hosting the Vue SPA static assets
- **App Runner** — Serverless container service running the Bun API
- **ECR** — Container registry storing API Docker images

## First-Time Setup

1. **Configure AWS credentials:**

   ```bash
   aws configure
   # Region: ap-northeast-1 (or your preferred region)
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Deploy with --init:**

   ```bash
   ./scripts/deploy.sh --init
   ```

   This runs `terraform init` followed by the full deployment pipeline.

4. **(Optional) Copy and edit terraform.tfvars:**

   ```bash
   cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
   # Edit values as needed
   ```

## Regular Deployment

Full deploy (infrastructure + API + web):

```bash
./scripts/deploy.sh
```

### Partial Deploys

```bash
# Only update web frontend (skip infra and API)
./scripts/deploy.sh --skip-infra --skip-api

# Only update API (skip infra and web)
./scripts/deploy.sh --skip-infra --skip-web

# Only update infrastructure
./scripts/deploy.sh --skip-api --skip-web
```

### Script Options

| Flag           | Description                              |
|----------------|------------------------------------------|
| `--init`       | Run `terraform init` (first deploy only) |
| `--skip-infra` | Skip `terraform apply`                   |
| `--skip-api`   | Skip Docker build & ECR push             |
| `--skip-web`   | Skip S3 sync & CloudFront invalidation   |
| `-h, --help`   | Show usage help                          |

## Teardown

To destroy all AWS resources:

```bash
cd infra/terraform
terraform destroy
```

This will prompt for confirmation. To skip the prompt:

```bash
terraform destroy -auto-approve
```

**Warning:** This deletes all deployed infrastructure including the S3 bucket contents, CloudFront distribution, App Runner service, and ECR repository.

## Cost Estimation

For a demo/development environment with low traffic:

| Service      | Estimated Monthly Cost | Notes                                     |
|--------------|----------------------|-------------------------------------------|
| S3           | ~$0.03               | < 1 GB storage, minimal requests          |
| CloudFront   | ~$0.00               | Free tier: 1 TB transfer, 10M requests    |
| App Runner   | ~$3–5                | 1 vCPU, 2 GB, pauses when idle            |
| ECR          | ~$0.10               | < 1 GB image storage                      |
| **Total**    | **< $5/month**       | At low/demo traffic levels                |

**Notes:**
- App Runner pauses automatically when idle (no requests), reducing compute costs
- CloudFront's free tier is generous for demo usage
- ECR charges $0.10/GB/month for storage
- Data transfer within the same region between services is free
- These estimates assume < 1,000 requests/day

To minimize costs further:
- Use `terraform destroy` when not actively demoing
- The `force_delete = true` on ECR ensures clean teardown
