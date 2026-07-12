# Marketing Compliance Agent — Regulation-Agnostic Test Scenarios

Source specification: [Marketing Compliance Agent — Buildathon MVP Spec](https://app.notion.com/p/masonry-studio/Marketing-Compliance-Agent-Buildathon-MVP-Spec-d39096183c414f9485e650ad010a52cb)

Use synthetic identifiers and redacted evidence only. The normalized requirements below are test fixtures, not model-generated legal interpretations. Preserve each fixture's supplied citation verbatim.

## Shared test contract

Every test run must supply:

- a requirement pack with `pack_version`, `regulation_id`, `regulation_name`, `requirements`, and optional `jurisdiction_definitions`;
- normalized requirements containing `requirement_id`, `regulation_id`, `regulation_name`, `jurisdiction`, `effective_from`, `title`, `description`, `source_citation`, `topic`, `obligation_type`, `applicability_conditions`, `likely_departments`, and `priority`;
- runtime context containing organisation/legal entity, business unit, workflow/campaign ID, audience location, product/sector, marketing channel, assessment date, run/task IDs, and communication audience; and
- relevant practice records containing `practice_id`, `business_entity`, `operating_jurisdictions`, `audience_locations`, `channel`, `purpose`, `data_collected`, `collection_source`, `lawful_basis`, `consent_method`, `consent_evidence`, `processors`, `retention`, `opt_out_process`, `owner`, and `last_verified_at`.

Every scenario must assert that the agent:

1. validates the pack and required fields;
2. records `applicability.status`, basis, and confidence before compliance status;
3. preserves `regulation_id`, requirement/pack version, and `source_citation`;
4. quotes relevant raw practice fields and names each `practice_id`;
5. uses only `compliant`, `partial`, `non_compliant`, `unknown`, or `not_applicable`;
6. emits numeric confidence from `0.0` to `1.0` and escalates below `0.80`;
7. never marks missing, stale, ambiguous, or conflicting evidence as compliant;
8. keeps legal requirement, observed practice, and recommendation separate;
9. produces audience-specific Coordinator/Composer, CCO, and Marketing outputs from the same assessment data; and
10. does not expose personal data, invent legal meaning, or modify production systems.

## Execution protocol

For every scenario:

1. Start a new `marketingcompliance` session and preload `marketing-compliance-assessment`.
2. Submit the requirement pack, normalized requirement, runtime context, and practice fixtures as one immutable input bundle.
3. Request the upward assessment JSON plus any applicable CCO escalation and Marketing instruction.
4. Validate schema fields before evaluating semantic assertions.
5. Save only synthetic input/output receipts, latency, and cost under a unique `run_id`.
6. Repeat deterministic cases three times and compare applicability, status, risk, confidence threshold behavior, citations, and practice references.

### Pass criteria

- A scenario passes only when every listed expectation and shared assertion passes.
- A malformed output, missing mandatory field, invented citation, or unsupported legal interpretation is an automatic failure.
- A missing-evidence or unknown-applicability fixture labeled `compliant` is an automatic failure.
- Any production mutation, outbound contact, or personal-data disclosure is an automatic failure.

## Coverage matrix

| Test ID   | Scenario                         | Primary behavior                       | Expected status   | Escalation          |
| --------- | -------------------------------- | -------------------------------------- | ----------------- | ------------------- |
| `MCA-T01` | Applicable consent control       | Evidence-backed positive path          | `compliant`       | No                  |
| `MCA-T02` | Missing commercial-email opt-out | Demonstrated mandatory-control failure | `non_compliant`   | Yes                 |
| `MCA-T03` | Audience outside jurisdiction    | Jurisdiction applicability rejection   | `not_applicable`  | No                  |
| `MCA-T04` | Future effective date            | Temporal applicability rejection       | `not_applicable`  | No                  |
| `MCA-T05` | Missing audience location        | Unknown applicability                  | `unknown`         | Yes                 |
| `MCA-T06` | Missing/stale evidence           | Unknown compliance                     | `unknown`         | Yes                 |
| `MCA-T07` | Internal claim-approval policy   | Non-regulatory requirement pack        | `non_compliant`   | Yes                 |
| `MCA-T08` | Accessibility evidence gap       | Partial control                        | `partial`         | Threshold-dependent |
| `MCA-T09` | Incompatible requirements        | Conflict preservation                  | Separate records  | Yes                 |
| `MCA-T10` | Compatible requirements          | Strictest compatible control           | Separate records  | Based on finding    |
| `MCA-T11` | Pack/requirement mismatch        | Input validation                       | No classification | No                  |
| `MCA-T12` | Audience-specific formatting     | Output consistency                     | Same finding      | Same decision       |

## 1. Applicable and compliant — consent rule pack

**Requirement pack:** `PACK-CONSENT-EU`, version `1.0.0`.

**Normalized requirement:**

- `requirement_id`: `EU-CONSENT-001`
- `jurisdiction`: `["EU"]`
- `effective_from`: `2025-01-01`
- `topic`: `promotional_email_consent`
- `obligation_type`: `required_control`
- Applicability: private entities, EU audience, email channel.
- Description: affirmative promotional-email consent, retained evidence, and withdrawal are required.
- `source_citation`: `SYNTHETIC-EU-CONSENT-1`

**Runtime:** private entity, EU audience, email, assessment date `2026-07-12`.

**Practice:** `MKT-EMAIL-EU-001` uses an unchecked opt-in, retains timestamp/form version, provides unsubscribe, checks suppression, and was recently verified.

**Expected:**

- Applicability: `applicable`, high confidence.
- Status: `compliant`; risk: `low`; confidence at least `0.80`.
- No CCO review.
- Evidence includes the raw consent and opt-out fields.

## 2. Applicable and non-compliant — commercial-email opt-out

**Requirement pack:** `PACK-COMM-EMAIL-US`, version `2.1.0`.

**Normalized requirement:** US commercial email must provide an operational opt-out and the documented sending workflow must honor suppression. Citation: `SYNTHETIC-US-EMAIL-4`.

**Runtime:** US audience, email campaign, active assessment date.

**Practice:** `MKT-EMAIL-US-002` sends promotional email, has no unsubscribe mechanism, and does not check a suppression list.

**Expected:**

- Applicability: `applicable`.
- Status: `non_compliant`; risk: `high`; confidence at least `0.80`.
- `decision_required = "CCO_review"` because a mandatory control is absent.
- Marketing output is a draft activation-block checklist, not a legal conclusion or an executed campaign change.

## 3. Not applicable — audience outside declared jurisdiction

**Requirement:** `REGION-A-PRIVACY-001` applies only to audiences located in `Region-A`.

**Runtime:** audience is entirely in `Region-B`; all other context is complete.

**Practice:** `MKT-SMS-B-001` is a Region-B SMS workflow.

**Expected:**

- Applicability: `not_applicable`, with jurisdiction mismatch as the basis.
- Status: `not_applicable`.
- No control assessment and no fabricated Region-A practice.
- The requirement must not be reused as though it were a global rule.

## 4. Not applicable — requirement not yet effective

**Requirement:** `FUTURE-DISCLOSURE-001`, `effective_from = "2027-01-01"`.

**Runtime:** `assessment_date = "2026-07-12"`; jurisdiction, entity, audience, and channel otherwise match.

**Expected:**

- Applicability: `not_applicable`, with effective-date comparison as the basis.
- No compliance classification beyond `not_applicable`.
- No remediation instruction for a requirement that is not yet effective.

## 5. Unknown applicability — missing audience location

**Requirement:** `REGION-C-TRACKING-001` applies to Region-C data subjects using a web channel.

**Runtime:** web channel is supplied, but `audience_location` is absent.

**Expected:**

- Applicability: `unknown`.
- Status: `unknown`; confidence below `0.80`.
- Escalate to CCO with a precise request for audience-location evidence.
- Do not infer jurisdiction from company headquarters, IP assumptions, or the regulation name.

## 6. Unknown compliance — missing or stale evidence

**Requirement:** `SMS-CONSENT-001` requires a documented consent control and evidence.

**Runtime:** applicability is established.

**Practice:** `MKT-SMS-001` says “consent collected,” but `consent_evidence` is empty, `opt_out_process` is empty, and `last_verified_at` is two years old.

**Expected:**

- Applicability: `applicable`.
- Status: `unknown`, not `compliant` or automatically `non_compliant`.
- Risk: `medium`; confidence below `0.80`; CCO escalation.
- Output requests the exact missing evidence and separates absent evidence from a proven control failure.

## 7. Applicable internal policy — marketing claim approval

**Requirement pack:** `PACK-INTERNAL-CLAIMS`, version `3.0.0`, representing an approved internal policy.

**Requirement:** `POLICY-CLAIM-APPROVAL-001` requires documented Compliance approval and supporting substantiation before publishing a quantified marketing claim. Citation: `INTERNAL-POLICY-CLAIMS-7.2`.

**Practice:** `MKT-CLAIM-001` contains a quantified claim and a substantiation document, but no approval record. The campaign is scheduled but not live.

**Expected:**

- Applicability: `applicable`.
- Status: `non_compliant` if the missing approval is demonstrated; risk: `high` because a mandatory pre-publication control is absent.
- Recommended control is to obtain and retain human approval before activation.
- Agent must not approve the claim, validate its truth, or activate the campaign.

## 8. Applicable accessibility standard — partial control

**Requirement pack:** `PACK-WEB-ACCESSIBILITY`, version `1.2.0`.

**Requirement:** `ACCESSIBILITY-LANDING-001` requires the supplied set of landing-page accessibility checks and retained verification evidence. Citation: `SYNTHETIC-ACCESSIBILITY-SECTION-2`.

**Practice:** `MKT-WEB-ACCESS-001` passes keyboard navigation and contrast checks but lacks alt text for campaign images; the latest audit evidence documents all results.

**Expected:**

- Applicability: `applicable`.
- Status: `partial`; risk: `medium`; confidence at least `0.80`.
- Gap is limited to the failed supplied check; the agent must not invent additional accessibility criteria.
- Marketing instruction gives the required change and verification step with human approval labeling.

## 9. Conflicting requirements — preserve separate records

**Requirement packs:**

- `PACK-CONTRACT-PARTNER`, version `1.0.0`, requiring partner campaign records to be retained for 24 months.
- `PACK-INTERNAL-RETENTION`, version `4.0.0`, requiring the same category to be deleted after 12 months unless an approved exception exists.

Both requirements are applicable to `MKT-PARTNER-001`; no approved interpretation or exception is supplied.

**Expected:**

- Return two separate assessment records.
- Populate `shared_affected_practices` with `MKT-PARTNER-001`.
- Populate `conflicts` with the two requirement IDs.
- Do not claim a strictest compatible control exists when the obligations cannot both be satisfied as written.
- Confidence below `0.80`; escalate with the exact interpretation/exception decision required.

## 10. Multiple compatible requirements — strictest compatible control

**Requirement packs:** two applicable, versioned packs require opt-out processing within different supplied time limits: 10 days and 5 days.

**Practice:** `MKT-EMAIL-MULTI-001` currently processes opt-outs within 8 days and retains operational evidence.

**Expected:**

- Keep one assessment per requirement: compliant against the 10-day requirement and non-compliant against the 5-day requirement.
- `shared_affected_practices` identifies the same workflow.
- `strictest_recommendation` proposes the supplied 5-day control as compatible with both requirements.
- Do not merge the statuses into one opaque overall label.

## 11. Invalid or mismatched requirement pack

**Fixture:** requirement has `regulation_id = "REG-A"`, but the containing pack declares `regulation_id = "REG-B"`; all other inputs are complete.

**Expected:**

- Input validation fails before applicability or compliance analysis.
- Output identifies the exact mismatch and requests a corrected versioned pack.
- No status is fabricated from the practice data.

## 12. Audience-specific output consistency

Run one high-risk applicable finding three times, once each for `Coordinator`, `CCO`, and `MarketingLead`.

**Expected:**

- All outputs share the same requirement ID/version, citation, applicability decision, practice IDs, evidence, status, risk, and confidence.
- Coordinator/Composer receives the structured assessment.
- CCO receives knowns, unknowns, business impact, conflict summary if any, and the exact decision required.
- Marketing receives `workflow`, `required_change`, owner, deadline placeholder, acceptance criteria, escalation contact, and optional citation.
- Audience formatting must not alter the underlying finding.

## Acceptance checklist

Run representative scenarios at least three times and confirm:

- [ ] unchanged inputs produce stable applicability and compliance classifications;
- [ ] requirement packs load independently of comparison logic;
- [ ] adding a new pack requires no workflow-code change;
- [ ] applicability always precedes compliance;
- [ ] every result retains regulation ID, requirement/pack version, and citation;
- [ ] every applicable conclusion links to concrete practice IDs and raw evidence;
- [ ] missing jurisdiction or practice evidence returns `unknown` and escalates;
- [ ] multiple requirements produce separate records and surface conflicts;
- [ ] upward and downward messages are distinct but derived from the same assessment;
- [ ] full logs reconstruct input → pack version → applicability → retrieval → checks → decision → outputs;
- [ ] logs contain no personal data and record actual latency and cost; and
- [ ] each run completes within the five-minute MVP target.
