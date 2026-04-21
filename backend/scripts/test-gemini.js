require('dotenv').config({ path: './.env' });
const axios = require('axios');

async function test() {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.GEMINI_API;
  const model = process.env.GEMINI_MODEL || 'text-bison-001';
  if (!key) {
    console.error('GEMINI_API_KEY not set in backend/.env');
    process.exit(1);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generate?key=${key}`;
  const body = {
    prompt: { text: 'Réponds simplement: ok' },
    temperature: 0.2,
    maxOutputTokens: 60,
  };

  try {
    const res = await axios.post(url, body, { timeout: 10000 });
    console.log('OK ->', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message || err);
    }
    process.exit(1);
  }
}

test();
