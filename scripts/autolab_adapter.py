"""
Autolab adapter — the drop-in seam for the improvement engine.

Autolab (app.autolab.ai) is an AutoML platform whose agents run ML experiments
and improve results over successive runs. Our improve_predictor.py is a local
stand-in for exactly that. This module is where the real Autolab call goes once
credentials exist; until then it transparently falls back to the local engine so
the whole system runs and is demoable.

Set AUTOLAB_API_KEY to route optimization to Autolab.
"""
import os

from improve_predictor import improve as local_improve


def submit(rounds: int = 6) -> dict:
    """
    Hand the labeled dataset + search space to the improvement engine.

    Autolab path (when AUTOLAB_API_KEY is set): upload data/features/extracted.jsonl
    as the training table, target=engagement_rate, and poll the experiment until it
    returns the best model + feature importances. Wire the HTTP calls here against
    the Autolab API. The return contract is identical to the local engine so callers
    do not change.
    """
    key = os.environ.get("AUTOLAB_API_KEY")
    if key:
        # TODO: replace with real Autolab REST calls (upload -> run -> poll -> fetch).
        # Kept as a hard, visible seam rather than a silent stub.
        raise NotImplementedError(
            "AUTOLAB_API_KEY is set but the Autolab HTTP integration is not wired yet. "
            "Unset it to use the local improvement engine."
        )
    return local_improve(rounds)


if __name__ == "__main__":
    import json
    print(json.dumps(submit()["best"], default=str, indent=2))
