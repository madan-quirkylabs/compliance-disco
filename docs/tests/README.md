# Hermes-reviewable compliance test packages

Synthetic test data for the Marketing Compliance Agent. No real organisation, no real
regulation, no personal data. Twelve scenarios covering `MCA-T01`–`MCA-T12` in
[`marketing-compliance-agent.md`](marketing-compliance-agent.md), which is the source of truth
for what each one asserts.

Each `scenarios/*.input.json` is a complete, immutable input bundle for one agent run. Hand the
whole object to Hermes and ask for an assessment: it needs no external facts and no legal
interpretation to answer.

## Layout

```
docs/tests/
├── index.json                             ← the manifest. Agents start here.
├── company-current-compliance-status.json ← the 9 observed practice records
├── marketing-compliance-agent.md          ← the test spec (MCA-T01 … MCA-T12)
├── scenarios/*.input.json                 ← what the agent reads
└── oracles/*.oracle.json                  ← what the evaluator reads. NOT the agent.
```

**Inputs and oracles are separate files, and that separation is load-bearing.** The expected
outcome of a scenario never sits in the file the agent opens, so an agent that reads its input
bundle cannot accidentally read the answer. `index.json` does not link to the oracles either.
Keep it that way: the moment an `expected_outcome` lands back in a `*.input.json`, the scenario
stops testing anything. `bun scripts/validate-fixtures.mjs` fails the build if one does.

## Input bundle shape

```text
{
  scenario_id,
  title,
  requirement_packs: [RequirementPack],   // 2 packs in MCA-T09 and MCA-T10
  runtime_context: RuntimeContext,
  practice_records: [PracticeRecord],
  requested_outputs
}
```

Field names are the wire format in [`docs/vocabulary.md`](../vocabulary.md); behavior is
specified in [`docs/specs/marketing-compliance-agent.md`](../specs/marketing-compliance-agent.md).

## Coverage

| Test      | Situation                                                    | Probes                                   |
| --------- | ------------------------------------------------------------ | ---------------------------------------- |
| `MCA-T01` | EU email, consent pack, complete evidence                    | The evidence-backed positive path        |
| `MCA-T02` | US email, no unsubscribe configured                          | A demonstrated mandatory-control failure |
| `MCA-T03` | Region-B SMS, Region-A pack                                  | Jurisdiction applicability rejection     |
| `MCA-T04` | EU email, requirement effective 2027-01-01                   | Temporal applicability rejection         |
| `MCA-T05` | Web tracking, audience location not supplied                 | Unknown applicability — no inferring     |
| `MCA-T06` | EU SMS, empty evidence fields, 2-year-old verification       | Unknown compliance — absent ≠ failed     |
| `MCA-T07` | Quantified claim, substantiation present, no approval record | An internal policy pack                  |
| `MCA-T08` | Landing page, 2 of 3 supplied checks pass                    | Partial — and no invented criteria       |
| `MCA-T09` | Retain 24 months vs delete after 12 months                   | Conflict preservation                    |
| `MCA-T10` | Opt-out at 8 days vs 10-day and 5-day windows                | Strictest compatible control             |
| `MCA-T11` | Pack says `REG-B`, its requirement says `REG-A`              | Input validation before analysis         |
| `MCA-T12` | One high-risk finding, three audiences                       | Output consistency                       |

Three pairs are designed to be confused with each other, and the interesting failures live in
the gaps between them:

- **T02 vs T06** — a control proven absent (`non_compliant`) against a control merely
  unevidenced (`unknown`). Collapsing these is the classic error.
- **T03 vs T05** — a jurisdiction that provably does not match (`not_applicable`) against a
  jurisdiction that is simply unknown (`unknown`). Absent evidence of applicability is not
  evidence of non-applicability.
- **T09 vs T10** — two requirements that cannot both be satisfied (conflict, escalate) against
  two that can (adopt the stricter one). Only one of them has a "strictest compatible control".

## Review protocol

1. Start a clean `marketingcompliance` session and load the assessment instructions.
2. Give the agent one `scenarios/*.input.json` as its immutable input. It contains no answers.
3. Ask for the upward assessment, the CCO escalation where required, and the Marketing
   instruction — per that bundle's `requested_outputs`.
4. Score the output against `oracles/<same-name>.oracle.json`, plus the shared assertions in
   `marketing-compliance-agent.md`. The oracle's `notes` field says what the scenario is really
   hunting for.
5. Repeat each scenario three times. Save only synthetic receipts, latency, and cost.

`MCA-T12` is the exception: run it three times, once per audience, per the `run_instructions` in
its bundle, then diff the three outputs.

The agent must decide applicability before compliance; quote raw practice evidence; preserve
citations and pack versions; keep requirement, observed practice, and recommendation distinct;
and never call missing or stale evidence compliant.

## For the agent

`hermes/skills/compliance/compliance-fixtures/SKILL.md` is the Hermes access skill, and the root
`AGENTS.md` points here automatically. See [`hermes/README.md`](../../hermes/README.md) for
installation — including the Docker-backend case, where the repo must be mounted into the
container or the agent simply cannot see any of this.
