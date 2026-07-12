# Compliance-Disco

Automated compliance monitoring and multi-department analysis for any regulation.
Built on [Hermes Agent](https://hermes-agent.nousresearch.com/) — "AI as Agency" track, Hermes Buildathon 2026.

## What This Does for You

As a Chief Compliance Officer, you watch 10+ regulatory bodies for changes.
This system does that for you — automatically, 24/7.

When a new regulation, circular, or notification is published by SEBI, AMFI,
RBI, or any other body you configure, the system:

1. **Detects** the new publication (cron-driven monitoring, every 6 hours)
2. **Extracts** structured obligations, timelines, and penalties
3. **Analyzes** the impact from every department's perspective:
   - **Marketing:** customer-facing compliance guides, checklists, FAQs
   - **Engineering:** technical controls, data schemas, implementation plans
4. **Delivers** a unified compliance report with actionable next steps

## How to Use It

### One-Time Setup (requires Hermes Agent)

```bash
# 1. Install Hermes Agent
pip install hermes-agent

# 2. Run setup (creates profiles, configures cron, initializes workspace)
./setup.sh

# 3. Fill in your API key
vim ~/.hermes/.env   # or wherever your HERMES_HOME points

# 4. Install the gateway (required for cron to work)
hermes gateway install
```

### Day-to-Day: Fully Automatic

The monitor runs every 6 hours via cron. When it detects a new regulation,
the full pipeline runs automatically:

```
Monitor detects → Reader extracts → Coordinator dispatches
  → Marketing writes guide + checklist
  → Engineering writes technical plan
  → Consolidator merges → final-report.md
```

### Run Manually Anytime

```bash
# Trigger the full pipeline
hermes "Run the compliance pipeline for the latest SEBI circular"

# Or test with the simulation
python3 test_pipeline.py --clean

# Run with failure mode tests
python3 test_pipeline.py --clean --test-failures
```

### On-Demand Analysis

```bash
# Ask about a specific regulation
hermes "What are the penalties under the DPDP Act?"

# Get the engineering perspective
hermes "What technical controls do we need for the new RBI circular?"

# Get the executive summary
hermes "Give me the bottom line on the latest regulation"
```

### View the Dashboard

```bash
# Serve the dashboard locally
cd web && python3 -m http.server 8080
# Open http://localhost:8080
```

### Adding Regulatory Bodies

Edit `workspace/shared-data/monitored-sources/known-items.json`:
```json
{
  "sources": {
    "SEBI": { "last_checked": null, "items": [] },
    "AMFI": { "last_checked": null, "items": [] },
    "RBI": { "last_checked": null, "items": [] },
    "IRDAI": { "last_checked": null, "items": [] },
    "TRAI": { "last_checked": null, "items": [] }
  }
}
```

## Architecture

Six AI agents working in a pipeline, orchestrated by the Coordinator using `delegate_task`:

```
  ┌─────────────────────┐
  │  Regulatory Monitor  │  ← Cron: every 6 hours, watches SEBI/AMFI/RBI
  └──────────┬──────────┘
             │ handoff
             ▼
  ┌─────────────────────┐
  │    Coordinator       │  ← Single orchestrator, invokes all agents
  └──┬──────┬──────┬───┘
     │      │      │
     ▼      ▼      ▼
  Reader  Marketing  Engineering   ← delegate_task subagents
     │      │      │
     ▼      ▼      ▼
  ┌─────────────────────┐
  │    Consolidator      │  ← Merges all outputs → final-report.md
  └─────────────────────┘
```

The Coordinator is the single Hermes session that runs the full pipeline.
Other agents are invoked as ephemeral subagents via `delegate_task`.

## Testing

```bash
# Full pipeline simulation with 192 assertions
python3 test_pipeline.py --clean --test-failures

# Outputs:
#   workspace/shared-data/extracted-regulations/  (5 files)
#   workspace/shared-data/marketing-output/      (4 files)
#   workspace/shared-data/engineering-output/    (4 files)
#   workspace/shared-data/consolidated-output/   (final-report.md)
#   workspace/shared-data/run-history/           (observability logs)
```

## Requirements

- Hermes Agent v0.14+
- API key for an LLM provider (OpenAI, Anthropic, etc.)
- Docker (for unattended agent execution)

## License

MIT — built for Hermes Buildathon 2026.
