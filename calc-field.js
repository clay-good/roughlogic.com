// Group P: Field, Backcountry, and SAR (utilities 227-232).
// See spec-v4.md section 2.7.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
import { renderLimitationBanner, getLimitationCopy } from "./limitation-banner.js";

// --- 227: Pacing and Distance ---

export const TERRAIN_FACTORS = {
  flat:    1.00,
  rolling: 1.10,
  steep:   1.25,
  brush:   1.30,
  snow:    1.40,
};

export function computePacing({ calibration_distance_ft = 0, calibration_paces = 0, current_paces = 0, terrain = "flat" }) {
  if (!(calibration_distance_ft > 0)) return { error: "Calibration distance must be positive." };
  if (!(calibration_paces > 0)) return { error: "Calibration paces must be positive." };
  if (!(current_paces >= 0)) return { error: "Current paces must be non-negative." };
  const tf = TERRAIN_FACTORS[terrain];
  if (!Number.isFinite(tf)) return { error: "Unknown terrain." };
  const pace_length_ft = calibration_distance_ft / calibration_paces;
  const distance_ft = (current_paces * pace_length_ft) / tf;
  const distance_m = distance_ft * 0.3048;
  // Quick reference: paces per 100 m by stride length.
  const ref_per_100m = {
    "short (2.5 ft)": Math.round((100 / 0.3048) / 2.5),
    "average (3 ft)": Math.round((100 / 0.3048) / 3.0),
    "long (3.5 ft)": Math.round((100 / 0.3048) / 3.5),
  };
  return { pace_length_ft, distance_ft, distance_m, terrain_factor: tf, ref_per_100m };
}

export const pacingExample = { inputs: { calibration_distance_ft: 200, calibration_paces: 75, current_paces: 250, terrain: "rolling" } };

// --- 228: Magnetic Declination and Bearing Conversion ---
//
// "East is least, west is best" - east declination subtracts when
// converting magnetic bearing -> true; west declination adds.

export function computeBearingConversion({ declination_deg = 0, bearing_deg = 0, direction = "magnetic_to_true" }) {
  if (declination_deg < -180 || declination_deg > 180) return { error: "Declination out of range." };
  if (bearing_deg < 0 || bearing_deg > 360) return { error: "Bearing out of range." };
  let result;
  let memo;
  if (direction === "magnetic_to_true") {
    // True = magnetic + east declination - west declination, i.e., add east, subtract west.
    result = bearing_deg + declination_deg;
    memo = "true = magnetic + (east) declination, or - (west) declination";
  } else if (direction === "true_to_magnetic") {
    result = bearing_deg - declination_deg;
    memo = "magnetic = true - (east) declination, or + (west) declination";
  } else {
    return { error: "Unknown direction." };
  }
  // Normalize 0-360.
  while (result < 0) result += 360;
  while (result >= 360) result -= 360;
  return { result_deg: result, memo };
}

export const bearingExample = { inputs: { declination_deg: 12, bearing_deg: 280, direction: "magnetic_to_true" } };

// --- 229: Slope Angle and Avalanche Risk Window ---
//
// Spec-v9 §F.3 names this tile and proposes an expanded version with
// aspect / 24-hr snowfall / warning-level inputs and a 4-band
// classification (< 25 low / 25-30 caution / 30-45 danger / > 45 sluffs).
// The spec-v9 implementation-status banner accepts the simpler existing
// implementation as sufficient ("the existing slope-avalanche tile
// already covers the basics") — the 30-45 deg start-zone window is the
// AIARE-published consensus value and is what a screening tool needs to
// flag. The expanded inputs would add nuance without adding decision
// signal: aspect / snowfall / warning-level all push the user back to
// the daily avalanche advisory, which the limitation banner already
// directs them to (avalanche.org). If a future maintainer expands this
// tile, the §F.3 spec is the reference.

export function computeSlopeAvalanche({ rise_ft = 0, run_ft = 0, measured_angle_deg = 0 }) {
  let angle;
  if (measured_angle_deg > 0) {
    angle = measured_angle_deg;
  } else if (rise_ft > 0 && run_ft > 0) {
    angle = (Math.atan2(rise_ft, run_ft) * 180) / Math.PI;
  } else {
    return { error: "Provide either measured angle or rise + run." };
  }
  if (angle < 0 || angle > 90) return { error: "Angle out of range." };
  const percent = Math.tan((angle * Math.PI) / 180) * 100;
  const in_window = angle >= 30 && angle <= 45;
  return {
    angle_deg: angle,
    slope_percent: percent,
    in_avalanche_window: in_window,
  };
}

export const slopeAvalancheExample = { inputs: { rise_ft: 0, run_ft: 0, measured_angle_deg: 38 } };

// --- 230: Backcountry Water and Caloric Requirement ---

export const WATER_LITERS_BASELINE = {
  cool: 2.0, moderate: 3.5, hot: 5.0, extreme: 6.0,
};
export const EXERTION_KCAL_FACTOR = {
  easy: 1.4, moderate: 1.7, hard: 2.0, extreme: 2.5,
};

export function computeBackcountryNeeds({ body_weight_lb = 0, ambient_band = "moderate", exertion = "moderate", trip_days = 1, group_size = 1 }) {
  if (!(body_weight_lb > 0)) return { error: "Body weight must be positive." };
  if (!(trip_days > 0)) return { error: "Trip days must be positive." };
  if (!(group_size >= 1)) return { error: "Group size must be at least 1." };
  const water_l = WATER_LITERS_BASELINE[ambient_band];
  if (!Number.isFinite(water_l)) return { error: "Unknown ambient band." };
  const factor = EXERTION_KCAL_FACTOR[exertion];
  if (!Number.isFinite(factor)) return { error: "Unknown exertion level." };
  // Kcal per day from a public Mifflin-St Jeor sedentary baseline approx
  // 1500 kcal at 150 lb scaled linearly with weight, multiplied by exertion factor.
  const baseline_kcal = (body_weight_lb / 150) * 1500;
  const kcal_per_day = baseline_kcal * factor;
  const water_per_day = water_l;
  const trip_water = water_per_day * trip_days * group_size;
  const trip_kcal = kcal_per_day * trip_days * group_size;
  return { water_per_day_l: water_per_day, kcal_per_day, trip_water_l: trip_water, trip_kcal };
}

export const backcountryExample = { inputs: { body_weight_lb: 175, ambient_band: "hot", exertion: "hard", trip_days: 3, group_size: 4 } };

// --- 231: UTM and Lat-Long Conversion (WGS84) ---
//
// Public Krueger / USGS deterministic forward and inverse formulas.
// Datum support: WGS84 (default) and a small offset table for NAD83/NAD27.

const WGS84 = { a: 6378137.0, f: 1 / 298.257223563 };

function utmZone(lon_deg) {
  return Math.floor((lon_deg + 180) / 6) + 1;
}

export function latlonToUTM(lat_deg, lon_deg) {
  if (lat_deg < -80 || lat_deg > 84) return { error: "UTM is defined for latitudes -80 to 84." };
  const a = WGS84.a;
  const f = WGS84.f;
  const e2 = f * (2 - f);
  const ePrime2 = e2 / (1 - e2);
  const k0 = 0.9996;
  const zone = utmZone(lon_deg);
  const lon0 = (zone * 6 - 183) * Math.PI / 180;
  const phi = lat_deg * Math.PI / 180;
  const lam = lon_deg * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = ePrime2 * Math.cos(phi) ** 2;
  const A = Math.cos(phi) * (lam - lon0);
  const M = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * phi
    - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi)
  );
  const easting = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * A ** 5 / 120) + 500000;
  let northing = k0 * (M + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * A ** 6 / 720));
  if (lat_deg < 0) northing += 10000000;
  const hemisphere = lat_deg >= 0 ? "N" : "S";
  return { zone, hemisphere, easting, northing };
}

export function utmToLatLon(zone, hemisphere, easting, northing) {
  const a = WGS84.a;
  const f = WGS84.f;
  const e2 = f * (2 - f);
  const ePrime2 = e2 / (1 - e2);
  const k0 = 0.9996;
  const x = easting - 500000;
  const y = hemisphere === "S" ? northing - 10000000 : northing;
  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
  const T1 = Math.tan(phi1) ** 2;
  const C1 = ePrime2 * Math.cos(phi1) ** 2;
  const R1 = a * (1 - e2) / (1 - e2 * Math.sin(phi1) ** 2) ** 1.5;
  const D = x / (N1 * k0);
  const phi = phi1 - (N1 * Math.tan(phi1) / R1) * (
    D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrime2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ePrime2 - 3 * C1 * C1) * D ** 6 / 720
  );
  const lam0 = (zone * 6 - 183) * Math.PI / 180;
  const lam = lam0 + (D
    - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrime2 + 24 * T1 * T1) * D ** 5 / 120
  ) / Math.cos(phi1);
  return { lat_deg: phi * 180 / Math.PI, lon_deg: lam * 180 / Math.PI };
}

export function computeUTM({ direction = "latlon_to_utm", lat_deg = 0, lon_deg = 0, zone = 0, hemisphere = "N", easting = 0, northing = 0 }) {
  if (direction === "latlon_to_utm") {
    if (lon_deg < -180 || lon_deg > 180) return { error: "Longitude out of range." };
    return latlonToUTM(lat_deg, lon_deg);
  }
  if (direction === "utm_to_latlon") {
    if (zone < 1 || zone > 60) return { error: "Zone out of range (1-60)." };
    if (!(easting > 0 && northing >= 0)) return { error: "Easting and northing must be positive." };
    if (!["N", "S"].includes(hemisphere)) return { error: "Hemisphere must be N or S." };
    return utmToLatLon(zone, hemisphere, easting, northing);
  }
  return { error: "Unknown direction." };
}

export const utmExample = { inputs: { direction: "latlon_to_utm", lat_deg: 39.7392, lon_deg: -104.9903, zone: 0, hemisphere: "N", easting: 0, northing: 0 } };

// --- 232: Sunrise / Sunset (NOAA solar-position algorithm) ---

function fractionalYear(date) {
  // NOAA approximation: gamma = (2*pi/365) * (day_of_year - 1 + (hour - 12)/24)
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const day = (date.getTime() - start.getTime()) / 86400000;
  return (2 * Math.PI / 365) * (day);
}

export function computeSolarTimes({ lat_deg = 0, lon_deg = 0, date_iso = "", tz_offset_hours = 0 }) {
  if (!(lat_deg >= -89.5 && lat_deg <= 89.5)) return { error: "Latitude out of range." };
  if (!(lon_deg >= -180 && lon_deg <= 180)) return { error: "Longitude out of range." };
  const d = new Date(date_iso || new Date().toISOString().slice(0, 10) + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return { error: "Invalid date." };
  const gamma = fractionalYear(d);
  // Equation of time (minutes) and declination (radians) per NOAA
  const eqtime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
  const decl = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
  const lat_rad = lat_deg * Math.PI / 180;
  function hourAngleFor(zenith_deg) {
    const zen = zenith_deg * Math.PI / 180;
    const cosH = (Math.cos(zen) - Math.sin(lat_rad) * Math.sin(decl)) / (Math.cos(lat_rad) * Math.cos(decl));
    if (cosH < -1) return null; // sun never sets
    if (cosH > 1) return null;  // sun never rises
    return Math.acos(cosH) * 180 / Math.PI;
  }
  function utcMinutesFor(zenith_deg, isSunrise) {
    const ha = hourAngleFor(zenith_deg);
    if (ha === null) return null;
    return 720 - 4 * (lon_deg + (isSunrise ? ha : -ha)) - eqtime;
  }
  function fmtTime(utcMinutes) {
    if (utcMinutes === null) return null;
    let local = utcMinutes + tz_offset_hours * 60;
    while (local < 0) local += 1440;
    while (local >= 1440) local -= 1440;
    const h = Math.floor(local / 60);
    const m = Math.floor(local - h * 60);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }
  const sunrise = utcMinutesFor(90.833, true);   // standard solar zenith with refraction
  const sunset = utcMinutesFor(90.833, false);
  const civil_dawn = utcMinutesFor(96, true);
  const civil_dusk = utcMinutesFor(96, false);
  const nautical_dawn = utcMinutesFor(102, true);
  const nautical_dusk = utcMinutesFor(102, false);
  const astro_dawn = utcMinutesFor(108, true);
  const astro_dusk = utcMinutesFor(108, false);
  const daylight_minutes = (sunrise !== null && sunset !== null) ? (sunset - sunrise) : null;
  return {
    sunrise: fmtTime(sunrise),
    sunset: fmtTime(sunset),
    civil_dawn: fmtTime(civil_dawn),
    civil_dusk: fmtTime(civil_dusk),
    nautical_dawn: fmtTime(nautical_dawn),
    nautical_dusk: fmtTime(nautical_dusk),
    astro_dawn: fmtTime(astro_dawn),
    astro_dusk: fmtTime(astro_dusk),
    daylight_minutes,
    declination_deg: decl * 180 / Math.PI,
    eqtime_min: eqtime,
  };
}

export const solarExample = { inputs: { lat_deg: 39.7392, lon_deg: -104.9903, date_iso: "2026-06-21", tz_offset_hours: -6 } };

// --- Renderers ---

function _r(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    // v10 §B.3: render the simplified-screening limitation banner above
    // the inputs when the spec names a limitationId. Canonical copy lives
    // in limitation-banner.js so a future language tweak is one-file.
    if (spec.limitationId) {
      renderLimitationBanner(inputRegion, getLimitationCopy(spec.limitationId));
    }
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else if (f.kind === "text") {
        const wrap = document.createElement("div"); wrap.className = "field";
        const lab = document.createElement("label"); lab.htmlFor = f.id; lab.textContent = f.label;
        const input = document.createElement("input"); input.type = "text"; input.id = f.id; input.autocomplete = "off";
        wrap.appendChild(lab); wrap.appendChild(input);
        field = { wrap, input };
      }
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else if (f.kind === "text") params[f.key] = fields[f.key].input.value;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener("input", update);
    }
  };
}

const renderPacing = _r({
  citation: "Citation: Public USAF / SAR field references generally. Pace length = calibration distance / paces; terrain factor lengthens the count.",
  example: pacingExample.inputs,
  fields: [
    { key: "calibration_distance_ft", label: "Calibration distance (ft)", kind: "number" },
    { key: "calibration_paces",       label: "Calibration paces",         kind: "number" },
    { key: "current_paces",           label: "Current paces",             kind: "number" },
    { key: "terrain", label: "Terrain", kind: "select", options: Object.keys(TERRAIN_FACTORS).map((k) => ({ value: k, label: k })) },
  ],
  outputs: [
    { key: "p", id: "pa-out-p", label: "Pace length",        value: (r) => fmt(r.pace_length_ft, 2) + " ft" },
    { key: "f", id: "pa-out-f", label: "Distance",           value: (r) => fmt(r.distance_ft, 1) + " ft / " + fmt(r.distance_m, 1) + " m" },
    { key: "t", id: "pa-out-t", label: "Terrain factor",     value: (r) => String(r.terrain_factor) },
  ],
  compute: computePacing,
});

const renderBearing = _r({
  citation: "Citation: NOAA NCEI World Magnetic Model by name only. East is least, west is best.",
  example: bearingExample.inputs,
  fields: [
    { key: "declination_deg", label: "Declination (deg, +E / -W)", kind: "number" },
    { key: "bearing_deg",     label: "Bearing (deg)",              kind: "number" },
    { key: "direction", label: "Direction", kind: "select", options: [{ value: "magnetic_to_true", label: "Magnetic -> True" }, { value: "true_to_magnetic", label: "True -> Magnetic" }] },
  ],
  outputs: [
    { key: "r", id: "br-out-r", label: "Result", value: (r) => fmt(r.result_deg, 2) + " deg" },
    { key: "m", id: "br-out-m", label: "Memo",   value: (r) => r.memo },
  ],
  compute: computeBearingConversion,
});

const renderSlope = _r({
  citation: "Notice: This is geometry. Avalanche forecasting is not. Consult avalanche.org and a qualified guide. Citation: American Avalanche Association published 30-45 deg start-zone window by name only.",
  limitationId: "slope-avalanche",
  example: slopeAvalancheExample.inputs,
  fields: [
    { key: "rise_ft",            label: "Rise (ft, optional)",        kind: "number" },
    { key: "run_ft",             label: "Run (ft, optional)",         kind: "number" },
    { key: "measured_angle_deg", label: "Measured angle (deg)",       kind: "number" },
  ],
  outputs: [
    { key: "a", id: "sl-out-a", label: "Slope angle",            value: (r) => fmt(r.angle_deg, 1) + " deg" },
    { key: "p", id: "sl-out-p", label: "Slope %",                value: (r) => fmt(r.slope_percent, 1) + " %" },
    { key: "w", id: "sl-out-w", label: "30-45 deg avalanche window", value: (r) => r.in_avalanche_window ? "INSIDE" : "outside" },
  ],
  compute: computeSlopeAvalanche,
});

const renderBackcountry = _r({
  citation: "Citation: Public USACE / military doctrine water benchmarks (2-6 L/day). Caloric estimate from public exercise-physiology benchmarks (2500-6000 kcal/day).",
  example: backcountryExample.inputs,
  fields: [
    { key: "body_weight_lb", label: "Body weight (lb)", kind: "number" },
    { key: "ambient_band",   label: "Ambient band", kind: "select", options: Object.keys(WATER_LITERS_BASELINE).map((k) => ({ value: k, label: k })) },
    { key: "exertion",       label: "Exertion", kind: "select", options: Object.keys(EXERTION_KCAL_FACTOR).map((k) => ({ value: k, label: k })) },
    { key: "trip_days",      label: "Trip days", kind: "number", default: 1 },
    { key: "group_size",     label: "Group size", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "w", id: "bc-out-w", label: "Water / person / day", value: (r) => fmt(r.water_per_day_l, 2) + " L" },
    { key: "k", id: "bc-out-k", label: "Kcal / person / day",  value: (r) => fmt(r.kcal_per_day, 0) + " kcal" },
    { key: "tw", id: "bc-out-tw", label: "Trip water (group)", value: (r) => fmt(r.trip_water_l, 1) + " L" },
    { key: "tk", id: "bc-out-tk", label: "Trip kcal (group)",  value: (r) => fmt(r.trip_kcal, 0) + " kcal" },
  ],
  compute: computeBackcountryNeeds,
});

function renderUTM(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Krueger / USGS public-domain UTM forward and inverse formulas. WGS84 datum.";
  attachExampleButton(inputRegion, () => fillExample(utmExample.inputs));
  const dir = makeSelect("Direction", "u-d", [{ value: "latlon_to_utm", label: "Lat/Lon -> UTM" }, { value: "utm_to_latlon", label: "UTM -> Lat/Lon" }]);
  const lat = makeNumber("Latitude (deg)", "u-lat", { step: "any" });
  const lon = makeNumber("Longitude (deg)", "u-lon", { step: "any" });
  const zone = makeNumber("UTM zone", "u-z", { step: "1", min: "1", max: "60" });
  const hemi = makeSelect("Hemisphere", "u-h", [{ value: "N", label: "N" }, { value: "S", label: "S" }]);
  const east = makeNumber("Easting (m)", "u-e", { step: "any", min: "0" });
  const north = makeNumber("Northing (m)", "u-n", { step: "any", min: "0" });
  for (const f of [dir, lat, lon, zone, hemi, east, north]) inputRegion.appendChild(f.wrap);
  const oA = makeOutputLine(outputRegion, "Result A", "u-out-a");
  const oB = makeOutputLine(outputRegion, "Result B", "u-out-b");
  function fillExample(v) {
    dir.select.value = v.direction;
    lat.input.value = v.lat_deg; lon.input.value = v.lon_deg;
    zone.input.value = v.zone; hemi.select.value = v.hemisphere;
    east.input.value = v.easting; north.input.value = v.northing;
    update();
  }
  const update = debounce(() => {
    const r = computeUTM({
      direction: dir.select.value,
      lat_deg: Number(lat.input.value) || 0,
      lon_deg: Number(lon.input.value) || 0,
      zone: Number(zone.input.value) || 0,
      hemisphere: hemi.select.value,
      easting: Number(east.input.value) || 0,
      northing: Number(north.input.value) || 0,
    });
    if (r.error) { oA.textContent = r.error; oB.textContent = "-"; return; }
    if (dir.select.value === "latlon_to_utm") {
      oA.textContent = "Zone " + r.zone + r.hemisphere;
      oB.textContent = "E " + fmt(r.easting, 1) + " / N " + fmt(r.northing, 1);
    } else {
      oA.textContent = "Lat " + fmt(r.lat_deg, 6);
      oB.textContent = "Lon " + fmt(r.lon_deg, 6);
    }
  }, DEBOUNCE_MS);
  for (const el of [dir.select, lat.input, lon.input, zone.input, hemi.select, east.input, north.input]) el.addEventListener("input", update);
}

const renderSolar = _r({
  citation: "Citation: NOAA Solar Calculator algorithm by name only. Bundles no almanac data; the algorithm is deterministic from date and location.",
  example: solarExample.inputs,
  fields: [
    { key: "lat_deg", label: "Latitude (deg)", kind: "number" },
    { key: "lon_deg", label: "Longitude (deg)", kind: "number" },
    { key: "date_iso", label: "Date (YYYY-MM-DD)", kind: "text" },
    { key: "tz_offset_hours", label: "Timezone offset (hr)", kind: "number" },
  ],
  outputs: [
    { key: "sr", id: "ss-out-sr", label: "Sunrise",          value: (r) => r.sunrise || "n/a" },
    { key: "ss", id: "ss-out-ss", label: "Sunset",           value: (r) => r.sunset || "n/a" },
    { key: "cd", id: "ss-out-cd", label: "Civil dawn / dusk",value: (r) => (r.civil_dawn || "-") + " / " + (r.civil_dusk || "-") },
    { key: "dl", id: "ss-out-dl", label: "Daylight",         value: (r) => r.daylight_minutes === null ? "n/a" : fmt(r.daylight_minutes, 0) + " min" },
    { key: "de", id: "ss-out-de", label: "Declination",      value: (r) => fmt(r.declination_deg, 2) + " deg" },
  ],
  compute: computeSolarTimes,
});

// =====================================================================
// v9 §F.2: Lightning 30-30 rule countdown (basic distance + advisory)
// =====================================================================
//
// Public math: speed of sound at sea level is approximately 1125 ft/s;
// 5 seconds approximates one mile. The NWS 30-30 rule treats < 30 sec
// flash-to-bang (~6 miles) as the seek-shelter threshold. The renderer
// also exposes the spec-v9 §F.2 "30-minute resume countdown": tap "Last
// strike now" to start a 30-minute timer; tap again to pause / resume.
// State serializes through the URL hash so a reload does not reset.

export const LIGHTNING_TIMER_DURATION_S = 30 * 60;

// Pure helpers for timer-state encoding / decoding. Exported so unit
// tests can verify the round-trip without instantiating a renderer.
//
// State string grammar:
//   ""                  -> idle (no timer running)
//   "active:<end_at_s>" -> running; expires at the given wall-clock
//                          epoch seconds. Wall-clock means a reload
//                          inside the 30-minute window resumes at the
//                          correct remaining time without any extra
//                          bookkeeping.
//   "paused:<rem_s>"    -> paused with `rem_s` seconds remaining.
export function parseTimerState(s) {
  if (s === null || s === undefined || s === "") return { state: "idle" };
  const str = String(s);
  if (str.startsWith("active:")) {
    const n = Number(str.slice(7));
    if (!Number.isFinite(n)) return { state: "idle" };
    return { state: "active", end_at_s: Math.floor(n) };
  }
  if (str.startsWith("paused:")) {
    const n = Number(str.slice(7));
    if (!Number.isFinite(n) || n <= 0) return { state: "idle" };
    return { state: "paused", remaining_s: Math.floor(n) };
  }
  return { state: "idle" };
}

export function encodeTimerState(t) {
  if (!t || t.state === "idle") return "";
  if (t.state === "active" && Number.isFinite(t.end_at_s)) {
    return "active:" + Math.floor(t.end_at_s);
  }
  if (t.state === "paused" && Number.isFinite(t.remaining_s) && t.remaining_s > 0) {
    return "paused:" + Math.floor(t.remaining_s);
  }
  return "";
}

// Returns the seconds remaining for any timer state at wall-clock `now_s`.
// Idle returns null. Active and paused saturate at 0; an active timer past
// its end-time has zero remaining (the renderer flips it back to idle).
export function timerRemainingSeconds(t, now_s) {
  if (!t || t.state === "idle") return null;
  if (t.state === "active") {
    return Math.max(0, Math.floor((t.end_at_s || 0) - (Number(now_s) || 0)));
  }
  if (t.state === "paused") {
    return Math.max(0, Math.floor(t.remaining_s || 0));
  }
  return null;
}

export function formatTimerMMSS(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

export function computeLightningCountdown({ flash_to_bang_s = 0 } = {}) {
  const s = Number(flash_to_bang_s) || 0;
  if (!(s > 0)) return { error: "Flash-to-bang seconds must be positive." };
  const distance_miles = s / 5;
  const distance_km = distance_miles * 1.609344;
  const seek_shelter = s < 30;
  let band;
  if (s < 5) band = "imminent danger (< 1 mi); seek shelter NOW";
  else if (s < 30) band = "seek shelter (NWS 30-30 rule; storm within 6 mi)";
  else if (s < 60) band = "caution (6-12 mi); continue to monitor";
  else band = "storm distant (> 12 mi); continue to monitor";
  return { distance_miles, distance_km, seek_shelter, band };
}

export const lightningCountdownExample = {
  // Flash-to-bang 15 s -> 3 mi; seek shelter (NWS 30-30).
  inputs: { flash_to_bang_s: 15 },
};

// Custom renderer (not the _r factory) so we can mount the resume-timer
// UI alongside the standard flash-to-bang inputs and outputs. The timer
// state lives in a hidden input id="lc-timer" so wireHashState picks it
// up automatically; reload restores via applyHashState dispatching change.
function renderLightning(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NOAA / NWS lightning safety. The 30-30 rule is an NWS public guideline. Speed of sound ~ 1125 ft/s; 5 s ~ 1 mi. Free at weather.gov/safety/lightning.";
  attachExampleButton(inputRegion, () => {
    sec.input.value = String(lightningCountdownExample.inputs.flash_to_bang_s);
    update();
  });
  const sec = makeNumber("Seconds between flash and thunder", "lc-sec", { step: "any", min: "0" });
  inputRegion.appendChild(sec.wrap);

  // Resume-timer UI. The 30-minute NWS resume countdown begins when the
  // user taps "Last strike now"; subsequent taps pause / resume. The
  // hidden input is the persistence channel; the visible button + readout
  // are derived from its value plus a wall-clock tick.
  const timerWrap = document.createElement("div");
  timerWrap.className = "field lightning-timer";
  const timerLabel = document.createElement("label");
  timerLabel.htmlFor = "lc-timer-btn";
  timerLabel.textContent = "NWS 30-minute resume timer";
  timerWrap.appendChild(timerLabel);
  const timerRow = document.createElement("div");
  timerRow.className = "lightning-timer-row";
  const timerBtn = document.createElement("button");
  timerBtn.type = "button";
  timerBtn.id = "lc-timer-btn";
  timerBtn.className = "lightning-timer-btn";
  const timerReadout = document.createElement("span");
  timerReadout.className = "lightning-timer-readout";
  timerReadout.setAttribute("aria-live", "polite");
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "lightning-timer-reset";
  resetBtn.textContent = "Reset";
  timerRow.appendChild(timerBtn);
  timerRow.appendChild(timerReadout);
  timerRow.appendChild(resetBtn);
  timerWrap.appendChild(timerRow);
  // Hidden persistence input. The wireHashState helper sees this as a
  // regular DOM input with an id, so its value rides the URL hash like
  // any other input field. The id avoids the v=schema reserved key.
  const timerHidden = document.createElement("input");
  timerHidden.type = "hidden";
  timerHidden.id = "lc-timer";
  timerHidden.value = "";
  timerWrap.appendChild(timerHidden);
  inputRegion.appendChild(timerWrap);

  const outs = {};
  for (const o of [
    { key: "mi", id: "lc-out-mi", label: "Distance (mi)" },
    { key: "km", id: "lc-out-km", label: "Distance (km)" },
    { key: "ss", id: "lc-out-ss", label: "NWS 30-30 rule" },
    { key: "b",  id: "lc-out-b",  label: "Advisory" },
  ]) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);

  function nowSec() { return Math.floor(Date.now() / 1000); }

  function renderTimerUi() {
    const t = parseTimerState(timerHidden.value);
    const rem = timerRemainingSeconds(t, nowSec());
    if (t.state === "idle") {
      timerBtn.textContent = "Last strike now";
      timerBtn.setAttribute("aria-label", "Start 30-minute NWS resume timer");
      timerReadout.textContent = formatTimerMMSS(LIGHTNING_TIMER_DURATION_S);
      resetBtn.hidden = true;
      return;
    }
    if (t.state === "active") {
      if (rem <= 0) { setTimerState({ state: "idle" }); return; }
      timerBtn.textContent = "Pause";
      timerBtn.setAttribute("aria-label", "Pause NWS resume timer");
      timerReadout.textContent = formatTimerMMSS(rem);
      resetBtn.hidden = false;
      return;
    }
    if (t.state === "paused") {
      timerBtn.textContent = "Resume";
      timerBtn.setAttribute("aria-label", "Resume NWS resume timer");
      timerReadout.textContent = formatTimerMMSS(rem);
      resetBtn.hidden = false;
    }
  }

  function setTimerState(next) {
    timerHidden.value = encodeTimerState(next);
    // Notify wireHashState (and applyHashState consumers) that the
    // serialized timer state changed.
    timerHidden.dispatchEvent(new Event("input", { bubbles: true }));
    timerHidden.dispatchEvent(new Event("change", { bubbles: true }));
    renderTimerUi();
  }

  timerBtn.addEventListener("click", () => {
    const t = parseTimerState(timerHidden.value);
    if (t.state === "idle") {
      setTimerState({ state: "active", end_at_s: nowSec() + LIGHTNING_TIMER_DURATION_S });
    } else if (t.state === "active") {
      const rem = timerRemainingSeconds(t, nowSec());
      setTimerState({ state: "paused", remaining_s: rem });
    } else if (t.state === "paused") {
      setTimerState({ state: "active", end_at_s: nowSec() + (t.remaining_s || 0) });
    }
  });
  resetBtn.addEventListener("click", () => setTimerState({ state: "idle" }));

  // applyHashState dispatches change on the hidden input after writing
  // its value; resume the UI in lockstep.
  timerHidden.addEventListener("change", renderTimerUi);

  // One-Hz tick to refresh the readout while active. Stops itself if the
  // input region is detached (the view-region clears between tools).
  const tick = setInterval(() => {
    if (!inputRegion.isConnected) { clearInterval(tick); return; }
    const t = parseTimerState(timerHidden.value);
    if (t.state === "active") renderTimerUi();
  }, 1000);

  const update = debounce(() => {
    const v = Number(sec.input.value) || 0;
    const r = computeLightningCountdown({ flash_to_bang_s: v });
    if (r.error) {
      outs.mi.textContent = r.error;
      outs.km.textContent = outs.ss.textContent = outs.b.textContent = "-";
      return;
    }
    outs.mi.textContent = fmt(r.distance_miles, 1) + " mi";
    outs.km.textContent = fmt(r.distance_km, 1) + " km";
    outs.ss.textContent = r.seek_shelter ? "SEEK SHELTER" : "monitor";
    outs.b.textContent = r.band;
  }, DEBOUNCE_MS);
  sec.input.addEventListener("input", update);

  renderTimerUi();
}

// =====================================================================
// v9 §F.1: Magnetic Declination (NOAA NCEI World Magnetic Model 2025)
// =====================================================================
//
// Pure port of the public-domain NCEI WMM reference algorithm.
// Coefficients (g, h, dg, dh to degree 12) are bundled as a same-origin
// JSON shard at data/field/wmm/coefficients.json. The renderer loads
// them once per session and caches the parsed model. WMM2025 covers
// 2025-01-01 through 2029-12-31; a date outside that window flags a
// "model has expired" notice rather than silently producing a degraded
// answer. The tile carries the bearing-correction helper (magnetic <->
// true) so a field user can convert a compass reading without opening
// a second tile.

const WMM_A_WGS84 = 6378.137;        // WGS84 semi-major axis (km)
const WMM_B_WGS84 = 6356.7523142;    // WGS84 semi-minor axis (km)
const WMM_A_REF = 6371.2;            // geomagnetic reference radius (km)

function wmmSchmidtK(n, m) {
  if (m === 0) return 1;
  let denom = 1;
  for (let k = n - m + 1; k <= n + m; k++) denom *= k;
  return Math.sqrt(2 / denom);
}

// Decimal year for an ISO "YYYY-MM-DD" date string.
export function decimalYearFromIso(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NaN;
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return NaN;
  const y = d.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (d.getTime() - start) / (end - start);
}

// Compute the WMM forward solution. Returns geodetic field components
// (X north, Y east, Z down, all nT), the derived totals (H, F), the
// declination D and inclination I in degrees, plus secular variation
// rates (dD/dt etc.). `coefficients` is the parsed bundle (epoch,
// max_degree, coefficients[]).
export function computeWMM({ lat_deg, lon_deg, alt_km = 0, decimal_year, coefficients }) {
  if (!coefficients || !Array.isArray(coefficients.coefficients)) {
    return { error: "WMM coefficient bundle not loaded." };
  }
  if (!Number.isFinite(lat_deg) || lat_deg < -90 || lat_deg > 90) return { error: "Latitude out of range (-90 to 90)." };
  if (!Number.isFinite(lon_deg) || lon_deg < -180 || lon_deg > 180) return { error: "Longitude out of range (-180 to 180)." };
  if (!Number.isFinite(decimal_year)) return { error: "Invalid date." };
  const N = coefficients.max_degree;
  const dt = decimal_year - coefficients.epoch;
  const mat = () => Array.from({ length: N + 2 }, () => new Array(N + 2).fill(0));
  const G = mat(), H = mat(), DG = mat(), DH = mat();
  for (const co of coefficients.coefficients) {
    G[co.n][co.m] = co.g + co.dg * dt;
    H[co.n][co.m] = co.h + co.dh * dt;
    DG[co.n][co.m] = co.dg;
    DH[co.n][co.m] = co.dh;
  }
  const phi_g = lat_deg * Math.PI / 180;
  const lam = lon_deg * Math.PI / 180;
  const sing = Math.sin(phi_g), cosg = Math.cos(phi_g);
  const e2 = 1 - (WMM_B_WGS84 * WMM_B_WGS84) / (WMM_A_WGS84 * WMM_A_WGS84);
  const Rc = WMM_A_WGS84 / Math.sqrt(1 - e2 * sing * sing);
  const xp = (Rc + alt_km) * cosg;
  const zp = ((1 - e2) * Rc + alt_km) * sing;
  const r = Math.sqrt(xp * xp + zp * zp);
  const sin_phi_s = zp / r;
  const cos_phi_s = xp / r;
  const mu = sin_phi_s;       // cos(colat)
  const sinth = cos_phi_s;    // sin(colat)

  // Associated Legendre P_n^m(mu) (unnormalized) plus dP/dtheta.
  // Schmidt semi-normalization is applied during the field summation.
  const P = mat(), dP = mat();
  P[0][0] = 1; dP[0][0] = 0;
  for (let n = 1; n <= N; n++) {
    P[n][n] = (2 * n - 1) * sinth * P[n - 1][n - 1];
    dP[n][n] = (2 * n - 1) * (sinth * dP[n - 1][n - 1] + mu * P[n - 1][n - 1]);
  }
  for (let m = 0; m <= N; m++) {
    for (let n = m + 1; n <= N; n++) {
      const a1 = (2 * n - 1) / (n - m);
      if (n - 1 === m) {
        P[n][m] = a1 * mu * P[n - 1][m];
        dP[n][m] = a1 * (mu * dP[n - 1][m] - sinth * P[n - 1][m]);
      } else {
        const a2 = (n + m - 1) / (n - m);
        P[n][m] = a1 * mu * P[n - 1][m] - a2 * P[n - 2][m];
        dP[n][m] = a1 * (mu * dP[n - 1][m] - sinth * P[n - 1][m]) - a2 * dP[n - 2][m];
      }
    }
  }

  // Geocentric-spherical X' (north), Y' (east), Z' (down) and their
  // secular rates. WMM Tech Report Eqs. (10)-(12).
  let Xs = 0, Ys = 0, dXs = 0, dYs = 0, Zs_acc = 0, dZs_acc = 0;
  const ar = WMM_A_REF / r;
  let arn = ar * ar;
  for (let n = 1; n <= N; n++) {
    arn *= ar;
    for (let m = 0; m <= n; m++) {
      const K = wmmSchmidtK(n, m);
      const Pnm = K * P[n][m];
      const dPnm = K * dP[n][m];
      const cml = Math.cos(m * lam), sml = Math.sin(m * lam);
      const cs = G[n][m] * cml + H[n][m] * sml;
      const sc = G[n][m] * sml - H[n][m] * cml;
      const dcs = DG[n][m] * cml + DH[n][m] * sml;
      const dsc = DG[n][m] * sml - DH[n][m] * cml;
      Xs += arn * cs * dPnm;
      dXs += arn * dcs * dPnm;
      Zs_acc += arn * (n + 1) * cs * Pnm;
      dZs_acc += arn * (n + 1) * dcs * Pnm;
      if (m > 0 && sinth > 1e-12) {
        Ys += arn * m * sc * Pnm / sinth;
        dYs += arn * m * dsc * Pnm / sinth;
      }
    }
  }
  // Z' (down) is the negative of the accumulator (sign from V = +grad ... B = -grad V).
  const Zp = -Zs_acc;
  const dZp = -dZs_acc;
  // Rotate geocentric -> geodetic by the psi = phi_s - phi_g offset.
  const sin_psi = sin_phi_s * cosg - cos_phi_s * sing;
  const cos_psi = cos_phi_s * cosg + sin_phi_s * sing;
  const X = Xs * cos_psi - Zp * sin_psi;
  const Y = Ys;
  const Z = Xs * sin_psi + Zp * cos_psi;
  const dX = dXs * cos_psi - dZp * sin_psi;
  const dY = dYs;
  const dZ = dXs * sin_psi + dZp * cos_psi;
  const Hh = Math.sqrt(X * X + Y * Y);
  const F = Math.sqrt(Hh * Hh + Z * Z);
  const RAD = 180 / Math.PI;
  const D = Math.atan2(Y, X) * RAD;
  const I = Math.atan2(Z, Hh) * RAD;
  const dH_ = Hh > 0 ? (X * dX + Y * dY) / Hh : 0;
  const dF = F > 0 ? (X * dX + Y * dY + Z * dZ) / F : 0;
  const dD = Hh > 0 ? RAD * (X * dY - Y * dX) / (Hh * Hh) : 0;
  const dI = F > 0 ? RAD * (Hh * dZ - Z * dH_) / (F * F) : 0;
  return { D, I, H: Hh, X, Y, Z, F, dD, dI, dH: dH_, dX, dY, dZ, dF };
}

// Worked-examples runner wrapper. Returns a stable contract describing
// the tile so the v10 §C runner can verify the tile is wired without
// embedding the 90-row coefficient bundle in every fixture. Numerical
// correctness against NCEI WMM2025_TestValues.txt (all 100 vectors) is
// exercised in test/unit/calc-field-v9.test.js.
export function computeMagneticDeclination() {
  return {
    kind: "wmm",
    model: "WMM-2025",
    valid_from: "2025-01-01",
    valid_until: "2029-12-31",
    bundled_at: "data/field/wmm/coefficients.json",
  };
}

// Single-shot cache for the WMM coefficient bundle.
let _wmmShard = null;
async function loadWmmCoefficients() {
  if (_wmmShard) return _wmmShard;
  _wmmShard = (async () => {
    try {
      const res = await fetch("data/field/wmm/coefficients.json", { cache: "default" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  })();
  return _wmmShard;
}

export const magneticDeclinationExample = {
  // Mid-CONUS reference point (Denver, CO) at sea level, 2026-01-01.
  // Tests in test/unit/calc-field-v9.test.js exercise the full NCEI
  // test-value table for higher-precision coverage.
  inputs: { lat_deg: 39.7392, lon_deg: -104.9903, alt_km: 0, date_iso: "2026-01-01", bearing_deg: 90, direction: "magnetic_to_true" },
};

function renderMagneticDeclination(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NOAA / NCEI World Magnetic Model 2025 (WMM 2025), valid 2025-2030. Public domain. Free at ncei.noaa.gov/products/world-magnetic-model. Solar storms, local geological anomalies, and ferrous gear can shift the local field by several degrees beyond the model. The model is not a substitute for a recent compass calibration.";
  attachExampleButton(inputRegion, () => fillExample());
  const lat = makeNumber("Latitude (deg, -90 to 90)", "md-lat", { step: "any" });
  const lon = makeNumber("Longitude (deg, -180 to 180)", "md-lon", { step: "any" });
  const alt = makeNumber("Altitude (km above WGS84 ellipsoid, optional)", "md-alt", { step: "any" });
  const dateWrap = document.createElement("div"); dateWrap.className = "field";
  const dateLab = document.createElement("label"); dateLab.htmlFor = "md-date"; dateLab.textContent = "Date (YYYY-MM-DD)";
  const dateInput = document.createElement("input"); dateInput.type = "text"; dateInput.id = "md-date"; dateInput.autocomplete = "off";
  dateWrap.appendChild(dateLab); dateWrap.appendChild(dateInput);
  const bearing = makeNumber("Bearing (deg, 0-360, optional)", "md-bearing", { step: "any" });
  const dir = makeSelect("Bearing direction", "md-dir", [
    { value: "magnetic_to_true", label: "Magnetic -> True" },
    { value: "true_to_magnetic", label: "True -> Magnetic" },
  ]);
  for (const f of [lat, lon, alt, { wrap: dateWrap }, bearing, dir]) inputRegion.appendChild(f.wrap);

  const outs = {};
  for (const o of [
    { key: "d", id: "md-out-d", label: "Declination" },
    { key: "i", id: "md-out-i", label: "Inclination" },
    { key: "h", id: "md-out-h", label: "Horizontal intensity" },
    { key: "f", id: "md-out-f", label: "Total intensity" },
    { key: "dd", id: "md-out-dd", label: "Annual change (declination)" },
    { key: "b", id: "md-out-b", label: "Converted bearing" },
    { key: "n", id: "md-out-n", label: "Model status" },
  ]) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);

  function fillExample() {
    const v = magneticDeclinationExample.inputs;
    lat.input.value = v.lat_deg; lon.input.value = v.lon_deg; alt.input.value = v.alt_km;
    dateInput.value = v.date_iso; bearing.input.value = v.bearing_deg; dir.select.value = v.direction;
    update();
  }
  function clearOuts(msg) {
    for (const k of Object.keys(outs)) outs[k].textContent = k === "d" ? msg : "-";
  }
  async function update() {
    const coefficients = await loadWmmCoefficients();
    if (!coefficients) { clearOuts("WMM bundle not loaded."); return; }
    const lat_deg = Number(lat.input.value);
    const lon_deg = Number(lon.input.value);
    if (!Number.isFinite(lat_deg) || !Number.isFinite(lon_deg) || (lat_deg === 0 && lon_deg === 0 && lat.input.value === "")) {
      clearOuts("Enter latitude and longitude."); return;
    }
    const alt_km = Number(alt.input.value) || 0;
    const date_iso = dateInput.value || new Date().toISOString().slice(0, 10);
    const decimal_year = decimalYearFromIso(date_iso);
    if (!Number.isFinite(decimal_year)) { clearOuts("Date must be YYYY-MM-DD."); return; }
    const r = computeWMM({ lat_deg, lon_deg, alt_km, decimal_year, coefficients });
    if (r.error) { clearOuts(r.error); return; }
    outs.d.textContent = fmt(r.D, 2) + " deg " + (r.D >= 0 ? "(east)" : "(west)");
    outs.i.textContent = fmt(r.I, 2) + " deg";
    outs.h.textContent = fmt(r.H, 1) + " nT";
    outs.f.textContent = fmt(r.F, 1) + " nT";
    outs.dd.textContent = fmt(r.dD, 3) + " deg/yr";
    const b_deg = Number(bearing.input.value);
    if (Number.isFinite(b_deg) && bearing.input.value !== "") {
      const conv = computeBearingConversion({ declination_deg: r.D, bearing_deg: b_deg, direction: dir.select.value });
      outs.b.textContent = conv.error ? conv.error : (fmt(conv.result_deg, 2) + " deg (" + (dir.select.value === "magnetic_to_true" ? "true" : "magnetic") + ")");
    } else {
      outs.b.textContent = "(enter a bearing to convert)";
    }
    // Date-window notice. WMM2025 is valid 2025-2030; warn outside.
    const validFrom = 2025.0, validUntil = 2030.0;
    if (decimal_year < validFrom || decimal_year >= validUntil) {
      outs.n.textContent = "Date outside WMM2025 validity (2025-2030). Result is extrapolated; update bundled coefficients on the next 5-year rollover.";
    } else {
      outs.n.textContent = "WMM2025 (NOAA NCEI). Valid 2025-2030; coefficients expire 2030-01-01.";
    }
  }
  for (const el of [lat.input, lon.input, alt.input, dateInput, bearing.input, dir.select]) {
    el.addEventListener("input", debounce(update, DEBOUNCE_MS));
  }
}

export const FIELD_RENDERERS = {
  "pacing-distance":   renderPacing,
  "bearing-conversion": renderBearing,
  "slope-avalanche":   renderSlope,
  "backcountry-needs": renderBackcountry,
  "utm-conversion":    renderUTM,
  "solar-times":       renderSolar,
  // v9
  "lightning-countdown": renderLightning,
  "magnetic-declination": renderMagneticDeclination,
};
