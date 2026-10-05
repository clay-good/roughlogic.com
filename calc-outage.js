// calc-outage.js -- Groups C and B: buildings in an outage.
//
// The seventh band of the disaster response and recovery program
// (specs/scope-disaster-response.md, specs v1923 through v1925). When the power
// or the gas goes out in a winter storm or a hurricane, three questions come to
// the trades: how many hours until the building is too cold, how long a
// walk-in cooler holds its product, and how long a pipe in an unheated space
// has before it freezes. The catalog had the loss coefficients (building-ua,
// walk-in-cooler-load) and the steady-state protection (heat-trace-sizing);
// these tiles turn them into hours.
//
// Tiles:
//   v1923 building-outage-cooldown       (group C, HVAC)
//   v1924 refrigeration-outage-holdover  (group C, HVAC)
//   v1925 pipe-freeze-time               (group B, Plumbing and Gas)
//
// US sources only: the lumped-capacitance (Newton cooling) method, the LBNL
// "hours of safety" thermal-resilience metric (OSTI 1984644), ASHRAE Handbook
// -- Fundamentals by chapter name, the FDA Food Code 41 degF cold-holding
// limit, and the USDA FSIS power-outage guidance. No code table is reproduced;
// every material property is either physical data or an entered value.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// Sensible heat of a seated adult at rest, Btu/h (spec-v1923).
const PERSON_SENSIBLE_BTUH = 250;
// Specific heats for the capacitance helper, Btu/lb-degF: gypsum 0.26,
// wood at the low end of the 0.3-0.4 range (the low end gives the shorter,
// safer estimate), concrete 0.2, water 1.0 by definition of the Btu.
const CP_GYPSUM = 0.26;
const CP_WOOD = 0.3;
const CP_CONCRETE = 0.2;
const CP_WATER = 1.0;
// Heat of sublimation of dry ice (solid CO2), Btu/lb (spec-v1924).
const DRY_ICE_BTU_PER_LB = 246;
// Latent heat of fusion of water, Btu/lb (spec-v1925).
const WATER_FUSION_BTU_PER_LB = 143.5;
// Density of water near 40-60 degF, lb/cu ft.
const WATER_LB_PER_FT3 = 62.4;
const FREEZE_DEGF = 32;

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

export const OUTAGE_RENDERERS = {};

const _SIGNED = { step: "any" };

// Hours for a cooling building to fall to a threshold, or null when the
// threshold sits at or below the equilibrium and is never reached. Module level
// so the compute's own return is the only one check-render-output-keys reads.
function _outageHoursTo(threshold, start_degf, equilibrium_degf, tau_hours, start_excess) {
  if (threshold === start_degf) return 0;
  if (!(threshold > equilibrium_degf)) return null;
  return tau_hours * Math.log(start_excess / (threshold - equilibrium_degf));
}

// ===================== spec-v1923: building temperature drift in a heating outage =====================

// dims: in { envelope_ua_btuh_per_degf: M L^2 T^-3, capacitance_btu_per_degf: M L^2 T^-2, gypsum_lb: M, wood_lb: M, concrete_lb: M, water_lb: M, indoor_start_degf: T, outdoor_degf: T, occupants: dimensionless, other_gains_btuh: M L^2 T^-3, first_threshold_degf: T, second_threshold_degf: T } out: { total_capacitance_btu_per_degf: M L^2 T^-2, helper_capacitance_btu_per_degf: M L^2 T^-2, internal_gain_btuh: M L^2 T^-3, time_constant_hours: T, equilibrium_degf: T, hours_to_first: T, hours_to_second: T, temp_after_12h_degf: T, temp_after_24h_degf: T, temp_after_48h_degf: T }
export function computeBuildingOutageCooldown({ envelope_ua_btuh_per_degf = 0, capacitance_btu_per_degf = 0, gypsum_lb = 0, wood_lb = 0, concrete_lb = 0, water_lb = 0, indoor_start_degf = 68, outdoor_degf = 10, occupants = 0, other_gains_btuh = 0, first_threshold_degf = 50, second_threshold_degf = 40 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(envelope_ua_btuh_per_degf > 0)) return { error: "The envelope UA must be positive." };
  if (![capacitance_btu_per_degf, gypsum_lb, wood_lb, concrete_lb, water_lb].every((v) => v >= 0)) return { error: "Capacitance and material masses cannot be negative." };
  if (!(occupants >= 0) || !(other_gains_btuh >= 0)) return { error: "Occupants and internal gains cannot be negative." };
  const helper_capacitance_btu_per_degf = gypsum_lb * CP_GYPSUM + wood_lb * CP_WOOD + concrete_lb * CP_CONCRETE + water_lb * CP_WATER;
  const total_capacitance_btu_per_degf = capacitance_btu_per_degf + helper_capacitance_btu_per_degf;
  if (!(total_capacitance_btu_per_degf > 0)) return { error: "The thermal capacitance must be positive: enter it directly or enter the material masses." };
  if (first_threshold_degf > indoor_start_degf || second_threshold_degf > indoor_start_degf) return { error: "A threshold temperature cannot be above the starting indoor temperature." };
  const internal_gain_btuh = occupants * PERSON_SENSIBLE_BTUH + other_gains_btuh;
  const time_constant_hours = total_capacitance_btu_per_degf / envelope_ua_btuh_per_degf;
  const equilibrium_degf = outdoor_degf + internal_gain_btuh / envelope_ua_btuh_per_degf;
  const start_excess = indoor_start_degf - equilibrium_degf;
  // A threshold at or below the equilibrium is never reached: null, not Infinity.
  const hoursTo = (threshold) => _outageHoursTo(threshold, indoor_start_degf, equilibrium_degf, time_constant_hours, start_excess);
  const at = (hours) => equilibrium_degf + start_excess * Math.exp(-hours / time_constant_hours);
  const hours_to_first = hoursTo(first_threshold_degf);
  const hours_to_second = hoursTo(second_threshold_degf);
  const first_reached = hours_to_first !== null;
  const second_reached = hours_to_second !== null;
  const describe = (reached, hours, threshold) => reached
    ? fmt(hours, 1) + " h to " + fmt(threshold, 0) + " degF"
    : "never reaches " + fmt(threshold, 0) + " degF -- the building settles at " + fmt(equilibrium_degf, 1) + " degF";
  return {
    helper_capacitance_btu_per_degf, total_capacitance_btu_per_degf, internal_gain_btuh,
    time_constant_hours, equilibrium_degf, first_threshold_degf, second_threshold_degf,
    first_reached, second_reached, hours_to_first, hours_to_second,
    first_verdict: describe(first_reached, hours_to_first, first_threshold_degf),
    second_verdict: describe(second_reached, hours_to_second, second_threshold_degf),
    temp_after_12h_degf: at(12), temp_after_24h_degf: at(24), temp_after_48h_degf: at(48),
    note: "A building without heat cools the way a cup of coffee does: fast at first, slower as it approaches the temperature it settles toward, and the pace is set by one number, the time constant -- the heat the building stores per degree divided by the heat it loses per degree. A heavy, well-sealed building coasts for days and a light, leaky one for hours, so an air-sealing or window upgrade that lowers UA is also a resilience upgrade. Each person gives off roughly 250 Btu an hour of sensible heat at rest, which raises the settling temperature; gathering in one room works by concentrating that heat in less air. This is a single-node model and it errs in a known direction: room air and light surfaces cool faster than the structure, so the first hours drop faster than the curve, and pipes in exterior walls, attics, and crawl spaces reach freezing well before the room does (see pipe-freeze-time). It ignores solar gain, wind, stratification, and multiple zones. The capacitance dominates the answer and is an estimate; a measured cooldown from a previous outage is the best calibration. Never heat with a grill, generator, or unvented appliance indoors -- carbon monoxide kills people in every winter outage. The mechanical contractor or engineer and local emergency guidance govern.",
  };
}

export const buildingOutageCooldownExample = { inputs: { envelope_ua_btuh_per_degf: 309.7, capacitance_btu_per_degf: 10000, gypsum_lb: 0, wood_lb: 0, concrete_lb: 0, water_lb: 0, indoor_start_degf: 68, outdoor_degf: 10, occupants: 0, other_gains_btuh: 0, first_threshold_degf: 50, second_threshold_degf: 40 } };
OUTAGE_RENDERERS["building-outage-cooldown"] = _simpleRenderer({
  citation: "Citation: lumped-capacitance (Newton cooling) model, tau = C / UA, T(t) = T_eq + (T_start - T_eq) x e^(-t/tau), with T_eq = T_out + internal gains / UA; the hours-of-safety thermal-resilience metric of LBNL, Assessing thermal resilience of an assisted living facility during heat waves and cold snaps with power outages (OSTI 1984644); material specific heats per ASHRAE Handbook -- Fundamentals. The mechanical contractor or engineer and local emergency guidance govern.",
  example: buildingOutageCooldownExample.inputs,
  fields: [
    { key: "envelope_ua_btuh_per_degf", label: "Envelope heat loss coefficient UA (Btu/h-degF, from building-ua)" },
    { key: "capacitance_btu_per_degf", label: "Effective thermal capacitance entered directly (Btu/degF; 0 to use the masses below)" },
    { key: "gypsum_lb", label: "Helper: gypsum board mass (lb, cp 0.26)" },
    { key: "wood_lb", label: "Helper: wood framing and furniture mass (lb, cp 0.3)" },
    { key: "concrete_lb", label: "Helper: interior concrete or masonry mass (lb, cp 0.2)" },
    { key: "water_lb", label: "Helper: stored water mass (lb, cp 1.0)" },
    { key: "indoor_start_degf", label: "Indoor temperature when heat is lost (degF)", default: 68, attrs: _SIGNED },
    { key: "outdoor_degf", label: "Outdoor temperature (degF)", default: 10, attrs: _SIGNED },
    { key: "occupants", label: "People inside (about 250 Btu/h each)" },
    { key: "other_gains_btuh", label: "Other internal gains still running (Btu/h)" },
    { key: "first_threshold_degf", label: "First threshold, e.g. habitability (degF)", default: 50, attrs: _SIGNED },
    { key: "second_threshold_degf", label: "Second threshold, e.g. pipe screening line (degF)", default: 40, attrs: _SIGNED },
  ],
  outputs: [
    { key: "tau", id: "boc-out-tau", label: "Time constant", unit: "h", value: (r) => fmt(r.time_constant_hours, 1) + " h (capacitance " + fmt(r.total_capacitance_btu_per_degf, 0) + " Btu/degF)" },
    { key: "eq", id: "boc-out-eq", label: "Temperature the building settles toward", unit: "degF", value: (r) => fmt(r.equilibrium_degf, 1) + " degF (internal gains " + fmt(r.internal_gain_btuh, 0) + " Btu/h)" },
    { key: "t1", id: "boc-out-t1", label: "Hours to the first threshold", value: (r) => r.first_verdict },
    { key: "t2", id: "boc-out-t2", label: "Hours to the second threshold", value: (r) => r.second_verdict },
    { key: "drift", id: "boc-out-drift", label: "Indoor temperature after 12 / 24 / 48 h", value: (r) => fmt(r.temp_after_12h_degf, 1) + " / " + fmt(r.temp_after_24h_degf, 1) + " / " + fmt(r.temp_after_48h_degf, 1) + " degF" },
    { key: "note", id: "boc-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeBuildingOutageCooldown,
});

// ===================== spec-v1924: walk-in cooler outage holdover and dry ice =====================

// dims: in { entered_heat_gain_btuh: M L^2 T^-3, box_length_ft: L, box_width_ft: L, box_height_ft: L, panel_u_btuh_per_sqft_degf: M T^-3, ambient_degf: T, box_degf: T, infiltration_pct: dimensionless, product_lb: M, product_cp_btu_per_lb_degf: L^2 T^-2, product_start_degf: T, allowable_degf: T, outage_hours: T } out: { surface_sqft: L^2, transmission_btuh: M L^2 T^-3, heat_gain_btuh: M L^2 T^-3, reserve_btu: M L^2 T^-2, holdover_hours: T, dry_ice_lb_per_hour: M T^-1, dry_ice_lb_per_day: M T^-1, outage_dry_ice_lb: M, usda_check_leak_btuh: M L^2 T^-3 }
export function computeRefrigerationOutageHoldover({ entered_heat_gain_btuh = 0, box_length_ft = 0, box_width_ft = 0, box_height_ft = 0, panel_u_btuh_per_sqft_degf = 0, ambient_degf = 90, box_degf = 38, infiltration_pct = 10, product_lb = 0, product_cp_btu_per_lb_degf = 0, product_start_degf = 35, allowable_degf = 41, outage_hours = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(entered_heat_gain_btuh >= 0)) return { error: "The entered box heat gain cannot be negative." };
  if (!(infiltration_pct >= 0)) return { error: "The closed-door infiltration allowance cannot be negative." };
  if (!(product_lb > 0)) return { error: "The product mass must be positive." };
  if (!(product_cp_btu_per_lb_degf > 0)) return { error: "The product specific heat must be positive." };
  if (!(allowable_degf > product_start_degf)) return { error: "The allowable temperature must be above the product's starting temperature." };
  if (!(outage_hours >= 0)) return { error: "The outage duration cannot be negative." };
  // An entered gain is taken as the whole closed-door gain; otherwise the
  // transmission is built from the box and the allowance is added to it.
  const use_entered = entered_heat_gain_btuh > 0;
  const surface_sqft = 2 * (box_length_ft * box_width_ft + box_length_ft * box_height_ft + box_width_ft * box_height_ft);
  const transmission_btuh = use_entered ? 0 : surface_sqft * panel_u_btuh_per_sqft_degf * (ambient_degf - box_degf);
  if (!use_entered) {
    if (!(box_length_ft > 0 && box_width_ft > 0 && box_height_ft > 0)) return { error: "Enter the box heat gain, or positive box length, width, and height." };
    if (!(panel_u_btuh_per_sqft_degf > 0)) return { error: "Enter the box heat gain, or a positive panel U-factor." };
    if (!(ambient_degf > box_degf)) return { error: "The box heat gain must be positive: the ambient must be warmer than the box." };
  }
  const heat_gain_btuh = use_entered ? entered_heat_gain_btuh : transmission_btuh * (1 + infiltration_pct / 100);
  const reserve_btu = product_lb * product_cp_btu_per_lb_degf * (allowable_degf - product_start_degf);
  const holdover_hours = reserve_btu / heat_gain_btuh;
  const dry_ice_lb_per_hour = heat_gain_btuh / DRY_ICE_BTU_PER_LB;
  const dry_ice_lb_per_day = dry_ice_lb_per_hour * 24;
  const outage_dry_ice_lb = Math.max(0, heat_gain_btuh * outage_hours - reserve_btu) / DRY_ICE_BTU_PER_LB;
  // USDA FSIS: 50 lb of dry ice holds a full 18 cu ft freezer about 2 days.
  const usda_check_leak_btuh = 50 * DRY_ICE_BTU_PER_LB / 48;
  return {
    use_entered, surface_sqft, transmission_btuh, heat_gain_btuh, reserve_btu, holdover_hours,
    dry_ice_lb_per_hour, dry_ice_lb_per_day, outage_hours, outage_dry_ice_lb, usda_check_leak_btuh,
    outage_verdict: outage_hours <= holdover_hours
      ? "the product's own reserve covers the entered outage with the door shut -- no dry ice needed"
      : "the outage outlasts the product's reserve -- dry ice is needed for the difference",
    note: "A cooler without power is a box warming at the rate heat leaks in, and the product inside is what slows it. The leak is the transmission through the walls, floor, and ceiling plus a small closed-door air exchange; product, people, and lighting loads stop when the box is shut and dark. The product's heat capacity between its storage temperature and the allowable limit is the reserve, and the allowable rise is small: a box at 35 degF has only six degrees before the FDA Food Code's 41 degF cold-holding limit, so a full box buys less time than its weight suggests. Keeping the door shut is worth more than any other action, because every opening dumps the cold air and adds infiltration this estimate leaves out. Dry ice absorbs about 246 Btu per pound as it sublimates; the USDA household figure of 50 lb for two days in a full 18 cu ft freezer implies a leak of about 256 Btu an hour, reported as a check on the method. Dry ice gives off carbon dioxide: never use it in an unventilated occupied space, ventilate before entering the box, and handle it with insulated gloves. It does not model stratification, door openings, product that starts warmer than the box, frozen product and its latent heat (product-pull-down-load), or pharmaceutical storage, which has its own limits. Whether product that has been out of temperature is safe is a decision for the food safety or pharmacy authority. The FDA Food Code as adopted, the USDA guidance, the local health department, and the product's handling requirements govern.",
  };
}

export const refrigerationOutageHoldoverExample = { inputs: { entered_heat_gain_btuh: 0, box_length_ft: 8, box_width_ft: 10, box_height_ft: 8, panel_u_btuh_per_sqft_degf: 0.04, ambient_degf: 90, box_degf: 38, infiltration_pct: 10, product_lb: 3000, product_cp_btu_per_lb_degf: 0.9, product_start_degf: 35, allowable_degf: 41, outage_hours: 72 } };
OUTAGE_RENDERERS["refrigeration-outage-holdover"] = _simpleRenderer({
  citation: "Citation: energy balance, holdover = product mass x cp x (allowable - start) / closed-door heat gain; dry ice at 246 Btu/lb heat of sublimation; FDA Food Code Section 3-501.16 cold holding at 41 degF; USDA FSIS power-outage guidance (50 lb of dry ice holds a full 18 cu ft freezer about 2 days) as the check. The local health department and the product's handling requirements govern.",
  example: refrigerationOutageHoldoverExample.inputs,
  fields: [
    { key: "entered_heat_gain_btuh", label: "Closed-door box heat gain if known (Btu/h; 0 to build it from the box below)" },
    { key: "box_length_ft", label: "Box length (ft)" },
    { key: "box_width_ft", label: "Box width (ft)" },
    { key: "box_height_ft", label: "Box height (ft)" },
    { key: "panel_u_btuh_per_sqft_degf", label: "Panel U-factor (Btu/h-sq ft-degF)" },
    { key: "ambient_degf", label: "Ambient temperature around the box (degF)", default: 90, attrs: _SIGNED },
    { key: "box_degf", label: "Box air temperature (degF)", default: 38, attrs: _SIGNED },
    { key: "infiltration_pct", label: "Closed-door infiltration allowance (%)", default: 10 },
    { key: "product_lb", label: "Product mass in the box (lb)" },
    { key: "product_cp_btu_per_lb_degf", label: "Product specific heat above freezing (Btu/lb-degF)" },
    { key: "product_start_degf", label: "Product starting temperature (degF)", default: 35, attrs: _SIGNED },
    { key: "allowable_degf", label: "Allowable product temperature (degF; Food Code 41)", default: 41, attrs: _SIGNED },
    { key: "outage_hours", label: "Expected outage duration (h)" },
  ],
  outputs: [
    { key: "q", id: "roh-out-q", label: "Closed-door heat gain", unit: "Btu/h", value: (r) => fmt(r.heat_gain_btuh, 0) + " Btu/h" + (r.use_entered ? " (entered)" : " (" + fmt(r.surface_sqft, 0) + " sq ft, " + fmt(r.transmission_btuh, 0) + " Btu/h transmission)") },
    { key: "e", id: "roh-out-e", label: "Product cooling reserve", unit: "Btu", value: (r) => fmt(r.reserve_btu, 0) + " Btu" },
    { key: "t", id: "roh-out-t", label: "Holdover with the door shut", unit: "h", value: (r) => fmt(r.holdover_hours, 1) + " h" },
    { key: "rate", id: "roh-out-rate", label: "Dry ice to cancel the leak", value: (r) => fmt(r.dry_ice_lb_per_hour, 1) + " lb/h (" + fmt(r.dry_ice_lb_per_day, 0) + " lb per day)" },
    { key: "ice", id: "roh-out-ice", label: "Dry ice for the entered outage", unit: "lb", value: (r) => fmt(r.outage_dry_ice_lb, 0) + " lb over " + fmt(r.outage_hours, 0) + " h -- " + r.outage_verdict },
    { key: "usda", id: "roh-out-usda", label: "USDA check figure", value: (r) => "50 lb for 48 h implies " + fmt(r.usda_check_leak_btuh, 0) + " Btu/h of leak in a full 18 cu ft freezer" },
    { key: "note", id: "roh-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeRefrigerationOutageHoldover,
});

// ===================== spec-v1925: water pipe freeze time =====================

// dims: in { pipe_od_in: L, pipe_id_in: L, pipe_lb_per_ft: M L^-1, pipe_cp_btu_per_lb_degf: L^2 T^-2, insulation_thickness_in: L, insulation_k: M L T^-3, surface_h_btuh_per_sqft_degf: M T^-3, water_start_degf: T, space_degf: T } out: { water_lb_per_ft: M L^-1, heat_capacity_btu_per_degf_ft: M L T^-2, ua_insulated_btuh_per_degf_ft: M L T^-3, ua_bare_btuh_per_degf_ft: M L T^-3, tau_insulated_hours: T, tau_bare_hours: T, onset_insulated_hours: T, freeze_stage_insulated_hours: T, solid_insulated_hours: T, onset_bare_hours: T, freeze_stage_bare_hours: T, solid_bare_hours: T, loss_reduction_pct: dimensionless, time_ratio: dimensionless }
export function computePipeFreezeTime({ pipe_od_in = 0, pipe_id_in = 0, pipe_lb_per_ft = 0, pipe_cp_btu_per_lb_degf = 0.092, insulation_thickness_in = 0, insulation_k = 0.25, surface_h_btuh_per_sqft_degf = 1.5, water_start_degf = 55, space_degf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_od_in > 0) || !(pipe_id_in > 0)) return { error: "The pipe outside and inside diameters must be positive." };
  if (!(pipe_id_in < pipe_od_in)) return { error: "The pipe inside diameter must be smaller than the outside diameter." };
  if (!(pipe_lb_per_ft >= 0) || !(pipe_cp_btu_per_lb_degf >= 0)) return { error: "Pipe weight and specific heat cannot be negative." };
  if (!(insulation_thickness_in >= 0)) return { error: "Insulation thickness cannot be negative." };
  if (!(insulation_k > 0)) return { error: "The insulation conductivity must be positive." };
  if (!(surface_h_btuh_per_sqft_degf > 0)) return { error: "The outside surface coefficient must be positive." };
  if (!(water_start_degf > FREEZE_DEGF)) return { error: "The starting water temperature must be above 32 degF." };
  // Per foot of pipe. Radii in feet; k from Btu-in/h-sq ft-degF to Btu/h-ft-degF.
  const r_pipe_ft = pipe_od_in / 2 / 12;
  const r_out_ft = (pipe_od_in / 2 + insulation_thickness_in) / 12;
  const water_lb_per_ft = Math.PI / 4 * (pipe_id_in / 12) ** 2 * WATER_LB_PER_FT3;
  const heat_capacity_btu_per_degf_ft = water_lb_per_ft * CP_WATER + pipe_lb_per_ft * pipe_cp_btu_per_lb_degf;
  const r_insulation = Math.log(r_out_ft / r_pipe_ft) / (2 * Math.PI * insulation_k / 12);
  const r_surface = 1 / (surface_h_btuh_per_sqft_degf * 2 * Math.PI * r_out_ft);
  const ua_insulated_btuh_per_degf_ft = 1 / (r_insulation + r_surface);
  const ua_bare_btuh_per_degf_ft = surface_h_btuh_per_sqft_degf * 2 * Math.PI * r_pipe_ft;
  const tau_insulated_hours = heat_capacity_btu_per_degf_ft / ua_insulated_btuh_per_degf_ft;
  const tau_bare_hours = heat_capacity_btu_per_degf_ft / ua_bare_btuh_per_degf_ft;
  const loss_reduction_pct = 100 * (1 - ua_insulated_btuh_per_degf_ft / ua_bare_btuh_per_degf_ft);
  const freezes = space_degf < FREEZE_DEGF;
  // At or above 32 degF the water never freezes: times are null, not Infinity.
  const onset = (tau) => freezes ? tau * Math.log((water_start_degf - space_degf) / (FREEZE_DEGF - space_degf)) : null;
  const stage = (ua) => freezes ? water_lb_per_ft * WATER_FUSION_BTU_PER_LB / (ua * (FREEZE_DEGF - space_degf)) : null;
  const onset_insulated_hours = onset(tau_insulated_hours);
  const freeze_stage_insulated_hours = stage(ua_insulated_btuh_per_degf_ft);
  const onset_bare_hours = onset(tau_bare_hours);
  const freeze_stage_bare_hours = stage(ua_bare_btuh_per_degf_ft);
  const solid_insulated_hours = freezes ? onset_insulated_hours + freeze_stage_insulated_hours : null;
  const solid_bare_hours = freezes ? onset_bare_hours + freeze_stage_bare_hours : null;
  // Both stages scale with 1 / UA, so the insulated-to-bare time ratio is the UA ratio.
  const time_ratio = ua_bare_btuh_per_degf_ft / ua_insulated_btuh_per_degf_ft;
  return {
    water_lb_per_ft, heat_capacity_btu_per_degf_ft, ua_insulated_btuh_per_degf_ft, ua_bare_btuh_per_degf_ft,
    tau_insulated_hours, tau_bare_hours, loss_reduction_pct, time_ratio, freezes,
    onset_insulated_hours, freeze_stage_insulated_hours, solid_insulated_hours,
    onset_bare_hours, freeze_stage_bare_hours, solid_bare_hours,
    freeze_verdict: freezes
      ? "the water reaches 32 degF and freezes; insulation delays it and does not prevent it"
      : "the space is at or above 32 degF -- still water in this pipe does not freeze",
    note: "A water pipe in an unheated wall or crawl space is a small mass of water losing heat through its insulation, in two stages. First the water cools to 32 degF, exponentially, at a rate set by its heat capacity against the loss through the insulation and the air film outside it. Then it freezes at 32 degF while losing heat at a steady rate, and that takes longer because water gives up 143.5 Btu per pound to turn to ice -- more than a hundred times what it gave up per degree on the way down. Insulation slows both stages and prevents neither: it buys time for the power to come back or for someone to drain the line. Keeping water moving -- a dripping faucet -- is what actually prevents a freeze, which is why emergency guidance recommends it. The onset of freezing and the time to freeze solid are reported as bounds, because a pipe can block or split anywhere in between depending on where the ice forms and how pressure builds behind it. It does not model moving water, heat from the structure or soil, wind, exterior-wall cavities that sit between indoor and outdoor temperature, supercooling, or where along a run ice forms first, and it does not size heat trace (heat-trace-sizing) or predict the building's temperature (building-outage-cooldown). Conductivities and surface coefficients are typical values. The plumber, the insulation manufacturer's data, and local emergency guidance govern.",
  };
}

export const pipeFreezeTimeExample = { inputs: { pipe_od_in: 0.875, pipe_id_in: 0.785, pipe_lb_per_ft: 0.455, pipe_cp_btu_per_lb_degf: 0.092, insulation_thickness_in: 0.5, insulation_k: 0.25, surface_h_btuh_per_sqft_degf: 1.5, water_start_degf: 55, space_degf: 0 } };
const _hrs = (h) => h === null ? "does not freeze" : fmt(h, 2) + " h";
OUTAGE_RENDERERS["pipe-freeze-time"] = _simpleRenderer({
  citation: "Citation: steady radial conduction through the insulation, R = ln(r_out / r_pipe) / (2 pi k), in series with an outside film 1 / (h x 2 pi r_out); lumped cool-down of the water and pipe wall to 32 degF; then freezing at the latent heat of fusion of water, 143.5 Btu/lb; the freeze-time approach per the ASHRAE Handbook -- Fundamentals chapter on insulation for mechanical systems. The plumber and the insulation manufacturer's conductivity data govern.",
  example: pipeFreezeTimeExample.inputs,
  fields: [
    { key: "pipe_od_in", label: "Pipe outside diameter (in)" },
    { key: "pipe_id_in", label: "Pipe inside diameter (in)" },
    { key: "pipe_lb_per_ft", label: "Pipe weight, empty (lb/ft)" },
    { key: "pipe_cp_btu_per_lb_degf", label: "Pipe specific heat (Btu/lb-degF; copper 0.092)", default: 0.092 },
    { key: "insulation_thickness_in", label: "Insulation thickness (in; 0 for bare)" },
    { key: "insulation_k", label: "Insulation conductivity k (Btu-in/h-sq ft-degF)", default: 0.25 },
    { key: "surface_h_btuh_per_sqft_degf", label: "Outside surface coefficient (Btu/h-sq ft-degF; still air about 1.5)", default: 1.5 },
    { key: "water_start_degf", label: "Starting water temperature (degF)", default: 55, attrs: _SIGNED },
    { key: "space_degf", label: "Temperature of the space around the pipe (degF)", default: 0, attrs: _SIGNED },
  ],
  outputs: [
    { key: "c", id: "pft-out-c", label: "Heat capacity per foot", value: (r) => fmt(r.heat_capacity_btu_per_degf_ft, 3) + " Btu/degF-ft (" + fmt(r.water_lb_per_ft, 3) + " lb water/ft)" },
    { key: "ua", id: "pft-out-ua", label: "Heat loss per foot per degree", value: (r) => "insulated " + fmt(r.ua_insulated_btuh_per_degf_ft, 3) + ", bare " + fmt(r.ua_bare_btuh_per_degf_ft, 3) + " Btu/h-degF-ft (" + fmt(r.loss_reduction_pct, 0) + "% less)" },
    { key: "ins", id: "pft-out-ins", label: "Insulated: to 32 degF / frozen solid", value: (r) => r.freezes ? _hrs(r.onset_insulated_hours) + " / " + _hrs(r.solid_insulated_hours) : r.freeze_verdict },
    { key: "bare", id: "pft-out-bare", label: "Bare: to 32 degF / frozen solid", value: (r) => r.freezes ? _hrs(r.onset_bare_hours) + " / " + _hrs(r.solid_bare_hours) : r.freeze_verdict },
    { key: "ratio", id: "pft-out-ratio", label: "What the insulation buys", value: (r) => "x" + fmt(r.time_ratio, 2) + " the time -- " + r.freeze_verdict },
    { key: "note", id: "pft-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computePipeFreezeTime,
});
