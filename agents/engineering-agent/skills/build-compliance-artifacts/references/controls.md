# Control Catalog (framework-neutral)

A regulation-agnostic vocabulary of technical controls and their framework IDs. Map each
obligation from the **extracted regulation** to one or more of these, and cite both the
framework ID and the regulation's own provision. The regulation's provisions are NOT listed
here — they come from `extracted-regulations/` at runtime.

## Control categories → framework IDs
| Control category | ISO 27001:2022 | SOC 2 | NIST 800-53 |
|---|---|---|---|
| Encryption (at rest / in transit) | A.8.24 | CC6.6 / CC6.7 | SC-13, SC-28 |
| Access control / least privilege | A.8.3 / A.5.15 | CC6.1 / CC6.3 | AC-2, AC-6 |
| Logging & monitoring | A.8.15 / A.8.16 | CC7.2 | AU-2, AU-6, SI-4 |
| Data retention & deletion | A.8.10 | A1.2 | SI-12, MP-6 |
| Incident / breach response | A.5.24–A.5.28 | CC7.3 / CC7.4 | IR-4, IR-6 |
| Data classification & inventory | A.5.9 / A.5.12 | CC3.2 | RA-2, CM-8 |
| Consent / lawful-basis management | A.5.34 | P-series | (privacy overlay) |
| Third-party / processor controls | A.5.19–A.5.22 | CC9.2 | SA-9 |
| Backup & resilience | A.8.13 | A1.2 | CP-9 |

## How to use
1. For each obligation in the extracted regulation, identify the control category it demands.
2. Cite the framework ID(s) above **and** the regulation's own provision (from the source).
3. Check `system-inventory.md` for whether that control exists today → that's the gap.

---

## Example mapping (test flow: DPDP Act 2023 + Rules 2025)
*Illustrative only — real provisions come from the extracted regulation.*
- Erasure on consent withdrawal → **DPDP S.8(7)** → Data retention & deletion (A.8.10 / MP-6)
- Security safeguards / breach → **DPDP S.8(5)–(6), Rule 6** → Encryption + Logging + Incident response
- Log/personal-data retention 1 year → **DPDP Rule 6(e)** → Logging & retention (AU-11)
- Consent capture/withdrawal → **DPDP S.5–6** → Consent management
