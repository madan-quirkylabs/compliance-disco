# Data Protection Impact Assessment (DPIA) Template

## Based on DPDP Act 2023 S.10(2)(c)(i) & DPDP Rules 2025 Rule 13(1)

**Required for**: Significant Data Fiduciaries (SDFs), once notified by Central Government under S.10.
**Frequency**: Once every 12 months from date of SDF notification.
**Audience**: Independent data auditor, Data Protection Board of India (when requested).

---

## 1. Assessment Metadata

| Field | Value |
|-------|-------|
| **Regulation** | Digital Personal Data Protection Act, 2023 & DPDP Rules, 2025 |
| **DPIA Reference** | `DPIA-YYYY-NNN` |
| **Assessment Period** | `[Start Date]` – `[End Date]` |
| **Data Fiduciary Name** | `[Organisation Name]` |
| **Data Protection Officer** | `[Name, Contact]` |
| **Assessor** | `[Name / Role / Org]` |
| **Assessment Date** | `[YYYY-MM-DD]` |

---

## 2. Processing Activities Inventory

For each processing activity involving C3 (Sensitive) or C4 (Protected) personal data:

| Activity ID | Description | Purpose | Lawful Basis | Systems Involved | Data Categories | Data Principals Affected |
|-------------|-------------|---------|--------------|------------------|-----------------|--------------------------|
| PA-01 | User registration | Account creation | Consent (S.6) | web-app → api → user-db | C3: name, email, phone, hashed pwd | All users |
| PA-02 | Behavioural tracking | Product analytics | Consent (S.6) or Legitimate use (S.7) | web-app → events → analytics | C3: user_id, event payload | Active users |
| PA-03 | Document upload | Service delivery | Consent (S.6) | web-app → api → blob-store | C3/C4: uploaded docs (may contain PII) | Users who upload |
| PA-04 | Session management | Authentication persistence | Consent (S.6) | web-app → api → cache | C3: session tokens, OTPs | Active users |
| PA-05 | `[Add activity]` | `[Purpose]` | `[Lawful basis]` | `[Systems]` | `[Tiers]` | `[Population]` |

### 2.1 Lawful Basis Identification

| Basis | Act Ref | Applicable Activities |
|-------|---------|-----------------------|
| Consent | S.6 | PA-01, PA-02, PA-03, PA-04 |
| Legitimate use (voluntary provision) | S.7(a) | — |
| Legitimate use (State benefits) | S.7(b) | — |
| Legitimate use (legal obligation) | S.7(c) | — |
| Legitimate use (medical emergency) | S.7(e) | — |
| Legitimate use (employment) | S.7(f) | — |

---

## 3. Risk Assessment

### 3.1 Risk to Rights of Data Principals

Risk = Likelihood × Severity, assessed per activity

| Activity ID | Risk Scenario | Likelihood (1-5) | Severity (1-5) | Risk Score | Risk Level |
|-------------|---------------|-----------------|----------------|------------|------------|
| PA-01 | Unauthorised access to user-db exposing names/emails/phones | 3 | 4 | 12 | **High** |
| PA-02 | Behavioural data leak enabling user profiling | 2 | 3 | 6 | **Medium** |
| PA-03 | Sensitive content in uploaded docs exposed via unencrypted bucket | 2 | 5 | 10 | **High** |
| PA-04 | Session token theft = account takeover | 2 | 4 | 8 | **High** |

**Risk scoring guide:**
- 1–4: Low
- 5–8: Medium
- 9–12: High
- 13–16: Critical
- 17–25: Extreme

### 3.2 Risk Categories (per S.33(2) penalty criteria)

- **Nature & gravity** of processing — high volume, sensitive data types
- **Type & nature of personal data** — C3 (identifiable), C4 (child/disability if applicable)
- **Repetitive or persistent** nature — behavioural tracking is ongoing
- **Gain/loss** from breach — financial, reputational, legal
- **Mitigation measures** in place — documented in Section 4
- **Proportionality** — processing limited to necessary data
- **Impact on Data Principal** — identity theft, profiling, discrimination

---

## 4. Existing Controls & Gap Assessment

Reference: `control-architecture.md` full mapping.

| Control Category | Controls in Place | Gaps | Gap Ref (from control-architecture) |
|------------------|-------------------|------|--------------------------------------|
| Consent / lawful-basis management | None | No consent capture, withdrawal, or audit trail | CTL-01, CTL-02, CTL-04 |
| Encryption at rest | user-db (RDS) ✓ | events (Kafka) ✗, blob-store (S3 legacy) ✗, cache (Redis) ✗ | CTL-07 |
| Encryption in transit | web-app → api (TLS 1.2+) ✓ | Internal service mesh TLS unverified | — |
| Access control / least privilege | JWT authn on api ✓ | No fine-grained RBAC across all C3/C4 systems | CTL-08 |
| Logging & monitoring | CloudWatch logs (90d) ✓ | No SIEM, no breach detection tied to logs; retention below 1yr minimum | CTL-09, CTL-18 |
| Breach / incident response | None documented | No SOP, no notification service, no 72h timer | CTL-12, CTL-13, CTL-14 |
| Data retention & deletion | None documented | No deletion orchestrator, no inactivity tracking, no pre-erasure notice | CTL-15, CTL-16, CTL-17 |
| Data rights & grievance | None documented | No rights-request portal, no grievance ticketing, no DPO published | CTL-19, CTL-20, CTL-21 |
| Third-party / processor | Not documented | Processor agreements not audited | CTL-11 |
| Backup & resilience | Not verified | RDS backup, S3 versioning, Kafka backup unverified | CTL-10 |

---

## 5. Mitigation Plan

| Priority | Gap ID | Mitigation Action | Target Completion | Owner |
|----------|--------|-------------------|-------------------|-------|
| Critical | CTL-01 | Build consent capture and notice-display service | Before 2027-05-13 | Product Eng |
| Critical | CTL-02 | Add consent-withdrawal API and UI | Before 2027-05-13 | Product Eng |
| Critical | CTL-04 | Log every consent lifecycle event | Before 2027-05-13 | Platform Eng |
| Critical | CTL-12 | Create breach-response SOP aligned to Rule 7 | Before enforcement | Security |
| Critical | CTL-15 | Build cross-system deletion orchestrator | Before enforcement | Platform Eng |
| High | CTL-07 | Enable encryption on Kafka, S3 legacy bucket, Redis | Before enforcement | Infra |
| High | CTL-08 | Implement RBAC across all C3/C4 data stores | Before enforcement | Platform Eng |
| High | CTL-09 | Deploy SIEM with breach detection rules | Before enforcement | Infra |
| High | CTL-11 | Audit and update all processor agreements with DPDP clauses | Before enforcement | Legal + Eng |
| High | CTL-13 | Build breach-notification service | Before enforcement | Platform Eng |
| High | CTL-18 | Extend CloudWatch log retention to 1 year | Before enforcement | Infra |
| High | CTL-19 | Build Data Principal rights-request portal | Before enforcement | Product Eng |
| High | CTL-20 | Implement grievance ticketing with 90d SLA | Before enforcement | Product Eng |

---

## 6. Algorithmic Software Diligence (Rule 13(3))

*Required for SDFs — assess any algorithmic system that processes personal data.*

| Algorithm / System | Purpose | Risk to Rights of Data Principals | Diligence Measures |
|-------------------|---------|----------------------------------|--------------------|
| `[product-recommendation engine]` | Personalised content | Potential for unfair discrimination, filter bubbles | `[Bias testing, transparency report, user controls]` |
| `[fraud-detection model]` | Security | False positives = access denial | `[Threshold tuning, appeals process]` |
| `[analytics pipeline]` | Product analytics | Behavioural profiling | `[Aggregation, de-identification, opt-out]` |

---

## 7. Data Localisation Assessment (Rule 13(4))

| Data Category | Current Location | Proposed Restriction | Compliance Status |
|--------------|-----------------|----------------------|-------------------|
| All C3/C4 personal data | AWS ap-south-1 (Mumbai) | Pending Central Government notification | ✅ Compliant pending notification |

---

## 8. Recommendations & Sign-off

### Recommendations
1. **Immediate** (0–3 months): Build consent service; deploy SIEM; appoint DPO.
2. **Short-term** (3–6 months): Enable encryption on all unencrypted stores; implement RBAC; build deletion orchestrator.
3. **Medium-term** (6–12 months): Rights-request portal; grievance ticketing; annual DPIA/audit cadence.
4. **Ongoing**: Monthly control testing; quarterly risk review; annual re-assessment.

### Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Data Protection Officer | | | |
| Head of Engineering | | | |
| Chief Information Security Officer | | | |
| Independent Data Auditor | | | |

---

*Template generated per DPDP Act 2023 S.10(2)(c)(i) and DPDP Rules 2025 Rule 13(1), Rule 13(2), Rule 13(3).*
*Risk criteria referenced from DPDP Act Schedule (as amended) S.33(2).*
*System inventory: `agents/engineering-agent/skills/build-compliance-artifacts/references/system-inventory.md`*
