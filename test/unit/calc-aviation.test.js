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
  computeFuelPlanning, fuelPlanningExample,
  computeWindTriangle, windTriangleExample,
  computeTopOfDescent, topOfDescentExample,
  computeWeatherPhrasing, weatherPhrasingExample,
  computeTransponderCodes, transponderExample,
  computeStandardTurn, standardTurnExample,
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

// --- W.8 Fuel planning ---

test("computeFuelPlanning: 3 hr at 10.5 gph + 45 min reserve -> 39.375 gal / 236.25 lb avgas", () => {
  const r = computeFuelPlanning(fuelPlanningExample.inputs);
  assert.ok(Math.abs(r.trip_fuel_gal - 31.5) < 1e-9, "trip " + r.trip_fuel_gal);
  assert.ok(Math.abs(r.reserve_fuel_gal - 7.875) < 1e-9);
  assert.ok(Math.abs(r.required_fuel_gal - 39.375) < 1e-9);
  assert.ok(Math.abs(r.required_fuel_lb - 236.25) < 1e-9);
  assert.match(r.reserve_band, /91\.167/);
  assert.match(r.capacity_status, /Within/);
});

test("computeFuelPlanning: jet-A weight is 6.7 lb/gal", () => {
  const r = computeFuelPlanning({ flight_time_hr: 2, burn_gph: 100, reserve_min: 45, fuel_type: "jet_a" });
  assert.ok(Math.abs(r.required_fuel_lb - r.required_fuel_gal * 6.7) < 1e-6);
});

test("computeFuelPlanning: below 30 min reserve flagged as below VFR minimum", () => {
  const r = computeFuelPlanning({ flight_time_hr: 1, burn_gph: 10, reserve_min: 20, fuel_type: "avgas" });
  assert.match(r.reserve_band, /below 14 CFR 91\.151/);
});

test("computeFuelPlanning: 30-44 min reserve meets day-VFR but below night/IFR", () => {
  const r = computeFuelPlanning({ flight_time_hr: 1, burn_gph: 10, reserve_min: 30, fuel_type: "avgas" });
  assert.match(r.reserve_band, /meets 91\.151 day VFR/);
  assert.match(r.reserve_band, /below 91\.167/);
});

test("computeFuelPlanning: tank capacity check fires when required exceeds capacity", () => {
  const r = computeFuelPlanning({ flight_time_hr: 5, burn_gph: 10, reserve_min: 45, fuel_type: "avgas", tank_capacity_gal: 30 });
  assert.match(r.capacity_status, /EXCEEDS/);
});

test("computeFuelPlanning: invalid inputs rejected", () => {
  assert.ok(computeFuelPlanning({ flight_time_hr: 0, burn_gph: 10, reserve_min: 45 }).error);
  assert.ok(computeFuelPlanning({ flight_time_hr: 2, burn_gph: 0, reserve_min: 45 }).error);
  assert.ok(computeFuelPlanning({ flight_time_hr: 2, burn_gph: 10, reserve_min: -10 }).error);
  assert.ok(computeFuelPlanning({ flight_time_hr: 2, burn_gph: 10, reserve_min: 45, fuel_type: "bogus" }).error);
});

// --- W.10 Wind triangle ---

test("computeWindTriangle: TC 090 / TAS 120 / wind 040 at 25 -> WCA ~-9.18, TH ~80.82, GS ~102.39", () => {
  const r = computeWindTriangle(windTriangleExample.inputs);
  assert.ok(Math.abs(r.wca_deg - (-9.18)) < 0.05, "WCA " + r.wca_deg);
  assert.ok(Math.abs(r.true_heading_deg - 80.82) < 0.05);
  assert.ok(Math.abs(r.ground_speed_kt - 102.39) < 0.1);
  assert.ok(r.crosswind_component_kt < 0);
  assert.ok(r.headwind_component_kt > 0);
});

test("computeWindTriangle: pure headwind (wind direction == course) -> WCA = 0, GS = TAS - WS", () => {
  const r = computeWindTriangle({ true_course_deg: 0, true_airspeed_kt: 120, wind_direction_deg: 0, wind_speed_kt: 20 });
  assert.ok(Math.abs(r.wca_deg) < 1e-9, "WCA " + r.wca_deg);
  assert.ok(Math.abs(r.ground_speed_kt - 100) < 1e-9, "GS " + r.ground_speed_kt);
  assert.ok(Math.abs(r.true_heading_deg) < 1e-9);
});

test("computeWindTriangle: pure tailwind -> WCA = 0, GS = TAS + WS", () => {
  const r = computeWindTriangle({ true_course_deg: 0, true_airspeed_kt: 120, wind_direction_deg: 180, wind_speed_kt: 20 });
  assert.ok(Math.abs(r.wca_deg) < 1e-9, "WCA " + r.wca_deg);
  assert.ok(Math.abs(r.ground_speed_kt - 140) < 1e-9, "GS " + r.ground_speed_kt);
});

test("computeWindTriangle: TH wraps to [0, 360)", () => {
  // TC 005, WCA negative crab -> TH would be -ish; verify wrap.
  const r = computeWindTriangle({ true_course_deg: 5, true_airspeed_kt: 100, wind_direction_deg: 95, wind_speed_kt: 30 });
  assert.ok(r.true_heading_deg >= 0 && r.true_heading_deg < 360);
});

test("computeWindTriangle: crosswind >= TAS returns no-solution error", () => {
  const r = computeWindTriangle({ true_course_deg: 90, true_airspeed_kt: 20, wind_direction_deg: 180, wind_speed_kt: 25 });
  assert.ok(r.error, "should error: " + JSON.stringify(r));
  assert.match(r.error, /no solution/);
});

test("computeWindTriangle: invalid inputs rejected", () => {
  assert.ok(computeWindTriangle({ true_course_deg: 400, true_airspeed_kt: 120, wind_direction_deg: 0, wind_speed_kt: 10 }).error);
  assert.ok(computeWindTriangle({ true_course_deg: 90, true_airspeed_kt: 0, wind_direction_deg: 0, wind_speed_kt: 10 }).error);
  assert.ok(computeWindTriangle({ true_course_deg: 90, true_airspeed_kt: 120, wind_direction_deg: 0, wind_speed_kt: -5 }).error);
});

// --- W.16 Top-of-descent ---

test("computeTopOfDescent: FL350 -> 5,000 ft at 240 kt GS -> 90 nm, 1333 fpm, 22.5 min", () => {
  const r = computeTopOfDescent(topOfDescentExample.inputs);
  assert.equal(r.altitude_to_lose_ft, 30000);
  assert.ok(Math.abs(r.distance_to_start_nm - 90) < 1e-9);
  assert.ok(Math.abs(r.descent_rate_fpm - 1333.333) < 0.01);
  assert.ok(Math.abs(r.time_to_descend_min - 22.5) < 0.01);
  assert.match(r.rate_band, /1000 to 1500 fpm/);
});

test("computeTopOfDescent: 500 fpm band fires at slow GA cruise speeds", () => {
  // 120 kt -> 666.67 fpm: actually in 500-1000 band per the implementation.
  const r = computeTopOfDescent({ cruise_altitude_ft: 8000, target_altitude_ft: 2000, ground_speed_kt: 120 });
  assert.match(r.rate_band, /500 to 1000 fpm/);
  // distance = 6 * 3 = 18 nm.
  assert.ok(Math.abs(r.distance_to_start_nm - 18) < 1e-9);
});

test("computeTopOfDescent: cruise <= target rejected", () => {
  assert.ok(computeTopOfDescent({ cruise_altitude_ft: 5000, target_altitude_ft: 5000, ground_speed_kt: 200 }).error);
  assert.ok(computeTopOfDescent({ cruise_altitude_ft: 4000, target_altitude_ft: 5000, ground_speed_kt: 200 }).error);
});

test("computeTopOfDescent: zero / negative GS rejected", () => {
  assert.ok(computeTopOfDescent({ cruise_altitude_ft: 10000, target_altitude_ft: 2000, ground_speed_kt: 0 }).error);
  assert.ok(computeTopOfDescent({ cruise_altitude_ft: 10000, target_altitude_ft: 2000, ground_speed_kt: -100 }).error);
});

test("all nine Group W renderers exposed in AVIATION_RENDERERS", () => {
  for (const key of [
    "density-altitude", "crosswind-component", "ete-eta",
    "hypoxia-altitude", "pressure-altitude", "phonetic-alphabet",
    "fuel-planning", "wind-triangle", "top-of-descent",
  ]) {
    assert.ok(typeof AVIATION_RENDERERS[key] === "function", key + " must be registered");
  }
});

// --- W.13 Weather phrasing reference ---

test("computeWeatherPhrasing: returns the 7 cloud-cover codes plus the canonical phenomena set", () => {
  const r = computeWeatherPhrasing();
  assert.equal(r.cloud_cover.length, 7);
  assert.equal(r.intensity.length, 4);
  assert.equal(r.descriptor.length, 8);
  assert.ok(r.phenomena.length >= 15);
  assert.ok(r.rvr_note.includes("RVR"));
});

test("computeWeatherPhrasing: BKN and OVC are classified as ceilings in their meaning text", () => {
  const r = computeWeatherPhrasing();
  const bkn = r.cloud_cover.find((c) => c.code === "BKN");
  const ovc = r.cloud_cover.find((c) => c.code === "OVC");
  assert.match(bkn.meaning, /ceiling/i);
  assert.match(ovc.meaning, /ceiling/i);
});

test("computeWeatherPhrasing: TS descriptor and FG phenomena present", () => {
  const r = computeWeatherPhrasing();
  assert.ok(r.descriptor.find((d) => d.code === "TS"));
  assert.ok(r.phenomena.find((p) => p.code === "FG"));
});

// --- W.14 Transponder codes ---

test("computeTransponderCodes: 7700 lookup surfaces the EMERGENCY meaning", () => {
  const r = computeTransponderCodes(transponderExample.inputs);
  assert.match(r.lookup.status, /EMERGENCY/);
  assert.equal(r.lookup.code, "7700");
});

test("computeTransponderCodes: VFR 1200 lookup surfaces the VFR cruise meaning", () => {
  const r = computeTransponderCodes({ code: "1200" });
  assert.match(r.lookup.status, /VFR/);
});

test("computeTransponderCodes: octal validation rejects digits 8 or 9", () => {
  const r = computeTransponderCodes({ code: "1289" });
  assert.match(r.lookup.status, /Octal only/);
});

test("computeTransponderCodes: non-four-digit input is rejected with a status note", () => {
  const r = computeTransponderCodes({ code: "12" });
  assert.match(r.lookup.status, /four-digit/i);
});

test("computeTransponderCodes: no input surfaces the reserved-codes table with lookup null", () => {
  const r = computeTransponderCodes({});
  assert.equal(r.lookup, null);
  assert.ok(r.codes.length >= 5);
});

test("computeTransponderCodes: ATC-assigned discrete code surfaces a verify-readback note", () => {
  const r = computeTransponderCodes({ code: "4321" });
  assert.match(r.lookup.status, /ATC-assigned/);
});

// --- W.15 Standard turn rate / climb / descent ---

test("computeStandardTurn: TAS 120 kt -> bank-of-thumb 19 deg; 360 in 2 min", () => {
  const r = computeStandardTurn(standardTurnExample.inputs);
  assert.equal(r.bank_rule_of_thumb_deg, 19);
  assert.equal(r.standard_turn_rate_deg_per_sec, 3);
  assert.equal(r.time_for_360_min, 2);
});

test("computeStandardTurn: exact bank approximates the rule of thumb at GA speeds", () => {
  const r = computeStandardTurn({ true_airspeed_kt: 120 });
  // Rule of thumb 19 deg; exact bank ~ 17 deg at TAS 120 kt.
  assert.ok(Math.abs(r.bank_rule_of_thumb_deg - r.bank_exact_deg) < 5);
});

test("computeStandardTurn: time to turn 90 deg at std rate = 30 sec", () => {
  const r = computeStandardTurn({ turn_through_deg: 90 });
  assert.equal(r.time_to_turn_through_sec, 30);
});

test("computeStandardTurn: climb 3000 ft over 10 nm at 120 kt GS = 600 fpm", () => {
  const r = computeStandardTurn({ ground_speed_kt: 120, altitude_change_ft: 3000, distance_nm: 10 });
  assert.equal(r.gradient_ft_per_nm, 300);
  assert.equal(r.rate_fpm, 600);
});

test("computeStandardTurn: descent (negative alt change) yields negative fpm", () => {
  const r = computeStandardTurn({ ground_speed_kt: 240, altitude_change_ft: -6000, distance_nm: 20 });
  assert.equal(r.gradient_ft_per_nm, -300);
  assert.equal(r.rate_fpm, -1200);
});

test("computeStandardTurn: turn-through > 360 rejected", () => {
  assert.ok(computeStandardTurn({ turn_through_deg: 720 }).error);
});

test("computeStandardTurn: TAS > 600 kt flagged outside std-rate validity", () => {
  assert.ok(computeStandardTurn({ true_airspeed_kt: 700 }).error);
});

test("computeStandardTurn: no inputs at all surfaces a guidance error", () => {
  assert.ok(computeStandardTurn({}).error);
});

test("all twelve Group W renderers exposed in AVIATION_RENDERERS after W.13 / W.14 / W.15", () => {
  for (const key of ["weather-phrasing", "transponder-codes", "standard-turn-rate"]) {
    assert.ok(typeof AVIATION_RENDERERS[key] === "function", key + " must be registered");
  }
});
