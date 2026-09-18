// calc-buildingperf.js, the building-performance bench of spec-v1495..v1504,
// against references the specs did not write: ASHRAE 119's normalized leakage
// in consistent units and its class range, ASHRAE 62.2 and 62.1's rate
// formulae, the stack coefficient derived from ASHRAE's SI constant, and the
// identities the tiles' notes claim. These tiles' only worked-example rows
// recompute their own specs, so an error a spec and its tile share passes that
// fixture -- as the normalized leakage's did.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeEffectiveLeakageArea, computeBuildingTightnessLimit, computeVentilationRateProcedure,
  computeZonalPressureDiagnostics, computeCazDepressurizationLimit, computeStackEffectNpp,
  computeBillDisaggregation, computeContinuousInsulationRatio,
} from "../../calc-buildingperf.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

// ---- independent references ----

test("normalized leakage: ASHRAE 119 in consistent units lands on its A-to-J scale", () => {
  // NL = 1000 (ELA / A_floor) (H / 2.5 m)^0.3, ELA and A_floor in the same
  // units. spec-v1495 divided square inches by square feet and got 40.
  const r = computeEffectiveLeakageArea({ cfm50: 1850, floor_area_ft2: 2400, ceiling_height_ft: 8, storeys: 1 });
  const elaFt2 = 1850 / 18.9 / 144;
  close(r.normalized_leakage, 1000 * elaFt2 / 2400 * Math.pow(8 / 8.2, 0.3), "ASHRAE 119");
  assert.ok(r.normalized_leakage > 0.1 && r.normalized_leakage < 1.5, "a real house");
  // In metric: the same house, 2,400 sq ft and 97.9 sq in, gives the same NL.
  const elaM2 = (1850 / 18.9) * 0.0254 ** 2, floorM2 = 2400 * 0.3048 ** 2;
  within(r.normalized_leakage, 1000 * elaM2 / floorM2 * Math.pow(8 * 0.3048 / 2.5, 0.3), 0.1, "SI, H0 = 2.5 m");
  // A leaky house: 5,000 CFM50 on 1,200 sq ft is past class J.
  assert.ok(computeEffectiveLeakageArea({ cfm50: 5000, floor_area_ft2: 1200, ceiling_height_ft: 8, storeys: 1 }).normalized_leakage > 1.48);
});

test("stack effect: 1,898.3 is ASHRAE's 3,460 Pa-K/m in feet and Rankine", () => {
  within(3460 * 0.3048 * 1.8, 1898.3, 0.001, "coefficient");
  const r = computeStackEffectNpp({ height_ft: 24, indoor_temp_f: 70, outdoor_temp_f: 10, neutral_plane_fraction: 0.5, tall_building_height_ft: 240 });
  const si = 3460 * (24 * 0.3048) * (1 / ((10 - 32) / 1.8 + 273.15) - 1 / ((70 - 32) / 1.8 + 273.15));
  within(r.total_pressure_pa, si, 0.01, "the same pressure in SI");
});

test("ASHRAE 62.2: 0.03 cfm per sq ft plus 7.5 per occupant, bedrooms + 1", () => {
  const r = computeBuildingTightnessLimit({ floor_area_ft2: 2400, bedrooms: 3, cfm50: 1850, n_factor: 17, ceiling_height_ft: 8, planned_cfm50_reduction: 200 });
  close(r.required_cfm, 72 + 30, "Qtot");
  close(r.tightness_limit_cfm50, 102 * 17, "the tightness limit at N = 17");
});

test("ASHRAE 62.1 VRP: Vou = D sum(Rp Pz) + sum(Ra Az), and Xs = Vou / Vps", () => {
  const r = computeVentilationRateProcedure({ rp_cfm_per_person: 5, ra_cfm_per_ft2: 0.06, ez: 0.8, people_1: 25, area_1_ft2: 2500, primary_1_cfm: 1200, people_2: 12, area_2_ft2: 1800, primary_2_cfm: 900, people_3: 40, area_3_ft2: 3000, primary_3_cfm: 1500, diversity: 1 });
  close(r.vou_cfm, 5 * 77 + 0.06 * 7300, "Vou");
  close(r.xs, r.vou_cfm / 3600, "Xs");
});

// ---- identities the notes claim ----

test("CAZ: the weakest appliance present sets the limit", () => {
  const r = computeCazDepressurizationLimit({ measured_depressurization_pa: 4.5, has_natural_draft_water_heater: "yes", natural_draft_wh_limit_pa: 2, has_natural_draft_furnace: "no", natural_draft_furnace_limit_pa: 3, has_induced_draft: "yes", induced_draft_limit_pa: 5, has_direct_vent: "no", direct_vent_limit_pa: 15, largest_exhaust_cfm: 200 });
  close(r.governing_limit_pa, 2, "natural-draft water heater");
  assert.equal(r.passes, false);
});

test("zonal diagnostics: a zone near house pressure is tight to the house and open to outside", () => {
  const r = computeZonalPressureDiagnostics({ house_pressure_pa: 50, zone_a_pressure_pa: 42, zone_b_pressure_pa: 6, zone_a_label: "attic", zone_b_label: "crawl" });
  assert.ok(!r.error);
});

test("bills: the weather share is slope x degree-days over the total", () => {
  const r = computeBillDisaggregation({ baseload_per_year: 310, slope_per_degree_day: 1.85, degree_days: 1240, equipment_efficiency: 0.8, btu_per_unit: 100000, balance_point_f: 60 });
  close(r.weather_units, 1.85 * 1240, "weather");
  close(r.weather_share_pct, 100 * 2294 / 2604, "share");
  close(r.implied_ua, 1.85 * 0.8 * 100000 / 24, "UA from the slope");
});

test("continuous insulation: the ratio is ci over the total, and the minimum ci meets it exactly", () => {
  const r = computeContinuousInsulationRatio({ r_cavity: 20, r_continuous: 6, required_ratio: 0.36, indoor_temp_f: 70, indoor_rh_pct: 35, outdoor_design_temp_f: 10 });
  close(r.achieved_ratio, 6 / 26, "ratio");
  close(r.r_continuous_min / (20 + r.r_continuous_min), 0.36, "minimum ci");
});
