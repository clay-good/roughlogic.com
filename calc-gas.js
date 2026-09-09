// =====================================================================
// calc-gas.js - Fuel-Gas Piping bench (spec-v42 cap-relief split).
//
// A cap-relief split in the spirit of spec-v36 / spec-v39: relocates the
// three self-contained fuel-gas tiles out of calc-plumbing.js (which had
// reached 98.9% of its gzip cap) into their own thematic module. No tile
// is added or removed and no calculator output changes; the catalog stays
// 574. Group B is "Plumbing and Gas", so the gas tiles keep group: "B"
// while living here behind GAS_RENDERERS (group letter independent of
// module, the v28/v36/v39 precedent).
//
// Three tiles: gas-pipe-sizing (IFGC / NFPA 54 sizing via the Spitzglass
// low-pressure formula), gas-leak-rate (orifice leak estimate), and
// gas-pipe-pressure-drop (longhand Spitzglass pressure drop). The shared
// gas-property table and the Spitzglass helper move with them; the small,
// stable Schedule 40 inside-diameter table is duplicated here (it stays in
// calc-plumbing.js for the water tiles that also use it).
//
// Mirrors calc-fab.js: a ui-fields import, a module-local _finiteGuard,
// the exported compute functions plus their renderers, and the
// GAS_RENDERERS map.
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

// Compact renderer factory, copied verbatim from calc-containment.js (same
// ui-fields imports) per the new-tile convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
// Declared above the module's first export because check-render-output-keys
// attributes a non-exported helper's returns to the export before it.
function _simpleRenderer(spec) {
  const _lpRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
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

  _lpRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _lpRender;
}

// Schedule 40 steel pipe inside diameters (in). Duplicated from
// calc-plumbing.js (a small, stable reference table) so gas-pipe-sizing is
// self-contained here; the copy in calc-plumbing.js serves the water tiles.
export const SCH40_ID_IN = {
  "0.5": 0.622, "0.75": 0.824, "1": 1.049, "1.25": 1.380, "1.5": 1.610,
  "2": 2.067, "2.5": 2.469, "3": 3.068, "4": 4.026,
};

export const GAS_PROPERTIES = {
  natural_gas: { specific_gravity: 0.60, heating_value_btu_ft3: 1030 },
  propane: { specific_gravity: 1.52, heating_value_btu_ft3: 2516 },
};

// Spitzglass low-pressure gas-flow formula:
//   Q = 3550 * sqrt( d^5 * dP / (SG * L * (1 + 3.6/d + 0.03*d)) )
// where d is internal diameter in inches, dP is pressure drop in inches w.c.,
// SG is specific gravity, and L is length in feet. The (1 + 3.6/d + 0.03*d)
// diameter-correction term is part of the low-pressure Spitzglass equation
// (the sibling pressure-drop and max-flow tiles carry it too).
// dims: in { d_in: L, dP_in_wc: M L^-1 T^-2, specific_gravity: dimensionless, L_ft: L } out: { flow_cfh: L^3 T^-1 }
export function spitzglassFlow({ d_in, dP_in_wc, specific_gravity, L_ft }) {
  if (L_ft <= 0 || d_in <= 0) return 0;
  const spitz = 1 + 3.6 / d_in + 0.03 * d_in;
  return 3550 * Math.sqrt((Math.pow(d_in, 5) * dP_in_wc) / (specific_gravity * L_ft * spitz));
}

export const GAS_RENDERERS = {};

// =====================================================================
// gas-pipe-sizing (Group B) - IFGC 2021 Table 402.4 (NFPA 54) sizing via
// the Spitzglass low-pressure formula.
// =====================================================================

// dims: in { btu_load: M L^2 T^-3, length_ft: L, gas: dimensionless, dP_in_wc: M L^-1 T^-2, candidate_sizes: dimensionless } out: { recommended_size_in: L, candidates: dimensionless }
export function computeGasPipeSizing({ btu_load, length_ft, gas, dP_in_wc = 0.5, candidate_sizes = ["0.5", "0.75", "1", "1.25", "1.5", "2"] }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const props = GAS_PROPERTIES[gas];
  if (!props) return { error: "Unknown gas." };
  const required_cfh = btu_load / props.heating_value_btu_ft3;
  for (const size of candidate_sizes) {
    const d = SCH40_ID_IN[size];
    if (!d) continue;
    const capacity = spitzglassFlow({ d_in: d, dP_in_wc, specific_gravity: props.specific_gravity, L_ft: length_ft });
    if (capacity >= required_cfh) {
      // v8 §C.2: actual achieved pressure drop at the chosen size + actual
      // load. Spitzglass: Q ∝ sqrt(dP), so dP_actual = dP_design × (Q_actual/Q_max)².
      const dP_achieved_in_wc = capacity > 0 ? dP_in_wc * Math.pow(required_cfh / capacity, 2) : null;
      return { required_cfh, recommended_size: size, capacity_cfh: capacity, dP_in_wc, dP_achieved_in_wc };
    }
  }
  return { required_cfh, recommended_size: "larger than " + candidate_sizes[candidate_sizes.length - 1], capacity_cfh: null, dP_achieved_in_wc: null };
}

export const gasPipeSizingExample = {
  inputs: { btu_load: 100000, length_ft: 50, gas: "natural_gas" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGasPipeSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IFGC 2021 Table 402.4 (NFPA 54). Spitzglass low-pressure gas formula Q = 3550 * sqrt(d^5 * dP / (SG * L * (1 + 3.6/d + 0.03*d))), the diameter-correction term included as the tile computes it. AHJ governs. Free at codes.iccsafe.org.";
  const btu = makeNumber("BTU load (BTU/hr)", "gp-btu", { step: "any", min: "0" });
  const length = makeNumber("Pipe length (ft)", "gp-len", { step: "any", min: "0" });
  const dP = makeNumber("Allowable pressure drop (in w.c.)", "gp-dp", { step: "any", min: "0", value: "0.5" });
  dP.input.value = "0.5";
  const gas = makeSelect("Gas", "gp-gas", [
    { value: "natural_gas", label: "Natural gas" }, { value: "propane", label: "Propane" },
  ]);
  for (const f of [btu, length, dP, gas]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { btu.input.value = "100000"; length.input.value = "50"; dP.input.value = "0.5"; gas.select.value = "natural_gas"; update(); });
  const oR = makeOutputLine(outputRegion, "Required capacity", "gp-out-r");
  const oS = makeOutputLine(outputRegion, "Recommended size", "gp-out-s");
  // v8 §C.2: actual achieved pressure drop at the chosen size + actual load.
  const oD = makeOutputLine(outputRegion, "Achieved pressure drop", "gp-out-d");
  const update = debounce(() => {
    const r = computeGasPipeSizing({
      btu_load: Number(btu.input.value) || 0, length_ft: Number(length.input.value) || 0,
      gas: gas.select.value, dP_in_wc: Number(dP.input.value) || 0.5,
    });
    if (r.error) { oR.textContent = r.error; oS.textContent = "-"; oD.textContent = "-"; return; }
    oR.textContent = fmt(r.required_cfh, 1) + " ft^3/hr";
    oS.textContent = String(r.recommended_size).includes("larger") ? r.recommended_size : (r.recommended_size + "\"");
    oD.textContent = r.dP_achieved_in_wc === null ? "(no size fits the load; oversize the pipe or relax dP)"
      : fmt(r.dP_achieved_in_wc, 3) + " in WC (allowable " + fmt(r.dP_in_wc, 2) + ")";
  }, DEBOUNCE_MS);
  for (const el of [btu.input, length.input, dP.input, gas.select]) el.addEventListener("input", update);
}
GAS_RENDERERS["gas-pipe-sizing"] = renderGasPipeSizing;

// =====================================================================
// gas-leak-rate (Group B) - orifice flow leak estimate.
//
// Q (cfh) = 3550 * c * A * sqrt(dP / SG / L_unit_factor)
// Simplified per spec-v2: Q (cfh) = 3550 * c * A * sqrt(dP / SG)
// where A is orifice area in in^2, dP in psi (gauge), SG is gas specific
// gravity. This is a Spitzglass-style leak estimate, not an authoritative value.
// =====================================================================

// dims: in { orifice_diameter_in: L, upstream_psi: M L^-1 T^-2, gas: dimensionless, c: dimensionless } out: { leak_rate_scfh: L^3 T^-1 }
export function computeGasLeakRate({ orifice_diameter_in, upstream_psi, gas, c = 0.7 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  c = Number(c);
  const props = GAS_PROPERTIES[gas];
  if (!props) return { error: "Unknown gas." };
  const d = Number(orifice_diameter_in) || 0;
  const dP = Number(upstream_psi) || 0;
  if (d <= 0 || dP <= 0) return { error: "Provide positive orifice diameter and pressure." };
  const A = Math.PI * (d / 2) ** 2;
  const Q = 3550 * c * A * Math.sqrt(dP / props.specific_gravity);
  return {
    leak_rate_cfh: Q,
    orifice_area_in2: A,
    discharge_coefficient: c,
    specific_gravity: props.specific_gravity,
  };
}

export const gasLeakRateExample = {
  inputs: { orifice_diameter_in: 0.05, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 },
  expectedRange: { leak_rate_cfh: { min: 1, max: 10 } },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGasLeakRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Q = 3550 * c * A * sqrt(dP / SG). Orifice flow approximation for a small gas leak. Estimation only.";
  const dia = makeNumber("Orifice diameter (in)", "gl-d", { step: "any", min: "0" });
  const psi = makeNumber("Upstream gauge pressure (psi)", "gl-p", { step: "any", min: "0" });
  const c = makeNumber("Discharge coefficient", "gl-c", { step: "any", min: "0", max: "1", value: "0.7" });
  c.input.value = "0.7";
  const gas = makeSelect("Gas", "gl-g", [
    { value: "natural_gas", label: "Natural gas" }, { value: "propane", label: "Propane" },
  ]);
  for (const f of [dia, psi, c, gas]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "0.05"; psi.input.value = "0.25"; c.input.value = "0.7"; gas.select.value = "natural_gas"; update(); });
  const oQ = makeOutputLine(outputRegion, "Leak rate", "gl-out-q");
  const oA = makeOutputLine(outputRegion, "Orifice area", "gl-out-a");
  const update = debounce(() => {
    const r = computeGasLeakRate({
      orifice_diameter_in: Number(dia.input.value) || 0,
      upstream_psi: Number(psi.input.value) || 0,
      c: Number(c.input.value) || 0.7,
      gas: gas.select.value,
    });
    if (r.error) { oQ.textContent = r.error; oA.textContent = "-"; return; }
    oQ.textContent = fmt(r.leak_rate_cfh, 2) + " ft^3/hr";
    oA.textContent = fmt(r.orifice_area_in2, 5) + " in^2";
  }, DEBOUNCE_MS);
  for (const el of [dia.input, psi.input, c.input, gas.select]) el.addEventListener("input", update);
}
GAS_RENDERERS["gas-leak-rate"] = renderGasLeakRate;

// gas-leak-hole-diameter: inverse of gas-leak-rate. The forward tile gives the leak rate from the orifice diameter; the
// inverse recovers the equivalent orifice (hole) diameter from a measured leak rate, so an estimator turns a clocked or
// metered leak into a hole size. From Q = 3550 c (pi d^2 / 4) sqrt(dP / SG),
// d = sqrt( 4 Q / (3550 c pi sqrt(dP / SG)) ). Distinct from orifice-diameter-for-flow (the WATER orifice-discharge
// inverse); this uses the 3550-coefficient compressible small-leak form and the gas specific gravity.
// dims: in { leak_rate_cfh: L^3 T^-1, upstream_psi: M L^-1 T^-2, gas: dimensionless, c: dimensionless } out: { orifice_diameter_in: L, orifice_area_in2: L^2 }
export function computeGasLeakHoleDiameter({ leak_rate_cfh, upstream_psi, gas, c = 0.7 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const props = GAS_PROPERTIES[gas];
  if (!props) return { error: "Unknown gas." };
  const Q = Number(leak_rate_cfh) || 0;
  const dP = Number(upstream_psi) || 0;
  const cd = Number(c) || 0;
  if (!(Q > 0)) return { error: "Provide a positive leak rate (cfh)." };
  if (!(dP > 0)) return { error: "Provide a positive upstream pressure (psi)." };
  if (!(cd > 0)) return { error: "Discharge coefficient must be positive." };
  const orifice_area_in2 = Q / (3550 * cd * Math.sqrt(dP / props.specific_gravity));
  const orifice_diameter_in = Math.sqrt(4 * orifice_area_in2 / Math.PI);
  if (![orifice_area_in2, orifice_diameter_in].every(Number.isFinite)) return { error: "Hole-diameter math is not a finite value." };
  return {
    orifice_diameter_in,
    orifice_area_in2,
    discharge_coefficient: cd,
    specific_gravity: props.specific_gravity,
    note: "Equivalent orifice diameter for a measured gas leak: from Q = 3550 c A sqrt(dP / SG) with A = pi d^2 / 4, d = sqrt( 4 Q / (3550 c pi sqrt(dP / SG)) ). This is the small-leak orifice-flow approximation (compressible, subsonic) - an ESTIMATE of the effective hole size, not a code leak-test method. The discharge coefficient (~0.7 for a sharp orifice) and the actual crack geometry, temperature, and choked-flow at high pressure ratios all shift it. Any positive leak is a hazard: find and repair it, and follow the code test and the utility's procedure.",
  };
}
export const gasLeakHoleDiameterExample = {
  inputs: { leak_rate_cfh: 3.15, upstream_psi: 0.25, gas: "natural_gas", c: 0.7 },
  expectedRange: { orifice_diameter_in: { min: 0.01, max: 0.2 } },
};
function renderGasLeakHoleDiameter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: d = sqrt( 4 Q / (3550 * c * pi * sqrt(dP / SG)) ), the orifice-flow leak approximation Q = 3550 c A sqrt(dP/SG) solved for the diameter. An estimate of the effective hole size, not a code leak-test method. Estimation only.";
  const q = makeNumber("Measured leak rate (ft³/hr)", "glh-q", { step: "any", min: "0" });
  const psi = makeNumber("Upstream gauge pressure (psi)", "glh-p", { step: "any", min: "0" });
  const c = makeNumber("Discharge coefficient", "glh-c", { step: "any", min: "0", max: "1", value: "0.7" });
  c.input.value = "0.7";
  const gas = makeSelect("Gas", "glh-g", [
    { value: "natural_gas", label: "Natural gas" }, { value: "propane", label: "Propane" },
  ]);
  for (const f of [q, psi, c, gas]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "3.15"; psi.input.value = "0.25"; c.input.value = "0.7"; gas.select.value = "natural_gas"; update(); });
  const oD = makeOutputLine(outputRegion, "Equivalent orifice diameter", "glh-out-d");
  const oA = makeOutputLine(outputRegion, "Orifice area", "glh-out-a");
  const oN = makeOutputLine(outputRegion, "Note", "glh-out-n");
  const update = debounce(() => {
    const r = computeGasLeakHoleDiameter({
      leak_rate_cfh: Number(q.input.value) || 0,
      upstream_psi: Number(psi.input.value) || 0,
      c: Number(c.input.value) || 0.7,
      gas: gas.select.value,
    });
    if (r.error) { oD.textContent = r.error; oA.textContent = "-"; oN.textContent = ""; return; }
    oD.textContent = fmt(r.orifice_diameter_in, 4) + " in";
    oA.textContent = fmt(r.orifice_area_in2, 5) + " in^2";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [q.input, psi.input, c.input, gas.select]) el.addEventListener("input", update);
}
GAS_RENDERERS["gas-leak-hole-diameter"] = renderGasLeakHoleDiameter;

// =====================================================================
// gas-pipe-pressure-drop (Group B) - v20 B.3 longhand Spitzglass drop.
// Spitzglass low-pressure: Q = 3550 * K * sqrt((dH * D^5) / (SG * L)), where
// K = 1/sqrt(1 + 3.6/D + 0.03*D) is the Spitzglass diameter correction. Solve
// for dH given Q; velocity from Q and bore area.
// =====================================================================

// dims: in { flow_cfh: L^3*T^-1, id_in: L, length_ft: L, sg: dimensionless } out: { drop_inwc: M*L^-1*T^-2, velocity_fpm: L*T^-1 }
export function computeGasPipePressureDrop({ flow_cfh = 0, id_in = 0, length_ft = 0, sg = 0.6 } = {}) {
  const Q = Number(flow_cfh) || 0;
  const D = Number(id_in) || 0;
  const L = Number(length_ft) || 0;
  const SG = Number(sg) || 0;
  if (!(Q > 0 && Number.isFinite(Q))) return { error: "Gas flow must be positive (CFH)." };
  if (!(D > 0 && Number.isFinite(D))) return { error: "Pipe inside diameter must be positive (in)." };
  if (!(L > 0 && Number.isFinite(L))) return { error: "Pipe length must be positive (ft)." };
  if (!(SG > 0 && Number.isFinite(SG))) return { error: "Gas specific gravity must be positive." };
  const spitz = 1 + 3.6 / D + 0.03 * D;
  const dH = Math.pow(Q / 3550, 2) * SG * L * spitz / Math.pow(D, 5);
  const areaFt2 = Math.PI / 4 * Math.pow(D / 12, 2);
  const velocity = Q / areaFt2 / 60;
  const LOW_PRESSURE_LIMIT_INWC = 41.5; // ~1.5 psi
  return {
    drop_inwc: Number.isFinite(dH) ? dH : null,
    velocity_fpm: Number.isFinite(velocity) ? velocity : null,
    exceeds_low_pressure: dH > LOW_PRESSURE_LIMIT_INWC,
    note: (dH > LOW_PRESSURE_LIMIT_INWC ? "Drop exceeds the ~1.5 psi low-pressure validity range - use the high-pressure compressible form. " : "")
      + "Inside diameter must be the actual bore, not nominal. Longhand alternative to the NFPA 54 / IFGC capacity tables; NFPA 54 governs the installation.",
  };
}
export const gasPipePressureDropExample = { inputs: { flow_cfh: 1000, id_in: 1.049, length_ft: 100, sg: 0.6 } };

function renderGasPipePressureDrop(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the published Spitzglass low-pressure gas-flow equation (public engineering formula). The longhand alternative to the NFPA 54 / IFGC capacity tables that the gas-pipe-sizing tile uses; NFPA 54 governs the installation. Inside diameter must be the actual bore. Free read-only at nfpa.org/freeaccess and codes.iccsafe.org.";
  const q = makeNumber("Gas flow (CFH)", "gpd-q", { step: "any", min: "0" });
  const d = makeNumber("Pipe inside diameter (in, actual bore)", "gpd-d", { step: "any", min: "0" });
  const len = makeNumber("Pipe length (ft)", "gpd-len", { step: "any", min: "0" });
  const sg = makeNumber("Gas specific gravity", "gpd-sg", { step: "any", min: "0" });
  for (const f of [q, d, len, sg]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "1000"; d.input.value = "1.049"; len.input.value = "100"; sg.input.value = "0.6"; update(); });
  const oDrop = makeOutputLine(outputRegion, "Pressure drop", "gpd-out-drop");
  const oVel = makeOutputLine(outputRegion, "Velocity", "gpd-out-vel");
  const oNote = makeOutputLine(outputRegion, "Note", "gpd-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGasPipePressureDrop({ flow_cfh: readNum(q.input), id_in: readNum(d.input), length_ft: readNum(len.input), sg: readNum(sg.input) });
    if (r.error) { oDrop.textContent = r.error; oVel.textContent = ""; oNote.textContent = ""; return; }
    oDrop.textContent = fmt(r.drop_inwc, 2) + " in w.c." + (r.exceeds_low_pressure ? " (exceeds low-pressure range)" : "");
    oVel.textContent = fmt(r.velocity_fpm, 0) + " fpm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [q.input, d.input, len.input, sg.input]) f.addEventListener("input", update);
}
GAS_RENDERERS["gas-pipe-pressure-drop"] = renderGasPipePressureDrop;

// =====================================================================
// spec-v644 gas-pipe-max-flow (Group B) - the Spitzglass capacity inverse.
// The flow a bore carries within an allowable drop: solve the same
// Spitzglass relation for Q. Q = 3550 * sqrt((dH * D^5) / (SG * L * K')),
// K' = 1 + 3.6/D + 0.03*D. The inverse of gas-pipe-pressure-drop.
// =====================================================================

// dims: in { drop_inwc: M*L^-1*T^-2, id_in: L, length_ft: L, sg: dimensionless } out: { flow_cfh: L^3*T^-1, velocity_fpm: L*T^-1 }
export function computeGasPipeMaxFlow({ drop_inwc = 0, id_in = 0, length_ft = 0, sg = 0.6 } = {}) {
  const dH = Number(drop_inwc) || 0;
  const D = Number(id_in) || 0;
  const L = Number(length_ft) || 0;
  const SG = Number(sg) || 0;
  if (!(dH > 0 && Number.isFinite(dH))) return { error: "Allowable pressure drop must be positive (in w.c.)." };
  if (!(D > 0 && Number.isFinite(D))) return { error: "Pipe inside diameter must be positive (in)." };
  if (!(L > 0 && Number.isFinite(L))) return { error: "Pipe length must be positive (ft)." };
  if (!(SG > 0 && Number.isFinite(SG))) return { error: "Gas specific gravity must be positive." };
  const spitz = 1 + 3.6 / D + 0.03 * D;
  const flow_cfh = 3550 * Math.sqrt(dH * Math.pow(D, 5) / (SG * L * spitz));
  const areaFt2 = Math.PI / 4 * Math.pow(D / 12, 2);
  const velocity = flow_cfh / areaFt2 / 60;
  const LOW_PRESSURE_LIMIT_INWC = 41.5; // ~1.5 psi
  return {
    flow_cfh: Number.isFinite(flow_cfh) ? flow_cfh : null,
    velocity_fpm: Number.isFinite(velocity) ? velocity : null,
    exceeds_low_pressure: dH > LOW_PRESSURE_LIMIT_INWC,
    note: (dH > LOW_PRESSURE_LIMIT_INWC ? "The allowable drop exceeds the ~1.5 psi low-pressure validity range - use the high-pressure compressible form. " : "")
      + "Inside diameter must be the actual bore, not nominal. Longhand Spitzglass alternative to the NFPA 54 / IFGC capacity tables, the inverse of the gas-pipe pressure-drop tile; NFPA 54 governs the installation.",
  };
}
export const gasPipeMaxFlowExample = { inputs: { drop_inwc: 0.5, id_in: 1.049, length_ft: 100, sg: 0.6 } };

function renderGasPipeMaxFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the published Spitzglass low-pressure gas-flow equation (public engineering formula), solved for the flow - the capacity a bore carries within an allowable drop, the inverse of the gas-pipe pressure-drop tile and a longhand alternative to the NFPA 54 / IFGC capacity tables; NFPA 54 governs the installation. Inside diameter must be the actual bore. Free read-only at nfpa.org/freeaccess and codes.iccsafe.org.";
  const dh = makeNumber("Allowable pressure drop (in w.c.)", "gmf-dh", { step: "any", min: "0" });
  const d = makeNumber("Pipe inside diameter (in, actual bore)", "gmf-d", { step: "any", min: "0" });
  const len = makeNumber("Pipe length (ft)", "gmf-len", { step: "any", min: "0" });
  const sg = makeNumber("Gas specific gravity", "gmf-sg", { step: "any", min: "0" });
  for (const f of [dh, d, len, sg]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dh.input.value = "0.5"; d.input.value = "1.049"; len.input.value = "100"; sg.input.value = "0.6"; update(); });
  const oFlow = makeOutputLine(outputRegion, "Max flow", "gmf-out-flow");
  const oVel = makeOutputLine(outputRegion, "Velocity at that flow", "gmf-out-vel");
  const oNote = makeOutputLine(outputRegion, "Note", "gmf-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGasPipeMaxFlow({ drop_inwc: readNum(dh.input), id_in: readNum(d.input), length_ft: readNum(len.input), sg: readNum(sg.input) });
    if (r.error) { oFlow.textContent = r.error; oVel.textContent = ""; oNote.textContent = ""; return; }
    oFlow.textContent = fmt(r.flow_cfh, 0) + " CFH" + (r.exceeds_low_pressure ? " (drop exceeds low-pressure range)" : "");
    oVel.textContent = fmt(r.velocity_fpm, 0) + " fpm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [dh.input, d.input, len.input, sg.input]) f.addEventListener("input", update);
}
GAS_RENDERERS["gas-pipe-max-flow"] = renderGasPipeMaxFlow;

// =====================================================================
// spec-v111: gas-altitude-derate (Group B) - high-altitude appliance input
// derate (NFPA 54 / IFGC). The derated maximum input at altitude and the
// kit flag. derate above a threshold elevation, the common
// 4-percent-per-1000-ft-above-2000-ft convention (editable, edition varies).
// =====================================================================

// dims: in { nameplate_input_btuh: M L^2 T^-3, elevation_ft: L, derate_pct_per_1000: dimensionless, threshold_ft: L } out: { steps_1000: dimensionless, factor: dimensionless, derated_input_btuh: M L^2 T^-3 }
export function computeGasAltitudeDerate({ nameplate_input_btuh = 0, elevation_ft = 0, derate_pct_per_1000 = 4, threshold_ft = 2000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(nameplate_input_btuh > 0)) return { error: "Nameplate input must be positive (BTU/hr)." };
  if (elevation_ft < 0) return { error: "Elevation must be non-negative (ft)." };
  if (derate_pct_per_1000 < 0) return { error: "Derate percent must be non-negative." };
  if (threshold_ft < 0) return { error: "Threshold elevation must be non-negative (ft)." };
  const steps_1000 = Math.max(0, (elevation_ft - threshold_ft) / 1000);
  const factor = Math.max(0, 1 - (derate_pct_per_1000 / 100) * steps_1000);
  const derated_input_btuh = nameplate_input_btuh * factor;
  const needs_kit = elevation_ft > threshold_ft;
  const flag = needs_kit
    ? "above " + fmt(threshold_ft, 0) + " ft - verify a listed high-altitude orifice/kit per the manufacturer's instructions"
    : "at or below " + fmt(threshold_ft, 0) + " ft - no derate, no high-altitude kit";
  return {
    steps_1000, factor, derated_input_btuh, needs_kit, flag,
    note: "Air thins with altitude, so a gas appliance must be derated above a threshold elevation. The common convention is 4% per 1000 ft above 2000 ft (both editable) - the exact basis differs by code edition and jurisdiction, and the manufacturer's instructions and the AHJ govern. Field orifice drilling is generally prohibited; use a listed manufacturer high-altitude conversion kit. The factor is floored at zero.",
  };
}
export const gasAltitudeDerateExample = { inputs: { nameplate_input_btuh: 100000, elevation_ft: 6000, derate_pct_per_1000: 4, threshold_ft: 2000 } };

function renderGasAltitudeDerate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NFPA 54 (National Fuel Gas Code) / IFGC high-altitude provision (by name, not reproduced). The 4-percent-per-1000-ft-above-2000-ft derate is the common editable convention; the exact basis varies by edition and AHJ. Field orifice drilling is generally prohibited - use a listed manufacturer kit. Free read-only at nfpa.org/freeaccess.";
  const input = makeNumber("Nameplate input (BTU/hr)", "gad-in", { step: "any", min: "0" });
  const elev = makeNumber("Installation elevation (ft)", "gad-elev", { step: "any", min: "0" });
  const pct = makeNumber("Derate (% per 1000 ft)", "gad-pct", { step: "any", min: "0", value: "4" });
  pct.input.value = "4";
  const thr = makeNumber("Derate threshold (ft)", "gad-thr", { step: "any", min: "0", value: "2000" });
  thr.input.value = "2000";
  for (const f of [input, elev, pct, thr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { input.input.value = "100000"; elev.input.value = "6000"; pct.input.value = "4"; thr.input.value = "2000"; update(); });
  const oF = makeOutputLine(outputRegion, "Derated input", "gad-out-f");
  const oP = makeOutputLine(outputRegion, "Derate factor", "gad-out-p");
  const oK = makeOutputLine(outputRegion, "High-altitude kit", "gad-out-k");
  const oN = makeOutputLine(outputRegion, "Note", "gad-out-n");
  const update = debounce(() => {
    const r = computeGasAltitudeDerate({
      nameplate_input_btuh: Number(input.input.value) || 0, elevation_ft: Number(elev.input.value) || 0,
      derate_pct_per_1000: Number(pct.input.value) || 0, threshold_ft: Number(thr.input.value) || 0,
    });
    if (r.error) { oF.textContent = r.error; oP.textContent = "-"; oK.textContent = "-"; oN.textContent = "-"; return; }
    oF.textContent = fmt(r.derated_input_btuh, 0) + " BTU/hr";
    oP.textContent = fmt(r.factor * 100, 1) + "% of nameplate (" + fmt(r.steps_1000, 2) + " steps)";
    oK.textContent = r.flag;
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [input.input, elev.input, pct.input, thr.input]) f.addEventListener("input", update);
}
GAS_RENDERERS["gas-altitude-derate"] = renderGasAltitudeDerate;

// =====================================================================
// spec-v111: gas-fuel-conversion (Group B) - natural-gas / propane conversion.
// What changes between NG and LP at the same appliance input: the required
// volumetric flow for each fuel, and the orifice-area ratio from first-
// principles orifice flow Q ~ A x sqrt(P / SG). The fuel selects set the
// heating-value / specific-gravity / manifold-pressure defaults, each editable.
// =====================================================================

const _FUEL_DEFAULTS = {
  natural_gas: { hv: 1030, sg: 0.60, p: 3.5 },
  propane: { hv: 2500, sg: 1.52, p: 11.0 },
};

// dims: in { appliance_input_btuh: M L^2 T^-3, hv_from: M L^-1 T^-2, hv_to: M L^-1 T^-2, sg_from: dimensionless, sg_to: dimensionless, p_from: M L^-1 T^-2, p_to: M L^-1 T^-2 } out: { cfh_from: L^3 T^-1, cfh_to: L^3 T^-1, area_ratio: dimensionless }
export function computeGasFuelConversion({ appliance_input_btuh = 0, hv_from = 1030, hv_to = 2500, sg_from = 0.60, sg_to = 1.52, p_from = 3.5, p_to = 11.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(appliance_input_btuh > 0)) return { error: "Appliance input must be positive (BTU/hr)." };
  if (!(hv_from > 0) || !(hv_to > 0)) return { error: "Heating values must be positive (BTU/cf)." };
  if (!(sg_from > 0) || !(sg_to > 0)) return { error: "Specific gravities must be positive." };
  if (!(p_from > 0) || !(p_to > 0)) return { error: "Manifold pressures must be positive (in. w.c.)." };
  const cfh_from = appliance_input_btuh / hv_from;
  const cfh_to = appliance_input_btuh / hv_to;
  const area_ratio = (cfh_to / cfh_from) * Math.sqrt((p_from / sg_from) / (p_to / sg_to));
  let direction;
  if (Math.abs(area_ratio - 1) < 1e-9) direction = "same orifice area (the two fuels match at these values)";
  else if (area_ratio < 1) direction = "the new orifice is smaller (" + fmt(area_ratio * 100, 0) + "% of the original area) - drill DOWN; use the listed kit";
  else direction = "the new orifice is larger (" + fmt(area_ratio * 100, 0) + "% of the original area) - use the listed kit";
  return {
    cfh_from, cfh_to, area_ratio, direction,
    note: "At the same appliance input the volumetric flow scales with the fuel heating value (cfh = input / heating value), and orifice flow goes as area x sqrt(manifold pressure / specific gravity), so the area ratio holds input across the change. Propane carries far more energy per cubic foot than natural gas, so the LP orifice is much smaller. Field orifice drilling is generally prohibited - install the listed manufacturer NG/LP conversion kit; the manufacturer's instructions and the AHJ govern.",
  };
}
export const gasFuelConversionExample = { inputs: { appliance_input_btuh: 100000, hv_from: 1030, hv_to: 2500, sg_from: 0.60, sg_to: 1.52, p_from: 3.5, p_to: 11.0 } };

function renderGasFuelConversion(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles orifice flow Q ~ A x sqrt(P / SG) holding appliance input, with cfh = input / heating value (public). The default NG/LP heating values (1030/2500 BTU/cf), specific gravities (0.60/1.52), and manifold pressures (3.5/11.0 in. w.c.) are editable. Field orifice drilling is generally prohibited - use a listed conversion kit; the manufacturer and AHJ govern.";
  const inp = makeNumber("Appliance input (BTU/hr)", "gfc-in", { step: "any", min: "0" });
  const fromFuel = makeSelect("From fuel", "gfc-from", [
    { value: "natural_gas", label: "Natural gas" }, { value: "propane", label: "Propane" },
  ]);
  const toFuel = makeSelect("To fuel", "gfc-to", [
    { value: "natural_gas", label: "Natural gas" }, { value: "propane", label: "Propane" },
  ]);
  toFuel.select.value = "propane";
  const hvFrom = makeNumber("From heating value (BTU/cf)", "gfc-hvf", { step: "any", min: "0", value: "1030" });
  const hvTo = makeNumber("To heating value (BTU/cf)", "gfc-hvt", { step: "any", min: "0", value: "2500" });
  const sgFrom = makeNumber("From specific gravity", "gfc-sgf", { step: "any", min: "0", value: "0.60" });
  const sgTo = makeNumber("To specific gravity", "gfc-sgt", { step: "any", min: "0", value: "1.52" });
  const pFrom = makeNumber("From manifold pressure (in w.c.)", "gfc-pf", { step: "any", min: "0", value: "3.5" });
  const pTo = makeNumber("To manifold pressure (in w.c.)", "gfc-pt", { step: "any", min: "0", value: "11.0" });
  hvFrom.input.value = "1030"; hvTo.input.value = "2500"; sgFrom.input.value = "0.60"; sgTo.input.value = "1.52"; pFrom.input.value = "3.5"; pTo.input.value = "11.0";
  for (const f of [inp, fromFuel, toFuel, hvFrom, hvTo, sgFrom, sgTo, pFrom, pTo]) inputRegion.appendChild(f.wrap);
  // Selecting a fuel autofills its three editable defaults (still overridable).
  function applyFuel(side) {
    const d = side === "from" ? _FUEL_DEFAULTS[fromFuel.select.value] : _FUEL_DEFAULTS[toFuel.select.value];
    if (!d) return;
    if (side === "from") { hvFrom.input.value = String(d.hv); sgFrom.input.value = String(d.sg); pFrom.input.value = String(d.p); }
    else { hvTo.input.value = String(d.hv); sgTo.input.value = String(d.sg); pTo.input.value = String(d.p); }
  }
  attachExampleButton(inputRegion, () => {
    inp.input.value = "100000"; fromFuel.select.value = "natural_gas"; toFuel.select.value = "propane";
    applyFuel("from"); applyFuel("to"); update();
  });
  const oCf = makeOutputLine(outputRegion, "From-fuel flow", "gfc-out-cf");
  const oCt = makeOutputLine(outputRegion, "To-fuel flow", "gfc-out-ct");
  const oR = makeOutputLine(outputRegion, "Orifice area ratio (to / from)", "gfc-out-r");
  const oD = makeOutputLine(outputRegion, "Direction", "gfc-out-d");
  const oN = makeOutputLine(outputRegion, "Note", "gfc-out-n");
  const update = debounce(() => {
    const r = computeGasFuelConversion({
      appliance_input_btuh: Number(inp.input.value) || 0,
      hv_from: Number(hvFrom.input.value) || 0, hv_to: Number(hvTo.input.value) || 0,
      sg_from: Number(sgFrom.input.value) || 0, sg_to: Number(sgTo.input.value) || 0,
      p_from: Number(pFrom.input.value) || 0, p_to: Number(pTo.input.value) || 0,
    });
    if (r.error) { oCf.textContent = r.error; oCt.textContent = "-"; oR.textContent = "-"; oD.textContent = "-"; oN.textContent = "-"; return; }
    oCf.textContent = fmt(r.cfh_from, 2) + " cfh";
    oCt.textContent = fmt(r.cfh_to, 2) + " cfh";
    oR.textContent = fmt(r.area_ratio, 3);
    oD.textContent = r.direction;
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  fromFuel.select.addEventListener("change", () => { applyFuel("from"); update(); });
  toFuel.select.addEventListener("change", () => { applyFuel("to"); update(); });
  for (const el of [inp.input, hvFrom.input, hvTo.input, sgFrom.input, sgTo.input, pFrom.input, pTo.input]) el.addEventListener("input", update);
}
GAS_RENDERERS["gas-fuel-conversion"] = renderGasFuelConversion;

// =====================================================================
// spec-v206: medgas-demand (Group B) - Medical Gas System Demand and
// Diversity (NFPA 99). Medical-gas piping is installed and certified by
// brazing-qualified plumbers and pipefitters (ASSE 6010). The first sizing
// step for an oxygen, medical-air, nitrous, or vacuum main is the demand:
// connected flow = station count x per-station design flow, and the system
// design flow = connected x a diversity (simultaneous-use) factor that
// falls as the station count rises. The per-station flows and diversity
// factors are read from the adopted NFPA 99 edition and the facility's
// equipment list (user-supplied here); a medical-gas verifier and the AHJ
// govern. This gives the design flow that feeds pipe sizing, not the
// system design itself.
// =====================================================================

// dims: in { stations: dimensionless, per_station_scfm: L^3 T^-1, diversity: dimensionless } out: { connected_scfm: L^3 T^-1, design_scfm: L^3 T^-1 }
export function computeMedgasDemand({ stations = 0, per_station_scfm = 0, diversity = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Number(stations), q = Number(per_station_scfm), d = Number(diversity);
  if (!(n > 0)) return { error: "Station count must be positive." };
  if (!(q > 0)) return { error: "Per-station flow must be positive (scfm)." };
  if (!(d > 0 && d <= 1)) return { error: "Diversity factor must be in (0, 1]." };
  const connected_scfm = n * q;
  const design_scfm = connected_scfm * d;
  return { connected_scfm, design_scfm };
}
export const medgasDemandExample = { inputs: { stations: 20, per_station_scfm: 1.0, diversity: 0.25 } };

function renderMedgasDemand(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Medical-gas demand - connected flow = stations x per-station design flow, system design flow = connected x diversity (simultaneous-use) factor, per NFPA 99 Health Care Facilities Code (medical gas and vacuum systems), with ASSE 6010 for the installer qualification, by name. The per-station design flows and diversity factors are read from the adopted NFPA 99 edition and the facility's equipment list (user-supplied here); a medical-gas verifier and the AHJ govern. This gives the design flow that feeds pipe sizing, not the system design itself - a demand aggregation, not a med-gas system stamp.";
  const st = makeNumber("Stations (outlets / inlets)", "mg-st", { step: "1", min: "0" });
  const q = makeNumber("Per-station design flow (scfm)", "mg-q", { step: "any", min: "0" });
  const div = makeNumber("Diversity (simultaneous-use) factor, 0-1", "mg-div", { step: "any", min: "0", max: "1", value: "0.25" });
  div.input.value = "0.25";
  for (const f of [st, q, div]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { st.input.value = "20"; q.input.value = "1.0"; div.input.value = "0.25"; update(); });
  const oConn = makeOutputLine(outputRegion, "Connected flow (all stations)", "mg-out-conn");
  const oDesign = makeOutputLine(outputRegion, "System design flow (sized for)", "mg-out-design");
  const update = debounce(() => {
    const r = computeMedgasDemand({ stations: Number(st.input.value) || 0, per_station_scfm: Number(q.input.value) || 0, diversity: Number(div.input.value) || 0 });
    if (r.error) { oConn.textContent = r.error; oDesign.textContent = "-"; return; }
    oConn.textContent = fmt(r.connected_scfm, 2) + " scfm";
    oDesign.textContent = fmt(r.design_scfm, 2) + " scfm";
  }, DEBOUNCE_MS);
  for (const f of [st.input, q.input, div.input]) f.addEventListener("input", update);
}
GAS_RENDERERS["medgas-demand"] = renderMedgasDemand;

// ===================== spec-v977: Wobbe index (fuel-gas interchangeability) =====================
// dims: in { args: dimensionless } out: { wobbe_index_btu_ft3: dimensionless }
export function computeWobbeIndex({ hhv_btu_ft3 = 1000, specific_gravity = 0.60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hhv_btu_ft3 > 0)) return { error: "Higher heating value must be positive (BTU/ft^3)." };
  if (!(specific_gravity > 0)) return { error: "Specific gravity must be positive." };
  // Wobbe index = HHV / sqrt(SG): the heat delivered through a fixed orifice at a fixed pressure.
  const wobbe_index_btu_ft3 = hhv_btu_ft3 / Math.sqrt(specific_gravity);
  if (!Number.isFinite(wobbe_index_btu_ft3)) return { error: "Wobbe-index math is not a finite value." };
  return {
    wobbe_index_btu_ft3,
    note: "The Wobbe index, the single number that governs fuel-gas interchangeability: WI = HHV / sqrt(specific gravity), where HHV is the higher heating value (BTU/ft^3) and SG is the gas density relative to air. Because the flow through a fixed orifice at a fixed pressure goes as 1/sqrt(SG) and the heat carried goes as the HHV, TWO GASES OF EQUAL WOBBE DELIVER THE SAME HEAT INPUT through the same orifice at the same manifold pressure -- so an appliance set up for one runs correctly on the other without changing the orifice. Natural gas at 1,000 BTU/ft^3 and 0.60 SG has a Wobbe of about 1,291; propane at 2,516 BTU/ft^3 and 1.52 SG is about 2,040 -- far apart, which is exactly why an appliance MUST be converted (orifice and often manifold pressure changed) between them and cannot simply be switched. Within a fuel, a utility holds the Wobbe in a narrow band (a few percent) so appliances stay in tune as the gas composition shifts (propane-air peak shaving, LNG, or hydrogen blending all move it). Wobbe captures the orifice/heat-input behavior but NOT flame speed or the yellow-tipping/flashback limits, so a full interchangeability check (AGA indices) also considers those. The gas supplier's certified analysis, the appliance listing, and the manufacturer's conversion kit and the AHJ govern the actual conversion.",
  };
}

export const wobbeIndexExample = { inputs: { hhv_btu_ft3: 1000, specific_gravity: 0.60 } };

function _v977renderWobbeIndex(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Wobbe index of a fuel gas (AGA / ISO 13686 interchangeability), by name. WI = HHV / sqrt(specific gravity). Two gases of equal Wobbe deliver the same heat input through the same orifice at the same pressure. NG ~1,291, propane ~2,040. Captures orifice/heat-input, not flame speed; the supplier's analysis, the appliance listing, and the conversion kit govern.";
  const hv = makeNumber("Higher heating value (BTU/ft³)", "wob-hv", { step: "any", min: "0" });
  const sg = makeNumber("Specific gravity (vs air)", "wob-sg", { step: "any", min: "0" });
  for (const f of [hv, sg]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hv.input.value = "1000"; sg.input.value = "0.60"; update(); });
  const oW = makeOutputLine(outputRegion, "Wobbe index", "wob-out-w");
  const update = debounce(() => {
    const r = computeWobbeIndex({
      hhv_btu_ft3: hv.input.value === "" ? 1000 : Number(hv.input.value), specific_gravity: sg.input.value === "" ? 0.60 : Number(sg.input.value),
    });
    if (r.error) { oW.textContent = r.error; return; }
    oW.textContent = fmt(r.wobbe_index_btu_ft3, 0) + " BTU/ft^3 (NG ~1,291, propane ~2,040)";
  }, DEBOUNCE_MS);
  for (const f of [hv, sg]) f.input.addEventListener("input", update);
}
GAS_RENDERERS["wobbe-index"] = _v977renderWobbeIndex;

// --- spec-v1145: gas appliance connection check (IFGC 408.4 / 409.5 / 411.1.3.1) ---
// Three rules meet at the last three feet of gas piping, and one category cuts across all
// of them. 409.5 puts the shutoff in the SAME ROOM, within 6 ft of the appliance, and
// UPSTREAM of the union or connector. 408.4 wants a sediment trap downstream of that
// shutoff and as close to the inlet as practical - except for illuminating appliances,
// ranges, clothes dryers, decorative vented appliances for vented fireplaces, gas
// fireplaces, and outdoor grills. 411.1.3.1 caps a connector at 3 ft, except ranges and
// domestic clothes dryers at 6 ft. Notice that ranges and dryers appear in BOTH exceptions
// and that 409.5 also deems a shutoff behind such an appliance accessible: the code has a
// coherent idea of a movable appliance, and knowing that predicts all three answers.
// dims: in { appliance: dimensionless, shutoff_same_room: dimensionless, shutoff_distance_ft: L, shutoff_upstream: dimensionless, trap_present: dimensionless, trap_in_appliance: dimensionless, connector_length_ft: L } out: { shutoff_distance_deficit_ft: L, connector_limit_ft: L, connector_over_ft: L }
export function computeGasApplianceConnection({ appliance = "furnace", shutoff_same_room = "yes", shutoff_distance_ft = 0, shutoff_upstream = "yes", trap_present = "yes", trap_in_appliance = "no", connector_length_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dist = Number(shutoff_distance_ft) || 0;
  const conn = Number(connector_length_ft) || 0;
  const sameRoom = shutoff_same_room === "yes";
  const upstream = shutoff_upstream === "yes";
  const trap = trap_present === "yes";
  const trapBuiltIn = trap_in_appliance === "yes";
  const MOVABLE = ["range", "dryer"];
  const TRAP_EXEMPT = ["range", "dryer", "illuminating", "decorative-vented", "gas-fireplace", "outdoor-grill"];
  const KNOWN = ["furnace", "water-heater", "boiler", "range", "dryer", "illuminating", "decorative-vented", "gas-fireplace", "outdoor-grill", "other"];
  if (!KNOWN.includes(appliance)) return { error: "Appliance must be one of: " + KNOWN.join(", ") + "." };
  if (dist < 0) return { error: "Shutoff distance cannot be negative (ft)." };
  if (conn < 0) return { error: "Connector length cannot be negative (ft)." };

  const MAX_DIST = 6, CONN_SHORT = 3, CONN_LONG = 6;
  const movable = MOVABLE.includes(appliance);
  const distance_ok = dist <= MAX_DIST;
  const shutoff_distance_deficit_ft = Math.max(0, dist - MAX_DIST);
  const shutoff_ok = sameRoom && distance_ok && upstream;

  const trap_exempt = TRAP_EXEMPT.includes(appliance);
  const trap_required = !trap_exempt && !trapBuiltIn;
  const trap_ok = trap_required ? trap : null;

  const connector_limit_ft = movable ? CONN_LONG : CONN_SHORT;
  const has_connector = conn > 0;
  const connector_ok = has_connector ? conn <= connector_limit_ft : null;
  const connector_over_ft = has_connector ? Math.max(0, conn - connector_limit_ft) : 0;

  const passes = shutoff_ok && (trap_ok !== false) && (connector_ok !== false);

  const note = "SHUTOFF (409.5): in the SAME ROOM as the appliance, within " + MAX_DIST + " ft of it, and UPSTREAM of the union, connector, or quick-disconnect it serves. Here: " + (sameRoom ? "same room OK" : "NOT in the same room") + ", " + dist + " ft " + (distance_ok ? "OK" : "over by " + shutoff_distance_deficit_ft.toFixed(1) + " ft") + ", " + (upstream ? "upstream OK" : "NOT upstream - a valve downstream of the connector cannot isolate the connector, which is the part most likely to fail") + ". "
    + (movable ? "For a movable appliance like this one, 409.5 also deems a shutoff installed behind it to be accessible, so being hidden behind the range or dryer is not itself a violation. " : "")
    + "SEDIMENT TRAP (408.4): required downstream of the shutoff and as close to the inlet as practical, "
    + (trap_exempt ? "but this appliance type is on the exemption list - illuminating appliances, ranges, clothes dryers, decorative vented appliances for vented fireplaces, gas fireplaces, and outdoor grills need not be so equipped. None required. "
      : trapBuiltIn ? "and one is incorporated as part of the appliance, which satisfies it - 408.4 only applies where the appliance does not already have one. "
      : "and this appliance needs one: " + (trap ? "present, OK. " : "MISSING. A drip leg on the wrong side of the shutoff is also not a trap - it has to be DOWNSTREAM, or it protects nothing when the valve is closed for service. "))
    + "CONNECTOR (411.1.3.1): overall length not to exceed " + connector_limit_ft + " ft for this appliance"
    + (movable ? " - ranges and domestic clothes dryers get 6 ft where everything else gets 3. " : ", the general 3 ft limit. ")
    + (has_connector ? "This one is " + conn + " ft: " + (connector_ok ? "OK. " : "OVER by " + connector_over_ft.toFixed(1) + " ft. ") : "No connector length entered; hard-piped appliances have no connector to measure. ")
    + "THE PATTERN WORTH SEEING: ranges and clothes dryers appear in BOTH exceptions and get the accessibility allowance too. The code has a coherent idea of a movable appliance - one that gets pulled out to clean behind - and once you spot it, all three answers follow from the category rather than from three memorised lists. "
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: whether the connector is listed and of an approved type, connectors passing through walls, floors, ceilings, or partitions, which is prohibited; reuse of an old connector, which is not permitted; the piping size and pressure feeding the valve; appliance clearances, venting, and combustion air; CSST bonding; the leak test; or whether the appliance is approved for the fuel and altitude. A screen; the adopted code, the appliance listing, and the AHJ govern.";

  return { movable, shutoff_ok, distance_ok, shutoff_distance_deficit_ft, trap_exempt, trap_required, trap_ok, connector_limit_ft, has_connector, connector_ok, connector_over_ft, passes, note };
}

export const gasApplianceConnectionExample = { inputs: { appliance: "furnace", shutoff_same_room: "yes", shutoff_distance_ft: 4, shutoff_upstream: "yes", trap_present: "no", trap_in_appliance: "no", connector_length_ft: 4 } };

function _v1145renderGasApplianceConnection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IFGC 409.5 - the appliance shutoff valve located in the same room as the appliance, within 6 ft of it, and installed upstream of the union, connector, or quick-disconnect device it serves, with shutoff valves serving movable appliances such as cooking appliances and clothes dryers considered accessible where installed behind them. IFGC 408.4 - where a sediment trap is not incorporated as part of the appliance, a sediment trap installed downstream of the appliance shutoff valve as close to the inlet of the appliance as practical, with illuminating appliances, ranges, clothes dryers, decorative vented appliances for installation in vented fireplaces, gas fireplaces, and outdoor grills excepted. IFGC 411.1.3.1 - connectors with an overall length not to exceed 3 ft, except range and domestic clothes dryer connectors at 6 ft. Not checked: connector listing and type, connectors passing through building elements, connector reuse, upstream piping size and pressure, clearances, venting, combustion air, CSST bonding, leak testing, or fuel and altitude approval. A screen; the adopted code, the appliance listing, and the AHJ govern.";
  const ap = makeSelect("Appliance", "gac-ap", [
    { value: "furnace", label: "Furnace", selected: true }, { value: "water-heater", label: "Water heater" }, { value: "boiler", label: "Boiler" },
    { value: "range", label: "Range / cooking appliance" }, { value: "dryer", label: "Clothes dryer" }, { value: "illuminating", label: "Illuminating appliance" },
    { value: "decorative-vented", label: "Decorative appliance in a vented fireplace" }, { value: "gas-fireplace", label: "Gas fireplace" }, { value: "outdoor-grill", label: "Outdoor grill" }, { value: "other", label: "Other" },
  ]);
  const sr = makeSelect("Shutoff in the same room?", "gac-sr", [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }]);
  const sd = makeNumber("Shutoff distance to the appliance (ft)", "gac-sd", { step: "any", min: "0" });
  const su = makeSelect("Shutoff upstream of the connector?", "gac-su", [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }]);
  const tp = makeSelect("Sediment trap installed?", "gac-tp", [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }]);
  const ti = makeSelect("Trap built into the appliance?", "gac-ti", [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }]);
  const cl = makeNumber("Connector overall length (ft; 0 = hard piped)", "gac-cl", { step: "any", min: "0" });
  inputRegion.appendChild(ap.wrap); inputRegion.appendChild(sr.wrap); inputRegion.appendChild(sd.wrap);
  inputRegion.appendChild(su.wrap); inputRegion.appendChild(tp.wrap); inputRegion.appendChild(ti.wrap); inputRegion.appendChild(cl.wrap);
  attachExampleButton(inputRegion, () => { ap.select.value = "furnace"; sr.select.value = "yes"; sd.input.value = "4"; su.select.value = "yes"; tp.select.value = "no"; ti.select.value = "no"; cl.input.value = "4"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "gac-out-v");
  const oS = makeOutputLine(outputRegion, "Shutoff (409.5)", "gac-out-s");
  const oT = makeOutputLine(outputRegion, "Sediment trap (408.4)", "gac-out-t");
  const oC = makeOutputLine(outputRegion, "Connector (411.1.3.1)", "gac-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "gac-out-note");
  const update = debounce(() => {
    const r = computeGasApplianceConnection({ appliance: ap.select.value, shutoff_same_room: sr.select.value, shutoff_distance_ft: Number(sd.input.value) || 0, shutoff_upstream: su.select.value, trap_present: tp.select.value, trap_in_appliance: ti.select.value, connector_length_ft: Number(cl.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oS.textContent = "-"; oT.textContent = "-"; oC.textContent = "-"; oNote.textContent = "-"; return; }
    oV.textContent = r.passes ? "PASSES the items entered" : "DOES NOT PASS";
    oS.textContent = r.shutoff_ok ? "OK" : "FAILS" + (r.distance_ok ? "" : " - over 6 ft by " + fmt(r.shutoff_distance_deficit_ft, 1));
    oT.textContent = r.trap_exempt ? "not required - this appliance type is excepted" : !r.trap_required ? "satisfied by a trap built into the appliance" : r.trap_ok ? "present, OK" : "REQUIRED and missing";
    oC.textContent = r.connector_ok === null ? "hard piped - no connector" : "limit " + r.connector_limit_ft + " ft" + (r.movable ? " (movable appliance)" : "") + " - " + (r.connector_ok ? "OK" : "OVER by " + fmt(r.connector_over_ft, 1) + " ft");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [sd, cl]) x.input.addEventListener("input", update);
  for (const x of [ap, sr, su, tp, ti]) x.select.addEventListener("change", update);
}
GAS_RENDERERS["gas-appliance-connection"] = _v1145renderGasApplianceConnection;

// =====================================================================
// spec-v1591..v1595 (scope-trade-expansion-2, the propane and LP-gas band).
// Five tiles on the tank side of a fuel-gas system, where calc-gas.js
// already holds the pipe side.
//
// The thread running through all five is that a propane tank is a boiler,
// not a container. What limits it is almost never how much it holds.
// v1591 is the rate it can turn liquid into vapour, v1592 is the space
// thermal expansion needs, v1593 is a regulator's capacity falling with the
// tank pressure that feeds it, v1594 is where the tank may sit, and v1595
// is how long the gas lasts. Three of them fail on the same January
// morning and for related reasons, which is why they are one band.
//
// spec-v1592 lists a run time among its outputs and spec-v1595 is entirely
// about run time. Rather than ship the same arithmetic twice with different
// inputs, the run time is left to propane-run-time (which carries the duty
// cycle, the delivery trigger and the degree-day history that make it
// honest) and propane-fill-outage reports the tank's energy content and
// says where the division belongs.
// =====================================================================

// Propane energy content, US practice: about 91,500 BTU per liquid gallon
// and about 2,500 BTU per cubic foot of vapour. Both are entered as
// defaults rather than hard-coded, because a supplier's figure varies with
// the propane-butane mix.
const _LP_BTU_PER_GAL = 91500;

// Liquid propane's volumetric expansion, about 1.5% per 10 degF -- which is
// 0.0015 per degF, and is the whole reason for the filling limit.
const _LP_EXPANSION_PER_F = 0.0015;

// Depth at which a horizontal cylinder holds a given fraction of its
// volume. The area of a circular segment is R^2*acos((R-h)/R) -
// (R-h)*sqrt(2Rh-h^2); the fraction is that over pi*R^2. Monotonic in h, so
// bisection converges, and this is a SEARCH rather than an inversion.
function _lpDepthForFraction(radius_ft, fraction) {
  if (!(radius_ft > 0) || !(fraction > 0)) return 0;
  if (fraction >= 1) return 2 * radius_ft;
  const R = radius_ft;
  const areaFor = (h) => {
    const d = R - h;
    return R * R * Math.acos(Math.max(-1, Math.min(1, d / R))) - d * Math.sqrt(Math.max(0, 2 * R * h - h * h));
  };
  const target = fraction * Math.PI * R * R;
  let lo = 0, hi = 2 * R;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (areaFor(mid) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Wetted surface of a horizontal cylinder at liquid depth h: the wetted arc
// of the shell times the length, plus the wetted segment of both heads.
function _lpWettedArea(radius_ft, length_ft, depth_ft) {
  if (!(radius_ft > 0) || !(length_ft > 0) || !(depth_ft > 0)) return 0;
  const R = radius_ft;
  const h = Math.min(depth_ft, 2 * R);
  const d = R - h;
  const halfAngle = Math.acos(Math.max(-1, Math.min(1, d / R)));
  const shell = 2 * R * halfAngle * length_ft;
  const heads = 2 * (R * R * halfAngle - d * Math.sqrt(Math.max(0, 2 * R * h - h * h)));
  return shell + heads;
}

// =====================================================================
// spec-v1591: propane vaporization capacity.
//
// The spec is explicit that capacity is NOT computed from first principles
// -- it depends on tank geometry, wind, burial, insulation, paint colour
// and the duration of the draw, and the manufacturer's table for the
// specific tank governs. So the table reading is the INPUT and this scales
// it: capacity goes with wetted area and with the temperature difference
// driving heat through the shell, and both of those are computable.
//
// That scaling is the spec's actual point, which it states and does not
// demonstrate: BOTH TERMS MOVE THE WRONG WAY TOGETHER in a cold snap on a
// drawn-down tank, so the compound fall is much larger than either alone.
// =====================================================================
// dims: in { tank_diameter_ft: L, tank_length_ft: L, percent_full: dimensionless, ambient_f: T, liquid_temperature_f: T, reference_capacity_btuh: M L^2 T^-3, reference_percent_full: dimensionless, reference_ambient_f: T, connected_load_btuh: M L^2 T^-3 } out: { wetted_area_ft2: L^2, reference_wetted_area_ft2: L^2, capacity_btuh: M L^2 T^-3, margin_btuh: M L^2 T^-3, tanks_required: dimensionless }
export function computePropaneVaporizationRate({
  tank_diameter_ft = 0, tank_length_ft = 0, percent_full = 0, ambient_f = 0,
  liquid_temperature_f = 0, reference_capacity_btuh = 0, reference_percent_full = 0,
  reference_ambient_f = 0, connected_load_btuh = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tank_diameter_ft > 0) || !(tank_length_ft > 0)) return { error: "Tank diameter and length must be greater than zero." };
  if (!(percent_full > 0) || percent_full > 100) return { error: "Percent full must be greater than zero and no more than 100." };
  if (!(reference_percent_full > 0) || reference_percent_full > 100) return { error: "Reference percent full must be greater than zero and no more than 100." };
  if (!(reference_capacity_btuh > 0)) return { error: "Reference vaporization capacity must be greater than zero." };
  if (!(connected_load_btuh > 0)) return { error: "Connected load must be greater than zero." };
  const deltaT = ambient_f - liquid_temperature_f;
  const referenceDeltaT = reference_ambient_f - liquid_temperature_f;
  if (!(deltaT > 0) || !(referenceDeltaT > 0)) return { error: "Ambient temperature must be above the liquid temperature, at the entered and the reference condition." };

  const R = tank_diameter_ft / 2;
  const depth_ft = _lpDepthForFraction(R, percent_full / 100);
  const wetted_area_ft2 = _lpWettedArea(R, tank_length_ft, depth_ft);
  const refDepth = _lpDepthForFraction(R, reference_percent_full / 100);
  const reference_wetted_area_ft2 = _lpWettedArea(R, tank_length_ft, refDepth);
  if (!(reference_wetted_area_ft2 > 0)) return { error: "Reference wetted area came out at zero; check the tank dimensions." };

  const area_ratio = wetted_area_ft2 / reference_wetted_area_ft2;
  const temperature_ratio = deltaT / referenceDeltaT;
  const capacity_btuh = reference_capacity_btuh * area_ratio * temperature_ratio;
  const margin_btuh = capacity_btuh - connected_load_btuh;
  const meets_load = margin_btuh >= -1e-9;
  const load_pct_of_capacity = 100 * connected_load_btuh / capacity_btuh;

  // The percent full at which capacity falls below the load, at THIS
  // ambient. Searched downward rather than solved, because wetted area is
  // not a closed form in the fill fraction.
  let limit_percent_full = null;
  for (let pct = 100; pct >= 0.5; pct -= 0.5) {
    const d = _lpDepthForFraction(R, pct / 100);
    const a = _lpWettedArea(R, tank_length_ft, d);
    const cap = reference_capacity_btuh * (a / reference_wetted_area_ft2) * temperature_ratio;
    if (cap < connected_load_btuh) { limit_percent_full = pct; break; }
  }
  const never_short = limit_percent_full === null;
  const already_short = !meets_load;
  const tanks_required = Math.max(1, Math.ceil(connected_load_btuh / capacity_btuh));

  const areaVerdict = "at " + fmt(percent_full, 0) + "% full a " + fmt(tank_diameter_ft, 1) + " by " + fmt(tank_length_ft, 1) + " ft tank has " + fmt(wetted_area_ft2, 0) + " sq ft of wetted surface, against " + fmt(reference_wetted_area_ft2, 0) + " sq ft at the " + fmt(reference_percent_full, 0) + "% reference level -- a factor of " + fmt(area_ratio, 2);
  const capacityVerdict = "scaling the table's " + fmt(reference_capacity_btuh, 0) + " BTU/h by that area factor and by the temperature factor of " + fmt(temperature_ratio, 2) + " (" + fmt(deltaT, 0) + " degF of drive against the reference " + fmt(referenceDeltaT, 0) + ") gives " + fmt(capacity_btuh, 0) + " BTU/h against a " + fmt(connected_load_btuh, 0) + " BTU/h load, which is " + fmt(load_pct_of_capacity, 0) + "% of it";
  const compoundVerdict = "BOTH TERMS MOVE THE WRONG WAY AT ONCE, which is why the failure is always a cold snap on a drawn-down tank and never a full tank in November. A tank at half the wetted area and half the temperature drive has a QUARTER of the capacity it was commissioned with, and neither factor on its own looks alarming";
  const limitVerdict = already_short
    ? "AND IT IS ALREADY SHORT at this level: the tank cannot sustain the load now, which is what frost on the shell means"
    : never_short
      ? "at this ambient the tank carries the load down to the bottom of its useful range"
      : "capacity falls below the load at about " + fmt(limit_percent_full, 0) + "% full at this ambient -- above that the system holds, below it the tank frosts and the vapour pressure falls";
  const frostVerdict = "FROST ON THE SHELL IS A DIAGNOSIS, NOT A CURIOSITY. It means liquid is boiling fast enough to chill the wall below the dew point, which means the tank is at or past its vaporization capacity -- and the frost layer then insulates the shell and makes it worse. The regulator is the wrong place to look: outlet pressure is falling because the tank cannot make vapour, and a larger regulator does nothing about that";
  const fixVerdict = "THE FIXES ARE MORE WETTED AREA OR MORE HEAT, in that order: a larger tank, a second tank manifolded in, or a vaporizer. At this condition the load needs about " + fmt(tanks_required, 0) + " tank(s) of this size. Manifolding is why a bank of cylinders on a high-demand appliance is a VAPORIZATION decision rather than a run-time one";

  return {
    wetted_area_ft2, reference_wetted_area_ft2, area_ratio, temperature_ratio,
    capacity_btuh, margin_btuh, meets_load, load_pct_of_capacity,
    limit_percent_full: never_short ? 0 : limit_percent_full, never_short, already_short,
    tanks_required, depth_ft,
    areaVerdict, capacityVerdict, compoundVerdict, limitVerdict, frostVerdict, fixVerdict,
    note: "How fast a propane tank can turn liquid into vapour, which is the number that fails long before the tank runs out of gas. A tank is a boiler: liquid absorbs heat through the wetted wall and boils, so capacity goes with WETTED SURFACE AREA and with the temperature difference driving heat through the shell. The wetted area is computed here from the tank's geometry at the entered level; the capacity itself is SCALED FROM THE MANUFACTURER'S PUBLISHED TABLE rather than derived, because the real rate also depends on wind, on whether the tank is buried, on insulation and paint colour and on how long the draw lasts, and no closed form covers those. BOTH TERMS MOVE THE WRONG WAY AT THE SAME TIME, which is the point. In a cold snap the driving temperature difference shrinks, and a tank that has been drawn down has less wetted surface -- so a tank at half the area and half the drive has a QUARTER of the capacity it was commissioned with. That is why the failure is a January morning on a tank at 30%, and never the full tank in November when the system was signed off. FROST ON THE SHELL IS THE DIAGNOSIS. It means liquid is boiling fast enough to chill the wall below the dew point, so the tank is at or past its capacity, and the frost layer then insulates the shell and makes it worse. The consequences follow in order: the tank frosts, the vapour pressure falls, the regulator can no longer hold outlet pressure, and the appliances lose flame. THE FIX IS NOT A BIGGER REGULATOR. It is more wetted area -- a larger tank or a second one manifolded in -- or a vaporizer that adds heat deliberately. Manifolding two tanks adds wetted area, which is why a bank of cylinders on a high-demand appliance is a vaporization decision rather than a run-time one. This scales an entered table reading by computed geometry. It does not compute vaporization from first principles, model wind, burial, insulation, paint colour or the duration of the draw, distinguish continuous from intermittent draw capacity (they differ, and the table gives both), size regulators or piping, determine tank placement, or select a vaporizer, which carries its own requirements. NFPA 58, the adopted fuel gas code, the tank and appliance manufacturers, and the AHJ govern.",
  };
}
export const propaneVaporizationRateExample = { inputs: { tank_diameter_ft: 3.5, tank_length_ft: 16, percent_full: 60, ambient_f: 20, liquid_temperature_f: -20, reference_capacity_btuh: 1000000, reference_percent_full: 60, reference_ambient_f: 60, connected_load_btuh: 500000 } };

// =====================================================================
// spec-v1592: the filling limit, the outage, and what "full" means.
//
// spec-v1591 says a tank drawn from 60% to 30% has its wetted area "halve".
// It does not: the wetted surface is dominated by the shell ARC, which is a
// chord function of depth and falls far more slowly than the volume does.
// On the 3.5 by 16 ft tank in this band the area goes 108 to 76 sq ft, a
// fall to 70% rather than to 50%. The direction is right and the magnitude
// is not, which is why propane-vaporization-rate computes the area instead
// of scaling it with the fill.
// =====================================================================
// dims: in { water_capacity_gal: L^3, fill_limit_pct: dimensionless, current_gauge_pct: dimensionless, btu_per_gal: M L^2 T^-2 L^-3, liquid_temperature_f: T } out: { max_fill_gal: L^3, outage_gal: L^3, current_gal: L^3, deliverable_gal: L^3, full_tank_mmbtu: M L^2 T^-2, current_mmbtu: M L^2 T^-2, expansion_headroom_f: T, hydraulically_full_at_f: T }
export function computePropaneFillOutage({
  water_capacity_gal = 0, fill_limit_pct = 80, current_gauge_pct = 0,
  btu_per_gal = _LP_BTU_PER_GAL, liquid_temperature_f = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(water_capacity_gal > 0)) return { error: "Water capacity must be greater than zero." };
  if (!(fill_limit_pct > 0) || fill_limit_pct > 100) return { error: "The filling limit must be greater than zero and no more than 100 percent." };
  if (current_gauge_pct < 0 || current_gauge_pct > 100) return { error: "The gauge reading must be between zero and 100 percent." };
  if (!(btu_per_gal > 0)) return { error: "Energy content per gallon must be greater than zero." };

  const max_fill_gal = water_capacity_gal * fill_limit_pct / 100;
  const outage_gal = water_capacity_gal - max_fill_gal;
  const outage_pct = 100 - fill_limit_pct;
  const current_gal = water_capacity_gal * current_gauge_pct / 100;
  const overfilled = current_gauge_pct > fill_limit_pct + 1e-12;
  const deliverable_gal = Math.max(0, max_fill_gal - current_gal);
  const full_tank_mmbtu = max_fill_gal * btu_per_gal / 1e6;
  const current_mmbtu = current_gal * btu_per_gal / 1e6;

  // The temperature rise that would take the CURRENT fill hydraulically
  // full. This is what the outage buys, and it is the number that shows
  // why an overfill is not a rounding matter.
  const room_fraction = current_gauge_pct > 0 ? (100 - current_gauge_pct) / current_gauge_pct : Infinity;
  const expansion_headroom_f = Number.isFinite(room_fraction) ? room_fraction / _LP_EXPANSION_PER_F : 0;
  const limit_room_fraction = (100 - fill_limit_pct) / fill_limit_pct;
  const limit_headroom_f = limit_room_fraction / _LP_EXPANSION_PER_F;
  // The headroom is a RISE; the liquid temperature turns it into the
  // temperature the tank actually goes liquid-full at, which is the form
  // that can be put next to a forecast.
  const hydraulically_full_at_f = liquid_temperature_f + expansion_headroom_f;

  const fillVerdict = "a " + fmt(water_capacity_gal, 0) + " gallon water capacity tank at a " + fmt(fill_limit_pct, 0) + "% filling limit takes " + fmt(max_fill_gal, 0) + " gallons, leaving " + fmt(outage_gal, 0) + " gallons -- " + fmt(outage_pct, 0) + "% -- of outage. THAT IS A FULL TANK. A customer reading " + fmt(fill_limit_pct, 0) + "% on the float gauge is not short " + fmt(outage_gal, 0) + " gallons; they are looking at the space thermal expansion requires";
  const deliveryVerdict = overfilled
    ? "the gauge reads " + fmt(current_gauge_pct, 0) + "%, which is ABOVE the " + fmt(fill_limit_pct, 0) + "% limit -- this tank is overfilled and nothing should be delivered to it"
    : "at a " + fmt(current_gauge_pct, 0) + "% gauge reading the tank holds " + fmt(current_gal, 0) + " gallons, so a delivery to the limit is " + fmt(deliverable_gal, 0) + " gallons";
  const expansionVerdict = "THE 80% RULE IS ABOUT THERMAL EXPANSION, not about a safety margin in the abstract. Liquid propane expands about 1.5% per 10 degF, so the outage at the filling limit absorbs a rise of about " + fmt(limit_headroom_f, 0) + " degF before the tank is hydraulically full. At the current " + fmt(current_gauge_pct, 0) + "% reading the headroom is " + (!(current_gauge_pct > 0) ? "the whole tank" : expansion_headroom_f > 200 ? fmt(expansion_headroom_f, 0) + " degF, which is more than any ambient swing can deliver" : fmt(expansion_headroom_f, 0) + " degF") + ". From the entered liquid temperature of " + fmt(liquid_temperature_f, 0) + " degF that is a tank going liquid-full at " + (expansion_headroom_f > 200 ? "a temperature no weather reaches" : fmt(hydraulically_full_at_f, 0) + " degF -- a number to put next to a forecast") + ". A tank filled solid on a cold morning and warmed by the sun lifts its relief valve, which is the relief valve working correctly and is still a large release of flammable gas";
  const gaugeVerdict = "THE FIXED LIQUID LEVEL GAUGE IS THE PHYSICAL ENFORCEMENT, and it is why filling is a job that needs attention rather than a meter to watch. The bleeder valve is cracked open during the fill and sprays white when liquid reaches the dip tube; that spray is the stop signal REGARDLESS of what the float gauge or the meter says. The float gauge is an indication and the dip tube is the measurement";
  const energyVerdict = "a full tank holds " + fmt(full_tank_mmbtu, 1) + " MMBTU and the current fill holds " + fmt(current_mmbtu, 1) + " MMBTU at " + fmt(btu_per_gal, 0) + " BTU per gallon. HOW LONG THAT LASTS IS A SEPARATE QUESTION and belongs to the propane run time calculation, which carries the duty cycle, the delivery trigger and the degree-day history that make the answer honest -- a continuous-firing division here would be a floor, not an estimate";
  const usableVerdict = "AND THE USABLE FIGURE IS LOWER STILL, because the last of the liquid cannot maintain vapour pressure against the appliance load in cold weather. That limit is wetted surface, not volume, and the propane vaporization capacity calculation is where it is read";

  return {
    max_fill_gal, outage_gal, outage_pct, current_gal, deliverable_gal, overfilled,
    full_tank_mmbtu, current_mmbtu, expansion_headroom_f: Number.isFinite(expansion_headroom_f) ? expansion_headroom_f : 0,
    limit_headroom_f, hydraulically_full_at_f: Number.isFinite(hydraulically_full_at_f) ? hydraulically_full_at_f : 0,
    fillVerdict, deliveryVerdict, expansionVerdict, gaugeVerdict, energyVerdict, usableVerdict,
    note: "What a full propane tank actually holds, and why the number is smaller than the tank. A 500 gallon tank delivers 400 gallons at most and a 'full' tank reads 80% on the float gauge; neither is a shortfall, and this computes both so the conversation can be had with numbers. THE FILLING LIMIT IS ABOUT THERMAL EXPANSION rather than a safety margin in the abstract. Liquid propane expands roughly 1.5% per 10 degF, so a tank filled solid on a cold morning and warmed by the sun becomes hydraulically full and then lifts its relief valve -- the relief valve working exactly as intended, and still a large release of flammable gas over whatever is beneath it. The outage is the room that expansion needs, and the temperature rise it buys is reported here, because an overfill does not read as dangerous until that figure is put next to a sunny afternoon. THE FIXED LIQUID LEVEL GAUGE IS THE PHYSICAL ENFORCEMENT and it is why filling needs attention rather than a meter to watch: the bleeder valve is cracked open during the fill and sprays white when liquid reaches the dip tube, and that spray is the stop signal regardless of what the float gauge or the meter reads. The float gauge is an indication; the dip tube is the measurement. HOW LONG THE GAS LASTS IS DELIBERATELY NOT COMPUTED HERE. The tank's energy content is reported, but dividing it by a connected load gives a continuous-firing floor rather than an estimate, and the propane run time calculation carries the duty cycle, the delivery trigger and the degree-day history that make the answer usable. The usable figure is lower again, because the last of the liquid cannot maintain vapour pressure against the load in cold weather -- that limit is wetted surface rather than volume, and the propane vaporization capacity calculation is where it is read. This computes fill, outage and energy content from an entered filling limit. It does not determine the applicable filling limit, which is temperature-corrected and differs between aboveground and underground containers and with the filling method, verify or calibrate a float gauge, address the fixed liquid level gauge's setting or the filling procedure, evaluate relief valve sizing or discharge location, or determine what any standard requires. NFPA 58, the adopted fuel gas code, the container manufacturer, and the AHJ govern.",
  };
}
export const propaneFillOutageExample = { inputs: { water_capacity_gal: 500, fill_limit_pct: 80, current_gauge_pct: 25, btu_per_gal: 91500, liquid_temperature_f: 40 } };

// =====================================================================
// spec-v1593: two-stage regulator capacity against the inlet pressure that
// feeds it. The capacities are ENTERED from the manufacturer's table --
// they depend on the spring, the orifice and the outlet setting, and no
// generic relation covers a table that the maker publishes.
//
// What is computed is the comparison the spec says is missed: the SAME
// regulator against the SAME load at the summer and the winter tank
// pressure, plus lock-up against the downstream rating.
// =====================================================================
// dims: in { connected_load_btuh: M L^2 T^-3, btu_per_ft3: M L^2 T^-2 L^-3, capacity_at_min_inlet_cfh: L^3 T^-1, capacity_at_max_inlet_cfh: L^3 T^-1, second_stage_capacity_cfh: L^3 T^-1, lockup_psig: M L^-1 T^-2, downstream_rating_psig: M L^-1 T^-2 } out: { required_cfh: L^3 T^-1, min_inlet_margin_cfh: L^3 T^-1, max_inlet_margin_cfh: L^3 T^-1, second_stage_margin_cfh: L^3 T^-1, lockup_margin_psig: M L^-1 T^-2 }
export function computePropaneRegulatorSizing({
  connected_load_btuh = 0, btu_per_ft3 = 2500, capacity_at_min_inlet_cfh = 0,
  capacity_at_max_inlet_cfh = 0, second_stage_capacity_cfh = 0,
  lockup_psig = 0, downstream_rating_psig = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(connected_load_btuh > 0)) return { error: "Connected load must be greater than zero." };
  if (!(btu_per_ft3 > 0)) return { error: "Energy content per cubic foot must be greater than zero." };
  if (!(capacity_at_min_inlet_cfh > 0)) return { error: "First-stage capacity at the minimum inlet pressure must be greater than zero." };

  const required_cfh = connected_load_btuh / btu_per_ft3;
  const min_inlet_margin_cfh = capacity_at_min_inlet_cfh - required_cfh;
  const short_at_min = min_inlet_margin_cfh < 0;
  const min_inlet_pct = 100 * required_cfh / capacity_at_min_inlet_cfh;

  const has_max = capacity_at_max_inlet_cfh > 0;
  const max_inlet_margin_cfh = has_max ? capacity_at_max_inlet_cfh - required_cfh : 0;
  const short_at_max = has_max && max_inlet_margin_cfh < 0;
  const capacity_fall_pct = has_max && capacity_at_max_inlet_cfh > 0
    ? 100 * (1 - capacity_at_min_inlet_cfh / capacity_at_max_inlet_cfh) : 0;
  const passes_warm_fails_cold = has_max && !short_at_max && short_at_min;

  const has_second = second_stage_capacity_cfh > 0;
  const second_stage_margin_cfh = has_second ? second_stage_capacity_cfh - required_cfh : 0;
  const short_second = has_second && second_stage_margin_cfh < 0;

  const has_lockup = lockup_psig > 0 && downstream_rating_psig > 0;
  const lockup_margin_psig = has_lockup ? downstream_rating_psig - lockup_psig : 0;
  const lockup_over = has_lockup && lockup_margin_psig < 0;

  const flowVerdict = "a " + fmt(connected_load_btuh, 0) + " BTU/h connected load at " + fmt(btu_per_ft3, 0) + " BTU per cubic foot is " + fmt(required_cfh, 0) + " CFH, and EVERY stage has to pass all of it";
  const minVerdict = short_at_min
    ? "AT THE MINIMUM TANK PRESSURE THE FIRST STAGE IS SHORT by " + fmt(-min_inlet_margin_cfh, 0) + " CFH -- it passes " + fmt(capacity_at_min_inlet_cfh, 0) + " against a " + fmt(required_cfh, 0) + " CFH demand, or " + fmt(min_inlet_pct, 0) + "% of what is needed"
    : "at the minimum tank pressure the first stage passes " + fmt(capacity_at_min_inlet_cfh, 0) + " CFH against the " + fmt(required_cfh, 0) + " required, a margin of " + fmt(min_inlet_margin_cfh, 0) + " CFH (the load is " + fmt(min_inlet_pct, 0) + "% of capacity)";
  const compareVerdict = !has_max
    ? "no warm-tank capacity was entered, so only the cold case is checked -- which is the case that matters"
    : passes_warm_fails_cold
      ? "AND THAT IS THE TRAP THE SPEC NAMES. At the warm tank pressure the same regulator passes " + fmt(capacity_at_max_inlet_cfh, 0) + " CFH and looks ample; at the cold one it passes " + fmt(capacity_at_min_inlet_cfh, 0) + ", a fall of " + fmt(capacity_fall_pct, 0) + "%. It is sized on a summer afternoon and starves on a January morning"
      : "the same regulator passes " + fmt(capacity_at_max_inlet_cfh, 0) + " CFH at the warm tank pressure and " + fmt(capacity_at_min_inlet_cfh, 0) + " at the cold one, a fall of " + fmt(capacity_fall_pct, 0) + "% -- and it carries the load at both, which is what sizing at the minimum tank pressure is for";
  const secondVerdict = !has_second
    ? "no second-stage capacity was entered"
    : short_second
      ? "THE SECOND STAGE IS ALSO SHORT, by " + fmt(-second_stage_margin_cfh, 0) + " CFH"
      : "the second stage passes " + fmt(second_stage_capacity_cfh, 0) + " CFH, a margin of " + fmt(second_stage_margin_cfh, 0) + ". Its inlet is regulated at about 10 psig year-round, so ITS capacity does not move with the weather -- the first stage is the one the season reaches";
  const lockupVerdict = !has_lockup
    ? "no lock-up pressure and downstream rating were entered"
    : lockup_over
      ? "LOCK-UP EXCEEDS THE DOWNSTREAM RATING by " + fmt(-lockup_margin_psig, 2) + " psig. The system is unsafe AT IDLE rather than at full fire, which is the opposite of where anyone looks"
      : "lock-up at " + fmt(lockup_psig, 2) + " psig is within the " + fmt(downstream_rating_psig, 2) + " psig downstream rating, a margin of " + fmt(lockup_margin_psig, 2) + " psig";
  const stagingVerdict = "WHY TWO STAGES AT ALL: carrying gas at 10 psig lets the interconnecting pipe be far smaller than carrying it at 11 inches of water column, so the first stage sits at the tank, the second at the building, and the long run between them is small pipe. Collapsing that into one regulator at the tank means running the whole distance at 11 in wc and going several pipe sizes up";
  const coldVerdict = "AND THIS FAILS ON THE SAME MORNING AS THE TANK. Regulator capacity falls with tank pressure, tank pressure follows liquid temperature, and vaporization capacity falls with the same cold and the same drawn-down tank -- so a starving system in a cold snap has two candidate causes that look identical at the appliance. Reading the tank pressure separates them";

  return {
    required_cfh, min_inlet_margin_cfh, min_inlet_pct, short_at_min,
    has_max, max_inlet_margin_cfh, short_at_max, capacity_fall_pct, passes_warm_fails_cold,
    has_second, second_stage_margin_cfh, short_second,
    has_lockup, lockup_margin_psig, lockup_over,
    flowVerdict, minVerdict, compareVerdict, secondVerdict, lockupVerdict, stagingVerdict, coldVerdict,
    note: "Whether each stage of a two-stage propane regulator passes the connected load, checked at the tank pressure that actually matters. The load converts to a volumetric demand at the fuel's energy content, and every stage has to pass all of it. THE SIZING TRAP IS INLET PRESSURE. A regulator's capacity is a function of the pressure across it, so a first stage that comfortably passes the load with a warm tank on a summer afternoon may not pass it with a cold tank on a January morning -- and tank pressure follows liquid temperature. First stages are sized at the MINIMUM expected tank pressure for exactly that reason, and this compares the same regulator at both so the fall is a number rather than a caution. The capacities themselves are entered from the manufacturer's table, because they depend on the spring, the orifice and the outlet setting and no generic relation covers a table the maker publishes. THE SECOND STAGE IS EASIER because its inlet is regulated at about 10 psig year-round, so its capacity does not move with the weather. Its constraint is LOCK-UP: every regulator lets outlet pressure rise slightly at zero flow, and if that pressure exceeds what the appliance or the downstream stage can take, the system is unsafe AT IDLE rather than at full fire -- the opposite of where anyone looks. WHY TWO STAGES EXIST is worth stating, because collapsing them looks like a simplification: carrying gas at 10 psig lets the interconnecting pipe be far smaller than carrying it at 11 inches of water column, so the first stage sits at the tank, the second at the building, and the long run between is small pipe. One regulator at the tank means the whole distance at 11 in wc and several pipe sizes more. AND THIS FAILS ON THE SAME MORNING AS THE TANK. Regulator capacity falls with tank pressure, tank pressure follows liquid temperature, and vaporization capacity falls with the same cold on the same drawn-down tank -- two causes that look identical at the appliance, separated by reading the tank pressure. This compares entered capacities against a computed demand. It does not read a capacity table or predict capacity at an unlisted inlet pressure, size the piping at either pressure (the gas pipe sizing calculation does that, and the two pressures size separately), predict the minimum tank pressure from the weather, select regulators or vent limiters, address regulator venting, which has its own location requirements, or determine what any standard requires. NFPA 58, the adopted fuel gas code, the regulator manufacturer's capacity tables, and the AHJ govern.",
  };
}
export const propaneRegulatorSizingExample = { inputs: { connected_load_btuh: 500000, btu_per_ft3: 2500, capacity_at_min_inlet_cfh: 165, capacity_at_max_inlet_cfh: 300, second_stage_capacity_cfh: 425, lockup_psig: 0.72, downstream_rating_psig: 0.5 } };

// =====================================================================
// spec-v1594: LP-gas container separation. The NFPA 58 distances are
// tabulated by water capacity and are NOT reproduced here -- they step at
// capacity breakpoints and the adopted edition governs. What is computed is
// the comparison: each measured distance against the requirement entered
// for it, with the margin, plus the same check at the next container size
// so the siting conversation happens before the tank is ordered.
// =====================================================================
// dims: in { water_capacity_gal: L^3, required_building_ft: L, required_property_line_ft: L, required_ignition_ft: L, measured_building_ft: L, measured_property_line_ft: L, measured_ignition_ft: L, measured_opening_ft: L, required_opening_ft: L, next_size_required_building_ft: L } out: { building_margin_ft: L, property_line_margin_ft: L, ignition_margin_ft: L, opening_margin_ft: L, governing_required_ft: L, next_size_shortfall_ft: L }
export function computeLpContainerSeparation({
  water_capacity_gal = 0, required_building_ft = 0, required_property_line_ft = 0,
  required_ignition_ft = 0, required_opening_ft = 0, measured_building_ft = 0,
  measured_property_line_ft = 0, measured_ignition_ft = 0, measured_opening_ft = 0,
  next_size_required_building_ft = 0, relief_points_at_opening = "no",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(water_capacity_gal > 0)) return { error: "Container water capacity must be greater than zero." };
  if (!(required_building_ft > 0)) return { error: "The required distance to the building must be greater than zero." };
  if (!(measured_building_ft > 0)) return { error: "The measured distance to the building must be greater than zero." };

  const items = [
    { key: "building", label: "building", required: required_building_ft, measured: measured_building_ft },
    { key: "property_line", label: "property line", required: required_property_line_ft, measured: measured_property_line_ft },
    { key: "ignition", label: "source of ignition", required: required_ignition_ft, measured: measured_ignition_ft },
    { key: "opening", label: "opening", required: required_opening_ft, measured: measured_opening_ft },
  ];
  const checked = items.filter((it) => it.required > 0 && it.measured > 0);
  const failures = checked.filter((it) => it.measured < it.required - 1e-12);

  const building_margin_ft = measured_building_ft - required_building_ft;
  const property_line_margin_ft = required_property_line_ft > 0 && measured_property_line_ft > 0 ? measured_property_line_ft - required_property_line_ft : 0;
  const ignition_margin_ft = required_ignition_ft > 0 && measured_ignition_ft > 0 ? measured_ignition_ft - required_ignition_ft : 0;
  const opening_margin_ft = required_opening_ft > 0 && measured_opening_ft > 0 ? measured_opening_ft - required_opening_ft : 0;
  const governing_required_ft = checked.reduce((m, it) => Math.max(m, it.required), 0);
  const all_pass = failures.length === 0;
  const tightest = checked.slice().sort((a, b) => (a.measured - a.required) - (b.measured - b.required))[0] || null;

  const has_next = next_size_required_building_ft > 0;
  const next_size_shortfall_ft = has_next ? next_size_required_building_ft - measured_building_ft : 0;
  const next_size_fits = has_next && next_size_shortfall_ft <= 1e-12;
  const relief_flag = String(relief_points_at_opening) === "yes";

  const siteVerdict = "a " + fmt(water_capacity_gal, 0) + " gallon container with " + checked.length + " distance(s) checked: " + (all_pass
    ? "every measured distance meets the requirement entered for it, the tightest being the " + (tightest ? tightest.label + " at " + fmt(tightest.measured - tightest.required, 1) + " ft of margin" : "one checked")
    : "FAILS on " + failures.map((f) => f.label + " (short " + fmt(f.required - f.measured, 1) + " ft)").join(", "));
  const buildingVerdict = "to the building: " + fmt(measured_building_ft, 1) + " ft measured against " + fmt(required_building_ft, 1) + " ft required, " + (building_margin_ft >= 0 ? fmt(building_margin_ft, 1) + " ft of margin" : "SHORT by " + fmt(-building_margin_ft, 1) + " ft");
  const stepVerdict = !has_next
    ? "no next-size requirement was entered. The distances STEP at capacity breakpoints rather than scaling, so the requirement for the next container size up is worth reading before the size is chosen"
    : next_size_fits
      ? "the next container size up requires " + fmt(next_size_required_building_ft, 1) + " ft to the building and this location gives " + fmt(measured_building_ft, 1) + " -- the yard takes the larger tank"
      : "AND THE YARD DOES NOT TAKE THE NEXT SIZE UP. It requires " + fmt(next_size_required_building_ft, 1) + " ft to the building and this location has " + fmt(measured_building_ft, 1) + ", short by " + fmt(next_size_shortfall_ft, 1) + " ft. THE DISTANCES STEP RATHER THAN SCALE, so doubling capacity can move the tank across the yard -- which is worth knowing before the customer is told they can have a bigger tank";
  const openingVerdict = relief_flag
    ? "THE RELIEF DISCHARGE POINTS AT AN OPENING, and no horizontal distance addresses that. Propane is heavier than air, so a relief discharge above a basement window well puts flammable vapour into a confined space and leaves it there. This is a DIRECTIONAL requirement: where the relief points matters, not only how far the container sits"
    : "the relief discharge is not directed at an opening. THAT IS A DIRECTIONAL CHECK WITH NO DISTANCE IN THE TABLE, and it is the clearance people forget -- propane is heavier than air, and a discharge above a window well or a below-grade opening fills a confined space that no horizontal measurement sees";
  const transferVerdict = "AND THE POINT OF TRANSFER HAS ITS OWN SEPARATION REQUIREMENTS, frequently more restrictive than the container's. A tank that complies while the truck is absent can be non-compliant while it is being filled, which is the quiet one -- the compliant condition is the one nobody is standing next to";
  const manifoldVerdict = "TWO SMALLER CONTAINERS MANIFOLDED may be treated differently from one large one, and manifolding also adds wetted area and therefore vaporization capacity. It is a genuine option rather than a workaround, and the propane vaporization capacity calculation is where the second half of that case is made";

  return {
    checked_count: checked.length, failure_count: failures.length, all_pass,
    building_margin_ft, property_line_margin_ft, ignition_margin_ft, opening_margin_ft,
    governing_required_ft, has_next, next_size_shortfall_ft, next_size_fits, relief_flag,
    siteVerdict, buildingVerdict, stepVerdict, openingVerdict, transferVerdict, manifoldVerdict,
    note: "Whether an LP-gas container sits far enough from the things it has to sit away from. The NFPA 58 distances are tabulated by container water capacity and are not reproduced here -- the adopted edition governs and the required figures are entered -- so what this does is the comparison: each measured distance against its requirement, with the margin and a pass or fail per element. THE DISTANCES STEP RATHER THAN SCALE. They change at capacity breakpoints, so the choice between one container size and the next is not only a capacity decision: it can move the tank across the yard. Checking the separation for both candidate sizes before choosing is the cheap version of that conversation, and it is the one that stops a customer being told they can double their capacity in a yard that will not take it. THE CLEARANCE PEOPLE FORGET IS NOT TO THE WALL BUT TO OPENINGS. The relief valve discharge has to be clear of windows, doors and any opening into a below-grade space, because propane is heavier than air and will find a basement window well and stay in it. That is a DIRECTIONAL requirement -- where the relief points matters, not only how far the container sits -- and no horizontal measurement addresses it, which is why it is flagged separately here. THE OTHER QUIET ONE IS THE POINT OF TRANSFER. The place the delivery hose connects carries its own separation requirements, frequently more restrictive than the container's own, so a tank that complies while the truck is absent can be non-compliant while it is being filled. AND TWO SMALLER CONTAINERS MANIFOLDED may be treated differently from one large one; manifolding also adds wetted area and therefore vaporization capacity, so it is a real option rather than a workaround. This compares entered distances against entered requirements. It does not reproduce or look up any separation table, determine which edition or amendments apply, address underground or mounded containers, which have their own and generally shorter distances, evaluate the point of transfer, the filling connection or the dispensing arrangement, address clearances to driveways, combustible materials or vegetation, or determine what any standard requires. NFPA 58 as adopted, the AHJ, and the container and system installer govern.",
  };
}
export const lpContainerSeparationExample = { inputs: { water_capacity_gal: 500, required_building_ft: 10, required_property_line_ft: 10, required_ignition_ft: 10, required_opening_ft: 5, measured_building_ft: 12, measured_property_line_ft: 14, measured_ignition_ft: 18, measured_opening_ft: 6, next_size_required_building_ft: 25, relief_points_at_opening: "no" } };

// =====================================================================
// spec-v1595: run time and the refill interval. The spec's own arithmetic
// checks out to the digit (400 gal, 36.6 MMBTU, 244 h, 10.2 days, 29 days
// at a 0.35 duty cycle, 18 days to a 30% trigger), so it lands as written.
//
// The distinction from generator-fuel-runtime, which computes runtime from
// a tank and a burn rate, is the three things that make a HEATING answer
// honest: the duty cycle, the delivery trigger rather than empty, and a
// degree-day history that beats any appliance rating.
// =====================================================================
// dims: in { water_capacity_gal: L^3, fill_limit_pct: dimensionless, current_gauge_pct: dimensionless, trigger_pct: dimensionless, connected_load_btuh: M L^2 T^-3, duty_cycle: dimensionless, btu_per_gal: M L^2 T^-2 L^-3, gallons_per_hdd: L^3, hdd_per_day: T } out: { usable_gal: L^3, usable_mmbtu: M L^2 T^-2, continuous_hours: T, continuous_days: T, realistic_days: T, gallons_to_trigger: L^3, gallons_per_day: L^3 T^-1, days_to_trigger: T, hdd_days_to_trigger: T }
export function computePropaneRunTime({
  water_capacity_gal = 0, fill_limit_pct = 80, current_gauge_pct = 0, trigger_pct = 0,
  connected_load_btuh = 0, duty_cycle = 0, btu_per_gal = _LP_BTU_PER_GAL,
  gallons_per_hdd = 0, hdd_per_day = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(water_capacity_gal > 0)) return { error: "Water capacity must be greater than zero." };
  if (!(fill_limit_pct > 0) || fill_limit_pct > 100) return { error: "The filling limit must be greater than zero and no more than 100 percent." };
  if (!(current_gauge_pct > 0) || current_gauge_pct > 100) return { error: "The gauge reading must be greater than zero and no more than 100 percent." };
  if (!(connected_load_btuh > 0)) return { error: "Connected load must be greater than zero." };
  if (!(duty_cycle > 0) || duty_cycle > 1) return { error: "Duty cycle must be greater than zero and no more than 1." };
  if (!(btu_per_gal > 0)) return { error: "Energy content per gallon must be greater than zero." };
  if (trigger_pct < 0 || trigger_pct >= current_gauge_pct) return { error: "The delivery trigger must be below the current gauge reading." };

  const usable_gal = water_capacity_gal * current_gauge_pct / 100;
  const usable_mmbtu = usable_gal * btu_per_gal / 1e6;
  const continuous_hours = usable_mmbtu * 1e6 / connected_load_btuh;
  const continuous_days = continuous_hours / 24;
  const realistic_days = continuous_days / duty_cycle;
  const gallons_per_day = connected_load_btuh * duty_cycle * 24 / btu_per_gal;

  const gallons_to_trigger = water_capacity_gal * (current_gauge_pct - trigger_pct) / 100;
  const days_to_trigger = gallons_to_trigger / gallons_per_day;

  const has_history = gallons_per_hdd > 0 && hdd_per_day > 0;
  const hdd_gallons_per_day = has_history ? gallons_per_hdd * hdd_per_day : 0;
  const hdd_days_to_trigger = has_history ? gallons_to_trigger / hdd_gallons_per_day : 0;
  const history_ratio = has_history && gallons_per_day > 0 ? hdd_gallons_per_day / gallons_per_day : 0;

  const full_gal = water_capacity_gal * fill_limit_pct / 100;
  const interval_gallons = Math.max(0, full_gal - water_capacity_gal * trigger_pct / 100);
  const refill_interval_days = gallons_per_day > 0 ? interval_gallons / gallons_per_day : 0;

  const energyVerdict = "a " + fmt(current_gauge_pct, 0) + "% gauge reading on a " + fmt(water_capacity_gal, 0) + " gallon tank is " + fmt(usable_gal, 0) + " gallons, or " + fmt(usable_mmbtu, 1) + " MMBTU at " + fmt(btu_per_gal, 0) + " BTU per gallon";
  const continuousVerdict = "against a " + fmt(connected_load_btuh, 0) + " BTU/h load that is " + fmt(continuous_hours, 0) + " hours -- " + fmt(continuous_days, 1) + " days -- of CONTINUOUS FIRING, which is a floor and not an estimate. It is also the number people compute, and it understates tank life badly in mild weather";
  const dutyVerdict = "at a " + fmt(100 * duty_cycle, 0) + "% duty cycle the realistic figure is " + fmt(realistic_days, 0) + " days at a consumption of " + fmt(gallons_per_day, 1) + " gallons a day. HEATING EQUIPMENT CYCLES: a furnace sized for design conditions runs a fraction of the time in average weather, so a continuous-firing estimate can be off by a factor of three in October and be roughly right in a January cold snap";
  const triggerVerdict = "THE DELIVERY SCHEDULE USES THE TRIGGER, NOT EMPTY. From " + fmt(current_gauge_pct, 0) + "% down to a " + fmt(trigger_pct, 0) + "% trigger is " + fmt(gallons_to_trigger, 0) + " gallons, or " + fmt(days_to_trigger, 0) + " days at this duty cycle; a full-to-trigger cycle is " + fmt(refill_interval_days, 0) + " days. Running a tank to empty means purging and leak-testing before it is refilled, and the last of the liquid was struggling to vaporize anyway";
  const historyVerdict = !has_history
    ? "no gallons-per-degree-day history was entered. A customer's own delivery record is the honest input here, and it beats every appliance rating"
    : "from the history, " + fmt(gallons_per_hdd, 2) + " gallons per degree day at " + fmt(hdd_per_day, 0) + " degree days a day is " + fmt(hdd_gallons_per_day, 1) + " gallons a day and " + fmt(hdd_days_to_trigger, 0) + " days to the trigger -- " + (history_ratio > 1.05 ? fmt(history_ratio, 2) + " times FASTER than the duty-cycle estimate" : history_ratio < 0.95 ? fmt(1 / history_ratio, 2) + " times SLOWER than the duty-cycle estimate" : "close to the duty-cycle estimate") + ". DEGREE DAYS ARE THE HONEST METHOD: consumption is very nearly proportional to them, the customer's own gallons-per-degree-day predicts this year from last year's deliveries, and it automatically includes the water heater, the range and everything else on the tank that no appliance rating was asked about";
  const vaporVerdict = "AND THE LAST OF THE TANK MAY NOT BE AVAILABLE AT ALL IN A COLD SNAP, because vaporization is limited by wetted surface rather than by volume. That is the propane vaporization capacity calculation, and it is a second reason the trigger sits well above empty";

  return {
    usable_gal, usable_mmbtu, continuous_hours, continuous_days, realistic_days,
    gallons_per_day, gallons_to_trigger, days_to_trigger, refill_interval_days,
    has_history, hdd_gallons_per_day, hdd_days_to_trigger, history_ratio,
    energyVerdict, continuousVerdict, dutyVerdict, triggerVerdict, historyVerdict, vaporVerdict,
    note: "How long the propane in a tank lasts, and when the next delivery has to be. The energy is the gallons times the fuel's heat content, and dividing by the connected load gives the continuous-firing hours -- which is a floor, not an estimate, and is the number people compute. THE DUTY CYCLE IS WHAT MAKES IT REAL. Heating equipment cycles: a furnace sized for design conditions runs a fraction of the time in average weather, so a continuous-firing figure can understate tank life by a factor of three in October and be roughly right in a January cold snap. DEGREE DAYS ARE THE HONEST METHOD and they are entered here from the customer's own record. Consumption is very nearly proportional to heating degree days, so last year's gallons-per-degree-day from the delivery history predicts this year better than any appliance rating can -- and it automatically includes the water heater, the range and everything else on the tank that nobody thought to add up. Both estimates are reported side by side, because the ratio between them is itself the finding: a history that runs well ahead of the duty-cycle estimate means something is on the tank that was not in the load. THE SCHEDULE RUNS TO THE TRIGGER, NOT TO EMPTY. Deliveries are commonly triggered around a quarter to a third full, and the run time to the trigger is the number a schedule is built on. Running a tank to empty means purging and leak-testing before it can be refilled, and the last of the liquid was struggling to vaporize anyway -- vaporization is limited by wetted surface rather than by volume, which is a second reason the trigger sits high. This computes run time from an entered load, duty cycle and history. It does not predict the duty cycle or the weather, model the building's heat loss (the degree-day energy calculation does that from a building UA), account for domestic hot water, cooking or other non-weather-sensitive load except through an entered history, schedule deliveries or account for route and minimum-delivery practice, or evaluate whether the tank can vaporize at the rate the load asks for. NFPA 58, the adopted fuel gas code, the supplier's delivery practice, and the appliance manufacturers govern.",
  };
}
export const propaneRunTimeExample = { inputs: { water_capacity_gal: 500, fill_limit_pct: 80, current_gauge_pct: 80, trigger_pct: 30, connected_load_btuh: 150000, duty_cycle: 0.35, btu_per_gal: 91500, gallons_per_hdd: 0.45, hdd_per_day: 30 } };

GAS_RENDERERS["propane-vaporization-rate"] = _simpleRenderer({
  compute: computePropaneVaporizationRate,
  example: propaneVaporizationRateExample.inputs,
  citation: "Citation: wetted surface of a horizontal cylinder at the entered fill (shell arc plus both head segments), with vaporization capacity scaled from the manufacturer's published table by the wetted-area ratio and the temperature-difference ratio. The capacity is NOT derived: the real rate also depends on wind, burial, insulation, paint colour and the duration of the draw. NFPA 58, the tank manufacturer's vaporization table, and the AHJ govern.",
  fields: [
    { key: "tank_diameter_ft", label: "Tank diameter (ft)" },
    { key: "tank_length_ft", label: "Tank length (ft)" },
    { key: "percent_full", label: "Percent full now (%)" },
    { key: "ambient_f", label: "Ambient temperature (degF)", attrs: { step: "any" } },
    { key: "liquid_temperature_f", label: "Liquid temperature (degF)", attrs: { step: "any" } },
    { key: "reference_capacity_btuh", label: "Table capacity at the reference condition (BTU/h)" },
    { key: "reference_percent_full", label: "Reference percent full (%)" },
    { key: "reference_ambient_f", label: "Reference ambient (degF)", attrs: { step: "any" } },
    { key: "connected_load_btuh", label: "Connected load (BTU/h)" },
  ],
  outputs: [
    { key: "wetted_area_ft2", label: "Wetted surface now (sq ft)", unit: "sq ft", value: (r) => fmt(r.wetted_area_ft2, 0) + " sq ft (reference " + fmt(r.reference_wetted_area_ft2, 0) + ")" },
    { key: "capacity_btuh", label: "Vaporization capacity (BTU/h)", unit: "BTU/h", value: (r) => fmt(r.capacity_btuh, 0) + " BTU/h" },
    { key: "margin_btuh", label: "Against the load", unit: "BTU/h", value: (r) => (r.meets_load ? "carries it, margin " + fmt(r.margin_btuh, 0) : "SHORT by " + fmt(-r.margin_btuh, 0)) + " BTU/h" },
    { key: "limit_percent_full", label: "Falls below the load at", value: (r) => r.already_short ? "already short at this level" : r.never_short ? "not at any level at this ambient" : fmt(r.limit_percent_full, 0) + "% full" },
    { key: "tanks_required", label: "Tanks of this size required", value: (r) => fmt(r.tanks_required, 0) },
    { key: "areaVerdict", label: "Wetted surface", value: (r) => r.areaVerdict },
    { key: "capacityVerdict", label: "Capacity", value: (r) => r.capacityVerdict },
    { key: "compoundVerdict", label: "Why it fails in January", value: (r) => r.compoundVerdict },
    { key: "limitVerdict", label: "The level it fails at", value: (r) => r.limitVerdict },
    { key: "frostVerdict", label: "Frost", value: (r) => r.frostVerdict },
    { key: "fixVerdict", label: "The fix", value: (r) => r.fixVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

GAS_RENDERERS["propane-fill-outage"] = _simpleRenderer({
  compute: computePropaneFillOutage,
  example: propaneFillOutageExample.inputs,
  citation: "Citation: maximum fill = water capacity x the filling limit; outage = the remainder; the expansion headroom uses liquid propane's roughly 1.5% per 10 degF. The applicable filling limit is temperature-corrected and differs between aboveground and underground containers. NFPA 58, the adopted fuel gas code, and the AHJ govern.",
  fields: [
    { key: "water_capacity_gal", label: "Water capacity (gal)" },
    { key: "fill_limit_pct", label: "Filling limit (%)" },
    { key: "current_gauge_pct", label: "Current gauge reading (%)" },
    { key: "btu_per_gal", label: "Energy content (BTU/gal)" },
    { key: "liquid_temperature_f", label: "Liquid temperature (degF)", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "max_fill_gal", label: "Maximum fill (gal)", unit: "gal", value: (r) => fmt(r.max_fill_gal, 0) + " gal" },
    { key: "outage_gal", label: "Outage (gal)", unit: "gal", value: (r) => fmt(r.outage_gal, 0) + " gal (" + fmt(r.outage_pct, 0) + "%)" },
    { key: "deliverable_gal", label: "Deliverable now (gal)", unit: "gal", value: (r) => r.overfilled ? "OVERFILLED - deliver nothing" : fmt(r.deliverable_gal, 0) + " gal" },
    { key: "full_tank_mmbtu", label: "Energy, full tank (MMBTU)", unit: "MMBTU", value: (r) => fmt(r.full_tank_mmbtu, 1) + " MMBTU (now " + fmt(r.current_mmbtu, 1) + ")" },
    { key: "expansion_headroom_f", label: "Expansion headroom now (degF)", unit: "degF", value: (r) => fmt(r.expansion_headroom_f, 0) + " degF (at the limit, " + fmt(r.limit_headroom_f, 0) + ")" },
    { key: "hydraulically_full_at_f", label: "Liquid-full at (degF)", unit: "degF", value: (r) => r.expansion_headroom_f > 200 ? "no weather reaches it at this fill" : fmt(r.hydraulically_full_at_f, 0) + " degF" },
    { key: "fillVerdict", label: "What full means", value: (r) => r.fillVerdict },
    { key: "deliveryVerdict", label: "This delivery", value: (r) => r.deliveryVerdict },
    { key: "expansionVerdict", label: "Why 80%", value: (r) => r.expansionVerdict },
    { key: "gaugeVerdict", label: "The fixed liquid level gauge", value: (r) => r.gaugeVerdict },
    { key: "energyVerdict", label: "Energy", value: (r) => r.energyVerdict },
    { key: "usableVerdict", label: "Usable", value: (r) => r.usableVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

GAS_RENDERERS["propane-regulator-sizing"] = _simpleRenderer({
  compute: computePropaneRegulatorSizing,
  example: propaneRegulatorSizingExample.inputs,
  citation: "Citation: required flow = connected load / the fuel's energy content per cubic foot, compared against regulator capacities ENTERED from the manufacturer's table at each inlet pressure. Capacity is a function of the pressure across the regulator, so the first stage is sized at the minimum expected tank pressure. NFPA 58, the adopted fuel gas code, the regulator manufacturer, and the AHJ govern.",
  fields: [
    { key: "connected_load_btuh", label: "Connected load (BTU/h)" },
    { key: "btu_per_ft3", label: "Energy content (BTU/cu ft)" },
    { key: "capacity_at_min_inlet_cfh", label: "First stage capacity at the MINIMUM tank pressure (CFH)" },
    { key: "capacity_at_max_inlet_cfh", label: "First stage capacity at the maximum tank pressure (CFH, 0 to skip)" },
    { key: "second_stage_capacity_cfh", label: "Second stage capacity (CFH, 0 to skip)" },
    { key: "lockup_psig", label: "Lock-up pressure (psig, 0 to skip)" },
    { key: "downstream_rating_psig", label: "Downstream rating (psig, 0 to skip)" },
  ],
  outputs: [
    { key: "required_cfh", label: "Required flow (CFH)", unit: "CFH", value: (r) => fmt(r.required_cfh, 0) + " CFH" },
    { key: "min_inlet_margin_cfh", label: "First stage, cold tank", unit: "CFH", value: (r) => r.short_at_min ? "SHORT by " + fmt(-r.min_inlet_margin_cfh, 0) + " CFH" : "margin " + fmt(r.min_inlet_margin_cfh, 0) + " CFH" },
    { key: "max_inlet_margin_cfh", label: "First stage, warm tank", unit: "CFH", value: (r) => !r.has_max ? "not entered" : r.short_at_max ? "SHORT by " + fmt(-r.max_inlet_margin_cfh, 0) + " CFH" : "margin " + fmt(r.max_inlet_margin_cfh, 0) + " CFH" },
    { key: "second_stage_margin_cfh", label: "Second stage", unit: "CFH", value: (r) => !r.has_second ? "not entered" : r.short_second ? "SHORT by " + fmt(-r.second_stage_margin_cfh, 0) + " CFH" : "margin " + fmt(r.second_stage_margin_cfh, 0) + " CFH" },
    { key: "lockup_margin_psig", label: "Lock-up", unit: "psig", value: (r) => !r.has_lockup ? "not entered" : r.lockup_over ? "OVER the rating by " + fmt(-r.lockup_margin_psig, 2) + " psig" : "margin " + fmt(r.lockup_margin_psig, 2) + " psig" },
    { key: "flowVerdict", label: "Demand", value: (r) => r.flowVerdict },
    { key: "minVerdict", label: "The cold case", value: (r) => r.minVerdict },
    { key: "compareVerdict", label: "Warm against cold", value: (r) => r.compareVerdict },
    { key: "secondVerdict", label: "Second stage", value: (r) => r.secondVerdict },
    { key: "lockupVerdict", label: "Lock-up", value: (r) => r.lockupVerdict },
    { key: "stagingVerdict", label: "Why two stages", value: (r) => r.stagingVerdict },
    { key: "coldVerdict", label: "The same morning", value: (r) => r.coldVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

GAS_RENDERERS["lp-container-separation"] = _simpleRenderer({
  compute: computeLpContainerSeparation,
  example: lpContainerSeparationExample.inputs,
  citation: "Citation: each measured distance compared against the requirement ENTERED for it. The NFPA 58 separation tables are not reproduced: they are indexed by container water capacity, they step at capacity breakpoints, and the adopted edition and its amendments govern. NFPA 58 as adopted and the AHJ govern.",
  fields: [
    { key: "water_capacity_gal", label: "Container water capacity (gal)" },
    { key: "required_building_ft", label: "Required to the building (ft)" },
    { key: "measured_building_ft", label: "Measured to the building (ft)" },
    { key: "required_property_line_ft", label: "Required to the property line (ft, 0 to skip)" },
    { key: "measured_property_line_ft", label: "Measured to the property line (ft, 0 to skip)" },
    { key: "required_ignition_ft", label: "Required to a source of ignition (ft, 0 to skip)" },
    { key: "measured_ignition_ft", label: "Measured to a source of ignition (ft, 0 to skip)" },
    { key: "required_opening_ft", label: "Required to an opening (ft, 0 to skip)" },
    { key: "measured_opening_ft", label: "Measured to an opening (ft, 0 to skip)" },
    { key: "next_size_required_building_ft", label: "Next container size: required to the building (ft, 0 to skip)" },
    { key: "relief_points_at_opening", label: "Relief discharge directed at an opening", kind: "select", default: "no", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes -- relief points at a window, door or below-grade opening" }] },
  ],
  outputs: [
    { key: "all_pass", label: "Verdict", value: (r) => r.all_pass ? "every distance checked meets its requirement" : r.failure_count + " of " + r.checked_count + " FAIL" },
    { key: "building_margin_ft", label: "Building margin (ft)", unit: "ft", value: (r) => fmt(r.building_margin_ft, 1) + " ft" },
    { key: "opening_margin_ft", label: "Opening margin (ft)", unit: "ft", value: (r) => fmt(r.opening_margin_ft, 1) + " ft" },
    { key: "governing_required_ft", label: "Longest requirement (ft)", unit: "ft", value: (r) => fmt(r.governing_required_ft, 1) + " ft" },
    { key: "next_size_shortfall_ft", label: "Next size up", unit: "ft", value: (r) => !r.has_next ? "not entered" : r.next_size_fits ? "fits" : "short by " + fmt(r.next_size_shortfall_ft, 1) + " ft" },
    { key: "siteVerdict", label: "Siting", value: (r) => r.siteVerdict },
    { key: "buildingVerdict", label: "To the building", value: (r) => r.buildingVerdict },
    { key: "stepVerdict", label: "The next size up", value: (r) => r.stepVerdict },
    { key: "openingVerdict", label: "Relief discharge", value: (r) => r.openingVerdict },
    { key: "transferVerdict", label: "Point of transfer", value: (r) => r.transferVerdict },
    { key: "manifoldVerdict", label: "Manifolding", value: (r) => r.manifoldVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

GAS_RENDERERS["propane-run-time"] = _simpleRenderer({
  compute: computePropaneRunTime,
  example: propaneRunTimeExample.inputs,
  citation: "Citation: energy = gallons x the fuel's heat content; continuous run time = energy / connected load; the realistic figure divides by the duty cycle, and the schedule runs to the delivery trigger rather than to empty. The degree-day estimate uses the customer's own gallons-per-degree-day history. NFPA 58, the supplier's delivery practice, and the appliance manufacturers govern.",
  fields: [
    { key: "water_capacity_gal", label: "Water capacity (gal)" },
    { key: "fill_limit_pct", label: "Filling limit (%)" },
    { key: "current_gauge_pct", label: "Current gauge reading (%)" },
    { key: "trigger_pct", label: "Delivery trigger (%)" },
    { key: "connected_load_btuh", label: "Connected load (BTU/h)" },
    { key: "duty_cycle", label: "Duty cycle (0 to 1)", attrs: { step: "any", min: "0", max: "1" } },
    { key: "btu_per_gal", label: "Energy content (BTU/gal)" },
    { key: "gallons_per_hdd", label: "History: gallons per degree day (0 to skip)" },
    { key: "hdd_per_day", label: "History: degree days per day (0 to skip)" },
  ],
  outputs: [
    { key: "usable_mmbtu", label: "Energy in the tank (MMBTU)", unit: "MMBTU", value: (r) => fmt(r.usable_mmbtu, 1) + " MMBTU (" + fmt(r.usable_gal, 0) + " gal)" },
    { key: "continuous_days", label: "Continuous firing (days)", unit: "days", value: (r) => fmt(r.continuous_days, 1) + " days (" + fmt(r.continuous_hours, 0) + " h)" },
    { key: "realistic_days", label: "At the duty cycle (days)", unit: "days", value: (r) => fmt(r.realistic_days, 0) + " days" },
    { key: "gallons_per_day", label: "Consumption (gal/day)", unit: "gal/day", value: (r) => fmt(r.gallons_per_day, 1) + " gal/day" },
    { key: "days_to_trigger", label: "Days to the delivery trigger", unit: "days", value: (r) => fmt(r.days_to_trigger, 0) + " days (" + fmt(r.gallons_to_trigger, 0) + " gal)" },
    { key: "hdd_days_to_trigger", label: "From the degree-day history", unit: "days", value: (r) => !r.has_history ? "not entered" : fmt(r.hdd_days_to_trigger, 0) + " days (" + fmt(r.hdd_gallons_per_day, 1) + " gal/day)" },
    { key: "energyVerdict", label: "Energy", value: (r) => r.energyVerdict },
    { key: "continuousVerdict", label: "Continuous firing", value: (r) => r.continuousVerdict },
    { key: "dutyVerdict", label: "The duty cycle", value: (r) => r.dutyVerdict },
    { key: "triggerVerdict", label: "The schedule", value: (r) => r.triggerVerdict },
    { key: "historyVerdict", label: "Degree days", value: (r) => r.historyVerdict },
    { key: "vaporVerdict", label: "The last of the tank", value: (r) => r.vaporVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});
