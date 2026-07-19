import { Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { getAnalysis } from '../utils/store.js';
import { logger } from '../utils/logger.js';
import { runClaimVerification } from '../gemini/verifyClaims.js';
import { MAX_CLAIMS_TO_VERIFY } from '../../shared/constants.js';

const router = Router();

router.post('/verify-claims', (req, res, next) => {
  void (async () => {
    try {
      const analysisId = typeof req.body?.analysisId === 'string' ? req.body.analysisId : '';
      if (!analysisId) throw new AppError(400, 'Missing analysis reference.', false);

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
      const verification = await runClaimVerification(claims);
      res.json({ verification });
    } catch (err) {
      next(err);
    }
  })();
});

export default router;
