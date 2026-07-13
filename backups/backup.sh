#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
source "$script_dir/lib/manifest.sh"

require_secret() {
  local name="$1"
  test -n "${!name:-}" || { echo "Falta $name" >&2; exit 64; }
}

for secret in \
  SUPABASE_DB_URL \
  SUPABASE_S3_ENDPOINT \
  SUPABASE_S3_ACCESS_KEY_ID \
  SUPABASE_S3_SECRET_ACCESS_KEY \
  SUPABASE_STORAGE_BUCKETS \
  BACKUP_AGE_PUBLIC_KEY \
  BACKUP_BUCKET \
  BACKUP_KMS_KEY_ID; do
  require_secret "$secret"
done

backup_date="$(date -u +%F)"
backup_root="/tmp/backup/$backup_date"
rclone_config="$(mktemp)"
trap 'rm -rf "$backup_root" "$rclone_config"' EXIT

retain_prefix_until() {
  local prefix="$1"
  local retain_until="$2"

  aws s3api list-objects-v2 \
    --bucket "$BACKUP_BUCKET" \
    --prefix "$prefix/" \
    --query 'Contents[].Key' \
    --output text \
    | tr '\t' '\n' \
    | while IFS= read -r key; do
      test -n "$key" || continue
      aws s3api put-object-retention \
        --bucket "$BACKUP_BUCKET" \
        --key "$key" \
        --retention "Mode=COMPLIANCE,RetainUntilDate=$retain_until"
    done
}

mkdir -p "$backup_root/storage"
cat > "$rclone_config" <<EOF
[supabase]
type = s3
provider = Other
env_auth = false
access_key_id = ${SUPABASE_S3_ACCESS_KEY_ID}
secret_access_key = ${SUPABASE_S3_SECRET_ACCESS_KEY}
endpoint = ${SUPABASE_S3_ENDPOINT}
EOF

pg_dump --format=custom --no-owner --no-privileges \
  --file "$backup_root/database.dump" "$SUPABASE_DB_URL"
age -r "$BACKUP_AGE_PUBLIC_KEY" \
  -o "$backup_root/database.dump.age" "$backup_root/database.dump"
rm -f "$backup_root/database.dump"

for bucket in $SUPABASE_STORAGE_BUCKETS; do
  rclone --config "$rclone_config" sync "supabase:$bucket" "$backup_root/storage/$bucket" --fast-list
  tar -C "$backup_root/storage" -cf - "$bucket" \
    | age -r "$BACKUP_AGE_PUBLIC_KEY" -o "$backup_root/${bucket}.tar.age"
  rm -rf "$backup_root/storage/$bucket"
done

write_manifest "$backup_root/manifest.json" "$backup_date" "$backup_root"

upload_prefix="daily/$backup_date"
aws s3 cp "$backup_root" "s3://$BACKUP_BUCKET/$upload_prefix/" \
  --recursive --only-show-errors --sse aws:kms --sse-kms-key-id "$BACKUP_KMS_KEY_ID"

if [ "$(date -u +%d)" = "01" ]; then
  monthly_prefix="monthly/${backup_date:0:7}"
  monthly_retain_until="$(date -u -d "$backup_date + 397 days" '+%Y-%m-%dT%H:%M:%SZ')"

  aws s3 cp "$backup_root" "s3://$BACKUP_BUCKET/$monthly_prefix/" \
    --recursive --only-show-errors --sse aws:kms --sse-kms-key-id "$BACKUP_KMS_KEY_ID"
  retain_prefix_until "$monthly_prefix" "$monthly_retain_until"
fi
