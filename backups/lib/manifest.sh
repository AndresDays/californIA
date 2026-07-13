#!/usr/bin/env bash

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_manifest() {
  local target="$1"
  local backup_date="$2"
  local source_dir="$3"
  local first=true

  {
    printf '{"backup_date":"%s","artifacts":[' "$(json_escape "$backup_date")"

    while IFS= read -r -d '' file; do
      if "$first"; then
        first=false
      else
        printf ','
      fi

      printf '{"name":"%s","sha256":"%s"}' \
        "$(json_escape "$(basename "$file")")" \
        "$(shasum -a 256 "$file" | awk '{print $1}')"
    done < <(find "$source_dir" -type f -print0 | sort -z)

    printf ']}\n'
  } > "$target"
}
