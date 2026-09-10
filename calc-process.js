// Group G: plastics processing and foundry practice.
//
// spec-v1705..v1716 (scope-trade-expansion-2, the process band): the two
// forming trades the catalog had never touched at all -- injection moulding,
// extrusion and thermoforming on the plastics side, and sand casting on the
// foundry side -- plus the two field calculations a plumber inherits from
// them, HDPE butt fusion pressure and thermoplastic pipe derating.
//
// The thread through the plastics half is that the cost of a moulded part is
// set before the tool is cut. Cooling time goes with the SQUARE of the wall,
// clamp tonnage with the projected area including the runner, and thinning
// with the draw ratio -- so the three decisions that dominate a part's price
// are all geometry decisions made by a designer, not process settings
// available to an operator afterwards.
//
// The foundry half is the same argument about yield: the risers that make a
// casting sound are the same risers that make it expensive to melt, and the
// resolution is a feeding calculation rather than a yield target.
//
// spec-v1712 is Group B rather than G -- read the group letter off the spec
// header, not off the subject.
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

// Compact renderer factory, copied verbatim from calc-buildingperf.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _prRender = function (inputRegion, outputRegion, citationEl) {
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

  _prRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _prRender;
}


export const PROCESS_RENDERERS = {};

// =====================================================================
// spec-v1705: injection mould clamp tonnage from projected area.
// =====================================================================
// dims: in { cavities: dimensionless, part_projected_area_in2: L^2, runner_projected_area_in2: L^2, cavity_pressure_tsi: M L^-1 T^-2, safety_factor_pct: dimensionless, machine_rating_tons: M L T^-2 } out: { total_area_in2: L^2, clamp_required_tons: M L T^-2, clamp_with_safety_tons: M L T^-2, runner_penalty_tons: M L T^-2, margin_tons: M L T^-2, max_cavity_pressure_tsi: M L^-1 T^-2 }
export function computeInjectionClampTonnage({
  cavities = 0, part_projected_area_in2 = 0, runner_projected_area_in2 = 0,
  cavity_pressure_tsi = 0, safety_factor_pct = 15, machine_rating_tons = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cavities > 0)) return { error: "Number of cavities must be positive." };
  if (!(part_projected_area_in2 > 0)) return { error: "Part projected area must be positive (in^2)." };
  if (runner_projected_area_in2 < 0) return { error: "Runner projected area cannot be negative." };
  if (!(cavity_pressure_tsi > 0)) return { error: "Cavity pressure must be positive (tons per in^2)." };
  if (safety_factor_pct < 0 || safety_factor_pct > 100) return { error: "Safety factor must be between 0 and 100 percent." };
  if (machine_rating_tons < 0) return { error: "Machine clamp rating cannot be negative." };
  const part_area_total_in2 = cavities * part_projected_area_in2;
  const total_area_in2 = part_area_total_in2 + runner_projected_area_in2;
  const sf = 1 + safety_factor_pct / 100;
  const clamp_required_tons = total_area_in2 * cavity_pressure_tsi;
  const clamp_with_safety_tons = clamp_required_tons * sf;
  // The runner is the term people leave out, so it is reported on its own.
  const part_only_with_safety_tons = part_area_total_in2 * cavity_pressure_tsi * sf;
  const runner_penalty_tons = clamp_with_safety_tons - part_only_with_safety_tons;
  const area_verdict = "the shot presents " + fmt(total_area_in2, 1) + " in2 of projected area -- " + fmt(part_area_total_in2, 1) + " in2 of parts across " + fmt(cavities, 0) + " cavities plus " + fmt(runner_projected_area_in2, 1) + " in2 of runner. Projected area is the area seen ALONG the direction the mould opens, not the surface area of the part and not its footprint on the bench";
  const force_verdict = "at " + fmt(cavity_pressure_tsi, 2) + " tons per in2 that needs " + fmt(clamp_required_tons, 0) + " tons, or " + fmt(clamp_with_safety_tons, 0) + " tons with the " + fmt(safety_factor_pct, 0) + "% safety factor";
  const runner_verdict = runner_projected_area_in2 > 0
    ? "the runner is not a rounding error: leaving its " + fmt(runner_projected_area_in2, 1) + " in2 out of the calculation understates the requirement by " + fmt(runner_penalty_tons, 0) + " tons, which on a marginal machine selection is the difference between running and flashing"
    : "(no runner area entered -- a cold runner ALWAYS has projected area, and a part-only figure specifies a machine that flashes)";
  const has_machine = machine_rating_tons > 0;
  const margin_tons = has_machine ? machine_rating_tons - clamp_with_safety_tons : 0;
  const fits = has_machine && margin_tons >= 0;
  const machine_verdict = !has_machine
    ? "(no machine rating entered)"
    : fits
      ? "the " + fmt(machine_rating_tons, 0) + " ton machine covers it with " + fmt(margin_tons, 0) + " tons to spare"
      : "the " + fmt(machine_rating_tons, 0) + " ton machine is " + fmt(-margin_tons, 0) + " tons SHORT: the parting line opens and the part flashes";
  // The inversion: what cavity pressure the machine actually supports.
  const max_cavity_pressure_tsi = has_machine ? machine_rating_tons / (total_area_in2 * sf) : 0;
  const pressure_verdict = !has_machine
    ? "(no machine rating entered)"
    : "that machine supports up to " + fmt(max_cavity_pressure_tsi, 2) + " tons per in2 on this area -- and cavity pressure is the variable that moves most. A thin wall in a viscous material over a long flow length can want twice what an easy part wants, from the part's GEOMETRY rather than its size, which is why a serious tool is sized on a mould flow analysis rather than a rule of thumb";
  if (![total_area_in2, clamp_required_tons, clamp_with_safety_tons, runner_penalty_tons, margin_tons, max_cavity_pressure_tsi].every(Number.isFinite)) return { error: "Clamp tonnage math is not a finite value." };
  return {
    part_area_total_in2, total_area_in2, clamp_required_tons, clamp_with_safety_tons,
    part_only_with_safety_tons, runner_penalty_tons, area_verdict, force_verdict, runner_verdict,
    has_machine, margin_tons, fits, machine_verdict, max_cavity_pressure_tsi, pressure_verdict,
    note: "The clamp force a mould needs: the projected area of everything in the shot, times the pressure inside the cavity. Both terms are got wrong in a way that shows up as flash. Projected area is the area seen ALONG the direction the mould opens -- not the surface area of the part, and not its footprint lying on a bench -- and it INCLUDES the runner, because a cold runner is pressurised plastic pushing the mould open exactly as the parts do. Leaving the runner out of a multi-cavity calculation is the common form of the error and it understates the requirement by enough to specify a machine that flashes. Cavity pressure is the term that moves most, and it is the one this cannot supply. It depends on the material's viscosity, the wall thickness, and the flow length the melt has to travel, and it ranges over roughly a factor of two between an easy part and a hard one of the SAME size -- so two parts with identical projected areas can want quite different machines. That is why the pressure is entered from a mould flow analysis or from experience with the material rather than taken from a table, and why a rule-of-thumb figure is a screen rather than a tool specification. The safety factor exists because the calculation is an estimate on both terms. The failure it guards against is not subtle: insufficient clamp lets the parting line open under injection pressure, and the part flashes at every shot until the machine is changed or the pressure is dropped far enough to short the part instead. Over-clamping is not free either -- it damages the mould's parting line over time and ties up machine capacity that a larger job needs -- so the answer is the right machine rather than the biggest available one. This sizes clamp force only. It does not compute cavity pressure, perform a mould flow analysis, size the injection unit or check the shot capacity, evaluate the platen size, tie-bar spacing or mould stack height that also decide whether a mould fits a machine, or address the venting and parting line condition that let a correctly clamped mould flash anyway. The moulder's process engineer, the mould designer, and the machine manufacturer's specifications govern.",
  };
}
export const injectionClampTonnageExample = { inputs: { cavities: 4, part_projected_area_in2: 12, runner_projected_area_in2: 6, cavity_pressure_tsi: 2.5, safety_factor_pct: 15, machine_rating_tons: 150 } };
PROCESS_RENDERERS["injection-clamp-tonnage"] = _simpleRenderer({
  citation: "Citation: clamp force = total projected area x cavity pressure, with the projected area taken ALONG the mould opening direction and INCLUDING the runner, and a safety factor commonly 10 to 20%. Cavity pressure is ENTERED (typically 2 to 5 tons per in2, rising with thin walls, long flow lengths and viscous materials) because it depends on the part's geometry and the material rather than on its size -- a mould flow analysis, not a table, is what a serious tool is sized on. It does not compute cavity pressure, size the injection unit, or check platen size, tie-bar spacing or mould stack height. The moulder's process engineer and the machine manufacturer's specifications govern.",
  example: injectionClampTonnageExample.inputs,
  fields: [
    { key: "cavities", label: "Number of cavities", kind: "number", attrs: { step: "1", min: "1" } },
    { key: "part_projected_area_in2", label: "Projected area per part (in²)", kind: "number", attrs: { step: "any" } },
    { key: "runner_projected_area_in2", label: "Runner projected area (in²)", kind: "number", attrs: { step: "any" } },
    { key: "cavity_pressure_tsi", label: "Cavity pressure (tons per in²)", kind: "number", attrs: { step: "any" } },
    { key: "safety_factor_pct", label: "Safety factor (%)", kind: "number", default: 15, attrs: { step: "any" } },
    { key: "machine_rating_tons", label: "Machine clamp rating (tons, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "a", id: "ict-out-a", label: "Projected area", value: (r) => r.area_verdict },
    { key: "f", id: "ict-out-f", label: "Clamp required", value: (r) => r.force_verdict },
    { key: "r", id: "ict-out-r", label: "What the runner costs", value: (r) => r.runner_verdict },
    { key: "m", id: "ict-out-m", label: "Against the machine", value: (r) => r.machine_verdict },
    { key: "p", id: "ict-out-p", label: "The pressure it supports", value: (r) => r.pressure_verdict },
    { key: "n", id: "ict-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeInjectionClampTonnage,
});

// =====================================================================
// spec-v1706: shot size as a fraction of barrel capacity, and residence time.
// =====================================================================
// dims: in { barrel_capacity_oz: M, shot_weight_oz: M, cycle_time_s: T, min_pct: dimensionless, max_pct: dimensionless, max_residence_min: T, alt_cycle_time_s: T } out: { shot_pct: dimensionless, shots_in_barrel: dimensionless, residence_min: T, min_barrel_oz: M, max_barrel_oz: M, alt_residence_min: T }
export function computeShotSizeResidenceTime({
  barrel_capacity_oz = 0, shot_weight_oz = 0, cycle_time_s = 0,
  min_pct = 20, max_pct = 80, max_residence_min = 0, alt_cycle_time_s = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(barrel_capacity_oz > 0)) return { error: "Barrel capacity must be positive (oz)." };
  if (!(shot_weight_oz > 0)) return { error: "Shot weight must be positive (oz)." };
  if (!(cycle_time_s > 0)) return { error: "Cycle time must be positive (s)." };
  if (!(min_pct > 0) || !(max_pct > min_pct) || max_pct >= 100) return { error: "The usable window must run from a positive percentage up to a higher one below 100." };
  if (max_residence_min < 0 || alt_cycle_time_s < 0) return { error: "Residence limit and alternative cycle time cannot be negative." };
  const shot_pct = shot_weight_oz / barrel_capacity_oz * 100;
  const shots_in_barrel = barrel_capacity_oz / shot_weight_oz;
  const residence_min = shots_in_barrel * cycle_time_s / 60;
  const too_small = shot_pct < min_pct;
  const too_large = shot_pct > max_pct;
  const in_window = !too_small && !too_large;
  const window_verdict = in_window
    ? "the shot is " + fmt(shot_pct, 1) + "% of barrel capacity, inside the " + fmt(min_pct, 0) + " to " + fmt(max_pct, 0) + "% window"
    : too_small
      ? "the shot is only " + fmt(shot_pct, 1) + "% of barrel capacity, BELOW the " + fmt(min_pct, 0) + "% floor -- the melt sits in a hot barrel through " + fmt(shots_in_barrel, 1) + " shots before it is used"
      : "the shot is " + fmt(shot_pct, 1) + "% of barrel capacity, ABOVE the " + fmt(max_pct, 0) + "% ceiling -- the screw has too little time and stroke to melt and homogenise it, and shot-to-shot consistency suffers";
  const residence_verdict = "residence time is " + fmt(residence_min, 1) + " minutes: " + fmt(shots_in_barrel, 1) + " shots' worth of melt sitting in the barrel at " + fmt(cycle_time_s, 0) + " seconds a cycle";
  const has_limit = max_residence_min > 0;
  const over_limit = has_limit && residence_min > max_residence_min;
  const limit_verdict = !has_limit
    ? "(no material residence limit entered -- and the limit is the whole question, because it is a MATERIAL property rather than a machine one)"
    : over_limit
      ? "that EXCEEDS the " + fmt(max_residence_min, 1) + " minute limit for this material by " + fmt(residence_min - max_residence_min, 1) + " minutes. On a heat-sensitive resin the parts will often pass dimensional inspection and fail on properties, which is the worst kind of defect because it SHIPS"
      : "that is within the " + fmt(max_residence_min, 1) + " minute limit for this material, with " + fmt(max_residence_min - residence_min, 1) + " minutes to spare";
  // The inversion the moulder actually wants: which machine puts this shot in the window.
  const min_barrel_oz = shot_weight_oz / (max_pct / 100);
  const max_barrel_oz = shot_weight_oz / (min_pct / 100);
  const machine_verdict = "for this shot the usable barrel range is " + fmt(min_barrel_oz, 1) + " to " + fmt(max_barrel_oz, 1) + " oz -- which is what makes machine selection more than a tonnage question, and why running a small part on the big machine that happens to be free is a material decision rather than a scheduling one";
  const has_alt = alt_cycle_time_s > 0;
  const alt_residence_min = has_alt ? shots_in_barrel * alt_cycle_time_s / 60 : 0;
  const alt_verdict = !has_alt
    ? "(no alternative cycle time entered)"
    : "at " + fmt(alt_cycle_time_s, 0) + " seconds a cycle the residence time is " + fmt(alt_residence_min, 1) + " minutes -- residence scales DIRECTLY with cycle time, so a slow-running job on an oversized barrel compounds both problems at once";
  if (![shot_pct, shots_in_barrel, residence_min, min_barrel_oz, max_barrel_oz, alt_residence_min].every(Number.isFinite)) return { error: "Shot size math is not a finite value." };
  return {
    shot_pct, shots_in_barrel, residence_min, too_small, too_large, in_window,
    window_verdict, residence_verdict, has_limit, over_limit, limit_verdict,
    min_barrel_oz, max_barrel_oz, machine_verdict, has_alt, alt_residence_min, alt_verdict,
    note: "How much of the barrel a shot uses, and how long the melt sits there before it is injected. Residence time is the barrel capacity divided by the shot, multiplied by the cycle time -- so a small shot in a large barrel is not merely inefficient, it is a material problem. The usable window runs roughly 20 to 80 percent of capacity and it has a reason at BOTH ends, which is why it is a window rather than a minimum. Below the floor the melt makes too many cycles in a hot barrel before it is used; above the ceiling the screw has too little stroke and too little time to melt and homogenise the charge, and shot-to-shot consistency suffers. The consequence at the low end is what makes this worth running before a job is scheduled rather than after it has run. On a polyolefin a long residence is survivable. On PVC it is not -- the material degrades and evolves hydrogen chloride, and the damage is to the screw and barrel as much as to the parts. On acetal it is a decomposition risk, and on polycarbonate and many flame-retardant grades the properties fall away well before anything is visible. The failure mode that matters is that degraded parts often pass dimensional inspection and fail on properties, so the defect is not caught at the press and SHIPS. The residence limit is therefore a material property and is entered from the resin supplier's processing data rather than assumed. The practical use of this is machine selection: running a small part on whatever large machine is free is a decision about the material, not about the schedule, and the usable barrel range reported here is the answer to it. Where a large machine is the only one available, shortening the cycle is the lever that remains, because residence scales directly with cycle time. This is a capacity and time calculation on entered weights. It does not convert between the machine's rating basis and the material actually run (machines are commonly rated in ounces of general-purpose polystyrene, and a different density changes the figure), size the injection unit for pressure or plasticising rate, model degradation kinetics, account for the residence distribution within a screw (some material sits far longer than the average), or address purging, colour change, or barrel temperature profile. The resin supplier's processing data and the machine manufacturer's ratings govern.",
  };
}
export const shotSizeResidenceTimeExample = { inputs: { barrel_capacity_oz: 12, shot_weight_oz: 4.2, cycle_time_s: 32, min_pct: 20, max_pct: 80, max_residence_min: 4, alt_cycle_time_s: 45 } };
PROCESS_RENDERERS["shot-size-residence-time"] = _simpleRenderer({
  citation: "Citation: residence time = (barrel capacity / shot size) x cycle time, against a usable shot window commonly 20 to 80% of barrel capacity -- a window at BOTH ends, because below the floor the melt makes too many cycles in a hot barrel and above the ceiling the screw cannot homogenise the charge. The material's maximum residence is ENTERED from the resin supplier's processing data, because it is a material property: a long residence is survivable on a polyolefin and a degradation risk on PVC, acetal or polycarbonate. It does not convert between the machine's rating basis and the material actually run, model degradation kinetics, or account for the residence DISTRIBUTION within a screw. The resin supplier's data and the machine ratings govern.",
  example: shotSizeResidenceTimeExample.inputs,
  fields: [
    { key: "barrel_capacity_oz", label: "Barrel rated capacity (oz)", kind: "number", attrs: { step: "any" } },
    { key: "shot_weight_oz", label: "Shot weight, parts plus runner (oz)", kind: "number", attrs: { step: "any" } },
    { key: "cycle_time_s", label: "Cycle time (s)", kind: "number", attrs: { step: "any" } },
    { key: "min_pct", label: "Usable window floor (% of capacity)", kind: "number", default: 20, attrs: { step: "any" } },
    { key: "max_pct", label: "Usable window ceiling (% of capacity)", kind: "number", default: 80, attrs: { step: "any" } },
    { key: "max_residence_min", label: "Material residence limit (min, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_cycle_time_s", label: "Alternative cycle time (s, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "w", id: "ssr-out-w", label: "Against the window", value: (r) => r.window_verdict },
    { key: "t", id: "ssr-out-t", label: "Residence time", value: (r) => r.residence_verdict },
    { key: "l", id: "ssr-out-l", label: "Against the material limit", value: (r) => r.limit_verdict },
    { key: "m", id: "ssr-out-m", label: "Which machine fits", value: (r) => r.machine_verdict },
    { key: "a", id: "ssr-out-a", label: "At another cycle time", value: (r) => r.alt_verdict },
    { key: "n", id: "ssr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeShotSizeResidenceTime,
});

// =====================================================================
// spec-v1707: injection cooling time from wall thickness (the square law).
// =====================================================================
//
// The spec states a thermal diffusivity of "roughly 0.0005 to 0.001 sq in per
// second" for most thermoplastics. That is 3 to 7 times too high: alpha =
// k/(rho x cp) gives 0.00013 for ABS, 0.00020 for polypropylene, 0.00021 for
// polycarbonate and 0.00023 for HDPE. The spec never multiplied its own
// constant through the formula it printed -- it stopped at the proportional
// term h^2/alpha = 16.7 -- and then wrote "if the cooling was 12 seconds",
// which implies alpha = 0.000145 and contradicts its own stated range. The
// example below uses 0.00015, and the range is stated honestly in the note.
// =====================================================================
// dims: in { wall_thickness_in: L, alpha_in2_s: L^2 T^-1, melt_temp_f: T, mould_temp_f: T, eject_temp_f: T, alt_wall_thickness_in: L, non_cooling_cycle_s: T, annual_parts: dimensionless } out: { cooling_time_s: T, alt_cooling_time_s: T, thickness_ratio: dimensionless, time_ratio: dimensionless, cycle_time_s: T, annual_machine_hours: T }
export function computeInjectionCoolingTime({
  wall_thickness_in = 0, alpha_in2_s = 0, melt_temp_f = 0, mould_temp_f = 0, eject_temp_f = 0,
  alt_wall_thickness_in = 0, non_cooling_cycle_s = 0, annual_parts = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_thickness_in > 0)) return { error: "Wall thickness must be positive (in)." };
  if (!(alpha_in2_s > 0)) return { error: "Thermal diffusivity must be positive (in^2/s)." };
  if (!(melt_temp_f > mould_temp_f)) return { error: "Melt temperature must exceed mould temperature." };
  if (!(eject_temp_f > mould_temp_f)) return { error: "Ejection temperature must exceed mould temperature -- the part cannot cool below the mould." };
  if (!(melt_temp_f > eject_temp_f)) return { error: "Melt temperature must exceed ejection temperature." };
  if (alt_wall_thickness_in < 0 || non_cooling_cycle_s < 0 || annual_parts < 0) return { error: "Alternative thickness, non-cooling time and annual volume cannot be negative." };
  // The plate solution: t = h^2/(pi^2 alpha) x ln( (4/pi) x (Tmelt-Tmould)/(Teject-Tmould) ).
  const _tempTerm = Math.log((4 / Math.PI) * (melt_temp_f - mould_temp_f) / (eject_temp_f - mould_temp_f));
  if (!(_tempTerm > 0)) return { error: "The temperature term is not positive -- check the melt, mould and ejection temperatures." };
  const _coolFor = (h) => (h * h) / (Math.PI * Math.PI * alpha_in2_s) * _tempTerm;
  const cooling_time_s = _coolFor(wall_thickness_in);
  const cooling_verdict = "cooling takes " + fmt(cooling_time_s, 1) + " seconds for a " + fmt(wall_thickness_in, 3) + " in wall at a diffusivity of " + fmt(alpha_in2_s, 5) + " in2/s";
  const has_alt = alt_wall_thickness_in > 0;
  const alt_cooling_time_s = has_alt ? _coolFor(alt_wall_thickness_in) : 0;
  const thickness_ratio = has_alt ? alt_wall_thickness_in / wall_thickness_in : 0;
  const time_ratio = has_alt ? thickness_ratio * thickness_ratio : 0;
  const square_verdict = !has_alt
    ? "(no alternative thickness entered -- the square law is the whole point of this calculation, so enter one)"
    : "a " + fmt(alt_wall_thickness_in, 3) + " in wall is " + fmt((thickness_ratio - 1) * 100, 0) + "% thicker and cools in " + fmt(alt_cooling_time_s, 1) + " seconds -- " + fmt((time_ratio - 1) * 100, 0) + "% longer, because cooling goes with the SQUARE of the wall. That is why a stiffness change a designer makes without thinking of it as a cost change is one";
  // Coring: a solid section split into two walls of the entered thickness.
  const cored_time_s = has_alt ? _coolFor(alt_wall_thickness_in / 2) : 0;
  const coring_verdict = !has_alt
    ? "(no alternative thickness entered)"
    : "cored into two " + fmt(alt_wall_thickness_in / 2, 3) + " in walls the same section cools in " + fmt(cored_time_s, 1) + " seconds, a " + fmt((1 - cored_time_s / alt_cooling_time_s) * 100, 0) + "% reduction in the cooling portion of the cycle -- from a geometry change that costs nothing per part. Coring is the counter-move to a thick section, and it is available before the tool is cut and not after";
  const has_cycle = non_cooling_cycle_s > 0;
  const cycle_time_s = has_cycle ? cooling_time_s + non_cooling_cycle_s : cooling_time_s;
  const cooling_share_pct = cycle_time_s > 0 ? cooling_time_s / cycle_time_s * 100 : 0;
  const cycle_verdict = !has_cycle
    ? "(no non-cooling cycle time entered)"
    : "with " + fmt(non_cooling_cycle_s, 1) + " seconds of injection, hold, mould movement and ejection the cycle is " + fmt(cycle_time_s, 1) + " seconds, of which cooling is " + fmt(cooling_share_pct, 0) + "%";
  const has_volume = annual_parts > 0 && has_alt;
  const annual_machine_hours = has_volume ? Math.abs(alt_cooling_time_s - cooling_time_s) * annual_parts / 3600 : 0;
  const cost_verdict = !has_volume
    ? "(no annual volume and alternative thickness entered)"
    : "across " + fmt(annual_parts, 0) + " parts a year that thickness change is " + fmt(annual_machine_hours, 0) + " machine-hours a year, paid every cycle forever. Mould temperature is the weaker lever and it enters through a LOGARITHM: running colder shortens the cycle and costs crystallinity, adds moulded-in stress and degrades finish. Thickness is the lever available before the tool exists; temperature is the one available after";
  if (![cooling_time_s, alt_cooling_time_s, thickness_ratio, time_ratio, cycle_time_s, annual_machine_hours].every(Number.isFinite)) return { error: "Cooling time math is not a finite value." };
  return {
    cooling_time_s, cooling_verdict, has_alt, alt_cooling_time_s, thickness_ratio, time_ratio,
    square_verdict, cored_time_s, coring_verdict, has_cycle, cycle_time_s, cooling_share_pct,
    cycle_verdict, has_volume, annual_machine_hours, cost_verdict,
    note: "How long a moulded part takes to cool, which on most parts is most of the cycle and most of the cost. The plate solution divides the wall thickness squared by the thermal diffusivity and multiplies by a logarithmic temperature term, and the SQUARE is the fact that governs everything downstream: doubling a wall quadruples the cooling, and a 25 percent increase costs 56 percent more time. This is why plastic parts look the way they do -- uniform, thin walls with ribs and coring rather than solid sections -- and the reason is economic rather than aesthetic. The consequence a designer rarely sees is that thickness is decided long before anyone counts cycles. A section thickened for stiffness during design is a permanent cost on every part the tool ever makes, and on a production part it is a large number of machine-hours a year that no process adjustment recovers. Coring is the counter-move: splitting a thick section into two thinner walls returns the cooling to the thin-wall figure, because it is the distance heat must travel that matters and not the amount of material. That change is free per part and it is available only before the tool is cut. Mould temperature is the weaker lever and it works differently. It enters through a logarithm rather than a square, so a large temperature change buys a small time change -- and running the mould colder to save cycle time costs crystallinity in semi-crystalline materials, adds moulded-in stress, and degrades surface finish. It is the adjustment available after the tool exists, which is why it is the one reached for, and it is the one that quietly moves part properties. This is a one-dimensional plate solution with constant properties. It does not handle three-dimensional heat flow, corners, or ribs (which cool from more than one direction and are why real parts beat this figure at features and miss it at thick sections), does not model the actual mould cooling circuit, its layout, flow rate or turbulence, does not account for crystallisation heat in semi-crystalline materials, and does not compute the injection, hold, or mould movement portions of the cycle. Thermal diffusivity is entered because it varies with temperature and with the material; for common thermoplastics it runs roughly 0.00013 to 0.00023 in2/s, which is what the conductivity, density and specific heat of ABS, polypropylene, polycarbonate and HDPE give -- a figure several times larger than that shortens every answer here in proportion, so it is worth checking against the moulder's own cycle records. The resin supplier's data, a mould cooling analysis, and the moulder's own cycle records govern.",
  };
}
export const injectionCoolingTimeExample = { inputs: { wall_thickness_in: 0.1, alpha_in2_s: 0.00015, melt_temp_f: 450, mould_temp_f: 100, eject_temp_f: 180, alt_wall_thickness_in: 0.125, non_cooling_cycle_s: 8, annual_parts: 1000000 } };
PROCESS_RENDERERS["injection-cooling-time"] = _simpleRenderer({
  citation: "Citation: the one-dimensional plate cooling solution t = h² / (π² α) × ln[(4/π) × (T_melt − T_mould) / (T_eject − T_mould)], with thermal diffusivity α ENTERED because it varies with material and temperature -- roughly 0.00013 to 0.00023 in²/s for common thermoplastics, which is what k/(ρ·cp) gives for ABS, polypropylene, polycarbonate and HDPE. Cooling goes with the SQUARE of the wall and only the LOGARITHM of the temperatures, which is why thickness is the lever and mould temperature is not. It does not handle three-dimensional heat flow, corners or ribs, model the mould cooling circuit, account for crystallisation heat, or compute the injection and hold portions of the cycle. The resin supplier's data and a mould cooling analysis govern.",
  example: injectionCoolingTimeExample.inputs,
  fields: [
    { key: "wall_thickness_in", label: "Maximum wall thickness (in)", kind: "number", attrs: { step: "any" } },
    { key: "alpha_in2_s", label: "Thermal diffusivity α (in²/s)", kind: "number", attrs: { step: "any" } },
    { key: "melt_temp_f", label: "Melt temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "mould_temp_f", label: "Mould temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "eject_temp_f", label: "Ejection temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "alt_wall_thickness_in", label: "Alternative wall thickness (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "non_cooling_cycle_s", label: "Rest of the cycle (s, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "annual_parts", label: "Annual volume (parts, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "c", id: "ico-out-c", label: "Cooling time", value: (r) => r.cooling_verdict },
    { key: "s", id: "ico-out-s", label: "The square law", value: (r) => r.square_verdict },
    { key: "k", id: "ico-out-k", label: "Coring, the counter-move", value: (r) => r.coring_verdict },
    { key: "y", id: "ico-out-y", label: "Share of the cycle", value: (r) => r.cycle_verdict },
    { key: "m", id: "ico-out-m", label: "What it costs a year", value: (r) => r.cost_verdict },
    { key: "n", id: "ico-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeInjectionCoolingTime,
});

// =====================================================================
// spec-v1708: moulded part shrinkage and the cavity dimension to cut.
// =====================================================================
// dims: in { part_dimension_in: L, shrinkage_flow_in_in: dimensionless, shrinkage_cross_in_in: dimensionless, shrinkage_low_in_in: dimensionless, shrinkage_high_in_in: dimensionless, existing_cavity_in: L } out: { cavity_flow_in: L, cavity_cross_in: L, anisotropy_in: L, cavity_low_in: L, cavity_high_in: L, range_in: L, part_from_cavity_in: L }
export function computeMoldShrinkageDimension({
  part_dimension_in = 0, shrinkage_flow_in_in = 0, shrinkage_cross_in_in = 0,
  shrinkage_low_in_in = 0, shrinkage_high_in_in = 0, existing_cavity_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(part_dimension_in > 0)) return { error: "Nominal part dimension must be positive (in)." };
  if (!(shrinkage_flow_in_in > 0) || shrinkage_flow_in_in >= 1) return { error: "Flow-direction shrinkage must be positive and below 1 in/in." };
  if (shrinkage_cross_in_in < 0 || shrinkage_cross_in_in >= 1) return { error: "Cross-flow shrinkage must be at least 0 and below 1 in/in." };
  if (shrinkage_low_in_in < 0 || shrinkage_high_in_in < 0 || shrinkage_low_in_in >= 1 || shrinkage_high_in_in >= 1) return { error: "The shrinkage range must be at least 0 and below 1 in/in." };
  if (shrinkage_high_in_in > 0 && shrinkage_low_in_in > shrinkage_high_in_in) return { error: "The low end of the shrinkage range must not exceed the high end." };
  if (existing_cavity_in < 0) return { error: "Existing cavity dimension cannot be negative." };
  const _cavity = (s) => part_dimension_in / (1 - s);
  const cavity_flow_in = _cavity(shrinkage_flow_in_in);
  const oversize_in = cavity_flow_in - part_dimension_in;
  const cavity_verdict = "cut the cavity " + fmt(cavity_flow_in, 4) + " in -- " + fmt(oversize_in * 1000, 1) + " thousandths oversize on a " + fmt(part_dimension_in, 3) + " in dimension, at " + fmt(shrinkage_flow_in_in, 4) + " in/in of shrinkage";
  const has_cross = shrinkage_cross_in_in > 0;
  const cavity_cross_in = has_cross ? _cavity(shrinkage_cross_in_in) : 0;
  const anisotropy_in = has_cross ? cavity_flow_in - cavity_cross_in : 0;
  const anisotropy_verdict = !has_cross
    ? "(no cross-flow shrinkage entered -- a single figure assumes the material shrinks the same in both directions, which filled and semi-crystalline materials do not)"
    : "across the flow the same dimension wants " + fmt(cavity_cross_in, 4) + " in, a difference of " + fmt(Math.abs(anisotropy_in) * 1000, 1) + " thousandths. A square feature cut uniformly comes out RECTANGULAR, and on a filled material the gap is larger still -- which is why glass-filled parts warp out of moulds cut to a single shrinkage figure";
  const has_range = shrinkage_high_in_in > 0 && shrinkage_high_in_in > shrinkage_low_in_in;
  const cavity_low_in = has_range ? _cavity(shrinkage_low_in_in) : 0;
  const cavity_high_in = has_range ? _cavity(shrinkage_high_in_in) : 0;
  const range_in = has_range ? cavity_high_in - cavity_low_in : 0;
  const range_verdict = !has_range
    ? "(no shrinkage range entered)"
    : "the published range " + fmt(shrinkage_low_in_in, 4) + " to " + fmt(shrinkage_high_in_in, 4) + " in/in spans " + fmt(range_in * 1000, 1) + " thousandths of cavity dimension -- and process conditions move the ACTUAL shrinkage within that range, so the range is the real uncertainty rather than the single number";
  // Steel safe: which end of the range to cut to, and why it is not symmetric.
  const steel_safe_verdict = !has_range
    ? "cut to the LOW end of the shrinkage range. The error is not symmetric: a cavity cut small makes a part LARGE, and a large part is corrected by removing metal from the cavity, which is possible. Cut to the high end and the part comes out small, and correcting that means welding the cavity and re-cutting it"
    : "cut to " + fmt(cavity_low_in, 4) + " in, the LOW end of the range. The error is not symmetric: this cavity makes the part large if the material shrinks more than assumed, and a large part is corrected by REMOVING metal, which is possible. The " + fmt(cavity_high_in, 4) + " in end makes the part small, and correcting that means welding the cavity and re-cutting it";
  const has_existing = existing_cavity_in > 0;
  const part_from_cavity_in = has_existing ? existing_cavity_in * (1 - shrinkage_flow_in_in) : 0;
  const existing_verdict = !has_existing
    ? "(no existing cavity dimension entered)"
    : "an existing " + fmt(existing_cavity_in, 4) + " in cavity makes a " + fmt(part_from_cavity_in, 4) + " in part in this material, " + fmt(Math.abs(part_from_cavity_in - part_dimension_in) * 1000, 1) + " thousandths " + (part_from_cavity_in > part_dimension_in ? "OVER" : "UNDER") + " the nominal -- which is what a mould cut for one material and run in another produces, and on a fitted part it is a scrapped tool";
  if (![cavity_flow_in, cavity_cross_in, anisotropy_in, cavity_low_in, cavity_high_in, range_in, part_from_cavity_in].every(Number.isFinite)) return { error: "Shrinkage math is not a finite value." };
  return {
    cavity_flow_in, oversize_in, cavity_verdict, has_cross, cavity_cross_in, anisotropy_in,
    anisotropy_verdict, has_range, cavity_low_in, cavity_high_in, range_in, range_verdict,
    steel_safe_verdict, has_existing, part_from_cavity_in, existing_verdict,
    note: "The cavity dimension to cut so the part comes out on nominal after it shrinks. The relation divides rather than multiplies -- cavity = part / (1 - shrinkage) -- and the difference from the approximate part x (1 + shrinkage) is small at low shrinkage and real at high, which matters because the semi-crystalline materials that shrink most are where the error is largest. Material class is the first-order decision. Amorphous materials such as ABS, polycarbonate and polystyrene shrink roughly 0.004 to 0.008 in/in; semi-crystalline materials such as polypropylene, polyethylene, acetal and nylon shrink roughly 0.010 to 0.025, several times more. A mould cut for one and run in the other misses by enough to scrap a fitted part, and the tool is the thing that has to be corrected. Two things make a single shrinkage figure insufficient. The first is ANISOTROPY: flow-direction and cross-flow shrinkage differ, sharply in filled and semi-crystalline materials, so a square feature cut uniformly comes out rectangular and a glass-filled part warps out of a mould cut on one number. The second is that the published figure is a RANGE, not a value, and mould temperature, hold pressure and hold time all move the actual shrinkage within it -- so the range is the real uncertainty and the process is part of the dimension. Some materials also continue shrinking for hours or days after ejection, which is why a part measured at the press can be out of tolerance the next morning. The steel-safe rule follows from an asymmetry rather than from caution. Cutting the cavity to the LOW end of the shrinkage range makes it small, which makes the part large, and a large part is corrected by removing metal from the cavity -- a normal, cheap operation. Cutting to the high end makes the part small, and correcting that means welding the cavity and re-cutting it, which is expensive and leaves a repair in the tool. The two errors are not equally recoverable, so the choice between them is not a coin toss. This computes a dimension from an entered shrinkage. It does not predict shrinkage from the material and the process, model warpage or differential shrinkage across a part, account for gate location and its effect on flow direction, handle post-mould shrinkage timing, or size a tool. Mould flow analysis, the resin supplier's shrinkage data for the specific grade, and the mould designer govern.",
  };
}
export const moldShrinkageDimensionExample = { inputs: { part_dimension_in: 4.000, shrinkage_flow_in_in: 0.018, shrinkage_cross_in_in: 0.012, shrinkage_low_in_in: 0.015, shrinkage_high_in_in: 0.022, existing_cavity_in: 4.0201 } };
PROCESS_RENDERERS["mold-shrinkage-dimension"] = _simpleRenderer({
  citation: "Citation: cavity = part dimension / (1 − shrinkage), with shrinkage ENTERED in in/in from the resin supplier's data for the specific grade -- amorphous materials (ABS, PC, PS) run roughly 0.004 to 0.008 and semi-crystalline (PP, PE, POM, nylon) roughly 0.010 to 0.025. The published figure is a RANGE that mould temperature, hold pressure and hold time move within, and flow and cross-flow shrinkage differ. The steel-safe rule is asymmetric: a cavity cut small makes a large part, corrected by removing metal; cut large it makes a small part, corrected only by welding and re-cutting. It does not predict shrinkage, model warpage, or account for gate location. Mould flow analysis and the resin supplier's data govern.",
  example: moldShrinkageDimensionExample.inputs,
  fields: [
    { key: "part_dimension_in", label: "Nominal part dimension (in)", kind: "number", attrs: { step: "any" } },
    { key: "shrinkage_flow_in_in", label: "Shrinkage along flow (in/in)", kind: "number", attrs: { step: "any" } },
    { key: "shrinkage_cross_in_in", label: "Shrinkage across flow (in/in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "shrinkage_low_in_in", label: "Published range, low end (in/in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "shrinkage_high_in_in", label: "Published range, high end (in/in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "existing_cavity_in", label: "Existing cavity dimension (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "c", id: "msd-out-c", label: "Cavity to cut", value: (r) => r.cavity_verdict },
    { key: "a", id: "msd-out-a", label: "Flow vs cross-flow", value: (r) => r.anisotropy_verdict },
    { key: "r", id: "msd-out-r", label: "Across the published range", value: (r) => r.range_verdict },
    { key: "s", id: "msd-out-s", label: "Steel safe", value: (r) => r.steel_safe_verdict },
    { key: "e", id: "msd-out-e", label: "What an existing cavity makes", value: (r) => r.existing_verdict },
    { key: "n", id: "msd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMoldShrinkageDimension,
});

// =====================================================================
// spec-v1709: extrusion output rate, line speed, and what actually governs.
// =====================================================================
// dims: in { product_od_in: L, wall_thickness_in: L, line_speed_ft_min: L T^-1, melt_density_lb_in3: M L^-3, extruder_output_lb_h: M T^-1, die_opening_in: L, cooling_capacity_lb_h: M T^-1, shift_hours: T } out: { area_in2: L^2, output_at_speed_lb_h: M T^-1, speed_at_output_ft_min: L T^-1, draw_down_ratio: dimensionless, lb_per_ft: M L^-1, shift_pounds: M }
export function computeExtrusionOutputRate({
  product_od_in = 0, wall_thickness_in = 0, line_speed_ft_min = 0, melt_density_lb_in3 = 0,
  extruder_output_lb_h = 0, die_opening_in = 0, cooling_capacity_lb_h = 0, shift_hours = 8,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(product_od_in > 0)) return { error: "Product outside diameter must be positive (in)." };
  if (!(wall_thickness_in > 0)) return { error: "Wall thickness must be positive (in)." };
  if (!(wall_thickness_in * 2 < product_od_in)) return { error: "Twice the wall thickness must be less than the outside diameter." };
  if (!(melt_density_lb_in3 > 0)) return { error: "Melt density must be positive (lb/in^3)." };
  if (line_speed_ft_min < 0 || extruder_output_lb_h < 0 || die_opening_in < 0 || cooling_capacity_lb_h < 0) return { error: "Line speed, output, die opening and cooling capacity cannot be negative." };
  if (!(shift_hours > 0)) return { error: "Shift hours must be positive." };
  // The exact annulus, not the thin-wall approximation the spec used.
  const id_in = product_od_in - 2 * wall_thickness_in;
  const area_in2 = Math.PI / 4 * (product_od_in * product_od_in - id_in * id_in);
  const thin_wall_area_in2 = Math.PI * product_od_in * wall_thickness_in;
  const lb_per_ft = area_in2 * 12 * melt_density_lb_in3;
  const area_verdict = "the product is " + fmt(area_in2, 4) + " in2 of cross-section and weighs " + fmt(lb_per_ft, 4) + " lb per foot. (The thin-wall approximation pi x OD x wall gives " + fmt(thin_wall_area_in2, 4) + " in2, " + fmt((thin_wall_area_in2 / area_in2 - 1) * 100, 1) + "% high -- the exact annulus is used here)";
  const has_speed = line_speed_ft_min > 0;
  const output_at_speed_lb_h = has_speed ? lb_per_ft * line_speed_ft_min * 60 : 0;
  const speed_verdict = !has_speed
    ? "(no line speed entered)"
    : "at " + fmt(line_speed_ft_min, 1) + " ft/min that is " + fmt(output_at_speed_lb_h, 0) + " lb/h";
  const has_output = extruder_output_lb_h > 0;
  const speed_at_output_ft_min = has_output ? extruder_output_lb_h / (lb_per_ft * 60) : 0;
  const output_verdict = !has_output
    ? "(no extruder output entered)"
    : "an extruder rated " + fmt(extruder_output_lb_h, 0) + " lb/h runs this product at " + fmt(speed_at_output_ft_min, 1) + " ft/min -- and whether the line can ACTUALLY run there depends on the cooling, not on the screw";
  const has_die = die_opening_in > 0;
  const draw_down_ratio = has_die ? die_opening_in / product_od_in : 0;
  const draw_verdict = !has_die
    ? "(no die opening entered)"
    : "the die opens " + fmt(die_opening_in, 3) + " in for a " + fmt(product_od_in, 3) + " in product, a draw-down ratio of " + fmt(draw_down_ratio, 3) + ". The material is drawn between die and calibrator, which ORIENTS it and affects properties as well as size -- so line speed and output are not independently adjustable without changing that ratio";
  const has_cooling = cooling_capacity_lb_h > 0;
  const cooling_speed_ft_min = has_cooling ? cooling_capacity_lb_h / (lb_per_ft * 60) : 0;
  const cooling_governs = has_cooling && has_output && cooling_capacity_lb_h < extruder_output_lb_h;
  const cooling_verdict = !has_cooling
    ? "(no cooling capacity entered -- and cooling is usually what governs)"
    : cooling_governs
      ? "COOLING GOVERNS: the bath supports " + fmt(cooling_capacity_lb_h, 0) + " lb/h (" + fmt(cooling_speed_ft_min, 1) + " ft/min) against the extruder's " + fmt(extruder_output_lb_h, 0) + " lb/h. Pushing the screw to its rating delivers product that has not solidified by the haul-off: it leaves the bath soft, ovalises under the puller, and the dimensions drift. Adding extruder output to a cooling-limited line buys NOTHING, and the operator's instinct to slow the line without slowing the screw makes it worse by putting more material in every foot"
      : "the bath supports " + fmt(cooling_capacity_lb_h, 0) + " lb/h (" + fmt(cooling_speed_ft_min, 1) + " ft/min), which covers the entered output -- so the screw governs here rather than the cooling";
  const shift_pounds = has_speed ? output_at_speed_lb_h * shift_hours : 0;
  const consumption_verdict = !has_speed
    ? "(no line speed entered)"
    : "that is " + fmt(shift_pounds, 0) + " lb of material over a " + fmt(shift_hours, 1) + " hour shift";
  if (![area_in2, output_at_speed_lb_h, speed_at_output_ft_min, draw_down_ratio, lb_per_ft, shift_pounds].every(Number.isFinite)) return { error: "Extrusion rate math is not a finite value." };
  return {
    id_in, area_in2, thin_wall_area_in2, lb_per_ft, area_verdict,
    has_speed, output_at_speed_lb_h, speed_verdict,
    has_output, speed_at_output_ft_min, output_verdict,
    has_die, draw_down_ratio, draw_verdict,
    has_cooling, cooling_speed_ft_min, cooling_governs, cooling_verdict,
    shift_pounds, consumption_verdict,
    note: "The mass balance between the two units an extrusion line is run in: pounds per hour, and feet per minute. Cross-sectional area times line speed times melt density is the whole of it, and its value is that the two numbers are set by different people looking at different gauges. The exact annular area is used here rather than the thin-wall approximation, because on a heavy wall the approximation runs several percent high and that error lands directly on the output figure. THE DIAGNOSIS THIS SUPPORTS IS THAT COOLING USUALLY GOVERNS, NOT THE SCREW. An extruder rated well above what the bath can solidify does not produce more good product; it produces product that leaves the bath soft, ovalises under the puller, and drifts dimensionally. Adding extruder output to a cooling-limited line buys nothing at all, and the money goes to bath length, water temperature, or a vacuum tank rather than to a bigger machine. The operator's instinct when the product comes out soft -- slow the line and leave the screw alone -- makes it worse, because it puts more material in every foot and more heat in the bath. Draw-down is the reason line speed and output are not independently adjustable. The die is deliberately larger than the finished product, and the material is drawn between the die and the calibrator, which orients the polymer and changes properties as well as dimensions. Changing the speed without changing the output changes that ratio, so a line that is running well is running at a particular combination rather than at a particular speed. This is a mass balance on entered geometry and density. It does not size an extruder or a screw, model die swell (which is why the die is not simply cut to the product size), compute the cooling actually required or the bath length that provides it, address melt temperature, pressure, or the screw's plasticising capacity, or handle non-uniform wall or profile shapes -- the annulus here is a round pipe or tube. Melt density is entered because it differs from the solid density and varies with temperature. The extruder and die manufacturers' data, the material supplier's melt properties, and the line's own production records govern.",
  };
}
export const extrusionOutputRateExample = { inputs: { product_od_in: 2.5, wall_thickness_in: 0.1, line_speed_ft_min: 45, melt_density_lb_in3: 0.0347, extruder_output_lb_h: 400, die_opening_in: 3.0, cooling_capacity_lb_h: 500, shift_hours: 8 } };
PROCESS_RENDERERS["extrusion-output-rate"] = _simpleRenderer({
  citation: "Citation: the extrusion mass balance -- output = cross-sectional area × line speed × melt density -- using the EXACT annular area π/4 × (OD² − ID²) rather than the thin-wall approximation π × OD × wall, which runs several percent high on a heavy wall and puts that error straight onto the output figure. Melt density is ENTERED because it differs from solid density and varies with temperature. It does not size an extruder or screw, model die swell, compute the cooling required or the bath length providing it, or handle profile shapes other than a round annulus. The extruder and die manufacturers' data and the line's own production records govern.",
  example: extrusionOutputRateExample.inputs,
  fields: [
    { key: "product_od_in", label: "Product outside diameter (in)", kind: "number", attrs: { step: "any" } },
    { key: "wall_thickness_in", label: "Wall thickness (in)", kind: "number", attrs: { step: "any" } },
    { key: "line_speed_ft_min", label: "Line speed (ft/min, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "melt_density_lb_in3", label: "Melt density (lb/in³)", kind: "number", attrs: { step: "any" } },
    { key: "extruder_output_lb_h", label: "Extruder rated output (lb/h, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "die_opening_in", label: "Die opening (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "cooling_capacity_lb_h", label: "Cooling capacity (lb/h, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "shift_hours", label: "Shift length (h)", kind: "number", default: 8, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "a", id: "eor-out-a", label: "Cross-section and weight", value: (r) => r.area_verdict },
    { key: "o", id: "eor-out-o", label: "Output at this speed", value: (r) => r.speed_verdict },
    { key: "s", id: "eor-out-s", label: "Speed at this output", value: (r) => r.output_verdict },
    { key: "c", id: "eor-out-c", label: "What actually governs", value: (r) => r.cooling_verdict },
    { key: "d", id: "eor-out-d", label: "Draw-down", value: (r) => r.draw_verdict },
    { key: "m", id: "eor-out-m", label: "Material per shift", value: (r) => r.consumption_verdict },
    { key: "n", id: "eor-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeExtrusionOutputRate,
});

// =====================================================================
// spec-v1710: thermoforming draw ratio and wall thinning.
// =====================================================================
// dims: in { opening_diameter_in: L, draw_depth_in: L, sheet_thickness_in: L, corner_fraction: dimensionless, min_wall_in: L, hd_limit: dimensionless } out: { hd_ratio: dimensionless, areal_draw_ratio: dimensionless, average_wall_in: L, corner_wall_in: L, sheet_for_corner_in: L, formed_area_in2: L^2 }
export function computeThermoformingDrawRatio({
  opening_diameter_in = 0, draw_depth_in = 0, sheet_thickness_in = 0,
  corner_fraction = 0.4, min_wall_in = 0, hd_limit = 0.5,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(opening_diameter_in > 0)) return { error: "Opening diameter must be positive (in)." };
  if (!(draw_depth_in > 0)) return { error: "Draw depth must be positive (in)." };
  if (!(sheet_thickness_in > 0)) return { error: "Starting sheet thickness must be positive (in)." };
  if (!(corner_fraction > 0) || corner_fraction > 1) return { error: "The corner fraction must be above 0 and no more than 1." };
  if (min_wall_in < 0) return { error: "Minimum acceptable wall cannot be negative." };
  if (!(hd_limit > 0)) return { error: "The practical H/D limit must be positive." };
  const hd_ratio = draw_depth_in / opening_diameter_in;
  const original_area_in2 = Math.PI / 4 * opening_diameter_in * opening_diameter_in;
  const side_area_in2 = Math.PI * opening_diameter_in * draw_depth_in;
  const formed_area_in2 = side_area_in2 + original_area_in2;
  const areal_draw_ratio = formed_area_in2 / original_area_in2;
  const average_wall_in = sheet_thickness_in / areal_draw_ratio;
  const within_limit = hd_ratio <= hd_limit;
  const depth_verdict = "the draw is H/D " + fmt(hd_ratio, 3) + " (" + fmt(draw_depth_in, 2) + " in deep on a " + fmt(opening_diameter_in, 2) + " in opening), "
    + (within_limit
      ? "within the " + fmt(hd_limit, 2) + " practical limit for unassisted female forming"
      : "ABOVE the " + fmt(hd_limit, 2) + " practical limit for unassisted female forming -- this part needs plug assist or pressure forming");
  const ratio_verdict = "the areal draw ratio is " + fmt(areal_draw_ratio, 3) + ": " + fmt(formed_area_in2, 0) + " in2 of formed surface out of " + fmt(original_area_in2, 0) + " in2 of sheet, so the average wall falls from " + fmt(sheet_thickness_in, 4) + " to " + fmt(average_wall_in, 4) + " in. The draw ratio is a CONSERVATION statement -- the sheet has a fixed amount of material and stretching it further makes it thinner everywhere";
  const corner_wall_in = average_wall_in * corner_fraction;
  const corner_verdict = "the average is not the specification. The bottom corners are the LAST material to arrive, formed from sheet that has already chilled against the sidewall, so at " + fmt(corner_fraction * 100, 0) + "% of average they are about " + fmt(corner_wall_in, 4) + " in -- and the corner is what the part fails at";
  const has_min = min_wall_in > 0;
  const corner_passes = has_min && corner_wall_in >= min_wall_in;
  // The inversion the part's cost actually turns on.
  const sheet_for_corner_in = has_min ? min_wall_in / corner_fraction * areal_draw_ratio : 0;
  const min_verdict = !has_min
    ? "(no minimum acceptable wall entered)"
    : corner_passes
      ? "the " + fmt(corner_wall_in, 4) + " in corner meets the " + fmt(min_wall_in, 4) + " in minimum"
      : "the " + fmt(corner_wall_in, 4) + " in corner FAILS the " + fmt(min_wall_in, 4) + " in minimum: the starting sheet has to be " + fmt(sheet_for_corner_in, 4) + " in, not " + fmt(sheet_thickness_in, 4) + " -- a materially heavier and more expensive sheet, and THAT is the number the part's cost is set by rather than the average wall";
  const fix_verdict = "plug assist redistributes material toward the bottom and improves the corner substantially WITHOUT changing the average, which is why it is the standard answer for a deep draw -- the average is fixed by conservation and only the distribution is available. Opening the corner radii does the same thing from the design side and costs nothing";
  if (![hd_ratio, areal_draw_ratio, average_wall_in, corner_wall_in, sheet_for_corner_in, formed_area_in2].every(Number.isFinite)) return { error: "Draw ratio math is not a finite value." };
  return {
    hd_ratio, original_area_in2, side_area_in2, formed_area_in2, areal_draw_ratio,
    average_wall_in, within_limit, depth_verdict, ratio_verdict,
    corner_wall_in, corner_verdict, has_min, corner_passes, sheet_for_corner_in, min_verdict, fix_verdict,
    note: "How thin a thermoformed part gets, which is a conservation statement rather than a process one. The sheet has a fixed amount of material, and the areal draw ratio -- formed surface area over the sheet area it came from -- divides the starting gauge to give the average wall. Nothing in the process changes that average. Only the distribution is available. The depth-to-diameter ratio is the rough screen, easier to compute than the areal ratio and good enough to say whether a part is formable at all: unassisted female forming runs to roughly 0.5, and deeper than that needs plug assist or pressure forming. It is a screen and not a substitute, because two parts at the same H/D can have quite different areal ratios depending on their shape. THE AVERAGE IS NOT THE SPECIFICATION, AND THAT IS THE POINT. The bottom corners are the last material to arrive, formed from sheet that has already chilled against the sidewall it touched on the way down, and they run a third to a half of the average. A part quoted on its average wall is quoted on a number that appears nowhere on it. The corner is where the part fails, so the corner is what the starting gauge has to be chosen for -- and the sheet thickness that meets a corner minimum is materially heavier than the one that meets an average, which is where the part's cost actually comes from. Plug assist is the standard answer because it attacks the right variable. It pre-stretches the sheet and redistributes material toward the bottom, improving the corner substantially while leaving the average exactly where conservation puts it. Opening the corner radii does the same thing from the design side at no cost at all, and it is the change most often available and least often made. This estimates from an entered geometry, approximating the formed shape as a cylinder plus a flat bottom. It does not compute a real formed area from a three-dimensional part, model the actual material distribution (which depends on sheet temperature uniformity, the mould, the plug shape and the forming sequence), predict the corner fraction -- that is entered, and it varies widely -- select a forming method, address trim, sag, or the sheet's own temperature window, or handle male (drape) forming, where the material distribution is different in kind. The thermoformer's own trials and the sheet supplier's data govern.",
  };
}
export const thermoformingDrawRatioExample = { inputs: { opening_diameter_in: 10, draw_depth_in: 6, sheet_thickness_in: 0.060, corner_fraction: 0.4, min_wall_in: 0.015, hd_limit: 0.5 } };
PROCESS_RENDERERS["thermoforming-draw-ratio"] = _simpleRenderer({
  citation: "Citation: the areal draw ratio ADR = formed surface area / original sheet area, giving an average wall of sheet gauge / ADR -- a CONSERVATION statement, so no process change moves the average and only the distribution is available. The formed shape is approximated as a cylinder plus a flat bottom. The corner fraction is ENTERED (commonly a third to a half of average, because corners are the last material to arrive and form from sheet already chilled against the sidewall) because it varies widely and is not predicted here. Unassisted female forming runs to roughly H/D 0.5. It does not model actual material distribution, select a forming method, or handle male (drape) forming. The thermoformer's own trials govern.",
  example: thermoformingDrawRatioExample.inputs,
  fields: [
    { key: "opening_diameter_in", label: "Opening diameter (in)", kind: "number", attrs: { step: "any" } },
    { key: "draw_depth_in", label: "Draw depth (in)", kind: "number", attrs: { step: "any" } },
    { key: "sheet_thickness_in", label: "Starting sheet thickness (in)", kind: "number", attrs: { step: "any" } },
    { key: "corner_fraction", label: "Corner wall as a fraction of average", kind: "number", default: 0.4, attrs: { step: "any" } },
    { key: "min_wall_in", label: "Minimum acceptable wall (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "hd_limit", label: "Practical H/D limit for the method", kind: "number", default: 0.5, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "d", id: "tdr-out-d", label: "Depth of draw", value: (r) => r.depth_verdict },
    { key: "r", id: "tdr-out-r", label: "Draw ratio and average wall", value: (r) => r.ratio_verdict },
    { key: "c", id: "tdr-out-c", label: "The corner", value: (r) => r.corner_verdict },
    { key: "m", id: "tdr-out-m", label: "Against the minimum", value: (r) => r.min_verdict },
    { key: "p", id: "tdr-out-p", label: "What moves the corner", value: (r) => r.fix_verdict },
    { key: "n", id: "tdr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeThermoformingDrawRatio,
});

// =====================================================================
// spec-v1711: HDPE butt fusion interface pressure and cycle times.
// =====================================================================
// dims: in { pipe_od_in: L, dimension_ratio: dimensionless, wall_thickness_in: L, cylinder_area_in2: L^2, interfacial_pressure_psi: M L^-1 T^-2, drag_pressure_psi: M L^-1 T^-2, alt_pipe_od_in: L } out: { wall_in: L, face_area_in2: L^2, theoretical_gauge_psi: M L^-1 T^-2, total_gauge_psi: M L^-1 T^-2, alt_gauge_psi: M L^-1 T^-2 }
export function computeHdpeFusionPressureTime({
  pipe_od_in = 0, dimension_ratio = 0, wall_thickness_in = 0, cylinder_area_in2 = 0,
  interfacial_pressure_psi = 75, drag_pressure_psi = 0, alt_pipe_od_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_od_in > 0)) return { error: "Pipe outside diameter must be positive (in)." };
  if (!(dimension_ratio > 0) && !(wall_thickness_in > 0)) return { error: "Enter either the dimension ratio or the wall thickness." };
  if (dimension_ratio > 0 && dimension_ratio <= 2) return { error: "The dimension ratio must be above 2." };
  if (!(cylinder_area_in2 > 0)) return { error: "Machine total effective cylinder area must be positive (in^2)." };
  if (!(interfacial_pressure_psi > 0)) return { error: "Interfacial pressure must be positive (psi)." };
  if (drag_pressure_psi < 0) return { error: "Drag pressure cannot be negative." };
  if (alt_pipe_od_in < 0) return { error: "Alternative pipe size cannot be negative." };
  const _wallFor = (od) => (wall_thickness_in > 0 && dimension_ratio <= 0) ? wall_thickness_in : od / dimension_ratio;
  const wall_in = _wallFor(pipe_od_in);
  if (!(wall_in > 0) || !(wall_in * 2 < pipe_od_in)) return { error: "The wall thickness must be positive and less than half the outside diameter." };
  const _faceArea = (od, t) => Math.PI / 4 * (od * od - (od - 2 * t) * (od - 2 * t));
  const face_area_in2 = _faceArea(pipe_od_in, wall_in);
  const theoretical_gauge_psi = interfacial_pressure_psi * face_area_in2 / cylinder_area_in2;
  const total_gauge_psi = theoretical_gauge_psi + drag_pressure_psi;
  const pipe_verdict = "the pipe wall is " + fmt(wall_in, 3) + " in and its face presents " + fmt(face_area_in2, 2) + " in2 of annular area";
  const gauge_verdict = "for " + fmt(interfacial_pressure_psi, 0) + " psi at the joint the machine gauge reads " + fmt(theoretical_gauge_psi, 0) + " psi, from the ratio of pipe face area to the " + fmt(cylinder_area_in2, 2) + " in2 of cylinder";
  const has_drag = drag_pressure_psi > 0;
  const drag_verdict = !has_drag
    ? "NO DRAG PRESSURE ENTERED, and that is the error this calculation exists to prevent. Drag is the pressure needed to move the carriage and the pipe before any force reaches the joint, and it must be MEASURED before every joint and ADDED -- it changes with every setup, with the length of pipe hanging off the machine, and with the ground it is dragging over, so it cannot be carried over from the last joint"
    : "set " + fmt(total_gauge_psi, 0) + " psi on the gauge, of which only " + fmt(theoretical_gauge_psi, 0) + " is doing work at the joint and " + fmt(drag_pressure_psi, 0) + " is moving the carriage. Skipping the drag measurement and setting " + fmt(theoretical_gauge_psi, 0) + " under-presses the joint by the whole " + fmt(drag_pressure_psi, 0) + " psi";
  const has_alt = alt_pipe_od_in > 0 && dimension_ratio > 0;
  const alt_wall_in = has_alt ? alt_pipe_od_in / dimension_ratio : 0;
  const alt_face_area_in2 = has_alt ? _faceArea(alt_pipe_od_in, alt_wall_in) : 0;
  const alt_gauge_psi = has_alt ? interfacial_pressure_psi * alt_face_area_in2 / cylinder_area_in2 + drag_pressure_psi : 0;
  const alt_verdict = !has_alt
    ? "(no alternative pipe size entered, or the wall was entered directly rather than as a dimension ratio)"
    : "the same machine on " + fmt(alt_pipe_od_in, 3) + " in pipe at the same ratio wants " + fmt(alt_gauge_psi, 0) + " psi, " + fmt(alt_gauge_psi / total_gauge_psi, 2) + " times this joint's setting -- which is why running a FIXED gauge pressure across sizes is the other way this goes wrong. The small-pipe number badly under-presses large pipe, and the large-pipe number squeezes the melt out of a small joint";
  // Heat soak and cool are procedure times BY WALL THICKNESS. They are named
  // here and deliberately not computed -- a key that is always zero is worse
  // than an honest pointer at the procedure that governs them.
  const time_verdict = "heat soak and cool time come from the fusion procedure BY WALL THICKNESS (" + fmt(wall_in, 3) + " in here) and are not computed from the pressure -- consult the pipe manufacturer's procedure. Cool time is where a joint is lost after everything else was right: the pressure stays on for the full cool period, and releasing early relaxes a joint that will look correct and test badly";
  if (![wall_in, face_area_in2, theoretical_gauge_psi, total_gauge_psi, alt_gauge_psi].every(Number.isFinite)) return { error: "Fusion pressure math is not a finite value." };
  return {
    wall_in, face_area_in2, theoretical_gauge_psi, total_gauge_psi, has_drag,
    pipe_verdict, gauge_verdict, drag_verdict,
    has_alt, alt_wall_in, alt_face_area_in2, alt_gauge_psi, alt_verdict,
    time_verdict,
    note: "The gauge pressure a butt fusion machine needs so the pipe faces see the interfacial pressure the procedure specifies. The machine pushes on a hydraulic cylinder of fixed area and the pipe presents an annular face area that changes with every size, so the gauge reading that produces a correct joint is different for every pipe on the same machine. Two errors follow from that and both produce joints that look right. THE FIRST IS OMITTING DRAG. Some of the machine's pressure is spent moving the carriage and the pipe itself before any force reaches the joint, and that drag has to be measured and ADDED to the calculated figure. It is not a constant: it changes with the setup, with how much pipe is hanging off the machine, and with what the pipe is being dragged over, so it must be measured before every joint rather than carried over from the last one. Setting the calculated pressure without it under-presses the joint by exactly the drag. THE SECOND IS RUNNING A FIXED GAUGE NUMBER ACROSS SIZES. Face area grows roughly with the square of the diameter, so the correct gauge pressure on large pipe is several times the small-pipe figure. Using the small number on large pipe badly under-presses it; using the large number on small pipe over-presses and squeezes the melt out of the joint, which is the failure that leaves a large bead and a weak weld. Heat soak and cool times are governed by WALL THICKNESS and come from the procedure rather than from this arithmetic, and cool time is where a correct joint is most often lost at the last step: the pressure must stay on for the full cool period, and releasing early relaxes a joint that will look correct and test badly. The bead is the visual check, and its size and shape are what the operator reads. This computes pressures from an entered geometry and an entered interfacial pressure. It does not supply the interfacial pressure, the heat soak time, the cool time, or the heater surface temperature -- all four come from the pipe manufacturer's procedure and the applicable practice, and they differ between manufacturers and materials. It does not qualify a fusion machine or an operator, evaluate a bead, address pipe end preparation, alignment, high-low, or contamination, or cover electrofusion or socket fusion, which are different processes with different controls. ASTM F2620 or the manufacturer's own qualified procedure, and the operator's qualification, govern.",
  };
}
export const hdpeFusionPressureTimeExample = { inputs: { pipe_od_in: 6.625, dimension_ratio: 11, wall_thickness_in: 0, cylinder_area_in2: 3.15, interfacial_pressure_psi: 75, drag_pressure_psi: 60, alt_pipe_od_in: 12.75 } };
PROCESS_RENDERERS["hdpe-fusion-pressure-time"] = _simpleRenderer({
  citation: "Citation: gauge pressure = interfacial pressure × pipe face area / machine total effective cylinder area, with the MEASURED drag pressure ADDED -- drag must be measured before every joint because it changes with the setup and the pipe hanging off the machine. The interfacial pressure (commonly 75 psi in ASTM F2620 practice), the heat soak time, the cool time and the heater temperature all come from the pipe manufacturer's qualified procedure and are ENTERED or referred to, not supplied here; heat soak and cool are governed by wall thickness. It does not qualify a machine or operator, evaluate a bead, address end preparation or alignment, or cover electrofusion or socket fusion. ASTM F2620 or the manufacturer's procedure and the operator's qualification govern.",
  example: hdpeFusionPressureTimeExample.inputs,
  fields: [
    { key: "pipe_od_in", label: "Pipe outside diameter (in)", kind: "number", attrs: { step: "any" } },
    { key: "dimension_ratio", label: "Dimension ratio DR (0 to enter wall instead)", kind: "number", attrs: { step: "any" } },
    { key: "wall_thickness_in", label: "Wall thickness (in, if no DR)", kind: "number", attrs: { step: "any" } },
    { key: "cylinder_area_in2", label: "Machine total effective cylinder area (in²)", kind: "number", attrs: { step: "any" } },
    { key: "interfacial_pressure_psi", label: "Specified interfacial pressure (psi)", kind: "number", default: 75, attrs: { step: "any" } },
    { key: "drag_pressure_psi", label: "Measured drag pressure (psi)", kind: "number", attrs: { step: "any" } },
    { key: "alt_pipe_od_in", label: "Alternative pipe size (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "p", id: "hfp-out-p", label: "Pipe face", value: (r) => r.pipe_verdict },
    { key: "g", id: "hfp-out-g", label: "Theoretical gauge", value: (r) => r.gauge_verdict },
    { key: "d", id: "hfp-out-d", label: "With drag", value: (r) => r.drag_verdict },
    { key: "a", id: "hfp-out-a", label: "At another size", value: (r) => r.alt_verdict },
    { key: "t", id: "hfp-out-t", label: "Heat soak and cool", value: (r) => r.time_verdict },
    { key: "n", id: "hfp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHdpeFusionPressureTime,
});

// =====================================================================
// spec-v1712: thermoplastic pipe pressure derating vs temperature.
// Group B (Plumbing and Gas), not G -- read the group off the spec header.
// =====================================================================
// dims: in { rated_pressure_psi: M L^-1 T^-2, operating_temp_f: T, derating_factor: dimensionless, operating_pressure_psi: M L^-1 T^-2, max_rated_temp_f: T, alt_derating_factor: dimensionless } out: { derated_pressure_psi: M L^-1 T^-2, margin_psi: M L^-1 T^-2, utilization_pct: dimensionless, factor_at_operating: dimensionless, alt_derated_psi: M L^-1 T^-2 }
export function computeThermoplasticTemperatureDerate({
  rated_pressure_psi = 0, operating_temp_f = 73, derating_factor = 0,
  operating_pressure_psi = 0, max_rated_temp_f = 0, alt_derating_factor = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_pressure_psi > 0)) return { error: "The pressure rating at 73 degF must be positive (psi)." };
  if (!(derating_factor > 0) || derating_factor > 1) return { error: "The derating factor must be above 0 and no more than 1." };
  if (operating_pressure_psi < 0) return { error: "Operating pressure cannot be negative." };
  if (max_rated_temp_f < 0 || alt_derating_factor < 0 || alt_derating_factor > 1) return { error: "The maximum rated temperature cannot be negative and the alternative factor must be between 0 and 1." };
  const derated_pressure_psi = rated_pressure_psi * derating_factor;
  const factor_at_operating = derating_factor;
  const derate_verdict = "at " + fmt(operating_temp_f, 0) + " degF the " + fmt(rated_pressure_psi, 0) + " psi rating derates to " + fmt(derated_pressure_psi, 0) + " psi -- a factor of " + fmt(derating_factor, 2) + ", so the pipe holds " + fmt((1 - derating_factor) * 100, 0) + "% less than its printed rating";
  // The temperature limit is a HARD one and is not a derating question.
  const over_temp = max_rated_temp_f > 0 && operating_temp_f > max_rated_temp_f;
  const temp_limit_verdict = max_rated_temp_f <= 0
    ? "(no maximum rated temperature entered -- and above its limit a material is NOT RATED at any pressure, which is a different thing from a small derating factor)"
    : over_temp
      ? "AND " + fmt(operating_temp_f, 0) + " degF is ABOVE this material's " + fmt(max_rated_temp_f, 0) + " degF limit: it is NOT RATED here at any pressure. That is a hard stop rather than a derating, and no factor applies past it"
      : fmt(operating_temp_f, 0) + " degF is within this material's " + fmt(max_rated_temp_f, 0) + " degF limit";
  const has_operating = operating_pressure_psi > 0;
  const margin_psi = has_operating ? derated_pressure_psi - operating_pressure_psi : 0;
  const utilization_pct = has_operating ? operating_pressure_psi / derated_pressure_psi * 100 : 0;
  const passes = has_operating && margin_psi >= 0 && !over_temp;
  const operating_verdict = !has_operating
    ? "(no operating pressure entered)"
    : over_temp
      ? "the system runs " + fmt(operating_pressure_psi, 0) + " psi on a pipe that is not rated at this temperature at all"
      : passes
        ? "the system runs " + fmt(operating_pressure_psi, 0) + " psi, " + fmt(utilization_pct, 0) + "% of the derated rating, with " + fmt(margin_psi, 0) + " psi of margin"
        : "the system runs " + fmt(operating_pressure_psi, 0) + " psi against a " + fmt(derated_pressure_psi, 0) + " psi allowable -- " + fmt(-margin_psi, 0) + " psi OVER, and " + fmt(utilization_pct, 0) + "% of the rating. It will not fail today. Plastic pipe ratings are long-term hydrostatic strength figures, so it fails in a year or two and the failure gets blamed on the pipe";
  // The inversion: what pressure this line may carry at this temperature.
  const allowable_verdict = "the allowable at this temperature is " + fmt(derated_pressure_psi, 0) + " psi. Design to that figure, not to the number printed on the pipe, because the printed rating is stated at 73 degF and sustained temperature is exactly what the derating addresses";
  const has_alt = alt_derating_factor > 0;
  const alt_derated_psi = has_alt ? rated_pressure_psi * alt_derating_factor : 0;
  const alt_verdict = !has_alt
    ? "(no alternative material factor entered)"
    : "the same line in a material whose factor is " + fmt(alt_derating_factor, 2) + " at this temperature holds " + fmt(alt_derated_psi, 0) + " psi, " + fmt(alt_derated_psi / derated_pressure_psi, 2) + " times as much. That difference is the entire reason CPVC exists and why hot water distribution is not done in PVC -- and the derating curve is NOT one curve for all plastics, so a factor must come from the material's own table";
  const prohibited_verdict = "two things derating does not address at all, and both are found on jobs where someone reasoned from the pressure rating alone: COMPRESSED AIR in PVC is prohibited, because a brittle failure with stored gas energy is an explosion rather than a leak; and OUTDOOR EXPOSURE degrades PVC by ultraviolet, which is a separate problem the pressure tables do not cover. Neither is solved by derating";
  if (![derated_pressure_psi, margin_psi, utilization_pct, factor_at_operating, alt_derated_psi].every(Number.isFinite)) return { error: "Derating math is not a finite value." };
  return {
    derated_pressure_psi, factor_at_operating, derate_verdict, over_temp, temp_limit_verdict,
    has_operating, margin_psi, utilization_pct, passes, operating_verdict, allowable_verdict,
    has_alt, alt_derated_psi, alt_verdict, prohibited_verdict,
    note: "What a thermoplastic pipe may actually carry at its operating temperature. It is the printed rating times a factor from the material's own table. The multiplication is trivial, and the reason it earns its place is that the printed rating is stated at 73 degF and almost nothing runs there -- a line rated 200 psi can be an 80 psi line at 120 degF, and a system designed to the number on the pipe is over its allowable from the day it is commissioned. THE FAILURE IS DELAYED, WHICH IS WHY IT IS MISATTRIBUTED. Plastic pipe ratings are based on long-term hydrostatic strength: sustained pressure and temperature together determine how long the pipe lasts, not whether it bursts today. A line run above its derated allowable does not fail on commissioning; it fails in a year or two, and the failure is blamed on the pipe or on a fitting rather than on the design. That delay is the entire reason the derating discipline exists. The factor is not one curve for all plastics and cannot be generalised. PVC falls sharply with temperature and is not rated above 140 degF at all. CPVC holds far more of its rating and is rated to 200 degF, which is the whole reason it exists and why hot water distribution is not done in PVC. PE and PEX have their own derating and their own long-term behaviour. So the factor is entered from the material's own published table rather than reproduced here, because a generic curve would be wrong for most of the materials it was applied to. The temperature LIMIT is a different kind of number from the factor. Above it a material is not rated at any pressure, and that is a hard stop rather than a steep derating -- a distinction worth keeping, because a small factor and no rating look similar in a table and are not similar in a system. And two things are not derating questions at all: compressed air in PVC is prohibited, because a brittle failure with stored gas energy is an explosion rather than a leak, and outdoor ultraviolet exposure degrades PVC in a way the pressure tables do not cover. Both are found on jobs where someone reasoned from the pressure rating alone. This applies an entered factor to an entered rating. It does not supply the factor or the temperature limit, distinguish continuous from intermittent service, address surge or water hammer (which plastic pipe handles differently from metal and which the derating does not cover), account for chemical compatibility, evaluate joints, fittings, or support spacing (which also derate with temperature), or determine what any code permits. The pipe manufacturer's published derating table for the specific material and the plumbing or mechanical code in force govern.",
  };
}
export const thermoplasticTemperatureDerateExample = { inputs: { rated_pressure_psi: 200, operating_temp_f: 120, derating_factor: 0.40, operating_pressure_psi: 100, max_rated_temp_f: 140, alt_derating_factor: 0.82 } };
PROCESS_RENDERERS["thermoplastic-temperature-derate"] = _simpleRenderer({
  citation: "Citation: allowable = pressure rating at 73 °F × the temperature derating factor, with the factor and the material's maximum rated temperature ENTERED from the pipe manufacturer's own published table -- it is NOT one curve for all plastics (PVC falls sharply and is not rated above 140 °F; CPVC holds far more and is rated to 200 °F; PE and PEX differ again). Ratings are long-term hydrostatic strength, so exceeding the allowable fails in a year or two rather than today. It does not supply the factor or the limit, distinguish continuous from intermittent service, address surge, chemical compatibility, joints or support spacing, or determine what any code permits. The manufacturer's table and the code in force govern.",
  example: thermoplasticTemperatureDerateExample.inputs,
  fields: [
    { key: "rated_pressure_psi", label: "Pressure rating at 73 °F (psi)", kind: "number", attrs: { step: "any" } },
    { key: "operating_temp_f", label: "Operating temperature (°F)", kind: "number", default: 73, attrs: { step: "any" } },
    { key: "derating_factor", label: "Derating factor from the material table", kind: "number", attrs: { step: "any" } },
    { key: "operating_pressure_psi", label: "Operating pressure (psi, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "max_rated_temp_f", label: "Material maximum rated temperature (°F, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_derating_factor", label: "Alternative material factor at this temperature (0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "d", id: "ttd-out-d", label: "Derated rating", value: (r) => r.derate_verdict },
    { key: "t", id: "ttd-out-t", label: "Against the temperature limit", value: (r) => r.temp_limit_verdict },
    { key: "o", id: "ttd-out-o", label: "Against the operating pressure", value: (r) => r.operating_verdict },
    { key: "a", id: "ttd-out-a", label: "In another material", value: (r) => r.alt_verdict },
    { key: "p", id: "ttd-out-p", label: "What derating does not cover", value: (r) => r.prohibited_verdict },
    { key: "n", id: "ttd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeThermoplasticTemperatureDerate,
});

// =====================================================================
// spec-v1713: casting pour weight, gating yield, and the melt energy it costs.
// =====================================================================
// dims: in { casting_weight_lb: M, gating_weight_lb: M, castings_per_mould: dimensionless, melt_energy_btu_lb: L^2 T^-2, target_yield_pct: dimensionless, annual_castings: dimensionless } out: { poured_weight_lb: M, yield_pct: dimensionless, btu_per_saleable_lb: L^2 T^-2, target_poured_lb: M, target_btu_per_lb: L^2 T^-2, annual_btu_saved: L^2 M T^-2 }
export function computeCastingPourYield({
  casting_weight_lb = 0, gating_weight_lb = 0, castings_per_mould = 1,
  melt_energy_btu_lb = 0, target_yield_pct = 0, annual_castings = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(casting_weight_lb > 0)) return { error: "Casting weight must be positive (lb)." };
  if (gating_weight_lb < 0) return { error: "Gating and riser weight cannot be negative." };
  if (!(castings_per_mould > 0)) return { error: "Castings per mould must be positive." };
  if (melt_energy_btu_lb < 0 || annual_castings < 0) return { error: "Melt energy and annual volume cannot be negative." };
  if (target_yield_pct < 0 || target_yield_pct >= 100) return { error: "The target yield must be at least 0 and below 100 percent." };
  const saleable_lb = casting_weight_lb * castings_per_mould;
  const poured_weight_lb = saleable_lb + gating_weight_lb;
  const yield_pct = saleable_lb / poured_weight_lb * 100;
  const yield_verdict = "pouring " + fmt(poured_weight_lb, 0) + " lb gives " + fmt(saleable_lb, 0) + " lb of casting across " + fmt(castings_per_mould, 0) + " per mould -- a yield of " + fmt(yield_pct, 1) + "%, with " + fmt(gating_weight_lb, 0) + " lb in the gating and risers";
  const has_energy = melt_energy_btu_lb > 0;
  const poured_btu = has_energy ? poured_weight_lb * melt_energy_btu_lb : 0;
  const btu_per_saleable_lb = has_energy ? poured_btu / saleable_lb : 0;
  const energy_penalty_pct = has_energy ? (btu_per_saleable_lb / melt_energy_btu_lb - 1) * 100 : 0;
  const energy_verdict = !has_energy
    ? "(no melt energy entered -- and the energy is where the yield actually costs money)"
    : "at " + fmt(melt_energy_btu_lb, 0) + " BTU/lb to melt and superheat, each mould takes " + fmt(poured_btu / 1000, 0) + " kBTU, which is " + fmt(btu_per_saleable_lb, 0) + " BTU per SALEABLE pound -- " + fmt(energy_penalty_pct, 0) + "% more than the theoretical, paid on every casting forever. The metal itself is not lost: gating and risers are remelted. It is the ENERGY that is spent again each cycle";
  const has_target = target_yield_pct > 0 && has_energy;
  const target_poured_lb = has_target ? saleable_lb / (target_yield_pct / 100) : 0;
  const target_btu_per_lb = has_target ? target_poured_lb * melt_energy_btu_lb / saleable_lb : 0;
  const saving_btu_per_lb = has_target ? btu_per_saleable_lb - target_btu_per_lb : 0;
  const target_verdict = !has_target
    ? "(no target yield and melt energy entered)"
    : "raising the yield to " + fmt(target_yield_pct, 0) + "% means pouring " + fmt(target_poured_lb, 0) + " lb instead of " + fmt(poured_weight_lb, 0) + ", and takes the melt energy to " + fmt(target_btu_per_lb, 0) + " BTU per saleable pound -- a saving of " + fmt(saving_btu_per_lb, 0) + " BTU/lb";
  const has_annual = annual_castings > 0 && has_target;
  const annual_btu_saved = has_annual ? saving_btu_per_lb * saleable_lb * annual_castings / castings_per_mould : 0;
  const annual_verdict = !has_annual
    ? "(no annual volume and target yield entered)"
    : "across " + fmt(annual_castings, 0) + " castings a year that is " + fmt(annual_btu_saved / 1e6, 1) + " MMBTU -- real money on a production casting";
  const caution_verdict = "AND THE REASON IT IS NOT SIMPLY DONE. Those risers feed solidification shrinkage. Cut them too far and the casting has shrinkage porosity, which is scrap -- and one scrap casting costs more than the energy saved on many sound ones. Riser sizing is a FEEDING calculation, not a yield target, and yield is the outcome rather than the input. The lever that resolves the tension is an insulating sleeve, which raises the effective modulus so the same feeding is achieved with a smaller riser";
  if (![poured_weight_lb, yield_pct, btu_per_saleable_lb, target_poured_lb, target_btu_per_lb, annual_btu_saved].every(Number.isFinite)) return { error: "Pour yield math is not a finite value." };
  return {
    saleable_lb, poured_weight_lb, yield_pct, yield_verdict,
    has_energy, poured_btu, btu_per_saleable_lb, energy_penalty_pct, energy_verdict,
    has_target, target_poured_lb, target_btu_per_lb, saving_btu_per_lb, target_verdict,
    has_annual, annual_btu_saved, annual_verdict, caution_verdict,
    note: "How much metal a mould takes against how much of it ships, and what the difference costs to melt. Yield is the casting weight over the poured weight, and 60 to 70 percent is normal for sand casting -- which means a third or more of everything melted is gating and risers. The metal in them is not lost, because they are cut off and remelted, so the yield is not a materials loss. It is an ENERGY loss, and that is the part that is paid again on every cycle: a 62 percent yield turns 500 BTU per pound of melting into about 800 BTU per pound of saleable casting, and that penalty is permanent for the life of the pattern. THE TENSION THIS SITS IN IS REAL AND IT DOES NOT RESOLVE BY PUSHING THE YIELD UP. The risers that lower the yield are the risers that feed solidification shrinkage, and cutting them to hit a yield target puts shrinkage porosity in the casting. One scrap casting costs more than the energy saved on many sound ones, and porosity is often found late -- after machining, sometimes after assembly. So riser sizing is a feeding calculation done on the casting's own geometry, and yield is the OUTCOME of that calculation rather than an input to it. Reading it the other way round is the error this makes visible. The lever that genuinely moves both at once is an insulating or exothermic sleeve. It raises the riser's effective modulus so the same feeding is achieved from a smaller riser, which raises the yield without giving up soundness -- and that is the move that resolves the tension rather than trading one side against the other. Improving the gating design and pouring more castings per mould do the same thing from different directions. This is a weight and energy ratio on entered figures. It does not size risers or gating, evaluate whether a casting will be sound, model solidification, account for melting loss, slag, or dross (which are real material losses on top of the yield), include the energy in remelting the returns as a separate line, or address sand, moulding, or finishing costs -- which on many castings exceed the melt energy. The foundry's own melt records, a solidification analysis, and the methods engineer govern.",
  };
}
export const castingPourYieldExample = { inputs: { casting_weight_lb: 280, gating_weight_lb: 170, castings_per_mould: 1, melt_energy_btu_lb: 500, target_yield_pct: 70, annual_castings: 5000 } };
PROCESS_RENDERERS["casting-pour-yield"] = _simpleRenderer({
  citation: "Citation: yield = casting weight / poured weight, and melt energy per saleable pound = poured weight × melt energy per pound / casting weight. The metal in gating and risers is remelted and is not a materials loss -- the loss is the ENERGY, paid again every cycle. Melt energy is ENTERED. Risers exist to feed solidification shrinkage, so riser sizing is a feeding calculation and yield is its outcome, not a target to design to. It does not size risers or gating, evaluate soundness, model solidification, or account for melting loss, slag or dross. The foundry's melt records, a solidification analysis and the methods engineer govern.",
  example: castingPourYieldExample.inputs,
  fields: [
    { key: "casting_weight_lb", label: "Casting weight (lb)", kind: "number", attrs: { step: "any" } },
    { key: "gating_weight_lb", label: "Gating and riser weight (lb)", kind: "number", attrs: { step: "any" } },
    { key: "castings_per_mould", label: "Castings per mould", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "melt_energy_btu_lb", label: "Melt and superheat energy (BTU/lb, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "target_yield_pct", label: "Target yield (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "annual_castings", label: "Annual castings (0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "y", id: "cpy-out-y", label: "Yield", value: (r) => r.yield_verdict },
    { key: "e", id: "cpy-out-e", label: "What it costs to melt", value: (r) => r.energy_verdict },
    { key: "t", id: "cpy-out-t", label: "At the target yield", value: (r) => r.target_verdict },
    { key: "a", id: "cpy-out-a", label: "Across a year", value: (r) => r.annual_verdict },
    { key: "c", id: "cpy-out-c", label: "Why it is not simply done", value: (r) => r.caution_verdict },
    { key: "n", id: "cpy-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCastingPourYield,
});

// =====================================================================
// spec-v1714: riser modulus and the volume check that runs alongside it.
// =====================================================================
// dims: in { section_length_in: L, section_width_in: L, section_thickness_in: L, modulus_ratio: dimensionless, shrinkage_pct: dimensionless, riser_efficiency_pct: dimensionless, sleeve_factor: dimensionless } out: { section_volume_in3: L^3, section_surface_in2: L^2, casting_modulus_in: L, riser_modulus_in: L, riser_diameter_in: L, riser_volume_in3: L^3, volume_needed_in3: L^3 }
export function computeRiserModulusFeeding({
  section_length_in = 0, section_width_in = 0, section_thickness_in = 0,
  modulus_ratio = 1.2, shrinkage_pct = 0, riser_efficiency_pct = 0, sleeve_factor = 1,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(section_length_in > 0) || !(section_width_in > 0) || !(section_thickness_in > 0)) return { error: "All three section dimensions must be positive (in)." };
  if (!(modulus_ratio > 0)) return { error: "The riser-to-casting modulus ratio must be positive." };
  if (shrinkage_pct < 0 || shrinkage_pct >= 100) return { error: "Solidification shrinkage must be at least 0 and below 100 percent." };
  if (riser_efficiency_pct < 0 || riser_efficiency_pct > 100) return { error: "Riser feeding efficiency must be between 0 and 100 percent." };
  if (!(sleeve_factor > 0)) return { error: "The sleeve modulus factor must be positive (1 for a bare sand riser)." };
  const L = section_length_in, W = section_width_in, T = section_thickness_in;
  const section_volume_in3 = L * W * T;
  const section_surface_in2 = 2 * (L * W + L * T + W * T);
  const casting_modulus_in = section_volume_in3 / section_surface_in2;
  const riser_modulus_in = casting_modulus_in * modulus_ratio;
  // A cylindrical riser of height equal to its diameter has a modulus of d/6.
  const riser_diameter_in = 6 * riser_modulus_in / sleeve_factor;
  const modulus_verdict = "the section is " + fmt(section_volume_in3, 1) + " in3 over " + fmt(section_surface_in2, 1) + " in2, a modulus of " + fmt(casting_modulus_in, 4) + " in. At a " + fmt(modulus_ratio, 2) + " ratio the riser needs " + fmt(riser_modulus_in, 4) + " in of modulus, which a cylinder of height equal to its diameter reaches at " + fmt(riser_diameter_in, 2) + " in"
    + (sleeve_factor !== 1 ? " with the " + fmt(sleeve_factor, 2) + "x sleeve" : "");
  const riser_volume_in3 = Math.PI / 4 * riser_diameter_in * riser_diameter_in * riser_diameter_in;
  const has_volume_check = shrinkage_pct > 0 && riser_efficiency_pct > 0;
  const shrinkage_volume_in3 = has_volume_check ? section_volume_in3 * shrinkage_pct / 100 : 0;
  const volume_needed_in3 = has_volume_check ? shrinkage_volume_in3 / (riser_efficiency_pct / 100) : 0;
  const volume_ok = has_volume_check && riser_volume_in3 >= volume_needed_in3;
  const volume_verdict = !has_volume_check
    ? "(no shrinkage and feeding efficiency entered -- and the volume check is a SECOND condition, not a restatement of the modulus one)"
    : volume_ok
      ? "the volume check passes: the casting draws " + fmt(shrinkage_volume_in3, 1) + " in3 of shrinkage, and at " + fmt(riser_efficiency_pct, 0) + "% feeding efficiency the riser must hold " + fmt(volume_needed_in3, 1) + " in3 against the " + fmt(riser_volume_in3, 0) + " in3 it has. BOTH conditions are satisfied and this riser works"
      : "THE VOLUME CHECK FAILS: the casting draws " + fmt(shrinkage_volume_in3, 1) + " in3 and at " + fmt(riser_efficiency_pct, 0) + "% efficiency the riser must hold " + fmt(volume_needed_in3, 1) + " in3, but it has only " + fmt(riser_volume_in3, 0) + ". The riser will stay liquid and still run out of metal, leaving porosity directly UNDER it -- which looks like a feeding failure and is a volume failure";
  // The diameter that satisfies the volume condition, for comparison.
  const diameter_for_volume_in = has_volume_check ? Math.cbrt(4 * volume_needed_in3 / Math.PI) : 0;
  const governing_verdict = !has_volume_check
    ? "(no volume check to compare against)"
    : "on modulus this riser wants " + fmt(riser_diameter_in, 2) + " in and on volume " + fmt(diameter_for_volume_in, 2) + " in, so " + (riser_diameter_in >= diameter_for_volume_in ? "the MODULUS condition governs" : "the VOLUME condition governs") + " -- and a riser sized on one condition alone is sized on whichever happened to be the easier of the two";
  const sleeve_verdict = "an insulating or exothermic sleeve raises the effective modulus, so the same feeding is achieved from a smaller riser -- which raises the casting yield without giving up soundness. That is the lever that resolves the yield-versus-quality tension rather than trading one against the other";
  if (![section_volume_in3, section_surface_in2, casting_modulus_in, riser_modulus_in, riser_diameter_in, riser_volume_in3, volume_needed_in3].every(Number.isFinite)) return { error: "Riser modulus math is not a finite value." };
  return {
    section_volume_in3, section_surface_in2, casting_modulus_in, riser_modulus_in,
    riser_diameter_in, riser_volume_in3, modulus_verdict,
    has_volume_check, shrinkage_volume_in3, volume_needed_in3, volume_ok, volume_verdict,
    diameter_for_volume_in, governing_verdict, sleeve_verdict,
    note: "Whether a riser will feed a casting section, which is TWO conditions and not one. The first is modulus -- volume over cooling surface area, a length that stands in for solidification time. A riser must solidify AFTER the section it feeds, so its modulus must exceed the casting's by a ratio commonly around 1.2, and a cylindrical riser of height equal to its diameter reaches a modulus of about a sixth of that diameter. The second is VOLUME: the riser must actually contain enough liquid metal to make up the solidification shrinkage, which for many alloys is a few percent of the casting volume, and a riser only delivers a fraction of its own contents before its feeding path closes. A riser that satisfies the modulus condition and fails the volume one stays liquid and still runs out of metal, and the porosity appears directly under the riser. That defect looks like a feeding failure and is a volume failure, and the two are corrected differently -- which is why both are reported here and why sizing on one condition alone means sizing on whichever happened to be the easier. Modulus is a shape argument rather than a size argument, and that is what makes it useful. A thin plate and a thick bar of the same volume have quite different moduli, so the section that needs feeding is not always the heaviest one, and a riser placed on the heaviest section can leave a thinner one unfed. The insulating or exothermic sleeve is the lever worth knowing. It raises the riser's effective modulus without raising its size, so the same feeding is achieved from a smaller riser -- which lifts the casting yield without giving up soundness, and is the move that resolves the yield-versus-quality tension rather than trading one side against the other. This computes a modulus for a rectangular section and a cylindrical riser at an entered ratio. It does not identify which sections need feeding or how many risers a casting takes, compute feeding DISTANCE (how far along a section a riser reaches, which is a separate limit and a common cause of porosity midway between risers), model directional solidification, chills, or padding, select a sleeve or supply its factor, size the gating, or account for the riser neck, which is where feeding is most often lost. A solidification simulation, the alloy's own shrinkage data, and the methods engineer govern.",
  };
}
export const riserModulusFeedingExample = { inputs: { section_length_in: 8, section_width_in: 6, section_thickness_in: 1.5, modulus_ratio: 1.2, shrinkage_pct: 4, riser_efficiency_pct: 15, sleeve_factor: 1 } };
PROCESS_RENDERERS["riser-modulus-feeding"] = _simpleRenderer({
  citation: "Citation: casting modulus = volume / cooling surface area; the riser must exceed it by a ratio commonly around 1.2, and a cylindrical riser of height equal to its diameter has a modulus of about d/6. The VOLUME condition runs alongside it: riser volume ≥ (casting volume × solidification shrinkage) / feeding efficiency. Both are checked, because a riser satisfying modulus and failing volume stays liquid and still runs out of metal. The ratio, shrinkage, feeding efficiency and any sleeve factor are ENTERED. It does not identify which sections need feeding, compute feeding DISTANCE, model directional solidification, chills or padding, or size the riser neck. A solidification simulation and the methods engineer govern.",
  example: riserModulusFeedingExample.inputs,
  fields: [
    { key: "section_length_in", label: "Section length (in)", kind: "number", attrs: { step: "any" } },
    { key: "section_width_in", label: "Section width (in)", kind: "number", attrs: { step: "any" } },
    { key: "section_thickness_in", label: "Section thickness (in)", kind: "number", attrs: { step: "any" } },
    { key: "modulus_ratio", label: "Riser-to-casting modulus ratio", kind: "number", default: 1.2, attrs: { step: "any" } },
    { key: "shrinkage_pct", label: "Solidification shrinkage (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "riser_efficiency_pct", label: "Riser feeding efficiency (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "sleeve_factor", label: "Sleeve modulus factor (1 for bare sand)", kind: "number", default: 1, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "m", id: "rmf-out-m", label: "On modulus", value: (r) => r.modulus_verdict },
    { key: "v", id: "rmf-out-v", label: "On volume", value: (r) => r.volume_verdict },
    { key: "g", id: "rmf-out-g", label: "Which condition governs", value: (r) => r.governing_verdict },
    { key: "s", id: "rmf-out-s", label: "The sleeve lever", value: (r) => r.sleeve_verdict },
    { key: "n", id: "rmf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRiserModulusFeeding,
});

// =====================================================================
// spec-v1715: moulding sand permeability, gas evolution, and vent area.
// =====================================================================
//
// THIS SPEC SUPPLIED NO ARITHMETIC AT ALL. It names five outputs -- a gas
// evolution estimate, vent area against a requirement, permeability against a
// range -- and its worked example is prose from end to end, with no formula
// and no number anywhere in it. Rather than invent the relations it declined
// to state, this computes only what can be defended from first principles:
// the STEAM volume green sand moisture flashes to (a mass of water through
// the ideal gas law at the pouring temperature) and the BINDER gas volume
// (binder mass times an evolution rate in cm3/g, which is how binder
// suppliers publish it and is therefore entered). Everything qualitative in
// the spec -- the finish-versus-permeability trade, core venting, the muller
// -- is carried in the note, where a claim without arithmetic belongs.
// =====================================================================
const _SAND_GAS_R_IN3_PSI_LBMOL_R = 10.7316 * 1728; // 10.7316 ft^3 psi / (lbmol degR)
const _SAND_WATER_LB_PER_LBMOL = 18.0153;
const _SAND_CM3_PER_IN3 = 16.387064;
const _SAND_RANKINE_OFFSET = 459.67;
// dims: in { mould_sand_lb: M, moisture_pct: dimensionless, binder_lb: M, binder_gas_cm3_g: L^3 M^-1, pour_temp_f: T, vent_area_in2: L^2, permeability_number: dimensionless, fineness_change_pct: dimensionless } out: { water_lb: M, steam_volume_in3: L^3, binder_gas_in3: L^3, total_gas_in3: L^3, gas_per_vent_in2: L^2, new_permeability_number: dimensionless }
export function computeSandPermeabilityVent({
  mould_sand_lb = 0, moisture_pct = 0, binder_lb = 0, binder_gas_cm3_g = 0,
  pour_temp_f = 2600, vent_area_in2 = 0, permeability_number = 0, fineness_change_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(mould_sand_lb > 0)) return { error: "Mould sand weight must be positive (lb)." };
  if (moisture_pct < 0 || moisture_pct >= 100) return { error: "Moisture must be at least 0 and below 100 percent." };
  if (binder_lb < 0 || binder_gas_cm3_g < 0) return { error: "Binder weight and gas evolution rate cannot be negative." };
  if (!(pour_temp_f > -_SAND_RANKINE_OFFSET)) return { error: "Pouring temperature must be above absolute zero." };
  if (vent_area_in2 < 0 || permeability_number < 0) return { error: "Vent area and permeability number cannot be negative." };
  const pour_temp_r = pour_temp_f + _SAND_RANKINE_OFFSET;
  // Steam: the water in the sand, flashed at the pouring temperature and 1 atm.
  const water_lb = mould_sand_lb * moisture_pct / 100;
  const steam_volume_in3 = water_lb / _SAND_WATER_LB_PER_LBMOL * _SAND_GAS_R_IN3_PSI_LBMOL_R * pour_temp_r / 14.696;
  const water_liquid_in3 = water_lb / 0.0361; // 0.0361 lb/in^3 for water
  const expansion_ratio = water_liquid_in3 > 0 ? steam_volume_in3 / water_liquid_in3 : 0;
  const steam_verdict = moisture_pct <= 0
    ? "(no moisture entered -- a chemically bonded sand has none, and its gas is all binder)"
    : fmt(water_lb, 2) + " lb of water in " + fmt(mould_sand_lb, 0) + " lb of sand at " + fmt(moisture_pct, 1) + "% flashes to about " + fmt(steam_volume_in3 / 1728, 1) + " cu ft of steam at " + fmt(pour_temp_f, 0) + " degF -- an expansion of roughly " + fmt(expansion_ratio, 0) + " times the liquid volume, which is why over-tempered sand is a gas problem no venting fixes and why the control is at the MULLER rather than at the mould";
  const binder_gas_in3 = binder_lb * 453.59237 * binder_gas_cm3_g / _SAND_CM3_PER_IN3;
  const binder_verdict = !(binder_lb > 0 && binder_gas_cm3_g > 0)
    ? "(no binder weight and gas evolution rate entered -- suppliers publish the rate in cm3 per gram, and it is entered because it differs by binder system and by the metal poured against it)"
    : fmt(binder_lb, 2) + " lb of binder at " + fmt(binder_gas_cm3_g, 1) + " cm3/g evolves about " + fmt(binder_gas_in3 / 1728, 1) + " cu ft of gas as the metal arrives";
  const total_gas_in3 = steam_volume_in3 + binder_gas_in3;
  const has_vent = vent_area_in2 > 0;
  const gas_per_vent_in2 = has_vent ? total_gas_in3 / vent_area_in2 : 0;
  const total_verdict = "the mould generates roughly " + fmt(total_gas_in3 / 1728, 1) + " cu ft of gas in total"
    + (has_vent
      ? ", against " + fmt(vent_area_in2, 2) + " in2 of vent -- " + fmt(gas_per_vent_in2, 0) + " in3 of gas per in2 of vent. That ratio is a COMPARATIVE figure for ranking one mould against another that ran sound, not an acceptance criterion: the rate the gas arrives and the path it must take matter more than the total, and neither is computed here"
      : ". (No vent area entered.) The air displaced from the cavity is the smallest term of the three and the one people think of first");
  const has_perm = permeability_number > 0;
  // Permeability scales roughly with the square of grain size, so a change in
  // fineness moves it in the opposite direction and by about twice as much.
  const new_permeability_number = has_perm && fineness_change_pct !== 0
    ? permeability_number * Math.pow(1 + fineness_change_pct / 100, -2)
    : (has_perm ? permeability_number : 0);
  const fineness_verdict = !has_perm
    ? "(no AFS permeability number entered)"
    : fineness_change_pct === 0
      ? "the sand is AFS permeability " + fmt(permeability_number, 0) + ". Enter a fineness change to see the trade the foundry actually makes"
      : "moving the grain fineness " + fmt(Math.abs(fineness_change_pct), 0) + "% " + (fineness_change_pct > 0 ? "FINER" : "COARSER") + " takes the permeability from about " + fmt(permeability_number, 0) + " to " + fmt(new_permeability_number, 0) + ", since permeability goes roughly with the SQUARE of grain size. " + (fineness_change_pct > 0 ? "Finer sand gives a better casting surface and passes gas worse" : "Coarser sand vents better and leaves a rougher surface") + " -- and neither is right in general, which is why a foundry runs more than one sand system and why the customer's surface requirement is what decides whether a sand change is an acceptable answer to a gas defect";
  const core_verdict = "THE CORE IS USUALLY THE PROBLEM AND IT IS NOT IN THE ARITHMETIC ABOVE. A core is surrounded by metal on nearly every side; its binder decomposes the moment metal arrives, and the only escape is through the core's own permeability to its prints and out of the mould. A core with no vent passages, or with prints that seal against the mould, sends that gas into the metal -- and the blowholes appear on the cored surface, where the casting is hardest to inspect. Venting a core is a DESIGN item decided before the pattern is made, not something added after a casting gasses";
  if (![water_lb, steam_volume_in3, binder_gas_in3, total_gas_in3, gas_per_vent_in2, new_permeability_number].every(Number.isFinite)) return { error: "Sand gas math is not a finite value." };
  return {
    water_lb, steam_volume_in3, water_liquid_in3, expansion_ratio, steam_verdict,
    binder_gas_in3, binder_verdict, total_gas_in3, has_vent, gas_per_vent_in2, total_verdict,
    has_perm, new_permeability_number, fineness_verdict, core_verdict,
    note: "How much gas a mould makes when the metal arrives, and how the sand's permeability trades against the casting's surface. The two gas terms that can honestly be computed are computed: the water in green sand, flashed to steam at the pouring temperature through the ideal gas law, and the binder, which decomposes at a rate the supplier publishes in cubic centimetres per gram. The third term, air displaced from the cavity, is the smallest of the three and the one people think of first. THE STEAM TERM IS THE ONE THAT SURPRISES. Water expands by roughly seventeen hundred times on flashing at the boil and some seven thousand times at pouring temperature, so a sand a percent or two over its target moisture generates gas faster than any permeability can pass it. That is a gas problem no venting fixes and no sand change fixes: the control is at the muller, which is why green sand moisture is held tightly and why a rain-affected or over-tempered sand blows. CORES ARE THE WORST CASE AND ARE NOT IN THIS ARITHMETIC. A core is surrounded by metal on nearly every side, its binder decomposes as soon as the metal arrives, and its only escape is through its own body to its prints and out of the mould. A core that is unvented, or whose prints seal against the mould, has nowhere to send that gas except into the casting, and the blowholes appear on the cored surface where the casting is hardest to inspect. Core venting is therefore a design decision made before the pattern exists, and it is the single highest-yield thing to check when a cored casting gasses. The permeability trade is the foundry's constant tension and it does not resolve in general. Fine sand packs tightly, gives a smooth surface and passes gas poorly; coarse sand vents well and leaves a rough casting. Permeability goes roughly with the square of grain size, so a modest fineness change moves it substantially -- and a casting that blows on a fine sand may run sound on a coarser one, at a cost in finish that the customer's requirement either permits or does not. That is why a foundry runs more than one sand system. This estimates gas VOLUMES from entered weights and rates. It does not predict whether a casting will gas, which depends on the RATE gas is generated against the rate the mould passes it and on the path the gas must take, neither of which is computed here. It does not size vents or supply a required vent area, model flow through the sand, measure or predict the AFS permeability number, evaluate core print fit, address mould hardness, compaction, or ramming, or distinguish the many binder systems and their very different gas volumes and decomposition behaviours. The gas-per-vent-area figure is a comparative number for ranking a mould against one that ran sound, not an acceptance criterion. AFS test procedures, the binder supplier's gas evolution data, and the foundry's own methods engineer govern.",
  };
}
export const sandPermeabilityVentExample = { inputs: { mould_sand_lb: 800, moisture_pct: 3.5, binder_lb: 4, binder_gas_cm3_g: 15, pour_temp_f: 2600, vent_area_in2: 6, permeability_number: 120, fineness_change_pct: 20 } };
PROCESS_RENDERERS["sand-permeability-vent"] = _simpleRenderer({
  citation: "Citation: green sand steam volume from the ideal gas law (PV = nRT, R = 10.7316 ft³·psi/lbmol·°R, water 18.0153 lb/lbmol) at the entered pouring temperature and 1 atm, plus binder gas = binder mass × an evolution rate ENTERED in cm³/g as binder suppliers publish it. Permeability is scaled with the SQUARE of grain size. spec-v1715 supplied no arithmetic of its own, so only these defensible relations are computed and the rest is stated as guidance. It does not predict whether a casting will gas (which depends on the RATE against the mould's passing rate and the path the gas takes), size vents, supply a required vent area, model flow through sand, or measure the AFS permeability number. AFS test procedures, the binder supplier's data and the foundry's methods engineer govern.",
  example: sandPermeabilityVentExample.inputs,
  fields: [
    { key: "mould_sand_lb", label: "Mould sand weight (lb)", kind: "number", attrs: { step: "any" } },
    { key: "moisture_pct", label: "Green sand moisture (%, 0 for chemically bonded)", kind: "number", attrs: { step: "any" } },
    { key: "binder_lb", label: "Binder weight (lb, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "binder_gas_cm3_g", label: "Binder gas evolution (cm³/g, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "pour_temp_f", label: "Pouring temperature (°F)", kind: "number", default: 2600, attrs: { step: "any" } },
    { key: "vent_area_in2", label: "Vent area provided (in², 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "permeability_number", label: "AFS permeability number (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "fineness_change_pct", label: "Grain fineness change (%, + finer, − coarser)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "s", id: "spv-out-s", label: "Steam from moisture", value: (r) => r.steam_verdict },
    { key: "b", id: "spv-out-b", label: "Binder gas", value: (r) => r.binder_verdict },
    { key: "t", id: "spv-out-t", label: "Total against the vents", value: (r) => r.total_verdict },
    { key: "f", id: "spv-out-f", label: "The sand trade", value: (r) => r.fineness_verdict },
    { key: "c", id: "spv-out-c", label: "The core", value: (r) => r.core_verdict },
    { key: "n", id: "spv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSandPermeabilityVent,
});

// =====================================================================
// spec-v1716: melt furnace energy, efficiency, and energy per saleable pound.
// =====================================================================
const _MELT_BTU_PER_KWH = 3412.14;
// dims: in { charge_weight_lb: M, theoretical_btu_lb: L^2 T^-2, furnace_efficiency_pct: dimensionless, energy_cost_per_kwh: dimensionless, alt_efficiency_pct: dimensionless, alt_theoretical_btu_lb: L^2 T^-2, casting_yield_pct: dimensionless } out: { theoretical_mmbtu: L^2 M T^-2, input_mmbtu: L^2 M T^-2, input_kwh: L^2 M T^-2, cost_per_heat: dimensionless, btu_per_saleable_lb: L^2 T^-2, alt_input_mmbtu: L^2 M T^-2 }
export function computeMeltFurnaceEnergy({
  charge_weight_lb = 0, theoretical_btu_lb = 0, furnace_efficiency_pct = 0,
  energy_cost_per_kwh = 0, alt_efficiency_pct = 0, alt_theoretical_btu_lb = 0, casting_yield_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(charge_weight_lb > 0)) return { error: "Charge weight must be positive (lb)." };
  if (!(theoretical_btu_lb > 0)) return { error: "Theoretical melt energy must be positive (BTU/lb)." };
  if (!(furnace_efficiency_pct > 0) || furnace_efficiency_pct > 100) return { error: "Furnace efficiency must be above 0 and no more than 100 percent." };
  if (energy_cost_per_kwh < 0 || alt_theoretical_btu_lb < 0) return { error: "Energy cost and alternative melt energy cannot be negative." };
  if (alt_efficiency_pct < 0 || alt_efficiency_pct > 100) return { error: "The alternative furnace efficiency must be between 0 and 100 percent." };
  if (casting_yield_pct < 0 || casting_yield_pct > 100) return { error: "Casting yield must be between 0 and 100 percent." };
  const theoretical_btu = charge_weight_lb * theoretical_btu_lb;
  const theoretical_mmbtu = theoretical_btu / 1e6;
  const input_btu = theoretical_btu / (furnace_efficiency_pct / 100);
  const input_mmbtu = input_btu / 1e6;
  const input_kwh = input_btu / _MELT_BTU_PER_KWH;
  const energy_verdict = "melting " + fmt(charge_weight_lb, 0) + " lb at " + fmt(theoretical_btu_lb, 0) + " BTU/lb theoretical takes " + fmt(theoretical_mmbtu, 2) + " MMBTU of heat into the metal, and " + fmt(input_mmbtu, 2) + " MMBTU into the furnace at " + fmt(furnace_efficiency_pct, 0) + "% efficiency -- " + fmt(input_kwh, 0) + " kWh";
  const has_cost = energy_cost_per_kwh > 0;
  const cost_per_heat = has_cost ? input_kwh * energy_cost_per_kwh : 0;
  const cost_verdict = !has_cost
    ? "(no energy cost entered)"
    : "at " + fmt(energy_cost_per_kwh, 3) + " per kWh that is " + fmt(cost_per_heat, 0) + " a heat, or " + fmt(cost_per_heat / charge_weight_lb, 4) + " per pound charged";
  const has_alt_furnace = alt_efficiency_pct > 0;
  const alt_input_mmbtu = has_alt_furnace ? theoretical_mmbtu / (alt_efficiency_pct / 100) : 0;
  const furnace_verdict = !has_alt_furnace
    ? "(no alternative furnace efficiency entered -- and furnace type is a large multiplier)"
    : "the same charge in a furnace at " + fmt(alt_efficiency_pct, 0) + "% efficiency takes " + fmt(alt_input_mmbtu, 2) + " MMBTU, " + fmt(alt_input_mmbtu / input_mmbtu, 2) + " times the input energy for exactly the same metal. Furnace type is a multiplier on everything else here";
  const has_alt_metal = alt_theoretical_btu_lb > 0;
  const metal_verdict = !has_alt_metal
    ? "(no alternative metal entered)"
    : "a metal at " + fmt(alt_theoretical_btu_lb, 0) + " BTU/lb theoretical takes " + fmt(alt_theoretical_btu_lb / theoretical_btu_lb, 2) + " times the energy per pound. Aluminium is the case that surprises everyone outside a foundry: it takes far MORE energy per pound than iron at a melting point less than half as high, because its specific heat and its latent heat of fusion are both much higher -- melting point is not what melting costs";
  const has_yield = casting_yield_pct > 0;
  const btu_per_saleable_lb = has_yield ? input_btu / (charge_weight_lb * casting_yield_pct / 100) : 0;
  const yield_verdict = !has_yield
    ? "(no casting yield entered -- and the yield is the second multiplier)"
    : "at a " + fmt(casting_yield_pct, 0) + "% casting yield only " + fmt(charge_weight_lb * casting_yield_pct / 100, 0) + " lb of this charge becomes saleable casting, so the energy per pound SOLD is " + fmt(btu_per_saleable_lb, 0) + " BTU against " + fmt(theoretical_btu_lb, 0) + " theoretical -- " + fmt(btu_per_saleable_lb / theoretical_btu_lb, 1) + " times, once furnace efficiency and yield are BOTH counted. That number, not the theoretical one, is what the energy bill reflects";
  if (![theoretical_mmbtu, input_mmbtu, input_kwh, cost_per_heat, btu_per_saleable_lb, alt_input_mmbtu].every(Number.isFinite)) return { error: "Melt energy math is not a finite value." };
  return {
    theoretical_btu, theoretical_mmbtu, input_btu, input_mmbtu, input_kwh, energy_verdict,
    has_cost, cost_per_heat, cost_verdict,
    has_alt_furnace, alt_input_mmbtu, furnace_verdict,
    has_alt_metal, metal_verdict, has_yield, btu_per_saleable_lb, yield_verdict,
    note: "What it costs in energy to melt a charge. It is the theoretical heat the metal absorbs, divided by the furnace's efficiency -- and then divided again by the casting yield, if the question is what the energy bill reflects. Both divisions are large and they multiply, so the figure a foundry actually pays for is a considerable multiple of the theoretical one. Melting point is not what melting costs, and that is the misconception worth correcting here. Aluminium melts at less than half the temperature of cast iron and takes substantially MORE energy per pound to melt, because its specific heat and its latent heat of fusion are both much higher. Foundry people know this and everyone else finds it surprising, and it is the reason an aluminium foundry's energy per pound bears no resemblance to an iron foundry's despite the lower temperature. Furnace type is the first multiplier and it is a large one. An induction furnace and a gas-fired furnace melting the same iron differ by a factor of two or more in input energy, and the difference is paid on every heat for the life of the furnace. It is also the number most often quoted optimistically, because efficiency depends on how the furnace is run -- holding time, lid discipline, charge preparation and the size of the heat relative to the furnace -- as much as on the equipment. THE CASTING YIELD IS THE SECOND MULTIPLIER AND IT IS THE ONE LEFT OUT. Only the portion of a heat that becomes saleable casting earns anything; the gating and risers are remelted, so their energy is spent again on the next heat. Counting the yield alongside the furnace efficiency is what turns a theoretical figure into the one on the bill, and it is why an energy reduction programme that ignores the methoding is working on the smaller of the two terms. This computes energy from entered figures. It does not supply the theoretical melt energy for any metal, the furnace efficiency, or the yield -- all three are entered, because they vary by alloy, by furnace, and by how the furnace is operated. It does not model holding energy (which on a furnace left up between pours can rival the melting energy), superheat above the pouring temperature as a separate term, melting loss and oxidation, the energy in sand handling, moulding, or heat treatment, or demand charges and time-of-use tariffs, which on an induction melt shop are frequently the larger part of the electricity bill. The foundry's own melt records and metering, and the furnace manufacturer's data, govern.",
  };
}
export const meltFurnaceEnergyExample = { inputs: { charge_weight_lb: 2000, theoretical_btu_lb: 190, furnace_efficiency_pct: 70, energy_cost_per_kwh: 0.10, alt_efficiency_pct: 30, alt_theoretical_btu_lb: 500, casting_yield_pct: 62 } };
PROCESS_RENDERERS["melt-furnace-energy"] = _simpleRenderer({
  citation: "Citation: input energy = charge weight × theoretical melt energy / furnace efficiency, converted at 3,412.14 BTU per kWh, and energy per saleable pound divides again by the casting yield. The theoretical melt energy, the furnace efficiency and the yield are all ENTERED because they vary by alloy, by furnace and by how the furnace is run. It does not model holding energy (which on a furnace left up between pours can rival the melting energy), superheat as a separate term, melting loss and oxidation, sand handling or heat treatment, or demand charges and time-of-use tariffs, which on an induction melt shop are often the larger part of the bill. The foundry's own metering and the furnace manufacturer's data govern.",
  example: meltFurnaceEnergyExample.inputs,
  fields: [
    { key: "charge_weight_lb", label: "Charge weight (lb)", kind: "number", attrs: { step: "any" } },
    { key: "theoretical_btu_lb", label: "Theoretical melt energy (BTU/lb)", kind: "number", attrs: { step: "any" } },
    { key: "furnace_efficiency_pct", label: "Furnace efficiency (%)", kind: "number", attrs: { step: "any" } },
    { key: "energy_cost_per_kwh", label: "Energy cost per kWh (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_efficiency_pct", label: "Alternative furnace efficiency (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_theoretical_btu_lb", label: "Alternative metal melt energy (BTU/lb, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "casting_yield_pct", label: "Casting yield (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "e", id: "mfe-out-e", label: "Energy per heat", value: (r) => r.energy_verdict },
    { key: "c", id: "mfe-out-c", label: "Cost", value: (r) => r.cost_verdict },
    { key: "f", id: "mfe-out-f", label: "Furnace type", value: (r) => r.furnace_verdict },
    { key: "m", id: "mfe-out-m", label: "Another metal", value: (r) => r.metal_verdict },
    { key: "y", id: "mfe-out-y", label: "Per saleable pound", value: (r) => r.yield_verdict },
    { key: "n", id: "mfe-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMeltFurnaceEnergy,
});
