---
name: dispatch-subagents
description: Fan out tasks to marketing and engineering agents via delegate_task
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, delegation, subagent]
---

# Dispatch Subagents

## When to Use
When the coordinator needs to invoke parallel worker agents. Trigger: "dispatch", "fan out", "invoke agents".

## Procedure
1. Read the monitor or reader handoff to determine:
   - `regulation_name` — e.g., "DPDP Act 2023", "SEBI Circular 2026-045"
   - `source_body` — e.g., "SEBI", "AMFI", "DPDP Board"
2. Read extracted regulations from `workspace/shared-data/extracted-regulations/`.
3. Write targeted dispatch instructions:
   - `workspace/shared-data/handoffs/coord-to-marketing.md` — marketing-specific context
   - `workspace/shared-data/handoffs/coord-to-engineering.md` — engineering-specific context
4. Each dispatch file MUST include:
   - `regulation_name` and `source_body`
   - What files to read as input
   - What output files to produce
   - Where to write outputs
   - Which handoff file to signal completion
5. Invoke `delegate_task` for each agent with their dispatch file as context.

## Dispatch Template
```markdown
# {Agent} Agent Dispatch

## Regulation
- **Name:** {regulation_name}
- **Source Body:** {source_body}

## Source Data
- `workspace/shared-data/extracted-regulations/obligations.json`
- `workspace/shared-data/extracted-regulations/summary.md`
- `workspace/shared-data/extracted-regulations/penalties.json`
- `workspace/shared-data/extracted-regulations/definitions.json`
- `workspace/shared-data/extracted-regulations/timelines.json`

## Produce
- `workspace/shared-data/{agent}-output/{file1}.md`
- `workspace/shared-data/{agent}-output/{file2}.md`
- ...

## Completion
- Write handoff to `workspace/shared-data/handoffs/{agent}-to-consolidator.md`
```

## Pitfalls
- Don't overload a single delegate_task with both agents — use separate calls.
- Include enough context in dispatch files that agents don't need to guess paths.
- Always pass `regulation_name` — agents need it to produce regulation-specific output.
