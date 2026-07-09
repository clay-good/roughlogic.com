// Group A (cont.): electrician design/layout bench.
// spec-v101 establishes this new lazy-loaded renderer module for the
// design and layout numbers an electrician sizes off the print before the
// rough-in, relieving the standing calc-electrical.js cap watch instead of
// bumping that module again. Every tile keeps group: "A" (a tile's group
// letter is independent of the module that holds it -- the v28/v70..v100
// split precedent). Tiles:
//   v101 pull-box-sizing, lumen-method
// Both GOVERNANCE.general design arithmetic (the code and the design
// standard govern, and the AHJ is the law). See spec-v101.md.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeTextarea,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied
// verbatim from the sibling calc-* modules; non-exported, no corpus row).
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

// Compact renderer factory (same shape as the calc-finish.js _simpleRenderer)
// supporting number and select inputs.
function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any", min: "0" });
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
}

export const ELECDESIGN_RENDERERS = {};

// ===================== spec-v101: NEC 314.28 pull/junction box sizing =====================

// dims: in { pull_type: dimensionless, largest_raceway_in: L, other_raceways_in: L } out: { straight_min: L, angle_min: L, between: L, governing: L }
export function computePullBoxSizing({ pull_type = "straight", largest_raceway_in = 0, other_raceways_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (other_raceways_in < 0) return { error: "The same-row other-raceways sum must be non-negative." };
  if (!(largest_raceway_in > 0)) return { error: "Largest raceway trade size must be positive." };
  const straight_min = 8 * largest_raceway_in;
  const angle_min = 6 * largest_raceway_in + other_raceways_in;
  const between = 6 * largest_raceway_in;
  const governing = pull_type === "angle" ? angle_min : straight_min;
  return {
    pull_type, straight_min, angle_min, between, governing,
    note: "NEC 314.28(A)(1) sets a straight-pull length of at least 8x the largest raceway. 314.28(A)(2) sets the distance from each raceway entry to the opposite wall on an angle or U pull at 6x the largest raceway plus the sum of the other raceways in that same row. The distance between raceway entries enclosing the same conductor must be at least 6x the larger raceway. These are minimums - the box's listed dimensions, conductor bending space, and the AHJ govern.",
  };
}
const pullBoxSizingExample = { inputs: { pull_type: "straight", largest_raceway_in: 3, other_raceways_in: 0 } };
ELECDESIGN_RENDERERS["pull-box-sizing"] = _simpleRenderer({
  citation: "Citation: NEC (NFPA 70) 314.28(A)(1) straight-pull (8x) and 314.28(A)(2) angle/U-pull (6x + same-row others) minimums, plus the 6x between-entries rule for the same conductor (by name). Minimums only; the listed box and the AHJ govern.",
  example: pullBoxSizingExample.inputs,
  fields: [
    { key: "pull_type", label: "Pull type", kind: "select", options: [
      { value: "straight", label: "Straight pull (8x)" },
      { value: "angle", label: "Angle / U pull (6x + others)" },
    ] },
    { key: "largest_raceway_in", label: "Largest raceway (trade size, in)", kind: "number" },
    { key: "other_raceways_in", label: "Other raceways in row (sum, in)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "g", id: "pbs-out-g", label: "Minimum box dimension", value: (r) => fmt(r.governing, 1) + " in (" + (r.pull_type === "angle" ? "angle/U" : "straight") + " pull)" },
    { key: "s", id: "pbs-out-s", label: "Straight-pull minimum (8x)", value: (r) => fmt(r.straight_min, 1) + " in" },
    { key: "a", id: "pbs-out-a", label: "Angle/U-pull minimum (6x + others)", value: (r) => fmt(r.angle_min, 1) + " in" },
    { key: "b", id: "pbs-out-b", label: "Between same-conductor entries (6x)", value: (r) => fmt(r.between, 1) + " in" },
    { key: "n", id: "pbs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePullBoxSizing,
});

// ===================== spec-v101: IES lumen-method luminaire count =====================

// dims: in { target_fc: dimensionless, area_sqft: L^2, lumens_per_lum: dimensionless, cu: dimensionless, llf: dimensionless } out: { count_raw: dimensionless, count: dimensionless, achieved_fc: dimensionless, total_lumens: dimensionless }
export function computeLumenMethod({ target_fc = 0, area_sqft = 0, lumens_per_lum = 0, cu = 0.7, llf = 0.8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(target_fc > 0)) return { error: "Target footcandle level must be positive." };
  if (!(area_sqft > 0)) return { error: "Room area must be positive." };
  if (!(lumens_per_lum > 0)) return { error: "Lumens per luminaire must be positive." };
  if (!(cu > 0 && cu <= 1.5)) return { error: "Coefficient of utilization must be in (0, 1.5]." };
  if (!(llf > 0 && llf <= 1)) return { error: "Light-loss factor must be in (0, 1]." };
  const count_raw = (target_fc * area_sqft) / (lumens_per_lum * cu * llf);
  const count = Math.ceil(count_raw);
  const achieved_fc = count * lumens_per_lum * cu * llf / area_sqft;
  const total_lumens = count * lumens_per_lum;
  return {
    count_raw, count, achieved_fc, total_lumens,
    note: "The lumen method sizes the AVERAGE maintained level over the work plane, not a point value or uniformity. The coefficient of utilization comes from the fixture's photometric report at the room's cavity ratio and surface reflectances; the light-loss factor is the product of lamp-lumen depreciation and luminaire-dirt depreciation for the maintenance interval. Round up so the design meets the target at end of life. A photometric layout governs spacing and uniformity.",
  };
}
const lumenMethodExample = { inputs: { target_fc: 50, area_sqft: 1200, lumens_per_lum: 5000, cu: 0.7, llf: 0.8 } };
ELECDESIGN_RENDERERS["lumen-method"] = _simpleRenderer({
  citation: "Citation: IES lumen method (by name) - number of luminaires = target footcandles x area / (lumens x CU x LLF), rounded up; CU from the photometric report, LLF = lamp-lumen x dirt depreciation. Sizes the average maintained level; a photometric layout governs spacing.",
  example: lumenMethodExample.inputs,
  fields: [
    { key: "target_fc", label: "Target maintained (footcandles)", kind: "number" },
    { key: "area_sqft", label: "Room area (sq ft)", kind: "number" },
    { key: "lumens_per_lum", label: "Lumens per luminaire", kind: "number" },
    { key: "cu", label: "Coefficient of utilization (CU)", kind: "number", default: 0.7 },
    { key: "llf", label: "Light-loss factor (LLF)", kind: "number", default: 0.8 },
  ],
  outputs: [
    { key: "c", id: "lm-out-c", label: "Luminaires (rounded up)", value: (r) => String(r.count) },
    { key: "r", id: "lm-out-r", label: "Exact count", value: (r) => fmt(r.count_raw, 2) },
    { key: "a", id: "lm-out-a", label: "Achieved maintained", value: (r) => fmt(r.achieved_fc, 1) + " fc" },
    { key: "t", id: "lm-out-t", label: "Total installed lumens", value: (r) => fmt(r.total_lumens, 0) + " lm" },
    { key: "n", id: "lm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLumenMethod,
});

// ===================== spec-v175: point-method horizontal illuminance =====================

// dims: in { intensity_cd: J, mount_height_ft: L, angle_deg: dimensionless } out: { distance_ft: L, e_fc: L^-2, e_lux: L^-2 }
export function computePointIlluminance({ intensity_cd = 0, mount_height_ft = 0, angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cd = Number(intensity_cd) || 0;
  const h = Number(mount_height_ft) || 0;
  const ang = Number(angle_deg) || 0;
  if (!(cd > 0)) return { error: "Luminous intensity must be positive (candela)." };
  if (!(h > 0)) return { error: "Mounting height must be positive (ft)." };
  if (ang < 0 || ang >= 90) return { error: "Angle from nadir must be in [0, 90) degrees." };

  const cosA = Math.cos(ang * Math.PI / 180);
  const distance_ft = h / cosA;                        // slant distance source-to-point
  const e_fc = cd * cosA / (distance_ft * distance_ft); // = cd * cos^3 / h^2
  const e_lux = e_fc * 10.764;
  return {
    distance_ft: Number.isFinite(distance_ft) ? distance_ft : null,
    e_fc: Number.isFinite(e_fc) ? e_fc : null,
    e_lux: Number.isFinite(e_lux) ? e_lux : null,
    note: "IES point method (inverse-square + cosine law): E = I x cos(angle) / d^2, with d = mounting height / cos(angle), so E = I x cos^3(angle) / h^2. This is the DIRECT horizontal illuminance from one source, ignoring interreflection; lux = fc x 10.764. A design relies on the manufacturer's photometric file and the IES target level.",
  };
}
const pointIlluminanceExample = { inputs: { intensity_cd: 1000, mount_height_ft: 10, angle_deg: 0 } };
ELECDESIGN_RENDERERS["point-illuminance"] = _simpleRenderer({
  citation: "Citation: IES point method (by name) - horizontal illuminance at a point from a source of known candlepower by the inverse-square and cosine laws: E_fc = I x cos^3(angle) / height^2. Direct illuminance from one source, ignoring interreflection; lux = fc x 10.764. The photometric file and the IES target govern.",
  example: pointIlluminanceExample.inputs,
  fields: [
    { key: "intensity_cd", label: "Luminous intensity toward point (candela)", kind: "number" },
    { key: "mount_height_ft", label: "Mounting height above work plane (ft)", kind: "number" },
    { key: "angle_deg", label: "Angle from straight-down / nadir (deg)", kind: "number", attrs: { step: "any", min: "0", max: "89.9" }, default: 0 },
  ],
  outputs: [
    { key: "e", id: "pi-out-e", label: "Horizontal illuminance", value: (r) => fmt(r.e_fc, 2) + " fc (" + fmt(r.e_lux, 1) + " lux)" },
    { key: "d", id: "pi-out-d", label: "Slant distance to point", value: (r) => fmt(r.distance_ft, 2) + " ft" },
    { key: "n", id: "pi-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePointIlluminance,
});

// ===================== spec-v365..v367: lighting light-loss & compliance batch (Group A) =====================
// The maintained-light and code numbers the lumen-method tile assumes: the
// light-loss factor stack that turns initial into maintained lumens (v365), the
// illuminance uniformity ratio a grid of readings gives (v366), and the egress
// lighting compliance check against NFPA 101 / IBC minimums (v367).

// dims: in { LLD: dimensionless, LDD: dimensionless, BF: dimensionless, LBO: dimensionless, RSDD: dimensionless, other: dimensionless, initial_lm: dimensionless } out: { LLF: dimensionless, maintained_lm: dimensionless }
export function computeLightingLightLossFactor({ LLD = 0, LDD = 0, BF = 0, LBO = 0, RSDD = 0, other = 0, initial_lm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const keys = { LLD, LDD, BF, LBO, RSDD, other };
  let LLF = 1;
  let anyEntered = false;
  for (const [k, v] of Object.entries(keys)) {
    const val = Number(v) || 0;
    if (val === 0) continue;
    if (!(val > 0 && val <= 1)) return { error: "Each light-loss factor must be over 0 and at most 1 (" + k + ")." };
    LLF *= val;
    anyEntered = true;
  }
  if (!anyEntered) return { error: "Enter at least one light-loss factor (0 to 1)." };
  const init = Number(initial_lm) || 0;
  const maintained_lm = init > 0 ? init * LLF : null;
  return {
    LLF, maintained_lm,
    note: "Light-loss factor LLF = the product of the entered depreciation factors: lamp lumen depreciation (LLD), luminaire dirt depreciation (LDD), ballast/driver factor (BF), lamp burnout (LBO), room-surface dirt (RSDD), and temperature/voltage/tilt. Maintained lumens = initial x LLF, the output the design must hit at the end of the cleaning/relamp cycle, not day one. A cleaner room and a better lamp raise the LLF, so the same footcandle target needs fewer fixtures - the payoff a lumped 0.8 guess hides. A design aid; the IES recovery-factor tables and the maintenance schedule govern.",
  };
}
const lightingLightLossFactorExample = { inputs: { LLD: 0.85, LDD: 0.90, BF: 0.95, LBO: 0, RSDD: 0, other: 0, initial_lm: 4000 } };
ELECDESIGN_RENDERERS["lighting-light-loss-factor"] = _simpleRenderer({
  citation: "Citation: light-loss factor LLF = product of the IES recovery factors (LLD, LDD, BF, LBO, RSDD, temperature/voltage/tilt); maintained lumens = initial x LLF. The IES recovery-factor tables and the maintenance schedule govern.",
  example: lightingLightLossFactorExample.inputs,
  fields: [
    { key: "LLD", label: "Lamp lumen depreciation LLD (0-1)", kind: "number" },
    { key: "LDD", label: "Luminaire dirt depreciation LDD (0-1)", kind: "number" },
    { key: "BF", label: "Ballast/driver factor BF (0-1)", kind: "number" },
    { key: "LBO", label: "Lamp burnout LBO (0-1, optional)", kind: "number" },
    { key: "RSDD", label: "Room-surface dirt RSDD (0-1, optional)", kind: "number" },
    { key: "other", label: "Other (temp/voltage/tilt) (0-1, optional)", kind: "number" },
    { key: "initial_lm", label: "Initial lumens (optional, for maintained)", kind: "number" },
  ],
  outputs: [
    { key: "llf", id: "llf-out-llf", label: "Light-loss factor (LLF)", value: (r) => fmt(r.LLF, 3) },
    { key: "m", id: "llf-out-m", label: "Maintained lumens", value: (r) => r.maintained_lm == null ? "(enter initial lumens)" : fmt(r.maintained_lm, 0) + " lm" },
    { key: "n", id: "llf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLightingLightLossFactor,
});

// dims: in { readings: dimensionless, target_avgmin: dimensionless, target_maxmin: dimensionless } out: { avg: dimensionless, min: dimensionless, max: dimensionless, avg_min: dimensionless, max_min: dimensionless, U0: dimensionless }
export function computeLightingUniformityRatio({ readings = [], target_avgmin = 0, target_maxmin = 0 } = {}) {
  let vals;
  if (Array.isArray(readings)) vals = readings.map(Number);
  else if (typeof readings === "string") vals = readings.split(/[\s,]+/).map((x) => x.trim()).filter((x) => x !== "").map(Number);
  else return { error: "Enter a grid of illuminance readings." };
  if (!vals.length) return { error: "Enter at least one illuminance reading." };
  for (const v of vals) if (!Number.isFinite(v)) return { error: "All readings must be finite numbers." };
  const min = Math.min(...vals);
  if (!(min > 0)) return { error: "The minimum reading must be positive." };
  const max = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const avg_min = avg / min;
  const max_min = max / min;
  const U0 = min / avg;
  const ta = Number(target_avgmin) || 0;
  const tm = Number(target_maxmin) || 0;
  let pass = null;
  if (ta > 0 || tm > 0) {
    pass = (ta <= 0 || avg_min <= ta) && (tm <= 0 || max_min <= tm);
  }
  return {
    avg, min, max, avg_min, max_min, U0, pass, n: vals.length,
    note: "Illuminance uniformity from a grid of readings: average-to-minimum (avg/min), maximum-to-minimum (max/min), and the minimum-to-average uniformity U0 = min/avg. Common targets run 3:1 max/min for offices and tighter for tasks. The same rough average can hide a patchy layout - a bright-under, dark-between-fixtures pattern that only the ratio reveals - which is why a uniformity check catches what an average number never does. A design aid; the IES recommended practice for the space type governs the target.",
  };
}
const lightingUniformityRatioExample = { inputs: { readings: "50, 45, 60, 55, 40", target_maxmin: 3 } };
function _v366renderLightingUniformityRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: illuminance uniformity ratios (avg/min, max/min) and U0 = min/avg from a reading grid, per IES measurement/recommended practice. Common target ~3:1 max/min for offices. The IES RP for the space type governs.";
  const readings = makeTextarea("Illuminance readings (fc or lux, comma or space separated)", "lur-readings", { rows: "3" });
  readings.input.value = "50, 45, 60, 55, 40";
  const ta = makeNumber("Target avg/min (optional)", "lur-ta", { step: "any", min: "0" });
  const tm = makeNumber("Target max/min (optional, e.g. 3)", "lur-tm", { step: "any", min: "0" });
  tm.input.value = "3";
  for (const f of [readings, ta, tm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { readings.input.value = "50, 45, 60, 55, 40"; ta.input.value = ""; tm.input.value = "3"; update(); });
  const oStats = makeOutputLine(outputRegion, "Avg / min / max", "lur-out-stats");
  const oRatios = makeOutputLine(outputRegion, "avg/min, max/min, U0", "lur-out-ratios");
  const oPass = makeOutputLine(outputRegion, "Against target", "lur-out-pass");
  const update = debounce(() => {
    const r = computeLightingUniformityRatio({ readings: readings.input.value, target_avgmin: Number(ta.input.value) || 0, target_maxmin: Number(tm.input.value) || 0 });
    if (r.error) { oStats.textContent = r.error; oRatios.textContent = "-"; oPass.textContent = "-"; return; }
    oStats.textContent = fmt(r.avg, 1) + " / " + fmt(r.min, 1) + " / " + fmt(r.max, 1) + " (" + r.n + " readings)";
    oRatios.textContent = fmt(r.avg_min, 2) + " avg/min, " + fmt(r.max_min, 2) + " max/min, U0 " + fmt(r.U0, 2);
    oPass.textContent = r.pass == null ? "(enter a target ratio)" : (r.pass ? "PASS" : "FAIL -- exceeds the target ratio");
  }, DEBOUNCE_MS);
  for (const f of [readings, ta, tm]) f.input.addEventListener("input", update);
}
ELECDESIGN_RENDERERS["lighting-uniformity-ratio"] = _v366renderLightingUniformityRatio;

// dims: in { avg_fc: dimensionless, min_fc: dimensionless, max_fc: dimensionless, mode: dimensionless } out: { max_min: dimensionless, pass: dimensionless }
export function computeEgressLightingCheck({ avg_fc = 0, min_fc = 0, max_fc = 0, mode = "normal" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const avg = Number(avg_fc) || 0;
  const min = Number(min_fc) || 0;
  const max = Number(max_fc) || 0;
  if (!(avg > 0)) return { error: "Average illuminance must be positive (fc)." };
  if (!(min > 0)) return { error: "Minimum illuminance must be positive (fc)." };
  if (!(max >= min)) return { error: "Maximum must be at least the minimum (fc)." };
  const emergency = mode === "emergency-90min-end";
  const avg_thr = emergency ? 0.6 : 1.0;
  const min_thr = emergency ? 0.06 : 0.1;
  const max_min = max / min;
  const avg_ok = avg >= avg_thr;
  const min_ok = min >= min_thr;
  const ratio_ok = max_min <= 40;
  const pass = avg_ok && min_ok && ratio_ok;
  return {
    max_min, avg_thr, min_thr, avg_ok, min_ok, ratio_ok, pass, emergency,
    note: "Egress/means-of-egress lighting check per NFPA 101 / IBC: normally the path averages at least 1.0 fc with a minimum of 0.1 fc; at the end of the 90-minute emergency (battery/generator) period the floor drops to 0.6 fc average and 0.06 fc minimum, and the maximum-to-minimum ratio must not exceed 40:1 (no over-bright spot beside a dark one). A single dark spot below the minimum fails the path even when the average holds - the reason a spot check, not just an average, is required. A design aid; the adopted NFPA 101 / IBC edition and the AHJ govern.",
  };
}
const egressLightingCheckExample = { inputs: { avg_fc: 1.2, min_fc: 0.15, max_fc: 3.0, mode: "normal" } };
ELECDESIGN_RENDERERS["egress-lighting-check"] = _simpleRenderer({
  citation: "Citation: egress lighting minimums per NFPA 101 / IBC: normal 1.0 fc avg / 0.1 fc min; emergency 90-min end 0.6 fc avg / 0.06 fc min; max/min <= 40:1. The adopted NFPA 101 / IBC edition and the AHJ govern.",
  example: egressLightingCheckExample.inputs,
  fields: [
    { key: "avg_fc", label: "Average illuminance (fc)", kind: "number" },
    { key: "min_fc", label: "Minimum illuminance (fc)", kind: "number" },
    { key: "max_fc", label: "Maximum illuminance (fc)", kind: "number" },
    { key: "mode", label: "Mode", kind: "select", options: [
      { value: "normal", label: "Normal (1.0 fc avg / 0.1 fc min)" },
      { value: "emergency-90min-end", label: "Emergency, 90-min end (0.6 / 0.06)" },
    ] },
  ],
  outputs: [
    { key: "res", id: "elc-out-res", label: "Result", value: (r) => r.pass ? "COMPLIANT" : "NON-COMPLIANT" },
    { key: "det", id: "elc-out-det", label: "Checks", value: (r) => "avg " + (r.avg_ok ? "OK" : "FAIL") + " (>=" + r.avg_thr + "), min " + (r.min_ok ? "OK" : "FAIL") + " (>=" + r.min_thr + "), max/min " + fmt(r.max_min, 0) + " (" + (r.ratio_ok ? "OK" : "FAIL") + ", <=40)" },
    { key: "n", id: "elc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEgressLightingCheck,
});

// ===================== spec-v525: neutral grounding resistor sizing (IEEE 142) =====================
// dims: in { system_voltage_ll_v: M L^2 T^-3 I^-1, target_fault_a: I, duty: dimensionless } out: { v_ln_v: M L^2 T^-3 I^-1, r_ohm: M L^2 T^-3 I^-2, p_watt: M L^2 T^-3 }
export function computeNeutralGroundingResistor({ system_voltage_ll_v = 0, target_fault_a = 0, duty = "hrg" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vll = Number(system_voltage_ll_v) || 0;
  const i = Number(target_fault_a) || 0;
  const d = String(duty) === "lrg" ? "lrg" : "hrg";
  if (!(vll > 0)) return { error: "System line-to-line voltage must be positive (V)." };
  if (!(i > 0)) return { error: "Target fault current must be positive (A)." };
  const v_ln_v = vll / Math.sqrt(3);
  const r_ohm = v_ln_v / i;
  const p_watt = i * i * r_ohm;
  if (![v_ln_v, r_ohm, p_watt].every(Number.isFinite)) return { error: "NGR-sizing math is not a finite value." };
  return {
    v_ln_v, r_ohm, p_watt, duty: d,
    note: "Neutral grounding resistor sizing (IEEE 142). The resistor sees the LINE-TO-NEUTRAL voltage, V_LN = V_LL / sqrt(3), not the line-to-line -- sizing off V_LL makes the resistor sqrt(3) too large and the fault current too small to detect. R = V_LN / I_ground, and P = I_ground^2 x R (which equals V_LN x I_ground). A high-resistance ground (HRG) limits the fault to a few amps and lets the plant run through the first fault, and its resistor is rated for CONTINUOUS dissipation; a low-resistance ground (LRG) limits it to 100 to 400 A for fast coordinated tripping, and its resistor is rated only for the SHORT trip time. For an HRG the resistor current must exceed the system's total charging current to control transient overvoltage. A design aid, not the engineer of record; IEEE 142 and the protection scheme govern.",
  };
}
export const neutralGroundingResistorExample = { inputs: { system_voltage_ll_v: 480, target_fault_a: 5, duty: "hrg" } };

ELECDESIGN_RENDERERS["neutral-grounding-resistor"] = _simpleRenderer({
  citation: "Citation: neutral grounding resistor sizing (IEEE 142 grounding practice): V_LN = V_LL / sqrt(3); R = V_LN / I_ground; P = I_ground^2 x R = V_LN x I_ground. The resistor sees line-to-neutral, not line-to-line. HRG limits to a few amps (continuous rating); LRG to 100-400 A (short-time rating). A design aid; IEEE 142 and the protection scheme govern.",
  example: neutralGroundingResistorExample.inputs,
  fields: [
    { key: "system_voltage_ll_v", label: "System line-to-line voltage (V)", kind: "number", default: 480 },
    { key: "target_fault_a", label: "Target ground-fault current (A)", kind: "number", default: 5 },
    { key: "duty", label: "Grounding duty", kind: "select", default: "hrg", options: [
      { value: "hrg", label: "High-resistance (HRG) - continuous rating" },
      { value: "lrg", label: "Low-resistance (LRG) - short-time rating" },
    ] },
  ],
  outputs: [
    { key: "vln", id: "ngr-out-vln", label: "Voltage across the resistor (line-to-neutral)", value: (r) => fmt(r.v_ln_v, 1) + " V" },
    { key: "r", id: "ngr-out-r", label: "Resistor value", value: (r) => fmt(r.r_ohm, 2) + " ohm" },
    { key: "p", id: "ngr-out-p", label: "Power dissipation", value: (r) => fmt(r.p_watt, 0) + " W (" + (r.duty === "hrg" ? "continuous" : "short-time trip rating") + ")" },
  ],
  compute: computeNeutralGroundingResistor,
});
