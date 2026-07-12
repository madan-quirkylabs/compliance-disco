# Compliance-Disco — Hermes Buildathon 2026

A multi-agent system built on Hermes Agent for the "AI as Agency" track.

## What This Project Does

Automates compliance discovery for India's Digital Personal Data Protection Act
(DPDP Act, 2023). Reads regulation PDFs, extracts structured knowledge, and
produces compliance artifacts for engineering and marketing teams.

## Architecture: Five-Agent Pipeline

```
  ┌─────────────────────┐
  │  Regulatory Reader   │  ← Reads DPDP PDFs, extracts structured data
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

1. `regulatory-reader` reads PDFs from `docs/regulations/dpdp/`
2. Outputs structured extraction to `workspace/shared-data/extracted-regulations/`
3. `coordinator` picks up extracted data, fans out to marketing + engineering
4. `marketing-agent` produces content/guides → `workspace/shared-data/marketing-output/`
5. `engineering-agent` produces code/configs → `workspace/shared-data/engineering-output/`
6. `consolidator` merges both → `workspace/shared-data/consolidated-output/`

## Quick Start

```bash
# Install Hermes Agent if not already done
# pip install hermes-agent  OR  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# Initialize all 5 profiles
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
