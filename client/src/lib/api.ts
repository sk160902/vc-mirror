import type { PitchAnalysis, VerifiedClaim } from '@shared/types.js';

export interface SampleResponse {
  analysis: PitchAnalysis;
  verification: VerifiedClaim[];
  sampleVideoUrl: string | null;
}

export class ApiRequestError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'ApiRequestError';
    this.retryable = retryable;
  }
}

async function parseError(res: Response): Promise<never> {
  let message = 'Something went wrong. Please try again.';
  let retryable = true;
  try {
    const body = (await res.json()) as { error?: string; retryable?: boolean };
    if (body.error) message = body.error;
    if (typeof body.retryable === 'boolean') retryable = body.retryable;
  } catch {
    // Non-JSON error body. Keep the safe default message.
  }
  throw new ApiRequestError(message, retryable);
}

export async function fetchSample(): Promise<SampleResponse> {
  const res = await fetch('/api/sample');
  if (!res.ok) await parseError(res);
  return (await res.json()) as SampleResponse;
}

export async function analyzePitch(
  file: File,
  durationSeconds: number
): Promise<{ analysis: PitchAnalysis }> {
  const form = new FormData();
  form.append('video', file);
  form.append('durationSeconds', String(Math.round(durationSeconds)));

  const res = await fetch('/api/analyze-pitch', { method: 'POST', body: form });
  if (!res.ok) await parseError(res);
  return (await res.json()) as { analysis: PitchAnalysis };
}

export async function verifyClaims(analysisId: string): Promise<{ verification: VerifiedClaim[] }> {
  const res = await fetch('/api/verify-claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysisId }),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as { verification: VerifiedClaim[] };
}
