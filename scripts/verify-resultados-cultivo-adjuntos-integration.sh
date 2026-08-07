#!/usr/bin/env bash
set -euo pipefail

# PARTIAL STORAGE SMOKE TEST. It verifies only deterministic Storage upload and
# rejection of a second path with an active tecnico/quimico/admin/desarrollador token.
# It requires a real cultivo estudio_venta id and an existing small PDF fixture.
: "${SUPABASE_URL:?Set SUPABASE_URL}"
: "${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY}"
: "${CULTIVO_ACCESS_TOKEN:?Set CULTIVO_ACCESS_TOKEN}"
: "${CULTIVO_TEST_STUDY_ID:?Set CULTIVO_TEST_STUDY_ID}"
: "${CULTIVO_TEST_PDF:?Set CULTIVO_TEST_PDF to a PDF fixture path}"

bucket='resultados-cultivo-adjuntos'
path="${CULTIVO_TEST_STUDY_ID}/cultivo.pdf"
auth_headers=(
	-H "apikey: ${SUPABASE_ANON_KEY}"
	-H "Authorization: Bearer ${CULTIVO_ACCESS_TOKEN}"
)

# Replacements must use the one deterministic object name with upsert enabled.
curl --fail --silent --show-error -X POST "${SUPABASE_URL}/storage/v1/object/${bucket}/${path}" \
	"${auth_headers[@]}" \
	-H 'Content-Type: application/pdf' \
	-H 'x-upsert: true' \
	--data-binary "@${CULTIVO_TEST_PDF}" >/dev/null

# The same role must not be able to create an arbitrary object name in this bucket.
invalid_status="$(curl --silent --output /dev/null --write-out '%{http_code}' -X POST "${SUPABASE_URL}/storage/v1/object/${bucket}/${CULTIVO_TEST_STUDY_ID}/otro.pdf" \
	"${auth_headers[@]}" \
	-H 'Content-Type: application/pdf' \
	-H 'x-upsert: true' \
	--data-binary "@${CULTIVO_TEST_PDF}")"
if [[ "${invalid_status}" =~ ^2 ]]; then
	echo 'RLS allowed a non-deterministic cultivo object path.' >&2
	exit 1
fi

echo 'Partial Storage smoke test passed.'
echo 'Not checked: metadata upsert, validado/muestra state, secure RPC path response, or direct RPC denial.'
echo 'Manually verify those with a real released cultivo after metadata upsert.'
