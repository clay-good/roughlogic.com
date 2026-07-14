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
  DEBOUNCE_MS, debounce, makeNumber, makeTextarea,
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
// dims: in { points: dimensionless } out: { area_ft2: L^2, area_acres: dimensionless, area_m2: L^2, perimeter_ft: L, distinct_points: dimensionless }
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
export const traverseClosureExample = { inputs: { courses: [{ azimuth_deg: 0, distance: 100 }, { azimuth_deg: 90, distance: 200 }, { azimuth_deg: 180, distance: 100 }, { azimuth_deg: 270, distance: 200 }], n0: 0, e0: 0 } };

function renderTraverseClosure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Latitude/departure traverse and compass-rule (Bowditch) adjustment per FM 5-233 Construction Surveying (public-domain US Government work) and standard surveying references. The recorded plat and surveyor of record govern; this is a field estimate.";
  const DEFAULT = "0,100\n90,200\n180,100\n270,200";
  const courses = makeTextarea("Courses, one per line as azimuth_deg,distance (>= 2)", "tc-courses", { rows: "4" });
  courses.input.value = DEFAULT;
  const n0 = makeNumber("Start N", "tc-n0", { step: "any", value: "0" }); n0.input.value = "0";
  const e0 = makeNumber("Start E", "tc-e0", { step: "any", value: "0" }); e0.input.value = "0";
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
  const bm = makeNumber("Benchmark elevation (ft)", "dl-bm", { step: "any" }); bm.input.value = "100.00";
  const bs = makeTextarea("Backsights, one per line (ft)", "dl-bs", { rows: "3" }); bs.input.value = "4.32\n5.60";
  const fs = makeTextarea("Foresights, one per line (ft)", "dl-fs", { rows: "3" }); fs.input.value = "2.15\n3.40";
  const kc = makeNumber("Known closing elevation (ft, optional)", "dl-kc", { step: "any" }); kc.input.value = "104.40";
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
  const kc = makeNumber("Known closing elevation (ft)", "lla-kc", { step: "any" }); kc.input.value = "100.00";
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
  const t = makeNumber("Field temperature (degF)", "tap-t", { step: "any" }); t.input.value = "68";
  const t0 = makeNumber("Standardization temperature (degF)", "tap-t0", { step: "any" }); t0.input.value = "68";
  const h = makeNumber("Elevation difference over span (ft, optional)", "tap-h", { step: "any" });
  const p = makeNumber("Applied pull P (lb, optional)", "tap-p", { step: "any" });
  const p0 = makeNumber("Standardization pull P0 (lb, optional)", "tap-p0", { step: "any" });
  const a = makeNumber("Tape cross-section A (in^2, optional)", "tap-a", { step: "any", min: "0" });
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
  citationEl.textContent = "Citation: coordinate geometry forward locate - latitude (delta N) = D cos(Az), departure (delta E) = D sin(Az), with the azimuth measured clockwise from north; N2 = N1 + delta N, E2 = E1 + delta E. First-principles latitude/departure per the standard route-surveying references (Ghilani & Wolf; FM 5-233), by name. For a quadrant bearing (N45E) convert to azimuth first (the bearing-conversion tile handles the quadrant / declination). A computational aid; the project control and datum govern.";
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
