# Engineering Requirements — DPDP Act 2023 Compliance

This document translates the 57 obligations extracted from the DPDP Act 2023 and DPDP Rules 2025 into concrete, actionable engineering requirements for the engineering team. Each requirement maps to one or more real obligations (OBL-ids from `obligations.json`), references the affected system(s) from the current system inventory, and includes measurable acceptance criteria. Priorities reflect compliance risk: P0 requirements are mandatory at enforcement and carry the highest penalty exposure; P1 requirements are mandated within 18-month transition periods or expose significant penalty risk; P2 requirements are important but lower-risk or supporting infrastructure. The team should treat this as a build backlog with the P0 items as the first sprint target.

## Requirements

### REQ-1: Consent Management Service
- **Obligation(s):** OBL-001 (Lawful Processing), OBL-005 (Valid Consent), OBL-007 (Right to Withdraw), OBL-008 (Cessation on Withdrawal), OBL-010 (Burden of Proof)
- **Requirement Statement:** Build a new `consent-svc` microservice that captures, stores, and manages consent records for every Data Principal. The service must record the exact scope, purpose, timestamp, and version of each consent; support withdrawal with ease comparable to giving consent; and provide a tamper-evident audit trail for burden-of-proof compliance.
- **Acceptance Criteria:**
  - Consent records include: principal ID, purpose, data categories, timestamp, consent version, language choice, and proof of affirmative action.
  - Withdrawal is achievable through the same user journey as consent (same number of clicks/steps).
  - On withdrawal, `consent-svc` emits a `consent.withdrawn` event that downstream systems (REQ-4) consume to trigger erasure.
  - Audit trail is append-only and queryable by regulator.
  - Burden-of-proof: an API endpoint returns the full consent chain for a given principal + purpose on demand.
- **Priority:** P0
- **Affected System(s):** `consent-svc` (new), `api`, `user-db`

### REQ-2: Consent Notice & Multilingual Consent UX
- **Obligation(s):** OBL-002 (Notice to Data Principal), OBL-003 (Pre-existing Consent Notice), OBL-004 (Language Option), OBL-006 (Clear Language), OBL-035 (Notice Content — Rule 3)
- **Requirement Statement:** Implement a consent-notice flow in the `web-app` (React SPA) and `api` that presents every consent request with an independently understandable, itemised notice listing each data element, its purpose, and how to exercise rights. Provide the option to read the notice in English or any Eighth Schedule language (22 Indian languages). For pre-existing users (OBL-003), trigger a re-notification campaign at next login with a "pending consent review" banner.
- **Acceptance Criteria:**
  - Notice is shown separately from any general terms-of-service — it is a distinct, focused UI.
  - Language picker appears before the notice is rendered; selection persists to all subsequent notices.
  - Each data element is listed individually with a checkbox (or equivalent affirmative action).
  - The notice includes: DPO contact (see REQ-10), link to withdrawal flow, link to grievance portal (REQ-7), and link to rights portal (REQ-8).
  - Pre-existing users see the new notice on first login after deployment; a `notice_acknowledged_at` flag is stored.
- **Priority:** P0
- **Affected System(s):** `web-app`, `api`, `consent-svc`, `user-db`

### REQ-3: Breach Detection, Alerting & Notification Pipeline
- **Obligation(s):** OBL-016 (Security Safeguards), OBL-017 (Breach Intimation), OBL-038 (Rule 6 Security Measures), OBL-039 (Breach Process — Rule 7)
- **Requirement Statement:** Build a breach-detection pipeline that monitors logs, system events, and anomaly signals; triggers automated alerts; and drives a notification workflow to the DPDP Board (initial intimation without delay, detailed report within 72 hours) and to each affected Data Principal (without delay). The pipeline must cover all systems that store or process personal data.
- **Acceptance Criteria:**
  - Detection covers: unauthorised access attempts, anomalous data-exfiltration patterns, encryption-key compromise, and infrastructure-level alerts (IAM policy changes, S3 bucket policy changes, unexpected data transfers).
  - Board notification template is pre-approved and includes: description of breach, nature of personal data affected, categories and approximate number of Data Principals, consequences, measures taken, and contact for further information.
  - Data Principal notification is triggered automatically and delivered via their registered mode (email/SMS/in-app notification) and includes: description, consequences, safety steps, and contact point.
  - A breach-case management dashboard exists for the DPO and incident-response team to update the detailed report within the 72-hour window.
  - All notifications are logged for audit (obligation OBL-010 / burden of proof).
- **Priority:** P0
- **Affected System(s):** `logs` (CloudWatch), `api`, `events` (Kafka), `blob-store` (S3), `user-db` (RDS), `web-app`

### REQ-4: Cross-System Data Erasure Pipeline
- **Obligation(s):** OBL-008 (Cessation on Withdrawal), OBL-018 (Erasure), OBL-019 (Deemed No Longer Served), OBL-029 (Correction), OBL-030 (Erasure upon Request), OBL-040 (Inactive Account Erasure — Rule 8(1)), OBL-041 (Prior Notice before Erasure — Rule 8(2)), OBL-042 (Log Retention — Rule 8(3))
- **Requirement Statement:** Build a centralised erasure-orchestration service (or extend `consent-svc`) that, upon consent withdrawal, Data Principal erasure request, or inactivity-trigger, orchestrates deletion across all systems holding personal data: `user-db`, `events`, `blob-store`, `cache`, `analytics`, and `logs`. Implement a 48-hour pre-erasure notification to the Data Principal (Rule 8(2)). For inactive accounts (OBL-040), enforce erasure after 3 years of inactivity per the Third Schedule time period.
- **Acceptance Criteria:**
  - Erasure request flows through a state machine: `RECEIVED → NOTIFIED (48h timer) → ERASING → VERIFIED → COMPLETE`.
  - Each downstream system has a plugin/adapter that performs the actual deletion and returns a verification hash.
  - If a system fails to delete (e.g., retention required by law), the erasure record marks an exception with the legal basis cited.
  - For inactive accounts: a background cron detects accounts with no principal activity for the prescribed period, sends pre-erasure notice, and queues erasure.
  - Logs (OBL-042) are retained for a minimum of 1 year from processing date, then erased by this same pipeline.
- **Priority:** P0
- **Affected System(s):** `user-db`, `events`, `blob-store`, `cache`, `analytics` (Snowflake), `logs` (CloudWatch), `consent-svc`

### REQ-5: Encryption-at-Rest Remediation
- **Obligation(s):** OBL-015 (Technical/Organisational Measures), OBL-016 (Security Safeguards), OBL-038 (Rule 6 — encryption/obfuscation/masking, access controls)
- **Requirement Statement:** Remediate encryption-at-rest gaps across three systems: `events` (Kafka), `blob-store` (S3 legacy bucket), and `cache` (Redis). For Kafka, enable TLS encryption for data in transit and enable at-rest encryption for the topic storage. For the S3 legacy bucket, enable default AES-256 SSE; if the bucket policy cannot be changed, migrate objects to an encrypted bucket. For Redis, enable AOF persistence encryption and TLS for client connections. Additionally, implement field-level masking for PII fields in Kafka event payloads.
- **Acceptance Criteria:**
  - All three systems have encryption-at-rest verified via AWS Config rules or equivalent.
  - Kafka topic payloads have PII fields (user_id in behavioural events) masked or tokenised at the producer level.
  - No unencrypted personal data exists in any data store as confirmed by a one-time scan and a recurring enforcement job.
  - Access logs for encrypted stores show no policy-violation events.
- **Priority:** P1
- **Affected System(s):** `events` (Kafka), `blob-store` (S3), `cache` (Redis)

### REQ-6: Audit-Log Retention & Enriched Audit Events
- **Obligation(s):** OBL-015 (Technical Measures), OBL-038 (Rule 6 — logging, 1-year retention), OBL-042 (Min 1 Year Log Retention — Rule 8(3))
- **Requirement Statement:** Extend CloudWatch log retention from the current 90 days to a minimum of 1 year (400 days for safety margin). Enrich `api` and `consent-svc` audit logging to produce structured JSON events capturing every PII access, consent operation, rights-request action, and admin action. At the 1-year mark, the erasure pipeline (REQ-4) must handle log expiry.
- **Acceptance Criteria:**
  - CloudWatch log-group retention policy set to 400 days for all log groups carrying personal-data or audit events.
  - Structured audit event schema includes: timestamp, actor (principal/admin ID), action, resource, outcome (success/failure), request ID, and IP address.
  - All `api` endpoints that read/write personal data emit an audit event.
  - All `consent-svc` operations (create, read, update, withdraw) emit an audit event.
  - Logs are searchable (CloudWatch Logs Insights or export to an SIEM).
- **Priority:** P1
- **Affected System(s):** `logs` (CloudWatch), `api`, `consent-svc`

### REQ-7: Grievance Redressal Portal
- **Obligation(s):** OBL-021 (Grievance Redressal Mechanism), OBL-031 (Readily Available Means), OBL-032 (Respond within Prescribed Period), OBL-052 (90 Days — Rule 14(3))
- **Requirement Statement:** Build a self-service grievance portal (within the existing `web-app` and `api`) where Data Principals can submit, track, and receive responses to grievances about their data processing. The portal must automatically acknowledge receipt, route grievances to the appropriate team, track the 90-day response window, and escalate overdue cases.
- **Acceptance Criteria:**
  - Grievance submission form captures: principal identity, nature of grievance, affected data, desired resolution, and supporting documents.
  - Auto-generated acknowledgement with a grievance ticket ID is sent to the principal within 5 minutes.
  - Dashboard for DPO/operations team shows all open grievances, aging (days since receipt), and escalations.
  - Automated escalation: if no resolution within 75 days, notify DPO; if 90 days passed, flag as compliance breach.
  - Final response includes: findings, action taken, and right to appeal to the DPDP Board.
  - All grievance actions are logged as audit events (REQ-6).
- **Priority:** P1
- **Affected System(s):** `web-app`, `api`, `user-db`

### REQ-8: Data Principal Rights Portal
- **Obligation(s):** OBL-029 (Correction/Completion/Update), OBL-030 (Erasure upon Request), OBL-051 (Publish Means for Rights — Rule 14(1))
- **Requirement Statement:** Build a self-service rights portal within the `web-app` where Data Principals can exercise the following rights under the Act: (a) correct inaccurate or misleading personal data, (b) complete incomplete data, (c) erase personal data (triggers REQ-4), and (d) access a copy of their personal data in a machine-readable format. Each request type must have a distinct flow, fulfilment tracking, and audit trail.
- **Acceptance Criteria:**
  - Correction request: principal sees their current stored data fields (name, email, phone) and can submit corrections; an approval workflow verifies the identity before applying changes; changes logged to audit.
  - Erasure request: principal can request erasure of specific data categories or full account; triggers REQ-4 pipeline.
  - Access request: generates a downloadable JSON/CSV export of all personal data held by the organisation, aggregated from all systems (`user-db`, `events`, `blob-store` metadata, `analytics`).
  - Each request has a status tracker visible in the portal (e.g., RECEIVED → IN_PROGRESS → COMPLETED).
  - The portal is reachable from every page footer (persistent link).
- **Priority:** P1
- **Affected System(s):** `web-app`, `api`, `user-db`, `events`, `blob-store`, `analytics`

### REQ-9: Child Data Protection Controls
- **Obligation(s):** OBL-022 (Verifiable Parental Consent), OBL-023 (No Detrimental Effect), OBL-024 (No Tracking/Ads for Children), OBL-044 (Verifiable Consent Due Diligence — Rule 10), OBL-045 (Disability Guardian — Rule 11)
- **Requirement Statement:** Implement age-verification gating at account registration and during any data-processing flow. For users identified as minors, require verifiable parental/guardian consent through a due-diligence process (reliable identification or authorised virtual token). Enforce restrictions: no behavioural tracking, no targeted advertising, and no processing likely to cause detrimental effect. Extend the same framework for persons with disabilities who require a lawful guardian.
- **Acceptance Criteria:**
  - Account registration flow includes an age-declaration step; if under 18, the flow branches to a parental-consent gate.
  - Parental-consent flow requires the parent to provide verifiable identification (Aadhaar-based verification or a government-authorised virtual token API) and then give explicit consent on the child's behalf.
  - Once verified, the parent's consent is stored in `consent-svc` with the child's principal ID tagged as `guardian_consented`.
  - Behavioural tracking (`events` Kafka) is disabled for user_ids flagged as children; ad-serving logic in `analytics` filters them out.
  - For persons with disabilities: the portal accepts guardian declarations from court/designated authority, and those guardian relationships are logged and verifiable.
  - Any attempt to circumvent the age gate is logged as a security event.
- **Priority:** P1
- **Affected System(s):** `web-app`, `api`, `consent-svc`, `user-db`, `events`, `analytics`

### REQ-10: DPO Contact Publishing
- **Obligation(s):** OBL-020 (Publish Contact Information), OBL-043 (Prominently Publish DPO Contact — Rule 9)
- **Requirement Statement:** Publish the business contact information of the Data Protection Officer (or a designated person able to answer processing-related questions) prominently on the `web-app` (website footer, account settings page, and consent-notice pages) and include it in every automated email response (grievance acknowledgement, rights-request acknowledgement, breach notification, consent notice). The contact info must be configurable without a code deploy (via a CMS or environment variable).
- **Acceptance Criteria:**
  - DPO name, email, phone, and physical address appear in: website footer (all pages), `/privacy` page, `/contact` page, consent-notice UI (REQ-2), grievance portal (REQ-7), and rights portal (REQ-8).
  - All transactional emails (grievance ack, rights ack, breach notification, consent notice) include a "Contact our DPO" section.
  - Contact information is configurable via a DB record or config file — no code change needed to update.
- **Priority:** P2
- **Affected System(s):** `web-app`, `api`

### REQ-11: Data Processor Contract & Compliance Tracker
- **Obligation(s):** OBL-013 (Contract with Data Processor)
- **Requirement Statement:** Build a contract-management module in the `api` and `user-db` that registers every Data Processor the organisation engages, stores the executed contract, tracks renewal dates, and enforces that no data-sharing can occur with an unregistered or out-of-contract processor. The module must also track which personal data categories each processor accesses and for what purpose.
- **Acceptance Criteria:**
  - API endpoint `POST /processors` registers a processor with: name, contact, contract period, data categories, purpose, data-residency commitment.
  - A scheduled cron checks for contracts expiring within 30 days and notifies the DPO.
  - Data-sharing to an unregistered or expired processor is blocked at the `api` gateway level.
  - All processor registrations and changes are logged as audit events.
- **Priority:** P2
- **Affected System(s):** `api`, `user-db`

### REQ-12: Data Quality Gates for Decision-Making
- **Obligation(s):** OBL-014 (Completeness, Accuracy, Consistency)
- **Requirement Statement:** Implement data-quality validation gates in the `api` that ensure personal data used to make decisions affecting the Data Principal (e.g., eligibility checks, pricing, risk scoring) is complete, accurate, and internally consistent before the decision is computed. Where the data fails validation, the system must log the deficiency and escalate to a human reviewer rather than making a decision on incomplete data.
- **Acceptance Criteria:**
  - Decision endpoints call a `POST /data-quality/validate` middleware before executing the decision logic.
  - Validation checks: completeness (no critical field is null), cross-field consistency (e.g., age vs. date-of-birth match), and recency (data not stale beyond configured TTL).
  - Failed validations block the decision and trigger an alert to the operations team with the specific deficiency.
  - All validation results (pass/fail/reason) are logged as audit events (REQ-6).
- **Priority:** P2
- **Affected System(s):** `api`

### REQ-13: SDF — DPIA & Audit Evidence Dashboard
- **Obligation(s):** OBL-027 (Periodic DPIA), OBL-028 (Periodic Audit — SDF), OBL-047 (Annual DPIA and Audit — Rule 13(1)), OBL-048 (Report to Board — Rule 13(2)), OBL-049 (Algorithmic Software Diligence — Rule 13(3))
- **Requirement Statement:** Build an internal dashboard (within `api` + `web-app`) that collates evidence required for the annual Data Protection Impact Assessment and independent audit required of a Significant Data Fiduciary. The dashboard must track: data-processing register, system-access patterns, consent-metrics, erasure requests, breach incidents, processor contracts, and algorithmic-software risk assessments. Produce a standardised report that can be furnished to the DPDP Board.
- **Acceptance Criteria:**
  - Dashboard shows: total Data Principals, active consent records by purpose, pending/due erasure queue, open breaches, open grievances, processor contracts expiring, and last DPIA date.
  - The "Algorithmic Software Register" lists every model/rule/algo that processes personal data, with a due-diligence attestation and risk rating.
  - A "Generate DPIA Report" button produces a PDF/JSON that matches the Board's prescribed format.
  - The dashboard is accessible only to authenticated DPO and audit-team accounts (RBAC).
  - A cron sets a reminder 60 days before the annual DPIA due date.
- **Priority:** P2
- **Affected System(s):** `web-app`, `api`, `user-db`, `logs`

### REQ-14: Data Residency & Cross-Border Transfer Controls
- **Obligation(s):** OBL-034 (Restriction on Transfer), OBL-050 (SDF Data Localisation — Rule 13(4)), OBL-053 (Cross-Border Rules — Rule 15)
- **Requirement Statement:** Implement infrastructure and application controls that ensure specified personal data (as notified by the Central Government) remains within India (AWS ap-south-1 region). For the SDF scenario, enforce data-localisation rules: prevent cross-region replication of `user-db`, `blob-store` objects, and `analytics` exports to non-India regions. Log and alert on any cross-region data-transfer attempt.
- **Acceptance Criteria:**
  - AWS S3 bucket policy denies replication to non-ap-south-1 regions for buckets classifyable as holding personal data.
  - RDS cross-region read-replicas are disabled or restricted to ap-south-1-only.
  - Snowflake account-level data-residency controls are configured (cloud region locked to AWS ap-south-1).
  - Any call to a cross-region data-transfer API (e.g., `PutBucketReplication` with non-ap-south-1 destination) triggers an immediate security alert (REQ-3).
  - A quarterly compliance job scans all resources and reports any misconfiguration.
- **Priority:** P1
- **Affected System(s):** `user-db` (RDS), `blob-store` (S3), `analytics` (Snowflake), `events` (Kafka Cross-Region Mirror)

### REQ-15: Legitimate Use Processing Framework
- **Obligation(s):** OBL-001 (Lawful Processing), OBL-011 (Certain Legitimate Uses — Section 7)
- **Requirement Statement:** Extend the `consent-svc` and `api` to support a "legitimate use" processing category alongside consent-based processing. When personal data is processed under Section 7 legitimate uses (state benefits, medical emergencies, employment, legal obligations, etc.), the system must record the specific legal basis cited, limit processing to what is necessary for that purpose, and still honour all Data Principal rights (correction, erasure, grievance). The legitimate-basis record must be as auditable as a consent record.
- **Acceptance Criteria:**
  - `consent-svc` accepts a second processing basis `legitimate_use` with fields: basis (enum: `section_7_voluntary`, `section_7_state_benefit`, `section_7_medical`, `section_7_employment`, `section_7_legal_obligation`), purpose, data categories, and legal citation.
  - Processing under legitimate use is still subject to the erasure pipeline (REQ-4) — if the purpose is no longer served, data must be erased.
  - The Data Principal's rights portal (REQ-8) still works for data held under legitimate use — the principal can request correction/erasure/access regardless of the processing basis.
  - Legitimate-use records appear in the DPIA dashboard (REQ-13).
- **Priority:** P2
- **Affected System(s):** `api`, `consent-svc`, `user-db`

---

## Summary Matrix

| REQ ID | Priority | Key Obligations | Primary System(s) |
|--------|----------|-----------------|-------------------|
| REQ-1 | P0 | OBL-001, OBL-005, OBL-007, OBL-008, OBL-010 | consent-svc (new), api, user-db |
| REQ-2 | P0 | OBL-002, OBL-003, OBL-004, OBL-006, OBL-035 | web-app, api, consent-svc |
| REQ-3 | P0 | OBL-016, OBL-017, OBL-038, OBL-039 | logs, api, events, blob-store, user-db |
| REQ-4 | P0 | OBL-008, OBL-018, OBL-019, OBL-029, OBL-030, OBL-040, OBL-041, OBL-042 | All systems |
| REQ-5 | P1 | OBL-015, OBL-016, OBL-038 | events, blob-store, cache |
| REQ-6 | P1 | OBL-015, OBL-038, OBL-042 | logs, api, consent-svc |
| REQ-7 | P1 | OBL-021, OBL-031, OBL-032, OBL-052 | web-app, api, user-db |
| REQ-8 | P1 | OBL-029, OBL-030, OBL-051 | web-app, api, user-db, events, blob-store, analytics |
| REQ-9 | P1 | OBL-022, OBL-023, OBL-024, OBL-044, OBL-045 | web-app, api, consent-svc, user-db, events, analytics |
| REQ-10 | P2 | OBL-020, OBL-043 | web-app, api |
| REQ-11 | P2 | OBL-013 | api, user-db |
| REQ-12 | P2 | OBL-014 | api |
| REQ-13 | P2 | OBL-027, OBL-028, OBL-047, OBL-048, OBL-049 | web-app, api, user-db, logs |
| REQ-14 | P1 | OBL-034, OBL-050, OBL-053 | user-db, blob-store, analytics, events |
| REQ-15 | P2 | OBL-001, OBL-011 | api, consent-svc, user-db |
