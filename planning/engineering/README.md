# Engineering Agent — slice notes

The **engineering-agent** is one of two parallel workers in the pipeline (see `/AGENTS.md`).
It turns the extracted regulation into technical compliance artifacts. It is
**regulation-agnostic** — the regulation comes from `extracted-regulations/` at runtime.
Test/example flow: **DPDP Act 2023 + Rules 2025**.

## Where the logic lives (canonical, Hermes-compliant)
`agents/engineering-agent/` — a Hermes profile materialised by `./setup.sh`:
- `SOUL.md` — identity, voice, standing rules
- `config.yaml` — model (`openai-api` / `gpt-5.6-sol`), guardrails
- `skills/build-compliance-artifacts/SKILL.md` — the procedure + 4 deliverables
- `skills/build-compliance-artifacts/references/` — **our grounding, folded in:**
  - `system-inventory.md` — the org's systems/data stores/current controls (EDIT to real)
  - `controls.md` — DPDP provision ↔ ISO/SOC2 control mapping

> This `planning/` folder is scratch/PM only. Nothing here is loaded by Hermes —
> the runtime source of truth is `agents/engineering-agent/`.

## What it does (I/O)
- **In:** `workspace/shared-data/extracted-regulations/` + `handoffs/coord-to-engineering.md`
- **Out:** `workspace/shared-data/engineering-output/`
  — `data-classification.md`, `control-architecture.md`, `impact-assessment-template.md`, `implementation-guide.md`
  — then writes `handoffs/engineering-to-consolidator.md`

Every recommendation cites the source regulation's provision + a framework ID and names
**real systems** from `system-inventory.md` — that grounding is the differentiator vs generic templates.

## Run it
```bash
./setup.sh                      # materialise all 5 agent profiles (once)
# fill agents/engineering-agent/.hermes/.env with the API key
cd agents/engineering-agent && HERMES_HOME="$PWD/.hermes" hermes "Build compliance artifacts"
```
