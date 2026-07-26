/**
 * Gemini content-feature extraction for the viral-RSI engine.
 *
 * Reads the labeled MicroLens dataset (data/features/dataset.csv), asks Gemini
 * to extract structured engagement-relevant features from each video's title,
 * and writes them to data/features/extracted.jsonl.
 *
 * These features are exactly what the Autolab predictor will train on and what
 * the Maritime content-optimizer agent will later evolve. Extracting from the
 * title is the v1 signal (titles are the dominant CTR lever on short video);
 * cover-frame / audio features can be appended later if raw video is sourced.
 *
 * Reuses the Gemini key + SDK already installed for VC Mirror. No key lives here.
 *   NODE_PATH=/Users/Shreyas2/vc_mirror/node_modules \
 *   node scripts/extract.mjs --limit 40
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';

// Prefer the injected env var (Maritime secret); fall back to the local dev file.
const KEY = process.env.GEMINI_API_KEY?.trim()
  || (() => { try { return (readFileSync('/Users/Shreyas2/vc_mirror/.env', 'utf8')
      .match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim(); } catch { return undefined; } })();
if (!KEY) throw new Error('GEMINI_API_KEY not set (env var or vc_mirror/.env)');

const MODEL = 'gemini-3.5-flash';
const client = new GoogleGenAI({ apiKey: KEY });

// Accept --limit=N or "--limit N"
const args = process.argv.slice(2);
const li = args.findIndex((a) => a === '--limit' || a.startsWith('--limit='));
const argLimit = li === -1 ? NaN
  : Number(args[li].includes('=') ? args[li].split('=')[1] : args[li + 1]);
const LIMIT = Number.isFinite(argLimit) && argLimit > 0 ? argLimit : 40;
const CONCURRENCY = 5;

const OUT = 'data/features/extracted.jsonl';

// Content-feature contract. Every field is a lever an optimizer could later tweak.
const FEATURE_SCHEMA = {
  type: 'object',
  required: [
    'hook_type', 'primary_emotion', 'curiosity_gap', 'specificity',
    'has_number', 'clickbait_intensity', 'topic', 'promise',
  ],
  properties: {
    hook_type: {
      type: 'string',
      enum: ['question', 'list', 'how_to', 'shock_reveal', 'controversy',
        'emotional_story', 'curiosity_gap', 'authority', 'relatable', 'other'],
    },
    primary_emotion: {
      type: 'string',
      enum: ['curiosity', 'amusement', 'awe', 'anger', 'warmth', 'fear',
        'surprise', 'desire', 'none'],
    },
    curiosity_gap: { type: 'number', description: '0..1: withholds info to force the click' },
    specificity: { type: 'number', description: '0..1: concrete numbers/names vs vague' },
    has_number: { type: 'boolean' },
    clickbait_intensity: { type: 'number', description: '0..1' },
    topic: { type: 'string', description: 'short category, e.g. food, gaming, music' },
    promise: {
      type: 'string',
      enum: ['entertainment', 'information', 'transformation', 'social_proof', 'none'],
    },
  },
};

const SYSTEM = `You analyze short-video titles for the content features that drive engagement.
Judge only the title text. Be consistent and calibrated across titles.
Return numbers in [0,1]. Do not explain; return only the structured object.`;

function loadRows() {
  const lines = readFileSync('data/features/dataset.csv', 'utf8').trim().split(/\r?\n/);
  lines.shift(); // header
  return lines.map((line) => {
    // title may contain commas; split on the known column boundaries from the end
    const [id, ...rest] = line.split(',');
    const tail = rest.join(',');
    const m = tail.match(/^(.*),(\d+),(\d+),([\d.]+),([\d.]+)$/);
    if (!m) return null;
    return { id, title: m[1], likes: +m[2], views: +m[3], engagement_rate: +m[4], log_likes: +m[5] };
  }).filter(Boolean);
}

function parseJson(interaction) {
  const text = interaction.output_text
    || (interaction.steps || [])
      .filter((s) => s.type === 'model_output')
      .flatMap((s) => s.content || [])
      .map((c) => c.text).filter(Boolean).join('');
  const cleaned = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function extractOne(row) {
  const res = await client.interactions.create({
    model: MODEL,
    input: [{ type: 'text', text: `Title: "${row.title}"` }],
    system_instruction: SYSTEM,
    response_format: [{ type: 'text', mime_type: 'application/json', schema: FEATURE_SCHEMA }],
  });
  const features = parseJson(res);
  return { id: row.id, title: row.title, likes: row.likes, views: row.views,
    engagement_rate: row.engagement_rate, log_likes: row.log_likes, features };
}

async function main() {
  const rows = loadRows().slice(0, LIMIT);
  const done = existsSync(OUT)
    ? new Set(readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).id))
    : new Set();
  const todo = rows.filter((r) => !done.has(r.id));
  console.log(`extracting ${todo.length} / ${rows.length} (skipping ${done.size} already done)`);

  let ok = 0, fail = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(extractOne));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        appendFileSync(OUT, JSON.stringify(r.value) + '\n');
        ok++;
      } else {
        fail++;
        console.error('  fail:', r.reason?.message?.slice(0, 80));
      }
    }
    process.stdout.write(`  ${ok} ok, ${fail} fail\r`);
  }
  console.log(`\ndone: ${ok} extracted, ${fail} failed -> ${OUT}`);
}

main();
