import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/errorHandler.js';
import { uploadVideo } from '../middleware/upload.js';
import { logger } from '../utils/logger.js';
import { runViralityAnalysis } from '../gemini/analyzeVirality.js';
import { normalizeViralityAnalysis } from '../utils/normalize.js';

const router = Router();

router.post('/analyze-virality', (req, res, next) => {
  uploadVideo(req, res, (uploadErr: unknown) => {
    if (uploadErr) {
      next(uploadErr);
      return;
    }

    void (async () => {
      try {
        const file = req.file;
        if (!file || file.size === 0) {
          throw new AppError(400, 'Please choose a video to analyze.', false);
        }

        const reported = Number.parseInt(String(req.body?.durationSeconds ?? ''), 10);
        const durationSeconds = Number.isFinite(reported) && reported > 0 ? reported : 60;

        logger.info('Analyzing virality', { bytes: file.size, durationSeconds });

        const raw = await runViralityAnalysis({
          base64Video: file.buffer.toString('base64'),
          mimeType: file.mimetype,
          durationSeconds,
        });

        const analysis = normalizeViralityAnalysis(raw, {
          analysisId: randomUUID(),
          durationSeconds,
        });

        res.json({ analysis });
      } catch (err) {
        next(err);
      }
    })();
  });
});

export default router;
