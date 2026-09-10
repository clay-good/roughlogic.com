// Group P: coordinate and traverse surveying math (spec-v25 part I).
//
// spec-v71 cap-relief split: the two surveying coordinate-geometry tiles
// (area-by-coordinates, traverse-closure) were extracted verbatim from
// calc-field.js (which sat at 96.8% of its size cap) into this module. Both
// tiles KEEP group "P" -- a tile's group letter is independent of the module
// that holds it (the v28/v30/v36/v39/v70 precedent). Their ids, citations,
// worked examples, dimensional annotations, and behavior are byte-for-byte
// unchanged. Lazy-loaded on first open of one of its tiles, so it is not in
// the home-view first-paint payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeTextarea, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row.
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

export const SURVEY_RENDERERS = {};

// ===========================================================================
// Surveying tiles - area by coordinates and traverse closure (v18/v21 tile
// contract). Coordinate order is North/East per surveying convention.
// ===========================================================================

// --- Area by coordinates (`area-by-coordinates`) ---
// Shoelace on a closed ring of {n, e} boundary corners. area_ft2 =
// 0.5*|sum(E_i*N_{i+1} - E_{i+1}*N_i)|; signed>0 is counter-clockwise.
// dims: in { points: dimensionless } out: { area_ft2: L^2, area_acres: L^2, area_m2: L^2, perimeter_ft: L, distinct_points: dimensionless }
export function computeAreaByCoordinates({ points } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(points) || points.length < 3) return { error: "Need at least three boundary points." };
  for (const p of points) {
    if (!p || typeof p !== "object" || !Number.isFinite(p.n) || !Number.isFinite(p.e)) {
      return { error: "Each point needs finite N and E coordinates." };
    }
  }
  // Build a closed ring: append the first point if the last differs.
  const ring = points.slice();
  const first = ring[0], last = ring[ring.length - 1];
  if (first.n !== last.n || first.e !== last.e) ring.push({ n: first.n, e: first.e });
  // Count distinct vertices (ignoring the closing duplicate) - need >= 3.
  const seen = new Set();
  for (let i = 0; i < ring.length - 1; i++) seen.add(ring[i].n + "|" + ring[i].e);
  if (seen.size < 3) return { error: "Need at least three distinct boundary points." };
  let signed2 = 0, perimeter = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    signed2 += (a.e * b.n - b.e * a.n);
    perimeter += Math.hypot(b.n - a.n, b.e - a.e);
  }
  const signed = signed2 / 2;
  const area_ft2 = Math.abs(signed);
  if (!Number.isFinite(area_ft2) || !Number.isFinite(perimeter)) {
    return { error: "Coordinates produced a non-finite result." };
  }
  const winding = signed < 0 ? "clockwise" : signed > 0 ? "counter-clockwise" : "degenerate";
  return {
    area_ft2,
    area_acres: area_ft2 / 43560,
    area_m2: area_ft2 * 0.09290304,
    perimeter_ft: perimeter,
    distinct_points: seen.size,
    winding,
  };
}
export const areaByCoordinatesExample = { inputs: { points: [{ n: 0, e: 0 }, { n: 0, e: 100 }, { n: 100, e: 100 }, { n: 100, e: 0 }] } };

function renderAreaByCoordinates(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Coordinate (shoelace) area per FM 5-233 Construction Surveying (public-domain US Government work) and standard surveying references. The recorded plat and surveyor of record govern; this is a field estimate.";
  const DEFAULT = "0,0\n0,100\n100,100\n100,0";
  const pts = makeTextarea("Boundary corners, one per line as N,E (>= 3)", "abc-points", { rows: "4" });
  pts.input.value = DEFAULT;
  inputRegion.appendChild(pts.wrap);
  attachExampleButton(inputRegion, () => { pts.input.value = DEFAULT; update(); });
  const oArea = makeOutputLine(outputRegion, "Area", "abc-out-area");
  const oPerim = makeOutputLine(outputRegion, "Perimeter", "abc-out-perim");
  const oWind = makeOutputLine(outputRegion, "Winding", "abc-out-wind");
  function parsePoints(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const parts = line.split(",").map((s) => Number(s.trim()));
      if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
      out.push({ n: parts[0], e: parts[1] });
    }
    return out;
  }
  const update = debounce(() => {
    const pointList = parsePoints(pts.input.value);
    if (pointList === null) { oArea.textContent = "Each line must be N,E with finite numbers."; oPerim.textContent = "-"; oWind.textContent = "-"; return; }
    const r = computeAreaByCoordinates({ points: pointList });
    if (r.error) { oArea.textContent = r.error; oPerim.textContent = "-"; oWind.textContent = "-"; return; }
    oArea.textContent = fmt(r.area_ft2, 1) + " ft2 (" + fmt(r.area_acres, 4) + " ac / " + fmt(r.area_m2, 1) + " m2)";
    oPerim.textContent = fmt(r.perimeter_ft, 1) + " ft over " + r.distinct_points + " corners";
    oWind.textContent = r.winding;
  }, DEBOUNCE_MS);
  pts.input.addEventListener("input", update);
}
SURVEY_RENDERERS["area-by-coordinates"] = renderAreaByCoordinates;

// --- Traverse closure (`traverse-closure`) ---
// Latitude/departure for each course (azimuth clockwise from North):
// lat = dist*cos(az), dep = dist*sin(az). Compass-rule (Bowditch)
// adjustment distributes closure error proportional to course length.
// dims: in { courses: dimensionless, n0: L, e0: L } out: { sum_lat: L, sum_dep: L, linear_misclosure: L, perimeter_ft: L, relative_precision_denominator: dimensionless }
export function computeTraverseClosure({ courses, n0 = 0, e0 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(courses) || courses.length < 2) return { error: "Need at least two courses." };
  if (!Number.isFinite(n0) || !Number.isFinite(e0)) return { error: "Starting coordinate must be finite." };
  const lats = [], deps = [], dists = [];
  let sum_lat = 0, sum_dep = 0, perimeter = 0;
  for (const c of courses) {
    if (!c || typeof c !== "object" || !Number.isFinite(c.azimuth_deg) || !Number.isFinite(c.distance)) {
      return { error: "Each course needs a finite azimuth (deg) and distance." };
    }
    if (c.distance < 0) return { error: "Course distance cannot be negative." };
    const rad = c.azimuth_deg * Math.PI / 180;
    const lat = c.distance * Math.cos(rad);
    const dep = c.distance * Math.sin(rad);
    lats.push(lat); deps.push(dep); dists.push(c.distance);
    sum_lat += lat; sum_dep += dep; perimeter += c.distance;
  }
  if (!(perimeter > 0)) return { error: "Total traverse length must be greater than zero." };
  const linear_misclosure = Math.hypot(sum_lat, sum_dep);
  const perfect = Math.abs(linear_misclosure) < 1e-6;
  const relative_precision_denominator = perfect ? null : perimeter / linear_misclosure;
  const closure_note = perfect
    ? "perfect closure"
    : "1:" + Math.round(relative_precision_denominator) + " (linear misclosure " + linear_misclosure.toFixed(3) + " ft over " + perimeter.toFixed(1) + " ft)";
  // Compass-rule (Bowditch) adjusted station coordinates from the start point.
  const adjusted = [{ n: n0, e: e0 }];
  let n = n0, e = e0;
  for (let i = 0; i < lats.length; i++) {
    const corrLat = -(dists[i] / perimeter) * sum_lat;
    const corrDep = -(dists[i] / perimeter) * sum_dep;
    n += lats[i] + corrLat;
    e += deps[i] + corrDep;
    adjusted.push({ n, e });
  }
  if (![sum_lat, sum_dep, linear_misclosure, perimeter].every(Number.isFinite)) {
    return { error: "Courses produced a non-finite result." };
  }
  return {
    courses_count: courses.length,
    sum_lat,
    sum_dep,
    linear_misclosure,
    perimeter_ft: perimeter,
    relative_precision_denominator,
    closure_note,
    adjusted,
  };
}
// A traverse that closes PERFECTLY reports 0.000 ft misclosure and no
// relative precision at all -- the 1:N figure is the whole reason a surveyor
// runs the check, and a square makes it null. This one closes to 0.100 ft
// over a 999.9 ft perimeter: 1:9999, a real answer to read.
export const traverseClosureExample = { inputs: { courses: [{ azimuth_deg: 0, distance: 200 }, { azimuth_deg: 90, distance: 300 }, { azimuth_deg: 180, distance: 200 }, { azimuth_deg: 270, distance: 299.9 }], n0: 0, e0: 0 } };

function renderTraverseClosure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Latitude/departure traverse and compass-rule (Bowditch) adjustment per FM 5-233 Construction Surveying (public-domain US Government work) and standard surveying references. The recorded plat and surveyor of record govern; this is a field estimate.";
  const DEFAULT = "0,200\n90,300\n180,200\n270,299.9";
  const courses = makeTextarea("Courses, one per line as azimuth_deg,distance (>= 2)", "tc-courses", { rows: "4" });
  courses.input.value = DEFAULT;
  const n0 = makeNumber("Start N", "tc-n0", { step: "any" });
  const e0 = makeNumber("Start E", "tc-e0", { step: "any" });
  for (const f of [courses, n0, e0]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { courses.input.value = DEFAULT; n0.input.value = "0"; e0.input.value = "0"; update(); });
  const oClosure = makeOutputLine(outputRegion, "Closure", "tc-out-closure");
  const oComponents = makeOutputLine(outputRegion, "Misclosure components", "tc-out-comp");
  const oEnd = makeOutputLine(outputRegion, "Adjusted end station", "tc-out-end");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  function parseCourses(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const parts = line.split(",").map((s) => Number(s.trim()));
      if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
      out.push({ azimuth_deg: parts[0], distance: parts[1] });
    }
    return out;
  }
  const update = debounce(() => {
    const list = parseCourses(courses.input.value);
    if (list === null) { oClosure.textContent = "Each line must be azimuth_deg,distance with finite numbers."; oComponents.textContent = "-"; oEnd.textContent = "-"; return; }
    const r = computeTraverseClosure({ courses: list, n0: readNum(n0.input), e0: readNum(e0.input) });
    if (r.error) { oClosure.textContent = r.error; oComponents.textContent = "-"; oEnd.textContent = "-"; return; }
    oClosure.textContent = r.closure_note;
    oComponents.textContent = "sum lat " + fmt(r.sum_lat, 3) + " ft, sum dep " + fmt(r.sum_dep, 3) + " ft, misclosure " + fmt(r.linear_misclosure, 3) + " ft over " + r.courses_count + " courses";
    const end = r.adjusted[r.adjusted.length - 1];
    oEnd.textContent = "N " + fmt(end.n, 3) + " / E " + fmt(end.e, 3);
  }, DEBOUNCE_MS);
  for (const f of [courses.input, n0.input, e0.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["traverse-closure"] = renderTraverseClosure;

// ===================== spec-v311..v313: field-surveying depth batch =====================
// The leveling and taping computations the coordinate tiles never cover:
// differential leveling to carry an elevation, stadia tacheometry for distance
// and elevation from a rod interval, and the temperature/slope/tension/sag
// corrections to a raw taped distance.

// dims: in { bm_elev: L, bs: dimensionless, fs: dimensionless, known_close: L } out: { sum_bs: L, sum_fs: L, final_elev: L, misclosure: L }
export function computeDifferentialLeveling({ bm_elev = 0, bs, fs, known_close = null } = {}) {
  const _g = _finiteGuard({ bm_elev, known_close: known_close === null ? 0 : known_close }); if (_g) return _g;
  if (!Array.isArray(bs) || !Array.isArray(fs)) return { error: "Backsights and foresights must be lists." };
  if (bs.length < 1 || fs.length < 1) return { error: "Need at least one backsight and one foresight." };
  if (bs.length !== fs.length) return { error: "Each setup needs one backsight and one foresight (equal counts)." };
  for (const v of [...bs, ...fs]) { if (!Number.isFinite(v)) return { error: "Every rod reading must be a finite number." }; }
  let sum_bs = 0, sum_fs = 0;
  const steps = [];
  let elev = bm_elev;
  for (let i = 0; i < bs.length; i++) {
    const hi = elev + bs[i];
    elev = hi - fs[i];
    sum_bs += bs[i];
    sum_fs += fs[i];
    steps.push({ hi, elev });
  }
  const final_elev = elev;
  const misclosure = known_close === null ? null : final_elev - known_close;
  return {
    sum_bs, sum_fs, final_elev, misclosure, steps,
    note: "Height-of-instrument differential leveling: at each setup HI = elevation + backsight, and the next point elevation = HI - foresight, so the run's elevation change is sum(BS) - sum(FS). A level loop returning to a known elevation should close, and the misclosure = computed closing elevation - known closing elevation is the arithmetic check the field book is balanced against (an ordinary tolerance is about 0.05 sqrt(miles), or the project spec). This carries the elevations and the misclosure but does not distribute the error back through the turning points (a proportional adjustment is a follow-on), assumes rod readings already corrected for rod/collimation error, and does not set the allowable-misclosure standard. A computational aid; the project survey control and specifications govern.",
  };
}
export const differentialLevelingExample = { inputs: { bm_elev: 100.00, bs: [4.32, 5.60], fs: [2.15, 3.40], known_close: 104.40 } };

function renderDifferentialLeveling(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: height-of-instrument differential leveling HI = elev + BS, elev = HI - FS, elevation change sum(BS) - sum(FS), and the loop misclosure, per the standard surveying references (Ghilani/Wolf), by name. Arithmetic reduction only; the project control and specs govern.";
  const bm = makeNumber("Benchmark elevation (ft)", "dl-bm", { step: "any" });
  const bs = makeTextarea("Backsights, one per line (ft)", "dl-bs", { rows: "3" }); bs.input.value = "4.32\n5.60";
  const fs = makeTextarea("Foresights, one per line (ft)", "dl-fs", { rows: "3" }); fs.input.value = "2.15\n3.40";
  const kc = makeNumber("Known closing elevation (ft, optional)", "dl-kc", { step: "any" });
  for (const f of [bm, bs, fs, kc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bm.input.value = "100.00"; bs.input.value = "4.32\n5.60"; fs.input.value = "2.15\n3.40"; kc.input.value = "104.40"; update(); });
  const oFinal = makeOutputLine(outputRegion, "Final elevation", "dl-out-final");
  const oSums = makeOutputLine(outputRegion, "sum(BS) - sum(FS)", "dl-out-sums");
  const oMis = makeOutputLine(outputRegion, "Loop misclosure", "dl-out-mis");
  const oNote = makeOutputLine(outputRegion, "Note", "dl-out-note");
  function parseNums(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim(); if (!line) continue;
      const v = Number(line); if (!Number.isFinite(v)) return null; out.push(v);
    }
    return out;
  }
  const update = debounce(() => {
    const bsArr = parseNums(bs.input.value), fsArr = parseNums(fs.input.value);
    if (bsArr === null || fsArr === null) { oFinal.textContent = "Each rod reading must be a finite number, one per line."; oSums.textContent = "-"; oMis.textContent = "-"; oNote.textContent = "-"; return; }
    const kcVal = kc.input.value.trim() === "" ? null : Number(kc.input.value);
    const r = computeDifferentialLeveling({ bm_elev: Number(bm.input.value) || 0, bs: bsArr, fs: fsArr, known_close: kcVal });
    if (r.error) { oFinal.textContent = r.error; oSums.textContent = "-"; oMis.textContent = "-"; oNote.textContent = "-"; return; }
    oFinal.textContent = fmt(r.final_elev, 2) + " ft";
    oSums.textContent = fmt(r.sum_bs, 2) + " - " + fmt(r.sum_fs, 2) + " = " + fmt(r.sum_bs - r.sum_fs, 2) + " ft rise";
    oMis.textContent = r.misclosure === null ? "- (no closing elevation entered)" : fmt(r.misclosure, 3) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [bm.input, bs.input, fs.input, kc.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["differential-leveling"] = renderDifferentialLeveling;

// dims: in { elevs: dimensionless, dists: dimensionless, known_close: L } out: { misclosure: L, total_dist: L, last_adjusted: L }
export function computeLevelLoopAdjustment({ elevs, dists, known_close = 0 } = {}) {
  const _g = _finiteGuard({ known_close }); if (_g) return _g;
  if (!Array.isArray(elevs) || !Array.isArray(dists)) return { error: "Elevations and distances must be lists." };
  if (elevs.length < 1) return { error: "Need at least one turning point." };
  if (elevs.length !== dists.length) return { error: "Each point needs one elevation and one leg distance (equal counts)." };
  for (const v of [...elevs, ...dists]) { if (!Number.isFinite(v)) return { error: "Every elevation and distance must be a finite number." }; }
  for (const d of dists) { if (!(d > 0)) return { error: "Each leg distance must be positive (ft)." }; }
  const cum = [];
  let s = 0;
  for (const d of dists) { s += d; cum.push(s); }
  const total_dist = s;
  const misclosure = elevs[elevs.length - 1] - known_close;
  const corrections = cum.map((c) => -misclosure * (c / total_dist));
  const adjusted = elevs.map((e, i) => e + corrections[i]);
  return {
    misclosure, total_dist, cum, corrections, adjusted, last_adjusted: adjusted[adjusted.length - 1],
    note: "Compass-rule (distance-weighted) level-loop adjustment: the misclosure = last computed elevation - known closing elevation is distributed to each turning point as correction = -misclosure x (cumulative distance to the point / total distance), so the correction grows with the distance leveled and the last point takes the full correction and closes exactly on its known elevation. This is the vertical analog of the compass rule used for horizontal traverses; it assumes error accumulates with the length leveled (equal-weight per setup is an alternative), the rod readings are already corrected, and the loop is one continuous run. A computational aid; the project survey control and specifications govern.",
  };
}
export const levelLoopAdjustmentExample = { inputs: { elevs: [105.20, 108.60, 100.05], dists: [500, 800, 700], known_close: 100.00 } };
function renderLevelLoopAdjustment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: compass-rule (distance-weighted) level-loop adjustment, correction = -misclosure x cumulative-distance / total-distance, per the standard surveying references (Ghilani/Wolf), by name. The vertical analog of the horizontal compass rule; the project control and specs govern.";
  const elevs = makeTextarea("Computed elevations, one per line (ft; last = closing point)", "lla-elevs", { rows: "3" }); elevs.input.value = "105.20\n108.60\n100.05";
  const dists = makeTextarea("Leg distance to each point, one per line (ft)", "lla-dists", { rows: "3" }); dists.input.value = "500\n800\n700";
  const kc = makeNumber("Known closing elevation (ft)", "lla-kc", { step: "any" });
  for (const f of [elevs, dists, kc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { elevs.input.value = "105.20\n108.60\n100.05"; dists.input.value = "500\n800\n700"; kc.input.value = "100.00"; update(); });
  const oMis = makeOutputLine(outputRegion, "Misclosure", "lla-out-mis");
  const oAdj = makeOutputLine(outputRegion, "Adjusted elevations", "lla-out-adj");
  const oNote = makeOutputLine(outputRegion, "Note", "lla-out-note");
  function parseNums(text) { const out = []; for (const raw of String(text).split("\n")) { const line = raw.trim(); if (!line) continue; const v = Number(line); if (!Number.isFinite(v)) return null; out.push(v); } return out; }
  const update = debounce(() => {
    const eArr = parseNums(elevs.input.value), dArr = parseNums(dists.input.value);
    if (eArr === null || dArr === null) { oMis.textContent = "Each elevation and distance must be a finite number, one per line."; oAdj.textContent = "-"; oNote.textContent = "-"; return; }
    const r = computeLevelLoopAdjustment({ elevs: eArr, dists: dArr, known_close: Number(kc.input.value) || 0 });
    if (r.error) { oMis.textContent = r.error; oAdj.textContent = "-"; oNote.textContent = "-"; return; }
    oMis.textContent = fmt(r.misclosure, 3) + " ft over " + fmt(r.total_dist, 0) + " ft leveled";
    oAdj.textContent = r.adjusted.map((a) => fmt(a, 4)).join(", ") + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [elevs.input, dists.input, kc.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["level-loop-adjustment"] = renderLevelLoopAdjustment;

// dims: in { s_ft: L, theta_deg: dimensionless, k_f: dimensionless, hi_ft: L, rod_ft: L, sta_elev: L } out: { h_ft: L, v_ft: L, elev_ft: L }
export function computeStadiaDistance({ s_ft = 0, theta_deg = 0, k_f = 100, hi_ft = 0, rod_ft = 0, sta_elev = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(s_ft > 0)) return { error: "Stadia interval must be positive (ft)." };
  if (!(theta_deg > -90 && theta_deg < 90)) return { error: "Vertical angle must be between -90 and 90 degrees." };
  if (!(k_f > 0)) return { error: "The stadia interval factor K must be positive (100 typical)." };
  const t = (theta_deg * Math.PI) / 180;
  const h_ft = k_f * s_ft * Math.cos(t) * Math.cos(t);
  const v_ft = k_f * s_ft * Math.cos(t) * Math.sin(t);
  const has_elev = hi_ft !== 0 || rod_ft !== 0 || sta_elev !== 0;
  const elev_ft = has_elev ? sta_elev + hi_ft + v_ft - rod_ft : null;
  return {
    h_ft, v_ft, elev_ft,
    note: "Stadia tacheometry with the interval factor K (default 100): the horizontal distance H = K s cos^2(theta), the vertical distance V = K s cos(theta) sin(theta) = (K s/2) sin(2 theta), and the target elevation = station elevation + HI + V - rod center. On a level sight (theta = 0) this reduces to the bare H = K s with no rise. Assumes an internal-focusing instrument (stadia constant C ~ 0; add C cos theta / C for an external-focusing constant), takes the vertical angle from the horizontal, and does not correct for earth curvature/refraction over long sights or a rod not held plumb. A computational aid; the instrument's stadia constants and the field procedure govern.",
  };
}
export const stadiaDistanceExample = { inputs: { s_ft: 1.50, theta_deg: 5, k_f: 100, hi_ft: 4.50, rod_ft: 5.20, sta_elev: 500.00 } };

function renderStadiaDistance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: stadia horizontal distance H = K s cos^2(theta), vertical V = (K s/2) sin(2 theta), elevation = HI + V - rod, K = 100, per the standard surveying references, by name. Internal-focusing instrument, no curvature/refraction. A computational aid; the instrument constants govern.";
  const s = makeNumber("Stadia interval (upper - lower, ft)", "sd-s", { step: "any", min: "0" });
  const th = makeNumber("Vertical angle from horizontal (deg, + up)", "sd-th", { step: "any" });
  const k = makeNumber("Stadia interval factor K", "sd-k", { step: "any", min: "0" }); k.input.value = "100";
  const hi = makeNumber("Height of instrument (ft, optional)", "sd-hi", { step: "any" });
  const rod = makeNumber("Rod center reading (ft, optional)", "sd-rod", { step: "any" });
  const sta = makeNumber("Station elevation (ft, optional)", "sd-sta", { step: "any" });
  for (const f of [s, th, k, hi, rod, sta]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { s.input.value = "1.50"; th.input.value = "5"; k.input.value = "100"; hi.input.value = "4.50"; rod.input.value = "5.20"; sta.input.value = "500.00"; update(); });
  const oH = makeOutputLine(outputRegion, "Horizontal distance", "sd-out-h");
  const oV = makeOutputLine(outputRegion, "Vertical distance", "sd-out-v");
  const oElev = makeOutputLine(outputRegion, "Target elevation", "sd-out-elev");
  const oNote = makeOutputLine(outputRegion, "Note", "sd-out-note");
  const update = debounce(() => {
    const r = computeStadiaDistance({ s_ft: Number(s.input.value) || 0, theta_deg: Number(th.input.value) || 0, k_f: Number(k.input.value) || 0, hi_ft: Number(hi.input.value) || 0, rod_ft: Number(rod.input.value) || 0, sta_elev: Number(sta.input.value) || 0 });
    if (r.error) { oH.textContent = r.error; oV.textContent = "-"; oElev.textContent = "-"; oNote.textContent = "-"; return; }
    oH.textContent = fmt(r.h_ft, 2) + " ft";
    oV.textContent = fmt(r.v_ft, 2) + " ft";
    oElev.textContent = r.elev_ft === null ? "- (enter station elev / HI / rod)" : fmt(r.elev_ft, 2) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [s.input, th.input, k.input, hi.input, rod.input, sta.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["stadia-distance"] = renderStadiaDistance;

// dims: in { l_ft: L, t_f: T, t0_f: T, h_ft: L, p_lb: M L T^-2, p0_lb: M L T^-2, a_in2: L^2, w_plf: M T^-2, alpha_f: dimensionless, e_psi: M L^-1 T^-2 } out: { ct_ft: L, ch_ft: L, cp_ft: L, cs_ft: L, corrected_ft: L }
export function computeTapingCorrections({ l_ft = 0, t_f = 68, t0_f = 68, h_ft = 0, p_lb = 0, p0_lb = 0, a_in2 = 0, w_plf = 0, alpha_f = 6.45e-6, e_psi = 29e6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(l_ft > 0)) return { error: "Measured length must be positive (ft)." };
  const ct_ft = alpha_f * (t_f - t0_f) * l_ft;
  const ch_ft = h_ft !== 0 ? -(h_ft * h_ft) / (2 * l_ft) : 0;
  let cp_ft = 0;
  if (p_lb !== 0 && a_in2 > 0) {
    if (!(e_psi > 0)) return { error: "The tape modulus must be positive when a tension correction is applied." };
    cp_ft = ((p_lb - p0_lb) * l_ft) / (a_in2 * e_psi);
  }
  let cs_ft = 0;
  if (w_plf !== 0) {
    if (!(p_lb > 0)) return { error: "The applied pull must be positive when a sag correction is applied." };
    cs_ft = -(w_plf * w_plf * Math.pow(l_ft, 3)) / (24 * p_lb * p_lb);
  }
  const corrected_ft = l_ft + ct_ft + ch_ft + cp_ft + cs_ft;
  return {
    ct_ft, ch_ft, cp_ft, cs_ft, corrected_ft,
    note: "Steel-tape distance corrections added to the measured length: temperature Ct = alpha (T - T0) L (alpha = 6.45e-6 /degF for steel; a warm tape expands and reads short, so the correction is positive), slope Ch = -h^2/(2L) reducing a slope distance to horizontal, tension Cp = (P - P0) L/(A E), and sag Cs = -w^2 L^3/(24 P^2) for an unsupported span. The slope term uses the approximate -h^2/(2L) (exact sqrt(L^2 - h^2) for steep grades); the sag term is zero when the tape is fully supported; omitted corrections default to zero. It does not cover the tape's own standardization/index error. A computational aid; the tape calibration and field procedure govern.",
  };
}
export const tapingCorrectionsExample = { inputs: { l_ft: 100, t_f: 95, t0_f: 68, h_ft: 3, alpha_f: 6.45e-6, e_psi: 29e6 } };

function renderTapingCorrections(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: steel-tape corrections temperature Ct = alpha (T - T0) L (alpha 6.45e-6 /degF), slope Ch = -h^2/(2L), tension Cp = (P - P0) L/(A E), sag Cs = -w^2 L^3/(24 P^2), per the standard surveying references (Ghilani/Wolf), by name. Approximate slope, unsupported sag. A computational aid; the tape calibration governs.";
  const l = makeNumber("Measured length L (ft)", "tap-l", { step: "any", min: "0" });
  const t = makeNumber("Field temperature (°F)", "tap-t", { step: "any" }); t.input.value = "68";
  const t0 = makeNumber("Standardization temperature (°F)", "tap-t0", { step: "any" }); t0.input.value = "68";
  const h = makeNumber("Elevation difference over span (ft, optional)", "tap-h", { step: "any" });
  const p = makeNumber("Applied pull P (lb, optional)", "tap-p", { step: "any" });
  const p0 = makeNumber("Standardization pull P0 (lb, optional)", "tap-p0", { step: "any" });
  const a = makeNumber("Tape cross-section A (in², optional)", "tap-a", { step: "any", min: "0" });
  const w = makeNumber("Tape weight per foot (lb/ft, optional)", "tap-w", { step: "any" });
  for (const f of [l, t, t0, h, p, p0, a, w]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { l.input.value = "100"; t.input.value = "95"; t0.input.value = "68"; h.input.value = "3"; p.input.value = ""; p0.input.value = ""; a.input.value = ""; w.input.value = ""; update(); });
  const oCorr = makeOutputLine(outputRegion, "Corrected horizontal distance", "tap-out-corr");
  const oBreak = makeOutputLine(outputRegion, "Corrections (temp / slope / tension / sag)", "tap-out-break");
  const oNote = makeOutputLine(outputRegion, "Note", "tap-out-note");
  const update = debounce(() => {
    const r = computeTapingCorrections({ l_ft: Number(l.input.value) || 0, t_f: Number(t.input.value) || 0, t0_f: Number(t0.input.value) || 0, h_ft: Number(h.input.value) || 0, p_lb: Number(p.input.value) || 0, p0_lb: Number(p0.input.value) || 0, a_in2: Number(a.input.value) || 0, w_plf: Number(w.input.value) || 0 });
    if (r.error) { oCorr.textContent = r.error; oBreak.textContent = "-"; oNote.textContent = "-"; return; }
    oCorr.textContent = fmt(r.corrected_ft, 3) + " ft";
    oBreak.textContent = fmt(r.ct_ft, 3) + " / " + fmt(r.ch_ft, 3) + " / " + fmt(r.cp_ft, 4) + " / " + fmt(r.cs_ft, 4) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [l.input, t.input, t0.input, h.input, p.input, p0.input, a.input, w.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["taping-corrections"] = renderTapingCorrections;

// dims: in { start_n: L, start_e: L, azimuth_deg: dimensionless, distance_ft: L } out: { delta_n: L, delta_e: L, end_n: L, end_e: L }
// Coordinate geometry forward locate (radial): from a known point, an
// azimuth (clockwise from north), and a distance, compute the new point.
// latitude (dN) = D cos(Az), departure (dE) = D sin(Az); N2 = N1 + dN,
// E2 = E1 + dE. The single forward step traverse-closure sums over a loop.
export function computeCogoForwardPoint({ start_n = 0, start_e = 0, azimuth_deg = 0, distance_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const az = Number(azimuth_deg);
  const d = Number(distance_ft);
  if (!(az >= 0 && az <= 360)) return { error: "Azimuth must be between 0 and 360 degrees (clockwise from north)." };
  if (!(d > 0)) return { error: "Distance must be positive (ft)." };
  const r = (az * Math.PI) / 180;
  const delta_n = d * Math.cos(r);
  const delta_e = d * Math.sin(r);
  const end_n = Number(start_n) + delta_n;
  const end_e = Number(start_e) + delta_e;
  return { delta_n, delta_e, end_n, end_e };
}
export const cogoForwardPointExample = { inputs: { start_n: 5000, start_e: 5000, azimuth_deg: 45, distance_ft: 200 } };

function renderCogoForwardPoint(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: coordinate geometry forward locate - latitude (delta N) = D cos(Az), departure (delta E) = D sin(Az), with the azimuth measured clockwise from north; N2 = N1 + delta N, E2 = E1 + delta E. First-principles latitude/departure per the standard route-surveying references (Ghilani & Wolf; FM 5-233), by name. For a quadrant bearing (N45E) convert to azimuth first (the azimuth-bearing-conversion tile does the quadrant conversion; the bearing-conversion tile handles magnetic declination). A computational aid; the project control and datum govern.";
  const n0 = makeNumber("Start northing N (ft)", "cf-n", { step: "any" });
  const e0 = makeNumber("Start easting E (ft)", "cf-e", { step: "any" });
  const az = makeNumber("Azimuth (deg, clockwise from north)", "cf-az", { step: "any", min: "0", max: "360" });
  const d = makeNumber("Distance (ft)", "cf-d", { step: "any", min: "0" });
  for (const f of [n0, e0, az, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n0.input.value = "5000"; e0.input.value = "5000"; az.input.value = "45"; d.input.value = "200"; update(); });
  const oDn = makeOutputLine(outputRegion, "Latitude (delta N)", "cf-out-dn");
  const oDe = makeOutputLine(outputRegion, "Departure (delta E)", "cf-out-de");
  const oN = makeOutputLine(outputRegion, "End northing N", "cf-out-n");
  const oE = makeOutputLine(outputRegion, "End easting E", "cf-out-e");
  const update = debounce(() => {
    const r = computeCogoForwardPoint({ start_n: Number(n0.input.value) || 0, start_e: Number(e0.input.value) || 0, azimuth_deg: Number(az.input.value) || 0, distance_ft: Number(d.input.value) || 0 });
    if (r.error) { oDn.textContent = r.error; oDe.textContent = "-"; oN.textContent = "-"; oE.textContent = "-"; return; }
    oDn.textContent = fmt(r.delta_n, 3) + " ft";
    oDe.textContent = fmt(r.delta_e, 3) + " ft";
    oN.textContent = fmt(r.end_n, 3) + " ft";
    oE.textContent = fmt(r.end_e, 3) + " ft";
  }, DEBOUNCE_MS);
  for (const f of [n0.input, e0.input, az.input, d.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["cogo-forward-point"] = renderCogoForwardPoint;

// spec-v1256: distance-distance (swing-tie) intersection. The COGO tiles locate a point by a bearing
// and distance (polar) or reduce two points to a bearing/distance (inverse); this locates a point from
// two MEASURED DISTANCES to two known points -- the classic tape swing-tie / as-built / batter-board
// method. Two-circle intersection: d = |P1-P0|, a = (r0^2 - r1^2 + d^2)/(2d), h = sqrt(r0^2 - a^2);
// midpoint Pm = P0 + a*(P1-P0)/d, solutions = Pm +/- h*perpendicular. First-principles Euclidean geometry.
// dims: in { n0_ft: L, e0_ft: L, dist0_ft: L, n1_ft: L, e1_ft: L, dist1_ft: L } out: { d_ft: L, sol1_n_ft: L, sol1_e_ft: L, sol2_n_ft: L, sol2_e_ft: L }
export function computeDistanceDistanceIntersect({ n0_ft = 0, e0_ft = 0, dist0_ft = 0, n1_ft = 0, e1_ft = 0, dist1_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n0 = Number(n0_ft), e0 = Number(e0_ft), r0 = Number(dist0_ft);
  const n1 = Number(n1_ft), e1 = Number(e1_ft), r1 = Number(dist1_ft);
  if (![n0, e0, n1, e1].every(Number.isFinite)) return { error: "All control-point coordinates must be numbers (ft)." };
  if (!(r0 > 0)) return { error: "Distance from control point 1 must be positive (ft)." };
  if (!(r1 > 0)) return { error: "Distance from control point 2 must be positive (ft)." };
  const dN = n1 - n0, dE = e1 - e0;
  const d = Math.hypot(dN, dE);
  if (!(d > 0)) return { error: "The two control points must be different (they are at the same location)." };
  if (d > r0 + r1) return { error: "The two distances are too short to meet: the control points are " + fmt(d, 3) + " ft apart, more than the " + fmt(r0 + r1, 3) + " ft the distances span. Re-check the tape readings." };
  if (d < Math.abs(r0 - r1)) return { error: "One swing circle lies entirely inside the other (|r0 - r1| = " + fmt(Math.abs(r0 - r1), 3) + " ft exceeds the " + fmt(d, 3) + " ft between points): the distances cannot both be satisfied." };
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const nm = n0 + a * dN / d, em = e0 + a * dE / d;
  // perpendicular unit vector (-dE/d, dN/d) in (N, E)
  const sol1_n_ft = nm + h * (-dE / d), sol1_e_ft = em + h * (dN / d);
  const sol2_n_ft = nm - h * (-dE / d), sol2_e_ft = em - h * (dN / d);
  const tangent = h < 1e-9;
  if (![d, sol1_n_ft, sol1_e_ft, sol2_n_ft, sol2_e_ft].every(Number.isFinite)) return { error: "Intersection math is not a finite value." };
  return {
    d_ft: d, sol1_n_ft, sol1_e_ft, sol2_n_ft, sol2_e_ft, tangent, offset_h_ft: h,
    note: "The distance-distance (swing-tie) intersection: the coordinates of a point located by measuring its distance to two known control points, the tape method behind an as-built tie, a batter-board corner, or a two-tape locate when there is no total station. Geometrically it is where two circles cross, one of radius r0 about control point 1 and one of radius r1 about control point 2: with the points d apart, the foot of the crossing chord is a = (r0^2 - r1^2 + d^2)/(2d) along the line from point 1, and the two intersection points sit h = sqrt(r0^2 - a^2) to each side. There are almost always TWO solutions, mirror images across the line between the control points; the field sketch or a rough third tie tells you which side the point is on. The tile flags the impossible cases the tape readings can fall into: distances too short to meet (d > r0 + r1) or one circle inside the other (d < |r0 - r1|), and the tangent case (a single solution when the circles just touch). Coordinates are plane northing/easting on the project grid (this is flat-plane geometry; grid scale factor and elevation are separate). A computational aid; the project control and datum govern.",
  };
}
export const distanceDistanceIntersectExample = { inputs: { n0_ft: 5000, e0_ft: 5000, dist0_ft: 70.711, n1_ft: 5000, e1_ft: 5100, dist1_ft: 70.711 } };
function renderDistanceDistanceIntersect(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: distance-distance (swing-tie) intersection - the two-circle crossing d = |P1-P0|, a = (r0^2 - r1^2 + d^2)/(2d), h = sqrt(r0^2 - a^2), solutions = midpoint +/- h*perpendicular. First-principles Euclidean geometry, the standard swing-tie / trilateration locate in the route-surveying references (Ghilani & Wolf, Elementary Surveying), by name. Plane grid coordinates; two mirror-image solutions -- the field sketch picks the side. The project control and datum govern.";
  const n0 = makeNumber("Point 1 northing N (ft)", "ddi-n0", { step: "any" });
  const e0 = makeNumber("Point 1 easting E (ft)", "ddi-e0", { step: "any" });
  const r0 = makeNumber("Distance from point 1 (ft)", "ddi-r0", { step: "any", min: "0" });
  const n1 = makeNumber("Point 2 northing N (ft)", "ddi-n1", { step: "any" });
  const e1 = makeNumber("Point 2 easting E (ft)", "ddi-e1", { step: "any" });
  const r1 = makeNumber("Distance from point 2 (ft)", "ddi-r1", { step: "any", min: "0" });
  for (const f of [n0, e0, r0, n1, e1, r1]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n0.input.value = "5000"; e0.input.value = "5000"; r0.input.value = "70.711"; n1.input.value = "5000"; e1.input.value = "5100"; r1.input.value = "70.711"; update(); });
  const oSol1 = makeOutputLine(outputRegion, "Solution A (N, E)", "ddi-out-1");
  const oSol2 = makeOutputLine(outputRegion, "Solution B (N, E)", "ddi-out-2");
  const oD = makeOutputLine(outputRegion, "Between control points", "ddi-out-d");
  const oNote = makeOutputLine(outputRegion, "Note", "ddi-out-note");
  const update = debounce(() => {
    const r = computeDistanceDistanceIntersect({ n0_ft: Number(n0.input.value) || 0, e0_ft: Number(e0.input.value) || 0, dist0_ft: Number(r0.input.value) || 0, n1_ft: Number(n1.input.value) || 0, e1_ft: Number(e1.input.value) || 0, dist1_ft: Number(r1.input.value) || 0 });
    if (r.error) { oSol1.textContent = r.error; oSol2.textContent = "-"; oD.textContent = "-"; oNote.textContent = ""; return; }
    oSol1.textContent = "N " + fmt(r.sol1_n_ft, 3) + ", E " + fmt(r.sol1_e_ft, 3) + " ft";
    oSol2.textContent = r.tangent ? "(tangent - single solution)" : "N " + fmt(r.sol2_n_ft, 3) + ", E " + fmt(r.sol2_e_ft, 3) + " ft";
    oD.textContent = fmt(r.d_ft, 3) + " ft (offset from chord " + fmt(r.offset_h_ft, 3) + " ft)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n0.input, e0.input, r0.input, n1.input, e1.input, r1.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["distance-distance-intersection"] = renderDistanceDistanceIntersect;

// dims: in { slope_distance_ft: L, angle_deg: dimensionless, angle_mode: dimensionless, hi_ft: L, hr_ft: L } out: { horizontal_ft: L, vertical_ft: L, elev_diff_ft: L }
// Total-station / EDM slope-to-horizontal reduction (right-triangle trig).
// Zenith angle Z (from vertical): H = S sin Z, V = S cos Z.
// Vertical angle a (from horizontal, + up): H = S cos a, V = S sin a.
// Ground-to-ground elevation difference = V + instrument height - reflector height.
export function computeEdmSlopeReduction({ angle_mode, slope_distance_ft = 0, angle_deg = 0, hi_ft = 0, hr_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const S = Number(slope_distance_ft) || 0;
  if (!(S > 0)) return { error: "Slope distance must be positive (ft)." };
  const a = Number(angle_deg);
  const m = String(angle_mode || "zenith").toLowerCase();
  let H, V;
  if (m === "zenith") {
    if (!(a > 0 && a < 180)) return { error: "Zenith angle must be between 0 and 180 degrees (90 = level)." };
    const z = (a * Math.PI) / 180;
    H = S * Math.sin(z);
    V = S * Math.cos(z);
  } else if (m === "vertical") {
    if (!(a > -90 && a < 90)) return { error: "Vertical angle must be between -90 and 90 degrees (0 = level)." };
    const t = (a * Math.PI) / 180;
    H = S * Math.cos(t);
    V = S * Math.sin(t);
  } else {
    return { error: "Angle mode must be 'zenith' or 'vertical'." };
  }
  const elev_diff_ft = V + (Number(hi_ft) || 0) - (Number(hr_ft) || 0);
  return {
    horizontal_ft: H,
    vertical_ft: V,
    elev_diff_ft,
    note: "Right-triangle reduction of an EDM/total-station slope distance. Zenith angle is measured from vertical (90 deg = level), a vertical angle from horizontal (0 deg = level, + up). The elevation difference between the two ground points adds the instrument height and subtracts the reflector (rod) height (V + HI - HR). Does not apply the earth curvature-and-refraction correction for long sights or a grid scale factor on a mapping projection. A computational aid; the instrument and the project control govern.",
  };
}
export const edmSlopeReductionExample = { inputs: { angle_mode: "zenith", slope_distance_ft: 250, angle_deg: 86, hi_ft: 0, hr_ft: 0 } };

function renderEdmSlopeReduction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: EDM / total-station slope reduction by right-triangle trigonometry - horizontal H = S sin(Z) = S cos(a), vertical V = S cos(Z) = S sin(a), where Z is the zenith angle (from vertical) and a the vertical angle (from horizontal); ground-to-ground elevation difference = V + instrument height - reflector height. Standard plane-survey reduction per Ghilani, Elementary Surveying, by name. No curvature/refraction or grid scale factor. A computational aid; the project control governs.";
  const mode = makeSelect("Angle type", "edm-mode", [
    { value: "zenith", label: "Zenith angle (from vertical, 90 = level)" },
    { value: "vertical", label: "Vertical angle (from horizontal, 0 = level)" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const s = makeNumber("Slope distance S (ft)", "edm-s", { step: "any", min: "0" });
  const ang = makeNumber("Angle (deg)", "edm-a", { step: "any" });
  const hi = makeNumber("Instrument height HI (ft, optional)", "edm-hi", { step: "any" });
  const hr = makeNumber("Reflector/rod height HR (ft, optional)", "edm-hr", { step: "any" });
  for (const f of [s, ang, hi, hr]) inputRegion.appendChild(f.wrap);
  const oH = makeOutputLine(outputRegion, "Horizontal distance", "edm-out-h");
  const oV = makeOutputLine(outputRegion, "Vertical distance", "edm-out-v");
  const oE = makeOutputLine(outputRegion, "Elevation difference (with HI/HR)", "edm-out-e");
  const oNote = makeOutputLine(outputRegion, "Note", "edm-out-note");
  const update = debounce(() => {
    const r = computeEdmSlopeReduction({ angle_mode: mode.select.value, slope_distance_ft: Number(s.input.value) || 0, angle_deg: Number(ang.input.value) || 0, hi_ft: Number(hi.input.value) || 0, hr_ft: Number(hr.input.value) || 0 });
    if (r.error) { oH.textContent = r.error; oV.textContent = "-"; oE.textContent = "-"; oNote.textContent = ""; return; }
    oH.textContent = fmt(r.horizontal_ft, 3) + " ft";
    oV.textContent = fmt(r.vertical_ft, 3) + " ft";
    oE.textContent = fmt(r.elev_diff_ft, 3) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "zenith"; s.input.value = "250"; ang.input.value = "86"; hi.input.value = ""; hr.input.value = ""; update(); });
  mode.select.addEventListener("change", update);
  for (const f of [s.input, ang.input, hi.input, hr.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["edm-slope-reduction"] = renderEdmSlopeReduction;

// dims: in { sight_distance_ft: L } out: { correction_ft: L, curvature_ft: L, refraction_ft: L }
// Combined earth-curvature-and-refraction correction for a leveling sight.
// With K = sight distance in thousands of feet: curvature = 0.0239 K^2,
// refraction = 0.0033 K^2 (about 1/7 of curvature, opposite sign), and the
// combined correction h_cr = 0.0206 K^2 ft is SUBTRACTED from the far rod.
export function computeLevelingCurvatureRefraction({ sight_distance_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(sight_distance_ft) || 0;
  if (!(d > 0)) return { error: "Sight distance must be positive (ft)." };
  const K = d / 1000;
  const K2 = K * K;
  const curvature_ft = 0.0239 * K2;
  const refraction_ft = 0.0033 * K2;
  const correction_ft = 0.0206 * K2;
  return {
    correction_ft,
    curvature_ft,
    refraction_ft,
    note: "Combined earth-curvature-and-refraction correction for a single leveling (or trig-leveling) sight: with K = sight distance in thousands of feet, curvature raises the correction 0.0239 K^2 ft and atmospheric refraction bends the line back by about 0.0033 K^2 ft, leaving a net 0.0206 K^2 ft that is SUBTRACTED from the far rod reading (a distant point reads too high). Balanced backsight/foresight distances in differential leveling cancel this automatically - the correction matters for a long or unbalanced sight and for reciprocal/trig leveling. The 0.0206 coefficient assumes the standard refraction coefficient k ~ 0.14; strong temperature gradients near the ground change it. A computational aid; the project procedure governs.",
  };
}
export const levelingCurvatureRefractionExample = { inputs: { sight_distance_ft: 2000 } };

function renderLevelingCurvatureRefraction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: combined earth curvature-and-refraction correction h_cr = 0.0206 K^2 ft, K the sight distance in thousands of feet (curvature 0.0239 K^2 minus refraction 0.0033 K^2); equivalently 0.574 M^2 with M in miles. Standard leveling reduction per Ghilani, Elementary Surveying, by name. Assumes a refraction coefficient k ~ 0.14. A computational aid; the project procedure governs.";
  const d = makeNumber("Sight distance (ft)", "lcr-d", { step: "any", min: "0" });
  inputRegion.appendChild(d.wrap);
  const oC = makeOutputLine(outputRegion, "Combined correction (subtract from far rod)", "lcr-out-c");
  const oCurv = makeOutputLine(outputRegion, "Curvature component", "lcr-out-curv");
  const oRef = makeOutputLine(outputRegion, "Refraction component", "lcr-out-ref");
  const oNote = makeOutputLine(outputRegion, "Note", "lcr-out-note");
  const update = debounce(() => {
    const r = computeLevelingCurvatureRefraction({ sight_distance_ft: Number(d.input.value) || 0 });
    if (r.error) { oC.textContent = r.error; oCurv.textContent = "-"; oRef.textContent = "-"; oNote.textContent = ""; return; }
    oC.textContent = fmt(r.correction_ft, 4) + " ft";
    oCurv.textContent = fmt(r.curvature_ft, 4) + " ft";
    oRef.textContent = fmt(r.refraction_ft, 4) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { d.input.value = "2000"; update(); });
  d.input.addEventListener("input", update);
}
SURVEY_RENDERERS["leveling-curvature-refraction"] = renderLevelingCurvatureRefraction;

// State-plane grid-to-ground: elevation factor EF = R/(R+h) with R = 20,906,000 ft
// (NGS mean earth radius), combined factor CF = GSF x EF, ground = grid / CF.
const _NGS_MEAN_RADIUS_FT = 20906000;
// dims: in { grid_distance_ft: L, grid_scale_factor: dimensionless, ellipsoid_height_ft: L } out: { ground_distance_ft: L, combined_factor: dimensionless, elevation_factor: dimensionless }
export function computeGridToGround({ grid_distance_ft = 0, grid_scale_factor = 1, ellipsoid_height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const grid = Number(grid_distance_ft) || 0;
  const gsf = Number(grid_scale_factor) || 0;
  const h = Number(ellipsoid_height_ft);
  if (!(grid > 0)) return { error: "Grid distance must be positive (ft)." };
  if (!(gsf > 0)) return { error: "Grid scale factor must be positive (near 1.0)." };
  if (!Number.isFinite(h)) return { error: "Ellipsoid height must be a number (ft)." };
  if (!(_NGS_MEAN_RADIUS_FT + h > 0)) return { error: "Ellipsoid height is out of range." };
  const elevation_factor = _NGS_MEAN_RADIUS_FT / (_NGS_MEAN_RADIUS_FT + h);
  const combined_factor = gsf * elevation_factor;
  const ground_distance_ft = grid / combined_factor;
  return {
    ground_distance_ft, combined_factor, elevation_factor,
    note: "State-plane grid-to-ground reduction: the elevation (sea-level) factor EF = R/(R+h) with R = 20,906,000 ft (NGS mean earth radius) and h the ellipsoid height, the combined factor CF = grid-scale-factor x EF, and ground = grid / CF (reverse: grid = ground x CF). The grid scale factor comes from the projection at the point (a state-plane or UTM zone value near 1.0, from software or the NGS tool) and h is the ELLIPSOID height = orthometric elevation H + geoid height N (N is negative in the conterminous US, ~ -30 m), so enter H + N, not the elevation alone. Above the ellipsoid the ground is longer than the grid (CF < 1). A computational aid; the published control and the datum govern.",
  };
}
export const gridToGroundExample = { inputs: { grid_distance_ft: 10000, grid_scale_factor: 0.9999, ellipsoid_height_ft: 5280 } };

function renderGridToGround(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: state-plane grid-to-ground reduction - elevation factor EF = R/(R+h), R = 20,906,000 ft (NGS mean earth radius), combined factor CF = grid-scale-factor x EF, ground = grid / CF. Standard NGS/NOAA State Plane Coordinate System practice, by name. The grid scale factor is a projection value near 1.0; h is the ELLIPSOID height (orthometric H + geoid N). A computational aid; the published control governs.";
  const grid = makeNumber("Grid (map) distance (ft)", "g2g-d", { step: "any", min: "0" });
  const gsf = makeNumber("Grid scale factor (near 1.0)", "g2g-gsf", { step: "any", min: "0" });
  const h = makeNumber("Ellipsoid height h = H + N (ft)", "g2g-h", { step: "any" });
  for (const f of [grid, gsf, h]) inputRegion.appendChild(f.wrap);
  const oG = makeOutputLine(outputRegion, "Ground distance", "g2g-out-ground");
  const oCF = makeOutputLine(outputRegion, "Combined factor", "g2g-out-cf");
  const oEF = makeOutputLine(outputRegion, "Elevation factor", "g2g-out-ef");
  const oNote = makeOutputLine(outputRegion, "Note", "g2g-out-note");
  const update = debounce(() => {
    const r = computeGridToGround({ grid_distance_ft: Number(grid.input.value) || 0, grid_scale_factor: Number(gsf.input.value) || 0, ellipsoid_height_ft: Number(h.input.value) || 0 });
    if (r.error) { oG.textContent = r.error; oCF.textContent = "-"; oEF.textContent = "-"; oNote.textContent = ""; return; }
    oG.textContent = fmt(r.ground_distance_ft, 3) + " ft";
    oCF.textContent = fmt(r.combined_factor, 7);
    oEF.textContent = fmt(r.elevation_factor, 7);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { grid.input.value = "10000"; gsf.input.value = "0.9999"; h.input.value = "5280"; update(); });
  for (const f of [grid.input, gsf.input, h.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["grid-to-ground"] = renderGridToGround;

// dims: in { start_n: L, start_e: L, end_n: L, end_e: L } out: { distance_ft: L, azimuth_deg: dimensionless, delta_n: L, delta_e: L }
// COGO inverse (two points -> bearing and distance): dN = N2-N1, dE = E2-E1,
// distance = hypot(dN, dE), azimuth = atan2(dE, dN) clockwise from north.
export function computeCogoInverseLocate({ start_n = 0, start_e = 0, end_n = 0, end_e = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n1 = Number(start_n);
  const e1 = Number(start_e);
  const n2 = Number(end_n);
  const e2 = Number(end_e);
  if (![n1, e1, n2, e2].every(Number.isFinite)) return { error: "All coordinates must be numbers (ft)." };
  const delta_n = n2 - n1;
  const delta_e = e2 - e1;
  const distance_ft = Math.hypot(delta_n, delta_e);
  if (!(distance_ft > 0)) return { error: "The two points are identical; a zero-length line has no bearing." };
  let azimuth_deg = (Math.atan2(delta_e, delta_n) * 180) / Math.PI;
  if (azimuth_deg < 0) azimuth_deg += 360;
  return {
    distance_ft, azimuth_deg, delta_n, delta_e,
    note: "The COGO inverse: from two known points, the straight-line distance and the azimuth of the line from the first to the second. Distance = sqrt(dN^2 + dE^2), azimuth = atan2(dE, dN) measured clockwise from north (0-360 deg). This is the exact inverse of the cogo-forward-point tile (a point plus a bearing and distance): running the forward tile from the first point on this azimuth and distance lands on the second. To read it as a quadrant bearing (N45E, S30W), the azimuth-bearing-conversion tile takes the azimuth. Plane (grid) geometry - no earth curvature or grid scale factor; the project control and datum govern.",
  };
}
export const cogoInverseLocateExample = { inputs: { start_n: 5000, start_e: 5000, end_n: 5141.42, end_e: 5141.42 } };

function renderCogoInverseLocate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: coordinate geometry inverse - distance = sqrt(dN^2 + dE^2), azimuth = atan2(dE, dN) clockwise from north, dN = N2-N1, dE = E2-E1. First-principles latitude/departure per the standard route-surveying references (Ghilani & Wolf; FM 5-233), by name. The exact inverse of cogo-forward-point. Plane geometry - no curvature or grid scale factor; the project control and datum govern.";
  const n1 = makeNumber("Start northing N1 (ft)", "cil-n1", { step: "any" });
  const e1 = makeNumber("Start easting E1 (ft)", "cil-e1", { step: "any" });
  const n2 = makeNumber("End northing N2 (ft)", "cil-n2", { step: "any" });
  const e2 = makeNumber("End easting E2 (ft)", "cil-e2", { step: "any" });
  for (const f of [n1, e1, n2, e2]) inputRegion.appendChild(f.wrap);
  const oD = makeOutputLine(outputRegion, "Distance", "cil-out-d");
  const oA = makeOutputLine(outputRegion, "Azimuth (clockwise from north)", "cil-out-a");
  const oDelta = makeOutputLine(outputRegion, "Latitude / departure (dN / dE)", "cil-out-delta");
  const oNote = makeOutputLine(outputRegion, "Note", "cil-out-note");
  const update = debounce(() => {
    const r = computeCogoInverseLocate({ start_n: Number(n1.input.value), start_e: Number(e1.input.value), end_n: Number(n2.input.value), end_e: Number(e2.input.value) });
    if (r.error) { oD.textContent = r.error; oA.textContent = "-"; oDelta.textContent = "-"; oNote.textContent = ""; return; }
    oD.textContent = fmt(r.distance_ft, 3) + " ft";
    oA.textContent = fmt(r.azimuth_deg, 4) + " deg";
    oDelta.textContent = fmt(r.delta_n, 3) + " ft / " + fmt(r.delta_e, 3) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { n1.input.value = "5000"; e1.input.value = "5000"; n2.input.value = "5141.42"; e2.input.value = "5141.42"; update(); });
  for (const f of [n1.input, e1.input, n2.input, e2.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["cogo-inverse-locate"] = renderCogoInverseLocate;

// --- spec-v1121: normal tension for a suspended steel tape ---
// taping-corrections computes the four corrections; this answers the field question that
// comes next - what pull makes two of them cancel, so the tape reads right with no
// arithmetic at all. Setting the tension correction equal and opposite to the sag
// correction, (P - P0) L / (A E) = w^2 L^3 / (24 P^2), and substituting the span's total
// weight W = w L collapses the length out entirely:
//     P^2 (P - P0) = A E W^2 / 24
// which is the cubic this solves by bisection. Taking the square root of both sides
// recovers the textbook closed form P = 0.204 W sqrt(A E) / sqrt(P - P0), since
// 1/sqrt(24) = 0.20412 - the same root, written implicitly. The fuzzer checks the
// bisection against that identity rather than against a memorized number.
// dims: in { span_ft: L, tape_weight_plf: M T^-2, tape_area_in2: L^2, standard_pull_lb: M L T^-2, applied_pull_lb: M L T^-2, e_psi: M L^-1 T^-2 } out: { normal_tension_lb: M L T^-2, span_weight_lb: M L T^-2, sag_at_normal_ft: L, pull_at_normal_ft: L, net_at_applied_ft: L, sag_at_applied_ft: L, pull_at_applied_ft: L }
export function computeTapingNormalTension({ span_ft = 100, tape_weight_plf = 0.02, tape_area_in2 = 0.006, standard_pull_lb = 10, applied_pull_lb = 0, e_psi = 29e6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(span_ft) || 0;
  const w = Number(tape_weight_plf) || 0;
  const A = Number(tape_area_in2) || 0;
  const P0 = Number(standard_pull_lb) || 0;
  const Pa = Number(applied_pull_lb) || 0;
  const E = Number(e_psi) || 0;
  if (!(L > 0)) return { error: "Unsupported span must be positive (ft)." };
  if (!(w >= 0)) return { error: "Tape weight per foot cannot be negative (lb/ft)." };
  if (!(A > 0)) return { error: "Tape cross-sectional area must be positive (in^2)." };
  if (!(E > 0)) return { error: "Tape modulus must be positive (psi)." };
  if (P0 < 0) return { error: "Standardization pull cannot be negative (lb)." };
  if (Pa < 0) return { error: "Applied pull cannot be negative (lb)." };

  const span_weight_lb = w * L;
  const ae = A * E;
  const rhs = ae * span_weight_lb * span_weight_lb / 24;

  // A weightless tape has no sag to cancel, so the only pull with no correction is the
  // standardization pull itself.
  let normal_tension_lb = P0;
  if (rhs > 0) {
    // f(P) = P^2 (P - P0) - rhs is strictly increasing for P > P0, so bisection is exact.
    let lo = P0, hi = Math.max(P0 + 1, 1);
    for (let i = 0; i < 200 && hi * hi * (hi - P0) < rhs; i++) hi *= 2;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (mid * mid * (mid - P0) < rhs) lo = mid; else hi = mid;
    }
    normal_tension_lb = (lo + hi) / 2;
  }

  const sagAt = (P) => (P > 0 ? -(w * w * Math.pow(L, 3)) / (24 * P * P) : null);
  const pullAt = (P) => ((P - P0) * L) / ae;
  const sag_at_normal_ft = sagAt(normal_tension_lb);
  const pull_at_normal_ft = pullAt(normal_tension_lb);
  const residual_at_normal_ft = (sag_at_normal_ft === null ? 0 : sag_at_normal_ft) + pull_at_normal_ft;

  const has_applied = Pa > 0;
  const sag_at_applied_ft = has_applied ? sagAt(Pa) : null;
  const pull_at_applied_ft = has_applied ? pullAt(Pa) : null;
  const net_at_applied_ft = has_applied ? sag_at_applied_ft + pull_at_applied_ft : null;
  const applied_reads_short = has_applied ? net_at_applied_ft < 0 : null;

  const note = "A " + L + " ft unsupported span of this tape weighs " + span_weight_lb.toFixed(2) + " lb. "
    + (rhs > 0
      ? "Normal tension is " + normal_tension_lb.toFixed(1) + " lb: at that pull the tape stretches exactly as much as its own sag shortens it, so the sag term (" + sag_at_normal_ft.toFixed(4) + " ft) and the tension term (+" + pull_at_normal_ft.toFixed(4) + " ft) cancel and the tape reads true with no correction applied. "
      : "With no tape weight there is no sag to cancel, so the only pull needing no correction is the standardization pull itself, " + P0.toFixed(1) + " lb. ")
    + (has_applied
      ? "At the " + Pa.toFixed(1) + " lb you entered the two terms are " + sag_at_applied_ft.toFixed(4) + " and " + (pull_at_applied_ft >= 0 ? "+" : "") + pull_at_applied_ft.toFixed(4) + " ft, a net " + (net_at_applied_ft >= 0 ? "+" : "") + net_at_applied_ft.toFixed(4) + " ft over the span - the tape reads " + (applied_reads_short ? "LONG, so the true distance is shorter than the reading" : "SHORT, so the true distance is longer than the reading") + " by that much. "
      : "")
    + "Why it collapses so cleanly: setting the tension correction (P - P0) L / (A E) equal and opposite to the sag correction w^2 L^3 / (24 P^2) and writing W = w L for the span weight removes the length from both sides, leaving P^2 (P - P0) = A E W^2 / 24. Square-rooting that gives the textbook P = 0.204 W sqrt(A E) / sqrt(P - P0), which is the same equation - 0.204 is just 1 over the square root of 24. This tile solves the cubic directly instead of iterating the implicit form. "
    + "Normal tension is not always practical: it can exceed what a crew can hold steadily or what the tape is rated for, and a tape supported throughout has no sag to cancel in the first place. It also does nothing about temperature or the tape's own standardization error, which still need the correction tile. Steel at 29,000,000 psi by default; a tape's actual area and weight come from its own specification, and the difference between a light 100-ft tape and a heavy one moves this answer a lot. A field aid; the tape calibration and the survey's procedure govern.";

  return { normal_tension_lb, span_weight_lb, sag_at_normal_ft, pull_at_normal_ft, residual_at_normal_ft, sag_at_applied_ft, pull_at_applied_ft, net_at_applied_ft, applied_reads_short, note };
}

export const tapingNormalTensionExample = { inputs: { span_ft: 100, tape_weight_plf: 0.02, tape_area_in2: 0.006, standard_pull_lb: 10, applied_pull_lb: 20, e_psi: 29e6 } };

function renderTapingNormalTension(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: normal tension, the pull at which the tension and sag corrections to a suspended steel tape cancel. Derived, not tabulated: setting (P - P0) L / (A E) = w^2 L^3 / (24 P^2) and substituting the span weight W = w L eliminates the length and leaves P^2 (P - P0) = A E W^2 / 24, whose square root is the textbook implicit form P = 0.204 W sqrt(A E) / sqrt(P - P0) (0.204 = 1/sqrt(24)). Solved here by bisection on the cubic. The component corrections match the taping-corrections tile exactly. Steel modulus 29,000,000 psi by default; tape area and weight per foot come from the tape's specification. Does not address temperature or standardization error, and normal tension may exceed a practical or rated pull. A field aid; the tape calibration and the survey's procedure govern.";
  const l = makeNumber("Unsupported span L (ft)", "tnt-l", { step: "any", min: "0" });
  const w = makeNumber("Tape weight per foot (lb/ft)", "tnt-w", { step: "any", min: "0" });
  const a = makeNumber("Tape cross-section A (in²)", "tnt-a", { step: "any", min: "0" });
  const p0 = makeNumber("Standardization pull P0 (lb)", "tnt-p0", { step: "any", min: "0" });
  const pa = makeNumber("Pull you actually used (lb, optional)", "tnt-pa", { step: "any", min: "0" });
  for (const f of [l, w, a, p0, pa]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { l.input.value = "100"; w.input.value = "0.02"; a.input.value = "0.006"; p0.input.value = "10"; pa.input.value = "20"; update(); });
  const oNt = makeOutputLine(outputRegion, "Normal tension", "tnt-out-nt");
  const oWt = makeOutputLine(outputRegion, "Weight of the suspended span", "tnt-out-wt");
  const oCanc = makeOutputLine(outputRegion, "At normal tension: sag / tension terms", "tnt-out-canc");
  const oApp = makeOutputLine(outputRegion, "At the pull you used: net error", "tnt-out-app");
  const oNote = makeOutputLine(outputRegion, "Note", "tnt-out-note");
  const update = debounce(() => {
    const r = computeTapingNormalTension({ span_ft: Number(l.input.value) || 0, tape_weight_plf: Number(w.input.value) || 0, tape_area_in2: Number(a.input.value) || 0, standard_pull_lb: Number(p0.input.value) || 0, applied_pull_lb: Number(pa.input.value) || 0 });
    if (r.error) { oNt.textContent = r.error; oWt.textContent = "-"; oCanc.textContent = "-"; oApp.textContent = "-"; oNote.textContent = "-"; return; }
    oNt.textContent = fmt(r.normal_tension_lb, 1) + " lb";
    oWt.textContent = fmt(r.span_weight_lb, 2) + " lb";
    oCanc.textContent = fmt(r.sag_at_normal_ft, 4) + " ft and +" + fmt(r.pull_at_normal_ft, 4) + " ft - they cancel";
    oApp.textContent = r.net_at_applied_ft === null ? "- (enter the pull you used)" : fmt(r.net_at_applied_ft, 4) + " ft over the span, tape reads " + (r.applied_reads_short ? "long" : "short");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [l.input, w.input, a.input, p0.input, pa.input]) f.addEventListener("input", update);
}
SURVEY_RENDERERS["taping-normal-tension"] = renderTapingNormalTension;

// --- spec-v1198: azimuth <-> quadrant-bearing conversion ---
// The cogo-forward-point and cogo-inverse-locate tiles both tell the user to
// "read it as a quadrant bearing (N45E)" and point at the bearing-conversion
// tile - but that tile only shifts a direction by magnetic declination; it does
// no azimuth/quadrant conversion at all. Deeds and plats are written in quadrant
// bearings (N 41 deg 30 min E), while all the coordinate math runs on azimuths
// clockwise from north. This closes the round trip between the two.
// Non-exported DMS formatter (no v14 corpus row): decimal degrees to D deg M' S".
function _toDms(deg) {
  let D = Math.floor(Math.abs(deg));
  const mFloat = (Math.abs(deg) - D) * 60;
  let M = Math.floor(mFloat);
  let S = Math.round((mFloat - M) * 60);
  if (S >= 60) { S -= 60; M += 1; }
  if (M >= 60) { M -= 60; D += 1; }
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return D + "°" + pad(M) + "'" + pad(S) + "\"";
}
// dims: in { mode: dimensionless, azimuth_deg: dimensionless, quadrant: dimensionless, quadrant_angle_deg: dimensionless } out: { azimuth_deg: dimensionless, quadrant_angle_deg: dimensionless }
export function computeAzimuthBearing({ mode = "azimuth_to_bearing", azimuth_deg = 0, quadrant = "NE", quadrant_angle_deg = 0 } = {}) {
  const _g = _finiteGuard({ azimuth_deg, quadrant_angle_deg }); if (_g) return _g;
  const m = String(mode || "").toLowerCase();
  let A;
  if (m === "azimuth_to_bearing") {
    A = Number(azimuth_deg);
    if (!(A >= 0 && A <= 360)) return { error: "Azimuth must be between 0 and 360 degrees (clockwise from north)." };
  } else if (m === "bearing_to_azimuth") {
    const b = Number(quadrant_angle_deg);
    if (!(b >= 0 && b <= 90)) return { error: "Bearing angle must be between 0 and 90 degrees." };
    const q = String(quadrant || "").toUpperCase();
    if (q === "NE") A = b;
    else if (q === "SE") A = 180 - b;
    else if (q === "SW") A = 180 + b;
    else if (q === "NW") A = 360 - b;
    else return { error: "Quadrant must be NE, SE, SW, or NW." };
  } else {
    return { error: "Mode must be 'azimuth_to_bearing' or 'bearing_to_azimuth'." };
  }
  if (A >= 360) A -= 360;
  // Canonical azimuth in hand, derive the quadrant-bearing representation.
  let quad, ang;
  if (A <= 90) { quad = "NE"; ang = A; }
  else if (A <= 180) { quad = "SE"; ang = 180 - A; }
  else if (A <= 270) { quad = "SW"; ang = A - 180; }
  else { quad = "NW"; ang = 360 - A; }
  const cardinal = A === 0 ? "due North" : A === 90 ? "due East" : A === 180 ? "due South" : A === 270 ? "due West" : null;
  const letters = { NE: ["N", "E"], SE: ["S", "E"], SW: ["S", "W"], NW: ["N", "W"] }[quad];
  const bearing_label = cardinal || (letters[0] + " " + _toDms(ang) + " " + letters[1]);
  return {
    azimuth_deg: A,
    quadrant_angle_deg: ang,
    quadrant: quad,
    bearing_label,
    azimuth_dms: _toDms(A),
    note: "Azimuths (0 to 360 deg, clockwise from north) drive coordinate geometry, while deeds and plats are written as quadrant bearings (N or S, an angle from 0 to 90 deg, then E or W); the two name the same direction. An azimuth in the first quadrant reads N az E; in the second, S the supplement E; in the third, S the excess over 180 W; in the fourth, N the deficit from 360 W. The cardinal azimuths read as due north, east, south, or west. The bearing angle is shown to the nearest second. This is plane-direction bookkeeping: it does not apply magnetic declination (the bearing-conversion tile does) or a grid convergence. A computational aid; the recorded plat and the surveyor of record govern.",
  };
}
export const azimuthBearingExample = { inputs: { mode: "azimuth_to_bearing", azimuth_deg: 138.5, quadrant: "NE", quadrant_angle_deg: 0 } };

function renderAzimuthBearing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: azimuth / quadrant-bearing conversion - an azimuth 0 to 360 deg clockwise from north maps to a quadrant bearing (N or S, 0 to 90 deg, E or W) quadrant by quadrant: N az E, then S the supplement E, then S the excess over 180 W, then N the deficit from 360 W, and the reverse runs each rule backward. First-principles plane-direction geometry per the standard surveying references (Ghilani & Wolf; FM 5-233), by name. Does not apply magnetic declination (the bearing-conversion tile) or grid convergence. A computational aid; the recorded plat and the surveyor of record govern.";
  const mode = makeSelect("Convert", "azb-mode", [
    { value: "azimuth_to_bearing", label: "Azimuth -> quadrant bearing" },
    { value: "bearing_to_azimuth", label: "Quadrant bearing -> azimuth" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const az = makeNumber("Azimuth (deg, 0 to 360, clockwise from north)", "azb-az", { step: "any", min: "0", max: "360" });
  const quad = makeSelect("Bearing quadrant", "azb-quad", [
    { value: "NE", label: "NE (N _ E)" },
    { value: "SE", label: "SE (S _ E)" },
    { value: "SW", label: "SW (S _ W)" },
    { value: "NW", label: "NW (N _ W)" },
  ]);
  const ang = makeNumber("Bearing angle (deg, 0 to 90)", "azb-ang", { step: "any", min: "0", max: "90" });
  for (const f of [az, quad, ang]) inputRegion.appendChild(f.wrap);
  const oAz = makeOutputLine(outputRegion, "Azimuth", "azb-out-az");
  const oBearing = makeOutputLine(outputRegion, "Quadrant bearing", "azb-out-bearing");
  const oQuad = makeOutputLine(outputRegion, "Quadrant / bearing angle", "azb-out-quad");
  const oNote = makeOutputLine(outputRegion, "Note", "azb-out-note");
  const update = debounce(() => {
    const r = computeAzimuthBearing({ mode: mode.select.value, azimuth_deg: Number(az.input.value) || 0, quadrant: quad.select.value, quadrant_angle_deg: Number(ang.input.value) || 0 });
    if (r.error) { oAz.textContent = r.error; oBearing.textContent = "-"; oQuad.textContent = "-"; oNote.textContent = ""; return; }
    oAz.textContent = fmt(r.azimuth_deg, 4) + " deg (" + r.azimuth_dms + ")";
    oBearing.textContent = r.bearing_label;
    oQuad.textContent = r.quadrant + ", " + fmt(r.quadrant_angle_deg, 4) + " deg";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "azimuth_to_bearing"; az.input.value = "138.5"; quad.select.value = "NE"; ang.input.value = "41.5"; update(); });
  for (const f of [az.input, ang.input]) f.addEventListener("input", update);
  for (const s of [mode.select, quad.select]) s.addEventListener("change", update);
  update();
}
SURVEY_RENDERERS["azimuth-bearing-conversion"] = renderAzimuthBearing;

// ===========================================================================
// spec-v1394, v1395, v1396: the surveying half of the 2026-08-26
// trade-expansion Group P band. See specs/scope-trade-expansion.md.
// (The field half -- map scale, contour slope, helicopter LZ, litter carry --
// lives in calc-field.js.)
// ===========================================================================

// Compact renderer factory, copied from the sibling calc-firesprinkler.js
// factory (number and select inputs; same schema shape). Non-exported, so it
// adds no v14 derivation-corpus row.
function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
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
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "select" ? "change" : "input", update);
    }
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

// ===================== spec-v1394: two-bearing resection =====================
// dims: in { args: dimensionless } out: { east: L, north: L, distance_a_ft: L, distance_b_ft: L, intersection_angle_deg: dimensionless }
export function computeThreePointResection({ ax = 0, ay = 0, azimuth_to_a_deg = 0, bx = 0, by = 0, azimuth_to_b_deg = 0, declination_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(bx) || !Number.isFinite(by)) return { error: "Known-point coordinates must be finite numbers." };
  if (ax === bx && ay === by) return { error: "The two known points must be different." };
  const rad = Math.PI / 180;
  // A bearing to a known feature, reversed, is a line FROM that feature THROUGH you.
  const backA = (azimuth_to_a_deg + declination_deg + 180) % 360;
  const backB = (azimuth_to_b_deg + declination_deg + 180) % 360;
  let intersection_angle_deg = Math.abs(backA - backB) % 360;
  if (intersection_angle_deg > 180) intersection_angle_deg = 360 - intersection_angle_deg;
  if (intersection_angle_deg > 90) intersection_angle_deg = 180 - intersection_angle_deg;
  if (intersection_angle_deg < 1e-9) return { error: "The two back-azimuths are parallel: the lines never cross, so there is no fix." };
  // Solve (Ax + t sinA, Ay + t cosA) = (Bx + s sinB, By + s cosB) for t.
  const sa = Math.sin(backA * rad), ca = Math.cos(backA * rad);
  const sb = Math.sin(backB * rad), cb = Math.cos(backB * rad);
  const det = sa * cb - ca * sb;
  if (Math.abs(det) < 1e-12) return { error: "The two back-azimuths are parallel: the lines never cross, so there is no fix." };
  const t = ((bx - ax) * cb - (by - ay) * sb) / det;
  const east = ax + t * sa;
  const north = ay + t * ca;
  const distance_a_ft = Math.hypot(east - ax, north - ay);
  const distance_b_ft = Math.hypot(east - bx, north - by);
  // Positional error scales as one over the sine of the intersection angle.
  const error_multiplier = 1 / Math.sin(intersection_angle_deg * rad);
  const strength = intersection_angle_deg >= 60
    ? "strong: the lines cross near square, so a bearing error moves the fix about as little as it can"
    : intersection_angle_deg >= 30
      ? "usable: a bearing error moves the fix " + fmt(error_multiplier, 1) + " times as far as it would at a square crossing"
      : "WEAK: under about 30 degrees of intersection a small bearing error slides the fix a long way along the lines -- shoot a third known point";
  if (![east, north, distance_a_ft, distance_b_ft, error_multiplier].every(Number.isFinite)) return { error: "Resection math is not a finite value." };
  return {
    east,
    north,
    distance_a_ft,
    distance_b_ft,
    back_azimuth_a_deg: backA,
    back_azimuth_b_deg: backB,
    intersection_angle_deg,
    error_multiplier,
    strength,
    note: "Where you are standing, from bearings shot to two known points. Shoot a bearing to a known feature and reverse it: that back azimuth is a line FROM the known feature THROUGH you. Do it to a second known feature and you have two lines, and where they cross is your position. The method works identically with a compass on a quadrangle and with a total station on control monuments, and the only care it needs is the declination correction when the bearings are magnetic. The strength-of-fix output is what keeps it honest. When the two lines cross near square the fix is sharp; when they cross at a shallow angle a small bearing error slides the intersection a long way along the lines, because the positional error scales as one over the sine of the intersection angle. Under about thirty degrees the fix should not be trusted, and the answer is a third known point -- whose three back-lines will not meet at a point but will form a small triangle, the cocked hat, whose size is the honest statement of how good the fix is. From known points at (1000, 5000) and (3000, 5400), azimuths of 315 and 45 degrees give back azimuths of 135 and 225, which cross square at (1800, 4200). Move so both features lie nearly in the same direction and the same one-degree uncertainty is worth three or four times as much ground. A field method; the survey of record and a checked closure govern anything that matters.",
  };
}

export const threePointResectionExample = { inputs: { ax: 1000, ay: 5000, azimuth_to_a_deg: 315, bx: 3000, by: 5400, azimuth_to_b_deg: 45, declination_deg: 0 } };

SURVEY_RENDERERS["three-point-resection"] = _simpleRenderer({
  citation: "Citation: two-bearing resection by back-azimuth intersection, by name -- public plane surveying and land-navigation practice. The strength of fix is reported as the intersection angle, whose sine divides the positional error; under about 30 degrees a third known point is required. A field method; the survey of record and a checked closure govern.",
  example: threePointResectionExample.inputs,
  fields: [
    { key: "ax", label: "Known point A easting", kind: "number" },
    { key: "ay", label: "Known point A northing", kind: "number" },
    { key: "azimuth_to_a_deg", label: "Observed azimuth to A (deg)", kind: "number" },
    { key: "bx", label: "Known point B easting", kind: "number" },
    { key: "by", label: "Known point B northing", kind: "number" },
    { key: "azimuth_to_b_deg", label: "Observed azimuth to B (deg)", kind: "number" },
    { key: "declination_deg", label: "Declination correction (deg, 0 if grid bearings)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "tpre-out-p", label: "Occupied point", value: (r) => fmt(r.east, 2) + " E, " + fmt(r.north, 2) + " N" },
    { key: "d", id: "tpre-out-d", label: "Distance to the known points", value: (r) => fmt(r.distance_a_ft, 1) + " to A, " + fmt(r.distance_b_ft, 1) + " to B" },
    { key: "b", id: "tpre-out-b", label: "Back azimuths used", value: (r) => fmt(r.back_azimuth_a_deg, 2) + " deg from A, " + fmt(r.back_azimuth_b_deg, 2) + " deg from B" },
    { key: "a", id: "tpre-out-a", label: "Intersection angle", value: (r) => fmt(r.intersection_angle_deg, 2) + " deg" },
    { key: "s", id: "tpre-out-s", label: "Strength of fix", value: (r) => r.strength },
    { key: "n", id: "tpre-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeThreePointResection,
});

// ===================== spec-v1395: slope stake catch point on a cross slope =====================
// dims: in { args: dimensionless } out: { catch_distance_ft: L, vertical_at_catch_ft: L, flat_ground_distance_ft: L }
export function computeSlopeStaking({ half_width_ft = 0, depth_ft = 0, side_slope_ratio = 2, ground_cross_slope = 0, section = "cut" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (section !== "cut" && section !== "fill") return { error: "Section must be cut or fill." };
  if (!(half_width_ft > 0)) return { error: "Half-width must be positive." };
  if (!(depth_ft > 0)) return { error: "Cut or fill depth at the hinge must be positive." };
  if (!(side_slope_ratio > 0)) return { error: "Side-slope ratio must be positive." };
  if (!Number.isFinite(ground_cross_slope)) return { error: "Ground cross slope must be a finite number." };
  // On a CUT the ground rising away from centerline pushes the catch farther out; on a
  // FILL it is the ground falling away that does. The sign convention flips with the section.
  const g = section === "cut" ? ground_cross_slope : -ground_cross_slope;
  const denominator = 1 - side_slope_ratio * g;
  if (!(denominator > 0)) {
    return { error: "The ground cross slope is as steep as the design side slope, so the slope never daylights -- the section needs a retaining structure or a slope change, not a longer tape." };
  }
  const run_ft = depth_ft * side_slope_ratio / denominator;
  const catch_distance_ft = half_width_ft + run_ft;
  const vertical_at_catch_ft = depth_ft + g * run_ft;
  const flat_ground_distance_ft = half_width_ft + depth_ft * side_slope_ratio;
  const difference_ft = catch_distance_ft - flat_ground_distance_ft;
  const limiting_cross_slope = 1 / side_slope_ratio;
  if (![run_ft, catch_distance_ft, vertical_at_catch_ft, flat_ground_distance_ft].every(Number.isFinite)) return { error: "Slope-staking math is not a finite value." };
  return {
    catch_distance_ft,
    run_ft,
    vertical_at_catch_ft,
    flat_ground_distance_ft,
    difference_ft,
    limiting_cross_slope,
    note: "Where a design side slope actually meets the ground, once the ground's own cross slope is accounted for. The design slope leaves the hinge point at the shoulder and runs out at its ratio until it daylights. If the ground were level the catch would sit at the half-width plus the depth times the ratio, and no correction would be needed -- but the ground is never level, and a cross slope that rises away from centerline pushes the catch point FARTHER out on a cut, because the ground is climbing toward the slope while the slope is climbing toward the ground and they take longer to meet. The denominator carries the whole correction and it also carries the warning: as the ratio times the cross slope approaches one -- a ground cross slope as steep as the design side slope -- the denominator goes to zero and the slope never catches at all. That is a real condition on side-hill work and the answer is a retaining structure or a slope change, not a longer tape. A 24 ft roadway in a 6 ft cut at 2:1 with the ground rising 10% away from centerline catches at 27.0 ft out and 7.5 ft down, three feet past the 24.0 ft the level-ground form would give; at 20% cross slope it is 32.0 ft, eight feet past. At 50% the 2:1 slope runs parallel to the ground and never daylights. A field calculation; the grading plan, the surveyor of record, and the existing-ground breaks between shots govern.",
  };
}

export const slopeStakingExample = { inputs: { half_width_ft: 12, depth_ft: 6, side_slope_ratio: 2, ground_cross_slope: 0.10, section: "cut" } };

SURVEY_RENDERERS["slope-staking"] = _simpleRenderer({
  citation: "Citation: slope-stake catch point with the ground cross-slope correction, d = half-width + H s / (1 - s g), by name -- standard construction-surveying practice. The level-ground form is the g = 0 case and is reported alongside for comparison. The grading plan, the surveyor of record, and the existing-ground breaks between shots govern.",
  example: slopeStakingExample.inputs,
  fields: [
    { key: "half_width_ft", label: "Roadway or pad half-width (ft)", kind: "number" },
    { key: "depth_ft", label: "Cut or fill depth at the hinge (ft)", kind: "number" },
    { key: "side_slope_ratio", label: "Side-slope ratio (run per unit rise, so 2 for 2:1)", kind: "number" },
    { key: "ground_cross_slope", label: "Ground cross slope (0.10 = 10% rising away)", kind: "number", attrs: { step: "any" } },
    { key: "section", label: "Section", kind: "select", options: [{ value: "cut", label: "Cut" }, { value: "fill", label: "Fill" }] },
  ],
  outputs: [
    { key: "d", id: "slst-out-d", label: "Catch point from centerline", value: (r) => fmt(r.catch_distance_ft, 2) + " ft (" + fmt(r.run_ft, 2) + " ft beyond the hinge)" },
    { key: "v", id: "slst-out-v", label: "Vertical from the hinge to the catch", value: (r) => fmt(r.vertical_at_catch_ft, 2) + " ft" },
    { key: "f", id: "slst-out-f", label: "Level-ground answer for comparison", value: (r) => fmt(r.flat_ground_distance_ft, 2) + " ft, which is " + fmt(Math.abs(r.difference_ft), 2) + " ft " + (r.difference_ft >= 0 ? "short" : "long") },
    { key: "l", id: "slst-out-l", label: "Cross slope at which this slope never daylights", value: (r) => fmt(r.limiting_cross_slope * 100, 1) + " %" },
    { key: "n", id: "slst-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSlopeStaking,
});

// ===================== spec-v1396: grade rod, cut, and fill =====================
// dims: in { args: dimensionless } out: { hi_ft: L, grade_rod_ft: L, ground_elevation_ft: L, cut_fill_ft: L }
export function computeGradeRodCutFill({ benchmark_elev_ft = 0, backsight_ft = 0, design_elev_ft = 0, ground_rod_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Number.isFinite(benchmark_elev_ft) || !Number.isFinite(design_elev_ft)) return { error: "Benchmark and design elevations must be finite numbers." };
  if (!(backsight_ft > 0)) return { error: "Backsight rod reading must be positive." };
  if (!(ground_rod_ft > 0)) return { error: "Ground rod reading must be positive." };
  // One number carries the whole design for the setup: the grade rod is the reading that
  // WOULD be observed if the rod stood on finished grade.
  const hi_ft = benchmark_elev_ft + backsight_ft;
  const grade_rod_ft = hi_ft - design_elev_ft;
  if (!(grade_rod_ft > 0)) return { error: "The design grade sits at or above the instrument, so no rod reading can reach it -- move the instrument up or reset on a higher benchmark." };
  const ground_elevation_ft = hi_ft - ground_rod_ft;
  const cut_fill_ft = grade_rod_ft - ground_rod_ft;
  const label = cut_fill_ft > 0 ? "CUT " + fmt(cut_fill_ft, 2) + " ft" : cut_fill_ft < 0 ? "FILL " + fmt(-cut_fill_ft, 2) + " ft" : "ON GRADE";
  if (![hi_ft, grade_rod_ft, ground_elevation_ft, cut_fill_ft].every(Number.isFinite)) return { error: "Grade-rod math is not a finite value." };
  return {
    hi_ft,
    grade_rod_ft,
    ground_elevation_ft,
    cut_fill_ft,
    label,
    note: "The cut or fill at a shot, from one grade rod that carries the whole design for the instrument setup. Set the instrument, shoot the benchmark, and the height of instrument is fixed: it is the benchmark elevation plus the backsight. From then on a single number does all the work -- the grade rod is the height of instrument less the design elevation, which is the rod reading that WOULD be observed if the rod were standing on finished grade. Every subsequent shot is compared against it and the difference is the cut or fill, with no elevation arithmetic at all. The sign is where crews go wrong and it is worth stating plainly: a rod reading SMALLER than the grade rod means the rod is standing HIGHER than design, because the rod reads downward from a fixed instrument. Smaller reading, higher ground, cut. It reads backward the first hundred times. A benchmark at 100.00 with a 5.20 backsight fixes the height of instrument at 105.20, and a design grade of 98.50 makes the grade rod 6.70; a ground shot reading 4.90 is therefore a cut of 1.80 ft, which checks independently because the ground sits at 100.30 against a design of 98.50. A shot reading 7.55 on the same setup is a fill of 0.85 ft. One grade rod, every shot on the setup, until the instrument moves. A field calculation; the grading plan, the benchmark of record, and a checked level circuit govern.",
  };
}

export const gradeRodCutFillExample = { inputs: { benchmark_elev_ft: 100.00, backsight_ft: 5.20, design_elev_ft: 98.50, ground_rod_ft: 4.90 } };

SURVEY_RENDERERS["grade-rod-cut-fill"] = _simpleRenderer({
  citation: "Citation: the grade-rod method of differential leveling -- height of instrument = benchmark + backsight, grade rod = HI - design elevation, cut or fill = grade rod - ground rod -- by name; standard construction-surveying practice. A smaller rod reading means higher ground and a cut. The grading plan, the benchmark of record, and a checked level circuit govern.",
  example: gradeRodCutFillExample.inputs,
  fields: [
    { key: "benchmark_elev_ft", label: "Benchmark elevation (ft)", kind: "number" },
    { key: "backsight_ft", label: "Backsight rod reading (ft)", kind: "number" },
    { key: "design_elev_ft", label: "Design (finished grade) elevation (ft)", kind: "number" },
    { key: "ground_rod_ft", label: "Ground rod reading at the shot (ft)", kind: "number" },
  ],
  outputs: [
    { key: "h", id: "grcf-out-h", label: "Height of instrument", value: (r) => fmt(r.hi_ft, 2) + " ft" },
    { key: "g", id: "grcf-out-g", label: "Grade rod for this setup", value: (r) => fmt(r.grade_rod_ft, 2) + " ft" },
    { key: "e", id: "grcf-out-e", label: "Ground elevation at the shot", value: (r) => fmt(r.ground_elevation_ft, 2) + " ft" },
    { key: "c", id: "grcf-out-c", label: "Cut or fill", value: (r) => r.label },
    { key: "n", id: "grcf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGradeRodCutFill,
});

// ===========================================================================
// spec-v1741..v1744: the 2026-09-08 trade-expansion survey technology band.
// Four tiles, all group E.
//
// TWO OF THE FOUR SPECS LEFT UNRENDERED PYTHON PLACEHOLDERS in their worked
// examples -- spec-v1742 twice and spec-v1743 once -- which are the fourth and
// fifth occurrences of that defect in this program, after spec-v1652,
// spec-v1615 and spec-v1687.

// ============ spec-v1741: drone flight GSD, overlap, and image count ============

// dims: in { flight_height_ft: L, focal_length_mm: L, pixel_pitch_um: L, sensor_width_px: dimensionless, sensor_height_px: dimensionless, forward_overlap_pct: dimensionless, side_overlap_pct: dimensionless, area_acres: L^2 } out: { gsd_cm_px: L, footprint_width_ft: L, footprint_height_ft: L, line_spacing_ft: L, shot_interval_ft: L, image_count: dimensionless }
export function computeDroneGsdOverlap({ flight_height_ft = 0, focal_length_mm = 0, pixel_pitch_um = 0, sensor_width_px = 0, sensor_height_px = 0, forward_overlap_pct = 75, side_overlap_pct = 65, area_acres = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(flight_height_ft > 0)) return { error: "Flight height above ground must be positive (ft)." };
  if (!(focal_length_mm > 0)) return { error: "Focal length must be positive (mm)." };
  if (!(pixel_pitch_um > 0)) return { error: "Sensor pixel pitch must be positive (micrometres)." };
  if (!(sensor_width_px > 0)) return { error: "Sensor width must be positive (pixels)." };
  if (!(sensor_height_px > 0)) return { error: "Sensor height must be positive (pixels)." };
  if (!(forward_overlap_pct >= 0 && forward_overlap_pct < 100)) return { error: "Forward overlap must be at least 0 and below 100 percent." };
  if (!(side_overlap_pct >= 0 && side_overlap_pct < 100)) return { error: "Side overlap must be at least 0 and below 100 percent." };
  if (area_acres < 0) return { error: "The area cannot be negative (acres)." };
  const M_PER_FT = 0.3048;
  const CM_PER_M = 100;
  const SQFT_PER_ACRE = 43560;
  const height_m = flight_height_ft * M_PER_FT;
  const focal_m = focal_length_mm / 1000;
  const pitch_m = pixel_pitch_um / 1000000;
  // The ground a single pixel covers: the similar-triangles relation between
  // the sensor and the ground at the flight height.
  const gsd_m_px = height_m * pitch_m / focal_m;
  const gsd_cm_px = gsd_m_px * CM_PER_M;
  const footprint_width_ft = gsd_m_px * sensor_width_px / M_PER_FT;
  const footprint_height_ft = gsd_m_px * sensor_height_px / M_PER_FT;
  const line_spacing_ft = footprint_width_ft * (1 - side_overlap_pct / 100);
  const shot_interval_ft = footprint_height_ft * (1 - forward_overlap_pct / 100);
  const effective_area_ft2 = line_spacing_ft * shot_interval_ft;
  const image_count = area_acres > 0 ? Math.ceil(area_acres * SQFT_PER_ACRE / effective_area_ft2) : null;
  const line_count = area_acres > 0 ? Math.ceil(Math.sqrt(area_acres * SQFT_PER_ACRE) / line_spacing_ft) : null;
  // Halving the height halves the GSD and quadruples the images, because both
  // footprint dimensions halve at once.
  const half_height_gsd_cm_px = gsd_cm_px / 2;
  const half_height_image_count = image_count === null ? null : image_count * 4;
  const outs = [gsd_cm_px, footprint_width_ft, footprint_height_ft, line_spacing_ft, shot_interval_ft];
  if (!outs.every(Number.isFinite)) return { error: "Flight planning math is not a finite value." };
  return {
    flight_height_ft, focal_length_mm, pixel_pitch_um, sensor_width_px, sensor_height_px,
    gsd_m_px, gsd_cm_px, footprint_width_ft, footprint_height_ft,
    forward_overlap_pct, side_overlap_pct, line_spacing_ft, shot_interval_ft,
    effective_area_ft2, area_acres, image_count, line_count,
    half_height_gsd_cm_px, half_height_image_count,
    note: "Ground sample distance is the ground a single pixel covers, and it follows from similar triangles: the flight height times the sensor's pixel pitch, over the focal length. It scales LINEARLY with height, which is the whole flight-planning trade -- and the cost of improving it does not. HALVING THE HEIGHT HALVES THE GSD AND QUADRUPLES THE IMAGE COUNT, because both the along-track and the cross-track footprints halve at once. Four times the images means four times the flight time and battery swaps, and processing that scales worse than linearly, so promising a GSD without running that multiplication is how a one-day flight becomes a three-day flight. THE MOST IMPORTANT SENTENCE IN THIS SUBJECT IS THAT GSD IS NOT ACCURACY. Ground sample distance is RESOLUTION -- how finely the ground is sampled -- and accuracy is how close the resulting coordinates are to truth, which comes from ground control, from the camera calibration, and from the geometry of the block. A survey flown at half a centimetre per pixel with no ground control can be metres out in position, and it will look magnificent while it is wrong. Overlap is the other lever and it is cheap by comparison. Mapping practice runs about seventy five to eighty percent forward and sixty five to seventy percent side, and it goes HIGHER over vegetation, water, and uniform surfaces, because the matching algorithms need texture to tie images together and those surfaces have little. A flight planned at the minimum overlap over a forest canopy produces holes in the model that no amount of processing recovers, and reflying is the only fix. Nadir photogrammetry over flat terrain from a rectangular sensor. It assumes the ground is level at the entered height: terrain relief changes the GSD across the frame, and a flight planned at a single height over rolling ground has a varying GSD and a varying overlap, which is what terrain-following flight modes exist to fix. It does not plan the mission, place ground control, evaluate the block geometry, or address oblique imagery, corridor mapping, or the crossing lines that stabilise a self-calibrating bundle adjustment. It does not compute accuracy at all, and no image count buys it. It does not address airspace, authorisation, visual line of sight, or the applicable aviation rules, which govern whether the flight happens. The applicable civil aviation rules, the project's accuracy specification, and the surveyor of record govern.",
  };
}
const droneGsdOverlapExample = { inputs: { flight_height_ft: 400, focal_length_mm: 24, pixel_pitch_um: 1.38, sensor_width_px: 8192, sensor_height_px: 5460, forward_overlap_pct: 75, side_overlap_pct: 65, area_acres: 40 } };
SURVEY_RENDERERS["drone-gsd-overlap"] = _simpleRenderer({
  citation: "Citation: the photogrammetric ground sample distance relation by name -- GSD = flight height x sensor pixel pitch / focal length -- with the image footprint as GSD x the sensor pixel dimensions, line spacing = footprint width x (1 - side overlap) and shot interval = footprint height x (1 - forward overlap). GSD IS RESOLUTION, NOT ACCURACY: accuracy comes from ground control, camera calibration, and block geometry, and is not computed here. Nadir imagery over level ground; terrain relief varies both GSD and overlap. The applicable civil aviation rules, the project's accuracy specification, and the surveyor of record govern.",
  example: droneGsdOverlapExample.inputs,
  fields: [
    { key: "flight_height_ft", label: "Flight height above ground (ft)", kind: "number", default: 400 },
    { key: "focal_length_mm", label: "Focal length (mm)", kind: "number", default: 24 },
    { key: "pixel_pitch_um", label: "Sensor pixel pitch (micrometres)", kind: "number", default: 1.38 },
    { key: "sensor_width_px", label: "Sensor width (pixels, across track)", kind: "number", default: 8192 },
    { key: "sensor_height_px", label: "Sensor height (pixels, along track)", kind: "number", default: 5460 },
    { key: "forward_overlap_pct", label: "Forward overlap (%)", kind: "number", default: 75 },
    { key: "side_overlap_pct", label: "Side overlap (%)", kind: "number", default: 65 },
    { key: "area_acres", label: "Area to cover (acres, 0 to skip the count)", kind: "number", default: 40 },
  ],
  outputs: [
    { key: "g", id: "dgo-out-g", label: "Ground sample distance", value: (r) => fmt(r.gsd_cm_px, 3) + " cm per pixel -- RESOLUTION, not accuracy, which comes from ground control" },
    { key: "f", id: "dgo-out-f", label: "Image footprint", value: (r) => fmt(r.footprint_width_ft, 1) + " ft across track by " + fmt(r.footprint_height_ft, 1) + " ft along track" },
    { key: "s", id: "dgo-out-s", label: "Flight geometry", value: (r) => fmt(r.line_spacing_ft, 1) + " ft between lines at " + fmt(r.side_overlap_pct, 0) + "% side overlap, a shot every " + fmt(r.shot_interval_ft, 1) + " ft at " + fmt(r.forward_overlap_pct, 0) + "% forward" },
    { key: "c", id: "dgo-out-c", label: "Images", value: (r) => r.image_count === null ? "(no area entered)" : fmt(r.image_count, 0) + " over " + fmt(r.area_acres, 1) + " acres, about " + fmt(r.line_count, 0) + " lines" },
    { key: "h", id: "dgo-out-h", label: "Flying half as high", value: (r) => fmt(r.half_height_gsd_cm_px, 3) + " cm per pixel" + (r.half_height_image_count === null ? "" : " and " + fmt(r.half_height_image_count, 0) + " images -- FOUR times as many for twice the detail, because both footprint dimensions halve at once") },
    { key: "n", id: "dgo-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDroneGsdOverlap,
});

// ============ spec-v1742: LiDAR point density and flight line spacing ============

// dims: in { pulse_rate_khz: T^-1, scan_angle_deg: dimensionless, flight_height_m: L, ground_speed_ms: L T^-1, side_overlap_pct: dimensionless, area_acres: L^2 } out: { swath_width_m: L, point_density_per_m2: dimensionless, line_spacing_m: L, half_speed_density: dimensionless, half_height_density: dimensionless, line_count: dimensionless }
export function computeLidarPointDensity({ pulse_rate_khz = 0, scan_angle_deg = 0, flight_height_m = 0, ground_speed_ms = 0, side_overlap_pct = 20, area_acres = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pulse_rate_khz > 0)) return { error: "Pulse rate must be positive (kHz)." };
  if (!(scan_angle_deg > 0 && scan_angle_deg < 180)) return { error: "The TOTAL scan angle must be between 0 and 180 degrees." };
  if (!(flight_height_m > 0)) return { error: "Flight height above ground must be positive (m)." };
  if (!(ground_speed_ms > 0)) return { error: "Ground speed must be positive (m/s)." };
  if (!(side_overlap_pct >= 0 && side_overlap_pct < 100)) return { error: "Side overlap must be at least 0 and below 100 percent." };
  if (area_acres < 0) return { error: "The area cannot be negative (acres)." };
  const M2_PER_ACRE = 4046.856;
  const DEG_TO_RAD_SV = Math.PI / 180;
  const pulses_per_s = pulse_rate_khz * 1000;
  const swathFor = (h) => 2 * h * Math.tan(scan_angle_deg / 2 * DEG_TO_RAD_SV);
  const swath_width_m = swathFor(flight_height_m);
  // Every pulse lands somewhere in the swath the aircraft sweeps out per
  // second, so the density is the pulse rate over that area.
  const densityFor = (h, v) => pulses_per_s / (swathFor(h) * v);
  const point_density_per_m2 = densityFor(flight_height_m, ground_speed_ms);
  const point_spacing_m = 1 / Math.sqrt(point_density_per_m2);
  const line_spacing_m = swath_width_m * (1 - side_overlap_pct / 100);
  // The two levers, and their costs. Speed is linear in both density and time;
  // height is linear in density and QUADRATIC in flight lines.
  const half_speed_density = densityFor(flight_height_m, ground_speed_ms / 2);
  const half_height_swath_m = swathFor(flight_height_m / 2);
  const half_height_density = densityFor(flight_height_m / 2, ground_speed_ms);
  const half_height_line_multiple = swath_width_m / half_height_swath_m;
  const area_m2 = area_acres > 0 ? area_acres * M2_PER_ACRE : null;
  const line_count = area_m2 === null ? null : Math.ceil(Math.sqrt(area_m2) / line_spacing_m);
  const outs = [swath_width_m, point_density_per_m2, point_spacing_m, line_spacing_m, half_speed_density, half_height_density];
  if (!outs.every(Number.isFinite)) return { error: "LiDAR density math is not a finite value." };
  return {
    pulse_rate_khz, pulses_per_s, scan_angle_deg, flight_height_m, ground_speed_ms,
    swath_width_m, point_density_per_m2, point_spacing_m, side_overlap_pct,
    line_spacing_m, half_speed_density, half_height_swath_m, half_height_density,
    half_height_line_multiple, area_acres, area_m2, line_count,
    note: "Point density is the pulse rate divided by the ground area the sensor sweeps per second, and that area is the swath width times the ground speed. The swath is twice the flight height times the tangent of half the scan angle, so ALL THREE FLIGHT PARAMETERS ENTER, and the two the pilot can change trade very differently. HALVING THE SPEED DOUBLES THE DENSITY AND DOUBLES THE FLIGHT TIME -- a linear trade, and often the cheap one. HALVING THE HEIGHT ALSO DOUBLES THE DENSITY, because the swath halves, but it doubles the number of flight lines needed to cover the same ground at the same time, so the total flight time doubles too AND the line count doubles with it. Altitude is the expensive lever, and knowing which one to pull before quoting a density is most of the planning. DENSITY IS SAMPLING AND IT IS NOT ACCURACY, which is the same distinction that governs photogrammetry. How many points land per square metre says nothing about where those points are: accuracy comes from the sensor's own ranging precision, from the inertial and satellite trajectory that positions every shot, and from the boresight calibration that relates the scanner to the navigation frame. A dense cloud from a poorly calibrated system is densely wrong, and the check is overlapping flight lines that should agree with each other. Multiple returns are the other thing a density figure hides. A pulse over vegetation can produce several returns, so the FIRST return density and the GROUND return density are very different numbers, and a specification written for one and delivered against the other is a common dispute. Ground density under canopy can be a small fraction of the nominal figure, and it is the ground density that a terrain model needs. Side overlap is the last term, and fifteen to thirty percent is normal, because the swath edges are where the scan geometry is worst -- the beam is most oblique, the footprint is most elongated, and the accuracy is lowest. Nominal density for a linear scanner at constant height and speed over level ground. It assumes uniform coverage across the swath, which an oscillating mirror does not give -- density is higher at the swath edges where the mirror slows and reverses -- and it does not model terrain relief, which changes the swath width continuously beneath the aircraft. It does not address atmospheric attenuation, the maximum range at a given reflectance, eye safety, or the pulse repetition limits that come with multiple pulses in air. The sensor manufacturer's specifications, the project's accuracy and density specification, and the surveyor of record govern.",
  };
}
const lidarPointDensityExample = { inputs: { pulse_rate_khz: 400, scan_angle_deg: 60, flight_height_m: 120, ground_speed_ms: 45, side_overlap_pct: 20, area_acres: 500 } };
SURVEY_RENDERERS["lidar-point-density"] = _simpleRenderer({
  citation: "Citation: the airborne LiDAR density relations by name -- swath width = 2 x flight height x tan(half the total scan angle); point density = pulse rate / (swath width x ground speed); line spacing = swath width x (1 - side overlap), with 15 to 30 percent overlap normal because the swath edges are where the scan geometry is worst. DENSITY IS SAMPLING, NOT ACCURACY: accuracy comes from the sensor, the trajectory and the boresight calibration. Nominal density for a linear scanner over level ground; an oscillating mirror gives higher density at the swath edges. The sensor manufacturer's specifications, the project's accuracy and density specification, and the surveyor of record govern.",
  example: lidarPointDensityExample.inputs,
  fields: [
    { key: "pulse_rate_khz", label: "Pulse rate (kHz)", kind: "number", default: 400 },
    { key: "scan_angle_deg", label: "Total scan angle (deg)", kind: "number", default: 60 },
    { key: "flight_height_m", label: "Flight height above ground (m)", kind: "number", default: 120 },
    { key: "ground_speed_ms", label: "Ground speed (m/s)", kind: "number", default: 45 },
    { key: "side_overlap_pct", label: "Side overlap (%)", kind: "number", default: 20 },
    { key: "area_acres", label: "Area to cover (acres, 0 to skip)", kind: "number", default: 500 },
  ],
  outputs: [
    { key: "s", id: "lpd-out-s", label: "Swath width", value: (r) => fmt(r.swath_width_m, 1) + " m at " + fmt(r.flight_height_m, 0) + " m and a " + fmt(r.scan_angle_deg, 0) + " degree scan" },
    { key: "d", id: "lpd-out-d", label: "Point density", value: (r) => fmt(r.point_density_per_m2, 1) + " points per sq m -- about " + fmt(r.point_spacing_m, 3) + " m between points" },
    { key: "l", id: "lpd-out-l", label: "Line spacing", value: (r) => fmt(r.line_spacing_m, 1) + " m at " + fmt(r.side_overlap_pct, 0) + "% side overlap" + (r.line_count === null ? "" : ", about " + fmt(r.line_count, 0) + " lines over " + fmt(r.area_acres, 0) + " acres") },
    { key: "v", id: "lpd-out-v", label: "Half the speed", value: (r) => fmt(r.half_speed_density, 1) + " points per sq m, and twice the flight time -- a linear trade" },
    { key: "h", id: "lpd-out-h", label: "Half the height", value: (r) => fmt(r.half_height_density, 1) + " points per sq m, but the swath falls to " + fmt(r.half_height_swath_m, 1) + " m so it takes " + fmt(r.half_height_line_multiple, 1) + "x the flight lines. Altitude is the expensive lever" },
    { key: "n", id: "lpd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLidarPointDensity,
});

// ============ spec-v1743: RTK baseline error budget ============

// dims: in { baseline_km: L, horizontal_fixed_mm: L, horizontal_ppm: dimensionless, vertical_fixed_mm: L, vertical_ppm: dimensionless, base_position_error_mm: L, occupations: dimensionless } out: { horizontal_error_mm: L, vertical_error_mm: L, vertical_ratio: dimensionless, total_horizontal_mm: L, total_vertical_mm: L, baseline_for_target_km: L }
export function computeRtkErrorBudget({ baseline_km = 0, horizontal_fixed_mm = 8, horizontal_ppm = 1, vertical_fixed_mm = 15, vertical_ppm = 1, base_position_error_mm = 0, target_vertical_mm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(baseline_km > 0)) return { error: "The baseline from the base to the rover must be positive (km)." };
  if (!(horizontal_fixed_mm > 0)) return { error: "The horizontal fixed component must be positive (mm)." };
  if (horizontal_ppm < 0) return { error: "The horizontal parts-per-million component cannot be negative." };
  if (!(vertical_fixed_mm > 0)) return { error: "The vertical fixed component must be positive (mm)." };
  if (vertical_ppm < 0) return { error: "The vertical parts-per-million component cannot be negative." };
  if (base_position_error_mm < 0) return { error: "The base position error cannot be negative (mm)." };
  if (target_vertical_mm < 0) return { error: "The target vertical uncertainty cannot be negative (mm)." };
  const MM_PER_KM = 1000000;
  const baseline_mm = baseline_km * MM_PER_KM;
  // The ppm term is a fraction of the baseline, and the fixed term is the
  // receiver's own floor. They add.
  const horizontal_ppm_mm = horizontal_ppm * baseline_km;
  const vertical_ppm_mm = vertical_ppm * baseline_km;
  const horizontal_error_mm = horizontal_fixed_mm + horizontal_ppm_mm;
  const vertical_error_mm = vertical_fixed_mm + vertical_ppm_mm;
  const vertical_ratio = horizontal_error_mm > 0 ? vertical_error_mm / horizontal_error_mm : null;
  // A base position error is NOT a precision term: it translates directly and
  // identically into every rover position of the session, so it ADDS rather
  // than combining in quadrature.
  const total_horizontal_mm = horizontal_error_mm + base_position_error_mm;
  const total_vertical_mm = vertical_error_mm + base_position_error_mm;
  const base_error_dominates = base_position_error_mm > horizontal_error_mm;
  const base_error_multiple = horizontal_error_mm > 0 ? base_position_error_mm / horizontal_error_mm : null;
  // The baseline at which the vertical reaches a target, which is what sets
  // how far a rover can work from one base.
  const baseline_for_target_km = (target_vertical_mm > vertical_fixed_mm && vertical_ppm > 0)
    ? (target_vertical_mm - vertical_fixed_mm) / vertical_ppm
    : null;
  const meets_target = target_vertical_mm > 0 ? vertical_error_mm <= target_vertical_mm : null;
  const outs = [horizontal_error_mm, vertical_error_mm, total_horizontal_mm, total_vertical_mm];
  if (!outs.every(Number.isFinite)) return { error: "RTK error budget math is not a finite value." };
  const base_verdict = base_position_error_mm === 0
    ? "No base position error entered. If the base was set on an autonomous position rather than a known control point, enter its error -- it is usually the largest term by far."
    : base_error_dominates
      ? "THE BASE DOMINATES: " + fmt(base_position_error_mm, 0) + " mm of base position error against " + fmt(horizontal_error_mm, 1) + " mm of receiver precision, " + fmt(base_error_multiple, 0) + " times larger. EVERY rover observation of the session inherits it exactly, and no amount of receiver quality or occupation time removes a systematic shift"
      : "Base position error of " + fmt(base_position_error_mm, 1) + " mm is smaller than the " + fmt(horizontal_error_mm, 1) + " mm receiver precision, but it still adds systematically to every observation rather than averaging out";
  const target_verdict = meets_target === null
    ? "Enter a target vertical uncertainty to find the working baseline."
    : meets_target
      ? "MEETS the " + fmt(target_vertical_mm, 1) + " mm vertical target at " + fmt(vertical_error_mm, 1) + " mm on this baseline"
      : "MISSES the " + fmt(target_vertical_mm, 1) + " mm vertical target at " + fmt(vertical_error_mm, 1) + " mm" + (baseline_for_target_km === null ? " -- and the fixed component alone exceeds it, so no baseline reaches it with this receiver" : ", which needs a baseline under " + fmt(baseline_for_target_km, 2) + " km");
  return {
    baseline_km, baseline_mm, horizontal_fixed_mm, horizontal_ppm, horizontal_ppm_mm,
    vertical_fixed_mm, vertical_ppm, vertical_ppm_mm, horizontal_error_mm,
    vertical_error_mm, vertical_ratio, base_position_error_mm, total_horizontal_mm,
    total_vertical_mm, base_error_dominates, base_error_multiple,
    target_vertical_mm, baseline_for_target_km, meets_target, base_verdict, target_verdict,
    note: "An RTK specification is written as a fixed component plus a parts-per-million term, and both halves matter for different reasons. The fixed part is the receiver's own floor and it does not improve with a shorter baseline; the ppm part grows with distance from the base, because the atmosphere the correction models diverges between the two receivers as they separate. Eight millimetres plus one ppm means eight millimetres at the base and eighteen at ten kilometres. THE VERTICAL IS ROUGHLY TWICE THE HORIZONTAL AND THE REASON IS GEOMETRIC RATHER THAN ELECTRONIC. Satellites are all above the receiver and none below it, so the intersection geometry that fixes a horizontal position from many directions has only one side to work with in the vertical. That ratio holds at every baseline and with every receiver, and it means a job whose result depends on elevation should know before it relies on RTK heights. THE FAILURE THAT DWARFS BOTH IS THE BASE POSITION, and it is not a precision problem at all. If the base was set on an autonomous position rather than on a known control point, its coordinate can be off by a metre or more -- and every rover observation of that session inherits that error EXACTLY. It is systematic, not random: it does not average out over occupations, it does not shrink with a better receiver, and it does not show up in the internal quality figures the data collector displays, which describe the vector from the base and not the base itself. This adds it directly rather than combining it in quadrature for that reason. A float solution is not survey grade. Only a fixed integer solution carries the precision a specification quotes, and a data collector that reports float has not resolved the carrier ambiguities -- the coordinates it stores look identical to fixed ones in the file. And the check that costs two minutes: occupy a known point at the start and at the end of every session. It catches a wrong base coordinate, a wrong antenna height, a wrong datum, and a solution that drifted, and none of those is visible any other way. Antenna height is worth naming on its own, because a mis-measured or mis-typed antenna height is a pure vertical blunder of exactly that size on every point of the session. A precision budget, not an accuracy statement. It does not address multipath, which is site-dependent and can exceed everything here; satellite geometry and its dilution of precision, which varies through the day; ionospheric activity, which degrades long baselines badly during solar maxima; the network RTK case, where the correction is interpolated and the baseline concept differs; or datum and geoid model errors, which are systematic and often larger than any of it. Geoid models convert ellipsoid heights to orthometric ones and carry their own uncertainty, which this does not include. The receiver manufacturer's specification, the project's accuracy requirements, the control network, and the surveyor of record govern.",
  };
}
const rtkErrorBudgetExample = { inputs: { baseline_km: 10, horizontal_fixed_mm: 8, horizontal_ppm: 1, vertical_fixed_mm: 15, vertical_ppm: 1, base_position_error_mm: 1500, target_vertical_mm: 30 } };
SURVEY_RENDERERS["rtk-error-budget"] = _simpleRenderer({
  citation: "Citation: the RTK error budget convention by name -- a fixed component plus a parts-per-million term scaled by the baseline, with the vertical roughly twice the horizontal because satellites are all above the receiver and none below. A BASE POSITION ERROR IS SYSTEMATIC and is added directly rather than in quadrature: every rover observation of the session inherits it exactly, and it does not average out or shrink with a better receiver. A precision budget, not an accuracy statement: multipath, dilution of precision, ionospheric activity, and geoid model uncertainty are not included. The receiver manufacturer's specification, the project's accuracy requirements, the control network, and the surveyor of record govern.",
  example: rtkErrorBudgetExample.inputs,
  fields: [
    { key: "baseline_km", label: "Baseline, base to rover (km)", kind: "number", default: 10 },
    { key: "horizontal_fixed_mm", label: "Horizontal fixed component (mm)", kind: "number", default: 8 },
    { key: "horizontal_ppm", label: "Horizontal ppm component", kind: "number", default: 1 },
    { key: "vertical_fixed_mm", label: "Vertical fixed component (mm)", kind: "number", default: 15 },
    { key: "vertical_ppm", label: "Vertical ppm component", kind: "number", default: 1 },
    { key: "base_position_error_mm", label: "Base position error (mm, 0 if on known control)", kind: "number", default: 1500 },
    { key: "target_vertical_mm", label: "Target vertical uncertainty (mm, 0 to skip)", kind: "number", default: 30 },
  ],
  outputs: [
    { key: "h", id: "reb-out-h", label: "Horizontal precision", value: (r) => fmt(r.horizontal_error_mm, 1) + " mm -- " + fmt(r.horizontal_fixed_mm, 1) + " fixed plus " + fmt(r.horizontal_ppm_mm, 1) + " over " + fmt(r.baseline_km, 2) + " km" },
    { key: "v", id: "reb-out-v", label: "Vertical precision", value: (r) => fmt(r.vertical_error_mm, 1) + " mm -- " + fmt(r.vertical_ratio, 2) + " times the horizontal, and that ratio holds at every baseline because there are no satellites below the receiver" },
    { key: "b", id: "reb-out-b", label: "The base", value: (r) => r.base_verdict },
    { key: "t", id: "reb-out-t", label: "With the base error included", value: (r) => fmt(r.total_horizontal_mm, 1) + " mm horizontal and " + fmt(r.total_vertical_mm, 1) + " mm vertical, added directly because a base shift is systematic rather than random" },
    { key: "g", id: "reb-out-g", label: "Against the target", value: (r) => r.target_verdict },
    { key: "n", id: "reb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRtkErrorBudget,
});

// ============ spec-v1744: mass haul balance, free haul, and overhaul ============

// dims: in { cut_volume_cy: L^3, shrinkage_factor: dimensionless, fill_required_cy: L^3, free_haul_ft: L, overhaul_volume_cy: L^3, average_overhaul_distance_ft: L, overhaul_rate_per_station_yard: dimensionless, borrow_haul_ft: L } out: { compacted_from_cut_cy: L^3, balance_cy: L^3, overhaul_station_yards: dimensionless, overhaul_cost: dimensionless, borrow_station_yards: dimensionless, free_haul_stations: dimensionless }
export function computeMassHaulOverhaul({ cut_volume_cy = 0, shrinkage_factor = 0.9, fill_required_cy = 0, free_haul_ft = 0, overhaul_volume_cy = 0, average_overhaul_distance_ft = 0, overhaul_rate_per_station_yard = 0, borrow_haul_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cut_volume_cy > 0)) return { error: "Cut volume must be positive (cubic yards)." };
  if (!(shrinkage_factor > 0 && shrinkage_factor <= 2)) return { error: "The shrinkage factor must be greater than zero and no more than two -- below one for material that compacts, above one for rock that swells." };
  if (!(fill_required_cy > 0)) return { error: "Fill required must be positive (cubic yards)." };
  if (free_haul_ft < 0) return { error: "The free haul distance cannot be negative (ft)." };
  if (overhaul_volume_cy < 0) return { error: "The overhaul volume cannot be negative (cubic yards)." };
  if (average_overhaul_distance_ft < 0) return { error: "The average overhaul distance cannot be negative (ft)." };
  if (overhaul_rate_per_station_yard < 0) return { error: "The overhaul rate cannot be negative." };
  if (borrow_haul_ft < 0) return { error: "The borrow haul distance cannot be negative (ft)." };
  const FT_PER_STATION = 100;
  // Cut is measured in place and fill is measured compacted, so the cut has to
  // be corrected before the two can be compared at all.
  const compacted_from_cut_cy = cut_volume_cy * shrinkage_factor;
  const balance_cy = compacted_from_cut_cy - fill_required_cy;
  const balanced = Math.abs(balance_cy) < 1e-9;
  const surplus = balance_cy > 0;
  const borrow_needed_cy = balance_cy < 0 ? -balance_cy : 0;
  const waste_cy = balance_cy > 0 ? balance_cy : 0;
  const cut_needed_for_fill_cy = fill_required_cy / shrinkage_factor;
  // Overhaul is a volume-distance product beyond the free haul, priced in
  // station-yards: one cubic yard moved one hundred feet past free haul.
  const beyond_free_haul_ft = Math.max(0, average_overhaul_distance_ft - free_haul_ft);
  const overhaul_station_yards = overhaul_volume_cy * beyond_free_haul_ft / FT_PER_STATION;
  const overhaul_cost = overhaul_rate_per_station_yard > 0 ? overhaul_station_yards * overhaul_rate_per_station_yard : null;
  const free_haul_stations = free_haul_ft / FT_PER_STATION;
  // The comparison that decides borrow against overhaul: hauling material from
  // a borrow pit is itself a haul, and the shorter one wins.
  const borrow_station_yards = (borrow_haul_ft > 0 && overhaul_volume_cy > 0)
    ? overhaul_volume_cy * Math.max(0, borrow_haul_ft - free_haul_ft) / FT_PER_STATION
    : null;
  const borrow_cheaper = borrow_station_yards === null ? null : borrow_station_yards < overhaul_station_yards;
  const outs = [compacted_from_cut_cy, balance_cy, overhaul_station_yards, free_haul_stations, cut_needed_for_fill_cy];
  if (!outs.every(Number.isFinite)) return { error: "Mass haul math is not a finite value." };
  const balance_verdict = balanced
    ? "BALANCED: " + fmt(cut_volume_cy, 0) + " cy of cut at a " + fmt(shrinkage_factor, 3) + " factor makes exactly the " + fmt(fill_required_cy, 0) + " cy of compacted fill required"
    : surplus
      ? "SURPLUS of " + fmt(waste_cy, 0) + " cy: " + fmt(cut_volume_cy, 0) + " cy of cut yields " + fmt(compacted_from_cut_cy, 0) + " cy compacted against " + fmt(fill_required_cy, 0) + " cy needed, so that much is wasted or exported"
      : "DEFICIT of " + fmt(borrow_needed_cy, 0) + " cy: " + fmt(cut_volume_cy, 0) + " cy of cut yields only " + fmt(compacted_from_cut_cy, 0) + " cy compacted against " + fmt(fill_required_cy, 0) + " cy needed, so that much must be borrowed. It would take " + fmt(cut_needed_for_fill_cy, 0) + " cy of cut in place to make the fill";
  const haul_verdict = borrow_cheaper === null
    ? "Enter a borrow haul distance to compare importing against hauling the length of the job."
    : borrow_cheaper
      ? "BORROW IS CHEAPER on distance alone: " + fmt(borrow_station_yards, 0) + " station-yards against " + fmt(overhaul_station_yards, 0) + " to haul it along the alignment -- before the cost of the material itself and of wasting what it displaces"
      : "HAULING ALONG THE JOB IS SHORTER: " + fmt(overhaul_station_yards, 0) + " station-yards against " + fmt(borrow_station_yards, 0) + " from the borrow pit";
  return {
    cut_volume_cy, shrinkage_factor, compacted_from_cut_cy, fill_required_cy,
    balance_cy, balanced, surplus, borrow_needed_cy, waste_cy, cut_needed_for_fill_cy,
    free_haul_ft, free_haul_stations, overhaul_volume_cy, average_overhaul_distance_ft,
    beyond_free_haul_ft, overhaul_station_yards, overhaul_rate_per_station_yard,
    overhaul_cost, borrow_haul_ft, borrow_station_yards, borrow_cheaper,
    balance_verdict, haul_verdict,
    note: "A mass haul diagram is the cumulative algebraic sum of cut and fill along an alignment, and everything useful about it comes from two properties of that curve. WHERE IT CROSSES THE BASE LINE, CUT EQUALS FILL between the crossings -- those are the balance points, and the earth between them moves within itself. Where the curve rises, material moves forward along the alignment; where it falls, backward. A persistent surplus or deficit shows as a curve that never returns, and that is where importing or exporting beats hauling. THE SHRINKAGE CORRECTION COMES FIRST AND IT IS NOT OPTIONAL. Cut is measured in place and fill is measured compacted, and the two are different states of the same dirt: most soils lose volume between them, so a cut yields less compacted fill than its in-place measurement, while rock swells and yields more. Accumulating a mass ordinate from uncorrected volumes produces balance points in the wrong places and a haul plan built on them. FREE HAUL AND OVERHAUL ARE A PAYMENT CONVENTION rather than a physical distinction. The free haul distance is the movement included in the excavation price, drawn as a horizontal chord across the curve; the volume above that chord is the material that travels further, and it is paid separately as overhaul in STATION-YARDS -- one cubic yard moved one hundred feet beyond free haul. That unit is why the arithmetic matters: overhaul is a product of volume AND distance, so a modest volume moved a long way can cost more than a large volume moved a short one, and the diagram is what shows which is happening. And the decision the diagram exists to inform is borrow against haul. Bringing material from a pit is itself a haul, so the comparison is between the station-yards of hauling along the job and the station-yards from the pit, plus the cost of the material and of wasting whatever it displaces. On a long alignment with a deficit at one end, borrowing locally routinely beats dragging fill the length of the project. A balance check and an overhaul quantity from figures the reader supplies. IT DOES NOT BUILD THE MASS HAUL DIAGRAM: that takes the cut and fill volume at every station along the alignment, and the balance points, the free haul chord and the overhaul volume are read off the completed curve. The overhaul volume and its average distance are entered here rather than derived for that reason. It does not address haul road condition, grades, or equipment cycle times, which decide the actual cost of moving a yard; the sequencing and phasing of the work; the suitability of cut material for fill, which is a geotechnical question and frequently the real constraint; moisture conditioning; or environmental limits on borrow and waste sites. Shrinkage factors vary by material and by the compaction specified and should come from the geotechnical report rather than from a rule of thumb. The project's earthwork quantities, the geotechnical report, the contract's measurement and payment provisions, and the engineer of record govern.",
  };
}
const massHaulOverhaulExample = { inputs: { cut_volume_cy: 12000, shrinkage_factor: 0.9, fill_required_cy: 10800, free_haul_ft: 1000, overhaul_volume_cy: 4200, average_overhaul_distance_ft: 2600, overhaul_rate_per_station_yard: 0.85, borrow_haul_ft: 1800 } };
SURVEY_RENDERERS["mass-haul-overhaul"] = _simpleRenderer({
  citation: "Citation: the mass haul conventions by name -- cut corrected by its shrinkage factor before it is compared with compacted fill; balance points where the mass ordinate crosses the base line; free haul as a horizontal chord of that length; and overhaul as the volume beyond it times its distance past free haul, in STATION-YARDS (one cubic yard moved 100 ft). IT DOES NOT BUILD THE DIAGRAM: the overhaul volume and its average distance are read off a completed curve and entered here. Shrinkage factors vary by material and compaction and come from the geotechnical report. The project's earthwork quantities, the geotechnical report, the contract's measurement and payment provisions, and the engineer of record govern.",
  example: massHaulOverhaulExample.inputs,
  fields: [
    { key: "cut_volume_cy", label: "Cut volume, measured in place (cy)", kind: "number", default: 12000 },
    { key: "shrinkage_factor", label: "Shrinkage factor (below 1 compacts, above 1 swells)", kind: "number", default: 0.9 },
    { key: "fill_required_cy", label: "Compacted fill required (cy)", kind: "number", default: 10800 },
    { key: "free_haul_ft", label: "Free haul distance (ft)", kind: "number", default: 1000 },
    { key: "overhaul_volume_cy", label: "Volume beyond free haul, off the diagram (cy)", kind: "number", default: 4200 },
    { key: "average_overhaul_distance_ft", label: "Average haul distance for that volume (ft)", kind: "number", default: 2600 },
    { key: "overhaul_rate_per_station_yard", label: "Overhaul rate per station-yard (0 to skip)", kind: "number", default: 0.85 },
    { key: "borrow_haul_ft", label: "Haul distance from a borrow pit (ft, 0 to skip)", kind: "number", default: 1800 },
  ],
  outputs: [
    { key: "c", id: "mho-out-c", label: "Cut corrected to compacted", value: (r) => fmt(r.cut_volume_cy, 0) + " cy in place at " + fmt(r.shrinkage_factor, 3) + " makes " + fmt(r.compacted_from_cut_cy, 0) + " cy of fill" },
    { key: "b", id: "mho-out-b", label: "Balance", value: (r) => r.balance_verdict },
    { key: "o", id: "mho-out-o", label: "Overhaul", value: (r) => fmt(r.overhaul_station_yards, 0) + " station-yards -- " + fmt(r.overhaul_volume_cy, 0) + " cy carried " + fmt(r.beyond_free_haul_ft, 0) + " ft past a " + fmt(r.free_haul_ft, 0) + " ft (" + fmt(r.free_haul_stations, 1) + " station) free haul" },
    { key: "p", id: "mho-out-p", label: "Overhaul cost", value: (r) => r.overhaul_cost === null ? "(no rate entered)" : fmt(r.overhaul_cost, 2) + " at " + fmt(r.overhaul_rate_per_station_yard, 3) + " per station-yard" },
    { key: "h", id: "mho-out-h", label: "Borrow against haul", value: (r) => r.haul_verdict },
    { key: "n", id: "mho-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMassHaulOverhaul,
});
