import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: './.env' });

async function test() {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.0';
  if (!key) {
    console.error('GEMINI_API_KEY not set in backend/.env');
    process.exit(1);
  }

  try {
    const client = new GoogleGenAI({ apiKey: key });
    const res = await client.models.generateContent({
      model,
      contents: `Tu es un assistant test. Réponds: ok.`,
      temperature: 0.2,
      maxOutputTokens: 60,
    });

    console.log('OK ->', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('SDK Error:', err?.message || err);
    if (err?.response) console.error('Response:', err.response.data || err.response);
    process.exit(1);
  }
}

test();
