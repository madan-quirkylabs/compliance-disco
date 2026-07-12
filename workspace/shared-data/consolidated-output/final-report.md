# DPDP Act 2023 — Consolidated Executive Compliance Report

**Date:** 12 July 2026
**Prepared for:** Leadership (CEO, CTO, CISO, CMO, DPO)

---

## 1. Executive Summary

The DPDP Act 2023 — now supplemented by the 2025 Rules — introduces five core compliance obligations (consent management D-05, data erasure D-06, security safeguards D-08, breach notification D-09, and log retention D-11) that demand coordinated action from both Engineering and Marketing. Across 17 department-level requirements (7 engineering, 10 marketing), the highest-priority items converge on a single architectural dependency: a central Consent Management Service that both departments will rely on for consent recording, withdrawal propagation, and downstream enforcement. Engineering must build the platform layer (consent-svc, erasure pipeline, encryption, breach detection) while Marketing simultaneously reworks customer-facing forms, email/SMS/WhatsApp channels, retargeting pixels, and lead import pipelines to consume that platform and ensure every touchpoint respects purpose-based consent. The total effort spans **8 P0 items, 7 P1 items, and 2 P2 items**, with an estimated timeline of 4–6 months for all P0 work.

---

## 2. Consolidated Priority Table

| Priority | ID | Dept | Obligation | One-Line Action |
|:---:|:---|:---|:---|:---|
| **P0** | REQ-1 | Engineering | D-05 | Build `consent-svc` microservice: itemised consent per user × purpose, withdrawal API, query endpoint for downstream systems. |
| **P0** | REQ-2 | Engineering | D-06 | Build cross-system erasure pipeline: orchestrated deletion across user-db, events, blob-store, cache, analytics with verifiable report. |
| **P0** | MREQ-1 | Marketing | D-05 | Replace blanket signup forms with per-purpose checkboxes; log consent grant to central consent DB. |
| **P0** | MREQ-2 | Marketing | D-05 | Add one-click purpose-level withdrawal to every email, SMS, and WhatsApp marketing message. |
| **P0** | MREQ-3 | Marketing | D-06 | Automate data deletion from CRM, email/SMS/WhatsApp platforms, retargeting audiences on withdrawal (72h). |
| **P0** | MREQ-7 | Marketing | D-05, D-06 | Audit all purchased/imported lead lists; quarantine or erase any without verifiable per-purpose consent. |
| **P0** | MREQ-9 | Marketing | D-05 | Add separate consent checkbox for ad retargeting; fire retargeting pixels only when consent is present. |
| **P1** | REQ-3 | Engineering | D-08 | Enable encryption-at-rest on blob-store (S3), events (Kafka), cache (Redis), analytics (Snowflake), logs (CloudWatch). |
| **P1** | REQ-4 | Engineering | D-09 | Implement breach detection pipeline: ingest logs, anomalous-activity rules, SIEM alerting, notification packet API. |
| **P1** | REQ-5 | Engineering | D-11 | Extend log retention from 90 days to 1 year; soft-delete personal data records until lawful erasure. |
| **P1** | REQ-6 | Engineering | D-08, D-09 | Audit IAM roles, enforce least-privilege, implement RLS on user-db, tie Snowflake masking to roles. |
| **P1** | MREQ-4 | Marketing | D-08 | Encrypt PII in marketing databases at rest; use hashed identifiers in CSV exports; maintain data-location inventory. |
| **P1** | MREQ-5 | Marketing | D-09 | Designate marketing security contact; document escalation to DPO; draft Data Principal-facing breach template. |
| **P1** | MREQ-6 | Marketing | D-11 | Retain consent/log records ≥1 year in append-only format; automate archival/deletion after retention period. |
| **P1** | MREQ-10 | Marketing | D-05, D-06, D-11 | Deploy central CMP as single source of truth; sync consent state to all marketing platforms within 4 hours. |
| **P2** | REQ-7 | Engineering | D-06, D-09 | Document processor inventory; add erasure cascade + breach notification steps to each third-party processor. |
| **P2** | MREQ-8 | Marketing | D-08 | Migrate tracking pixels to encrypted HTTPS; data-minimisation review; plan server-side / first-party tracking. |

---

## 3. Cross-Cutting Themes

### 3.1 Consent Management (D-05) — The Central Dependency

| Engineering Side | Marketing Side | Shared Dependency |
|---|---|---|
| REQ-1: Build `consent-svc` microservice with grant/withdrawal/query APIs | MREQ-1: Per-purpose signup checkboxes | The signup form POSTs to `consent-svc` — Marketing defines the UI, Engineering provides the API |
| | MREQ-2: One-click withdrawal from marketing messages | The unsubscribe link/link calls `consent-svc`'s withdrawal endpoint |
| | MREQ-9: Separate retargeting consent | The retargeting pixel gate-keeps against `consent-svc` |
| | MREQ-10: Central CMP sync to all marketing platforms | Both teams agree on the CMP as single source of truth; Engineering certifies the API for 4h sync |

**Recommended approach:** REQ-1 is the **foundational dependency**. Marketing cannot ship MREQ-1, MREQ-2, or MREQ-9 until the `consent-svc` API contract is stable. Run the two tracks in parallel: Engineering builds the service, Marketing designs the UI and drafts copy, then integrate.

### 3.2 Data Erasure (D-06) — Deletion Cascade

| Engineering Side | Marketing Side | Shared Dependency |
|---|---|---|
| REQ-2: Build erasure pipeline triggered by consent withdrawal or admin job | MREQ-3: Delete from CRM, email/SMS platforms, retargeting audiences | The pipeline must invoke marketing-platform deletion APIs; REQ-7 (processor cascade) covers third-party platforms |
| REQ-7: Processor inventory + erasure propagation | MREQ-7: Quarantine/erase purchased lead lists without valid consent | Lead-list audit feeds into processor inventory; integration point via `consent-svc`'s erasure webhook |

### 3.3 Security Safeguards (D-08) — Encryption & Access Control

| Engineering Side | Marketing Side | Shared Dependency |
|---|---|---|
| REQ-3: Encryption-at-rest on all PII stores | MREQ-4: Encrypt marketing databases + hashed CSV exports | Both need encryption standards; Marketing relies on Engineering encryption for shared infra (analytics, blob-store) |
| REQ-6: IAM audit, least-privilege, RLS | | Access control is Engineering-led; Marketing benefits from reduced exposure surface |
| | MREQ-8: Encrypted pixels, data minimisation | Pixels are a separate marketing-specific concern — no direct engineering blocker |

### 3.4 Breach Detection & Notification (D-09)

| Engineering Side | Marketing Side | Shared Dependency |
|---|---|---|
| REQ-4: Log ingestion, SIEM rules, notification API | MREQ-5: Escalation paths, DPO contact, breach templates | Marketing feeds breach templates into Engineering's notification pipeline; Engineering's SIEM must cover marketing systems |

### 3.5 Log Retention (D-11)

| Engineering Side | Marketing Side | Shared Dependency |
|---|---|---|
| REQ-5: Extend CloudWatch retention to 1 year + archiving | MREQ-6: Consent/withdrawal/campaign log retention ≥1 year | Marketing's consent logs are part of Engineering's log store; both need append-only immutability and automated archival |

---

## 4. Recommended Sequencing

### Phase 1 (Month 1–2) — Foundation
1. **REQ-1 (consent-svc)** — Design API contract for consent grant, withdrawal, query. This unblocks Marketing UI work.
2. **MREQ-7 (lead list audit)** — No-code audit. Run immediately; quarantine non-compliant lists. Zero engineering dependency.
3. **MREQ-1 (signup forms)** — UI redesign of signup forms. Works in parallel with REQ-1; integration happens when `consent-svc` API is stable.
4. **REQ-5 (log retention)** — Quick config change (CloudWatch 90d → 365d). Low effort, immediate compliance gain.

### Phase 2 (Month 2–4) — Core Capability
1. **MREQ-2 (withdrawal from messages)** — Add unsubscribe flows to email/SMS/WhatsApp. Depends on `consent-svc` withdrawal API.
2. **MREQ-9 (retargeting consent)** — Add retargeting checkbox; gate pixel firing on `consent-svc` check.
3. **REQ-2 (erasure pipeline)** — Build orchestrated deletion. Marketing (MREQ-3) and engineering must coordinate on which platform APIs the pipeline calls.
4. **MREQ-3 (marketing purge)** — Implement deletion automation in CRM/email/ads platforms. Depends on REQ-2 for trigger.
5. **REQ-3 (encryption-at-rest)** — Enable encryption on S3, Kafka, Redis, Snowflake, CloudWatch. Mostly configuration, but needs rollout order.

### Phase 3 (Month 4–5) — Hardening
1. **REQ-4 (breach detection)** — SIEM setup, rule creation, notification API.
2. **MREQ-5 (breach escalation)** — Document procedures, draft templates, run tabletop exercise.
3. **REQ-6 (access control audit)** — IAM review, RLS enforcement, Snowflake masking policies.
4. **MREQ-10 (CMP sync)** — Deploy centralised consent sync to all marketing platforms.

### Phase 4 (Month 5–6) — Polish
1. **MREQ-4 (marketing encryption)** — Encrypt marketing databases, hash CSV exports.
2. **MREQ-6 (marketing retention)** — Append-only log infrastructure, automated archival.
3. **REQ-7 (processor controls)** — Document processors, add erasure cascade + breach notification.
4. **MREQ-8 (pixel security)** — Data-minimisation review, server-side tracking plan.

---

## Key Risk: Consent Service as Single Point of Failure

The entire pipeline's P0 items depend on REQ-1 (`consent-svc`). If it slips, MREQ-1, MREQ-2, MREQ-9, and MREQ-10 are blocked. **Mitigation:** Publish a stable API contract within week 2 and stub the service early so Marketing can integrate in parallel with the full implementation.

---

*Report generated by Consolidator Agent — 12 July 2026*
