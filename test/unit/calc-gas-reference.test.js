// The propane tiles of calc-gas.js (spec-v1686..v1690) against references the
// specs did not write: a horizontal tank's liquid geometry by numeric
// integration and at its closed-form points, the energy content of the gallon,
// and the identities the tiles' notes claim. These tiles' only worked-example
// rows recompute their own specs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePropaneVaporizationRate, computePropaneFillOutage, computePropaneRegulatorSizing,
  computeLpContainerSeparation, computePropaneRunTime,
} from "../../calc-gas.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const vapBase = { tank_diameter_ft: 3.5, tank_length_ft: 16, percent_full: 60, ambient_f: 20, liquid_temperature_f: -20, reference_capacity_btuh: 1000000, reference_percent_full: 60, reference_ambient_f: 60, connected_load_btuh: 500000 };

test("vaporization: capacity follows the wetted area, which at half full is half the shell plus a half-disc per head", () => {
  const R = 1.75, L = 16;
  // Half full: shell pi R L, two flat half-discs pi R^2.
  const half = computePropaneVaporizationRate({ ...vapBase, percent_full: 50, reference_percent_full: 50 });
  close(half.wetted_area_ft2, Math.PI * R * L + Math.PI * R * R, "half full");
  // Numeric check of the depth at 30% full: integrate the segment area.
  const r = computePropaneVaporizationRate({ ...vapBase, percent_full: 30 });
  const seg = (h) => { let a = 0; const n = 20000; for (let i = 0; i < n; i++) { const y = -R + (i + 0.5) * h / n; a += 2 * Math.sqrt(R * R - y * y) * h / n; } return a; };
  let lo = 0, hi = 2 * R;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (seg(m) < 0.3 * Math.PI * R * R) lo = m; else hi = m; }
  const h = (lo + hi) / 2, d = R - h, ang = Math.acos(d / R);
  within(r.wetted_area_ft2, 2 * R * ang * L + 2 * (R * R * ang - d * Math.sqrt(2 * R * h - h * h)), 0.01, "30% full");
  // Capacity scales with area and with the temperature difference.
  close(r.capacity_btuh, 1e6 * r.area_ratio * (40 / 80), "ratios");
});

test("fill and run time: 80% of water capacity, 91,500 Btu a gallon, and the load draws it down", () => {
  const f = computePropaneFillOutage({ water_capacity_gal: 500, fill_limit_pct: 80, current_gauge_pct: 25, btu_per_gal: 91500, liquid_temperature_f: 40 });
  close(f.max_fill_gal, 400, "80%");
  close(f.deliverable_gal, 275, "from 25% to 80%");
  close(f.limit_headroom_f, (20 / 80) / 0.0015, "expansion room at the limit");
  const r = computePropaneRunTime({ water_capacity_gal: 500, fill_limit_pct: 80, current_gauge_pct: 80, trigger_pct: 30, connected_load_btuh: 150000, duty_cycle: 0.35, btu_per_gal: 91500, gallons_per_hdd: 0.45, hdd_per_day: 30 });
  close(r.gallons_per_day, 150000 * 0.35 * 24 / 91500, "gallons a day");
  close(r.days_to_trigger * r.gallons_per_day, 250, "80% to 30% of 500 gal");
});

test("regulator: required flow is the load over the gas's heating value, checked at the coldest inlet", () => {
  const r = computePropaneRegulatorSizing({ connected_load_btuh: 500000, btu_per_ft3: 2500, capacity_at_min_inlet_cfh: 165, capacity_at_max_inlet_cfh: 300, second_stage_capacity_cfh: 425, lockup_psig: 0.72, downstream_rating_psig: 0.5 });
  close(r.required_cfh, 200, "cfh");
  assert.equal(r.passes_warm_fails_cold, true);
});

test("separation: every distance is checked, and the tightest governs", () => {
  const r = computeLpContainerSeparation({ water_capacity_gal: 500, required_building_ft: 10, required_property_line_ft: 10, required_ignition_ft: 10, required_opening_ft: 5, measured_building_ft: 12, measured_property_line_ft: 14, measured_ignition_ft: 18, measured_opening_ft: 6, next_size_required_building_ft: 25 });
  close(r.building_margin_ft, 2, "building");
  assert.equal(r.all_pass, true);
  close(r.next_size_shortfall_ft, 13, "a larger tank needs 25 ft");
});
