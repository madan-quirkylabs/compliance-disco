---
name: merge-and-validate
description: Merge marketing and engineering outputs into a unified compliance report
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, consolidation, merge]
---

# Merge and Validate

## When to Use
When both parallel agents have completed their work. Trigger: "consolidate", "merge", "final report".

## Procedure
1. Wait for BOTH handoff files:
   - `workspace/shared-data/handoffs/marketing-to-consolidator.md`
   - `workspace/shared-data/handoffs/engineering-to-consolidator.md`
   If either is missing, STOP and report which is missing.
2. Read all files from:
   - `workspace/shared-data/marketing-output/` (4 files)
   - `workspace/shared-data/engineering-output/` (4 files)
   - `workspace/shared-data/extracted-regulations/` (5 files, for cross-reference)
3. Cross-validate:
   - Marketing claims about deadlines match engineering timelines
   - Obligation counts are consistent across both outputs
   - No contradictions between marketing and engineering recommendations
4. Produce unified report at `workspace/shared-data/consolidated-output/final-report.md`.

## Final Report Structure
```markdown
# DPDP Act Compliance Report
## 1. Executive Summary
## 2. Regulation Overview (from reader extraction)
## 3. Business Obligations (from marketing — guide + checklist merged)
## 4. Technical Implementation (from engineering — all 4 artifacts synthesized)
## 5. Unified Timeline (merged from both, conflicts resolved)
## 6. FAQ (from marketing, enriched with engineering context)
## 7. Gaps & Recommendations
## 8. Appendix: Source References
```

## Cross-Validation Rules
- If marketing says "30 days" and engineering says "60 days" → flag conflict, use stricter deadline.
- If engineering recommends a tool not mentioned in marketing guide → add to guide.
- If marketing mentions an obligation not in engineering → add to implementation guide.

## Pitfalls
- Don't let the report exceed 5000 words — it's a deliverable, not a novel.
- "Gaps & Recommendations" section is mandatory — don't skip it even if everything looks clean.
- Final report must be self-contained; reader shouldn't need to open other files.
