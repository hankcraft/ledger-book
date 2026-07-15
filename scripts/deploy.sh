#!/usr/bin/env bash
set -e

# =============================================================================
# Ledger Book — Deploy Script
# Builds and deploys the monorepo to AWS (S3 + CloudFront + App Runner)
# =============================================================================

# --- Colors -------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Helpers ------------------------------------------------------------------
step() { echo -e "${BLUE}▶ ${NC}$1"; }
success() { echo -e "${GREEN}✔ ${NC}$1"; }
warn() { echo -e "${YELLOW}⚠ ${NC}$1"; }
error() { echo -e "${RED}✖ ${NC}$1" >&2; }

# --- Defaults -----------------------------------------------------------------
SKIP_INFRA=false
SKIP_API=false
SKIP_WEB=false
INIT=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TF_DIR="$PROJECT_ROOT/infra/terraform"

# --- Usage --------------------------------------------------------------------
usage() {
  cat <<EOF
${CYAN}Ledger Book Deploy Script${NC}

Builds the monorepo and deploys infrastructure + services to AWS.

Usage:
  ./scripts/deploy.sh [OPTIONS]

Options:
  --init        Run terraform init (required on first deploy)
  --skip-infra  Skip terraform apply (use existing infrastructure)
  --skip-api    Skip Docker build & ECR push
  --skip-web    Skip S3 sync & CloudFront invalidation
  -h, --help    Show this help message

Examples:
  # First-time deploy
  ./scripts/deploy.sh --init

  # Regular deploy (all steps)
  ./scripts/deploy.sh

  # Only update the web frontend
  ./scripts/deploy.sh --skip-infra --skip-api

  # Only update the API
  ./scripts/deploy.sh --skip-infra --skip-web
EOF
  exit 0
}

# --- Parse arguments ----------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-infra) SKIP_INFRA=true; shift ;;
    --skip-api)   SKIP_API=true; shift ;;
    --skip-web)   SKIP_WEB=true; shift ;;
    --init)       INIT=true; shift ;;
    -h|--help)    usage ;;
    *)            error "Unknown option: $1"; usage ;;
  esac
done

# --- Prerequisite checks ------------------------------------------------------
step "Checking prerequisites..."
command -v bun >/dev/null 2>&1 || { error "bun is not installed"; exit 1; }
command -v terraform >/dev/null 2>&1 || { error "terraform is not installed"; exit 1; }
command -v aws >/dev/null 2>&1 || { error "aws CLI is not installed"; exit 1; }
command -v docker >/dev/null 2>&1 || { error "docker is not installed"; exit 1; }
success "All prerequisites found"

# =============================================================================
# Step 1: Build the monorepo
# =============================================================================
step "Building monorepo..."
cd "$PROJECT_ROOT"
bun run build
success "Build complete"

# =============================================================================
# Step 2: Terraform init (if --init)
# =============================================================================
if [ "$INIT" = true ]; then
  step "Running terraform init..."
  cd "$TF_DIR"
  terraform init
  success "Terraform initialized"
fi

# =============================================================================
# Step 3: Terraform apply (unless --skip-infra)
# =============================================================================
if [ "$SKIP_INFRA" = false ]; then
  step "Applying infrastructure changes..."
  cd "$TF_DIR"
  terraform apply -auto-approve
  success "Infrastructure updated"
fi

# =============================================================================
# Step 4: Read terraform outputs
# =============================================================================
step "Reading terraform outputs..."
cd "$TF_DIR"
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
API_URL=$(terraform output -raw api_url)
S3_BUCKET=$(terraform output -raw s3_bucket_name)
ECR_REPO_URL=$(terraform output -raw ecr_repo_url)
AWS_REGION=$(terraform output -raw 2>/dev/null aws_region || echo "ap-northeast-1")
# Extract AWS account ID and region from ECR URL
AWS_ACCOUNT_ID=$(echo "$ECR_REPO_URL" | cut -d'.' -f1)
ECR_REGION=$(echo "$ECR_REPO_URL" | cut -d'.' -f4)
success "Outputs loaded"
echo -e "  CloudFront: ${CYAN}${CLOUDFRONT_URL}${NC}"
echo -e "  API:        ${CYAN}${API_URL}${NC}"
echo -e "  S3 Bucket:  ${CYAN}${S3_BUCKET}${NC}"
echo -e "  ECR Repo:   ${CYAN}${ECR_REPO_URL}${NC}"

# =============================================================================
# Step 5: Docker build & push to ECR (unless --skip-api)
# =============================================================================
if [ "$SKIP_API" = false ]; then
  step "Building and pushing API Docker image..."

  # Login to ECR
  aws ecr get-login-password --region "$ECR_REGION" | \
    docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$ECR_REGION.amazonaws.com"

  # Build from project root (Dockerfile expects workspace context)
  cd "$PROJECT_ROOT"
  docker build -t "$ECR_REPO_URL:latest" -f apps/api/Dockerfile .

  # Push
  docker push "$ECR_REPO_URL:latest"
  success "API image pushed to ECR"
fi

# =============================================================================
# Step 6: Deploy web to S3 + invalidate CloudFront (unless --skip-web)
# =============================================================================
if [ "$SKIP_WEB" = false ]; then
  step "Syncing web assets to S3..."
  cd "$PROJECT_ROOT"
  aws s3 sync apps/web/dist/ "s3://$S3_BUCKET/" --delete
  success "Web assets synced to S3"

  step "Invalidating CloudFront cache..."
  DISTRIBUTION_ID=$(aws cloudfront list-distributions --query \
    "DistributionList.Items[?Origins.Items[?Id=='s3-web-assets']].Id | [0]" --output text)

  if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    aws cloudfront create-invalidation \
      --distribution-id "$DISTRIBUTION_ID" \
      --paths "/*" > /dev/null
    success "CloudFront invalidation created"
  else
    warn "Could not find CloudFront distribution ID — skipping invalidation"
  fi
fi

# =============================================================================
# Done!
# =============================================================================
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Live URL:${NC}  https://${CLOUDFRONT_URL}"
echo -e "  ${CYAN}API URL:${NC}   https://${API_URL}"
echo ""
