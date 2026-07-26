import { AppError } from '../middleware/errorHandler.js';
import { pitchAnalysisModelSchema, viralityAnalysisModelSchema } from '../../shared/schemas.js';
import {
  MAX_CLAIMS_TO_VERIFY,
  MAX_RUBRIC_SCORE,
  MAX_TIMELINE_EVENTS,
  MAX_VIRAL_MOMENTS,
  RUBRIC_DIMENSIONS,
  TARGET_INVESTOR_QUESTIONS,
  VIRALITY_DIMENSIONS,
} from '../../shared/constants.js';
import type {
  PitchAnalysis,
  RubricEntry,
  TimelineEvent,
  ViralMoment,
  ViralityAnalysis,
  ViralityRubricEntry,
} from '../../shared/types.js';

interface Meta {
  analysisId: string;
  durationSeconds: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

/** Near-identical moments at the same second add noise without adding signal. */
function dedupe(events: TimelineEvent[]): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const event of events) {
    const duplicate = out.some(
      (kept) =>
        Math.abs(kept.timestampSeconds - event.timestampSeconds) < 2 &&
        (kept.type === event.type ||
          kept.quote.trim().toLowerCase() === event.quote.trim().toLowerCase())
    );
    if (!duplicate) out.push(event);
  }
  return out;
}

/** Keeps the most severe moments when the model returns more than we display. */
function prioritize(events: TimelineEvent[]): TimelineEvent[] {
  if (events.length <= MAX_TIMELINE_EVENTS) return events;
  const weight = { high: 0, medium: 1, low: 2 } as const;
  return [...events]
    .sort((a, b) => weight[a.severity] - weight[b.severity])
    .slice(0, MAX_TIMELINE_EVENTS)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

function normalizeRubric(rubric: RubricEntry[], duration: number): RubricEntry[] {
  const byDimension = new Map(rubric.map((entry) => [entry.dimension, entry]));

  // Always emit all six dimensions so the readiness heuristic has a stable base.
  return RUBRIC_DIMENSIONS.map((dimension) => {
    const entry = byDimension.get(dimension);
    if (!entry) {
      return {
        dimension,
        score: 0,
        summary: 'Not assessed from this pitch.',
        evidenceTimestamps: [],
      };
    }
    return {
      ...entry,
      score: clamp(Math.round(entry.score), 0, MAX_RUBRIC_SCORE),
      evidenceTimestamps: entry.evidenceTimestamps
        .filter((ts) => Number.isFinite(ts) && ts >= 0 && ts <= duration)
        .map((ts) => Math.round(ts)),
    };
  });
}

/**
 * Validates and repairs model output before it can reach the UI. Prefers safe
 * defaults over throwing, except when the payload is unusable outright.
 */
export function normalizeAnalysis(raw: unknown, meta: Meta): PitchAnalysis {
  const parsed = pitchAnalysisModelSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(502, 'We could not complete the analysis. Retry the same video.', true);
  }
  const data = parsed.data;
  const duration = meta.durationSeconds;

  const timeline = prioritize(
    dedupe(
      data.timeline
        .filter((e) => Number.isFinite(e.timestampSeconds))
        .map((e) => ({
          ...e,
          timestampSeconds: clamp(Math.round(e.timestampSeconds), 0, duration),
          endTimestampSeconds:
            e.endTimestampSeconds === null || !Number.isFinite(e.endTimestampSeconds)
              ? null
              : clamp(Math.round(e.endTimestampSeconds), 0, duration),
          strongerWording: e.strongerWording?.trim() ? e.strongerWording : null,
        }))
        .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
    )
  );

  if (timeline.length === 0) {
    throw new AppError(
      502,
      'No distinct moments could be identified in that video. Try a clearer pitch recording.',
      true
    );
  }

  const validIds = new Set(timeline.map((e) => e.id));

  const investorQuestions = data.investorQuestions
    .slice(0, TARGET_INVESTOR_QUESTIONS)
    .map((q) => ({
      ...q,
      triggerTimestampSeconds:
        q.triggerTimestampSeconds !== null &&
        Number.isFinite(q.triggerTimestampSeconds) &&
        q.triggerTimestampSeconds >= 0 &&
        q.triggerTimestampSeconds <= duration
          ? Math.round(q.triggerTimestampSeconds)
          : null,
    }));

  const claimsToVerify = data.claimsToVerify.slice(0, MAX_CLAIMS_TO_VERIFY).map((c) => ({
    ...c,
    timestampSeconds: clamp(Math.round(c.timestampSeconds), 0, duration),
    importance: clamp(Math.round(c.importance), 1, 5),
  }));

  // Repair dangling id references rather than rendering an empty highlight card.
  const negative = timeline.filter(
    (e) => e.type !== 'conviction_builder' && e.type !== 'strong_moment'
  );
  const positive = timeline.filter(
    (e) => e.type === 'conviction_builder' || e.type === 'strong_moment'
  );

  const strongestMomentId = validIds.has(data.overallSummary.strongestMomentId)
    ? data.overallSummary.strongestMomentId
    : (positive[0]?.id ?? timeline[0].id);

  const biggestConcernMomentId = validIds.has(data.overallSummary.biggestConcernMomentId)
    ? data.overallSummary.biggestConcernMomentId
    : (negative.find((e) => e.severity === 'high')?.id ?? negative[0]?.id ?? timeline[0].id);

  return {
    analysisId: meta.analysisId,
    durationSeconds: duration,
    company: data.company,
    rubric: normalizeRubric(data.rubric, duration),
    timeline,
    investorQuestions,
    claimsToVerify,
    overallSummary: {
      strongestMomentId,
      biggestConcernMomentId,
      oneSentenceAssessment: data.overallSummary.oneSentenceAssessment,
    },
  };
}

/** Near-identical moments at the same second add noise without adding signal. */
function dedupeViralMoments(moments: ViralMoment[]): ViralMoment[] {
  const out: ViralMoment[] = [];
  for (const moment of moments) {
    const duplicate = out.some(
      (kept) =>
        Math.abs(kept.timestampSeconds - moment.timestampSeconds) < 2 &&
        (kept.type === moment.type ||
          kept.quote.trim().toLowerCase() === moment.quote.trim().toLowerCase())
    );
    if (!duplicate) out.push(moment);
  }
  return out;
}

/** Keeps the most severe moments when the model returns more than we display. */
function prioritizeViralMoments(moments: ViralMoment[]): ViralMoment[] {
  if (moments.length <= MAX_VIRAL_MOMENTS) return moments;
  const weight = { high: 0, medium: 1, low: 2 } as const;
  return [...moments]
    .sort((a, b) => weight[a.severity] - weight[b.severity])
    .slice(0, MAX_VIRAL_MOMENTS)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

function normalizeViralityRubric(
  rubric: ViralityRubricEntry[],
  duration: number
): ViralityRubricEntry[] {
  const byDimension = new Map(rubric.map((entry) => [entry.dimension, entry]));

  // Always emit all six dimensions so the score heuristic has a stable base.
  return VIRALITY_DIMENSIONS.map((dimension) => {
    const entry = byDimension.get(dimension);
    if (!entry) {
      return {
        dimension,
        score: 0,
        summary: 'Not assessed from this video.',
        evidenceTimestamps: [],
      };
    }
    return {
      ...entry,
      score: clamp(Math.round(entry.score), 0, MAX_RUBRIC_SCORE),
      evidenceTimestamps: entry.evidenceTimestamps
        .filter((ts) => Number.isFinite(ts) && ts >= 0 && ts <= duration)
        .map((ts) => Math.round(ts)),
    };
  });
}

interface ViralityMeta {
  analysisId: string;
  durationSeconds: number;
}

/**
 * Validates and repairs model output before it can reach the UI. Prefers safe
 * defaults over throwing, except when the payload is unusable outright.
 */
export function normalizeViralityAnalysis(raw: unknown, meta: ViralityMeta): ViralityAnalysis {
  const parsed = viralityAnalysisModelSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(502, 'We could not complete the analysis. Retry the same video.', true);
  }
  const data = parsed.data;
  const duration = meta.durationSeconds;

  const moments = prioritizeViralMoments(
    dedupeViralMoments(
      data.moments
        .filter((m) => Number.isFinite(m.timestampSeconds))
        .map((m) => ({
          ...m,
          timestampSeconds: clamp(Math.round(m.timestampSeconds), 0, duration),
          endTimestampSeconds:
            m.endTimestampSeconds === null || !Number.isFinite(m.endTimestampSeconds)
              ? null
              : clamp(Math.round(m.endTimestampSeconds), 0, duration),
          suggestedFix: m.suggestedFix?.trim() ? m.suggestedFix : null,
        }))
        .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
    )
  );

  if (moments.length === 0) {
    throw new AppError(
      502,
      'No distinct moments could be identified in that video. Try a clearer clip.',
      true
    );
  }

  const validIds = new Set(moments.map((m) => m.id));
  const rubric = normalizeViralityRubric(data.rubric, duration);

  const positive = moments.filter((m) => m.type === 'hook' || m.type === 'energy_peak' || m.type === 'standout_line');
  const risky = moments.filter((m) => m.type === 'flat_moment' || m.type === 'pacing_issue');

  const strongestMomentId = validIds.has(data.overallSummary.strongestMomentId)
    ? data.overallSummary.strongestMomentId
    : (positive[0]?.id ?? moments[0].id);

  const biggestRiskMomentId = validIds.has(data.overallSummary.biggestRiskMomentId)
    ? data.overallSummary.biggestRiskMomentId
    : (risky.find((m) => m.severity === 'high')?.id ?? risky[0]?.id ?? moments[0].id);

  return {
    analysisId: meta.analysisId,
    durationSeconds: duration,
    rubric,
    moments,
    overallSummary: {
      strongestMomentId,
      biggestRiskMomentId,
      oneSentenceAssessment: data.overallSummary.oneSentenceAssessment,
    },
  };
}
