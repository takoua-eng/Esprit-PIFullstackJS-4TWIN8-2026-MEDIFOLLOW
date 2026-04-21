import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: './.env' });

async function list() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
  const client = new GoogleGenAI({ apiKey: key });

  // Try a few method names to discover list API
  const tries = [
    async () => client.listModels(),
    async () => client.models.list(),
    async () => client.models.listModels(),
    async () => client.models.listModelSpecs(),
  ];

  for (const t of tries) {
    try {
      const res = await t();
      console.log('SUCCESS', res);
      return;
    } catch (e) {
      console.error('TRY FAILED:', e?.message || e);
    }
  }

  console.error('All tries failed');
}

list();
