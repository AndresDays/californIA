#!/usr/bin/env bash
set -euo pipefail

set +e
output="$(SUPABASE_DB_URL='' BACKUP_AGE_PUBLIC_KEY='' bash backups/backup.sh 2>&1)"
status=$?
set -e

test "$status" -eq 64
grep -q 'Falta SUPABASE_DB_URL' <<<"$output"
