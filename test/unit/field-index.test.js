// spec-v1339: the field index and the unit vocabulary it is built on.
//
// The safety property under test is REFUSAL. This catalog writes units inside
// its labels, in a trailing parenthesis, and that parenthesis is only
// sometimes a unit -- a survey of every label found 1,107 distinct trailing
// tokens, with clean units at the head and guidance prose at the tail. The
// extractor that reads this index will fill a calculator's inputs from a typed
// question, so a token misread as a unit becomes a wrong number on a job site.
// Every "resolves to null" assertion below is a case the parser must decline.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalUnit, unitFromLabel, labelLead } from "../../field-units.js";
import { bucketFor, allBuckets, SPLIT_GROUPS } from "../../field-bucket.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIELDS_DIR = resolve(ROOT, "data", "fields");

test("canonicalUnit folds the spellings a label and a person each use", () => {
  for (const spelling of ["ft", "FT", "foot", "feet", " Feet "]) {
    assert.equal(canonicalUnit(spelling), "ft", spelling);
  }
  for (const spelling of ["lb", "lbs", "pounds"]) assert.equal(canonicalUnit(spelling), "lb");
  for (const spelling of ["%", "percent", "pct"]) assert.equal(canonicalUnit(spelling), "pct");
  for (const spelling of ["ft²", "ft2", "sq ft", "square feet"]) assert.equal(canonicalUnit(spelling), "ft2");
  for (const spelling of ["amp", "amps", "A"]) assert.equal(canonicalUnit(spelling), "a");
});

test("canonicalUnit refuses anything it does not know", () => {
  for (const junk of ["", null, undefined, "NW", "0-1", "widgets", "A307 = 36000"]) {
    assert.equal(canonicalUnit(junk), null, String(junk));
  }
});

test("a bare C or F is never a temperature", () => {
  // "(C)" in this catalog is as often a coefficient -- Hazen-Williams C,
  // Manning's C -- as it is Celsius. Reading it as a temperature would put a
  // pipe roughness value into a temperature field.
  assert.equal(unitFromLabel("Hazen-Williams roughness (C)"), null);
  assert.equal(unitFromLabel("Coefficient (F)"), null);
  // The degree-marked spellings are unambiguous and do resolve.
  assert.equal(unitFromLabel("Ambient (°F)"), "degf");
  assert.equal(unitFromLabel("Supply air (°C)"), "degc");
});

test("unitFromLabel keeps the first delimited segment of the parenthesis", () => {
  assert.equal(unitFromLabel("Length one-way (ft)"), "ft");
  assert.equal(unitFromLabel("Design flow (gpm, optional)"), "gpm");
  assert.equal(unitFromLabel("Slab thickness (in; 0 = none)"), "in");
  assert.equal(unitFromLabel("Bolt strength (psi, A307 = 36000)"), "psi");
  assert.equal(unitFromLabel("Cost ($, optional)"), "usd");
});

test("unitFromLabel declines a parenthesis that is guidance, not a unit", () => {
  // Real labels from the catalog. Each has a trailing parenthesis; none of
  // them names a unit, and inventing one would be a guess.
  for (const label of [
    "Concrete weight factor (1.0 NW, 0.75 LW)",
    "Load factor (0-1)",
    "Species factor (0.50 DF-L, 0.42 SPF)",
    "Bearing count (1 single, 2 double)",
    "Solve mode (leave 0 to solve)",
    "Plain label with no parenthesis",
  ]) {
    assert.equal(unitFromLabel(label), null, label);
  }
});

test("only a parenthesis that CLOSES the label is read as a unit suffix", () => {
  // "Rise (in) per foot" has a parenthetical, but it is mid-sentence: the
  // label's unit is not "in", it is in/ft, and the pattern must not claim it.
  assert.equal(unitFromLabel("Rise (in) per foot"), null);
});

test("labelLead strips the unit and keeps the human text", () => {
  assert.equal(labelLead("Length one-way (ft)"), "Length one-way");
  assert.equal(labelLead("Slab thickness (in; 0 = none)"), "Slab thickness");
  assert.equal(labelLead("Plain label"), "Plain label");
  // A label that is nothing but a parenthetical keeps its text: stripping it
  // would leave the matcher no terms at all, which is worse than a odd lead.
  assert.equal(labelLead("(ft)"), "(ft)");
  assert.equal(labelLead(""), "");
});

test("bucketFor is stable and agrees with allBuckets", () => {
  // An unsplit group is named for itself.
  assert.equal(bucketFor("K", "belt-length"), "k");
  assert.equal(bucketFor("k", "belt-length"), "k");
  // A split group divides alphabetically on the tile id, so adding a tile
  // never relocates an existing one.
  assert.equal(SPLIT_GROUPS.e, 2);
  assert.equal(bucketFor("E", "ampacity"), "e-1");
  assert.equal(bucketFor("E", "voltage-drop"), "e-2");
  // A tile id that does not start with a letter lands in the first shard,
  // where an alphabetical listing would put it.
  assert.equal(bucketFor("E", "3-phase-load"), "e-1");
  const all = allBuckets(["E", "K", "E"]);
  assert.deepEqual(all, ["e-1", "e-2", "k"]);
});

test("every shard on disk parses, is well-formed, and lands in its own bucket", async () => {
  const { TOOLS } = await import("../../tools-data.js");
  const groupOf = new Map(TOOLS.map((t) => [t.id, t.group]));
  const files = (await readdir(FIELDS_DIR)).filter((f) => f.endsWith(".json") && f !== "manifest.json");
  assert.ok(files.length >= 20, "expected one shard per tile group");

  let tiles = 0, fields = 0;
  for (const file of files) {
    const bucket = file.slice(0, -5);
    const shard = JSON.parse(await readFile(resolve(FIELDS_DIR, file), "utf8"));
    assert.equal(shard.version, 1, file);
    assert.equal(shard.bucket, bucket, file);
    for (const [id, rows] of Object.entries(shard.tiles)) {
      tiles++;
      // The writer's bucket rule and the reader's must be the same rule.
      assert.equal(bucketFor(groupOf.get(id), id), bucket, `${id} is in the wrong shard`);
      assert.ok(Array.isArray(rows) && rows.length, `${id} has no rows`);
      const seen = new Set();
      for (const r of rows) {
        fields++;
        assert.equal(typeof r.d, "string", `${id} row missing key`);
        assert.ok(r.d, `${id} row has an empty key`);
        assert.ok(!seen.has(r.d), `${id} declares "${r.d}" twice`);
        seen.add(r.d);
        // A row with no human label is what this index exists to exclude.
        assert.equal(typeof r.l, "string");
        assert.ok(r.l.trim(), `${id}.${r.d} has an empty label lead`);
        if (r.u !== undefined) {
          assert.equal(canonicalUnit(r.u), r.u, `${id}.${r.d} unit "${r.u}" is not canonical`);
        }
        if (r.k !== undefined) {
          assert.ok(["number", "select", "checkbox", "text", "textarea"].includes(r.k), `${id}.${r.d} kind ${r.k}`);
        }
        // A select's allowed values are the only thing that makes an enum
        // fillable; an empty option list would silently accept anything.
        if (r.o !== undefined) {
          assert.equal(r.k, "select", `${id}.${r.d} carries options but is not a select`);
          assert.ok(Array.isArray(r.o) && r.o.length, `${id}.${r.d} has an empty option list`);
          for (const v of r.o) assert.equal(typeof v, "string");
        }
      }
    }
  }
  assert.ok(tiles > 1200, `expected the index to cover most of the catalog, got ${tiles}`);
  assert.ok(fields > 5000, `expected 5,000+ field descriptors, got ${fields}`);
});

test("the manifest lists every shard and records a hash for each", async () => {
  const manifest = JSON.parse(await readFile(resolve(FIELDS_DIR, "manifest.json"), "utf8"));
  const onDisk = (await readdir(FIELDS_DIR)).filter((f) => f.endsWith(".json") && f !== "manifest.json").sort();
  assert.deepEqual(manifest.shards.map((s) => s.file).sort(), onDisk);
  for (const shard of manifest.shards) {
    assert.ok(manifest.hashes[shard.file], `no recorded hash for ${shard.file}`);
    // The cap is a build failure, not a warning; assert it holds on disk too.
    assert.ok(shard.gzip_size_bytes <= 24 * 1024, `${shard.file} is over the 24 KB gzip cap`);
  }
  assert.match(manifest.asOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(manifest.edition && manifest.edition.length > 0);
});

// --- spec-v1342: derived requiredness ---------------------------------------
//
// The registry carries no `required` flag and the obvious proxy -- a field with
// no default -- is a guess: plenty of fields default to 0 precisely because 0
// means absent. It is derived instead, by blanking one field at a time and
// re-running the tile's own worked example. These pin the three rules that
// derivation had to learn, each of which was wrong in a different direction on
// the way here.

test("requiredness simulates an EMPTY BOX, not an omitted key", async () => {
  // asphalt-tonnage's compute has a JS default for density, so omitting the
  // key answered fine and the field looked optional -- while the real page,
  // which sends Number("") || 0, showed "Density must be positive."
  const { TOOLS } = await import("../../tools-data.js");
  const rows = await rowsFor("asphalt-tonnage", TOOLS);
  const required = rows.filter((r) => r.r).map((r) => r.d);
  assert.ok(required.includes("density_pcf"), "mix density is required");
  assert.ok(required.includes("area_ft2"));
  assert.ok(required.includes("depth_in"));
});

test("a field the example declares ABSENT is never required", async () => {
  // ohms-law's example passes `R: null` and `P: null` -- that is how it says
  // "solve for these". Marking them required would have the ask card demand
  // the very number the reader came for.
  const { TOOLS } = await import("../../tools-data.js");
  const rows = await rowsFor("ohms-law", TOOLS);
  const required = rows.filter((r) => r.r).map((r) => r.d).sort();
  assert.deepEqual(required, ["I", "V"]);
});

test("a value that collapses an answer to zero is required", async () => {
  // voltage-drop with no length answers a confident "0 V drop, 0%", which
  // looks exactly like an answer. `phase` is genuinely optional -- it defaults
  // to single and the tile still answers.
  const { TOOLS } = await import("../../tools-data.js");
  const rows = await rowsFor("voltage-drop", TOOLS);
  const required = rows.filter((r) => r.r).map((r) => r.d);
  assert.ok(required.includes("length_ft"), "length is required");
  assert.ok(required.includes("current_A"), "current is required");
  assert.ok(!required.includes("phase"), "phase defaults and must not be asked for");
});

test("requiredness is a subset of the indexed fields, never invented", async () => {
  const dir = resolve(ROOT, "data", "fields");
  let required = 0, total = 0;
  for (const file of await readdir(dir)) {
    if (file === "manifest.json") continue;
    const shard = JSON.parse(await readFile(resolve(dir, file), "utf8"));
    for (const rows of Object.values(shard.tiles)) {
      for (const r of rows) {
        total++;
        if (r.r === undefined) continue;
        assert.equal(r.r, 1, "the required flag is 1 or absent, never 0 or a string");
        required++;
      }
    }
  }
  assert.ok(required > 0 && required < total, `required ${required} of ${total}`);
});

async function rowsFor(id, TOOLS) {
  const tool = TOOLS.find((t) => t.id === id);
  assert.ok(tool, `${id} is in the catalog`);
  const bucket = bucketFor(tool.group, id);
  const shard = JSON.parse(await readFile(resolve(ROOT, "data", "fields", bucket + ".json"), "utf8"));
  assert.ok(shard.tiles[id], `${id} is indexed`);
  return shard.tiles[id];
}
