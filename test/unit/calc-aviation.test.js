// Unit tests for calc-aviation.js (spec-v12 Group W starter: W.1
// density-altitude, W.3 crosswind, W.9 ETE/ETA). Pure deterministic
// math; tests assert against hand-computed worked examples drawn
// from the FAA PHAK chapter 4 and standard aviation training texts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDensityAltitude, densityAltitudeExample,
  computeCrosswind, crosswindExample,
  computeETE, eteExample,
  computeHypoxiaAltitude, hypoxiaExample,
  computePressureAltitude, pressureAltitudeExample,
  computePhoneticAlphabet, phoneticExample,
  AVIATION_RENDERERS,
} from "../../calc-aviation.js";

// --- W.1 Density altitude ---

test("computeDensityAltitude: PA 5000 + OAT 25 C -> DA ~7388", () => {
  const r = computeDensityAltitude(densityAltitudeExample.inputs);
  assert.ok(Math.abs(r.density_altitude_ft - 7388) < 1, "DA " + r.density_altitude_ft);
  assert.ok(Math.abs(r.isa_temp_c - 5.1) < 0.05);
  assert.ok(Math.abs(r.isa_deviation_c - 19.9) < 0.05);
});

test("computeDensityAltitude: ISA day at sea level returns DA = PA", () => {
  const r = computeDensityAltitude({ pressure_altitude_ft: 0, oat_c: 15 });
  assert.equal(r.density_altitude_ft, 0);
  assert.equal(r.isa_deviation_c, 0);
});

test("computeDensityAltitude: cold high-pressure day produces DA below PA", () => {
  // PA 5000, OAT -10 C. ISA at 5000 = 5.1 C; deviation -15.1. DA = 5000 - 1812 = 3188.
  const r = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: -10 });
  assert.ok(r.density_altitude_ft < 5000);
  assert.equal(r.band, "low altitude (typical GA airport)");
});

test("computeDensityAltitude: out-of-range inputs rejected", () => {
  assert.ok(computeDensityAltitude({ pressure_altitude_ft: -5000, oat_c: 20 }).error);
  assert.ok(computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: 100 }).error);
});

test("computeDensityAltitude: takeoff factor monotonic in DA", () => {
  const low = computeDensityAltitude({ pressure_altitude_ft: 0, oat_c: 15 });
  const mid = computeDensityAltitude({ pressure_altitude_ft: 5000, oat_c: 25 });
  const high = computeDensityAltitude({ pressure_altitude_ft: 10000, oat_c: 25 });
  assert.ok(low.takeoff_distance_factor_vs_sl <= mid.takeoff_distance_factor_vs_sl);
  assert.ok(mid.takeoff_distance_factor_vs_sl <= high.takeoff_distance_factor_vs_sl);
});

// --- W.3 Crosswind ---

test("computeCrosswind: runway 090, wind 130 at 20 -> 40 deg off, HW ~15.32, CW ~12.86", () => {
  const r = computeCrosswind(crosswindExample.inputs);
  assert.ok(Math.abs(r.wind_angle_off_runway_deg - 40) < 1e-6);
  assert.ok(Math.abs(r.headwind_kt - 15.32) < 0.05);
  assert.ok(Math.abs(r.crosswind_kt - 12.86) < 0.05);
  assert.equal(r.crosswind_side, "from the right");
  assert.equal(r.head_or_tail, "headwind");
});

test("computeCrosswind: straight-on headwind has zero crosswind", () => {
  const r = computeCrosswind({ runway_heading_deg: 360, wind_direction_deg: 0, wind_speed_kt: 15 });
  assert.equal(r.wind_angle_off_runway_deg, 0);
  assert.ok(Math.abs(r.crosswind_kt) < 1e-9);
  assert.ok(Math.abs(r.headwind_kt - 15) < 1e-9);
});

test("computeCrosswind: tailwind detected when wind angle > 90", () => {
  // Runway 360, wind from 180: 180-360 = -180 normalized to 180 (boundary); 170 is unambiguously tailwind.
  const r = computeCrosswind({ runway_heading_deg: 360, wind_direction_deg: 170, wind_speed_kt: 10 });
  assert.equal(r.head_or_tail, "tailwind");
  assert.ok(r.headwind_kt < 0);
});

test("computeCrosswind: from-the-left vs from-the-right side detection", () => {
  // Runway 090, wind from 060 (30 left of runway): CW should be negative (from left).
  const left = computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 60, wind_speed_kt: 10 });
  assert.equal(left.crosswind_side, "from the left");
  // Wind from 120 (30 right of runway): CW positive (from right).
  const right = computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 120, wind_speed_kt: 10 });
  assert.equal(right.crosswind_side, "from the right");
});

test("computeCrosswind: demonstrated-crosswind comparison fires when within and when exceeding", () => {
  const within = computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 130, wind_speed_kt: 20, demonstrated_crosswind_kt: 15 });
  assert.match(within.demo_status, /within/);
  const exceed = computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 130, wind_speed_kt: 30, demonstrated_crosswind_kt: 15 });
  assert.match(exceed.demo_status, /exceeds/);
});

test("computeCrosswind: invalid inputs rejected", () => {
  assert.ok(computeCrosswind({ runway_heading_deg: -10, wind_direction_deg: 0, wind_speed_kt: 5 }).error);
  assert.ok(computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 400, wind_speed_kt: 5 }).error);
  assert.ok(computeCrosswind({ runway_heading_deg: 90, wind_direction_deg: 90, wind_speed_kt: -1 }).error);
});

// --- W.9 ETE / ETA ---

test("computeETE: 250 nm at 120 kt -> 2:05 ETE", () => {
  const r = computeETE(eteExample.inputs);
  assert.equal(r.ete_hhmm, "02:05");
  assert.ok(Math.abs(r.ete_hours - 2.0833) < 0.001);
  assert.equal(r.eta_local_hhmm, "10:35");
});

test("computeETE: departure time omitted -> ETA null", () => {
  const r = computeETE({ distance_nm: 100, groundspeed_kt: 100 });
  assert.equal(r.ete_hhmm, "01:00");
  assert.equal(r.eta_local_hhmm, null);
});

test("computeETE: ETA wraps midnight", () => {
  // 6 hr from 22:00 -> 04:00 next day.
  const r = computeETE({ distance_nm: 600, groundspeed_kt: 100, departure_time_local: "22:00" });
  assert.equal(r.eta_local_hhmm, "04:00");
});

test("computeETE: zero or negative inputs rejected", () => {
  assert.ok(computeETE({ distance_nm: 0, groundspeed_kt: 100 }).error);
  assert.ok(computeETE({ distance_nm: 100, groundspeed_kt: 0 }).error);
});

test("computeETE: low-groundspeed band flagged but still computed", () => {
  const r = computeETE({ distance_nm: 20, groundspeed_kt: 25 });
  assert.match(r.groundspeed_band, /below 30 kt/);
  assert.ok(typeof r.ete_hours === "number" && r.ete_hours > 0);
});

// --- W.7 Hypoxia altitude ---

test("computeHypoxiaAltitude: 13,000 ft cabin -> 12,500-14,000 band, crew O2 after 30 min", () => {
  const r = computeHypoxiaAltitude(hypoxiaExample.inputs);
  assert.equal(r.band, "12,500 to 14,000 ft");
  assert.equal(r.crew_o2_required, true);
  assert.equal(r.all_occupants_o2_required, false);
});

test("computeHypoxiaAltitude: bands at the boundaries", () => {
  assert.equal(computeHypoxiaAltitude({ cabin_altitude_ft: 5000 }).band, "below 12,500 ft");
  assert.equal(computeHypoxiaAltitude({ cabin_altitude_ft: 12500 }).band, "12,500 to 14,000 ft");
  assert.equal(computeHypoxiaAltitude({ cabin_altitude_ft: 14000 }).band, "14,000 to 15,000 ft");
  assert.equal(computeHypoxiaAltitude({ cabin_altitude_ft: 15000 }).band, "above 15,000 ft");
});

test("computeHypoxiaAltitude: all-occupants flag fires only above 15,000", () => {
  assert.equal(computeHypoxiaAltitude({ cabin_altitude_ft: 14999 }).all_occupants_o2_required, false);
  assert.equal(computeHypoxiaAltitude({ cabin_altitude_ft: 15000 }).all_occupants_o2_required, true);
  assert.equal(computeHypoxiaAltitude({ cabin_altitude_ft: 18000 }).all_occupants_o2_required, true);
});

test("computeHypoxiaAltitude: out-of-range altitude rejected", () => {
  assert.ok(computeHypoxiaAltitude({ cabin_altitude_ft: -5000 }).error);
  assert.ok(computeHypoxiaAltitude({ cabin_altitude_ft: 100000 }).error);
});

// --- W.11 Pressure altitude ---

test("computePressureAltitude: KBJC 5430 + altimeter 30.12 -> PA 5230 (-200 ft)", () => {
  const r = computePressureAltitude(pressureAltitudeExample.inputs);
  assert.ok(Math.abs(r.pressure_altitude_ft - 5230) < 1e-9, "PA " + r.pressure_altitude_ft);
  assert.ok(Math.abs(r.isa_deviation_inHg - (-0.20)) < 1e-9);
});

test("computePressureAltitude: standard day (29.92) returns PA = field elevation", () => {
  const r = computePressureAltitude({ field_elevation_ft: 1000, altimeter_setting_inHg: 29.92 });
  assert.equal(r.pressure_altitude_ft, 1000);
  assert.equal(r.isa_deviation_inHg, 0);
});

test("computePressureAltitude: low-pressure day adds altitude", () => {
  // 29.92 - 28.92 = 1.00 inHg low -> +1000 ft.
  const r = computePressureAltitude({ field_elevation_ft: 5000, altimeter_setting_inHg: 28.92 });
  assert.equal(r.pressure_altitude_ft, 6000);
});

test("computePressureAltitude: out-of-range altimeter rejected", () => {
  assert.ok(computePressureAltitude({ field_elevation_ft: 5000, altimeter_setting_inHg: 40 }).error);
  assert.ok(computePressureAltitude({ field_elevation_ft: 5000, altimeter_setting_inHg: 20 }).error);
});

// --- W.12 Phonetic alphabet ---

test("computePhoneticAlphabet: empty input returns 26-letter table", () => {
  const r = computePhoneticAlphabet({ text: "" });
  assert.equal(r.letters.length, 26);
  assert.equal(r.letters[0].letter, "A");
  assert.equal(r.letters[0].word, "Alpha");
  assert.equal(r.letters[25].letter, "Z");
  assert.equal(r.letters[25].word, "Zulu");
  assert.equal(r.translation, null);
});

test("computePhoneticAlphabet: N12345 translates with November and digits as-is", () => {
  const r = computePhoneticAlphabet(phoneticExample.inputs);
  assert.match(r.translation, /November/);
  // Digits are spoken as themselves (the tile passes them through).
  for (const d of "12345") assert.ok(r.translation.includes(d));
});

test("computePhoneticAlphabet: mixed case is uppercased before lookup", () => {
  const r = computePhoneticAlphabet({ text: "kjfk" });
  assert.match(r.translation, /Kilo Juliett Foxtrot Kilo/);
});

test("computePhoneticAlphabet: spaces and dashes are spelled out", () => {
  const r = computePhoneticAlphabet({ text: "A B-C" });
  assert.match(r.translation, /\(space\)/);
  assert.match(r.translation, /dash/);
});

test("all six Group W renderers exposed in AVIATION_RENDERERS", () => {
  for (const key of ["density-altitude", "crosswind-component", "ete-eta", "hypoxia-altitude", "pressure-altitude", "phonetic-alphabet"]) {
    assert.ok(typeof AVIATION_RENDERERS[key] === "function", key + " must be registered");
  }
});
