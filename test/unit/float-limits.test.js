// Values exactly AT a limit, where floating point used to land a hair on the
// wrong side (2026-10-01 printed-example pass, batch 53). Each case is a
// whole-number or exactly-at-limit answer the tile had read one step off.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConcretePremixBags } from "../../calc-concrete.js";
import { computeLuminaireSpacingMh } from "../../calc-elecdesign.js";
import { computeDuctBankAmpacityDerate } from "../../calc-lineworker.js";

test("premix bags: a 6 x 6 ft, 4 in pad at 10% waste is exactly 22 bags of 0.60 cu ft, not 23", () => {
  assert.equal(computeConcretePremixBags({ length_ft: 6, width_ft: 6, thickness_in: 4, bag_yield_ft3: 0.6, waste_pct: 10 }).bags, 22);
});

test("luminaire spacing: 7.2 ft at SMH 1.2 and 6 ft mounting is AT the maximum, which is OK", () => {
  assert.ok(computeLuminaireSpacingMh({ smh_ratio: 1.2, mounting_height_ft: 6, actual_spacing_ft: 7.2 }).verdict.startsWith("OK"));
});

test("duct bank: 150 A x 0.82 meets a 123 A target exactly", () => {
  const r = computeDuctBankAmpacityDerate({ ducts_across: 3, ducts_down: 3, loaded_ducts: 9, spacing_in: 7.5, depth_to_top_in: 30, base_table_ampacity_a: 150, derate_factor: 0.82, target_load_a: 123 });
  assert.equal(r.error, undefined);
  assert.equal(r.target_met, true);
});
