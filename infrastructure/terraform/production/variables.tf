variable "aws_region" {
  description = "AWS region for production deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "aicode"
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "aicode-production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones"
  type        = number
  default     = 3
  
  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "Production environment requires 2-3 availability zones for high availability."
  }
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "aicode_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.db_password) >= 12
    error_message = "Database password must be at least 12 characters long."
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "aicode-platform.com"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

variable "enable_monitoring" {
  description = "Enable comprehensive monitoring and logging"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "enable_disaster_recovery" {
  description = "Enable disaster recovery setup"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
  
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

variable "backup_retention_days" {
  description = "Database backup retention period in days"
  type        = number
  default     = 30
  
  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.28"
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS worker nodes"
  type        = list(string)
  default     = ["m5.large", "m5.xlarge", "m5.2xlarge"]
}

variable "node_min_size" {
  description = "Minimum number of nodes in the EKS cluster"
  type        = number
  default     = 2
  
  validation {
    condition     = var.node_min_size >= 2
    error_message = "Production cluster must have at least 2 nodes for high availability."
  }
}

variable "node_max_size" {
  description = "Maximum number of nodes in the EKS cluster"
  type        = number
  default     = 20
}

variable "node_desired_size" {
  description = "Desired number of nodes in the EKS cluster"
  type        = number
  default     = 3
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r5.large"
  
  validation {
    condition     = can(regex("^db\\.(r5|r6g)\\.(large|xlarge|2xlarge|4xlarge|8xlarge)$", var.database_instance_class))
    error_message = "Database instance class must be a production-ready size (r5 or r6g, large or larger)."
  }
}

variable "database_allocated_storage" {
  description = "Initial database storage size in GB"
  type        = number
  default     = 100
  
  validation {
    condition     = var.database_allocated_storage >= 100
    error_message = "Production database must have at least 100GB of storage."
  }
}

variable "database_max_allocated_storage" {
  description = "Maximum database storage size in GB for autoscaling"
  type        = number
  default     = 1000
}

variable "redis_instance_type" {
  description = "ElastiCache Redis instance type"
  type        = string
  default     = "cache.r5.large"
  
  validation {
    condition     = can(regex("^cache\\.(r5|r6g)\\.(large|xlarge|2xlarge|4xlarge)$", var.redis_instance_type))
    error_message = "Redis instance type must be production-ready (r5 or r6g, large or larger)."
  }
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters in the Redis replication group"
  type        = number
  default     = 3
  
  validation {
    condition     = var.redis_num_cache_clusters >= 2
    error_message = "Redis cluster must have at least 2 nodes for high availability."
  }
}

variable "alb_access_logs_retention" {
  description = "ALB access logs retention period in days"
  type        = number
  default     = 90
}

variable "enable_waf" {
  description = "Enable AWS WAF for additional security"
  type        = bool
  default     = true
}

variable "enable_shield_advanced" {
  description = "Enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = false
}

variable "cost_allocation_tags" {
  description = "Additional tags for cost allocation"
  type        = map(string)
  default = {
    CostCenter = "engineering"
    Owner      = "platform-team"
  }
}

variable "notification_email" {
  description = "Email for production alerts and notifications"
  type        = string
  default     = "alerts@aicode-platform.com"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.notification_email))
    error_message = "Must provide a valid email address for production notifications."
  }
}

variable "maintenance_window" {
  description = "Maintenance window for database and cache updates"
  type        = string
  default     = "sun:04:00-sun:06:00"
  
  validation {
    condition     = can(regex("^(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]-(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in format 'ddd:hh:mm-ddd:hh:mm'."
  }
}

variable "backup_window" {
  description = "Backup window for database backups"
  type        = string
  default     = "03:00-04:00"
  
  validation {
    condition     = can(regex("^[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]$", var.backup_window))
    error_message = "Backup window must be in format 'hh:mm-hh:mm'."
  }
}