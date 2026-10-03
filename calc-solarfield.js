// Group A: Solar, storage, and EV field-design calculators.
//
// Split intact from calc-solar.js by spec-v1868. Calculator IDs, formulas,
// fields, outputs, citations, examples, and Group A assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine,
  attachExampleButton, fmt,
} from "./ui-fields.js";

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};

export const SOLARFIELD_RENDERERS = {};

// --- spec-v559 A: PV equipment grounding conductor (NEC 690.45) ---
// EGC from Table 250.122 by OCPD (or PV Isc where none), floored at 14 AWG; 690.45 waives the 250.122(B) upsize.
const _PV_EGC_TABLE_CU = [
  { ocpd_max_A: 15, awg: "14" }, { ocpd_max_A: 20, awg: "12" }, { ocpd_max_A: 60, awg: "10" },
  { ocpd_max_A: 100, awg: "8" }, { ocpd_max_A: 200, awg: "6" }, { ocpd_max_A: 300, awg: "4" },
  { ocpd_max_A: 400, awg: "3" }, { ocpd_max_A: 500, awg: "2" }, { ocpd_max_A: 600, awg: "1" },
  { ocpd_max_A: 800, awg: "1/0" }, { ocpd_max_A: 1000, awg: "2/0" },
];
// dims: in { ocpd_rating_a: I, pv_isc_a: I, vd_upsized: dimensionless } out: { basis_current_a: I, egc_awg: dimensionless }
export function computeSolarEgc69045({ ocpd_rating_a = 0, pv_isc_a = 0, vd_upsized = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ocpd = Number(ocpd_rating_a) || 0;
  const isc = Number(pv_isc_a) || 0;
  const vdUp = vd_upsized === true || vd_upsized === "yes";
  if (!(ocpd > 0) && !(isc > 0)) return { error: "Provide the OCPD rating, or the PV short-circuit current when there is no overcurrent device." };
  // 690.45(A): with no OCPD, an assumed device rated at the PV maximum circuit current, 1.25 x Isc (690.8(A)(1)).
  const basis_current_a = ocpd > 0 ? ocpd : 1.25 * isc;
  const has_ocpd = ocpd > 0;
  const row = _PV_EGC_TABLE_CU.find((r) => basis_current_a <= r.ocpd_max_A);
  if (!row) return { error: "Basis current exceeds the bundled Table 250.122 range; consult engineering analysis." };
  const egc_awg = row.awg; // table minimum is 14 AWG, so the 690.45 14 AWG floor is inherent
  return {
    basis_current_a, egc_awg, has_ocpd, egc_upsize_required: false, vd_upsized: vdUp,
    note: (has_ocpd
      ? "The EGC is sized from the overcurrent device rating via Table 250.122."
      : "This PV source circuit has no overcurrent device (two or fewer source circuits cannot deliver enough fault current), so the EGC is sized from an assumed device rated at the PV maximum circuit current, 1.25 x Isc (690.8(A)(1)), not an OCPD rating.")
      + " The EGC is never smaller than 14 AWG. NEC 690.45 waives the 250.122(B) proportional-upsize rule, so enlarging the circuit conductors for voltage drop does NOT require enlarging the EGC" + (vdUp ? " - the conductors were upsized here, but the EGC stays as sized." : ".") + " The NEC and the AHJ govern.",
  };
}
export const solarEgc69045Example = { inputs: { ocpd_rating_a: 20, pv_isc_a: 0, vd_upsized: "no" } };

function renderSolarEgc69045(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 690.45 equipment grounding conductors for PV systems with Table 250.122: the EGC is sized from the governing overcurrent rating (or, where there is no OCPD, from the PV short-circuit current), never smaller than 14 AWG, and 690.45 waives the 250.122(B) proportional upsize so enlarging the circuit conductors for voltage drop does not enlarge the EGC. The NEC and the AHJ govern.";
  const ocpd = makeNumber("OCPD rating (A, 0 = no OCPD)", "segc-ocpd", { step: "1", min: "0" });
  const isc = makeNumber("PV short-circuit current (A, used if no OCPD)", "segc-isc", { step: "any", min: "0" });
  const vd = makeSelect("Conductors upsized for voltage drop?", "segc-vd", [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]);
  for (const f of [ocpd, isc, vd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ocpd.input.value = "20"; isc.input.value = "0"; vd.select.value = "no"; update(); });
  const oBasis = makeOutputLine(outputRegion, "Sizing basis", "segc-out-basis");
  const oEgc = makeOutputLine(outputRegion, "Required EGC (copper)", "segc-out-egc");
  const oNote = makeOutputLine(outputRegion, "Note", "segc-out-note");
  const update = debounce(() => {
    const r = computeSolarEgc69045({ ocpd_rating_a: Number(ocpd.input.value) || 0, pv_isc_a: Number(isc.input.value) || 0, vd_upsized: vd.select.value });
    if (r.error) { oBasis.textContent = r.error; oEgc.textContent = "-"; oNote.textContent = ""; return; }
    oBasis.textContent = fmt(r.basis_current_a, 0) + " A (" + (r.has_ocpd ? "OCPD rating" : "PV Isc - no OCPD") + ")";
    oEgc.textContent = r.egc_awg + " AWG" + (r.egc_awg === "14" ? " (14 AWG minimum)" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ocpd, isc]) f.input.addEventListener("input", update);
  vd.select.addEventListener("change", update);
}
SOLARFIELD_RENDERERS["solar-egc-690-45"] = renderSolarEgc69045;

// ===================== spec-v790: sun shadow length =====================
// shadow = object_height / tan(sun_altitude). The shadow-to-height ratio is cot(altitude).
// dims: in { object_height_ft: L, sun_altitude_deg: dimensionless } out: { shadow_length_ft: L, shadow_ratio: dimensionless }
export function computeShadowLength({ object_height_ft = 0, sun_altitude_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(object_height_ft) || 0;
  const a = Number(sun_altitude_deg) || 0;
  if (!(h > 0)) return { error: "Object height must be positive." };
  if (!(a > 0 && a <= 90)) return { error: "Sun altitude must be over 0 and up to 90 degrees (a sun on the horizon throws an infinite shadow)." };
  const rad = Math.PI / 180;
  const shadow_length_ft = a >= 90 ? 0 : h / Math.tan(a * rad);
  const shadow_ratio = a >= 90 ? 0 : 1 / Math.tan(a * rad);
  if (![shadow_length_ft, shadow_ratio].every(Number.isFinite)) return { error: "Shadow-length math is not a finite value." };
  return {
    shadow_length_ft, shadow_ratio,
    note: "The ground shadow a vertical object casts on level ground: shadow = height / tan(sun altitude), and the shadow is height x cot(altitude), so the shadow-to-height ratio depends only on the sun angle. At a 45 degree sun the shadow equals the height; a low winter sun (say 20 degrees) throws a shadow nearly three times the height, while a high summer noon sun throws a short one. Use the winter-design sun elevation (lowest midday altitude, at the winter solstice from the site latitude, or from a solar-position source) to size the worst-case shade -- the case a solar-access, tree-planting, or building-setback study turns on. Level ground and a vertical object are assumed; a slope or a tilted object is a separate correction. A site-planning geometry; the actual sun path and terrain govern.",
  };
}
export const shadowLengthExample = { inputs: { object_height_ft: 10, sun_altitude_deg: 30 } };
function renderShadowLength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: sun shadow-length geometry (first-principles trigonometry): shadow = object height / tan(sun altitude); shadow-to-height ratio = cot(altitude). At 45 degrees the shadow equals the height; a low sun throws a long shadow. Use the winter-design sun elevation for the worst-case shade. Level ground and a vertical object assumed; the sun path and terrain govern.";
  const h = makeNumber("Object height (ft)", "shad-h", { step: "any", min: "0" });
  const a = makeNumber("Sun altitude above horizon (deg)", "shad-a", { step: "any", min: "0", max: "90" });
  for (const f of [h, a]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { h.input.value = "10"; a.input.value = "30"; update(); });
  const oL = makeOutputLine(outputRegion, "Shadow length", "shad-out-l");
  const oR = makeOutputLine(outputRegion, "Shadow-to-height ratio", "shad-out-r");
  const oNote = makeOutputLine(outputRegion, "Note", "shad-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeShadowLength({ object_height_ft: readNum(h.input), sun_altitude_deg: readNum(a.input) });
    if (r.error) { oL.textContent = r.error; oR.textContent = "-"; oNote.textContent = ""; return; }
    oL.textContent = fmt(r.shadow_length_ft, 2) + " ft";
    oR.textContent = fmt(r.shadow_ratio, 2) + " x height";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [h, a]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["shadow-length"] = renderShadowLength;

// ===================== spec-v1213: solar altitude / winter-design sun elevation =====================
// The shadow-length tile takes sun_altitude_deg and the pv-row-spacing tile takes profile_angle_deg,
// and both notes point at a source that does not exist: "the winter-design sun elevation ... from the
// site latitude, or from solar-times." But solar-times (calc-field.js) returns only sunrise/sunset/
// declination -- never the altitude. This computes it. sin(altitude) = sin(lat) sin(dec) + cos(lat)
// cos(dec) cos(H), the standard NOAA/ASHRAE relation, with the declination from Cooper's equation
// dec = 23.45 sin(360 (284 + n)/365) and the hour angle H = 15 (hours from solar noon). At solar noon
// this reduces to altitude = 90 - |lat - dec|, the winter-design sun elevation the shading tiles need.
// dims: in { latitude_deg: dimensionless, day_of_year: dimensionless, hours_from_solar_noon: dimensionless } out: { altitude_deg: dimensionless, declination_deg: dimensionless, hour_angle_deg: dimensionless }
export function computeSolarAltitude({ latitude_deg = 0, day_of_year = 355, hours_from_solar_noon = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const lat = Number(latitude_deg) || 0;
  const n = Number(day_of_year) || 0;
  const hrs = Number(hours_from_solar_noon) || 0;
  if (!(lat >= -90 && lat <= 90)) return { error: "Latitude must be between -90 and 90 degrees." };
  if (!(n >= 1 && n <= 366)) return { error: "Day of year must be between 1 and 366." };
  if (!(hrs >= -12 && hrs <= 12)) return { error: "Hours from solar noon must be between -12 and 12." };
  const rad = Math.PI / 180;
  const declination_deg = 23.45 * Math.sin(360 * (284 + n) / 365 * rad);
  const hour_angle_deg = 15 * hrs;
  const sinAlt = Math.sin(lat * rad) * Math.sin(declination_deg * rad)
    + Math.cos(lat * rad) * Math.cos(declination_deg * rad) * Math.cos(hour_angle_deg * rad);
  const altitude_deg = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad;
  if (![declination_deg, hour_angle_deg, altitude_deg].every(Number.isFinite)) return { error: "Solar-altitude math is not a finite value." };
  return {
    altitude_deg, declination_deg, hour_angle_deg, below_horizon: altitude_deg <= 0,
    note: "The solar altitude (elevation) angle, the sun position the shadow-length and pv-row-spacing tiles need but no tile produced (solar-times gives sunrise/sunset and declination, not altitude). sin(altitude) = sin(lat) sin(dec) + cos(lat) cos(dec) cos(H), with the declination from Cooper's equation dec = 23.45 sin(360 (284 + n)/365) for day-of-year n and the hour angle H = 15 x (hours from solar noon), negative in the morning. At solar noon (H = 0) this reduces to altitude = 90 - |lat - dec|, the WINTER-DESIGN sun elevation a shading, solar-access, tree, or setback study turns on: at 40 deg N on the winter solstice (n = 355, dec = -23.4) the noon sun reaches only 26.6 deg, and by 3 p.m. it has dropped to about 14 deg. Feed the altitude into the shadow-length tile or the noon/3 p.m. value into pv-row-spacing as the profile angle. A negative altitude means the sun is below the horizon (reported, not errored). True solar time and a flat horizon are assumed; the equation of time (from solar-times), refraction near the horizon, and terrain are separate. A site-planning geometry; the engineer of record and the actual sun path govern.",
  };
}
export const solarAltitudeExample = { inputs: { latitude_deg: 40, day_of_year: 355, hours_from_solar_noon: 0 } };
function renderSolarAltitude(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: solar altitude angle (NOAA/ASHRAE solar geometry): sin(altitude) = sin(lat) sin(dec) + cos(lat) cos(dec) cos(H), with the declination from Cooper's equation dec = 23.45 sin(360 (284 + n)/365) and the hour angle H = 15 (hours from solar noon); at solar noon altitude = 90 - |lat - dec|. True solar time and a flat horizon assumed; refraction and the equation of time are separate. A site-planning geometry; the actual sun path governs.";
  const lat = makeNumber("Latitude (deg, + north)", "salt-lat", { step: "any" });
  const doy = makeNumber("Day of year (1-365; 355 = winter solstice)", "salt-doy", { step: "1", min: "1", max: "366" });
  const hrs = makeNumber("Hours from solar noon (- morning, + afternoon)", "salt-hrs", { step: "any", min: "-12", max: "12" });
  for (const f of [lat, doy, hrs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lat.input.value = "40"; doy.input.value = "355"; hrs.input.value = "0"; update(); });
  const oAlt = makeOutputLine(outputRegion, "Solar altitude (elevation)", "salt-out-alt");
  const oDec = makeOutputLine(outputRegion, "Declination / hour angle", "salt-out-dec");
  const oNote = makeOutputLine(outputRegion, "Note", "salt-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeSolarAltitude({ latitude_deg: readNum(lat.input), day_of_year: readNum(doy.input), hours_from_solar_noon: readNum(hrs.input) });
    if (r.error) { oAlt.textContent = r.error; oDec.textContent = "-"; oNote.textContent = ""; return; }
    oAlt.textContent = fmt(r.altitude_deg, 1) + " deg" + (r.below_horizon ? " (sun below the horizon)" : "");
    oDec.textContent = fmt(r.declination_deg, 2) + " deg / " + fmt(r.hour_angle_deg, 1) + " deg";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [lat, doy, hrs]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["solar-altitude-angle"] = renderSolarAltitude;

// spec-v1248: solar azimuth (compass bearing of the sun). The companion to solar-altitude-angle:
// window-overhang-shade and shadow-DIRECTION studies need the azimuth, but solar-altitude produces
// only elevation and solar-times gives neither. Compass azimuth (clockwise from north) via the robust
// atan2 form gamma_s = atan2(cos(dec) sin(H), cos(H) cos(dec) sin(lat) - sin(dec) cos(lat)) measured
// from south (+west), then compass = 180 + gamma_s. Reduces to due south (180) at solar noon in the
// northern hemisphere. NOAA / Duffie & Beckman spherical trig.
// dims: in { latitude_deg: dimensionless, day_of_year: dimensionless, hours_from_solar_noon: dimensionless } out: { azimuth_deg: dimensionless, altitude_deg: dimensionless, declination_deg: dimensionless, hour_angle_deg: dimensionless }
export function computeSolarAzimuth({ latitude_deg = 0, day_of_year = 172, hours_from_solar_noon = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const lat = Number(latitude_deg) || 0;
  const n = Number(day_of_year) || 0;
  const hrs = Number(hours_from_solar_noon) || 0;
  if (!(lat >= -90 && lat <= 90)) return { error: "Latitude must be between -90 and 90 degrees." };
  if (!(n >= 1 && n <= 366)) return { error: "Day of year must be between 1 and 366." };
  if (!(hrs >= -12 && hrs <= 12)) return { error: "Hours from solar noon must be between -12 and 12." };
  const rad = Math.PI / 180;
  const declination_deg = 23.45 * Math.sin(360 * (284 + n) / 365 * rad);
  const hour_angle_deg = 15 * hrs;
  const phi = lat * rad, dec = declination_deg * rad, H = hour_angle_deg * rad;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const altitude_deg = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad;
  // azimuth from south, +west; then to compass (clockwise from north)
  const gammaS = Math.atan2(Math.cos(dec) * Math.sin(H), Math.cos(H) * Math.cos(dec) * Math.sin(phi) - Math.sin(dec) * Math.cos(phi));
  let azimuth_deg = (180 + gammaS / rad) % 360;
  if (azimuth_deg < 0) azimuth_deg += 360;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const compass = dirs[Math.round(azimuth_deg / 22.5) % 16];
  if (![azimuth_deg, altitude_deg, declination_deg, hour_angle_deg].every(Number.isFinite)) return { error: "Solar-azimuth math is not a finite value." };
  return {
    azimuth_deg, altitude_deg, declination_deg, hour_angle_deg, compass, below_horizon: altitude_deg <= 0,
    note: "The solar azimuth, the sun's compass bearing (degrees clockwise from true north: 90 = due east, 180 = due south, 270 = due west), the companion the window-overhang-shade tile and any shadow-DIRECTION study need alongside the altitude that solar-altitude-angle produces. It uses the robust two-argument form azimuth-from-south gamma = atan2(cos(dec) sin(H), cos(H) cos(dec) sin(lat) - sin(dec) cos(lat)), then compass bearing = 180 + gamma, with the declination from Cooper's equation dec = 23.45 sin(360 (284 + n)/365) and the hour angle H = 15 x (hours from solar noon), negative in the morning. At solar noon in the northern hemisphere the sun bears due south (180 deg); before noon it is to the east (bearing < 180) and after noon to the west (> 180). At 40 deg N on the summer solstice the sunrise sun sits well north of east (bearing ~ 58 deg) and swings to due south at noon. The shadow points in the opposite direction (bearing +/- 180). This is the compass bearing paired with the altitude to place the sun in the sky or aim a fixed panel; true solar time and a flat horizon are assumed, and the equation of time (from solar-times) and refraction are separate. A site-planning geometry; the actual sun path governs.",
  };
}
export const solarAzimuthExample = { inputs: { latitude_deg: 40, day_of_year: 172, hours_from_solar_noon: -3 } };
function renderSolarAzimuth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: solar azimuth (compass bearing, clockwise from true north): from-south azimuth gamma = atan2(cos(dec) sin(H), cos(H) cos(dec) sin(lat) - sin(dec) cos(lat)), compass = 180 + gamma; declination from Cooper's equation dec = 23.45 sin(360 (284 + n)/365), hour angle H = 15 (hours from solar noon) (NOAA / Duffie & Beckman solar geometry). At solar noon the northern-hemisphere sun bears due south (180 deg). True solar time and a flat horizon assumed; the equation of time and refraction are separate. The actual sun path governs.";
  const lat = makeNumber("Latitude (deg, + north)", "sazi-lat", { step: "any" });
  const doy = makeNumber("Day of year (1-365; 172 = summer solstice)", "sazi-doy", { step: "1", min: "1", max: "366" });
  const hrs = makeNumber("Hours from solar noon (- morning, + afternoon)", "sazi-hrs", { step: "any", min: "-12", max: "12" });
  for (const f of [lat, doy, hrs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lat.input.value = "40"; doy.input.value = "172"; hrs.input.value = "-3"; update(); });
  const oAzi = makeOutputLine(outputRegion, "Solar azimuth (compass bearing)", "sazi-out-azi");
  const oAlt = makeOutputLine(outputRegion, "Solar altitude (for reference)", "sazi-out-alt");
  const oNote = makeOutputLine(outputRegion, "Note", "sazi-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeSolarAzimuth({ latitude_deg: readNum(lat.input), day_of_year: readNum(doy.input), hours_from_solar_noon: readNum(hrs.input) });
    if (r.error) { oAzi.textContent = r.error; oAlt.textContent = "-"; oNote.textContent = ""; return; }
    oAzi.textContent = fmt(r.azimuth_deg, 1) + " deg (" + r.compass + ")";
    oAlt.textContent = fmt(r.altitude_deg, 1) + " deg" + (r.below_horizon ? " (sun below the horizon)" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [lat, doy, hrs]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["solar-azimuth-angle"] = renderSolarAzimuth;

// pv-rail-clamp-takeoff (spec-v896): PV racking rail, clamp, and splice takeoff.
// dims: in { rows: dimensionless, modules_per_row: dimensionless, module_width_ft: L, gap_ft: L, rails_per_row: dimensionless, rail_stock_ft: L } out: { run_len_ft: L, rail_lf: L, mid_clamps: dimensionless, end_clamps: dimensionless, splices: dimensionless }
export function computePvRailClampTakeoff({ rows = 2, modules_per_row = 12, module_width_ft = 3.42, gap_ft = 0, rails_per_row = 2, rail_stock_ft = 14 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rows > 0)) return { error: "Row count must be positive." };
  if (!(modules_per_row > 0)) return { error: "Modules per row must be positive." };
  if (!(module_width_ft > 0)) return { error: "Module width must be positive (ft)." };
  if (!(rails_per_row > 0)) return { error: "Rails per row must be positive." };
  if (!(rail_stock_ft > 0)) return { error: "Rail stock length must be positive (ft)." };
  if (gap_ft < 0) return { error: "Gap cannot be negative (ft)." };
  // N modules have N - 1 clamp gaps between them (until 2026-10-02 the run counted N).
  const run_len_ft = modules_per_row * module_width_ft + (modules_per_row - 1) * gap_ft;
  const rail_lf = rows * rails_per_row * run_len_ft;
  const mid_clamps = rails_per_row * rows * (modules_per_row - 1);
  const end_clamps = 2 * rails_per_row * rows;
  const splices = (Math.ceil(run_len_ft / rail_stock_ft - 1e-9) - 1) * rails_per_row * rows;
  if (![run_len_ft, rail_lf, mid_clamps, end_clamps, splices].every(Number.isFinite)) return { error: "Racking-takeoff math is not a finite value." };
  return {
    run_len_ft,
    rail_lf,
    mid_clamps,
    end_clamps,
    splices,
    note: "The rail layout, clamp type, and splice come from the rack manufacturer's engineering. A module shares a mid clamp with its neighbor and gets an end clamp at each row end. This counts hardware, not the array spacing pv-row-spacing gives.",
  };
}

export const pvRailClampTakeoffExample = { inputs: { rows: 2, modules_per_row: 12, module_width_ft: 3.42, gap_ft: 0, rails_per_row: 2, rail_stock_ft: 14 } };

function _v896renderPvRailClampTakeoff(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: racking-takeoff identity by name. run = modules x width + (modules - 1) x gap; rail = rows x rails x run; mid clamps = rails x rows x (modules - 1); end clamps = 2 x rails x rows; splices = (ceil(run / stock) - 1) x rails x rows.";
  const rw = makeNumber("Module rows", "prc-rw", { step: "any", min: "0" });
  const mp = makeNumber("Modules per row", "prc-mp", { step: "any", min: "0" });
  const mw = makeNumber("Module width along the rail (ft)", "prc-mw", { step: "any", min: "0" });
  const gp = makeNumber("Module-to-module gap (ft)", "prc-gp", { step: "any", min: "0" });
  const rp = makeNumber("Rails per row", "prc-rp", { step: "any", min: "0" });
  const rs = makeNumber("Rail stock length (ft)", "prc-rs", { step: "any", min: "0" });
  for (const f of [rw, mp, mw, gp, rp, rs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rw.input.value = "2"; mp.input.value = "12"; mw.input.value = "3.42"; gp.input.value = "0"; rp.input.value = "2"; rs.input.value = "14"; update(); });
  const oRail = makeOutputLine(outputRegion, "Rail footage", "prc-out-rail");
  const oMid = makeOutputLine(outputRegion, "Mid clamps", "prc-out-mid");
  const oEnd = makeOutputLine(outputRegion, "End clamps", "prc-out-end");
  const oSpl = makeOutputLine(outputRegion, "Rail splices", "prc-out-spl");
  const update = debounce(() => {
    const r = computePvRailClampTakeoff({
      rows: rw.input.value === "" ? 2 : Number(rw.input.value), modules_per_row: mp.input.value === "" ? 12 : Number(mp.input.value),
      module_width_ft: mw.input.value === "" ? 3.42 : Number(mw.input.value), gap_ft: gp.input.value === "" ? 0 : Number(gp.input.value),
      rails_per_row: rp.input.value === "" ? 2 : Number(rp.input.value), rail_stock_ft: rs.input.value === "" ? 14 : Number(rs.input.value),
    });
    if (r.error) { oRail.textContent = r.error; oMid.textContent = "-"; oEnd.textContent = "-"; oSpl.textContent = "-"; return; }
    oRail.textContent = fmt(r.rail_lf, 1) + " LF (" + fmt(r.run_len_ft, 2) + " ft per run)";
    oMid.textContent = fmt(r.mid_clamps, 0) + " mid clamps";
    oEnd.textContent = fmt(r.end_clamps, 0) + " end clamps";
    oSpl.textContent = fmt(r.splices, 0) + " splices";
  }, DEBOUNCE_MS);
  for (const f of [rw, mp, mw, gp, rp, rs]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["pv-rail-clamp-takeoff"] = _v896renderPvRailClampTakeoff;

// pv-ballast-weight (spec-v897): PV flat-roof ballast weight and roof PSF screen.
// dims: in { modules: dimensionless, module_wt_lb: M L T^-2, ballast_per_module_lb: M L T^-2, racking_wt_lb: M L T^-2, array_area_sf: L^2, allowable_psf: M L^-1 T^-2 } out: { total_wt_lb: M L T^-2, added_psf: M L^-1 T^-2, pass: dimensionless }
export function computePvBallastWeight({ modules = 30, module_wt_lb = 50, ballast_per_module_lb = 40, racking_wt_lb = 0, array_area_sf = 630, allowable_psf = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(modules > 0)) return { error: "Module count must be positive." };
  if (!(module_wt_lb > 0)) return { error: "Module weight must be positive (lb)." };
  if (!(array_area_sf > 0)) return { error: "Array area must be positive (ft^2)." };
  if (!(allowable_psf > 0)) return { error: "Allowable pressure must be positive (psf)." };
  if (ballast_per_module_lb < 0) return { error: "Ballast per module cannot be negative (lb)." };
  if (racking_wt_lb < 0) return { error: "Racking weight cannot be negative (lb)." };
  const total_wt_lb = modules * (module_wt_lb + ballast_per_module_lb) + racking_wt_lb;
  const added_psf = total_wt_lb / array_area_sf;
  const pass = added_psf <= allowable_psf + 1e-9 * Math.abs(allowable_psf);
  if (![total_wt_lb, added_psf].every(Number.isFinite)) return { error: "Ballast-load math is not a finite value." };
  return {
    total_wt_lb,
    added_psf,
    pass,
    note: "This is a dead-load SCREEN, not a design. The ballast quantity per module and the allowable roof pressure come from the PE-stamped ballast plan and the structural engineer (entered here); it totals and distributes the given ballast rather than sizing it. Wind uplift and the roof structure govern. A value over the allowable means re-check with the engineer.",
  };
}

export const pvBallastWeightExample = { inputs: { modules: 30, module_wt_lb: 50, ballast_per_module_lb: 40, racking_wt_lb: 150, array_area_sf: 630, allowable_psf: 5 } };

function _v897renderPvBallastWeight(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: load-screen identity by name. total = modules x (module weight + ballast) + racking; added pressure = total / array area. A dead-load screen, not a design; the PE-stamped ballast plan and the engineer govern.";
  const mo = makeNumber("Module count", "pbw-mo", { step: "any", min: "0" });
  const mw = makeNumber("Module weight (lb)", "pbw-mw", { step: "any", min: "0" });
  const bl = makeNumber("Ballast per module (lb)", "pbw-bl", { step: "any", min: "0" });
  const rk = makeNumber("Total racking weight (lb)", "pbw-rk", { step: "any", min: "0" });
  const ar = makeNumber("Array footprint area (ft²)", "pbw-ar", { step: "any", min: "0" });
  const al = makeNumber("Allowable added pressure (psf)", "pbw-al", { step: "any", min: "0" });
  for (const f of [mo, mw, bl, rk, ar, al]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mo.input.value = "30"; mw.input.value = "50"; bl.input.value = "40"; rk.input.value = "150"; ar.input.value = "630"; al.input.value = "5"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total added weight", "pbw-out-total");
  const oPsf = makeOutputLine(outputRegion, "Added roof pressure", "pbw-out-psf");
  const oPass = makeOutputLine(outputRegion, "Screen", "pbw-out-pass");
  const update = debounce(() => {
    const r = computePvBallastWeight({
      modules: mo.input.value === "" ? 30 : Number(mo.input.value), module_wt_lb: mw.input.value === "" ? 50 : Number(mw.input.value),
      ballast_per_module_lb: bl.input.value === "" ? 40 : Number(bl.input.value), racking_wt_lb: rk.input.value === "" ? 0 : Number(rk.input.value),
      array_area_sf: ar.input.value === "" ? 630 : Number(ar.input.value), allowable_psf: al.input.value === "" ? 5 : Number(al.input.value),
    });
    if (r.error) { oTotal.textContent = r.error; oPsf.textContent = "-"; oPass.textContent = "-"; return; }
    oTotal.textContent = fmt(r.total_wt_lb, 0) + " lb";
    oPsf.textContent = fmt(r.added_psf, 2) + " psf";
    oPass.textContent = r.pass ? "PASS (at or under the allowable)" : "OVER -- re-check with the engineer";
  }, DEBOUNCE_MS);
  for (const f of [mo, mw, bl, rk, ar, al]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["pv-ballast-weight"] = _v897renderPvBallastWeight;

// ===================== spec-v963: DC ammeter shunt sizing =====================
// dims: in { rated_current_a: I, rated_millivolt: M L^2 T^-3 I^-1, measured_millivolt: M L^2 T^-3 I^-1 } out: { shunt_resistance_ohm: M L^2 T^-3 I^-2, measured_current_a: I, power_dissipation_w: M L^2 T^-3 }
export function computeDcShuntSizing({ rated_current_a = 100, rated_millivolt = 50, measured_millivolt = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_current_a > 0)) return { error: "Rated current must be positive (A)." };
  if (!(rated_millivolt > 0)) return { error: "Rated millivolt output must be positive (mV)." };
  if (!(measured_millivolt >= 0)) return { error: "Measured millivolt cannot be negative (mV)." };
  // A DC shunt is a precision resistor: R = rated_voltage / rated_current. Meter reads the mV drop across it.
  const shunt_resistance_ohm = (rated_millivolt / 1000) / rated_current_a;
  const measured_current_a = rated_current_a * measured_millivolt / rated_millivolt;
  const power_dissipation_w = rated_current_a * (rated_millivolt / 1000);
  if (![shunt_resistance_ohm, measured_current_a, power_dissipation_w].every(Number.isFinite)) return { error: "Shunt math is not a finite value." };
  return {
    shunt_resistance_ohm,
    measured_current_a,
    power_dissipation_w,
    note: "Sizing and reading a DC current-measuring shunt -- the precision low-value resistor a DC panel meter, battery monitor, or PV/DC combiner uses to measure current. The shunt is rated as a millivolt drop at a rated current (a '50 mV, 100 A' shunt), so its resistance is simply R = rated millivolt / 1000 / rated current = 0.5 milliohm here, and the meter reads current by measuring the millivolt drop: current = rated current x (measured mV / rated mV), so 25 mV on a 50 mV / 100 A shunt is 50 A. At full rated current the shunt dissipates rated current x rated volts = 100 x 0.05 = 5 W as heat, which is why shunts are derated to about two-thirds of rating for continuous use and mounted for cooling. The shunt goes in the ungrounded/return leg in series with the load; keep the sense leads a twisted pair and take the drop at the shunt's voltage (potential) terminals, not the current lugs, so lead resistance does not add to the reading. A design aid; the shunt's accuracy class, temperature coefficient, and the meter's input range and calibration govern the measurement.",
  };
}

export const dcShuntSizingExample = { inputs: { rated_current_a: 100, rated_millivolt: 50, measured_millivolt: 25 } };

function _v963renderDcShuntSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: DC current-shunt sizing (Ohm's law), by name. R = rated_mV/1000 / rated_A; current = rated_A x (measured_mV / rated_mV); dissipation at rating = rated_A x rated_mV/1000. Derate to ~2/3 for continuous use; sense at the potential terminals. The shunt accuracy class and the meter range/calibration govern.";
  const ir = makeNumber("Rated current (A)", "shu-ir", { step: "any", min: "0" });
  const mr = makeNumber("Rated output (mV at rated current)", "shu-mr", { step: "any", min: "0" });
  const mm = makeNumber("Measured output (mV)", "shu-mm", { step: "any", min: "0" });
  for (const f of [ir, mr, mm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ir.input.value = "100"; mr.input.value = "50"; mm.input.value = "25"; update(); });
  const oR = makeOutputLine(outputRegion, "Shunt resistance", "shu-out-r");
  const oI = makeOutputLine(outputRegion, "Measured current", "shu-out-i");
  const oP = makeOutputLine(outputRegion, "Dissipation at rated current", "shu-out-p");
  const update = debounce(() => {
    const r = computeDcShuntSizing({
      rated_current_a: ir.input.value === "" ? 100 : Number(ir.input.value), rated_millivolt: mr.input.value === "" ? 50 : Number(mr.input.value),
      measured_millivolt: mm.input.value === "" ? 25 : Number(mm.input.value),
    });
    if (r.error) { oR.textContent = r.error; oI.textContent = "-"; oP.textContent = "-"; return; }
    oR.textContent = fmt(r.shunt_resistance_ohm * 1000, 4) + " milliohm";
    oI.textContent = fmt(r.measured_current_a, 2) + " A";
    oP.textContent = fmt(r.power_dissipation_w, 2) + " W (derate to ~2/3 continuous)";
  }, DEBOUNCE_MS);
  for (const f of [ir, mr, mm]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["dc-shunt-sizing"] = _v963renderDcShuntSizing;

// ===================== spec-v968: EV range added per hour of charging =====================
// dims: in { evse_power_kw: M L^2 T^-3, charge_efficiency: dimensionless, vehicle_efficiency_mi_per_kwh: M^-1 L^-1 T^2, target_range_mi: L } out: { range_added_mi_per_hr: L T^-1, hours_to_add_target: T }
export function computeEvRangePerHour({ evse_power_kw = 7.7, charge_efficiency = 0.88, vehicle_efficiency_mi_per_kwh = 3.5, target_range_mi = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(evse_power_kw > 0)) return { error: "EVSE power must be positive (kW)." };
  if (!(charge_efficiency > 0 && charge_efficiency <= 1)) return { error: "Charge efficiency must be between 0 and 1." };
  if (!(vehicle_efficiency_mi_per_kwh > 0)) return { error: "Vehicle efficiency must be positive (mi/kWh)." };
  if (!(target_range_mi > 0)) return { error: "Target range must be positive (mi)." };
  // Miles of range per hour of charging = charge power (after losses) x how far the car goes per kWh.
  const range_added_mi_per_hr = evse_power_kw * charge_efficiency * vehicle_efficiency_mi_per_kwh;
  const hours_to_add_target = target_range_mi / range_added_mi_per_hr;
  if (![range_added_mi_per_hr, hours_to_add_target].every(Number.isFinite)) return { error: "EV range-per-hour math is not a finite value." };
  return {
    range_added_mi_per_hr,
    hours_to_add_target,
    note: "How many miles of driving range an hour of charging adds -- the number that sizes an EVSE to a commute or a fleet's daily miles. Range per hour = EVSE power (kW) x charge efficiency x the vehicle's efficiency (mi/kWh): the kilowatts delivered, after the ~10-15% AC charging losses, times how far the car goes on each kWh. A 7.7 kW (240 V, 32 A) Level 2 charger at 88% efficiency on a car that gets 3.5 mi/kWh adds about 23.7 miles of range per hour, so a 100-mile daily commute is replenished in about 4.2 hours -- comfortably overnight. Doubling to a 40 A / 9.6 kW circuit adds range proportionally faster, but the vehicle's ONBOARD charger caps the AC rate (a bigger wall unit charges no faster than the car accepts -- see ev-charge-time), and a less efficient vehicle (fewer mi/kWh, a truck or cold weather) adds fewer miles per hour. This is a steady AC Level 2 estimate; DC fast charging is a different, tapering process, and the vehicle's onboard-charger limit, the actual efficiency, and utility rates govern.",
  };
}

export const evRangePerHourExample = { inputs: { evse_power_kw: 7.7, charge_efficiency: 0.88, vehicle_efficiency_mi_per_kwh: 3.5, target_range_mi: 100 } };

function _v968renderEvRangePerHour(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: EV range added per hour of AC charging, by name. range/hr = EVSE power (kW) x charge efficiency x vehicle efficiency (mi/kWh); hours = target range / range per hr. Steady AC Level 2; the vehicle's onboard-charger limit caps the AC rate (see ev-charge-time), DC fast charging tapers, and the actual efficiency governs.";
  const pw = makeNumber("EVSE power (kW, e.g. 7.7)", "evr-pw", { step: "any", min: "0" });
  const ef = makeNumber("Charge efficiency (0-1, ~0.88)", "evr-ef", { step: "any", min: "0" });
  const ve = makeNumber("Vehicle efficiency at the battery (mi/kWh; an EPA sticker figure is wall-based, so set charge efficiency to 1 with it)", "evr-ve", { step: "any", min: "0" });
  const tr = makeNumber("Target range to add (mi)", "evr-tr", { step: "any", min: "0" });
  for (const f of [pw, ef, ve, tr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pw.input.value = "7.7"; ef.input.value = "0.88"; ve.input.value = "3.5"; tr.input.value = "100"; update(); });
  const oR = makeOutputLine(outputRegion, "Range added", "evr-out-r");
  const oH = makeOutputLine(outputRegion, "Hours to add the target", "evr-out-h");
  const update = debounce(() => {
    const r = computeEvRangePerHour({
      evse_power_kw: pw.input.value === "" ? 7.7 : Number(pw.input.value), charge_efficiency: ef.input.value === "" ? 0.88 : Number(ef.input.value),
      vehicle_efficiency_mi_per_kwh: ve.input.value === "" ? 3.5 : Number(ve.input.value), target_range_mi: tr.input.value === "" ? 100 : Number(tr.input.value),
    });
    if (r.error) { oR.textContent = r.error; oH.textContent = "-"; return; }
    oR.textContent = fmt(r.range_added_mi_per_hr, 1) + " mi per hour of charging";
    oH.textContent = fmt(r.hours_to_add_target, 2) + " hr for " + fmt(Number(tr.input.value) || 100, 0) + " mi";
  }, DEBOUNCE_MS);
  for (const f of [pw, ef, ve, tr]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["ev-range-per-hour"] = _v968renderEvRangePerHour;

// ===================== spec-v972: battery bank series/parallel configuration =====================
// dims: in { target_bus_v: M L^2 T^-3 I^-1, module_v: M L^2 T^-3 I^-1, module_ah: I T, parallel_strings: dimensionless, depth_of_discharge: dimensionless } out: { series_count: dimensionless, actual_bus_v: M L^2 T^-3 I^-1, total_ah: I T, usable_kwh: M L^2 T^-2 }
export function computeBatterySeriesParallel({ target_bus_v = 48, module_v = 12.8, module_ah = 100, parallel_strings = 2, depth_of_discharge = 0.8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(target_bus_v > 0)) return { error: "Target bus voltage must be positive (V)." };
  if (!(module_v > 0)) return { error: "Module nominal voltage must be positive (V)." };
  if (!(module_ah > 0)) return { error: "Module capacity must be positive (Ah)." };
  if (!(parallel_strings >= 1)) return { error: "Parallel strings must be at least 1." };
  if (!(depth_of_discharge > 0 && depth_of_discharge <= 1)) return { error: "Depth of discharge must be between 0 and 1." };
  // Series sets the bus voltage; parallel sets the capacity. Round the series count to the nearest whole module.
  const np = Math.round(parallel_strings);
  const series_count = Math.max(1, Math.round(target_bus_v / module_v));
  const actual_bus_v = series_count * module_v;
  const total_ah = np * module_ah;
  const usable_kwh = series_count * np * module_v * module_ah * depth_of_discharge / 1000;
  if (![actual_bus_v, total_ah, usable_kwh].every(Number.isFinite)) return { error: "Battery-configuration math is not a finite value." };
  return {
    series_count,
    parallel_count: np,
    actual_bus_v,
    total_ah,
    usable_kwh,
    note: "The series/parallel wiring of a battery bank: modules in SERIES add their voltages to make the bus voltage, modules in PARALLEL add their amp-hours to make the capacity. The series count is the target bus voltage divided by the module's nominal voltage, rounded to a whole module: four 12.8 V LFP modules in series make a 51.2 V (nominal 48 V) bus, and putting two such strings in parallel gives 200 Ah. The usable energy is series x parallel x module V x module Ah x depth-of-discharge / 1000: this 4S2P bank of 12.8 V / 100 Ah LFP at 80% DoD is 8.19 kWh usable. Note the actual bus voltage lands on the module's nominal (51.2 V here), not exactly the 48 V system label, and a real design must respect the battery/BMS/inverter voltage window and never mix chemistries, ages, or capacities on the same bus. LFP nominal is ~12.8 V/module at ~80% usable DoD; flooded lead-acid is ~12.0 V at ~50%. A configuration aid; the battery and BMS manufacturer's series/parallel limits, the inverter's voltage range, and NEC 706 govern the actual bank.",
  };
}

export const batterySeriesParallelExample = { inputs: { target_bus_v: 48, module_v: 12.8, module_ah: 100, parallel_strings: 2, depth_of_discharge: 0.8 } };

function _v972renderBatterySeriesParallel(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: battery bank series/parallel configuration, by name. series = round(target bus V / module V); bus = series x module V; total Ah = parallel x module Ah; usable kWh = series x parallel x V x Ah x DoD / 1000. LFP ~12.8 V/80% DoD, flooded lead-acid ~12.0 V/50%. The battery/BMS series-parallel limits, the inverter voltage window, and NEC 706 govern.";
  const tv = makeNumber("Target bus voltage (V)", "bsp-tv", { step: "any", min: "0" });
  const mv = makeNumber("Module nominal voltage (V)", "bsp-mv", { step: "any", min: "0" });
  const ma = makeNumber("Module capacity (Ah)", "bsp-ma", { step: "any", min: "0" });
  const ps = makeNumber("Parallel strings", "bsp-ps", { step: "1", min: "1" });
  const dd = makeNumber("Depth of discharge (0-1)", "bsp-dd", { step: "any", min: "0" });
  for (const f of [tv, mv, ma, ps, dd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tv.input.value = "48"; mv.input.value = "12.8"; ma.input.value = "100"; ps.input.value = "2"; dd.input.value = "0.8"; update(); });
  const oC = makeOutputLine(outputRegion, "Configuration", "bsp-out-c");
  const oB = makeOutputLine(outputRegion, "Bus voltage / capacity", "bsp-out-b");
  const oE = makeOutputLine(outputRegion, "Usable energy", "bsp-out-e");
  const update = debounce(() => {
    const r = computeBatterySeriesParallel({
      target_bus_v: tv.input.value === "" ? 48 : Number(tv.input.value), module_v: mv.input.value === "" ? 12.8 : Number(mv.input.value),
      module_ah: ma.input.value === "" ? 100 : Number(ma.input.value), parallel_strings: ps.input.value === "" ? 2 : Number(ps.input.value),
      depth_of_discharge: dd.input.value === "" ? 0.8 : Number(dd.input.value),
    });
    if (r.error) { oC.textContent = r.error; oB.textContent = "-"; oE.textContent = "-"; return; }
    oC.textContent = r.series_count + "S" + r.parallel_count + "P";
    oB.textContent = fmt(r.actual_bus_v, 1) + " V bus, " + fmt(r.total_ah, 0) + " Ah";
    oE.textContent = fmt(r.usable_kwh, 2) + " kWh usable";
  }, DEBOUNCE_MS);
  for (const f of [tv, mv, ma, ps, dd]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["battery-series-parallel"] = _v972renderBatterySeriesParallel;

// ===================== spec-v983: bifacial PV rear-side gain =====================
// dims: in { front_poa_wm2: M T^-3, rear_poa_wm2: M T^-3, bifaciality: dimensionless, front_power_w: M L^2 T^-3 } out: { bifacial_gain_pct: dimensionless, effective_power_w: M L^2 T^-3 }
export function computeBifacialPvGain({ front_poa_wm2 = 1000, rear_poa_wm2 = 150, bifaciality = 0.75, front_power_w = 400 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(front_poa_wm2 > 0)) return { error: "Front plane-of-array irradiance must be positive (W/m^2)." };
  if (!(rear_poa_wm2 >= 0)) return { error: "Rear plane-of-array irradiance must be zero or positive (W/m^2)." };
  if (!(bifaciality > 0 && bifaciality <= 1)) return { error: "Bifaciality coefficient must be between 0 and 1." };
  if (!(front_power_w > 0)) return { error: "Front-side nameplate power must be positive (W)." };
  // Bifacial gain = bifaciality x (rear irradiance / front irradiance); effective = front x (1 + gain).
  const gain_ratio = bifaciality * (rear_poa_wm2 / front_poa_wm2);
  const bifacial_gain_pct = gain_ratio * 100;
  const effective_power_w = front_power_w * (1 + gain_ratio);
  if (!Number.isFinite(bifacial_gain_pct) || !Number.isFinite(effective_power_w)) return { error: "Bifacial-gain math is not a finite value." };
  return {
    bifacial_gain_pct,
    effective_power_w,
    note: "The extra output a bifacial PV module makes from light hitting its BACK side. The rear cells see a fraction of the front's efficiency -- the bifaciality coefficient (phi), a datasheet number typically 0.65 to 0.90 for modern modules -- and they collect the plane-of-array irradiance reflected onto the back from the ground or roof. The gain over a front-only module is bifaciality x (rear irradiance / front irradiance): a module with phi 0.75 whose back sees 150 W/m^2 while the front sees 1000 W/m^2 makes 0.75 x 0.15 = 11.25% more power, so a 400 W front rating becomes ~445 W effective. The rear irradiance is what the site drives -- it climbs with a higher ground albedo (white membrane or light gravel ~0.5-0.7 vs dark asphalt ~0.1), a taller mounting height, wider row spacing, and less rack shading. Over a white roof the same module might see 250 W/m^2 rear (18.75% gain, ~475 W). A yield estimate; the module datasheet's bifaciality, the actual site albedo and rear-shading, and a bifacial ray-trace (PVsyst / NREL) govern the real number, and the inverter and array must still be sized for the boosted output.",
  };
}

export const bifacialPvGainExample = { inputs: { front_poa_wm2: 1000, rear_poa_wm2: 150, bifaciality: 0.75, front_power_w: 400 } };

function _v983renderBifacialPvGain(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: bifacial PV rear-side gain, by name. gain = bifaciality x (rear irradiance / front irradiance); effective power = front x (1 + gain). Bifaciality (phi) ~0.65-0.90 from the datasheet; rear irradiance climbs with ground albedo, mounting height, and row spacing. The datasheet bifaciality, the site albedo, and a bifacial ray-trace govern the real yield.";
  const fp = makeNumber("Front plane-of-array irradiance (W/m²)", "bpg-fp", { step: "any", min: "0" });
  const rp = makeNumber("Rear plane-of-array irradiance (W/m²)", "bpg-rp", { step: "any", min: "0" });
  const bf = makeNumber("Bifaciality coefficient (0-1, from datasheet)", "bpg-bf", { step: "any", min: "0", max: "1" });
  const pw = makeNumber("Front-side nameplate power (W)", "bpg-pw", { step: "any", min: "0" });
  for (const f of [fp, rp, bf, pw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fp.input.value = "1000"; rp.input.value = "150"; bf.input.value = "0.75"; pw.input.value = "400"; update(); });
  const oG = makeOutputLine(outputRegion, "Bifacial gain", "bpg-out-g");
  const oP = makeOutputLine(outputRegion, "Effective power", "bpg-out-p");
  const update = debounce(() => {
    const r = computeBifacialPvGain({
      front_poa_wm2: fp.input.value === "" ? 1000 : Number(fp.input.value), rear_poa_wm2: rp.input.value === "" ? 150 : Number(rp.input.value),
      bifaciality: bf.input.value === "" ? 0.75 : Number(bf.input.value), front_power_w: pw.input.value === "" ? 400 : Number(pw.input.value),
    });
    if (r.error) { oG.textContent = r.error; oP.textContent = "-"; return; }
    oG.textContent = fmt(r.bifacial_gain_pct, 2) + " %";
    oP.textContent = fmt(r.effective_power_w, 1) + " W";
  }, DEBOUNCE_MS);
  for (const f of [fp, rp, bf, pw]) f.input.addEventListener("input", update);
}
SOLARFIELD_RENDERERS["bifacial-pv-gain"] = _v983renderBifacialPvGain;
