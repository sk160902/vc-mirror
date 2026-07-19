/** Minimal logger. Never logs request bodies, video data, or model output. */

function stamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(message: string, meta?: Record<string, string | number | boolean>): void {
    console.log(`[${stamp()}] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`);
  },
  warn(message: string, meta?: Record<string, string | number | boolean>): void {
    console.warn(`[${stamp()}] WARN ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`);
  },
  /** Logs only the error message, never the stack or any upstream payload. */
  error(message: string, err?: unknown): void {
    const detail = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
    console.error(`[${stamp()}] ERROR ${message}${detail ? ' :: ' + detail : ''}`);
  },
};
