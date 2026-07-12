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
1. Read extracted regulations from `workspace/shared-data/extracted-regulations/`.
2. Write targeted dispatch instructions:
   - `workspace/shared-data/handoffs/coord-to-marketing.md` — marketing-specific context
   - `workspace/shared-data/handoffs/coord-to-engineering.md` — engineering-specific context
3. Each dispatch file must include:
   - What files to read as input
   - What output files to produce
   - Where to write outputs
   - Which handoff file to signal completion
4. Invoke `delegate_task` for each agent with their dispatch file as context.

## Dispatch Template
```markdown
# Marketing Agent Dispatch
## Source Data
- `workspace/shared-data/extracted-regulations/obligations.json`
- `workspace/shared-data/extracted-regulations/summary.md`
- `workspace/shared-data/extracted-regulations/penalties.json`

## Produce
- `workspace/shared-data/marketing-output/compliance-guide.md`
- `workspace/shared-data/marketing-output/checklist.md`
- `workspace/shared-data/marketing-output/faq.md`
- `workspace/shared-data/marketing-output/blog-post.md`

## Completion
- Write handoff to `workspace/shared-data/handoffs/marketing-to-consolidator.md`
```

## Pitfalls
- Don't overload a single delegate_task with both agents — use separate calls.
- Include enough context in dispatch files that agents don't need to guess paths.
