<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Compliance test data (Hermes)

The synthetic Marketing Compliance Agent corpus lives in `docs/tests/`. Hermes loads this file
from the working directory at session start, so this pointer is how the agent finds the data
without being told where it is.

- **`docs/tests/index.json`** — the manifest. Start here. It lists all 12 scenarios
  (`MCA-T01`–`MCA-T12`) with their input paths, situations, and requested outputs.
- **`docs/tests/scenarios/*.input.json`** — one self-contained, immutable input bundle per
  scenario: requirement packs, runtime context, practice records. No outside legal knowledge is
  needed or wanted.
- **`docs/tests/company-current-compliance-status.json`** — the nine observed Marketing practice
  records. Use this for open-ended questions about current posture.
- **`docs/tests/oracles/*.oracle.json`** — expected outcomes. **The agent under test must never
  read these.** They are for the human or harness scoring the run. Reading one voids the result.

Everything under `docs/tests/` is synthetic: no real organisation, no real regulation, no
personal data. Citations are synthetic identifiers — preserve them verbatim and never resolve
them against real law.

Assessment rules live in `docs/specs/marketing-compliance-agent.md`; the test contract and the
`MCA-T01`–`MCA-T12` expectations live in `docs/tests/marketing-compliance-agent.md`. The Hermes
access skill is `hermes/skills/compliance/compliance-fixtures/SKILL.md`.

Validate the corpus with `bun scripts/validate-fixtures.mjs` — it fails the build if an input
bundle ever leaks its expected outcome.
