---
name: extract-regulations
description: Read DPDP Act PDFs and extract structured compliance data
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, dpdp, extraction]
---

# Extract Regulations

## When to Use
When processing new regulation documents. Trigger: "extract", "read regulation", "process PDF".

## Procedure
1. List all PDFs in `docs/regulations/dpdp/`.
2. For each PDF, read the full text.
3. Extract and write to `workspace/shared-data/extracted-regulations/`:
   - `summary.md` — plain-English summary (2-3 pages max)
   - `obligations.json` — every obligation with section ref, description, applicability, deadline
   - `definitions.json` — all key terms with exact statutory definitions
   - `timelines.json` — enforcement dates, compliance deadlines, phase-in schedules
   - `penalties.json` — penalty amounts, conditions, enforcement body
4. Cross-check: every section of the Act must appear in at least one output file.
5. Write handoff file when complete.

## Output Format: obligations.json
```json
[
  {
    "id": "OBL-001",
    "section": "Section 4(1)",
    "title": "Consent Requirement",
    "description": "No personal data processing without consent",
    "applies_to": "Data Fiduciary",
    "deadline": "Upon enactment",
    "penalty_ref": "Section 33",
    "ambiguity_flag": false,
    "notes": ""
  }
]
```

## Pitfalls
- PDFs may have scanned images — use OCR tools if text extraction fails.
- Cross-border transfer rules have exceptions — don't oversimplify.
- "Significant Data Fiduciary" has separate obligations — tag them clearly.

## Verification
- Count of obligations should cover every section of the Act.
- No obligation should have an empty `section` field.
- Summary must mention all 7 chapters of the DPDP Act.
