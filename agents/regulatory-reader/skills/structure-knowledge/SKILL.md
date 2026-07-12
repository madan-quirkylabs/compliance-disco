---
name: structure-knowledge
description: Transform raw regulation text into structured JSON schemas
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, schema, regulation-agnostic]
---

# Structure Knowledge

## When to Use
When raw extracted data needs reorganization or schema normalization. Trigger: "structure", "organize extraction".

## Procedure
1. Read raw extraction from `workspace/shared-data/extracted-regulations/`.
2. Validate JSON schemas are consistent (same field names, types, nesting).
3. Normalize: ensure every obligation has all required fields.
4. Add cross-references between related obligations.
5. Write normalized versions back to same location.

## Schema Validation Rules
- `obligations.json`: required fields = [id, regulation, source_body, section, title, description, applies_to, deadline]
- `definitions.json`: required fields = [term, definition, section, category]
- `timelines.json`: required fields = [event, date, description, related_sections]
- `penalties.json`: required fields = [section, offense, penalty_amount, criteria]

## Pitfalls
- Date formats must be ISO 8601 or "Upon enactment" / "TBD".
- Don't lose `[AMBIGUOUS]` flags during normalization.
- Different regulations use different terminology for similar concepts — keep the original terms.
