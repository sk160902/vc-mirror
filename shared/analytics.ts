import { MAX_RUBRIC_SCORE, POSITIVE_MOMENT_TYPES } from './constants.js';
import type { AnalysisAnalytics, PitchAnalysis, VerifiedClaim } from './types.js';

/**
 * Pitch readiness heuristic. Computed locally from the six rubric scores so the
 * number is inspectable and never an unexplained model-generated score.
 */
export function computeReadinessScore(analysis: PitchAnalysis): number {
  if (analysis.rubric.length === 0) return 0;
  const total = analysis.rubric.reduce((sum, entry) => sum + entry.score, 0);
  const max = analysis.rubric.length * MAX_RUBRIC_SCORE;
  return Math.round((total / max) * 100);
}

export function countHighRiskMoments(analysis: PitchAnalysis): number {
  const positive = new Set<string>(POSITIVE_MOMENT_TYPES);
  return analysis.timeline.filter((e) => e.severity === 'high' && !positive.has(e.type)).length;
}

/**
 * Percentage of claims selected for verification that came back with at least
 * one genuine grounded source and are not insufficient_evidence.
 * Returns null when no claims were selected, so the UI can say so honestly
 * instead of rendering a misleading 0%.
 */
export function computeEvidenceCoverage(
  analysis: PitchAnalysis,
  verified: VerifiedClaim[]
): number | null {
  if (analysis.claimsToVerify.length === 0) return null;
  const covered = verified.filter(
    (c) => c.status !== 'insufficient_evidence' && c.sources.length > 0
  ).length;
  return Math.round((covered / analysis.claimsToVerify.length) * 100);
}

export function computeAnalytics(
  analysis: PitchAnalysis,
  verified: VerifiedClaim[]
): AnalysisAnalytics {
  return {
    readinessScore: computeReadinessScore(analysis),
    highRiskMoments: countHighRiskMoments(analysis),
    evidenceCoveragePercent: computeEvidenceCoverage(analysis, verified),
    questionsToPrepare: analysis.investorQuestions.length,
  };
}

export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
