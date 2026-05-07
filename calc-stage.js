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
