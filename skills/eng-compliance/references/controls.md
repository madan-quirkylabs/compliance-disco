# Control Catalog — DPDP-first (India Digital Personal Data Protection Act 2023 + Rules 2025)

Map each obligation to the DPDP provision AND a technical control framework ID.

## DPDP Act 2023 — engineering-relevant obligations
- **S.8(4)** — Data accuracy & completeness where used for decisions/disclosure.
- **S.8(5)** — Reasonable **security safeguards** to prevent personal data breach.
- **S.8(6)** — **Breach notification** to the Data Protection Board and affected Data Principals.
- **S.8(7)** — **Erasure** on consent withdrawal or when purpose is served (and cause processors to erase).
- **S.8(8)** — Retention limits; delete when no longer necessary.
- **S.5–6** — Notice + **consent**: itemized notice, consent capture/withdrawal, per-purpose.
- **S.9** — **Children's data**: verifiable parental consent; no tracking/behavioural monitoring/targeted ads.
- **S.11–14** — Data Principal rights: **access, correction, erasure, grievance redressal**, nominee.
- **S.10** — **Significant Data Fiduciary**: DPO, DPIA, independent audit.

## DPDP Rules 2025 — Rule 6 security safeguards (the engineering checklist)
- **R6(a)** — Encryption / obfuscation / masking / virtual tokens for personal data.
- **R6(b)** — Access control on computer resources holding personal data.
- **R6(c)** — **Logs, monitoring & review** to detect unauthorised access; investigate; remediate.
- **R6(d)** — Reasonable measures for **continued processing after a breach** (backups).
- **R6(e)** — **Retention of logs and personal data for 1 year** (unless law requires longer).
- **R6(f)** — Contractual security obligations on Data Processors.

## Cross-framework control IDs (for auditor familiarity)
- Encryption at rest/in transit → **ISO 27001 A.8.24**, **SOC2 CC6.6/CC6.7**.
- Access control → **A.8.3 / A.8.15**, **SOC2 CC6.1**.
- Logging & monitoring → **A.8.15 / A.8.16**, **SOC2 CC7.2**.
- Deletion / retention → **A.8.10**, **SOC2 A1.2**.
- Incident/breach response → **A.5.24–A.5.28**, **SOC2 CC7.3**.
