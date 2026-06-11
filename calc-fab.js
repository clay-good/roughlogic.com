// =====================================================================
// calc-fab.js - Fabrication & layout bench (Group G).
//
// Split out of calc-cross.js (which had reached its gzip cap) per the
// standing module-size remediation: the spec-v26 pipefitter's bench
// (fitting take-out, multi-piece miter, wraparound template, flange
// bolt-up torque), the spec-v27 rigger's two-scale center of gravity,
// the spec-v32 bolt-circle layout, and the spec-v33 decimal-to-fraction.
// All remain Group G tiles (a tile's group letter is independent of its
// module, the spec-v28 precedent); nothing about their behavior changes.
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
// spec-v27 Part III - Group G: the rigger's bench (1 net-new tile)
// Center of gravity from a two-point weigh by moment balance. (The
// sling-leg-tension-by-angle case of spec-v27 G.1 is covered by the
// existing sling-angle tile, enhanced additively rather than duplicated.)
// =====================================================================

// dims: in { reading_1_lb: dimensionless, reading_2_lb: dimensionless, span_ft: L, total_weight_lb: dimensionless, cg_from_1_ft: L } out: { total_weight_lb: dimensionless, cg_from_point_1_ft: L, percent_at_1: dimensionless }
export function computeCenterOfGravity2Point({ mode = "two-scale-weigh", reading_1_lb = 0, reading_2_lb = 0, span_ft = 0, total_weight_lb = 0, cg_from_1_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(span_ft);
  if (!(L > 0)) return { error: "Distance between the two points must be positive (ft)." };

  if (mode === "pick-point-from-cg") {
    const W = Number(total_weight_lb);
    const x = Number(cg_from_1_ft);
    if (!(W > 0)) return { error: "Total weight must be positive (lb)." };
    // moment balance: S2 = W * x / L (x measured from point 1), S1 = W - S2.
    const S2 = W * x / L;
    const S1 = W - S2;
    const notes = [];
    if (x < 0 || x > L) notes.push("CG (" + fmt(x, 3) + " ft) is outside the [0, " + fmt(L, 3) + "] ft span between the two points.");
    return { mode, total_weight_lb: W, reading_1_lb: S1, reading_2_lb: S2, cg_from_point_1_ft: x, percent_at_1: W > 0 ? (S1 / W) * 100 : 0, percent_at_2: W > 0 ? (S2 / W) * 100 : 0, notes };
  }

  // two-scale-weigh
  const S1 = Number(reading_1_lb), S2 = Number(reading_2_lb);
  if (!(S1 >= 0) || !(S2 >= 0)) return { error: "Scale readings must be non-negative (lb)." };
  const W = S1 + S2;
  if (!(W > 0)) return { error: "Total weight (both readings) must be positive." };
  const cg_from_1 = (S2 * L) / W; // distance from point 1
  const cg_from_2 = L - cg_from_1;
  const notes = [];
  if (cg_from_1 < 0 || cg_from_1 > L) notes.push("Computed CG is outside the span between the two points; check the readings for a sign error or an off-span load.");
  notes.push("Moment balance about each pick point; the lift plan, the rated rigging, and the qualified rigger / lift director govern.");
  return { mode, total_weight_lb: W, reading_1_lb: S1, reading_2_lb: S2, cg_from_point_1_ft: cg_from_1, cg_from_point_2_ft: cg_from_2, percent_at_1: (S1 / W) * 100, percent_at_2: (S2 / W) * 100, notes };
}

export const centerOfGravity2PointExample = { inputs: { mode: "two-scale-weigh", reading_1_lb: 3000, reading_2_lb: 1000, span_ft: 10 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v27renderCenterOfGravity2Point(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Center of gravity from a two-point weigh by moment balance (x = S2*L / (S1+S2)), per the standard rigging practice in the ASME B30.9 / ITI rigging references, by name; first-principles statics. A field aid - the lift plan, the rated rigging, and the qualified rigger / lift director govern.";
  const mode = makeSelect("Mode", "cg2-mode", [
    { value: "two-scale-weigh", label: "Two-scale weigh", selected: true },
    { value: "pick-point-from-cg", label: "Reading from known CG" },
  ]);
  const s1 = makeNumber("Reading at point 1 (lb)", "cg2-s1", { step: "any", min: "0" });
  const s2 = makeNumber("Reading at point 2 (lb)", "cg2-s2", { step: "any", min: "0" });
  const span = makeNumber("Distance between points (ft)", "cg2-span", { step: "any", min: "0" });
  const w = makeNumber("Total weight (lb, inverse)", "cg2-w", { step: "any", min: "0" });
  const cg = makeNumber("CG from point 1 (ft, inverse)", "cg2-cg", { step: "any" });
  for (const f of [mode, s1, s2, span, w, cg]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "two-scale-weigh"; s1.input.value = "3000"; s2.input.value = "1000"; span.input.value = "10"; w.input.value = ""; cg.input.value = ""; update(); });

  const oW = makeOutputLine(outputRegion, "Total weight (lb)", "cg2-out-w");
  const oCG = makeOutputLine(outputRegion, "CG from point 1 (ft)", "cg2-out-cg");
  const oPct = makeOutputLine(outputRegion, "Split (point 1 / point 2)", "cg2-out-pct");
  const oNote = makeOutputLine(outputRegion, "Notes", "cg2-out-note");

  const update = debounce(() => {
    const r = computeCenterOfGravity2Point({
      mode: mode.select.value,
      reading_1_lb: Number(s1.input.value) || 0,
      reading_2_lb: Number(s2.input.value) || 0,
      span_ft: Number(span.input.value) || 0,
      total_weight_lb: Number(w.input.value) || 0,
      cg_from_1_ft: Number(cg.input.value) || 0,
    });
    if (r.error) { oW.textContent = r.error; oCG.textContent = "-"; oPct.textContent = "-"; oNote.textContent = ""; return; }
    oW.textContent = fmt(r.total_weight_lb, 1) + " lb";
    oCG.textContent = fmt(r.cg_from_point_1_ft, 3) + " ft";
    if (r.mode === "pick-point-from-cg") oPct.textContent = "reading 1 " + fmt(r.reading_1_lb, 1) + " lb / reading 2 " + fmt(r.reading_2_lb, 1) + " lb";
    else oPct.textContent = fmt(r.percent_at_1, 1) + "% / " + fmt(r.percent_at_2, 1) + "%";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [s1.input, s2.input, span.input, w.input, cg.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
FAB_RENDERERS["center-of-gravity-2point"] = _v27renderCenterOfGravity2Point;

// --- v32 G: Bolt circle / circle-of-holes layout (`bolt-circle`) ---
// R = dia/2; hole i at angle start + i*(360/N): x = cx + R*cos, y = cy + R*sin;
// adjacent center-to-center chord = 2*R*sin(180/N).
// dims: in { bolt_circle_dia_in: L, num_holes: dimensionless, start_angle_deg: dimensionless, center_x_in: L, center_y_in: L } out: { radius_in: L, chord_in: L, angular_spacing_deg: dimensionless }
export function computeBoltCircle({ bolt_circle_dia_in = 0, num_holes = 0, start_angle_deg = 0, center_x_in = 0, center_y_in = 0 } = {}) {
  const _g = _finiteGuard({ bolt_circle_dia_in, num_holes, start_angle_deg, center_x_in, center_y_in }); if (_g) return _g;
  const dia = Number(bolt_circle_dia_in) || 0;
  const n = Math.floor(Number(num_holes) || 0);
  if (!(dia > 0)) return { error: "Bolt circle diameter must be positive (in)." };
  if (!(n >= 1)) return { error: "Number of holes must be at least 1." };
  if (n > 360) return { error: "Number of holes must be 360 or fewer." };
  const radius_in = dia / 2;
  const start = Number(start_angle_deg) || 0;
  const cx = Number(center_x_in) || 0;
  const cy = Number(center_y_in) || 0;
  const angular_spacing_deg = 360 / n;
  const holes = [];
  for (let i = 0; i < n; i++) {
    const ang = start + i * angular_spacing_deg;
    const rad = (ang * Math.PI) / 180;
    holes.push({ n: i + 1, angle_deg: ang, x_in: cx + radius_in * Math.cos(rad), y_in: cy + radius_in * Math.sin(rad) });
  }
  const chord_in = n >= 2 ? 2 * radius_in * Math.sin(Math.PI / n) : null;
  const notes = [];
  notes.push("Holes run counter-clockwise from the start angle (measured from the +X axis); angular spacing = 360 / N. Chord is the straight center-to-center distance between adjacent holes = 2 x R x sin(180/N).");
  notes.push("First-principles circle-of-holes geometry; confirm the hole pattern, datum, and tolerance against the drawing before drilling.");
  return { bolt_circle_dia_in: dia, radius_in, num_holes: n, start_angle_deg: start, center_x_in: cx, center_y_in: cy, angular_spacing_deg, chord_in, holes, notes };
}
export const boltCircleExample = { inputs: { bolt_circle_dia_in: 8, num_holes: 6, start_angle_deg: 0, center_x_in: 0, center_y_in: 0 } };

function _v32renderBoltCircle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bolt-circle (circle-of-holes) layout - hole i sits at angle start + i x 360/N on a radius dia/2, so x = cx + R cos, y = cy + R sin; adjacent center-to-center chord = 2 R sin(180/N) - first-principles trigonometry (the circle-of-holes geometry as in Machinery's Handbook, by name). Confirm the pattern, datum, and tolerance against the drawing before drilling.";
  const dia = makeNumber("Bolt circle diameter (in)", "bc-dia", { step: "any", min: "0", value: "8" }); dia.input.value = "8";
  const n = makeNumber("Number of holes", "bc-n", { step: "1", min: "1", value: "6" }); n.input.value = "6";
  const start = makeNumber("Start angle (deg, optional)", "bc-start", { step: "any", value: "0" }); start.input.value = "0";
  const cx = makeNumber("Center X (in, optional)", "bc-cx", { step: "any", value: "0" }); cx.input.value = "0";
  const cy = makeNumber("Center Y (in, optional)", "bc-cy", { step: "any", value: "0" }); cy.input.value = "0";
  for (const f of [dia, n, start, cx, cy]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "8"; n.input.value = "6"; start.input.value = "0"; cx.input.value = "0"; cy.input.value = "0"; update(); });
  const oSpacing = makeOutputLine(outputRegion, "Spacing / chord", "bc-out-spacing");
  const oCoords = makeOutputLine(outputRegion, "Hole coordinates (X, Y in)", "bc-out-coords");
  const oNote = makeOutputLine(outputRegion, "Notes", "bc-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeBoltCircle({ bolt_circle_dia_in: readNum(dia.input), num_holes: readNum(n.input), start_angle_deg: readNum(start.input), center_x_in: readNum(cx.input), center_y_in: readNum(cy.input) });
    if (r.error) { oSpacing.textContent = r.error; oCoords.textContent = "-"; oNote.textContent = ""; return; }
    oSpacing.textContent = fmt(r.angular_spacing_deg, 3) + " deg apart; chord " + (r.chord_in === null ? "(single hole)" : fmt(r.chord_in, 3) + " in") + " (R " + fmt(r.radius_in, 3) + " in)";
    oCoords.textContent = r.holes.map((h) => h.n + ": (" + fmt(h.x_in, 3) + ", " + fmt(h.y_in, 3) + ")").join("   ");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [dia.input, n.input, start.input, cx.input, cy.input]) f.addEventListener("input", update);
}
FAB_RENDERERS["bolt-circle"] = _v32renderBoltCircle;

// --- v33 G: Decimal to fraction / feet-inches (`decimal-to-fraction`) ---
// Tape-measure math: round a decimal value to the nearest 1/den tick, reduce
// the fraction, and break it into feet-inches. Helper kept above the dims block.
const _bcGcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; };
// dims: in { value_in: L, denominator: dimensionless } out: { whole_in: L, decimal_value_in: L, error_in: L }
export function computeDecimalToFraction({ value_in = 0, denominator = 16 } = {}) {
  const _g = _finiteGuard({ value_in, denominator }); if (_g) return _g;
  const v = Number(value_in);
  const den = Math.floor(Number(denominator) || 0);
  if (![2, 4, 8, 16, 32, 64].includes(den)) return { error: "Round to a binary tape-measure fraction: 2, 4, 8, 16, 32, or 64." };
  const sign = v < 0 ? -1 : 1;
  const av = Math.abs(v);
  const totalTicks = Math.round(av * den);
  const wholeInBase = Math.floor(totalTicks / den);
  const remTicks = totalTicks - wholeInBase * den;
  const g = _bcGcd(remTicks, den);
  const numerator = remTicks === 0 ? 0 : remTicks / g;
  const reduced_denominator = remTicks === 0 ? 1 : den / g;
  const decimal_value_in = sign * (totalTicks / den);
  const error_in = decimal_value_in - v;
  const feet = Math.floor(wholeInBase / 12);
  const inch_in_ft = wholeInBase - feet * 12;
  const sgn = sign < 0 ? "-" : "";
  const fracPart = numerator === 0 ? "" : numerator + "/" + reduced_denominator;
  let fraction_text;
  if (numerator === 0) fraction_text = sgn + wholeInBase + " in";
  else if (wholeInBase === 0) fraction_text = sgn + fracPart + " in";
  else fraction_text = sgn + wholeInBase + "-" + fracPart + " in";
  const inchFrac = numerator === 0 ? String(inch_in_ft) : (inch_in_ft === 0 ? fracPart : inch_in_ft + "-" + fracPart);
  const feet_inch_text = sgn + feet + "' " + inchFrac + "\"";
  const notes = [];
  notes.push("Rounded to the nearest 1/" + den + " in; the error is the rounded value minus the exact decimal, and the fraction is reduced to lowest terms.");
  notes.push("First-principles arithmetic; binary (power-of-two) denominators are the tape-measure / machinist-scale standard.");
  return { value_in: v, denominator: den, whole_in: sign * wholeInBase, numerator, reduced_denominator, decimal_value_in, error_in, feet: sign * feet, inch_in_ft, fraction_text, feet_inch_text, notes };
}
export const decimalToFractionExample = { inputs: { value_in: 2.375, denominator: 16 } };

function _v33renderDecimalToFraction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Decimal-to-fraction tape-measure math - round the decimal to the nearest 1/N tick, reduce the fraction to lowest terms (GCD), and break it into feet-inches; the error is the rounded value minus the exact decimal - first-principles arithmetic, public domain. Binary (power-of-two) denominators are the tape-measure / machinist-scale standard.";
  const value = makeNumber("Decimal value (in)", "d2f-val", { step: "any", value: "2.375" }); value.input.value = "2.375";
  const den = makeSelect("Round to", "d2f-den", [
    { value: "2", label: "1/2 in" }, { value: "4", label: "1/4 in" }, { value: "8", label: "1/8 in" },
    { value: "16", label: "1/16 in", selected: true }, { value: "32", label: "1/32 in" }, { value: "64", label: "1/64 in" },
  ]);
  for (const f of [value, den]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { value.input.value = "2.375"; den.select.value = "16"; update(); });
  const oFrac = makeOutputLine(outputRegion, "Nearest fraction", "d2f-out-frac");
  const oFeet = makeOutputLine(outputRegion, "Feet-inches", "d2f-out-feet");
  const oErr = makeOutputLine(outputRegion, "Rounding error", "d2f-out-err");
  const oNote = makeOutputLine(outputRegion, "Notes", "d2f-out-note");
  const update = debounce(() => {
    const v = value.input.value === "" ? NaN : Number(value.input.value);
    const r = computeDecimalToFraction({ value_in: Number.isFinite(v) ? v : NaN, denominator: Number(den.select.value) });
    if (r.error) { oFrac.textContent = r.error; oFeet.textContent = "-"; oErr.textContent = "-"; oNote.textContent = ""; return; }
    oFrac.textContent = r.fraction_text;
    oFeet.textContent = r.feet_inch_text;
    oErr.textContent = fmt(r.error_in, 4) + " in (exact " + fmt(r.value_in, 4) + " in)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  value.input.addEventListener("input", update);
  den.select.addEventListener("change", update);
}
FAB_RENDERERS["decimal-to-fraction"] = _v33renderDecimalToFraction;

// --- v37 G: Sine bar angle setup (`sine-bar`) ---
// A sine bar of length L (the distance between its roll centers, commonly
// 5 in or 10 in) set on a gauge-block stack of height H tilts to angle theta
// where sin(theta) = H / L; so theta = arcsin(H/L) and H = L * sin(theta).
// dims: in { solve_for: dimensionless, bar_length_in: L, stack_height_in: L, target_angle_deg: dimensionless } out: { bar_length_in: L, stack_height_in: L, angle_deg: dimensionless }
export function computeSineBar({ solve_for = "angle", bar_length_in = 5, stack_height_in = 0, target_angle_deg = 0 } = {}) {
  const _g = _finiteGuard({ bar_length_in, stack_height_in, target_angle_deg }); if (_g) return _g;
  const L = Number(bar_length_in) || 0;
  if (!(L > 0)) return { error: "Sine bar length must be positive (in)." };
  const mode = String(solve_for) === "stack" ? "stack" : "angle";
  let angle_deg, stack_in;
  if (mode === "stack") {
    const ang = Number(target_angle_deg) || 0;
    if (!(ang >= 0 && ang <= 90)) return { error: "Target angle must be between 0 and 90 degrees." };
    stack_in = L * Math.sin((ang * Math.PI) / 180);
    angle_deg = ang;
  } else {
    const H = Number(stack_height_in) || 0;
    if (!(H >= 0)) return { error: "Stack height must be zero or positive (in)." };
    if (H > L) return { error: "Stack height cannot exceed the sine bar length (the sine of the angle cannot exceed 1)." };
    angle_deg = (Math.asin(H / L) * 180) / Math.PI;
    stack_in = H;
  }
  const notes = [];
  notes.push("A sine bar of length L set on a gauge-block stack of height H tilts to angle theta where sin(theta) = H / L; so theta = arcsin(H / L) and H = L x sin(theta). L is the distance between the roll centers (commonly 5 in or 10 in).");
  if (angle_deg > 45) notes.push("Above about 45 degrees the stack height changes little per degree, so a small gauge-block error becomes a large angle error; a sine plate or angle blocks are preferred for steep setups.");
  notes.push("Stack the gauge blocks to the height shown, wring them, and indicate the work to confirm; the gauge-block grade and the surface plate flatness govern the achievable accuracy.");
  return { solve_for: mode, bar_length_in: L, stack_height_in: stack_in, angle_deg, notes };
}
export const sineBarExample = { inputs: { solve_for: "angle", bar_length_in: 5, stack_height_in: 2.5, target_angle_deg: 0 } };

function _v37renderSineBar(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Sine bar angle setup - a bar of length L on a gauge-block stack of height H tilts to angle theta where sin(theta) = H / L, so theta = arcsin(H/L) and H = L x sin(theta) - first-principles trigonometry (the standard sine-bar / sine-plate relation as in Machinery's Handbook, by name). The gauge-block grade and surface-plate flatness govern the achievable accuracy.";
  const mode = makeSelect("Solve for", "sb-mode", [
    { value: "angle", label: "Angle from a gauge-block stack" },
    { value: "stack", label: "Gauge-block stack for a target angle" },
  ]);
  const len = makeNumber("Sine bar length (in: roll-center distance)", "sb-len", { step: "any", min: "0", value: "5" }); len.input.value = "5";
  const stack = makeNumber("Gauge-block stack height (in)", "sb-stack", { step: "any", min: "0", value: "2.5" }); stack.input.value = "2.5";
  const angle = makeNumber("Target angle (deg)", "sb-angle", { step: "any", min: "0" });
  for (const f of [mode, len, stack, angle]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "angle"; len.input.value = "5"; stack.input.value = "2.5"; angle.input.value = ""; update(); });
  const oAngle = makeOutputLine(outputRegion, "Angle", "sb-out-angle");
  const oStack = makeOutputLine(outputRegion, "Gauge-block stack", "sb-out-stack");
  const oNote = makeOutputLine(outputRegion, "Notes", "sb-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeSineBar({ solve_for: mode.select.value, bar_length_in: readNum(len.input), stack_height_in: readNum(stack.input), target_angle_deg: readNum(angle.input) });
    if (r.error) { oAngle.textContent = r.error; oStack.textContent = "-"; oNote.textContent = ""; return; }
    oAngle.textContent = fmt(r.angle_deg, 4) + " deg";
    oStack.textContent = fmt(r.stack_height_in, 4) + " in";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [len.input, stack.input, angle.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
FAB_RENDERERS["sine-bar"] = _v37renderSineBar;

// --- v38 G: Thread pitch / lead / 60-degree height (`thread-pitch`) ---
// Unified (UN/UNC/UNF) inch threads and ISO metric threads share a 60-degree
// included angle. Inch pitch P = 1 / TPI; metric pitch is the millimetre value
// directly, with TPI = 25.4 / P_mm. The lead (axial advance per turn) is
// P x number of starts. The fundamental sharp-V triangle height is
// H = P x cos(30) = P x sqrt(3) / 2, exact 60-degree geometry.
const _V38_COS30 = Math.sqrt(3) / 2; // = 0.8660254037844386
// dims: in { thread_standard: dimensionless, tpi: T^-1, pitch_mm: L, starts: dimensionless } out: { pitch_in: L, pitch_mm: L, tpi: dimensionless, lead_in: L, lead_mm: L, sharp_v_height_in: L, sharp_v_height_mm: L }
export function computeThreadPitch({ thread_standard = "inch", tpi = 0, pitch_mm = 0, starts = 1 } = {}) {
  const _g = _finiteGuard({ tpi, pitch_mm, starts }); if (_g) return _g;
  const isMetric = String(thread_standard) === "metric";
  const n = Math.round(Number(starts) || 1);
  if (!(n >= 1)) return { error: "Number of thread starts must be 1 or more." };
  let pitch_in, pmm, threadsPerInch;
  if (isMetric) {
    pmm = Number(pitch_mm) || 0;
    if (!(pmm > 0)) return { error: "Metric thread pitch must be positive (mm)." };
    pitch_in = pmm / 25.4;
    threadsPerInch = 1 / pitch_in;
  } else {
    threadsPerInch = Number(tpi) || 0;
    if (!(threadsPerInch > 0)) return { error: "Threads per inch (TPI) must be positive." };
    pitch_in = 1 / threadsPerInch;
    pmm = pitch_in * 25.4;
  }
  const lead_in = pitch_in * n;
  const lead_mm = pmm * n;
  const notes = [];
  notes.push("Inch pitch P = 1 / TPI; metric pitch is the millimetre value (TPI = 25.4 / P). Lead = pitch x starts is the axial advance per turn; on a single-start thread the lead equals the pitch.");
  notes.push("The 60-degree sharp-V height H = P x cos(30) = P x sqrt(3) / 2 is the theoretical fundamental triangle; the actual truncated thread depth and the tap-drill size are thread-form- and class-specific (UN crest/root flats, ISO 60-degree truncation) and are not computed here.");
  if (n > 1) notes.push("A " + n + "-start thread advances " + n + "x the pitch per turn for faster traverse with the same pitch (thread depth).");
  return {
    thread_standard: isMetric ? "metric" : "inch",
    pitch_in, pitch_mm: pmm, tpi: threadsPerInch, starts: n,
    lead_in, lead_mm,
    sharp_v_height_in: pitch_in * _V38_COS30,
    sharp_v_height_mm: pmm * _V38_COS30,
    notes,
  };
}
export const threadPitchExample = { inputs: { thread_standard: "inch", tpi: 20, pitch_mm: 0, starts: 1 } };

function _v38renderThreadPitch(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Thread pitch, lead, and 60-degree form - Unified (UN/UNC/UNF) inch and ISO metric threads share a 60-degree included angle; inch pitch P = 1 / TPI, metric pitch is the millimetre value (TPI = 25.4 / P), lead = pitch x starts, and the sharp-V fundamental height H = P x sqrt(3) / 2 - first-principles geometry as in Machinery's Handbook (Industrial Press), by name. The truncated thread depth and tap-drill size are thread-form- and class-specific and are not computed here.";
  const std = makeSelect("Thread standard", "tp-std", [
    { value: "inch", label: "Inch (UN/UNC/UNF: enter TPI)" },
    { value: "metric", label: "Metric (ISO: enter pitch in mm)" },
  ]);
  const tpi = makeNumber("Threads per inch (TPI)", "tp-tpi", { step: "any", min: "0", value: "20" }); tpi.input.value = "20";
  const pmm = makeNumber("Metric pitch (mm)", "tp-pmm", { step: "any", min: "0" });
  const starts = makeNumber("Number of starts", "tp-starts", { step: "1", min: "1", value: "1" }); starts.input.value = "1";
  for (const f of [std, tpi, pmm, starts]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { std.select.value = "inch"; tpi.input.value = "20"; pmm.input.value = ""; starts.input.value = "1"; update(); });
  const oPitch = makeOutputLine(outputRegion, "Pitch", "tp-out-pitch");
  const oTpi = makeOutputLine(outputRegion, "Threads per inch", "tp-out-tpi");
  const oLead = makeOutputLine(outputRegion, "Lead (per turn)", "tp-out-lead");
  const oHeight = makeOutputLine(outputRegion, "60-deg sharp-V height", "tp-out-height");
  const oNote = makeOutputLine(outputRegion, "Notes", "tp-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeThreadPitch({ thread_standard: std.select.value, tpi: readNum(tpi.input), pitch_mm: readNum(pmm.input), starts: readNum(starts.input) });
    if (r.error) { oPitch.textContent = r.error; oTpi.textContent = "-"; oLead.textContent = "-"; oHeight.textContent = "-"; oNote.textContent = ""; return; }
    oPitch.textContent = fmt(r.pitch_in, 5) + " in / " + fmt(r.pitch_mm, 4) + " mm";
    oTpi.textContent = fmt(r.tpi, 3) + " TPI";
    oLead.textContent = fmt(r.lead_in, 5) + " in / " + fmt(r.lead_mm, 4) + " mm";
    oHeight.textContent = fmt(r.sharp_v_height_in, 5) + " in / " + fmt(r.sharp_v_height_mm, 4) + " mm";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [tpi.input, pmm.input, starts.input]) f.addEventListener("input", update);
  std.select.addEventListener("change", update);
}
FAB_RENDERERS["thread-pitch"] = _v38renderThreadPitch;
