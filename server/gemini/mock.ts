import { SAMPLE_ANALYSIS, SAMPLE_VERIFICATION } from '../sample/sampleAnalysis.js';
import type { ClaimToVerify, VerifiedClaim } from '../../shared/types.js';

/**
 * Deterministic stand-in used when USE_MOCK_GEMINI=true. Lets the full request
 * path, validation and UI run without a key or a live model call.
 */
export function mockPitchAnalysis(): unknown {
  const { analysisId: _id, durationSeconds: _d, ...rest } = SAMPLE_ANALYSIS;
  return rest;
}

export function mockClaimVerification(claims: ClaimToVerify[]): VerifiedClaim[] {
  return claims.map((claim, index) => {
    const template = SAMPLE_VERIFICATION[index] ?? SAMPLE_VERIFICATION[0];
    return { ...template, claimId: claim.id };
  });
}
