# Marginalia — AI Research & Knowledge Workspace

Upload documents, chat with them, and generate notes, flashcards, quizzes,
comparisons, citations, and drafts — powered by Claude.

This project has two parts:

```
marginalia/
├── public/
│   └── index.html      ← the whole frontend (single-file app)
└── server/
    ├── server.js        ← Express backend that proxies calls to Claude
    ├── package.json
    ├── .env.example     ← copy to .env and add your API key
    └── README.md
```

## Why a backend at all?

The frontend needs to call Claude, but an API key can't be safely put in
browser-side code — anyone could open dev tools and steal it. The `server/`
folder is a small proxy: it holds your real Anthropic API key server-side,
and the frontend just talks to *it* instead of Anthropic directly.

## Quick start

```bash
cd server
npm install
cp .env.example .env
# edit .env and paste in your Anthropic API key (https://console.anthropic.com/settings/keys)
npm start
```

Then open **http://localhost:3001** — the server serves the frontend too, so
that's the only URL you need.

## Features

- **Document upload** — plain text and PDF (parsed client-side with pdf.js)
- **Chat** — ask questions grounded in your selected documents, with inline citations
- **Smart notes** — outline, Cornell, or bullet-style study notes
- **Flashcards** — spaced-repetition style, exportable to CSV
- **Quiz generator** — multiple choice, with grading
- **Explain / Compare / Citations / Writing assistant** tools

## Deploying somewhere other than your laptop

The `server/` app is a normal Node/Express app, so it runs on most hosts
(Render, Railway, Fly.io, a VPS, etc.) as-is:
1. Set the `ANTHROPIC_API_KEY` environment variable in your host's dashboard.
2. Deploy the `server/` folder (make sure `public/` is included/committed
   alongside it, since `server.js` serves it as static files).
3. `npm start` as the start command.

If your frontend ever needs to be served from a *different* origin than the
backend, set `BACKEND_URL` near the top of the `callClaude` function in
`public/index.html` to your backend's full URL.
