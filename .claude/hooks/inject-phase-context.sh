#!/usr/bin/env bash
# Inject current Phase line from CLAUDE.md into every user prompt.
# Claude Code reads stdout as additional context.
set -euo pipefail

if [[ ! -f CLAUDE.md ]]; then
  exit 0
fi

phase_line=$(awk '/^## 현재 Phase$/{getline; print; exit}' CLAUDE.md 2>/dev/null || true)

if [[ -n "$phase_line" ]]; then
  echo "<project-phase>"
  echo "현재 Phase: $phase_line"
  echo "상세 작업은 docs/Implementation_Plan_v1.0.md 참조."
  echo "</project-phase>"
fi

exit 0
