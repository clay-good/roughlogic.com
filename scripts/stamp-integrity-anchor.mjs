// stamp-integrity-anchor.mjs -- re-stamp one data folder's manifest hash in
// BOTH hash registries.
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
// There are TWO registries and both have to move together. data/integrity.json
// is the runtime one, checked by check-integrity-coverage inside `npm run
// lint`. scripts/expected-hashes.json is the build one, checked by
// `npm run data:verify` -- a CI step that is NOT part of the lint chain, so a
// half-fix here is green locally and red on the first push. Stamping one and
// not the other is exactly the mistake this module exists to stop repeating.
//
// `generated` is deliberately NOT touched: it stamps the data refresh, not the
// derived-index regeneration, and check-data-stamp-monotonic reads it.

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INTEGRITY = resolve(ROOT, "data", "integrity.json");
const EXPECTED = resolve(ROOT, "scripts", "expected-hashes.json");

/**
 * Re-stamp both registries' entry for `data/<folder>/manifest.json` from the
 * file on disk. Returns the number of registries rewritten (0 when both were
 * already current).
 */
export async function stampIntegrityAnchor(folder) {
  const manifestPath = resolve(ROOT, "data", folder, "manifest.json");
  const hash = createHash("sha256").update(await readFile(manifestPath, "utf8"), "utf8").digest("hex");
  let wrote = 0;

  // Runtime anchor: integrity.js verifies the manifest against this before it
  // trusts any shard in the folder.
  const integrity = JSON.parse(await readFile(INTEGRITY, "utf8"));
  integrity.manifests = integrity.manifests || {};
  if (integrity.manifests[folder] !== hash) {
    integrity.manifests[folder] = hash;
    await writeFile(INTEGRITY, JSON.stringify(integrity, null, 2) + "\n", "utf8");
    wrote++;
  }

  // Build registry: `npm run data:verify` reads this, keyed relative to data/.
  const key = folder + "/manifest.json";
  const expected = JSON.parse(await readFile(EXPECTED, "utf8"));
  if (expected.hashes && Object.prototype.hasOwnProperty.call(expected.hashes, key)
      && expected.hashes[key] !== hash) {
    expected.hashes[key] = hash;
    await writeFile(EXPECTED, JSON.stringify(expected, null, 2) + "\n", "utf8");
    wrote++;
  }

  return wrote;
}
