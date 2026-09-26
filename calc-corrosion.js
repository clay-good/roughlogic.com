// Groups E, A and G: cathodic protection and corrosion control.
// spec-v1763..v1775 (scope-trade-expansion-3) cover the impressed-current
// system (anode bed resistance, rectifier sizing, coke breeze backfill), the
// pipeline it protects (potential attenuation, coating breakdown, stray current
// bonds, AC induced voltage), the surveys that prove it (instant-off IR drop,
// the 100 mV polarisation criterion, close interval survey planning), tank
// bottoms, and corrosion itself (coupon weight loss, galvanic area ratio).
//
// Potentials follow the field convention: they are negative, and "more
// negative" means more protected. Every margin is reported as a magnitude with
// its direction stated in words, because a minus sign on a margin is exactly
// the thing a survey report misreads.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const IN_PER_FT = 12;
const SQIN_PER_SQFT = 144;
const FT_PER_MILE = 5280;
const SEC_PER_HOUR = 3600;
const HOURS_PER_YEAR = 8760;
// Dwight's resistance constant for rho in ohm-cm and lengths in feet.
const DWIGHT_K = 0.00521;
// The ASTM G1 weight-loss constant for mils per year with mass in mg, density
// in g/cm^3, area in square inches, and time in hours.
const MPY_K = 534;
const MILS_PER_IN = 1000;
const MM_PER_MIL = 0.0254;           // exactly
const SQ_M_PER_SQ_CM = 1e-4;

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

// Dwight's single vertical anode: R = K rho / L x [ln(8L/d) - 1].
const _dwightSingle = (rho_ohm_cm, length_ft, diameter_ft) =>
  DWIGHT_K * rho_ohm_cm / length_ft * (Math.log(8 * length_ft / diameter_ft) - 1);

// Sunde's line of N vertical anodes at spacing S, with the mutual interference
// term (2L/S) ln(0.656 N) that makes a bed worse than parallel resistors.
const _sundeBed = (rho_ohm_cm, length_ft, diameter_ft, count, spacing_ft) =>
  DWIGHT_K * rho_ohm_cm / (count * length_ft) *
  (Math.log(8 * length_ft / diameter_ft) - 1 + (2 * length_ft / spacing_ft) * Math.log(0.656 * count));

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

export const CORROSION_RENDERERS = {};

// ============ spec-v1763: impressed-current anode bed resistance ============

// A bed of N anodes is NOT N resistors in parallel: they compete for the same
// soil, and the interference term makes the bed markedly worse. Length sits
// outside the logarithm and diameter inside it, so drill deeper, do not auger
// wider.

// dims: in { soil_resistivity_ohm_cm: M L^3 T^-3 I^-2, column_length_ft: L, column_diameter_in: L, anode_count: dimensionless, spacing_ft: L, alternative_spacing_ft: L, alternative_length_ft: L, alternative_diameter_in: L } out: { single_anode_resistance_ohm: M L^2 T^-3 I^-2, bed_resistance_ohm: M L^2 T^-3 I^-2, parallel_resistance_ohm: M L^2 T^-3 I^-2, alternative_spacing_bed_ohm: M L^2 T^-3 I^-2, alternative_length_single_ohm: M L^2 T^-3 I^-2 }
export function computeAnodeBedResistance({ soil_resistivity_ohm_cm = 0, column_length_ft = 0, column_diameter_in = 0, anode_count = 0, spacing_ft = 0, alternative_spacing_ft = 0, alternative_length_ft = 0, alternative_diameter_in = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(soil_resistivity_ohm_cm > 0)) return { error: "Soil resistivity must be positive." };
  if (!(column_length_ft > 0) || !(alternative_length_ft > 0)) return { error: "Column lengths must be positive." };
  if (!(column_diameter_in > 0) || !(alternative_diameter_in > 0)) return { error: "Column diameters must be positive." };
  if (!(anode_count >= 2)) return { error: "A bed needs at least two anodes; a single anode is the single-anode figure." };
  if (!(spacing_ft > 0) || !(alternative_spacing_ft > 0)) return { error: "Anode spacings must be positive." };
  const diameter_ft = column_diameter_in / IN_PER_FT;
  if (!(8 * column_length_ft / diameter_ft > Math.E)) return { error: "The column is too short for its diameter; Dwight's relation needs a long slender column." };
  const single_anode_resistance_ohm = _dwightSingle(soil_resistivity_ohm_cm, column_length_ft, diameter_ft);
  const bed_resistance_ohm = _sundeBed(soil_resistivity_ohm_cm, column_length_ft, diameter_ft, anode_count, spacing_ft);
  const parallel_resistance_ohm = single_anode_resistance_ohm / anode_count;
  const alternative_spacing_bed_ohm = _sundeBed(soil_resistivity_ohm_cm, column_length_ft, diameter_ft, anode_count, alternative_spacing_ft);
  const alternative_length_single_ohm = _dwightSingle(soil_resistivity_ohm_cm, alternative_length_ft, diameter_ft);
  const alternative_diameter_single_ohm = _dwightSingle(soil_resistivity_ohm_cm, column_length_ft, alternative_diameter_in / IN_PER_FT);
  return {
    soil_resistivity_ohm_cm, anode_count, spacing_ft, alternative_spacing_ft, alternative_length_ft,
    column_length_ft, column_diameter_in, alternative_diameter_in,
    geometry_term: Math.log(8 * column_length_ft / diameter_ft) - 1,
    interference_term: (2 * column_length_ft / spacing_ft) * Math.log(0.656 * anode_count),
    single_anode_resistance_ohm, bed_resistance_ohm, parallel_resistance_ohm,
    interference_penalty_pct: 100 * (bed_resistance_ohm - parallel_resistance_ohm) / parallel_resistance_ohm,
    alternative_spacing_bed_ohm,
    alternative_spacing_change_pct: 100 * (alternative_spacing_bed_ohm - bed_resistance_ohm) / bed_resistance_ohm,
    alternative_length_single_ohm,
    alternative_length_change_pct: 100 * (alternative_length_single_ohm - single_anode_resistance_ohm) / single_anode_resistance_ohm,
    alternative_diameter_single_ohm,
    alternative_diameter_change_pct: 100 * (alternative_diameter_single_ohm - single_anode_resistance_ohm) / single_anode_resistance_ohm,
    note: "A bed is NOT its anodes in parallel: they compete for the same soil, and a rectifier sized on the parallel figure is short of the voltage it needs to push the design current. Widening the spacing recovers part of the interference at the cost of right-of-way. Length beats diameter and it is not close -- length sits outside the logarithm and diameter inside it, so DRILL DEEPER, DO NOT AUGER WIDER. Dwight's and Sunde's relations assume uniform soil; a layered profile, measured by a Wenner survey at the bed's own depth, governs.",
  };
}

const anodeBedExample = { soil_resistivity_ohm_cm: 5000, column_length_ft: 10, column_diameter_in: 8, anode_count: 10, spacing_ft: 15, alternative_spacing_ft: 30, alternative_length_ft: 20, alternative_diameter_in: 6 };
CORROSION_RENDERERS["anode-bed-resistance"] = _simpleRenderer({
  citation: "Citation: Dwight's single vertical anode R = 0.00521 rho / L x [ln(8L/d) - 1] and Sunde's multiple-anode bed R_N = 0.00521 rho / (N L) x [ln(8L/d) - 1 + (2L/S) ln(0.656 N)], with rho in ohm-cm and lengths in feet. Uniform soil is assumed; a Wenner resistivity survey at the bed's depth and the CP designer govern.",
  example: anodeBedExample,
  fields: [
    { key: "soil_resistivity_ohm_cm", label: "Soil resistivity (ohm-cm)" },
    { key: "column_length_ft", label: "Anode or backfill column length (ft)" },
    { key: "column_diameter_in", label: "Column diameter (in)" },
    { key: "anode_count", label: "Number of anodes", attrs: { step: "1", min: "2" } },
    { key: "spacing_ft", label: "Centre-to-centre spacing (ft)" },
    { key: "alternative_spacing_ft", label: "Alternative spacing (ft)" },
    { key: "alternative_length_ft", label: "Alternative column length (ft)" },
    { key: "alternative_diameter_in", label: "Alternative column diameter (in)" },
  ],
  outputs: [
    { key: "single_anode_resistance_ohm", id: "abr-single", label: "One anode to earth", unit: "ohms", value: (r) => fmt(r.single_anode_resistance_ohm, 2) + " ohms" },
    { key: "bed_resistance_ohm", id: "abr-bed", label: "The bed", unit: "ohms", value: (r) => fmt(r.bed_resistance_ohm, 3) + " ohms for " + fmt(r.anode_count, 0) + " anodes at " + fmt(r.spacing_ft, 0) + " ft" },
    { key: "parallel_resistance_ohm", id: "abr-par", label: "Naive parallel figure", unit: "ohms", value: (r) => fmt(r.parallel_resistance_ohm, 3) + " ohms -- the bed is " + fmt(r.interference_penalty_pct, 0) + "% higher, all of it interference" },
    { key: "alternative_spacing_bed_ohm", id: "abr-space", label: "At the alternative spacing", unit: "ohms", value: (r) => fmt(r.alternative_spacing_bed_ohm, 3) + " ohms at " + fmt(r.alternative_spacing_ft, 0) + " ft (" + fmt(r.alternative_spacing_change_pct, 0) + "%)" },
    { key: "alternative_length_single_ohm", id: "abr-len", label: "One anode, longer column", unit: "ohms", value: (r) => fmt(r.alternative_length_single_ohm, 2) + " ohms at " + fmt(r.alternative_length_ft, 0) + " ft (" + fmt(r.alternative_length_change_pct, 0) + "%)" },
    { key: "alternative_diameter_single_ohm", id: "abr-dia", label: "One anode, other diameter", unit: "ohms", value: (r) => fmt(r.alternative_diameter_single_ohm, 2) + " ohms at " + fmt(r.alternative_diameter_in, 0) + " in (" + fmt(r.alternative_diameter_change_pct, 0) + "%) -- diameter sits inside the logarithm" },
    { key: "note", id: "abr-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeAnodeBedResistance,
});

// ============== spec-v1764: CP rectifier voltage and energy ==============

// The cable is not a rounding error, and the AC bill is paid continuously
// forever -- a cathodic protection system switched off is not one. Every ohm
// removed from the circuit comes straight off the voltage and the bill.

// dims: in { design_current_a: I, bed_resistance_ohm: M L^2 T^-3 I^-2, header_length_ft: L, negative_length_ft: L, cable_ohm_per_kft: M L T^-3 I^-2, back_emf_v: M L^2 T^-3 I^-1, design_margin_pct: dimensionless, rectifier_efficiency_pct: dimensionless, energy_rate_per_kwh: dimensionless } out: { cable_resistance_ohm: M L^2 T^-3 I^-2, total_resistance_ohm: M L^2 T^-3 I^-2, required_voltage_v: M L^2 T^-3 I^-1, design_voltage_v: M L^2 T^-3 I^-1, dc_output_w: M L^2 T^-3, ac_input_w: M L^2 T^-3, annual_kwh: M L^2 T^-2 }
export function computeCpRectifierSizing({ design_current_a = 0, bed_resistance_ohm = 0, header_length_ft = 0, negative_length_ft = 0, cable_ohm_per_kft = 0, back_emf_v = 0, design_margin_pct = 0, rectifier_efficiency_pct = 0, energy_rate_per_kwh = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  // An efficiency is a percent; 0 < value < 1 is a fraction typed into a percent field (added 2026-09-26).
  if (["rectifier_efficiency_pct"].some((k) => { const v = Number(arguments[0]?.[k]); return v > 0 && v < 1; })) return { error: "Enter efficiencies as a percent (85 for 85%), not a fraction." };
  if (!(design_current_a > 0)) return { error: "The design current must be positive." };
  if (!(bed_resistance_ohm > 0)) return { error: "The anode bed resistance must be positive." };
  if (!(header_length_ft >= 0) || !(negative_length_ft >= 0)) return { error: "Cable lengths cannot be negative." };
  if (!(cable_ohm_per_kft > 0)) return { error: "The cable resistance per 1,000 ft must be positive." };
  if (!(back_emf_v >= 0)) return { error: "The back EMF allowance cannot be negative." };
  if (!(design_margin_pct >= 0)) return { error: "The design margin cannot be negative." };
  if (!(rectifier_efficiency_pct > 0 && rectifier_efficiency_pct <= 100)) return { error: "Rectifier efficiency must be above 0 and at most 100%." };
  if (!(energy_rate_per_kwh >= 0)) return { error: "The energy rate cannot be negative." };
  const cable_resistance_ohm = (header_length_ft + negative_length_ft) * cable_ohm_per_kft / 1000;
  const total_resistance_ohm = bed_resistance_ohm + cable_resistance_ohm;
  const required_voltage_v = design_current_a * total_resistance_ohm + back_emf_v;
  const design_voltage_v = required_voltage_v * (1 + design_margin_pct / 100);
  const cable_drop_v = design_current_a * cable_resistance_ohm;
  const voltage_without_cable_v = design_current_a * bed_resistance_ohm + back_emf_v;
  const dc_output_w = required_voltage_v * design_current_a;
  const ac_input_w = dc_output_w / (rectifier_efficiency_pct / 100);
  const annual_kwh = ac_input_w * HOURS_PER_YEAR / 1000;
  return {
    design_current_a, back_emf_v, design_margin_pct, rectifier_efficiency_pct,
    cable_resistance_ohm, total_resistance_ohm,
    required_voltage_v, design_voltage_v,
    cable_drop_v,
    cable_share_pct: 100 * cable_drop_v / required_voltage_v,
    voltage_without_cable_v,
    dc_output_w, ac_input_w, annual_kwh,
    annual_cost: annual_kwh * energy_rate_per_kwh,
    note: "The cable is not a rounding error -- it is a term many desk calculations leave out, and on a long header or a resistive bed it is the difference between a unit that works and one that does not. The AC bill is larger than the DC work and it is paid continuously forever, because a CP system that is switched off is not a CP system; every ohm removed from the circuit comes straight off the voltage and therefore off the bill. And the bill is going to RISE, because the current demand grows as the coating degrades -- a rectifier chosen with no headroom has nowhere to go. Select a standard rectifier above the design voltage and tap it down on commissioning; NACE SP0169, the manufacturer's rating, and the CP designer govern.",
  };
}

const rectifierExample = { design_current_a: 10, bed_resistance_ohm: 1.640, header_length_ft: 500, negative_length_ft: 300, cable_ohm_per_kft: 0.2485, back_emf_v: 2, design_margin_pct: 50, rectifier_efficiency_pct: 60, energy_rate_per_kwh: 0.12 };
CORROSION_RENDERERS["cp-rectifier-sizing"] = _simpleRenderer({
  citation: "Citation: Ohm's law around the impressed-current circuit -- required DC voltage = design current x (bed resistance + header and negative cable resistance) + the back EMF allowance, with a design margin on top and AC input = DC output / rectifier efficiency. NACE SP0169 (now AMPP), the rectifier manufacturer's rating, and the CP designer govern.",
  example: rectifierExample,
  fields: [
    { key: "design_current_a", label: "Design current (A)" },
    { key: "bed_resistance_ohm", label: "Anode bed resistance (ohms)" },
    { key: "header_length_ft", label: "Header cable length (ft)" },
    { key: "negative_length_ft", label: "Negative cable length (ft)" },
    { key: "cable_ohm_per_kft", label: "Cable resistance (ohms per 1,000 ft)" },
    { key: "back_emf_v", label: "Back EMF allowance (V)" },
    { key: "design_margin_pct", label: "Design margin (%)" },
    { key: "rectifier_efficiency_pct", label: "Rectifier efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "energy_rate_per_kwh", label: "Energy rate ($/kWh)" },
  ],
  outputs: [
    { key: "total_resistance_ohm", id: "crs-res", label: "Circuit resistance", unit: "ohms", value: (r) => fmt(r.total_resistance_ohm, 4) + " ohms, of which " + fmt(r.cable_resistance_ohm, 4) + " is cable" },
    { key: "required_voltage_v", id: "crs-v", label: "Required DC voltage", unit: "V", value: (r) => fmt(r.required_voltage_v, 2) + " V at " + fmt(r.design_current_a, 1) + " A" },
    { key: "design_voltage_v", id: "crs-dv", label: "With the design margin", unit: "V", value: (r) => fmt(r.design_voltage_v, 1) + " V -- select the next standard rectifier above and tap down on commissioning" },
    { key: "cable_drop_v", id: "crs-cable", label: "What the cable costs", unit: "V", value: (r) => fmt(r.cable_drop_v, 2) + " V, " + fmt(r.cable_share_pct, 0) + "% of the output; without it the unit would be specified at " + fmt(r.voltage_without_cable_v, 1) + " V" },
    { key: "dc_output_w", id: "crs-dc", label: "DC output", unit: "W", value: (r) => fmt(r.dc_output_w, 0) + " W" },
    { key: "ac_input_w", id: "crs-ac", label: "AC input", unit: "W", value: (r) => fmt(r.ac_input_w, 0) + " W at " + fmt(r.rectifier_efficiency_pct, 0) + "% efficiency" },
    { key: "annual_kwh", id: "crs-yr", label: "Every year, continuously", value: (r) => fmt(r.annual_kwh, 0) + " kWh, $" + fmt(r.annual_cost, 0) },
    { key: "note", id: "crs-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCpRectifierSizing,
});

// ============ spec-v1765: pipeline CP potential attenuation ============

// The coating's condition is visible at the FAR END, not at the rectifier. A
// tenfold coating degradation raises the attenuation constant only by its
// square root -- the one forgiving feature of the relation -- but the reach
// still collapses by that same factor.

// dims: in { pipe_od_in: L, wall_thickness_in: L, steel_resistivity_ohm_in: M L^3 T^-3 I^-2, coating_resistance_ohm_sqft: M L^4 T^-3 I^-2, drain_shift_v: M L^2 T^-3 I^-1, distance_mi: L, degraded_coating_resistance_ohm_sqft: M L^4 T^-3 I^-2 } out: { longitudinal_ohm_per_ft: M L T^-3 I^-2, leakage_ohm_ft: M L^3 T^-3 I^-2, attenuation_per_ft: L^-1, characteristic_resistance_ohm: M L^2 T^-3 I^-2, shift_at_distance_v: M L^2 T^-3 I^-1, half_shift_mi: L }
export function computePipelinePotentialAttenuation({ pipe_od_in = 0, wall_thickness_in = 0, steel_resistivity_ohm_in = 0, coating_resistance_ohm_sqft = 0, drain_shift_v = 0, distance_mi = 0, degraded_coating_resistance_ohm_sqft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(pipe_od_in > 0)) return { error: "The pipe outside diameter must be positive." };
  if (!(wall_thickness_in > 0) || !(2 * wall_thickness_in < pipe_od_in)) return { error: "The wall must be positive and less than half the outside diameter." };
  if (!(steel_resistivity_ohm_in > 0)) return { error: "Steel resistivity must be positive." };
  if (!(coating_resistance_ohm_sqft > 0) || !(degraded_coating_resistance_ohm_sqft > 0)) return { error: "Coating resistances must be positive." };
  if (!(drain_shift_v > 0)) return { error: "The drain point potential shift must be positive (enter its magnitude)." };
  if (!(distance_mi > 0)) return { error: "The distance of interest must be positive." };
  const inside_diameter_in = pipe_od_in - 2 * wall_thickness_in;
  const steel_area_sqin = Math.PI / 4 * (pipe_od_in * pipe_od_in - inside_diameter_in * inside_diameter_in);
  const longitudinal_ohm_per_ft = steel_resistivity_ohm_in / steel_area_sqin * IN_PER_FT;
  const surface_sqft_per_ft = Math.PI * pipe_od_in / IN_PER_FT;
  const distance_ft = distance_mi * FT_PER_MILE;
  const lineFor = (coating_ohm_sqft) => {
    const leakage_ohm_ft = coating_ohm_sqft / surface_sqft_per_ft;
    const attenuation_per_ft = Math.sqrt(longitudinal_ohm_per_ft / leakage_ohm_ft);
    return {
      leakage_ohm_ft, attenuation_per_ft,
      characteristic_resistance_ohm: Math.sqrt(longitudinal_ohm_per_ft * leakage_ohm_ft),
      shift_at_distance_v: drain_shift_v * Math.exp(-attenuation_per_ft * distance_ft),
      half_shift_mi: Math.LN2 / attenuation_per_ft / FT_PER_MILE,
    };
  };
  const good = lineFor(coating_resistance_ohm_sqft);
  const degraded = lineFor(degraded_coating_resistance_ohm_sqft);
  return {
    drain_shift_v, distance_mi,
    steel_area_sqin, longitudinal_ohm_per_ft, surface_sqft_per_ft,
    leakage_ohm_ft: good.leakage_ohm_ft,
    attenuation_per_ft: good.attenuation_per_ft,
    characteristic_resistance_ohm: good.characteristic_resistance_ohm,
    shift_at_distance_v: good.shift_at_distance_v,
    shift_surviving_pct: 100 * good.shift_at_distance_v / drain_shift_v,
    half_shift_mi: good.half_shift_mi,
    degraded_attenuation_per_ft: degraded.attenuation_per_ft,
    degraded_shift_at_distance_v: degraded.shift_at_distance_v,
    degraded_shift_surviving_pct: 100 * degraded.shift_at_distance_v / drain_shift_v,
    degraded_half_shift_mi: degraded.half_shift_mi,
    coating_degradation_factor: coating_resistance_ohm_sqft / degraded_coating_resistance_ohm_sqft,
    attenuation_rise_factor: degraded.attenuation_per_ft / good.attenuation_per_ft,
    reach_fall_factor: good.half_shift_mi / degraded.half_shift_mi,
    note: "The coating got worse by a large factor and the attenuation constant rose only by its SQUARE ROOT -- the one forgiving feature of the relation and what makes rectifier spacing plannable at all -- but the reach still fell by that same square-root factor. The rectifier will NOT tell you this is happening: it keeps delivering current into a near end that now leaks it all locally. The far-end test stations are where the coating's condition is visible, which is the argument for reading them rather than trusting the drain point. This is the infinite-line approximation with uniform coating; a finite line, a coating holiday, or a nearby structure changes it, and the survey governs.",
  };
}

const attenuationExample = { pipe_od_in: 12.75, wall_thickness_in: 0.25, steel_resistivity_ohm_in: 7.087e-6, coating_resistance_ohm_sqft: 100000, drain_shift_v: 1.0, distance_mi: 10, degraded_coating_resistance_ohm_sqft: 10000 };
CORROSION_RENDERERS["pipeline-potential-attenuation"] = _simpleRenderer({
  citation: "Citation: the infinite-line attenuation relations -- longitudinal resistance R_L = steel resistivity / steel area, leakage resistance R_G = coating resistance / surface per foot, attenuation constant alpha = sqrt(R_L / R_G), characteristic resistance R_k = sqrt(R_L x R_G), and shift at distance x = drain shift x e^(-alpha x). Uniform coating on an infinite line is assumed; the pipeline's own survey governs.",
  example: attenuationExample,
  fields: [
    { key: "pipe_od_in", label: "Pipe outside diameter (in)" },
    { key: "wall_thickness_in", label: "Wall thickness (in)" },
    { key: "steel_resistivity_ohm_in", label: "Steel resistivity (ohm-in)" },
    { key: "coating_resistance_ohm_sqft", label: "Coating resistance (ohm-sq ft)" },
    { key: "drain_shift_v", label: "Drain point potential shift (V)" },
    { key: "distance_mi", label: "Distance of interest (miles)" },
    { key: "degraded_coating_resistance_ohm_sqft", label: "Degraded coating resistance (ohm-sq ft)" },
  ],
  outputs: [
    { key: "attenuation_per_ft", id: "ppa-alpha", label: "Attenuation constant", value: (r) => fmt(r.attenuation_per_ft * 1e5, 3) + " x 10^-5 per foot" },
    { key: "characteristic_resistance_ohm", id: "ppa-rk", label: "Characteristic resistance at the drain", unit: "ohms", value: (r) => fmt(r.characteristic_resistance_ohm, 4) + " ohms" },
    { key: "shift_at_distance_v", id: "ppa-shift", label: "Shift remaining at the distance", unit: "V", value: (r) => fmt(r.shift_at_distance_v, 3) + " V at " + fmt(r.distance_mi, 0) + " miles -- " + fmt(r.shift_surviving_pct, 0) + "% survives" },
    { key: "half_shift_mi", id: "ppa-half", label: "Where the shift has halved", unit: "miles", value: (r) => fmt(r.half_shift_mi, 1) + " miles" },
    { key: "degraded_shift_at_distance_v", id: "ppa-deg", label: "With the degraded coating", unit: "V", value: (r) => fmt(r.degraded_shift_at_distance_v, 3) + " V -- " + fmt(r.degraded_shift_surviving_pct, 1) + "% survives; half-shift at " + fmt(r.degraded_half_shift_mi, 1) + " miles" },
    { key: "attenuation_rise_factor", id: "ppa-sqrt", label: "The shape of the sensitivity", value: (r) => "Coating " + fmt(r.coating_degradation_factor, 0) + "x worse, attenuation up " + fmt(r.attenuation_rise_factor, 2) + "x -- the square root -- and the reach down " + fmt(r.reach_fall_factor, 2) + "x" },
    { key: "note", id: "ppa-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePipelinePotentialAttenuation,
});

// ========== spec-v1766: instant-off potential and IR drop ==========

// An ON reading includes the IR drop through the soil, which is not polarisation
// of the steel. Read against the on potential, a thin real margin looks like a
// comfortable one.

// dims: in { on_potential_v: M L^2 T^-3 I^-1, instant_off_potential_v: M L^2 T^-3 I^-1, native_potential_v: M L^2 T^-3 I^-1, criterion_v: M L^2 T^-3 I^-1, polarization_criterion_mv: M L^2 T^-3 I^-1 } out: { ir_drop_mv: M L^2 T^-3 I^-1, off_margin_mv: M L^2 T^-3 I^-1, on_margin_mv: M L^2 T^-3 I^-1, polarization_mv: M L^2 T^-3 I^-1 }
export function computeInstantOffIrDrop({ on_potential_v = 0, instant_off_potential_v = 0, native_potential_v = 0, criterion_v = 0, polarization_criterion_mv = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(on_potential_v < 0) || !(instant_off_potential_v < 0) || !(native_potential_v < 0) || !(criterion_v < 0)) {
    return { error: "Pipe-to-soil potentials are negative against a copper-copper sulfate reference; enter them with their sign." };
  }
  if (!(on_potential_v <= instant_off_potential_v)) return { error: "The ON potential should be at least as negative as the instant-off; if it is not, a source failed to interrupt or the readings are swapped." };
  if (!(polarization_criterion_mv > 0)) return { error: "The polarisation criterion must be positive (100 mV is customary)." };
  // All margins are magnitudes in mV; the direction is stated in words by the
  // renderer, because a minus sign on a margin is what a survey report misreads.
  const ir_drop_mv = 1000 * (instant_off_potential_v - on_potential_v);
  const off_margin_mv = 1000 * (criterion_v - instant_off_potential_v);
  const on_margin_mv = 1000 * (criterion_v - on_potential_v);
  const polarization_mv = 1000 * (native_potential_v - instant_off_potential_v);
  return {
    on_potential_v, instant_off_potential_v, native_potential_v, criterion_v, polarization_criterion_mv,
    ir_drop_mv, off_margin_mv, on_margin_mv, polarization_mv,
    meets_absolute_criterion: off_margin_mv >= 0,
    meets_polarization_criterion: polarization_mv >= polarization_criterion_mv,
    optimism_ratio: off_margin_mv > 0 ? on_margin_mv / off_margin_mv : 0,
    note: "The ON potential includes the IR drop through the soil, which is voltage across the ground and NOT polarisation of the steel -- read against it, a thin real margin looks comfortable and a surveyor records the station as protected and moves on, while a seasonal drop in soil moisture takes it to failure. A station can satisfy one criterion narrowly and the other comfortably, which is common and entirely normal. And ONE rectifier left running voids all of it: its IR drop stays in the 'instant off' reading, and the number recorded is an on potential wearing an off potential's label. NACE SP0169 (now AMPP) governs the criteria and how they are applied.",
  };
}

const instantOffExample = { on_potential_v: -1.150, instant_off_potential_v: -0.880, native_potential_v: -0.620, criterion_v: -0.850, polarization_criterion_mv: 100 };
CORROSION_RENDERERS["instant-off-ir-drop"] = _simpleRenderer({
  citation: "Citation: IR drop = instant-off potential minus ON potential; the -0.850 V criterion is applied to the instant-off (polarised) potential against a copper-copper sulfate reference, and polarisation = native minus instant-off. NACE SP0169 (now AMPP) governs the criteria and their application.",
  example: instantOffExample,
  fields: [
    { key: "on_potential_v", label: "ON potential (V, negative)", attrs: { step: "any" } },
    { key: "instant_off_potential_v", label: "Instant-off potential (V, negative)", attrs: { step: "any" } },
    { key: "native_potential_v", label: "Native potential (V, negative)", attrs: { step: "any" } },
    { key: "criterion_v", label: "Absolute criterion (V, e.g. -0.850)", attrs: { step: "any" } },
    { key: "polarization_criterion_mv", label: "Polarisation criterion (mV)" },
  ],
  outputs: [
    { key: "ir_drop_mv", id: "ioi-ir", label: "IR drop in the ON reading", value: (r) => fmt(r.ir_drop_mv, 0) + " mV of soil, not steel" },
    { key: "off_margin_mv", id: "ioi-off", label: "Real margin, on the instant-off", value: (r) => (r.meets_absolute_criterion ? "PASSES by " + fmt(r.off_margin_mv, 0) + " mV" : "FAILS by " + fmt(-r.off_margin_mv, 0) + " mV") },
    { key: "on_margin_mv", id: "ioi-on", label: "Apparent margin, on the ON reading", value: (r) => fmt(r.on_margin_mv, 0) + " mV" + (r.optimism_ratio > 0 ? " -- " + fmt(r.optimism_ratio, 1) + " times too optimistic" : "") },
    { key: "polarization_mv", id: "ioi-pol", label: "Polarisation above native", value: (r) => fmt(r.polarization_mv, 0) + " mV -- " + (r.meets_polarization_criterion ? "clears" : "SHORT of") + " the " + fmt(r.polarization_criterion_mv, 0) + " mV criterion" },
    { key: "note", id: "ioi-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeInstantOffIrDrop,
});

// ======== spec-v1767: coating breakdown factor over the design life ========

// The current demand grows with the coating's breakdown, and the MEAN current
// buys anode metal while the FINAL current buys anode count and rectifier
// capacity -- two different numbers for two different decisions.

// dims: in { surface_sqft: L^2, bare_current_density_ma_per_sqft: I L^-2, initial_breakdown_pct: dimensionless, annual_degradation_pct: dimensionless, design_life_years: T, fast_degradation_pct: dimensionless } out: { initial_current_a: I, final_current_a: I, mean_current_a: I, bare_steel_current_a: I, years_to_bare: T }
export function computeCoatingBreakdownFactor({ surface_sqft = 0, bare_current_density_ma_per_sqft = 0, initial_breakdown_pct = 0, annual_degradation_pct = 0, design_life_years = 0, fast_degradation_pct = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(surface_sqft > 0)) return { error: "Surface area must be positive." };
  if (!(bare_current_density_ma_per_sqft > 0)) return { error: "The bare-steel current density must be positive." };
  if (!(initial_breakdown_pct >= 0 && initial_breakdown_pct < 100)) return { error: "The initial breakdown factor must be at least 0 and below 100%." };
  if (!(annual_degradation_pct > 0) || !(fast_degradation_pct > 0)) return { error: "Degradation rates must be positive." };
  if (!(design_life_years > 0)) return { error: "The design life must be positive." };
  const f0 = initial_breakdown_pct / 100;
  const rate = annual_degradation_pct / 100;
  const fast_rate = fast_degradation_pct / 100;
  // A structure cannot become more than completely uncoated.
  const factorAt = (r, years) => Math.min(1, f0 + r * years);
  const f_final = factorAt(rate, design_life_years);
  const f_mean = Math.min(1, f0 + rate * design_life_years / 2);
  const bare_steel_current_a = surface_sqft * bare_current_density_ma_per_sqft / 1000;
  const currentAt = (f) => bare_steel_current_a * f;
  const initial_current_a = currentAt(f0);
  const final_current_a = currentAt(f_final);
  const mean_current_a = currentAt(f_mean);
  const fast_final_current_a = currentAt(factorAt(fast_rate, design_life_years));
  return {
    surface_sqft, design_life_years, fast_degradation_pct,
    initial_breakdown: f0, final_breakdown: f_final, mean_breakdown: f_mean,
    bare_steel_current_a, initial_current_a, final_current_a, mean_current_a,
    growth_ratio: initial_current_a > 0 ? final_current_a / initial_current_a : 0,
    commissioning_share_of_final_pct: 100 * initial_current_a / final_current_a,
    mean_shortfall_pct: 100 * (final_current_a - mean_current_a) / final_current_a,
    final_over_mean_ratio: final_current_a / mean_current_a,
    years_to_bare: (1 - f0) / rate,
    fast_years_to_bare: (1 - f0) / fast_rate,
    fast_final_current_a,
    fast_reaches_bare: f0 + fast_rate * design_life_years >= 1,
    note: "A rectifier and anode bed sized on the commissioning current will be at a small fraction of the required output by the end of the design life, and the failure arrives gradually enough that nobody can name the day it happened. The MEAN current is what buys anode metal; the FINAL current is what buys anode COUNT and rectifier capacity -- using the mean for both leaves the system short at end of life, and using the final for both buys anode mass that will never be consumed. The breakdown factor caps at fully bare, and that bare-steel demand is the ceiling any impressed-current design is ultimately bounded by. Linear degradation is the customary design model; DNV-RP-B401, NACE practice, and the CP designer govern the factors.",
  };
}

const breakdownExample = { surface_sqft: 50000, bare_current_density_ma_per_sqft: 2, initial_breakdown_pct: 2, annual_degradation_pct: 2, design_life_years: 30, fast_degradation_pct: 4 };
CORROSION_RENDERERS["coating-breakdown-factor"] = _simpleRenderer({
  citation: "Citation: linear coating breakdown -- f(t) = f(0) + annual rate x t, capped at 1.0 for fully bare steel; current demand = surface area x bare-steel current density x f(t), with the mean over the life taken at f(0) + rate x life / 2. DNV-RP-B401, NACE practice, and the CP designer govern the breakdown factors.",
  example: breakdownExample,
  fields: [
    { key: "surface_sqft", label: "Surface area (sq ft)" },
    { key: "bare_current_density_ma_per_sqft", label: "Bare-steel current density (mA/sq ft)" },
    { key: "initial_breakdown_pct", label: "Initial breakdown factor (%)" },
    { key: "annual_degradation_pct", label: "Annual degradation (% per year)" },
    { key: "design_life_years", label: "Design life (years)" },
    { key: "fast_degradation_pct", label: "Faster degradation to compare (% per year)" },
  ],
  outputs: [
    { key: "initial_current_a", id: "cbf-init", label: "Current at commissioning", unit: "A", value: (r) => fmt(r.initial_current_a, 2) + " A" },
    { key: "final_current_a", id: "cbf-final", label: "Current at end of life", unit: "A", value: (r) => fmt(r.final_current_a, 1) + " A -- " + fmt(r.growth_ratio, 0) + " times the commissioning current" },
    { key: "mean_current_a", id: "cbf-mean", label: "Mean current, which buys anode metal", unit: "A", value: (r) => fmt(r.mean_current_a, 1) + " A" },
    { key: "mean_shortfall_pct", id: "cbf-short", label: "Sizing everything on the mean", value: (r) => fmt(r.mean_shortfall_pct, 0) + "% short of output at end of life; sizing everything on the final buys " + fmt(r.final_over_mean_ratio, 2) + "x the anode mass consumed" },
    { key: "commissioning_share_of_final_pct", id: "cbf-comm", label: "A system sized at commissioning", value: (r) => "delivers " + fmt(r.commissioning_share_of_final_pct, 0) + "% of what the end of life requires" },
    { key: "years_to_bare", id: "cbf-bare", label: "Years to fully bare", unit: "years", value: (r) => fmt(r.years_to_bare, 1) + " years at the entered rate, " + fmt(r.fast_years_to_bare, 1) + " at the faster one" },
    { key: "fast_final_current_a", id: "cbf-fast", label: "End of life at the faster rate", unit: "A", value: (r) => fmt(r.fast_final_current_a, 1) + " A" + (r.fast_reaches_bare ? " -- the bare-steel ceiling of " + fmt(r.bare_steel_current_a, 1) + " A" : "") },
    { key: "note", id: "cbf-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCoatingBreakdownFactor,
});

// ======= spec-v1768: stray current interference bond resistor =======

// The number that matters is not the resistor, it is the RETEST: a bond that
// satisfies the arithmetic and leaves the foreign structure still discharging
// has moved the problem rather than fixed it.

// dims: in { open_circuit_v: M L^2 T^-3 I^-1, solid_bond_current_a: I, target_bond_current_a: I, interference_shift_mv: M L^2 T^-3 I^-1, rating_margin_factor: dimensionless } out: { circuit_resistance_ohm: M L^2 T^-3 I^-2, required_resistance_ohm: M L^2 T^-3 I^-2, resistor_ohm: M L^2 T^-3 I^-2, dissipation_w: M L^2 T^-3, recommended_rating_w: M L^2 T^-3 }
export function computeStrayCurrentBond({ open_circuit_v = 0, solid_bond_current_a = 0, target_bond_current_a = 0, interference_shift_mv = 0, rating_margin_factor = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(open_circuit_v > 0)) return { error: "The open-circuit potential difference across the bond points must be positive." };
  if (!(solid_bond_current_a > 0) || !(target_bond_current_a > 0)) return { error: "Bond currents must be positive." };
  if (!(target_bond_current_a < solid_bond_current_a)) return { error: "The target current must be below the solid-bond current; a resistor can only reduce it." };
  if (!(interference_shift_mv >= 0)) return { error: "The interference shift cannot be negative (enter its magnitude)." };
  if (!(rating_margin_factor >= 1)) return { error: "The rating margin factor must be at least 1." };
  const circuit_resistance_ohm = open_circuit_v / solid_bond_current_a;
  const required_resistance_ohm = open_circuit_v / target_bond_current_a;
  const resistor_ohm = required_resistance_ohm - circuit_resistance_ohm;
  const dissipation_w = target_bond_current_a * target_bond_current_a * resistor_ohm;
  return {
    open_circuit_v, solid_bond_current_a, target_bond_current_a, interference_shift_mv, rating_margin_factor,
    circuit_resistance_ohm, required_resistance_ohm, resistor_ohm, dissipation_w,
    recommended_rating_w: dissipation_w * rating_margin_factor,
    solid_bond_excess_pct: 100 * (solid_bond_current_a - target_bond_current_a) / target_bond_current_a,
    note: "A solid bond that drains more current than the crossing needs drags the foreign structure toward overprotection; the resistor is a small deliberate value, fabricated or selected rather than taken off a shelf of ordinary resistors, and it must be rated at several times its dissipation because it runs every hour of every year. But the number that matters is NOT the resistor -- it is the RETEST. With the bond in place both structures must be re-surveyed and both must meet criterion: the protected line must not have lost output to the bond, and the foreign line's positive shift must be gone at the discharge point. A bond that satisfies the arithmetic and leaves the foreign structure still discharging has moved the problem rather than fixed it. NACE SP0169, the foreign operator, and the interference test govern.",
  };
}

const bondExample = { open_circuit_v: 0.45, solid_bond_current_a: 8.5, target_bond_current_a: 3.0, interference_shift_mv: 250, rating_margin_factor: 5 };
CORROSION_RENDERERS["stray-current-bond"] = _simpleRenderer({
  citation: "Citation: circuit resistance from the solid-bond test = open-circuit potential / solid-bond current; the resistor that limits the bond to its target current = (potential / target current) minus the circuit resistance; dissipation = current^2 x resistance. NACE SP0169 (now AMPP), the foreign structure's operator, and the interference retest govern.",
  example: bondExample,
  fields: [
    { key: "open_circuit_v", label: "Open-circuit potential across bond points (V)" },
    { key: "solid_bond_current_a", label: "Current through a temporary solid bond (A)" },
    { key: "target_bond_current_a", label: "Target bond current (A)" },
    { key: "interference_shift_mv", label: "Interference shift on the foreign line (mV)" },
    { key: "rating_margin_factor", label: "Resistor rating margin (x dissipation)", attrs: { step: "any", min: "1" } },
  ],
  outputs: [
    { key: "circuit_resistance_ohm", id: "scb-circ", label: "Circuit resistance, solid bond", unit: "ohms", value: (r) => fmt(r.circuit_resistance_ohm, 4) + " ohms; the solid bond drains " + fmt(r.solid_bond_current_a, 1) + " A, " + fmt(r.solid_bond_excess_pct, 0) + "% more than needed" },
    { key: "required_resistance_ohm", id: "scb-req", label: "Total resistance for the target", unit: "ohms", value: (r) => fmt(r.required_resistance_ohm, 4) + " ohms for " + fmt(r.target_bond_current_a, 1) + " A" },
    { key: "resistor_ohm", id: "scb-res", label: "Resistor to add", unit: "ohms", value: (r) => fmt(r.resistor_ohm, 4) + " ohms -- a small, deliberate, fabricated value" },
    { key: "dissipation_w", id: "scb-p", label: "Continuous dissipation", unit: "W", value: (r) => fmt(r.dissipation_w, 2) + " W, every hour of every year" },
    { key: "recommended_rating_w", id: "scb-rate", label: "Rate the resistor at", unit: "W", value: (r) => fmt(r.recommended_rating_w, 1) + " W or more, in a ventilated test station" },
    { key: "interference_shift_mv", id: "scb-retest", label: "What the retest must show", value: (r) => "the foreign line's " + fmt(r.interference_shift_mv, 0) + " mV positive shift GONE at the discharge point, and the protected line still at criterion" },
    { key: "note", id: "scb-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeStrayCurrentBond,
});

// ======== spec-v1769: corrosion rate from coupon weight loss ========

// The average rate and the deepest pit come from the same coupon and the same
// weighing, and the second one decides when the equipment leaks. A programme
// that records mass loss and not pit depth has measured the wrong extreme.

// dims: in { mass_loss_mg: M, density_g_cm3: M L^-3, exposed_area_sqin: L^2, exposure_hours: T, wall_thickness_in: L, retirement_thickness_in: L, pitting_factor: dimensionless, alternative_mass_loss_mg: M } out: { corrosion_rate_mpy: L T^-1, corrosion_rate_mm_per_year: L T^-1, remaining_life_years: T, pit_rate_mpy: L T^-1, pit_life_years: T }
export function computeCorrosionRateWeightLoss({ mass_loss_mg = 0, density_g_cm3 = 0, exposed_area_sqin = 0, exposure_hours = 0, wall_thickness_in = 0, retirement_thickness_in = 0, pitting_factor = 0, alternative_mass_loss_mg = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(mass_loss_mg > 0) || !(alternative_mass_loss_mg > 0)) return { error: "Mass loss must be positive; a coupon with no loss gives no rate." };
  if (!(density_g_cm3 > 0)) return { error: "Alloy density must be positive." };
  if (!(exposed_area_sqin > 0)) return { error: "Exposed area must be positive." };
  if (!(exposure_hours > 0)) return { error: "Exposure time must be positive." };
  if (!(wall_thickness_in > 0) || !(retirement_thickness_in >= 0)) return { error: "Wall thickness must be positive and retirement thickness non-negative." };
  if (!(retirement_thickness_in < wall_thickness_in)) return { error: "The retirement thickness must be below the current wall." };
  if (!(pitting_factor >= 1)) return { error: "The pitting factor must be at least 1 (deepest pit over average penetration)." };
  const rateFor = (mg) => MPY_K * mg / (density_g_cm3 * exposed_area_sqin * exposure_hours);
  const corrosion_rate_mpy = rateFor(mass_loss_mg);
  const corrosion_allowance_in = wall_thickness_in - retirement_thickness_in;
  const lifeAt = (mpy) => corrosion_allowance_in / (mpy / MILS_PER_IN);
  const alternative_rate_mpy = rateFor(alternative_mass_loss_mg);
  const pit_rate_mpy = corrosion_rate_mpy * pitting_factor;
  return {
    mass_loss_mg, exposure_hours, pitting_factor, alternative_mass_loss_mg,
    corrosion_rate_mpy,
    corrosion_rate_mm_per_year: corrosion_rate_mpy * MM_PER_MIL,
    corrosion_allowance_in,
    remaining_life_years: lifeAt(corrosion_rate_mpy),
    alternative_rate_mpy,
    alternative_life_years: lifeAt(alternative_rate_mpy),
    rate_ratio: alternative_rate_mpy / corrosion_rate_mpy,
    pit_rate_mpy,
    pit_life_years: lifeAt(pit_rate_mpy),
    note: "A very long remaining life at a low average rate is the correct arithmetic and a meaningless projection: nothing about the service will stay constant that long, and the number is far outside what the measurement can support. The relation is linear -- a factor in mass loss is the same factor in rate and in life. The surprise is in the PITS: the deepest pit on the same coupon, at an ordinary pitting factor, gives a life a fraction as long, and that is the figure that decides when the equipment leaks. A monitoring programme that records mass loss and not pit depth has measured the wrong extreme. ASTM G1 governs coupon cleaning and weighing; the coupon's own pit-depth measurement governs the pitting factor.",
  };
}

const couponExample = { mass_loss_mg: 125, density_g_cm3: 7.85, exposed_area_sqin: 6.0, exposure_hours: 2160, wall_thickness_in: 0.25, retirement_thickness_in: 0.125, pitting_factor: 10, alternative_mass_loss_mg: 2500 };
CORROSION_RENDERERS["corrosion-rate-weight-loss"] = _simpleRenderer({
  citation: "Citation: ASTM G1 weight-loss corrosion rate CR (mpy) = 534 x mass loss (mg) / (density (g/cm^3) x area (sq in) x time (h)); remaining life = (wall - retirement thickness) / rate; the pit rate applies the coupon's pitting factor, the deepest pit over the average penetration. ASTM G1 governs cleaning and weighing, and the coupon's own pit-depth measurement governs the pitting factor.",
  example: couponExample,
  fields: [
    { key: "mass_loss_mg", label: "Mass lost after cleaning (mg)" },
    { key: "density_g_cm3", label: "Alloy density (g/cm^3)" },
    { key: "exposed_area_sqin", label: "Exposed area (sq in)" },
    { key: "exposure_hours", label: "Exposure time (hours)" },
    { key: "wall_thickness_in", label: "Current wall thickness (in)" },
    { key: "retirement_thickness_in", label: "Retirement thickness (in)" },
    { key: "pitting_factor", label: "Pitting factor", attrs: { step: "any", min: "1" } },
    { key: "alternative_mass_loss_mg", label: "Alternative mass loss (mg)" },
  ],
  outputs: [
    { key: "corrosion_rate_mpy", id: "crw-rate", label: "Average corrosion rate", value: (r) => fmt(r.corrosion_rate_mpy, 4) + " mpy (" + fmt(r.corrosion_rate_mm_per_year, 4) + " mm/yr)" },
    { key: "remaining_life_years", id: "crw-life", label: "Remaining life at the average", unit: "years", value: (r) => fmt(r.remaining_life_years, 0) + " years on a " + fmt(r.corrosion_allowance_in, 3) + " in allowance -- correct arithmetic, not a real forecast" },
    { key: "alternative_rate_mpy", id: "crw-alt", label: "At the alternative mass loss", value: (r) => fmt(r.alternative_rate_mpy, 2) + " mpy, " + fmt(r.alternative_life_years, 1) + " years -- " + fmt(r.rate_ratio, 0) + "x the loss is " + fmt(r.rate_ratio, 0) + "x the rate, exactly" },
    { key: "pit_rate_mpy", id: "crw-pit", label: "At the deepest pit", value: (r) => fmt(r.pit_rate_mpy, 2) + " mpy at a pitting factor of " + fmt(r.pitting_factor, 0) },
    { key: "pit_life_years", id: "crw-pitlife", label: "Life at the deepest pit", unit: "years", value: (r) => fmt(r.pit_life_years, 0) + " years -- the figure that decides when it leaks" },
    { key: "note", id: "crw-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCorrosionRateWeightLoss,
});

// ============ spec-v1770: galvanic corrosion area ratio ============

// The galvanic series tells you WHICH metal corrodes; only the geometry tells
// you whether anyone will ever notice. Reversing the area ratio changes the
// attack rate by that ratio squared.

// dims: in { anode_potential_v: M L^2 T^-3 I^-1, cathode_potential_v: M L^2 T^-3 I^-1, cathodic_current_density_ma_per_sqft: I L^-2, cathode_area_sqin: L^2, anode_area_sqin: L^2, electrochemical_equivalent_lb_per_a_yr: M I^-1 T^-1, anode_density_pcf: M L^-3 } out: { driving_voltage_v: M L^2 T^-3 I^-1, galvanic_current_ma: I, anode_current_density_a_per_sqft: I L^-2, penetration_in_per_year: L T^-1, reversed_penetration_in_per_year: L T^-1 }
export function computeGalvanicAreaRatio({ anode_potential_v = 0, cathode_potential_v = 0, cathodic_current_density_ma_per_sqft = 0, cathode_area_sqin = 0, anode_area_sqin = 0, electrochemical_equivalent_lb_per_a_yr = 0, anode_density_pcf = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(anode_potential_v < cathode_potential_v)) return { error: "The anode must be the more negative (more active) metal; check the two potentials." };
  if (!(cathodic_current_density_ma_per_sqft > 0)) return { error: "The cathodic current density must be positive." };
  if (!(cathode_area_sqin > 0) || !(anode_area_sqin > 0)) return { error: "Both areas must be positive." };
  if (!(electrochemical_equivalent_lb_per_a_yr > 0) || !(anode_density_pcf > 0)) return { error: "The anode's electrochemical equivalent and density must be positive." };
  const cathode_sqft = cathode_area_sqin / SQIN_PER_SQFT;
  const anode_sqft = anode_area_sqin / SQIN_PER_SQFT;
  // Current is limited by what the CATHODE can support, then concentrated onto
  // the anode's area.
  const attackFor = (cathode_ft2, anode_ft2) => {
    const current_ma = cathodic_current_density_ma_per_sqft * cathode_ft2;
    const density_a_per_sqft = current_ma / 1000 / anode_ft2;
    return {
      current_ma, density_a_per_sqft,
      penetration_in_per_year: density_a_per_sqft * electrochemical_equivalent_lb_per_a_yr / anode_density_pcf * IN_PER_FT,
    };
  };
  const as_given = attackFor(cathode_sqft, anode_sqft);
  const reversed = attackFor(anode_sqft, cathode_sqft);
  return {
    cathode_area_sqin, anode_area_sqin,
    driving_voltage_v: cathode_potential_v - anode_potential_v,
    galvanic_current_ma: as_given.current_ma,
    anode_current_density_a_per_sqft: as_given.density_a_per_sqft,
    penetration_in_per_year: as_given.penetration_in_per_year,
    reversed_galvanic_current_ma: reversed.current_ma,
    reversed_penetration_in_per_year: reversed.penetration_in_per_year,
    reversed_penetration_mils_per_year: reversed.penetration_in_per_year * MILS_PER_IN,
    area_ratio: cathode_area_sqin / anode_area_sqin,
    attack_ratio: as_given.penetration_in_per_year / reversed.penetration_in_per_year,
    note: "The galvanic series tells you WHICH metal corrodes; only the geometry tells you whether anyone will ever notice. Reversing the areas changes the attack by the area ratio SQUARED, because the cathode grew and the anode shrank and the two multiply. The design rule falls straight out: a small cathode is safe, a small anode is not. Where a couple cannot be avoided, make the critical component the cathode, insulate the joint, or coat the CATHODE -- coating the anode is the one intervention that makes it worse, because a holiday in that coating is a still smaller anode. Potentials must be measured in the actual service electrolyte; published galvanic series and the materials engineer govern.",
  };
}

const galvanicExample = { anode_potential_v: -0.61, cathode_potential_v: -0.36, cathodic_current_density_ma_per_sqft: 5, cathode_area_sqin: 1000, anode_area_sqin: 1, electrochemical_equivalent_lb_per_a_yr: 20.1, anode_density_pcf: 490 };
CORROSION_RENDERERS["galvanic-area-ratio"] = _simpleRenderer({
  citation: "Citation: galvanic current = cathodic current density x cathode area, concentrated onto the anode area; penetration = anode current density x the metal's electrochemical equivalent / its density. Potentials must be measured in the actual service electrolyte; published galvanic series and the materials engineer govern.",
  example: galvanicExample,
  fields: [
    { key: "anode_potential_v", label: "More active metal's potential (V)", attrs: { step: "any" } },
    { key: "cathode_potential_v", label: "More noble metal's potential (V)", attrs: { step: "any" } },
    { key: "cathodic_current_density_ma_per_sqft", label: "Cathodic current density (mA/sq ft)" },
    { key: "cathode_area_sqin", label: "Cathode area (sq in)" },
    { key: "anode_area_sqin", label: "Anode area (sq in)" },
    { key: "electrochemical_equivalent_lb_per_a_yr", label: "Anode consumption (lb per A-yr)" },
    { key: "anode_density_pcf", label: "Anode density (lb/cu ft)" },
  ],
  outputs: [
    { key: "driving_voltage_v", id: "gar-v", label: "Driving voltage", unit: "V", value: (r) => fmt(r.driving_voltage_v, 3) + " V; the more negative metal is the anode" },
    { key: "galvanic_current_ma", id: "gar-i", label: "Galvanic current", value: (r) => fmt(r.galvanic_current_ma, 2) + " mA, set by what the cathode supports" },
    { key: "penetration_in_per_year", id: "gar-pen", label: "Attack on the anode, as given", value: (r) => fmt(r.penetration_in_per_year, 3) + " in/yr at " + fmt(r.anode_current_density_a_per_sqft, 2) + " A/sq ft" },
    { key: "reversed_penetration_in_per_year", id: "gar-rev", label: "With the areas reversed", value: (r) => fmt(r.reversed_penetration_mils_per_year, 5) + " mils/yr -- immeasurably small" },
    { key: "attack_ratio", id: "gar-ratio", label: "The whole lesson", value: (r) => "A " + fmt(r.area_ratio, 0) + " to 1 area ratio changes the attack " + fmt(r.attack_ratio, 0) + " times -- the ratio squared" },
    { key: "note", id: "gar-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeGalvanicAreaRatio,
});

// ============ spec-v1771: tank bottom anode layout ============

// A perimeter ring passes its anode-loading check and leaves the middle of the
// tank, where bottoms perforate, the farthest from any anode. Over a
// containment liner the ring does nothing at all.

// dims: in { tank_diameter_ft: L, current_density_ma_per_sqft: I L^-2, grid_spacing_ft: L, ribbon_rating_ma_per_ft: I L^-1 } out: { bottom_area_sqft: L^2, current_requirement_a: I, grid_ribbon_ft: L, grid_loading_ma_per_ft: I L^-1, ring_ribbon_ft: L, ring_loading_ma_per_ft: I L^-1, ring_to_centre_ft: L }
export function computeTankBottomAnodeLayout({ tank_diameter_ft = 0, current_density_ma_per_sqft = 0, grid_spacing_ft = 0, ribbon_rating_ma_per_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(tank_diameter_ft > 0)) return { error: "The tank diameter must be positive." };
  if (!(current_density_ma_per_sqft > 0)) return { error: "The current density must be positive." };
  if (!(grid_spacing_ft > 0) || !(grid_spacing_ft < tank_diameter_ft)) return { error: "The grid spacing must be positive and smaller than the tank diameter." };
  if (!(ribbon_rating_ma_per_ft > 0)) return { error: "The ribbon's rated output must be positive." };
  const radius_ft = tank_diameter_ft / 2;
  const bottom_area_sqft = Math.PI * radius_ft * radius_ft;
  const current_ma = bottom_area_sqft * current_density_ma_per_sqft;
  // Parallel lines at half-spacing offsets either side of the centreline, each
  // a chord of the circle.
  let grid_ribbon_ft = 0;
  let line_count = 0;
  for (let y = grid_spacing_ft / 2; y < radius_ft; y += grid_spacing_ft) {
    grid_ribbon_ft += 2 * 2 * Math.sqrt(radius_ft * radius_ft - y * y);
    line_count += 2;
  }
  // The farthest point of the bottom from any ribbon is midway between two
  // lines or on the rim, where the chords shorten: beyond the last line, and
  // at the ends of each band between lines. Half a spacing is only the first
  // of those. For a rim point, only its adjacent inner line, its adjacent outer
  // line, and the line just across the centreline can be nearest.
  const s = grid_spacing_ft;
  const toChord = (x, y, ly) => Math.hypot(Math.max(0, Math.abs(x) - Math.sqrt(radius_ft * radius_ft - ly * ly)), y - ly);
  const last_line = Math.ceil((radius_ft - s / 2) / s) - 1;
  let grid_to_farthest_ft = s / 2;
  const RIM_STEPS = 16384;
  for (let i = 0; i <= RIM_STEPS; i++) {
    const a = (Math.PI / 2) * i / RIM_STEPS;
    const x = radius_ft * Math.cos(a);
    const y = radius_ft * Math.sin(a);
    const k = Math.min(last_line, Math.max(0, Math.floor((y - s / 2) / s)));
    const candidates = [-s / 2, s / 2 + k * s, s / 2 + (k + 1) * s].filter((ly) => Math.abs(ly) < radius_ft);
    grid_to_farthest_ft = Math.max(grid_to_farthest_ft, Math.min(...candidates.map((ly) => toChord(x, y, ly))));
  }
  const ring_ribbon_ft = Math.PI * tank_diameter_ft;
  const grid_loading_ma_per_ft = current_ma / grid_ribbon_ft;
  const ring_loading_ma_per_ft = current_ma / ring_ribbon_ft;
  return {
    tank_diameter_ft, grid_spacing_ft, ribbon_rating_ma_per_ft,
    bottom_area_sqft,
    current_requirement_a: current_ma / 1000,
    grid_ribbon_ft, line_count, grid_loading_ma_per_ft,
    grid_passes_rating: grid_loading_ma_per_ft <= ribbon_rating_ma_per_ft,
    ring_ribbon_ft, ring_loading_ma_per_ft,
    ring_passes_rating: ring_loading_ma_per_ft <= ribbon_rating_ma_per_ft,
    ring_saving_pct: 100 * (grid_ribbon_ft - ring_ribbon_ft) / grid_ribbon_ft,
    ring_to_centre_ft: radius_ft,
    grid_to_farthest_ft,
    note: "The perimeter ring passes its ribbon-loading check, uses far less anode, and costs far less to install -- and it leaves the middle of the tank the farthest from any anode, with current attenuating through the pad the whole way. Tank bottoms PERFORATE IN THE MIDDLE, where a bottom is least likely to be reached and least likely to be checked; a ring protects everywhere the problem is not. Over a containment liner the ring does not merely underperform, it does NOTHING, because the liner closes the electrolyte. The grid has to be inside the containment and installed when the tank is built, since the alternative is lifting the bottom. API RP 651, NACE SP0193, and the ribbon manufacturer's rating govern.",
  };
}

const tankExample = { tank_diameter_ft: 100, current_density_ma_per_sqft: 1.0, grid_spacing_ft: 10, ribbon_rating_ma_per_ft: 30 };
CORROSION_RENDERERS["tank-bottom-anode-layout"] = _simpleRenderer({
  citation: "Citation: current requirement = bottom area x design current density; a grid of parallel ribbon lines at the entered spacing, each a chord of the circle, against a perimeter ring of the tank's circumference, both checked as current divided by ribbon length against the ribbon's rated output per foot. API RP 651, NACE SP0193 (now AMPP), and the ribbon manufacturer's rating govern.",
  example: tankExample,
  fields: [
    { key: "tank_diameter_ft", label: "Tank diameter (ft)" },
    { key: "current_density_ma_per_sqft", label: "Design current density (mA/sq ft)" },
    { key: "grid_spacing_ft", label: "Grid line spacing (ft)" },
    { key: "ribbon_rating_ma_per_ft", label: "Ribbon rated output (mA/ft)" },
  ],
  outputs: [
    { key: "current_requirement_a", id: "tba-i", label: "Current requirement", unit: "A", value: (r) => fmt(r.current_requirement_a, 2) + " A over " + fmt(r.bottom_area_sqft, 0) + " sq ft" },
    { key: "grid_ribbon_ft", id: "tba-grid", label: "Grid ribbon", unit: "ft", value: (r) => fmt(r.grid_ribbon_ft, 0) + " ft in " + fmt(r.line_count, 0) + " lines at " + fmt(r.grid_spacing_ft, 0) + " ft" },
    { key: "grid_loading_ma_per_ft", id: "tba-gload", label: "Grid loading", value: (r) => fmt(r.grid_loading_ma_per_ft, 1) + " mA/ft -- " + (r.grid_passes_rating ? "within" : "OVER") + " the " + fmt(r.ribbon_rating_ma_per_ft, 0) + " mA/ft rating" },
    { key: "ring_loading_ma_per_ft", id: "tba-rload", label: "Perimeter ring loading", value: (r) => fmt(r.ring_loading_ma_per_ft, 1) + " mA/ft on " + fmt(r.ring_ribbon_ft, 0) + " ft -- " + (r.ring_passes_rating ? "also passes" : "OVER the rating") + ", using " + fmt(r.ring_saving_pct, 0) + "% less anode" },
    { key: "ring_to_centre_ft", id: "tba-centre", label: "The check that passes and the one that does not", value: (r) => "the ring leaves the tank centre " + fmt(r.ring_to_centre_ft, 0) + " ft from any anode, against " + fmt(r.grid_to_farthest_ft, 0) + " ft for the grid -- and bottoms perforate in the middle" },
    { key: "note", id: "tba-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeTankBottomAnodeLayout,
});

// ============ spec-v1772: close interval survey planning ============

// Production rate, not reading rate, is the number to quote a survey from, and
// doubling the interval buys the wrong saving: it steps over half the holidays
// the survey was commissioned to find.

// dims: in { survey_length_mi: L, reading_interval_ft: L, readings_per_station: dimensionless, spool_length_ft: L, production_mi_per_day: L T^-1, seconds_per_reading: T, crew_day_hours: T, test_station_spacing_mi: L, alternative_interval_ft: L } out: { reading_count: dimensionless, data_points: dimensionless, spool_setups: dimensionless, field_days: T, reading_hours: T, alternative_reading_count: dimensionless }
export function computeCloseIntervalSurveyReadings({ survey_length_mi = 0, reading_interval_ft = 0, readings_per_station = 0, spool_length_ft = 0, production_mi_per_day = 0, seconds_per_reading = 0, crew_day_hours = 0, test_station_spacing_mi = 0, alternative_interval_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(survey_length_mi > 0)) return { error: "The survey length must be positive." };
  if (!(reading_interval_ft > 0) || !(alternative_interval_ft > 0)) return { error: "Reading intervals must be positive." };
  if (!(readings_per_station >= 1)) return { error: "There must be at least one reading per station (2 for an on/off survey)." };
  if (!(spool_length_ft > 0)) return { error: "The usable wire spool length must be positive." };
  if (!(production_mi_per_day > 0)) return { error: "The crew production rate must be positive." };
  if (!(seconds_per_reading > 0)) return { error: "Time per reading must be positive." };
  if (!(crew_day_hours > 0 && crew_day_hours <= 24)) return { error: "The crew day must be above 0 and at most 24 hours." };
  if (!(test_station_spacing_mi > 0)) return { error: "Test station spacing must be positive." };
  const length_ft = survey_length_mi * FT_PER_MILE;
  const reading_count = Math.floor(length_ft / reading_interval_ft);
  const data_points = reading_count * readings_per_station;
  const test_station_readings = Math.floor(survey_length_mi / test_station_spacing_mi) + 1;
  const field_days = survey_length_mi / production_mi_per_day;
  const reading_hours = data_points / readings_per_station * seconds_per_reading / SEC_PER_HOUR;
  return {
    survey_length_mi, reading_interval_ft, alternative_interval_ft, seconds_per_reading,
    length_ft, reading_count, data_points,
    test_station_readings,
    readings_between_stations: reading_count - test_station_readings,
    spool_setups: Math.ceil(length_ft / spool_length_ft),
    field_days,
    field_hours: field_days * crew_day_hours,
    reading_hours,
    meter_busy_pct: 100 * reading_hours / (field_days * crew_day_hours),
    alternative_reading_count: Math.floor(length_ft / alternative_interval_ft),
    alternative_field_days: field_days * reading_interval_ft / alternative_interval_ft,
    note: "The survey's whole value is the readings BETWEEN the test stations, because that is where a coating holiday lives and where nothing else looks. The meter is busy for a small share of the field time; the rest is walking, access, wire, and terrain -- which is why production rate, not reading rate, is the number to quote a survey from. Doubling the interval halves the count and roughly halves the field time, and it also steps over half the holidays: a survey that misses the feature it was commissioned to find has not saved money, it has bought a clean report on an unprotected line. The alternative field time here scales linearly with the interval, which overstates the saving because walking does not shrink. NACE SP0207 (now AMPP) governs close interval survey practice.",
  };
}

const cisExample = { survey_length_mi: 10, reading_interval_ft: 2.5, readings_per_station: 2, spool_length_ft: 5000, production_mi_per_day: 2.5, seconds_per_reading: 1.5, crew_day_hours: 8, test_station_spacing_mi: 1, alternative_interval_ft: 5 };
CORROSION_RENDERERS["close-interval-survey-readings"] = _simpleRenderer({
  citation: "Citation: reading count = survey length / reading interval, doubled for an on/off survey; wire spool setups = length / usable spool length, rounded up; field days = length / crew production rate. NACE SP0207 (now AMPP) governs close interval survey practice.",
  example: cisExample,
  fields: [
    { key: "survey_length_mi", label: "Survey length (miles)" },
    { key: "reading_interval_ft", label: "Reading interval (ft)" },
    { key: "readings_per_station", label: "Readings per station (2 for on/off)", attrs: { step: "1", min: "1" } },
    { key: "spool_length_ft", label: "Usable wire spool (ft)" },
    { key: "production_mi_per_day", label: "Crew production (miles per day)" },
    { key: "seconds_per_reading", label: "Seconds per reading" },
    { key: "crew_day_hours", label: "Crew day (hours)", attrs: { step: "any", min: "0", max: "24" } },
    { key: "test_station_spacing_mi", label: "Test station spacing (miles)" },
    { key: "alternative_interval_ft", label: "Alternative interval (ft)" },
  ],
  outputs: [
    { key: "reading_count", id: "cis-count", label: "Stations read", value: (r) => fmt(r.reading_count, 0) + " stations, " + fmt(r.data_points, 0) + " potentials" },
    { key: "test_station_readings", id: "cis-ts", label: "Against test stations alone", value: (r) => fmt(r.test_station_readings, 0) + " readings -- the survey's value is the " + fmt(r.readings_between_stations, 0) + " in between" },
    { key: "spool_setups", id: "cis-spool", label: "Wire spool setups", value: (r) => fmt(r.spool_setups, 0) + " reconnections to a test station" },
    { key: "field_days", id: "cis-days", label: "Field time", unit: "days", value: (r) => fmt(r.field_days, 1) + " crew-days" },
    { key: "reading_hours", id: "cis-read", label: "Actual reading time", unit: "hours", value: (r) => fmt(r.reading_hours, 1) + " h -- the meter is busy " + fmt(r.meter_busy_pct, 0) + "% of the field time" },
    { key: "alternative_reading_count", id: "cis-alt", label: "At the alternative interval", value: (r) => fmt(r.alternative_reading_count, 0) + " stations -- and it steps over the holidays in between" },
    { key: "note", id: "cis-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCloseIntervalSurveyReadings,
});

// ========= spec-v1773: AC induced voltage and AC corrosion =========

// A pipeline can meet the personnel touch limit exactly and be losing steel at
// a holiday at the same time. Mitigating to the touch limit protects the crew
// and does nothing for the pipe.

// dims: in { induced_ac_v: M L^2 T^-3 I^-1, soil_resistivity_ohm_m: M L^3 T^-3 I^-2, holiday_area_cm2: L^2, touch_limit_v: M L^2 T^-3 I^-1, risk_threshold_a_per_m2: I L^-2, alternative_resistivity_ohm_m: M L^3 T^-3 I^-2 } out: { holiday_diameter_mm: L, ac_current_density_a_per_m2: I L^-2, voltage_for_threshold_v: M L^2 T^-3 I^-1, alternative_current_density_a_per_m2: I L^-2 }
export function computeAcInducedVoltagePipeline({ induced_ac_v = 0, soil_resistivity_ohm_m = 0, holiday_area_cm2 = 0, touch_limit_v = 0, risk_threshold_a_per_m2 = 0, alternative_resistivity_ohm_m = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(induced_ac_v > 0)) return { error: "The induced AC voltage must be positive." };
  if (!(soil_resistivity_ohm_m > 0) || !(alternative_resistivity_ohm_m > 0)) return { error: "Soil resistivities must be positive." };
  if (!(holiday_area_cm2 > 0)) return { error: "The holiday area must be positive." };
  if (!(touch_limit_v > 0)) return { error: "The personnel touch limit must be positive." };
  if (!(risk_threshold_a_per_m2 > 0)) return { error: "The AC current density threshold must be positive." };
  const holiday_area_m2 = holiday_area_cm2 * SQ_M_PER_SQ_CM;
  const holiday_diameter_m = Math.sqrt(4 * holiday_area_m2 / Math.PI);
  // J_AC = 8 V / (rho pi d), the circular-holiday spreading-resistance relation.
  const densityFor = (volts, rho) => 8 * volts / (rho * Math.PI * holiday_diameter_m);
  const ac_current_density_a_per_m2 = densityFor(induced_ac_v, soil_resistivity_ohm_m);
  const voltage_for_threshold_v = risk_threshold_a_per_m2 * soil_resistivity_ohm_m * Math.PI * holiday_diameter_m / 8;
  const alternative_current_density_a_per_m2 = densityFor(induced_ac_v, alternative_resistivity_ohm_m);
  return {
    induced_ac_v, touch_limit_v, risk_threshold_a_per_m2, alternative_resistivity_ohm_m,
    holiday_diameter_mm: holiday_diameter_m * 1000,
    ac_current_density_a_per_m2,
    threshold_multiple: ac_current_density_a_per_m2 / risk_threshold_a_per_m2,
    above_threshold: ac_current_density_a_per_m2 > risk_threshold_a_per_m2,
    touch_margin_v: touch_limit_v - induced_ac_v,
    meets_touch_limit: induced_ac_v <= touch_limit_v,
    voltage_for_threshold_v,
    stringency_ratio: touch_limit_v / voltage_for_threshold_v,
    alternative_current_density_a_per_m2,
    alternative_change_pct: 100 * (alternative_current_density_a_per_m2 - ac_current_density_a_per_m2) / ac_current_density_a_per_m2,
    note: "Two criteria, both true at once: a line can satisfy the personnel touch-voltage limit with no margin to spare and be losing steel at a coating holiday, so MITIGATING TO THE TOUCH LIMIT PROTECTS THE CREW AND DOES NOTHING FOR THE PIPE. The voltage the steel needs is far lower than the one the crew needs. And the soil works backwards from the DC intuition: the high-resistivity site that makes cathodic protection difficult is where AC corrosion is least likely, and the wet conductive ground that makes an easy anode bed is where the AC hazard concentrates. The holiday size is an assumption rather than a measurement; ISO 18086, NACE SP21424, and a corridor AC study govern.",
  };
}

const acExample = { induced_ac_v: 15, soil_resistivity_ohm_m: 25, holiday_area_cm2: 1, touch_limit_v: 15, risk_threshold_a_per_m2: 30, alternative_resistivity_ohm_m: 100 };
CORROSION_RENDERERS["ac-induced-voltage-pipeline"] = _simpleRenderer({
  citation: "Citation: AC current density at a circular coating holiday J_AC = 8 V_AC / (rho pi d), with d the equivalent holiday diameter, against the ISO 18086 risk threshold (commonly 30 A/m^2), alongside the personnel touch-voltage limit (commonly 15 V). ISO 18086, NACE SP21424 (now AMPP), and a corridor AC interference study govern.",
  example: acExample,
  fields: [
    { key: "induced_ac_v", label: "Induced AC voltage on the pipe (V)" },
    { key: "soil_resistivity_ohm_m", label: "Local soil resistivity (ohm-m)" },
    { key: "holiday_area_cm2", label: "Assumed holiday area (sq cm)" },
    { key: "touch_limit_v", label: "Personnel touch limit (V)" },
    { key: "risk_threshold_a_per_m2", label: "AC corrosion threshold (A/m^2)" },
    { key: "alternative_resistivity_ohm_m", label: "Alternative soil resistivity (ohm-m)" },
  ],
  outputs: [
    { key: "holiday_diameter_mm", id: "aci-d", label: "Equivalent holiday diameter", unit: "mm", value: (r) => fmt(r.holiday_diameter_mm, 1) + " mm" },
    { key: "ac_current_density_a_per_m2", id: "aci-j", label: "AC current density at the holiday", value: (r) => fmt(r.ac_current_density_a_per_m2, 1) + " A/m^2 -- " + fmt(r.threshold_multiple, 1) + " times the " + fmt(r.risk_threshold_a_per_m2, 0) + " A/m^2 threshold" },
    { key: "touch_margin_v", id: "aci-touch", label: "Against the personnel limit", value: (r) => (r.meets_touch_limit ? "meets it with " + fmt(r.touch_margin_v, 1) + " V to spare" : "EXCEEDS it by " + fmt(-r.touch_margin_v, 1) + " V") + " -- a separate question from the steel" },
    { key: "voltage_for_threshold_v", id: "aci-need", label: "Voltage the steel actually needs", unit: "V", value: (r) => fmt(r.voltage_for_threshold_v, 2) + " V -- " + fmt(r.stringency_ratio, 1) + " times more stringent than the touch limit" },
    { key: "alternative_current_density_a_per_m2", id: "aci-alt", label: "In the alternative soil", value: (r) => fmt(r.alternative_current_density_a_per_m2, 1) + " A/m^2 (" + fmt(r.alternative_change_pct, 0) + "%) at " + fmt(r.alternative_resistivity_ohm_m, 0) + " ohm-m" },
    { key: "note", id: "aci-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeAcInducedVoltagePipeline,
});

// ============ spec-v1774: 100 mV polarisation criterion ============

// A line can fail -0.850 V and be properly protected under the 100 mV
// criterion. Measuring the decay from the ON potential instead of the
// instant-off certifies an unprotected line -- the failure mode that matters.

// dims: in { on_potential_v: M L^2 T^-3 I^-1, instant_off_potential_v: M L^2 T^-3 I^-1, native_potential_v: M L^2 T^-3 I^-1, depolarized_potential_v: M L^2 T^-3 I^-1, criterion_v: M L^2 T^-3 I^-1, polarization_criterion_mv: M L^2 T^-3 I^-1 } out: { ir_drop_mv: M L^2 T^-3 I^-1, formation_mv: M L^2 T^-3 I^-1, decay_mv: M L^2 T^-3 I^-1, absolute_margin_mv: M L^2 T^-3 I^-1, decay_from_on_mv: M L^2 T^-3 I^-1 }
export function computePolarizationDecayCriterion({ on_potential_v = 0, instant_off_potential_v = 0, native_potential_v = 0, depolarized_potential_v = 0, criterion_v = 0, polarization_criterion_mv = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(on_potential_v < 0) || !(instant_off_potential_v < 0) || !(native_potential_v < 0) || !(depolarized_potential_v < 0) || !(criterion_v < 0)) {
    return { error: "Pipe-to-soil potentials are negative against a copper-copper sulfate reference; enter them with their sign." };
  }
  if (!(on_potential_v <= instant_off_potential_v)) return { error: "The ON potential should be at least as negative as the instant-off." };
  if (!(instant_off_potential_v <= depolarized_potential_v)) return { error: "The depolarised potential should be less negative than the instant-off; the structure relaxes toward native." };
  if (!(polarization_criterion_mv > 0)) return { error: "The polarisation criterion must be positive (100 mV is customary)." };
  const ir_drop_mv = 1000 * (instant_off_potential_v - on_potential_v);
  const formation_mv = 1000 * (native_potential_v - instant_off_potential_v);
  const decay_mv = 1000 * (depolarized_potential_v - instant_off_potential_v);
  const absolute_margin_mv = 1000 * (criterion_v - instant_off_potential_v);
  const decay_from_on_mv = 1000 * (depolarized_potential_v - on_potential_v);
  return {
    on_potential_v, instant_off_potential_v, criterion_v, polarization_criterion_mv,
    ir_drop_mv, formation_mv, decay_mv, absolute_margin_mv, decay_from_on_mv,
    formation_passes: formation_mv >= polarization_criterion_mv,
    decay_passes: decay_mv >= polarization_criterion_mv,
    absolute_passes: absolute_margin_mv >= 0,
    protected_under_either: formation_mv >= polarization_criterion_mv || decay_mv >= polarization_criterion_mv || absolute_margin_mv >= 0,
    decay_overstatement_ratio: decay_mv > 0 ? decay_from_on_mv / decay_mv : 0,
    decay_margin_mv: decay_mv - polarization_criterion_mv,
    note: "A line can FAIL -0.850 V and be properly protected under the 100 mV criterion -- that is precisely why the 100 mV criterion exists. Driving a well-coated line in high-resistivity soil further negative to meet -0.850 V would take current and rectifier voltage it does not need and risk the coating disbondment that overprotection causes; reporting it as a failure is a misreading of the standard, not a finding. The error the criterion is most often got wrong by is measuring the decay from the ON potential: it adds the IR drop, which is soil and not steel, and it makes a structure genuinely below 100 mV pass comfortably -- the failure mode that matters, because it certifies an unprotected line. NACE SP0169 (now AMPP) governs.",
  };
}

const polarizationExample = { on_potential_v: -1.050, instant_off_potential_v: -0.780, native_potential_v: -0.650, depolarized_potential_v: -0.670, criterion_v: -0.850, polarization_criterion_mv: 100 };
CORROSION_RENDERERS["polarization-decay-criterion"] = _simpleRenderer({
  citation: "Citation: the 100 mV polarisation criterion, demonstrated either by formation (native minus instant-off) or by decay (depolarised minus instant-off), always measured from the INSTANT-OFF potential; and the -0.850 V criterion on the instant-off potential against a copper-copper sulfate reference. NACE SP0169 (now AMPP) governs the criteria and when each applies.",
  example: polarizationExample,
  fields: [
    { key: "on_potential_v", label: "ON potential (V, negative)", attrs: { step: "any" } },
    { key: "instant_off_potential_v", label: "Instant-off potential (V, negative)", attrs: { step: "any" } },
    { key: "native_potential_v", label: "Native potential (V, negative)", attrs: { step: "any" } },
    { key: "depolarized_potential_v", label: "Depolarised potential (V, negative)", attrs: { step: "any" } },
    { key: "criterion_v", label: "Absolute criterion (V, e.g. -0.850)", attrs: { step: "any" } },
    { key: "polarization_criterion_mv", label: "Polarisation criterion (mV)" },
  ],
  outputs: [
    { key: "formation_mv", id: "pdc-form", label: "Polarisation by formation", value: (r) => fmt(r.formation_mv, 0) + " mV more negative than native -- " + (r.formation_passes ? "clears" : "SHORT of") + " " + fmt(r.polarization_criterion_mv, 0) + " mV" },
    { key: "decay_mv", id: "pdc-decay", label: "Polarisation by decay", value: (r) => fmt(r.decay_mv, 0) + " mV less negative after depolarising -- " + (r.decay_passes ? "clears" : "SHORT of") + " " + fmt(r.polarization_criterion_mv, 0) + " mV" },
    { key: "absolute_margin_mv", id: "pdc-abs", label: "Against the absolute criterion", value: (r) => (r.absolute_passes ? "meets " + fmt(r.criterion_v, 3) + " V by " + fmt(r.absolute_margin_mv, 0) + " mV" : "SHORT of " + fmt(r.criterion_v, 3) + " V by " + fmt(-r.absolute_margin_mv, 0) + " mV") },
    { key: "protected_under_either", id: "pdc-verdict", label: "Protected?", value: (r) => (r.protected_under_either ? "YES, under a criterion the standard allows -- failing one criterion is not a finding" : "NO criterion is satisfied") },
    { key: "ir_drop_mv", id: "pdc-ir", label: "IR drop in the ON reading", value: (r) => fmt(r.ir_drop_mv, 0) + " mV of soil, not steel" },
    { key: "decay_from_on_mv", id: "pdc-wrong", label: "Decay measured from ON -- the error", value: (r) => fmt(r.decay_from_on_mv, 0) + " mV against a true " + fmt(r.decay_mv, 0) + " mV, " + fmt(r.decay_overstatement_ratio, 1) + " times over" },
    { key: "note", id: "pdc-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePolarizationDecayCriterion,
});

// ============ spec-v1775: coke breeze backfill quantity ============

// Widening the hole buys little because diameter sits inside Dwight's
// logarithm; doubling the depth buys a great deal. And voids are where the
// anode touches soil and is consumed, so the waste allowance is not padding.

// dims: in { hole_diameter_in: L, hole_depth_ft: L, anode_diameter_in: L, anode_length_ft: L, anode_count: dimensionless, backfill_density_pcf: M L^-3, bag_weight_lb: M, waste_pct: dimensionless, soil_resistivity_ohm_cm: M L^3 T^-3 I^-2 } out: { column_ft3: L^3, anode_ft3: L^3, backfill_ft3_per_anode: L^3, backfill_lb_per_anode: M, bed_backfill_ft3: L^3, bed_backfill_lb: M, bag_count: dimensionless }
export function computeCokeBreezeBackfill({ hole_diameter_in = 0, hole_depth_ft = 0, anode_diameter_in = 0, anode_length_ft = 0, anode_count = 0, backfill_density_pcf = 0, bag_weight_lb = 0, waste_pct = 0, soil_resistivity_ohm_cm = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(hole_diameter_in > 0) || !(hole_depth_ft > 0)) return { error: "Hole diameter and depth must be positive." };
  if (!(anode_diameter_in > 0) || !(anode_length_ft > 0)) return { error: "Anode diameter and length must be positive." };
  if (!(anode_diameter_in < hole_diameter_in)) return { error: "The anode must be narrower than the hole it sits in." };
  if (!(anode_length_ft <= hole_depth_ft)) return { error: "The anode cannot be longer than the hole is deep." };
  if (!(anode_count >= 1)) return { error: "There must be at least one anode." };
  if (!(backfill_density_pcf > 0) || !(bag_weight_lb > 0)) return { error: "Backfill density and bag weight must be positive." };
  if (!(waste_pct >= 0)) return { error: "The waste allowance cannot be negative." };
  if (!(soil_resistivity_ohm_cm > 0)) return { error: "Soil resistivity must be positive." };
  const hole_diameter_ft = hole_diameter_in / IN_PER_FT;
  const anode_diameter_ft = anode_diameter_in / IN_PER_FT;
  const column_ft3 = Math.PI / 4 * hole_diameter_ft * hole_diameter_ft * hole_depth_ft;
  const anode_ft3 = Math.PI / 4 * anode_diameter_ft * anode_diameter_ft * anode_length_ft;
  const backfill_ft3_per_anode = column_ft3 - anode_ft3;
  const backfill_lb_per_anode = backfill_ft3_per_anode * backfill_density_pcf;
  const bed_backfill_ft3 = backfill_ft3_per_anode * anode_count;
  const bed_backfill_lb = backfill_lb_per_anode * anode_count;
  const resistanceFor = (dia_in, depth_ft) => _dwightSingle(soil_resistivity_ohm_cm, depth_ft, dia_in / IN_PER_FT);
  const base_resistance_ohm = resistanceFor(hole_diameter_in, hole_depth_ft);
  const narrower_resistance_ohm = resistanceFor(hole_diameter_in * 0.75, hole_depth_ft);
  const wider_resistance_ohm = resistanceFor(hole_diameter_in * 1.25, hole_depth_ft);
  const deeper_resistance_ohm = resistanceFor(hole_diameter_in, hole_depth_ft * 2);
  return {
    hole_diameter_in, hole_depth_ft, anode_count, bag_weight_lb, waste_pct,
    column_ft3, anode_ft3, backfill_ft3_per_anode, backfill_lb_per_anode,
    anode_share_pct: 100 * anode_ft3 / column_ft3,
    bed_backfill_ft3, bed_backfill_lb,
    bed_backfill_tons: bed_backfill_lb / 2000,
    bag_count: Math.ceil(bed_backfill_lb / bag_weight_lb),
    bag_count_with_waste: Math.ceil(bed_backfill_lb * (1 + waste_pct / 100) / bag_weight_lb),
    base_resistance_ohm,
    narrower_resistance_ohm,
    narrower_change_pct: 100 * (narrower_resistance_ohm - base_resistance_ohm) / base_resistance_ohm,
    wider_resistance_ohm,
    wider_change_pct: 100 * (wider_resistance_ohm - base_resistance_ohm) / base_resistance_ohm,
    deeper_resistance_ohm,
    deeper_change_pct: 100 * (deeper_resistance_ohm - base_resistance_ohm) / base_resistance_ohm,
    note: "Widening the hole buys little because diameter sits inside Dwight's logarithm, while doubling the depth buys a great deal -- that single fact should decide every argument about a difficult hole. Subtracting the anode is the right arithmetic even where it is small, and on a large anode in a tight hole it is not. Order to the hole and fill it COMPLETELY: voids are where the anode touches soil, and that is where it is consumed, so the allowance is not padding but the margin that keeps the column full after the material settles and is tamped. Backfill density as placed varies with the product and the tamping; the supplier's data and the CP designer govern.",
  };
}

const cokeExample = { hole_diameter_in: 8, hole_depth_ft: 10, anode_diameter_in: 2, anode_length_ft: 5, anode_count: 10, backfill_density_pcf: 70, bag_weight_lb: 50, waste_pct: 10, soil_resistivity_ohm_cm: 5000 };
CORROSION_RENDERERS["coke-breeze-backfill"] = _simpleRenderer({
  citation: "Citation: backfill volume = augered column volume minus the anode's own volume, per anode; weight = volume x backfill density as placed; the resistance effect of the column geometry from Dwight's single-anode relation R = 0.00521 rho / L x [ln(8L/d) - 1]. The backfill supplier's data and the CP designer govern.",
  example: cokeExample,
  fields: [
    { key: "hole_diameter_in", label: "Augered hole diameter (in)" },
    { key: "hole_depth_ft", label: "Hole depth (ft)" },
    { key: "anode_diameter_in", label: "Anode diameter (in)" },
    { key: "anode_length_ft", label: "Anode length (ft)" },
    { key: "anode_count", label: "Number of anodes", attrs: { step: "1", min: "1" } },
    { key: "backfill_density_pcf", label: "Backfill density as placed (lb/cu ft)" },
    { key: "bag_weight_lb", label: "Bag weight (lb)" },
    { key: "waste_pct", label: "Waste allowance (%)" },
    { key: "soil_resistivity_ohm_cm", label: "Soil resistivity (ohm-cm)" },
  ],
  outputs: [
    { key: "backfill_ft3_per_anode", id: "cbb-per", label: "Backfill per anode", value: (r) => fmt(r.backfill_ft3_per_anode, 4) + " cu ft (" + fmt(r.backfill_lb_per_anode, 1) + " lb); the anode takes " + fmt(r.anode_share_pct, 1) + "% of the hole" },
    { key: "bed_backfill_lb", id: "cbb-bed", label: "The whole bed", value: (r) => fmt(r.bed_backfill_ft3, 1) + " cu ft, " + fmt(r.bed_backfill_lb, 0) + " lb (" + fmt(r.bed_backfill_tons, 2) + " tons)" },
    { key: "bag_count", id: "cbb-bags", label: "Bags to order", value: (r) => fmt(r.bag_count, 0) + " bags, or " + fmt(r.bag_count_with_waste, 0) + " with the " + fmt(r.waste_pct, 0) + "% allowance" },
    { key: "base_resistance_ohm", id: "cbb-r", label: "One anode column to earth", unit: "ohms", value: (r) => fmt(r.base_resistance_ohm, 2) + " ohms" },
    { key: "wider_resistance_ohm", id: "cbb-wide", label: "Widening or narrowing the hole", value: (r) => fmt(r.narrower_change_pct, 0) + "% at three-quarters the diameter, " + fmt(r.wider_change_pct, 0) + "% at one and a quarter -- it sits inside the logarithm" },
    { key: "deeper_resistance_ohm", id: "cbb-deep", label: "Doubling the depth", unit: "ohms", value: (r) => fmt(r.deeper_resistance_ohm, 2) + " ohms (" + fmt(r.deeper_change_pct, 0) + "%) -- drill deeper" },
    { key: "note", id: "cbb-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCokeBreezeBackfill,
});
