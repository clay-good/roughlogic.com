// Unit tests for calc-restoration.js v2 utilities (86-89). 10+ cases per utility.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStandingWater,
  computeNAMSizing,
  computeHEPALife,
  computeThermalDeltaTReference,
  NAM_UNIT_SIZES_CFM,
  HEPA_LOADING,
  THERMAL_DELTA_T_REFERENCE,
  standingWaterExample,
  namSizingExample,
  hepaLifeExample,
  thermalDeltaTExample,
} from "../../calc-restoration.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 86: Standing Water Volume ---

test("Standing water: 500 ft^2 x 1 in -> ~311 gal", () => {
  const r = computeStandingWater(standingWaterExample.inputs);
  assert.ok(r.gallons > 310 && r.gallons < 315);
});

test("Standing water: 1 ft^3 = 7.48052 gal", () => {
  const r = computeStandingWater({ area_ft2: 1, depth_in: 12 });
  assert.ok(close(r.gallons, 7.48052, 0.001));
});

test("Standing water: zero area returns error", () => {
  const r = computeStandingWater({ area_ft2: 0, depth_in: 1 });
  assert.ok(r.error);
});

test("Standing water: zero depth returns error", () => {
  const r = computeStandingWater({ area_ft2: 100, depth_in: 0 });
  assert.ok(r.error);
});

test("Standing water: doubled area doubles volume", () => {
  const a = computeStandingWater({ area_ft2: 100, depth_in: 2 });
  const b = computeStandingWater({ area_ft2: 200, depth_in: 2 });
  assert.ok(close(b.gallons, 2 * a.gallons));
});

test("Standing water: doubled depth doubles volume", () => {
  const a = computeStandingWater({ area_ft2: 100, depth_in: 1 });
  const b = computeStandingWater({ area_ft2: 100, depth_in: 2 });
  assert.ok(close(b.gallons, 2 * a.gallons));
});

test("Standing water: weight at 62.4 lb/ft^3", () => {
  const r = computeStandingWater({ area_ft2: 1, depth_in: 12 });
  assert.ok(close(r.pounds, 62.4, 0.05));
});

test("Standing water: cubic_feet = area * depth/12", () => {
  const r = computeStandingWater({ area_ft2: 100, depth_in: 6 });
  assert.equal(r.cubic_feet, 50);
});

test("Standing water: large flood (2000 ft^2 x 4 in)", () => {
  const r = computeStandingWater({ area_ft2: 2000, depth_in: 4 });
  assert.ok(r.gallons > 4900 && r.gallons < 5100);
});

test("Standing water: weight scales linearly", () => {
  const a = computeStandingWater({ area_ft2: 100, depth_in: 1 });
  const b = computeStandingWater({ area_ft2: 100, depth_in: 4 });
  assert.ok(close(b.pounds, 4 * a.pounds, 0.01));
});

// --- Utility 87: NAM Sizing ---

test("NAM sizing: example yields 800 CFM required", () => {
  const r = computeNAMSizing(namSizingExample.inputs);
  assert.equal(r.required_cfm, 800);
});

test("NAM sizing: 800 CFM -> 2 of 500 CFM, 1 of 1000 CFM, 1 of 2000 CFM", () => {
  const r = computeNAMSizing({ room_volume_ft3: 8000, target_ach: 6 });
  const get = (cfm) => r.recommendations.find((x) => x.unit_cfm === cfm);
  assert.equal(get(500).units_needed, 2);
  assert.equal(get(1000).units_needed, 1);
  assert.equal(get(2000).units_needed, 1);
});

test("NAM sizing: zero volume returns error", () => {
  const r = computeNAMSizing({ room_volume_ft3: 0, target_ach: 6 });
  assert.ok(r.error);
});

test("NAM sizing: zero ACH returns error", () => {
  const r = computeNAMSizing({ room_volume_ft3: 1000, target_ach: 0 });
  assert.ok(r.error);
});

test("NAM sizing: required_cfm = volume * ACH / 60", () => {
  const r = computeNAMSizing({ room_volume_ft3: 6000, target_ach: 10 });
  assert.equal(r.required_cfm, 1000);
});

test("NAM sizing: total_cfm always >= required_cfm", () => {
  const r = computeNAMSizing({ room_volume_ft3: 5500, target_ach: 6 });
  for (const rec of r.recommendations) {
    assert.ok(rec.total_cfm >= r.required_cfm);
  }
});

test("NAM sizing: bundles 3 unit sizes", () => {
  assert.equal(NAM_UNIT_SIZES_CFM.length, 3);
});

test("NAM sizing: large room scales unit count", () => {
  const r = computeNAMSizing({ room_volume_ft3: 50000, target_ach: 6 });
  // 50000 * 6 / 60 = 5000 CFM. 500-CFM units: 10. 2000-CFM units: 3 (6000 CFM).
  const get = (cfm) => r.recommendations.find((x) => x.unit_cfm === cfm);
  assert.equal(get(500).units_needed, 10);
  assert.equal(get(2000).units_needed, 3);
});

test("NAM sizing: small room rounds up to at least 1 unit", () => {
  const r = computeNAMSizing({ room_volume_ft3: 100, target_ach: 6 });
  const get = (cfm) => r.recommendations.find((x) => x.unit_cfm === cfm);
  assert.equal(get(500).units_needed, 1);
});

test("NAM sizing: higher ACH increases CFM linearly", () => {
  const a = computeNAMSizing({ room_volume_ft3: 8000, target_ach: 6 });
  const b = computeNAMSizing({ room_volume_ft3: 8000, target_ach: 12 });
  assert.ok(close(b.required_cfm, 2 * a.required_cfm));
});

// --- Utility 88: HEPA Filter Life ---

test("HEPA: example yields days in expected range", () => {
  const r = computeHEPALife(hepaLifeExample.inputs);
  assert.ok(!r.error);
  // 600 CFM * 24 hr * 0.05 g/CFM-hr = 720 g/day; 1500 g cap -> ~2.08 days.
  assert.ok(r.days >= 1 && r.days <= 5);
});

test("HEPA: unknown category returns error", () => {
  const r = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "extreme" });
  assert.ok(r.error);
});

test("HEPA: doubled CFM halves days", () => {
  const a = computeHEPALife({ cfm: 300, hours_per_day: 24, particulate_category: "medium" });
  const b = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "medium" });
  assert.ok(close(b.days, a.days / 2, 0.01));
});

test("HEPA: doubled hours halves days", () => {
  const a = computeHEPALife({ cfm: 600, hours_per_day: 12, particulate_category: "medium" });
  const b = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "medium" });
  assert.ok(close(b.days, a.days / 2, 0.01));
});

test("HEPA: doubled capacity doubles days", () => {
  const a = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "medium", capacity_grams: 1500 });
  const b = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "medium", capacity_grams: 3000 });
  assert.ok(close(b.days, 2 * a.days));
});

test("HEPA: high category yields fewer days than low", () => {
  const lo = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "low" });
  const hi = computeHEPALife({ cfm: 600, hours_per_day: 24, particulate_category: "high" });
  assert.ok(hi.days < lo.days);
});

test("HEPA: zero CFM returns error", () => {
  const r = computeHEPALife({ cfm: 0, hours_per_day: 24, particulate_category: "medium" });
  assert.ok(r.error);
});

test("HEPA: zero hours returns error", () => {
  const r = computeHEPALife({ cfm: 600, hours_per_day: 0, particulate_category: "medium" });
  assert.ok(r.error);
});

test("HEPA: HEPA_LOADING has three categories", () => {
  assert.equal(Object.keys(HEPA_LOADING.loading_per_CFM_hour).length, 3);
});

test("HEPA: medium loading rate is 0.05 g/CFM-hr", () => {
  assert.equal(HEPA_LOADING.loading_per_CFM_hour.medium, 0.05);
});

test("HEPA: capacity defaults to 1500 g", () => {
  assert.equal(HEPA_LOADING.default_capacity_grams, 1500);
});

// --- Utility 89: Thermal Delta-T Reference ---

test("Thermal: returns at least 5 scenarios", () => {
  const r = computeThermalDeltaTReference();
  assert.ok(r.scenarios.length >= 5);
});

test("Thermal: every entry has scenario, range, and note", () => {
  for (const s of THERMAL_DELTA_T_REFERENCE) {
    assert.ok(typeof s.scenario === "string");
    assert.ok(typeof s.typical_delta_T_F === "string");
    assert.ok(typeof s.note === "string");
  }
});

test("Thermal: includes electrical hotspot", () => {
  const titles = THERMAL_DELTA_T_REFERENCE.map((s) => s.scenario.toLowerCase()).join(" | ");
  assert.ok(titles.includes("hotspot") || titles.includes("electrical"));
});

test("Thermal: includes moisture intrusion", () => {
  const titles = THERMAL_DELTA_T_REFERENCE.map((s) => s.scenario.toLowerCase()).join(" | ");
  assert.ok(titles.includes("moisture"));
});

test("Thermal: includes insulation case", () => {
  const titles = THERMAL_DELTA_T_REFERENCE.map((s) => s.scenario.toLowerCase()).join(" | ");
  assert.ok(titles.includes("insulation"));
});

test("Thermal: example count matches array length", () => {
  assert.equal(thermalDeltaTExample.expected.count, THERMAL_DELTA_T_REFERENCE.length);
});

test("Thermal: all delta-T ranges are non-empty strings", () => {
  for (const s of THERMAL_DELTA_T_REFERENCE) {
    assert.ok(s.typical_delta_T_F.length > 0);
  }
});

test("Thermal: every note is a complete sentence (>20 chars)", () => {
  for (const s of THERMAL_DELTA_T_REFERENCE) {
    assert.ok(s.note.length > 20);
  }
});

test("Thermal: includes a leak or moisture intrusion case beyond drywall", () => {
  const titles = THERMAL_DELTA_T_REFERENCE.map((s) => s.scenario.toLowerCase()).join(" | ");
  assert.ok(/leak|intrusion/.test(titles));
});

test("Thermal: electrical hotspot range contains '50' (largest band)", () => {
  const e = THERMAL_DELTA_T_REFERENCE.find((s) => /electrical/i.test(s.scenario));
  assert.ok(e);
  assert.ok(e.typical_delta_T_F.includes("50"));
});
