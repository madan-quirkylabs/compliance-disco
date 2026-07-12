# Hermes wiring

What the Hermes agent needs in order to reach the compliance test data in this repo.

## 1. The skill

`skills/compliance/compliance-fixtures/SKILL.md` mirrors the layout Hermes expects at
`~/.hermes/skills/<category>/<name>/SKILL.md`. Install it by symlinking, so edits in the repo
take effect without a re-copy:

```bash
mkdir -p ~/.hermes/skills/compliance
ln -sfn "$PWD/hermes/skills/compliance/compliance-fixtures" \
        ~/.hermes/skills/compliance/compliance-fixtures

hermes  # then: skills_list  → `compliance-fixtures` should appear
```

Only the skill's one-line description sits in context by default; the body is pulled in on
demand when the agent decides it is relevant.

## 2. The working directory

Hermes reads `AGENTS.md` from its working directory into the prompt's CONTEXT slot at session
start. `AGENTS.md` at the repo root points at `docs/tests/index.json`, so **an agent started in
this repo finds the fixtures on its own** — no prompt engineering required.

```bash
cd /path/to/compliance-disco
hermes
```

## 3. If the terminal backend is not `local`

This is the one that bites. On `terminal.backend: docker` (the recommended default for
unattended runs) the agent's shell runs inside a container that **cannot see this repo** unless
you mount it. Mount it read-only — the fixtures are immutable inputs and the agent has no
business writing to them:

```yaml
# ~/.hermes/config.yaml
terminal:
  backend: docker
  docker_volumes:
    - "/path/to/compliance-disco:/workspace/compliance-disco:ro"
```

The same applies to `ssh`, `modal`, and `daytona`: the fixtures must be present on whichever
machine the agent's hands are actually on. If `cat docs/tests/index.json` fails inside a Hermes
session, this is why.

## 4. Writing results back (optional)

The dashboard's only write surface is `POST $CONVEX_SITE_URL/hermes/ingest`, authenticated with
a bearer token in `HERMES_INGEST_KEY` (see `convex/http.ts`). It is idempotent on `run.id` and
never touches human sign-offs. Put the secret in `~/.hermes/.env`, not in `config.yaml`, and
forward it explicitly if you are on the Docker backend:

```yaml
terminal:
  docker_forward_env: ["HERMES_INGEST_KEY", "CONVEX_SITE_URL"]
```

## Known gap

`docs/tests/marketing-compliance-agent.md` instructs the reviewer to "preload
`marketing-compliance-assessment`". **That skill does not exist in this repo yet.** The skill
here (`compliance-fixtures`) covers _access_ — where the data is, how to load it, what not to
read. The assessment procedure it defers to still has to be authored, or the agent has to work
straight from `docs/specs/marketing-compliance-agent.md`.
