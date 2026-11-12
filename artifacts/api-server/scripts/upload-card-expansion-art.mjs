import { Storage } from "@google-cloud/storage";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceDir = path.join(workspaceRoot, "attached_assets/generated_images/card-expansion/webp");
const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is not configured.");

const files = (await readdir(sourceDir))
  .filter((name) => /^[a-z0-9-]+\.webp$/.test(name))
  .sort();
if (files.length !== 100) {
  throw new Error(`Expected 100 expansion card WebP images; found ${files.length}.`);
}

const sidecar = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${sidecar}/token`,
    type: "external_account",
    credential_source: {
      url: `${sidecar}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});
const bucket = storage.bucket(bucketId);
let completed = 0;
let cursor = 0;

async function uploadWorker() {
  while (cursor < files.length) {
    const fileName = files[cursor++];
    const localPath = path.join(sourceDir, fileName);
    const fileStats = await stat(localPath);
    if (fileStats.size === 0) throw new Error(`Empty card artwork file: ${fileName}`);
    const cardId = fileName.replace(/\.webp$/, "");

    await bucket.file(`redline-card-expansion/${cardId}.webp`).save(await readFile(localPath), {
      resumable: false,
      metadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    completed++;
    if (completed % 20 === 0 || completed === files.length) {
      console.log(`Uploaded ${completed}/${files.length} card illustrations`);
    }
  }
}

await Promise.all(Array.from({ length: 6 }, () => uploadWorker()));
console.log(`Uploaded all ${completed} unique card illustrations.`);
