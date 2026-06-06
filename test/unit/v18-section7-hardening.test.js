// spec-v18 §7 Public-Surface Hardening — per-module contract campaign CLOSE.
//
// The standing v18 §7 campaign drove the Tier-2 contract backlog (a perturbed
// numeric slot that leaks a non-finite OUTPUT field instead of returning
// {error}) from 837 entries to 0: every registered compute function now
// honors the spec-v18 §2 output contract under the full 0 / -1 / NaN /
// Infinity sweep over every numeric input slot. The standing gate
// (scripts/check-tile-contract.mjs, baseline now 0) enforces the whole set;
// this file pins one representative case per fix class so the intent is
// documented and a regression is legible at the unit layer, not only as a
// baseline diff.
//
// Two fix classes (the v21 RC-1 / RC-2 seams, applied module-wide):
//   - Non-finite input guard: a NaN/Infinity reaching a solver (a pasted
//     1e999, a garbage entry) returns { error } rather than computing with it
//     and leaking a NaN/Infinity output field. Generic per-module guard.
//   - Degenerate denominator: a zeroed required input returns { error }
//     (RC-1) or the genuinely-infinite field is represented as null (RC-2),
//     never +/-Infinity.
import { test } from "node:test";
import assert from "node:assert/strict";

import { computeServiceLoad, computeTransformerSize, computeThreePhase } from "../../calc-electrical.js";
import { computeStairs, computeLumberSpan, computeResidentialFraming, computeWeldUsage } from "../../calc-construction.js";
import { computePipeVolume } from "../../calc-plumbing.js";
import { computeBrakePadLife } from "../../calc-mechanic.js";
import { computePsychrometric } from "../../calc-restoration.js";
import { computePalletLoadout } from "../../calc-trucking.js";
import { computeRiggingCheck } from "../../calc-stage.js";

const finite = (x) => x === null || Number.isFinite(x);
// Assert no output number is NaN/Infinity (null is allowed: "not applicable").
function noLeak(r) {
  const walk = (v) => {
    if (typeof v === "number") assert.ok(Number.isFinite(v), `leaked non-finite ${v}`);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(r);
}

// --- Class 1: generic non-finite input guard (NaN / Infinity) ---

test("v18 §7: Infinity in any numeric slot returns {error}, never a leak (service-load)", () => {
  const base = { area_ft2: 2000, small_appliance_circuits: 2, laundry_circuits: 1, fixed_appliances_W: 6000, range_W: 12000, dryer_W: 5000, hvac_cooling_W: 5000, hvac_heating_W: 8000 };
  for (const k of Object.keys(base)) {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const r = computeServiceLoad({ ...base, [k]: bad });
      assert.ok(r.error, `${k}=${bad} should error`);
    }
  }
  // Canonical input still computes.
  assert.ok(!computeServiceLoad(base).error);
});

test("v18 §7: NaN/Infinity guard holds on a one-line solver (three-phase)", () => {
  assert.ok(computeThreePhase({ V_LL: Infinity, I_L: 100, pf: 0.9 }).error);
  assert.ok(computeThreePhase({ V_LL: 480, I_L: NaN, pf: 0.9 }).error);
  assert.ok(!computeThreePhase({ V_LL: 480, I_L: 100, pf: 0.9 }).error);
});

// --- Class 2a: zeroed required denominator returns {error} (RC-1) ---

test("v18 §7: zeroed required denominators return {error} (RC-1)", () => {
  assert.ok(computeStairs({ total_rise_in: 109, preferred_riser_height_in: 0 }).error);
  assert.ok(computeTransformerSize({ load_kW: 100, primary_V: 0, secondary_V: 240, phase: "three" }).error);
  assert.ok(computeLumberSpan({ species_grade: "spf_no2", nominal_size: "2x8", total_load_psf: 40, tributary_width_in: 0 }).error);
  assert.ok(computeWeldUsage({ process: "GMAW", weld_cross_section_in2: 0.1, weld_length_in: 120, deposition_rate_lb_per_min: 0 }).error);
  assert.ok(computeResidentialFraming({ footprint_ft2: 1200, perimeter_ft: 140, building_run_ft: 0 }).error);
});

// --- Class 2b: genuinely-infinite field becomes null, others survive (RC-2) ---

test("v18 §7: degenerate field is null (RC-2), not Infinity, and finite fields survive", () => {
  const pv = computePipeVolume({ internal_diameter_in: 1, length_ft: 0 });
  assert.equal(pv.gallons_per_ft, null);
  assert.equal(pv.gallons, 0);
  noLeak(pv);

  const bp = computeBrakePadLife({ vehicle_weight_lb: 4000, speed_delta_mph: 30, stops_per_mile: 0, pad_thickness_mm: 12, pad_material: "ceramic", rotor_mass_lb: 18 });
  assert.equal(bp.miles_until_worn, null);
  assert.equal(bp.front_miles_until_worn, null);
  assert.ok(Number.isFinite(bp.wear_per_stop_mm));
  noLeak(bp);

  const rig = computeRiggingCheck({ hardware: "sling_5_8_steel", configuration: "vertical", load_lb: 0, n_legs: 2 });
  assert.equal(rig.safety_factor, null);
  noLeak(rig);

  const pal = computePalletLoadout({ case_length_in: 16, case_width_in: 12, case_height_in: 10, case_weight_lb: 0, cases_per_pallet: 36, trailer: "dry_van_53" });
  assert.equal(pal.pallets_by_weight, null);
  assert.ok(Number.isFinite(pal.pallets_by_floor));
  noLeak(pal);

  for (const rh of [0, -1]) {
    const ps = computePsychrometric({ temperature_F: 70, RH_percent: rh });
    assert.ok(finite(ps.dew_point_F));
    noLeak(ps);
  }
});
