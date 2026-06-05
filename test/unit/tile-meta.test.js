// v10 Phase B.2 unit tests for tile-meta.js (spec-v10 §4.2).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TILE_META, getTileMeta, listSimplifiedTiles, listFieldMeterTiles } from "../../tile-meta.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadTools() {
  const t = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const ids = new Set();
  const re = /\{\s*id:\s*"([a-z0-9-]+)"/g;
  for (const m of t.matchAll(re)) ids.add(m[1]);
  return ids;
}

test("TILE_META is keyed by tile id and every entry's id matches its key", () => {
  for (const [key, row] of Object.entries(TILE_META)) {
    assert.equal(row.id, key, "key/id mismatch for " + key);
  }
});

test("every TILE_META entry references a real tile in TOOLS", async () => {
  const ids = await loadTools();
  for (const key of Object.keys(TILE_META)) {
    assert.ok(ids.has(key), key + " is not a known tile id");
  }
});

test("simplified tiles have canonical limitation-banner copy", async () => {
  const lb = await import("../../limitation-banner.js");
  const lbIds = new Set(lb.listLimitationCopyIds());
  for (const id of listSimplifiedTiles()) {
    assert.ok(lbIds.has(id), "no canonical copy for simplified tile " + id);
  }
});

test("getTileMeta returns the entry for a known id and null otherwise", () => {
  assert.equal(getTileMeta("manual-j-cooling")?.simplified, true);
  assert.equal(getTileMeta("manual-j-cooling")?.group, "C");
  assert.equal(getTileMeta("hos-math")?.requires_field_meter, true);
  assert.equal(getTileMeta("not-a-real-tile"), null);
  assert.equal(getTileMeta(null), null);
  assert.equal(getTileMeta(""), null);
});

test("listSimplifiedTiles and listFieldMeterTiles return sorted disjoint sets", () => {
  const simp = listSimplifiedTiles();
  const meter = listFieldMeterTiles();
  assert.deepEqual(simp, [...simp].sort());
  assert.deepEqual(meter, [...meter].sort());
  // A tile may legitimately be both, but in this starter set they are
  // disjoint. If a future tile is both, drop this assertion.
  for (const id of simp) assert.ok(!meter.includes(id), id + " is in both lists");
});

test("every entry carries an a11y_verified_on ISO date (v10 §E.4)", () => {
  for (const [key, row] of Object.entries(TILE_META)) {
    assert.match(
      row.a11y_verified_on || "",
      /^\d{4}-\d{2}-\d{2}$/,
      key + ": a11y_verified_on must be YYYY-MM-DD",
    );
  }
});
