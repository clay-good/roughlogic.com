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
