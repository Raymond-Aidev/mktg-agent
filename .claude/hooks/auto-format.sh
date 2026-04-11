#!/usr/bin/env bash
# Run prettier on the edited file if it matches supported extensions.
# Silent on success; logs to stderr on tool missing.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

[[ -z "$file_path" ]] && exit 0
[[ -f "$file_path" ]] || exit 0

case "$file_path" in
  *.ts|*.tsx|*.mts|*.cts|*.js|*.mjs|*.cjs|*.json|*.md|*.yml|*.yaml)
    ;;
  *)
    exit 0
    ;;
esac

if ! command -v pnpm >/dev/null 2>&1; then
  exit 0
fi

# Only format if prettier is actually installed (skip during bootstrap)
if [[ -x "node_modules/.bin/prettier" ]]; then
  node_modules/.bin/prettier --write "$file_path" >/dev/null 2>&1 || true
fi

exit 0
