# Executive Compliance Report — DPDP Act 2023

**Date:** 2026-07-12
**Prepared by:** Consolidator Agent
**Audience:** Leadership (CTO, CPO, CEO, DPO)

---

## 1. Executive Summary

The DPDP Act 2023 demands a foundational rewrite of how the organisation collects, processes, stores, and erases personal data. Across engineering and marketing, the regulation centres on three pillars: **explicit, documented consent** as the sole lawful basis for processing; **seamless withdrawal and erasure** rights that flow through every system; and **stringent protections for children's data** including an outright ban on tracking and targeted advertising for minors. Both departments share a critical dependency on a new central consent service, and the majority of P0 items must be operational before enforcement begins to avoid maximum penalty exposure.

---

## 2. Consolidated Priority Table

### P0 — Must Ship Before Enforcement

| ID | Dept | Obligation | One-Line Action |
|---|---|---|---|
| REQ-1 | Engineering | OBL-001, OBL-005, OBL-007, OBL-008, OBL-010 | Build consent-svc microservice for consent capture, storage, withdrawal, and audit. |
| REQ-2 | Engineering | OBL-002, OBL-003, OBL-004, OBL-006, OBL-035 | Implement consent-notice flow in web-app with itemised notice and 22-language support. |
| REQ-3 | Engineering | OBL-016, OBL-017, OBL-038, OBL-039 | Build breach-detection pipeline with automated alerting and notification workflow. |
| REQ-4 | Engineering | OBL-008, OBL-018, OBL-019, OBL-029, OBL-030, OBL-040, OBL-041, OBL-042 | Build cross-system erasure-orchestration pipeline with pre-erasure notice and inactive-account cron. |
| MREQ-1 | Marketing | OBL-002 | Add privacy notice footer to all promotional emails with itemised data and rights links. |
| MREQ-2 | Marketing | OBL-007 | Add one-click unsubscribe to email/SMS/WhatsApp — List-Unsubscribe, STOP keyword, quick-reply. |
| MREQ-3 | Marketing | OBL-003 | Run re-notification campaign for all pre-commencement contacts within 60 days. |
| MREQ-4 | Marketing | OBL-005 | Convert all web signup forms to explicit opt-in — no pre-checked boxes, separate purpose toggles. |
| MREQ-6 | Marketing | OBL-008, OBL-010 | Integrate all marketing platforms (ESP, SMS, WhatsApp, ads) with central consent service. |
| MREQ-7 | Marketing | OBL-024 | Block all child targeting — age gate on signup, exclude <18 on ad platforms, scrub existing DB. |
| MREQ-12 | Marketing | OBL-035 | Ensure every consent request displays an independently understandable itemised notice. |

### P1 — High Priority (Transition Period)

| ID | Dept | Obligation | One-Line Action |
|---|---|---|---|
| REQ-5 | Engineering | OBL-015, OBL-016, OBL-038 | Remediate encryption-at-rest for Kafka, S3 legacy bucket, and Redis. |
| REQ-6 | Engineering | OBL-015, OBL-038, OBL-042 | Extend CloudWatch log retention to 400 days and enrich audit events. |
| REQ-7 | Engineering | OBL-021, OBL-031, OBL-032, OBL-052 | Build self-service grievance portal with 90-day SLA tracking and escalation. |
| REQ-8 | Engineering | OBL-029, OBL-030, OBL-051 | Build self-service rights portal for correction, erasure, and data access requests. |
| REQ-9 | Engineering | OBL-022, OBL-023, OBL-024, OBL-044, OBL-045 | Implement age-verification gating and verifiable parental consent for child data. |
| REQ-14 | Engineering | OBL-034, OBL-050, OBL-053 | Enforce data residency to AWS ap-south-1 and block cross-region replication. |
| MREQ-5 | Marketing | OBL-006, OBL-004 | Rewrite all consent copy to plain language (Grade 6) and add language selector. |
| MREQ-8 | Marketing | OBL-018, OBL-030, OBL-008 | Implement erasure from all marketing databases within 7 business days of request. |
| MREQ-9 | Marketing | OBL-014 | Validate all purchased/imported leads for consent provenance and data quality. |
| MREQ-10 | Marketing | OBL-020, OBL-021, OBL-043 | Publish DPO contact on all marketing touchpoints and activate grievance portal. |
| MREQ-11 | Marketing | OBL-007, OBL-008 | Sync opt-out for ad personalisation to suppression lists on all ad platforms. |

### P2 — Important (Lower Risk / Supporting)

| ID | Dept | Obligation | One-Line Action |
|---|---|---|---|
| REQ-10 | Engineering | OBL-020, OBL-043 | Publish DPO contact prominently on web-app and in all transactional emails. |
| REQ-11 | Engineering | OBL-013 | Build processor contract registry with expiry tracking and gateway-level blocking. |
| REQ-12 | Engineering | OBL-014 | Add data-quality validation middleware before any principal-affecting decisions. |
| REQ-13 | Engineering | OBL-027, OBL-028, OBL-047, OBL-048, OBL-049 | Build SDF DPIA dashboard with algorithmic-software register and annual report export. |
| REQ-15 | Engineering | OBL-001, OBL-011 | Extend consent-svc to support legitimate-use processing basis alongside consent. |
| MREQ-13 | Marketing | OBL-017, OBL-039 | Document breach-notification runbook and add marketing-data contact extraction procedure. |
| MREQ-14 | Marketing | OBL-022, OBL-044 | Build verifiable parental consent flow for child-accessible marketing services. |
| MREQ-15 | Marketing | OBL-029 | Build self-service preference centre for data correction propagated to all platforms. |
| MREQ-16 | Marketing | OBL-009 | Document consent APIs and test integration with at least one registered Consent Manager. |

---

## 3. Cross-Cutting Themes

### 3.1 Consent as the Central Spine

The consent management service (REQ-1) is the single most critical dependency for both departments. **Everything else connects to it:**

| Engineering Requirement | Marketing Requirement | Shared Dependency |
|---|---|---|
| REQ-1: Consent-svc | MREQ-6: Consent lifecycle integration | consent-svc APIs + webhook contracts |
| REQ-2: Consent notice UX | MREQ-4: Valid consent forms | Same web-app consent flow |
| REQ-2: Multilingual notices | MREQ-5: Plain language + language selector | Shared translation system |
| REQ-2: Pre-existing re-notice | MREQ-3: Re-notify legacy leads | Shared opt-in/opt-out event stream |
| REQ-15: Legitimate use basis | — | Consent-svc must support multiple processing bases |

**Recommendation:** The consent-svc (REQ-1) and multilingual consent UX (REQ-2) are the foundation. Do not start MREQ-6, MREQ-4, or MREQ-12 until these are stable.

### 3.2 Erasure & Withdrawal Propagation

Both departments need data to be erased when a user withdraws consent or requests deletion:

| Engineering | Marketing | Shared Dependency |
|---|---|---|
| REQ-4: Cross-system erasure pipeline | MREQ-8: Erase marketing databases | Erasure event bus (Kafka) |
| REQ-4: Inactive-account erasure (3-year) | MREQ-8: Inactive-account erasure | Same 3-year inactivity detection |
| REQ-4: 48-hour pre-erasure notice | MREQ-8: 48-hour pre-erasure notice | Shared notification template |
| REQ-4: State machine (RECEIVED→COMPLETE) | MREQ-2: 24-hour withdrawal propagation | Integration contract for erasure webhooks |

**Recommendation:** REQ-4 (erasure pipeline) must be built first; MREQ-8 and the erasure aspects of MREQ-2, MREQ-6, and MREQ-11 consume its events.

### 3.3 Child Data Protections

The Act's child provisions affect both departments heavily:

| Engineering | Marketing | Shared Dependency |
|---|---|---|
| REQ-9: Age-verification gate | MREQ-7: Block child targeting | Shared age-declaration / age-verification service |
| REQ-9: Verifiable parental consent | MREQ-14: Parental consent flow | Due-diligence identity verification API |
| REQ-9: No tracking/ads for flagged users | MREQ-7: Ad audience exclusions | User profile `is_child` flag propagated to ad platforms |
| REQ-9: Guardian consent for disabilities | — | Shared consent-svc extension |

**Recommendation:** The age-verification gate and `is_child` flag (part of REQ-9) must precede MREQ-7's ad-audience scrubbing and MREQ-14's parental consent flow.

### 3.4 Breach Notification

Engineering builds the detection pipeline; marketing provides the delivery channel:

| Engineering | Marketing | Shared Dependency |
|---|---|---|
| REQ-3: Breach detection + Board notification | MREQ-13: Contact-list extraction for affected users | Contact export API from marketing systems |
| REQ-3: Data Principal notification automation | MREQ-13: Pre-approved notification templates | Email/SMS/WhatsApp delivery infrastructure |
| REQ-3: Breach-case dashboard for DPO | — | — |

**Recommendation:** REQ-3 owns the pipeline; MREQ-13 is a supporting process requirement. MREQ-13 templates can be prepared in parallel with engineering work.

### 3.5 Grievance Redressal & Rights

Engineering builds the infrastructure; marketing surfaces it:

| Engineering | Marketing | Shared Dependency |
|---|---|---|
| REQ-7: Grievance portal with 90-day SLA | MREQ-10: Publish DPO contact + grievance portal link | Shared DPO contact DB record |
| REQ-8: Rights portal (correction/erasure/access) | MREQ-15: Self-service preference centre | Same data-correction API |
| REQ-8: Data export (JSON/CSV) | — | — |

**Recommendation:** REQ-7 and REQ-8 must ship before MREQ-10's publicisation campaign begins. MREQ-15 can build on REQ-8's correction API.

### 3.6 Audit, Logging & DPIA

Supporting infrastructure that serves all other requirements:

| Engineering | Marketing | Shared Dependency |
|---|---|---|
| REQ-6: Extended audit-log retention (400 days) | MREQ-13: 1-year log retention for breach investigation | Same CloudWatch log groups |
| REQ-13: SDF annual DPIA dashboard | — | Consumes data from all requirements |
| REQ-11: Processor contract registry | — | — |

**Recommendation:** REQ-6 (audit log retention) is a dependency for every other requirement's audit trail. Start it early alongside REQ-1.

### 3.7 Data Quality

| Engineering | Marketing | Shared Dependency |
|---|---|---|
| REQ-12: Data-quality gates for decisions | MREQ-9: Validate purchased lead lists | Shared data-quality rules engine |

---

## 4. Recommended Sequencing

### Sprint 1-2: Foundation (Weeks 1-4)
1. **REQ-1** — consent-svc (consent capture, storage, withdrawal API, audit trail)
2. **REQ-2** — multilingual consent notice UI (language picker, itemised notice, pre-existing re-notice)
3. **REQ-6** — extend CloudWatch log retention + enrich audit event schema
4. **MREQ-4** — migrate all web signup forms to explicit opt-in (pairs with REQ-2 UI)

### Sprint 3-4: Erasure & Withdrawal (Weeks 5-8)
5. **REQ-4** — cross-system erasure pipeline (state machine, pre-erasure notice, inactive-account cron)
6. **MREQ-2** — one-click unsubscribe on all channels (consumes REQ-4 events)
7. **MREQ-3** — re-notification campaign for pre-commencement contacts (60-day deadline)
8. **MREQ-12** — compliance audit of all consent notices on marketing channels

### Sprint 5-6: Child Protections (Weeks 9-12)
9. **REQ-9** — age-verification gate, `is_child` flag, verifiable parental consent flow
10. **MREQ-7** — block child targeting (scrub ad audiences, exclude <18 in campaigns)
11. **MREQ-14** — parental consent flow for marketing-adjacent services

### Sprint 7-8: Breach, Grievance & Rights (Weeks 13-16)
12. **REQ-3** — breach-detection pipeline + notification workflow
13. **REQ-7** — grievance portal with 90-day SLA tracking
14. **REQ-8** — rights portal (correction, erasure, data access)
15. **MREQ-13** — breach-notification runbook + contact extraction procedure

### Sprint 9-10: Full Integration (Weeks 17-20)
16. **MREQ-6** — integrate all marketing platforms with consent-svc via webhooks
17. **MREQ-5** — plain-language rewrite + language selector on all notices
18. **MREQ-8** — marketing erasure pipeline (consumes REQ-4 events)
19. **MREQ-10** + **REQ-10** — DPO contact publishing across all surfaces
20. **MREQ-11** — ad-platform opt-out sync

### Sprint 11-12: SDF & Remaining (Weeks 21-24)
21. **REQ-5** — encryption-at-rest remediation (Kafka, S3, Redis)
22. **REQ-14** — data-residency controls (AWS ap-south-1 lock-down)
23. **REQ-13** — SDF DPIA / audit evidence dashboard
24. **REQ-11** — processor contract registry
25. **REQ-12** — data-quality validation gates
26. **REQ-15** — legitimate-use processing basis
27. **MREQ-9** — lead-list data-quality validation
28. **MREQ-15** — self-service preference centre
29. **MREQ-16** — Consent Manager integration

### Ongoing (Start Sprint 1, Continue Through All Sprints)
- **MREQ-1** — audit all email templates for privacy notice footer (incrementally)
- Cross-team consent-svc integration testing per sprint
- Quarterly DPIA evidence collection (starts after Sprint 10)
- Monthly compliance posture reviews

---

*This report is auto-generated by the Consolidator Agent. All requirement IDs reference `engineering-requirements.md` (REQ-*) and `marketing-requirements.md` (MREQ-*).*
