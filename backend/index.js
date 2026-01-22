// Simple backend server for LLM calls (Gemini) and future APIs
const express = require('express');
const cors = require('cors');
// node-fetch v3 is ESM-only, so we use a dynamic import wrapper for CommonJS:
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.API_PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  });
});

// Root endpoint to prevent "Cannot GET /" confusion
app.get('/', (req, res) => {
  res.send('Nomor Backend is Running! 🚀. Check /api/health for status.');
});

// Proxy endpoint for LLM decisions / motivation / categorization
app.post('/api/llm', async (req, res) => {
  const { prompt, systemPrompt, max_tokens = 4000 } = req.body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  // Use gemini-1.5-flash or gemini-2.0-flash-lite for free tier (gemini-2.0-flash requires paid tier)
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the backend' });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    // Build a single text input for Gemini. We can fold systemPrompt into the text.
    let fullPrompt = prompt;
    if (systemPrompt) {
      fullPrompt = `${systemPrompt}\n\n${prompt}`;
    }

    // Gemini API endpoint format
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log('Calling Gemini API with model:', model);
    console.log('Prompt for Gemini API:', fullPrompt);
    console.log('Prompt length:', fullPrompt.length);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: max_tokens,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errData);
      console.error('Response status:', response.status);

      // Check for quota errors and provide helpful message
      let errorMessage = errData.error?.message || errData.error || 'LLM API error';
      if (response.status === 429 || errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
        errorMessage = `Gemini API quota exceeded. ${errorMessage} Try using gemini-1.5-flash (free tier) or check your API key limits at https://ai.google.dev/gemini-api/docs/quota`;
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: errData,
        status: response.status
      });
    }

    const rawResponseText = await response.text();
    console.log('Gemini raw API response:', rawResponseText);

    let data;
    try {
      data = JSON.parse(rawResponseText);
    } catch (e) {
      console.error("Failed to parse JSON", e);
      return res.status(500).json({ error: "Invalid JSON from Gemini", raw: rawResponseText });
    }

    // Gemini response shape: candidates[0].content.parts[0].text
    let text = '';
    if (data?.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate?.content?.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts[0].text?.trim() || '';
      }
    }

    if (!text) {
      console.error('No text found in Gemini response:', JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: 'No text in Gemini response',
        details: data
      });
    }

    return res.json({ text, raw: data });
  } catch (err) {
    console.error('Error calling LLM:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({
      error: 'Unexpected server error',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Only start the server if we are running standalone (not on Vercel)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

// Export the app for Vercel
module.exports = app;

