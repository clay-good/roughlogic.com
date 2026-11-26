// A tile that answers on an impossible reading has stated something a reader
// can act on -- and seven of them stated the SAFER thing.
//
// The renderers declare `min="0"` on every field below. The computes did not
// enforce it, and each threshold ladder or table walk is written with `>=` or
// `<=`, so a negative value clears the first branch and returns the smallest,
// lowest-risk, most permissive answer the tile has. Measured 2026-09-10 by
// scripts/measure-verdict-bounds.mjs, which re-runs every tile's own worked
// example with one bounded input pushed below its minimum and reports the
// conclusions that CHANGE. (Comparing the two runs is what makes it usable: a
// first attempt matched result strings against a "passing" vocabulary and
// returned almost nothing but static `note:` prose containing the word
// "passes", while missing voltage-drop entirely.)
//
// Each case here is the tile's OWN published example with one input negated.
import { test } from "node:test";
import assert from "node:assert/strict";

test("an impossible reading does not buy a safer answer", async () => {
  const { run } = await import("../../mcp/catalog.mjs");
  const { describe } = await import("../../mcp/catalog.mjs");

  const CASES = [
    // A negative deduction ADDS capacity the crane does not have.
    ["crane-net-capacity", "below_hook_lb", "flag"],
    ["crane-net-capacity", "hook_block_lb", "flag"],
    // Negative RH clears both `>=` thresholds, so the risk reads "low".
    ["mold", "rh_percent", "risk"],
    ["mold", "hours_elevated", "risk"],
    // The flag ladder compares a SIGNED percent: -9.88% read as within advisory.
    ["voltage-drop", "length_ft", "flag"],
    ["voltage-drop", "current_A", "flag"],
    // A negative OCPD clears the first NEC 250.122 row: an undersized EGC.
    ["egc-sizing", "ocpd_A", "egc_awg"],
    // A negative load is "satisfied" by the first candidate: undersized pipe.
    ["gas-pipe-sizing", "btu_load", "recommended_size"],
    ["gas-pipe-sizing", "length_ft", "recommended_size"],
    // Negative volume/area recommend the smallest drying equipment.
    ["dehumidifier", "room_cubic_feet", "operational_guidance"],
    ["air-movers", "affected_area_ft2", "placement_pattern"],
  ];

  const answered = [];
  for (const [id, key, outputKey] of CASES) {
    const example = (await describe({ id })).example.inputs;
    assert.ok(key in example, `${id}: ${key} is not in the published example`);
    const value = -(Math.abs(Number(example[key])) + 1);
    const out = await run({ id, inputs: { ...example, [key]: value } });
    // The tile must refuse outright, rather than return a conclusion.
    if (!out.result || !out.result.error) {
      answered.push(`${id} ${key}=${value} -> ${outputKey}: ${JSON.stringify(out.result && out.result[outputKey])}`);
    }
  }
  assert.deepEqual(answered, []);
});

// The sweep's reach grew from 674 tiles to 1,548 once every tile's declared
// bounds were read, and these three turned up in the wider population. Each
// declares the bound on the field, guards every NEIGHBOURING input's range in
// the compute, and ignored its own -- and in each the out-of-range answer is
// the permissive one. Measured by scripts/measure-verdict-bounds.mjs.
test("a value past its own declared bound does not buy a more permissive answer", async () => {
  const { run, describe } = await import("../../mcp/catalog.mjs");
  const ex = async (id) => (await describe({ id })).example.inputs;

  // An ENTERED nameplate FLA that is not positive was read as ABSENT, so the
  // tile fell back to its computed estimate and sized a SMALLER circuit than
  // the nameplate asked for: 35 A conductor and overload became 29.7 A.
  const motor = await ex("motor-branch-from-nameplate");
  const negFla = await run({ id: "motor-branch-from-nameplate", inputs: { ...motor, nameplate_fla_A: -29 } });
  assert.match(negFla.result.error, /Nameplate FLA must be positive/);
  // Blank still means absent, which is the whole point of the field.
  const blank = await run({ id: "motor-branch-from-nameplate", inputs: { ...motor, nameplate_fla_A: null } });
  assert.ok(!blank.result.error, "a blank nameplate must still size from the estimate");
  assert.equal(blank.result.design_source, "computed");

  // A base rate above the declared 30% max inflates the monthly saving, which
  // collapses the break-even and FLIPS the verdict. This hold is 24 months
  // against a 61-month break-even, so the honest answer is "Not worth it".
  const mort = { ...(await ex("mortgage-point-breakeven")), holding_years: 2 };
  const inRange = await run({ id: "mortgage-point-breakeven", inputs: mort });
  assert.match(inRange.result.verdict, /^Not worth it/);
  for (const bad of [{ base_rate_pct: 61 }, { base_rate_pct: 31 }, { points_rate_pct: 31, base_rate_pct: 32 }]) {
    const out = await run({ id: "mortgage-point-breakeven", inputs: { ...mort, ...bad } });
    assert.match(out.result.error, /above 30%/, JSON.stringify(bad));
  }
  const longTerm = await run({ id: "mortgage-point-breakeven", inputs: { ...mort, term_years: 101 } });
  assert.match(longTerm.result.error, /above 50 years/);

  // A raw score of 201 typed for 20.1 was clamped to a curved 100 -- full marks
  // off a typo, where the square-root curve on 20.1 gives 45.
  const curve = await ex("curve-grade-scaler");
  const over = await run({ id: "curve-grade-scaler", inputs: { ...curve, raw_score: 201 } });
  assert.match(over.result.error, /between 0 and 100/);
  // The bound is inclusive, and the example still answers.
  const at100 = await run({ id: "curve-grade-scaler", inputs: { ...curve, raw_score: 100 } });
  assert.equal(at100.result.curved, 100);
  assert.equal((await run({ id: "curve-grade-scaler", inputs: curve })).result.curved, 70);
});

test("a negative meter reading is not a dry material", async () => {
  // Found by the same sweep run WITHOUT relying on a declared bound: no
  // moisture meter reads below zero, whether or not the renderer said so.
  // `affected_reading = -35` against a reference of 12 makes the delta -47,
  // which clears `delta <= allow`, and the tile declared soaked material "at
  // dry standard". The field now declares min="0" as well, so the browser
  // marks it, `run_calculator` warns, and `answer_query` refuses.
  const { run, describe } = await import("../../mcp/catalog.mjs");
  const example = (await describe({ id: "moisture-dry-goal" })).example.inputs;

  const negative = await run({ id: "moisture-dry-goal", inputs: { ...example, affected_reading: -35 } });
  assert.match(negative.result.error, /cannot be negative/);

  // The DELTA, by contrast, is legitimately negative: affected drier than the
  // reference is the outcome the job is chasing, and it must still read as dry.
  const drier = await run({ id: "moisture-dry-goal", inputs: { ...example, affected_reading: 8 } });
  assert.equal(drier.result.verdict, "at dry standard");
  assert.equal(drier.result.delta, 8 - Number(example.reference_reading));
});

test("the published examples themselves still answer", async () => {
  // The guards use `< 0` rather than `>= 0` precisely so that a blank field --
  // which arrives as NaN, and `NaN < 0` is false -- behaves exactly as before.
  const { run, describe } = await import("../../mcp/catalog.mjs");
  // The guarded NUMERIC field per tile -- not `Object.keys(example)[0]`, which
  // is a select on some of these and makes `validateSelects` reject the call
  // for reasons that have nothing to do with these guards.
  const GUARDED = [
    ["crane-net-capacity", "below_hook_lb"],
    ["mold", "rh_percent"],
    ["voltage-drop", "length_ft"],
    ["egc-sizing", "ocpd_A"],
    ["gas-pipe-sizing", "btu_load"],
    ["dehumidifier", "room_cubic_feet"],
    ["air-movers", "affected_area_ft2"],
  ];
  const broken = [];
  for (const [id, key] of GUARDED) {
    const example = (await describe({ id })).example.inputs;
    const out = await run({ id, inputs: { ...example } });
    if (!out.result || out.result.error) broken.push(`${id}: ${out.result && out.result.error}`);
    // A blank field must not trip the NEW guard: it arrives as NaN, and
    // `NaN < 0` is false, which is why the guards are written that way rather
    // than as `>= 0`. Whatever a blank field did before, it still does --
    // egc-sizing, for one, has always failed its table walk on an empty OCPD,
    // and that is not this change's business.
    const blank = await run({ id, inputs: { ...example, [key]: undefined } });
    const err = blank.result && blank.result.error;
    if (err && /cannot be negative/.test(err)) {
      broken.push(`${id}: a blank ${key} tripped the negative guard -- ${err}`);
    }
  }
  assert.deepEqual(broken, []);
});

// The 2026-11-26 round, found when measure-verdict-bounds' reach grew again
// (1,548 -> 1,874 tiles probed, so its earlier triage had expired). Three of
// the ten changed conclusions were real: a declared bound that nothing
// enforced on the agent door's side.
test("an out-of-range value that used to change the conclusion now refuses", async () => {
  const { run, describe } = await import("../../mcp/catalog.mjs");

  // A roof pitch of -7 was answered as if it were +7: the sign vanishes into
  // sqrt(1 + (pitch/12)^2), so the rafter came back LONGER (17.89 -> 18.52 ft)
  // and the takeoff priced 42 more board feet of lumber. The worst of the
  // three, because nothing in the answer looked wrong.
  const framing = (await describe({ id: "residential-framing" })).example.inputs;
  const negPitch = await run({ id: "residential-framing", inputs: { ...framing, pitch: -7 } });
  assert.match(negPitch.result.error, /pitch cannot be negative/i);
  const okPitch = await run({ id: "residential-framing", inputs: { ...framing } });
  assert.ok(!okPitch.result.error && okPitch.result.total_bf > 0, "and the example still runs");

  // A negative cost fell through every `C > 0` branch and came back as the
  // markup<->margin ratio alone -- a clean-looking answer that silently
  // dropped the number the reader typed.
  const mm = (await describe({ id: "markup-vs-margin" })).example.inputs;
  const negCost = await run({ id: "markup-vs-margin", inputs: { ...mm, cost: -61 } });
  assert.match(negCost.result.error, /cannot be negative/i);

  // A negative lagging "improvement" (the benefit lagging adds) raised the
  // sound level by 1 dB and the required transmission loss with it.
  const duct = (await describe({ id: "duct-breakout-noise" })).example.inputs;
  const negLag = await run({ id: "duct-breakout-noise", inputs: { ...duct, lagging_improvement_db: -1 } });
  assert.match(negLag.result.error, /lagging improvement cannot be negative/i);

  // Each guard reads the SUPPLIED value, so a field left blank still takes its
  // documented default rather than tripping the guard.
  for (const [id, key] of [["residential-framing", "pitch"], ["duct-breakout-noise", "lagging_improvement_db"]]) {
    const ex = (await describe({ id })).example.inputs;
    const blank = await run({ id, inputs: { ...ex, [key]: undefined } });
    const err = blank.result && blank.result.error;
    assert.ok(!(err && /cannot be negative/i.test(err)), `a blank ${id}.${key} must not trip the guard (${err})`);
  }
});
