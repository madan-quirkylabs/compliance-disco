---
name: build-compliance-artifacts
description: Produce technical compliance artifacts — schemas, templates, architecture docs
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, engineering, technical, dpdp]
---

# Build Compliance Artifacts

## When to Use
When producing engineering-facing compliance materials. Trigger: "build artifacts", "technical compliance", "architecture".

## Procedure
1. Read all files in `workspace/shared-data/extracted-regulations/`.
2. Read dispatch instructions from `workspace/shared-data/handoffs/coord-to-engineering.md`.
3. Produce four deliverables in `workspace/shared-data/engineering-output/`:

### data-classification.md
- Classification of all data types under DPDP (personal, sensitive, financial)
- Mapping table: data type → DPDP category → required controls → section reference
- Suggested database schema for data inventory
- Retention policy recommendations per category

### consent-architecture.md
- Consent collection flow (UX + API)
- Consent storage schema (database design)
- Consent withdrawal mechanism
- Audit trail requirements
- Cross-border transfer controls
- API endpoint definitions (REST or GraphQL)
- Code patterns for consent banner implementation

### dpia-template.md
- Data Protection Impact Assessment template
- Sections: Description of processing, necessity & proportionality, risks, mitigation measures
- Pre-filled with DPDP-specific risk categories
- Scoring rubric for risk severity × likelihood
- Review & sign-off workflow

### implementation-guide.md
- Phased rollout plan:
  - Phase 1 (0-30 days): Critical controls (consent, breach notification, DPO appointment)
  - Phase 2 (30-90 days): Important controls (data classification, retention, cross-border)
  - Phase 3 (90-180 days): Best practices (DPIA, automated monitoring, audit)
- Effort estimates per phase
- Tool recommendations (open-source + commercial)
- Testing strategy for each control

4. Write completion handoff.

## Pitfalls
- Every technical recommendation MUST cite the DPDP section it addresses.
- Don't assume GDPR equivalence — DPDP has differences (e.g., no DPO required for all fiduciaries).
- Consent architecture must handle both consent-based and legitimate-use processing.
