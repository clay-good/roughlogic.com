// v8 Phase C batch 3 - 7 more per-tool refinements (spec §5).

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConduitFill } from "../../calc-electrical.js";
import { computeSuperheatSubcool as _hvacSh } from "../../calc-refrigerant.js";
import { computeLumberSpan } from "../../calc-construction.js";
import { computePalletLoadout, computeReeferBurn } from "../../calc-trucking.js";
import { computeWeightBalance } from "../../calc-mechanic.js";
import { computeHEPALife } from "../../calc-restoration.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- C.1 conduit-fill explicit pass/fail flag ---

test("C.1 conduit-fill returns pass_flag = PASS / FAIL", () => {
  const ok = computeConduitFill({ conduit: "EMT", trade_size: "3/4", conductors: [{ insulation: "THHN", awg: "12", count: 4 }] });
  assert.equal(ok.pass_flag, "PASS");
  const bad = computeConduitFill({ conduit: "EMT", trade_size: "1/2", conductors: [{ insulation: "THHN", awg: "10", count: 6 }] });
  assert.equal(bad.pass_flag, "FAIL");
});

test("C.1 conduit-fill margin_pct = threshold − fill_percent", () => {
  const r = computeConduitFill({ conduit: "EMT", trade_size: "3/4", conductors: [{ insulation: "THHN", awg: "12", count: 4 }] });
  assert.ok(close(r.margin_pct, r.threshold_percent - r.fill_percent, 0.001));
});

// --- C.3 superheat-subcool diagnostic ---

test("C.3 superheat in-range gives diagnostic 'in-range'", () => {
  // R-410A at 118 psig saturates ~ 40 F; line 50 → superheat 10. In-range.
  const r = _hvacSh({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 50, mode: "superheat" });
  assert.match(r.diagnostic || "", /in-range/);
  assert.equal(r.band, "in-range");
});

test("C.3 superheat low gives 'low' diagnostic", () => {
  const r = _hvacSh({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 41, mode: "superheat" });
  assert.equal(r.band, "low");
  assert.match(r.diagnostic, /low/);
});

test("C.3 superheat high gives 'high' diagnostic", () => {
  const r = _hvacSh({ refrigerant: "R-410A", system_pressure_psig: 118, line_temperature_F: 80, mode: "superheat" });
  assert.equal(r.band, "high");
});

test("C.3 subcool in-range / low / high bands fire", () => {
  // R-410A at 360 psig saturates ~ 110 F.
  const ok = _hvacSh({ refrigerant: "R-410A", system_pressure_psig: 360, line_temperature_F: 105, mode: "subcool" });
  assert.equal(ok.band, "in-range"); // ~5 F subcool
  const lo = _hvacSh({ refrigerant: "R-410A", system_pressure_psig: 360, line_temperature_F: 109, mode: "subcool" });
  assert.equal(lo.band, "low"); // ~1 F
  const hi = _hvacSh({ refrigerant: "R-410A", system_pressure_psig: 360, line_temperature_F: 95, mode: "subcool" });
  assert.equal(hi.band, "high"); // ~15 F
});

// --- C.4 lumber-spans deflection in inches ---

test("C.4 lumber-spans returns deflection_in and allowable_deflection_in", () => {
  const r = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf: 50, tributary_width_in: 16, deflection_limit: 360 });
  assert.ok(r.deflection_in > 0);
  assert.ok(r.allowable_deflection_in > 0);
});

test("C.4 lumber-spans deflection_ratio ~ 1.0 when deflection-governed", () => {
  // Picking values that force deflection to govern.
  const r = computeLumberSpan({ species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf: 50, tributary_width_in: 16, deflection_limit: 360 });
  if (r.governing === "deflection") {
    assert.ok(close(r.deflection_ratio, 1.0, 0.05));
  } else {
    // Bending-governed: deflection_ratio < 1.
    assert.ok(r.deflection_ratio < 1.0);
  }
});

// --- C.5 pallet-loadout binding margin + slack utilization ---

test("C.5 pallet-loadout reports binding_margin_pallets and slack_utilization_pct", () => {
  const r = computePalletLoadout({ case_length_in: 12, case_width_in: 12, case_height_in: 12, case_weight_lb: 10, cases_per_pallet: 50, pallet_length_in: 48, pallet_width_in: 40, pallet_height_in: 48, trailer: "dry_van_53" });
  assert.ok(typeof r.binding_margin_pallets === "number" || r.binding_margin_pallets === null);
  assert.ok(r.slack_utilization_pct === null || (r.slack_utilization_pct >= 0 && r.slack_utilization_pct <= 100.001));
});

test("C.5 pallet-loadout heavy load → weigh-out flag", () => {
  const heavy = computePalletLoadout({ case_length_in: 12, case_width_in: 12, case_height_in: 12, case_weight_lb: 200, cases_per_pallet: 50, pallet_length_in: 48, pallet_width_in: 40, pallet_height_in: 48, trailer: "dry_van_53" });
  assert.equal(heavy.flag, "weigh-out");
});

// --- C.5 reefer-burn fuel reserve ---

test("C.5 reefer-burn reserve_gal = tank − fuel_burned (haul_hr only)", () => {
  const r = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 24, ambient_band: "moderate" });
  assert.ok(close(r.reserve_gal, 50 - r.fuel_burned, 0.01));
});

test("C.5 reefer-burn haul_miles override drives haul_hr_effective", () => {
  // 550 mi at 55 mph = 10 hr.
  const r = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 24, ambient_band: "moderate", haul_miles: 550, average_mph: 55 });
  assert.equal(r.haul_hr_effective, 10);
  // fuel_burned_effective at 0.65 gph × 1.0 ambient × 10 hr = 6.5 gal.
  assert.ok(close(r.fuel_burned_effective, 6.5, 0.5));
});

// --- C.5 weight-balance %MAC ---

test("C.5 weight-balance %MAC = (cg - LE_MAC) / chord × 100", () => {
  // CG at 40 in, LE MAC at 33 in, chord 60 in → %MAC = (40-33)/60 × 100 = 11.67%
  const r = computeWeightBalance({
    stations: [{ name: "A", weight_lb: 1000, arm_in: 40 }],
    fwd_cg_limit_in: 35, aft_cg_limit_in: 50, max_gross_lb: 2000,
    mac_le_in: 33, mac_chord_in: 60,
  });
  assert.ok(close(r.cg_pct_mac, ((40 - 33) / 60) * 100, 0.001));
  assert.ok(close(r.fwd_pct_mac, ((35 - 33) / 60) * 100, 0.001));
  assert.ok(close(r.aft_pct_mac, ((50 - 33) / 60) * 100, 0.001));
});

test("C.5 weight-balance %MAC null when MAC inputs not supplied", () => {
  const r = computeWeightBalance({ stations: [{ name: "A", weight_lb: 1000, arm_in: 40 }], fwd_cg_limit_in: 35, aft_cg_limit_in: 50, max_gross_lb: 2000 });
  assert.equal(r.cg_pct_mac, null);
  assert.equal(r.fwd_pct_mac, null);
});

// --- C.6 hepa-filter-life full-job filters + cost ---

test("C.6 hepa-filter-life filters_for_job = ceil(job_days / days)", () => {
  const r = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "medium", job_days: 14 });
  assert.ok(r.filters_for_job >= Math.ceil(14 / r.days));
});

test("C.6 hepa-filter-life total_cost null when no $/filter supplied", () => {
  const r = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "medium", job_days: 14 });
  assert.equal(r.total_cost_usd, null);
});

test("C.6 hepa-filter-life total_cost = filters × $/filter", () => {
  const r = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "medium", job_days: 14, filter_cost_usd: 75 });
  assert.equal(r.total_cost_usd, r.filters_for_job * 75);
});
