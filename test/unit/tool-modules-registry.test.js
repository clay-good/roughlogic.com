// NOTHING IMPORTED THE REGISTRY THE BROWSER ACTUALLY USES.
//
// tool-modules.js holds the tile-id -> renderer-module table, 2,288 entries and
// the second of two shipped modules with no test mention at all. Four scripts
// depend on it -- check-wiring, check-dist, build-renderer-map and
// check-renderer-schema -- and every one of them parses the `declare()` calls
// as TEXT rather than importing the module, deliberately: it is a browser
// module and the scripts are standalone Node.
//
// That leaves one thing unchecked, and it is the thing that matters: whether
// what those parsers READ is what the browser RUNS. The module's own header
// says the call shape is load-bearing and that none of the three arguments may
// be computed -- but nothing held the evaluated table against the parsed one,
// so a `declare()` written in a form the regex reads differently would leave
// every gate checking a table the page does not use.
//
// It also leaves the generated fixture ungated, which is the practical risk:
// test/fixtures/renderer-map.js is what every sweep iterating RENDERER_MAP
// reads, and until 2026-11-26 build-renderer-map.mjs had no `--check` and was
// the only one of the seven generated fixtures missing one. A tile added to
// tool-modules.js without regenerating would have been SILENTLY SKIPPED by all
// of them, which is a sweep going quietly green over one tile fewer.
import { test } from "node:test";
import assert from "node:assert/strict";

test("the evaluated renderer registry is exactly what the text parsers derive", async () => {
  const { TOOL_MODULES } = await import("../../tool-modules.js");
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");

  const evaluated = Object.keys(TOOL_MODULES);
  const parsed = Object.keys(RENDERER_MAP);
  assert.ok(evaluated.length > 2000, `the registry must hold the catalog (${evaluated.length} entries)`);
  assert.deepEqual(
    evaluated.slice().sort(), parsed.slice().sort(),
    "every id the module evaluates to must be an id the parsers found, and the other way about",
  );

  // And the same module and export for each, allowing only for the path
  // rewriting the generator documents (root-relative "./calc-x.js" becomes
  // "../../calc-x.js", because the fixture sits in test/fixtures/).
  const wrong = [];
  for (const id of evaluated) {
    const live = TOOL_MODULES[id];
    const fixture = RENDERER_MAP[id];
    const livePath = String(live.path).replace(/^\.\//, "");
    const fixturePath = String(fixture.module).replace(/^(\.\.\/)+/, "");
    if (livePath !== fixturePath || live.exportName !== fixture.exportName) {
      wrong.push(`${id}: module says ${JSON.stringify(live)}, fixture says ${JSON.stringify(fixture)}`);
    }
  }
  assert.deepEqual(wrong, [], "a parsed entry that disagrees with the evaluated one means the gates check a table the page does not use");
});

// `declare` assigns -- `map[id] = { path, exportName }` -- so a tile id written
// into two calls would silently take the LAST, and the page would load a
// renderer nobody intended. build-renderer-map refuses a duplicate, but only
// over the text; this holds it over the evaluated table too, by counting the
// ids in the source and requiring the map to have lost none of them.
test("no tile id is declared twice, so no renderer silently wins", async () => {
  const { readFileSync } = await import("node:fs");
  const { TOOL_MODULES } = await import("../../tool-modules.js");
  const src = readFileSync(new URL("../../tool-modules.js", import.meta.url), "utf8");

  const declared = [];
  const call = /declare\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/g;
  for (const m of src.matchAll(call)) {
    // Strip line comments first: the table is grouped by "// v2" markers and a
    // commented-out id must not count as declared.
    const body = m[3].replace(/\/\/[^\n]*/g, "");
    for (const idMatch of body.matchAll(/"([a-z0-9][a-z0-9-]*)"/g)) declared.push(idMatch[1]);
  }
  assert.ok(declared.length > 2000, `the source scan must find the table (found ${declared.length})`);

  const seen = new Map();
  const duplicates = [];
  for (const id of declared) {
    seen.set(id, (seen.get(id) || 0) + 1);
    if (seen.get(id) === 2) duplicates.push(id);
  }
  assert.deepEqual(duplicates, [], "a twice-declared id loses its first renderer without a word");
  // Which is the same as saying the table lost nothing on the way to the map.
  assert.equal(Object.keys(TOOL_MODULES).length, declared.length,
    "every declared id survives into the evaluated table");
});

// Every entry has to resolve to something real, checked by importing it rather
// than by reading the path: a renderer registry that does not carry the id is a
// tile that cannot open.
test("every registry entry resolves to a renderer that carries its tile", async () => {
  const { TOOL_MODULES } = await import("../../tool-modules.js");
  const ROOT = new URL("../../", import.meta.url);
  const missing = [];
  const cache = new Map();
  for (const [id, { path, exportName }] of Object.entries(TOOL_MODULES)) {
    const file = String(path).replace(/^\.\//, "");
    if (!cache.has(file)) {
      try { cache.set(file, await import(new URL(file, ROOT).href)); }
      catch (e) { cache.set(file, { __error: e.message }); }
    }
    const ns = cache.get(file);
    if (ns.__error) { missing.push(`${id}: ${file} did not import (${ns.__error})`); continue; }
    const registry = ns[exportName];
    if (!registry || typeof registry !== "object") { missing.push(`${id}: ${file} has no ${exportName}`); continue; }
    if (typeof registry[id] !== "function") missing.push(`${id}: ${exportName} in ${file} carries no renderer for it`);
  }
  assert.deepEqual(missing.slice(0, 20), [], `a registry entry that does not resolve is a tile that cannot open (${missing.length} in all)`);
});
