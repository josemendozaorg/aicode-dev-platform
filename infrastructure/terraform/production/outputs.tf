output "vpc_id" {
  description = "ID of the production VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the production VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnets" {
  description = "List of IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnets" {
  description = "List of IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnets" {
  description = "List of IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

# EKS Cluster Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_primary_security_group_id" {
  description = "Cluster security group that was created by Amazon EKS for the cluster"
  value       = module.eks.cluster_primary_security_group_id
}

output "node_groups" {
  description = "EKS node groups"
  value       = module.eks.eks_managed_node_groups
  sensitive   = true
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = module.eks.oidc_provider_arn
}

# Database Outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "database_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = aws_db_instance.replica.endpoint
  sensitive   = true
}

output "database_kms_key_id" {
  description = "The ARN for the KMS encryption key used by the database"
  value       = aws_kms_key.rds.arn
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_auth_token" {
  description = "Redis auth token (if auth enabled)"
  value       = aws_elasticache_replication_group.main.auth_token
  sensitive   = true
}

# Load Balancer Outputs
output "load_balancer_arn" {
  description = "The ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "load_balancer_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "The canonical hosted zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

# KMS Key Outputs
output "eks_kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the EKS KMS key"
  value       = aws_kms_key.eks.arn
}

output "rds_kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the RDS KMS key"
  value       = aws_kms_key.rds.arn
}

output "redis_kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the Redis KMS key"
  value       = aws_kms_key.redis.arn
}

output "cloudwatch_kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the CloudWatch KMS key"
  value       = aws_kms_key.cloudwatch.arn
}

# S3 Outputs
output "alb_logs_bucket" {
  description = "Name of the S3 bucket for ALB access logs"
  value       = aws_s3_bucket.alb_logs.id
}

# CloudWatch Outputs
output "application_log_group" {
  description = "Name of the CloudWatch log group for application logs"
  value       = aws_cloudwatch_log_group.application.name
}

# Network Configuration Summary
output "network_configuration" {
  description = "Network configuration summary for applications"
  value = {
    vpc_id             = aws_vpc.main.id
    vpc_cidr           = aws_vpc.main.cidr_block
    availability_zones = data.aws_availability_zones.available.names
    public_subnets     = aws_subnet.public[*].id
    private_subnets    = aws_subnet.private[*].id
    database_subnets   = aws_subnet.database[*].id
  }
  sensitive = false
}

# Database Configuration Summary
output "database_configuration" {
  description = "Database configuration summary"
  value = {
    endpoint         = aws_db_instance.main.endpoint
    port            = aws_db_instance.main.port
    database_name   = aws_db_instance.main.db_name
    multi_az        = aws_db_instance.main.multi_az
    backup_retention = aws_db_instance.main.backup_retention_period
    replica_endpoint = aws_db_instance.replica.endpoint
  }
  sensitive = true
}

# Cache Configuration Summary
output "cache_configuration" {
  description = "Cache configuration summary"
  value = {
    endpoint      = aws_elasticache_replication_group.main.configuration_endpoint_address
    port         = aws_elasticache_replication_group.main.port
    node_type    = aws_elasticache_replication_group.main.node_type
    num_nodes    = aws_elasticache_replication_group.main.num_cache_clusters
    multi_az     = aws_elasticache_replication_group.main.multi_az_enabled
    encrypted    = aws_elasticache_replication_group.main.at_rest_encryption_enabled
  }
  sensitive = true
}

# Monitoring Configuration
output "monitoring_configuration" {
  description = "Monitoring and observability configuration"
  value = {
    log_group           = aws_cloudwatch_log_group.application.name
    log_retention_days  = aws_cloudwatch_log_group.application.retention_in_days
    kms_key_arn        = aws_kms_key.cloudwatch.arn
  }
  sensitive = false
}

# Security Configuration Summary
output "security_configuration" {
  description = "Security configuration summary"
  value = {
    eks_encryption_key    = aws_kms_key.eks.arn
    rds_encryption_key    = aws_kms_key.rds.arn
    redis_encryption_key  = aws_kms_key.redis.arn
    cloudwatch_key       = aws_kms_key.cloudwatch.arn
    cluster_security_group = module.eks.cluster_security_group_id
    rds_security_group   = aws_security_group.rds.id
    redis_security_group = aws_security_group.redis.id
    alb_security_group   = aws_security_group.alb.id
  }
  sensitive = false
}