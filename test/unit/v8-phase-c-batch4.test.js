// v8 Phase C batch 4 - 7 more compute-side refinements (spec §5).

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBreakerSize } from "../../calc-electrical.js";
import { computeWaterHammerArrestor } from "../../calc-plumbing.js";
import { computeCfmPerTon, computeDuctSize } from "../../calc-hvac.js";
import { computeAsphaltTonnage } from "../../calc-construction.js";
import { computeHOS } from "../../calc-trucking.js";
import { computeDehumidifierSize } from "../../calc-restoration.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- C.1 breaker-sizing watts+volts+pf input mode ---

test("C.1 breaker-sizing accepts watts+volts and derives load_A", () => {
  // 1500 W at 120 V single-phase, pf=1 → 12.5 A.
  const r = computeBreakerSize({ load_W: 1500, voltage_V: 120, power_factor: 1, phase: "single", continuous: false });
  assert.equal(r.used_input_mode, "watts");
  assert.ok(close(r.derived_load_A, 12.5, 0.01));
});

test("C.1 breaker-sizing three-phase divides by sqrt(3) × V", () => {
  // 5000 W at 480 V three-phase, pf=1 → 5000 / (1.732 × 480) ≈ 6.01 A.
  const r = computeBreakerSize({ load_W: 5000, voltage_V: 480, power_factor: 1, phase: "three", continuous: false });
  const expected = 5000 / (Math.sqrt(3) * 480);
  assert.ok(close(r.derived_load_A, expected, 0.01));
});

test("C.1 breaker-sizing returns continuous + non-continuous required separately", () => {
  const r = computeBreakerSize({ load_A: 16, continuous: true });
  assert.ok(close(r.continuous_required_A, 20, 0.01));
  assert.ok(close(r.non_continuous_required_A, 16, 0.01));
});

test("C.1 breaker-sizing falls through to amps when load_A supplied", () => {
  const r = computeBreakerSize({ load_A: 30, continuous: false });
  assert.equal(r.used_input_mode, "amps");
});

test("C.1 breaker-sizing errors when no input supplied", () => {
  const r = computeBreakerSize({ continuous: false });
  assert.ok(r.error);
});

// --- C.2 water-hammer-arrestor pre-charge ---

test("C.2 water-hammer-arrestor returns precharge_psi from system_pressure", () => {
  const r = computeWaterHammerArrestor({ wsfu: 30, length_ft: 25, internal_diameter_in: 1, system_pressure_psi: 80 });
  assert.equal(r.precharge_psi, 80);
});

test("C.2 water-hammer-arrestor defaults to 60 psi when no system_pressure", () => {
  const r = computeWaterHammerArrestor({ wsfu: 30 });
  assert.equal(r.precharge_psi, 60);
});

test("C.2 water-hammer-arrestor includes a placement_note", () => {
  const r = computeWaterHammerArrestor({ wsfu: 30 });
  assert.match(r.placement_note, /downstream|branch line/i);
});

// --- C.3 cfm-per-ton climate hint ---

test("C.3 cfm-per-ton humid climate yields 350 CFM/ton + low-SHR hint", () => {
  const r = computeCfmPerTon({ tons: 3, climate: "humid" });
  assert.equal(r.cfm_per_ton, 350);
  assert.match(r.climate_hint, /latent/i);
});

test("C.3 cfm-per-ton dry climate yields 450 CFM/ton + high-SHR hint", () => {
  const r = computeCfmPerTon({ tons: 3, climate: "dry" });
  assert.equal(r.cfm_per_ton, 450);
  assert.match(r.climate_hint, /high SHR/i);
});

test("C.3 cfm-per-ton zero/negative tons errors", () => {
  assert.ok(computeCfmPerTon({ tons: 0, climate: "standard" }).error);
});

// --- C.3 duct-sizing friction color ---

test("C.3 duct-sizing 0.08 in WC/100 ft → green friction_color", () => {
  const r = computeDuctSize({ cfm: 400, friction_in_wc_per_100ft: 0.08 });
  assert.equal(r.friction_color, "green");
});

test("C.3 duct-sizing 0.10 in WC/100 ft → yellow friction_color", () => {
  const r = computeDuctSize({ cfm: 400, friction_in_wc_per_100ft: 0.10 });
  assert.equal(r.friction_color, "yellow");
});

test("C.3 duct-sizing 0.15 in WC/100 ft → red friction_color", () => {
  const r = computeDuctSize({ cfm: 400, friction_in_wc_per_100ft: 0.15 });
  assert.equal(r.friction_color, "red");
});

// --- C.4 asphalt-tonnage paving distance ---

test("C.4 asphalt-tonnage paving_distance = area / paving_width", () => {
  // 5000 ft² at 12 ft wide → 416.67 ft.
  const r = computeAsphaltTonnage({ area_ft2: 5000, depth_in: 3, paving_width_ft: 12 });
  assert.ok(close(r.paving_distance_ft, 5000 / 12, 0.01));
});

test("C.4 asphalt-tonnage paving_distance null when no width supplied", () => {
  const r = computeAsphaltTonnage({ area_ft2: 5000, depth_in: 3 });
  assert.equal(r.paving_distance_ft, null);
});

test("C.4 asphalt-tonnage distance_per_truck = paving_distance / truck_loads", () => {
  const r = computeAsphaltTonnage({ area_ft2: 5000, depth_in: 3, paving_width_ft: 12 });
  assert.ok(close(r.distance_per_truck_ft, r.paving_distance_ft / r.truck_loads_at_20T, 0.01));
});

// --- C.5 hos-math next-drive timestamp ---

test("C.5 hos-math without current_time_iso returns null next_drive_start_iso", () => {
  const r = computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: 5 }], weekly_on_duty_used_hr: 0 });
  assert.equal(r.next_drive_start_iso, null);
});

test("C.5 hos-math 'may drive now' when within window and no break needed", () => {
  const r = computeHOS({
    profile: "property_70_8",
    events: [{ kind: "drive", hours: 4 }],
    weekly_on_duty_used_hr: 0,
    current_time_iso: "2026-05-07T14:00:00.000Z",
  });
  assert.match(r.next_drive_reason, /drive now/i);
  assert.equal(r.next_drive_start_iso, "2026-05-07T14:00:00.000Z");
});

test("C.5 hos-math 30-minute break when needs_break flag fires", () => {
  // 8.5 hours of drive without break.
  const r = computeHOS({
    profile: "property_70_8",
    events: [{ kind: "drive", hours: 8.5 }],
    weekly_on_duty_used_hr: 0,
    current_time_iso: "2026-05-07T14:00:00.000Z",
  });
  assert.match(r.next_drive_reason, /30-minute break/);
  // 30 minutes later.
  assert.equal(r.next_drive_start_iso, "2026-05-07T14:30:00.000Z");
});

test("C.5 hos-math 10-hour reset when drive cap hit", () => {
  // 11 hours of drive.
  const r = computeHOS({
    profile: "property_70_8",
    events: [{ kind: "off_duty", hours: 0.5 }, { kind: "drive", hours: 5.5 }, { kind: "off_duty", hours: 0.5 }, { kind: "drive", hours: 5.5 }],
    weekly_on_duty_used_hr: 0,
    current_time_iso: "2026-05-07T14:00:00.000Z",
  });
  assert.match(r.next_drive_reason, /10-hour reset/);
  // 10 hours later.
  assert.equal(r.next_drive_start_iso, "2026-05-08T00:00:00.000Z");
});

// --- C.6 dehumidifier operational guidance ---

test("C.6 dehumidifier-sizing operational_guidance text adapts to load", () => {
  const small = computeDehumidifierSize({ room_cubic_feet: 1000, water_class: "2" });
  assert.match(small.operational_guidance, /small/i);
  const big = computeDehumidifierSize({ room_cubic_feet: 30000, water_class: "3" });
  assert.match(big.operational_guidance, /two-or-more|dessicant/i);
});

test("C.6 dehumidifier-sizing returns both AHAM and field side-by-side (existing parity)", () => {
  const r = computeDehumidifierSize({ room_cubic_feet: 5000, water_class: "2" });
  assert.ok(r.aham_pints_per_day > 0);
  assert.ok(r.field_pints_per_day > r.aham_pints_per_day);
});
