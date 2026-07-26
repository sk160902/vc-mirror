/**
 * Tiny Gemini microservice the Python RSI loop calls via subprocess.
 * Reads one JSON request from stdin, writes one JSON response to stdout.
 *
 *   {"op":"features","title":"..."}        -> {features:{...}}
 *   {"op":"rewrite","title":"...","n":4}   -> {variants:["...", ...]}
 *
 * Keeps all Gemini access in one place; no key is stored here (read from
 * vc_mirror/.env). Same model/SDK as the extractor.
 */
import { readFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';

// Prefer the injected env var (Maritime secret); fall back to the local dev file.
function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  try {
    return (readFileSync('/Users/Shreyas2/vc_mirror/.env', 'utf8')
      .match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
  } catch { return undefined; }
}
const KEY = readKey();
const client = new GoogleGenAI({ apiKey: KEY });
const MODEL = 'gemini-3.5-flash';

const FEATURE_SCHEMA = {
  type: 'object',
  required: ['hook_type', 'primary_emotion', 'curiosity_gap', 'specificity',
    'has_number', 'clickbait_intensity', 'topic', 'promise'],
  properties: {
    hook_type: { type: 'string', enum: ['question', 'list', 'how_to', 'shock_reveal',
      'controversy', 'emotional_story', 'curiosity_gap', 'authority', 'relatable', 'other'] },
    primary_emotion: { type: 'string', enum: ['curiosity', 'amusement', 'awe', 'anger',
      'warmth', 'fear', 'surprise', 'desire', 'none'] },
    curiosity_gap: { type: 'number' },
    specificity: { type: 'number' },
    has_number: { type: 'boolean' },
    clickbait_intensity: { type: 'number' },
    topic: { type: 'string' },
    promise: { type: 'string', enum: ['entertainment', 'information', 'transformation',
      'social_proof', 'none'] },
  },
};

const VARIANTS_SCHEMA = {
  type: 'object',
  required: ['variants'],
  properties: { variants: { type: 'array', items: { type: 'string' } } },
};

function textOf(res) {
  return res.output_text || (res.steps || [])
    .filter((s) => s.type === 'model_output').flatMap((s) => s.content || [])
    .map((c) => c.text).filter(Boolean).join('');
}
function parse(res) {
  return JSON.parse(textOf(res).trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim());
}

async function features(title) {
  const res = await client.interactions.create({
    model: MODEL,
    input: [{ type: 'text', text: `Title: "${title}"` }],
    system_instruction: 'Extract short-video engagement features from the title. Return only the object.',
    response_format: [{ type: 'text', mime_type: 'application/json', schema: FEATURE_SCHEMA }],
  });
  return { features: parse(res) };
}

async function rewrite(title, n) {
  const res = await client.interactions.create({
    model: MODEL,
    input: [{ type: 'text', text:
      `Rewrite this short-video title into ${n} distinct higher-engagement variants. ` +
      `Keep the same underlying topic and stay truthful — do not invent facts. ` +
      `Vary the hook style (question, curiosity gap, specificity, emotion). ` +
      `Original: "${title}"` }],
    system_instruction: 'You are a short-form video title editor. Return only the variants array.',
    response_format: [{ type: 'text', mime_type: 'application/json', schema: VARIANTS_SCHEMA }],
  });
  return { variants: parse(res).variants.slice(0, n) };
}

async function main() {
  const req = JSON.parse(readFileSync(0, 'utf8'));
  let out;
  if (req.op === 'features') out = await features(req.title);
  else if (req.op === 'rewrite') out = await rewrite(req.title, req.n || 4);
  else throw new Error('unknown op');
  process.stdout.write(JSON.stringify(out));
}
main().catch((e) => { process.stderr.write(String(e?.message || e)); process.exit(1); });
