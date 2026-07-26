"""
The recursive self-improvement loop (content optimizer).

Closed loop, self-contained reward:
  seed title -> extract features -> score with the predictor (reward model)
  for each generation:
      ask Gemini for N truthful rewrites
      score each with the predictor
      keep the best-scoring title
      repeat from it
The predicted-engagement score climbs generation over generation. Nothing waits
on real-world data: the predictor (trained on MicroLens labels) IS the reward.

    python3 scripts/rsi_loop.py "your seed title" --generations 4 --candidates 4
"""
import argparse
import json
import subprocess
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
GEMINI = ["node", str(ROOT / "scripts/gemini_cli.mjs")]


def gemini(req: dict) -> dict:
    p = subprocess.run(GEMINI, input=json.dumps(req), capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"gemini_cli failed: {p.stderr[:200]}")
    return json.loads(p.stdout)


class Reward:
    """Wraps the trained predictor so the loop can score a feature dict."""

    def __init__(self):
        self.p = joblib.load(ROOT / "models/predictor.joblib")

    def score(self, features: dict) -> float:
        row = {c: float(features.get(c, 0.0) or 0.0) for c in self.p["numeric"]}
        for c in self.p["boolean"]:
            row[c] = 1 if features.get(c) else 0
        for c in self.p["categorical"]:
            val = str(features.get(c, "none"))
            for v in self.p["categories"][c]:
                row[f"{c}={v}"] = 1 if val == v else 0
        X = pd.DataFrame([row]).reindex(columns=self.p["columns"], fill_value=0)
        return float(self.p["model"].predict(X)[0])


def run(seed: str, generations: int, candidates: int):
    reward = Reward()
    curve = []

    cur_title = seed
    cur_feat = gemini({"op": "features", "title": seed})["features"]
    cur_score = reward.score(cur_feat)
    curve.append(cur_score)
    print(f"gen 0  score={cur_score:.4f}  | {cur_title}")

    for g in range(1, generations + 1):
        variants = gemini({"op": "rewrite", "title": cur_title, "n": candidates})["variants"]
        scored = []
        for v in variants:
            f = gemini({"op": "features", "title": v})["features"]
            scored.append((reward.score(f), v))
        scored.sort(reverse=True)
        best_score, best_title = scored[0]
        # Only move if the generation actually improved (keeps the loop monotone).
        if best_score > cur_score:
            cur_score, cur_title = best_score, best_title
        curve.append(cur_score)
        print(f"gen {g}  score={cur_score:.4f}  | {cur_title}")

    lift = (curve[-1] - curve[0]) / abs(curve[0]) * 100 if curve[0] else 0.0
    print(f"\nseed  -> {seed}")
    print(f"final -> {cur_title}")
    print(f"predicted-engagement lift: {lift:+.1f}%  ({curve[0]:.4f} -> {curve[-1]:.4f})")
    out = {"seed": seed, "final": cur_title, "curve": curve}
    (ROOT / "data/features/last_rsi_run.json").write_text(json.dumps(out, indent=2))
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("seed")
    ap.add_argument("--generations", type=int, default=4)
    ap.add_argument("--candidates", type=int, default=4)
    a = ap.parse_args()
    run(a.seed, a.generations, a.candidates)
