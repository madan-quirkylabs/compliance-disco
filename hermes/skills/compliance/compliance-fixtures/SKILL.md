---
name: compliance-fixtures
description: Locate and load the synthetic Marketing Compliance Agent test scenarios, and post assessment results back to the dashboard
version: 1.0.0
metadata:
  hermes:
    tags: [compliance, testing, fixtures]
    requires_toolsets: [files, web]
---

# Compliance Fixtures

## When to Use

Whenever you are asked to assess a marketing practice against a requirement pack, run a
compliance test scenario, or answer "how are we doing on compliance". Trigger words:
"scenario", "MCA-T", "requirement pack", "assess the workflow", "compliance test".

This skill tells you **where the data is and how to load it**. It does not tell you how to
reason about compliance — that is the `marketing-compliance-assessment` skill, and the
assessment rules live in `docs/specs/marketing-compliance-agent.md`.

## The data

All fixtures live under `docs/tests/` in the `compliance-disco` repo. Everything is
**synthetic**: no real organisation, no real regulation, no personal data.

| File                                     | What it is                                                      |
| ---------------------------------------- | --------------------------------------------------------------- |
| `index.json`                             | The manifest. **Start here.** Lists all 12 scenarios.           |
| `scenarios/*.input.json`                 | One complete, immutable input bundle per scenario.              |
| `company-current-compliance-status.json` | The 9 observed Marketing practice records — the org-side facts. |
| `marketing-compliance-agent.md`          | The test spec: `MCA-T01`–`MCA-T12` and the shared assertions.   |
| `oracles/*.oracle.json`                  | **Do not read these.** See below.                               |

## Procedure

1. Read `docs/tests/index.json`. It lists every scenario with its `test_id`, `input` path,
   `situation`, and `requested_outputs`.
2. Read the one `scenarios/<name>.input.json` you were asked for. It is self-contained:
   `requirement_packs`, `runtime_context`, `practice_records`, `requested_outputs`. You need
   no other file and no outside legal knowledge to assess it.
3. Treat the bundle as **immutable input**. Do not edit it, and do not write results into it.
4. Assess it per `docs/specs/marketing-compliance-agent.md`. Applicability before compliance.
5. Produce exactly the outputs named in `requested_outputs`.

For an open-ended question about the company's current posture (rather than a numbered
scenario), read `company-current-compliance-status.json` — it holds the practice records for
all workflows, and every `practice_id` referenced by any scenario resolves there.

## The oracles are off-limits

`docs/tests/oracles/*.oracle.json` contain the **expected outcome** of each scenario. They
exist so a human or a harness can score your run.

**Never open an oracle file before or while assessing a scenario.** Reading one means you are
no longer being tested — you are copying an answer key, and the run is void. `index.json`
deliberately does not link to them. If you find yourself about to read one, stop: the answer
you want is derivable from the input bundle alone, which is the entire point.

## Pitfalls

- **Missing evidence is not non-compliance.** An empty `consent_evidence` means you cannot
  see the control, not that it is absent. That is `unknown`, and it escalates.
- **Missing evidence is not compliance either.** Never resolve an evidence gap in the
  company's favour.
- **Check applicability first**, every time — jurisdiction, entity type, channel, and
  `effective_from` vs `assessment_date`. A requirement that does not apply gets no compliance
  verdict, however well- or badly-controlled the practice looks.
- **Preserve citations verbatim.** `source_citation` values are synthetic identifiers. Never
  resolve, correct, or "improve" them against real law, and never invent one.
- **Some bundles are deliberately broken.** A malformed pack is a validation failure to report,
  not a puzzle to fix or route around.
- **Never mutate a production system**, send an outbound message, or approve anything. You
  assess and recommend; a human decides.

## Verification

Before you hand back a result, confirm you have: an applicability decision recorded before the
compliance status; a status drawn only from `compliant` / `partial` / `non_compliant` /
`unknown` / `not_applicable`; a numeric confidence, escalating below `0.80`; the
`regulation_id`, pack version, and `source_citation` preserved; and at least one named
`practice_id` with the raw evidence quoted.

To check the fixture corpus itself is intact: `bun scripts/validate-fixtures.mjs`.

## Posting results to the dashboard (optional)

Completed runs can be written to the Compliance Disco dashboard. This is the **only** write
surface, it is machine-to-machine, and it is idempotent on `run.id` — re-posting the same run
replaces it rather than duplicating, and never touches a human's sign-off.

```bash
curl -X POST "$CONVEX_SITE_URL/hermes/ingest" \
  -H "Authorization: Bearer $HERMES_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"run": {...AgentRun}, "items": [...ComplianceItem], "practices": [...PracticeRecord]}'
```

Payload shapes are defined in `convex/validators.ts`; the route is `convex/http.ts`. Do not
post an assessment of a scenario whose oracle you have read.
