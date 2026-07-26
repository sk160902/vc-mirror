# Wiring Autolab as the improvement engine

Autolab (app.autolab.ai) runs ML experiments whose agents improve results over
successive runs — exactly the role of our improvement engine. `scripts/improve_predictor.py`
is a working local stand-in; `scripts/autolab_adapter.py` is the drop-in seam.

## Prerequisites
- Autolab account (`app.autolab.ai`; text @sergeicu on Discord for credits)
- `AUTOLAB_API_KEY` in the environment

## How it plugs in
`autolab_adapter.submit(rounds)` is called by every wake cycle. Today, with no key,
it runs the local engine. With `AUTOLAB_API_KEY` set, wire the real flow inside
`submit()`:

1. Upload `data/features/extracted.jsonl` as the training table (target = `engagement_rate`).
2. Start an Autolab experiment over the model/feature search space.
3. Poll until it returns the best model + feature importances.
4. Return the same contract the local engine returns:
   `{"best": {"kind","params","spearman"}, "history": [...], "n_examples": N}`

The return shape is identical, so `run_cycle.py` and the persisted curve are unchanged
whether optimization runs locally or on Autolab. The seam is intentionally a hard
`NotImplementedError` when the key is set but calls aren't wired — no silent stubs.

## Bonus: feature importances → playbook
Autolab surfaces which content features drive engagement each cycle. Persist those as
a versioned "playbook" and feed them into the Gemini rewrite prompt so the content
optimizer gets sharper as the predictor does — closing the loop between both engines.
