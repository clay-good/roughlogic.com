// Groups E and K: marine construction and dredging.
// spec-v1828..v1836 (scope-trade-expansion-3) cover the dredge (production and
// slurry density, critical velocity), the waterfront structure (sheet pile
// penetration, pile driving bearing, berthing fender energy, pier scour), the
// vessel (barge draft and displacement, mooring load), and the water itself
// (wind-generated wave height from fetch).
//
// One module rather than two because the tiles reference each other across the
// group split: production sets the velocity that critical velocity bounds, and
// the wave height sets the condition a moored barge has to survive.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const G_FPS2 = 32.2;                 // gravity, ft/s^2
const G_MS2 = 9.81;                  // gravity, m/s^2, as the SPM hindcast uses it
const CU_FT_PER_CU_YD = 27;
const SEC_PER_HOUR = 3600;
const LB_PER_TON = 2000;
const IN_PER_FT = 12;
// The nautical mile (1,852 m) and the foot (0.3048 m) are both exactly
// defined, so this conversion is exact by construction rather than transcribed.
const FT_PER_KNOT = 1852 / (0.3048 * 3600);
const SEA_WATER_SLUGS = 1.99;        // mass density, slugs/cu ft
const M_PER_MILE = 1609.344;
const FT_PER_M = 3.280839895013123;  // exactly 1 / 0.3048
const MS_PER_MPH = 0.44704;
const DEG = Math.PI / 180;

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const value of Object.values(o)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};

function _simpleRenderer(spec) {
  const render = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function update() {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const result = spec.compute(params);
      if (result.error) {
        for (const out of Object.values(outs)) out.textContent = "-";
        outs[spec.outputs[0].key].textContent = result.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(result);
    }
    const debounced = debounce(update, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", debounced);
    attachExampleButton(inputRegion, () => {
      for (const f of spec.fields) {
        if (spec.example[f.key] !== undefined) fields[f.key].input.value = String(spec.example[f.key]);
      }
      update();
    });
  };
  render.schema = {
    inputs: spec.fields.map((f) => ({
      key: f.key, label: f.label, kind: f.kind || "number",
      options: f.options || null, default: f.default ?? null, attrs: f.attrs ?? null,
    })),
    outputs: spec.outputs.map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation,
    scope: spec.scope ?? null,
  };
  return render;
}

export const MARINE_RENDERERS = {};

// ======== spec-v1828: cutter suction dredge production and density ========

// Production is a product of two numbers and only one of them is easy: flow is
// set by the pipe and the pump and barely moves through a shift, while
// concentration swings with what the cutter is in. The in-situ conversion runs
// opposite to a fill -- sand in the bank has voids, the same sand as particles
// in the slurry does not, so a contract paid on in-situ yards is paid on more
// volume than the pipeline carried.

// dims: in { pipe_diameter_in: L, velocity_fps: L T^-1, concentration_pct: dimensionless, porosity: dimensionless, solids_specific_gravity: dimensionless, effective_hours: T, alternative_concentration_pct: dimensionless } out: { flow_cfs: L^3 T^-1, solids_cfs: L^3 T^-1, in_situ_cfs: L^3 T^-1, production_cy_per_hr: L^3 T^-1, slurry_specific_gravity: dimensionless }
export function computeDredgeProductionRate({ pipe_diameter_in = 0, velocity_fps = 0, concentration_pct = 0, porosity = 0, solids_specific_gravity = 0, effective_hours = 0, alternative_concentration_pct = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(pipe_diameter_in > 0) || !(velocity_fps > 0)) return { error: "Pipe diameter and velocity must be positive." };
  if (!(concentration_pct > 0 && concentration_pct < 100) || !(alternative_concentration_pct > 0 && alternative_concentration_pct < 100)) {
    return { error: "Solids concentration by volume must be above 0 and below 100%." };
  }
  if (!(porosity > 0 && porosity < 1)) return { error: "In-situ porosity must be between 0 and 1." };
  if (!(solids_specific_gravity > 1)) return { error: "Solids specific gravity must exceed 1." };
  if (!(effective_hours > 0)) return { error: "Effective dredging hours must be positive." };
  const diameter_ft = pipe_diameter_in / IN_PER_FT;
  const area_ft2 = Math.PI / 4 * diameter_ft * diameter_ft;
  const flow_cfs = area_ft2 * velocity_fps;
  const productionAt = (pct) => {
    const solids_cfs = flow_cfs * pct / 100;
    const in_situ_cfs = solids_cfs / (1 - porosity);
    return {
      solids_cfs, in_situ_cfs,
      solids_cy_per_hr: solids_cfs * SEC_PER_HOUR / CU_FT_PER_CU_YD,
      production_cy_per_hr: in_situ_cfs * SEC_PER_HOUR / CU_FT_PER_CU_YD,
    };
  };
  const base = productionAt(concentration_pct);
  const alternative = productionAt(alternative_concentration_pct);
  return {
    area_ft2, flow_cfs,
    solids_cfs: base.solids_cfs, in_situ_cfs: base.in_situ_cfs,
    solids_cy_per_hr: base.solids_cy_per_hr,
    production_cy_per_hr: base.production_cy_per_hr,
    production_cy_per_day: base.production_cy_per_hr * effective_hours,
    void_share_cy_per_hr: base.production_cy_per_hr - base.solids_cy_per_hr,
    slurry_specific_gravity: 1 + (concentration_pct / 100) * (solids_specific_gravity - 1),
    alternative_slurry_specific_gravity: 1 + (alternative_concentration_pct / 100) * (solids_specific_gravity - 1),
    alternative_production_cy_per_hr: alternative.production_cy_per_hr,
    alternative_gain_cy_per_hr: alternative.production_cy_per_hr - base.production_cy_per_hr,
    alternative_gain_pct: 100 * (alternative.production_cy_per_hr - base.production_cy_per_hr) / base.production_cy_per_hr,
    note: "Production is quoted on EFFECTIVE dredging hours, not elapsed: swing, anchor moves, and pipeline changes are not dredging. The in-situ conversion is where dredging arithmetic differs from every other earthmoving calculation -- the pipeline carries only the solids, and the contract pays for the void space the material had in the bank, so the porosity assumed is worth agreeing before the job rather than after. Concentration cannot simply be pushed: carrying more solids raises the velocity at which they settle, and friction head rises as the SQUARE of velocity while production rises linearly. The operating point sits just above the settling velocity, and a line pushed past it does not gradually degrade -- it plugs.",
  };
}

const dredgeExample = { pipe_diameter_in: 24, velocity_fps: 18, concentration_pct: 15, porosity: 0.4, solids_specific_gravity: 2.65, effective_hours: 20, alternative_concentration_pct: 20 };
MARINE_RENDERERS["dredge-production-rate"] = _simpleRenderer({
  citation: "Citation: continuity and volumetric bookkeeping -- flow = pipe area x velocity, solids = flow x concentration by volume, in-situ volume = solids / (1 - porosity), and slurry specific gravity = 1 + Cv x (SG_solids - 1), which is what the discharge density gauge reads. Porosity, the pay quantity, and effective-hour accounting come from the dredging contract and the site's own material.",
  example: dredgeExample,
  fields: [
    { key: "pipe_diameter_in", label: "Discharge pipe inside diameter (in)" },
    { key: "velocity_fps", label: "Pipeline velocity (ft/s)" },
    { key: "concentration_pct", label: "Solids concentration by volume (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "porosity", label: "In-situ porosity (0 to 1)", attrs: { step: "any", min: "0", max: "1" } },
    { key: "solids_specific_gravity", label: "Solids specific gravity" },
    { key: "effective_hours", label: "Effective dredging hours per day" },
    { key: "alternative_concentration_pct", label: "Alternative concentration (%)", attrs: { step: "any", min: "0", max: "100" } },
  ],
  outputs: [
    { key: "flow_cfs", id: "dpr-flow", label: "Pipeline flow", unit: "cu ft/s", value: (r) => fmt(r.flow_cfs, 2) + " cu ft/s through " + fmt(r.area_ft2, 3) + " sq ft" },
    { key: "solids_cfs", id: "dpr-sol", label: "Solids the pipeline carries", value: (r) => fmt(r.solids_cfs, 2) + " cu ft/s -- " + fmt(r.solids_cy_per_hr, 0) + " cy/h of particles" },
    { key: "production_cy_per_hr", id: "dpr-prod", label: "In-situ production", unit: "cy/h", value: (r) => fmt(r.production_cy_per_hr, 0) + " cy/h" },
    { key: "void_share_cy_per_hr", id: "dpr-void", label: "The void space, which is paid for", value: (r) => fmt(r.void_share_cy_per_hr, 0) + " cy/h of the production was voids in the bank" },
    { key: "production_cy_per_day", id: "dpr-day", label: "Production per day", unit: "cy", value: (r) => fmt(r.production_cy_per_day, 0) + " cy over the entered effective hours" },
    { key: "slurry_specific_gravity", id: "dpr-sg", label: "Density gauge should read", value: (r) => fmt(r.slurry_specific_gravity, 3) + " specific gravity" },
    { key: "alternative_production_cy_per_hr", id: "dpr-alt", label: "At the alternative concentration", value: (r) => fmt(r.alternative_production_cy_per_hr, 0) + " cy/h, " + fmt(r.alternative_gain_cy_per_hr, 0) + " more (" + fmt(r.alternative_gain_pct, 0) + "%) at gauge " + fmt(r.alternative_slurry_specific_gravity, 3) },
    { key: "note", id: "dpr-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeDredgeProductionRate,
});

// ========= spec-v1829: slurry critical velocity (Durand) =========

// V_c = F_L sqrt(2 g D (S_s - 1)). Both terms sit inside a square root, so the
// threshold is insensitive to everything except pipe size and material -- and
// pipe diameter works the WRONG way: a larger bore raises the velocity below
// which the line plugs, because the particles have further to fall across it.

// dims: in { pipe_diameter_in: L, solids_specific_gravity: dimensionless, durand_coefficient: dimensionless, operating_velocity_fps: L T^-1, coarser_coefficient: dimensionless, coarsest_coefficient: dimensionless, upsized_diameter_in: L } out: { critical_velocity_fps: L T^-1, coarser_critical_velocity_fps: L T^-1, coarsest_critical_velocity_fps: L T^-1, upsized_critical_velocity_fps: L T^-1, relative_friction_head: dimensionless }
export function computeSlurryCriticalVelocity({ pipe_diameter_in = 0, solids_specific_gravity = 0, durand_coefficient = 0, operating_velocity_fps = 0, coarser_coefficient = 0, coarsest_coefficient = 0, upsized_diameter_in = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(pipe_diameter_in > 0) || !(upsized_diameter_in > 0)) return { error: "Pipe diameters must be positive." };
  if (!(solids_specific_gravity > 1)) return { error: "Solids specific gravity must exceed 1." };
  if (![durand_coefficient, coarser_coefficient, coarsest_coefficient].every((v) => v > 0)) return { error: "Durand coefficients must be positive." };
  if (!(operating_velocity_fps > 0)) return { error: "Operating velocity must be positive." };
  const diameter_ft = pipe_diameter_in / IN_PER_FT;
  // The whole square root; the answer is then just the coefficient times it.
  const root_term_fps = Math.sqrt(2 * G_FPS2 * diameter_ft * (solids_specific_gravity - 1));
  const upsized_root_term_fps = Math.sqrt(2 * G_FPS2 * (upsized_diameter_in / IN_PER_FT) * (solids_specific_gravity - 1));
  const critical_velocity_fps = durand_coefficient * root_term_fps;
  const coarser_critical_velocity_fps = coarser_coefficient * root_term_fps;
  const coarsest_critical_velocity_fps = coarsest_coefficient * root_term_fps;
  const marginPct = (vc) => 100 * (operating_velocity_fps - vc) / vc;
  return {
    root_term_fps, critical_velocity_fps,
    coarser_critical_velocity_fps, coarsest_critical_velocity_fps,
    upsized_critical_velocity_fps: durand_coefficient * upsized_root_term_fps,
    margin_pct: marginPct(critical_velocity_fps),
    coarser_margin_pct: marginPct(coarser_critical_velocity_fps),
    coarsest_margin_pct: marginPct(coarsest_critical_velocity_fps),
    runs: operating_velocity_fps > critical_velocity_fps,
    coarser_runs: operating_velocity_fps > coarser_critical_velocity_fps,
    coarsest_runs: operating_velocity_fps > coarsest_critical_velocity_fps,
    // Friction head rises as the square of velocity, so running fast to be safe
    // is expensive quadratically and is paid every hour for every foot of line.
    relative_friction_head: Math.pow(operating_velocity_fps / critical_velocity_fps, 2),
    excess_friction_pct: 100 * (Math.pow(operating_velocity_fps / critical_velocity_fps, 2) - 1),
    note: "The whole answer is F_L, and the material is what sets it: the coefficient peaks for medium sand and falls for very fine and very coarse material, so a cut that runs into a coarser layer raises the threshold with no warning from the dredge -- the discharge pressure rises as a bed forms, and by the time it is unmistakable the line is plugging. Pipe diameter works the wrong way: V_c goes as the square root of diameter, so an upsize that increases capacity can put the line below its own critical velocity if the pump's delivery is not raised with it. Durand's curves, the material's gradation, and the dredge's own pump curve govern.",
  };
}

const criticalVelocityExample = { pipe_diameter_in: 24, solids_specific_gravity: 2.65, durand_coefficient: 1.0, operating_velocity_fps: 18, coarser_coefficient: 1.2, coarsest_coefficient: 1.34, upsized_diameter_in: 30 };
MARINE_RENDERERS["slurry-critical-velocity"] = _simpleRenderer({
  citation: "Citation: Durand's deposition-velocity relation V_c = F_L x sqrt(2 g D (S_s - 1)), with D the pipe inside diameter in feet and F_L an empirical coefficient from Durand's curves, roughly 0.8 to 1.5 by particle size and concentration. Relative friction head is taken as the velocity ratio squared. Durand's curves, the material's gradation, and the dredge's pump curve govern.",
  example: criticalVelocityExample,
  fields: [
    { key: "pipe_diameter_in", label: "Pipe inside diameter (in)" },
    { key: "solids_specific_gravity", label: "Solids specific gravity" },
    { key: "durand_coefficient", label: "Durand coefficient F_L for the expected material" },
    { key: "operating_velocity_fps", label: "Operating velocity (ft/s)" },
    { key: "coarser_coefficient", label: "Coefficient if a coarser layer is cut" },
    { key: "coarsest_coefficient", label: "Coefficient for the coarsest layer expected" },
    { key: "upsized_diameter_in", label: "Upsized pipe considered (in)" },
  ],
  outputs: [
    { key: "critical_velocity_fps", id: "scv-vc", label: "Critical velocity", unit: "ft/s", value: (r) => fmt(r.critical_velocity_fps, 1) + " ft/s -- " + (r.runs ? "the line runs, " + fmt(r.margin_pct, 0) + "% of margin" : "BELOW the operating velocity; solids deposit") },
    { key: "root_term_fps", id: "scv-root", label: "The square-root term", value: (r) => fmt(r.root_term_fps, 2) + " ft/s -- the whole answer is then F_L times this" },
    { key: "coarser_critical_velocity_fps", id: "scv-low", label: "In a coarser layer", unit: "ft/s", value: (r) => fmt(r.coarser_critical_velocity_fps, 1) + " ft/s -- " + (r.coarser_runs ? "still runs, " + fmt(r.coarser_margin_pct, 0) + "% of margin left" : "does NOT run") },
    { key: "coarsest_critical_velocity_fps", id: "scv-high", label: "In the coarsest layer", unit: "ft/s", value: (r) => fmt(r.coarsest_critical_velocity_fps, 1) + " ft/s -- " + (r.coarsest_runs ? fmt(r.coarsest_margin_pct, 0) + "% of margin" : "does NOT run at this velocity; the solids deposit") },
    { key: "relative_friction_head", id: "scv-fric", label: "Friction head against the threshold", value: (r) => fmt(r.relative_friction_head, 2) + "x -- " + fmt(r.excess_friction_pct, 0) + "% more than running at the threshold" },
    { key: "upsized_critical_velocity_fps", id: "scv-up", label: "In the upsized pipe", unit: "ft/s", value: (r) => fmt(r.upsized_critical_velocity_fps, 1) + " ft/s -- a bigger line raises the threshold, it does not lower it" },
    { key: "note", id: "scv-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeSlurryCriticalVelocity,
});

// ======== spec-v1830: barge draft, displacement, and deck load ========

// Draft and load are one quantity seen from two sides. Tons per inch is the
// conversion and is nearly constant across the working range, which is why a
// loading foreman can use one number all day. Freeboard is not spare capacity.

// dims: in { barge_length_ft: L, beam_ft: L, depth_ft: L, block_coefficient: dimensionless, light_draft_ft: L, loaded_draft_ft: L, water_density_pcf: M L^-3, fresh_water_density_pcf: M L^-3 } out: { light_displacement_tons: M L T^-2, loaded_displacement_tons: M L T^-2, cargo_tons: M L T^-2, tons_per_inch: M T^-2, sinkage_in: L, freeboard_ft: L, fresh_water_draft_ft: L }
export function computeBargeDraftDisplacement({ barge_length_ft = 0, beam_ft = 0, depth_ft = 0, block_coefficient = 0, light_draft_ft = 0, loaded_draft_ft = 0, water_density_pcf = 0, fresh_water_density_pcf = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(barge_length_ft > 0) || !(beam_ft > 0) || !(depth_ft > 0)) return { error: "Barge length, beam, and depth must be positive." };
  if (!(block_coefficient > 0 && block_coefficient <= 1)) return { error: "Block coefficient must be above 0 and at most 1." };
  if (!(light_draft_ft > 0) || !(loaded_draft_ft > 0)) return { error: "Light and loaded drafts must be positive." };
  if (!(loaded_draft_ft > light_draft_ft)) return { error: "The loaded draft must exceed the light draft." };
  if (loaded_draft_ft > depth_ft) return { error: "The loaded draft cannot exceed the barge's depth; there would be no freeboard." };
  if (!(water_density_pcf > 0) || !(fresh_water_density_pcf > 0)) return { error: "Water densities must be positive." };
  const waterplane_ft2 = barge_length_ft * beam_ft * block_coefficient;
  const displacementAt = (draft_ft, density) => waterplane_ft2 * draft_ft * density / LB_PER_TON;
  const light_displacement_tons = displacementAt(light_draft_ft, water_density_pcf);
  const loaded_displacement_tons = displacementAt(loaded_draft_ft, water_density_pcf);
  const cargo_tons = loaded_displacement_tons - light_displacement_tons;
  const tons_per_inch = waterplane_ft2 * water_density_pcf / (IN_PER_FT * LB_PER_TON);
  // Draft in fresh water for the SAME displacement: the barge displaces the
  // same weight of a lighter fluid, so more of the hull goes under.
  const fresh_water_draft_ft = loaded_displacement_tons * LB_PER_TON / (waterplane_ft2 * fresh_water_density_pcf);
  return {
    waterplane_ft2, light_displacement_tons, loaded_displacement_tons, cargo_tons,
    tons_per_inch,
    sinkage_in: cargo_tons / tons_per_inch,
    sinkage_ft: cargo_tons / tons_per_inch / IN_PER_FT,
    draft_change_ft: loaded_draft_ft - light_draft_ft,
    freeboard_ft: depth_ft - loaded_draft_ft,
    fresh_water_draft_ft,
    fresh_water_allowance_in: (fresh_water_draft_ft - loaded_draft_ft) * IN_PER_FT,
    fresh_water_freeboard_ft: depth_ft - fresh_water_draft_ft,
    note: "Freeboard is not spare capacity and reading it that way is how barges are overloaded: it is the margin against boarding seas and the basis of the reserve buoyancy that keeps the vessel stable as it heels, and in most services a regulated minimum. The load line, not the deck edge, is the limit. A barge loaded to its marks in salt water floats DEEPER in fresh water with nothing added, and on a controlling depth that is the difference between passing and grounding. Tons per inch is treated as constant, which holds for a box-shaped hull across its working range and not for a shaped one. The barge's own capacity plan, its load line, and the stability booklet govern.",
  };
}

const bargeExample = { barge_length_ft: 195, beam_ft: 35, depth_ft: 12, block_coefficient: 0.95, light_draft_ft: 1.5, loaded_draft_ft: 8, water_density_pcf: 64, fresh_water_density_pcf: 62.4 };
MARINE_RENDERERS["barge-draft-displacement"] = _simpleRenderer({
  citation: "Citation: Archimedes -- displacement = length x beam x draft x block coefficient x water density, with 64.0 lb/cu ft sea water and 62.4 fresh; tons per inch of immersion = length x beam x Cb x density / (12 x 2,000). The barge's capacity plan, its load line, and its stability booklet govern.",
  example: bargeExample,
  fields: [
    { key: "barge_length_ft", label: "Barge length (ft)" },
    { key: "beam_ft", label: "Beam (ft)" },
    { key: "depth_ft", label: "Depth of hull (ft)" },
    { key: "block_coefficient", label: "Block coefficient Cb", attrs: { step: "any", min: "0", max: "1" } },
    { key: "light_draft_ft", label: "Light draft (ft)" },
    { key: "loaded_draft_ft", label: "Loaded draft (ft)" },
    { key: "water_density_pcf", label: "Water density in service (lb/cu ft)" },
    { key: "fresh_water_density_pcf", label: "Fresh water density (lb/cu ft)" },
  ],
  outputs: [
    { key: "light_displacement_tons", id: "bdd-light", label: "Light displacement", unit: "tons", value: (r) => fmt(r.light_displacement_tons, 0) + " tons" },
    { key: "loaded_displacement_tons", id: "bdd-load", label: "Loaded displacement", unit: "tons", value: (r) => fmt(r.loaded_displacement_tons, 0) + " tons" },
    { key: "cargo_tons", id: "bdd-cargo", label: "Cargo carried", unit: "tons", value: (r) => fmt(r.cargo_tons, 0) + " tons" },
    { key: "tons_per_inch", id: "bdd-tpi", label: "Tons per inch of immersion", value: (r) => fmt(r.tons_per_inch, 1) + " tons/in -- the loading foreman's number" },
    { key: "sinkage_in", id: "bdd-sink", label: "Sinkage the cargo produces", unit: "in", value: (r) => fmt(r.sinkage_in, 1) + " in (" + fmt(r.sinkage_ft, 2) + " ft), against " + fmt(r.draft_change_ft, 2) + " ft of draft change" },
    { key: "freeboard_ft", id: "bdd-free", label: "Freeboard at the loaded draft", unit: "ft", value: (r) => fmt(r.freeboard_ft, 2) + " ft -- reserve buoyancy, not spare capacity" },
    { key: "fresh_water_draft_ft", id: "bdd-fresh", label: "Same load in fresh water", unit: "ft", value: (r) => fmt(r.fresh_water_draft_ft, 2) + " ft -- " + fmt(r.fresh_water_allowance_in, 1) + " in deeper with nothing loaded" },
    { key: "note", id: "bdd-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeBargeDraftDisplacement,
});

// ======= spec-v1831: cantilever sheet pile wall penetration depth =======

// A cantilever wall has no anchor, so all of the retained load is carried by
// rotating against the soil below the excavation. Moments balance about the toe
// on the net-pressure simplification, and the result surprises people: a 12 ft
// wall is a 23 ft pile, with 47% of the steel below the dredge line.

// dims: in { retained_height_ft: L, friction_angle_deg: dimensionless, unit_weight_pcf: M L^-3, increase_factor_pct: dimensionless, allowable_stress_psi: M L^-1 T^-2 } out: { ka: dimensionless, kp: dimensionless, active_force_plf: M T^-2, theoretical_depth_ft: L, design_depth_ft: L, total_length_ft: L, depth_to_max_moment_ft: L, max_moment_ftlb_per_ft: M L T^-2, section_modulus_in3_per_ft: L^3 }
export function computeSheetPilePenetration({ retained_height_ft = 0, friction_angle_deg = 0, unit_weight_pcf = 0, increase_factor_pct = 0, allowable_stress_psi = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(retained_height_ft > 0)) return { error: "Retained height must be positive." };
  if (!(friction_angle_deg > 0 && friction_angle_deg < 90)) return { error: "The soil friction angle must be above 0 and below 90 degrees." };
  if (!(unit_weight_pcf > 0)) return { error: "Soil unit weight must be positive." };
  if (!(increase_factor_pct >= 0)) return { error: "The increase on the theoretical depth cannot be negative." };
  if (!(allowable_stress_psi > 0)) return { error: "Allowable bending stress must be positive." };
  const ka = Math.pow(Math.tan((45 - friction_angle_deg / 2) * DEG), 2);
  const kp = Math.pow(Math.tan((45 + friction_angle_deg / 2) * DEG), 2);
  const active_force_plf = 0.5 * ka * unit_weight_pcf * retained_height_ft * retained_height_ft;
  const lever_arm_ft = retained_height_ft / 3;
  // Net passive pressure gained per foot of depth below the dredge line.
  const net_passive_rate = (kp - ka) * unit_weight_pcf;
  // Moments about the toe: (net_passive_rate / 6) D^3 = Pa (D + H/3). Solve by
  // bisection -- the left side grows as the cube, so the crossing is unique for
  // D > 0 and bracketing is trivial.
  const f = (D) => (net_passive_rate / 6) * D * D * D - active_force_plf * (D + lever_arm_ft);
  let lo = 0, hi = 1;
  while (f(hi) < 0 && hi < 1e6) hi *= 2;
  if (!(hi < 1e6)) return { error: "No embedment satisfies moment equilibrium for these inputs." };
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid; else hi = mid;
  }
  const theoretical_depth_ft = (lo + hi) / 2;
  const design_depth_ft = theoretical_depth_ft * (1 + increase_factor_pct / 100);
  const total_length_ft = retained_height_ft + design_depth_ft;
  // Maximum moment sits where net shear is zero, below the dredge line.
  const depth_to_max_moment_ft = Math.sqrt(2 * active_force_plf / net_passive_rate);
  const max_moment_ftlb_per_ft =
    active_force_plf * (depth_to_max_moment_ft + lever_arm_ft) -
    (net_passive_rate / 2) * depth_to_max_moment_ft * depth_to_max_moment_ft * (depth_to_max_moment_ft / 3);
  return {
    ka, kp, active_force_plf, lever_arm_ft, net_passive_rate,
    theoretical_depth_ft, design_depth_ft, total_length_ft,
    embedment_ratio: design_depth_ft / retained_height_ft,
    embedment_share_pct: 100 * design_depth_ft / total_length_ft,
    depth_to_max_moment_ft, max_moment_ftlb_per_ft,
    section_modulus_in3_per_ft: max_moment_ftlb_per_ft * IN_PER_FT / allowable_stress_psi,
    note: "The 20 to 40% increase on the theoretical depth is NOT a safety factor in the usual sense -- it is the conventional correction for the net-pressure simplification's idealised rotation point and pressure distribution, applied on top of, not instead of, the factors of safety in the pressure coefficients or a modern design's load and resistance factors. DEFLECTION frequently governs instead of bending stress and this arithmetic does not compute it: a cantilever wall can move inches at the top while the section sits well inside its capacity, which is fine for a temporary cofferdam and not beside a road or a building. Where deflection governs the answer is a heavier section, deeper embedment, or an anchor -- and an anchor makes it a different structure with a different analysis. Drained granular soil, no surcharge, and no water differential are assumed; the geotechnical report and the design engineer govern.",
  };
}

const sheetPileExample = { retained_height_ft: 12, friction_angle_deg: 32, unit_weight_pcf: 120, increase_factor_pct: 30, allowable_stress_psi: 30000 };
MARINE_RENDERERS["sheet-pile-penetration"] = _simpleRenderer({
  citation: "Citation: Rankine earth pressure coefficients Ka = tan^2(45 - phi/2) and Kp = tan^2(45 + phi/2), with the cantilever wall's embedment from moment equilibrium about the toe on the net-pressure simplification, increased by the conventional 20 to 40% for that idealisation. Drained granular soil with no surcharge and no water differential is assumed. The geotechnical report, the applicable code, and the design engineer govern.",
  example: sheetPileExample,
  fields: [
    { key: "retained_height_ft", label: "Retained height above dredge line (ft)" },
    { key: "friction_angle_deg", label: "Soil friction angle phi (degrees)", attrs: { step: "any", min: "0", max: "90" } },
    { key: "unit_weight_pcf", label: "Soil unit weight (lb/cu ft)" },
    { key: "increase_factor_pct", label: "Increase on theoretical depth (%)" },
    { key: "allowable_stress_psi", label: "Allowable bending stress (psi)" },
  ],
  outputs: [
    { key: "ka", id: "spp-ka", label: "Active pressure coefficient Ka", value: (r) => fmt(r.ka, 4) },
    { key: "kp", id: "spp-kp", label: "Passive pressure coefficient Kp", value: (r) => fmt(r.kp, 4) },
    { key: "active_force_plf", id: "spp-pa", label: "Active force", value: (r) => fmt(r.active_force_plf, 0) + " lb per foot of wall, acting " + fmt(r.lever_arm_ft, 2) + " ft above the dredge line" },
    { key: "theoretical_depth_ft", id: "spp-dt", label: "Theoretical embedment", unit: "ft", value: (r) => fmt(r.theoretical_depth_ft, 2) + " ft" },
    { key: "design_depth_ft", id: "spp-dd", label: "Design embedment", unit: "ft", value: (r) => fmt(r.design_depth_ft, 2) + " ft -- " + fmt(r.embedment_ratio, 2) + " times the retained height" },
    { key: "total_length_ft", id: "spp-len", label: "Total pile length", unit: "ft", value: (r) => fmt(r.total_length_ft, 1) + " ft, of which " + fmt(r.embedment_share_pct, 0) + "% is below the excavation and never seen" },
    { key: "depth_to_max_moment_ft", id: "spp-z", label: "Depth to maximum moment", unit: "ft", value: (r) => fmt(r.depth_to_max_moment_ft, 2) + " ft below the dredge line, not at it" },
    { key: "max_moment_ftlb_per_ft", id: "spp-m", label: "Maximum moment", value: (r) => fmt(r.max_moment_ftlb_per_ft, 0) + " ft-lb per foot of wall" },
    { key: "section_modulus_in3_per_ft", id: "spp-s", label: "Section modulus required", value: (r) => fmt(r.section_modulus_in3_per_ft, 1) + " in^3 per foot of wall" },
    { key: "note", id: "spp-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeSheetPilePenetration,
});

// ======== spec-v1832: pile driving hammer energy and bearing ========

// The Engineering News formula survives because it is the only thing a crew can
// compute at the pile. Used as a field control on a criterion someone
// calibrated it is reasonable; used as a prediction it is poor, and the whole
// range from 0.3 in to 0.1 in of set spans a factor of two on a measurement
// taken by eye on a moving pile.

// dims: in { hammer_energy_ftlb: M L^2 T^-2, loss_constant_in: L, required_capacity_tons: M L T^-2, refusal_blows_per_inch: L^-1, loose_set_in: L, embedded_safety_factor: dimensionless } out: { set_in: L, blows_per_inch: L^-1, blows_per_foot: L^-1, refusal_capacity_tons: M L T^-2, loose_set_capacity_tons: M L T^-2, ultimate_capacity_tons: M L T^-2 }
export function computePileHammerBearing({ hammer_energy_ftlb = 0, loss_constant_in = 0, required_capacity_tons = 0, refusal_blows_per_inch = 0, loose_set_in = 0, embedded_safety_factor = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(hammer_energy_ftlb > 0)) return { error: "Rated hammer energy must be positive." };
  if (!(loss_constant_in > 0)) return { error: "The loss constant must be positive (0.1 in for steam, air, and diesel hammers; 1.0 in for a drop hammer)." };
  if (!(required_capacity_tons > 0)) return { error: "Required allowable capacity must be positive." };
  if (!(refusal_blows_per_inch > 0)) return { error: "The refusal criterion must be positive." };
  if (!(loose_set_in > 0)) return { error: "The looser set must be positive." };
  if (!(embedded_safety_factor > 0)) return { error: "The formula's embedded factor of safety must be positive." };
  const required_capacity_lb = required_capacity_tons * LB_PER_TON;
  // Engineering News: R = 2 E / (s + c), solved both ways.
  const capacityFor = (set_in) => 2 * hammer_energy_ftlb / (set_in + loss_constant_in);
  const set_in = 2 * hammer_energy_ftlb / required_capacity_lb - loss_constant_in;
  if (!(set_in > 0)) {
    return { error: "This hammer cannot reach the required capacity: the formula asks for a set at or below zero, which is past refusal." };
  }
  const refusal_set_in = 1 / refusal_blows_per_inch;
  const refusal_capacity_lb = capacityFor(refusal_set_in);
  const loose_set_capacity_lb = capacityFor(loose_set_in);
  return {
    set_in,
    blows_per_inch: 1 / set_in,
    blows_per_foot: IN_PER_FT / set_in,
    ultimate_capacity_tons: required_capacity_tons * embedded_safety_factor,
    refusal_set_in,
    refusal_capacity_tons: refusal_capacity_lb / LB_PER_TON,
    refusal_capacity_ratio: refusal_capacity_lb / required_capacity_lb,
    loose_set_capacity_tons: loose_set_capacity_lb / LB_PER_TON,
    loose_set_shortfall_pct: 100 * (loose_set_capacity_lb - required_capacity_lb) / required_capacity_lb,
    // The sensitivity is the first reason the formula is unreliable and it is
    // entirely visible in the arithmetic.
    set_range_capacity_ratio: refusal_capacity_lb / loose_set_capacity_lb,
    note: "Use this as a FIELD CONTROL on a criterion someone calibrated, not as a design method: a wave equation analysis sets the criterion, a dynamic pile test or a static load test verifies it, and this arithmetic is how the crew hits it. Measured against static load tests, dynamic formulas scatter by a factor of two or three in both directions, which is why the embedded factor of safety is about six and why that is still not sufficient on its own. The relation contains nothing about the pile's length, stiffness, or mass, nothing about the cushion, and nothing about how soil behaves under a blow lasting milliseconds. Refusal exists to protect the PILE, not to prove capacity: a pile at refusal in a soft layer above a hard one has proven nothing about what it is bearing on. The project specification, the wave equation analysis, and the geotechnical engineer govern.",
  };
}

const pileHammerExample = { hammer_energy_ftlb: 42000, loss_constant_in: 0.1, required_capacity_tons: 150, refusal_blows_per_inch: 10, loose_set_in: 0.3, embedded_safety_factor: 6 };
MARINE_RENDERERS["pile-hammer-bearing"] = _simpleRenderer({
  citation: "Citation: the Engineering News formula R_allowable = 2 E / (s + c), with E the rated hammer energy in ft-lb, s the set per blow in inches, and c a loss constant of 0.1 in for steam, air, and diesel hammers or 1.0 in for a drop hammer. The form carries an embedded factor of safety of about 6 and returns an allowable, not an ultimate, load. Dynamic formulas scatter by a factor of two or three against static load tests; the project specification, a wave equation analysis, and the geotechnical engineer govern.",
  example: pileHammerExample,
  fields: [
    { key: "hammer_energy_ftlb", label: "Rated hammer energy (ft-lb)" },
    { key: "loss_constant_in", label: "Loss constant c (in)" },
    { key: "required_capacity_tons", label: "Required allowable capacity (tons)" },
    { key: "refusal_blows_per_inch", label: "Specification refusal (blows per inch)" },
    { key: "loose_set_in", label: "Looser set to compare (in)" },
    { key: "embedded_safety_factor", label: "Formula's embedded factor of safety" },
  ],
  outputs: [
    { key: "set_in", id: "phb-set", label: "Set per blow required", unit: "in", value: (r) => fmt(r.set_in, 3) + " in per blow" },
    { key: "blows_per_inch", id: "phb-bpi", label: "Driving criterion", value: (r) => fmt(r.blows_per_inch, 1) + " blows per inch, " + fmt(r.blows_per_foot, 0) + " per foot" },
    { key: "ultimate_capacity_tons", id: "phb-ult", label: "Implied ultimate capacity", unit: "tons", value: (r) => fmt(r.ultimate_capacity_tons, 0) + " tons at the embedded factor of safety" },
    { key: "refusal_capacity_tons", id: "phb-ref", label: "Capacity at refusal", unit: "tons", value: (r) => fmt(r.refusal_capacity_tons, 0) + " tons allowable -- " + fmt(r.refusal_capacity_ratio, 1) + " times the requirement" },
    { key: "loose_set_capacity_tons", id: "phb-loose", label: "Capacity at the looser set", unit: "tons", value: (r) => fmt(r.loose_set_capacity_tons, 0) + " tons -- " + fmt(Math.abs(r.loose_set_shortfall_pct), 0) + "% " + (r.loose_set_shortfall_pct < 0 ? "below" : "above") + " the requirement" },
    { key: "set_range_capacity_ratio", id: "phb-span", label: "What the set measurement is worth", value: (r) => "The entered set range spans a factor of " + fmt(r.set_range_capacity_ratio, 1) + " in capacity, from a measurement taken by eye on a moving pile" },
    { key: "note", id: "phb-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePileHammerBearing,
});

// ========= spec-v1833: berthing energy and fender selection =========

// Everything in a fender calculation is reasonably knowable except the one term
// that is squared. A vessel arriving at twice the design speed does not deliver
// twice the energy; it delivers four times.

// dims: in { displacement_tons: M L T^-2, approach_velocity_fps: L T^-1, virtual_mass_factor: dimensionless, eccentricity_factor: dimensionless, softness_factor: dimensionless, configuration_factor: dimensionless, fender_rating_ftlb: M L^2 T^-2, alternative_velocity_fps: L T^-1 } out: { vessel_mass_slugs: M, kinetic_energy_ftlb: M L^2 T^-2, design_energy_ftlb: M L^2 T^-2, alternative_design_energy_ftlb: M L^2 T^-2, fender_margin_pct: dimensionless }
export function computeBerthingFenderEnergy({ displacement_tons = 0, approach_velocity_fps = 0, virtual_mass_factor = 0, eccentricity_factor = 0, softness_factor = 0, configuration_factor = 0, fender_rating_ftlb = 0, alternative_velocity_fps = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(displacement_tons > 0)) return { error: "Vessel displacement must be positive." };
  if (!(approach_velocity_fps > 0) || !(alternative_velocity_fps > 0)) return { error: "Approach velocities must be positive." };
  if (!(virtual_mass_factor > 0)) return { error: "The virtual mass factor must be positive." };
  if (!(eccentricity_factor > 0 && eccentricity_factor <= 1)) return { error: "The eccentricity factor must be above 0 and at most 1." };
  if (!(softness_factor > 0 && softness_factor <= 1)) return { error: "The softness factor must be above 0 and at most 1." };
  if (!(configuration_factor > 0 && configuration_factor <= 1)) return { error: "The berth configuration factor must be above 0 and at most 1." };
  if (!(fender_rating_ftlb > 0)) return { error: "The fender's rated energy absorption must be positive." };
  const vessel_mass_slugs = displacement_tons * LB_PER_TON / G_FPS2;
  const combined_factor = virtual_mass_factor * eccentricity_factor * softness_factor * configuration_factor;
  const energyAt = (v) => 0.5 * vessel_mass_slugs * v * v;
  const kinetic_energy_ftlb = energyAt(approach_velocity_fps);
  const design_energy_ftlb = kinetic_energy_ftlb * combined_factor;
  const alternative_design_energy_ftlb = energyAt(alternative_velocity_fps) * combined_factor;
  return {
    vessel_mass_slugs, combined_factor, kinetic_energy_ftlb, design_energy_ftlb,
    fender_margin_pct: 100 * (fender_rating_ftlb - design_energy_ftlb) / design_energy_ftlb,
    fender_adequate: design_energy_ftlb <= fender_rating_ftlb,
    fender_utilization: design_energy_ftlb / fender_rating_ftlb,
    alternative_design_energy_ftlb,
    alternative_energy_ratio: alternative_design_energy_ftlb / design_energy_ftlb,
    alternative_fender_utilization: alternative_design_energy_ftlb / fender_rating_ftlb,
    alternative_fender_adequate: alternative_design_energy_ftlb <= fender_rating_ftlb,
    // The square is the whole reason fender design is conservative.
    velocity_ratio: alternative_velocity_fps / approach_velocity_fps,
    // A square berthing -- a barge pushed flat against a face -- has Ce near 1
    // and delivers the reciprocal of the entered factor more energy.
    square_berthing_energy_ftlb: design_energy_ftlb / eccentricity_factor,
    square_berthing_ratio: 1 / eccentricity_factor,
    note: "Approach velocity is the term that is squared and it is the least controlled quantity in the calculation: displacement comes from the vessel's particulars and the coefficients from published guidance and the berth's geometry, but velocity is an assumption about seamanship on a day nobody can specify. A vessel at twice the design speed delivers FOUR times the energy, and the load path beyond an overwhelmed fender is the quay structure -- which is where a berthing accident becomes a structural repair rather than a fender replacement. The eccentricity factor is doing more work than it looks: a barge pushed square onto a face has Ce near 1.0, so a berth taking both ships and flat-pushed barges has two very different design cases and the barge one is easy to overlook. Published berthing guidance, the fender manufacturer's energy curves at the design deflection, and the berth designer govern.",
  };
}

const fenderExample = { displacement_tons: 22000, approach_velocity_fps: 0.5, virtual_mass_factor: 1.5, eccentricity_factor: 0.5, softness_factor: 1.0, configuration_factor: 0.95, fender_rating_ftlb: 150000, alternative_velocity_fps: 1.0 };
MARINE_RENDERERS["berthing-fender-energy"] = _simpleRenderer({
  citation: "Citation: berthing kinetic energy E = 0.5 M V^2 with M the vessel's mass (displacement / g) and V the component of approach velocity normal to the berth, factored by virtual mass (1.3 to 1.8), eccentricity (0.4 to 0.7 for a normal quarter-point berthing), softness (0.9 to 1.0), and berth configuration (0.8 to 1.0). Published berthing guidance, the fender manufacturer's energy curves at the design deflection, and the berth designer govern.",
  example: fenderExample,
  fields: [
    { key: "displacement_tons", label: "Vessel displacement (tons)" },
    { key: "approach_velocity_fps", label: "Approach velocity normal to berth (ft/s)" },
    { key: "virtual_mass_factor", label: "Virtual mass factor Cm" },
    { key: "eccentricity_factor", label: "Eccentricity factor Ce", attrs: { step: "any", min: "0", max: "1" } },
    { key: "softness_factor", label: "Softness factor Cs", attrs: { step: "any", min: "0", max: "1" } },
    { key: "configuration_factor", label: "Berth configuration factor Cc", attrs: { step: "any", min: "0", max: "1" } },
    { key: "fender_rating_ftlb", label: "Fender rated energy absorption (ft-lb)" },
    { key: "alternative_velocity_fps", label: "Alternative approach velocity (ft/s)" },
  ],
  outputs: [
    { key: "vessel_mass_slugs", id: "bfe-mass", label: "Vessel mass", value: (r) => fmt(r.vessel_mass_slugs, 0) + " slugs" },
    { key: "kinetic_energy_ftlb", id: "bfe-ke", label: "Kinetic energy", unit: "ft-lb", value: (r) => fmt(r.kinetic_energy_ftlb, 0) + " ft-lb before the factors" },
    { key: "design_energy_ftlb", id: "bfe-de", label: "Design berthing energy", unit: "ft-lb", value: (r) => fmt(r.design_energy_ftlb, 0) + " ft-lb at a combined factor of " + fmt(r.combined_factor, 4) },
    { key: "fender_margin_pct", id: "bfe-marg", label: "Against the fender rating", value: (r) => (r.fender_adequate ? fmt(r.fender_margin_pct, 0) + "% of margin" : "OVER -- " + fmt(r.fender_utilization, 2) + " times the rating") },
    { key: "alternative_design_energy_ftlb", id: "bfe-alt", label: "At the alternative velocity", unit: "ft-lb", value: (r) => fmt(r.alternative_design_energy_ftlb, 0) + " ft-lb -- " + fmt(r.alternative_energy_ratio, 1) + "x the energy from " + fmt(r.velocity_ratio, 1) + "x the speed" },
    { key: "alternative_fender_utilization", id: "bfe-altf", label: "The fender at that velocity", value: (r) => fmt(r.alternative_fender_utilization, 2) + " times its rating -- " + (r.alternative_fender_adequate ? "still within it" : "OVERWHELMED; the load path beyond it is the quay") },
    { key: "square_berthing_energy_ftlb", id: "bfe-sq", label: "A square berthing", value: (r) => fmt(r.square_berthing_energy_ftlb, 0) + " ft-lb at Ce = 1.0 -- " + fmt(r.square_berthing_ratio, 1) + "x, the flat-pushed barge case" },
    { key: "note", id: "bfe-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeBerthingFenderEnergy,
});

// ======= spec-v1834: mooring line load from wind and current =======

// Wind is what everyone thinks about and current is what usually governs: water
// is roughly 800 times denser than air, so a modest current on a modest area
// beats a strong wind on a large one.

// dims: in { wind_area_ft2: L^2, wind_drag_coefficient: dimensionless, wind_speed_mph: L T^-1, submerged_area_ft2: L^2, current_drag_coefficient: dimensionless, current_speed_knots: L T^-1, line_count: dimensionless, line_angle_deg: dimensionless, worst_line_share_pct: dimensionless, safety_factor: dimensionless } out: { wind_force_lb: M L T^-2, current_force_lb: M L T^-2, total_force_lb: M L T^-2, load_per_line_lb: M L T^-2, worst_line_load_lb: M L T^-2, required_mbl_lb: M L T^-2 }
export function computeMooringLoadWindCurrent({ wind_area_ft2 = 0, wind_drag_coefficient = 0, wind_speed_mph = 0, submerged_area_ft2 = 0, current_drag_coefficient = 0, current_speed_knots = 0, line_count = 0, line_angle_deg = 0, worst_line_share_pct = 0, safety_factor = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(wind_area_ft2 > 0) || !(submerged_area_ft2 > 0)) return { error: "Projected wind area and submerged lateral area must be positive." };
  if (!(wind_drag_coefficient > 0) || !(current_drag_coefficient > 0)) return { error: "Drag coefficients must be positive." };
  if (!(wind_speed_mph > 0) || !(current_speed_knots > 0)) return { error: "Wind and current speeds must be positive." };
  if (!(line_count >= 1)) return { error: "There must be at least one mooring line." };
  if (!(line_angle_deg >= 0 && line_angle_deg < 90)) return { error: "The horizontal line angle must be at least 0 and below 90 degrees." };
  if (!(worst_line_share_pct > 0 && worst_line_share_pct <= 100)) return { error: "The most-loaded line's share must be above 0 and at most 100%." };
  if (!(safety_factor > 0)) return { error: "The safety factor must be positive." };
  // Wind: the 0.00256 coefficient already carries air density for V in mph.
  const wind_force_lb = 0.00256 * wind_drag_coefficient * wind_area_ft2 * wind_speed_mph * wind_speed_mph;
  const current_speed_fps = current_speed_knots * FT_PER_KNOT;
  const current_force_lb = 0.5 * SEA_WATER_SLUGS * current_drag_coefficient * submerged_area_ft2 * current_speed_fps * current_speed_fps;
  const total_force_lb = wind_force_lb + current_force_lb;
  const cos_angle = Math.cos(line_angle_deg * DEG);
  const load_per_line_lb = total_force_lb / (line_count * cos_angle);
  const worst_line_load_lb = total_force_lb * (worst_line_share_pct / 100) / cos_angle;
  return {
    wind_force_lb, current_force_lb, total_force_lb,
    current_speed_fps,
    wind_speed_fps: wind_speed_mph * 5280 / SEC_PER_HOUR,
    current_to_wind_ratio: current_force_lb / wind_force_lb,
    current_exceeds_wind: current_force_lb > wind_force_lb,
    current_over_wind_pct: 100 * (current_force_lb - wind_force_lb) / wind_force_lb,
    cos_angle, angle_cost_pct: 100 * (1 - cos_angle),
    worst_line_share_pct,
    equal_share_pct: 100 / line_count,
    load_per_line_lb,
    required_mbl_lb: load_per_line_lb * safety_factor,
    worst_line_load_lb,
    worst_line_required_mbl_lb: worst_line_load_lb * safety_factor,
    worst_to_equal_ratio: worst_line_load_lb / load_per_line_lb,
    note: "Equal sharing is an assumption a real mooring arrangement does not honour, and the error is always in the unsafe direction: lines of different lengths, materials, and angles have different stiffnesses, so the short stiff line picks up load fastest and reaches its limit first. The failure is then progressive -- the most loaded line parts, its load redistributes, and the next one parts -- which is why mooring failures are sudden and complete rather than gradual. Angle costs capacity twice: a line leading off the perpendicular contributes only its cosine, and a line with significant VERTICAL angle, from tidal range or high freeboard, is partly pulling the vessel down rather than holding it in. Mooring layouts are drawn in plan, and the vertical angle is where they are lost. This screens a steady-state broadside case; the terminal's mooring analysis, the line manufacturer's data, and the vessel's own mooring arrangement govern.",
  };
}

const mooringExample = { wind_area_ft2: 12000, wind_drag_coefficient: 1.0, wind_speed_mph: 50, submerged_area_ft2: 3000, current_drag_coefficient: 1.2, current_speed_knots: 3, line_count: 6, line_angle_deg: 30, worst_line_share_pct: 70, safety_factor: 2 };
MARINE_RENDERERS["mooring-load-wind-current"] = _simpleRenderer({
  citation: "Citation: wind force F = 0.00256 x Cd x A x V^2 with A the projected area above water in sq ft and V in mph, and current force F = 0.5 x rho x Cd x A x V^2 with rho 1.99 slugs/cu ft for sea water, A the submerged lateral area, and V in ft/s at 1.688 ft/s per knot. The terminal's own mooring analysis, the line manufacturer's published minimum breaking load, and the vessel's mooring arrangement govern.",
  example: mooringExample,
  fields: [
    { key: "wind_area_ft2", label: "Projected wind area above water (sq ft)" },
    { key: "wind_drag_coefficient", label: "Wind drag coefficient" },
    { key: "wind_speed_mph", label: "Wind speed (mph)" },
    { key: "submerged_area_ft2", label: "Submerged lateral area (sq ft)" },
    { key: "current_drag_coefficient", label: "Current drag coefficient" },
    { key: "current_speed_knots", label: "Current speed (knots)" },
    { key: "line_count", label: "Number of mooring lines", attrs: { step: "1", min: "1" } },
    { key: "line_angle_deg", label: "Horizontal line angle off perpendicular (degrees)", attrs: { step: "any", min: "0", max: "89" } },
    { key: "worst_line_share_pct", label: "Most-loaded line's share of the total (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "safety_factor", label: "Safety factor on breaking load" },
  ],
  outputs: [
    { key: "wind_force_lb", id: "mlw-wind", label: "Wind force", unit: "lb", value: (r) => fmt(r.wind_force_lb, 0) + " lb at " + fmt(r.wind_speed_fps, 0) + " ft/s" },
    { key: "current_force_lb", id: "mlw-cur", label: "Current force", unit: "lb", value: (r) => fmt(r.current_force_lb, 0) + " lb at " + fmt(r.current_speed_fps, 1) + " ft/s" },
    { key: "current_to_wind_ratio", id: "mlw-rat", label: "Which governs", value: (r) => (r.current_exceeds_wind ? "CURRENT, exceeding the wind by " + fmt(r.current_over_wind_pct, 0) + "%" : "WIND, exceeding the current by " + fmt(-r.current_over_wind_pct, 0) + "%") },
    { key: "total_force_lb", id: "mlw-tot", label: "Total load", unit: "lb", value: (r) => fmt(r.total_force_lb, 0) + " lb" },
    { key: "load_per_line_lb", id: "mlw-per", label: "Per line, sharing equally", unit: "lb", value: (r) => fmt(r.load_per_line_lb, 0) + " lb -- needs " + fmt(r.required_mbl_lb, 0) + " lb minimum breaking load" },
    { key: "worst_line_load_lb", id: "mlw-worst", label: "The most-loaded line", unit: "lb", value: (r) => fmt(r.worst_line_load_lb, 0) + " lb at " + fmt(r.worst_line_share_pct, 0) + "% against a " + fmt(r.equal_share_pct, 0) + "% equal share -- " + fmt(r.worst_to_equal_ratio, 1) + "x, needing " + fmt(r.worst_line_required_mbl_lb, 0) + " lb" },
    { key: "angle_cost_pct", id: "mlw-ang", label: "What the lead angle costs", value: (r) => fmt(r.angle_cost_pct, 0) + "% of each line's pull, before any vertical angle" },
    { key: "note", id: "mlw-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeMooringLoadWindCurrent,
});

// ========== spec-v1835: local scour depth at a bridge pier ==========

// Scour is the leading cause of bridge failure in the United States because it
// removes support without touching the structure. The angle-of-attack term is
// where a design number becomes a disaster: a skewed pier presents a projection
// that includes its LENGTH, and a pier is several times longer than it is wide.

// dims: in { pier_width_ft: L, pier_length_ft: L, flow_depth_ft: L, velocity_fps: L T^-1, nose_shape_factor: dimensionless, bed_condition_factor: dimensionless, angle_of_attack_deg: dimensionless, wider_pier_width_ft: L, foundation_margin_ft: L } out: { froude_number: dimensionless, angle_factor: dimensionless, scour_depth_ft: L, wider_pier_scour_ft: L, skewed_scour_ft: L, foundation_depth_ft: L }
export function computePierScourDepth({ pier_width_ft = 0, pier_length_ft = 0, flow_depth_ft = 0, velocity_fps = 0, nose_shape_factor = 0, bed_condition_factor = 0, angle_of_attack_deg = 0, wider_pier_width_ft = 0, foundation_margin_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(pier_width_ft > 0) || !(wider_pier_width_ft > 0)) return { error: "Pier widths must be positive." };
  if (!(pier_length_ft >= pier_width_ft)) return { error: "Pier length must be at least its width." };
  if (!(flow_depth_ft > 0) || !(velocity_fps > 0)) return { error: "Approach flow depth and velocity must be positive." };
  if (!(nose_shape_factor > 0) || !(bed_condition_factor > 0)) return { error: "Nose shape and bed condition factors must be positive." };
  if (!(angle_of_attack_deg >= 0 && angle_of_attack_deg <= 90)) return { error: "The angle of attack must be between 0 and 90 degrees." };
  if (!(foundation_margin_ft >= 0)) return { error: "The foundation margin cannot be negative." };
  const froude_number = velocity_fps / Math.sqrt(G_FPS2 * flow_depth_ft);
  // HEC-18: y_s = 2.0 K1 K2 K3 y1 (a/y1)^0.65 Fr^0.43, with the angle factor
  // K2 = (cos t + (L/a) sin t)^0.65 -- aligned, that is exactly 1.
  // HEC-18 bounds its own relation three ways, and the spec states none of
  // them: L/a enters K2 at no more than 12; past 5 degrees of skew K2 dominates
  // and K1 is taken as 1.0; and a round-nosed pier aligned with the flow scours
  // no deeper than 2.4 pier widths at Fr <= 0.8, or 3.0 above it.
  const length_ratio_used = Math.min(pier_length_ft / pier_width_ft, 12);
  const angleFactor = (length_ratio) => Math.pow(
    Math.cos(angle_of_attack_deg * DEG) + length_ratio * Math.sin(angle_of_attack_deg * DEG),
    0.65,
  );
  const scourAt = (width_ft, k1, k2) => 2.0 * k1 * k2 * bed_condition_factor * flow_depth_ft *
    Math.pow(width_ft / flow_depth_ft, 0.65) * Math.pow(froude_number, 0.43);
  const round_nose = Math.abs(nose_shape_factor - 1) < 1e-9;
  const aligned_limit_ratio = froude_number <= 0.8 ? 2.4 : 3.0;
  const alignedAt = (width_ft) => {
    const ys = scourAt(width_ft, nose_shape_factor, 1);
    return round_nose ? Math.min(ys, aligned_limit_ratio * width_ft) : ys;
  };
  const scour_depth_ft = alignedAt(pier_width_ft);
  const wider_pier_scour_ft = alignedAt(wider_pier_width_ft);
  const aligned_limited = round_nose && scourAt(pier_width_ft, 1, 1) > aligned_limit_ratio * pier_width_ft;
  const angle_factor = angleFactor(length_ratio_used);
  const skewed_k1 = angle_of_attack_deg > 5 ? 1 : nose_shape_factor;
  const skewed_scour_ft = scourAt(pier_width_ft, skewed_k1, angle_factor);
  return {
    froude_number, angle_factor, length_ratio_used, skewed_k1, aligned_limit_ratio, aligned_limited,
    scour_depth_ft, wider_pier_scour_ft,
    wider_pier_ratio: wider_pier_scour_ft / scour_depth_ft,
    wider_pier_increase_pct: 100 * (wider_pier_scour_ft - scour_depth_ft) / scour_depth_ft,
    skewed_scour_ft,
    skew_ratio: skewed_scour_ft / scour_depth_ft,
    governing_scour_ft: Math.max(scour_depth_ft, skewed_scour_ft),
    foundation_depth_ft: Math.max(scour_depth_ft, skewed_scour_ft) + foundation_margin_ft,
    note: "This is the LOCAL component only. Contraction scour across the bridge opening and long-term degradation of the reach are separate components and they ADD, so a foundation designed against local scour alone is designed against a fraction of the depth the bed will actually reach in a design flood. The angle of attack is a geometry problem rather than a hydraulic one, and channels migrate -- a pier aligned when it was built is not necessarily aligned now. Scour removes the soil that was providing both the bearing and the lateral support, and the failure frequently occurs during the flood when nobody can see the bed. HEC-18, the bridge's own hydraulic study, and the scour-critical evaluation govern.",
  };
}

const scourExample = { pier_width_ft: 6, pier_length_ft: 36, flow_depth_ft: 15, velocity_fps: 8, nose_shape_factor: 1.0, bed_condition_factor: 1.1, angle_of_attack_deg: 30, wider_pier_width_ft: 12, foundation_margin_ft: 2 };
MARINE_RENDERERS["pier-scour-depth"] = _simpleRenderer({
  citation: "Citation: the HEC-18 local pier scour relation y_s / y_1 = 2.0 K1 K2 K3 (a / y_1)^0.65 Fr_1^0.43, with K1 the nose shape (1.0 round, 1.1 square, 0.9 sharp), K2 the angle-of-attack factor (cos theta + (L/a) sin theta)^0.65, and K3 the bed condition (1.1 plane bed and antidunes). Local scour is one component: contraction scour and long-term degradation add to it. HEC-18, the bridge's hydraulic study, and the scour-critical evaluation govern.",
  example: scourExample,
  fields: [
    { key: "pier_width_ft", label: "Pier width (ft)" },
    { key: "pier_length_ft", label: "Pier length (ft)" },
    { key: "flow_depth_ft", label: "Approach flow depth (ft)" },
    { key: "velocity_fps", label: "Approach velocity (ft/s)" },
    { key: "nose_shape_factor", label: "Nose shape factor K1" },
    { key: "bed_condition_factor", label: "Bed condition factor K3" },
    { key: "angle_of_attack_deg", label: "Angle of attack (degrees)", attrs: { step: "any", min: "0", max: "90" } },
    { key: "wider_pier_width_ft", label: "Wider pier to compare (ft)" },
    { key: "foundation_margin_ft", label: "Foundation margin below scour (ft)" },
  ],
  outputs: [
    { key: "froude_number", id: "psd-fr", label: "Approach Froude number", value: (r) => fmt(r.froude_number, 4) },
    { key: "scour_depth_ft", id: "psd-ys", label: "Local scour, aligned", unit: "ft", value: (r) => fmt(r.scour_depth_ft, 1) + " ft below the ambient bed" + (r.aligned_limited ? " -- held at HEC-18's " + fmt(r.aligned_limit_ratio, 1) + " pier widths" : "") },
    { key: "wider_pier_scour_ft", id: "psd-wide", label: "With the wider pier", unit: "ft", value: (r) => fmt(r.wider_pier_scour_ft, 1) + " ft -- " + fmt(r.wider_pier_increase_pct, 0) + "% deeper; a heavier pier is not a safer one" },
    { key: "angle_factor", id: "psd-k2", label: "Angle-of-attack factor K2", value: (r) => fmt(r.angle_factor, 3) + " at the entered skew" },
    { key: "skewed_scour_ft", id: "psd-skew", label: "Local scour at the skew", unit: "ft", value: (r) => fmt(r.skewed_scour_ft, 1) + " ft -- " + fmt(r.skew_ratio, 1) + " times the aligned depth" },
    { key: "foundation_depth_ft", id: "psd-found", label: "Foundation below ambient bed", unit: "ft", value: (r) => fmt(r.foundation_depth_ft, 1) + " ft against the governing local scour, before contraction scour and degradation" },
    { key: "note", id: "psd-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePierScourDepth,
});

// ========= spec-v1836: wind-generated wave height from fetch =========

// A hindcast: it estimates what the sea should have been from what the wind was.
// Height goes as the SQUARE ROOT of fetch, which is why enclosed waters are
// workable at all, while wind enters far more strongly. The duration term is the
// one most often left out and it is frequently what governs.

// dims: in { wind_speed_mph: L T^-1, fetch_mi: L, alternative_fetch_mi: L, alternative_wind_speed_mph: L T^-1 } out: { adjusted_wind_ms: L T^-1, dimensionless_fetch: dimensionless, wave_height_m: L, wave_height_ft: L, peak_period_s: T, duration_required_hr: T, alternative_fetch_height_ft: L, alternative_wind_height_ft: L }
export function computeWaveHeightFetch({ wind_speed_mph = 0, fetch_mi = 0, alternative_fetch_mi = 0, alternative_wind_speed_mph = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(wind_speed_mph > 0) || !(alternative_wind_speed_mph > 0)) return { error: "Wind speeds must be positive." };
  if (!(fetch_mi > 0) || !(alternative_fetch_mi > 0)) return { error: "Fetch lengths must be positive." };
  // U_A is a stress-equivalent wind speed, not the anemometer reading.
  const adjustedWind = (mph) => 0.71 * Math.pow(mph * MS_PER_MPH, 1.23);
  const seaState = (mph, miles) => {
    const ua = adjustedWind(mph);
    const x = G_MS2 * (miles * M_PER_MILE) / (ua * ua);
    // Fetch-limited growth stops at a fully developed sea (SPM 1984 eq 3-42:
    // gH/U_A^2 = 0.2433, gT/U_A = 8.134, gt/U_A = 7.15e4). The square-root law
    // does not know that, and past X of about 23,000 it keeps climbing.
    const height_m = Math.min(0.0016 * Math.sqrt(x), 0.2433) * ua * ua / G_MS2;
    return {
      adjusted_wind_ms: ua,
      dimensionless_fetch: x,
      fully_developed: 0.0016 * Math.sqrt(x) >= 0.2433,
      wave_height_m: height_m,
      wave_height_ft: height_m * FT_PER_M,
      peak_period_s: Math.min(0.2857 * Math.cbrt(x), 8.134) * ua / G_MS2,
      duration_required_hr: Math.min(68.8 * Math.pow(x, 2 / 3), 7.15e4) * ua / G_MS2 / SEC_PER_HOUR,
    };
  };
  const base = seaState(wind_speed_mph, fetch_mi);
  const longerFetch = seaState(wind_speed_mph, alternative_fetch_mi);
  const strongerWind = seaState(alternative_wind_speed_mph, fetch_mi);
  return {
    adjusted_wind_ms: base.adjusted_wind_ms,
    dimensionless_fetch: base.dimensionless_fetch,
    fully_developed: base.fully_developed,
    wave_height_m: base.wave_height_m,
    wave_height_ft: base.wave_height_ft,
    peak_period_s: base.peak_period_s,
    duration_required_hr: base.duration_required_hr,
    alternative_fetch_height_ft: longerFetch.wave_height_ft,
    alternative_fetch_ratio: longerFetch.wave_height_ft / base.wave_height_ft,
    alternative_fetch_increase_pct: 100 * (longerFetch.wave_height_ft - base.wave_height_ft) / base.wave_height_ft,
    alternative_fetch_duration_hr: longerFetch.duration_required_hr,
    alternative_wind_height_ft: strongerWind.wave_height_ft,
    alternative_wind_increase_pct: 100 * (strongerWind.wave_height_ft - base.wave_height_ft) / base.wave_height_ft,
    wind_increase_pct: 100 * (alternative_wind_speed_mph - wind_speed_mph) / wind_speed_mph,
    fetch_increase_pct: 100 * (alternative_fetch_mi - fetch_mi) / fetch_mi,
    note: "This is a hindcast, not a forecast, and not a substitute for a measured record where one exists. The DURATION term is the one most often left out and frequently what governs: a fetch-limited height assumes the wind has blown long enough for the sea to fully develop over that distance, so a squall that lasts twenty minutes does not build the wave its speed and fetch would suggest. A contractor reading only the fetch-limited number overestimates short events and is caught out by sustained ones. Height goes as the SQUARE ROOT of fetch while wind enters far more strongly, which is why a short fetch in a gale is worse than a long fetch in a breeze -- and why marine workability decisions are made on the forecast wind rather than the site's geometry. Deep-water growth over a uniform fetch is assumed; shoaling, refraction, and any measured record govern.",
  };
}

const waveExample = { wind_speed_mph: 40, fetch_mi: 5, alternative_fetch_mi: 10, alternative_wind_speed_mph: 60 };
MARINE_RENDERERS["wave-height-fetch"] = _simpleRenderer({
  citation: "Citation: the Shore Protection Manual fetch-limited deep-water growth relations -- adjusted wind U_A = 0.71 U^1.23 (U in m/s), dimensionless fetch X = g F / U_A^2, significant height H_mo = 0.0016 sqrt(X) U_A^2 / g, peak period T_p = 0.2857 X^(1/3) U_A / g, and the wind duration t = 68.8 X^(2/3) U_A / g required to reach the fetch-limited height. A hindcast over a uniform deep-water fetch; a measured wave record, and shoaling and refraction at the site, govern.",
  example: waveExample,
  fields: [
    { key: "wind_speed_mph", label: "Wind speed (mph)" },
    { key: "fetch_mi", label: "Fetch length (miles)" },
    { key: "alternative_fetch_mi", label: "Alternative fetch (miles)" },
    { key: "alternative_wind_speed_mph", label: "Alternative wind speed (mph)" },
  ],
  outputs: [
    { key: "adjusted_wind_ms", id: "whf-ua", label: "Adjusted wind speed", value: (r) => fmt(r.adjusted_wind_ms, 2) + " m/s stress-equivalent, at a dimensionless fetch of " + fmt(r.dimensionless_fetch, 1) },
    { key: "wave_height_ft", id: "whf-h", label: "Significant wave height", unit: "ft", value: (r) => fmt(r.wave_height_ft, 1) + " ft (" + fmt(r.wave_height_m, 2) + " m)" + (r.fully_developed ? " -- a fully developed sea; more fetch adds nothing" : "") },
    { key: "peak_period_s", id: "whf-tp", label: "Peak period", unit: "s", value: (r) => fmt(r.peak_period_s, 1) + " s -- a short, steep sea is what an enclosed water produces" },
    { key: "duration_required_hr", id: "whf-dur", label: "Wind duration required", unit: "hours", value: (r) => fmt(r.duration_required_hr, 2) + " hours of sustained wind before that height is reached" },
    { key: "alternative_fetch_height_ft", id: "whf-fet", label: "At the alternative fetch", unit: "ft", value: (r) => fmt(r.alternative_fetch_height_ft, 1) + " ft -- " + fmt(r.alternative_fetch_increase_pct, 0) + "% taller for " + fmt(r.fetch_increase_pct, 0) + "% more fetch" },
    { key: "alternative_wind_height_ft", id: "whf-wind", label: "At the alternative wind", unit: "ft", value: (r) => fmt(r.alternative_wind_height_ft, 1) + " ft -- " + fmt(r.alternative_wind_increase_pct, 0) + "% taller for " + fmt(r.wind_increase_pct, 0) + "% more wind" },
    { key: "note", id: "whf-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeWaveHeightFetch,
});
