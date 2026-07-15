// =====================================================================
// calc-fab.js - Pipe & conduit fabrication bench (Groups G + A).
//
// Originally split out of calc-cross.js (which had reached its gzip cap)
// per the standing module-size remediation, this module holds the
// fabrication tiles that bend and fit a pipe or conduit run: the spec-v26
// pipefitter's bench (fitting take-out, multi-piece miter, wraparound
// template, flange bolt-up torque) and the spec-v39 conduit-bending suite
// relocated from calc-electrical.js (conduit-offset, conduit-saddle,
// conduit-90-stub). The pipe/flange tiles are Group G; the conduit tiles
// keep group: "A" (electrical) -- a tile's group letter is independent of
// its module (the spec-v28 / v36 / v39 precedent).
//
// spec-v56 split this module: when calc-fab reached 96% of its gzip cap
// after the layout family grew (bolt-circle, sine-bar, thread-pitch,
// circular-arc, circle-from-3-points, polygon-miter, decimal-to-fraction,
// center-of-gravity-2point), those eight layout / shop-geometry tiles
// moved to the new calc-layout.js, the same per-tile-split remediation
// spec-v36 / v39 applied to calc-cross / calc-electrical. Nothing about
// any tile's behavior changed; only the on-disk module layout did.
//
// Pure exported compute functions plus their renderers and the
// FAB_RENDERERS map, mirroring every other calc-*.js module.
// =====================================================================

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
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

export const FAB_RENDERERS = {};

// =====================================================================
// spec-v26 Part III - Group G: the pipefitter's bench (4 tiles)
// Fitting take-out cut length, multi-piece miter, wraparound template
// ordinates, and flange bolt-up torque. Author-original first-principles
// trig; take-out / K-factor / target preload are product-/spec-specific
// and user-supplied. Cross-links rolling-offset, conduit-offset,
// pipe-expansion-loop.
// =====================================================================

// dims: in { center_to_center_in: L, takeout_a_in: L, takeout_b_in: L, makeup_a_in: L, makeup_b_in: L } out: { cut_length_in: L }
export function computePipeFittingTakeout({ reference = "center-to-center", dimension_in = 0, takeout_a_in = 0, takeout_b_in = 0, makeup_a_in = 0, makeup_b_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dim = Number(dimension_in);
  const toA = Number(takeout_a_in) || 0, toB = Number(takeout_b_in) || 0;
  const muA = Number(makeup_a_in) || 0, muB = Number(makeup_b_in) || 0;
  if (!(dim > 0)) return { error: "Run dimension must be positive (in)." };
  if (toA < 0 || toB < 0 || muA < 0 || muB < 0) return { error: "Take-out and make-up must be non-negative." };
  const isFaceToFace = String(reference) === "face-to-face";
  // Center-to-center subtracts the fitting take-outs and adds back thread
  // make-up (or weld gap). Face-to-face already lands on the fitting faces,
  // so only make-up / weld gap applies (no take-out subtraction).
  const takeout_total = isFaceToFace ? 0 : (toA + toB);
  const makeup_total = muA + muB;
  const cut_length_in = dim - takeout_total + makeup_total;
  const notes = [];
  if (cut_length_in <= 0) notes.push("Computed cut length is " + fmt(cut_length_in, 3) + " in: the fittings consume the whole run - impractical, verify the dimension and take-outs.");
  if (!isFaceToFace && (muA > toA || muB > toB)) notes.push("Thread make-up exceeds the take-out at an end (over-engagement): verify the fitting and engagement.");
  notes.push("Reference is " + reference + ". Take-out and thread make-up are product-/schedule-specific and user-supplied; confirm against your fittings and the spool drawing.");
  return { reference: String(reference), dimension_in: dim, takeout_total_in: takeout_total, makeup_total_in: makeup_total, cut_length_in, impractical: cut_length_in <= 0, notes };
}

export const pipeFittingTakeoutExample = { inputs: { reference: "center-to-center", dimension_in: 24, takeout_a_in: 1.5, takeout_b_in: 1.5, makeup_a_in: 0.5, makeup_b_in: 0.5 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderPipeFittingTakeout(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Fitting take-out / make-up cut-length layout as taught in NCCER Pipefitting and the standard fitter's references, by name; first-principles. Fitting take-out and thread make-up are product- and schedule-specific and user-supplied; confirm against your fittings and the spool drawing. Cross-links rolling-offset and conduit-offset.";
  const ref = makeSelect("Reference dimension", "pft-ref", [
    { value: "center-to-center", label: "Center-to-center", selected: true },
    { value: "face-to-face", label: "Face-to-face" },
  ]);
  const dim = makeNumber("Run dimension (in)", "pft-dim", { step: "any", min: "0" });
  const toA = makeNumber("Take-out end A (in)", "pft-toa", { step: "any", min: "0" });
  const toB = makeNumber("Take-out end B (in)", "pft-tob", { step: "any", min: "0" });
  const muA = makeNumber("Make-up / weld gap end A (in)", "pft-mua", { step: "any", min: "0" });
  const muB = makeNumber("Make-up / weld gap end B (in)", "pft-mub", { step: "any", min: "0" });
  for (const f of [ref, dim, toA, toB, muA, muB]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "center-to-center"; dim.input.value = "24"; toA.input.value = "1.5"; toB.input.value = "1.5"; muA.input.value = "0.5"; muB.input.value = "0.5"; update(); });

  const oCut = makeOutputLine(outputRegion, "Cut length (in)", "pft-out-cut");
  const oTerms = makeOutputLine(outputRegion, "Deductions", "pft-out-terms");
  const oNote = makeOutputLine(outputRegion, "Notes", "pft-out-note");

  const update = debounce(() => {
    const r = computePipeFittingTakeout({
      reference: ref.select.value,
      dimension_in: Number(dim.input.value) || 0,
      takeout_a_in: Number(toA.input.value) || 0,
      takeout_b_in: Number(toB.input.value) || 0,
      makeup_a_in: Number(muA.input.value) || 0,
      makeup_b_in: Number(muB.input.value) || 0,
    });
    if (r.error) { oCut.textContent = r.error; oTerms.textContent = "-"; oNote.textContent = ""; return; }
    oCut.textContent = fmt(r.cut_length_in, 3) + " in" + (r.impractical ? " (impractical)" : "");
    oTerms.textContent = "dim " + fmt(r.dimension_in, 2) + " - take-out " + fmt(r.takeout_total_in, 2) + " + make-up " + fmt(r.makeup_total_in, 2) + " in";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [dim.input, toA.input, toB.input, muA.input, muB.input]) f.addEventListener("input", update);
  ref.select.addEventListener("change", update);
}
FAB_RENDERERS["pipe-fitting-takeout"] = _v26renderPipeFittingTakeout;

// dims: in { total_angle_deg: dimensionless, pieces: dimensionless, outside_diameter_in: L, centerline_radius_in: L } out: { miter_angle_deg: dimensionless, cutback_in: L, gore_centerline_in: L }
export function computePipeMiterCut({ total_angle_deg = 90, pieces = 2, outside_diameter_in = 0, centerline_radius_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const A = Number(total_angle_deg);
  const n = Number(pieces);
  const OD = Number(outside_diameter_in);
  if (!Number.isInteger(n) || n < 2) return { error: "Pieces must be an integer of 2 or more." };
  if (!(A > 0) || !(A < 180)) return { error: "Total turn angle must be between 0 and 180 degrees." };
  if (!(OD > 0)) return { error: "Outside diameter must be positive (in)." };
  const cuts = n - 1;
  const miter_angle_deg = A / (2 * cuts);
  const notes = [];
  if (miter_angle_deg >= 90) { notes.push("Miter angle reaches 90 degrees (degenerate flat cut): cutback is unbounded."); return { total_angle_deg: A, pieces: n, n_welds: cuts, miter_angle_deg, cutback_in: null, degenerate: true, notes }; }
  const cutback_in = OD * Math.tan(miter_angle_deg * Math.PI / 180);
  const R = Number(centerline_radius_in) || 0;
  // Centerline length of a full intermediate gore; end pieces are half this.
  const gore_centerline_in = R > 0 ? R * (A / cuts) * Math.PI / 180 : null;
  notes.push(cuts + " cut(s)/weld(s); cut angle " + fmt(miter_angle_deg, 3) + " deg from square; cutback = OD*tan(theta). End pieces are half-gores. The welding procedure, bevel, and engineer of record govern.");
  return { total_angle_deg: A, pieces: n, n_welds: cuts, miter_angle_deg, cutback_in, gore_centerline_in, degenerate: false, notes };
}

export const pipeMiterCutExample = { inputs: { total_angle_deg: 90, pieces: 3, outside_diameter_in: 12.75, centerline_radius_in: 18 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderPipeMiterCut(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Multi-piece (lobster-back) miter-elbow geometry - the per-cut miter angle A/(2*(n-1)) and the OD*tan(theta) cutback - as taught in NCCER Pipefitting and the standard fabrication references, by name; first-principles geometry. The welding procedure, the bevel, and the engineer of record govern the fabricated fitting.";
  const a = makeNumber("Total turn angle (deg)", "pmc-a", { step: "any", min: "0", max: "180" });
  const n = makeNumber("Number of pieces (>= 2)", "pmc-n", { step: "1", min: "2" });
  const od = makeNumber("Pipe outside diameter (in)", "pmc-od", { step: "any", min: "0" });
  const r = makeNumber("Centerline radius (in, optional)", "pmc-r", { step: "any", min: "0" });
  for (const f of [a, n, od, r]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "90"; n.input.value = "3"; od.input.value = "12.75"; r.input.value = "18"; update(); });

  const oAng = makeOutputLine(outputRegion, "Miter angle per cut (deg)", "pmc-out-ang");
  const oWelds = makeOutputLine(outputRegion, "Welds (cuts)", "pmc-out-w");
  const oCut = makeOutputLine(outputRegion, "Cutback (in)", "pmc-out-cb");
  const oGore = makeOutputLine(outputRegion, "Gore centerline (in)", "pmc-out-g");
  const oNote = makeOutputLine(outputRegion, "Notes", "pmc-out-note");

  const update = debounce(() => {
    const res = computePipeMiterCut({ total_angle_deg: Number(a.input.value) || 0, pieces: Number(n.input.value) || 0, outside_diameter_in: Number(od.input.value) || 0, centerline_radius_in: Number(r.input.value) || 0 });
    if (res.error) { oAng.textContent = res.error; oWelds.textContent = "-"; oCut.textContent = "-"; oGore.textContent = "-"; oNote.textContent = ""; return; }
    oAng.textContent = fmt(res.miter_angle_deg, 3) + " deg";
    oWelds.textContent = String(res.n_welds);
    oCut.textContent = res.cutback_in === null ? "(degenerate)" : fmt(res.cutback_in, 3) + " in";
    oGore.textContent = res.gore_centerline_in === null || res.gore_centerline_in === undefined ? "(enter radius)" : fmt(res.gore_centerline_in, 3) + " in";
    oNote.textContent = res.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [a.input, n.input, od.input, r.input]) f.addEventListener("input", update);
}
FAB_RENDERERS["pipe-miter-cut"] = _v26renderPipeMiterCut;

// dims: in { outside_diameter_in: L, cut_angle_deg: dimensionless, stations: dimensionless } out: { circumference_in: L, max_ordinate_in: L }
export function computePipeTemplateWrap({ outside_diameter_in = 0, cut_angle_deg = 0, stations = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const OD = Number(outside_diameter_in);
  const alpha = Number(cut_angle_deg);
  const N = Number(stations);
  if (!(OD > 0)) return { error: "Outside diameter must be positive (in)." };
  if (!Number.isInteger(N) || N < 4) return { error: "Use at least 4 equal stations to scribe a usable template." };
  if (!(alpha >= 0) || !(alpha < 90)) return { error: "Cut angle must be in [0, 90) degrees from square." };
  const circumference_in = Math.PI * OD;
  const tanA = Math.tan(alpha * Math.PI / 180);
  const max_ordinate_in = OD * tanA;
  const ordinates = [];
  for (let k = 0; k < N; k++) {
    const phi = (2 * Math.PI * k) / N;
    const y = (OD / 2) * tanA * (1 - Math.cos(phi));
    ordinates.push({ station: k, phi_deg: (360 * k) / N, ordinate_in: y });
  }
  const notes = [];
  if (alpha === 0) notes.push("Square cut: all ordinates are zero.");
  notes.push("Wrap a tape with " + N + " equal marks around the circumference (" + fmt(circumference_in, 3) + " in); mark each ordinate back from the reference line. The bevel and fit-up govern the finished joint.");
  return { outside_diameter_in: OD, cut_angle_deg: alpha, stations: N, circumference_in, max_ordinate_in, ordinates, notes };
}

export const pipeTemplateWrapExample = { inputs: { outside_diameter_in: 6.625, cut_angle_deg: 45, stations: 8 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderPipeTemplateWrap(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The pipefitter's wraparound (ordinate) method for marking an angled pipe cut, y = (OD/2)*tan(alpha)*(1 - cos(phi)), as taught in NCCER Pipefitting and the standard layout references, by name; first-principles geometry. A layout aid - the bevel and fit-up govern the finished joint.";
  const od = makeNumber("Pipe outside diameter (in)", "ptw-od", { step: "any", min: "0" });
  const ang = makeNumber("Cut angle from square (deg)", "ptw-ang", { step: "any", min: "0", max: "89.9" });
  const st = makeSelect("Stations around circumference", "ptw-st", [
    { value: "8", label: "8", selected: true }, { value: "12", label: "12" }, { value: "16", label: "16" }, { value: "24", label: "24" },
  ]);
  for (const f of [od, ang, st]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "6.625"; ang.input.value = "45"; st.select.value = "8"; update(); });

  const oCirc = makeOutputLine(outputRegion, "Circumference (in)", "ptw-out-c");
  const oMax = makeOutputLine(outputRegion, "Max ordinate (in)", "ptw-out-m");
  const oTable = makeOutputLine(outputRegion, "Ordinates (station: in)", "ptw-out-t");
  const oNote = makeOutputLine(outputRegion, "Notes", "ptw-out-note");

  const update = debounce(() => {
    const r = computePipeTemplateWrap({ outside_diameter_in: Number(od.input.value) || 0, cut_angle_deg: Number(ang.input.value) || 0, stations: Number(st.select.value) });
    if (r.error) { oCirc.textContent = r.error; oMax.textContent = "-"; oTable.textContent = "-"; oNote.textContent = ""; return; }
    oCirc.textContent = fmt(r.circumference_in, 3) + " in";
    oMax.textContent = fmt(r.max_ordinate_in, 3) + " in";
    oTable.textContent = r.ordinates.map((o) => o.station + ": " + fmt(o.ordinate_in, 3)).join(", ");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [od.input, ang.input]) f.addEventListener("input", update);
  st.select.addEventListener("change", update);
}
FAB_RENDERERS["pipe-template-wrap"] = _v26renderPipeTemplateWrap;

// UNC tensile stress areas (in^2) by nominal bolt diameter (in).
const _V26_UNC_TENSILE_AREA = {
  "0.25": 0.0318, "0.3125": 0.0524, "0.375": 0.0775, "0.4375": 0.1063, "0.5": 0.1419,
  "0.5625": 0.182, "0.625": 0.226, "0.75": 0.334, "0.875": 0.462, "1": 0.606,
  "1.125": 0.763, "1.25": 0.969, "1.375": 1.155, "1.5": 1.405,
};
// 8UN tensile stress areas (in^2) for larger flange bolting.
const _V26_8UN_TENSILE_AREA = {
  "1": 0.606, "1.125": 0.790, "1.25": 1.000, "1.375": 1.233, "1.5": 1.492,
  "1.625": 1.78, "1.75": 2.08, "1.875": 2.41, "2": 2.77,
};
const _V26_CROSS_SEQ = {
  4: [1, 3, 2, 4],
  8: [1, 5, 3, 7, 2, 6, 4, 8],
  12: [1, 7, 4, 10, 2, 8, 5, 11, 3, 9, 6, 12],
  16: [1, 9, 5, 13, 3, 11, 7, 15, 2, 10, 6, 14, 4, 12, 8, 16],
};
function _v26crossSequence(n) {
  if (_V26_CROSS_SEQ[n]) return { seq: _V26_CROSS_SEQ[n], standard: true };
  const seq = []; for (let i = 1; i <= n; i++) seq.push(i);
  return { seq, standard: false };
}

// dims: in { bolt_diameter_in: L, bolt_count: dimensionless, tensile_area_in2: L, target_percent_yield: dimensionless, target_stress_ksi: dimensionless, yield_ksi: dimensionless, nut_factor_k: dimensionless } out: { preload_lb: dimensionless, torque_ftlb: dimensionless, torque_nm: dimensionless, stress_pct_yield: dimensionless }
export function computeFlangeBoltTorque({ bolt_diameter_in = 0, thread_series = "UNC", bolt_count = 8, tensile_area_in2 = null, target_percent_yield = 50, target_stress_ksi = null, yield_ksi = 105, nut_factor_k = 0.18 } = {}) {
  const _g = _finiteGuard({ bolt_diameter_in, bolt_count, target_percent_yield, yield_ksi, nut_factor_k }); if (_g) return _g;
  const D = Number(bolt_diameter_in);
  const n = Number(bolt_count);
  const K = Number(nut_factor_k);
  if (!(D > 0)) return { error: "Bolt diameter must be positive (in)." };
  if (!Number.isInteger(n) || n < 2) return { error: "Bolt count must be an integer of 2 or more." };
  if (!(K > 0)) return { error: "Nut factor K must be positive." };
  const Y = Number(yield_ksi);
  if (!(Y > 0)) return { error: "Bolt yield must be positive (ksi)." };

  let A_t = (tensile_area_in2 !== null && tensile_area_in2 !== undefined && tensile_area_in2 !== "") ? Number(tensile_area_in2) : null;
  if (A_t === null) {
    const key = String(D);
    const tbl = String(thread_series) === "8UN" ? _V26_8UN_TENSILE_AREA : _V26_UNC_TENSILE_AREA;
    if (tbl[key] !== undefined) A_t = tbl[key];
  }
  if (!(A_t > 0)) return { error: "Tensile stress area not found for this diameter/series; enter it directly (in^2)." };

  // Target stress: explicit ksi if given, else percent of yield.
  let stress_ksi;
  if (target_stress_ksi !== null && target_stress_ksi !== undefined && target_stress_ksi !== "") {
    stress_ksi = Number(target_stress_ksi);
  } else {
    stress_ksi = (Number(target_percent_yield) / 100) * Y;
  }
  if (!(stress_ksi > 0)) return { error: "Target stress must be positive." };

  const stress_pct_yield = (stress_ksi / Y) * 100;
  const preload_lb = stress_ksi * 1000 * A_t; // ksi*1000 = psi; *in^2 = lb
  const torque_inlb = K * D * preload_lb;
  const torque_ftlb = torque_inlb / 12;
  const torque_nm = torque_inlb * 0.112984829;

  const { seq, standard } = _v26crossSequence(n);
  const notes = [];
  if (stress_pct_yield > 100) notes.push("Target stress (" + fmt(stress_pct_yield, 0) + "% of yield) exceeds bolt yield: over-tension - verify the target and bolt grade.");
  notes.push("Nut factor K = " + fmt(K, 3) + " (lubricated about 0.16-0.20, dry about 0.20-0.25). K, gasket seating stress, and target preload are joint-/lubricant-specific and user-supplied. Per ASME PCC-1 / B16.5; the assembly procedure and engineer of record govern.");
  if (!standard) notes.push("No legacy cross sequence is tabulated for " + n + " bolts; tighten in a cross/star pattern, stepping to the roughly opposite bolt each pass.");

  return {
    bolt_diameter_in: D, bolt_count: n, tensile_area_in2: A_t,
    stress_ksi, stress_pct_yield, yield_ksi: Y, nut_factor_k: K,
    preload_lb, torque_inlb, torque_ftlb, torque_nm,
    tightening_sequence: seq, sequence_is_standard: standard, notes,
  };
}

export const flangeBoltTorqueExample = { inputs: { bolt_diameter_in: 0.75, thread_series: "UNC", bolt_count: 8, target_percent_yield: 50, yield_ksi: 105, nut_factor_k: 0.18 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v26renderFlangeBoltTorque(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bolt-preload torque by the short-form T = K*D*F and the cross/star tightening sequence, per ASME PCC-1 Guidelines for Pressure Boundary Bolted Flange Joint Assembly and the ASME B16.5 flange classes, by name; the nut factor K, gasket seating stress, and target preload are joint- and lubricant-specific and user-supplied. A computational aid - the assembly procedure, gasket manufacturer, and the engineer of record govern the installed torque.";
  const d = makeNumber("Bolt nominal diameter (in)", "fbt-d", { step: "any", min: "0", value: "0.75" });
  const series = makeSelect("Thread series", "fbt-series", [
    { value: "UNC", label: "UNC (coarse)", selected: true }, { value: "8UN", label: "8UN (large flange)" },
  ]);
  const count = makeNumber("Bolt count", "fbt-count", { step: "1", min: "2", value: "8" });
  const at = makeNumber("Tensile area (in^2, optional override)", "fbt-at", { step: "any", min: "0" });
  const pct = makeNumber("Target preload (% of yield)", "fbt-pct", { step: "any", min: "0", value: "50" });
  const yld = makeNumber("Bolt yield (ksi, B7 = 105)", "fbt-yld", { step: "any", min: "0", value: "105" });
  const k = makeNumber("Nut factor K", "fbt-k", { step: "any", min: "0", value: "0.18" });
  d.input.value = "0.75"; count.input.value = "8"; pct.input.value = "50"; yld.input.value = "105"; k.input.value = "0.18";
  for (const f of [d, series, count, at, pct, yld, k]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "0.75"; series.select.value = "UNC"; count.input.value = "8"; at.input.value = ""; pct.input.value = "50"; yld.input.value = "105"; k.input.value = "0.18"; update(); });

  const oPre = makeOutputLine(outputRegion, "Preload per bolt (lb)", "fbt-out-pre");
  const oTq = makeOutputLine(outputRegion, "Torque per bolt", "fbt-out-tq");
  const oStress = makeOutputLine(outputRegion, "Bolt stress (% yield)", "fbt-out-st");
  const oSeq = makeOutputLine(outputRegion, "Tightening sequence", "fbt-out-seq");
  const oNote = makeOutputLine(outputRegion, "Notes", "fbt-out-note");

  const update = debounce(() => {
    const r = computeFlangeBoltTorque({
      bolt_diameter_in: Number(d.input.value) || 0,
      thread_series: series.select.value,
      bolt_count: Number(count.input.value) || 0,
      tensile_area_in2: at.input.value === "" ? null : Number(at.input.value),
      target_percent_yield: Number(pct.input.value) || 0,
      yield_ksi: Number(yld.input.value) || 0,
      nut_factor_k: Number(k.input.value) || 0,
    });
    if (r.error) { oPre.textContent = r.error; oTq.textContent = "-"; oStress.textContent = "-"; oSeq.textContent = "-"; oNote.textContent = ""; return; }
    oPre.textContent = fmt(r.preload_lb, 0) + " lb (A_t " + fmt(r.tensile_area_in2, 4) + " in^2)";
    oTq.textContent = fmt(r.torque_ftlb, 1) + " ft-lb (" + fmt(r.torque_nm, 1) + " N-m)";
    oStress.textContent = fmt(r.stress_pct_yield, 1) + " %";
    oSeq.textContent = r.tightening_sequence.join("-") + (r.sequence_is_standard ? "" : " (generic)");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [d.input, count.input, at.input, pct.input, yld.input, k.input]) f.addEventListener("input", update);
  series.select.addEventListener("change", update);
}
FAB_RENDERERS["flange-bolt-torque"] = _v26renderFlangeBoltTorque;

// =====================================================================
// spec-v39 - v24 conduit-bending suite, relocated from calc-electrical.js
// to relieve that module's gzip cap (it had reached 99.3%). These three
// tiles are first-principles bend/layout geometry -- the conduit analog of
// the pipe-miter / pipe-template tiles already in this bench -- so calc-fab
// (the cross-trade Fabrication & Layout bench) is their natural home. They
// keep group: "A" (electrical); a tile's group letter is independent of its
// module (the spec-v28 / spec-v36 precedent). Behavior is byte-for-byte
// unchanged; only the on-disk module and the FAB_RENDERERS wiring move.
// =====================================================================
// --- v24 conduit bending: offset bend (`conduit-offset`) ---
// First-principles trig: mark spacing = offset / sin(angle); shrink = offset * tan(angle/2).
// dims: in { offset_in: L, angle_deg: dimensionless } out: { mark_spacing_in: L, shrink_in: L, multiplier: dimensionless, shrink_per_in: dimensionless }
export function computeConduitOffset({ offset_in = 0, angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const offset = Number(offset_in) || 0;
  const angle = Number(angle_deg);
  if (!(offset > 0)) return { error: "Offset depth must be greater than zero (in)." };
  if (!(angle > 0) || !(angle < 90)) return { error: "Bend angle must be between 0 and 90 degrees." };
  const rad = angle * Math.PI / 180;
  const sinA = Math.sin(rad);
  if (!(sinA > 0)) return { error: "Bend angle must be between 0 and 90 degrees." };
  const multiplier = 1 / sinA;
  const shrink_per_in = Math.tan(rad / 2);
  const mark_spacing_in = offset * multiplier;
  const shrink_in = offset * shrink_per_in;
  return {
    mark_spacing_in: Number.isFinite(mark_spacing_in) ? mark_spacing_in : null,
    shrink_in: Number.isFinite(shrink_in) ? shrink_in : null,
    multiplier: Number.isFinite(multiplier) ? multiplier : null,
    shrink_per_in: Number.isFinite(shrink_per_in) ? shrink_per_in : null,
    note: "Mark spacing = offset / sin(angle). Shrink uses the exact tan(angle/2); the 0.75x-per-inch rule of thumb is approximate. Confirm bender deduct/shoe figures against your tool.",
  };
}
export const conduitOffsetExample = { inputs: { offset_in: 6, angle_deg: 30 } };

function renderConduitOffset(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Conduit offset bending is first-principles trigonometry taught in the electrical apprenticeship; mark spacing and multipliers follow Ugly's Electrical References and NECA conduit-bending guidance by name. Bender deduct and shoe figures are tool-specific - confirm against your bender. See the cable-bend-radius tile for minimum conductor bend radius. The AHJ governs.";
  const offset = makeNumber("Offset depth (in)", "co-offset", { step: "any", min: "0", value: "6" });
  offset.input.value = "6";
  const angle = makeSelect("Bend angle", "co-angle", [
    { value: "10", label: "10 deg" },
    { value: "22.5", label: "22.5 deg" },
    { value: "30", label: "30 deg", selected: true },
    { value: "45", label: "45 deg" },
    { value: "60", label: "60 deg" },
  ]);
  for (const f of [offset, angle]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { offset.input.value = "6"; angle.select.value = "30"; update(); });
  const oSpace = makeOutputLine(outputRegion, "Distance between marks", "co-out-space");
  const oShrink = makeOutputLine(outputRegion, "Total shrink", "co-out-shrink");
  const oMult = makeOutputLine(outputRegion, "Multiplier / shrink per inch", "co-out-mult");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeConduitOffset({ offset_in: readNum(offset.input), angle_deg: Number(angle.select.value) });
    if (r.error) { oSpace.textContent = r.error; oShrink.textContent = ""; oMult.textContent = ""; return; }
    oSpace.textContent = fmt(r.mark_spacing_in, 2) + " in";
    oShrink.textContent = fmt(r.shrink_in, 3) + " in";
    oMult.textContent = fmt(r.multiplier, 3) + " x  (" + fmt(r.shrink_per_in, 4) + " in/in)";
  }, DEBOUNCE_MS);
  for (const f of [offset.input, angle.select]) f.addEventListener("input", update);
}
FAB_RENDERERS["conduit-offset"] = renderConduitOffset;

// --- v24 conduit bending: saddle bend (`conduit-saddle`) ---
// Three-point uses field multipliers (2.5x for 45/22.5, 2.0x for 60/30) and the 3/16-in-per-inch shrink rule
// for the 45/22.5 case; four-point is two back-to-back offsets each = depth / sin(theta) separated by width.
// dims: in { mode: dimensionless, depth_in: L, preset: dimensionless, width_in: L }
//        out: { mark_spacing_in: L, shrink_in: L, center_bend_deg: dimensionless, outer_bend_deg: dimensionless, width_in: L }
export function computeConduitSaddle({ mode = "three-point", depth_in = 0, preset = "45/22.5", width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const depth = Number(depth_in) || 0;
  if (!(depth > 0)) return { error: "Obstruction depth must be greater than zero (in)." };
  let centerBend, outerBend, fieldMultiplier, shrinkPerIn;
  if (preset === "60/30") { centerBend = 60; outerBend = 30; fieldMultiplier = 2.0; shrinkPerIn = 0.25; }
  else { centerBend = 45; outerBend = 22.5; fieldMultiplier = 2.5; shrinkPerIn = 3 / 16; }
  const outerRad = outerBend * Math.PI / 180;
  const sinOuter = Math.sin(outerRad);
  const exact_csc = sinOuter > 0 ? 1 / sinOuter : null;
  if (mode === "four-point") {
    const width = Number(width_in) || 0;
    if (!(width > 0)) return { error: "For a four-point saddle the obstruction width must be greater than zero (in)." };
    if (!(exact_csc !== null && Number.isFinite(exact_csc))) return { error: "Invalid outer bend angle." };
    const legSpacing = depth * exact_csc;
    return {
      mode: "four-point",
      mark_spacing_in: Number.isFinite(legSpacing) ? legSpacing : null,
      width_in: width,
      center_bend_deg: centerBend,
      outer_bend_deg: outerBend,
      shrink_in: null,
      note: "Four-point saddle = two back-to-back offsets, each leg spacing = depth / sin(outer angle), separated by the obstruction width. Bend all four at the outer angle. Confirm deduct against your bender.",
    };
  }
  // three-point
  const mark_spacing_in = depth * fieldMultiplier;
  const shrink_in = depth * shrinkPerIn;
  return {
    mode: "three-point",
    mark_spacing_in: Number.isFinite(mark_spacing_in) ? mark_spacing_in : null,
    shrink_in: Number.isFinite(shrink_in) ? shrink_in : null,
    center_bend_deg: centerBend,
    outer_bend_deg: outerBend,
    exact_outer_csc: Number.isFinite(exact_csc) ? exact_csc : null,
    note: "Three-point saddle: dial the center bend at " + centerBend + " deg and each outer bend at " + outerBend + " deg. Outer marks sit mark-spacing each side of the center mark using the field multiplier " + fieldMultiplier + "x; shrink uses the field rule (" + (preset === "60/30" ? "1/4" : "3/16") + " in per inch of depth). The exact cosecant of the outer angle is reported separately. Confirm against your bender.",
  };
}
export const conduitSaddleExample = { inputs: { mode: "three-point", depth_in: 3, preset: "45/22.5" } };

function renderConduitSaddle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Conduit saddle bending follows the field multipliers and shrink rules taught in the electrical apprenticeship and documented in Ugly's Electrical References and NECA conduit-bending guidance by name. Bender deduct and shoe figures are tool-specific - confirm against your bender. See the cable-bend-radius tile for minimum conductor bend radius. The AHJ governs.";
  const mode = makeSelect("Saddle type", "cs-mode", [
    { value: "three-point", label: "Three-point", selected: true },
    { value: "four-point", label: "Four-point" },
  ]);
  const depth = makeNumber("Obstruction depth (in)", "cs-depth", { step: "any", min: "0", value: "3" });
  depth.input.value = "3";
  const preset = makeSelect("Bend preset (center/outer)", "cs-preset", [
    { value: "45/22.5", label: "45/22.5 deg", selected: true },
    { value: "60/30", label: "60/30 deg" },
  ]);
  const width = makeNumber("Obstruction width (in, four-point only)", "cs-width", { step: "any", min: "0" });
  for (const f of [mode, depth, preset, width]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "three-point"; depth.input.value = "3"; preset.select.value = "45/22.5"; width.input.value = ""; update(); });
  const oSpace = makeOutputLine(outputRegion, "Mark spacing", "cs-out-space");
  const oShrink = makeOutputLine(outputRegion, "Total shrink / width", "cs-out-shrink");
  const oBends = makeOutputLine(outputRegion, "Bend angles to dial", "cs-out-bends");
  const oNote = makeOutputLine(outputRegion, "Note", "cs-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeConduitSaddle({ mode: mode.select.value, depth_in: readNum(depth.input), preset: preset.select.value, width_in: readNum(width.input) });
    if (r.error) { oSpace.textContent = r.error; oShrink.textContent = ""; oBends.textContent = ""; oNote.textContent = ""; return; }
    if (r.mode === "four-point") {
      oSpace.textContent = fmt(r.mark_spacing_in, 3) + " in per leg from each center";
      oShrink.textContent = "Obstruction width: " + fmt(r.width_in, 2) + " in";
    } else {
      oSpace.textContent = fmt(r.mark_spacing_in, 2) + " in each side of center";
      oShrink.textContent = fmt(r.shrink_in, 4) + " in shrink";
    }
    oBends.textContent = "Center " + fmt(r.center_bend_deg, 1) + " deg, outers " + fmt(r.outer_bend_deg, 1) + " deg";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [mode.select, depth.input, preset.select, width.input]) f.addEventListener("input", update);
}
FAB_RENDERERS["conduit-saddle"] = renderConduitSaddle;

// --- v24 conduit bending: 90-degree stub / back-to-back / segment (`conduit-90-stub`) ---
// stub-up: mark = height - deduct (flag, do not leak negative as valid). back-to-back: second mark = back-to-back dim.
// segment-90: n_shots = ceil(90 / per-shot angle); arc per shot = radius * (per-shot angle in radians).
// dims: in { mode: dimensionless, height_in: L, deduct_in: L, back_to_back_in: L, radius_in: L, per_shot_deg: dimensionless }
//        out: { mark_in: L, second_mark_in: L, n_shots: dimensionless, arc_per_shot_in: L }
export function computeConduit90Stub({ mode = "stub-up", height_in = 0, deduct_in = 0, back_to_back_in = 0, radius_in = 0, per_shot_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (mode === "segment-90") {
    const radius = Number(radius_in) || 0;
    const perShot = Number(per_shot_deg) || 0;
    if (!(radius > 0)) return { error: "Bend radius must be greater than zero (in)." };
    if (!(perShot > 0)) return { error: "Per-shot angle must be greater than zero (deg)." };
    const n_shots = Math.ceil(90 / perShot);
    const arc_per_shot_in = radius * (perShot * Math.PI / 180);
    const residual_deg = 90 - perShot * Math.floor(90 / perShot);
    return {
      mode: "segment-90",
      n_shots: Number.isFinite(n_shots) ? n_shots : null,
      arc_per_shot_in: Number.isFinite(arc_per_shot_in) ? arc_per_shot_in : null,
      residual_deg: Number.isFinite(residual_deg) ? residual_deg : null,
      note: "Segment 90: " + n_shots + " shots of " + perShot + " deg" + (residual_deg > 0 ? " (last shot covers the " + residual_deg + " deg residual since 90 is not divisible by the per-shot angle)" : "") + ". Arc length per shot = radius * angle(rad). Confirm against your bender.",
    };
  }
  const height = Number(height_in) || 0;
  const deduct = Number(deduct_in) || 0;
  if (!(height > 0)) return { error: "Stub height must be greater than zero (in)." };
  if (!(deduct >= 0)) return { error: "Bender deduct/take-up must be zero or greater (in)." };
  const mark_in = height - deduct;
  const impractical = mark_in < 0;
  if (mode === "back-to-back") {
    const b2b = Number(back_to_back_in) || 0;
    if (!(b2b > 0)) return { error: "Back-to-back dimension must be greater than zero (in)." };
    return {
      mode: "back-to-back",
      mark_in: Number.isFinite(mark_in) ? mark_in : null,
      second_mark_in: Number.isFinite(b2b) ? b2b : null,
      impractical: impractical,
      note: (impractical ? "Stub mark is negative (deduct exceeds height) - impractical, not a valid bend; pick a larger stub or smaller conduit. " : "") + "First mark = height - deduct; second mark at the back-to-back dimension, bent in the opposite direction. Confirm deduct against your bender.",
    };
  }
  return {
    mode: "stub-up",
    mark_in: Number.isFinite(mark_in) ? mark_in : null,
    impractical: impractical,
    note: (impractical ? "Stub mark is negative (deduct exceeds height) - impractical, not a valid bend; pick a larger stub or smaller conduit. " : "") + "Mark = stub height - bender deduct/take-up. Place the bender arrow at the mark. Confirm deduct against your bender.",
  };
}
export const conduit90StubExample = { inputs: { mode: "stub-up", height_in: 8, deduct_in: 6 } };

function renderConduit90Stub(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Conduit 90-degree stub, back-to-back, and segmented bends are first-principles geometry taught in the electrical apprenticeship; deduct/take-up figures (EMT 1/2 in ~5, 3/4 in ~6, 1 in ~8, 1-1/4 in ~11) are tool-specific - confirm against your bender per Ugly's Electrical References and NECA conduit-bending guidance by name. See the cable-bend-radius tile for minimum conductor bend radius. The AHJ governs.";
  const mode = makeSelect("Mode", "c90-mode", [
    { value: "stub-up", label: "Stub-up", selected: true },
    { value: "back-to-back", label: "Back-to-back" },
    { value: "segment-90", label: "Segmented 90" },
  ]);
  const height = makeNumber("Stub height (in)", "c90-height", { step: "any", min: "0", value: "8" });
  height.input.value = "8";
  const deduct = makeSelect("Bender deduct/take-up", "c90-deduct", [
    { value: "5", label: "EMT 1/2 in (deduct 5)" },
    { value: "6", label: "EMT 3/4 in (deduct 6)", selected: true },
    { value: "8", label: "EMT 1 in (deduct 8)" },
    { value: "11", label: "EMT 1-1/4 in (deduct 11)" },
  ]);
  const b2b = makeNumber("Back-to-back dim (in, back-to-back only)", "c90-b2b", { step: "any", min: "0" });
  const radius = makeNumber("Bend radius (in, segment only)", "c90-radius", { step: "any", min: "0" });
  const perShot = makeNumber("Per-shot angle (deg, segment only)", "c90-pershot", { step: "any", min: "0" });
  for (const f of [mode, height, deduct, b2b, radius, perShot]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "stub-up"; height.input.value = "8"; deduct.select.value = "6"; b2b.input.value = ""; radius.input.value = ""; perShot.input.value = ""; update(); });
  const oMark = makeOutputLine(outputRegion, "Mark / shots", "c90-out-mark");
  const oSecond = makeOutputLine(outputRegion, "Second mark / arc per shot", "c90-out-second");
  const oNote = makeOutputLine(outputRegion, "Note", "c90-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeConduit90Stub({
      mode: mode.select.value, height_in: readNum(height.input), deduct_in: Number(deduct.select.value),
      back_to_back_in: readNum(b2b.input), radius_in: readNum(radius.input), per_shot_deg: readNum(perShot.input),
    });
    if (r.error) { oMark.textContent = r.error; oSecond.textContent = ""; oNote.textContent = ""; return; }
    if (r.mode === "segment-90") {
      oMark.textContent = r.n_shots + " shots";
      oSecond.textContent = fmt(r.arc_per_shot_in, 3) + " in arc per shot";
    } else if (r.mode === "back-to-back") {
      oMark.textContent = (r.impractical ? "IMPRACTICAL " : "") + fmt(r.mark_in, 2) + " in (first mark)";
      oSecond.textContent = fmt(r.second_mark_in, 2) + " in (second mark)";
    } else {
      oMark.textContent = (r.impractical ? "IMPRACTICAL " : "") + fmt(r.mark_in, 2) + " in";
      oSecond.textContent = "";
    }
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [mode.select, height.input, deduct.select, b2b.input, radius.input, perShot.input]) f.addEventListener("input", update);
}
FAB_RENDERERS["conduit-90-stub"] = renderConduit90Stub;

// --- spec-v85 welding gas / cutting / consumable-cost bench (4 tiles, Group E) ---
// weld-usage (calc-construction) does the deposit metallurgy; carbon-equivalent
// recommends the preheat temperature. These four equip the business side a shop
// estimator runs: how long a gas cylinder lasts, what an oxy-fuel cut consumes,
// what fuel it takes to reach the preheat temperature, and what a foot of weld
// costs. Placed in calc-fab.js to keep the near-cap calc-construction.js from
// growing. Sources named, not reproduced: the torch / regulator maker's tip and
// flow charts, the AWS welding cost and consumable references, the specific heat
// of carbon steel (about 0.11 Btu/lb-degF), and the heating value of propane
// (about 21,600 Btu/lb, 91,500 Btu/gal).

// dims: in { flow_cfh: dimensionless, arc_on_min: T, cylinder_ft3: L^3, gas_cost: dimensionless } out: { gas_used_ft3: L^3, runtime_hr_per_cyl: T, cylinders_needed: dimensionless, job_gas_cost: dimensionless }
export function computeShieldingGasRuntime({ flow_cfh, arc_on_min, cylinder_ft3, gas_cost = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flow = Number(flow_cfh);
  const arcOn = Number(arc_on_min);
  const cyl = Number(cylinder_ft3);
  const cost = Number(gas_cost) || 0;
  if (!(flow > 0)) return { error: "Gas flow must be positive (cfh)." };
  if (!(arcOn > 0)) return { error: "Arc-on time must be positive (min)." };
  if (!(cyl > 0)) return { error: "Cylinder volume must be positive (ft3)." };
  const gasUsed = flow * arcOn / 60;
  const runtimePerCyl = cyl / flow;
  const cylindersNeeded = Math.ceil(gasUsed / cyl);
  const jobGasCost = cost > 0 ? (gasUsed / cyl) * cost : null;
  return {
    gas_used_ft3: gasUsed,
    runtime_hr_per_cyl: runtimePerCyl,
    cylinders_needed: cylindersNeeded,
    job_gas_cost: jobGasCost,
    note: "weld-usage gives the gas volume from the weld geometry; this turns a flow setting and arc-on time into bottle runtime, count, and cost; set the flow to the gun and the joint, not higher -- excess gas wastes money and causes turbulence and porosity, not better coverage; the cylinder volume is the USABLE gas (a '330' cylinder holds about 251 ft3 of argon mix); and a draft steals coverage, so a windscreen beats cranking the flow.",
  };
}

// dims: in { oxygen_cfh: dimensionless, fuel_cfh: dimensionless, cut_length_in: L, cut_speed_ipm: dimensionless, oxygen_cyl_ft3: L^3, fuel_cyl_ft3: L^3 } out: { cut_time_min: T, oxygen_used_ft3: L^3, fuel_used_ft3: L^3, oxygen_runtime_hr: T, fuel_runtime_hr: T }
export function computeOxyfuelCuttingGas({ oxygen_cfh, fuel_cfh, cut_length_in, cut_speed_ipm, oxygen_cyl_ft3 = 244, fuel_cyl_ft3 = 330 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const oxygen = Number(oxygen_cfh);
  const fuel = Number(fuel_cfh);
  const cutLength = Number(cut_length_in);
  const cutSpeed = Number(cut_speed_ipm);
  const oxyCyl = Number(oxygen_cyl_ft3);
  const fuelCyl = Number(fuel_cyl_ft3);
  if (!(oxygen > 0)) return { error: "Cutting-oxygen flow must be positive (cfh)." };
  if (!(fuel > 0)) return { error: "Fuel-gas flow must be positive (cfh)." };
  if (!(cutLength > 0)) return { error: "Cut length must be positive (in)." };
  if (!(cutSpeed > 0)) return { error: "Cut speed must be positive (ipm)." };
  if (!(oxyCyl > 0)) return { error: "Oxygen cylinder volume must be positive (ft3)." };
  if (!(fuelCyl > 0)) return { error: "Fuel cylinder volume must be positive (ft3)." };
  const cutTime = cutLength / cutSpeed;
  const oxygenUsed = oxygen * cutTime / 60;
  const fuelUsed = fuel * cutTime / 60;
  return {
    cut_time_min: cutTime,
    oxygen_used_ft3: oxygenUsed,
    fuel_used_ft3: fuelUsed,
    oxygen_runtime_hr: oxyCyl / oxygen,
    fuel_runtime_hr: fuelCyl / fuel,
    note: "Oxygen does the cutting by oxidizing the steel, so it dominates consumption and runs out first; acetylene withdrawal is limited to about a seventh of the cylinder volume per hour or the acetone solvent carries over -- run propane or manifold the cylinders for a high draw; the tip chart from the torch maker sets the real flows and speeds; and oxy-fuel cuts carbon steel only, not stainless or aluminum.",
  };
}

// dims: in { steel_lb: M, start_temp_F: T, preheat_temp_F: T, efficiency_pct: dimensionless, c_steel: dimensionless, propane_btu_lb: dimensionless } out: { heat_needed_btu: M L^2 T^-2, fuel_btu: M L^2 T^-2, propane_lb: M, propane_gal: L^3 }
export function computeWeldPreheatFuel({ steel_lb, start_temp_F, preheat_temp_F, efficiency_pct = 25, c_steel = 0.11, propane_btu_lb = 21600 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const steel = Number(steel_lb);
  const start = Number(start_temp_F);
  const preheat = Number(preheat_temp_F);
  const eff = Number(efficiency_pct);
  const c = Number(c_steel);
  const propaneBtuLb = Number(propane_btu_lb);
  if (!(steel > 0)) return { error: "Steel mass must be positive (lb)." };
  if (!(eff > 0)) return { error: "Efficiency must be positive (%)." };
  if (!(c > 0)) return { error: "Specific heat must be positive (Btu/lb-degF)." };
  if (!(propaneBtuLb > 0)) return { error: "Propane heating value must be positive (Btu/lb)." };
  if (!(preheat > start)) return { error: "Preheat temperature must be above the start temperature." };
  const heatNeeded = steel * c * (preheat - start);
  const fuelBtu = heatNeeded / (eff / 100);
  return {
    heat_needed_btu: heatNeeded,
    fuel_btu: fuelBtu,
    propane_lb: fuelBtu / propaneBtuLb,
    propane_gal: fuelBtu / 91500,
    note: "Only the steel near the joint needs to reach temperature, but heat conducts away fast, so the efficiency of an open torch on a plate is low (roughly 15 to 30%) -- an enclosed heat, a heating blanket, or induction is far higher; hold the preheat through the weld and verify the interpass temperature with a crayon or pyrometer; and the preheat TEMPERATURE comes from carbon-equivalent or the WPS, this tile only sizes the FUEL to reach it.",
  };
}

// dims: in { deposit_lb_per_ft: M, deposition_eff_pct: dimensionless, filler_cost_per_lb: dimensionless, deposition_rate_lb_hr: dimensionless, operating_factor_pct: dimensionless, labor_rate_per_hr: dimensionless, gas_cost_per_ft: dimensionless } out: { consumable_lb_per_ft: M, filler_cost_ft: dimensionless, labor_hr_per_ft: T, labor_cost_ft: dimensionless, total_cost_ft: dimensionless }
export function computeWeldCostPerFoot({ deposit_lb_per_ft, deposition_eff_pct = 95, filler_cost_per_lb = 0, deposition_rate_lb_hr, operating_factor_pct = 30, labor_rate_per_hr = 0, gas_cost_per_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const deposit = Number(deposit_lb_per_ft);
  const eff = Number(deposition_eff_pct);
  const fillerCost = Number(filler_cost_per_lb) || 0;
  const depRate = Number(deposition_rate_lb_hr);
  const opFactor = Number(operating_factor_pct);
  const laborRate = Number(labor_rate_per_hr) || 0;
  const gasPerFt = Number(gas_cost_per_ft) || 0;
  if (!(deposit > 0)) return { error: "Deposit per foot must be positive (lb/ft)." };
  if (!(eff > 0)) return { error: "Deposition efficiency must be positive (%)." };
  if (!(depRate > 0)) return { error: "Deposition rate must be positive (lb/hr)." };
  if (!(opFactor > 0)) return { error: "Operating factor must be positive (%)." };
  const consumablePerFt = deposit / (eff / 100);
  const fillerCostFt = consumablePerFt * fillerCost;
  const arcHrPerFt = deposit / depRate;
  const laborHrPerFt = arcHrPerFt / (opFactor / 100);
  const laborCostFt = laborHrPerFt * laborRate;
  return {
    consumable_lb_per_ft: consumablePerFt,
    filler_cost_ft: fillerCostFt,
    arc_hr_per_ft: arcHrPerFt,
    labor_hr_per_ft: laborHrPerFt,
    labor_cost_ft: laborCostFt,
    total_cost_ft: fillerCostFt + laborCostFt + gasPerFt,
    note: "Labor and the operating factor (arc-on time divided by clock time, typically 20 to 40% for manual welding and higher for mechanized) usually dominate the cost, not the filler; the deposit per foot comes from weld-usage; deposition efficiency is the stub, spatter, and slag loss (SMAW about 60 to 65%, GMAW solid about 90 to 98%, FCAW about 80 to 85%); and a real bid adds shop overhead, grinding, tips, nozzles, and power.",
  };
}

function _v85renderShieldingGasRuntime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: torch / regulator maker's flow charts and the AWS welding cost / consumable references, by name. Gas used = flow x arc-on / 60; runtime per cylinder = cylinder volume / flow. Compressed-gas and hot-work hazards govern; follow the equipment maker's instructions and your site's hot-work permit.";
  const flow = makeNumber("Gas flow (cfh)", "sgr-flow", { step: "any", min: "0" });
  const arcOn = makeNumber("Arc-on time (min)", "sgr-arc", { step: "any", min: "0" });
  const cyl = makeNumber("Usable gas per cylinder (ft3)", "sgr-cyl", { step: "any", min: "0", value: "251" });
  cyl.input.value = "251";
  const cost = makeNumber("Cost per cylinder (optional)", "sgr-cost", { step: "any", min: "0", value: "0" });
  cost.input.value = "0";
  for (const f of [flow, arcOn, cyl, cost]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "35"; arcOn.input.value = "120"; cyl.input.value = "251"; cost.input.value = "60"; update(); });
  const oUsed = makeOutputLine(outputRegion, "Gas used", "sgr-out-used");
  const oRun = makeOutputLine(outputRegion, "Runtime per cylinder", "sgr-out-run");
  const oCyl = makeOutputLine(outputRegion, "Cylinders needed", "sgr-out-cyl");
  const oCost = makeOutputLine(outputRegion, "Gas cost for the job", "sgr-out-cost");
  const update = debounce(() => {
    const r = computeShieldingGasRuntime({
      flow_cfh: Number(flow.input.value) || 0,
      arc_on_min: Number(arcOn.input.value) || 0,
      cylinder_ft3: Number(cyl.input.value) || 0,
      gas_cost: cost.input.value === "" ? 0 : Number(cost.input.value),
    });
    if (r.error) { oUsed.textContent = r.error; for (const o of [oRun, oCyl, oCost]) o.textContent = "-"; return; }
    oUsed.textContent = fmt(r.gas_used_ft3, 1) + " ft3";
    oRun.textContent = fmt(r.runtime_hr_per_cyl, 1) + " hr";
    oCyl.textContent = r.cylinders_needed + " cylinder(s)";
    oCost.textContent = r.job_gas_cost === null ? "n/a (enter a cylinder cost)" : "$" + fmt(r.job_gas_cost, 2);
  }, DEBOUNCE_MS);
  for (const f of [flow, arcOn, cyl, cost]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["shielding-gas-runtime"] = _v85renderShieldingGasRuntime;

function _v85renderOxyfuelCuttingGas(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: torch maker's tip charts, by name. Cut time = length / speed; gas used = flow x cut time / 60. Oxygen does the cutting and runs out first. Compressed-gas, flashback, and hot-work hazards govern; follow the equipment maker's instructions and your site's hot-work permit.";
  const oxygen = makeNumber("Cutting-oxygen flow (cfh)", "ocg-ox", { step: "any", min: "0" });
  const fuel = makeNumber("Preheat fuel-gas flow (cfh)", "ocg-fuel", { step: "any", min: "0" });
  const cutLength = makeNumber("Total cut length (in)", "ocg-len", { step: "any", min: "0" });
  const cutSpeed = makeNumber("Travel speed (ipm)", "ocg-speed", { step: "any", min: "0" });
  const oxyCyl = makeNumber("Oxygen per cylinder (ft3)", "ocg-oxcyl", { step: "any", min: "0", value: "244" });
  oxyCyl.input.value = "244";
  const fuelCyl = makeNumber("Fuel per cylinder (ft3)", "ocg-fuelcyl", { step: "any", min: "0", value: "330" });
  fuelCyl.input.value = "330";
  for (const f of [oxygen, fuel, cutLength, cutSpeed, oxyCyl, fuelCyl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { oxygen.input.value = "55"; fuel.input.value = "12"; cutLength.input.value = "240"; cutSpeed.input.value = "16"; oxyCyl.input.value = "244"; fuelCyl.input.value = "330"; update(); });
  const oTime = makeOutputLine(outputRegion, "Cut time", "ocg-out-time");
  const oOx = makeOutputLine(outputRegion, "Oxygen used", "ocg-out-ox");
  const oFuel = makeOutputLine(outputRegion, "Fuel used", "ocg-out-fuel");
  const oOxRun = makeOutputLine(outputRegion, "Oxygen runtime per cylinder", "ocg-out-oxrun");
  const oFuelRun = makeOutputLine(outputRegion, "Fuel runtime per cylinder", "ocg-out-fuelrun");
  const update = debounce(() => {
    const r = computeOxyfuelCuttingGas({
      oxygen_cfh: Number(oxygen.input.value) || 0,
      fuel_cfh: Number(fuel.input.value) || 0,
      cut_length_in: Number(cutLength.input.value) || 0,
      cut_speed_ipm: Number(cutSpeed.input.value) || 0,
      oxygen_cyl_ft3: oxyCyl.input.value === "" ? 244 : Number(oxyCyl.input.value),
      fuel_cyl_ft3: fuelCyl.input.value === "" ? 330 : Number(fuelCyl.input.value),
    });
    if (r.error) { oTime.textContent = r.error; for (const o of [oOx, oFuel, oOxRun, oFuelRun]) o.textContent = "-"; return; }
    oTime.textContent = fmt(r.cut_time_min, 1) + " min";
    oOx.textContent = fmt(r.oxygen_used_ft3, 1) + " ft3";
    oFuel.textContent = fmt(r.fuel_used_ft3, 1) + " ft3";
    oOxRun.textContent = fmt(r.oxygen_runtime_hr, 1) + " hr";
    oFuelRun.textContent = fmt(r.fuel_runtime_hr, 1) + " hr";
  }, DEBOUNCE_MS);
  for (const f of [oxygen, fuel, cutLength, cutSpeed, oxyCyl, fuelCyl]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["oxyfuel-cutting-gas"] = _v85renderOxyfuelCuttingGas;

function _v85renderWeldPreheatFuel(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: specific heat of carbon steel (about 0.11 Btu/lb-degF) and the heating value of propane (about 21,600 Btu/lb, 91,500 Btu/gal), by name. Heat = mass x specific heat x temperature rise; fuel = heat / efficiency. Hot-work hazards govern; follow the maker's instructions and your site's hot-work permit. Preheat temperature comes from carbon-equivalent or the WPS.";
  const steel = makeNumber("Steel mass to preheat (lb)", "wpf-steel", { step: "any", min: "0" });
  const start = makeNumber("Start temperature (degF)", "wpf-start", { step: "any", value: "70" });
  start.input.value = "70";
  const preheat = makeNumber("Preheat temperature (degF)", "wpf-pre", { step: "any" });
  const eff = makeNumber("Torch-to-part efficiency (%)", "wpf-eff", { step: "any", min: "0", value: "25" });
  eff.input.value = "25";
  for (const f of [steel, start, preheat, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { steel.input.value = "200"; start.input.value = "70"; preheat.input.value = "300"; eff.input.value = "25"; update(); });
  const oHeat = makeOutputLine(outputRegion, "Heat needed in the steel", "wpf-out-heat");
  const oFuel = makeOutputLine(outputRegion, "Fuel energy after efficiency", "wpf-out-fuel");
  const oLb = makeOutputLine(outputRegion, "Propane (lb)", "wpf-out-lb");
  const oGal = makeOutputLine(outputRegion, "Propane (gal)", "wpf-out-gal");
  const update = debounce(() => {
    const r = computeWeldPreheatFuel({
      steel_lb: Number(steel.input.value) || 0,
      start_temp_F: start.input.value === "" ? 70 : Number(start.input.value),
      preheat_temp_F: Number(preheat.input.value) || 0,
      efficiency_pct: eff.input.value === "" ? 25 : Number(eff.input.value),
    });
    if (r.error) { oHeat.textContent = r.error; for (const o of [oFuel, oLb, oGal]) o.textContent = "-"; return; }
    oHeat.textContent = fmt(r.heat_needed_btu, 0) + " Btu";
    oFuel.textContent = fmt(r.fuel_btu, 0) + " Btu";
    oLb.textContent = fmt(r.propane_lb, 2) + " lb";
    oGal.textContent = fmt(r.propane_gal, 2) + " gal";
  }, DEBOUNCE_MS);
  for (const f of [steel, start, preheat, eff]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["weld-preheat-fuel"] = _v85renderWeldPreheatFuel;

function _v85renderWeldCostPerFoot(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AWS welding cost and consumable references, by name. Consumable per foot = deposit / efficiency; labor hr per foot = (deposit / deposition rate) / operating factor. Labor and the operating factor usually dominate, not the filler. AHJ and the licensed professional govern any bid.";
  const deposit = makeNumber("Deposit per foot (lb/ft)", "wcf-dep", { step: "any", min: "0" });
  const eff = makeNumber("Deposition efficiency (%)", "wcf-eff", { step: "any", min: "0", value: "95" });
  eff.input.value = "95";
  const fillerCost = makeNumber("Filler cost ($/lb)", "wcf-fc", { step: "any", min: "0" });
  const depRate = makeNumber("Deposition rate (lb/hr)", "wcf-dr", { step: "any", min: "0" });
  const opFactor = makeNumber("Operating factor (%)", "wcf-of", { step: "any", min: "0", value: "30" });
  opFactor.input.value = "30";
  const laborRate = makeNumber("Labor rate ($/hr)", "wcf-lr", { step: "any", min: "0" });
  const gas = makeNumber("Shielding-gas cost ($/ft, optional)", "wcf-gas", { step: "any", min: "0", value: "0" });
  gas.input.value = "0";
  for (const f of [deposit, eff, fillerCost, depRate, opFactor, laborRate, gas]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { deposit.input.value = "0.10"; eff.input.value = "95"; fillerCost.input.value = "2.50"; depRate.input.value = "8"; opFactor.input.value = "30"; laborRate.input.value = "65"; gas.input.value = "0.05"; update(); });
  const oCons = makeOutputLine(outputRegion, "Consumable per foot", "wcf-out-cons");
  const oFiller = makeOutputLine(outputRegion, "Filler cost per foot", "wcf-out-filler");
  const oLabor = makeOutputLine(outputRegion, "Labor cost per foot", "wcf-out-labor");
  const oTotal = makeOutputLine(outputRegion, "All-in cost per foot", "wcf-out-total");
  const update = debounce(() => {
    const r = computeWeldCostPerFoot({
      deposit_lb_per_ft: Number(deposit.input.value) || 0,
      deposition_eff_pct: eff.input.value === "" ? 95 : Number(eff.input.value),
      filler_cost_per_lb: Number(fillerCost.input.value) || 0,
      deposition_rate_lb_hr: Number(depRate.input.value) || 0,
      operating_factor_pct: opFactor.input.value === "" ? 30 : Number(opFactor.input.value),
      labor_rate_per_hr: Number(laborRate.input.value) || 0,
      gas_cost_per_ft: gas.input.value === "" ? 0 : Number(gas.input.value),
    });
    if (r.error) { oCons.textContent = r.error; for (const o of [oFiller, oLabor, oTotal]) o.textContent = "-"; return; }
    oCons.textContent = fmt(r.consumable_lb_per_ft, 3) + " lb/ft";
    oFiller.textContent = "$" + fmt(r.filler_cost_ft, 2) + "/ft";
    oLabor.textContent = "$" + fmt(r.labor_cost_ft, 2) + "/ft (" + fmt(r.labor_hr_per_ft, 3) + " hr/ft)";
    oTotal.textContent = "$" + fmt(r.total_cost_ft, 2) + "/ft";
  }, DEBOUNCE_MS);
  for (const f of [deposit, eff, fillerCost, depRate, opFactor, laborRate, gas]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["weld-cost-per-foot"] = _v85renderWeldCostPerFoot;

// =====================================================================
// spec-v129..v134 metal-trades batch: weld estimating (deposit volume,
// deposition rate, transverse shrinkage, eccentric weld group), plate
// forming (minimum bend radius), and shop assembly (shrink fit). Group E
// (welding / fabrication / sheet-metal) except shrink-fit, Group G
// (cross-trade fab). First-principles + published-relation tiles; pure
// compute functions, the v18/v21 {error} contract, full v14 dims.
// =====================================================================

// v129 weld-metal-volume (Group E): weld deposit weight, filler consumed, pass count.
// dims: in { joint_type: dimensionless, fillet_leg_in: L, groove_area_in2: L^2, length_in: L, deposition_eff: dimensionless, max_pass_area_in2: L^2 } out: { weld_area_in2: L^2, deposit_in3: L^3, deposit_lb: M, filler_lb: M, passes: dimensionless }
export function computeWeldMetalVolume({ joint_type = "fillet", fillet_leg_in = 0, groove_area_in2 = 0, length_in = 0, deposition_eff = 0.90, max_pass_area_in2 = 0.05 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const leg = Number(fillet_leg_in);
  const grooveArea = Number(groove_area_in2);
  const length = Number(length_in);
  const eff = Number(deposition_eff);
  const maxPass = Number(max_pass_area_in2);
  if (!(length > 0)) return { error: "Weld length must be positive (in)." };
  if (!(eff > 0 && eff <= 1)) return { error: "Deposition efficiency must be in (0, 1]." };
  if (!(maxPass > 0)) return { error: "Max single-pass area must be positive (in2)." };
  if (joint_type === "groove") {
    if (!(grooveArea > 0)) return { error: "Groove area must be positive (in2)." };
  } else if (!(leg > 0)) {
    return { error: "Fillet leg must be positive (in)." };
  }
  const weldArea = joint_type === "groove" ? grooveArea : (leg * leg) / 2;
  const depositIn3 = weldArea * length;
  const depositLb = depositIn3 * 0.2836;
  const fillerLb = depositLb / eff;
  const passes = Math.ceil(weldArea / maxPass);
  return {
    weld_area_in2: weldArea,
    deposit_in3: depositIn3,
    deposit_lb: depositLb,
    filler_lb: fillerLb,
    passes,
    note: "Filler purchased = deposit weight / deposition efficiency -- solid wire runs about 0.90, stick (SMAW) about 0.60 to 0.65, so a stick joint buys far more rod than it deposits; the steel density is 0.2836 lb/in3 (matching metal-weight); pass count is a planning estimate (weld area / max single-pass area, default 0.05 in2). The WPS and the shop's measured deposition efficiency govern the purchase.",
  };
}
export const weldMetalVolumeExample = { inputs: { joint_type: "fillet", fillet_leg_in: 0.3125, length_in: 120, deposition_eff: 0.90, max_pass_area_in2: 0.05 } };

function _v129renderWeldMetalVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles joint geometry and steel density (0.2836 lb/in3), by name. Deposit volume = weld area x length; equal-leg fillet area = leg2 / 2; filler purchased = deposit / deposition efficiency. The WPS and the fabricator's measured deposition efficiency govern.";
  const joint = makeSelect("Joint type", "wmv-joint", [
    { value: "fillet", label: "Fillet (by leg)", selected: true },
    { value: "groove", label: "Groove (by area)" },
  ]);
  const leg = makeNumber("Fillet leg (in, fillet mode)", "wmv-leg", { step: "any", min: "0" });
  const grooveArea = makeNumber("Weld area (in2, groove mode)", "wmv-area", { step: "any", min: "0" });
  const length = makeNumber("Total weld length (in)", "wmv-len", { step: "any", min: "0" });
  const eff = makeNumber("Deposition efficiency (0-1)", "wmv-eff", { step: "any", min: "0", value: "0.90" });
  eff.input.value = "0.90";
  const maxPass = makeNumber("Max single-pass area (in2)", "wmv-pass", { step: "any", min: "0", value: "0.05" });
  maxPass.input.value = "0.05";
  for (const f of [joint, leg, grooveArea, length, eff, maxPass]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { joint.select.value = "fillet"; leg.input.value = "0.3125"; grooveArea.input.value = ""; length.input.value = "120"; eff.input.value = "0.90"; maxPass.input.value = "0.05"; update(); });
  const oArea = makeOutputLine(outputRegion, "Weld cross-section", "wmv-out-area");
  const oDep = makeOutputLine(outputRegion, "Deposit weight", "wmv-out-dep");
  const oFill = makeOutputLine(outputRegion, "Filler purchased", "wmv-out-fill");
  const oPass = makeOutputLine(outputRegion, "Passes (estimate)", "wmv-out-pass");
  const update = debounce(() => {
    const r = computeWeldMetalVolume({
      joint_type: joint.select.value,
      fillet_leg_in: Number(leg.input.value) || 0,
      groove_area_in2: Number(grooveArea.input.value) || 0,
      length_in: Number(length.input.value) || 0,
      deposition_eff: eff.input.value === "" ? 0.90 : Number(eff.input.value),
      max_pass_area_in2: maxPass.input.value === "" ? 0.05 : Number(maxPass.input.value),
    });
    if (r.error) { oArea.textContent = r.error; for (const o of [oDep, oFill, oPass]) o.textContent = "-"; return; }
    oArea.textContent = fmt(r.weld_area_in2, 4) + " in2";
    oDep.textContent = fmt(r.deposit_lb, 2) + " lb (" + fmt(r.deposit_in3, 2) + " in3)";
    oFill.textContent = fmt(r.filler_lb, 2) + " lb";
    oPass.textContent = r.passes + " pass(es)";
  }, DEBOUNCE_MS);
  for (const f of [leg, grooveArea, length, eff, maxPass]) f.input.addEventListener("input", update);
  for (const f of [joint]) f.select.addEventListener("change", update);
}
FAB_RENDERERS["weld-metal-volume"] = _v129renderWeldMetalVolume;

// v130 wire-feed-deposition (Group E): melt-off and deposition rate from wire feed speed.
// dims: in { wfs_in_min: L T^-1, wire_dia_in: L, deposition_eff: dimensionless } out: { wire_area_in2: L^2, melt_lb_hr: M T^-1, deposit_lb_hr: M T^-1 }
export function computeWireFeedDeposition({ wfs_in_min = 0, wire_dia_in = 0, deposition_eff = 0.92 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const wfs = Number(wfs_in_min);
  const dia = Number(wire_dia_in);
  const eff = Number(deposition_eff);
  if (!(wfs > 0)) return { error: "Wire feed speed must be positive (in/min)." };
  if (!(dia > 0)) return { error: "Wire diameter must be positive (in)." };
  if (!(eff > 0 && eff <= 1)) return { error: "Deposition efficiency must be in (0, 1]." };
  const wireArea = (Math.PI / 4) * dia * dia;
  const meltLbHr = wfs * 60 * wireArea * 0.2836;
  const depositLbHr = meltLbHr * eff;
  return {
    wire_area_in2: wireArea,
    melt_lb_hr: meltLbHr,
    deposit_lb_hr: depositLbHr,
    note: "Melt-off rate = wire feed speed x 60 x wire cross-section x steel density (0.2836 lb/in3); deposition rate after spatter/loss = melt-off x efficiency (solid wire about 0.92, FCAW about 0.85). Pair with weld-metal-volume: deposit weight / deposition rate = arc time. The WPS governs the qualified parameters (process, gas, electrode extension).",
  };
}
export const wireFeedDepositionExample = { inputs: { wfs_in_min: 300, wire_dia_in: 0.035, deposition_eff: 0.92 } };

function _v130renderWireFeedDeposition(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles wire-volume geometry and steel density (0.2836 lb/in3), by name. Melt-off = WFS x 60 x area x density; deposition = melt-off x efficiency. The WPS and the process (spray vs short-circuit, gas, electrode extension) govern the real efficiency.";
  const wfs = makeNumber("Wire feed speed (in/min)", "wfd-wfs", { step: "any", min: "0" });
  const dia = makeNumber("Wire diameter (in)", "wfd-dia", { step: "any", min: "0" });
  const eff = makeNumber("Deposition efficiency (0-1)", "wfd-eff", { step: "any", min: "0", value: "0.92" });
  eff.input.value = "0.92";
  for (const f of [wfs, dia, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wfs.input.value = "300"; dia.input.value = "0.035"; eff.input.value = "0.92"; update(); });
  const oArea = makeOutputLine(outputRegion, "Wire cross-section", "wfd-out-area");
  const oMelt = makeOutputLine(outputRegion, "Melt-off rate", "wfd-out-melt");
  const oDep = makeOutputLine(outputRegion, "Deposition rate", "wfd-out-dep");
  const update = debounce(() => {
    const r = computeWireFeedDeposition({
      wfs_in_min: Number(wfs.input.value) || 0,
      wire_dia_in: Number(dia.input.value) || 0,
      deposition_eff: eff.input.value === "" ? 0.92 : Number(eff.input.value),
    });
    if (r.error) { oArea.textContent = r.error; for (const o of [oMelt, oDep]) o.textContent = "-"; return; }
    oArea.textContent = fmt(r.wire_area_in2, 6) + " in2";
    oMelt.textContent = fmt(r.melt_lb_hr, 2) + " lb/hr";
    oDep.textContent = fmt(r.deposit_lb_hr, 2) + " lb/hr";
  }, DEBOUNCE_MS);
  for (const f of [wfs, dia, eff]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["wire-feed-deposition"] = _v130renderWireFeedDeposition;

// v737 wire-feed-speed-for-deposition (Group E): inverse of wire-feed-deposition. The forward tile gives the deposition
// rate from the wire feed speed; the inverse recovers the wire feed speed a target deposition rate needs, so a welder
// dials in the WFS to hit a production rate. From deposit = WFS x 60 x (pi/4 x dia^2) x 0.2836 x eff,
// WFS = deposit / (60 x (pi/4 x dia^2) x 0.2836 x eff).
// dims: in { target_deposit_lb_hr: M T^-1, wire_dia_in: L, deposition_eff: dimensionless } out: { wfs_in_min: L T^-1, melt_lb_hr: M T^-1, wire_area_in2: L^2 }
export function computeWireFeedSpeedForDeposition({ target_deposit_lb_hr = 0, wire_dia_in = 0, deposition_eff = 0.92 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dep = Number(target_deposit_lb_hr);
  const dia = Number(wire_dia_in);
  const eff = Number(deposition_eff);
  if (!(dep > 0)) return { error: "Target deposition rate must be positive (lb/hr)." };
  if (!(dia > 0)) return { error: "Wire diameter must be positive (in)." };
  if (!(eff > 0 && eff <= 1)) return { error: "Deposition efficiency must be in (0, 1]." };
  const wireArea = (Math.PI / 4) * dia * dia;
  const wfs_in_min = dep / (60 * wireArea * 0.2836 * eff);
  const melt_lb_hr = dep / eff;
  if (![wireArea, wfs_in_min, melt_lb_hr].every(Number.isFinite)) return { error: "Wire-feed-speed math is not a finite value." };
  return {
    wfs_in_min, melt_lb_hr, wire_area_in2: wireArea,
    note: "Wire feed speed = target deposit / (60 x wire cross-section x steel density (0.2836 lb/in3) x efficiency), the inverse of deposit = WFS x 60 x area x density x efficiency. The melt-off rate is deposit / efficiency (more wire melts than lands, the difference is spatter and slag; solid wire about 0.92, FCAW about 0.85). A smaller-diameter wire needs a much higher feed speed for the same deposit (the rate goes as diameter squared). The WFS must be within the WPS-qualified range and the machine's capability, and the WPS governs the qualified parameters (process, gas, electrode extension).",
  };
}
export const wireFeedSpeedForDepositionExample = { inputs: { target_deposit_lb_hr: 6, wire_dia_in: 0.035, deposition_eff: 0.92 } };

function _v737renderWireFeedSpeedForDeposition(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles wire-volume geometry and steel density (0.2836 lb/in3), by name, solved for the feed speed: WFS = deposit / (60 x area x density x efficiency). The WPS and the process (spray vs short-circuit, gas, electrode extension) govern the real efficiency and the qualified WFS range.";
  const dep = makeNumber("Target deposition rate (lb/hr)", "wfs-dep", { step: "any", min: "0" });
  const dia = makeNumber("Wire diameter (in)", "wfs-dia", { step: "any", min: "0" });
  const eff = makeNumber("Deposition efficiency (0-1)", "wfs-eff", { step: "any", min: "0", value: "0.92" });
  eff.input.value = "0.92";
  for (const f of [dep, dia, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dep.input.value = "6"; dia.input.value = "0.035"; eff.input.value = "0.92"; update(); });
  const oWfs = makeOutputLine(outputRegion, "Required wire feed speed", "wfs-out-wfs");
  const oMelt = makeOutputLine(outputRegion, "Melt-off rate", "wfs-out-melt");
  const oNote = makeOutputLine(outputRegion, "Note", "wfs-out-note");
  const update = debounce(() => {
    const r = computeWireFeedSpeedForDeposition({
      target_deposit_lb_hr: Number(dep.input.value) || 0,
      wire_dia_in: Number(dia.input.value) || 0,
      deposition_eff: eff.input.value === "" ? 0.92 : Number(eff.input.value),
    });
    if (r.error) { oWfs.textContent = r.error; oMelt.textContent = "-"; oNote.textContent = ""; return; }
    oWfs.textContent = fmt(r.wfs_in_min, 0) + " in/min";
    oMelt.textContent = fmt(r.melt_lb_hr, 2) + " lb/hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [dep, dia, eff]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["wire-feed-speed-for-deposition"] = _v737renderWireFeedSpeedForDeposition;

// v131 weld-transverse-shrinkage (Group E): Blodgett transverse shrinkage and pre-set.
// dims: in { weld_area_in2: L^2, thickness_in: L, weld_count: dimensionless } out: { shrink_per_weld_in: L, total_shrink_in: L, recommended_preset_in: L }
export function computeWeldTransverseShrinkage({ weld_area_in2 = 0, thickness_in = 0, weld_count = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(weld_area_in2);
  const thickness = Number(thickness_in);
  const count = Number(weld_count);
  if (!(area > 0)) return { error: "Weld area must be positive (in2)." };
  if (!(thickness > 0)) return { error: "Plate thickness must be positive (in)." };
  if (!(count >= 1)) return { error: "Weld count must be at least 1." };
  const shrinkPerWeld = 0.2 * area / thickness;
  const totalShrink = shrinkPerWeld * count;
  return {
    shrink_per_weld_in: shrinkPerWeld,
    total_shrink_in: totalShrink,
    recommended_preset_in: totalShrink,
    note: "Blodgett transverse-shrinkage screen: shrink = 0.2 x weld area / thickness (the 0.2 coefficient is dimensionless; the weld-area-over-thickness ratio carries the length). Set the parts apart / pre-bow by the total so the assembly cools to size. Restraint, fixturing, sequence, and a mock-up govern the real movement; longitudinal and angular distortion are NOT estimated here.",
  };
}
export const weldTransverseShrinkageExample = { inputs: { weld_area_in2: 0.10, thickness_in: 0.5, weld_count: 3 } };

function _v131renderWeldTransverseShrinkage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Blodgett, Design of Welded Structures, transverse-shrinkage relation (shrink = 0.2 x A_w / t), by name. This is a screen; restraint, sequence, and a mock-up govern the actual movement, and longitudinal and angular distortion are out of scope.";
  const area = makeNumber("Weld cross-section (in2)", "wts-area", { step: "any", min: "0" });
  const thickness = makeNumber("Plate thickness (in)", "wts-thk", { step: "any", min: "0" });
  const count = makeNumber("Parallel welds pulling the dimension", "wts-count", { step: "1", min: "1", value: "1" });
  count.input.value = "1";
  for (const f of [area, thickness, count]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "0.10"; thickness.input.value = "0.5"; count.input.value = "3"; update(); });
  const oPer = makeOutputLine(outputRegion, "Shrinkage per weld", "wts-out-per");
  const oTotal = makeOutputLine(outputRegion, "Total transverse shrinkage", "wts-out-total");
  const oPreset = makeOutputLine(outputRegion, "Recommended pre-set", "wts-out-preset");
  const update = debounce(() => {
    const r = computeWeldTransverseShrinkage({
      weld_area_in2: Number(area.input.value) || 0,
      thickness_in: Number(thickness.input.value) || 0,
      weld_count: count.input.value === "" ? 1 : Number(count.input.value),
    });
    if (r.error) { oPer.textContent = r.error; for (const o of [oTotal, oPreset]) o.textContent = "-"; return; }
    oPer.textContent = fmt(r.shrink_per_weld_in, 3) + " in";
    oTotal.textContent = fmt(r.total_shrink_in, 3) + " in";
    oPreset.textContent = "lay parts " + fmt(r.recommended_preset_in, 3) + " in wide";
  }, DEBOUNCE_MS);
  for (const f of [area, thickness, count]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["weld-transverse-shrinkage"] = _v131renderWeldTransverseShrinkage;

// v132 weld-group-eccentric (Group E): eccentrically loaded fillet weld group, elastic method.
// dims: in { load_lb: M L T^-2, ecc_in: L, weld_len_in: L, separation_in: L, allow_per_16: M T^-2 } out: { total_weld_len_in: L, polar_moment_in3: L^3, direct_shear_lb_in: M T^-2, torsion_x_lb_in: M T^-2, torsion_y_lb_in: M T^-2, resultant_lb_in: M T^-2, req_leg_16: dimensionless }
export function computeWeldGroupEccentric({ load_lb = 0, ecc_in = 0, weld_len_in = 0, separation_in = 0, allow_per_16 = 928 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(load_lb);
  const ecc = Number(ecc_in);
  const D = Number(weld_len_in);
  const B = Number(separation_in);
  const allow = Number(allow_per_16);
  if (!(P > 0)) return { error: "Load must be positive (lb)." };
  if (!(ecc >= 0)) return { error: "Eccentricity must be zero or positive (in)." };
  if (!(D > 0)) return { error: "Weld length must be positive (in)." };
  if (!(B > 0)) return { error: "Weld separation must be positive (in)." };
  if (!(allow > 0)) return { error: "Allowable per 1/16 in must be positive (lb/in)." };
  const Lw = 2 * D;
  const Ix = (D * D * D) / 6;
  const Iy = (D * B * B) / 2;
  const J = Ix + Iy;
  const fd = P / Lw;
  const T = P * ecc;
  const ftx = T * (D / 2) / J;
  const fty = T * (B / 2) / J;
  const fr = Math.sqrt(ftx * ftx + (fd + fty) * (fd + fty));
  const reqLeg16 = Math.ceil(fr / allow);
  return {
    total_weld_len_in: Lw,
    polar_moment_in3: J,
    direct_shear_lb_in: fd,
    torsion_x_lb_in: ftx,
    torsion_y_lb_in: fty,
    resultant_lb_in: fr,
    req_leg_16: reqLeg16,
    note: "Elastic (vector) method for two vertical fillet welds under in-plane eccentric load: the resultant unit force combines direct shear with the torsional components at the critical corner, and the required leg is the resultant / allowable (E70 ASD about 928 lb/in per 1/16 in). This is the conservative elastic method, not the AISC instantaneous-center tables; then check the AISC minimum fillet for the plate thickness. The engineer of record governs the connection.",
  };
}
export const weldGroupEccentricExample = { inputs: { load_lb: 12000, ecc_in: 6, weld_len_in: 10, separation_in: 4, allow_per_16: 928 } };

function _v132renderWeldGroupEccentric(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AISC 360 / Steel Construction Manual Part 8 elastic (vector) method for eccentric weld groups, by name. Resultant = sqrt(f_tx2 + (f_d + f_ty)2); required leg = resultant / allowable. This is the conservative elastic method (not instantaneous-center), a screen; the engineer of record governs.";
  const load = makeNumber("In-plane load P (lb)", "wge-load", { step: "any", min: "0" });
  const ecc = makeNumber("Eccentricity from centroid (in)", "wge-ecc", { step: "any", min: "0" });
  const len = makeNumber("Length of each vertical weld (in)", "wge-len", { step: "any", min: "0" });
  const sep = makeNumber("Separation between welds (in)", "wge-sep", { step: "any", min: "0" });
  const allow = makeNumber("Allowable per 1/16 in leg (lb/in)", "wge-allow", { step: "any", min: "0", value: "928" });
  allow.input.value = "928";
  for (const f of [load, ecc, len, sep, allow]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "12000"; ecc.input.value = "6"; len.input.value = "10"; sep.input.value = "4"; allow.input.value = "928"; update(); });
  const oJ = makeOutputLine(outputRegion, "Line polar moment J", "wge-out-j");
  const oFd = makeOutputLine(outputRegion, "Direct shear", "wge-out-fd");
  const oFr = makeOutputLine(outputRegion, "Resultant at critical corner", "wge-out-fr");
  const oLeg = makeOutputLine(outputRegion, "Required fillet leg", "wge-out-leg");
  const update = debounce(() => {
    const r = computeWeldGroupEccentric({
      load_lb: Number(load.input.value) || 0,
      ecc_in: ecc.input.value === "" ? 0 : Number(ecc.input.value),
      weld_len_in: Number(len.input.value) || 0,
      separation_in: Number(sep.input.value) || 0,
      allow_per_16: allow.input.value === "" ? 928 : Number(allow.input.value),
    });
    if (r.error) { oJ.textContent = r.error; for (const o of [oFd, oFr, oLeg]) o.textContent = "-"; return; }
    oJ.textContent = fmt(r.polar_moment_in3, 1) + " in3";
    oFd.textContent = fmt(r.direct_shear_lb_in, 0) + " lb/in";
    oFr.textContent = fmt(r.resultant_lb_in, 0) + " lb/in";
    oLeg.textContent = r.req_leg_16 + "/16 in (" + fmt(r.req_leg_16 / 16, 3) + " in)";
  }, DEBOUNCE_MS);
  for (const f of [load, ecc, len, sep, allow]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["weld-group-eccentric"] = _v132renderWeldGroupEccentric;

// v133 min-bend-radius (Group E): minimum inside bend radius from ductility.
// dims: in { thickness_in: L, elongation_pct: dimensionless } out: { r_over_t: dimensionless, r_min_in: L }
export function computeMinBendRadius({ thickness_in = 0, elongation_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const thickness = Number(thickness_in);
  const elong = Number(elongation_pct);
  if (!(thickness > 0)) return { error: "Thickness must be positive (in)." };
  if (!(elong > 0 && elong <= 50)) return { error: "Elongation must be in (0, 50] percent." };
  const rOverT = 50 / elong - 1;
  const rMin = thickness * rOverT;
  return {
    r_over_t: rOverT,
    r_min_in: rMin,
    note: "Published forming-limit screen: minimum inside radius = thickness x (50 / %elongation - 1), with elongation the total percent in 2 in from the mill cert (A36 about 20). A bend across (transverse to) the rolling direction tolerates a tighter radius than one along it. The mill certificate, grain direction, the fabricator's press experience, and a test bend govern.",
  };
}
export const minBendRadiusExample = { inputs: { thickness_in: 0.25, elongation_pct: 20 } };

function _v133renderMinBendRadius(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: published forming-limit relation R_min = T x (50 / %elongation - 1), by name. The mill certificate, the bend orientation relative to the rolling direction, and a test bend govern; this is a screen.";
  const thickness = makeNumber("Plate / sheet thickness (in)", "mbr-thk", { step: "any", min: "0" });
  const elong = makeNumber("Elongation in 2 in (%)", "mbr-elong", { step: "any", min: "0" });
  for (const f of [thickness, elong]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { thickness.input.value = "0.25"; elong.input.value = "20"; update(); });
  const oRt = makeOutputLine(outputRegion, "Radius-to-thickness (R/T)", "mbr-out-rt");
  const oR = makeOutputLine(outputRegion, "Minimum inside radius", "mbr-out-r");
  const update = debounce(() => {
    const r = computeMinBendRadius({
      thickness_in: Number(thickness.input.value) || 0,
      elongation_pct: Number(elong.input.value) || 0,
    });
    if (r.error) { oRt.textContent = r.error; oR.textContent = "-"; return; }
    oRt.textContent = fmt(r.r_over_t, 2) + " T";
    oR.textContent = fmt(r.r_min_in, 3) + " in";
  }, DEBOUNCE_MS);
  for (const f of [thickness, elong]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["min-bend-radius"] = _v133renderMinBendRadius;

// v134 shrink-fit (Group G): interference shrink-fit heating / chilling temperature.
// dims: in { nominal_dia_in: L, interference_in: L, clearance_in: L, alpha_per_f: T^-1, ambient_f: T } out: { delta_t_f: T, heat_to_f: T, chill_to_f: T }
export function computeShrinkFit({ nominal_dia_in = 0, interference_in = 0, clearance_in = 0, alpha_per_f = 0.0000065, ambient_f = 70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dia = Number(nominal_dia_in);
  const interference = Number(interference_in);
  const clearance = Number(clearance_in);
  const alpha = Number(alpha_per_f);
  const ambient = Number(ambient_f);
  if (!(dia > 0)) return { error: "Nominal diameter must be positive (in)." };
  if (!(alpha > 0)) return { error: "Coefficient of thermal expansion must be positive (per degF)." };
  if (!(interference >= 0)) return { error: "Interference must be zero or positive (in)." };
  if (!(clearance >= 0)) return { error: "Assembly clearance must be zero or positive (in)." };
  const deltaT = (interference + clearance) / (alpha * dia);
  return {
    delta_t_f: deltaT,
    heat_to_f: ambient + deltaT,
    chill_to_f: ambient - deltaT,
    note: "Thermal-growth relation delta_dia = alpha x dia x delta_T (steel alpha about 6.5e-6 per degF). Heat the outer/bore part to heat_to, or chill the inner/shaft part to chill_to, to open the fit enough to assemble by hand. A chill below dry ice (-109 degF) needs liquid nitrogen. The alloy's published coefficient governs the number; the interference contact pressure (a separate Lame thick-cylinder check) and the engineer govern the joint's holding capacity -- this tile sizes only the assembly temperature.",
  };
}
export const shrinkFitExample = { inputs: { nominal_dia_in: 4.0, interference_in: 0.004, clearance_in: 0.002, alpha_per_f: 0.0000065, ambient_f: 70 } };

function _v134renderShrinkFit(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles thermal-expansion relation delta_dia = alpha x dia x delta_T, with steel alpha about 6.5e-6 per degF, by name. The published alloy coefficient and a separate interference-pressure (Lame) check govern; this tile sizes only the assembly temperature.";
  const dia = makeNumber("Nominal fit diameter (in)", "shf-dia", { step: "any", min: "0" });
  const interference = makeNumber("Diametral interference (in)", "shf-int", { step: "any", min: "0" });
  const clearance = makeNumber("Assembly clearance (in)", "shf-clr", { step: "any", min: "0", value: "0.002" });
  clearance.input.value = "0.002";
  const alpha = makeNumber("CTE (per degF)", "shf-alpha", { step: "any", min: "0", value: "0.0000065" });
  alpha.input.value = "0.0000065";
  const ambient = makeNumber("Ambient temperature (degF)", "shf-amb", { step: "any", value: "70" });
  ambient.input.value = "70";
  for (const f of [dia, interference, clearance, alpha, ambient]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "4.0"; interference.input.value = "0.004"; clearance.input.value = "0.002"; alpha.input.value = "0.0000065"; ambient.input.value = "70"; update(); });
  const oDt = makeOutputLine(outputRegion, "Required temperature change", "shf-out-dt");
  const oHeat = makeOutputLine(outputRegion, "Heat outer part to", "shf-out-heat");
  const oChill = makeOutputLine(outputRegion, "Or chill inner part to", "shf-out-chill");
  const update = debounce(() => {
    const r = computeShrinkFit({
      nominal_dia_in: Number(dia.input.value) || 0,
      interference_in: Number(interference.input.value) || 0,
      clearance_in: clearance.input.value === "" ? 0 : Number(clearance.input.value),
      alpha_per_f: alpha.input.value === "" ? 0.0000065 : Number(alpha.input.value),
      ambient_f: ambient.input.value === "" ? 70 : Number(ambient.input.value),
    });
    if (r.error) { oDt.textContent = r.error; for (const o of [oHeat, oChill]) o.textContent = "-"; return; }
    oDt.textContent = fmt(r.delta_t_f, 0) + " degF";
    oHeat.textContent = fmt(r.heat_to_f, 0) + " degF";
    oChill.textContent = fmt(r.chill_to_f, 0) + " degF" + (r.chill_to_f < -109 ? " (needs liquid nitrogen)" : "");
  }, DEBOUNCE_MS);
  for (const f of [dia, interference, clearance, alpha, ambient]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["shrink-fit"] = _v134renderShrinkFit;

// ===================== spec-v356..v358: welding process batch (Group E) =====================
// The process-planning numbers the weld-strength and cost tiles never give:
// the base-metal dilution of a deposit (v356), the passes and arc time to fill
// a groove (v357), and the travel speed for a target heat input (v358).

// dims: in { A_base: L^2, A_filler: L^2 } out: { dilution_pct: dimensionless, filler_share_pct: dimensionless }
export function computeWeldDilution({ A_base = 0, A_filler = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ab = Number(A_base) || 0;
  const af = Number(A_filler) || 0;
  if (!(ab > 0)) return { error: "Melted base-metal area must be positive (in^2)." };
  if (!(af > 0)) return { error: "Filler (reinforcement) area must be positive (in^2)." };
  const dilution_pct = ab / (ab + af) * 100;
  const filler_share_pct = 100 - dilution_pct;
  return {
    dilution_pct, filler_share_pct,
    note: "Weld dilution = melted base-metal area / total deposit area, the fraction of the weld that is base metal rather than filler. It sets how much the base metal's chemistry shifts the deposit: a structural single-pass weld runs 30-40%, but a hardfacing or corrosion overlay is kept low (weave, buttering, lower current) so the overlay chemistry stays near the filler's. This is the cross-sectional area ratio; it does not itself compute the diluted alloy composition (that needs each metal's chemistry). A process aid; the WPS and the filler-metal data govern.",
  };
}
export const weldDilutionExample = { inputs: { A_base: 0.03, A_filler: 0.05 } };
function _v356renderWeldDilution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: weld dilution = A_base / (A_base + A_filler), the standard welding-metallurgy definition (by name). Sets how far the base metal shifts the deposit chemistry; overlays are kept low-dilution. The WPS and the filler-metal data govern.";
  const ab = makeNumber("Melted base-metal (penetration) area (in^2)", "wd-ab", { step: "any", min: "0" });
  const af = makeNumber("Filler (reinforcement) area (in^2)", "wd-af", { step: "any", min: "0" });
  for (const f of [ab, af]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ab.input.value = "0.03"; af.input.value = "0.05"; update(); });
  const oDil = makeOutputLine(outputRegion, "Dilution (base-metal share)", "wd-out-dil");
  const oFill = makeOutputLine(outputRegion, "Filler share", "wd-out-fill");
  const oNote = makeOutputLine(outputRegion, "Note", "wd-out-note");
  const update = debounce(() => {
    const r = computeWeldDilution({ A_base: Number(ab.input.value) || 0, A_filler: Number(af.input.value) || 0 });
    if (r.error) { oDil.textContent = r.error; oFill.textContent = "-"; oNote.textContent = ""; return; }
    oDil.textContent = fmt(r.dilution_pct, 1) + "%";
    oFill.textContent = fmt(r.filler_share_pct, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ab, af]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["weld-dilution"] = _v356renderWeldDilution;

// dims: in { A_groove: L^2, length_in: L, a_pass: L^2, dep_rate: M T^-1, density: M L^-3, op_factor: dimensionless } out: { passes: dimensionless, weight_lb: M, arc_h: T, total_h: T }
export function computeWeldPassesArcTime({ A_groove = 0, length_in = 0, a_pass = 0, dep_rate = 0, density = 0.283, op_factor = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ag = Number(A_groove) || 0;
  const len = Number(length_in) || 0;
  const ap = Number(a_pass) || 0;
  const dr = Number(dep_rate) || 0;
  const dens = Number(density) > 0 ? Number(density) : 0.283;
  const of = Number(op_factor) || 0;
  if (!(ag > 0)) return { error: "Groove cross-sectional area must be positive (in^2)." };
  if (!(len > 0)) return { error: "Weld length must be positive (in)." };
  if (!(ap > 0)) return { error: "Area per pass must be positive (in^2)." };
  if (!(dr > 0)) return { error: "Deposition rate must be positive (lb/h)." };
  const passes = Math.ceil(ag / ap);
  const weight_lb = ag * len * dens;
  const arc_h = weight_lb / dr;
  const total_h = of > 0 ? arc_h / of : null;
  return {
    passes, weight_lb, arc_h, arc_min: arc_h * 60, total_h, total_min: total_h == null ? null : total_h * 60,
    note: "Weld-metal volume drives welding cost. Passes = ceil(groove area / area per pass); deposited weight = groove area x length x density (steel ~0.283 lb/in^3); arc-on time = weight / deposition rate; and with an operator (duty) factor, total shop time = arc time / factor. Doubling the groove doubles the passes and the arc time - the linear scaling behind weld cost. The operator factor (often 20-40% for manual work) captures the fit-up, repositioning, and slag time between arcs. A planning estimate; the WPS and the shop's measured rates govern.",
  };
}
export const weldPassesArcTimeExample = { inputs: { A_groove: 0.15, length_in: 12, a_pass: 0.03, dep_rate: 8, density: 0.283, op_factor: 0.40 } };
function _v357renderWeldPassesArcTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: passes = ceil(groove area / area per pass); deposited weight = area x length x density (steel ~0.283 lb/in^3); arc time = weight / deposition rate; total = arc / operator factor. Standard welding-cost estimating (by name). The WPS and the shop's measured rates govern.";
  const ag = makeNumber("Groove cross-sectional area (in^2)", "wpa-ag", { step: "any", min: "0" });
  const len = makeNumber("Weld length (in)", "wpa-len", { step: "any", min: "0" });
  const ap = makeNumber("Area deposited per pass (in^2)", "wpa-ap", { step: "any", min: "0" });
  const dr = makeNumber("Deposition rate (lb/h)", "wpa-dr", { step: "any", min: "0" });
  const dens = makeNumber("Weld-metal density (lb/in^3, default 0.283)", "wpa-dens", { step: "any", min: "0" });
  const of = makeNumber("Operator/duty factor (0-1, optional)", "wpa-of", { step: "any", min: "0", max: "1" });
  for (const f of [ag, len, ap, dr, dens, of]) inputRegion.appendChild(f.wrap);
  dens.input.value = "0.283";
  attachExampleButton(inputRegion, () => { ag.input.value = "0.15"; len.input.value = "12"; ap.input.value = "0.03"; dr.input.value = "8"; dens.input.value = "0.283"; of.input.value = "0.40"; update(); });
  const oPasses = makeOutputLine(outputRegion, "Passes", "wpa-out-p");
  const oWeight = makeOutputLine(outputRegion, "Deposited weight", "wpa-out-w");
  const oArc = makeOutputLine(outputRegion, "Arc-on time", "wpa-out-a");
  const oTotal = makeOutputLine(outputRegion, "Total shop time", "wpa-out-t");
  const oNote = makeOutputLine(outputRegion, "Note", "wpa-out-note");
  const update = debounce(() => {
    const r = computeWeldPassesArcTime({ A_groove: Number(ag.input.value) || 0, length_in: Number(len.input.value) || 0, a_pass: Number(ap.input.value) || 0, dep_rate: Number(dr.input.value) || 0, density: Number(dens.input.value) || 0, op_factor: Number(of.input.value) || 0 });
    if (r.error) { oPasses.textContent = r.error; oWeight.textContent = "-"; oArc.textContent = "-"; oTotal.textContent = "-"; oNote.textContent = ""; return; }
    oPasses.textContent = String(r.passes);
    oWeight.textContent = fmt(r.weight_lb, 3) + " lb";
    oArc.textContent = fmt(r.arc_min, 1) + " min (" + fmt(r.arc_h, 3) + " h)";
    oTotal.textContent = r.total_min == null ? "(enter an operator factor)" : fmt(r.total_min, 1) + " min";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ag, len, ap, dr, dens, of]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["weld-passes-arc-time"] = _v357renderWeldPassesArcTime;

// dims: in { V_volts: M L^2 T^-3 I^-1, I_amps: I, eta: dimensionless, HI_kjin: M L T^-2 } out: { travel_speed_ipm: L T^-1 }
export function computeWeldTravelSpeed({ V_volts = 0, I_amps = 0, eta = 0.8, HI_kjin = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const v = Number(V_volts) || 0;
  const i = Number(I_amps) || 0;
  const e = Number(eta) || 0;
  const hi = Number(HI_kjin) || 0;
  if (!(v > 0)) return { error: "Arc voltage must be positive (V)." };
  if (!(i > 0)) return { error: "Welding current must be positive (A)." };
  if (!(e > 0 && e <= 1)) return { error: "Arc efficiency must be in (0, 1]." };
  if (!(hi > 0)) return { error: "Target heat input must be positive (kJ/in)." };
  const travel_speed_ipm = (60 * v * i * e) / (1000 * hi);
  if (!Number.isFinite(travel_speed_ipm) || travel_speed_ipm <= 0) return { error: "Travel speed is not valid." };
  // Back-check: heat input at this travel speed reproduces the target.
  const hi_check = (60 * v * i * e) / (1000 * travel_speed_ipm);
  return {
    travel_speed_ipm, hi_check,
    note: "Travel speed for a target heat input: TS = (60 x V x I x eta) / (1000 x HI), with eta the arc efficiency (about 0.8 GMAW, 0.65 GTAW, 0.9 SAW). Travel at or ABOVE this to hold the heat input at or UNDER the target - a lower heat-input ceiling forces a faster travel, the inverse TS-HI relationship a welder uses to trade travel speed for HAZ control and to meet a WPS's heat-input limit. Slowing down at the same volts and amps raises the heat input. A process aid; the qualified WPS governs the allowable range.",
  };
}
export const weldTravelSpeedExample = { inputs: { V_volts: 24, I_amps: 200, eta: 0.80, HI_kjin: 40 } };
function _v358renderWeldTravelSpeed(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: heat input HI = (60 V I eta)/(1000 TS) solved for travel speed, per the AWS/ASME arc heat-input relation with the arc efficiency eta (0.8 GMAW, 0.65 GTAW, 0.9 SAW), by name. Travel at or above the result to stay at or under the target HI. The qualified WPS governs the allowable range.";
  const v = makeNumber("Arc voltage (V)", "wts-v", { step: "any", min: "0" });
  const i = makeNumber("Welding current (A)", "wts-i", { step: "any", min: "0" });
  const e = makeNumber("Arc efficiency (0.8 GMAW, 0.65 GTAW, 0.9 SAW)", "wts-e", { step: "any", min: "0", max: "1" });
  const hi = makeNumber("Target heat input (kJ/in)", "wts-hi", { step: "any", min: "0" });
  for (const f of [v, i, e, hi]) inputRegion.appendChild(f.wrap);
  e.input.value = "0.80";
  attachExampleButton(inputRegion, () => { v.input.value = "24"; i.input.value = "200"; e.input.value = "0.80"; hi.input.value = "40"; update(); });
  const oTS = makeOutputLine(outputRegion, "Travel speed (at or above)", "wts-out-ts");
  const oNote = makeOutputLine(outputRegion, "Note", "wts-out-note");
  const update = debounce(() => {
    const r = computeWeldTravelSpeed({ V_volts: Number(v.input.value) || 0, I_amps: Number(i.input.value) || 0, eta: Number(e.input.value) || 0, HI_kjin: Number(hi.input.value) || 0 });
    if (r.error) { oTS.textContent = r.error; oNote.textContent = ""; return; }
    oTS.textContent = fmt(r.travel_speed_ipm, 2) + " in/min";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [v, i, e, hi]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["weld-travel-speed"] = _v358renderWeldTravelSpeed;

// =====================================================================
// spec-v802 - Group E: coil / roll stock length (sheet-metal, cable, strip)
// The annulus identity L = pi (OD^2 - ID^2) / (4 t); first-principles.
// =====================================================================

// dims: in { outside_diameter_in: L, inside_diameter_in: L, material_thickness_in: L } out: { length_in: L, length_ft: L }
export function computeCoilLength({ outside_diameter_in = 0, inside_diameter_in = 0, material_thickness_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const od = Number(outside_diameter_in) || 0;
  const id = Number(inside_diameter_in) || 0;
  const t = Number(material_thickness_in) || 0;
  if (!(od > 0)) return { error: "Coil outside diameter must be positive (in)." };
  if (!(id >= 0)) return { error: "Core (inside) diameter must be non-negative (in)." };
  if (!(od > id)) return { error: "Coil outside diameter must exceed the core diameter." };
  if (!(t > 0)) return { error: "Material thickness must be positive (in)." };
  const length_in = Math.PI * (od * od - id * id) / (4 * t);
  const length_ft = length_in / 12;
  if (![length_in, length_ft].every(Number.isFinite)) return { error: "Coil-length math is not a finite value." };
  return {
    length_in, length_ft,
    note: "Coil/roll stock length from the annulus identity. The wound material, seen end-on, is an annulus of area pi/4 (OD^2 - ID^2); unwound it is a strip of the same cross-section = length x thickness, so L = pi (OD^2 - ID^2) / (4 t). OD is the full coil outside diameter, ID the core (mandrel) diameter, and t the material thickness -- all in the same units. Halving the thickness doubles the length wound to the same coil OD. Exact for a tightly wound coil with no air gaps or telescoping; the usable length runs slightly short after the last wrap and any core stub. A layout aid; weigh or measure-off to confirm before a critical cut.",
  };
}
export const coilLengthExample = { inputs: { outside_diameter_in: 48, inside_diameter_in: 16, material_thickness_in: 0.024 } };
function _v802renderCoilLength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Coil / roll stock length from the annulus identity L = pi (OD^2 - ID^2) / (4 t), for coil outside diameter OD, core diameter ID, and material thickness t (same units). First-principles. A layout aid; measure or weigh to confirm before a critical cut.";
  const od = makeNumber("Coil outside diameter OD (in)", "coil-od", { step: "any", min: "0" }); od.input.value = "48";
  const id = makeNumber("Core / mandrel diameter ID (in)", "coil-id", { step: "any", min: "0" }); id.input.value = "16";
  const t = makeNumber("Material thickness t (in)", "coil-t", { step: "any", min: "0" }); t.input.value = "0.024";
  for (const f of [od, id, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "48"; id.input.value = "16"; t.input.value = "0.024"; update(); });
  const oFt = makeOutputLine(outputRegion, "Coil length", "coil-out-ft");
  const oIn = makeOutputLine(outputRegion, "Coil length (in)", "coil-out-in");
  const oNote = makeOutputLine(outputRegion, "Note", "coil-out-n");
  const update = debounce(() => {
    const r = computeCoilLength({ outside_diameter_in: Number(od.input.value) || 0, inside_diameter_in: Number(id.input.value) || 0, material_thickness_in: Number(t.input.value) || 0 });
    if (r.error) { oFt.textContent = r.error; oIn.textContent = "-"; oNote.textContent = ""; return; }
    oFt.textContent = fmt(r.length_ft, 1) + " ft";
    oIn.textContent = fmt(r.length_in, 0) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [od, id, t]) f.input.addEventListener("input", update);
}
FAB_RENDERERS["coil-length"] = _v802renderCoilLength;
