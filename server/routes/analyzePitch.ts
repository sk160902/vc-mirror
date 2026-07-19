import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/errorHandler.js';
import { uploadVideo } from '../middleware/upload.js';
import { logger } from '../utils/logger.js';
import { putAnalysis } from '../utils/store.js';
import { runPitchAnalysis } from '../gemini/analyzePitch.js';
import { normalizeAnalysis } from '../utils/normalize.js';

const router = Router();

router.post('/analyze-pitch', (req, res, next) => {
  uploadVideo(req, res, (uploadErr: unknown) => {
    if (uploadErr) {
      next(uploadErr);
      return;
    }

    void (async () => {
      try {
        const file = req.file;
        if (!file || file.size === 0) {
          throw new AppError(400, 'Please choose a pitch video to analyze.', false);
        }

        const reported = Number.parseInt(String(req.body?.durationSeconds ?? ''), 10);
        const durationSeconds = Number.isFinite(reported) && reported > 0 ? reported : 60;

        logger.info('Analyzing pitch', { bytes: file.size, durationSeconds });

        const raw = await runPitchAnalysis({
          base64Video: file.buffer.toString('base64'),
          mimeType: file.mimetype,
          durationSeconds,
        });

        const analysis = normalizeAnalysis(raw, {
          analysisId: randomUUID(),
          durationSeconds,
        });

        putAnalysis(analysis);
        res.json({ analysis });
      } catch (err) {
        next(err);
      }
    })();
  });
});

export default router;
