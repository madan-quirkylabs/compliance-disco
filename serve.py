#!/usr/bin/env python3
"""
Compliance-Disco — local web UI.

  * Feed the pipeline from the browser: pick/upload a regulation PDF, hit Run.
    (runs  scripts/pdf2text.py -> scripts/extract.py -> ./run_pipeline.sh)
  * Each run's final report is archived into  consolidated-output/
  * Browse and read the reports in  consolidated-output/

Run:
    ./setup_profile.sh        # once, creates the DeepSeek 'compliance' Hermes profile
    python3 serve.py          # then open http://localhost:8000

No external dependencies (Python stdlib only). The DeepSeek key is read from the
compliance profile (~/.hermes/profiles/compliance/config.yaml) so nothing is hard-coded.
"""
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import urllib.parse
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REG_DIR = ROOT / "docs" / "regulations"
EXTRACTED = ROOT / "workspace" / "shared-data" / "extracted-regulations"
PIPELINE_OUT = ROOT / "workspace" / "shared-data" / "consolidated-output"
ARCHIVE = ROOT / "consolidated-output"          # where reports land + the UI browses
ARCHIVE.mkdir(exist_ok=True)
PY = sys.executable or "python3"
PORT = int(os.environ.get("PORT", "8000"))

STATE = {"running": False, "step": "idle", "log": "", "last_report": None, "error": None}


def deepseek_key() -> str:
    cfg = Path.home() / ".hermes" / "profiles" / "compliance" / "config.yaml"
    if cfg.exists():
        m = re.search(r'api_key:\s*"?(sk-[A-Za-z0-9_\-]+)"?', cfg.read_text())
        if m:
            return m.group(1)
    return os.environ.get("DEEPSEEK_API_KEY", "")


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "reg"


def list_samples():
    """Catalog from samples.json, plus any folder with PDFs auto-detected as runnable."""
    entries, seen = [], set()
    manifest = REG_DIR / "samples.json"
    if manifest.exists():
        try:
            for s in json.loads(manifest.read_text()).get("samples", []):
                folder = s.get("folder", "")
                seen.add(folder)
                ready = bool(list((REG_DIR / folder).glob("*.pdf"))) if folder else False
                entries.append({"folder": folder, "name": s.get("name", folder),
                                "body": s.get("body", ""), "source_url": s.get("source_url", ""),
                                "description": s.get("description", ""), "ready": ready})
        except Exception:
            pass
    for d in sorted(REG_DIR.glob("*/")):
        if d.name not in seen and list(d.glob("*.pdf")):
            entries.append({"folder": d.name, "name": d.name, "body": "",
                            "source_url": "", "description": "", "ready": True})
    return entries


def run_pipeline(reg_name: str, body: str, folder: str):
    """Full chain: pdf2text -> extract -> run_pipeline.sh -> archive report."""
    STATE.update(running=True, step="starting", log="", error=None, last_report=None)
    try:
        src = REG_DIR / folder
        if not src.exists() or not list(src.glob("*.pdf")):
            raise RuntimeError(f"No PDFs found in docs/regulations/{folder}/")
        key = deepseek_key()
        if not key:
            raise RuntimeError("No DeepSeek key — run ./setup_profile.sh first.")
        env = dict(os.environ, DEEPSEEK_API_KEY=key)
        raw = EXTRACTED / "raw.txt"

        def step(label, cmd, env=None):
            STATE["step"] = label
            p = subprocess.run(cmd, cwd=str(ROOT), env=env,
                               capture_output=True, text=True)
            tail = (p.stdout[-1500:] + p.stderr[-1000:])
            STATE["log"] += f"\n$ {' '.join(cmd)}\n{tail}\n"
            if p.returncode != 0:
                raise RuntimeError(f"{label} failed (exit {p.returncode})")

        step("1/3 · Reading the PDF", [PY, "scripts/pdf2text.py",
             "--source", str(src), "--output", str(raw)])
        step("2/3 · Extracting obligations (DeepSeek)", [PY, "scripts/extract.py",
             "--text", str(raw), "--regulation", reg_name, "--body", body], env=env)
        step("3/3 · Department agents + consolidation", ["./run_pipeline.sh"], env=env)

        report = PIPELINE_OUT / "final-report.md"
        if not report.exists():
            raise RuntimeError("Pipeline finished but no final-report.md was produced.")
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        dest = ARCHIVE / f"{stamp}_{slugify(body)}.md"
        shutil.copy(report, dest)
        STATE.update(step="done", last_report=dest.name)
    except Exception as e:  # noqa
        STATE["error"] = str(e)
        STATE["step"] = "error"
    finally:
        STATE["running"] = False


class Handler(http.server.BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):  # quiet
        pass

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path == "/":
            self._send(200, PAGE, "text/html; charset=utf-8")
        elif u.path == "/status":
            self._send(200, json.dumps(STATE))
        elif u.path == "/reports":
            files = sorted((p.name for p in ARCHIVE.glob("*.md")), reverse=True)
            self._send(200, json.dumps(files))
        elif u.path == "/samples":
            self._send(200, json.dumps(list_samples()))
        elif u.path == "/report":
            name = os.path.basename((q.get("name") or [""])[0])
            f = ARCHIVE / name
            if f.exists() and f.suffix == ".md":
                self._send(200, f.read_text(), "text/plain; charset=utf-8")
            else:
                self._send(404, "not found", "text/plain")
        else:
            self._send(404, "not found", "text/plain")

    def do_PUT(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path == "/upload":
            folder = slugify((q.get("folder") or ["upload"])[0])
            name = os.path.basename((q.get("name") or ["regulation.pdf"])[0])
            if not name.lower().endswith(".pdf"):
                name += ".pdf"
            dest_dir = REG_DIR / folder
            dest_dir.mkdir(parents=True, exist_ok=True)
            length = int(self.headers.get("Content-Length", "0"))
            (dest_dir / name).write_bytes(self.rfile.read(length))
            self._send(200, json.dumps({"saved": f"docs/regulations/{folder}/{name}"}))
        else:
            self._send(404, "not found", "text/plain")

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path == "/run":
            if STATE["running"]:
                self._send(409, json.dumps({"error": "a run is already in progress"}))
                return
            reg = (q.get("reg") or ["Regulation"])[0]
            body = (q.get("body") or ["Issuing Body"])[0]
            folder = slugify((q.get("folder") or [body])[0])
            threading.Thread(target=run_pipeline, args=(reg, body, folder), daemon=True).start()
            self._send(200, json.dumps({"started": True}))
        else:
            self._send(404, "not found", "text/plain")


PAGE = r"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Compliance-Disco</title>
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#0a0a0a;color:#e0e0e0;line-height:1.55}
 .wrap{max-width:1000px;margin:0 auto;padding:2rem}
 header{text-align:center;padding:1.5rem 0 1rem;border-bottom:1px solid #222;margin-bottom:1.5rem}
 h1{font-size:1.6rem;color:#fff} .sub{color:#888;margin-top:.3rem;font-size:.9rem}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
 @media(max-width:760px){.grid{grid-template-columns:1fr}}
 .card{background:#111;border:1px solid #222;border-radius:10px;padding:1.25rem}
 .card h2{font-size:1rem;color:#fff;margin-bottom:.9rem}
 label{display:block;font-size:.75rem;color:#999;text-transform:uppercase;letter-spacing:.04em;margin:.7rem 0 .25rem}
 input[type=text],input[type=file]{width:100%;background:#0a0a0a;border:1px solid #333;border-radius:6px;color:#eee;padding:.5rem .6rem;font-size:.9rem}
 button{margin-top:1rem;width:100%;background:#1a4d2e;color:#4ade80;border:1px solid #2a6d42;border-radius:6px;padding:.6rem;font-weight:600;font-size:.9rem;cursor:pointer}
 button:disabled{opacity:.5;cursor:not-allowed}
 .status{margin-top:1rem;font-size:.85rem}
 .step{color:#facc15;font-weight:600} .step.done{color:#4ade80} .step.error{color:#f87171}
 pre{margin-top:.6rem;background:#0a0a0a;border:1px solid #222;border-radius:6px;padding:.6rem;font-size:.72rem;color:#9aa;max-height:220px;overflow:auto;white-space:pre-wrap}
 .reports{list-style:none} .reports li{padding:.5rem .6rem;border:1px solid #222;border-radius:6px;margin-bottom:.4rem;cursor:pointer;font-size:.85rem;color:#cbd}
 .reports li:hover{background:#161616;border-color:#333}
 .viewer{margin-top:1.5rem;background:#111;border:1px solid #222;border-radius:10px;padding:1.5rem;display:none}
 .viewer h1,.viewer h2,.viewer h3{color:#fff;margin:1rem 0 .5rem} .viewer h1{font-size:1.3rem} .viewer h2{font-size:1.1rem} .viewer h3{font-size:.95rem}
 .viewer p{color:#bbb;margin:.5rem 0} .viewer ul{margin:.4rem 0 .8rem 1.4rem;color:#bbb}
 .viewer strong{color:#fff}
 .viewer table{width:100%;border-collapse:collapse;margin:.8rem 0;font-size:.82rem}
 .viewer th,.viewer td{border:1px solid #262626;padding:.35rem .5rem;text-align:left} .viewer th{background:#161616;color:#ddd}
 .empty{color:#666;font-size:.85rem}
</style></head><body><div class="wrap">
 <header><h1>Compliance-Disco</h1><div class="sub">Regulation PDF → per-department requirements → executive report</div></header>
 <div class="card" style="margin-bottom:1.5rem">
   <h2>Sample regulations</h2>
   <div style="color:#888;font-size:.8rem;margin-bottom:.7rem">Click a bundled sample to load it below, then Run. Others link to their official source — download the PDF, drop it in the folder (or upload below), then Run.</div>
   <ul class="reports" id="samples"><li class="empty">loading…</li></ul>
 </div>
 <div class="grid">
   <div class="card">
     <h2>① Feed the pipeline</h2>
     <label>Regulation name</label><input type="text" id="reg" value="DPDP Act 2023">
     <label>Issuing body</label><input type="text" id="body" value="DPDP Board">
     <label>Source folder (docs/regulations/…)</label><input type="text" id="folder" value="dpdp">
     <label>Upload PDF (optional — else uses the folder above)</label><input type="file" id="pdf" accept="application/pdf">
     <button id="run" onclick="run()">Run pipeline</button>
     <div class="status"><span id="step" class="step">idle</span><pre id="log" style="display:none"></pre></div>
   </div>
   <div class="card">
     <h2>② Reports in consolidated-output/</h2>
     <ul class="reports" id="reports"><li class="empty">No reports yet — run the pipeline.</li></ul>
   </div>
 </div>
 <div class="viewer" id="viewer"></div>
</div>
<script>
async function run(){
  const reg=val('reg'),body=val('body'),folder=val('folder')||body;
  const file=document.getElementById('pdf').files[0];
  setBtn(true);
  try{
    if(file){ await fetch(`/upload?folder=${enc(folder)}&name=${enc(file.name)}`,{method:'PUT',body:file}); }
    const r=await fetch(`/run?reg=${enc(reg)}&body=${enc(body)}&folder=${enc(folder)}`,{method:'POST'});
    if(r.status===409){ alert('A run is already in progress.'); setBtn(false); return; }
    poll();
  }catch(e){ alert('Failed to start: '+e); setBtn(false); }
}
function val(id){return document.getElementById(id).value.trim();}
function enc(s){return encodeURIComponent(s);}
function setBtn(on){document.getElementById('run').disabled=on;}
async function poll(){
  const s=await(await fetch('/status')).json();
  const step=document.getElementById('step'), log=document.getElementById('log');
  step.textContent=s.error?('✗ '+s.error):s.step;
  step.className='step'+(s.step==='done'?' done':'')+(s.error?' error':'');
  if(s.log){log.style.display='block';log.textContent=s.log.trim();log.scrollTop=log.scrollHeight;}
  if(s.running){ setTimeout(poll,2000); }
  else{ setBtn(false); loadReports(); if(s.last_report) openReport(s.last_report); }
}
async function loadReports(){
  const files=await(await fetch('/reports')).json();
  const ul=document.getElementById('reports');
  ul.innerHTML = files.length? '' : '<li class="empty">No reports yet — run the pipeline.</li>';
  files.forEach(f=>{const li=document.createElement('li');li.textContent=f;li.onclick=()=>openReport(f);ul.appendChild(li);});
}
async function openReport(name){
  const md=await(await fetch('/report?name='+enc(name))).text();
  const v=document.getElementById('viewer');
  v.style.display='block'; v.innerHTML=mdToHtml(md); v.scrollIntoView({behavior:'smooth'});
}
function mdToHtml(md){
  const lines=md.split('\n'); let html='',inTable=false,inList=false;
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`(.+?)`/g,'<code>$1</code>');
  for(let ln of lines){
    if(/^\s*\|(.+)\|\s*$/.test(ln)){
      const cells=ln.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      if(cells.every(c=>/^:?-+:?$/.test(c))) continue;
      if(!inTable){html+='<table>';inTable=true;}
      const tag=/[A-Za-z0-9]/.test(cells.join(''))&&html.lastIndexOf('<table>')>html.lastIndexOf('</tr>')&&!html.includes('<tr>',html.lastIndexOf('<table>'))?'th':'td';
      html+='<tr>'+cells.map(c=>`<${tag}>${inline(c)}</${tag}>`).join('')+'</tr>'; continue;
    } else if(inTable){html+='</table>';inTable=false;}
    let m;
    if((m=ln.match(/^(#{1,3})\s+(.*)/))){html+=`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;}
    else if(/^\s*[-*]\s+/.test(ln)){ if(!inList){html+='<ul>';inList=true;} html+='<li>'+inline(ln.replace(/^\s*[-*]\s+/,''))+'</li>'; continue;}
    else if(/^\s*---\s*$/.test(ln)){html+='<hr style="border-color:#222">';}
    else if(ln.trim()===''){}
    else{html+='<p>'+inline(ln)+'</p>';}
    if(inList){html+='</ul>';inList=false;}
  }
  if(inTable)html+='</table>'; if(inList)html+='</ul>';
  return html;
}
async function loadSamples(){
  const items=await(await fetch('/samples')).json();
  const ul=document.getElementById('samples');
  ul.innerHTML = items.length? '' : '<li class="empty">No samples found.</li>';
  items.forEach(x=>{
    const li=document.createElement('li');
    const badge = x.ready
      ? '<span style="color:#4ade80">● ready — click to load</span>'
      : (x.source_url? `<a href="${x.source_url}" target="_blank" onclick="event.stopPropagation()" style="color:#60a5fa">⬇ download from source</a>` : '');
    li.innerHTML = `<strong>${x.name}</strong> <span style="color:#888">— ${x.body}</span> &nbsp; ${badge}`
      + (x.ready? '' : `<div style="color:#777;font-size:.74rem;margin-top:.25rem">drop the PDF into docs/regulations/${x.folder}/ (or upload it below), then Run</div>`);
    li.onclick=()=>useSample(x);
    ul.appendChild(li);
  });
}
function useSample(x){
  document.getElementById('reg').value=x.name;
  document.getElementById('body').value=x.body||x.folder;
  document.getElementById('folder').value=x.folder;
  document.getElementById('reg').scrollIntoView({behavior:'smooth'});
}
loadSamples(); loadReports();
</script></body></html>"""


def main():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Compliance-Disco UI → http://localhost:{PORT}  (Ctrl-C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
