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
