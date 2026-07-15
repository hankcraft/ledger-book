variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ledger-book"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "demo"
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "api_image_tag" {
  description = "Docker image tag for the API service"
  type        = string
  default     = "latest"
}

variable "api_port" {
  description = "Port the API listens on"
  type        = number
  default     = 3000
}

variable "api_cpu" {
  description = "CPU units for the API container (1024 = 1 vCPU)"
  type        = string
  default     = "1024"
}

variable "api_memory" {
  description = "Memory in MB for the API container"
  type        = string
  default     = "2048"
}

variable "agent_runtime_name" {
  description = "Name of the AgentCore runtime"
  type        = string
  default     = "cmoney_stock_node"
}
