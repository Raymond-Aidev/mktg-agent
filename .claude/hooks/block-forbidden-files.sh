#!/usr/bin/env bash
# Block edits to protected files (.env, lockfiles, already-applied migrations).
# Reads JSON from stdin per Claude Code hook protocol.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

[[ -z "$file_path" ]] && exit 0

# Normalize to basename for simple matches
base=$(basename "$file_path")

forbidden_basenames=(
  ".env"
  ".env.local"
  ".env.production"
  "package-lock.json"
  "pnpm-lock.yaml"
  "yarn.lock"
)

for f in "${forbidden_basenames[@]}"; do
  if [[ "$base" == "$f" ]]; then
    echo "BLOCKED: Editing $file_path is forbidden by project rules (see CLAUDE.md)." >&2
    exit 2
  fi
done

# Applied migrations protection: if file is under db/migrations/ and already in git history, block.
if [[ "$file_path" == *"/db/migrations/"* || "$file_path" == "db/migrations/"* ]]; then
  if git log --all --oneline -- "$file_path" 2>/dev/null | grep -q .; then
    echo "BLOCKED: Migration $file_path is already committed. Create a new migration instead." >&2
    exit 2
  fi
fi

exit 0
