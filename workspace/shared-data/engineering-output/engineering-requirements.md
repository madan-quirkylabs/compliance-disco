# Engineering Requirements — DPDP Act 2023 + Rules 2025

**Summary:** The DPDP Act 2023 imposes five key obligations that require engineering
deliverables: consent management (D-05), cross-system data erasure (D-06), security
safeguards including encryption/masking (D-08), breach detection and notification (D-09),
and 1-year log/data retention for audit (D-11). The current architecture — a multi-tenant
B2B SaaS on AWS Mumbai — has known gaps: no consent service, no deletion pipeline, partial
encryption, short log retention, and no breach-alerting integration. Below are the concrete
engineering requirements to close each gap, mapped to affected systems from the inventory.

---

### REQ-1 — Consent Management Service

- **Obligation:** D-05 (S.5–6 — itemised consent per purpose; easy withdrawal)
- **Requirement:** Build a `consent-svc` microservice that records itemised consent per user × purpose, supports withdrawal with the same UX friction as grant, and provides a query API for downstream systems to check consent status before processing data.
- **Acceptance Criteria:**
  1. Consent is recorded per (user_id, purpose, timestamp) tuple — at minimum: `account_creation`, `marketing`, `analytics`, `data_sharing`.
  2. Withdrawal endpoint invalidates consent and returns a token confirming deletion of the consent record.
  3. API includes a synchronous check: `GET /consent/v1/{user_id}/{purpose}` returns `{granted: bool}`.
  4. All consent events (grant, withdrawal, denial) are audited to the `logs` system.
  5. No personal-data processing occurs in `api`, `analytics`, or `events` without a prior consent check.
- **Priority:** P0
- **Affected Systems:** `consent-svc` (new), `api`, `events`, `analytics`, `logs`

### REQ-2 — Cross-System Erasure Pipeline

- **Obligation:** D-06 (S.8(7) — erase on withdrawal or purpose completion; cascade to processors)
- **Requirement:** Build an orchestrated deletion pipeline that, on a confirmed erasure request, removes or pseudonymises the data principal's records across `user-db`, `events`, `blob-store`, `cache`, and `analytics`, and generates a verifiable erasure report.
- **Acceptance Criteria:**
  1. Pipeline is triggered by a webhook from `consent-svc` on withdrawal, or by an admin-initiated erasure job via `api`.
  2. Each target system implements a `DELETE /erasure/{user_id}` endpoint or equivalent batch operation.
  3. Pipeline logs every deletion (records count per system, timestamp, job ID) to `logs`.
  4. Erasure is retried on failure; final status (complete / partial-failure / failed) is persisted.
  5. Pipeline completes within 48 hours for a single user (SLA buffer for staggered processor deletion).
- **Priority:** P0
- **Affected Systems:** `api`, `user-db`, `events`, `blob-store`, `cache`, `analytics`, `logs`

### REQ-3 — Encryption-at-Rest for All PII-Holding Stores

- **Obligation:** D-08 (S.8(5), Rule 6(a) — encryption/obfuscation/masking of personal data)
- **Requirement:** Enable or migrate to encryption at rest on every system that holds personal data, and add field-level masking or obfuscation for PII columns in analytics and log exports.
- **Acceptance Criteria:**
  1. `blob-store` (S3): enable SSE-S3 or SSE-KMS on the legacy bucket; verify that all new objects encrypt by default.
  2. `events` (Kafka): enable TLS-encrypted inter-broker transport and enable at-rest encryption on the topic storage directory (or use Confluent's envelope encryption).
  3. `cache` (Redis): enable AOF persistence with encryption or migrate to ElastiCache with encryption-at-rest enabled.
  4. `analytics` (Snowflake): masking policies applied on columns containing email, phone, name — masking is role-based (only authorised analysts see plaintext).
  5. `logs` (CloudWatch): log group KMS key attached; PII redaction filter applied at ingestion.
- **Priority:** P1
- **Affected Systems:** `blob-store`, `events`, `cache`, `analytics`, `logs`

### REQ-4 — Breach Detection and Notification System

- **Obligation:** D-09 (S.8(6), Rule 6(c) — detect breaches, notify Board + Data Principals; maintain monitoring)
- **Requirement:** Implement a breach-detection pipeline that ingests audit/access logs from all systems, evaluates them against anomalous-activity rules, alerts the security team, and generates a notification packet (timeline, data principals affected, data categories, remedial steps) for the Board and individual data principals.
- **Acceptance Criteria:**
  1. `logs` (CloudWatch) feeds into a SIEM or alerting rule set that fires on: repeated auth failures, unauthorised data export, mass download, access from unexpected geos/IPs.
  2. Alert creates a ticket in the incident-response system and notifies the security team within 1 minute.
  3. Self-serve endpoint `GET /breach/v1/report/{breach_id}` returns the notification template pre-filled with affected user IDs, data categories, and timeline.
  4. Notification dispatch integrates with email (data principals) and a compliance dashboard (Board).
  5. All detection events are logged with a 2+ year retention for review.
- **Priority:** P1
- **Affected Systems:** `logs`, `api` (new breach-report endpoint), all other systems (as log sources)

### REQ-5 — Log and Data Retention Extension

- **Obligation:** D-11 (Rule 6(e) — retain logs and personal data ≥ 1 year for breach investigation)
- **Requirement:** Extend log retention from the current 90 days to a minimum of 1 year (with ability to extend to 2+ years for serious incidents), and ensure that all personal-data stores preserve records for at least 1 year unless a lawful erasure has been executed.
- **Acceptance Criteria:**
  1. CloudWatch log-group retention set to 365 days for audit/access logs; export to S3 / Glacier for long-term archive on a separate bucket.
  2. `user-db` and `events` records are soft-deleted or retained for 1 year from the later of (a) record creation or (b) last modification; only a formal erasure request (REQ-2) hard-deletes.
  3. A retention-policy config map exists per data category, and a cron job audits compliance monthly and alerts on drift.
  4. Archived logs in S3/Glacier are encrypted and access-controlled to least-privilege roles only.
- **Priority:** P1
- **Affected Systems:** `logs`, `user-db`, `events`, `blob-store`, `analytics`

### REQ-6 — Access Control and Least Privilege Audit

- **Obligation:** D-08, D-09 (security safeguards + monitoring — access control underpins both)
- **Requirement:** Perform a full access-control audit across all systems, enforce least-privilege IAM roles for service-to-service and human access, and implement fine-grained access controls (FGAC) on PII columns in `user-db` and `analytics`.
- **Acceptance Criteria:**
  1. Every IAM role and user in the AWS account (ap-south-1) is reviewed; unused roles removed.
  2. Cross-account access is scoped to the minimum set of actions required; no wildcard `*` policies.
  3. Postgres row-level-security (RLS) policies enforce `user_id = current_user_id()` for data-plane access; admin roles use `SET ROLE` escalation gated by MFA.
  4. Snowflake masking policies (from REQ-3) are tied to roles, not individual users.
  5. Audit trail of all IAM policy changes streams to `logs`.
- **Priority:** P1
- **Affected Systems:** `api`, `user-db`, `analytics`, `blob-store`, `logs`

### REQ-7 — Processor and Third-Party Controls

- **Obligation:** D-06, D-09 (cascade of erasure + breach notification to processors)
- **Requirement:** For each third-party processor (Snowflake, Confluent Cloud, any downstream SaaS consuming Snowflake exports), establish a contractual and technical mechanism to propagate erasure requests and breach notifications.
- **Acceptance Criteria:**
  1. Processor inventory documented with: provider, data shared, processing purpose, erasure API contact (email/webhook).
  2. Erasure pipeline (REQ-2) includes a processor step that sends a signed erasure request to each processor and records acknowledgment / expected-completion timestamp.
  3. Breach-notification pipeline (REQ-4) includes a processor-notification step that sends the breach packet within 72 hours.
  4. Each processor's DP Addendum / SLA for erasure is attached in the compliance binder.
- **Priority:** P2
- **Affected Systems:** `analytics` (Snowflake), `events` (Kafka/Confluent), `api` (processor registry), `consent-svc`
