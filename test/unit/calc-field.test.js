// Unit tests for calc-field.js v4 utilities (227-232).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePacing, pacingExample, TERRAIN_FACTORS,
  computeBearingConversion, bearingExample,
  computeSlopeAvalanche, slopeAvalancheExample,
  computeBackcountryNeeds, backcountryExample, WATER_LITERS_BASELINE, EXERTION_KCAL_FACTOR,
  computeUTM, latlonToUTM, utmToLatLon, utmExample,
  computeSolarTimes, solarExample,
  FIELD_RENDERERS,
} from "../../calc-field.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 227 Pacing
test("Pacing: example finite", () => { const r = computePacing(pacingExample.inputs); assert.ok(r.distance_ft > 0); assert.ok(r.distance_m > 0); });
test("Pacing: pace length = cal_dist / cal_paces", () => { const r = computePacing({ calibration_distance_ft: 100, calibration_paces: 40, current_paces: 0, terrain: "flat" }); assert.equal(r.pace_length_ft, 2.5); });
test("Pacing: distance_m = ft * 0.3048", () => { const r = computePacing({ calibration_distance_ft: 200, calibration_paces: 80, current_paces: 100, terrain: "flat" }); assert.ok(close(r.distance_m, r.distance_ft * 0.3048, 0.001)); });
test("Pacing: snow terrain reduces effective distance", () => { const a = computePacing({ calibration_distance_ft: 200, calibration_paces: 80, current_paces: 100, terrain: "flat" }); const b = computePacing({ calibration_distance_ft: 200, calibration_paces: 80, current_paces: 100, terrain: "snow" }); assert.ok(b.distance_ft < a.distance_ft); });
test("Pacing: zero calibration distance errors", () => { const r = computePacing({ calibration_distance_ft: 0, calibration_paces: 80, current_paces: 100, terrain: "flat" }); assert.ok(r.error); });
test("Pacing: zero calibration paces errors", () => { const r = computePacing({ calibration_distance_ft: 200, calibration_paces: 0, current_paces: 100, terrain: "flat" }); assert.ok(r.error); });
test("Pacing: unknown terrain errors", () => { const r = computePacing({ calibration_distance_ft: 200, calibration_paces: 80, current_paces: 100, terrain: "x" }); assert.ok(r.error); });
test("Pacing: ref table includes 3 stride lengths", () => { const r = computePacing(pacingExample.inputs); assert.equal(Object.keys(r.ref_per_100m).length, 3); });
test("Pacing: every terrain factor >= 1", () => { for (const k of Object.keys(TERRAIN_FACTORS)) assert.ok(TERRAIN_FACTORS[k] >= 1); });
test("Pacing: 0 current paces -> 0 distance", () => { const r = computePacing({ calibration_distance_ft: 100, calibration_paces: 50, current_paces: 0, terrain: "flat" }); assert.equal(r.distance_ft, 0); });

// 228 Bearing conversion
test("Bearing: magnetic 280 + east 12 -> true 292", () => { const r = computeBearingConversion(bearingExample.inputs); assert.ok(close(r.result_deg, 292, 0.001)); });
test("Bearing: true to magnetic subtracts east", () => { const r = computeBearingConversion({ declination_deg: 12, bearing_deg: 292, direction: "true_to_magnetic" }); assert.ok(close(r.result_deg, 280, 0.001)); });
test("Bearing: wraps below 0", () => { const r = computeBearingConversion({ declination_deg: -20, bearing_deg: 10, direction: "magnetic_to_true" }); assert.ok(close(r.result_deg, 350, 0.001)); });
test("Bearing: wraps above 360", () => { const r = computeBearingConversion({ declination_deg: 20, bearing_deg: 350, direction: "magnetic_to_true" }); assert.ok(close(r.result_deg, 10, 0.001)); });
test("Bearing: out-of-range bearing errors", () => { const r = computeBearingConversion({ declination_deg: 12, bearing_deg: 400, direction: "magnetic_to_true" }); assert.ok(r.error); });
test("Bearing: out-of-range declination errors", () => { const r = computeBearingConversion({ declination_deg: 200, bearing_deg: 100, direction: "magnetic_to_true" }); assert.ok(r.error); });
test("Bearing: unknown direction errors", () => { const r = computeBearingConversion({ declination_deg: 12, bearing_deg: 100, direction: "x" }); assert.ok(r.error); });
test("Bearing: zero declination identity", () => { const r = computeBearingConversion({ declination_deg: 0, bearing_deg: 100, direction: "magnetic_to_true" }); assert.equal(r.result_deg, 100); });
test("Bearing: memo string set", () => { const r = computeBearingConversion(bearingExample.inputs); assert.ok(r.memo.length > 0); });
test("Bearing: west declination subtracts (mag->true)", () => { const r = computeBearingConversion({ declination_deg: -10, bearing_deg: 100, direction: "magnetic_to_true" }); assert.equal(r.result_deg, 90); });

// 229 Slope avalanche
test("Slope: 38 deg in window", () => { const r = computeSlopeAvalanche(slopeAvalancheExample.inputs); assert.equal(r.in_avalanche_window, true); });
test("Slope: 20 deg outside window", () => { const r = computeSlopeAvalanche({ rise_ft: 0, run_ft: 0, measured_angle_deg: 20 }); assert.equal(r.in_avalanche_window, false); });
test("Slope: 30 deg boundary in window", () => { const r = computeSlopeAvalanche({ rise_ft: 0, run_ft: 0, measured_angle_deg: 30 }); assert.equal(r.in_avalanche_window, true); });
test("Slope: 45 deg boundary in window", () => { const r = computeSlopeAvalanche({ rise_ft: 0, run_ft: 0, measured_angle_deg: 45 }); assert.equal(r.in_avalanche_window, true); });
test("Slope: rise/run computes angle", () => { const r = computeSlopeAvalanche({ rise_ft: 100, run_ft: 100, measured_angle_deg: 0 }); assert.ok(close(r.angle_deg, 45, 0.001)); });
test("Slope: nothing supplied errors", () => { const r = computeSlopeAvalanche({ rise_ft: 0, run_ft: 0, measured_angle_deg: 0 }); assert.ok(r.error); });
test("Slope: percent = tan(angle)*100", () => { const r = computeSlopeAvalanche({ rise_ft: 0, run_ft: 0, measured_angle_deg: 30 }); assert.ok(close(r.slope_percent, Math.tan(30 * Math.PI / 180) * 100, 0.01)); });
test("Slope: 90 deg (vertical)", () => { const r = computeSlopeAvalanche({ rise_ft: 0, run_ft: 0, measured_angle_deg: 89 }); assert.ok(r.angle_deg > 80); });
test("Slope: 0 deg flat", () => { const r = computeSlopeAvalanche({ rise_ft: 0, run_ft: 100, measured_angle_deg: 0 }); assert.ok(r.error || r.angle_deg < 1); });
test("Slope: small angle outside window", () => { const r = computeSlopeAvalanche({ rise_ft: 5, run_ft: 100, measured_angle_deg: 0 }); assert.equal(r.in_avalanche_window, false); });

// 230 Backcountry
test("Backcountry: example finite", () => { const r = computeBackcountryNeeds(backcountryExample.inputs); assert.ok(r.water_per_day_l > 0); assert.ok(r.kcal_per_day > 0); });
test("Backcountry: hot > cool water", () => { const a = computeBackcountryNeeds({ ...backcountryExample.inputs, ambient_band: "cool" }); const b = computeBackcountryNeeds({ ...backcountryExample.inputs, ambient_band: "hot" }); assert.ok(b.water_per_day_l > a.water_per_day_l); });
test("Backcountry: extreme exertion most kcal", () => { const a = computeBackcountryNeeds({ ...backcountryExample.inputs, exertion: "easy" }); const b = computeBackcountryNeeds({ ...backcountryExample.inputs, exertion: "extreme" }); assert.ok(b.kcal_per_day > a.kcal_per_day); });
test("Backcountry: trip totals scale with days", () => { const a = computeBackcountryNeeds({ ...backcountryExample.inputs, trip_days: 1 }); const b = computeBackcountryNeeds({ ...backcountryExample.inputs, trip_days: 10 }); assert.ok(close(b.trip_water_l / a.trip_water_l, 10, 0.001)); });
test("Backcountry: trip totals scale with group", () => { const a = computeBackcountryNeeds({ ...backcountryExample.inputs, group_size: 1 }); const b = computeBackcountryNeeds({ ...backcountryExample.inputs, group_size: 5 }); assert.ok(close(b.trip_kcal / a.trip_kcal, 5, 0.001)); });
test("Backcountry: zero weight errors", () => { const r = computeBackcountryNeeds({ ...backcountryExample.inputs, body_weight_lb: 0 }); assert.ok(r.error); });
test("Backcountry: zero days errors", () => { const r = computeBackcountryNeeds({ ...backcountryExample.inputs, trip_days: 0 }); assert.ok(r.error); });
test("Backcountry: unknown ambient errors", () => { const r = computeBackcountryNeeds({ ...backcountryExample.inputs, ambient_band: "x" }); assert.ok(r.error); });
test("Backcountry: unknown exertion errors", () => { const r = computeBackcountryNeeds({ ...backcountryExample.inputs, exertion: "x" }); assert.ok(r.error); });
test("Backcountry: every band positive", () => { for (const k of Object.keys(WATER_LITERS_BASELINE)) assert.ok(WATER_LITERS_BASELINE[k] > 0); for (const k of Object.keys(EXERTION_KCAL_FACTOR)) assert.ok(EXERTION_KCAL_FACTOR[k] > 0); });

// 231 UTM
test("UTM: Denver lat 39.74 / lon -104.99 -> zone 13", () => { const r = latlonToUTM(39.7392, -104.9903); assert.equal(r.zone, 13); });
test("UTM: round-trip lat/lon -> UTM -> lat/lon (Denver)", () => { const u = latlonToUTM(39.7392, -104.9903); const ll = utmToLatLon(u.zone, u.hemisphere, u.easting, u.northing); assert.ok(close(ll.lat_deg, 39.7392, 0.0001)); assert.ok(close(ll.lon_deg, -104.9903, 0.0001)); });
test("UTM: southern hemisphere flag", () => { const u = latlonToUTM(-33.86, 151.21); assert.equal(u.hemisphere, "S"); });
test("UTM: extreme latitude errors", () => { const u = latlonToUTM(85, 0); assert.ok(u.error); });
test("UTM: compute lat/lon -> utm via wrapper", () => { const r = computeUTM(utmExample.inputs); assert.equal(r.zone, 13); });
test("UTM: zero zone errors on inverse", () => { const r = computeUTM({ direction: "utm_to_latlon", zone: 0, hemisphere: "N", easting: 500000, northing: 4000000 }); assert.ok(r.error); });
test("UTM: bad hemisphere errors", () => { const r = computeUTM({ direction: "utm_to_latlon", zone: 13, hemisphere: "X", easting: 500000, northing: 4000000 }); assert.ok(r.error); });
test("UTM: unknown direction errors", () => { const r = computeUTM({ direction: "x" }); assert.ok(r.error); });
test("UTM: easting around 500k near central meridian", () => { const u = latlonToUTM(39.7392, -105); assert.ok(close(u.easting, 500000, 1000)); });
test("UTM: northing positive in N hemisphere", () => { const u = latlonToUTM(39.7392, -104.9903); assert.ok(u.northing > 0); });

// 232 Solar
test("Solar: Denver summer solstice yields ~14.9 hr daylight", () => { const r = computeSolarTimes(solarExample.inputs); assert.ok(r.daylight_minutes > 14 * 60 && r.daylight_minutes < 16 * 60); });
test("Solar: sunrise string formatted HH:MM", () => { const r = computeSolarTimes(solarExample.inputs); assert.match(r.sunrise, /^\d{2}:\d{2}$/); });
test("Solar: declination near +23 deg at solstice", () => { const r = computeSolarTimes(solarExample.inputs); assert.ok(r.declination_deg > 22); });
test("Solar: invalid date errors", () => { const r = computeSolarTimes({ ...solarExample.inputs, date_iso: "not-a-date" }); assert.ok(r.error); });
test("Solar: out-of-range latitude errors", () => { const r = computeSolarTimes({ ...solarExample.inputs, lat_deg: 100 }); assert.ok(r.error); });
test("Solar: civil dawn before sunrise", () => { const r = computeSolarTimes(solarExample.inputs); function toMin(s) { const [h, m] = s.split(":").map(Number); return h * 60 + m; } assert.ok(toMin(r.civil_dawn) < toMin(r.sunrise)); });
test("Solar: nautical dawn before civil dawn", () => { const r = computeSolarTimes(solarExample.inputs); function toMin(s) { const [h, m] = s.split(":").map(Number); return h * 60 + m; } assert.ok(toMin(r.nautical_dawn) < toMin(r.civil_dawn)); });
test("Solar: out-of-range longitude errors", () => { const r = computeSolarTimes({ ...solarExample.inputs, lon_deg: 200 }); assert.ok(r.error); });
test("Solar: returns equation of time", () => { const r = computeSolarTimes(solarExample.inputs); assert.ok(Number.isFinite(r.eqtime_min)); });
test("Solar: equator yields ~12 hr daylight", () => { const r = computeSolarTimes({ lat_deg: 0, lon_deg: 0, date_iso: "2026-03-21", tz_offset_hours: 0 }); assert.ok(r.daylight_minutes > 11 * 60 && r.daylight_minutes < 13 * 60); });

// Renderers
test("FIELD_RENDERERS: 6 ids", () => { for (const id of ["pacing-distance","bearing-conversion","slope-avalanche","backcountry-needs","utm-conversion","solar-times"]) assert.equal(typeof FIELD_RENDERERS[id], "function", id); });
