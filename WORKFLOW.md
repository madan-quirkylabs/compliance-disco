# Orchestration Workflow

## Overview

This pipeline monitors regulatory bodies, detects new publications, and produces
multi-department compliance analysis. It is regulation-agnostic: the same flow
works for DPDP, SEBI, AMFI, RBI, or any other regulation.

The Coordinator is the single orchestrator. It uses `delegate_task` to invoke
all other agents (Reader, Marketing, Engineering, Consolidator) as ephemeral
subagents within its session.

## Pipeline Stages

### Stage 0: Regulatory Monitoring
**Agent:** Regulatory Monitor (cron profile)
**Trigger:** Cron (every 6 hours)
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

### Stage 1: Extraction (invoked by Coordinator)
**Agent:** Regulatory Reader (delegate_task subagent)
**Input:** Regulation document from Stage 0 + source_path from handoff
**Output:** `workspace/shared-data/extracted-regulations/`

The reader processes the regulation document and produces:
- `summary.md` — plain-English summary with regulation name and issuing body
- `obligations.json` — structured list of compliance obligations
- `definitions.json` — key terms and definitions
- `timelines.json` — enforcement dates and deadlines
- `penalties.json` — penalty structure and enforcement mechanisms

**Completion signal:** `workspace/shared-data/handoffs/reader-to-coordinator.md`

### Stage 2: Parallel Dispatch (invoked by Coordinator)
**Agents:** Marketing Agent + Engineering Agent (delegate_task subagents, parallel)

The coordinator validates reader output, then invokes both workers in parallel
using `delegate_task`. Each receives the regulation name, source body, and
file paths in their task prompt.

**Marketing Agent** produces (regulation-specific content):
- `compliance-guide.md` — customer-facing compliance guide
- `checklist.md` — actionable compliance checklist
- `faq.md` — frequently asked questions
- `blog-post.md` — announcement/blog content

**Engineering Agent** produces (regulation-agnostic artifacts):
- `data-classification.md` — data/asset categories under the regulation
- `control-architecture.md` — technical control design
- `impact-assessment-template.md` — assessment template
- `implementation-guide.md` — phased technical implementation plan

### Stage 3: Consolidation (invoked by Coordinator)
**Agent:** Consolidator (delegate_task subagent)
**Trigger:** Both marketing and engineering complete
**Action:** Merges all outputs, cross-validates, produces final deliverable.

**Output:** `workspace/shared-data/consolidated-output/final-report.md`
**Completion signal:** `workspace/shared-data/handoffs/consolidation-complete.md`

## Handoff Protocol

All agents communicate through JSON handoff files in the shared workspace:

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

### Handoff Schema (all files)
Every handoff must contain these fields:
```json
{
  "from": "agent-name",
  "to": "agent-name",
  "status": "complete | dispatched | failed",
  "timestamp": "ISO-8601",
  "regulation_name": "string",
  "source_body": "string",
  "artifacts": ["file1.md", "file2.json"],
  "notes": "optional context"
}
```

The Coordinator validates this schema before dispatching downstream agents.
The test pipeline (`test_pipeline.py --test-failures`) validates all handoff
contracts with 192 assertions.

## Error Handling

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Monitor can't reach source | Log failure, continue other sources | Cron retries on next tick |
| Reader produces incomplete output | Coordinator checks file count + structure | Retry once with same prompt |
| One parallel agent fails | Coordinator checks handoff existence | Continue with other; consolidator notes gap |
| Consolidator fails | Final report missing | Coordinator re-runs with explicit merge instructions |
| Handoff JSON is malformed | JSON parse error | Log error, skip that stage, report partial results |
| Handoff has wrong regulation_name | Name mismatch check | Reject handoff, log error |

The Coordinator always reports which stages succeeded and which failed.
Partial results are preserved — a failed marketing agent doesn't delete
engineering output.

## Observability

### Run History
Every pipeline run is logged to `workspace/shared-data/run-history/`:
```json
{
  "timestamp": "2026-07-12T14:30:00Z",
  "regulation_name": "DPDP Act 2023",
  "stages": [
    {"name": "monitor", "duration": 2.3, "status": "ok"},
    {"name": "reader", "duration": 15.7, "status": "ok"},
    {"name": "coordinator", "duration": 0.5, "status": "ok"},
    {"name": "marketing", "duration": 22.1, "status": "ok"},
    {"name": "engineering", "duration": 18.4, "status": "ok"},
    {"name": "consolidator", "duration": 12.8, "status": "ok"}
  ],
  "assertions": {"passed": 192, "failed": 0}
}
```

### Trace Logging
Each stage logs:
- Start time and stage name
- Key actions (files read, handoffs written, decisions made)
- End time with status (ok / failed) and duration

### Cost Tracking
The coordinator's config routes auxiliary tasks (compression, background review)
to Flash instead of the main model, reducing cost ~3-5x. The `tool_loop_guardrails.hard_stop_enabled: true`
setting prevents runaway loops from burning tokens.

## Kanban Integration

The Coordinator creates Kanban tasks for each pipeline stage:
```bash
hermes kanban create "Extract {regulation_name}" --assign reader
hermes kanban create "Marketing content for {regulation_name}" --assign marketing
hermes kanban create "Engineering artifacts for {regulation_name}" --assign engineering
hermes kanban create "Consolidate {regulation_name} report" --assign consolidator
```

Task states: `TODO → IN_PROGRESS → DONE` (or `BLOCKED` with reason).
This provides persistence across crashes and visibility into pipeline state.
