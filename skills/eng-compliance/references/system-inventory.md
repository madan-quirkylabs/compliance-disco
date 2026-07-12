# System Inventory (mock — EDIT to your real/target architecture)

Grounding for the engineering compliance agent. `affected_systems` MUST come from this table.
Kept inside the skill (not a project context file) so it can't be shadowed by the team's
root AGENTS.md / .hermes.md.

Product: multi-tenant B2B SaaS on AWS (Mumbai region, ap-south-1).

| System | Tech | Personal data it holds | Current controls |
|--------|------|------------------------|------------------|
| `web-app` | React SPA | none at rest | TLS 1.2+ |
| `api` | Python/FastAPI | PII in transit | JWT authn; request logs |
| `user-db` | Postgres (RDS) | **names, emails, phone, hashed pwds** | encryption at rest ✓ |
| `events` | Kafka | behavioural events keyed by user_id | no encryption; no field-level masking |
| `blob-store` | S3 | uploaded docs (may contain PII/IDs) | encryption ✗ on legacy bucket |
| `cache` | Redis | sessions, OTP tokens | TTL'd; no encryption |
| `analytics` | Snowflake | aggregates + user_id | Marketing consumes this |
| `logs` | CloudWatch | access + audit logs | 90-day retention |
| `consent-svc` | — | **does not exist yet** | gap: no consent capture/withdrawal store |

## Known baseline gaps (useful for impact assessments)
- No consent management service (blocks DPDP S.5–6, S.8(7) withdrawal-triggered erasure).
- No automated cross-system erasure pipeline (blocks S.8(7), S.12 right to erasure).
- Logs retained 90 days — **below DPDP Rule 6(e) 1-year requirement**.
- `events`, `blob-store` (legacy), `cache` unencrypted — gaps vs Rule 6(a).
- No breach detection/alerting tied to logs — gap vs Rule 6(c), S.8(6).
