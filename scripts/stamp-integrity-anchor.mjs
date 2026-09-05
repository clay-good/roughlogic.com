// stamp-integrity-anchor.mjs -- re-anchor one data folder's manifest hash in
// data/integrity.json.
//
// integrity.js verifies each data/<folder>/manifest.json against the hash
// recorded here before it trusts any shard in that folder, and
// check-integrity-coverage fails the lint when the two disagree. The catch is
// that build-field-index.mjs and build-alias-shards.mjs rewrite their own
// manifest on every catalog change, while data/integrity.json was written only
// by build-data.mjs -- so adding a tile left two stale anchors behind, and the
// visitor-facing consequence is the integrity banner on every page load.
// Rather than ask a contributor to remember a hand edit (or, worse, to run the
// full data refresh, which rewrites shards that have nothing to do with a tile
// add), each generator re-stamps its own anchor here after it writes.
//
// `generated` is deliberately NOT touched: it stamps the data refresh, not the
// derived-index regeneration, and check-data-stamp-monotonic reads it.

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INTEGRITY = resolve(ROOT, "data", "integrity.json");

/**
 * Re-stamp data/integrity.json's entry for `folder` from the manifest on disk.
 * Returns true when the file was rewritten, false when it was already current.
 */
export async function stampIntegrityAnchor(folder) {
  const manifestPath = resolve(ROOT, "data", folder, "manifest.json");
  const hash = createHash("sha256").update(await readFile(manifestPath, "utf8"), "utf8").digest("hex");
  const raw = await readFile(INTEGRITY, "utf8");
  const json = JSON.parse(raw);
  json.manifests = json.manifests || {};
  if (json.manifests[folder] === hash) return false;
  json.manifests[folder] = hash;
  await writeFile(INTEGRITY, JSON.stringify(json, null, 2) + "\n", "utf8");
  return true;
}
