# Control Architecture — DPDP Act 2023 & Rules 2025

## 1. Control-to-Obligation Mapping

Each DPDP obligation is mapped to one or more control categories from the framework-neutral catalog (ISO 27001:2022 / SOC 2 / NIST 800-53 refs).

### 1.1 Consent & Lawful Basis Management

| Obligation | DPDP Ref | Control Category | Framework IDs | Current State | Gap |
|-----------|----------|-----------------|---------------|---------------|-----|
| Notice to Data Principal | S.5(1), Rule 3 | Consent / lawful-basis management | ISO A.5.34, SOC 2 P-series, NIST (privacy overlay) | No `consent-svc` | **CTL-01**: Build consent capture + notice display |
| Valid consent (free, specific, informed) | S.6(1) | Consent / lawful-basis management | ISO A.5.34 | No consent capture | **CTL-01** (same) |
| Right to withdraw consent | S.6(4) | Consent / lawful-basis management | ISO A.5.34 | No withdrawal mechanism | **CTL-02**: Add consent-withdrawal endpoint |
| Consent Manager integration | S.6(7)–(9), Rule 4 | Consent / lawful-basis management | ISO A.5.34 | No Consent Manager | **CTL-03**: Register with Board or integrate with registered Consent Manager |
| Burden of proof for consent | S.6(10) | Logging & monitoring; Consent management | ISO A.8.15; SOC 2 CC7.2 | No consent audit trail | **CTL-04**: Log every consent event (give, manage, review, withdraw) |
| Verifiable consent for child | S.9(1), Rule 10 | Consent / lawful-basis management | ISO A.5.34, NIST (privacy overlay) | No age-verification or parent-consent flow | **CTL-05**: Build verifiable-consent pipeline (parent identity via authorised entity or DigiLocker) |
| Verifiable consent for PwD | Rule 11 | Consent / lawful-basis management | ISO A.5.34 | No guardian-verification flow | **CTL-06**: Integrate with designated authority / local level committee verification |

### 1.2 Encryption / Security Safeguards

| Obligation | DPDP Ref | Control Category | Framework IDs | Current State | Gap |
|-----------|----------|-----------------|---------------|---------------|-----|
| Reasonable security safeguards | S.8(5), Rule 6 | Encryption (at rest / in transit) | ISO A.8.24, SOC 2 CC6.6/CC6.7, NIST SC-13, SC-28 | `events` unencrypted; `blob-store` legacy unencrypted; `cache` unencrypted | **CTL-07**: Enable encryption on Kafka, S3 legacy bucket, Redis |
| Access controls | Rule 6(b) | Access control / least privilege | ISO A.8.3/A.5.15, SOC 2 CC6.1/CC6.3, NIST AC-2, AC-6 | JWT authn on `api`; no fine-grained RBAC documented | **CTL-08**: Implement least-privilege RBAC across all systems with C3/C4 data |
| Logs and monitoring | Rule 6(c), Rule 6(e) | Logging & monitoring | ISO A.8.15/A.8.16, SOC 2 CC7.2, NIST AU-2, AU-6, SI-4 | CloudWatch logs exist; no breach detection tied to logs | **CTL-09**: Deploy SIEM-level log analytics with breach-detection rules |
| Backups | Rule 6(d) | Backup & resilience | ISO A.8.13, SOC 2 A1.2, NIST CP-9 | Not documented | **CTL-10**: Verify RDS automated backups, S3 versioning, Kafka backup |
| Processor contract | S.8(2), Rule 6(d) | Third-party / processor controls | ISO A.5.19–A.5.22, SOC 2 CC9.2, NIST SA-9 | Not documented | **CTL-11**: Audit and update all Data Processor agreements with DPDP clauses |
| Encryption of personal data in transit | Rule 6(a) | Encryption (in transit) | ISO A.8.24, NIST SC-8 | TLS 1.2+ on `web-app` → `api` | **No gap** — verify internal service mesh also uses TLS |

### 1.3 Breach Detection & Response

| Obligation | DPDP Ref | Control Category | Framework IDs | Current State | Gap |
|-----------|----------|-----------------|---------------|---------------|-----|
| Intimate Board of breach | S.8(6), Rule 7(2) | Incident / breach response | ISO A.5.24–A.5.28, SOC 2 CC7.3/CC7.4, NIST IR-4, IR-6 | No breach-response playbook tied to DPDP | **CTL-12**: Create incident-response SOP aligned to Rule 7 (72hr Board report) |
| Intimate affected Data Principals | S.8(6), Rule 7(1) | Incident / breach response | same as above | No notification template or delivery mechanism | **CTL-13**: Build breach-notification service (email + user-account messaging) |
| Intimate without delay + detailed within 72h | Rule 7(2)(a)–(b) | Incident / breach response | same as above | No SLA tracking for breach intimation | **CTL-14**: Add 72h timer & escalation in incident-response tooling |

### 1.4 Data Retention & Erasure

| Obligation | DPDP Ref | Control Category | Framework IDs | Current State | Gap |
|-----------|----------|-----------------|---------------|---------------|-----|
| Erasure on withdrawal/purpose served | S.8(7) | Data retention & deletion | ISO A.8.10, SOC 2 A1.2, NIST SI-12, MP-6 | No automated deletion pipeline | **CTL-15**: Build cross-system deletion orchestrator |
| Inactive account erasure | Rule 8(1), Third Schedule | Data retention & deletion | same as above | No inactivity tracking | **CTL-16**: Implement last-activity timestamp + sweep job for 3yr threshold |
| 48-hour notice before erasure | Rule 8(2) | Data retention & deletion | same as above | No pre-erasure notification | **CTL-17**: Add notification step to erasure pipeline |
| Log retention minimum 1 year | Rule 8(3) | Logging & monitoring; Data retention | ISO A.8.10, NIST AU-11 | CloudWatch 90-day retention only | **CTL-18**: Extend CloudWatch retention to 1 year minimum |

### 1.5 Data Rights & Grievance Redressal

| Obligation | DPDP Ref | Control Category | Framework IDs | Current State | Gap |
|-----------|----------|-----------------|---------------|---------------|-----|
| Provide means to exercise rights | S.12, S.13, Rule 14(1) | Access control; Data classification | ISO A.5.9/A.5.12, SOC 2 CC3.2 | No rights-request portal | **CTL-19**: Build Data Principal rights-request UI + workflow engine |
| Respond to grievances within 90 days | Rule 14(3) | Incident / breach response; logging | ISO A.5.24–A.5.28 | No grievance tracking system | **CTL-20**: Implement grievance ticketing system with 90-day SLA |
| Publish DPO/contact information | S.8(9), Rule 9 | Data classification & inventory | ISO A.5.9/A.5.12 | Not published | **CTL-21**: Publish DPO contact on website/app and in all rights request responses |

### 1.6 Significant Data Fiduciary (SDF) Obligations

| Obligation | DPDP Ref | Control Category | Framework IDs | Current State | Gap |
|-----------|----------|-----------------|---------------|---------------|-----|
| Appoint DPO based in India | S.10(2)(a) | Organisational; Access control | — | Not appointed | **CTL-22**: Recruit/designate Data Protection Officer |
| Appoint independent data auditor | S.10(2)(b) | Audit | ISO A.5.30, SOC 2 CC1.2 | Not appointed | **CTL-23**: Engage independent data auditor |
| Annual DPIA | Rule 13(1) | Data classification & inventory; Risk | ISO A.5.9/A.5.12, NIST RA-2 | No DPIA performed | **CTL-24**: Schedule and conduct annual DPIA |
| Annual audit | Rule 13(1) | Data classification & inventory | ISO A.5.9/A.5.12 | No annual audit | **CTL-25**: Schedule annual data audit |
| Algorithmic software diligence | Rule 13(3) | Data classification & inventory | ISO A.5.9 | No algorithmic-impact assessment process | **CTL-26**: Implement algorithmic-diligence checklist |
| Data localisation for specified data | Rule 13(4) | Data retention & deletion | ISO A.8.10 | All data in ap-south-1; policy needed | **CTL-27**: Document data localisation policy for future-notified categories |

## 2. Control Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         DATA PRINCIPAL (User)                            │
└────┬───────┬──────────┬──────────────┬────────────────┬─────────────────┘
     │       │          │              │                │
     ▼       ▼          ▼              ▼                ▼
┌─────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐
│web-app  │ │Rights  │ │Consent   │ │Grievance   │ │Breach Portal │
│(React)  │ │Request │ │Manager   │ │Portal      │ │(email+notice)│
│- Notice │ │Portal  │ │(Reg. or  │ │(90d SLA)   │ │              │
│- DPO    │ │(C&E)   │ │3rd pty)  │ │            │ │              │
│  contact│ │        │ │          │ │            │ │              │
└────┬─────┘ └────────┘ └────┬─────┘ └────────────┘ └──────┬───────┘
     │                       │                             │
     ▼                       ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            API Gateway (FastAPI)                         │
│               JWT AuthN │ RBAC AuthZ │ Request Logging                   │
└─────────┬──────────┬───────────┬──────────────┬─────────────┬────────────┘
          │          │           │              │             │
          ▼          ▼           ▼              ▼             ▼
    ┌─────────┐ ┌─────────┐ ┌────────┐ ┌────────────┐ ┌──────────┐
    │ user-db │ │ events  │ │blob-str│ │  cache     │ │ consent  │
    │ (RDS)   │ │ (Kafka) │ │ (S3)   │ │  (Redis)   │ │  -svc    │
    │ C3      │ │ C3      │ │ C3/C4  │ │  C3        │ │  (new)   │
    │ enc. ✓  │ │ enc. ✗  │ │ enc. ✗ │ │  enc. ✗    │ │  C3/C4   │
    └─────────┘ └─────────┘ └────────┘ └────────────┘ └──────────┘
          │          │           │              │             │
          ▼          ▼           ▼              ▼             ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                          Observability Layer                       │
    │  CloudWatch Logs (→ extend to 1yr) │ SIEM (new) │ Alerting         │
    │  Deletion Orchestrator (new)       │ Erasure Job │ Retention Mgmt   │
    └─────────────────────────────────────────────────────────────────────┘
```

## 3. Gap Summary

| Gap ID | Control | Priority | Effort | Timeline | Owner |
|--------|---------|----------|--------|----------|-------|
| CTL-01 | Consent capture + notice display | Critical | 3 sprints | Before Rule 1(4) enforcement (2027-05-13) | Product Eng |
| CTL-02 | Consent withdrawal mechanism | Critical | 1 sprint | Same | Product Eng |
| CTL-03 | Consent Manager integration | Medium | 2 sprints | Before Rule 1(3) (2026-11-13) | Platform Eng |
| CTL-04 | Consent audit trail logging | Critical | 1 sprint | Before enforcement | Platform Eng |
| CTL-05 | Verifiable consent for child data | High | 3 sprints | Before Rule 1(4) | Product Eng |
| CTL-06 | PwD guardian verification | Medium | 2 sprints | Before Rule 1(4) | Product Eng |
| CTL-07 | Enable encryption on Kafka, S3 legacy, Redis | High | 2 sprints | Before enforcement | Infra |
| CTL-08 | RBAC across all C3/C4 systems | High | 2 sprints | Before enforcement | Platform Eng |
| CTL-09 | SIEM with breach-detection rules | High | 4 sprints | Before enforcement | Infra |
| CTL-10 | Verify backup strategy documented | Medium | 0.5 sprint | Before enforcement | Infra |
| CTL-11 | Audit/update Data Processor agreements | High | 1 sprint | Before enforcement | Legal + Eng |
| CTL-12 | Breach-response SOP (Rule 7) | Critical | 1 sprint | Before enforcement | Security |
| CTL-13 | Breach-notification service (email + user-account) | High | 2 sprints | Before enforcement | Platform Eng |
| CTL-14 | 72h breach timer + escalation | Medium | 1 sprint | Before enforcement | Security |
| CTL-15 | Cross-system deletion orchestrator | Critical | 3 sprints | Before enforcement | Platform Eng |
| CTL-16 | Inactivity tracking + sweep job | Medium | 2 sprints | Before enforcement | Platform Eng |
| CTL-17 | Pre-erasure notification (48h) | Medium | 1 sprint | Before enforcement | Platform Eng |
| CTL-18 | Extend CloudWatch retention to 1yr | High | 0.5 sprint | Before enforcement | Infra |
| CTL-19 | Data Principal rights-request portal | High | 3 sprints | Before Rule 1(4) | Product Eng |
| CTL-20 | Grievance ticketing system (90d SLA) | High | 2 sprints | Before enforcement | Product Eng |
| CTL-21 | Publish DPO contact info | Medium | 0.5 sprint | Before enforcement | Marketing + Eng |
| CTL-22 | Appoint DPO in India | High | — | Before SDF notification | Executive |
| CTL-23 | Engage independent data auditor | High | — | Before SDF notification | Executive |
| CTL-24 | Schedule annual DPIA | Medium | — | Annually from SDF notification | DPO |
| CTL-25 | Schedule annual data audit | Medium | — | Annually from SDF notification | Auditor |
| CTL-26 | Algorithmic-diligence process | Medium | 1 sprint | Before enforcement | ML/AI Eng |
| CTL-27 | Data localisation policy | Low | 0.5 sprint | When Government notifies | Legal + Eng |

**Total: 27 controls | Critical: 6 | High: 12 | Medium: 8 | Low: 1**

---

*Framework mapping source: `agents/engineering-agent/skills/build-compliance-artifacts/references/controls.md` (ISO 27001:2022, SOC 2, NIST 800-53)*
*System inventory source: `agents/engineering-agent/skills/build-compliance-artifacts/references/system-inventory.md`*
*Obligations source: `workspace/shared-data/extracted-regulations/obligations.json`*
