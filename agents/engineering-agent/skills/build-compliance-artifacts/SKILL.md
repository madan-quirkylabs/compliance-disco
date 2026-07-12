---
name: build-compliance-artifacts
description: Produce technical compliance artifacts — schemas, templates, architecture docs — for any regulation from its extracted obligations
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, engineering, technical]
---

# Build Compliance Artifacts

Regulation-agnostic. The regulation and its obligations come from
`extracted-regulations/`; this skill turns them into engineering deliverables.
(Test/example flow: India DPDP Act 2023 + Rules 2025.)

## When to Use
When producing engineering-facing compliance materials. Trigger: "build artifacts", "technical compliance", "architecture".

## Grounding (required)
Before producing anything, load the context bundled with this skill:
- `references/system-inventory.md` — the org's systems, data stores, and current controls to
  assess against. Name **real systems** in your output (e.g. "the unencrypted `events` Kafka
  topic", "no consent service exists yet") — do not speak in generic templates.
- `references/controls.md` — a framework-neutral control catalog. Map every control to a
  framework ID (ISO 27001 / SOC 2 / NIST). Cite that **and** the source regulation's provision.

## Procedure
1. Read the grounding references above.
2. Read all files in `workspace/shared-data/extracted-regulations/` — determine which
   regulation applies and enumerate its obligations. Everything below is driven by these.
3. Read dispatch instructions from `workspace/shared-data/handoffs/coord-to-engineering.md`.
4. Produce four deliverables in `workspace/shared-data/engineering-output/`:

### data-classification.md
- Classify the data/assets the regulation governs into its categories
- Mapping table: data type → regulation category → required controls → provision reference
- Suggested database schema for a data inventory
- Retention policy recommendations per category

### control-architecture.md
- Technical architecture for the regulation's **core controls**. For privacy regulations
  this is consent/lawful-basis management (collection, storage, withdrawal, audit trail,
  cross-border transfer). For other regimes, that regulation's central control.
- Storage schema + API endpoint definitions (REST or GraphQL)
- Code patterns for the key control (e.g. consent banner) where applicable

### impact-assessment-template.md
- The assessment structure the regulation expects (e.g. a DPIA for privacy regulations)
- Sections: description of processing, necessity & proportionality, risks, mitigations
- Pre-filled with the regulation's specific risk categories
- Scoring rubric for risk severity × likelihood + review/sign-off workflow

### implementation-guide.md
- Phased rollout plan:
  - Phase 1 (0–30 days): critical controls
  - Phase 2 (30–90 days): important controls
  - Phase 3 (90–180 days): best practices
- Effort estimates per phase, tool recommendations (open-source + commercial),
  testing strategy for each control

5. Write completion handoff.

## Pitfalls
- Every technical recommendation MUST cite the source regulation's provision it addresses
  **and** its framework mapping from `references/controls.md`.
- Ground claims in `references/system-inventory.md` — call out the org's actual gaps
  (unencrypted stores, missing consent service, short log retention), not hypotheticals.
- Don't assume equivalence across regulations (e.g. DPDP ≠ GDPR — DPDP has no DPO
  requirement for all fiduciaries). Read what the extracted source actually says.
