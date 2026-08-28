// Group N: Stage and Live Production (utilities 216-221).
// See spec-v4.md section 2.5.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt, makeRowField,
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


// --- 216: Truss Point Load and Span Capacity ---

export const TRUSS_CAPACITY_CURVES = {
  "12in_box": {
    label: "12-inch box truss",
    attribution: "Tomcat 12-inch box truss published technical data sheet (typical)",
    points: [
      { span_ft: 10, udl_lb_per_ft: 320 },
      { span_ft: 20, udl_lb_per_ft: 220 },
      { span_ft: 30, udl_lb_per_ft: 130 },
      { span_ft: 40, udl_lb_per_ft: 80 },
      { span_ft: 50, udl_lb_per_ft: 50 },
    ],
  },
  "16in_box": {
    label: "16-inch box truss",
    attribution: "Tomcat 16-inch box truss published technical data sheet (typical)",
    points: [
      { span_ft: 10, udl_lb_per_ft: 540 },
      { span_ft: 20, udl_lb_per_ft: 380 },
      { span_ft: 30, udl_lb_per_ft: 240 },
      { span_ft: 40, udl_lb_per_ft: 150 },
      { span_ft: 50, udl_lb_per_ft: 95 },
      { span_ft: 60, udl_lb_per_ft: 60 },
    ],
  },
  "20p5in_ladder": {
    label: "20.5-inch ladder truss",
    attribution: "Generic ladder truss reference (typical published)",
    points: [
      { span_ft: 10, udl_lb_per_ft: 240 },
      { span_ft: 20, udl_lb_per_ft: 160 },
      { span_ft: 30, udl_lb_per_ft: 95 },
      { span_ft: 40, udl_lb_per_ft: 55 },
    ],
  },
};

function interpUDL(curve, span_ft) {
  const pts = curve.points;
  if (span_ft <= pts[0].span_ft) return pts[0].udl_lb_per_ft;
  if (span_ft >= pts[pts.length - 1].span_ft) return pts[pts.length - 1].udl_lb_per_ft;
  for (let i = 0; i < pts.length - 1; i++) {
    if (span_ft >= pts[i].span_ft && span_ft <= pts[i + 1].span_ft) {
      const t = (span_ft - pts[i].span_ft) / (pts[i + 1].span_ft - pts[i].span_ft);
      return pts[i].udl_lb_per_ft + t * (pts[i + 1].udl_lb_per_ft - pts[i].udl_lb_per_ft);
    }
  }
  return pts[pts.length - 1].udl_lb_per_ft;
}

// dims: in { truss_model: dimensionless, span_ft: L, point_loads: dimensionless }
//        out: { udl_max_lb_per_ft: M T^-2, total_uniform_capacity_lb: M L T^-2, total_point_load_lb: M L T^-2, equivalent_udl_lb_per_ft: M T^-2, reaction_a_lb: M L T^-2, reaction_b_lb: M L T^-2, safety_factor: dimensionless, pass: dimensionless, attribution: dimensionless }
// (Loads in pounds-force surface as `M L T^-2`; uniformly distributed
// loads in lb/ft are `M T^-2`; the point_loads array and truss_model
// categorical are conservatively dimensionless per spec-v14 §7.1.)
export function computeTrussCapacity({ truss_model = "16in_box", span_ft = 0, point_loads = [] }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const curve = TRUSS_CAPACITY_CURVES[truss_model];
  if (!curve) return { error: "Unknown truss model." };
  if (!(span_ft > 0)) return { error: "Span must be positive." };
  const udl_max = interpUDL(curve, span_ft);
  const total_uniform_capacity = udl_max * span_ft;
  // Convert each point load to its UDL-equivalent: a center point load on a
  // simple span uses 50% of the UDL capacity (engineering rule of thumb).
  let total_point_load = 0;
  let max_reaction_a = 0;
  let max_reaction_b = 0;
  for (const p of point_loads) {
    const w = Number(p.weight_lb) || 0;
    const x = Number(p.position_ft) || 0;
    if (w < 0) return { error: "Point load must be non-negative." };
    if (x < 0 || x > span_ft) return { error: "Point load position out of span." };
    total_point_load += w;
    // Simple-beam reaction split.
    const Rb = (w * x) / span_ft;
    const Ra = w - Rb;
    max_reaction_a += Ra;
    max_reaction_b += Rb;
  }
  // Effective utilization vs UDL capacity using the 2x equivalence rule for
  // a single concentrated load: equivalent UDL = 2 * point / span; sum across loads.
  const equivalent_udl = total_point_load > 0 ? (2 * total_point_load) / span_ft : 0;
  const safety_factor = udl_max > 0 ? udl_max / Math.max(equivalent_udl, 0.01) : Infinity;
  const pass = equivalent_udl <= udl_max;
  return {
    udl_max_lb_per_ft: udl_max,
    total_uniform_capacity_lb: total_uniform_capacity,
    total_point_load_lb: total_point_load,
    equivalent_udl_lb_per_ft: equivalent_udl,
    reaction_a_lb: max_reaction_a,
    reaction_b_lb: max_reaction_b,
    safety_factor,
    pass,
    attribution: curve.attribution,
  };
}

export const trussExample = {
  inputs: { truss_model: "16in_box", span_ft: 40, point_loads: [{ weight_lb: 200, position_ft: 10 }, { weight_lb: 400, position_ft: 20 }, { weight_lb: 200, position_ft: 30 }] },
};

// --- 217: Audio Speaker Time Alignment ---
//
// Speed of sound c (m/s) = 331.3 + 0.606 * T_C
// delay_ms = (d_main - d_delay) / c * 1000
// Convert ft <-> m as needed.

// dims: in { d_main_ft: L, d_delay_ft: L, ambient_C: T, ambient_F: T, haas_offset_ms: T }
//        out: { c_m_s: L T^-1, ms_difference: T, recommended_delay_ms: T }
// (Temperature and time both surface as `T` per the spec-v14 §7.1
// base-token shortcut; speed of sound is length / time.)
export function computeTimeAlignment({ d_main_ft = 0, d_delay_ft = 0, ambient_C = 20, ambient_F = null, haas_offset_ms = 15 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  haas_offset_ms = Number(haas_offset_ms);
  if (!(d_main_ft >= 0)) return { error: "Main distance must be non-negative." };
  if (!(d_delay_ft >= 0)) return { error: "Delay distance must be non-negative." };
  const d_main_m = d_main_ft * 0.3048;
  const d_delay_m = d_delay_ft * 0.3048;
  // spec-v593 US entry path: the page asks deg F, the published speed-of-sound
  // form is in deg C. The US key wins when present, so the page's own numbers
  // run through the agent door unchanged.
  const t_c = (ambient_F !== null && ambient_F !== undefined) ? (Number(ambient_F) - 32) * 5 / 9 : Number(ambient_C);
  const c_m_s = 331.3 + 0.606 * t_c;
  const ms_difference = ((d_main_m - d_delay_m) / c_m_s) * 1000;
  const recommended_delay_ms = ms_difference + haas_offset_ms;
  return { c_m_s, ms_difference, recommended_delay_ms };
}

export const timeAlignmentExample = { inputs: { d_main_ft: 80, d_delay_ft: 30, ambient_C: 22, haas_offset_ms: 15 } };

// --- 218: DMX-512 Address and Universe Planner ---

// dims: in { fixtures: dimensionless }
//        out: { ranges: dimensionless, conflicts: dimensionless, utilization: dimensionless, split_recommended: dimensionless, max_universe: dimensionless }
// (DMX channel addressing is integer-indexed and categorical; the
// caller-typed fixtures array is conservatively dimensionless per
// spec-v14 §7.1.)
export function computeDMX({ fixtures = [] }) {
  if (!Array.isArray(fixtures) || fixtures.length === 0) return { error: "Provide at least one fixture." };
  const ranges = [];
  let max_universe = 1;
  for (const f of fixtures) {
    const start = Number(f.start);
    const ch = Number(f.channels) || 0;
    if (!Number.isFinite(start) || start < 1 || start > 512) return { error: "Start address must be 1-512." };
    if (ch < 1) return { error: "Channel count must be at least 1." };
    const universe = Number(f.universe) || 1;
    if (universe < 1) return { error: "Universe must be at least 1." };
    max_universe = Math.max(max_universe, universe);
    const end = start + ch - 1;
    const overflow = end > 512;
    ranges.push({
      name: f.name || ("fixture-" + ranges.length),
      universe,
      start,
      end: overflow ? 512 : end,
      raw_end: end,
      overflow,
    });
  }
  // Conflict detection: for each universe, sort and check adjacent.
  const conflicts = [];
  const byUniverse = {};
  for (const r of ranges) {
    if (!byUniverse[r.universe]) byUniverse[r.universe] = [];
    byUniverse[r.universe].push(r);
  }
  const utilization = {};
  for (const u of Object.keys(byUniverse)) {
    const list = byUniverse[u].slice().sort((a, b) => a.start - b.start);
    let used = 0;
    for (const r of list) used += (Math.min(r.raw_end, 512) - r.start + 1);
    utilization[u] = (used / 512) * 100;
    for (let i = 1; i < list.length; i++) {
      if (list[i].start <= list[i - 1].end) conflicts.push("Conflict in universe " + u + ": " + list[i - 1].name + " ends at " + list[i - 1].end + ", " + list[i].name + " starts at " + list[i].start);
    }
  }
  // Recommendation: split next available channels into a new universe when overflow.
  const split_recommended = ranges.some((r) => r.overflow);
  return { ranges, conflicts, utilization, split_recommended, max_universe };
}

export const dmxExample = {
  inputs: {
    fixtures: [
      { name: "front wash", start: 1, channels: 12, universe: 1 },
      { name: "rear wash",  start: 13, channels: 12, universe: 1 },
      { name: "movers",     start: 50, channels: 16, universe: 1 },
      { name: "haze",       start: 200, channels: 4, universe: 1 },
    ],
  },
};

// --- 219: Three-Phase Neutral Imbalance ---
//
// Balanced-load neutral form:
//   I_N = sqrt(I_A^2 + I_B^2 + I_C^2 - I_A*I_B - I_B*I_C - I_A*I_C)

// dims: in { I_A: I, I_B: I, I_C: I, harmonic_loads: dimensionless }
//        out: { neutral_A: I, imbalance_percent: dimensionless, harmonic_warning: dimensionless }
// (Phase currents carry the SI base electric-current dimension `I`;
// the harmonic-loads flag is a boolean categorical, dimensionless.)
export function computeNeutralImbalance({ I_A = 0, I_B = 0, I_C = 0, harmonic_loads = false }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (I_A < 0 || I_B < 0 || I_C < 0) return { error: "Currents must be non-negative." };
  const I_N = Math.sqrt(Math.max(0, I_A * I_A + I_B * I_B + I_C * I_C - I_A * I_B - I_B * I_C - I_A * I_C));
  const max = Math.max(I_A, I_B, I_C);
  const min = Math.min(I_A, I_B, I_C);
  const avg = (I_A + I_B + I_C) / 3;
  const imbalance_percent = avg > 0 ? ((max - min) / avg) * 100 : 0;
  const harmonic_warning = harmonic_loads
    ? "Harmonic-rich loads (LED dimmers, switching supplies) make the simple form underestimate neutral current. A derated neutral conductor can overheat."
    : null;
  return { neutral_A: I_N, imbalance_percent, harmonic_warning };
}

// A BALANCED 100/100/100 A load answers 0.00 A neutral and 0.0% imbalance --
// a correct result, and a useless worked example for a tile about imbalance.
// 100/85/70 A gives 25.98 A on the neutral and 35.3% imbalance. The balanced
// case is kept as the second worked-example row, where it still asserts that
// the symmetric-components root collapses to zero.
export const neutralImbalanceExample = { inputs: { I_A: 100, I_B: 85, I_C: 70, harmonic_loads: false } };

// --- 220: SPL and Inverse Square Law ---

export const SPL_MODES = {
  free_field:        { factor: 0,    label: "Free field (full sphere)" },
  hemispherical:     { factor: 3,    label: "Hemispherical (half-space)" },
  indoors:           { factor: 6,    label: "Indoors (rough 1/4-space approx)" },
};

// dims: in { L1_dB: dimensionless, d1: L, d2: L, mode: dimensionless }
//        out: { L2_dB: dimensionless, L2_freefield_dB: dimensionless, mode_factor_dB: dimensionless }
// (Decibels are a logarithmic ratio and therefore dimensionless; mode
// is a categorical string. Only the d1 / d2 distances carry length.)
export function computeSPL({ L1_dB = 0, d1 = 1, d2 = 0, mode = "free_field", n_sources = 1 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const m = SPL_MODES[mode];
  if (!m) return { error: "Unknown mode." };
  if (!(d1 > 0)) return { error: "Reference distance must be positive." };
  if (!(d2 > 0)) return { error: "Target distance must be positive." };
  if (!(n_sources >= 1)) return { error: "Number of sources must be at least 1." };
  const L2_freefield = L1_dB - 20 * Math.log10(d2 / d1);
  const L2 = L2_freefield + m.factor;
  // v24 EN.2: incoherent summation of N identical sources (+3 dB per doubling).
  // N=1 reproduces the prior output exactly (backward-compatible default).
  const L2_combined = L2 + 10 * Math.log10(n_sources);
  return { L2_dB: L2, L2_freefield_dB: L2_freefield, mode_factor_dB: m.factor, n_sources, L2_combined_dB: L2_combined };
}

export const splExample = { inputs: { L1_dB: 110, d1: 1, d2: 30, mode: "free_field" } };

// --- 221: Rigging Capacity Quick Check ---
//
// WLL at angle: per-leg tension = load / (n * cos(theta/2)) for the included
// (apex) angle -- W/n with legs vertical, diverging as they open to horizontal.
// Choker reduction factor 0.75 (matches v3 utility 161).

export const RIGGING_HARDWARE = {
  shackle_3_4_5T:    { wll_lb: 10000, label: "3/4 in screw-pin shackle (5T)" },
  sling_5_8_steel:   { wll_lb: 6700,  label: "5/8 in 6x19 IWRC steel sling (vertical)" },
  span_set_2T:       { wll_lb: 4400,  label: "2T span set (vertical)" },
  hoist_chain_1T:    { wll_lb: 2200,  label: "1T chain hoist (vertical)" },
  hoist_chain_2T:    { wll_lb: 4400,  label: "2T chain hoist (vertical)" },
};

// dims: in { hardware: dimensionless, configuration: dimensionless, load_lb: M L T^-2, included_angle_deg: dimensionless, n_legs: dimensionless }
//        out: { hardware_label: dimensionless, base_wll_lb: M L T^-2, effective_wll_lb: M L T^-2, tension_per_leg_lb: M L T^-2, safety_factor: dimensionless, pass: dimensionless, derate_factor: dimensionless }
// (Loads in pounds-force surface as `M L T^-2`; angles in degrees
// and per-leg leg counts are dimensionless; hardware and configuration
// are categorical strings per the spec-v14 §7.1 convention.)
export function computeRiggingCheck({ hardware = "sling_5_8_steel", configuration = "vertical", load_lb = 0, included_angle_deg = 60, n_legs = 2 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = RIGGING_HARDWARE[hardware];
  if (!h) return { error: "Unknown hardware." };
  if (!(load_lb >= 0)) return { error: "Load must be non-negative." };
  if (!(n_legs >= 1)) return { error: "At least one leg." };
  let derate_factor = 1;
  let tension_per_leg;
  if (configuration === "vertical") tension_per_leg = load_lb / n_legs;
  else if (configuration === "basket" || configuration === "bridle") {
    if (!(included_angle_deg > 0 && included_angle_deg < 180)) return { error: "Included angle must be 0-180 deg." };
    tension_per_leg = load_lb / (n_legs * Math.cos((included_angle_deg / 2) * Math.PI / 180));
  } else if (configuration === "choker") {
    if (!(included_angle_deg > 0 && included_angle_deg < 180)) return { error: "Included angle must be 0-180 deg." };
    derate_factor = 0.75;
    tension_per_leg = load_lb / (n_legs * Math.cos((included_angle_deg / 2) * Math.PI / 180) * derate_factor);
  } else {
    return { error: "Unknown configuration." };
  }
  const effective_wll = h.wll_lb * derate_factor;
  const safety_factor = tension_per_leg > 0 ? effective_wll / tension_per_leg : null;
  const pass = tension_per_leg <= effective_wll;
  return {
    hardware_label: h.label,
    base_wll_lb: h.wll_lb,
    effective_wll_lb: effective_wll,
    tension_per_leg_lb: tension_per_leg,
    safety_factor,
    pass,
    derate_factor,
  };
}

export const riggingExample = { inputs: { hardware: "sling_5_8_steel", configuration: "basket", load_lb: 5000, included_angle_deg: 60, n_legs: 2 } };

// --- Renderers ---

function _r(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else if (f.kind === "checkbox") field = makeCheckbox(f.label, f.id || f.key);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else if (f.kind === "checkbox") field.input.checked = !!f.default;
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
        else if (f.kind === "checkbox") fields[f.key].input.checked = !!v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else if (f.kind === "checkbox") params[f.key] = fields[f.key].input.checked;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "checkbox" ? "change" : "input", update);
    }
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

function renderTrussCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Verify with the truss manufacturer's published load chart and a qualified rigger. Touring and entertainment rigging is governed by ANSI E1.21 and the venue's competent person.";
  attachExampleButton(inputRegion, () => fillExample(trussExample.inputs));
  const model = makeSelect("Truss model", "tr-m", Object.keys(TRUSS_CAPACITY_CURVES).map((k) => ({ value: k, label: TRUSS_CAPACITY_CURVES[k].label })));
  const span = makeNumber("Span (ft)", "tr-s", { step: "any", min: "0" });
  for (const f of [model, span]) inputRegion.appendChild(f.wrap);
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const wF = makeRowField("Point " + (i + 1) + " weight (lb)", "tr-p" + i + "-w", { step: "any" });
    const pF = makeRowField("Point " + (i + 1) + " position (ft)", "tr-p" + i + "-x", { step: "any" });
    const w = wF.input, p = pF.input;
    wrap.appendChild(wF.wrap); wrap.appendChild(pF.wrap); list.appendChild(wrap);
    w.addEventListener("input", update); p.addEventListener("input", update);
    rows.push({ w, p });
  }
  const oU = makeOutputLine(outputRegion, "UDL capacity at this span", "tr-out-u");
  const oR = makeOutputLine(outputRegion, "Reactions A / B", "tr-out-r");
  const oE = makeOutputLine(outputRegion, "Equivalent UDL (loaded)", "tr-out-e");
  const oS = makeOutputLine(outputRegion, "Safety factor", "tr-out-s");
  const oP = makeOutputLine(outputRegion, "Pass / fail", "tr-out-p");
  const oA = makeOutputLine(outputRegion, "Source", "tr-out-a");
  function fillExample(v) {
    model.select.value = v.truss_model; span.input.value = v.span_ft;
    for (let i = 0; i < rows.length; i++) {
      if (v.point_loads[i]) { rows[i].w.value = v.point_loads[i].weight_lb; rows[i].p.value = v.point_loads[i].position_ft; }
    }
    update();
  }
  function update() {
    const point_loads = rows.map((r) => ({ weight_lb: Number(r.w.value) || 0, position_ft: Number(r.p.value) || 0 })).filter((p) => p.weight_lb > 0);
    const r = computeTrussCapacity({ truss_model: model.select.value, span_ft: Number(span.input.value) || 0, point_loads });
    if (r.error) { oU.textContent = r.error; for (const o of [oR, oE, oS, oP, oA]) o.textContent = "-"; return; }
    oU.textContent = fmt(r.udl_max_lb_per_ft, 0) + " lb/ft (" + fmt(r.total_uniform_capacity_lb, 0) + " lb total)";
    oR.textContent = fmt(r.reaction_a_lb, 0) + " / " + fmt(r.reaction_b_lb, 0) + " lb";
    oE.textContent = fmt(r.equivalent_udl_lb_per_ft, 1) + " lb/ft";
    oS.textContent = Number.isFinite(r.safety_factor) ? fmt(r.safety_factor, 2) + ":1" : "(no point loads)";
    oP.textContent = r.pass ? "PASS" : "FAIL";
    oA.textContent = r.attribution;
  }
}

const renderTimeAlignment = _r({
  citation: "Citation: Public speed-of-sound formula c (m/s) = 331.3 + 0.606 * T_C. Haas-window 10-30 ms keeps image at the stage.",
  // v593: US-facing deg F field; the compute accepts deg F as well as deg C for
  // the published speed-of-sound form (71.6 F = 22 C, matching the metric fixture).
  example: { ...timeAlignmentExample.inputs, ambient_F: 71.6 },
  fields: [
    { key: "d_main_ft", label: "Distance from mains (ft)", kind: "number" },
    { key: "d_delay_ft", label: "Distance from delay (ft)", kind: "number" },
    { key: "ambient_F", label: "Ambient temp (°F)", kind: "number", default: 68 },
    { key: "haas_offset_ms", label: "Haas offset (ms)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "c", id: "ta-out-c", label: "Speed of sound", value: (r) => fmt(r.c_m_s / 304.8, 2) + " ft/ms (" + fmt(r.c_m_s, 1) + " m/s)" },
    { key: "d", id: "ta-out-d", label: "Time difference", value: (r) => fmt(r.ms_difference, 2) + " ms" },
    { key: "r", id: "ta-out-r", label: "Recommended delay", value: (r) => fmt(r.recommended_delay_ms, 1) + " ms" },
  ],
  compute: computeTimeAlignment,
});

function renderDMX(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USITT DMX-512A by name only. Each universe carries 512 channels.";
  attachExampleButton(inputRegion, () => fillExample(dmxExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 8; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const fx = "Fixture " + (i + 1) + " ";
    const nF = makeRowField(fx + "name", "dmx-f" + i + "-n", { type: "text", inputmode: "text" });
    const uF = makeRowField(fx + "universe", "dmx-f" + i + "-u", { step: "1", min: "1", inputmode: "numeric" });
    const sF = makeRowField(fx + "start address", "dmx-f" + i + "-s", { step: "1", min: "1", max: "512", inputmode: "numeric" });
    const cF = makeRowField(fx + "channel count", "dmx-f" + i + "-c", { step: "1", min: "1", inputmode: "numeric" });
    const n = nF.input, u = uF.input, s = sF.input, c = cF.input;
    u.value = "1";
    for (const f of [nF, uF, sF, cF]) wrap.appendChild(f.wrap);
    list.appendChild(wrap);
    [n, u, s, c].forEach((el) => el.addEventListener("input", update));
    rows.push({ n, u, s, c });
  }
  const oR = makeOutputLine(outputRegion, "Per-fixture ranges", "dmx-out-r");
  const oU = makeOutputLine(outputRegion, "Universe utilization", "dmx-out-u");
  const oC = makeOutputLine(outputRegion, "Conflicts", "dmx-out-c");
  const oS = makeOutputLine(outputRegion, "Recommendation", "dmx-out-s");
  function fillExample(v) {
    for (let i = 0; i < rows.length; i++) {
      const f = v.fixtures[i];
      if (f) { rows[i].n.value = f.name; rows[i].u.value = f.universe; rows[i].s.value = f.start; rows[i].c.value = f.channels; }
    }
    update();
  }
  function update() {
    const fixtures = rows.map((r) => ({ name: r.n.value, universe: Number(r.u.value) || 1, start: Number(r.s.value) || 0, channels: Number(r.c.value) || 0 })).filter((f) => f.start > 0 && f.channels > 0);
    if (fixtures.length === 0) { for (const o of [oR, oU, oC, oS]) o.textContent = "-"; return; }
    const r = computeDMX({ fixtures });
    if (r.error) { oR.textContent = r.error; for (const o of [oU, oC, oS]) o.textContent = "-"; return; }
    oR.textContent = r.ranges.map((x) => x.name + ": U" + x.universe + " " + x.start + "-" + x.raw_end + (x.overflow ? " OVERFLOW" : "")).join("; ");
    oU.textContent = Object.entries(r.utilization).map(([u, p]) => "U" + u + ": " + fmt(p, 1) + "%").join(", ");
    oC.textContent = r.conflicts.length === 0 ? "none" : r.conflicts.join("; ");
    oS.textContent = r.split_recommended ? "Split overflow into a new universe." : "ok";
  }
}

const renderNeutralImbalance = _r({
  citation: "Citation: Public balanced-load form I_N = sqrt(I_A^2 + I_B^2 + I_C^2 - I_A*I_B - I_B*I_C - I_A*I_C). Companion to Group A and v3 utility 128.",
  example: neutralImbalanceExample.inputs,
  fields: [
    { key: "I_A", label: "Phase A current (A)", kind: "number" },
    { key: "I_B", label: "Phase B current (A)", kind: "number" },
    { key: "I_C", label: "Phase C current (A)", kind: "number" },
    { key: "harmonic_loads", label: "Harmonic-rich loads (LED dimmers, switching supplies)", kind: "checkbox" },
  ],
  outputs: [
    { key: "n", id: "ni-out-n", label: "Neutral current",   value: (r) => fmt(r.neutral_A, 2) + " A" },
    { key: "i", id: "ni-out-i", label: "Imbalance %",       value: (r) => fmt(r.imbalance_percent, 2) + " %" },
    { key: "w", id: "ni-out-w", label: "Harmonic warning",  value: (r) => r.harmonic_warning || "n/a" },
  ],
  compute: computeNeutralImbalance,
});

const renderSPL = _r({
  citation: "Citation: Inverse-square law L2 = L1 - 20*log10(d2/d1). Mode factor approximates surface reinforcement.",
  example: splExample.inputs,
  fields: [
    { key: "L1_dB", label: "SPL at reference (dB)", kind: "number" },
    // v593: labeled ft; the compute uses only the d2/d1 ratio, so no conversion.
    { key: "d1", label: "Reference distance (ft)", kind: "number" },
    { key: "d2", label: "Target distance (ft)", kind: "number" },
    { key: "mode", label: "Mode", kind: "select", options: Object.keys(SPL_MODES).map((k) => ({ value: k, label: SPL_MODES[k].label })) },
    { key: "n_sources", label: "Identical sources", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "f", id: "sp-out-f", label: "Free-field SPL", value: (r) => fmt(r.L2_freefield_dB, 1) + " dB" },
    { key: "l", id: "sp-out-l", label: "SPL with mode",  value: (r) => fmt(r.L2_dB, 1) + " dB (+" + r.mode_factor_dB + ")" },
    { key: "c", id: "sp-out-c", label: "Combined SPL (N sources)", value: (r) => fmt(r.L2_combined_dB, 1) + " dB (+" + fmt(10 * Math.log10(r.n_sources), 2) + " for " + r.n_sources + ")" },
  ],
  compute: computeSPL,
});

const renderRiggingCheck = _r({
  citation: "Notice: A qualified and competent rigger governs. Math aid only. Citation: ASME B30 series by section number only.",
  example: riggingExample.inputs,
  fields: [
    { key: "hardware", label: "Hardware", kind: "select", options: Object.keys(RIGGING_HARDWARE).map((k) => ({ value: k, label: RIGGING_HARDWARE[k].label })) },
    { key: "configuration", label: "Configuration", kind: "select", options: [{ value: "vertical", label: "Vertical" }, { value: "basket", label: "Basket" }, { value: "bridle", label: "Bridle" }, { value: "choker", label: "Choker" }] },
    { key: "load_lb", label: "Load (lb)", kind: "number" },
    { key: "included_angle_deg", label: "Included angle (deg)", kind: "number" },
    { key: "n_legs", label: "Legs", kind: "number" },
  ],
  outputs: [
    { key: "h", id: "rg-out-h", label: "Hardware",          value: (r) => r.hardware_label },
    { key: "w", id: "rg-out-w", label: "Effective WLL",     value: (r) => fmt(r.effective_wll_lb, 0) + " lb (derate " + r.derate_factor + ")" },
    { key: "t", id: "rg-out-t", label: "Tension per leg",   value: (r) => fmt(r.tension_per_leg_lb, 0) + " lb" },
    { key: "s", id: "rg-out-s", label: "Safety factor",     value: (r) => Number.isFinite(r.safety_factor) ? fmt(r.safety_factor, 2) + ":1" : "infinity" },
    { key: "p", id: "rg-out-p", label: "Pass / fail",       value: (r) => r.pass ? "PASS" : "FAIL" },
  ],
  compute: computeRiggingCheck,
});

export const STAGE_RENDERERS = {
  "truss-capacity":   renderTrussCapacity,
  "time-alignment":   renderTimeAlignment,
  "dmx-planner":      renderDMX,
  "neutral-imbalance": renderNeutralImbalance,
  "spl-distance":     renderSPL,
  "rigging-check":    renderRiggingCheck,
};

// v9 §H.2 sound pressure level at distance with atmospheric absorption.
// Implements ANSI S1.26-2014 (R2019) per-octave-band absorption alpha
// (dB/m) and applies it to the inverse-square far-field SPL. Companion
// to the v1 spl-distance tile (which is inverse-square only).
//
// Reference octave bands the tile reports. ANSI S1.26 is parametric on
// frequency; these are the seven standard bands.
export const SPL_OCTAVE_BANDS_HZ = [125, 250, 500, 1000, 2000, 4000, 8000];

// Saturation vapor pressure (kPa) at temperature T (Kelvin) via the
// IAPWS-IF97-style approximation used in ANSI S1.26. T_01 = 273.16 K.
function _v9_satWaterKPa(T_K) {
  const T_01 = 273.16;
  const C = -6.8346 * Math.pow(T_01 / T_K, 1.261) + 4.6151;
  return 101.325 * Math.pow(10, C);
}

// ANSI S1.26-2014 absorption coefficient alpha (dB/m) at frequency f
// (Hz), temperature T (Kelvin), relative humidity h_r (fraction 0..1),
// and ambient pressure p_a (kPa).
// dims: in { f_Hz: T^-1, T_K: T, h_r: dimensionless, p_a_kPa: M L^-1 T^-2 } out: alpha_dB_per_m: L^-1
// (Frequency in Hz is `T^-1`; absolute temperature in K surfaces as
// `T` per the spec-v14 §7.1 shortcut; ambient pressure in kPa is
// pressure `M L^-1 T^-2`; absorption coefficient in dB/m is
// dimensionless dB scaled by inverse length, so `L^-1`.)
export function _v9_atmosphericAbsorption({ f_Hz, T_K, h_r, p_a_kPa }) {
  const T_0 = 293.15;
  const p_r = 101.325;
  const p_sat = _v9_satWaterKPa(T_K);
  // h is the molar concentration of water vapor (percent). AF-01 (v21): the
  // canonical ANSI S1.26 / ISO 9613-1 form is h = h_r · (p_sat/p_a) · 100.
  // A prior extra (p_r/p_a) factor over-weighted humidity at non-sea-level
  // ambient pressure (it is unity at p_a = p_r, so sea-level output is
  // unchanged). h_r is a fraction here, so ·100 yields percent.
  const h = h_r * (p_sat / p_a_kPa) * 100;
  // ANSI S1.26 relaxation frequencies for O2 and N2.
  const frO = (p_a_kPa / p_r) * (24 + 4.04e4 * h * ((0.02 + h) / (0.391 + h)));
  const frN = (p_a_kPa / p_r) * Math.pow(T_K / T_0, -0.5)
    * (9 + 280 * h * Math.exp(-4.170 * (Math.pow(T_K / T_0, -1 / 3) - 1)));
  const f2 = f_Hz * f_Hz;
  const term_class = 1.84e-11 * (p_r / p_a_kPa) * Math.sqrt(T_K / T_0);
  const term_O = 0.01275 * Math.exp(-2239.1 / T_K) / (frO + f2 / frO);
  const term_N = 0.1068 * Math.exp(-3352.0 / T_K) / (frN + f2 / frN);
  const alpha_Nepers_per_m = f2 * (term_class + Math.pow(T_K / T_0, -2.5) * (term_O + term_N));
  // Convert Nepers/m to dB/m via 8.686.
  return 8.686 * alpha_Nepers_per_m;
}

// dims: in { source_SPL_dB: dimensionless, d_ref_m: L, d_far_m: L, temperature_C: T, RH_percent: dimensionless, pressure_kPa: M L^-1 T^-2 }
//        out: { inverse_square_dB: dimensionless, SPL_far_1kHz_dB: dimensionless, alpha_1kHz_dB_per_m: L^-1, absorption_1kHz_dB: dimensionless, bands: dimensionless, warnings: dimensionless }
// (Decibels are a dimensionless logarithmic ratio; temperature and
// time both surface as `T`; relative humidity is a percentage and
// therefore dimensionless; bands and warnings arrays are caller-typed
// and conservatively dimensionless per spec-v14 §7.1.)
export function computeSPLAtmospheric({
  source_SPL_dB = 0,
  d_ref_m = 1,
  d_far_m = 0,
  temperature_C = 20,
  RH_percent = 50,
  pressure_kPa = 101.325,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L1 = Number(source_SPL_dB) || 0;
  const d1 = (d_ref_m === undefined || d_ref_m === null || d_ref_m === "") ? 1 : Number(d_ref_m);
  const d2 = Number(d_far_m) || 0;
  const T_C = Number(temperature_C);
  const RH = Number(RH_percent);
  const P = Number(pressure_kPa) || 101.325;
  if (!(d1 > 0)) return { error: "Reference distance must be positive." };
  if (!(d2 > 0)) return { error: "Target distance must be positive." };
  if (d2 < d1) return { error: "Target distance must not be below the reference distance (the source SPL is defined at the reference distance)." };
  if (!Number.isFinite(T_C)) return { error: "Temperature must be numeric." };
  if (!Number.isFinite(RH) || RH < 0 || RH > 100) return { error: "Relative humidity must be 0 - 100 percent." };
  if (!(P > 0)) return { error: "Pressure must be positive." };
  const T_K = T_C + 273.15;
  const h_r = RH / 100;

  const warnings = [];
  if (T_C < -20 || T_C > 50) warnings.push("Temperature outside the ANSI S1.26 typical-validity range (-4 to 122 F, i.e. -20 to 50 C); coefficients become less accurate at the extremes.");

  const inverse_square_dB = 20 * Math.log10(d2 / d1);
  const bands = SPL_OCTAVE_BANDS_HZ.map((f) => {
    const alpha_dB_m = _v9_atmosphericAbsorption({ f_Hz: f, T_K, h_r, p_a_kPa: P });
    const absorption_dB = alpha_dB_m * d2;
    const SPL_far_dB = L1 - inverse_square_dB - absorption_dB;
    return { f_Hz: f, alpha_dB_per_m: alpha_dB_m, absorption_dB, SPL_far_dB };
  });

  // Summary at 1 kHz (operator-grade "voice band" reference).
  const summary = bands.find((b) => b.f_Hz === 1000);

  return {
    inverse_square_dB,
    SPL_far_1kHz_dB: summary.SPL_far_dB,
    alpha_1kHz_dB_per_m: summary.alpha_dB_per_m,
    absorption_1kHz_dB: summary.absorption_dB,
    bands,
    warnings,
  };
}

export const splAtmosphericExample = {
  // Spec-v9 §H.2 worked example: 95 dB SPL at 1 m, 20 C, 50% RH,
  // 101.325 kPa; report at 30 m and 100 m.
  inputs: { source_SPL_dB: 95, d_ref_m: 1, d_far_m: 30, temperature_C: 20, RH_percent: 50, pressure_kPa: 101.325 },
};

function renderSPLAtmospheric(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Inverse-square law for far-field distance attenuation. Atmospheric absorption per ANSI S1.26-2014 (R2019) - per-octave-band alpha (dB/m) at the operator-supplied temperature / RH / pressure, applied multiplicatively over distance. For closed venues, room acoustics dominate over inverse-square. AHJ governs final coverage. Free at ansi.org for TOC.";

  // v593: US-facing ft / deg F / in Hg fields, converted at this boundary into
  // the metric-native ANSI S1.26 compute (3.28 ft ~ 1 m; 68 F = 20 C;
  // 29.92 in Hg = 101.32 kPa).
  const spl = makeNumber("Source SPL at reference distance (dB)", "spa-spl", { step: "any" });
  const dref = makeNumber("Reference distance (ft; typically 3.28)", "spa-dref", { step: "any", min: "0", value: "3.28" });
  dref.input.value = "3.28";
  const dfar = makeNumber("Target distance (ft)", "spa-dfar", { step: "any", min: "0" });
  const tF = makeNumber("Air temperature (°F)", "spa-t", { step: "any", value: "68" });
  tF.input.value = "68";
  const rh = makeNumber("Relative humidity (percent)", "spa-rh", { step: "any", min: "0", max: "100", value: "50" });
  rh.input.value = "50";
  const p = makeNumber("Ambient pressure (in Hg; default 29.92)", "spa-p", { step: "any", min: "0", value: "29.92" });
  p.input.value = "29.92";
  for (const f of [spl, dref, dfar, tF, rh, p]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    spl.input.value = "95"; dref.input.value = "3.28"; dfar.input.value = "98.4";
    tF.input.value = "68"; rh.input.value = "50"; p.input.value = "29.92"; update();
  });

  const oISL = makeOutputLine(outputRegion, "Inverse-square attenuation (dB)", "spa-out-isl");
  const oSPL = makeOutputLine(outputRegion, "Far-field SPL at 1 kHz (dB)", "spa-out-spl");
  const oA = makeOutputLine(outputRegion, "Absorption at 1 kHz (dB total / alpha)", "spa-out-a");
  const oBands = makeOutputLine(outputRegion, "Per-octave SPL (dB)", "spa-out-bands");
  const oW = makeOutputLine(outputRegion, "Notes", "spa-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const dRefFt = readNum(dref.input);
    const dFarFt = readNum(dfar.input);
    const tempF = readNum(tF.input);
    const inHg = readNum(p.input);
    const r = computeSPLAtmospheric({
      source_SPL_dB: readNum(spl.input),
      d_ref_m: dRefFt === null ? null : dRefFt * 0.3048,
      d_far_m: dFarFt === null ? null : dFarFt * 0.3048,
      temperature_C: tempF === null ? null : (tempF - 32) * 5 / 9,
      RH_percent: readNum(rh.input),
      pressure_kPa: inHg === null ? null : inHg * 3.38638866667,
    });
    if (r.error) {
      oISL.textContent = r.error; oSPL.textContent = ""; oA.textContent = ""; oBands.textContent = ""; oW.textContent = "";
      return;
    }
    oISL.textContent = fmt(r.inverse_square_dB, 2) + " dB";
    oSPL.textContent = fmt(r.SPL_far_1kHz_dB, 2) + " dB";
    oA.textContent = fmt(r.absorption_1kHz_dB, 2) + " dB (alpha " + fmt(r.alpha_1kHz_dB_per_m * 30.48, 4) + " dB/100 ft = " + fmt(r.alpha_1kHz_dB_per_m, 5) + " dB/m)";
    oBands.textContent = r.bands.map((b) => b.f_Hz + " Hz: " + fmt(b.SPL_far_dB, 1)).join(", ");
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const el of [spl.input, dref.input, dfar.input, tF.input, rh.input, p.input]) el.addEventListener("input", update);
}

STAGE_RENDERERS["spl-atmospheric"] = renderSPLAtmospheric;

// ===========================================================================
// spec-v20 Phase N - power distro per-leg loading (v18/v21 tile contract).
// ===========================================================================

// --- v20 N.1: Power distro per-leg loading (`power-distro`) ---
// 1-phase I = W/(V*PF); 3-phase I = W/(sqrt(3)*V_LL*PF); continuous limit = rating*0.80.
// dims: in { watts: M*L^2*T^-3, voltage_v: M*L^2*T^-3*I^-1, phase: dimensionless, rating_a: I, pf: dimensionless, derate: dimensionless } out: { amps_per_leg: I, pct_load: dimensionless }
export function computePowerDistro({ watts = 0, voltage_v = 208, phase = "three", rating_a = 0, pf = 1, derate = 0.8 } = {}) {
  const W = Number(watts) || 0;
  const V = Number(voltage_v) || 0;
  const rating = Number(rating_a) || 0;
  const PF = Number(pf) || 0;
  const der = Number(derate) || 0;
  if (!(W > 0 && Number.isFinite(W))) return { error: "Connected load must be positive (W)." };
  if (!(V > 0 && Number.isFinite(V))) return { error: "Service voltage must be positive (V)." };
  if (!(rating > 0 && Number.isFinite(rating))) return { error: "Service rating must be positive (A per leg)." };
  if (!(PF > 0 && PF <= 1)) return { error: "Power factor must be in (0, 1]." };
  if (!(der > 0 && der <= 1)) return { error: "Continuous-derate target must be in (0, 1]." };
  const amps = phase === "single" ? W / (V * PF) : W / (Math.sqrt(3) * V * PF);
  const pct = amps / rating * 100;
  const continuousLimit = rating * der;
  const headroom = continuousLimit - amps;
  return {
    amps_per_leg: Number.isFinite(amps) ? amps : null,
    pct_load: Number.isFinite(pct) ? pct : null,
    continuous_limit_a: Number.isFinite(continuousLimit) ? continuousLimit : null,
    headroom_a: Number.isFinite(headroom) ? headroom : null,
    pass: amps <= continuousLimit,
    note: "Assumes balanced legs unless per-phase entered. Ignores inrush / dimmer harmonics on the neutral. PF < 1 for LED/motor loads raises current. NEC continuous-load 80% rule and temporary-power Articles 520/525 govern.",
  };
}
export const powerDistroExample = { inputs: { watts: 12000, voltage_v: 208, phase: "three", rating_a: 60, pf: 1, derate: 0.8 } };

function renderPowerDistro(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles AC power (P = V*I*PF; 3-phase adds sqrt(3)). The NEC continuous-load 80% rule and temporary-power Articles 520/525, by name; a qualified electrician and the AHJ govern temporary power. Distinct from neutral-imbalance. Free read-only at nfpa.org/freeaccess.";
  const w = makeNumber("Total connected load (W)", "pd-w", { step: "any", min: "0" });
  const v = makeNumber("Service voltage (V, line-line for 3-phase)", "pd-v", { step: "any", min: "0" });
  const phase = makeSelect("Phase", "pd-phase", [{ value: "three", label: "3-phase", selected: true }, { value: "single", label: "1-phase" }]);
  const rating = makeNumber("Service rating (A per leg)", "pd-rating", { step: "any", min: "0" });
  const pf = makeNumber("Power factor", "pd-pf", { step: "any", min: "0", max: "1" });
  const der = makeNumber("Continuous-derate target", "pd-der", { step: "any", min: "0", max: "1" });
  for (const f of [w, v, phase, rating, pf, der]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "12000"; v.input.value = "208"; phase.select.value = "three"; rating.input.value = "60"; pf.input.value = "1"; der.input.value = "0.8"; update(); });
  const oAmps = makeOutputLine(outputRegion, "Current per leg", "pd-out-amps");
  const oPct = makeOutputLine(outputRegion, "% of rating / verdict", "pd-out-pct");
  const oNote = makeOutputLine(outputRegion, "Note", "pd-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePowerDistro({ watts: readNum(w.input), voltage_v: readNum(v.input), phase: phase.select.value, rating_a: readNum(rating.input), pf: readNum(pf.input), derate: readNum(der.input) });
    if (r.error) { oAmps.textContent = r.error; oPct.textContent = ""; oNote.textContent = ""; return; }
    oAmps.textContent = fmt(r.amps_per_leg, 1) + " A/leg (" + fmt(r.headroom_a, 1) + " A headroom)";
    oPct.textContent = fmt(r.pct_load, 1) + "% of rating - " + (r.pass ? "PASS (within 80%)" : "FAIL (over continuous limit)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [w.input, v.input, phase.select, rating.input, pf.input, der.input]) f.addEventListener("input", update);
}
STAGE_RENDERERS["power-distro"] = renderPowerDistro;

// ===========================================================================
// spec-v24 Group N - audio electronics (3 tiles; v18/v21 tile contract).
// ===========================================================================

// --- v24 N.1: Speaker impedance network (`speaker-impedance`) ---
// series Z = z*N; parallel equal Z = z/N; series-parallel = (z*series_per_branch)/branches.
// dims: in { topology: dimensionless, z_ohm: M L^2 T^-3 I^-2, count: dimensionless, series_per_branch: dimensionless, branches: dimensionless, amp_min_ohm: M L^2 T^-3 I^-2, power_w: M L^2 T^-3 } out: { z_total_ohm: M L^2 T^-3 I^-2, safe: dimensionless, per_driver_power_w: M L^2 T^-3 }
export function computeSpeakerImpedance({ topology, z_ohm, count, series_per_branch, branches, amp_min_ohm, power_w }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(z_ohm > 0)) return { error: "Driver impedance must be greater than zero (Ohm)." };
  let n_drivers;
  let z_total_ohm;
  if (topology === "series") {
    if (!(count >= 1)) return { error: "Need at least one driver." };
    n_drivers = count;
    z_total_ohm = z_ohm * count;
  } else if (topology === "parallel") {
    if (!(count >= 1)) return { error: "Need at least one driver." };
    n_drivers = count;
    z_total_ohm = z_ohm / count;
  } else if (topology === "series-parallel") {
    if (!(series_per_branch >= 1)) return { error: "Need at least one driver per series branch." };
    if (!(branches >= 1)) return { error: "Need at least one parallel branch." };
    n_drivers = series_per_branch * branches;
    z_total_ohm = (z_ohm * series_per_branch) / branches;
  } else {
    return { error: "Topology must be series, parallel, or series-parallel." };
  }
  if (!(z_total_ohm > 0)) return { error: "Computed network impedance is not positive." };
  let safe = null;
  if (amp_min_ohm > 0) safe = z_total_ohm >= amp_min_ohm;
  let per_driver_power_w = null;
  if (power_w > 0 && n_drivers >= 1) per_driver_power_w = power_w / n_drivers;
  return { z_total_ohm, n_drivers, safe, per_driver_power_w };
}
export const speakerImpedanceExample = { inputs: { topology: "parallel", z_ohm: 8, count: 4, series_per_branch: 2, branches: 2, amp_min_ohm: 2, power_w: 0 } };

function renderSpeakerImpedance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Ohm's-law series/parallel impedance combination (public); the amplifier-minimum-load check follows the manufacturer's rated minimum (user-supplied). A nominal-impedance estimate, real loudspeaker impedance is frequency-dependent, the amp spec governs.";
  const topo = makeSelect("Wiring topology", "si-topo", [
    { value: "parallel", label: "Parallel", selected: true },
    { value: "series", label: "Series" },
    { value: "series-parallel", label: "Series-parallel" },
  ]);
  const z = makeNumber("Per-driver nominal impedance (Ohm)", "si-z", { step: "any", min: "0", value: "8" }); z.input.value = "8";
  const count = makeNumber("Driver count (series or parallel)", "si-count", { step: "1", min: "1" });
  const spb = makeNumber("Drivers per series branch (series-parallel)", "si-spb", { step: "1", min: "1" });
  const branches = makeNumber("Parallel branches (series-parallel)", "si-branches", { step: "1", min: "1" });
  const ampMin = makeNumber("Amplifier minimum rated load (Ohm; optional)", "si-ampmin", { step: "any", min: "0" });
  const power = makeNumber("Total amplifier power for split (W; optional)", "si-power", { step: "any", min: "0" });
  for (const f of [topo, z, count, spb, branches, ampMin, power]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    topo.select.value = "parallel"; z.input.value = "8"; count.input.value = "4";
    spb.input.value = "2"; branches.input.value = "2"; ampMin.input.value = "2"; power.input.value = ""; update();
  });
  const oZ = makeOutputLine(outputRegion, "Total network impedance", "si-out-z");
  const oSafe = makeOutputLine(outputRegion, "Amp-load verdict", "si-out-safe");
  const oPower = makeOutputLine(outputRegion, "Per-driver power", "si-out-power");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSpeakerImpedance({
      topology: topo.select.value,
      z_ohm: readNum(z.input),
      count: readNum(count.input),
      series_per_branch: readNum(spb.input),
      branches: readNum(branches.input),
      amp_min_ohm: readNum(ampMin.input),
      power_w: readNum(power.input),
    });
    if (r.error) { oZ.textContent = r.error; oSafe.textContent = ""; oPower.textContent = ""; return; }
    oZ.textContent = fmt(r.z_total_ohm, 2) + " Ohm (" + r.n_drivers + " drivers)";
    oSafe.textContent = r.safe === null ? "No amp minimum entered" : (r.safe ? "SAFE (at or above amp minimum)" : "BELOW amp minimum - check amp spec");
    oPower.textContent = r.per_driver_power_w === null ? "No power entered" : fmt(r.per_driver_power_w, 1) + " W per driver";
  }, DEBOUNCE_MS);
  for (const el of [topo.select, z.input, count.input, spb.input, branches.input, ampMin.input, power.input]) el.addEventListener("input", update);
}
STAGE_RENDERERS["speaker-impedance"] = renderSpeakerImpedance;

// --- v24 N.2: Decibel converter (`decibel-converter`) ---
// power 10*log10(p2/p1); voltage 20*log10(v2/v1); ref-level back-solve; combine 10*log10(sum 10^(Li/10)).
// dims: in { mode: dimensionless, p1: M L^2 T^-3, p2: M L^2 T^-3, v1: M L^2 T^-3 I^-1, v2: M L^2 T^-3 I^-1, level_db: dimensionless, ref_type: dimensionless, levels: dimensionless } out: { db: dimensionless, linear_value: dimensionless }
export function computeDecibelConverter({ mode, p1, p2, v1, v2, level_db, ref_type, levels }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (mode === "power-ratio") {
    if (!(p1 > 0)) return { error: "Reference power p1 must be greater than zero (log domain)." };
    if (!(p2 > 0)) return { error: "Power p2 must be greater than zero (log domain)." };
    return { db: 10 * Math.log10(p2 / p1) };
  }
  if (mode === "voltage-ratio") {
    if (!(v1 > 0)) return { error: "Reference voltage/pressure v1 must be greater than zero (log domain)." };
    if (!(v2 > 0)) return { error: "Voltage/pressure v2 must be greater than zero (log domain)." };
    return { db: 20 * Math.log10(v2 / v1) };
  }
  if (mode === "reference-level") {
    if (typeof level_db !== "number") return { error: "Enter a level in dB." };
    let ref;
    let unit;
    if (ref_type === "dBu") { ref = 0.775; unit = "V"; }
    else if (ref_type === "dBV") { ref = 1; unit = "V"; }
    else if (ref_type === "dBSPL") { ref = 20e-6; unit = "Pa"; }
    else return { error: "Reference type must be dBu, dBV, or dBSPL." };
    const linear_value = ref * Math.pow(10, level_db / 20);
    if (!Number.isFinite(linear_value)) return { error: "Level out of representable range." };
    return { linear_value, unit };
  }
  if (mode === "combine") {
    if (!Array.isArray(levels) || levels.length === 0) return { error: "Enter at least one source level (dB)." };
    let sum = 0;
    for (const li of levels) {
      if (typeof li !== "number" || !Number.isFinite(li)) return { error: "Each source level must be a finite number (dB)." };
      sum += Math.pow(10, li / 10);
    }
    if (!(sum > 0)) return { error: "Combined energy must be positive." };
    return { db: 10 * Math.log10(sum) };
  }
  return { error: "Mode must be power-ratio, voltage-ratio, reference-level, or combine." };
}
export const decibelConverterExample = { inputs: { mode: "power-ratio", p1: 1, p2: 2, v1: 1, v2: 2, level_db: 4, ref_type: "dBu", levels: [90,90] } };

function renderDecibelConverter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per ANSI S1.1 acoustical-terminology decibel definitions (power 10log, field-quantity 20log) and the standard reference levels (dBu 0.775 V, dBV 1 V, dBSPL 20 uPa), by name; public. Complements spl-distance.";
  const mode = makeSelect("Mode", "dbc-mode", [
    { value: "power-ratio", label: "Power ratio (10 log)", selected: true },
    { value: "voltage-ratio", label: "Voltage/pressure ratio (20 log)" },
    { value: "reference-level", label: "Reference level (back-solve linear)" },
    { value: "combine", label: "Combine incoherent sources" },
  ]);
  const p1 = makeNumber("Reference power p1 (W)", "dbc-p1", { step: "any", min: "0" });
  const p2 = makeNumber("Power p2 (W)", "dbc-p2", { step: "any", min: "0" });
  const v1 = makeNumber("Reference voltage/pressure v1", "dbc-v1", { step: "any", min: "0" });
  const v2 = makeNumber("Voltage/pressure v2", "dbc-v2", { step: "any", min: "0" });
  const level = makeNumber("Level (dB)", "dbc-level", { step: "any" });
  const ref = makeSelect("Reference type", "dbc-ref", [
    { value: "dBu", label: "dBu (0.775 V)", selected: true },
    { value: "dBV", label: "dBV (1 V)" },
    { value: "dBSPL", label: "dBSPL (20 uPa)" },
  ]);
  const list = makeNumber("Source levels (dB, comma-separated)", "dbc-list", { type: "text" });
  list.input.type = "text";
  for (const f of [mode, p1, p2, v1, v2, level, ref, list]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    mode.select.value = "power-ratio"; p1.input.value = "1"; p2.input.value = "2"; v1.input.value = "1"; v2.input.value = "2";
    level.input.value = "4"; ref.select.value = "dBu"; list.input.value = "90, 90"; update();
  });
  const oResult = makeOutputLine(outputRegion, "Result", "dbc-out-result");
  function readNum(i) { if (i.value === "") return null; const n = Number(i.value); return Number.isFinite(n) ? n : null; }
  function parseLevels(s) {
    const parts = s.split(",").map((t) => t.trim()).filter((t) => t !== "");
    const out = [];
    for (const p of parts) { const n = Number(p); if (!Number.isFinite(n)) return null; out.push(n); }
    return out;
  }
  const update = debounce(() => {
    const lv = parseLevels(list.input.value);
    const r = computeDecibelConverter({
      mode: mode.select.value,
      p1: readNum(p1.input),
      p2: readNum(p2.input),
      v1: readNum(v1.input),
      v2: readNum(v2.input),
      level_db: readNum(level.input),
      ref_type: ref.select.value,
      levels: lv === null ? null : lv,
    });
    if (r.error) { oResult.textContent = r.error; return; }
    if (typeof r.db === "number") oResult.textContent = fmt(r.db, 4) + " dB";
    else oResult.textContent = fmt(r.linear_value, 4) + " " + r.unit;
  }, DEBOUNCE_MS);
  for (const el of [mode.select, p1.input, p2.input, v1.input, v2.input, level.input, ref.select, list.input]) el.addEventListener("input", update);
}
STAGE_RENDERERS["decibel-converter"] = renderDecibelConverter;

// --- v24 N.3: Amplifier power to SPL and headroom (`amp-power-spl`) ---
// SPL = sensitivity + 10*log10(power) - 20*log10(distance); peak = SPL + crest; inverse power = 10^((target-sens+20*log10(d))/10).
// dims: in { sensitivity_db: dimensionless, power_w: M L^2 T^-3, distance_m: L, crest_db: dimensionless, target_spl_db: dimensionless, max_spl_db: dimensionless } out: { spl_db: dimensionless, peak_spl_db: dimensionless, power_for_target_w: M L^2 T^-3 }
export function computeAmpPowerSpl({ sensitivity_db, power_w, distance_m, crest_db, target_spl_db, max_spl_db }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (typeof sensitivity_db !== "number") return { error: "Enter speaker sensitivity (dB @ 1 W / 1 m)." };
  if (!(power_w > 0)) return { error: "Amplifier power must be greater than zero (W)." };
  if (!(distance_m > 0)) return { error: "Listening distance must be greater than zero." };
  const spl_db = sensitivity_db + 10 * Math.log10(power_w) - 20 * Math.log10(distance_m);
  if (!Number.isFinite(spl_db)) return { error: "Computed SPL is not finite." };
  let peak_spl_db = null;
  if (typeof crest_db === "number") peak_spl_db = spl_db + crest_db;
  let power_for_target_w = null;
  let target_achievable = null;
  if (typeof target_spl_db === "number") {
    power_for_target_w = Math.pow(10, (target_spl_db - sensitivity_db + 20 * Math.log10(distance_m)) / 10);
    if (!Number.isFinite(power_for_target_w)) return { error: "Target SPL out of representable range." };
    if (max_spl_db > 0) target_achievable = target_spl_db <= max_spl_db;
  }
  return { spl_db, peak_spl_db, power_for_target_w, target_achievable };
}
export const ampPowerSplExample = { inputs: { sensitivity_db: 90, power_w: 100, distance_m: 1, crest_db: 12, target_spl_db: 0, max_spl_db: 0 } };

function renderAmpPowerSpl(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles loudspeaker SPL from the 1 W / 1 m sensitivity reference, the 10log power term, and the inverse-square distance term (public; ANSI S1.1 decibel basis). Free-field estimate, room gain and power compression and excursion limits not modeled, the manufacturer max-SPL spec governs.";
  const sens = makeNumber("Speaker sensitivity (dB @ 1 W / 1 m)", "aps-sens", { step: "any" });
  const power = makeNumber("Amplifier power per channel (W)", "aps-power", { step: "any", min: "0" });
  // v593: US-facing ft field, converted at this boundary into the metric-native
  // compute (3.28 ft ~ 1 m); the dB @ 1 W / 1 m sensitivity reference stays.
  const dist = makeNumber("Listening distance (ft)", "aps-dist", { step: "any", min: "0" });
  const crest = makeNumber("Crest factor / headroom (dB; optional)", "aps-crest", { step: "any", value: "12" }); crest.input.value = "12";
  const target = makeNumber("Target SPL for inverse power (dB; optional)", "aps-target", { step: "any" });
  const maxSpl = makeNumber("Rated max SPL (dB; optional)", "aps-max", { step: "any", min: "0" });
  for (const f of [sens, power, dist, crest, target, maxSpl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    sens.input.value = "90"; power.input.value = "100"; dist.input.value = "3.28"; crest.input.value = "12";
    target.input.value = ""; maxSpl.input.value = ""; update();
  });
  const oSpl = makeOutputLine(outputRegion, "Continuous SPL at listener", "aps-out-spl");
  const oPeak = makeOutputLine(outputRegion, "Peak SPL after headroom", "aps-out-peak");
  const oInv = makeOutputLine(outputRegion, "Power needed for target SPL", "aps-out-inv");
  function readNum(i) { if (i.value === "") return null; const n = Number(i.value); return Number.isFinite(n) ? n : null; }
  const update = debounce(() => {
    const distFt = readNum(dist.input);
    const r = computeAmpPowerSpl({
      sensitivity_db: readNum(sens.input),
      power_w: readNum(power.input),
      distance_m: distFt === null ? null : distFt * 0.3048,
      crest_db: readNum(crest.input),
      target_spl_db: readNum(target.input),
      max_spl_db: readNum(maxSpl.input),
    });
    if (r.error) { oSpl.textContent = r.error; oPeak.textContent = ""; oInv.textContent = ""; return; }
    oSpl.textContent = fmt(r.spl_db, 2) + " dB";
    oPeak.textContent = r.peak_spl_db === null ? "No crest factor entered" : fmt(r.peak_spl_db, 2) + " dB";
    if (r.power_for_target_w === null) oInv.textContent = "No target entered";
    else oInv.textContent = fmt(r.power_for_target_w, 1) + " W" + (r.target_achievable === null ? "" : (r.target_achievable ? " (within rated max)" : " (exceeds rated max - unachievable)"));
  }, DEBOUNCE_MS);
  for (const el of [sens.input, power.input, dist.input, crest.input, target.input, maxSpl.input]) el.addEventListener("input", update);
}
STAGE_RENDERERS["amp-power-spl"] = renderAmpPowerSpl;

// =====================================================================
// spec-v51 N - lighting-beam (Stage Lighting Beam and Throw)
// The theatrical point/beam photometry a lighting designer runs: the
// beam (pool) diameter at a throw distance, D = 2 x throw x tan(angle/2),
// and the center-beam illuminance by the inverse-square law, E = candela
// / distance^2 (the standard manufacturers publish their photometrics in).
// Distinct from the architectural lumen-method area-average tile
// (lux-to-footcandle): this is a single aimed fixture, not a room budget.
// =====================================================================

// dims: in { beam_angle_deg: dimensionless, throw_distance: L, distance_unit: dimensionless, source: dimensionless, candela: dimensionless, lumens: dimensionless } out: { beam_diameter: L, illuminance_lux: dimensionless, illuminance_fc: dimensionless }
export function computeLightingBeam({ beam_angle_deg = 0, throw_distance = 0, distance_unit = "ft", source = "candela", candela = 0, lumens = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ang = Number(beam_angle_deg) || 0;
  const thr = Number(throw_distance) || 0;
  if (!(ang > 0) || !(ang < 180)) return { error: "Beam angle must be between 0 and 180 degrees." };
  if (!(thr > 0)) return { error: "Throw distance must be positive." };
  const FT_PER_M = 3.280839895013123, M_PER_FT = 0.3048, LUX_PER_FC = 10.76391041670972;
  const isFt = String(distance_unit) !== "m";
  const d_ft = isFt ? thr : thr * FT_PER_M;
  const d_m = isFt ? thr * M_PER_FT : thr;
  const half = (ang / 2) * Math.PI / 180;
  const beam_diameter = 2 * thr * Math.tan(half); // in the entered unit
  const beam_diameter_ft = 2 * d_ft * Math.tan(half);
  const beam_diameter_m = 2 * d_m * Math.tan(half);
  let I_cd, candela_derived = false;
  if (String(source) === "lumens") {
    const lm = Number(lumens) || 0;
    if (!(lm > 0)) return { error: "Luminous flux must be positive (lumens)." };
    const solid_sr = 2 * Math.PI * (1 - Math.cos(half)); // solid angle of the cone
    I_cd = lm / solid_sr;
    candela_derived = true;
  } else {
    I_cd = Number(candela) || 0;
    if (!(I_cd > 0)) return { error: "Center-beam intensity must be positive (candela)." };
  }
  const illuminance_lux = I_cd / (d_m * d_m);
  const illuminance_fc = I_cd / (d_ft * d_ft);
  const notes = [];
  notes.push("Beam (pool) diameter = 2 x throw x tan(beam angle / 2); center-beam illuminance by the inverse-square law E = candela / distance^2 (lux uses metres, footcandles use feet; 1 fc = 10.764 lux). First-principles photometry; this is the point-source model manufacturers publish fixture photometrics in.");
  if (candela_derived) notes.push("Center intensity was estimated from total lumens spread over the beam cone (" + fmt(I_cd, 0) + " cd); a real fixture is brightest at center and dimmer at the edge, so this is an average-over-the-cone estimate. Use the published candela / center-beam figure when you have it.");
  notes.push("Fixtures spec both a beam angle (to 50% intensity) and a wider field angle (to 10%); enter whichever you are designing to. For room / area average illuminance (lumen method) use the lux-to-footcandle tile instead.");
  return {
    beam_angle_deg: ang, throw_distance: thr, distance_unit: isFt ? "ft" : "m",
    beam_diameter, beam_diameter_ft, beam_diameter_m,
    candela: I_cd, candela_derived,
    illuminance_lux, illuminance_fc, notes,
  };
}
export const lightingBeamExample = { inputs: { beam_angle_deg: 20, throw_distance: 30, distance_unit: "ft", source: "candela", candela: 100000, lumens: 0 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderLightingBeam(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles theatrical photometry - beam diameter = 2 x throw x tan(beam angle / 2); center illuminance by the inverse-square law E = candela / distance^2 (the form fixture photometric charts publish, e.g. ETC / manufacturer cut sheets), by name; public domain. The architectural lumen-method room average is a separate tile (lux-to-footcandle).";
  const ang = makeNumber("Beam angle (full cone, deg)", "lb-ang", { step: "any", min: "0", max: "180" });
  const thr = makeNumber("Throw distance", "lb-thr", { step: "any", min: "0" });
  const unit = makeSelect("Distance unit", "lb-unit", [
    { value: "ft", label: "Feet" },
    { value: "m", label: "Metres" },
  ]);
  const src = makeSelect("Intensity source", "lb-src", [
    { value: "candela", label: "Center-beam intensity (candela)" },
    { value: "lumens", label: "Total output (lumens) + beam angle" },
  ]);
  const cd = makeNumber("Center-beam intensity (candela)", "lb-cd", { step: "any", min: "0" });
  const lm = makeNumber("Luminous flux (lumens)", "lb-lm", { step: "any", min: "0" });
  for (const f of [ang, thr, unit, src, cd, lm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ang.input.value = "20"; thr.input.value = "30"; unit.select.value = "ft"; src.select.value = "candela"; cd.input.value = "100000"; lm.input.value = ""; update(); });
  const oDia = makeOutputLine(outputRegion, "Beam diameter at target", "lb-out-dia");
  const oIll = makeOutputLine(outputRegion, "Center illuminance", "lb-out-ill");
  const oCd = makeOutputLine(outputRegion, "Center intensity", "lb-out-cd");
  const oNote = makeOutputLine(outputRegion, "Notes", "lb-out-note");
  const update = debounce(() => {
    const r = computeLightingBeam({ beam_angle_deg: Number(ang.input.value) || 0, throw_distance: Number(thr.input.value) || 0, distance_unit: unit.select.value, source: src.select.value, candela: Number(cd.input.value) || 0, lumens: Number(lm.input.value) || 0 });
    if (r.error) { oDia.textContent = r.error; oIll.textContent = "-"; oCd.textContent = "-"; oNote.textContent = ""; return; }
    oDia.textContent = fmt(r.beam_diameter_ft, 2) + " ft (" + fmt(r.beam_diameter_m, 2) + " m)";
    oIll.textContent = fmt(r.illuminance_fc, 1) + " fc (" + fmt(r.illuminance_lux, 0) + " lux)";
    oCd.textContent = fmt(r.candela, 0) + " cd" + (r.candela_derived ? " (estimated from lumens)" : "");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [ang.input, thr.input, cd.input, lm.input]) f.addEventListener("input", update);
  for (const f of [unit.select, src.select]) f.addEventListener("change", update);
}
STAGE_RENDERERS["lighting-beam"] = renderLightingBeam;

// =====================================================================
// spec-v92 N - LED video wall + projection brightness, the video side of
// a show (now the largest power, weight, and rigging item on most
// stages). led-video-wall feeds its weight to the rigging tiles and its
// power to power-distro; projector-brightness is the projection analog of
// lighting-beam's fixture photometry. GOVERNANCE.worker_safety (a rigged,
// powered structure - the maker's spec sheet governs). 304.8 mm/ft,
// 3.28084 ft/m, the ~1 m per 1 mm pitch viewing rule.
// =====================================================================

// dims: in { cab_w_px: dimensionless, cab_h_px: dimensionless, pixel_pitch_mm: L, cols: dimensionless, rows: dimensionless, cab_weight_lb: M, cab_max_watts: dimensionless, avg_power_factor: dimensionless } out: { total_pixels: dimensionless, width_ft: L, min_view_ft: L }
export function computeLedVideoWall({ cab_w_px = 0, cab_h_px = 0, pixel_pitch_mm = 0, cols = 0, rows = 0, cab_weight_lb = 0, cab_max_watts = 0, avg_power_factor = 0.35 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (cab_weight_lb < 0 || cab_max_watts < 0) return { error: "Weight and power inputs must be non-negative." };
  if (!(cab_w_px > 0) || !(cab_h_px > 0)) return { error: "Cabinet pixel counts must be positive." };
  if (!(pixel_pitch_mm > 0)) return { error: "Pixel pitch must be positive." };
  if (!(cols > 0) || !(rows > 0)) return { error: "Columns and rows must be positive." };
  if (!(avg_power_factor > 0 && avg_power_factor <= 1)) return { error: "Average-power factor must be greater than 0 and at most 1." };
  const MM_PER_FT = 304.8, FT_PER_M = 3.28084;
  const cab_w_mm = cab_w_px * pixel_pitch_mm;
  const cab_h_mm = cab_h_px * pixel_pitch_mm;
  const total_w_px = cab_w_px * cols;
  const total_h_px = cab_h_px * rows;
  const total_pixels = total_w_px * total_h_px;
  const cabinets = cols * rows;
  const width_ft = cab_w_mm * cols / MM_PER_FT;
  const height_ft = cab_h_mm * rows / MM_PER_FT;
  const peak_power_w = cab_max_watts > 0 ? cab_max_watts * cabinets : null;
  return {
    total_w_px, total_h_px, total_pixels, cabinets,
    cab_w_mm, cab_h_mm, width_ft, height_ft,
    total_weight: cab_weight_lb > 0 ? cab_weight_lb * cabinets : null,
    peak_power_w,
    avg_power_w: peak_power_w !== null ? peak_power_w * avg_power_factor : null,
    min_view_ft: pixel_pitch_mm * FT_PER_M,
    note: "Resolution is fixed by the pixel count, while the pitch sets the physical size and the closest a viewer should sit - the ~1 m per 1 mm of pitch rule means a 2.6 mm wall reads cleanly from roughly 8.5 ft back. Peak power is the spec-sheet draw at full white, but real content averages roughly 30-40% of that, so size the average for the breaker math (power-distro) and the peak for the worst case. The weight drives the rigging. Confirm pixel count, pitch, weight, and peak watts on the maker's spec sheet.",
  };
}
export const ledVideoWallExample = { inputs: { cab_w_px: 168, cab_h_px: 168, pixel_pitch_mm: 2.6, cols: 10, rows: 6, cab_weight_lb: 18, cab_max_watts: 200, avg_power_factor: 0.35 } };
const renderLedVideoWall = _r({
  citation: "Citation: LED panel maker's spec sheet (native pixel count, pitch, per-cabinet weight, peak watts, by name). Size = pixels x pitch; minimum viewing distance ~ 1 m per 1 mm pitch.",
  example: ledVideoWallExample.inputs,
  fields: [
    { key: "cab_w_px", label: "Cabinet width (px)", kind: "number" },
    { key: "cab_h_px", label: "Cabinet height (px)", kind: "number" },
    { key: "pixel_pitch_mm", label: "Pixel pitch (mm)", kind: "number" },
    { key: "cols", label: "Cabinets wide", kind: "number" },
    { key: "rows", label: "Cabinets tall", kind: "number" },
    { key: "cab_weight_lb", label: "Weight per cabinet (lb, optional)", kind: "number" },
    { key: "cab_max_watts", label: "Peak watts per cabinet (optional)", kind: "number" },
    { key: "avg_power_factor", label: "Average-power factor (0-1)", kind: "number" },
  ],
  outputs: [
    { key: "res", id: "lvw-out-res", label: "Resolution", value: (r) => r.total_w_px + " x " + r.total_h_px + " px (" + fmt(r.total_pixels, 0) + " px)" },
    { key: "sz", id: "lvw-out-sz", label: "Size", value: (r) => fmt(r.width_ft, 2) + " x " + fmt(r.height_ft, 2) + " ft (" + r.cabinets + " cabinets)" },
    { key: "wt", id: "lvw-out-wt", label: "Weight", value: (r) => r.total_weight === null ? "-" : fmt(r.total_weight, 0) + " lb" },
    { key: "pk", id: "lvw-out-pk", label: "Peak power", value: (r) => r.peak_power_w === null ? "-" : fmt(r.peak_power_w, 0) + " W" },
    { key: "av", id: "lvw-out-av", label: "Average power", value: (r) => r.avg_power_w === null ? "-" : fmt(r.avg_power_w, 0) + " W" },
    { key: "mv", id: "lvw-out-mv", label: "Minimum viewing", value: (r) => fmt(r.min_view_ft, 2) + " ft" },
    { key: "n", id: "lvw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLedVideoWall,
});
STAGE_RENDERERS["led-video-wall"] = renderLedVideoWall;

// dims: in { screen_w_ft: L, screen_h_ft: L, screen_gain: dimensionless, target_foot_lamberts: dimensionless, throw_ratio: dimensionless } out: { area_sqft: L^2, required_lumens: dimensionless, throw_distance_ft: L }
export function computeProjectorBrightness({ screen_w_ft = 0, screen_h_ft = 0, screen_gain = 1.0, target_foot_lamberts = 16, throw_ratio = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (throw_ratio < 0) return { error: "Throw ratio must be non-negative." };
  if (!(screen_w_ft > 0) || !(screen_h_ft > 0)) return { error: "Screen dimensions must be positive." };
  if (!(screen_gain > 0)) return { error: "Screen gain must be positive." };
  if (!(target_foot_lamberts > 0)) return { error: "Target foot-lamberts must be positive." };
  const area_sqft = screen_w_ft * screen_h_ft;
  const required_lumens = target_foot_lamberts * area_sqft / screen_gain;
  const throw_distance_ft = throw_ratio > 0 ? throw_ratio * screen_w_ft : null;
  return {
    area_sqft, required_lumens, throw_distance_ft,
    note: "Screen brightness in foot-lamberts is the lumens hitting the screen times the gain over the screen area, so a bigger screen needs proportionally more lumens. About 16 fL is the dark-room baseline; an ambient or lit room wants roughly 30-50. Size 20-30% over the minimum for lamp aging and a dirty filter. A high-gain screen is brighter on-axis but narrows the good seats. The throw distance is the throw ratio times the screen width - check it against the room and the lens range.",
  };
}
export const projectorBrightnessExample = { inputs: { screen_w_ft: 16, screen_h_ft: 9, screen_gain: 1.0, target_foot_lamberts: 16, throw_ratio: 1.5 } };
const renderProjectorBrightness = _r({
  citation: "Citation: Standard AV screen-luminance identity foot-lamberts = lumens x gain / area (SMPTE-style targets, by name). Required lumens = target fL x area / gain.",
  example: projectorBrightnessExample.inputs,
  fields: [
    { key: "screen_w_ft", label: "Screen width (ft)", kind: "number" },
    { key: "screen_h_ft", label: "Screen height (ft)", kind: "number" },
    { key: "screen_gain", label: "Screen gain", kind: "number" },
    { key: "target_foot_lamberts", label: "Target foot-lamberts", kind: "number" },
    { key: "throw_ratio", label: "Throw ratio (optional)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "pb-out-a", label: "Screen area", value: (r) => fmt(r.area_sqft, 1) + " sq ft" },
    { key: "l", id: "pb-out-l", label: "Required lumens", value: (r) => fmt(r.required_lumens, 0) + " ANSI lumens" },
    { key: "t", id: "pb-out-t", label: "Throw distance", value: (r) => r.throw_distance_ft === null ? "-" : fmt(r.throw_distance_ft, 1) + " ft" },
    { key: "n", id: "pb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeProjectorBrightness,
});
STAGE_RENDERERS["projector-brightness"] = renderProjectorBrightness;

// projector-max-screen-size: inverse of projector-brightness. The forward tile
// gives the lumens a screen needs; given the projector you own, the largest
// screen it lights to a target brightness is the inverse. From
// required_lumens = target_fL x area / gain, max_area = lumens x gain / target_fL,
// then the width / height / diagonal at a chosen aspect ratio.
// dims: in { available_lumens: dimensionless, screen_gain: dimensionless, target_foot_lamberts: dimensionless, aspect_w: dimensionless, aspect_h: dimensionless } out: { max_area_sqft: L^2, max_width_ft: L, max_height_ft: L, max_diagonal_ft: L }
export function computeProjectorMaxScreenSize({ available_lumens = 0, screen_gain = 1.0, target_foot_lamberts = 16, aspect_w = 16, aspect_h = 9 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const lm = Number(available_lumens) || 0;
  const gain = Number(screen_gain) || 0;
  const fL = Number(target_foot_lamberts) || 0;
  const aw = Number(aspect_w) || 0;
  const ah = Number(aspect_h) || 0;
  if (!(lm > 0)) return { error: "Available lumens must be positive." };
  if (!(gain > 0)) return { error: "Screen gain must be positive." };
  if (!(fL > 0)) return { error: "Target foot-lamberts must be positive." };
  if (!(aw > 0) || !(ah > 0)) return { error: "Aspect-ratio dimensions must be positive." };
  const max_area_sqft = (lm * gain) / fL;
  const max_width_ft = Math.sqrt(max_area_sqft * aw / ah);
  const max_height_ft = max_width_ft * ah / aw;
  const max_diagonal_ft = Math.sqrt(max_width_ft * max_width_ft + max_height_ft * max_height_ft);
  return {
    max_area_sqft, max_width_ft, max_height_ft, max_diagonal_ft,
    note: "The largest screen the projector lights to the target brightness: max area = lumens x gain / target foot-lamberts, then the width, height, and diagonal at the aspect ratio. About 16 fL is the dark-room baseline; a lit or ambient room wants 30-50, which shrinks the screen. Size the projector 20-30% over the minimum for lamp aging and a dirty filter, so plan for a screen a step smaller than this ceiling. A high-gain screen covers more area on-axis but narrows the good seats. Check the throw distance and lens range against the room separately.",
  };
}
export const projectorMaxScreenSizeExample = { inputs: { available_lumens: 5000, screen_gain: 1.0, target_foot_lamberts: 16, aspect_w: 16, aspect_h: 9 } };
const renderProjectorMaxScreenSize = _r({
  citation: "Citation: Standard AV screen-luminance identity foot-lamberts = lumens x gain / area (SMPTE-style targets, by name) solved for the area: max area = lumens x gain / target fL, then width / height / diagonal at the aspect ratio.",
  example: projectorMaxScreenSizeExample.inputs,
  fields: [
    { key: "available_lumens", label: "Projector brightness (ANSI lumens)", kind: "number" },
    { key: "screen_gain", label: "Screen gain", kind: "number" },
    { key: "target_foot_lamberts", label: "Target foot-lamberts (16 dark, 30-50 lit)", kind: "number" },
    { key: "aspect_w", label: "Aspect ratio width (e.g. 16)", kind: "number" },
    { key: "aspect_h", label: "Aspect ratio height (e.g. 9)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "pms-out-d", label: "Max screen diagonal", value: (r) => fmt(r.max_diagonal_ft, 1) + " ft (" + fmt(r.max_diagonal_ft * 12, 0) + " in)" },
    { key: "wh", id: "pms-out-wh", label: "Max width x height", value: (r) => fmt(r.max_width_ft, 1) + " x " + fmt(r.max_height_ft, 1) + " ft" },
    { key: "a", id: "pms-out-a", label: "Max screen area", value: (r) => fmt(r.max_area_sqft, 1) + " sq ft" },
    { key: "n", id: "pms-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeProjectorMaxScreenSize,
});
STAGE_RENDERERS["projector-max-screen-size"] = renderProjectorMaxScreenSize;

// ===========================================================================
// spec-v120 Group N - room acoustics: Sabine RT60 + axial room modes.
// ===========================================================================

// --- v120 N: Reverberation Time (RT60) and Axial Room Modes (`room-acoustics`) ---
// rt60 = 0.049 * V / A (Sabine, imperial); first axial mode per dimension = c / (2 * L), c = 1130 ft/s.
// dims: in { volume_ft3: L^3, total_sabins: L^2, length_ft: L, width_ft: L, height_ft: L, sabine_coeff: dimensionless, speed_of_sound_fts: L T^-1 }
//        out: { rt60_s: T, mode_L_hz: T^-1, mode_W_hz: T^-1, mode_H_hz: T^-1 }
// (Sabins are an absorption area, L^2; the Sabine coefficient 0.049 carries
// the s/ft reciprocal that makes rt60 a time, but is bundled as an editable
// dimensionless-by-convention constant per spec-v120 section 1.)
export function computeRoomAcoustics({
  volume_ft3 = 0,
  total_sabins = 0,
  length_ft = 0,
  width_ft = 0,
  height_ft = 0,
  sabine_coeff = 0.049,
  speed_of_sound_fts = 1130,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(volume_ft3) || 0;
  const A = Number(total_sabins) || 0;
  const L = Number(length_ft) || 0;
  const W = Number(width_ft) || 0;
  const H = Number(height_ft) || 0;
  const k = (sabine_coeff === undefined || sabine_coeff === null || sabine_coeff === "") ? 0.049 : Number(sabine_coeff);
  const c = (speed_of_sound_fts === undefined || speed_of_sound_fts === null || speed_of_sound_fts === "") ? 1130 : Number(speed_of_sound_fts);
  if (!(V > 0)) return { error: "Room volume must be positive (ft^3)." };
  if (!(A > 0)) return { error: "Total absorption must be positive (sabins)." };
  if (!(L > 0)) return { error: "Room length must be positive (ft)." };
  if (!(W > 0)) return { error: "Room width must be positive (ft)." };
  if (!(H > 0)) return { error: "Room height must be positive (ft)." };
  if (!(k > 0)) return { error: "Sabine coefficient must be positive." };
  if (!(c > 0)) return { error: "Speed of sound must be positive (ft/s)." };

  const rt60_s = k * V / A;
  const mode_L_hz = c / (2 * L);
  const mode_W_hz = c / (2 * W);
  const mode_H_hz = c / (2 * H);

  return {
    rt60_s, mode_L_hz, mode_W_hz, mode_H_hz,
    note: "RT60 is the Sabine estimate: 0.049 times room volume (cubic feet) over total absorption in sabins (one sabin is one square foot of perfect absorption), and is the time for sound to decay 60 dB. Speech wants a short RT60 (roughly 0.4 to 0.8 s in a small room); music rooms run longer. The three axial modes are the lowest standing-wave frequencies set by geometry, c / (2 x dimension) with c = 1130 ft/s, where bass builds up and nulls form. Modes depend only on room shape, not on absorption, so treatment lowers RT60 but does not move them. The acoustician and the venue govern treatment and sub placement.",
  };
}

export const roomAcousticsExample = { inputs: { volume_ft3: 5000, total_sabins: 500, length_ft: 20, width_ft: 15, height_ft: 10 } };
const renderRoomAcoustics = _r({
  citation: "Citation: Sabine reverberation equation RT60 = 0.049 x V / A (W.C. Sabine, public domain; imperial 0.049 coefficient, editable). First axial room mode per dimension = c / (2 x length), c = 1130 ft/s (editable). The acoustician and the venue govern treatment and sub placement.",
  example: roomAcousticsExample.inputs,
  fields: [
    { key: "volume_ft3", label: "Room volume (ft³)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "total_sabins", label: "Total absorption (sabins)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "length_ft", label: "Room length (ft)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "width_ft", label: "Room width (ft)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "height_ft", label: "Room height (ft)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "sabine_coeff", label: "Sabine coefficient (default 0.049)", kind: "number", default: 0.049, attrs: { step: "any", min: "0" } },
    { key: "speed_of_sound_fts", label: "Speed of sound (ft/s; default 1130)", kind: "number", default: 1130, attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "rt", id: "ra-out-rt", label: "Reverberation time (RT60)", value: (r) => fmt(r.rt60_s, 2) + " s" },
    { key: "ml", id: "ra-out-ml", label: "First axial mode (length)", value: (r) => fmt(r.mode_L_hz, 1) + " Hz" },
    { key: "mw", id: "ra-out-mw", label: "First axial mode (width)", value: (r) => fmt(r.mode_W_hz, 1) + " Hz" },
    { key: "mh", id: "ra-out-mh", label: "First axial mode (height)", value: (r) => fmt(r.mode_H_hz, 1) + " Hz" },
    { key: "n", id: "ra-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRoomAcoustics,
});
STAGE_RENDERERS["room-acoustics"] = renderRoomAcoustics;

// --- spec-v1224 N: Eyring-Norris reverberation time (high-absorption companion to Sabine) ---
// The room-acoustics tile is Sabine only (RT60 = 0.049 V/A); Sabine over-predicts when the average
// absorption is high. Eyring-Norris RT60 = 0.049 V / (-S ln(1 - a_bar)), a_bar = A/S the average
// absorption coefficient. Reduces to Sabine as a_bar -> 0.
// dims: in { volume_ft3: L^3, surface_area_ft2: L^2, avg_absorption: dimensionless, sabine_coeff: dimensionless } out: { rt60_eyring_s: T, rt60_sabine_s: T, total_sabins: L^2 }
export function computeEyringReverberation({ volume_ft3 = 0, surface_area_ft2 = 0, avg_absorption = 0, sabine_coeff = 0.049 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(volume_ft3) || 0;
  const S = Number(surface_area_ft2) || 0;
  const aBar = Number(avg_absorption) || 0;
  const k = (sabine_coeff === undefined || sabine_coeff === null || sabine_coeff === "") ? 0.049 : Number(sabine_coeff);
  if (!(V > 0)) return { error: "Room volume must be positive (ft^3)." };
  if (!(S > 0)) return { error: "Total surface area must be positive (ft^2)." };
  if (!(aBar > 0 && aBar < 1)) return { error: "Average absorption coefficient must be between 0 and 1 (exclusive); at 1 the room is anechoic and RT60 is zero." };
  if (!(k > 0)) return { error: "Sabine coefficient must be positive." };
  const total_sabins = S * aBar;
  const rt60_eyring_s = k * V / (-S * Math.log(1 - aBar));
  const rt60_sabine_s = k * V / total_sabins;
  if (![rt60_eyring_s, rt60_sabine_s, total_sabins].every(Number.isFinite)) return { error: "Reverberation math is not a finite value." };
  return {
    rt60_eyring_s, rt60_sabine_s, total_sabins,
    note: "The Eyring-Norris reverberation time RT60 = 0.049 V / (-S ln(1 - a_bar)), the form used when the average absorption is high and the Sabine estimate over-predicts. V is the room volume, S the total interior surface area, and a_bar = A/S the average absorption coefficient (total sabins divided by total surface). Sabine (RT60 = 0.049 V / A) treats absorption as if sound is removed continuously; Eyring models it as removed on each reflection, which is more realistic in a well-treated (or small, hard-then-treated) room, so Eyring returns a SHORTER RT60 than Sabine whenever a_bar is more than a few tenths -- a 5,000 ft^3 room with 1,300 ft^2 of surface at a_bar 0.30 is 0.53 s by Eyring versus 0.63 s by Sabine. As a_bar approaches zero the -ln(1 - a_bar) term approaches a_bar and the two converge, so a lightly-treated live room reads nearly the same either way; the gap opens as treatment is added. Use Eyring for studios, control rooms, and heavily-treated spaces; Sabine is the quick estimate for a live room. Frequency-average coefficients hide the band-by-band picture; the acoustician and the venue govern the treatment design.",
  };
}
export const eyringReverberationExample = { inputs: { volume_ft3: 5000, surface_area_ft2: 1300, avg_absorption: 0.30 } };
const renderEyringReverberation = _r({
  citation: "Citation: Eyring-Norris reverberation equation RT60 = 0.049 V / (-S ln(1 - a_bar)), a_bar the average absorption coefficient (C.F. Eyring, J. Acoust. Soc. Am. 1930; public domain; imperial 0.049 coefficient, editable). The high-absorption companion to Sabine RT60 = 0.049 V / A, to which it reduces as a_bar -> 0. The acoustician and the venue govern treatment.",
  example: eyringReverberationExample.inputs,
  fields: [
    { key: "volume_ft3", label: "Room volume (ft³)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "surface_area_ft2", label: "Total surface area (ft²)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "avg_absorption", label: "Average absorption coefficient (0-1)", kind: "number", attrs: { step: "any", min: "0", max: "1" } },
    { key: "sabine_coeff", label: "Sabine coefficient (default 0.049)", kind: "number", default: 0.049, attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "ey", id: "ey-out-ey", label: "RT60 (Eyring)", value: (r) => fmt(r.rt60_eyring_s, 2) + " s" },
    { key: "sa", id: "ey-out-sa", label: "RT60 (Sabine, for comparison)", value: (r) => fmt(r.rt60_sabine_s, 2) + " s" },
    { key: "sab", id: "ey-out-sab", label: "Total absorption", value: (r) => fmt(r.total_sabins, 0) + " sabins" },
    { key: "n", id: "ey-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEyringReverberation,
});
STAGE_RENDERERS["eyring-reverberation"] = renderEyringReverberation;

// spec-v1242: single-panel mass-law transmission loss. The room-acoustics family (reverberation,
// levels, absorption) has no partition/wall attenuation tile. Field-incidence limp-mass law:
// TL = 20 log10(m f) - 47 dB, m the surface mass (kg/m^2), f the frequency (Hz); normal-incidence
// uses -42. +6 dB per doubling of mass or frequency. Surface mass entered in lb/ft^2 (US), converted
// at 1 lb/ft^2 = 4.88243 kg/m^2. First-principles acoustics (panel mass reactance; Bies & Hansen /
// FHWA). Scoped to the closed-form mass-law TL, not the ASTM E413 STC rating (which needs a spectrum).
// dims: in { surface_mass_psf: M L^-2, frequency_hz: T^-1, incidence: dimensionless } out: { transmission_loss_db: dimensionless, surface_mass_kgm2: M L^-2 }
export function computeMassLawTL({ surface_mass_psf = 0, frequency_hz = 0, incidence = "field" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const psf = Number(surface_mass_psf) || 0;
  const f = Number(frequency_hz) || 0;
  if (!(psf > 0)) return { error: "Surface mass must be positive (lb/ft^2)." };
  if (!(f > 0)) return { error: "Frequency must be positive (Hz)." };
  if (incidence !== "field" && incidence !== "normal") return { error: "Incidence must be field or normal." };
  const surface_mass_kgm2 = psf * 4.88243;
  const constant = incidence === "normal" ? 42 : 47;
  const transmission_loss_db = 20 * Math.log10(surface_mass_kgm2 * f) - constant;
  const below_floor = transmission_loss_db < 0;
  if (![transmission_loss_db, surface_mass_kgm2].every(Number.isFinite)) return { error: "Mass-law math is not a finite value." };
  return {
    transmission_loss_db, surface_mass_kgm2, below_floor,
    note: "The single-panel mass-law transmission loss, the partition-attenuation member the room-acoustics family (reverberation, levels, absorption) leaves out. A limp, non-rigid panel resists airborne sound in proportion to its mass per unit area and the frequency: TL = 20 log10(m f) - 47 dB for random (field) incidence, or - 42 for normal incidence, with m the surface mass in kg/m^2 (entered here in lb/ft^2 and converted at 1 lb/ft^2 = 4.88 kg/m^2) and f in Hz. The signature is +6 dB per doubling of either mass or frequency (the mass law), so heavier walls and higher pitches are attenuated more. A single layer of 1/2 in gypsum (~2 lb/ft^2) gives about 27 dB at 500 Hz. This is the idealized mass law only: it does NOT capture the coincidence (critical-frequency) dip where TL falls sharply, the stiffness-controlled low-frequency region, cavity/stud resonances, flanking, or leaks, and it is NOT the ASTM E413 Sound Transmission Class (STC), which is a single-number rating fit to the whole third-octave TL spectrum. Use it to compare bare single-leaf partitions and to see the mass and frequency trends; a lab-tested assembly rating and the acoustician govern.",
  };
}
export const massLawTLExample = { inputs: { surface_mass_psf: 2.0, frequency_hz: 500, incidence: "field" } };
const renderMassLawTL = _r({
  citation: "Citation: field-incidence limp-mass law TL = 20 log10(m f) - 47 dB (normal incidence - 42), m the surface mass in kg/m^2 and f in Hz; +6 dB per doubling of mass or frequency (first-principles panel acoustics, Bies & Hansen / FHWA highway-noise guidance). Surface mass entered in lb/ft^2, converted at 1 lb/ft^2 = 4.88243 kg/m^2. Idealized mass law only -- excludes the coincidence dip, stiffness region, and flanking, and is not the ASTM E413 STC rating; the acoustician governs.",
  example: massLawTLExample.inputs,
  fields: [
    { key: "surface_mass_psf", label: "Surface mass (lb/ft²; 1/2in gypsum ~2.0)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "frequency_hz", label: "Frequency (Hz)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "incidence", label: "Incidence", kind: "select", options: [{ value: "field", label: "Field / random (-47)" }, { value: "normal", label: "Normal (-42)" }] },
  ],
  outputs: [
    { key: "tl", id: "mltl-out-tl", label: "Transmission loss TL", value: (r) => fmt(r.transmission_loss_db, 1) + " dB" + (r.below_floor ? " (below the mass-law range at this m*f)" : "") },
    { key: "m", id: "mltl-out-m", label: "Surface mass", value: (r) => fmt(r.surface_mass_kgm2, 1) + " kg/m^2" },
    { key: "n", id: "mltl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMassLawTL,
});
STAGE_RENDERERS["partition-mass-law-tl"] = renderMassLawTL;

// spec-v1243: speed of sound in air vs temperature. time-alignment and ceiling-speaker-coverage
// assume a fixed ~1130 ft/s; this derives it from air temperature (a ~6% swing from freezing to a
// hot day, which shifts delay-tower timing). c = 331.3 sqrt(1 + T_C/273.15) m/s (dry air, from
// c = sqrt(gamma R T / M)); ft/s = m/s x 3.28084; propagation delay = 1000 / c_ftps ms per foot.
// First-principles kinetic theory / NIST. Humidity raises c slightly (a small second-order term, omitted).
// dims: in { temperature_f: T } out: { speed_ftps: L T^-1, speed_mps: L T^-1, delay_ms_per_ft: T L^-1 }
export function computeSpeedOfSoundAir({ temperature_f = 68 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tf = Number(temperature_f);
  if (!Number.isFinite(tf)) return { error: "Temperature must be a number (F)." };
  const tc = (tf - 32) / 1.8;
  if (!(tc > -273.15)) return { error: "Temperature must be above absolute zero (-459.67 F)." };
  const speed_mps = 331.3 * Math.sqrt(1 + tc / 273.15);
  const speed_ftps = speed_mps * 3.28084;
  const delay_ms_per_ft = 1000 / speed_ftps;
  if (![speed_mps, speed_ftps, delay_ms_per_ft].every(Number.isFinite)) return { error: "Speed-of-sound math is not a finite value." };
  return {
    speed_ftps, speed_mps, delay_ms_per_ft, temperature_c: tc,
    note: "The speed of sound in dry air from the temperature, c = 331.3 sqrt(1 + T_C/273.15) m/s (from c = sqrt(gamma R T / M) with gamma 1.4 and air's molar mass), converted to ft/s. It is the propagation speed the time-alignment and ceiling-speaker-coverage tiles assume as a fixed ~1130 ft/s -- but it swings about 6% from a freezing morning to a hot afternoon: 1,087 ft/s at 32 F, 1,126 ft/s at 68 F (the usual 1,130 rule of thumb), and 1,155 ft/s at 95 F. That shift matters for a delay tower: at a fixed distance the required delay is inversely proportional to c, so re-timing an outdoor system for the day's temperature keeps the arrivals aligned. The propagation delay is 1000 / c ms per foot (about 0.888 ms/ft at 68 F). This is dry air; humidity raises c slightly (a small second-order term) and altitude alone does not change it (temperature does). A first-principles aid; the measured system tuning governs.",
  };
}
export const speedOfSoundAirExample = { inputs: { temperature_f: 68 } };
const renderSpeedOfSoundAir = _r({
  citation: "Citation: speed of sound in dry air c = 331.3 sqrt(1 + T_C/273.15) m/s, from c = sqrt(gamma R T / M) (kinetic theory; NIST), converted to ft/s (x 3.28084); propagation delay = 1000/c ms per foot. 1,126 ft/s at 68 F, the ~1,130 ft/s rule of thumb. Dry air; humidity is a small second-order correction. A first-principles aid; the system tuning governs.",
  example: speedOfSoundAirExample.inputs,
  fields: [
    { key: "temperature_f", label: "Air temperature (°F)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "ft", id: "sos-out-ft", label: "Speed of sound", value: (r) => fmt(r.speed_ftps, 1) + " ft/s (" + fmt(r.speed_mps, 1) + " m/s)" },
    { key: "d", id: "sos-out-d", label: "Propagation delay", value: (r) => fmt(r.delay_ms_per_ft, 3) + " ms/ft" },
    { key: "n", id: "sos-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSpeedOfSoundAir,
});
STAGE_RENDERERS["speed-of-sound-air"] = renderSpeedOfSoundAir;

// --- spec-v664 N: absorption needed for a target RT60 (inverse of room-acoustics) ---
// dims: in { volume_ft3: L^3, target_rt60_s: T, existing_sabins: L^2, sabine_coeff: dimensionless } out: { required_sabins: L^2, additional_sabins: L^2 }
export function computeRoomAbsorptionTarget({ volume_ft3 = 0, target_rt60_s = 0, existing_sabins = 0, sabine_coeff = 0.049 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(volume_ft3) || 0;
  const rt = Number(target_rt60_s) || 0;
  const existing = Number(existing_sabins) || 0;
  const k = (sabine_coeff === undefined || sabine_coeff === null || sabine_coeff === "") ? 0.049 : Number(sabine_coeff);
  if (!(V > 0)) return { error: "Room volume must be positive (ft^3)." };
  if (!(rt > 0)) return { error: "Target RT60 must be positive (s)." };
  if (existing < 0) return { error: "Existing absorption cannot be negative (sabins)." };
  if (!(k > 0)) return { error: "Sabine coefficient must be positive." };
  const required_sabins = k * V / rt;
  const additional_sabins = Math.max(0, required_sabins - existing);
  return {
    required_sabins, additional_sabins, meets_already: existing >= required_sabins,
    note: "The total absorption (sabins) a room needs to hit a target RT60, the inverse of the Sabine RT60 = 0.049 x V / A relation: A_required = 0.049 x V / RT60_target. If you enter the room's current absorption, it also gives the additional treatment to ADD (required - existing, floored at zero). One sabin is one square foot of perfect absorption, so the added sabins convert to treated area by dividing by the material's absorption coefficient (a panel at coefficient 0.8 covers required/0.8 square feet). Speech wants a short RT60 (~0.4-0.8 s in a small room); music runs longer. This sizes the absorption; it does not move the axial room modes (geometry sets those - see room-acoustics) or place the treatment. The acoustician and the venue govern.",
  };
}
export const roomAbsorptionTargetExample = { inputs: { volume_ft3: 5000, target_rt60_s: 0.6, existing_sabins: 250, sabine_coeff: 0.049 } };
const renderRoomAbsorptionTarget = _r({
  citation: "Citation: Sabine reverberation equation solved for absorption A_required = 0.049 x V / RT60_target (W.C. Sabine, public domain; imperial 0.049 coefficient, editable), and the additional treatment = required - existing. One sabin = 1 ft^2 of perfect absorption. The acoustician and the venue govern treatment.",
  example: roomAbsorptionTargetExample.inputs,
  fields: [
    { key: "volume_ft3", label: "Room volume (ft³)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "target_rt60_s", label: "Target RT60 (s)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "existing_sabins", label: "Existing absorption (sabins, 0 = none)", kind: "number", default: 0, attrs: { step: "any", min: "0" } },
    { key: "sabine_coeff", label: "Sabine coefficient (default 0.049)", kind: "number", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "req", id: "rat-out-req", label: "Total absorption required", value: (r) => fmt(r.required_sabins, 0) + " sabins" },
    { key: "add", id: "rat-out-add", label: "Additional treatment to add", value: (r) => r.meets_already ? "0 sabins (the room already meets the target)" : fmt(r.additional_sabins, 0) + " sabins" },
    { key: "n", id: "rat-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRoomAbsorptionTarget,
});
STAGE_RENDERERS["room-absorption-target"] = renderRoomAbsorptionTarget;

// --- spec-v542 N: Counterweight fly-system balance (`counterweight-arbor-load`) ---
// required = (batten + load) x purchase_ratio (1 single, 2 double). out_of_weight = required - existing.
// dims: in { batten_weight_lb: M L T^-2, attached_load_lb: M L T^-2, purchase_type: dimensionless, brick_weight_lb: M L T^-2, existing_cw_lb: M L T^-2 } out: { required_cw_lb: M L T^-2, out_of_weight_lb: M L T^-2, bricks: dimensionless }
export function computeCounterweightArborLoad({ batten_weight_lb = 0, attached_load_lb = 0, purchase_type = "single", brick_weight_lb = 0, existing_cw_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const batten = Number(batten_weight_lb) || 0;
  const load = Number(attached_load_lb) || 0;
  const brick = Number(brick_weight_lb) || 0;
  const existing = Number(existing_cw_lb) || 0;
  if (batten < 0) return { error: "Batten weight must be non-negative (lb)." };
  if (load < 0) return { error: "Attached load must be non-negative (lb)." };
  if (existing < 0) return { error: "Existing counterweight must be non-negative (lb)." };
  if (!(brick > 0)) return { error: "Brick weight must be positive (lb)." };
  const purchase_ratio = purchase_type === "double" ? 2 : purchase_type === "single" ? 1 : null;
  if (purchase_ratio === null) return { error: "Purchase type must be single or double." };
  const required_cw_lb = (batten + load) * purchase_ratio;
  const out_of_weight_lb = required_cw_lb - existing;
  const bricks = Math.ceil(Math.abs(out_of_weight_lb) / brick);
  const action = out_of_weight_lb > 0 ? "add" : out_of_weight_lb < 0 ? "remove" : "balanced";
  return {
    required_cw_lb, out_of_weight_lb, bricks, purchase_ratio, action,
    note: "A double-purchase system needs two pounds of counterweight per pound on the batten (and the arbor travels half as far), so reversing the ratio lets the pipe run away. Load the arbor only when the batten is at the loading rail - an out-of-weight batten is the classic fly-rail hazard. Arbor capacity is finite. The venue rigging inspection and the AHJ govern.",
  };
}
export const counterweightArborLoadExample = { inputs: { batten_weight_lb: 100, attached_load_lb: 400, purchase_type: "single", brick_weight_lb: 30, existing_cw_lb: 200 } };
const renderCounterweightArborLoad = _r({
  citation: "Notice: Load the arbor only when the batten is at the loading rail; the venue rigging inspection and the AHJ govern. Citation: theatrical counterweight rigging (single/double purchase), by name. required = (batten + load) x purchase_ratio (1 single, 2 double); out_of_weight = required - existing; bricks = ceil(|out_of_weight| / brick_weight). A double-purchase arbor needs twice the counterweight and travels half the distance.",
  example: counterweightArborLoadExample.inputs,
  fields: [
    { key: "batten_weight_lb", label: "Batten pipe weight (lb)", kind: "number" },
    { key: "attached_load_lb", label: "Attached load (scenery / electrics, lb)", kind: "number" },
    { key: "purchase_type", label: "Purchase type", kind: "select", options: [{ value: "single", label: "Single purchase (1:1)" }, { value: "double", label: "Double purchase (2:1)" }] },
    { key: "brick_weight_lb", label: "Counterweight brick unit (lb)", kind: "number" },
    { key: "existing_cw_lb", label: "Counterweight already on arbor (lb)", kind: "number" },
  ],
  outputs: [
    { key: "req", id: "cwa-out-req", label: "Required counterweight", value: (r) => fmt(r.required_cw_lb, 0) + " lb (" + (r.purchase_ratio === 2 ? "double 2:1" : "single 1:1") + ")" },
    { key: "oow", id: "cwa-out-oow", label: "Out of weight", value: (r) => (r.action === "balanced" ? "balanced" : fmt(Math.abs(r.out_of_weight_lb), 0) + " lb " + (r.action === "add" ? "light - add" : "heavy - remove")) },
    { key: "b", id: "cwa-out-b", label: "Bricks to " + "add/remove", value: (r) => r.action === "balanced" ? "0" : fmt(r.bricks, 0) + " bricks to " + r.action },
    { key: "n", id: "cwa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCounterweightArborLoad,
});
STAGE_RENDERERS["counterweight-arbor-load"] = renderCounterweightArborLoad;

// --- spec-v543 N: LED tape PSU and voltage-drop run (`led-tape-run`) ---
// load = W/ft x ft. psu = load/(1-headroom). end_drop = current x (R/ft x ft) / 2.
// dims: in { power_per_ft_w: M L T^-3, run_length_ft: L, supply_voltage_v: M L^2 T^-3 I^-1, resistance_per_ft: dimensionless, headroom_pct: dimensionless, drop_tolerance_pct: dimensionless } out: { load_w: M L^2 T^-3, psu_w: M L^2 T^-3, end_voltage_v: M L^2 T^-3 I^-1 }
export function computeLedTapeRun({ power_per_ft_w = 0, run_length_ft = 0, supply_voltage_v = 0, resistance_per_ft = 0, headroom_pct = 20, drop_tolerance_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ppf = Number(power_per_ft_w) || 0;
  const len = Number(run_length_ft) || 0;
  const volt = Number(supply_voltage_v) || 0;
  const rpf = Number(resistance_per_ft) || 0;
  const head = Number(headroom_pct) || 0;
  const tol = Number(drop_tolerance_pct) || 0;
  if (!(ppf > 0)) return { error: "Power per foot must be positive (W/ft)." };
  if (!(len > 0)) return { error: "Run length must be positive (ft)." };
  if (!(volt > 0)) return { error: "Supply voltage must be positive (V)." };
  if (rpf < 0) return { error: "Resistance per foot must be non-negative." };
  if (!(head >= 0 && head < 100)) return { error: "Headroom percent must be between 0 and 100." };
  if (!(tol >= 0 && tol < 100)) return { error: "Drop tolerance percent must be between 0 and 100." };
  const load_w = ppf * len;
  const psu_w = load_w / (1 - head / 100);
  const current_a = load_w / volt;
  const end_drop_v = current_a * (rpf * len) / 2;
  const end_voltage_v = volt - end_drop_v;
  const drop_pct = end_drop_v / volt * 100;
  const too_long = drop_pct > tol;
  return {
    load_w, psu_w, current_a, end_drop_v, end_voltage_v, drop_pct, too_long,
    note: "A single end-fed run dims and color-shifts at the far end because the copper trace drops voltage (12 V strips typically wall out around 16-20 ft, 24 V roughly double). Oversizing the PSU does not fix the drop - power-inject or feed both ends instead. The drop uses the uniform-load approximation (half the full-current drop). The PSU wants about 20% headroom for inrush and lifespan. The strip datasheet governs.",
  };
}
export const ledTapeRunExample = { inputs: { power_per_ft_w: 4.4, run_length_ft: 16, supply_voltage_v: 12, resistance_per_ft: 0.05, headroom_pct: 20, drop_tolerance_pct: 10 } };
const renderLedTapeRun = _r({
  citation: "Notice: The strip datasheet governs; verify against the manufacturer's spec. Citation: constant-voltage LED strip loading and voltage drop, by name. load = power_per_ft x length; psu = load / (1 - headroom); current = load / voltage; end_drop = current x (resistance_per_ft x length) / 2; end_voltage = voltage - end_drop. A single end-fed run dims at the far end (12 V walls out ~16-20 ft, 24 V ~double); oversizing the PSU does not fix it - power-inject or feed both ends.",
  example: ledTapeRunExample.inputs,
  fields: [
    { key: "power_per_ft_w", label: "Strip power (W/ft)", kind: "number" },
    { key: "run_length_ft", label: "Run length (ft)", kind: "number" },
    { key: "supply_voltage_v", label: "Supply voltage (V, 12 / 24)", kind: "number" },
    { key: "resistance_per_ft", label: "Round-trip resistance (ohm/ft)", kind: "number" },
    { key: "headroom_pct", label: "PSU headroom (%)", kind: "number" },
    { key: "drop_tolerance_pct", label: "Acceptable end drop (%)", kind: "number" },
  ],
  outputs: [
    { key: "l", id: "ltr-out-l", label: "Total load / PSU size", value: (r) => fmt(r.load_w, 1) + " W (PSU >= " + fmt(r.psu_w, 0) + " W)" },
    { key: "e", id: "ltr-out-e", label: "End-of-run voltage", value: (r) => fmt(r.end_voltage_v, 2) + " V (drop " + fmt(r.drop_pct, 1) + "%)" },
    { key: "t", id: "ltr-out-t", label: "Run length verdict", value: (r) => r.too_long ? "TOO LONG - dims at the far end; feed both ends or power-inject" : "within tolerance" },
    { key: "n", id: "ltr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLedTapeRun,
});
STAGE_RENDERERS["led-tape-run"] = renderLedTapeRun;

// --- spec-v667 N: LED tape max run before the far end dims (inverse of led-tape-run) ---
// drop_pct = power_per_ft x resistance_per_ft x len^2 / (2 x voltage^2) x 100; solved for len at the tolerance.
// dims: in { power_per_ft_w: M L T^-3, supply_voltage_v: M L^2 T^-3 I^-1, resistance_per_ft: dimensionless, drop_tolerance_pct: dimensionless } out: { max_run_ft: L }
export function computeLedTapeMaxRun({ power_per_ft_w = 0, supply_voltage_v = 0, resistance_per_ft = 0, drop_tolerance_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ppf = Number(power_per_ft_w) || 0;
  const volt = Number(supply_voltage_v) || 0;
  const rpf = Number(resistance_per_ft) || 0;
  const tol = (drop_tolerance_pct === undefined || drop_tolerance_pct === null || drop_tolerance_pct === "") ? 10 : Number(drop_tolerance_pct);
  if (!(ppf > 0)) return { error: "Power per foot must be positive (W/ft)." };
  if (!(volt > 0)) return { error: "Supply voltage must be positive (V)." };
  if (!(rpf > 0)) return { error: "Round-trip resistance must be positive (ohm/ft); a zero-resistance strip has no far-end drop to bound the run." };
  if (!(tol > 0 && tol < 100)) return { error: "Drop tolerance percent must be between 0 and 100 (exclusive)." };
  // end_drop uses the uniform-load half-current approximation: drop_pct = ppf x rpf x len^2 / (2 x volt^2) x 100.
  // Solving for len at drop_pct = tol: len_max = volt x sqrt(2 x (tol/100) / (ppf x rpf)).
  const max_run_ft = volt * Math.sqrt(2 * (tol / 100) / (ppf * rpf));
  if (!Number.isFinite(max_run_ft)) return { error: "LED-tape run math is not a finite value." };
  return {
    max_run_ft,
    note: "The longest single end-fed run before the far end dims past the tolerance, the inverse of the led-tape-run tile: len_max = voltage x sqrt(2 x (tolerance/100) / (power_per_ft x resistance_per_ft)). A 12 V strip typically walls out around 16-20 ft, a 24 V strip roughly double (the run scales with the voltage). Oversizing the PSU does not extend it - power-inject or feed both ends instead. Uses the uniform-load approximation (half the full-current drop). The strip datasheet governs.",
  };
}
export const ledTapeMaxRunExample = { inputs: { power_per_ft_w: 4.4, supply_voltage_v: 12, resistance_per_ft: 0.05, drop_tolerance_pct: 10 } };
const renderLedTapeMaxRun = _r({
  citation: "Notice: The strip datasheet governs; verify against the manufacturer's spec. Citation: constant-voltage LED strip voltage drop solved for the run length. drop_pct = power_per_ft x resistance_per_ft x length^2 / (2 x voltage^2) x 100; len_max = voltage x sqrt(2 x (tolerance/100) / (power_per_ft x resistance_per_ft)). A 12 V strip walls out ~16-20 ft, 24 V ~double; oversizing the PSU does not extend it - power-inject or feed both ends.",
  example: ledTapeMaxRunExample.inputs,
  fields: [
    { key: "power_per_ft_w", label: "Strip power (W/ft)", kind: "number" },
    { key: "supply_voltage_v", label: "Supply voltage (V, 12 / 24)", kind: "number" },
    { key: "resistance_per_ft", label: "Round-trip resistance (ohm/ft)", kind: "number" },
    { key: "drop_tolerance_pct", label: "Acceptable end drop (%)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "ltmr-out-r", label: "Max single end-fed run", value: (r) => fmt(r.max_run_ft, 1) + " ft" },
    { key: "n", id: "ltmr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLedTapeMaxRun,
});
STAGE_RENDERERS["led-tape-max-run"] = renderLedTapeMaxRun;

// --- spec-v673 N: distance at which SPL falls to a target level (inverse of spl-distance) ---
// L2 = L1 - 20 log10(d2/d1) + mode_factor + 10 log10(n); solved for d2.
// dims: in { L1_dB: dimensionless, d1: L, target_L2_dB: dimensionless, mode: dimensionless, n_sources: dimensionless } out: { d2: L, delta_dB: dimensionless }
export function computeSPLDistanceForLevel({ L1_dB = 0, d1 = 1, target_L2_dB = 0, mode = "free_field", n_sources = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const m = SPL_MODES[mode];
  if (!m) return { error: "Unknown mode." };
  const ref = Number(d1) || 0;
  const n = Number(n_sources) || 0;
  if (!(ref > 0)) return { error: "Reference distance must be positive." };
  if (!(n >= 1)) return { error: "Number of sources must be at least 1." };
  // Inverse of L2 = L1 - 20 log10(d2/d1) + mode_factor + 10 log10(n):
  // d2 = d1 x 10^((L1 + mode_factor + 10 log10(n) - L2) / 20).
  const delta_dB = Number(L1_dB) + m.factor + 10 * Math.log10(n) - Number(target_L2_dB);
  if (!Number.isFinite(delta_dB)) return { error: "Distance math is not a finite value." };
  if (!(delta_dB > 0)) return { error: "Target level must be below the reference level (adjusted for mode and sources); a higher level is only reached closer than the reference distance." };
  const d2 = ref * Math.pow(10, delta_dB / 20);
  if (!Number.isFinite(d2) || !(d2 > 0)) return { error: "Distance math is not a finite positive value." };
  return {
    d2, delta_dB, mode_factor_dB: m.factor, n_sources: n,
    note: "The distance at which the sound pressure level falls to a target, the inverse of the spl-distance tile: from L2 = L1 - 20 log10(d2/d1) + mode_factor + 10 log10(N), d2 = d1 x 10^((L1 + mode_factor + 10 log10(N) - L2) / 20). Every doubling of distance drops the free-field level 6 dB. The target must be below the mode- and source-adjusted reference level (a louder target is only reached closer than the reference and is rejected). The mode factor approximates surface reinforcement and N is the count of identical incoherent sources (+3 dB per doubling). A planning estimate; the room and the measurement govern the real level.",
  };
}
export const splDistanceForLevelExample = { inputs: { L1_dB: 110, d1: 1, target_L2_dB: 84, mode: "free_field", n_sources: 1 } };
const renderSPLDistanceForLevel = _r({
  citation: "Citation: inverse-square law solved for distance: d2 = d1 x 10^((L1 + mode_factor + 10 log10(N) - L2) / 20), from L2 = L1 - 20 log10(d2/d1). Every doubling of distance drops the free-field level 6 dB. The mode factor approximates surface reinforcement. A planning estimate; the room and the measurement govern.",
  example: splDistanceForLevelExample.inputs,
  fields: [
    { key: "L1_dB", label: "SPL at reference (dB)", kind: "number" },
    { key: "d1", label: "Reference distance (ft)", kind: "number" },
    { key: "target_L2_dB", label: "Target SPL (dB)", kind: "number" },
    { key: "mode", label: "Mode", kind: "select", options: Object.keys(SPL_MODES).map((k) => ({ value: k, label: SPL_MODES[k].label })) },
    { key: "n_sources", label: "Identical sources", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "sdfl-out-d", label: "Distance for the target level", value: (r) => fmt(r.d2, 1) + " ft" },
    { key: "n", id: "sdfl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSPLDistanceForLevel,
});
STAGE_RENDERERS["spl-distance-for-level"] = renderSPLDistanceForLevel;

// --- spec-v676 N: throw distance for a target beam (pool) diameter (inverse of lighting-beam) ---
// beam_diameter = 2 x throw x tan(angle/2); solved for throw.
// dims: in { target_pool_diameter: L, beam_angle_deg: dimensionless, distance_unit: dimensionless } out: { throw_distance: L }
export function computeLightingThrowForPool({ target_pool_diameter = 0, beam_angle_deg = 0, distance_unit = "ft" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(target_pool_diameter) || 0;
  const ang = Number(beam_angle_deg) || 0;
  if (!(D > 0)) return { error: "Target pool diameter must be positive." };
  if (!(ang > 0) || !(ang < 180)) return { error: "Beam angle must be between 0 and 180 degrees." };
  const isFt = String(distance_unit) !== "m";
  const half = (ang / 2) * Math.PI / 180;
  // Inverse of D = 2 x throw x tan(angle/2): throw = D / (2 x tan(angle/2)).
  const throw_distance = D / (2 * Math.tan(half));
  if (!Number.isFinite(throw_distance) || !(throw_distance > 0)) return { error: "Throw-distance math is not a finite positive value." };
  return {
    throw_distance, distance_unit: isFt ? "ft" : "m",
    note: "The throw distance a fixture needs to cast a target beam (pool) diameter, the inverse of the lighting-beam tile: from D = 2 x throw x tan(beam angle / 2), throw = D / (2 x tan(beam angle / 2)), in the entered unit. A wider beam angle reaches the same pool from a shorter throw. This is the geometry only - the center-beam illuminance still falls off with the square of the throw, so a farther hang for a big pool is also a dimmer one (check the level with the lighting-beam tile). Enter the beam angle you are designing to (beam angle to 50% intensity, or the wider field angle to 10%). First-principles photometry; the fixture cut sheet governs."
  };
}
export const lightingThrowForPoolExample = { inputs: { target_pool_diameter: 10.58, beam_angle_deg: 20, distance_unit: "ft" } };
function renderLightingThrowForPool(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles theatrical photometry solved for throw: throw = D / (2 x tan(beam angle / 2)), from beam diameter = 2 x throw x tan(beam angle / 2); public domain. The illuminance still falls with the square of the throw (check the lighting-beam tile). A wider beam reaches the same pool from a shorter throw.";
  const dia = makeNumber("Target beam (pool) diameter", "ltp-dia", { step: "any", min: "0" });
  const ang = makeNumber("Beam angle (full cone, deg)", "ltp-ang", { step: "any", min: "0", max: "180" });
  const unit = makeSelect("Distance unit", "ltp-unit", [
    { value: "ft", label: "Feet" },
    { value: "m", label: "Metres" },
  ]);
  for (const f of [dia, ang, unit]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "10.58"; ang.input.value = "20"; unit.select.value = "ft"; update(); });
  const oT = makeOutputLine(outputRegion, "Throw distance needed", "ltp-out-t");
  const oNote = makeOutputLine(outputRegion, "Note", "ltp-out-n");
  const update = debounce(() => {
    const r = computeLightingThrowForPool({ target_pool_diameter: Number(dia.input.value) || 0, beam_angle_deg: Number(ang.input.value) || 0, distance_unit: unit.select.value });
    if (r.error) { oT.textContent = r.error; oNote.textContent = ""; return; }
    oT.textContent = fmt(r.throw_distance, 2) + " " + r.distance_unit;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [dia.input, ang.input]) el.addEventListener("input", update);
  unit.select.addEventListener("change", update);
}
STAGE_RENDERERS["lighting-throw-for-pool"] = renderLightingThrowForPool;

// --- spec-v785 N: winch drum fleet angle (`winch-fleet-angle`) ---
// fleet_angle = atan(lateral_offset / lead_distance), the angle the rope deviates
// from perpendicular as it wraps onto the drum from a fixed lead sheave.
// dims: in { lateral_offset: L, lead_distance: L } out: { fleet_angle_deg: dimensionless }
export function computeWinchFleetAngle({ lateral_offset = 0, lead_distance = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const offset = Number(lateral_offset) || 0;
  const lead = Number(lead_distance) || 0;
  if (offset < 0) return { error: "Lateral offset cannot be negative." };
  if (!(lead > 0)) return { error: "Lead distance must be positive." };
  const fleet_angle_deg = Math.atan(offset / lead) * 180 / Math.PI;
  if (!Number.isFinite(fleet_angle_deg)) return { error: "Fleet-angle math is not a finite value." };
  let status;
  if (fleet_angle_deg > 2) status = "over the 2 deg limit -- the rope will climb the flange or crush earlier wraps";
  else if (fleet_angle_deg > 1.5) status = "within the 2 deg smooth-drum guideline, but over the 1.5 deg grooved-drum guideline";
  else if (fleet_angle_deg < 0.5) status = "under about 0.5 deg -- so shallow the rope may not cross-wind and can pile up on a grooved drum";
  else status = "within the 1.5 deg grooved and 2 deg smooth-drum guidelines";
  return {
    fleet_angle_deg, status,
    note: "Fleet angle is the sideways angle the wire rope makes as it runs from a fixed lead sheave onto the moving drum: fleet_angle = atan(lateral_offset / lead_distance), where the lateral offset is the sideways distance from the sheave's groove plane to the point on the drum where the rope lands (largest at the drum ends) and the lead distance is the perpendicular distance from the drum to the sheave. Any consistent unit works because the ratio is dimensionless. The common industry guideline (Wire Rope Users Manual; ANSI E1.6 for entertainment rigging) keeps the fleet angle at or below 1.5 deg for a grooved drum and 2 deg for a smooth drum; too large and the rope crushes earlier wraps or climbs the flange, too small (under about 0.5 deg) and it will not cross-wind and can pile up. Lengthening the lead or centering the sheave lowers the angle. A design guideline, not a rating; the drum, rope, and equipment manufacturer govern.",
  };
}
export const winchFleetAngleExample = { inputs: { lateral_offset: 6, lead_distance: 240 } };
function renderWinchFleetAngle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: winch drum fleet angle (Wire Rope Users Manual; ANSI E1.6 entertainment rigging): fleet_angle = atan(lateral_offset / lead_distance). The lateral offset is the sideways distance from the lead sheave's groove plane to where the rope lands on the drum (largest at the drum ends); the lead distance is the perpendicular distance from drum to sheave; any consistent unit works. Keep at or below 1.5 deg (grooved) / 2 deg (smooth); under ~0.5 deg the rope may pile up. A guideline; the equipment manufacturer governs.";
  const offset = makeNumber("Lateral offset (sheave groove to rope landing)", "wfa-offset", { step: "any", min: "0" });
  const lead = makeNumber("Lead distance (drum to sheave, same unit)", "wfa-lead", { step: "any", min: "0" });
  for (const f of [offset, lead]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { offset.input.value = "6"; lead.input.value = "240"; update(); });
  const oA = makeOutputLine(outputRegion, "Fleet angle", "wfa-out-a");
  const oS = makeOutputLine(outputRegion, "Against the guideline", "wfa-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "wfa-out-n");
  const update = debounce(() => {
    const r = computeWinchFleetAngle({ lateral_offset: Number(offset.input.value) || 0, lead_distance: Number(lead.input.value) || 0 });
    if (r.error) { oA.textContent = r.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oA.textContent = fmt(r.fleet_angle_deg, 2) + " deg";
    oS.textContent = r.status;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [offset.input, lead.input]) el.addEventListener("input", update);
}
STAGE_RENDERERS["winch-fleet-angle"] = renderWinchFleetAngle;

// ===================== spec-v1003: potential / needed acoustic gain (feedback stability) =====================
// dims: in { args: dimensionless } out: { pag_db: dimensionless, nag_db: dimensionless, margin_db: dimensionless }
export function computeAcousticGainPagNag({ ds_ft = 2, d0_ft = 30, d1_ft = 8, d2_ft = 12, open_mics = 1, ead_ft = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ds_ft > 0)) return { error: "Talker-to-mic distance Ds must be positive (ft)." };
  if (!(d0_ft > 0)) return { error: "Talker-to-farthest-listener distance D0 must be positive (ft)." };
  if (!(d1_ft > 0)) return { error: "Loudspeaker-to-farthest-listener distance D1 must be positive (ft)." };
  if (!(d2_ft > 0)) return { error: "Loudspeaker-to-mic distance D2 must be positive (ft)." };
  if (!(open_mics >= 1)) return { error: "Number of open mics must be at least 1." };
  if (!(ead_ft > 0)) return { error: "Equivalent acoustic distance EAD must be positive (ft)." };
  const l = Math.log10;
  // PAG (with the 6 dB feedback-stability margin) and NAG; the system is workable when PAG >= NAG.
  const pag_db = 20 * l(d1_ft) + 20 * l(d0_ft) - 20 * l(ds_ft) - 20 * l(d2_ft) - 10 * l(open_mics) - 6;
  const nag_db = 20 * l(d0_ft / ead_ft);
  const margin_db = pag_db - nag_db;
  if (![pag_db, nag_db, margin_db].every(Number.isFinite)) return { error: "Acoustic-gain math is not a finite value." };
  const verdict = margin_db >= 0
    ? "OK: the potential gain meets or exceeds the needed gain -- the system can be loud enough before feedback."
    : "SHORT: the needed gain exceeds the potential gain -- move the mic closer to the talker, the speaker closer to the listeners, or reduce open mics, or it will feed back before it is loud enough.";
  return {
    pag_db,
    nag_db,
    margin_db,
    verdict,
    note: "The feedback-stability check for a sound-reinforcement system: whether it can be turned up loud enough (the needed acoustic gain, NAG) before it starts to ring (past the potential acoustic gain, PAG). PAG comes from the four critical distances by the inverse-square (20 log) law: 20 log D1 + 20 log D0 - 20 log Ds - 20 log D2 - 10 log(NOM) - 6, where Ds is talker-to-mic, D0 talker-to-farthest-listener, D1 loudspeaker-to-farthest-listener, D2 loudspeaker-to-mic, NOM the number of open mics (each doubling of open mics costs 3 dB), and the 6 dB is the feedback-stability margin below the ring point. NAG is how much gain the back row needs over hearing the talker unaided: 20 log (D0 / EAD), where EAD is the equivalent acoustic distance, the closest a listener would be for a comfortable unaided level. The system works when PAG is at least NAG. With Ds 2, D0 30, D1 8, D2 12 ft, one open mic, and a 6 ft EAD, PAG = 14.0 dB and NAG = 14.0 dB -- exactly balanced, the textbook marginal case. Moving the mic in to 1 ft from the talker raises PAG to 20 dB, a comfortable 6 dB of headroom. The levers are clear: get the MIC close to the talker (the biggest one), get the LOUDSPEAKER close to the listeners and away from the mic, and keep open mics to a minimum. A design screen; the real room acoustics, the mic and speaker directivity, and the system tuning govern actual stability.",
  };
}

export const acousticGainPagNagExample = { inputs: { ds_ft: 2, d0_ft: 30, d1_ft: 8, d2_ft: 12, open_mics: 1, ead_ft: 6 } };

function _v1003renderAcousticGainPagNag(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: potential / needed acoustic gain (PAG/NAG feedback stability; Davis & Patronis, Sound System Engineering; Yamaha Sound Reinforcement Handbook), by name. PAG = 20log(D1) + 20log(D0) - 20log(Ds) - 20log(D2) - 10log(NOM) - 6; NAG = 20log(D0/EAD); stable when PAG >= NAG. The room acoustics, mic/speaker directivity, and system tuning govern actual stability.";
  const ds = makeNumber("Ds: talker to mic (ft)", "agp-ds", { step: "any", min: "0" });
  const d0 = makeNumber("D0: talker to farthest listener (ft)", "agp-d0", { step: "any", min: "0" });
  const d1 = makeNumber("D1: speaker to farthest listener (ft)", "agp-d1", { step: "any", min: "0" });
  const d2 = makeNumber("D2: speaker to mic (ft)", "agp-d2", { step: "any", min: "0" });
  const nm = makeNumber("Number of open mics (NOM)", "agp-nm", { step: "1", min: "1" });
  const ea = makeNumber("EAD: equivalent acoustic distance (ft)", "agp-ea", { step: "any", min: "0" });
  for (const f of [ds, d0, d1, d2, nm, ea]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ds.input.value = "2"; d0.input.value = "30"; d1.input.value = "8"; d2.input.value = "12"; nm.input.value = "1"; ea.input.value = "6"; update(); });
  const oP = makeOutputLine(outputRegion, "PAG / NAG", "agp-out-p");
  const oM = makeOutputLine(outputRegion, "Margin", "agp-out-m");
  const oV = makeOutputLine(outputRegion, "Verdict", "agp-out-v");
  const update = debounce(() => {
    const r = computeAcousticGainPagNag({
      ds_ft: ds.input.value === "" ? 2 : Number(ds.input.value), d0_ft: d0.input.value === "" ? 30 : Number(d0.input.value),
      d1_ft: d1.input.value === "" ? 8 : Number(d1.input.value), d2_ft: d2.input.value === "" ? 12 : Number(d2.input.value),
      open_mics: nm.input.value === "" ? 1 : Number(nm.input.value), ead_ft: ea.input.value === "" ? 6 : Number(ea.input.value),
    });
    if (r.error) { oP.textContent = r.error; oM.textContent = "-"; oV.textContent = "-"; return; }
    oP.textContent = fmt(r.pag_db, 1) + " dB PAG / " + fmt(r.nag_db, 1) + " dB NAG";
    oM.textContent = fmt(r.margin_db, 1) + " dB";
    oV.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [ds, d0, d1, d2, nm, ea]) f.input.addEventListener("input", update);
}
STAGE_RENDERERS["acoustic-gain-pag-nag"] = _v1003renderAcousticGainPagNag;

// ===========================================================================
// spec-v1364..v1376: the 2026-08-26 trade-expansion Group N band.
// See specs/scope-trade-expansion.md. Thirteen tiles, no new dependency.
// ===========================================================================

// Speed of sound in dry air, ft/s, from the 1125 ft/s reference at 70 F scaled
// by the square root of absolute temperature (Rankine). Shared by the four
// acoustic tiles below; non-exported, so it adds no v14 derivation-corpus row.
const _speedOfSound = (temp_f) => 1125 * Math.sqrt((temp_f + 459.67) / 529.67);

// ===================== spec-v1364: line array vertical coverage and splay =====================
// dims: in { args: dimensionless } out: { coverage_deg: dimensionless, avg_splay_deg: dimensionless, level_taper_db: dimensionless }
export function computeLineArraySplay({ trim_height_ft = 0, ear_height_ft = 4, near_throw_ft = 0, far_throw_ft = 0, cabinets = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(trim_height_ft > 0)) return { error: "Trim height must be positive." };
  if (!(ear_height_ft >= 0)) return { error: "Ear height cannot be negative." };
  if (!(trim_height_ft > ear_height_ft)) return { error: "Trim height must be above the listener's ear height." };
  if (!(near_throw_ft > 0)) return { error: "Near throw must be positive." };
  if (!(far_throw_ft > near_throw_ft)) return { error: "Far throw must exceed the near throw." };
  if (!(cabinets >= 1)) return { error: "Cabinet count must be at least 1." };
  // The angle to cover is fixed by geometry, not by the boxes.
  const dh_ft = trim_height_ft - ear_height_ft;
  const angle_near_deg = Math.atan(dh_ft / near_throw_ft) * 180 / Math.PI;
  const angle_far_deg = Math.atan(dh_ft / far_throw_ft) * 180 / Math.PI;
  const coverage_deg = angle_near_deg - angle_far_deg;
  const avg_splay_deg = coverage_deg / cabinets;
  const level_taper_db = 20 * Math.log10(far_throw_ft / near_throw_ft);
  if (![dh_ft, angle_near_deg, angle_far_deg, coverage_deg, avg_splay_deg, level_taper_db].every(Number.isFinite)) return { error: "Line-array geometry is not a finite value." };
  return {
    angle_near_deg,
    angle_far_deg,
    coverage_deg,
    avg_splay_deg,
    level_taper_db,
    dh_ft,
    note: "The vertical angle a line array has to cover, the average splay per cabinet that covers it, and the level taper the splay pattern is being asked to recover. An array hung at a trim height must cover the angle between the down-tilt to the first row and the down-tilt to the last, and that angle is set by geometry rather than by the boxes: it is atan(drop / near throw) minus atan(drop / far throw), where the drop is the trim height above the listeners' ears. Dividing it by the cabinet count gives the average splay, which is the design starting point a manufacturer's prediction software then refines. The taper line explains why the splays are never actually equal: the last row is far more distant than the first, so it is much quieter by inverse square, and the array makes that up by aiming more of its energy at the far seats -- tight splays at the top where the boxes throw long, opening toward the bottom where they cover the near rows. An array trimmed at 26 ft over a seated audience with 4 ft ears, first row 25 ft and last row 150 ft, covers 41.3 down to 8.3 degrees, so 33.0 degrees across twelve cabinets is 2.75 degrees of average splay, against 20 log(150/25) = 15.6 dB of taper. Nearly sixteen decibels across thirty-three degrees is a lot of asymmetry to build in, and the top boxes will sit near the array's minimum splay while the bottom ones open to five or six. A design starting point; the manufacturer's prediction software and the array's mechanical splay limits govern the rig.",
  };
}

export const lineArraySplayExample = { inputs: { trim_height_ft: 26, ear_height_ft: 4, near_throw_ft: 25, far_throw_ft: 150, cabinets: 12 } };

STAGE_RENDERERS["line-array-splay"] = _r({
  citation: "Citation: line-array vertical coverage from the trim geometry, with the inverse-square (20 log) level taper between the near and far rows, by name. Coverage = atan(dh/near) - atan(dh/far); average splay = coverage / cabinets. A design starting point; the manufacturer's prediction software and the array's mechanical splay limits govern.",
  example: lineArraySplayExample.inputs,
  fields: [
    { key: "trim_height_ft", label: "Trim height to the top of the array (ft)", kind: "number" },
    { key: "ear_height_ft", label: "Listener ear height (ft)", kind: "number" },
    { key: "near_throw_ft", label: "Near throw, array to first row (ft)", kind: "number" },
    { key: "far_throw_ft", label: "Far throw, array to last row (ft)", kind: "number" },
    { key: "cabinets", label: "Number of cabinets", kind: "number" },
  ],
  outputs: [
    { key: "n", id: "lasp-out-n", label: "Down-tilt to the first row", value: (r) => fmt(r.angle_near_deg, 2) + " deg below horizontal" },
    { key: "f", id: "lasp-out-f", label: "Down-tilt to the last row", value: (r) => fmt(r.angle_far_deg, 2) + " deg below horizontal" },
    { key: "c", id: "lasp-out-c", label: "Total vertical coverage", value: (r) => fmt(r.coverage_deg, 2) + " deg" },
    { key: "s", id: "lasp-out-s", label: "Average splay per box", value: (r) => fmt(r.avg_splay_deg, 2) + " deg" },
    { key: "t", id: "lasp-out-t", label: "Near-to-far level taper", value: (r) => fmt(r.level_taper_db, 1) + " dB" },
    { key: "z", id: "lasp-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeLineArraySplay,
});

// ===================== spec-v1365: delay loudspeaker time and Haas offset =====================
// dims: in { args: dimensionless } out: { speed_ft_s: L T^-1, geometric_ms: T, set_delay_ms: T }
export function computeDelayTowerAlignment({ distance_ft = 0, temp_f = 70, haas_offset_ms = 15, compare_temp_f = 90 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(distance_ft > 0)) return { error: "Distance from the main array must be positive." };
  if (!(temp_f > -459.67)) return { error: "Air temperature must be above absolute zero." };
  if (!(compare_temp_f > -459.67)) return { error: "Comparison temperature must be above absolute zero." };
  if (!(haas_offset_ms >= 0)) return { error: "Haas offset cannot be negative." };
  // The speed of sound rises with the square root of ABSOLUTE temperature, so an
  // alignment set in the afternoon is wrong by showtime -- and the error grows with distance.
  const speed_ft_s = _speedOfSound(temp_f);
  const geometric_ms = distance_ft / speed_ft_s * 1000;
  const set_delay_ms = geometric_ms + haas_offset_ms;
  const compare_speed_ft_s = _speedOfSound(compare_temp_f);
  const compare_geometric_ms = distance_ft / compare_speed_ft_s * 1000;
  const drift_ms = compare_geometric_ms - geometric_ms;
  const haas_distance_ft = haas_offset_ms / 1000 * speed_ft_s;
  if (![speed_ft_s, geometric_ms, set_delay_ms, compare_geometric_ms, drift_ms, haas_distance_ft].every(Number.isFinite)) return { error: "Delay-alignment math is not a finite value." };
  return {
    speed_ft_s,
    geometric_ms,
    set_delay_ms,
    compare_speed_ft_s,
    compare_geometric_ms,
    drift_ms,
    haas_distance_ft,
    note: "The delay time to set on a delay tower or under-balcony loudspeaker, and how far that setting moves when the air temperature does. The geometric half is the easy half: sound from the main array reaches the delay position some milliseconds after the delay speaker could fire, and delaying the tower by that time puts the two arrivals on top of each other. But two coincident arrivals from two directions do not localize, so the audience hears the delay speaker sitting right above them and the show appears to come from the wrong place. The Haas offset is the fix: adding 10 to 20 milliseconds beyond the geometric time makes the main array arrive FIRST by a margin the ear reads as the source direction, while the delay speaker, arriving inside the precedence window, still adds level without being heard separately. Fifteen milliseconds is the common starting point. Temperature is the trap, because the speed of sound rises with the square root of absolute temperature: a tower 180 ft downfield aligned at 70 F takes 160.0 ms of geometric delay, and on a 90 F afternoon the air carries sound at 1146 ft/s instead of 1125 and the geometric time falls to 157.1 ms. Three milliseconds is small, but the same twenty-degree swing on a 400 ft throw is 6.5 ms, which is audible, and outdoor shows re-check delay times when the air moves. An alignment starting point; a measurement system and the system engineer's ears govern the final setting.",
  };
}

export const delayTowerAlignmentExample = { inputs: { distance_ft: 180, temp_f: 70, haas_offset_ms: 15, compare_temp_f: 90 } };

STAGE_RENDERERS["delay-tower-alignment"] = _r({
  citation: "Citation: delay-loudspeaker alignment time from the geometric propagation delay plus a Haas (precedence-effect) offset, with the speed of sound scaled as the square root of absolute temperature from 1125 ft/s at 70 F, by name. The precedence effect is Haas's published result, cited not reproduced. A measurement system and the system engineer govern the final setting.",
  example: delayTowerAlignmentExample.inputs,
  fields: [
    { key: "distance_ft", label: "Main array to delay position (ft)", kind: "number" },
    { key: "temp_f", label: "Air temperature (F)", kind: "number" },
    { key: "haas_offset_ms", label: "Haas offset (ms)", kind: "number" },
    { key: "compare_temp_f", label: "Comparison temperature (F)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "dtal-out-c", label: "Speed of sound at this temperature", value: (r) => fmt(r.speed_ft_s, 1) + " ft/s" },
    { key: "g", id: "dtal-out-g", label: "Geometric delay", value: (r) => fmt(r.geometric_ms, 1) + " ms" },
    { key: "s", id: "dtal-out-s", label: "Delay to set", value: (r) => fmt(r.set_delay_ms, 1) + " ms (Haas offset is worth " + fmt(r.haas_distance_ft, 1) + " ft of apparent distance)" },
    { key: "t", id: "dtal-out-t", label: "Geometric delay at the comparison temperature", value: (r) => fmt(r.compare_geometric_ms, 1) + " ms at " + fmt(r.compare_speed_ft_s, 1) + " ft/s" },
    { key: "d", id: "dtal-out-d", label: "Drift between the two temperatures", value: (r) => fmt(r.drift_ms, 2) + " ms" },
    { key: "z", id: "dtal-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeDelayTowerAlignment,
});

// ===================== spec-v1366: end-fire and cardioid subwoofer array spacing =====================
// dims: in { args: dimensionless } out: { delay_per_element_ms: T, optimum_freq_hz: T^-1, wavelength_ft: L }
export function computeCardioidSubArray({ spacing_ft = 0, elements = 4, temp_f = 70, target_freq_hz = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(spacing_ft > 0)) return { error: "Element spacing must be positive." };
  if (!(elements >= 2)) return { error: "An end-fire array needs at least 2 elements." };
  if (!(temp_f > -459.67)) return { error: "Air temperature must be above absolute zero." };
  if (!(target_freq_hz >= 0)) return { error: "Target rejection frequency cannot be negative." };
  // Rejection is deepest where the spacing is a QUARTER wavelength: that puts the rear
  // arrivals a half wavelength -- a full polarity flip -- apart.
  const speed_ft_s = _speedOfSound(temp_f);
  const delay_per_element_ms = spacing_ft / speed_ft_s * 1000;
  const optimum_freq_hz = speed_ft_s / (4 * spacing_ft);
  const wavelength_ft = speed_ft_s / optimum_freq_hz;
  const total_delay_ms = delay_per_element_ms * (elements - 1);
  const array_depth_ft = spacing_ft * (elements - 1);
  const spacing_for_target_ft = target_freq_hz > 0 ? speed_ft_s / (4 * target_freq_hz) : null;
  if (![delay_per_element_ms, optimum_freq_hz, wavelength_ft, total_delay_ms, array_depth_ft].every(Number.isFinite)) return { error: "End-fire array math is not a finite value." };
  if (spacing_for_target_ft !== null && !Number.isFinite(spacing_for_target_ft)) return { error: "End-fire array math is not a finite value." };
  return {
    delay_per_element_ms,
    optimum_freq_hz,
    wavelength_ft,
    total_delay_ms,
    array_depth_ft,
    spacing_for_target_ft,
    speed_ft_s,
    note: "The per-element delay for an end-fire subwoofer array and the frequency at which its rearward rejection is deepest. An end-fire array puts subwoofers in a line pointed at the audience and delays each one behind the one in front by exactly the time sound takes to travel the spacing. Forward, every cabinet's output arrives together and adds; backward, the electronic delay and the acoustic travel time add rather than cancel, so the rear arrivals spread out and the level collapses. The rejection is deepest where the spacing is a QUARTER wavelength, because that puts the rear arrivals a half wavelength -- a full polarity flip -- apart, which makes the optimum frequency the speed of sound divided by four times the spacing. That quarter-wave relationship is the whole design, and it also sets the band: an array tuned for deep rejection at 90 Hz is progressively less directional as frequency falls, and above roughly twice the tuning frequency the pattern breaks up. Adding elements deepens and broadens the rejection without moving where it is centered. Four cabinets on 3.0 ft centers at 70 F want 2.667 ms per element, with the deepest rejection at 1125 / 12 = 93.75 Hz, right in the kick-drum band, and a 12.0 ft wavelength there of which the spacing is one quarter. Moving the tuning down to 60 Hz opens the spacing to 4.69 ft, which puts over fourteen feet of stage depth behind four cabinets -- and that trade, stage depth against depth of rejection, is the real constraint. The reverse-stack cardioid variant works on the same arithmetic with the spacing set by cabinet depth rather than chosen. A design relation; a measurement system and the room govern the deployed result.",
  };
}

export const cardioidSubArrayExample = { inputs: { spacing_ft: 3.0, elements: 4, temp_f: 70, target_freq_hz: 60 } };

STAGE_RENDERERS["cardioid-sub-array"] = _r({
  citation: "Citation: end-fire and reverse-stack cardioid subwoofer arrays from the quarter-wavelength spacing relation, by name (standard live-sound system design practice; the quarter-wave rear-cancellation geometry is public acoustics). Delay per element = spacing / c; optimum rejection frequency = c / (4 x spacing). A measurement system and the room govern the deployed result.",
  example: cardioidSubArrayExample.inputs,
  fields: [
    { key: "spacing_ft", label: "Element spacing, front to back (ft)", kind: "number" },
    { key: "elements", label: "Number of elements", kind: "number" },
    { key: "temp_f", label: "Air temperature (F)", kind: "number" },
    { key: "target_freq_hz", label: "Target rejection frequency (Hz, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "csub-out-d", label: "Delay per element", value: (r) => fmt(r.delay_per_element_ms, 3) + " ms (last element " + fmt(r.total_delay_ms, 3) + " ms)" },
    { key: "f", id: "csub-out-f", label: "Deepest rejection at", value: (r) => fmt(r.optimum_freq_hz, 2) + " Hz" },
    { key: "w", id: "csub-out-w", label: "Wavelength there", value: (r) => fmt(r.wavelength_ft, 2) + " ft (the spacing is one quarter of it)" },
    { key: "p", id: "csub-out-p", label: "Array depth on deck", value: (r) => fmt(r.array_depth_ft, 2) + " ft" },
    { key: "s", id: "csub-out-s", label: "Spacing the target frequency would need", value: (r) => r.spacing_for_target_ft === null ? "-" : fmt(r.spacing_for_target_ft, 2) + " ft" },
    { key: "z", id: "csub-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeCardioidSubArray,
});

// ===================== spec-v1367: driver spacing, lobing, and crossover ceiling =====================
// dims: in { args: dimensionless } out: { crossover_ceiling_hz: T^-1, wavelength_ft: L, max_spacing_ft: L }
export function computeDriverSpacingLobing({ spacing_ft = 0, test_freq_hz = 0, temp_f = 70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(spacing_ft > 0)) return { error: "Center-to-center spacing must be positive." };
  if (!(test_freq_hz > 0)) return { error: "Crossover or test frequency must be positive." };
  if (!(temp_f > -459.67)) return { error: "Air temperature must be above absolute zero." };
  // No null can exist anywhere below c / (2 x spacing), because even the worst-case path
  // difference -- the full spacing, 90 degrees off axis -- is under half a wavelength.
  const speed_ft_s = _speedOfSound(temp_f);
  const crossover_ceiling_hz = speed_ft_s / (2 * spacing_ft);
  const wavelength_ft = speed_ft_s / test_freq_hz;
  const ratio = speed_ft_s / (2 * spacing_ft * test_freq_hz);
  const null_angle_deg = ratio <= 1 ? Math.asin(ratio) * 180 / Math.PI : null;
  const max_spacing_ft = speed_ft_s / (2 * test_freq_hz);
  const verdict = null_angle_deg === null
    ? "clean: no null exists anywhere at this frequency, and the pair behaves as one source"
    : "a null sits " + fmt(null_angle_deg, 1) + " deg off axis at this frequency, and it moves with frequency as the audience walks past it";
  if (![crossover_ceiling_hz, wavelength_ft, ratio, max_spacing_ft].every(Number.isFinite)) return { error: "Driver-spacing math is not a finite value." };
  return {
    crossover_ceiling_hz,
    wavelength_ft,
    null_angle_deg,
    max_spacing_ft,
    verdict,
    speed_ft_s,
    note: "The highest frequency two sources on a given center-to-center spacing can share before the pattern acquires a null, and where that null sits when they are crossed above it. Two sources radiating the same signal are in phase everywhere on their perpendicular bisector and progressively out of phase off it, because the path lengths differ by the spacing times the sine of the off-axis angle. When that path difference reaches half a wavelength they cancel. Below the frequency at which even the WORST case -- the full spacing, at 90 degrees off axis -- is under half a wavelength, no null can exist anywhere and the pair behaves as one source, which puts the crossover ceiling at the speed of sound divided by twice the spacing. Cross two drivers below it and the array is coherent through the crossover region; cross above it and a null sits in the pattern at the crossover, moving with frequency, audible as the audience walks past it. Two 15 in woofers on 18 in centers at 70 F have a ceiling of 1125 / 3 = 375 Hz: crossed at 250 Hz the ratio exceeds one and there is no null anywhere, while crossed at 500 Hz the ratio is 0.75 and the null lands 48.6 degrees off axis. Run it backward and keeping 500 Hz clean would need the spacing in to 1.13 ft, about thirteen and a half inches center to center, which two 15 in drivers physically cannot do -- which is why large-format two-way boxes cross low, and why the spacing constraint is a cabinet design decision long before it is a system tuning one. The same arithmetic answers how far apart two subwoofers can be spread before the center of the room gets a hole. A geometric screen; measured polar data governs a real cabinet.",
  };
}

export const driverSpacingLobingExample = { inputs: { spacing_ft: 1.5, test_freq_hz: 500, temp_f: 70 } };

STAGE_RENDERERS["driver-spacing-lobing"] = _r({
  citation: "Citation: two-source interference geometry -- path difference = spacing x sin(angle), first null at half a wavelength -- giving the crossover ceiling c / (2 x spacing), by name. Public acoustics, standard in the loudspeaker-design literature. Measured polar data for the real cabinet governs.",
  example: driverSpacingLobingExample.inputs,
  fields: [
    { key: "spacing_ft", label: "Center-to-center spacing (ft)", kind: "number" },
    { key: "test_freq_hz", label: "Crossover or test frequency (Hz)", kind: "number" },
    { key: "temp_f", label: "Air temperature (F)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "dslo-out-c", label: "Crossover ceiling", value: (r) => fmt(r.crossover_ceiling_hz, 1) + " Hz" },
    { key: "v", id: "dslo-out-v", label: "At the test frequency", value: (r) => r.verdict },
    { key: "w", id: "dslo-out-w", label: "Wavelength at the test frequency", value: (r) => fmt(r.wavelength_ft, 3) + " ft" },
    { key: "m", id: "dslo-out-m", label: "Maximum spacing that keeps the test frequency clean", value: (r) => fmt(r.max_spacing_ft, 3) + " ft (" + fmt(r.max_spacing_ft * 12, 1) + " in)" },
    { key: "z", id: "dslo-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeDriverSpacingLobing,
});

// ===================== spec-v1368: two-transmitter intermodulation screen =====================
// dims: in { args: dimensionless } out: { spacing_mhz: T^-1, third_low_mhz: T^-1, third_high_mhz: T^-1 }
export function computeWirelessIntermod({ f1_mhz = 0, f2_mhz = 0, test_freq_mhz = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(f1_mhz > 0) || !(f2_mhz > 0)) return { error: "Both carrier frequencies must be positive." };
  if (f1_mhz === f2_mhz) return { error: "The two carriers must be on different frequencies." };
  if (!(test_freq_mhz >= 0)) return { error: "Test frequency cannot be negative." };
  // An evenly spaced channel plan is the WORST possible plan: the third-order product of
  // one pair lands exactly on the next channel.
  const lo = Math.min(f1_mhz, f2_mhz);
  const hi = Math.max(f1_mhz, f2_mhz);
  const spacing_mhz = hi - lo;
  const third_low_mhz = 2 * lo - hi;
  const third_high_mhz = 2 * hi - lo;
  const fifth_low_mhz = 3 * lo - 2 * hi;
  const fifth_high_mhz = 3 * hi - 2 * lo;
  const products = [third_low_mhz, third_high_mhz, fifth_low_mhz, fifth_high_mhz];
  let nearest_product_mhz = null;
  let test_margin_mhz = null;
  if (test_freq_mhz > 0) {
    nearest_product_mhz = products.reduce((a, b) => (Math.abs(b - test_freq_mhz) < Math.abs(a - test_freq_mhz) ? b : a));
    test_margin_mhz = Math.abs(nearest_product_mhz - test_freq_mhz);
  }
  if (!products.every(Number.isFinite) || !Number.isFinite(spacing_mhz)) return { error: "Intermodulation math is not a finite value." };
  return {
    spacing_mhz,
    third_low_mhz,
    third_high_mhz,
    fifth_low_mhz,
    fifth_high_mhz,
    nearest_product_mhz,
    test_margin_mhz,
    note: "Where two wireless transmitters put their intermodulation products, and how close a third channel sits to one. When two transmitters are near enough for one's signal to reach the other's output stage, or for both to hit a shared receiver front end, the nonlinearity mixes them and the products land at predictable frequencies. The third-order pair lands one full spacing outside each carrier, so two transmitters 3 MHz apart put products 3 MHz below the lower and 3 MHz above the upper; the fifth-order pair lands two spacings out, weaker but still able to take down a channel. The practical consequence is that an evenly spaced channel plan is the worst possible plan. Carriers at 542.000 and 545.000 MHz are 3.000 MHz apart and produce third-order products at 539.000 and 548.000 and fifth-order products at 536.000 and 551.000, so a third channel at 539.000 -- which looks like a perfectly reasonable 3 MHz step down -- sits directly on a product and is unusable whenever both other transmitters are on. Moving it to 540.100 clears every product in the list by at least a megahertz. Note also that an evenly spaced five-channel plan on 3 MHz steps collides with itself at both ends. Coordination software solves the whole set at once; this solves the pair, which is what a tech in a room needs when one channel out of twelve is dropping and the rest are fine. A screen, not a coordination: the FCC rules for the band, the licensed users in the market, and full coordination software govern a real channel plan.",
  };
}

export const wirelessIntermodExample = { inputs: { f1_mhz: 542.0, f2_mhz: 545.0, test_freq_mhz: 539.0 } };

STAGE_RENDERERS["wireless-intermod"] = _r({
  citation: "Citation: third- and fifth-order two-tone intermodulation products (2f1-f2, 2f2-f1, 3f1-2f2, 3f2-2f1), by name -- public RF theory, and the frequency-coordination practice published by the wireless-microphone manufacturers. A pair screen, not a coordination; the FCC rules for the band, the licensed users in the market, and full coordination software govern a real channel plan.",
  example: wirelessIntermodExample.inputs,
  fields: [
    { key: "f1_mhz", label: "Carrier 1 (MHz)", kind: "number" },
    { key: "f2_mhz", label: "Carrier 2 (MHz)", kind: "number" },
    { key: "test_freq_mhz", label: "Third channel to test (MHz, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "wint-out-s", label: "Carrier spacing", value: (r) => fmt(r.spacing_mhz, 3) + " MHz" },
    { key: "t", id: "wint-out-t", label: "Third-order products", value: (r) => fmt(r.third_low_mhz, 3) + " MHz and " + fmt(r.third_high_mhz, 3) + " MHz" },
    { key: "f", id: "wint-out-f", label: "Fifth-order products", value: (r) => fmt(r.fifth_low_mhz, 3) + " MHz and " + fmt(r.fifth_high_mhz, 3) + " MHz" },
    { key: "m", id: "wint-out-m", label: "Test channel against the nearest product", value: (r) => r.test_margin_mhz === null ? "-" : fmt(r.test_margin_mhz, 3) + " MHz clear of " + fmt(r.nearest_product_mhz, 3) + " MHz" },
    { key: "z", id: "wint-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeWirelessIntermod,
});

// ===================== spec-v1369: RF antenna cable loss and amplifier budget =====================
// dims: in { args: dimensionless } out: { cable_loss_db: dimensionless, total_loss_db: dimensionless, net_gain_db: dimensionless }
export function computeRfAntennaCableLoss({ length_ft = 0, loss_per_100ft_db = 0, connectors = 0, loss_per_connector_db = 0.25, splitter_loss_db = 0, amplifier_gain_db = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(length_ft > 0)) return { error: "Cable length must be positive." };
  if (!(loss_per_100ft_db > 0)) return { error: "Loss per 100 ft must be positive." };
  if (!(connectors >= 0)) return { error: "Connector count cannot be negative." };
  if (!(loss_per_connector_db >= 0)) return { error: "Per-connector loss cannot be negative." };
  if (!(splitter_loss_db >= 0)) return { error: "Splitter insertion loss cannot be negative." };
  if (!(amplifier_gain_db >= 0)) return { error: "Amplifier gain cannot be negative." };
  // The target is UNITY gain, not maximum gain: an amplifier replaces the cable's loss.
  const cable_loss_db = length_ft / 100 * loss_per_100ft_db;
  const connector_loss_db = connectors * loss_per_connector_db;
  const total_loss_db = cable_loss_db + connector_loss_db + splitter_loss_db;
  const net_gain_db = amplifier_gain_db - total_loss_db;
  const verdict = net_gain_db > 3
    ? "OVER unity: the receiver front end is being pushed toward overload and intermodulation, and the symptom looks exactly like a weak signal"
    : net_gain_db < -3
      ? "UNDER unity: every decibel short of unity comes straight off the system's range"
      : "at unity (within the -3 to +3 dB window): the amplifier is replacing the cable's loss rather than exceeding it";
  if (![cable_loss_db, connector_loss_db, total_loss_db, net_gain_db].every(Number.isFinite)) return { error: "RF budget math is not a finite value." };
  return {
    cable_loss_db,
    connector_loss_db,
    total_loss_db,
    net_gain_db,
    verdict,
    note: "The loss between a wireless antenna and its receiver, and whether the inline amplifier makes it up or overshoots. Coax loss is quoted per hundred feet at a stated frequency and rises with frequency, so a run that is fine for a 200 MHz intercom is lossy for a 600 MHz microphone. Every decibel lost between the antenna and the receiver comes straight off the system's range and cannot be recovered downstream, because an amplifier at the receiver end amplifies the noise the cable added along with the signal. The target is UNITY gain, not maximum gain: an inline amplifier is there to replace the cable's loss, not to exceed it, and a net meaningfully above zero pushes the receiver front end toward overload and intermodulation, whose symptom looks exactly like a weak signal. Aim for a net between about -3 and +3 dB, and put the amplifier at the antenna end where it amplifies signal before the cable degrades it. A 150 ft run on RG-8X-class coax at 600 MHz, about 8.8 dB per 100 ft, loses 13.2 dB, so a 12 dB inline amplifier lands at -1.2 dB net and the system will work. Change one thing -- the same 150 ft on LMR-400-class coax at about 3.9 dB per 100 ft -- and the loss is 5.85 dB, close enough to unity that no amplifier is needed at all and there is one less active device in the path. Better cable is almost always the better answer. A budget estimate; the cable manufacturer's published loss at the operating frequency and a measured RF level govern.",
  };
}

export const rfAntennaCableLossExample = { inputs: { length_ft: 150, loss_per_100ft_db: 8.8, connectors: 0, loss_per_connector_db: 0.25, splitter_loss_db: 0, amplifier_gain_db: 12 } };

STAGE_RENDERERS["rf-antenna-cable-loss"] = _r({
  citation: "Citation: RF antenna feedline budget from the cable manufacturer's published loss per 100 ft at the operating frequency, plus connector and splitter insertion loss, against inline amplifier gain, by name. The unity-gain target (net between about -3 and +3 dB) is the wireless-microphone manufacturers' published antenna-distribution practice. A measured RF level governs.",
  example: rfAntennaCableLossExample.inputs,
  fields: [
    { key: "length_ft", label: "Cable length (ft)", kind: "number" },
    { key: "loss_per_100ft_db", label: "Cable loss per 100 ft at the operating frequency (dB)", kind: "number" },
    { key: "connectors", label: "Number of connectors", kind: "number" },
    { key: "loss_per_connector_db", label: "Loss per connector (dB)", kind: "number" },
    { key: "splitter_loss_db", label: "Splitter or distribution insertion loss (dB)", kind: "number" },
    { key: "amplifier_gain_db", label: "Inline amplifier gain (dB)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "rfcl-out-c", label: "Cable loss", value: (r) => fmt(r.cable_loss_db, 2) + " dB" },
    { key: "t", id: "rfcl-out-t", label: "Total system loss", value: (r) => fmt(r.total_loss_db, 2) + " dB" },
    { key: "n", id: "rfcl-out-n", label: "Net gain", value: (r) => fmt(r.net_gain_db, 2) + " dB" },
    { key: "v", id: "rfcl-out-v", label: "Against unity", value: (r) => r.verdict },
    { key: "z", id: "rfcl-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeRfAntennaCableLoss,
});

// ===================== spec-v1370: chain hoist lift time, power, and duty cycle =====================
// dims: in { args: dimensionless } out: { lift_time_min: T, hoisting_hp: dimensionless, allowed_on_time_min: T, lifts_per_period: dimensionless }
export function computeChainHoistLiftTime({ lift_height_ft = 0, hoist_speed_fpm = 16, load_lb = 0, duty_cycle = 0.4, rating_period_min = 10, hoists = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lift_height_ft > 0)) return { error: "Lift height must be positive." };
  if (!(hoist_speed_fpm > 0)) return { error: "Hoist speed must be positive." };
  if (!(load_lb > 0)) return { error: "Load must be positive." };
  if (!(duty_cycle > 0 && duty_cycle <= 1)) return { error: "Duty-cycle fraction must be between 0 and 1." };
  if (!(rating_period_min > 0)) return { error: "Rating period must be positive." };
  if (!(hoists >= 1)) return { error: "Hoist count must be at least 1." };
  // An electric chain hoist is rated for INTERMITTENT duty. On a long trim one
  // full-height lift can consume most of the allowed on-time by itself.
  const lift_time_min = lift_height_ft / hoist_speed_fpm;
  const hoisting_hp = load_lb * hoist_speed_fpm / 33000;
  const set_hp = hoisting_hp * hoists;
  const allowed_on_time_min = duty_cycle * rating_period_min;
  const lifts_per_period = allowed_on_time_min / lift_time_min;
  const verdict = lifts_per_period >= 2
    ? "room to spare: the rating allows more than two full lifts per period"
    : lifts_per_period >= 1
      ? "one lift per period and no margin: a rig that has to come in and out twice inside the period is asking the motor for more than its rating"
      : "over the rating: a single full-height lift exceeds the allowed on-time, so the motor cannot make the trim in one press without exceeding its duty cycle";
  if (![lift_time_min, hoisting_hp, set_hp, allowed_on_time_min, lifts_per_period].every(Number.isFinite)) return { error: "Chain-hoist duty math is not a finite value." };
  return {
    lift_time_min,
    hoisting_hp,
    set_hp,
    allowed_on_time_min,
    lifts_per_period,
    verdict,
    note: "How long a chain hoist takes to make its trim, how much power it draws doing it, and how many times the rating allows that inside one period. The first line is the schedule, and it is the one nobody estimates correctly by eye: a hundred trusses that each take four minutes to fly is nearly seven hours of hoist time, and hoist speed varies by an order of magnitude across the hoists on a truck -- 16 ft/min for a standard motor, 32 or 64 for a high-speed one. The duty-cycle lines are the ones that surprise people. An electric chain hoist is rated for INTERMITTENT duty, and a common rating allows the motor to run 40% of a ten-minute period, four minutes on and six minutes off. Run it harder and the motor overheats, and the failure is not graceful. A one-ton hoist at 16 ft/min taking a 2,000 lb load up a 60 ft trim needs 60 / 16 = 3.75 min, draws 2,000 x 16 / 33,000 = 0.97 hoisting horsepower, and against a 40% duty over ten minutes has 4.0 minutes of allowed on-time -- 1.07 lifts per period, one lift and no margin. A show that needs the same rig in and out twice in a ten-minute window is asking the motor for more than its rating, and the answer is a faster hoist or a shorter trim, not a longer button press. Note that the hoisting horsepower is under one: chain hoist motors are small, and the number that sizes the distro is the INRUSH, not this steady figure. A planning screen; the hoist manufacturer's duty rating and load chart, ANSI E1.6, and the venue's qualified rigger govern.",
  };
}

export const chainHoistLiftTimeExample = { inputs: { lift_height_ft: 60, hoist_speed_fpm: 16, load_lb: 2000, duty_cycle: 0.40, rating_period_min: 10, hoists: 8 } };

STAGE_RENDERERS["chain-hoist-lift-time"] = _r({
  citation: "Citation: chain-hoist lift time from height and rated speed, hoisting horsepower from load x speed / 33,000, and the intermittent-duty on-time from the motor's rated duty cycle over its rating period, by name. Duty ratings and load charts are the hoist manufacturer's; ANSI E1.6 entertainment hoist standards and the venue's qualified rigger govern. The distro is sized on inrush, not on this steady figure.",
  example: chainHoistLiftTimeExample.inputs,
  fields: [
    { key: "lift_height_ft", label: "Lift height / trim (ft)", kind: "number" },
    { key: "hoist_speed_fpm", label: "Hoist speed (ft/min)", kind: "number" },
    { key: "load_lb", label: "Load per hoist (lb)", kind: "number" },
    { key: "duty_cycle", label: "Duty-cycle fraction (0.40 = 40%)", kind: "number" },
    { key: "rating_period_min", label: "Rating period (min)", kind: "number" },
    { key: "hoists", label: "Number of hoists", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "chlt-out-t", label: "Lift time", value: (r) => fmt(r.lift_time_min, 2) + " min" },
    { key: "p", id: "chlt-out-p", label: "Hoisting horsepower", value: (r) => fmt(r.hoisting_hp, 2) + " hp each (" + fmt(r.set_hp, 2) + " hp for the set)" },
    { key: "o", id: "chlt-out-o", label: "Allowed on-time per period", value: (r) => fmt(r.allowed_on_time_min, 2) + " min" },
    { key: "l", id: "chlt-out-l", label: "Full lifts per period", value: (r) => fmt(r.lifts_per_period, 2) },
    { key: "v", id: "chlt-out-v", label: "Against the duty rating", value: (r) => r.verdict },
    { key: "z", id: "chlt-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeChainHoistLiftTime,
});

// ===================== spec-v1371: gobo projected image size and keystone =====================
// dims: in { args: dimensionless } out: { image_diameter_ft: L, keystone_stretch: dimensionless, stretched_axis_ft: L, relative_illuminance: dimensionless }
export function computeGoboImageSize({ throw_ft = 0, field_angle_deg = 0, incidence_deg = 0, gobo_image_mm = 0, gate_diameter_mm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(throw_ft > 0)) return { error: "Throw distance must be positive." };
  if (!(field_angle_deg > 0 && field_angle_deg < 180)) return { error: "Field angle must be between 0 and 180 degrees." };
  if (!(incidence_deg >= 0 && incidence_deg < 90)) return { error: "Incidence angle must be at least 0 and below 90 degrees." };
  if (!(gobo_image_mm >= 0 && gate_diameter_mm >= 0)) return { error: "Gobo image and gate diameters cannot be negative." };
  if (gobo_image_mm > 0 && gate_diameter_mm > 0 && gobo_image_mm > gate_diameter_mm) return { error: "The gobo's usable image cannot be larger than the gate." };
  // The image is the field-angle cone intersected with the surface. Off perpendicular the
  // circle becomes an ellipse: one axis stretches by 1/cos, the other does not stretch at all.
  const image_diameter_ft = 2 * throw_ft * Math.tan(field_angle_deg / 2 * Math.PI / 180);
  const keystone_stretch = 1 / Math.cos(incidence_deg * Math.PI / 180);
  const stretched_axis_ft = image_diameter_ft * keystone_stretch;
  const relative_illuminance = Math.cos(incidence_deg * Math.PI / 180);
  const stops_down = -Math.log2(relative_illuminance);
  const frame_fraction = (gobo_image_mm > 0 && gate_diameter_mm > 0) ? gobo_image_mm / gate_diameter_mm : null;
  const framed_diameter_ft = frame_fraction === null ? null : image_diameter_ft * frame_fraction;
  if (![image_diameter_ft, keystone_stretch, stretched_axis_ft, relative_illuminance, stops_down].every(Number.isFinite)) return { error: "Gobo projection math is not a finite value." };
  return {
    image_diameter_ft,
    keystone_stretch,
    stretched_axis_ft,
    relative_illuminance,
    stops_down,
    framed_diameter_ft,
    note: "The size a gobo image projects to, how much a non-perpendicular hit stretches it, and what that costs in brightness. A gobo fills the fixture's field, so the projected image is the field-angle cone intersected with the surface: straight on, a circle whose diameter is twice the throw times the tangent of half the field angle, the same geometry as the beam pool applied to the image rather than the light. Off perpendicular that circle becomes an ellipse. The axis in the plane of the tilt stretches by one over the cosine of the incidence angle while the perpendicular axis does not stretch at all, which is what makes a projected logo look like a trapezoid: at 45 degrees the stretch is 1.41, and at 60 degrees it is 2.00, so the image is twice as long as it is wide. The same cosine works against you on brightness, because the light is spread over more area and illuminance falls by the cosine of the same angle. A 36-degree ellipsoidal at a 30 ft throw makes a 19.5 ft circle straight on; hang it 45 degrees off perpendicular onto a back wall, an ordinary front-of-house angle, and the long axis goes to 27.6 ft while illuminance falls to 0.71, half a stop down. A logo that reads 19.5 ft wide straight on becomes 27.6 ft tall and noticeably dimmer, and it needs optical keystone correction, a distorted gobo cut to compensate, or a better hanging position -- and the case for the better position is worth making before the gobo is ordered. When the gobo's usable image is smaller than the gate, the projection scales by that fraction. A geometric estimate; the fixture's published field angle and a focus check in the room govern.",
  };
}

export const goboImageSizeExample = { inputs: { throw_ft: 30, field_angle_deg: 36, incidence_deg: 45, gobo_image_mm: 0, gate_diameter_mm: 0 } };

STAGE_RENDERERS["gobo-image-size"] = _r({
  citation: "Citation: gobo image size from the field-angle cone (diameter = 2 x throw x tan(field/2)) with the 1/cos keystone stretch and cos illuminance falloff for a non-perpendicular hit, by name. Public projection geometry. The fixture's published field angle and a focus check in the room govern.",
  example: goboImageSizeExample.inputs,
  fields: [
    { key: "throw_ft", label: "Throw distance (ft)", kind: "number" },
    { key: "field_angle_deg", label: "Fixture field angle (deg)", kind: "number" },
    { key: "incidence_deg", label: "Incidence angle off perpendicular (deg)", kind: "number" },
    { key: "gobo_image_mm", label: "Gobo usable image diameter (mm, 0 to skip)", kind: "number" },
    { key: "gate_diameter_mm", label: "Fixture gate diameter (mm, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "gobo-out-d", label: "Perpendicular image diameter", value: (r) => fmt(r.image_diameter_ft, 2) + " ft" },
    { key: "k", id: "gobo-out-k", label: "Keystone stretch", value: (r) => fmt(r.keystone_stretch, 3) + " x" },
    { key: "s", id: "gobo-out-s", label: "Stretched axis", value: (r) => fmt(r.stretched_axis_ft, 2) + " ft" },
    { key: "i", id: "gobo-out-i", label: "Relative illuminance", value: (r) => fmt(r.relative_illuminance, 3) + " (" + fmt(r.stops_down, 2) + " stops down)" },
    { key: "p", id: "gobo-out-p", label: "Partial-frame image diameter", value: (r) => r.framed_diameter_ft === null ? "-" : fmt(r.framed_diameter_ft, 2) + " ft" },
    { key: "z", id: "gobo-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeGoboImageSize,
});

// ===================== spec-v1372: color-temperature correction in mireds =====================
// The standard correction sheets, as mired shifts. Negative is blue (raises color
// temperature), positive is orange (lowers it).
export const MIRED_CORRECTIONS = [
  { name: "Full CTB", shift: -131 },
  { name: "Half CTB", shift: -68 },
  { name: "Quarter CTB", shift: -30 },
  { name: "Eighth CTB", shift: -12 },
  { name: "Eighth CTO", shift: 12 },
  { name: "Quarter CTO", shift: 30 },
  { name: "Half CTO", shift: 68 },
  { name: "Full CTO", shift: 131 },
];

// dims: in { args: dimensionless } out: { source_mired: dimensionless, target_mired: dimensionless, shift_needed: dimensionless, resulting_k: dimensionless }
export function computeMiredGelShift({ source_k = 3200, target_k = 5600, applied_shift = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(source_k > 0)) return { error: "Source color temperature must be positive." };
  if (!(target_k > 0)) return { error: "Target color temperature must be positive." };
  if (!Number.isFinite(applied_shift)) return { error: "Applied mired shift must be a finite number." };
  // Kelvin is not perceptually even; mireds are, which is why every correction filter is
  // specified as a mired shift rather than as a pair of kelvin values.
  const source_mired = 1e6 / source_k;
  const target_mired = 1e6 / target_k;
  const shift_needed = target_mired - source_mired;
  const nearest = MIRED_CORRECTIONS.reduce((a, b) => (Math.abs(b.shift - shift_needed) < Math.abs(a.shift - shift_needed) ? b : a));
  const nearest_error = shift_needed - nearest.shift;
  const effective_shift = applied_shift !== 0 ? applied_shift : nearest.shift;
  const applied_mired = source_mired + effective_shift;
  if (!(applied_mired > 0)) return { error: "That shift takes the source past infinite color temperature; choose a smaller one." };
  const resulting_k = 1e6 / applied_mired;
  if (![source_mired, target_mired, shift_needed, resulting_k].every(Number.isFinite)) return { error: "Mired math is not a finite value." };
  return {
    source_mired,
    target_mired,
    shift_needed,
    nearest_name: nearest.name,
    nearest_shift: nearest.shift,
    nearest_error,
    resulting_k,
    effective_shift,
    note: "The mired shift that takes one color temperature to another, the standard correction sheet closest to it, and where a given sheet actually lands. Kelvin is not a perceptually even scale: going from 3,000 K to 3,200 K is a visible correction while going from 9,000 K to 9,200 K is invisible. Mireds -- reciprocal color temperature times a million -- ARE even, which is why every correction filter on the market is specified as a mired shift rather than as a pair of kelvin values, and why a full CTB is about -131 mireds no matter what it is put in front of. Once a crew is thinking in mireds, what gel gets me from here to there is a subtraction and what does this gel do to that source is an addition. Negative shifts are blue and raise color temperature; positive shifts are orange and lower it. Matching a 3,200 K tungsten fixture to 5,600 K daylight is 178.6 minus 312.5, a shift of -133.9 mireds, and a full CTB at about -131 lands within three mireds of the target -- effectively exact. Try the same correction by kelvin arithmetic and the difference is 2,400 K, but there is no gel labeled 2,400 K because the number means something different depending on where you start: from 5,600 K a full CTO lands at 3,230 K, while from 6,500 K the same sheet lands at 3,510 K. Same gel, different result, and only the mired scale predicts it. A conversion; the filter manufacturer's published mired shift for the specific sheet and a color meter govern a critical match.",
  };
}

export const miredGelShiftExample = { inputs: { source_k: 3200, target_k: 5600, applied_shift: 0 } };

STAGE_RENDERERS["mired-gel-shift"] = _r({
  citation: "Citation: reciprocal color temperature (mireds = 1,000,000 / kelvin) and the mired-shift specification of correction filters, by name. The full/half/quarter/eighth CTB and CTO shift values are the conventional nominal figures; the filter manufacturer's published mired shift for the specific sheet, and a color meter, govern a critical match.",
  example: miredGelShiftExample.inputs,
  fields: [
    { key: "source_k", label: "Source color temperature (K)", kind: "number" },
    { key: "target_k", label: "Target color temperature (K)", kind: "number" },
    { key: "applied_shift", label: "Applied mired shift (0 to use the nearest standard sheet)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "mird-out-s", label: "Source", value: (r) => fmt(r.source_mired, 1) + " mireds" },
    { key: "t", id: "mird-out-t", label: "Target", value: (r) => fmt(r.target_mired, 1) + " mireds" },
    { key: "n", id: "mird-out-n", label: "Shift needed", value: (r) => fmt(r.shift_needed, 1) + " mireds" },
    { key: "g", id: "mird-out-g", label: "Nearest standard correction", value: (r) => r.nearest_name + " at " + fmt(r.nearest_shift, 0) + " mireds (" + fmt(Math.abs(r.nearest_error), 1) + " mireds off target)" },
    { key: "k", id: "mird-out-k", label: "Where the applied shift lands", value: (r) => fmt(r.resulting_k, 0) + " K from a " + fmt(r.effective_shift, 0) + " mired shift" },
    { key: "z", id: "mird-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeMiredGelShift,
});

// ===================== spec-v1373: haze and fog machine output for a venue =====================
// dims: in { args: dimensionless } out: { ventilation_cfm: L^3 T^-1, required_output: dimensionless, time_constant_hr: T, time_to_90_hr: T }
export function computeHazeMachineSizing({ volume_cf = 0, ach = 0, ref_volume_cf = 100000, ref_ach = 2, ref_output = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(volume_cf > 0)) return { error: "Venue volume must be positive." };
  if (!(ach > 0)) return { error: "Air changes per hour must be positive." };
  if (!(ref_volume_cf > 0)) return { error: "Reference volume must be positive." };
  if (!(ref_ach > 0)) return { error: "Reference air-change rate must be positive." };
  if (!(ref_output > 0)) return { error: "Reference machine output must be positive." };
  // A hazed room is a STEADY STATE, not a fill: required output is proportional to the
  // PRODUCT of volume and air-change rate, which is why sizing on volume alone fails.
  const ventilation_cfm = volume_cf * ach / 60;
  const scaling_factor = (volume_cf * ach) / (ref_volume_cf * ref_ach);
  const required_output = ref_output * scaling_factor;
  const time_constant_hr = 1 / ach;
  const time_to_90_hr = Math.LN10 / ach;
  if (![ventilation_cfm, scaling_factor, required_output, time_constant_hr, time_to_90_hr].every(Number.isFinite)) return { error: "Haze-sizing math is not a finite value." };
  return {
    ventilation_cfm,
    scaling_factor,
    required_output,
    time_constant_hr,
    time_to_90_hr,
    note: "How much haze output a room needs and how long it takes to get there. A hazed room is a steady state, not a fill: the machine adds haze continuously while the ventilation removes it continuously, and the density settles where the two rates match. That makes required output proportional to the PRODUCT of volume and air-change rate. Double the room and you need twice the machine; leave the room the same size and double the air handlers and you also need twice the machine. Crews consistently size on volume alone and are then surprised the look will not hold once the HVAC comes on for the audience. The time constant is the other half. At 4 air changes per hour a room reaches 63% of its final density in 15 minutes and 90% in about 35, so a haze cue called two minutes before the top of the show does nothing and the machine has to have been running through the pre-show; at 1 air change per hour the same room takes over two hours to settle, which is why a tight room hazes beautifully and then will not clear for the next act. A 200,000 cubic ft hall at 4 air changes moves 13,333 cfm and, scaled from a machine that holds a good haze in a 100,000 cubic ft room at 2 air changes on one quart per hour, needs four quarts an hour -- four times the fluid for a room only twice as large, because the air handlers did half the damage. If the house will run at 2 air changes during the show the requirement halves and the pre-show fill takes twice as long, and that negotiation with the building engineer is worth more than a second machine. A scaling estimate; the machine manufacturer's rated output, the fluid's safety data sheet, and the venue's smoke-detection and fire-authority requirements govern.",
  };
}

export const hazeMachineSizingExample = { inputs: { volume_cf: 200000, ach: 4, ref_volume_cf: 100000, ref_ach: 2, ref_output: 1 } };

STAGE_RENDERERS["haze-machine-sizing"] = _r({
  citation: "Citation: haze density as the steady state between machine output and ventilation removal, scaled on the product of volume and air-change rate, with the first-order fill time constant 1/ACH, by name. Public mass-balance physics. The machine manufacturer's rated output, the fluid's safety data sheet, and the venue's smoke-detection and fire-authority requirements govern.",
  example: hazeMachineSizingExample.inputs,
  fields: [
    { key: "volume_cf", label: "Venue volume (cubic ft)", kind: "number" },
    { key: "ach", label: "Air changes per hour", kind: "number" },
    { key: "ref_volume_cf", label: "Reference volume (cubic ft)", kind: "number" },
    { key: "ref_ach", label: "Reference air changes per hour", kind: "number" },
    { key: "ref_output", label: "Reference machine output (fluid per hour)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "haze-out-v", label: "Ventilation rate", value: (r) => fmt(r.ventilation_cfm, 0) + " cfm" },
    { key: "s", id: "haze-out-s", label: "Scaling factor against the reference", value: (r) => fmt(r.scaling_factor, 2) + " x" },
    { key: "o", id: "haze-out-o", label: "Required output", value: (r) => fmt(r.required_output, 2) + " fluid units per hour" },
    { key: "t", id: "haze-out-t", label: "Time constant (63% of steady state)", value: (r) => fmt(r.time_constant_hr, 2) + " hr (" + fmt(r.time_constant_hr * 60, 0) + " min)" },
    { key: "n", id: "haze-out-n", label: "Time to 90% of steady state", value: (r) => fmt(r.time_to_90_hr, 2) + " hr (" + fmt(r.time_to_90_hr * 60, 0) + " min)" },
    { key: "z", id: "haze-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeHazeMachineSizing,
});

// ===================== spec-v1374: stage deck and platform live-load check =====================
// dims: in { args: dimensionless } out: { deck_area_sqft: L^2, live_load_lb: M, load_per_leg_lb: M, leg_utilization_pct: dimensionless }
export function computeStageDeckLiveLoad({ length_ft = 0, width_ft = 0, legs = 4, design_psf = 125, deck_dead_lb = 0, leg_rating_lb = 0, point_load_lb = 0, bearing_sqin = 0, deck_point_rating_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(length_ft > 0 && width_ft > 0)) return { error: "Deck length and width must be positive." };
  if (!(legs >= 1)) return { error: "Leg count must be at least 1." };
  if (!(design_psf > 0)) return { error: "Design live load must be positive." };
  if (!(deck_dead_lb >= 0)) return { error: "Deck dead weight cannot be negative." };
  if (!(leg_rating_lb > 0)) return { error: "Leg rating must be positive." };
  if (!(point_load_lb >= 0 && bearing_sqin >= 0 && deck_point_rating_lb >= 0)) return { error: "Concentrated-load inputs cannot be negative." };
  // A uniform live load is a design abstraction; a piano wheel is a real point load in a
  // real square inch, and a deck that passes the uniform check can fail under one wheel.
  const deck_area_sqft = length_ft * width_ft;
  const live_load_lb = deck_area_sqft * design_psf;
  const total_load_lb = live_load_lb + deck_dead_lb;
  const load_per_leg_lb = total_load_lb / legs;
  const leg_utilization_pct = load_per_leg_lb / leg_rating_lb * 100;
  const bearing_psi = (point_load_lb > 0 && bearing_sqin > 0) ? point_load_lb / bearing_sqin : null;
  const point_utilization_pct = (point_load_lb > 0 && deck_point_rating_lb > 0) ? point_load_lb / deck_point_rating_lb * 100 : null;
  const leg_verdict = leg_utilization_pct > 100
    ? "OVER: the legs are past their rating before any point load is considered -- add legs or lower the design load"
    : leg_utilization_pct > 85
      ? "TIGHT: inside the rating but with little margin"
      : "OK: real margin against the leg rating";
  const point_verdict = point_utilization_pct === null
    ? "no concentrated load entered"
    : point_utilization_pct > 100
      ? "OVER the deck's rated point load"
      : "inside the deck's rated point load";
  if (![deck_area_sqft, live_load_lb, total_load_lb, load_per_leg_lb, leg_utilization_pct].every(Number.isFinite)) return { error: "Stage-deck load math is not a finite value." };
  return {
    deck_area_sqft,
    live_load_lb,
    total_load_lb,
    load_per_leg_lb,
    leg_utilization_pct,
    bearing_psi,
    point_utilization_pct,
    leg_verdict,
    point_verdict,
    note: "Whether a staging deck and its legs carry the code live load, and whether the deck survives the point load nobody checked. The building code assigns stages and platforms a uniform live load -- 125 psf for stage floors, 100 psf for assembly areas -- and the whole uniform check is applying it to the deck's own footprint and dividing by the legs. A 4 by 8 deck at 125 psf carries two tons, and the four legs under it each take half a ton before the deck's own weight is added. Rented staging legs are commonly rated somewhere between 1,000 and 2,500 lb, so the same deck can be well inside its rating or well outside it depending on which product is on the truck: 32 sq ft at 125 psf is 4,000 lb, plus 60 lb of deck, is 1,015 lb per leg -- 101.5% of a 1,000 lb rating and 41% of a 2,500 lb one. The concentrated-load line matters more often than the uniform one. A uniform live load is a design abstraction, while a piano wheel, a forklift, or a truss base plate is a real point load in a real square inch, and a deck that passes the uniform check by a wide margin can fail under a single wheel. Both belong on the same screen, and the bearing pressure in pounds per square inch is what decides whether a load-spreading pad is needed. A screen, never a stamp: the staging manufacturer's published deck and leg ratings, the governing building code edition adopted locally, and a qualified engineer govern.",
  };
}

export const stageDeckLiveLoadExample = { inputs: { length_ft: 4, width_ft: 8, legs: 4, design_psf: 125, deck_dead_lb: 60, leg_rating_lb: 1000, point_load_lb: 900, bearing_sqin: 4, deck_point_rating_lb: 1000 } };

STAGE_RENDERERS["stage-deck-live-load"] = _r({
  citation: "Citation: uniform live load applied to the deck footprint and divided among the legs, with a separate concentrated-load comparison and bearing pressure. The 125 psf stage-floor and 100 psf assembly live loads are the International Building Code Table 1607.1 values, cited by table and edition and not reproduced. The staging manufacturer's published deck and leg ratings, the locally adopted code edition, and a qualified engineer govern. A screen, never a stamp.",
  example: stageDeckLiveLoadExample.inputs,
  fields: [
    { key: "length_ft", label: "Deck length (ft)", kind: "number" },
    { key: "width_ft", label: "Deck width (ft)", kind: "number" },
    { key: "legs", label: "Number of legs", kind: "number" },
    { key: "design_psf", label: "Design live load (psf)", kind: "number" },
    { key: "deck_dead_lb", label: "Deck dead weight (lb)", kind: "number" },
    { key: "leg_rating_lb", label: "Leg rating (lb)", kind: "number" },
    { key: "point_load_lb", label: "Concentrated load to check (lb, 0 to skip)", kind: "number" },
    { key: "bearing_sqin", label: "Bearing area of that load (sq in, 0 to skip)", kind: "number" },
    { key: "deck_point_rating_lb", label: "Deck rated point load (lb, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "sdll-out-a", label: "Deck area", value: (r) => fmt(r.deck_area_sqft, 1) + " sq ft" },
    { key: "u", id: "sdll-out-u", label: "Uniform live load", value: (r) => fmt(r.live_load_lb, 0) + " lb (total with deck " + fmt(r.total_load_lb, 0) + " lb)" },
    { key: "l", id: "sdll-out-l", label: "Load per leg", value: (r) => fmt(r.load_per_leg_lb, 1) + " lb" },
    { key: "p", id: "sdll-out-p", label: "Leg utilization", value: (r) => fmt(r.leg_utilization_pct, 1) + " % -- " + r.leg_verdict },
    { key: "c", id: "sdll-out-c", label: "Concentrated load", value: (r) => r.point_utilization_pct === null ? r.point_verdict : fmt(r.point_utilization_pct, 1) + " % of the deck's point rating, " + r.point_verdict + (r.bearing_psi === null ? "" : " (" + fmt(r.bearing_psi, 1) + " psi bearing)") },
    { key: "z", id: "sdll-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeStageDeckLiveLoad,
});

// ===================== spec-v1375: LED wall data rate and processor port count =====================
// dims: in { args: dimensionless } out: { total_pixels: dimensionless, data_rate_gbps: dimensionless, ports_needed: dimensionless, spare_pixels: dimensionless }
export function computeVideoWallDataRate({ width_px = 0, height_px = 0, bit_depth = 8, refresh_hz = 60, pixels_per_port = 650000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(width_px > 0 && height_px > 0)) return { error: "Wall width and height in pixels must be positive." };
  if (!(bit_depth > 0)) return { error: "Bit depth per channel must be positive." };
  if (!(refresh_hz > 0)) return { error: "Refresh rate must be positive." };
  if (!(pixels_per_port > 0)) return { error: "Pixels per processor port must be positive." };
  // A wall's processor budget is counted in PIXELS PER PORT, not in resolution, which is why
  // two walls of the same physical size need very different amounts of processing.
  const total_pixels = width_px * height_px;
  const data_rate_gbps = total_pixels * bit_depth * 3 * refresh_hz / 1e9;
  const ports_needed = Math.ceil(total_pixels / pixels_per_port);
  const spare_pixels = ports_needed * pixels_per_port - total_pixels;
  const last_port_used = pixels_per_port - spare_pixels;
  if (![total_pixels, data_rate_gbps, ports_needed, spare_pixels, last_port_used].every(Number.isFinite)) return { error: "Video-wall data-rate math is not a finite value." };
  return {
    total_pixels,
    data_rate_gbps,
    ports_needed,
    spare_pixels,
    last_port_used,
    note: "The pixel count, uncompressed data rate, and processor port count for an LED wall. A wall's processor budget is counted in pixels per output port, not in resolution. A gigabit sending-card port carries a fixed pixel budget -- commonly around 650,000 pixels at 60 Hz, and proportionally fewer as refresh rate or bit depth rises -- and the wall is divided among however many ports that takes. The consequence is that two walls with the same physical size but different pixel pitches need very different amounts of processing, and the finer wall may need a second processor entirely. That is a fact about the processor rather than about the panels, which is exactly why it is missed when a wall is quoted by panel count. The data-rate line is the sanity check on the source side, and it says whether the incoming signal format can actually carry the wall. A wall built out to 3,840 by 2,160 is 8,294,400 pixels, which at 8-bit color and 60 Hz is 8,294,400 x 24 x 60 / 1e9 = 11.94 Gbps and takes thirteen 650,000-pixel ports -- more than one sending card carries, so this wall needs two. The same 11.94 Gbps sits right at the edge of what a single HDMI 2.0 or 12G-SDI link will pass, so moving to 10-bit takes the rate to 14.93 Gbps and the single-link source format has to change. A planning estimate; the processor manufacturer's published per-port capacity at the operating refresh and bit depth, and the panel maker's own mapping, govern the build.",
  };
}

export const videoWallDataRateExample = { inputs: { width_px: 3840, height_px: 2160, bit_depth: 8, refresh_hz: 60, pixels_per_port: 650000 } };

STAGE_RENDERERS["video-wall-data-rate"] = _r({
  citation: "Citation: uncompressed video data rate = pixels x bit depth x 3 channels x refresh, and processor port count = ceil(pixels / pixels per port), by name. Public arithmetic; the per-port pixel budget is the processor manufacturer's published figure at the operating refresh and bit depth, cited not reproduced. The processor maker's capacity and the panel maker's mapping govern the build.",
  example: videoWallDataRateExample.inputs,
  fields: [
    { key: "width_px", label: "Wall width (pixels)", kind: "number" },
    { key: "height_px", label: "Wall height (pixels)", kind: "number" },
    { key: "bit_depth", label: "Bit depth per channel", kind: "number" },
    { key: "refresh_hz", label: "Refresh rate (Hz)", kind: "number" },
    { key: "pixels_per_port", label: "Pixels per processor port", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "vwdr-out-p", label: "Total pixels", value: (r) => fmt(r.total_pixels, 0) },
    { key: "d", id: "vwdr-out-d", label: "Uncompressed data rate", value: (r) => fmt(r.data_rate_gbps, 2) + " Gbps" },
    { key: "n", id: "vwdr-out-n", label: "Processor ports required", value: (r) => String(r.ports_needed) + " ports" },
    { key: "s", id: "vwdr-out-s", label: "Spare capacity on the last port", value: (r) => fmt(r.spare_pixels, 0) + " pixels (" + fmt(r.last_port_used, 0) + " used)" },
    { key: "z", id: "vwdr-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeVideoWallDataRate,
});

// ===================== spec-v1376: outdoor stage and banner wind load with ballast =====================
// dims: in { args: dimensionless } out: { velocity_pressure_psf: M L^-1 T^-2, wind_force_lb: M L T^-2, overturning_moment_ftlb: M L^2 T^-2, required_ballast_lb: M }
export function computeOutdoorStageWind({ banner_height_ft = 0, banner_width_ft = 0, centroid_height_ft = 0, wind_speed_mph = 0, drag_coefficient = 1.3, base_width_ft = 0, safety_factor = 1.5, available_ballast_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(banner_height_ft > 0 && banner_width_ft > 0)) return { error: "Banner height and width must be positive." };
  if (!(centroid_height_ft > 0)) return { error: "Centroid height above the base must be positive." };
  if (!(wind_speed_mph > 0)) return { error: "Wind speed must be positive." };
  if (!(drag_coefficient > 0)) return { error: "Drag coefficient must be positive." };
  if (!(base_width_ft > 0)) return { error: "Base width between ballast points must be positive." };
  if (!(safety_factor >= 1)) return { error: "Safety factor must be at least 1." };
  if (!(available_ballast_lb >= 0)) return { error: "Available ballast cannot be negative." };
  // Velocity pressure rises with the SQUARE of wind speed: a 40 mph gust carries four
  // times the load of a 20 mph one, not twice.
  const area_sqft = banner_height_ft * banner_width_ft;
  const velocity_pressure_psf = 0.00256 * wind_speed_mph * wind_speed_mph;
  const wind_force_lb = velocity_pressure_psf * drag_coefficient * area_sqft;
  const overturning_moment_ftlb = wind_force_lb * centroid_height_ft;
  const resisting_arm_ft = base_width_ft / 2;
  const required_ballast_lb = overturning_moment_ftlb * safety_factor / resisting_arm_ft;
  // Ballast resists as V^2, so the speed a stated ballast survives inverts the square law.
  const capacity_speed_mph = available_ballast_lb > 0
    ? Math.sqrt(available_ballast_lb * resisting_arm_ft / (safety_factor * drag_coefficient * area_sqft * centroid_height_ft * 0.00256))
    : null;
  if (![area_sqft, velocity_pressure_psf, wind_force_lb, overturning_moment_ftlb, required_ballast_lb].every(Number.isFinite)) return { error: "Wind-load math is not a finite value." };
  if (capacity_speed_mph !== null && !Number.isFinite(capacity_speed_mph)) return { error: "Wind-load math is not a finite value." };
  return {
    area_sqft,
    velocity_pressure_psf,
    wind_force_lb,
    overturning_moment_ftlb,
    required_ballast_lb,
    capacity_speed_mph,
    resisting_arm_ft,
    note: "The wind force on an outdoor banner or scrim, the moment it tries to tip the structure with, and the ballast that holds it down. Velocity pressure rises with the SQUARE of wind speed, which is the fact that catches people out: a 40 mph gust does not carry twice the load of a 20 mph one, it carries four times. The drag coefficient for a flat panel normal to the wind is around 1.3, and a solid banner is exactly that, with no shape to shed the load. The overturning check is a moment balance about the downwind base edge, where the wind force acts at the banner's centroid height and the only thing resisting it is the ballast acting at half the base width. Because the lever arms are so different -- a centroid twelve feet up against a four-foot resisting arm -- the required ballast comes out several times the wind force itself, and the numbers get large fast. A 20 by 8 ft banner with its centroid 12 ft above an 8 ft base, in a 40 mph gust at a 1.5 safety factor, sees 4.10 psf and 852 lb of force, a 10,224 ft-lb overturning moment, and needs 3,834 lb of ballast: nearly two tons to hold one banner in a gust an ordinary summer thunderstorm produces. Drop the design wind to 30 mph and the requirement falls to 2,157 lb, because the square law works in both directions; raise it to 55 mph and it climbs to 7,248 lb. The design wind speed is the most expensive number on the drawing, and the honest way to reduce it is to plan to drop the banner rather than to assume the storm will be small. The safety factor and the wind speed at which the structure comes down are decisions ANSI E1.21 requires be made IN ADVANCE, written into an operations management plan, with someone watching an anemometer and holding the authority to stop the show. A screen, never an engineered result; ANSI E1.21, the structure manufacturer's data, and a qualified engineer govern.",
  };
}

export const outdoorStageWindExample = { inputs: { banner_height_ft: 8, banner_width_ft: 20, centroid_height_ft: 12, wind_speed_mph: 40, drag_coefficient: 1.3, base_width_ft: 8, safety_factor: 1.5, available_ballast_lb: 2000 } };

STAGE_RENDERERS["outdoor-stage-wind"] = _r({
  citation: "Citation: velocity pressure q = 0.00256 V^2 (V in mph), force = q x Cd x area, and an overturning-moment balance about the downwind base edge against ballast acting at half the base width. ANSI E1.21, Entertainment Technology -- Temporary Structures Used for Technical Production of Outdoor Entertainment Events, is cited by name for the requirement that the safety factor and the take-down wind speed be set IN ADVANCE in an operations management plan. A screen, never an engineered result; a qualified engineer governs.",
  example: outdoorStageWindExample.inputs,
  fields: [
    { key: "banner_height_ft", label: "Banner or scrim height (ft)", kind: "number" },
    { key: "banner_width_ft", label: "Banner or scrim width (ft)", kind: "number" },
    { key: "centroid_height_ft", label: "Centroid height above the base (ft)", kind: "number" },
    { key: "wind_speed_mph", label: "Design wind speed (mph)", kind: "number" },
    { key: "drag_coefficient", label: "Drag coefficient", kind: "number" },
    { key: "base_width_ft", label: "Base width between ballast points (ft)", kind: "number" },
    { key: "safety_factor", label: "Safety factor", kind: "number" },
    { key: "available_ballast_lb", label: "Ballast on hand (lb, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "oswd-out-q", label: "Velocity pressure", value: (r) => fmt(r.velocity_pressure_psf, 2) + " psf on " + fmt(r.area_sqft, 0) + " sq ft" },
    { key: "f", id: "oswd-out-f", label: "Wind force", value: (r) => fmt(r.wind_force_lb, 0) + " lb" },
    { key: "m", id: "oswd-out-m", label: "Overturning moment", value: (r) => fmt(r.overturning_moment_ftlb, 0) + " ft-lb about the downwind base edge" },
    { key: "b", id: "oswd-out-b", label: "Required ballast", value: (r) => fmt(r.required_ballast_lb, 0) + " lb at a " + fmt(r.resisting_arm_ft, 1) + " ft resisting arm" },
    { key: "s", id: "oswd-out-s", label: "Wind speed the ballast on hand survives", value: (r) => r.capacity_speed_mph === null ? "-" : fmt(r.capacity_speed_mph, 1) + " mph" },
    { key: "z", id: "oswd-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeOutdoorStageWind,
});
