import "dotenv/config";
import OpenAI from "openai";
import readline from "readline/promises";
import { readFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PIYUSH_SYSTEM_PROMPT = await readFile(
    join(cwd(), "research", "pg", "system-prompt-3.md"),
    "utf-8",
);

const messages = [{ role: "system", content: PIYUSH_SYSTEM_PROMPT }];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log("Chat started. Type 'exit' to quit.\n");

let totalTokens = 0;

while (true) {
    const userInput = await rl.question("You: ");
    if (userInput.trim().toLowerCase() === "exit") break;

    messages.push({ role: "user", content: userInput });

    const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
    });

    const reply = response.choices[0].message.content;
    console.log(`\nBot: ${reply}\n`);

    const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
    totalTokens += total_tokens;
    console.log(
        `[tokens] prompt: ${prompt_tokens} | completion: ${completion_tokens} | turn total: ${total_tokens} | session total: ${totalTokens}\n`,
    );

    messages.push({ role: "assistant", content: reply });
}

rl.close();
console.log(`Chat ended. Total tokens used this session: ${totalTokens}`);
