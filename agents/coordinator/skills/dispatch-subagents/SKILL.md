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
When the coordinator needs to invoke parallel worker agents after reader extraction is complete.

## How delegate_task Works

`delegate_task` spawns ephemeral subagents **within the current session**. The subagent
inherits the parent's context (SOUL, memory, tools) but runs independently. Use it to
fan out work in parallel without leaving the coordinator session.

## Procedure

1. Read `regulation_name` and `source_body` from the reader handoff.
2. Invoke Marketing Agent via `delegate_task` with a self-contained prompt.
3. Invoke Engineering Agent via `delegate_task` with a self-contained prompt.
4. Both prompts MUST include:
   - The regulation name and source body
   - Where to read input files from
   - Where to write output files to
   - Which handoff file to signal completion

## Marketing Prompt Template
```
You are the Marketing Agent. Produce customer-facing compliance content.

Regulation: {regulation_name}
Source Body: {source_body}

Read extracted data from workspace/shared-data/extracted-regulations/
and produce 4 files in workspace/shared-data/marketing-output/:
- compliance-guide.md
- checklist.md
- faq.md
- blog-post.md

When done, write handoff to workspace/shared-data/handoffs/marketing-to-consolidator.md
with status "complete", regulation_name, source_body, and list of artifacts.
```

## Engineering Prompt Template
```
You are the Engineering Agent. Produce technical compliance artifacts.

Regulation: {regulation_name}
Source Body: {source_body}

Read extracted data from workspace/shared-data/extracted-regulations/
and grounding references from agents/engineering-agent/skills/build-compliance-artifacts/references/

Produce 4 files in workspace/shared-data/engineering-output/:
- data-classification.md
- control-architecture.md
- impact-assessment-template.md
- implementation-guide.md

When done, write handoff to workspace/shared-data/handoffs/engineering-to-consolidator.md
with status "complete", regulation_name, source_body, and list of artifacts.
```

## Pitfalls
- Each delegate_task call is a separate subagent — they don't see each other's work.
- Include ALL necessary context in the prompt — subagents can't ask you questions mid-run.
- If a subagent fails, you can retry with the same or modified prompt.
