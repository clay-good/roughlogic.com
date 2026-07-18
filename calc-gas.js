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
  citationEl.textContent = "Citation: per IFGC 2021 Table 402.4 (NFPA 54). Spitzglass low-pressure gas formula Q = 3550 * sqrt(d^5 * dP / (SG * L)). AHJ governs. Free at codes.iccsafe.org.";
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
  const q = makeNumber("Measured leak rate (ft^3/hr)", "glh-q", { step: "any", min: "0" });
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
  const q = makeNumber("Gas flow (CFH)", "gpd-q", { step: "any", min: "0", value: "1000" });
  q.input.value = "1000";
  const d = makeNumber("Pipe inside diameter (in, actual bore)", "gpd-d", { step: "any", min: "0", value: "1.049" });
  d.input.value = "1.049";
  const len = makeNumber("Pipe length (ft)", "gpd-len", { step: "any", min: "0", value: "100" });
  len.input.value = "100";
  const sg = makeNumber("Gas specific gravity", "gpd-sg", { step: "any", min: "0", value: "0.6" });
  sg.input.value = "0.6";
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
  const dh = makeNumber("Allowable pressure drop (in w.c.)", "gmf-dh", { step: "any", min: "0", value: "0.5" });
  dh.input.value = "0.5";
  const d = makeNumber("Pipe inside diameter (in, actual bore)", "gmf-d", { step: "any", min: "0", value: "1.049" });
  d.input.value = "1.049";
  const len = makeNumber("Pipe length (ft)", "gmf-len", { step: "any", min: "0", value: "100" });
  len.input.value = "100";
  const sg = makeNumber("Gas specific gravity", "gmf-sg", { step: "any", min: "0", value: "0.6" });
  sg.input.value = "0.6";
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
  const inp = makeNumber("Appliance input (BTU/hr)", "gfc-in", { step: "any", min: "0", value: "100000" });
  inp.input.value = "100000";
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
