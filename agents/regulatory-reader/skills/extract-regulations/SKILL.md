---
name: extract-regulations
description: Read regulation PDFs from any source and extract structured compliance data
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, extraction, regulation-agnostic]
---

# Extract Regulations

## When to Use
When processing new regulation documents. Trigger: "extract", "read regulation", "process PDF", or a monitor handoff arrives.

## Procedure
1. Read the monitor-to-coordinator handoff to find:
   - `regulation_name` — e.g., "DPDP Act 2023", "SEBI Circular on Data Protection"
   - `source_body` — e.g., "DPDP Board", "SEBI", "AMFI"
   - `source_path` — where the PDFs/documents are stored (e.g., `docs/regulations/dpdp/`)
2. List all PDFs/documents in the source path.
3. For each document, read the full text.
4. Extract and write to `workspace/shared-data/extracted-regulations/`:
   - `summary.md` — plain-English summary (2-3 pages max), must state the regulation name and issuing body
   - `obligations.json` — every obligation with section/article ref, description, applicability, deadline
   - `definitions.json` — all key terms with exact definitions from the regulation
   - `timelines.json` — enforcement dates, compliance deadlines, phase-in schedules
   - `penalties.json` — penalty amounts, conditions, enforcement body
5. Cross-check: every section/chapter of the regulation must appear in at least one output file.
6. Write handoff file when complete.

## Output Format: obligations.json
```json
[
  {
    "id": "OBL-001",
    "regulation": "DPDP Act 2023",
    "source_body": "DPDP Board",
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

## Output Format: summary.md
```markdown
# {Regulation Name} — Summary
**Issuing Body:** {SEBI / AMFI / RBI / DPDP Board / etc.}
**Date:** {Publication date}
**Applicability:** {Who must comply}

## Overview
{2-3 paragraph plain-English summary}

## Key Sections
{Section-by-section breakdown}
```

## Pitfalls
- Regulations vary wildly in structure — some use "Sections", others "Clauses", "Regulations", "Rules", "Annexures". Adapt your extraction accordingly.
- PDFs may have scanned images — use OCR tools if text extraction fails.
- Some regulations cross-reference other laws — note these but don't try to extract them.
- Always tag the source body and regulation name in every output file.
