import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err);
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PERSONAS = ["piyush", "hitesh"];

const PROMPTS = {
    piyush: await readFile(join(cwd(), "prompts", "piyush.md"), "utf-8"),
    hitesh: await readFile(join(cwd(), "prompts", "hitesh.md"), "utf-8"),
};

const DAILY_TOKEN_CAP = 1_000_000;
const MESSAGE_LENGTH_LIMIT = 20_000;

let dailyTokens = 0;
let dailyResetDate = new Date().toISOString().slice(0, 10);

function checkDailyReset() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== dailyResetDate) {
        dailyResetDate = today;
        dailyTokens = 0;
    }
}

const CONTEXT_WINDOW = 20;

// Full history is kept in conv.messages; only the system prompt plus the
// most recent CONTEXT_WINDOW messages get sent to OpenAI, so per-turn cost
// stays bounded no matter how long the conversation runs.
function getWindowedMessages(conv) {
    const [systemMessage, ...rest] = conv.messages;
    return [systemMessage, ...rest.slice(-CONTEXT_WINDOW)];
}

/** @type {Map<string, { persona: string, messages: Array<{role: string, content: string}>, tokenCount: number }>} */
const conversations = new Map();

const app = express();
app.use(cors());
app.use(express.json());

// Create a new conversation
app.post("/api/conversations", (req, res, next) => {
    try {
        const { persona } = req.body ?? {};
        if (!PERSONAS.includes(persona)) {
            return res.status(400).json({
                error: `persona must be one of: ${PERSONAS.join(", ")}`,
            });
        }

        const id = randomUUID();
        conversations.set(id, {
            persona,
            messages: [{ role: "system", content: PROMPTS[persona] }],
            tokenCount: 0,
        });
        res.json({ id, persona });
    } catch (err) {
        next(err);
    }
});

// Send a message in a conversation
app.post("/api/conversations/:id/chat", async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const conv = conversations.get(id);
        if (!conv) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "message is required" });
        }

        if (message.length > MESSAGE_LENGTH_LIMIT) {
            return res.status(400).json({
                error: `message too long (max ${MESSAGE_LENGTH_LIMIT} characters)`,
            });
        }

        checkDailyReset();
        if (dailyTokens >= DAILY_TOKEN_CAP) {
            return res.status(429).json({
                error: "Daily usage cap reached, try again tomorrow",
            });
        }

        conv.messages.push({ role: "user", content: message });

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4.1",
                messages: getWindowedMessages(conv),
            });

            const reply = response.choices[0].message.content;
            const { total_tokens } = response.usage;

            conv.messages.push({ role: "assistant", content: reply });
            conv.tokenCount += total_tokens;
            dailyTokens += total_tokens;

            res.json({
                reply,
                tokens: { turn: total_tokens, session: conv.tokenCount },
            });
        } catch (err) {
            // Remove the user message we just pushed — it wasn't answered
            conv.messages.pop();
            console.error("OpenAI error:", err.message);
            res.status(500).json({ error: "Something went wrong" });
        }
    } catch (err) {
        next(err);
    }
});

// Catch-all error handler — anything that reaches here (thrown errors,
// malformed JSON bodies from express.json(), etc.) gets a clean JSON
// response instead of taking the process down or leaking a stack trace.
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
