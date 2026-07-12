# System Inventory (mock — EDIT to your real/target architecture)

Grounding for the engineering agent: the org's actual systems, what data they hold, and the
controls in place today. This is **regulation-agnostic** — it describes the org, not any one
law. Name these systems in output instead of speaking in generic templates.

Product: multi-tenant B2B SaaS on AWS (Mumbai region, ap-south-1).

| System | Tech | Data it holds | Current controls |
|--------|------|---------------|------------------|
| `web-app` | React SPA | none at rest | TLS 1.2+ |
| `api` | Python/FastAPI | user data in transit | JWT authn; request logs |
| `user-db` | Postgres (RDS) | **names, emails, phone, hashed pwds** | encryption at rest ✓ |
| `events` | Kafka | behavioural events keyed by user_id | no encryption; no field-level masking |
| `blob-store` | S3 | uploaded docs (may contain IDs/PII) | encryption ✗ on legacy bucket |
| `cache` | Redis | sessions, OTP tokens | TTL'd; no encryption |
| `analytics` | Snowflake | aggregates + user_id | Marketing consumes this |
| `logs` | CloudWatch | access + audit logs | 90-day retention |
| `consent-svc` | — | **does not exist yet** | gap: no consent capture/withdrawal store |

## Known baseline gaps (map these to whatever regulation is in scope)
- No consent-management service (matters for any consent/lawful-basis obligation).
- No automated cross-system deletion pipeline (matters for erasure / right-to-be-forgotten).
- Logs retained 90 days only — short for regimes requiring longer audit retention.
- `events`, `blob-store` (legacy), `cache` unencrypted — encryption-at-rest gap.
- No breach detection/alerting tied to logs — incident-response gap.
