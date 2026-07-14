output "backup_bucket_name" {
  description = "S3 bucket where encrypted backups are stored."
  value       = aws_s3_bucket.backups.bucket
}

output "backup_kms_key_arn" {
  description = "KMS key ARN used for S3 server-side encryption."
  value       = aws_kms_key.backups.arn
}

output "backup_secret_name" {
  description = "Secrets Manager secret name that must be populated outside Terraform."
  value       = aws_secretsmanager_secret.backup_runtime.name
}

output "ecr_repository_url" {
  description = "Push the backup container image to this ECR repository."
  value       = aws_ecr_repository.backup.repository_url
}

output "eventbridge_rule_name" {
  description = "Daily backup schedule rule. It is disabled until schedule_enabled is true."
  value       = aws_cloudwatch_event_rule.daily_backup.name
}

output "backup_task_failure_rule_name" {
  description = "EventBridge rule that alerts when the backup ECS container exits with a non-zero code."
  value       = aws_cloudwatch_event_rule.backup_task_failed.name
}

output "backup_alert_topic_arn" {
  description = "SNS topic ARN used for backup schedule and ECS task failure alerts."
  value       = aws_sns_topic.backup_alerts.arn
}
