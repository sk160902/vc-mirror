import { GoogleGenAI } from '@google/genai';
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
try {
  const r = await client.interactions.create({
    model: 'gemini-3.5-flash',
    input: [{ type: 'text', text: 'What is the annual value of US restaurant food waste? One sentence.' }],
    tools: [{ type: 'google_search' }],
  });
  let ann = [];
  for (const s of r.steps||[]) if (s.type==='model_output') for (const c of s.content||[]) ann.push(...(c.annotations||[]));
  console.log('GROUNDING SUCCESS, annotations:', ann.length);
  ann.slice(0,4).forEach(a=>console.log('  -', a.title));
} catch (e) { console.log('FAILED:', (e.message||'').slice(0,300)); }
