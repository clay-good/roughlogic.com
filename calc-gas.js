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
//   Q = 3550 * sqrt( d^5 * dP / (SG * L) )
// where d is internal diameter in inches, dP is pressure drop in inches w.c.,
// SG is specific gravity, and L is length in feet.
// dims: in { d_in: L, dP_in_wc: M L^-1 T^-2, specific_gravity: dimensionless, L_ft: L } out: { flow_cfh: L^3 T^-1 }
export function spitzglassFlow({ d_in, dP_in_wc, specific_gravity, L_ft }) {
  if (L_ft <= 0 || d_in <= 0) return 0;
  return 3550 * Math.sqrt((Math.pow(d_in, 5) * dP_in_wc) / (specific_gravity * L_ft));
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
