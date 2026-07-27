"""
Autolab adapter — the drop-in seam for the improvement engine.

Autolab (app.autolab.ai) is a real AutoML platform: `autolab init` ties a project
to this repo, `autolab serve` attaches compute, and its own coding agent then
proposes, runs, and merges experiments against the run/prep commands set at init
time (python3 scripts/improve_predictor.py --rounds 6). With autogen enabled, that
agent works continuously and on its own cadence -- independent of this function.

So submit() does not kick off a new experiment and block on it. It reads a
snapshot of the best merged result so far, via:
  - the REST job list (GET /projects/{owner}/{slug}/jobs/?status=merged) for
    the current champion's id and primary metric value, and
  - `autolab metrics <job_id> --format json` (shelled out; Autolab logs training
    metrics via MLflow, and the CLI is the verified, stable way to read them) for
    the champion's model kind/hyperparameters/n_examples.

Falls back to the local engine if AUTOLAB_API_KEY/AUTOLAB_TOKEN isn't set, or if
nothing has merged yet.
"""
import ast
import json
import os
import subprocess
from pathlib import Path

from improve_predictor import improve as local_improve

ROOT = Path(__file__).resolve().parent.parent
AUTOLAB_API = "https://app.autolab.ai/api/v1"


def _auth_token():
    return os.environ.get("AUTOLAB_API_KEY") or os.environ.get("AUTOLAB_TOKEN")


def _project_slug() -> str:
    """owner/slug, from the .autolab workspace config `autolab init` created."""
    config = json.loads((ROOT / ".autolab" / "config.json").read_text())
    return config["project"]


def _best_merged_job(token: str, project: str):
    """The merged job with the highest primary metric, or None if none yet."""
    import requests

    resp = requests.get(
        f"{AUTOLAB_API}/projects/{project}/jobs/",
        params={"status": "merged"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    jobs = resp.json()
    # Defensive: list endpoints on this API may return a bare list or an
    # {"items": [...]} envelope; handle either without guessing further.
    if isinstance(jobs, dict):
        jobs = jobs.get("items", [])
    scored = [j for j in jobs if j.get("analysis", {}).get("primary_metric_value") is not None]
    if not scored:
        return None
    return max(scored, key=lambda j: j["analysis"]["primary_metric_value"])


def _job_metrics(job_id: str) -> dict:
    """Structured params (champion kind/hyperparameters/n_examples) for a job."""
    out = subprocess.run(
        ["autolab", "metrics", job_id, "--format", "json"],
        cwd=str(ROOT), capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


def submit(rounds: int = 6) -> dict:
    token = _auth_token()
    if not token:
        return local_improve(rounds)

    job = _best_merged_job(token, _project_slug())
    if job is None:
        # Nothing merged yet (e.g. baseline still running) -- don't block a
        # wake cycle waiting on Autolab's own cadence.
        return local_improve(rounds)

    metrics = _job_metrics(job["id"])
    params = {p["key"]: p["value"] for p in metrics.get("params", [])}

    best = {
        "kind": params.get("champion_kind", "unknown"),
        "params": ast.literal_eval(params["champion_params"]) if "champion_params" in params else {},
        "spearman": job["analysis"]["primary_metric_value"],
    }

    history = []
    for series in metrics.get("series", []):
        if series["key"] == "cv_spearman":
            history = [{"round": p["step"], "spearman": p["value"]} for p in series["points"]]
            break

    return {"best": best, "history": history, "n_examples": int(params.get("n_examples", 0))}


if __name__ == "__main__":
    print(json.dumps(submit()["best"], default=str, indent=2))
