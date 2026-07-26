"""
Engagement predictor (the reward model).

Trains a model that maps Gemini content-features -> engagement_rate on the
MicroLens labels, and reports a held-out RANK metric (Spearman) because for
virality we care about ordering good vs bad content, not absolute rates.

The trained model is persisted to models/predictor.joblib and is the closed-loop
reward signal the RSI optimizer scores candidates against.

    python3 scripts/train_predictor.py
"""
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
import joblib

ROOT = Path(__file__).resolve().parent.parent
FEATURES = ROOT / "data/features/extracted.jsonl"
MODEL_DIR = ROOT / "models"
MODEL_DIR.mkdir(exist_ok=True)

# The content-feature columns Gemini produces. Kept in one place so the
# predictor and the RSI optimizer agree on the feature contract.
CATEGORICAL = ["hook_type", "primary_emotion", "topic", "promise"]
NUMERIC = ["curiosity_gap", "specificity", "clickbait_intensity"]
BOOLEAN = ["has_number"]


def load(path=FEATURES) -> pd.DataFrame:
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            feat = r["features"]
            row = {
                "id": r["id"],
                "engagement_rate": r["engagement_rate"],
                "log_likes": r["log_likes"],
            }
            for c in CATEGORICAL:
                row[c] = str(feat.get(c, "none"))
            for c in NUMERIC:
                row[c] = float(feat.get(c, 0.0) or 0.0)
            for c in BOOLEAN:
                row[c] = 1 if feat.get(c) else 0
            rows.append(row)
    return pd.DataFrame(rows)


def build_matrix(df: pd.DataFrame, categories: dict | None = None):
    """One-hot categoricals with a fixed vocabulary so train/inference align."""
    parts = [df[NUMERIC + BOOLEAN].reset_index(drop=True)]
    cats = {}
    for c in CATEGORICAL:
        vocab = categories[c] if categories else sorted(df[c].unique())
        cats[c] = vocab
        oh = pd.DataFrame(
            {f"{c}={v}": (df[c] == v).astype(int).values for v in vocab}
        )
        parts.append(oh)
    X = pd.concat(parts, axis=1)
    return X, cats


def train(target="engagement_rate", seed=0):
    df = load()
    if len(df) < 30:
        raise SystemExit(f"Only {len(df)} rows; run extraction to >=100 first.")

    tr, te = train_test_split(df, test_size=0.25, random_state=seed)
    Xtr, cats = build_matrix(tr)
    Xte, _ = build_matrix(te, cats)
    ytr, yte = tr[target].values, te[target].values

    model = GradientBoostingRegressor(random_state=seed, n_estimators=200, max_depth=3)
    model.fit(Xtr, ytr)

    pred = model.predict(Xte)
    rho = spearmanr(pred, yte).correlation
    # Baseline: predicting the mean → Spearman undefined/0. Report vs random too.
    print(f"rows={len(df)}  target={target}")
    print(f"held-out Spearman rank corr: {rho:.3f}  (0=random ordering, 1=perfect)")

    payload = {"model": model, "categories": cats, "columns": list(Xtr.columns),
               "numeric": NUMERIC, "boolean": BOOLEAN, "categorical": CATEGORICAL,
               "target": target, "spearman": float(rho)}
    joblib.dump(payload, MODEL_DIR / "predictor.joblib")
    print(f"saved -> {MODEL_DIR / 'predictor.joblib'}")
    return rho


if __name__ == "__main__":
    train()
