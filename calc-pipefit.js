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
const _SCH40_ID_IN = [
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
