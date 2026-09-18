// calc-hygiene.js (spec-v1680..v1684) against references the specs did not
// write: a steady-state mass balance on the ventilated room, the ideal-gas
// molar volume, OSHA 1910.28's 24 ft trigger, and the identities the tiles'
// notes claim. These tiles' only worked-example rows recompute their own specs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDilutionVentilationSolvent, computeRespiratorCartridgeLife, computeArcRatedClothingSelection,
  computeFixedLadderFallProtection, computeRetrievalWinchForce,
} from "../../calc-hygiene.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const dvBase = { evaporation_lb_hr: 2, molecular_weight: 92, tlv_ppm: 20, mixing_factor: 1, lel_pct: 1.1, lel_safety_fraction: 0.25, room_volume_ft3: 20000, alt_mixing_factor: 5 };

test("dilution ventilation: at K = 1 the steady-state room concentration is exactly the limit", () => {
  // Molar volume at 70 degF and 1 atm: R T / P = 10.7316 x 529.67 / 14.696.
  const molarFt3 = 10.7316 * 529.67 / 14.696;
  within(molarFt3, 386.9, 0.05, "387 cu ft per lb-mol");
  const r = computeDilutionVentilationSolvent(dvBase);
  const vaporCfm = 2 / 60 / 92 * 386.9;
  close(vaporCfm / r.health_cfm * 1e6, 20, "ppm at steady state");
  close(computeDilutionVentilationSolvent({ ...dvBase, mixing_factor: 5 }).health_cfm, 5 * r.health_cfm, "K multiplies");
  // The LEL case holds the vapour at 25% of the lower explosive limit.
  close(vaporCfm / r.lel_cfm * 1e6, 1.1 * 10000 * 0.25, "a quarter of the LEL");
});

test("fixed ladders: OSHA 1910.28 requires a ladder safety system or PFAS above 24 ft; a cage is not one", () => {
  const cage = computeFixedLadderFallProtection({ ladder_height_ft: 48, fall_protection_threshold_ft: 24, rest_platform_interval_ft: 50, existing_protection: "cage" });
  assert.equal(cage.requires_protection, true);
  assert.equal(cage.compliant, false);
  const low = computeFixedLadderFallProtection({ ladder_height_ft: 20, fall_protection_threshold_ft: 24, rest_platform_interval_ft: 50, existing_protection: "cage" });
  assert.equal(low.compliant, true);
});

test("cartridge life: service life goes as 1 / concentration, then the schedule fraction and humidity derate", () => {
  const r = computeRespiratorCartridgeLife({ estimated_life_hr: 8, safety_fraction: 0.5, shift_hours: 8, concentration_ppm: 50, worst_case_ppm: 100, humidity_pct: 85, humidity_derate_above_65: 0.5 });
  close(r.worst_case_life_hr, 4, "double the concentration, half the life");
  close(r.humidity_adjusted_hr, 4 * 0.5 * 0.5, "schedule then humidity");
});

test("arc flash: the system rating must meet the incident energy, and a meltable layer fails regardless", () => {
  const ok = computeArcRatedClothingSelection({ incident_energy_cal_cm2: 8, system_arc_rating_cal_cm2: 12, garment_ratings_sum_cal_cm2: 16, meltable_underlayer: "no" });
  close(ok.margin_cal_cm2, 4, "margin");
  assert.equal(ok.acceptable, true);
  assert.equal(computeArcRatedClothingSelection({ incident_energy_cal_cm2: 8, system_arc_rating_cal_cm2: 12, garment_ratings_sum_cal_cm2: 16, meltable_underlayer: "yes" }).acceptable, false);
});

test("retrieval: the load is the suspended weight plus friction, against the weakest rated part", () => {
  const r = computeRetrievalWinchForce({ entrant_weight_lb: 200, equipment_weight_lb: 0, friction_pct: 15, entanglement_factor: 3, system_rating_lb: 350, anchorage_rating_lb: 310 });
  close(r.retrieval_lb, 230, "200 lb plus 15%");
  close(r.weakest_rating_lb, 310, "the anchorage governs");
  close(r.entangled_lb, 690, "a snagged entrant");
});
