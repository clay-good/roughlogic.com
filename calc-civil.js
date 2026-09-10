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

// Compact renderer factory (number inputs only here; same shape as the
// calc-lineworker.js / calc-steamplant.js / calc-diving.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _civRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };

  _civRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _civRender;
}

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
  const rad = makeNumber("Radius R (ft)", "hc-r", { step: "any", min: "0" });
  const deg = makeNumber("Degree of curve D", "hc-d", { step: "any", min: "0" });
  const delta = makeNumber("Deflection angle delta (deg)", "hc-delta", { step: "any", min: "0" });
  const pi = makeNumber("PI station (ft, optional)", "hc-pi", { step: "any" });
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
  const rad = makeNumber("Radius R (ft)", "cds-r", { step: "any", min: "0" });
  const deg = makeNumber("Degree of curve D", "cds-d", { step: "any", min: "0" });
  const arc = makeNumber("Arc length from PC (ft)", "cds-l", { step: "any", min: "0" });
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
  const existing = makeNumber("Existing ground elevation (ft)", "ssc-ex", { step: "any" });
  const design = makeNumber("Design (finished grade) elevation (ft)", "ssc-de", { step: "any" });
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
// dims: in { V_mph: L T^-1, R_ft: L, e_max: dimensionless, f: dimensionless } out: { e_req: dimensionless, R_min_ft: L }
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
  const V = makeNumber("Design speed V (mph)", "se-v", { step: "any", min: "0" });
  const R = makeNumber("Curve radius R (ft)", "se-r", { step: "any", min: "0" });
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
// dims: in { R_ft: L, e: dimensionless, f: dimensionless } out: { v_mph: L T^-1 }
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
  const R = makeNumber("Curve radius R to inside-lane CL (ft)", "hso-r", { step: "any", min: "0" });
  const S = makeNumber("Sight distance S (ft)", "hso-s", { step: "any", min: "0" });
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

// ===========================================================================
// spec-v1610..v1615: the 2026-09-08 trade-expansion traffic, work zone, and
// pavement band. Six tiles, all group E, into this existing module.
//
//   v1610 skip-line-layout            v1613 pavement-structural-number
//   v1611 speed-hump-geometry         v1614 subgrade-cbr-thickness
//   v1612 intersection-sight-triangle v1615 esal-traffic-loading
//
// THREE OF THE BAND'S NINE SPECS WERE CUT as duplicates, all three found by
// the formula screen rather than by name:
//   spec-v1608 work-zone-buffer  -> `stopping-sight-distance`, whose relation,
//     grade term and worked example are the same 55 mph / 0.35 / level = 490 ft
//     the spec computes. It gained an available-distance comparison.
//   spec-v1609 flagger-advance-warning -> `advance-warning-sign-spacing`,
//     which already reads MUTCD Table 6C-1 and the 8-to-12-times-speed rule.
//     It gained the queue estimate, which was the genuinely new half.
//   spec-v1616 chip-seal-rate -> `chip-seal-mcleod`, which carries the SAME
//     McLeod method -- and carries it correctly, where the spec's binder
//     constant and aggregate expression were both wrong. It gained a project
//     area.
//
// TWO MORE SPECS WERE INTERNALLY WRONG:
//   spec-v1611 puts 3 in over 6 ft at "3.5%". It is 4.17%.
//   spec-v1615 left two unrendered python placeholders in its worked example,
//     and overstates the CBR sensitivity in spec-v1614's neighbour by 2x.

// ============ spec-v1610: skip line cycle layout ============

// dims: in { stripe_length_ft: L, gap_length_ft: L, run_length_ft: L, start_offset_ft: L, counted_stripes: dimensionless, counted_length_ft: L } out: { cycle_length_ft: L, stripes_in_run: dimensionless, stripes_per_mile: dimensionless, painted_length_ft: L, painted_fraction_pct: dimensionless, implied_cycle_ft: L }
export function computeSkipLineLayout({ stripe_length_ft = 0, gap_length_ft = 0, run_length_ft = 0, start_offset_ft = 0, counted_stripes = 0, counted_length_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(stripe_length_ft > 0)) return { error: "Stripe length must be positive (ft)." };
  if (!(gap_length_ft > 0)) return { error: "Gap length must be positive (ft)." };
  if (!(run_length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (start_offset_ft < 0) return { error: "The offset from the reference point cannot be negative (ft)." };
  if (counted_stripes < 0) return { error: "A counted stripe count cannot be negative." };
  if (counted_length_ft < 0) return { error: "A measured length cannot be negative (ft)." };
  const cycle_length_ft = stripe_length_ft + gap_length_ft;
  if (!(run_length_ft >= cycle_length_ft)) return { error: "The run is shorter than one full cycle; there is no pattern to lay out." };
  const usable_ft = run_length_ft - start_offset_ft;
  if (!(usable_ft >= stripe_length_ft)) return { error: "The offset leaves less than one stripe of room in the run." };
  const FT_PER_MILE = 5280;
  const stripes_in_run = Math.floor((usable_ft - stripe_length_ft) / cycle_length_ft) + 1;
  const stripes_per_mile = FT_PER_MILE / cycle_length_ft;
  const painted_length_ft = stripes_in_run * stripe_length_ft;
  const painted_per_mile_ft = stripes_per_mile * stripe_length_ft;
  const painted_fraction_pct = stripe_length_ft / cycle_length_ft * 100;
  const first_stripe_start_ft = start_offset_ft;
  const last_stripe_start_ft = start_offset_ft + (stripes_in_run - 1) * cycle_length_ft;
  const last_stripe_end_ft = last_stripe_start_ft + stripe_length_ft;
  const tail_ft = run_length_ft - last_stripe_end_ft;
  // The maintenance inversion: a counted stripe count over a measured length
  // gives the cycle in place, which is the pattern new work has to match.
  const implied_cycle_ft = (counted_stripes > 0 && counted_length_ft > 0) ? counted_length_ft / counted_stripes : null;
  const matches_counted = implied_cycle_ft === null ? null : Math.abs(implied_cycle_ft - cycle_length_ft) <= 0.5;
  const outs = [cycle_length_ft, stripes_in_run, stripes_per_mile, painted_length_ft, painted_fraction_pct];
  if (!outs.every(Number.isFinite)) return { error: "Skip-line math is not a finite value." };
  return {
    stripe_length_ft, gap_length_ft, run_length_ft, start_offset_ft, cycle_length_ft,
    stripes_in_run, stripes_per_mile, painted_length_ft, painted_per_mile_ft,
    painted_fraction_pct, first_stripe_start_ft, last_stripe_start_ft, last_stripe_end_ft,
    tail_ft, counted_stripes, counted_length_ft, implied_cycle_ft, matches_counted,
    note: "Skip line is laid out on a cycle -- one stripe plus one gap -- and the count for a run is a division that decides how much paint goes on the truck. The arithmetic is trivial and the field consequences are not. On the common 10 ft stripe with a 30 ft gap the cycle is 40 ft, a mile carries 132 stripes and 1,320 feet of paint, and exactly a quarter of the run is painted -- which is a useful mental check on any pattern. Change to the 15 ft stripe and 25 ft gap some agencies use and the cycle is STILL 40 ft, the mile still carries 132 stripes, and the paint goes to 1,980 feet: half again the material for a line a driver would struggle to tell apart. Over a twelve mile job that is nearly eight thousand additional feet of stripe, which has to be on the estimate and is a reason to confirm the agency's pattern before ordering. THE LAYOUT REFERENCE MATTERS MORE THAN THE ARITHMETIC. A skip line laid out from wherever the truck happened to start puts a stripe in the middle of an intersection or across a driveway, and once a run is laid the whole pattern is fixed behind it. Laying out from a fixed point -- a joint, a station, the last stripe of the adjoining section -- is what keeps a pattern consistent across a project and across years of maintenance, and the offset here is that reference. For a maintenance crew the useful inversion runs the other way: count the stripes on an existing run, measure its length, and the division gives the cycle in place, which is the pattern the new work should match rather than defaulting to 40 ft. Layout arithmetic for a uniform skip pattern, and nothing else. Marking patterns, stripe and gap lengths, widths and colours are set by the MUTCD and by the agency's own standard drawings and vary by marking type and road class: a lane line, a centre line, an edge line and a dotted extension through an intersection are different patterns with different rules, and this does not choose among them. It does not lay out no-passing zones, arrows, symbols or transverse markings, and it does not compute material quantity -- that takes the painted length produced here, the stripe width and the coverage rate, and it is a separate calculation. Retroreflectivity, bead application, surface preparation, temperature and moisture limits, and the removal of conflicting existing markings are all outside it. The adopted MUTCD and its state supplement, the agency's standard drawings, and the project specification govern.",
  };
}
const skipLineLayoutExample = { inputs: { stripe_length_ft: 10, gap_length_ft: 30, run_length_ft: 5280, start_offset_ft: 0, counted_stripes: 99, counted_length_ft: 3300 } };
CIVIL_RENDERERS["skip-line-layout"] = _simpleRenderer({
  citation: "Citation: the MUTCD broken-line cycle convention by name -- cycle = stripe + gap, stripes per mile = 5,280 / cycle, painted fraction = stripe / cycle -- inverted for maintenance as cycle = measured length / counted stripes. NO PATTERN IS SHIPPED: stripe and gap lengths, widths and colours are set by the MUTCD and the agency's standard drawings and vary by marking type and road class. Material quantity is a separate calculation that takes the painted length produced here. The adopted MUTCD and its state supplement, the agency's standard drawings, and the project specification govern.",
  example: skipLineLayoutExample.inputs,
  fields: [
    { key: "stripe_length_ft", label: "Stripe length (ft)", kind: "number", default: 10 },
    { key: "gap_length_ft", label: "Gap length (ft)", kind: "number", default: 30 },
    { key: "run_length_ft", label: "Run length (ft)", kind: "number", default: 5280 },
    { key: "start_offset_ft", label: "First stripe offset from the reference point (ft)", kind: "number", default: 0 },
    { key: "counted_stripes", label: "Stripes counted on an existing run (0 to skip)", kind: "number", default: 99 },
    { key: "counted_length_ft", label: "Length that count was measured over (ft, 0 to skip)", kind: "number", default: 3300 },
  ],
  outputs: [
    { key: "c", id: "sll-out-c", label: "Cycle", value: (r) => fmt(r.cycle_length_ft, 2) + " ft -- " + fmt(r.stripes_per_mile, 1) + " stripes per mile" },
    { key: "s", id: "sll-out-s", label: "Stripes in this run", value: (r) => fmt(r.stripes_in_run, 0) + " from " + fmt(r.first_stripe_start_ft, 1) + " ft to " + fmt(r.last_stripe_end_ft, 1) + " ft, leaving " + fmt(r.tail_ft, 1) + " ft of tail" },
    { key: "p", id: "sll-out-p", label: "Painted length", value: (r) => fmt(r.painted_length_ft, 0) + " ft in the run, " + fmt(r.painted_per_mile_ft, 0) + " ft per mile -- feed THIS to the paint quantity, not the run length" },
    { key: "f", id: "sll-out-f", label: "Painted fraction", value: (r) => fmt(r.painted_fraction_pct, 1) + "% of the run is stripe" },
    { key: "m", id: "sll-out-m", label: "Cycle in place from a count", value: (r) => r.implied_cycle_ft === null ? "(no counted run entered)" : fmt(r.implied_cycle_ft, 2) + " ft from " + fmt(r.counted_stripes, 0) + " stripes over " + fmt(r.counted_length_ft, 0) + " ft -- " + (r.matches_counted ? "the same pattern you entered" : "NOT the pattern you entered; match the run in place rather than defaulting") },
    { key: "n", id: "sll-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSkipLineLayout,
});

// ============ spec-v1611: speed hump and speed table geometry ============

// dims: in { height_in: L, total_length_ft: L, flat_top_length_ft: L, crossing_speed_mph: L T^-1, comfort_limit_g: dimensionless, wheelbase_in: L, ground_clearance_in: L, target_ramp_slope_pct: dimensionless } out: { ramp_length_ft: L, ramp_slope_pct: dimensionless, vertical_accel_g: dimensionless, comfort_speed_mph: L T^-1, clearance_required_in: L, ramp_length_for_target_ft: L }
export function computeSpeedHumpGeometry({ height_in = 0, total_length_ft = 0, flat_top_length_ft = 0, crossing_speed_mph = 25, comfort_limit_g = 0.25, wheelbase_in = 120, ground_clearance_in = 5, target_ramp_slope_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(height_in > 0)) return { error: "Device height must be positive (in)." };
  if (!(total_length_ft > 0)) return { error: "Total length must be positive (ft)." };
  if (flat_top_length_ft < 0) return { error: "Flat-top length cannot be negative (ft)." };
  if (!(flat_top_length_ft < total_length_ft)) return { error: "The flat top must be shorter than the total length -- the difference is the two ramps." };
  if (!(crossing_speed_mph > 0)) return { error: "Crossing speed must be positive (mph)." };
  if (!(comfort_limit_g > 0)) return { error: "The comfort limit must be positive (g)." };
  if (!(wheelbase_in > 0)) return { error: "Design vehicle wheelbase must be positive (in)." };
  if (ground_clearance_in < 0) return { error: "Ground clearance cannot be negative (in)." };
  if (!(target_ramp_slope_pct > 0)) return { error: "The target ramp slope must be positive (%)." };
  const IN_PER_FT = 12;
  // 5,280 ft per mile over 3,600 s per hour is exactly 22/15. The AASHTO
  // sight-distance relations round it to 1.47 by convention, which is why the
  // sight triangle carries its own named constant rather than sharing this.
  const FT_PER_S_PER_MPH = 22 / 15;
  const G_FT_S2 = 32.174;
  const height_ft = height_in / IN_PER_FT;
  const ramp_length_ft = (total_length_ft - flat_top_length_ft) / 2;
  const ramp_slope_pct = height_ft / ramp_length_ft * 100;
  // The two ramps read as one parabolic transition of length 2 x ramp. For a
  // hump with no flat top that IS the whole device. A parabola has a constant
  // second derivative, so the wheel's vertical acceleration is constant over
  // the ramp at 8 h V^2 / L^2 -- which is why height and length trade the way
  // they do, and why length is the variable that matters more.
  const transition_ft = 2 * ramp_length_ft;
  const speed_fps = crossing_speed_mph * FT_PER_S_PER_MPH;
  const vertical_accel_fps2 = 8 * height_ft * speed_fps * speed_fps / (transition_ft * transition_ft);
  const vertical_accel_g = vertical_accel_fps2 / G_FT_S2;
  const comfort_limit_fps2 = comfort_limit_g * G_FT_S2;
  const comfort_speed_mph = transition_ft * Math.sqrt(comfort_limit_fps2 / (8 * height_ft)) / FT_PER_S_PER_MPH;
  // Ground clearance: the crest rises above the line between the axles by the
  // height at the centre less the profile height under each wheel.
  const half_wheelbase_ft = wheelbase_in / IN_PER_FT / 2;
  const profileHeightIn = (x_ft) => {
    const a = Math.abs(x_ft);
    if (a <= flat_top_length_ft / 2) return height_in * 1;
    if (a >= total_length_ft / 2) return height_in * 0;
    const intoRamp = a - flat_top_length_ft / 2;
    return height_in * (1 - (intoRamp / ramp_length_ft) * (intoRamp / ramp_length_ft));
  };
  const wheel_height_in = profileHeightIn(half_wheelbase_ft);
  const clearance_required_in = height_in - wheel_height_in;
  const clearance_margin_in = ground_clearance_in - clearance_required_in;
  const clears = clearance_margin_in >= 0;
  const sits_on_flat = wheelbase_in / IN_PER_FT <= flat_top_length_ft;
  const ramp_length_for_target_ft = height_ft / (target_ramp_slope_pct / 100);
  const outs = [ramp_length_ft, ramp_slope_pct, vertical_accel_g, comfort_speed_mph, clearance_required_in, ramp_length_for_target_ft];
  if (!outs.every(Number.isFinite)) return { error: "Speed hump geometry is not a finite value." };
  const clearance_verdict = clears
    ? "CLEARS: the crest sits " + fmt(clearance_required_in, 2) + " in above the line between the axles, against " + fmt(ground_clearance_in, 2) + " in of clearance -- " + fmt(clearance_margin_in, 2) + " in to spare"
    : "GROUNDS OUT: the crest sits " + fmt(clearance_required_in, 2) + " in above the line between the axles and the vehicle has only " + fmt(ground_clearance_in, 2) + " in, so it is " + fmt(-clearance_margin_in, 2) + " in short";
  return {
    height_in, total_length_ft, flat_top_length_ft, ramp_length_ft, ramp_slope_pct,
    crossing_speed_mph, vertical_accel_g, vertical_accel_fps2, comfort_limit_g,
    comfort_speed_mph, wheelbase_in, ground_clearance_in, wheel_height_in,
    clearance_required_in, clearance_margin_in, clears, sits_on_flat,
    target_ramp_slope_pct, ramp_length_for_target_ft, clearance_verdict,
    note: "A speed hump's height and length set the speed a driver finds comfortable, and getting the proportions wrong produces either a device nobody slows for or one that bottoms out a fire truck. THE RAMP IS TREATED HERE AS A PARABOLA, which has a constant second derivative -- so the vertical acceleration a wheel feels is constant across the ramp and works out to eight times the height times the square of the speed, over the square of the transition length. Two things follow, and both are the design. Length matters more than height, because it enters squared: doubling the length quarters the acceleration at the same speed, while halving the height only halves it. And the speed at which a given ramp reaches a stated comfort limit falls straight out of the same relation, which is what a design speed actually means for a vertical deflection device. A classic twelve foot hump three inches high reaches a quarter of gravity at about sixteen miles an hour, which is why it works. THE FLAT TOP IS A SEPARATE MECHANISM AND IT IS THE REASON SPEED TABLES EXIST. A table with the same height and the same ramp slope has the same ramp acceleration and a materially higher tolerable speed, and the difference is not in the ramp at all: a short hump lifts one axle at a time and pitches the vehicle, while a flat top long enough for the whole wheelbase to sit on removes that pitching entirely. That is what this reports as the ground clearance question. A vehicle whose wheelbase spans the crest has its belly lifted above the line between its axles, and the amount is the crest height less the profile height under the wheels -- zero when the wheelbase sits entirely on the flat, and the full device height when the wheelbase is longer than the device. A long low vehicle on a short hump is where a device becomes a hazard. Emergency access is the constraint that usually settles the argument in a neighbourhood. Each short hump costs a fire apparatus seconds, and a corridor with six of them costs meaningful response time; departments object legitimately, and tables and cushions are the compromises that come out of this same geometry. That delay is NOT quantified here -- it needs the fire department's own apparatus and route data. This is a geometric screen. It does not design a traffic calming installation: device selection, spacing, placement relative to driveways, intersections, drainage, bus and emergency routes, signing and marking, and the public process are all part of a program this arithmetic supports rather than replaces. Device dimensions are set by the agency's standard drawings and by ITE traffic calming guidance and they vary, and taking dimensions from another jurisdiction is a common source of devices that do not perform as expected. It does not evaluate drainage, which a hump across a gutter line disrupts, or pavement construction and durability, and it does not address speed cushions or chicanes. The agency's standard drawings, ITE traffic calming guidance, the fire department, and the adopted MUTCD for signing and marking govern.",
  };
}
const speedHumpGeometryExample = { inputs: { height_in: 3, total_length_ft: 12, flat_top_length_ft: 0, crossing_speed_mph: 25, comfort_limit_g: 0.25, wheelbase_in: 120, ground_clearance_in: 5, target_ramp_slope_pct: 5 } };
CIVIL_RENDERERS["speed-hump-geometry"] = _simpleRenderer({
  citation: "Citation: the parabolic vertical-deflection relations by name -- ramp slope = height / ramp length; wheel vertical acceleration = 8 x height x speed squared / transition length squared, constant across a parabolic ramp; and the comfort speed as that relation inverted at an entered acceleration limit. The ground-clearance check is the crest height less the parabolic profile height under the design vehicle's wheels. Device dimensions are set by the agency's standard drawings and by ITE traffic calming guidance and are ENTERED, not shipped. Emergency response delay is not quantified; it needs the fire department's apparatus and route data. The agency's standard drawings, ITE traffic calming guidance, the fire department, and the adopted MUTCD for signing and marking govern.",
  example: speedHumpGeometryExample.inputs,
  fields: [
    { key: "height_in", label: "Device height (in)", kind: "number", default: 3 },
    { key: "total_length_ft", label: "Total length in the direction of travel (ft)", kind: "number", default: 12 },
    { key: "flat_top_length_ft", label: "Flat-top length (ft, 0 for a hump)", kind: "number", default: 0 },
    { key: "crossing_speed_mph", label: "Crossing speed to test (mph)", kind: "number", default: 25 },
    { key: "comfort_limit_g", label: "Vertical acceleration comfort limit (g)", kind: "number", default: 0.25 },
    { key: "wheelbase_in", label: "Design vehicle wheelbase (in)", kind: "number", default: 120 },
    { key: "ground_clearance_in", label: "Design vehicle ground clearance (in)", kind: "number", default: 5 },
    { key: "target_ramp_slope_pct", label: "Target ramp slope (%)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "r", id: "shg-out-r", label: "Ramp", value: (r) => fmt(r.ramp_length_ft, 2) + " ft each side at " + fmt(r.ramp_slope_pct, 2) + "% -- " + fmt(r.height_in, 2) + " in of rise" },
    { key: "a", id: "shg-out-a", label: "Vertical acceleration", value: (r) => fmt(r.vertical_accel_g, 3) + " g at " + fmt(r.crossing_speed_mph, 0) + " mph (" + fmt(r.vertical_accel_fps2, 2) + " ft/s2)" },
    { key: "s", id: "shg-out-s", label: "Speed at the comfort limit", value: (r) => fmt(r.comfort_speed_mph, 1) + " mph reaches " + fmt(r.comfort_limit_g, 2) + " g on this ramp. A flat top raises the tolerable speed ABOVE this, because the vehicle stops pitching" },
    { key: "c", id: "shg-out-c", label: "Ground clearance", value: (r) => r.clearance_verdict },
    { key: "w", id: "shg-out-w", label: "Wheelbase against the flat top", value: (r) => r.sits_on_flat ? "the " + fmt(r.wheelbase_in, 0) + " in wheelbase sits ENTIRELY on the " + fmt(r.flat_top_length_ft, 1) + " ft flat, so nothing pitches" : "the " + fmt(r.wheelbase_in, 0) + " in wheelbase spans past the flat top, so the vehicle pitches over the crest" },
    { key: "t", id: "shg-out-t", label: "Ramp for the target slope", value: (r) => fmt(r.ramp_length_for_target_ft, 2) + " ft each side at " + fmt(r.target_ramp_slope_pct, 1) + "%, so a total of " + fmt(2 * r.ramp_length_for_target_ft + r.flat_top_length_ft, 2) + " ft with this flat top" },
    { key: "n", id: "shg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSpeedHumpGeometry,
});

// ============ spec-v1612: intersection sight triangle ============

// dims: in { major_speed_mph: L T^-1, time_gap_s: T, extra_lanes: dimensionless, added_gap_per_lane_s: T, setback_ft: L, available_left_ft: L, available_right_ft: L } out: { total_time_gap_s: T, required_distance_ft: L, triangle_area_ft2: L^2, shortfall_left_ft: L, shortfall_right_ft: L, adequate_speed_mph: L T^-1 }
export function computeIntersectionSightTriangle({ major_speed_mph = 0, time_gap_s = 0, extra_lanes = 0, added_gap_per_lane_s = 0.5, setback_ft = 15, available_left_ft = 0, available_right_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(major_speed_mph > 0)) return { error: "Major road design speed must be positive (mph)." };
  if (!(time_gap_s > 0)) return { error: "The AASHTO time gap must be positive (s)." };
  if (extra_lanes < 0) return { error: "The count of additional lanes crossed cannot be negative." };
  if (added_gap_per_lane_s < 0) return { error: "The added gap per lane cannot be negative (s)." };
  if (setback_ft < 0) return { error: "The decision point setback cannot be negative (ft)." };
  if (available_left_ft < 0 || available_right_ft < 0) return { error: "An available sight distance cannot be negative (ft)." };
  // The AASHTO conventional rounding of 22/15, which the stopping-sight-distance
  // relations also use; keeping it makes the two agree to the printed digit.
  const AASHTO_FT_PER_S_PER_MPH = 1.47;
  const total_time_gap_s = time_gap_s + extra_lanes * added_gap_per_lane_s;
  const required_distance_ft = AASHTO_FT_PER_S_PER_MPH * major_speed_mph * total_time_gap_s;
  // The triangle each way: one leg the setback along the minor road, the other
  // the departure sight distance along the major road.
  const triangle_area_ft2 = 0.5 * required_distance_ft * setback_ft;
  const shortfall_left_ft = available_left_ft > 0 ? Math.max(0, required_distance_ft - available_left_ft) : null;
  const shortfall_right_ft = available_right_ft > 0 ? Math.max(0, required_distance_ft - available_right_ft) : null;
  const worst_available_ft = (available_left_ft > 0 && available_right_ft > 0)
    ? Math.min(available_left_ft, available_right_ft)
    : (available_left_ft > 0 ? available_left_ft : (available_right_ft > 0 ? available_right_ft : null));
  const adequate_speed_mph = worst_available_ft === null ? null : worst_available_ft / (AASHTO_FT_PER_S_PER_MPH * total_time_gap_s);
  const adequate = worst_available_ft === null ? null : worst_available_ft >= required_distance_ft;
  const outs = [total_time_gap_s, required_distance_ft, triangle_area_ft2];
  if (!outs.every(Number.isFinite)) return { error: "Sight triangle math is not a finite value." };
  const verdict = adequate === null
    ? "Measure the available sight distance in each direction to check the intersection."
    : adequate
      ? "ADEQUATE: the shorter of the two measured directions is " + fmt(worst_available_ft, 0) + " ft against a requirement of " + fmt(required_distance_ft, 0) + " ft"
      : "DEFICIENT: the shorter of the two measured directions is " + fmt(worst_available_ft, 0) + " ft against a requirement of " + fmt(required_distance_ft, 0) + " ft, short by " + fmt(required_distance_ft - worst_available_ft, 0) + " ft. What is there suits " + fmt(adequate_speed_mph, 0) + " mph, not " + fmt(major_speed_mph, 0);
  return {
    major_speed_mph, time_gap_s, extra_lanes, added_gap_per_lane_s, total_time_gap_s,
    required_distance_ft, setback_ft, triangle_area_ft2,
    available_left_ft, available_right_ft, shortfall_left_ft, shortfall_right_ft,
    worst_available_ft, adequate_speed_mph, adequate, verdict,
    note: "A driver waiting to pull out needs to see far enough along the through road to complete the manoeuvre before a vehicle arrives, and that distance is a time gap times the through speed. THE TIME GAP IS THE WHOLE DESIGN and it is a behavioural number rather than a physical one: it is how long a driver needs to start, accelerate, and clear the through lane without making an approaching driver slow. It grows with the number of lanes crossed, and it grows substantially for trucks -- which is why an intersection that works for cars can be inadequate for the farm, the quarry, or the plant it also serves. A passenger car turning left from a stop onto a two-lane road takes about seven and a half seconds; a single-unit truck takes about nine and a half, which at 45 mph is a hundred and thirty feet further in each direction. An intersection designed on the car gap and later serving trucks is deficient without anything having changed on the ground. The distance itself is then just speed times time, and it is longer than intuition suggests: seven and a half seconds at 45 mph is nearly five hundred feet each way. The area those legs enclose is large, and KEEPING IT CLEAR IS A MAINTENANCE OBLIGATION AS MUCH AS A DESIGN ONE. Landscaping grows, snow banks accumulate, and a permitted sign or a parked truck can defeat a properly designed intersection years after it was built -- which is why the triangle area is reported here, because that is the ground somebody has to mow. The vertical window is the detail people miss. Obstruction is judged roughly between three feet and eight feet above the road, because that is the band between a driver's eye and an approaching vehicle's roof: a low wall or a high canopy may sit inside the triangle without obstructing anything, while a hedge at four feet defeats it entirely. A sight distance calculation using AASHTO time gaps the reader supplies. NO GAP TABLE IS SHIPPED: the values depend on the manoeuvre -- left turn, right turn, or crossing -- on the design vehicle, on the number and width of lanes crossed, and on the approach grade, and the AASHTO Green Book tables govern. It does not evaluate approach sight distance, decision sight distance, or the criteria for signalized, yield-controlled and roundabout intersections, each of which has its own. It does not address horizontal and vertical roadway geometry that may obstruct sight independently of objects, and it does not measure the available distance, which is a field measurement taken at the actual driver eye height and object height. The legal status of an obstruction inside the triangle depends on right-of-way, easements, and local ordinance and is outside this entirely. The AASHTO Green Book, the agency's design standards, and the roadway engineer govern.",
  };
}
const intersectionSightTriangleExample = { inputs: { major_speed_mph: 45, time_gap_s: 7.5, extra_lanes: 0, added_gap_per_lane_s: 0.5, setback_ft: 15, available_left_ft: 380, available_right_ft: 380 } };
CIVIL_RENDERERS["intersection-sight-triangle"] = _simpleRenderer({
  citation: "Citation: the AASHTO departure sight distance relation by name -- b = 1.47 x major road speed (mph) x time gap (s) -- with the AASHTO Green Book named for the time gap values and the roughly 3 ft to 8 ft vertical obstruction window. NO GAP TABLE IS SHIPPED: the gap depends on the manoeuvre, the design vehicle, the lanes crossed and the approach grade, and is entered from the Green Book. The available distance is a field measurement at the actual driver eye height and object height. The AASHTO Green Book, the agency's design standards, and the roadway engineer govern.",
  example: intersectionSightTriangleExample.inputs,
  fields: [
    { key: "major_speed_mph", label: "Major road design speed (mph)", kind: "number", default: 45 },
    { key: "time_gap_s", label: "AASHTO time gap for the manoeuvre and vehicle (s)", kind: "number", default: 7.5 },
    { key: "extra_lanes", label: "Additional lanes crossed beyond the base case", kind: "number", default: 0 },
    { key: "added_gap_per_lane_s", label: "Added gap per additional lane (s)", kind: "number", default: 0.5 },
    { key: "setback_ft", label: "Decision point setback from the travelled way (ft)", kind: "number", default: 15 },
    { key: "available_left_ft", label: "Available sight distance to the left (ft, 0 to skip)", kind: "number", default: 380 },
    { key: "available_right_ft", label: "Available sight distance to the right (ft, 0 to skip)", kind: "number", default: 380 },
  ],
  outputs: [
    { key: "g", id: "ist-out-g", label: "Time gap used", value: (r) => fmt(r.total_time_gap_s, 2) + " s -- " + fmt(r.time_gap_s, 2) + " base plus " + fmt(r.extra_lanes, 0) + " extra lane" + (r.extra_lanes === 1 ? "" : "s") },
    { key: "b", id: "ist-out-b", label: "Departure sight distance required", value: (r) => fmt(r.required_distance_ft, 0) + " ft in EACH direction along the major road" },
    { key: "v", id: "ist-out-v", label: "Against what is measured", value: (r) => r.verdict },
    { key: "s", id: "ist-out-s", label: "Shortfall each way", value: (r) => (r.shortfall_left_ft === null && r.shortfall_right_ft === null) ? "(no measured distances entered)" : "left " + (r.shortfall_left_ft === null ? "not measured" : fmt(r.shortfall_left_ft, 0) + " ft") + ", right " + (r.shortfall_right_ft === null ? "not measured" : fmt(r.shortfall_right_ft, 0) + " ft") },
    { key: "a", id: "ist-out-a", label: "Triangle to keep clear", value: (r) => fmt(r.required_distance_ft, 0) + " ft by " + fmt(r.setback_ft, 0) + " ft each way, about " + fmt(r.triangle_area_ft2, 0) + " sq ft per side, clear between roughly 3 ft and 8 ft above the pavement" },
    { key: "n", id: "ist-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeIntersectionSightTriangle,
});

// ============ spec-v1613: flexible pavement structural number ============

// dims: in { ac_thickness_in: L, ac_coefficient: dimensionless, base_thickness_in: L, base_coefficient: dimensionless, base_drainage: dimensionless, subbase_thickness_in: L, subbase_coefficient: dimensionless, subbase_drainage: dimensionless, required_sn: dimensionless } out: { sn_surface: dimensionless, sn_base: dimensionless, sn_subbase: dimensionless, sn_total: dimensionless, sn_margin: dimensionless, base_per_inch_of_ac_in: L }
export function computePavementStructuralNumber({ ac_thickness_in = 0, ac_coefficient = 0.44, base_thickness_in = 0, base_coefficient = 0.14, base_drainage = 1.0, subbase_thickness_in = 0, subbase_coefficient = 0.11, subbase_drainage = 1.0, required_sn = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ac_thickness_in > 0)) return { error: "Asphalt thickness must be positive (in)." };
  if (!(ac_coefficient > 0)) return { error: "The asphalt layer coefficient must be positive." };
  if (base_thickness_in < 0 || subbase_thickness_in < 0) return { error: "A layer thickness cannot be negative (in)." };
  if (base_thickness_in > 0 && !(base_coefficient > 0)) return { error: "The base layer coefficient must be positive." };
  if (subbase_thickness_in > 0 && !(subbase_coefficient > 0)) return { error: "The subbase layer coefficient must be positive." };
  if (!(base_drainage >= 0.4 && base_drainage <= 1.4)) return { error: "The base drainage coefficient must be between 0.4 and 1.4 -- AASHTO 93 tabulates 0.8 to 1.2 for ordinary conditions." };
  if (!(subbase_drainage >= 0.4 && subbase_drainage <= 1.4)) return { error: "The subbase drainage coefficient must be between 0.4 and 1.4 -- AASHTO 93 tabulates 0.8 to 1.2 for ordinary conditions." };
  if (required_sn < 0) return { error: "The required structural number cannot be negative." };
  // The surface course is bound, so it carries no drainage coefficient.
  const sn_surface = ac_coefficient * ac_thickness_in;
  const sn_base = base_coefficient * base_thickness_in * base_drainage;
  const sn_subbase = subbase_coefficient * subbase_thickness_in * subbase_drainage;
  const sn_total = sn_surface + sn_base + sn_subbase;
  const sn_margin = required_sn > 0 ? sn_total - required_sn : null;
  const meets_required = required_sn > 0 ? sn_total >= required_sn : null;
  // The substitution question, which is what the coefficients exist for.
  const base_rate = base_coefficient * base_drainage;
  const base_per_inch_of_ac_in = base_rate > 0 ? ac_coefficient / base_rate : null;
  const subbase_rate = subbase_coefficient * subbase_drainage;
  const subbase_per_inch_of_ac_in = subbase_rate > 0 ? ac_coefficient / subbase_rate : null;
  const added_base_needed_in = (sn_margin !== null && sn_margin < 0 && base_rate > 0) ? -sn_margin / base_rate : 0;
  const added_ac_needed_in = (sn_margin !== null && sn_margin < 0) ? -sn_margin / ac_coefficient : 0;
  const outs = [sn_surface, sn_base, sn_subbase, sn_total];
  if (!outs.every(Number.isFinite)) return { error: "Structural number math is not a finite value." };
  const verdict = meets_required === null
    ? "Enter a required structural number to check the section."
    : meets_required
      ? "MEETS the required " + fmt(required_sn, 2) + " at " + fmt(sn_total, 2) + " -- " + fmt(sn_margin, 2) + " to spare"
      : "SHORT of the required " + fmt(required_sn, 2) + " at " + fmt(sn_total, 2) + " -- add " + fmt(added_ac_needed_in, 2) + " in of asphalt or " + fmt(added_base_needed_in, 2) + " in of base";
  return {
    ac_thickness_in, ac_coefficient, base_thickness_in, base_coefficient, base_drainage,
    subbase_thickness_in, subbase_coefficient, subbase_drainage, required_sn,
    sn_surface, sn_base, sn_subbase, sn_total, sn_margin, meets_required,
    base_per_inch_of_ac_in, subbase_per_inch_of_ac_in, added_base_needed_in, added_ac_needed_in, verdict,
    note: "Flexible pavement design comes down to one number that describes the whole section: the structural number, a weighted sum of layer thicknesses. It is how a designer trades asphalt against base, and how an inspector checks whether a substituted section is equivalent. THE LAYER COEFFICIENTS ARE WHAT MAKE THE TRADE VISIBLE. An inch of asphalt is worth roughly three inches of crushed base and four of subbase, so a contractor proposing to substitute base for asphalt has to add three or four times the thickness to stay equivalent. That substitution is often cheaper and often perfectly sound, which is exactly why the arithmetic gets used in the field, and the equivalency is not a judgment call -- it is one division, reported here both ways. The drainage coefficient is the term that quietly punishes bad detailing, and it applies only to the UNBOUND layers. An unbound layer that stays saturated carries a coefficient below one, and the section loses structural number without losing an inch of material: drop a base from 1.0 to 0.8 and eight inches of rock gives up most of a quarter of a point. Edge drains, a daylighted base, and a subgrade that actually drains are worth real thickness, and this is where that shows up as a number rather than as an argument. THE REQUIRED STRUCTURAL NUMBER IS AN INPUT AND THIS DOES NOT SOLVE FOR IT. It comes from the AASHTO 93 design equation and depends on design traffic in equivalent single axle loads, the reliability level, the overall standard deviation, the subgrade resilient modulus, and the allowable serviceability loss. Two of those dominate -- the traffic loading and the subgrade modulus -- and both are commonly assumed rather than measured, and both move the answer by inches of asphalt. A design built on assumed values deserves to be checked against measured ones. Layer coefficients are agency-specific and depend on material quality; using generic values where an agency publishes its own gives a wrong answer with a confident look to it. AASHTO 93 is an empirical method derived from the AASHO Road Test of the late nineteen fifties, and mechanistic-empirical design supersedes it in many agencies and gives different answers. This does not address rigid pavement, layer thickness minimums, construction tolerances, or the subgrade preparation and compaction that decide whether the designed section performs at all. The agency's pavement design manual, the geotechnical investigation, and the pavement engineer govern.",
  };
}
const pavementStructuralNumberExample = { inputs: { ac_thickness_in: 4, ac_coefficient: 0.44, base_thickness_in: 8, base_coefficient: 0.14, base_drainage: 1.0, subbase_thickness_in: 10, subbase_coefficient: 0.11, subbase_drainage: 0.8, required_sn: 3.0 } };
CIVIL_RENDERERS["pavement-structural-number"] = _simpleRenderer({
  citation: "Citation: the AASHTO 93 structural number relation by name -- SN = sum of (layer coefficient x thickness x drainage coefficient), with the drainage coefficient applying only to unbound layers. Layer coefficients (asphalt about 0.44, crushed base about 0.14, subbase about 0.11) and drainage coefficients (0.8 to 1.2 in ordinary conditions) are AGENCY VALUES and are entered, not shipped. The required SN comes from the AASHTO 93 design equation, which depends on design ESALs, reliability, standard deviation, subgrade resilient modulus and serviceability loss, and is NOT solved here. AASHTO 93 is empirical, from the AASHO Road Test; mechanistic-empirical design supersedes it in many agencies. The agency's pavement design manual, the geotechnical investigation, and the pavement engineer govern.",
  example: pavementStructuralNumberExample.inputs,
  fields: [
    { key: "ac_thickness_in", label: "Asphalt concrete thickness (in)", kind: "number", default: 4 },
    { key: "ac_coefficient", label: "Asphalt layer coefficient", kind: "number", default: 0.44 },
    { key: "base_thickness_in", label: "Base thickness (in)", kind: "number", default: 8 },
    { key: "base_coefficient", label: "Base layer coefficient", kind: "number", default: 0.14 },
    { key: "base_drainage", label: "Base drainage coefficient", kind: "number", default: 1.0 },
    { key: "subbase_thickness_in", label: "Subbase thickness (in)", kind: "number", default: 10 },
    { key: "subbase_coefficient", label: "Subbase layer coefficient", kind: "number", default: 0.11 },
    { key: "subbase_drainage", label: "Subbase drainage coefficient", kind: "number", default: 0.8 },
    { key: "required_sn", label: "Required structural number (0 to skip)", kind: "number", default: 3.0 },
  ],
  outputs: [
    { key: "l", id: "psn-out-l", label: "By layer", value: (r) => "asphalt " + fmt(r.sn_surface, 2) + ", base " + fmt(r.sn_base, 2) + ", subbase " + fmt(r.sn_subbase, 2) },
    { key: "t", id: "psn-out-t", label: "Structural number", value: (r) => fmt(r.sn_total, 2) },
    { key: "v", id: "psn-out-v", label: "Against the requirement", value: (r) => r.verdict },
    { key: "e", id: "psn-out-e", label: "Equivalency", value: (r) => (r.base_per_inch_of_ac_in === null ? "-" : fmt(r.base_per_inch_of_ac_in, 2) + " in of base") + (r.subbase_per_inch_of_ac_in === null ? "" : ", or " + fmt(r.subbase_per_inch_of_ac_in, 2) + " in of subbase") + ", for every inch of asphalt taken out" },
    { key: "d", id: "psn-out-d", label: "What the drainage coefficients cost", value: (r) => "the base at " + fmt(r.base_drainage, 2) + " gives up " + fmt(r.base_coefficient * r.base_thickness_in * (1 - r.base_drainage), 2) + " and the subbase at " + fmt(r.subbase_drainage, 2) + " gives up " + fmt(r.subbase_coefficient * r.subbase_thickness_in * (1 - r.subbase_drainage), 2) + " -- lost without losing an inch of material" },
    { key: "n", id: "psn-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePavementStructuralNumber,
});

// ============ spec-v1614: subgrade CBR to aggregate cover thickness ============

// dims: in { cbr_pct: dimensionless, wheel_load_lb: M L T^-2, tire_pressure_psi: M L^-1 T^-2, coverages: dimensionless, geosynthetic_reduction_pct: dimensionless, alternate_cbr_pct: dimensionless } out: { thickness_in: L, thickness_with_geosynthetic_in: L, resilient_modulus_psi: M L^-1 T^-2, alternate_thickness_in: L, sensitivity_ratio: dimensionless, alpha_factor: dimensionless }
export function computeSubgradeCbrThickness({ cbr_pct = 0, wheel_load_lb = 0, tire_pressure_psi = 0, coverages = 5000, geosynthetic_reduction_pct = 0, alternate_cbr_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cbr_pct > 0)) return { error: "Subgrade CBR must be positive (%)." };
  if (!(wheel_load_lb > 0)) return { error: "Wheel load must be positive (lb)." };
  if (!(tire_pressure_psi > 0)) return { error: "Tire pressure must be positive (psi)." };
  if (!(coverages >= 1)) return { error: "Coverages must be at least one." };
  if (!(geosynthetic_reduction_pct >= 0 && geosynthetic_reduction_pct < 100)) return { error: "The geosynthetic thickness reduction must be at least zero and below 100%." };
  if (alternate_cbr_pct < 0) return { error: "The comparison CBR cannot be negative (%)." };
  const PRACTICAL_CBR_FLOOR = 3;
  const MODULUS_PER_CBR_PSI = 1500;
  const coverThickness = (cbr) => {
    const bracket = 1 / (8.1 * cbr) - 1 / (Math.PI * tire_pressure_psi);
    if (!(bracket > 0)) return Number.NaN;
    return Math.sqrt(wheel_load_lb * bracket);
  };
  // The Corps of Engineers coverage adjustment: thickness grows with the
  // logarithm of the number of passes, so a haul road carrying ten times the
  // traffic needs a quarter more rock, not ten times as much.
  const alpha_factor = 0.23 * Math.log10(coverages) + 0.15;
  if (!(alpha_factor > 0)) return { error: "The coverage factor is not positive; enter at least one coverage." };
  const base_thickness_in = coverThickness(cbr_pct);
  if (!Number.isFinite(base_thickness_in)) return { error: "This subgrade is stronger than the tire contact pressure calls for, so the cover relation returns no thickness. Check the CBR against the tire pressure." };
  const thickness_in = alpha_factor * base_thickness_in;
  const thickness_with_geosynthetic_in = thickness_in * (1 - geosynthetic_reduction_pct / 100);
  const geosynthetic_saving_in = thickness_in - thickness_with_geosynthetic_in;
  const resilient_modulus_psi = MODULUS_PER_CBR_PSI * cbr_pct;
  const modulus_correlation_reliable = cbr_pct <= 10;
  const alt_raw = alternate_cbr_pct > 0 ? coverThickness(alternate_cbr_pct) : Number.NaN;
  const alternate_thickness_in = Number.isFinite(alt_raw) ? alpha_factor * alt_raw : null;
  const sensitivity_ratio = alternate_thickness_in === null ? null : alternate_thickness_in / thickness_in;
  const needs_improvement = cbr_pct < PRACTICAL_CBR_FLOOR;
  const outs = [alpha_factor, thickness_in, thickness_with_geosynthetic_in, resilient_modulus_psi];
  if (!outs.every(Number.isFinite)) return { error: "Cover-thickness math is not a finite value." };
  const verdict = needs_improvement
    ? "BELOW THE PRACTICAL FLOOR: at CBR " + fmt(cbr_pct, 1) + " the relation still returns " + fmt(thickness_in, 1) + " in, but the subgrade deforms under construction traffic regardless and aggregate punches into it. That is an undercut, a stabilization, or a designed working platform -- not more rock"
    : "WORKABLE: CBR " + fmt(cbr_pct, 1) + " is above the practical floor of " + fmt(PRACTICAL_CBR_FLOOR, 0) + ", so " + fmt(thickness_in, 1) + " in of cover is a rock answer rather than a subgrade problem";
  return {
    cbr_pct, wheel_load_lb, tire_pressure_psi, coverages, alpha_factor,
    thickness_in, geosynthetic_reduction_pct, thickness_with_geosynthetic_in,
    geosynthetic_saving_in, resilient_modulus_psi, modulus_correlation_reliable,
    alternate_cbr_pct, alternate_thickness_in, sensitivity_ratio,
    needs_improvement, practical_cbr_floor: PRACTICAL_CBR_FLOOR, verdict,
    note: "Aggregate thickness over a soft subgrade is set by how weak the subgrade is, and CBR is the field measure that says so. It is the number that decides whether a haul road needs six inches of rock or eighteen, and getting it wrong costs either money or a road that pumps. The relation used here is the Corps of Engineers cover equation -- the square root of the wheel load times the difference between one over eight point one times CBR and one over pi times the tire pressure -- scaled by a coverage factor that grows with the logarithm of the number of passes. Two consequences follow from the shape of it. Cover falls steeply as CBR rises, so measuring the subgrade rather than assuming it is worth a great deal: assuming CBR 5 on ground that tests at 2 produces a section that pumps and ruts before the first winter. And traffic enters only as a logarithm, so a haul road carrying ten times the passes needs about a quarter more rock rather than ten times as much. THE SENSITIVITY IS REPORTED RATHER THAN ASSERTED, because it is routinely overstated. Going from CBR 3 to CBR 10 at a fixed wheel load does not cut the rock by four -- it cuts it by about half, which is still a very large number across a site and is the honest case for a dynamic cone penetrometer or a plate test at a few locations. Run the comparison here rather than taking a rule of thumb. The correlation to resilient modulus, fifteen hundred times CBR, is the bridge to pavement design, and it is worth knowing its limits: it is reasonable for fine-grained soils in the low CBR range and drifts badly above about CBR 10, where direct modulus testing is the better basis. This flags when the entered CBR is past that. Geosynthetics change the arithmetic more than anything else on the list. A geogrid at the subgrade interface can cut required thickness substantially by improving load spreading, and on very soft ground a separation geotextile is what stops the rock disappearing into the subgrade over the first season -- a failure mechanism with nothing to do with the thickness chosen. THE REDUCTION IS ENTERED, NOT MODELLED: it must come from the manufacturer's design method and the applicable specification. And the honest limit is a threshold, not a curve. Below about CBR 3 the calculation still returns a thickness and the subgrade will deform under construction traffic anyway. Undercut and replace, chemical stabilization, or a designed working platform is the answer there, and this says so rather than returning a number that implies rock alone will work. A screening estimate. Cover charts differ between agencies and between the construction-platform and the pavement-design cases, and none is shipped. CBR itself is a crude index, sensitive to moisture and compaction at the time of testing: a subgrade tested dry in summer can be far weaker in spring, and the design value should reflect the worst credible condition rather than the tested one. It does not design a pavement, address drainage -- which controls subgrade strength more than anything else does -- or evaluate frost susceptibility and frost depth. The geotechnical investigation, the agency's design manual, and the geotechnical engineer govern.",
  };
}
const subgradeCbrThicknessExample = { inputs: { cbr_pct: 6, wheel_load_lb: 9000, tire_pressure_psi: 80, coverages: 5000, geosynthetic_reduction_pct: 30, alternate_cbr_pct: 3 } };
CIVIL_RENDERERS["subgrade-cbr-thickness"] = _simpleRenderer({
  citation: "Citation: the Corps of Engineers CBR cover equation by name -- thickness = alpha x sqrt( wheel load x ( 1/(8.1 CBR) - 1/(pi x tire pressure) ) ) with the coverage factor alpha = 0.23 log10(coverages) + 0.15 -- and the widely used resilient modulus correlation Mr = 1,500 x CBR, which is reasonable for fine-grained soils at low CBR and drifts above about CBR 10. NO COVER CHART IS SHIPPED; agency charts differ and the applicable one governs. The geosynthetic thickness reduction is ENTERED from the manufacturer's design method. The geotechnical investigation, the agency's design manual, and the geotechnical engineer govern.",
  example: subgradeCbrThicknessExample.inputs,
  fields: [
    { key: "cbr_pct", label: "Subgrade CBR (%)", kind: "number", default: 6 },
    { key: "wheel_load_lb", label: "Wheel load (lb)", kind: "number", default: 9000 },
    { key: "tire_pressure_psi", label: "Tire pressure (psi)", kind: "number", default: 80 },
    { key: "coverages", label: "Design coverages (passes)", kind: "number", default: 5000 },
    { key: "geosynthetic_reduction_pct", label: "Geosynthetic thickness reduction (%, 0 for none)", kind: "number", default: 30 },
    { key: "alternate_cbr_pct", label: "Comparison CBR to test the sensitivity (%, 0 to skip)", kind: "number", default: 3 },
  ],
  outputs: [
    { key: "t", id: "sct-out-t", label: "Required aggregate cover", value: (r) => fmt(r.thickness_in, 1) + " in at CBR " + fmt(r.cbr_pct, 1) + ", including a coverage factor of " + fmt(r.alpha_factor, 3) + " for " + fmt(r.coverages, 0) + " passes" },
    { key: "g", id: "sct-out-g", label: "With a geosynthetic", value: (r) => r.geosynthetic_reduction_pct === 0 ? "(no reduction entered)" : fmt(r.thickness_with_geosynthetic_in, 1) + " in at the entered " + fmt(r.geosynthetic_reduction_pct, 0) + "% reduction -- " + fmt(r.geosynthetic_saving_in, 1) + " in of rock saved across the whole road" },
    { key: "m", id: "sct-out-m", label: "Resilient modulus", value: (r) => fmt(r.resilient_modulus_psi, 0) + " psi from 1,500 x CBR" + (r.modulus_correlation_reliable ? "" : " -- ABOVE CBR 10, where this correlation drifts badly; test the modulus directly") },
    { key: "s", id: "sct-out-s", label: "Sensitivity to the CBR", value: (r) => r.alternate_thickness_in === null ? "(no comparison CBR entered)" : "at CBR " + fmt(r.alternate_cbr_pct, 1) + " the same load wants " + fmt(r.alternate_thickness_in, 1) + " in, " + fmt(r.sensitivity_ratio, 2) + "x this section -- which is what a penetrometer test at a few locations is worth" },
    { key: "v", id: "sct-out-v", label: "Against the practical floor", value: (r) => r.verdict },
    { key: "n", id: "sct-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSubgradeCbrThickness,
});

// ============ spec-v1615: equivalent single axle loads ============

// The definition of an ESAL: an 18,000 lb single axle. It is the reference the
// load equivalency factor is taken against, not a design choice.
const _STANDARD_AXLE_LB = 18000;

// dims: in { aadt: dimensionless, truck_percent: dimensionless, directional_factor: dimensionless, lane_factor: dimensionless, esals_per_truck: dimensionless, growth_percent: dimensionless, design_life_years: T, car_axle_lb: M L T^-2, overload_axle_lb: M L T^-2 } out: { trucks_per_day_design_lane: dimensionless, first_year_esals: dimensionless, growth_factor: dimensionless, design_esals: dimensionless, car_esals: dimensionless, overload_lef: dimensionless }
export function computeEsalTrafficLoading({ aadt = 0, truck_percent = 0, directional_factor = 0.5, lane_factor = 1.0, esals_per_truck = 0, growth_percent = 0, design_life_years = 0, car_axle_lb = 2000, overload_axle_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(aadt > 0)) return { error: "AADT must be positive." };
  if (!(truck_percent > 0 && truck_percent <= 100)) return { error: "Truck percentage must be greater than zero and no more than 100." };
  if (!(directional_factor > 0 && directional_factor <= 1)) return { error: "The directional distribution factor must be greater than zero and no more than one." };
  if (!(lane_factor > 0 && lane_factor <= 1)) return { error: "The lane distribution factor must be greater than zero and no more than one." };
  if (!(esals_per_truck > 0)) return { error: "ESALs per truck must be positive." };
  if (growth_percent < 0) return { error: "The annual growth rate cannot be negative (%)." };
  if (!(design_life_years > 0)) return { error: "Design life must be positive (years)." };
  if (!(car_axle_lb > 0)) return { error: "The car axle load must be positive (lb)." };
  if (overload_axle_lb < 0) return { error: "The overload axle cannot be negative (lb)." };
  const DAYS_PER_YEAR = 365;
  const AXLES_PER_CAR = 2;
  const lef = (axle_lb) => Math.pow(axle_lb / _STANDARD_AXLE_LB, 4);
  const trucks_per_day_design_lane = aadt * (truck_percent / 100) * directional_factor * lane_factor;
  const first_year_esals = trucks_per_day_design_lane * esals_per_truck * DAYS_PER_YEAR;
  // Compounded growth summed over the design life. At zero growth the sum is
  // simply the number of years, which is the limit of the series.
  const g = growth_percent / 100;
  const growth_factor = g > 0 ? (Math.pow(1 + g, design_life_years) - 1) / g : design_life_years;
  const design_esals = first_year_esals * growth_factor;
  // What the cars contribute, which is the fourth-power law in one comparison.
  const car_lef = lef(car_axle_lb);
  const cars_per_day = aadt * (1 - truck_percent / 100);
  const car_esals = cars_per_day * AXLES_PER_CAR * directional_factor * lane_factor * car_lef * DAYS_PER_YEAR * growth_factor;
  const car_share_pct = design_esals > 0 ? car_esals / (design_esals + car_esals) * 100 : 0;
  const car_vehicle_share_pct = 100 - truck_percent;
  const car_axles_per_standard_axle = car_lef > 0 ? 1 / car_lef : null;
  const overload_lef = overload_axle_lb > 0 ? lef(overload_axle_lb) : null;
  const overload_excess_pct = overload_lef === null ? null : (overload_lef - 1) * 100;
  const outs = [trucks_per_day_design_lane, first_year_esals, growth_factor, design_esals, car_esals, car_lef];
  if (!outs.every(Number.isFinite)) return { error: "ESAL math is not a finite value." };
  return {
    aadt, truck_percent, directional_factor, lane_factor, esals_per_truck,
    growth_percent, design_life_years, trucks_per_day_design_lane, first_year_esals,
    growth_factor, design_esals, car_axle_lb, car_lef, cars_per_day, car_esals,
    car_share_pct, car_vehicle_share_pct, car_axles_per_standard_axle,
    overload_axle_lb, overload_lef, overload_excess_pct, standard_axle_lb: _STANDARD_AXLE_LB,
    note: "Pavement damage goes as roughly the FOURTH POWER of axle load, which means one loaded truck does the damage of thousands of cars. Equivalent single axle loads convert a mixed traffic stream into equivalent 18,000 lb axles, and that conversion is why a road's truck percentage matters far more than its total volume. The fourth power is the fact that reorders every intuition about pavement. A 2,000 lb car axle has a load equivalency factor near 0.00015, so roughly six and a half thousand car axles equal one standard truck axle: a road carrying twenty thousand cars and two hundred trucks a day gets essentially all of its damage from the one percent that are trucks, and widening it for cars does nothing at all for its pavement life. That comparison is computed here rather than asserted, because it is the number that settles arguments about who is wearing out a road. OVERLOAD IS THE SAME FACT POINTED AT ENFORCEMENT. An axle at 22,000 lb rather than 18,000 does about 2.23 times the damage -- more than double for a twenty-two percent overload -- which is the arithmetic behind weight enforcement and why a few overloaded vehicles consume a pavement's design life quickly. THE GROWTH TERM COMPOUNDS AND IS EASY TO UNDERSTATE. Two percent annual growth over a twenty year design life is a factor of only 1.22 on the final year's traffic, but a factor of about 24.3 on the cumulative loading against one year's -- and using first-year traffic without the growth series badly undersizes a pavement. At zero growth that factor is simply the number of years, which is a useful check on the arithmetic. An estimate using factors the reader supplies. The fourth-power rule is a simplification: the published AASHTO load equivalency factors depend on axle configuration -- single, tandem, tridem -- on the pavement's own structural number, and on the terminal serviceability, and they give different values than a plain fourth power. Truck classification and axle load distributions should come from weigh-in-motion or classification counts rather than from assumed averages, because a site's actual loading spectrum drives the answer more than anything else here. Growth rates projected over twenty years are uncertain by their nature. This does not design a pavement, and mechanistic-empirical design does not use these at all -- it takes the load spectrum directly, which is one reason agencies are moving away from the method. The agency's pavement design manual, the traffic data, and the pavement engineer govern.",
  };
}
const esalTrafficLoadingExample = { inputs: { aadt: 12000, truck_percent: 6, directional_factor: 0.5, lane_factor: 0.9, esals_per_truck: 1.2, growth_percent: 2, design_life_years: 20, car_axle_lb: 2000, overload_axle_lb: 22000 } };
CIVIL_RENDERERS["esal-traffic-loading"] = _simpleRenderer({
  citation: "Citation: the AASHTO load equivalency concept and the fourth-power approximation by name -- load equivalency factor = (axle load / 18,000 lb) to the fourth power -- with design lane ESALs = AADT x truck fraction x directional factor x lane factor x ESALs per truck x 365 x the compounded growth series ((1+g)^n - 1)/g. The published AASHTO factors depend on axle configuration, structural number and terminal serviceability and differ from a plain fourth power. ESALs per truck, the distribution factors and the growth rate are ENTERED, ideally from weigh-in-motion or classification counts. The agency's pavement design manual, the traffic data, and the pavement engineer govern.",
  example: esalTrafficLoadingExample.inputs,
  fields: [
    { key: "aadt", label: "AADT (both directions)", kind: "number", default: 12000 },
    { key: "truck_percent", label: "Trucks (%)", kind: "number", default: 6 },
    { key: "directional_factor", label: "Directional distribution factor (0 to 1)", kind: "number", default: 0.5 },
    { key: "lane_factor", label: "Lane distribution factor (0 to 1)", kind: "number", default: 0.9 },
    { key: "esals_per_truck", label: "ESALs per truck", kind: "number", default: 1.2 },
    { key: "growth_percent", label: "Annual traffic growth (%)", kind: "number", default: 2 },
    { key: "design_life_years", label: "Design life (years)", kind: "number", default: 20 },
    { key: "car_axle_lb", label: "Car axle load for the comparison (lb)", kind: "number", default: 2000 },
    { key: "overload_axle_lb", label: "Overload axle to test (lb, 0 to skip)", kind: "number", default: 22000 },
  ],
  outputs: [
    { key: "t", id: "etl-out-t", label: "Trucks per day in the design lane", value: (r) => fmt(r.trucks_per_day_design_lane, 0) + " of " + fmt(r.aadt, 0) + " AADT" },
    { key: "f", id: "etl-out-f", label: "First-year ESALs", value: (r) => fmt(r.first_year_esals, 0) },
    { key: "g", id: "etl-out-g", label: "Growth factor", value: (r) => fmt(r.growth_factor, 2) + " over " + fmt(r.design_life_years, 0) + " years at " + fmt(r.growth_percent, 1) + "% -- NOT " + fmt(Math.pow(1 + r.growth_percent / 100, r.design_life_years), 2) + ", which is only the final year's traffic" },
    { key: "d", id: "etl-out-d", label: "Design lane ESALs", value: (r) => fmt(r.design_esals, 0) + " over the design life" },
    { key: "c", id: "etl-out-c", label: "What the cars contribute", value: (r) => fmt(r.car_esals, 0) + " ESALs, " + fmt(r.car_share_pct, 2) + "% of the total, from " + fmt(r.car_vehicle_share_pct, 0) + "% of the vehicles -- it takes " + fmt(r.car_axles_per_standard_axle, 0) + " car axles to equal one standard axle" },
    { key: "o", id: "etl-out-o", label: "Overload", value: (r) => r.overload_lef === null ? "(no overload axle entered)" : "an axle at " + fmt(r.overload_axle_lb, 0) + " lb does " + fmt(r.overload_lef, 2) + "x the damage of the 18,000 lb standard -- " + fmt(r.overload_excess_pct, 0) + "% more, for a " + fmt((r.overload_axle_lb / r.standard_axle_lb - 1) * 100, 0) + "% overload" },
    { key: "n", id: "etl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEsalTrafficLoading,
});
