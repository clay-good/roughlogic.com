// Group N: Stage and Live Production (utilities 216-221).
// See spec-v4.md section 2.5.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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
export function computeSPL({ L1_dB = 0, d1 = 1, d2 = 0, mode = "free_field" }) {
  const m = SPL_MODES[mode];
  if (!m) return { error: "Unknown mode." };
  if (!(d1 > 0)) return { error: "Reference distance must be positive." };
  if (!(d2 > 0)) return { error: "Target distance must be positive." };
  const L2_freefield = L1_dB - 20 * Math.log10(d2 / d1);
  const L2 = L2_freefield + m.factor;
  return { L2_dB: L2, L2_freefield_dB: L2_freefield, mode_factor_dB: m.factor };
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
  const safety_factor = tension_per_leg > 0 ? effective_wll / tension_per_leg : Infinity;
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
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else if (f.kind === "checkbox") field = makeCheckbox(f.label, f.id);
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any" });
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
    const w = document.createElement("input"); w.type = "number"; w.step = "any"; w.placeholder = "Weight (lb)";
    const p = document.createElement("input"); p.type = "number"; p.step = "any"; p.placeholder = "Position (ft)";
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
  example: timeAlignmentExample.inputs,
  fields: [
    { key: "d_main_ft", label: "Distance from mains (ft)", kind: "number" },
    { key: "d_delay_ft", label: "Distance from delay (ft)", kind: "number" },
    { key: "ambient_C", label: "Ambient temp (C)", kind: "number", default: 20 },
    { key: "haas_offset_ms", label: "Haas offset (ms)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "c", id: "ta-out-c", label: "Speed of sound", value: (r) => fmt(r.c_m_s, 1) + " m/s" },
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
    const n = document.createElement("input"); n.type = "text"; n.placeholder = "Fixture name";
    const u = document.createElement("input"); u.type = "number"; u.step = "1"; u.min = "1"; u.placeholder = "Universe"; u.value = "1";
    const s = document.createElement("input"); s.type = "number"; s.step = "1"; s.min = "1"; s.max = "512"; s.placeholder = "Start";
    const c = document.createElement("input"); c.type = "number"; c.step = "1"; c.min = "1"; c.placeholder = "Channels";
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
    { key: "d1", label: "Reference distance (m)", kind: "number", default: 1 },
    { key: "d2", label: "Target distance (m)", kind: "number" },
    { key: "mode", label: "Mode", kind: "select", options: Object.keys(SPL_MODES).map((k) => ({ value: k, label: SPL_MODES[k].label })) },
  ],
  outputs: [
    { key: "f", id: "sp-out-f", label: "Free-field SPL", value: (r) => fmt(r.L2_freefield_dB, 1) + " dB" },
    { key: "l", id: "sp-out-l", label: "SPL with mode",  value: (r) => fmt(r.L2_dB, 1) + " dB (+" + r.mode_factor_dB + ")" },
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
  const L1 = Number(source_SPL_dB) || 0;
  const d1 = (d_ref_m === undefined || d_ref_m === null || d_ref_m === "") ? 1 : Number(d_ref_m);
  const d2 = Number(d_far_m) || 0;
  const T_C = Number(temperature_C);
  const RH = Number(RH_percent);
  const P = Number(pressure_kPa) || 101.325;
  if (!(d1 > 0)) return { error: "Reference distance must be positive (m)." };
  if (!(d2 > 0)) return { error: "Target distance must be positive (m)." };
  if (d2 < d1) return { error: "Target distance must not be below the reference distance (the source SPL is defined at the reference distance)." };
  if (!Number.isFinite(T_C)) return { error: "Temperature must be numeric (C)." };
  if (!Number.isFinite(RH) || RH < 0 || RH > 100) return { error: "Relative humidity must be 0 - 100 percent." };
  if (!(P > 0)) return { error: "Pressure must be positive (kPa)." };
  const T_K = T_C + 273.15;
  const h_r = RH / 100;

  const warnings = [];
  if (T_C < -20 || T_C > 50) warnings.push("Temperature outside the -20 to 50 C ANSI S1.26 typical-validity range; coefficients become less accurate at the extremes.");

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

  const spl = makeNumber("Source SPL at reference distance (dB)", "spa-spl", { step: "any" });
  const dref = makeNumber("Reference distance (m; typically 1)", "spa-dref", { step: "any", min: "0", value: "1" });
  dref.input.value = "1";
  const dfar = makeNumber("Target distance (m)", "spa-dfar", { step: "any", min: "0" });
  const tC = makeNumber("Air temperature (C)", "spa-t", { step: "any", value: "20" });
  tC.input.value = "20";
  const rh = makeNumber("Relative humidity (percent)", "spa-rh", { step: "any", min: "0", max: "100", value: "50" });
  rh.input.value = "50";
  const p = makeNumber("Ambient pressure (kPa; default 101.325)", "spa-p", { step: "any", min: "0", value: "101.325" });
  p.input.value = "101.325";
  for (const f of [spl, dref, dfar, tC, rh, p]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    spl.input.value = "95"; dref.input.value = "1"; dfar.input.value = "30";
    tC.input.value = "20"; rh.input.value = "50"; p.input.value = "101.325"; update();
  });

  const oISL = makeOutputLine(outputRegion, "Inverse-square attenuation (dB)", "spa-out-isl");
  const oSPL = makeOutputLine(outputRegion, "Far-field SPL at 1 kHz (dB)", "spa-out-spl");
  const oA = makeOutputLine(outputRegion, "Absorption at 1 kHz (dB total / alpha dB/m)", "spa-out-a");
  const oBands = makeOutputLine(outputRegion, "Per-octave SPL (dB)", "spa-out-bands");
  const oW = makeOutputLine(outputRegion, "Notes", "spa-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeSPLAtmospheric({
      source_SPL_dB: readNum(spl.input),
      d_ref_m: readNum(dref.input),
      d_far_m: readNum(dfar.input),
      temperature_C: readNum(tC.input),
      RH_percent: readNum(rh.input),
      pressure_kPa: readNum(p.input),
    });
    if (r.error) {
      oISL.textContent = r.error; oSPL.textContent = ""; oA.textContent = ""; oBands.textContent = ""; oW.textContent = "";
      return;
    }
    oISL.textContent = fmt(r.inverse_square_dB, 2) + " dB";
    oSPL.textContent = fmt(r.SPL_far_1kHz_dB, 2) + " dB";
    oA.textContent = fmt(r.absorption_1kHz_dB, 2) + " dB (alpha " + fmt(r.alpha_1kHz_dB_per_m, 5) + " dB/m)";
    oBands.textContent = r.bands.map((b) => b.f_Hz + " Hz: " + fmt(b.SPL_far_dB, 1)).join(", ");
    oW.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const el of [spl.input, dref.input, dfar.input, tC.input, rh.input, p.input]) el.addEventListener("input", update);
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
