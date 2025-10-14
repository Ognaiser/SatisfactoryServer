import fetch from "node-fetch";
import fs from "fs-extra";
import path from "path";
import pLimit from "p-limit";

const BASE_URL = "https://static.satisfactory-calculator.com/imgMap/gameLayer/Stable/";
const VERSION = "1727095012"; // can change if new version
const OUTPUT_DIR = "./static/tiles";
const ZOOMS = [3, 4, 5, 6, 7, 8];
const TILE_SIZE = 256;
const CONCURRENCY = 10; // number of parallel downloads

async function downloadTile(zoom, x, y) {
  const url = `${BASE_URL}${zoom}/${x}/${y}.png?v=${VERSION}`;
  const filePath = path.join(OUTPUT_DIR, `${zoom}`, `${x}`, `${y}.png`);

  if (await fs.pathExists(filePath)) return; // skip already downloaded

  await fs.ensureDir(path.dirname(filePath));

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${res.status} ${url}`);
    const buffer = await res.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));
    console.log(`✅ Saved ${zoom}/${x}/${y}.png`);
  } catch (err) {
    console.error(`❌ Error: ${zoom}/${x}/${y}.png — ${err.message}`);
  }
}

async function main() {
  const limit = pLimit(CONCURRENCY);
  const tasks = [];

  for (const zoom of ZOOMS) {
    const dim = 5 * (1 << (zoom - 3));
    console.log(`\n📦 Zoom ${zoom} (${dim}x${dim} tiles)`);

    for (let x = 0; x < dim; x++) {
      for (let y = 0; y < dim; y++) {
        tasks.push(limit(() => downloadTile(zoom, x, y)));
      }
    }
  }

  await Promise.all(tasks);
  console.log("\n🎉 Done downloading all tiles!");
}

main().catch(console.error);