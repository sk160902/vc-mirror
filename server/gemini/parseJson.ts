import { AppError } from '../middleware/errorHandler.js';

/** Strips markdown fences some models still wrap around JSON. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

export function parseJson(text: string): unknown {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // One repair attempt: take the outermost balanced object.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Fall through to the caller's error.
      }
    }
    throw new AppError(502, 'We could not read the analysis. Retry the same video.', true);
  }
}
