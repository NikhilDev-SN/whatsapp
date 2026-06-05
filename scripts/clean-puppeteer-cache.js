import fs from "node:fs/promises";
import path from "node:path";

const renderCachePaths = [
  "/opt/render/.cache/puppeteer",
  "/opt/render/project/.cache/puppeteer",
  process.env.PUPPETEER_CACHE_DIR
].filter(Boolean);

for (const cachePath of new Set(renderCachePaths)) {
  const normalized = path.posix.normalize(cachePath.replaceAll("\\", "/"));
  const isRenderPath =
    normalized.startsWith("/opt/render/.cache/puppeteer") ||
    normalized.startsWith("/opt/render/project/.cache/puppeteer");

  if (!isRenderPath) continue;

  try {
    await fs.rm(cachePath, { force: true, recursive: true });
    console.log(`Cleared Puppeteer cache: ${cachePath}`);
  } catch (error) {
    console.warn(`Could not clear Puppeteer cache ${cachePath}: ${error.message}`);
  }
}
