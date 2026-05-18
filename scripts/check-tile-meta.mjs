#!/usr/bin/env node
// v10 Phase B.2 per-tile meta lint (spec-v10.md §4.2).
//
// Validates tile-meta.js entries:
//   - Every meta `id` is a real tile id from app.js TOOLS.
//   - The meta `id` field matches the registry key.
//   - The meta `group` matches TOOLS[].group.
//   - `simplified: true` tiles also appear in the limitation-banner
//     CANONICAL registry.
//   - No duplicate registry keys.
//
// Pure read-and-report; no network. Wired into `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadToolMeta() {
  const text = await readFile(resolve(ROOT, "app.js"), "utf8");
  const ids = new Map();
  // Capture id + group from each TOOLS entry: { id: "...", name: "...", group: "X", ... }
  const re = /\{\s*id:\s*"([a-z0-9-]+)"\s*,\s*name:\s*"[^"]+"\s*,\s*group:\s*"([^"]+)"/g;
  for (const m of text.matchAll(re)) ids.set(m[1], m[2]);
  return ids;
}

async function main() {
  const errors = [];
  const warnings = [];
  const toolMeta = await loadToolMeta();
  if (toolMeta.size === 0) {
    console.error("ERROR: tile-meta lint could not parse TOOLS from app.js.");
    process.exit(1);
  }

  const mod = await import(resolve(ROOT, "tile-meta.js"));
  const META = mod.TILE_META;
  if (!META || typeof META !== "object") {
    console.error("ERROR: tile-meta.js does not export TILE_META.");
    process.exit(1);
  }

  // limitation-banner.js CANONICAL keys (Phase B.1 / B.3).
  const lbMod = await import(resolve(ROOT, "limitation-banner.js"));
  const lbIds = new Set(lbMod.listLimitationCopyIds());

  for (const [key, row] of Object.entries(META)) {
    const where = "TILE_META[" + JSON.stringify(key) + "]";
    if (!row || typeof row !== "object") {
      errors.push(where + ": not an object.");
      continue;
    }
    if (row.id !== key) {
      errors.push(where + ": row.id '" + row.id + "' does not match registry key.");
    }
    if (!toolMeta.has(key)) {
      errors.push(where + ": id is not a known tile in TOOLS.");
      continue;
    }
    if (row.group !== toolMeta.get(key)) {
      errors.push(where + ": group '" + row.group + "' does not match TOOLS group '" + toolMeta.get(key) + "'.");
    }
    if (typeof row.simplified !== "boolean") {
      errors.push(where + ": simplified must be boolean.");
    }
    if (typeof row.requires_field_meter !== "boolean") {
      errors.push(where + ": requires_field_meter must be boolean.");
    }
    // v10 §E.4: a11y_verified_on ISO date with 180-day staleness warn.
    if (typeof row.a11y_verified_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.a11y_verified_on)) {
      errors.push(where + ": a11y_verified_on must be YYYY-MM-DD.");
    } else {
      const verified = Date.parse(row.a11y_verified_on + "T00:00:00Z");
      const ageDays = Math.round((Date.now() - verified) / 86400000);
      if (ageDays > 180) {
        warnings.push(
          where + ": a11y_verified_on is " + ageDays + " days old (>180). Re-run axe-core and bump the date.",
        );
      }
    }
    // spec-v13 Phase E: the per-tile related-tiles registry was lifted out
    // of TILE_META on 2026-05-18 into scripts/related-tiles.mjs (a build-
    // time-only module the SPA never sees). The per-entry validation
    // moved with it; see scripts/check-related-tiles.mjs.
    if (row.simplified && !lbIds.has(key)) {
      errors.push(
        where + ": simplified=true but no canonical copy exists in limitation-banner.js. Add a CANONICAL entry or drop the flag.",
      );
    }
  }

  // Inverse: every live tile in TOOLS must have a meta row (post-v10
  // §B.2 full migration; this enforces meta as a contributor-checklist
  // gate so a new tile cannot ship without a meta entry).
  for (const id of toolMeta.keys()) {
    if (!META[id]) {
      errors.push(
        "TOOLS tile '" + id + "' has no entry in tile-meta.js TILE_META. Add an [id, group] row to _TILES (or a SIMPLIFIED / FIELD_METER override).",
      );
    }
  }

  for (const w of warnings) console.warn("WARN: " + w);
  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "v10 tile-meta lint FAILED with " + errors.length + " errors (" + warnings.length + " warnings).",
    );
    process.exit(1);
  }
  console.log(
    "v10 tile-meta lint OK (" + Object.keys(META).length + " entries, " + warnings.length + " warnings).",
  );
}

await main();
