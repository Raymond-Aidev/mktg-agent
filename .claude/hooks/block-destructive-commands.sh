#!/usr/bin/env bash
# Block obviously destructive shell commands.
# Approve bypass by explicit human instruction + temporary disable.
set -euo pipefail

input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

[[ -z "$cmd" ]] && exit 0

# Patterns considered destructive enough to block by default.
patterns=(
  'rm[[:space:]]+-rf[[:space:]]+/'          # rm -rf /
  'rm[[:space:]]+-rf[[:space:]]+~'          # rm -rf ~
  'rm[[:space:]]+-rf[[:space:]]+\.[[:space:]]*$'   # rm -rf .
  'git[[:space:]]+push[[:space:]]+.*--force'
  'git[[:space:]]+push[[:space:]]+.*-f([[:space:]]|$)'
  'git[[:space:]]+reset[[:space:]]+--hard[[:space:]]+origin'
  'DROP[[:space:]]+TABLE'
  'DROP[[:space:]]+DATABASE'
  'TRUNCATE[[:space:]]+TABLE'
  ':(){ :\|:& };:'                           # fork bomb
)

for p in "${patterns[@]}"; do
  if [[ "$cmd" =~ $p ]]; then
    echo "BLOCKED: Destructive command pattern detected: $p" >&2
    echo "Command: $cmd" >&2
    echo "If this is intentional, ask the human to run it directly." >&2
    exit 2
  fi
done

exit 0
