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
- API key for an LLM provider (OpenAI, Anthropic, or OpenRouter)

### One-Time Setup

```bash
# Clone the repo
git clone git@github.com:madan-quirkylabs/compliance-disco.git
cd compliance-disco

# Run setup (creates Hermes profiles, configures cron, initializes workspace)
./setup.sh

# Fill in API key
vim ~/.hermes/.env

# Install the gateway (required for cron monitoring)
hermes gateway install
```

### How the Pipeline Works

```
Cron (every 6 hours)
  │
  ▼
Monitor detects new regulation on SEBI/AMFI/RBI
  │
  ▼
Coordinator invokes (via delegate_task):
  ├── Reader: extracts obligations, definitions, timelines, penalties
  ├── Marketing: writes compliance guide, checklist, FAQ, blog post
  ├── Engineering: writes data schemas, control architecture, implementation plan
  └── Consolidator: merges everything into final-report.md
  │
  ▼
Report delivered to CCO
```

### Running Manually

```bash
# Full pipeline test (DPDP Act as example)
python3 test_pipeline.py --clean --test-failures

# Trigger via Hermes
hermes "Run the compliance pipeline for the latest SEBI circular"

# View the dashboard
cd web && python3 -m http.server 8080
# Open http://localhost:8080
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

- **Add regulatory bodies:** Edit `workspace/shared-data/monitored-sources/known-items.json`
- **Change monitoring frequency:** Edit the cron job in `~/.hermes/cron/jobs.json`
- **Change LLM model:** Edit `agents/coordinator/config.yaml`
- **View run history:** Check `workspace/shared-data/run-history/`

### Testing

```bash
# 192 assertions, failure mode tests, observability logging
python3 test_pipeline.py --clean --test-failures

# Outputs appear in workspace/shared-data/
```

---

## Requirements

- Hermes Agent v0.14+
- API key (OpenAI, Anthropic, or OpenRouter)
- Docker
- Python 3.11+

## License

MIT — Hermes Buildathon 2026.
