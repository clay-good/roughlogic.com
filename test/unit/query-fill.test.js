// spec-v1340: the query extractor.
//
// The property under test is REFUSAL. Recall is nice; a wrong number reaching
// a real form on a job site is not recoverable. So most of what follows asserts
// that something does NOT get filled.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { queryFill, rewriteQuery, labelTerms } from "../../query-fill.js";
import { unitsCompatible, convertUnit, unitFamily } from "../../field-units.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const num = (d, l, u) => ({ d, l, k: "number", ...(u ? { u } : {}) });
const sel = (d, l, o) => ({ d, l, k: "select", o });

// --- the trade rewrites -----------------------------------------------------

test("rewriteQuery folds feet-and-inches into one decimal value", () => {
  assert.equal(rewriteQuery(`8'6"`), "8.5 ft");
  assert.equal(rewriteQuery("8 ft 6 in"), "8.5 ft");
  assert.equal(rewriteQuery(`8'6 1/2"`), "8.541666666666666 ft");
});

test("rewriteQuery reads mixed numbers and bare ticks", () => {
  assert.equal(rewriteQuery(`3-1/2"`), "3.5 in");
  assert.equal(rewriteQuery("3 1/2 in"), "3.5 in");
  assert.equal(rewriteQuery(`3/4"`), "0.75 in");
  assert.equal(rewriteQuery(`12"`), "12 in");
});

test("rewriteQuery normalizes the three wire-gauge spellings to one", () => {
  const want = "wire size 12 awg";
  assert.equal(rewriteQuery("12awg"), want);
  assert.equal(rewriteQuery("12 gauge"), want);
  // `#12` must not come out as "wire size wire size 12 awg".
  assert.equal(rewriteQuery("#12"), want);
});

test("rewriteQuery takes the higher leg of a dual voltage", () => {
  assert.equal(rewriteQuery("120/240v"), "voltage 240 v");
  assert.equal(rewriteQuery("120/208 volts"), "voltage 208 v");
});

test("rewriteQuery expands sq/cu compounds so the unit is readable", () => {
  assert.match(rewriteQuery("2400 square feet"), /2400 sq ft/);
  assert.match(rewriteQuery("5 cubic yards"), /5 cu yd/);
});

test("a bare c or f is a temperature ONLY in a temperature context", () => {
  // Hazen-Williams C and Manning's C are why field-units refuses a bare (C).
  // The same restraint applies to a query.
  assert.equal(rewriteQuery("hazen williams c 130"), "hazen williams c 130");
  assert.match(rewriteQuery("ambient temperature 100 c"), /100 degc/);
  // The degree-marked form is unambiguous and never needs the context.
  assert.match(rewriteQuery("100°c outside"), /100 degc/);
});

// --- terms ------------------------------------------------------------------

test("labelTerms strips the SOURCE's own numbers out of a label", () => {
  // "Bolt strength (psi, A307 = 36000)" must not contribute 36000 as a term,
  // or any query mentioning 36000 matches this field.
  const terms = labelTerms("Bolt strength A307 = 36000");
  assert.ok(terms.has("bolt"));
  assert.ok(terms.has("strength"));
  assert.ok(![...terms].some((t) => /\d/.test(t)));
});

test("labelTerms keeps a short label whole rather than erasing it", () => {
  // A 4-character floor would delete "AWG" entirely and leave the field
  // unfillable by name.
  assert.ok(labelTerms("AWG").has("awg"));
  assert.ok(labelTerms("Rise").has("rise"));
});

// --- units ------------------------------------------------------------------

test("air flow and liquid flow are never interconverted", () => {
  // Dimensionally identical, semantically different: a duct airflow must not
  // answer a pump question.
  assert.equal(unitsCompatible("cfm", "gpm"), false);
  assert.equal(convertUnit(400, "cfm", "gpm"), null);
  assert.notEqual(unitFamily("cfm"), unitFamily("gpm"));
});

test("real power and apparent power are never interconverted", () => {
  // They differ by power factor, which is the point of half this catalog.
  assert.equal(unitsCompatible("kva", "kw"), false);
  assert.equal(convertUnit(10, "kva", "kw"), null);
});

test("a value converts into the field's own unit", () => {
  const rows = [num("w", "Paving width", "ft")];
  assert.deepEqual(queryFill("paving width 144 in", rows).filled, { w: "12" });
});

test("same-unit values keep the reader's precision exactly", () => {
  // Round-tripping through a float truncated 0.015452412 to 0.015452.
  const rows = [num("d", "Allowable tip deflection", "in")];
  assert.deepEqual(queryFill("allowable tip deflection 0.015452412 in", rows).filled,
    { d: "0.015452412" });
});

test("a unit from another family is refused, not converted", () => {
  const rows = [num("t", "Ambient temperature", "degf")];
  assert.deepEqual(queryFill("ambient temperature 40 psi", rows).filled, {});
});

test("a unit we cannot read blocks a field that declares one", () => {
  // The reader attached a unit; we could not parse it. Guessing here is how a
  // temperature ends up in a pressure field.
  const rows = [num("a", "Length", "ft")];
  assert.deepEqual(queryFill("length 40 studs", rows).filled, {});
  // Prose that merely follows a number is not a unit and must not block.
  assert.deepEqual(queryFill("length 40 ft long", rows).filled, { a: "40" });
});

// --- the vetoes -------------------------------------------------------------

test("one fragment two fields could claim fills neither", () => {
  const rows = [num("a", "Length", "ft"), num("b", "Width", "ft")];
  assert.deepEqual(queryFill("40 ft by 20 ft", rows).filled, {});
});

test("naming the fields resolves what the veto refused", () => {
  const rows = [num("a", "Length", "ft"), num("b", "Width", "ft")];
  assert.deepEqual(queryFill("length 40 ft width 20 ft", rows).filled,
    { a: "40", b: "20" });
});

test("an exact unit match outranks a same-family one", () => {
  // "3 in" against a tile holding a depth in inches and a width in feet is not
  // genuinely ambiguous: the reader wrote inches.
  const rows = [num("d", "Compacted depth", "in"), num("w", "Paving width", "ft")];
  assert.equal(queryFill("asphalt 3 in deep", rows).filled.d, "3");
  assert.ok(!("w" in queryFill("asphalt 3 in deep", rows).filled));
});

test("a select competes for a name even though it is filled separately", () => {
  // lv-dc-drop: "System voltage 12" sits beside a "Device min voltage" field.
  // Excluding the select from the contest left the number field as the sole
  // match and it took the 12.
  const rows = [sel("sys", "System voltage", ["12", "24", "48"]), num("dev", "Device min voltage", "v")];
  assert.ok(!("dev" in queryFill("system voltage 12", rows).filled));
});

test("a literal select option survives the rewrites that would shred it", () => {
  // lumber-spans: the nominal-lumber rewrite turned "2x10" into
  // "nominal width 2 in nominal depth 10 in", and the injected 2 filled the
  // tile's tributary-width field.
  const rows = [sel("size", "Nominal size", ["2x4", "2x6", "2x10"]), num("trib", "Tributary width", "in")];
  const out = queryFill("nominal size 2x10, tributary width 16 in", rows);
  assert.equal(out.filled.size, "2x10");
  assert.equal(out.filled.trib, "16");
});

test("a bare number never fills a select whose options are numeric", () => {
  const rows = [sel("sch", "Pipe schedule", ["40", "80"])];
  assert.deepEqual(queryFill("40", rows).filled, {});
  assert.deepEqual(queryFill("pipe schedule 40", rows).filled, { sch: "40" });
});

test("negation never asserts the positive", () => {
  const rows = [sel("m", "Pipe material", ["copper", "pvc"])];
  assert.deepEqual(queryFill("not copper", rows).filled, {});
  assert.deepEqual(queryFill("no copper here", rows).filled, {});
  assert.deepEqual(queryFill("copper", rows).filled, { m: "copper" });
});

test("missing lists every unfilled field in declaration order", () => {
  const rows = [num("a", "Voltage", "v"), num("b", "Current", "a"), num("c", "Resistance", "ohm")];
  const out = queryFill("voltage 120", rows);
  assert.deepEqual(out.missing, ["b", "c"]);
});

test("an unmatched fragment is reported, not silently dropped", () => {
  const rows = [num("a", "Voltage", "v")];
  const out = queryFill("voltage 120 v and 47 gpm", rows);
  assert.deepEqual(out.filled, { a: "120" });
  assert.ok(out.unmatched.some((u) => u.includes("47")));
});

test("empty and malformed inputs never throw", () => {
  assert.deepEqual(queryFill("", []).filled, {});
  assert.deepEqual(queryFill(null, null).filled, {});
  assert.deepEqual(queryFill("anything", []).filled, {});
});

// --- the corpus -------------------------------------------------------------

test("every phrasing in test/fixtures/queries.txt extracts as recorded", async () => {
  const all = {};
  const dir = resolve(ROOT, "data", "fields");
  for (const n of await readdir(dir)) {
    if (n === "manifest.json") continue;
    Object.assign(all, JSON.parse(await readFile(resolve(dir, n), "utf8")).tiles);
  }
  const text = await readFile(resolve(ROOT, "test", "fixtures", "queries.txt"), "utf8");
  let checked = 0;
  for (const line of text.split("\n")) {
    const row = line.trim();
    if (!row || row.startsWith("#")) continue;
    const [id, query, expect] = row.split("|").map((s) => s.trim());
    const rows = all[id];
    assert.ok(rows, `queries.txt names an unindexed tile: ${id}`);
    const filled = queryFill(query, rows).filled;
    if (expect === "-") {
      assert.deepEqual(filled, {}, `${id} :: "${query}" should fill nothing`);
    } else {
      for (const pair of expect.split(",")) {
        const [k, v] = pair.split("=");
        assert.equal(filled[k], v, `${id} :: "${query}" -> ${k}`);
      }
    }
    checked++;
  }
  assert.ok(checked >= 8, `expected the corpus to carry real phrasings, got ${checked}`);
});
