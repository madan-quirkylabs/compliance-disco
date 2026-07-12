# Engineering Compliance Agent (DPDP)

My slice of the compliance fan-out: the **engineering perspective** specialist.
Takes one DPDP obligation → returns a structured engineering impact assessment.

## Where the logic lives
The agent is a Hermes skill, **vendored in the repo** at `skills/eng-compliance/`:
- `skills/eng-compliance/SKILL.md` — procedure + output schema
- `skills/eng-compliance/references/controls.md` — DPDP + control mapping
- `skills/eng-compliance/references/system-inventory.md` — systems to ground against

Grounding lives *inside the skill* on purpose — a project-root `AGENTS.md`/`.hermes.md`
would shadow a local context file (only the first project context loads per session).

## Setup (each teammate, once)
Point Hermes at the repo's vendored skills, then confirm it loads:
```yaml
# ~/.hermes/config.yaml
skills:
  external_dirs:
    - /absolute/path/to/compliance-disco/skills
```
```bash
hermes skills list | grep eng-compliance   # should show it as enabled
```

## Input contract (from the orchestrator / de-legalese step)
```json
{ "obligation_id": "D-06", "text": "<plain-language obligation>",
  "deadline": "2026-09-01", "severity": "high" }
```

## Output contract (to the collator → FDO)
```json
{ "obligation_id", "engineering_impact", "affected_systems": [],
  "required_controls": [], "infra_or_code_changes": [], "evidence_needed": [],
  "dpdp_provision": [], "control_framework_mapping": [], "effort_estimate": "S|M|L",
  "conflicts_with_other_depts": [], "source_clause_citation": "", "ungrounded_flags": [] }
```

## Run it
Weak local models parrot the input unless instruction and data are separated:
```bash
hermes -z "You are an engineering compliance reviewer. Do NOT repeat the obligation back. \
Use the eng-compliance-assessment skill and output ONLY the JSON. OBLIGATION: <text>"
```
For the demo, keep ONE `hermes chat` session open instead of cold `hermes -z` per call
(agent boot is ~55s and dominates; it's paid once in a persistent session).
