#!/usr/bin/env node
// build-citation-shards.mjs -- the browser's citations, one shard per tile view.
//
// citations.js holds one structured citation per tile and stays the single
// source of truth: build-shells, the citation gates and the tests read it. But
// the browser imported the whole file (1.15 MB gzipped at 2,263 tiles) to show
// ONE tile's reference block. This writes what the browser loads instead:
//
//   data/citations/<NN>.json   the registry's entries, sharded by a hash of
//                              the tile id (citation-bucket.js). A tile view
//                              fetches its one shard, 13 to 30 KB gzipped.
//
// citation-block.js renders an entry; app.js hands it the one from the shard.
// Every entry is asserted here to survive the JSON round trip unchanged, so a
// shard cannot say something the registry does not.
//
// Run with --check in lint; without it, to regenerate after a citation change.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { isDeepStrictEqual } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stampIntegrityAnchor } from "./stamp-integrity-anchor.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "data", "citations");
const CHECK = process.argv.includes("--check");
const VERBOSE = process.argv.includes("--verbose");

// The manifest's edition stamp. A literal, not `new Date()`: a generated file
// must not change because the calendar did. Bump it when the shard shape does.
const EDITION_DATE = "2026-10-10";
// Fetched on a phone on a job site, one per tile view. The largest shard was
// 30 KB gzipped when this was written.
const SHARD_GZIP_CAP = 64 * 1024;

const { CITATIONS } = await import(pathToFileURL(resolve(ROOT, "citations.js")).href);
const { citationBucket, CITATION_BUCKETS } = await import(pathToFileURL(resolve(ROOT, "citation-bucket.js")).href);

const shards = new Map(); // bucket -> { tileId: entry }
for (const [id, entry] of Object.entries(CITATIONS)) {
  // A value JSON cannot carry (undefined, a function, NaN) would be dropped or
  // changed silently on the way to the browser.
  if (!isDeepStrictEqual(JSON.parse(JSON.stringify(entry)), entry)) {
    console.error(`build-citation-shards FAIL: the citation for ${id} does not survive JSON unchanged.`);
    process.exit(1);
  }
  const b = citationBucket(id);
  if (!shards.has(b)) shards.set(b, {});
  shards.get(b)[id] = entry;
}

let drift = 0;
async function emit(path, text, label) {
  if (CHECK) {
    let existing = null;
    try { existing = await readFile(path, "utf8"); } catch { existing = null; }
    if (existing !== text) {
      console.error(`build-citation-shards FAIL: ${label} is stale. Run: node scripts/build-citation-shards.mjs`);
      drift++;
    }
  } else {
    await writeFile(path, text, "utf8");
  }
}

if (!CHECK) await mkdir(OUT_DIR, { recursive: true });
const written = [];
for (const [b, entries] of [...shards].sort((a, c) => (a[0] < c[0] ? -1 : 1))) {
  const text = JSON.stringify({ version: 1, bucket: b, entries }) + "\n";
  const gz = gzipSync(Buffer.from(text)).length;
  if (gz > SHARD_GZIP_CAP) {
    console.error(`build-citation-shards FAIL: shard ${b}.json is ${(gz / 1024).toFixed(1)} KB gzip, over the ${SHARD_GZIP_CAP / 1024} KB cap. Raise CITATION_BUCKETS in citation-bucket.js; do not raise the cap.`);
    process.exit(1);
  }
  written.push({ b, tiles: Object.keys(entries).length, gz, text });
  await emit(resolve(OUT_DIR, `${b}.json`), text, `data/citations/${b}.json`);
}

// A shard for a bucket that no longer exists would be served forever.
{
  let present = [];
  try { present = await readdir(OUT_DIR); } catch { present = []; }
  const expected = new Set(written.map((w) => `${w.b}.json`));
  for (const name of present) {
    if (name === "manifest.json" || !name.endsWith(".json") || expected.has(name)) continue;
    console.error(`build-citation-shards FAIL: data/citations/${name} has no matching bucket. Delete it.`);
    process.exit(1);
  }
}

const sha256Hex = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const manifestPath = resolve(OUT_DIR, "manifest.json");
const manifestText = JSON.stringify({
  name: "citations",
  version: EDITION_DATE,
  fetched: EDITION_DATE,
  edition:
    "The project's per-tile citation registry, split from citations.js: each tile's formula, " +
    "source and edition, free-access pointer, governance notice, scope note and numeric assumptions. " +
    "Derived data: citations.js is authoritative and these shards regenerate from it. The registry " +
    "names its sources; it reproduces no table from any of them.",
  asOf: EDITION_DATE,
  // The real cadence is every citation change: --check regenerates these shards
  // and fails on any drift, which is stricter than a date.
  refresh_cadence: "annual",
  shards: written.map((w) => ({
    file: `${w.b}.json`,
    name: `Tile citations, runtime shard ${w.b} of ${CITATION_BUCKETS} (generated)`,
    gzip_size_bytes: w.gz,
  })),
  hashes: Object.fromEntries(written.map((w) => [`${w.b}.json`, sha256Hex(w.text)])),
}, null, 2) + "\n";

// gzip_size_bytes varies a few bytes across zlib builds (macOS vs CI Linux) and
// is informational, so --check compares everything else.
const manifestShape = (m) => JSON.stringify({ ...m, shards: (m.shards || []).map((s) => ({ file: s.file, name: s.name })) });
if (CHECK) {
  let existing = null;
  try { existing = JSON.parse(await readFile(manifestPath, "utf8")); } catch { existing = null; }
  if (!existing || manifestShape(existing) !== manifestShape(JSON.parse(manifestText))) {
    console.error("build-citation-shards FAIL: data/citations/manifest.json is stale. Run: node scripts/build-citation-shards.mjs");
    drift++;
  }
} else {
  await writeFile(manifestPath, manifestText, "utf8");
  // Both hash registries carry the manifest: data/integrity.json (runtime) and
  // scripts/expected-hashes.json (`npm run data:verify` in CI).
  await stampIntegrityAnchor("citations");
}

if (drift) process.exit(1);

const total = written.reduce((n, w) => n + w.gz, 0);
if (VERBOSE) for (const w of written) console.log(`  ${w.b}.json  ${String(w.tiles).padStart(4)} tiles  ${(w.gz / 1024).toFixed(1)} KB gzip`);
console.log(
  `build-citation-shards: ${CHECK ? "clean" : "wrote"} ${written.length} citation shards for ${Object.keys(CITATIONS).length} tiles ` +
  `(${(total / 1024).toFixed(1)} KB gzip total, largest ${(Math.max(...written.map((w) => w.gz)) / 1024).toFixed(1)} KB).`,
);
