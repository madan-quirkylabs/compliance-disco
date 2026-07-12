#!/usr/bin/env bash
# Marketing-Compliance agent — acts as a PRODUCT MANAGER for the marketing team.
# Produces ONE deliverable: marketing-requirements.md, plus a handoff back to the coordinator.
#
# Usage (from repo root):  ./run_marketing.sh
# Uses your current Hermes profile + model. Needs a tool-capable model
# (DeepSeek / qwen3:8b work; qwen3:4b does NOT call tools).
# Drop --yolo if you'd rather approve each tool call manually.
set -uo pipefail
cd "$(dirname "$0")"

# Default to the persistent compliance profile (override by exporting HERMES_HOME)
export HERMES_HOME="${HERMES_HOME:-$HOME/.hermes/profiles/compliance}"

EXTRACTED="workspace/shared-data/extracted-regulations"
OUT="workspace/shared-data/marketing-output"
HANDOFFS="workspace/shared-data/handoffs"
mkdir -p "$OUT" "$HANDOFFS"

# single deliverable — clear old outputs so the result is unambiguous
find "$OUT" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
rm -f "$HANDOFFS/marketing-to-coordinator.md"

hermes chat -Q --yolo --max-turns 25 -q "You are the Marketing-Compliance agent. Act as a PRODUCT MANAGER for the marketing team: translate the regulation into concrete marketing compliance requirements.

Read (path relative to the current directory):
- $EXTRACTED/obligations.json   — the compliance obligations (use their REAL ids, e.g. D-05, D-06)

Consider these marketing channels/practices: promotional email, SMS, WhatsApp outreach, web signup/consent forms, ad targeting & retargeting, analytics/tracking pixels, purchased/imported lead lists.

Produce EXACTLY ONE file: $OUT/marketing-requirements.md — a marketing compliance requirements document.
Start with a one-paragraph summary, then a numbered list of requirements. For EACH requirement include:
  - Requirement ID (MREQ-1, MREQ-2, ...)
  - Obligation it satisfies (the real id from obligations.json)
  - Requirement statement (what marketing must change or do)
  - Acceptance criteria
  - Priority (P0 / P1 / P2)
  - Affected channel/practice
Do NOT create any other files — exactly one .md.

Then write ONE handoff file $HANDOFFS/marketing-to-coordinator.md as JSON with fields:
from='marketing-agent', to='coordinator', status='complete', regulation_name='DPDP Act 2023',
artifact='marketing-requirements.md', notes=<one line>.
Actually call write_file for both files."
