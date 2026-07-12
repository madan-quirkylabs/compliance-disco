# Running Compliance-Disco

Turns a regulation PDF into a prioritized, per-department action plan.

```
PDF ─► text ─► structured obligations ─► engineering + marketing requirements ─► consolidated report
      (Stage 1)          (Stage 1)                    (Stage 2)                      (Stage 2)
```

## 1. Prerequisites

- Python 3.11+
- Hermes Agent installed — check with `hermes --version`
- A DeepSeek API key (V4 Flash): https://platform.deepseek.com/api_keys
- Python packages: `pip install pymupdf openai`

## 2. One-time setup

Create the Hermes profile the pipeline runs on (DeepSeek V4 Flash, local backend):

```bash
export DEEPSEEK_API_KEY="sk-your-key-here"
./setup_profile.sh
```

This registers a `compliance` profile at `~/.hermes/profiles/compliance`. Your key is stored
there (outside this repo) and is never committed.

## 3. Run the pipeline

### Stage 1 — extract the obligations from the regulation PDF(s)

```bash
# PDF(s) -> plain text
python3 scripts/pdf2text.py \
  --source docs/regulations/dpdp/ \
  --output workspace/shared-data/extracted-regulations/raw.txt

# text -> structured obligations / definitions / timelines / penalties + summary
DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" python3 scripts/extract.py \
  --text workspace/shared-data/extracted-regulations/raw.txt \
  --regulation "DPDP Act 2023" \
  --body "DPDP Board"
```

### Stage 2 — department requirements + consolidated report (one command)

```bash
./run_pipeline.sh
```

Runs the engineering agent, the marketing agent, and the consolidator in sequence.

## 4. Output

| File | What it is |
|------|-----------|
| `workspace/shared-data/consolidated-output/final-report.md` | **The executive report** — prioritized plan + cross-team dependencies |
| `workspace/shared-data/engineering-output/engineering-requirements.md` | Engineering requirements (`REQ-*`) |
| `workspace/shared-data/marketing-output/marketing-requirements.md` | Marketing requirements (`MREQ-*`) |

## Run one stage at a time (optional)

```bash
./run_engineering.sh     # engineering requirements only
./run_marketing.sh       # marketing requirements only
./run_consolidator.sh    # merge existing department outputs into the final report
```

## Use a different regulation

Drop the PDF(s) into `docs/regulations/<body>/` and repeat Stage 1 with:

```bash
python3 scripts/pdf2text.py --source docs/regulations/<body>/ --output workspace/shared-data/extracted-regulations/raw.txt
python3 scripts/extract.py  --text  workspace/shared-data/extracted-regulations/raw.txt --regulation "<name>" --body "<body>"
./run_pipeline.sh
```

Everything downstream is regulation-agnostic — no code changes needed.

## Notes

- The `run_*.sh` scripts default to the `compliance` profile. Override with `HERMES_HOME=... ./run_pipeline.sh`.
- Needs a tool-capable model. **DeepSeek V4 Flash works; small local models (e.g. `qwen3:4b`) do not** — they won't reliably call tools.
- For a plain-English overview of *what* the pipeline does and *why*, see [`Explainer.md`](Explainer.md).
