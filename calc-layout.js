// =====================================================================
// calc-layout.js - Layout & shop-geometry bench (Group G).
//
// Split out of calc-fab.js by spec-v56 when that module reached 96% of its
// gzip cap after the layout family grew. This module holds the pure
// layout / coordinate / angle / measurement geometry tiles: the two-scale
// center of gravity (v27), bolt-circle hole layout (v32), decimal-to-fraction
// tape math (v33), sine-bar angle setup (v37), thread pitch / lead (v38),
// circular-arc layout from chord and rise (v44), the circle through three
// points (v47), and the regular-polygon miter and layout (v55).
//
// All remain Group G tiles (a tile group letter is independent of its
// module, the spec-v28 / v36 / v39 precedent); nothing about any tile,
// formula, citation, worked example, or rendered output changed in the
// split -- only the on-disk module layout did.
//
// Pure exported compute functions plus their renderers and the
// LAYOUT_RENDERERS map, mirroring every other calc-*.js module.
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

export const LAYOUT_RENDERERS = {};

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
LAYOUT_RENDERERS["center-of-gravity-2point"] = _v27renderCenterOfGravity2Point;

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
LAYOUT_RENDERERS["bolt-circle"] = _v32renderBoltCircle;

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
LAYOUT_RENDERERS["decimal-to-fraction"] = _v33renderDecimalToFraction;

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
LAYOUT_RENDERERS["sine-bar"] = _v37renderSineBar;

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
LAYOUT_RENDERERS["thread-pitch"] = _v38renderThreadPitch;

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
LAYOUT_RENDERERS["circular-arc"] = renderCircularArc;

// circular-arc-rise-from-radius: inverse of circular-arc. The forward tile gives the radius from a chord and rise; the
// inverse recovers the rise (sagitta / middle ordinate) from a known radius and chord, so a layout person marks the arc
// height at midspan when the radius is set. From R = ((chord/2)^2 + rise^2) / (2 rise), rise^2 - 2 R rise + (chord/2)^2 = 0,
// and the minor-arc root is rise = R - sqrt(R^2 - (chord/2)^2). The chord cannot exceed the diameter (R >= chord/2).
// dims: in { chord_in: L, radius_in: L } out: { rise_in: L, arc_length_in: L, central_angle_deg: dimensionless }
export function computeCircularArcRiseFromRadius({ chord_in = 0, radius_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const c = Number(chord_in) || 0, R = Number(radius_in) || 0;
  if (!(c > 0)) return { error: "Chord (span) must be positive (in)." };
  if (!(R > 0)) return { error: "Radius must be positive (in)." };
  const a = c / 2;
  if (!(R >= a)) return { error: "Chord cannot exceed the diameter (radius must be at least half the chord)." };
  const rise_in = R - Math.sqrt(R * R - a * a);
  const central_angle_rad = 2 * Math.asin(a / R);
  const central_angle_deg = (central_angle_rad * 180) / Math.PI;
  const arc_length_in = R * central_angle_rad;
  if (![rise_in, central_angle_deg, arc_length_in].every(Number.isFinite)) return { error: "Arc-rise math is not a finite value." };
  const notes = [];
  notes.push("Rise (sagitta / middle ordinate) = R - sqrt(R^2 - (chord/2)^2), the inverse of R = (chord^2/4 + rise^2) / (2 rise). This is the perpendicular height of the MINOR arc at midspan; central angle = 2 x asin((chord/2)/R), arc length = R x angle. First-principles circle geometry.");
  if (Math.abs(a - R) < 1e-9) notes.push("The chord equals the diameter: the rise equals the radius and the arc is a semicircle.");
  notes.push("Lay it out by swinging the radius from the center, or offset " + rise_in.toFixed(3) + " in up from the chord midpoint and " + a.toFixed(3) + " in to each end; a trammel or string-line at this radius reproduces the curve.");
  return { chord_in: c, radius_in: R, rise_in, central_angle_deg, arc_length_in, notes };
}
export const circularArcRiseFromRadiusExample = { inputs: { chord_in: 24, radius_in: 20 } };

function renderCircularArcRiseFromRadius(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles circle geometry. Rise from a chord and radius R = (chord^2/4 + rise^2)/(2 rise) solved for the rise: rise = R - sqrt(R^2 - (chord/2)^2); central angle = 2 x asin((chord/2)/R); arc length = R x angle. Public-domain layout method (the sagitta / middle-ordinate relation) as in Machinery's Handbook (Industrial Press), by name.";
  const chord = makeNumber("Chord / span (in)", "car-chord", { step: "any", min: "0" });
  const radius = makeNumber("Radius (in)", "car-radius", { step: "any", min: "0" });
  for (const f of [chord, radius]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { chord.input.value = "24"; radius.input.value = "20"; update(); });
  const oRise = makeOutputLine(outputRegion, "Rise (sagitta) at midspan", "car-out-rise");
  const oArc = makeOutputLine(outputRegion, "Arc length", "car-out-arc");
  const oAngle = makeOutputLine(outputRegion, "Central angle", "car-out-angle");
  const oNote = makeOutputLine(outputRegion, "Notes", "car-out-note");
  const update = debounce(() => {
    const r = computeCircularArcRiseFromRadius({ chord_in: Number(chord.input.value) || 0, radius_in: Number(radius.input.value) || 0 });
    if (r.error) { oRise.textContent = r.error; oArc.textContent = "-"; oAngle.textContent = "-"; oNote.textContent = ""; return; }
    oRise.textContent = fmt(r.rise_in, 4) + " in";
    oArc.textContent = fmt(r.arc_length_in, 4) + " in";
    oAngle.textContent = fmt(r.central_angle_deg, 4) + " deg";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [chord.input, radius.input]) f.addEventListener("input", update);
}
LAYOUT_RENDERERS["circular-arc-rise-from-radius"] = renderCircularArcRiseFromRadius;

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
LAYOUT_RENDERERS["circle-from-3-points"] = renderCircleFrom3Points;

// =====================================================================
// spec-v55 G - polygon-miter (Regular Polygon Miter and Layout) - Group G
// Build any N-sided frame (octagon column wrap, hexagon planter, picture
// frame, segmented ring): each of the N pieces is mitered at 180/N deg
// off square at both ends, the interior corner is (N-2)*180/N. Size the
// pieces from a target side length, across-flats width, or across-corners
// diameter: across-flats = s/tan(pi/N), across-corners = s/sin(pi/N).
// First-principles regular-polygon geometry; reproduces the known miter
// values (square 45, hexagon 30, octagon 22.5).
// =====================================================================

// dims: in { sides: dimensionless, size_mode: dimensionless, size_in: L } out: { side_in: L, miter_angle_deg: dimensionless, interior_angle_deg: dimensionless, across_flats_in: L, across_corners_in: L, perimeter_in: L, area_in2: L^2 }
export function computePolygonMiter({ sides = 0, size_mode = "side", size_in = 0 } = {}) {
  const _g = _finiteGuard({ sides, size_in }); if (_g) return _g;
  const N = Math.floor(Number(sides) || 0);
  if (!(N >= 3)) return { error: "A polygon needs at least 3 sides." };
  if (N > 360) return { error: "Number of sides must be 360 or fewer." };
  const D = Number(size_in) || 0;
  if (!(D > 0)) return { error: "The size dimension must be positive (in)." };
  const mode = String(size_mode);
  const half = Math.PI / N;
  let side;
  if (mode === "flats") side = D * Math.tan(half);        // across-flats = s/tan(pi/N) -> s = flats x tan
  else if (mode === "corners") side = D * Math.sin(half); // across-corners = s/sin(pi/N) -> s = corners x sin
  else side = D;                                          // side length given directly
  const miter_angle_deg = 180 / N;
  const interior_angle_deg = ((N - 2) * 180) / N;
  const across_flats_in = side / Math.tan(half);
  const across_corners_in = side / Math.sin(half);
  const perimeter_in = N * side;
  const area_in2 = (0.25 * N * side * side) / Math.tan(half);
  const notes = [];
  notes.push("Cut all " + N + " pieces with a " + fmt(miter_angle_deg, 3) + " degree miter at both ends (" + (2 * N) + " cuts); the saw is set to " + fmt(miter_angle_deg, 3) + " degrees off square. The interior corner angle is " + fmt(interior_angle_deg, 3) + " degrees.");
  notes.push("Across-flats is the face-to-face width (a column-wrap or planter width); across-corners is the point-to-point diameter (the circumscribed circle). First-principles regular-polygon geometry - cut a scrap test joint first and allow for blade kerf, which shortens each piece.");
  return { sides: N, side_in: side, miter_angle_deg, interior_angle_deg, across_flats_in, across_corners_in, perimeter_in, area_in2, notes };
}
export const polygonMiterExample = { inputs: { sides: 6, size_mode: "side", size_in: 12 } };

function _v55renderPolygonMiter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Regular-polygon frame geometry - each joint is mitered at 180/N degrees off square, the interior angle is (N-2) x 180/N, and the side relates to the across-flats width by s = flats x tan(180/N) and the across-corners diameter by s = corners x sin(180/N) - first-principles trigonometry, public domain. Reproduces the known miters (square 45, hexagon 30, octagon 22.5). Cut a scrap test joint and allow for blade kerf.";
  const n = makeNumber("Number of sides (N)", "pm-n", { step: "1", min: "3", value: "6" }); n.input.value = "6";
  const mode = makeSelect("Size given as", "pm-mode", [
    { value: "side", label: "Side length (each piece)" },
    { value: "flats", label: "Across flats (face-to-face width)" },
    { value: "corners", label: "Across corners (point-to-point)" },
  ]);
  const size = makeNumber("Size (in)", "pm-size", { step: "any", min: "0", value: "12" }); size.input.value = "12";
  for (const f of [n, mode, size]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n.input.value = "6"; mode.select.value = "side"; size.input.value = "12"; update(); });
  const oMiter = makeOutputLine(outputRegion, "Miter / interior angle", "pm-out-miter");
  const oSide = makeOutputLine(outputRegion, "Side length", "pm-out-side");
  const oSize = makeOutputLine(outputRegion, "Across flats / corners", "pm-out-size");
  const oArea = makeOutputLine(outputRegion, "Perimeter / area", "pm-out-area");
  const oNote = makeOutputLine(outputRegion, "Notes", "pm-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computePolygonMiter({ sides: readNum(n.input), size_mode: mode.select.value, size_in: readNum(size.input) });
    if (r.error) { oMiter.textContent = r.error; oSide.textContent = "-"; oSize.textContent = "-"; oArea.textContent = "-"; oNote.textContent = ""; return; }
    oMiter.textContent = fmt(r.miter_angle_deg, 3) + " deg miter (off square) at each end; interior " + fmt(r.interior_angle_deg, 3) + " deg";
    oSide.textContent = fmt(r.side_in, 4) + " in x " + r.sides + " pieces";
    oSize.textContent = fmt(r.across_flats_in, 4) + " in flats / " + fmt(r.across_corners_in, 4) + " in corners";
    oArea.textContent = fmt(r.perimeter_in, 3) + " in perimeter / " + fmt(r.area_in2, 3) + " in^2";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [n.input, size.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
LAYOUT_RENDERERS["polygon-miter"] = _v55renderPolygonMiter;

// =====================================================================
// spec-v57 G - equal-spacing (Equal Spacing Layout) - Group G
// Lay out N items of width w evenly in a run R: there are N+1 equal gaps
// of (R - N x w)/(N+1), and the center-to-center pitch is gap + w. In
// max-gap mode the smallest N whose gap stays at or below a limit gmax is
// N = ceil((R - gmax)/(w + gmax)). The everyday deck-rail baluster, fence
// picket, stud, shelf-pin, or divide-a-run-into-equal-parts layout.
// First-principles arithmetic; the gap limit (e.g. the IRC guard rule) is
// user-supplied.
// =====================================================================

// dims: in { run_in: L, item_width_in: L, mode: dimensionless, max_gap_in: L, count: dimensionless } out: { count: dimensionless, gap_in: L, center_to_center_in: L, span_used_in: L }
export function computeEqualSpacing({ run_in = 0, item_width_in = 0, mode = "max-gap", max_gap_in = 0, count = 0 } = {}) {
  const _g = _finiteGuard({ run_in, item_width_in, max_gap_in, count }); if (_g) return _g;
  const run = Number(run_in) || 0;
  const w = Number(item_width_in) || 0;
  if (!(run > 0)) return { error: "Run length must be positive (in)." };
  if (w < 0) return { error: "Item width cannot be negative (use 0 for layout marks / division points)." };
  const m = String(mode) === "count" ? "count" : "max-gap";
  let N;
  if (m === "count") {
    N = Math.floor(Number(count) || 0);
    if (!(N >= 1)) return { error: "Desired count must be at least 1." };
    if (N > 10000) return { error: "Desired count must be 10000 or fewer." };
  } else {
    const gmax = Number(max_gap_in) || 0;
    if (!(gmax > 0)) return { error: "Maximum gap must be positive (in)." };
    N = Math.ceil((run - gmax) / (w + gmax));
    if (!(N >= 0)) N = 0;
  }
  const gap_in = (run - N * w) / (N + 1);
  const fits = gap_in >= 0;
  const center_to_center_in = gap_in + w; // for w = 0 (marks) this equals the gap
  const span_used_in = N * w + (N + 1) * Math.max(gap_in, 0);
  // Item-center (or division-point) positions from the start of the run.
  // Bounded to 200 to keep the output and memory small; large layouts read
  // off the center-to-center pitch instead.
  const positions = [];
  if (fits && N <= 200) {
    for (let i = 1; i <= N; i++) {
      positions.push(w > 0 ? (i - 1) * (gap_in + w) + gap_in + w / 2 : i * gap_in);
    }
  }
  const notes = [];
  if (!fits) {
    notes.push("The " + N + " items at " + fmt(w, 3) + " in wide do not fit in a " + fmt(run, 3) + " in run (they would need a negative gap). Reduce the count or the item width.");
  } else if (m === "max-gap") {
    notes.push("Smallest count whose gap stays at or below " + fmt(Number(max_gap_in) || 0, 3) + " in: " + N + " item(s), with " + (N + 1) + " equal gaps of " + fmt(gap_in, 4) + " in. Center-to-center pitch " + fmt(center_to_center_in, 4) + " in.");
    notes.push("The gap limit is user-supplied. For a guard / railing the IRC R312.1.3 rule is that a 4 in sphere must not pass, so enter a max gap just under 4 in; the AHJ-adopted code governs.");
  } else {
    notes.push((w > 0 ? N + " item(s)" : N + " mark(s)") + " split the run into " + (N + 1) + " equal gaps of " + fmt(gap_in, 4) + " in" + (w > 0 ? " (center-to-center " + fmt(center_to_center_in, 4) + " in)" : "") + ".");
    notes.push("Positions are measured to the item center (or the division point) from the start of the run. First-principles layout arithmetic; allow for your end conditions (posts, reveals) and mark from a single datum to avoid creep.");
  }
  return { mode: m, run_in: run, item_width_in: w, count: N, gap_in, center_to_center_in, fits, span_used_in, positions, notes };
}
export const equalSpacingExample = { inputs: { run_in: 60, item_width_in: 1.5, mode: "max-gap", max_gap_in: 4, count: 0 } };

function _v57renderEqualSpacing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Equal-spacing layout - N items of width w in a run R have N+1 equal gaps of (R - N x w)/(N+1) and a center-to-center pitch of gap + w; in max-gap mode the smallest N whose gap stays at or below the limit is ceil((R - gmax)/(w + gmax)) - first-principles arithmetic, public domain. The gap limit (for example the IRC R312.1.3 4-inch-sphere guard rule) is user-supplied; the adopted code governs.";
  const run = makeNumber("Total run (in)", "es-run", { step: "any", min: "0", value: "60" }); run.input.value = "60";
  const w = makeNumber("Item width (in, 0 for marks)", "es-w", { step: "any", min: "0", value: "1.5" }); w.input.value = "1.5";
  const mode = makeSelect("Solve for", "es-mode", [
    { value: "max-gap", label: "Count from a maximum gap" },
    { value: "count", label: "Gap from a desired count" },
  ]);
  const gmax = makeNumber("Maximum gap (in)", "es-gmax", { step: "any", min: "0", value: "4" }); gmax.input.value = "4";
  const count = makeNumber("Desired count", "es-count", { step: "1", min: "1" });
  for (const f of [run, w, mode, gmax, count]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { run.input.value = "60"; w.input.value = "1.5"; mode.select.value = "max-gap"; gmax.input.value = "4"; count.input.value = ""; update(); });
  const oCount = makeOutputLine(outputRegion, "Count / gap", "es-out-count");
  const oCC = makeOutputLine(outputRegion, "Center-to-center", "es-out-cc");
  const oPos = makeOutputLine(outputRegion, "Positions (in from start)", "es-out-pos");
  const oNote = makeOutputLine(outputRegion, "Notes", "es-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeEqualSpacing({ run_in: readNum(run.input), item_width_in: readNum(w.input), mode: mode.select.value, max_gap_in: readNum(gmax.input), count: readNum(count.input) });
    if (r.error) { oCount.textContent = r.error; oCC.textContent = "-"; oPos.textContent = "-"; oNote.textContent = ""; return; }
    oCount.textContent = r.count + (r.item_width_in > 0 ? " item(s)" : " mark(s)") + ", gap " + fmt(r.gap_in, 4) + " in" + (r.fits ? "" : " (does not fit)");
    oCC.textContent = r.item_width_in > 0 ? fmt(r.center_to_center_in, 4) + " in pitch" : "(marks only)";
    if (!r.fits || r.positions.length === 0) oPos.textContent = r.count > 200 ? "(over 200; read off the pitch)" : "-";
    else oPos.textContent = r.positions.slice(0, 16).map((p) => fmt(p, 3)).join(", ") + (r.positions.length > 16 ? ", ..." : "");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [run.input, w.input, gmax.input, count.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
LAYOUT_RENDERERS["equal-spacing"] = _v57renderEqualSpacing;
