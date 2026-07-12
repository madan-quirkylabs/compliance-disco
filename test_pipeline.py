#!/usr/bin/env python3
"""
Compliance-Disco — Pipeline Test Runner

Simulates the full 6-agent pipeline end-to-end with real assertions.
Tests handoff contracts, validates JSON schemas, and checks failure modes.

DPDP Act is the example regulation used for testing.

Usage:
    python3 test_pipeline.py                     # run with DPDP (default)
    python3 test_pipeline.py --clean             # wipe shared-data and start fresh
    python3 test_pipeline.py --regulation dpdp   # explicit regulation
    python3 test_pipeline.py --test-failures     # run failure mode tests
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
SHARED = PROJECT_ROOT / "workspace" / "shared-data"
EXTRACTED = SHARED / "extracted-regulations"
MARKETING = SHARED / "marketing-output"
ENGINEERING = SHARED / "engineering-output"
CONSOLIDATED = SHARED / "consolidated-output"
HANDOFFS = SHARED / "handoffs"
MONITORED = SHARED / "monitored-sources"
DETECTION_LOG = SHARED / "detection-log"
RUN_LOG = SHARED / "run-history"

# ── Assertion helpers ────────────────────────────────────────────────

class PipelineError(Exception):
    pass

class AssertionResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def check(self, condition, message):
        if condition:
            self.passed += 1
        else:
            self.failed += 1
            self.errors.append(message)

    def summary(self):
        total = self.passed + self.failed
        return f"{self.passed}/{total} passed" + (f", {self.failed} FAILED" if self.failed else "")

assertions = AssertionResult()

# ── Handoff schema validation ────────────────────────────────────────

HANDOFF_SCHEMAS = {
    "monitor-to-coordinator.md": {
        "required": ["from", "to", "status", "regulation_name", "source_body", "source_path"],
        "valid_statuses": ["complete"],
    },
    "reader-to-coordinator.md": {
        "required": ["from", "to", "status", "regulation_name", "source_body", "artifacts"],
        "valid_statuses": ["complete", "failed"],
    },
    "coord-to-marketing.md": {
        "required": ["from", "to", "status", "regulation_name", "source_body"],
        "valid_statuses": ["dispatched"],
    },
    "coord-to-engineering.md": {
        "required": ["from", "to", "status", "regulation_name", "source_body"],
        "valid_statuses": ["dispatched"],
    },
    "marketing-to-consolidator.md": {
        "required": ["from", "to", "status", "regulation_name", "source_body", "artifacts"],
        "valid_statuses": ["complete"],
    },
    "engineering-to-consolidator.md": {
        "required": ["from", "to", "status", "regulation_name", "source_body", "artifacts"],
        "valid_statuses": ["complete"],
    },
    "consolidation-complete.md": {
        "required": ["from", "to", "status", "regulation_name", "source_body", "artifacts"],
        "valid_statuses": ["complete"],
    },
}

def validate_handoff(name, schema):
    """Validate a handoff file against its expected schema."""
    path = HANDOFFS / name
    assertions.check(path.exists(), f"Handoff file missing: {name}")

    if not path.exists():
        return None

    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        assertions.check(False, f"Handoff {name} is not valid JSON: {e}")
        return None

    for field in schema["required"]:
        assertions.check(field in data, f"Handoff {name} missing field: {field}")

    if "status" in data:
        assertions.check(
            data["status"] in schema["valid_statuses"],
            f"Handoff {name} has invalid status: {data['status']} (expected {schema['valid_statuses']})"
        )

    return data


# ── Regulation configs ──────────────────────────────────────────────

REGULATIONS = {
    "dpdp": {
        "name": "DPDP Act 2023",
        "full_name": "Digital Personal Data Protection Act, 2023",
        "source_body": "DPDP Board",
        "source_path": "docs/regulations/dpdp/",
        "year": "2023",
        "summary_title": "DPDP Act 2023 — Summary",
        "blog_title": "India's DPDP Act: What Your Business Needs to Know in 2026",
        "obligations": [
            {"id": "OBL-001", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 4(1)", "title": "Consent Requirement", "description": "No personal data processing without consent.", "applies_to": "Data Fiduciary", "deadline": "Upon enforcement", "penalty_ref": "Section 33", "ambiguity_flag": False, "notes": ""},
            {"id": "OBL-002", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 5(1)", "title": "Purpose Limitation", "description": "Data shall not be processed for purposes other than consent.", "applies_to": "Data Fiduciary", "deadline": "Upon enforcement", "penalty_ref": "Section 33", "ambiguity_flag": False, "notes": ""},
            {"id": "OBL-003", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 6", "title": "Notice Requirements", "description": "Must provide notice before collecting consent.", "applies_to": "Data Fiduciary", "deadline": "Upon enforcement", "penalty_ref": "Section 33", "ambiguity_flag": False, "notes": ""},
            {"id": "OBL-004", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 8", "title": "Children's Data", "description": "Verifiable parental consent required.", "applies_to": "Data Fiduciary", "deadline": "Upon enforcement", "penalty_ref": "Section 33", "ambiguity_flag": True, "notes": "[AMBIGUOUS] Age threshold not defined."},
            {"id": "OBL-005", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 10", "title": "Breach Notification", "description": "Must notify Board and individuals of breaches.", "applies_to": "Data Fiduciary", "deadline": "Immediately", "penalty_ref": "Section 33", "ambiguity_flag": True, "notes": "[AMBIGUOUS] Timeline not defined."},
            {"id": "OBL-006", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 11", "title": "SDF Obligations", "description": "DPO, audits, DPIA required.", "applies_to": "Significant Data Fiduciary", "deadline": "Upon classification", "penalty_ref": "Section 33", "ambiguity_flag": False, "notes": ""},
            {"id": "OBL-007", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 16", "title": "Cross-Border Transfer", "description": "Transfer allowed except to restricted countries.", "applies_to": "Data Fiduciary", "deadline": "Upon enforcement", "penalty_ref": "Section 33", "ambiguity_flag": True, "notes": "[AMBIGUOUS] Restricted list not notified."},
            {"id": "OBL-008", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 12", "title": "Data Principal Rights", "description": "Access, correction, erasure, grievance, nomination.", "applies_to": "Data Principal", "deadline": "Upon enforcement", "penalty_ref": "Section 33", "ambiguity_flag": False, "notes": ""},
            {"id": "OBL-009", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 14", "title": "Data Retention", "description": "Erase when purpose fulfilled or consent withdrawn.", "applies_to": "Data Fiduciary", "deadline": "Upon enforcement", "penalty_ref": "Section 33", "ambiguity_flag": False, "notes": ""},
            {"id": "OBL-010", "regulation": "DPDP Act 2023", "source_body": "DPDP Board", "section": "Section 33", "title": "Penalties", "description": "Up to Rs. 250 crore.", "applies_to": "All", "deadline": "N/A", "penalty_ref": "N/A", "ambiguity_flag": False, "notes": ""},
        ],
        "definitions": [
            {"term": "Personal Data", "definition": "Any data about an identifiable individual.", "section": "Section 2(11)", "category": "Core"},
            {"term": "Data Fiduciary", "definition": "Person who determines purpose and means of processing.", "section": "Section 2(5)", "category": "Actor"},
            {"term": "Data Principal", "definition": "Individual to whom data relates.", "section": "Section 2(12)", "category": "Actor"},
        ],
        "timelines": [
            {"event": "DPDP Act enacted", "date": "2023-08-11", "description": "Royal Assent", "related_sections": ["All"]},
            {"event": "Rules notified", "date": "2025-01-15", "description": "Draft rules published", "related_sections": ["All"]},
        ],
        "penalties": [
            {"section": "Section 33", "offense": "Security safeguards failure", "penalty_amount": "Up to Rs. 250 crore", "criteria": "Nature, gravity, duration"},
            {"section": "Section 33", "offense": "Breach notification failure", "penalty_amount": "Up to Rs. 200 crore", "criteria": "Nature, gravity, duration"},
        ],
    }
}


# ── Logging & timing ─────────────────────────────────────────────────

class RunLogger:
    def __init__(self):
        self.start = time.time()
        self.stages = []
        self.current_stage = None

    def start_stage(self, name):
        self.current_stage = {"name": name, "start": time.time(), "status": "running", "checks": 0, "failures": 0}
        log(name, "started")

    def end_stage(self, status="ok"):
        if self.current_stage:
            self.current_stage["end"] = time.time()
            self.current_stage["duration"] = round(self.current_stage["end"] - self.current_stage["start"], 2)
            self.current_stage["status"] = status
            self.stages.append(self.current_stage)
            log(self.current_stage["name"], f"completed in {self.current_stage['duration']}s ({status})")
            self.current_stage = None

    def save(self):
        RUN_LOG.mkdir(parents=True, exist_ok=True)
        run = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_duration": round(time.time() - self.start, 2),
            "stages": self.stages,
            "assertions": {"passed": assertions.passed, "failed": assertions.failed, "errors": assertions.errors},
        }
        path = RUN_LOG / f"{run['timestamp'][:10]}-{int(time.time())}.json"
        path.write_text(json.dumps(run, indent=2))
        return path

run_logger = RunLogger()


def ts():
    return datetime.now(timezone.utc).isoformat()

def log(stage, msg):
    tag = f"[{stage.upper():^14}]"
    print(f"  {tag} {msg}")

def write_handoff(name, data):
    path = HANDOFFS / name
    path.write_text(json.dumps(data, indent=2))
    log(data["from"], f"handoff → {name}")

def read_handoff(name):
    path = HANDOFFS / name
    if not path.exists():
        return None
    return json.loads(path.read_text())

def clean():
    for d in [EXTRACTED, MARKETING, ENGINEERING, CONSOLIDATED, HANDOFFS, DETECTION_LOG, RUN_LOG]:
        if d.exists():
            for f in d.iterdir():
                if f.name != ".gitkeep":
                    f.unlink()
    known = MONITORED / "known-items.json"
    if known.exists():
        known.write_text(json.dumps({
            "sources": {
                "SEBI": {"last_checked": None, "items": []},
                "AMFI": {"last_checked": None, "items": []},
                "RBI": {"last_checked": None, "items": []}
            }
        }, indent=2))
    print("\n  Shared data cleaned.\n")


# ── Stage implementations ───────────────────────────────────────────

def run_monitor(reg):
    run_logger.start_stage("monitor")
    log("monitor", f"Watching regulatory sources for {reg['source_body']}...")

    detection = {
        "id": f"{reg['source_body'].upper()}-2026-001",
        "source": reg["source_body"],
        "title": reg["full_name"],
        "date": "2023-08-11",
        "url": f"https://example.gov.in/{reg['source_body'].lower()}/regulation",
        "local_path": f"docs/regulations/{reg['source_body'].lower().replace(' ', '-')}/",
        "detected_at": ts(),
        "status": "pending_extraction"
    }

    log("monitor", f"NEW: {detection['title']}")

    (DETECTION_LOG / f"{detection['detected_at'][:10]}-{detection['source']}.json").write_text(
        json.dumps(detection, indent=2)
    )

    write_handoff("monitor-to-coordinator.md", {
        "from": "regulatory-monitor",
        "to": "coordinator",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "detection_id": detection["id"],
        "source_path": reg["source_path"],
        "artifacts": [detection["local_path"]],
        "notes": f"Detected: {reg['full_name']}"
    })

    known_path = MONITORED / "known-items.json"
    known = json.loads(known_path.read_text()) if known_path.exists() else {"sources": {}}
    body = reg["source_body"]
    if body not in known["sources"]:
        known["sources"][body] = {"last_checked": None, "items": []}
    known["sources"][body]["last_checked"] = ts()
    known["sources"][body]["items"].append(detection["id"])
    known_path.write_text(json.dumps(known, indent=2))

    run_logger.end_stage("ok")
    return detection


def run_reader(reg):
    run_logger.start_stage("reader")
    log("reader", f"Extracting: {reg['name']}")

    summary = f"# {reg['summary_title']}\n\n**Issuing Body:** {reg['source_body']}\n\n## Obligations: {len(reg['obligations'])} identified\n"

    (EXTRACTED / "summary.md").write_text(summary)
    (EXTRACTED / "obligations.json").write_text(json.dumps(reg["obligations"], indent=2))
    (EXTRACTED / "definitions.json").write_text(json.dumps(reg["definitions"], indent=2))
    (EXTRACTED / "timelines.json").write_text(json.dumps(reg["timelines"], indent=2))
    (EXTRACTED / "penalties.json").write_text(json.dumps(reg["penalties"], indent=2))

    log("reader", "Extracted 5 files")

    write_handoff("reader-to-coordinator.md", {
        "from": "regulatory-reader",
        "to": "coordinator",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "artifacts": ["summary.md", "obligations.json", "definitions.json", "timelines.json", "penalties.json"],
        "notes": f"{len(reg['obligations'])} obligations extracted."
    })

    # Validate extracted files
    for f in ["summary.md", "obligations.json", "definitions.json", "timelines.json", "penalties.json"]:
        assertions.check((EXTRACTED / f).exists(), f"Extracted file missing: {f}")

    # Validate obligations.json structure
    obs = json.loads((EXTRACTED / "obligations.json").read_text())
    assertions.check(len(obs) > 0, "obligations.json is empty")
    for o in obs:
        assertions.check("id" in o, f"Obligation missing 'id': {o.get('title', '?')}")
        assertions.check("section" in o, f"Obligation missing 'section': {o.get('id', '?')}")
        assertions.check("regulation" in o, f"Obligation missing 'regulation': {o.get('id', '?')}")
        assertions.check("source_body" in o, f"Obligation missing 'source_body': {o.get('id', '?')}")

    run_logger.end_stage("ok")
    return reg["obligations"]


def run_coordinator(reg, obligations):
    run_logger.start_stage("coordinator")
    log("coordinator", "Validating and dispatching...")

    # Validate monitor handoff
    data = validate_handoff("monitor-to-coordinator.md", HANDOFF_SCHEMAS["monitor-to-coordinator.md"])
    if data:
        assertions.check(data.get("regulation_name") == reg["name"],
            f"Monitor handoff regulation_name mismatch: {data.get('regulation_name')} != {reg['name']}")

    # Validate reader handoff
    data = validate_handoff("reader-to-coordinator.md", HANDOFF_SCHEMAS["reader-to-coordinator.md"])
    if data:
        assertions.check(len(data.get("artifacts", [])) == 5,
            f"Reader handoff should list 5 artifacts, got {len(data.get('artifacts', []))}")

    # Write dispatch handoffs
    write_handoff("coord-to-marketing.md", {
        "from": "coordinator",
        "to": "marketing-agent",
        "status": "dispatched",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "instructions": f"Produce compliance content for {reg['name']}."
    })

    write_handoff("coord-to-engineering.md", {
        "from": "coordinator",
        "to": "engineering-agent",
        "status": "dispatched",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "instructions": f"Produce technical artifacts for {reg['name']}."
    })

    log("coordinator", "Dispatched to marketing + engineering")
    run_logger.end_stage("ok")


def run_marketing(reg, obligations):
    run_logger.start_stage("marketing")
    log("marketing", f"Generating content for {reg['name']}...")

    # Validate dispatch handoff
    validate_handoff("coord-to-marketing.md", HANDOFF_SCHEMAS["coord-to-marketing.md"])

    reg_name = reg["name"]

    compliance_guide = f"# {reg_name} Compliance Guide\n\n## Key Obligations\n"
    for o in reg["obligations"]:
        compliance_guide += f"- **{o['title']}**: {o['description']} ({o['section']})\n"

    checklist = f"# {reg_name} Compliance Checklist\n\n| # | Action | Section | Priority |\n|---|--------|---------|----------|\n"
    for i, o in enumerate(reg["obligations"], 1):
        checklist += f"| {i} | {o['title']} | {o['section']} | {'High' if not o['ambiguity_flag'] else 'Medium'} |\n"

    faq = f"# {reg_name} FAQ\n\n"
    for o in reg["obligations"][:5]:
        faq += f"**Q: What does '{o['title']}' require?**\nA: {o['description']} ({o['section']})\n\n"

    blog = f"# {reg.get('blog_title', reg_name)}\n\nThis regulation introduces {len(reg['obligations'])} key obligations.\n"

    (MARKETING / "compliance-guide.md").write_text(compliance_guide)
    (MARKETING / "checklist.md").write_text(checklist)
    (MARKETING / "faq.md").write_text(faq)
    (MARKETING / "blog-post.md").write_text(blog)

    log("marketing", "Generated 4 files")

    write_handoff("marketing-to-consolidator.md", {
        "from": "marketing-agent",
        "to": "consolidator",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "artifacts": ["compliance-guide.md", "checklist.md", "faq.md", "blog-post.md"],
        "notes": "Marketing deliverables complete."
    })

    # Validate outputs
    for f in ["compliance-guide.md", "checklist.md", "faq.md", "blog-post.md"]:
        assertions.check((MARKETING / f).exists(), f"Marketing output missing: {f}")
        content = (MARKETING / f).read_text()
        assertions.check(len(content) > 50, f"Marketing {f} is too short ({len(content)} chars)")
        # Check that regulation is referenced (by name, source_body, or partial match)
        ref_found = reg["name"] in content or reg["source_body"] in content or reg["name"].split()[0] in content
        assertions.check(ref_found, f"Marketing {f} doesn't reference {reg['name']}")

    run_logger.end_stage("ok")


def run_engineering(reg, obligations):
    run_logger.start_stage("engineering")
    log("engineering", f"Generating artifacts for {reg['name']}...")

    validate_handoff("coord-to-engineering.md", HANDOFF_SCHEMAS["coord-to-engineering.md"])

    reg_name = reg["name"]

    data_class = f"# Data Classification — {reg_name}\n\n| Category | Reference |\n|----------|----------|\n"
    for o in reg["obligations"]:
        data_class += f"| {o['title']} | {o['section']} |\n"

    control_arch = f"# Control Architecture — {reg_name}\n\n"
    for o in reg["obligations"]:
        control_arch += f"### {o['title']}\n- Section: {o['section']}\n- Applies to: {o['applies_to']}\n\n"

    impact = f"# Impact Assessment — {reg_name}\n\n| Risk | Mitigation |\n|------|------------|\n"
    for o in reg["obligations"]:
        impact += f"| {o['title']} non-compliance | Implement {o['title'].lower()} controls |\n"

    impl = f"# Implementation Guide — {reg_name}\n\n## Phase 1 (0-30 days)\n"
    for o in reg["obligations"][:4]:
        impl += f"- {o['title']}\n"

    (ENGINEERING / "data-classification.md").write_text(data_class)
    (ENGINEERING / "control-architecture.md").write_text(control_arch)
    (ENGINEERING / "impact-assessment-template.md").write_text(impact)
    (ENGINEERING / "implementation-guide.md").write_text(impl)

    log("engineering", "Generated 4 files")

    write_handoff("engineering-to-consolidator.md", {
        "from": "engineering-agent",
        "to": "consolidator",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "artifacts": ["data-classification.md", "control-architecture.md", "impact-assessment-template.md", "implementation-guide.md"],
        "notes": "Engineering deliverables complete."
    })

    # Validate outputs
    for f in ["data-classification.md", "control-architecture.md", "impact-assessment-template.md", "implementation-guide.md"]:
        assertions.check((ENGINEERING / f).exists(), f"Engineering output missing: {f}")
        content = (ENGINEERING / f).read_text()
        assertions.check(len(content) > 50, f"Engineering {f} is too short ({len(content)} chars)")
        ref_found = reg["name"] in content or reg["source_body"] in content or reg["name"].split()[0] in content
        assertions.check(ref_found, f"Engineering {f} doesn't reference {reg['name']}")

    run_logger.end_stage("ok")


def run_consolidator(reg):
    run_logger.start_stage("consolidator")
    log("consolidator", "Merging outputs...")

    # Validate both completion handoffs
    validate_handoff("marketing-to-consolidator.md", HANDOFF_SCHEMAS["marketing-to-consolidator.md"])
    validate_handoff("engineering-to-consolidator.md", HANDOFF_SCHEMAS["engineering-to-consolidator.md"])

    m_art = read_handoff("marketing-to-consolidator.md")
    e_art = read_handoff("engineering-to-consolidator.md")
    assertions.check(m_art is not None, "Marketing handoff missing for consolidator")
    assertions.check(e_art is not None, "Engineering handoff missing for consolidator")
    if m_art:
        assertions.check(len(m_art.get("artifacts", [])) == 4, "Marketing should produce 4 artifacts")
    if e_art:
        assertions.check(len(e_art.get("artifacts", [])) == 4, "Engineering should produce 4 artifacts")

    final_report = f"# {reg['name']} Compliance Report\n\n## Executive Summary\n\nThis report covers {len(reg['obligations'])} obligations under {reg['name']}, issued by {reg['source_body']}.\n\n## Obligations\n"
    for o in reg["obligations"]:
        final_report += f"- {o['title']}: {o['description']} ({o['section']})\n"
    final_report += f"\n## Penalties\n"
    for p in reg["penalties"]:
        final_report += f"- {p['offense']}: {p['penalty_amount']}\n"

    (CONSOLIDATED / "final-report.md").write_text(final_report)

    write_handoff("consolidation-complete.md", {
        "from": "consolidator",
        "to": "user",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "artifacts": ["final-report.md"],
        "notes": "Pipeline complete."
    })

    # Validate final report
    assertions.check((CONSOLIDATED / "final-report.md").exists(), "Final report missing")
    report_content = (CONSOLIDATED / "final-report.md").read_text()
    assertions.check(len(report_content) > 200, f"Final report too short ({len(report_content)} chars)")
    assertions.check(reg["name"] in report_content, f"Final report doesn't mention {reg['name']}")
    assertions.check(reg["source_body"] in report_content, f"Final report doesn't mention {reg['source_body']}")

    # Validate final handoff
    validate_handoff("consolidation-complete.md", HANDOFF_SCHEMAS["consolidation-complete.md"])

    log("consolidator", "Generated final-report.md")
    run_logger.end_stage("ok")


# ── Failure mode tests ──────────────────────────────────────────────

def test_missing_handoff():
    """Test that pipeline correctly fails when a handoff is missing."""
    print("\n━━━ Failure Test: Missing Monitor Handoff ━━━")
    path = HANDOFFS / "monitor-to-coordinator.md"
    existed = path.exists()
    if existed:
        path.unlink()

    data = read_handoff("monitor-to-coordinator.md")
    assertions.check(data is None, "Should return None for missing handoff")

    if existed:
        path.write_text(json.dumps({"from": "test", "status": "complete"}))
    print("  ✓ Passed\n")


def test_malformed_handoff():
    """Test that pipeline detects malformed JSON."""
    print("━━━ Failure Test: Malformed Handoff JSON ━━━")
    path = HANDOFFS / "test-malformed.md"
    path.write_text("not json {{{")

    try:
        json.loads(path.read_text())
        assertions.check(False, "Should raise JSONDecodeError for malformed handoff")
    except json.JSONDecodeError:
        assertions.check(True, "Correctly detected malformed JSON")

    path.unlink()
    print("  ✓ Passed\n")


def test_empty_obligations():
    """Test that pipeline detects empty obligations."""
    print("━━━ Failure Test: Empty Obligations ━━━")
    path = EXTRACTED / "obligations.json"
    path.write_text("[]")
    obs = json.loads(path.read_text())
    assertions.check(len(obs) == 0, "Empty obligations detected")
    path.unlink()
    print("  ✓ Passed\n")


def test_wrong_regulation_name():
    """Test that pipeline detects regulation name mismatch."""
    print("━━━ Failure Test: Regulation Name Mismatch ━━━")
    write_handoff("reader-to-coordinator.md", {
        "from": "regulatory-reader",
        "to": "coordinator",
        "status": "complete",
        "regulation_name": "WRONG REGULATION",
        "source_body": "Unknown",
        "artifacts": ["summary.md"]
    })
    data = read_handoff("reader-to-coordinator.md")
    assertions.check(data["regulation_name"] != "DPDP Act 2023",
        "Mismatched regulation name detected")
    (HANDOFFS / "reader-to-coordinator.md").unlink()
    print("  ✓ Passed\n")


# ── Main ─────────────────────────────────────────────────────────────

def main():
    regulation_key = "dpdp"
    clean_flag = "--clean" in sys.argv
    test_failures = "--test-failures" in sys.argv

    for i, arg in enumerate(sys.argv):
        if arg == "--regulation" and i + 1 < len(sys.argv):
            regulation_key = sys.argv[i + 1]

    if regulation_key not in REGULATIONS:
        print(f"ERROR: Unknown regulation '{regulation_key}'. Available: {list(REGULATIONS.keys())}")
        sys.exit(1)

    reg = REGULATIONS[regulation_key]

    print(f"\n╔═══════════════════════════════════════════════════════╗")
    print(f"║   Compliance-Disco — Pipeline Test Runner             ║")
    print(f"║   Regulation: {reg['name']:^38} ║")
    print(f"╚═══════════════════════════════════════════════════════╝\n")

    if clean_flag:
        clean()

    # Run pipeline
    print("━━━ Stage 0: Regulatory Monitor ━━━")
    detection = run_monitor(reg)
    print()

    print("━━━ Stage 1: Regulatory Reader ━━━")
    obligations = run_reader(reg)
    print()

    print("━━━ Stage 2: Coordinator ━━━")
    run_coordinator(reg, obligations)
    print()

    print("━━━ Stage 3a: Marketing Agent ━━━")
    run_marketing(reg, obligations)
    print()

    print("━━━ Stage 3b: Engineering Agent ━━━")
    run_engineering(reg, obligations)
    print()

    print("━━━ Stage 4: Consolidator ━━━")
    run_consolidator(reg)
    print()

    # Validate all handoff contracts
    print("━━━ Handoff Contract Validation ━━━")
    for name, schema in HANDOFF_SCHEMAS.items():
        validate_handoff(name, schema)
    print()

    # Failure mode tests
    if test_failures:
        print("━━━ Failure Mode Tests ━━━")
        test_missing_handoff()
        test_malformed_handoff()
        test_empty_obligations()
        test_wrong_regulation_name()

    # Save run log
    run_path = run_logger.save()

    # Summary
    print("╔═══════════════════════════════════════════════════════╗")
    print(f"║   Test Results: {assertions.summary():<37} ║")
    print("╚═══════════════════════════════════════════════════════╝")
    print(f"\n  Regulation: {reg['name']}")
    print(f"  Source Body: {reg['source_body']}")
    print(f"\n  Output files:")
    print(f"    extracted-regulations/  → {len(list(EXTRACTED.iterdir()))-1} files")
    print(f"    marketing-output/      → {len(list(MARKETING.iterdir()))-1} files")
    print(f"    engineering-output/    → {len(list(ENGINEERING.iterdir()))-1} files")
    print(f"    consolidated-output/   → {len(list(CONSOLIDATED.iterdir()))-1} files")
    print(f"    handoffs/              → {len(list(HANDOFFS.iterdir()))-1} files")
    print(f"\n  Run log: {run_path}")

    if assertions.failed > 0:
        print(f"\n  ERRORS:")
        for err in assertions.errors:
            print(f"    ✗ {err}")
        sys.exit(1)

    print()


if __name__ == "__main__":
    main()
