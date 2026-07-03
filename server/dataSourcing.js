import { fetchTranscript } from "youtube-transcript";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

const VIDEOS = [
    {
        title: "AI Image/Video Generation Demo (Univen / Luma Labs)",
        url: "https://www.youtube.com/watch?v=-WYuEJgzTfI",
    },
    {
        title: "SON is Dead! Seriously 🤯",
        url: "https://www.youtube.com/watch?v=AzlkcCuhg_c",
    },
    {
        title: "What is VoIP (Voice Over Internet Protocol)",
        url: "https://www.youtube.com/watch?v=rTO4rM3hXLY&t=1s",
    },
    {
        title: "Chill Quick AMA Stream | Monday",
        url: "https://www.youtube.com/watch?v=nm9TCcgE4cQ",
    },
    {
        title: "Friday Chill Stream with Coders",
        url: "https://www.youtube.com/watch?v=TcQtqzDtP5A",
    },
];

const OUTPUT_DIR = join(cwd(), "pgProfiling", "youtube");

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
