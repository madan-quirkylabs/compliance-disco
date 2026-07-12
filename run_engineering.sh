#!/usr/bin/env bash
# Engineering-Compliance agent — acts as a PRODUCT MANAGER for the engineering team.
# Produces ONE deliverable: engineering-requirements.md, plus a handoff back to the coordinator.
#
# Usage (from repo root):  ./run_engineering.sh
# Uses your current Hermes profile + model. Needs a tool-capable model
# (DeepSeek / qwen3:8b work; qwen3:4b does NOT call tools).
# Drop --yolo if you'd rather approve each tool call manually.
set -uo pipefail
cd "$(dirname "$0")"

EXTRACTED="workspace/shared-data/extracted-regulations"
OUT="workspace/shared-data/engineering-output"
HANDOFFS="workspace/shared-data/handoffs"
REFS="agents/engineering-agent/skills/build-compliance-artifacts/references"
mkdir -p "$OUT" "$HANDOFFS"

# single deliverable — clear old outputs so the result is unambiguous
find "$OUT" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
rm -f "$HANDOFFS/engineering-to-coordinator.md"

hermes chat -Q --yolo --max-turns 25 -q "You are the Engineering-Compliance agent. Act as a PRODUCT MANAGER for the engineering team: translate the regulation into concrete engineering requirements the team can build against.

Read (paths relative to the current directory):
- $EXTRACTED/obligations.json   — the compliance obligations (use their REAL ids/provisions, e.g. D-05, D-06)
- $REFS/controls.md             — control-framework mapping (ISO 27001 / SOC 2 / NIST)
- $REFS/system-inventory.md     — the org's real systems and their gaps

Produce EXACTLY ONE file: $OUT/engineering-requirements.md — an engineering requirements document.
Start with a one-paragraph summary, then a numbered list of requirements. For EACH requirement include:
  - Requirement ID (REQ-1, REQ-2, ...)
  - Obligation it satisfies (the real id from obligations.json)
  - Requirement statement (what engineering must build)
  - Acceptance criteria
  - Priority (P0 / P1 / P2)
  - Affected system(s) from system-inventory.md
Do NOT create any other files — exactly one .md.

Then write ONE handoff file $HANDOFFS/engineering-to-coordinator.md as JSON with fields:
from='engineering-agent', to='coordinator', status='complete', regulation_name='DPDP Act 2023',
artifact='engineering-requirements.md', notes=<one line>.
Actually call write_file for both files."
