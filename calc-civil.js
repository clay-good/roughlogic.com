// Group E: site-civil / roadway geometry bench (spec-v25).
//
// spec-v80 cap-relief split: the cohesive spec-v25 civil-engineering quartet
// (horizontal-curve, vertical-curve, earthwork-end-area, slope-stake-cut-fill)
// was extracted verbatim from calc-construction.js (which sat at 95.0% of its
// size cap, the tightest remaining calculator module) into this module. The
// four share a theme distinct from the building-construction core (framing,
// concrete, rebar, beams): roadway and site-grading geometry -- the horizontal
// (circular) and vertical (parabolic) alignment curves, average-end-area
// earthwork volume between stations, and slope-stake cut/fill with the catch
// offset. Each KEEPS group "E" -- a tile's group letter is independent of the
// module that holds it (the v28/v30/v36/v39/v42/v70..v79 precedent). Their ids,
// citations, worked examples, dimensional annotations, and behavior are
// byte-for-byte unchanged. The four compute functions use the per-module
// _finiteGuard, which is copied verbatim below (non-exported, so it adds no v14
// derivation-corpus row), exactly as the v72/v73/v76/v77/v78 benches did. Lazy-
// loaded on first open of one of its tiles, so it is not in the home-view
// first-paint payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
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

export const CIVIL_RENDERERS = {};

// --- v25 E.x: Horizontal (circular) curve geometry (`horizontal-curve`) ---
// Arc-definition circular curve. R = 5729.58 / D when entered by degree of
// curve. With deflection angle delta: T = R*tan(d/2), L = R*delta_rad,
// E = R*(sec(d/2)-1), M = R*(1-cos(d/2)), LC = 2R*sin(d/2). Optional PI station
// places PC = PI - T and PT = PC + L.
// dims: in { radius_ft: L, degree_of_curve: dimensionless, delta_deg: dimensionless, pi_station_ft: L } out: { tangent_ft: L, curve_length_ft: L, external_ft: L, middle_ordinate_ft: L, long_chord_ft: L, degree_of_curve: dimensionless, pc_station_ft: L, pt_station_ft: L }
export function computeHorizontalCurve({ mode, radius_ft, degree_of_curve, delta_deg, pi_station_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const delta = Number(delta_deg) || 0;
  if (!(delta > 0 && delta < 180)) return { error: "Deflection angle must be between 0 and 180 deg (exclusive)." };
  let R;
  if (mode === "degree") {
    const D = Number(degree_of_curve) || 0;
    if (!(D > 0)) return { error: "Degree of curve must be greater than zero." };
    R = 5729.58 / D;
  } else {
    R = Number(radius_ft) || 0;
    if (!(R > 0)) return { error: "Radius must be greater than zero." };
  }
  if (!(R > 0) || !Number.isFinite(R)) return { error: "Radius is not valid." };
  const deltaRad = (delta * Math.PI) / 180;
  const half = deltaRad / 2;
  const cosHalf = Math.cos(half);
  if (!(Math.abs(cosHalf) > 1e-12)) return { error: "Curve geometry is not defined for this deflection angle." };
  const T = R * Math.tan(half);
  const L = R * deltaRad;
  const E = R * (1 / cosHalf - 1);
  const M = R * (1 - cosHalf);
  const LC = 2 * R * Math.sin(half);
  const D = 5729.58 / R;
  let pc = null, pt = null;
  if (pi_station_ft != null && pi_station_ft !== "") {
    const pi = Number(pi_station_ft);
    if (Number.isFinite(pi)) { pc = pi - T; pt = pc + L; }
  }
  return {
    radius_ft: Number.isFinite(R) ? R : null,
    tangent_ft: Number.isFinite(T) ? T : null,
    curve_length_ft: Number.isFinite(L) ? L : null,
    external_ft: Number.isFinite(E) ? E : null,
    middle_ordinate_ft: Number.isFinite(M) ? M : null,
    long_chord_ft: Number.isFinite(LC) ? LC : null,
    degree_of_curve: Number.isFinite(D) ? D : null,
    pc_station_ft: pc != null && Number.isFinite(pc) ? pc : null,
    pt_station_ft: pt != null && Number.isFinite(pt) ? pt : null,
    note: "Arc definition (D = 5729.58 / R). Simple circular curve only; no spiral/superelevation transition. Stations are along the curve.",
  };
}
export const horizontalCurveExample = { inputs: { mode: "radius", radius_ft: 1000, delta_deg: 30, pi_station_ft: 5000 } };

function renderHorizontalCurve(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Circular-curve geometry per AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book) and FM 5-233 Construction Surveying, using first-principles trigonometry with the arc definition D = 5729.58 / R. The design of record and engineer of record govern.";
  const mode = makeSelect("Definition mode", "hc-mode", [
    { value: "radius", label: "By radius (ft)" }, { value: "degree", label: "By degree of curve" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const rad = makeNumber("Radius R (ft)", "hc-r", { step: "any", min: "0", value: "1000" });
  rad.input.value = "1000";
  const deg = makeNumber("Degree of curve D", "hc-d", { step: "any", min: "0" });
  const delta = makeNumber("Deflection angle delta (deg)", "hc-delta", { step: "any", min: "0", value: "30" });
  delta.input.value = "30";
  const pi = makeNumber("PI station (ft, optional)", "hc-pi", { step: "any", value: "5000" });
  pi.input.value = "5000";
  for (const f of [rad, deg, delta, pi]) inputRegion.appendChild(f.wrap);
  const oT = makeOutputLine(outputRegion, "Tangent T", "hc-out-t");
  const oL = makeOutputLine(outputRegion, "Curve length L", "hc-out-l");
  const oC = makeOutputLine(outputRegion, "Long chord / external / mid-ord", "hc-out-c");
  const oD = makeOutputLine(outputRegion, "Degree of curve", "hc-out-d");
  const oS = makeOutputLine(outputRegion, "PC / PT station", "hc-out-s");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() {
    const isDeg = mode.select.value === "degree";
    rad.wrap.style.display = isDeg ? "none" : "";
    deg.wrap.style.display = isDeg ? "" : "none";
  }
  const update = debounce(() => {
    const r = computeHorizontalCurve({
      mode: mode.select.value,
      radius_ft: readNum(rad.input),
      degree_of_curve: readNum(deg.input),
      delta_deg: readNum(delta.input),
      pi_station_ft: pi.input.value === "" ? null : readNum(pi.input),
    });
    if (r.error) { oT.textContent = r.error; oL.textContent = ""; oC.textContent = ""; oD.textContent = ""; oS.textContent = ""; return; }
    oT.textContent = fmt(r.tangent_ft, 2) + " ft (R = " + fmt(r.radius_ft, 2) + " ft)";
    oL.textContent = fmt(r.curve_length_ft, 2) + " ft";
    oC.textContent = "LC " + fmt(r.long_chord_ft, 2) + " ft / E " + fmt(r.external_ft, 2) + " ft / M " + fmt(r.middle_ordinate_ft, 2) + " ft";
    oD.textContent = fmt(r.degree_of_curve, 4) + " deg";
    oS.textContent = r.pc_station_ft == null ? "(enter PI station for PC/PT)" : "PC " + fmt(r.pc_station_ft, 2) + " ft / PT " + fmt(r.pt_station_ft, 2) + " ft";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "radius"; syncFields(); rad.input.value = "1000"; deg.input.value = ""; delta.input.value = "30"; pi.input.value = "5000"; update(); });
  mode.select.addEventListener("input", () => { syncFields(); update(); });
  for (const f of [rad.input, deg.input, delta.input, pi.input]) f.addEventListener("input", update);
  syncFields();
}
CIVIL_RENDERERS["horizontal-curve"] = renderHorizontalCurve;

// ===================== spec-v1221: spiral (transition) curve =====================
// The horizontal-alignment family has the simple circular curve (horizontal-curve), its deflection
// stakeout, the vertical curves, and superelevation -- but not the SPIRAL/transition (clothoid) curve
// that superelevation is actually run in over. This adds it. Standard route-surveying geometry:
// spiral angle theta_s = Ls/(2R); throw p = Ls^2/(24R); k = Ls/2 - Ls^3/(240 R^2);
// total tangent Ts = (R+p) tan(delta/2) + k; external Es = (R+p)/cos(delta/2) - R; SC deflection = theta_s/3.
// dims: in { radius_ft: L, spiral_length_ft: L, delta_deg: dimensionless } out: { theta_s_deg: dimensionless, throw_p_ft: L, k_ft: L, total_tangent_ft: L, external_ft: L, sc_deflection_deg: dimensionless, circular_central_deg: dimensionless, total_length_ft: L }
export function computeSpiralCurve({ radius_ft = 0, spiral_length_ft = 0, delta_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = Number(radius_ft) || 0;
  const Ls = Number(spiral_length_ft) || 0;
  const delta = Number(delta_deg) || 0;
  if (!(R > 0)) return { error: "Radius R (at the SC) must be positive (ft)." };
  if (!(Ls > 0)) return { error: "Spiral length Ls must be positive (ft)." };
  if (!(delta > 0 && delta < 180)) return { error: "Total deflection angle must be between 0 and 180 deg (exclusive)." };
  const theta_s_rad = Ls / (2 * R);
  const theta_s_deg = theta_s_rad * 180 / Math.PI;
  const deltaRad = delta * Math.PI / 180;
  const circular_central_rad = deltaRad - 2 * theta_s_rad;
  if (!(circular_central_rad >= 0)) return { error: "The spiral is too long for this curve: two spirals consume more than the total deflection (2 x theta_s > delta). Shorten Ls, sharpen the radius, or use a spiral-to-spiral curve." };
  const throw_p_ft = Ls * Ls / (24 * R);
  const k_ft = Ls / 2 - Ls * Ls * Ls / (240 * R * R);
  const half = deltaRad / 2;
  const total_tangent_ft = (R + throw_p_ft) * Math.tan(half) + k_ft;
  const external_ft = (R + throw_p_ft) / Math.cos(half) - R;
  const sc_deflection_deg = theta_s_deg / 3;
  const circular_central_deg = circular_central_rad * 180 / Math.PI;
  const total_length_ft = 2 * Ls + R * circular_central_rad;
  if (![theta_s_deg, throw_p_ft, k_ft, total_tangent_ft, external_ft, sc_deflection_deg, circular_central_deg, total_length_ft].every(Number.isFinite)) {
    return { error: "Spiral-curve math is not a finite value." };
  }
  return {
    theta_s_deg, throw_p_ft, k_ft, total_tangent_ft, external_ft, sc_deflection_deg, circular_central_deg, total_length_ft,
    note: "The spiral (transition/clothoid) curve, the alignment element the simple circular-curve tile leaves out and the one superelevation is run in over: a curve whose radius eases from infinity at the tangent (TS) down to the circular radius R at the spiral-to-curve point (SC), so a vehicle's steering and the roadway's banking change gradually instead of instantly. The spiral angle theta_s = Ls/(2R) is the deflection the spiral turns through; the circular arc between the two spirals then turns the remaining delta - 2 theta_s. The circular curve is shifted inward from the tangent by the throw p = Ls^2/(24R), and the tangent distance from the PI to the TS is Ts = (R + p) tan(delta/2) + k with k = Ls/2 - Ls^3/(240 R^2); the external distance is Es = (R + p)/cos(delta/2) - R. From the TS, the SC is staked by a deflection angle of about theta_s/3. A 1,000 ft curve with a 250 ft spiral on a 20-degree total deflection: theta_s 7.16 deg, throw 2.60 ft, Ts 301.7 ft, Es 18.1 ft, a 5.68-degree circular arc, and 599 ft of total curve. Symmetric equal spirals at both ends and the approximate (series) throw and k, which are standard for highway spirals where Ls is small next to R; a railroad or a very sharp spiral may want the exact clothoid. The spiral length Ls itself comes from a superelevation runoff or comfort criterion (a separate design step). A design aid; AASHTO and the engineer of record govern.",
  };
}
export const spiralCurveExample = { inputs: { radius_ft: 1000, spiral_length_ft: 250, delta_deg: 20 } };
function renderSpiralCurve(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: spiral (transition/clothoid) curve geometry per AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book) and Ghilani & Wolf, Elementary Surveying: theta_s = Ls/(2R), throw p = Ls^2/(24R), k = Ls/2 - Ls^3/(240 R^2), Ts = (R+p) tan(delta/2) + k, Es = (R+p)/cos(delta/2) - R, SC deflection = theta_s/3. Symmetric spirals, series approximation. The design of record and engineer of record govern.";
  const rad = makeNumber("Radius R at the SC (ft)", "sc-r", { step: "any", min: "0" });
  const ls = makeNumber("Spiral length Ls (ft)", "sc-ls", { step: "any", min: "0" });
  const delta = makeNumber("Total deflection angle delta (deg)", "sc-delta", { step: "any", min: "0" });
  for (const f of [rad, ls, delta]) inputRegion.appendChild(f.wrap);
  const oTheta = makeOutputLine(outputRegion, "Spiral angle theta_s / SC deflection", "sc-out-theta");
  const oPK = makeOutputLine(outputRegion, "Throw p / k", "sc-out-pk");
  const oTs = makeOutputLine(outputRegion, "Total tangent Ts / external Es", "sc-out-ts");
  const oLen = makeOutputLine(outputRegion, "Circular central angle / total length", "sc-out-len");
  const oNote = makeOutputLine(outputRegion, "Note", "sc-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSpiralCurve({ radius_ft: readNum(rad.input), spiral_length_ft: readNum(ls.input), delta_deg: readNum(delta.input) });
    if (r.error) { oTheta.textContent = r.error; oPK.textContent = "-"; oTs.textContent = "-"; oLen.textContent = "-"; oNote.textContent = ""; return; }
    oTheta.textContent = fmt(r.theta_s_deg, 3) + " deg / " + fmt(r.sc_deflection_deg, 3) + " deg";
    oPK.textContent = fmt(r.throw_p_ft, 3) + " ft / " + fmt(r.k_ft, 3) + " ft";
    oTs.textContent = fmt(r.total_tangent_ft, 2) + " ft / " + fmt(r.external_ft, 2) + " ft";
    oLen.textContent = fmt(r.circular_central_deg, 3) + " deg / " + fmt(r.total_length_ft, 2) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { rad.input.value = "1000"; ls.input.value = "250"; delta.input.value = "20"; update(); });
  for (const f of [rad.input, ls.input, delta.input]) f.addEventListener("input", update);
}
CIVIL_RENDERERS["spiral-curve"] = renderSpiralCurve;

// ===================== spec-v1222: compound circular curve =====================
// Completes the horizontal-alignment family: simple circular (horizontal-curve) and spiral (spiral-curve)
// exist; the compound curve -- two circular arcs of different radii turning the same way, sharing a point
// of compound curvature (PCC) -- is the standard geometry at interchange ramps and intersection returns.
// Each arc: T = R tan(delta/2), L = R delta_rad. The tangent distances from the PI come from the law of
// sines on the vertex triangle: back tangent t1 = T1 + (T1+T2) sin(delta2)/sin(delta), forward tangent
// t2 = T2 + (T1+T2) sin(delta1)/sin(delta), delta = delta1 + delta2.
// dims: in { r1_ft: L, r2_ft: L, delta1_deg: dimensionless, delta2_deg: dimensionless } out: { arc1_tangent_ft: L, arc2_tangent_ft: L, back_tangent_ft: L, forward_tangent_ft: L, arc1_length_ft: L, arc2_length_ft: L, total_length_ft: L, total_delta_deg: dimensionless }
export function computeCompoundCurve({ r1_ft = 0, r2_ft = 0, delta1_deg = 0, delta2_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R1 = Number(r1_ft) || 0;
  const R2 = Number(r2_ft) || 0;
  const d1 = Number(delta1_deg) || 0;
  const d2 = Number(delta2_deg) || 0;
  if (!(R1 > 0)) return { error: "The first radius R1 must be positive (ft)." };
  if (!(R2 > 0)) return { error: "The second radius R2 must be positive (ft)." };
  if (!(d1 > 0)) return { error: "The first central angle delta1 must be positive (deg)." };
  if (!(d2 > 0)) return { error: "The second central angle delta2 must be positive (deg)." };
  const total = d1 + d2;
  if (!(total < 180)) return { error: "The total deflection (delta1 + delta2) must be less than 180 deg." };
  const rad = Math.PI / 180;
  const arc1_tangent_ft = R1 * Math.tan(d1 * rad / 2);
  const arc2_tangent_ft = R2 * Math.tan(d2 * rad / 2);
  const sumT = arc1_tangent_ft + arc2_tangent_ft;
  const sinTotal = Math.sin(total * rad);
  const back_tangent_ft = arc1_tangent_ft + sumT * Math.sin(d2 * rad) / sinTotal;
  const forward_tangent_ft = arc2_tangent_ft + sumT * Math.sin(d1 * rad) / sinTotal;
  const arc1_length_ft = R1 * d1 * rad;
  const arc2_length_ft = R2 * d2 * rad;
  const total_length_ft = arc1_length_ft + arc2_length_ft;
  if (![arc1_tangent_ft, arc2_tangent_ft, back_tangent_ft, forward_tangent_ft, arc1_length_ft, arc2_length_ft].every(Number.isFinite)) {
    return { error: "Compound-curve math is not a finite value." };
  }
  return {
    arc1_tangent_ft, arc2_tangent_ft, back_tangent_ft, forward_tangent_ft,
    arc1_length_ft, arc2_length_ft, total_length_ft, total_delta_deg: total,
    note: "A compound circular curve, the alignment element between the simple curve and the spiral: two circular arcs of DIFFERENT radii that turn the same direction and meet at a point of compound curvature (PCC), the standard shape of an interchange ramp or an intersection curb return where one radius eases into another. Each arc has its own semi-tangent T = R tan(delta/2) and arc length L = R x delta (radians); the shared common tangent at the PCC is T1 + T2. The tangent distances back to the point of intersection (PI) of the two outer tangents follow from the law of sines on the vertex triangle: the back tangent (PI to the PC) t1 = T1 + (T1 + T2) sin(delta2)/sin(delta), and the forward tangent (PI to the PT) t2 = T2 + (T1 + T2) sin(delta1)/sin(delta), with delta = delta1 + delta2. A 500 ft arc turning 30 degrees compounding into an 800 ft arc turning 25 degrees gives semi-tangents of 134.0 and 177.4 ft, a 294.6 ft back tangent, a 367.4 ft forward tangent, and 610.9 ft of total curve. With equal radii and equal central angles this reduces exactly to the simple curve. The two arcs must turn the SAME way (a reverse curve, turning opposite ways, is a separate case), and a large radius ratio makes an abrupt steering change -- AASHTO limits successive compound radii to about a 1.5:1 ratio on the mainline. A design aid; AASHTO and the engineer of record govern.",
  };
}
export const compoundCurveExample = { inputs: { r1_ft: 500, r2_ft: 800, delta1_deg: 30, delta2_deg: 25 } };
function renderCompoundCurve(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: compound circular curve geometry per AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book) and Ghilani & Wolf, Elementary Surveying: each arc T = R tan(delta/2), L = R delta_rad; back tangent t1 = T1 + (T1+T2) sin(delta2)/sin(delta), forward tangent t2 = T2 + (T1+T2) sin(delta1)/sin(delta), delta = delta1 + delta2 (law of sines on the vertex triangle). Same-direction arcs; the engineer of record governs.";
  const r1 = makeNumber("First radius R1 (ft)", "cc-r1", { step: "any", min: "0" });
  const d1 = makeNumber("First central angle delta1 (deg)", "cc-d1", { step: "any", min: "0" });
  const r2 = makeNumber("Second radius R2 (ft)", "cc-r2", { step: "any", min: "0" });
  const d2 = makeNumber("Second central angle delta2 (deg)", "cc-d2", { step: "any", min: "0" });
  for (const f of [r1, d1, r2, d2]) inputRegion.appendChild(f.wrap);
  const oT = makeOutputLine(outputRegion, "Arc semi-tangents T1 / T2", "cc-out-t");
  const oPI = makeOutputLine(outputRegion, "Back / forward tangent (PI to PC / PT)", "cc-out-pi");
  const oL = makeOutputLine(outputRegion, "Arc lengths / total", "cc-out-l");
  const oNote = makeOutputLine(outputRegion, "Note", "cc-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCompoundCurve({ r1_ft: readNum(r1.input), r2_ft: readNum(r2.input), delta1_deg: readNum(d1.input), delta2_deg: readNum(d2.input) });
    if (r.error) { oT.textContent = r.error; oPI.textContent = "-"; oL.textContent = "-"; oNote.textContent = ""; return; }
    oT.textContent = fmt(r.arc1_tangent_ft, 2) + " ft / " + fmt(r.arc2_tangent_ft, 2) + " ft";
    oPI.textContent = fmt(r.back_tangent_ft, 2) + " ft / " + fmt(r.forward_tangent_ft, 2) + " ft";
    oL.textContent = fmt(r.arc1_length_ft, 2) + " + " + fmt(r.arc2_length_ft, 2) + " = " + fmt(r.total_length_ft, 2) + " ft (delta " + fmt(r.total_delta_deg, 1) + " deg)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { r1.input.value = "500"; d1.input.value = "30"; r2.input.value = "800"; d2.input.value = "25"; update(); });
  for (const f of [r1.input, d1.input, r2.input, d2.input]) f.addEventListener("input", update);
}
CIVIL_RENDERERS["compound-curve"] = renderCompoundCurve;

// --- spec-v1259: reverse (S) curve between parallel tangents ---
// The compound-curve note names its own missing sibling: "The two arcs must turn the SAME way (a reverse
// curve, turning opposite ways, is a separate case)." This builds that case. A reverse curve joins two
// PARALLEL tangents (a track crossover, a lane shift) with two circular arcs of OPPOSITE curvature meeting
// at a point of reverse curvature (PRC). For the outgoing tangent to end up parallel to the incoming one,
// both arcs must sweep the SAME central angle I; the perpendicular offset between the tangents is then
// p = (R1 + R2)(1 - cos I), so I = arccos(1 - p/(R1 + R2)). Each arc has T = R tan(I/2) and L = R I_rad; the
// distance between the tangent points measured along the tangent direction is (R1 + R2) sin I.
// dims: in { r1_ft: L, r2_ft: L, offset_ft: L } out: { central_angle_deg: dimensionless, arc1_tangent_ft: L, arc2_tangent_ft: L, distance_ft: L, arc1_length_ft: L, arc2_length_ft: L, total_length_ft: L }
export function computeReverseCurve({ r1_ft = 0, r2_ft = 0, offset_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R1 = Number(r1_ft) || 0;
  const R2 = Number(r2_ft) || 0;
  const p = Number(offset_ft) || 0;
  if (!(R1 > 0)) return { error: "The first radius R1 must be positive (ft)." };
  if (!(R2 > 0)) return { error: "The second radius R2 must be positive (ft)." };
  if (!(p > 0)) return { error: "The offset between the parallel tangents must be positive (ft)." };
  const sumR = R1 + R2;
  if (!(p < 2 * sumR)) return { error: "The offset is too large for these radii: p must be less than 2(R1 + R2). Increase the radii or reduce the offset." };
  const rad = Math.PI / 180;
  const cosI = 1 - p / sumR;
  const I_rad = Math.acos(cosI);
  const central_angle_deg = I_rad / rad;
  const arc1_tangent_ft = R1 * Math.tan(I_rad / 2);
  const arc2_tangent_ft = R2 * Math.tan(I_rad / 2);
  const distance_ft = sumR * Math.sin(I_rad);
  const arc1_length_ft = R1 * I_rad;
  const arc2_length_ft = R2 * I_rad;
  const total_length_ft = arc1_length_ft + arc2_length_ft;
  if (![central_angle_deg, arc1_tangent_ft, arc2_tangent_ft, distance_ft, arc1_length_ft, arc2_length_ft, total_length_ft].every(Number.isFinite)) {
    return { error: "Reverse-curve math is not a finite value." };
  }
  return {
    central_angle_deg, arc1_tangent_ft, arc2_tangent_ft, distance_ft,
    arc1_length_ft, arc2_length_ft, total_length_ft,
    note: "A reverse (S) curve, the alignment element the compound curve leaves out: two circular arcs of OPPOSITE curvature meeting at a point of reverse curvature (PRC), the shape of a railroad crossover or a lane shift that returns the roadway to a line parallel to where it started. Because the outgoing tangent must end up parallel to the incoming one, both arcs sweep the SAME central angle I, found from the perpendicular offset between the two parallel tangents: p = (R1 + R2)(1 - cos I), so I = arccos(1 - p/(R1 + R2)). Each arc then has its semi-tangent T = R tan(I/2) and arc length L = R x I (radians), and the two tangent points are (R1 + R2) sin I apart along the tangent direction. Shifting between tracks 60 ft apart on 500 ft radii turns each arc 19.9 degrees, 348 ft of curve over a 341 ft reach. With equal radii the two arcs are mirror images. A reverse curve gives no room to run out superelevation between the arcs, so AASHTO and AREMA want a tangent (or spiral) inserted at the PRC on anything but low speeds. A design aid; AASHTO/AREMA and the engineer of record govern.",
  };
}
export const reverseCurveExample = { inputs: { r1_ft: 500, r2_ft: 500, offset_ft: 60 } };
function renderReverseCurve(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: reverse-curve geometry between parallel tangents per Ghilani & Wolf, Elementary Surveying, and AASHTO A Policy on Geometric Design of Highways and Streets: equal central angle I = arccos(1 - p/(R1+R2)); each arc T = R tan(I/2), L = R I_rad; tangent-point distance (R1+R2) sin I. Opposite-curvature arcs; insert a tangent/spiral at the PRC for superelevation runout. The engineer of record governs.";
  const r1 = makeNumber("First radius R1 (ft)", "rc-r1", { step: "any", min: "0" });
  const r2 = makeNumber("Second radius R2 (ft)", "rc-r2", { step: "any", min: "0" });
  const p = makeNumber("Offset between parallel tangents p (ft)", "rc-p", { step: "any", min: "0" });
  for (const f of [r1, r2, p]) inputRegion.appendChild(f.wrap);
  const oI = makeOutputLine(outputRegion, "Central angle I (each arc)", "rc-out-i");
  const oT = makeOutputLine(outputRegion, "Arc semi-tangents T1 / T2", "rc-out-t");
  const oD = makeOutputLine(outputRegion, "Tangent-point distance", "rc-out-d");
  const oL = makeOutputLine(outputRegion, "Arc lengths / total", "rc-out-l");
  const oNote = makeOutputLine(outputRegion, "Note", "rc-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeReverseCurve({ r1_ft: readNum(r1.input), r2_ft: readNum(r2.input), offset_ft: readNum(p.input) });
    if (r.error) { oI.textContent = r.error; oT.textContent = "-"; oD.textContent = "-"; oL.textContent = "-"; oNote.textContent = ""; return; }
    oI.textContent = fmt(r.central_angle_deg, 3) + " deg";
    oT.textContent = fmt(r.arc1_tangent_ft, 2) + " ft / " + fmt(r.arc2_tangent_ft, 2) + " ft";
    oD.textContent = fmt(r.distance_ft, 2) + " ft";
    oL.textContent = fmt(r.arc1_length_ft, 2) + " + " + fmt(r.arc2_length_ft, 2) + " = " + fmt(r.total_length_ft, 2) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { r1.input.value = "500"; r2.input.value = "500"; p.input.value = "60"; update(); });
  for (const f of [r1.input, r2.input, p.input]) f.addEventListener("input", update);
}
CIVIL_RENDERERS["reverse-curve"] = renderReverseCurve;

// --- v766+ E.x: Curve deflection-angle stakeout (`curve-deflection-stakeout`) ---
// The deflection-angle method of setting a circular curve: from the PC, an arc
// length l along the curve subtends a deflection angle (from the back tangent)
// of delta = (l / 2R) x (180/pi) deg, and the sub-chord from the PC to that
// point is c = 2R sin(l / 2R). Arc definition D = 5729.58 / R. The instrument
// turns delta and the chainman pulls the chord c to set each station.
// dims: in { radius_ft: L, degree_of_curve: dimensionless, arc_length_ft: L } out: { deflection_deg: dimensionless, chord_ft: L, radius_ft: L, degree_of_curve: dimensionless }
export function computeCurveDeflectionStakeout({ mode, radius_ft, degree_of_curve, arc_length_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let R;
  if (mode === "degree") {
    const D = Number(degree_of_curve) || 0;
    if (!(D > 0)) return { error: "Degree of curve must be greater than zero." };
    R = 5729.58 / D;
  } else {
    R = Number(radius_ft) || 0;
    if (!(R > 0)) return { error: "Radius must be greater than zero." };
  }
  const l = Number(arc_length_ft) || 0;
  if (!(l > 0)) return { error: "Arc length from the PC must be greater than zero." };
  const delta_rad = l / (2 * R);
  const deflection_deg = (delta_rad * 180) / Math.PI;
  const chord_ft = 2 * R * Math.sin(delta_rad);
  const D = 5729.58 / R;
  return {
    deflection_deg,
    chord_ft,
    radius_ft: R,
    degree_of_curve: D,
    note: "Deflection-angle method (arc definition D = 5729.58 / R): the angle is turned from the back tangent at the PC, and the sub-chord is pulled from the PC to the station. Set intermediate points from the running total of the deflection; the deflection at the PT equals half the curve's total central angle (the field closure check). Simple circular curve, no spiral/superelevation. A computational aid; the design of record and engineer of record govern.",
  };
}
export const curveDeflectionStakeoutExample = { inputs: { mode: "radius", radius_ft: 500, arc_length_ft: 100 } };

function renderCurveDeflectionStakeout(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: deflection-angle curve stakeout - deflection from the back tangent delta = (l / 2R)(180/pi) deg, sub-chord c = 2R sin(l / 2R), arc definition D = 5729.58 / R. First-principles route surveying per FM 5-233 Construction Surveying and AASHTO A Policy on Geometric Design (the Green Book), by name. Simple circular curve, no spiral/superelevation transition. A computational aid; the design of record governs.";
  const mode = makeSelect("Definition mode", "cds-mode", [
    { value: "radius", label: "By radius (ft)" }, { value: "degree", label: "By degree of curve" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const rad = makeNumber("Radius R (ft)", "cds-r", { step: "any", min: "0", value: "500" });
  rad.input.value = "500";
  const deg = makeNumber("Degree of curve D", "cds-d", { step: "any", min: "0" });
  const arc = makeNumber("Arc length from PC (ft)", "cds-l", { step: "any", min: "0", value: "100" });
  arc.input.value = "100";
  for (const f of [rad, deg, arc]) inputRegion.appendChild(f.wrap);
  const oDef = makeOutputLine(outputRegion, "Deflection angle from PC", "cds-out-def");
  const oChord = makeOutputLine(outputRegion, "Sub-chord from PC", "cds-out-chord");
  const oD = makeOutputLine(outputRegion, "Degree of curve", "cds-out-degree");
  const oNote = makeOutputLine(outputRegion, "Note", "cds-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() {
    const isDeg = mode.select.value === "degree";
    rad.wrap.style.display = isDeg ? "none" : "";
    deg.wrap.style.display = isDeg ? "" : "none";
  }
  const update = debounce(() => {
    const r = computeCurveDeflectionStakeout({ mode: mode.select.value, radius_ft: readNum(rad.input), degree_of_curve: readNum(deg.input), arc_length_ft: readNum(arc.input) });
    if (r.error) { oDef.textContent = r.error; oChord.textContent = ""; oD.textContent = ""; oNote.textContent = ""; return; }
    oDef.textContent = fmt(r.deflection_deg, 4) + " deg (R = " + fmt(r.radius_ft, 2) + " ft)";
    oChord.textContent = fmt(r.chord_ft, 3) + " ft";
    oD.textContent = fmt(r.degree_of_curve, 4) + " deg";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "radius"; syncFields(); rad.input.value = "500"; deg.input.value = ""; arc.input.value = "100"; update(); });
  mode.select.addEventListener("input", () => { syncFields(); update(); });
  for (const f of [rad.input, deg.input, arc.input]) f.addEventListener("input", update);
  syncFields();
}
CIVIL_RENDERERS["curve-deflection-stakeout"] = renderCurveDeflectionStakeout;

// --- v25 E.x: Vertical (equal-tangent parabolic) curve (`vertical-curve`) ---
// Equal-tangent parabola measured from the BVC. BVC = PVI - L/2, EVC = PVI + L/2.
// elev(x) = bvc_elev + (g1/100)*x + ((g2-g1)/100)/(2L) * x^2 for x ft from BVC.
// Turning point x_tp = -g1*L/(g2-g1) (percent cancels); crest if g1>g2, sag if g1<g2.
// dims: in { g1_pct: dimensionless, g2_pct: dimensionless, length_ft: L, pvi_station_ft: L, pvi_elevation_ft: L, eval_station_ft: L } out: { bvc_station_ft: L, bvc_elev_ft: L, evc_station_ft: L, evc_elev_ft: L, eval_elevation_ft: L, turning_station_ft: L, turning_elev_ft: L }
export function computeVerticalCurve({ g1_pct, g2_pct, length_ft, pvi_station_ft, pvi_elevation_ft, eval_station_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const g1 = Number(g1_pct) || 0;
  const g2 = Number(g2_pct) || 0;
  const L = Number(length_ft) || 0;
  const pviSta = Number(pvi_station_ft) || 0;
  const pviElev = Number(pvi_elevation_ft) || 0;
  if (!(L > 0)) return { error: "Curve length must be greater than zero." };
  const half = L / 2;
  const bvcSta = pviSta - half;
  const bvcElev = pviElev - (g1 / 100) * half;
  const evcSta = pviSta + half;
  const evcElev = pviElev + (g2 / 100) * half;
  const elevAt = (x) => bvcElev + (g1 / 100) * x + ((g2 - g1) / 100) / (2 * L) * x * x;
  let evalElev = null, evalX = null;
  if (eval_station_ft != null && eval_station_ft !== "") {
    const es = Number(eval_station_ft);
    if (Number.isFinite(es)) { evalX = es - bvcSta; const e = elevAt(evalX); evalElev = Number.isFinite(e) ? e : null; }
  }
  let turningSta = null, turningElev = null, turningType = null, turningNote = null;
  if (g1 === g2) {
    turningNote = "g1 equals g2: straight grade, no crest or sag.";
  } else {
    const xTp = (-g1 * L) / (g2 - g1);
    if (xTp >= 0 && xTp <= L) {
      const e = elevAt(xTp);
      turningSta = bvcSta + xTp;
      turningElev = Number.isFinite(e) ? e : null;
      turningType = g1 > g2 ? "crest" : "sag";
    } else {
      turningNote = "no crest/sag within the curve";
    }
  }
  return {
    bvc_station_ft: Number.isFinite(bvcSta) ? bvcSta : null,
    bvc_elev_ft: Number.isFinite(bvcElev) ? bvcElev : null,
    evc_station_ft: Number.isFinite(evcSta) ? evcSta : null,
    evc_elev_ft: Number.isFinite(evcElev) ? evcElev : null,
    eval_elevation_ft: evalElev,
    turning_station_ft: turningSta != null && Number.isFinite(turningSta) ? turningSta : null,
    turning_elev_ft: turningElev,
    turning_type: turningType,
    turning_note: turningNote,
    note: "Equal-tangent parabola measured from the BVC. Sight-distance and clearance checks are out of scope; the design of record governs.",
  };
}
export const verticalCurveExample = { inputs: { g1_pct: 3, g2_pct: -2, length_ft: 400, pvi_station_ft: 5000, pvi_elevation_ft: 100, eval_station_ft: 5040 } };

function renderVerticalCurve(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Equal-tangent vertical curve per AASHTO A Policy on Geometric Design of Highways and Streets (the Green Book) and FM 5-233 Construction Surveying, from first-principles parabolic geometry. The design of record and engineer of record govern.";
  const g1 = makeNumber("Incoming grade g1 (percent)", "vc-g1", { step: "any", value: "3" });
  g1.input.value = "3";
  const g2 = makeNumber("Outgoing grade g2 (percent)", "vc-g2", { step: "any", value: "-2" });
  g2.input.value = "-2";
  const len = makeNumber("Curve length L (ft)", "vc-l", { step: "any", min: "0", value: "400" });
  len.input.value = "400";
  const pviSta = makeNumber("PVI station (ft)", "vc-psta", { step: "any", value: "5000" });
  pviSta.input.value = "5000";
  const pviElev = makeNumber("PVI elevation (ft)", "vc-pelev", { step: "any", value: "100" });
  pviElev.input.value = "100";
  const evalSta = makeNumber("Evaluate at station (ft, optional)", "vc-eval", { step: "any" });
  for (const f of [g1, g2, len, pviSta, pviElev, evalSta]) inputRegion.appendChild(f.wrap);
  const oBvc = makeOutputLine(outputRegion, "BVC station / elevation", "vc-out-bvc");
  const oEvc = makeOutputLine(outputRegion, "EVC station / elevation", "vc-out-evc");
  const oTurn = makeOutputLine(outputRegion, "Turning point", "vc-out-turn");
  const oEval = makeOutputLine(outputRegion, "Elevation at station", "vc-out-eval");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeVerticalCurve({
      g1_pct: readNum(g1.input),
      g2_pct: readNum(g2.input),
      length_ft: readNum(len.input),
      pvi_station_ft: readNum(pviSta.input),
      pvi_elevation_ft: readNum(pviElev.input),
      eval_station_ft: evalSta.input.value === "" ? null : readNum(evalSta.input),
    });
    if (r.error) { oBvc.textContent = r.error; oEvc.textContent = ""; oTurn.textContent = ""; oEval.textContent = ""; return; }
    oBvc.textContent = fmt(r.bvc_station_ft, 2) + " ft / " + fmt(r.bvc_elev_ft, 2) + " ft";
    oEvc.textContent = fmt(r.evc_station_ft, 2) + " ft / " + fmt(r.evc_elev_ft, 2) + " ft";
    if (r.turning_station_ft == null) {
      oTurn.textContent = r.turning_note ? r.turning_note : "(none within the curve)";
    } else {
      oTurn.textContent = r.turning_type + " at station " + fmt(r.turning_station_ft, 2) + " ft, elevation " + fmt(r.turning_elev_ft, 2) + " ft";
    }
    oEval.textContent = r.eval_elevation_ft == null ? "(enter a station to evaluate)" : fmt(r.eval_elevation_ft, 2) + " ft";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { g1.input.value = "3"; g2.input.value = "-2"; len.input.value = "400"; pviSta.input.value = "5000"; pviElev.input.value = "100"; evalSta.input.value = "5040"; update(); });
  for (const f of [g1.input, g2.input, len.input, pviSta.input, pviElev.input, evalSta.input]) f.addEventListener("input", update);
}
CIVIL_RENDERERS["vertical-curve"] = renderVerticalCurve;

// --- v25 E.x: Earthwork average-end-area volume (`earthwork-end-area`) ---
// Average-end-area: V = (interval/2)*(A_i + A_{i+1}) summed over adjacent pairs.
// Optional prismoidal (single pair): V = (interval/6)*(A1 + 4*mid + A2).
// 27 ft^3 = 1 yd^3. Optional swell/shrink factor scales the bank quantity.
// dims: in { interval_ft: L, mid_area_ft2: L^2, swell_shrink_factor: dimensionless } out: { total_ft3: L^3, total_yd3: L^3, prismoidal_ft3: L^3, adjusted_ft3: L^3 }
export function computeEarthworkEndArea({ areas, interval_ft, mid_area_ft2, swell_shrink_factor } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(areas) || areas.length < 2) return { error: "Provide at least two station end areas." };
  const A = [];
  for (const a of areas) {
    const n = Number(a);
    if (!Number.isFinite(n)) return { error: "Every end area must be a finite number." };
    if (n < 0) return { error: "End areas must be non-negative (ft^2)." };
    A.push(n);
  }
  const interval = Number(interval_ft) || 0;
  if (!(interval > 0)) return { error: "Station interval must be greater than zero (ft)." };
  let total = 0;
  for (let i = 0; i < A.length - 1; i++) total += (interval / 2) * (A[i] + A[i + 1]);
  if (!Number.isFinite(total)) return { error: "Total volume is not finite." };
  const totalYd3 = total / 27;
  let prismoidal = null, prismoidalDiff = null;
  if (mid_area_ft2 != null && mid_area_ft2 !== "") {
    const mid = Number(mid_area_ft2);
    if (Number.isFinite(mid) && mid >= 0) {
      prismoidal = (interval / 6) * (A[0] + 4 * mid + A[1]);
      const endAreaPair = (interval / 2) * (A[0] + A[1]);
      prismoidalDiff = Number.isFinite(prismoidal) ? prismoidal - endAreaPair : null;
    } else if (mid < 0) {
      return { error: "Middle area must be non-negative (ft^2)." };
    }
  }
  let adjusted = null;
  if (swell_shrink_factor != null && swell_shrink_factor !== "") {
    const f = Number(swell_shrink_factor);
    if (Number.isFinite(f) && f > 0) adjusted = total * f;
  }
  return {
    total_ft3: Number.isFinite(total) ? total : null,
    total_yd3: Number.isFinite(totalYd3) ? totalYd3 : null,
    prismoidal_ft3: prismoidal != null && Number.isFinite(prismoidal) ? prismoidal : null,
    prismoidal_diff_ft3: prismoidalDiff != null && Number.isFinite(prismoidalDiff) ? prismoidalDiff : null,
    adjusted_ft3: adjusted != null && Number.isFinite(adjusted) ? adjusted : null,
    note: "One material per run: cut and fill are NOT netted here. Average-end-area only; the project earthwork report governs the paid quantity.",
  };
}
export const earthworkEndAreaExample = { inputs: { areas: [100, 100], interval_ft: 100 } };

function renderEarthworkEndArea(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Average-end-area and prismoidal earthwork volumes per FHWA and state-DOT earthwork references and FM 5-233. Cut and fill are not netted here. The project earthwork report governs the paid quantity.";
  const areas = makeNumber("End areas (ft², comma-separated)", "ewa-areas", { type: "text" });
  areas.input.type = "text";
  areas.input.value = "100, 100";
  const interval = makeNumber("Station interval (ft)", "ewa-int", { step: "any", min: "0", value: "100" });
  interval.input.value = "100";
  const mid = makeNumber("Middle area (ft², optional prismoidal)", "ewa-mid", { step: "any", min: "0" });
  const swell = makeNumber("Swell/shrink factor (optional)", "ewa-swell", { step: "any", min: "0" });
  for (const f of [areas, interval, mid, swell]) inputRegion.appendChild(f.wrap);
  const oTot = makeOutputLine(outputRegion, "Total volume", "ewa-out-tot");
  const oPris = makeOutputLine(outputRegion, "Prismoidal (single pair)", "ewa-out-pris");
  const oAdj = makeOutputLine(outputRegion, "Swell/shrink adjusted", "ewa-out-adj");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function parseAreas(s) {
    return String(s).split(",").map((p) => p.trim()).filter((p) => p !== "").map((p) => Number(p));
  }
  const update = debounce(() => {
    const r = computeEarthworkEndArea({
      areas: parseAreas(areas.input.value),
      interval_ft: readNum(interval.input),
      mid_area_ft2: mid.input.value === "" ? null : readNum(mid.input),
      swell_shrink_factor: swell.input.value === "" ? null : readNum(swell.input),
    });
    if (r.error) { oTot.textContent = r.error; oPris.textContent = ""; oAdj.textContent = ""; return; }
    oTot.textContent = fmt(r.total_ft3, 2) + " ft^3 (" + fmt(r.total_yd3, 2) + " yd^3)";
    oPris.textContent = r.prismoidal_ft3 == null ? "(enter a middle area for the prismoidal pair)" : fmt(r.prismoidal_ft3, 2) + " ft^3 (diff vs end-area " + fmt(r.prismoidal_diff_ft3, 2) + " ft^3)";
    oAdj.textContent = r.adjusted_ft3 == null ? "(enter a factor to adjust)" : fmt(r.adjusted_ft3, 2) + " ft^3";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { areas.input.value = "100, 100"; interval.input.value = "100"; mid.input.value = ""; swell.input.value = ""; update(); });
  for (const f of [areas.input, interval.input, mid.input, swell.input]) f.addEventListener("input", update);
}
CIVIL_RENDERERS["earthwork-end-area"] = renderEarthworkEndArea;

// --- v25 E.x: Slope-stake cut/fill and catch offset (`slope-stake-cut-fill`) ---
// cut_fill = existing - design (positive = cut, negative = fill). Planar catch:
// catch_offset = offset_at_hinge + slope_ratio_h * |cut_fill|, where slope_ratio_h
// is the H in an H:V slope. Equal elevations report on-grade with magnitude 0.
// dims: in { existing_elev_ft: L, design_elev_ft: L, slope_ratio_h: dimensionless, offset_at_hinge_ft: L } out: { cut_fill_ft: L, magnitude_ft: L, catch_offset_ft: L }
export function computeSlopeStakeCutFill({ existing_elev_ft, design_elev_ft, slope_ratio_h, offset_at_hinge_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const existing = Number(existing_elev_ft) || 0;
  const design = Number(design_elev_ft) || 0;
  const slope = Number(slope_ratio_h) || 0;
  const offset = offset_at_hinge_ft == null || offset_at_hinge_ft === "" ? 0 : Number(offset_at_hinge_ft) || 0;
  if (!(slope > 0)) return { error: "Slope ratio H must be greater than zero (a vertical slope has no horizontal run, H:V)." };
  const cutFill = existing - design;
  if (!Number.isFinite(cutFill)) return { error: "Cut/fill is not finite." };
  const which = cutFill > 0 ? "cut" : cutFill < 0 ? "fill" : "on grade";
  const magnitude = Math.abs(cutFill);
  const catchOffset = offset + slope * magnitude;
  return {
    cut_fill_ft: Number.isFinite(cutFill) ? cutFill : null,
    which,
    magnitude_ft: Number.isFinite(magnitude) ? magnitude : null,
    catch_offset_ft: Number.isFinite(catchOffset) ? catchOffset : null,
    note: "Planar (constant-slope) catch approximation from the hinge; existing-ground breaks and a stepped or benched section change the true catch. The grading plan and surveyor of record govern.",
  };
}
export const slopeStakeCutFillExample = { inputs: { existing_elev_ft: 104.5, design_elev_ft: 100.0, slope_ratio_h: 2, offset_at_hinge_ft: 0 } };

function renderSlopeStakeCutFill(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Slope-stake cut/fill and catch-point geometry per FM 5-233 Construction Surveying and FHWA construction-survey guidance, planar approximation. The grading plan and surveyor of record govern.";
  const existing = makeNumber("Existing ground elevation (ft)", "ssc-ex", { step: "any", value: "104.5" });
  existing.input.value = "104.5";
  const design = makeNumber("Design (finished grade) elevation (ft)", "ssc-de", { step: "any", value: "100" });
  design.input.value = "100";
  const slope = makeNumber("Slope ratio H (H:V, e.g. 2 for 2:1)", "ssc-sr", { step: "any", min: "0", value: "2" });
  slope.input.value = "2";
  const offset = makeNumber("Offset to hinge from CL (ft, optional)", "ssc-off", { step: "any" });
  for (const f of [existing, design, slope, offset]) inputRegion.appendChild(f.wrap);
  const oCf = makeOutputLine(outputRegion, "Cut / fill", "ssc-out-cf");
  const oCatch = makeOutputLine(outputRegion, "Catch offset", "ssc-out-catch");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSlopeStakeCutFill({
      existing_elev_ft: readNum(existing.input),
      design_elev_ft: readNum(design.input),
      slope_ratio_h: readNum(slope.input),
      offset_at_hinge_ft: offset.input.value === "" ? null : readNum(offset.input),
    });
    if (r.error) { oCf.textContent = r.error; oCatch.textContent = ""; return; }
    oCf.textContent = r.which === "on grade" ? "on grade (0.00 ft)" : fmt(r.magnitude_ft, 2) + " ft " + r.which;
    oCatch.textContent = fmt(r.catch_offset_ft, 2) + " ft from the hinge reference";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { existing.input.value = "104.5"; design.input.value = "100"; slope.input.value = "2"; offset.input.value = ""; update(); });
  for (const f of [existing.input, design.input, slope.input, offset.input]) f.addEventListener("input", update);
}
CIVIL_RENDERERS["slope-stake-cut-fill"] = renderSlopeStakeCutFill;

// --- v335 E.x: Roadway superelevation & minimum curve radius (`superelevation`) ---
// AASHTO point-mass model: e + f = V^2/(15 R). Mode "e" solves the required
// superelevation e = V^2/(15 R) - f for a curve radius; mode "rmin" solves the
// minimum radius R_min = V^2/(15(e_max + f)) at a maximum bank. V in mph, R in ft.
// dims: in { V_mph: dimensionless, R_ft: L, e_max: dimensionless, f: dimensionless } out: { e_req: dimensionless, R_min_ft: L }
export function computeSuperelevation({ mode, V_mph, R_ft, e_max, f } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(V_mph) || 0;
  if (!(V > 0)) return { error: "Design speed must be greater than zero." };
  const ff = Number(f) || 0;
  if (mode === "rmin") {
    const em = Number(e_max) || 0;
    if (!(em + ff > 0)) return { error: "e_max + f must be greater than zero." };
    const Rmin = (V * V) / (15 * (em + ff));
    if (!Number.isFinite(Rmin)) return { error: "Minimum radius is not valid." };
    return { mode: "rmin", R_min_ft: Rmin, e_req: null };
  }
  const R = Number(R_ft) || 0;
  if (!(R > 0)) return { error: "Curve radius must be greater than zero." };
  const e = (V * V) / (15 * R) - ff;
  if (!Number.isFinite(e)) return { error: "Required superelevation is not valid." };
  return { mode: "e", e_req: e, no_bank: e <= 0, R_min_ft: null };
}
export const superelevationExample = { inputs: { mode: "e", V_mph: 60, R_ft: 1500, f: 0.12 } };

function renderSuperelevation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO point-mass curve model e + f = V^2/(15 R) per A Policy on Geometric Design of Highways and Streets (the Green Book): required superelevation e = V^2/(15 R) - f, minimum radius R_min = V^2/(15(e_max + f)); the side-friction factor f is from the AASHTO design-speed table and decreases with speed. A design aid, not a substitute for a licensed civil engineer's geometric design.";
  const mode = makeSelect("Solve for", "se-mode", [
    { value: "e", label: "Required superelevation e (from radius)" },
    { value: "rmin", label: "Minimum radius R_min (from max bank)" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const V = makeNumber("Design speed V (mph)", "se-v", { step: "any", min: "0", value: "60" });
  V.input.value = "60";
  const R = makeNumber("Curve radius R (ft)", "se-r", { step: "any", min: "0", value: "1500" });
  R.input.value = "1500";
  const em = makeNumber("Max superelevation e_max (e.g. 0.08)", "se-emax", { step: "any", min: "0" });
  const f = makeNumber("Side-friction factor f", "se-f", { step: "any", min: "0", value: "0.12" });
  f.input.value = "0.12";
  for (const fld of [V, R, em, f]) inputRegion.appendChild(fld.wrap);
  const oOut = makeOutputLine(outputRegion, "Result", "se-out");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() {
    const isRmin = mode.select.value === "rmin";
    R.wrap.style.display = isRmin ? "none" : "";
    em.wrap.style.display = isRmin ? "" : "none";
  }
  const update = debounce(() => {
    const r = computeSuperelevation({
      mode: mode.select.value,
      V_mph: readNum(V.input),
      R_ft: readNum(R.input),
      e_max: readNum(em.input),
      f: readNum(f.input),
    });
    if (r.error) { oOut.textContent = r.error; return; }
    if (r.mode === "rmin") { oOut.textContent = "R_min " + fmt(r.R_min_ft, 1) + " ft (sharpest curve at this speed and bank)"; return; }
    oOut.textContent = r.no_bank
      ? "e = " + fmt(r.e_req, 4) + " -- no superelevation required (side friction alone holds the curve; a normal crown suffices)"
      : "e = " + fmt(r.e_req, 4) + " (" + fmt(r.e_req * 100, 1) + "% superelevation)";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "e"; syncFields(); V.input.value = "60"; R.input.value = "1500"; em.input.value = ""; f.input.value = "0.12"; update(); });
  mode.select.addEventListener("input", () => { syncFields(); update(); });
  for (const fld of [V.input, R.input, em.input, f.input]) fld.addEventListener("input", update);
  syncFields();
}
CIVIL_RENDERERS["superelevation"] = renderSuperelevation;

// superelevation-safe-curve-speed: inverse of superelevation. The forward tile solves for the superelevation or the
// minimum radius from the design speed; the inverse recovers the maximum safe speed a curve supports from its radius,
// superelevation (bank), and side-friction factor. From the AASHTO point-mass relation e + f = V^2 / (15 R),
// V = sqrt( 15 R (e + f) ). V in mph, R in ft.
// dims: in { R_ft: L, e: dimensionless, f: dimensionless } out: { v_mph: dimensionless }
export function computeSuperelevationSafeCurveSpeed({ R_ft, e, f } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = Number(R_ft) || 0;
  const ee = Number(e) || 0;
  const ff = Number(f) || 0;
  if (!(R > 0)) return { error: "Curve radius must be greater than zero (ft)." };
  if (!(ee + ff > 0)) return { error: "The superelevation plus the side-friction factor (e + f) must be positive." };
  const v_mph = Math.sqrt(15 * R * (ee + ff));
  if (!Number.isFinite(v_mph)) return { error: "Safe-speed math is not a finite value." };
  return {
    v_mph,
    note: "AASHTO point-mass safe-curve speed: from e + f = V^2 / (15 R), V = sqrt( 15 R (e + f) ) mph, the maximum speed the superelevation e plus the side-friction f supports on a curve of radius R. The side-friction factor f is the AASHTO design value that DECREASES with speed, so use the f for the resulting speed range (iterate once if it lands in a different band) - a higher f borrowed from a lower speed over-predicts the safe speed. This is the point-mass model; it ignores grade, the runoff/transition, and the driver comfort a full geometric design covers. A design/check aid, not a substitute for a licensed civil engineer's geometric design.",
  };
}
export const superelevationSafeCurveSpeedExample = { inputs: { R_ft: 1500, e: 0.08, f: 0.12 } };

function renderSuperelevationSafeCurveSpeed(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO point-mass curve model e + f = V^2/(15 R) (A Policy on Geometric Design of Highways and Streets, the Green Book) solved for the speed: V = sqrt( 15 R (e + f) ) mph. The side-friction factor f is from the AASHTO design-speed table and decreases with speed. A design aid, not a substitute for a licensed civil engineer's geometric design.";
  const R = makeNumber("Curve radius R (ft)", "ses-r", { step: "any", min: "0" });
  const e = makeNumber("Superelevation e (e.g. 0.08)", "ses-e", { step: "any" });
  const f = makeNumber("Side-friction factor f", "ses-f", { step: "any", min: "0" });
  for (const fld of [R, e, f]) inputRegion.appendChild(fld.wrap);
  attachExampleButton(inputRegion, () => { R.input.value = "1500"; e.input.value = "0.08"; f.input.value = "0.12"; update(); });
  const oV = makeOutputLine(outputRegion, "Maximum safe speed", "ses-out-v");
  const oNote = makeOutputLine(outputRegion, "Note", "ses-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSuperelevationSafeCurveSpeed({ R_ft: readNum(R.input), e: readNum(e.input), f: readNum(f.input) });
    if (r.error) { oV.textContent = r.error; oNote.textContent = ""; return; }
    oV.textContent = fmt(r.v_mph, 1) + " mph";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const fld of [R.input, e.input, f.input]) fld.addEventListener("input", update);
}
CIVIL_RENDERERS["superelevation-safe-curve-speed"] = renderSuperelevationSafeCurveSpeed;

// --- v336 E.x: Minimum crest vertical-curve length for SSD (`vertical-curve-sight-distance`) ---
// AASHTO crest curve: L = A S^2 / C when S <= L, else L = 2 S - C/A, where C is
// the sight constant (2158 SSD crest, 2800 passing) embedding a 3.5 ft eye and
// 2.0 ft object height. K = L / A is the rate of vertical curvature.
// dims: in { A_pct: dimensionless, S_ft: L, C: dimensionless } out: { L_ft: L, K_ft_per_pct: L }
export function computeVerticalCurveSightDistance({ A_pct, S_ft, C } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const A = Number(A_pct) || 0;
  if (!(A > 0)) return { error: "Algebraic grade difference A must be greater than zero." };
  const S = Number(S_ft) || 0;
  if (!(S > 0)) return { error: "Sight distance S must be greater than zero." };
  const c = Number(C) > 0 ? Number(C) : 2158;
  const L1 = (A * S * S) / c;
  const L = S <= L1 ? L1 : 2 * S - c / A;
  if (!Number.isFinite(L) || !(L > 0)) return { error: "Minimum curve length is not valid for these inputs." };
  const K = L / A;
  return { L_ft: L, K_ft_per_pct: K, branch: S <= L1 ? "S <= L" : "S > L", constant: c };
}
export const verticalCurveSightDistanceExample = { inputs: { A_pct: 5, S_ft: 570, C: 2158 } };

function renderVerticalCurveSightDistance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO crest vertical-curve minimums per A Policy on Geometric Design of Highways and Streets (the Green Book): L = A S^2 / C for S <= L and L = 2 S - C/A for S > L, with C = 2158 (SSD crest; a 3.5 ft eye and 2.0 ft object height) or 2800 (passing); K = L/A. This is the crest SSD control -- sag curves use headlight/comfort/drainage criteria. A design aid, not a substitute for a licensed civil engineer's design.";
  const A = makeNumber("Algebraic grade difference A (%, |g2-g1|)", "vcs-a", { step: "any", min: "0" });
  const S = makeNumber("Stopping sight distance S (ft)", "vcs-s", { step: "any", min: "0" });
  const C = makeNumber("Sight constant C (2158 SSD, 2800 passing)", "vcs-c", { step: "any", min: "0" });
  for (const fld of [A, S, C]) inputRegion.appendChild(fld.wrap);
  const oL = makeOutputLine(outputRegion, "Minimum curve length L", "vcs-out-l");
  const oK = makeOutputLine(outputRegion, "Rate of vertical curvature K", "vcs-out-k");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeVerticalCurveSightDistance({ A_pct: readNum(A.input), S_ft: readNum(S.input), C: readNum(C.input) });
    if (r.error) { oL.textContent = r.error; oK.textContent = ""; return; }
    oL.textContent = fmt(r.L_ft, 0) + " ft (" + r.branch + " branch governs)";
    oK.textContent = fmt(r.K_ft_per_pct, 0) + " ft/% (K = L/A)";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { A.input.value = "5"; S.input.value = "570"; C.input.value = "2158"; update(); });
  for (const fld of [A.input, S.input, C.input]) fld.addEventListener("input", update);
}
CIVIL_RENDERERS["vertical-curve-sight-distance"] = renderVerticalCurveSightDistance;

// --- v636 E.x: Sag vertical curve minimum length for headlight SSD (`sag-vertical-curve`) ---
// AASHTO Green Book sag headlight criterion: L = A S^2/(400 + 3.5 S) for S <= L,
// L = 2 S - (400 + 3.5 S)/A for S > L. The 400/3.5 embed the 2.0 ft headlight
// height and 1-degree beam divergence (400 = 200*2.0, 3.5 ~ 200*tan 1deg). K = L/A.
// dims: in { A_pct: dimensionless, S_ft: L } out: { L_ft: L, K_ft_per_pct: L }
export function computeSagVerticalCurve({ A_pct, S_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const A = Number(A_pct) || 0;
  if (!(A > 0)) return { error: "Algebraic grade difference A must be greater than zero." };
  const S = Number(S_ft) || 0;
  if (!(S > 0)) return { error: "Sight distance S must be greater than zero." };
  const denom = 400 + 3.5 * S;
  const L1 = (A * S * S) / denom;
  const L = S <= L1 ? L1 : 2 * S - denom / A;
  if (!Number.isFinite(L) || !(L > 0)) return { error: "Minimum sag curve length is not valid for these inputs (the grade change may be too small to require a curve for this sight distance)." };
  const K = L / A;
  return { L_ft: L, K_ft_per_pct: K, branch: S <= L1 ? "S <= L" : "S > L", denom };
}
export const sagVerticalCurveExample = { inputs: { A_pct: 4, S_ft: 400 } };

function renderSagVerticalCurve(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO sag vertical-curve minimums per A Policy on Geometric Design of Highways and Streets (the Green Book), headlight sight-distance criterion: L = A S^2 / (400 + 3.5 S) for S <= L and L = 2 S - (400 + 3.5 S)/A for S > L, where 400 and 3.5 embed the 2.0 ft headlight height and 1-degree beam divergence; K = L/A. This is the headlight-SSD control (the governing sag stopping criterion); the comfort criterion L = A V^2/46.5 and drainage K <= 167 are separate checks. A design aid, not a substitute for a licensed civil engineer's design.";
  const A = makeNumber("Algebraic grade difference A (%, |g2-g1|)", "svc-a", { step: "any", min: "0" });
  const S = makeNumber("Stopping sight distance S (ft)", "svc-s", { step: "any", min: "0" });
  for (const fld of [A, S]) inputRegion.appendChild(fld.wrap);
  const oL = makeOutputLine(outputRegion, "Minimum sag curve length L", "svc-out-l");
  const oK = makeOutputLine(outputRegion, "Rate of vertical curvature K", "svc-out-k");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSagVerticalCurve({ A_pct: readNum(A.input), S_ft: readNum(S.input) });
    if (r.error) { oL.textContent = r.error; oK.textContent = ""; return; }
    oL.textContent = fmt(r.L_ft, 0) + " ft (" + r.branch + " branch governs)";
    oK.textContent = fmt(r.K_ft_per_pct, 0) + " ft/% (K = L/A)";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { A.input.value = "4"; S.input.value = "400"; update(); });
  for (const fld of [A.input, S.input]) fld.addEventListener("input", update);
}
CIVIL_RENDERERS["sag-vertical-curve"] = renderSagVerticalCurve;

// --- v638 E.x: Sag vertical curve comfort + drainage criteria (`sag-vertical-curve-comfort`) ---
// AASHTO Green Book comfort criterion: L = A V^2 / 46.5 (A in %, V in mph, L in ft),
// the length that limits the vertical (centripetal) acceleration on the sag to about
// 1 ft/s^2. K = L/A = V^2/46.5. The drainage maximum K <= 167 (a 0.30% minimum grade
// within 50 ft of the low point: 50/0.30 = 166.7) bounds the curve from the other side
// on curbed sections, so the drainage-max length is 167 A. The two criteria bracket the
// acceptable length; the headlight-SSD control is the separate `sag-vertical-curve` tile.
// dims: in { A_pct: dimensionless, V_mph: L T^-1 } out: { L_ft: L, K_ft_per_pct: L, L_drainage_max_ft: L }
export function computeSagVerticalCurveComfort({ A_pct, V_mph } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const A = Number(A_pct) || 0;
  if (!(A > 0)) return { error: "Algebraic grade difference A must be greater than zero." };
  const V = Number(V_mph) || 0;
  if (!(V > 0)) return { error: "Design speed V must be greater than zero." };
  const L = (A * V * V) / 46.5;
  if (!Number.isFinite(L) || !(L > 0)) return { error: "Comfort minimum sag curve length is not valid for these inputs." };
  const K = L / A; // = V^2/46.5, the rate of vertical curvature at the comfort minimum
  const DRAIN_K_MAX = 167;
  const L_drainage_max = DRAIN_K_MAX * A; // longest curve before drainage needs attention (curbed sections)
  const drainageOk = K <= DRAIN_K_MAX;
  return { L_ft: L, K_ft_per_pct: K, L_drainage_max_ft: L_drainage_max, drainage_K_max: DRAIN_K_MAX, drainage_ok: drainageOk };
}
export const sagVerticalCurveComfortExample = { inputs: { A_pct: 4, V_mph: 60 } };

function renderSagVerticalCurveComfort(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO comfort and drainage sag vertical-curve controls per A Policy on Geometric Design of Highways and Streets (the Green Book): the comfort criterion L = A V^2 / 46.5 (A in %, V in mph, L in ft) limits the vertical acceleration to about 1 ft/s^2, giving K = L/A = V^2/46.5; the drainage maximum K <= 167 (a 0.30% minimum grade within 50 ft of the low point) caps the length at 167 A on curbed sections. These bracket the acceptable length; headlight stopping sight distance is the separate governing control (the sag-vertical-curve tile). A design aid, not a substitute for a licensed civil engineer's design.";
  const A = makeNumber("Algebraic grade difference A (%, |g2-g1|)", "svcc-a", { step: "any", min: "0" });
  const V = makeNumber("Design speed V (mph)", "svcc-v", { step: "any", min: "0" });
  for (const fld of [A, V]) inputRegion.appendChild(fld.wrap);
  const oL = makeOutputLine(outputRegion, "Comfort minimum length L", "svcc-out-l");
  const oK = makeOutputLine(outputRegion, "Rate of vertical curvature K", "svcc-out-k");
  const oD = makeOutputLine(outputRegion, "Drainage maximum length (K<=167)", "svcc-out-d");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSagVerticalCurveComfort({ A_pct: readNum(A.input), V_mph: readNum(V.input) });
    if (r.error) { oL.textContent = r.error; oK.textContent = ""; oD.textContent = ""; return; }
    oL.textContent = fmt(r.L_ft, 0) + " ft (K = " + fmt(r.K_ft_per_pct, 1) + " ft/%)";
    oK.textContent = fmt(r.K_ft_per_pct, 1) + " ft/% (= V^2/46.5, comfort minimum)";
    oD.textContent = fmt(r.L_drainage_max_ft, 0) + " ft" + (r.drainage_ok ? " (comfort length drains OK)" : " (comfort length exceeds drainage max)");
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { A.input.value = "4"; V.input.value = "60"; update(); });
  for (const fld of [A.input, V.input]) fld.addEventListener("input", update);
}
CIVIL_RENDERERS["sag-vertical-curve-comfort"] = renderSagVerticalCurveComfort;

// --- v337 E.x: Horizontal sightline offset for SSD on a curve (`horizontal-sightline-offset`) ---
// AASHTO middle ordinate: M = R (1 - cos(28.65 S / R)) with the half-angle in
// degrees (28.65 = 90/pi). Inverse mode: S = (R/28.65) arccos(1 - M/R). R is to
// the inside-lane centerline (the vehicle's path).
// dims: in { R_ft: L, S_ft: L, M_ft: L } out: { M_ft: L, S_ft: L }
export function computeHorizontalSightlineOffset({ mode, R_ft, S_ft, M_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = Number(R_ft) || 0;
  if (!(R > 0)) return { error: "Curve radius must be greater than zero." };
  if (mode === "maxS") {
    const M = Number(M_ft) || 0;
    if (!(M > 0)) return { error: "Cleared offset M must be greater than zero." };
    const ratio = 1 - M / R;
    if (!(ratio >= -1 && ratio <= 1)) return { error: "Cleared offset exceeds the curve radius." };
    const S = (R / 28.6479) * (Math.acos(ratio) * 180 / Math.PI);
    if (!Number.isFinite(S)) return { error: "Sight distance is not valid." };
    return { mode: "maxS", S_ft: S, M_ft: null };
  }
  const S = Number(S_ft) || 0;
  if (!(S > 0)) return { error: "Sight distance must be greater than zero." };
  const M = R * (1 - Math.cos((28.6479 * S / R) * Math.PI / 180));
  if (!Number.isFinite(M)) return { error: "Sightline offset is not valid." };
  return { mode: "M", M_ft: M, S_ft: null };
}
export const horizontalSightlineOffsetExample = { inputs: { mode: "M", R_ft: 1000, S_ft: 570 } };

function renderHorizontalSightlineOffset(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO horizontal sightline offset (middle ordinate) per A Policy on Geometric Design of Highways and Streets (the Green Book): M = R (1 - cos(28.65 S / R)) with R to the inside-lane centerline (the vehicle's path); the inverse S = (R/28.65) arccos(1 - M/R). Assumes a continuous obstruction along the curve. A design aid, not a substitute for a licensed civil engineer's design.";
  const mode = makeSelect("Solve for", "hso-mode", [
    { value: "M", label: "Sightline offset M (from sight distance)" },
    { value: "maxS", label: "Max sight distance S (from cleared offset)" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const R = makeNumber("Curve radius R to inside-lane CL (ft)", "hso-r", { step: "any", min: "0", value: "1000" });
  R.input.value = "1000";
  const S = makeNumber("Sight distance S (ft)", "hso-s", { step: "any", min: "0", value: "570" });
  S.input.value = "570";
  const M = makeNumber("Cleared offset M (ft)", "hso-m", { step: "any", min: "0" });
  for (const fld of [R, S, M]) inputRegion.appendChild(fld.wrap);
  const oOut = makeOutputLine(outputRegion, "Result", "hso-out");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function syncFields() {
    const isMaxS = mode.select.value === "maxS";
    S.wrap.style.display = isMaxS ? "none" : "";
    M.wrap.style.display = isMaxS ? "" : "none";
  }
  const update = debounce(() => {
    const r = computeHorizontalSightlineOffset({
      mode: mode.select.value, R_ft: readNum(R.input), S_ft: readNum(S.input), M_ft: readNum(M.input),
    });
    if (r.error) { oOut.textContent = r.error; return; }
    oOut.textContent = r.mode === "maxS"
      ? "S = " + fmt(r.S_ft, 1) + " ft available at this cleared offset"
      : "M = " + fmt(r.M_ft, 1) + " ft -- inside clear-zone width the curve needs";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { mode.select.value = "M"; syncFields(); R.input.value = "1000"; S.input.value = "570"; M.input.value = ""; update(); });
  mode.select.addEventListener("input", () => { syncFields(); update(); });
  for (const fld of [R.input, S.input, M.input]) fld.addEventListener("input", update);
  syncFields();
}
CIVIL_RENDERERS["horizontal-sightline-offset"] = renderHorizontalSightlineOffset;
