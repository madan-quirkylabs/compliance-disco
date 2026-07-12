#!/usr/bin/env python3
"""
Compliance Extractor

Reads a text file (produced by pdf2text.py), sends to LLM for structured
compliance extraction, and writes 5 output files.

Works with ANY regulation — no DPDP-specific logic.

Usage:
    python scripts/extract.py --text workspace/shared-data/extracted-regulations/raw.txt --regulation "DPDP Act 2023" --body "DPDP Board"
    python scripts/extract.py --text /tmp/sebi-text.txt --regulation "SEBI Circular" --body "SEBI"
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print("ERROR: openai not installed. Run: pip install openai")
    sys.exit(1)


EXTRACTION_PROMPT = """You are a legal compliance extractor. Parse the following regulation text and extract structured compliance data.

Regulation: {regulation}
Source Body: {source_body}

Extract the following 5 outputs as a JSON object with these keys:

1. "summary" — A markdown summary (2-4 pages) with:
   - Regulation name and issuing body
   - Publication date
   - Who must comply (applicability)
   - Overview of the regulation's purpose
   - Section-by-section breakdown of key provisions

2. "obligations" — Array of every obligation, each with:
   - "id": "OBL-XXX" (sequential)
   - "regulation": "{regulation}"
   - "source_body": "{source_body}"
   - "section": section/article reference (e.g. "Section 4(1)", "Regulation 3", "Clause 2.1")
   - "title": short title (e.g. "Consent Requirement")
   - "description": what must be done
   - "applies_to": who must comply (e.g. "Data Fiduciary", "Listed Entity", "All")
   - "deadline": when (e.g. "Upon enforcement", "Within 72 hours", "TBD")
   - "penalty_ref": cross-reference to penalty section
   - "ambiguity_flag": true if the requirement is unclear
   - "notes": any clarifications or ambiguity notes

3. "definitions" — Array of all key terms, each with:
   - "term": the defined term
   - "definition": exact definition from the regulation
   - "section": where it's defined
   - "category": "Core", "Actor", "Process", "Data", "Other"

4. "timelines" — Array of all dates and deadlines, each with:
   - "event": what happens
   - "date": ISO 8601 date or "Upon enforcement" or "TBD"
   - "description": details
   - "related_sections": array of related section references

5. "penalties" — Array of all penalties, each with:
   - "section": where defined
   - "offense": what triggers the penalty
   - "penalty_amount": the penalty
   - "criteria": how the amount is determined

RULES:
- Be exhaustive. Extract EVERY obligation, definition, timeline, and penalty.
- Use exact statutory language where possible.
- Flag any ambiguity with "ambiguity_flag": true and notes.
- Do NOT guess at legal interpretation.
- Every output must include "regulation" and "source_body" fields.
- Output ONLY valid JSON. No markdown, no explanation before or after.

Here is the regulation text:

{text}"""


def call_llm(text: str, regulation: str, source_body: str, api_key: str) -> dict:
    """Call DeepSeek API to extract structured data from regulation text."""
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com/v1"
    )

    prompt = EXTRACTION_PROMPT.format(
        regulation=regulation,
        source_body=source_body,
        text=text
    )

    print(f"Calling DeepSeek API ({len(prompt)} chars prompt)...")

    # Try with full output, retry with less if truncated
    for max_tokens in [65536, 32768, 16384]:
        response = client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        print(f"  Response: {len(content)} characters (max_tokens={max_tokens})")
        print(f"  Tokens used: {response.usage.total_tokens}")

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"  JSON parse error: {e}")
            if max_tokens > 16384:
                print(f"  Retrying with lower max_tokens...")
                continue
            else:
                print(f"ERROR: Could not parse API response as JSON")
                sys.exit(1)

    # Should not reach here, but just in case
    print(f"ERROR: All retries failed")
    sys.exit(1)


def write_outputs(data: dict, output_dir: str, regulation: str, source_body: str) -> dict:
    """Write the 5 extraction output files."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # 1. summary.md
    summary = data.get("summary", f"# {regulation}\n\n**Issuing Body:** {source_body}\n\nNo summary extracted.")
    (out / "summary.md").write_text(summary)
    print(f"  Wrote: summary.md ({len(summary)} chars)")

    # 2. obligations.json
    obligations = data.get("obligations", [])
    for o in obligations:
        if "regulation" not in o:
            o["regulation"] = regulation
        if "source_body" not in o:
            o["source_body"] = source_body
    (out / "obligations.json").write_text(json.dumps(obligations, indent=2))
    print(f"  Wrote: obligations.json ({len(obligations)} obligations)")

    # 3. definitions.json
    definitions = data.get("definitions", [])
    (out / "definitions.json").write_text(json.dumps(definitions, indent=2))
    print(f"  Wrote: definitions.json ({len(definitions)} definitions)")

    # 4. timelines.json
    timelines = data.get("timelines", [])
    (out / "timelines.json").write_text(json.dumps(timelines, indent=2))
    print(f"  Wrote: timelines.json ({len(timelines)} events)")

    # 5. penalties.json
    penalties = data.get("penalties", [])
    (out / "penalties.json").write_text(json.dumps(penalties, indent=2))
    print(f"  Wrote: penalties.json ({len(penalties)} penalties)")

    return {
        "summary_chars": len(summary),
        "obligations": len(obligations),
        "definitions": len(definitions),
        "timelines": len(timelines),
        "penalties": len(penalties),
    }


def write_handoff(output_dir: str, regulation: str, source_body: str, stats: dict):
    """Write the reader-to-coordinator handoff."""
    handoff_dir = Path(output_dir).parent / "handoffs"
    handoff_dir.mkdir(parents=True, exist_ok=True)
    handoff = {
        "from": "regulatory-reader",
        "to": "coordinator",
        "status": "complete",
        "regulation_name": regulation,
        "source_body": source_body,
        "artifacts": ["summary.md", "obligations.json", "definitions.json", "timelines.json", "penalties.json"],
        "stats": stats,
    }
    path = handoff_dir / "reader-to-coordinator.md"
    path.write_text(json.dumps(handoff, indent=2))
    print(f"  Wrote: {path}")


def main():
    parser = argparse.ArgumentParser(description="Extract compliance data from regulation text")
    parser.add_argument("--text", required=True, help="Text file (produced by pdf2text.py)")
    parser.add_argument("--regulation", required=True, help="Regulation name (e.g. 'DPDP Act 2023')")
    parser.add_argument("--body", required=True, help="Issuing body (e.g. 'DPDP Board')")
    parser.add_argument("--output", default="workspace/shared-data/extracted-regulations", help="Output directory")
    parser.add_argument("--api-key", default=None, help="DeepSeek API key (or set DEEPSEEK_API_KEY env var)")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("ERROR: API key required. Set DEEPSEEK_API_KEY or use --api-key")
        sys.exit(1)

    # Read text
    text_path = Path(args.text)
    if not text_path.exists():
        print(f"ERROR: Text file not found: {args.text}")
        sys.exit(1)

    text = text_path.read_text()
    print(f"Read: {args.text} ({len(text)} chars, {len(text.split())} words)")

    # Call LLM
    print("\n━━━ Calling DeepSeek API ━━━")
    data = call_llm(text, args.regulation, args.body, api_key)

    # Write outputs
    print("\n━━━ Writing output files ━━━")
    stats = write_outputs(data, args.output, args.regulation, args.body)

    # Write handoff
    print("\n━━━ Writing handoff ━━━")
    write_handoff(args.output, args.regulation, args.body, stats)

    print(f"\n━━━ Done ━━━")
    print(f"  Obligations: {stats['obligations']}")
    print(f"  Definitions: {stats['definitions']}")
    print(f"  Timelines:   {stats['timelines']}")
    print(f"  Penalties:   {stats['penalties']}")


if __name__ == "__main__":
    main()
