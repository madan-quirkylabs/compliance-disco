#!/usr/bin/env bash
set -euo pipefail

# Compliance-Disco — Hermes Profile Setup
# Run from project root: ./setup.sh
#
# This creates Hermes profiles for each agent and configures cron monitoring.
# Prerequisites: hermes-agent installed, API keys ready.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════╗"
echo "║   Compliance-Disco — Hermes Profile Setup         ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── Check prerequisites ──────────────────────────────────────────────

if ! command -v hermes &>/dev/null; then
  echo "ERROR: Hermes Agent not found. Install first:"
  echo "  pip install hermes-agent"
  echo "  OR: curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  exit 1
fi

echo "Hermes version: $(hermes --version 2>/dev/null || echo 'unknown')"
echo ""

# ── Create profiles using hermes profile create ──────────────────────

# The coordinator is the main profile. Other agents are invoked by the
# coordinator via delegate_task, so they don't need separate profiles.
# The monitor is the only exception — it runs on its own cron schedule.

echo "━━━ Creating Coordinator Profile ━━━"
if hermes profile create coordinator --description "Orchestrates the full compliance pipeline" 2>/dev/null; then
  echo "  ✓ Profile 'coordinator' created"
else
  echo "  ℹ Profile 'coordinator' may already exist"
fi

# Set up coordinator's HERMES_HOME
COORD_HOME="${HERMES_HOME:-$HOME/.hermes}"
if [[ -d "$HOME/.hermes-coordinator" ]]; then
  COORD_HOME="$HOME/.hermes-coordinator"
fi

echo ""
echo "━━━ Creating Monitor Profile ━━━"
if hermes profile create monitor --description "Watches regulatory bodies for new publications" 2>/dev/null; then
  echo "  ✓ Profile 'monitor' created"
else
  echo "  ℹ Profile 'monitor' may already exist"
fi

echo ""

# ── Copy SOUL.md files to profile directories ────────────────────────

# For the coordinator profile (main profile)
SOUL_SRC="$PROJECT_ROOT/agents/coordinator/SOUL.md"
if [[ -f "$SOUL_SRC" ]]; then
  cp "$SOUL_SRC" "$COORD_HOME/SOUL.md"
  echo "Copied coordinator SOUL.md → $COORD_HOME/SOUL.md"
fi

# Copy skills
if [[ -d "$PROJECT_ROOT/agents/coordinator/skills" ]]; then
  mkdir -p "$COORD_HOME/skills"
  cp -r "$PROJECT_ROOT/agents/coordinator/skills/"* "$COORD_HOME/skills/" 2>/dev/null || true
  echo "Copied coordinator skills → $COORD_HOME/skills/"
fi

# Copy engineering agent's reference files (used by delegate_task subagent)
ENG_REFS="$PROJECT_ROOT/agents/engineering-agent/skills/build-compliance-artifacts/references"
if [[ -d "$ENG_REFS" ]]; then
  mkdir -p "$COORD_HOME/skills/build-compliance-artifacts/references"
  cp -r "$ENG_REFS"/* "$COORD_HOME/skills/build-compliance-artifacts/references/" 2>/dev/null || true
  echo "Copied engineering references → $COORD_HOME/skills/build-compliance-artifacts/references/"
fi

echo ""

# ── Generate config.yaml ─────────────────────────────────────────────

cat > "$COORD_HOME/config.yaml" << 'EOF'
# Compliance-Disco — Coordinator Config

model:
  provider: openai-api
  default: gpt-5.6-sol

fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-5

auxiliary:
  compression:       { provider: openrouter, model: google/gemini-3-flash-preview }
  background_review: { provider: openrouter, model: google/gemini-3-flash-preview }
  goal_judge:        { provider: openrouter, model: google/gemini-3-flash-preview }

terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_network: true
  docker_volumes:
    - "/workspace"

compression:
  enabled: true
  threshold: 0.50
  protect_last_n: 20

agent:
  max_turns: 90
  tool_loop_guardrails:
    warnings_enabled: true
    hard_stop_enabled: true

skills:  { write_approval: false }
memory:  { write_approval: false }

cron:
  wrap_response: false
  script_timeout_seconds: 1800
EOF
echo "Generated config.yaml → $COORD_HOME/config.yaml"

# ── Generate .env template ───────────────────────────────────────────

if [[ ! -f "$COORD_HOME/.env" ]]; then
  cat > "$COORD_HOME/.env" << 'EOF'
# API Keys — fill in before running
OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# OPENROUTER_API_KEY=sk-or-your-key-here
EOF
  echo "Created .env template → $COORD_HOME/.env"
  echo "  ⚠  Fill in your API keys before running!"
else
  echo "ℹ .env already exists, skipping"
fi

echo ""

# ── Initialize workspace directories ─────────────────────────────────

echo "━━━ Initializing Workspace ━━━"
mkdir -p "$PROJECT_ROOT/workspace/shared-data/extracted-regulations"
mkdir -p "$PROJECT_ROOT/workspace/shared-data/marketing-output"
mkdir -p "$PROJECT_ROOT/workspace/shared-data/engineering-output"
mkdir -p "$PROJECT_ROOT/workspace/shared-data/consolidated-output"
mkdir -p "$PROJECT_ROOT/workspace/shared-data/handoffs"
mkdir -p "$PROJECT_ROOT/workspace/shared-data/monitored-sources"
mkdir -p "$PROJECT_ROOT/workspace/shared-data/detection-log"
mkdir -p "$PROJECT_ROOT/workspace/kanban"

# Initialize known-items.json if it doesn't exist
KNOWN="$PROJECT_ROOT/workspace/shared-data/monitored-sources/known-items.json"
if [[ ! -f "$KNOWN" ]]; then
  cat > "$KNOWN" << 'EOF'
{
  "sources": {
    "SEBI": { "last_checked": null, "items": [] },
    "AMFI": { "last_checked": null, "items": [] },
    "RBI": { "last_checked": null, "items": [] }
  }
}
EOF
  echo "Initialized known-items.json"
fi

echo ""

# ── Configure cron job for monitor ───────────────────────────────────

echo "━━━ Setting Up Cron Monitoring ━━━"

# Create the monitor cron job: runs every 6 hours, checks for new regulations
# The prompt is self-contained (cron sessions have no history)
hermes cron create "0 */6 * * *" \
  "You are the Regulatory Monitor. Check SEBI, AMFI, and RBI for new publications.

1. Read workspace/shared-data/monitored-sources/known-items.json for previously seen items.
2. Check these sources for new circulars/notifications:
   - SEBI: https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doCirculars=yes
   - AMFI: https://www.amfiindia.com/spages/Regulations.html
   - RBI: https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx
3. For any new item NOT in known-items.json:
   a. Save the document to docs/regulations/{body}/
   b. Write detection to workspace/shared-data/detection-log/
   c. Write handoff to workspace/shared-data/handoffs/monitor-to-coordinator.md
   d. Update known-items.json
4. If nothing new, respond with [SILENT]." \
  --name compliance-monitor \
  --skill orchestrate-pipeline \
  2>/dev/null && echo "  ✓ Cron job 'compliance-monitor' created (every 6 hours)" || echo "  ℹ Cron job may already exist"

echo ""

# ── Summary ──────────────────────────────────────────────────────────

echo "╔═══════════════════════════════════════════════════╗"
echo "║   Setup Complete ✓                                ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Fill in API keys: $COORD_HOME/.env"
echo "  2. Install the gateway (required for cron):"
echo "       hermes gateway install"
echo "  3. Test the pipeline manually:"
echo "       cd $PROJECT_ROOT"
echo "       hermes 'Read workspace/shared-data/handoffs/monitor-to-coordinator.md and run the full compliance pipeline'"
echo "  4. Or run the test simulation:"
echo "       python3 test_pipeline.py --clean"
echo ""
echo "Cron schedule:"
echo "  compliance-monitor: every 6 hours (checks SEBI, AMFI, RBI)"
echo ""
echo "To add more regulatory bodies:"
echo "  Edit workspace/shared-data/monitored-sources/known-items.json"
