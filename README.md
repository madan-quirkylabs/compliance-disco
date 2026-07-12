# Compliance-Disco

Automated compliance monitoring and multi-department analysis for any regulation.
Built on [Hermes Agent](https://hermes-agent.nousresearch.com/) — "AI as Agency" track, Hermes Buildathon 2026.

## What This Does for You

As a Chief Compliance Officer, you watch 10+ regulatory bodies for changes.
This system does that for you — automatically, 24/7.

When a new regulation, circular, or notification is published by SEBI, AMFI,
RBI, IRDAI, TRAI, or any other body you configure, the system:

1. **Detects** the new publication (cron-driven monitoring)
2. **Extracts** structured obligations, timelines, and penalties
3. **Analyzes** the impact from every department's perspective:
   - **Marketing:** customer-facing compliance guides, checklists, FAQs
   - **Engineering:** technical controls, data schemas, implementation plans
4. **Delivers** a unified compliance report — no manual work required

You go from "something changed, now what?" to "here's exactly what we need
to do, who needs to do it, and by when" — automatically.

## How to Use It

### One-Time Setup (30 minutes)

Requires a technical person to run once. You don't need to do this yourself.

```bash
# Install Hermes Agent
pip install hermes-agent

# Set up all agent profiles
./setup.sh

# Add your API key to any agent's config
# Edit agents/regulatory-monitor/.hermes/.env
```

### Day-to-Day: Nothing

The system runs on autopilot. Here's what happens without you lifting a finger:

```
Every 6-12 hours (configurable):
  Monitor checks SEBI, AMFI, RBI websites
       │
       ├── Nothing new → [SILENT] (no notification, no cost)
       │
       └── New regulation found!
            │
            ├── Saves the document
            ├── Extracts obligations, definitions, penalties
            ├── Marketing agent writes compliance guide + checklist
            ├── Engineering agent writes technical implementation plan
            └── Consolidator merges everything → final-report.md
```

You get a report. That's it.

### What You Receive

A unified compliance report at `workspace/shared-data/consolidated-output/final-report.md`
containing:

| Section | What's In It |
|---------|-------------|
| **Executive Summary** | Plain-English overview of what changed and why it matters |
| **Business Obligations** | What you must do, who must do it, by when |
| **Penalties** | What happens if you don't comply (amounts and conditions) |
| **Compliance Checklist** | Actionable items sorted by priority with deadlines and owners |
| **Technical Implementation** | What engineering needs to build (consent mechanisms, data controls, etc.) |
| **30-60-90 Day Plan** | Phased rollout with effort estimates |
| **FAQ** | Answers to the questions your team will ask |
| **Gaps & Recommendations** | What's ambiguous, what needs clarification, what to do first |

### On-Demand Analysis

You can also trigger an analysis manually at any time:

```bash
# "Hey, SEBI just published something about data localization"
hermes-monitor "Check SEBI for the new data localization circular"

# "Run the full pipeline on this document I just downloaded"
hermes-reader "Extract all regulations from docs/regulations/sebi/"

# "What does this mean for our engineering team?"
hermes-engineering "Analyze the impact of the new SEBI circular on our systems"

# "Give me the executive summary"
hermes-consolidator "What's the bottom line on the latest regulation?"
```

### Adding New Regulatory Bodies

The system watches SEBI, AMFI, and RBI by default. To add more:

1. Edit `workspace/shared-data/monitored-sources/known-items.json`
2. Add the new body under `"sources"`:
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
3. The monitor agent will start watching the new source on its next cron tick.

### Adding New Regulations for Analysis

Drop a PDF into the appropriate directory and run:

```bash
# Put the document where the reader can find it
cp ~/Downloads/sebi-circular-2026.pdf docs/regulations/sebi/

# Trigger the pipeline
hermes-reader "Extract and analyze docs/regulations/sebi/sebi-circular-2026.pdf"
```

## What You Don't Need to Do

| Task | Who Does It |
|------|------------|
| Watch regulatory websites | System (cron, automatic) |
| Read and parse regulation PDFs | Regulatory Reader agent |
| Figure out what obligations apply | Coordinator + extracted data |
| Write compliance guides | Marketing agent |
| Design technical controls | Engineering agent |
| Cross-validate consistency | Consolidator agent |
| Produce the final report | Consolidator agent |

Your only job: **read the report and make decisions.**

## Architecture

Six AI agents working in a pipeline:

```
  ┌─────────────────────┐
  │  Regulatory Monitor  │  ← Watches SEBI, AMFI, RBI for new publications
  │  (automatic, cron)   │     Detects changes, triggers pipeline
  └──────────┬──────────┘
             │ new regulation detected
             ▼
  ┌─────────────────────┐
  │  Regulatory Reader   │  ← Reads the regulation, extracts structured data
  └──────────┬──────────┘
             │ obligations, timelines, penalties
             ▼
  ┌─────────────────────┐
  │    Coordinator       │  ← Validates, fans out to departments in parallel
  └──┬──────────────┬───┘
     │              │
     ▼              ▼
┌─────────┐  ┌──────────┐
│Marketing │  │Engineering│  ← Work in parallel
│ Agent    │  │  Agent    │
└────┬─────┘  └────┬─────┘
     │              │
     ▼              ▼
  ┌─────────────────────┐
  │    Consolidator      │  ← Merges, cross-validates, final report
  └─────────────────────┘
```

## Requirements

- Hermes Agent v0.14+
- API key for an LLM provider (OpenAI, Anthropic, etc.)
- One-time setup by a technical person (~30 minutes)

## Testing

```bash
# Run the full pipeline end-to-end (DPDP Act as example)
python3 test_pipeline.py --clean

# The test simulates all 6 agents with realistic regulation data
```

## License

MIT — built for Hermes Buildathon 2026.
