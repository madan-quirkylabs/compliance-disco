# Engineering Agent — Execution Tracker

> Doc map: `PLAN.md` = strategy/milestones · **this = execution checkboxes** ·
> `README.md` = reference / I/O contract. Canonical agent code lives in
> `agents/engineering-agent/` (Hermes runtime); this `planning/` folder is scratch/PM.

Owner: engineering agent in the DPDP pipeline (parallel worker, see `/AGENTS.md`).
Track: **AI as Agency** — a named specialist in the org-structure parameter.

## ✅ Done
- [x] DPDP control catalog (`controls.md`) — DPDP provisions ↔ ISO/SOC2
- [x] System-inventory grounding (`system-inventory.md`) — mock stack + known gaps
- [x] Adopted the team's Hermes-compliant structure: folded our grounding into
      `agents/engineering-agent/skills/build-compliance-artifacts/references/`
- [x] Wired grounding into the skill (cite DPDP + framework, name real systems)
- [x] Retired the scratch top-level `skills/` + `external_dirs` approach

## 🔜 Now (my slice)
- [ ] Replace mock `system-inventory.md` with our real/target architecture (biggest quality lever)
- [ ] `./setup.sh` → run engineering-agent end-to-end; confirm the 4 artifacts are
      grounded in real systems (not generic templates)
- [ ] Put API key in `agents/engineering-agent/.hermes/.env`
- [ ] Sanity-check every artifact cites a DPDP section + framework ID

## 🔗 Integration (with teammates)
- [ ] Confirm the reader's `extracted-regulations/` shape matches what my skill reads
- [ ] Confirm handoff files (`coord-to-engineering.md`, `engineering-to-consolidator.md`) format
- [ ] Consolidator should treat my DPDP/framework citations as authoritative

## 🎯 Demo / proof (rubric points)
- [ ] Observability: be able to pull up a past run and step through it (Agency L3+)
- [ ] Cost & latency per task readable
- [ ] Record a backup run before the demo slot

## Open questions
- Real system inventory: do we have one, or invent a plausible target architecture?
- Which DPDP obligations does the demo showcase? (pick 2–3 with clear engineering impact)
