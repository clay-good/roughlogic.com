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
// spec-v37 added the sine-bar tile and spec-v38 added thread-pitch (both
// Group G). spec-v39 relocated the v24 conduit-bending suite (conduit-offset,
// conduit-saddle, conduit-90-stub) here from calc-electrical.js to relieve that
// module's gzip cap; those three keep group: "A" (electrical) -- this bench is
// the cross-trade home for first-principles bend/layout geometry, pipe and
// conduit alike, so a tile's group letter and its module differ here too.
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

// =====================================================================
// spec-v44 G - circular-arc (Circular Arc Layout from Chord & Rise) - Group G
// The everyday field-layout question for an arch, curved trim, sheet-metal
// radius, or road curve: from a measured chord (span) c and the rise
// (sagitta / middle ordinate) h at midspan, recover the radius, the arc
// length, and the central angle. R = (c^2/4 + h^2) / (2h); the central
// angle = 2*acos((R - h)/R) (valid for minor and major arcs); arc length
// = R * angle. First-principles circle geometry.
// =====================================================================

// dims: in { chord_in: L, rise_in: L } out: { radius_in: L, diameter_in: L, arc_length_in: L, central_angle_deg: dimensionless }
export function computeCircularArc({ chord_in = 0, rise_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const c = Number(chord_in) || 0, h = Number(rise_in) || 0;
  if (!(c > 0)) return { error: "Chord (span) must be positive (in)." };
  if (!(h > 0)) return { error: "Rise (sagitta) must be positive (in)." };
  const a = c / 2;
  const radius_in = (a * a + h * h) / (2 * h);
  const central_angle_rad = 2 * Math.acos((radius_in - h) / radius_in);
  const central_angle_deg = (central_angle_rad * 180) / Math.PI;
  const arc_length_in = radius_in * central_angle_rad;
  const notes = [];
  notes.push("Radius R = (chord^2 / 4 + rise^2) / (2 x rise); the rise is the perpendicular height of the arc at midspan (the sagitta or middle ordinate). Central angle = 2 x acos((R - rise) / R); arc length = R x angle. First-principles circle geometry.");
  if (h > radius_in) notes.push("Rise exceeds the radius, so this is a major arc (more than a semicircle); the chord cuts off the smaller side.");
  else if (Math.abs(h - radius_in) < 1e-9) notes.push("Rise equals the radius: the chord is a diameter and the arc is a semicircle.");
  notes.push("Lay it out by swinging the radius from the center, set " + a.toFixed(3) + " in to each side of midspan along the chord. Trammel or string-line at this radius reproduces the curve.");
  return { chord_in: c, rise_in: h, half_chord_in: a, radius_in, diameter_in: 2 * radius_in, central_angle_deg, arc_length_in, notes };
}
export const circularArcExample = { inputs: { chord_in: 24, rise_in: 4 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderCircularArc(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles circle geometry. Radius from a chord and rise R = (chord^2/4 + rise^2)/(2 x rise); central angle = 2 x acos((R - rise)/R); arc length = R x angle. Public-domain layout method (the sagitta / middle-ordinate relation) as in Machinery's Handbook (Industrial Press), by name.";
  const chord = makeNumber("Chord / span (in)", "ca-chord", { step: "any", min: "0" });
  const rise = makeNumber("Rise at midspan (sagitta, in)", "ca-rise", { step: "any", min: "0" });
  for (const f of [chord, rise]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { chord.input.value = "24"; rise.input.value = "4"; update(); });
  const oRad = makeOutputLine(outputRegion, "Radius", "ca-out-rad");
  const oArc = makeOutputLine(outputRegion, "Arc length", "ca-out-arc");
  const oAngle = makeOutputLine(outputRegion, "Central angle", "ca-out-angle");
  const oNote = makeOutputLine(outputRegion, "Notes", "ca-out-note");
  const update = debounce(() => {
    const r = computeCircularArc({ chord_in: Number(chord.input.value) || 0, rise_in: Number(rise.input.value) || 0 });
    if (r.error) { oRad.textContent = r.error; oArc.textContent = "-"; oAngle.textContent = "-"; oNote.textContent = ""; return; }
    oRad.textContent = fmt(r.radius_in, 4) + " in (diameter " + fmt(r.diameter_in, 4) + " in)";
    oArc.textContent = fmt(r.arc_length_in, 4) + " in";
    oAngle.textContent = fmt(r.central_angle_deg, 4) + " deg";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [chord.input, rise.input]) f.addEventListener("input", update);
}
FAB_RENDERERS["circular-arc"] = renderCircularArc;

// =====================================================================
// spec-v47 G - circle-from-3-points (Circle Through Three Points) - Group G
// The inverse of bolt-circle: recover a circle's center and radius from
// three measured points on its arc (the circumcircle). Useful when you
// cannot measure the chord and rise at an exact midspan but can take
// three points off the curve. center = circumcenter of the triangle;
// radius = distance center -> any point. First-principles geometry.
// =====================================================================

// dims: in { x1: L, y1: L, x2: L, y2: L, x3: L, y3: L } out: { center_x: L, center_y: L, radius: L, diameter: L, circumference: L }
export function computeCircleFrom3Points({ x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ax = Number(x1) || 0, ay = Number(y1) || 0;
  const bx = Number(x2) || 0, by = Number(y2) || 0;
  const cx = Number(x3) || 0, cy = Number(y3) || 0;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return { error: "The three points are collinear (or coincident) - no unique circle passes through them." };
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  const center_x = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const center_y = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  const radius = Math.hypot(ax - center_x, ay - center_y);
  const notes = [];
  notes.push("Center = the circumcenter of the triangle formed by the three points (the intersection of the perpendicular bisectors); radius = distance from the center to any of the points. First-principles geometry - use any consistent length unit and the answer is in that unit.");
  notes.push("The three points must lie on the arc and not be collinear. Measure them as far apart on the curve as practical; points bunched together amplify measurement error in the fitted radius.");
  return { center_x, center_y, radius, diameter: 2 * radius, circumference: 2 * Math.PI * radius, notes };
}
export const circleFrom3PointsExample = { inputs: { x1: 0, y1: 0, x2: 4, y2: 0, x3: 0, y3: 3 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderCircleFrom3Points(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles geometry. The circle through three non-collinear points is the triangle's circumcircle: the center is the circumcenter (intersection of the perpendicular bisectors), the radius the distance to any point. Public-domain method (as in Machinery's Handbook coordinate geometry, by name). Take the three points as far apart on the arc as practical.";
  const x1 = makeNumber("Point 1 x", "c3-x1", { step: "any" });
  const y1 = makeNumber("Point 1 y", "c3-y1", { step: "any" });
  const x2 = makeNumber("Point 2 x", "c3-x2", { step: "any" });
  const y2 = makeNumber("Point 2 y", "c3-y2", { step: "any" });
  const x3 = makeNumber("Point 3 x", "c3-x3", { step: "any" });
  const y3 = makeNumber("Point 3 y", "c3-y3", { step: "any" });
  for (const f of [x1, y1, x2, y2, x3, y3]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { x1.input.value = "0"; y1.input.value = "0"; x2.input.value = "4"; y2.input.value = "0"; x3.input.value = "0"; y3.input.value = "3"; update(); });
  const oCenter = makeOutputLine(outputRegion, "Center (x, y)", "c3-out-center");
  const oRad = makeOutputLine(outputRegion, "Radius", "c3-out-rad");
  const oCirc = makeOutputLine(outputRegion, "Diameter / circumference", "c3-out-circ");
  const oNote = makeOutputLine(outputRegion, "Notes", "c3-out-note");
  const update = debounce(() => {
    const r = computeCircleFrom3Points({
      x1: Number(x1.input.value) || 0, y1: Number(y1.input.value) || 0,
      x2: Number(x2.input.value) || 0, y2: Number(y2.input.value) || 0,
      x3: Number(x3.input.value) || 0, y3: Number(y3.input.value) || 0,
    });
    if (r.error) { oCenter.textContent = r.error; oRad.textContent = "-"; oCirc.textContent = "-"; oNote.textContent = ""; return; }
    oCenter.textContent = "(" + fmt(r.center_x, 4) + ", " + fmt(r.center_y, 4) + ")";
    oRad.textContent = fmt(r.radius, 4);
    oCirc.textContent = fmt(r.diameter, 4) + " / " + fmt(r.circumference, 4);
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [x1.input, y1.input, x2.input, y2.input, x3.input, y3.input]) f.addEventListener("input", update);
}
FAB_RENDERERS["circle-from-3-points"] = renderCircleFrom3Points;
