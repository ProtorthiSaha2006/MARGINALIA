// Marginalia backend — proxies chat/generation requests to an LLM provider.
//
// Why this exists: the frontend can't call Google or Anthropic APIs directly
// from the browser without exposing an API key to anyone who opens dev tools.
// This tiny server sits in between: it holds the real API key (from an
// environment variable, never sent to the browser) and forwards requests.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash'];
const HAS_GEMINI_KEY = Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here');
const HAS_ANTHROPIC_KEY = Boolean(ANTHROPIC_API_KEY);

if (!HAS_GEMINI_KEY && !HAS_ANTHROPIC_KEY) {
  console.warn(
    '\n⚠️  WARNING: No LLM API key is set.\n' +
    '   Create a server/.env file (copy .env.example) and add GEMINI_API_KEY\n' +
    '   or ANTHROPIC_API_KEY, or the /api/chat endpoint will reject every request.\n'
  );
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve the frontend (public/) as static files, so the whole app runs
// from a single server + single port.
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'public')));

function extractTextContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          if (typeof part.text === 'string') return part.text;
          if (typeof part.content === 'string') return part.content;
        }
        return '';
      })
      .join('\n');
  }
  if (content && typeof content === 'object') {
    if (typeof content.text === 'string') return content.text;
    if (typeof content.content === 'string') return content.content;
  }
  return '';
}

function normalizeGeminiModel(model) {
  if (!model) return DEFAULT_GEMINI_MODEL;
  const modelName = String(model).toLowerCase();
  if (modelName.startsWith('claude')) return DEFAULT_GEMINI_MODEL;
  return model;
}

function getGeminiModelCandidates(model) {
  const preferred = normalizeGeminiModel(model);
  const candidates = [preferred, DEFAULT_GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS];
  return [...new Set(candidates.filter(Boolean))];
}

function convertMessagesToGemini(messages) {
  const contents = [];

  for (const message of messages || []) {
    if (!message || typeof message !== 'object') continue;
    if (message.role === 'system') continue;

    const text = extractTextContent(message.content).trim();
    if (!text) continue;

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }]
    });
  }

  return contents;
}

app.post('/api/chat', async (req, res) => {
  const { model, max_tokens, messages, system } = req.body || {};

  if (!model || !max_tokens || !Array.isArray(messages)) {
    return res.status(400).json({
      type: 'error',
      error: { message: 'Request body must include model, max_tokens, and messages.' }
    });
  }

  if (!HAS_GEMINI_KEY && !HAS_ANTHROPIC_KEY) {
    return res.status(500).json({
      type: 'error',
      error: { message: 'Server is missing an LLM API key. See server/README.md.' }
    });
  }

  try {
    if (HAS_GEMINI_KEY) {
      let lastError = null;
      for (const geminiModel of getGeminiModelCandidates(model)) {
        try {
          const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
                contents: convertMessagesToGemini(messages),
                generationConfig: { maxOutputTokens: max_tokens }
              })
            }
          );

          const data = await upstream.json();

          if (!upstream.ok) {
            const message = data?.error?.message || 'Gemini request failed';
            const isQuotaError = upstream.status === 429 || /quota|rate limit|resource exhausted/i.test(message);
            lastError = { status: upstream.status, message };
            if (!isQuotaError) {
              console.error('Gemini API error:', upstream.status, data);
              return res.status(upstream.status).json({
                type: 'error',
                error: { message }
              });
            }
            console.warn(`Gemini quota issue with model ${geminiModel}:`, message);
            continue;
          }

          const text = (data?.candidates?.[0]?.content?.parts || [])
            .map(part => part.text || '')
            .join('\n')
            .trim();

          return res.json({
            content: [{ type: 'text', text }]
          });
        } catch (err) {
          lastError = { status: 502, message: err.message };
        }
      }

      return res.status(lastError?.status || 502).json({
        type: 'error',
        error: { message: lastError?.message || 'Gemini request failed after retrying available models.' }
      });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({ model, max_tokens, messages, ...(system ? { system } : {}) })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Anthropic API error:', upstream.status, data);
      return res.status(upstream.status).json(data);
    }

    return res.json(data);
  } catch (err) {
    console.error('Error calling LLM API:', err);
    return res.status(502).json({
      type: 'error',
      error: { message: 'Failed to reach the LLM API: ' + err.message }
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasGeminiKey: HAS_GEMINI_KEY, hasAnthropicKey: HAS_ANTHROPIC_KEY });
});

app.listen(PORT, () => {
  console.log(`\n✓ Marginalia server running at http://localhost:${PORT}\n`);
});
