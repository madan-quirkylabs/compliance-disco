# Sample regulations

Each sub-directory here holds the PDF(s) for one regulation. The pipeline reads a whole
folder, so a regulation can be one PDF or several (e.g. an Act + its Rules).

## Catalog

`samples.json` is the catalog the UI reads. Current entries:

| Folder | Regulation | Bundled? | Source |
|--------|-----------|----------|--------|
| `dpdp/`  | DPDP Act 2023 (+ Rules 2025) | ✅ yes | [MeitY](https://www.meity.gov.in/data-protection-framework) |
| `gdpr/`  | GDPR (Reg. 2016/679)         | ⬇ download | [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) |
| `hipaa/` | HIPAA Privacy Rule           | ⬇ download | [HHS.gov](https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html) |
| `ccpa/`  | CCPA                         | ⬇ download | [CA OAG](https://oag.ca.gov/privacy/ccpa) |

## Add / run a regulation

1. **Download** the PDF from the official source (links above), or bring your own.
2. **Drop** it into `docs/regulations/<folder>/` — or upload it from the web UI.
3. **Run** — via the UI (pick the sample → *Run pipeline*) or on the command line:
   ```bash
   python3 scripts/pdf2text.py --source docs/regulations/<folder>/ --output workspace/shared-data/extracted-regulations/raw.txt
   python3 scripts/extract.py  --text workspace/shared-data/extracted-regulations/raw.txt --regulation "<name>" --body "<body>"
   ./run_pipeline.sh
   ```

Any folder that contains a `.pdf` is auto-detected as a runnable sample by the UI, even if
it isn't in `samples.json`. Add it to `samples.json` to give it a nice display name + source link.
