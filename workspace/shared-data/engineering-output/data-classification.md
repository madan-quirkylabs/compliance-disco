# Data Classification Scheme — DPDP Act 2023 & Rules 2025

## 1. Classification Tiers

Based on the DPDP Act's schema and the organisation's system inventory, data is classified into four tiers:

| Tier | Label | Definition | Examples | DPDP Relevance |
|------|-------|------------|----------|----------------|
| **C1** | Public | Intended for public disclosure; no harm if exposed | Marketing collateral, published reports | Outside scope (not personal data per S.2(t)) |
| **C2** | Internal | Organisational data; limited harm if exposed | Internal org charts, non-PII operational metrics | May contain processing metadata |
| **C3** | Sensitive | Personal data requiring consent & security safeguards | Names, emails, phone numbers, user IDs, device fingerprints | Core DPDP scope (S.2(t), S.8(5)) |
| **C4** | Protected | Child data, verifiable-consent-required data, and data with enhanced penalty exposure | Parental consent records, data of individuals under 18, disability status | S.9 (children); Rule 10-11 (verifiable consent) |

## 2. Mapping: System Inventory → Data Tiers

| System | Data Held | C1 | C2 | C3 | C4 | DPDP Obligations |
|--------|-----------|:--:|:--:|:--:|:--:|------------------|
| `web-app` (React SPA) | none at rest | ✓ | — | — | — | S.8(9): publish DPO contact; Rule 14(1): publish rights means |
| `api` (Python/FastAPI) | user data in transit | — | — | ✓ | ? | S.8(4): technical measures; S.8(5): security safeguards |
| `user-db` (Postgres RDS) | names, emails, phone, hashed pwds | — | — | ✓ | ? | S.8(4)–(5); S.8(7) erasure; S.12 correction/erasure |
| `events` (Kafka) | behavioural events keyed by user_id | — | — | ✓ | — | S.8(5) encryption; S.8(6) breach notification |
| `blob-store` (S3) | uploaded docs (may contain IDs/PII) | — | — | ✓ | ? | S.8(5) encryption; S.8(7) erasure; Rule 6 |
| `cache` (Redis) | sessions, OTP tokens | — | — | ✓ | — | S.8(5) security safeguards; TTL lifecycle |
| `analytics` (Snowflake) | aggregates + user_id | — | — | ✓ | — | S.8(3) accuracy if decision-affecting; Rule 6 encryption |
| `logs` (CloudWatch) | access + audit logs | — | — | ✓ | — | Rule 6(e): retain logs 1 year; Rule 8(3): min 1 year |
| `consent-svc` | **does not exist** | — | — | ✓ | ✓ | **GAP**: S.5–6 consent; Rule 3 notice; Rule 4 Consent Manager |

## 3. Data Lifecycle (DPDP-Relevant Stages)

```
Collection ──→ Storage ──→ Processing ──→ Sharing ──→ Erasure
    │             │             │             │            │
    ├ S.5 notice  ├ S.8(5) enc. ├ S.8(4) tech ├ S.8(2)     ├ S.8(7)
    ├ S.6 consent ├ Rule 6 logs │ measures     │ contract   │ Rule 8(1)
    └ S.9, Rule 10│ Rule 8(3)   └ S.8(3) acc. └ Rule 15    └ Rule 8(2)
                  └ S.8(7) del.
    (child VC)         erasure              (cross-border)
```

## 4. Cross-Border Data Classification

Per Rule 15: personal data may be transferred outside India subject to Central Government notification. Until then, all cross-region data flows must:

- Map destination country to any government-issued list (once notified)
- Flag any C3/C4 data moving outside `ap-south-1` (Mumbai region)
- Ensure processor contracts per S.8(2) cover cross-border transfers

| Region | AWS Location | Current C3/C4 | Notes |
|--------|--------------|---------------|-------|
| ap-south-1 | Mumbai | ✓ | Primary — compliant by default |
| Any other | Outside India | ⚠️ Permitted pending notification | Must re-evaluate when Government notifies restricted territories |

## 5. Retention Schedule

| Data Type | Minimum Retention | Legal Basis | Erasure Trigger |
|-----------|------------------|-------------|-----------------|
| Transactional user data | Active account life + 0 days after erasure request | S.8(7) — purpose served | Withdrawal of consent / erasure request |
| Inactive account data (specified classes: e-com, gaming, social media) | 3 years from last approach or Rules commencement (whichever later) | Third Schedule, Rule 8(1) | Erasure after 3yr inactivity + 48hr notice |
| Logs (access, traffic, audit) | 1 year from processing date | Rule 8(3) | After 1 year unless legal hold |
| Consent records | Life of processed data + 1 year (or longer per legal hold) | S.10 (burden of proof), Rule 6(e) | After processing ceases |
| Consent Manager records | 7 years | First Schedule Part B Item 4 | After 7 years |

## 6. Gap Analysis

| Gap ID | Description | Impacted Tier | Priority | Recommended Action |
|--------|-------------|---------------|----------|--------------------|
| DCL-01 | No `consent-svc` — consent not captured at any tier | C3/C4 | **Critical** | Build consent-capture and withdrawal service |
| DCL-02 | `events` (Kafka) unencrypted; no field-level masking | C3 | **High** | Enable Kafka TLS + field-level encryption for user_id |
| DCL-03 | `blob-store` (S3) legacy bucket lacks encryption | C3/C4 | **High** | Enable S3 SSE-S3 or SSE-KMS on legacy bucket |
| DCL-04 | `cache` (Redis) no encryption at rest | C3 | **Medium** | Enable Redis AUTH + TLS; evaluate encryption at rest |
| DCL-05 | No automated cross-system deletion pipeline | C3/C4 | **Critical** | Build deletion orchestrator that calls all data stores |
| DCL-06 | Logs retained only 90 days; need 1 year minimum | C3 | **High** | Extend CloudWatch log retention to 1 year+ |
| DCL-07 | No Data Protection Officer contact published | C3/C4 | **Medium** | Publish on website/app per Rule 9 |

---

*Classification based on DPDP Act 2023 S.2(t) (personal data), S.9 (children), and DPDP Rules 2025 Rule 8(3) (retention).*
*System inventory source: `agents/engineering-agent/skills/build-compliance-artifacts/references/system-inventory.md`*
