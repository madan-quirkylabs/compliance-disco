# Compliance-Disco

A multi-agent system built on Hermes Agent that automates compliance discovery for India's Digital Personal Data Protection Act (DPDP Act, 2023).

Built for the [Hermes Buildathon 2026](https://hermes-agent.nousresearch.com/) — "AI as Agency" track.

## Architecture

Five Hermes Agent profiles working in a pipeline:

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Regulatory Reader** | Extract structured data from regulation PDFs | `docs/regulations/dpdp/*.pdf` | `extracted-regulations/` |
| **Coordinator** | Orchestrate pipeline, dispatch subagents | Reader output | Dispatch handoffs |
| **Marketing Agent** | Customer-facing compliance content | Extracted data | Guides, checklists, FAQs |
| **Engineering Agent** | Technical compliance artifacts | Extracted data | Schemas, templates, architecture |
| **Consolidator** | Merge, validate, final report | All outputs | `final-report.md` |

## Quick Start

```bash
# 1. Install Hermes Agent (if not already installed)
pip install hermes-agent

# 2. Set up all 5 agent profiles
./setup.sh

# 3. Fill in API keys
# Edit any agent's .hermes/.env with your API keys

# 4. Run the pipeline
# Option A: Use the coordinator
hermes-coord "Run the full compliance pipeline for DPDP Act"

# Option B: Run stages manually
hermes-reader "Extract all regulations from docs/regulations/dpdp/"
hermes-coord "Dispatch to marketing and engineering agents"
```

## Project Structure

```
compliance-disco/
├── docs/regulations/dpdp/     ← Source regulation PDFs
├── agents/
│   ├── regulatory-reader/     ← Agent 1: extraction
│   ├── coordinator/           ← Agent 2: orchestration
│   ├── marketing-agent/       ← Agent 3a: content
│   ├── engineering-agent/     ← Agent 3b: technical
│   └── consolidator/          ← Agent 4: merge
├── workspace/
│   ├── shared-data/           ← Inter-agent data
│   │   ├── extracted-regulations/
│   │   ├── marketing-output/
│   │   ├── engineering-output/
│   │   ├── consolidated-output/
│   │   └── handoffs/
│   └── kanban/                ← Task board
├── setup.sh                   ← Initialize all profiles
├── WORKFLOW.md                ← Detailed orchestration flow
└── AGENTS.md                  ← Project overview (loaded by Hermes)
```

## How It Works

1. **Reader** reads DPDP PDFs → structured JSON + summary
2. **Coordinator** validates extraction → fans out to Marketing + Engineering in parallel
3. **Marketing** produces guides, checklists, FAQs, blog content
4. **Engineering** produces data schemas, consent architecture, DPIA templates, implementation guide
5. **Consolidator** merges both outputs → unified `final-report.md`

Inter-agent communication happens through the shared workspace filesystem via handoff files.

## Requirements

- Hermes Agent v0.14+
- API key for an LLM provider (OpenAI, Anthropic, etc.)
- DPDP Act documents in `docs/regulations/dpdp/`

## License

MIT — built for Hermes Buildathon 2026.
