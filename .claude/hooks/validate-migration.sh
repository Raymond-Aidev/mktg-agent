#!/usr/bin/env bash
# Validate that new SQL migrations under db/migrations/ follow project rules:
#   1. Category A master tables (buyers/competitors/market_trends/rights_deals/bestsellers)
#      must declare source_uid, fingerprint, last_seen_at, updated_at, is_stale columns.
#   2. Every migration should have a matching rollback file (warning only).
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

[[ -z "$file_path" ]] && exit 0
[[ "$file_path" == *db/migrations/*.sql ]] || exit 0
[[ -f "$file_path" ]] || exit 0

# Rule 1: Category A tables must include common columns
if grep -qiE 'create[[:space:]]+table[[:space:]]+(if[[:space:]]+not[[:space:]]+exists[[:space:]]+)?(public\.)?(buyers|competitors|market_trends|rights_deals|bestsellers)' "$file_path"; then
  required=(source_uid fingerprint last_seen_at updated_at is_stale)
  missing=()
  for col in "${required[@]}"; do
    if ! grep -qi "$col" "$file_path"; then
      missing+=("$col")
    fi
  done
  if (( ${#missing[@]} > 0 )); then
    echo "ERROR: Category A master table in $file_path is missing required columns: ${missing[*]}" >&2
    echo "See docs/Technical_Specification_v1.0.md §1.2.4 for the common column contract." >&2
    exit 2
  fi
fi

# Rule 2: Warn if rollback file is missing
rollback="${file_path%.sql}.rollback.sql"
if [[ ! -f "$rollback" ]]; then
  echo "WARNING: rollback SQL not found: $rollback (non-blocking, please add before PR)." >&2
fi

exit 0
