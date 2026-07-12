# PLAN — Compliance Disco

High-level build plan for the team. **This file = the "what & why" and phase sequencing.**
Per-slice execution detail lives in each owner's `TODO.md` (linked below). Don't duplicate
task detail here.

## The product (one line)
How an organisation complies with a complex regulation: a **multi-agent fan-out** — CCO
de-legalese → department specialists (marketing / finance / **engineering** / legal / …)
→ collator → **FDO** (Final Determination of Obligations) → circulate for feedback & sign-off.

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
| Slice | Path | Owner |
| --- | --- | --- |
| Orchestrator / CCO (de-legalese + dynamic delegation) | `agents/orchestrator/` | TBD |
| **Engineering specialist** | [`agents/eng-compliance/TODO.md`](agents/eng-compliance/TODO.md) | **(you)** |
| Marketing specialist | `agents/marketing/` | TBD |
| Finance specialist | `agents/finance/` | TBD |
| Legal specialist | `agents/legal/` | TBD |
| Collator → FDO + sign-off flow | `agents/collator/` | TBD |
| Frontend / real URL / observability | `app/` | TBD |

## Shared contracts (align in Phase 2 — these are the seams)
- **Obligation** (orchestrator → specialists):
  `{ obligation_id, text, deadline, severity, affected_depts[] }`
- **Assessment** (specialist → collator): per-slice schema; engineering's is in its README.
  Collator must treat each specialist's framework/provision citations as authoritative.
- **FDO** (collator output): merged assessments + conflicts section + per-clause citations
  + sign-off tracker.

## Demo (4 min, live, not recorded)
0:00 context · 0:20 live core loop (one obligation happy path + one edge case) · 2:00 proof
on screen (real FDO on real surface, trace/cost, run log) · 3:00 Q&A — know the weakest number.
