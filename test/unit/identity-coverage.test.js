// A long description used to buy coverage, and coverage outranks score.
//
// rankTools sorts on coverage before score, so a tile matching three query
// words anywhere beats one matching two on its name. "Anywhere" included the
// prose description, and descriptions here are long: "how many sheets of
// plywood for a 24x40 floor" returned Compressed Gas Cylinder Storage
// Separation FIRST. One sentence of its description warns that "a sheet of
// plywood" is the wrong barrier and another mentions "clear floor" -- three
// query words, from prose saying plywood is NOT the answer -- beating the tile
// literally named Wall / Roof Sheathing Panel and Nail Takeoff.
//
// The fix is a sort key above coverage: coverage counted over the tile's
// identity (name, id, alias, trade) and not its description. A description
// match still counts toward coverage and score; it just cannot outrank a tile
// the query actually names. Measured against all four harness ground truths --
// 21,025 aliases, 1,804 names, 1,804 ids, 5,403 asked -- every rate unchanged
// and all 63 miss rows byte-identical, so it costs nothing measurable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
const { normalizeQuery, rankTools } = await import(resolve(ROOT, "search-discovery.js"));
const aliases = JSON.parse(
  await readFile(resolve(ROOT, "data", "search", "aliases.json"), "utf8"),
).aliases;

function top(query, limit = 5) {
  const { tokens } = normalizeQuery(query);
  return rankTools(tokens, TOOLS, aliases, { limit }).map((r) => (r.tool ? r.tool.id : r.id));
}

test("a description-only match cannot outrank a tile the query names", () => {
  // The tile that regressed. Its own description is the evidence: it contains
  // "sheet of plywood" and "clear floor" and nothing else in the query.
  const cylinder = TOOLS.find((t) => t.id === "cylinder-storage-separation");
  assert.ok(cylinder, "cylinder-storage-separation must exist for this test to mean anything");
  assert.match(cylinder.desc, /sheet of plywood/i);
  assert.match(cylinder.desc, /floor/i);
  assert.ok(
    !/plywood|sheet|floor/i.test(cylinder.name),
    "the point is that none of those words are in its NAME",
  );

  for (const q of [
    "how many sheets of plywood for a 24x40 floor",
    "sheets plywood floor",
  ]) {
    assert.notEqual(top(q)[0], "cylinder-storage-separation", `"${q}" must not open with a gas-cylinder tile`);
  }
});

test("identity coverage does not cost the queries the ranker already answered", () => {
  // Spot checks from the README and the home view's example questions. These
  // are the phrasings the site itself teaches, so a ranking change that breaks
  // one is not a trade, it is a regression.
  assert.equal(top("voltage drop 120v 150 ft 12 awg 20a")[0], "voltage-drop");
  assert.equal(top("ohms law")[0], "ohms-law");
  assert.ok(top("how much concrete for a 10 by 10 slab 4 inches thick").includes("concrete"));
});
