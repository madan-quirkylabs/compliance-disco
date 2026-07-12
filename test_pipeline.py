#!/usr/bin/env python3
"""
Compliance-Disco — Pipeline Test Runner

Simulates the full 6-agent pipeline end-to-end.
Creates sample outputs at each stage, writes handoff files,
and validates the handoff protocol works.

DPDP Act is the example regulation used for testing.

Usage:
    python3 test_pipeline.py                     # run with DPDP (default)
    python3 test_pipeline.py --clean             # wipe shared-data and start fresh
    python3 test_pipeline.py --regulation dpdp   # explicit regulation
"""

import json
import os
import sys
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

# ── Regulation configs (add more as needed) ──────────────────────────

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
            {
                "id": "OBL-001",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 4(1)",
                "title": "Consent Requirement",
                "description": "No personal data processing without clear, specific, informed, unconditional consent from the data principal.",
                "applies_to": "Data Fiduciary",
                "deadline": "Upon enforcement",
                "penalty_ref": "Section 33",
                "ambiguity_flag": False,
                "notes": ""
            },
            {
                "id": "OBL-002",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 5(1)",
                "title": "Purpose Limitation",
                "description": "Personal data shall not be processed for purposes other than the purpose for which consent was given.",
                "applies_to": "Data Fiduciary",
                "deadline": "Upon enforcement",
                "penalty_ref": "Section 33",
                "ambiguity_flag": False,
                "notes": ""
            },
            {
                "id": "OBL-003",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 6",
                "title": "Notice Requirements",
                "description": "Data fiduciary must provide a notice in clear, plain language before collecting consent.",
                "applies_to": "Data Fiduciary",
                "deadline": "Upon enforcement",
                "penalty_ref": "Section 33",
                "ambiguity_flag": False,
                "notes": ""
            },
            {
                "id": "OBL-004",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 8",
                "title": "Children's Data Protection",
                "description": "Verifiable parental consent required for processing children's data. Prohibition on tracking and targeted advertising.",
                "applies_to": "Data Fiduciary",
                "deadline": "Upon enforcement",
                "penalty_ref": "Section 33",
                "ambiguity_flag": True,
                "notes": "[AMBIGUOUS] Age threshold not explicitly defined in Act."
            },
            {
                "id": "OBL-005",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 10",
                "title": "Data Breach Notification",
                "description": "Data fiduciary must notify the Data Protection Board and affected data principals in the event of a personal data breach.",
                "applies_to": "Data Fiduciary",
                "deadline": "Immediately upon discovery",
                "penalty_ref": "Section 33",
                "ambiguity_flag": True,
                "notes": "[AMBIGUOUS] Specific notification timeline not defined in Act."
            },
            {
                "id": "OBL-006",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 11",
                "title": "Significant Data Fiduciary Obligations",
                "description": "Additional obligations: appoint DPO, conduct periodic audits, Data Protection Impact Assessment.",
                "applies_to": "Significant Data Fiduciary",
                "deadline": "Upon classification",
                "penalty_ref": "Section 33",
                "ambiguity_flag": False,
                "notes": ""
            },
            {
                "id": "OBL-007",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 16",
                "title": "Cross-Border Data Transfer",
                "description": "Personal data may be transferred outside India except to countries restricted by the Central Government.",
                "applies_to": "Data Fiduciary",
                "deadline": "Upon enforcement",
                "penalty_ref": "Section 33",
                "ambiguity_flag": True,
                "notes": "[AMBIGUOUS] Restricted country list not yet notified."
            },
            {
                "id": "OBL-008",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 12",
                "title": "Data Principal Rights",
                "description": "Rights to: access information, correct inaccurate data, erase personal data, grieve complaints, nominate another person.",
                "applies_to": "Data Principal",
                "deadline": "Upon enforcement",
                "penalty_ref": "Section 33",
                "ambiguity_flag": False,
                "notes": ""
            },
            {
                "id": "OBL-009",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 14",
                "title": "Data Retention Limits",
                "description": "Must erase personal data when consent is withdrawn or purpose is fulfilled, whichever is earlier.",
                "applies_to": "Data Fiduciary",
                "deadline": "Upon enforcement",
                "penalty_ref": "Section 33",
                "ambiguity_flag": False,
                "notes": ""
            },
            {
                "id": "OBL-010",
                "regulation": "DPDP Act 2023",
                "source_body": "DPDP Board",
                "section": "Section 33",
                "title": "Penalty Structure",
                "description": "Penalties up to Rs. 250 crore for various contraventions.",
                "applies_to": "All",
                "deadline": "N/A",
                "penalty_ref": "N/A",
                "ambiguity_flag": False,
                "notes": "Maximum penalty: Rs. 250 crore (~$30M USD)"
            }
        ],
        "definitions": [
            {"term": "Personal Data", "definition": "Any data about an individual who is identifiable by or in relation to such data.", "section": "Section 2(11)", "category": "Core"},
            {"term": "Data Fiduciary", "definition": "Any person who determines the purpose and means of processing personal data.", "section": "Section 2(5)", "category": "Actor"},
            {"term": "Data Principal", "definition": "The individual to whom the personal data relates.", "section": "Section 2(12)", "category": "Actor"},
            {"term": "Consent", "definition": "Any freely given, specific, informed, explicit, and unambiguous indication of the data principal's wishes.", "section": "Section 2(3)", "category": "Core"},
            {"term": "Data Processor", "definition": "Any person who processes personal data on behalf of a data fiduciary.", "section": "Section 2(8)", "category": "Actor"},
            {"term": "Significant Data Fiduciary", "definition": "A data fiduciary notified by the Central Government based on volume and sensitivity of data.", "section": "Section 2(14)", "category": "Actor"}
        ],
        "timelines": [
            {"event": "DPDP Act enacted", "date": "2023-08-11", "description": "Royal Assent", "related_sections": ["All"]},
            {"event": "DPDP Rules notified", "date": "2025-01-15", "description": "Draft rules published", "related_sections": ["All"]},
            {"event": "Compliance deadline (estimated)", "date": "2026-01-01", "description": "Estimated full enforcement", "related_sections": ["4", "5", "6", "10", "11"]}
        ],
        "penalties": [
            {"section": "Section 33", "offense": "Failure to take reasonable security safeguards", "penalty_amount": "Up to Rs. 250 crore", "criteria": "Nature, gravity, duration, type of data, impact"},
            {"section": "Section 33", "offense": "Failure to notify breach", "penalty_amount": "Up to Rs. 200 crore", "criteria": "Nature, gravity, duration, type of data, impact"},
            {"section": "Section 33", "offense": "Non-compliance regarding children", "penalty_amount": "Up to Rs. 200 crore", "criteria": "Nature, gravity, duration, type of data, impact"},
            {"section": "Section 33", "offense": "Breach of any other provision", "penalty_amount": "Up to Rs. 50 crore", "criteria": "Nature, gravity, duration, type of data, impact"}
        ]
    }
}


# ── Helpers ──────────────────────────────────────────────────────────

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
    for d in [EXTRACTED, MARKETING, ENGINEERING, CONSOLIDATED, HANDOFFS]:
        for f in d.iterdir():
            if f.name != ".gitkeep":
                f.unlink()
    # Reset known-items.json
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


# ── Stage 0: Regulatory Monitor ─────────────────────────────────────

def run_monitor(reg):
    log("monitor", f"Watching regulatory sources for {reg['source_body']}...")
    log("monitor", "Checking SEBI circulars page...")
    log("monitor", "Checking AMFI regulations page...")
    log("monitor", "Checking RBI press releases...")

    # Simulate: we found a new regulation from the source body
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

    log("monitor", f"NEW REGULATION DETECTED: {detection['title']}")
    log("monitor", f"  Source: {detection['source']}")
    log("monitor", f"  ID: {detection['id']}")

    # Write detection log
    (DETECTION_LOG / f"{detection['detected_at'][:10]}-{detection['source']}.json").write_text(
        json.dumps(detection, indent=2)
    )

    # Write monitor-to-coordinator handoff
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
        "notes": f"Detected new publication from {reg['source_body']}: {reg['full_name']}"
    })

    # Update known-items.json
    known_path = MONITORED / "known-items.json"
    known = json.loads(known_path.read_text()) if known_path.exists() else {"sources": {}}
    body = reg["source_body"]
    if body not in known["sources"]:
        known["sources"][body] = {"last_checked": None, "items": []}
    known["sources"][body]["last_checked"] = ts()
    known["sources"][body]["items"].append(detection["id"])
    known_path.write_text(json.dumps(known, indent=2))

    log("monitor", f"Updated known-items.json ({len(known['sources'][body]['items'])} items for {body})")
    return detection


# ── Stage 1: Regulatory Reader ──────────────────────────────────────

def run_reader(reg):
    log("reader", "Starting regulatory extraction...")
    log("reader", f"Reading from: {reg['source_path']}")

    # Build summary dynamically
    summary = f"""# {reg['summary_title']}

**Issuing Body:** {reg['source_body']}
**Date:** {reg.get('year', 'N/A')}

## Overview
This regulation establishes compliance requirements for organizations operating
within its jurisdiction. The following is a structured extraction of key
obligations, definitions, timelines, and penalties.

## Key Sections
- Obligations: {len(reg['obligations'])} items identified
- Definitions: {len(reg['definitions'])} terms defined
- Timelines: {len(reg['timelines'])} enforcement milestones
- Penalties: {len(reg['penalties'])} offense categories
"""

    # Write outputs
    (EXTRACTED / "summary.md").write_text(summary)
    (EXTRACTED / "obligations.json").write_text(json.dumps(reg["obligations"], indent=2))
    (EXTRACTED / "definitions.json").write_text(json.dumps(reg["definitions"], indent=2))
    (EXTRACTED / "timelines.json").write_text(json.dumps(reg["timelines"], indent=2))
    (EXTRACTED / "penalties.json").write_text(json.dumps(reg["penalties"], indent=2))

    log("reader", "Extracted 5 files:")
    for f in sorted(EXTRACTED.iterdir()):
        if f.name != ".gitkeep":
            log("reader", f"  ✓ {f.name}")

    # Handoff to coordinator
    write_handoff("reader-to-coordinator.md", {
        "from": "regulatory-reader",
        "to": "coordinator",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "artifacts": ["summary.md", "obligations.json", "definitions.json", "timelines.json", "penalties.json"],
        "notes": f"All {reg['name']} documents processed. {len(reg['obligations'])} obligations extracted."
    })

    return reg["obligations"]


# ── Stage 2: Coordinator ────────────────────────────────────────────

def run_coordinator(reg, obligations):
    log("coordinator", "Waiting for reader handoff...")
    handoff = read_handoff("reader-to-coordinator.md")
    if not handoff or handoff["status"] != "complete":
        log("coordinator", "ERROR: Reader handoff missing or incomplete!")
        return False
    log("coordinator", f"Reader handoff received ({len(handoff['artifacts'])} artifacts)")
    log("coordinator", f"Regulation: {handoff.get('regulation_name', 'unknown')}")

    log("coordinator", "Validating extracted data...")
    expected = ["summary.md", "obligations.json", "definitions.json", "timelines.json", "penalties.json"]
    for f in expected:
        path = EXTRACTED / f
        if not path.exists():
            log("coordinator", f"  ✗ MISSING: {f}")
            return False
        log("coordinator", f"  ✓ {f}")

    log("coordinator", f"Validation passed: {len(obligations)} obligations, 5 files")

    # Write dispatch handoffs with regulation context
    write_handoff("coord-to-marketing.md", {
        "from": "coordinator",
        "to": "marketing-agent",
        "status": "dispatched",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "source_files": [f"workspace/shared-data/extracted-regulations/{f}" for f in expected],
        "output_dir": "workspace/shared-data/marketing-output/",
        "instructions": f"Produce compliance guide, checklist, FAQ, and blog post for {reg['name']}."
    })

    write_handoff("coord-to-engineering.md", {
        "from": "coordinator",
        "to": "engineering-agent",
        "status": "dispatched",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "source_files": [f"workspace/shared-data/extracted-regulations/{f}" for f in expected],
        "output_dir": "workspace/shared-data/engineering-output/",
        "instructions": f"Produce data classification, control architecture, impact assessment template, and implementation guide for {reg['name']}."
    })

    log("coordinator", "Dispatched to marketing and engineering agents")
    return True


# ── Stage 3a: Marketing Agent ───────────────────────────────────────

def run_marketing(reg, obligations):
    log("marketing", "Waiting for coordinator dispatch...")
    handoff = read_handoff("coord-to-marketing.md")
    if not handoff:
        log("marketing", "ERROR: Coordinator dispatch missing!")
        return False
    log("marketing", f"Dispatch received for {handoff.get('regulation_name', 'unknown regulation')}")
    log("marketing", "Starting content generation...")

    reg_name = reg["name"]
    source_body = reg["source_body"]

    compliance_guide = f"""# {reg_name} Compliance Guide

## Who Must Comply?
Any entity that falls under the jurisdiction of {source_body} and processes
data/activities governed by {reg_name}.

## Key Obligations
"""
    for o in reg["obligations"]:
        if o["applies_to"] != "All":
            compliance_guide += f"{reg['obligations'].index(o)+1}. **{o['title']}** — {o['description']} ({o['section']})\n"
    compliance_guide += f"""
## Penalties at a Glance
| Offense | Maximum Fine |
|---------|-------------|
"""
    for p in reg["penalties"]:
        compliance_guide += f"| {p['offense'][:50]} | {p['penalty_amount']} |\n"
    compliance_guide += f"""
## 30-60-90 Day Action Plan
- **Days 1-30:** Map all applicable data/activities, identify compliance gaps
- **Days 31-60:** Implement required controls, update policies and notices
- **Days 61-90:** Set up monitoring, reporting, and ongoing compliance processes
"""

    checklist = f"""# {reg_name} Compliance Checklist

| # | Action Item | Deadline | Responsible Role | Priority | Section |
|---|------------|----------|-----------------|----------|---------|
"""
    for i, o in enumerate(reg["obligations"], 1):
        priority = "High" if not o["ambiguity_flag"] else "Medium"
        checklist += f"| {i} | {o['title']} | {o['deadline']} | Compliance Lead | {priority} | {o['section']} |\n"

    faq = f"""# {reg_name} — Frequently Asked Questions

"""
    for o in reg["obligations"][:6]:
        faq += f"**Q: What does '{o['title']}' require?**\n"
        faq += f"A: {o['description']} ({o['section']})\n\n"

    blog_post = f"""# {reg.get('blog_title', f'{reg_name}: What Your Business Needs to Know')}

{reg_name}, issued by {source_body}, establishes compliance requirements that
affect organizations processing data/activities under its jurisdiction.

## What Changed?
This regulation introduces {len(reg['obligations'])} key obligations with penalties
up to {reg['penalties'][0]['penalty_amount']}.

## The Big Takeaways
"""
    for o in reg["obligations"][:3]:
        blog_post += f"### {o['title']}\n{o['description']}\n\n"
    blog_post += f"""## Start Now
Compliance deadlines are approaching. Start with a gap assessment, implement
required controls, and set up ongoing monitoring.
"""

    (MARKETING / "compliance-guide.md").write_text(compliance_guide)
    (MARKETING / "checklist.md").write_text(checklist)
    (MARKETING / "faq.md").write_text(faq)
    (MARKETING / "blog-post.md").write_text(blog_post)

    log("marketing", "Generated 4 files:")
    for f in sorted(MARKETING.iterdir()):
        if f.name != ".gitkeep":
            log("marketing", f"  ✓ {f.name}")

    write_handoff("marketing-to-consolidator.md", {
        "from": "marketing-agent",
        "to": "consolidator",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "artifacts": ["compliance-guide.md", "checklist.md", "faq.md", "blog-post.md"],
        "notes": f"All marketing deliverables complete for {reg['name']}."
    })

    return True


# ── Stage 3b: Engineering Agent ─────────────────────────────────────

def run_engineering(reg, obligations):
    log("engineering", "Waiting for coordinator dispatch...")
    handoff = read_handoff("coord-to-engineering.md")
    if not handoff:
        log("engineering", "ERROR: Coordinator dispatch missing!")
        return False
    log("engineering", f"Dispatch received for {handoff.get('regulation_name', 'unknown regulation')}")
    log("engineering", "Starting technical artifacts...")

    reg_name = reg["name"]
    source_body = reg["source_body"]

    data_classification = f"""# Data Classification — {reg_name}

## Data Categories Under {reg_name}

| Category | Definition | Reference | Required Controls |
|----------|-----------|-----------|-------------------|
"""
    for o in reg["obligations"]:
        data_classification += f"| {o['title']} | {o['description'][:60]}... | {o['section']} | Consent, audit, monitoring |\n"
    data_classification += f"""
## Suggested Database Schema

```sql
CREATE TABLE data_inventory (
    id              SERIAL PRIMARY KEY,
    data_category   VARCHAR(50) NOT NULL,
    data_type       VARCHAR(100) NOT NULL,
    regulation_ref  VARCHAR(50) NOT NULL,
    collection_purpose TEXT NOT NULL,
    retention_days  INTEGER,
    requires_consent BOOLEAN DEFAULT TRUE,
    section_ref     VARCHAR(20),
    last_reviewed   DATE
);
```

## Retention Policy
- Data must be retained only as long as necessary for the stated purpose
- Implement automated deletion schedules
- Maintain audit logs of all deletion actions
"""

    control_architecture = f"""# Control Architecture — {reg_name}

## Core Controls

"""
    for o in reg["obligations"]:
        control_architecture += f"### {o['title']}\n"
        control_architecture += f"- **Section:** {o['section']}\n"
        control_architecture += f"- **Description:** {o['description']}\n"
        control_architecture += f"- **Applies to:** {o['applies_to']}\n"
        control_architecture += f"- **Deadline:** {o['deadline']}\n\n"

    control_architecture += f"""
## API Endpoints

### POST /api/v1/compliance/consent
Record consent/acknowledgment.

### DELETE /api/v1/compliance/consent/:id
Withdraw consent.

### GET /api/v1/compliance/audit
Retrieve audit trail.

## Storage Schema

```sql
CREATE TABLE compliance_records (
    id              SERIAL PRIMARY KEY,
    entity_id       UUID NOT NULL,
    obligation_ref  VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    recorded_at     TIMESTAMPTZ DEFAULT NOW(),
    metadata        JSONB
);
```
"""

    impact_assessment = f"""# Impact Assessment Template — {reg_name}

## Section 1: Description of Processing
- **Organization:** [Name]
- **Processing Activity:** [Description]
- **Regulation:** {reg_name}
- **Issuing Body:** {source_body}

## Section 2: Risk Assessment

| Risk | Likelihood (1-5) | Severity (1-5) | Risk Score | Mitigation |
|------|-------------------|-----------------|------------|------------|
"""
    for o in reg["obligations"]:
        impact_assessment += f"| {o['title']} non-compliance | | | | {o['description'][:40]}... |\n"
    impact_assessment += f"""
## Section 3: Mitigation Measures
- Technical: Access controls, encryption, monitoring
- Organizational: Policies, training, audits
- Contractual: Agreements, DPAs

## Section 4: Sign-off
- **Reviewed by:** [Name, Role]
- **Approved by:** [Name, Role]
- **Date:** [Date]
"""

    implementation_guide = f"""# {reg_name} Implementation Guide — Phased Rollout

## Phase 1: Critical Controls (0-30 days)
| Task | Effort | Owner |
|------|--------|-------|
"""
    for o in reg["obligations"][:4]:
        implementation_guide += f"| Implement {o['title']} | 2 weeks | Engineering Lead |\n"
    implementation_guide += f"""
## Phase 2: Important Controls (30-90 days)
| Task | Effort | Owner |
|------|--------|-------|
"""
    for o in reg["obligations"][4:7]:
        implementation_guide += f"| Implement {o['title']} | 2 weeks | Engineering Lead |\n"
    implementation_guide += f"""
## Phase 3: Best Practices (90-180 days)
| Task | Effort | Owner |
|------|--------|-------|
| Automated monitoring | 4 weeks | Engineering |
| Audit and reporting | 2 weeks | Compliance |
| Training program | 1 week | HR + Compliance |
"""

    (ENGINEERING / "data-classification.md").write_text(data_classification)
    (ENGINEERING / "control-architecture.md").write_text(control_architecture)
    (ENGINEERING / "impact-assessment-template.md").write_text(impact_assessment)
    (ENGINEERING / "implementation-guide.md").write_text(implementation_guide)

    log("engineering", "Generated 4 files:")
    for f in sorted(ENGINEERING.iterdir()):
        if f.name != ".gitkeep":
            log("engineering", f"  ✓ {f.name}")

    write_handoff("engineering-to-consolidator.md", {
        "from": "engineering-agent",
        "to": "consolidator",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "artifacts": ["data-classification.md", "control-architecture.md", "impact-assessment-template.md", "implementation-guide.md"],
        "notes": f"All engineering deliverables complete for {reg['name']}."
    })

    return True


# ── Stage 4: Consolidator ───────────────────────────────────────────

def run_consolidator(reg):
    log("consolidator", "Waiting for both agent handoffs...")

    m_handoff = read_handoff("marketing-to-consolidator.md")
    e_handoff = read_handoff("engineering-to-consolidator.md")

    if not m_handoff or m_handoff["status"] != "complete":
        log("consolidator", f"ERROR: Marketing handoff missing!")
        return False
    if not e_handoff or e_handoff["status"] != "complete":
        log("consolidator", f"ERROR: Engineering handoff missing!")
        return False

    reg_name = reg["name"]
    source_body = reg["source_body"]

    log("consolidator", f"Both handoffs received for {reg_name}")
    log("consolidator", f"  Marketing: {len(m_handoff['artifacts'])} artifacts")
    log("consolidator", f"  Engineering: {len(e_handoff['artifacts'])} artifacts")

    log("consolidator", "Cross-validating outputs...")
    for f in m_handoff["artifacts"]:
        log("consolidator", f"  ✓ marketing/{f}")
    for f in e_handoff["artifacts"]:
        log("consolidator", f"  ✓ engineering/{f}")

    log("consolidator", "Generating final report...")

    final_report = f"""# {reg_name} Compliance Report
## Compliance-Disco — Final Deliverable
**Issuing Body:** {source_body}

---

## 1. Executive Summary

This report provides a comprehensive compliance roadmap for **{reg_name}**,
issued by {source_body}. It covers business obligations, technical implementation,
and a phased timeline for achieving compliance.

**Key findings:**
- {len(reg['obligations'])} major obligations identified
- Maximum penalty exposure: {reg['penalties'][0]['penalty_amount']}
- Ambiguity flags: {sum(1 for o in reg['obligations'] if o['ambiguity_flag'])} items requiring clarification

---

## 2. Regulation Overview

{reg_name} establishes compliance requirements for organizations under
{source_body}'s jurisdiction.

**Key facts:**
- **Issuing body:** {source_body}
- **Obligations identified:** {len(reg['obligations'])}
- **Definitions extracted:** {len(reg['definitions'])}
- **Enforcement milestones:** {len(reg['timelines'])}

---

## 3. Business Obligations

| # | Obligation | Section | Applies To | Deadline |
|---|-----------|---------|-----------|----------|
"""
    for i, o in enumerate(reg["obligations"], 1):
        final_report += f"| {i} | {o['title']} | {o['section']} | {o['applies_to']} | {o['deadline']} |\n"
    final_report += f"""
---

## 4. Technical Implementation

Engineering deliverables:
"""
    for f in e_handoff["artifacts"]:
        final_report += f"- `{f}`\n"
    final_report += f"""
---

## 5. Penalties

| Offense | Maximum Penalty | Criteria |
|---------|----------------|----------|
"""
    for p in reg["penalties"]:
        final_report += f"| {p['offense']} | {p['penalty_amount']} | {p['criteria']} |\n"
    final_report += f"""
---

## 6. Gaps & Recommendations

"""
    for o in reg["obligations"]:
        if o["ambiguity_flag"]:
            final_report += f"- **{o['title']}:** {o['notes']}\n"
    final_report += f"""
**Recommendation:** Proceed with all non-ambiguous obligations immediately.
Monitor {source_body} notifications for clarification on flagged items.

---

## 7. Appendix: Source References

- Regulation: {reg_name}
- Source body: {source_body}
- Source documents: `{reg['source_path']}`

---

*Generated by Compliance-Disco — Hermes Buildathon 2026*
"""

    (CONSOLIDATED / "final-report.md").write_text(final_report)

    log("consolidator", "Generated 1 file:")
    log("consolidator", "  ✓ final-report.md")

    write_handoff("consolidation-complete.md", {
        "from": "consolidator",
        "to": "user",
        "status": "complete",
        "timestamp": ts(),
        "regulation_name": reg["name"],
        "source_body": reg["source_body"],
        "artifacts": ["final-report.md"],
        "notes": f"Full pipeline complete for {reg_name}. All outputs consolidated."
    })

    return True


# ── Main ─────────────────────────────────────────────────────────────

def main():
    # Parse args
    regulation_key = "dpdp"
    clean_flag = "--clean" in sys.argv

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
    print(f"║   Hermes Buildathon 2026                              ║")
    print(f"╚═══════════════════════════════════════════════════════╝\n")

    if clean_flag:
        clean()

    print("━━━ Stage 0: Regulatory Monitor ━━━")
    detection = run_monitor(reg)
    print()

    print("━━━ Stage 1: Regulatory Reader ━━━")
    obligations = run_reader(reg)
    print()

    print("━━━ Stage 2: Coordinator ━━━")
    if not run_coordinator(reg, obligations):
        print("  Pipeline FAILED at coordinator stage.")
        sys.exit(1)
    print()

    print("━━━ Stage 3a: Marketing Agent ━━━")
    if not run_marketing(reg, obligations):
        print("  Pipeline FAILED at marketing stage.")
        sys.exit(1)
    print()

    print("━━━ Stage 3b: Engineering Agent ━━━")
    if not run_engineering(reg, obligations):
        print("  Pipeline FAILED at engineering stage.")
        sys.exit(1)
    print()

    print("━━━ Stage 4: Consolidator ━━━")
    if not run_consolidator(reg):
        print("  Pipeline FAILED at consolidator stage.")
        sys.exit(1)
    print()

    # Summary
    print("╔═══════════════════════════════════════════════════════╗")
    print("║   Pipeline Complete ✓                                ║")
    print("╚═══════════════════════════════════════════════════════╝")
    print(f"\n  Regulation: {reg['name']}")
    print(f"  Source Body: {reg['source_body']}")
    print(f"\n  Output files:")
    print(f"    extracted-regulations/  → {len(list(EXTRACTED.iterdir()))-1} files")
    print(f"    marketing-output/      → {len(list(MARKETING.iterdir()))-1} files")
    print(f"    engineering-output/    → {len(list(ENGINEERING.iterdir()))-1} files")
    print(f"    consolidated-output/   → {len(list(CONSOLIDATED.iterdir()))-1} files")
    print(f"    handoffs/              → {len(list(HANDOFFS.iterdir()))-1} files")
    print(f"    detection-log/         → {len(list(DETECTION_LOG.iterdir()))-1} files")
    print(f"\n  Final report: workspace/shared-data/consolidated-output/final-report.md\n")


if __name__ == "__main__":
    main()
