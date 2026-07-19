import { z } from 'zod';
import { MOMENT_TYPES, RUBRIC_DIMENSIONS } from './constants.js';

export const companySchema = z.object({
  name: z.string().nullable(),
  problem: z.string(),
  customer: z.string(),
  solution: z.string(),
  businessModel: z.string(),
  missingInformation: z.array(z.string()).default([]),
});

export const rubricEntrySchema = z.object({
  dimension: z.enum(RUBRIC_DIMENSIONS),
  score: z.number().int().min(0).max(5),
  summary: z.string(),
  evidenceTimestamps: z.array(z.number()).default([]),
});

export const timelineEventSchema = z.object({
  id: z.string(),
  timestampSeconds: z.number(),
  endTimestampSeconds: z.number().nullable().default(null),
  type: z.enum(MOMENT_TYPES),
  severity: z.enum(['low', 'medium', 'high']),
  quote: z.string(),
  observation: z.string(),
  investorInterpretation: z.string(),
  whyItMatters: z.string(),
  missingInformation: z.array(z.string()).default([]),
  strongerWording: z.string().nullable().default(null),
});

export const investorQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  reason: z.string(),
  triggerTimestampSeconds: z.number().nullable().default(null),
  answerFramework: z.array(z.string()).default([]),
});

export const claimToVerifySchema = z.object({
  id: z.string(),
  claim: z.string(),
  timestampSeconds: z.number(),
  importance: z.number().int().min(1).max(5),
  verificationQuery: z.string(),
});

export const overallSummarySchema = z.object({
  strongestMomentId: z.string(),
  biggestConcernMomentId: z.string(),
  oneSentenceAssessment: z.string(),
});

export const pitchAnalysisSchema = z.object({
  analysisId: z.string(),
  durationSeconds: z.number(),
  company: companySchema,
  rubric: z.array(rubricEntrySchema),
  timeline: z.array(timelineEventSchema),
  investorQuestions: z.array(investorQuestionSchema),
  claimsToVerify: z.array(claimToVerifySchema),
  overallSummary: overallSummarySchema,
});

export const sourceSchema = z.object({
  title: z.string(),
  publisher: z.string().nullable(),
  url: z.string(),
});

export const verifiedClaimSchema = z.object({
  claimId: z.string(),
  status: z.enum(['supported', 'partially_supported', 'contradicted', 'insufficient_evidence']),
  explanation: z.string(),
  evidenceFor: z.array(z.string()).default([]),
  evidenceAgainst: z.array(z.string()).default([]),
  missingContext: z.array(z.string()).default([]),
  saferWording: z.string(),
  evidenceStrength: z.enum(['weak', 'moderate', 'strong']),
  sources: z.array(sourceSchema).default([]),
});

/**
 * Model-facing schema for stage 1. Deliberately omits analysisId and
 * durationSeconds: the server owns those, not the model.
 */
export const pitchAnalysisModelSchema = pitchAnalysisSchema.omit({
  analysisId: true,
  durationSeconds: true,
});

/**
 * Model-facing schema for stage 2. Deliberately omits `sources`: citations are
 * harvested from url_citation annotations only, never from model JSON.
 */
export const verifiedClaimModelSchema = verifiedClaimSchema.omit({
  claimId: true,
  sources: true,
});
