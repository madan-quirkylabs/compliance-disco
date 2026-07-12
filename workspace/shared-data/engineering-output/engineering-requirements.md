# Engineering Requirements — DPDP Act 2023 Compliance

## Summary

This document translates the 55 compliance obligations from the DPDP Act 2023 (extracted by the Regulatory Reader) into concrete engineering requirements for the B2B SaaS platform (AWS Mumbai, `ap-south-1`). The org must build a consent management service, a data subject rights portal, a breach notification pipeline, and remediate gaps in encryption, logging retention, data erasure, and child-data safeguards — mapped against the current system inventory (`web-app`, `api`, `user-db`, `events`, `blob-store`, `cache`, `analytics`, `logs`). Each requirement cites the obligation IDs from `obligations.json`, the mapped control-framework IDs from `controls.md` (ISO 27001:2022 / SOC 2 / NIST 800-53), and the affected system from `system-inventory.md`.

---

## Requirements

### REQ-1: Consent & Notice Management Service

| Field | Value |
|---|---|
| **Obligations** | OBL-001, OBL-002, OBL-004, OBL-005, OBL-008, OBL-030 |
| **Control mapping** | Consent/lawful-basis management (ISO A.5.34 / SOC 2 P-series / NIST privacy overlay) |
| **Priority** | P0 |
| **Affected systems** | `consent-svc` (new), `web-app`, `api`, `user-db` |

**Requirement statement:** Build a dedicated `consent-svc` microservice that captures, stores, and evidences data principal consent in accordance with Section 5–6 and Rule 3. Every consent transaction must meet the "free, specific, informed, unconditional, unambiguous, clear affirmative action" standard (OBL-004) and be preceded by a compliant notice (OBL-002, OBL-030). The service must generate audit-grade records that satisfy burden-of-proof requirements (OBL-008).

**Acceptance criteria:**
- Consent flow produces an independent notice screen (not buried in ToS) showing: itemised list of personal data collected, each specific purpose, communication link, means to withdraw consent, means to exercise rights, and complaint link to the Board (OBL-030, OBL-005).
- User must take a clear affirmative action (e.g. unchecked checkbox → user checks it; no pre-ticked boxes) for each purpose independently.
- Every consent event is logged immutably: timestamp, user_id, consent_version, notice_version, purpose(s), IP, user-agent.
- The log record is admissable as evidence — tamper-evident (e.g. append-only table or hash chain).
- `user-db` schema extended with `consent_records` table (or dedicated `consent-svc` DB) indexed by user_id + purpose.
- `consent-svc` exposes gRPC/REST API: `RecordConsent()`, `GetConsentStatus(user_id, purpose)`, `GetConsentAuditTrail(user_id)`.
- `web-app` consent UI is gated: no processing begins until consent is recorded.
- Integration test: replayed audit log proves consent was given before any data processing event.

---

### REQ-2: Consent Withdrawal & Processing Cessation Pipeline

| Field | Value |
|---|---|
| **Obligations** | OBL-006, OBL-007 |
| **Control mapping** | Consent/lawful-basis management (ISO A.5.34 / SOC 2 P-series / NIST privacy overlay); Data retention & deletion (ISO A.8.10 / NIST MP-6) |
| **Priority** | P0 |
| **Affected systems** | `consent-svc` (new), `events`, `analytics`, `blob-store`, `api`, `cache` |

**Requirement statement:** Withdrawal must be as easy as giving consent (OBL-006). Upon withdrawal, the platform must cease processing the data principal's personal data within a reasonable time and propagate cessation to all downstream systems — including Data Processors if any (OBL-007).

**Acceptance criteria:**
- Withdrawal UI is within 1 click of the same screen where consent was given; available in both web-app and API.
- Withdrawal event triggers a fan-out job to: `events` (stop producing events for user_id), `analytics` (queue anonymisation rule), `blob-store` (mark docs as non-processing), `cache` (evict user sessions), `api` (block processing endpoints for that user_id).
- The cessation is acknowledged by each downstream system within a configurable SLA (default 1 hour).
- A dashboard shows pending/complete cessation for each withdrawal.
- Integration test: after withdrawal, no new processing events appear for that user_id across the entire pipeline (verified via log audit).

---

### REQ-3: Multi-Language Notice & Consent Support

| Field | Value |
|---|---|
| **Obligations** | OBL-003, OBL-005 |
| **Control mapping** | Consent/lawful-basis management (ISO A.5.34 / SOC 2 P-series) |
| **Priority** | P1 |
| **Affected systems** | `web-app`, `consent-svc` (new), `api` |

**Requirement statement:** Data principals must have the option to access consent notices in English or any Eighth Schedule language (OBL-003). Every consent request UI must carry the language toggle and DPO contact info (OBL-005).

**Acceptance criteria:**
- Language preference is detected from browser `Accept-Language` header and offered as a toggle on the consent/notice screen.
- All 22 Eighth Schedule languages are available as locales (start with top 8: Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada — delivery teams to supply translations).
- `web-app` consent template is i18n-ready: ICU MessageFormat strings in a JSON locale bundle.
- DPO contact information (email, phone, address) renders dynamically in the consent request UI (OBL-005).
- Fallback: if a locale is incomplete, render in English with a banner "Partial translation available".

---

### REQ-4: Breach Detection, Alerting & Notification System

| Field | Value |
|---|---|
| **Obligations** | OBL-013, OBL-014, OBL-034, OBL-035, OBL-036 |
| **Control mapping** | Incident/breach response (ISO A.5.24–A.5.28 / SOC 2 CC7.3–CC7.4 / NIST IR-4, IR-6); Logging & monitoring (ISO A.8.15–A.8.16 / SOC 2 CC7.2 / NIST AU-2, AU-6, SI-4) |
| **Priority** | P0 |
| **Affected systems** | `logs`, `api`, `web-app`, `user-db`, `events`, `blob-store`, `cache` |

**Requirement statement:** Implement a breach detection and notification pipeline meeting Rule 6 (security safeguards) and Rule 7 (breach intimation). The system must: (a) detect personal data breaches in near-real-time from security event signals, (b) notify affected data principals without delay via their registered channel, (c) file a detailed intimation to the DPDP Board within 72 hours per Rule 7(2), and (d) retain breach audit records for at least 1 year.

**Acceptance criteria:**
- SIEM/webhook integration connects `logs` (CloudWatch), `api` (failed auth patterns), `user-db` (unusual query volume), `events` (anomalous data egress) into a central breach-detection pipeline.
- On breach classification (PII confirmed exposed), the system immediately fires intimation to: each affected data principal via registered communication (email/SMS/in-app) with: description, consequences, mitigation steps, safety measures, DPO contact (OBL-035).
- Within 72 hours, a Board intimation report is auto-generated containing: events/circumstances/reasons, affected records count, person causing breach (if known), remediation steps, and a copy of data-principal intimations (OBL-036).
- Board report is storable as PDF and submitable via API/web portal (placeholders for future Board system).
- Logs (breach signals, notifications sent, filings made) retained for a minimum of 1 year (OBL-034, OBL-039).
- At-rest encryption on `blob-store` legacy bucket remediated as prerequisite (OBL-013; existing gap). See also REQ-8.
- Automated test: simulated breach event triggers notification within 5 min SLA; Board report completes within 72-hour window.

---

### REQ-5: Cross-System Data Erasure Pipeline

| Field | Value |
|---|---|
| **Obligations** | OBL-015, OBL-027, OBL-037, OBL-038 |
| **Control mapping** | Data retention & deletion (ISO A.8.10 / SOC 2 A1.2 / NIST SI-12, MP-6) |
| **Priority** | P0 |
| **Affected systems** | `user-db`, `events`, `blob-store`, `cache`, `analytics`, `logs` |

**Requirement statement:** Build an automated erasure pipeline that (a) erases personal data upon consent withdrawal or purpose no longer being served (OBL-015), (b) processes data subject erasure requests (OBL-027), (c) enforces time-based erasure for covered Data Fiduciaries after 3 years (OBL-037), and (d) sends a 48-hour pre-erasure notice to the data principal (OBL-038).

**Acceptance criteria:**
- A centralized `erasure-orchestrator` service manages the lifecycle: trigger → notify-systems → confirm-erasure → log-evidence.
- Each system exposes a `DELETE /user-data/{user_id}` or equivalent that hard-deletes/anonymises PII fields:
  - `user-db`: hard-delete user row or anonymise PII columns (name→NULL, email→hash+delete, phone→NULL).
  - `events`: anonymise keyed user_id or drop events.
  - `blob-store`: delete objects or replace with redacted version.
  - `cache`: evict all keys matching user.
  - `analytics`: replace user_id with irreversible pseudonym; aggregate tables unaffected.
  - `logs`: redact PII fields in archived logs (log retention obligation aside — redact PII, keep structural logs).
- Pre-erasure notice (OBL-038): at least 48 hours before auto-erasure (OBL-037), send email/in-app notification that data will be erased unless user contacts the platform.
- Erasure audit trail: user_id, timestamp, trigger (withdrawal/request/time-based), systems confirmed, retention override if any (with legal basis citation).
- Erasure completes within SLA: 72 hours for requests, 48-hour notice window respected for time-based.
- Integration test: verify erasure leaves no PII trace across all systems by attempting to re-identify the user from each store.

---

### REQ-6: Data Subject Rights Portal

| Field | Value |
|---|---|
| **Obligations** | OBL-026, OBL-027, OBL-048 |
| **Control mapping** | Consent/lawful-basis management (ISO A.5.34 / SOC 2 P-series) |
| **Priority** | P0 |
| **Affected systems** | `web-app`, `api`, `consent-svc` (new) |

**Requirement statement:** Build a dedicated "My Data" portal in `web-app` where data principals can: view what personal data is held, request correction/update/completion (OBL-026), request erasure (OBL-027), and exercise all rights under the Act. The means to make a rights request must be prominently published (OBL-048).

**Acceptance criteria:**
- `web-app` has a `/my-data` route (POST-login) showing a summary of: account data, consent status per purpose, data shared with third parties, and a timeline of rights exercised.
- "Correct my data" form allows the user to submit corrections; triggers a review workflow that updates `user-db` and notifies user on completion.
- "Request erasure" button triggers REQ-5 pipeline; shows confirmation with ETA.
- Rights request form is accessible without login for non-authenticated data principals (email-based verification).
- The `/my-data` page and the rights request form are linked from the app footer and from every consent/notice screen.
- All rights-request activity is logged with user_id, request_type, timestamp, status, resolution.

---

### REQ-7: Grievance Redressal System

| Field | Value |
|---|---|
| **Obligations** | OBL-017, OBL-028, OBL-049 |
| **Control mapping** | Consent/lawful-basis management (ISO A.5.34 / SOC 2 P-series) |
| **Priority** | P1 |
| **Affected systems** | `web-app`, `api`, `consent-svc` (new) |

**Requirement statement:** Establish an effective mechanism to receive, track, and respond to data principal grievances within 90 days (OBL-017, OBL-028). The mechanism must be prominently published on the website/app (OBL-049).

**Acceptance criteria:**
- `web-app` has a `/grievance` page with a submission form (captcha-protected, supports attachments).
- Grievance is assigned a unique ticket ID; the principal can check status via a public status page (ticket ID + email OTP).
- Backend implements a case-management workflow: `received` → `under-review` → `resolved` → `closed`.
- SLA monitoring: automatic escalation if response exceeds 90 days (send alert to DPO + legal team).
- All grievance interactions logged: timestamps, handler assignments, responses sent.
- Published prominently in app footer, consent screens, and DPO contact page.
- Monthly report: count of grievances, average resolution time, % resolved within 90 days.

---

### REQ-8: Encryption-at-Rest Remediation

| Field | Value |
|---|---|
| **Obligations** | OBL-013, OBL-034 |
| **Control mapping** | Encryption (ISO A.8.24 / SOC 2 CC6.6–CC6.7 / NIST SC-13, SC-28) |
| **Priority** | P0 |
| **Affected systems** | `events`, `blob-store` (legacy bucket), `cache` |

**Requirement statement:** Remediate known encryption-at-rest gaps in `events` (unencrypted Kafka topics), `blob-store` (legacy bucket without encryption), and `cache` (Redis without encryption), as identified in the system inventory. Rule 6 mandates encryption as a reasonable security safeguard.

**Acceptance criteria:**
- `events` (Kafka): all topics carrying PII are moved to encrypted-at-rest brokers; topic-level encryption or at-rest cluster encryption enabled. Legacy topics purged or replayed through encrypted pipeline.
- `blob-store` legacy bucket: enable S3 server-side encryption (AES-256) on all existing and new objects. Backfill policy: all existing unencrypted objects are re-encrypted within 7 days.
- `cache` (Redis): Enable Redis at-rest encryption (AOF/RDB files) and in-transit TLS. TTL remains at existing values.
- Encryption keys managed via AWS KMS with automatic rotation (1-year rotation policy).
- Compliance report: automated scan confirms 100% of PII-storing resources have encryption-at-rest enabled.

---

### REQ-9: Logging, Monitoring & Retention Enhancement

| Field | Value |
|---|---|
| **Obligations** | OBL-034, OBL-039 |
| **Control mapping** | Logging & monitoring (ISO A.8.15–A.8.16 / SOC 2 CC7.2 / NIST AU-2, AU-6, SI-4); Data retention & deletion (ISO A.8.10 / MP-6) |
| **Priority** | P1 |
| **Affected systems** | `logs`, `api`, `events`, `user-db` |

**Requirement statement:** Extend CloudWatch log retention from the current 90 days to at least 1 year (OBL-039: minimum retention of personal data, traffic data, and other logs). Implement access control on logs and ensure logs include identity, timestamp, event type, and outcome for auditability (OBL-034).

**Acceptance criteria:**
- `logs` (CloudWatch) log-group retention policy updated from 90 days to 400 days (1 year + buffer).
- Structured logging format adopted across `api`: JSON with `{timestamp, user_id (masked), event_type, resource, outcome, request_id}`.
- `events` Kafka audit log and `user-db` query log included in the 1-year retention scope (via S3 export with lifecycle policy for log-tier).
- Access to raw logs restricted to Security/DevOps roles; audit log (who accessed logs) maintained separately.
- Automated retention compliance check runs weekly: alerts if any log group has retention < 365 days.
- Cost analysis: log storage costs projected; archival to S3 Glacier after 90 days, held for 1 year total.

---

### REQ-10: Verifiable Parental Consent & Child Data Safeguards

| Field | Value |
|---|---|
| **Obligations** | OBL-018, OBL-019, OBL-020, OBL-041 |
| **Control mapping** | Consent/lawful-basis management (ISO A.5.34 / SOC 2 P-series); Access control (ISO A.8.3 / A.5.15 / SOC 2 CC6.1 / NIST AC-2, AC-6) |
| **Priority** | P1 |
| **Affected systems** | `web-app`, `api`, `user-db`, `consent-svc` (new) |

**Requirement statement:** Before processing the personal data of a child (under 18), obtain verifiable consent of the parent or lawful guardian (OBL-018, OBL-041). Prohibit detrimental processing (OBL-019), tracking/monitoring (OBL-020), and targeted advertising directed at children.

**Acceptance criteria:**
- Age gating: collection of date of birth at registration; any user indicating <18 enters a guardian-consent flow.
- Guardian verification (OBL-041): the guardian must provide verifiable identity/age details or a virtual token from a digiLocker/authorised entity. Accept: Aadhaar (e-KYC virtual ID), PAN, digiLocker token, or credit-card age verification.
- Guardian consent: the guardian receives and signs a consent notice (REQ-1) on behalf of the minor; guardian contact info and relationship recorded.
- If the user is verified as <18 and guardian consent is not obtained, the account is restricted: no data processing beyond age-verification.
- Tracking & targeted advertising (OBL-020): the `events` pipeline tags any event belonging to a <18 user; a filter drops any tracking/behavioural-monitoring and targeted-advertising events for that cohort.
- Detrimental processing (OBL-019): content moderation pipeline flags content delivered to <18 users for safety review.
- Integration test: a simulated <18 user — events pipeline produces no behavioural-tracking events; no ad-tech segments generated.

---

### REQ-11: DPO Contact Publication & Notification

| Field | Value |
|---|---|
| **Obligations** | OBL-016, OBL-040 |
| **Control mapping** | Consent/lawful-basis management (ISO A.5.34 / SOC 2 P-series) |
| **Priority** | P1 |
| **Affected systems** | `web-app`, `api` |

**Requirement statement:** Prominently publish the business contact information of the Data Protection Officer (DPO) — or the person able to answer questions about data processing — on the website/app (OBL-016, OBL-040). Include in every communication related to rights exercise.

**Acceptance criteria:**
- DPO contact (email, phone, postal address) displayed on a `/dpo` page, in the footer of every page, on the consent notice screen, on the rights portal, and on the grievance page.
- Every automated email/SMS communication (consent confirmation, rights acknowledgment, breach notification) includes the DPO contact block.
- DPO contact is configurable via admin panel (no code deploy to change).
- The `/dpo` page meets WCAG 2.1 AA accessibility standards.

---

### REQ-12: Data Processor Contract & Compliance Management

| Field | Value |
|---|---|
| **Obligations** | OBL-010 |
| **Control mapping** | Third-party/processor controls (ISO A.5.19–A.5.22 / SOC 2 CC9.2 / NIST SA-9) |
| **Priority** | P1 |
| **Affected systems** | `api`, `analytics` (Snowflake), `logs` (CloudWatch as third-party infra) |

**Requirement statement:** Engage any Data Processor only under a valid contract that governs the processing of personal data related to the offering of goods or services (OBL-010). Maintain an inventory of all Data Processors and the associated Data Processing Agreements (DPAs).

**Acceptance criteria:**
- An admin module lists all current Data Processors: AWS (infra), Snowflake (analytics), any SaaS sub-processors.
- Each processor has an associated DPA record: contract reference, effective date, termination date, data categories processed, processing instructions, audit rights clause.
- DPA template available that includes: subject-matter, duration, nature/purpose of processing, type of personal data, categories of data principals, obligations/rights of the Data Fiduciary.
- New processor onboarding requires DPA signing before API calls to that processor are permitted (gating in procurement/engineering workflow).
- Annual review reminder: each DPA flagged for 12-month review.

---

### REQ-13: Data Accuracy & Quality Pipeline

| Field | Value |
|---|---|
| **Obligations** | OBL-011 |
| **Control mapping** | Access control / data quality (ISO A.8.3 / AC-2, AC-6 — data quality as procedural control) |
| **Priority** | P2 |
| **Affected systems** | `user-db`, `api`, `analytics` |

**Requirement statement:** Ensure that personal data which is likely to be used to make a decision affecting a data principal, or disclosed to another Data Fiduciary, is complete, accurate, and kept up to date (OBL-011).

**Acceptance criteria:**
- Scheduled data quality job runs weekly against `user-db`:
  - Detect stale records (no update in 6 months) → flag for review.
  - Detect incomplete profiles (missing required PII fields) → trigger user outreach (email/SMS asking to verify).
  - Detect format anomalies (invalid email/phone patterns) → quarantine for manual review.
- Data quality score trend is tracked and reported to DPO monthly.
- When data is disclosed to another Data Fiduciary, a "data quality attestation" flag is set in the disclosure record.
- API endpoints that serve data to third parties (webhooks, Data Processor integration) include a `data_quality_checked` header/property indicating when the data was last validated.

---

### REQ-14: Nomination Feature

| Field | Value |
|---|---|
| **Obligations** | OBL-029, OBL-050 |
| **Control mapping** | Consent/lawful-basis management (ISO A.5.34 / SOC 2 P-series) |
| **Priority** | P2 |
| **Affected systems** | `web-app`, `api`, `user-db` |

**Requirement statement:** Provide a means for data principals to nominate one or more individuals to exercise their rights under the Act in the event of their death or incapacity (OBL-029, OBL-050).

**Acceptance criteria:**
- `/my-data/nominees` page in `web-app` where the user adds/removes nominees: name, relationship, email, phone.
- Nominee verification: nominee must accept the nomination (email confirmation link or SMS OTP) before being activated.
- When a nominee exercises a right (e.g. erasure request), the system verifies: (a) nominee is on active nominee list for that user, (b) proof of death/incapacity is provided (document upload), (c) a review workflow processes the request.
- Nominee list is stored in `user-db` (new `nominees` table, FK → user_id).
- Maximum 5 nominees per user.

---

### REQ-15: Cross-Border Data Transfer Controls

| Field | Value |
|---|---|
| **Obligations** | OBL-047, OBL-051 |
| **Control mapping** | Data classification & inventory (ISO A.5.9 / A.5.12 / SOC 2 CC3.2 / NIST RA-2, CM-8); Third-party/processor controls (NIST SA-9) |
| **Priority** | P2 |
| **Affected systems** | `api`, `analytics` (Snowflake), `blob-store`, `events` |

**Requirement statement:** Implement controls to ensure that personal data (and, for Significant Data Fiduciaries, specified personal data) is not transferred outside India except in compliance with restrictions specified by the Central Government (OBL-051, OBL-047).

**Acceptance criteria:**
- Data residency mapping: document where each system's data physically resides (all systems currently in `ap-south-1` — conformant, but add a monitoring guardrail).
- If any system is deployed to a region outside India in future, a "cross-border transfer" flag must be set and a mechanism (consent/contract/adequacy determination) applied.
- For SDFs: when Government specifies restricted data categories (OBL-047), add a data-loss-prevention rule: blocked at network level (S3 bucket policy, Kafka mirroring blocker).
- API gateway layer: if a downstream processor is outside India, the DPA must include Standard Contractual Clauses or equivalent mechanism.
- Quarterly scan: automated report of all data egress cross-border; alert if any egress lacks a documented transfer mechanism.

---

### REQ-16: DPIA & Audit Workflow (Significant Data Fiduciary)

| Field | Value |
|---|---|
| **Obligations** | OBL-021, OBL-022, OBL-023, OBL-024, OBL-044, OBL-045, OBL-046 |
| **Control mapping** | Data classification & inventory (ISO A.5.9 / A.5.12); Incident/breach response (ISO A.5.24–A.5.28); Access control (ISO A.8.3) |
| **Priority** | P2 |
| **Affected systems** | `web-app`, `api`, `user-db`, `consent-svc` (new) |

**Requirement statement:** If the org is or becomes a Significant Data Fiduciary (SDF), appoint a DPO (OBL-021) and independent data auditor (OBL-022), conduct a Data Protection Impact Assessment (DPIA) every 12 months (OBL-023, OBL-044), conduct a periodic audit every 12 months (OBL-024, OBL-044), furnish significant observations to the Board (OBL-045), and perform an algorithmic risk assessment (OBL-046).

**Acceptance criteria:**
- Admin module tracks: DPO details (name, contact, appointment date), independent auditor (firm, engagement period, last audit date).
- DPIA template workflow: guide the responsible team through a structured DPIA (data flow mapping → risk identification → mitigation plan → sign-off). Output stored as a versioned document in `blob-store`.
- Audit scheduling: calendar-based reminder 90 days before the 12-month deadline. Audit report upload + Board-submission PDF generation.
- Algorithmic risk assessment (OBL-046): for any model/algorithm serving content or decisions to data principals, a risk assessment checklist must be completed before deployment. The assessment evaluates: bias, transparency, impact on data principal rights, recourse mechanism.
- Furnish-to-Board report: auto-generated PDF from DPIA/audit findings. Placeholder for future electronic submission to the Board system.
- All artefacts (DPIA, audit report, algorithmic assessments) retained for 5 years.

---

## Priority Summary

| Priority | Count | Requirements |
|---|---|---|
| **P0** | 7 | REQ-1, REQ-2, REQ-4, REQ-5, REQ-6, REQ-8, (must-ship) |
| **P1** | 6 | REQ-3, REQ-7, REQ-9, REQ-10, REQ-11, REQ-12 |
| **P2** | 3 | REQ-13, REQ-14, REQ-15, REQ-16 |

## Dependency Map

```
REQ-1 (consent-svc) ─┬─ REQ-2 (withdrawal) ─── REQ-5 (erasure)
                      ├─ REQ-3 (languages) 
                      ├─ REQ-6 (rights portal)
                      ├─ REQ-7 (grievance)
                      ├─ REQ-10 (child data)
                      └─ REQ-11 (DPO contact)
                      
REQ-8 (encryption)    ─── REQ-4 (breach detection) ─── REQ-9 (log retention)

REQ-6 (rights portal) ─── REQ-14 (nomination) ─── REQ-13 (data quality)

REQ-16 (DPIA/audit) and REQ-12 (processor contracts) and REQ-15 (cross-border) are independent.
```

REQ-1 (consent-svc) is the foundational build. REQ-2, REQ-5, REQ-10, and REQ-6 all depend on it. REQ-4 and REQ-8 are independent security prerequisites that can run in parallel with consent-svc development.
