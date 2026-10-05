// calc-debris.js -- Groups E, J, and L: disaster debris management.
//
// Band of the disaster response and recovery program
// (specs/scope-disaster-response.md), specs v1913 through v1917:
//   v1913 hurricane-debris-estimate        (E, Carpentry and Construction)
//   v1914 structure-debris-estimate        (E, Carpentry and Construction)
//   v1915 debris-management-site-sizing    (E, Carpentry and Construction)
//   v1916 debris-load-ticket               (J, Trucking and Logistics)
//   v1917 hazard-tree-stump-screen         (L, Agriculture and Forestry)
// A module is independent of the group letter (the v28/v70..v103 split
// precedent).
//
// US sources only: FEMA-325, Public Assistance Debris Management Guide (2007),
// with its Appendix B USACE Hurricane Debris Estimating Model and Appendix G
// DAP9523.11 stump conversion; FEMA 329, Debris Estimating Field Guide (2010);
// and the FEMA Public Assistance Debris Monitoring Guide (March 2021). Every
// factor here is a federal public-domain figure. GOVERNANCE.general throughout.

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

export const DEBRIS_RENDERERS = {};

// FEMA 329 (2010) conversion factors, "USACE has developed several conversion
// factors ... that FEMA has determined are reasonable": cubic yards per ton.
const _CY_PER_TON = { softwood: 6, hardwood: 4, mixed: 4 };
const _CD_CY_PER_TON = 2;
const _WOOD_OPTIONS = [
  { value: "hardwood", label: "Hardwood (4 cy per ton)" },
  { value: "softwood", label: "Softwood (6 cy per ton)" },
  { value: "mixed", label: "Mixed debris (4 cy per ton)" },
];
const _YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const _NO_YES = [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }];
const _CUBIC_FT_PER_CY = 27;

// ===================== spec-v1913: USACE hurricane debris estimating model =====================

// USACE model factors, FEMA-325 Appendix B: cubic yards per household by
// storm category, and the vegetation, commercial, and precipitation
// multipliers.
const _CATEGORY_CY = { 1: 2, 2: 8, 3: 26, 4: 50, 5: 80 };
const _V_MULT = { light: 1.1, medium: 1.3, heavy: 1.5 };
const _B_MULT = { light: 1.0, medium: 1.2, heavy: 1.3 };
const _S_MULT = { none_light: 1.0, medium_heavy: 1.3 };
// FEMA-325 C&D composition after sorting (Hurricane Andrew).
const _CD_SPLIT = { burnable: 0.42, soil: 0.05, metals: 0.15, landfill: 0.38 };

// dims: in { population: dimensionless, persons_per_household: dimensionless, storm_category: dimensionless, vegetation: dimensionless, commercial: dimensionless, precipitation: dimensionless, woody_fraction: dimensionless, wood_type: dimensionless } out: { households: dimensionless, debris_cy: L^3, debris_low_cy: L^3, debris_high_cy: L^3, woody_cy: L^3, cd_cy: L^3, cd_burnable_cy: L^3, cd_soil_cy: L^3, cd_metals_cy: L^3, cd_landfill_cy: L^3, woody_tons: M, cd_tons: M, debris_weight_tons: M, reversed_mix_landfill_cy: L^3 }
export function computeHurricaneDebrisEstimate({ population = 0, persons_per_household = 3, storm_category = 0, vegetation = "medium", commercial = "light", precipitation = "none_light", woody_fraction = 0.3, wood_type = "hardwood" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(population > 0)) return { error: "Population must be positive." };
  if (!(persons_per_household > 0)) return { error: "Persons per household must be positive." };
  if (!(Number.isInteger(storm_category) && storm_category >= 1 && storm_category <= 5)) return { error: "Storm category must be a whole number from 1 to 5." };
  if (!(vegetation in _V_MULT)) return { error: "Vegetative cover must be light, medium, or heavy." };
  if (!(commercial in _B_MULT)) return { error: "Commercial density must be light, medium, or heavy." };
  if (!(precipitation in _S_MULT)) return { error: "Precipitation must be none to light or medium to heavy." };
  if (!(woody_fraction >= 0 && woody_fraction <= 1)) return { error: "Woody fraction must be between 0 and 1." };
  if (!(wood_type in _CY_PER_TON)) return { error: "Wood type must be hardwood, softwood, or mixed." };
  // The guide's Harrison County example carries the household count
  // unrounded; rounding it first moves the answer by about 42 cy.
  const households = population / persons_per_household;
  const category_cy_per_household = _CATEGORY_CY[storm_category];
  const v_multiplier = _V_MULT[vegetation];
  const b_multiplier = _B_MULT[commercial];
  const s_multiplier = _S_MULT[precipitation];
  const debris_cy = households * category_cy_per_household * v_multiplier * b_multiplier * s_multiplier;
  const debris_low_cy = debris_cy * 0.7;
  const debris_high_cy = debris_cy * 1.3;
  const woody_cy = debris_cy * woody_fraction;
  const cd_cy = debris_cy - woody_cy;
  const cd_burnable_cy = cd_cy * _CD_SPLIT.burnable;
  const cd_soil_cy = cd_cy * _CD_SPLIT.soil;
  const cd_metals_cy = cd_cy * _CD_SPLIT.metals;
  const cd_landfill_cy = cd_cy * _CD_SPLIT.landfill;
  const woody_cy_per_ton = _CY_PER_TON[wood_type];
  const woody_tons = woody_cy / woody_cy_per_ton;
  const cd_tons = cd_cy / _CD_CY_PER_TON;
  // The same storm with the composition reversed (the guide's Fran warning).
  const reversed_mix_landfill_cy = debris_cy * woody_fraction * _CD_SPLIT.landfill;
  const wet_below_cat3 = s_multiplier > 1 && storm_category < 3;
  return {
    households, category_cy_per_household, v_multiplier, b_multiplier, s_multiplier,
    debris_cy, debris_low_cy, debris_high_cy, woody_cy, cd_cy,
    cd_burnable_cy, cd_soil_cy, cd_metals_cy, cd_landfill_cy,
    woody_cy_per_ton, woody_tons, cd_tons, debris_weight_tons: woody_tons + cd_tons,
    reversed_mix_landfill_cy, wet_below_cat3,
    precipitation_verdict: wet_below_cat3
      ? "CHECK -- the model describes the wet-storm increase for category 3 and above; a 1.3 precipitation multiplier on a category " + storm_category + " storm is outside that description"
      : "precipitation multiplier consistent with the model's description",
    note: "The USACE model is a household count times a per-household debris factor for the storm category, adjusted for trees, commercial buildings, and rain. The category factor carries most of the spread -- a category 5 storm produces forty times the debris per household of a category 1 -- and the three multipliers can add about 150% on top. The result is a planning number with a stated accuracy of 30% either way, so the band matters more than the single figure. The composition split decides the disposal plan: clean woody debris can be ground or burned and reduced by 75% to 95%, while construction and demolition debris has to be sorted and most of it goes to a landfill. The default 30% woody split is from Hurricane Andrew and the guide warns another storm produced the reverse, so the fraction is an input to revisit once the first loads are seen. The weight factors are USACE conversions FEMA accepts, and field tests may be needed to confirm them. This is not a field estimate or a load-ticket quantity, and the model was not built for tornado, flood, earthquake, or wildfire debris. FEMA-325 is superseded in part by the Public Assistance Program and Policy Guide; the factors remain the published USACE values. FEMA Public Assistance, the state, and the applicant's debris management plan govern.",
  };
}

export const hurricaneDebrisExample = { inputs: { population: 45000, persons_per_household: 3, storm_category: 3, vegetation: "medium", commercial: "light", precipitation: "medium_heavy", woody_fraction: 0.3, wood_type: "hardwood" } };
DEBRIS_RENDERERS["hurricane-debris-estimate"] = _simpleRenderer({
  citation: "Citation: FEMA-325, Public Assistance Debris Management Guide (2007), Appendix B, USACE Hurricane Debris Estimating Model, Q = H x C x V x B x S with H = population / 3, and its stated plus-or-minus 30% accuracy; Hurricane Andrew composition and C&D split; FEMA 329 (2010) cubic-yard-to-ton conversions. FEMA Public Assistance and the applicant's debris management plan govern.",
  example: hurricaneDebrisExample.inputs,
  fields: [
    { key: "population", label: "Population of the affected area" },
    { key: "persons_per_household", label: "Persons per household (model: 3)", default: 3 },
    { key: "storm_category", label: "Hurricane category (1 to 5)", attrs: { step: "1", min: "1", max: "5" } },
    { key: "vegetation", label: "Vegetative cover", kind: "select", options: [{ value: "light", label: "Light (1.1)" }, { value: "medium", label: "Medium (1.3)" }, { value: "heavy", label: "Heavy (1.5)" }], default: "medium" },
    { key: "commercial", label: "Commercial density", kind: "select", options: [{ value: "light", label: "Light (1.0)" }, { value: "medium", label: "Medium (1.2)" }, { value: "heavy", label: "Heavy (1.3)" }], default: "light" },
    { key: "precipitation", label: "Precipitation", kind: "select", options: [{ value: "none_light", label: "None to light (1.0)" }, { value: "medium_heavy", label: "Medium to heavy, wet storm (1.3)" }], default: "none_light" },
    { key: "woody_fraction", label: "Clean woody fraction (0 to 1; Andrew: 0.3)", default: 0.3, attrs: { step: "any", min: "0", max: "1" } },
    { key: "wood_type", label: "Wood type", kind: "select", options: _WOOD_OPTIONS, default: "hardwood" },
  ],
  outputs: [
    { key: "households", id: "hde-out-h", label: "Households", value: (r) => fmt(r.households, 0) + " (" + fmt(r.category_cy_per_household, 0) + " cy per household for the category)" },
    { key: "debris_cy", id: "hde-out-q", label: "Debris volume", unit: "cy", value: (r) => fmt(r.debris_cy, 0) + " cy (V " + fmt(r.v_multiplier, 1) + ", B " + fmt(r.b_multiplier, 1) + ", S " + fmt(r.s_multiplier, 1) + ")" },
    { key: "debris_low_cy", id: "hde-out-band", label: "Plus or minus 30% band", unit: "cy", value: (r) => fmt(r.debris_low_cy, 0) + " to " + fmt(r.debris_high_cy, 0) + " cy" },
    { key: "woody_cy", id: "hde-out-w", label: "Clean woody", value: (r) => fmt(r.woody_cy, 0) + " cy = " + fmt(r.woody_tons, 0) + " tons at " + fmt(r.woody_cy_per_ton, 0) + " cy/ton" },
    { key: "cd_cy", id: "hde-out-cd", label: "Mixed C&D", value: (r) => fmt(r.cd_cy, 0) + " cy = " + fmt(r.cd_tons, 0) + " tons at 2 cy/ton" },
    { key: "cd_burnable_cy", id: "hde-out-split", label: "C&D after sorting", value: (r) => "burnable " + fmt(r.cd_burnable_cy, 0) + " cy; soil " + fmt(r.cd_soil_cy, 0) + "; metals " + fmt(r.cd_metals_cy, 0) + "; landfill " + fmt(r.cd_landfill_cy, 0) },
    { key: "debris_weight_tons", id: "hde-out-t", label: "Total weight", unit: "tons", value: (r) => fmt(r.debris_weight_tons, 0) + " tons" },
    { key: "reversed_mix_landfill_cy", id: "hde-out-rev", label: "Landfill if the mix is reversed", unit: "cy", value: (r) => fmt(r.reversed_mix_landfill_cy, 0) + " cy against " + fmt(r.cd_landfill_cy, 0) },
    { key: "precipitation_verdict", id: "hde-out-s", label: "Precipitation multiplier", value: (r) => r.precipitation_verdict },
    { key: "note", id: "hde-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHurricaneDebrisEstimate,
});

// ===================== spec-v1914: FEMA building and contents debris estimate =====================

// FEMA 329 (2010): single-family formula L x W x S x 0.20 x VCM with the VCM
// on the first story only; mobile homes 290 and 415 cy; flooded-home personal
// property 25-30 cy (slab on grade) and 45-50 cy (basement); general building
// L x W x H x 0.33 / 27.
const _VCM = { none: 1.0, light: 1.1, medium: 1.3, heavy: 1.5 };
const _SFR_CY_PER_SQFT_STORY = 0.2;
const _AIR_SPACE_FACTOR = 0.33;
const _FIXED_RANGE_CY = {
  mobile_single: [290, 290],
  mobile_double: [415, 415],
  flooded_slab: [25, 30],
  flooded_basement: [45, 50],
};

// dims: in { structure_type: dimensionless, structure_count: dimensionless, length_ft: L, width_ft: L, stories: dimensionless, height_ft: L, vegetation: dimensionless, wood_type: dimensionless } out: { vcm: dimensionless, structural_cy: L^3, vegetative_cy: L^3, per_structure_low_cy: L^3, per_structure_high_cy: L^3, per_structure_cy: L^3, total_low_cy: L^3, total_high_cy: L^3, total_cy: L^3, naive_whole_house_cy: L^3, naive_overstatement_pct: dimensionless, cd_tons: M, woody_tons: M, debris_weight_tons: M }
export function computeStructureDebrisEstimate({ structure_type = "single_family", structure_count = 1, length_ft = 0, width_ft = 0, stories = 1, height_ft = 0, vegetation = "medium", wood_type = "hardwood" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const types = ["single_family", "mobile_single", "mobile_double", "flooded_slab", "flooded_basement", "other_building"];
  if (!types.includes(structure_type)) return { error: "Choose a structure type." };
  if (!(Number.isInteger(structure_count) && structure_count >= 1)) return { error: "Structure count must be a whole number of at least 1." };
  if (!(vegetation in _VCM)) return { error: "Vegetative cover must be none, light, medium, or heavy." };
  if (!(wood_type in _CY_PER_TON)) return { error: "Wood type must be hardwood, softwood, or mixed." };
  const needsFootprint = structure_type === "single_family" || structure_type === "other_building";
  if (needsFootprint && !(length_ft > 0 && width_ft > 0)) return { error: "Length and width must be positive." };
  if (structure_type === "single_family" && !(stories >= 1)) return { error: "Stories must be at least 1." };
  if (structure_type === "other_building" && !(height_ft > 0)) return { error: "Building height must be positive." };
  const vcm = structure_type === "single_family" ? _VCM[vegetation] : 1;
  let structural_cy = 0;
  let vegetative_cy = 0;
  let per_structure_low_cy = 0;
  let per_structure_high_cy = 0;
  let naive_whole_house_cy = 0;
  if (structure_type === "single_family") {
    // FEMA 329: the VCM applies to the debris of the first story only (S = 1).
    structural_cy = length_ft * width_ft * stories * _SFR_CY_PER_SQFT_STORY;
    vegetative_cy = length_ft * width_ft * _SFR_CY_PER_SQFT_STORY * (vcm - 1);
    per_structure_low_cy = per_structure_high_cy = structural_cy + vegetative_cy;
    naive_whole_house_cy = structural_cy * vcm;
  } else if (structure_type === "other_building") {
    structural_cy = length_ft * width_ft * height_ft * _AIR_SPACE_FACTOR / _CUBIC_FT_PER_CY;
    per_structure_low_cy = per_structure_high_cy = naive_whole_house_cy = structural_cy;
  } else {
    [per_structure_low_cy, per_structure_high_cy] = _FIXED_RANGE_CY[structure_type];
    structural_cy = (per_structure_low_cy + per_structure_high_cy) / 2;
    naive_whole_house_cy = structural_cy;
  }
  const per_structure_cy = (per_structure_low_cy + per_structure_high_cy) / 2;
  const total_low_cy = per_structure_low_cy * structure_count;
  const total_high_cy = per_structure_high_cy * structure_count;
  const total_cy = per_structure_cy * structure_count;
  const naive_overstatement_pct = 100 * (naive_whole_house_cy - per_structure_cy) / per_structure_cy;
  const woody_cy_per_ton = _CY_PER_TON[wood_type];
  const cd_tons = structural_cy * structure_count / _CD_CY_PER_TON;
  const woody_tons = vegetative_cy * structure_count / woody_cy_per_ton;
  const multi_story_trap = structure_type === "single_family" && stories > 1 && vcm > 1;
  return {
    vcm, structural_cy, vegetative_cy, per_structure_low_cy, per_structure_high_cy, per_structure_cy,
    total_low_cy, total_high_cy, total_cy, naive_whole_house_cy, naive_overstatement_pct, multi_story_trap,
    woody_cy_per_ton, cd_tons, woody_tons, debris_weight_tons: cd_tons + woody_tons,
    trap_verdict: multi_story_trap
      ? "multi-story: the vegetation multiplier is applied to the first story only; applying it to the whole house would overstate by " + (Math.round(naive_overstatement_pct * 10) / 10) + "%"
      : "no multi-story vegetation adjustment applies",
    note: "The residential formula is a destroyed house's floor area times 0.20 cubic yards per square foot per story, from FEMA's field study after Hurricane Floyd, with a vegetative cover multiplier for the trees and shrubs that come down with it; it reproduces FEMA's table, where a 2,000 sq ft single-story house under medium canopy is 520 cy. The vegetation belongs to the lot, not to each floor, so on a multi-story house FEMA applies the multiplier to the first story's debris only -- multiplying the whole house by it overstates the estimate, and over a neighborhood that becomes a contract for debris that does not exist. Mobile homes have their own figures because they have little air space; a flooded house that is still standing produces only its ruined personal property, a range FEMA gives with and without a basement; other buildings use the volume formula with 0.33 for air space. The two building formulas give different answers for the same structure, and the Debris Task Force Leader picks one. Tons use the USACE conversions (C&D 2 cy per ton), which field tests may need to confirm. It does not replace load tickets, address hazardous materials, asbestos, household hazardous waste, white goods, or electronics that must be segregated, or cover partially damaged structures beyond flooded contents. FEMA Public Assistance and the applicant's debris management plan govern.",
  };
}

export const structureDebrisExample = { inputs: { structure_type: "single_family", structure_count: 1, length_ft: 30, width_ft: 40, stories: 2, height_ft: 0, vegetation: "medium", wood_type: "hardwood" } };
DEBRIS_RENDERERS["structure-debris-estimate"] = _simpleRenderer({
  citation: "Citation: FEMA 329, Debris Estimating Field Guide (2010), single-family formula L x W x S x 0.20 x VCM with the VCM applied to first-story debris only, mobile home volumes, flooded personal property volumes, and the general building formula L x W x H x 0.33 / 27; FEMA-325 (2007) Chapter 6; USACE cubic-yard-to-ton conversions. FEMA Public Assistance governs.",
  example: structureDebrisExample.inputs,
  fields: [
    { key: "structure_type", label: "Structure type", kind: "select", options: [
      { value: "single_family", label: "Destroyed single-family house" },
      { value: "mobile_single", label: "Single-wide mobile home (290 cy)" },
      { value: "mobile_double", label: "Double-wide mobile home (415 cy)" },
      { value: "flooded_slab", label: "Flooded home contents, slab on grade (25-30 cy)" },
      { value: "flooded_basement", label: "Flooded home contents, with basement (45-50 cy)" },
      { value: "other_building", label: "Other building (L x W x H x 0.33)" },
    ], default: "single_family" },
    { key: "structure_count", label: "Number of structures", default: 1, attrs: { step: "1", min: "1" } },
    { key: "length_ft", label: "Length (ft)" },
    { key: "width_ft", label: "Width (ft)" },
    { key: "stories", label: "Stories (house)", default: 1, attrs: { step: "any", min: "1" } },
    { key: "height_ft", label: "Height (ft, other building)", default: 0 },
    { key: "vegetation", label: "Vegetative cover (house)", kind: "select", options: [{ value: "none", label: "None (1.0)" }, { value: "light", label: "Light (1.1)" }, { value: "medium", label: "Medium (1.3)" }, { value: "heavy", label: "Heavy (1.5)" }], default: "medium" },
    { key: "wood_type", label: "Vegetative debris wood type", kind: "select", options: _WOOD_OPTIONS, default: "hardwood" },
  ],
  outputs: [
    { key: "per_structure_cy", id: "sde-out-p", label: "Debris per structure", unit: "cy", value: (r) => r.per_structure_low_cy === r.per_structure_high_cy ? fmt(r.per_structure_cy, 0) + " cy" : fmt(r.per_structure_low_cy, 0) + " to " + fmt(r.per_structure_high_cy, 0) + " cy" },
    { key: "structural_cy", id: "sde-out-s", label: "Structure and vegetation", value: (r) => fmt(r.structural_cy, 0) + " cy structure + " + fmt(r.vegetative_cy, 0) + " cy vegetation (VCM " + fmt(r.vcm, 1) + ")" },
    { key: "total_cy", id: "sde-out-t", label: "Total for all structures", unit: "cy", value: (r) => r.total_low_cy === r.total_high_cy ? fmt(r.total_cy, 0) + " cy" : fmt(r.total_low_cy, 0) + " to " + fmt(r.total_high_cy, 0) + " cy" },
    { key: "debris_weight_tons", id: "sde-out-w", label: "Weight", unit: "tons", value: (r) => fmt(r.debris_weight_tons, 0) + " tons (" + fmt(r.cd_tons, 0) + " C&D at 2 cy/ton, " + fmt(r.woody_tons, 0) + " vegetative)" },
    { key: "naive_whole_house_cy", id: "sde-out-naive", label: "VCM on the whole house (wrong)", unit: "cy", value: (r) => fmt(r.naive_whole_house_cy, 0) + " cy" },
    { key: "trap_verdict", id: "sde-out-v", label: "Multi-story check", value: (r) => r.trap_verdict },
    { key: "note", id: "sde-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStructureDebrisEstimate,
});

// ===================== spec-v1915: debris management site acreage and volume reduction =====================

// 4,840 square yards per acre, exact. The guide rounds a 10 ft stack to 3.33
// yd (16,117 cy per acre); FEMA 329 prints the exact 16,133, used here.
const _SQYD_PER_ACRE = 4840;
const _FT_PER_YD = 3;
// FEMA-325 Chapter 8: about 100 acres per million cubic yards.
const _CH8_ACRES_PER_CY = 100 / 1000000;
// FEMA-325 Appendix B: burning leaves 5%, grinding leaves 25%.
const _REMAINING = { grind: 0.25, burn: 0.05 };

// dims: in { debris_volume_cy: L^3, woody_volume_cy: L^3, stack_height_ft: L, land_use_fraction: dimensionless, site_fill_count: dimensionless, reduction_method: dimensionless, processing_rate_cyh: L^3 T^-1, machine_count: dimensionless, operating_hours_per_day: T } out: { storage_cy_per_acre: L, storage_acres: L^2, gross_site_acres: L^2, ch8_check_acres: L^2, cycled_site_acres: L^2, ground_volume_cy: L^3, burned_volume_cy: L^3, reduced_volume_cy: L^3, volume_removed_cy: L^3, processing_machine_hours: T, processing_days: T, processing_workdays: T }
export function computeDebrisSiteSizing({ debris_volume_cy = 0, woody_volume_cy = 0, stack_height_ft = 10, land_use_fraction = 0.6, site_fill_count = 1, reduction_method = "grind", processing_rate_cyh = 125, machine_count = 0, operating_hours_per_day = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(debris_volume_cy > 0)) return { error: "Debris volume must be positive." };
  if (!(woody_volume_cy > 0)) return { error: "Woody volume must be positive." };
  if (!(woody_volume_cy <= debris_volume_cy)) return { error: "Woody volume cannot exceed the total debris volume." };
  if (!(stack_height_ft > 0)) return { error: "Stack height must be positive." };
  if (!(land_use_fraction > 0 && land_use_fraction <= 1)) return { error: "Land-use fraction must be greater than 0 and no more than 1." };
  if (!(site_fill_count >= 1)) return { error: "Site fills over the recovery must be at least 1." };
  if (!(reduction_method in _REMAINING)) return { error: "Reduction method must be grinding or burning." };
  if (!(processing_rate_cyh > 0)) return { error: "Processing rate must be positive." };
  if (!(Number.isInteger(machine_count) && machine_count >= 1)) return { error: "Machine count must be a whole number of at least 1." };
  if (!(operating_hours_per_day > 0 && operating_hours_per_day <= 24)) return { error: "Operating hours per day must be greater than 0 and no more than 24." };
  const storage_cy_per_acre = _SQYD_PER_ACRE * stack_height_ft / _FT_PER_YD;
  const storage_acres = debris_volume_cy / storage_cy_per_acre;
  const land_use_factor = 1 / land_use_fraction;
  const gross_site_acres = storage_acres * land_use_factor;
  const ch8_check_acres = debris_volume_cy * _CH8_ACRES_PER_CY;
  const cycled_site_acres = gross_site_acres / site_fill_count;
  const ground_volume_cy = woody_volume_cy * _REMAINING.grind;
  const burned_volume_cy = woody_volume_cy * _REMAINING.burn;
  const reduced_volume_cy = woody_volume_cy * _REMAINING[reduction_method];
  const volume_removed_cy = woody_volume_cy - reduced_volume_cy;
  const processing_machine_hours = woody_volume_cy / processing_rate_cyh;
  const processing_days = processing_machine_hours / (machine_count * operating_hours_per_day);
  const processing_workdays = Math.ceil(processing_days - 1e-9);
  return {
    storage_cy_per_acre, storage_acres, land_use_factor, gross_site_acres, ch8_check_acres,
    ch8_difference_pct: 100 * (gross_site_acres - ch8_check_acres) / ch8_check_acres,
    cycled_site_acres, ground_volume_cy, burned_volume_cy, reduced_volume_cy, volume_removed_cy,
    processing_machine_hours, processing_days, processing_workdays,
    method_label: reduction_method === "burn" ? "burning (5% remains as ash)" : "grinding (25% remains as mulch)",
    note: "A debris site is a stacking problem. The USACE model stacks debris ten feet high, which puts about 16,000 cubic yards on an acre, and then uses only 60% of the land for piles -- the other 40% is haul roads, fire breaks, burn pits, sorting areas, and household hazardous waste collection, a factor of 1.66 in the guide. The Chapter 8 rule of thumb of 100 acres per million cubic yards lands within a few percent and is shown as a cross-check. Sites rarely hold the whole event at once: debris arrives, is reduced, and leaves as mulch or ash, so a site turned over every 45 to 60 days serves more than its standing capacity, and the acres divide by the number of fills over the recovery. Reduction is the whole strategy -- grinding cuts woody debris to a quarter of its volume and burning to a twentieth -- and processing time is set by the grinders, whose published rates are optimistic: contaminated debris fed slowly averages 100 to 150 cubic yards an hour. This does not select or permit a site, address air, water, and soil permits, ash testing, mulch fire risk (the guide limits mulch piles to 15 ft), restoration, or baseline sampling; monitored production governs over any rate. FEMA-325, the state environmental agency, and the applicant's debris management plan govern.",
  };
}

export const debrisSiteExample = { inputs: { debris_volume_cy: 659100, woody_volume_cy: 197730, stack_height_ft: 10, land_use_fraction: 0.6, site_fill_count: 1, reduction_method: "grind", processing_rate_cyh: 125, machine_count: 4, operating_hours_per_day: 10 } };
DEBRIS_RENDERERS["debris-management-site-sizing"] = _simpleRenderer({
  citation: "Citation: FEMA-325, Public Assistance Debris Management Guide (2007), Appendix B, USACE model Step 2 (10 ft stack, 4,840 sq yd per acre, 60% land use, factor 1.66, site cycling) and reduction ratios (burning 95%, grinding 75%), Chapter 8 (about 100 acres per 1,000,000 cy), and grinder rates of 100 to 150 cy/h on contaminated debris; FEMA 329 (2010) 16,133 cy per acre at 10 ft. The state environmental agency and the applicant's plan govern.",
  example: debrisSiteExample.inputs,
  fields: [
    { key: "debris_volume_cy", label: "Total debris volume (cy)" },
    { key: "woody_volume_cy", label: "Clean woody volume to reduce (cy)" },
    { key: "stack_height_ft", label: "Stack height (ft)", default: 10 },
    { key: "land_use_fraction", label: "Land-use fraction for piles (model: 0.6)", default: 0.6, attrs: { step: "any", min: "0", max: "1" } },
    { key: "site_fill_count", label: "Times the site is filled over the recovery", default: 1, attrs: { step: "any", min: "1" } },
    { key: "reduction_method", label: "Reduction method", kind: "select", options: [{ value: "grind", label: "Grinding (25% remains)" }, { value: "burn", label: "Burning (5% remains)" }], default: "grind" },
    { key: "processing_rate_cyh", label: "Processing rate per machine (cy/h)", default: 125 },
    { key: "machine_count", label: "Number of machines", attrs: { step: "1", min: "1" } },
    { key: "operating_hours_per_day", label: "Operating hours per day", default: 10 },
  ],
  outputs: [
    { key: "storage_acres", id: "dms-out-s", label: "Storage acres", unit: "acres", value: (r) => fmt(r.storage_acres, 1) + " acres at " + fmt(r.storage_cy_per_acre, 0) + " cy per acre" },
    { key: "gross_site_acres", id: "dms-out-g", label: "Gross site acres", unit: "acres", value: (r) => fmt(r.gross_site_acres, 1) + " acres (x " + fmt(r.land_use_factor, 3) + ")" },
    { key: "ch8_check_acres", id: "dms-out-c", label: "Chapter 8 cross-check", unit: "acres", value: (r) => fmt(r.ch8_check_acres, 1) + " acres (" + fmt(r.ch8_difference_pct, 1) + "% difference)" },
    { key: "cycled_site_acres", id: "dms-out-cy", label: "Acres with site cycling", unit: "acres", value: (r) => fmt(r.cycled_site_acres, 1) + " acres" },
    { key: "reduced_volume_cy", id: "dms-out-r", label: "Volume after reduction", unit: "cy", value: (r) => fmt(r.reduced_volume_cy, 0) + " cy by " + r.method_label + "; mulch " + fmt(r.ground_volume_cy, 0) + " cy, ash " + fmt(r.burned_volume_cy, 0) + " cy" },
    { key: "processing_machine_hours", id: "dms-out-h", label: "Machine-hours", unit: "h", value: (r) => fmt(r.processing_machine_hours, 0) + " machine-hours" },
    { key: "processing_days", id: "dms-out-d", label: "Days to process", unit: "days", value: (r) => fmt(r.processing_days, 1) + " days (" + fmt(r.processing_workdays, 0) + " working days)" },
    { key: "note", id: "dms-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDebrisSiteSizing,
});

// ===================== spec-v1916: FEMA debris load ticket eligible cubic yards =====================

// FEMA Debris Monitoring Guide (2021): no solid tailgate -> 85% of certified
// capacity; hand-loaded -> 50% of the observed load.
const _NO_TAILGATE_FACTOR = 0.85;
const _HAND_LOAD_FACTOR = 0.5;

// dims: in { bed_length_ft: L, bed_width_ft: L, bed_height_ft: L, certified_override_cy: L^3, solid_tailgate: dimensionless, hand_loaded: dimensionless, observed_pct: dimensionless } out: { certified_capacity_cy: L^3, capacity_basis_cy: L^3, tailgate_reduction_cy: L^3, observed_load_cy: L^3, hand_load_reduction_cy: L^3, eligible_cy: L^3, eligible_pct_of_certified: dimensionless }
export function computeDebrisLoadTicket({ bed_length_ft = 0, bed_width_ft = 0, bed_height_ft = 0, certified_override_cy = 0, solid_tailgate = "yes", hand_loaded = "no", observed_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(certified_override_cy >= 0)) return { error: "Certified capacity cannot be negative." };
  if (!(certified_override_cy > 0) && !(bed_length_ft > 0 && bed_width_ft > 0 && bed_height_ft > 0)) return { error: "Bed length, width, and height must be positive (or enter a certified capacity)." };
  if (!(solid_tailgate === "yes" || solid_tailgate === "no")) return { error: "Solid tailgate must be yes or no." };
  if (!(hand_loaded === "yes" || hand_loaded === "no")) return { error: "Hand-loaded must be yes or no." };
  if (!(observed_pct >= 0 && observed_pct <= 100)) return { error: "Observed percent full must be between 0 and 100." };
  const certified_capacity_cy = certified_override_cy > 0
    ? certified_override_cy
    : bed_length_ft * bed_width_ft * bed_height_ft / _CUBIC_FT_PER_CY;
  const capacity_basis_cy = certified_capacity_cy * (solid_tailgate === "no" ? _NO_TAILGATE_FACTOR : 1);
  const tailgate_reduction_cy = certified_capacity_cy - capacity_basis_cy;
  const observed_load_cy = capacity_basis_cy * observed_pct / 100;
  const after_hand_cy = observed_load_cy * (hand_loaded === "yes" ? _HAND_LOAD_FACTOR : 1);
  const hand_load_reduction_cy = observed_load_cy - after_hand_cy;
  // Never credit more than the certified capacity (heaped loads are not paid).
  const eligible_cy = Math.min(after_hand_cy, certified_capacity_cy);
  return {
    certified_capacity_cy, capacity_basis_cy, tailgate_reduction_cy, observed_load_cy,
    hand_load_reduction_cy, eligible_cy,
    eligible_pct_of_certified: 100 * eligible_cy / certified_capacity_cy,
    observed_pct,
    reductions: (solid_tailgate === "no" ? "no solid tailgate: basis cut to 85% of certified; " : "solid tailgate: full certified basis; ")
      + (hand_loaded === "yes" ? "hand-loaded: observed load halved" : "machine-loaded: no hand-load reduction"),
    note: "A debris load ticket is a measurement dressed as a percentage. The bed is measured once and certified to the top of the sideboards; every load is then called by a monitor as a percent of that capacity, and the ticket carries the product. FEMA's monitoring guide adds two reductions the monitor applies without being asked: a truck with no solid tailgate cannot be packed to capacity, so its basis is cut to 85% before the percent-full call is applied, and a hand-loaded truck or trailer cannot be packed as densely as a machine-loaded one, so its load is halved. The order matters, and the guide's own example -- a 20 cy truck with no tailgate becomes a 17 cy basis, 85% full is 14.5 cy and 75% full is 12.8 cy -- is reproduced here. A truck is never credited with more than its measured capacity, whatever is heaped above the sideboards. Each reduction is reported separately so the ticket can be audited line by line. This does not certify trucks, judge percent full, handle weight or scale tickets, price the load, or decide whether the debris itself is eligible. The Public Assistance Program and Policy Guide and the monitoring guide in force at the time of the disaster govern, with FEMA Public Assistance and the applicant's debris monitoring contract.",
  };
}

export const debrisLoadTicketExample = { inputs: { bed_length_ft: 16, bed_width_ft: 7.5, bed_height_ft: 4.5, certified_override_cy: 0, solid_tailgate: "no", hand_loaded: "no", observed_pct: 85 } };
DEBRIS_RENDERERS["debris-load-ticket"] = _simpleRenderer({
  citation: "Citation: FEMA, Public Assistance Debris Monitoring Guide (March 2021): trucks measured and placarded at certified capacity; no solid tailgate, maximum 85% of certified capacity; hand-loaded trucks and trailers, automatic 50% reduction; no credit above the measured capacity; worked example 20 cy to 17 cy, 14.5 cy at 85% and 12.8 cy at 75%. FEMA Public Assistance and the applicant's monitoring contract govern.",
  example: debrisLoadTicketExample.inputs,
  fields: [
    { key: "bed_length_ft", label: "Bed length (ft)" },
    { key: "bed_width_ft", label: "Bed width (ft)" },
    { key: "bed_height_ft", label: "Bed height to top of sideboards (ft)" },
    { key: "certified_override_cy", label: "Certified capacity if known (cy; 0 = use the bed)", default: 0 },
    { key: "solid_tailgate", label: "Solid tailgate", kind: "select", options: _YES_NO, default: "yes" },
    { key: "hand_loaded", label: "Hand-loaded", kind: "select", options: _NO_YES, default: "no" },
    { key: "observed_pct", label: "Monitor's percent full call (%)", attrs: { step: "any", min: "0", max: "100" } },
  ],
  outputs: [
    { key: "certified_capacity_cy", id: "dlt-out-c", label: "Certified capacity", unit: "cy", value: (r) => fmt(r.certified_capacity_cy, 1) + " cy" },
    { key: "capacity_basis_cy", id: "dlt-out-b", label: "Capacity basis after the tailgate rule", unit: "cy", value: (r) => fmt(r.capacity_basis_cy, 1) + " cy (" + fmt(r.tailgate_reduction_cy, 1) + " cy tailgate reduction)" },
    { key: "observed_load_cy", id: "dlt-out-o", label: "Load at the percent-full call", unit: "cy", value: (r) => fmt(r.observed_load_cy, 2) + " cy at " + fmt(r.observed_pct, 0) + "%" },
    { key: "hand_load_reduction_cy", id: "dlt-out-h", label: "Hand-load reduction", unit: "cy", value: (r) => fmt(r.hand_load_reduction_cy, 2) + " cy" },
    { key: "eligible_cy", id: "dlt-out-e", label: "Eligible cubic yards on the ticket", unit: "cy", value: (r) => fmt(r.eligible_cy, 1) + " cy (" + fmt(r.eligible_pct_of_certified, 1) + "% of certified)" },
    { key: "reductions", id: "dlt-out-r", label: "Reductions applied", value: (r) => r.reductions },
    { key: "note", id: "dlt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDebrisLoadTicket,
});

// ===================== spec-v1917: FEMA hazardous tree, hanger, and stump screen =====================

// FEMA-325 Appendix G, DAP9523.11 stump conversion: root ball diameter 3.6 x
// the stump diameter, root ball height 31 in; a 24 in stump length reproduces
// the table (the table text does not state it). 36^3 cubic inches per cy.
// The table uses 0.7854 for pi / 4; the exact value differs by 0.0009%.
const _ROOT_BALL_RATIO = 3.6;
const _ROOT_BALL_HEIGHT_IN = 31;
const _STUMP_LENGTH_IN = 24;
const _CUBIC_IN_PER_CY = 36 ** 3;

// dims: in { disaster_threat: dimensionless, dbh_in: L, crown_damage_pct: dimensionless, split_trunk: dimensionless, fallen_in_public_use: dimensionless, lean_offset_ft: L, lean_height_ft: L, root_ball_exposed_pct: dimensionless, hanger_dia_in: L, hanger_over_public_use: dimensionless, stump_dia_in: L, stump_on_public_property: dimensionless } out: { lean_deg: dimensionless, criteria_met_count: dimensionless, stump_volume_cy: L^3, root_ball_volume_cy: L^3, extraction_volume_cy: L^3, root_ball_share_pct: dimensionless, fill_volume_cy: L^3 }
export function computeHazardTreeStumpScreen({ disaster_threat = "yes", dbh_in = 0, crown_damage_pct = 0, split_trunk = "no", fallen_in_public_use = "no", lean_offset_ft = 0, lean_height_ft = 0, root_ball_exposed_pct = 0, hanger_dia_in = 0, hanger_over_public_use = "no", stump_dia_in = 0, stump_on_public_property = "yes" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  for (const [k, v] of Object.entries({ disaster_threat, split_trunk, fallen_in_public_use, hanger_over_public_use, stump_on_public_property })) {
    if (!(v === "yes" || v === "no")) return { error: "Each yes/no answer must be yes or no (" + k + ")." };
  }
  if (!(dbh_in > 0)) return { error: "Diameter at breast height must be positive." };
  if (!(crown_damage_pct >= 0 && crown_damage_pct <= 100)) return { error: "Crown damage must be between 0 and 100 percent." };
  if (!(lean_height_ft > 0)) return { error: "Lean measurement height must be positive." };
  if (!(lean_offset_ft >= 0)) return { error: "Horizontal offset of the top cannot be negative." };
  if (!(root_ball_exposed_pct >= 0 && root_ball_exposed_pct <= 100)) return { error: "Root-ball exposure must be between 0 and 100 percent." };
  if (!(hanger_dia_in >= 0)) return { error: "Hanger diameter cannot be negative (enter 0 for no hanger)." };
  if (!(stump_dia_in > 0)) return { error: "Stump diameter must be positive." };
  const threat = disaster_threat === "yes";
  const lean_deg = Math.atan(lean_offset_ft / lean_height_ft) * 180 / Math.PI;
  const dbh_ok = dbh_in >= 6 - 1e-9 * Math.abs(6);
  const crown_ok = crown_damage_pct > 50;
  const split_ok = split_trunk === "yes";
  const fallen_ok = fallen_in_public_use === "yes";
  const lean_ok = lean_deg > 30;
  const criteria_met_count = [crown_ok, split_ok, fallen_ok, lean_ok].filter(Boolean).length;
  const tree_eligible = threat && dbh_ok && criteria_met_count > 0;
  const root_ball_half = root_ball_exposed_pct >= 50;
  const tree_action = !tree_eligible
    ? "does not meet the hazardous-tree criteria as entered"
    : root_ball_half
      ? "hazardous tree with 50% or more of the root ball exposed: remove it and screen the stump below"
      : "hazardous tree with less than 50% of the root ball exposed: cut flush at ground level; the stump is not separately eligible and grinding it is not eligible";
  const hanger_eligible = hanger_dia_in > 2 && hanger_over_public_use === "yes";
  const stump_over_24 = stump_dia_in > 24;
  const stump_eligible = threat && root_ball_half && stump_over_24 && stump_on_public_property === "yes";
  const quarterPi = Math.PI / 4;
  const stump_volume_cy = stump_dia_in ** 2 * quarterPi * _STUMP_LENGTH_IN / _CUBIC_IN_PER_CY;
  const root_ball_volume_cy = (_ROOT_BALL_RATIO * stump_dia_in) ** 2 * quarterPi * _ROOT_BALL_HEIGHT_IN / _CUBIC_IN_PER_CY;
  const extraction_volume_cy = stump_volume_cy + root_ball_volume_cy;
  return {
    lean_deg, dbh_ok, crown_ok, split_ok, fallen_ok, lean_ok, criteria_met_count, tree_eligible, tree_action,
    hanger_eligible,
    hanger_verdict: hanger_dia_in === 0 ? "no hanger entered"
      : hanger_eligible ? "eligible hanger: over 2 in at the break and threatening a public-use area"
        : "not an eligible hanger as entered (needs over 2 in at the break, on improved public property, threatening a public-use area)",
    stump_eligible,
    stump_verdict: stump_eligible
      ? "eligible for extraction as a hazardous stump: 50% or more of the root ball exposed, over 24 in at 24 in above ground, on public property, an immediate threat"
      : !root_ball_half
        ? "less than 50% of the root ball exposed: flush cut, not extracted"
        : !stump_over_24
          ? "24 in or less: not a special-equipment extraction; FEMA pays such stumps per cubic yard from the conversion table"
          : "does not meet the hazardous-stump criteria as entered",
    stump_volume_cy, root_ball_volume_cy, extraction_volume_cy,
    root_ball_share_pct: 100 * root_ball_volume_cy / extraction_volume_cy,
    fill_volume_cy: extraction_volume_cy,
    note: "The criteria are a checklist, applied in order so a crew can document each tree the way the reimbursement request will be reviewed. A tree is hazardous when its condition was caused by the disaster, it is an immediate threat, it is 6 in or more at breast height, and at least one of these holds: more than 50% of the crown damaged or destroyed, a split trunk or broken branches exposing heartwood, fallen or uprooted in a public-use area, or leaning more than 30 degrees. The lean is the one measurement that needs arithmetic: the angle is the arctangent of the top's horizontal offset over the height. A qualifying tree with less than half its root ball exposed is cut flush and the stump is not separately paid. A stump with half or more of its root ball exposed, over 24 in measured 24 in above ground, on improved public property or right-of-way, is extracted, and the volume is the stump and its root ball -- FEMA's conversion table uses a root ball 3.6 times the stump diameter and 31 in deep; the table does not state the stump length, and 24 in reproduces every row. The same volume is the fill for the hole, which the documentation asks for. The criteria come from the 2007 debris guide and are carried forward by the Public Assistance Program and Policy Guide, which governs where they differ. This does not assess tree risk as an arborist would, cover private-property trees except limbs over a public right-of-way, or price the work. FEMA Public Assistance, the state, and a qualified arborist govern.",
  };
}

export const hazardTreeStumpExample = { inputs: { disaster_threat: "yes", dbh_in: 30, crown_damage_pct: 0, split_trunk: "no", fallen_in_public_use: "yes", lean_offset_ft: 0, lean_height_ft: 8, root_ball_exposed_pct: 70, hanger_dia_in: 0, hanger_over_public_use: "no", stump_dia_in: 36, stump_on_public_property: "yes" } };
DEBRIS_RENDERERS["hazard-tree-stump-screen"] = _simpleRenderer({
  citation: "Citation: FEMA-325, Public Assistance Debris Management Guide (2007), Chapter 3 hazardous trees, hanging limbs, and hazardous stumps, and Appendix G, DAP9523.11 stump conversion (diameter measured 2 ft above ground, root ball 3.6 x the stump diameter and 31 in high; a 24 in stump length reproduces the table). The Public Assistance Program and Policy Guide in force at the time of the disaster governs.",
  example: hazardTreeStumpExample.inputs,
  fields: [
    { key: "disaster_threat", label: "Caused by the disaster and an immediate threat", kind: "select", options: _YES_NO, default: "yes" },
    { key: "dbh_in", label: "Tree diameter at breast height (in)" },
    { key: "crown_damage_pct", label: "Crown damaged or destroyed (%)", default: 0, attrs: { step: "any", min: "0", max: "100" } },
    { key: "split_trunk", label: "Split trunk or broken branches exposing heartwood", kind: "select", options: _NO_YES, default: "no" },
    { key: "fallen_in_public_use", label: "Fallen or uprooted in a public-use area", kind: "select", options: _NO_YES, default: "no" },
    { key: "lean_offset_ft", label: "Horizontal offset of the top from the base (ft)", default: 0 },
    { key: "lean_height_ft", label: "Height at which the offset is measured (ft)" },
    { key: "root_ball_exposed_pct", label: "Root ball exposed (%)", default: 0, attrs: { step: "any", min: "0", max: "100" } },
    { key: "hanger_dia_in", label: "Hanging limb diameter at the break (in; 0 = none)", default: 0 },
    { key: "hanger_over_public_use", label: "Hanger on public property, threatening a public-use area", kind: "select", options: _NO_YES, default: "no" },
    { key: "stump_dia_in", label: "Stump diameter 24 in above ground (in)" },
    { key: "stump_on_public_property", label: "Stump on improved public property or right-of-way", kind: "select", options: _YES_NO, default: "yes" },
  ],
  outputs: [
    { key: "tree_action", id: "hts-out-t", label: "Hazardous tree", value: (r) => r.tree_action + " (" + fmt(r.criteria_met_count, 0) + " of 4 damage criteria met)" },
    { key: "lean_deg", id: "hts-out-l", label: "Lean angle", unit: "degrees", value: (r) => fmt(r.lean_deg, 1) + " degrees" + (r.lean_ok ? " -- over 30, meets the lean criterion" : " -- 30 or less") },
    { key: "hanger_verdict", id: "hts-out-h", label: "Hanging limb", value: (r) => r.hanger_verdict },
    { key: "stump_verdict", id: "hts-out-s", label: "Stump", value: (r) => r.stump_verdict },
    { key: "extraction_volume_cy", id: "hts-out-v", label: "Extraction volume", unit: "cy", value: (r) => fmt(r.extraction_volume_cy, 2) + " cy (stump " + fmt(r.stump_volume_cy, 2) + " + root ball " + fmt(r.root_ball_volume_cy, 2) + "; " + fmt(r.root_ball_share_pct, 0) + "% root ball)" },
    { key: "fill_volume_cy", id: "hts-out-f", label: "Fill to restore the hole", unit: "cy", value: (r) => fmt(r.fill_volume_cy, 1) + " cy" },
    { key: "note", id: "hts-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHazardTreeStumpScreen,
});
