# Persona AI

Chat with AI versions of Piyush Garg and Hitesh Choudhary — built from their actual YouTube transcripts, not generic prompts.

## Live Demo

https://persona-ai-black-nine.vercel.app/

## Features

- **Persona switching** — pick Piyush or Hitesh from the header. Each conversation belongs to one persona for its whole lifetime; switching just moves you to that persona's own separate conversation.
- **Context management** — full chat history is kept, but only the system prompt + last 20 messages get sent to the model each turn, so cost stays flat no matter how long the conversation runs.
- **Abuse protection** — daily token cap (backstop against runaway cost), per-message 20,000 character limit.
- **Crash-safe backend** — every route is wrapped, uncaught errors return a clean JSON 500 instead of taking the server down.

## Tech Stack

- **Backend:** Node.js, Express, OpenAI API (`gpt-4.1`), in-memory conversation store
- **Frontend:** React, Vite

## Architecture

```
React frontend ──► Express API ──► OpenAI
                       │
                somewhere in
                memory: Map<conversationId, {
                  persona, messages, tokenCount
                }>
```

On page load, the frontend creates one conversation per persona (`POST /api/conversations`). Switching personas is just a local UI change — no new request — since both conversations already exist. Sending a message hits `POST /api/conversations/:id/chat`, which appends to that conversation's history, sends a trimmed window to OpenAI, and appends the reply.

## Setup & Running Locally

### Backend

```bash
cd server
npm install
echo "OPENAI_API_KEY=sk-..." > .env
npm start
```

Runs on `http://localhost:3000`.

### Frontend

```bash
cd web
npm install
echo "VITE_API_URL=http://localhost:3000/api" > .env
npm run dev
```

## Persona Data Collection & Prep

For each persona, transcripts from 5 representative YouTube videos were fetched and Hindi/Devanagari portions transliterated to Romanized Hinglish (via the OpenAI API). From those transcripts I hand-wrote "talking style" profiles — recurring catchphrases, sentence rhythm, code-switching patterns, tone — grounded in real quoted lines rather than a generic description of "how they talk."

## Prompt Engineering Strategy

System prompts went through several iterations, moving from a plain instructions-only description of each persona toward one built around real transcript examples: specific catchphrases, sentence openers, and sample exchanges pulled directly from their videos. From the transcripts, I manually picked out many excerpts that felt like a strong match for each persona's talking style and included them directly in the prompt as examples. Later revisions tuned response length and cut down on repetitive filler ("Alright" overuse, etc.) that showed up once the bot was actually tested in conversation.

## Context Management Approach

- One conversation = one persona, forever. No mid-conversation persona swaps.
- Full message history is retained server-side, but only the system prompt + most recent 20 messages are sent to OpenAI per turn — bounds per-turn cost on long conversations instead of resending an ever-growing history.
- A global daily token cap (1,000,000) acts as a cost backstop across all users.

## Sample Conversations

<img width="958" height="951" alt="Screenshot from 2026-07-05 23-47-20" src="https://github.com/user-attachments/assets/11d747ef-cf32-4f25-b68a-b7827b96add2" />
<img width="958" height="951" alt="Screenshot from 2026-07-05 23-47-27" src="https://github.com/user-attachments/assets/dbe06a3d-a6c0-4860-8e94-77c60ca88d86" />

<img width="958" height="951" alt="Screenshot from 2026-07-05 23-56-06" src="https://github.com/user-attachments/assets/ca0f032a-8745-4f74-8277-e28087381c09" />
<img width="958" height="951" alt="Screenshot from 2026-07-05 23-56-10" src="https://github.com/user-attachments/assets/f8647487-aa7f-4ecf-928b-fca0a7aa7452" />
