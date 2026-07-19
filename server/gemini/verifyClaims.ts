import { createInteraction, isMockMode } from './client.js';
import { CLAIM_JSON_SCHEMA, CLAIM_SYSTEM_INSTRUCTION, buildClaimPrompt } from './prompts.js';
import { extractSources } from './grounding.js';
import { mockClaimVerification } from './mock.js';
import { verifiedClaimModelSchema } from '../../shared/schemas.js';
import type { ClaimToVerify, VerifiedClaim } from '../../shared/types.js';
import { logger } from '../utils/logger.js';

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

/** A claim we could not verify still renders, honestly labelled. */
function unresolved(claim: ClaimToVerify, explanation: string): VerifiedClaim {
  return {
    claimId: claim.id,
    status: 'insufficient_evidence',
    explanation,
    evidenceFor: [],
    evidenceAgainst: [],
    missingContext: [],
    saferWording: claim.claim,
    evidenceStrength: 'weak',
    sources: [],
  };
}

async function verifyOne(claim: ClaimToVerify): Promise<VerifiedClaim> {
  try {
    const { text, annotations } = await createInteraction({
      systemInstruction: CLAIM_SYSTEM_INSTRUCTION,
      jsonSchema: CLAIM_JSON_SCHEMA,
      useGoogleSearch: true,
      input: [
        {
          type: 'text',
          text: buildClaimPrompt(claim.claim, claim.verificationQuery, claim.timestampSeconds),
        },
      ],
    });

    // Sources come from grounded annotations only, never from the model's JSON.
    const sources = extractSources(annotations);

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(stripFences(text));
    } catch {
      return unresolved(claim, 'External verification returned an unreadable response.');
    }

    const result = verifiedClaimModelSchema.safeParse(parsedBody);
    if (!result.success) {
      return unresolved(claim, 'External verification returned an unexpected response.');
    }

    // Without a real citation we do not assert a verdict, per the evidence rule.
    if (sources.length === 0) {
      return {
        ...result.data,
        claimId: claim.id,
        status: 'insufficient_evidence',
        sources: [],
      };
    }

    return { ...result.data, claimId: claim.id, sources };
  } catch (err) {
    logger.error('Claim verification failed', err);
    return unresolved(claim, 'External verification was unavailable for this claim.');
  }
}

export async function runClaimVerification(claims: ClaimToVerify[]): Promise<VerifiedClaim[]> {
  if (isMockMode()) {
    logger.info('Using mock claim verification');
    return mockClaimVerification(claims);
  }
  return Promise.all(claims.map(verifyOne));
}
