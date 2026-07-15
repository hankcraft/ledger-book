# =============================================================================
# API Backend - AWS App Runner
# =============================================================================

# --- ECR Repository -----------------------------------------------------------

resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-${var.environment}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api"
    Project     = var.project_name
    Environment = var.environment
  }
}

# --- IAM Role for App Runner ECR Access ---------------------------------------

resource "aws_iam_role" "apprunner_ecr_access" {
  name = "${var.project_name}-${var.environment}-apprunner-ecr-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-apprunner-ecr-access"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# --- App Runner Auto Scaling Configuration ------------------------------------

resource "aws_apprunner_auto_scaling_configuration_version" "api" {
  auto_scaling_configuration_name = "${var.project_name}-${var.environment}-api"

  min_size        = 1
  max_size        = 2
  max_concurrency = 100

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-autoscaling"
    Project     = var.project_name
    Environment = var.environment
  }
}

# --- App Runner Service -------------------------------------------------------

resource "aws_apprunner_service" "api" {
  service_name = "${var.project_name}-${var.environment}-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = var.api_port

        runtime_environment_variables = {
          PORT     = "3000"
          NODE_ENV = "production"
        }
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = var.api_cpu
    memory = var.api_memory
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

  tags = {
    Name        = "${var.project_name}-${var.environment}-api"
    Project     = var.project_name
    Environment = var.environment
  }
}
