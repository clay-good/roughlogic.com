// calc-corrosion.js (spec-v1763..v1775) against references the specs did not
// write: the derivations behind its constants (Dwight's relation in SI, the
// ASTM G1 weight-loss constant, Faraday's law for iron) and the identities the
// tiles' notes claim. The worked-example fixture recomputes each spec's own
// example, so an error a spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAnodeBedResistance, computeCpRectifierSizing, computePipelinePotentialAttenuation,
  computeInstantOffIrDrop, computeCoatingBreakdownFactor, computeStrayCurrentBond,
  computeCorrosionRateWeightLoss, computeGalvanicAreaRatio, computeTankBottomAnodeLayout,
  computeCloseIntervalSurveyReadings, computeAcInducedVoltagePipeline,
  computePolarizationDecayCriterion, computeCokeBreezeBackfill,
} from "../../calc-corrosion.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

// ---- the constants, derived ----

test("Dwight's single anode matches R = rho / (2 pi L) [ln(8L/d) - 1] worked in centimetres", () => {
  // The catalog's 0.00521 is 1 / (2 pi x 30.48 cm/ft) = 0.005222, rounded as
  // NACE courses print it; within 0.5% of the exact derivation.
  const r = computeAnodeBedResistance({ soil_resistivity_ohm_cm: 5000, column_length_ft: 10, column_diameter_in: 8, anode_count: 10, spacing_ft: 15, alternative_spacing_ft: 30, alternative_length_ft: 20, alternative_diameter_in: 6 });
  const L_cm = 10 * 30.48;
  const d_cm = 8 * 2.54;
  const exact = 5000 / (2 * Math.PI * L_cm) * (Math.log(8 * L_cm / d_cm) - 1);
  within(r.single_anode_resistance_ohm, exact, 0.5, "single anode");
});

test("the ASTM G1 constant 534 is the unit conversion it claims to be", () => {
  // mpy = W / (D A T) with W in mg, D in g/cm^3, A in sq in, T in h:
  // 1e-3 g/mg x 8,760 h/yr x 393.70 mil/cm / 6.4516 cm^2/sq in = 534.6.
  const r = computeCorrosionRateWeightLoss({ mass_loss_mg: 125, density_g_cm3: 7.85, exposed_area_sqin: 6, exposure_hours: 2160, wall_thickness_in: 0.25, retirement_thickness_in: 0.125, pitting_factor: 10, alternative_mass_loss_mg: 2500 });
  const derived = 125e-3 / 7.85 / (6 * 6.4516) / 2160 * 8760 * (1000 / 2.54);
  within(r.corrosion_rate_mpy, derived, 0.2, "mpy");
  close(r.corrosion_rate_mm_per_year, r.corrosion_rate_mpy * 0.0254, "mm per year");
  close(r.remaining_life_years * r.corrosion_rate_mpy / 1000, 0.125, "life consumes the allowance");
});

test("galvanic penetration follows Faraday's law for iron", () => {
  // Fe -> Fe2+: 55.845 g/mol / (2 x 96,485 C/mol) x 3.15576e7 s/yr = 20.1 lb per
  // ampere-year. One ampere per sq ft for a year then removes 20.1 lb from a
  // square foot of 490 lb/cu ft steel.
  const lbPerAmpYear = 55.845 / (2 * 96485.33212) * 3.15576e7 / 453.59237;
  within(lbPerAmpYear, 20.1, 0.5, "electrochemical equivalent");
  const r = computeGalvanicAreaRatio({ anode_potential_v: -0.61, cathode_potential_v: -0.36, cathodic_current_density_ma_per_sqft: 5, cathode_area_sqin: 1000, anode_area_sqin: 1, electrochemical_equivalent_lb_per_a_yr: lbPerAmpYear, anode_density_pcf: 490 });
  close(r.penetration_in_per_year, r.anode_current_density_a_per_sqft * lbPerAmpYear / 490 * 12, "penetration");
  // Reversing the geometry changes the attack by the area ratio squared.
  close(r.attack_ratio, 1000 * 1000, "area ratio squared");
});

// ---- identities the notes claim ----

test("an anode bed is worse than its anodes in parallel, and approaches it as spacing grows", () => {
  const base = { soil_resistivity_ohm_cm: 5000, column_length_ft: 10, column_diameter_in: 8, anode_count: 10, spacing_ft: 15, alternative_spacing_ft: 30, alternative_length_ft: 20, alternative_diameter_in: 6 };
  const r = computeAnodeBedResistance(base);
  assert.ok(r.bed_resistance_ohm > r.parallel_resistance_ohm);
  assert.ok(r.alternative_spacing_bed_ohm < r.bed_resistance_ohm);
  const far = computeAnodeBedResistance({ ...base, spacing_ft: 1e9 });
  within(far.bed_resistance_ohm, far.parallel_resistance_ohm, 1e-6, "infinite spacing");
  // Length sits outside the logarithm, diameter inside it.
  assert.ok(Math.abs(r.alternative_length_change_pct) > Math.abs(r.alternative_diameter_change_pct));
});

test("rectifier: Ohm's law around the circuit, and AC input is DC output over efficiency", () => {
  const r = computeCpRectifierSizing({ design_current_a: 10, bed_resistance_ohm: 1.64, header_length_ft: 500, negative_length_ft: 300, cable_ohm_per_kft: 0.2485, back_emf_v: 2, design_margin_pct: 50, rectifier_efficiency_pct: 60, energy_rate_per_kwh: 0.12 });
  close(r.required_voltage_v, 10 * (1.64 + 0.8 * 0.2485) + 2, "required voltage");
  close(r.design_voltage_v, 1.5 * r.required_voltage_v, "margin");
  close(r.ac_input_w * 0.6, r.dc_output_w, "efficiency");
  close(r.annual_kwh, r.ac_input_w * 8760 / 1000, "a year of continuous operation");
});

test("pipeline attenuation: the half-shift distance halves the shift, and a quartered coating doubles attenuation", () => {
  const base = { pipe_od_in: 12.75, wall_thickness_in: 0.25, steel_resistivity_ohm_in: 7.1e-6, coating_resistance_ohm_sqft: 100000, drain_shift_v: 0.3, distance_mi: 5, degraded_coating_resistance_ohm_sqft: 25000 };
  const r = computePipelinePotentialAttenuation(base);
  const atHalf = computePipelinePotentialAttenuation({ ...base, distance_mi: r.half_shift_mi });
  close(atHalf.shift_at_distance_v, 0.15, "half shift");
  close(r.attenuation_rise_factor, 2, "sqrt of the coating factor");
  close(r.steel_area_sqin, Math.PI * (12.75 - 0.25) * 0.25, "thin-wall ring area");
});

test("instant-off and polarisation decay: the IR drop and the criteria are the stated differences", () => {
  const off = computeInstantOffIrDrop({ on_potential_v: -1.15, instant_off_potential_v: -0.88, native_potential_v: -0.62, criterion_v: -0.85, polarization_criterion_mv: 100 });
  within(off.ir_drop_mv, 270, 1e-9, "IR drop");
  within(off.off_margin_mv, 30, 1e-9, "instant-off margin");
  assert.equal(off.meets_absolute_criterion, true);
  const decay = computePolarizationDecayCriterion({ on_potential_v: -1.05, instant_off_potential_v: -0.78, native_potential_v: -0.65, depolarized_potential_v: -0.67, criterion_v: -0.85, polarization_criterion_mv: 100 });
  // Fails -850 mV and still protected on 110 mV of decay.
  assert.equal(decay.absolute_passes, false);
  within(decay.decay_mv, 110, 1e-9, "decay");
  assert.equal(decay.protected_under_either, true);
});

test("coating breakdown follows the DNV-RP-B401 linear model, capped at bare steel", () => {
  const base = { surface_sqft: 50000, bare_current_density_ma_per_sqft: 2, initial_breakdown_pct: 2, annual_degradation_pct: 2, design_life_years: 30, fast_degradation_pct: 4 };
  const r = computeCoatingBreakdownFactor(base);
  close(r.final_breakdown, 0.02 + 0.02 * 30, "final factor a + b t");
  close(r.mean_breakdown, 0.02 + 0.02 * 15, "mean factor a + b t / 2");
  close(r.final_current_a, 100 * r.final_breakdown, "current = bare current x factor");
  const worn = computeCoatingBreakdownFactor({ ...base, annual_degradation_pct: 10 });
  assert.equal(worn.final_breakdown, 1, "no structure is more than bare");
});

test("stray-current bond: the chosen resistor passes exactly the target current", () => {
  const r = computeStrayCurrentBond({ open_circuit_v: 0.45, solid_bond_current_a: 8.5, target_bond_current_a: 3, interference_shift_mv: 250, rating_margin_factor: 5 });
  close(0.45 / (r.circuit_resistance_ohm + r.resistor_ohm), 3, "target current");
  close(r.dissipation_w, 9 * r.resistor_ohm, "I squared R");
});

test("tank bottom grid: no point on the bottom is farther from a ribbon than the tile says", () => {
  // Brute force over the disc: the distance from each point to the nearest
  // chord. Near the rim the chords shorten, so points at the ends of a band
  // between two lines -- and the rim beyond the last line -- sit farther than
  // half a spacing from any ribbon.
  const farthestByScan = (diameter, spacing) => {
    const R = diameter / 2;
    const lines = [];
    for (let y = spacing / 2; y < R; y += spacing) lines.push(y, -y);
    const toChord = (px, py, y) => {
      const half = Math.sqrt(R * R - y * y);
      const dx = Math.max(0, Math.abs(px) - half);
      return Math.hypot(dx, py - y);
    };
    const nearest = (x, y) => Math.min(...lines.map((ly) => toChord(x, y, ly)));
    let worst = 0;
    const step = diameter / 300;
    for (let x = -R; x <= R; x += step) {
      for (let y = -R; y <= R; y += step) {
        if (x * x + y * y <= R * R) worst = Math.max(worst, nearest(x, y));
      }
    }
    // The rim, where the worst points live, sampled far finer than the grid.
    for (let i = 0; i < 20000; i++) {
      const a = 2 * Math.PI * i / 20000;
      worst = Math.max(worst, nearest(R * Math.cos(a), R * Math.sin(a)));
    }
    return worst;
  };
  for (const [diameter, spacing] of [[100, 10], [70, 10], [48, 20], [30, 25], [200, 5]]) {
    const r = computeTankBottomAnodeLayout({ tank_diameter_ft: diameter, current_density_ma_per_sqft: 1, grid_spacing_ft: spacing, ribbon_rating_ma_per_ft: 30 });
    within(r.grid_to_farthest_ft, farthestByScan(diameter, spacing), 0.5, `${diameter} ft tank at ${spacing} ft`);
  }
});

test("tank bottom: the ribbon loading carries the whole bottom's current", () => {
  const r = computeTankBottomAnodeLayout({ tank_diameter_ft: 100, current_density_ma_per_sqft: 1, grid_spacing_ft: 10, ribbon_rating_ma_per_ft: 30 });
  close(r.grid_loading_ma_per_ft * r.grid_ribbon_ft, Math.PI * 2500, "grid");
  close(r.ring_loading_ma_per_ft * r.ring_ribbon_ft, Math.PI * 2500, "ring");
});

test("close interval survey: halving the interval doubles the readings", () => {
  const r = computeCloseIntervalSurveyReadings({ survey_length_mi: 10, reading_interval_ft: 2.5, readings_per_station: 2, spool_length_ft: 5000, production_mi_per_day: 2.5, seconds_per_reading: 1.5, crew_day_hours: 8, test_station_spacing_mi: 1, alternative_interval_ft: 5 });
  assert.equal(r.data_points, r.reading_count * 2);
  assert.equal(r.reading_count, 2 * r.alternative_reading_count);
});

test("AC corrosion: the voltage the tile calls the threshold produces exactly the threshold density", () => {
  const base = { induced_ac_v: 15, soil_resistivity_ohm_m: 25, holiday_area_cm2: 1, touch_limit_v: 15, risk_threshold_a_per_m2: 30, alternative_resistivity_ohm_m: 100 };
  const r = computeAcInducedVoltagePipeline(base);
  const atThreshold = computeAcInducedVoltagePipeline({ ...base, induced_ac_v: r.voltage_for_threshold_v });
  close(atThreshold.ac_current_density_a_per_m2, 30, "threshold");
  // J = 8 V / (rho pi d) with a 1 cm^2 holiday of diameter 11.28 mm.
  within(r.ac_current_density_a_per_m2, 8 * 15 / (25 * Math.PI * Math.sqrt(4e-4 / Math.PI)), 1e-9, "spreading resistance");
  close(r.alternative_current_density_a_per_m2, r.ac_current_density_a_per_m2 / 4, "four times the resistivity");
});

test("coke breeze: the column is the anode plus the backfill", () => {
  const r = computeCokeBreezeBackfill({ hole_diameter_in: 8, hole_depth_ft: 10, anode_diameter_in: 2, anode_length_ft: 5, anode_count: 10, backfill_density_pcf: 70, bag_weight_lb: 50, waste_pct: 10, soil_resistivity_ohm_cm: 5000 });
  close(r.backfill_ft3_per_anode + r.anode_ft3, r.column_ft3, "volume balance");
  close(r.column_ft3, Math.PI / 4 * (8 / 12) ** 2 * 10, "column");
  assert.ok(r.bag_count_with_waste >= r.bag_count);
  // Doubling the depth buys more than widening the hole by a quarter.
  assert.ok(Math.abs(r.deeper_change_pct) > Math.abs(r.wider_change_pct));
});
