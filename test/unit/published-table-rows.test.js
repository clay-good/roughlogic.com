// Rows of published tables (and definitions) that no pinned example touched,
// each found 2026-09-19 by re-deriving worked examples: NEC 220.55 / 220.54
// past their bundled counts, three-phase line current, NOI without interest,
// a paid-off mortgage, the 2025 Pub 15-T schedule, and OSHA's 4:1 rule.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRangeDemand22055, computeDryerDemand22054, computeCommercialLightingLoad } from "../../calc-service.js";
import { computeRentalWorksheet, computeRentVsBuy, rentVsBuyExample } from "../../calc-realestate.js";
import { computePayrollWithholding } from "../../calc-accounting.js";
import { computeLadderAngle } from "../../calc-cross.js";

test("NEC Table 220.55 Column C continues past 16 ranges", () => {
  const col = (n) => computeRangeDemand22055({ num_ranges: n, nameplate_kw: 12 }).col_c_kw;
  assert.deepEqual([1, 5, 6, 16, 17, 25, 26, 40].map(col), [8, 20, 21, 31, 32, 40, 41, 55]);
  assert.equal(col(41), 25 + 0.75 * 41);
  assert.equal(col(50), 62.5);
});

test("NEC Table 220.54 dryer factors: 47% - 1%/dryer over 11, 35% - 0.5%/dryer over 23, 25% at 43+", () => {
  const f = (n) => computeDryerDemand22054({ num_dryers: n, nameplate_w: 5000 }).demand_factor;
  assert.equal(f(11), 0.47);
  assert.equal(f(12), 0.46);
  assert.equal(f(15), 0.43);
  assert.equal(f(23), 0.35);
  assert.ok(Math.abs(f(24) - 0.345) < 1e-12);
  assert.ok(Math.abs(f(42) - 0.255) < 1e-12);
  assert.equal(f(43), 0.25);
  assert.equal(f(100), 0.25);
});

test("commercial lighting: 208 V three-phase line current carries sqrt(3); single-phase does not", () => {
  const base = { floor_area_ft2: 5000, unit_load_va_ft2: 3, receptacle_count: 60, supply_v: 208 };
  const three = computeCommercialLightingLoad(base);
  assert.ok(Math.abs(three.total_a - 25400 / (Math.sqrt(3) * 208)) < 1e-9);
  const one = computeCommercialLightingLoad({ ...base, supply_v: 240, phases: 1 });
  assert.ok(Math.abs(one.total_a - 25400 / 240) < 1e-9);
});

test("rental worksheet: NOI excludes interest; taxable income deducts it; other_expenses is read", () => {
  const r = computeRentalWorksheet({ monthly_rent: 2000, vacancy_pct: 0, insurance: 1000, mortgage_interest: 6000, other_expenses: 500, property_value: 300000, cash_invested: 60000 });
  assert.equal(r.total_expenses, 7500);
  assert.equal(r.NOI, 24000 - 1500);
  assert.equal(r.taxable_rental_income, 24000 - 7500);
  assert.ok(Math.abs(r.cap_rate_pct - 22500 / 300000 * 100) < 1e-12);
  assert.ok(Math.abs(r.cash_on_cash_pct - 16500 / 60000 * 100) < 1e-12);
  assert.ok(Math.abs(r.expense_ratio_pct - 1500 / 24000 * 100) < 1e-12);
});

test("rent-vs-buy: no P&I after the loan is paid off", () => {
  const base = { ...rentVsBuyExample.inputs, term_years: 15 };
  const at15 = computeRentVsBuy({ ...base, holding_years: 15 });
  const at20 = computeRentVsBuy({ ...base, holding_years: 20 });
  // Years 16-20 add only tax / insurance / HOA / maintenance, never P&I.
  const i = Number(base.investment_return_pct ?? 5) / 100;
  const nonPI = at15.annual_ownership - at15.monthly_pi * 12;
  let extra = 0;
  for (let t = 16; t <= 20; t++) extra += nonPI / Math.pow(1 + i, t);
  const saleDelta = at20.net_sale / Math.pow(1 + i, 20) - at15.net_sale / Math.pow(1 + i, 15);
  assert.ok(Math.abs(at20.npv_buy - (at15.npv_buy + extra - saleDelta)) < 1e-6);
});

test("Pub 15-T: 2025 Worksheet 1A single schedule, 2024 kept by tax_year", () => {
  const y25 = computePayrollWithholding({ gross_per_period: 1500, pay_frequency: "biweekly", filing_status: "single", tax_year: 2025 });
  assert.ok(Math.abs(y25.fed_income_tax_annual - 2641.5) < 1e-9);
  const y24 = computePayrollWithholding({ gross_per_period: 1500, pay_frequency: "biweekly", filing_status: "single", tax_year: 2024 });
  assert.ok(Math.abs(y24.fed_income_tax_annual - (1160 + (39000 - 26200) * 0.12)) < 1e-9);
  // Below the $15,000 (2025) floor nothing is withheld.
  assert.equal(computePayrollWithholding({ gross_per_period: 1250, pay_frequency: "monthly", filing_status: "single", tax_year: 2025 }).fed_income_tax_annual, 0);
});

test("OSHA 1926.1053(b)(5)(i): the foot sits a quarter of the working length out", () => {
  assert.equal(computeLadderAngle({ ladder_length_ft: 16, working_height_ft: 12 }).base_distance_ft, 4);
  assert.equal(computeLadderAngle({ ladder_length_ft: 28, working_height_ft: 27 }).base_distance_ft, 7);
});

test("range-demand-220-55: under 8.75 kW takes Column A/B (80% for one), never Column C's 8 kW", async () => {
  const { computeRangeDemand22055 } = await import("../../calc-service.js");
  assert.ok(Math.abs(computeRangeDemand22055({ num_ranges: 1, nameplate_kw: 3 }).demand_kw - 2.4) < 1e-9);
  assert.ok(Math.abs(computeRangeDemand22055({ num_ranges: 1, nameplate_kw: 7 }).demand_kw - 5.6) < 1e-9);
  assert.equal(computeRangeDemand22055({ num_ranges: 1, nameplate_kw: 12 }).demand_kw, 8);
  // Several appliances under 8.75 kW take Column A/B's percentage for the count (added 2026-10-09):
  // 2 x 7 kW in Column B at 65% = 9.1 kW; 10 x 3 kW in Column A at 49% = 14.7 kW.
  assert.ok(Math.abs(computeRangeDemand22055({ num_ranges: 2, nameplate_kw: 7 }).demand_kw - 9.1) < 1e-9);
  assert.ok(Math.abs(computeRangeDemand22055({ num_ranges: 10, nameplate_kw: 3 }).demand_kw - 14.7) < 1e-9);
  assert.equal(computeRangeDemand22055({ num_ranges: 10, nameplate_kw: 6 }).column_pct, 34);
  assert.equal(computeRangeDemand22055({ num_ranges: 9, nameplate_kw: 8 }).column_pct, 35);
  assert.equal(computeRangeDemand22055({ num_ranges: 4, nameplate_kw: 6 }).column_pct, 50);
  assert.equal(computeRangeDemand22055({ num_ranges: 61, nameplate_kw: 6 }).column_pct, 16);
  assert.equal(computeRangeDemand22055({ num_ranges: 61, nameplate_kw: 3 }).column_pct, 30);
  assert.ok(computeRangeDemand22055({ num_ranges: 2, nameplate_kw: 1 }).error);
});

test("structured-cabling-channel: Table G.2 ends at 60 C; a hotter space is not given the 60 C row", async () => {
  const { computeStructuredCablingChannel } = await import("../../calc-lowvoltage.js");
  assert.equal(computeStructuredCablingChannel({ permanent_link_m: 75, cords_m: 5, temp_c: 60 }).max_pl_m, 75);
  assert.ok(computeStructuredCablingChannel({ permanent_link_m: 75, cords_m: 5, temp_c: 65 }).error);
  assert.ok(computeStructuredCablingChannel({ permanent_link_m: 75, cords_m: 5, temp_c: 80, derate_per_c: 0.002 }).error);
});

test("blast-burden-spacing stemming meets blast-stemming-length's 20-diameter floor; rock-bolt flags spans past the table", async () => {
  const m = await import("../../calc-mining.js");
  const b = m.computeBlastBurdenSpacing({ hole_diameter_in: 6, bench_height_ft: 40 });
  assert.equal(b.stemming_ft, 10);
  const s = m.computeBlastStemmingLength({ hole_diameter_in: 6, burden_ft: b.burden_ft, proposed_stemming_ft: b.stemming_ft });
  assert.equal(s.meets_governing, true);
  const bolt = { bolt_capacity_lb: 12000, spacing_1_ft: 4, spacing_2_ft: 4, rock_unit_weight_pcf: 165, loosened_zone_ft: 6, target_support_psf: 990 };
  assert.equal(m.computeRockBoltSupportPressure({ ...bolt, span_ft: 100 }).span_beyond_table, false);
  assert.equal(m.computeRockBoltSupportPressure({ ...bolt, span_ft: 150 }).span_beyond_table, true);
});

test("greenhouse-vent-area reports the floor-area rule beside one air change per minute; they meet at 8 ft", async () => {
  const { computeGreenhouseVentArea } = await import("../../calc-greenhouse.js");
  const base = { house_width_ft: 30, house_length_ft: 96, roof_vent_pct: 15, side_vent_pct: 15, design_temp_difference_f: 10, mild_temp_difference_f: 5, discharge_coefficient: 0.6 };
  const flat = computeGreenhouseVentArea({ ...base, gutter_height_ft: 6, ridge_height_ft: 10 });
  assert.equal(flat.floor_rule_cfm, 8 * 2880);
  assert.ok(Math.abs(flat.target_airflow_cfm - flat.floor_rule_cfm) < 1e-9);
  const tall = computeGreenhouseVentArea({ ...base, gutter_height_ft: 12, ridge_height_ft: 18 });
  assert.ok(tall.target_airflow_cfm > tall.floor_rule_cfm);
});

test("welder-arc-circuit-conductor: NEC Table 630.11(A) motor-generator column, higher than the nonmotor one", async () => {
  const { computeWelderArcCircuitConductor: w } = await import("../../calc-electricalfield.js");
  const mg = (d) => w({ primary_current_a: 40, duty_pct: d, welder_type: "motor_generator" }).duty_multiplier;
  for (const [d, m] of [[100, 1.0], [90, 0.96], [80, 0.91], [70, 0.86], [60, 0.81], [50, 0.75], [40, 0.69], [30, 0.62], [20, 0.55], [10, 0.55]]) assert.ok(Math.abs(mg(d) - m) < 1e-12, `${d}%`);
  assert.ok(Math.abs(mg(55) - 0.78) < 1e-12);
  assert.equal(w({ primary_current_a: 40, duty_pct: 50, welder_type: "motor_generator" }).effective_current_a, 30);
  assert.ok(Math.abs(w({ primary_current_a: 40, duty_pct: 50 }).effective_current_a - 28.4) < 1e-9);
  assert.ok(w({ primary_current_a: 40, duty_pct: 50, welder_type: "engine" }).error);
});

test("asme-head-thickness: Appendix 1-4 K and M factors for non-standard heads; standard heads keep UG-32", async () => {
  const { computeAsmeHeadThickness: h } = await import("../../calc-steampressure.js");
  const b = { design_pressure_psi: 150, inside_diameter_in: 48, allowable_stress_psi: 17500, joint_efficiency: 0.85, corrosion_allowance_in: 0.0625 };
  const std = h({ ...b, head_type: "ellipsoidal" }).t_required_in;
  assert.equal(h({ ...b, head_type: "ellipsoidal", ellipse_ratio: 2 }).t_required_in, std);
  // Table 1-4.1 lists K = 1.37 at D/2h = 2.5; the formula gives 1.375.
  assert.ok(Math.abs(h({ ...b, head_type: "ellipsoidal", ellipse_ratio: 2.5 }).t_required_in / std - 1.375) < 1e-12);
  // The standard F&D 0.885 form and Appendix 1-4 at r = 0.06 L agree to within 0.05%.
  const fd = h({ ...b, head_type: "torispherical" }).t_required_in;
  assert.ok(Math.abs(h({ ...b, head_type: "torispherical", knuckle_ratio: 0.06000001 }).t_required_in / fd - 1) < 5e-4);
  // A larger knuckle thins the head; the 6% floor and the 1-to-3 ellipse range are enforced.
  assert.ok(h({ ...b, head_type: "torispherical", knuckle_ratio: 0.1 }).t_required_in < fd);
  assert.ok(h({ ...b, head_type: "torispherical", knuckle_ratio: 0.03 }).error);
  assert.ok(h({ ...b, head_type: "ellipsoidal", ellipse_ratio: 3.5 }).error);
});
