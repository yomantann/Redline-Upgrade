import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const catalogPath = path.join(root, "artifacts/redline-upgrade/src/game/asset-expansion.json");
const sourceDir = path.join(root, "attached_assets/generated_images/asset-expansion");
const outputDir = path.join(sourceDir, "webp");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const assets = Object.values(catalog).flat();
await mkdir(outputDir, { recursive: true });

for (const [index, asset] of assets.entries()) {
  const [id] = asset;
  const source = path.join(sourceDir, `${id}.png`);
  try {
    await stat(source);
  } catch {
    throw new Error(`Missing generated 2x2 progression image for ${id}`);
  }

  const dimensions = execFileSync("magick", ["identify", "-format", "%w %h", source], { encoding: "utf8" })
    .trim().split(/\s+/).map(Number);
  const [width, height] = dimensions;
  if (!width || !height || width % 2 || height % 2) {
    throw new Error(`Expected an even-sized 2x2 image for ${id}, got ${dimensions.join("x")}`);
  }

  const panelWidth = width / 2;
  const panelHeight = height / 2;
  const panels = [
    [0, 0], [panelWidth, 0], [0, panelHeight], [panelWidth, panelHeight],
  ];
  for (const [level, [x, y]] of panels.entries()) {
    const output = path.join(outputDir, `${id}-level-${level + 1}.webp`);
    execFileSync("magick", [
      source,
      "-crop", `${panelWidth}x${panelHeight}+${x}+${y}`,
      "+repage",
      "-resize", "640x640^",
      "-gravity", "center",
      "-extent", "640x640",
      "-strip",
      "-quality", "84",
      output,
    ]);
  }
  if ((index + 1) % 10 === 0 || index + 1 === assets.length) {
    console.log(`Prepared progression art for ${index + 1}/${assets.length} assets`);
  }
}

console.log(`Created ${assets.length * 4} WebP illustrations in ${outputDir}`);
