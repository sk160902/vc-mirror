import { Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { getAnalysis } from '../utils/store.js';
import { logger } from '../utils/logger.js';
import { runClaimVerification } from '../gemini/verifyClaims.js';
import { claimToVerifySchema } from '../../shared/schemas.js';
import { MAX_CLAIMS_TO_VERIFY } from '../../shared/constants.js';
import type { ClaimToVerify } from '../../shared/types.js';

const router = Router();

function readAnalysisId(body: unknown): string {
  const id = (body as { analysisId?: unknown })?.analysisId;
  if (typeof id !== 'string' || !id) {
    throw new AppError(400, 'Missing analysis reference.', false);
  }
  return id;
}

/**
 * Batch form used by the web client, which verifies whatever the analysis
 * selected (capped at MAX_CLAIMS_TO_VERIFY).
 */
router.post('/verify-claims', (req, res, next) => {
  void (async () => {
    try {
      const analysisId = readAnalysisId(req.body);
      const analysis = getAnalysis(analysisId);
      if (!analysis) {
        throw new AppError(
          404,
          'That analysis has expired. Re-run the analysis to verify claims.',
          false
        );
      }

      const claims = analysis.claimsToVerify.slice(0, MAX_CLAIMS_TO_VERIFY);
      if (claims.length === 0) {
        res.json({ verification: [] });
        return;
      }

      logger.info('Verifying claims', { count: claims.length });
      res.json({ verification: await runClaimVerification(claims) });
    } catch (err) {
      next(err);
    }
  })();
});

/**
 * Single-claim form for the Android client. Accepts either an analysisId (plus
 * optional claimId), or a fully self-described claim object so a client can
 * verify without the server still holding the analysis.
 */
router.post('/verify-claim', (req, res, next) => {
  void (async () => {
    try {
      const body = req.body as { analysisId?: unknown; claimId?: unknown; claim?: unknown };

      let claim: ClaimToVerify | null = null;

      if (body.claim !== undefined) {
        const parsed = claimToVerifySchema.safeParse(body.claim);
        if (!parsed.success) {
          throw new AppError(400, 'The claim payload was not in the expected format.', false);
        }
        claim = parsed.data;
      } else {
        const analysis = getAnalysis(readAnalysisId(body));
        if (!analysis) {
          throw new AppError(
            404,
            'That analysis has expired. Re-run the analysis to verify claims.',
            false
          );
        }
        const claimId = typeof body.claimId === 'string' ? body.claimId : null;
        claim = claimId
          ? (analysis.claimsToVerify.find((c) => c.id === claimId) ?? null)
          : (analysis.claimsToVerify[0] ?? null);

        if (!claim) {
          res.json({ verification: null });
          return;
        }
      }

      logger.info('Verifying single claim');
      const [verification] = await runClaimVerification([claim]);
      res.json({ verification: verification ?? null });
    } catch (err) {
      next(err);
    }
  })();
});

export default router;
