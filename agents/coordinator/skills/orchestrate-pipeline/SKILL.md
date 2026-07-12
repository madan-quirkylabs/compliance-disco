---
name: orchestrate-pipeline
description: Run the full compliance pipeline using delegate_task for each stage
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, orchestration, pipeline]
---

# Orchestrate Pipeline

## When to Use
When the coordinator receives a monitor handoff. Trigger: "run pipeline", "process regulation".

## Procedure

### Step 1: Validate Monitor Detection
1. Read `workspace/shared-data/handoffs/monitor-to-coordinator.md`
2. If not found or status != "complete", respond: "No new regulations to process."
3. Extract: `regulation_name`, `source_body`, `source_path`

### Step 2: Invoke Reader
4. Create Kanban task: "Extract {regulation_name}" → IN_PROGRESS
5. Use `delegate_task` with the Regulatory Reader instructions (see coordinator SOUL.md Stage 2)
6. Verify: `workspace/shared-data/handoffs/reader-to-coordinator.md` exists with status "complete"
7. Verify: all 5 files exist in `workspace/shared-data/extracted-regulations/`
8. Kanban task → DONE

### Step 3: Fan Out to Marketing + Engineering
9. Create 2 Kanban tasks: "Marketing content" and "Engineering artifacts" → IN_PROGRESS
10. Use `delegate_task` for Marketing Agent (see coordinator SOUL.md Stage 3)
11. Use `delegate_task` for Engineering Agent (see coordinator SOUL.md Stage 3)
12. Wait for both to complete
13. Verify handoffs: `marketing-to-consolidator.md` and `engineering-to-consolidator.md`
14. Kanban tasks → DONE

### Step 4: Consolidate
15. Create Kanban task: "Consolidate report" → IN_PROGRESS
16. Use `delegate_task` for Consolidator (see coordinator SOUL.md Stage 4)
17. Verify: `workspace/shared-data/consolidated-output/final-report.md` exists
18. Kanban task → DONE
19. Report final status with file counts

## Validation Checklist
- [ ] Monitor handoff has regulation_name and source_path
- [ ] All 5 extracted files present (summary.md, obligations.json, definitions.json, timelines.json, penalties.json)
- [ ] Each extracted file contains regulation_name and source_body fields
- [ ] Both marketing handoffs complete
- [ ] Both engineering handoffs complete
- [ ] Final report exists and contains the regulation name in its title

## Pitfalls
- Don't proceed if reader output is incomplete — garbage in = garbage out.
- One subagent failing doesn't kill the other — isolate failures.
- Use Kanban to persist state in case of crash/restart.
- delegate_task spawns subagents within your session — they inherit your context.
