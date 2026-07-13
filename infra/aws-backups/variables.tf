variable "aws_region" {
  description = "Region where backup infrastructure is deployed."
  type        = string
  default     = "us-west-2"
}

variable "name_prefix" {
  description = "Prefix used for AWS resource names."
  type        = string
  default     = "california-production"
}

variable "backup_bucket_name" {
  description = "Globally unique S3 bucket name for encrypted backups."
  type        = string
}

variable "supabase_storage_buckets" {
  description = "Space-separated Supabase Storage bucket names to back up."
  type        = string
  default     = "radiologia"
}

variable "backup_schedule_expression" {
  description = "EventBridge schedule expression. Default runs daily at 08:00 UTC."
  type        = string
  default     = "cron(0 8 * * ? *)"
}

variable "schedule_enabled" {
  description = "Enable the daily schedule only after the image and runtime secret are ready."
  type        = bool
  default     = false
}

variable "subnet_ids" {
  description = "Private subnet IDs with NAT egress for the Fargate backup task."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for the Fargate backup task. No inbound rules are required."
  type        = list(string)
}

variable "alert_email" {
  description = "Email address that receives backup failure alarms. Confirm the SNS subscription after apply."
  type        = string
}

variable "task_cpu" {
  description = "Fargate CPU units."
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Fargate memory in MiB."
  type        = number
  default     = 1024
}
