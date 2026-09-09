// Group G: industrial hygiene and worker protection.
//
// spec-v1731..v1736 (scope-trade-expansion-2, the industrial hygiene band):
// the calculations behind the controls a safety programme actually runs --
// dilution ventilation for a solvent, respirator cartridge change schedules,
// arc-rated clothing selection, fixed ladder fall protection, and confined
// space retrieval force.
//
// spec-v1734 was CUT. `capacitor-discharge-time` in calc-electrical.js
// already computes the whole of it: R_max = t_limit / (C ln(V0/Vsafe)) with
// the NEC 460.6 limit selected by voltage, the discharge time for a supplied
// resistor, a code pass/fail, and the continuous burn the resistor
// dissipates. Its remaining material -- that a bleed resistor fails OPEN
// silently, so the calculation predicts and only a live-dead-live test
// establishes, and that stored energy is not only electrical -- landed on
// that tile's note instead.
//
// Split into its own module rather than added to calc-cross.js, which sits at
// 94.6% of its size cap; the size gate's own guidance is that a module
// brushing its cap should be split rather than have its budget raised, and
// calc-fab.js has the same origin.
//
// The thread through all six is that each answer has a limit the arithmetic
// does not reach, and the limit is where the harm happens: dilution does not
// protect the person at the source, a cartridge schedule is wrong for the
// worst task rather than the typical one, an ATPV rating is a 50% burn
// probability rather than a safe threshold, a bleed resistor fails open
// silently, a cage is not fall protection, and a retrieval that does not come
// freely is a signal to stop pulling. Each tile reports that limit alongside
// its number, because the number alone reads as an assurance.
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

// Compact renderer factory, copied verbatim from calc-inspection.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _hyRender = function (inputRegion, outputRegion, citationEl) {
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

  _hyRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _hyRender;
}


export const HYGIENE_RENDERERS = {};

// =====================================================================
// spec-v1731: dilution ventilation for a solvent vapour.
// =====================================================================
//
// TWO DEFECTS IN THE SPEC, and the second is in the unsafe direction.
//
// It shipped NINE unrendered python f-string placeholders, so none of its
// headline figures was ever evaluated. Rendering them gives 2,190 cfm at
// K = 5 -- and that number is WRONG BY A FACTOR OF 16, because the spec used
// 403 with an input in pounds per hour.
//
// 403 is the constant for PINTS PER MINUTE of liquid at a given specific
// gravity: 387 ft^3/lbmol x 1.043 lb/pint. For a mass rate in lb/h the
// constant is 387e6 / 60 = 6.448e6, and the ratio between them is exactly 16.
// Derived from the ideal gas law at 70 degF and 1 atm, 2 lb/h of toluene
// (MW 92) held at a 20 ppm limit needs 7,011 cfm at K = 1 and 35,057 at
// K = 5 -- not 2,190. Under-ventilating a solvent by sixteen times is not a
// rounding question, so this tile uses the mass-rate constant and says so.
// =====================================================================
// 387 ft^3/lbmol at 70 degF and 1 atm (R T / P = 10.7316 x 530 / 14.696),
// times 1e6 for ppm, divided by 60 to take an hourly rate to cfm.
const _DV_MOLAR_VOLUME_FT3 = 386.9;
const _DV_CONSTANT = _DV_MOLAR_VOLUME_FT3 * 1e6 / 60;
// dims: in { evaporation_lb_hr: M T^-1, molecular_weight: M N^-1, tlv_ppm: dimensionless, mixing_factor: dimensionless, lel_pct: dimensionless, lel_safety_fraction: dimensionless, room_volume_ft3: L^3, alt_mixing_factor: dimensionless } out: { health_cfm: L^3 T^-1, lel_cfm: L^3 T^-1, governing_cfm: L^3 T^-1, room_ach: T^-1, alt_health_cfm: L^3 T^-1 }
export function computeDilutionVentilationSolvent({
  evaporation_lb_hr = 0, molecular_weight = 0, tlv_ppm = 0, mixing_factor = 5,
  lel_pct = 0, lel_safety_fraction = 0.25, room_volume_ft3 = 0, alt_mixing_factor = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(evaporation_lb_hr > 0)) return { error: "The evaporation rate must be positive (lb/h)." };
  if (!(molecular_weight > 0)) return { error: "Molecular weight must be positive." };
  if (!(tlv_ppm > 0)) return { error: "The exposure limit must be positive (ppm)." };
  if (!(mixing_factor >= 1) || mixing_factor > 10) return { error: "The mixing factor runs from 1 to 10." };
  if (lel_pct < 0 || lel_pct >= 100) return { error: "The lower explosive limit must be at least 0 and below 100 percent." };
  if (!(lel_safety_fraction > 0) || lel_safety_fraction > 1) return { error: "The LEL safety fraction must be above 0 and no more than 1." };
  if (room_volume_ft3 < 0 || alt_mixing_factor < 0 || alt_mixing_factor > 10) return { error: "Room volume cannot be negative and the alternative mixing factor runs from 0 to 10." };
  const _healthFor = (K) => _DV_CONSTANT * evaporation_lb_hr * K / (molecular_weight * tlv_ppm);
  const health_cfm = _healthFor(mixing_factor);
  const health_verdict = "for the exposure limit: " + fmt(health_cfm, 0) + " cfm at a mixing factor of " + fmt(mixing_factor, 0) + ", from " + fmt(evaporation_lb_hr, 2) + " lb/h of a molecular weight " + fmt(molecular_weight, 0) + " solvent against a " + fmt(tlv_ppm, 0) + " ppm limit";
  // The flammability requirement is a different and usually much larger number.
  const has_lel = lel_pct > 0;
  // LEL in ppm is lel_pct x 10,000; the target is a fraction of that.
  const lel_target_ppm = has_lel ? lel_pct * 10000 * lel_safety_fraction : 0;
  const lel_cfm_exact = has_lel ? _DV_CONSTANT * evaporation_lb_hr / (molecular_weight * lel_target_ppm) : 0;
  const lel_verdict = !has_lel
    ? "(no lower explosive limit entered -- and flammability is a SEPARATE requirement that is frequently the larger of the two)"
    : "for flammability: " + fmt(lel_cfm_exact, 0) + " cfm to hold the room at " + fmt(lel_safety_fraction * 100, 0) + "% of the " + fmt(lel_pct, 2) + "% LEL (" + fmt(lel_target_ppm, 0) + " ppm). Note that a mixing factor is NOT applied to the flammability figure the way it is to the health one -- the fire requirement is about the room average and the bulk atmosphere";
  const governing_cfm = has_lel ? Math.max(health_cfm, lel_cfm_exact) : health_cfm;
  const health_governs = !has_lel || health_cfm >= lel_cfm_exact;
  const governing_verdict = !has_lel
    ? "the exposure limit governs at " + fmt(health_cfm, 0) + " cfm (no flammability figure entered)"
    : health_governs
      ? "THE EXPOSURE LIMIT GOVERNS at " + fmt(governing_cfm, 0) + " cfm, " + fmt(health_cfm / lel_cfm_exact, 1) + " times the flammability requirement -- which is the usual case for a solvent with a low TLV, because the exposure limit sits far below anything that burns"
      : "THE FLAMMABILITY REQUIREMENT GOVERNS at " + fmt(governing_cfm, 0) + " cfm, " + fmt(lel_cfm_exact / health_cfm, 1) + " times the exposure figure";
  const has_room = room_volume_ft3 > 0;
  const room_ach = has_room ? governing_cfm * 60 / room_volume_ft3 : 0;
  const room_verdict = !has_room
    ? "(no room volume entered)"
    : fmt(governing_cfm, 0) + " cfm in a " + fmt(room_volume_ft3, 0) + " cu ft room is " + fmt(room_ach, 1) + " air changes an hour"
      + (room_ach > 30 ? " -- which is a very large rate for general ventilation, and a figure that high is itself the argument for capturing at the source instead" : "");
  const has_alt = alt_mixing_factor >= 1;
  const alt_health_cfm = has_alt ? _healthFor(alt_mixing_factor) : 0;
  const mixing_verdict = !has_alt
    ? "(no alternative mixing factor entered)"
    : "at a mixing factor of " + fmt(alt_mixing_factor, 0) + " the exposure requirement is " + fmt(alt_health_cfm, 0) + " cfm, " + fmt(alt_health_cfm / health_cfm, 2) + " times the entered case. K IS THE JUDGEMENT IN THIS CALCULATION and it swings the answer by a factor of ten across its range: 1 to 2 for a well-mixed room with the emission far from the worker, up toward 10 for poor mixing, a worker at the source, or a consequence severe enough that being wrong is not acceptable";
  const limitation_verdict = "AND DILUTION DOES NOT PROTECT THE PERSON AT THE SOURCE. This computes a room AVERAGE, and the concentration in the breathing zone of someone standing over the tank is higher than the average before any mixing has occurred -- often by a large factor and always in the wrong direction. Dilution ventilation suits low-toxicity vapours released at a steady, modest rate away from workers. LOCAL EXHAUST that captures at the source is the control for anything else, and it moves a fraction of the air";
  if (![health_cfm, lel_cfm_exact, governing_cfm, room_ach, alt_health_cfm].every(Number.isFinite)) return { error: "Dilution ventilation math is not a finite value." };
  return {
    health_cfm, health_verdict, has_lel, lel_target_ppm, lel_cfm: lel_cfm_exact, lel_verdict,
    governing_cfm, health_governs, governing_verdict,
    has_room, room_ach, room_verdict, has_alt, alt_health_cfm, mixing_verdict, limitation_verdict,
    note: "The airflow that holds a room's average solvent concentration at an exposure limit. The vapour a solvent generates is its mass rate over its molecular weight times the molar volume, 387 cubic feet per pound-mole at 70 degF and one atmosphere, and the airflow is that volume divided by the target concentration and multiplied by a mixing factor. WATCH THE INPUT UNIT ON THE PUBLISHED CONSTANT. The familiar 403 belongs to a form taking PINTS PER MINUTE of liquid at a given specific gravity -- it is 387 times the 1.043 pounds a pint of water weighs -- and applying it to a rate in pounds per hour understates the airflow by a factor of sixteen. This uses the mass-rate form directly, so the input unit and the constant cannot drift apart. TWO REQUIREMENTS COME OUT OF THE SAME EMISSION AND THEY ARE NOT THE SAME NUMBER. The health requirement holds the room at an exposure limit measured in parts per million. The flammability requirement holds it at a fraction of the lower explosive limit, which is measured in percent -- four orders of magnitude higher. For a solvent with a low limit the health figure governs by a wide margin, and for one with a high limit the fire figure can govern instead, so both are computed and the larger is reported. A ventilation rate set on one without checking the other is set on half the question. THE MIXING FACTOR SWINGS THE ANSWER BY A FACTOR OF TEN and it is the least defensible input. It runs from about 1 for a well-mixed room with the emission remote from anyone, up toward 10 for a room that mixes poorly, a worker standing at the source, a limit with a serious consequence, or an emission rate that is itself uncertain. It is a judgement about how badly the assumption of uniform mixing fails, and it is entered rather than derived because nothing in the arithmetic can supply it. AND THE ASSUMPTION OF UNIFORM MIXING IS THE LIMITATION THAT MATTERS MOST. This computes a room average, and the person leaning over the tank is breathing a concentration higher than the average -- before mixing, in the plume, at the point where the emission actually occurs. Dilution ventilation is appropriate for a low-toxicity vapour released steadily at a distance from workers. For anything more hazardous, released faster, or released where people are, LOCAL EXHAUST VENTILATION that captures at the source is the control, and it does the job on a fraction of the airflow. A dilution rate that comes out implausibly large is itself the argument for local exhaust. This is a steady-state single-contaminant estimate. It does not size a ventilation system, place supply and exhaust (the air has to sweep the room rather than short-circuit between the openings, which no airflow figure captures), account for mixtures with additive or synergistic effects, model a non-steady or peak release, address make-up air, heating cost, or the effect on other processes, evaluate the exposure a person actually receives, or substitute for air monitoring. The ACGIH Industrial Ventilation manual, the applicable exposure limit, and a certified industrial hygienist govern.",
  };
}
export const dilutionVentilationSolventExample = { inputs: { evaporation_lb_hr: 2, molecular_weight: 92, tlv_ppm: 20, mixing_factor: 5, lel_pct: 1.1, lel_safety_fraction: 0.25, room_volume_ft3: 20000, alt_mixing_factor: 10 } };
HYGIENE_RENDERERS["dilution-ventilation-solvent"] = _simpleRenderer({
  citation: "Citation: dilution airflow = (molar volume 387 ft³/lbmol at 70 °F and 1 atm) × 10⁶ / 60 × (lb/h) × K / (molecular weight × ppm). NOTE THE INPUT UNIT: the familiar constant 403 belongs to a form taking PINTS PER MINUTE of liquid (387 × 1.043 lb/pint), and applying it to a rate in lb/h understates the airflow sixteenfold. The mixing factor K (1 to 10) is ENTERED because nothing in the arithmetic supplies it. The flammability requirement against a fraction of the LEL is computed separately and the larger governs. It does not size a system, place supply and exhaust, handle mixtures, model a peak release, or substitute for air monitoring. The ACGIH Industrial Ventilation manual and a certified industrial hygienist govern.",
  example: dilutionVentilationSolventExample.inputs,
  fields: [
    { key: "evaporation_lb_hr", label: "Solvent evaporation rate (lb/h)", kind: "number", attrs: { step: "any" } },
    { key: "molecular_weight", label: "Molecular weight", kind: "number", attrs: { step: "any" } },
    { key: "tlv_ppm", label: "Exposure limit (ppm)", kind: "number", attrs: { step: "any" } },
    { key: "mixing_factor", label: "Mixing factor K (1 well mixed, 10 poor)", kind: "number", default: 5, attrs: { step: "any" } },
    { key: "lel_pct", label: "Lower explosive limit (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "lel_safety_fraction", label: "Fraction of LEL to hold", kind: "number", default: 0.25, attrs: { step: "any" } },
    { key: "room_volume_ft3", label: "Room volume (ft³, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_mixing_factor", label: "Alternative mixing factor (0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "h", id: "dvs-out-h", label: "For the exposure limit", value: (r) => r.health_verdict },
    { key: "l", id: "dvs-out-l", label: "For flammability", value: (r) => r.lel_verdict },
    { key: "g", id: "dvs-out-g", label: "Which governs", value: (r) => r.governing_verdict },
    { key: "a", id: "dvs-out-a", label: "In this room", value: (r) => r.room_verdict },
    { key: "k", id: "dvs-out-k", label: "The mixing factor", value: (r) => r.mixing_verdict },
    { key: "x", id: "dvs-out-x", label: "What dilution cannot do", value: (r) => r.limitation_verdict },
    { key: "n", id: "dvs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDilutionVentilationSolvent,
});

// =====================================================================
// spec-v1732: respirator cartridge service life and change schedule.
// =====================================================================
// dims: in { estimated_life_hr: T, safety_fraction: dimensionless, shift_hours: T, concentration_ppm: dimensionless, worst_case_ppm: dimensionless, humidity_pct: dimensionless, humidity_derate_above_65: dimensionless } out: { schedule_hr: T, changes_per_shift: dimensionless, worst_case_life_hr: T, worst_case_schedule_hr: T, humidity_adjusted_hr: T }
export function computeRespiratorCartridgeLife({
  estimated_life_hr = 0, safety_fraction = 0.5, shift_hours = 8,
  concentration_ppm = 0, worst_case_ppm = 0, humidity_pct = 50, humidity_derate_above_65 = 0.5,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(estimated_life_hr > 0)) return { error: "The estimated service life must be positive (hours)." };
  if (!(safety_fraction > 0) || safety_fraction > 1) return { error: "The safety fraction must be above 0 and no more than 1." };
  if (!(shift_hours > 0)) return { error: "Shift length must be positive (hours)." };
  if (concentration_ppm < 0 || worst_case_ppm < 0) return { error: "Concentrations cannot be negative." };
  if (humidity_pct < 0 || humidity_pct > 100) return { error: "Relative humidity must be between 0 and 100 percent." };
  if (!(humidity_derate_above_65 > 0) || humidity_derate_above_65 > 1) return { error: "The humidity derate must be above 0 and no more than 1." };
  const schedule_hr = estimated_life_hr * safety_fraction;
  const changes_per_shift = Math.ceil(shift_hours / schedule_hr) - 1;
  const schedule_verdict = "an estimated " + fmt(estimated_life_hr, 1) + " hour service life at a " + fmt(safety_fraction * 100, 0) + "% safety fraction gives a " + fmt(schedule_hr, 1) + " hour change schedule -- "
    + (changes_per_shift <= 0
      ? "one cartridge covers a " + fmt(shift_hours, 1) + " hour shift"
      : fmt(changes_per_shift, 0) + " change" + (changes_per_shift > 1 ? "s" : "") + " during a " + fmt(shift_hours, 1) + " hour shift");
  // Service life is roughly inverse in concentration.
  const has_worst = worst_case_ppm > 0 && concentration_ppm > 0;
  const worst_case_life_hr = has_worst ? estimated_life_hr * concentration_ppm / worst_case_ppm : 0;
  const worst_case_schedule_hr = has_worst ? worst_case_life_hr * safety_fraction : 0;
  const worst_verdict = !has_worst
    ? "(no typical and worst-case concentrations entered -- and the WORST task is what the schedule has to cover)"
    : "at the worst-case " + fmt(worst_case_ppm, 0) + " ppm rather than the typical " + fmt(concentration_ppm, 0) + ", service life falls roughly inversely to " + fmt(worst_case_life_hr, 1) + " hours and the schedule to " + fmt(worst_case_schedule_hr, 1) + ". A SCHEDULE ESTABLISHED FOR THE TYPICAL TASK IS WRONG FOR THE WORST TASK, and the worst task is the one it has to cover";
  const humid = humidity_pct > 65;
  const humidity_adjusted_hr = humid ? worst_case_schedule_hr > 0 ? worst_case_schedule_hr * humidity_derate_above_65 : schedule_hr * humidity_derate_above_65 : (worst_case_schedule_hr > 0 ? worst_case_schedule_hr : schedule_hr);
  const humidity_verdict = !humid
    ? "at " + fmt(humidity_pct, 0) + "% relative humidity the cartridge is in its normal range; above roughly 65% the sorbent takes up water and service life falls substantially"
    : "AT " + fmt(humidity_pct, 0) + "% RELATIVE HUMIDITY the sorbent competes with water vapour and service life falls substantially -- at the entered " + fmt(humidity_derate_above_65, 2) + " derate the schedule becomes " + fmt(humidity_adjusted_hr, 1) + " hours. High humidity and high concentration together turn a cartridge that lasted a shift into one that lasts a fraction of one";
  const smell_verdict = "AND THE CHANGE SCHEDULE EXISTS BECAUSE THE WEARER CANNOT DETECT BREAKTHROUGH. Changing when it smells is not a method: odour thresholds vary widely between individuals, olfactory fatigue sets in during exposure, some contaminants have poor warning properties or none at all, and a wearer with a cold has none. A schedule based on data is the control, and OSHA requires one where an end-of-service-life indicator is not fitted";
  const model_verdict = "The service life itself comes from the MANUFACTURER'S model or test data for the specific cartridge and contaminant, and is entered here. It depends on the contaminant, the concentration, the work rate, the temperature and the humidity, and no generic figure covers a real combination -- a mixture is harder still, because one contaminant can displace another already adsorbed and release it downstream";
  if (![schedule_hr, changes_per_shift, worst_case_life_hr, worst_case_schedule_hr, humidity_adjusted_hr].every(Number.isFinite)) return { error: "Cartridge life math is not a finite value." };
  return {
    schedule_hr, changes_per_shift, schedule_verdict,
    has_worst, worst_case_life_hr, worst_case_schedule_hr, worst_verdict,
    humid, humidity_adjusted_hr, humidity_verdict, smell_verdict, model_verdict,
    note: "A respirator cartridge change schedule, which is an estimated service life multiplied by a safety fraction -- commonly a half -- and then checked against the conditions that actually shorten it. The arithmetic is trivial and the discipline is not, because every input moves and the failure is invisible to the person wearing it. SERVICE LIFE IS ROUGHLY INVERSE IN CONCENTRATION, so a schedule set for a typical task is wrong for the worst one. Doubling the concentration roughly halves the life, and the task that drives the schedule is the worst exposure a wearer will see rather than the average across a shift. Humidity is the other large term: above roughly 65 percent the sorbent takes up water in competition with the contaminant and service life falls substantially, so a humid day and a heavy task together turn a cartridge that covered a shift into one that covers a fraction of it. THE SCHEDULE EXISTS BECAUSE THE WEARER CANNOT DETECT BREAKTHROUGH RELIABLY. Changing the cartridge when it starts to smell is not a method: odour thresholds vary widely between people, olfactory fatigue sets in during the exposure itself, several important contaminants have poor warning properties or none, and a wearer with a head cold has no warning at all. Where an end-of-service-life indicator is not fitted, a change schedule based on data is what the standard requires, and 'change it when you notice' is the practice it was written to replace. The estimated life is entered from the manufacturer's model or test data for the specific cartridge and contaminant, because it depends on the contaminant, the concentration, the work rate, the temperature and the humidity together, and no generic figure covers a real combination. A MIXTURE IS HARDER STILL: one contaminant can displace another already adsorbed on the sorbent and release it downstream, so a mixture's behaviour is not the shortest of its components' lives. This computes a schedule from an entered life. It does not estimate service life, select a cartridge or a respirator, determine an assigned protection factor or whether air-purifying respirators are permitted at all (they are not in an oxygen-deficient or IDLH atmosphere), address fit testing, medical evaluation, or the written respiratory protection programme, cover particulate filters, which load differently, or account for storage between uses, during which some cartridges continue to degrade. The manufacturer's service life data, 29 CFR 1910.134, and a certified industrial hygienist govern.",
  };
}
export const respiratorCartridgeLifeExample = { inputs: { estimated_life_hr: 8, safety_fraction: 0.5, shift_hours: 8, concentration_ppm: 50, worst_case_ppm: 100, humidity_pct: 85, humidity_derate_above_65: 0.5 } };
HYGIENE_RENDERERS["respirator-cartridge-life"] = _simpleRenderer({
  citation: "Citation: change schedule = estimated service life × a safety fraction (commonly one half), with service life scaled roughly INVERSELY with concentration and derated above about 65% relative humidity. The estimated life is ENTERED from the manufacturer's model or test data for the specific cartridge and contaminant, because it depends on contaminant, concentration, work rate, temperature and humidity together. It does not estimate service life, select a respirator, determine an assigned protection factor or whether air-purifying respirators are permitted at all, address fit testing or the written programme, or cover particulate filters. 29 CFR 1910.134, the manufacturer's data and a certified industrial hygienist govern.",
  example: respiratorCartridgeLifeExample.inputs,
  fields: [
    { key: "estimated_life_hr", label: "Manufacturer estimated service life (h)", kind: "number", attrs: { step: "any" } },
    { key: "safety_fraction", label: "Safety fraction applied", kind: "number", default: 0.5, attrs: { step: "any" } },
    { key: "shift_hours", label: "Shift length (h)", kind: "number", default: 8, attrs: { step: "any" } },
    { key: "concentration_ppm", label: "Typical concentration (ppm, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "worst_case_ppm", label: "Worst-case concentration (ppm, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "humidity_pct", label: "Relative humidity (%)", kind: "number", default: 50, attrs: { step: "any" } },
    { key: "humidity_derate_above_65", label: "Life multiplier above 65% RH", kind: "number", default: 0.5, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "s", id: "rcl-out-s", label: "Change schedule", value: (r) => r.schedule_verdict },
    { key: "w", id: "rcl-out-w", label: "At the worst task", value: (r) => r.worst_verdict },
    { key: "h", id: "rcl-out-h", label: "Humidity", value: (r) => r.humidity_verdict },
    { key: "d", id: "rcl-out-d", label: "Why not change it when it smells", value: (r) => r.smell_verdict },
    { key: "m", id: "rcl-out-m", label: "Where the life figure comes from", value: (r) => r.model_verdict },
    { key: "n", id: "rcl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRespiratorCartridgeLife,
});

// =====================================================================
// spec-v1733: arc-rated clothing selection from incident energy.
// =====================================================================
// dims: in { incident_energy_cal_cm2: M T^-2, system_arc_rating_cal_cm2: M T^-2, garment_ratings_sum_cal_cm2: M T^-2, meltable_underlayer: dimensionless } out: { margin_cal_cm2: M T^-2, minimum_rating_cal_cm2: M T^-2, margin_pct: dimensionless }
export function computeArcRatedClothingSelection({
  incident_energy_cal_cm2 = 0, system_arc_rating_cal_cm2 = 0,
  garment_ratings_sum_cal_cm2 = 0, meltable_underlayer = "no",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(incident_energy_cal_cm2 > 0)) return { error: "Incident energy must be positive (cal/cm^2)." };
  if (system_arc_rating_cal_cm2 < 0 || garment_ratings_sum_cal_cm2 < 0) return { error: "Arc ratings cannot be negative." };
  const minimum_rating_cal_cm2 = incident_energy_cal_cm2;
  const has_system = system_arc_rating_cal_cm2 > 0;
  const margin_cal_cm2 = has_system ? system_arc_rating_cal_cm2 - incident_energy_cal_cm2 : 0;
  const margin_pct = has_system && incident_energy_cal_cm2 > 0 ? margin_cal_cm2 / incident_energy_cal_cm2 * 100 : 0;
  const adequate = has_system && margin_cal_cm2 >= 0;
  const selection_verdict = !has_system
    ? "the system arc rating must be AT OR ABOVE " + fmt(minimum_rating_cal_cm2, 1) + " cal/cm2. (No system rating entered)"
    : adequate
      ? "the " + fmt(system_arc_rating_cal_cm2, 1) + " cal/cm2 system covers the " + fmt(incident_energy_cal_cm2, 1) + " cal/cm2 exposure with " + fmt(margin_cal_cm2, 1) + " cal of margin (" + fmt(margin_pct, 0) + "%)"
      : "INADEQUATE: the " + fmt(system_arc_rating_cal_cm2, 1) + " cal/cm2 system is " + fmt(-margin_cal_cm2, 1) + " cal/cm2 BELOW the " + fmt(incident_energy_cal_cm2, 1) + " cal/cm2 exposure";
  // The reason margin matters, which the rating's definition supplies.
  const atpv_verdict = "AND THE MARGIN MATTERS BECAUSE OF WHAT THE RATING MEANS. ATPV is the incident energy at which there is a FIFTY PERCENT PROBABILITY of a second-degree burn through the fabric -- it is not a threshold below which nothing happens. Clothing rated exactly at the exposure sits on that fifty percent point"
    + (has_system && Math.abs(margin_cal_cm2) < 1e-9 ? ", which is exactly where this system sits" : "")
    + ". Some fabrics report EBT, the breakopen threshold, instead; where both exist the LOWER of the two is the arc rating";
  const has_sum = garment_ratings_sum_cal_cm2 > 0;
  const layering_verdict = !has_sum
    ? "LAYERING IS NOT ADDITION. Two 8 cal garments do not make a 16 cal system: the system rating comes from TESTING THE COMBINATION, and the air gaps between layers contribute in a way arithmetic does not predict. Substituting a different underlayer changes the system that was tested, so the tested system rating is the only figure to design to"
    : "the entered garments sum to " + fmt(garment_ratings_sum_cal_cm2, 1) + " cal/cm2, and THAT SUM IS NOT THE SYSTEM RATING. Layering is not addition -- the rating comes from testing the combination, and the air gaps between layers contribute in a way arithmetic does not predict"
      + (has_system ? ", which is why the tested " + fmt(system_arc_rating_cal_cm2, 1) + " and the arithmetic " + fmt(garment_ratings_sum_cal_cm2, 1) + " are different numbers and only the tested one counts" : "");
  const meltable = meltable_underlayer === "yes";
  const underlayer_verdict = meltable
    ? "MELTABLE UNDERLAYER INDICATED, AND THAT IS PROHIBITED regardless of the system rating above. Polyester, nylon and acetate next to the skin melt in an arc event and adhere to it, producing injuries worse than the arc alone. Natural fibre or arc-rated underlayers only -- and that includes the undershirt and the socks, which is where it is forgotten"
    : "no meltable underlayer indicated. Polyester, nylon and acetate next to skin melt and adhere in an arc event, so natural fibre or arc-rated underlayers only, including the undershirt and the socks";
  const system_verdict = "AND CLOTHING IS ONE ELEMENT. An arc rating addresses the THERMAL hazard only; the pressure wave, the noise, the molten metal spray and the shock hazard are separate, and the complete protection for this exposure includes face protection, hearing protection, arc-rated gloves or leather over rubber insulating gloves, and the shock protection that prevents contact in the first place. The best answer remains the one that removes the exposure: de-energise and establish an electrically safe work condition";
  const acceptable = adequate && !meltable;
  const overall_verdict = !has_system
    ? "(no system arc rating entered)"
    : meltable
      ? "NOT ACCEPTABLE -- a meltable underlayer is indicated, whatever the system rating"
      : adequate ? "the clothing system is adequate for the entered incident energy" : "NOT ACCEPTABLE -- the system rating is below the incident energy";
  if (![margin_cal_cm2, minimum_rating_cal_cm2, margin_pct].every(Number.isFinite)) return { error: "Arc rating math is not a finite value." };
  return {
    minimum_rating_cal_cm2, has_system, margin_cal_cm2, margin_pct, adequate,
    selection_verdict, atpv_verdict, has_sum, layering_verdict,
    meltable, underlayer_verdict, system_verdict, acceptable, overall_verdict,
    note: "Whether a clothing system is rated for an arc flash exposure, which is a comparison rather than a calculation -- the system's arc rating must be at or above the incident energy at the working distance. The incident energy is entered because computing it is a separate study; this is the selection step that follows it. WHAT THE RATING MEANS IS THE PART THAT CHANGES DECISIONS. ATPV is the incident energy at which there is a FIFTY PERCENT PROBABILITY of a second-degree burn through the fabric. It is not a threshold below which nothing happens and above which it does: clothing rated exactly at the exposure places the wearer on that fifty percent point. Some fabrics report a breakopen threshold instead, and where both are determined the LOWER of the two is the fabric's arc rating. Margin is therefore not conservatism, it is the difference between a coin toss and a protected worker. LAYERING IS NOT ADDITION, and this is the error that produces a confidently wrong system. Two 8 cal garments do not make a 16 cal system. The rating of a multi-layer system comes from testing that combination, because the air gaps between layers contribute substantially and not in a way any arithmetic predicts -- sometimes more than the sum, sometimes less. Substituting a different underlayer changes the system that was tested, which means a system rating belongs to a specific combination of specific garments. THE UNDERLAYER PROHIBITION IS ABSOLUTE AND IS ROUTINELY MISSED. Polyester, nylon and acetate next to the skin melt in an arc event and adhere to the skin, producing injuries worse than the arc would have caused alone. Natural fibre or arc-rated underlayers only, and the items forgotten are the undershirt and the socks rather than the visible garments. And arc-rated clothing addresses the thermal hazard only. The pressure wave, the noise, the molten metal spray and the shock hazard are separate, so the complete protection for an exposure includes face protection, hearing protection, arc-rated gloves or leather over rubber insulating gloves, and the shock protection that prevents contact at all. This compares entered ratings. It does not compute incident energy, perform an arc flash study, determine arc flash boundaries or working distances, apply the alternative PPE category method from the standard (which is a table-based route for defined tasks and equipment, not a calculation), select garments, verify a system's tested rating, or address the electrically safe work condition that removes the exposure entirely. An IEEE 1584 study or the applicable table method, NFPA 70E, the garment manufacturer's tested system ratings, and the employer's electrical safety programme govern.",
  };
}
export const arcRatedClothingSelectionExample = { inputs: { incident_energy_cal_cm2: 8, system_arc_rating_cal_cm2: 12, garment_ratings_sum_cal_cm2: 16, meltable_underlayer: "no" } };
HYGIENE_RENDERERS["arc-rated-clothing-selection"] = _simpleRenderer({
  citation: "Citation: NFPA 70E arc-rated clothing selection -- the system arc rating must be at or above the incident energy at the working distance. ATPV is the incident energy at a FIFTY PERCENT probability of a second-degree burn, not a safe threshold; where a fabric reports both ATPV and EBT the LOWER is its arc rating. Layering is NOT additive: a multi-layer system's rating comes from testing that combination. Incident energy is ENTERED because computing it is a separate study (`arc-flash-screen`). Meltable underlayers next to skin are prohibited. It does not compute incident energy, perform an IEEE 1584 study, set boundaries, or apply the table-based PPE category method. NFPA 70E and the employer's electrical safety programme govern.",
  example: arcRatedClothingSelectionExample.inputs,
  fields: [
    { key: "incident_energy_cal_cm2", label: "Incident energy at working distance (cal/cm²)", kind: "number", attrs: { step: "any" } },
    { key: "system_arc_rating_cal_cm2", label: "Tested system arc rating (cal/cm², 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "garment_ratings_sum_cal_cm2", label: "Sum of individual garment ratings (cal/cm², 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "meltable_underlayer", label: "Meltable underlayer (polyester, nylon, acetate) next to skin?", kind: "select", default: "no", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes (prohibited)" }] },
  ],
  outputs: [
    { key: "v", id: "arc-out-v", label: "Verdict", value: (r) => r.overall_verdict },
    { key: "s", id: "arc-out-s", label: "Against the exposure", value: (r) => r.selection_verdict },
    { key: "a", id: "arc-out-a", label: "What the rating means", value: (r) => r.atpv_verdict },
    { key: "l", id: "arc-out-l", label: "Layering", value: (r) => r.layering_verdict },
    { key: "u", id: "arc-out-u", label: "Underlayers", value: (r) => r.underlayer_verdict },
    { key: "y", id: "arc-out-y", label: "The rest of the system", value: (r) => r.system_verdict },
    { key: "n", id: "arc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeArcRatedClothingSelection,
});

// =====================================================================
// spec-v1735: fixed ladder fall protection and rest platform spacing.
// =====================================================================
// dims: in { ladder_height_ft: L, fall_protection_threshold_ft: L, rest_platform_interval_ft: L, existing_protection: dimensionless } out: { rest_platforms_required: dimensionless, longest_unbroken_climb_ft: L, height_over_threshold_ft: L }
export function computeFixedLadderFallProtection({
  ladder_height_ft = 0, fall_protection_threshold_ft = 24,
  rest_platform_interval_ft = 50, existing_protection = "none",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ladder_height_ft > 0)) return { error: "Ladder height must be positive (ft)." };
  if (!(fall_protection_threshold_ft > 0)) return { error: "The fall protection threshold must be positive (ft)." };
  if (!(rest_platform_interval_ft > 0)) return { error: "The rest platform interval must be positive (ft)." };
  const requires_protection = ladder_height_ft > fall_protection_threshold_ft;
  const height_over_threshold_ft = requires_protection ? ladder_height_ft - fall_protection_threshold_ft : 0;
  const height_verdict = requires_protection
    ? "a " + fmt(ladder_height_ft, 1) + " ft fixed ladder is " + fmt(height_over_threshold_ft, 1) + " ft above the " + fmt(fall_protection_threshold_ft, 0) + " ft threshold, so fall protection is REQUIRED"
    : "a " + fmt(ladder_height_ft, 1) + " ft fixed ladder is at or below the " + fmt(fall_protection_threshold_ft, 0) + " ft threshold, so a ladder safety system is not required on height alone";
  // A CAGE IS NOT FALL PROTECTION. That is the whole finding.
  const isCage = existing_protection === "cage";
  const isSystem = existing_protection === "system";
  const isPfas = existing_protection === "pfas";
  const compliant = !requires_protection || isSystem || isPfas;
  const protection_verdict = !requires_protection
    ? "(fall protection is not required on height alone here)"
    : isCage
      ? "A CAGE IS NOT FALL PROTECTION UNDER THE CURRENT RULE. It was accepted historically and it is not accepted on new ladders, because it does not ARREST a fall -- it may keep a climber roughly in the ladder's plane while they fall the full height inside it. Existing caged ladders are subject to a phase-out, after which a ladder safety system or a personal fall arrest system is required. The cage may remain; it does not satisfy the requirement"
      : isSystem
        ? "a ladder safety system -- a rail or cable with a travelling attachment -- satisfies the requirement"
        : isPfas
          ? "a personal fall arrest arrangement satisfies the requirement, provided the anchorage is adequate for it"
          : "NO FALL PROTECTION IS PRESENT on a ladder that requires it. A ladder safety system or a personal fall arrest arrangement is needed";
  const rest_platforms_required = Math.max(0, Math.ceil(ladder_height_ft / rest_platform_interval_ft) - 1);
  const longest_unbroken_climb_ft = rest_platforms_required > 0
    ? ladder_height_ft / (rest_platforms_required + 1)
    : ladder_height_ft;
  const platform_verdict = rest_platforms_required <= 0
    ? "at a " + fmt(rest_platform_interval_ft, 0) + " ft interval this " + fmt(ladder_height_ft, 1) + " ft climb needs no intermediate rest platform"
    : "at a " + fmt(rest_platform_interval_ft, 0) + " ft interval this climb needs " + fmt(rest_platforms_required, 0) + " intermediate rest platform" + (rest_platforms_required > 1 ? "s" : "") + ", breaking it into runs of about " + fmt(longest_unbroken_climb_ft, 1) + " ft. Rest platforms belong to the older cage-based provisions, and whether they are present is part of the survey rather than a substitute for fall protection";
  const survey_verdict = "THE FINDING THAT MATTERS AT A FACILITY LEVEL is that a plant with older fixed ladders almost certainly has several in this condition, and they are non-compliant NOW rather than at some future date once the phase-out has passed. A ladder survey against the current requirement -- height, existing protection, installation date, and dimensional compliance -- is the action, and it usually turns up more than expected";
  const dimension_verdict = "AND HEIGHT IS NOT THE ONLY REQUIREMENT. Rung spacing and diameter, side clearance, the climbing space behind the ladder, the extension above a landing, and the landing platform itself all have dimensional requirements a ladder can fail independently of its fall protection, and a ladder that was compliant when installed may not be under the current rule";
  if (![rest_platforms_required, longest_unbroken_climb_ft, height_over_threshold_ft].every(Number.isFinite)) return { error: "Ladder survey math is not a finite value." };
  return {
    requires_protection, height_over_threshold_ft, height_verdict,
    isCage, isSystem, isPfas, compliant, protection_verdict,
    rest_platforms_required, longest_unbroken_climb_ft, platform_verdict,
    survey_verdict, dimension_verdict,
    note: "Whether a fixed ladder needs fall protection, what satisfies the requirement, and where rest platforms fall on a long climb. The height test is a threshold comparison and the interesting part is what counts as protection above it. A CAGE IS NOT FALL PROTECTION UNDER THE CURRENT RULE, and that is the finding this exists to surface. Cages were accepted historically and are not accepted on new ladders, for the reason that a cage does not ARREST a fall: it may keep a falling climber roughly within the ladder's plane while they fall the full height inside it. Existing caged ladders are subject to a phase-out, after which a ladder safety system -- a rail or cable with a travelling attachment -- or a personal fall arrest arrangement is required. The cage may stay in place; it simply does not satisfy the requirement, and a facility that reads its caged ladders as protected has a compliance gap it does not know about. REST PLATFORMS BELONG TO THE OLDER PROVISIONS and are a different question from fall protection. They break a long climb into runs so a climber can rest, and whether they are present is part of surveying an existing ladder rather than an alternative to arresting a fall. A ladder with rest platforms and no fall protection is a ladder with rest platforms and no fall protection. THE FACILITY-LEVEL FINDING IS THE USEFUL ONE. A plant with fixed ladders installed under the older rules almost certainly has several in this condition, and they are non-compliant now rather than at some future date once a phase-out has passed. The action is a survey against the current requirement -- height, existing protection, installation date, dimensional compliance -- and it usually turns up more ladders than expected, because a caged ladder reads as a protected ladder to almost everyone who walks past it. And height is not the only requirement. Rung spacing and diameter, side clearance, the climbing space behind the ladder, the extension above a landing, and the landing platform all carry dimensional requirements a ladder can fail independently, and a ladder compliant when installed may not be under the current rule. This screens entered dimensions against entered thresholds. It does not reproduce any rule's numbers -- the threshold, the phase-out dates and the rest platform interval are entered because they differ between jurisdictions and have changed over time -- determine which rule applies to a given ladder or its installation date, evaluate anchorage adequacy for a personal fall arrest system, check the dimensional requirements above, assess ladder condition, corrosion or attachment, specify a ladder safety system, or address the rescue plan a personal fall arrest arrangement requires. 29 CFR 1910.28 and 1910.23, the applicable state plan, and a qualified person govern.",
  };
}
export const fixedLadderFallProtectionExample = { inputs: { ladder_height_ft: 48, fall_protection_threshold_ft: 24, rest_platform_interval_ft: 50, existing_protection: "cage" } };
HYGIENE_RENDERERS["fixed-ladder-fall-protection"] = _simpleRenderer({
  citation: "Citation: fixed ladder fall protection as 29 CFR 1910.28 structures it -- a height threshold (commonly 24 ft) above which fall protection is required, with a CAGE not counted as fall protection under the current rule because it does not arrest a fall, and existing caged ladders subject to a phase-out to a ladder safety system or personal fall arrest. The threshold, the rest platform interval and the phase-out are ENTERED because they differ between jurisdictions and have changed over time. It does not determine which rule applies, evaluate anchorage, check rung spacing, clearances or landing extensions, assess ladder condition, or address the rescue plan a personal fall arrest arrangement requires. 29 CFR 1910.28 / 1910.23, the applicable state plan and a qualified person govern.",
  example: fixedLadderFallProtectionExample.inputs,
  fields: [
    { key: "ladder_height_ft", label: "Fixed ladder height (ft)", kind: "number", attrs: { step: "any" } },
    { key: "existing_protection", label: "Existing protection", kind: "select", default: "none", options: [{ value: "none", label: "None" }, { value: "cage", label: "Cage or well" }, { value: "system", label: "Ladder safety system (rail or cable)" }, { value: "pfas", label: "Personal fall arrest" }] },
    { key: "fall_protection_threshold_ft", label: "Fall protection threshold (ft)", kind: "number", default: 24, attrs: { step: "any" } },
    { key: "rest_platform_interval_ft", label: "Rest platform interval (ft)", kind: "number", default: 50, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "h", id: "flp-out-h", label: "Against the height threshold", value: (r) => r.height_verdict },
    { key: "p", id: "flp-out-p", label: "Does the existing protection count", value: (r) => r.protection_verdict },
    { key: "r", id: "flp-out-r", label: "Rest platforms", value: (r) => r.platform_verdict },
    { key: "s", id: "flp-out-s", label: "At a facility level", value: (r) => r.survey_verdict },
    { key: "d", id: "flp-out-d", label: "Beyond height", value: (r) => r.dimension_verdict },
    { key: "n", id: "flp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFixedLadderFallProtection,
});

// =====================================================================
// spec-v1736: confined space retrieval winch force and line pull.
// =====================================================================
// dims: in { entrant_weight_lb: M L T^-2, equipment_weight_lb: M L T^-2, friction_pct: dimensionless, entanglement_factor: dimensionless, system_rating_lb: M L T^-2, anchorage_rating_lb: M L T^-2 } out: { suspended_lb: M L T^-2, friction_lb: M L T^-2, retrieval_lb: M L T^-2, entangled_lb: M L T^-2, system_margin_lb: M L T^-2, anchorage_margin_lb: M L T^-2 }
export function computeRetrievalWinchForce({
  entrant_weight_lb = 0, equipment_weight_lb = 0, friction_pct = 15,
  entanglement_factor = 0, system_rating_lb = 0, anchorage_rating_lb = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(entrant_weight_lb > 0)) return { error: "Entrant weight must be positive (lb)." };
  if (equipment_weight_lb < 0) return { error: "Equipment weight cannot be negative." };
  if (friction_pct < 0 || friction_pct > 100) return { error: "The friction allowance must be between 0 and 100 percent." };
  if (entanglement_factor < 0) return { error: "The entanglement factor cannot be negative." };
  if (system_rating_lb < 0 || anchorage_rating_lb < 0) return { error: "Ratings cannot be negative." };
  const suspended_lb = entrant_weight_lb + equipment_weight_lb;
  const friction_lb = suspended_lb * friction_pct / 100;
  const retrieval_lb = suspended_lb + friction_lb;
  const force_verdict = "the suspended load is " + fmt(suspended_lb, 0) + " lb (" + fmt(entrant_weight_lb, 0) + " lb entrant plus " + fmt(equipment_weight_lb, 0) + " lb of equipment), and " + fmt(friction_pct, 0) + "% for line friction over the davit and against the opening adds " + fmt(friction_lb, 0) + " lb -- a free-hanging retrieval force of " + fmt(retrieval_lb, 0) + " lb";
  const has_entanglement = entanglement_factor > 1;
  const entangled_lb = has_entanglement ? retrieval_lb * entanglement_factor : 0;
  const entanglement_verdict = !has_entanglement
    ? "(no entanglement factor entered -- and an entangled or wedged entrant is a DIFFERENT NUMBER ENTIRELY, several times body weight, at which a system rated for the free-hanging case stalls)"
    : "an entangled or wedged entrant at " + fmt(entanglement_factor, 1) + " times that is " + fmt(entangled_lb, 0) + " lb. A system rated for the free-hanging " + fmt(retrieval_lb, 0) + " lb stalls there";
  const has_system = system_rating_lb > 0;
  const system_margin_lb = has_system ? system_rating_lb - retrieval_lb : 0;
  const system_ok = has_system && system_margin_lb >= 0;
  const system_verdict = !has_system
    ? "(no system rating entered)"
    : system_ok
      ? "the " + fmt(system_rating_lb, 0) + " lb system rating covers the free-hanging force with " + fmt(system_margin_lb, 0) + " lb of margin"
        + (has_entanglement ? ", and " + (system_rating_lb >= entangled_lb ? "also covers the entangled case" : "does NOT cover the " + fmt(entangled_lb, 0) + " lb entangled case") : "")
      : "the " + fmt(system_rating_lb, 0) + " lb system rating is " + fmt(-system_margin_lb, 0) + " lb SHORT of the free-hanging retrieval force";
  const has_anchorage = anchorage_rating_lb > 0;
  const anchorage_margin_lb = has_anchorage ? anchorage_rating_lb - retrieval_lb : 0;
  const weakest_rating_lb = has_system && has_anchorage ? Math.min(system_rating_lb, anchorage_rating_lb) : (has_system ? system_rating_lb : anchorage_rating_lb);
  const anchorage_verdict = !has_anchorage
    ? "(no anchorage rating entered -- and THE SYSTEM IS RATED BY ITS WEAKEST ELEMENT)"
    : "THE SYSTEM IS RATED AS A SYSTEM -- winch, line, davit or tripod, and the anchorage -- and the rating is the WEAKEST element. The anchorage at " + fmt(anchorage_rating_lb, 0) + " lb"
      + (has_system
        ? (anchorage_rating_lb < system_rating_lb
          ? " is below the " + fmt(system_rating_lb, 0) + " lb winch, so the anchorage rates this system at " + fmt(weakest_rating_lb, 0) + " lb. A winch rated well above the load mounted on a tripod whose footing is inadequate is a system rated by the footing"
          : " is above the " + fmt(system_rating_lb, 0) + " lb winch, so the winch is the governing element at " + fmt(weakest_rating_lb, 0) + " lb")
        : " carries the load");
  const medical_verdict = "AND THE UPPER LIMIT IS MEDICAL RATHER THAN MECHANICAL. Pulling hard on a wedged entrant injures them. A retrieval that does not come freely is a signal to STOP and go to the entry rescue plan -- which means that plan has to exist, with a trained and equipped team able to respond in time, even at a space where retrieval equipment is provided. Retrieval is not always feasible, and where the configuration will not permit it, an entry rescue capability is required rather than optional";
  const purpose_verdict = "THE REASON ALL OF THIS EXISTS is that most confined space fatalities include would-be rescuers who entered without protection to help someone who had collapsed. Non-entry retrieval is what breaks that pattern, and every detail of it matters: the harness attachment above the entrant's centre of gravity so they come out vertically, the line kept taut so there is no slack to arrest, and the winch positioned so the pull is in line with the opening";
  if (![suspended_lb, friction_lb, retrieval_lb, entangled_lb, system_margin_lb, anchorage_margin_lb].every(Number.isFinite)) return { error: "Retrieval force math is not a finite value." };
  return {
    suspended_lb, friction_lb, retrieval_lb, force_verdict,
    has_entanglement, entangled_lb, entanglement_verdict,
    has_system, system_margin_lb, system_ok, system_verdict,
    has_anchorage, anchorage_margin_lb, weakest_rating_lb, anchorage_verdict,
    medical_verdict, purpose_verdict,
    note: "The force a confined space retrieval system has to produce, which is the entrant and their equipment plus an allowance for line friction over the davit and against the opening. The free-hanging case is straightforward arithmetic and it is the easy half of the problem. AN ENTANGLED OR WEDGED ENTRANT IS A DIFFERENT NUMBER ENTIRELY. The force required can be several times body weight, and a system sized for the free-hanging case stalls at it -- which is the moment the retrieval was supposed to handle. Sizing to the free-hanging load alone produces equipment that works in the drill and not in the event. THE SYSTEM IS RATED AS A SYSTEM AND THE RATING IS ITS WEAKEST ELEMENT. Winch, line, davit or tripod, and anchorage: a winch rated well above the load, mounted on a tripod whose footing is inadequate, is a system rated by the footing. Reading the winch's nameplate as the system's capacity is how a rated-looking arrangement fails, and the anchorage is the element least often calculated because it is usually the structure that happened to be there. AND THE UPPER LIMIT IS MEDICAL RATHER THAN MECHANICAL, which is the part that makes this different from a rigging calculation. Pulling hard enough to free a wedged entrant can injure them badly. A retrieval that does not come freely is a signal to STOP and move to the entry rescue plan -- so that plan has to exist, with a trained and equipped team able to reach the space in time, even where retrieval equipment is provided. Retrieval is not always feasible: some space configurations do not permit it, and where they do not, an entry rescue capability is required rather than optional. THE REASON THE WHOLE ARRANGEMENT EXISTS is that most confined space fatalities include would-be rescuers, who entered without protection to help someone who had collapsed and were overcome by the same atmosphere. Non-entry retrieval is what breaks that pattern, and its details carry the outcome: the harness attachment above the entrant's centre of gravity so they come out vertically rather than jamming, the line kept taut so there is no slack, and the winch positioned so the pull is in line with the opening. This computes a force from entered weights and allowances. It does not size or select a retrieval system, winch, harness or anchorage, evaluate an anchorage's actual capacity or its attachment, determine whether non-entry retrieval is feasible for a given space, assess the atmosphere or any other hazard in the space, write an entry permit or a rescue plan, or evaluate rescue team capability and response time. 29 CFR 1910.146, ANSI Z117.1, the equipment manufacturer's ratings, and the entry supervisor govern.",
  };
}
export const retrievalWinchForceExample = { inputs: { entrant_weight_lb: 200, equipment_weight_lb: 0, friction_pct: 15, entanglement_factor: 3, system_rating_lb: 350, anchorage_rating_lb: 310 } };
HYGIENE_RENDERERS["retrieval-winch-force"] = _simpleRenderer({
  citation: "Citation: retrieval force = entrant plus equipment weight, plus a friction allowance for the line over the davit and against the opening (commonly about 15%), with an entanglement factor applied separately because a wedged entrant can require several times body weight. The system is rated as a SYSTEM -- winch, line, davit or tripod, and anchorage -- and the rating is its weakest element. The upper limit is MEDICAL: a retrieval that does not come freely is a signal to stop and go to the entry rescue plan. It does not size or select equipment, evaluate an anchorage's actual capacity, determine whether non-entry retrieval is feasible, assess the atmosphere, or write a permit or rescue plan. 29 CFR 1910.146, ANSI Z117.1 and the entry supervisor govern.",
  example: retrievalWinchForceExample.inputs,
  fields: [
    { key: "entrant_weight_lb", label: "Entrant weight (lb)", kind: "number", attrs: { step: "any" } },
    { key: "equipment_weight_lb", label: "Equipment weight (lb)", kind: "number", attrs: { step: "any" } },
    { key: "friction_pct", label: "Line friction allowance (%)", kind: "number", default: 15, attrs: { step: "any" } },
    { key: "entanglement_factor", label: "Entanglement factor (× free-hanging, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "system_rating_lb", label: "Winch and system rating (lb, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "anchorage_rating_lb", label: "Anchorage or tripod rating (lb, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "f", id: "rwf-out-f", label: "Retrieval force", value: (r) => r.force_verdict },
    { key: "e", id: "rwf-out-e", label: "If the entrant is entangled", value: (r) => r.entanglement_verdict },
    { key: "s", id: "rwf-out-s", label: "Against the system rating", value: (r) => r.system_verdict },
    { key: "a", id: "rwf-out-a", label: "The weakest element", value: (r) => r.anchorage_verdict },
    { key: "m", id: "rwf-out-m", label: "When to stop pulling", value: (r) => r.medical_verdict },
    { key: "p", id: "rwf-out-p", label: "Why non-entry retrieval exists", value: (r) => r.purpose_verdict },
    { key: "n", id: "rwf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRetrievalWinchForce,
});
