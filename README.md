# Marginalia

A simple AI research workspace where you can upload documents and chat with them.

## What it does

- Upload documents and ask questions about them
- Generate notes, flashcards, quizzes, comparisons, and writing help
- Run through a local Node.js backend that uses Gemini by default

## Project structure

```text
marginalia/
├── public/
│   ├── index.html
│   ├── package.json
│   └── package-lock.json
└── server/
    ├── server.js
    ├── package.json
    ├── .env.example
    └── README.md
```

## Run locally

```bash
cd server
npm install
cp .env.example .env
# add your Gemini API key to .env
npm start
```

Then open http://localhost:3001

## Environment

Add your API key to server/.env:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```
