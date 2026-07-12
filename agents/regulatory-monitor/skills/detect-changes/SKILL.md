---
name: detect-changes
description: Diff current regulatory findings against known state and flag new items
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, monitoring, diff, detection]
---

# Detect Changes

## When to Use
When the monitor has fetched a regulatory source and needs to identify new items. Trigger: "compare", "diff", "what's new".

## Procedure
1. Read `workspace/shared-data/monitored-sources/known-items.json`.
2. Read the fetched items from the current scan.
3. For each fetched item, check if its ID exists in `known-items.json.sources[source].items`.
4. If NOT found → it's new. Add to the "new items" list.
5. If found → skip.
6. Write new items to detection log at `workspace/shared-data/detection-log/{date}-{source}.json`.

## Change Categories
| Category | Meaning | Pipeline Action |
|----------|---------|----------------|
| `new_regulation` | Brand new act/rule published | Full pipeline (extraction + all departments) |
| `amendment` | Existing regulation modified | Targeted re-run of affected sections |
| `circular` | Guidance/clarification from regulator | Extraction only + summary to CCO |
| `deadline_update` | Compliance deadline changed | Update timelines, alert CCO |

## Idempotency
- Running detect-changes twice with the same data should produce the same result.
- Always update `known-items.json` atomically (read all, write all).

## Pitfalls
- Don't use title-matching alone — titles change slightly between scrapes.
- Use a stable identifier (URL or regulation number) as the dedup key.
- Some sources add items at the top, others at the bottom — check all positions.
