// Every tile in the catalog has the four things the "built, tested, hardened"
// claim rests on: a citation entry, a registered compute, at least one worked
// example the runner executes, and a bounds-fuzzer row naming its compute.
// The existing bounds-coverage lint walks the docs/derivations.md corpus, not
// the catalog, so on 2026-10-18 two tiles (slope, sales-tax) had no fuzzer row
// and nothing noticed; probing them found four silent wrong answers. This test
// walks tools-data.js itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

test("every catalog tile is cited, computed, exampled and fuzzed", async () => {
  const ids = [...read("tools-data.js").matchAll(/\{ id: "([a-z0-9-]+)", name:/g)].map((m) => m[1]);
  assert.ok(ids.length > 2000, `only ${ids.length} tiles parsed from tools-data.js`);
  const { COMPUTE_MAP } = await import("../fixtures/compute-map.js");
  const { CITATIONS } = await import("../../citations.js");
  const examples = new Set(JSON.parse(read("test/fixtures/worked-examples.json")).rows.map((r) => r.tile_id));
  const fuzz = read("test/unit/bounds-fuzzer.test.js");
  const gaps = [];
  for (const id of ids) {
    if (!CITATIONS[id]) gaps.push(id + ": no CITATIONS entry");
    const c = COMPUTE_MAP[id];
    if (!c) { gaps.push(id + ": no compute in COMPUTE_MAP"); continue; }
    if (!examples.has(id)) gaps.push(id + ": no worked-example row");
    if (!new RegExp("\\b" + c.fn + "\\b").test(fuzz)) gaps.push(id + ": no bounds-fuzzer row naming " + c.fn);
  }
  assert.deepEqual(gaps, []);
});
