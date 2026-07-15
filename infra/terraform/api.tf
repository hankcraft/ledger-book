# =============================================================================
# API Backend — App Runner + RDS PostgreSQL
# =============================================================================

# --- ECR Repository -----------------------------------------------------------

resource "aws_ecr_repository" "api" {
  name                 = "${local.name_prefix}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-api" })
}

# --- VPC for RDS + App Runner -------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-vpc" })
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-private-${count.index}" })
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_security_group" "rds" {
  name_prefix = "${local.name_prefix}-rds-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.apprunner.id]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-rds-sg" })
}

resource "aws_security_group" "apprunner" {
  name_prefix = "${local.name_prefix}-apprunner-"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-apprunner-sg" })
}

# --- RDS PostgreSQL -----------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-db-subnet" })
}

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "${local.name_prefix}-db"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "16.4"
  database_name      = "ledger_book"
  master_username    = "postgres"
  master_password    = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot = true
  deletion_protection = false

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-db" })
}

resource "aws_rds_cluster_instance" "main" {
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-db-instance" })
}

# --- IAM Role for App Runner ECR Access ---------------------------------------

resource "aws_iam_role" "apprunner_ecr_access" {
  name = "${local.name_prefix}-apprunner-ecr"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
    }]
  })

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-apprunner-ecr" })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# --- App Runner VPC Connector -------------------------------------------------

resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${local.name_prefix}-vpc"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.apprunner.id]

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-vpc-connector" })
}

# --- App Runner Auto Scaling --------------------------------------------------

resource "aws_apprunner_auto_scaling_configuration_version" "api" {
  auto_scaling_configuration_name = "${local.name_prefix}-api"

  min_size        = 1
  max_size        = 2
  max_concurrency = 100

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-api-autoscaling" })
}

# --- App Runner Service -------------------------------------------------------

resource "aws_apprunner_service" "api" {
  service_name = "${local.name_prefix}-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = tostring(var.api_port)

        runtime_environment_variables = {
          PORT           = tostring(var.api_port)
          NODE_ENV       = "production"
          DATABASE_URL   = "postgresql://${aws_rds_cluster.main.master_username}:${random_password.db.result}@${aws_rds_cluster.main.endpoint}:5432/${aws_rds_cluster.main.database_name}?schema=public"
          AGENT_ENDPOINT = "https://${aws_bedrockagentcore_agent_runtime_endpoint.stock_agent.agent_runtime_endpoint_arn}"
        }
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = var.api_cpu
    memory = var.api_memory
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.api.arn

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-api" })
}
