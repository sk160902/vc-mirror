import multer from 'multer';
import type { Request } from 'express';
import { ACCEPTED_MIME_TYPES, MAX_UPLOAD_BYTES } from '../../shared/constants.js';

/**
 * Memory storage: the video is read into a buffer, base64-encoded, sent inline
 * to Gemini and dropped. Nothing is ever written to disk.
 */
export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 4 },
  fileFilter: (_req: Request, file, cb) => {
    if ((ACCEPTED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('UNSUPPORTED_MEDIA_TYPE'));
  },
}).single('video');
