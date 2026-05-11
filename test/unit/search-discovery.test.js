// v10 Phase D unit tests for search-discovery.js (spec-v10 §6).
//
// Pure-functional resolvers; no DOM. Asserts the runtime contract for
// resolveQuery, getCompanions, and matchAliasPrefix and exercises the
// real data/search/aliases.json + data/search/companions.json shards
// to catch a future shard edit that breaks the resolver shape.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveQuery,
  getCompanions,
  matchAliasPrefix,
} from "../../search-discovery.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadShards() {
  const aliases = JSON.parse(
    await readFile(resolve(ROOT, "data", "search", "aliases.json"), "utf8"),
  );
  const companions = JSON.parse(
    await readFile(resolve(ROOT, "data", "search", "companions.json"), "utf8"),
  );
  // Live tile id list for filter-out-renames behavior.
  const appText = await readFile(resolve(ROOT, "app.js"), "utf8");
  const ids = new Set();
  for (const m of appText.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"/g)) ids.add(m[1]);
  return { aliases: aliases.aliases, companions: companions.companions, ids };
}

test("resolveQuery returns exact tile-id match without alias indirection", () => {
  const ids = new Set(["ohms-law", "wire-ampacity"]);
  assert.deepEqual(resolveQuery("ohms-law", [], ids), { match: "ohms-law" });
  // Case-insensitive.
  assert.deepEqual(resolveQuery("Ohms-Law", [], ids), { match: "ohms-law" });
});

test("resolveQuery resolves an alias to its target", () => {
  const aliases = [
    { term: "amps", target: "breaker-sizing", kind: "industry" },
    { term: "perc test", target: "septic-drainfield", kind: "industry" },
  ];
  const ids = new Set(["breaker-sizing", "septic-drainfield"]);
  assert.deepEqual(resolveQuery("amps", aliases, ids), {
    match: "breaker-sizing",
    alias: "amps",
    kind: "industry",
  });
  assert.deepEqual(resolveQuery("PERC TEST", aliases, ids), {
    match: "septic-drainfield",
    alias: "perc test",
    kind: "industry",
  });
});

test("resolveQuery returns null on unknown query and bad input", () => {
  assert.equal(resolveQuery("nonsense", [], new Set()), null);
  assert.equal(resolveQuery("", [], new Set()), null);
  assert.equal(resolveQuery(null, [], new Set()), null);
  assert.equal(resolveQuery("ohms-law", null, new Set()), null);
});

test("resolveQuery filters out aliases that target a renamed tile", () => {
  const aliases = [
    { term: "amps", target: "renamed-tile", kind: "industry" },
  ];
  // Live ids do NOT include 'renamed-tile' -> alias must not resolve.
  const ids = new Set(["breaker-sizing"]);
  assert.equal(resolveQuery("amps", aliases, ids), null);
});

test("getCompanions returns up to 4 companions, filtering renames", () => {
  const companions = {
    "conduit-fill": ["wire-ampacity", "voltage-drop", "egc-sizing"],
    "manual-j-cooling": ["cfm-per-ton", "duct-sizing", "gone-tile", "outdoor-air-mix"],
  };
  const ids = new Set([
    "wire-ampacity",
    "voltage-drop",
    "egc-sizing",
    "cfm-per-ton",
    "duct-sizing",
    "outdoor-air-mix",
  ]);
  assert.deepEqual(
    getCompanions("conduit-fill", companions, ids),
    ["wire-ampacity", "voltage-drop", "egc-sizing"],
  );
  // gone-tile is filtered; the remaining three pass through in order.
  assert.deepEqual(
    getCompanions("manual-j-cooling", companions, ids),
    ["cfm-per-ton", "duct-sizing", "outdoor-air-mix"],
  );
});

test("getCompanions returns [] for unknown tile and bad input", () => {
  assert.deepEqual(getCompanions("not-real", {}, new Set()), []);
  assert.deepEqual(getCompanions("", {}, new Set()), []);
  assert.deepEqual(getCompanions(null, {}, new Set()), []);
  assert.deepEqual(getCompanions("ohms-law", null, new Set()), []);
});

test("getCompanions caps at 4 even if list is longer", () => {
  const companions = { x: ["a", "b", "c", "d", "e", "f"] };
  const ids = new Set(["a", "b", "c", "d", "e", "f"]);
  assert.deepEqual(getCompanions("x", companions, ids), ["a", "b", "c", "d"]);
});

test("getCompanions drops self-references and duplicates", () => {
  const companions = { x: ["x", "a", "a", "b"] };
  const ids = new Set(["a", "b", "x"]);
  assert.deepEqual(getCompanions("x", companions, ids), ["a", "b"]);
});

test("matchAliasPrefix returns prefix-matching aliases up to the limit", () => {
  const aliases = [
    { term: "amps", target: "breaker-sizing", kind: "industry" },
    { term: "amperage", target: "breaker-sizing", kind: "industry" },
    { term: "ampacity", target: "wire-ampacity", kind: "industry" },
    { term: "perc test", target: "septic-drainfield", kind: "industry" },
  ];
  const got = matchAliasPrefix("amp", aliases);
  assert.equal(got.length, 3);
  assert.deepEqual(
    got.map((r) => r.term),
    ["amps", "amperage", "ampacity"],
  );
  // Limit honored.
  const limited = matchAliasPrefix("amp", aliases, 1);
  assert.equal(limited.length, 1);
  assert.equal(limited[0].term, "amps");
});

test("matchAliasPrefix returns [] on empty / bad input", () => {
  assert.deepEqual(matchAliasPrefix("", [{ term: "amps", target: "x" }]), []);
  assert.deepEqual(matchAliasPrefix(null, []), []);
  assert.deepEqual(matchAliasPrefix("amp", null), []);
});

test("end-to-end: real shards resolve representative queries", async () => {
  const { aliases, companions, ids } = await loadShards();
  // Every alias target must be a real tile.
  for (const row of aliases) {
    assert.ok(ids.has(row.target), "alias target not a tile: " + row.target);
  }
  // Spot-check resolution on real data.
  const r1 = resolveQuery("amps", aliases, ids);
  assert.ok(r1 && r1.match === "breaker-sizing");
  const r2 = resolveQuery("yard math", aliases, ids);
  assert.ok(r2 && r2.match === "concrete");
  const r3 = resolveQuery("manual j", aliases, ids);
  assert.ok(r3 && r3.match === "manual-j-cooling");
  // Companions on real data.
  const c1 = getCompanions("conduit-fill", companions, ids);
  assert.ok(c1.length > 0 && c1.length <= 4);
  assert.ok(c1.includes("wire-ampacity"));
  // Bad source returns empty.
  assert.deepEqual(getCompanions("not-real-tile", companions, ids), []);
});
