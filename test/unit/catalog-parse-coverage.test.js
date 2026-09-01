// Four gates read tools-data.js with a regular expression that matches a fixed
// field order -- `{ id: "...", name: "...", group: "..."`. A tile written with
// its fields in another order is silently skipped, and a tile a gate skips is a
// tile that gate never checked: a sweep covering 1,700 of 1,804 reports exactly
// what a sweep covering all of them reports, which is nothing. Each parser now
// asserts it saw the whole registry.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { catalogSize } from "../../scripts/catalog-size.mjs";

const GUARDED = [
  "check-tile-meta.mjs",
  "check-related-tiles.mjs",
  "check-readme-counts.mjs",
  "check-shells.mjs",
  // Writes the count into llms.txt and .well-known/mcp.json, so a tile it
  // misses is a calculator no agent ever learns exists.
  "build.mjs",
];

test("catalogSize reports the module's own tile count", async () => {
  const { TOOLS } = await import("../../tools-data.js");
  assert.equal(await catalogSize(), TOOLS.length);
  assert.ok(TOOLS.length > 1000, "the catalog looks implausibly small");
});

for (const file of GUARDED) {
  test(`${file} asserts its parse covered the whole catalog`, async () => {
    const src = await readFile(new URL(`../../scripts/${file}`, import.meta.url), "utf8");
    assert.match(src, /assertFullCatalogParse\(/, `${file} parses tools-data.js without checking its own coverage`);
    assert.match(src, /["']\.\/catalog-size\.mjs["']/, `${file} does not pull in the shared guard`);
  });
}

test("every script that regex-parses tools-data.js is in the guarded list", async () => {
  // A parser added later must import the guard rather than joining the set
  // unnoticed. There is no allowlist here on purpose: an exemption written
  // once outlives the reason it was written for.
  const { readdir } = await import("node:fs/promises");
  const dir = new URL("../../scripts/", import.meta.url);
  const unguarded = [];
  for (const f of await readdir(dir)) {
    if (!f.endsWith(".mjs") || f === "catalog-size.mjs") continue;
    const src = await readFile(new URL(f, dir), "utf8");
    // Reads the registry as text AND matches the id/name/group field order.
    if (!/readFile\([^)]*"tools-data\.js"/.test(src)) continue;
    if (!/id:\s*\\s\*"\(\[a-z0-9-\]\+\)"|\{ id: "/.test(src)) continue;
    if (/assertFullCatalogParse\(/.test(src)) continue;
    unguarded.push(f);
  }
  assert.deepEqual(unguarded, [], `unguarded tools-data.js parsers: ${unguarded.join(", ")}`);
});
