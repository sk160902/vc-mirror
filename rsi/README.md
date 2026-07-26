# Viral-RSI — a recursively self-improving engagement engine

A short-form-video engagement system that **gets better at its own job over time**,
built for the Sundai "Recursive Self-Improvement for AI Agents" hack. It uses
**Gemini** to read content, **Autolab** as the improvement engine, and **Maritime**
as the persistent host whose wake/sleep cycles *are* the recursion.

## The two recursive loops

**1. The predictor self-improves (the Autolab loop).**
Each cycle the improvement engine searches model configs on the labeled data and
keeps the best held-out score. As more videos are labeled, the reward model gets
sharper. This is the ML-self-improvement Autolab is built for.

**2. The content self-improves (the closed reward loop).**
The trained predictor is a *closed-loop reward signal*: a Gemini agent proposes
truthful title rewrites, the predictor scores each, the best survives, and it
repeats — predicted engagement climbs generation over generation, with no
real-world wait.

```
MicroLens videos ──Gemini──▶ content features ──▶ predictor (reward model)
   (real like/view labels)          ▲                     │
                                    │                     ▼
                     Autolab improves it       content optimizer evolves a title
                     over rounds  (loop 1)      against it        (loop 2)
```

Maritime ties it together: each wake ingests the next batch of videos, re-runs
loop 1, persists the champion + the score curve to the micro-VM, and sleeps.
Because MicroLens already carries real engagement labels, "more data each cycle"
needs no real-world wait — the agent works through the backlog, and improvement
accumulates across wakes. That persisted, climbing curve is the demo.

## What's real vs. what needs your login

| Piece | Status |
|---|---|
| Labeled dataset (MicroLens-100K, 19.6k rows) | ✅ downloaded, merged |
| Gemini content-feature extraction | ✅ working (`gemini-3.5-flash`) |
| Predictor / reward model | ✅ trained, persisted |
| Closed-loop reward | ✅ content optimizer verified (+15.6% in a sample run) |
| Improvement engine (predictor self-improves) | ✅ local engine working |
| **Autolab** | ⏳ adapter + seam ready; set `AUTOLAB_API_KEY` to route to it |
| **Maritime** | ⏳ Dockerfile + wake-cycle entrypoint ready; `maritime deploy` when authed |

Autolab and Maritime need interactive sign-in, so they ship as drop-in adapters
with a working local equivalent — the whole system runs and is demoable today,
and the services plug in with credentials (see `agent/AUTOLAB.md`, `agent/MARITIME.md`).

## Run it locally

```bash
npm install @google/genai@^2.12.0        # or symlink an existing install
export GEMINI_API_KEY=...                 # your AI Studio key
pip install -r agent/requirements.txt

node   scripts/extract.mjs --limit=300    # 1. label videos (Gemini)
python scripts/improve_predictor.py       # 2. train + self-improve the reward model
python scripts/rsi_loop.py "a friend sent me a box of sea urchins"   # 3. evolve a title
python agent/run_cycle.py --ingest 40     # one Maritime wake cycle
```

## Honest limitations

- **Title-only features (v1).** MicroLens-100K raw video is not hosted, so features
  come from titles — the dominant CTR lever, but not the full pacing/tonality signal.
  Held-out rank correlation is therefore modest (Spearman ~0.1–0.2): a real but weak
  signal. Adding cover-frame / audio features is the clear next lift.
- **Calibrated proxy, not a virality oracle.** The predictor ranks relative engagement
  within a popular set; it does not promise real-world virality. The system optimizes
  a proxy, honestly labeled as one.
