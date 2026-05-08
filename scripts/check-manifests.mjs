#!/usr/bin/env node
// v8 Phase A manifest-discipline lint (spec-v8.md §3).
//
// Verifies that every data/<folder>/manifest.json carries the v6 edition
// stamp (already enforced by check-v6-discipline) and the v8 asOf date.
// Verifies that every shard listed in every manifest has a recorded hash.
// Future-proofs against state-keyed shards by checking that any
// data/legal/* (when introduced) carries a per-entry verifiedOn date.
//
// Pure read-and-report; no network, no mutation.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "data");

const errors = [];

function isIsoDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function main() {
  const folders = (await readdir(DATA, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const folder of folders) {
    const manifestPath = resolve(DATA, folder, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    const m = JSON.parse(await readFile(manifestPath, "utf8"));
    // edition (v6 §2.6 / §7)
    if (!m.edition || typeof m.edition !== "string" || m.edition.length === 0) {
      errors.push("data/" + folder + "/manifest.json missing 'edition' (v8 §A.1).");
    }
    // asOf (v8 §A.2)
    if (!isIsoDate(m.asOf)) {
      errors.push("data/" + folder + "/manifest.json missing or invalid 'asOf' ISO date (v8 §A.2).");
    }
    // every listed shard has a recorded hash
    for (const shard of m.shards || []) {
      if (!m.hashes || !m.hashes[shard.file]) {
        errors.push("data/" + folder + "/manifest.json shard '" + shard.file + "' has no recorded hash.");
      }
    }
  }
  // Future-proof: data/legal/* per-entry verifiedOn check.
  const legalDir = resolve(DATA, "legal");
  if (existsSync(legalDir)) {
    const files = await readdir(legalDir);
    for (const f of files) {
      if (!f.endsWith(".json") || f === "manifest.json") continue;
      const body = JSON.parse(await readFile(resolve(legalDir, f), "utf8"));
      // Per-state shards typically have a top-level object keyed by state code.
      for (const k of Object.keys(body)) {
        const entry = body[k];
        if (entry && typeof entry === "object" && !Array.isArray(entry) && !isIsoDate(entry.verifiedOn)) {
          errors.push("data/legal/" + f + " entry '" + k + "' missing per-entry 'verifiedOn' ISO date (v8 §A.3 future-proof).");
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error("v8 manifest-discipline lint FAILED with " + errors.length + " errors.");
    process.exit(1);
  }
  console.log("v8 manifest-discipline lint OK (edition + asOf + shard hashes present).");
}

await main();
