#!/usr/bin/env bash
set -euo pipefail

# Compliance-Disco — Quick Pipeline Trigger
# Usage: ./run.sh [regulation_name]
# Reads latest handoff from monitor-to-coordinator.md and runs full pipeline.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

HANDOFF="workspace/shared-data/handoffs/monitor-to-coordinator.md"

if [[ ! -f "$HANDOFF" ]]; then
  echo "ERROR: No monitor handoff found at $HANDOFF"
  echo "Run monitor first: hermes cron tick"
  exit 1
fi

# Extract regulation name from handoff
REGULATION=$(python3 -c "
import json, sys
with open('$HANDOFF') as f:
    h = json.load(f)
print(h.get('regulation_name', 'Unknown'))
" 2>/dev/null || echo "Unknown")

echo "━━━ Compliance-Disco Pipeline ━━━"
echo "  Regulation: $REGULATION"
echo "  Handoff:    $HANDOFF"
echo ""

hermes profile use coordinator 2>/dev/null || true
hermes -z "Read $HANDOFF. The regulation to process is '$REGULATION'. Run the full compliance pipeline: extract from PDFs, then run marketing and engineering in parallel, then consolidate into final-report.md."
