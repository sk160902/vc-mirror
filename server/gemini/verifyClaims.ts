import { createInteraction, isMockMode } from './client.js';
import {
  CLAIM_JSON_SCHEMA,
  CLAIM_RESEARCH_INSTRUCTION,
  CLAIM_STRUCTURE_INSTRUCTION,
  buildClaimResearchPrompt,
  buildClaimStructurePrompt,
} from './prompts.js';
import { extractSources } from './grounding.js';
import { mockClaimVerification } from './mock.js';
import { verifiedClaimModelSchema } from '../../shared/schemas.js';
import type { ClaimToVerify, Source, VerifiedClaim } from '../../shared/types.js';
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
function unresolved(claim: ClaimToVerify, explanation: string, sources: Source[] = []): VerifiedClaim {
  return {
    claimId: claim.id,
    status: 'insufficient_evidence',
    explanation,
    evidenceFor: [],
    evidenceAgainst: [],
    missingContext: [],
    saferWording: claim.claim,
    evidenceStrength: 'weak',
    sources,
  };
}

/**
 * Two-call verification.
 *
 * Call 1 is grounded but unstructured, because supplying response_format
 * alongside the google_search tool suppresses citation annotations. Its
 * annotations are the only trusted source of citations.
 *
 * Call 2 structures call 1's prose with no search tool attached, so it cannot
 * introduce a URL of its own.
 */
async function verifyOne(claim: ClaimToVerify): Promise<VerifiedClaim> {
  let research: string;
  let sources: Source[];

  try {
    const grounded = await createInteraction({
      systemInstruction: CLAIM_RESEARCH_INSTRUCTION,
      useGoogleSearch: true,
      input: [
        {
          type: 'text',
          text: buildClaimResearchPrompt(
            claim.claim,
            claim.verificationQuery,
            claim.timestampSeconds
          ),
        },
      ],
    });

    research = grounded.text;
    sources = extractSources(grounded.annotations);

    if (!research) {
      return unresolved(claim, 'External verification returned no findings for this claim.');
    }
  } catch (err) {
    logger.error('Claim research call failed', err);
    return unresolved(claim, 'External verification was unavailable for this claim.');
  }

  // Without a real grounded citation we do not assert a verdict.
  if (sources.length === 0) {
    return unresolved(
      claim,
      'The search returned no citable sources for this claim, so no verdict is asserted.'
    );
  }

  try {
    const structured = await createInteraction({
      systemInstruction: CLAIM_STRUCTURE_INSTRUCTION,
      jsonSchema: CLAIM_JSON_SCHEMA,
      input: [{ type: 'text', text: buildClaimStructurePrompt(claim.claim, research) }],
    });

    const parsed = verifiedClaimModelSchema.safeParse(JSON.parse(stripFences(structured.text)));
    if (!parsed.success) {
      return unresolved(claim, 'External verification returned an unexpected response.', sources);
    }

    return { ...parsed.data, claimId: claim.id, sources };
  } catch (err) {
    logger.error('Claim structuring call failed', err);
    return unresolved(claim, 'We found sources but could not summarize the verdict.', sources);
  }
}

export async function runClaimVerification(claims: ClaimToVerify[]): Promise<VerifiedClaim[]> {
  if (isMockMode()) {
    logger.info('Using mock claim verification');
    return mockClaimVerification(claims);
  }
  return Promise.all(claims.map(verifyOne));
}
