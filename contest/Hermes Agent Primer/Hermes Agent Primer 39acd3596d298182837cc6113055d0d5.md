# Hermes Agent Primer

> Written July 2026 against Hermes Agent v0.14.x. Everything here is sourced from the [official docs](https://hermes-agent.nousresearch.com/docs/). Hermes ships fast — verify anything load-bearing against the live docs before you build on it.
> 

## 0. Read this first: two things are called "Hermes"

They are related but different, and conflating them will waste your time.

|  | **Hermes 4 / 4.3** | **Hermes Agent** |
| --- | --- | --- |
| What it is | A family of open-weight LLMs (14B / 70B / 405B, plus 4.3-36B) | An open-source agent runtime (MIT), released Feb 2026 |
| Analogous to | Llama, Qwen, Claude — *the brain* | Claude Code, Codex CLI, OpenClaw — *the body* |
| Do you need it? | No. Hermes Agent is model-agnostic. | **Yes — this is the thing you want.** |
| Link | [hermes4.nousresearch.com](https://hermes4.nousresearch.com/) · [arXiv](https://arxiv.org/abs/2508.18255) | [GitHub](https://github.com/NousResearch/hermes-agent) · [Docs](https://hermes-agent.nousresearch.com/docs/) |

For an always-on agent you want **Hermes Agent** running **Claude Sonnet/Opus** (or whatever you already pay for). The Nous models are optional. Everything below is about the agent.

---

## 1. The one-paragraph version

Hermes Agent is a long-running Python process that wraps any LLM in a persistent shell: it has a **memory** that survives sessions, a **skills** directory it can write to itself, a **cron scheduler** that spawns fresh agent sessions on a timer, a **gateway** that speaks 20+ messaging platforms from one process, and a **terminal backend** that decides where its shell commands actually execute (your laptop, a Docker container, a VPS over SSH, or a serverless sandbox that hibernates when idle). Claude Code is a session you start. Hermes is a daemon you install.

That's the whole pitch. The differentiated capability versus your existing stack is **unattended execution with continuity** — cron + memory + a delivery surface. Everything else it does, Claude Code already does.

---

## 2. Block diagram: the system

```
┌──────────────── ENTRY POINTS ───────────────────────────────┐
│  CLI/TUI     Gateway (Telegram/Slack/…)     Cron    ACP/IDE │
│  hermes      hermes gateway                 tick    API srv │
└───────┬──────────────┬──────────────────────┬───────────────┘
        │              │                      │
        └──────────────┴──────────┬───────────┘
                                  ▼
            ┌─────────────────────────────────────────┐
            │        AIAgent  (run_agent.py)          │
            │  the single conversation loop, shared   │
            │  by every entry point above             │
            │                                         │
            │  Prompt Builder → Provider Resolver →   │
            │  Tool Dispatch → Compression → Persist  │
            └───┬──────────────────────────────┬──────┘
                │                              │
     ┌──────────▼─────────┐      ┌─────────────▼────────────┐
     │  STATE             │      │  TOOL BACKENDS           │
     │  SQLite + FTS5     │      │  Terminal (6 backends)   │
     │  ~/.hermes/state.db│      │  Browser · Web · Files   │
     │  MEMORY.md USER.md │      │  MCP servers (dynamic)   │
     │  skills/  cron/    │      │  70+ tools / 28 toolsets │
     └────────────────────┘      └──────────────────────────┘
```

The important structural fact: **one `AIAgent` class serves every surface.** A cron job, a Slack message, and your terminal all run the same loop with the same tools. Platform differences live at the edge, not in the core. That means whatever you teach it in the CLI, the cron job inherits.

Source: [Architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture)

---

## 3. The five subsystems that actually matter

### 3.1 Memory — small, bounded, always in context

Two markdown files, hard character caps, injected into the system prompt at session start:

| File | Purpose | Cap |
| --- | --- | --- |
| `MEMORY.md` | Agent's notes: environment facts, conventions, lessons | 2,200 chars (~800 tok) |
| `USER.md` | Who you are: preferences, comms style, pet peeves | 1,375 chars (~500 tok) |

The caps are the design. Memory does **not** auto-compact — when a write would overflow, the tool returns an error and the agent has to consolidate or delete something in the same turn. This forces information density instead of a growing junk drawer.

Good entry (packs facts, actionable):

```
Justin runs Masonry Studio (solo fractional CMO, pre-seed→Series A deep tech).
Stack: Notion (state), Linear, Slack, Fathom. Prefers markdown > Word, tables
for any comparison. Wants pushback, not agreement.
```

Bad entry:

```
On July 12 2026 the user asked me about Hermes and mentioned that he runs a
consulting practice which is called Masonry Studio and works with...
```

**Frozen snapshot pattern:** memory is read into the system prompt once at session start and never mutates mid-session — this preserves the prompt cache. Writes hit disk immediately but only appear in context next session.

Beyond the two files: **`session_search`** does FTS5 full-text search across every past session in `~/.hermes/state.db`. Free, no LLM call, ~20ms. That's the "did we discuss X three weeks ago" surface. Memory is for facts that must *always* be in context; session search is for retrieval on demand.

→ [Memory docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)

### 3.2 Skills — procedural memory, progressively disclosed

A skill is a `SKILL.md` in `~/.hermes/skills/<category>/<name>/`. It's the [agentskills.io](https://agentskills.io/specification) open standard — the same format Claude Code uses, so your existing skills port over.

```
Level 0: skills_list()          → name + description only   (~3k tokens, always loaded)
Level 1: skill_view(name)       → full SKILL.md             (loaded on demand)
Level 2: skill_view(name, path) → a reference file          (loaded on demand)
```

That three-level ladder is why you can have 90 skills installed without bloating every request. Only the one-line descriptions are always in context.

Minimal skill:

```markdown
---
name: client-brief
description: Pull a client's Notion + Fathom context into a pre-call brief
version: 1.0.0
metadata:
  hermes:
    tags: [consulting, prep]
    requires_toolsets: [web]
---

# Client Brief

## When to Use
Before any external call. Trigger words: "prep me for", "brief on".

## Procedure
1. Search Notion for the client's page under Clients/.
2. Pull the last 3 Fathom transcripts for anyone at that company.
3. Web-search for news in the last 30 days.
4. Write: what changed, open threads, 3 questions to ask.

## Pitfalls
- Fathom titles are inconsistent — search by attendee, not meeting name.

## Verification
Brief must name at least one thing that changed since the last call.
```

**The self-improvement loop:** after a turn, a background review runs. If the agent solved something non-trivial (5+ tool calls), hit a dead end and found the path, or got corrected by you, it can write a new skill or patch an existing one via `skill_manage`. The **Curator** (`hermes curator`) then runs periodically to consolidate overlapping skills, archive stale ones, and write reports.

This is the "self-improving" claim, demystified: *it writes markdown files to a folder that gets loaded into future prompts.* No weights change. Which is good — it means you can read, edit, and version-control everything it learns.

**Gate it.** By default the agent writes skills and memories freely. For an unattended agent, you want to see what it's teaching itself:

```yaml
skills:
  write_approval: true    # stage every skill write for review
memory:
  write_approval: true    # stage every memory write
```

Then `/skills pending` → `/skills diff <id>` → `/skills approve <id>`.

→ [Skills docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) · [Creating skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills) · [Curator](https://hermes-agent.nousresearch.com/docs/user-guide/features/curator)

### 3.3 Cron — the actual always-on primitive

This is the reason to run Hermes at all. Everything else is table stakes.

```
Gateway daemon ticks every 60s
   │
   ├─ read ~/.hermes/cron/jobs.json
   ├─ any job where next_run_at <= now?
   │      │
   │      ├─ (optional) pre-check script ──► {"wakeAgent": false} ──► skip, $0
   │      │
   │      ├─ spawn a FRESH AIAgent  (no history — prompt must be self-contained)
   │      ├─ inject attached skills
   │      ├─ inject context_from  (previous job's output)  ← chaining
   │      ├─ run prompt to completion
   │      ├─ deliver final response → telegram | slack | local | all
   │      └─ write output to ~/.hermes/cron/output/<job_id>/<ts>.md
   │
   └─ update next_run_at
```

Four features here are the whole game:

**1. Skill-backed jobs.** Attach reusable procedures instead of stuffing everything into the prompt.

```bash
hermes cron create "0 8 * * 1-5" \
  "Run the morning brief for all active clients." \
  --skill client-brief --skill masonry-house-style \
  --deliver slack --name morning-brief
```

**2. `wakeAgent` gates — the cost control that matters.** A cheap pre-run script decides whether to spend any tokens at all. Poll every 5 minutes for $0; wake the LLM only when state changed.

```python
# ~/.hermes/scripts/new-fathom.py
import json
n = count_new_transcripts_since_last_run()
if n == 0:
    print(json.dumps({"wakeAgent": False}))   # silent tick, zero cost
else:
    print(json.dumps({"wakeAgent": True, "context": {"new": n}}))
```

**3. `context_from` — chain jobs into pipelines.** Job B receives Job A's most recent output prepended to its prompt.

```
07:00  collect   → raw.md          (web + Fathom + Linear)
07:30  triage    → ranked.md       context_from=collect
08:00  ship      → Slack brief     context_from=triage
```

**4. `[SILENT]` suppression.** If the response contains `[SILENT]`, delivery is suppressed (output still logged). This is how you build monitors that only speak when something is wrong. Failed jobs always deliver regardless.

**Two sharp edges:**

- Cron sessions run with **no history**. The prompt must be fully self-contained. `"Check on that server issue"` fails; `"SSH to 10.0.1.50 as deploy, run systemctl status nginx, verify https://x.com returns 200"` works.
- Jobs **snapshot** their provider/model at creation. If you later change the global default with `hermes model`, unpinned jobs **fail closed** rather than silently spending on a new model. Pin explicitly for anything important.

→ [Cron docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron) · [Automation patterns](https://hermes-agent.nousresearch.com/docs/guides/automate-with-cron) · [Daily briefing bot tutorial](https://hermes-agent.nousresearch.com/docs/guides/daily-briefing-bot)

### 3.4 Terminal backends — where the agent's hands are

Six options. This single config key determines your entire deployment posture.

| Backend | Runs where | Isolation | Use it for |
| --- | --- | --- | --- |
| `local` | Your machine | **None** — full access as your user | Dev only |
| `docker` | One long-lived container | cap-drop ALL, no-new-privs, PID limit | **Default for anything unattended** |
| `ssh` | Remote box | Network boundary | Always-on VPS |
| `modal` | Modal cloud sandbox | Full VM | Hibernates when idle — near-$0 |
| `daytona` | Daytona workspace | Full container | Stop/resume persistence |
| `singularity` | Apptainer container | Namespaces | HPC / shared machines |

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_network: true                    # false = --network=none, full air-gap
  docker_forward_env: ["GITHUB_TOKEN"]    # explicit allowlist, nothing else leaks in
  docker_volumes:
    - "/home/justin/masonry:/workspace/masonry"
    - "/home/justin/.hermes/cache/documents:/output"   # gateway-visible exports
  container_memory: 5120
  container_persistent: true
```

The Docker container is **one persistent container shared across sessions, `/new`, and subagents** — installed packages and background processes survive. It is *not* torn down when you quit. That's deliberate (dev servers keep running) but it means state accumulates; know where your `docker rm -f` is.

→ [Configuration → Terminal backends](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) · [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)

### 3.5 Gateway — one process, every surface

```
Telegram ─┐
Slack ────┤
Discord ──┤──► GatewayRunner ──► authorize ──► session key ──► AIAgent
WhatsApp ─┤         │                                             │
Email ────┤         └──────────◄─── deliver response ◄────────────┘
Webhook ──┘   also: ticks cron every 60s, runs hooks, background maintenance
```

One long-running process. It authorizes users (allowlists + DM pairing codes), routes sessions per-platform, dispatches slash commands, **and ticks the cron scheduler**. Meaning: *no gateway, no cron.* If you want always-on, you install the gateway as a service:

```bash
hermes gateway install                # user-level systemd/launchd service
sudo hermes gateway install --system  # boot-time service on a server
```

Webhooks matter too: `hermes webhook subscribe <name>` creates a route at `/webhooks/<name>` — that's your GitHub/Linear/Stripe → agent trigger.

→ [Messaging](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/) · [Gateway internals](https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals)

---

## 4. Configuration: what lives where

```
~/.hermes/
├── config.yaml     ← everything non-secret
├── .env            ← API keys, bot tokens, secrets ONLY
├── auth.json       ← OAuth credentials
├── SOUL.md         ← agent identity (slot #1 in the system prompt)
├── memories/       ← MEMORY.md, USER.md
├── skills/         ← SKILL.md files (bundled + hub + agent-written)
├── skill-bundles/  ← YAML aliases grouping skills under one slash command
├── cron/           ← jobs.json + output/<job_id>/*.md
├── scripts/        ← pre-run / no-agent scripts (sandboxed here)
├── sessions/       ← gateway sessions
└── logs/           ← secrets auto-redacted
```

**Precedence (highest first):** CLI flags → `config.yaml` → `.env` → built-in defaults.

**Rule of thumb:** secrets in `.env`, everything else in `config.yaml`. `hermes config set KEY VAL` routes automatically.

### The prompt assembly order

Worth internalizing, because it tells you where to put what:

```
┌─ STABLE  (cached, never mutates mid-session)
│    SOUL.md  →  identity, voice, standing rules
│    tool guidance
│    skills index (names + descriptions only)
├─ CONTEXT
│    .hermes.md / AGENTS.md / CLAUDE.md / .cursorrules  (from workdir)
└─ VOLATILE
     MEMORY.md + USER.md snapshot
     timestamp, profile
```

So: **`SOUL.md`** = who the agent is (stable, global). **`AGENTS.md`** = what this project is (per-directory). **`MEMORY.md`** = what it learned (agent-managed). Don't put project details in SOUL, don't put identity in memory.

### The config keys that matter for an always-on agent

```yaml
model:
  provider: anthropic
  default: claude-sonnet-5

fallback_providers:                 # primary dies → keep running
  - provider: openrouter
    model: anthropic/claude-sonnet-5

auxiliary:                          # side-jobs on a cheap model, not Opus
  compression:       { provider: openrouter, model: google/gemini-3-flash-preview }
  vision:            { provider: openrouter, model: google/gemini-3-flash-preview }
  background_review: { provider: openrouter, model: google/gemini-3-flash-preview }
  goal_judge:        { provider: openrouter, model: google/gemini-3-flash-preview }

terminal:
  backend: docker

compression:
  enabled: true
  threshold: 0.50                   # compress at 50% of context window
  protect_last_n: 20

agent:
  max_turns: 90                     # iteration budget per turn
  api_max_retries: 3                # set 0 to fail over to fallback instantly
  reasoning_effort: ""              # none|minimal|low|medium|high|xhigh
  disabled_toolsets: []             # single switch to kill a toolset everywhere

tool_loop_guardrails:
  warnings_enabled: true
  hard_stop_enabled: true           # ← TURN THIS ON for unattended. Default false.

skills:  { write_approval: true }
memory:  { write_approval: true }

cron:
  wrap_response: false
  script_timeout_seconds: 1800
```

**`auxiliary.*` is the single biggest cost lever.** By default every side task — context compression, vision, web-page summarization, session titles, the goal judge, the background self-improvement review — runs on your **main model**. On Opus that is expensive and pointless. Point them at Flash and you cut spend meaningfully with no measurable quality loss (Nous reports the background review is ~3–5× cheaper on a separate model with near-identical capture).

**`tool_loop_guardrails.hard_stop_enabled: true` is non-negotiable for unattended runs.** Default is `false` because interactive sessions have a human watching. A cron job at 3am does not. Without it, a stuck agent burns its full 90-turn budget on a loop.

→ [Full configuration reference](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) · [Providers](https://hermes-agent.nousresearch.com/docs/integrations/providers) · [Env vars](https://hermes-agent.nousresearch.com/docs/reference/environment-variables)

---

## 5. Profiles: this is how you build a multi-agent system

A profile = a separate `HERMES_HOME`. Own config, own `.env`, own `SOUL.md`, own memory, own skills, own cron jobs, own gateway process, own bot token.

```bash
hermes profile create chief    --description "Triage, calendar, daily brief"
hermes profile create research --description "Reads sources, writes findings"
hermes profile create delivery --description "Client artifacts, Notion writes"

chief setup            # each profile becomes its own command
chief gateway install
```

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   chief      │  │  research    │  │  delivery    │
│ SOUL.md      │  │ SOUL.md      │  │ SOUL.md      │
│ own memory   │  │ own memory   │  │ own memory   │
│ own cron     │  │ own cron     │  │ own cron     │
│ own gateway  │  │ own gateway  │  │ own gateway  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       └─────────── Kanban board ──────────┘
             (SQLite, hermes kanban)
```

Cross-profile coordination happens through the **Kanban board** — a durable SQLite task board where an orchestrator profile decomposes work and dispatches to worker profiles based on their `--description`. That, plus **`delegate_task`** (spawn ephemeral subagents inside a single session for parallel work), gives you two levels of fan-out.

This maps almost exactly onto your H.E.R.M.E.S. five-agent design. **But start with one profile.** Multi-profile is an optimization for when a single agent's SOUL/skills/toolset genuinely conflict — not a starting architecture.

**A profile is not a sandbox.** On the `local` backend, every profile still has your full user-level filesystem access. Isolation comes from `terminal.backend`, not from profiles.

→ [Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles) · [Kanban](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban) · [Delegation](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation)

---

## 6. Persistent goals (`/goal`) — the Ralph loop

Set a standing objective. After each turn, a cheap judge model reads the agent's final response and returns `{"done": bool, "reason": "..."}`. If not done, Hermes feeds a continuation prompt back into the same session and keeps going.

```
/goal Fix every failing test in tests/ and get scripts/run_tests.sh green

  ⊙ Goal set (20-turn budget)
  → turn runs → judge: continue → ↻ Continuing toward goal (1/20)
  → turn runs → judge: continue → ↻ Continuing toward goal (2/20)
  → turn runs → judge: done     → ✓ Goal achieved
```

Design details worth knowing:

- **Fail-open:** a broken judge returns `continue`, never wedges. The **turn budget** (`goals.max_turns`, default 20) is the real backstop.
- **Judge is conservative** — false negatives (says continue when done) are more common than false positives. The turn budget catches those.
- The continuation prompt is a plain user message. It does **not** invalidate the prompt cache. A 20-turn goal costs the same cache-wise as 20 normal turns.
- `/subgoal` appends acceptance criteria mid-loop without resetting.
- Route the judge to Flash via `auxiliary.goal_judge`. It's ~200 output tokens per turn.

Use `/goal` when you'd otherwise say "keep going" three times. Don't use it for one-shot tasks.

→ [Persistent Goals](https://hermes-agent.nousresearch.com/docs/user-guide/features/goals)

---

## 7. How to improve a Hermes agent (the tuning loop)

The agent improves along four independent axes. Debug in this order:

```
┌─────────────────────────────────────────────────────────┐
│  1. IDENTITY      SOUL.md          → wrong voice/priors │
│  2. KNOWLEDGE     MEMORY / USER    → forgets facts      │
│  3. PROCEDURE     SKILL.md         → does it wrong      │
│  4. CAPABILITY    toolsets / MCP   → literally can't    │
└─────────────────────────────────────────────────────────┘
          ▲                                    │
          └──── curator + background review ◄──┘
                (agent proposes, you approve)
```

**Diagnosis table:**

| Symptom | Wrong layer | Fix |
| --- | --- | --- |
| Right actions, wrong tone/format | Identity | Edit `SOUL.md` |
| Re-asks something you told it last week | Knowledge | Check `MEMORY.md` isn't at 100% capacity; consolidate |
| Gets the task done but does it the hard way | Procedure | `/learn how I just did X` → writes a skill |
| "I would run the tests…" but doesn't | Model behavior | `agent.tool_use_enforcement: true` |
| Loops on a failing tool call | Guardrails | `tool_loop_guardrails.hard_stop_enabled: true` |
| Forgets mid-task on long runs | Compression | Raise `compression.threshold`, `protect_last_n` |
| Cron job produces garbage | Prompt | Cron has no history — the prompt must be self-contained |
| Cron job spends money doing nothing | Gating | Add a `script` with a `wakeAgent` gate |
| Costs 3× what you expected | Auxiliary | Point `auxiliary.*` at Flash instead of your main model |

**The fastest improvement primitive:** `/learn`. Point it at anything — a directory, a URL, or the conversation you just had — and it authors a `SKILL.md` from it.

```
/learn how I just built the CardByte competitive landscape audit
/learn https://docs.linear.app/api
/learn the Masonry proposal structure in ~/masonry/templates/
```

**Skill bundles** codify "these three always go together":

```bash
hermes bundles create client-prep \
  --skill client-brief --skill masonry-house-style --skill fathom-digest \
  -d "Everything I need before a client call"

# then:  /client-prep prep me for the CardByte call tomorrow
```

**Read the curator's reports.** `hermes curator` writes a per-run report of what it consolidated and archived. That's your ground truth on what the agent thinks it has learned.

---

## 8. Security, in one screen

An always-on agent with terminal access, your API keys, and an inbound messaging surface is a meaningful attack surface. Non-negotiables:

1. **Never `terminal.backend: local` on an unattended box.** Docker, minimum.
2. **Allowlist your credentials.** `docker_forward_env` is an explicit list. Nothing else enters the container.
3. **`unauthorized_dm_behavior: ignore`** on any public-facing platform, unless you want pairing codes.
4. **Gate the learning loop.** `skills.write_approval: true` + `memory.write_approval: true`. Prompt injection in a web page → agent writes a poisoned skill → skill runs forever. (Hermes does scan memory/skill/cron writes for injection and exfil patterns, but scanning is not a substitute for reading diffs.)
5. **Skills Hub trust levels.** `builtin` / `official` / `trusted` / `community`. `--force` can override warnings but never a `dangerous` verdict. Read community skills before installing.
6. **`hard_stop_enabled: true`** so a stuck loop is circuit-broken, not just warned.

→ [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)

---

## 9. The smallest useful build

Don't build the five-agent org. Build one job that earns its keep, then let the surface grow from evidence.

**Milestone 0 — local, one day.** Install, `hermes setup`, point it at your Anthropic key. Switch `terminal.backend` to `docker`. Run one CLI conversation about a real client problem. Confirm memory persists across `/quit` → restart.

**Milestone 1 — one cron job that earns its keep, week 1.**

```bash
hermes gateway install

hermes cron create "0 8 * * 1-5" \
  "Search the last 24h for news on: CardByte competitors, Indian enterprise SaaS \
   funding, and AI agent infra. Summarize the 3 that matter to my clients. \
   If nothing is worth reading, respond with only [SILENT]." \
  --deliver slack --name morning-scan
```

Success metric: **do you read it?** Kill it in week 2 if you don't. That's the whole test.

**Milestone 2 — the pipeline, week 2–3.** Add `context_from` chaining and a `wakeAgent` gate. Real target: the Fathom→Notion meeting intelligence pipeline you already scoped. Hermes gives you the *trigger and the delivery* you're currently missing.

**Milestone 3 — profiles, only if forced.** If and only if you find yourself writing contradictory instructions into one `SOUL.md`.

### Honest cost math

| Component | Monthly |
| --- | --- |
| VPS (Hetzner CX22, 2 vCPU / 4 GB) | ~$5 |
| Or: Modal / Daytona serverless (hibernates idle) | ~$0–3 |
| LLM — 2 cron jobs/day, Sonnet main + Flash aux | ~$8–20 |
| Firecrawl (web search) or SearXNG self-hosted | ~$0–16 |
| **Total** | **~$15–40** |

Without gated aux models and `wakeAgent` gates, the LLM line is 3–5× that.

---

## 10. The pushback

You have Claude Code, Linear, Notion, Slack, and Fathom, plus a running H.E.R.M.E.S. multi-agent design, plus the LMNTL / sovereign-cloud thesis, plus an MCP server you've already identified as the highest-leverage near-term build.

**Hermes Agent adds exactly one thing your stack doesn't have: unattended, scheduled execution with cross-session continuity, delivered to a messaging surface.** That's real, and it's the missing primitive. Everything else Hermes does — skills, memory files, MCP, subagents, terminal tools — you already have in Claude Code, in a format that ports directly (same `SKILL.md` standard).

The risk is the one you've named yourself: building multiple partial surfaces without completing one. Hermes is a *big* surface — 20 messaging platforms, 6 terminal backends, 8 memory providers, 9 skill registries, a Kanban system, a plugin system. It is very easy to spend three weeks configuring it and zero weeks getting value from it.

**The test:** if the only Hermes feature you use in the first month is *one cron job delivering to Slack*, that's a success, not a failure. If you find yourself comparing memory providers before you've shipped a single scheduled job, stop.

---

## 11. Resources

**Official**

- [Docs home](https://hermes-agent.nousresearch.com/docs/) · [GitHub](https://github.com/NousResearch/hermes-agent) (MIT)
- [`/llms.txt`](https://hermes-agent.nousresearch.com/docs/llms.txt) — 17 KB index of every doc page. Feed this to Claude Code.
- [`/llms-full.txt`](https://hermes-agent.nousresearch.com/docs/llms-full.txt) — every doc page concatenated, ~1.8 MB. Feed to NotebookLM.
- [Quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart) · [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) · [Architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture)
- [CLI commands](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) · [Slash commands](https://hermes-agent.nousresearch.com/docs/reference/slash-commands) · [Tools reference](https://hermes-agent.nousresearch.com/docs/reference/tools-reference)

**Guides, in reading order**

1. [Daily Briefing Bot](https://hermes-agent.nousresearch.com/docs/guides/daily-briefing-bot) — the canonical always-on tutorial
2. [Automate with Cron](https://hermes-agent.nousresearch.com/docs/guides/automate-with-cron) — real automation patterns
3. [Work with Skills](https://hermes-agent.nousresearch.com/docs/guides/work-with-skills)
4. [Delegation Patterns](https://hermes-agent.nousresearch.com/docs/guides/delegation-patterns)
5. [Tips & Best Practices](https://hermes-agent.nousresearch.com/docs/guides/tips)
6. [Use Hermes as a Python Library](https://hermes-agent.nousresearch.com/docs/guides/python-library) — embed `AIAgent` directly, no CLI

**Ecosystem**

- [agentskills.io](https://agentskills.io/specification) — the open [SKILL.md](http://SKILL.md) standard
- [Nous Research](https://nousresearch.com) · [Nous Portal](https://portal.nousresearch.com) · [Discord](https://discord.gg/NousResearch)
- [Hermes 4 technical report](https://arxiv.org/abs/2508.18255) — the model side
- [Atropos](https://github.com/NousResearch/atropos) — Nous's RL environment framework; Hermes exports trajectories to it

**Companion page:** Glossary — Hermes & Agent Infrastructure (sibling page under Reading Material)