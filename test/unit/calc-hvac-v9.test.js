// v9 §B.2 unit tests for outdoor-air-ventilation (ASHRAE 62.1 single-
// zone breathing-zone procedure). Spec-v9 §B.2 calls for 8 unit tests
// with parametric Rp / Ra (no bundled table values).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeOutdoorAirVentilation, outdoorAirVentilationExample,
  OA_OCCUPANCY_PRESETS, HVAC_RENDERERS,
  computeHoodExhaust, hoodExhaustExample,
  HOOD_DUTY_MULTIPLIERS_CFM_PER_FT, TYPE_II_HOOD_CFM_PER_FT,
  computeSHRLatent, shrLatentExample,
} from "../../calc-hvac.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("outdoor-air-ventilation: example 25 people, 2500 ft^2, Rp=5, Ra=0.06 -> Vbz 275 cfm", () => {
  const r = computeOutdoorAirVentilation(outdoorAirVentilationExample.inputs);
  assert.ok(!r.error);
  // Vbz = 5*25 + 0.06*2500 = 125 + 150 = 275.
  assert.ok(close(r.Vbz_cfm, 275, 0.001));
  // Voz at E_z=1.0 equals Vbz.
  assert.ok(close(r.Voz_cfm, 275, 0.001));
});

test("outdoor-air-ventilation: Voz = Vbz / E_z (E_z below 1.0 raises Voz)", () => {
  const r = computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 2500, Ez: 0.8 });
  // Vbz = 275; Voz = 275 / 0.8 = 343.75.
  assert.ok(close(r.Voz_cfm, 343.75, 0.001));
});

test("outdoor-air-ventilation: rejects zero / negative people, area, or E_z", () => {
  assert.ok(computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 0, floor_area_ft2: 1000 }).error);
  assert.ok(computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 0 }).error);
  assert.ok(computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 1000, Ez: 0 }).error);
});

test("outdoor-air-ventilation: warns when E_z is outside the 0.5-1.2 Table 6-2 range", () => {
  const r1 = computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 1000, Ez: 0.4 });
  const r2 = computeOutdoorAirVentilation({ Rp_cfm_per_person: 5, Ra_cfm_per_ft2: 0.06, people: 25, floor_area_ft2: 1000, Ez: 1.3 });
  assert.ok(r1.warnings.some((w) => /outside the ASHRAE 62\.1 Table 6-2 typical range/.test(w)));
  assert.ok(r2.warnings.some((w) => /outside the ASHRAE 62\.1 Table 6-2 typical range/.test(w)));
});

test("outdoor-air-ventilation: every result includes the 'Rp and Ra are user-supplied' warning", () => {
  const r = computeOutdoorAirVentilation(outdoorAirVentilationExample.inputs);
  assert.ok(r.warnings.some((w) => /Rp and Ra are user-supplied/.test(w)));
});

test("outdoor-air-ventilation: per-person and per-area ratios are computed correctly", () => {
  const r = computeOutdoorAirVentilation({ Rp_cfm_per_person: 10, Ra_cfm_per_ft2: 0.12, people: 30, floor_area_ft2: 1000, Ez: 1.0 });
  // Vbz = 10*30 + 0.12*1000 = 300 + 120 = 420.
  assert.ok(close(r.Vbz_cfm, 420, 0.001));
  assert.ok(closePct(r.cfm_per_person, 14, 0.5));
  assert.ok(closePct(r.cfm_per_ft2, 0.42, 0.5));
});

test("outdoor-air-ventilation: OA_OCCUPANCY_PRESETS exposes office / classroom / retail with sensible placeholders", () => {
  assert.ok(OA_OCCUPANCY_PRESETS.office.Rp > 0);
  assert.ok(OA_OCCUPANCY_PRESETS.office.Ra > 0);
  assert.ok(OA_OCCUPANCY_PRESETS.classroom.Rp >= OA_OCCUPANCY_PRESETS.office.Rp);
  assert.ok(OA_OCCUPANCY_PRESETS.retail.Rp >= OA_OCCUPANCY_PRESETS.office.Rp);
  assert.equal(OA_OCCUPANCY_PRESETS.custom.Rp, 0);
});

test("outdoor-air-ventilation: HVAC_RENDERERS exposes outdoor-air-ventilation", () => {
  assert.equal(typeof HVAC_RENDERERS["outdoor-air-ventilation"], "function");
});

// v9 §B.3 commercial kitchen hood exhaust (IMC 507.13 / 507.20).

test("hood-exhaust: example 8 ft wall-canopy heavy-duty -> 3200 cfm exhaust, 2560 cfm makeup", () => {
  const r = computeHoodExhaust(hoodExhaustExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.Q_exhaust_cfm, 3200, 1e-9));
  assert.ok(close(r.cfm_per_ft, 400, 1e-9));
  assert.ok(close(r.makeup_cfm, 2560, 1e-9));
});

test("hood-exhaust: wall-canopy duty progression (light < medium < heavy < extra-heavy)", () => {
  const L = 10;
  const light = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "light", length_ft: L });
  const med = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "medium", length_ft: L });
  const heavy = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "heavy", length_ft: L });
  const xh = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "extra-heavy", length_ft: L });
  assert.ok(light.Q_exhaust_cfm < med.Q_exhaust_cfm);
  assert.ok(med.Q_exhaust_cfm < heavy.Q_exhaust_cfm);
  assert.ok(heavy.Q_exhaust_cfm < xh.Q_exhaust_cfm);
  assert.ok(close(light.Q_exhaust_cfm, 2000, 1e-9));
  assert.ok(close(xh.Q_exhaust_cfm, 5500, 1e-9));
});

test("hood-exhaust: single-island canopy multipliers higher than wall-canopy at same duty", () => {
  const wc = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "heavy", length_ft: 8 });
  const si = computeHoodExhaust({ hood_class: "I", hood_type: "single-island", duty: "heavy", length_ft: 8 });
  assert.ok(si.Q_exhaust_cfm > wc.Q_exhaust_cfm);
  assert.ok(close(si.Q_exhaust_cfm, 4800, 1e-9));
});

test("hood-exhaust: backshelf / proximity / pass-over reject extra-heavy duty", () => {
  for (const ht of ["backshelf", "proximity", "pass-over"]) {
    const r = computeHoodExhaust({ hood_class: "I", hood_type: ht, duty: "extra-heavy", length_ft: 8 });
    assert.match(r.error, /not permitted/);
  }
});

test("hood-exhaust: Type II vapor-only at 100 cfm/ft with greasy-effluent warning", () => {
  const r = computeHoodExhaust({ hood_class: "II", length_ft: 10, width_ft: 4 });
  assert.ok(!r.error);
  assert.ok(close(r.Q_exhaust_cfm, 1000, 1e-9));
  assert.equal(r.cfm_per_ft, TYPE_II_HOOD_CFM_PER_FT);
  assert.ok(r.warnings.some((w) => /greasy effluent/i.test(w)));
});

test("hood-exhaust: Type II requires positive width", () => {
  const r = computeHoodExhaust({ hood_class: "II", length_ft: 10 });
  assert.match(r.error, /width/);
});

test("hood-exhaust: length below 4 ft and above 16 ft warned", () => {
  const r1 = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "medium", length_ft: 3 });
  assert.ok(r1.warnings.some((w) => /below 4 ft/i.test(w)));
  const r2 = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "medium", length_ft: 20 });
  assert.ok(r2.warnings.some((w) => /above 16 ft/i.test(w)));
});

test("hood-exhaust: zero / negative length rejected; unknown hood type / class rejected", () => {
  assert.ok(computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "medium", length_ft: 0 }).error);
  assert.ok(computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "medium", length_ft: -5 }).error);
  assert.ok(computeHoodExhaust({ hood_class: "III", hood_type: "wall-canopy", duty: "medium", length_ft: 8 }).error);
  assert.ok(computeHoodExhaust({ hood_class: "I", hood_type: "made-up", duty: "medium", length_ft: 8 }).error);
});

test("hood-exhaust: duct area = Q / V * 144; velocity outside 500-2000 fpm warns (Type I)", () => {
  const r = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "heavy", length_ft: 8, duct_velocity_fpm: 1500 });
  // 3200 / 1500 * 144 = 307.2 in^2.
  assert.ok(closePct(r.duct_area_in2, 307.2, 0.1));
  const low = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "heavy", length_ft: 8, duct_velocity_fpm: 400 });
  assert.ok(low.warnings.some((w) => /500-2000 fpm/i.test(w)));
});

test("hood-exhaust: grease-duct slope reminder is 1/4 in/ft for Type I, 0 for Type II", () => {
  const r1 = computeHoodExhaust({ hood_class: "I", hood_type: "wall-canopy", duty: "medium", length_ft: 8 });
  assert.equal(r1.grease_duct_slope_in_per_ft, 0.25);
  const r2 = computeHoodExhaust({ hood_class: "II", length_ft: 8, width_ft: 4 });
  assert.equal(r2.grease_duct_slope_in_per_ft, 0);
});

test("hood-exhaust: HOOD_DUTY_MULTIPLIERS_CFM_PER_FT covers six Type I hood types", () => {
  assert.equal(Object.keys(HOOD_DUTY_MULTIPLIERS_CFM_PER_FT).length, 6);
  for (const ht of Object.keys(HOOD_DUTY_MULTIPLIERS_CFM_PER_FT)) {
    const row = HOOD_DUTY_MULTIPLIERS_CFM_PER_FT[ht];
    assert.ok(row.light > 0); assert.ok(row.medium > 0); assert.ok(row.heavy > 0);
  }
});

test("hood-exhaust: HVAC_RENDERERS exposes hood-exhaust", () => {
  assert.equal(typeof HVAC_RENDERERS["hood-exhaust"], "function");
});

// v9 §B.1 sensible heat ratio and latent split (ASHRAE Fund Ch. 1 / 18).

test("shr-latent: example 36 kBtu/hr / 75-63 RA / 55 SA / 1200 CFM / sea level -> Q_s 25,920, Q_l 10,080, SHR 0.72", () => {
  const r = computeSHRLatent(shrLatentExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.Q_sensible_btu_hr, 25920, 1e-6));
  assert.ok(close(r.Q_latent_btu_hr, 10080, 1e-6));
  assert.ok(closePct(r.SHR, 0.72, 0.5));
  assert.ok(closePct(r.rho_ratio, 1.0, 1e-6));
});

test("shr-latent: band classification covers typical / high-latent / dry / dehumidification", () => {
  // Typical: 75/63 RA, 55 SA, 1200 CFM, 36 kBtu/hr -> SHR ~ 0.72.
  const r1 = computeSHRLatent({ total_capacity_btu_hr: 36000, return_db_F: 75, return_wb_F: 63, supply_db_F: 55, cfm: 1200 });
  assert.match(r1.band, /typical/);
  // High-latent: 58 SA -> Q_s ~ 22 kBtu, SHR ~ 0.61.
  const r2 = computeSHRLatent({ total_capacity_btu_hr: 36000, return_db_F: 75, return_wb_F: 65, supply_db_F: 58, cfm: 1200 });
  assert.match(r2.band, /high-latent/);
  // Dry-climate: 50 SA -> Q_s = 32.4 kBtu, SHR ~ 0.90.
  const r3 = computeSHRLatent({ total_capacity_btu_hr: 36000, return_db_F: 75, return_wb_F: 60, supply_db_F: 50, cfm: 1200 });
  assert.match(r3.band, /low-latent|dry/);
});

test("shr-latent: SHR is dimensionless; sensible + latent equals total", () => {
  const r = computeSHRLatent(shrLatentExample.inputs);
  assert.ok(close(r.Q_sensible_btu_hr + r.Q_latent_btu_hr, 36000, 1e-6));
  assert.ok(r.SHR > 0 && r.SHR <= 1);
});

test("shr-latent: altitude correction reduces Q_sensible (lower air density at altitude)", () => {
  const sea = computeSHRLatent({ ...shrLatentExample.inputs, altitude_ft: 0 });
  const denver = computeSHRLatent({ ...shrLatentExample.inputs, altitude_ft: 5280 });
  assert.ok(denver.Q_sensible_btu_hr < sea.Q_sensible_btu_hr);
  assert.ok(denver.rho_ratio < 1.0);
});

test("shr-latent: altitude above 12,000 ft warns 'outside typical correction range'", () => {
  const r = computeSHRLatent({ ...shrLatentExample.inputs, altitude_ft: 14000 });
  assert.ok(r.warnings.some((w) => /correction's typical range/i.test(w)));
});

test("shr-latent: wet-bulb above dry-bulb rejected", () => {
  const r = computeSHRLatent({ total_capacity_btu_hr: 36000, return_db_F: 75, return_wb_F: 80, supply_db_F: 55, cfm: 1200 });
  assert.match(r.error, /Wet-bulb/);
});

test("shr-latent: supply >= return dry-bulb rejected (not cooling)", () => {
  const r = computeSHRLatent({ total_capacity_btu_hr: 36000, return_db_F: 75, return_wb_F: 63, supply_db_F: 80, cfm: 1200 });
  assert.match(r.error, /below return/);
});

test("shr-latent: zero or negative CFM / total Q rejected", () => {
  assert.ok(computeSHRLatent({ total_capacity_btu_hr: 0, return_db_F: 75, return_wb_F: 63, supply_db_F: 55, cfm: 1200 }).error);
  assert.ok(computeSHRLatent({ total_capacity_btu_hr: 36000, return_db_F: 75, return_wb_F: 63, supply_db_F: 55, cfm: 0 }).error);
});

test("shr-latent: when computed sensible exceeds reported total, warning surfaces", () => {
  // Big dT * big CFM but small total -> Q_s > Q_tot.
  const r = computeSHRLatent({ total_capacity_btu_hr: 10000, return_db_F: 75, return_wb_F: 63, supply_db_F: 50, cfm: 1500 });
  assert.ok(r.warnings.some((w) => /exceeds reported total/i.test(w)));
  // Latent floor at 0 protects the band classifier.
  assert.equal(r.Q_latent_btu_hr, 0);
});

test("shr-latent: return-air humidity ratio at 75/63 lands in the typical 60-75 gr/lb range at sea level", () => {
  const r = computeSHRLatent(shrLatentExample.inputs);
  // Standard psychrometric chart at sea level (101.325 kPa): 75 F db / 63 F wb -> W ~ 0.0095 lb/lb -> ~66 gr/lb.
  assert.ok(r.W_ra_gpp > 60 && r.W_ra_gpp < 75, "W_ra_gpp out of range: " + r.W_ra_gpp);
});

test("shr-latent: supply humidity ratio is below return when latent removal is positive", () => {
  const r = computeSHRLatent(shrLatentExample.inputs);
  assert.ok(r.W_sa_gpp < r.W_ra_gpp);
});

test("shr-latent: HVAC_RENDERERS exposes shr-latent", () => {
  assert.equal(typeof HVAC_RENDERERS["shr-latent"], "function");
});
