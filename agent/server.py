"""
HTTP wrapper so the viral-RSI engine runs as a long-lived Maritime agent.

Maritime expects a service it can health-check and message, not a run-once job.
So:
  GET  /        -> 200 health check (lets the deploy go live, and lets Maritime
                   wake the sleeping VM)
  POST /        -> run ONE recursive self-improvement cycle, return the new
                   score + the cross-wake curve

Each POST = one wake cycle: (optionally ingest more MicroLens videos) re-run the
improvement engine, persist the champion + append to state/history.json, reply
with the climbing curve. Default INGEST=0 keeps a triggered cycle fast and
reliable (re-improve on existing data, no Gemini calls); set INGEST>0 to also
label more videos per cycle.
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "agent"))
sys.path.insert(0, str(ROOT / "scripts"))


def load_history():
    hp = ROOT / "state/history.json"
    return json.loads(hp.read_text()) if hp.exists() else []


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Health check + a human-readable summary of progress so far.
        hist = load_history()
        self._send(200, {
            "ok": True,
            "agent": "viral-rsi",
            "cycles_run": len(hist),
            "curve": [h.get("spearman") for h in hist],
            "hint": "POST / to run one recursive self-improvement cycle",
        })

    def do_POST(self):
        try:
            from run_cycle import run
            ingest = int(os.environ.get("INGEST", "0"))
            rounds = int(os.environ.get("ROUNDS", "6"))
            cycle = run(ingest, rounds)
            self._send(200, {"ok": True, "cycle": cycle, "curve": [h["spearman"] for h in load_history()]})
        except Exception as e:  # never crash the server on a bad cycle
            self._send(500, {"ok": False, "error": str(e)[:400]})

    def log_message(self, *args):
        pass  # keep logs clean; the cycle prints its own progress


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print(f"viral-rsi agent listening on 0.0.0.0:{port}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
