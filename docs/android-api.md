# VC Mirror Backend API

Contract for native clients. The Android app and the React web app are both
consumers of this API; neither holds a Gemini key.

**Base URL** is the Cloud Run service URL, for example
`https://vc-mirror-xxxxxxxx-uw.a.run.app`. The Android client stores this in a
single configurable `API_BASE_URL`.

All Gemini calls and `GEMINI_API_KEY` stay on the backend. There is no client
credential, no auth header, and no cookie.

---

## Conventions

- All responses are `application/json; charset=utf-8`.
- All timestamps are **integer seconds** from the start of the video.
- Schemas are platform-independent: no web-only or Android-only fields.
- Errors always use the shape in [Errors](#errors).
- Rate limit: 30 requests per minute per IP, per endpoint prefix `/api`.

### CORS

Configured via the `ALLOWED_ORIGINS` env var (comma-separated; `*` allows any
browser origin).

Native Android sends **no `Origin` header**, and such requests are always
allowed. CORS is therefore only relevant to the hosted web client. No
preflight is triggered by the Android calls below, since they use
`multipart/form-data` and `application/json` with no custom headers.

---

## `GET /api/health`

Liveness probe.

```json
{ "status": "ok", "mock": false }
```

`mock` is `true` when the server runs with `USE_MOCK_GEMINI=true`, which
returns deterministic fixture data without calling Gemini.

---

## `GET /api/sample`

Returns the pre-analyzed sample. No model call. Use this for the
"View Sample Analysis" screen and as an offline-safe demo path.

```json
{
  "analysis":  { "...": "PitchAnalysis" },
  "verification": [ { "...": "VerifiedClaim" } ],
  "sampleVideoUrl": "/samples/sample-pitch.mp4"
}
```

`sampleVideoUrl` is **relative** and may be `null` when no sample video is
installed in the deployment. Resolve against `API_BASE_URL`; when `null`,
render the analysis without a player.

> Label this clearly in the UI as a pre-analyzed sample. It must not be
> presented as a live analysis.

---

## `POST /api/analyze-pitch`

The main endpoint. Accepts a short pitch video, returns a normalized
`PitchAnalysis`.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `video` | file | yes | MP4 or WebM. Max **20 MB**. |
| `durationSeconds` | text | no | Integer video duration. Defaults to `60` when absent or unparseable. Send it: it bounds timestamp clamping. |

Constraints:
- Accepted MIME types: `video/mp4`, `video/webm`
- Max size: **20 MB** (enforced server-side; larger returns `413`)
- Expected duration: **60 seconds or less**. Longer videos are accepted but
  analysis quality degrades.
- Typical latency: **20 to 45 seconds**. Use a client timeout of at least
  **120 seconds**.

The video is held in memory, sent to Gemini as inline base64, and discarded. It
is never written to disk and never stored in a database.

**200 response**

```json
{ "analysis": { "...": "PitchAnalysis" } }
```

### Kotlin example

```kotlin
val body = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart(
        "video", "pitch.mp4",
        file.asRequestBody("video/mp4".toMediaType())
    )
    .addFormDataPart("durationSeconds", durationSeconds.toString())
    .build()

val request = Request.Builder()
    .url("$API_BASE_URL/api/analyze-pitch")
    .post(body)
    .build()
```

---

## `POST /api/verify-claim`

Verifies **one** externally checkable claim using Google Search grounding.
This is the endpoint the Android client should use.

**Content-Type:** `application/json`

Two accepted forms:

**A. By stored analysis** (normal path, right after `analyze-pitch`)

```json
{ "analysisId": "b7881d9c-...", "claimId": "c1" }
```

`claimId` is optional; the first claim is used when omitted.

**B. Self-described claim** (works even if the server no longer holds the analysis)

```json
{
  "claim": {
    "id": "c1",
    "claim": "The restaurant industry wastes over $160 billion of food a year.",
    "timestampSeconds": 10,
    "importance": 5,
    "verificationQuery": "restaurant industry annual food waste value"
  }
}
```

**200 response**

```json
{ "verification": { "...": "VerifiedClaim" } }
```

`verification` is `null` when the analysis contained no checkable claim.
Typical latency: **25 to 60 seconds** (two chained model calls). Use a client
timeout of at least **120 seconds**.

> Verification is a **separate request on purpose**. Render the analysis as
> soon as `analyze-pitch` returns, then fill this section in. A verification
> failure must never block or clear the report.

---

## `POST /api/verify-claims`

Batch form used by the web client. Returns `{ "verification": [ ... ] }`, an
array. Requires `{ "analysisId": "..." }`. Capped at 1 claim in the current
build. Prefer `/api/verify-claim` on Android.

---

## Schemas

### PitchAnalysis

```jsonc
{
  "analysisId": "string",          // pass to /api/verify-claim
  "durationSeconds": 44,
  "company": {
    "name": "string | null",
    "problem": "string",
    "customer": "string",
    "solution": "string",
    "businessModel": "string",
    "missingInformation": ["string"]
  },
  "rubric": [                       // always exactly 6, always all 6 dimensions
    {
      "dimension": "problem_urgency | solution_clarity | evidence_traction | market_gtm | differentiation_defensibility | delivery_structure",
      "score": 0,                   // integer 0..5
      "summary": "string",
      "evidenceTimestamps": [12, 30]
    }
  ],
  "timeline": [                     // 1..6 entries, sorted ascending, deduped
    {
      "id": "m1",
      "timestampSeconds": 10,
      "endTimestampSeconds": 18,    // nullable
      "type": "conviction_builder | clarity_gap | evidence_gap | investor_objection | defensibility_risk | strong_moment",
      "severity": "low | medium | high",
      "quote": "string",
      "observation": "string",
      "investorInterpretation": "string",
      "whyItMatters": "string",
      "missingInformation": ["string"],
      "strongerWording": "string | null"
    }
  ],
  "investorQuestions": [            // up to 3
    {
      "id": "q1",
      "question": "string",
      "reason": "string",
      "triggerTimestampSeconds": 34, // nullable
      "answerFramework": ["string"]
    }
  ],
  "claimsToVerify": [               // 0 or 1 in the current build
    {
      "id": "c1",
      "claim": "string",
      "timestampSeconds": 10,
      "importance": 5,              // integer 1..5
      "verificationQuery": "string"
    }
  ],
  "overallSummary": {
    "strongestMomentId": "m1",      // guaranteed to exist in timeline
    "biggestConcernMomentId": "m5", // guaranteed to exist in timeline
    "oneSentenceAssessment": "string"
  }
}
```

Server-side guarantees the client can rely on:

- `rubric` always contains all six dimensions, scores clamped to `0..5`.
- `timeline` is non-empty, sorted ascending, at most 6, and every
  `timestampSeconds` is within `0..durationSeconds`.
- `strongestMomentId` and `biggestConcernMomentId` always resolve to a real
  timeline entry.
- `triggerTimestampSeconds` is either `null` or within the video duration.

### VerifiedClaim

```jsonc
{
  "claimId": "c1",
  "status": "supported | partially_supported | contradicted | insufficient_evidence",
  "explanation": "string",
  "evidenceFor": ["string"],
  "evidenceAgainst": ["string"],
  "missingContext": ["string"],
  "saferWording": "string",
  "evidenceStrength": "weak | moderate | strong",
  "sources": [
    { "title": "refed.org", "publisher": "refed.org | null", "url": "https://..." }
  ]
}
```

Notes for client authors:

- `sources` comes **only** from real `url_citation` annotations returned by the
  Google Search tool. URLs the model writes in its own output are discarded.
- `sources` is capped at **4**, deduped by publisher.
- URLs are `vertexaisearch.cloud.google.com` grounding redirects. Open them
  as-is; they resolve to the publisher. Show `publisher` as the label.
- `sources` may be empty. When it is, `status` is always
  `insufficient_evidence`: no verdict is asserted without a citation.

### Pitch readiness heuristic

**Computed client-side. It is not in the API response.**

```
readiness = round(sum(rubric[].score) / (rubric.length * 5) * 100)
```

Label it "Pitch readiness heuristic" and show the disclaimer: *this is a
structured preparation aid, not a prediction of funding.* Do not present it as
a model-generated score.

Also computed client-side:

- **High-risk moments** — `timeline` entries where `severity == "high"` and
  `type` is not `conviction_builder` or `strong_moment`.
- **Evidence coverage** — percent of `claimsToVerify` that returned a
  `VerifiedClaim` with a non-`insufficient_evidence` status **and** at least
  one source. Show `—` when `claimsToVerify` is empty.

---

## Errors

Every error, on every endpoint:

```json
{ "error": "Human-readable, actionable message.", "retryable": true }
```

Show `error` directly to the user. Offer a retry control when
`retryable` is `true`.

| Status | When | `retryable` |
|---|---|---|
| `400` | No file, or malformed claim/analysisId payload | `false` |
| `404` | `analysisId` expired (1 hour TTL) or unknown | `false` |
| `413` | Video over 20 MB | `false` |
| `415` | Not MP4 or WebM | `false` |
| `429` | Client rate limit, or upstream model quota | `true` |
| `500` | Unexpected server error | `true` |
| `502` | Model unreachable, empty, or unreadable output | `true` |

Responses never contain stack traces, prompts, raw model output, API keys, or
server filesystem paths.

### Client handling checklist

- `404` on verify → the analysis expired. Re-run `analyze-pitch`.
- `413` / `415` → validate before upload; do not retry the same file.
- `429` → back off, then retry once.
- `502` on verify → keep the report on screen, show
  "External verification unavailable" plus a retry.
- Network timeout → the analysis may still have succeeded server-side, but
  there is no way to recover it. Re-upload.

---

## Golden path

```
GET  /api/health                    (optional readiness check)
        │
        ├── "View Sample Analysis"
        │      GET /api/sample  ──▶ render immediately, no model call
        │
        └── "Analyze My Pitch"
               POST /api/analyze-pitch   (multipart, 20 to 45 s)
                      │
                      ├──▶ render report immediately
                      │
                      └──▶ POST /api/verify-claim  (25 to 60 s)
                                 │
                                 └──▶ fill in the verification section
```

Render the report before verification returns. The two calls are independent so
a grounding failure degrades one section instead of the whole screen.
