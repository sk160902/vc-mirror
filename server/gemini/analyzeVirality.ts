import { AppError } from '../middleware/errorHandler.js';
import { createInteraction, isMockMode } from './client.js';
import { VIRALITY_JSON_SCHEMA, VIRALITY_SYSTEM_INSTRUCTION, buildViralityPrompt } from './prompts.js';
import { mockViralityAnalysis } from './mock.js';
import { logger } from '../utils/logger.js';
import { parseJson } from './parseJson.js';

interface Args {
  base64Video: string;
  mimeType: string;
  durationSeconds: number;
}

export async function runViralityAnalysis({
  base64Video,
  mimeType,
  durationSeconds,
}: Args): Promise<unknown> {
  if (isMockMode()) {
    logger.info('Using mock virality analysis');
    return mockViralityAnalysis();
  }

  const { text } = await createInteraction({
    systemInstruction: VIRALITY_SYSTEM_INSTRUCTION,
    jsonSchema: VIRALITY_JSON_SCHEMA,
    input: [
      { type: 'video', mime_type: mimeType, data: base64Video },
      { type: 'text', text: buildViralityPrompt(durationSeconds) },
    ],
  });

  if (!text) {
    throw new AppError(502, 'The analysis came back empty. Retry the same video.', true);
  }

  return parseJson(text);
}
