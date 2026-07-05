import "dotenv/config";
import OpenAI from "openai";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INPUT_DIR = join(cwd(), "hc", "youtube");
const OUTPUT_DIR = join(cwd(), "hc", "youtube-transliterated");
const BATCH_SIZE = 30;

const FILES = [
    "chaicode-is-live.json",
    "javascript-module-pattern-dependency-injection-tutorial.json",
    "just-chill-live-stream.json",
    "supabase-a-9-billion-dollar-company.json",
    "what-is-agentic-ai-and-ai-agents-only-video-you-need-to-watch.json",
];

const SYSTEM_PROMPT =
    "You are a Devanagari-to-Roman transliterator. Convert Devanagari Hindi text to Romanized Hinglish. " +
    "Rules:\n" +
    '- English words/phrases garbled into Devanagari phonetics (e.g. "वॉइस ओवर इंटरनेट") → restore to proper English ("Voice over Internet")\n' +
    '- Actual Hindi words → romanize phonetically (e.g. "हम" → "hum", "करेंगे" → "karenge", "मैं" → "main")\n' +
    "- Preserve all punctuation, spacing, and capitalization exactly as in the original.\n" +
    "- Output one transliterated line per input, numbered 0,1,2... No explanations.";

const transliterateBatch = async (texts) => {
    const input = texts.map((t, i) => `${i}: ${t}`).join("\n");

    const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: input },
        ],
        temperature: 0,
    });

    const output = response.choices[0].message.content;
    const lines = output
        .split("\n")
        .map((l) => l.replace(/^\d+:\s*/, ""))
        .filter(Boolean);

    // If we got fewer lines than expected (model sometimes merges), pad
    while (lines.length < texts.length) lines.push("");
    return lines.slice(0, texts.length);
};

const processFile = async (filename) => {
    const inputPath = join(INPUT_DIR, filename);
    const outputPath = join(OUTPUT_DIR, filename);

    console.log(`\n--- ${filename} ---`);
    const raw = await readFile(inputPath, "utf-8");
    const segments = JSON.parse(raw);
    console.log(`${segments.length} segments`);

    const batches = [];
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
        batches.push(segments.slice(i, i + BATCH_SIZE));
    }
    console.log(`${batches.length} batches of ~${BATCH_SIZE}`);

    for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        const texts = batch.map((s) => s.text);
        console.log(`  batch ${b + 1}/${batches.length}...`);

        const transliterated = await transliterateBatch(texts);

        for (let j = 0; j < batch.length; j++) {
            batch[j].text = transliterated[j] || batch[j].text;
        }
    }

    await writeFile(outputPath, JSON.stringify(segments, null, 2));
    console.log(`Saved -> ${outputPath}`);
};

const main = async () => {
    await mkdir(OUTPUT_DIR, { recursive: true });

    for (const file of FILES) {
        try {
            await processFile(file);
        } catch (err) {
            console.error(`Failed on ${file}:`, err.message);
        }
    }

    console.log("\nDone.");
};

main();
