#!/usr/bin/env bash
# One-time setup: create the "compliance" Hermes profile used by the run_*.sh scripts.
# Model: DeepSeek V4 Flash (hosted API). Terminal backend: local.
#
# Usage:
#   export DEEPSEEK_API_KEY="sk-..."   # or you'll be prompted
#   ./setup_profile.sh
#
# The API key is written only to the profile home (~/.hermes/profiles/compliance),
# which is OUTSIDE this repo — it is never committed.
set -euo pipefail

KEY="${DEEPSEEK_API_KEY:-}"
if [[ -z "$KEY" ]]; then
  read -rsp "Enter your DeepSeek API key (sk-...): " KEY; echo
fi
[[ -z "$KEY" ]] && { echo "ERROR: a DeepSeek API key is required"; exit 1; }

# register the profile (ignore error if it already exists)
hermes profile create compliance --description "Compliance pipeline (DeepSeek V4 Flash)" 2>/dev/null || true

CHOME="$HOME/.hermes/profiles/compliance"
mkdir -p "$CHOME"
cat > "$CHOME/config.yaml" <<EOF
# Compliance pipeline profile — DeepSeek V4 Flash, local backend
model:
  provider: custom
  default: deepseek-v4-flash
  base_url: "https://api.deepseek.com/v1"
  api_key: "$KEY"
  context_length: 100000

terminal:
  backend: local

agent:
  max_turns: 50
  tool_loop_guardrails:
    hard_stop_enabled: true

skills:  { write_approval: false }
memory:  { write_approval: false }
EOF
chmod 600 "$CHOME/config.yaml"

echo "✓ 'compliance' profile ready at $CHOME"
echo "  Test it:  HERMES_HOME=\"$CHOME\" hermes chat -Q -q 'reply OK'"
hermes profile list 2>/dev/null | grep -i compliance || true
