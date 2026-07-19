import { AppError } from '../middleware/errorHandler.js';
import { createInteraction, isMockMode } from './client.js';
import { PITCH_JSON_SCHEMA, PITCH_SYSTEM_INSTRUCTION, buildPitchPrompt } from './prompts.js';
import { mockPitchAnalysis } from './mock.js';
import { logger } from '../utils/logger.js';

interface Args {
  base64Video: string;
  mimeType: string;
  durationSeconds: number;
}

/** Strips markdown fences some models still wrap around JSON. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

function parseJson(text: string): unknown {
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

export async function runPitchAnalysis({
  base64Video,
  mimeType,
  durationSeconds,
}: Args): Promise<unknown> {
  if (isMockMode()) {
    logger.info('Using mock pitch analysis');
    return mockPitchAnalysis();
  }

  const { text } = await createInteraction({
    systemInstruction: PITCH_SYSTEM_INSTRUCTION,
    jsonSchema: PITCH_JSON_SCHEMA,
    input: [
      { type: 'video', mime_type: mimeType, data: base64Video },
      { type: 'text', text: buildPitchPrompt(durationSeconds) },
    ],
  });

  if (!text) {
    throw new AppError(502, 'The analysis came back empty. Retry the same video.', true);
  }

  return parseJson(text);
}
