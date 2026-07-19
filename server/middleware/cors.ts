import cors from 'cors';
import type { CorsOptions } from 'cors';

/**
 * CORS for two very different clients.
 *
 * The hosted web app is a browser origin and must be allowlisted. The native
 * Android client is not a browser: it sends no Origin header at all, so those
 * requests are allowed through rather than rejected.
 *
 * ALLOWED_ORIGINS is a comma-separated list. "*" allows any browser origin,
 * which is acceptable for a public prototype with no cookies or auth.
 */
function parseAllowlist(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function buildCorsOptions(): CorsOptions {
  const allowlist = parseAllowlist();

  return {
    origin(origin, callback) {
      // No Origin header: native Android, curl, server-to-server. Allow.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowlist.length === 0 || allowlist.includes('*')) {
        callback(null, true);
        return;
      }
      callback(null, allowlist.includes(origin));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    // No cookies or credentials are used by either client.
    credentials: false,
    maxAge: 86400,
  };
}

export const corsMiddleware = cors(buildCorsOptions());
