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

test("shapes prose cannot read still fall back rather than guess", () => {
  // Nested rows and arrays of bare values are not a table of fields; JSON is
  // still the honest rendering for them.
  assert.match(exampleValue([{ a: { b: 1 } }]), /^\[/);
  assert.match(exampleValue([1, 2, 3]), /^\[/);
});
