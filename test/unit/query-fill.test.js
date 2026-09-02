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

// Eighteen inches is not the inches part of a feet-and-inches measurement, so
// "16 ft 16 in" is a run and a spacing, not one length. The tick form is
// unambiguous by construction and keeps folding whatever the number.
test("rewriteQuery refuses to fold an inches part of 12 or more", () => {
  assert.equal(rewriteQuery("16 ft 16 in"), "16 ft 16 in");
  assert.equal(rewriteQuery("20 ft 18 in"), "20 ft 18 in");
  assert.equal(rewriteQuery("8 ft 6 in"), "8.5 ft");
  assert.equal(rewriteQuery("8 ft 11 in"), "8.916666666666666 ft");
});

// The words a reader types to FIND a calculator are not the names of its
// fields. "joist hanger 20 ft 16 in" filled only the spacing, because Phase A
// burns a quantity whose preceding window names two fields and "joist" is a
// term of both "Joist-run width" and "Ends per joist" -- so the tool name
// vetoed the number. That is the phrasing this site teaches, and passing the
// tile's name in is what lets the fill ignore it.
test("a tile's own name does not veto the value beside it", async () => {
  const all = {};
  const dir = resolve(ROOT, "data", "fields");
  for (const n of await readdir(dir)) {
    if (n === "manifest.json") continue;
    Object.assign(all, JSON.parse(await readFile(resolve(dir, n), "utf8")).tiles);
  }
  const rows = all["joist-hanger-count"];
  assert.ok(rows, "joist-hanger-count should be indexed");
  const named = queryFill("joist hanger 20 ft 16 in", rows, { name: "Joist Hanger and Connector-Nail Count" }).filled;
  assert.equal(named.run_width_ft, "20");
  assert.equal(named.spacing_in, "16");
  // Values alone were never the problem, and still are not.
  const bare = queryFill("20 ft 16 in", rows).filled;
  assert.equal(bare.run_width_ft, "20");
  assert.equal(bare.spacing_in, "16");
});

// A select's option value can carry a number inside a larger token. The token
// fills its own select correctly, but the quantity scanner also read `16 in`
// out of the middle of `16in_box` and let that compete for a NUMBER field: on
// truss-capacity it put 1.33 ft -- 16 inches converted -- into the span and
// left the reader's real `40 ft` unmatched. Reversing the word order gave the
// right answer, which is the signature of a value winning on position.
test("a number inside a select option never fills a number field", async () => {
  const rows = [
    { d: "truss_model", l: "Truss model", k: "select", o: ["12in_box", "16in_box", "20p5in_ladder"] },
    { d: "span_ft", l: "Span", k: "number", u: "ft", r: 1 },
  ];
  for (const q of ["16in_box 40 ft", "40 ft 16in_box", "truss model 16in_box span 40 ft"]) {
    const filled = queryFill(q, rows).filled;
    assert.equal(filled.span_ft, "40", `span from ${JSON.stringify(q)}`);
    assert.equal(filled.truss_model, "16in_box");
  }
});

// ...but an ALL-NUMERIC option is a value the reader may well be typing, and
// Phase B0 exists to let a quantity fill that kind of select. Masking those
// would break it.
test("an all-numeric select option is still fillable from the question", async () => {
  const rows = [
    { d: "n", l: "Sample size n", k: "number" },
    { d: "confidence_pct", l: "Confidence level", k: "select", o: ["80", "90", "95", "98", "99"] },
  ];
  assert.equal(queryFill("confidence level 95 sample size n 100", rows).filled.confidence_pct, "95");
});

// The veto marks the quantity spent rather than deleting it. Phase A reads the
// words BETWEEN consecutive numbers to find a field name, so removing one
// widens the next window: deleting the `410` inside `R_410A` re-homed
// head-pressure-control's evaporator pressure and lost it.
test("vetoing an option's digits does not disturb the fields around it", async () => {
  const rows = [
    { d: "refrigerant", l: "Refrigerant", k: "select", o: ["R_410A", "R_32", "R_22"] },
    { d: "evaporator_psig", l: "Evaporator saturation pressure", k: "number", u: "psig" },
    { d: "valve_dp_psi", l: "Expansion valve required drop", k: "number", u: "psi" },
  ];
  const filled = queryFill(
    "Refrigerant R_410A, Evaporator saturation pressure 20 psig, Expansion valve required drop 100 psi",
    rows,
  ).filled;
  assert.equal(filled.refrigerant, "R_410A");
  assert.equal(filled.evaporator_psig, "20");
  assert.equal(filled.valve_dp_psi, "100");
});

// A `text` field is not a numeric field. tire-gearing wants a tire size
// written `P265/70R17` and tphc-window wants a clock time `10:30`; both sat in
// the number-row list, so the extractor handed them the first bare number it
// found and wrote "33" and "10" into them. Neither is a quantity and no
// conversion makes it one -- and the rule at the top of query-fill.js is that a
// wrong prefill is worse than no prefill. They are still named in the ask card.
test("a text field is never filled with a bare number", async () => {
  const all = {};
  const dir = resolve(ROOT, "data", "fields");
  for (const n of await readdir(dir)) {
    if (n === "manifest.json") continue;
    Object.assign(all, JSON.parse(await readFile(resolve(dir, n), "utf8")).tiles);
  }
  const tire = all["tire-gearing"];
  assert.ok(tire, "tire-gearing should be indexed");
  assert.equal(tire.find((r) => r.d === "original_size").k, "text");
  const t = queryFill(
    "Original tire size P265/70R17, New tire size 33x12.50R17, Axle ratio 3.73, Target cruise RPM 1800",
    tire, { name: "Tire Size Change" },
  ).filled;
  assert.ok(!("original_size" in t), "the size code is not guessed at from a number");
  assert.ok(!("new_size" in t));
  assert.equal(t.target_rpm, "1800", "a real number field on the same tile still fills");

  const tphc = all["tphc-window"];
  assert.ok(tphc, "tphc-window should be indexed");
  assert.equal(tphc.find((r) => r.d === "mark_time").k, "text");
  const w = queryFill(
    "Mark time 10:30, Window option cold_6, Ambient temperature 75, Product time constant tau 4 hr",
    tphc, { name: "TPHC Window" },
  ).filled;
  assert.ok(!("mark_time" in w), "a clock time is not read as a quantity");
  assert.equal(w.window_option, "cold_6", "the select on the same tile still fills");
});

// A bare number takes the NEXT WORD OF THE SENTENCE as its unit. When that word
// is not a unit we can read, the extractor refuses the value -- correctly, when
// the reader really did write a unit, because guessing there is how a
// temperature lands in a pressure field. But "asset cost 2000000 business use
// 100" is not a unit attempt: `business` is the next field's name. The tile
// settles it, so an unreadable word that is a term of one of this tile's own
// labels counts as prose rather than as a unit.
test("a bare number followed by another field's NAME is not treated as carrying a unit", () => {
  const rows = [
    num("cost", "Asset cost (USD)", "usd"),
    num("business_use_pct", "Business-use percent", "percent"),
    num("taxable_income", "Taxable income before the deduction (USD)", "usd"),
  ];
  const r = queryFill("asset cost 2000000 business use percent 100 taxable income 5000000", rows, {
    name: "Section 179 and Bonus Depreciation",
  });
  assert.equal(r.filled.cost, "2000000");
  assert.equal(r.filled.taxable_income, "5000000");
  assert.equal(r.filled.business_use_pct, "100");
});

test("money written the way people write money still reaches its field", () => {
  const rows = [num("cost", "Asset cost (USD)", "usd"), num("taxable_income", "Taxable income (USD)", "usd")];
  const r = queryFill("asset cost $2,000,000 taxable income $5,000,000", rows, { name: "Section 179" });
  assert.equal(r.filled.cost, "2000000");
  assert.equal(r.filled.taxable_income, "5000000");
});

// The refusal this widened must still hold: a unit the reader wrote and we
// cannot read, on a field that declares one, is still refused. `furlongs` is
// not a term of any label here, so nothing downgrades it to prose.
test("an unreadable unit on a unit-declaring field is still refused", () => {
  const rows = [num("length_ft", "Run length", "ft")];
  const r = queryFill("run length 40 furlongs", rows, { name: "Run" });
  assert.equal(r.filled.length_ft, undefined);
});

// labelTerms deliberately keeps a short label whole -- "AWG", "GPM", "Run" --
// so a field named by an acronym can be filled by naming it. windowTerms then
// dropped every query word under four characters, so the two rules never met:
// "apr 6.5" left the rate empty on loan-payment. A short query word is admitted
// only when it names a field on THIS tile, so the floor still drops connectives
// everywhere else.
test("a field named by a short word can be filled by naming it", () => {
  const rows = [
    num("principal", "Principal", "usd"),
    num("apr_percent", "APR (%)", "percent"),
  ];
  const r = queryFill("loan principal 300000 usd apr 6.5", rows, { name: "Loan Payment" });
  assert.equal(r.filled.principal, "300000");
  assert.equal(r.filled.apr_percent, "6.5");
});

// A short word that names nothing on this tile is still a connective and must
// not become a matching term.
test("a short query word that names no field on this tile stays dropped", () => {
  const rows = [num("length_ft", "Run length", "ft"), num("width_ft", "Width", "ft")];
  const r = queryFill("run length 40 ft by 20 ft", rows, { name: "Deck" });
  assert.equal(r.filled.length_ft, "40");
});

// 21 labels produced NO terms at all, which makes the field unfillable by name
// whatever the reader types: "Bar size" is three letters plus a stopword,
// "APR (%)" is an acronym a parenthetical unit hides from the whole-label rule.
// A label that would contribute nothing falls back to its lead word at a
// 3-character floor.
test("no label is left with zero matchable terms when it has a usable word", () => {
  assert.deepEqual([...labelTerms("Bar size")], ["bar"]);
  assert.deepEqual([...labelTerms("APR (%)")], ["apr"]);
  assert.deepEqual([...labelTerms("Run (in)")], ["run"]);
  // The fallback only ever runs for a label that had nothing; a normal label is
  // untouched and still yields its full-length terms.
  assert.ok(labelTerms("Length one-way (ft)").has("length"));
  assert.ok(!labelTerms("Length one-way (ft)").has("way"));
});
