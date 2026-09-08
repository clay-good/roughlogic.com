// Group C: Industrial refrigeration.
//
// spec-v1484..v1494 (scope-trade-expansion-2, the industrial refrigeration
// band): the ammonia and CO2 plant side of Group C, which the catalog did not
// serve. calc-refrigerant.js holds the SERVICE bench -- superheat, charge,
// recovery, TXV, defrost -- sized around a technician at a comfort-cooling or
// walk-in system. The tiles here are the ones an industrial refrigeration
// engineer or a PSM-covered plant needs: the charge inventory that decides
// whether a plant is regulated at all, the two-stage interstage setting, the
// machinery-room ventilation and relief capacity that ASHRAE 15 requires, and
// the CO2 transcritical high-side optimum. All ten KEEP group: "C" (a tile's
// group letter is independent of the module that holds it, the spec-v42 /
// spec-v70..v86 precedent).

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

// Compact renderer factory, copied verbatim from calc-arborist.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _rfRender = function (inputRegion, outputRegion, citationEl) {
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

  _rfRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rfRender;
}


export const REFRIGERATION_RENDERERS = {};

// Unit constants. Each carries a leading-underscore name of its own rather
// than sharing one with another module, because two of these are CONVENTIONS
// rather than definitions and pinning them to a shared name would make one
// tile's cited relation disagree with another's.
//
// Exact by definition: the US gallon is 231 cubic inches, so cubic feet to
// gallons is exactly 1728/231. Written as the definition so it cannot be
// re-encoded as a truncation.
const _REF_GAL_PER_CUFT = 1728 / 231;
// Exact by definition: 1 W-h = 3.412141633 BTU_IT.
const _REF_BTUH_PER_WATT = 3.412141633;
// The standard atmosphere as refrigeration gauge work states it. Plants read
// psig off a gauge and the trade converts with 14.7, not 14.696.
const _REF_ATM_PSIA = 14.7;
// 1 bar = 100,000 Pa and 1 psi = 6,894.757293168361 Pa exactly.
const _REF_PSI_PER_BAR = 100000 / 6894.757293168361;
// The water-side heat transport constant, 8.33 lb/gal x 60 min/h x 1.0
// BTU/lb-degF. The catalog's water DENSITY constants are 8.34 and 8.3454;
// this is the customary 500 that the flow relation is written with, so it
// carries its own name rather than being derived from either of those.
const _REF_WATER_FLOW_CONST = 500;
// The customary pump constant, 33,000 ft-lb/min per hp over the same 8.33
// lb/gal water basis. Same reason as above: 33000/8.34 is 3,956.8, and every
// pump curve and textbook writes 3,960.
const _REF_PUMP_HP_CONST = 3960;
// CO2 critical point. Above this temperature there is no condensation and the
// high side is a single-phase gas being cooled.
const _REF_CO2_CRITICAL_F = 87.8;
const _REF_CO2_CRITICAL_PSIA = 1071;
// The EPA RMP / OSHA PSM threshold quantity for anhydrous ammonia.
const _REF_AMMONIA_PSM_THRESHOLD_LB = 10000;

// Fahrenheit to Celsius, used by the CO2 optimum-pressure correlation, which
// is published in degC and bar. Non-exported, so it adds no v14 corpus row,
// and it returns an arithmetic expression rather than a bare identifier so
// check-render-output-keys can read the compute that calls it.
const _refFtoC = (f) => (f - 32) * 5 / 9;
// Exact by definition: 1 mechanical hp = 550 ft-lbf/s = 745.6998715822702 W.
const _REF_KW_PER_HP = 0.745699872;

// =====================================================================
// spec-v1484: Ammonia refrigeration charge inventory and PSM threshold.
// =====================================================================
//
// Charge is a sum of liquid inventories, each at its own vessel's operating
// temperature, because liquid ammonia's density falls markedly as it warms
// and a single bundled density would misstate a low-temperature recirculator.
// dims: in { receiver_volume_gal: L^3, receiver_fill_fraction: dimensionless, receiver_density_lb_ft3: M L^-3, recirculator_volume_gal: L^3, recirculator_fill_fraction: dimensionless, recirculator_density_lb_ft3: M L^-3, piping_volume_ft3: L^3, piping_liquid_fraction: dimensionless, piping_density_lb_ft3: M L^-3, threshold_lb: M } out: { receiver_lb: M, recirculator_lb: M, piping_lb: M, total_lb: M, margin_lb: M, pct_of_threshold: dimensionless, additional_cuft_to_cross: L^3 }
export function computeAmmoniaChargeInventory({
  receiver_volume_gal = 0, receiver_fill_fraction = 0, receiver_density_lb_ft3 = 0,
  recirculator_volume_gal = 0, recirculator_fill_fraction = 0, recirculator_density_lb_ft3 = 0,
  piping_volume_ft3 = 0, piping_liquid_fraction = 0, piping_density_lb_ft3 = 0,
  threshold_lb = _REF_AMMONIA_PSM_THRESHOLD_LB,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (receiver_volume_gal < 0 || recirculator_volume_gal < 0 || piping_volume_ft3 < 0) return { error: "Volumes cannot be negative." };
  if (receiver_fill_fraction < 0 || receiver_fill_fraction > 1) return { error: "Receiver liquid fill fraction must be between 0 and 1." };
  if (recirculator_fill_fraction < 0 || recirculator_fill_fraction > 1) return { error: "Recirculator liquid fill fraction must be between 0 and 1." };
  if (piping_liquid_fraction < 0 || piping_liquid_fraction > 1) return { error: "Piping liquid fraction must be between 0 and 1." };
  if (receiver_density_lb_ft3 < 0 || recirculator_density_lb_ft3 < 0 || piping_density_lb_ft3 < 0) return { error: "Liquid densities cannot be negative." };
  if (!(threshold_lb > 0)) return { error: "The threshold quantity must be positive (lb)." };
  const receiver_cuft = receiver_volume_gal / _REF_GAL_PER_CUFT;
  const recirculator_cuft = recirculator_volume_gal / _REF_GAL_PER_CUFT;
  const receiver_lb = receiver_cuft * receiver_fill_fraction * receiver_density_lb_ft3;
  const recirculator_lb = recirculator_cuft * recirculator_fill_fraction * recirculator_density_lb_ft3;
  const piping_lb = piping_volume_ft3 * piping_liquid_fraction * piping_density_lb_ft3;
  const vessel_total_lb = receiver_lb + recirculator_lb;
  const total_lb = vessel_total_lb + piping_lb;
  if (!(total_lb > 0)) return { error: "Enter at least one vessel or pipe run holding liquid." };
  const margin_lb = threshold_lb - total_lb;
  const over_threshold = total_lb > threshold_lb;
  const pct_of_threshold = total_lb / threshold_lb * 100;
  const piping_share_pct = piping_lb / total_lb * 100;
  const piping_beats_vessels = piping_lb > vessel_total_lb;
  // How much more liquid would cross the line, expressed as volume at the
  // piping's own density, which is the inventory that grows when a plant adds
  // a run of pipe. Zero once the plant is already over.
  const additional_cuft_to_cross = over_threshold || !(piping_liquid_fraction > 0) || !(piping_density_lb_ft3 > 0)
    ? 0
    : margin_lb / (piping_liquid_fraction * piping_density_lb_ft3);
  const verdict = over_threshold
    ? "OVER the " + fmt(threshold_lb, 0) + " lb threshold by " + fmt(-margin_lb, 0) + " lb: this is a PSM-covered process and an RMP-covered process"
    : "UNDER the " + fmt(threshold_lb, 0) + " lb threshold with " + fmt(margin_lb, 0) + " lb of headroom (" + fmt(pct_of_threshold, 1) + "% of it)";
  const piping_verdict = piping_beats_vessels
    ? "the PIPING holds more than both vessels together (" + fmt(piping_share_pct, 0) + "% of the charge) -- a vessel-only tally would have reported " + fmt(vessel_total_lb, 0) + " lb"
    : "the vessels hold more than the piping; the piping is " + fmt(piping_share_pct, 0) + "% of the charge";
  if (![receiver_lb, recirculator_lb, piping_lb, total_lb, margin_lb, pct_of_threshold, additional_cuft_to_cross].every(Number.isFinite)) return { error: "Charge inventory math is not a finite value." };
  return {
    receiver_lb, recirculator_lb, piping_lb, vessel_total_lb, total_lb,
    margin_lb, over_threshold, pct_of_threshold, piping_share_pct,
    piping_beats_vessels, additional_cuft_to_cross, threshold_lb,
    verdict, piping_verdict,
    note: "The anhydrous ammonia inventory of a refrigeration plant, summed vessel by vessel at each vessel's own liquid density, and the margin to the 10,000 lb threshold that triggers OSHA process safety management and an EPA risk management plan. Charge lives almost entirely in the liquid: a high-pressure receiver, a recirculator package, and the liquid and wet-return piping hold nearly all of it while the vapor side holds almost nothing. Liquid density is strongly temperature dependent -- around 37 lb per cubic foot in a warm receiver against about 42 at minus 20 degF -- so a per-vessel sum at each vessel's own operating temperature is the only honest way to do it, and a single bundled density understates a cold recirculator. The threshold is a cliff rather than a slope. Below it a plant has ordinary obligations; above it it has a written PSM program, process hazard analyses, mechanical integrity, management of change, and an offsite consequence analysis. That makes the useful question during a retrofit not what the charge is but how much headroom is left, which is why the margin and the additional volume that would cross it are reported next to the total. The piping term is the one that surprises people: a plant that counts only its vessels can believe itself exempt while the pipe runs carry more than the vessels do, so which of the two is larger is computed here rather than asserted. Volumes, fill fractions, and densities are ENTERED -- it does not read a P and ID, estimate pipe volume from a line list, or determine coverage. The plant's own charge calculation of record, 29 CFR 1910.119, 40 CFR 68, and IIAR 2 govern.",
  };
}
export const ammoniaChargeInventoryExample = { inputs: { receiver_volume_gal: 1200, receiver_fill_fraction: 0.30, receiver_density_lb_ft3: 37.2, recirculator_volume_gal: 900, recirculator_fill_fraction: 0.60, recirculator_density_lb_ft3: 42.4, piping_volume_ft3: 780, piping_liquid_fraction: 0.25, piping_density_lb_ft3: 40.0, threshold_lb: 10000 } };
REFRIGERATION_RENDERERS["ammonia-charge-inventory"] = _simpleRenderer({
  citation: "Citation: the ammonia charge inventory as IIAR practice writes it -- a per-vessel liquid sum, m = V x fill fraction x liquid density at that vessel's operating temperature -- against the 10,000 lb threshold quantity for anhydrous ammonia in OSHA PSM (29 CFR 1910.119, Appendix A) and the EPA RMP rule (40 CFR 68.130). Volumes, fill fractions, and densities are ENTERED; it does not read a P and ID, estimate pipe volume from a line list, or determine regulatory coverage. The plant's own charge calculation of record and the authority having jurisdiction govern.",
  example: ammoniaChargeInventoryExample.inputs,
  fields: [
    { key: "receiver_volume_gal", label: "High-pressure receiver volume (gal)", kind: "number" },
    { key: "receiver_fill_fraction", label: "Receiver liquid fill fraction (0-1)", kind: "number" },
    { key: "receiver_density_lb_ft3", label: "Receiver liquid density (lb/cu ft)", kind: "number" },
    { key: "recirculator_volume_gal", label: "Recirculator / low-temp vessel volume (gal)", kind: "number" },
    { key: "recirculator_fill_fraction", label: "Recirculator liquid fill fraction (0-1)", kind: "number" },
    { key: "recirculator_density_lb_ft3", label: "Recirculator liquid density (lb/cu ft)", kind: "number" },
    { key: "piping_volume_ft3", label: "Liquid and wet-return piping volume (cu ft)", kind: "number" },
    { key: "piping_liquid_fraction", label: "Piping average liquid fraction (0-1)", kind: "number" },
    { key: "piping_density_lb_ft3", label: "Piping liquid density (lb/cu ft)", kind: "number" },
    { key: "threshold_lb", label: "Threshold quantity (lb)", kind: "number", default: 10000 },
  ],
  outputs: [
    { key: "r", id: "aci-out-r", label: "Receiver", value: (r) => fmt(r.receiver_lb, 0) + " lb" },
    { key: "c", id: "aci-out-c", label: "Recirculator", value: (r) => fmt(r.recirculator_lb, 0) + " lb" },
    { key: "p", id: "aci-out-p", label: "Piping", value: (r) => fmt(r.piping_lb, 0) + " lb" },
    { key: "t", id: "aci-out-t", label: "Total system charge", value: (r) => fmt(r.total_lb, 0) + " lb (" + fmt(r.vessel_total_lb, 0) + " lb of it in the vessels)" },
    { key: "v", id: "aci-out-v", label: "Against the threshold", value: (r) => r.verdict },
    { key: "w", id: "aci-out-w", label: "Where the charge is", value: (r) => r.piping_verdict },
    { key: "a", id: "aci-out-a", label: "Volume that would cross it", value: (r) => r.additional_cuft_to_cross === 0 ? "(already over, or no piping basis entered)" : fmt(r.additional_cuft_to_cross, 0) + " cu ft more pipe volume at the entered piping fraction and density" },
    { key: "n", id: "aci-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAmmoniaChargeInventory,
});

// =====================================================================
// spec-v1485: Two-stage refrigeration interstage pressure.
// =====================================================================
//
// Compression work per stage scales with the pressure RATIO, so splitting the
// total ratio equally minimizes the total work -- and equal ratios put the
// interstage at the GEOMETRIC mean of the two absolute pressures, which is
// always below the arithmetic mean the eye reaches for.
// dims: in { low_psig: M L^-1 T^-2, high_psig: M L^-1 T^-2, intermediate_load_psig: M L^-1 T^-2 } out: { p_low_psia: M L^-1 T^-2, p_high_psia: M L^-1 T^-2, interstage_psia: M L^-1 T^-2, interstage_psig: M L^-1 T^-2, stage_ratio: dimensionless, single_stage_ratio: dimensionless, arithmetic_mean_psig: M L^-1 T^-2 }
export function computeTwoStageInterstagePressure({ low_psig = 0, high_psig = 0, intermediate_load_psig = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const p_low_psia = low_psig + _REF_ATM_PSIA;
  const p_high_psia = high_psig + _REF_ATM_PSIA;
  if (!(p_low_psia > 0)) return { error: "Suction pressure must be above a full vacuum (absolute pressure must be positive)." };
  if (!(p_high_psia > p_low_psia)) return { error: "Discharge pressure must be above suction pressure." };
  const interstage_psia = Math.sqrt(p_low_psia * p_high_psia);
  const interstage_psig = interstage_psia - _REF_ATM_PSIA;
  const stage_ratio = interstage_psia / p_low_psia;
  const single_stage_ratio = p_high_psia / p_low_psia;
  // The arithmetic mean, reported for contrast because it is what setting the
  // interstage "halfway" actually gives, and the stage imbalance it produces.
  const arithmetic_mean_psia = (p_low_psia + p_high_psia) / 2;
  const arithmetic_mean_psig = arithmetic_mean_psia - _REF_ATM_PSIA;
  const arithmetic_low_ratio = arithmetic_mean_psia / p_low_psia;
  const arithmetic_high_ratio = p_high_psia / arithmetic_mean_psia;
  const arithmetic_excess_psi = arithmetic_mean_psig - interstage_psig;
  // An intermediate-temperature load, if there is one, usually beats the
  // theoretical optimum: feeding it from the interstage is far more efficient
  // than pulling it down to the low stage and back up.
  const has_intermediate_load = intermediate_load_psig !== 0;
  const intermediate_psia = intermediate_load_psig + _REF_ATM_PSIA;
  const intermediate_in_range = has_intermediate_load && intermediate_psia > p_low_psia && intermediate_psia < p_high_psia;
  const intermediate_low_ratio = intermediate_in_range ? intermediate_psia / p_low_psia : 0;
  const intermediate_high_ratio = intermediate_in_range ? p_high_psia / intermediate_psia : 0;
  const intermediate_verdict = !has_intermediate_load
    ? "(no intermediate load entered)"
    : intermediate_in_range
      ? "an intermediate load at " + fmt(intermediate_load_psig, 1) + " psig splits the ratio " + fmt(intermediate_low_ratio, 2) + " on the booster against " + fmt(intermediate_high_ratio, 2) + " on the high stage -- set the interstage there instead if that load is substantial"
      : "the entered intermediate load is not between suction and discharge, so it cannot set the interstage";
  const two_stage_helps = single_stage_ratio > 1;
  if (![interstage_psia, interstage_psig, stage_ratio, single_stage_ratio, arithmetic_mean_psig, arithmetic_low_ratio, arithmetic_high_ratio].every(Number.isFinite)) return { error: "Interstage math is not a finite value." };
  return {
    p_low_psia, p_high_psia, interstage_psia, interstage_psig,
    stage_ratio, single_stage_ratio,
    arithmetic_mean_psig, arithmetic_low_ratio, arithmetic_high_ratio, arithmetic_excess_psi,
    has_intermediate_load, intermediate_in_range, intermediate_low_ratio, intermediate_high_ratio,
    intermediate_verdict, two_stage_helps,
    note: "The interstage pressure that splits a two-stage compression equally, and the stage imbalance that setting it anywhere else produces. Compression work per stage follows the pressure RATIO rather than the pressure difference, so the total work is least when both stages carry the same ratio -- and equal ratios put the interstage at the GEOMETRIC mean of the two absolute pressures, sqrt(P_low x P_high), always below the arithmetic mean. On a plant at 15 psig suction and 185 psig discharge the geometric mean is 62.3 psig while the arithmetic mean is 100, and setting the interstage at that halfway point loads the booster with a ratio of 3.86 against the high stage's 1.74, an imbalance that shows up as a hot booster discharge. The equal-ratio optimum is a starting point rather than an answer. Real plants move the interstage deliberately: where there is a substantial intermediate-temperature load, the interstage is set at that load's saturation pressure instead, because feeding it from the intermediate beats pulling it down to the low stage and compressing it all the way back. Compressor selection pulls the setting too, since machines come in discrete sizes and matching real equipment beats matching a theoretical optimum. Pressures are ENTERED as gauge and converted at 14.7 psi; it does not select compressors, size an intercooler, compute discharge temperature, or evaluate whether two-staging is warranted at all. The compressor manufacturer's selection data and the refrigeration engineer of record govern.",
  };
}
export const twoStageInterstagePressureExample = { inputs: { low_psig: 15, high_psig: 185, intermediate_load_psig: 0 } };
REFRIGERATION_RENDERERS["two-stage-interstage-pressure"] = _simpleRenderer({
  citation: "Citation: the equal-stage-ratio optimum for multistage compression as refrigeration practice states it -- P_interstage = sqrt(P_low x P_high) on ABSOLUTE pressures, which makes the ratio equal in both stages and minimizes total compression work. Gauge pressures are converted at the 14.7 psi standard atmosphere the trade uses. It does not select compressors, size the intercooler, or compute discharge temperature; the compressor manufacturer's selection data govern.",
  example: twoStageInterstagePressureExample.inputs,
  fields: [
    { key: "low_psig", label: "Suction (low-side) pressure (psig)", kind: "number", attrs: { step: "any" } },
    { key: "high_psig", label: "Discharge (high-side) pressure (psig)", kind: "number", attrs: { step: "any" } },
    { key: "intermediate_load_psig", label: "Intermediate load saturation pressure (psig, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "i", id: "tsi-out-i", label: "Optimum interstage", value: (r) => fmt(r.interstage_psig, 1) + " psig (" + fmt(r.interstage_psia, 1) + " psia)" },
    { key: "s", id: "tsi-out-s", label: "Ratio in each stage", value: (r) => fmt(r.stage_ratio, 2) + " to 1, equal in both" },
    { key: "o", id: "tsi-out-o", label: "Single-stage ratio for comparison", value: (r) => fmt(r.single_stage_ratio, 2) + " to 1 across " + fmt(r.p_low_psia, 1) + " to " + fmt(r.p_high_psia, 1) + " psia" },
    { key: "a", id: "tsi-out-a", label: "The arithmetic mean instead", value: (r) => fmt(r.arithmetic_mean_psig, 1) + " psig, " + fmt(r.arithmetic_excess_psi, 1) + " psi higher, splitting the ratio " + fmt(r.arithmetic_low_ratio, 2) + " on the booster against " + fmt(r.arithmetic_high_ratio, 2) + " on the high stage" },
    { key: "m", id: "tsi-out-m", label: "Intermediate load", value: (r) => r.intermediate_verdict },
    { key: "n", id: "tsi-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTwoStageInterstagePressure,
});

// =====================================================================
// spec-v1487: Refrigerated display case load and infiltration.
// =====================================================================
//
// The rule that makes this useful: every watt consumed INSIDE the refrigerated
// envelope is paid twice, once at the meter and once at the compressor. So the
// internal electric load is the only line that a retrofit touching no
// refrigeration equipment can move, and it moves both bills at once.
// dims: in { case_length_ft: L, infiltration_btuh_per_ft: M L T^-3, transmission_btuh_per_ft: M L T^-3, product_btuh: M L^2 T^-3, lights_w: M L^2 T^-3, fan_w: M L^2 T^-3, antisweat_w: M L^2 T^-3, antisweat_run_fraction: dimensionless, defrost_w: M L^2 T^-3, defrost_run_fraction: dimensionless, retrofit_lights_w: M L^2 T^-3, retrofit_antisweat_run_fraction: dimensionless } out: { infiltration_btuh: M L^2 T^-3, transmission_btuh: M L^2 T^-3, internal_btuh: M L^2 T^-3, total_btuh: M L^2 T^-3, internal_pct: dimensionless, retrofit_total_btuh: M L^2 T^-3, meter_saving_w: M L^2 T^-3 }
export function computeRefrigeratedCaseLoad({
  case_length_ft = 0, infiltration_btuh_per_ft = 0, transmission_btuh_per_ft = 0, product_btuh = 0,
  lights_w = 0, fan_w = 0, antisweat_w = 0, antisweat_run_fraction = 1,
  defrost_w = 0, defrost_run_fraction = 0,
  retrofit_lights_w = 0, retrofit_antisweat_run_fraction = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(case_length_ft > 0)) return { error: "Case length must be positive (ft)." };
  if (infiltration_btuh_per_ft < 0 || transmission_btuh_per_ft < 0 || product_btuh < 0) return { error: "Loads cannot be negative." };
  if (lights_w < 0 || fan_w < 0 || antisweat_w < 0 || defrost_w < 0) return { error: "Electric loads cannot be negative (W)." };
  if (antisweat_run_fraction < 0 || antisweat_run_fraction > 1) return { error: "Anti-sweat run fraction must be between 0 and 1." };
  if (defrost_run_fraction < 0 || defrost_run_fraction > 1) return { error: "Defrost run fraction must be between 0 and 1." };
  if (retrofit_antisweat_run_fraction < 0 || retrofit_antisweat_run_fraction > 1) return { error: "Retrofit anti-sweat run fraction must be between 0 and 1." };
  const infiltration_btuh = case_length_ft * infiltration_btuh_per_ft;
  const transmission_btuh = case_length_ft * transmission_btuh_per_ft;
  // Average electrical draw inside the box, each term at its own run fraction.
  const internal_electric_w = lights_w + fan_w + antisweat_w * antisweat_run_fraction + defrost_w * defrost_run_fraction;
  const lights_btuh = lights_w * _REF_BTUH_PER_WATT;
  const fan_btuh = fan_w * _REF_BTUH_PER_WATT;
  const antisweat_btuh = antisweat_w * antisweat_run_fraction * _REF_BTUH_PER_WATT;
  const defrost_btuh = defrost_w * defrost_run_fraction * _REF_BTUH_PER_WATT;
  const internal_btuh = internal_electric_w * _REF_BTUH_PER_WATT;
  const total_btuh = infiltration_btuh + transmission_btuh + product_btuh + internal_btuh;
  if (!(total_btuh > 0)) return { error: "Enter at least one load component above zero." };
  const internal_pct = internal_btuh / total_btuh * 100;
  const infiltration_pct = infiltration_btuh / total_btuh * 100;
  const infiltration_is_largest = infiltration_btuh >= transmission_btuh && infiltration_btuh >= product_btuh && infiltration_btuh >= internal_btuh;
  // The retrofit case: only the internal electric terms move. A retrofit
  // lights entry of zero means "no lighting change", not "no lights".
  const has_retrofit = retrofit_lights_w > 0 || retrofit_antisweat_run_fraction !== antisweat_run_fraction;
  const retrofit_lights_actual_w = retrofit_lights_w > 0 ? retrofit_lights_w : lights_w;
  const retrofit_internal_w = retrofit_lights_actual_w + fan_w + antisweat_w * retrofit_antisweat_run_fraction + defrost_w * defrost_run_fraction;
  const retrofit_internal_btuh = retrofit_internal_w * _REF_BTUH_PER_WATT;
  const retrofit_total_btuh = infiltration_btuh + transmission_btuh + product_btuh + retrofit_internal_btuh;
  const load_reduction_btuh = total_btuh - retrofit_total_btuh;
  const meter_saving_w = internal_electric_w - retrofit_internal_w;
  const retrofit_verdict = !has_retrofit
    ? "(no retrofit entered)"
    : "internal electric falls to " + fmt(retrofit_internal_btuh, 0) + " BTU/h and the case load to " + fmt(retrofit_total_btuh, 0) + " BTU/h, a " + fmt(load_reduction_btuh, 0) + " BTU/h reduction -- and the store also stops paying for " + fmt(meter_saving_w, 0) + " W at the meter, so the saving is collected twice";
  if (![infiltration_btuh, transmission_btuh, internal_btuh, total_btuh, internal_pct, retrofit_total_btuh, meter_saving_w].every(Number.isFinite)) return { error: "Case load math is not a finite value." };
  return {
    infiltration_btuh, transmission_btuh, product_btuh,
    lights_btuh, fan_btuh, antisweat_btuh, defrost_btuh,
    internal_electric_w, internal_btuh, total_btuh,
    internal_pct, infiltration_pct, infiltration_is_largest,
    has_retrofit, retrofit_internal_w, retrofit_internal_btuh, retrofit_total_btuh,
    load_reduction_btuh, meter_saving_w, retrofit_verdict,
    note: "The refrigeration load of a display case, split into the terms that make it up, with the internal electric load priced as what it is: heat. Every watt consumed inside the refrigerated envelope has to be removed twice -- once as electricity paid at the meter, once as heat paid at the compressor -- at 3.412 BTU/h per watt. Case lights, evaporator fan motors, anti-sweat heaters, and defrost therefore cost roughly their own wattage again in refrigeration, and on a low-temperature case the compressor's poor efficiency at low suction makes the second payment worse than the first. That is why LED retrofits and anti-sweat controls pay back faster in refrigeration than the lighting arithmetic alone suggests, and it is why the retrofit line here reports the meter saving and the load reduction side by side. On an open vertical case the infiltration term through the air curtain is usually the largest single line and the hardest to improve without doors, which is the real argument for doors -- but which of the four terms is largest depends on the case, so this reports the split rather than asserting it. Infiltration and transmission are ENTERED per foot from the case manufacturer's published data, because they depend on the air curtain design, the discharge velocity, and the store's own humidity in ways no per-foot rule of thumb captures. It does not model the air curtain, size the evaporator or the rack, or compute the compressor power at the suction condition. The case manufacturer's rated load and the refrigeration engineer of record govern.",
  };
}
export const refrigeratedCaseLoadExample = { inputs: { case_length_ft: 12, infiltration_btuh_per_ft: 780, transmission_btuh_per_ft: 95, product_btuh: 1200, lights_w: 240, fan_w: 310, antisweat_w: 180, antisweat_run_fraction: 0.60, defrost_w: 0, defrost_run_fraction: 0, retrofit_lights_w: 90, retrofit_antisweat_run_fraction: 0.20 } };
REFRIGERATION_RENDERERS["refrigerated-case-load"] = _simpleRenderer({
  citation: "Citation: the display-case load summed as ASHRAE Refrigeration practice writes it -- infiltration plus transmission plus product plus internal electric -- with every internal watt converted to refrigeration load at 3.412 BTU/h per W, exact by definition. Infiltration and transmission are ENTERED per foot from the case manufacturer's published data. It does not model the air curtain, size the evaporator or rack, or compute compressor power at the suction condition; the case manufacturer's rated load governs.",
  example: refrigeratedCaseLoadExample.inputs,
  fields: [
    { key: "case_length_ft", label: "Case length (ft)", kind: "number" },
    { key: "infiltration_btuh_per_ft", label: "Infiltration (BTU/h per ft)", kind: "number" },
    { key: "transmission_btuh_per_ft", label: "Transmission (BTU/h per ft)", kind: "number" },
    { key: "product_btuh", label: "Product load (BTU/h)", kind: "number" },
    { key: "lights_w", label: "Case lights (W)", kind: "number" },
    { key: "fan_w", label: "Evaporator fans (W)", kind: "number" },
    { key: "antisweat_w", label: "Anti-sweat heaters (W)", kind: "number" },
    { key: "antisweat_run_fraction", label: "Anti-sweat run fraction (0-1)", kind: "number", default: 1 },
    { key: "defrost_w", label: "Defrost heat into the case (W)", kind: "number" },
    { key: "defrost_run_fraction", label: "Defrost run fraction (0-1)", kind: "number" },
    { key: "retrofit_lights_w", label: "Retrofit lights (W, 0 to leave unchanged)", kind: "number" },
    { key: "retrofit_antisweat_run_fraction", label: "Retrofit anti-sweat run fraction (0-1)", kind: "number" },
  ],
  outputs: [
    { key: "i", id: "rcl-out-i", label: "Infiltration", value: (r) => fmt(r.infiltration_btuh, 0) + " BTU/h (" + fmt(r.infiltration_pct, 0) + "% of the load" + (r.infiltration_is_largest ? ", the largest single term)" : ")") },
    { key: "t", id: "rcl-out-t", label: "Transmission", value: (r) => fmt(r.transmission_btuh, 0) + " BTU/h" },
    { key: "p", id: "rcl-out-p", label: "Product", value: (r) => fmt(r.product_btuh, 0) + " BTU/h" },
    { key: "e", id: "rcl-out-e", label: "Internal electric", value: (r) => fmt(r.internal_electric_w, 0) + " W average = " + fmt(r.internal_btuh, 0) + " BTU/h, " + fmt(r.internal_pct, 0) + "% of the case load" },
    { key: "o", id: "rcl-out-o", label: "Total case load", value: (r) => fmt(r.total_btuh, 0) + " BTU/h" },
    { key: "r", id: "rcl-out-r", label: "With the retrofit", value: (r) => r.retrofit_verdict },
    { key: "n", id: "rcl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRefrigeratedCaseLoad,
});

// =====================================================================
// spec-v1488: Freezer slab underfloor heat and frost heave.
// =====================================================================
//
// Slow, small, and non-negotiable: a few watts per square foot held under the
// insulation so the frost front never starts. The insulation above is doing
// the real work, which is why the answer is a modest system that has to run
// reliably rather than a large one.
// dims: in { floor_area_ft2: L^2, room_temp_f: T, target_soil_temp_f: T, u_factor: M T^-4, tube_output_btuh_per_ft: M L T^-3, energy_rate_per_kwh: dimensionless, hours_per_year: T } out: { td_f: T, heat_loss_btuh: M L^2 T^-3, watts: M L^2 T^-3, watts_per_ft2: M T^-3, tube_length_ft: L, spacing_in: L, annual_kwh: M L^2 T^-2, annual_cost: dimensionless }
export function computeFreezerUnderfloorHeat({
  floor_area_ft2 = 0, room_temp_f = 0, target_soil_temp_f = 0, u_factor = 0,
  tube_output_btuh_per_ft = 0, energy_rate_per_kwh = 0, hours_per_year = 8760,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(floor_area_ft2 > 0)) return { error: "Floor area must be positive (sq ft)." };
  if (!(u_factor > 0)) return { error: "The below-slab assembly U-factor must be positive." };
  if (!(target_soil_temp_f > room_temp_f)) return { error: "The target soil temperature must be above the room temperature -- otherwise the slab is not losing heat downward and there is nothing to make up." };
  if (hours_per_year < 0 || hours_per_year > 8784) return { error: "Hours per year must be between 0 and 8,784." };
  if (energy_rate_per_kwh < 0) return { error: "The energy rate cannot be negative." };
  if (tube_output_btuh_per_ft < 0) return { error: "Tube or cable output cannot be negative (BTU/h per ft)." };
  const td_f = target_soil_temp_f - room_temp_f;
  const heat_loss_btuh = u_factor * floor_area_ft2 * td_f;
  const watts = heat_loss_btuh / _REF_BTUH_PER_WATT;
  const watts_per_ft2 = watts / floor_area_ft2;
  // Tube length from the loop's output per foot; the on-centre spacing is the
  // area each foot of tube has to serve, converted to inches.
  const has_tube_basis = tube_output_btuh_per_ft > 0;
  const tube_length_ft = has_tube_basis ? heat_loss_btuh / tube_output_btuh_per_ft : 0;
  const spacing_in = has_tube_basis && tube_length_ft > 0 ? floor_area_ft2 / tube_length_ft * 12 : 0;
  const annual_kwh = watts / 1000 * hours_per_year;
  const annual_cost = annual_kwh * energy_rate_per_kwh;
  // The design constraint that matters: the soil has to stay above freezing.
  const soil_above_freezing = target_soil_temp_f > 32;
  const freezing_verdict = soil_above_freezing
    ? "the target holds the soil " + fmt(target_soil_temp_f - 32, 1) + " degF above freezing, so no ice lens forms"
    : "the target is at or BELOW 32 degF -- soil moisture in that zone can still freeze and heave, which is the failure this system exists to prevent";
  if (![td_f, heat_loss_btuh, watts, watts_per_ft2, tube_length_ft, spacing_in, annual_kwh, annual_cost].every(Number.isFinite)) return { error: "Underfloor heat math is not a finite value." };
  return {
    td_f, heat_loss_btuh, watts, watts_per_ft2,
    has_tube_basis, tube_length_ft, spacing_in,
    annual_kwh, annual_cost, soil_above_freezing, freezing_verdict,
    note: "The underfloor heat a freezer slab needs to keep the ground beneath it from freezing, and what running it costs. The mechanism is slow: a freezer pulls heat out of the ground continuously, the frost line advances downward over months and years, and when soil moisture in that zone freezes it expands. The resulting heave is not uniform, so the slab cracks, and by the time it is visible the ice lens is well established. Underfloor heat holds a thin layer of soil above 32 degF so the front never starts. Two sizing facts follow. The load is small -- typically well under a watt per square foot -- because the insulation above it is doing the real work, so the answer is a modest system that must run reliably rather than a large one. And the design is fail-conscious: an electric grid cast into the slab cannot be repaired without demolishing the freezer, which is why glycol tubing in a sand bed with accessible headers, or a ventilated air system, is preferred on large boxes. The energy is continuous and it adds up, so the annual figure is reported next to the capacity -- and the alternative it should be compared against is a slab replacement, which is not a maintenance item. A steady-state screen using an ENTERED assembly U-factor: it does not model transient frost penetration, soil moisture, or groundwater, size the insulation, or design the header and manifold layout. The geotechnical report, the insulation design, and the refrigeration engineer of record govern.",
  };
}
export const freezerUnderfloorHeatExample = { inputs: { floor_area_ft2: 6000, room_temp_f: -10, target_soil_temp_f: 45, u_factor: 0.045, tube_output_btuh_per_ft: 12, energy_rate_per_kwh: 0.09, hours_per_year: 8760 } };
REFRIGERATION_RENDERERS["freezer-underfloor-heat"] = _simpleRenderer({
  citation: "Citation: the steady-state below-slab heat loss Q = U x A x TD as freezer floor practice writes it, with the frost-heave mechanism as ASHRAE Refrigeration describes it -- soil moisture freezing beneath a low-temperature room expands and heaves the slab, so the soil is held above 32 degF. Watts convert at 3.412 BTU/h per W, exact by definition. The assembly U-factor is ENTERED; it does not model transient frost penetration, soil moisture, or groundwater, and it does not size the insulation. The geotechnical report and the refrigeration engineer of record govern.",
  example: freezerUnderfloorHeatExample.inputs,
  fields: [
    { key: "floor_area_ft2", label: "Freezer floor area (sq ft)", kind: "number" },
    { key: "room_temp_f", label: "Room temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "target_soil_temp_f", label: "Target soil temperature under the slab (°F)", kind: "number", attrs: { step: "any" } },
    { key: "u_factor", label: "Below-slab assembly U-factor (BTU/h per sq ft per °F)", kind: "number" },
    { key: "tube_output_btuh_per_ft", label: "Tube or cable output (BTU/h per ft, 0 to skip)", kind: "number" },
    { key: "energy_rate_per_kwh", label: "Energy rate ($/kWh)", kind: "number" },
    { key: "hours_per_year", label: "Operating hours per year", kind: "number", default: 8760 },
  ],
  outputs: [
    { key: "d", id: "fuh-out-d", label: "Temperature difference", value: (r) => fmt(r.td_f, 1) + " °F across the below-slab assembly" },
    { key: "q", id: "fuh-out-q", label: "Underfloor heat required", value: (r) => fmt(r.heat_loss_btuh, 0) + " BTU/h = " + fmt(r.watts, 0) + " W" },
    { key: "w", id: "fuh-out-w", label: "Intensity", value: (r) => fmt(r.watts_per_ft2, 2) + " W per sq ft" },
    { key: "g", id: "fuh-out-g", label: "Grid", value: (r) => r.has_tube_basis ? fmt(r.tube_length_ft, 0) + " ft of tube or cable, roughly " + fmt(r.spacing_in, 0) + " in on centre" : "(no tube or cable output entered)" },
    { key: "e", id: "fuh-out-e", label: "Annual energy", value: (r) => fmt(r.annual_kwh, 0) + " kWh, $" + fmt(r.annual_cost, 0) + " at the entered rate" },
    { key: "f", id: "fuh-out-f", label: "Against freezing", value: (r) => r.freezing_verdict },
    { key: "n", id: "fuh-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFreezerUnderfloorHeat,
});

// =====================================================================
// spec-v1489: Air-cooled and evaporative condenser TD and head pressure.
// =====================================================================
//
// The basis is the whole tile. An air-cooled condenser's TD is measured from
// DRY bulb; an evaporative condenser's from WET bulb, which in most US summers
// runs 15 to 25 degF below it. Confusing the two produces a diagnosis wrong by
// the entire wet-bulb depression, so the basis is a select and the label says
// which one the answer used.
// dims: in { ambient_f: T, design_td_f: T, alternate_ambient_f: T, alternate_td_f: T, power_pct_per_deg_f: dimensionless, compressor_hp: M L^2 T^-3, annual_hours: T, energy_rate_per_kwh: dimensionless } out: { condensing_f: T, alternate_condensing_f: T, condensing_change_f: T, power_change_pct: dimensionless, annual_kwh_change: M L^2 T^-2, annual_cost_change: dimensionless }
export function computeCondenserTdHeadPressure({
  condenser_type = "air_cooled", ambient_f = 0, design_td_f = 0,
  alternate_ambient_f = 0, alternate_td_f = 0,
  power_pct_per_deg_f = 1.75, compressor_hp = 0, annual_hours = 0, energy_rate_per_kwh = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(design_td_f > 0)) return { error: "Design TD must be positive (degF)." };
  if (power_pct_per_deg_f < 0) return { error: "Compressor power sensitivity cannot be negative (% per degF)." };
  if (compressor_hp < 0 || annual_hours < 0 || energy_rate_per_kwh < 0) return { error: "Compressor power, hours, and rate cannot be negative." };
  if (annual_hours > 8784) return { error: "Annual hours cannot exceed 8,784." };
  const is_evaporative = condenser_type === "evaporative";
  const basis_label = is_evaporative ? "WET bulb" : "DRY bulb";
  const condensing_f = ambient_f + design_td_f;
  // The alternative case: a different ambient, a different TD, or both. A zero
  // alternate TD means "same TD", not "no TD".
  const alt_td = alternate_td_f > 0 ? alternate_td_f : design_td_f;
  const has_alternate = alternate_ambient_f !== 0 || alternate_td_f > 0;
  const alternate_condensing_f = alternate_ambient_f !== 0 ? alternate_ambient_f + alt_td : ambient_f + alt_td;
  const condensing_change_f = alternate_condensing_f - condensing_f;
  const power_change_pct = condensing_change_f * power_pct_per_deg_f;
  const condensing_falls = condensing_change_f < 0;
  // Price the change, if a machine and a duty cycle were entered.
  const has_cost_basis = compressor_hp > 0 && annual_hours > 0;
  const compressor_kw = compressor_hp * _REF_KW_PER_HP;
  const annual_kwh_change = has_cost_basis ? compressor_kw * (power_change_pct / 100) * annual_hours : 0;
  const annual_cost_change = annual_kwh_change * energy_rate_per_kwh;
  const alternate_verdict = !has_alternate
    ? "(no alternative case entered)"
    : condensing_falls
      ? "condensing falls " + fmt(-condensing_change_f, 1) + " degF to " + fmt(alternate_condensing_f, 1) + " degF, worth roughly " + fmt(-power_change_pct, 1) + "% LESS compressor power for the same refrigeration effect"
      : condensing_change_f > 0
        ? "condensing rises " + fmt(condensing_change_f, 1) + " degF to " + fmt(alternate_condensing_f, 1) + " degF, roughly " + fmt(power_change_pct, 1) + "% MORE compressor power for the same refrigeration effect"
        : "condensing is unchanged at " + fmt(alternate_condensing_f, 1) + " degF";
  const cost_verdict = !has_cost_basis
    ? "(no compressor power or annual hours entered)"
    : annual_kwh_change < 0
      ? "$" + fmt(-annual_cost_change, 0) + " a year SAVED, " + fmt(-annual_kwh_change, 0) + " kWh"
      : annual_kwh_change > 0
        ? "$" + fmt(annual_cost_change, 0) + " a year MORE, " + fmt(annual_kwh_change, 0) + " kWh"
        : "no change in annual energy";
  if (![condensing_f, alternate_condensing_f, condensing_change_f, power_change_pct, annual_kwh_change, annual_cost_change].every(Number.isFinite)) return { error: "Condenser TD math is not a finite value." };
  return {
    is_evaporative, basis_label, condensing_f, design_td_f,
    has_alternate, alternate_condensing_f, condensing_change_f, power_change_pct, condensing_falls,
    has_cost_basis, annual_kwh_change, annual_cost_change,
    alternate_verdict, cost_verdict,
    note: "The condensing temperature a condenser holds at a given ambient and design TD, and what moving that TD is worth in compressor power. The basis is the part that is most often got wrong: an air-cooled condenser's TD is measured from the DRY bulb, an evaporative condenser's from the WET bulb, and in most US summers the wet bulb runs well below the dry bulb -- so an evaporative unit at a wider TD can still condense cooler than an air-cooled unit at a tighter one. Reading a TD against the wrong basis produces a diagnosis off by the entire wet-bulb depression, which is why the basis is selected here and the answer names it. The leverage follows from a linearity and a sensitivity that are not the same thing: condenser capacity is roughly linear in TD, but compressor power responds to condensing TEMPERATURE, at very roughly 1.5 to 2 percent per degF over the ordinary range. So adding condenser surface until the TD drops a few degrees cuts compressor power by that much continuously, for the life of the plant -- which is why a dirty or undersized condenser is expensive rather than merely annoying, and why floating head pressure, letting condensing follow ambient down instead of holding it high, is the standard energy retrofit. The power sensitivity is ENTERED because it depends on the refrigerant, the suction condition, and the compressor; the default is a mid-range screening value. This does not size the condenser, compute the heat of rejection, look up saturation pressure, or establish the minimum head pressure the expansion valve needs. The condenser manufacturer's rated capacity at the design condition and the compressor's own performance data govern.",
  };
}
export const condenserTdHeadPressureExample = { inputs: { condenser_type: "evaporative", ambient_f: 78, design_td_f: 20, alternate_ambient_f: 78, alternate_td_f: 15, power_pct_per_deg_f: 1.75, compressor_hp: 300, annual_hours: 6000, energy_rate_per_kwh: 0.09 } };
REFRIGERATION_RENDERERS["condenser-td-head-pressure"] = _simpleRenderer({
  citation: "Citation: condensing temperature = ambient + TD as condenser practice writes it, with the basis distinction ASHRAE Refrigeration states -- air-cooled TD from the DRY bulb, evaporative TD from the WET bulb. The compressor power sensitivity to condensing temperature is ENTERED (commonly 1.5 to 2 percent per degF) because it depends on refrigerant, suction condition, and machine. Horsepower converts at 0.745699872 kW/hp. It does not size the condenser, compute the heat of rejection, or look up saturation pressure; reading an installed system's approach is a service diagnostic, and setting the low-ambient minimum head is a separate design question.",
  example: condenserTdHeadPressureExample.inputs,
  fields: [
    { key: "condenser_type", label: "Condenser type", kind: "select", options: [{ value: "air_cooled", label: "Air-cooled (TD from dry bulb)" }, { value: "evaporative", label: "Evaporative (TD from wet bulb)" }], default: "air_cooled" },
    { key: "ambient_f", label: "Design ambient on that basis (°F)", kind: "number", attrs: { step: "any" } },
    { key: "design_td_f", label: "Design TD (°F)", kind: "number" },
    { key: "alternate_ambient_f", label: "Alternative ambient (°F, 0 to reuse the design ambient)", kind: "number", attrs: { step: "any" } },
    { key: "alternate_td_f", label: "Alternative TD (°F, 0 to reuse the design TD)", kind: "number" },
    { key: "power_pct_per_deg_f", label: "Compressor power sensitivity (% per °F of condensing)", kind: "number", default: 1.75 },
    { key: "compressor_hp", label: "Compressor power (hp, 0 to skip the cost)", kind: "number" },
    { key: "annual_hours", label: "Annual operating hours", kind: "number" },
    { key: "energy_rate_per_kwh", label: "Energy rate ($/kWh)", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "ctd-out-b", label: "TD basis", value: (r) => "measured from the " + r.basis_label },
    { key: "c", id: "ctd-out-c", label: "Condensing temperature", value: (r) => fmt(r.condensing_f, 1) + " °F at a " + fmt(r.design_td_f, 1) + " °F TD" },
    { key: "a", id: "ctd-out-a", label: "Alternative case", value: (r) => r.alternate_verdict },
    { key: "e", id: "ctd-out-e", label: "Annual energy effect", value: (r) => r.cost_verdict },
    { key: "n", id: "ctd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCondenserTdHeadPressure,
});

// =====================================================================
// spec-v1490: Refrigerant receiver pump-down capacity.
// =====================================================================
//
// The fill limit is the whole point. A receiver filled solid with liquid and
// then warmed has no vapor space to absorb the liquid's expansion, and the
// pressure rise is enormous and fast -- a vessel rupture rather than a relief
// event if there is no relief path. So the limit is evaluated at the WARMEST
// liquid temperature the receiver could see, not at operating temperature.
// dims: in { receiver_volume_gal: L^3, existing_liquid_gal: L^3, fill_limit_fraction: dimensionless, liquid_density_lb_ft3: M L^-3, charge_to_pump_lb: M } out: { density_lb_gal: M L^-3, available_gal: L^3, required_gal: L^3, resulting_fill_pct: dimensionless, max_charge_lb: M, spare_gal: L^3 }
export function computeReceiverPumpdownCapacity({
  receiver_volume_gal = 0, existing_liquid_gal = 0, fill_limit_fraction = 0.8,
  liquid_density_lb_ft3 = 0, charge_to_pump_lb = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(receiver_volume_gal > 0)) return { error: "Receiver volume must be positive (gal)." };
  if (existing_liquid_gal < 0) return { error: "Existing liquid volume cannot be negative (gal)." };
  if (existing_liquid_gal > receiver_volume_gal) return { error: "Existing liquid cannot exceed the receiver's volume." };
  if (!(fill_limit_fraction > 0 && fill_limit_fraction <= 1)) return { error: "The fill limit must be above 0 and at most 1." };
  if (!(liquid_density_lb_ft3 > 0)) return { error: "Liquid density at the warmest expected temperature must be positive (lb/cu ft)." };
  if (charge_to_pump_lb < 0) return { error: "The charge to be pumped down cannot be negative (lb)." };
  const density_lb_gal = liquid_density_lb_ft3 / _REF_GAL_PER_CUFT;
  const limit_gal = receiver_volume_gal * fill_limit_fraction;
  const available_gal = limit_gal - existing_liquid_gal;
  const already_over_limit = available_gal < 0;
  const required_gal = charge_to_pump_lb / density_lb_gal;
  const resulting_gal = existing_liquid_gal + required_gal;
  const resulting_fill_pct = resulting_gal / receiver_volume_gal * 100;
  const fits = required_gal <= available_gal;
  const spare_gal = available_gal - required_gal;
  const max_charge_lb = Math.max(0, available_gal) * density_lb_gal;
  const verdict = already_over_limit
    ? "the receiver is ALREADY above its " + fmt(fill_limit_fraction * 100, 0) + "% fill limit with " + fmt(existing_liquid_gal, 0) + " gal in it -- nothing can be pumped into it"
    : fits
      ? "IT FITS: " + fmt(required_gal, 0) + " gal into " + fmt(available_gal, 0) + " gal available, ending at " + fmt(resulting_fill_pct, 1) + "% full with " + fmt(spare_gal, 0) + " gal to spare"
      : "IT DOES NOT FIT: " + fmt(required_gal, 0) + " gal against " + fmt(available_gal, 0) + " gal available, " + fmt(-spare_gal, 0) + " gal short -- the job needs a recovery vessel, and venting is a reportable release";
  if (![density_lb_gal, available_gal, required_gal, resulting_fill_pct, max_charge_lb].every(Number.isFinite)) return { error: "Receiver pump-down math is not a finite value." };
  return {
    density_lb_gal, limit_gal, available_gal, required_gal, resulting_gal,
    resulting_fill_pct, fits, already_over_limit, spare_gal, max_charge_lb,
    fill_limit_fraction, verdict,
    note: "Whether a plant's receiver will hold the charge a pump-down puts into it, answered before the shutdown rather than during it. The fill limit is the whole point. A receiver filled solid with liquid and then warmed has no vapor space to absorb the liquid's thermal expansion, and the resulting pressure rise is enormous and fast -- hydrostatic overpressure, which is a vessel rupture rather than a relief-valve event where there is no relief path on the liquid side. The customary 80 percent limit is therefore evaluated at the WARMEST liquid temperature the receiver could credibly see, not at operating temperature, because the dangerous case is a shut-down plant sitting in a hot machine room on a summer afternoon. The practical use is a go or no-go. A plant that discovers mid-shutdown that its receiver will not take the pumped-down charge has to either transfer to a rented recovery vessel or vent, and venting ammonia is a reportable release. The same arithmetic run backwards gives the maximum charge the receiver can accept, so a service plan can be built around what the vessel actually holds. Density is ENTERED at the warm condition because it is the input the answer is most sensitive to. This sizes no relief valve and does not check the receiver's pressure rating or its relief path. It is also not the portable recovery-cylinder rule, which covers a DOT cylinder on a scale where the basis is stamped water capacity rather than a plant vessel's gallons. IIAR 2, ASHRAE 15, and the vessel's own data plate govern.",
  };
}
export const receiverPumpdownCapacityExample = { inputs: { receiver_volume_gal: 1000, existing_liquid_gal: 220, fill_limit_fraction: 0.80, liquid_density_lb_ft3: 36.9, charge_to_pump_lb: 2400 } };
REFRIGERATION_RENDERERS["receiver-pumpdown-capacity"] = _simpleRenderer({
  citation: "Citation: the receiver fill-limit check as IIAR 2 / ASHRAE 15 practice writes it -- available volume = receiver volume x fill limit - existing liquid, evaluated at the WARMEST expected liquid temperature, because the hazard is hydrostatic overpressure from liquid thermal expansion in a vessel with no vapor space. The customary limit is 80 percent and is ENTERED. Gallons convert at 1728/231 cu in per gallon, exact by definition. It does not size a relief valve or check the vessel's pressure rating, and it is not the portable DOT recovery-cylinder rule, whose basis is stamped water capacity. The vessel data plate and the authority having jurisdiction govern.",
  example: receiverPumpdownCapacityExample.inputs,
  fields: [
    { key: "receiver_volume_gal", label: "Receiver volume (gal)", kind: "number" },
    { key: "existing_liquid_gal", label: "Liquid already in the receiver (gal)", kind: "number" },
    { key: "fill_limit_fraction", label: "Maximum fill limit (0-1)", kind: "number", default: 0.8 },
    { key: "liquid_density_lb_ft3", label: "Liquid density at the warmest expected temperature (lb/cu ft)", kind: "number" },
    { key: "charge_to_pump_lb", label: "Charge to be pumped down (lb)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "rpc-out-d", label: "Liquid density", value: (r) => fmt(r.density_lb_gal, 2) + " lb per gallon at the entered temperature" },
    { key: "a", id: "rpc-out-a", label: "Available at the fill limit", value: (r) => fmt(r.available_gal, 0) + " gal (the limit is " + fmt(r.limit_gal, 0) + " gal)" },
    { key: "r", id: "rpc-out-r", label: "The charge occupies", value: (r) => fmt(r.required_gal, 0) + " gal, taking the receiver to " + fmt(r.resulting_fill_pct, 1) + "% full" },
    { key: "v", id: "rpc-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "m", id: "rpc-out-m", label: "Maximum this receiver can accept", value: (r) => fmt(r.max_charge_lb, 0) + " lb" },
    { key: "n", id: "rpc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeReceiverPumpdownCapacity,
});

// =====================================================================
// spec-v1491: Secondary coolant (glycol) loop flow and pump penalty.
// =====================================================================
//
// The flow correction is the part that gets skipped. Water's 500 constant
// assumes water's density and specific heat; a glycol solution's SG x cp is
// below 1, so the same duty at the same delta-T needs MORE flow -- and the
// fluid factor this returns, 500 x SG x cp, is exactly the input that
// hydronic-gpm-deltat asks the user to supply.
// dims: in { load_btuh: M L^2 T^-3, delta_t_f: T, glycol_cp: dimensionless, glycol_sg: dimensionless, head_ft: L, pump_efficiency: dimensionless, chiller_approach_f: T, coil_approach_f: T, compressor_pct_per_deg_f: dimensionless, annual_hours: T, energy_rate_per_kwh: dimensionless } out: { water_gpm: L^3 T^-1, glycol_gpm: L^3 T^-1, flow_increase_pct: dimensionless, fluid_factor: dimensionless, pump_bhp: M L^2 T^-3, annual_kwh: M L^2 T^-2, total_approach_f: T, compressor_penalty_pct: dimensionless }
export function computeSecondaryGlycolLoop({
  load_btuh = 0, delta_t_f = 0, glycol_cp = 1, glycol_sg = 1,
  head_ft = 0, pump_efficiency = 0.7,
  chiller_approach_f = 0, coil_approach_f = 0, compressor_pct_per_deg_f = 2.2,
  annual_hours = 0, energy_rate_per_kwh = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_btuh > 0)) return { error: "Load must be positive (BTU/h)." };
  if (!(delta_t_f > 0)) return { error: "Loop delta-T must be positive (degF)." };
  if (!(glycol_cp > 0)) return { error: "Glycol specific heat must be positive." };
  if (!(glycol_sg > 0)) return { error: "Glycol specific gravity must be positive." };
  if (!(pump_efficiency > 0 && pump_efficiency <= 1)) return { error: "Pump efficiency must be above 0 and at most 1." };
  if (head_ft < 0) return { error: "Loop head cannot be negative (ft)." };
  if (chiller_approach_f < 0 || coil_approach_f < 0) return { error: "Approach temperatures cannot be negative (degF)." };
  if (compressor_pct_per_deg_f < 0) return { error: "Compressor power sensitivity cannot be negative (% per degF)." };
  if (annual_hours < 0 || annual_hours > 8784) return { error: "Annual hours must be between 0 and 8,784." };
  if (energy_rate_per_kwh < 0) return { error: "The energy rate cannot be negative." };
  // The water-basis flow, then the same duty corrected for the fluid actually
  // in the pipe. The correction is SG x cp, not one or the other.
  const water_gpm = load_btuh / (_REF_WATER_FLOW_CONST * delta_t_f);
  const fluid_factor = _REF_WATER_FLOW_CONST * glycol_sg * glycol_cp;
  const glycol_gpm = load_btuh / (fluid_factor * delta_t_f);
  const flow_increase_pct = (glycol_gpm / water_gpm - 1) * 100;
  const tons = load_btuh / 12000;
  // Pump power at the glycol flow, carrying the solution's specific gravity.
  const pump_bhp = glycol_gpm * head_ft * glycol_sg / (_REF_PUMP_HP_CONST * pump_efficiency);
  const pump_kw = pump_bhp * _REF_KW_PER_HP;
  const annual_kwh = pump_kw * annual_hours;
  const annual_cost = annual_kwh * energy_rate_per_kwh;
  // The temperature penalty: the secondary loop adds an approach at the
  // chiller AND at the coil, and the compressor pays for both.
  const total_approach_f = chiller_approach_f + coil_approach_f;
  const compressor_penalty_pct = total_approach_f * compressor_pct_per_deg_f;
  const has_approach = total_approach_f > 0;
  const approach_verdict = has_approach
    ? "the loop adds " + fmt(total_approach_f, 1) + " degF of approach (" + fmt(chiller_approach_f, 1) + " at the chiller, " + fmt(coil_approach_f, 1) + " at the coil), so the compressor runs that much colder on suction than a direct-expansion system serving the same room -- roughly " + fmt(compressor_penalty_pct, 0) + "% more compressor power"
    : "(no chiller or coil approach entered)";
  const pump_verdict = head_ft > 0
    ? fmt(pump_bhp, 1) + " bhp of pumping that a direct-expansion system would not have"
    : "(no loop head entered)";
  if (![water_gpm, glycol_gpm, flow_increase_pct, fluid_factor, pump_bhp, annual_kwh, total_approach_f, compressor_penalty_pct].every(Number.isFinite)) return { error: "Secondary loop math is not a finite value." };
  return {
    water_gpm, glycol_gpm, flow_increase_pct, fluid_factor, tons,
    pump_bhp, pump_kw, annual_kwh, annual_cost, pump_verdict,
    total_approach_f, compressor_penalty_pct, has_approach, approach_verdict,
    note: "The flow a secondary glycol loop actually needs, the pumping that costs, and the temperature penalty the loop imposes on the compressor. The flow correction is the part that gets skipped. Water's familiar 500 constant is 8.33 lb per gallon times 60 minutes per hour times water's specific heat of 1.0, so it is water's number: a propylene glycol solution has a specific heat well below one and a specific gravity slightly above it, and the product SG x cp is what corrects the constant. Because that product is below one, the same duty at the same delta-T needs MORE flow, not less -- around 13 percent more for a 40 percent propylene glycol solution. More flow at higher viscosity is more head, and pump power climbs faster than the flow does. The fluid factor reported here, 500 x SG x cp, is exactly the number the hydronic flow-from-load-and-delta-T calculator asks a user to supply, so what that one takes on faith is computed here. The temperature penalty compounds separately from the flow. A direct-expansion coil sees the refrigerant; a glycol coil sees glycol that is itself warmer than the refrigerant by the chiller's approach, so the evaporator must run several degrees colder for the same room condition, and every one of those degrees is compressor power. The design case for a secondary loop is charge reduction and safety -- fewer pounds of ammonia, confined to a machine room -- and that is often the right trade. This puts its operating cost in front of the designer rather than leaving it implicit. Fluid properties, head, and the approach temperatures are ENTERED; it does not select the fluid, compute viscosity or the pressure drop, size the pump or the chiller, or evaluate freeze protection, which is what glycol-mix is for.",
  };
}
export const secondaryGlycolLoopExample = { inputs: { load_btuh: 1200000, delta_t_f: 10, glycol_cp: 0.85, glycol_sg: 1.04, head_ft: 70, pump_efficiency: 0.70, chiller_approach_f: 6, coil_approach_f: 4, compressor_pct_per_deg_f: 2.2, annual_hours: 6000, energy_rate_per_kwh: 0.09 } };
REFRIGERATION_RENDERERS["secondary-glycol-loop"] = _simpleRenderer({
  citation: "Citation: the water-side transport relation GPM = Q / (500 x SG x cp x dT), where 500 is 8.33 lb/gal x 60 min/h x water's specific heat of 1.0 and the SG x cp product corrects it for the secondary fluid, with pump brake horsepower = GPM x head x SG / (3,960 x efficiency) as pump practice writes it. Fluid properties, head, and the chiller and coil approach temperatures are ENTERED from the fluid manufacturer's data and the equipment selection. Horsepower converts at 0.745699872 kW/hp. It does not compute viscosity or pressure drop, size the pump or chiller, or set the freeze-protection concentration, which is a separate calculation.",
  example: secondaryGlycolLoopExample.inputs,
  fields: [
    { key: "load_btuh", label: "Load (BTU/h)", kind: "number" },
    { key: "delta_t_f", label: "Loop delta-T (°F)", kind: "number" },
    { key: "glycol_cp", label: "Solution specific heat (BTU/lb-°F)", kind: "number", default: 0.85 },
    { key: "glycol_sg", label: "Solution specific gravity", kind: "number", default: 1.04 },
    { key: "head_ft", label: "Loop head (ft, 0 to skip the pump)", kind: "number" },
    { key: "pump_efficiency", label: "Pump efficiency (0-1)", kind: "number", default: 0.7 },
    { key: "chiller_approach_f", label: "Chiller approach (°F)", kind: "number" },
    { key: "coil_approach_f", label: "Coil approach penalty (°F)", kind: "number" },
    { key: "compressor_pct_per_deg_f", label: "Compressor power sensitivity (% per °F of suction)", kind: "number", default: 2.2 },
    { key: "annual_hours", label: "Annual pump hours", kind: "number" },
    { key: "energy_rate_per_kwh", label: "Energy rate ($/kWh)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "sgl-out-w", label: "On a water basis", value: (r) => fmt(r.water_gpm, 0) + " gpm for " + fmt(r.tons, 0) + " tons at the entered delta-T" },
    { key: "g", id: "sgl-out-g", label: "Corrected for the glycol", value: (r) => fmt(r.glycol_gpm, 0) + " gpm, " + fmt(r.flow_increase_pct, 1) + "% more" },
    { key: "f", id: "sgl-out-f", label: "Fluid factor", value: (r) => fmt(r.fluid_factor, 0) + " (500 x SG x cp), the factor a hydronic flow calculation asks for" },
    { key: "p", id: "sgl-out-p", label: "Pump power", value: (r) => r.pump_verdict },
    { key: "e", id: "sgl-out-e", label: "Annual pump energy", value: (r) => r.annual_kwh === 0 ? "(no head or hours entered)" : fmt(r.annual_kwh, 0) + " kWh, $" + fmt(r.annual_cost, 0) + " at the entered rate" },
    { key: "a", id: "sgl-out-a", label: "Temperature penalty", value: (r) => r.approach_verdict },
    { key: "n", id: "sgl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSecondaryGlycolLoop,
});

// =====================================================================
// spec-v1492: CO2 transcritical gas cooler optimum pressure.
// =====================================================================
//
// Above the critical point the high side is a single-phase gas being cooled,
// so pressure and temperature are INDEPENDENT -- unlike a condenser, where
// fixing one fixes the other. Raising pressure at a fixed outlet temperature
// buys refrigerating effect and costs compressor work; the two cross, and the
// crossing point is the optimum.
// dims: in { ambient_f: T, gas_cooler_approach_f: T, evaporating_psig: M L^-1 T^-2 } out: { gc_outlet_f: T, gc_outlet_c: T, p_opt_bar: M L^-1 T^-2, p_opt_psia: M L^-1 T^-2, p_opt_psig: M L^-1 T^-2, pressure_ratio: dimensionless }
export function computeCo2TranscriticalPressure({ ambient_f = 0, gas_cooler_approach_f = 0, evaporating_psig = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (gas_cooler_approach_f < 0) return { error: "Gas cooler approach cannot be negative (degF)." };
  const gc_outlet_f = ambient_f + gas_cooler_approach_f;
  const gc_outlet_c = _refFtoC(gc_outlet_f);
  const is_transcritical = gc_outlet_f > _REF_CO2_CRITICAL_F;
  // The widely used correlation, published in degC and bar. It applies only
  // above the critical temperature; below it the high side condenses and the
  // relation has no meaning, which is why the pressure is gated on the regime
  // rather than reported with a caveat.
  const p_opt_bar = is_transcritical ? 2.6 * gc_outlet_c + 7.54 : 0;
  const p_opt_psia = p_opt_bar * _REF_PSI_PER_BAR;
  const p_opt_psig = is_transcritical ? p_opt_psia - _REF_ATM_PSIA : 0;
  const evaporating_psia = evaporating_psig + _REF_ATM_PSIA;
  const has_evaporating = evaporating_psig !== 0 && evaporating_psia > 0;
  const pressure_ratio = is_transcritical && has_evaporating ? p_opt_psia / evaporating_psia : 0;
  const regime_verdict = is_transcritical
    ? "TRANSCRITICAL: the gas cooler leaves at " + fmt(gc_outlet_f, 1) + " degF, above CO2's " + fmt(_REF_CO2_CRITICAL_F, 1) + " degF critical temperature, so the high side is a gas being cooled and the optimum applies"
    : "SUBCRITICAL: the gas cooler leaves at " + fmt(gc_outlet_f, 1) + " degF, BELOW CO2's " + fmt(_REF_CO2_CRITICAL_F, 1) + " degF critical temperature, so the high side condenses normally -- the optimum-pressure correlation does not apply and the control should float head pressure against condensing temperature instead";
  const pressure_verdict = is_transcritical
    ? fmt(p_opt_psig, 0) + " psig (" + fmt(p_opt_psia, 0) + " psia, " + fmt(p_opt_bar, 1) + " bar)"
    : "not applicable below the critical temperature -- a controller that applied the transcritical formula here would command a pressure far above what the cycle needs";
  if (![gc_outlet_f, gc_outlet_c, p_opt_bar, p_opt_psia, p_opt_psig, pressure_ratio].every(Number.isFinite)) return { error: "Transcritical pressure math is not a finite value." };
  return {
    gc_outlet_f, gc_outlet_c, is_transcritical,
    p_opt_bar, p_opt_psia, p_opt_psig, pressure_ratio, has_evaporating,
    critical_f: _REF_CO2_CRITICAL_F, critical_psia: _REF_CO2_CRITICAL_PSIA,
    regime_verdict, pressure_verdict,
    note: "The high-side pressure a transcritical CO2 system should hold, and whether the cycle is transcritical at all. Above CO2's critical point -- 87.8 degF and about 1,071 psia -- there is no condensation, so the high side is a single-phase gas being cooled and pressure and temperature become INDEPENDENT, unlike a condenser where fixing one fixes the other. Raising discharge pressure at a fixed gas cooler outlet temperature moves the cycle into a region where CO2's isotherms bend sharply, which increases the refrigerating effect per pound substantially; it also increases compressor work. The two effects cross, and the crossing point is the optimum this reports, from the widely used correlation P = 2.6 x T_out + 7.54 in bar and degC. The optimum depends almost entirely on the gas cooler OUTLET temperature, which is ambient plus the gas cooler's approach -- so the control strategy is to measure that outlet temperature and float the high-side pressure to match it, continuously. A fixed high-side setting is leaving efficiency on the table at every ambient except one. On a cool day the outlet falls below the critical temperature and the system reverts to ordinary subcritical condensing, where this arithmetic does not apply at all, and a controller that kept applying it would command a pressure hundreds of psi above what the cycle needs. That is why the regime is reported first and the pressure is withheld below the critical temperature rather than printed with a caveat. The pressures involved are why transcritical CO2 equipment is built to ratings no other supermarket refrigerant needs and why its service procedures differ. A correlation-based screen: it does not compute COP, capacity, or discharge temperature, model the flash gas bypass or ejectors, and it is not a substitute for the manufacturer's control algorithm.",
  };
}
export const co2TranscriticalPressureExample = { inputs: { ambient_f: 95, gas_cooler_approach_f: 5, evaporating_psig: 300 } };
REFRIGERATION_RENDERERS["co2-transcritical-pressure"] = _simpleRenderer({
  citation: "Citation: CO2's critical point at 87.8 °F and about 1,071 psia, with the widely used transcritical optimum-pressure correlation P_opt = 2.6 x T_gas-cooler-outlet + 7.54, published in bar and degC and converted here (1 bar = 100,000 Pa, 1 psi = 6,894.757293168361 Pa, both exact). The correlation applies only above the critical temperature and is withheld below it. It does not compute COP, capacity, or discharge temperature, and does not model flash-gas bypass or ejectors; the equipment manufacturer's control algorithm governs.",
  example: co2TranscriticalPressureExample.inputs,
  fields: [
    { key: "ambient_f", label: "Ambient temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "gas_cooler_approach_f", label: "Gas cooler approach (°F)", kind: "number" },
    { key: "evaporating_psig", label: "Evaporating pressure (psig, 0 to skip the ratio)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "o", id: "ctp-out-o", label: "Gas cooler outlet", value: (r) => fmt(r.gc_outlet_f, 1) + " °F (" + fmt(r.gc_outlet_c, 1) + " °C)" },
    { key: "r", id: "ctp-out-r", label: "Regime", value: (r) => r.regime_verdict },
    { key: "p", id: "ctp-out-p", label: "Optimum high-side pressure", value: (r) => r.pressure_verdict },
    { key: "a", id: "ctp-out-a", label: "Pressure ratio", value: (r) => r.pressure_ratio === 0 ? "(subcritical, or no evaporating pressure entered)" : fmt(r.pressure_ratio, 2) + " to 1 over the entered evaporating pressure" },
    { key: "n", id: "ctp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCo2TranscriticalPressure,
});

// =====================================================================
// spec-v1493: Refrigeration pressure-relief discharge capacity (ASHRAE 15).
// =====================================================================
//
// The D x L term is the vessel's external surface in disguise, because the
// fire case is heat absorbed through the shell boiling the contents. That is
// why a long thin vessel and a short fat one of the same VOLUME need different
// relief, and why relief sizing never asks how much refrigerant is inside.
// dims: in { vessel_diameter_ft: L, vessel_length_ft: L, f_constant: dimensionless, valve_rated_lb_min: M T^-1, pipe_straight_length_ft: L, fitting_equivalent_length_ft: L, max_allowable_equivalent_length_ft: L } out: { required_lb_min: M T^-1, margin_ratio: dimensionless, dl_product_ft2: L^2, equivalent_length_ft: L, length_margin_ft: L }
export function computeRefrigerationReliefCapacity({
  vessel_diameter_ft = 0, vessel_length_ft = 0, f_constant = 0, valve_rated_lb_min = 0,
  pipe_straight_length_ft = 0, fitting_equivalent_length_ft = 0, max_allowable_equivalent_length_ft = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(vessel_diameter_ft > 0)) return { error: "Vessel diameter must be positive (ft)." };
  if (!(vessel_length_ft > 0)) return { error: "Vessel length must be positive (ft)." };
  if (!(f_constant > 0)) return { error: "The refrigerant capacity constant f must be positive." };
  if (valve_rated_lb_min < 0) return { error: "The valve's rated capacity cannot be negative (lb/min of air)." };
  if (pipe_straight_length_ft < 0 || fitting_equivalent_length_ft < 0 || max_allowable_equivalent_length_ft < 0) return { error: "Piping lengths cannot be negative (ft)." };
  const dl_product_ft2 = vessel_diameter_ft * vessel_length_ft;
  const required_lb_min = f_constant * dl_product_ft2;
  const has_valve = valve_rated_lb_min > 0;
  const margin_ratio = has_valve ? valve_rated_lb_min / required_lb_min : 0;
  const valve_adequate = has_valve && valve_rated_lb_min >= required_lb_min;
  const valve_verdict = !has_valve
    ? "(no valve rating entered)"
    : valve_adequate
      ? "PASSES: the entered valve is rated " + fmt(valve_rated_lb_min, 1) + " lb/min against " + fmt(required_lb_min, 1) + " required, a margin of " + fmt(margin_ratio, 2) + " to 1"
      : "FAILS: the entered valve is rated " + fmt(valve_rated_lb_min, 1) + " lb/min against " + fmt(required_lb_min, 1) + " required, short by " + fmt(required_lb_min - valve_rated_lb_min, 1) + " lb/min";
  // The half that fails more often than the valve. A relief valve's rated
  // capacity is achievable only if the discharge piping does not build enough
  // back pressure to choke it, so the equivalent length is compared against
  // the maximum the valve's own manufacturer publishes at that set pressure.
  const equivalent_length_ft = pipe_straight_length_ft + fitting_equivalent_length_ft;
  const has_piping_check = max_allowable_equivalent_length_ft > 0 && equivalent_length_ft > 0;
  const length_margin_ft = max_allowable_equivalent_length_ft - equivalent_length_ft;
  const piping_adequate = has_piping_check && equivalent_length_ft <= max_allowable_equivalent_length_ft;
  const piping_verdict = !has_piping_check
    ? "(no discharge piping entered -- a correctly sized valve on undersized discharge piping is an undersized relief system)"
    : piping_adequate
      ? "the discharge run is " + fmt(equivalent_length_ft, 0) + " ft equivalent against the " + fmt(max_allowable_equivalent_length_ft, 0) + " ft the valve supports, with " + fmt(length_margin_ft, 0) + " ft to spare"
      : "the discharge run is " + fmt(equivalent_length_ft, 0) + " ft equivalent against the " + fmt(max_allowable_equivalent_length_ft, 0) + " ft the valve supports -- " + fmt(-length_margin_ft, 0) + " ft TOO LONG, so back pressure reduces the installed capacity below the stamped rating and the vessel is not protected";
  const system_adequate = valve_adequate && (piping_adequate || !has_piping_check);
  if (![required_lb_min, margin_ratio, dl_product_ft2, equivalent_length_ft, length_margin_ft].every(Number.isFinite)) return { error: "Relief capacity math is not a finite value." };
  return {
    dl_product_ft2, required_lb_min, has_valve, margin_ratio, valve_adequate, valve_verdict,
    equivalent_length_ft, has_piping_check, length_margin_ft, piping_adequate, piping_verdict,
    system_adequate,
    note: "The relieving capacity a refrigerant pressure vessel requires, and whether the valve and its discharge piping together actually deliver it. ASHRAE 15 and IIAR write the requirement as C = f x D x L in pounds per minute of air, with D the vessel diameter and L the length in feet and f a constant that depends on the refrigerant. The D x L term is the vessel's external surface in disguise, because the governing case is a fire heating the shell and boiling the contents -- which is why a long thin vessel and a short fat one of the same VOLUME need different relief, and why relief sizing never asks how much refrigerant is inside. The constant f carries the refrigerant's latent heat and vapor properties, so ammonia, R-22, and CO2 give different answers for identical vessels; it is entered from the standard's own table rather than assumed here. The second half is the discharge piping, and it fails more often than the valve does. A relief valve's rated capacity is achievable only if the downstream piping does not build enough back pressure to choke it, and on a plant where several reliefs share a header the equivalent-length arithmetic decides whether the valve can pass what it is stamped for. A correctly sized valve on undersized discharge piping is an undersized relief system -- with a valve that is stamped correctly, inspected annually, and still will not do its job. That check belongs in the sizing rather than after it, which is why both verdicts are reported and the system passes only if both do. The maximum equivalent length is ENTERED from the valve manufacturer's published table at the set pressure. This does not select the valve, size the header for simultaneous relief of several vessels, compute back pressure from first principles, or address the hydrostatic relief a liquid-full line needs. ASHRAE 15, IIAR 2, the applicable pressure-vessel code, and the valve manufacturer govern.",
  };
}
export const refrigerationReliefCapacityExample = { inputs: { vessel_diameter_ft: 4, vessel_length_ft: 16, f_constant: 0.5, valve_rated_lb_min: 45, pipe_straight_length_ft: 60, fitting_equivalent_length_ft: 25, max_allowable_equivalent_length_ft: 120 } };
REFRIGERATION_RENDERERS["refrigeration-relief-capacity"] = _simpleRenderer({
  citation: "Citation: the required relieving capacity C = f x D x L in lb/min of air as ANSI/ASHRAE 15 and IIAR 2 write it, with D the vessel diameter and L the length in feet -- the D x L product standing for the shell area the fire case heats -- and f the refrigerant constant taken from the standard's own table and ENTERED. The maximum discharge equivalent length the valve supports at its set pressure is ENTERED from the valve manufacturer's published table. It does not select the valve, size a common header for simultaneous relief, compute back pressure from first principles, or address hydrostatic relief. ASHRAE 15, IIAR 2, and the applicable pressure-vessel code govern.",
  example: refrigerationReliefCapacityExample.inputs,
  fields: [
    { key: "vessel_diameter_ft", label: "Vessel outside diameter (ft)", kind: "number" },
    { key: "vessel_length_ft", label: "Vessel length (ft)", kind: "number" },
    { key: "f_constant", label: "Refrigerant constant f (from the standard's table)", kind: "number" },
    { key: "valve_rated_lb_min", label: "Valve rated capacity (lb/min of air, 0 to skip)", kind: "number" },
    { key: "pipe_straight_length_ft", label: "Discharge piping straight run (ft)", kind: "number" },
    { key: "fitting_equivalent_length_ft", label: "Fittings, equivalent length (ft)", kind: "number" },
    { key: "max_allowable_equivalent_length_ft", label: "Maximum equivalent length the valve supports (ft, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "rrc-out-d", label: "D x L", value: (r) => fmt(r.dl_product_ft2, 1) + " sq ft of shell basis" },
    { key: "c", id: "rrc-out-c", label: "Required relieving capacity", value: (r) => fmt(r.required_lb_min, 1) + " lb/min of air" },
    { key: "v", id: "rrc-out-v", label: "Against the valve", value: (r) => r.valve_verdict },
    { key: "p", id: "rrc-out-p", label: "Discharge piping", value: (r) => r.piping_verdict },
    { key: "s", id: "rrc-out-s", label: "System", value: (r) => r.system_adequate ? "the valve and its discharge piping both pass" : "the relief system does NOT pass as entered" },
    { key: "n", id: "rrc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRefrigerationReliefCapacity,
});

// =====================================================================
// spec-v1494: Refrigeration machinery room ventilation (ASHRAE 15).
// =====================================================================
//
// The square root is the important shape: doubling the charge multiplies the
// requirement by 1.41, not 2, because the rate dilutes a CREDIBLE release to a
// survivable concentration rather than handling the entire charge. And it is
// the LARGEST SINGLE SYSTEM that governs, not the sum in the room, because the
// design event is one system failing rather than all of them.
// dims: in { largest_system_charge_lb: M, room_length_ft: L, room_width_ft: L, room_height_ft: L, louver_face_velocity_fpm: L T^-1, louver_free_area_fraction: dimensionless, installed_fan_cfm: L^3 T^-1 } out: { required_exhaust_cfm: L^3 T^-1, room_volume_ft3: L^3, air_changes_per_hour: T^-1, louver_free_area_ft2: L^2, gross_louver_area_ft2: L^2, charge_covered_lb: M }
export function computeMachineryRoomVentilation({
  largest_system_charge_lb = 0, room_length_ft = 0, room_width_ft = 0, room_height_ft = 0,
  louver_face_velocity_fpm = 500, louver_free_area_fraction = 0.5, installed_fan_cfm = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(largest_system_charge_lb > 0)) return { error: "The largest single system's refrigerant charge must be positive (lb)." };
  if (room_length_ft < 0 || room_width_ft < 0 || room_height_ft < 0) return { error: "Room dimensions cannot be negative (ft)." };
  if (!(louver_face_velocity_fpm > 0)) return { error: "Louver face velocity must be positive (fpm)." };
  if (!(louver_free_area_fraction > 0 && louver_free_area_fraction <= 1)) return { error: "Louver free-area fraction must be above 0 and at most 1." };
  if (installed_fan_cfm < 0) return { error: "Installed fan capacity cannot be negative (cfm)." };
  // ASHRAE 15: Q = 100 x sqrt(G), G the mass of the largest single system's
  // charge in pounds, Q in cfm.
  const required_exhaust_cfm = 100 * Math.sqrt(largest_system_charge_lb);
  const room_volume_ft3 = room_length_ft * room_width_ft * room_height_ft;
  const has_room = room_volume_ft3 > 0;
  const air_changes_per_hour = has_room ? required_exhaust_cfm * 60 / room_volume_ft3 : 0;
  // Makeup air. A large exhaust fan in a tight room does not move its rated
  // flow: it depressurizes the room, the fan rides up its curve, and the
  // delivered cfm is a fraction of the design. Louver free area is part of the
  // ventilation system, not a detail.
  const louver_free_area_ft2 = required_exhaust_cfm / louver_face_velocity_fpm;
  const gross_louver_area_ft2 = louver_free_area_ft2 / louver_free_area_fraction;
  const has_fan = installed_fan_cfm > 0;
  const fan_adequate = has_fan && installed_fan_cfm >= required_exhaust_cfm;
  // Run backwards: the charge the installed fan actually covers.
  const charge_covered_lb = has_fan ? (installed_fan_cfm / 100) ** 2 : 0;
  const fan_verdict = !has_fan
    ? "(no installed fan capacity entered)"
    : fan_adequate
      ? "the installed " + fmt(installed_fan_cfm, 0) + " cfm covers a charge of up to " + fmt(charge_covered_lb, 0) + " lb, so it is adequate for the entered " + fmt(largest_system_charge_lb, 0) + " lb"
      : "the installed " + fmt(installed_fan_cfm, 0) + " cfm covers a charge of only " + fmt(charge_covered_lb, 0) + " lb, SHORT of the entered " + fmt(largest_system_charge_lb, 0) + " lb by " + fmt(required_exhaust_cfm - installed_fan_cfm, 0) + " cfm";
  const ach_verdict = has_room
    ? "that is " + fmt(air_changes_per_hour, 1) + " air changes per hour in a " + fmt(room_volume_ft3, 0) + " cu ft room -- reported because sizing this room by air changes instead of by charge gives a different and usually much smaller fan"
    : "(no room dimensions entered)";
  if (![required_exhaust_cfm, room_volume_ft3, air_changes_per_hour, louver_free_area_ft2, gross_louver_area_ft2, charge_covered_lb].every(Number.isFinite)) return { error: "Machinery room ventilation math is not a finite value." };
  return {
    required_exhaust_cfm, room_volume_ft3, has_room, air_changes_per_hour, ach_verdict,
    louver_free_area_ft2, gross_louver_area_ft2,
    has_fan, fan_adequate, charge_covered_lb, fan_verdict,
    note: "The emergency exhaust a refrigerating machinery room requires, from ASHRAE 15's Q = 100 x sqrt(G) with G the mass of the LARGEST SINGLE SYSTEM's refrigerant charge in pounds. Two features of that relation carry the engineering. The square root means doubling the charge multiplies the requirement by 1.41 rather than 2, because the rate is aimed at diluting a credible release to a survivable concentration rather than at handling the entire charge. And it is the largest single system that governs rather than the sum of everything in the room, because the design event is one system failing, not all of them at once. The number that actually fails inspections is makeup air. A large exhaust fan in a tight room simply does not move its rated flow: it depressurizes the room, the fan rides up its curve, and the delivered cfm is a fraction of the design. Louver free area sized for the exhaust rate is part of the ventilation system rather than a detail, so the free area and the gross louver it implies at the entered free-area fraction are reported next to the fan. Detection is the other half and it is not computed here -- ventilation that has to be started by a person who has already been overcome is not a safety system, so the refrigerant detector, its setpoint, and the alarm are part of the same design. The air-change figure is reported only for contrast: sizing a machinery room by air changes rather than by charge is the common error, and it usually gives a much smaller fan. This does not size the continuous ventilation rate, which is a separate and much smaller requirement for occupied heat removal, and it does not set detector locations or setpoints, evaluate the discharge location, or determine whether a machinery room is required at all. ANSI/ASHRAE 15, IIAR 2, and the mechanical code in force govern.",
  };
}
export const machineryRoomVentilationExample = { inputs: { largest_system_charge_lb: 2400, room_length_ft: 40, room_width_ft: 30, room_height_ft: 16, louver_face_velocity_fpm: 500, louver_free_area_fraction: 0.5, installed_fan_cfm: 5000 } };
REFRIGERATION_RENDERERS["machinery-room-ventilation"] = _simpleRenderer({
  citation: "Citation: the emergency mechanical ventilation rate Q = 100 x sqrt(G) in cfm, with G the mass in pounds of the LARGEST SINGLE refrigerating system's charge in the room, as ANSI/ASHRAE 15 states it (and as IIAR 2 carries it for ammonia machinery rooms). Louver face velocity and free-area fraction are ENTERED. It does not size the separate continuous ventilation rate for occupied heat removal, set refrigerant-detector locations or setpoints, evaluate the discharge location, or determine whether a machinery room is required. ASHRAE 15, IIAR 2, and the mechanical code in force govern.",
  example: machineryRoomVentilationExample.inputs,
  fields: [
    { key: "largest_system_charge_lb", label: "Largest single system charge in the room (lb)", kind: "number" },
    { key: "room_length_ft", label: "Room length (ft, 0 to skip air changes)", kind: "number" },
    { key: "room_width_ft", label: "Room width (ft)", kind: "number" },
    { key: "room_height_ft", label: "Room height (ft)", kind: "number" },
    { key: "louver_face_velocity_fpm", label: "Louver face velocity (fpm)", kind: "number", default: 500 },
    { key: "louver_free_area_fraction", label: "Louver free-area fraction (0-1)", kind: "number", default: 0.5 },
    { key: "installed_fan_cfm", label: "Installed exhaust fan capacity (cfm, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "mrv-out-q", label: "Required emergency exhaust", value: (r) => fmt(r.required_exhaust_cfm, 0) + " cfm" },
    { key: "a", id: "mrv-out-a", label: "For contrast, air changes", value: (r) => r.ach_verdict },
    { key: "l", id: "mrv-out-l", label: "Makeup air louver", value: (r) => fmt(r.louver_free_area_ft2, 1) + " sq ft of FREE area at the entered face velocity, about " + fmt(r.gross_louver_area_ft2, 1) + " sq ft gross" },
    { key: "f", id: "mrv-out-f", label: "Against the installed fan", value: (r) => r.fan_verdict },
    { key: "n", id: "mrv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMachineryRoomVentilation,
});
