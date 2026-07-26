"""
The improvement engine (Autolab analog).

Runs successive experiment rounds over model configs, keeping the best held-out
Spearman — i.e. the predictor recursively self-improves. This is the local
stand-in for Autolab; autolab_adapter.submit() is the drop-in seam that hands
the same dataset + search space to Autolab's agents once credentials exist.

    python3 scripts/improve_predictor.py --rounds 6
"""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy.stats import spearmanr
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import KFold
import joblib

from train_predictor import load, build_matrix

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "models"
MODEL_DIR.mkdir(exist_ok=True)

# Search space the engine explores round over round.
SEARCH = [
    ("gb", dict(n_estimators=150, max_depth=2, learning_rate=0.05)),
    ("gb", dict(n_estimators=200, max_depth=3, learning_rate=0.05)),
    ("gb", dict(n_estimators=300, max_depth=3, learning_rate=0.03)),
    ("gb", dict(n_estimators=400, max_depth=2, learning_rate=0.03)),
    ("rf", dict(n_estimators=300, max_depth=6)),
    ("rf", dict(n_estimators=500, max_depth=8)),
    ("gb", dict(n_estimators=250, max_depth=4, learning_rate=0.04)),
    ("rf", dict(n_estimators=400, max_depth=None)),
]


def make(kind, params, seed=0):
    if kind == "gb":
        return GradientBoostingRegressor(random_state=seed, **params)
    return RandomForestRegressor(random_state=seed, n_jobs=-1, **params)


def cv_spearman(model_fn, X, y, seed=0):
    kf = KFold(n_splits=5, shuffle=True, random_state=seed)
    scores = []
    for tr, te in kf.split(X):
        m = model_fn()
        m.fit(X.iloc[tr], y[tr])
        rho = spearmanr(m.predict(X.iloc[te]), y[te]).correlation
        if rho == rho:  # not NaN
            scores.append(rho)
    return float(np.mean(scores)) if scores else 0.0


def improve(rounds: int, target="engagement_rate"):
    df = load()
    X, cats = build_matrix(df)
    y = df[target].values

    best = {"spearman": -1.0}
    history = []
    for r in range(min(rounds, len(SEARCH))):
        kind, params = SEARCH[r]
        rho = cv_spearman(lambda: make(kind, params), X, y)
        improved = rho > best["spearman"]
        if improved:
            best = {"kind": kind, "params": params, "spearman": rho}
        history.append({"round": r, "config": f"{kind}:{params}",
                        "spearman": round(rho, 4), "best_so_far": round(best["spearman"], 4)})
        print(f"round {r}  {kind:2} {str(params)[:48]:48}  cv-spearman={rho:+.3f}  "
              f"best={best['spearman']:+.3f}{'  <-- new best' if improved else ''}")

    # Refit the champion on all data and persist it as the reward model.
    champ = make(best["kind"], best["params"])
    champ.fit(X, y)
    payload = {"model": champ, "categories": cats, "columns": list(X.columns),
               "numeric": ["curiosity_gap", "specificity", "clickbait_intensity"],
               "boolean": ["has_number"],
               "categorical": ["hook_type", "primary_emotion", "topic", "promise"],
               "target": target, "spearman": best["spearman"]}
    joblib.dump(payload, MODEL_DIR / "predictor.joblib")
    print(f"\nchampion: {best['kind']} {best['params']}  cv-spearman={best['spearman']:.3f}")
    print(f"saved -> {MODEL_DIR / 'predictor.joblib'}")
    return {"best": best, "history": history, "n_examples": len(df)}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--rounds", type=int, default=6)
    a = ap.parse_args()
    improve(a.rounds)
