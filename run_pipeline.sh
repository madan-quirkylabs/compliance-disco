#!/usr/bin/env bash
# Compliance-Disco — full pipeline in ONE command.
#
#   regulation obligations
#        ├─ engineering agent ─┐
#        └─ marketing agent  ──┤
#                              └─ consolidator ─→ final-report.md
#
# Usage (from repo root):   ./run_pipeline.sh
# Requires:
#   - workspace/shared-data/extracted-regulations/obligations.json  (the regulation input)
#   - a Hermes profile on a tool-capable model (DeepSeek / qwen3:8b; NOT qwen3:4b)
set -uo pipefail
cd "$(dirname "$0")"

echo "━━━ 1/3  Engineering requirements ━━━"
./run_engineering.sh  || echo "  (engineering step returned nonzero — continuing)"

echo "━━━ 2/3  Marketing requirements ━━━"
./run_marketing.sh    || echo "  (marketing step returned nonzero — continuing)"

echo "━━━ 3/3  Consolidating ━━━"
./run_consolidator.sh || echo "  (consolidator step returned nonzero — continuing)"

echo ""
echo "── Pipeline summary ──"
for f in \
  "workspace/shared-data/engineering-output/engineering-requirements.md" \
  "workspace/shared-data/marketing-output/marketing-requirements.md" \
  "workspace/shared-data/consolidated-output/final-report.md"; do
  if [[ -f "$f" ]]; then echo "  ✓ $f"; else echo "  ✗ MISSING: $f"; fi
done
echo ""
echo "Final report → workspace/shared-data/consolidated-output/final-report.md"
