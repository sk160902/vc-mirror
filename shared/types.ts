import type { z } from 'zod';
import type {
  claimToVerifySchema,
  companySchema,
  investorQuestionSchema,
  overallSummarySchema,
  pitchAnalysisSchema,
  rubricEntrySchema,
  sourceSchema,
  timelineEventSchema,
  verifiedClaimSchema,
} from './schemas.js';

export type Company = z.infer<typeof companySchema>;
export type RubricEntry = z.infer<typeof rubricEntrySchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type InvestorQuestion = z.infer<typeof investorQuestionSchema>;
export type ClaimToVerify = z.infer<typeof claimToVerifySchema>;
export type OverallSummary = z.infer<typeof overallSummarySchema>;
export type PitchAnalysis = z.infer<typeof pitchAnalysisSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type VerifiedClaim = z.infer<typeof verifiedClaimSchema>;

export type MomentType = TimelineEvent['type'];
export type Severity = TimelineEvent['severity'];
export type RubricDimension = RubricEntry['dimension'];

export interface AnalysisAnalytics {
  readinessScore: number;
  highRiskMoments: number;
  evidenceCoveragePercent: number | null;
  questionsToPrepare: number;
}

export interface ApiError {
  error: string;
  detail?: string;
  retryable: boolean;
}
