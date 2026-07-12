# Engineering Compliance Slice — Execution Tracker

> High-level plan (what this is, contract, architecture) lives in `README.md`.
> This file tracks **what's left to do**. Two docs, no third.

Owner: engineering perspective in the DPDP compliance fan-out.
Track: **AI as Agency**. My agent = a named specialist in the org-structure parameter.

## ✅ Done
- [x] Hermes skill built + registered (`eng-compliance-assessment`, DPDP-targeted)
- [x] Grounding self-contained in the skill (`references/system-inventory.md`) so a team
      root `AGENTS.md`/`.hermes.md` can't shadow it
- [x] Control catalog mapped to DPDP Act 2023 + Rules 2025 (`references/controls.md`)
- [x] Input/output contract defined (`README.md`)
- [x] Verified mechanism works; fixed input-echo with the "don't parrot" prompt pattern

## 🔜 Now (my slice — no dependencies)
- [ ] Replace mock `system-inventory.md` with our real/target architecture (biggest quality lever)
- [ ] Run the DPDP sample end-to-end; sanity-check grounding + `dpdp_provision` accuracy
- [ ] Add 3–4 more DPDP sample obligations (erasure, breach notice, consent withdrawal,
      children's data) as a mini eval set
- [ ] Wire hosted model `gpt-5.6-sol` (provider `openai-api`, key in `~/.hermes/.env`) —
      faster + drops the "don't parrot" hand-holding vs local qwen
- [ ] Use one persistent `hermes chat` session for the demo (boot cost ~55s is paid once)

## 🔗 Integration (needs teammates — align early)
- [ ] Lock **input** schema with orchestrator (de-legalese output = my input)
- [ ] Lock **output** schema with collator (my output = FDO input)
- [ ] Manager should **plan + delegate dynamically** (call eng only when relevant) → L4 org structure
- [ ] Collator treats my `dpdp_provision` + `control_framework_mapping` as **authoritative rules**
      (the "what the business allows" memory layer → handoffs/memory points)

## 🎯 Demo / proof (rubric points)
- [ ] Observability: be able to pull up a past run and step through it (Agency L3+)
- [ ] Cost & latency per task readable (target <5 min / <$0.50)
- [ ] Record a backup run before the demo slot

## Open questions
- Real system inventory: do we have one, or invent a plausible target architecture?
- Which DPDP obligations does the demo showcase? (pick 2–3 with clear engineering impact)
