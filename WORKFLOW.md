# Orchestration Workflow

## Overview

This pipeline monitors regulatory bodies, detects new publications, and produces
multi-department compliance analysis. It is regulation-agnostic: the same flow
works for DPDP, SEBI, AMFI, RBI, or any other regulation.

## Pipeline Stages

### Stage 0: Regulatory Monitoring
**Agent:** `hermes-monitor` (Regulatory Monitor)
**Trigger:** Cron (every 6-12 hours)
**Action:** Polls regulatory sources for new publications

The monitor watches:
- SEBI circulars and notifications
- AMFI regulatory updates
- RBI press releases and circulars
- Other configurable sources

For each source, it compares current findings against `known-items.json`.
New items trigger the pipeline.

**Output:** New regulation document saved to `docs/regulations/{body}/{date}-{title}.pdf`
**Completion signal:** `workspace/shared-data/handoffs/monitor-to-coordinator.md`

### Stage 1: Regulatory Extraction
**Agent:** `hermes-reader` (Regulatory Reader)
**Input:** Regulation document from Stage 0
**Output:** `workspace/shared-data/extracted-regulations/`

The reader processes the regulation document and produces:
- `summary.md` — plain-English summary with regulation name and issuing body
- `obligations.json` — structured list of compliance obligations
- `definitions.json` — key terms and definitions
- `timelines.json` — enforcement dates and deadlines
- `penalties.json` — penalty structure and enforcement mechanisms

**Completion signal:** All files present in `extracted-regulations/`.

### Stage 2: Coordination & Dispatch
**Agent:** `hermes-coord` (Coordinator)
**Trigger:** Handoff from Regulatory Reader (or Monitor)
**Action:** Reads extracted data, validates, dispatches to marketing and engineering in parallel.

The coordinator:
1. Validates extracted data is complete
2. Reads the regulation name and source body from the handoff
3. Creates Kanban tasks for marketing and engineering
4. Invokes `delegate_task` to fan out work with regulation context
5. Monitors completion, handles failures

### Stage 3: Parallel Work
**Agents:** `hermes-marketing` + `hermes-engineering`

**Marketing Agent** produces (regulation-specific content):
- `compliance-guide.md` — customer-facing compliance guide
- `checklist.md` — actionable compliance checklist
- `faq.md` — frequently asked questions
- `blog-post.md` — announcement/blog content

**Engineering Agent** produces (regulation-agnostic artifacts):
- `data-classification.md` — data/asset categories under the regulation
- `control-architecture.md` — technical control design
- `impact-assessment-template.md` — assessment template (e.g., DPIA for privacy regs)
- `implementation-guide.md` — phased technical implementation plan

### Stage 4: Consolidation
**Agent:** `hermes-consol` (Consolidator)
**Trigger:** Both marketing and engineering complete
**Action:** Merges all outputs, cross-validates, produces final deliverable.

**Output:** `workspace/shared-data/consolidated-output/final-report.md`
**Completion signal:** `workspace/shared-data/handoffs/consolidation-complete.md`

## Handoff Protocol

Agents communicate through the shared workspace filesystem:

```
workspace/shared-data/handoffs/
├── monitor-to-coordinator.md      ← Stage 0: new regulation detected
├── reader-to-coordinator.md       ← Stage 1: extraction complete
├── coord-to-marketing.md          ← Stage 2a: dispatch to marketing
├── coord-to-engineering.md        ← Stage 2b: dispatch to engineering
├── marketing-to-consolidator.md   ← Stage 3a: marketing complete
├── engineering-to-consolidator.md ← Stage 3b: engineering complete
└── consolidation-complete.md      ← Stage 4: pipeline complete
```

Each handoff file is a JSON document:
```json
{
  "from": "regulatory-monitor",
  "to": "coordinator",
  "status": "complete",
  "timestamp": "2026-07-12T14:30:00Z",
  "regulation_name": "DPDP Act 2023",
  "source_body": "DPDP Board",
  "artifacts": ["summary.md", "obligations.json"],
  "notes": "All documents processed"
}
```

## Kanban Task States

```
TODO → IN_PROGRESS → REVIEW → DONE
                     ↓
                   BLOCKED (with reason)
```

## Error Handling

- If monitor fails: cron retries on next tick, no data loss
- If reader fails: coordinator retries once, then halts pipeline
- If one parallel agent fails: other continues, consolidator notes the gap
- If consolidator fails: coordinator re-runs with explicit merge instructions
