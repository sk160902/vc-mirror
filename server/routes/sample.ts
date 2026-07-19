import { Router } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { SAMPLE_ANALYSIS, SAMPLE_VERIFICATION } from '../sample/sampleAnalysis.js';
import { putAnalysis } from '../utils/store.js';

export const SAMPLE_VIDEO_FILENAME = 'sample-pitch.mp4';

const router = Router();

/**
 * Returns the pre-analyzed sample. The client labels this clearly as a cached
 * sample: it is never presented as a live model call.
 */
router.get('/sample', (_req, res) => {
  // Only advertise the sample video when the file is actually installed, so the
  // player renders a graceful placeholder instead of a broken element.
  const videoPath = path.resolve(
    process.cwd(),
    'client/public/samples',
    SAMPLE_VIDEO_FILENAME
  );
  const distPath = path.resolve(process.cwd(), 'dist/client/samples', SAMPLE_VIDEO_FILENAME);
  const available = existsSync(videoPath) || existsSync(distPath);

  putAnalysis(SAMPLE_ANALYSIS);

  res.json({
    analysis: SAMPLE_ANALYSIS,
    verification: SAMPLE_VERIFICATION,
    sampleVideoUrl: available ? `/samples/${SAMPLE_VIDEO_FILENAME}` : null,
  });
});

export default router;
