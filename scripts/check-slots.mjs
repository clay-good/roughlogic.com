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
import { fileURLToPath, pathToFileURL } from "node:url";

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
    // Any call shaped fn("Label", "<param>", ...) -- covers makeNumber
    // and every per-module alias (_mnF, _v7makeNumber, ...).
    const idPosition = new RegExp('\\w+\\(\\s*"[^"]*",\\s*"' + esc + '"');
    // Since the factory-id fix (f.id || f.key, 0.181.0), a factory field
    // spec's `key:` literal IS the rendered DOM input id, so key-position
    // literals are equally targetable.
    const keyPosition = new RegExp('key:\\s*"' + esc + '"');
    if (!idPosition.test(src) && !keyPosition.test(src)) {
      errors.push(where + ": param '" + slot.param + "' is neither an id-position make* literal nor a field-spec key literal in " + rel + ".");
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

// spec-v592: the answer-preview map rides the same gate. Every preview
// tile must have a slot row; module / fn must import-resolve; and each
// headline key is asserted present (and finite) by running the tile's
// worked-example inputs through the function -- a renamed output key
// fails CI, not the user.
const PREVIEW_PATH = resolve(ROOT, "data", "search", "preview-map.json");
let preview = null;
try {
  preview = JSON.parse(await readFile(PREVIEW_PATH, "utf8"));
} catch (e) {
  errors.push("preview-map.json unreadable or invalid JSON: " + e.message);
}
let previewCount = 0;
if (preview) {
  if (preview.version !== 1 || !preview.tiles || typeof preview.tiles !== "object") {
    errors.push("preview-map.json: expected { version: 1, tiles: { ... } }.");
  }
  const examplesRaw = JSON.parse(
    await readFile(resolve(ROOT, "test", "fixtures", "worked-examples.json"), "utf8"),
  );
  const exampleByTile = new Map();
  for (const row of examplesRaw.rows) {
    if (!exampleByTile.has(row.tile_id)) exampleByTile.set(row.tile_id, row);
  }
  for (const [tile, entry] of Object.entries(preview.tiles || {})) {
    previewCount++;
    const where = "preview-map.json tile '" + tile + "'";
    const slotRow = (shard.tiles || []).find((r) => r && r.tile === tile);
    if (!slotRow) { errors.push(where + ": no slot row in slots.json."); continue; }
    if (!entry || typeof entry.module !== "string" || typeof entry.fn !== "string" ||
        !entry.args || typeof entry.args !== "object" ||
        !Array.isArray(entry.headline) || entry.headline.length === 0) {
      errors.push(where + ": malformed entry.");
      continue;
    }
    const slotParams = new Set(slotRow.slots.map((s) => s && s.param));
    for (const param of Object.keys(entry.args)) {
      if (!slotParams.has(param)) errors.push(where + ": args key '" + param + "' is not a slot param.");
    }
    let fn;
    try {
      const mod = await import(pathToFileURL(resolve(ROOT, entry.module)).href);
      fn = mod[entry.fn];
    } catch (e) {
      errors.push(where + ": module '" + entry.module + "' failed to import: " + e.message);
      continue;
    }
    if (typeof fn !== "function") {
      errors.push(where + ": export '" + entry.fn + "' is not a function in " + entry.module + ".");
      continue;
    }
    const ex = exampleByTile.get(tile);
    if (!ex) { errors.push(where + ": no worked example to verify headline keys."); continue; }
    let result;
    try { result = fn({ ...ex.inputs }); } catch (e) {
      errors.push(where + ": compute threw on worked-example inputs: " + e.message);
      continue;
    }
    for (const h of entry.headline) {
      if (!h || typeof h.key !== "string" || typeof h.label !== "string" ||
          typeof h.unit !== "string" || !Number.isInteger(h.decimals)) {
        errors.push(where + ": malformed headline line " + JSON.stringify(h));
        continue;
      }
      const v = Number(result ? result[h.key] : NaN);
      if (!Number.isFinite(v)) {
        errors.push(where + ": headline key '" + h.key + "' is not a finite number on the worked example.");
      }
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
  " slots; all tiles live, params source-verified, unit tokens unique per tile; " +
  previewCount + " preview entries import-resolved with finite worked-example headlines.",
);
