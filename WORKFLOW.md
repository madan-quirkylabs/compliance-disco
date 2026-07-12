# Orchestration Workflow

## Pipeline Stages

### Stage 1: Regulatory Extraction
**Agent:** `hermes-reader` (Regulatory Reader)
**Input:** `docs/regulations/dpdp/*.pdf`
**Output:** `workspace/shared-data/extracted-regulations/`

The reader processes each regulation document and produces:
- `summary.md` — plain-English summary of the regulation
- `obligations.json` — structured list of compliance obligations
- `definitions.json` — key terms and legal definitions
- `timelines.json` — enforcement dates and deadlines
- `penalties.json` — penalty structure and enforcement mechanisms

**Completion signal:** All files present in `extracted-regulations/`.

### Stage 2: Coordination & Dispatch
**Agent:** `hermes-coord` (Coordinator)
**Trigger:** Handoff from Regulatory Reader
**Action:** Reads extracted data, creates tasks on Kanban board, dispatches to
marketing and engineering agents in parallel.

The coordinator:
1. Validates extracted data is complete
2. Creates Kanban tasks for marketing and engineering
3. Invokes `delegate_task` to fan out work
4. Monitors completion, handles failures

### Stage 3: Parallel Work
**Agents:** `hermes-marketing` + `hermes-engineering`

**Marketing Agent** produces:
- `compliance-guide.md` — customer-facing compliance guide
- `checklist.md` — actionable compliance checklist
- `faq.md` — frequently asked questions
- `blog-post.md` — announcement/blog content

**Engineering Agent** produces (regulation-agnostic; DPDP shown as the example flow):
- `data-classification.md` — data/asset categories the regulation governs
- `control-architecture.md` — technical design for the regulation's core controls (e.g. consent for privacy regs)
- `impact-assessment-template.md` — the assessment the regulation requires (e.g. a DPIA)
- `implementation-guide.md` — phased technical implementation steps

### Stage 4: Consolidation
**Agent:** `hermes-consol` (Consolidator)
**Trigger:** Both marketing and engineering complete
**Action:** Merges all outputs, cross-validates, produces final deliverable.

**Output:** `workspace/shared-data/consolidated-output/final-report.md`

## Handoff Protocol

Agents communicate through the shared workspace filesystem:

```
workspace/shared-data/handoffs/
├── reader-to-coordinator.md    ← Stage 1 complete
├── coord-to-marketing.md       ← Stage 2a dispatch
├── coord-to-engineering.md     ← Stage 2b dispatch
├── marketing-to-consolidator.md ← Stage 3a complete
└── engineering-to-consolidator.md ← Stage 3b complete
```

Each handoff file is a JSON-like status document:
```json
{
  "from": "regulatory-reader",
  "to": "coordinator",
  "status": "complete",
  "timestamp": "2026-07-12T14:30:00Z",
  "artifacts": ["summary.md", "obligations.json"],
  "notes": "All 3 DPDP documents processed"
}
```

## Kanban Task States

```
TODO → IN_PROGRESS → REVIEW → DONE
                     ↓
                   BLOCKED (with reason)
```

## Error Handling

- If reader fails: coordinator retries once, then halts pipeline
- If one parallel agent fails: other continues, consolidator notes the gap
- If consolidator fails: coordinator re-runs with explicit merge instructions
