import type { PitchAnalysis } from '../../shared/types.js';

interface Entry {
  analysis: PitchAnalysis;
  expiresAt: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 200;

/**
 * In-memory analysis store. Deliberately not a database: analyses live only long
 * enough for the verification request that follows them.
 */
const entries = new Map<string, Entry>();

function evictExpired(): void {
  const now = Date.now();
  for (const [id, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(id);
  }
}

export function putAnalysis(analysis: PitchAnalysis): void {
  evictExpired();
  if (entries.size >= MAX_ENTRIES) {
    const oldest = entries.keys().next();
    if (!oldest.done) entries.delete(oldest.value);
  }
  entries.set(analysis.analysisId, { analysis, expiresAt: Date.now() + TTL_MS });
}

export function getAnalysis(id: string): PitchAnalysis | null {
  evictExpired();
  return entries.get(id)?.analysis ?? null;
}
