---
name: orchestrate-pipeline
description: Validate inputs and coordinate the compliance pipeline stages
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, orchestration, pipeline]
---

# Orchestrate Pipeline

## When to Use
When starting the compliance pipeline after reader completion. Trigger: "run pipeline", "start orchestration".

## Procedure
1. Check `workspace/shared-data/handoffs/reader-to-coordinator.md` exists and status is "complete".
2. Validate all expected files in `workspace/shared-data/extracted-regulations/`:
   - summary.md, obligations.json, definitions.json, timelines.json, penalties.json
3. If validation fails: retry reader once, then report failure.
4. Create Kanban tasks for marketing and engineering stages.
5. Write dispatch handoffs for both subagents.
6. Use `delegate_task` to invoke marketing and engineering in parallel.
7. Monitor handoff directory for completion signals.
8. When both complete, dispatch to consolidator.
9. Report final pipeline status.

## Validation Checklist
- [ ] obligations.json has > 0 entries
- [ ] No required fields are empty in any JSON file
- [ ] All 5 expected files present
- [ ] summary.md mentions DPDP Act by name

## Pitfalls
- Don't proceed if reader output is incomplete — garbage in = garbage out.
- One subagent failing doesn't kill the other — isolate failures.
- Use Kanban to persist state in case of crash/restart.
