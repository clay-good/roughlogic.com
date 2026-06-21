// spec-v21 Public-Surface Hardening II — Concrete Defect Register.
// One red-then-green regression per DR-NN (and AF-01), naming its v18 defect
// class and the contract clause it violates. Each asserts the post-fix
// behavior: a domain-undefined input returns { error } (RC-1), a degenerate
// case returns null (not +/-Infinity, RC-2), and corrected math holds.
import { test } from "node:test";
import assert from "node:assert/strict";

import { gammainc, gammaln, chi2Cdf } from "../../pure-math.js";
import { computeLumberSpan, computeBeamLoading } from "../../calc-construction.js";
import {
  computeRequiredFireFlow, computeIsoNeededFireFlow, computeMasterStreamReach,
  computeLadderPipeReach, computeFoam, computeAerialLadderReach,
  computePDP, computeReverseLayFriction,
} from "../../calc-fire.js";
import { computeStaticPressureLossPiping } from "../../calc-plumbing.js";
import { computeAmortization, computeInventoryTurnover } from "../../calc-accounting.js";
import { computePerDiemInterest } from "../../calc-realestate.js";
import { computeDilution as computeLabDilution } from "../../calc-lab.js";
import { computeSRTandFM, computeDilution as computeWaterDilution } from "../../calc-water.js";
import { computeLinearRegression, computePearson, computeBaseConvert } from "../../calc-edu.js";
import { computeTimeAndMaterials, computeMaterialCost } from "../../calc-cross.js";
import { computePercentileBands } from "../../calc-historical.js";
import { computeBridgeFormula } from "../../calc-trucking.js";
import { computeSolarTimes } from "../../calc-field.js";
import { computeDryingLog } from "../../calc-restoration.js";

// --- 3.1 pure-math.js ---

test("DR-01 (D-7/C-1): gammainc(a, +Inf) -> 1 and chi2Cdf(Inf, df) -> 1", () => {
  assert.equal(gammainc(2, Infinity), 1);
  assert.equal(chi2Cdf(Infinity, 5), 1);
});

test("DR-02 (D-7/C-1): gammaln(-0.5) is finite log|Gamma| ~ 1.2655", () => {
  const v = gammaln(-0.5);
  assert.ok(Number.isFinite(v));
  assert.ok(Math.abs(v - 1.2655121234846454) < 1e-9);
});

// --- 3.2 construction, fire ---

test("DR-03 (D-1/C-1): computeLumberSpan zero load -> { error }", () => {
  const r = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf: 0 });
  assert.ok(r.error);
});

test("DR-04 (D-1/C-1): computeBeamLoading zero depth / zero E -> { error }", () => {
  assert.ok(computeBeamLoading({ load_type: "uniform", load_value: 100, length_ft: 10, E_psi: 1600000, b_in: 1.5, d_in: 0 }).error);
  assert.ok(computeBeamLoading({ load_type: "uniform", load_value: 100, length_ft: 10, E_psi: 0, b_in: 1.5, d_in: 9.25 }).error);
});

test("DR-05 (D-1/C-1): computeRequiredFireFlow negative area -> { error }; parity with ISO sibling", () => {
  assert.ok(computeRequiredFireFlow({ structure_area_ft2: -5000 }).error);
  // Parity: the sibling solver also guards a non-positive area.
  assert.ok(computeIsoNeededFireFlow({ area_ft2: -5000, construction_class: 3 }).error);
});

test("DR-06 (D-1/C-1): computeMasterStreamReach negative pressure -> { error }; no NaN into ladder pipe", () => {
  assert.ok(computeMasterStreamReach({ nozzle_type: "smooth_bore_2", nozzle_pressure_psi: -10 }).error);
  const lp = computeLadderPipeReach({ angle_deg: 70, extension_ft: 100, nozzle_type: "smooth_bore_2", nozzle_pressure_psi: -10 });
  assert.ok(lp.error);
});

test("DR-07 (D-2/C-3): computeFoam negative area -> { error }", () => {
  assert.ok(computeFoam({ fire_area_ft2: -1500 }).error);
});

test("DR-08 (D-2/C-3): aerial/PDP/reverse-lay reject negatives", () => {
  assert.ok(computeAerialLadderReach({ angle_deg: 70, extension_ft: -10 }).error);
  assert.ok(computePDP({ nozzle_pressure_psi: -1, friction_loss_psi: 25 }).error);
  assert.ok(computeReverseLayFriction({ hose_diameter: "5_in", gpm: -1, length_ft: 1000 }).error);
});

// --- plumbing ---

test("DR-09 (D-2/C-3): computeStaticPressureLossPiping non-positive density -> { error }", () => {
  assert.ok(computeStaticPressureLossPiping({ elevation_change_ft: 30, fluid_density_lb_ft3: 0 }).error);
  assert.ok(computeStaticPressureLossPiping({ elevation_change_ft: 30, fluid_density_lb_ft3: -1 }).error);
});

// --- 3.3 finance and calendar ---

test("DR-10 (D-5/C-1): computeAmortization keeps the last-day-of-month convention through Feb", () => {
  const r = computeAmortization({ principal: 250000, annual_rate_pct: 6, term_months: 12, first_payment_date: "2025-01-31" });
  const dates = r.schedule.map((row) => row.date);
  // Jan 31 -> Feb 28 (clamped) -> Mar 31 -> Apr 30 -> ... never overflowing into the next month.
  assert.equal(dates[0], "2025-01-31");
  assert.equal(dates[1], "2025-02-28");
  assert.equal(dates[2], "2025-03-31");
  assert.equal(dates[3], "2025-04-30");
  // No payment day ever lands on the 1st-3rd from an overflow.
  for (const d of dates) assert.ok(!/-0[123]$/.test(d), `payment date ${d} drifted past month end`);
});

test("DR-11 (D-7/C-1): computeInventoryTurnover zero COGS -> DSI null, not Infinity", () => {
  const r = computeInventoryTurnover({ cogs: 0, beginning_inventory: 250000, ending_inventory: 270000, period_days: 365 });
  assert.equal(r.days_sales_of_inventory, null);
  assert.ok(typeof r.dsi_note === "string");
});

test("DR-12 (D-5/C-1): computePerDiemInterest 30/360 close on the 31st accrues 1 inclusive day", () => {
  const r = computePerDiemInterest({ loan_amount: 300000, annual_rate_pct: 6, closing_date_iso: "2025-01-31", day_count: "thirty360" });
  assert.equal(r.days_to_eom, 1);
});

test("DR-16 (D-3/C-1): lab computeDilution v1 > v2 -> flagged, no negative diluent", () => {
  const r = computeLabDilution({ c1: 1, v1: 10, c2: 2, v2: 5 });
  assert.equal(r.diluent_volume, null);
  assert.ok(/concentration step/i.test(r.flag));
});

// --- 3.5 the remainder ---

test("DR-17 (D-1/C-1): water computeSRTandFM zero outflow -> srt_days null", () => {
  const r = computeSRTandFM({ aeration_volume_gal: 1500000, mlss_mg_l: 2500, mlvss_mg_l: 1900, was_flow_mgd: 0, was_tss_mg_l: 0, effluent_flow_mgd: 0, effluent_tss_mg_l: 0, bod_load_lb_day: 6000 });
  assert.equal(r.srt_days, null);
});

test("DR-18 (D-7/C-3): water computeDilution all-positive -> { error }; one blank solved", () => {
  assert.ok(computeWaterDilution({ c1: 1000, v1: 10, c2: 50, v2: 100, mode: "single" }).error);
  assert.ok(computeWaterDilution({ c1: 1000, v1: -1, c2: 50, v2: 100, mode: "single" }).error);
  const solved = computeWaterDilution({ c1: 1000, v1: 0, c2: 50, v2: 100, mode: "single" });
  assert.ok(!solved.error);
  assert.ok(Math.abs(solved.v1 - 5) < 1e-9);
});

test("DR-20 (D-1/C-1): computeLinearRegression perfect fit -> t null + perfect_fit flag", () => {
  const r = computeLinearRegression({ x_values: [1, 2, 3, 4, 5], y_values: [2, 4, 6, 8, 10] });
  assert.equal(r.t, null);
  assert.equal(r.perfect_fit, true);
});

test("DR-21 (D-1/C-1): computePearson perfect correlation -> t null + perfect_fit flag", () => {
  const r = computePearson({ x_values: [1, 2, 3, 4, 5], y_values: [2, 4, 6, 8, 10] });
  assert.equal(r.t, null);
  assert.equal(r.perfect_fit, true);
});

test("DR-22 (D-6/C-6): computeBaseConvert above 2^53 is flagged, not silently truncated", () => {
  const wide = "1".repeat(64); // 64-bit-wide binary string, well above 2^53
  const r = computeBaseConvert({ value: wide, from_base: 2, to_base: 16 });
  assert.equal(r.exact, false);
  assert.ok(typeof r.precision_warning === "string");
  // A small value round-trips exactly.
  assert.equal(computeBaseConvert({ value: "FF", from_base: 16, to_base: 2 }).exact, true);
});

test("DR-23 (D-2/C-1): computeTimeAndMaterials non-numeric arg -> { error }, never NaN", () => {
  const r = computeTimeAndMaterials({ hours: undefined, labor_rate_per_hour: 95, material_cost: 250 });
  assert.ok(r.error);
  const ok = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour: 95, material_cost: 250, overhead_percent: 15, profit_percent: 10 });
  assert.ok(!ok.error && Number.isFinite(ok.total));
});

test("DR-24 (D-2/C-3): computeMaterialCost negative fee / tax -> { error }", () => {
  assert.ok(computeMaterialCost({ unit_price: 12.5, quantity: 80, tax_rate_percent: 8.25, delivery_fee: -50 }).error);
  assert.ok(computeMaterialCost({ unit_price: 12.5, quantity: 80, tax_rate_percent: -1 }).error);
});

test("DR-25 (D-1/C-1): computePercentileBands non-numeric latest -> { error }", () => {
  const points = [
    { date: "2025-01-01", value: 10 },
    { date: "2025-02-01", value: 12 },
    { date: "2025-03-01", value: 11 },
    { date: "2025-04-01", value: "n/a" }, // non-numeric -> Number(...) === NaN
  ];
  const r = computePercentileBands({ points, lookback_months: 12 });
  assert.ok(r.error);
});

test("DR-26 (D-2/C-1): computeBridgeFormula string-element weights stay finite", () => {
  const r = computeBridgeFormula({ axle_weights_lb: [12000, "34000", 34000], axle_spacings_ft: [4, 30] });
  assert.ok(!r.error);
  assert.ok(Number.isFinite(r.total_weight_lb));
  for (const v of r.bridge_violations) assert.ok(!/NaN/.test(v), `bridge violation string leaked NaN: ${v}`);
});

test("DR-27 (D-1/C-1): computeSolarTimes daylight minutes are non-negative", () => {
  // Sweep a range of latitudes/dates near boundaries; daylight must never go negative.
  for (const lat of [-66, -23, 0, 23, 66]) {
    for (const date of ["2025-06-21", "2025-12-21", "2025-03-20"]) {
      const r = computeSolarTimes({ lat_deg: lat, lon_deg: 0, date_iso: date, tz_offset_hours: 0 });
      if (r.daylight_minutes !== null) {
        assert.ok(r.daylight_minutes >= 0, `negative daylight at lat=${lat} date=${date}: ${r.daylight_minutes}`);
      }
    }
  }
});

test("DR-28 (D-1/C-1): computeDryingLog flat-then-dipping series -> finite days_to_target", () => {
  const readings = [
    { day_index: 0, ambient_T_F: 75, ambient_RH: 50, chamber_T_F: 80, chamber_RH: 40 },
    { day_index: 1, ambient_T_F: 75, ambient_RH: 50, chamber_T_F: 80, chamber_RH: 40 },
    { day_index: 2, ambient_T_F: 75, ambient_RH: 50, chamber_T_F: 80, chamber_RH: 39 },
  ];
  const r = computeDryingLog({ readings });
  assert.ok(!r.error);
  assert.ok(r.days_to_target === null || Number.isFinite(r.days_to_target));
});

// --- 3.6 AF-01 accuracy flag (stage atmospheric absorption) ---

test("AF-01: atmospheric absorption humidity term matches ANSI S1.26 (no extra p_r/p_a factor)", async () => {
  const { _v9_atmosphericAbsorption } = await import("../../calc-stage.js");
  // Saturation vapor pressure (kPa), replicated from the module's ANSI S1.26 form.
  const satWaterKPa = (T) => 101.325 * Math.pow(10, -6.8346 * Math.pow(273.16 / T, 1.261) + 4.6151);
  const f = 1000, T_K = 293.15, h_r = 0.5, p_a = 80; // 80 kPa ~ 6,000 ft, non-sea-level
  const got = _v9_atmosphericAbsorption({ f_Hz: f, T_K, h_r, p_a_kPa: p_a });
  // Reference: recompute alpha with the canonical h = h_r*(p_sat/p_a)*100.
  const T_0 = 293.15, p_r = 101.325, p_sat = satWaterKPa(T_K);
  const h = h_r * (p_sat / p_a) * 100;
  const frO = (p_a / p_r) * (24 + 4.04e4 * h * ((0.02 + h) / (0.391 + h)));
  const frN = (p_a / p_r) * Math.pow(T_K / T_0, -0.5) * (9 + 280 * h * Math.exp(-4.170 * (Math.pow(T_K / T_0, -1 / 3) - 1)));
  const f2 = f * f;
  const term_class = 1.84e-11 * (p_r / p_a) * Math.sqrt(T_K / T_0);
  const term_O = 0.01275 * Math.exp(-2239.1 / T_K) / (frO + f2 / frO);
  const term_N = 0.1068 * Math.exp(-3352.0 / T_K) / (frN + f2 / frN);
  const expected = 8.686 * f2 * (term_class + Math.pow(T_K / T_0, -2.5) * (term_O + term_N));
  assert.ok(Math.abs(got - expected) < 1e-12, `alpha ${got} != canonical ${expected}`);
});
