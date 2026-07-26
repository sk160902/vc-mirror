"""
One Maritime wake cycle = one round of recursive self-improvement.

Each time the Maritime micro-VM wakes and runs this, the system:
  1. ingests the next batch of MicroLens videos (Gemini extracts their features)
  2. re-runs the improvement engine (Autolab / local) on the grown labeled set
  3. records the new held-out score to state/history.json  (the demoable curve)
  4. persists the champion predictor in the VM

Because MicroLens already carries real like/view labels, "more data each cycle"
needs no real-world wait — the agent just works through the backlog. Improvement
comes from both more data and a better model, and it accumulates across wakes.

    python3 agent/run_cycle.py --ingest 40
"""
import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

DATASET = ROOT / "data/features/dataset.csv"
EXTRACTED = ROOT / "data/features/extracted.jsonl"
STATE = ROOT / "state"
STATE.mkdir(exist_ok=True)
HISTORY = STATE / "history.json"


def already_extracted() -> set:
    if not EXTRACTED.exists():
        return set()
    return {json.loads(l)["id"] for l in EXTRACTED.read_text().splitlines() if l.strip()}


def next_ids(n: int) -> list:
    done = already_extracted()
    ids = []
    for line in DATASET.read_text().splitlines()[1:]:
        vid = line.split(",")[0]
        if vid not in done:
            ids.append(vid)
        if len(ids) >= n:
            break
    return ids


def ingest(n: int):
    """Extract features for the next n videos via the Node Gemini extractor."""
    before = len(already_extracted())
    # extract.mjs walks the dataset in order and skips done ids, so raising the
    # limit past the current count ingests the next batch.
    subprocess.run(
        ["node", str(ROOT / "scripts/extract.mjs"), f"--limit={before + n}"],
        cwd=str(ROOT), check=True,
    )
    return len(already_extracted())


def run(ingest_n: int, rounds: int):
    n_before = len(already_extracted())
    n_after = ingest(ingest_n) if ingest_n > 0 else n_before

    from autolab_adapter import submit  # local engine, or Autolab if keyed
    result = submit(rounds)

    history = json.loads(HISTORY.read_text()) if HISTORY.exists() else []
    cycle = {
        "cycle": len(history),
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "n_examples": result["n_examples"],
        "spearman": round(result["best"]["spearman"], 4),
        "champion": f"{result['best']['kind']}:{result['best']['params']}",
    }
    history.append(cycle)
    HISTORY.write_text(json.dumps(history, indent=2))

    print(f"\n=== cycle {cycle['cycle']} ===")
    print(f"examples: {n_before} -> {n_after}")
    print(f"held-out spearman: {cycle['spearman']}")
    print("curve so far:", " -> ".join(str(h["spearman"]) for h in history))
    return cycle


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ingest", type=int, default=40, help="new videos to label this cycle")
    ap.add_argument("--rounds", type=int, default=6)
    a = ap.parse_args()
    run(a.ingest, a.rounds)
