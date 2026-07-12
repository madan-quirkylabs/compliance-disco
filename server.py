#!/usr/bin/env python3
"""
Compliance-Disco — Live API Server

Serves the dashboard and exposes endpoints to trigger the compliance pipeline.

Usage:
    python server.py
    # or
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""

import json
import os
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Compliance-Disco API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(__file__).parent
WORKSPACE = PROJECT_ROOT / "workspace" / "shared-data"
HANDOFFS = WORKSPACE / "handoffs"
EXTRACTED = WORKSPACE / "extracted-regulations"
MARKETING = WORKSPACE / "marketing-output"
ENGINEERING = WORKSPACE / "engineering-output"
CONSOLIDATED = WORKSPACE / "consolidated-output"
MONITOR_HANDOFF = HANDOFFS / "monitor-to-coordinator.md"

pipeline_state = {
    "status": "idle",
    "started_at": None,
    "finished_at": None,
    "regulation": None,
    "stages": [],
    "error": None,
}


def get_report_stats():
    report_path = CONSOLIDATED / "final-report.md"
    if not report_path.exists():
        return None

    report = report_path.read_text()

    obligations_path = EXTRACTED / "obligations.json"
    obligations = 0
    if obligations_path.exists():
        with open(obligations_path) as f:
            obligations = len(json.load(f))

    definitions_path = EXTRACTED / "definitions.json"
    definitions = 0
    if definitions_path.exists():
        with open(definitions_path) as f:
            definitions = len(json.load(f))

    return {
        "report_exists": True,
        "report_size": len(report),
        "obligations": obligations,
        "definitions": definitions,
        "last_modified": datetime.fromtimestamp(report_path.stat().st_mtime).isoformat(),
    }


def run_pipeline():
    global pipeline_state
    pipeline_state["status"] = "running"
    pipeline_state["started_at"] = datetime.now().isoformat()
    pipeline_state["stages"] = []
    pipeline_state["error"] = None

    regulation = "Unknown"
    source_body = "Unknown"
    source_path = "docs/regulations/"

    if MONITOR_HANDOFF.exists():
        try:
            with open(MONITOR_HANDOFF) as f:
                handoff = json.load(f)
            regulation = handoff.get("regulation_name", "Unknown")
            source_body = handoff.get("source_body", "Unknown")
            source_path = handoff.get("source_path", "docs/regulations/")
        except Exception:
            pass

    pipeline_state["regulation"] = regulation

    try:
        pdf_dir = PROJECT_ROOT / source_path
        if pdf_dir.exists() and list(pdf_dir.glob("*.pdf")):
            pipeline_state["stages"].append({
                "name": "pdf2text",
                "status": "running",
                "started_at": datetime.now().isoformat(),
            })

            raw_txt = EXTRACTED / "raw.txt"
            result = subprocess.run(
                ["python3", "scripts/pdf2text.py", "--source", str(pdf_dir), "--output", str(raw_txt)],
                capture_output=True, text=True, cwd=str(PROJECT_ROOT), timeout=120,
            )

            pipeline_state["stages"][-1]["status"] = "ok" if result.returncode == 0 else "failed"
            pipeline_state["stages"][-1]["finished_at"] = datetime.now().isoformat()
            pipeline_state["stages"][-1]["output"] = result.stdout[-500:] if result.stdout else ""

            if result.returncode != 0:
                pipeline_state["status"] = "failed"
                pipeline_state["error"] = f"pdf2text failed: {result.stderr[-500:]}"
                return

            api_key = os.environ.get("DEEPSEEK_API_KEY", "")
            if not api_key:
                env_path = PROJECT_ROOT / ".env"
                if env_path.exists():
                    for line in env_path.read_text().splitlines():
                        if line.startswith("DEEPSEEK_API_KEY="):
                            api_key = line.split("=", 1)[1]
                            break

            pipeline_state["stages"].append({
                "name": "extract",
                "status": "running",
                "started_at": datetime.now().isoformat(),
            })

            result = subprocess.run(
                ["python3", "scripts/extract.py",
                 "--text", str(raw_txt),
                 "--regulation", regulation,
                 "--body", source_body,
                 "--output", str(EXTRACTED)],
                capture_output=True, text=True, cwd=str(PROJECT_ROOT), timeout=300,
                env={**subprocess.os.environ, "DEEPSEEK_API_KEY": api_key} if api_key else None,
            )

            pipeline_state["stages"][-1]["status"] = "ok" if result.returncode == 0 else "failed"
            pipeline_state["stages"][-1]["finished_at"] = datetime.now().isoformat()
            pipeline_state["stages"][-1]["output"] = result.stdout[-500:] if result.stdout else ""

            if result.returncode != 0:
                pipeline_state["status"] = "failed"
                pipeline_state["error"] = f"extract failed: {result.stderr[-500:]}"
                return

        for stage_name, prompt in [
            ("marketing", f"You are the Marketing Agent. Read extracted data from {EXTRACTED}/ and produce compliance-guide.md, checklist.md, faq.md, blog-post.md in {MARKETING}/. Write handoff to {HANDOFFS}/marketing-to-consolidator.md."),
            ("engineering", f"You are the Engineering Agent. Read extracted data from {EXTRACTED}/ and grounding references from agents/engineering-agent/skills/build-compliance-artifacts/references/. Produce data-classification.md, control-architecture.md, impact-assessment-template.md, implementation-guide.md in {ENGINEERING}/. Write handoff to {HANDOFFS}/engineering-to-consolidator.md."),
        ]:
            pipeline_state["stages"].append({
                "name": stage_name,
                "status": "running",
                "started_at": datetime.now().isoformat(),
            })

            result = subprocess.run(
                ["hermes", "-z", prompt],
                capture_output=True, text=True, cwd=str(PROJECT_ROOT), timeout=300,
            )

            pipeline_state["stages"][-1]["status"] = "ok" if result.returncode == 0 else "failed"
            pipeline_state["stages"][-1]["finished_at"] = datetime.now().isoformat()

            if result.returncode != 0:
                pipeline_state["stages"][-1]["error"] = result.stderr[-300:] if result.stderr else ""

        pipeline_state["stages"].append({
            "name": "consolidate",
            "status": "running",
            "started_at": datetime.now().isoformat(),
        })

        consolidate_prompt = (
            f"You are the Consolidator. Read from {MARKETING}/ (4 files), "
            f"{ENGINEERING}/ (4 files), and {EXTRACTED}/ (5 files). "
            f"Cross-validate and produce {CONSOLIDATED}/final-report.md. "
            f"Write handoff to {HANDOFFS}/consolidation-complete.md."
        )

        result = subprocess.run(
            ["hermes", "-z", consolidate_prompt],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT), timeout=300,
        )

        pipeline_state["stages"][-1]["status"] = "ok" if result.returncode == 0 else "failed"
        pipeline_state["stages"][-1]["finished_at"] = datetime.now().isoformat()

        pipeline_state["status"] = "complete"
        pipeline_state["finished_at"] = datetime.now().isoformat()

    except subprocess.TimeoutExpired:
        pipeline_state["status"] = "failed"
        pipeline_state["error"] = "Pipeline timed out"
    except Exception as e:
        pipeline_state["status"] = "failed"
        pipeline_state["error"] = str(e)


@app.get("/")
async def root():
    return FileResponse(PROJECT_ROOT / "web" / "index.html")


@app.get("/api/status")
async def get_status():
    stats = get_report_stats()
    return {
        "pipeline": pipeline_state,
        "report": stats,
    }


@app.post("/api/run")
async def run_pipeline_endpoint():
    global pipeline_state

    if pipeline_state["status"] == "running":
        raise HTTPException(status_code=409, detail="Pipeline already running")

    thread = threading.Thread(target=run_pipeline, daemon=True)
    thread.start()

    return {"message": "Pipeline started", "status": "running"}


@app.get("/api/report")
async def get_report():
    report_path = CONSOLIDATED / "final-report.md"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="No report found. Run the pipeline first.")

    return {"report": report_path.read_text()}


@app.get("/api/extracted/{filename}")
async def get_extracted_file(filename: str):
    file_path = EXTRACTED / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File {filename} not found")

    content = file_path.read_text()
    if filename.endswith(".json"):
        return json.loads(content)
    return {"content": content}


@app.get("/api/handoffs")
async def get_handoffs():
    handoffs = {}
    if HANDOFFS.exists():
        for f in sorted(HANDOFFS.glob("*")):
            if f.is_file():
                try:
                    with open(f) as fh:
                        handoffs[f.name] = json.load(fh)
                except Exception:
                    handoffs[f.name] = {"raw": f.read_text()}
    return handoffs


@app.get("/api/pipeline-stages")
async def get_pipeline_stages():
    return {
        "stages": [
            {"id": 0, "name": "Monitor", "description": "Watches SEBI, AMFI, RBI for new publications"},
            {"id": 1, "name": "PDF to Text", "description": "Converts regulation PDFs to plain text"},
            {"id": 2, "name": "Extraction", "description": "Extracts obligations, definitions, timelines, penalties"},
            {"id": 3, "name": "Marketing", "description": "Produces compliance guide, checklist, FAQ, blog post"},
            {"id": 4, "name": "Engineering", "description": "Produces data schemas, control architecture, implementation guide"},
            {"id": 5, "name": "Consolidation", "description": "Merges all outputs into final compliance report"},
        ],
        "current": pipeline_state["stages"],
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 9000))
    uvicorn.run(app, host="0.0.0.0", port=port)
