# Hermes Buildathon (Bangalore) — Agent context

Single-file context for an agent helping build and win the GrowthX × Hermes buildathon,
Bangalore edition. Distilled from `builder-handbook.md` and `scoring-rubric.md` (both in
this folder). Everything here is the **Bangalore** variant: no Dodo Payments, five
power-up partners (+125 max), $300+ base perks.

## The day

- **10:00** kickoff (rules, Hermes walkthrough, lock track + idea) → **11:00** 8-hour
build sprint (spend the back half collecting proof) → **17:30** live demos.
- Do Hermes setup before 10:00. Track is **locked at registration** — no switching.
- Build on-site only: no remote teammates, no code shipped in from outside. Mentors
watch builds all day.

## Hard rules (violate any = zero or DQ)

1. **Hermes is mandatory** — the only eligibility rule. Qualify by either path (both allowed):
    - **Coding partner:** Hermes built the product. Keep *session receipts* — real session
    history with prompts, timestamps, commits authored mid-session that a mentor can glance at.
    - **Base harness:** the product runs on Hermes with ≥1 capability doing real work
    (memory, cron, Telegram gateway, etc.) and end users interact with it.
2. **Fresh builds only.** OK: from zero; substantially-extended boilerplate; a
never-built idea; standard scaffolding (Next.js, Vite, FastAPI); BaaS wiring
(Supabase, Firebase, Convex, Clerk); LLM SDKs; **helper utilities**. Not OK: an
existing product with cosmetic changes, a superficially-reworked fork, your company’s
product, anything demoed elsewhere. **Borderline? Flag it to a mentor early — honest
flags almost always survive; hiding origin = automatic disqualification.**
3. **Submit in the window** (opens after the sprint ends). Late = not considered, no exceptions.
4. **Numbers are verified, not trusted:** read-only analytics access, live DB spot
checks, signup emails bounce-tested, customers called. A spoofed number zeroes the
parameter; refusing verification zeroes the parameter. Signups landing after the
verification check score nothing.
5. Other AI assistants and your own LLM keys are allowed as long as the Hermes rule holds.

## Scoring math

- Every parameter scored L1–L5. **Points = (L − 1) × weight.** L1 always = 0.
- **Flagged (root) parameters overflow past L5, uncapped** — verified evidence keeps paying.
- Model/provider choice is never scored.
- Only what is verifiable at judging time counts.

### Where the points live

The root parameter dominates every track. The Virality L4 signup band alone outscores
maxing every other Virality parameter combined. Strategy in one line: **maximize the
root parameter, install verification plumbing early, stack all five power-ups.**

## Track rubrics

### Virality — 164 base points

| Parameter | Weight | Max | L2 | L3 | L4 | L5 | Overflow |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Signups / meaningful actions** (root) | **25x** | 100 | 6–25 | 26–100 | 101–250 | 251–1,000 | +25/50 past 1k |
| Visitors to product | 10x | 40 | 11–50 | 51–250 | 251–1k | 1,000+ | +10/100 past 1k |
| Amplification quality | 3x | 12 | 1–2 peer builders | 3+ peers or sub-10k founder | one 10k+ notable reshare | multiple notables / PH / press / investor | — |
| Reactions + comments | 2x | 8 | 3–10 | 11–25 | 26–50 | 51–100 | +2/10 past 100 |
| Impressions / views | 1x | 4 | 101–1k | 1k–2.5k | 2.5k–5k | 5k–7.5k | +1/1k past 7.5k |
- Ad-driven impressions/engagement count at **25%**. All platforms aggregated.
- **Visitors capped at L2 unless mentors get read-only analytics access** (Datafast
recommended; PostHog, Plausible, GA4 fine). Install analytics in hour one.
- **Anti-spoof ceilings** — the funnel must tell one coherent story:
visitors > 10% of weighted impressions → visitors drops to L1 (unless a verifiable
non-social source is proven); signups > 50% of visitors → signups drops to L1 (unless
verifiable direct-share source). Team members and anonymous visits never count as signups.

### Revenue — 208 base points (highest cap). 100% live product, no decks.

| Parameter | Weight | Max | L2 | L3 | L4 | L5 | Overflow |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Signups** (root: email + first-use event) | **20x** | 80 | 1–25 | 26–100 | 101–250 | 251+ | +20/50 past 250 |
| Revenue generated (USD) | 12x | 48 | ≤$25 | $25–100 | $100–500 | $500+ | +12/$100 past $500 |
| Live product quality | 8x | 32 | rough MVP, happy path only | cold user reaches value unassisted | polished, beats alternatives | can’t tell it was built in 8h | — |
| Waitlist (email only, hasn’t touched product) | 4x | 16 | 1–50 | 51–250 | 251–1k | 1,000+ | +4/250 past 1k |
| Business impact (money math shown) | 4x | 16 | <5% metric movement | 5–10%, math shown | 10–30%, baseline named | 30%+ on a top metric | — |
| Right to win | 2x | 8 | generic interest | some domain exposure | operator experience + insight | advantage visible in the build itself | — |
| Why now | 1x | 4 | riding trends | tailwind <2 yrs | specific unlock <12 mo | window <6 mo, visible in product | — |
| Moat | 1x | 4 | thin first-mover | workflow lock-in / integrations / taste | live data flywheel | compounding moats | — |
- **Revenue test:** “if you removed the product tomorrow, does the revenue disappear?”
Services/consulting, manual human-in-the-loop work, teammate/friend payments, and
pledges without transactions = $0. Live-mode dashboard checked; payer emails matched
against signups and the team roster. Any processor counts (Razorpay/Stripe — no Dodo
in Bangalore).
- A signup = email **plus** a first-use event (account created, output generated, core
flow run). Waitlist and signups are deduped — nobody counts twice.
- Product quality is tested by the mentor on **their own device**, cold, no narration.

### AI as Agency — 164 base points

| Parameter | Weight | Max | Key thresholds |
| --- | --- | --- | --- |
| **Working product shipping real output** (root) | **20x** | 80 | **Staged/sandbox/mocked surfaces = L3 ceiling.** L4 = real surfaces, human approves each step, 70–85% success. L5 = end-to-end on real live surfaces, 85%+ success across 3+ repeated runs, escalates by exception only. Overflow: +20 per real task completed autonomously **during judging**. |
| Observability (tool-agnostic) | 7x | 28 | L3 = pull up any past run, step through each agent’s actions. L4 = trace tree (who called whom) + token/cost per step + filtering. L5 = diff two runs side by side, alerts on failure/cost spike, cross-run search. |
| Agent org structure | 5x | 20 | L3 = manager + named specialists, static routing. L4 = manager plans subtasks per request, delegates, reviews/bounces outputs. L5 = spawns new specialists on the fly; stuck agents escalate with concrete blockers. |
| Evaluation & iteration | 5x | 20 | L3 = named eval set, run manually across versions. L4 = CI-style pipeline that blocks a release. L5 = closed loop — failures auto-become eval cases, version-controlled prompts, rising pass rate. |
| Handoffs & memory | 2x | 8 | L5 = three layers survive all handoffs: current task + this user’s history + business rules/policy. |
| Cost & latency per task | 1x | 4 | **Worse of the two governs.** L5 = under 1 min AND under $0.10. L4 = 1–5 min or $0.10–0.50. |
| Management UI | 1x | 4 | L5 tested live: a non-eng volunteer (not chosen by you) creates a new agent role — job, tools, guardrails — unassisted in <10 min and it works. |
- “Real surface” = a system a paying customer could use tomorrow (real Gmail, real repo,
real support queue). Staged WordPress / sandbox Gmail / dummy ATS / Airtable / Notion /
Sheets all cap the 20x root at L3. Getting on a real surface is worth more than any
amount of polish elsewhere.

## Power-ups — flat +25 each, all five = +125

Cheapest large point block in the event. A mentor must see **real use**, same for all tracks:

| Partner | Counts when | Evidence |
| --- | --- | --- |
| Wispr Flow | 500+ words dictated during the event | Wispr stats screenshot |
| ElevenLabs | Voice doing real work in the product (not a dead snippet) | Live demo |
| Convex | Stores real product state / is the main backend | Repo + Convex dashboard |
| Linkup | Live search doing real work in the product | Code + live query |
| Cloudflare | Hosting/Workers/any CF product doing real work | Live URL + CF dashboard |

## Cross-track bonus

Wins outside your locked track pay at **half weight, capped at 50 total per team**, same
proof bar. No double-pay on parameters your own track already scores. Bonusable:
Virality signups 12.5x (max 50), visitors 5x (20), reactions 1x (4); Revenue signups 10x
(40), product quality 4x (16), revenue 6x (24); Agency real-output 10x (40),
observability 3.5x (14). Practical upshot: **signups help on every track.**

## Ship & submit

Exactly two requirements:
1. Build live at a **real URL usable by anyone from their own device** (web app, landing
page, or bot link). If a judge can’t use it themselves, it doesn’t count. No slides,
no zips, no Looms.
2. Submit that URL through the day-of submission link **before the deadline**.

Any idea qualifies (not just the 93-idea library) as long as it fits your track and is
built today.

## Demo — 4 minutes, live on stage, not recorded

- **0:00–0:20** context: who it’s for + what it replaces, one sentence.
- **0:20–2:00** live demo: core loop end to end — one happy path + one edge case.
- **2:00–3:00** proof: numbers **on screen** (signup dashboard, payment dashboard, or run
log). “If it isn’t on screen, it doesn’t count.”
- **3:00–4:00** Q&A: judges probe your **weakest** number — know it cold.

Pre-stage: log into product, DB, and analytics before your slot; record a backup run;
rehearse the full 4 minutes twice; if cutting, cut words — never the demo or proof
minute. If it breaks live: narrate intended behavior, recover or play the backup;
numbers get verified either way.

## Hermes setup

- Install: `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash`
- Keys in `~/.hermes/.env` (`OPENAI_API_KEY=sk-...`, no trailing spaces). Config in
`~/.hermes/config.yaml`: `model: { provider: "openai-api", default: "gpt-5.6-sol" }`.
- **Gotchas:** provider id is `openai-api` (NOT `openai`); model id is `gpt-5.6-sol`.
- `hermes model` re-runs the picker/login; `hermes status` verifies; auth failure → re-run `hermes model`.
- Project file precedence: `.hermes.md` → `AGENTS.md` → `CLAUDE.md` — **only the first
found is loaded** (an AGENTS.md silently shadows CLAUDE.md). Keep one file.
- Global behavior lives in `~/.hermes/SOUL.md`; facts in `~/.hermes/memories/MEMORY.md`
(~2,200-char cap). Commands become skills under `~/.hermes/skills/`; reuse Claude
skills via `skills: external_dirs: [~/.claude/skills]` in config.yaml. MCP servers go
in an `mcp_servers:` block (restart or `/reload-mcp` after changes).
- Telegram gateway: BotFather `/newbot` → token; user ID from @userinfobot;
`hermes gateway setup` then keep `hermes gateway` running. Env fallback:
`TELEGRAM_BOT_TOKEN=`, `TELEGRAM_ALLOWED_USERS=`. Group messages missing → BotFather
`/setprivacy` or make the bot admin, then re-add it.
- Ollama fallback needs `num_ctx ≥ 65536` (Hermes needs 64K context).

## Prizes (why this matters)

1st: $10k+/team (incl. $5k OpenAI, $3k Cloudflare, 1 yr GrowthX). 2nd: $5.8k+.
3rd: $3k+. India winners also get a Hissa equity consult per member. Every accepted
builder: $300+ in perks — the OpenAI $200 + Codex Pro perk requires the org ID given
**at registration** and cannot be issued later. Judges’ decisions are final.

## Build-day checklist (derived, in priority order)

1. Before 10:00 — Hermes installed, `hermes status` green, receipts path decided.
2. Hour 1 — deploy a skeleton to the real URL; wire analytics with read-only access
(Virality visitors cap at L2 without it); create signup table with timestamps.
3. Design the funnel so ratios hold: impressions → ≤10% visitors → ≤50% signups.
4. Plan all five power-ups into the architecture (Convex backend, Cloudflare hosting,
Linkup search, ElevenLabs voice doing real work, dictate with Wispr all day).
5. Agency track only: get on a **real** surface early — staged caps the 20x root at L3.
6. Back half of the sprint = proof collection, not features.
7. Keep Hermes session receipts obvious and demoable.
8. Rehearse the 4-minute demo twice; pre-login to every dashboard; record a backup run.

## Deeper references in this folder

- `scoring-rubric.md` — full L1–L5 definitions with mentor-verification examples per level.