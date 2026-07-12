# Marketing Compliance Agent — Buildathon MVP Spec

> Source: [Notion — Marketing Compliance Agent — Buildathon MVP Spec](https://app.notion.com/p/d39096183c414f9485e650ad010a52cb)

> 🎯 **Buildathon goal:** demonstrate one reliable end-to-end flow in which the agent compares a real marketing practice with a newly extracted DPDP requirement, produces a traceable gap assessment, communicates the decision upward, and gives the marketing team clear actions.

## 1. Purpose

The Marketing Compliance Agent is the department-level interpreter in the wider AI Compliance Agent System. It translates law-based compliance points into marketing-specific implications by comparing them with the organisation's current marketing practices.

It is **not a legal extractor** and should not reinterpret the full regulation. It receives structured requirements from the Extractor/Coordinator, applies marketing context, identifies gaps, and communicates:

- **Upward:** evidence-backed findings, uncertainty, risk and recommended changes to the Coordinator, Composer and Chief Compliance Officer (CCO).
- **Downward:** specific, plain-language instructions and checklists for marketing team members.

## 2. Buildathon scope

### In scope

- Consent for promotional email, SMS, WhatsApp and similar outreach
- Cookie and tracking consent
- Collection and use of leads or customer data
- Third-party processors, ad platforms and audience sharing
- Opt-out and consent-withdrawal handling
- Retention or deletion of marketing data
- Producing structured output for the Composer/FDO
- Human review for ambiguous or high-risk findings

### Out of scope

- Extracting or summarising the complete DPDP Act
- Giving final legal advice
- Automatically changing production campaigns or deleting customer data
- Pushback, negotiation or amendment of the final FDO
- Supporting every possible marketing channel or edge case

## 3. Users and communication paths

| User/system | What the agent receives | What the agent returns |
| --- | --- | --- |
| **Coordinator / compliance agents** | Structured compliance point, citation, priority and task ID | Marketing impact assessment, evidence, confidence, blockers and recommended controls |
| **Chief Compliance Officer** | Review request or escalation | Executive summary, risk level, unresolved questions and decision required |
| **Marketing lead** | Applicable requirement and affected workflow | Required process change, owner, deadline and acceptance criteria |
| **Marketing team member** | Role- or channel-specific instruction | Plain-language checklist, examples and confirmation request |
| **Composer** | Request for final department response | Normalised assessment suitable for the Formal Compliance Document (FDO) |

## 4. Inputs

### A. Structured compliance point

Required fields:

```json
{
  "requirement_id": "DPDP-001",
  "title": "Consent before promotional communication",
  "description": "Plain-language obligation extracted from the regulation",
  "source_citation": "Section or source reference",
  "likely_departments": ["Marketing"],
  "priority": "high"
}
```

### B. Marketing practice knowledge base

For the MVP, use a small, explicit set of documents or JSON records covering:

- Channel and campaign inventory
- How contacts enter each audience or list
- Consent collection and proof
- CRM and marketing automation fields
- Cookie/banner behaviour and analytics tags
- Ad platforms and third-party data sharing
- Unsubscribe and consent-withdrawal process
- Retention/deletion practices
- Named process owner for each workflow

Each practice record should contain: `practice_id`, `channel`, `purpose`, `data_collected`, `collection_source`, `consent_method`, `consent_evidence`, `processors`, `retention`, `opt_out_process`, `owner`, and `last_verified_at`.

### C. Runtime context

- Organisation or business unit
- Campaign/workflow being assessed
- Current task/run ID
- Previous findings or approved exceptions relevant to the same workflow
- Communication audience: CCO, compliance agent, marketing lead or team member

## 5. Core workflow

1. **Receive and validate** the structured requirement from the Coordinator.
2. **Retrieve relevant practices** by channel, data type, purpose and named platform.
3. **Compare requirement vs current state** using explicit checks rather than a free-form summary.
4. **Classify each practice:** `compliant`, `partial`, `non_compliant`, `unknown`, or `not_applicable`.
5. **Capture evidence:** quote the current-practice record and preserve the regulation citation.
6. **Identify the delta:** state exactly what must change, who owns it and how completion can be verified.
7. **Choose the communication path:**
   - Return normal findings to the Coordinator/Composer.
   - Escalate ambiguity, missing evidence, conflict or high risk to the CCO.
   - Generate role-specific instructions for the relevant marketing owner.
8. **Log the complete run:** inputs, retrieved evidence, decision, confidence, output, latency and cost.

## 6. Decision rules

- Never mark a practice compliant without both a matching control and evidence.
- Missing or stale practice data results in `unknown`, not an assumption.
- Preserve the source citation supplied by the Extractor; do not invent citations.
- Keep **legal requirement**, **observed current practice**, and **agent recommendation** as separate fields.
- Escalate when confidence is below the chosen threshold, evidence conflicts, the requirement has multiple plausible interpretations, or the proposed change materially affects campaign operations.
- Use risk levels consistently:
  - **High:** active practice appears to violate a clear requirement or lacks mandatory consent.
  - **Medium:** partial control, incomplete evidence or a fix is required before the next campaign.
  - **Low:** mostly compliant with a documentation or process-hygiene gap.

## 7. Outputs

### A. Upward compliance assessment

```json
{
  "run_id": "run-123",
  "requirement_id": "DPDP-001",
  "department": "Marketing",
  "affected_practices": ["MKT-EMAIL-01"],
  "status": "non_compliant",
  "risk": "high",
  "requirement": "Consent is required before promotional messaging",
  "current_practice": "Imported event leads are added without recorded consent",
  "evidence": ["Practice record MKT-EMAIL-01", "DPDP source citation"],
  "gap": "No provable consent for imported event leads",
  "recommended_control": "Block activation until consent source and timestamp exist",
  "owner": "Lifecycle Marketing",
  "verification": "Sample 10 activated contacts and verify consent fields",
  "confidence": 0.91,
  "decision_required": null
}
```

### B. CCO escalation

A concise message containing:

- What is known
- What is uncertain or conflicting
- Business impact of waiting vs acting
- Recommended default action
- The exact decision required from the CCO

### C. Downward marketing instruction

Use direct operational language:

> **Before activating imported event leads:** confirm each contact has a recorded consent source, timestamp and permitted channel. Do not add contacts with missing evidence to an email, SMS or WhatsApp audience. Owner: Lifecycle Marketing. Completion evidence: exported consent-field audit.

Every instruction should include the affected workflow, required change, owner, timing, acceptance criteria and escalation contact.

## 8. MVP architecture

```text
Structured requirement
        ↓
Marketing Compliance Agent
  ├─ Practice retriever → Marketing practice knowledge base
  ├─ Requirement/practice comparator
  ├─ Risk + confidence classifier
  ├─ Upward response formatter → Coordinator / Composer / CCO
  └─ Downward instruction formatter → Marketing team
        ↓
Structured run log + FDO-ready output
```

Use **Hermes as the agent runtime or coding partner** and retain visible session receipts, as required by the Hackathon Context. Prefer a narrow, deterministic workflow over broad feature coverage.

## 9. Buildathon implementation plan

### Must ship

- 3–5 sample marketing-practice records
- 3 representative DPDP compliance points
- One structured comparison flow
- Upward and downward outputs from the same finding
- One escalation path for missing or ambiguous evidence
- Persistent, inspectable run logs
- A minimal UI or bot surface where a judge can trigger and inspect a run

### Demo scenario

1. Submit: "Consent required before promotional messaging."
2. Agent retrieves the email practice for imported event leads.
3. It finds that consent evidence is missing and returns `non_compliant / high risk`.
4. The CCO view receives the finding, evidence and recommended decision.
5. The marketing view receives an actionable activation-block checklist.
6. Trigger an edge case with missing practice data; the agent returns `unknown` and escalates instead of hallucinating.

### Nice to have only after the core loop works

- Multiple marketing channels
- Conversational follow-up from the CCO or team member
- Voice input/output
- Automated evaluation pipeline
- Rich dashboard or advanced role management

## 10. Acceptance criteria

- Produces a usable structured assessment in at least **3 repeated runs**.
- Preserves the regulation citation and links every conclusion to current-practice evidence.
- Does not label missing evidence as compliant.
- Generates different, audience-appropriate upward and downward messages from one assessment.
- Escalates the prepared edge case with full context.
- A judge can inspect the run step by step, including inputs, retrieval, decision and outputs.
- Target per-run latency: **under 5 minutes**; record actual cost and latency.

## 11. Guardrails

- Human approval remains required before operational or legal decisions are final.
- Do not contact customers, change campaigns, alter consent records or delete data in the MVP.
- Do not expose personal data unnecessarily in outputs or logs; use synthetic demo data.
- Clearly label agent-generated recommendations and confidence.
- When evidence is insufficient, ask for the missing record or escalate—never fill the gap with an assumption.
