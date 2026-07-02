import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const bulletList = (items) => items.map((item) => `- ${item}`).join("\n");

const catchphraseList = (phrases) =>
    phrases.map(({ phrase, function: fn }) => `- "${phrase}" — ${fn}`).join("\n");

const sampleExchangeBlock = (exchanges) =>
    exchanges
        .map(
            ({ register, user, piyush, ...rest }) => {
                const reply = piyush ?? rest.reply ?? rest[Object.keys(rest)[0]];
                return `[${register}]\nUser: ${user}\n${reply}`;
            },
        )
        .join("\n\n");

const generateSystemPrompt = (card) => {
    const name = card.persona;
    const firstName = name.split(" ")[0];

    const sections = [];

    // --- Intro / identity ---
    sections.push(
        `You are ${name} — ${card.identity.summary}\n\n` +
            `Key facts about who you are:\n${bulletList(card.identity.traits)}`,
    );

    // --- Formatting rules (high salience, right after identity) ---
    if (card.formatting_rules) {
        const fr = card.formatting_rules;
        const exampleBlocks = fr.examples
            .map(
                ({ rule, bad, good }) =>
                    `RULE: ${rule}\nWRONG (never respond like this):\n"""\n${bad}\n"""\nRIGHT (respond like this instead):\n"""\n${good}\n"""`,
            )
            .join("\n\n");
        sections.push(
            `FORMATTING — READ THIS CAREFULLY, IT IS NON-NEGOTIABLE:\n` +
                `${fr.summary}\n\n${exampleBlocks}`,
        );
    }

    // --- Voice / tone ---
    sections.push(
        `VOICE AND TONE:\n` +
            `${card.tone.default_register}\n\n` +
            `Register shifts:\n` +
            `- In tutorial/explaining contexts: ${card.tone.register_shift.tutorial_videos}\n` +
            `- In casual/conversational contexts: ${card.tone.register_shift.livestreams_and_AMAs}\n\n` +
            `Handling emotional moments: ${card.tone.emotional_handling}\n\n` +
            `Confidence style: ${card.tone.confidence_style}`,
    );

    // --- Language mixing rules ---
    const ls = card.language_style;
    sections.push(
        `LANGUAGE MIXING — THIS IS CRITICAL TO YOUR VOICE:\n` +
            `${ls.core_rule}\n\n` +
            `1) EXPLAINING REGISTER — use when: ${ls.register_rule_for_responses.explaining_register.when}\n` +
            `   How: ${ls.register_rule_for_responses.explaining_register.how}\n` +
            `   Example shape: "${ls.register_rule_for_responses.explaining_register.example_shape}"\n\n` +
            `2) CONVERSATIONAL REGISTER — use when: ${ls.register_rule_for_responses.conversational_register.when}\n` +
            `   How: ${ls.register_rule_for_responses.conversational_register.how}\n` +
            `   Example shape: "${ls.register_rule_for_responses.conversational_register.example_shape}"\n\n` +
            `${ls.register_rule_for_responses.note}\n\n` +
            `${ls.verbal_density_note}`,
    );

    // --- Catchphrases ---
    sections.push(
        `SIGNATURE PHRASES (draw from these naturally, don't force every one into every reply):\n\n` +
            `When explaining/teaching:\n${catchphraseList(card.catchphrases.explaining_register)}\n\n` +
            `When conversational/casual:\n${catchphraseList(card.catchphrases.conversational_register)}`,
    );

    // --- Teaching philosophy ---
    const tp = card.teaching_philosophy;
    sections.push(
        `TEACHING APPROACH:\n` +
            `Core principles:\n${bulletList(tp.core_principles)}\n\n` +
            `On AI and modern practice:\n${bulletList(tp.on_ai_and_modern_practice)}\n\n` +
            `How you deliver an explanation:\n${bulletList(tp.delivery_pattern)}`,
    );

    // --- Analogies style ---
    sections.push(
        `HOW YOU USE ANALOGIES:\n` +
            `${card.analogies_style.summary}\n${bulletList(card.analogies_style.patterns)}`,
    );

    // --- Recurring opinions ---
    sections.push(
        `OPINIONS YOU HOLD (stay consistent with these, don't flip-flop):\n${bulletList(
            card.recurring_opinions,
        )}`,
    );

    // --- Boundaries ---
    sections.push(`DO NOT:\n${bulletList(card.boundaries.do_not)}`);

    // --- Few-shot examples ---
    sections.push(
        `EXAMPLES OF YOUR VOICE (study the register each one uses):\n\n${sampleExchangeBlock(
            card.sample_exchanges,
        )}`,
    );

    const header =
        `# ${name} — System Prompt\n` +
        `# Auto-generated from ${name.toLowerCase().replace(/\s+/g, "-")}'s persona card. Do not hand-edit — edit the card and regenerate.\n\n`;

    return header + sections.join("\n\n---\n\n");
};

const main = async () => {
    const cardPath = process.argv[2];
    if (!cardPath) {
        console.error("Usage: node generatePersonaPrompt.js <path-to-persona-card.json>");
        process.exit(1);
    }

    const raw = await readFile(cardPath, "utf-8");
    const card = JSON.parse(raw);
    const prompt = generateSystemPrompt(card);

    const outPath = join(dirname(cardPath), "system-prompt.md");
    await writeFile(outPath, prompt);
    console.log(`Generated system prompt -> ${outPath}`);
};

main();
