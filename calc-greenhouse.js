// Groups L and C: greenhouse and controlled-environment agriculture.
// spec-v1750..v1762 (scope-trade-expansion-3) cover the environment (natural
// vent area, fan-and-pad cooling, vapour pressure deficit, CO2 enrichment,
// thermal screen), the light (PPFD to daily light integral, fixture count,
// shade cloth, photoperiod blackout), and the crop's consumables (transpiration
// and water use, plug trays, substrate volume, leaching fraction).
//
// One module because the tiles are one house: the vent area, the pad, the
// screen and the shade cloth all trade against the same light and the same
// heat, and the transpiration that cools the air is the water the crop drank.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const G_FPS2 = 32.2;
const CU_IN_PER_CU_FT = 1728;
const CU_FT_PER_CU_YD = 27;
const SQ_FT_PER_SQ_M = 10.7639104;     // (1 / 0.3048)^2
const SEC_PER_HOUR = 3600;
const MICROMOL_PER_MOL = 1e6;
const LB_PER_GAL_WATER = 8.345;
const PINTS_PER_GAL = 8;
const LATENT_HEAT_BTU_PER_LB = 1050;   // vaporisation at greenhouse conditions
const SENSIBLE_CFM_FACTOR = 1.08;      // Btu/h per cfm per degF at standard air
const BTU_PER_WATT_HOUR = 3.412;
const BTU_PER_THERM = 100000;
const BTU_PER_TON_HOUR = 12000;
const CO2_LB_PER_CU_FT = 0.1138;
const RANKINE_OFFSET = 459.67;

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

// Tetens over water, which is what horticultural VPD tables are built on.
const _fToC = (f) => (f - 32) * 5 / 9;
const _saturationKpa = (temp_c) => 0.6108 * Math.exp(17.27 * temp_c / (temp_c + 237.3));

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

export const GREENHOUSE_RENDERERS = {};

// ========= spec-v1750: greenhouse natural ventilation vent area =========

// Two openings in series combine to LESS than either sum: the effective area is
// 1/sqrt(1/A1^2 + 1/A2^2), so equal roof and side vents give about 71% of one
// of them. Enlarging the roof vent alone while the side inlet stays fixed moves
// the answer very little, which is the commonest error in a vent schedule.

// dims: in { house_width_ft: L, house_length_ft: L, gutter_height_ft: L, ridge_height_ft: L, roof_vent_pct: dimensionless, side_vent_pct: dimensionless, design_temp_difference_f: T, discharge_coefficient: dimensionless, mild_temp_difference_f: T } out: { floor_area_sqft: L^2, roof_vent_area_sqft: L^2, side_vent_area_sqft: L^2, effective_area_sqft: L^2, airflow_cfm: L^3 T^-1, air_changes_per_minute: T^-1, mild_airflow_cfm: L^3 T^-1 }
export function computeGreenhouseVentArea({ house_width_ft = 0, house_length_ft = 0, gutter_height_ft = 0, ridge_height_ft = 0, roof_vent_pct = 0, side_vent_pct = 0, design_temp_difference_f = 0, discharge_coefficient = 0, mild_temp_difference_f = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(house_width_ft > 0) || !(house_length_ft > 0)) return { error: "House width and length must be positive." };
  if (!(gutter_height_ft > 0) || !(ridge_height_ft > gutter_height_ft)) return { error: "The ridge must be above the gutter; buoyancy ventilation needs a height difference." };
  if (!(roof_vent_pct > 0) || !(side_vent_pct > 0)) return { error: "Roof and side vent percentages must be positive." };
  if (!(design_temp_difference_f > 0) || !(mild_temp_difference_f > 0)) return { error: "Temperature differences must be positive." };
  if (!(discharge_coefficient > 0 && discharge_coefficient <= 1)) return { error: "The discharge coefficient must be above 0 and at most 1." };
  const floor_area_sqft = house_width_ft * house_length_ft;
  const roof_vent_area_sqft = floor_area_sqft * roof_vent_pct / 100;
  const side_vent_area_sqft = floor_area_sqft * side_vent_pct / 100;
  // Two openings in series, not in parallel.
  const effective_area_sqft = 1 / Math.sqrt(1 / (roof_vent_area_sqft * roof_vent_area_sqft) + 1 / (side_vent_area_sqft * side_vent_area_sqft));
  const stack_height_ft = ridge_height_ft - gutter_height_ft;
  const average_height_ft = (gutter_height_ft + ridge_height_ft) / 2;
  const house_volume_ft3 = floor_area_sqft * average_height_ft;
  // Buoyancy: Q = Cd A_eff sqrt(2 g dH dT / T_abs), with T_abs in Rankine.
  const absolute_temp_r = 80 + RANKINE_OFFSET;
  const airflowFor = (dt_f) => discharge_coefficient * effective_area_sqft *
    Math.sqrt(2 * G_FPS2 * stack_height_ft * dt_f / absolute_temp_r) * 60;
  const airflow_cfm = airflowFor(design_temp_difference_f);
  const mild_airflow_cfm = airflowFor(mild_temp_difference_f);
  return {
    floor_area_sqft, roof_vent_area_sqft, side_vent_area_sqft,
    total_vent_area_sqft: roof_vent_area_sqft + side_vent_area_sqft,
    effective_area_sqft,
    series_share_pct: 100 * effective_area_sqft / roof_vent_area_sqft,
    stack_height_ft, house_volume_ft3,
    airflow_cfm,
    air_changes_per_minute: airflow_cfm / house_volume_ft3,
    target_airflow_cfm: house_volume_ft3,
    target_share_pct: 100 * airflow_cfm / house_volume_ft3,
    mild_airflow_cfm,
    mild_share_pct: 100 * mild_airflow_cfm / airflow_cfm,
    mild_temp_share_pct: 100 * mild_temp_difference_f / design_temp_difference_f,
    note: "Two openings in SERIES do not add: the effective area is 1/sqrt(1/A1^2 + 1/A2^2), so equal roof and side vents give about 71% of one of them and enlarging the roof vent alone moves the answer very little. Airflow goes as the SQUARE ROOT of the temperature difference, so natural ventilation is weakest exactly when the margin is thinnest -- that is a property of the physics rather than a defect in the vents. Above about 2 mph the wind term takes over and this stack calculation becomes a FLOOR rather than a prediction; it is the right number to design to only because it is what the house is guaranteed on a still day. The greenhouse manufacturer's vent schedule and the crop's own requirements govern.",
  };
}

const ventExample = { house_width_ft: 30, house_length_ft: 96, gutter_height_ft: 12, ridge_height_ft: 18, roof_vent_pct: 18, side_vent_pct: 18, design_temp_difference_f: 5, discharge_coefficient: 0.6, mild_temp_difference_f: 1 };
GREENHOUSE_RENDERERS["greenhouse-vent-area"] = _simpleRenderer({
  citation: "Citation: buoyancy ventilation Q = Cd x A_eff x sqrt(2 g dH dT / T_absolute), with the effective area of two openings in series A_eff = 1/sqrt(1/A_roof^2 + 1/A_side^2). Roof and side vents at 15 to 20% of floor area each are the customary schedule, and one air change per minute the summer target. The greenhouse manufacturer's vent schedule and the crop's requirements govern.",
  example: ventExample,
  fields: [
    { key: "house_width_ft", label: "House width (ft)" },
    { key: "house_length_ft", label: "House length (ft)" },
    { key: "gutter_height_ft", label: "Gutter height (ft)" },
    { key: "ridge_height_ft", label: "Ridge height (ft)" },
    { key: "roof_vent_pct", label: "Roof vent area (% of floor)" },
    { key: "side_vent_pct", label: "Side vent area (% of floor)" },
    { key: "design_temp_difference_f", label: "Design inside-outside difference (deg F)" },
    { key: "discharge_coefficient", label: "Discharge coefficient", attrs: { step: "any", min: "0", max: "1" } },
    { key: "mild_temp_difference_f", label: "Mild-morning difference (deg F)" },
  ],
  outputs: [
    { key: "floor_area_sqft", id: "gva-floor", label: "Floor area", unit: "sq ft", value: (r) => fmt(r.floor_area_sqft, 0) + " sq ft" },
    { key: "roof_vent_area_sqft", id: "gva-vents", label: "Vent areas", value: (r) => fmt(r.roof_vent_area_sqft, 1) + " sq ft roof, " + fmt(r.side_vent_area_sqft, 1) + " sq ft side" },
    { key: "effective_area_sqft", id: "gva-eff", label: "Effective area in series", unit: "sq ft", value: (r) => fmt(r.effective_area_sqft, 1) + " sq ft -- " + fmt(r.series_share_pct, 0) + "% of one opening, not the sum of " + fmt(r.total_vent_area_sqft, 0) },
    { key: "airflow_cfm", id: "gva-flow", label: "Buoyancy airflow", unit: "cfm", value: (r) => fmt(r.airflow_cfm, 0) + " cfm over a " + fmt(r.stack_height_ft, 1) + " ft stack" },
    { key: "air_changes_per_minute", id: "gva-ach", label: "Air changes per minute", value: (r) => fmt(r.air_changes_per_minute, 2) + " per minute -- " + fmt(r.target_share_pct, 0) + "% of the one-per-minute summer target" },
    { key: "mild_airflow_cfm", id: "gva-mild", label: "On a mild morning", unit: "cfm", value: (r) => fmt(r.mild_airflow_cfm, 0) + " cfm -- " + fmt(r.mild_share_pct, 0) + "% of design, from a difference " + fmt(r.mild_temp_share_pct, 0) + "% of design" },
    { key: "note", id: "gva-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeGreenhouseVentArea,
});

// ======== spec-v1751: fan-and-pad evaporative cooling ========

// The crop is not a load on the cooling system; it is part of it. A well-watered
// crop returns about half the solar gain as latent heat, and emptying the house
// doubles the temperature rise from the pad end to the fan end.

// dims: in { floor_area_sqft: L^2, airflow_per_sqft_cfm: L T^-1, pad_face_velocity_fpm: L T^-1, pad_height_ft: L, outdoor_dry_bulb_f: T, outdoor_wet_bulb_f: T, pad_efficiency_pct: dimensionless, solar_gain_btuh_per_sqft: M T^-3, latent_fraction: dimensionless } out: { total_airflow_cfm: L^3 T^-1, pad_area_sqft: L^2, pad_length_ft: L, pad_outlet_temp_f: T, temp_rise_f: T, fan_end_temp_f: T, empty_house_rise_f: T }
export function computeFanPadEvaporativeCooling({ floor_area_sqft = 0, airflow_per_sqft_cfm = 0, pad_face_velocity_fpm = 0, pad_height_ft = 0, outdoor_dry_bulb_f = 0, outdoor_wet_bulb_f = 0, pad_efficiency_pct = 0, solar_gain_btuh_per_sqft = 0, latent_fraction = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(floor_area_sqft > 0) || !(airflow_per_sqft_cfm > 0)) return { error: "Floor area and airflow per square foot must be positive." };
  if (!(pad_face_velocity_fpm > 0) || !(pad_height_ft > 0)) return { error: "Pad face velocity and height must be positive." };
  if (!(outdoor_dry_bulb_f > outdoor_wet_bulb_f)) return { error: "The dry bulb must exceed the wet bulb; the pad cannot cool below the wet bulb." };
  if (!(pad_efficiency_pct > 0 && pad_efficiency_pct <= 100)) return { error: "Pad saturation efficiency must be above 0 and at most 100%." };
  if (!(solar_gain_btuh_per_sqft > 0)) return { error: "Solar gain must be positive." };
  if (!(latent_fraction >= 0 && latent_fraction < 1)) return { error: "The crop latent fraction must be at least 0 and below 1." };
  const total_airflow_cfm = floor_area_sqft * airflow_per_sqft_cfm;
  const pad_area_sqft = total_airflow_cfm / pad_face_velocity_fpm;
  const wet_bulb_depression_f = outdoor_dry_bulb_f - outdoor_wet_bulb_f;
  const pad_outlet_temp_f = outdoor_dry_bulb_f - (pad_efficiency_pct / 100) * wet_bulb_depression_f;
  const total_solar_btuh = solar_gain_btuh_per_sqft * floor_area_sqft;
  const riseFor = (sensible_btuh) => sensible_btuh / (SENSIBLE_CFM_FACTOR * total_airflow_cfm);
  const cropped_sensible_btuh = total_solar_btuh * (1 - latent_fraction);
  const temp_rise_f = riseFor(cropped_sensible_btuh);
  const empty_house_rise_f = riseFor(total_solar_btuh);
  return {
    total_airflow_cfm, pad_area_sqft,
    pad_length_ft: pad_area_sqft / pad_height_ft,
    wet_bulb_depression_f, pad_outlet_temp_f,
    pad_drop_f: outdoor_dry_bulb_f - pad_outlet_temp_f,
    total_solar_btuh, cropped_sensible_btuh,
    temp_rise_f,
    fan_end_temp_f: pad_outlet_temp_f + temp_rise_f,
    fan_end_below_outdoor_f: outdoor_dry_bulb_f - (pad_outlet_temp_f + temp_rise_f),
    empty_house_rise_f,
    empty_house_fan_end_f: pad_outlet_temp_f + empty_house_rise_f,
    empty_house_vs_outdoor_f: (pad_outlet_temp_f + empty_house_rise_f) - outdoor_dry_bulb_f,
    empty_house_rise_ratio: empty_house_rise_f / temp_rise_f,
    note: "The pad cannot cool below the outdoor WET BULB no matter how large it is, so the pad-end temperature is the best the system will ever do and the wet bulb is the climate's own limit on evaporative cooling. The crop does not get pad-end air, it gets a gradient: a uniform crop is being grown in two different climates from one end of the house to the other. And the crop is NOT a load on the cooling system -- it is part of it, because a well-watered crop returns about half the solar gain as latent heat. Empty the house and the rise roughly doubles. Pad manufacturer saturation data, the design wet bulb for the site, and the crop's own stage govern.",
  };
}

const fanPadExample = { floor_area_sqft: 2880, airflow_per_sqft_cfm: 8, pad_face_velocity_fpm: 250, pad_height_ft: 5, outdoor_dry_bulb_f: 95, outdoor_wet_bulb_f: 75, pad_efficiency_pct: 85, solar_gain_btuh_per_sqft: 188, latent_fraction: 0.5 };
GREENHOUSE_RENDERERS["fan-pad-evaporative-cooling"] = _simpleRenderer({
  citation: "Citation: pad outlet temperature = dry bulb - saturation efficiency x (dry bulb - wet bulb); pad area = airflow / face velocity, with 250 fpm the customary cellulose-pad figure and 8 cfm per square foot of floor the summer greenhouse rule; the pad-to-fan rise = sensible gain / (1.08 x airflow). Pad manufacturer saturation data and the design wet bulb for the site govern.",
  example: fanPadExample,
  fields: [
    { key: "floor_area_sqft", label: "Floor area (sq ft)" },
    { key: "airflow_per_sqft_cfm", label: "Airflow per square foot (cfm)" },
    { key: "pad_face_velocity_fpm", label: "Pad face velocity (fpm)" },
    { key: "pad_height_ft", label: "Pad height (ft)" },
    { key: "outdoor_dry_bulb_f", label: "Outdoor dry bulb (deg F)" },
    { key: "outdoor_wet_bulb_f", label: "Outdoor wet bulb (deg F)" },
    { key: "pad_efficiency_pct", label: "Pad saturation efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "solar_gain_btuh_per_sqft", label: "Solar gain through glazing (Btu/h per sq ft)" },
    { key: "latent_fraction", label: "Crop latent fraction", attrs: { step: "any", min: "0", max: "1" } },
  ],
  outputs: [
    { key: "total_airflow_cfm", id: "fpe-flow", label: "Total airflow", unit: "cfm", value: (r) => fmt(r.total_airflow_cfm, 0) + " cfm" },
    { key: "pad_area_sqft", id: "fpe-pad", label: "Pad face area", unit: "sq ft", value: (r) => fmt(r.pad_area_sqft, 1) + " sq ft -- " + fmt(r.pad_length_ft, 1) + " ft of pad at the entered height" },
    { key: "pad_outlet_temp_f", id: "fpe-out", label: "Air leaving the pad", unit: "deg F", value: (r) => fmt(r.pad_outlet_temp_f, 1) + " deg F, a " + fmt(r.pad_drop_f, 1) + " deg F drop; the wet bulb is the floor" },
    { key: "temp_rise_f", id: "fpe-rise", label: "Rise to the fan end", unit: "deg F", value: (r) => fmt(r.temp_rise_f, 1) + " deg F absorbing " + fmt(r.cropped_sensible_btuh, 0) + " Btu/h" },
    { key: "fan_end_temp_f", id: "fpe-fan", label: "Air at the fans", unit: "deg F", value: (r) => fmt(r.fan_end_temp_f, 1) + " deg F -- still " + fmt(r.fan_end_below_outdoor_f, 1) + " deg F below outside, across a " + fmt(r.temp_rise_f, 0) + " deg F gradient" },
    { key: "empty_house_rise_f", id: "fpe-empty", label: "With no crop transpiring", value: (r) => fmt(r.empty_house_rise_f, 1) + " deg F rise (" + fmt(r.empty_house_rise_ratio, 1) + "x), putting the fan end at " + fmt(r.empty_house_fan_end_f, 1) + " deg F" },
    { key: "note", id: "fpe-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeFanPadEvaporativeCooling,
});

// ========== spec-v1752: PPFD to daily light integral ==========

// Do not reach for the lux meter: the sunlight factor of about 0.20 micromol
// per footcandle is specific to sunlight's spectrum, and applied to an HPS
// fixture or a red-blue LED array it is simply wrong.

// dims: in { ppfd_umol_m2_s: dimensionless, photoperiod_hours: T, outdoor_dli: dimensionless, transmission_pct: dimensionless, target_dli: dimensionless } out: { dli: dimensionless, inside_dli: dimensionless, shortfall_dli: dimensionless, supplemental_ppfd_umol_m2_s: dimensionless }
export function computePpfdDailyLightIntegral({ ppfd_umol_m2_s = 0, photoperiod_hours = 0, outdoor_dli = 0, transmission_pct = 0, target_dli = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(ppfd_umol_m2_s > 0)) return { error: "PPFD must be positive." };
  if (!(photoperiod_hours > 0 && photoperiod_hours <= 24)) return { error: "The photoperiod must be above 0 and at most 24 hours." };
  if (!(outdoor_dli > 0)) return { error: "The outdoor daily light integral must be positive." };
  if (!(transmission_pct > 0 && transmission_pct <= 100)) return { error: "Transmission must be above 0 and at most 100%." };
  if (!(target_dli > 0)) return { error: "The crop's target daily light integral must be positive." };
  const dli = ppfd_umol_m2_s * photoperiod_hours * SEC_PER_HOUR / MICROMOL_PER_MOL;
  const inside_dli = outdoor_dli * transmission_pct / 100;
  const shortfall_dli = target_dli - inside_dli;
  const supplemental_ppfd_umol_m2_s = Math.max(0, shortfall_dli) * MICROMOL_PER_MOL / (photoperiod_hours * SEC_PER_HOUR);
  return {
    dli, inside_dli, shortfall_dli,
    meets_target: inside_dli >= target_dli,
    inside_share_of_target: inside_dli / target_dli,
    supplemental_ppfd_umol_m2_s,
    supplemental_share_of_entered_pct: 100 * supplemental_ppfd_umol_m2_s / ppfd_umol_m2_s,
    dli_vs_target_pct: 100 * dli / target_dli,
    note: "DO NOT reach for the lux or footcandle meter. Full sun is roughly 10,000 footcandles and about 2,000 micromol/m^2/s, making the sunlight factor near 0.20 micromol per footcandle -- and that factor is specific to SUNLIGHT'S spectrum. Applied to a high-pressure sodium fixture or a red-blue LED array it is simply wrong, because the meter weights green light the crop barely uses and discounts red light the crop uses most. A house that is short in December is usually over target in June, where shading rather than lighting is the intervention. The crop's own published DLI requirement and a quantum sensor govern.",
  };
}

const dliExample = { ppfd_umol_m2_s: 400, photoperiod_hours: 16, outdoor_dli: 6, transmission_pct: 65, target_dli: 20 };
GREENHOUSE_RENDERERS["ppfd-daily-light-integral"] = _simpleRenderer({
  citation: "Citation: DLI = PPFD x photoperiod x 3,600 / 1,000,000, in mol per square metre per day. Inside light = outdoor DLI x the glazing and screen transmission. A quantum (PAR) sensor is the correct instrument; a lux or footcandle meter is spectrum-weighted and cannot be converted for a horticultural fixture. The crop's own published DLI requirement governs.",
  example: dliExample,
  fields: [
    { key: "ppfd_umol_m2_s", label: "PPFD (micromol/m^2/s)" },
    { key: "photoperiod_hours", label: "Photoperiod (hours)", attrs: { step: "any", min: "0", max: "24" } },
    { key: "outdoor_dli", label: "Outdoor DLI (mol/m^2/day)" },
    { key: "transmission_pct", label: "Glazing and screen transmission (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "target_dli", label: "Crop target DLI (mol/m^2/day)" },
  ],
  outputs: [
    { key: "dli", id: "pdl-dli", label: "Daily light integral at the entered PPFD", value: (r) => fmt(r.dli, 2) + " mol/m^2/day -- " + fmt(r.dli_vs_target_pct, 0) + "% of the crop target" },
    { key: "inside_dli", id: "pdl-in", label: "From the outdoor figure, inside the glazing", value: (r) => fmt(r.inside_dli, 2) + " mol/m^2/day" },
    { key: "shortfall_dli", id: "pdl-short", label: "Against the crop target", value: (r) => (r.meets_target ? "OVER by " + fmt(-r.shortfall_dli, 2) + " mol/m^2/day -- " + fmt(r.inside_share_of_target, 2) + "x the target; shade rather than light" : "SHORT by " + fmt(r.shortfall_dli, 2) + " mol/m^2/day") },
    { key: "supplemental_ppfd_umol_m2_s", id: "pdl-supp", label: "Supplemental light to close it", value: (r) => fmt(r.supplemental_ppfd_umol_m2_s, 0) + " micromol/m^2/s over the entered photoperiod (" + fmt(r.supplemental_share_of_entered_pct, 0) + "% of the entered intensity)" },
    { key: "note", id: "pdl-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePpfdDailyLightIntegral,
});

// ======== spec-v1753: horticultural fixture count and energy ========

// The on-target fraction most plans never state is what decides the order
// quantity, and every connected watt arrives in the house as heat -- a credit
// in December and a cooling load in March.

// dims: in { growing_area_sqft: L^2, target_ppfd_umol_m2_s: dimensionless, fixture_ppf_umol_s: dimensionless, fixture_watts: M L^2 T^-3, on_target_fraction: dimensionless, photoperiod_hours: T, season_days: T, energy_rate_per_kwh: dimensionless } out: { growing_area_m2: L^2, photons_required_umol_s: dimensionless, fixture_count: dimensionless, connected_load_w: M L^2 T^-3, efficacy_umol_per_joule: dimensionless, season_kwh: M L^2 T^-2, heat_btuh: M L^2 T^-3 }
export function computeGrowLightFixtureCount({ growing_area_sqft = 0, target_ppfd_umol_m2_s = 0, fixture_ppf_umol_s = 0, fixture_watts = 0, on_target_fraction = 0, photoperiod_hours = 0, season_days = 0, energy_rate_per_kwh = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(growing_area_sqft > 0) || !(target_ppfd_umol_m2_s > 0)) return { error: "Growing area and target PPFD must be positive." };
  if (!(fixture_ppf_umol_s > 0) || !(fixture_watts > 0)) return { error: "Fixture PPF and input watts must be positive." };
  if (!(on_target_fraction > 0 && on_target_fraction <= 1)) return { error: "The on-target fraction must be above 0 and at most 1." };
  if (!(photoperiod_hours > 0 && photoperiod_hours <= 24)) return { error: "The photoperiod must be above 0 and at most 24 hours." };
  if (!(season_days > 0)) return { error: "The season length must be positive." };
  if (!(energy_rate_per_kwh >= 0)) return { error: "The energy rate cannot be negative." };
  const growing_area_m2 = growing_area_sqft / SQ_FT_PER_SQ_M;
  const photons_required_umol_s = target_ppfd_umol_m2_s * growing_area_m2;
  const effective_ppf_umol_s = fixture_ppf_umol_s * on_target_fraction;
  const exact_count = photons_required_umol_s / effective_ppf_umol_s;
  const fixture_count = Math.ceil(exact_count);
  const perfect_exact_count = photons_required_umol_s / fixture_ppf_umol_s;
  const connected_load_w = fixture_count * fixture_watts;
  const season_kwh = connected_load_w * photoperiod_hours * season_days / 1000;
  return {
    growing_area_m2, photons_required_umol_s, effective_ppf_umol_s,
    exact_count, fixture_count,
    perfect_exact_count, perfect_count: Math.ceil(perfect_exact_count),
    on_target_cost_fixtures: fixture_count - Math.ceil(perfect_exact_count),
    connected_load_w,
    watts_per_m2: connected_load_w / growing_area_m2,
    efficacy_umol_per_joule: fixture_ppf_umol_s / fixture_watts,
    season_kwh, season_cost: season_kwh * energy_rate_per_kwh,
    heat_btuh: connected_load_w * BTU_PER_WATT_HOUR,
    note: "The on-target fraction is a number most lighting plans never state and it decides the order quantity by itself. Every connected watt arrives in the house as heat: in December that is a credit against the heating load, and on a bright March afternoon with the same lights on a photoperiod timer it is a cooling load the vents must remove on top of the sun -- which is why lighting and ventilation are ONE control decision rather than two. Efficacy in micromol per joule is the figure that compares fixtures honestly; the manufacturer's PPF and photometric layout govern the real distribution.",
  };
}

const fixtureExample = { growing_area_sqft: 1000, target_ppfd_umol_m2_s: 200, fixture_ppf_umol_s: 1700, fixture_watts: 645, on_target_fraction: 0.9, photoperiod_hours: 16, season_days: 180, energy_rate_per_kwh: 0.12 };
GREENHOUSE_RENDERERS["grow-light-fixture-count"] = _simpleRenderer({
  citation: "Citation: photons required = target PPFD x growing area in square metres; fixtures = required / (fixture PPF x the on-target fraction), rounded up; efficacy = PPF / input watts in micromol per joule; and the connected load arrives in the house as heat at 3.412 Btu/h per watt. The manufacturer's PPF rating and a photometric layout govern the actual distribution.",
  example: fixtureExample,
  fields: [
    { key: "growing_area_sqft", label: "Growing area (sq ft)" },
    { key: "target_ppfd_umol_m2_s", label: "Target supplemental PPFD (micromol/m^2/s)" },
    { key: "fixture_ppf_umol_s", label: "Fixture PPF (micromol/s)" },
    { key: "fixture_watts", label: "Fixture input power (W)" },
    { key: "on_target_fraction", label: "On-target fraction", attrs: { step: "any", min: "0", max: "1" } },
    { key: "photoperiod_hours", label: "Photoperiod (hours)", attrs: { step: "any", min: "0", max: "24" } },
    { key: "season_days", label: "Season length (days)" },
    { key: "energy_rate_per_kwh", label: "Energy rate ($/kWh)" },
  ],
  outputs: [
    { key: "photons_required_umol_s", id: "glf-ph", label: "Photons required", value: (r) => fmt(r.photons_required_umol_s, 0) + " micromol/s over " + fmt(r.growing_area_m2, 1) + " m^2" },
    { key: "fixture_count", id: "glf-count", label: "Fixtures required", value: (r) => fmt(r.fixture_count, 0) + " (exactly " + fmt(r.exact_count, 2) + ")" },
    { key: "on_target_cost_fixtures", id: "glf-ontgt", label: "What the on-target fraction costs", value: (r) => fmt(r.on_target_cost_fixtures, 0) + " fixture(s) -- a perfect 1.00 would need " + fmt(r.perfect_count, 0) },
    { key: "connected_load_w", id: "glf-load", label: "Connected load", unit: "W", value: (r) => fmt(r.connected_load_w, 0) + " W, " + fmt(r.watts_per_m2, 1) + " W/m^2" },
    { key: "efficacy_umol_per_joule", id: "glf-eff", label: "Fixture efficacy", value: (r) => fmt(r.efficacy_umol_per_joule, 2) + " micromol per joule" },
    { key: "season_kwh", id: "glf-energy", label: "Seasonal energy", value: (r) => fmt(r.season_kwh, 0) + " kWh, $" + fmt(r.season_cost, 0) },
    { key: "heat_btuh", id: "glf-heat", label: "Heat added to the house", unit: "Btu/h", value: (r) => fmt(r.heat_btuh, 0) + " Btu/h -- a heating credit in December, a cooling load in March" },
    { key: "note", id: "glf-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeGrowLightFixtureCount,
});

// ============= spec-v1754: vapour pressure deficit =============

// The deficit the crop sees is set at the LEAF, and a room sensor cannot see
// leaf temperature. A leaf 3 degF above air raises the deficit by well over
// half with the air and the humidity completely unchanged.

// dims: in { air_temp_f: T, relative_humidity_pct: dimensionless, leaf_offset_f: T, alternative_leaf_offset_f: T, alternative_humidity_pct: dimensionless } out: { air_saturation_kpa: M L^-1 T^-2, leaf_saturation_kpa: M L^-1 T^-2, actual_vapor_pressure_kpa: M L^-1 T^-2, leaf_vpd_kpa: M L^-1 T^-2, air_vpd_kpa: M L^-1 T^-2 }
export function computeVaporPressureDeficit({ air_temp_f = 0, relative_humidity_pct = 0, leaf_offset_f = 0, alternative_leaf_offset_f = 0, alternative_humidity_pct = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(relative_humidity_pct > 0 && relative_humidity_pct <= 100)) return { error: "Relative humidity must be above 0 and at most 100%." };
  if (!(alternative_humidity_pct > 0 && alternative_humidity_pct <= 100)) return { error: "The alternative humidity must be above 0 and at most 100%." };
  const air_c = _fToC(air_temp_f);
  if (!(air_c > -40)) return { error: "The air temperature is outside the range this saturation relation covers." };
  const air_saturation_kpa = _saturationKpa(air_c);
  const actual_vapor_pressure_kpa = air_saturation_kpa * relative_humidity_pct / 100;
  const vpdAt = (offset_f, e_actual) => _saturationKpa(_fToC(air_temp_f + offset_f)) - e_actual;
  const leaf_saturation_kpa = _saturationKpa(_fToC(air_temp_f + leaf_offset_f));
  const leaf_vpd_kpa = leaf_saturation_kpa - actual_vapor_pressure_kpa;
  const air_vpd_kpa = air_saturation_kpa - actual_vapor_pressure_kpa;
  const alternative_leaf_vpd_kpa = vpdAt(alternative_leaf_offset_f, actual_vapor_pressure_kpa);
  const humid_actual_kpa = air_saturation_kpa * alternative_humidity_pct / 100;
  const humid_leaf_vpd_kpa = leaf_saturation_kpa - humid_actual_kpa;
  return {
    air_saturation_kpa, leaf_saturation_kpa, actual_vapor_pressure_kpa,
    leaf_vpd_kpa, air_vpd_kpa,
    air_over_leaf_ratio: air_vpd_kpa / leaf_vpd_kpa,
    air_over_leaf_pct: 100 * (air_vpd_kpa - leaf_vpd_kpa) / leaf_vpd_kpa,
    alternative_leaf_vpd_kpa,
    alternative_change_pct: 100 * (alternative_leaf_vpd_kpa - leaf_vpd_kpa) / leaf_vpd_kpa,
    humid_leaf_vpd_kpa,
    humidity_change_pct: 100 * (humid_leaf_vpd_kpa - leaf_vpd_kpa) / leaf_vpd_kpa,
    note: "The deficit the crop actually sees is set at the LEAF, and a room sensor cannot see leaf temperature -- an infrared leaf reading is a cheap instrument for a correction this size. Under strong light with the stomata closing, a leaf running a few degrees ABOVE air raises the deficit sharply with the air temperature and the humidity completely unchanged, which is the runaway that closes stomata on a bright afternoon in a house whose humidity reading looks fine. The humidity lever is weaker than it feels: a large change in relative humidity moves the leaf deficit less than a few degrees of leaf temperature does. Saturation pressure here is the Tetens relation over water; the crop's own published VPD band governs.",
  };
}

const vpdExample = { air_temp_f: 75, relative_humidity_pct: 65, leaf_offset_f: -2, alternative_leaf_offset_f: 3, alternative_humidity_pct: 80 };
GREENHOUSE_RENDERERS["vapor-pressure-deficit"] = _simpleRenderer({
  citation: "Citation: vapour pressure deficit = saturation pressure at the LEAF temperature minus the air's actual vapour pressure, with saturation from the Tetens relation es = 0.6108 exp(17.27 T / (T + 237.3)) in kPa for T in degrees Celsius. The air-based figure a room sensor reports is a different quantity. The crop's own published VPD band governs.",
  example: vpdExample,
  fields: [
    { key: "air_temp_f", label: "Air temperature (deg F)", attrs: { step: "any" } },
    { key: "relative_humidity_pct", label: "Relative humidity (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "leaf_offset_f", label: "Leaf minus air temperature (deg F)", attrs: { step: "any" } },
    { key: "alternative_leaf_offset_f", label: "Alternative leaf offset (deg F)", attrs: { step: "any" } },
    { key: "alternative_humidity_pct", label: "Alternative relative humidity (%)", attrs: { step: "any", min: "0", max: "100" } },
  ],
  outputs: [
    { key: "leaf_vpd_kpa", id: "vpd-leaf", label: "Leaf vapour pressure deficit", unit: "kPa", value: (r) => fmt(r.leaf_vpd_kpa, 4) + " kPa" },
    { key: "air_vpd_kpa", id: "vpd-air", label: "What a room sensor would report", unit: "kPa", value: (r) => fmt(r.air_vpd_kpa, 4) + " kPa -- " + fmt(r.air_over_leaf_ratio, 2) + "x the leaf figure, " + fmt(r.air_over_leaf_pct, 0) + "% high" },
    { key: "air_saturation_kpa", id: "vpd-sat", label: "Saturation pressures", value: (r) => fmt(r.air_saturation_kpa, 4) + " kPa at air, " + fmt(r.leaf_saturation_kpa, 4) + " kPa at leaf" },
    { key: "actual_vapor_pressure_kpa", id: "vpd-act", label: "Actual vapour pressure", unit: "kPa", value: (r) => fmt(r.actual_vapor_pressure_kpa, 4) + " kPa" },
    { key: "alternative_leaf_vpd_kpa", id: "vpd-alt", label: "At the alternative leaf offset", unit: "kPa", value: (r) => fmt(r.alternative_leaf_vpd_kpa, 4) + " kPa -- " + fmt(r.alternative_change_pct, 0) + "% change from a temperature the room sensor cannot see" },
    { key: "humid_leaf_vpd_kpa", id: "vpd-hum", label: "At the alternative humidity", unit: "kPa", value: (r) => fmt(r.humid_leaf_vpd_kpa, 4) + " kPa -- " + fmt(r.humidity_change_pct, 0) + "% change; the humidity lever is the weaker one" },
    { key: "note", id: "vpd-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeVaporPressureDeficit,
});

// =========== spec-v1755: CO2 enrichment rate and cost ===========

// Interlocking the injector to vent position is the whole control strategy: the
// same target costs the air change rate times as much once the vents crack, and
// the gas goes straight outside.

// dims: in { house_volume_ft3: L^3, ambient_ppm: dimensionless, target_ppm: dimensionless, air_changes_per_hour: T^-1, gas_price_per_lb: dimensionless, vented_air_changes_per_hour: T^-1, floor_area_sqft: L^2, enrichment_hours_per_day: T } out: { initial_charge_ft3: L^3, makeup_ft3_per_hour: L^3 T^-1, makeup_lb_per_hour: M T^-1, hourly_cost: dimensionless, vented_makeup_ft3_per_hour: L^3 T^-1, vented_hourly_cost: dimensionless }
export function computeCo2EnrichmentRate({ house_volume_ft3 = 0, ambient_ppm = 0, target_ppm = 0, air_changes_per_hour = 0, gas_price_per_lb = 0, vented_air_changes_per_hour = 0, floor_area_sqft = 0, enrichment_hours_per_day = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(house_volume_ft3 > 0)) return { error: "House volume must be positive." };
  if (!(ambient_ppm > 0) || !(target_ppm > ambient_ppm)) return { error: "The target concentration must exceed ambient." };
  if (!(air_changes_per_hour > 0) || !(vented_air_changes_per_hour > 0)) return { error: "Air change rates must be positive." };
  if (!(gas_price_per_lb >= 0)) return { error: "The gas price cannot be negative." };
  if (!(floor_area_sqft > 0)) return { error: "Floor area must be positive." };
  if (!(enrichment_hours_per_day > 0 && enrichment_hours_per_day <= 24)) return { error: "Enrichment hours must be above 0 and at most 24." };
  const lift_ppm = target_ppm - ambient_ppm;
  const initial_charge_ft3 = house_volume_ft3 * lift_ppm / 1e6;
  const makeupFor = (ach) => house_volume_ft3 * ach * lift_ppm / 1e6;
  const makeup_ft3_per_hour = makeupFor(air_changes_per_hour);
  const makeup_lb_per_hour = makeup_ft3_per_hour * CO2_LB_PER_CU_FT;
  const vented_makeup_ft3_per_hour = makeupFor(vented_air_changes_per_hour);
  const vented_lb_per_hour = vented_makeup_ft3_per_hour * CO2_LB_PER_CU_FT;
  return {
    lift_ppm, initial_charge_ft3,
    initial_charge_lb: initial_charge_ft3 * CO2_LB_PER_CU_FT,
    makeup_ft3_per_hour, makeup_lb_per_hour,
    hourly_cost: makeup_lb_per_hour * gas_price_per_lb,
    daily_cost: makeup_lb_per_hour * gas_price_per_lb * enrichment_hours_per_day,
    vented_makeup_ft3_per_hour, vented_lb_per_hour,
    vented_hourly_cost: vented_lb_per_hour * gas_price_per_lb,
    vented_cost_ratio: vented_air_changes_per_hour / air_changes_per_hour,
    lb_per_1000_sqft_per_hour: makeup_lb_per_hour / (floor_area_sqft / 1000),
    note: "The makeup rate is proportional to the air change rate, so a controller that keeps the injector open when the vents crack is paying that multiple to enrich the outdoors. INTERLOCKING THE INJECTOR TO VENT POSITION is the whole control strategy and it is worth more than any refinement of the setpoint. The closed-house rate per 1,000 square feet is the figure to carry, because supplier sizing tables are usually quoted in exactly those units. This assumes a well-mixed house at steady state; the crop's own uptake, the burner or tank supplier's data, and any combustion safety requirements govern.",
  };
}

const co2Example = { house_volume_ft3: 43200, ambient_ppm: 400, target_ppm: 1000, air_changes_per_hour: 1, gas_price_per_lb: 0.10, vented_air_changes_per_hour: 30, floor_area_sqft: 2880, enrichment_hours_per_day: 10 };
GREENHOUSE_RENDERERS["co2-enrichment-rate"] = _simpleRenderer({
  citation: "Citation: mass balance -- the initial charge = house volume x the concentration lift, and the makeup rate = volume x air changes per hour x the lift, at 0.1138 lb per cubic foot of carbon dioxide. Ambient is about 400 ppm and 1,000 to 1,500 ppm the customary enrichment target. The crop's uptake, the supplier's data, and any combustion safety requirements govern.",
  example: co2Example,
  fields: [
    { key: "house_volume_ft3", label: "House volume (cu ft)" },
    { key: "ambient_ppm", label: "Ambient CO2 (ppm)" },
    { key: "target_ppm", label: "Target CO2 (ppm)" },
    { key: "air_changes_per_hour", label: "Air changes per hour, closed" },
    { key: "gas_price_per_lb", label: "Gas price ($/lb)" },
    { key: "vented_air_changes_per_hour", label: "Air changes per hour, venting" },
    { key: "floor_area_sqft", label: "Floor area (sq ft)" },
    { key: "enrichment_hours_per_day", label: "Enrichment hours per day", attrs: { step: "any", min: "0", max: "24" } },
  ],
  outputs: [
    { key: "initial_charge_ft3", id: "cer-charge", label: "Initial charge", value: (r) => fmt(r.initial_charge_ft3, 1) + " cu ft (" + fmt(r.initial_charge_lb, 2) + " lb), a one-time fill" },
    { key: "makeup_ft3_per_hour", id: "cer-make", label: "Makeup, closed house", value: (r) => fmt(r.makeup_ft3_per_hour, 1) + " cu ft/h = " + fmt(r.makeup_lb_per_hour, 2) + " lb/h" },
    { key: "hourly_cost", id: "cer-cost", label: "Cost, closed house", value: (r) => "$" + fmt(r.hourly_cost, 2) + " per hour, $" + fmt(r.daily_cost, 2) + " over the entered day" },
    { key: "vented_makeup_ft3_per_hour", id: "cer-vent", label: "Makeup while venting", value: (r) => fmt(r.vented_makeup_ft3_per_hour, 0) + " cu ft/h = " + fmt(r.vented_lb_per_hour, 1) + " lb/h" },
    { key: "vented_hourly_cost", id: "cer-vcost", label: "Cost while venting", value: (r) => "$" + fmt(r.vented_hourly_cost, 2) + " per hour -- " + fmt(r.vented_cost_ratio, 0) + " times the closed rate, straight out of the vents" },
    { key: "lb_per_1000_sqft_per_hour", id: "cer-rate", label: "Closed-house rate", value: (r) => fmt(r.lb_per_1000_sqft_per_hour, 2) + " lb per 1,000 sq ft per hour -- the units supplier tables use" },
    { key: "note", id: "cer-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCo2EnrichmentRate,
});

// ========== spec-v1756: shade cloth transmission and heat ==========

// The label says 50 percent shade and the crop receives 32.5 percent of the
// outdoor light, because the glazing took its share first and the two fractions
// MULTIPLY. Two layers transmit a quarter, not none.

// dims: in { outdoor_dli: dimensionless, glazing_transmission_pct: dimensionless, shade_pct: dimensionless, target_dli: dimensionless, outdoor_peak_btuh_per_sqft: M T^-3, floor_area_sqft: L^2 } out: { system_transmission: dimensionless, inside_dli: dimensionless, two_layer_dli: dimensionless, required_shade_pct: dimensionless, solar_removed_btuh: M L^2 T^-3 }
export function computeShadeClothTransmission({ outdoor_dli = 0, glazing_transmission_pct = 0, shade_pct = 0, target_dli = 0, outdoor_peak_btuh_per_sqft = 0, floor_area_sqft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(outdoor_dli > 0)) return { error: "The outdoor daily light integral must be positive." };
  if (!(glazing_transmission_pct > 0 && glazing_transmission_pct <= 100)) return { error: "Glazing transmission must be above 0 and at most 100%." };
  if (!(shade_pct >= 0 && shade_pct < 100)) return { error: "The shade percentage must be at least 0 and below 100%." };
  if (!(target_dli > 0)) return { error: "The crop's target daily light integral must be positive." };
  if (!(outdoor_peak_btuh_per_sqft > 0) || !(floor_area_sqft > 0)) return { error: "Outdoor peak intensity and floor area must be positive." };
  const glazing = glazing_transmission_pct / 100;
  const cloth = 1 - shade_pct / 100;
  const system_transmission = glazing * cloth;
  const inside_dli = outdoor_dli * system_transmission;
  const two_layer_transmission = glazing * cloth * cloth;
  const two_layer_dli = outdoor_dli * two_layer_transmission;
  // The shade that would land exactly on the crop's target, if one exists.
  const required_transmission = target_dli / (outdoor_dli * glazing);
  const glazed_btuh_per_sqft = outdoor_peak_btuh_per_sqft * glazing;
  const shaded_btuh_per_sqft = glazed_btuh_per_sqft * cloth;
  const solar_removed_btuh = (glazed_btuh_per_sqft - shaded_btuh_per_sqft) * floor_area_sqft;
  return {
    shade_pct, system_transmission, system_transmission_pct: 100 * system_transmission,
    inside_dli,
    inside_vs_target: inside_dli - target_dli,
    meets_target: inside_dli >= target_dli,
    inside_share_of_target_pct: 100 * inside_dli / target_dli,
    two_layer_transmission, two_layer_dli,
    two_layer_share_of_target_pct: 100 * two_layer_dli / target_dli,
    required_transmission,
    required_shade_pct: required_transmission >= 1 ? 0 : 100 * (1 - required_transmission),
    target_reachable: required_transmission <= 1,
    glazed_btuh_per_sqft, shaded_btuh_per_sqft,
    solar_removed_btuh,
    solar_removed_tons: solar_removed_btuh / BTU_PER_TON_HOUR,
    note: "The label percentage is not what the crop receives: the glazing takes its share first and the two fractions MULTIPLY. Two layers compound the same way -- two 50% cloths transmit a quarter of what reaches them, where adding the percentages would have said none was left at all, and that is a propagation light level under what was meant to be a production crop. The heat side is the reason the cloth exists and it is real, but it is bought with exactly the light the crop lost. Cloth manufacturer transmission data measured on the installed fabric, and the crop's own DLI requirement, govern.",
  };
}

const shadeExample = { outdoor_dli: 45, glazing_transmission_pct: 65, shade_pct: 50, target_dli: 20, outdoor_peak_btuh_per_sqft: 290, floor_area_sqft: 2880 };
GREENHOUSE_RENDERERS["shade-cloth-transmission"] = _simpleRenderer({
  citation: "Citation: system transmission = glazing transmission x (1 - shade fraction), multiplied again per additional layer; inside DLI = outdoor DLI x system transmission; and the solar heat removed = (glazed - shaded) intensity x floor area. Cloth manufacturer transmission data measured on the installed fabric, and the crop's own DLI requirement, govern.",
  example: shadeExample,
  fields: [
    { key: "outdoor_dli", label: "Outdoor DLI (mol/m^2/day)" },
    { key: "glazing_transmission_pct", label: "Glazing transmission (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "shade_pct", label: "Shade cloth (%)", attrs: { step: "any", min: "0", max: "99" } },
    { key: "target_dli", label: "Crop target DLI (mol/m^2/day)" },
    { key: "outdoor_peak_btuh_per_sqft", label: "Outdoor peak solar (Btu/h per sq ft)" },
    { key: "floor_area_sqft", label: "Floor area (sq ft)" },
  ],
  outputs: [
    { key: "system_transmission", id: "sct-trans", label: "System transmission", value: (r) => fmt(r.system_transmission_pct, 1) + "% of outdoor light reaches the crop, not " + fmt(100 - r.shade_pct, 0) + "%" },
    { key: "inside_dli", id: "sct-dli", label: "DLI at the crop", value: (r) => fmt(r.inside_dli, 2) + " mol/m^2/day -- " + (r.meets_target ? "OVER target by " + fmt(r.inside_vs_target, 2) : "SHORT of target by " + fmt(-r.inside_vs_target, 2)) },
    { key: "required_shade_pct", id: "sct-req", label: "Shade that lands on the target", value: (r) => (r.target_reachable ? fmt(r.required_shade_pct, 1) + "% cloth" : "None -- the house is already below target unshaded") },
    { key: "two_layer_dli", id: "sct-two", label: "Under two layers", value: (r) => fmt(r.two_layer_dli, 2) + " mol/m^2/day, " + fmt(r.two_layer_share_of_target_pct, 0) + "% of target -- the fractions compound" },
    { key: "solar_removed_btuh", id: "sct-heat", label: "Solar heat the cloth removes", unit: "Btu/h", value: (r) => fmt(r.solar_removed_btuh, 0) + " Btu/h (" + fmt(r.solar_removed_tons, 1) + " tons), bought with the light the crop lost" },
    { key: "glazed_btuh_per_sqft", id: "sct-int", label: "Intensity through the envelope", value: (r) => fmt(r.glazed_btuh_per_sqft, 0) + " Btu/h/sq ft glazed, " + fmt(r.shaded_btuh_per_sqft, 0) + " under the cloth" },
    { key: "note", id: "sct-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeShadeClothTransmission,
});

// ======== spec-v1757: crop transpiration and water use ========

// Every pound transpired goes into the house air. A ventilated house blows it
// outside without anyone noticing; a sealed house has to remove it, which is
// why closed and indoor rooms fail on humidity before anything else.

// dims: in { floor_area_sqft: L^2, daily_solar_btu_per_sqft: M T^-2, latent_fraction: dimensionless, leaching_fraction: dimensionless, peak_solar_btuh_per_sqft: M T^-3, irrigation_hours_per_day: T } out: { transpiration_lb_per_day: M, transpiration_gal_per_day: L^3, gal_per_sqft_per_day: L, applied_gal_per_day: L^3, peak_gal_per_hour: L^3 T^-1, moisture_pints_per_day: L^3 }
export function computeGreenhouseTranspirationWater({ floor_area_sqft = 0, daily_solar_btu_per_sqft = 0, latent_fraction = 0, leaching_fraction = 0, peak_solar_btuh_per_sqft = 0, irrigation_hours_per_day = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(floor_area_sqft > 0)) return { error: "Floor area must be positive." };
  if (!(daily_solar_btu_per_sqft > 0) || !(peak_solar_btuh_per_sqft > 0)) return { error: "Daily and peak solar inputs must be positive." };
  if (!(latent_fraction > 0 && latent_fraction < 1)) return { error: "The latent fraction must be above 0 and below 1." };
  if (!(leaching_fraction >= 0 && leaching_fraction < 1)) return { error: "The leaching fraction must be at least 0 and below 1." };
  if (!(irrigation_hours_per_day > 0 && irrigation_hours_per_day <= 24)) return { error: "Irrigation hours must be above 0 and at most 24." };
  const daily_energy_btu = daily_solar_btu_per_sqft * floor_area_sqft;
  const transpiration_lb_per_day = daily_energy_btu * latent_fraction / LATENT_HEAT_BTU_PER_LB;
  const transpiration_gal_per_day = transpiration_lb_per_day / LB_PER_GAL_WATER;
  const applied_gal_per_day = transpiration_gal_per_day / (1 - leaching_fraction);
  const peak_lb_per_hour = peak_solar_btuh_per_sqft * latent_fraction * floor_area_sqft / LATENT_HEAT_BTU_PER_LB;
  const peak_gal_per_hour = peak_lb_per_hour / LB_PER_GAL_WATER;
  const average_gal_per_hour = transpiration_gal_per_day / irrigation_hours_per_day;
  return {
    daily_energy_btu, transpiration_lb_per_day, transpiration_gal_per_day,
    gal_per_sqft_per_day: transpiration_gal_per_day / floor_area_sqft,
    applied_gal_per_day,
    leached_gal_per_day: applied_gal_per_day - transpiration_gal_per_day,
    peak_lb_per_hour, peak_gal_per_hour, average_gal_per_hour,
    peak_to_average_ratio: peak_gal_per_hour / average_gal_per_hour,
    moisture_pints_per_day: transpiration_gal_per_day * PINTS_PER_GAL,
    note: "The energy route is a check on the water route and vice versa: 0.05 to 0.15 gallons per square foot per day is the band growers quote, and a result outside it means one of the inputs is wrong. Irrigation must deliver the PEAK hour, not the daily average divided by the day length -- a system sized on the average is short by exactly that factor when the crop needs it most. And every pound transpired enters the house air: a ventilated house blows it outside without anyone noticing, while a sealed house has to REMOVE it, which is a dehumidification load larger than most people size for and the reason closed and indoor growing rooms fail on humidity before they fail on anything else. The crop's own stage and the irrigation designer govern.",
  };
}

const transpirationExample = { floor_area_sqft: 2880, daily_solar_btu_per_sqft: 1500, latent_fraction: 0.5, leaching_fraction: 0.2, peak_solar_btuh_per_sqft: 188, irrigation_hours_per_day: 12 };
GREENHOUSE_RENDERERS["greenhouse-transpiration-water"] = _simpleRenderer({
  citation: "Citation: an energy balance -- transpiration = solar energy through the glazing x the crop's latent fraction / 1,050 Btu per pound of water; applied volume = transpiration / (1 - leaching fraction). A well-watered crop returns roughly half the solar gain as latent heat, and 0.05 to 0.15 gal per square foot per day is the band growers quote. The crop's own stage and the irrigation designer govern.",
  example: transpirationExample,
  fields: [
    { key: "floor_area_sqft", label: "Floor or canopy area (sq ft)" },
    { key: "daily_solar_btu_per_sqft", label: "Daily solar through glazing (Btu/sq ft/day)" },
    { key: "latent_fraction", label: "Crop latent fraction", attrs: { step: "any", min: "0", max: "1" } },
    { key: "leaching_fraction", label: "Leaching fraction", attrs: { step: "any", min: "0", max: "1" } },
    { key: "peak_solar_btuh_per_sqft", label: "Peak solar intensity (Btu/h per sq ft)" },
    { key: "irrigation_hours_per_day", label: "Irrigation hours per day", attrs: { step: "any", min: "0", max: "24" } },
  ],
  outputs: [
    { key: "transpiration_gal_per_day", id: "gtw-water", label: "Crop transpiration", value: (r) => fmt(r.transpiration_gal_per_day, 0) + " gal/day (" + fmt(r.transpiration_lb_per_day, 0) + " lb/day)" },
    { key: "gal_per_sqft_per_day", id: "gtw-per", label: "Per square foot", value: (r) => fmt(r.gal_per_sqft_per_day, 4) + " gal/sq ft/day -- check against the 0.05 to 0.15 band" },
    { key: "applied_gal_per_day", id: "gtw-applied", label: "Irrigation to apply", value: (r) => fmt(r.applied_gal_per_day, 0) + " gal/day including " + fmt(r.leached_gal_per_day, 0) + " gal of leachate" },
    { key: "peak_gal_per_hour", id: "gtw-peak", label: "Peak hour demand", value: (r) => fmt(r.peak_gal_per_hour, 1) + " gal/h against a " + fmt(r.average_gal_per_hour, 1) + " gal/h average -- " + fmt(r.peak_to_average_ratio, 1) + "x" },
    { key: "moisture_pints_per_day", id: "gtw-moist", label: "Moisture into the house air", value: (r) => fmt(r.moisture_pints_per_day, 0) + " pints a day -- a sealed house has to remove all of it" },
    { key: "note", id: "gtw-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeGreenhouseTranspirationWater,
});

// ========= spec-v1758: thermal screen energy saving and payback =========

// A greenhouse envelope is roughly twice its floor area, which is why the
// heating bill looks nothing like a building's. The number that does not appear
// in the payback is the light: open on a light level, not on a clock.

// dims: in { house_width_ft: L, house_length_ft: L, gutter_height_ft: L, ridge_height_ft: L, glazing_u_factor: M T^-3, screen_ua_reduction_pct: dimensionless, season_nights: T, night_hours: T, night_temp_difference_f: T, plant_efficiency_pct: dimensionless, fuel_price_per_therm: dimensionless, screen_cost_per_sqft: dimensionless } out: { envelope_sqft: L^2, base_ua: M L^2 T^-3, screened_ua: M L^2 T^-3, heat_saved_btu: M L^2 T^-2, therms_saved: M L^2 T^-2, annual_saving: dimensionless, payback_years: T }
export function computeThermalScreenEnergySaving({ house_width_ft = 0, house_length_ft = 0, gutter_height_ft = 0, ridge_height_ft = 0, glazing_u_factor = 0, screen_ua_reduction_pct = 0, season_nights = 0, night_hours = 0, night_temp_difference_f = 0, plant_efficiency_pct = 0, fuel_price_per_therm = 0, screen_cost_per_sqft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(house_width_ft > 0) || !(house_length_ft > 0)) return { error: "House width and length must be positive." };
  if (!(gutter_height_ft > 0) || !(ridge_height_ft > gutter_height_ft)) return { error: "The ridge must be above the gutter." };
  if (!(glazing_u_factor > 0)) return { error: "The glazing U-factor must be positive." };
  if (!(screen_ua_reduction_pct > 0 && screen_ua_reduction_pct < 100)) return { error: "The screen's UA reduction must be above 0 and below 100%." };
  if (!(season_nights > 0) || !(night_hours > 0 && night_hours <= 24)) return { error: "Season nights and night hours must be positive, with night hours at most 24." };
  if (!(night_temp_difference_f > 0)) return { error: "The average night temperature difference must be positive." };
  if (!(plant_efficiency_pct > 0 && plant_efficiency_pct <= 100)) return { error: "Heating plant efficiency must be above 0 and at most 100%." };
  // A payback needs a fuel price: at zero there is no saving to pay the
  // screen back with, and the answer is not a large number but no answer.
  if (!(fuel_price_per_therm > 0)) return { error: "The fuel price must be positive; with no fuel price there is no saving and no payback." };
  if (!(screen_cost_per_sqft >= 0)) return { error: "The installed screen cost cannot be negative." };
  const floor_area_sqft = house_width_ft * house_length_ft;
  const rise_ft = ridge_height_ft - gutter_height_ft;
  const half_width_ft = house_width_ft / 2;
  // A gable-roofed house: two ends, two sidewalls, two roof slopes.
  const gable_area_sqft = 2 * (house_width_ft * gutter_height_ft + 0.5 * house_width_ft * rise_ft);
  const sidewall_area_sqft = 2 * house_length_ft * gutter_height_ft;
  const roof_slope_ft = Math.sqrt(half_width_ft * half_width_ft + rise_ft * rise_ft);
  const roof_area_sqft = 2 * house_length_ft * roof_slope_ft;
  const envelope_sqft = gable_area_sqft + sidewall_area_sqft + roof_area_sqft;
  const base_ua = envelope_sqft * glazing_u_factor;
  const screened_ua = base_ua * (1 - screen_ua_reduction_pct / 100);
  const season_hours = season_nights * night_hours;
  const heat_saved_btu = (base_ua - screened_ua) * night_temp_difference_f * season_hours;
  const fuel_saved_btu = heat_saved_btu / (plant_efficiency_pct / 100);
  const therms_saved = fuel_saved_btu / BTU_PER_THERM;
  const annual_saving = therms_saved * fuel_price_per_therm;
  const screen_cost = floor_area_sqft * screen_cost_per_sqft;
  return {
    floor_area_sqft, gable_area_sqft, sidewall_area_sqft, roof_area_sqft, envelope_sqft,
    envelope_to_floor_ratio: envelope_sqft / floor_area_sqft,
    roof_share_pct: 100 * roof_area_sqft / envelope_sqft,
    base_ua, screened_ua, season_hours,
    heat_saved_btu, fuel_saved_btu, therms_saved,
    annual_saving, screen_cost,
    payback_years: screen_cost / annual_saving,
    note: "A greenhouse envelope is roughly twice its floor area, which is the reason the heating bill looks nothing like a building's, and the roof is about half of it. The number that does NOT appear in this payback is the light: holding the screen closed two extra hours on a December morning to protect the saving removes those hours from a daily light integral already below the crop target, and the crop pays for the fuel. Open on a LIGHT LEVEL, not on a clock. The screen manufacturer's published UA reduction on the installed configuration, and the site's own fuel and weather records, govern.",
  };
}

const screenExample = { house_width_ft: 30, house_length_ft: 96, gutter_height_ft: 12, ridge_height_ft: 18, glazing_u_factor: 1.2, screen_ua_reduction_pct: 35, season_nights: 180, night_hours: 12, night_temp_difference_f: 40, plant_efficiency_pct: 80, fuel_price_per_therm: 1.20, screen_cost_per_sqft: 4.00 };
GREENHOUSE_RENDERERS["thermal-screen-energy-saving"] = _simpleRenderer({
  citation: "Citation: UA = envelope area x glazing U-factor, with the screen's published UA reduction applied while deployed; seasonal heat saved = UA difference x the average night temperature difference x the season's night hours, divided by the heating plant efficiency to give fuel. The screen manufacturer's published UA reduction on the installed configuration, and the site's own fuel and weather records, govern.",
  example: screenExample,
  fields: [
    { key: "house_width_ft", label: "House width (ft)" },
    { key: "house_length_ft", label: "House length (ft)" },
    { key: "gutter_height_ft", label: "Gutter height (ft)" },
    { key: "ridge_height_ft", label: "Ridge height (ft)" },
    { key: "glazing_u_factor", label: "Glazing U-factor (Btu/h-sq ft-deg F)" },
    { key: "screen_ua_reduction_pct", label: "Screen UA reduction (%)", attrs: { step: "any", min: "0", max: "99" } },
    { key: "season_nights", label: "Heating-season nights" },
    { key: "night_hours", label: "Hours deployed per night", attrs: { step: "any", min: "0", max: "24" } },
    { key: "night_temp_difference_f", label: "Average night difference (deg F)" },
    { key: "plant_efficiency_pct", label: "Heating plant efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "fuel_price_per_therm", label: "Fuel price ($/therm)" },
    { key: "screen_cost_per_sqft", label: "Installed screen cost ($/sq ft of floor)" },
  ],
  outputs: [
    { key: "envelope_sqft", id: "tse-env", label: "Envelope area", unit: "sq ft", value: (r) => fmt(r.envelope_sqft, 0) + " sq ft -- " + fmt(r.envelope_to_floor_ratio, 2) + " times the floor, and the roof is " + fmt(r.roof_share_pct, 0) + "% of it" },
    { key: "base_ua", id: "tse-ua", label: "UA, screen open", value: (r) => fmt(r.base_ua, 0) + " Btu/h-deg F" },
    { key: "screened_ua", id: "tse-uas", label: "UA, screen deployed", value: (r) => fmt(r.screened_ua, 0) + " Btu/h-deg F" },
    { key: "heat_saved_btu", id: "tse-heat", label: "Seasonal heat saved", value: (r) => fmt(r.heat_saved_btu / 1e6, 1) + " million Btu at the house over " + fmt(r.season_hours, 0) + " deployed hours" },
    { key: "therms_saved", id: "tse-fuel", label: "Fuel saved", value: (r) => fmt(r.therms_saved, 0) + " therms" },
    { key: "annual_saving", id: "tse-save", label: "Annual saving", value: (r) => "$" + fmt(r.annual_saving, 0) + " against an installed $" + fmt(r.screen_cost, 0) },
    { key: "payback_years", id: "tse-pay", label: "Simple payback", unit: "years", value: (r) => fmt(r.payback_years, 2) + " years" },
    { key: "note", id: "tse-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeThermalScreenEnergySaving,
});

// =========== spec-v1759: plug tray count and seeding ===========

// Dividing the order by the cell count is short by the germination and cull
// losses together, and the shortage is found at transplant -- when a re-sow is
// weeks too late to ship with the crop.

// dims: in { plants_required: dimensionless, cells_per_tray: dimensionless, germination_pct: dimensionless, cull_pct: dimensionless, seeds_per_cell: dimensionless, tray_footprint_sqft: L^2 } out: { usable_per_tray: dimensionless, trays_to_sow: dimensionless, cells_sown: dimensionless, seed_required: dimensionless, finished_yield: dimensionless, bench_area_sqft: L^2, naive_trays: dimensionless }
export function computePlugTrayCellCount({ plants_required = 0, cells_per_tray = 0, germination_pct = 0, cull_pct = 0, seeds_per_cell = 0, tray_footprint_sqft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(plants_required > 0)) return { error: "The number of finished plants required must be positive." };
  if (!(cells_per_tray >= 1)) return { error: "Cells per tray must be at least 1." };
  if (!(germination_pct > 0 && germination_pct <= 100)) return { error: "The germination rate must be above 0 and at most 100%." };
  if (!(cull_pct >= 0 && cull_pct < 100)) return { error: "The cull rate must be at least 0 and below 100%." };
  if (!(seeds_per_cell >= 1)) return { error: "Seeds per cell must be at least 1." };
  if (!(tray_footprint_sqft > 0)) return { error: "The tray footprint must be positive." };
  const survival = (germination_pct / 100) * (1 - cull_pct / 100);
  const usable_per_tray = cells_per_tray * survival;
  const trays_to_sow = Math.ceil(plants_required / usable_per_tray);
  const cells_sown = trays_to_sow * cells_per_tray;
  const finished_yield = cells_sown * survival;
  const naive_trays = Math.ceil(plants_required / cells_per_tray);
  const naive_yield = naive_trays * cells_per_tray * survival;
  return {
    survival, cells_per_tray, usable_per_tray, trays_to_sow, cells_sown,
    seed_required: cells_sown * seeds_per_cell,
    finished_yield,
    surplus: finished_yield - plants_required,
    surplus_pct: 100 * (finished_yield - plants_required) / plants_required,
    bench_area_sqft: trays_to_sow * tray_footprint_sqft,
    naive_trays, naive_yield,
    naive_shortfall: plants_required - naive_yield,
    naive_shortfall_pct: 100 * (plants_required - naive_yield) / plants_required,
    trays_the_naive_count_misses: trays_to_sow - naive_trays,
    note: "Rounding up buys a deliberate surplus and it should be small -- large enough to absorb a bad flat, small enough that it is not a second crop to find bench space for. The naive count, the order divided by the cell count, is short by the germination and cull losses together, and the shortage is found at TRANSPLANT, when a re-sow is weeks too late to ship with the crop. The propagation bench area here is before aisles, and the transplanted crop needs several times that on a different bench on a different date, which is why propagation and finishing space are scheduled together. The seed lot's own tested germination governs.",
  };
}

const plugExample = { plants_required: 12000, cells_per_tray: 288, germination_pct: 92, cull_pct: 5, seeds_per_cell: 1, tray_footprint_sqft: 1.6 };
GREENHOUSE_RENDERERS["plug-tray-cell-count"] = _simpleRenderer({
  citation: "Citation: usable plants per tray = cells x germination rate x (1 - cull rate); trays = plants required / usable per tray, rounded up. The seed lot's own tested germination rate, and the grower's observed cull at transplant, govern; a published germination figure is a laboratory result under ideal conditions.",
  example: plugExample,
  fields: [
    { key: "plants_required", label: "Finished plants required", attrs: { step: "1", min: "1" } },
    { key: "cells_per_tray", label: "Cells per tray", attrs: { step: "1", min: "1" } },
    { key: "germination_pct", label: "Germination rate (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "cull_pct", label: "Cull rate at transplant (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "seeds_per_cell", label: "Seeds per cell", attrs: { step: "any", min: "1" } },
    { key: "tray_footprint_sqft", label: "Tray footprint (sq ft)" },
  ],
  outputs: [
    { key: "usable_per_tray", id: "ptc-use", label: "Usable plants per tray", value: (r) => fmt(r.usable_per_tray, 1) + " of " + fmt(r.cells_per_tray, 0) + " cells survive to finish" },
    { key: "trays_to_sow", id: "ptc-trays", label: "Trays to sow", value: (r) => fmt(r.trays_to_sow, 0) + " trays, " + fmt(r.cells_sown, 0) + " cells" },
    { key: "seed_required", id: "ptc-seed", label: "Seed required", value: (r) => fmt(r.seed_required, 0) + " seeds" },
    { key: "finished_yield", id: "ptc-yield", label: "Finished plants the sowing yields", value: (r) => fmt(r.finished_yield, 0) + " -- a cushion of " + fmt(r.surplus, 0) + " (" + fmt(r.surplus_pct, 1) + "%)" },
    { key: "naive_trays", id: "ptc-naive", label: "What order divided by cells would give", value: (r) => fmt(r.naive_trays, 0) + " trays, yielding " + fmt(r.naive_yield, 0) + " -- short by " + fmt(r.naive_shortfall, 0) + " plants (" + fmt(r.naive_shortfall_pct, 0) + "%)" },
    { key: "bench_area_sqft", id: "ptc-bench", label: "Propagation bench", unit: "sq ft", value: (r) => fmt(r.bench_area_sqft, 0) + " sq ft before aisles" },
    { key: "note", id: "ptc-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePlugTrayCellCount,
});

// ========= spec-v1760: substrate and container volume takeoff =========

// Two errors push in opposite directions -- the trade gallon that is not a
// gallon, and the compressed bale label that is not the loose yield -- and a
// yard that makes both may arrive at roughly the right number for entirely the
// wrong reasons, which is worse than either alone.

// dims: in { container_count: dimensionless, filled_volume_in3: L^3, allowance_pct: dimensionless, bale_label_ft3: L^3, bale_loose_yield_ft3: L^3, true_gallon_in3: L^3 } out: { loose_volume_ft3: L^3, loose_volume_yd3: L^3, ordered_volume_ft3: L^3, ordered_volume_yd3: L^3, bale_count: dimensionless, true_gallon_volume_yd3: L^3 }
export function computeSubstrateContainerVolume({ container_count = 0, filled_volume_in3 = 0, allowance_pct = 0, bale_label_ft3 = 0, bale_loose_yield_ft3 = 0, true_gallon_in3 = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(container_count > 0)) return { error: "The container count must be positive." };
  if (!(filled_volume_in3 > 0)) return { error: "The filled volume per container must be positive." };
  if (!(allowance_pct >= 0)) return { error: "The compaction and spill allowance cannot be negative." };
  if (!(bale_label_ft3 > 0) || !(bale_loose_yield_ft3 > 0)) return { error: "Bale label and loose yield volumes must be positive." };
  if (!(bale_loose_yield_ft3 <= bale_label_ft3)) return { error: "A bale's loose yield cannot exceed its compressed label volume." };
  if (!(true_gallon_in3 > 0)) return { error: "The true gallon volume must be positive." };
  const loose_volume_ft3 = container_count * filled_volume_in3 / CU_IN_PER_CU_FT;
  const ordered_volume_ft3 = loose_volume_ft3 * (1 + allowance_pct / 100);
  const bale_count = Math.ceil(ordered_volume_ft3 / bale_loose_yield_ft3);
  const label_bale_count = Math.ceil(ordered_volume_ft3 / bale_label_ft3);
  const true_gallon_volume_ft3 = container_count * true_gallon_in3 / CU_IN_PER_CU_FT * (1 + allowance_pct / 100);
  return {
    loose_volume_ft3,
    loose_volume_yd3: loose_volume_ft3 / CU_FT_PER_CU_YD,
    ordered_volume_ft3,
    ordered_volume_yd3: ordered_volume_ft3 / CU_FT_PER_CU_YD,
    order_yd3: Math.ceil(ordered_volume_ft3 / CU_FT_PER_CU_YD),
    bale_count, label_bale_count,
    bales_the_label_misses: bale_count - label_bale_count,
    true_gallon_volume_ft3,
    true_gallon_volume_yd3: true_gallon_volume_ft3 / CU_FT_PER_CU_YD,
    true_gallon_over_pct: 100 * (true_gallon_volume_ft3 - ordered_volume_ft3) / ordered_volume_ft3,
    true_gallon_excess_yd3: (true_gallon_volume_ft3 - ordered_volume_ft3) / CU_FT_PER_CU_YD,
    note: "A nursery 'trade gallon' is not a US gallon -- a #1 container holds roughly 160 cubic inches filled against a true gallon's 231 -- and a compressed bale's label describes the bale in the truck rather than the media on the bench. THE TWO ERRORS PUSH IN OPPOSITE DIRECTIONS, so a yard that makes both at once may arrive at roughly the right number for entirely the wrong reasons, which is worse than either alone because it hides on the next order. Filled volume varies with the container and how it is filled; the supplier's own loose-yield figure and a measured fill govern.",
  };
}

const substrateExample = { container_count: 5000, filled_volume_in3: 160, allowance_pct: 10, bale_label_ft3: 3.8, bale_loose_yield_ft3: 2.8, true_gallon_in3: 231 };
GREENHOUSE_RENDERERS["substrate-container-volume"] = _simpleRenderer({
  citation: "Citation: loose volume = containers x filled volume per container, converted at 1,728 cubic inches per cubic foot and 27 cubic feet per cubic yard, plus a compaction and spill allowance. A compressed bale's loose yield, not its label volume, is what fills containers. The supplier's own loose-yield figure and a measured container fill govern.",
  example: substrateExample,
  fields: [
    { key: "container_count", label: "Containers to fill", attrs: { step: "1", min: "1" } },
    { key: "filled_volume_in3", label: "Filled volume per container (cu in)" },
    { key: "allowance_pct", label: "Compaction and spill allowance (%)" },
    { key: "bale_label_ft3", label: "Bale label volume, compressed (cu ft)" },
    { key: "bale_loose_yield_ft3", label: "Bale loose yield (cu ft)" },
    { key: "true_gallon_in3", label: "True US gallon (cu in)" },
  ],
  outputs: [
    { key: "loose_volume_ft3", id: "scv-loose", label: "Loose volume", value: (r) => fmt(r.loose_volume_ft3, 1) + " cu ft = " + fmt(r.loose_volume_yd3, 2) + " cu yd" },
    { key: "ordered_volume_ft3", id: "scv-order", label: "With the allowance", value: (r) => fmt(r.ordered_volume_ft3, 1) + " cu ft = " + fmt(r.ordered_volume_yd3, 2) + " cu yd -- order " + fmt(r.order_yd3, 0) + " cu yd bulk" },
    { key: "bale_count", id: "scv-bales", label: "Compressed bales", value: (r) => fmt(r.bale_count, 0) + " bales at the loose yield" },
    { key: "label_bale_count", id: "scv-label", label: "What the label volume would order", value: (r) => fmt(r.label_bale_count, 0) + " bales -- " + fmt(r.bales_the_label_misses, 0) + " short, because the label describes the bale in the truck" },
    { key: "true_gallon_volume_yd3", id: "scv-gal", label: "The trade-gallon mistake", value: (r) => fmt(r.true_gallon_volume_yd3, 2) + " cu yd -- " + fmt(r.true_gallon_over_pct, 0) + "% over, " + fmt(r.true_gallon_excess_yd3, 1) + " cu yd with nowhere to go" },
    { key: "note", id: "scv-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeSubstrateContainerVolume,
});

// ========= spec-v1761: photoperiod blackout and night interruption =========

// The signal is free and the darkness is expensive, and that asymmetry is the
// whole economics of photoperiod control -- and also the warning, because a
// security light is enough to break a night by accident.

// dims: in { blackout_pull_hour: T, blackout_open_hour: T, critical_dark_hours: T, long_photoperiod_hours: T, short_photoperiod_hours: T, ppfd_umol_m2_s: dimensionless, interruption_hours: T, interruption_ppfd_umol_m2_s: dimensionless } out: { dark_hours: T, light_hours: T, long_dli: dimensionless, short_dli: dimensionless, dli_given_up: dimensionless, interruption_dli: dimensionless }
export function computePhotoperiodBlackoutSchedule({ blackout_pull_hour = 0, blackout_open_hour = 0, critical_dark_hours = 0, long_photoperiod_hours = 0, short_photoperiod_hours = 0, ppfd_umol_m2_s = 0, interruption_hours = 0, interruption_ppfd_umol_m2_s = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(blackout_pull_hour >= 0 && blackout_pull_hour < 24) || !(blackout_open_hour >= 0 && blackout_open_hour < 24)) {
    return { error: "Blackout pull and open hours must be between 0 and 24 on a 24 hour clock." };
  }
  if (blackout_pull_hour === blackout_open_hour) return { error: "The pull and open times cannot be the same hour; that is either no darkness or all of it." };
  if (!(critical_dark_hours > 0 && critical_dark_hours < 24)) return { error: "The critical dark period must be above 0 and below 24 hours." };
  if (!(long_photoperiod_hours > 0 && long_photoperiod_hours <= 24) || !(short_photoperiod_hours > 0 && short_photoperiod_hours <= 24)) {
    return { error: "Photoperiods must be above 0 and at most 24 hours." };
  }
  if (!(ppfd_umol_m2_s > 0) || !(interruption_ppfd_umol_m2_s > 0)) return { error: "Light intensities must be positive." };
  if (!(interruption_hours > 0 && interruption_hours < 24)) return { error: "The night interruption must be above 0 and below 24 hours." };
  // The blackout runs from the pull time forward to the open time, wrapping
  // midnight when the pull is later in the day than the open.
  const dark_hours = blackout_pull_hour > blackout_open_hour
    ? (24 - blackout_pull_hour) + blackout_open_hour
    : blackout_open_hour - blackout_pull_hour;
  const dliFor = (ppfd, hours) => ppfd * hours * SEC_PER_HOUR / MICROMOL_PER_MOL;
  const long_dli = dliFor(ppfd_umol_m2_s, long_photoperiod_hours);
  const short_dli = dliFor(ppfd_umol_m2_s, short_photoperiod_hours);
  const interruption_dli = dliFor(interruption_ppfd_umol_m2_s, interruption_hours);
  return {
    dark_hours, light_hours: 24 - dark_hours,
    critical_dark_hours,
    satisfies_critical: dark_hours >= critical_dark_hours,
    dark_margin_hours: dark_hours - critical_dark_hours,
    long_dli, short_dli,
    dli_given_up: long_dli - short_dli,
    dli_given_up_pct: 100 * (long_dli - short_dli) / long_dli,
    interruption_dli,
    interruption_share_of_long_pct: 100 * interruption_dli / long_dli,
    note: "The signal is free and the darkness is expensive: a night interruption at a very dim intensity contributes a fraction of a per cent of the crop's light budget while completely reversing the flowering response, and that asymmetry is the whole economics of photoperiod control. It is also the WARNING -- if a couple of micromol across a few hours is enough to break a night on purpose, then a security light, an exit sign, or the glow from the house next door is enough to break one by accident, and nothing in the crop's appearance will say so until it fails to flower. The crop's own published critical photoperiod and the cultivar's response group govern.",
  };
}

const photoperiodExample = { blackout_pull_hour: 17, blackout_open_hour: 8, critical_dark_hours: 13, long_photoperiod_hours: 16, short_photoperiod_hours: 11, ppfd_umol_m2_s: 400, interruption_hours: 4, interruption_ppfd_umol_m2_s: 2 };
GREENHOUSE_RENDERERS["photoperiod-blackout-schedule"] = _simpleRenderer({
  citation: "Citation: the uninterrupted dark period from the blackout pull and open times, checked against the crop's critical dark period, with the daily light integral at each photoperiod from DLI = PPFD x hours x 3,600 / 1,000,000. Short-day crops generally need 12 to 13 hours of uninterrupted darkness. The crop's own published critical photoperiod and the cultivar's response group govern.",
  example: photoperiodExample,
  fields: [
    { key: "blackout_pull_hour", label: "Blackout pulled at (0-23)", attrs: { step: "any", min: "0", max: "23" } },
    { key: "blackout_open_hour", label: "Blackout opened at (0-23)", attrs: { step: "any", min: "0", max: "23" } },
    { key: "critical_dark_hours", label: "Crop critical dark period (hours)" },
    { key: "long_photoperiod_hours", label: "Long photoperiod to compare (hours)", attrs: { step: "any", min: "0", max: "24" } },
    { key: "short_photoperiod_hours", label: "Short photoperiod to compare (hours)", attrs: { step: "any", min: "0", max: "24" } },
    { key: "ppfd_umol_m2_s", label: "PPFD during the photoperiod (micromol/m^2/s)" },
    { key: "interruption_hours", label: "Night interruption (hours)" },
    { key: "interruption_ppfd_umol_m2_s", label: "Night interruption PPFD (micromol/m^2/s)" },
  ],
  outputs: [
    { key: "dark_hours", id: "pbs-dark", label: "Uninterrupted darkness", unit: "hours", value: (r) => fmt(r.dark_hours, 1) + " h dark, " + fmt(r.light_hours, 1) + " h light" },
    { key: "satisfies_critical", id: "pbs-crit", label: "Against the critical period", value: (r) => (r.satisfies_critical ? "CLEARS it with " + fmt(r.dark_margin_hours, 1) + " h of margin" : "SHORT by " + fmt(-r.dark_margin_hours, 1) + " h; the crop will not get the signal") },
    { key: "long_dli", id: "pbs-long", label: "DLI at the long photoperiod", value: (r) => fmt(r.long_dli, 2) + " mol/m^2/day" },
    { key: "short_dli", id: "pbs-short", label: "DLI at the short photoperiod", value: (r) => fmt(r.short_dli, 2) + " mol/m^2/day" },
    { key: "dli_given_up", id: "pbs-cost", label: "Light given up for the signal", value: (r) => fmt(r.dli_given_up, 2) + " mol/m^2/day, " + fmt(r.dli_given_up_pct, 0) + "% -- paid in growth rate, not in fabric" },
    { key: "interruption_dli", id: "pbs-int", label: "A night interruption contributes", value: (r) => fmt(r.interruption_dli, 4) + " mol/m^2/day -- " + fmt(r.interruption_share_of_long_pct, 2) + "% of the budget, for a complete reversal of the response" },
    { key: "note", id: "pbs-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePhotoperiodBlackoutSchedule,
});

// ======== spec-v1762: leaching fraction and runoff conductivity ========

// The no-uptake bound is not a prediction and must never be used as a target.
// The gap between the bound and a measurement IS the crop's uptake, which is
// why this calculation's error term is its product.

// dims: in { volume_applied: L^3, volume_drained: L^3, feed_ec: dimensionless, measured_leachate_ec: dimensionless, alternative_leaching_fraction: dimensionless, target_leachate_ec: dimensionless } out: { leaching_fraction: dimensionless, bound_ec: dimensionless, alternative_bound_ec: dimensionless, implied_uptake_pct: dimensionless, required_leaching_fraction: dimensionless }
export function computeLeachingFractionRunoffEc({ volume_applied = 0, volume_drained = 0, feed_ec = 0, measured_leachate_ec = 0, alternative_leaching_fraction = 0, target_leachate_ec = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(volume_applied > 0)) return { error: "The volume applied must be positive." };
  if (!(volume_drained > 0)) return { error: "The volume drained must be positive; with no leachate there is no leaching fraction." };
  if (!(volume_drained < volume_applied)) return { error: "The volume drained must be less than the volume applied." };
  if (!(feed_ec > 0)) return { error: "The feed conductivity must be positive." };
  if (!(measured_leachate_ec > 0)) return { error: "The measured leachate conductivity must be positive." };
  if (!(alternative_leaching_fraction > 0 && alternative_leaching_fraction < 1)) return { error: "The alternative leaching fraction must be above 0 and below 1." };
  if (!(target_leachate_ec > 0)) return { error: "The target leachate conductivity must be positive." };
  const leaching_fraction = volume_drained / volume_applied;
  // The no-uptake upper bound: all the salt applied leaves in the leachate.
  const bound_ec = feed_ec / leaching_fraction;
  const alternative_bound_ec = feed_ec / alternative_leaching_fraction;
  const salt_out = measured_leachate_ec * leaching_fraction;
  const salt_in = feed_ec * volume_applied / volume_applied;
  const implied_uptake_pct = 100 * (1 - salt_out / salt_in);
  const required_leaching_fraction = feed_ec / target_leachate_ec;
  return {
    leaching_fraction, leaching_fraction_pct: 100 * leaching_fraction,
    bound_ec, alternative_bound_ec,
    bound_change_pct: 100 * (alternative_bound_ec - bound_ec) / bound_ec,
    salt_out, salt_in, implied_uptake_pct,
    measurement_below_bound: measured_leachate_ec < bound_ec,
    required_leaching_fraction,
    required_leaching_fraction_pct: 100 * required_leaching_fraction,
    target_reachable_on_bound: required_leaching_fraction < 1,
    note: "The bound is NOT a prediction -- it is what the leachate would reach if the crop absorbed no salt at all, and nothing grows there, which is the clue that it is far from the truth. The gap between the bound and a measurement IS the crop's uptake, which is why this calculation's error term is its product. Raising the leaching fraction moves the bound at the cost of twice the water and twice the fertiliser down the drain. And the bound must never be used as a target: holding a leachate reading on the bound alone would take a leaching fraction no one irrigates at and no one needs, because the crop is removing most of the salt. MANAGE TO THE MEASUREMENT, NOT TO THE BOUND. A pour-through or saturated-media procedure done consistently, and the crop's own published root-zone range, govern.",
  };
}

const leachingExample = { volume_applied: 1.0, volume_drained: 0.20, feed_ec: 2.0, measured_leachate_ec: 3.0, alternative_leaching_fraction: 0.40, target_leachate_ec: 3.0 };
GREENHOUSE_RENDERERS["leaching-fraction-runoff-ec"] = _simpleRenderer({
  citation: "Citation: leaching fraction = volume drained / volume applied; the no-uptake upper bound on leachate conductivity = feed EC / leaching fraction, which assumes the crop absorbs no salt. The implied uptake is the gap between that bound and a measurement. A pour-through or saturated-media extract done consistently, and the crop's own published root-zone EC range, govern.",
  example: leachingExample,
  fields: [
    { key: "volume_applied", label: "Volume applied per event" },
    { key: "volume_drained", label: "Volume collected as leachate" },
    { key: "feed_ec", label: "Feed solution EC (mS/cm)" },
    { key: "measured_leachate_ec", label: "Measured leachate EC (mS/cm)" },
    { key: "alternative_leaching_fraction", label: "Alternative leaching fraction", attrs: { step: "any", min: "0", max: "1" } },
    { key: "target_leachate_ec", label: "Target leachate EC (mS/cm)" },
  ],
  outputs: [
    { key: "leaching_fraction", id: "lfr-lf", label: "Leaching fraction", value: (r) => fmt(r.leaching_fraction_pct, 1) + "%" },
    { key: "bound_ec", id: "lfr-bound", label: "No-uptake upper bound", value: (r) => fmt(r.bound_ec, 2) + " mS/cm -- what the leachate would reach if the crop absorbed nothing" },
    { key: "implied_uptake_pct", id: "lfr-uptake", label: "Implied crop uptake", value: (r) => (r.measurement_below_bound ? fmt(r.implied_uptake_pct, 0) + "% of the applied salt, from the gap between the bound and the measurement" : "None -- the measurement is at or above the bound, so check the readings") },
    { key: "alternative_bound_ec", id: "lfr-alt", label: "At the alternative leaching fraction", value: (r) => fmt(r.alternative_bound_ec, 2) + " mS/cm bound (" + fmt(r.bound_change_pct, 0) + "%), for proportionally more water and fertiliser down the drain" },
    { key: "required_leaching_fraction", id: "lfr-req", label: "To hold the target on the bound alone", value: (r) => (r.target_reachable_on_bound ? fmt(r.required_leaching_fraction_pct, 0) + "% leaching fraction -- which is why the bound is not a target" : "Impossible; the target is below the feed EC itself") },
    { key: "note", id: "lfr-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeLeachingFractionRunoffEc,
});
