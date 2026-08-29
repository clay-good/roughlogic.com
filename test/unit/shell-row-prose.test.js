// A list input is a TABLE the reader fills in through labelled fields --
// air-receiver asks for "Tool 1 CFM" and "Tool 1 duty cycle (0 to 1)", never
// for JSON. The shell used to print the literal `[{"cfm":4,"duty_cycle":0.5}]`
// on 38 rows across 45 pages: unreadable, and not something any tile would
// accept pasted back. These pin the prose rendering that replaced it.
import test from "node:test";
import assert from "node:assert/strict";
import { exampleValue } from "../../scripts/build-shells.mjs";

test("an array of flat rows reads as prose, not JSON", () => {
  assert.equal(
    exampleValue([{ cfm: 4, duty_cycle: 0.5 }, { cfm: 3, duty_cycle: 0.4 }]),
    "cfm 4, duty cycle 0.5; cfm 3, duty cycle 0.4");
  assert.equal(
    exampleValue([{ insulation: "THHN", awg: "12", count: 4 }]),
    "insulation THHN, awg 12, count 4");
});

test("no worked-example value renders as a JSON literal", () => {
  for (const v of [[{ a: 1 }], [{ n: 0, e: 0 }, { n: 100, e: 0 }], [{ area: 1200, r: 17 }]]) {
    const out = exampleValue(v);
    assert.ok(!out.includes('"'), `rendered a quoted literal: ${out}`);
    assert.ok(!out.startsWith("[{"), `rendered a JSON array: ${out}`);
  }
});

test("a row too long to print keeps the first row and says how many follow", () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ azimuth_deg: i * 40, distance_ft: 100 + i }));
  const out = exampleValue(many);
  assert.match(out, /and 8 more$/);
  assert.ok(out.length <= 120, `degraded value is still ${out.length} chars`);
});

test("an array of bare values reads as the comma-separated list the field takes", () => {
  // These were left as JSON on the grounds that they are not a table of
  // labelled fields. True, but they are not JSON to the reader either:
  // `search-probability` ships its own box pre-filled with the string
  // "30, 40, 50" while the page printed `[30,40,50]`, a form that field would
  // not take as typed, and three more captions say "comma-separated" outright.
  assert.equal(exampleValue([30, 40, 50]), "30, 40, 50");
  assert.equal(exampleValue([12000, 17000, 17000]), "12000, 17000, 17000");
});

test("a bare object of scalars reads as one row of labelled fields", () => {
  assert.equal(exampleValue({ water_closet_private: 1, lavatory: 2 }),
    "water closet private 1, lavatory 2");
  // ...but only when the keys are field NAMES. `box-fill` is keyed by wire
  // size, where the key is data and "12 6" would read as nonsense.
  assert.match(exampleValue({ 12: 6 }), /^\{/);
});

test("shapes prose cannot read still fall back rather than guess", () => {
  // A nested row is not a table of flat fields; JSON is still honest for it.
  assert.match(exampleValue([{ a: { b: 1 } }]), /^\[/);
  // And a value that already contains the separator would be ambiguous read
  // back as a list.
  assert.match(exampleValue(["a,b", "c"]), /^\[/);
});
