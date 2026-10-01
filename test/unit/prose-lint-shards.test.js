// The v6 prose cap (PROSE_LINT_THRESHOLD) used to run only inside
// build-data.mjs, which is the monthly Data Refresh. On 2026-09-25 two strings
// were hand-edited into shards past the cap; every local gate stayed green and
// the 2026-10-01 refresh failed. This runs the same scan over every shard on
// disk, so the cap holds on every `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { lintProseInShard } from "../../scripts/prose-lint-keys.mjs";

const DATA = resolve(import.meta.dirname, "..", "..", "data");
// Only the folders build-data.mjs writes are under the cap there; realestate,
// search and the other generated folders come from their own scripts.
const BUILT = new Set([...readFileSync(resolve(import.meta.dirname, "..", "..", "scripts", "build-data.mjs"), "utf8")
  .matchAll(/folder: "([a-z-]+)"/g)].map((m) => m[1]));

test("no data shard carries a prose string past the v6 cap", () => {
  assert.ok(BUILT.size >= 10, "expected to read build-data.mjs's folder list, got " + BUILT.size);
  const errors = [];
  for (const folder of readdirSync(DATA)) {
    if (!BUILT.has(folder)) continue;
    const dir = resolve(DATA, folder);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json") || file === "manifest.json") continue;
      errors.push(...lintProseInShard(folder, file, JSON.parse(readFileSync(resolve(dir, file), "utf8"))));
    }
  }
  assert.deepEqual(errors, [], errors.join("\n"));
});
