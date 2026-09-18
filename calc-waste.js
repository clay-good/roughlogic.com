// Groups M, J and G: solid waste, landfill, and transfer operations.
// spec-v1789..v1799 (scope-trade-expansion-3) cover the landfill as an asset
// (airspace and in-place density, daily cover, settlement and recovered
// airspace, working face geometry), what it emits (first-order gas generation,
// leachate water balance, flare capacity), and the operation feeding it
// (collection route time, transfer station throughput, vehicle payload,
// diversion rate and residual contamination).
//
// One module because the tiles are one system: density sets the airspace that
// cover consumes, the gas generation sets the flare, and the route feeds the
// transfer station that feeds the face.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const CU_FT_PER_CU_YD = 27;
const SQ_FT_PER_ACRE = 43560;
const LB_PER_TON = 2000;
const GAL_PER_CU_FT = 1728 / 231;
const LB_PER_MEGAGRAM = 1e6 / 453.59237; // 1 Mg = 1,000 kg, exactly defined
const CU_FT_PER_CU_M = 1 / (0.3048 * 0.3048 * 0.3048);
const DAYS_PER_YEAR = 365;
const MIN_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const SEC_PER_HOUR = 3600;
const BTU_PER_KWH = 3412;

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

export const WASTE_RENDERERS = {};

// ===== spec-v1789: landfill airspace consumption and in-place density =====

// Airspace is the asset and tonnage is only the revenue. Density is an
// OPERATING result rather than a property of the waste, so a site that improves
// compaction has extended its life without buying land or building a cell.

// dims: in { annual_tons: M, in_place_density_lb_per_cy: M L^-3, cover_ratio_pct: dimensionless, airspace_value_per_cy: dimensionless, improved_density_lb_per_cy: M L^-3 } out: { waste_airspace_cy: L^3, cover_airspace_cy: L^3, total_airspace_cy: L^3, airspace_utilization_factor: dimensionless, airspace_saved_cy: L^3 }
export function computeLandfillAirspaceDensity({ annual_tons = 0, in_place_density_lb_per_cy = 0, cover_ratio_pct = 0, airspace_value_per_cy = 0, improved_density_lb_per_cy = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(annual_tons > 0)) return { error: "Tonnage must be positive." };
  if (!(in_place_density_lb_per_cy > 0) || !(improved_density_lb_per_cy > 0)) return { error: "In-place densities must be positive." };
  if (!(cover_ratio_pct >= 0)) return { error: "The cover to waste volume ratio cannot be negative." };
  if (!(airspace_value_per_cy >= 0)) return { error: "The airspace unit value cannot be negative." };
  const consumptionAt = (density_lb_per_cy) => {
    const tons_per_cy = density_lb_per_cy / LB_PER_TON;
    const waste_airspace_cy = annual_tons / tons_per_cy;
    const cover_airspace_cy = waste_airspace_cy * cover_ratio_pct / 100;
    const total_airspace_cy = waste_airspace_cy + cover_airspace_cy;
    return {
      tons_per_cy, waste_airspace_cy, cover_airspace_cy, total_airspace_cy,
      airspace_utilization_factor: annual_tons / total_airspace_cy,
    };
  };
  const base = consumptionAt(in_place_density_lb_per_cy);
  const improved = consumptionAt(improved_density_lb_per_cy);
  const airspace_saved_cy = base.total_airspace_cy - improved.total_airspace_cy;
  return {
    tons_per_cy: base.tons_per_cy,
    waste_airspace_cy: base.waste_airspace_cy,
    cover_airspace_cy: base.cover_airspace_cy,
    total_airspace_cy: base.total_airspace_cy,
    airspace_utilization_factor: base.airspace_utilization_factor,
    cover_share_pct: 100 * base.cover_airspace_cy / base.total_airspace_cy,
    improved_total_airspace_cy: improved.total_airspace_cy,
    improved_airspace_utilization_factor: improved.airspace_utilization_factor,
    airspace_saved_cy,
    airspace_saved_pct: 100 * airspace_saved_cy / base.total_airspace_cy,
    density_improvement_pct: 100 * (improved_density_lb_per_cy - in_place_density_lb_per_cy) / in_place_density_lb_per_cy,
    airspace_saved_value: airspace_saved_cy * airspace_value_per_cy,
    note: "Density is a report card on the working face, not a description of the garbage: the same waste compacts very differently with the machine's weight, the pass count, the lift thickness, and the moisture, and passes are the lever the operator controls daily. Cover must be counted alongside the waste or the arithmetic flatters the site -- reporting density on waste alone while measuring capacity on total volume mixes two bases and runs the site out of airspace earlier than its projections say. The site's own survey of consumed airspace and its permitted capacity govern.",
  };
}

const airspaceExample = { annual_tons: 250000, in_place_density_lb_per_cy: 1200, cover_ratio_pct: 20, airspace_value_per_cy: 8, improved_density_lb_per_cy: 1500 };
WASTE_RENDERERS["landfill-airspace-density"] = _simpleRenderer({
  citation: "Citation: volumetric bookkeeping -- waste airspace = tons / in-place density in tons per cubic yard, cover airspace = waste airspace x the cover ratio, and the airspace utilisation factor = tons placed / total airspace consumed. In-place density is commonly 1,000 to 1,600 lb per cubic yard and cover commonly adds 15 to 25%. The site's own airspace survey and permitted capacity govern.",
  example: airspaceExample,
  fields: [
    { key: "annual_tons", label: "Tonnage placed (tons)" },
    { key: "in_place_density_lb_per_cy", label: "In-place density (lb/cy)" },
    { key: "cover_ratio_pct", label: "Cover as a share of waste volume (%)" },
    { key: "airspace_value_per_cy", label: "Committed airspace cost ($/cy)" },
    { key: "improved_density_lb_per_cy", label: "Improved density to compare (lb/cy)" },
  ],
  outputs: [
    { key: "waste_airspace_cy", id: "lad-waste", label: "Waste airspace consumed", unit: "cy", value: (r) => fmt(r.waste_airspace_cy, 0) + " cy at " + fmt(r.tons_per_cy, 3) + " tons/cy" },
    { key: "cover_airspace_cy", id: "lad-cover", label: "Cover airspace", unit: "cy", value: (r) => fmt(r.cover_airspace_cy, 0) + " cy -- " + fmt(r.cover_share_pct, 0) + "% of everything consumed is dirt" },
    { key: "total_airspace_cy", id: "lad-total", label: "Total airspace consumed", unit: "cy", value: (r) => fmt(r.total_airspace_cy, 0) + " cy" },
    { key: "airspace_utilization_factor", id: "lad-auf", label: "Airspace utilisation factor", value: (r) => fmt(r.airspace_utilization_factor, 3) + " tons per cy" },
    { key: "improved_total_airspace_cy", id: "lad-imp", label: "At the improved density", value: (r) => fmt(r.improved_total_airspace_cy, 0) + " cy total, AUF " + fmt(r.improved_airspace_utilization_factor, 3) },
    { key: "airspace_saved_cy", id: "lad-save", label: "Airspace saved", unit: "cy", value: (r) => fmt(r.airspace_saved_cy, 0) + " cy (" + fmt(r.airspace_saved_pct, 0) + "%) from a " + fmt(r.density_improvement_pct, 0) + "% density gain" },
    { key: "airspace_saved_value", id: "lad-val", label: "What that is worth", value: (r) => "$" + fmt(r.airspace_saved_value, 0) + " -- no capital and no permit" },
    { key: "note", id: "lad-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeLandfillAirspaceDensity,
});

// ======= spec-v1790: landfill gas generation (first-order decay) =======

// Each year's waste decays exponentially and the generations add. Output climbs
// while the site fills, PEAKS the year it closes, and then decays forever --
// which is why these projects are built in modules that come out as the gas
// falls rather than as one engine that never runs full again.

// dims: in { annual_tons: M, placement_years: T, methane_yield_m3_per_mg: L^3, decay_constant_per_year: T^-1, methane_fraction_pct: dimensionless, collection_efficiency_pct: dimensionless, methane_heating_value_btu_per_cf: M L^-1 T^-2, generator_efficiency_pct: dimensionless } out: { methane_m3_per_year: L^3, methane_cfm: L^3 T^-1, landfill_gas_cfm: L^3 T^-1, heat_rate_mmbtu_per_hr: M L^2 T^-3, gross_capacity_kw: M L^2 T^-3, collected_capacity_kw: M L^2 T^-3 }
export function computeLandfillGasGeneration({ annual_tons = 0, placement_years = 0, methane_yield_m3_per_mg = 0, decay_constant_per_year = 0, methane_fraction_pct = 0, collection_efficiency_pct = 0, methane_heating_value_btu_per_cf = 0, generator_efficiency_pct = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(annual_tons > 0)) return { error: "Annual tonnage must be positive." };
  if (!(placement_years >= 1)) return { error: "There must be at least one year of placement." };
  if (!(methane_yield_m3_per_mg > 0)) return { error: "The methane yield must be positive." };
  if (!(decay_constant_per_year > 0)) return { error: "The decay constant must be positive." };
  if (!(methane_fraction_pct > 0 && methane_fraction_pct <= 100)) return { error: "The methane fraction must be above 0 and at most 100%." };
  if (!(collection_efficiency_pct > 0 && collection_efficiency_pct <= 100)) return { error: "Collection efficiency must be above 0 and at most 100%." };
  if (!(methane_heating_value_btu_per_cf > 0)) return { error: "The methane heating value must be positive." };
  if (!(generator_efficiency_pct > 0 && generator_efficiency_pct <= 100)) return { error: "Generator efficiency must be above 0 and at most 100%." };
  const annual_megagrams = annual_tons * LB_PER_TON / LB_PER_MEGAGRAM;
  // The peak is at closure: every placement year is contributing and none has
  // decayed far. Sum e^(-k t) over the years since each was placed.
  let decay_sum = 0;
  for (let t = 0; t < Math.floor(placement_years); t++) decay_sum += Math.exp(-decay_constant_per_year * t);
  const methane_m3_per_year = decay_constant_per_year * methane_yield_m3_per_mg * annual_megagrams * decay_sum;
  const methane_cf_per_year = methane_m3_per_year * CU_FT_PER_CU_M;
  const methane_cfm = methane_cf_per_year / (DAYS_PER_YEAR * HOURS_PER_DAY * MIN_PER_HOUR);
  const landfill_gas_cfm = methane_cfm / (methane_fraction_pct / 100);
  const heat_rate_btu_per_hr = methane_cfm * methane_heating_value_btu_per_cf * MIN_PER_HOUR;
  const gross_capacity_kw = heat_rate_btu_per_hr * (generator_efficiency_pct / 100) / BTU_PER_KWH;
  const collected_capacity_kw = gross_capacity_kw * (collection_efficiency_pct / 100);
  const decayTo = (years) => collected_capacity_kw * Math.exp(-decay_constant_per_year * years);
  return {
    annual_megagrams, decay_sum, methane_m3_per_year, methane_cf_per_year,
    methane_cfm, landfill_gas_cfm,
    heat_rate_mmbtu_per_hr: heat_rate_btu_per_hr / 1e6,
    gross_capacity_kw, collected_capacity_kw,
    uncollected_capacity_kw: gross_capacity_kw - collected_capacity_kw,
    capacity_10yr_kw: decayTo(10),
    capacity_20yr_kw: decayTo(20),
    capacity_10yr_pct: 100 * Math.exp(-decay_constant_per_year * 10),
    capacity_20yr_pct: 100 * Math.exp(-decay_constant_per_year * 20),
    half_life_years: Math.LN2 / decay_constant_per_year,
    note: "Generation and collection are two different quantities and mixing them is the usual error in a project proposal: the model predicts what the waste produces, and the well field, cover, vacuum, and site condition decide how much reaches the header. The uncollected share is also the site's methane emission and its regulatory exposure. The decay constant is where the uncertainty lives and it is not small -- it expresses how fast the waste degrades, which depends overwhelmingly on moisture, and a factor of two or three between an arid and a wet site is ordinary. It moves the peak and the duration in OPPOSITE directions. This models the peak at closure; a full year-by-year projection, the site's own gas data, and the applicable Clean Air Act rules govern.",
  };
}

const lfgExample = { annual_tons: 250000, placement_years: 20, methane_yield_m3_per_mg: 100, decay_constant_per_year: 0.04, methane_fraction_pct: 50, collection_efficiency_pct: 75, methane_heating_value_btu_per_cf: 911, generator_efficiency_pct: 30 };
WASTE_RENDERERS["landfill-gas-generation"] = _simpleRenderer({
  citation: "Citation: first-order decay -- Q = sum over placement years of k x L0 x M x e^(-k t), with L0 the methane yield per megagram (the Clean Air Act default is 100 cubic metres) and k the methane generation rate constant (roughly 0.02 arid, 0.04 conventional, 0.05 to 0.07 wet or bioreactor). Landfill gas is roughly half methane and the energy is in the methane only; a well field recovers perhaps 60 to 85% of what is generated. The site's own gas data and the applicable Clean Air Act rules govern.",
  example: lfgExample,
  fields: [
    { key: "annual_tons", label: "Waste placed per year (tons)" },
    { key: "placement_years", label: "Years of placement", attrs: { step: "1", min: "1" } },
    { key: "methane_yield_m3_per_mg", label: "Methane yield L0 (cu m per Mg)" },
    { key: "decay_constant_per_year", label: "Decay constant k (per year)" },
    { key: "methane_fraction_pct", label: "Methane fraction of the gas (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "collection_efficiency_pct", label: "Collection efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "methane_heating_value_btu_per_cf", label: "Methane heating value (Btu/cu ft)" },
    { key: "generator_efficiency_pct", label: "Generator efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
  ],
  outputs: [
    { key: "methane_m3_per_year", id: "lgg-m3", label: "Methane generated at the peak", value: (r) => fmt(r.methane_m3_per_year, 0) + " cu m/yr (" + fmt(r.methane_cf_per_year, 0) + " cu ft/yr)" },
    { key: "methane_cfm", id: "lgg-cfm", label: "Flow at the peak", value: (r) => fmt(r.methane_cfm, 0) + " cfm of methane, " + fmt(r.landfill_gas_cfm, 0) + " cfm of landfill gas" },
    { key: "heat_rate_mmbtu_per_hr", id: "lgg-heat", label: "Heat rate", unit: "MMBtu/h", value: (r) => fmt(r.heat_rate_mmbtu_per_hr, 1) + " MMBtu/h" },
    { key: "gross_capacity_kw", id: "lgg-gross", label: "Gross generation if all of it arrived", unit: "kW", value: (r) => fmt(r.gross_capacity_kw, 0) + " kW" },
    { key: "collected_capacity_kw", id: "lgg-net", label: "Honest peak after collection", unit: "kW", value: (r) => fmt(r.collected_capacity_kw, 0) + " kW -- " + fmt(r.uncollected_capacity_kw, 0) + " kW escapes through the cover" },
    { key: "capacity_10yr_kw", id: "lgg-10", label: "Ten years after closure", unit: "kW", value: (r) => fmt(r.capacity_10yr_kw, 0) + " kW (" + fmt(r.capacity_10yr_pct, 0) + "% of the peak)" },
    { key: "capacity_20yr_kw", id: "lgg-20", label: "Twenty years after closure", unit: "kW", value: (r) => fmt(r.capacity_20yr_kw, 0) + " kW (" + fmt(r.capacity_20yr_pct, 0) + "%) -- the output halves every " + fmt(r.half_life_years, 0) + " years" },
    { key: "note", id: "lgg-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeLandfillGasGeneration,
});

// ========= spec-v1791: leachate generation from a water balance =========

// Every acre the site opens adds leachate to the treatment and hauling bill and
// every acre it caps takes it away. Storage rides out the peak; treatment
// capacity cannot.

// dims: in { open_acres: L^2, annual_precip_in: L, runoff_coefficient: dimensionless, evapotranspiration_coefficient: dimensionless, capped_infiltration_in_per_year: L, design_storm_in: L } out: { infiltration_in_per_year: L, leachate_gal_per_year: L^3, leachate_gpd: L^3 T^-1, gpd_per_acre: L T^-1, capped_gal_per_year: L^3, storm_volume_gal: L^3 }
export function computeLeachateWaterBalance({ open_acres = 0, annual_precip_in = 0, runoff_coefficient = 0, evapotranspiration_coefficient = 0, capped_infiltration_in_per_year = 0, design_storm_in = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(open_acres > 0)) return { error: "The open area must be positive." };
  if (!(annual_precip_in > 0)) return { error: "Annual precipitation must be positive." };
  if (!(runoff_coefficient >= 0) || !(evapotranspiration_coefficient >= 0)) return { error: "Runoff and evapotranspiration coefficients cannot be negative." };
  if (!(runoff_coefficient + evapotranspiration_coefficient < 1)) return { error: "Runoff and evapotranspiration together must leave some infiltration; their sum must be below 1." };
  if (!(capped_infiltration_in_per_year >= 0)) return { error: "The capped-area infiltration rate cannot be negative." };
  if (!(design_storm_in > 0)) return { error: "The design storm depth must be positive." };
  const area_sqft = open_acres * SQ_FT_PER_ACRE;
  const infiltration_fraction = 1 - runoff_coefficient - evapotranspiration_coefficient;
  const infiltration_in_per_year = annual_precip_in * infiltration_fraction;
  const gallonsFor = (depth_in) => (depth_in / 12) * area_sqft * GAL_PER_CU_FT;
  const leachate_gal_per_year = gallonsFor(infiltration_in_per_year);
  const capped_gal_per_year = gallonsFor(capped_infiltration_in_per_year);
  const leachate_gpd = leachate_gal_per_year / DAYS_PER_YEAR;
  const capped_gpd = capped_gal_per_year / DAYS_PER_YEAR;
  const storm_volume_gal = gallonsFor(design_storm_in * infiltration_fraction);
  return {
    area_sqft, infiltration_fraction, infiltration_in_per_year,
    leachate_gal_per_year, leachate_gpd,
    gpd_per_acre: leachate_gpd / open_acres,
    capped_gal_per_year, capped_gpd,
    capping_reduction_pct: 100 * (leachate_gal_per_year - capped_gal_per_year) / leachate_gal_per_year,
    deferred_cap_gpd: leachate_gpd - capped_gpd,
    storm_volume_gal,
    storm_days_of_average: storm_volume_gal / leachate_gpd,
    note: "The per-open-acre figure is the one to carry, because it converts directly: every acre opened adds that much to the treatment and hauling bill and every acre capped takes it away, which is the whole case for capping cells as they fill rather than at closure. A design storm arrives as many days of average flow at once, and a treatment system sized on the average with no storage has that many days of catching up to do -- the leachate has to be somewhere in the meantime. STORAGE rides out the peak; treatment capacity cannot. This is a screening water balance; HELP modelling, the site's own leachate records, and the permit govern.",
  };
}

const leachateExample = { open_acres: 20, annual_precip_in: 40, runoff_coefficient: 0.15, evapotranspiration_coefficient: 0.30, capped_infiltration_in_per_year: 2, design_storm_in: 2 };
WASTE_RENDERERS["leachate-water-balance"] = _simpleRenderer({
  citation: "Citation: a screening water balance -- infiltration = precipitation x (1 - runoff coefficient - evapotranspiration coefficient), and leachate volume = infiltration depth x area, at 7.48 gallons per cubic foot. HELP modelling, the site's own leachate records, and the permit's storage and treatment requirements govern.",
  example: leachateExample,
  fields: [
    { key: "open_acres", label: "Open cell area (acres)" },
    { key: "annual_precip_in", label: "Annual precipitation (in)" },
    { key: "runoff_coefficient", label: "Runoff coefficient", attrs: { step: "any", min: "0", max: "1" } },
    { key: "evapotranspiration_coefficient", label: "Evapotranspiration coefficient", attrs: { step: "any", min: "0", max: "1" } },
    { key: "capped_infiltration_in_per_year", label: "Capped-area infiltration (in/yr)" },
    { key: "design_storm_in", label: "Design storm depth (in)" },
  ],
  outputs: [
    { key: "infiltration_in_per_year", id: "lwb-inf", label: "Infiltration", value: (r) => fmt(r.infiltration_in_per_year, 1) + " in/yr over " + fmt(r.area_sqft, 0) + " sq ft" },
    { key: "leachate_gal_per_year", id: "lwb-yr", label: "Leachate generated", value: (r) => fmt(r.leachate_gal_per_year, 0) + " gal/yr (" + fmt(r.leachate_gpd, 0) + " gpd)" },
    { key: "gpd_per_acre", id: "lwb-acre", label: "Per open acre", value: (r) => fmt(r.gpd_per_acre, 0) + " gpd per open acre -- the number to carry" },
    { key: "capped_gal_per_year", id: "lwb-cap", label: "Capped, same area", value: (r) => fmt(r.capped_gal_per_year, 0) + " gal/yr (" + fmt(r.capped_gpd, 0) + " gpd) -- " + fmt(r.capping_reduction_pct, 0) + "% less" },
    { key: "deferred_cap_gpd", id: "lwb-defer", label: "Cost of deferring the cap", value: (r) => fmt(r.deferred_cap_gpd, 0) + " gpd of leachate management for every year of deferral" },
    { key: "storm_volume_gal", id: "lwb-storm", label: "The design storm", value: (r) => fmt(r.storm_volume_gal, 0) + " gal in one event -- " + fmt(r.storm_days_of_average, 0) + " days of average flow at once" },
    { key: "note", id: "lwb-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeLeachateWaterBalance,
});

// ============= spec-v1792: landfill daily cover soil volume =============

// Soil placed daily takes airspace that could have held waste. The arithmetic
// is the case for alternative daily cover -- but the cover is doing a job, and
// an alternative has to be APPROVED as meeting those purposes first.

// dims: in { face_length_ft: L, face_width_ft: L, cover_depth_in: L, operating_days: T, airspace_value_per_cy: dimensionless, annual_tons: M, in_place_density_lb_per_cy: M L^-3, alternative_cover_annual_cost: dimensionless } out: { cover_cy_per_day: L^3, cover_cy_per_year: L^3, cover_share_pct: dimensionless, cover_airspace_value: dimensionless, net_saving: dimensionless }
export function computeDailyCoverVolume({ face_length_ft = 0, face_width_ft = 0, cover_depth_in = 0, operating_days = 0, airspace_value_per_cy = 0, annual_tons = 0, in_place_density_lb_per_cy = 0, alternative_cover_annual_cost = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(face_length_ft > 0) || !(face_width_ft > 0)) return { error: "Working face dimensions must be positive." };
  if (!(cover_depth_in > 0)) return { error: "Cover depth must be positive." };
  if (!(operating_days > 0)) return { error: "Operating days per year must be positive." };
  if (!(airspace_value_per_cy >= 0) || !(alternative_cover_annual_cost >= 0)) return { error: "Costs cannot be negative." };
  if (!(annual_tons > 0) || !(in_place_density_lb_per_cy > 0)) return { error: "Annual tonnage and in-place density must be positive." };
  const face_area_sqft = face_length_ft * face_width_ft;
  const cover_cy_per_day = face_area_sqft * (cover_depth_in / 12) / CU_FT_PER_CU_YD;
  const cover_cy_per_year = cover_cy_per_day * operating_days;
  const tons_per_cy = in_place_density_lb_per_cy / LB_PER_TON;
  const waste_airspace_cy = annual_tons / tons_per_cy;
  const cover_airspace_value = cover_cy_per_year * airspace_value_per_cy;
  const net_saving = cover_airspace_value - alternative_cover_annual_cost;
  const recovered_tons = cover_cy_per_year * tons_per_cy;
  return {
    face_area_sqft, cover_cy_per_day, cover_cy_per_year,
    waste_airspace_cy,
    total_airspace_cy: waste_airspace_cy + cover_cy_per_year,
    cover_share_pct: 100 * cover_cy_per_year / (waste_airspace_cy + cover_cy_per_year),
    cover_airspace_value, net_saving,
    recovered_tons,
    extra_site_life_years: recovered_tons / annual_tons,
    note: "The cover is doing a job and the arithmetic does not excuse it from doing it: vector, litter, odour, fire, and scavenging control are why the requirement exists, and an alternative daily cover has to be APPROVED as meeting those purposes before any of this saving is available. The airspace value here is the committed construction, cover, closure, and post-care cost per cubic yard -- it is before the cost of buying, hauling, and placing the soil itself. The permit, the approved operations plan, and the regulator govern.",
  };
}

const coverExample = { face_length_ft: 100, face_width_ft: 150, cover_depth_in: 6, operating_days: 312, airspace_value_per_cy: 8, annual_tons: 250000, in_place_density_lb_per_cy: 1200, alternative_cover_annual_cost: 5000 };
WASTE_RENDERERS["daily-cover-volume"] = _simpleRenderer({
  citation: "Citation: geometry -- cover volume = working face area x cover depth, against the waste airspace the site's tonnage and in-place density consume. Six inches of daily cover is the common baseline requirement. An alternative daily cover must be approved as meeting the vector, litter, odour, fire, and scavenging purposes the requirement exists for; the permit and the regulator govern.",
  example: coverExample,
  fields: [
    { key: "face_length_ft", label: "Working face length (ft)" },
    { key: "face_width_ft", label: "Working face width (ft)" },
    { key: "cover_depth_in", label: "Cover depth (in)" },
    { key: "operating_days", label: "Operating days per year", attrs: { step: "1", min: "1" } },
    { key: "airspace_value_per_cy", label: "Committed airspace cost ($/cy)" },
    { key: "annual_tons", label: "Annual waste tonnage (tons)" },
    { key: "in_place_density_lb_per_cy", label: "In-place density (lb/cy)" },
    { key: "alternative_cover_annual_cost", label: "Alternative cover annual cost ($)" },
  ],
  outputs: [
    { key: "cover_cy_per_day", id: "dcv-day", label: "Cover soil per day", unit: "cy", value: (r) => fmt(r.cover_cy_per_day, 1) + " cy over " + fmt(r.face_area_sqft, 0) + " sq ft" },
    { key: "cover_cy_per_year", id: "dcv-yr", label: "Cover soil per year", unit: "cy", value: (r) => fmt(r.cover_cy_per_year, 0) + " cy, placed and then permanently buried" },
    { key: "cover_share_pct", id: "dcv-share", label: "Share of all airspace consumed", value: (r) => fmt(r.cover_share_pct, 1) + "% of the site's airspace is dirt" },
    { key: "cover_airspace_value", id: "dcv-val", label: "Annual airspace value of the soil", value: (r) => "$" + fmt(r.cover_airspace_value, 0) + " a year, before buying, hauling, and placing it" },
    { key: "net_saving", id: "dcv-net", label: "Net saving with an alternative cover", value: (r) => "$" + fmt(r.net_saving, 0) + " a year" },
    { key: "extra_site_life_years", id: "dcv-life", label: "Airspace freed", value: (r) => fmt(r.recovered_tons, 0) + " tons of capacity -- about " + fmt(r.extra_site_life_years, 2) + " years of extra site life per year used" },
    { key: "note", id: "dcv-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeDailyCoverVolume,
});

// ======== spec-v1793: waste collection route time and truck count ========

// Routes are watched in TONS, not stops. Stops per hour is the productivity
// measure; tons per route is the one that predicts the next bad Monday, because
// crossing a multiple of the payload adds a whole haul cycle in one step.

// dims: in { stop_count: dimensionless, seconds_per_stop: T, setout_weight_lb: M, truck_payload_tons: M, round_trip_min: T, tipping_min: T, fixed_time_hr: T, break_time_hr: T, shift_hours: T } out: { collection_hours: T, route_tons: M, disposal_loads: dimensionless, route_day_hours: T, overtime_hours: T, max_stops: dimensionless }
export function computeCollectionRouteProductivity({ stop_count = 0, seconds_per_stop = 0, setout_weight_lb = 0, truck_payload_tons = 0, round_trip_min = 0, tipping_min = 0, fixed_time_hr = 0, break_time_hr = 0, shift_hours = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(stop_count > 0) || !(seconds_per_stop > 0)) return { error: "Stop count and seconds per stop must be positive." };
  if (!(setout_weight_lb > 0) || !(truck_payload_tons > 0)) return { error: "Setout weight and truck payload must be positive." };
  if (!(round_trip_min > 0) || !(tipping_min > 0)) return { error: "Round trip and tipping times must be positive." };
  if (!(fixed_time_hr >= 0) || !(break_time_hr >= 0)) return { error: "Fixed and break time cannot be negative." };
  if (!(shift_hours > 0)) return { error: "The shift must be positive." };
  const collection_hours = stop_count * seconds_per_stop / SEC_PER_HOUR;
  const route_tons = stop_count * setout_weight_lb / LB_PER_TON;
  const disposal_loads = Math.ceil(route_tons / truck_payload_tons);
  const haul_hours = disposal_loads * round_trip_min / MIN_PER_HOUR;
  const tipping_hours = disposal_loads * tipping_min / MIN_PER_HOUR;
  const overhead_hours = fixed_time_hr + break_time_hr;
  const route_day_hours = collection_hours + haul_hours + tipping_hours + overhead_hours;
  const available_hours = shift_hours - haul_hours - tipping_hours - overhead_hours;
  const max_stops = Math.floor(available_hours * SEC_PER_HOUR / seconds_per_stop);
  // The cliff: one more load is a whole haul cycle, added in a single step.
  const next_load_hours = (disposal_loads + 1) * (round_trip_min + tipping_min) / MIN_PER_HOUR;
  const next_load_route_day_hours = collection_hours + next_load_hours + overhead_hours;
  return {
    collection_hours, route_tons, disposal_loads, haul_hours, tipping_hours,
    overhead_hours, route_day_hours,
    overtime_hours: route_day_hours - shift_hours,
    fits_shift: route_day_hours <= shift_hours,
    available_hours, max_stops,
    stops_over: stop_count - max_stops,
    stops_over_pct: max_stops > 0 ? 100 * (stop_count - max_stops) / max_stops : 0,
    stops_per_hour: stop_count / collection_hours,
    tons_to_next_load: (disposal_loads * truck_payload_tons) - route_tons,
    next_load_route_day_hours,
    next_load_step_hours: next_load_route_day_hours - route_day_hours,
    note: "The most common condition a route is found in is very slightly too long, because nobody rebuilds a route over half an hour. The cliff is the thing to watch: when tonnage crosses a multiple of the payload the day does not get gradually longer, it gets a whole haul cycle longer overnight, and the only warning was tons per route creeping up. Which is why routes are watched in TONS, not stops -- stops per hour is the productivity measure, tons per route is the one that predicts the next bad Monday. The operation's own time study and its collective bargaining agreement govern a standard used to staff or to pay.",
  };
}

const routeExample = { stop_count: 900, seconds_per_stop: 22, setout_weight_lb: 40, truck_payload_tons: 12, round_trip_min: 45, tipping_min: 15, fixed_time_hr: 0.5, break_time_hr: 0.5, shift_hours: 8 };
WASTE_RENDERERS["collection-route-productivity"] = _simpleRenderer({
  citation: "Citation: element build-up -- collection time = stops x seconds per stop, route tonnage = stops x average setout weight, disposal loads = route tonnage / truck payload rounded up, and the route day = collection + haul + tipping + fixed and break time. The operation's own time study and any applicable collective bargaining agreement govern a standard used to staff or to pay.",
  example: routeExample,
  fields: [
    { key: "stop_count", label: "Stops on the route", attrs: { step: "1", min: "1" } },
    { key: "seconds_per_stop", label: "Seconds per stop" },
    { key: "setout_weight_lb", label: "Average setout weight (lb)" },
    { key: "truck_payload_tons", label: "Truck payload (tons)" },
    { key: "round_trip_min", label: "Round trip to disposal (min)" },
    { key: "tipping_min", label: "Time at the tipping face (min)" },
    { key: "fixed_time_hr", label: "Fixed time in the shift (hours)" },
    { key: "break_time_hr", label: "Break time (hours)" },
    { key: "shift_hours", label: "Shift length (hours)" },
  ],
  outputs: [
    { key: "collection_hours", id: "crp-coll", label: "Collection time", value: (r) => fmt(r.collection_hours, 2) + " h at " + fmt(r.stops_per_hour, 0) + " stops per hour" },
    { key: "route_tons", id: "crp-tons", label: "Route tonnage", unit: "tons", value: (r) => fmt(r.route_tons, 1) + " tons in " + fmt(r.disposal_loads, 0) + " disposal loads" },
    { key: "route_day_hours", id: "crp-day", label: "Route day", unit: "hours", value: (r) => fmt(r.route_day_hours, 2) + " h (haul " + fmt(r.haul_hours, 2) + ", tipping " + fmt(r.tipping_hours, 2) + ", overhead " + fmt(r.overhead_hours, 2) + ")" },
    { key: "overtime_hours", id: "crp-ot", label: "Against the shift", value: (r) => (r.fits_shift ? fmt(-r.overtime_hours, 2) + " h of slack" : fmt(r.overtime_hours, 2) + " h of overtime, every day") },
    { key: "max_stops", id: "crp-max", label: "Stops the shift allows", value: (r) => fmt(r.max_stops, 0) + " stops -- the route is " + fmt(Math.abs(r.stops_over), 0) + " " + (r.stops_over > 0 ? "over" : "under") + " (" + fmt(Math.abs(r.stops_over_pct), 0) + "%)" },
    { key: "tons_to_next_load", id: "crp-cliff", label: "Distance to the cliff", value: (r) => fmt(r.tons_to_next_load, 1) + " tons before this route needs another trip" },
    { key: "next_load_route_day_hours", id: "crp-next", label: "The day after it crosses", value: (r) => fmt(r.next_load_route_day_hours, 2) + " h -- " + fmt(r.next_load_step_hours, 2) + " h added in a single step" },
    { key: "note", id: "crp-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCollectionRouteProductivity,
});

// ====== spec-v1794: transfer station throughput and trailer loadout ======

// The building is not sized on the tonnage it handles; it is sized on how long
// the trailers can be late, which is a judgement about the highway rather than
// about the waste.

// dims: in { daily_tons: M, operating_hours: T, peak_hour_share_pct: dimensionless, collection_payload_tons: M, floor_time_min: T, trailer_payload_tons: M, trailer_round_trip_hr: T, loose_density_lb_per_cy: M L^-3, pile_depth_ft: L, manoeuvring_factor: dimensionless, loadout_delay_hr: T } out: { peak_hour_tons: M, peak_arrivals_per_hour: T^-1, unloading_positions: dimensionless, trailer_loads_per_day: dimensionless, trailer_fleet: dimensionless, surge_floor_sqft: L^2 }
export function computeTransferStationThroughput({ daily_tons = 0, operating_hours = 0, peak_hour_share_pct = 0, collection_payload_tons = 0, floor_time_min = 0, trailer_payload_tons = 0, trailer_round_trip_hr = 0, loose_density_lb_per_cy = 0, pile_depth_ft = 0, manoeuvring_factor = 0, loadout_delay_hr = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(daily_tons > 0) || !(operating_hours > 0)) return { error: "Daily tonnage and operating hours must be positive." };
  if (!(peak_hour_share_pct > 0 && peak_hour_share_pct <= 100)) return { error: "The peak hour share must be above 0 and at most 100%." };
  if (!(collection_payload_tons > 0) || !(floor_time_min > 0)) return { error: "Collection vehicle payload and floor time must be positive." };
  if (!(trailer_payload_tons > 0) || !(trailer_round_trip_hr > 0)) return { error: "Trailer payload and round trip time must be positive." };
  if (!(loose_density_lb_per_cy > 0) || !(pile_depth_ft > 0)) return { error: "Loose density and workable pile depth must be positive." };
  if (!(manoeuvring_factor >= 1)) return { error: "The manoeuvring factor must be at least 1." };
  if (!(loadout_delay_hr > 0)) return { error: "The loadout delay must be positive." };
  const peak_hour_tons = daily_tons * peak_hour_share_pct / 100;
  const peak_arrivals_per_hour = peak_hour_tons / collection_payload_tons;
  const unloading_positions = Math.ceil(peak_arrivals_per_hour * floor_time_min / MIN_PER_HOUR);
  const average_tons_per_hour = daily_tons / operating_hours;
  const average_arrivals_per_hour = average_tons_per_hour / collection_payload_tons;
  const average_positions = Math.ceil(average_arrivals_per_hour * floor_time_min / MIN_PER_HOUR);
  const trailer_loads_per_day = Math.ceil(daily_tons / trailer_payload_tons);
  const loads_per_trailer = operating_hours / trailer_round_trip_hr;
  const trailer_fleet = Math.ceil(trailer_loads_per_day / loads_per_trailer);
  const surge_tons = average_tons_per_hour * loadout_delay_hr;
  const surge_cy = surge_tons * LB_PER_TON / loose_density_lb_per_cy;
  const surge_footprint_sqft = surge_cy * CU_FT_PER_CU_YD / pile_depth_ft;
  return {
    peak_hour_tons, peak_arrivals_per_hour, unloading_positions,
    average_tons_per_hour, average_arrivals_per_hour, average_positions,
    positions_the_average_would_miss: unloading_positions - average_positions,
    trailer_loads_per_day, loads_per_trailer, trailer_fleet,
    surge_tons, surge_cy,
    surge_footprint_sqft,
    surge_floor_sqft: surge_footprint_sqft * manoeuvring_factor,
    note: "Sizing the inbound side on the daily average queues collection trucks onto the street every afternoon when the routes come in together; the peak hour is what the unloading positions have to serve. On the outbound side the round trip does most of the work in the fleet number -- lengthening it by half an hour can cost a whole trailer and driver. And the building is not sized on the tonnage it handles, it is sized on how long the trailers can be late, which is a judgement about the highway rather than about the waste. The facility's own scale records, its permit's throughput limit, and the traffic study govern.",
  };
}

const transferExample = { daily_tons: 800, operating_hours: 10, peak_hour_share_pct: 15, collection_payload_tons: 8, floor_time_min: 6, trailer_payload_tons: 22, trailer_round_trip_hr: 3, loose_density_lb_per_cy: 400, pile_depth_ft: 8, manoeuvring_factor: 3, loadout_delay_hr: 2 };
WASTE_RENDERERS["transfer-station-throughput"] = _simpleRenderer({
  citation: "Citation: queueing and volumetric arithmetic -- peak hour tonnage = daily tonnage x the peak share, unloading positions = peak arrivals x floor time, trailer loads = daily tonnage / trailer payload rounded up, and the fleet = loads / (operating hours / round trip), with the surge floor from the tonnage accumulating during a loadout delay at the tipped waste's loose density. The facility's scale records, its permit throughput limit, and the traffic study govern.",
  example: transferExample,
  fields: [
    { key: "daily_tons", label: "Daily tonnage (tons)" },
    { key: "operating_hours", label: "Operating hours" },
    { key: "peak_hour_share_pct", label: "Share of the day in the peak hour (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "collection_payload_tons", label: "Collection vehicle payload (tons)" },
    { key: "floor_time_min", label: "Vehicle time on the floor (min)" },
    { key: "trailer_payload_tons", label: "Transfer trailer payload (tons)" },
    { key: "trailer_round_trip_hr", label: "Trailer round trip (hours)" },
    { key: "loose_density_lb_per_cy", label: "Loose density of tipped waste (lb/cy)" },
    { key: "pile_depth_ft", label: "Workable pile depth (ft)" },
    { key: "manoeuvring_factor", label: "Manoeuvring factor", attrs: { step: "any", min: "1" } },
    { key: "loadout_delay_hr", label: "Loadout delay to absorb (hours)" },
  ],
  outputs: [
    { key: "peak_hour_tons", id: "tst-peak", label: "Peak hour", value: (r) => fmt(r.peak_hour_tons, 0) + " tons, " + fmt(r.peak_arrivals_per_hour, 1) + " vehicles per hour" },
    { key: "unloading_positions", id: "tst-pos", label: "Unloading positions required", value: (r) => fmt(r.unloading_positions, 0) + " against " + fmt(r.average_positions, 0) + " if sized on the daily average -- " + fmt(r.positions_the_average_would_miss, 0) + " the average would miss" },
    { key: "trailer_loads_per_day", id: "tst-loads", label: "Trailer loads per day", value: (r) => fmt(r.trailer_loads_per_day, 0) + " loads, " + fmt(r.loads_per_trailer, 2) + " per trailer" },
    { key: "trailer_fleet", id: "tst-fleet", label: "Trailer fleet", value: (r) => fmt(r.trailer_fleet, 0) + " trailers" },
    { key: "surge_tons", id: "tst-surge", label: "Waste on the floor during the delay", value: (r) => fmt(r.surge_tons, 0) + " tons (" + fmt(r.surge_cy, 0) + " cy)" },
    { key: "surge_floor_sqft", id: "tst-floor", label: "Tipping floor the surge needs", unit: "sq ft", value: (r) => fmt(r.surge_floor_sqft, 0) + " sq ft, from " + fmt(r.surge_footprint_sqft, 0) + " sq ft of pile with manoeuvring" },
    { key: "note", id: "tst-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeTransferStationThroughput,
});

// ====== spec-v1795: landfill gas flare capacity and destruction ======

// Flow is not what puts a flare out -- decline takes decades to reach the
// turndown. GAS QUALITY is: a well field pulled too hard for a week dilutes the
// methane, and the flare trips with plenty of flow still arriving.

// dims: in { peak_lfg_cfm: L^3 T^-1, methane_fraction_pct: dimensionless, design_margin_pct: dimensionless, turndown_ratio: dimensionless, methane_heating_value_btu_per_cf: M L^-1 T^-2, destruction_efficiency_pct: dimensionless, global_warming_potential: dimensionless, reduced_methane_fraction_pct: dimensionless, methane_density_lb_per_cf: M L^-3 } out: { rated_capacity_scfm: L^3 T^-1, heat_release_mmbtu_per_hr: M L^2 T^-3, minimum_stable_scfm: L^3 T^-1, design_btu_per_cf: M L^-1 T^-2, methane_destroyed_tons: M, co2e_tons: M L T^-2 }
export function computeLfgFlareCapacity({ peak_lfg_cfm = 0, methane_fraction_pct = 0, design_margin_pct = 0, turndown_ratio = 0, methane_heating_value_btu_per_cf = 0, destruction_efficiency_pct = 0, global_warming_potential = 0, reduced_methane_fraction_pct = 0, methane_density_lb_per_cf = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(peak_lfg_cfm > 0)) return { error: "The peak landfill gas flow must be positive." };
  if (!(methane_fraction_pct > 0 && methane_fraction_pct <= 100)) return { error: "The methane fraction must be above 0 and at most 100%." };
  if (!(reduced_methane_fraction_pct > 0 && reduced_methane_fraction_pct <= 100)) return { error: "The reduced methane fraction must be above 0 and at most 100%." };
  if (!(design_margin_pct >= 0)) return { error: "The design margin cannot be negative." };
  if (!(turndown_ratio > 1)) return { error: "The turndown ratio must exceed 1." };
  if (!(methane_heating_value_btu_per_cf > 0)) return { error: "The methane heating value must be positive." };
  if (!(destruction_efficiency_pct > 0 && destruction_efficiency_pct <= 100)) return { error: "Destruction efficiency must be above 0 and at most 100%." };
  if (!(global_warming_potential > 0)) return { error: "The global warming potential must be positive." };
  if (!(methane_density_lb_per_cf > 0)) return { error: "The methane density must be positive." };
  const methane_cfm = peak_lfg_cfm * methane_fraction_pct / 100;
  const rated_capacity_scfm = peak_lfg_cfm * (1 + design_margin_pct / 100);
  const heat_release_btu_per_hr = methane_cfm * methane_heating_value_btu_per_cf * MIN_PER_HOUR;
  const minimum_stable_scfm = rated_capacity_scfm / turndown_ratio;
  const methane_lb_per_year = methane_cfm * MIN_PER_HOUR * HOURS_PER_DAY * DAYS_PER_YEAR * methane_density_lb_per_cf;
  const destroyed_lb_per_year = methane_lb_per_year * destruction_efficiency_pct / 100;
  const methane_destroyed_tons = destroyed_lb_per_year / LB_PER_TON;
  return {
    peak_lfg_cfm, methane_cfm, rated_capacity_scfm,
    heat_release_mmbtu_per_hr: heat_release_btu_per_hr / 1e6,
    minimum_stable_scfm,
    turndown_headroom_ratio: peak_lfg_cfm / minimum_stable_scfm,
    // Heat content of the GAS, which is what a flame sees, not of the methane.
    design_btu_per_cf: methane_heating_value_btu_per_cf * methane_fraction_pct / 100,
    reduced_btu_per_cf: methane_heating_value_btu_per_cf * reduced_methane_fraction_pct / 100,
    methane_fraction_fall_pct: 100 * (methane_fraction_pct - reduced_methane_fraction_pct) / methane_fraction_pct,
    methane_lb_per_year, destroyed_lb_per_year, methane_destroyed_tons,
    co2e_tons: methane_destroyed_tons * global_warming_potential,
    note: "Flow is not what puts a flare out: reaching the turndown by decline alone takes decades. GAS QUALITY is -- a flare needs roughly 20% methane to hold a flame, and a well field pulled too hard for a week draws air down through the cover, dilutes the methane, raises the oxygen, and trips the flare on flame failure with plenty of flow still arriving. Tune the field to the gas, not to the vacuum. The carbon dioxide the flare emits is biogenic and is not charged against the credit, which is the asymmetry that makes flaring worth doing on sites with no energy project. The flare manufacturer's rated capacity and turndown, the site's gas analysis, and the applicable air permit govern.",
  };
}

const flareExample = { peak_lfg_cfm: 1712, methane_fraction_pct: 50, design_margin_pct: 25, turndown_ratio: 10, methane_heating_value_btu_per_cf: 911, destruction_efficiency_pct: 98, global_warming_potential: 28, reduced_methane_fraction_pct: 20, methane_density_lb_per_cf: 0.04226 };
WASTE_RENDERERS["lfg-flare-capacity"] = _simpleRenderer({
  citation: "Citation: flare sizing from the peak landfill gas flow plus a design margin, with the minimum stable flow set by the manufacturer's turndown ratio, the heat release from the methane's heating value, and the destruction credit as methane mass destroyed x its global warming potential. A flare needs roughly 20% methane to hold a flame. The flare manufacturer's rated capacity and turndown, the site's gas analysis, and the applicable air permit govern.",
  example: flareExample,
  fields: [
    { key: "peak_lfg_cfm", label: "Peak landfill gas flow (cfm)" },
    { key: "methane_fraction_pct", label: "Methane fraction (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "design_margin_pct", label: "Design margin (%)" },
    { key: "turndown_ratio", label: "Flare turndown ratio" },
    { key: "methane_heating_value_btu_per_cf", label: "Methane heating value (Btu/cu ft)" },
    { key: "destruction_efficiency_pct", label: "Destruction efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "global_warming_potential", label: "Methane global warming potential" },
    { key: "reduced_methane_fraction_pct", label: "Reduced methane fraction to check (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "methane_density_lb_per_cf", label: "Methane density (lb/cu ft)" },
  ],
  outputs: [
    { key: "rated_capacity_scfm", id: "lfc-rate", label: "Rated flare capacity", unit: "scfm", value: (r) => fmt(r.rated_capacity_scfm, 0) + " scfm for a " + fmt(r.peak_lfg_cfm, 0) + " cfm peak" },
    { key: "heat_release_mmbtu_per_hr", id: "lfc-heat", label: "Heat release at the peak", unit: "MMBtu/h", value: (r) => fmt(r.heat_release_mmbtu_per_hr, 1) + " MMBtu/h from " + fmt(r.methane_cfm, 0) + " cfm of methane" },
    { key: "minimum_stable_scfm", id: "lfc-min", label: "Minimum stable flow", unit: "scfm", value: (r) => fmt(r.minimum_stable_scfm, 0) + " scfm -- the peak is " + fmt(r.turndown_headroom_ratio, 1) + "x above it" },
    { key: "design_btu_per_cf", id: "lfc-btu", label: "Heat content of the gas", value: (r) => fmt(r.design_btu_per_cf, 0) + " Btu/cu ft at the design methane fraction" },
    { key: "reduced_btu_per_cf", id: "lfc-red", label: "At the reduced methane fraction", value: (r) => fmt(r.reduced_btu_per_cf, 0) + " Btu/cu ft -- a " + fmt(r.methane_fraction_fall_pct, 0) + "% fall in methane content, and this is what trips a flare" },
    { key: "methane_destroyed_tons", id: "lfc-dest", label: "Methane destroyed", unit: "tons/yr", value: (r) => fmt(r.methane_destroyed_tons, 0) + " tons a year" },
    { key: "co2e_tons", id: "lfc-co2", label: "Carbon dioxide equivalent credit", value: (r) => fmt(r.co2e_tons, 0) + " tons CO2e a year, from a flare producing no revenue at all" },
    { key: "note", id: "lfc-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeLfgFlareCapacity,
});

// ==== spec-v1796: recycling diversion rate and residual contamination ====

// Nothing is misreported: the measurement was simply taken at the truck rather
// than at the bale. Improving contamination beats adding tonnage, because it
// improves the rate and the cost in the same move.

// dims: in { total_generated_tons: M, recycling_tons: M, organics_tons: M, contamination_pct: dimensionless, processing_fee_per_ton: dimensionless, tipping_fee_per_ton: dimensionless, improved_contamination_pct: dimensionless } out: { reported_diversion_pct: dimensionless, residual_tons: M, recovered_tons: M, true_diversion_pct: dimensionless, residual_cost: dimensionless, improved_true_diversion_pct: dimensionless }
export function computeDiversionRateContamination({ total_generated_tons = 0, recycling_tons = 0, organics_tons = 0, contamination_pct = 0, processing_fee_per_ton = 0, tipping_fee_per_ton = 0, improved_contamination_pct = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(total_generated_tons > 0)) return { error: "Total tonnage generated must be positive." };
  if (!(recycling_tons > 0)) return { error: "Recycling tonnage must be positive." };
  if (!(organics_tons >= 0)) return { error: "Organics tonnage cannot be negative." };
  if (recycling_tons + organics_tons > total_generated_tons) return { error: "Recycling and organics cannot exceed the total tonnage generated." };
  if (!(contamination_pct >= 0 && contamination_pct < 100) || !(improved_contamination_pct >= 0 && improved_contamination_pct < 100)) {
    return { error: "Contamination rates must be at least 0 and below 100%." };
  }
  if (!(processing_fee_per_ton >= 0) || !(tipping_fee_per_ton >= 0)) return { error: "Fees cannot be negative." };
  const reported_diversion_pct = 100 * (recycling_tons + organics_tons) / total_generated_tons;
  const at = (contam_pct) => {
    const residual_tons = recycling_tons * contam_pct / 100;
    const recovered_tons = recycling_tons - residual_tons;
    return {
      residual_tons, recovered_tons,
      true_diversion_pct: 100 * (recovered_tons + organics_tons) / total_generated_tons,
      residual_cost: residual_tons * (processing_fee_per_ton + tipping_fee_per_ton),
    };
  };
  const base = at(contamination_pct);
  const improved = at(improved_contamination_pct);
  const overstatement_points = reported_diversion_pct - base.true_diversion_pct;
  // The next two are different quantities and are easy to conflate. The gap is
  // 13.2% OF THE CLAIMED figure in the worked case; the claim is 15.2% ABOVE
  // the true rate. spec-v1796 §3 attaches the second number to the first's base,
  // so both are returned rather than one standing for the other.
  return {
    reported_diversion_pct,
    residual_tons: base.residual_tons,
    recovered_tons: base.recovered_tons,
    true_diversion_pct: base.true_diversion_pct,
    overstatement_points,
    overstatement_share_of_claim_pct: 100 * overstatement_points / reported_diversion_pct,
    overstatement_above_true_pct: 100 * overstatement_points / base.true_diversion_pct,
    residual_cost: base.residual_cost,
    improved_residual_tons: improved.residual_tons,
    improved_true_diversion_pct: improved.true_diversion_pct,
    improved_points_gained: improved.true_diversion_pct - base.true_diversion_pct,
    improved_residual_cost: improved.residual_cost,
    improved_saving: base.residual_cost - improved.residual_cost,
    note: "Nothing here is misreported: the measurement was simply taken at the truck rather than at the bale. The residual is the most expensive tonnage in the system -- collected on a recycling route, tipped at a processor, sorted, rejected, reloaded, and hauled to the landfill it would have reached directly for the tipping fee alone. Improving contamination beats adding tonnage, because raising participation adds inbound tons and their contamination together while reducing contamination improves the rate and the cost in the same move. The processor's own measured inbound contamination and the jurisdiction's diversion definition govern -- which materials count, and whether they are counted at the truck or at the bale.",
  };
}

const diversionExample = { total_generated_tons: 100000, recycling_tons: 22000, organics_tons: 8000, contamination_pct: 18, processing_fee_per_ton: 75, tipping_fee_per_ton: 45, improved_contamination_pct: 8 };
WASTE_RENDERERS["diversion-rate-contamination"] = _simpleRenderer({
  citation: "Citation: diversion bookkeeping -- reported diversion = (recycling + organics) / total generated, and true diversion replaces the recycling tonnage with what survives the facility's measured inbound contamination. The jurisdiction's diversion definition governs which materials count and whether they are counted at the truck or at the bale; the processor's own contamination measurement governs the residual.",
  example: diversionExample,
  fields: [
    { key: "total_generated_tons", label: "Total tonnage generated (tons)" },
    { key: "recycling_tons", label: "Recycling collected (tons)" },
    { key: "organics_tons", label: "Organics collected (tons)" },
    { key: "contamination_pct", label: "Inbound contamination rate (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "processing_fee_per_ton", label: "Processing fee ($/ton)" },
    { key: "tipping_fee_per_ton", label: "Tipping fee ($/ton)" },
    { key: "improved_contamination_pct", label: "Improved contamination rate (%)", attrs: { step: "any", min: "0", max: "100" } },
  ],
  outputs: [
    { key: "reported_diversion_pct", id: "drc-rep", label: "Reported diversion", value: (r) => fmt(r.reported_diversion_pct, 1) + "% -- the number in the annual report" },
    { key: "residual_tons", id: "drc-res", label: "Residual to the landfill", unit: "tons", value: (r) => fmt(r.residual_tons, 0) + " tons; " + fmt(r.recovered_tons, 0) + " tons actually recovered" },
    { key: "true_diversion_pct", id: "drc-true", label: "True diversion", value: (r) => fmt(r.true_diversion_pct, 1) + "%" },
    { key: "overstatement_points", id: "drc-over", label: "The overstatement", value: (r) => fmt(r.overstatement_points, 1) + " percentage points -- " + fmt(r.overstatement_share_of_claim_pct, 1) + "% of the claimed figure, or " + fmt(r.overstatement_above_true_pct, 1) + "% above the true rate" },
    { key: "residual_cost", id: "drc-cost", label: "Double-handling cost of the residual", value: (r) => "$" + fmt(r.residual_cost, 0) + " a year to process and then bury it" },
    { key: "improved_true_diversion_pct", id: "drc-imp", label: "At the improved contamination rate", value: (r) => fmt(r.improved_true_diversion_pct, 1) + "% true diversion -- " + fmt(r.improved_points_gained, 1) + " more points, no extra tonnage collected" },
    { key: "improved_saving", id: "drc-save", label: "And the saving", value: (r) => "$" + fmt(r.improved_saving, 0) + " a year, from " + fmt(r.improved_residual_tons, 0) + " tons of residual instead of " + fmt(r.residual_tons, 0) },
    { key: "note", id: "drc-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeDiversionRateContamination,
});

// ======== spec-v1797: waste settlement and recovered airspace ========

// Settlement creates volume the site never permitted, never excavated, and
// never paid for -- but only the PRIMARY share, while the cell is still open,
// is airspace. The secondary settlement arrives after the cap and only lowers
// the final grades, which is where the hazard is.

// dims: in { waste_thickness_ft: L, filled_acres: L^2, primary_settlement_pct: dimensionless, secondary_settlement_pct: dimensionless, in_place_density_lb_per_cy: M L^-3, tipping_fee_per_ton: dimensionless, cap_slope_pct: dimensionless, slope_run_ft: L, adjacent_thickness_ft: L } out: { total_settlement_ft: L, primary_settlement_ft: L, secondary_settlement_ft: L, total_volume_cy: L^3, recoverable_airspace_cy: L^3, recoverable_revenue: dimensionless, differential_settlement_ft: L, remaining_slope_pct: dimensionless }
export function computeLandfillSettlementAirspace({ waste_thickness_ft = 0, filled_acres = 0, primary_settlement_pct = 0, secondary_settlement_pct = 0, in_place_density_lb_per_cy = 0, tipping_fee_per_ton = 0, cap_slope_pct = 0, slope_run_ft = 0, adjacent_thickness_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(waste_thickness_ft > 0) || !(adjacent_thickness_ft > 0)) return { error: "Waste thicknesses must be positive." };
  if (!(filled_acres > 0)) return { error: "The filled area must be positive." };
  if (!(primary_settlement_pct >= 0) || !(secondary_settlement_pct >= 0)) return { error: "Settlement fractions cannot be negative." };
  if (!(primary_settlement_pct + secondary_settlement_pct < 100)) return { error: "Total settlement must be below 100% of the waste thickness." };
  if (!(in_place_density_lb_per_cy > 0)) return { error: "In-place density must be positive." };
  if (!(tipping_fee_per_ton >= 0)) return { error: "The tipping fee cannot be negative." };
  if (!(cap_slope_pct > 0) || !(slope_run_ft > 0)) return { error: "Cap slope and run length must be positive." };
  const area_sqft = filled_acres * SQ_FT_PER_ACRE;
  const primary_settlement_ft = waste_thickness_ft * primary_settlement_pct / 100;
  const secondary_settlement_ft = waste_thickness_ft * secondary_settlement_pct / 100;
  const total_settlement_ft = primary_settlement_ft + secondary_settlement_ft;
  const volumeOf = (depth_ft) => depth_ft * area_sqft / CU_FT_PER_CU_YD;
  const recoverable_airspace_cy = volumeOf(primary_settlement_ft);
  const tons_per_cy = in_place_density_lb_per_cy / LB_PER_TON;
  const recoverable_tons = recoverable_airspace_cy * tons_per_cy;
  // The differential, not the total, is what governs the cap.
  const adjacent_settlement_ft = adjacent_thickness_ft * (primary_settlement_pct + secondary_settlement_pct) / 100;
  const differential_settlement_ft = Math.abs(total_settlement_ft - adjacent_settlement_ft);
  const design_fall_ft = slope_run_ft * cap_slope_pct / 100;
  const remaining_fall_ft = design_fall_ft - differential_settlement_ft;
  return {
    area_sqft, primary_settlement_ft, secondary_settlement_ft, total_settlement_ft,
    total_volume_cy: volumeOf(total_settlement_ft),
    recoverable_airspace_cy,
    secondary_volume_cy: volumeOf(secondary_settlement_ft),
    recoverable_tons,
    recoverable_revenue: recoverable_tons * tipping_fee_per_ton,
    adjacent_settlement_ft, differential_settlement_ft,
    cap_slope_pct, design_fall_ft, remaining_fall_ft,
    remaining_slope_pct: 100 * remaining_fall_ft / slope_run_ft,
    fall_consumed_pct: 100 * differential_settlement_ft / design_fall_ft,
    slope_reverses: remaining_fall_ft <= 0,
    note: "Only the PRIMARY settlement, which arrives in weeks to months while the cell is still open, is recoverable airspace -- capacity the site never permitted, never excavated, and never paid for, and the case for filling in lifts and coming back over a cell rather than closing it as soon as it reaches grade. The secondary settlement arrives over decades after the cap is on and only lowers the cover and the final grades. That is where the hazard is: a slightly deeper fill or a slightly flatter starting grade takes the remaining fall past zero and REVERSES it, and then the cap ponds, the water infiltrates, and a closed cell starts making leachate again. Final grades are designed with the settlement added back in, which is why a freshly capped landfill looks steeper than the drawing -- and why the differential, not the total, is the number that governs the cap. The site's own settlement monitoring, the closure plan, and the permit's minimum final-cover slope govern.",
  };
}

const settlementExample = { waste_thickness_ft: 100, filled_acres: 50, primary_settlement_pct: 8, secondary_settlement_pct: 12, in_place_density_lb_per_cy: 1200, tipping_fee_per_ton: 45, cap_slope_pct: 4, slope_run_ft: 300, adjacent_thickness_ft: 50 };
WASTE_RENDERERS["landfill-settlement-airspace"] = _simpleRenderer({
  citation: "Citation: settlement as a fraction of waste thickness, split into primary (weeks to months, while the cell is open and therefore recoverable as airspace) and secondary (decades, mostly after closure). The differential between adjacent fill thicknesses is checked against the cap's design fall over its drainage run. The site's own settlement monitoring, the closure plan, and the permit's minimum final-cover slope govern.",
  example: settlementExample,
  fields: [
    { key: "waste_thickness_ft", label: "Waste thickness (ft)" },
    { key: "filled_acres", label: "Filled area (acres)" },
    { key: "primary_settlement_pct", label: "Primary settlement (% of thickness)" },
    { key: "secondary_settlement_pct", label: "Secondary settlement (% of thickness)" },
    { key: "in_place_density_lb_per_cy", label: "In-place density (lb/cy)" },
    { key: "tipping_fee_per_ton", label: "Tipping fee ($/ton)" },
    { key: "cap_slope_pct", label: "Cap drainage slope (%)" },
    { key: "slope_run_ft", label: "Slope run length (ft)" },
    { key: "adjacent_thickness_ft", label: "Adjacent fill thickness (ft)" },
  ],
  outputs: [
    { key: "total_settlement_ft", id: "lsa-tot", label: "Total settlement", unit: "ft", value: (r) => fmt(r.total_settlement_ft, 1) + " ft -- " + fmt(r.primary_settlement_ft, 1) + " primary, " + fmt(r.secondary_settlement_ft, 1) + " secondary" },
    { key: "total_volume_cy", id: "lsa-vol", label: "Volume the settlement creates", unit: "cy", value: (r) => fmt(r.total_volume_cy, 0) + " cy, of which " + fmt(r.secondary_volume_cy, 0) + " cy is not airspace" },
    { key: "recoverable_airspace_cy", id: "lsa-rec", label: "Recoverable airspace", unit: "cy", value: (r) => fmt(r.recoverable_airspace_cy, 0) + " cy while the cell is open -- " + fmt(r.recoverable_tons, 0) + " tons" },
    { key: "recoverable_revenue", id: "lsa-rev", label: "What that carries", value: (r) => "$" + fmt(r.recoverable_revenue, 0) + " of revenue the site never permitted or excavated" },
    { key: "differential_settlement_ft", id: "lsa-diff", label: "Differential against the adjacent fill", unit: "ft", value: (r) => fmt(r.differential_settlement_ft, 1) + " ft (" + fmt(r.adjacent_settlement_ft, 1) + " ft there against " + fmt(r.total_settlement_ft, 1) + " ft here)" },
    { key: "remaining_slope_pct", id: "lsa-slope", label: "Cap slope after settlement", value: (r) => (r.slope_reverses ? "REVERSED -- the differential exceeds the " + fmt(r.design_fall_ft, 1) + " ft design fall and the cap will pond" : fmt(r.remaining_slope_pct, 2) + "% from a " + fmt(r.cap_slope_pct, 1) + "% design; the differential ate " + fmt(r.fall_consumed_pct, 0) + "% of the fall") },
    { key: "note", id: "lsa-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeLandfillSettlementAirspace,
});

// ====== spec-v1798: collection vehicle payload and compaction ratio ======

// Specify the chassis and the body together and the problem disappears: a body
// the chassis can carry full removes the judgement from the crew entirely.

// dims: in { body_volume_cy: L^3, loose_density_lb_per_cy: M L^-3, compaction_ratio: dimensionless, gvwr_lb: M, tare_weight_lb: M, alternative_body_volume_cy: L^3, alternative_gvwr_lb: M, alternative_tare_weight_lb: M, wet_loose_density_lb_per_cy: M L^-3 } out: { in_body_density_lb_per_cy: M L^-3, body_payload_lb: M, chassis_payload_lb: M, legal_fill_cy: L^3, overload_lb: M }
export function computeCollectionVehiclePayload({ body_volume_cy = 0, loose_density_lb_per_cy = 0, compaction_ratio = 0, gvwr_lb = 0, tare_weight_lb = 0, alternative_body_volume_cy = 0, alternative_gvwr_lb = 0, alternative_tare_weight_lb = 0, wet_loose_density_lb_per_cy = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(body_volume_cy > 0) || !(alternative_body_volume_cy > 0)) return { error: "Body volumes must be positive." };
  if (!(loose_density_lb_per_cy > 0) || !(wet_loose_density_lb_per_cy > 0)) return { error: "Loose densities must be positive." };
  if (!(compaction_ratio >= 1)) return { error: "The compaction ratio must be at least 1." };
  if (!(gvwr_lb > 0) || !(alternative_gvwr_lb > 0)) return { error: "Gross vehicle weight ratings must be positive." };
  if (!(tare_weight_lb > 0) || !(alternative_tare_weight_lb > 0)) return { error: "Tare weights must be positive." };
  if (!(gvwr_lb > tare_weight_lb) || !(alternative_gvwr_lb > alternative_tare_weight_lb)) {
    return { error: "A chassis must have payload left: its tare weight cannot reach its rating." };
  }
  const configuration = (body_cy, gvwr, tare, loose_density) => {
    const in_body_density_lb_per_cy = loose_density * compaction_ratio;
    const body_payload_lb = body_cy * in_body_density_lb_per_cy;
    const chassis_payload_lb = gvwr - tare;
    const chassis_governs = chassis_payload_lb < body_payload_lb;
    return {
      in_body_density_lb_per_cy, body_payload_lb, chassis_payload_lb, chassis_governs,
      governing_payload_lb: Math.min(body_payload_lb, chassis_payload_lb),
      legal_fill_cy: chassis_payload_lb / in_body_density_lb_per_cy,
      legal_fill_share_pct: 100 * (chassis_payload_lb / in_body_density_lb_per_cy) / body_cy,
      overload_lb: Math.max(0, body_payload_lb - chassis_payload_lb),
      overload_pct_of_gvwr: 100 * Math.max(0, body_payload_lb - chassis_payload_lb) / gvwr,
      headroom_lb: Math.max(0, chassis_payload_lb - body_payload_lb),
    };
  };
  const base = configuration(body_volume_cy, gvwr_lb, tare_weight_lb, loose_density_lb_per_cy);
  const alternative = configuration(alternative_body_volume_cy, alternative_gvwr_lb, alternative_tare_weight_lb, loose_density_lb_per_cy);
  const wet = configuration(body_volume_cy, gvwr_lb, tare_weight_lb, wet_loose_density_lb_per_cy);
  return {
    in_body_density_lb_per_cy: base.in_body_density_lb_per_cy,
    body_payload_lb: base.body_payload_lb,
    body_payload_tons: base.body_payload_lb / LB_PER_TON,
    chassis_payload_lb: base.chassis_payload_lb,
    chassis_payload_tons: base.chassis_payload_lb / LB_PER_TON,
    chassis_governs: base.chassis_governs,
    governing_payload_tons: base.governing_payload_lb / LB_PER_TON,
    legal_fill_cy: base.legal_fill_cy,
    legal_fill_share_pct: base.legal_fill_share_pct,
    overload_lb: base.overload_lb,
    overload_pct_of_gvwr: base.overload_pct_of_gvwr,
    alternative_body_payload_tons: alternative.body_payload_lb / LB_PER_TON,
    alternative_chassis_payload_tons: alternative.chassis_payload_lb / LB_PER_TON,
    alternative_chassis_governs: alternative.chassis_governs,
    alternative_headroom_lb: alternative.headroom_lb,
    wet_legal_fill_cy: wet.legal_fill_cy,
    wet_fill_reduction_pct: 100 * (base.legal_fill_cy - wet.legal_fill_cy) / base.legal_fill_cy,
    note: "When the chassis governs, the legal fill is not a full body and there is no gauge, no warning, and nothing visible to say so -- a crew filling to the pack panel is simply over the rating on the road. Specify the chassis and the body together so the BODY governs, and the crew can fill it completely with the truck still inside its rating; that removes the judgement from the crew entirely. The boundary also moves with the weather: wet waste is denser loose, so the same body reaches the same weight in less volume. Axle-by-axle loading, not just gross weight, is what an enforcement scale checks; the chassis manufacturer's ratings and the applicable weight law govern.",
  };
}

const payloadExample = { body_volume_cy: 25, loose_density_lb_per_cy: 200, compaction_ratio: 3, gvwr_lb: 33000, tare_weight_lb: 21000, alternative_body_volume_cy: 31, alternative_gvwr_lb: 54000, alternative_tare_weight_lb: 28000, wet_loose_density_lb_per_cy: 250 };
WASTE_RENDERERS["collection-vehicle-payload"] = _simpleRenderer({
  citation: "Citation: in-body density = loose density x the packer's compaction ratio; the body's volumetric payload = body volume x that density, against the chassis's legal payload = gross vehicle weight rating - tare weight. Whichever is smaller governs. Axle-by-axle loading, not just gross weight, is what an enforcement scale checks; the chassis manufacturer's ratings and the applicable weight law govern.",
  example: payloadExample,
  fields: [
    { key: "body_volume_cy", label: "Body volume (cy)" },
    { key: "loose_density_lb_per_cy", label: "Loose waste density (lb/cy)" },
    { key: "compaction_ratio", label: "Packer compaction ratio", attrs: { step: "any", min: "1" } },
    { key: "gvwr_lb", label: "Chassis GVWR (lb)" },
    { key: "tare_weight_lb", label: "Tare weight (lb)" },
    { key: "alternative_body_volume_cy", label: "Alternative body volume (cy)" },
    { key: "alternative_gvwr_lb", label: "Alternative chassis GVWR (lb)" },
    { key: "alternative_tare_weight_lb", label: "Alternative tare weight (lb)" },
    { key: "wet_loose_density_lb_per_cy", label: "Wet-weather loose density (lb/cy)" },
  ],
  outputs: [
    { key: "in_body_density_lb_per_cy", id: "cvp-dens", label: "In-body density", value: (r) => fmt(r.in_body_density_lb_per_cy, 0) + " lb/cy after compaction" },
    { key: "body_payload_lb", id: "cvp-body", label: "Body holds", value: (r) => fmt(r.body_payload_tons, 1) + " tons (" + fmt(r.body_payload_lb, 0) + " lb)" },
    { key: "chassis_payload_lb", id: "cvp-chas", label: "Chassis may carry", value: (r) => fmt(r.chassis_payload_tons, 1) + " tons (" + fmt(r.chassis_payload_lb, 0) + " lb)" },
    { key: "governing_payload_tons", id: "cvp-gov", label: "Which governs", value: (r) => (r.chassis_governs ? "The CHASSIS, at " + fmt(r.governing_payload_tons, 1) + " tons" : "The BODY, at " + fmt(r.governing_payload_tons, 1) + " tons -- the crew can fill it completely") },
    { key: "legal_fill_cy", id: "cvp-fill", label: "Legal fill", unit: "cy", value: (r) => fmt(r.legal_fill_cy, 1) + " cy -- " + fmt(r.legal_fill_share_pct, 0) + "% of the body" },
    { key: "overload_lb", id: "cvp-over", label: "A full body would be", value: (r) => (r.overload_lb > 0 ? fmt(r.overload_lb, 0) + " lb over the rating -- " + fmt(r.overload_pct_of_gvwr, 0) + "% overweight, with no gauge and no warning" : "within the rating") },
    { key: "alternative_body_payload_tons", id: "cvp-alt", label: "The alternative configuration", value: (r) => fmt(r.alternative_body_payload_tons, 1) + " ton body against " + fmt(r.alternative_chassis_payload_tons, 1) + " tons of chassis -- " + (r.alternative_chassis_governs ? "the chassis still governs" : "the BODY governs, " + fmt(r.alternative_headroom_lb, 0) + " lb inside the rating") },
    { key: "wet_legal_fill_cy", id: "cvp-wet", label: "In wet weather", value: (r) => fmt(r.wet_legal_fill_cy, 1) + " cy of legal fill -- " + fmt(r.wet_fill_reduction_pct, 0) + "% less body, with nothing about the truck changed" },
    { key: "note", id: "cvp-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCollectionVehiclePayload,
});

// ======== spec-v1799: landfill working face cell and lift volume ========

// Halving the face width doubles the advance exactly, so the top area does not
// move at all -- every bit of the saving comes off the sloped face. The limit is
// whether the face can still be worked, because density lost to a crowded face
// costs far more airspace than the cover ever saves.

// dims: in { daily_tons: M, in_place_density_lb_per_cy: M L^-3, face_width_ft: L, lift_height_ft: L, face_slope_run: dimensionless, cover_depth_in: L, layer_thickness_ft: L, passes_per_layer: dimensionless, narrow_face_width_ft: L } out: { daily_volume_cy: L^3, advance_ft_per_day: L, slope_length_ft: L, exposed_sqft: L^2, cover_cy: L^3, total_passes: dimensionless }
export function computeWorkingFaceCellLift({ daily_tons = 0, in_place_density_lb_per_cy = 0, face_width_ft = 0, lift_height_ft = 0, face_slope_run = 0, cover_depth_in = 0, layer_thickness_ft = 0, passes_per_layer = 0, narrow_face_width_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(daily_tons > 0) || !(in_place_density_lb_per_cy > 0)) return { error: "Daily tonnage and in-place density must be positive." };
  if (!(face_width_ft > 0) || !(narrow_face_width_ft > 0)) return { error: "Face widths must be positive." };
  if (!(lift_height_ft > 0)) return { error: "Lift height must be positive." };
  if (!(face_slope_run > 0)) return { error: "The face slope run must be positive (3 for a 3:1 face)." };
  if (!(cover_depth_in > 0)) return { error: "Cover depth must be positive." };
  if (!(layer_thickness_ft > 0)) return { error: "The compacted layer thickness must be positive." };
  if (layer_thickness_ft > lift_height_ft) return { error: "A compacted layer cannot be thicker than the lift it builds." };
  if (!(passes_per_layer >= 1)) return { error: "There must be at least one pass per layer." };
  const tons_per_cy = in_place_density_lb_per_cy / LB_PER_TON;
  const daily_volume_cy = daily_tons / tons_per_cy;
  const daily_volume_cuft = daily_volume_cy * CU_FT_PER_CU_YD;
  const slope_length_ft = lift_height_ft * Math.sqrt(1 + face_slope_run * face_slope_run);
  const geometryAt = (width_ft) => {
    const advance_ft_per_day = daily_volume_cuft / (width_ft * lift_height_ft);
    const top_sqft = width_ft * advance_ft_per_day;
    const face_sqft = width_ft * slope_length_ft;
    const exposed_sqft = top_sqft + face_sqft;
    const cover_cy = exposed_sqft * (cover_depth_in / 12) / CU_FT_PER_CU_YD;
    return { advance_ft_per_day, top_sqft, face_sqft, exposed_sqft, cover_cy };
  };
  const base = geometryAt(face_width_ft);
  const narrow = geometryAt(narrow_face_width_ft);
  const layers = lift_height_ft / layer_thickness_ft;
  return {
    daily_volume_cy, daily_volume_cuft, slope_length_ft,
    advance_ft_per_day: base.advance_ft_per_day,
    top_sqft: base.top_sqft, face_sqft: base.face_sqft, exposed_sqft: base.exposed_sqft,
    cover_cy: base.cover_cy,
    cover_share_of_waste_pct: 100 * base.cover_cy / daily_volume_cy,
    narrow_advance_ft_per_day: narrow.advance_ft_per_day,
    narrow_top_sqft: narrow.top_sqft,
    narrow_face_sqft: narrow.face_sqft,
    narrow_exposed_sqft: narrow.exposed_sqft,
    narrow_cover_cy: narrow.cover_cy,
    cover_reduction_pct: 100 * (base.cover_cy - narrow.cover_cy) / base.cover_cy,
    exposed_reduction_pct: 100 * (base.exposed_sqft - narrow.exposed_sqft) / base.exposed_sqft,
    layers, passes_per_layer, total_passes: layers * passes_per_layer,
    note: "Halving the face width doubles the advance exactly, so the top area does not move at all -- every bit of the saving comes off the SLOPED FACE, and the cover with it. The same reduction comes off everything else the exposed surface drives: leachate, litter, odour, and birds all scale with the same area. The limit is whether the face can still be worked: a face too narrow for the trucks and the machine to share means the compactor passes do not happen, and density lost to a crowded face costs far more airspace than the cover ever saves. The right face is the narrowest one the day's traffic can actually work, not the narrowest one the arithmetic allows. The approved operations plan and the permit govern.",
  };
}

const faceExample = { daily_tons: 800, in_place_density_lb_per_cy: 1200, face_width_ft: 100, lift_height_ft: 10, face_slope_run: 3, cover_depth_in: 6, layer_thickness_ft: 2, passes_per_layer: 4, narrow_face_width_ft: 50 };
WASTE_RENDERERS["working-face-cell-lift"] = _simpleRenderer({
  citation: "Citation: geometry -- daily cell volume = tonnage / in-place density, face advance = volume / (width x lift height), sloped face length = lift height x sqrt(1 + run^2), and cover volume = exposed top and face area x cover depth. The approved operations plan and the permit govern the working face size, the lift, and the cover.",
  example: faceExample,
  fields: [
    { key: "daily_tons", label: "Daily tonnage (tons)" },
    { key: "in_place_density_lb_per_cy", label: "In-place density (lb/cy)" },
    { key: "face_width_ft", label: "Working face width (ft)" },
    { key: "lift_height_ft", label: "Lift height (ft)" },
    { key: "face_slope_run", label: "Face slope run (3 for 3:1)" },
    { key: "cover_depth_in", label: "Cover depth (in)" },
    { key: "layer_thickness_ft", label: "Compacted layer thickness (ft)" },
    { key: "passes_per_layer", label: "Compactor passes per layer", attrs: { step: "1", min: "1" } },
    { key: "narrow_face_width_ft", label: "Narrower face to compare (ft)" },
  ],
  outputs: [
    { key: "daily_volume_cy", id: "wfc-vol", label: "Daily cell volume", unit: "cy", value: (r) => fmt(r.daily_volume_cy, 0) + " cy (" + fmt(r.daily_volume_cuft, 0) + " cu ft)" },
    { key: "advance_ft_per_day", id: "wfc-adv", label: "Face advance", value: (r) => fmt(r.advance_ft_per_day, 0) + " ft per day, on a " + fmt(r.slope_length_ft, 1) + " ft sloped face" },
    { key: "exposed_sqft", id: "wfc-exp", label: "Exposed surface", unit: "sq ft", value: (r) => fmt(r.exposed_sqft, 0) + " sq ft -- " + fmt(r.top_sqft, 0) + " top, " + fmt(r.face_sqft, 0) + " face" },
    { key: "cover_cy", id: "wfc-cov", label: "Cover to close it up", unit: "cy", value: (r) => fmt(r.cover_cy, 0) + " cy, " + fmt(r.cover_share_of_waste_pct, 1) + "% of the waste volume" },
    { key: "narrow_top_sqft", id: "wfc-narrow", label: "At the narrower face", value: (r) => fmt(r.narrow_advance_ft_per_day, 0) + " ft/day advance, top area " + fmt(r.narrow_top_sqft, 0) + " sq ft -- unchanged, because the advance doubled as the width halved" },
    { key: "narrow_cover_cy", id: "wfc-save", label: "What the narrower face saves", value: (r) => fmt(r.narrow_cover_cy, 0) + " cy of cover, " + fmt(r.cover_reduction_pct, 0) + "% less, all of it off the sloped face" },
    { key: "total_passes", id: "wfc-pass", label: "Compaction", value: (r) => fmt(r.layers, 0) + " layers at " + fmt(r.passes_per_layer, 0) + " passes -- " + fmt(r.total_passes, 0) + " passes over every part of the cell" },
    { key: "note", id: "wfc-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeWorkingFaceCellLift,
});
