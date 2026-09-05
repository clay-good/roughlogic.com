// calc-trenchless.js -- Group E (cont.): trenchless, HDD, and utility
// locating bench.
//
// specs/scope-trade-expansion-2.md probed the live catalog for the vocabulary
// of thirty US trades and found trenchless work almost unserved: one
// first-order HDD pullback estimate and nothing else -- no bend radius, no
// drilling fluid, no frac-out screen, no locating discipline, no vacuum
// excavation, no pipe bursting, no CIPP.
//
// Tiles (all group "E", the existing Carpentry and Construction category):
//   v1597 hdd-bend-radius        v1601 vacuum-excavation-spoil
//   v1598 hdd-fluid-volume       v1602 pipe-bursting-pull-load
//   v1599 hdd-annular-pressure   v1603 cipp-liner-thickness
//   v1600 locate-depth-offset
//
// TWO SPECS OF THIS BAND WERE CUT as duplicates, and their new material
// landed on the calculators that already answered the question:
//   v1596 hdd-pullback-force -> `hdd-pullback` in calc-earthwork.js, which
//         gained the capstan relation and the rig-versus-pipe governing check.
//   v1604 sewer-scour-slope  -> `manning-slope` in calc-drainage.js, which
//         gained an entered scour velocity and an as-built slope check.
//
// See spec-v1596.md through spec-v1604.md.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied verbatim
// from the sibling calc-* modules; non-exported, no corpus row).
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

// Compact renderer factory (number inputs only here; same shape as the
// calc-rail.js / calc-mining.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const TRENCHLESS_RENDERERS = {};

// 7.48052 gallons per cubic foot, 42 gallons per oil barrel (5.615 cubic ft),
// 27 cubic ft per cubic yard, 144 square inches per square foot, water at
// 62.4 lb per cubic foot, and the 0.052 psi per foot per pound-per-gallon
// mud-column constant.
const _GAL_PER_CUFT = 7.48052;
const _CUFT_PER_BBL = 5.615;
const _CUFT_PER_CY = 27;
const _SQIN_PER_SQFT = 144;
const _WATER_PCF = 62.4;
const _PSI_PER_FT_PER_PPG = 0.052;

// ===================== spec-v1597: HDD minimum bend radius =====================

// dims: in { pipe_diameter_in: L, radius_per_inch_ft: dimensionless, rod_min_radius_ft: L, entry_angle_deg: dimensionless, required_depth_ft: L, available_setback_ft: L } out: { pipe_min_radius_ft: L, governing_radius_ft: L, sag_run_ft: L, sag_depth_ft: L, extra_run_to_depth_ft: L }
export function computeHddBendRadius({ pipe_diameter_in = 0, radius_per_inch_ft = 100, rod_min_radius_ft = 0, entry_angle_deg = 12, required_depth_ft = 0, available_setback_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_diameter_in > 0)) return { error: "Product pipe diameter must be positive." };
  if (!(radius_per_inch_ft > 0)) return { error: "Radius per inch of diameter must be positive." };
  if (!(rod_min_radius_ft > 0)) return { error: "Drill rod minimum radius must be positive." };
  if (!(entry_angle_deg > 0 && entry_angle_deg < 90)) return { error: "Entry angle must be in (0, 90) degrees." };
  if (!(required_depth_ft > 0)) return { error: "Required depth under the crossing must be positive." };
  if (!(available_setback_ft > 0)) return { error: "Available setback must be positive." };
  // The trade rule for steel is a radius in FEET of about 100 times the pipe
  // diameter in INCHES; HDPE is far more flexible and takes a much smaller
  // multiplier. Whichever of the pipe and the rod wants MORE radius governs.
  const pipe_min_radius_ft = radius_per_inch_ft * pipe_diameter_in;
  const governing_radius_ft = Math.max(pipe_min_radius_ft, rod_min_radius_ft);
  const governs = pipe_min_radius_ft >= rod_min_radius_ft ? "the product pipe" : "the drill rod";
  const theta = entry_angle_deg * Math.PI / 180;
  // Turning from the entry angle to horizontal on that radius consumes
  // R sin(theta) of horizontal run and gains R (1 - cos(theta)) of depth.
  const sag_run_ft = governing_radius_ft * Math.sin(theta);
  const sag_depth_ft = governing_radius_ft * (1 - Math.cos(theta));
  const depth_short_ft = Math.max(0, required_depth_ft - sag_depth_ft);
  // Any depth the sag bend does not reach is made up on the entry tangent,
  // which costs run at the entry angle.
  const extra_run_to_depth_ft = depth_short_ft / Math.tan(theta);
  const run_to_depth_ft = sag_run_ft + extra_run_to_depth_ft;
  const setback_ok = available_setback_ft >= run_to_depth_ft;
  return {
    pipe_min_radius_ft, governing_radius_ft, governs, sag_run_ft, sag_depth_ft,
    depth_short_ft, extra_run_to_depth_ft, run_to_depth_ft, setback_ok,
    rod_ratio: pipe_min_radius_ft / rod_min_radius_ft,
    setback_verdict: setback_ok
      ? "the entered setback reaches the required depth"
      : "SHORT -- reaching the required depth takes " + fmt(run_to_depth_ft - available_setback_ft, 0) + " ft more setback than is available, or a steeper entry and a tighter radius the pipe may not allow",
    note: "The rule that matters on a job is that the PIPE, not the rig, usually sets the radius -- and by a lot. A large steel pipe wants a radius of hundreds or thousands of feet where the drill rod may be happy at a hundred and fifty, and a path laid out on the rod's capability will bend the steel past its allowable stress during pullback, where the damage is not always visible. HDPE is the opposite case and it is why HDPE dominates smaller bores: it bends comfortably on a radius of twenty to forty times its own diameter, so the rod becomes the constraint again and the path can be much tighter. The consequence people underestimate is how much HORIZONTAL DISTANCE a large radius consumes. Turning from a twelve degree entry to horizontal on a thousand-foot radius takes over two hundred feet of run and puts the bore deeper than a short-radius path would, so the bend radius decides the entry setback, the depth under the crossing, and often whether the bore fits between the obstacles at all. That is a layout consequence, not a drilling one, and it is settled before anyone mobilises. This is geometry from published rules of thumb. It does not perform a pipe stress analysis, which is what actually establishes an allowable bend radius for a given wall, grade, and installation condition, and the multipliers differ by material, by manufacturer, and by whether the pipe is being bent during pullback or resting in the hole afterward. It does not design a bore path, evaluate the soil the path passes through, address surface obstructions, existing utilities, or the survey and steering that keeps the bit on the plan, and it does not evaluate pullback force. The pipe manufacturer, the drilling contractor, and the engineer of record govern.",
  };
}
const bendRadiusExample = { inputs: { pipe_diameter_in: 12.75, radius_per_inch_ft: 100, rod_min_radius_ft: 150, entry_angle_deg: 12, required_depth_ft: 25, available_setback_ft: 300 } };
TRENCHLESS_RENDERERS["hdd-bend-radius"] = _simpleRenderer({
  citation: "Citation: the trade rule that a steel product pipe's minimum bend radius in FEET is about 100 times its diameter in INCHES (HDPE roughly 20 to 40 times its own diameter), with the LARGEST of the pipe, rod and casing governing; sag-bend geometry from R sin(entry angle) of run and R (1 - cos(entry angle)) of depth. Geometry from rules of thumb; the pipe manufacturer and the engineer of record govern.",
  example: bendRadiusExample.inputs,
  fields: [
    { key: "pipe_diameter_in", label: "Product pipe outside diameter (in)", kind: "number", default: 12.75 },
    { key: "radius_per_inch_ft", label: "Radius rule (ft of radius per in of diameter)", kind: "number", default: 100 },
    { key: "rod_min_radius_ft", label: "Drill rod minimum radius (ft)", kind: "number", default: 150 },
    { key: "entry_angle_deg", label: "Entry angle (deg)", kind: "number", default: 12 },
    { key: "required_depth_ft", label: "Required depth under the crossing (ft)", kind: "number", default: 25 },
    { key: "available_setback_ft", label: "Available setback from the crossing (ft)", kind: "number", default: 300 },
  ],
  outputs: [
    { key: "p", id: "hbr-out-p", label: "Minimum radius the product pipe wants", value: (r) => fmt(r.pipe_min_radius_ft, 0) + " ft" },
    { key: "g", id: "hbr-out-g", label: "Governing radius", value: (r) => fmt(r.governing_radius_ft, 0) + " ft, set by " + r.governs + " (" + fmt(r.rod_ratio, 1) + " times the rod's own limit)" },
    { key: "s", id: "hbr-out-s", label: "Sag bend to horizontal", value: (r) => fmt(r.sag_run_ft, 0) + " ft of run, reaching " + fmt(r.sag_depth_ft, 1) + " ft deep" },
    { key: "d", id: "hbr-out-d", label: "Run to reach the required depth", value: (r) => fmt(r.run_to_depth_ft, 0) + " ft -- " + r.setback_verdict },
    { key: "n", id: "hbr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHddBendRadius,
});

// ===================== spec-v1598: HDD drilling fluid volume =====================

// dims: in { ream_diameter_in: L, pipe_diameter_in: L, bore_length_ft: L, fluid_multiplier: dimensionless, bentonite_lb_per_100gal: M L^-3, pump_rate_gpm: L^3 T^-1, returns_fraction_pct: dimensionless } out: { hole_volume_gal: L^3, annular_volume_gal: L^3, fluid_required_gal: L^3, bentonite_lb: M, pumping_time_min: T, spoil_gal: L^3 }
export function computeHddFluidVolume({ ream_diameter_in = 0, pipe_diameter_in = 0, bore_length_ft = 0, fluid_multiplier = 3, bentonite_lb_per_100gal = 40, pump_rate_gpm = 0, returns_fraction_pct = 70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ream_diameter_in > 0)) return { error: "Reamed hole diameter must be positive." };
  if (!(pipe_diameter_in > 0)) return { error: "Product pipe diameter must be positive." };
  if (!(pipe_diameter_in < ream_diameter_in)) return { error: "The product pipe must be smaller than the reamed hole." };
  if (!(bore_length_ft > 0)) return { error: "Bore length must be positive." };
  if (!(fluid_multiplier >= 1)) return { error: "Fluid multiplier must be at least 1." };
  if (!(bentonite_lb_per_100gal > 0)) return { error: "Bentonite mix rate must be positive." };
  if (!(pump_rate_gpm > 0)) return { error: "Pump rate must be positive." };
  if (!(returns_fraction_pct > 0 && returns_fraction_pct <= 100)) return { error: "Returns fraction must be in (0, 100] percent." };
  const d_ream_ft = ream_diameter_in / 12;
  const d_pipe_ft = pipe_diameter_in / 12;
  const hole_volume_cuft = Math.PI / 4 * d_ream_ft * d_ream_ft * bore_length_ft;
  const annular_volume_cuft = Math.PI / 4 * (d_ream_ft * d_ream_ft - d_pipe_ft * d_pipe_ft) * bore_length_ft;
  const hole_volume_gal = hole_volume_cuft * _GAL_PER_CUFT;
  const hole_volume_bbl = hole_volume_cuft / _CUFT_PER_BBL;
  const annular_volume_gal = annular_volume_cuft * _GAL_PER_CUFT;
  const annular_volume_bbl = annular_volume_cuft / _CUFT_PER_BBL;
  const fluid_required_gal = hole_volume_gal * fluid_multiplier;
  const bentonite_lb = fluid_required_gal / 100 * bentonite_lb_per_100gal;
  const pumping_time_min = fluid_required_gal / pump_rate_gpm;
  const returns_gal = fluid_required_gal * returns_fraction_pct / 100;
  const lost_to_formation_gal = fluid_required_gal - returns_gal;
  // Spoil for disposal is what comes back plus the cuttings the hole made.
  const spoil_gal = returns_gal + hole_volume_gal;
  const spoil_cy = spoil_gal / _GAL_PER_CUFT / _CUFT_PER_CY;
  return {
    hole_volume_cuft, hole_volume_gal, hole_volume_bbl,
    annular_volume_cuft, annular_volume_gal, annular_volume_bbl,
    fluid_required_gal, bentonite_lb, pumping_time_min,
    returns_gal, lost_to_formation_gal, spoil_gal, spoil_cy,
    tanker_loads: fluid_required_gal / 5000,
    note: "The hole volume itself is the small number; the fluid requirement is a MULTIPLE of it, because fluid is circulated, some is lost to the formation, and the hole is drilled and reamed more than once. Two to three times hole volume is a reasonable planning figure in cohesive ground and it climbs sharply in sand and gravel, where losses can be most of what is pumped -- and that difference is a mobilisation decision made from the geotechnical report rather than discovered on day two. The ANNULAR volume is the operationally useful one during pullback: it is the space between the reamed hole and the product pipe, and it is what the fluid has to fill and keep filled to carry cuttings and lubricate the pull. An annulus that is not full is an annulus that is packing off. Disposal is the part that gets underestimated on the estimate. Returns plus cuttings is a substantial volume of regulated waste, it has to be contained rather than allowed to run, and in most jurisdictions it cannot simply be spread -- so a bore that budgets for fluid and not for its disposal has budgeted for half the fluid cost. This is volume arithmetic on a uniform reamed hole. It does not design a mud program, which sets viscosity, gel strength, sand content, and the polymer and additive package for the specific soil, and those properties matter more to hole cleaning and to frac-out risk than the volume does. It does not model losses, which depend entirely on the formation, or size the mixing and recycling plant. It does not evaluate annular pressure or hole cleaning velocity. The mud engineer, the drilling contractor, and the disposal jurisdiction govern.",
  };
}
const fluidVolumeExample = { inputs: { ream_diameter_in: 20, pipe_diameter_in: 12.75, bore_length_ft: 900, fluid_multiplier: 3, bentonite_lb_per_100gal: 40, pump_rate_gpm: 120, returns_fraction_pct: 70 } };
TRENCHLESS_RENDERERS["hdd-fluid-volume"] = _simpleRenderer({
  citation: "Citation: hole volume = (pi / 4) x reamed diameter squared x length and annular volume the same on the difference of the squares, by name, at 7.48052 gallons per cubic foot and 5.615 cubic ft per barrel, with the fluid requirement a multiplier of hole volume entered from the soil (commonly 2 to 5). The mud engineer and the disposal jurisdiction govern.",
  example: fluidVolumeExample.inputs,
  fields: [
    { key: "ream_diameter_in", label: "Reamed hole diameter (in)", kind: "number", default: 20 },
    { key: "pipe_diameter_in", label: "Product pipe diameter (in)", kind: "number", default: 12.75 },
    { key: "bore_length_ft", label: "Bore length (ft)", kind: "number", default: 900 },
    { key: "fluid_multiplier", label: "Fluid volume multiplier for the soil", kind: "number", default: 3 },
    { key: "bentonite_lb_per_100gal", label: "Bentonite mix rate (lb per 100 gal)", kind: "number", default: 40 },
    { key: "pump_rate_gpm", label: "Pump rate (gpm)", kind: "number", default: 120 },
    { key: "returns_fraction_pct", label: "Fluid returning to the surface (%)", kind: "number", default: 70 },
  ],
  outputs: [
    { key: "h", id: "hfv-out-h", label: "Hole volume", value: (r) => fmt(r.hole_volume_gal, 0) + " gal (" + fmt(r.hole_volume_bbl, 0) + " bbl)" },
    { key: "a", id: "hfv-out-a", label: "Annular volume during pullback", value: (r) => fmt(r.annular_volume_gal, 0) + " gal (" + fmt(r.annular_volume_bbl, 0) + " bbl)" },
    { key: "f", id: "hfv-out-f", label: "Fluid required at the entered multiplier", value: (r) => fmt(r.fluid_required_gal, 0) + " gal, about " + fmt(r.tanker_loads, 1) + " tanker loads before any recycling" },
    { key: "b", id: "hfv-out-b", label: "Bentonite and pumping time", value: (r) => fmt(r.bentonite_lb, 0) + " lb, " + fmt(r.pumping_time_min, 0) + " min at the entered rate" },
    { key: "s", id: "hfv-out-s", label: "Spoil for disposal", value: (r) => fmt(r.spoil_gal, 0) + " gal (" + fmt(r.spoil_cy, 1) + " cu yd) -- returns plus cuttings, and " + fmt(r.lost_to_formation_gal, 0) + " gal stayed in the ground" },
    { key: "n", id: "hfv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHddFluidVolume,
});

// ===================== spec-v1599: HDD annular pressure and frac-out screen =====================

// dims: in { cover_depth_ft: L, shallow_cover_ft: L, soil_unit_weight_pcf: M L^-3, soil_cohesion_psf: M L^-1 T^-2, fluid_density_ppg: M L^-3, annular_friction_psi: M L^-1 T^-2, required_fs: dimensionless } out: { overburden_psi: M L^-1 T^-2, hydrostatic_psi: M L^-1 T^-2, annular_pressure_psi: M L^-1 T^-2, limiting_psi: M L^-1 T^-2, factor_of_safety: dimensionless, max_fluid_density_ppg: M L^-3 }
export function computeHddAnnularPressure({ cover_depth_ft = 0, shallow_cover_ft = 0, soil_unit_weight_pcf = 0, soil_cohesion_psf = 0, fluid_density_ppg = 0, annular_friction_psi = 0, required_fs = 1.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cover_depth_ft > 0)) return { error: "Cover depth must be positive." };
  if (!(shallow_cover_ft > 0)) return { error: "Shallow-station cover must be positive." };
  if (!(shallow_cover_ft <= cover_depth_ft)) return { error: "The shallow station cannot be deeper than the deep one." };
  if (!(soil_unit_weight_pcf > 0)) return { error: "Soil unit weight must be positive." };
  if (!(soil_cohesion_psf >= 0)) return { error: "Soil cohesion cannot be negative." };
  if (!(fluid_density_ppg > 0)) return { error: "Drilling fluid density must be positive." };
  if (!(annular_friction_psi >= 0)) return { error: "Annular friction cannot be negative." };
  if (!(required_fs > 0)) return { error: "Required factor of safety must be positive." };
  const at = (depth) => {
    const overburden_psi = soil_unit_weight_pcf * depth / _SQIN_PER_SQFT;
    const hydrostatic_psi = _PSI_PER_FT_PER_PPG * fluid_density_ppg * depth;
    const annular_pressure_psi = hydrostatic_psi + annular_friction_psi;
    // A simple screen: the soil resists with its overburden pressure plus a
    // cohesion contribution. The real limiting pressure comes from a cavity
    // expansion relation.
    const limiting_psi = overburden_psi + soil_cohesion_psf / _SQIN_PER_SQFT;
    return { overburden_psi, hydrostatic_psi, annular_pressure_psi, limiting_psi, factor_of_safety: limiting_psi / annular_pressure_psi };
  };
  const deep = at(cover_depth_ft);
  const shallow = at(shallow_cover_ft);
  // The maximum fluid density that holds the required factor of safety at the
  // SHALLOW station, which is where the margin is thinnest.
  const allowed_pressure_psi = shallow.limiting_psi / required_fs;
  const max_fluid_density_ppg = (allowed_pressure_psi - annular_friction_psi) / (_PSI_PER_FT_PER_PPG * shallow_cover_ft);
  const max_friction_psi = allowed_pressure_psi - shallow.hydrostatic_psi;
  return {
    overburden_psi: deep.overburden_psi,
    hydrostatic_psi: deep.hydrostatic_psi,
    annular_pressure_psi: deep.annular_pressure_psi,
    limiting_psi: deep.limiting_psi,
    factor_of_safety: deep.factor_of_safety,
    shallow_overburden_psi: shallow.overburden_psi,
    shallow_annular_pressure_psi: shallow.annular_pressure_psi,
    shallow_limiting_psi: shallow.limiting_psi,
    shallow_factor_of_safety: shallow.factor_of_safety,
    max_fluid_density_ppg: Math.max(0, max_fluid_density_ppg),
    max_friction_psi,
    deep_ok: deep.factor_of_safety >= required_fs,
    shallow_ok: shallow.factor_of_safety >= required_fs,
    governing_station: "the shallow station",
    verdict: shallow.factor_of_safety >= required_fs
      ? "the shallow station holds the required factor of safety"
      : "the SHALLOW station is below the required factor of safety -- that is where a frac-out starts, not at the deepest point under the crossing",
    note: "The mechanism is hydraulic fracture. The fluid in the annulus has a pressure; the soil above it has a strength and a weight. When the fluid pressure exceeds what the soil can resist, it opens a path and follows it, and the path usually goes up. Because the resisting pressure grows with depth, THE DANGER IS ALWAYS AT THE SHALLOW PARTS OF A BORE -- the entry, the exit, and any high point -- not at the deepest point under the crossing, which is where people instinctively worry and where the margin is largest. Annular pressure is not just the mud column. Friction along the annulus adds to it, and that friction rises with pump rate, with a viscous fluid, and with a hole that is not clean and is loading up with cuttings. So a bore that was fine on the pilot can frac out during reaming, when the annulus is smaller relative to the flow and the cuttings load is higher. The practical controls follow directly: keep the pump rate no higher than hole cleaning requires, keep the fluid properties right, ream in stages rather than one large pass, and maintain the deepest practical profile through the sensitive zone. Monitoring for returns at the surface during the bore is the last line, not the plan. This is a SCREEN using a simple overburden-plus-cohesion resistance. The real limiting pressure comes from a cavity expansion relation -- the Delft or Luger approach -- driven by the soil's strength and stiffness rather than its weight alone, and a bore near sensitive receptors deserves that analysis rather than this one. The annular friction term is entered because it comes from the mud program and the hole geometry, and it is the term that changes most between the pilot and the ream. It does not model the fluid rheology, the cuttings load, or the profile between the stations entered. The drilling contractor, the mud engineer, and the geotechnical engineer of record govern.",
  };
}
const annularPressureExample = { inputs: { cover_depth_ft: 30, shallow_cover_ft: 8, soil_unit_weight_pcf: 120, soil_cohesion_psf: 600, fluid_density_ppg: 9.5, annular_friction_psi: 15, required_fs: 1.5 } };
TRENCHLESS_RENDERERS["hdd-annular-pressure"] = _simpleRenderer({
  citation: "Citation: annular pressure = the mud column at 0.052 psi per foot per pound-per-gallon plus the annular friction loss, screened against a soil resistance of the overburden pressure plus a cohesion term, by name. A screen: the real limiting pressure comes from a cavity-expansion relation (the Delft or Luger approach), and the geotechnical engineer of record governs.",
  example: annularPressureExample.inputs,
  fields: [
    { key: "cover_depth_ft", label: "Cover at the deep station (ft)", kind: "number", default: 30 },
    { key: "shallow_cover_ft", label: "Cover at the shallowest station (ft)", kind: "number", default: 8 },
    { key: "soil_unit_weight_pcf", label: "Soil unit weight (lb per cu ft)", kind: "number", default: 120 },
    { key: "soil_cohesion_psf", label: "Soil cohesion (psf)", kind: "number", default: 600 },
    { key: "fluid_density_ppg", label: "Drilling fluid density (lb per gal)", kind: "number", default: 9.5 },
    { key: "annular_friction_psi", label: "Annular friction loss (psi)", kind: "number", default: 15 },
    { key: "required_fs", label: "Required factor of safety", kind: "number", default: 1.5 },
  ],
  outputs: [
    { key: "d", id: "hap-out-d", label: "At the deep station", value: (r) => fmt(r.annular_pressure_psi, 1) + " psi against " + fmt(r.limiting_psi, 1) + " psi resisting, FS " + fmt(r.factor_of_safety, 2) },
    { key: "s", id: "hap-out-s", label: "At the shallow station", value: (r) => fmt(r.shallow_annular_pressure_psi, 1) + " psi against " + fmt(r.shallow_limiting_psi, 1) + " psi, FS " + fmt(r.shallow_factor_of_safety, 2) },
    { key: "v", id: "hap-out-v", label: "Where a frac-out starts", value: (r) => r.verdict },
    { key: "m", id: "hap-out-m", label: "Fluid density the shallow station allows", value: (r) => fmt(r.max_fluid_density_ppg, 2) + " lb per gal at the entered friction" },
    { key: "f", id: "hap-out-f", label: "Annular friction the shallow station allows", value: (r) => fmt(r.max_friction_psi, 1) + " psi -- this is the term that rises when reaming" },
    { key: "n", id: "hap-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHddAnnularPressure,
});

// ===================== spec-v1600: electromagnetic locate depth check =====================

// dims: in { instrument_depth_in: L, half_signal_offset_in: L, left_null_in: L, right_null_in: L, current_near_ma: I, current_far_ma: I, sharp_drop_pct: dimensionless } out: { geometric_depth_in: L, depth_difference_in: L, depth_disagreement_pct: dimensionless, null_asymmetry_pct: dimensionless, current_drop_pct: dimensionless }
export function computeLocateDepthOffset({ instrument_depth_in = 0, half_signal_offset_in = 0, left_null_in = 0, right_null_in = 0, current_near_ma = 0, current_far_ma = 0, sharp_drop_pct = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(instrument_depth_in > 0)) return { error: "Instrument depth reading must be positive." };
  if (!(half_signal_offset_in > 0)) return { error: "Half-signal offset must be positive." };
  if (!(left_null_in > 0)) return { error: "Left null offset must be positive." };
  if (!(right_null_in > 0)) return { error: "Right null offset must be positive." };
  if (!(current_near_ma > 0)) return { error: "Signal current at the near point must be positive." };
  if (!(current_far_ma > 0)) return { error: "Signal current at the far point must be positive." };
  if (!(current_far_ma <= current_near_ma)) return { error: "Signal current cannot rise along the line away from the transmitter." };
  if (!(sharp_drop_pct > 0 && sharp_drop_pct <= 100)) return { error: "The sharp-drop threshold must be in (0, 100] percent." };
  // The 45-degree method: the horizontal offset at which the signal halves
  // equals the depth, independently of the instrument's own computation.
  const geometric_depth_in = half_signal_offset_in;
  const depth_difference_in = geometric_depth_in - instrument_depth_in;
  const depth_disagreement_pct = Math.abs(depth_difference_in) / instrument_depth_in * 100;
  const null_asymmetry_in = Math.abs(left_null_in - right_null_in);
  const null_asymmetry_pct = null_asymmetry_in / ((left_null_in + right_null_in) / 2) * 100;
  const current_drop_pct = (current_near_ma - current_far_ma) / current_near_ma * 100;
  const depth_agrees = depth_disagreement_pct <= 10;
  const nulls_symmetric = null_asymmetry_pct <= 10;
  const current_gradual = current_drop_pct <= sharp_drop_pct;
  const reads_shallow = depth_difference_in > 0;
  const confident = depth_agrees && nulls_symmetric && current_gradual;
  const cause = confident ? "the checks agree, so both readings are probably right"
    : !current_gradual ? "the signal current dropped sharply -- it has likely left the target and coupled onto something else, and everything located beyond that point may be a different utility"
      : !nulls_symmetric ? "the nulls are asymmetric about the peak, which means a distorted field -- a second utility, a rebar mat, or a poorly grounded return"
        : reads_shallow ? "the instrument reads SHALLOWER than the geometry says, which is the dangerous direction: it tells an excavator there is more cover than there is"
          : "the instrument reads deeper than the geometry says; the field is distorted and the locate should not be trusted at any depth";
  return {
    geometric_depth_in, depth_difference_in, depth_disagreement_pct,
    null_asymmetry_in, null_asymmetry_pct, current_drop_pct,
    depth_agrees, nulls_symmetric, current_gradual, reads_shallow, confident, cause,
    note: "The instrument's depth readout is a computation from field strength, and it assumes a single isolated conductor. Put a second utility nearby, a rebar mat overhead, or a poorly grounded signal return in the picture and the field is no longer that of an isolated line, so the computed depth is wrong -- usually SHALLOW, which is the dangerous direction because it makes an excavator believe there is more cover than there is. The 45-degree check is the discipline that catches it. Move perpendicular to the line until the signal drops by half; the horizontal distance moved equals the depth, independently of the instrument's own depth calculation. If the two agree, both are probably right. If they disagree, the field is distorted and the locate should not be trusted at any depth. Null symmetry is the second check and it is free: the response nulls to either side of the peak, and the two nulls should sit at equal offsets. Asymmetry means the field is being pulled by something. Signal current is the third. A locator that reads current should show it decreasing GRADUALLY along the line; a sharp drop means the signal has left the target and coupled onto something else, and everything located beyond that point may be a different utility entirely -- which is how a crew ends up potholing confidently in the wrong place. None of this replaces exposing the utility, which is what actually establishes position and depth, and none of it is a substitute for the one-call notification and the locate marks a facility owner is responsible for. Frequency selection, sonde work, and passive locating follow different rules. The utility owner, the one-call system, and the applicable damage prevention law govern.",
  };
}
const locateExample = { inputs: { instrument_depth_in: 52, half_signal_offset_in: 71, left_null_in: 34, right_null_in: 52, current_near_ma: 42, current_far_ma: 19, sharp_drop_pct: 25 } };
TRENCHLESS_RENDERERS["locate-depth-offset"] = _simpleRenderer({
  citation: "Citation: the 45-degree locating method by name -- the horizontal offset at which the signal halves equals the depth, computed independently of the instrument's own readout -- with the null-symmetry and signal-current-gradient checks named as the distortion diagnostics. Exposing the utility is what establishes position and depth; the utility owner and the applicable damage prevention law govern.",
  example: locateExample.inputs,
  fields: [
    { key: "instrument_depth_in", label: "Instrument depth readout (in)", kind: "number", default: 52 },
    { key: "half_signal_offset_in", label: "Offset where the signal halves (in)", kind: "number", default: 71 },
    { key: "left_null_in", label: "Left null offset from the peak (in)", kind: "number", default: 34 },
    { key: "right_null_in", label: "Right null offset from the peak (in)", kind: "number", default: 52 },
    { key: "current_near_ma", label: "Signal current near the transmitter (mA)", kind: "number", default: 42 },
    { key: "current_far_ma", label: "Signal current further along (mA)", kind: "number", default: 19 },
    { key: "sharp_drop_pct", label: "Current drop that counts as sharp (%)", kind: "number", default: 25 },
  ],
  outputs: [
    { key: "d", id: "ldo-out-d", label: "Depth by the 45-degree method", value: (r) => fmt(r.geometric_depth_in, 0) + " in against the instrument's reading, a " + fmt(r.depth_disagreement_pct, 0) + "% disagreement" },
    { key: "s", id: "ldo-out-s", label: "Null symmetry", value: (r) => fmt(r.null_asymmetry_in, 0) + " in apart, " + fmt(r.null_asymmetry_pct, 0) + "% -- " + (r.nulls_symmetric ? "symmetric" : "ASYMMETRIC, so the field is distorted") },
    { key: "c", id: "ldo-out-c", label: "Signal current along the line", value: (r) => fmt(r.current_drop_pct, 0) + "% drop -- " + (r.current_gradual ? "gradual" : "SHARP, so the signal may have left the target") },
    { key: "v", id: "ldo-out-v", label: "Confidence", value: (r) => (r.confident ? "the locate is consistent: " : "DO NOT TRUST THIS LOCATE -- ") + r.cause },
    { key: "n", id: "ldo-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLocateDepthOffset,
});

// ===================== spec-v1601: vacuum excavation spoil and tank fills =====================

// dims: in { pit_length_ft: L, pit_width_ft: L, pit_depth_ft: L, pit_count: dimensionless, swell_pct: dimensionless, water_added_gal: L^3, tank_capacity_cy: L^3, haul_round_trip_min: T } out: { bank_cy_each: L^3, bank_cy_total: L^3, loose_cy_total: L^3, tank_fills: dimensionless, pits_per_fill: dimensionless, haul_time_min: T }
export function computeVacuumExcavationSpoil({ pit_length_ft = 0, pit_width_ft = 0, pit_depth_ft = 0, pit_count = 1, swell_pct = 30, water_added_gal = 0, tank_capacity_cy = 0, haul_round_trip_min = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pit_length_ft > 0)) return { error: "Pit length must be positive." };
  if (!(pit_width_ft > 0)) return { error: "Pit width must be positive." };
  if (!(pit_depth_ft > 0)) return { error: "Pit depth must be positive." };
  if (!(pit_count >= 1)) return { error: "Pit count must be at least 1." };
  if (!(swell_pct >= 0)) return { error: "Swell cannot be negative." };
  if (!(water_added_gal >= 0)) return { error: "Water added cannot be negative." };
  if (!(tank_capacity_cy > 0)) return { error: "Spoil tank capacity must be positive." };
  if (!(haul_round_trip_min > 0)) return { error: "Haul round trip time must be positive." };
  const bank_cy_each = pit_length_ft * pit_width_ft * pit_depth_ft / _CUFT_PER_CY;
  const bank_cy_total = bank_cy_each * pit_count;
  const swelled_cy = bank_cy_total * (1 + swell_pct / 100);
  const water_cy = water_added_gal / _GAL_PER_CUFT / _CUFT_PER_CY;
  const loose_cy_total = swelled_cy + water_cy;
  const tank_fills = Math.ceil(loose_cy_total / tank_capacity_cy);
  const pits_per_fill = tank_capacity_cy / (loose_cy_total / pit_count);
  const first_pit_tank_pct = (bank_cy_each * (1 + swell_pct / 100) + water_cy / pit_count) / tank_capacity_cy * 100;
  const haul_time_min = tank_fills * haul_round_trip_min;
  return {
    bank_cy_each, bank_cy_total, swelled_cy, water_cy, loose_cy_total,
    tank_fills, pits_per_fill, first_pit_tank_pct, haul_time_min,
    haul_time_hr: haul_time_min / 60,
    bank_only_fills: Math.ceil(bank_cy_total / tank_capacity_cy),
    note: "The individual pothole is small and the day's total is not. A keyhole to five feet is a fraction of a cubic yard, but a day of potholing a corridor is thirty of them plus the test pits, and the tank fills up in the middle of the afternoon a long way from the dump site. SWELL IS WHAT MAKES THE TANK FILL SOONER than the arithmetic suggests. Soil excavated from a compacted bank occupies substantially more volume loose -- twenty to forty percent for most soils -- and a wet vacuum system adds the water used to cut, so the material going into the tank can be well over half again the in-place volume. Planning on bank volume produces a schedule that is optimistic by exactly that margin, and the tank-fill count computed both ways is printed so the difference is visible rather than discovered. Disposal is the variable that changes the number most. Spoil that can go back in the hole is a short cycle; spoil that must be hauled because it is slurry, because it is contaminated, or because the jurisdiction does not permit returning it, is a haul cycle per tank and a completely different day -- which is why the haul time is reported against the fills rather than left implicit. This is volume arithmetic on prismatic pits. It does not evaluate whether spoil may be returned to the excavation or must be hauled, which is a jurisdictional and contamination question, and it does not address the classification, containment, or disposal of slurry, which in many places is a regulated waste stream. It does not size the vacuum unit, address water supply and pressure for wet cutting, or evaluate the soil's suitability for vacuum excavation. It does not replace exposing a utility as the way to establish its position, nor the one-call notification that must precede any of it. The utility owner, the one-call system, the applicable damage prevention law, and the disposal jurisdiction govern.",
  };
}
const vacuumSpoilExample = { inputs: { pit_length_ft: 8, pit_width_ft: 4, pit_depth_ft: 5, pit_count: 1, swell_pct: 30, water_added_gal: 0, tank_capacity_cy: 12, haul_round_trip_min: 75 } };
TRENCHLESS_RENDERERS["vacuum-excavation-spoil"] = _simpleRenderer({
  citation: "Citation: prismatic bank volume at 27 cubic ft per cubic yard, grossed by an entered swell factor (commonly 20 to 40%) and by any water added for wet cutting at 7.48052 gallons per cubic foot, against the spoil tank's capacity. The disposal jurisdiction and the applicable damage prevention law govern.",
  example: vacuumSpoilExample.inputs,
  fields: [
    { key: "pit_length_ft", label: "Pit length (ft)", kind: "number", default: 8 },
    { key: "pit_width_ft", label: "Pit width (ft)", kind: "number", default: 4 },
    { key: "pit_depth_ft", label: "Pit depth (ft)", kind: "number", default: 5 },
    { key: "pit_count", label: "Pits or potholes", kind: "number", default: 1 },
    { key: "swell_pct", label: "Soil swell (%)", kind: "number", default: 30 },
    { key: "water_added_gal", label: "Water added for wet cutting (gal)", kind: "number", default: 0 },
    { key: "tank_capacity_cy", label: "Spoil tank capacity (cu yd)", kind: "number", default: 12 },
    { key: "haul_round_trip_min", label: "Haul round trip (min)", kind: "number", default: 75 },
  ],
  outputs: [
    { key: "b", id: "ves-out-b", label: "Bank volume", value: (r) => fmt(r.bank_cy_each, 2) + " cu yd each, " + fmt(r.bank_cy_total, 2) + " cu yd for the day" },
    { key: "l", id: "ves-out-l", label: "Loose volume into the tank", value: (r) => fmt(r.loose_cy_total, 2) + " cu yd (swell plus " + fmt(r.water_cy, 2) + " cu yd of water)" },
    { key: "t", id: "ves-out-t", label: "Tank fills", value: (r) => fmt(r.tank_fills, 0) + " -- bank volume alone would have said " + fmt(r.bank_only_fills, 0) },
    { key: "p", id: "ves-out-p", label: "Pits per tank fill", value: (r) => fmt(r.pits_per_fill, 1) + " (the first pit alone is " + fmt(r.first_pit_tank_pct, 0) + "% of the tank)" },
    { key: "h", id: "ves-out-h", label: "Haul time if the spoil cannot go back", value: (r) => fmt(r.haul_time_min, 0) + " min (" + fmt(r.haul_time_hr, 1) + " hr) of round trips" },
    { key: "n", id: "ves-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVacuumExcavationSpoil,
});

// ===================== spec-v1602: pipe bursting displacement and pull load =====================

// dims: in { old_diameter_in: L, new_diameter_in: L, run_length_ft: L, cover_depth_ft: L, expansion_force_lb_per_sqin: M L^-1 T^-2, drag_lb_per_ft: M L^-1 T^-2, pipe_safe_pull_lb: M L T^-2, adjacent_utility_ft: L } out: { displaced_area_sqin: L^2, displaced_cy: L^3, upsize_ratio: dimensionless, pull_load_lb: M L T^-2, influence_radius_ft: L }
export function computePipeBurstingPullLoad({ old_diameter_in = 0, new_diameter_in = 0, run_length_ft = 0, cover_depth_ft = 0, expansion_force_lb_per_sqin = 400, drag_lb_per_ft = 15, pipe_safe_pull_lb = 0, adjacent_utility_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(old_diameter_in > 0)) return { error: "Existing pipe diameter must be positive." };
  if (!(new_diameter_in > old_diameter_in)) return { error: "The new pipe must be larger than the one being burst." };
  if (!(run_length_ft > 0)) return { error: "Run length must be positive." };
  if (!(cover_depth_ft > 0)) return { error: "Depth of cover must be positive." };
  if (!(expansion_force_lb_per_sqin > 0)) return { error: "Expansion force per square inch of displaced area must be positive." };
  if (!(drag_lb_per_ft >= 0)) return { error: "Drag per foot cannot be negative." };
  if (!(pipe_safe_pull_lb > 0)) return { error: "Product pipe safe pull must be positive." };
  if (!(adjacent_utility_ft > 0)) return { error: "Distance to the nearest parallel utility must be positive." };
  const displaced_area_sqin = Math.PI / 4 * (new_diameter_in * new_diameter_in - old_diameter_in * old_diameter_in);
  const displaced_area_sqft = displaced_area_sqin / _SQIN_PER_SQFT;
  const displaced_cuft = displaced_area_sqft * run_length_ft;
  const displaced_cy = displaced_cuft / _CUFT_PER_CY;
  const upsize_ratio = new_diameter_in / old_diameter_in;
  const expansion_force_lb = displaced_area_sqin * expansion_force_lb_per_sqin;
  const drag_lb = drag_lb_per_ft * run_length_ft;
  const pull_load_lb = expansion_force_lb + drag_lb;
  const pull_margin_lb = pipe_safe_pull_lb - pull_load_lb;
  const pull_ok = pipe_safe_pull_lb >= pull_load_lb;
  // Heave screen: the shallower the cover relative to the new pipe, the more
  // of the displacement reaches the surface. Cover of at least a few
  // diameters is the conventional comfort.
  const cover_to_diameter = cover_depth_ft * 12 / new_diameter_in;
  const heave_risk = cover_to_diameter < 4;
  // A conventional influence zone is a few diameters either side.
  const influence_radius_ft = 3 * new_diameter_in / 12;
  const utility_at_risk = adjacent_utility_ft <= influence_radius_ft;
  return {
    displaced_area_sqin, displaced_area_sqft, displaced_cuft, displaced_cy, upsize_ratio,
    expansion_force_lb, drag_lb, pull_load_lb, pull_margin_lb, pull_ok,
    cover_to_diameter, heave_risk, influence_radius_ft, utility_at_risk,
    pull_verdict: pull_ok ? "within the product pipe's safe pull" : "OVER the product pipe's safe pull",
    heave_verdict: heave_risk
      ? "SHALLOW -- at this cover the displacement will show at the surface"
      : "the cover is deep enough for the displacement to dissipate in ordinary soil",
    utility_verdict: utility_at_risk
      ? "the nearest parallel utility is INSIDE the influence zone -- locate it, expose it where necessary, and monitor during the pull"
      : "the nearest parallel utility is outside the nominal influence zone, which is not the same as safe",
    note: "The soil has to go somewhere. Replacing a pipe with a larger one forces the difference in cross-section outward into the surrounding ground, and in dense or shallow soil that displacement appears at the surface as heave or sideways as movement of whatever else is buried nearby. That is why the UPSIZE RATIO, not the absolute size, is the number that matters, and why depth of cover is the principal control on whether a burst is safe: the same displacement that dissipates under seven feet of cover will show under three feet of a street. The pull load has two parts and both grow with upsize. The bursting head has to expand the ground, which takes a force rising sharply with the displaced area, and the new pipe then drags through the expanded hole. As with directional drilling, the PIPE's safe pull rather than the rig's rated pull is usually the governing limit on HDPE, and a pipe pulled beyond its limit may stretch, fail later, or fail its pressure test rather than parting on the spot. The adjacent-utility question is the one that stops jobs. A gas service running parallel a few feet away can be displaced enough to fail, and that risk is assessed before the burst by locating everything nearby and, where necessary, exposing it and monitoring during the pull -- not by any pull load calculation. The expansion force per unit of displaced area and the drag per foot are entered because they depend entirely on the soil, and they are the terms a contractor calibrates from experience on similar ground rather than computing. This does not size the bursting head, the rig, or the rod string, evaluate the host pipe's burstability -- ductile iron and some repaired sections do not burst cleanly -- or address the launch and receiving pits, service reconnections, or the bypass. The bursting contractor, the product pipe manufacturer, and the utility owners of everything nearby govern.",
  };
}
const pipeBurstingExample = { inputs: { old_diameter_in: 6, new_diameter_in: 8, run_length_ft: 300, cover_depth_ft: 7, expansion_force_lb_per_sqin: 400, drag_lb_per_ft: 15, pipe_safe_pull_lb: 20000, adjacent_utility_ft: 3 } };
TRENCHLESS_RENDERERS["pipe-bursting-pull-load"] = _simpleRenderer({
  citation: "Citation: the displaced annular area (pi / 4)(new diameter squared - old diameter squared) forced into the surrounding soil, with an indicative pull load of an expansion force per square inch of displaced area plus a drag per foot -- both entered, because they depend entirely on the soil. The bursting contractor and the utility owners of everything nearby govern.",
  example: pipeBurstingExample.inputs,
  fields: [
    { key: "old_diameter_in", label: "Existing pipe diameter (in)", kind: "number", default: 6 },
    { key: "new_diameter_in", label: "New pipe diameter (in)", kind: "number", default: 8 },
    { key: "run_length_ft", label: "Run length (ft)", kind: "number", default: 300 },
    { key: "cover_depth_ft", label: "Depth of cover (ft)", kind: "number", default: 7 },
    { key: "expansion_force_lb_per_sqin", label: "Expansion force (lb per sq in displaced)", kind: "number", default: 400 },
    { key: "drag_lb_per_ft", label: "Product pipe drag (lb per ft)", kind: "number", default: 15 },
    { key: "pipe_safe_pull_lb", label: "Product pipe safe pull (lb)", kind: "number", default: 20000 },
    { key: "adjacent_utility_ft", label: "Distance to the nearest parallel utility (ft)", kind: "number", default: 3 },
  ],
  outputs: [
    { key: "d", id: "pbp-out-d", label: "Soil displaced", value: (r) => fmt(r.displaced_area_sqin, 1) + " sq in per foot, " + fmt(r.displaced_cy, 2) + " cu yd over the run" },
    { key: "u", id: "pbp-out-u", label: "Upsize ratio", value: (r) => fmt(r.upsize_ratio, 2) + " to 1" },
    { key: "p", id: "pbp-out-p", label: "Indicative pull load", value: (r) => fmt(r.pull_load_lb, 0) + " lb (" + fmt(r.expansion_force_lb, 0) + " expansion, " + fmt(r.drag_lb, 0) + " drag) -- " + r.pull_verdict },
    { key: "h", id: "pbp-out-h", label: "Heave screen", value: (r) => fmt(r.cover_to_diameter, 1) + " diameters of cover -- " + r.heave_verdict },
    { key: "a", id: "pbp-out-a", label: "Adjacent utility", value: (r) => "influence zone about " + fmt(r.influence_radius_ft, 1) + " ft; " + r.utility_verdict },
    { key: "n", id: "pbp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePipeBurstingPullLoad,
});

// ===================== spec-v1603: CIPP liner thickness (ASTM F1216) =====================

// dims: in { host_id_in: L, ovality_pct: dimensionless, groundwater_head_ft: L, long_term_modulus_psi: M L^-1 T^-2, short_term_modulus_psi: M L^-1 T^-2, enhancement_factor: dimensionless, safety_factor: dimensionless, alternative_ovality_pct: dimensionless } out: { external_pressure_psi: M L^-1 T^-2, ovality_factor: dimensionless, dimension_ratio: dimensionless, thickness_in: L, short_term_thickness_in: L, alternative_thickness_in: L }
export function computeCippLinerThickness({ host_id_in = 0, ovality_pct = 0, groundwater_head_ft = 0, long_term_modulus_psi = 0, short_term_modulus_psi = 0, enhancement_factor = 7, safety_factor = 2, alternative_ovality_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(host_id_in > 0)) return { error: "Host pipe inside diameter must be positive." };
  if (!(ovality_pct >= 0 && ovality_pct < 100)) return { error: "Ovality must be in [0, 100) percent." };
  if (!(alternative_ovality_pct >= 0 && alternative_ovality_pct < 100)) return { error: "Alternative ovality must be in [0, 100) percent." };
  if (!(groundwater_head_ft > 0)) return { error: "Groundwater head must be positive." };
  if (!(long_term_modulus_psi > 0)) return { error: "Long-term flexural modulus must be positive." };
  if (!(short_term_modulus_psi > 0)) return { error: "Short-term flexural modulus must be positive." };
  if (!(short_term_modulus_psi >= long_term_modulus_psi)) return { error: "The short-term modulus cannot be below the long-term one -- creep reduces it." };
  if (!(enhancement_factor > 0)) return { error: "Soil support enhancement factor must be positive." };
  if (!(safety_factor > 0)) return { error: "Safety factor must be positive." };
  // ASTM F1216 X1.1, the partially deteriorated (groundwater buckling) case,
  // with Poisson's ratio 0.3. The ovality reduction factor C falls steeply
  // with out-of-roundness.
  const NU = 0.3;
  const external_pressure_psi = groundwater_head_ft * _WATER_PCF / _SQIN_PER_SQFT;
  const ovalityFactor = (q) => Math.pow((1 - q / 100) / Math.pow(1 + q / 100, 2), 3);
  const drFor = (modulus, q) => 1 + Math.cbrt(2 * enhancement_factor * modulus * ovalityFactor(q) / ((1 - NU * NU) * safety_factor * external_pressure_psi));
  const ovality_factor = ovalityFactor(ovality_pct);
  const dimension_ratio = drFor(long_term_modulus_psi, ovality_pct);
  const thickness_in = host_id_in / dimension_ratio;
  const short_term_thickness_in = host_id_in / drFor(short_term_modulus_psi, ovality_pct);
  const alternative_thickness_in = host_id_in / drFor(long_term_modulus_psi, alternative_ovality_pct);
  const round_thickness_in = host_id_in / drFor(long_term_modulus_psi, 0);
  const creep_penalty_pct = (thickness_in / short_term_thickness_in - 1) * 100;
  const ovality_penalty_pct = (thickness_in / round_thickness_in - 1) * 100;
  return {
    external_pressure_psi, ovality_factor, dimension_ratio, thickness_in,
    short_term_thickness_in, alternative_thickness_in, round_thickness_in,
    creep_penalty_pct, ovality_penalty_pct,
    note: "The two design cases are not variations on a theme. In the PARTIALLY DETERIORATED case, which is what this computes, the host pipe is still structurally sound and the liner's only job is to resist external groundwater pressure trying to buckle it inward, so the thickness comes out modest. In the FULLY DETERIORATED case the host is assumed gone and the liner is the pipe, carrying soil load, live load and groundwater as a standalone structure -- a much thicker section, a different relation, and one that needs the soil modulus, the live load and the water buoyancy factor as inputs; it is deliberately not computed here rather than approximated. Choosing the case is an engineering judgment about the host pipe's condition, made from a CCTV survey and the pipe's history rather than from a preference. Two inputs dominate the buckling case. OVALITY is the first: an out-of-round host reduces the liner's buckling resistance steeply, because the reduction factor goes as the cube of a term that falls with out-of-roundness, so a few percent of ovality costs real thickness -- and ovality is measured rather than assumed. The second is the MODULUS, and the trap there is time. CIPP creeps, so the fifty-year modulus is roughly half the short-term value, and a design run on the short-term number is unconservative by a large margin; both are computed here so the penalty is visible rather than argued. Groundwater head is the load, and it is taken at the highest credible level rather than at the level on the day of the survey. This is one equation from one design case. It does not select a resin or liner system, address the wet-out, cure, and cool-down that determine whether the installed liner has the modulus the design assumed, evaluate the host pipe's condition, handle bends, laterals, or changes in section, or address the field testing and sampling that verify the finished product. ASTM F1216, the liner manufacturer's tested properties, and the design engineer govern.",
  };
}
const cippExample = { inputs: { host_id_in: 24, ovality_pct: 3, groundwater_head_ft: 12, long_term_modulus_psi: 125000, short_term_modulus_psi: 250000, enhancement_factor: 7, safety_factor: 2, alternative_ovality_pct: 5 } };
TRENCHLESS_RENDERERS["cipp-liner-thickness"] = _simpleRenderer({
  citation: "Citation: the ASTM F1216 X1.1 partially deteriorated (groundwater buckling) relation by name -- external pressure resisted by 2 K E C / (1 - nu squared) x (1 / (DR - 1)) cubed, divided by the safety factor, with the ovality reduction factor C = ((1 - q) / (1 + q) squared) cubed and Poisson's ratio 0.3. The fully deteriorated case is a different relation and is not computed here. ASTM F1216, the liner manufacturer's tested properties, and the design engineer govern.",
  example: cippExample.inputs,
  fields: [
    { key: "host_id_in", label: "Host pipe inside diameter (in)", kind: "number", default: 24 },
    { key: "ovality_pct", label: "Measured host ovality (%)", kind: "number", default: 3 },
    { key: "groundwater_head_ft", label: "Groundwater head above the pipe (ft)", kind: "number", default: 12 },
    { key: "long_term_modulus_psi", label: "Long-term flexural modulus (psi)", kind: "number", default: 125000 },
    { key: "short_term_modulus_psi", label: "Short-term flexural modulus (psi)", kind: "number", default: 250000 },
    { key: "enhancement_factor", label: "Soil support enhancement factor K", kind: "number", default: 7 },
    { key: "safety_factor", label: "Safety factor", kind: "number", default: 2 },
    { key: "alternative_ovality_pct", label: "Alternative ovality to compare (%)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "p", id: "clt-out-p", label: "External groundwater pressure", value: (r) => fmt(r.external_pressure_psi, 2) + " psi" },
    { key: "t", id: "clt-out-t", label: "Required liner thickness", value: (r) => fmt(r.thickness_in, 3) + " in at a dimension ratio of " + fmt(r.dimension_ratio, 1) },
    { key: "c", id: "clt-out-c", label: "Designing on the short-term modulus instead", value: (r) => fmt(r.short_term_thickness_in, 3) + " in -- " + fmt(r.creep_penalty_pct, 0) + "% thinner than the creep-corrected design, which is the unconservative direction" },
    { key: "o", id: "clt-out-o", label: "At the alternative ovality", value: (r) => fmt(r.alternative_thickness_in, 3) + " in" },
    { key: "r", id: "clt-out-r", label: "What ovality costs against a round host", value: (r) => fmt(r.round_thickness_in, 3) + " in round, so the measured ovality adds " + fmt(r.ovality_penalty_pct, 0) + "%" },
    { key: "n", id: "clt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCippLinerThickness,
});
