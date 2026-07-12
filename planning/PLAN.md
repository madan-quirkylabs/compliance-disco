# PLAN — Compliance Disco

**This file = the PM / strategy / ownership layer** (phases, scoring strategy, who owns what,
tracking). **Architecture & workflow are the single source of truth in `/AGENTS.md` and
`/WORKFLOW.md`** — this PLAN does not re-describe them. Per-slice task detail lives in each
owner's `TODO.md` under `planning/`.

## The product (one line)
Reads a complex regulation and produces compliance artifacts via a **five-agent pipeline**
(see `/AGENTS.md`): regulatory-reader → coordinator → {marketing, engineering} in parallel
→ consolidator → final report.

Regulation for the build: **India DPDP Act 2023 + Rules 2025** (`docs/regulations/dpdp/`).

## Track & scoring strategy
Locked track: **AI as Agency** (164 base). Strategy, straight from the rubric:
1. **Maximise the root param** — *working product shipping real output* (20x, max 80).
   ⚠️ **Staged / mocked / sandbox surfaces cap this at L3.** Getting real output onto a
   **real surface** (real regulation in → FDO out to a real Slack/email/Notion sign-off
   flow a real org could use) is worth more than any polish elsewhere. **Decide the real
   surface in hour 1.** This is our #1 risk.
2. **Observability is 7x (max 28)** — second-biggest block. Trace tree (who called whom) +
   token/cost per step, from early. Cheap points we should not leave on the table.
3. **Org structure (5x)** — manager that *plans & delegates dynamically* per obligation and
   reviews/bounces specialist output = L4. Static fan-out to all agents = L3.
4. **Stack all five power-ups (+125 flat):** Convex (state/backend), Cloudflare (host),
   Linkup (live reg lookup), ElevenLabs (voice on the FDO?), Wispr (dictate all day). Plan
   into the architecture, don't bolt on.
5. Signups help on **every** track (cross-track bonus) — a real URL where an outsider runs
   a compliance check earns Agency root *and* virality/revenue bonus.

## Phases (8-hour sprint: 11:00 → ~17:00, then demos 17:30)
| Phase | Window | Goal | Owner |
| --- | --- | --- | --- |
| 0 · Setup | pre-10:00 | Hermes green (`hermes status`), `openai-api`/`gpt-5.6-sol` key in `.env`, receipts path | all |
| 1 · Skeleton + real surface | hr 1 | pick real surface; deploy a real URL; wire observability + a signups table | all |
| 2 · Vertical slice | hr 2–4 | one obligation flowing end-to-end: orchestrator → 1 specialist → collator → FDO | all |
| 3 · Fan-out + integration | hr 4–6 | all department specialists in; manager delegates dynamically; lock I/O schemas | all |
| 4 · Proof | hr 6–8 | real runs on real surface; trace/cost visible; eval set; backup run; rehearse demo | all |

## Slices & owners
Agent definitions live in `agents/<name>/`; per-slice tracking lives in `planning/<name>/`.
| Agent (`agents/…`) | Role | Tracking | Owner |
| --- | --- | --- | --- |
| `regulatory-reader` | de-legalese → structured obligations | — | TBD |
| `coordinator` | orchestrate + dispatch (aim for dynamic delegation) | — | TBD |
| `marketing-agent` | marketing compliance artifacts | — | TBD |
| `engineering-agent` | **engineering compliance artifacts** | [`planning/engineering/TODO.md`](engineering/TODO.md) | **(you)** |
| `consolidator` | merge + validate → final report | — | TBD |

## Shared contracts (align early — these are the seams)
Handoffs are filesystem-based via `workspace/shared-data/` (see `/WORKFLOW.md`).
- **Obligation** (reader → agents): `{ obligation_id, text, deadline, severity, affected_depts[] }`
- **Engineering assessment** schema: `planning/engineering/README.md`. Consolidator should
  treat each agent's framework/provision citations as authoritative.
- **Final report** (consolidator): merged outputs + conflicts section + per-clause citations.

## Demo (4 min, live, not recorded)
0:00 context · 0:20 live core loop (one obligation happy path + one edge case) · 2:00 proof
on screen (real FDO on real surface, trace/cost, run log) · 3:00 Q&A — know the weakest number.
