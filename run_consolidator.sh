#!/usr/bin/env bash
# Consolidator — merges the department requirement docs into one executive report.
# Reads the engineering + marketing requirements, writes final-report.md + a handoff.
#
# Usage (from repo root):  ./run_consolidator.sh
# Uses your current Hermes profile + model (DeepSeek / qwen3:8b; not qwen3:4b).
set -uo pipefail
cd "$(dirname "$0")"

ENG="workspace/shared-data/engineering-output/engineering-requirements.md"
MKT="workspace/shared-data/marketing-output/marketing-requirements.md"
OUT="workspace/shared-data/consolidated-output"
HANDOFFS="workspace/shared-data/handoffs"
mkdir -p "$OUT" "$HANDOFFS"

find "$OUT" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
rm -f "$HANDOFFS/consolidation-complete.md"

hermes chat -Q --yolo --max-turns 25 -q "You are the Consolidator. Merge the department requirements into ONE executive compliance report for leadership.

Read (paths relative to the current directory):
- $ENG   — engineering requirements (REQ-*)
- $MKT   — marketing requirements (MREQ-*)

Produce EXACTLY ONE file: $OUT/final-report.md containing:
1. Executive summary — 2-3 sentences on what the regulation demands across departments.
2. Consolidated priority table — P0 items first; columns: Requirement ID (REQ-*/MREQ-*), Department, Obligation, One-line action.
3. Cross-cutting themes — where engineering and marketing overlap (e.g. consent, erasure, retention) and shared dependencies (e.g. both need a central consent service).
4. Recommended sequencing — what to build/do first.
Do NOT create any other files — exactly one .md.

Then write ONE handoff file $HANDOFFS/consolidation-complete.md as JSON with fields:
from='consolidator', to='coordinator', status='complete', regulation_name='DPDP Act 2023',
artifact='final-report.md', notes=<one line>.
Actually call write_file for both files."
