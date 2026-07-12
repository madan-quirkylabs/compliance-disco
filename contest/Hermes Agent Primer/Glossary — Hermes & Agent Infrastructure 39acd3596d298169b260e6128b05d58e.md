# Glossary — Hermes & Agent Infrastructure

Companion to the [Hermes Agent primer](https://app.notion.com/p/Hermes-Agent-Primer-39acd3596d298182837cc6113055d0d5?pvs=21). Terms you'll hit in the Hermes docs, grouped so you can skim.

## Hermes-specific

| Term | What it means |
| --- | --- |
| **Hermes Agent** | Nous Research's open-source (MIT) autonomous agent runtime. Released Feb 2026. The thing you install. |
| **Hermes 4 / 4.3** | Nous's open-weight LLM family (14B/70B/405B, 4.3-36B). Unrelated to running Hermes Agent — it's model-agnostic. |
| **`AIAgent`** | The single conversation-loop class (`run_agent.py`) shared by the CLI, gateway, cron, IDE, and batch runner. |
| **Gateway** | The long-running daemon process. Handles messaging platforms, authorization, session routing, hooks — **and ticks cron every 60s**. No gateway, no cron. |
| **Profile** | A separate `HERMES_HOME` directory: own config, `.env`, `SOUL.md`, memory, skills, cron, gateway, bot token. `hermes profile create <name>`. How you run multiple independent agents. |
| **`HERMES_HOME`** | Env var defining the profile boundary. Defaults to `~/.hermes`. Distinct from OS `HOME`. |
| **`SOUL.md`** | Global agent identity — voice, standing rules, priors. Slot #1 in the system prompt. Stable/cached. |
| **`MEMORY.md`** | Agent's own notes. Hard cap 2,200 chars. Environment facts, conventions, lessons. |
| **`USER.md`** | User profile. Hard cap 1,375 chars. Your preferences, comms style. |
| **`SKILL.md`** | A procedure document. Frontmatter + When to Use / Procedure / Pitfalls / Verification. The unit of procedural memory. |
| **Skill bundle** | A YAML file grouping several skills under one slash command (`/client-prep`). Lives in `~/.hermes/skill-bundles/`. |
| **Skills Hub** | Registry system for installing skills from GitHub, [skills.sh](http://skills.sh), well-known endpoints, ClawHub, LobeHub, [browse.sh](http://browse.sh), or a direct URL. |
| **Tap** | A GitHub repo you subscribe to as a skill source. `hermes skills tap add owner/repo`. |
| **Curator** | Background maintenance process that reviews agent-created skills, consolidates overlap, archives stale entries, writes reports. `hermes curator`. |
| **Background review** | The post-turn pass where the agent decides whether to save a memory or write/patch a skill. This is "self-improvement." |
| **`skill_manage`** | The tool the agent uses to create/patch/edit/delete its own skills. |
| **`/learn`** | Slash command: point it at a directory, URL, or the conversation you just had — it authors a [SKILL.md](http://SKILL.md). Fastest way to teach it. |
| **Write approval** | `skills.write_approval` / `memory.write_approval`. Stages agent writes for human review instead of committing them. Off by default. |
| **Terminal backend** | Where the agent's shell commands actually execute: `local`, `docker`, `ssh`, `modal`, `daytona`, `singularity`. Your entire security posture in one key. |
| **Toolset** | A named group of tools (`web`, `file`, `terminal`, `browser`, `memory`, `delegation`, `cron`…). ~28 of them. Enable/disable per platform with `hermes tools`. |
| **`wakeAgent`** | The `{"wakeAgent": false}` stdout line a cron pre-check script emits to skip the LLM entirely this tick. Zero-cost polling. |
| **`context_from`** | Cron parameter that prepends another job's most recent output into this job's prompt. How you chain jobs into pipelines. |
| **`[SILENT]`** | Marker in a cron job's final response that suppresses delivery. The watchdog pattern: only speak when something is wrong. |
| **No-agent mode** | A cron job with `no_agent=True` — runs a script on a schedule and delivers stdout verbatim. Zero tokens, zero model. |
| **`/goal`** | Standing objective. A judge model checks each turn; if not done, Hermes auto-continues. Hermes's take on the Ralph loop. |
| **`/subgoal`** | Append acceptance criteria to an active goal without resetting the loop. |
| **`delegate_task`** | Spawn isolated subagents for parallel workstreams inside one session. |
| **Kanban** | SQLite task board for coordinating multiple *profiles*. An orchestrator decomposes and dispatches to workers by their `--description`. |
| **Nous Portal** | Nous's unified subscription: one OAuth for 300+ models plus the Tool Gateway. Optional — bring your own keys instead. |
| **Tool Gateway** | Nous-hosted bundle of web search, image gen, TTS, and browser automation behind one Portal subscription. |
| **Honcho** | External memory provider plugin (by Plastic Labs) doing dialectic user modeling — builds a persistent model of who you are across sessions. |
| **Atropos** | Nous's open-source RL environment framework. Hermes can export session trajectories to it for training. |
| **OpenClaw** | The prior-generation agent Hermes competes with. Hermes ships a migration path (`hermes claw migrate`). |

## Agent architecture (general)

| Term | What it means |
| --- | --- |
| **Agent loop** | The cycle: build prompt → call model → model emits tool calls → execute tools → feed results back → repeat until a final text response. |
| **Tool call / function call** | The model emitting a structured request (`{name, args}`) that the runtime executes and returns a result for. |
| **Toolset gating** | Restricting which tools are exposed per surface. Fewer tools = smaller schema in every request = cheaper and more accurate. |
| **System prompt** | The instruction block prepended to every request. In Hermes it's tiered: stable → context → volatile. |
| **Progressive disclosure** | Load a one-line description always, the full document only when needed. How 90 skills fit in a context window. |
| **Context window** | The model's total token budget. Hermes requires ≥64K. |
| **Context compression** | Summarizing middle turns of a long conversation to stay under the window. Lossy. Fires at `compression.threshold`. |
| **Prompt caching** | Providers cache the stable prefix of your prompt and charge a discounted rate on re-reads. Hermes attaches Anthropic `cache_control` breakpoints automatically (1h TTL). Why prompt stability matters. |
| **Auxiliary model** | A cheap/fast model used for side jobs — compression, vision, summarization, the goal judge, the background review. **The main cost lever.** |
| **Iteration budget** | Max tool-calling turns per user message (`agent.max_turns`, default 90). |
| **Reasoning effort** | How much the model "thinks" before answering: `none` → `xhigh`. |
| **Fallback providers** | An ordered chain Hermes walks when the primary provider errors or rate-limits. Keeps unattended jobs alive. |
| **Credential pool** | Multiple API keys for one provider, rotated by strategy (`fill_first`, `round_robin`, `least_used`, `random`). |
| **Tool-loop guardrail** | Detection of unproductive loops (same call failing repeatedly). Warns by default; **set `hard_stop_enabled: true` for unattended.** |
| **Ralph loop** | The pattern of keeping a goal alive across turns and auto-continuing until a judge says done. Popularized by Codex CLI's `/goal`. |
| **Trajectory** | A recorded agent session in ShareGPT format — the training-data unit. |
| **Prompt injection** | Malicious instructions embedded in content the agent reads (a web page, a file, a message) that hijack its behavior. The core threat model for an always-on agent. |

## Protocols & standards

| Term | What it means |
| --- | --- |
| **MCP** (Model Context Protocol) | Anthropic's open standard for connecting an agent to external tool servers. Hermes is both an MCP *client* (connect to servers) and an MCP *server* (`hermes mcp serve` — expose Hermes to Claude Desktop, Cursor, etc.). |
| **ACP** (Agent Context Protocol) | Editor-integration protocol. Lets Hermes run as an editor-native agent in VS Code, Zed, JetBrains. |
| [**agentskills.io**](http://agentskills.io) | The open [SKILL.md](http://SKILL.md) specification. Shared by Hermes, Claude Code, Codex, VS Code Copilot. Skills are portable across all of them. |
| **`llms.txt` / `llms-full.txt`** | Machine-readable doc entry points. `llms.txt` = 17 KB index; `llms-full.txt` = every page concatenated (~1.8 MB). Feed to an LLM or NotebookLM. |
| **`.well-known/skills/index.json`** | Web convention for a site to publish installable skills. No central registry needed. |

## Infrastructure

| Term | What it means |
| --- | --- |
| **FTS5** | SQLite's full-text search extension. Powers `session_search` across every past conversation. ~20ms, no LLM call, free. |
| **Daemon / systemd service** | A process that runs continuously in the background and restarts on boot. `hermes gateway install`. |
| **Cron expression** | `0 8 * * 1-5` = 8:00 AM, Mon–Fri. Fields: minute, hour, day-of-month, month, day-of-week. Hermes also accepts `every 2h`, `30m`, ISO timestamps. |
| **Serverless sandbox** | Modal / Daytona: a cloud environment that hibernates when idle and costs ~nothing between runs. Filesystem state is snapshotted; **live processes are not**. |
| **Socket Mode (Slack)** | Slack's outbound-websocket connection method — lets a bot receive events without exposing a public HTTP endpoint. |
| **Webhook** | An inbound HTTP endpoint (`/webhooks/<name>`) that external services POST to, triggering an agent run. GitHub / Linear / Stripe → agent. |
| **`cap-drop ALL` / `no-new-privileges`** | Docker hardening flags. Strip every Linux capability, block privilege escalation. Hermes applies these to its sandbox container by default. |
| **Air-gap** | `docker_network: false` → `--network=none`. The container has no network egress at all. |
| **SearXNG** | Free, self-hosted metasearch engine. A $0 alternative to Firecrawl for `web_search` (search-only — you still need an extract provider). |
| **Firecrawl** | Default web search + extract backend for Hermes. Paid, or self-host with `FIRECRAWL_API_URL`. |