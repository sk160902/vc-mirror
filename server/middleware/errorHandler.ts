import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  constructor(status: number, message: string, retryable = false) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Terminal error handler. Returns a safe, actionable message only.
 * Never leaks stacks, prompts, raw model output, keys, or filesystem paths.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'That video is larger than the 20 MB limit for this prototype.'
        : 'We could not read that upload. Please try a different file.';
    res.status(413).json({ error: message, retryable: false });
    return;
  }

  if (err instanceof Error && err.message === 'UNSUPPORTED_MEDIA_TYPE') {
    res.status(415).json({ error: 'Please upload an MP4 or WebM video.', retryable: false });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, retryable: err.retryable });
    return;
  }

  logger.error('Unhandled request error', err);
  res.status(500).json({
    error: 'Something went wrong on our side. Please try again.',
    retryable: true,
  });
}
