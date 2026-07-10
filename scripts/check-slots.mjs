#!/usr/bin/env node
// spec-v591 slot-table lint (the 29th gate, wired into npm run lint).
//
// data/search/slots.json maps search-query quantities onto tile hash-state
// params ("voltage drop 120v 150 ft" -> #voltage-drop?v=1&vd-src=120&...).
// A renamed input id or a deleted tile would silently dead-link the
// prefill, so every row is checked mechanically:
//
//   1. The shard parses as strict JSON with { version: 1, tiles: [...] }.
//   2. Every `tile` is a live tile id in tools-data.js, listed once.
//   3. Every `param` appears as the id-position string literal of a
//      make* field call (makeNumber / _v7makeNumber / makeSelect / ...)
//      in the tile's registered compute module source (module resolved
//      via test/fixtures/compute-map.js -- the check-dead-inputs
//      source-grep technique), and is unique within its tile. The
//      id-position requirement matters: factory-built renderers pass
//      field KEYS around as string literals too, but applyHashState
//      targets DOM ids, so a key-position literal is a dead prefill.
//   4. Unit tokens are lowercase, non-empty, and unique across a tile's
//      slots (the mapSlots exactly-one rule depends on it).
//
// No network. No mutation. Pure read-and-report.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SLOTS_PATH = resolve(ROOT, "data", "search", "slots.json");

const errors = [];

const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
const { COMPUTE_MAP } = await import(resolve(ROOT, "test", "fixtures", "compute-map.js"));
const toolIds = new Set(TOOLS.map((t) => t.id));

let shard;
try {
  shard = JSON.parse(await readFile(SLOTS_PATH, "utf8"));
} catch (e) {
  console.error("check-slots FAIL: data/search/slots.json unreadable or invalid JSON: " + e.message);
  process.exit(1);
}

if (shard.version !== 1 || !Array.isArray(shard.tiles)) {
  errors.push("slots.json: expected { version: 1, tiles: [...] }.");
}

const moduleSource = new Map();
async function sourceFor(rel) {
  if (!moduleSource.has(rel)) {
    moduleSource.set(rel, await readFile(resolve(ROOT, rel), "utf8"));
  }
  return moduleSource.get(rel);
}

const seenTiles = new Set();
let slotCount = 0;
for (const row of shard.tiles || []) {
  if (!row || typeof row.tile !== "string" || !Array.isArray(row.slots)) {
    errors.push("slots.json: malformed tile row " + JSON.stringify(row));
    continue;
  }
  const where = "slots.json tile '" + row.tile + "'";
  if (seenTiles.has(row.tile)) errors.push(where + ": duplicate tile row.");
  seenTiles.add(row.tile);
  if (!toolIds.has(row.tile)) {
    errors.push(where + ": not a live tile id in tools-data.js.");
    continue;
  }
  const reg = COMPUTE_MAP[row.tile];
  if (!reg || typeof reg.module !== "string") {
    errors.push(where + ": tile has no compute-map module (reference tile cannot take a prefill).");
    continue;
  }
  // compute-map modules are relative to test/fixtures ("../../calc-x.js").
  const rel = reg.module.replace(/^(\.\.\/)+/, "");
  const src = await sourceFor(rel);
  const seenParams = new Set();
  const seenUnits = new Set();
  for (const slot of row.slots) {
    slotCount++;
    if (!slot || typeof slot.param !== "string" || !Array.isArray(slot.units) || slot.units.length === 0) {
      errors.push(where + ": malformed slot " + JSON.stringify(slot));
      continue;
    }
    if (seenParams.has(slot.param)) errors.push(where + ": duplicate param '" + slot.param + "'.");
    seenParams.add(slot.param);
    const esc = slot.param.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const idPosition = new RegExp('make[A-Za-z]*\\(\\s*"[^"]*",\\s*"' + esc + '"');
    if (!idPosition.test(src)) {
      errors.push(where + ": param '" + slot.param + "' is not the id-position literal of a make* call in " + rel + ".");
    }
    for (const u of slot.units) {
      if (typeof u !== "string" || !u || u !== u.toLowerCase()) {
        errors.push(where + ": unit token " + JSON.stringify(u) + " must be a lowercase string.");
        continue;
      }
      if (seenUnits.has(u)) {
        errors.push(where + ": unit token '" + u + "' claimed by more than one slot.");
      }
      seenUnits.add(u);
    }
  }
}

if (errors.length) {
  console.error("check-slots: " + errors.length + " issue(s):");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  "check-slots OK: " + seenTiles.size + " tiles / " + slotCount +
  " slots; all tiles live, params source-verified, unit tokens unique per tile.",
);
