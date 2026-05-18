#!/usr/bin/env node
// spec-v13 Phase E (post-split): related-tiles registry lint.
//
// The registry lived inside tile-meta.js until 2026-05-18; it was lifted
// out into ./related-tiles.mjs (a build-time-only module the SPA never
// sees) so the runtime tile-meta.js stops growing with the editorial map.
// The validation moved with it.
//
// Asserts, for every entry in ./related-tiles.mjs `RELATED`:
//   - the key is a real tile id from app.js TOOLS,
//   - the value is an array of strings,
//   - no entry references the tile itself,
//   - no entry is a duplicate within the array,
//   - the array length is <= 6 per spec-v13 §9.1,
//   - every referenced id is a real tile from TOOLS.
//
// Standalone Node 20 script using only built-ins. Wired into `npm run
// lint` so a curated set that drifts (a typo in an id, a stale
// reference to a retired tile) fails CI.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadToolIds() {
  const text = await readFile(resolve(ROOT, "app.js"), "utf8");
  const ids = new Set();
  const re = /\{\s*id:\s*"([a-z0-9-]+)"\s*,\s*name:\s*"[^"]+"\s*,\s*group:\s*"([^"]+)"/g;
  for (const m of text.matchAll(re)) ids.add(m[1]);
  return ids;
}

async function main() {
  const toolIds = await loadToolIds();
  if (toolIds.size === 0) {
    console.error("check-related-tiles: could not parse TOOLS from app.js.");
    process.exit(1);
  }
  const mod = await import(resolve(ROOT, "scripts/related-tiles.mjs"));
  const RELATED = mod.RELATED;
  if (!RELATED || typeof RELATED !== "object") {
    console.error("check-related-tiles: scripts/related-tiles.mjs does not export RELATED.");
    process.exit(1);
  }

  const errors = [];
  for (const [id, list] of Object.entries(RELATED)) {
    const where = "RELATED[" + JSON.stringify(id) + "]";
    if (!toolIds.has(id)) {
      errors.push(where + ": key is not a known TOOLS tile id.");
      continue;
    }
    if (!Array.isArray(list)) {
      errors.push(where + ": value is not an array.");
      continue;
    }
    if (list.length > 6) {
      errors.push(where + ": has " + list.length + " entries (cap 6 per spec-v13 §9.1).");
    }
    const seen = new Set();
    for (const r of list) {
      if (typeof r !== "string") {
        errors.push(where + ": entry " + JSON.stringify(r) + " is not a string.");
        continue;
      }
      if (r === id) {
        errors.push(where + ": entry references the tile itself.");
      }
      if (!toolIds.has(r)) {
        errors.push(where + ": entry '" + r + "' is not a known TOOLS id.");
      }
      if (seen.has(r)) {
        errors.push(where + ": entry '" + r + "' is a duplicate.");
      }
      seen.add(r);
    }
  }

  if (errors.length > 0) {
    console.error("check-related-tiles: " + errors.length + " issue(s):");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  console.log(
    "check-related-tiles OK: " + Object.keys(RELATED).length +
    " curated entries; every id resolves to a TOOLS tile, no self-refs, no duplicates, all <= 6 entries."
  );
}

await main();
