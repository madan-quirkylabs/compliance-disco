#!/usr/bin/env bash
set -euo pipefail

# Compliance-Disco — Hermes Profile Setup
# Run from project root: ./setup.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "=== Compliance-Disco Setup ==="
echo "Project root: $PROJECT_ROOT"
echo ""

# Check hermes is installed
if ! command -v hermes &>/dev/null; then
  echo "ERROR: Hermes Agent not found. Install first:"
  echo "  pip install hermes-agent"
  echo "  OR: curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  exit 1
fi

echo "Hermes version: $(hermes --version 2>/dev/null || echo 'unknown')"
echo ""

# Agent profiles to create
AGENTS=("regulatory-reader" "coordinator" "marketing-agent" "engineering-agent" "consolidator")
DESCRIPTIONS=(
  "Reads DPDP regulation PDFs, extracts structured compliance data"
  "Orchestrates pipeline, dispatches subagents, monitors completion"
  "Produces customer-facing compliance guides, checklists, FAQs"
  "Produces technical compliance artifacts — schemas, templates, architecture"
  "Merges all outputs, cross-validates, produces final compliance report"
)

# Create profiles
for i in "${!AGENTS[@]}"; do
  NAME="${AGENTS[$i]}"
  DESC="${DESCRIPTIONS[$i]}"
  PROFILE_DIR="$PROJECT_ROOT/agents/$NAME"

  echo "--- Creating profile: $NAME ---"

  # Create Hermes profile with separate HERMES_HOME
  export HERMES_HOME="$PROFILE_DIR/.hermes"
  mkdir -p "$HERMES_HOME"

  # Copy SOUL.md if it exists
  if [[ -f "$PROFILE_DIR/SOUL.md" ]]; then
    cp "$PROFILE_DIR/SOUL.md" "$HERMES_HOME/SOUL.md"
    echo "  Copied SOUL.md"
  fi

  # Create memory directory
  mkdir -p "$HERMES_HOME/memories"

  # Initialize MEMORY.md
  cat > "$HERMES_HOME/memories/MEMORY.md" << EOF
# $NAME — Memory

## Project
Compliance-Disco: DPDP Act compliance automation pipeline.

## Role
$DESC

## Key Paths
- Project root: $PROJECT_ROOT
- Shared data: $PROJECT_ROOT/workspace/shared-data/
- Extracted regulations: $PROJECT_ROOT/workspace/shared-data/extracted-regulations/
EOF
  echo "  Initialized MEMORY.md"

  # Create skills directory and copy skills
  mkdir -p "$HERMES_HOME/skills"
  if [[ -d "$PROFILE_DIR/skills" ]]; then
    cp -r "$PROFILE_DIR/skills/"* "$HERMES_HOME/skills/" 2>/dev/null || true
    echo "  Copied skills"
  fi

  # Create minimal config.yaml
  cat > "$HERMES_HOME/config.yaml" << EOF
# Hermes config for: $NAME
# Adjust model/provider as needed for the hackathon

model:
  provider: openai-api
  default: gpt-5.6-sol

terminal:
  backend: local

agent:
  max_turns: 50
  tool_loop_guardrails:
    hard_stop_enabled: true
EOF
  echo "  Created config.yaml"

  # Create .env template (user fills in API keys)
  if [[ ! -f "$HERMES_HOME/.env" ]]; then
    cat > "$HERMES_HOME/.env" << EOF
# API Keys — fill in before running
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
EOF
    echo "  Created .env template"
  fi

  echo ""
done

# Create USER.md template in coordinator (it manages the team)
COORD_HOME="$PROJECT_ROOT/agents/coordinator/.hermes"
cat > "$COORD_HOME/memories/USER.md" << 'EOF'
# Team Context

## Team
3-person team at Hermes Buildathon 2026.

## Communication
- Coordinator is the central hub
- Marketing and Engineering work in parallel
- All agents share workspace at project root

## Preferences
- Output: structured markdown and JSON
- Tone: technical, no fluff
- Priority: completeness > speed
EOF

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Fill in API keys: agents/*/.hermes/.env"
echo "  2. Adjust model in agents/*/config.yaml if needed"
echo "  3. Test the pipeline:"
echo "       cd $PROJECT_ROOT"
echo "       hermes 'Read and extract all DPDP Act documents from docs/regulations/dpdp/'"
echo ""
echo "Profiles created:"
for NAME in "${AGENTS[@]}"; do
  echo "  - $NAME (HERMES_HOME: agents/$NAME/.hermes/)"
done
