#!/bin/bash
# Blocks Claude from finishing a turn while lint or typecheck fail (PLAN.md Phase 0 guardrail).
cd "$CLAUDE_PROJECT_DIR" || exit 0
out=$( (npm run -s lint && npm run -s typecheck) 2>&1 ) || { echo "Lint/typecheck failing — fix before finishing:" >&2; echo "$out" | tail -40 >&2; exit 2; }
exit 0
