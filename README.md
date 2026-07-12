# Compliance-Disco

Automated compliance monitoring and multi-department analysis for any regulation.
Built on [Hermes Agent](https://hermes-agent.nousresearch.com/) — Hermes Buildathon 2026.

## What This Does

Monitors regulatory bodies (SEBI, AMFI, RBI, IRDAI, TRAI, and others) for new
publications. When something changes, it automatically:

1. **Detects** the new regulation or circular
2. **Extracts** every obligation, deadline, and penalty
3. **Analyzes** the impact from every department's perspective
4. **Delivers** a single report with what to do, who does it, and by when

You go from "something changed, now what?" to "here's exactly what we need to do"
— automatically.

---

## For the Chief Compliance Officer

### What You Do Day-to-Day

**Almost nothing.** The system runs on autopilot.

**When you receive a report** (delivered to your dashboard or messaging channel):
- Open the report
- Read the Executive Summary (2 minutes)
- Review the Compliance Checklist (who does what, by when)
- Share with your teams

**That's it.** The system handles detection, extraction, analysis, and formatting.

### What You Receive

A compliance report containing:

| Section | What's In It | Time to Read |
|---------|-------------|-------------|
| **Executive Summary** | What changed, why it matters | 2 minutes |
| **Business Obligations** | What we must do, by when | 5 minutes |
| **Compliance Checklist** | Action items with owners and deadlines | 5 minutes |
| **Penalties** | What happens if we don't comply | 1 minute |
| **Technical Implementation** | What engineering needs to build | Hand to engineering |
| **FAQ** | Questions your team will ask | Share as-needed |

### How to Ask Questions

Once the system is set up, you can ask it anything in plain English:

- *"What are the penalties if we miss the DPDP deadline?"*
- *"What does the new SEBI circular mean for our marketing team?"*
- *"Give me a 30-day action plan for the RBI notification"*
- *"Which obligations apply to us as a data fiduciary?"*

The system answers from the actual regulation text, not generic advice.

### Adding New Regulatory Bodies

Tell your IT team which bodies to monitor. The system supports:
SEBI, AMFI, RBI, IRDAI, TRAI, DPDP Board, and any body with a web presence.

Just say: *"Add IRDAI to the monitoring list"* — your IT team handles the rest.

---

## For Your IT Team

### Prerequisites

- Python 3.11+
- Docker
- Hermes Agent v0.14+ (`pip install hermes-agent`)
- [DeepSeek API key](https://platform.deepseek.com/api_keys) (V4 Flash)

### One-Time Setup

```bash
# Clone the repo
git clone git@github.com:madan-quirkylabs/compliance-disco.git
cd compliance-disco

# Set your DeepSeek API key (or enter it when prompted)
export DEEPSEEK_API_KEY="sk-your-key-here"

# Run setup (creates profiles, configures API, initializes workspace)
./setup.sh

# Install the gateway (required for cron monitoring)
hermes gateway install
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 0: MONITOR (Hermes cron profile)                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  regulatory-monitor  →  watches SEBI/AMFI/RBI/DPDP Board     │ │
│  │  runs every 6 hours via hermes gateway                        │ │
│  │  output: handoffs/monitor-to-coordinator.md + PDF to docs/    │ │
│  └───────────────────────┬────────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│  STAGE 1: EXTRACTION    ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  scripts/pdf2text.py → scripts/extract.py → 5 output files   │ │
│  │  (pymupdf)           │ (DeepSeek API)     │                   │ │
│  │  PDFs in docs/       │ text file           │ summary.md       │ │
│  │  regulatory/         │ to API              │ obligations.json  │ │
│  │                      │                     │ definitions.json  │ │
│  │                      │                     │ timelines.json    │ │
│  │                      │                     │ penalties.json    │ │
│  └───────────────────────┬────────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│  STAGE 2: PARALLEL DISPATCH (via delegate_task)                    │
│  ┌───────────────────────┴────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────┐ │ │
│  │  │  MARKETING AGENT   │  │  ENGINEERING AGENT              │ │ │
│  │  │  compliance-guide  │  │  data-classification.md         │ │ │
│  │  │  checklist.md       │  │  control-architecture.md        │ │ │
│  │  │  faq.md             │  │  impact-assessment-template.md  │ │ │
│  │  │  blog-post.md       │  │  implementation-guide.md        │ │ │
│  │  └─────────────────────┘  └─────────────────────────────────┘ │ │
│  └───────────────────────┬────────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│  STAGE 3: CONSOLIDATION ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Consolidator merges all 8 files → final-report.md           │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Manual Trigger Commands

**Stage 0 — Monitor (manual check):**
```bash
hermes -z "Check regulatory sources for new publications. Compare against known-items.json and report any new findings."
```

**Stage 1 — PDF to Text:**
```bash
python scripts/pdf2text.py \
  --source docs/regulations/dpdp/ \
  --output workspace/shared-data/extracted-regulations/raw.txt
```

**Stage 1 — Structured Extraction:**
```bash
DEEPSEEK_API_KEY="sk-your-key-here" \
python scripts/extract.py \
  --text workspace/shared-data/extracted-regulations/raw.txt \
  --regulation "DPDP Act 2023" \
  --body "DPDP Board"
```

**Stage 2 — Marketing Agent:**
```bash
hermes -z "You are the Marketing Agent. Read extracted data from workspace/shared-data/extracted-regulations/ (summary.md, obligations.json, definitions.json, timelines.json, penalties.json). Produce 4 files in workspace/shared-data/marketing-output/: compliance-guide.md, checklist.md, faq.md, blog-post.md. Write handoff to workspace/shared-data/handoffs/marketing-to-consolidator.md."
```

**Stage 2 — Engineering Agent:**
```bash
hermes -z "You are the Engineering Agent. Read extracted data from workspace/shared-data/extracted-regulations/ and grounding references from agents/engineering-agent/skills/build-compliance-artifacts/references/. Produce 4 files in workspace/shared-data/engineering-output/: data-classification.md, control-architecture.md, impact-assessment-template.md, implementation-guide.md. Write handoff to workspace/shared-data/handoffs/engineering-to-consolidator.md."
```

**Stage 3 — Consolidator:**
```bash
hermes -z "You are the Consolidator. Read from workspace/shared-data/marketing-output/ (4 files), workspace/shared-data/engineering-output/ (4 files), and workspace/shared-data/extracted-regulations/ (5 files). Cross-validate and produce workspace/shared-data/consolidated-output/final-report.md. Write handoff to workspace/shared-data/handoffs/consolidation-complete.md."
```

**Full Pipeline (end-to-end):**
```bash
hermes-coord "Run the full compliance pipeline for DPDP Act"
```

### Running Tests

```bash
# Full pipeline test (DPDP Act as example, 188 assertions)
python3 test_pipeline.py --clean --test-failures

# View the dashboard (static)
cd web && python3 -m http.server 8080
# Open http://localhost:8080
```

### Live Demo Server

```bash
# Install dependencies
pip install -r requirements.txt

# Start the server
python server.py
# Open http://localhost:9000

# API endpoints:
#   GET  /              — Dashboard
#   GET  /api/status    — Pipeline status
#   POST /api/run       — Trigger pipeline
#   GET  /api/report    — Get final report
#   GET  /api/handoffs  — View all handoffs
```

### Architecture

Six AI agents in a pipeline:

| Agent | Role | How It Runs |
|-------|------|-------------|
| **Monitor** | Watches regulatory sources | Cron job (every 6 hours) |
| **Coordinator** | Orchestrates everything | Main Hermes session |
| **Reader** | Extracts structured data | delegate_task subagent |
| **Marketing** | Customer-facing content | delegate_task subagent |
| **Engineering** | Technical artifacts | delegate_task subagent |
| **Consolidator** | Merges final report | delegate_task subagent |

### Configuration

- **LLM backend:** DeepSeek V4 Flash (hosted API at `api.deepseek.com`)
- **Add regulatory bodies:** Edit `workspace/shared-data/monitored-sources/known-items.json`
- **Change monitoring frequency:** Edit the cron job in `~/.hermes/cron/jobs.json`
- **Change LLM model:** Edit `agents/coordinator/config.yaml`
- **View run history:** Check `workspace/shared-data/run-history/`

### Testing

```bash
# 188 assertions, failure mode tests, observability logging
python3 test_pipeline.py --clean --test-failures

# Outputs appear in workspace/shared-data/
```

---

## Requirements

- Hermes Agent v0.14+
- [DeepSeek API key](https://platform.deepseek.com/api_keys) (V4 Flash)
- Docker
- Python 3.11+
