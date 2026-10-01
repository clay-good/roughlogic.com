// calc-floodfight.js -- Groups G, E, and D: flood fight, flood loads, and
// storm-damage field calculations (disaster response and recovery program).
//
// specs/scope-disaster-response.md, band spec-v1904 through spec-v1912:
//   v1904 sandbag-levee-quantity          (G)  v1909 basement-flood-pumpdown        (D)
//   v1905 emergency-earth-levee-section   (G)  v1910 roof-snow-ice-weight           (E)
//   v1906 flood-lateral-load              (E)  v1911 storm-panel-plywood            (E)
//   v1907 flood-debris-impact             (E)  v1912 manufactured-home-anchor-count (E)
//   v1908 flood-uplift-cover-slab         (E)
//
// US sources only: the USACE St. Paul District Flood Fight Handbook, FEMA
// P-55, FEMA P-957, FEMA basement pump-down guidance, the IRC R301.2.1.2
// exception (cited by section; its fastening table is a USER INPUT, never
// reproduced), and 24 CFR 3285.402 Tables 1-3 (federal regulation, public
// domain, transcribed and checked against the Cornell LII copy on
// 2026-09-30). ASCE 7 is cited by section only.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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
      const field = f.kind === "select"
        ? makeSelect(f.label, f.id || f.key, f.options)
        : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field[f.kind === "select" ? "select" : "input"].value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function update() {
      const params = {};
      for (const f of spec.fields) {
        const el = fields[f.key][f.kind === "select" ? "select" : "input"];
        params[f.key] = f.kind === "select" ? el.value : Number(el.value) || 0;
      }
      const result = spec.compute(params);
      if (result.error) {
        for (const out of Object.values(outs)) out.textContent = "-";
        outs[spec.outputs[0].key].textContent = result.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(result);
    }
    const debounced = debounce(update, DEBOUNCE_MS);
    for (const f of spec.fields) {
      fields[f.key][f.kind === "select" ? "select" : "input"].addEventListener("input", debounced);
    }
    attachExampleButton(inputRegion, () => {
      for (const f of spec.fields) {
        if (spec.example[f.key] !== undefined) fields[f.key][f.kind === "select" ? "select" : "input"].value = String(spec.example[f.key]);
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

export const FLOODFIGHT_RENDERERS = {};

// FEMA P-55 Chapter 8 values: unit weight (pcf) and mass density (slugs/cu ft)
// of fresh and salt water, and g = 32.2 ft/s^2 as FEMA uses it in Eq. 8.2b/8.9.
const _GAMMA_PCF = { fresh: 62.4, salt: 64.0 };
const _RHO_SLUG = { fresh: 1.94, salt: 1.99 };
const _G_FPS2 = 32.2;
// Exact: 1 cu ft = 1,728 cu in; 1 US gal = 231 cu in.
const _GAL_PER_CUFT = 1728 / 231;
const _WATER_OPTS = [{ value: "fresh", label: "Fresh water (62.4 pcf)" }, { value: "salt", label: "Salt water (64.0 pcf)" }];

// ===================== spec-v1904: USACE sandbag levee bags and sand =====================

// dims: in { height_ft: L, length_ft: L, fill_weight_lb: M L T^-2 } out: { bags_per_ft: L^-1, total_bags: dimensionless, sand_tons: M L T^-2, base_width_ft: L }
export function computeSandbagLeveeQuantity({ height_ft = 0, length_ft = 0, fill_weight_lb = 40 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(height_ft > 0)) return { error: "Levee height must be positive." };
  if (!(length_ft > 0)) return { error: "Levee length must be positive." };
  if (!(fill_weight_lb > 0)) return { error: "Bag fill weight must be positive." };
  // USACE Table 2.1 (6, 21, 45, 78, 120 bags/ft at 1-5 ft) is exactly
  // 1.5 H + 4.5 H^2: a cap term and a triangular-body term.
  const bags_per_ft = 1.5 * height_ft + 4.5 * height_ft * height_ft;
  const total_bags = Math.ceil(bags_per_ft * length_ft - 1e-9);
  const sand_tons = total_bags * fill_weight_lb / 2000;
  const base_width_ft = 3 * height_ft;
  const over_preferred = height_ft > 3;
  const over_practical = height_ft > 5;
  const height_flag = over_practical
    ? "ABOVE the 5 ft practical limit -- use an earth levee or a manufactured barrier instead of sandbags"
    : over_preferred ? "above the 3 ft preferred maximum, within the 5 ft practical limit"
      : "within the 3 ft preferred maximum";
  return {
    bags_per_ft, total_bags, sand_tons, base_width_ft, over_preferred, over_practical, height_flag,
    height_ft, length_ft, fill_weight_lb,
    note: "A sandbag levee is a pyramid, so its cross-section grows with the square of its height: the USACE table of bags per linear foot (6, 21, 45, 78, and 120 at one to five feet) is exactly 1.5 H + 4.5 H^2, a cap term and a triangular body, so the third foot costs 24 bags per foot and the fifth costs 42. The base is three times the height, which is what gives the levee its stability, and the footprint must fit on the ground before bagging starts. The handbook's preferred limit is 3 ft and its practical limit 5 ft; above that an earth levee or a manufactured barrier is used. Bags are filled one-half to two-thirds full, about 35 to 40 lb, light enough to pass hand to hand for hours; sand is ordered by the ton. This is a quantity estimate only: it does not assess the foundation, seepage and sand boils, stability against the water load, the forecast crest and freeboard, labor, sheeting, or single-row walls against a structure. The USACE Flood Fight Handbook, the local emergency manager, and the USACE district govern.",
  };
}

export const sandbagLeveeExample = { inputs: { height_ft: 3, length_ft: 500, fill_weight_lb: 40 } };
FLOODFIGHT_RENDERERS["sandbag-levee-quantity"] = _simpleRenderer({
  citation: "Citation: USACE St. Paul District, Flood Fight Handbook (2016), Sections 2.3 and 2.5 and Table 2.1 (bags per linear foot, 1V:3H base of three times the height, 3 ft preferred and 5 ft practical limits), with about 40 lb of sand per bag. The local emergency manager and the USACE district govern.",
  example: sandbagLeveeExample.inputs,
  fields: [
    { key: "height_ft", label: "Levee height (ft)", default: 3 },
    { key: "length_ft", label: "Levee length (ft)", default: 500 },
    { key: "fill_weight_lb", label: "Sand per bag (lb)", default: 40 },
  ],
  outputs: [
    { key: "bpf", id: "sbl-out-bpf", label: "Bags per linear foot", value: (r) => fmt(r.bags_per_ft, 1) + " bags/ft" },
    { key: "bags", id: "sbl-out-bags", label: "Total bags", value: (r) => fmt(r.total_bags, 0) + " bags" },
    { key: "sand", id: "sbl-out-sand", label: "Sand", value: (r) => fmt(r.sand_tons, 1) + " tons at " + fmt(r.fill_weight_lb, 0) + " lb per bag" },
    { key: "base", id: "sbl-out-base", label: "Base width (footprint)", value: (r) => fmt(r.base_width_ft, 1) + " ft" },
    { key: "flag", id: "sbl-out-flag", label: "Height", value: (r) => r.height_flag },
    { key: "n", id: "sbl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSandbagLeveeQuantity,
});

// ===================== spec-v1905: USACE emergency earth levee section and seepage creep check =====================

// dims: in { height_ft: L, fill: dimensionless, foundation: dimensionless, top_width_ft: L, length_ft: L } out: { riverside_slope_h: dimensionless, landside_slope_h: dimensionless, base_width_ft: L, area_sqft: L^2, fill_cy: L^3, required_path_ft: L, berm_shortfall_ft: L }
export function computeEmergencyEarthLeveeSection({ height_ft = 0, fill = "sand", foundation = "fine_sand", top_width_ft = 10, length_ft = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(height_ft > 0)) return { error: "Levee height must be positive." };
  if (!(top_width_ft > 0)) return { error: "Top width must be positive." };
  if (!(length_ft > 0)) return { error: "Levee length must be positive." };
  const SLOPES = { sand: [3, 5], clay: [2.5, 2.5] };
  if (!SLOPES[fill]) return { error: "Fill material must be sand or clay." };
  const CREEP = { fine_sand: 15, fine_gravel: 9, impervious: 0 };
  if (!(foundation in CREEP)) return { error: "Foundation must be fine sand, fine gravel, or impervious." };
  const [riverside_slope_h, landside_slope_h] = SLOPES[fill];
  const base_width_ft = top_width_ft + (riverside_slope_h + landside_slope_h) * height_ft;
  const area_sqft = (top_width_ft + base_width_ft) / 2 * height_ft;
  const fill_cy = area_sqft * length_ft / 27;
  const creep_ratio = CREEP[foundation];
  // Handbook Section 3.3: the creep criterion applies to the clay section on
  // a pervious (sand or gravel) foundation.
  const creep_applies = fill === "clay" && creep_ratio > 0;
  const required_path_ft = creep_applies ? creep_ratio * height_ft : 0;
  const berm_shortfall_ft = creep_applies ? Math.max(0, required_path_ft - base_width_ft) : 0;
  const top_below_handbook = fill === "sand" && top_width_ft < 10;
  const creep_verdict = !creep_applies
    ? (fill === "clay" ? "impervious foundation -- the creep check does not apply" : "sand section -- the handbook's creep check is for the clay section on a pervious foundation")
    : berm_shortfall_ft > 0
      ? "SHORT by " + berm_shortfall_ft.toFixed(1) + " ft -- add a berm 3 ft or thicker on the land or river side to lengthen the seepage path"
      : "the base width meets the creep length";
  return {
    riverside_slope_h, landside_slope_h, base_width_ft, area_sqft, fill_cy, creep_ratio, creep_applies,
    required_path_ft, berm_shortfall_ft, top_below_handbook, creep_verdict, height_ft, top_width_ft, length_ft,
    note: "The USACE flood fight handbook gives each combination of fill and foundation its own emergency section. Sand fill is flatter because it is weaker and more pervious -- 1V:3H toward the river and 1V:5H toward the land -- with a 10 ft top that leaves room for equipment to raise it; clay fill stands at 1V:2.5H both sides. The creep criterion decides whether a section is adequate at all: water under head seeps through a sand foundation beneath the levee, and if the path is too short it carries soil with it and the levee fails from below, which is what sand boils signal. The minimum path is 9 times the head over fine gravel and 15 times over fine sand, and a steep clay section on sand often falls short; the remedy is a berm that lengthens the path without raising the levee. Fill is in-place volume; truck volume is larger by the soil's swell. This is section geometry and a creep-ratio check, not a permanent levee design, slope stability, through-seepage, compaction, or berm design beyond its length; the crest comes from the forecast plus freeboard set by officials. The USACE Flood Fight Handbook, the USACE district, and the local emergency manager govern.",
  };
}

export const earthLeveeExample = { inputs: { height_ft: 4, fill: "clay", foundation: "fine_sand", top_width_ft: 10, length_ft: 100 } };
FLOODFIGHT_RENDERERS["emergency-earth-levee-section"] = _simpleRenderer({
  citation: "Citation: USACE St. Paul District, Flood Fight Handbook (2016), Section 3.3 -- emergency levee sections by fill and foundation (sand 1V:3H riverside and 1V:5H landside with a 10 ft top; clay 1V:2.5H) and the creep criterion L = C x H, C = 9 fine gravel and 15 fine sand. The USACE district and the local emergency manager govern.",
  example: earthLeveeExample.inputs,
  fields: [
    { key: "height_ft", label: "Levee height (ft)", default: 4 },
    { key: "fill", label: "Fill material", kind: "select", options: [{ value: "sand", label: "Sand fill (1V:3H river, 1V:5H land)" }, { value: "clay", label: "Clay fill (1V:2.5H both sides)" }], default: "sand" },
    { key: "foundation", label: "Foundation", kind: "select", options: [{ value: "fine_sand", label: "Fine sand (C = 15)" }, { value: "fine_gravel", label: "Fine gravel (C = 9)" }, { value: "impervious", label: "Impervious (clay)" }], default: "fine_sand" },
    { key: "top_width_ft", label: "Top width (ft)", default: 10 },
    { key: "length_ft", label: "Levee length (ft)", default: 100 },
  ],
  outputs: [
    { key: "sl", id: "eel-out-sl", label: "Side slopes", value: (r) => "1V:" + fmt(r.riverside_slope_h, 1) + "H riverside, 1V:" + fmt(r.landside_slope_h, 1) + "H landside" + (r.top_below_handbook ? " (top width below the handbook's 10 ft)" : "") },
    { key: "b", id: "eel-out-b", label: "Base width", value: (r) => fmt(r.base_width_ft, 1) + " ft" },
    { key: "a", id: "eel-out-a", label: "Cross-section area", value: (r) => fmt(r.area_sqft, 1) + " sq ft" },
    { key: "v", id: "eel-out-v", label: "Fill, in place", value: (r) => fmt(r.fill_cy, 1) + " cu yd over " + fmt(r.length_ft, 0) + " ft" },
    { key: "c", id: "eel-out-c", label: "Creep check", value: (r) => (r.creep_applies ? "required path " + fmt(r.required_path_ft, 1) + " ft (C = " + fmt(r.creep_ratio, 0) + "); " : "") + r.creep_verdict },
    { key: "n", id: "eel-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEmergencyEarthLeveeSection,
});

// ===================== spec-v1906: flood hydrostatic and hydrodynamic load on a wall =====================

// FEMA P-55 Table 8-2 drag coefficient by width-to-depth ratio.
function _dragCoefficient(ratio) {
  if (ratio <= 12) return 1.25;
  if (ratio <= 20) return 1.3;
  if (ratio <= 32) return 1.4;
  if (ratio <= 40) return 1.5;
  if (ratio <= 80) return 1.75;
  if (ratio <= 120) return 1.8;
  return 2.0;
}

// dims: in { depth_ft: L, width_ft: L, water: dimensionless, velocity_basis: dimensionless, entered_velocity_fps: L T^-1, obstruction: dimensionless } out: { hydrostatic_lb_per_ft: M T^-2, hydrostatic_lb: M L T^-2, hydrostatic_height_ft: L, velocity_lower_fps: L T^-1, velocity_upper_fps: L T^-1, velocity_used_fps: L T^-1, drag_coefficient: dimensionless, hydrodynamic_lb: M L T^-2, hydrodynamic_lower_lb: M L T^-2, hydrodynamic_upper_lb: M L T^-2, hydrodynamic_height_ft: L, combined_lateral_lb: M L T^-2 }
export function computeFloodLateralLoad({ depth_ft = 0, width_ft = 0, water = "fresh", velocity_basis = "lower", entered_velocity_fps = 0, obstruction = "wall" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(depth_ft > 0)) return { error: "Still-water flood depth must be positive." };
  if (!(width_ft > 0)) return { error: "Wall or obstruction width must be positive." };
  if (!(entered_velocity_fps >= 0)) return { error: "Velocity cannot be negative." };
  if (!(water in _GAMMA_PCF)) return { error: "Water must be fresh or salt." };
  if (!["lower", "upper", "entered"].includes(velocity_basis)) return { error: "Velocity basis must be lower bound, upper bound, or entered." };
  if (!["wall", "square_pile", "round_pile"].includes(obstruction)) return { error: "Obstruction must be a wall, a square or rectangular pile, or a round pile." };
  const gamma = _GAMMA_PCF[water];
  const rho = _RHO_SLUG[water];
  const hydrostatic_lb_per_ft = 0.5 * gamma * depth_ft * depth_ft;
  const hydrostatic_lb = hydrostatic_lb_per_ft * width_ft;
  const hydrostatic_height_ft = depth_ft / 3;
  // Eq. 8.2a: V = ds / (1 s); Eq. 8.2b: V = sqrt(g ds).
  const velocity_lower_fps = depth_ft / 1;
  const velocity_upper_fps = Math.sqrt(_G_FPS2 * depth_ft);
  const velocity_used_fps = velocity_basis === "lower" ? velocity_lower_fps : velocity_basis === "upper" ? velocity_upper_fps : entered_velocity_fps;
  const width_depth_ratio = width_ft / depth_ft;
  const drag_coefficient = obstruction === "round_pile" ? 1.2 : obstruction === "square_pile" ? 2.0 : _dragCoefficient(width_depth_ratio);
  const area_sqft = width_ft * depth_ft;
  const dyn = (v) => 0.5 * drag_coefficient * rho * v * v * area_sqft;
  const hydrodynamic_lb = dyn(velocity_used_fps);
  const hydrodynamic_lower_lb = dyn(velocity_lower_fps);
  const hydrodynamic_upper_lb = dyn(velocity_upper_fps);
  const hydrodynamic_height_ft = depth_ft / 2;
  const combined_lateral_lb = hydrostatic_lb + hydrodynamic_lb;
  const drag_exceeds_static = hydrodynamic_lb > hydrostatic_lb;
  const entered_outside_bounds = velocity_basis === "entered" && (entered_velocity_fps < velocity_lower_fps || entered_velocity_fps > velocity_upper_fps);
  return {
    hydrostatic_lb_per_ft, hydrostatic_lb, hydrostatic_height_ft, velocity_lower_fps, velocity_upper_fps, velocity_used_fps,
    width_depth_ratio, drag_coefficient, area_sqft, hydrodynamic_lb, hydrodynamic_lower_lb, hydrodynamic_upper_lb,
    hydrodynamic_height_ft, combined_lateral_lb, drag_exceeds_static, entered_outside_bounds,
    note: "Still water pushes with a pressure that grows with depth, so the load is a triangle of half the unit weight times the depth squared, acting a third of the way up; that is why flood-resistant design requires openings in enclosure walls below the flood elevation, since letting water in equalizes the pressure and a wall built to keep water out has to resist the whole triangle. Moving water adds drag. FEMA P-55 brackets the velocity between the depth per second and the shallow-water wave speed, and the choice depends on the flood zone, the slope, and the distance from the source; drag grows with the square of velocity, so the two bounds can differ eightfold and at the upper bound drag can exceed the still-water load. The drag coefficient comes from FEMA's table by width-to-depth ratio, or the pile values. Loads are unfactored. This does not include breaking waves, debris impact, buoyancy and uplift, saturated-soil pressure, scour, or ASCE 7 Chapter 5 load factors and combinations, and it does not design the wall. FEMA P-55, ASCE 7, the engineer of record, and the floodplain administrator govern.",
  };
}

export const floodLateralExample = { inputs: { depth_ft: 4, width_ft: 10, water: "fresh", velocity_basis: "lower", entered_velocity_fps: 0, obstruction: "wall" } };
FLOODFIGHT_RENDERERS["flood-lateral-load"] = _simpleRenderer({
  citation: "Citation: FEMA P-55, Coastal Construction Manual, Volume II, Chapter 8 -- Eq. 8.2 (velocity bounds), Eq. 8.3 (lateral hydrostatic load), Eq. 8.8 (hydrodynamic load), and Table 8-2 (drag coefficients); ASCE 7 Chapter 5 cited by number. Loads are unfactored; the engineer of record and the floodplain administrator govern.",
  example: floodLateralExample.inputs,
  fields: [
    { key: "depth_ft", label: "Still-water flood depth (ft)", default: 4 },
    { key: "width_ft", label: "Wall or obstruction width (ft)", default: 10 },
    { key: "water", label: "Water", kind: "select", options: _WATER_OPTS, default: "fresh" },
    { key: "velocity_basis", label: "Velocity basis", kind: "select", options: [{ value: "lower", label: "Lower bound, V = ds / 1 s (Eq. 8.2a)" }, { value: "upper", label: "Upper bound, V = sqrt(g ds) (Eq. 8.2b)" }, { value: "entered", label: "Entered velocity" }], default: "lower" },
    { key: "entered_velocity_fps", label: "Entered velocity (ft/s)", default: 0 },
    { key: "obstruction", label: "Obstruction type", kind: "select", options: [{ value: "wall", label: "Wall (Cd from width/depth)" }, { value: "square_pile", label: "Square or rectangular pile (Cd 2.0)" }, { value: "round_pile", label: "Round pile (Cd 1.2)" }], default: "wall" },
  ],
  outputs: [
    { key: "hs", id: "fll-out-hs", label: "Hydrostatic load", value: (r) => fmt(r.hydrostatic_lb_per_ft, 1) + " lb/ft; " + fmt(r.hydrostatic_lb, 0) + " lb total at " + fmt(r.hydrostatic_height_ft, 2) + " ft above ground" },
    { key: "v", id: "fll-out-v", label: "Velocity bounds", value: (r) => "lower " + fmt(r.velocity_lower_fps, 2) + " ft/s; upper " + fmt(r.velocity_upper_fps, 2) + " ft/s; used " + fmt(r.velocity_used_fps, 2) + " ft/s" + (r.entered_outside_bounds ? " (OUTSIDE the Eq. 8.2 bounds)" : "") },
    { key: "cd", id: "fll-out-cd", label: "Drag coefficient", value: (r) => "Cd " + fmt(r.drag_coefficient, 2) + " (w/ds " + fmt(r.width_depth_ratio, 2) + ")" },
    { key: "hd", id: "fll-out-hd", label: "Hydrodynamic load", value: (r) => fmt(r.hydrodynamic_lb, 0) + " lb at " + fmt(r.hydrodynamic_height_ft, 2) + " ft (lower bound " + fmt(r.hydrodynamic_lower_lb, 0) + " lb, upper " + fmt(r.hydrodynamic_upper_lb, 0) + " lb)" },
    { key: "t", id: "fll-out-t", label: "Combined lateral load", value: (r) => fmt(r.combined_lateral_lb, 0) + " lb, unfactored" + (r.drag_exceeds_static ? " -- drag EXCEEDS the hydrostatic load" : "") },
    { key: "n", id: "fll-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFloodLateralLoad,
});

// ===================== spec-v1907: FEMA flood debris impact load =====================

// dims: in { debris_weight_lb: M L T^-2, zone: dimensionless, depth_ft: L, velocity_basis: dimensionless, entered_velocity_fps: L T^-1, screening: dimensionless, structure: dimensionless } out: { velocity_used_fps: L T^-1, depth_coefficient: dimensionless, blockage_coefficient: dimensionless, structure_coefficient_s_per_ft: T L^-1, impact_force_lb: M L T^-2, impact_elevation_ft: L }
export function computeFloodDebrisImpact({ debris_weight_lb = 1000, zone = "a", depth_ft = 0, velocity_basis = "eq89", entered_velocity_fps = 0, screening = "none", structure = "rc_wall" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(debris_weight_lb > 0)) return { error: "Debris weight must be positive." };
  if (!(depth_ft > 0)) return { error: "Still-water depth must be positive." };
  if (!(entered_velocity_fps >= 0)) return { error: "Velocity cannot be negative." };
  if (!["a", "v_floodway"].includes(zone)) return { error: "Zone must be Zone A, or a floodway or Zone V." };
  if (!["eq89", "entered"].includes(velocity_basis)) return { error: "Velocity basis must be Eq. 8.9 or entered." };
  const CB = { none: 1.0, limited: 0.6, moderate: 0.2, dense: 0.0 };
  if (!(screening in CB)) return { error: "Upstream screening must be none, limited, moderate, or dense." };
  const CSTR = { timber_masonry: 0.2, concrete_frame: 0.4, rc_wall: 0.8 };
  if (!(structure in CSTR)) return { error: "Structure type must be timber pile or masonry column, concrete pile or moment frame, or reinforced concrete wall." };
  const velocity_eq89_fps = 0.5 * Math.sqrt(_G_FPS2 * depth_ft);
  const velocity_used_fps = velocity_basis === "eq89" ? velocity_eq89_fps : entered_velocity_fps;
  // Table 8-3 prints 0 below 1 ft, 0.375 at 2.5 ft, 0.75 at 4 ft and 1.0
  // above 5 ft; every row lies on 0.25 (ds - 1), clamped to [0, 1].
  const depth_coefficient = zone === "v_floodway" ? 1.0 : Math.min(1, Math.max(0, 0.25 * (depth_ft - 1)));
  const blockage_coefficient = CB[screening];
  const structure_coefficient_s_per_ft = CSTR[structure];
  const impact_force_lb = debris_weight_lb * velocity_used_fps * depth_coefficient * blockage_coefficient * structure_coefficient_s_per_ft;
  const impact_elevation_ft = depth_ft;
  const velocity_lower_fps = depth_ft;
  const velocity_upper_fps = Math.sqrt(_G_FPS2 * depth_ft);
  const entered_outside_bounds = velocity_basis === "entered" && (entered_velocity_fps < velocity_lower_fps || entered_velocity_fps > velocity_upper_fps);
  return {
    velocity_eq89_fps, velocity_used_fps, velocity_lower_fps, velocity_upper_fps, entered_outside_bounds,
    depth_coefficient, blockage_coefficient, structure_coefficient_s_per_ft, impact_force_lb, impact_elevation_ft, debris_weight_lb,
    note: "FEMA P-55's debris equation turns an impulse into a force: a mass moving with the water, stopped by a structure whose stiffness sets how quickly it stops. The structure coefficient carries that stiffness and is the counterintuitive part -- a stiff reinforced concrete wall takes four times the force of a flexible timber pile from the same object, because it stops it faster. The depth and blockage coefficients reduce the effect where shallow water or upstream trees and buildings slow the debris. The recommended 1,000 lb stands for a piece of a damaged building, a utility pole, a length of pile, or an empty tank where nothing better is known; on coasts with log debris the weight is much larger and local guidance governs. The velocity inside the equation defaults to half the shallow-water wave speed, between the Eq. 8.2 bounds -- but FEMA's own Example 8.4 enters the UPPER bound, sqrt(g ds), for an oceanfront building, which doubles the force; enter that velocity for an oceanfront or high-velocity site. The force acts at the still-water elevation. This is FEMA P-55's (2011) simplified method; ASCE 7-22 Supplement 2 (FEMA P-2345, 2024) replaced it with the ASCE 7-22 Chapter 6 debris approach and caps coastal velocity at 15 ft/s. It does not address very large debris such as logs, vessels, or containers, multiple impacts, the local strength of the element struck, tsunami loads, or ASCE 7 load factors and combinations. FEMA P-55, ASCE 7, and the engineer of record govern.",
  };
}

export const floodDebrisExample = { inputs: { debris_weight_lb: 1000, zone: "a", depth_ft: 4, velocity_basis: "eq89", entered_velocity_fps: 0, screening: "none", structure: "rc_wall" } };
FLOODFIGHT_RENDERERS["flood-debris-impact"] = _simpleRenderer({
  citation: "Citation: FEMA P-55, Coastal Construction Manual, Volume II, Chapter 8 -- Eq. 8.9 (debris impact load, Fi = W V C_D C_B C_Str), Table 8-3 (depth coefficient), Table 8-4 (blockage coefficient), and the building structure coefficients; ASCE 7 Chapter C5 cited by number. The engineer of record governs.",
  example: floodDebrisExample.inputs,
  fields: [
    { key: "debris_weight_lb", label: "Debris weight (lb)", default: 1000 },
    { key: "zone", label: "Flood zone", kind: "select", options: [{ value: "a", label: "Zone A (C_D by depth)" }, { value: "v_floodway", label: "Floodway or Zone V (C_D 1.0)" }], default: "a" },
    { key: "depth_ft", label: "Still-water depth (ft)", default: 4 },
    { key: "velocity_basis", label: "Velocity", kind: "select", options: [{ value: "eq89", label: "Eq. 8.9 default, V = 1/2 sqrt(g ds)" }, { value: "entered", label: "Entered velocity" }], default: "eq89" },
    { key: "entered_velocity_fps", label: "Entered velocity (ft/s)", default: 0 },
    { key: "screening", label: "Upstream screening within 100 ft", kind: "select", options: [{ value: "none", label: "None, path over 30 ft wide (1.0)" }, { value: "limited", label: "Limited, 20 ft path (0.6)" }, { value: "moderate", label: "Moderate, 10 ft path (0.2)" }, { value: "dense", label: "Dense, under 5 ft (0.0)" }], default: "none" },
    { key: "structure", label: "Structure struck", kind: "select", options: [{ value: "timber_masonry", label: "Timber pile or masonry column, 3 stories or less (0.2)" }, { value: "concrete_frame", label: "Concrete pile or concrete/steel moment frame, 3 stories or less (0.4)" }, { value: "rc_wall", label: "Reinforced concrete foundation wall (0.8)" }], default: "rc_wall" },
  ],
  outputs: [
    { key: "v", id: "fdi-out-v", label: "Velocity used", value: (r) => fmt(r.velocity_used_fps, 2) + " ft/s (Eq. 8.2 bounds " + fmt(r.velocity_lower_fps, 2) + " to " + fmt(r.velocity_upper_fps, 2) + ")" + (r.entered_outside_bounds ? " -- OUTSIDE the bounds" : "") },
    { key: "c", id: "fdi-out-c", label: "Coefficients", value: (r) => "C_D " + fmt(r.depth_coefficient, 3) + ", C_B " + fmt(r.blockage_coefficient, 1) + ", C_Str " + fmt(r.structure_coefficient_s_per_ft, 1) + " s/ft" },
    { key: "f", id: "fdi-out-f", label: "Impact force", value: (r) => fmt(r.impact_force_lb, 0) + " lb, unfactored, at " + fmt(r.impact_elevation_ft, 2) + " ft (the still-water level)" },
    { key: "n", id: "fdi-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFloodDebrisImpact,
});

// ===================== spec-v1908: flood-head uplift on a slab, hatch, or manhole cover =====================

// dims: in { head_ft: L, water: dimensionless, element: dimensionless, slab_thickness_in: L, slab_area_sqft: L^2, cover_diameter_ft: L, cover_weight_lb: M L T^-2 } out: { uplift_psf: M L^-1 T^-2, area_sqft: L^2, uplift_lb: M L T^-2, resisting_psf: M L^-1 T^-2, net_psf: M L^-1 T^-2, net_lb: M L T^-2, floating_head_ft: L, counterweight_lb: M L T^-2 }
export function computeFloodUpliftCoverSlab({ head_ft = 0, water = "fresh", element = "slab", slab_thickness_in = 4, slab_area_sqft = 0, cover_diameter_ft = 2, cover_weight_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(head_ft > 0)) return { error: "Head above the underside must be positive." };
  if (!(water in _GAMMA_PCF)) return { error: "Water must be fresh or salt." };
  if (!["slab", "cover"].includes(element)) return { error: "Element must be a slab or a round cover." };
  let area_sqft;
  let resisting_psf;
  if (element === "slab") {
    if (!(slab_thickness_in > 0)) return { error: "Slab thickness must be positive." };
    if (!(slab_area_sqft > 0)) return { error: "Slab area must be positive." };
    area_sqft = slab_area_sqft;
    // Normal-weight concrete at 150 pcf is 12.5 psf per inch of thickness.
    resisting_psf = 150 * slab_thickness_in / 12;
  } else {
    if (!(cover_diameter_ft > 0)) return { error: "Cover diameter must be positive." };
    if (!(cover_weight_lb >= 0)) return { error: "Cover weight cannot be negative." };
    area_sqft = Math.PI / 4 * cover_diameter_ft * cover_diameter_ft;
    resisting_psf = cover_weight_lb / area_sqft;
  }
  const gamma = _GAMMA_PCF[water];
  const uplift_psf = gamma * head_ft;
  const uplift_lb = uplift_psf * area_sqft;
  const net_psf = uplift_psf - resisting_psf;
  const net_lb = net_psf * area_sqft;
  const floating_head_ft = resisting_psf / gamma;
  const counterweight_lb = Math.max(0, net_lb);
  const lifts = net_psf > 0;
  return {
    uplift_psf, area_sqft, uplift_lb, resisting_psf, net_psf, net_lb, floating_head_ft, counterweight_lb, lifts, head_ft, element,
    note: "Uplift is the vertical half of hydrostatics. Water standing above the underside of a slab pushes up on every square foot with its unit weight times the head, and the slab resists only with its own weight plus whatever holds it down: a 4 in slab weighs 50 psf, which 0.8 ft of water matches, and a basement pumped dry while the ground outside is saturated can have several feet of head beneath it, which is why floors heave after floods and why basements are pumped down in stages. A manhole cover is the same problem on a smaller area under a higher head; when a sewer surcharges, the force under any real head exceeds what sandbags stacked on the cover can hold, so the USACE handbook's advice is to ring the manhole with sandbags to reduce the head, or pump it. The handbook's printed 2,060 lb for a 10 ft head on a 2 ft cover implies about 65.6 pcf; at 62.4 pcf it is 1,960 lb. This does not account for reinforcement, connection to walls or footings, pressure relief or underdrains, soil above a buried structure, dynamic surcharge, cover locks, or the slab's capacity spanning under uplift. FEMA P-55, the USACE Flood Fight Handbook, the engineer of record, and the utility govern.",
  };
}

export const floodUpliftExample = { inputs: { head_ft: 3, water: "fresh", element: "slab", slab_thickness_in: 4, slab_area_sqft: 1200, cover_diameter_ft: 2, cover_weight_lb: 0 } };
FLOODFIGHT_RENDERERS["flood-uplift-cover-slab"] = _simpleRenderer({
  citation: "Citation: FEMA P-55, Coastal Construction Manual, Volume II, Eq. 8.4 (vertical hydrostatic force, unit weight x head x area; 62.4 pcf fresh, 64.0 salt), and USACE St. Paul District, Flood Fight Handbook (2016), Section 5.7 (manhole covers under head). The engineer of record and the utility govern.",
  example: floodUpliftExample.inputs,
  fields: [
    { key: "head_ft", label: "Water head above the underside (ft)", default: 3 },
    { key: "water", label: "Water", kind: "select", options: _WATER_OPTS, default: "fresh" },
    { key: "element", label: "Element", kind: "select", options: [{ value: "slab", label: "Concrete slab (150 pcf)" }, { value: "cover", label: "Round manhole cover or hatch" }], default: "slab" },
    { key: "slab_thickness_in", label: "Slab thickness (in)", default: 4 },
    { key: "slab_area_sqft", label: "Slab area (sq ft)", default: 1200 },
    { key: "cover_diameter_ft", label: "Cover diameter (ft)", default: 2 },
    { key: "cover_weight_lb", label: "Cover weight (lb)", default: 0 },
  ],
  outputs: [
    { key: "p", id: "fuc-out-p", label: "Uplift pressure", value: (r) => fmt(r.uplift_psf, 1) + " psf" },
    { key: "f", id: "fuc-out-f", label: "Uplift force", value: (r) => fmt(r.uplift_lb, 0) + " lb on " + fmt(r.area_sqft, 2) + " sq ft" },
    { key: "r", id: "fuc-out-r", label: "Resistance and net", value: (r) => fmt(r.resisting_psf, 1) + " psf own weight; net " + fmt(r.net_psf, 1) + " psf " + (r.lifts ? "UPWARD -- it lifts" : "downward -- it holds") },
    { key: "h", id: "fuc-out-h", label: "Head at which it floats", value: (r) => fmt(r.floating_head_ft, 2) + " ft" },
    { key: "c", id: "fuc-out-c", label: "Counterweight needed", value: (r) => fmt(r.counterweight_lb, 0) + " lb" },
    { key: "n", id: "fuc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFloodUpliftCoverSlab,
});

// ===================== spec-v1909: flooded basement staged pump-down schedule =====================

// dims: in { floor_area_sqft: L^2, water_depth_ft: L, daily_drawdown_ft: L, pump_gpm: L^3 T^-1 } out: { total_gal: L^3, gal_per_ft: L^2, days: dimensionless, largest_day_gal: L^3, largest_day_run_min: T }
export function computeBasementFloodPumpdown({ floor_area_sqft = 0, water_depth_ft = 0, daily_drawdown_ft = 2.5, pump_gpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(floor_area_sqft > 0)) return { error: "Basement floor area must be positive." };
  if (!(water_depth_ft > 0)) return { error: "Water depth must be positive." };
  if (!(daily_drawdown_ft > 0)) return { error: "Daily drawdown must be positive." };
  if (daily_drawdown_ft > 3) return { error: "FEMA's staged pump-down limits the drawdown to 2 to 3 ft per day; 3 ft is the maximum." };
  if (!(pump_gpm > 0)) return { error: "Pump rate must be positive." };
  const gal_per_ft = floor_area_sqft * _GAL_PER_CUFT;
  const total_gal = gal_per_ft * water_depth_ft;
  // Two 1 ft test days, then the daily rate until empty.
  const steps = [];
  let remaining = water_depth_ft;
  for (let d = 0; d < 2 && remaining > 1e-9; d++) {
    const s = Math.min(1, remaining);
    steps.push(s);
    remaining -= s;
  }
  while (remaining > 1e-9) {
    const s = Math.min(daily_drawdown_ft, remaining);
    steps.push(s);
    remaining -= s;
  }
  const days = steps.length;
  const largest_day_ft = Math.max(...steps);
  const largest_day_gal = largest_day_ft * gal_per_ft;
  const largest_day_run_min = largest_day_gal / pump_gpm;
  const pump_keeps_up = largest_day_run_min <= 1440;
  const schedule = steps.map((s, i) => "day " + (i + 1) + ": " + s.toFixed(2) + " ft (" + Math.round(s * gal_per_ft) + " gal)").join("; ");
  const below_fema_rate = daily_drawdown_ft < 2;
  return {
    gal_per_ft, total_gal, days, largest_day_ft, largest_day_gal, largest_day_run_min, pump_keeps_up, below_fema_rate, schedule,
    note: "The water in a flooded basement is holding the walls up: the saturated soil outside pushes inward with its own weight plus the water in it, and the water inside pushes back. Remove the inside water faster than the outside drains and the walls take the full difference; FEMA's guidance is plain that they can buckle inward or collapse and the floor can heave. So the schedule tests first: mark the water, pump down 1 ft, and wait overnight. If the level held, pump 1 ft more and wait again; if the water came back up, the ground is still saturated -- stop and wait, and restart only when a drawdown holds. After the two test days, 2 to 3 ft every 24 hours until empty. A basement holds about 7.5 gallons per square foot per foot of depth, and each day's share at the pump's rate shows whether the pump can keep to the schedule. Electrical and gas hazards come before any of this and are not addressed; this does not assess wall or floor condition, size a pump for head, treat Category 3 water, or plan drying. FEMA guidance, the restoration contractor, and a structural engineer where walls have moved govern.",
  };
}

export const basementPumpdownExample = { inputs: { floor_area_sqft: 1200, water_depth_ft: 6, daily_drawdown_ft: 2.5, pump_gpm: 50 } };
FLOODFIGHT_RENDERERS["basement-flood-pumpdown"] = _simpleRenderer({
  citation: "Citation: FEMA, Mitigation and Basement Flooding (pumping out a flooded basement: 1 ft, wait overnight, 1 ft more, then 2 to 3 ft per day), with University of Nebraska-Lincoln Extension disaster education guidance; 1 cu ft = 1,728 / 231 gal. The restoration contractor, and a structural engineer where walls show movement, govern.",
  example: basementPumpdownExample.inputs,
  fields: [
    { key: "floor_area_sqft", label: "Basement floor area (sq ft)", default: 1200 },
    { key: "water_depth_ft", label: "Water depth (ft)", default: 6 },
    { key: "daily_drawdown_ft", label: "Daily drawdown after the test days (ft, 2 to 3)", default: 2.5 },
    { key: "pump_gpm", label: "Pump rate (gpm)", default: 50 },
  ],
  outputs: [
    { key: "v", id: "bfp-out-v", label: "Water volume", value: (r) => fmt(r.total_gal, 0) + " gal (" + fmt(r.gal_per_ft, 0) + " gal per ft of depth)" },
    { key: "d", id: "bfp-out-d", label: "Days", value: (r) => fmt(r.days, 0) + " days if every drawdown holds" + (r.below_fema_rate ? " (slower than FEMA's 2 to 3 ft/day, which is conservative)" : "") },
    { key: "s", id: "bfp-out-s", label: "Schedule", value: (r) => r.schedule },
    { key: "p", id: "bfp-out-p", label: "Pump run on the largest day", value: (r) => fmt(r.largest_day_run_min, 0) + " min (" + fmt(r.largest_day_run_min / 60, 1) + " h) for " + fmt(r.largest_day_gal, 0) + " gal" + (r.pump_keeps_up ? "" : " -- MORE than 24 h: the pump cannot keep to the schedule") },
    { key: "n", id: "bfp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBasementFloodPumpdown,
});

// ===================== spec-v1910: existing roof snow and ice weight against design load =====================

// dims: in { layer1_depth_in: L, layer1_type: dimensionless, layer2_depth_in: L, layer2_type: dimensionless, layer3_depth_in: L, layer3_type: dimensionless, entered_weight_pcf: M L^-2 T^-2, ground_snow_psf: M L^-1 T^-2, override_range: dimensionless, design_snow_psf: M L^-1 T^-2 } out: { layer1_psf: M L^-1 T^-2, layer2_psf: M L^-1 T^-2, layer3_psf: M L^-1 T^-2, total_psf: M L^-1 T^-2, design_ratio: dimensionless }
export function computeRoofSnowIceWeight({ layer1_depth_in = 0, layer1_type = "wet", layer2_depth_in = 0, layer2_type = "ice", layer3_depth_in = 0, layer3_type = "dry", entered_weight_pcf = 15, ground_snow_psf = 0, override_range = "no", design_snow_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (![layer1_depth_in, layer2_depth_in, layer3_depth_in].every((d) => d >= 0)) return { error: "Layer depths cannot be negative." };
  if (!(design_snow_psf > 0)) return { error: "Roof design snow load must be positive." };
  // FEMA P-957 Section 2.2 unit weights (psf per ft of depth); settled snow
  // at the middle of the commonly cited 10-15 range.
  const TYPES = { dry: 3, settled: 12.5, wet: 21, ice: 57 };
  const types = [layer1_type, layer2_type, layer3_type];
  const valid = [...Object.keys(TYPES), "asce7", "entered"];
  if (!types.every((t) => valid.includes(t))) return { error: "Layer type must be dry, settled, wet, ice, ASCE 7 density, or entered." };
  const depths = [layer1_depth_in, layer2_depth_in, layer3_depth_in];
  const used = (t, i) => depths[i] > 0 && types[i] === t;
  if ([0, 1, 2].some((i) => used("entered", i))) {
    if (!(entered_weight_pcf > 0)) return { error: "Entered unit weight must be positive." };
    if (override_range !== "yes" && (entered_weight_pcf < 3 || entered_weight_pcf > 21)) return { error: "Entered snow unit weight must be 3 to 21 psf per ft of depth (FEMA P-957); choose the override to enter a measured value outside that range." };
    if (entered_weight_pcf > 62.4) return { error: "No snow or ice layer weighs more than water, 62.4 psf per ft." };
  }
  // ASCE 7 Section 7.7.1 snow density relation, cited by section.
  let asce7_weight_pcf = 0;
  if ([0, 1, 2].some((i) => used("asce7", i))) {
    if (!(ground_snow_psf > 0)) return { error: "The ASCE 7 density needs a positive ground snow load." };
    asce7_weight_pcf = Math.min(30, 0.13 * ground_snow_psf + 14);
  }
  const unit = (t) => t === "entered" ? entered_weight_pcf : t === "asce7" ? asce7_weight_pcf : TYPES[t];
  const [layer1_psf, layer2_psf, layer3_psf] = [0, 1, 2].map((i) => depths[i] / 12 * unit(types[i]));
  const total_psf = layer1_psf + layer2_psf + layer3_psf;
  const design_ratio = total_psf / design_snow_psf;
  const action = design_ratio >= 1
    ? "AT OR OVER the roof design snow load -- get the load off by a safe method now, and leave the building at once if any warning sign appears (sagging, new cracks, creaking, doors or windows that stick)"
    : design_ratio >= 0.75
      ? "APPROACHING the design snow load -- plan careful, even clearing by a safe method; leave if any warning sign appears"
      : "below the design snow load by this estimate -- warning signs (sagging, new cracks, creaking, sticking doors) override the arithmetic";
  return {
    layer1_psf, layer2_psf, layer3_psf, total_psf, design_ratio, asce7_weight_pcf, action, design_snow_psf,
    range_overridden: override_range === "yes" && [0, 1, 2].some((i) => used("entered", i)),
    note: "A foot of snow can weigh 3 pounds a square foot or 21, and the difference is water: fresh powder is mostly air, the same snow after rain or a thaw is mostly water, and ice at about 57 psf per foot is almost as heavy as water itself. A roof after a long storm is usually a stack of layers, and two inches of ice weighs about as much as three feet of light, dry snow. The comparison is with the roof's design snow load from the drawings or the building department -- not the ground snow load on a map, which FEMA P-957 warns against. The tile reports a ratio; the 75% approach band is this tile's prompt to plan, not a FEMA threshold. A roof with sagging, new cracks, creaking, or doors that stick is a building to leave regardless of the numbers. Clearing is itself hazardous: falls, and uneven clearing that leaves an unbalanced load worse than the uniform one. Actual densities vary widely and a weighed core sample governs where available. This does not compute design, drift, sliding, or rain-on-snow loads or evaluate the structure. FEMA P-957, the building's design documents, and a structural engineer govern.",
  };
}

export const roofSnowIceExample = { inputs: { layer1_depth_in: 18, layer1_type: "wet", layer2_depth_in: 2, layer2_type: "ice", layer3_depth_in: 0, layer3_type: "dry", entered_weight_pcf: 15, ground_snow_psf: 0, override_range: "no", design_snow_psf: 30 } };
const _SNOW_OPTS = [
  { value: "dry", label: "Light, dry snow (3 psf/ft)" },
  { value: "settled", label: "Settled snow (12.5 psf/ft)" },
  { value: "wet", label: "Wet, heavy snow (21 psf/ft)" },
  { value: "ice", label: "Ice (57 psf/ft)" },
  { value: "asce7", label: "ASCE 7 density from ground snow load" },
  { value: "entered", label: "Entered unit weight" },
];
FLOODFIGHT_RENDERERS["roof-snow-ice-weight"] = _simpleRenderer({
  citation: "Citation: FEMA P-957, Snow Load Safety Guide (2013), Section 2.2 (about 3 psf per ft for light, dry snow to 21 psf per ft for wet, heavy snow; ice about 57 psf per ft) and its warning signs; the ASCE 7 snow density relation, gamma = 0.13 pg + 14 <= 30 pcf, cited by section as an optional basis. The building's design documents and a structural engineer govern.",
  example: roofSnowIceExample.inputs,
  fields: [
    { key: "layer1_depth_in", label: "Layer 1 (bottom) depth (in)", default: 18 },
    { key: "layer1_type", label: "Layer 1 type", kind: "select", options: _SNOW_OPTS, default: "wet" },
    { key: "layer2_depth_in", label: "Layer 2 depth (in)", default: 2 },
    { key: "layer2_type", label: "Layer 2 type", kind: "select", options: _SNOW_OPTS, default: "ice" },
    { key: "layer3_depth_in", label: "Layer 3 (top) depth (in)", default: 0 },
    { key: "layer3_type", label: "Layer 3 type", kind: "select", options: _SNOW_OPTS, default: "dry" },
    { key: "entered_weight_pcf", label: "Entered unit weight (psf per ft of depth)", default: 15 },
    { key: "ground_snow_psf", label: "Ground snow load for the ASCE 7 density (psf)", default: 0 },
    { key: "override_range", label: "Entered weight outside 3-21 (measured core)", kind: "select", options: [{ value: "no", label: "No -- keep the FEMA range" }, { value: "yes", label: "Yes -- use my measured value" }], default: "no" },
    { key: "design_snow_psf", label: "Roof design snow load (psf)", default: 30 },
  ],
  outputs: [
    { key: "l", id: "rsi-out-l", label: "Layer loads", value: (r) => fmt(r.layer1_psf, 1) + " + " + fmt(r.layer2_psf, 1) + " + " + fmt(r.layer3_psf, 1) + " psf" },
    { key: "t", id: "rsi-out-t", label: "Total load on the roof", value: (r) => fmt(r.total_psf, 1) + " psf" + (r.range_overridden ? " (entered unit weight outside the FEMA 3-21 range, by override)" : "") },
    { key: "r", id: "rsi-out-r", label: "Ratio to design snow load", value: (r) => fmt(r.design_ratio, 2) + " of " + fmt(r.design_snow_psf, 0) + " psf" },
    { key: "a", id: "rsi-out-a", label: "FEMA P-957 action", value: (r) => r.action },
    { key: "n", id: "rsi-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRoofSnowIceWeight,
});

// ===================== spec-v1911: wood structural panel opening protection takeoff =====================

// dims: in { opening_width_in: L, opening_height_in: L, overlap_in: L, thickness_in: L, fastened_edges: dimensionless, fastener_type: dimensionless, fastener_spacing_in: L, edge_distance_in: L, opening_count: dimensionless } out: { panel_width_in: L, panel_height_in: L, span_in: L, span_ft: L, fastened_edge_in: L, fasteners_per_edge: dimensionless, fasteners_per_panel: dimensionless, sheets: dimensionless, total_fasteners: dimensionless }
export function computeStormPanelPlywood({ opening_width_in = 0, opening_height_in = 0, overlap_in = 4, thickness_in = 0.4375, fastened_edges = "long", fastener_type = "wood_screw_8", fastener_spacing_in = 0, edge_distance_in = 1, opening_count = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(opening_width_in > 0) || !(opening_height_in > 0)) return { error: "Opening width and height must be positive." };
  if (!(overlap_in > 0)) return { error: "Overlap onto the framing must be positive." };
  if (!(fastener_spacing_in > 0)) return { error: "Fastener spacing must be positive (read it from the adopted IRC Table R301.2.1.2)." };
  if (!(edge_distance_in > 0)) return { error: "Edge distance must be positive." };
  if (!(Number.isInteger(opening_count) && opening_count >= 1)) return { error: "Number of identical openings must be a whole number of 1 or more." };
  if (!(thickness_in >= 7 / 16)) return { error: "IRC R301.2.1.2 exception: wood structural panels must be at least 7/16 in thick." };
  if (!["long", "short"].includes(fastened_edges)) return { error: "Fastened edges must be the long or the short sides." };
  const FASTENERS = { wood_screw_8: "#8 wood-screw-based anchor", wood_screw_10: "#10 wood-screw-based anchor", lag_quarter: "1/4 in lag screw", other: "other listed fastener" };
  if (!(fastener_type in FASTENERS)) return { error: "Choose a fastener type." };
  const panel_width_in = opening_width_in + 2 * overlap_in;
  const panel_height_in = opening_height_in + 2 * overlap_in;
  const longer = Math.max(panel_width_in, panel_height_in);
  const shorter = Math.min(panel_width_in, panel_height_in);
  // Fastened along the long edges, the panel spans the short way.
  const fastened_edge_in = fastened_edges === "long" ? longer : shorter;
  const span_in = fastened_edges === "long" ? shorter : longer;
  const span_ft = span_in / 12;
  if (span_in > 96) return { error: "IRC R301.2.1.2 exception: the panel may span no more than 8 ft between fastened edges; this span is " + span_ft.toFixed(2) + " ft." };
  if (!(fastened_edge_in > 2 * edge_distance_in)) return { error: "Edge distance leaves no room for fasteners along the fastened edge." };
  const fasteners_per_edge = Math.ceil((fastened_edge_in - 2 * edge_distance_in) / fastener_spacing_in - 1e-9) + 1;
  const fasteners_per_panel = 2 * fasteners_per_edge;
  const total_fasteners = fasteners_per_panel * opening_count;
  const fitsAs = (w, h) => Math.floor(48 / w + 1e-9) * Math.floor(96 / h + 1e-9);
  const per_sheet = Math.max(fitsAs(panel_width_in, panel_height_in), fitsAs(panel_height_in, panel_width_in));
  const needs_splice = per_sheet === 0;
  const sheets = needs_splice
    ? opening_count * Math.min(Math.ceil(panel_width_in / 48 - 1e-9) * Math.ceil(panel_height_in / 96 - 1e-9), Math.ceil(panel_height_in / 48 - 1e-9) * Math.ceil(panel_width_in / 96 - 1e-9))
    : Math.ceil(opening_count / per_sheet - 1e-9);
  const table_column = span_ft <= 4 ? "panel span <= 4 ft" : span_ft <= 6 ? "4 ft < panel span <= 6 ft" : "6 ft < panel span <= 8 ft";
  const fastener_label = FASTENERS[fastener_type];
  return {
    panel_width_in, panel_height_in, span_in, span_ft, fastened_edge_in, fasteners_per_edge, fasteners_per_panel,
    total_fasteners, per_sheet, sheets, needs_splice, table_column, fastener_label, fastener_spacing_in, opening_count, thickness_in,
    note: "Board-up protection works only if the panel reaches the framing and the fasteners hold it there. The IRC R301.2.1.2 exception permits wood structural panels -- plywood or OSB -- at least 7/16 in thick, spanning no more than 8 ft, precut and predrilled, and attached to the framing surrounding the opening. The panel is the opening plus an overlap on every side, and the span is the distance between the two fastened edges, because the schedule fastens a panel at its opposing ends. The spacing tightens as the span grows, and the table that gives it is ICC text, so the spacing is entered from the adopted edition's column for this span; fastening the long sides usually keeps the span short and the row light. Sheets are counted by nesting identical panels onto 4 x 8 ft stock; a panel larger than a sheet needs a splice the exception does not provide for. In the 2018 IRC the table is limited to a mean roof height of 45 ft and an ultimate design wind speed of 180 mph; earlier editions differ, so the adopted edition matters. This does not check the framing or anchor embedment, address doors, garage doors, or skylights, determine whether the building is in a windborne debris region, or replace tested products where the code requires them. The adopted IRC, its Table R301.2.1.2, and the AHJ govern.",
  };
}

export const stormPanelExample = { inputs: { opening_width_in: 36, opening_height_in: 60, overlap_in: 4, thickness_in: 0.4375, fastened_edges: "long", fastener_type: "wood_screw_8", fastener_spacing_in: 16, edge_distance_in: 1, opening_count: 1 } };
FLOODFIGHT_RENDERERS["storm-panel-plywood"] = _simpleRenderer({
  citation: "Citation: IRC Section R301.2.1.2 and its exception (wood structural panels at least 7/16 in thick, spanning not more than 8 ft, precut, predrilled, and attached to the framing around the opening) and Table R301.2.1.2 (fastening schedule; 2018 edition limited to a 45 ft mean roof height and 180 mph Vult), cited by section and NOT reproduced -- the fastener spacing is entered from the adopted edition. The AHJ governs.",
  example: stormPanelExample.inputs,
  fields: [
    { key: "opening_width_in", label: "Opening width (in)", default: 36 },
    { key: "opening_height_in", label: "Opening height (in)", default: 60 },
    { key: "overlap_in", label: "Overlap onto the framing, each side (in)", default: 4 },
    { key: "thickness_in", label: "Panel thickness (in)", default: 0.4375 },
    { key: "fastened_edges", label: "Edges fastened", kind: "select", options: [{ value: "long", label: "Long sides (span the short way)" }, { value: "short", label: "Short sides (span the long way)" }], default: "long" },
    { key: "fastener_type", label: "Fastener type", kind: "select", options: [{ value: "wood_screw_8", label: "#8 wood-screw-based anchor" }, { value: "wood_screw_10", label: "#10 wood-screw-based anchor" }, { value: "lag_quarter", label: "1/4 in lag screw" }, { value: "other", label: "Other listed fastener" }], default: "wood_screw_8" },
    { key: "fastener_spacing_in", label: "Fastener spacing from the adopted table for this span (in)", default: 16 },
    { key: "edge_distance_in", label: "Edge distance (in)", default: 1 },
    { key: "opening_count", label: "Number of identical openings", default: 1, attrs: { step: "1", min: "1" } },
  ],
  outputs: [
    { key: "p", id: "spp-out-p", label: "Panel", value: (r) => fmt(r.panel_width_in, 1) + " x " + fmt(r.panel_height_in, 1) + " in, " + fmt(r.thickness_in, 3) + " in thick (meets 7/16 in), span " + fmt(r.span_in, 1) + " in (" + fmt(r.span_ft, 2) + " ft) between the fastened " + fmt(r.fastened_edge_in, 1) + " in edges" },
    { key: "t", id: "spp-out-t", label: "Table column to read", value: (r) => r.table_column + " (" + r.fastener_label + " at " + fmt(r.fastener_spacing_in, 1) + " in entered)" },
    { key: "f", id: "spp-out-f", label: "Fasteners", value: (r) => fmt(r.fasteners_per_edge, 0) + " per edge, " + fmt(r.fasteners_per_panel, 0) + " per panel, " + fmt(r.total_fasteners, 0) + " total" },
    { key: "s", id: "spp-out-s", label: "4 x 8 sheets", value: (r) => fmt(r.sheets, 0) + (r.needs_splice ? " -- panel is LARGER than a sheet and needs a splice the exception does not provide for" : " (" + fmt(r.per_sheet, 0) + " panel(s) per sheet)") },
    { key: "n", id: "spp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStormPanelPlywood,
});

// ===================== spec-v1912: manufactured home diagonal tie-down anchor count =====================

// 24 CFR 3285.402 Tables 1-3, maximum diagonal tie-down strap spacing in
// inches (ft x 12 + in), null = N/A. Transcribed from the regulation and
// checked cell by cell against the Cornell LII copy on 2026-09-30.
// Keys: zone -> floor width -> strap height (in) -> [near 82.5, near 99.5,
// second 82.5, second 99.5]. Zone I has no method split (near columns only).
const _MH_TABLE = {
  I: {
    12: { 25: [170, null], 33: [141, null], 46: [109, null], 67: [null, null] },
    14: { 25: [218, 191], 33: [193, 162], 46: [159, 128], 67: [120, null] },
    16: { 25: [null, 233], 33: [228, 209], 46: [197, 175], 67: [157, 135] },
  },
  II: {
    12: { 25: [74, 51, null, null], 33: [62, null, null, null], 46: [48, null, null, null], 67: [null, null, 73, 75] },
    14: { 25: [91, 81, null, null], 33: [82, 69, null, null], 46: [67, 54, null, null], 67: [51, null, null, null] },
    16: { 25: [null, 94, null, null], 33: [90, 86, null, null], 46: [81, 72, null, null], 67: [64, 55, null, null] },
  },
  III: {
    12: { 25: [61, null, null, null], 33: [51, null, null, null], 46: [null, null, null, null], 67: [null, null, null, null] },
    14: { 25: [74, 67, null, null], 33: [68, 57, null, null], 46: [56, null, null, null], 67: [null, null, null, null] },
    16: { 25: [null, 75, null, null], 33: [73, 71, null, null], 46: [67, 60, null, null], 67: [53, null, null, null] },
  },
};

// dims: in { wind_zone: dimensionless, floor_width_row: dimensionless, home_length_ft: L, strap_height_row: dimensionless, beam_spacing_row: dimensionless, method: dimensionless, sections: dimensionless } out: { max_spacing_in: L, max_spacing_ft: L, run_ft: L, spaces_per_side: dimensionless, anchors_per_side: dimensionless, total_anchors: dimensionless, vertical_ties: dimensionless, spacing_used_ft: L }
export function computeManufacturedHomeAnchorCount({ wind_zone = "I", floor_width_row = "14", home_length_ft = 0, strap_height_row = "25", beam_spacing_row = "82.5", method = "near", sections = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(home_length_ft > 0)) return { error: "Home length must be positive." };
  if (!(home_length_ft > 4)) return { error: "Home length must exceed 4 ft: a strap goes within 2 ft of each end." };
  if (!(Number.isInteger(sections) && sections >= 1 && sections <= 3)) return { error: "Number of sections must be 1, 2, or 3." };
  const zone = _MH_TABLE[wind_zone];
  if (!zone) return { error: "Wind zone must be I, II, or III (24 CFR 3285.402 Tables 1-3)." };
  const byWidth = zone[floor_width_row];
  if (!byWidth) return { error: "Nominal floor width must be 12/24, 14/28, or 16/32 ft." };
  const row = byWidth[strap_height_row];
  if (!row) return { error: "Strap height must be one of the tabulated rows: 25, 33, 46, or 67 in." };
  if (!["82.5", "99.5"].includes(beam_spacing_row)) return { error: "I-beam spacing must be 82.5 or 99.5 in." };
  if (!["near", "second"].includes(method)) return { error: "Method must be near beam or second beam." };
  const col = (wind_zone === "I" || method === "near" ? 0 : 2) + (beam_spacing_row === "99.5" ? 1 : 0);
  const cellName = "Table " + (wind_zone === "I" ? 1 : wind_zone === "II" ? 2 : 3) + " to 3285.402, " + floor_width_row + " ft nominal width, " + strap_height_row + " in strap height, " + beam_spacing_row + " in I-beam spacing" + (wind_zone === "I" ? "" : ", " + method + " beam method");
  const max_spacing_in = row[col];
  if (max_spacing_in === null) return { error: "N/A in the regulation: " + cellName + " is not permitted as tabulated -- choose another configuration or have the anchorage engineered." };
  const max_spacing_ft = max_spacing_in / 12;
  const run_ft = home_length_ft - 4;
  const spaces_per_side = Math.max(1, Math.ceil(run_ft / max_spacing_ft - 1e-9));
  const anchors_per_side = spaces_per_side + 1;
  const total_anchors = 2 * anchors_per_side * sections;
  const vertical_required = wind_zone !== "I";
  const vertical_ties = vertical_required ? total_anchors : 0;
  const spacing_used_ft = run_ft / spaces_per_side;
  const spacing_label = Math.floor(max_spacing_in / 12 + 1e-9) + " ft " + (max_spacing_in % 12) + " in";
  return {
    max_spacing_in, max_spacing_ft, spacing_label, run_ft, spaces_per_side, anchors_per_side, total_anchors,
    vertical_required, vertical_ties, spacing_used_ft, cell: cellName, sections,
    limits: "Valid only within the table notes: 90 in maximum sidewall, 4 in maximum anchor-head inset, 20 degree (4.3/12) maximum roof pitch, 18 in minimum ground to floor-joist bottom, 30 to 60 degree strap angle, anchors certified to a 3,150 lb working load (4,725 lb ultimate), and NOT in flood or seismic hazard areas, where the anchorage is engineered.",
    note: "The federal installation standard does the engineering for common cases and prints the result as a spacing: wind zone sets the design wind, floor width how much house is trying to overturn, and strap height and frame spacing the geometry of the diagonal tie. The tile looks up the maximum spacing in 24 CFR 3285.402 Tables 1 to 3, places a strap within 2 ft of each end (the table note), and fills the length between at no more than that spacing. The step between zones is the headline: a 14 ft wide home with straps at 25 in and 82.5 in beam spacing may space ties at 18 ft 2 in in Zone I, 7 ft 7 in in Zone II, and 6 ft 2 in in Zone III, and Zones II and III also need a vertical tie at every diagonal tie location. Cells the regulation marks N/A are refused, not extrapolated. A reduced anchor or strap working load requires closer spacing, and anchors may not be closer than their listing permits. The data plate's wind zone must be at least the site's. This does not cover longitudinal anchorage (also required), anchor certification for the site's soil class, frost depth, homes within 1,500 ft of the coast, flood or seismic areas, or piers and footings; the count here is per the section count entered, and the manufacturer's instructions may require more ties. 24 CFR 3285, the manufacturer's installation instructions, the licensed installer, and the state administrative agency govern.",
  };
}

export const manufacturedHomeAnchorExample = { inputs: { wind_zone: "I", floor_width_row: "14", home_length_ft: 66, strap_height_row: "25", beam_spacing_row: "82.5", method: "near", sections: 1 } };
FLOODFIGHT_RENDERERS["manufactured-home-anchor-count"] = _simpleRenderer({
  citation: "Citation: 24 CFR 3285.402, Tables 1, 2, and 3 (maximum diagonal tie-down strap spacing, Wind Zones I, II, and III) and their notes -- federal regulation, transcribed -- and 3285.402(a)(2) (ground anchor working load 3,150 lb, ultimate 4,725 lb). The manufacturer's installation instructions, the installer, and the state administrative agency govern.",
  example: manufacturedHomeAnchorExample.inputs,
  fields: [
    { key: "wind_zone", label: "Wind zone", kind: "select", options: [{ value: "I", label: "Zone I" }, { value: "II", label: "Zone II" }, { value: "III", label: "Zone III" }], default: "I" },
    { key: "floor_width_row", label: "Nominal floor width, single/multi-section", kind: "select", options: [{ value: "12", label: "12/24 ft" }, { value: "14", label: "14/28 ft" }, { value: "16", label: "16/32 ft" }], default: "14" },
    { key: "home_length_ft", label: "Home length, per section (ft)", default: 66 },
    { key: "strap_height_row", label: "Max. height, ground to strap attachment", kind: "select", options: [{ value: "25", label: "25 in" }, { value: "33", label: "33 in" }, { value: "46", label: "46 in" }, { value: "67", label: "67 in" }], default: "25" },
    { key: "beam_spacing_row", label: "Main I-beam spacing", kind: "select", options: [{ value: "82.5", label: "82.5 in" }, { value: "99.5", label: "99.5 in" }], default: "82.5" },
    { key: "method", label: "Strap method (Zones II and III)", kind: "select", options: [{ value: "near", label: "Near beam" }, { value: "second", label: "Second beam" }], default: "near" },
    { key: "sections", label: "Number of sections", default: 1, attrs: { step: "1", min: "1", max: "3" } },
  ],
  outputs: [
    { key: "s", id: "mha-out-s", label: "Maximum strap spacing", value: (r) => r.spacing_label + " (" + r.cell + ")" },
    { key: "a", id: "mha-out-a", label: "Diagonal anchors", value: (r) => fmt(r.anchors_per_side, 0) + " per side, " + fmt(r.total_anchors, 0) + " total for " + fmt(r.sections, 0) + " section(s)" },
    { key: "u", id: "mha-out-u", label: "Spacing used", value: (r) => fmt(r.spaces_per_side, 0) + " spaces of " + fmt(r.spacing_used_ft, 2) + " ft over the " + fmt(r.run_ft, 1) + " ft between end straps" },
    { key: "v", id: "mha-out-v", label: "Vertical ties", value: (r) => r.vertical_required ? fmt(r.vertical_ties, 0) + " -- one at every diagonal tie location" : "not required by the Zone I table" },
    { key: "l", id: "mha-out-l", label: "Table limits", value: (r) => r.limits },
    { key: "n", id: "mha-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeManufacturedHomeAnchorCount,
});
