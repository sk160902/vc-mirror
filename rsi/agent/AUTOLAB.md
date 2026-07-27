# Wiring Autolab as the improvement engine

Autolab (app.autolab.ai) runs ML experiments whose agents improve results over
successive runs — exactly the role of our improvement engine. `scripts/improve_predictor.py`
is a working local stand-in; `scripts/autolab_adapter.py` is the drop-in seam.

**Verified live** against a real project (`arnav0202006/viral-rsi-predictor`) — the
notes below correct the original plan, which assumed an upload/poll REST API that
turned out not to exist. What's actually there is repo-and-job based, confirmed by
reading the real OpenAPI schema and REST responses rather than guessing.

## Prerequisites
- Autolab account + a Personal Access Token (`autolab token create --name <x>`,
  or generated via the dashboard's Access Tokens tab)
- `AUTOLAB_API_KEY` or `AUTOLAB_TOKEN` in the environment (either name works;
  `autolab_adapter.py` checks both)

## How the real thing works
There's no dataset-upload endpoint. Instead:

1. **`autolab init`** (interactive, one-time, from `rsi/`) creates a *project* tied to
   this repo, with a `run` command (`python3 scripts/improve_predictor.py --rounds 6`)
   and `prep`/setup command (`pip install -r agent/requirements.txt`), plus a
   plain-language `objective` (e.g. "maximize held-out Spearman correlation...").
   This writes `.autolab/config.json` (gitignored) recording the project slug.
2. **`autolab serve --project <owner>/<slug>`** attaches a machine as an execution
   node — required before any job can actually run.
3. **`autolab start`** launches it. With autogen on, Autolab's own coding agent then
   works continuously and autonomously: it explores the repo, proposes a change
   (a new feature representation, a hyperparameter sweep, a different model
   family), runs it in an isolated clone, and merges it if the held-out metric
   improves — logging metrics via MLflow, which is how `autolab metrics` reads
   them back.
4. This is **not request/response**. Autogen runs on its own schedule, so
   `autolab_adapter.submit()` does not submit a job and block on it — it reads a
   snapshot of the current best *merged* job (via the REST job list for the
   winning job's id + metric, then `autolab metrics <id> --format json` — shelled
   out, since it's the verified-stable way to read structured champion params —
   for its model kind/hyperparameters/n_examples). Each Maritime wake cycle is
   just asking "what's the best Autolab has found so far?"

The return contract is unchanged from the local engine —
`{"best": {"kind","params","spearman"}, "history": [...], "n_examples": N}` — so
`run_cycle.py` and the persisted curve don't care whether optimization ran locally
or on Autolab.

One real result from this project: the agent went beyond the fixed `gb`/`rf` grid
in `improve_predictor.py` and found that TF-IDF/SVD title features plus retuned GB
hyperparameters lifted held-out Spearman from a 0.1417 baseline to 0.3457 — over
2x — across a handful of autonomous experiment rounds.

## Bonus: feature importances → playbook
Autolab surfaces which content features drive engagement each cycle. Persist those as
a versioned "playbook" and feed them into the Gemini rewrite prompt so the content
optimizer gets sharper as the predictor does — closing the loop between both engines.
