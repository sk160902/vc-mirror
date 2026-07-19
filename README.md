# VC Mirror

**See what investors hear, not what you think you said.**

Live demo: **https://vc-mirror-363277092393.us-central1.run.app**
Android client: **https://github.com/sk160902/vc-mirror-android**

A founder uploads a short pitch video. VC Mirror identifies the exact moments
that strengthen or weaken the argument, explains the likely investor objection,
verifies externally checkable claims against live web sources, predicts the
questions investors will ask, and suggests stronger wording.

---

## What it is not

Being precise about this matters, because the failure mode of this product
category is confident nonsense.

- Not a funding-success predictor
- Not a replacement for investors
- Not a generic chatbot or presentation coach
- Not a dashboard of arbitrary AI scores

The pitch readiness number is a **heuristic computed locally** from six rubric
scores, not a model-generated judgement. It is labelled as a preparation aid,
not a prediction of funding.

---

## Why Gemini is essential

This product is only practical because one model jointly understands video,
audio and text, and can ground its claims in live search.

1. **Multimodal video understanding.** Gemini 3.5 Flash watches the pitch and
   listens to it in a single pass, quoting what the founder actually said and
   attaching each observation to a real timestamp. No separate transcription,
   diarization or vision pipeline.
2. **Structured output.** The analysis returns schema-constrained JSON, so the
   interface receives predictable objects rather than prose to parse.
3. **Google Search grounding.** Quantitative and market claims are checked
   against current sources, and the citations come back as real annotations.

---

## Architecture

```
React + TypeScript (Vite)          Native Android (Kotlin/Compose)
              │                                    │
              └──────────────┬─────────────────────┘
                             │  HTTPS, no client credentials
                             ▼
                 Express on Cloud Run
                 GEMINI_API_KEY lives only here
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Stage 1: analyzePitch            Stage 2: verifyClaim
   inline base64 video              grounded, then structured
   structured output                citations from annotations
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                Zod validation + normalization
                             ▼
                  Normalized PitchAnalysis
```

Both clients are consumers of the same API. The Android contract is documented
in [`docs/android-api.md`](docs/android-api.md).

### Two design decisions worth explaining

**Verification is a separate request.** The report renders as soon as analysis
returns; grounding fills in afterwards. A verification failure degrades one
section instead of blocking the whole screen.

**Claim verification uses two model calls, not one.** Passing `response_format`
alongside the `google_search` tool suppresses citation annotations (verified
empirically: 1 annotation without it, 0 with it). So the grounded call runs
unstructured to preserve citations, and a second search-free call structures its
prose. Sources come only from real `url_citation` annotations. A URL the model
writes inside its own JSON is discarded, and with zero citations the verdict is
forced to `insufficient_evidence` rather than asserted.

---

## Local setup

```bash
npm install
cp .env.example .env       # add your GEMINI_API_KEY
npm run dev                # Vite on :5173, Express on :8080
```

Run without a key or any model calls:

```bash
USE_MOCK_GEMINI=true npm run dev
```

### Environment

| Variable | Default | Notes |
|---|---|---|
| `GEMINI_API_KEY` | — | Required unless `USE_MOCK_GEMINI=true`. Server-side only. |
| `GEMINI_MODEL` | `gemini-3.5-flash` | |
| `USE_MOCK_GEMINI` | `false` | Deterministic fixture mode |
| `PORT` | `8080` | Cloud Run injects this |
| `ALLOWED_ORIGINS` | — | Comma-separated; `*` allows any browser origin |

### Commands

```bash
npm run dev         npm run build       npm run start
npm run typecheck
```

---

## Deploying to Cloud Run

```bash
gcloud run deploy vc-mirror \
  --source . --region=us-central1 --allow-unauthenticated \
  --memory=1Gi --timeout=300 \
  --set-env-vars="GEMINI_MODEL=gemini-3.5-flash,ALLOWED_ORIGINS=*,GEMINI_API_KEY=<key>"
```

The project must have billing enabled, with Cloud Run, Cloud Build and Artifact
Registry APIs on. If `allUsers` binding fails with a permitted-customer error,
the project sits under an organization enforcing
`constraints/iam.allowedPolicyMemberDomains`; deploy from an org-free project.

---

## Replacing the sample pitch

`GET /api/sample` returns a cached analysis, clearly labelled "Pre-analyzed
sample" in both clients. It is never presented as a live model call.

1. Drop a new MP4 at `client/public/samples/sample-pitch.mp4`
2. Run it through `POST /api/analyze-pitch` and `POST /api/verify-claims`
3. Paste the results into `server/sample/sampleAnalysis.ts`

When the file is absent, `sampleVideoUrl` is `null` and the player renders a
graceful placeholder instead of breaking.

---

## Privacy

Uploaded video is held in memory, sent to Gemini as inline base64, and
discarded. It is never written to disk and never stored in any VC Mirror
database. Google may process or temporarily retain uploaded content under its
own service terms. Analyses live in an in-memory store with a one hour TTL so a
follow-up verification request can reference them.

---

## Known limitations

- **20 MB / 60 second** upload ceiling. Inline base64 rather than the Files API,
  which keeps the request path simple but bounds video size.
- **One claim verified** per analysis in this build.
- Gemini samples video at roughly 1 fps, so fast cuts or briefly-shown visuals
  can be missed. Claims that are spoken aloud analyze most reliably.
- No accounts, database, or persisted history by design.
- Analysis takes 20 to 45 seconds and grounded verification 25 to 60 seconds.

---

## Repository layout

```
client/    React + TypeScript + Tailwind web client
server/    Express, Gemini integration, validation, normalization
shared/    Zod schemas, types, analytics, constants
docs/      android-api.md, the native client contract
```
