import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceDir = path.join(root, "attached_assets/generated_images/haunted-card-expansion");
const outputDir = path.join(sourceDir, "webp");
const source = await readFile(path.join(root, "artifacts/redline-upgrade/src/game/haunted-cards.ts"), "utf8");
const ids = [...source.matchAll(/^\s*\['([a-z0-9-]+)',/gm)].map((match) => match[1]);
if (ids.length !== 100 || new Set(ids).size !== 100) {
  throw new Error(`Expected exactly 100 unique Haunted card IDs; found ${ids.length}.`);
}
await mkdir(outputDir, { recursive: true });

for (const [index, id] of ids.entries()) {
  const input = path.join(sourceDir, `${id}.png`);
  const output = path.join(outputDir, `${id}.webp`);
  try {
    const file = await stat(input);
    if (file.size === 0) throw new Error("file is empty");
  } catch (error) {
    throw new Error(`Missing generated artwork for ${id}: ${error instanceof Error ? error.message : error}`);
  }

  execFileSync("magick", [
    input,
    "-resize", "800x800^",
    "-gravity", "center",
    "-extent", "800x800",
    "-strip",
    "-quality", "82",
    output,
  ]);
  if ((index + 1) % 10 === 0 || index + 1 === ids.length) {
    console.log(`Prepared Haunted card illustration ${index + 1}/100`);
  }
}

console.log(`Created 100 unique Haunted WebP illustrations in ${outputDir}`);
