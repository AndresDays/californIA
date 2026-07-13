#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/manifest.sh"

workdir="$(mktemp -d)"
manifest="$(mktemp)"
trap 'rm -rf "$workdir" "$manifest"' EXIT

printf 'contenido' > "$workdir/database.dump.age"
printf 'imagen' > "$workdir/radiologia.tar.age"

write_manifest "$manifest" "2026-07-12" "$workdir"

grep -q 'database.dump.age' "$manifest"
grep -q 'radiologia.tar.age' "$manifest"
grep -q 'sha256' "$manifest"
! grep -Eqi 'paciente|telefono|reporte|contenido|imagen' "$manifest"
