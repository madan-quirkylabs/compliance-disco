# Compliance-Disco

A multi-agent system built on Hermes Agent that automates compliance monitoring and analysis for any regulation.

Built for the [Hermes Buildathon 2026](https://hermes-agent.nousresearch.com/) — "AI as Agency" track.

## What It Does

Monitors regulatory bodies (SEBI, AMFI, RBI, etc.) for new publications. When a change is detected, it automatically triggers a multi-department analysis pipeline that produces actionable compliance insights for engineering, marketing, and leadership.

DPDP Act is one example regulation processed through the system — the pipeline works for any regulation.

## Architecture

Six Hermes Agent profiles working in a pipeline:

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Regulatory Monitor** | Watch regulatory sources, detect new publications | Cron schedule + web sources | New regulation docs |
| **Regulatory Reader** | Extract structured data from regulation documents | Regulation PDFs | Structured JSON + summary |
| **Coordinator** | Orchestrate pipeline, dispatch subagents | Reader output | Dispatch handoffs |
| **Marketing Agent** | Customer-facing compliance content | Extracted data | Guides, checklists, FAQs |
| **Engineering Agent** | Technical compliance artifacts | Extracted data | Schemas, templates, architecture |
| **Consolidator** | Merge, validate, final report | All outputs | `final-report.md` |

## Quick Start

```bash
# 1. Install Hermes Agent (if not already installed)
pip install hermes-agent

# 2. Set up all 6 agent profiles
./setup.sh

# 3. Fill in API keys
# Edit any agent's .hermes/.env with your API keys

# 4. Run the pipeline
# Option A: Use the coordinator
hermes-coord "Run the full compliance pipeline for DPDP Act"

# Option B: Run stages manually
hermes-monitor "Check SEBI and AMFI for new regulations"
hermes-reader "Extract all regulations from docs/regulations/dpdp/"
hermes-coord "Dispatch to marketing and engineering agents"

# 5. Test the full pipeline end-to-end
python3 test_pipeline.py --clean
```

## Project Structure

```
compliance-disco/
├── docs/regulations/               ← Source regulation documents
│   └── dpdp/                       ← Example: DPDP Act PDFs
├── agents/
│   ├── regulatory-monitor/         ← Agent 0: watches for changes
│   ├── regulatory-reader/          ← Agent 1: extraction
│   ├── coordinator/                ← Agent 2: orchestration
│   ├── marketing-agent/            ← Agent 3a: content
│   ├── engineering-agent/          ← Agent 3b: technical
│   └── consolidator/               ← Agent 4: merge
├── workspace/
│   ├── shared-data/                ← Inter-agent data
│   │   ├── extracted-regulations/
│   │   ├── marketing-output/
│   │   ├── engineering-output/
│   │   ├── consolidated-output/
│   │   ├── monitored-sources/      ← Known items tracking
│   │   ├── detection-log/          ← Change detection history
│   │   └── handoffs/
│   └── kanban/                     ← Task board
├── planning/                       ← Project planning docs
├── setup.sh                        ← Initialize all profiles
├── WORKFLOW.md                     ← Detailed orchestration flow
├── AGENTS.md                       ← Project overview (loaded by Hermes)
└── test_pipeline.py                ← End-to-end test simulation
```

## How It Works

1. **Monitor** runs on a cron schedule, watches SEBI/AMFI/RBI websites
2. When a new regulation is detected, it saves the document and signals the coordinator
3. **Reader** extracts structured data (obligations, definitions, timelines, penalties)
4. **Coordinator** validates extraction, fans out to Marketing + Engineering in parallel
5. **Marketing** produces guides, checklists, FAQs, blog content for the specific regulation
6. **Engineering** produces data schemas, control architecture, assessment templates, implementation guide
7. **Consolidator** merges both outputs into a unified `final-report.md`

## Requirements

- Hermes Agent v0.14+
- API key for an LLM provider (OpenAI, Anthropic, etc.)
- Regulation documents in `docs/regulations/{body}/`

## License

MIT — built for Hermes Buildathon 2026.
