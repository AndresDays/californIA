terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = {
    Application = "CalifornIA"
    Environment = "production"
    ManagedBy   = "terraform"
    Purpose     = "encrypted-backups"
  }

  secret_name = "${var.name_prefix}/backup-runtime"
}

resource "aws_kms_key" "backups" {
  description             = "CalifornIA encrypted backups"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "backups" {
  name          = "alias/${var.name_prefix}-backups"
  target_key_id = aws_kms_key.backups.key_id
}

resource "aws_s3_bucket" "backups" {
  bucket              = var.backup_bucket_name
  object_lock_enabled = true

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.backups.arn
      sse_algorithm     = "aws:kms"
    }

    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_object_lock_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 35
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "daily-retention"
    status = "Enabled"

    filter {
      prefix = "daily/"
    }

    expiration {
      days = 36
    }

    noncurrent_version_expiration {
      noncurrent_days = 36
    }
  }

  rule {
    id     = "monthly-retention"
    status = "Enabled"

    filter {
      prefix = "monthly/"
    }

    transition {
      days          = 30
      storage_class = "GLACIER_IR"
    }

    expiration {
      days = 397
    }

    noncurrent_version_expiration {
      noncurrent_days = 397
    }
  }
}

resource "aws_s3_bucket_policy" "backups" {
  bucket = aws_s3_bucket.backups.id
  policy = data.aws_iam_policy_document.backup_bucket.json
}

data "aws_iam_policy_document" "backup_bucket" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.backups.arn,
      "${aws_s3_bucket.backups.arn}/*"
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_secretsmanager_secret" "backup_runtime" {
  name        = local.secret_name
  description = "Runtime secrets for the CalifornIA encrypted Supabase backup task. Set value outside Terraform state."

  tags = local.common_tags
}

resource "aws_ecr_repository" "backup" {
  name                 = "${var.name_prefix}-backup"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "backup" {
  name              = "/ecs/${var.name_prefix}-backup"
  retention_in_days = 90

  tags = local.common_tags
}

resource "aws_ecs_cluster" "backups" {
  name = "${var.name_prefix}-backups"

  tags = local.common_tags
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${var.name_prefix}-backup-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role" "ecs_task" {
  name               = "${var.name_prefix}-backup-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json

  tags = local.common_tags
}

data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "${var.name_prefix}-backup-execution-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    effect = "Allow"

    actions = [
      "secretsmanager:GetSecretValue"
    ]

    resources = [aws_secretsmanager_secret.backup_runtime.arn]
  }
}

resource "aws_iam_role_policy" "ecs_task_backup" {
  name   = "${var.name_prefix}-backup-task-access"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_backup.json
}

data "aws_iam_policy_document" "ecs_task_backup" {
  statement {
    effect = "Allow"

    actions = [
      "s3:ListBucket"
    ]

    resources = [aws_s3_bucket.backups.arn]
  }

  statement {
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:PutObjectRetention"
    ]

    resources = ["${aws_s3_bucket.backups.arn}/*"]
  }

  statement {
    effect = "Allow"

    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:GenerateDataKey"
    ]

    resources = [aws_kms_key.backups.arn]
  }
}

resource "aws_ecs_task_definition" "backup" {
  family                   = "${var.name_prefix}-backup"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backup"
      image     = "${aws_ecr_repository.backup.repository_url}:latest"
      essential = true
      environment = [
        { name = "BACKUP_BUCKET", value = aws_s3_bucket.backups.bucket },
        { name = "BACKUP_KMS_KEY_ID", value = aws_kms_key.backups.arn },
        { name = "SUPABASE_STORAGE_BUCKETS", value = var.supabase_storage_buckets }
      ]
      secrets = [
        { name = "SUPABASE_DB_URL", valueFrom = "${aws_secretsmanager_secret.backup_runtime.arn}:SUPABASE_DB_URL::" },
        { name = "SUPABASE_S3_ENDPOINT", valueFrom = "${aws_secretsmanager_secret.backup_runtime.arn}:SUPABASE_S3_ENDPOINT::" },
        { name = "SUPABASE_S3_ACCESS_KEY_ID", valueFrom = "${aws_secretsmanager_secret.backup_runtime.arn}:SUPABASE_S3_ACCESS_KEY_ID::" },
        { name = "SUPABASE_S3_SECRET_ACCESS_KEY", valueFrom = "${aws_secretsmanager_secret.backup_runtime.arn}:SUPABASE_S3_SECRET_ACCESS_KEY::" },
        { name = "BACKUP_AGE_PUBLIC_KEY", valueFrom = "${aws_secretsmanager_secret.backup_runtime.arn}:BACKUP_AGE_PUBLIC_KEY::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backup.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_cloudwatch_event_rule" "daily_backup" {
  name                = "${var.name_prefix}-daily-backup"
  description         = "Runs encrypted CalifornIA backups once per day."
  schedule_expression = var.backup_schedule_expression
  state               = var.schedule_enabled ? "ENABLED" : "DISABLED"

  tags = local.common_tags
}

resource "aws_iam_role" "eventbridge_run_task" {
  name               = "${var.name_prefix}-backup-scheduler"
  assume_role_policy = data.aws_iam_policy_document.eventbridge_assume_role.json

  tags = local.common_tags
}

data "aws_iam_policy_document" "eventbridge_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role_policy" "eventbridge_run_task" {
  name   = "${var.name_prefix}-backup-run-task"
  role   = aws_iam_role.eventbridge_run_task.id
  policy = data.aws_iam_policy_document.eventbridge_run_task.json
}

data "aws_iam_policy_document" "eventbridge_run_task" {
  statement {
    effect = "Allow"

    actions   = ["ecs:RunTask"]
    resources = [aws_ecs_task_definition.backup.arn]
  }

  statement {
    effect = "Allow"

    actions = ["iam:PassRole"]
    resources = [
      aws_iam_role.ecs_execution.arn,
      aws_iam_role.ecs_task.arn
    ]
  }
}

resource "aws_cloudwatch_event_target" "daily_backup" {
  rule     = aws_cloudwatch_event_rule.daily_backup.name
  arn      = aws_ecs_cluster.backups.arn
  role_arn = aws_iam_role.eventbridge_run_task.arn

  ecs_target {
    task_definition_arn = aws_ecs_task_definition.backup.arn
    launch_type         = "FARGATE"
    platform_version    = "LATEST"

    network_configuration {
      subnets          = var.subnet_ids
      security_groups  = var.security_group_ids
      assign_public_ip = true
    }
  }
}

resource "aws_sns_topic" "backup_alerts" {
  name = "${var.name_prefix}-backup-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "backup_email" {
  topic_arn = aws_sns_topic.backup_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "backup_failure" {
  alarm_name          = "${var.name_prefix}-backup-failure"
  alarm_description   = "EventBridge failed to invoke the backup task."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FailedInvocations"
  namespace           = "AWS/Events"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    RuleName = aws_cloudwatch_event_rule.daily_backup.name
  }

  alarm_actions = [aws_sns_topic.backup_alerts.arn]

  tags = local.common_tags
}
