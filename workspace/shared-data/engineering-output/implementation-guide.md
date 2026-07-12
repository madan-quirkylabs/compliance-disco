# Implementation Guide — DPDP Act 2023 & Rules 2025 Compliance

**Target Audience**: Engineering, Infrastructure, Security
**Regulation**: Digital Personal Data Protection Act, 2023 + DPDP Rules, 2025
**Enforcement Deadline**: Majority of substantive obligations — 18 months from Rule publication (**2027-05-13**)
**Consent Manager obligations**: **2026-11-13** (1 year from publication)

---

## Phase 0: Foundation (Months 0–1)

### 0.1 Governance Setup

- [ ] **Appoint Data Protection Officer** (S.10(2)(a)) — must be based in India. If the organisation is not yet classified as an SDF, designate a person responsible for data protection as a DPO-equivalent.
- [ ] **Engage independent data auditor** (S.10(2)(b)) — required for SDFs; advisable for all data fiduciaries.
- [ ] **Map all data flows** — create a living inventory of all personal data processing activities (template in `impact-assessment-template.md` §2).
- [ ] **Audit existing Data Processor agreements** (S.8(2)) — ensure contracts include DPDP-relevant clauses: purpose limitation, security safeguards, breach notification, sub-processing restrictions, erasure obligations.

### 0.2 Infrastructure Audit

- [ ] **All unencrypted stores**: Enable encryption at rest.
  - `blob-store` (S3 legacy bucket): Enable SSE-S3 or SSE-KMS.
  - `events` (Kafka): Enable TLS for in-transit encryption + KMS for at-rest encryption on topics with C3 data.
  - `cache` (Redis): Enable AUTH + TLS. Evaluate Redis at-rest encryption.
- [ ] **Enable CloudWatch log encryption**: Use KMS-managed key (CMK).
- [ ] **Verify internal service mesh TLS**: Ensure all east-west traffic (api → user-db, api → kafka, etc.) is TLS-encrypted.

**Effort**: ~2 weeks | **Owner**: Infra

---

## Phase 1: Consent & Notice (Months 1–4) — Critical Path

### 1.1 Consent Service (CTL-01, CTL-02, CTL-04)

Build a new `consent-svc` microservice:

```
┌──────────────┐     GET/POST /consent         ┌──────────────┐
│  web-app     │───────────────────────────────→│  consent-svc │
│  (React)     │←───────────────────────────────│  (new)       │
│  - consent    │     {consent_id, status, ts}   │              │
│    UI         │                                │  DB: consent │
│  - withdrawal │                                │  records     │
│  - notice     │                                │  + audit log │
└──────────────┘                                └──────────────┘
```

**Capabilities required**:
1. **Consent capture** (S.6(1)): Record consent with clear affirmative action, timestamp, and the specific notice/terms version.
2. **Notice display** (S.5, Rule 3): Before consent request, display itemised personal data + purpose in clear/plain language. Support English + any Eighth Schedule language (S.5(3)).
3. **Consent withdrawal** (S.6(4)): API + UI to withdraw consent. Ease of withdrawal must be comparable to giving consent.
4. **Audit trail** (S.6(10)): Every consent lifecycle event (give, review, withdraw) is logged with identity, timestamp, and terms version. Data Fiduciary bears burden of proof.
5. **Pre-existing consent** (S.5(2)): For users whose consent was obtained before Act commencement, send notice as soon as reasonably practicable.

**Data model**:

```json
{
  "consent_id": "uuid",
  "data_principal_id": "user_uuid",
  "notice_version": "v1.0_2027-01-01",
  "purpose": "Account creation and service delivery",
  "data_items": ["name", "email", "phone_hash"],
  "lawful_basis": "consent",
  "status": "active|withdrawn|expired",
  "given_at": "2027-01-15T10:30:00Z",
  "withdrawn_at": null,
  "withdrawal_method": null
}
```

### 1.2 Verifiable Consent for Child Data (CTL-05, S.9, Rule 10)

- [ ] **Age gate**: Before collecting any personal data, prompt user to confirm age.
- [ ] **Parent verification**: If user indicates under 18:
  - Request parent's verifiable consent using reliable identity details (Rule 10(2)(b)(i)) or
  - Integrate with DigiLocker / authorised entity for parent identity + age verification (Rule 10(2)(b)(ii)).
- [ ] **No tracking / behavioural monitoring of children** (S.9(3)) — enforce in a policy that blocks child-related consent flows from behavioural tracking (segment, analytics, etc.).
- [ ] **No targeted advertising to children** (S.9(3)) — ensure ad-tech systems exclude child-identified user segments.

### 1.3 Consent Manager Integration (CTL-03, S.6(7)–(9), Rule 4)

**Deadline**: 2026-11-13

- [ ] Evaluate whether to build in-house Consent Manager or register with / integrate an existing registered Consent Manager.
- [ ] If building: must register with the Board, meet the First Schedule Part A conditions, and comply with Part B obligations (7-year record retention, no data reading, conflict-of-interest safeguards, etc.).
- [ ] Expose API for Consent Manager to give/manage/review/withdraw consent on behalf of Data Principal (interoperable, transparent, accessible).

**Effort**: 3–4 sprints (parallel to Phase 1) | **Owner**: Product Eng + Platform Eng

---

## Phase 2: Security Safeguards (Months 2–5)

### 2.1 Access Control (CTL-08)

- [ ] Implement fine-grained RBAC for all systems hosting C3/C4 data:
  - **user-db**: Role-based access (admin, read-only, service) via IAM or database roles.
  - **events**: Kafka ACLs per topic (producer/consumer groups).
  - **blob-store**: S3 bucket policies + IAM roles; no public access.
  - **analytics / Snowflake**: Role-based access with row-level security for user_id.
- [ ] Enforce least privilege: no system has access it doesn't need for its function.
- [ ] Review all service accounts; rotate credentials.

### 2.2 Logging & SIEM (CTL-09, CTL-18)

- [ ] **Extend CloudWatch log retention** from 90 days to **1 year** (Rule 8(3)) for all logs containing personal data, traffic data, or audit trails.
- [ ] **Deploy SIEM** (or log aggregation + alerting) with rules for:
  - Multiple failed authentication attempts → possible breach
  - Unusual data export from user-db
  - Access to blob-store from unrecognised IPs
  - Modification of deletion/retention controls
- [ ] **Breach detection**: Wire SIEM alerts to incident-response system (Phase 3).

### 2.3 Data Processor Contracts (CTL-11)

- [ ] Identify all Data Processors (AWS, Snowflake, any third-party services processing personal data).
- [ ] Ensure each contract includes:
  - Purpose limitation (process only as instructed by Data Fiduciary)
  - Security safeguards (S.8(5), Rule 6)
  - Breach notification obligation to Data Fiduciary
  - Erasure/deletion of data on termination
  - No sub-processing without prior consent
  - Audit rights for Data Fiduciary (direct or via independent auditor)

**Effort**: 2–3 sprints | **Owner**: Platform Eng + Legal

---

## Phase 3: Incident Response & Breach Notification (Months 3–5)

### 3.1 Breach Response SOP (CTL-12)

Create a documented incident-response procedure aligned to Rule 7:

**Timeline**:
```
Breach detected
     │
     ▼
[Phase 1: Triage]       ⟵ initial assessment (within minutes)
  → Determine scope, data involved, affected users
  → Classify: personal data breach per S.2(u)?
     │
     ▼
[Phase 2: Notification to Board]    ⟵ WITHOUT DELAY (Rule 7(2)(a))
  → Initial intimation: brief description (can be partial)
  → Channel: as prescribed by Board
     │
     ▼
[Phase 3: Detailed Report]           ⟵ WITHIN 72 HOURS (Rule 7(2)(b))
  → Full: nature, description, consequences, measures taken, contact info
  → Include: timeline, root cause, data categories affected
     │
     ▼
[Phase 4: Affected DP Notice]       ⟵ WITHOUT DELAY (Rule 7(1))
  → Via user account notification + registered communication mode
  → Content: description, consequences, measures taken, safety steps, DPO contact
```

### 3.2 Notification Infrastructure (CTL-13)

- [ ] Build breach-notification service that can reach all affected Data Principals:
  - **Primary channel**: User account notification (in-app dashboard/message centre)
  - **Secondary channel**: Email and/or SMS (if available)
- [ ] Create notification templates for:
  - Initial Board intimation (Rule 7(2)(a))
  - Detailed Board report (Rule 7(2)(b))
  - Data Principal notification (Rule 7(1))
- [ ] Implement 72-hour escalation timer in incident-response tooling (CTL-14).

**Effort**: 2–3 sprints | **Owner**: Security + Platform Eng

---

## Phase 4: Data Rights & Erasure (Months 4–7)

### 4.1 Rights-Request Portal (CTL-19)

Build a UI for Data Principals to exercise rights under Chapter III (S.12–14):

| Right | Act Ref | Implementation |
|-------|---------|----------------|
| Access to information | S.11 | API to retrieve personal data held about the user |
| Correction / completion / update | S.12(2) | Form + API to modify user profile fields |
| Erasure | S.12(3) | Form + API to request erasure (see 4.2) |
| Grievance redressal | S.13 | Ticketing workflow (see 4.3) |
| Nomination | S.14 | Designate nominee for data upon death |

- Publish means for exercising these rights prominently on website/app (Rule 14(1)).
- Respond to all rights requests within **90 days** (Rule 14(3)). Exceptionally complex requests may be kept alive beyond 90 days only with clear communication to the Data Principal.

### 4.2 Cross-System Deletion Orchestrator (CTL-15, CTL-16, CTL-17)

Build a deletion pipeline that ensures erasure across all systems when consent is withdrawn or purpose is no longer served (S.8(7)):

```
Data Principal submits erasure request
     │
     ▼
[Deletion Orchestrator]
     │
     ├──→ user-db (RDS): DELETE user records
     │                         Update: anonymise user_id
     ├──→ events (Kafka): DELETE / compact event topics by user_id
     ├──→ blob-store (S3): DELETE user-uploaded documents
     ├──→ cache (Redis): DELETE session / OTP tokens
     ├──→ analytics (Snowflake): DELETE or anonymise user_id in aggregates
     └──→ logs (CloudWatch): MASK or DELETE where possible (legal hold then delete)
     │
     ▼
[Notification to Data Principal]    ⟵ confirmation of erasure
```

**Inactivity-based erasure for specified classes** (Rule 8(1), Third Schedule):
- If the organisation is an e-commerce, online gaming intermediary, or social media intermediary above specified user thresholds:
  - Track `last_approach_timestamp` (login, API call, any user interaction)
  - If inactive for **3 years** from last approach or Rules commencement (whichever is later), flag for erasure.
  - Send **48-hour notice** before erasure (Rule 8(2)) — user can re-engage to reset timer.
- For other classes: retain only as long as the specified purpose is served (S.8(7)).

### 4.3 Grievance Ticketing System (CTL-20)

- [ ] Build or integrate a grievance-ticketing workflow:
  - Each grievance logged with unique reference number
  - Automatically assigned to DPO or grievance officer
  - SLA: respond within 90 days of receipt (Rule 14(3))
  - Escalation: if unresolved within 90 days, escalate to senior management
- [ ] Provide readily available means of grievance redressal (S.13(1)) — link on every page of the app.

**Effort**: 4–5 sprints | **Owner**: Product Eng + Platform Eng

---

## Phase 5: SDF-Specific Obligations (Months 6–8)

*Only if the organisation is notified as a Significant Data Fiduciary under S.10.*

### 5.1 Annual DPIA (CTL-24)

- [ ] Use `impact-assessment-template.md` as the baseline.
- [ ] First DPIA must be completed within 12 months of SDF notification.
- [ ] Repeat annually (Rule 13(1)).
- [ ] Report significant observations to the Board (Rule 13(2)).

### 5.2 Annual Audit (CTL-25)

- [ ] Engage independent data auditor (appointed per S.10(2)(b)).
- [ ] Conduct audit within 12 months of SDF notification.
- [ ] Repeat annually.
- [ ] Share audit observations with the Board when requested.

### 5.3 Algorithmic Software Diligence (CTL-26, Rule 13(3))

- [ ] Create diligence checklist for any algorithmic software processing personal data:
  - Is the algorithm likely to pose a risk to rights of Data Principals?
  - Does it process child data?
  - Is the decision-making transparent and explainable?
  - Can users appeal automated decisions?
- [ ] Document diligence findings per system.

### 5.4 Data Localisation (CTL-27, Rule 13(4))

- [ ] Monitor Central Government notifications regarding specified personal data categories that must not leave India.
- [ ] Document current data residency (all data currently in `ap-south-1` Mumbai).
- [ ] Prepare architecture for data localisation enforcement (geofencing S3 bucket policies, Kafka replica placement).

**Effort**: 2–3 sprints | **Owner**: DPO + ML/AI Eng + Infra

---

## Phase 6: Publishing & Ongoing Compliance (Months 7–8)

### 6.1 DPO Contact Publication (CTL-21)

- [ ] Publish DPO business contact information prominently on:
  - Company website
  - Web-app (footer / settings page)
  - Mobile app (if applicable)
  - In all responses to rights requests
- [ ] If no DPO (not an SDF), publish contact of the person able to answer questions about data processing (S.8(9), Rule 9).

### 6.2 Notice Compliance (Rule 3, OBL-035)

- [ ] Update all consent notices to be:
  - Independently understandable (standalone, not buried in ToS)
  - Clear and plain language
  - Itemised: each personal data point + specific purpose
  - Include communication link for: withdrawal of consent, exercise of rights, complaint to the Board
- [ ] Provide notice in English + Eighth Schedule languages (S.5(3))

### 6.3 Data Retention Policy

- [ ] Document and enforce retention schedule (see `data-classification.md` §5).
- [ ] Implement automated retention enforcement:
  - Logs: CloudWatch lifecycle policy set to 1 year
  - Inactive accounts: sweep job for 3-year inactivity
  - Consent records: retain for at least as long as data processed under that consent + 1 year

---

## Effort Summary

| Phase | Duration | Sprint Count | Dependencies |
|-------|----------|-------------|--------------|
| Phase 0: Foundation | 0–1 month | 2 sprints | Executive buy-in, budget |
| Phase 1: Consent & Notice | 1–4 months | 6–8 sprints | Phase 0 (DPO, data flows) |
| Phase 2: Security Safeguards | 2–5 months | 4–6 sprints | Phase 0 (infra audit) |
| Phase 3: Incident Response | 3–5 months | 3–4 sprints | Phase 0, Phase 2 |
| Phase 4: Data Rights & Erasure | 4–7 months | 6–8 sprints | Phase 1 (consent service) |
| Phase 5: SDF Obligations | 6–8 months | 4–6 sprints | SDF notification from Gov |
| Phase 6: Publishing & Ongoing | 7–8 months | 2 sprints | Phase 1, Phase 4 |

**Total core effort**: ~12–16 engineering sprints over 8 months (parallel workstreams).
**External dependencies**: SDF notification (Government), Consent Manager registration (Board), data auditor engagement.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Government notifies SDF criteria with <12 months transition | Medium | High | Prepare SDF capabilities ahead of notification |
| Consent Manager registration queue / delays | Medium | Medium | Start process 6 months before Rule 1(3) deadline |
| "Reasonable time" / "as soon as reasonably practicable" ambiguity | High | Low | Adopt conservative internal guidelines (e.g., 30 days for erasure) |
| Data Processor contracts found insufficient | Medium | High | Audit early (Phase 0); renegotiate key contracts |
| Cross-system deletion orchestrator scope creep | Medium | Medium | Start with 2 primary stores (user-db, blob-store); iterate |

---

## Quick Reference: Key Deadlines

| Date | Milestone | Act/Rule Ref |
|------|-----------|--------------|
| 2025-11-13 | Rules 1, 2, 17–21 in force (definitions, Board procedures) | Rule 1(2) |
| 2026-11-13 | Consent Manager obligations in force | Rule 1(3), Rule 4 |
| **2027-05-13** | **Majority of obligations in force** (notice, security safeguards, breach notification, verifiable consent, rights, etc.) | Rule 1(4), Rules 3, 5–16, 22, 23 |
| Ongoing | Annual DPIA & audit for SDFs | Rule 13(1) |

---

*Obligations source: `workspace/shared-data/extracted-regulations/obligations.json`*
*System inventory: `agents/engineering-agent/skills/build-compliance-artifacts/references/system-inventory.md`*
*Control catalog: `agents/engineering-agent/skills/build-compliance-artifacts/references/controls.md`*
