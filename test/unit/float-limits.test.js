// Values exactly AT a limit, where floating point used to land a hair on the
// wrong side (2026-10-01 printed-example pass, batch 53). Each case is a
// whole-number or exactly-at-limit answer the tile had read one step off.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConcretePremixBags } from "../../calc-concrete.js";
import { computeLuminaireSpacingMh } from "../../calc-elecdesign.js";
import { computeDuctBankAmpacityDerate } from "../../calc-lineworker.js";
import { computeLaundryWasherTurns } from "../../calc-steamplant.js";
import { computeAirDryerSizing } from "../../calc-millwright.js";

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

test("washer turns: three 50 lb washers on a 45 min cycle make exactly 1,600 lb, so three machines, not four", () => {
  const r = computeLaundryWasherTurns({ machine_capacity_lb: 50, wash_cycle_min: 20, load_unload_min: 10, idle_min: 15, shift_hours: 8, shifts_per_day: 1, machine_count: 3, required_lb_per_day: 1600 });
  assert.equal(r.machines_required, 3);
  assert.equal(r.meets_requirement, true);
});

test("air dryer: a 100 scfm nameplate at 0.70 x 0.80 delivers exactly the 56 scfm required", () => {
  assert.equal(computeAirDryerSizing({ actual_scfm: 56, temp_correction: 0.7, pressure_correction: 0.8, candidate_rated_scfm: 100 }).candidate_ok, true);
});
