#!/usr/bin/env python3
"""
Compliance-Disco — Pipeline Runner (no hermes dependency)

Runs the full pipeline: engineering → marketing → consolidator
using the DeepSeek API directly via the OpenAI client.

Usage:
    python scripts/run_pipeline.py
    python scripts/run_pipeline.py --regulation "GDPR" --body "European Commission"
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


ROOT = Path(__file__).resolve().parent.parent
EXTRACTED = ROOT / "workspace" / "shared-data" / "extracted-regulations"
ENGINEERING_OUT = ROOT / "workspace" / "shared-data" / "engineering-output"
MARKETING_OUT = ROOT / "workspace" / "shared-data" / "marketing-output"
CONSOLIDATED_OUT = ROOT / "workspace" / "shared-data" / "consolidated-output"
HANDOFFS = ROOT / "workspace" / "shared-data" / "handoffs"
REFS = ROOT / "agents" / "engineering-agent" / "skills" / "build-compliance-artifacts" / "references"


def get_api_key():
    key = os.environ.get("DEEPSEEK_API_KEY", "")
    if key:
        return key
    # Try compliance profile
    cfg = Path.home() / ".hermes" / "profiles" / "compliance" / "config.yaml"
    if cfg.exists():
        import re
        m = re.search(r'api_key:\s*"?(sk-[A-Za-z0-9_\-]+)"?', cfg.read_text())
        if m:
            return m.group(1)
    return ""


def call_llm(client, system_prompt, user_prompt, max_tokens=16384):
    response = client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.3,
    )
    return response.choices[0].message.content


def run_engineering(client, regulation_name, source_body):
    print("\n━━━ Engineering Agent ━━━")

    obligations_path = EXTRACTED / "obligations.json"
    if not obligations_path.exists():
        print("  ERROR: obligations.json not found")
        return False

    obligations = json.loads(obligations_path.read_text())
    controls_path = REFS / "controls.md"
    inventory_path = REFS / "system-inventory.md"

    controls = controls_path.read_text() if controls_path.exists() else "No controls reference found."
    inventory = inventory_path.read_text() if inventory_path.exists() else "No system inventory found."

    system_prompt = """You are the Engineering-Compliance agent. Act as a PRODUCT MANAGER for the engineering team.
Translate the regulation into concrete engineering requirements the team can build against.
Output EXACTLY ONE markdown file. Do NOT create multiple files."""

    user_prompt = f"""Regulation: {regulation_name}
Issuing Body: {source_body}

Compliance Obligations:
{json.dumps(obligations, indent=2)}

Control Framework Reference:
{controls}

System Inventory:
{inventory}

Produce an engineering requirements document with:
1. A one-paragraph summary
2. A numbered list of requirements. For EACH requirement include:
   - Requirement ID (REQ-1, REQ-2, ...)
   - Obligation it satisfies (the real id from obligations.json)
   - Requirement statement (what engineering must build)
   - Acceptance criteria
   - Priority (P0 / P1 / P2)
   - Affected system(s) from system-inventory.md

Return the COMPLETE markdown document content."""

    try:
        content = call_llm(client, system_prompt, user_prompt)
        ENGINEERING_OUT.mkdir(parents=True, exist_ok=True)
        out_file = ENGINEERING_OUT / "engineering-requirements.md"
        out_file.write_text(content, encoding="utf-8")
        print(f"  Wrote: {out_file} ({len(content)} chars)")

        # Write handoff
        handoff = {
            "from": "engineering-agent",
            "to": "coordinator",
            "status": "complete",
            "regulation_name": regulation_name,
            "source_body": source_body,
            "artifacts": ["engineering-requirements.md"],
        }
        (HANDOFFS / "engineering-to-coordinator.md").write_text(json.dumps(handoff, indent=2))
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def run_marketing(client, regulation_name, source_body):
    print("\n━━━ Marketing Agent ━━━")

    obligations_path = EXTRACTED / "obligations.json"
    if not obligations_path.exists():
        print("  ERROR: obligations.json not found")
        return False

    obligations = json.loads(obligations_path.read_text())

    system_prompt = """You are the Marketing-Compliance agent. Act as a PRODUCT MANAGER for the marketing team.
Translate the regulation into concrete marketing compliance requirements.
Output EXACTLY ONE markdown file. Do NOT create multiple files."""

    user_prompt = f"""Regulation: {regulation_name}
Issuing Body: {source_body}

Compliance Obligations:
{json.dumps(obligations, indent=2)}

Marketing channels/practices to consider: promotional email, SMS, WhatsApp outreach,
web signup/consent forms, ad targeting & retargeting, analytics/tracking pixels,
purchased/imported lead lists.

Produce a marketing compliance requirements document with:
1. A one-paragraph summary
2. A numbered list of requirements. For EACH requirement include:
   - Requirement ID (MREQ-1, MREQ-2, ...)
   - Obligation it satisfies (the real id from obligations.json)
   - Requirement statement (what marketing must change or do)
   - Acceptance criteria
   - Priority (P0 / P1 / P2)
   - Affected channel/practice

Return the COMPLETE markdown document content."""

    try:
        content = call_llm(client, system_prompt, user_prompt)
        MARKETING_OUT.mkdir(parents=True, exist_ok=True)
        out_file = MARKETING_OUT / "marketing-requirements.md"
        out_file.write_text(content, encoding="utf-8")
        print(f"  Wrote: {out_file} ({len(content)} chars)")

        # Write handoff
        handoff = {
            "from": "marketing-agent",
            "to": "coordinator",
            "status": "complete",
            "regulation_name": regulation_name,
            "source_body": source_body,
            "artifacts": ["marketing-requirements.md"],
        }
        (HANDOFFS / "marketing-to-coordinator.md").write_text(json.dumps(handoff, indent=2))
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def run_consolidator(client, regulation_name, source_body):
    print("\n━━━ Consolidator ━━━")

    eng_path = ENGINEERING_OUT / "engineering-requirements.md"
    mkt_path = MARKETING_OUT / "marketing-requirements.md"

    if not eng_path.exists():
        print("  ERROR: engineering-requirements.md not found")
        return False
    if not mkt_path.exists():
        print("  ERROR: marketing-requirements.md not found")
        return False

    eng_content = eng_path.read_text()
    mkt_content = mkt_path.read_text()

    system_prompt = """You are the Consolidator. Merge the department requirements into ONE executive compliance report for leadership.
Output EXACTLY ONE markdown file. Do NOT create multiple files."""

    user_prompt = f"""Regulation: {regulation_name}
Issuing Body: {source_body}

Engineering Requirements:
{eng_content}

Marketing Requirements:
{mkt_content}

Produce a final compliance report containing:
1. Executive summary — 2-3 sentences on what the regulation demands across departments.
2. Consolidated priority table — P0 items first; columns: Requirement ID (REQ-*/MREQ-*), Department, Obligation, One-line action.
3. Cross-cutting themes — where engineering and marketing overlap (e.g. consent, erasure, retention) and shared dependencies.
4. Recommended sequencing — what to build/do first.

Return the COMPLETE markdown document content."""

    try:
        content = call_llm(client, system_prompt, user_prompt)
        CONSOLIDATED_OUT.mkdir(parents=True, exist_ok=True)
        out_file = CONSOLIDATED_OUT / "final-report.md"
        out_file.write_text(content, encoding="utf-8")
        print(f"  Wrote: {out_file} ({len(content)} chars)")

        # Write handoff
        handoff = {
            "from": "consolidator",
            "to": "coordinator",
            "status": "complete",
            "regulation_name": regulation_name,
            "source_body": source_body,
            "artifacts": ["final-report.md"],
        }
        (HANDOFFS / "consolidation-complete.md").write_text(json.dumps(handoff, indent=2))
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Run the compliance pipeline")
    parser.add_argument("--regulation", default=None, help="Regulation name")
    parser.add_argument("--body", default=None, help="Issuing body")
    args = parser.parse_args()

    api_key = get_api_key()
    if not api_key:
        print("ERROR: No DeepSeek API key found.")
        print("Set DEEPSEEK_API_KEY environment variable or configure ~/.hermes/profiles/compliance/config.yaml")
        sys.exit(1)

    # Get regulation info from handoff or args
    regulation_name = args.regulation
    source_body = args.body

    if not regulation_name or not source_body:
        handoff_path = HANDOFFS / "monitor-to-coordinator.md"
        if handoff_path.exists():
            try:
                h = json.loads(handoff_path.read_text())
                regulation_name = regulation_name or h.get("regulation_name", "Unknown")
                source_body = source_body or h.get("source_body", "Unknown")
            except Exception:
                pass

    if not regulation_name:
        regulation_name = "Unknown Regulation"
    if not source_body:
        source_body = "Unknown Body"

    print(f"━━━ Compliance Pipeline ━━━")
    print(f"  Regulation: {regulation_name}")
    print(f"  Source Body: {source_body}")

    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com/v1")

    # Run pipeline steps
    eng_ok = run_engineering(client, regulation_name, source_body)
    mkt_ok = run_marketing(client, regulation_name, source_body)
    con_ok = run_consolidator(client, regulation_name, source_body)

    # Summary
    print("\n━━━ Pipeline Summary ━━━")
    for name, ok, path in [
        ("Engineering", eng_ok, ENGINEERING_OUT / "engineering-requirements.md"),
        ("Marketing", mkt_ok, MARKETING_OUT / "marketing-requirements.md"),
        ("Consolidator", con_ok, CONSOLIDATED_OUT / "final-report.md"),
    ]:
        status = "✓" if ok and path.exists() else "✗"
        print(f"  {status} {name}: {path}")

    if eng_ok and mkt_ok and con_ok:
        print("\n✓ Pipeline complete!")
    else:
        print("\n✗ Pipeline completed with errors")
        sys.exit(1)


if __name__ == "__main__":
    main()
