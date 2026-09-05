// calc-elevator.js -- Group E (cont.): elevator and escalator bench.
//
// specs/scope-trade-expansion-2.md probed the live catalog for the vocabulary
// of thirty US trades. Elevator and escalator came back with two tiles, both
// about traffic handling -- nothing about the machine, the ropes, the
// counterweight, the buffers, the doors, or the rails. This is the equipment.
//
// Tiles (all group "E", the existing Carpentry and Construction category; a
// module is independent of the group letter per the v28/v70..v103 split
// precedent):
//   v1648 traction-roping-ratio      v1654 hydraulic-jack-pressure
//   v1649 counterweight-balance      v1655 step-chain-tension
//   v1650 rope-safety-factor         v1656 door-closing-energy
//   v1651 buffer-stroke-speed        v1657 governor-tripping-speed
//   v1652 hoistway-venting           v1658 guide-rail-bracket-span
//   v1653 machine-room-heat
//
// Every one of these is life-safety equipment in a licensed trade, and none of
// them ships a code table: every limit, minimum, and allowable is ENTERED.
// GOVERNANCE.general throughout -- ASME A17.1 and A17.2, the equipment
// manufacturer's data, the elevator authority having jurisdiction, and a
// licensed elevator mechanic govern. See spec-v1648.md through spec-v1658.md.

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
// calc-disinfect.js / calc-rail.js _simpleRenderer).
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

export const ELEVATOR_RENDERERS = {};

// Standard gravity in ft per second squared, the mechanical horsepower
// definition of 33,000 ft-lb per minute, the exact 3,412.142 BTU per hour per
// kilowatt, 231 cubic inches per gallon, and the 5.2 lbf per square foot that
// one inch of water column exerts.
const _G_FPS2 = 32.174;
const _FTLB_PER_MIN_PER_HP = 33000;
const _BTUH_PER_KW = 3412.142;
const _CUIN_PER_GAL = 231;
const _LBF_PER_SQFT_PER_INWC = 5.2;
// Sensible heat of air at standard conditions, BTU per hour per cubic foot per
// degF of rise, used only for the cooling-loss temperature rate.
const _AIR_BTU_PER_CUFT_F = 0.018;

// ===================== spec-v1648: traction roping ratio =====================

// dims: in { roping_ratio: dimensionless, car_speed_fpm: L T^-1, sheave_diameter_in: L, unbalanced_load_lb: M L T^-2, suspended_load_lb: M L T^-2, rope_count: dimensionless, machine_rated_torque_ftlb: M L^2 T^-2, alternative_roping_ratio: dimensionless } out: { rope_speed_fpm: L T^-1, sheave_rpm: T^-1, sheave_torque_ftlb: M L^2 T^-2, tension_per_rope_lb: M L T^-2, power_hp: M L^2 T^-3 }
export function computeTractionRopingRatio({ roping_ratio = 2, car_speed_fpm = 0, sheave_diameter_in = 0, unbalanced_load_lb = 0, suspended_load_lb = 0, rope_count = 0, machine_rated_torque_ftlb = 0, alternative_roping_ratio = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(roping_ratio >= 1)) return { error: "Roping ratio must be at least 1." };
  if (!(alternative_roping_ratio >= 1)) return { error: "Alternative roping ratio must be at least 1." };
  if (!(car_speed_fpm > 0)) return { error: "Car speed must be positive." };
  if (!(sheave_diameter_in > 0)) return { error: "Sheave diameter must be positive." };
  if (!(unbalanced_load_lb > 0)) return { error: "Unbalanced load must be positive." };
  if (!(suspended_load_lb > 0)) return { error: "Suspended load must be positive." };
  if (!(rope_count >= 1)) return { error: "Number of ropes must be at least 1." };
  if (!(machine_rated_torque_ftlb > 0)) return { error: "Machine rated torque must be positive." };
  const radius_ft = sheave_diameter_in / 2 / 12;
  const rope_speed_fpm = roping_ratio * car_speed_fpm;
  const sheave_rpm = rope_speed_fpm * 12 / (Math.PI * sheave_diameter_in);
  const sheave_torque_ftlb = (unbalanced_load_lb / roping_ratio) * radius_ft;
  const tension_per_rope_lb = suspended_load_lb / (roping_ratio * rope_count);
  const power_hp = unbalanced_load_lb * car_speed_fpm / _FTLB_PER_MIN_PER_HP;
  const torque_margin_pct = (machine_rated_torque_ftlb - sheave_torque_ftlb) / sheave_torque_ftlb * 100;
  const alt_rope_speed_fpm = alternative_roping_ratio * car_speed_fpm;
  const alt_sheave_rpm = alt_rope_speed_fpm * 12 / (Math.PI * sheave_diameter_in);
  const alt_sheave_torque_ftlb = (unbalanced_load_lb / alternative_roping_ratio) * radius_ft;
  const alt_tension_per_rope_lb = suspended_load_lb / (alternative_roping_ratio * rope_count);
  return {
    rope_speed_fpm, sheave_rpm, sheave_torque_ftlb, tension_per_rope_lb, power_hp,
    torque_margin_pct, torque_ok: machine_rated_torque_ftlb >= sheave_torque_ftlb,
    alt_rope_speed_fpm, alt_sheave_rpm, alt_sheave_torque_ftlb, alt_tension_per_rope_lb,
    rope_travel_per_car_ft: roping_ratio,
    note: "The roping ratio is a mechanical advantage and it trades force for speed exactly as any block and tackle does. A 2 to 1 arrangement halves the tension each rope carries, allowing smaller ropes or fewer of them, and doubles the rope speed, so the machine turns twice as fast for the same car speed. That is why 2 to 1 dominates in geared and machine-room-less installations while 1 to 1 is common on high-speed gearless machines where rope speed would otherwise become excessive. The consequences follow the mechanic around: rope travel is twice the car travel, so rope wear and stretch accumulate twice as fast, and the sheave sees twice the rope passes per trip, which is the fatigue driver in the grooves. The arithmetic error worth preventing is computing motor torque from the car load and the sheave radius WITHOUT dividing by the ratio, which overstates it by a factor of two on a 2 to 1 machine and makes a correct drive look undersized. The governor and safeties are arranged for the CAR's speed while the ropes run at the ratio times it. This is kinematics and statics: it does not size a machine, motor, brake, or drive, evaluate traction or sheave groove pressure, or account for compensation, rope weight over the travel, or the inertia of the rotating masses. ASME A17.1, the equipment manufacturer's data, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.",
  };
}
const tractionRopingExample = { inputs: { roping_ratio: 2, car_speed_fpm: 500, sheave_diameter_in: 30, unbalanced_load_lb: 2000, suspended_load_lb: 11500, rope_count: 5, machine_rated_torque_ftlb: 1500, alternative_roping_ratio: 1 } };
ELEVATOR_RENDERERS["traction-roping-ratio"] = _simpleRenderer({
  citation: "Citation: the roping-ratio relations -- rope speed = ratio x car speed, sheave torque = (unbalanced load / ratio) x sheave radius, machine rpm = rope speed x 12 / (pi x sheave diameter), and tension per rope = suspended load / (ratio x rope count) -- with ASME A17.1 and the equipment manufacturer's data named. Kinematics and statics only; the machine, brake, and drive are sized by the manufacturer.",
  example: tractionRopingExample.inputs,
  fields: [
    { key: "roping_ratio", label: "Roping ratio (rope travel per car travel)", kind: "number", default: 2 },
    { key: "car_speed_fpm", label: "Car speed (fpm)", kind: "number", default: 500 },
    { key: "sheave_diameter_in", label: "Drive sheave diameter (in)", kind: "number", default: 30 },
    { key: "unbalanced_load_lb", label: "Unbalanced load at the car (lb)", kind: "number", default: 2000 },
    { key: "suspended_load_lb", label: "Suspended load on the ropes (lb)", kind: "number", default: 11500 },
    { key: "rope_count", label: "Number of suspension ropes", kind: "number", default: 5 },
    { key: "machine_rated_torque_ftlb", label: "Machine rated torque (ft-lb)", kind: "number", default: 1500 },
    { key: "alternative_roping_ratio", label: "Alternative roping ratio to compare", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "s", id: "trr-out-s", label: "Rope speed", value: (r) => fmt(r.rope_speed_fpm, 0) + " fpm" },
    { key: "m", id: "trr-out-m", label: "Machine speed at the sheave", value: (r) => fmt(r.sheave_rpm, 1) + " rpm" },
    { key: "t", id: "trr-out-t", label: "Sheave torque", value: (r) => fmt(r.sheave_torque_ftlb, 0) + " ft-lb" },
    { key: "g", id: "trr-out-g", label: "Against the machine rating", value: (r) => (r.torque_ok ? "within rating, " : "OVER rating, ") + fmt(r.torque_margin_pct, 0) + "% margin" },
    { key: "r", id: "trr-out-r", label: "Tension per rope", value: (r) => fmt(r.tension_per_rope_lb, 0) + " lb" },
    { key: "p", id: "trr-out-p", label: "Power at the entered load and speed", value: (r) => fmt(r.power_hp, 1) + " hp" },
    { key: "a", id: "trr-out-a", label: "At the alternative ratio", value: (r) => fmt(r.alt_sheave_torque_ftlb, 0) + " ft-lb torque, " + fmt(r.alt_sheave_rpm, 1) + " rpm, " + fmt(r.alt_tension_per_rope_lb, 0) + " lb per rope" },
    { key: "n", id: "trr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTractionRopingRatio,
});

// ===================== spec-v1649: counterweight balance =====================

// dims: in { car_weight_lb: M L T^-2, rated_capacity_lb: M L T^-2, overbalance_pct: dimensionless, actual_counterweight_lb: M L T^-2, added_car_weight_lb: M L T^-2 } out: { counterweight_required_lb: M L T^-2, unbalanced_empty_lb: M L T^-2, unbalanced_full_lb: M L T^-2, balance_point_lb: M L T^-2, overbalance_actual_pct: dimensionless }
export function computeCounterweightBalance({ car_weight_lb = 0, rated_capacity_lb = 0, overbalance_pct = 45, actual_counterweight_lb = 0, added_car_weight_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(car_weight_lb > 0)) return { error: "Car weight must be positive." };
  if (!(rated_capacity_lb > 0)) return { error: "Rated capacity must be positive." };
  if (!(overbalance_pct > 0 && overbalance_pct <= 100)) return { error: "Overbalance must be in (0, 100] percent." };
  if (!(actual_counterweight_lb > car_weight_lb)) return { error: "Actual counterweight must exceed the empty car weight." };
  if (!(added_car_weight_lb >= 0)) return { error: "Added car weight cannot be negative." };
  const counterweight_required_lb = car_weight_lb + (overbalance_pct / 100) * rated_capacity_lb;
  const unbalanced_empty_lb = Math.abs(car_weight_lb - counterweight_required_lb);
  const unbalanced_full_lb = Math.abs(car_weight_lb + rated_capacity_lb - counterweight_required_lb);
  const worst_case_lb = Math.max(unbalanced_empty_lb, unbalanced_full_lb);
  const governing = unbalanced_full_lb >= unbalanced_empty_lb ? "full car up" : "empty car up";
  const balance_point_lb = actual_counterweight_lb - car_weight_lb;
  const overbalance_actual_pct = balance_point_lb / rated_capacity_lb * 100;
  const modified_balance_point_lb = actual_counterweight_lb - (car_weight_lb + added_car_weight_lb);
  const modified_overbalance_pct = modified_balance_point_lb / rated_capacity_lb * 100;
  const equal_overbalance_unbalanced_lb = rated_capacity_lb / 2;
  return {
    counterweight_required_lb, unbalanced_empty_lb, unbalanced_full_lb, worst_case_lb, governing,
    balance_point_lb, overbalance_actual_pct, modified_balance_point_lb, modified_overbalance_pct,
    equal_overbalance_unbalanced_lb,
    note: "The overbalance fraction is a compromise between two worst cases. At 50 percent the empty-car and full-car unbalanced loads are equal and the machine sees the same demand in both directions. Below 50 the full-car case governs and the machine works hardest lifting a full car up; above it, the empty case governs. Forty to forty-five percent is common because a full car going up is the loading that matters for comfort and because it keeps traction favourable. Traction is what bounds the choice: a traction machine drives the ropes by friction in the sheave grooves, and the ratio of the tensions on the two sides has to stay within what the groove profile and the wrap angle can hold. Too much counterweight or too little and the ropes slip, which is why a traction calculation accompanies any counterweight change. The field consequence is diagnostic. A car that runs well loaded and struggles empty, or the reverse, is reporting its balance, and the balance point is measured by loading the car until the machine draws the same current in both directions rather than assumed. That is also the check that follows any change to the car -- new flooring, new fixtures, a heavier door operator -- because added car weight moves the balance point without anyone touching the counterweight. This does not evaluate traction, account for compensation ropes or chains, or size the machine, motor, or brake, and hydraulic elevators have no counterweight at all. ASME A17.1 and A17.2, the equipment manufacturer's data, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.",
  };
}
const counterweightBalanceExample = { inputs: { car_weight_lb: 8000, rated_capacity_lb: 3500, overbalance_pct: 45, actual_counterweight_lb: 9575, added_car_weight_lb: 400 } };
ELEVATOR_RENDERERS["counterweight-balance"] = _simpleRenderer({
  citation: "Citation: the counterweight overbalance relation -- counterweight = car weight + overbalance x rated capacity, with the unbalanced load the machine drives being the difference at each end of the loading range -- with ASME A17.1 named as governing traction and the licensed elevator mechanic named. Traction itself is not evaluated here.",
  example: counterweightBalanceExample.inputs,
  fields: [
    { key: "car_weight_lb", label: "Empty car weight (lb)", kind: "number", default: 8000 },
    { key: "rated_capacity_lb", label: "Rated capacity (lb)", kind: "number", default: 3500 },
    { key: "overbalance_pct", label: "Design overbalance (%)", kind: "number", default: 45 },
    { key: "actual_counterweight_lb", label: "Actual counterweight weight (lb)", kind: "number", default: 9575 },
    { key: "added_car_weight_lb", label: "Weight added to the car since (lb)", kind: "number", default: 400 },
  ],
  outputs: [
    { key: "c", id: "cwb-out-c", label: "Counterweight at the design overbalance", value: (r) => fmt(r.counterweight_required_lb, 0) + " lb" },
    { key: "e", id: "cwb-out-e", label: "Unbalanced load, car empty", value: (r) => fmt(r.unbalanced_empty_lb, 0) + " lb" },
    { key: "f", id: "cwb-out-f", label: "Unbalanced load, car full", value: (r) => fmt(r.unbalanced_full_lb, 0) + " lb" },
    { key: "w", id: "cwb-out-w", label: "Worst case", value: (r) => fmt(r.worst_case_lb, 0) + " lb (" + r.governing + "); at 50% both would be " + fmt(r.equal_overbalance_unbalanced_lb, 0) + " lb" },
    { key: "b", id: "cwb-out-b", label: "Balance point from the actual counterweight", value: (r) => fmt(r.balance_point_lb, 0) + " lb (" + fmt(r.overbalance_actual_pct, 1) + "% of capacity)" },
    { key: "m", id: "cwb-out-m", label: "Balance point after the added car weight", value: (r) => fmt(r.modified_balance_point_lb, 0) + " lb (" + fmt(r.modified_overbalance_pct, 1) + "% of capacity)" },
    { key: "n", id: "cwb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCounterweightBalance,
});

// ===================== spec-v1650: suspension rope factor of safety =====================

// dims: in { car_weight_lb: M L T^-2, rated_load_lb: M L T^-2, travelling_cable_lb: M L T^-2, rope_count: dimensionless, rope_weight_per_ft: M T^-2, rope_breaking_strength_lb: M L T^-2, rise_ft: L, code_minimum_fs: dimensionless } out: { rope_weight_lb: M L T^-2, suspended_load_lb: M L T^-2, breaking_total_lb: M L T^-2, factor_of_safety: dimensionless, max_rated_load_lb: M L T^-2 }
export function computeElevatorRopeSafetyFactor({ car_weight_lb = 0, rated_load_lb = 0, travelling_cable_lb = 0, rope_count = 0, rope_weight_per_ft = 0, rope_breaking_strength_lb = 0, rise_ft = 0, code_minimum_fs = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(car_weight_lb > 0)) return { error: "Car weight must be positive." };
  if (!(rated_load_lb > 0)) return { error: "Rated load must be positive." };
  if (!(travelling_cable_lb >= 0)) return { error: "Travelling cable weight cannot be negative." };
  if (!(rope_count >= 1)) return { error: "Number of ropes must be at least 1." };
  if (!(rope_weight_per_ft > 0)) return { error: "Rope weight per foot must be positive." };
  if (!(rope_breaking_strength_lb > 0)) return { error: "Rope breaking strength must be positive." };
  if (!(rise_ft > 0)) return { error: "Rise must be positive." };
  if (!(code_minimum_fs > 0)) return { error: "Code minimum factor of safety must be positive." };
  const rope_weight_lb = rope_count * rise_ft * rope_weight_per_ft;
  const load_without_ropes_lb = car_weight_lb + rated_load_lb + travelling_cable_lb;
  const suspended_load_lb = load_without_ropes_lb + rope_weight_lb;
  const breaking_total_lb = rope_count * rope_breaking_strength_lb;
  const factor_of_safety = breaking_total_lb / suspended_load_lb;
  const fs_without_rope_weight = breaking_total_lb / load_without_ropes_lb;
  const overstatement = fs_without_rope_weight - factor_of_safety;
  const margin = factor_of_safety - code_minimum_fs;
  const allowable_suspended_lb = breaking_total_lb / code_minimum_fs;
  const max_rated_load_lb = allowable_suspended_lb - (car_weight_lb + travelling_cable_lb + rope_weight_lb);
  return {
    rope_weight_lb, suspended_load_lb, breaking_total_lb, factor_of_safety,
    fs_without_rope_weight, overstatement, margin,
    pass: factor_of_safety >= code_minimum_fs,
    max_rated_load_lb: Math.max(0, max_rated_load_lb),
    minimum_unreachable: max_rated_load_lb <= 0,
    verdict: factor_of_safety >= code_minimum_fs ? "meets the entered minimum" : "BELOW the entered minimum",
    note: "The factor of safety the code requires rises with speed, because a faster car imposes higher dynamic loads and because the consequences scale with it, so a rope set entirely adequate for a slow freight elevator can be below the requirement for a high-speed passenger car. The applicable minimum comes from the code table against the actual contract speed and is entered here rather than shipped. Rope weight is the term that grows with the building and the one most often dropped: on a low rise it is a footnote, and on a high-rise installation the ropes hanging below the sheave are a substantial fraction of the suspended load, carried at the top where the factor is checked. That is also why compensation exists, and why an installation without it sees a different load at the top and the bottom of its run. The retirement criteria are what actually removes ropes from service. Broken wires per rope lay, reduction in diameter, corrosion, distortion, and unequal tension between ropes each condemn a rope regardless of what the arithmetic says, they are assessed by a qualified person on a mandated schedule, and a comfortable calculated factor does not extend a rope's life. This is a static calculation: it does not model acceleration, emergency stops, safety application, or buffer engagement, and it does not evaluate traction, groove pressure, or the bending fatigue that sheave-to-rope diameter ratio imposes. ASME A17.1 and A17.2, the equipment manufacturer, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.",
  };
}
const ropeSafetyExample = { inputs: { car_weight_lb: 12000, rated_load_lb: 3500, travelling_cable_lb: 200, rope_count: 5, rope_weight_per_ft: 0.68, rope_breaking_strength_lb: 17900, rise_ft: 220, code_minimum_fs: 7.6 } };
ELEVATOR_RENDERERS["rope-safety-factor"] = _simpleRenderer({
  citation: "Citation: the suspended-load factor of safety -- (rope count x breaking strength) / (car + rated load + travelling cable + rope weight below the sheave) -- with the ASME A17.1 speed-dependent minimums and the rope retirement criteria named. The minimum for the contract speed is entered from the code table, not reproduced. A licensed elevator mechanic governs.",
  example: ropeSafetyExample.inputs,
  fields: [
    { key: "car_weight_lb", label: "Car weight (lb)", kind: "number", default: 12000 },
    { key: "rated_load_lb", label: "Rated load (lb)", kind: "number", default: 3500 },
    { key: "travelling_cable_lb", label: "Travelling cable weight (lb)", kind: "number", default: 200 },
    { key: "rope_count", label: "Number of suspension ropes", kind: "number", default: 5 },
    { key: "rope_weight_per_ft", label: "Rope weight (lb per ft, each)", kind: "number", default: 0.68 },
    { key: "rope_breaking_strength_lb", label: "Rope breaking strength (lb, each)", kind: "number", default: 17900 },
    { key: "rise_ft", label: "Rise (ft)", kind: "number", default: 220 },
    { key: "code_minimum_fs", label: "Code minimum factor of safety for the speed", kind: "number", default: 7.6 },
  ],
  outputs: [
    { key: "w", id: "ersf-out-w", label: "Rope weight below the sheave", value: (r) => fmt(r.rope_weight_lb, 0) + " lb" },
    { key: "s", id: "ersf-out-s", label: "Total suspended load", value: (r) => fmt(r.suspended_load_lb, 0) + " lb" },
    { key: "f", id: "ersf-out-f", label: "Factor of safety", value: (r) => fmt(r.factor_of_safety, 2) + " -- " + r.verdict + " (margin " + fmt(r.margin, 2) + ")" },
    { key: "o", id: "ersf-out-o", label: "Leaving the rope weight out would read", value: (r) => fmt(r.fs_without_rope_weight, 2) + " (" + fmt(r.overstatement, 2) + " better than the truth)" },
    { key: "m", id: "ersf-out-m", label: "Rated load at which the factor reaches the minimum", value: (r) => r.minimum_unreachable ? "none -- this rope set is below the minimum with an empty car" : fmt(r.max_rated_load_lb, 0) + " lb" },
    { key: "n", id: "ersf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeElevatorRopeSafetyFactor,
});

// ===================== spec-v1651: buffer stroke and impact speed =====================

// dims: in { contract_speed_fpm: L T^-1, governor_trip_fpm: L T^-1, permitted_retardation_g: dimensionless, buffer_rated_stroke_in: L, buffer_rated_speed_fpm: L T^-1 } out: { impact_speed_fps: L T^-1, stroke_required_in: L, stroke_at_1g_in: L, retardation_installed_g: dimensionless, max_speed_for_buffer_fpm: L T^-1 }
export function computeBufferStroke({ contract_speed_fpm = 0, governor_trip_fpm = 0, permitted_retardation_g = 1, buffer_rated_stroke_in = 0, buffer_rated_speed_fpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(contract_speed_fpm > 0)) return { error: "Contract speed must be positive." };
  if (!(governor_trip_fpm > 0)) return { error: "Governor tripping speed must be positive." };
  if (!(governor_trip_fpm >= contract_speed_fpm)) return { error: "Governor tripping speed cannot be below the contract speed." };
  if (!(permitted_retardation_g > 0)) return { error: "Permitted average retardation must be positive." };
  if (!(buffer_rated_stroke_in > 0)) return { error: "Buffer rated stroke must be positive." };
  if (!(buffer_rated_speed_fpm > 0)) return { error: "Buffer rated striking speed must be positive." };
  const impact_speed_fps = governor_trip_fpm / 60;
  const v2 = impact_speed_fps * impact_speed_fps;
  const stroke_required_ft = v2 / (2 * permitted_retardation_g * _G_FPS2);
  const stroke_required_in = stroke_required_ft * 12;
  const stroke_at_1g_in = v2 / (2 * _G_FPS2) * 12;
  const rated_stroke_ft = buffer_rated_stroke_in / 12;
  const retardation_installed_g = v2 / (2 * rated_stroke_ft) / _G_FPS2;
  const max_speed_for_buffer_fpm = Math.sqrt(2 * permitted_retardation_g * _G_FPS2 * rated_stroke_ft) * 60;
  const stroke_ok = buffer_rated_stroke_in >= stroke_required_in;
  const speed_ok = buffer_rated_speed_fpm >= governor_trip_fpm;
  return {
    impact_speed_fps, stroke_required_in, stroke_at_1g_in, retardation_installed_g,
    max_speed_for_buffer_fpm, stroke_ok, speed_ok,
    verdict: stroke_ok && speed_ok ? "the rated buffer covers this impact"
      : !speed_ok ? "OVER the buffer's rated striking speed"
        : "SHORT of the stroke this impact needs",
    note: "Stroke grows with the SQUARE of the impact speed, so doubling the speed quadruples the stroke. That is what separates buffer types: a slow car needs a short stroke and a spring will do, and doubling the speed quickly exceeds what a spring can practically provide, which is why the code permits spring buffers only up to a stated car speed and pushes faster cars to oil buffers that dissipate the energy rather than storing it. The speed that matters is not the contract speed. A car reaching the buffer has already overspeeded past the governor's mechanical trip, so the buffer is sized on the GOVERNOR tripping speed -- which is why raising a governor setting to stop nuisance trips invalidates a buffer selection made beneath it, and why the two are designed as a pair. The retardation limit is a human limit rather than a structural one: the buffer could stop the car in a much shorter distance and the code does not allow it, because the occupants have to survive the stop. An average of about one gravity with a bounded peak is what sets the stroke, and it is why an oil buffer's orifice profile matters -- a buffer that stops the car in the right distance with a spike at the start fails the peak criterion even though the average is correct. Buffer selection is governed by the code's tables and the manufacturer's rated stroke and striking speed, not by this arithmetic, and an oil buffer applied outside its rated load range does not produce its rated retardation. ASME A17.1 and A17.2, the buffer manufacturer's ratings, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.",
  };
}
const bufferStrokeExample = { inputs: { contract_speed_fpm: 500, governor_trip_fpm: 575, permitted_retardation_g: 1, buffer_rated_stroke_in: 21, buffer_rated_speed_fpm: 600 } };
ELEVATOR_RENDERERS["buffer-stroke-speed"] = _simpleRenderer({
  citation: "Citation: the kinematic stroke relation s = v squared / (2 a) at the governor tripping speed, with the ASME A17.1 average retardation limit of about one gravity and its bounded short-duration peak named. Buffer type, required stroke, and rated striking speed come from the code tables and the manufacturer, not from this calculation.",
  example: bufferStrokeExample.inputs,
  fields: [
    { key: "contract_speed_fpm", label: "Contract car speed (fpm)", kind: "number", default: 500 },
    { key: "governor_trip_fpm", label: "Governor mechanical tripping speed (fpm)", kind: "number", default: 575 },
    { key: "permitted_retardation_g", label: "Permitted average retardation (gravities)", kind: "number", default: 1 },
    { key: "buffer_rated_stroke_in", label: "Installed buffer rated stroke (in)", kind: "number", default: 21 },
    { key: "buffer_rated_speed_fpm", label: "Installed buffer rated striking speed (fpm)", kind: "number", default: 600 },
  ],
  outputs: [
    { key: "v", id: "bss-out-v", label: "Impact speed at the governor trip", value: (r) => fmt(r.impact_speed_fps, 2) + " ft/s" },
    { key: "s", id: "bss-out-s", label: "Stroke required at the entered retardation", value: (r) => fmt(r.stroke_required_in, 1) + " in" },
    { key: "o", id: "bss-out-o", label: "Stroke at a one-gravity average", value: (r) => fmt(r.stroke_at_1g_in, 1) + " in" },
    { key: "b", id: "bss-out-b", label: "Installed buffer against the requirement", value: (r) => r.verdict },
    { key: "r", id: "bss-out-r", label: "Retardation the installed buffer imposes", value: (r) => fmt(r.retardation_installed_g, 2) + " gravities" },
    { key: "x", id: "bss-out-x", label: "Speed at which the installed buffer reaches the limit", value: (r) => fmt(r.max_speed_for_buffer_fpm, 0) + " fpm" },
    { key: "n", id: "bss-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBufferStroke,
});

// ===================== spec-v1652: hoistway venting and pressurization =====================

// dims: in { hoistway_plan_area_sqft: L^2, vent_fraction_pct: dimensionless, door_width_in: L, door_height_in: L, pressure_diff_inwc: M L^-1 T^-2, door_force_limit_lbf: M L T^-2, leakage_area_sqft: L^2 } out: { vent_area_sqft: L^2, door_area_sqft: L^2, door_force_added_lbf: M L T^-2, max_pressure_inwc: M L^-1 T^-2, supply_airflow_cfm: L^3 T^-1 }
export function computeHoistwayVenting({ hoistway_plan_area_sqft = 0, vent_fraction_pct = 3.5, door_width_in = 0, door_height_in = 0, pressure_diff_inwc = 0, door_force_limit_lbf = 0, leakage_area_sqft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hoistway_plan_area_sqft > 0)) return { error: "Hoistway plan area must be positive." };
  if (!(vent_fraction_pct > 0 && vent_fraction_pct <= 100)) return { error: "Vent fraction must be in (0, 100] percent." };
  if (!(door_width_in > 0)) return { error: "Door width must be positive." };
  if (!(door_height_in > 0)) return { error: "Door height must be positive." };
  if (!(pressure_diff_inwc > 0)) return { error: "Pressure difference must be positive." };
  if (!(door_force_limit_lbf > 0)) return { error: "Door opening force limit must be positive." };
  if (!(leakage_area_sqft > 0)) return { error: "Shaft leakage area must be positive." };
  const vent_area_sqft = hoistway_plan_area_sqft * vent_fraction_pct / 100;
  const door_area_sqft = door_width_in * door_height_in / 144;
  const door_force_added_lbf = door_area_sqft * pressure_diff_inwc * _LBF_PER_SQFT_PER_INWC;
  const max_pressure_inwc = door_force_limit_lbf / (door_area_sqft * _LBF_PER_SQFT_PER_INWC);
  // NFPA 92 orifice flow: 2,610 cfm per square foot of leakage at one inch
  // water column, scaling with the square root of the pressure difference.
  const supply_airflow_cfm = 2610 * leakage_area_sqft * Math.sqrt(pressure_diff_inwc);
  const force_ok = door_force_added_lbf <= door_force_limit_lbf;
  return {
    vent_area_sqft, door_area_sqft, door_force_added_lbf, max_pressure_inwc, supply_airflow_cfm,
    force_ok,
    verdict: force_ok ? "within the entered door force limit" : "OVER the entered door force limit",
    note: "The two approaches solve the same problem in opposite directions and the code has moved between them. Venting accepts that smoke enters the shaft and gives it somewhere to go, through an opening at the top sized as a fraction of the plan area. Pressurization supplies air to the shaft to keep smoke out in the first place. Energy codes disliked permanent open vents on every hoistway and smoke control practice preferred a clean shaft, so pressurization became the common answer -- but which is REQUIRED depends entirely on the adopted code and the authority having jurisdiction, and buildings exist with both. The constraint that bounds pressurization is the door. Too little pressure and smoke migrates in; too much and the difference across the hoistway and stairwell doors makes them hard to open, which fails the egress force limits. That band is narrow, and narrower in tall buildings where the shaft's own stack effect adds a season-dependent pressure of its own that the fan has to work with rather than against, and that reverses between summer and winter -- so a system commissioned in one season can behave quite differently in the other. This is a screen with supporting arithmetic, not a smoke control design: that needs leakage areas for the shaft and the building, stack and wind effects across the seasons, the behaviour with doors open, the interaction with stairwell pressurization and the building HVAC, and a commissioning test. Elevators used for occupant evacuation or firefighter operations carry additional requirements. The adopted building and fire codes, NFPA 92, ASME A17.1 where elevator operation is affected, a smoke control engineer, and the authority having jurisdiction govern.",
  };
}
const hoistwayVentingExample = { inputs: { hoistway_plan_area_sqft: 90, vent_fraction_pct: 3.5, door_width_in: 36, door_height_in: 84, pressure_diff_inwc: 0.10, door_force_limit_lbf: 30, leakage_area_sqft: 2.0 } };
ELEVATOR_RENDERERS["hoistway-venting"] = _simpleRenderer({
  citation: "Citation: the historic vent area as a fraction of the hoistway plan area, and the pressurization side as an orifice flow of about 2,610 cfm per square foot of leakage at one inch water column with the door force from 5.2 lbf per square foot per inch water column; NFPA 92 and the adopted building code named as governing which approach applies. A screen, not a smoke control design.",
  example: hoistwayVentingExample.inputs,
  fields: [
    { key: "hoistway_plan_area_sqft", label: "Hoistway plan area (sq ft)", kind: "number", default: 90 },
    { key: "vent_fraction_pct", label: "Required vent area (% of plan area)", kind: "number", default: 3.5 },
    { key: "door_width_in", label: "Hoistway door width (in)", kind: "number", default: 36 },
    { key: "door_height_in", label: "Hoistway door height (in)", kind: "number", default: 84 },
    { key: "pressure_diff_inwc", label: "Target pressure difference (in wc)", kind: "number", default: 0.10 },
    { key: "door_force_limit_lbf", label: "Permitted door opening force (lbf)", kind: "number", default: 30 },
    { key: "leakage_area_sqft", label: "Shaft leakage area (sq ft)", kind: "number", default: 2.0 },
  ],
  outputs: [
    { key: "v", id: "hwv-out-v", label: "Vent area under a venting requirement", value: (r) => fmt(r.vent_area_sqft, 2) + " sq ft" },
    { key: "q", id: "hwv-out-q", label: "Supply air to hold the target pressure", value: (r) => fmt(r.supply_airflow_cfm, 0) + " cfm" },
    { key: "d", id: "hwv-out-d", label: "Door area", value: (r) => fmt(r.door_area_sqft, 1) + " sq ft" },
    { key: "f", id: "hwv-out-f", label: "Force the pressure adds to the door", value: (r) => fmt(r.door_force_added_lbf, 1) + " lbf -- " + r.verdict },
    { key: "m", id: "hwv-out-m", label: "Pressure at which the door reaches its limit", value: (r) => fmt(r.max_pressure_inwc, 3) + " in wc" },
    { key: "n", id: "hwv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHoistwayVenting,
});

// ===================== spec-v1653: machine room heat load =====================

// dims: in { input_power_kw: M L^2 T^-3, efficiency_pct: dimensionless, duty_cycle_pct: dimensionless, controller_standby_w: M L^2 T^-3, other_gains_btuh: M L^2 T^-3, room_volume_cuft: L^3, ambient_limit_f: T, starting_temp_f: T } out: { heat_running_btuh: M L^2 T^-3, heat_average_btuh: M L^2 T^-3, total_btuh: M L^2 T^-3, cooling_tons: M L^2 T^-3, temp_rise_f_per_hr: T }
export function computeMachineRoomHeat({ input_power_kw = 0, efficiency_pct = 85, duty_cycle_pct = 40, controller_standby_w = 0, other_gains_btuh = 0, room_volume_cuft = 0, ambient_limit_f = 104, starting_temp_f = 80 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(input_power_kw > 0)) return { error: "Machine and drive input power must be positive." };
  if (!(efficiency_pct > 0 && efficiency_pct < 100)) return { error: "Efficiency must be in (0, 100) percent." };
  if (!(duty_cycle_pct > 0 && duty_cycle_pct <= 100)) return { error: "Duty cycle must be in (0, 100] percent." };
  if (!(controller_standby_w >= 0)) return { error: "Controller standby power cannot be negative." };
  if (!(other_gains_btuh >= 0)) return { error: "Other gains cannot be negative." };
  if (!(room_volume_cuft > 0)) return { error: "Room volume must be positive." };
  if (!(ambient_limit_f > starting_temp_f)) return { error: "Equipment temperature limit must exceed the starting room temperature." };
  const heat_running_btuh = input_power_kw * (1 - efficiency_pct / 100) * _BTUH_PER_KW;
  const heat_average_btuh = heat_running_btuh * duty_cycle_pct / 100;
  const controller_btuh = controller_standby_w / 1000 * _BTUH_PER_KW;
  const total_btuh = heat_average_btuh + controller_btuh + other_gains_btuh;
  const cooling_tons = total_btuh / 12000;
  const connected_btuh = input_power_kw * _BTUH_PER_KW;
  const connected_overstatement = connected_btuh / heat_running_btuh;
  const temp_rise_f_per_hr = total_btuh / (_AIR_BTU_PER_CUFT_F * room_volume_cuft);
  const hours_to_limit = (ambient_limit_f - starting_temp_f) / temp_rise_f_per_hr;
  return {
    heat_running_btuh, heat_average_btuh, controller_btuh, total_btuh, cooling_tons,
    connected_btuh, connected_overstatement, temp_rise_f_per_hr,
    hours_to_limit, minutes_to_limit: hours_to_limit * 60,
    note: "The heat is the INEFFICIENCY, which makes it a smaller number than people expect but a persistent one, and because elevators run intermittently the average over a peak hour is what a cooling system has to remove. The sizing error in one direction is computing the load from the machine's connected power rather than its losses, which on an efficient machine overstates it several times over and buys a cooling unit far larger than needed. The error in the other direction is computing it from the machine alone: the controller draws standby power continuously even when the car is parked, a machine room on a roof with an uninsulated west wall can gain more through the envelope than the equipment contributes, and a room shared with other equipment inherits its heat too. The consequence of exceeding the limit is specific and bad. Modern drives monitor their own temperature and shut down to protect themselves, and an elevator that shuts down mid-trip is an entrapment requiring a rescue. That is why machine room cooling in most jurisdictions is a required system rather than a comfort provision, and why it is often required to be on standby power alongside the elevator. The temperature-rise figure here assumes the room loses no heat at all through its envelope, so it is a fastest-case bound rather than a prediction. Efficiency varies with load and speed, and a regenerative drive returns energy to the supply instead of dissipating it, which changes the room load substantially -- manufacturer heat rejection data for the specific equipment is the authority. Duty cycle must come from the building's actual traffic. ASME A17.1, the equipment manufacturer's environmental limits, the adopted building code, and the elevator authority having jurisdiction govern.",
  };
}
const machineRoomHeatExample = { inputs: { input_power_kw: 15, efficiency_pct: 85, duty_cycle_pct: 40, controller_standby_w: 400, other_gains_btuh: 6000, room_volume_cuft: 2000, ambient_limit_f: 104, starting_temp_f: 80 } };
ELEVATOR_RENDERERS["machine-room-heat"] = _simpleRenderer({
  citation: "Citation: loss-based heat rejection -- input power x (1 - efficiency), at the exact 3,412.142 BTU per hour per kilowatt -- averaged over an entered peak-hour duty cycle, with ASME A17.1 and the equipment manufacturer's environmental limits named. Manufacturer heat rejection data for the specific machine and drive is the authority.",
  example: machineRoomHeatExample.inputs,
  fields: [
    { key: "input_power_kw", label: "Machine and drive input power (kW)", kind: "number", default: 15 },
    { key: "efficiency_pct", label: "Machine and drive efficiency (%)", kind: "number", default: 85 },
    { key: "duty_cycle_pct", label: "Duty cycle over the peak hour (%)", kind: "number", default: 40 },
    { key: "controller_standby_w", label: "Controller standby power (watts)", kind: "number", default: 400 },
    { key: "other_gains_btuh", label: "Lighting and envelope gains (BTU/h)", kind: "number", default: 6000 },
    { key: "room_volume_cuft", label: "Machine room volume (cu ft)", kind: "number", default: 2000 },
    { key: "ambient_limit_f", label: "Equipment maximum temperature (degF)", kind: "number", default: 104 },
    { key: "starting_temp_f", label: "Room temperature when cooling is lost (degF)", kind: "number", default: 80 },
  ],
  outputs: [
    { key: "r", id: "mrh-out-r", label: "Heat rejected while running", value: (r) => fmt(r.heat_running_btuh, 0) + " BTU/h" },
    { key: "a", id: "mrh-out-a", label: "Average over the duty cycle", value: (r) => fmt(r.heat_average_btuh, 0) + " BTU/h" },
    { key: "t", id: "mrh-out-t", label: "Total room heat load", value: (r) => fmt(r.total_btuh, 0) + " BTU/h (" + fmt(r.cooling_tons, 2) + " tons)" },
    { key: "c", id: "mrh-out-c", label: "Sizing from connected power instead would give", value: (r) => fmt(r.connected_btuh, 0) + " BTU/h, " + fmt(r.connected_overstatement, 1) + " times too high" },
    { key: "x", id: "mrh-out-x", label: "If cooling is lost, time to the equipment limit", value: (r) => fmt(r.minutes_to_limit, 0) + " min at " + fmt(r.temp_rise_f_per_hr, 0) + " degF per hour" },
    { key: "n", id: "mrh-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMachineRoomHeat,
});

// ===================== spec-v1654: hydraulic jack pressure and pump flow =====================

// dims: in { bore_in: L, total_load_lb: M L T^-2, car_speed_fpm: L T^-1, pump_flow_gpm: L^3 T^-1, relief_setting_psi: M L^-1 T^-2, alternative_bore_in: L } out: { jack_area_sqin: L^2, working_pressure_psi: M L^-1 T^-2, flow_required_gpm: L^3 T^-1, speed_from_pump_fpm: L T^-1, alt_working_pressure_psi: M L^-1 T^-2 }
export function computeHydraulicJackPressure({ bore_in = 0, total_load_lb = 0, car_speed_fpm = 0, pump_flow_gpm = 0, relief_setting_psi = 0, alternative_bore_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bore_in > 0)) return { error: "Jack bore diameter must be positive." };
  if (!(alternative_bore_in > 0)) return { error: "Alternative bore diameter must be positive." };
  if (!(total_load_lb > 0)) return { error: "Total load must be positive." };
  if (!(car_speed_fpm > 0)) return { error: "Car speed must be positive." };
  if (!(pump_flow_gpm > 0)) return { error: "Pump rated flow must be positive." };
  const jack_area_sqin = Math.PI * bore_in * bore_in / 4;
  const working_pressure_psi = total_load_lb / jack_area_sqin;
  if (!(relief_setting_psi > working_pressure_psi)) return { error: "Relief valve setting must be above the working pressure." };
  const flow_required_gpm = jack_area_sqin * car_speed_fpm * 12 / _CUIN_PER_GAL;
  const speed_from_pump_fpm = pump_flow_gpm * _CUIN_PER_GAL / (jack_area_sqin * 12);
  const relief_margin_pct = (relief_setting_psi - working_pressure_psi) / working_pressure_psi * 100;
  const alt_area_sqin = Math.PI * alternative_bore_in * alternative_bore_in / 4;
  const alt_working_pressure_psi = total_load_lb / alt_area_sqin;
  const alt_pressure_change_pct = (alt_working_pressure_psi - working_pressure_psi) / working_pressure_psi * 100;
  const alt_speed_from_pump_fpm = pump_flow_gpm * _CUIN_PER_GAL / (alt_area_sqin * 12);
  const alt_relief_ok = relief_setting_psi > alt_working_pressure_psi;
  return {
    jack_area_sqin, working_pressure_psi, flow_required_gpm, speed_from_pump_fpm, relief_margin_pct,
    alt_area_sqin, alt_working_pressure_psi, alt_pressure_change_pct, alt_speed_from_pump_fpm, alt_relief_ok,
    note: "The two relations are simple and they interact. A larger jack lowers the working pressure -- easier on the cylinder, the packing, and the power unit -- and raises the flow needed for the same car speed, so it wants a bigger pump. A smaller jack does the reverse. That trade is why a jack replacement is not a like-for-like swap unless the bore matches: a different bore changes the pressure the system runs at AND the speed it achieves with the existing pump, and it moves the working pressure the relief valve was set against. A relief left at its old setting after a bore change is either lifting during normal service or no longer protecting anything. Telescopic jacks add a wrinkle worth knowing: the effective area changes as stages extend, so the working pressure is not constant through the travel and the highest pressure occurs on the smallest stage. What this does not do is size a jack. Column buckling over the unsupported length is the governing design case for a long hydraulic jack and this pressure calculation does not touch it, nor does it check the cylinder wall, head, or packing, size the power unit, or account for oil viscosity and temperature effects on speed and pressure. It does not address the pressure switch, low-pressure protection, anti-creep and leveling requirements, relief setting margins, the static and running pressure tests, or the safety bulkhead and plunger-follower guide requirements. ASME A17.1 and A17.2, the equipment manufacturer, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.",
  };
}
const hydraulicJackExample = { inputs: { bore_in: 12, total_load_lb: 14000, car_speed_fpm: 125, pump_flow_gpm: 734.4, relief_setting_psi: 150, alternative_bore_in: 10 } };
ELEVATOR_RENDERERS["hydraulic-jack-pressure"] = _simpleRenderer({
  citation: "Citation: the jack relations -- area = pi x bore squared / 4, working pressure = total load / area, and pump flow = area x car speed x 12 / 231 cubic inches per gallon -- with ASME A17.1 named as governing relief settings, pressure testing, and the jack requirements this does not evaluate. Column buckling, not pressure, governs a long jack.",
  example: hydraulicJackExample.inputs,
  fields: [
    { key: "bore_in", label: "Jack bore diameter (in)", kind: "number", default: 12 },
    { key: "total_load_lb", label: "Total load on the jack (lb)", kind: "number", default: 14000 },
    { key: "car_speed_fpm", label: "Contract car speed (fpm)", kind: "number", default: 125 },
    { key: "pump_flow_gpm", label: "Pump rated flow (gpm)", kind: "number", default: 734.4 },
    { key: "relief_setting_psi", label: "Relief valve setting (psi)", kind: "number", default: 150 },
    { key: "alternative_bore_in", label: "Alternative bore to compare (in)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "a", id: "hjp-out-a", label: "Jack area", value: (r) => fmt(r.jack_area_sqin, 1) + " sq in" },
    { key: "p", id: "hjp-out-p", label: "Working pressure at the entered load", value: (r) => fmt(r.working_pressure_psi, 0) + " psi (relief " + fmt(r.relief_margin_pct, 0) + "% above it)" },
    { key: "q", id: "hjp-out-q", label: "Pump flow for the contract speed", value: (r) => fmt(r.flow_required_gpm, 1) + " gpm" },
    { key: "s", id: "hjp-out-s", label: "Speed the installed pump produces", value: (r) => fmt(r.speed_from_pump_fpm, 1) + " fpm" },
    { key: "b", id: "hjp-out-b", label: "At the alternative bore", value: (r) => fmt(r.alt_working_pressure_psi, 0) + " psi (" + fmt(r.alt_pressure_change_pct, 0) + "% change), " + fmt(r.alt_speed_from_pump_fpm, 0) + " fpm" },
    { key: "v", id: "hjp-out-v", label: "Relief valve at the alternative bore", value: (r) => r.alt_relief_ok ? "still above the working pressure" : "BELOW the new working pressure -- it would lift in normal service" },
    { key: "n", id: "hjp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicJackPressure,
});

// ===================== spec-v1655: escalator step chain tension =====================

// dims: in { total_load_lb: M L T^-2, incline_deg: dimensionless, friction_coefficient: dimensionless, chain_speed_fpm: L T^-1, chain_count: dimensionless, alternative_incline_deg: dimensionless } out: { gravity_lb: M L T^-2, friction_lb: M L T^-2, tension_lb: M L T^-2, per_chain_lb: M L T^-2, power_hp: M L^2 T^-3 }
export function computeStepChainTension({ total_load_lb = 0, incline_deg = 30, friction_coefficient = 0.03, chain_speed_fpm = 0, chain_count = 2, alternative_incline_deg = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(total_load_lb > 0)) return { error: "Total moving load must be positive." };
  if (!(incline_deg > 0 && incline_deg < 90)) return { error: "Incline angle must be in (0, 90) degrees." };
  if (!(alternative_incline_deg > 0 && alternative_incline_deg < 90)) return { error: "Alternative incline must be in (0, 90) degrees." };
  if (!(friction_coefficient >= 0)) return { error: "Friction coefficient cannot be negative." };
  if (!(chain_speed_fpm > 0)) return { error: "Chain speed must be positive." };
  if (!(chain_count >= 1)) return { error: "Number of chains must be at least 1." };
  const th = incline_deg * Math.PI / 180;
  const gravity_lb = total_load_lb * Math.sin(th);
  const friction_lb = total_load_lb * Math.cos(th) * friction_coefficient;
  const tension_lb = gravity_lb + friction_lb;
  const per_chain_lb = tension_lb / chain_count;
  const power_hp = tension_lb * chain_speed_fpm / _FTLB_PER_MIN_PER_HP;
  const gravity_share_pct = gravity_lb / tension_lb * 100;
  // Descending loaded: gravity drives and friction resists, so the brake takes
  // the difference rather than the whole gravity component.
  const descending_brake_lb = gravity_lb - friction_lb;
  const alt = alternative_incline_deg * Math.PI / 180;
  const alt_gravity_lb = total_load_lb * Math.sin(alt);
  const alt_friction_lb = total_load_lb * Math.cos(alt) * friction_coefficient;
  const alt_tension_lb = alt_gravity_lb + alt_friction_lb;
  return {
    gravity_lb, friction_lb, tension_lb, per_chain_lb, power_hp, gravity_share_pct,
    descending_brake_lb, alt_gravity_lb, alt_friction_lb, alt_tension_lb,
    note: "The two force components behave differently with the incline. The gravity component grows with the sine of the angle and dominates on a standard 30 degree escalator; friction grows with the cosine and matters more on a shallow moving walk. So an escalator's chain tension is mostly holding the load up the slope and friction is a rounding error, while a moving walk's is mostly overcoming rolling resistance -- which is why their drives are sized so differently for the same capacity. The governing case is not the one people picture. A fully loaded escalator running UP is the highest power draw, but a fully loaded escalator running DOWN is the one that sizes the brake, because the load is driving the machine and the brake has to stop it within a defined distance without throwing passengers. Note that in the descending case friction acts WITH the brake rather than against it, so the brake takes the difference between the gravity and friction components rather than the whole gravity term. That is a stopping-distance requirement rather than a holding one, and it is why escalator brakes are tested with load. Chain condition ties back to ordinary roller chain practice: a step chain elongates with wear like any other, and elongation changes how the chain engages the sprockets and the step alignment at the comb plates, which is where a worn chain shows itself before it fails. This does not size a drive, chain, or brake -- chain selection includes fatigue and articulation life at the sprocket, the drive includes starting and inertial loads, and the brake must meet a stopping-distance requirement under defined load conditions. It does not address the step band, rollers, tracks, comb plates, handrail drive, or the many safety devices an escalator carries. ASME A17.1 and A17.2, the equipment manufacturer, the elevator authority having jurisdiction, and a licensed mechanic govern.",
  };
}
const stepChainExample = { inputs: { total_load_lb: 12000, incline_deg: 30, friction_coefficient: 0.03, chain_speed_fpm: 100, chain_count: 2, alternative_incline_deg: 6 } };
ELEVATOR_RENDERERS["step-chain-tension"] = _simpleRenderer({
  citation: "Citation: the incline force resolution -- gravity component = load x sin(angle), friction component = load x cos(angle) x coefficient, power = tension x speed / 33,000 -- with ASME A17.1 named as governing the brake, its stopping distance, and the escalator safety devices. Statics and power only.",
  example: stepChainExample.inputs,
  fields: [
    { key: "total_load_lb", label: "Total moving load, band plus passengers (lb)", kind: "number", default: 12000 },
    { key: "incline_deg", label: "Incline angle (deg)", kind: "number", default: 30 },
    { key: "friction_coefficient", label: "Roller and track friction coefficient", kind: "number", default: 0.03 },
    { key: "chain_speed_fpm", label: "Chain speed (fpm)", kind: "number", default: 100 },
    { key: "chain_count", label: "Number of step chains", kind: "number", default: 2 },
    { key: "alternative_incline_deg", label: "Alternative incline to compare (deg)", kind: "number", default: 6 },
  ],
  outputs: [
    { key: "g", id: "sct-out-g", label: "Gravity component", value: (r) => fmt(r.gravity_lb, 0) + " lb (" + fmt(r.gravity_share_pct, 1) + "% of the tension)" },
    { key: "f", id: "sct-out-f", label: "Friction component", value: (r) => fmt(r.friction_lb, 0) + " lb" },
    { key: "t", id: "sct-out-t", label: "Total chain tension", value: (r) => fmt(r.tension_lb, 0) + " lb (" + fmt(r.per_chain_lb, 0) + " lb per chain)" },
    { key: "p", id: "sct-out-p", label: "Drive power at the entered speed", value: (r) => fmt(r.power_hp, 1) + " hp" },
    { key: "d", id: "sct-out-d", label: "Force the brake absorbs running down loaded", value: (r) => fmt(r.descending_brake_lb, 0) + " lb" },
    { key: "a", id: "sct-out-a", label: "At the alternative incline", value: (r) => fmt(r.alt_gravity_lb, 0) + " lb gravity, " + fmt(r.alt_friction_lb, 0) + " lb friction, " + fmt(r.alt_tension_lb, 0) + " lb total" },
    { key: "n", id: "sct-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStepChainTension,
});

// ===================== spec-v1656: door closing force and kinetic energy =====================

// dims: in { door_mass_lb: M L T^-2, closing_speed_fps: L T^-1, ke_limit_normal_ftlb: M L^2 T^-2, ke_limit_reduced_ftlb: M L^2 T^-2, measured_force_lbf: M L T^-2, force_limit_lbf: M L T^-2, opening_width_in: L, added_mass_lb: M L T^-2 } out: { kinetic_energy_ftlb: M L^2 T^-2, speed_for_reduced_limit_fps: L T^-1, closing_time_s: T, ke_with_added_mass_ftlb: M L^2 T^-2 }
export function computeDoorClosingEnergy({ door_mass_lb = 0, closing_speed_fps = 0, ke_limit_normal_ftlb = 0, ke_limit_reduced_ftlb = 0, measured_force_lbf = 0, force_limit_lbf = 0, opening_width_in = 0, added_mass_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(door_mass_lb > 0)) return { error: "Total moving door mass must be positive." };
  if (!(closing_speed_fps > 0)) return { error: "Average closing speed must be positive." };
  if (!(ke_limit_normal_ftlb > 0)) return { error: "Normal-operation kinetic energy limit must be positive." };
  if (!(ke_limit_reduced_ftlb > 0)) return { error: "Reduced kinetic energy limit must be positive." };
  if (!(ke_limit_reduced_ftlb <= ke_limit_normal_ftlb)) return { error: "The reduced limit cannot exceed the normal-operation limit." };
  if (!(measured_force_lbf >= 0)) return { error: "Measured closing force cannot be negative." };
  if (!(force_limit_lbf > 0)) return { error: "Closing force limit must be positive." };
  if (!(opening_width_in > 0)) return { error: "Clear opening width must be positive." };
  if (!(added_mass_lb >= 0)) return { error: "Added door mass cannot be negative." };
  const mass_slug = door_mass_lb / _G_FPS2;
  const kinetic_energy_ftlb = 0.5 * mass_slug * closing_speed_fps * closing_speed_fps;
  const pass_normal = kinetic_energy_ftlb <= ke_limit_normal_ftlb;
  const pass_reduced = kinetic_energy_ftlb <= ke_limit_reduced_ftlb;
  const speed_for_reduced_limit_fps = Math.sqrt(2 * ke_limit_reduced_ftlb * _G_FPS2 / door_mass_lb);
  const speed_change_pct = (speed_for_reduced_limit_fps - closing_speed_fps) / closing_speed_fps * 100;
  const width_ft = opening_width_in / 12;
  const closing_time_s = width_ft / closing_speed_fps;
  const closing_time_at_limit_s = width_ft / speed_for_reduced_limit_fps;
  const closing_time_change_s = closing_time_at_limit_s - closing_time_s;
  const ke_with_added_mass_ftlb = 0.5 * ((door_mass_lb + added_mass_lb) / _G_FPS2) * closing_speed_fps * closing_speed_fps;
  return {
    kinetic_energy_ftlb, pass_normal, pass_reduced, speed_for_reduced_limit_fps, speed_change_pct,
    closing_time_s, closing_time_at_limit_s, closing_time_change_s, ke_with_added_mass_ftlb,
    force_ok: measured_force_lbf <= force_limit_lbf,
    verdict: pass_reduced ? "within both entered limits"
      : pass_normal ? "within the normal limit but OVER the reduced limit"
        : "OVER both entered limits",
    note: "Two independent limits apply and they fail differently. Closing force is a static measurement at the leading edge and catches a door operator adjusted too hard. Kinetic energy is dynamic and catches a door that is heavy rather than forceful -- a wide two-speed door with substantial panel mass can be within the force limit and well outside the energy limit, because energy carries the mass term that force does not. The square on speed is what makes it manageable: reducing closing speed by a fifth cuts kinetic energy by more than a third, so a door that fails the energy limit can usually be brought into compliance by slowing it a little rather than by lightening it -- at the cost of door time, which is the trade against the building's traffic performance. The reduced limit when the reopening device is inoperative is the provision that matters most in service. A door running with its detector edge or light curtain out of service must close under a much lower energy limit, effectively nudging closed, because the only thing preventing a strike is now the passenger. A door that closes at full speed with a failed reopening device is a defect, not an inconvenience. The applicable limits, the portion of travel over which the average speed is measured, and the measurement procedure are set by the adopted edition of the code and must be entered from it. This does not measure the door mass, which includes panels, hangers, linkage, and the moving portion of the operator and is commonly underestimated, and it does not evaluate the reopening device's own performance, door timing, dwell, nudging, or the fire operation requirements that change door behaviour. ASME A17.1 and A17.2, the door equipment manufacturer, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.",
  };
}
const doorClosingExample = { inputs: { door_mass_lb: 140, closing_speed_fps: 1.0, ke_limit_normal_ftlb: 7.0, ke_limit_reduced_ftlb: 2.5, measured_force_lbf: 25, force_limit_lbf: 30, opening_width_in: 42, added_mass_lb: 20 } };
ELEVATOR_RENDERERS["door-closing-energy"] = _simpleRenderer({
  citation: "Citation: the kinetic energy of the moving door, one half x (weight / 32.174) x speed squared, checked against the ASME A17.1 closing energy limits -- the normal one and the lower one that applies when the reopening device is inoperative -- with the closing force limit named as a separate, statically measured criterion. Both limits are entered from the adopted code edition.",
  example: doorClosingExample.inputs,
  fields: [
    { key: "door_mass_lb", label: "Total moving door weight (lb)", kind: "number", default: 140 },
    { key: "closing_speed_fps", label: "Average closing speed (ft/s)", kind: "number", default: 1.0 },
    { key: "ke_limit_normal_ftlb", label: "Kinetic energy limit, normal operation (ft-lb)", kind: "number", default: 7.0 },
    { key: "ke_limit_reduced_ftlb", label: "Kinetic energy limit, reopening device out (ft-lb)", kind: "number", default: 2.5 },
    { key: "measured_force_lbf", label: "Measured closing force (lbf)", kind: "number", default: 25 },
    { key: "force_limit_lbf", label: "Closing force limit (lbf)", kind: "number", default: 30 },
    { key: "opening_width_in", label: "Clear opening width (in)", kind: "number", default: 42 },
    { key: "added_mass_lb", label: "Weight a panel change would add (lb)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "k", id: "dce-out-k", label: "Closing kinetic energy", value: (r) => fmt(r.kinetic_energy_ftlb, 2) + " ft-lb -- " + r.verdict },
    { key: "s", id: "dce-out-s", label: "Speed that lands on the reduced limit", value: (r) => fmt(r.speed_for_reduced_limit_fps, 2) + " ft/s (" + fmt(r.speed_change_pct, 0) + "% change)" },
    { key: "t", id: "dce-out-t", label: "Closing time at that speed", value: (r) => fmt(r.closing_time_at_limit_s, 2) + " s against " + fmt(r.closing_time_s, 2) + " s now (" + fmt(r.closing_time_change_s, 2) + " s)" },
    { key: "m", id: "dce-out-m", label: "Energy after the panel change", value: (r) => fmt(r.ke_with_added_mass_ftlb, 2) + " ft-lb" },
    { key: "f", id: "dce-out-f", label: "Measured force against its limit", value: (r) => r.force_ok ? "within the entered force limit" : "OVER the entered force limit" },
    { key: "n", id: "dce-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDoorClosingEnergy,
});

// ===================== spec-v1657: overspeed governor tripping speed =====================

// dims: in { rated_speed_fpm: L T^-1, electrical_trip_fpm: L T^-1, mechanical_trip_fpm: L T^-1, code_minimum_pct: dimensionless, code_maximum_fpm: L T^-1 } out: { minimum_trip_fpm: L T^-1, mechanical_margin_pct: dimensionless, electrical_margin_pct: dimensionless, headroom_fpm: L T^-1, implied_buffer_stroke_in: L }
export function computeGovernorTrippingSpeed({ rated_speed_fpm = 0, electrical_trip_fpm = 0, mechanical_trip_fpm = 0, code_minimum_pct = 115, code_maximum_fpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_speed_fpm > 0)) return { error: "Rated car speed must be positive." };
  if (!(electrical_trip_fpm > 0)) return { error: "Electrical tripping speed must be positive." };
  if (!(mechanical_trip_fpm > 0)) return { error: "Mechanical tripping speed must be positive." };
  if (!(code_minimum_pct >= 100)) return { error: "Code minimum must be at least 100 percent of rated speed." };
  if (!(code_maximum_fpm > 0)) return { error: "Code maximum tripping speed must be positive." };
  const minimum_trip_fpm = rated_speed_fpm * code_minimum_pct / 100;
  if (!(code_maximum_fpm > minimum_trip_fpm)) return { error: "Code maximum must exceed the code minimum for this rated speed." };
  const mechanical_margin_pct = (mechanical_trip_fpm - rated_speed_fpm) / rated_speed_fpm * 100;
  const electrical_margin_pct = (electrical_trip_fpm - rated_speed_fpm) / rated_speed_fpm * 100;
  const in_band = mechanical_trip_fpm >= minimum_trip_fpm && mechanical_trip_fpm <= code_maximum_fpm;
  const ordering_ok = electrical_trip_fpm < mechanical_trip_fpm;
  const headroom_fpm = code_maximum_fpm - mechanical_trip_fpm;
  const impact_speed_fps = mechanical_trip_fpm / 60;
  const implied_buffer_stroke_in = impact_speed_fps * impact_speed_fps / (2 * _G_FPS2) * 12;
  return {
    minimum_trip_fpm, mechanical_margin_pct, electrical_margin_pct, in_band, ordering_ok,
    headroom_fpm, impact_speed_fps, implied_buffer_stroke_in,
    band_verdict: in_band ? "inside the entered code band"
      : mechanical_trip_fpm < minimum_trip_fpm ? "BELOW the code minimum for this rated speed"
        : "ABOVE the code maximum for this rated speed",
    order_verdict: ordering_ok ? "electrical trips first, as it must"
      : "INVERTED -- the electrical trip is at or above the mechanical one, so every overspeed goes straight to a safety application",
    note: "Two devices operate at two speeds and the order matters. The electrical overspeed switch trips first, cutting power and setting the brake, which stops most overspeed events without the safety ever engaging. Only if the car continues to accelerate does the governor mechanically grip its rope and pull the safety, which wedges the car against the guide rails -- a violent event that takes the car out of service and requires inspection afterward. A governor with the two settings inverted, or with the electrical trip inoperative, removes the gentle stop and leaves only the violent one. The margin band is bounded at both ends for good reasons. The minimum, commonly 115 percent of rated speed, keeps the governor from tripping on normal operation including the modest overspeed of a heavily loaded down run. The maximum exists because a safety must engage before the car reaches a speed at which the buffers below it cannot absorb the impact, so governor trip, safety type, and buffer stroke are a SET rather than independent choices -- which is why raising a trip speed to stop nuisance trips invalidates the buffer selection beneath it, and why governor settings are not a field adjustment. The governor rope runs at car speed regardless of the suspension roping ratio, which is worth stating because a mechanic used to thinking in 2 to 1 terms can misread what the governor is seeing. Verification is by test at the intervals the code requires: a governor is a mechanical device with springs and pivots that age, and a setting recorded on a tag is not evidence of a setting that still holds. The minimum and maximum are entered from the adopted code rather than shipped here. ASME A17.1 and A17.2, the equipment manufacturer, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.",
  };
}
const governorTripExample = { inputs: { rated_speed_fpm: 500, electrical_trip_fpm: 550, mechanical_trip_fpm: 575, code_minimum_pct: 115, code_maximum_fpm: 690 } };
ELEVATOR_RENDERERS["governor-tripping-speed"] = _simpleRenderer({
  citation: "Citation: the ASME A17.1 governor tripping-speed limits by name -- a mechanical trip at least 115 percent of rated speed, under a ceiling that tightens as rated speed rises, with the electrical overspeed switch set below the mechanical trip. Both bounds are entered from the adopted code table. The elevator authority having jurisdiction and a licensed elevator mechanic govern.",
  example: governorTripExample.inputs,
  fields: [
    { key: "rated_speed_fpm", label: "Rated (contract) car speed (fpm)", kind: "number", default: 500 },
    { key: "electrical_trip_fpm", label: "Electrical overspeed switch setting (fpm)", kind: "number", default: 550 },
    { key: "mechanical_trip_fpm", label: "Mechanical tripping speed (fpm)", kind: "number", default: 575 },
    { key: "code_minimum_pct", label: "Code minimum trip (% of rated speed)", kind: "number", default: 115 },
    { key: "code_maximum_fpm", label: "Code maximum trip for this rated speed (fpm)", kind: "number", default: 690 },
  ],
  outputs: [
    { key: "m", id: "gts-out-m", label: "Minimum permitted mechanical trip", value: (r) => fmt(r.minimum_trip_fpm, 0) + " fpm" },
    { key: "b", id: "gts-out-b", label: "Mechanical setting against the band", value: (r) => r.band_verdict + " (" + fmt(r.mechanical_margin_pct, 1) + "% over rated, " + fmt(r.headroom_fpm, 0) + " fpm of headroom)" },
    { key: "e", id: "gts-out-e", label: "Electrical setting", value: (r) => fmt(r.electrical_margin_pct, 1) + "% over rated -- " + r.order_verdict },
    { key: "s", id: "gts-out-s", label: "Buffer impact speed the mechanical trip implies", value: (r) => fmt(r.impact_speed_fps, 2) + " ft/s" },
    { key: "k", id: "gts-out-k", label: "Buffer stroke that implies at one gravity", value: (r) => fmt(r.implied_buffer_stroke_in, 1) + " in" },
    { key: "n", id: "gts-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGovernorTrippingSpeed,
});

// ===================== spec-v1658: guide rail bracket span =====================

// dims: in { span_ft: L, horizontal_load_lb: M L T^-2, section_modulus_in3: L^3, moment_of_inertia_in4: L^4, modulus_psi: M L^-1 T^-2, allowable_stress_psi: M L^-1 T^-2, deflection_limit_in: L, safety_application_load_lb: M L T^-2 } out: { moment_inlb: M L^2 T^-2, stress_psi: M L^-1 T^-2, deflection_in: L, max_span_for_deflection_ft: L, safety_stress_psi: M L^-1 T^-2 }
export function computeGuideRailBracketSpan({ span_ft = 0, horizontal_load_lb = 0, section_modulus_in3 = 0, moment_of_inertia_in4 = 0, modulus_psi = 29000000, allowable_stress_psi = 0, deflection_limit_in = 0, safety_application_load_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(span_ft > 0)) return { error: "Bracket span must be positive." };
  if (!(horizontal_load_lb > 0)) return { error: "Horizontal load must be positive." };
  if (!(section_modulus_in3 > 0)) return { error: "Rail section modulus must be positive." };
  if (!(moment_of_inertia_in4 > 0)) return { error: "Rail moment of inertia must be positive." };
  if (!(modulus_psi > 0)) return { error: "Modulus of elasticity must be positive." };
  if (!(allowable_stress_psi > 0)) return { error: "Allowable stress must be positive." };
  if (!(deflection_limit_in > 0)) return { error: "Deflection limit must be positive." };
  if (!(safety_application_load_lb > 0)) return { error: "Safety application load must be positive." };
  const span_in = span_ft * 12;
  const EI = modulus_psi * moment_of_inertia_in4;
  const moment_inlb = horizontal_load_lb * span_in / 4;
  const stress_psi = moment_inlb / section_modulus_in3;
  const deflection_in = horizontal_load_lb * span_in * span_in * span_in / (48 * EI);
  const max_span_for_deflection_ft = Math.cbrt(deflection_limit_in * 48 * EI / horizontal_load_lb) / 12;
  const halved_span_moment_inlb = horizontal_load_lb * (span_in / 2) / 4;
  const halved_span_deflection_in = deflection_in / 8;
  const safety_moment_inlb = safety_application_load_lb * span_in / 4;
  const safety_stress_psi = safety_moment_inlb / section_modulus_in3;
  return {
    moment_inlb, stress_psi, deflection_in, max_span_for_deflection_ft,
    halved_span_moment_inlb, halved_span_deflection_in, safety_moment_inlb, safety_stress_psi,
    deflection_ok: deflection_in <= deflection_limit_in,
    stress_ok: stress_psi <= allowable_stress_psi,
    safety_stress_ok: safety_stress_psi <= allowable_stress_psi,
    note: "A guide rail spans between brackets like any beam, carrying the horizontal load at the guide shoes as a concentrated load. For a concentrated load at midspan the moment goes as the span and the deflection as its CUBE, so halving the span halves the moment and cuts the deflection to an eighth. A rail that is marginal on deflection is therefore usually fixed by adding a bracket rather than by upsizing the rail, which matters because rails are a long-lead item and brackets are not: matching an eighth of the deflection by section alone would take eight times the moment of inertia, several sizes of rail. The governing load is safety application, not normal operation. When the car safeties set they clamp the rails and transmit a large force, and the rail and its brackets have to take it without permanent deformation; normal eccentric loading -- a heavy load in one corner of the car -- is a much smaller number that governs the deflection limit rather than the strength. A rail arrangement checked only for normal operating loads is checked for the wrong case. Seismic is what changes everything in higher-hazard regions: the code's provisions require larger sections, closer brackets, retainer plates, and additional devices, so a rail layout carried over from a low-seismic project is not transferable, which is a common source of trouble on repeat-design buildings. This is a single-span beam calculation and the code's load cases, allowable stresses and deflections, rail sections, and bracket and fastening requirements determine acceptability rather than a general beam formula. It does not determine the horizontal loads, evaluate the bracket itself or its fastening to the structure -- frequently the weak element -- or address rail joints, alignment tolerances, or the rail's function as part of the safety system. ASME A17.1 and A17.2, the equipment manufacturer, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.",
  };
}
const guideRailExample = { inputs: { span_ft: 14, horizontal_load_lb: 900, section_modulus_in3: 4.0, moment_of_inertia_in4: 9.3, modulus_psi: 29000000, allowable_stress_psi: 22000, deflection_limit_in: 0.25, safety_application_load_lb: 4500 } };
ELEVATOR_RENDERERS["guide-rail-bracket-span"] = _simpleRenderer({
  citation: "Citation: simple-span beam relations for a concentrated load at midspan -- moment = P L / 4, stress = moment / section modulus, deflection = P L cubed / (48 E I) -- with ASME A17.1 named as governing the load cases, allowable stresses and deflections, rail sections, and bracket requirements that determine acceptability.",
  example: guideRailExample.inputs,
  fields: [
    { key: "span_ft", label: "Bracket spacing (ft)", kind: "number", default: 14 },
    { key: "horizontal_load_lb", label: "Horizontal load at the guide shoes (lb)", kind: "number", default: 900 },
    { key: "section_modulus_in3", label: "Rail section modulus (cu in)", kind: "number", default: 4.0 },
    { key: "moment_of_inertia_in4", label: "Rail moment of inertia (in^4)", kind: "number", default: 9.3 },
    { key: "modulus_psi", label: "Modulus of elasticity (psi)", kind: "number", default: 29000000 },
    { key: "allowable_stress_psi", label: "Allowable bending stress (psi)", kind: "number", default: 22000 },
    { key: "deflection_limit_in", label: "Deflection limit (in)", kind: "number", default: 0.25 },
    { key: "safety_application_load_lb", label: "Safety application horizontal load (lb)", kind: "number", default: 4500 },
  ],
  outputs: [
    { key: "m", id: "grb-out-m", label: "Bending moment at the entered span", value: (r) => fmt(r.moment_inlb, 0) + " in-lb" },
    { key: "s", id: "grb-out-s", label: "Bending stress", value: (r) => fmt(r.stress_psi, 0) + " psi -- " + (r.stress_ok ? "within the allowable" : "OVER the allowable") },
    { key: "d", id: "grb-out-d", label: "Deflection", value: (r) => fmt(r.deflection_in, 3) + " in -- " + (r.deflection_ok ? "within the limit" : "OVER the limit") },
    { key: "x", id: "grb-out-x", label: "Maximum span the deflection limit allows", value: (r) => fmt(r.max_span_for_deflection_ft, 2) + " ft" },
    { key: "h", id: "grb-out-h", label: "One more bracket, at half the span", value: (r) => fmt(r.halved_span_moment_inlb, 0) + " in-lb and " + fmt(r.halved_span_deflection_in, 3) + " in" },
    { key: "a", id: "grb-out-a", label: "Safety application case", value: (r) => fmt(r.safety_stress_psi, 0) + " psi -- " + (r.safety_stress_ok ? "within the allowable" : "OVER the allowable") },
    { key: "n", id: "grb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGuideRailBracketSpan,
});
