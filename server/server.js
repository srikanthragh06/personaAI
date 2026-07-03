import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = await readFile(
    join(cwd(), "research", "pg", "system-prompt-3.md"),
    "utf-8",
);

const TOKEN_LIMIT = 15_000;

/** @type {Map<string, { messages: Array<{role: string, content: string}>, tokenCount: number }>} */
const conversations = new Map();

const app = express();
app.use(cors());
app.use(express.json());

// Create a new conversation
app.post("/api/conversations", (_req, res) => {
    const id = randomUUID();
    conversations.set(id, {
        messages: [{ role: "system", content: SYSTEM_PROMPT }],
        tokenCount: 0,
    });
    res.json({ id });
});

// Send a message in a conversation
app.post("/api/conversations/:id/chat", async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;

    const conv = conversations.get(id);
    if (!conv) {
        return res.status(404).json({ error: "Conversation not found" });
    }

    if (conv.tokenCount >= TOKEN_LIMIT) {
        return res.status(400).json({
            error: `Token limit reached (${conv.tokenCount}/${TOKEN_LIMIT})`,
        });
    }

    if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "message is required" });
    }

    conv.messages.push({ role: "user", content: message });

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: conv.messages,
        });

        const reply = response.choices[0].message.content;
        const { total_tokens } = response.usage;

        conv.messages.push({ role: "assistant", content: reply });
        conv.tokenCount += total_tokens;

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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
