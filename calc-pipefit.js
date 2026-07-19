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

// Nominal Schedule 40 steel pipe inside diameters (in), keyed by NPS, for
// the steam-main velocity sizing (v158). Standard mill dimensions (ASME
// B36.10M); the same 3.068 / 4.026 figures the calc-plumbing / calc-gas
// sizing tiles already bundle.
export const _SCH40_ID_IN = [
  ["1/2", 0.622], ["3/4", 0.824], ["1", 1.049], ["1-1/4", 1.380],
  ["1-1/2", 1.610], ["2", 2.067], ["2-1/2", 2.469], ["3", 3.068],
  ["3-1/2", 3.548], ["4", 4.026], ["5", 5.047], ["6", 6.065],
  ["8", 7.981], ["10", 10.020], ["12", 11.938],
];

// MSS SP-58 carbon-steel threaded-rod maximum safe loads (lb) at or below
// 650F, keyed by rod diameter (in), for the hanger-rod sizing (v162).
// Standard threaded-rod allowable loads (root area x ~allowable stress);
// the same values published across MSS SP-58 and every hanger catalog.
const _MSS_SP58_ROD_LB = [
  ["3/8", 610], ["1/2", 1130], ["5/8", 1810], ["3/4", 2710],
  ["7/8", 3770], ["1", 4960], ["1-1/8", 6230], ["1-1/4", 8000],
  ["1-3/8", 9510], ["1-1/2", 11630],
];

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

// =====================================================================
// spec-v157..v162 (Group B) - the steamfitting / pressure-piping / pipe-
// support bench: flash steam, steam-main velocity sizing, steam-trap
// load, ASME B31.1 pressure rating, filled-pipe support load, and MSS
// SP-58 hanger-rod sizing. All lazy-loaded, absent from home first paint.
// First-principles relations; the steam tables, the code allowable-stress
// tables, and the engineer of record govern the field selection.
// =====================================================================

// ---------------------------------------------------------------------
// v157 Flash steam percentage (flash-steam-pct)
// ---------------------------------------------------------------------
// dims: in { hf_high: L^2 T^-2, hf_low: L^2 T^-2, hfg_low: L^2 T^-2 } out: { flash_fraction: dimensionless, flash_pct: dimensionless }
export function computeFlashSteamPct({ hf_high = 0, hf_low = 0, hfg_low = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hfH = Number(hf_high);
  const hfL = Number(hf_low);
  const hfg = Number(hfg_low);
  if (!(hfg > 0)) return { error: "Low-side latent heat must be positive (Btu/lb)." };
  if (!(hfH > hfL)) return { error: "High-side enthalpy must exceed the low-side enthalpy (no flash otherwise)." };
  const flash_fraction = (hfH - hfL) / hfg;
  return { flash_fraction, flash_pct: flash_fraction * 100 };
}
export const flashSteamPctExample = { inputs: { hf_high: 309, hf_low: 180, hfg_low: 970 } };

function _renderFlashSteamPct(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Flash steam fraction = (hf_high - hf_low) / hfg_low - the sensible-heat surplus a condensate carries across a pressure drop re-boils a fraction back to steam - first-principles steam thermodynamics, by name. Enthalpies are read from the ASME saturated-water steam tables at the two pressures. This is the thermodynamic-ideal fraction; trap subcooling and line losses move the field value, and a flash-recovery vessel is sized from the manufacturer's data.";
  const hfH = makeNumber("Liquid enthalpy hf at high pressure (Btu/lb)", "fs-hfh", { step: "any", min: "0" });
  const hfL = makeNumber("Liquid enthalpy hf at low pressure (Btu/lb)", "fs-hfl", { step: "any", min: "0" });
  const hfg = makeNumber("Latent heat hfg at low pressure (Btu/lb)", "fs-hfg", { step: "any", min: "0" });
  for (const f of [hfH, hfL, hfg]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hfH.input.value = "309"; hfL.input.value = "180"; hfg.input.value = "970"; update(); });
  const oPct = makeOutputLine(outputRegion, "Flash steam", "fs-out-pct");
  const update = debounce(() => {
    const r = computeFlashSteamPct({ hf_high: Number(hfH.input.value) || 0, hf_low: Number(hfL.input.value) || 0, hfg_low: Number(hfg.input.value) || 0 });
    if (r.error) { oPct.textContent = r.error; return; }
    oPct.textContent = fmt(r.flash_pct, 1) + "% of the condensate flashes to steam";
  }, DEBOUNCE_MS);
  for (const f of [hfH.input, hfL.input, hfg.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["flash-steam-pct"] = _renderFlashSteamPct;

// ---------------------------------------------------------------------
// v158 Steam main size from flow and velocity (steam-pipe-velocity)
// ---------------------------------------------------------------------
// dims: in { steam_flow_lbhr: M T^-1, spec_vol_ft3lb: L^3 M^-1, vel_ceiling_fpm: L T^-1 } out: { req_area_in2: L^2, req_dia_in: L, chosen_nps: dimensionless, chosen_id_in: L, actual_fpm: L T^-1 }
export function computeSteamPipeVelocity({ steam_flow_lbhr = 0, spec_vol_ft3lb = 0, vel_ceiling_fpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flow = Number(steam_flow_lbhr);
  const sv = Number(spec_vol_ft3lb);
  const vc = Number(vel_ceiling_fpm);
  if (!(flow > 0)) return { error: "Steam flow must be positive (lb/hr)." };
  if (!(sv > 0)) return { error: "Specific volume must be positive (ft3/lb)." };
  if (!(vc > 0)) return { error: "Velocity ceiling must be positive (ft/min)." };
  const req_area_ft2 = (flow * sv) / (vc * 60);
  const req_area_in2 = req_area_ft2 * 144;
  const req_dia_in = Math.sqrt(4 * req_area_ft2 / Math.PI) * 12;
  let chosen = null;
  for (const [nps, id] of _SCH40_ID_IN) { if (id >= req_dia_in) { chosen = [nps, id]; break; } }
  if (!chosen) return { error: "Required diameter exceeds the bundled 12 in Sch 40 table; size a larger main from the schedule." };
  const chosen_area_ft2 = (Math.PI / 4) * Math.pow(chosen[1] / 12, 2);
  const actual_fpm = (flow * sv) / (chosen_area_ft2 * 60);
  return { req_area_in2, req_dia_in, chosen_nps: chosen[0], chosen_id_in: chosen[1], actual_fpm };
}
export const steamPipeVelocityExample = { inputs: { steam_flow_lbhr: 1000, spec_vol_ft3lb: 13.7, vel_ceiling_fpm: 6000 } };

function _renderSteamPipeVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Steam main sizing by continuity - req_area = (flow x specific_volume) / (velocity x 60), then the smallest Sch 40 nominal whose ID clears the required diameter - first-principles, with the recommended velocity band (supply mains ~6,000 to 12,000 ft/min) per ASHRAE Fundamentals / Systems, by name. The specific volume is read from the saturated-steam table at the line pressure. The velocity band is a recommendation, not a code limit; noise, erosion, and condensate reverse-flow bear on the choice, which the engineer of record governs.";
  const flow = makeNumber("Steam mass flow (lb/hr)", "sv-flow", { step: "any", min: "0" });
  const sv = makeNumber("Steam specific volume at pressure (ft3/lb)", "sv-sv", { step: "any", min: "0" });
  const vc = makeNumber("Allowable velocity (ft/min)", "sv-vc", { step: "any", min: "0", value: "6000" });
  vc.input.value = "6000";
  for (const f of [flow, sv, vc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "1000"; sv.input.value = "13.7"; vc.input.value = "6000"; update(); });
  const oReq = makeOutputLine(outputRegion, "Required internal area / diameter", "sv-out-req");
  const oSize = makeOutputLine(outputRegion, "Smallest Sch 40 main", "sv-out-size");
  const oVel = makeOutputLine(outputRegion, "Actual velocity in it", "sv-out-vel");
  const update = debounce(() => {
    const r = computeSteamPipeVelocity({ steam_flow_lbhr: Number(flow.input.value) || 0, spec_vol_ft3lb: Number(sv.input.value) || 0, vel_ceiling_fpm: Number(vc.input.value) || 0 });
    if (r.error) { oReq.textContent = r.error; oSize.textContent = "-"; oVel.textContent = "-"; return; }
    oReq.textContent = fmt(r.req_area_in2, 2) + " in^2 (" + fmt(r.req_dia_in, 2) + " in dia)";
    oSize.textContent = r.chosen_nps + " in (ID " + fmt(r.chosen_id_in, 3) + " in)";
    oVel.textContent = fmt(r.actual_fpm, 0) + " ft/min";
  }, DEBOUNCE_MS);
  for (const f of [flow.input, sv.input, vc.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["steam-pipe-velocity"] = _renderSteamPipeVelocity;

// ---------------------------------------------------------------------
// v643 Steam main capacity from size and velocity (steam-pipe-capacity)
// The inverse of steam-pipe-velocity: given an existing Sch 40 main, how
// much steam it carries within an allowable velocity.
// ---------------------------------------------------------------------
// dims: in { nps: dimensionless, spec_vol_ft3lb: L^3 M^-1, vel_ceiling_fpm: L T^-1 } out: { id_in: L, area_in2: L^2, capacity_lbhr: M T^-1 }
export function computeSteamPipeCapacity({ nps = "2", spec_vol_ft3lb = 0, vel_ceiling_fpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const sv = Number(spec_vol_ft3lb);
  const vc = Number(vel_ceiling_fpm);
  const row = _SCH40_ID_IN.find(([n]) => n === nps);
  if (!row) return { error: "Unknown nominal Sch 40 size." };
  if (!(sv > 0)) return { error: "Specific volume must be positive (ft3/lb)." };
  if (!(vc > 0)) return { error: "Velocity ceiling must be positive (ft/min)." };
  const id_in = row[1];
  const area_ft2 = (Math.PI / 4) * Math.pow(id_in / 12, 2);
  const capacity_lbhr = vc * 60 * area_ft2 / sv;
  return { id_in, area_in2: area_ft2 * 144, capacity_lbhr };
}
export const steamPipeCapacityExample = { inputs: { nps: "2", spec_vol_ft3lb: 13.7, vel_ceiling_fpm: 6000 } };

function _renderSteamPipeCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Steam main capacity by continuity - max flow = velocity x 60 x internal area / specific_volume, the area from the Sch 40 ID - the inverse of the steam-main sizer, with the recommended velocity band (supply mains ~6,000 to 12,000 ft/min) per ASHRAE Fundamentals / Systems, by name. The specific volume is read from the saturated-steam table at the line pressure. The velocity band is a recommendation, not a code limit; noise, erosion, and condensate reverse-flow bear on the choice, which the engineer of record governs.";
  const size = makeSelect("Existing Sch 40 size (in)", "sc-size", _SCH40_ID_IN.map(([n, id]) => ({ value: n, label: n + " in (ID " + id + ")" })));
  size.select.value = "2";
  const sv = makeNumber("Steam specific volume at pressure (ft3/lb)", "sc-sv", { step: "any", min: "0" });
  const vc = makeNumber("Allowable velocity (ft/min)", "sc-vc", { step: "any", min: "0", value: "6000" });
  vc.input.value = "6000";
  for (const f of [size, sv, vc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { size.select.value = "2"; sv.input.value = "13.7"; vc.input.value = "6000"; update(); });
  const oCap = makeOutputLine(outputRegion, "Max steam capacity", "sc-out-cap");
  const oArea = makeOutputLine(outputRegion, "Internal area", "sc-out-area");
  const update = debounce(() => {
    const r = computeSteamPipeCapacity({ nps: size.select.value, spec_vol_ft3lb: Number(sv.input.value) || 0, vel_ceiling_fpm: Number(vc.input.value) || 0 });
    if (r.error) { oCap.textContent = r.error; oArea.textContent = "-"; return; }
    oCap.textContent = fmt(r.capacity_lbhr, 0) + " lb/hr";
    oArea.textContent = fmt(r.area_in2, 2) + " in^2 (ID " + fmt(r.id_in, 3) + " in)";
  }, DEBOUNCE_MS);
  size.select.addEventListener("input", update);
  for (const f of [sv.input, vc.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["steam-pipe-capacity"] = _renderSteamPipeCapacity;

// ---------------------------------------------------------------------
// v159 Steam trap condensate load and required capacity (steam-trap-sizing)
// ---------------------------------------------------------------------
// dims: in { heat_duty_btuhr: M L^2 T^-3, hfg_btulb: L^2 T^-2, safety_factor: dimensionless } out: { condensate_lbhr: M T^-1, req_capacity_lbhr: M T^-1 }
export function computeSteamTrapSizing({ heat_duty_btuhr = 0, hfg_btulb = 0, safety_factor = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(heat_duty_btuhr);
  const hfg = Number(hfg_btulb);
  const sf = Number(safety_factor);
  if (!(q > 0)) return { error: "Heat duty must be positive (Btu/hr)." };
  if (!(hfg > 0)) return { error: "Latent heat must be positive (Btu/lb)." };
  if (!(sf >= 1)) return { error: "Safety factor must be at least 1." };
  const condensate_lbhr = q / hfg;
  const req_capacity_lbhr = condensate_lbhr * sf;
  return { condensate_lbhr, req_capacity_lbhr };
}
export const steamTrapSizingExample = { inputs: { heat_duty_btuhr: 400000, hfg_btulb: 945, safety_factor: 2 } };

function _renderSteamTrapSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Condensate load = heat duty / latent heat; required trap capacity = load x safety factor (2x typical, 3x warm-up / modulating) - first-principles steam thermodynamics and the safety-factor practice, by name. The latent heat is read from the saturated-steam table at the operating pressure. The trap is selected from the manufacturer's capacity chart at the actual differential pressure the installation develops; warm-up, modulating, and stall conditions can demand a larger factor or a different trap type.";
  const q = makeNumber("Heat duty served (Btu/hr)", "st-q", { step: "any", min: "0" });
  const hfg = makeNumber("Latent heat hfg at pressure (Btu/lb)", "st-hfg", { step: "any", min: "0" });
  const sf = makeNumber("Safety factor (2 typical, 3 warm-up)", "st-sf", { step: "any", min: "1", value: "2" });
  sf.input.value = "2";
  for (const f of [q, hfg, sf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "400000"; hfg.input.value = "945"; sf.input.value = "2"; update(); });
  const oLoad = makeOutputLine(outputRegion, "Running condensate load", "st-out-load");
  const oCap = makeOutputLine(outputRegion, "Required trap capacity", "st-out-cap");
  const update = debounce(() => {
    const r = computeSteamTrapSizing({ heat_duty_btuhr: Number(q.input.value) || 0, hfg_btulb: Number(hfg.input.value) || 0, safety_factor: Number(sf.input.value) || 0 });
    if (r.error) { oLoad.textContent = r.error; oCap.textContent = "-"; return; }
    oLoad.textContent = fmt(r.condensate_lbhr, 0) + " lb/hr";
    oCap.textContent = fmt(r.req_capacity_lbhr, 0) + " lb/hr at the operating differential";
  }, DEBOUNCE_MS);
  for (const f of [q.input, hfg.input, sf.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["steam-trap-sizing"] = _renderSteamTrapSizing;

// dims: in { output_btuhr: M L^2 T^-3 } out: { boiler_hp: M L^2 T^-3, steam_lbhr: M T^-1, edr_sqft: L^2 }
// Boiler ratings by the ABMA/ASME definitions anchored on 1 boiler
// horsepower = 33,475 Btu/hr gross output = 34.5 lb/hr of steam
// "from and at" 212 F = 139 sq ft of equivalent direct radiation (EDR).
export function computeBoilerHorsepower({ output_btuhr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const out = Number(output_btuhr);
  if (!(out > 0)) return { error: "Boiler gross output must be positive (Btu/hr)." };
  const boiler_hp = out / 33475;
  const steam_lbhr = boiler_hp * 34.5;
  const edr_sqft = boiler_hp * 139;
  return { boiler_hp, steam_lbhr, edr_sqft };
}
export const boilerHorsepowerExample = { inputs: { output_btuhr: 500000 } };

function _renderBoilerHorsepower(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ABMA / ASME boiler-horsepower definitions - 1 BHP = 33,475 Btu/hr gross output = 34.5 lb/hr of steam evaporated 'from and at' 212 F = 139 sq ft of equivalent direct radiation (EDR). BHP = output / 33,475; steam = BHP x 34.5; EDR = BHP x 139. The 'from and at 212 F' basis assumes feedwater at 212 F and steam at 0 psig; a real plant with cooler feedwater and higher pressure evaporates less per BHP, so apply the boiler maker's factor of evaporation for the actual conditions.";
  const out = makeNumber("Boiler gross output (Btu/hr)", "bhp-out", { step: "any", min: "0" });
  for (const f of [out]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { out.input.value = "500000"; update(); });
  const oHp = makeOutputLine(outputRegion, "Boiler horsepower", "bhp-out-hp");
  const oSteam = makeOutputLine(outputRegion, "Steam output (from and at 212 F)", "bhp-out-steam");
  const oEdr = makeOutputLine(outputRegion, "Equivalent direct radiation", "bhp-out-edr");
  const update = debounce(() => {
    const r = computeBoilerHorsepower({ output_btuhr: Number(out.input.value) || 0 });
    if (r.error) { oHp.textContent = r.error; oSteam.textContent = "-"; oEdr.textContent = "-"; return; }
    oHp.textContent = fmt(r.boiler_hp, 2) + " BHP";
    oSteam.textContent = fmt(r.steam_lbhr, 0) + " lb/hr";
    oEdr.textContent = fmt(r.edr_sqft, 0) + " sq ft EDR";
  }, DEBOUNCE_MS);
  out.input.addEventListener("input", update);
}
PIPEFIT_RENDERERS["boiler-horsepower"] = _renderBoilerHorsepower;

// ---------------------------------------------------------------------
// v160 ASME B31.1 pipe pressure rating / required wall (pipe-pressure-rating)
// ---------------------------------------------------------------------
// dims: in { od_in: L, wall_in: L, allow_stress: M L^-1 T^-2, joint_factor: dimensionless, y_coeff: dimensionless, mill_tol_frac: dimensionless, allowance_in: L, design_p: M L^-1 T^-2, mode: dimensionless } out: { p_allow: M L^-1 T^-2, t_min: L, t_avail: L }
export function computePipePressureRating({ od_in = 0, wall_in = 0, allow_stress = 0, joint_factor = 1, y_coeff = 0.4, mill_tol_frac = 0.125, allowance_in = 0, design_p = 0, mode = "allowable_pressure" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const od = Number(od_in);
  const S = Number(allow_stress);
  const E = Number(joint_factor);
  const y = Number(y_coeff);
  const mt = Number(mill_tol_frac);
  const A = Number(allowance_in) || 0;
  if (!(od > 0)) return { error: "Outside diameter must be positive (in)." };
  if (!(S > 0)) return { error: "Allowable stress must be positive (psi)." };
  if (!(E > 0 && E <= 1)) return { error: "Joint factor E must be in (0, 1]." };
  if (!(mt >= 0 && mt < 1)) return { error: "Mill-tolerance fraction must be in [0, 1)." };
  if (A < 0) return { error: "Allowance must be non-negative (in)." };
  if (mode === "required_wall") {
    const dp = Number(design_p);
    if (!(dp > 0)) return { error: "Design pressure must be positive (psi)." };
    const t_min = (dp * od) / (2 * (S * E + dp * y)) + A;
    return { mode, t_min };
  }
  // allowable-pressure mode
  const wall = Number(wall_in);
  if (!(wall > 0)) return { error: "Wall thickness must be positive (in)." };
  const t_avail = wall * (1 - mt);
  const denom = od - 2 * y * (t_avail - A);
  if (!(denom > 0)) return { error: "Degenerate geometry: D - 2y(t - A) is not positive." };
  if (!(t_avail - A > 0)) return { error: "Allowance exceeds the available wall." };
  const p_allow = (2 * S * E * (t_avail - A)) / denom;
  return { mode, t_avail, p_allow };
}
export const pipePressureRatingExample = { inputs: { od_in: 4.5, wall_in: 0.237, allow_stress: 17100, joint_factor: 1, y_coeff: 0.4, mill_tol_frac: 0.125, allowance_in: 0, mode: "allowable_pressure" } };

function _renderPipePressureRating(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B31.1 Power Piping internal-pressure design - allowable pressure P = 2 S E (t - A) / (D - 2 y (t - A)); minimum wall t = P D / (2 (S E + P y)) + A - by name (B31.3 Process Piping uses the same form with its own allowables). The allowable stress S, joint efficiency E, and y-coefficient are read from the applicable code edition's tables for the specific material and temperature. This is a design screen, not a stamped calculation; the engineer of record and the AHJ govern.";
  const mode = makeSelect("Mode", "pp-mode", [
    { value: "allowable_pressure", label: "Allowable pressure from wall", selected: true },
    { value: "required_wall", label: "Required wall from pressure" },
  ]);
  const od = makeNumber("Outside diameter (in)", "pp-od", { step: "any", min: "0" });
  const wall = makeNumber("Nominal wall (in)", "pp-wall", { step: "any", min: "0" });
  const dp = makeNumber("Design pressure (psi, required-wall mode)", "pp-dp", { step: "any", min: "0" });
  const S = makeNumber("Allowable stress S at temperature (psi)", "pp-s", { step: "any", min: "0" });
  const E = makeNumber("Joint factor E (seamless = 1.0)", "pp-e", { step: "any", min: "0", max: "1", value: "1" });
  E.input.value = "1";
  const y = makeNumber("y-coefficient (ferritic <= 900F = 0.4)", "pp-y", { step: "any", value: "0.4" });
  y.input.value = "0.4";
  const mt = makeNumber("Mill under-tolerance fraction", "pp-mt", { step: "any", min: "0", value: "0.125" });
  mt.input.value = "0.125";
  const A = makeNumber("Corrosion + threading allowance A (in)", "pp-a", { step: "any", min: "0", value: "0" });
  for (const f of [mode, od, wall, dp, S, E, y, mt, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "allowable_pressure"; od.input.value = "4.5"; wall.input.value = "0.237"; dp.input.value = ""; S.input.value = "17100"; E.input.value = "1"; y.input.value = "0.4"; mt.input.value = "0.125"; A.input.value = "0"; update(); });
  const oOut = makeOutputLine(outputRegion, "Result", "pp-out");
  const oWall = makeOutputLine(outputRegion, "Available wall after mill tolerance", "pp-out-wall");
  const update = debounce(() => {
    const r = computePipePressureRating({
      od_in: Number(od.input.value) || 0, wall_in: Number(wall.input.value) || 0,
      allow_stress: Number(S.input.value) || 0, joint_factor: Number(E.input.value) || 0,
      y_coeff: Number(y.input.value) || 0, mill_tol_frac: Number(mt.input.value) || 0,
      allowance_in: Number(A.input.value) || 0, design_p: Number(dp.input.value) || 0,
      mode: mode.select.value,
    });
    if (r.error) { oOut.textContent = r.error; oWall.textContent = "-"; return; }
    if (r.mode === "required_wall") {
      oOut.textContent = "Minimum wall " + fmt(r.t_min, 4) + " in";
      oWall.textContent = "-";
    } else {
      oOut.textContent = "Maximum allowable pressure " + fmt(r.p_allow, 0) + " psi";
      oWall.textContent = fmt(r.t_avail, 4) + " in";
    }
  }, DEBOUNCE_MS);
  for (const f of [od.input, wall.input, dp.input, S.input, E.input, y.input, mt.input, A.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
PIPEFIT_RENDERERS["pipe-pressure-rating"] = _renderPipePressureRating;

// ---------------------------------------------------------------------
// v161 Filled pipe support load (pipe-filled-support-load)
// ---------------------------------------------------------------------
// dims: in { od_in: L, wall_in: L, pipe_density: M L^-3, fluid_density: M L^-3, insul_thk_in: L, insul_density: M L^-3, spacing_ft: L } out: { empty_lbft: M L^-1, fluid_lbft: M L^-1, insul_lbft: M L^-1, filled_lbft: M L^-1, per_hanger_lb: M }
export function computePipeFilledSupportLoad({ od_in = 0, wall_in = 0, pipe_density = 490, fluid_density = 62.4, insul_thk_in = 0, insul_density = 6, spacing_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const od = Number(od_in);
  const wall = Number(wall_in);
  const pd = Number(pipe_density);
  const fd = Number(fluid_density);
  const thk = Math.max(0, Number(insul_thk_in) || 0);
  const idns = Number(insul_density);
  const spacing = Number(spacing_ft);
  if (!(od > 0)) return { error: "Outside diameter must be positive (in)." };
  if (!(wall > 0)) return { error: "Wall thickness must be positive (in)." };
  if (!(wall < od / 2)) return { error: "Wall must be less than half the OD (degenerate bore)." };
  if (!(spacing > 0)) return { error: "Hanger spacing must be positive (ft)." };
  if (pd < 0 || fd < 0 || idns < 0) return { error: "Densities must be non-negative." };
  const id = od - 2 * wall;
  const empty_lbft = (Math.PI / 4) * (od * od - id * id) / 144 * pd;
  const fluid_lbft = (Math.PI / 4) * (id * id) / 144 * fd;
  const insul_lbft = thk > 0 ? (Math.PI / 4) * (Math.pow(od + 2 * thk, 2) - od * od) / 144 * idns : 0;
  const filled_lbft = empty_lbft + fluid_lbft + insul_lbft;
  const per_hanger_lb = filled_lbft * spacing;
  return { id_in: id, empty_lbft, fluid_lbft, insul_lbft, filled_lbft, per_hanger_lb };
}
export const pipeFilledSupportLoadExample = { inputs: { od_in: 4.5, wall_in: 0.237, pipe_density: 490, fluid_density: 62.4, insul_thk_in: 0, insul_density: 6, spacing_ft: 14 } };

function _renderPipeFilledSupportLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Operating support load = (empty pipe + contained fluid + insulation) weight per foot x hanger spacing - first-principles cross-section x density, the MSS SP-58 operating support load, by name. Bundled pipe weights are nominal mill values and water is taken at 62.4 lb/ft^3; a hot or dense fluid changes the contents weight, and concentrated loads (valves, flanges) are added separately. Feeds the hanger-rod sizing.";
  const od = makeNumber("Outside diameter (in)", "fl-od", { step: "any", min: "0" });
  const wall = makeNumber("Wall thickness (in)", "fl-wall", { step: "any", min: "0" });
  const pd = makeNumber("Pipe material density (lb/ft3; steel 490)", "fl-pd", { step: "any", min: "0", value: "490" });
  pd.input.value = "490";
  const fd = makeNumber("Fluid density (lb/ft3; water 62.4)", "fl-fd", { step: "any", min: "0", value: "62.4" });
  fd.input.value = "62.4";
  const thk = makeNumber("Insulation thickness (in)", "fl-thk", { step: "any", min: "0", value: "0" });
  const idns = makeNumber("Insulation density (lb/ft3)", "fl-idns", { step: "any", min: "0", value: "6" });
  idns.input.value = "6";
  const spacing = makeNumber("Hanger spacing (ft)", "fl-sp", { step: "any", min: "0" });
  for (const f of [od, wall, pd, fd, thk, idns, spacing]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "4.5"; wall.input.value = "0.237"; pd.input.value = "490"; fd.input.value = "62.4"; thk.input.value = "0"; idns.input.value = "6"; spacing.input.value = "14"; update(); });
  const oFt = makeOutputLine(outputRegion, "Filled weight per foot", "fl-out-ft");
  const oBreak = makeOutputLine(outputRegion, "Empty / fluid / insulation", "fl-out-break");
  const oHanger = makeOutputLine(outputRegion, "Load per hanger", "fl-out-hanger");
  const update = debounce(() => {
    const r = computePipeFilledSupportLoad({
      od_in: Number(od.input.value) || 0, wall_in: Number(wall.input.value) || 0,
      pipe_density: Number(pd.input.value) || 0, fluid_density: Number(fd.input.value) || 0,
      insul_thk_in: Number(thk.input.value) || 0, insul_density: Number(idns.input.value) || 0,
      spacing_ft: Number(spacing.input.value) || 0,
    });
    if (r.error) { oFt.textContent = r.error; oBreak.textContent = "-"; oHanger.textContent = "-"; return; }
    oFt.textContent = fmt(r.filled_lbft, 2) + " lb/ft";
    oBreak.textContent = fmt(r.empty_lbft, 2) + " / " + fmt(r.fluid_lbft, 2) + " / " + fmt(r.insul_lbft, 2) + " lb/ft";
    oHanger.textContent = fmt(r.per_hanger_lb, 0) + " lb";
  }, DEBOUNCE_MS);
  for (const f of [od.input, wall.input, pd.input, fd.input, thk.input, idns.input, spacing.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["pipe-filled-support-load"] = _renderPipeFilledSupportLoad;

// ---------------------------------------------------------------------
// v162 Hanger rod load and diameter (hanger-rod-sizing) - MSS SP-58
// ---------------------------------------------------------------------
// dims: in { load_lb: M, temp_derate: dimensionless } out: { rod_dia: dimensionless, rated_lb: M, utilization_pct: dimensionless }
export function computeHangerRodSizing({ load_lb = 0, temp_derate = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(load_lb);
  const derate = Number(temp_derate);
  if (!(load > 0)) return { error: "Load must be positive (lb)." };
  if (!(derate > 0 && derate <= 1)) return { error: "Temperature derate must be in (0, 1]." };
  let chosen = null;
  for (const [dia, cap] of _MSS_SP58_ROD_LB) {
    if (cap * derate >= load) { chosen = [dia, cap * derate]; break; }
  }
  if (!chosen) return { error: "Load exceeds the largest tabulated rod (1-1/2 in) after derate; engineer the support." };
  return { rod_dia: chosen[0], rated_lb: chosen[1], utilization_pct: (load / chosen[1]) * 100 };
}
export const hangerRodSizingExample = { inputs: { load_lb: 228, temp_derate: 1 } };

function _renderHangerRodSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Minimum hanger rod = smallest carbon-steel threaded rod whose MSS SP-58 maximum safe load (at or below 650F) clears the applied load after the temperature derate - by name. The bundled loads (3/8 in 610 lb, 1/2 in 1130 lb, ...) are the standard's carbon-steel values; above 650F apply the standard's derate curve (user factor for an off-table temperature). The engineer of record and the standard's current edition govern the final selection.";
  const load = makeNumber("Operating load per hanger (lb)", "hr-load", { step: "any", min: "0" });
  const derate = makeNumber("Temperature derate factor (1.0 at ambient)", "hr-derate", { step: "any", min: "0", max: "1", value: "1" });
  derate.input.value = "1";
  for (const f of [load, derate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "228"; derate.input.value = "1"; update(); });
  const oRod = makeOutputLine(outputRegion, "Minimum rod diameter", "hr-out-rod");
  const oUtil = makeOutputLine(outputRegion, "Rated load / utilization", "hr-out-util");
  const update = debounce(() => {
    const r = computeHangerRodSizing({ load_lb: Number(load.input.value) || 0, temp_derate: Number(derate.input.value) || 0 });
    if (r.error) { oRod.textContent = r.error; oUtil.textContent = "-"; return; }
    oRod.textContent = r.rod_dia + " in";
    oUtil.textContent = fmt(r.rated_lb, 0) + " lb rated, " + fmt(r.utilization_pct, 0) + "% utilized";
  }, DEBOUNCE_MS);
  for (const f of [load.input, derate.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["hanger-rod-sizing"] = _renderHangerRodSizing;

// ---------------------------------------------------------------------
// v200 Condensate return line sizing (condensate-return-sizing)
// ---------------------------------------------------------------------
// A condensate return is sized for the FLASH steam that re-boils off the
// condensate at the lower return pressure (hundreds of times the water
// volume), not for the liquid - size for the liquid and it floods and
// water-hammers. Flash mass x specific volume / continuity, then the
// smallest Sch 40 nominal at a return-velocity ceiling.
// dims: in { condensate_lbhr: M T^-1, flash_fraction: dimensionless, spec_vol_ft3lb: L^3 M^-1, vel_ceiling_fpm: L T^-1 } out: { flash_lbhr: M T^-1, vol_cfm: L^3 T^-1, req_area_in2: L^2, req_dia_in: L, chosen_nps: dimensionless, chosen_id_in: L }
export function computeCondensateReturnSizing({ condensate_lbhr = 0, flash_fraction = 0, spec_vol_ft3lb = 0, vel_ceiling_fpm = 4000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(condensate_lbhr);
  const ff = Number(flash_fraction);
  const sv = Number(spec_vol_ft3lb);
  const vc = Number(vel_ceiling_fpm);
  if (!(load > 0)) return { error: "Condensate load must be positive (lb/hr)." };
  if (!(ff >= 0 && ff < 1)) return { error: "Flash fraction must be 0 to <1 (use flash-steam-pct)." };
  if (!(sv > 0)) return { error: "Flash-steam specific volume must be positive (ft3/lb)." };
  if (!(vc > 0)) return { error: "Velocity ceiling must be positive (ft/min)." };
  const flash_lbhr = load * ff;
  const vol_cfm = (flash_lbhr * sv) / 60;
  const req_area_ft2 = vol_cfm / vc;
  const req_area_in2 = req_area_ft2 * 144;
  const req_dia_in = Math.sqrt(4 * req_area_ft2 / Math.PI) * 12;
  let chosen = null;
  for (const [nps, id] of _SCH40_ID_IN) { if (id >= req_dia_in) { chosen = [nps, id]; break; } }
  if (!chosen) return { error: "Required diameter exceeds the bundled 12 in Sch 40 table; size a larger return from the schedule." };
  return { flash_lbhr, vol_cfm, req_area_in2, req_dia_in, chosen_nps: chosen[0], chosen_id_in: chosen[1] };
}
export const condensateReturnSizingExample = { inputs: { condensate_lbhr: 800, flash_fraction: 0.13, spec_vol_ft3lb: 26.8, vel_ceiling_fpm: 4000 } };

function _renderCondensateReturnSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Condensate return sized for the flash steam - flash = load x flash_fraction; volumetric flow = flash x specific_volume / 60; required area = flow / velocity ceiling, then the smallest Sch 40 nominal whose ID clears the required diameter - first-principles continuity, with the return-velocity ceiling (~4,000 to 5,000 ft/min, lower than a supply main) per ASHRAE / Spirax Sarco return-sizing practice, by name. The return is sized for the flash, not the liquid; a wet, dry, or vacuum return and any lift each change the scheme, which the engineer of record governs.";
  const load = makeNumber("Condensate load to the return (lb/hr)", "cr-load", { step: "any", min: "0" });
  const ff = makeNumber("Flash fraction at return pressure (0-1)", "cr-ff", { step: "any", min: "0", max: "1" });
  const sv = makeNumber("Flash-steam specific volume at return pressure (ft3/lb)", "cr-sv", { step: "any", min: "0" });
  const vc = makeNumber("Return velocity ceiling (ft/min)", "cr-vc", { step: "any", min: "0", value: "4000" });
  vc.input.value = "4000";
  for (const f of [load, ff, sv, vc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "800"; ff.input.value = "0.13"; sv.input.value = "26.8"; vc.input.value = "4000"; update(); });
  const oFlash = makeOutputLine(outputRegion, "Flash steam / volume", "cr-out-flash");
  const oReq = makeOutputLine(outputRegion, "Required internal area / diameter", "cr-out-req");
  const oSize = makeOutputLine(outputRegion, "Smallest Sch 40 return", "cr-out-size");
  const update = debounce(() => {
    const r = computeCondensateReturnSizing({ condensate_lbhr: Number(load.input.value) || 0, flash_fraction: Number(ff.input.value) || 0, spec_vol_ft3lb: Number(sv.input.value) || 0, vel_ceiling_fpm: Number(vc.input.value) || 0 });
    if (r.error) { oFlash.textContent = r.error; oReq.textContent = "-"; oSize.textContent = "-"; return; }
    oFlash.textContent = fmt(r.flash_lbhr, 0) + " lb/hr flash (" + fmt(r.vol_cfm, 1) + " cfm)";
    oReq.textContent = fmt(r.req_area_in2, 2) + " in^2 (" + fmt(r.req_dia_in, 2) + " in dia)";
    oSize.textContent = r.chosen_nps + " in (ID " + fmt(r.chosen_id_in, 3) + " in)";
  }, DEBOUNCE_MS);
  for (const f of [load.input, ff.input, sv.input, vc.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["condensate-return-sizing"] = _renderCondensateReturnSizing;

// ---------------------------------------------------------------------
// v201 Branch saddle cutback template (branch-saddle-cutback)
// ---------------------------------------------------------------------
// The saddle is the branch pipe notched to sit on the curved side of a run
// pipe for a welded branch connection. The cutback contour around the
// branch end is a fixed function of the two diameters: the cylinder
// intersection cutback(theta) = R - sqrt(R^2 - (r sin theta)^2).
// dims: in { branch_od_in: L, run_od_in: L, stations: dimensionless } out: { r_in: L, R_in: L, max_cutback_in: L }
export function computeBranchSaddleCutback({ branch_od_in = 0, run_od_in = 0, stations = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bod = Number(branch_od_in);
  const rod = Number(run_od_in);
  if (!(bod > 0)) return { error: "Branch OD must be positive (in)." };
  if (!(rod > 0)) return { error: "Run OD must be positive (in)." };
  if (bod > rod) return { error: "Branch OD must be <= run OD (no saddle geometry for an equal-or-larger branch by this method)." };
  let n = Math.round(Number(stations));
  if (!(n >= 1 && n <= 24)) n = 6;
  const r = bod / 2;
  const R = rod / 2;
  const max_cutback_in = R - Math.sqrt(R * R - r * r);
  const ordinates = [];
  for (let i = 0; i <= n; i++) {
    const deg = (90 * i) / n;
    const s = Math.sin((deg * Math.PI) / 180);
    const cb = R - Math.sqrt(Math.max(0, R * R - (r * s) * (r * s)));
    ordinates.push({ angle_deg: deg, cutback_in: cb });
  }
  return { r_in: r, R_in: R, max_cutback_in, stations: n, ordinates };
}
export const branchSaddleCutbackExample = { inputs: { branch_od_in: 2.375, run_od_in: 6.625, stations: 6 } };

function _renderBranchSaddleCutback(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Branch saddle contour - cutback(theta) = R - sqrt(R^2 - (r sin theta)^2) around the branch end, theta measured from the line of the run axis (heel/toe = 0, sides = 90, where the cutback is maximum) - the cylinder-intersection geometry per Pipe Fabrication Institute layout practice, by name. This is the geometric contour for a 90-degree, same-centerline branch; the weld bevel, gap, and root face are added per the WPS, and a reducing or angled branch shifts the contour. A fit-up aid, not a weld procedure.";
  const bod = makeNumber("Branch pipe OD (in)", "bs-bod", { step: "any", min: "0" });
  const rod = makeNumber("Run pipe OD (in)", "bs-rod", { step: "any", min: "0" });
  const st = makeNumber("Marks per quarter (default 6 = every 15 deg)", "bs-st", { step: "1", min: "1", max: "24", value: "6" });
  st.input.value = "6";
  for (const f of [bod, rod, st]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bod.input.value = "2.375"; rod.input.value = "6.625"; st.input.value = "6"; update(); });
  const oMax = makeOutputLine(outputRegion, "Maximum cutback (at the sides)", "bs-out-max");
  const oTab = makeOutputLine(outputRegion, "Ordinates (angle: cutback, in)", "bs-out-tab");
  const update = debounce(() => {
    const r = computeBranchSaddleCutback({ branch_od_in: Number(bod.input.value) || 0, run_od_in: Number(rod.input.value) || 0, stations: Number(st.input.value) || 6 });
    if (r.error) { oMax.textContent = r.error; oTab.textContent = "-"; return; }
    oMax.textContent = fmt(r.max_cutback_in, 3) + " in (r " + fmt(r.r_in, 3) + ", R " + fmt(r.R_in, 3) + ")";
    oTab.textContent = r.ordinates.map((o) => fmt(o.angle_deg, 0) + "°: " + fmt(o.cutback_in, 3)).join(", ");
  }, DEBOUNCE_MS);
  for (const f of [bod.input, rod.input, st.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["branch-saddle-cutback"] = _renderBranchSaddleCutback;

// ---------------------------------------------------------------------
// v202 Reducer centerline offset and invert continuity (reducer-offset)
// ---------------------------------------------------------------------
// A concentric reducer keeps the centerlines aligned but drops the invert
// by half the diameter change (a dam on a gravity drain, an air pocket on
// a pump suction). An eccentric reducer keeps one side flat: flat-on-bottom
// holds the invert continuous, flat-on-top holds the crown continuous.
// dims: in { large_od_in: L, small_od_in: L, lay_length_in: L, type: dimensionless } out: { centerline_offset_in: L, bop_shift_in: L, top_shift_in: L }
export function computeReducerOffset({ large_od_in = 0, small_od_in = 0, lay_length_in = 0, type = "concentric" } = {}) {
  const _g = _finiteGuard({ large_od_in, small_od_in, lay_length_in }); if (_g) return _g;
  const D = Number(large_od_in);
  const d = Number(small_od_in);
  if (!(D > 0)) return { error: "Large-end OD must be positive (in)." };
  if (!(d > 0)) return { error: "Small-end OD must be positive (in)." };
  if (!(d < D)) return { error: "Small-end OD must be less than the large-end OD." };
  const TYPES = { "concentric": 1, "eccentric-flat-bottom": 1, "eccentric-flat-top": 1 };
  if (!TYPES[type]) return { error: "Type must be concentric, eccentric-flat-bottom, or eccentric-flat-top." };
  const centerline_offset_in = (D - d) / 2;
  let continuous_surface, bop_shift_in, top_shift_in, note;
  if (type === "concentric") {
    continuous_surface = "centerline";
    bop_shift_in = centerline_offset_in;   // invert rises at the small end
    top_shift_in = -centerline_offset_in;  // crown drops at the small end
    note = "Centerline continuous; the invert rises and the crown drops by the offset at the small end - a dam on a gravity drain and an air pocket on a pump suction.";
  } else if (type === "eccentric-flat-bottom") {
    continuous_surface = "invert (bottom)";
    bop_shift_in = 0;
    top_shift_in = -2 * centerline_offset_in;
    note = "Invert (bottom) continuous; the centerline and crown drop - correct on a gravity drain so the run stays self-cleaning.";
  } else {
    continuous_surface = "crown (top)";
    bop_shift_in = 2 * centerline_offset_in;
    top_shift_in = 0;
    note = "Crown (top) continuous; the centerline and invert rise - correct on a pump suction so air clears.";
  }
  return { centerline_offset_in, continuous_surface, bop_shift_in, top_shift_in, lay_length_in: Number(lay_length_in) || 0, type, note };
}
export const reducerOffsetExample = { inputs: { large_od_in: 6.625, small_od_in: 4.5, lay_length_in: 7, type: "eccentric-flat-bottom" } };

function _renderReducerOffset(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Reducer centerline offset = (large OD - small OD) / 2, and which surface stays continuous by type - concentric holds the centerline, eccentric flat-on-bottom holds the invert, eccentric flat-on-top holds the crown - first-principles geometry, with the standard lay lengths per ASME B16.9 (bundled value entered by the user; a non-standard reducer overrides). Flat-on-bottom keeps a drain self-cleaning and flat-on-top keeps a pump suction free of air. The lay length is a fitting dimension, not a code minimum.";
  const D = makeNumber("Large-end OD (in)", "ro-D", { step: "any", min: "0" });
  const d = makeNumber("Small-end OD (in)", "ro-d", { step: "any", min: "0" });
  const lay = makeNumber("Lay length (in, B16.9 / fitting)", "ro-lay", { step: "any", min: "0" });
  const type = makeSelect("Reducer type", "ro-type", [
    { value: "concentric", label: "Concentric (centerline)", selected: true },
    { value: "eccentric-flat-bottom", label: "Eccentric flat-on-bottom (invert)" },
    { value: "eccentric-flat-top", label: "Eccentric flat-on-top (crown)" },
  ]);
  for (const f of [D, d, lay, type]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "6.625"; d.input.value = "4.5"; lay.input.value = "7"; type.select.value = "eccentric-flat-bottom"; update(); });
  const oOff = makeOutputLine(outputRegion, "Centerline offset", "ro-out-off");
  const oCont = makeOutputLine(outputRegion, "Continuous surface", "ro-out-cont");
  const oNote = makeOutputLine(outputRegion, "Note", "ro-out-note");
  const update = debounce(() => {
    const r = computeReducerOffset({ large_od_in: Number(D.input.value) || 0, small_od_in: Number(d.input.value) || 0, lay_length_in: Number(lay.input.value) || 0, type: type.select.value });
    if (r.error) { oOff.textContent = r.error; oCont.textContent = "-"; oNote.textContent = ""; return; }
    oOff.textContent = fmt(r.centerline_offset_in, 4) + " in" + (r.lay_length_in > 0 ? " (lay " + fmt(r.lay_length_in, 2) + " in)" : "");
    oCont.textContent = r.continuous_surface;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [D.input, d.input, lay.input]) f.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
PIPEFIT_RENDERERS["reducer-offset"] = _renderReducerOffset;

// ---------------------------------------------------------------------
// v203 Flange pressure-temperature rating (flange-rating) - ASME B16.5
// ---------------------------------------------------------------------
// The maximum allowable working pressure of a flange CLASS drops with
// temperature on a fixed ASME B16.5 table. Bundled ratings are Material
// Group 1.1 (carbon steel, e.g. A105); other material groups have their own
// tables. Linear interpolation between the table temperatures.
const _B16_5_TEMPS_F = [100, 200, 300, 400, 500, 600, 650];
const _B16_5_GROUP_1_1 = {
  150: [285, 260, 230, 200, 170, 140, 125],
  300: [740, 680, 655, 635, 605, 570, 550],
  600: [1480, 1360, 1310, 1265, 1205, 1135, 1100],
};
// 900 / 1500 / 2500 scale from the 600 column by the class ratio.
const _B16_5_SCALE = { 900: 1.5, 1500: 2.5, 2500: 4.17 };
// dims: in { flange_class: dimensionless, temp_f: T } out: { mawp_psig: M L^-1 T^-2 }
export function computeFlangeRating({ flange_class = 150, temp_f = 0 } = {}) {
  const _g = _finiteGuard({ flange_class, temp_f }); if (_g) return _g;
  const cls = Number(flange_class);
  const t = Number(temp_f);
  let row = _B16_5_GROUP_1_1[cls];
  if (!row && _B16_5_SCALE[cls]) row = _B16_5_GROUP_1_1[600].map((v) => v * _B16_5_SCALE[cls]);
  if (!row) return { error: "Flange class must be 150, 300, 600, 900, 1500, or 2500." };
  const tMin = _B16_5_TEMPS_F[0];
  const tMax = _B16_5_TEMPS_F[_B16_5_TEMPS_F.length - 1];
  if (!(t >= tMin && t <= tMax)) return { error: "Temperature " + tMin + " to " + tMax + " F (interpolate from the governing edition outside the bundled range)." };
  let mawp;
  for (let i = 0; i < _B16_5_TEMPS_F.length - 1; i++) {
    const t0 = _B16_5_TEMPS_F[i], t1 = _B16_5_TEMPS_F[i + 1];
    if (t >= t0 && t <= t1) {
      const frac = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      mawp = row[i] + frac * (row[i + 1] - row[i]);
      break;
    }
  }
  return { flange_class: cls, temp_f: t, mawp_psig: mawp };
}
export const flangeRatingExample = { inputs: { flange_class: 150, temp_f: 400 } };

function _renderFlangeRating(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Flange pressure-temperature rating - the maximum allowable working pressure read from the ASME B16.5 table for the flange class, linearly interpolated between table temperatures, by name. The bundled ratings are Material Group 1.1 (carbon steel, e.g. A105); other material groups have their own tables. The value is the flange's rating - the weakest component (gasket, bolting, the mating pipe) can still govern the joint. The AHJ and the engineer of record govern.";
  const cls = makeSelect("Flange class (pound)", "fr-cls", [
    { value: "150", label: "Class 150", selected: true }, { value: "300", label: "Class 300" },
    { value: "600", label: "Class 600" }, { value: "900", label: "Class 900" },
    { value: "1500", label: "Class 1500" }, { value: "2500", label: "Class 2500" },
  ]);
  const t = makeNumber("Service temperature (F)", "fr-t", { step: "any", value: "100" });
  for (const f of [cls, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cls.select.value = "150"; t.input.value = "400"; update(); });
  const oRate = makeOutputLine(outputRegion, "Max allowable working pressure", "fr-out-rate");
  const update = debounce(() => {
    const r = computeFlangeRating({ flange_class: Number(cls.select.value), temp_f: Number(t.input.value) || 0 });
    if (r.error) { oRate.textContent = r.error; return; }
    oRate.textContent = fmt(r.mawp_psig, 0) + " psig (Class " + r.flange_class + ", Group 1.1, at " + fmt(r.temp_f, 0) + " F)";
  }, DEBOUNCE_MS);
  t.input.addEventListener("input", update);
  cls.select.addEventListener("change", update);
}
PIPEFIT_RENDERERS["flange-rating"] = _renderFlangeRating;

// ---------------------------------------------------------------------
// v204 Branch connection reinforcement - area replacement (branch-reinforcement)
// ---------------------------------------------------------------------
// ASME B31.1 para 104.3.1 (and B31.3 304.3 for process): when a branch
// opening is cut into a pressurized run, the metal removed must be made up
// nearby. The required-replacement area A_required = t_rh x d1 x (2 - sin b)
// is supplied by the excess wall in the run (A1) and the branch (A2) within
// the reinforcement zone; any shortfall is the reinforcing-pad area to add.
// Required walls come from the pressure design (pipe-pressure-rating); the
// engineer of record and the AHJ govern - this is the area balance, not a
// stamped branch-connection design.
// dims: in { run_od_in: L, run_wall_in: L, run_treq_in: L, branch_od_in: L, branch_wall_in: L, branch_treq_in: L, beta_deg: dimensionless } out: { d1_in: L, a_required_in2: L^2, a_run_in2: L^2, a_branch_in2: L^2, a_available_in2: L^2, pad_area_in2: L^2, branch_run_od_ratio: dimensionless, large_branch: dimensionless }
export function computeBranchReinforcement({ run_od_in = 0, run_wall_in = 0, run_treq_in = 0, branch_od_in = 0, branch_wall_in = 0, branch_treq_in = 0, beta_deg = 90 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rod = Number(run_od_in), bod = Number(branch_od_in);
  const Th = Number(run_wall_in), trh = Number(run_treq_in);
  const Tb = Number(branch_wall_in), trb = Number(branch_treq_in);
  const beta = Number(beta_deg);
  if (!(rod > 0)) return { error: "Run OD must be positive (in)." };
  if (!(bod > 0)) return { error: "Branch OD must be positive (in)." };
  if (!(Th > 0) || !(Tb > 0)) return { error: "Nominal walls must be positive (in)." };
  if (!(trh >= 0) || !(trb >= 0)) return { error: "Required walls must be non-negative (in)." };
  if (!(trh < Th)) return { error: "Run required wall must be less than the nominal wall (no excess to credit)." };
  if (!(beta > 0 && beta <= 90)) return { error: "Branch angle must be in (0, 90] degrees." };
  const sinB = Math.sin((beta * Math.PI) / 180);
  const d1 = (bod - 2 * Tb) / sinB;                      // effective opening in the run
  if (!(d1 > 0)) return { error: "Branch bore must be positive (check the branch OD and wall)." };
  const a_required = trh * d1 * (2 - sinB);
  const d2 = Math.max(d1, Tb + Th + d1 / 2);             // reinforcement zone half-width
  const L4 = Math.min(2.5 * Th, 2.5 * Tb);               // zone height up the branch (no pad)
  const a1 = (2 * d2 - d1) * (Th - trh);                 // excess metal in the run
  const a2 = 2 * L4 * (Tb - trb);                        // excess metal in the branch
  const a_available = a1 + a2;
  const adequate = a_available >= a_required;
  const pad_area = Math.max(0, a_required - a_available);
  // Applicability screen: the simple area-replacement rules are intended for a
  // branch that is not a near-full-size outlet on the run. When the branch OD
  // approaches the run OD (ratio over ~0.5) a listed tee or a more rigorous
  // analysis is the norm, so flag it rather than report a bare area balance.
  const branch_run_od_ratio = bod / rod;
  const large_branch = branch_run_od_ratio > 0.5;
  return {
    d1_in: d1, a_required_in2: a_required, a_run_in2: a1, a_branch_in2: a2,
    a_available_in2: a_available, adequate, pad_area_in2: pad_area,
    branch_run_od_ratio, large_branch,
  };
}
export const branchReinforcementExample = { inputs: { run_od_in: 6.625, run_wall_in: 0.280, run_treq_in: 0.10, branch_od_in: 2.375, branch_wall_in: 0.154, branch_treq_in: 0.034, beta_deg: 90 } };

function _renderBranchReinforcement(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Branch-opening area replacement - A_required = t_rh x d1 x (2 - sin beta) made up by the excess wall in the run (A1) and the branch (A2) within the reinforcement zone, per ASME B31.1 para 104.3.1 (and B31.3 304.3 for process), by name. The required wall thicknesses come from the pressure design (see pipe-pressure-rating), the reinforcement zone limits and the weld/pad area follow the code's figure, and the engineer of record and the AHJ govern. This is the area balance, not a stamped branch-connection design.";
  const rod = makeNumber("Run (header) OD (in)", "br-rod", { step: "any", min: "0" });
  const rwall = makeNumber("Run nominal wall (in)", "br-rwall", { step: "any", min: "0" });
  const rtreq = makeNumber("Run required wall t_rh (in)", "br-rtreq", { step: "any", min: "0" });
  const bod = makeNumber("Branch OD (in)", "br-bod", { step: "any", min: "0" });
  const bwall = makeNumber("Branch nominal wall (in)", "br-bwall", { step: "any", min: "0" });
  const btreq = makeNumber("Branch required wall t_rb (in)", "br-btreq", { step: "any", min: "0" });
  const beta = makeNumber("Branch angle to the run (deg, 90 = perpendicular)", "br-beta", { step: "any", min: "0", max: "90", value: "90" });
  beta.input.value = "90";
  for (const f of [rod, rwall, rtreq, bod, bwall, btreq, beta]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    rod.input.value = "6.625"; rwall.input.value = "0.280"; rtreq.input.value = "0.10";
    bod.input.value = "2.375"; bwall.input.value = "0.154"; btreq.input.value = "0.034"; beta.input.value = "90"; update();
  });
  const oReq = makeOutputLine(outputRegion, "Area required (replacement)", "br-out-req");
  const oAvail = makeOutputLine(outputRegion, "Area available (run + branch)", "br-out-avail");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "br-out-verdict");
  const update = debounce(() => {
    const r = computeBranchReinforcement({
      run_od_in: Number(rod.input.value) || 0, run_wall_in: Number(rwall.input.value) || 0, run_treq_in: Number(rtreq.input.value) || 0,
      branch_od_in: Number(bod.input.value) || 0, branch_wall_in: Number(bwall.input.value) || 0, branch_treq_in: Number(btreq.input.value) || 0,
      beta_deg: Number(beta.input.value) || 0,
    });
    if (r.error) { oReq.textContent = r.error; oAvail.textContent = "-"; oVerdict.textContent = "-"; return; }
    oReq.textContent = fmt(r.a_required_in2, 3) + " in^2 (opening d1 " + fmt(r.d1_in, 3) + " in)";
    oAvail.textContent = fmt(r.a_available_in2, 3) + " in^2 (run " + fmt(r.a_run_in2, 3) + " + branch " + fmt(r.a_branch_in2, 3) + ")";
    oVerdict.textContent = (r.large_branch ? "Large branch (OD ratio " + fmt(r.branch_run_od_ratio, 2) + " > 0.5; verify a listed tee or a rigorous check applies). " : "") + (r.adequate ? "Adequate - excess wall covers it, no pad" : "Pad required - add " + fmt(r.pad_area_in2, 3) + " in^2 of reinforcement");
  }, DEBOUNCE_MS);
  for (const f of [rod.input, rwall.input, rtreq.input, bod.input, bwall.input, btreq.input, beta.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["branch-reinforcement"] = _renderBranchReinforcement;

// ---------------------------------------------------------------------
// v205 Expansion joint / loop guide spacing - EJMA 4D/14D (expansion-guide-spacing)
// ---------------------------------------------------------------------
// An expansion joint or loop needs guides to keep the pipe a straight
// column feeding into it. The Expansion Joint Manufacturers Association
// (EJMA) rule places the first two: the first guide within four pipe
// diameters of the joint, the second within fourteen diameters of the
// first. Beyond guide 2, intermediate spacing comes from the EJMA table or
// the pipe-column stability calc; the anchor and joint selection govern.
// dims: in { pipe_od_in: L, d1_mult: dimensionless, d2_mult: dimensionless } out: { first_guide_in: L, second_guide_in: L, guide2_from_joint_in: L }
export function computeExpansionGuideSpacing({ pipe_od_in = 0, d1_mult = 4, d2_mult = 14 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const od = Number(pipe_od_in);
  const m1 = Number(d1_mult), m2 = Number(d2_mult);
  if (!(od > 0)) return { error: "Pipe OD must be positive (in)." };
  if (!(m1 > 0)) return { error: "First-guide multiplier must be positive." };
  if (!(m2 > 0)) return { error: "Second-guide multiplier must be positive." };
  const first_guide_in = m1 * od;
  const second_guide_in = m2 * od;
  const guide2_from_joint_in = first_guide_in + second_guide_in;
  return {
    first_guide_in, second_guide_in, guide2_from_joint_in,
    first_guide_ft: first_guide_in / 12, second_guide_ft: second_guide_in / 12, guide2_from_joint_ft: guide2_from_joint_in / 12,
  };
}
export const expansionGuideSpacingExample = { inputs: { pipe_od_in: 4.5, d1_mult: 4, d2_mult: 14 } };

function _renderExpansionGuideSpacing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Expansion-joint guide placement - the first guide within d1_mult (4) pipe diameters of the joint, the second within d2_mult (14) diameters of the first, per the Expansion Joint Manufacturers Association (EJMA) standard and the manufacturer installation guides, by name. The 4D/14D rule places the first two guides; intermediate guide spacing beyond the second comes from the EJMA table or the pipe-column stability calc (user-supplied / manufacturer). This places the planning guides, it does not design the anchor loads; the anchor and joint selection govern.";
  const od = makeNumber("Pipe OD (in)", "eg-od", { step: "any", min: "0" });
  const m1 = makeNumber("First-guide multiplier (D)", "eg-m1", { step: "any", min: "0", value: "4" });
  const m2 = makeNumber("Second-guide multiplier (D)", "eg-m2", { step: "any", min: "0", value: "14" });
  m1.input.value = "4"; m2.input.value = "14";
  for (const f of [od, m1, m2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "4.5"; m1.input.value = "4"; m2.input.value = "14"; update(); });
  const oFirst = makeOutputLine(outputRegion, "First guide (from the joint)", "eg-out-first");
  const oSecond = makeOutputLine(outputRegion, "Second guide (past the first)", "eg-out-second");
  const update = debounce(() => {
    const r = computeExpansionGuideSpacing({ pipe_od_in: Number(od.input.value) || 0, d1_mult: Number(m1.input.value) || 0, d2_mult: Number(m2.input.value) || 0 });
    if (r.error) { oFirst.textContent = r.error; oSecond.textContent = "-"; return; }
    oFirst.textContent = fmt(r.first_guide_in, 1) + " in (" + fmt(r.first_guide_ft, 2) + " ft)";
    oSecond.textContent = fmt(r.second_guide_in, 1) + " in (" + fmt(r.second_guide_ft, 2) + " ft) - " + fmt(r.guide2_from_joint_in, 1) + " in from the joint";
  }, DEBOUNCE_MS);
  for (const f of [od.input, m1.input, m2.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["expansion-guide-spacing"] = _renderExpansionGuideSpacing;

// ===================== spec-v588 B: steam orifice / PRV capacity (Napier) =====================
// choked = P2 < 0.58*P1. W = 51.43*Cd*A*P1 (saturated, choked).
// dims: in { orifice_area_in2: L^2, upstream_p_psia: M L^-1 T^-2, downstream_p_psia: M L^-1 T^-2, discharge_coeff: dimensionless } out: { steam_capacity_lb_hr: M T^-1 }
export function computeSteamPrvNapier({ orifice_area_in2 = 0, upstream_p_psia = 0, downstream_p_psia = 0, discharge_coeff = 0.9 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const A = Number(orifice_area_in2) || 0;
  const P1 = Number(upstream_p_psia) || 0;
  const P2 = Number(downstream_p_psia) || 0;
  const Cd = Number(discharge_coeff) || 0;
  if (!(A > 0)) return { error: "Orifice area must be positive (in^2)." };
  if (!(P1 > 0)) return { error: "Upstream pressure must be positive (psia)." };
  if (P2 < 0) return { error: "Downstream pressure cannot be negative (psia)." };
  if (P2 > P1) return { error: "Downstream pressure cannot exceed the upstream pressure." };
  if (!(Cd > 0 && Cd <= 1)) return { error: "Discharge coefficient must be over 0 and at most 1." };
  const choke_threshold_psia = 0.58 * P1;
  const choked = P2 < choke_threshold_psia;
  const steam_capacity_lb_hr = 51.43 * Cd * A * P1;
  return {
    steam_capacity_lb_hr, choked, choke_threshold_psia,
    note: "Flow chokes when the downstream absolute pressure is below 58% of the upstream, and the capacity then depends only on the upstream pressure - dropping the downstream further does not increase it. Napier is for saturated steam (superheat needs a Ksh factor). A liquid Cv (which scales with the square root of pressure drop) is wrong for choked steam, which is linear in the upstream pressure. The discharge coefficient (about 0.6 for a sharp-edged orifice, near 1 for a nozzle) must be applied. ASME/API and the valve manufacturer govern - a sizing aid, not a relief-valve certification.",
  };
}
export const steamPrvNapierExample = { inputs: { orifice_area_in2: 0.5, upstream_p_psia: 100, downstream_p_psia: 30, discharge_coeff: 0.9 } };
function _renderSteamPrvNapier(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A sizing aid, not a relief-valve certification; ASME/API and the valve manufacturer govern. Citation: Napier's formula / ASME/API 520 / Grashof steam orifice / PRV capacity, by name. Choked when P2 < 0.58 x P1; capacity W = 51.43 x Cd x A x P1 (saturated, choked). When choked the capacity depends only on the upstream pressure. Napier is for saturated steam (superheat needs a Ksh factor); a liquid Cv (square-root in pressure drop) is wrong for choked steam, which is linear in P1. Apply the discharge coefficient (~0.6 sharp orifice, ~1 nozzle).";
  const A = makeNumber("Orifice / seat area (in^2)", "spn-a", { step: "any", min: "0", value: "0.5" }); A.input.value = "0.5";
  const P1 = makeNumber("Upstream absolute pressure (psia)", "spn-p1", { step: "any", min: "0", value: "100" }); P1.input.value = "100";
  const P2 = makeNumber("Downstream absolute pressure (psia)", "spn-p2", { step: "any", min: "0", value: "30" }); P2.input.value = "30";
  const Cd = makeNumber("Discharge coefficient Cd (~0.6 orifice, ~1 nozzle)", "spn-cd", { step: "any", min: "0", max: "1", value: "0.9" }); Cd.input.value = "0.9";
  for (const f of [A, P1, P2, Cd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { A.input.value = "0.5"; P1.input.value = "100"; P2.input.value = "30"; Cd.input.value = "0.9"; update(); });
  const oChoke = makeOutputLine(outputRegion, "Flow regime", "spn-out-choke");
  const oCap = makeOutputLine(outputRegion, "Steam capacity", "spn-out-cap");
  const oNote = makeOutputLine(outputRegion, "Note", "spn-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSteamPrvNapier({ orifice_area_in2: readNum(A.input), upstream_p_psia: readNum(P1.input), downstream_p_psia: readNum(P2.input), discharge_coeff: Cd.input.value === "" ? 0.9 : readNum(Cd.input) });
    if (r.error) { oChoke.textContent = r.error; oCap.textContent = "-"; oNote.textContent = ""; return; }
    oChoke.textContent = r.choked ? "Choked (P2 < " + fmt(r.choke_threshold_psia, 1) + " psia) - capacity set by upstream only" : "Subcritical (P2 >= " + fmt(r.choke_threshold_psia, 1) + " psia) - apply a subcritical correction";
    oCap.textContent = fmt(r.steam_capacity_lb_hr, 0) + " lb/hr (saturated)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [A, P1, P2, Cd]) f.input.addEventListener("input", update);
}
PIPEFIT_RENDERERS["steam-prv-napier"] = _renderSteamPrvNapier;

// steam-prv-area-for-capacity: inverse of steam-prv-napier. The forward tile gives the relief capacity from the orifice
// area; the inverse recovers the orifice / seat area a required relief capacity needs, so a sizer picks an API orifice
// letter. From the choked Napier capacity W = 51.43 Cd A P1, A = W / (51.43 Cd P1). Assumes choked flow (the standard
// relief condition, P2 < 0.58 P1); the choke threshold is reported for the check.
// dims: in { required_capacity_lb_hr: M T^-1, upstream_p_psia: M L^-1 T^-2, discharge_coeff: dimensionless } out: { required_area_in2: L^2, choke_threshold_psia: M L^-1 T^-2 }
export function computeSteamPrvAreaForCapacity({ required_capacity_lb_hr = 0, upstream_p_psia = 0, discharge_coeff = 0.9 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(required_capacity_lb_hr) || 0;
  const P1 = Number(upstream_p_psia) || 0;
  const Cd = Number(discharge_coeff) || 0;
  if (!(W > 0)) return { error: "Required relief capacity must be positive (lb/hr)." };
  if (!(P1 > 0)) return { error: "Upstream pressure must be positive (psia)." };
  if (!(Cd > 0 && Cd <= 1)) return { error: "Discharge coefficient must be over 0 and at most 1." };
  const required_area_in2 = W / (51.43 * Cd * P1);
  const choke_threshold_psia = 0.58 * P1;
  if (![required_area_in2, choke_threshold_psia].every(Number.isFinite)) return { error: "Orifice-area math is not a finite value." };
  return {
    required_area_in2, choke_threshold_psia,
    note: "Orifice / seat area for a required steam relief capacity: from the choked Napier capacity W = 51.43 Cd A P1, A = W / (51.43 Cd P1). Round UP to a standard API 526 orifice letter (D, E, F, ... which are areas of 0.110, 0.196, 0.307 in^2 and up). This assumes CHOKED flow - the standard relief condition where the downstream absolute pressure is below 58% of the upstream (threshold shown); the capacity then depends only on the upstream pressure, and a liquid Cv (which scales with the square root of the pressure drop) is wrong. Napier is for saturated steam; superheat needs a Ksh correction. The discharge coefficient (~0.6 sharp orifice, ~1 nozzle) must match the device. A sizing aid, not a relief-valve certification; ASME/API and the valve manufacturer govern.",
  };
}
export const steamPrvAreaForCapacityExample = { inputs: { required_capacity_lb_hr: 5000, upstream_p_psia: 100, discharge_coeff: 0.9 } };
function _renderSteamPrvAreaForCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A sizing aid, not a relief-valve certification; ASME/API and the valve manufacturer govern. Citation: Napier's formula / ASME/API 520 choked steam capacity W = 51.43 x Cd x A x P1 solved for the area: A = W / (51.43 x Cd x P1). Assumes choked flow (P2 < 0.58 x P1); round up to a standard API 526 orifice letter. Saturated steam (superheat needs Ksh); apply the discharge coefficient (~0.6 orifice, ~1 nozzle).";
  const W = makeNumber("Required relief capacity (lb/hr)", "spa-w", { step: "any", min: "0", value: "5000" }); W.input.value = "5000";
  const P1 = makeNumber("Upstream absolute pressure (psia)", "spa-p1", { step: "any", min: "0", value: "100" }); P1.input.value = "100";
  const Cd = makeNumber("Discharge coefficient Cd (~0.6 orifice, ~1 nozzle)", "spa-cd", { step: "any", min: "0", max: "1", value: "0.9" }); Cd.input.value = "0.9";
  for (const f of [W, P1, Cd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { W.input.value = "5000"; P1.input.value = "100"; Cd.input.value = "0.9"; update(); });
  const oA = makeOutputLine(outputRegion, "Required orifice / seat area", "spa-out-a");
  const oT = makeOutputLine(outputRegion, "Choke threshold (0.58 x P1)", "spa-out-t");
  const oNote = makeOutputLine(outputRegion, "Note", "spa-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSteamPrvAreaForCapacity({ required_capacity_lb_hr: readNum(W.input), upstream_p_psia: readNum(P1.input), discharge_coeff: Cd.input.value === "" ? 0.9 : readNum(Cd.input) });
    if (r.error) { oA.textContent = r.error; oT.textContent = "-"; oNote.textContent = ""; return; }
    oA.textContent = fmt(r.required_area_in2, 3) + " in^2";
    oT.textContent = fmt(r.choke_threshold_psia, 1) + " psia (choked below this downstream)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [W.input, P1.input, Cd.input]) f.addEventListener("input", update);
}
PIPEFIT_RENDERERS["steam-prv-area-for-capacity"] = _renderSteamPrvAreaForCapacity;

// ===================== spec-v954: steam boiler surface blowdown (cycles of concentration) =====================
// dims: in { args: dimensionless } out: { cycles_of_concentration: dimensionless, blowdown_rate_lb_hr: dimensionless, blowdown_pct_of_feedwater: dimensionless }
export function computeSteamBoilerBlowdown({ steam_rate_lb_hr = 10000, feedwater_tds_ppm = 100, max_boiler_tds_ppm = 3500 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(steam_rate_lb_hr > 0)) return { error: "Steam rate must be positive (lb/hr)." };
  if (!(feedwater_tds_ppm > 0)) return { error: "Feedwater TDS must be positive (ppm)." };
  if (!(max_boiler_tds_ppm > feedwater_tds_ppm)) return { error: "Max boiler-water TDS must exceed the feedwater TDS (blowdown concentrates the dissolved solids)." };
  // TDS mass balance: steam leaves TDS-free, so feedwater TDS in = blowdown TDS out.
  // Blowdown as a fraction of STEAM = FW_TDS / (BW_TDS - FW_TDS); of FEEDWATER = FW_TDS / BW_TDS = 1/CoC.
  const cycles_of_concentration = max_boiler_tds_ppm / feedwater_tds_ppm;
  const blowdown_rate_lb_hr = steam_rate_lb_hr * feedwater_tds_ppm / (max_boiler_tds_ppm - feedwater_tds_ppm);
  const blowdown_pct_of_feedwater = 100 * feedwater_tds_ppm / max_boiler_tds_ppm;
  if (![cycles_of_concentration, blowdown_rate_lb_hr, blowdown_pct_of_feedwater].every(Number.isFinite)) return { error: "Blowdown math is not a finite value." };
  return {
    cycles_of_concentration,
    blowdown_rate_lb_hr,
    blowdown_pct_of_feedwater,
    note: "The continuous surface blowdown a steam boiler needs to hold its dissolved solids below the limit, by a TDS mass balance: the steam leaves essentially TDS-free, so all the dissolved solids the feedwater carries in must leave in the blowdown at the maximum allowed boiler-water concentration. The cycles of concentration is CoC = boiler-water TDS limit / feedwater TDS -- how many times the solids are concentrated before blowdown. The blowdown rate is steam rate x feedwater TDS / (boiler-water limit - feedwater TDS), and expressed as a share of feedwater it is simply 1/CoC. A 10,000 lb/hr boiler on 100 ppm feedwater held to a 3,500 ppm limit runs at 35 cycles and blows down about 294 lb/hr (2.9% of feedwater); cleaner makeup (fewer ppm) raises the cycles and cuts the blowdown and its heat loss. Blowdown carries away hot, treated water, so every pound blown down is a fuel and chemical cost -- a flash-recovery vessel and a blowdown heat exchanger claw some of it back. This is a steady-state SURFACE (continuous TDS) blowdown estimate; intermittent bottom (mud) blowdown, the boiler-water treatment program, the ASME / manufacturer TDS and alkalinity limits, and a licensed boiler operator govern the actual schedule.",
  };
}

export const steamBoilerBlowdownExample = { inputs: { steam_rate_lb_hr: 10000, feedwater_tds_ppm: 100, max_boiler_tds_ppm: 3500 } };

function _v954renderSteamBoilerBlowdown(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: steam boiler surface blowdown by TDS mass balance (cycles of concentration), by name. CoC = boiler-water TDS limit / feedwater TDS; blowdown rate = steam rate x FW_TDS / (BW_limit - FW_TDS); blowdown % of feedwater = 1/CoC. Steam assumed TDS-free. The ASME / manufacturer TDS limits and the water-treatment program and a licensed operator govern.";
  const sr = makeNumber("Steam rate (lb/hr)", "sbb-sr", { step: "any", min: "0", value: "10000" });
  sr.input.value = "10000";
  const fw = makeNumber("Feedwater TDS (ppm)", "sbb-fw", { step: "any", min: "0", value: "100" });
  fw.input.value = "100";
  const bw = makeNumber("Max boiler-water TDS (ppm)", "sbb-bw", { step: "any", min: "0", value: "3500" });
  bw.input.value = "3500";
  for (const f of [sr, fw, bw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sr.input.value = "10000"; fw.input.value = "100"; bw.input.value = "3500"; update(); });
  const oC = makeOutputLine(outputRegion, "Cycles of concentration", "sbb-out-c");
  const oR = makeOutputLine(outputRegion, "Blowdown rate", "sbb-out-r");
  const oP = makeOutputLine(outputRegion, "Blowdown (% of feedwater)", "sbb-out-p");
  const update = debounce(() => {
    const r = computeSteamBoilerBlowdown({
      steam_rate_lb_hr: sr.input.value === "" ? 10000 : Number(sr.input.value), feedwater_tds_ppm: fw.input.value === "" ? 100 : Number(fw.input.value),
      max_boiler_tds_ppm: bw.input.value === "" ? 3500 : Number(bw.input.value),
    });
    if (r.error) { oC.textContent = r.error; oR.textContent = "-"; oP.textContent = "-"; return; }
    oC.textContent = fmt(r.cycles_of_concentration, 1) + " cycles";
    oR.textContent = fmt(r.blowdown_rate_lb_hr, 0) + " lb/hr";
    oP.textContent = fmt(r.blowdown_pct_of_feedwater, 2) + "%";
  }, DEBOUNCE_MS);
  for (const f of [sr, fw, bw]) f.input.addEventListener("input", update);
}
PIPEFIT_RENDERERS["steam-boiler-blowdown"] = _v954renderSteamBoilerBlowdown;

// ===================== spec-v990: radiator EDR to heat output =====================
// dims: in { args: dimensionless } out: { heat_output_btu_hr: dimensionless, gross_boiler_btu_hr: dimensionless }
export function computeRadiatorEdrOutput({ edr_sqft = 320, system_k = 240, pickup_factor = 0.33 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(edr_sqft > 0)) return { error: "EDR must be positive (sq ft)." };
  if (!(system_k > 0)) return { error: "EDR heat constant must be positive (240 steam, 150 hot water)." };
  if (!(pickup_factor >= 0)) return { error: "Pickup factor cannot be negative." };
  // Q = EDR x k; k = 240 (steam, 215 F in a 70 F room) or 150 (hot water, 170 F avg). Boiler gross = net x (1 + pickup).
  const heat_output_btu_hr = edr_sqft * system_k;
  const gross_boiler_btu_hr = heat_output_btu_hr * (1 + pickup_factor);
  if (![heat_output_btu_hr, gross_boiler_btu_hr].every(Number.isFinite)) return { error: "EDR math is not a finite value." };
  return {
    heat_output_btu_hr,
    gross_boiler_btu_hr,
    note: "The heat a cast-iron radiator or convector delivers from its EDR rating, and the gross boiler size that feeds it. EDR -- Equivalent Direct Radiation, in square feet -- is the standard way old steam and hot-water heating is rated, and the conversion to BTU per hour is a fixed constant per system: 1 sq ft EDR = 240 BTU/hr on STEAM (the Hydronics Institute / I=B=R basis, one square foot emitting 240 BTU/hr with 215 F steam in a 70 F room) and 150 BTU/hr on HOT WATER (170 F average water in a 70 F room). Six radiators totaling 320 sq ft EDR on steam put out 320 x 240 = 76,800 BTU/hr; the same 320 sq ft on a hot-water system would put out 320 x 150 = 48,000. Sizing the boiler adds a PICKUP allowance -- extra capacity to warm the cold piping and iron on a morning start -- so the gross boiler output is the connected load times (1 + pickup): the I=B=R pickup is about 0.33 (33%) for steam and about 0.15 for hot water, so the 76,800 steam load wants a boiler with a gross output near 102,000 BTU/hr, selected by its NET steam rating (>= 320 sq ft / 76,800 BTU/hr). A sizing aid; the actual radiator EDR from the maker or a measurement, the real piping and pickup, and the boiler's I=B=R net rating govern.",
  };
}

export const radiatorEdrOutputExample = { inputs: { edr_sqft: 320, system_k: 240, pickup_factor: 0.33 } };

function _v990renderRadiatorEdrOutput(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: radiator EDR to heat output, Hydronics Institute / I=B=R basis, by name. Q = EDR x k; k = 240 BTU/hr per sq ft (steam, 215 F / 70 F room), 150 (hot water, 170 F avg). Gross boiler = net x (1 + pickup); I=B=R pickup ~0.33 steam, ~0.15 hot water; select by NET rating. The radiator EDR, the real piping/pickup, and the boiler's I=B=R rating govern.";
  const ed = makeNumber("Connected EDR (sq ft)", "red-ed", { step: "any", min: "0", value: "320" });
  ed.input.value = "320";
  const sk = makeNumber("EDR constant (240 steam, 150 hot water)", "red-sk", { step: "any", min: "0", value: "240" });
  sk.input.value = "240";
  const pf = makeNumber("Boiler pickup factor (0.33 steam, 0.15 HW)", "red-pf", { step: "any", min: "0", value: "0.33" });
  pf.input.value = "0.33";
  for (const f of [ed, sk, pf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ed.input.value = "320"; sk.input.value = "240"; pf.input.value = "0.33"; update(); });
  const oH = makeOutputLine(outputRegion, "Radiator heat output", "red-out-h");
  const oG = makeOutputLine(outputRegion, "Gross boiler size", "red-out-g");
  const update = debounce(() => {
    const r = computeRadiatorEdrOutput({
      edr_sqft: ed.input.value === "" ? 320 : Number(ed.input.value), system_k: sk.input.value === "" ? 240 : Number(sk.input.value),
      pickup_factor: pf.input.value === "" ? 0.33 : Number(pf.input.value),
    });
    if (r.error) { oH.textContent = r.error; oG.textContent = "-"; return; }
    oH.textContent = fmt(r.heat_output_btu_hr, 0) + " BTU/hr";
    oG.textContent = fmt(r.gross_boiler_btu_hr, 0) + " BTU/hr (with pickup)";
  }, DEBOUNCE_MS);
  for (const f of [ed, sk, pf]) f.input.addEventListener("input", update);
}
PIPEFIT_RENDERERS["radiator-edr-output"] = _v990renderRadiatorEdrOutput;
