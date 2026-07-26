# Deploying the viral-RSI agent to Maritime

Maritime hosts the agent on a persistent micro-VM. Each **wake** runs one
recursive-self-improvement cycle (`agent/run_cycle.py`): ingest the next batch of
MicroLens videos, re-run the improvement engine, persist the champion predictor
and append a point to `state/history.json` (the climbing curve), then sleep.

## Prerequisites
- Maritime account + CLI (`maritime.sh`, promo code `SUNDAI`)
- Your Gemini key, stored as a Maritime secret (never baked into the image)

## Deploy
```bash
maritime login
# bring-your-own container: this repo ships a Dockerfile (agent/Dockerfile)
maritime deploy --dockerfile agent/Dockerfile --name viral-rsi
maritime secret set viral-rsi GEMINI_API_KEY=<your-key>
# optional: route optimization to Autolab instead of the local engine
maritime secret set viral-rsi AUTOLAB_API_KEY=<your-key>
```

## Operate
```bash
maritime chat viral-rsi "run improvement cycle"   # wakes the VM, runs one cycle
maritime logs viral-rsi                            # timestamped cycle log
maritime info viral-rsi                            # status, image, env keys, placement
maritime list                                      # see it sleeping between cycles
```

## What you watch
- `maritime logs` shows each cycle: examples count rising, held-out Spearman, champion config.
- The dashboard shows the agent flip awake→asleep and the wallet spend (the $1/mo story).
- `state/history.json` accumulates one row per wake — the recursive-improvement curve.

## Scheduling
Point a Maritime trigger at the wake action (e.g. hourly, or every N new videos)
so the loop advances autonomously. Between cycles the VM sleeps and stops billing;
the next trigger wakes it from a snapshot with all state intact.
