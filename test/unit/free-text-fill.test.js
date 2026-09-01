// The agent door extracting a wrong number from a question a person typed.
//
// scripts/measure-query-fill.mjs reports "WRONG values 0", and that is true of
// the corpus it measures: every number labelled, in field order, taken from
// each tile's own worked example. Give the door a question with a spare number
// in it and five of five hand-written trade questions bind a value the query
// text rules out -- "wire size for a 50 amp circuit 90 feet away" puts 90 into
// the conductor's insulation temperature rating, where 90 C is a real value
// and an agent has nothing to notice.
//
// Every one has the same shape: a number carrying a unit is converted into a
// field of the same DIMENSION but a different MEANING. Feet and inches share a
// dimension; a wall and a stud do not share a meaning.
//
// This pins the count as a CEILING. The extractor is a tuned module with a
// documented history of guards that cost more recoveries than they saved, so
// this measures the gap rather than closing it, and any attempt at closing it
// is judged here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { measureFreeTextFill } from "../../scripts/measure-free-text-fill.mjs";

// Known-wrong bindings. Lower it when a fix lands; raising it means the
// extractor got worse.
//   5 -- 2026-09-01, when this measurement was written.
//   4 -- 2026-09-01, after Phase B0 stopped filling a numeric dropdown from a
//        quantity whose dimension the tile measures nowhere. That is the
//        `wire size for a 50 amp circuit 90 feet away` case, which put 90 into
//        an insulation rating whose options are 60 / 75 / 90.
//   3 -- 2026-09-01, after Phase A stopped letting a field with no unit take a
//        number that carries one while a field measured in that unit sat
//        unfilled beside it. `310 lb worker and 6 ft free fall` had put the 6
//        into Workers attached, a count. It now fills Free fall distance, and
//        the 310 lands in Anchorage capacity, which it never used to reach:
//        catalog-wide recovery rose 4,154 -> 4,349 of 7,184 fields.
//   2 -- 2026-09-01, after the nominal-lumber rewrite stopped reading every
//        AxB in the language as a stick of wood. `20x30 slab 4 inches thick`
//        had become "nominal width 20 in nominal depth 30 in slab 4 inches
//        thick", which handed the 20 an inch the reader never wrote -- and an
//        invented inch beats a real one, so the 20 took Slab thickness and the
//        four inches went unused. Bounded to 12, the largest nominal
//        dimension lumber is sold in.
const CEILING = 2;

test("free-text extraction does not get worse", async () => {
  const { rows, violations } = await measureFreeTextFill();
  assert.ok(rows.length >= 5, `the fixture shrank to ${rows.length} rows`);
  assert.ok(
    violations.length <= CEILING,
    `${violations.length} wrong binding(s), ceiling ${CEILING}:\n` +
      violations.map((v) => `  ${v.field}=${v.value} from ${JSON.stringify(v.query)}`).join("\n"),
  );
});

test("the ceiling is not stale in the other direction", async () => {
  // A ceiling nobody lowers is a ceiling nobody looks at. If a fix drops the
  // count, this fails and the constant has to come down with it, so the number
  // in this file always says what the door actually does.
  const { violations } = await measureFreeTextFill();
  assert.equal(
    violations.length, CEILING,
    `free-text wrong bindings are now ${violations.length}, not ${CEILING}. ` +
      `Lower CEILING in this file to match, and say so in the CHANGELOG.`,
  );
});

test("every fixture row says why the binding is wrong", async () => {
  // The assertion is a claim about trade math, so it carries its reasoning.
  const text = await readFile(new URL("../fixtures/free-text-queries.json", import.meta.url), "utf8");
  for (const row of JSON.parse(text).rows) {
    assert.ok(row.query && row.query.length > 10, `row has no question: ${JSON.stringify(row)}`);
    assert.ok(Object.keys(row.mustNotBind || {}).length > 0, `${row.query}: nothing asserted`);
    assert.ok(row.why && row.why.length > 40, `${row.query}: no reasoning given`);
  }
});

test("a dropdown does not take a quantity in a dimension the tile never measures", async () => {
  // Phase B0 lets a unit-bearing number fill a numeric dropdown, because a
  // bare number is not evidence and a unit is. It never checked WHICH unit:
  // "wire size for a 50 amp circuit 90 feet away" put 90 into wire-ampacity's
  // Insulation rating, whose options are 60 / 75 / 90, and 90 C is a real
  // rating so nothing downstream looks wrong.
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const r = await answerQuery({ query: "wire size for a 50 amp circuit 90 feet away" });
  const filled = (r && r.inputs) || {};
  assert.ok(!("insulation_rating_C" in filled), `bound insulation_rating_C=${filled.insulation_rating_C} from a distance in feet`);
});

test("the case Phase B0 exists for still fills", async () => {
  // The guard is same-DIMENSION, not same-unit, so a pipe size in inches is
  // still a length among lengths on a tile whose Length is in feet. Narrowing
  // it to the unit would have broken this, which is the case the phase was
  // written for: before B0, "pipe volume 4 in 50 ft" answered 2.24 gal for a
  // 1-inch pipe and said nothing about having dropped the 4.
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  for (const q of ["pipe volume 4 in 50 ft", "pipe volume 100 ft of 2 inch schedule 40"]) {
    const r = await answerQuery({ query: q });
    const filled = (r && r.inputs) || {};
    assert.ok(filled.nominal_size, `"${q}" left the size dropdown unfilled`);
  }
});

test("a unit on the number beats a name beside it", async () => {
  // "310 lb worker and 6 ft free fall" put the 6 into Workers attached, a
  // count, because "worker" sat in front of it -- while the same tile carries
  // a Free fall distance measured in feet, which is what the reader wrote.
  // Phase A weighed the adjacent word and never the number's own unit.
  const { queryFill } = await import("../../query-fill.js");
  const rows = [
    { d: "workers_attached", l: "Workers attached to this anchorage", k: "number", r: 1 },
    { d: "free_fall_ft", l: "Free fall distance", u: "ft", k: "number" },
    { d: "anchorage_capacity_lb", l: "Anchorage capacity", u: "lb", k: "number" },
  ];
  const out = queryFill("fall protection anchor for a 310 lb worker and 6 ft free fall", rows, {
    name: "Fall Arrest Anchorage",
  }).filled;
  assert.ok(!("workers_attached" in out), `bound workers_attached=${out.workers_attached} from a distance in feet`);
  assert.equal(out.free_fall_ft, "6", `free_fall_ft is ${out.free_fall_ft}`);
  assert.equal(out.anchorage_capacity_lb, "310", `anchorage_capacity_lb is ${out.anchorage_capacity_lb}`);
});

test("through the live tile the wrong value is gone, not replaced", async () => {
  // The live fall-arrest-anchorage carries TWO fields in feet and THREE in
  // pounds, so once the word "worker" stops handing the 6 to a count, no
  // single field can claim either number and the extractor refuses -- which is
  // this module's governing rule, that a wrong prefill is worse than none.
  // The agent gets NO_MATCH where it used to get a pointer carrying a wrong
  // value. Recorded here rather than left as a surprise.
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const r = await answerQuery({ query: "fall protection anchor for a 310 lb worker and 6 ft free fall" });
  assert.ok(!(r.inputs && "workers_attached" in r.inputs), "still binds a distance to a headcount");
});

test("a field with no unit still takes a number with no unit", async () => {
  // The guard is narrow on purpose: it fires only when the number carries a
  // unit AND another unfilled field is measured in it. A plain count still
  // fills from a plain number beside its name.
  const { queryFill } = await import("../../query-fill.js");
  const rows = [
    { d: "bedrooms", l: "Bedrooms", k: "number", r: 1 },
    { d: "length_ft", l: "Length (ft)", u: "ft", k: "number" },
  ];
  const out = queryFill("bedrooms 4 length 200 ft", rows, { name: "Septic Tank" }).filled;
  assert.equal(out.bedrooms, "4", `bedrooms is ${out.bedrooms}`);
  assert.equal(out.length_ft, "200", `length_ft is ${out.length_ft}`);
});

test("an AxB larger than lumber is left alone", async () => {
  // A slab, a room and a floor are written in feet; only the lumber is in
  // inches. Reading "20x30" as nominal lumber invented an inch and cost the
  // reader the four inches they actually wrote.
  const { rewriteQuery } = await import("../../query-fill.js");
  const untouched = new Set();
  for (const q of ["a 20x30 slab", "12x14 room", "24x40 floor"]) {
    assert.equal(rewriteQuery(q, untouched, untouched), q, `${q} was rewritten as lumber`);
  }
});

test("nominal lumber is still rewritten", async () => {
  // The rule exists for these and they must keep working: the tiles that care
  // about nominal-versus-actual ask for the nominal size and convert it
  // themselves.
  const { rewriteQuery } = await import("../../query-fill.js");
  const untouched = new Set();
  for (const [q, want] of [
    ["a 2x6 wall", "a nominal width 2 in nominal depth 6 in wall"],
    ["a 2x10 joist", "a nominal width 2 in nominal depth 10 in joist"],
    ["4x4 post", "nominal width 4 in nominal depth 4 in post"],
  ]) {
    assert.equal(rewriteQuery(q, untouched, untouched), want);
  }
});
