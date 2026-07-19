import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { errorHandler } from './middleware/errorHandler.js';
import { corsMiddleware } from './middleware/cors.js';
import { logger } from './utils/logger.js';
import { assertGeminiConfig, isMockMode } from './gemini/client.js';
import sampleRouter from './routes/sample.js';
import analyzePitchRouter from './routes/analyzePitch.js';
import verifyClaimsRouter from './routes/verifyClaims.js';

// Load .env for local development. On Cloud Run the platform supplies env vars
// directly and no .env file exists, so a missing file is not an error.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env present. Rely on the ambient environment.
}

const PORT = Number.parseInt(process.env.PORT ?? '8080', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Fail fast with an actionable message rather than at first request.
assertGeminiConfig();

const app = express();

app.set('trust proxy', 1);
app.use(
  helmet({
    // Vite emits inline module preloads; CSP is relaxed only for those.
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            mediaSrc: ["'self'", 'blob:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
// Applied before the API routes so both the hosted web app and the native
// Android client can reach them.
app.use('/api', corsMiddleware);
app.use(express.json({ limit: '64kb' }));

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a moment.', retryable: true },
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mock: isMockMode() });
});

app.use('/api', sampleRouter);
app.use('/api', analyzePitchRouter);
app.use('/api', verifyClaimsRouter);

if (isProduction) {
  const clientDist = path.resolve(process.cwd(), 'dist/client');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1h', index: false }));
    // SPA fallback for everything that is not an API route.
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    logger.warn('dist/client not found. Run "npm run build" before "npm run start".');
  }
}

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`VC Mirror listening on 0.0.0.0:${PORT}`, {
    mode: isProduction ? 'production' : 'development',
    gemini: isMockMode() ? 'mock' : 'live',
  });
});
