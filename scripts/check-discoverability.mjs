#!/usr/bin/env node
// v10 Phase D lint (spec-v10.md §6).
//
// Validates:
//   - Every `target` in data/search/aliases.json is a real tile id from
//     the TOOLS array in app.js.
//   - Every key and every companion id in data/search/companions.json
//     is a real tile id.
//   - No alias term collides with a tile id (a term is a free-text
//     query that should resolve via the alias path; if it is itself a
//     tile id, the alias is redundant or worse, conflicting).
//   - No tile is its own companion.
//   - Per-tile companion list has at most 4 entries (UI bound for the
//     inline link strip; the 4-entry cap was originally sized for
//     Big-Buttons mode, which was retired in spec-v11, but the cap is
//     kept because the readable-strip rationale still applies).
//   - No duplicate alias term.
//
// Pure read-and-report; no network, no mutation. Fails CI on any
// invariant breach. Wired into `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_JS = resolve(ROOT, "app.js");
const ALIASES_PATH = resolve(ROOT, "data", "search", "aliases.json");
const COMPANIONS_PATH = resolve(ROOT, "data", "search", "companions.json");

const COMPANION_MAX = 4;

async function loadToolIds() {
  const text = await readFile(APP_JS, "utf8");
  const ids = new Set();
  // The TOOLS array uses `{ id: "<id>", name: ..., group: ..., ... }`.
  // We accept any line in app.js shaped like that; the live array is the
  // dominant source so duplicates are fine (they're already deduplicated
  // by the runtime route table).
  const re = /\{\s*id:\s*"([a-z0-9-]+)"/g;
  for (const m of text.matchAll(re)) ids.add(m[1]);
  return ids;
}

async function main() {
  const errors = [];
  const warnings = [];
  const toolIds = await loadToolIds();
  if (toolIds.size === 0) {
    console.error("ERROR: discoverability lint could not read TOOLS from app.js.");
    process.exit(1);
  }

  // --- Aliases ---
  if (!existsSync(ALIASES_PATH)) {
    warnings.push("data/search/aliases.json missing; D.1 not yet shipped.");
  } else {
    const a = JSON.parse(await readFile(ALIASES_PATH, "utf8"));
    if (!Array.isArray(a.aliases)) {
      errors.push("data/search/aliases.json: 'aliases' must be an array.");
    } else {
      const seenTerms = new Map();
      for (const row of a.aliases) {
        if (!row || typeof row !== "object") {
          errors.push("data/search/aliases.json: non-object alias row.");
          continue;
        }
        const { term, target, kind } = row;
        if (typeof term !== "string" || term.length === 0) {
          errors.push("data/search/aliases.json: row missing 'term'.");
          continue;
        }
        if (typeof target !== "string") {
          errors.push("data/search/aliases.json: term '" + term + "' missing 'target'.");
          continue;
        }
        if (kind !== "industry" && kind !== "redirect" && kind !== "adjacent") {
          errors.push(
            "data/search/aliases.json: term '" + term + "' has invalid kind '" + kind + "' (expected industry|redirect|adjacent).",
          );
        }
        if (!toolIds.has(target)) {
          errors.push(
            "data/search/aliases.json: term '" + term + "' targets unknown tile id '" + target + "'.",
          );
        }
        const lc = term.toLowerCase();
        if (toolIds.has(lc)) {
          errors.push(
            "data/search/aliases.json: term '" + term + "' is itself a tile id; remove the redundant alias.",
          );
        }
        if (seenTerms.has(lc)) {
          errors.push(
            "data/search/aliases.json: duplicate alias term '" + term + "' (already maps to '" + seenTerms.get(lc) + "').",
          );
        }
        seenTerms.set(lc, target);
      }
    }
  }

  // --- Companions ---
  if (!existsSync(COMPANIONS_PATH)) {
    warnings.push("data/search/companions.json missing; D.2 not yet shipped.");
  } else {
    const c = JSON.parse(await readFile(COMPANIONS_PATH, "utf8"));
    if (!c.companions || typeof c.companions !== "object") {
      errors.push("data/search/companions.json: 'companions' must be an object.");
    } else {
      for (const [src, list] of Object.entries(c.companions)) {
        if (!toolIds.has(src)) {
          errors.push(
            "data/search/companions.json: source '" + src + "' is not a known tile id.",
          );
        }
        if (!Array.isArray(list)) {
          errors.push("data/search/companions.json: source '" + src + "' value must be an array.");
          continue;
        }
        if (list.length > COMPANION_MAX) {
          errors.push(
            "data/search/companions.json: source '" + src + "' has " + list.length + " companions; max is " + COMPANION_MAX + ".",
          );
        }
        const seen = new Set();
        for (const id of list) {
          if (typeof id !== "string") {
            errors.push("data/search/companions.json: source '" + src + "' has non-string companion.");
            continue;
          }
          if (id === src) {
            errors.push("data/search/companions.json: source '" + src + "' lists itself as a companion.");
          }
          if (!toolIds.has(id)) {
            errors.push(
              "data/search/companions.json: source '" + src + "' references unknown tile '" + id + "'.",
            );
          }
          if (seen.has(id)) {
            errors.push(
              "data/search/companions.json: source '" + src + "' lists '" + id + "' twice.",
            );
          }
          seen.add(id);
        }
      }
    }
  }

  for (const w of warnings) console.warn("WARN: " + w);
  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "v10 discoverability lint FAILED with " + errors.length + " errors (" + warnings.length + " warnings).",
    );
    process.exit(1);
  }
  console.log(
    "v10 discoverability lint OK (" + warnings.length + " warnings, 0 errors; " + toolIds.size + " tile ids known).",
  );
}

await main();
