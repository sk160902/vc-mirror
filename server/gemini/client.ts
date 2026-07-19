import { GoogleGenAI } from '@google/genai';
import { AppError } from '../middleware/errorHandler.js';

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';

export function isMockMode(): boolean {
  return process.env.USE_MOCK_GEMINI === 'true';
}

/** Called at startup so a missing key fails loudly rather than at first request. */
export function assertGeminiConfig(): void {
  if (isMockMode()) return;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env (see .env.example), or set USE_MOCK_GEMINI=true to run without live model calls.'
    );
  }
}

let cached: GoogleGenAI | null = null;

export function getClient(): GoogleGenAI {
  if (!cached) {
    cached = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
  }
  return cached;
}

/**
 * The Interactions surface in @google/genai 1.52 is experimental and its params
 * are typed `unknown`, so the SDK gives us no compile-time help here. All casts
 * to and from that surface are confined to this file, and every response is
 * validated with Zod downstream before it is trusted.
 */
interface InteractionInputPart {
  type: 'text' | 'video';
  text?: string;
  mime_type?: string;
  data?: string;
}

export interface InteractionRequest {
  input: InteractionInputPart[];
  jsonSchema: Record<string, unknown>;
  useGoogleSearch?: boolean;
  systemInstruction?: string;
}

export interface Annotation {
  title?: string;
  uri?: string;
  type?: string;
}

export interface InteractionResult {
  text: string;
  annotations: Annotation[];
}

interface RawStep {
  type?: string;
  content?: Array<{ text?: string; annotations?: Annotation[] }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Pulls the model's JSON text and its citation annotations out of the
 * Interactions step timeline, defensively: an unexpected shape yields empty
 * results rather than a crash.
 */
function extractResult(raw: unknown): InteractionResult {
  const text: string[] = [];
  const annotations: Annotation[] = [];

  if (!isRecord(raw)) return { text: '', annotations: [] };

  const steps = Array.isArray(raw.steps) ? (raw.steps as RawStep[]) : [];
  for (const step of steps) {
    if (step?.type !== 'model_output' || !Array.isArray(step.content)) continue;
    for (const part of step.content) {
      if (typeof part?.text === 'string') text.push(part.text);
      if (Array.isArray(part?.annotations)) annotations.push(...part.annotations);
    }
  }

  // Some responses also surface a flattened convenience field.
  if (text.length === 0 && typeof raw.output_text === 'string') {
    text.push(raw.output_text);
  }

  return { text: text.join('').trim(), annotations };
}

export async function createInteraction(req: InteractionRequest): Promise<InteractionResult> {
  const client = getClient();

  const params: Record<string, unknown> = {
    model: GEMINI_MODEL,
    input: req.input,
    response_format: [
      {
        type: 'text',
        mime_type: 'application/json',
        schema: req.jsonSchema,
      },
    ],
  };

  if (req.systemInstruction) params.system_instruction = req.systemInstruction;
  if (req.useGoogleSearch) params.tools = [{ type: 'google_search' }];

  try {
    const interactions = client.interactions as unknown as {
      create: (p: Record<string, unknown>) => Promise<unknown>;
    };
    const raw = await interactions.create(params);
    return extractResult(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/quota|rate|429|RESOURCE_EXHAUSTED/i.test(message)) {
      throw new AppError(429, 'The model is rate limited right now. Try again in a moment.', true);
    }
    if (/api key|401|403|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
      throw new AppError(502, 'The analysis service is not configured correctly.', false);
    }
    throw new AppError(502, 'The analysis service did not respond. Please try again.', true);
  }
}
