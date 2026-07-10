# Marginalia — Server

A minimal Express server that:
1. Serves the frontend (`../public/index.html`)
2. Exposes `POST /api/chat`, which forwards requests to the real LLM provider
   (Gemini by default, with Anthropic as a fallback) using a key that stays on
   the server and is never sent to the browser.

## Setup

```bash
cd server
npm install
cp .env.example .env
# then edit .env and paste in your real Gemini API key
npm start
```

Then open **http://localhost:3001** in your browser. The whole app (frontend + API proxy) runs from this one server.

## Getting an API key

1. Go to https://aistudio.google.com/app/apikey
2. Create a Gemini API key
3. Paste it into `server/.env` as `GEMINI_API_KEY=...`

If you prefer Anthropic instead, you can still set `ANTHROPIC_API_KEY=...`.

## Endpoints

- `POST /api/chat` — body: `{ model, max_tokens, messages, system? }`, forwarded to Gemini (or Anthropic if no Gemini key is configured). The response is normalized so the frontend can use it directly.
- `GET /api/health` — returns `{ ok: true, hasGeminiKey, hasAnthropicKey }`, useful for checking the server is up and configured.

## Notes

- Requires Node.js 18+ (uses the built-in `fetch`).
- CORS is enabled so you can also run the frontend on a different port during development — just set `BACKEND_URL` at the top of `public/index.html`'s `callClaude` function to point at this server.
- Never commit your real `.env` file — it's already excluded via `.gitignore`.
