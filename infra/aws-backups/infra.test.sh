#!/usr/bin/env bash
set -euo pipefail

grep -q 'aws_s3_bucket_versioning' infra/aws-backups/main.tf
grep -q 'aws_s3_bucket_object_lock_configuration' infra/aws-backups/main.tf
grep -q 'aws_s3_bucket_public_access_block' infra/aws-backups/main.tf
grep -q 'aws_kms_key' infra/aws-backups/main.tf
grep -q 'aws_secretsmanager_secret' infra/aws-backups/main.tf
grep -q 'aws_cloudwatch_event_rule' infra/aws-backups/main.tf
grep -q 'aws_ecs_task_definition' infra/aws-backups/main.tf
grep -q 'aws_cloudwatch_metric_alarm' infra/aws-backups/main.tf
