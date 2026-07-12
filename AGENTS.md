# Compliance-Disco — Hermes Buildathon 2026

A multi-agent system built on Hermes Agent for the "AI as Agency" track.

## What This Project Does

Automates compliance monitoring and analysis for any regulation. Monitors
regulatory bodies (SEBI, AMFI, RBI, IRDAI, TRAI, DPDP Board, etc.) for new
publications, detects changes, and triggers a multi-department analysis pipeline
that produces actionable insights for engineering, marketing, and leadership.

DPDP Act is one example regulation processed through the system.

## Architecture: Six-Agent Pipeline

```
  ┌─────────────────────┐
  │  Regulatory Monitor  │  ← Watches SEBI, AMFI, RBI, etc. for new publications
  │  (hermes-monitor)    │     Cron-driven, detects changes, triggers pipeline
  └──────────┬──────────┘
             │ handoff: new regulation detected
             ▼
  ┌─────────────────────┐
  │  Regulatory Reader   │  ← Reads regulation documents, extracts structured data
  │  (hermes-reader)     │
  └──────────┬──────────┘
             │ handoff: extracted-regulations/
             ▼
  ┌─────────────────────┐
  │    Coordinator       │  ← Orchestrates pipeline, dispatches subagents
  │  (hermes-coord)      │
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
  │    Consolidator      │  ← Merges outputs, validates, final deliverable
  │  (hermes-consol)     │
  └─────────────────────┘
```

## Data Flow

1. **Monitor** watches regulatory sources via cron → detects new publication
2. **Reader** reads the regulation document → outputs structured data to `extracted-regulations/`
3. **Coordinator** validates extraction → fans out to Marketing + Engineering in parallel
4. **Marketing** produces customer-facing content → `marketing-output/`
5. **Engineering** produces technical artifacts → `engineering-output/`
6. **Consolidator** merges both → `consolidated-output/final-report.md`

## Quick Start

```bash
# Install Hermes Agent if not already done
# pip install hermes-agent  OR  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# Initialize all 6 profiles
./setup.sh

# Start the pipeline (run from project root)
hermes-coord "Run the full compliance pipeline for DPDP Act"
```

## Key Files

- `setup.sh` — one-shot script to create all Hermes profiles
- `WORKFLOW.md` — detailed orchestration flow and handoff protocol
- `agents/*/SOUL.md` — each agent's identity and standing instructions
- `agents/*/skills/*/SKILL.md` — procedural skills for each agent
- `workspace/shared-data/` — all inter-agent data lives here
- `workspace/kanban/` — task board for coordination (Hermes SQLite kanban)
- `test_pipeline.py` — end-to-end test simulation (DPDP as example)
