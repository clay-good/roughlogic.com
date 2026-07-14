// Group N: Stage and Live Production (utilities 216-221).
// See spec-v4.md section 2.5.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
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
  inputs: { truss_model: "16in_box", span_ft: 30, point_loads: [{ weight_lb: 250, position_ft: 10 }, { weight_lb: 250, position_ft: 20 }] },
};

// --- 217: Audio Speaker Time Alignment ---
//
// Speed of sound c (m/s) = 331.3 + 0.606 * T_C
// delay_ms = (d_main - d_delay) / c * 1000
// Convert ft <-> m as needed.

// dims: in { d_main_ft: L, d_delay_ft: L, ambient_C: T, haas_offset_ms: T }
//        out: { c_m_s: L T^-1, ms_difference: T, recommended_delay_ms: T }
// (Temperature and time both surface as `T` per the spec-v14 §7.1
// base-token shortcut; speed of sound is length / time.)
export function computeTimeAlignment({ d_main_ft = 0, d_delay_ft = 0, ambient_C = 20, haas_offset_ms = 15 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_main_ft >= 0)) return { error: "Main distance must be non-negative." };
  if (!(d_delay_ft >= 0)) return { error: "Delay distance must be non-negative." };
  const d_main_m = d_main_ft * 0.3048;
  const d_delay_m = d_delay_ft * 0.3048;
  const c_m_s = 331.3 + 0.606 * ambient_C;
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

export const neutralImbalanceExample = { inputs: { I_A: 50, I_B: 45, I_C: 40, harmonic_loads: false } };

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
// WLL at angle: per-leg tension = load / (n * sin(theta/2))
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
    tension_per_leg = load_lb / (n_legs * Math.sin((included_angle_deg / 2) * Math.PI / 180));
  } else if (configuration === "choker") {
    if (!(included_angle_deg > 0 && included_angle_deg < 180)) return { error: "Included angle must be 0-180 deg." };
    derate_factor = 0.75;
    tension_per_leg = load_lb / (n_legs * Math.sin((included_angle_deg / 2) * Math.PI / 180) * derate_factor);
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
  return function (inputRegion, outputRegion, citationEl) {
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
    const w = document.createElement("input"); w.type = "number"; w.step = "any"; w.inputMode = "decimal"; w.placeholder = "Weight (lb)"; w.setAttribute("aria-label", "Point " + (i + 1) + " weight (lb)");
    const p = document.createElement("input"); p.type = "number"; p.step = "any"; p.inputMode = "decimal"; p.placeholder = "Position (ft)"; p.setAttribute("aria-label", "Point " + (i + 1) + " position (ft)");
    wrap.appendChild(w); wrap.appendChild(p); list.appendChild(wrap);
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
  // v593: US-facing deg F field; converted to deg C at the boundary for the
  // published speed-of-sound form (71.6 F = 22 C, matching the metric fixture).
  example: { ...timeAlignmentExample.inputs, ambient_F: 71.6 },
  fields: [
    { key: "d_main_ft", label: "Distance from mains (ft)", kind: "number" },
    { key: "d_delay_ft", label: "Distance from delay (ft)", kind: "number" },
    { key: "ambient_F", label: "Ambient temp (F)", kind: "number", default: 68 },
    { key: "haas_offset_ms", label: "Haas offset (ms)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "c", id: "ta-out-c", label: "Speed of sound", value: (r) => fmt(r.c_m_s / 304.8, 2) + " ft/ms (" + fmt(r.c_m_s, 1) + " m/s)" },
    { key: "d", id: "ta-out-d", label: "Time difference", value: (r) => fmt(r.ms_difference, 2) + " ms" },
    { key: "r", id: "ta-out-r", label: "Recommended delay", value: (r) => fmt(r.recommended_delay_ms, 1) + " ms" },
  ],
  compute: (p) => computeTimeAlignment({ d_main_ft: p.d_main_ft, d_delay_ft: p.d_delay_ft, ambient_C: (p.ambient_F - 32) * 5 / 9, haas_offset_ms: p.haas_offset_ms }),
});

function renderDMX(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USITT DMX-512A by name only. Each universe carries 512 channels.";
  attachExampleButton(inputRegion, () => fillExample(dmxExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 8; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const n = document.createElement("input"); n.type = "text"; n.placeholder = "Fixture name"; n.setAttribute("aria-label", "Fixture " + (i + 1) + " name");
    const u = document.createElement("input"); u.type = "number"; u.step = "1"; u.min = "1"; u.inputMode = "numeric"; u.placeholder = "Universe"; u.value = "1"; u.setAttribute("aria-label", "Fixture " + (i + 1) + " universe");
    const s = document.createElement("input"); s.type = "number"; s.step = "1"; s.min = "1"; s.max = "512"; s.inputMode = "numeric"; s.placeholder = "Start"; s.setAttribute("aria-label", "Fixture " + (i + 1) + " start address");
    const c = document.createElement("input"); c.type = "number"; c.step = "1"; c.min = "1"; c.inputMode = "numeric"; c.placeholder = "Channels"; c.setAttribute("aria-label", "Fixture " + (i + 1) + " channel count");
    wrap.appendChild(n); wrap.appendChild(u); wrap.appendChild(s); wrap.appendChild(c);
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
    { key: "d1", label: "Reference distance (ft)", kind: "number", default: 1 },
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
    { key: "n_legs", label: "Legs", kind: "number", default: 2 },
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
  const tF = makeNumber("Air temperature (F)", "spa-t", { step: "any", value: "68" });
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
  const w = makeNumber("Total connected load (W)", "pd-w", { step: "any", min: "0", value: "12000" }); w.input.value = "12000";
  const v = makeNumber("Service voltage (V, line-line for 3-phase)", "pd-v", { step: "any", min: "0", value: "208" }); v.input.value = "208";
  const phase = makeSelect("Phase", "pd-phase", [{ value: "three", label: "3-phase", selected: true }, { value: "single", label: "1-phase" }]);
  const rating = makeNumber("Service rating (A per leg)", "pd-rating", { step: "any", min: "0", value: "60" }); rating.input.value = "60";
  const pf = makeNumber("Power factor", "pd-pf", { step: "any", min: "0", max: "1", value: "1" }); pf.input.value = "1";
  const der = makeNumber("Continuous-derate target", "pd-der", { step: "any", min: "0", max: "1", value: "0.8" }); der.input.value = "0.8";
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
  const count = makeNumber("Driver count (series or parallel)", "si-count", { step: "1", min: "1", value: "4" }); count.input.value = "4";
  const spb = makeNumber("Drivers per series branch (series-parallel)", "si-spb", { step: "1", min: "1", value: "2" }); spb.input.value = "2";
  const branches = makeNumber("Parallel branches (series-parallel)", "si-branches", { step: "1", min: "1", value: "2" }); branches.input.value = "2";
  const ampMin = makeNumber("Amplifier minimum rated load (Ohm; optional)", "si-ampmin", { step: "any", min: "0", value: "2" }); ampMin.input.value = "2";
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
export const decibelConverterExample = { inputs: { mode: "combine", p1: 1, p2: 2, v1: 1, v2: 2, level_db: 4, ref_type: "dBu", levels: [90, 90] } };

function renderDecibelConverter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per ANSI S1.1 acoustical-terminology decibel definitions (power 10log, field-quantity 20log) and the standard reference levels (dBu 0.775 V, dBV 1 V, dBSPL 20 uPa), by name; public. Complements spl-distance.";
  const mode = makeSelect("Mode", "dbc-mode", [
    { value: "power-ratio", label: "Power ratio (10 log)", selected: true },
    { value: "voltage-ratio", label: "Voltage/pressure ratio (20 log)" },
    { value: "reference-level", label: "Reference level (back-solve linear)" },
    { value: "combine", label: "Combine incoherent sources" },
  ]);
  const p1 = makeNumber("Reference power p1 (W)", "dbc-p1", { step: "any", min: "0", value: "1" }); p1.input.value = "1";
  const p2 = makeNumber("Power p2 (W)", "dbc-p2", { step: "any", min: "0", value: "2" }); p2.input.value = "2";
  const v1 = makeNumber("Reference voltage/pressure v1", "dbc-v1", { step: "any", min: "0", value: "1" }); v1.input.value = "1";
  const v2 = makeNumber("Voltage/pressure v2", "dbc-v2", { step: "any", min: "0", value: "2" }); v2.input.value = "2";
  const level = makeNumber("Level (dB)", "dbc-level", { step: "any", value: "4" }); level.input.value = "4";
  const ref = makeSelect("Reference type", "dbc-ref", [
    { value: "dBu", label: "dBu (0.775 V)", selected: true },
    { value: "dBV", label: "dBV (1 V)" },
    { value: "dBSPL", label: "dBSPL (20 uPa)" },
  ]);
  const list = makeNumber("Source levels (dB, comma-separated)", "dbc-list", { type: "text" });
  list.input.type = "text"; list.input.value = "90, 90";
  for (const f of [mode, p1, p2, v1, v2, level, ref, list]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    mode.select.value = "combine"; p1.input.value = "1"; p2.input.value = "2"; v1.input.value = "1"; v2.input.value = "2";
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
  const sens = makeNumber("Speaker sensitivity (dB @ 1 W / 1 m)", "aps-sens", { step: "any", value: "90" }); sens.input.value = "90";
  const power = makeNumber("Amplifier power per channel (W)", "aps-power", { step: "any", min: "0", value: "100" }); power.input.value = "100";
  // v593: US-facing ft field, converted at this boundary into the metric-native
  // compute (3.28 ft ~ 1 m); the dB @ 1 W / 1 m sensitivity reference stays.
  const dist = makeNumber("Listening distance (ft)", "aps-dist", { step: "any", min: "0", value: "3.28" }); dist.input.value = "3.28";
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
const ledVideoWallExample = { inputs: { cab_w_px: 168, cab_h_px: 168, pixel_pitch_mm: 2.6, cols: 10, rows: 6, cab_weight_lb: 18, cab_max_watts: 200, avg_power_factor: 0.35 } };
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
    { key: "avg_power_factor", label: "Average-power factor (0-1)", kind: "number", default: 0.35 },
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
const projectorBrightnessExample = { inputs: { screen_w_ft: 16, screen_h_ft: 9, screen_gain: 1.0, target_foot_lamberts: 16, throw_ratio: 1.5 } };
const renderProjectorBrightness = _r({
  citation: "Citation: Standard AV screen-luminance identity foot-lamberts = lumens x gain / area (SMPTE-style targets, by name). Required lumens = target fL x area / gain.",
  example: projectorBrightnessExample.inputs,
  fields: [
    { key: "screen_w_ft", label: "Screen width (ft)", kind: "number" },
    { key: "screen_h_ft", label: "Screen height (ft)", kind: "number" },
    { key: "screen_gain", label: "Screen gain", kind: "number", default: 1.0 },
    { key: "target_foot_lamberts", label: "Target foot-lamberts", kind: "number", default: 16 },
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

const roomAcousticsExample = { inputs: { volume_ft3: 5000, total_sabins: 500, length_ft: 20, width_ft: 15, height_ft: 10 } };
const renderRoomAcoustics = _r({
  citation: "Citation: Sabine reverberation equation RT60 = 0.049 x V / A (W.C. Sabine, public domain; imperial 0.049 coefficient, editable). First axial room mode per dimension = c / (2 x length), c = 1130 ft/s (editable). The acoustician and the venue govern treatment and sub placement.",
  example: roomAcousticsExample.inputs,
  fields: [
    { key: "volume_ft3", label: "Room volume (ft^3)", kind: "number", attrs: { step: "any", min: "0" } },
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
const roomAbsorptionTargetExample = { inputs: { volume_ft3: 5000, target_rt60_s: 0.6, existing_sabins: 250, sabine_coeff: 0.049 } };
const renderRoomAbsorptionTarget = _r({
  citation: "Citation: Sabine reverberation equation solved for absorption A_required = 0.049 x V / RT60_target (W.C. Sabine, public domain; imperial 0.049 coefficient, editable), and the additional treatment = required - existing. One sabin = 1 ft^2 of perfect absorption. The acoustician and the venue govern treatment.",
  example: roomAbsorptionTargetExample.inputs,
  fields: [
    { key: "volume_ft3", label: "Room volume (ft^3)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "target_rt60_s", label: "Target RT60 (s)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "existing_sabins", label: "Existing absorption (sabins, 0 = none)", kind: "number", default: 0, attrs: { step: "any", min: "0" } },
    { key: "sabine_coeff", label: "Sabine coefficient (default 0.049)", kind: "number", default: 0.049, attrs: { step: "any", min: "0" } },
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
const counterweightArborLoadExample = { inputs: { batten_weight_lb: 100, attached_load_lb: 400, purchase_type: "single", brick_weight_lb: 30, existing_cw_lb: 200 } };
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
const ledTapeRunExample = { inputs: { power_per_ft_w: 4.4, run_length_ft: 16, supply_voltage_v: 12, resistance_per_ft: 0.05, headroom_pct: 20, drop_tolerance_pct: 10 } };
const renderLedTapeRun = _r({
  citation: "Notice: The strip datasheet governs; verify against the manufacturer's spec. Citation: constant-voltage LED strip loading and voltage drop, by name. load = power_per_ft x length; psu = load / (1 - headroom); current = load / voltage; end_drop = current x (resistance_per_ft x length) / 2; end_voltage = voltage - end_drop. A single end-fed run dims at the far end (12 V walls out ~16-20 ft, 24 V ~double); oversizing the PSU does not fix it - power-inject or feed both ends.",
  example: ledTapeRunExample.inputs,
  fields: [
    { key: "power_per_ft_w", label: "Strip power (W/ft)", kind: "number" },
    { key: "run_length_ft", label: "Run length (ft)", kind: "number" },
    { key: "supply_voltage_v", label: "Supply voltage (V, 12 / 24)", kind: "number" },
    { key: "resistance_per_ft", label: "Round-trip resistance (ohm/ft)", kind: "number" },
    { key: "headroom_pct", label: "PSU headroom (%)", kind: "number", default: 20 },
    { key: "drop_tolerance_pct", label: "Acceptable end drop (%)", kind: "number", default: 10 },
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
const ledTapeMaxRunExample = { inputs: { power_per_ft_w: 4.4, supply_voltage_v: 12, resistance_per_ft: 0.05, drop_tolerance_pct: 10 } };
const renderLedTapeMaxRun = _r({
  citation: "Notice: The strip datasheet governs; verify against the manufacturer's spec. Citation: constant-voltage LED strip voltage drop solved for the run length. drop_pct = power_per_ft x resistance_per_ft x length^2 / (2 x voltage^2) x 100; len_max = voltage x sqrt(2 x (tolerance/100) / (power_per_ft x resistance_per_ft)). A 12 V strip walls out ~16-20 ft, 24 V ~double; oversizing the PSU does not extend it - power-inject or feed both ends.",
  example: ledTapeMaxRunExample.inputs,
  fields: [
    { key: "power_per_ft_w", label: "Strip power (W/ft)", kind: "number" },
    { key: "supply_voltage_v", label: "Supply voltage (V, 12 / 24)", kind: "number" },
    { key: "resistance_per_ft", label: "Round-trip resistance (ohm/ft)", kind: "number" },
    { key: "drop_tolerance_pct", label: "Acceptable end drop (%)", kind: "number", default: 10 },
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
    { key: "d1", label: "Reference distance (ft)", kind: "number", default: 1 },
    { key: "target_L2_dB", label: "Target SPL (dB)", kind: "number" },
    { key: "mode", label: "Mode", kind: "select", options: Object.keys(SPL_MODES).map((k) => ({ value: k, label: SPL_MODES[k].label })) },
    { key: "n_sources", label: "Identical sources", kind: "number", default: 1 },
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
