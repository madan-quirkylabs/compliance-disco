# PLAN — Engineering Agent

Engineering is the team's **primary working area**. This file owns the *strategy & milestones*
for building the engineering-agent into a demo-winning, regulation-agnostic component.

Doc map: **this = strategy/milestones** · `TODO.md` = execution checkboxes ·
`README.md` = reference / I/O contract / run · `../PLAN.md` = team/product plan.

## Goal
A **regulation-agnostic** engineering-compliance agent that, given any extracted regulation +
the org's system inventory, produces grounded, auditable technical artifacts
(data classification, control architecture, impact-assessment template, implementation guide)
— each citing the **source provision + a control-framework ID** and naming **real systems**.
DPDP is the test flow, not the scope.

## Why it matters (AI-as-Agency rubric)
- It's the "engineering specialist" in the **agent org-structure** parameter.
- Its grounded, real-system output is what lifts the **root param** (working product shipping
  real output) above generic-template territory.
- Provision + framework citations = the auditable **policy/rules** layer.

## Definition of done
- [ ] Runs end-to-end from `extracted-regulations/` → 4 grounded artifacts, unattended.
- [ ] Every claim cites source provision + framework ID + a real system from the inventory.
- [ ] Works on a **second** regulation with zero code change (proves generic).
- [ ] Observable — can pull up a past run and step through it.
- [ ] Cost & latency per run are readable.

## Milestones (sequenced)
| # | Milestone | Why it's here |
|---|-----------|---------------|
| **M0** | **Runs** — `setup.sh` profile + API key; DPDP test extraction → 4 files land in `engineering-output/` | unblocks everything |
| **M1** | **Grounded & real** — swap mock `system-inventory.md` for the real/target stack; output names real systems + cites provisions/frameworks | #1 quality lever |
| **M2** | **Prove generic** — push a *second* regulation (short GDPR/HIPAA/PCI extract) through unchanged; artifacts adapt | the headline "it's generic" demo moment |
| **M3** | **Quality / eval** — small eval set (3–4 obligations → expected controls); tighten the skill | catch regressions |
| **M4** | **Demo-ready** — observability (replay a run), cost/latency numbers, backup run recorded | rubric proof |

## Priorities & levers
1. **Real system-inventory grounding** — generic templates lose; org-specific output wins.
2. **The second-regulation run (M2)** — the differentiator vs single-reg tools; cheap, high-impact.
3. **Integration seams** — nail the `extracted-regulations/` shape + handoff file formats early.

## Risks
- **Reader output shape mismatch** → engineering can't parse it. → agree the
  `extracted-regulations/` schema with the reader owner early.
- **Generic-ness unproven** if only ever tested on DPDP. → M2 is the mitigation.
- **Pipeline still DPDP-flavoured elsewhere** (consolidator report title, `AGENTS.md`) could
  undercut the "generic" story in the *final* report. → team decision, tracked separately.
