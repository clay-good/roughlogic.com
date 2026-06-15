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
