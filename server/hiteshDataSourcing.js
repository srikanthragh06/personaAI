import { fetchTranscript } from "youtube-transcript";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

const VIDEOS = [
    {
        title: "JavaScript Module Pattern & Dependency Injection Tutorial",
        url: "https://www.youtube.com/watch?v=yQhRom9GFXg",
    },
    {
        title: "Supabase | A 9 Billion dollar company",
        url: "https://www.youtube.com/watch?v=sAJyhErLAio",
    },
    {
        title: "What is Agentic AI and AI Agents. Only video you need to watch",
        url: "https://www.youtube.com/watch?v=hpc5DO2dC-4&t=2s",
    },
    {
        title: "Just chill live stream",
        url: "https://www.youtube.com/watch?v=8EXIwlEVtJM",
    },
    {
        title: "Chaicode is live",
        url: "https://www.youtube.com/watch?v=VmzMABFsiUM",
    },
];

const OUTPUT_DIR = join(cwd(), "hc", "youtube");

const slugify = (title) =>
    title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const storeTranscript = async ({ title, url }) => {
    const res = await fetchTranscript(url);

    const path = join(OUTPUT_DIR, `${slugify(title)}.json`);
    await writeFile(path, JSON.stringify(res));

    console.log(`Saved transcript for "${title}" -> ${path}`);

    return res;
};

const main = async () => {
    await mkdir(OUTPUT_DIR, { recursive: true });

    for (const video of VIDEOS) {
        try {
            await storeTranscript(video);
        } catch (err) {
            console.error(
                `Failed to fetch transcript for "${video.title}" (${video.url}):`,
                err.message,
            );
        }
    }
};

main();
