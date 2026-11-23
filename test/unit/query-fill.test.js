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

// A label that yields no terms is a field no reader can name, so the count is a
// ratchet rather than an observation. It was 21 before the lead-word fallback
// and is 9 after. The 9 that remain are irreducible: seven are a single letter
// or symbol with a parenthetical unit -- E (psi), I (in4), K, Ra, R0, D30, D60 --
// which no query word under the four-character floor could match anyway, and two
// are select labels built entirely from stopwords ("Which option", "Input
// mode"). A new tile must not add a tenth without a deliberate decision.
test("no new field label is left unnameable (ratchet: 9)", async () => {
  const { BESPOKE_SCHEMAS } = await import("../fixtures/bespoke-schemas.js");
  const empty = [];
  for (const [tile, schema] of Object.entries(BESPOKE_SCHEMAS)) {
    if (!schema || !Array.isArray(schema.inputs)) continue;
    for (const f of schema.inputs) {
      if (!f || !f.label || f.kind === "checkbox") continue;
      if (labelTerms(f.label).size === 0) empty.push(tile + " :: " + f.label);
    }
  }
  assert.ok(
    empty.length <= 9,
    "labels with no matchable term rose to " + empty.length + ":\n  " + empty.join("\n  "),
  );
});

// "1,250 ft" offered the AWG option "1" as a second reading beside "12 awg", so the
// gauge filled neither way and the door answered MISSING_INPUTS (fixed 2026-11-15).
test("query-fill: a grouped number is one number, not an option token", () => {
  const rows = [
    { d: "awg", l: "AWG", k: "select", o: ["18", "16", "14", "12", "10", "8", "6", "4", "2", "1", "1/0"], r: 1 },
    { d: "length_ft", l: "Length one-way", k: "number", u: "ft", r: 1 },
    { d: "current_A", l: "Current", k: "number", u: "a", r: 1 },
  ];
  const plain = queryFill("voltage drop 1250 ft 12 awg 20a", rows, { name: "Voltage Drop" }).filled;
  const grouped = queryFill("voltage drop 1,250 ft 12 awg 20a", rows, { name: "Voltage Drop" }).filled;
  assert.deepEqual(grouped, plain);
  assert.equal(grouped.awg, "12");
  assert.equal(grouped.length_ft, "1250");
});

// 2026-11-15: a number naming two fields goes to the one whose label words are exactly
// the words written, and only then; months are a unit; "$250,000" is dollars.
test("query-fill: an exact label wins a two-field tie, and only an exact one", () => {
  const rows = [
    { d: "principal", l: "Principal", k: "number", u: "usd", r: 1 },
    { d: "annual_rate_pct", l: "Annual rate", k: "number", u: "pct", r: 1 },
    { d: "term_months", l: "Term", k: "number", u: "mo", r: 1 },
    { d: "extra_principal", l: "Extra principal per month", k: "number", u: "usd" },
  ];
  const a = queryFill("loan principal $250,000 at 6.5% for 30 years", rows, { name: "Loan Amortization" }).filled;
  assert.equal(Number(a.principal), 250000);
  assert.equal(Number(a.term_months), 360);
  assert.equal(a.extra_principal, undefined);
  // "extra principal" names neither field exactly: refused, not guessed.
  const b = queryFill("loan extra principal 100", rows, { name: "Loan Amortization" }).filled;
  assert.equal(b.principal, undefined);
  // A word inside a written select option is the option, not a field name.
  const db = [
    { d: "mode", l: "Mode", k: "select", o: ["power-ratio", "voltage-ratio"], r: 1 },
    { d: "p1", l: "Reference power p1", k: "number", u: "w", r: 1 },
    { d: "p2", l: "Power p2", k: "number", u: "w", r: 1 },
  ];
  const c = queryFill("power-ratio, 1 w, 2 w", db, { name: "Decibel Converter" }).filled;
  assert.notEqual(c.p2, "1");
});

// 2026-11-15: a calculator-name word beside a number is a field name when the
// question says it more often than the name does.
test("query-fill: a name word repeated beside a value names the field", () => {
  const rows = [
    { d: "ceiling_ft", l: "Ceiling height", k: "number", u: "ft", r: 1 },
    { d: "ear_ft", l: "Listener ear height", k: "number", u: "ft", r: 1 },
  ];
  const f = queryFill("ceiling speaker coverage, ceiling height 9 ft, listener ear height 4 ft", rows, { name: "Ceiling Speaker Coverage" }).filled;
  assert.equal(Number(f.ceiling_ft), 9);
  assert.equal(Number(f.ear_ft), 4);
});

// 2026-11-16: a word written only as a select's option is that option, not a
// field name, and TPI / psia / acres / Hz labels now declare their units.
test("query-fill: an option word does not name a number field", () => {
  const rows = [
    sel("thread_standard", "Thread standard", ["inch", "metric"]),
    num("major_dia_in", "Major (nominal) diameter"),
    num("tpi", "Threads per inch", "tpi"),
  ];
  const f = queryFill("inch, 0.25, 20 tpi", rows).filled;
  assert.equal(f.thread_standard, "inch");
  assert.equal(Number(f.tpi), 20);
  assert.notEqual(f.tpi, "0.25");
  // Written as part of the field's name, the other words still match.
  assert.equal(Number(queryFill("threads per inch 13", rows).filled.tpi), 13);
});

test("field-units: newer label units resolve, and absolute pressure stays apart", async () => {
  const { unitFromLabel } = await import("../../field-units.js");
  assert.equal(unitFromLabel("Threads per inch (TPI, inch)"), "tpi");
  assert.equal(unitFromLabel("Total static pressure (in. w.c.)"), "inwc");
  assert.equal(unitFromLabel("Field area (acres; optional)"), "acre");
  assert.equal(unitFromLabel("Room volume (ft^3, optional)"), "ft3");
  assert.equal(unitFromLabel("Suction pressure (psia)"), "psia");
  assert.equal(unitsCompatible("psig", "psia"), false);
  assert.ok(Math.abs(convertUnit(1, "acre", "ft2") - 43560) < 1e-6);
  assert.ok(Math.abs(convertUnit(1, "km", "ft") - 3280.8399) < 1e-3);
  assert.equal(unitFamily("hz"), "frequency");
});

// 2026-11-16: "300 gal" is the tank, not the Product unit option "gal"; and an
// option word's stem ("thicknes") does not name "Material thickness" either.
test("query-fill: a number's unit is not a select choice, and option stems name nothing", () => {
  const tank = [
    num("tank_gal", "Tank capacity", "gal"),
    sel("product_unit", "Product unit", ["fl_oz", "pt", "qt", "gal", "oz", "lb"]),
  ];
  const t = queryFill("300 gal, product unit pt", tank).filled;
  assert.equal(Number(t.tank_gal), 300);
  assert.equal(t.product_unit, "pt");
  assert.notEqual(queryFill("300 gal", tank).filled.product_unit, "gal");
  const punch = [
    sel("solve_for", "Solve for", ["thickness", "diameter"]),
    num("diameter_in", "Hole diameter", "in"),
    num("thickness_in", "Material thickness", "in"),
  ];
  const p = queryFill("thickness, 0.5 in, 0.25 in", punch).filled;
  assert.equal(p.solve_for, "thickness");
  assert.equal(p.thickness_in, undefined);
  assert.equal(p.diameter_in, undefined);
});

// 2026-11-16: "a 40 ft wall 16 on center" names the wall after its 40 ft; the
// bare 16 must not take Wall length by reading "wall" forward.
test("query-fill: a bare number does not take a field named just after a quantity in its unit", () => {
  const rows = [
    num("wall_length_ft", "Wall length", "ft"),
    num("stud_oc_in", "Spacing on center", "in"),
    num("studs_per_corner", "Extra studs per corner"),
    sel("plate_stock_ft", "Plate stock length", ["8", "10", "12", "14", "16", "18", "20"]),
  ];
  const f = queryFill("how many studs for a 40 ft wall 16 on center", rows).filled;
  assert.equal(Number(f.wall_length_ft), 40);
  assert.equal(f.stud_oc_in, undefined);
  // Name-then-value still works when the number carries the unit.
  assert.equal(Number(queryFill("wall length 40 ft", rows).filled.wall_length_ft), 40);
});

// 2026-11-16: words right after a measured quantity describe IT ("100 ft of
// fence", "8 ft apart", "4 ft deep"), and are not the next number's name.
test("query-fill: value-then-name phrases bind backward, or not at all", () => {
  const fence = [num("length_ft", "Fence length", "ft"), num("post_spacing_ft", "Post spacing", "ft")];
  const f = queryFill("fence posts for 100 ft of fence 8 ft apart", fence).filled;
  assert.equal(Number(f.length_ft), 100);
  assert.equal(Number(f.post_spacing_ft), 8);
  const wall = [num("wall_length_ft", "Wall length", "ft"), num("stud_oc_in", "Spacing on center", "in")];
  const w = queryFill("lumber for a 12 ft wall 8 ft tall", wall).filled;
  assert.equal(Number(w.wall_length_ft), 12);
  assert.equal(w.stud_oc_in, undefined, "a height the tile does not take goes nowhere");
  // Label-first phrasing is unchanged.
  const room = [num("length_ft", "Length", "ft"), num("width_ft", "Width", "ft")];
  const r = queryFill("length 40 ft width 20 ft", room).filled;
  assert.deepEqual([Number(r.length_ft), Number(r.width_ft)], [40, 20]);
  // A post word on a non-length (a temperature) is left to the usual rules.
  const t = [num("setpoint_f", "Setpoint", "degf"), num("limit_f", "High limit", "degf")];
  assert.equal(Number(queryFill("setpoint 70 °f high limit 80 °f", t).filled.limit_f), 80);
});

// 2026-11-16: plan dimensions ("a 10 by 12 floor") and square items ("12 inch tile").
test("query-fill: plan dimensions fill length and width, or a plan area, never a wall area", () => {
  const slab = [num("length_ft", "Length", "ft"), num("width_ft", "Width", "ft"), num("thickness_in", "Thickness", "in")];
  const s = queryFill("concrete for a 20 by 30 slab 4 inches thick", slab).filled;
  assert.deepEqual([Number(s.length_ft), Number(s.width_ft), Number(s.thickness_in)], [20, 30, 4]);
  const area = [num("area_ft2", "Area", "ft2"), num("tile_width_in", "Tile width", "in"), num("tile_height_in", "Tile height", "in"), num("tile_thickness_in", "Tile thickness", "in")];
  const t = queryFill("how many tiles for a 10 by 12 floor 12 inch tile", area).filled;
  assert.deepEqual([Number(t.area_ft2), Number(t.tile_width_in), Number(t.tile_height_in)], [120, 12, 12]);
  assert.equal(t.tile_thickness_in, undefined);
  // A room may be about its walls; lumber is lumber.
  assert.equal(queryFill("paint for a 12 by 12 room 8 ft walls", [num("area_ft2", "Area", "ft2")]).filled.area_ft2, undefined);
  assert.equal(queryFill("2 by 4 studs", slab).filled.length_ft, undefined);
});

// 2026-11-16: a unit names a unitless dropdown's quantity; roof pitch; counts with their noun.
test("query-fill: hp and volts fill their dropdowns, pitch and counts read as written", () => {
  const motor = [sel("hp", "Horsepower", ["0.5", "1", "2", "5", "10"]), sel("voltage", "Voltage", ["115", "230", "208", "460"]), sel("phase", "Phase", ["single", "three"])];
  assert.deepEqual(queryFill("amps for a 5 hp motor 230v single phase", motor).filled, { hp: "5", voltage: "230", phase: "single" });
  const rafter = [num("horizontal_span_ft", "Horizontal run", "ft"), num("pitch_rise_per_12", "Pitch")];
  assert.equal(queryFill("rafter 12 ft run 6/12 pitch", rafter).filled.pitch_rise_per_12, "6");
  const rp = [num("rise", "Rise", "in"), num("run", "Run", "in")];
  assert.deepEqual(queryFill("roof pitch 4 in 12", rp).filled, { rise: "4", run: "12" });
  const wall = [num("corners", "Corners", "count"), num("studs_per_corner", "Extra studs per corner"), num("openings", "Door and window openings", "count"), num("studs_per_opening", "Extra studs per opening")];
  const w = queryFill("2 corners 3 openings", wall).filled;
  assert.deepEqual([w.corners, w.openings, w.studs_per_corner], ["2", "3", undefined]);
  // A conversion nobody named is flagged for the door.
  const r = queryFill("200 ft", [num("dbh_in", "Trunk diameter", "in")]);
  assert.deepEqual(r.converted, ["dbh_in"]);
});

// 2026-11-16: a label that IS a unit word declares it -- an allowlist, since
// bare letters are usually variables (G gust factor, Km, a coefficient).
test("field-units: whole-label units are an allowlist", async () => {
  const { unitFromLabel } = await import("../../field-units.js");
  assert.equal(unitFromLabel("CFM"), "cfm");
  assert.equal(unitFromLabel("AWG"), "awg");
  assert.equal(unitFromLabel("Horsepower"), "hp");
  for (const l of ["G", "Km", "a", "Tons", "Area"]) assert.equal(unitFromLabel(l), null, l);
});

// 2026-11-16: "95 degrees" on a tile with a degF field and no angle field is
// degrees F; weather words mark a temperature context for a bare "f".
test("query-fill: weather degrees are temperatures", () => {
  const hs = [num("T_F", "Air temperature", "degf"), num("RH_percent", "Relative humidity", "pct")];
  assert.deepEqual(queryFill("heat index 95 degrees 50 percent humidity", hs).filled, { T_F: "95", RH_percent: "50" });
  assert.equal(queryFill("heat index 100 f 40% rh", hs).filled.T_F, "100");
  // An angle field keeps "degrees" as an angle.
  const bend = [num("angle_deg", "Bend angle", "deg"), num("t_f", "Temperature", "degf")];
  assert.equal(queryFill("bend angle 30 degrees", bend).filled.angle_deg, "30");
});

// 2026-11-23: question-sweep fills that came back empty or half-filled.
test("query-fill: a post-word names the label that uses it, run keeps its term", () => {
  const stairs = [num("total_rise_in", "Total rise", "in"), num("preferred_riser_height_in", "Preferred riser height", "in")];
  assert.deepEqual(queryFill("stair stringer 9 ft rise", stairs).filled, { total_rise_in: "108" });
  const rafter = [num("horizontal_span_ft", "Horizontal run", "ft"), num("pitch_rise_per_12", "Pitch"), num("overhang_ft", "Overhang", "ft")];
  assert.equal(queryFill("roof pitch 6/12 rafter length 14 ft run", rafter).filled.horizontal_span_ft, "14");
  assert.ok(labelTerms("Horizontal run").has("run"));
});

test("query-fill: a 2x6 is thickness by width, pieces is the count", () => {
  const bf = [num("thickness_in", "Thickness", "in"), num("width_in", "Width", "in"), num("length_ft", "Length", "ft"), num("count", "Count", "count")];
  assert.deepEqual(queryFill("board feet in 2x6 8 ft long 20 pieces", bf).filled,
    { thickness_in: "2", width_in: "6", length_ft: "8", count: "20" });
});

test("query-fill: a third plan side is the depth", () => {
  const vol = [num("area_ft2", "Area", "ft2"), num("depth_in", "Depth", "in"), num("bulk_density", "Bulk density")];
  assert.deepEqual(queryFill("cubic yards of dirt 30 by 40 by 2 ft", vol).filled, { area_ft2: "1200", depth_in: "24" });
  assert.deepEqual(queryFill("30 by 40 by 6 inches of topsoil", vol).filled, { area_ft2: "1200", depth_in: "6" });
  // Two sides only: no depth is invented.
  assert.equal(queryFill("30 by 40 by", vol).filled.depth_in, undefined);
});

test("query-fill: shallow and round describe the length before them", () => {
  const pool = [num("length_ft", "Length", "ft"), num("width_ft", "Width", "ft"), num("diameter_ft", "Diameter", "ft"),
    num("shallow_ft", "Shallow-end depth", "ft"), num("deep_ft", "Deep-end depth", "ft")];
  assert.deepEqual(queryFill("16 by 32 pool 4 ft shallow 8 ft deep", pool).filled,
    { length_ft: "16", width_ft: "32", shallow_ft: "4", deep_ft: "8" });
  assert.equal(queryFill("an 18 ft round pool 4 ft deep", pool).filled.diameter_ft, "18");
});

test("query-fill: a per-day quantity fills a per-day field; a utility rate is cents", () => {
  const ae = [num("watts", "Power", "w"), num("hours_per_day", "Hours used per day", "hr"), num("rate_cents_per_kwh", "Electricity rate", "cents")];
  assert.deepEqual(queryFill("1500 watts 8 hours a day 15 cents per kwh", ae).filled, { watts: "1500", hours_per_day: "8", rate_cents_per_kwh: "15" });
  assert.equal(queryFill("1500 watts 8 hours a day at $0.15 per kwh", ae).filled.rate_cents_per_kwh, "15");
  // A per-day rate still never fills a field that is not per day.
  assert.equal(queryFill("8 hours a day", [num("run_hr", "Run time", "hr")]).filled.run_hr, undefined);
  assert.equal(rewriteQuery("$3.50 per ft"), "$3.50 per ft");
});

test("query-fill: names written after their numbers, and a tie the post-word wins", () => {
  const dw = [num("wall_area_ft2", "Wall area", "ft2"), num("ceiling_area_ft2", "Ceiling area", "ft2")];
  const want = { wall_area_ft2: "1200", ceiling_area_ft2: "600" };
  for (const q of ["drywall 1200 sq ft walls 600 sq ft ceiling", "drywall walls 1200 sq ft ceiling 600 sq ft", "1200 sq ft of walls and 600 sq ft of ceiling"]) {
    assert.deepEqual(queryFill(q, dw, { name: "Drywall Sheet Count and Mud" }).filled, want, q);
  }
  const fence = [num("length_ft", "Fence run", "ft"), num("post_spacing_ft", "Post spacing", "ft")];
  assert.deepEqual(queryFill("fence posts for 150 ft fence 8 ft apart", fence, { name: "Fence Material Takeoff" }).filled,
    { length_ft: "150", post_spacing_ft: "8" });
});

test("query-fill: an item's two sides, and a room's floor for a floor covering", () => {
  const pav = [num("area_sqft", "Patio area", "ft2"), num("paver_length_in", "Paver length", "in"), num("paver_width_in", "Paver width", "in")];
  assert.deepEqual(queryFill("how many pavers for 200 sq ft 4 by 8 pavers", pav).filled, { area_sqft: "200", paver_length_in: "8", paver_width_in: "4" });
  assert.equal(queryFill("200 sq ft 4x8 pavers", pav).filled.paver_length_in, "8");
  const tile = [num("area_ft2", "Area", "ft2"), num("tile_width_in", "Tile width", "in"), num("tile_height_in", "Tile height", "in")];
  assert.deepEqual(queryFill("how many tiles for a 10 by 12 floor 6x24 tile", tile).filled, { area_ft2: "120", tile_height_in: "24", tile_width_in: "6" });
  const carpet = [num("area_sf", "Area to carpet", "ft2"), num("roll_width_ft", "Carpet roll width", "ft")];
  assert.equal(queryFill("carpet for a 12 by 15 room", carpet).filled.area_sf, "180");
  // A room's plan is still not a paint area.
  assert.equal(queryFill("paint for a 12 by 15 room", [num("area_ft2", "Area", "ft2")]).filled.area_ft2, undefined);
});

test("query-fill: a wall by its length and height is its area", () => {
  const sid = [num("wall_area_sf", "Gross wall area", "ft2"), num("exposure_in", "Lap exposure / reveal", "in")];
  assert.deepEqual(queryFill("siding for a 40 ft wall 10 ft tall", sid).filled, { wall_area_sf: "400" });
  // Not where the tile asks for the length and height themselves.
  const wall = [num("wall_area_sf", "Wall area", "ft2"), num("length_ft", "Wall length", "ft"), num("height_ft", "Wall height", "ft")];
  assert.equal(queryFill("40 ft wall 10 ft tall", wall).filled.wall_area_sf, undefined);
});

test("query-fill: a size before a material word, and options written with spaces", () => {
  const fl = [sel("method", "Method", ["hazen-williams", "darcy-weisbach"]), sel("material", "Material", ["PVC", "copper", "pex"]),
    sel("nominal_size", "Nominal size", ["1", "2", "0.5", "0.75"]), num("length_ft", "Length", "ft"), num("flow_gpm", "Flow", "gpm")];
  assert.deepEqual(queryFill("friction loss hazen williams 100 ft 3/4 pex 5 gpm", fl).filled,
    { method: "hazen-williams", material: "pex", nominal_size: "0.75", length_ft: "100", flow_gpm: "5" });
  assert.equal(queryFill("200 ft 2 pvc 40 gpm", fl).filled.nominal_size, "2");
  // A bare fraction with no material word after it is still ambiguous.
  assert.equal(queryFill("3/4 at 5 gpm", fl).filled.nominal_size, undefined);
});

test("query-fill: a temperature rise is a difference; a post-word prefers the unit written", () => {
  const tk = [num("target_outlet_F", "Target outlet", "degf"), num("target_gpm", "Target flow", "gpm")];
  assert.deepEqual(queryFill("tankless water heater 5 gpm 70 degree rise", tk).filled, { target_gpm: "5" });
  assert.equal(queryFill("tankless 5 gpm 120 degree outlet", tk).filled.target_outlet_F, "120");
  assert.equal(queryFill("70 degree rise", [num("rise_F", "Temperature rise", "degf")]).filled.rise_F, "70");
  const rw = [num("wall_length_ft", "Wall length", "ft"), num("exposed_height_ft", "Exposed height", "ft"),
    num("block_length_in", "Block face length", "in"), num("block_height_in", "Block face height", "in")];
  assert.deepEqual(queryFill("retaining wall blocks 50 ft long 3 ft tall", rw).filled, { wall_length_ft: "50", exposed_height_ft: "3" });
});

test("query-fill: btu on a btu/h-only tile is a rating; underscored options read with spaces", () => {
  const gp = [num("btu_load", "BTU load", "btuh"), num("length_ft", "Pipe length", "ft"), sel("gas", "Gas", ["natural_gas", "propane"])];
  assert.deepEqual(queryFill("gas pipe size 100 ft 150000 btu natural gas", gp).filled, { btu_load: "150000", length_ft: "100", gas: "natural_gas" });
  // Not where the tile also measures heat in Btu.
  assert.equal(queryFill("150000 btu", [num("q", "Heat", "btu"), num("r", "Rate", "btuh")]).filled.r, undefined);
  // An underscored option whose words are the tile's own label is not read from them.
  const rf = [sel("cooling", "End chill, or a drag chill between risers", ["end_effect", "end_chill", "drag_chill"])];
  assert.equal(queryFill("end chill, or a drag chill between risers", rf).filled.cooling, undefined);
});
