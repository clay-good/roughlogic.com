// calc-relief.js -- Groups J, G, E, and A: relief logistics, congregate
// shelter, storm safe rooms, and temporary housing parks.
//
// specs/scope-disaster-response.md band six. Five tiles, each keeping the
// group letter of the trade that owns it (a module is independent of the group
// letter per the v28/v70..v103 split precedent):
//   v1918 relief-commodity-truckloads      J  Trucking and Logistics
//   v1919 pod-site-configuration           J  Trucking and Logistics
//   v1920 shelter-capacity-sanitation      G  Cross-Trade Utilities
//   v1921 safe-room-capacity               E  Carpentry and Construction
//   v1922 temp-housing-park-feeder-demand  A  Electrical
//
// US sources only: FEMA (Distribution Management Plan Guide 2.0, IS-26, P-361),
// the USACE commodity and POD planning model as published by Missouri SEMA, and
// the American Red Cross mass care standards as reproduced in the Florida State
// Emergency Shelter Plan. NEC Tables 551.73(A) and 550.31 are NFPA text and are
// NOT reproduced: the demand factor is entered from the adopted edition.
// See spec-v1918.md through spec-v1922.md.

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

export const RELIEF_RENDERERS = {};

// One US gallon is 231 cubic inches = 3.785411784 L exactly.
const _L_PER_GAL = 3.785411784;
const _SQFT_PER_ACRE = 43560;
// A count that lands on a whole number in exact arithmetic can come out a hair
// above it in floating point; round that hair off before taking the ceiling.
const _ceil = (x) => Math.max(0, Math.ceil(x - 1e-9));

// ===================== spec-v1918: relief commodity demand and truckloads =====================

// dims: in { population_without_power_count: dimensionless, impacted_population_count: dimensionless, visit_factor: dimensionless, water_l_per_person_day: L^3 T^-1, meals_per_person_day: T^-1, ice_lb_per_person_day: M T^-1, planning_days: T, water_truck_l: L^3, meals_per_truck_count: dimensionless, ice_truck_lb: M, tarps_per_truck_count: dimensionless, damaged_homes_count: dimensionless, shelter_residents_count: dimensionless } out: { people_served_count: dimensionless, water_l_per_day: L^3 T^-1, water_gal_per_day: L^3 T^-1, water_truck_gal: L^3, water_trucks_per_day: T^-1, meals_per_day: T^-1, meal_trucks_per_day: T^-1, ice_lb_per_day: M T^-1, ice_trucks_per_day: T^-1, trucks_per_day_total: T^-1, water_l_period: L^3, water_gal_period: L^3, meals_period_count: dimensionless, ice_lb_period: M, water_trucks_period: dimensionless, meal_trucks_period: dimensionless, ice_trucks_period: dimensionless, tarp_trucks: dimensionless, shelter_mixed_loads_per_day: T^-1, people_per_water_truck_count: dimensionless, people_per_meal_truck_count: dimensionless, people_per_ice_truck_count: dimensionless }
export function computeReliefCommodityTruckloads({ population_without_power_count = 0, impacted_population_count = 0, visit_factor = 0.4, water_l_per_person_day = 3, meals_per_person_day = 2, ice_lb_per_person_day = 8, planning_days = 3, water_truck_l = 18000, meals_per_truck_count = 21744, ice_truck_lb = 40000, tarps_per_truck_count = 4400, damaged_homes_count = 0, shelter_residents_count = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(population_without_power_count >= 0) || !(impacted_population_count >= 0)) return { error: "Populations cannot be negative." };
  if (!(population_without_power_count > 0) && !(impacted_population_count > 0)) return { error: "Enter a positive population without power, or a positive impacted population." };
  if (!(visit_factor > 0 && visit_factor <= 1)) return { error: "The visit factor must be greater than 0 and no more than 1." };
  if (!(water_l_per_person_day > 0) || !(meals_per_person_day > 0) || !(ice_lb_per_person_day > 0)) return { error: "Per-person water, meal, and ice rates must be positive." };
  if (!(planning_days > 0)) return { error: "The planning period must be positive." };
  if (!(water_truck_l > 0) || !(meals_per_truck_count > 0) || !(ice_truck_lb > 0) || !(tarps_per_truck_count > 0)) return { error: "Truckload capacities must be positive." };
  if (!(damaged_homes_count >= 0) || !(shelter_residents_count >= 0)) return { error: "Damaged homes and shelter residents cannot be negative." };
  // An entered impacted population is used as-is; otherwise the USACE model
  // applies the visit factor to the population without power.
  const uses_impacted = impacted_population_count > 0;
  const people_served_count = uses_impacted ? impacted_population_count : population_without_power_count * visit_factor;
  const water_l_per_day = people_served_count * water_l_per_person_day;
  const water_gal_per_day = water_l_per_day / _L_PER_GAL;
  const water_truck_gal = water_truck_l / _L_PER_GAL;
  const meals_per_day = people_served_count * meals_per_person_day;
  const ice_lb_per_day = people_served_count * ice_lb_per_person_day;
  const water_truck_ratio = water_l_per_day / water_truck_l;
  const meal_truck_ratio = meals_per_day / meals_per_truck_count;
  const ice_truck_ratio = ice_lb_per_day / ice_truck_lb;
  const water_trucks_per_day = _ceil(water_truck_ratio);
  const meal_trucks_per_day = _ceil(meal_truck_ratio);
  const ice_trucks_per_day = _ceil(ice_truck_ratio);
  // Period loads round up the period total, not each day: 4.42 meal trucks a
  // day for three days is 14 trucks, not 15.
  return {
    uses_impacted, people_served_count,
    water_l_per_day, water_gal_per_day, water_truck_gal, water_truck_ratio, water_trucks_per_day,
    meals_per_day, meal_truck_ratio, meal_trucks_per_day,
    ice_lb_per_day, ice_truck_ratio, ice_trucks_per_day,
    trucks_per_day_total: water_trucks_per_day + meal_trucks_per_day + ice_trucks_per_day,
    planning_days,
    water_l_period: water_l_per_day * planning_days,
    water_gal_period: water_gal_per_day * planning_days,
    meals_period_count: meals_per_day * planning_days,
    ice_lb_period: ice_lb_per_day * planning_days,
    water_trucks_period: _ceil(water_truck_ratio * planning_days),
    meal_trucks_period: _ceil(meal_truck_ratio * planning_days),
    ice_trucks_period: _ceil(ice_truck_ratio * planning_days),
    tarps_count: damaged_homes_count,
    tarp_trucks: _ceil(damaged_homes_count / tarps_per_truck_count),
    shelter_mixed_loads_per_day: _ceil(shelter_residents_count / 500),
    people_per_water_truck_count: water_truck_l / water_l_per_person_day,
    people_per_meal_truck_count: meals_per_truck_count / meals_per_person_day,
    people_per_ice_truck_count: ice_truck_lb / ice_lb_per_person_day,
    note: "The planning factors are small and the multipliers are large: three liters of water and two meals a person a day, times the people who will come to a distribution point, times the days until power or stores return, decides how many trucks are staged before landfall. The USACE model applies a 40% visit factor to the population without power because most households have supplies, family, or a generator; an entered impacted population replaces it. Each commodity is reported in its own truckload unit because that is how it is ordered and how receiving sites are sized. Litres and gallons are kept distinct (3 L is not a gallon), and a meals truck is 21,744 meals, not the 1,744 one source page prints. Shelter mixed loads are 3 pallets of water, 1 of ice, and 1 of meals per 500 residents a day. This is a planning estimate: it does not address infant formula, medical or pet supplies, or dietary needs, and it does not route trucks or size warehouses. FEMA's current guidance, the state logistics plan, and the incident logistics section govern.",
  };
}

export const reliefCommodityTruckloadsExample = { inputs: { population_without_power_count: 120000, impacted_population_count: 0, visit_factor: 0.4, water_l_per_person_day: 3, meals_per_person_day: 2, ice_lb_per_person_day: 8, planning_days: 3, water_truck_l: 18000, meals_per_truck_count: 21744, ice_truck_lb: 40000, tarps_per_truck_count: 4400, damaged_homes_count: 0, shelter_residents_count: 0 } };
RELIEF_RENDERERS["relief-commodity-truckloads"] = _simpleRenderer({
  citation: "Citation: FEMA, Distribution Management Plan Guide 2.0 (2022), Section 1.3 (two meals and three liters of water per person per day), and the USACE commodity planning model as published in Missouri SEMA, Annex C, Points of Distribution (2011): 40% visit factor, 8 lb of ice per person per day, truckloads of 18,000 L water, 21,744 meals, 40,000 lb ice, and 4,400 tarps. The state logistics plan and the incident logistics section govern.",
  example: reliefCommodityTruckloadsExample.inputs,
  fields: [
    { key: "population_without_power_count", label: "Population without power", default: 0 },
    { key: "impacted_population_count", label: "Or: impacted population to serve (0 = use visit factor)", default: 0 },
    { key: "visit_factor", label: "Visit factor (USACE model 0.40)", default: 0.4, attrs: { step: "any", min: "0", max: "1" } },
    { key: "water_l_per_person_day", label: "Water per person per day (L)", default: 3 },
    { key: "meals_per_person_day", label: "Meals per person per day", default: 2 },
    { key: "ice_lb_per_person_day", label: "Ice per person per day (lb)", default: 8 },
    { key: "planning_days", label: "Planning period (days; 72 h = 3)", default: 3 },
    { key: "water_truck_l", label: "Water per truckload (L)", default: 18000 },
    { key: "meals_per_truck_count", label: "Meals per truckload", default: 21744 },
    { key: "ice_truck_lb", label: "Ice per truckload (lb)", default: 40000 },
    { key: "tarps_per_truck_count", label: "Tarps per truckload", default: 4400 },
    { key: "damaged_homes_count", label: "Damaged homes needing a tarp", default: 0 },
    { key: "shelter_residents_count", label: "Shelter residents", default: 0 },
  ],
  outputs: [
    { key: "served", id: "rct-out-served", label: "People served per day", value: (r) => fmt(r.people_served_count, 0) + (r.uses_impacted ? " (entered impacted population)" : " (population x visit factor)") },
    { key: "water", id: "rct-out-water", label: "Water per day", value: (r) => fmt(r.water_l_per_day, 0) + " L (" + fmt(r.water_gal_per_day, 0) + " gal) = " + fmt(r.water_truck_ratio, 2) + " -> " + r.water_trucks_per_day + " trucks" },
    { key: "meals", id: "rct-out-meals", label: "Meals per day", value: (r) => fmt(r.meals_per_day, 0) + " meals = " + fmt(r.meal_truck_ratio, 2) + " -> " + r.meal_trucks_per_day + " trucks" },
    { key: "ice", id: "rct-out-ice", label: "Ice per day", value: (r) => fmt(r.ice_lb_per_day, 0) + " lb = " + fmt(r.ice_truck_ratio, 2) + " -> " + r.ice_trucks_per_day + " trucks" },
    { key: "total", id: "rct-out-total", label: "Trucks per day (water + meals + ice)", value: (r) => r.trucks_per_day_total + " trucks" },
    { key: "period", id: "rct-out-period", label: "Over the planning period", value: (r) => fmt(r.planning_days, 2) + " days: water " + r.water_trucks_period + ", meals " + r.meal_trucks_period + ", ice " + r.ice_trucks_period + " trucks (" + fmt(r.water_gal_period, 0) + " gal water)" },
    { key: "tarps", id: "rct-out-tarps", label: "Tarps", value: (r) => fmt(r.tarps_count, 0) + " tarps = " + r.tarp_trucks + " trucks" },
    { key: "shelter", id: "rct-out-shelter", label: "Shelter mixed loads per day", value: (r) => r.shelter_mixed_loads_per_day + " loads (3 pallets water, 1 ice, 1 meals each)" },
    { key: "ratio", id: "rct-out-ratio", label: "People one truck serves per day", value: (r) => "water " + fmt(r.people_per_water_truck_count, 0) + ", meals " + fmt(r.people_per_meal_truck_count, 0) + ", ice " + fmt(r.people_per_ice_truck_count, 0) + "; water truck = " + fmt(r.water_truck_gal, 0) + " gal" },
    { key: "note", id: "rct-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeReliefCommodityTruckloads,
});

// ===================== spec-v1919: points of distribution lanes, types, staff, and footprint =====================

// USACE Tier II POD typing: lanes, day staff, night staff, footprint.
const _POD_TYPES = {
  I: { lanes: 4, day: 78, night: 10, sqft: 250 * 500 },
  II: { lanes: 2, day: 34, night: 6, sqft: 250 * 300 },
  III: { lanes: 1, day: 19, night: 4, sqft: 150 * 300 },
};

// dims: in { people_per_day: T^-1, household_size: dimensionless, operating_hours: T, lane_rate_vph: T^-1 } out: { vehicles_per_day: T^-1, vehicles_per_hour: T^-1, lanes_required: dimensionless, lane_capacity_people_per_day: T^-1, fewest_sites: dimensionless, fewest_staff_day: dimensionless, fewest_staff_night: dimensionless, fewest_footprint_sqft: L^2, fewest_footprint_acres: L^2, all_iii_sites: dimensionless, all_iii_staff_day: dimensionless, all_iii_staff_night: dimensionless, all_iii_footprint_sqft: L^2, all_iii_footprint_acres: L^2 }
export function computePodSiteConfiguration({ people_per_day = 0, household_size = 3, operating_hours = 12, lane_rate_vph = 140 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(people_per_day > 0)) return { error: "People served per day must be positive." };
  if (!(household_size > 0)) return { error: "Household size must be positive." };
  if (!(operating_hours > 0 && operating_hours <= 24)) return { error: "Operating hours must be greater than 0 and no more than 24." };
  if (!(lane_rate_vph > 0)) return { error: "The lane rate must be positive." };
  const vehicles_per_day = people_per_day / household_size;
  const vehicles_per_hour = vehicles_per_day / operating_hours;
  const lanes_required = _ceil(vehicles_per_hour / lane_rate_vph);
  // Fewest sites with exactly the required lanes: as many four-lane Type I
  // as fit, then the remainder as a Type II and/or a Type III.
  const type_i_count = Math.floor(lanes_required / 4 + 1e-9);
  const rem = lanes_required % 4;
  const type_ii_count = rem >= 2 ? 1 : 0;
  const type_iii_count = rem % 2;
  const mix = [["I", type_i_count], ["II", type_ii_count], ["III", type_iii_count]];
  const sum = (k) => mix.reduce((s, [t, n]) => s + n * _POD_TYPES[t][k], 0);
  const fewest_footprint_sqft = sum("sqft");
  const all_iii_footprint_sqft = lanes_required * _POD_TYPES.III.sqft;
  const fewest_label = mix.filter(([, n]) => n > 0).map(([t, n]) => n + " Type " + t).join(" + ");
  return {
    vehicles_per_day, vehicles_per_hour, lanes_required,
    lane_capacity_people_per_day: lane_rate_vph * operating_hours * household_size,
    type_i_count, type_ii_count, type_iii_count, fewest_label,
    fewest_sites: type_i_count + type_ii_count + type_iii_count,
    fewest_staff_day: sum("day"), fewest_staff_night: sum("night"),
    fewest_footprint_sqft, fewest_footprint_acres: fewest_footprint_sqft / _SQFT_PER_ACRE,
    all_iii_sites: lanes_required,
    all_iii_staff_day: lanes_required * _POD_TYPES.III.day,
    all_iii_staff_night: lanes_required * _POD_TYPES.III.night,
    all_iii_footprint_sqft, all_iii_footprint_acres: all_iii_footprint_sqft / _SQFT_PER_ACRE,
    note: "A point of distribution is sized by throughput, not by the commodities it holds: cars drive past three loading points and leave, and one lane of that moves about 140 cars an hour. At one car per household of three and a twelve-hour day a lane serves about 5,000 people, which is the Type III rating; Type II is two lanes and Type I four. The lane count is fixed by the population and the site count is a choice -- many small Type III sites spread across a county put distribution within reach of more people, fewer large sites save night staff and ground -- so both are shown. Type I sites are used only in large metropolitan areas. Staff are for the distribution operation itself; security, medical, and public information staff are added by the site. Footprints are the USACE type dimensions. Throughput drops with walk-up traffic, bad weather, and inexperienced crews. This is a sizing aid from the USACE typing standard, which FEMA notes is widely used but not a national standard; it does not select sites or design traffic control, accessibility, security, or lighting. The local emergency management agency, the state, and FEMA govern.",
  };
}

export const podSiteConfigurationExample = { inputs: { people_per_day: 48000, household_size: 3, operating_hours: 12, lane_rate_vph: 140 } };
RELIEF_RENDERERS["pod-site-configuration"] = _simpleRenderer({
  citation: "Citation: FEMA IS-26, Guide to Points of Distribution (2008), with the USACE POD typing (Type III 1 lane, 19 day / 4 night staff, 150 x 300 ft; Type II 2 lanes, 34 / 6, 250 x 300 ft; Type I 4 lanes, 78 / 10, 250 x 500 ft; one vehicle per household of 3) and Missouri SEMA, Annex C, Points of Distribution (one lane with 3 loading points serves 140 cars per hour). The local emergency management agency governs.",
  example: podSiteConfigurationExample.inputs,
  fields: [
    { key: "people_per_day", label: "People to serve per day", default: 0 },
    { key: "household_size", label: "People per vehicle (household size)", default: 3 },
    { key: "operating_hours", label: "Distribution hours per day", default: 12, attrs: { step: "any", min: "0", max: "24" } },
    { key: "lane_rate_vph", label: "Vehicles per lane per hour", default: 140 },
  ],
  outputs: [
    { key: "veh", id: "pod-out-veh", label: "Vehicles", value: (r) => fmt(r.vehicles_per_day, 0) + " per day, " + fmt(r.vehicles_per_hour, 0) + " per hour" },
    { key: "lanes", id: "pod-out-lanes", label: "Lanes required", value: (r) => r.lanes_required + " lanes (one lane serves " + fmt(r.lane_capacity_people_per_day, 0) + " people a day)" },
    { key: "fewest", id: "pod-out-fewest", label: "Fewest sites", value: (r) => r.fewest_sites + " sites: " + r.fewest_label + "; staff " + r.fewest_staff_day + " day / " + r.fewest_staff_night + " night; " + fmt(r.fewest_footprint_sqft, 0) + " sq ft (" + fmt(r.fewest_footprint_acres, 2) + " acres)" },
    { key: "alliii", id: "pod-out-alliii", label: "All Type III", value: (r) => r.all_iii_sites + " sites; staff " + r.all_iii_staff_day + " day / " + r.all_iii_staff_night + " night; " + fmt(r.all_iii_footprint_sqft, 0) + " sq ft (" + fmt(r.all_iii_footprint_acres, 2) + " acres)" },
    { key: "note", id: "pod-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computePodSiteConfiguration,
});

// ===================== spec-v1920: congregate shelter capacity and sanitation =====================

// dims: in { floor_area_sqft: L^2, shelter_type: dimensionless, space_per_person_sqft: L^2, residents_count: dimensionless, code_occupant_load_count: dimensionless, existing_toilets_count: dimensionless, existing_lavatories_count: dimensionless, existing_showers_count: dimensionless } out: { space_used_sqft: L^2, capacity_count: dimensionless, capacity_evacuation_count: dimensionless, capacity_40_count: dimensionless, capacity_60_count: dimensionless, population_count: dimensionless, toilets_count: dimensionless, lavatories_count: dimensionless, showers_count: dimensionless, sewage_gal_per_day: L^3 T^-1, solid_waste_lb_per_day: M T^-1, containers_count: dimensionless, shower_cycle_hours: T }
export function computeShelterCapacitySanitation({ floor_area_sqft = 0, shelter_type = "post_disaster", space_per_person_sqft = 0, residents_count = 0, code_occupant_load_count = 0, existing_toilets_count = 0, existing_lavatories_count = 0, existing_showers_count = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(floor_area_sqft > 0)) return { error: "Usable sleeping floor area must be positive." };
  if (!["evacuation", "post_disaster"].includes(shelter_type)) return { error: "Shelter type must be evacuation or post-disaster." };
  if (!(space_per_person_sqft >= 0)) return { error: "Space per person cannot be negative." };
  if (space_per_person_sqft > 0 && space_per_person_sqft < 20) return { error: "Space per person below 20 sq ft is under the Red Cross minimum for any shelter." };
  if (!(residents_count >= 0) || !(code_occupant_load_count >= 0)) return { error: "Resident count and code occupant load cannot be negative." };
  if (![existing_toilets_count, existing_lavatories_count, existing_showers_count].every((v) => v >= 0)) return { error: "Existing fixture counts cannot be negative." };
  const space_used_sqft = space_per_person_sqft > 0 ? space_per_person_sqft : (shelter_type === "evacuation" ? 20 : 40);
  const capacity_count = Math.floor(floor_area_sqft / space_used_sqft + 1e-9);
  const population_count = residents_count > 0 ? residents_count : capacity_count;
  if (!(population_count > 0)) return { error: "The floor area holds no one at this space per person; enter a larger area or a resident count." };
  const toilets_count = _ceil(population_count / 20);
  const lavatories_count = _ceil(population_count / 20);
  const showers_count = _ceil(population_count / 25);
  const code_entered = code_occupant_load_count > 0;
  const exceeds_code_load = code_entered && population_count > code_occupant_load_count;
  return {
    space_used_sqft, capacity_count,
    capacity_evacuation_count: Math.floor(floor_area_sqft / 20 + 1e-9),
    capacity_40_count: Math.floor(floor_area_sqft / 40 + 1e-9),
    capacity_60_count: Math.floor(floor_area_sqft / 60 + 1e-9),
    population_count, over_floor_capacity: population_count > capacity_count,
    toilets_count, lavatories_count, showers_count,
    sewage_gal_per_day: population_count * 1.5,
    solid_waste_lb_per_day: population_count * 5,
    containers_count: _ceil(population_count / 10),
    shower_cycle_hours: population_count * 0.25 / showers_count,
    toilet_shortfall_count: Math.max(0, toilets_count - existing_toilets_count),
    lavatory_shortfall_count: Math.max(0, lavatories_count - existing_lavatories_count),
    shower_shortfall_count: Math.max(0, showers_count - existing_showers_count),
    code_entered, exceeds_code_load,
    code_check: !code_entered ? "code occupant load not entered -- the building official's posted load still caps the shelter"
      : exceeds_code_load ? "EXCEEDS the entered code occupant load -- the shelter population must come down to it"
        : "within the entered code occupant load",
    note: "A shelter's capacity is floor area divided by the space each person gets, and the space depends on how long they stay: 20 sq ft is a cot and a bag for a 24-48 hour evacuation, while a stay of weeks needs 40 to 60 or more for belongings, circulation, and some privacy, so the same gym holds half as many once it becomes a shelter for the displaced. The sanitation ratios follow the population and are the part of a shelter that fails first: 1 toilet and 1 hand-washing lavatory per 20 persons, 1 shower per 25 (a 15 minute shower opportunity each), 1.5 gal per person per day of sewage capacity, 5 lb per person per day of solid waste, and one 30 gal lidded container per 10 persons. The building's code occupant load is not suspended by an emergency and is checked when entered. It does not address functional-needs space (which increases area per person), medical, feeding, or pet areas, security, or HVAC and generator loads, and it does not replace the building official's occupant load or the fire marshal's review. The American Red Cross standards, the shelter manager, and the AHJ govern.",
  };
}

export const shelterCapacitySanitationExample = { inputs: { floor_area_sqft: 9600, shelter_type: "post_disaster", space_per_person_sqft: 0, residents_count: 0, code_occupant_load_count: 0, existing_toilets_count: 0, existing_lavatories_count: 0, existing_showers_count: 0 } };
RELIEF_RENDERERS["shelter-capacity-sanitation"] = _simpleRenderer({
  citation: "Citation: American Red Cross, Mass Care Standards and Indicators, as reproduced in the Florida State Emergency Shelter Plan (2018), Appendix F: 20 sq ft of sleeping space for 24-48 hour evacuation shelters, 40-60+ sq ft for longer stays, 1 toilet and 1 lavatory per 20 persons, 1 shower per 25, 1.5 gal per person per day sewage, 5 lb per person per day solid waste, one 30 gal container per 10 persons. The building's code occupant load still caps the shelter; the shelter manager and the AHJ govern.",
  example: shelterCapacitySanitationExample.inputs,
  fields: [
    { key: "floor_area_sqft", label: "Usable sleeping floor area (sq ft)", default: 0 },
    { key: "shelter_type", label: "Shelter type", kind: "select", options: [{ value: "evacuation", label: "Evacuation, 24-48 h (20 sq ft)" }, { value: "post_disaster", label: "Post-disaster, longer stay (40 sq ft)" }], default: "post_disaster" },
    { key: "space_per_person_sqft", label: "Or: space per person (sq ft, 0 = by type, 20 minimum)", default: 0 },
    { key: "residents_count", label: "Residents to plan for (0 = floor-area capacity)", default: 0 },
    { key: "code_occupant_load_count", label: "Code occupant load (0 = not entered)", default: 0 },
    { key: "existing_toilets_count", label: "Existing toilets", default: 0 },
    { key: "existing_lavatories_count", label: "Existing lavatories", default: 0 },
    { key: "existing_showers_count", label: "Existing showers", default: 0 },
  ],
  outputs: [
    { key: "cap", id: "scs-out-cap", label: "Shelter capacity", value: (r) => r.capacity_count + " people at " + fmt(r.space_used_sqft, 0) + " sq ft each" },
    { key: "range", id: "scs-out-range", label: "Evacuation vs post-disaster", value: (r) => r.capacity_evacuation_count + " at 20 sq ft; " + r.capacity_40_count + " at 40; " + r.capacity_60_count + " at 60" },
    { key: "pop", id: "scs-out-pop", label: "Population sized for", value: (r) => r.population_count + " residents" + (r.over_floor_capacity ? " -- MORE than the floor area holds at this spacing" : "") },
    { key: "fix", id: "scs-out-fix", label: "Fixtures required", value: (r) => r.toilets_count + " toilets, " + r.lavatories_count + " lavatories, " + r.showers_count + " showers" },
    { key: "short", id: "scs-out-short", label: "Shortfall against existing", value: (r) => r.toilet_shortfall_count + " toilets, " + r.lavatory_shortfall_count + " lavatories, " + r.shower_shortfall_count + " showers" },
    { key: "shower", id: "scs-out-shower", label: "Shower cycle", value: (r) => fmt(r.shower_cycle_hours, 1) + " h of continuous use for every resident to have 15 minutes" },
    { key: "waste", id: "scs-out-waste", label: "Sewage and solid waste", value: (r) => fmt(r.sewage_gal_per_day, 0) + " gal/day sewage; " + fmt(r.solid_waste_lb_per_day, 0) + " lb/day solid waste; " + r.containers_count + " x 30 gal containers" },
    { key: "code", id: "scs-out-code", label: "Code occupant load", value: (r) => r.code_check },
    { key: "note", id: "scs-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeShelterCapacitySanitation,
});

// ===================== spec-v1921: storm safe room occupant capacity =====================

// FEMA P-361 minimum usable floor area per occupant (sq ft). Community rooms:
// standing or seated, wheelchair, bed or stretcher. Residential: one density.
const _SAFE_ROOM = {
  community_tornado: { community: true, standing: 5, wheelchair: 10, bed: 30, label: "community tornado" },
  community_hurricane: { community: true, standing: 20, wheelchair: 20, bed: 40, label: "community hurricane" },
  residential_tornado_1_2_family: { community: false, standing: 3, label: "residential tornado, one- and two-family" },
  residential_tornado_other: { community: false, standing: 5, label: "residential tornado, other residential" },
  residential_hurricane_1_2_family: { community: false, standing: 7, label: "residential hurricane, one- and two-family" },
  residential_hurricane_other: { community: false, standing: 10, label: "residential hurricane, other residential" },
};
const _USABLE_REDUCTION = { concentrated_50: 0.5, unconcentrated_35: 0.35, open_plan_15: 0.15 };

// dims: in { room_type: dimensionless, gross_area_sqft: L^2, usable_method: dimensionless, net_usable_area_sqft: L^2, bed_spaces_count: dimensionless } out: { usable_area_sqft: L^2, standing_sqft: L^2, wheelchair_sqft: L^2, bed_sqft: L^2, simple_capacity_count: dimensionless, occupant_capacity_count: dimensionless, standing_count: dimensionless, wheelchair_spaces_count: dimensionless, area_used_sqft: L^2 }
export function computeSafeRoomCapacity({ room_type = "community_tornado", gross_area_sqft = 0, usable_method = "net", net_usable_area_sqft = 0, bed_spaces_count = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = _SAFE_ROOM[room_type];
  if (!t) return { error: "Choose a published safe room type." };
  if (!(gross_area_sqft > 0)) return { error: "Gross floor area must be positive." };
  if (usable_method !== "net" && !(usable_method in _USABLE_REDUCTION)) return { error: "Usable area method must be a published reduction (50%, 35%, or 15%) or an entered net area." };
  if (usable_method === "net" && !(net_usable_area_sqft > 0 && net_usable_area_sqft <= gross_area_sqft)) return { error: "Entered net usable area must be positive and no more than the gross area." };
  if (!(bed_spaces_count >= 0) || !Number.isInteger(bed_spaces_count)) return { error: "Bed or stretcher spaces must be a whole number, 0 or more." };
  if (!t.community && bed_spaces_count > 0) return { error: "Bed or stretcher spaces are sized under the community criteria; choose a community safe room type." };
  const usable_area_sqft = usable_method === "net" ? net_usable_area_sqft : gross_area_sqft * (1 - _USABLE_REDUCTION[usable_method]);
  const simple_capacity_count = Math.floor(usable_area_sqft / t.standing + 1e-9);
  let occupant_capacity_count, wheelchair_spaces_count, area_used_sqft;
  if (t.community) {
    // Total T includes the bed occupants; W = ceil(T / 200) wheelchair spaces
    // (at least one); the rest stand. Required area rises with T, so the
    // largest T that fits is found by bisection.
    const need = (T) => {
      const W = Math.ceil(T / 200 - 1e-9);
      return (T - W - bed_spaces_count) * t.standing + W * t.wheelchair + bed_spaces_count * t.bed;
    };
    const minT = bed_spaces_count + Math.ceil((bed_spaces_count + 1) / 200 - 1e-9);
    if (need(minT) > usable_area_sqft + 1e-9) return { error: "The usable area cannot hold the bed or stretcher spaces plus the required wheelchair space." };
    let lo = minT;
    let hi = Math.max(minT, Math.floor(usable_area_sqft / Math.min(t.standing, t.wheelchair) + 1e-9) + 1);
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2 + 1e-9);
      if (need(mid) <= usable_area_sqft + 1e-9) lo = mid; else hi = mid;
    }
    if (need(hi) <= usable_area_sqft + 1e-9) lo = hi;
    occupant_capacity_count = lo;
    wheelchair_spaces_count = Math.ceil(lo / 200 - 1e-9);
    area_used_sqft = need(lo);
  } else {
    occupant_capacity_count = simple_capacity_count;
    wheelchair_spaces_count = 0;
    area_used_sqft = occupant_capacity_count * t.standing;
  }
  const standing_count = occupant_capacity_count - wheelchair_spaces_count - bed_spaces_count;
  const residential_limit_exceeded = !t.community && occupant_capacity_count > 16;
  const hurricane = room_type.includes("hurricane");
  return {
    room_label: t.label, usable_area_sqft,
    standing_sqft: t.standing, wheelchair_sqft: t.community ? t.wheelchair : 0, bed_sqft: t.community ? t.bed : 0,
    simple_capacity_count, occupant_capacity_count, standing_count, wheelchair_spaces_count,
    bed_spaces_count, area_used_sqft, residential_limit_exceeded,
    routing: residential_limit_exceeded
      ? "ABOVE 16 occupants: a residential safe room this size is designed to the community criteria -- choose a community type"
      : t.community ? "community criteria apply" : "within the 16-occupant residential limit",
    restroom_note: hurricane
      ? "Hurricane safe rooms may NOT count restroom area toward usable area -- leave it out of the entered area."
      : "Tornado safe rooms may count restroom area outside the stalls only under the conditions P-361 sets; exclude it when in doubt.",
    note: "Occupant density is set by how long people will be inside: a tornado passes in minutes, so a community safe room may pack people standing at 5 sq ft each, while a hurricane lasts a day or more and the same room holds a quarter as many at 20 sq ft. Usable area is less than the footprint: reduce the gross by at least 50% for concentrated furnishings or fixed seating, 35% for unconcentrated furnishings without fixed seating, or 15% for open plan, or subtract walls, columns, and fixed equipment once the plan is drawn. Every 200 occupants or portion thereof in a community room need a wheelchair space at the wheelchair density, so adding people adds wheelchair spaces; the tile solves for the largest total that fits, which reproduces FEMA's 4,800 sq ft classroom at 955 occupants. A residential safe room above 16 occupants is routed to the community criteria. It does not design the structure for the ICC 500 wind speeds and debris impact, or address siting, egress, ventilation, sanitation, lighting, or travel time, and code occupant loads for normal use still apply and are posted alongside. FEMA P-361, ICC 500, the safe room designer, and the AHJ govern.",
  };
}

export const safeRoomCapacityExample = { inputs: { room_type: "community_tornado", gross_area_sqft: 4800, usable_method: "net", net_usable_area_sqft: 4800, bed_spaces_count: 0 } };
RELIEF_RENDERERS["safe-room-capacity"] = _simpleRenderer({
  citation: "Citation: FEMA P-361, Safe Rooms for Tornadoes and Hurricanes, Part B, Section B5.2.1: Table B5-1 (community tornado 5 / 10 / 30 sq ft standing, wheelchair, bed), Table B5-2 (community hurricane 20 / 20 / 40), Table B5-3 (residential: tornado 3 or 5, hurricane 7 or 10), one wheelchair space per 200 occupants, and the 50% / 35% / 15% usable-area reductions; ICC 500 Sections 502 and 503 cited by number. The safe room designer and the AHJ govern.",
  example: safeRoomCapacityExample.inputs,
  fields: [
    { key: "room_type", label: "Safe room type", kind: "select", options: [
      { value: "community_tornado", label: "Community, tornado" },
      { value: "community_hurricane", label: "Community, hurricane" },
      { value: "residential_tornado_1_2_family", label: "Residential tornado, one- and two-family" },
      { value: "residential_tornado_other", label: "Residential tornado, other residential" },
      { value: "residential_hurricane_1_2_family", label: "Residential hurricane, one- and two-family" },
      { value: "residential_hurricane_other", label: "Residential hurricane, other residential" },
    ], default: "community_tornado" },
    { key: "gross_area_sqft", label: "Gross floor area (sq ft)", default: 0 },
    { key: "usable_method", label: "Usable area method", kind: "select", options: [
      { value: "net", label: "Method 2: enter net usable area" },
      { value: "concentrated_50", label: "Method 1: concentrated furnishings or fixed seating (-50%)" },
      { value: "unconcentrated_35", label: "Method 1: unconcentrated, no fixed seating (-35%)" },
      { value: "open_plan_15", label: "Method 1: open plan (-15%)" },
    ], default: "net" },
    { key: "net_usable_area_sqft", label: "Net usable area for method 2 (sq ft)", default: 0 },
    { key: "bed_spaces_count", label: "Bed or stretcher spaces needed (community only)", default: 0, attrs: { step: "1", min: "0" } },
  ],
  outputs: [
    { key: "cap", id: "src-out-cap", label: "Maximum occupants", value: (r) => r.occupant_capacity_count + " occupants (" + r.room_label + ")" },
    { key: "usable", id: "src-out-usable", label: "Usable area", value: (r) => fmt(r.usable_area_sqft, 0) + " sq ft; " + fmt(r.area_used_sqft, 0) + " sq ft required at capacity" },
    { key: "mix", id: "src-out-mix", label: "Occupant mix", value: (r) => r.standing_count + " standing or seated + " + r.wheelchair_spaces_count + " wheelchair + " + r.bed_spaces_count + " bed or stretcher" },
    { key: "density", id: "src-out-density", label: "Area per occupant", value: (r) => fmt(r.standing_sqft, 0) + " sq ft standing" + (r.wheelchair_sqft ? ", " + fmt(r.wheelchair_sqft, 0) + " wheelchair, " + fmt(r.bed_sqft, 0) + " bed" : "") + "; " + r.simple_capacity_count + " before wheelchair spaces" },
    { key: "route", id: "src-out-route", label: "Criteria", value: (r) => r.routing },
    { key: "rest", id: "src-out-rest", label: "Restrooms", value: (r) => r.restroom_note },
    { key: "note", id: "src-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeSafeRoomCapacity,
});

// ===================== spec-v1922: temporary housing park service demand =====================

// NEC 551.73(A) per-site loads by receptacle (VA). The 50 A value is 12,000 VA
// in the 2017 and later editions and 9,600 VA before. The demand factor tables
// themselves are NOT reproduced; the factor is entered.
const _RV_50A_VA = { nec_2017_and_later: 12000, nec_before_2017: 9600 };
const _RV_30A_VA = 3600;
const _RV_20A_VA = 2400;
const _RV_TENT_VA = 600;
const _MH_MIN_LOT_VA = 16000;

// dims: in { sites_50a_count: dimensionless, sites_30a_count: dimensionless, sites_20a_count: dimensionless, tent_sites_count: dimensionless, nec_edition: dimensionless, rv_demand_factor: dimensionless, mh_lots_count: dimensionless, mh_lot_va: L^2 M T^-3, mh_demand_factor: dimensionless, service_voltage_v: M L^2 T^-3 I^-1, phase: dimensionless } out: { rv_connected_va: L^2 M T^-3, rv_demand_va: L^2 M T^-3, rv_current_a: I, rv_other_edition_demand_va: L^2 M T^-3, rv_other_edition_current_a: I, edition_change_pct: dimensionless, mh_lot_va_used: L^2 M T^-3, mh_connected_va: L^2 M T^-3, mh_demand_va: L^2 M T^-3, mh_current_a: I, mh_to_rv_current_pct: dimensionless }
export function computeTempHousingParkDemand({ sites_50a_count = 0, sites_30a_count = 0, sites_20a_count = 0, tent_sites_count = 0, nec_edition = "nec_2017_and_later", rv_demand_factor = 0, mh_lots_count = 0, mh_lot_va = 16000, mh_demand_factor = 0, service_voltage_v = 240, phase = "single_phase" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(nec_edition in _RV_50A_VA)) return { error: "NEC edition must be 2017 and later, or before 2017." };
  if (!["single_phase", "three_phase"].includes(phase)) return { error: "Phase must be single-phase or three-phase." };
  if (![sites_50a_count, sites_30a_count, sites_20a_count, tent_sites_count, mh_lots_count].every((v) => v >= 0)) return { error: "Site and lot counts cannot be negative." };
  if (!(service_voltage_v > 0)) return { error: "Service voltage must be positive." };
  const rv_sites_count = sites_50a_count + sites_30a_count + sites_20a_count + tent_sites_count;
  const rv_entered = rv_sites_count > 0;
  const mh_entered = mh_lots_count > 0;
  if (!rv_entered && !mh_entered) return { error: "Enter at least one RV site or one manufactured home lot." };
  if (rv_entered && !(rv_demand_factor > 0 && rv_demand_factor <= 1)) return { error: "The RV park demand factor from Table 551.73(A) must be greater than 0 and no more than 1." };
  if (mh_entered && !(mh_lot_va > 0)) return { error: "The per-lot load must be positive." };
  if (mh_entered && !(mh_demand_factor > 0 && mh_demand_factor <= 1)) return { error: "The manufactured home park demand factor from Table 550.31 must be greater than 0 and no more than 1." };
  const volts = phase === "three_phase" ? Math.sqrt(3) * service_voltage_v : service_voltage_v;
  const other_edition = nec_edition === "nec_2017_and_later" ? "nec_before_2017" : "nec_2017_and_later";
  const rvConnected = (ed) => sites_50a_count * _RV_50A_VA[ed] + sites_30a_count * _RV_30A_VA + sites_20a_count * _RV_20A_VA + tent_sites_count * _RV_TENT_VA;
  const rv_connected_va = rvConnected(nec_edition);
  const rv_demand_va = rv_entered ? rv_connected_va * rv_demand_factor : 0;
  const rv_other_edition_demand_va = rv_entered ? rvConnected(other_edition) * rv_demand_factor : 0;
  // 550.31: 16,000 VA per lot, or the calculated load if larger.
  const mh_lot_va_used = mh_entered ? Math.max(_MH_MIN_LOT_VA, mh_lot_va) : 0;
  const mh_connected_va = mh_lots_count * mh_lot_va_used;
  const mh_demand_va = mh_entered ? mh_connected_va * mh_demand_factor : 0;
  const rv_current_a = rv_demand_va / volts;
  const mh_current_a = mh_demand_va / volts;
  return {
    rv_entered, mh_entered, rv_sites_count, nec_edition,
    site_50a_va: _RV_50A_VA[nec_edition],
    rv_connected_va, rv_demand_va, rv_current_a,
    rv_other_edition_demand_va, rv_other_edition_current_a: rv_other_edition_demand_va / volts,
    edition_change_pct: rv_other_edition_demand_va > 0 ? 100 * (rv_demand_va - rv_other_edition_demand_va) / rv_other_edition_demand_va : 0,
    mh_lot_va_used, mh_lot_floor_applied: mh_entered && mh_lot_va < _MH_MIN_LOT_VA,
    mh_connected_va, mh_demand_va, mh_current_a,
    mh_to_rv_current_pct: rv_entered && mh_entered ? 100 * mh_current_a / rv_current_a : 0,
    service_voltage_v, phase,
    note: "Temporary housing parks look alike on the ground and are calculated differently in the code. A travel trailer park falls under NEC Article 551, where each site is loaded by its receptacle (50 A: 12,000 VA in the 2017 and later editions, 9,600 VA before; 20 A and 30 A: 3,600 VA; 20 A only: 2,400 VA; tent: 600 VA) and the demand factor drops steeply as sites are added. A park of manufactured housing units falls under Article 550, at 16,000 VA per lot or the calculated load if larger, with a demand factor that falls further. FEMA group sites have used both kinds of unit, so both are shown. The 2017 change to the 50 A value raises a large park's load by a quarter, and a park designed to the older value may not meet the newer one. The demand factor tables are NFPA text and are not reproduced: the factor is entered from the adopted edition's table for the site count. This is a service and feeder demand estimate; it does not size site feeders, pedestals, or conductors, or address voltage drop, grounding, GFCI, or site layout, and utility requirements may differ. The NEC edition adopted by the AHJ, the utility, and the AHJ govern.",
  };
}

export const tempHousingParkDemandExample = { inputs: { sites_50a_count: 40, sites_30a_count: 0, sites_20a_count: 0, tent_sites_count: 0, nec_edition: "nec_2017_and_later", rv_demand_factor: 0.41, mh_lots_count: 25, mh_lot_va: 16000, mh_demand_factor: 0.24, service_voltage_v: 240, phase: "single_phase" } };
RELIEF_RENDERERS["temp-housing-park-feeder-demand"] = _simpleRenderer({
  citation: "Citation: NFPA 70 (NEC) Section 551.73(A) and Table 551.73(A), recreational vehicle park demand (50 A site 12,000 VA in 2017 and later, 9,600 VA before), and Section 550.31 and Table 550.31, manufactured home park demand (16,000 VA per lot minimum). The demand factors are entered from the adopted edition's tables, which are not reproduced. The adopted NEC edition, the utility, and the AHJ govern.",
  example: tempHousingParkDemandExample.inputs,
  fields: [
    { key: "sites_50a_count", label: "RV sites with 50 A receptacles", default: 0 },
    { key: "sites_30a_count", label: "RV sites with 20 A and 30 A receptacles", default: 0 },
    { key: "sites_20a_count", label: "RV sites with 20 A only", default: 0 },
    { key: "tent_sites_count", label: "Tent sites", default: 0 },
    { key: "nec_edition", label: "NEC edition for the 50 A site value", kind: "select", options: [{ value: "nec_2017_and_later", label: "2017 and later (12,000 VA)" }, { value: "nec_before_2017", label: "Before 2017 (9,600 VA)" }], default: "nec_2017_and_later" },
    { key: "rv_demand_factor", label: "RV demand factor from Table 551.73(A) (0-1)", default: 0, attrs: { step: "any", min: "0", max: "1" } },
    { key: "mh_lots_count", label: "Manufactured home lots", default: 0 },
    { key: "mh_lot_va", label: "Per-lot load (VA, 16,000 minimum)", default: 16000 },
    { key: "mh_demand_factor", label: "MH demand factor from Table 550.31 (0-1)", default: 0, attrs: { step: "any", min: "0", max: "1" } },
    { key: "service_voltage_v", label: "Service voltage (V)", default: 240 },
    { key: "phase", label: "Service phase", kind: "select", options: [{ value: "single_phase", label: "Single-phase" }, { value: "three_phase", label: "Three-phase" }], default: "single_phase" },
  ],
  outputs: [
    { key: "rv", id: "thp-out-rv", label: "RV park (Article 551)", value: (r) => r.rv_entered ? fmt(r.rv_connected_va, 0) + " VA connected -> " + fmt(r.rv_demand_va, 0) + " VA demand -> " + fmt(r.rv_current_a, 0) + " A" : "no RV sites entered" },
    { key: "ed", id: "thp-out-ed", label: "Same park, other 50 A edition value", value: (r) => r.rv_entered ? fmt(r.rv_other_edition_demand_va, 0) + " VA -> " + fmt(r.rv_other_edition_current_a, 0) + " A (this edition is " + fmt(r.edition_change_pct, 1) + " % different)" : "-" },
    { key: "mh", id: "thp-out-mh", label: "Manufactured home park (Article 550)", value: (r) => r.mh_entered ? fmt(r.mh_connected_va, 0) + " VA connected at " + fmt(r.mh_lot_va_used, 0) + " VA/lot" + (r.mh_lot_floor_applied ? " (16,000 VA floor applied)" : "") + " -> " + fmt(r.mh_demand_va, 0) + " VA demand -> " + fmt(r.mh_current_a, 0) + " A" : "no manufactured home lots entered" },
    { key: "cmp", id: "thp-out-cmp", label: "Comparison", value: (r) => r.rv_entered && r.mh_entered ? "the manufactured home park needs " + fmt(r.mh_to_rv_current_pct, 1) + " % of the RV park's service current" : "enter both to compare" },
    { key: "note", id: "thp-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeTempHousingParkDemand,
});
