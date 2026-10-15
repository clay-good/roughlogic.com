// A tile whose only worked-example row is its own spec's example, recomputed,
// has no independent check: a spec and a tile that share an error agree with
// each other. docs/correctness.md ("Where Phase B's independence does not
// hold") promises that every such tile is held by a per-module reference suite
// to something its spec did not write. On 2026-10-15 six were not (tiles landed
// after the 2026-09-18 pass), and nothing noticed, so this holds the promise:
// each spec-only tile's compute must be called from a test/unit/calc-*.test.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("every spec-only tile is held by a per-module reference suite", async () => {
  const { rows } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const { COMPUTE_MAP } = await import("../fixtures/compute-map.js");
  const byTile = new Map();
  for (const r of rows) (byTile.get(r.tile_id) || byTile.set(r.tile_id, []).get(r.tile_id)).push(r);
  const specOnly = [...byTile].filter(([, rs]) => rs.every((r) =>
    /Project \(first-principles\)/.test(r.source_publisher || "") && /spec-v\d+ worked example, recomputed/.test(r.source_title || ""))).map(([id]) => id);
  const suites = readdirSync(resolve(ROOT, "test/unit")).filter((f) => /^calc-.*\.test\.js$/.test(f))
    .map((f) => readFileSync(resolve(ROOT, "test/unit", f), "utf8")).join("\n");
  const missing = specOnly.filter((id) => !COMPUTE_MAP[id] || !suites.includes(COMPUTE_MAP[id].fn));
  assert.ok(specOnly.length > 0, "the spec-only filter matched nothing; did the row titles change?");
  assert.deepEqual(missing, [], "spec-only tiles with no independent reference test");
});
