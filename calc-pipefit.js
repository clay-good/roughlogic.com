// =====================================================================
// calc-pipefit.js - spec-v29 pipe / raceway field-layout bench.
//
// Three first-principles, hand-verifiable tiles that deepen existing
// groups per the spec-v28 §7 long-term trades roadmap (§7.1 / §7.3):
//   - pipe-cold-spring (Group B)        ASME B31.1 §119 / B31.9 cold spring
//   - raceway-expansion-fitting (Group A) NEC 352.44 PVC conduit expansion
//   - pipe-spacing-rack (Group G)        insulated parallel-pipe rack geometry
//
// Group letters are independent of the module (the spec-v28 precedent:
// a tile's `group:` need not match its calc-*.js home). These three land
// in a dedicated module because calc-electrical.js (99.3%) and
// calc-plumbing.js (98.9%) are at their size caps. Pure exported compute
// functions (no DOM in the compute layer) plus their renderers and the
// PIPEFIT_RENDERERS map, mirroring every other calc-*.js module.
//
// Thermal-expansion coefficients alpha (1/F) match the sibling
// pipe-expansion-loop tile's data/plumbing/thermal-expansion-
// coefficients.json so the two tiles report the same free growth for the
// same material; the PVC *conduit* coefficient is the distinct NEC Table
// 352.44 figure (3.38e-5), not the PVC pipe Sch-80 value.
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

export const PIPEFIT_RENDERERS = {};

// Linear thermal-expansion coefficient alpha (in/in per F), matched to
// data/plumbing/thermal-expansion-coefficients.json (pipe-expansion-loop).
const _PIPE_ALPHA = {
  copper: 0.0000094, steel: 0.0000065, ductile_iron: 0.0000062,
  aluminum: 0.0000128, pvc: 0.00003, cpvc: 0.000034, pex: 0.00011,
};

// ---------------------------------------------------------------------
// 29.1 Pipe cold spring / cut-short (pipe-cold-spring) - ASME B31.1 §119
// ---------------------------------------------------------------------
// dims: in { run_length_ft: L, install_temp_f: T, operating_temp_f: T, cold_spring_percent: dimensionless, alpha_per_f: dimensionless } out: { thermal_growth_in: L, cold_spring_gap_in: L, residual_movement_in: L, growth_per_100ft_in: L }
export function computeColdSpring({ material = "steel", run_length_ft = 0, install_temp_f = 0, operating_temp_f = 0, cold_spring_percent = 50, alpha_per_f = null } = {}) {
  const _g = _finiteGuard({ run_length_ft, install_temp_f, operating_temp_f, cold_spring_percent }); if (_g) return _g;
  const L = Number(run_length_ft);
  if (!(L > 0)) return { error: "Run length must be positive (ft)." };
  let alpha = Number(alpha_per_f);
  if (!Number.isFinite(alpha) || !(alpha > 0)) alpha = _PIPE_ALPHA[material];
  if (!(alpha > 0)) return { error: "Pick a material or enter a positive expansion coefficient (per F)." };
  const csp = Number(cold_spring_percent);
  if (!(csp >= 0 && csp <= 100)) return { error: "Cold-spring factor must be 0 to 100 percent." };
  const dT = Math.abs(Number(operating_temp_f) - Number(install_temp_f));
  const L_in = L * 12;
  const thermal_growth_in = alpha * L_in * dT;
  const cold_spring_gap_in = (csp / 100) * thermal_growth_in;
  const residual_movement_in = thermal_growth_in - cold_spring_gap_in;
  const growth_per_100ft_in = alpha * 1200 * dT;
  const notes = [];
  if (dT === 0) notes.push("Install and operating temperatures are equal: no thermal growth, so no cold spring is needed.");
  notes.push("Cut the run short by the cold-spring gap and spring it into place at the install temperature.");
  notes.push("Cold spring reduces the hot (operating) anchor and equipment-nozzle reactions but does NOT reduce the cyclic stress range, which ASME B31.1 §119.10 computes on the full expansion. B31.1 credits two-thirds of the cold spring in the reaction calculation. The piping engineer governs the flexibility analysis.");
  return { material, alpha_per_f: alpha, delta_t_f: dT, run_length_ft: L, thermal_growth_in, cold_spring_percent: csp, cold_spring_gap_in, residual_movement_in, growth_per_100ft_in, notes };
}
export const coldSpringExample = { inputs: { material: "steel", run_length_ft: 100, install_temp_f: 50, operating_temp_f: 250, cold_spring_percent: 50 } };

function _renderColdSpring(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pipe cold spring (cut-short) - the run is cut short by a fraction of the computed free thermal growth dL = alpha * L * dT and sprung into place at the install temperature, lowering the hot anchor and nozzle reactions - per ASME B31.1 Power Piping §119 / B31.9 Building Services Piping, by name; first-principles linear expansion. Cold spring does not reduce the cyclic stress range (B31.1 §119.10); B31.1 credits two-thirds of the cold spring in the reaction. The piping engineer governs the flexibility analysis.";
  const mat = makeSelect("Material (sets coefficient)", "cs-mat", [
    { value: "steel", label: "Carbon steel A53", selected: true },
    { value: "copper", label: "Copper Type L" }, { value: "ductile_iron", label: "Ductile iron" },
    { value: "aluminum", label: "Aluminum 6061" }, { value: "pvc", label: "PVC Sch 80" },
    { value: "cpvc", label: "CPVC" }, { value: "pex", label: "PEX" },
  ]);
  const len = makeNumber("Run length (ft)", "cs-len", { step: "any", min: "0" });
  const ti = makeNumber("Install temperature (F)", "cs-ti", { step: "any" });
  const to = makeNumber("Operating temperature (F)", "cs-to", { step: "any" });
  const csp = makeNumber("Cold-spring factor (%)", "cs-csp", { step: "any", min: "0", max: "100", value: "50" });
  csp.input.value = "50";
  for (const f of [mat, len, ti, to, csp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mat.select.value = "steel"; len.input.value = "100"; ti.input.value = "50"; to.input.value = "250"; csp.input.value = "50"; update(); });
  const oGrow = makeOutputLine(outputRegion, "Free thermal growth", "cs-out-grow");
  const oGap = makeOutputLine(outputRegion, "Cold-spring gap (cut short)", "cs-out-gap");
  const oRes = makeOutputLine(outputRegion, "Residual movement / per 100 ft", "cs-out-res");
  const oNote = makeOutputLine(outputRegion, "Notes", "cs-out-note");
  const update = debounce(() => {
    const r = computeColdSpring({ material: mat.select.value, run_length_ft: Number(len.input.value) || 0, install_temp_f: Number(ti.input.value) || 0, operating_temp_f: Number(to.input.value) || 0, cold_spring_percent: Number(csp.input.value) || 0 });
    if (r.error) { oGrow.textContent = r.error; oGap.textContent = "-"; oRes.textContent = "-"; oNote.textContent = ""; return; }
    oGrow.textContent = fmt(r.thermal_growth_in, 3) + " in (dT " + fmt(r.delta_t_f, 0) + " F)";
    oGap.textContent = fmt(r.cold_spring_gap_in, 3) + " in at " + fmt(r.cold_spring_percent, 0) + "%";
    oRes.textContent = fmt(r.residual_movement_in, 3) + " in residual; " + fmt(r.growth_per_100ft_in, 3) + " in per 100 ft";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [len.input, ti.input, to.input, csp.input]) f.addEventListener("input", update);
  mat.select.addEventListener("change", update);
}
PIPEFIT_RENDERERS["pipe-cold-spring"] = _renderColdSpring;

// ---------------------------------------------------------------------
// 29.2 PVC raceway expansion fitting (raceway-expansion-fitting) - NEC 352.44
// ---------------------------------------------------------------------
// dims: in { run_length_ft: L, temp_range_f: T, alpha_per_f: dimensionless, fitting_travel_in: L, threshold_in: L } out: { length_change_in: L, per_100ft_in: L, fittings_needed: dimensionless }
export function computeRacewayExpansion({ run_length_ft = 0, temp_range_f = 0, alpha_per_f = 0.0000338, fitting_travel_in = 6, threshold_in = 0.25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(run_length_ft);
  const dT = Number(temp_range_f);
  if (!(L > 0)) return { error: "Run length must be positive (ft)." };
  if (!(dT >= 0)) return { error: "Temperature range must be non-negative (F)." };
  let alpha = Number(alpha_per_f);
  if (!Number.isFinite(alpha) || !(alpha > 0)) alpha = 0.0000338;
  const travel = Number(fitting_travel_in);
  const threshold = Number.isFinite(Number(threshold_in)) ? Number(threshold_in) : 0.25;
  const L_in = L * 12;
  const length_change_in = alpha * L_in * dT;
  const per_100ft_in = alpha * 1200 * dT;
  const requires_fitting = length_change_in >= threshold;
  let fittings_needed = 0;
  if (requires_fitting) fittings_needed = (travel > 0) ? Math.ceil(length_change_in / travel) : null;
  const notes = [];
  if (!requires_fitting) notes.push("Computed movement " + fmt(length_change_in, 3) + " in is below the " + fmt(threshold, 2) + " in threshold; NEC 352.44 does not require an expansion fitting for this straight run.");
  if (fittings_needed === null) notes.push("Enter the fitting's rated travel to size the fitting count.");
  notes.push("PVC (rigid nonmetallic) conduit coefficient is the NEC Table 352.44 figure (3.38e-5 in/in/F), distinct from PVC pipe. Set the fitting piston opening per the manufacturer's temperature chart at the install temperature so movement is shared both directions. The AHJ-adopted NEC edition governs.");
  return { run_length_ft: L, temp_range_f: dT, alpha_per_f: alpha, length_change_in, per_100ft_in, requires_fitting, fitting_travel_in: travel, threshold_in: threshold, fittings_needed, notes };
}
export const racewayExpansionExample = { inputs: { run_length_ft: 100, temp_range_f: 100, alpha_per_f: 0.0000338, fitting_travel_in: 6 } };

function _renderRacewayExpansion(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: PVC raceway thermal expansion and expansion-fitting sizing - dL = alpha * L * dT with the NEC Table 352.44 coefficient (3.38e-5 in/in/F), an expansion fitting required where the change is 0.25 in or greater in a straight run - per NEC Article 352.44 and Table 352.44 (rigid PVC conduit), by name; first-principles linear expansion. Set the fitting piston per the manufacturer's temperature chart at the install temperature. The AHJ-adopted NEC edition governs.";
  const len = makeNumber("Conduit run length (ft)", "rx-len", { step: "any", min: "0" });
  const dT = makeNumber("Temperature range (F)", "rx-dt", { step: "any", min: "0" });
  const travel = makeNumber("Fitting rated travel (in)", "rx-travel", { step: "any", min: "0", value: "6" });
  travel.input.value = "6";
  for (const f of [len, dT, travel]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { len.input.value = "100"; dT.input.value = "100"; travel.input.value = "6"; update(); });
  const oChange = makeOutputLine(outputRegion, "Length change", "rx-out-change");
  const oReq = makeOutputLine(outputRegion, "Fitting required / count", "rx-out-req");
  const oNote = makeOutputLine(outputRegion, "Notes", "rx-out-note");
  const update = debounce(() => {
    const r = computeRacewayExpansion({ run_length_ft: Number(len.input.value) || 0, temp_range_f: Number(dT.input.value) || 0, fitting_travel_in: Number(travel.input.value) || 0 });
    if (r.error) { oChange.textContent = r.error; oReq.textContent = "-"; oNote.textContent = ""; return; }
    oChange.textContent = fmt(r.length_change_in, 3) + " in (" + fmt(r.per_100ft_in, 3) + " in per 100 ft)";
    oReq.textContent = r.requires_fitting ? ("required - " + (r.fittings_needed === null ? "enter travel" : r.fittings_needed + " fitting(s)")) : "not required (< " + fmt(r.threshold_in, 2) + " in)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [len.input, dT.input, travel.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["raceway-expansion-fitting"] = _renderRacewayExpansion;

// ---------------------------------------------------------------------
// 29.3 Insulated parallel-pipe rack spacing (pipe-spacing-rack)
// ---------------------------------------------------------------------
// dims: in { pipe_od_in: L, insulation_thickness_in: L, clearance_in: L, pipe_count: dimensionless, rack_width_in: L } out: { insulated_od_in: L, center_to_center_in: L, total_bundle_width_in: L, remaining_in: L }
export function computePipeSpacingRack({ pipe_od_in = 0, insulation_thickness_in = 0, clearance_in = 1, pipe_count = 2, rack_width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const od = Number(pipe_od_in);
  if (!(od > 0)) return { error: "Pipe outside diameter must be positive (in)." };
  const ins = Math.max(0, Number(insulation_thickness_in) || 0);
  const gap = Math.max(0, Number(clearance_in) || 0);
  const n = Math.max(1, Math.floor(Number(pipe_count) || 1));
  const insulated_od_in = od + 2 * ins;
  const center_to_center_in = insulated_od_in + gap;
  const total_bundle_width_in = n * insulated_od_in + (n - 1) * gap;
  const notes = [];
  let pipes_that_fit = null, remaining_in = null;
  const W = Number(rack_width_in) || 0;
  if (W > 0) {
    pipes_that_fit = Math.max(0, Math.floor((W + gap) / center_to_center_in));
    remaining_in = W - total_bundle_width_in;
    if (remaining_in < 0) notes.push("The " + n + "-pipe bundle (" + fmt(total_bundle_width_in, 2) + " in) is wider than the " + fmt(W, 1) + " in rack; only " + pipes_that_fit + " of these pipes fit.");
  }
  notes.push("Center-to-center is the insulated outside diameter plus the air-gap clearance. Insulated OD follows the ASTM C585 nominal insulation dimensions; the clearance and the hanger / support span (MSS SP-58) are separate checks.");
  return { pipe_od_in: od, insulation_thickness_in: ins, clearance_in: gap, pipe_count: n, insulated_od_in, center_to_center_in, total_bundle_width_in, pipes_that_fit, remaining_in, notes };
}
export const pipeSpacingRackExample = { inputs: { pipe_od_in: 2.375, insulation_thickness_in: 1, clearance_in: 1, pipe_count: 2, rack_width_in: 24 } };

function _renderPipeSpacingRack(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Insulated parallel-pipe rack spacing - center-to-center = insulated OD + clearance, bundle width = n * insulated OD + (n-1) * clearance - first-principles geometry; the insulated outside diameter follows the ASTM C585 nominal pipe-insulation dimensions, by name. The clearance allowance and the hanger / support span (MSS SP-58) are separate checks; the mechanical contractor governs the rack layout.";
  const od = makeNumber("Pipe outside diameter (in)", "psr-od", { step: "any", min: "0" });
  const ins = makeNumber("Insulation thickness (in)", "psr-ins", { step: "any", min: "0", value: "0" });
  const gap = makeNumber("Clearance gap (in)", "psr-gap", { step: "any", min: "0", value: "1" });
  const n = makeNumber("Number of pipes", "psr-n", { step: "1", min: "1", value: "2" });
  const rack = makeNumber("Rack / strut width (in, optional)", "psr-rack", { step: "any", min: "0" });
  gap.input.value = "1"; n.input.value = "2";
  for (const f of [od, ins, gap, n, rack]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "2.375"; ins.input.value = "1"; gap.input.value = "1"; n.input.value = "2"; rack.input.value = "24"; update(); });
  const oCtc = makeOutputLine(outputRegion, "Center-to-center spacing", "psr-out-ctc");
  const oBundle = makeOutputLine(outputRegion, "Bundle width / insulated OD", "psr-out-bundle");
  const oFit = makeOutputLine(outputRegion, "Fit on rack", "psr-out-fit");
  const oNote = makeOutputLine(outputRegion, "Notes", "psr-out-note");
  const update = debounce(() => {
    const r = computePipeSpacingRack({ pipe_od_in: Number(od.input.value) || 0, insulation_thickness_in: Number(ins.input.value) || 0, clearance_in: Number(gap.input.value) || 0, pipe_count: Number(n.input.value) || 0, rack_width_in: Number(rack.input.value) || 0 });
    if (r.error) { oCtc.textContent = r.error; oBundle.textContent = "-"; oFit.textContent = "-"; oNote.textContent = ""; return; }
    oCtc.textContent = fmt(r.center_to_center_in, 3) + " in";
    oBundle.textContent = fmt(r.total_bundle_width_in, 2) + " in for " + r.pipe_count + " pipes (insulated OD " + fmt(r.insulated_od_in, 3) + " in)";
    oFit.textContent = r.pipes_that_fit === null ? "(enter a rack width)" : (r.pipes_that_fit + " pipes fit; " + fmt(r.remaining_in, 2) + " in remaining");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [od.input, ins.input, gap.input, n.input, rack.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["pipe-spacing-rack"] = _renderPipeSpacingRack;
