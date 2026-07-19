import {
  MAX_CLAIMS_TO_VERIFY,
  MAX_TIMELINE_EVENTS,
  MOMENT_TYPES,
  NOT_ESTABLISHED,
  RUBRIC_DIMENSIONS,
  TARGET_INVESTOR_QUESTIONS,
} from '../../shared/constants.js';

export const PITCH_SYSTEM_INSTRUCTION = `You are an experienced seed-stage investor reviewing a founder's pitch video.

Evaluate ONLY what is actually present in the video's audio and visuals.

You must never invent or infer:
- revenue, traction, customer counts, or usage data
- market size figures the founder did not state
- founder background or credentials not stated
- named competitors not mentioned
- funding probability or investment outcome

When something is absent from the pitch, write exactly: "${NOT_ESTABLISHED}"

Rules for your output:
- Quote the founder closely. The "quote" field must be what was actually said.
- Attach every observation to a timestamp in seconds from the start of the video.
- Describe what an investor may reasonably infer, not what all investors will think.
- Do not predict whether the company will be funded.
- Do not describe your own internal reasoning. State observable grounds only.`;

export function buildPitchPrompt(durationSeconds: number): string {
  return `Analyze this ${durationSeconds}-second startup pitch video.

Produce:

1. company: what the pitch communicates about problem, customer, solution and business model. Use "${NOT_ESTABLISHED}" for anything absent. List what a seed investor would expect but did not hear in missingInformation.

2. rubric: score all six dimensions (${RUBRIC_DIMENSIONS.join(', ')}) from 0 to 5 based strictly on evidence in the video. Give a one-or-two sentence summary per dimension and the timestamps (in seconds) that justify it.

3. timeline: at most ${MAX_TIMELINE_EVENTS} distinct moments, each classified as one of ${MOMENT_TYPES.join(', ')}. Include both moments that build conviction and moments that weaken it. For each: the timestamp in seconds, the founder's quote, what you observed, what an investor may hear, why it matters, what information is missing, and a concrete stronger rewrite of that specific line (null when the moment is already strong).

4. investorQuestions: exactly ${TARGET_INVESTOR_QUESTIONS} questions an investor is likely to ask, each tied to a specific weakness you identified. Give the reason and a three-step structure for answering.

5. claimsToVerify: up to ${MAX_CLAIMS_TO_VERIFY} externally checkable factual claim from the pitch. Choose quantitative, market, regulatory or competitive claims only. Never select opinions or predictions. Provide a concise web search query that would verify it. Return an empty array if the pitch contains no externally checkable claim.

6. overallSummary: the id of the strongest moment, the id of the moment representing the biggest investor concern, and a single sentence assessing the pitch.

Use short stable ids like "m1", "q1", "c1".
All timestamps must be within 0 and ${durationSeconds} seconds.`;
}

/** Call 1: grounded and unstructured, so citation annotations are preserved. */
export const CLAIM_RESEARCH_INSTRUCTION = `You research factual claims made in startup pitches using Google Search.

Rules:
- Always use the search tool before answering.
- Report what the evidence actually says, including where it disagrees with the claim.
- Pay attention to scope: whether a figure is global or national, whole-sector or narrow, and what year it describes.
- Never state a numeric probability that the claim is true.
- If the evidence does not settle the claim, say so plainly rather than guessing.`;

export function buildClaimResearchPrompt(
  claim: string,
  query: string,
  timestampSeconds: number
): string {
  return `A founder said the following at ${timestampSeconds} seconds into their pitch:

"${claim}"

Search the web for evidence. Start from this query: ${query}

Then write a short plain-prose briefing covering:
- what the best available evidence says
- whether it supports, partly supports, or contradicts the claim
- what scope or definition the founder's figure appears to conflate
- what qualification the founder omitted
- how strong the available evidence is

Write prose, not JSON.`;
}

/** Call 2: structures call 1's prose. No search tool, so it cannot invent a URL. */
export const CLAIM_STRUCTURE_INSTRUCTION = `You convert a research briefing into a strict JSON verdict.

Rules:
- Use only what the briefing states. Do not add outside knowledge.
- Never include URLs, source names or publishers anywhere in your output. Citations are attached separately from the search tool.
- Distinguish a figure that is directionally right but wrongly attributed (partially_supported) from one that is wrong (contradicted).
- Use insufficient_evidence when the briefing does not settle the claim.
- saferWording must be a defensible rewrite the founder could say out loud.`;

export function buildClaimStructurePrompt(claim: string, research: string): string {
  return `The founder's claim was:

"${claim}"

A researcher produced this briefing from live web sources:

---
${research}
---

Convert the briefing into the required JSON verdict. Do not include any URLs or source names.`;
}

/** Hand-written JSON Schemas. Kept in lockstep with shared/schemas.ts. */

export const PITCH_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['company', 'rubric', 'timeline', 'investorQuestions', 'claimsToVerify', 'overallSummary'],
  properties: {
    company: {
      type: 'object',
      required: ['name', 'problem', 'customer', 'solution', 'businessModel', 'missingInformation'],
      properties: {
        name: { type: ['string', 'null'] },
        problem: { type: 'string' },
        customer: { type: 'string' },
        solution: { type: 'string' },
        businessModel: { type: 'string' },
        missingInformation: { type: 'array', items: { type: 'string' } },
      },
    },
    rubric: {
      type: 'array',
      items: {
        type: 'object',
        required: ['dimension', 'score', 'summary', 'evidenceTimestamps'],
        properties: {
          dimension: { type: 'string', enum: [...RUBRIC_DIMENSIONS] },
          score: { type: 'integer', minimum: 0, maximum: 5 },
          summary: { type: 'string' },
          evidenceTimestamps: { type: 'array', items: { type: 'number' } },
        },
      },
    },
    timeline: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'timestampSeconds',
          'type',
          'severity',
          'quote',
          'observation',
          'investorInterpretation',
          'whyItMatters',
          'missingInformation',
          'strongerWording',
        ],
        properties: {
          id: { type: 'string' },
          timestampSeconds: { type: 'number' },
          endTimestampSeconds: { type: ['number', 'null'] },
          type: { type: 'string', enum: [...MOMENT_TYPES] },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          quote: { type: 'string' },
          observation: { type: 'string' },
          investorInterpretation: { type: 'string' },
          whyItMatters: { type: 'string' },
          missingInformation: { type: 'array', items: { type: 'string' } },
          strongerWording: { type: ['string', 'null'] },
        },
      },
    },
    investorQuestions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'question', 'reason', 'answerFramework'],
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
          reason: { type: 'string' },
          triggerTimestampSeconds: { type: ['number', 'null'] },
          answerFramework: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    claimsToVerify: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'claim', 'timestampSeconds', 'importance', 'verificationQuery'],
        properties: {
          id: { type: 'string' },
          claim: { type: 'string' },
          timestampSeconds: { type: 'number' },
          importance: { type: 'integer', minimum: 1, maximum: 5 },
          verificationQuery: { type: 'string' },
        },
      },
    },
    overallSummary: {
      type: 'object',
      required: ['strongestMomentId', 'biggestConcernMomentId', 'oneSentenceAssessment'],
      properties: {
        strongestMomentId: { type: 'string' },
        biggestConcernMomentId: { type: 'string' },
        oneSentenceAssessment: { type: 'string' },
      },
    },
  },
};

export const CLAIM_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: [
    'status',
    'explanation',
    'evidenceFor',
    'evidenceAgainst',
    'missingContext',
    'saferWording',
    'evidenceStrength',
  ],
  properties: {
    status: {
      type: 'string',
      enum: ['supported', 'partially_supported', 'contradicted', 'insufficient_evidence'],
    },
    explanation: { type: 'string' },
    evidenceFor: { type: 'array', items: { type: 'string' } },
    evidenceAgainst: { type: 'array', items: { type: 'string' } },
    missingContext: { type: 'array', items: { type: 'string' } },
    saferWording: { type: 'string' },
    evidenceStrength: { type: 'string', enum: ['weak', 'moderate', 'strong'] },
  },
};
