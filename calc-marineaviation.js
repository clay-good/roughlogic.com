// Group K: marine and aviation field-reference calculators.
//
// Split intact from calc-mechanic.js by spec-v1873. Calculator IDs, formulas,
// fields, outputs, citations, examples, and Group K assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
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

function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else if (f.kind === "checkbox") field = makeCheckbox(f.label, f.id || f.key);
      else if (f.kind === "text") {
        const wrap = document.createElement("div"); wrap.className = "field";
        // `f.id || f.key`, the same fallback every other branch uses. Reading
        // `f.id` alone gave every text field on a tile the literal id
        // "undefined", so two of them collided and the second field's
        // <label for> resolved to the FIRST input: clicking "New tire size"
        // focused "Original tire size", and a screen reader announced the
        // wrong one.
        const fid = f.id || f.key;
        const lab = document.createElement("label"); lab.htmlFor = fid; lab.textContent = f.label;
        const input = document.createElement("input"); input.type = "text"; input.id = fid; input.autocomplete = "off";
        wrap.appendChild(lab); wrap.appendChild(input);
        field = { wrap, input };
      }
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else if (f.kind === "checkbox") field.input.checked = !!f.default;
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
        else if (f.kind === "checkbox") fields[f.key].input.checked = !!v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else if (f.kind === "checkbox") params[f.key] = fields[f.key].input.checked;
        else if (f.kind === "text") params[f.key] = fields[f.key].input.value;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) {
        for (const k of Object.keys(outs)) outs[k].textContent = "-";
        outs[spec.outputs[0].key].textContent = r.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "checkbox" ? "change" : "input", update);
    }
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const MARINEAVIATION_RENDERERS = {};

// spec-v1640..v1647 constants. Leading-underscore names of their own, because
// two of these are CONVENTIONS rather than definitions.
//
// The customary torque constant: 33,000 ft-lb/min per hp times 12 in/ft over
// 2 pi radians is 63,025 in the form the trade writes it.
const _MEC_TORQUE_CONST = 63025;
// IBC 1807.3.2.1 nonconstrained lateral embedment: d = 0.5 A (1 + sqrt(1 +
// 4.36 h / A)) with A = 2.34 P / (S1 b). Both constants are the code's.
const _MEC_EMBED_A_CONST = 2.34;
const _MEC_EMBED_H_CONST = 4.36;
// Jet A and 100LL nominal densities at the 15 degC reference, and the
// hydrocarbon density change the trade uses. All three are ENTERED defaults
// rather than fixed properties.
const _MEC_JET_A_LB_GAL = 6.75;
const _MEC_REFERENCE_TEMP_F = 59;

// =====================================================================
// spec-v1640..v1647: the marine and aviation band.
// =====================================================================
//
// spec-v1640: vessel metacentric height and righting arm.
//
// The spec's own example is an unfinished edit: it opens "displacing 42,000 lb
// with KM 2.6 ft and KG 3.1 ft" and then, mid-sentence, takes KG as 2.1 --
// because 3.1 would have given a NEGATIVE GM and an unstable vessel. Both KM
// and KG are inputs here and the sign of GM is a computed verdict.
// dims: in { km_ft: L, kg_ft: L, displacement_lb: M L T^-2, added_weight_lb: M L T^-2, added_kg_ft: L, free_surface_moment_ftlb: M L^2 T^-2, heel_angle_deg: dimensionless } out: { gm_ft: L, new_kg_ft: L, new_gm_ft: L, gm_loss_pct: dimensionless, free_surface_correction_ft: L, gz_ft: L }
export function computeMetacentricHeight({
  km_ft = 0, kg_ft = 0, displacement_lb = 0,
  added_weight_lb = 0, added_kg_ft = 0, free_surface_moment_ftlb = 0, heel_angle_deg = 10,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(km_ft > 0)) return { error: "KM must be positive (ft) -- it comes off the hull's hydrostatic curves at the loaded draft." };
  if (!(kg_ft > 0)) return { error: "KG must be positive (ft)." };
  if (!(displacement_lb > 0)) return { error: "Displacement must be positive (lb)." };
  if (added_weight_lb < 0) return { error: "Added weight cannot be negative (lb) -- to remove weight, recompute KG directly." };
  if (added_kg_ft < 0) return { error: "The added weight's height above the keel cannot be negative (ft)." };
  if (free_surface_moment_ftlb < 0) return { error: "The free surface moment cannot be negative (ft-lb)." };
  if (heel_angle_deg < 0 || heel_angle_deg > 90) return { error: "The heel angle must be between 0 and 90 degrees." };
  const gm_ft = km_ft - kg_ft;
  const is_positive = gm_ft > 1e-9;
  // Adding weight moves KG toward it. A weight added HIGH raises KG and takes
  // GM directly, and because GM is a difference between two similar numbers a
  // small KG change is a large percentage of it.
  const has_addition = added_weight_lb > 0;
  const new_displacement_lb = displacement_lb + added_weight_lb;
  const new_kg_ft = has_addition
    ? (displacement_lb * kg_ft + added_weight_lb * added_kg_ft) / new_displacement_lb
    : kg_ft;
  const new_gm_ft = km_ft - new_kg_ft;
  const gm_change_ft = new_gm_ft - gm_ft;
  const gm_loss_pct = gm_ft !== 0 ? -gm_change_ft / gm_ft * 100 : 0;
  const weight_fraction_pct = added_weight_lb / displacement_lb * 100;
  const raises_kg = has_addition && added_kg_ft > kg_ft;
  const addition_verdict = !has_addition
    ? "(no added weight entered)"
    : raises_kg
      ? "the " + fmt(added_weight_lb, 0) + " lb addition at " + fmt(added_kg_ft, 2) + " ft above the keel is " + fmt(weight_fraction_pct, 1) + "% of displacement and takes " + fmt(gm_loss_pct, 0) + "% of the metacentric height, because it went on HIGH -- the same weight low in the bilge would have RAISED GM"
      : Math.abs(added_kg_ft - kg_ft) <= 1e-9 * Math.max(1, kg_ft)
        ? "the " + fmt(added_weight_lb, 0) + " lb addition sits AT the current centre of gravity, so KG and GM are unchanged at " + fmt(new_gm_ft, 3) + " ft"
        : "the " + fmt(added_weight_lb, 0) + " lb addition sits BELOW the current centre of gravity, so it lowers KG and raises GM to " + fmt(new_gm_ft, 3) + " ft";
  // Free surface depends on the tank's WIDTH CUBED and not on how much liquid
  // is in it, which is the effect that surprises people.
  const has_fsm = free_surface_moment_ftlb > 0;
  const free_surface_correction_ft = has_fsm ? free_surface_moment_ftlb / new_displacement_lb : 0;
  const effective_gm_ft = new_gm_ft - free_surface_correction_ft;
  const fsm_verdict = !has_fsm
    ? "(no free surface moment entered)"
    : "the free surface correction is " + fmt(free_surface_correction_ft, 3) + " ft, leaving an effective GM of " + fmt(effective_gm_ft, 3) + " ft -- and it depends on the tank's WIDTH CUBED rather than on how much liquid is in it, so a wide shallow tank half full costs far more than a narrow deep one holding the same volume";
  // The righting arm at a small angle, and the verdict that matters.
  const gz_ft = effective_gm_ft * Math.sin(heel_angle_deg * Math.PI / 180);
  const effective_is_positive = effective_gm_ft > 1e-9;
  const stability_verdict = effective_is_positive
    ? "effective GM is " + fmt(effective_gm_ft, 3) + " ft, POSITIVE, giving a righting arm of " + fmt(gz_ft, 3) + " ft at " + fmt(heel_angle_deg, 0) + " degrees of heel"
    : Math.abs(effective_gm_ft) <= 1e-9
      ? "effective GM is ZERO -- neutral stability: the vessel has no righting arm at small heel and will not return upright on its own"
      : "effective GM is " + fmt(effective_gm_ft, 3) + " ft, NEGATIVE -- the vessel is unstable upright and will loll to an angle of heel, and the righting arm reported here has no meaning in that condition";
  if (![gm_ft, new_kg_ft, new_gm_ft, gm_loss_pct, free_surface_correction_ft, gz_ft].every(Number.isFinite)) return { error: "Stability math is not a finite value." };
  return {
    gm_ft, is_positive, has_addition, new_displacement_lb, new_kg_ft, new_gm_ft,
    gm_change_ft, gm_loss_pct, weight_fraction_pct, raises_kg, addition_verdict,
    has_fsm, free_surface_correction_ft, effective_gm_ft, fsm_verdict,
    gz_ft, effective_is_positive, stability_verdict,
    note: "A vessel's metacentric height, what a weight addition does to it, and the righting arm that follows. GM is KM minus KG: KM comes off the hull's hydrostatic curves at the loaded draft and is a property of the hull form, while KG is the vertical centre of gravity of everything aboard and is the number a refit changes. Because GM is a DIFFERENCE between two numbers of similar size, a modest change in KG is a large percentage change in stability -- which is why a refit adding a few hundred pounds high can matter more than one adding a ton low, and why the percentage is reported here rather than only the new value. Every weight added moves the centre of gravity toward it, so a radar arch, an enclosure, a tender on the cabin top, or ice on the rigging all raise KG and reduce GM directly. Free surface is the effect that surprises people, because it depends on the tank's WIDTH CUBED and not on how much liquid is in it. A wide shallow tank half full costs far more stability than a narrow deep one holding the same volume, and a tank that is nearly empty is nearly as bad as one that is half full. The correction is a moment divided by displacement and it reduces the effective GM, which is why it is applied here after the weight addition rather than before. A negative GM is not a small problem. The vessel does not simply feel tender: it is unstable upright and lolls to an angle of heel where the righting arm becomes positive, and it can flop from one side to the other. The sign is therefore a computed verdict here rather than a number for the reader to interpret, and the righting arm is reported as meaningless when GM is negative. This is a SMALL-ANGLE screen: GZ = GM sin(theta) holds only while the metacentre is effectively stationary, which is roughly the first ten to fifteen degrees, and beyond that the real righting arm comes from a full cross-curves calculation. It does not compute KM, which needs the hull form; it does not compute the free surface moment, which needs each tank's geometry; and it does not evaluate the stability CRITERIA any authority applies, which are about the area under the righting arm curve rather than about GM alone. The vessel's own stability booklet, a naval architect, and the applicable rules govern.",
  };
}
export const metacentricHeightExample = { inputs: { km_ft: 2.6, kg_ft: 2.1, displacement_lb: 42000, added_weight_lb: 900, added_kg_ft: 9.5, free_surface_moment_ftlb: 0, heel_angle_deg: 10 } };
MARINEAVIATION_RENDERERS["metacentric-height"] = _simpleRenderer({
  citation: "Citation: the small-angle stability relations as naval architecture states them -- GM = KM - KG, a weight addition giving new KG = (W x KG + w x kg) / (W + w), the free surface correction = free surface moment / displacement, and the righting arm GZ = GM sin(theta) for small angles. KM comes off the hull's hydrostatic curves and is ENTERED; the free surface moment needs each tank's geometry and is ENTERED. A small-angle screen only, valid while the metacentre is effectively stationary (roughly the first 10 to 15 degrees); beyond that the righting arm comes from a full cross-curves calculation. It does not evaluate the stability CRITERIA any authority applies, which concern the area under the righting arm curve rather than GM alone. The vessel's stability booklet and a naval architect govern.",
  example: metacentricHeightExample.inputs,
  fields: [
    { key: "km_ft", label: "KM, metacentre above keel (ft)", kind: "number", attrs: { step: "any" } },
    { key: "kg_ft", label: "KG, centre of gravity above keel (ft)", kind: "number", attrs: { step: "any" } },
    { key: "displacement_lb", label: "Displacement (lb)", kind: "number" },
    { key: "added_weight_lb", label: "Weight added (lb, 0 to skip)", kind: "number" },
    { key: "added_kg_ft", label: "Its height above the keel (ft)", kind: "number", attrs: { step: "any" } },
    { key: "free_surface_moment_ftlb", label: "Free surface moment (ft-lb, 0 to skip)", kind: "number" },
    { key: "heel_angle_deg", label: "Heel angle for the righting arm (degrees)", kind: "number", default: 10, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "g", id: "mch-out-g", label: "Metacentric height", value: (r) => fmt(r.gm_ft, 3) + " ft as loaded" },
    { key: "a", id: "mch-out-a", label: "After the addition", value: (r) => r.addition_verdict },
    { key: "k", id: "mch-out-k", label: "New KG and GM", value: (r) => !r.has_addition ? "(no addition entered)" : "KG " + fmt(r.new_kg_ft, 3) + " ft, GM " + fmt(r.new_gm_ft, 3) + " ft on " + fmt(r.new_displacement_lb, 0) + " lb" },
    { key: "f", id: "mch-out-f", label: "Free surface", value: (r) => r.fsm_verdict },
    { key: "s", id: "mch-out-s", label: "Stability", value: (r) => r.stability_verdict },
    { key: "n", id: "mch-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMetacentricHeight,
});

// =====================================================================
// spec-v1641: marine propeller shaft diameter for torque.
// =====================================================================
//
// A propeller shaft is NOT sized by torsion. It hangs on the end of an
// overhung shaft, and its weight plus hydrodynamic side loads put bending in
// that a torsion-only calculation misses entirely -- which is why the
// classification rule formula governs and the torsion figure is shown only to
// demonstrate that it under-calls the answer.
// dims: in { engine_hp: M L^2 T^-3, shaft_rpm: T^-1, shaft_diameter_in: L, allowable_stress_psi: M L^-1 T^-2, rule_factor: dimensionless, repower_hp: M L^2 T^-3 } out: { torque_inlb: M L^2 T^-2, torsional_stress_psi: M L^-1 T^-2, torsion_diameter_in: L, rule_diameter_in: L, repower_diameter_in: L }
export function computeMarineShaftDiameter({
  engine_hp = 0, shaft_rpm = 0, shaft_diameter_in = 0,
  allowable_stress_psi = 0, rule_factor = 0, repower_hp = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(engine_hp > 0)) return { error: "Engine power must be positive (hp)." };
  if (!(shaft_rpm > 0)) return { error: "Shaft speed must be positive (rpm) -- use the SHAFT speed after the reduction gear, not engine speed." };
  if (shaft_diameter_in < 0) return { error: "Shaft diameter cannot be negative (in)." };
  if (allowable_stress_psi < 0) return { error: "Allowable stress cannot be negative (psi)." };
  if (rule_factor < 0) return { error: "The rule factor cannot be negative." };
  if (repower_hp < 0) return { error: "Repower horsepower cannot be negative (hp)." };
  // Torque from power and shaft speed, at the customary 63,025 constant.
  const torque_inlb = _MEC_TORQUE_CONST * engine_hp / shaft_rpm;
  // The torsion figure, shown to be under-called rather than used.
  const has_shaft = shaft_diameter_in > 0;
  const torsional_stress_psi = has_shaft ? 16 * torque_inlb / (Math.PI * Math.pow(shaft_diameter_in, 3)) : 0;
  const has_allowable = allowable_stress_psi > 0;
  const torsion_diameter_in = has_allowable ? Math.cbrt(16 * torque_inlb / (Math.PI * allowable_stress_psi)) : 0;
  // The rule diameter: d = F x cbrt(hp / rpm). ABYC P-6 writes it as the torsion
  // formula itself, D = cbrt(321,000 P SF / (S N)) with 321,000 ~ 16 x 63,025 / pi (320,984),
  // at shear yield over a safety factor (2 light pleasure, about 5 heavy-service/diesel
  // pleasure, about 10 commercial and high-performance, per ABYC) meant to cover bending, fatigue
  // and corrosion. Until 2026-10-01 the verdict said torsion "cannot see" bending.
  const has_rule = rule_factor > 0;
  const power_speed_root = Math.cbrt(engine_hp / shaft_rpm);
  const rule_diameter_in = has_rule ? rule_factor * power_speed_root : 0;
  const rules_agree = has_rule && has_allowable && Math.abs(rule_diameter_in - torsion_diameter_in) <= 1e-4 * torsion_diameter_in; // ABYC rounds 320,984 to 321,000
  const rule_governs = has_rule && has_allowable && !rules_agree && rule_diameter_in > torsion_diameter_in;
  const criterion_verdict = !has_rule
    ? "(no rule factor entered -- the classification society's constant is what carries the bending and corrosion allowance)"
    : !has_allowable
      ? "the rule diameter is " + fmt(rule_diameter_in, 3) + " in"
      : rules_agree
        ? "the rule and torsion diameters agree at " + fmt(rule_diameter_in, 3) + " in -- the rule IS the torsion formula at shear yield over its safety factor, so the entered allowable equals yield / SF"
      : rule_governs
        ? "the rule diameter of " + fmt(rule_diameter_in, 3) + " in GOVERNS, against " + fmt(torsion_diameter_in, 3) + " in at the entered allowable -- " + fmt(rule_diameter_in - torsion_diameter_in, 3) + " in more, because the rule's yield / safety factor (2 to 10 by service in ABYC P-6, about 5 for diesel pleasure craft, for bending, fatigue and corrosion) is a lower stress than the entered allowable"
        : "the torsion diameter of " + fmt(torsion_diameter_in, 3) + " in exceeds the rule diameter of " + fmt(rule_diameter_in, 3) + " in, which is unusual -- check the allowable stress and the rule factor against the material and the society's table";
  const shaft_verdict = !has_shaft
    ? "(no shaft diameter entered)"
    : has_rule && shaft_diameter_in >= rule_diameter_in
      ? "the " + fmt(shaft_diameter_in, 3) + " in shaft meets the rule diameter, and its torsional stress alone is " + fmt(torsional_stress_psi, 0) + " psi"
      : has_rule
        ? "the " + fmt(shaft_diameter_in, 3) + " in shaft is BELOW the rule diameter of " + fmt(rule_diameter_in, 3) + " in; its torsional stress alone is " + fmt(torsional_stress_psi, 0) + " psi, which will look modest and is not the criterion"
        : "the " + fmt(shaft_diameter_in, 3) + " in shaft carries a torsional stress of " + fmt(torsional_stress_psi, 0) + " psi";
  // The repower case, where the cube root is the whole story.
  const has_repower = repower_hp > 0;
  const power_ratio = has_repower ? repower_hp / engine_hp : 0;
  const diameter_ratio = has_repower ? Math.cbrt(power_ratio) : 0;
  const repower_diameter_in = has_repower && has_rule ? rule_factor * Math.cbrt(repower_hp / shaft_rpm) : 0;
  const repower_verdict = !has_repower
    ? "(no repower power entered)"
    : "raising the engine to " + fmt(repower_hp, 0) + " hp at the same shaft speed is " + fmt((power_ratio - 1) * 100, 0) + "% more power and only " + fmt((diameter_ratio - 1) * 100, 1) + "% more shaft" + (has_rule ? ", a rule diameter of " + fmt(repower_diameter_in, 3) + " in" : "") + " -- which sounds small and is often a whole nominal size, and the coupling, stern tube, bearings and stuffing box all change with it";
  if (![torque_inlb, torsional_stress_psi, torsion_diameter_in, rule_diameter_in, repower_diameter_in].every(Number.isFinite)) return { error: "Shaft sizing math is not a finite value." };
  return {
    torque_inlb, has_shaft, torsional_stress_psi, has_allowable, torsion_diameter_in,
    has_rule, power_speed_root, rule_diameter_in, rules_agree, rule_governs, criterion_verdict, shaft_verdict,
    has_repower, power_ratio, diameter_ratio, repower_diameter_in, repower_verdict,
    note: "The diameter a marine propeller shaft needs, and why the torsion calculation everyone reaches for is not the criterion. Torque follows from power and SHAFT speed at the customary 63,025 constant, and the torsional stress in a solid shaft follows from that -- but a propeller shaft is not loaded in torsion alone. The propeller hangs on the end of an overhung shaft supported at the strut, and its weight plus the hydrodynamic side loads put bending into the shaft that a torsion-only calculation misses entirely. That is why classification societies give a rule diameter of the form d = F x cube root of (hp / rpm), whose constant embeds an allowance for that bending and for corrosion, and why the rule figure is almost always larger. Both are reported here, named, so a reader who computed the torsion number elsewhere can see what it leaves out. It is also why the tail shaft -- the outboard portion -- is sized larger than the section inside the boat. The cube root is what makes a repower interesting. Diameter scales with the cube root of power over shaft speed, so a large power increase calls for a small proportional diameter increase -- which sounds negligible and is often a whole nominal size, at which point the coupling, the stern tube, the cutless bearings and the stuffing box all change with it. That is the difference between a repower that drops an engine in and one that rebuilds the running gear. Material choice moves the answer as much as the power does: aluminium bronze, the Aquamet grades and the stainless steels have substantially different allowable stresses and very different corrosion and fatigue behaviour in seawater, which is why the rule factor is entered from the society's own table for the material rather than assumed. This is a screening calculation: it does not compute shaft whirling or critical speed, size the bearing spacing that sets them, evaluate thrust and its bearing, check the coupling or the keyway, address shaft alignment, or account for a shaft's unsupported overhang beyond the strut. ABYC P-6, the classification society's rules, the shaft manufacturer, and a marine engineer govern.",
  };
}
export const marineShaftDiameterExample = { inputs: { engine_hp: 350, shaft_rpm: 1200, shaft_diameter_in: 2.0, allowable_stress_psi: 12000, rule_factor: 3.4, repower_hp: 500 } };
MARINEAVIATION_RENDERERS["marine-shaft-diameter"] = _simpleRenderer({
  citation: "Citation: shaft torque T = 63,025 x hp / rpm and torsional stress tau = 16 T / (pi d^3) as machinery practice writes them, against the rule form d = F x cube root(hp / rpm), which ABYC P-6 writes as the same torsion formula, D = cube root(321,000 P SF / (S N)), at shear yield over a safety factor of 2 for light pleasure service, approaching 5 for heavy-service and all diesel pleasure boats, and approaching 10 for commercial and high-performance craft (ABYC as quoted in shaft makers' data, e.g. Aqualoy Marine Shafting), covering bending, fatigue and corrosion -- so the rule governs whenever the entered allowable is above yield / SF. The rule factor is ENTERED from the society's own table for the shaft material, because bronze, Aquamet and stainless allowables differ substantially. It does not compute shaft whirling or critical speed, bearing spacing, thrust and its bearing, the coupling or keyway, or alignment. ABYC P-6, the classification society's rules, and a marine engineer govern.",
  example: marineShaftDiameterExample.inputs,
  fields: [
    { key: "engine_hp", label: "Engine power at the shaft (hp)", kind: "number", attrs: { step: "any" } },
    { key: "shaft_rpm", label: "Shaft speed after the gear (rpm)", kind: "number", attrs: { step: "any" } },
    { key: "shaft_diameter_in", label: "Shaft diameter to check (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "allowable_stress_psi", label: "Allowable torsional stress (psi, 0 to skip)", kind: "number" },
    { key: "rule_factor", label: "Classification rule factor F", kind: "number", attrs: { step: "any" } },
    { key: "repower_hp", label: "Repower to (hp, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "t", id: "msd-out-t", label: "Shaft torque", value: (r) => fmt(r.torque_inlb, 0) + " in-lb" },
    { key: "c", id: "msd-out-c", label: "Which criterion governs", value: (r) => r.criterion_verdict },
    { key: "s", id: "msd-out-s", label: "The entered shaft", value: (r) => r.shaft_verdict },
    { key: "r", id: "msd-out-r", label: "Repower", value: (r) => r.repower_verdict },
    { key: "n", id: "msd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMarineShaftDiameter,
});

// =====================================================================
// spec-v1642: marine house battery load and alternator recharge.
// =====================================================================
//
// The consumption side is bookkeeping and the charging side is where the
// surprises are: an alternator delivers its rated output only while the
// battery accepts it, and a flooded bank's acceptance falls steeply above
// roughly 80 percent state of charge.
// dims: in { daily_consumption_ah: I T, bank_ah: I T, usable_dod: dimensionless, alternator_a: I, acceptance_fraction: dimensionless, bulk_target_soc_pct: dimensionless } out: { usable_ah: I T, autonomy_days: T, bulk_hours: T, realistic_hours: T, bank_for_one_day_ah: I T }
export function computeHouseBatteryAlternator({
  daily_consumption_ah = 0, bank_ah = 0, usable_dod = 0.5,
  alternator_a = 0, acceptance_fraction = 1, bulk_target_soc_pct = 85,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(daily_consumption_ah > 0)) return { error: "Daily consumption must be positive (Ah)." };
  if (!(bank_ah > 0)) return { error: "Bank capacity must be positive (Ah)." };
  if (!(usable_dod > 0 && usable_dod <= 1)) return { error: "Usable depth of discharge must be above 0 and at most 1 -- about 0.5 for flooded lead acid, 0.8 or more for lithium." };
  if (alternator_a < 0) return { error: "Alternator output cannot be negative (A)." };
  if (!(acceptance_fraction > 0 && acceptance_fraction <= 1)) return { error: "The acceptance fraction must be above 0 and at most 1." };
  if (!(bulk_target_soc_pct > 0 && bulk_target_soc_pct <= 100)) return { error: "The bulk target state of charge must be above 0 and at most 100 percent." };
  const usable_ah = bank_ah * usable_dod;
  const autonomy_days = usable_ah / daily_consumption_ah;
  const bank_for_one_day_ah = daily_consumption_ah / usable_dod;
  const autonomy_verdict = autonomy_days >= 1
    ? fmt(autonomy_days, 2) + " days of autonomy on " + fmt(usable_ah, 0) + " usable Ah"
    : fmt(autonomy_days, 2) + " days -- under a day, so the engine runs daily; a full day would take a " + fmt(bank_for_one_day_ah, 0) + " Ah bank at this depth of discharge";
  // The charging side. The nameplate hours assume the battery accepts the
  // alternator's full output, which it does only in bulk.
  const has_alternator = alternator_a > 0;
  const bulk_hours = has_alternator ? daily_consumption_ah / alternator_a : 0;
  const effective_a = alternator_a * acceptance_fraction;
  const realistic_hours = has_alternator ? daily_consumption_ah / effective_a : 0;
  const extra_hours = realistic_hours - bulk_hours;
  const charge_verdict = !has_alternator
    ? "(no alternator output entered)"
    : acceptance_fraction >= 1
      ? "replacing " + fmt(daily_consumption_ah, 0) + " Ah at the full " + fmt(alternator_a, 0) + " A takes " + fmt(bulk_hours, 2) + " hours -- which is the BULK figure and assumes the battery accepts full current throughout, which a lead acid bank does not"
      : "the nameplate figure is " + fmt(bulk_hours, 2) + " hours at " + fmt(alternator_a, 0) + " A, but at a " + fmt(acceptance_fraction, 2) + " average acceptance the real figure is " + fmt(realistic_hours, 2) + " hours -- " + fmt(extra_hours, 2) + " hours longer, and that gap is the acceptance curve rather than anything the owner is doing wrong";
  // The partial state of charge trap: what an hour of running actually
  // returns, and where the bank ends up.
  const partial_soc_pct = 100 - (1 - bulk_target_soc_pct / 100) * 100;
  const chronic_verdict = bulk_target_soc_pct < 100
    ? "a bank habitually returned to about " + fmt(bulk_target_soc_pct, 0) + "% never sees a full charge, and chronic partial state of charge is what kills flooded banks -- the last portion of the recharge takes disproportionately longer than the first, so the run that would finish it is the one nobody makes"
    : "returning the bank to a genuine 100% takes substantially longer than the bulk figure suggests, because acceptance falls steeply near the top";
  if (![usable_ah, autonomy_days, bulk_hours, realistic_hours, bank_for_one_day_ah].every(Number.isFinite)) return { error: "Battery bank math is not a finite value." };
  return {
    usable_ah, autonomy_days, bank_for_one_day_ah, autonomy_verdict,
    has_alternator, bulk_hours, effective_a, realistic_hours, extra_hours, charge_verdict,
    partial_soc_pct, chronic_verdict,
    note: "A boat's house bank against its daily consumption, and how long the alternator really takes to put it back. The consumption side is straightforward bookkeeping: sum each load's amps times its hours, divide by the usable depth of discharge, and the bank size follows. The usable fraction is the part that is easy to get wrong, because it differs by chemistry -- about half for flooded lead acid, considerably more for lithium iron phosphate -- and a bank sized on nameplate amp-hours rather than usable ones is half the bank it looks like. The charging side is where the surprises are. A rated alternator does not put its rated output into a lead acid bank for the whole recharge: it does so during bulk, and then the battery's own acceptance limits the current as it approaches full. Returning a flooded bank from half to about eighty-five percent might take an hour, and getting it from there to a genuine hundred can take several more -- so the nameplate hours figure is the optimistic end of a range, and the realistic figure at an entered average acceptance is reported beside it. The consequence is a habit rather than an event. Cruising boats run the engine for the bulk portion, see the ammeter fall off, shut down, and leave the bank in a partial state of charge day after day -- and chronic partial state of charge is what kills flooded banks. It is a consequence of the acceptance curve rather than of anything the owner is doing wrong, which is why the arithmetic is worth seeing rather than the advice. Lithium changes it entirely: it accepts near full current to a high state of charge, so the recharge is short and the bulk figure is nearly right -- and it requires alternator temperature protection precisely because it will accept everything the alternator can make, for as long as the alternator can make it. This does not model the acceptance curve itself, which depends on chemistry, age, temperature and the charge profile; it does not size the alternator, its belt or its regulator, evaluate solar or wind contribution, or address the wire sizing that the charging current needs. ABYC E-11, the battery manufacturer's charge acceptance data, and the alternator manufacturer govern.",
  };
}
export const houseBatteryAlternatorExample = { inputs: { daily_consumption_ah: 180, bank_ah: 400, usable_dod: 0.5, alternator_a: 105, acceptance_fraction: 0.6, bulk_target_soc_pct: 85 } };
MARINEAVIATION_RENDERERS["house-battery-alternator"] = _simpleRenderer({
  citation: "Citation: the house bank balance as marine electrical practice writes it -- usable capacity = bank amp-hours x the usable depth of discharge (about 0.5 flooded lead acid, 0.8 or more lithium), autonomy = usable / daily consumption, and recharge hours = consumption / the current the battery actually ACCEPTS, which is the alternator's rating only during bulk. The acceptance fraction is ENTERED because it depends on chemistry, age, temperature and the charge profile. It does not model the acceptance curve, size the alternator, belt or regulator, evaluate solar or wind contribution, or size the charging wire. ABYC E-11, the battery manufacturer's charge acceptance data, and the alternator manufacturer govern.",
  example: houseBatteryAlternatorExample.inputs,
  fields: [
    { key: "daily_consumption_ah", label: "Daily consumption (Ah)", kind: "number", attrs: { step: "any" } },
    { key: "bank_ah", label: "Bank capacity (Ah)", kind: "number" },
    { key: "usable_dod", label: "Usable depth of discharge (0-1)", kind: "number", default: 0.5 },
    { key: "alternator_a", label: "Alternator rated output (A, 0 to skip)", kind: "number" },
    { key: "acceptance_fraction", label: "Average acceptance over the recharge (0-1)", kind: "number", default: 1 },
    { key: "bulk_target_soc_pct", label: "State of charge the bank habitually reaches (%)", kind: "number", default: 85 },
  ],
  outputs: [
    { key: "u", id: "hba-out-u", label: "Usable capacity", value: (r) => fmt(r.usable_ah, 0) + " Ah" },
    { key: "a", id: "hba-out-a", label: "Autonomy", value: (r) => r.autonomy_verdict },
    { key: "c", id: "hba-out-c", label: "Recharge", value: (r) => r.charge_verdict },
    { key: "p", id: "hba-out-p", label: "Partial state of charge", value: (r) => r.chronic_verdict },
    { key: "n", id: "hba-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHouseBatteryAlternator,
});

// =====================================================================
// spec-v1643: travel-lift sling placement and hull load.
// =====================================================================
//
// The split, not half the displacement, is the number to check. The machine's
// own capacity check on half the weight is the wrong check whenever the centre
// of gravity is not centred between the slings.
// dims: in { displacement_lb: M L T^-2, sling_spacing_ft: L, cg_from_fwd_ft: L, sling_wll_lb: M L T^-2, sling_angle_deg: dimensionless } out: { fwd_sling_lb: M L T^-2, aft_sling_lb: M L T^-2, aft_share_pct: dimensionless, difference_lb: M L T^-2, horizontal_component_lb: M L T^-2 }
export function computeTravelLiftSlingPlacement({
  displacement_lb = 0, sling_spacing_ft = 0, cg_from_fwd_ft = 0,
  sling_wll_lb = 0, sling_angle_deg = 90,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(displacement_lb > 0)) return { error: "Displacement must be positive (lb)." };
  if (!(sling_spacing_ft > 0)) return { error: "Sling spacing must be positive (ft)." };
  if (!(cg_from_fwd_ft > 0)) return { error: "The centre of gravity's distance from the forward sling must be positive (ft)." };
  if (!(cg_from_fwd_ft < sling_spacing_ft)) return { error: "The centre of gravity must fall BETWEEN the slings -- outside them the boat is not in equilibrium on two slings and this is not the calculation you want." };
  if (sling_wll_lb < 0) return { error: "The sling working load limit cannot be negative (lb)." };
  if (!(sling_angle_deg > 0 && sling_angle_deg <= 90)) return { error: "The sling angle must be above 0 and at most 90 degrees from horizontal." };
  const cg_from_aft_ft = sling_spacing_ft - cg_from_fwd_ft;
  // Simple statics: the sling NEARER the centre of gravity carries more.
  const fwd_sling_lb = displacement_lb * cg_from_aft_ft / sling_spacing_ft;
  const aft_sling_lb = displacement_lb * cg_from_fwd_ft / sling_spacing_ft;
  const aft_share_pct = aft_sling_lb / displacement_lb * 100;
  const difference_lb = Math.abs(aft_sling_lb - fwd_sling_lb);
  const governing_lb = Math.max(fwd_sling_lb, aft_sling_lb);
  const aft_carries_more = aft_sling_lb > fwd_sling_lb;
  const even_split_lb = displacement_lb / 2;
  const split_verdict = difference_lb < 1
    ? "the centre of gravity sits midway, so the slings share the load evenly at " + fmt(fwd_sling_lb, 0) + " lb each"
    : (aft_carries_more ? "the AFT" : "the FORWARD") + " sling carries " + fmt(governing_lb, 0) + " lb against " + fmt(displacement_lb - governing_lb, 0) + " lb on the other -- " + fmt(Math.max(aft_share_pct, 100 - aft_share_pct), 0) + "% of the boat, and " + fmt(difference_lb, 0) + " lb more than the other sling";
  // The check people actually make, and why it is wrong.
  const has_wll = sling_wll_lb > 0;
  const within_wll = has_wll && governing_lb <= sling_wll_lb + 1e-9 * Math.abs(sling_wll_lb);
  const even_split_would_pass = has_wll && even_split_lb <= sling_wll_lb + 1e-9 * Math.abs(sling_wll_lb);
  const wll_verdict = !has_wll
    ? "(no sling working load limit entered)"
    : within_wll
      ? "both slings are inside the " + fmt(sling_wll_lb, 0) + " lb working load limit, the governing one at " + fmt(governing_lb, 0) + " lb"
      : even_split_would_pass
        ? "the governing sling is at " + fmt(governing_lb, 0) + " lb, OVER the " + fmt(sling_wll_lb, 0) + " lb limit -- and a check on half the displacement (" + fmt(even_split_lb, 0) + " lb) would have PASSED, which is exactly why the split rather than half the weight is the number to check"
        : "the governing sling is at " + fmt(governing_lb, 0) + " lb, over the " + fmt(sling_wll_lb, 0) + " lb limit; even an even split would have been over";
  // Convergence: slings picked up inboard of the machine's beams add
  // compression across the hull.
  const angle_rad = sling_angle_deg * Math.PI / 180;
  const has_convergence = sling_angle_deg < 90;
  const horizontal_component_lb = has_convergence ? governing_lb / Math.tan(angle_rad) : 0;
  const sling_tension_lb = governing_lb / Math.sin(angle_rad);
  const convergence_verdict = !has_convergence
    ? "the slings are vertical, so there is no horizontal component across the hull"
    : "at " + fmt(sling_angle_deg, 0) + " degrees from horizontal the governing sling's tension rises to " + fmt(sling_tension_lb, 0) + " lb and it pulls " + fmt(horizontal_component_lb, 0) + " lb inward across the hull -- compression the hull has to take on top of the vertical load";
  if (![fwd_sling_lb, aft_sling_lb, aft_share_pct, difference_lb, horizontal_component_lb, sling_tension_lb].every(Number.isFinite)) return { error: "Sling placement math is not a finite value." };
  return {
    cg_from_aft_ft, fwd_sling_lb, aft_sling_lb, aft_share_pct, difference_lb,
    governing_lb, aft_carries_more, even_split_lb, split_verdict,
    has_wll, within_wll, even_split_would_pass, wll_verdict,
    has_convergence, horizontal_component_lb, sling_tension_lb, convergence_verdict,
    note: "How a travel lift's two slings share a boat's weight, and why half the displacement is the wrong number to check them against. The load split is simple statics -- the sling nearer the centre of gravity carries more -- and it matters because both the sling and the hull are rated. A boat whose centre of gravity sits well aft puts a disproportionate share on the aft sling, and the machine's own capacity check, which is usually made against half the displacement, passes a lift the governing sling cannot take. That is the comparison reported here: what the split actually is, and whether a half-the-weight check would have missed it. Where the slings LAND is the part that damages boats, and it is not arithmetic. A sling under a shaft, a strut, a folding propeller, a transducer, or a thruster tunnel destroys the appendage; a sling under an unsupported hull panel between frames crushes it. The correct positions are under bulkheads, frames or engine beds, and many production boats have marked or documented sling positions precisely because the right answer is not obvious from outside the hull. That constraint usually decides everything: if the only usable forward position gives an uneven split, the answer is slings rated for the actual load rather than a repositioning that puts a sling under the shaft. Sling angle is the third load path. Slings converging from the machine's beams to a narrower pickup at the hull are not vertical, so their tension rises above the vertical load they carry and they pull inward, putting compression across the hull that the vertical calculation does not show. Wider spacing is better for stability and worse for convergence, and both are subject to landing on structure. This is a two-sling static split on ENTERED geometry: it does not locate the centre of gravity, which is where the whole calculation starts and which is rarely documented; it does not evaluate the hull's local capacity at the sling positions, size the slings or their protection, or address the lift's own stability, its tyre loading, or the yard's ground bearing. The boat's documented lifting points, the yard's rigging procedure, and the lift manufacturer govern.",
  };
}
export const travelLiftSlingPlacementExample = { inputs: { displacement_lb: 28000, sling_spacing_ft: 18, cg_from_fwd_ft: 10, sling_wll_lb: 14000, sling_angle_deg: 70 } };
MARINEAVIATION_RENDERERS["travel-lift-sling-placement"] = _simpleRenderer({
  citation: "Citation: the two-sling static split as rigging practice writes it -- each sling carries the displacement times the distance from the OTHER sling to the centre of gravity, over the sling spacing, so the sling nearer the centre of gravity carries more -- with sling tension = vertical load / sin(angle) and the inward horizontal component = vertical load / tan(angle). The centre of gravity is ENTERED and is rarely documented. It does not evaluate the hull's local capacity at the sling positions (a sling under a shaft, strut, transducer or unsupported panel damages the boat regardless of the load), size the slings or their protection, or address the lift's own stability and ground bearing. The boat's documented lifting points and the yard's rigging procedure govern.",
  example: travelLiftSlingPlacementExample.inputs,
  fields: [
    { key: "displacement_lb", label: "Boat displacement (lb)", kind: "number" },
    { key: "sling_spacing_ft", label: "Distance between slings (ft)", kind: "number", attrs: { step: "any" } },
    { key: "cg_from_fwd_ft", label: "Centre of gravity, aft of the forward sling (ft)", kind: "number", attrs: { step: "any" } },
    { key: "sling_wll_lb", label: "Sling working load limit (lb, 0 to skip)", kind: "number" },
    { key: "sling_angle_deg", label: "Sling angle from horizontal (degrees)", kind: "number", default: 90, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "s", id: "tls-out-s", label: "The split", value: (r) => r.split_verdict },
    { key: "l", id: "tls-out-l", label: "Each sling", value: (r) => "forward " + fmt(r.fwd_sling_lb, 0) + " lb, aft " + fmt(r.aft_sling_lb, 0) + " lb (an even split would be " + fmt(r.even_split_lb, 0) + " lb each)" },
    { key: "w", id: "tls-out-w", label: "Against the rating", value: (r) => r.wll_verdict },
    { key: "c", id: "tls-out-c", label: "Convergence", value: (r) => r.convergence_verdict },
    { key: "n", id: "tls-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTravelLiftSlingPlacement,
});

// =====================================================================
// spec-v1644: dock piling embedment and lateral load.
// =====================================================================
//
// A piling is a cantilever fixed in soil. Driving to refusal establishes AXIAL
// capacity against a hard layer and says nothing about the lateral resistance
// in the soft material above -- which is what resists a boat pushing sideways.
// dims: in { lateral_load_lb: M L T^-2, height_above_mudline_ft: L, pile_diameter_in: L, soil_lateral_bearing_psf_per_ft: M L^-1 T^-2, scour_ft: L, existing_embedment_ft: L } out: { moment_ftlb: M L^2 T^-2, embedment_ft: L, scoured_moment_ftlb: M L^2 T^-2, scoured_embedment_ft: L, total_depth_needed_ft: L }
export function computeDockPilingLateral({
  lateral_load_lb = 0, height_above_mudline_ft = 0, pile_diameter_in = 0,
  soil_lateral_bearing_psf_per_ft = 0, scour_ft = 0, existing_embedment_ft = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lateral_load_lb > 0)) return { error: "The lateral load must be positive (lb)." };
  if (!(height_above_mudline_ft > 0)) return { error: "The load's height above the mudline must be positive (ft)." };
  if (!(pile_diameter_in > 0)) return { error: "Pile diameter must be positive (in)." };
  if (!(soil_lateral_bearing_psf_per_ft > 0)) return { error: "The soil's lateral bearing must be positive (psf per ft of depth) -- it comes from the geotechnical information for the site, not from the driving record." };
  if (scour_ft < 0) return { error: "Anticipated scour cannot be negative (ft)." };
  if (existing_embedment_ft < 0) return { error: "Existing embedment cannot be negative (ft)." };
  const b_ft = pile_diameter_in / 12;
  const moment_ftlb = lateral_load_lb * height_above_mudline_ft;
  // IBC 1807.3.2.1 nonconstrained embedment, the same relation the catalog's
  // pole-embedment-depth uses. S1 is the lateral bearing at ONE THIRD of the
  // embedment -- the entered rate (psf per ft of depth, IBC 1806.2) times d/3 --
  // so d appears on both sides and is found by bisection. This tile had used
  // the per-foot rate itself as S1, which on the worked pile asked 23.9 ft of
  // embedment where the code gives about 9.7.
  const embedFor = (h_ft) => {
    const req = (d) => {
      // IBC 1807.3.2.1: d "but not over 12 feet for purpose of computing lateral
      // pressure". Until 2026-10-01 S1 kept growing past 12 ft and a deep pile
      // read about 3 ft short (15.5 ft where the capped code asks 18.6).
      const A = _MEC_EMBED_A_CONST * lateral_load_lb / (soil_lateral_bearing_psf_per_ft * Math.min(d, 12) / 3 * b_ft);
      return 0.5 * A * (1 + Math.sqrt(1 + _MEC_EMBED_H_CONST * h_ft / A));
    };
    // req(d) falls as d rises, so the crossing is unique; grow the bracket
    // until it holds the root rather than return its edge.
    let lo = 1e-6, hi = 1000;
    for (let i = 0; i < 40 && req(hi) > hi; i++) hi *= 2;
    const bracketed = req(hi) <= hi;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (req(mid) > mid) lo = mid; else hi = mid;
    }
    return bracketed ? (lo + hi) / 2 : NaN;
  };
  const embedment_ft = embedFor(height_above_mudline_ft);
  const a_term = _MEC_EMBED_A_CONST * lateral_load_lb / (soil_lateral_bearing_psf_per_ft * Math.min(embedment_ft, 12) / 3 * b_ft);
  // Scour is what makes this a marine problem rather than a fence problem: the
  // effective mudline drops, so the cantilever LENGTHENS and the embedment
  // SHORTENS at the same time.
  const has_scour = scour_ft > 0;
  const scoured_height_ft = height_above_mudline_ft + scour_ft;
  const scoured_moment_ftlb = lateral_load_lb * scoured_height_ft;
  const scoured_embedment_ft = has_scour ? embedFor(scoured_height_ft) : embedment_ft;
  const total_depth_needed_ft = scoured_embedment_ft + scour_ft;
  const extra_depth_ft = total_depth_needed_ft - embedment_ft;
  const scour_verdict = !has_scour
    ? "(no scour entered -- and scour is a real failure mode at a dock rather than a hypothetical)"
    : fmt(scour_ft, 1) + " ft of scour drops the effective mudline, so the cantilever grows to " + fmt(scoured_height_ft, 1) + " ft and the moment to " + fmt(scoured_moment_ftlb, 0) + " ft-lb, while the embedment that remains is measured from the LOWER mudline -- the pile must be driven " + fmt(total_depth_needed_ft, 1) + " ft below the ORIGINAL mudline, " + fmt(extra_depth_ft, 1) + " ft more than the unscoured case";
  // Against what is already in the ground.
  const has_existing = existing_embedment_ft > 0;
  const adequate = has_existing && existing_embedment_ft >= total_depth_needed_ft - 1e-9 * Math.abs(total_depth_needed_ft);
  const shortfall_ft = total_depth_needed_ft - existing_embedment_ft;
  const existing_verdict = !has_existing
    ? "(no existing embedment entered)"
    : adequate
      ? "the existing " + fmt(existing_embedment_ft, 1) + " ft of embedment covers the " + fmt(total_depth_needed_ft, 1) + " ft required, with " + fmt(-shortfall_ft, 1) + " ft to spare"
      : "the existing " + fmt(existing_embedment_ft, 1) + " ft is SHORT of the " + fmt(total_depth_needed_ft, 1) + " ft required by " + fmt(shortfall_ft, 1) + " ft -- and note that a pile driven to refusal on a shallow hard stratum can be axially sound and laterally inadequate at the same time";
  if (![moment_ftlb, embedment_ft, scoured_moment_ftlb, scoured_embedment_ft, total_depth_needed_ft].every(Number.isFinite)) return { error: "Piling embedment math is not a finite value." };
  return {
    b_ft, moment_ftlb, a_term, embedment_ft,
    has_scour, scoured_height_ft, scoured_moment_ftlb, scoured_embedment_ft,
    total_depth_needed_ft, extra_depth_ft, scour_verdict,
    has_existing, adequate, shortfall_ft, existing_verdict,
    note: "The embedment a dock piling needs to resist a lateral load, and what scour does to it. A piling is a cantilever fixed in soil, and its lateral capacity depends on the soil's lateral bearing over the embedded length rather than on how hard it was to drive. That distinction is the whole point: driving to refusal establishes AXIAL capacity against a hard layer and says nothing about the lateral resistance in the soft material above, which is what resists a boat pushing sideways -- so a piling that refused on a shallow hard stratum can be axially sound and laterally inadequate at the same time. The relation is the nonconstrained case the building code gives for posts and poles, applied to a marine pile: the required depth grows with the load and with the height of that load above the mudline, and shrinks with the pile's width and the soil's lateral bearing. SCOUR is what makes this a marine problem rather than a fence problem, and it attacks from both directions at once. Scour lowers the effective mudline, so the cantilever above it LENGTHENS and the moment rises, while the embedment below it SHORTENS -- and the pile has to be driven deeper by the scour depth on top of the deeper embedment the longer cantilever demands. Both effects are computed here rather than described, because the combined answer is materially deeper than either alone suggests. Two conditions sit outside the arithmetic. Marine borers consume untreated or damaged timber below the waterline, so a pile's section is not a constant over its life and a design that assumed full section can lose it. And the loads themselves are larger than they look: berthing energy goes as the SQUARE of the approach speed, so a vessel arriving twice as fast delivers four times the energy, and wind on a moored vessel, current, and ice all add. The lateral load is ENTERED and it is the input this is most sensitive to. This does not compute berthing energy, wind or current loading, or ice; it does not check the pile's own bending capacity or its section loss, address group effects where piles are close together, evaluate uplift or axial capacity, or account for a sloping mudline. The geotechnical report, the applicable code, and a marine structural engineer govern.",
  };
}
export const dockPilingLateralExample = { inputs: { lateral_load_lb: 1200, height_above_mudline_ft: 6, pile_diameter_in: 12, soil_lateral_bearing_psf_per_ft: 150, scour_ft: 2, existing_embedment_ft: 10 } };
MARINEAVIATION_RENDERERS["dock-piling-lateral"] = _simpleRenderer({
  citation: "Citation: the nonconstrained lateral embedment relation IBC 1807.3.2.1 gives -- d = 0.5 A (1 + sqrt(1 + 4.36 h / A)) with A = 2.34 P / (S1 b) -- applied to a marine pile, with the soil's lateral bearing rate (psf per ft of depth) ENTERED from the geotechnical information for the site rather than inferred from the driving record; S1 = rate x min(d, 12 ft) / 3, IBC 1807.3.2.1. Scour is applied by lengthening the cantilever and deepening the required drive by the scour depth. It does not compute berthing energy, wind or current loading, or ice; it does not check the pile's own bending capacity or section loss to marine borers, address pile group effects, evaluate uplift or axial capacity, or account for a sloping mudline. The geotechnical report and a marine structural engineer govern.",
  example: dockPilingLateralExample.inputs,
  fields: [
    { key: "lateral_load_lb", label: "Lateral load (lb)", kind: "number" },
    { key: "height_above_mudline_ft", label: "Its height above the mudline (ft)", kind: "number", attrs: { step: "any" } },
    { key: "pile_diameter_in", label: "Pile diameter (in)", kind: "number", attrs: { step: "any" } },
    { key: "soil_lateral_bearing_psf_per_ft", label: "Soil lateral bearing (psf per ft of depth)", kind: "number" },
    { key: "scour_ft", label: "Anticipated scour (ft, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "existing_embedment_ft", label: "Existing embedment to check (ft, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "m", id: "dpl-out-m", label: "Moment at the mudline", value: (r) => fmt(r.moment_ftlb, 0) + " ft-lb" },
    { key: "e", id: "dpl-out-e", label: "Embedment required", value: (r) => fmt(r.embedment_ft, 2) + " ft with no scour" },
    { key: "s", id: "dpl-out-s", label: "With scour", value: (r) => r.scour_verdict },
    { key: "x", id: "dpl-out-x", label: "Against what is in the ground", value: (r) => r.existing_verdict },
    { key: "n", id: "dpl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDockPilingLateral,
});

// =====================================================================
// spec-v1645: aircraft control cable tension and temperature correction.
// =====================================================================
//
// An aluminium airframe expands roughly twice as much as a steel cable for the
// same temperature rise, so as the aircraft warms the structure stretches the
// cable system and tension CLIMBS. Rigging to nominal on a cold morning leaves
// it over-tensioned in the sun; rigging to nominal on a hot ramp leaves it
// slack in the cold.
// dims: in { nominal_tension_lb: M L T^-2, reference_temp_f: T, ambient_temp_f: T, cable_area_in2: L^2, cable_modulus_psi: M L^-1 T^-2, structure_alpha_per_f: dimensionless, cable_alpha_per_f: dimensionless } out: { temp_difference_f: T, differential_strain: dimensionless, tension_change_lb: M L T^-2, target_at_ambient_lb: M L T^-2, tension_when_warm_lb: M L T^-2 }
export function computeControlCableTension({
  nominal_tension_lb = 0, reference_temp_f = 70, ambient_temp_f = 70,
  cable_area_in2 = 0, cable_modulus_psi = 0,
  structure_alpha_per_f = 0.0000128, cable_alpha_per_f = 0.0000065,
  service_temp_f = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(nominal_tension_lb > 0)) return { error: "The nominal rig tension must be positive (lb)." };
  if (!(cable_area_in2 > 0)) return { error: "Cable metallic area must be positive (sq in)." };
  if (!(cable_modulus_psi > 0)) return { error: "The cable's effective modulus must be positive (psi) -- a stranded cable's is well below solid steel's." };
  if (structure_alpha_per_f < 0 || cable_alpha_per_f < 0) return { error: "Coefficients of thermal expansion cannot be negative." };
  // The differential expansion is the whole mechanism. A positive difference
  // means the structure grows faster than the cable, which tightens it.
  const temp_difference_f = ambient_temp_f - reference_temp_f;
  const alpha_difference = structure_alpha_per_f - cable_alpha_per_f;
  const differential_strain = alpha_difference * temp_difference_f;
  const tension_change_lb = differential_strain * cable_area_in2 * cable_modulus_psi;
  // Rigging cold: the target at the ambient temperature is BELOW nominal,
  // because the system TIGHTENS as it warms toward the reference. Rigged at
  // ambient to X, the tension at the reference is X + k (t_ref - t_amb), so
  // X = nominal - k (t_ref - t_amb) = nominal + the change already computed
  // from reference to ambient. The sign is easy to get backwards and the
  // direction is asserted in the bounds test.
  const target_at_ambient_lb = nominal_tension_lb + tension_change_lb;
  const colder_than_reference = ambient_temp_f < reference_temp_f;
  const target_verdict = Math.abs(temp_difference_f) < 0.01
    ? "at the reference temperature the target is the nominal " + fmt(nominal_tension_lb, 1) + " lb"
    : colder_than_reference
      ? "rigging at " + fmt(ambient_temp_f, 0) + " degF, " + fmt(-temp_difference_f, 0) + " degF BELOW the reference, the chart target is about " + fmt(target_at_ambient_lb, 1) + " lb rather than the nominal " + fmt(nominal_tension_lb, 1) + " -- lower, because the system will TIGHTEN by roughly " + fmt(-tension_change_lb, 1) + " lb as it warms to the reference"
      : "rigging at " + fmt(ambient_temp_f, 0) + " degF, " + fmt(temp_difference_f, 0) + " degF ABOVE the reference, the chart target is about " + fmt(target_at_ambient_lb, 1) + " lb rather than the nominal " + fmt(nominal_tension_lb, 1) + " -- higher, because the system will SLACKEN by roughly " + fmt(tension_change_lb, 1) + " lb as it cools to the reference";
  // The error: rigging to nominal at this ambient, then going to a service
  // temperature.
  // 0 degF is a real cold-flight temperature, not a blank: until 2026-10-01 it
  // skipped the check and hid 36 lb of slack. The check is skipped only when the
  // service temperature equals the rigging temperature.
  const has_service = service_temp_f !== ambient_temp_f;
  const service_difference_f = has_service ? service_temp_f - ambient_temp_f : 0;
  const service_change_lb = has_service ? alpha_difference * service_difference_f * cable_area_in2 * cable_modulus_psi : 0;
  const tension_when_warm_lb = nominal_tension_lb + service_change_lb;
  const over_tension = has_service && service_change_lb > 0;
  const error_verdict = !has_service
    ? "(service temperature equals the rigging temperature -- no change to check)"
    : over_tension
      ? "rigging to the nominal " + fmt(nominal_tension_lb, 1) + " lb at " + fmt(ambient_temp_f, 0) + " degF and then sitting at " + fmt(service_temp_f, 0) + " degF takes the tension to about " + fmt(tension_when_warm_lb, 1) + " lb -- " + fmt(service_change_lb, 1) + " lb OVER, which loads pulleys and bearings and raises control forces"
      : "rigging to the nominal " + fmt(nominal_tension_lb, 1) + " lb at " + fmt(ambient_temp_f, 0) + " degF and then flying into " + fmt(service_temp_f, 0) + " degF air takes the tension to about " + fmt(tension_when_warm_lb, 1) + " lb -- " + fmt(-service_change_lb, 1) + " lb SLACK, and slack cables mean lost motion at the surface and reduced flutter margin";
  if (![temp_difference_f, differential_strain, tension_change_lb, target_at_ambient_lb, tension_when_warm_lb].every(Number.isFinite)) return { error: "Cable tension math is not a finite value." };
  return {
    temp_difference_f, alpha_difference, differential_strain, tension_change_lb,
    target_at_ambient_lb, colder_than_reference, target_verdict,
    has_service, service_difference_f, service_change_lb, tension_when_warm_lb, over_tension, error_verdict,
    note: "Why an aircraft control cable's rig tension is specified against a temperature, and roughly what the correction is worth. The differential expansion is the whole reason for the manufacturer's rigging chart: an aluminium airframe expands roughly twice as much as a steel cable for the same temperature rise, so as the aircraft warms the structure stretches the cable system and tension CLIMBS. Rigging to the nominal tension on a hot ramp therefore leaves the system slack when it cools, and rigging to nominal on a cold morning leaves it over-tensioned in the sun -- which is why the chart gives a lower target at low temperature and a higher one at high. Both error directions are computed here, because they fail differently. Over-tension loads pulleys, bearings and fairleads continuously, raises control forces, and can exceed the system's design tension. Under-tension gives slack, which means lost motion at the control surface and, more seriously, reduced flutter margin -- so the two are not symmetric annoyances and neither is a small deviation. The instrument belongs in the same conversation as the arithmetic. A tensiometer reading is only correct if the riser and the calibration card match the cable's DIAMETER AND CONSTRUCTION: a 1/8 in 7x19 cable read on a card for 7x7 gives a wrong number with no indication that anything is amiss, and no amount of temperature correction rescues a reading taken on the wrong card. This is an ESTIMATE of the correction's magnitude from entered coefficients, cable area and an effective modulus, and it is not the chart. The cable's LENGTH does not appear, and that is not an omission: for a run constrained at both ends the tension change is the differential strain times the area times the modulus, and the length cancels out of it. A stranded cable's effective modulus is well below solid steel's and varies with construction and with how thoroughly the cable has been pre-stretched, the structure's effective expansion depends on the load path rather than on the material alone, and the real system includes turnbuckles, quadrants and pulleys that this does not model. The aircraft maintenance manual's own rigging chart is the authority, the tensiometer's calibration card governs the reading, and a certificated mechanic performs and signs for the rigging.",
  };
}
export const controlCableTensionExample = { inputs: { nominal_tension_lb: 70, reference_temp_f: 70, ambient_temp_f: 30, cable_area_in2: 0.0069, cable_modulus_psi: 12000000, structure_alpha_per_f: 0.0000128, cable_alpha_per_f: 0.0000065, service_temp_f: 90 } };
MARINEAVIATION_RENDERERS["control-cable-tension"] = _simpleRenderer({
  citation: "Citation: the differential thermal expansion that makes a rigging chart necessary -- an aluminium airframe expands roughly twice as much as a steel cable per degree, so tension RISES as the aircraft warms -- with the change estimated as (alpha_structure - alpha_cable) x dT x cable metallic area x effective modulus. Coefficients, area and modulus are ENTERED; a stranded cable's effective modulus is well below solid steel's and varies with construction and pre-stretch. An ESTIMATE of the correction's magnitude, NOT the chart: the aircraft maintenance manual's own rigging chart is the authority, a tensiometer reading is only valid with the riser and calibration card matching the cable's diameter AND construction, and a certificated mechanic performs and signs for the rigging.",
  example: controlCableTensionExample.inputs,
  fields: [
    { key: "nominal_tension_lb", label: "Nominal rig tension (lb)", kind: "number", attrs: { step: "any" } },
    { key: "reference_temp_f", label: "Reference temperature (°F)", kind: "number", default: 70, attrs: { step: "any" } },
    { key: "ambient_temp_f", label: "Temperature at rigging (°F)", kind: "number", default: 70, attrs: { step: "any" } },
    { key: "cable_area_in2", label: "Cable metallic area (sq in)", kind: "number", attrs: { step: "any" } },
    { key: "cable_modulus_psi", label: "Cable effective modulus (psi)", kind: "number" },
    { key: "structure_alpha_per_f", label: "Structure expansion coefficient (per °F)", kind: "number", default: 0.0000128, attrs: { step: "any" } },
    { key: "cable_alpha_per_f", label: "Cable expansion coefficient (per °F)", kind: "number", default: 0.0000065, attrs: { step: "any" } },
    { key: "service_temp_f", label: "Service temperature to check (°F; the rigging temperature to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "d", id: "cct-out-d", label: "Temperature difference", value: (r) => fmt(r.temp_difference_f, 1) + " °F from the reference" },
    { key: "c", id: "cct-out-c", label: "Tension change", value: (r) => fmt(r.tension_change_lb, 2) + " lb over that difference" },
    { key: "t", id: "cct-out-t", label: "Target at this temperature", value: (r) => r.target_verdict },
    { key: "e", id: "cct-out-e", label: "If rigged to nominal instead", value: (r) => r.error_verdict },
    { key: "n", id: "cct-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeControlCableTension,
});

// =====================================================================
// spec-v1646: propeller track, balance, and vibration limit.
// =====================================================================
//
// Track and balance are DIFFERENT faults with different fixes and both produce
// vibration. Checking track first is what stops a technician chasing a
// tracking fault with weight, which no amount of weight corrects.
// Helpers above the exports, returning arithmetic expressions.
const _mecVecX = (mag, deg) => mag * Math.cos(deg * Math.PI / 180);
const _mecVecY = (mag, deg) => mag * Math.sin(deg * Math.PI / 180);
// dims: in { track_in: L, track_limit_in: L, initial_ips: L T^-1, initial_phase_deg: dimensionless, trial_weight_g: M, trial_phase_deg: dimensionless, result_ips: L T^-1, result_phase_deg: dimensionless, target_ips: L T^-1 } out: { track_margin_in: L, effect_ips: L T^-1, effect_phase_deg: dimensionless, correction_weight_g: M, correction_phase_deg: dimensionless }
export function computePropellerTrackBalance({
  track_in = 0, track_limit_in = 0.0625,
  initial_ips = 0, initial_phase_deg = 0,
  trial_weight_g = 0, trial_phase_deg = 0,
  result_ips = 0, result_phase_deg = 0, target_ips = 0.2,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (track_in < 0) return { error: "Track difference cannot be negative (in) -- enter its magnitude." };
  if (!(track_limit_in > 0)) return { error: "The track limit must be positive (in)." };
  if (initial_ips < 0 || result_ips < 0) return { error: "Vibration levels cannot be negative (IPS)." };
  if (trial_weight_g < 0) return { error: "Trial weight cannot be negative (g)." };
  if (!(target_ips > 0)) return { error: "The target vibration level must be positive (IPS)." };
  // Track first. Out of track is an AERODYNAMIC once-per-revolution imbalance
  // that weight does not correct.
  const track_margin_in = track_limit_in - track_in;
  const track_ok = track_in <= track_limit_in + 1e-9 * Math.abs(track_limit_in);
  const track_verdict = track_ok
    ? "track is " + fmt(track_in, 4) + " in against a " + fmt(track_limit_in, 4) + " in limit, WITHIN limits -- so tracking is not the fault and the vibration is a balance problem that weight will fix"
    : "track is " + fmt(track_in, 4) + " in, OVER the " + fmt(track_limit_in, 4) + " in limit by " + fmt(-track_margin_in, 4) + " in -- fix the track FIRST. Out of track means the blades sweep different planes and each meets the air differently, which is an aerodynamic once-per-revolution imbalance that no amount of weight corrects";
  // The trial-weight vector method. The effect vector is the DIFFERENCE
  // between the two readings, and the correction is the trial weight scaled by
  // the ratio of the initial to the effect and rotated to oppose the initial.
  const has_balance = initial_ips > 0 && trial_weight_g > 0 && result_ips >= 0;
  const initial_x = _mecVecX(initial_ips, initial_phase_deg);
  const initial_y = _mecVecY(initial_ips, initial_phase_deg);
  const result_x = _mecVecX(result_ips, result_phase_deg);
  const result_y = _mecVecY(result_ips, result_phase_deg);
  const effect_x = result_x - initial_x;
  const effect_y = result_y - initial_y;
  const effect_ips = Math.sqrt(effect_x * effect_x + effect_y * effect_y);
  const effect_phase_deg = has_balance && effect_ips > 0 ? (Math.atan2(effect_y, effect_x) * 180 / Math.PI + 360) % 360 : 0;
  const trial_useful = has_balance && effect_ips > 0;
  const correction_weight_g = trial_useful ? trial_weight_g * initial_ips / effect_ips : 0;
  // Oppose the initial vector: the required effect is the initial rotated 180.
  const required_phase_deg = (initial_phase_deg + 180) % 360;
  const correction_phase_deg = trial_useful
    ? ((trial_phase_deg + required_phase_deg - effect_phase_deg) % 360 + 360) % 360
    : 0;
  const balance_verdict = !has_balance
    ? "(no initial reading and trial weight entered)"
    : !trial_useful
      ? "the trial weight produced no change in the vibration vector, so it tells you nothing -- move it or increase it and run again"
      : "the trial weight moved the vector by " + fmt(effect_ips, 3) + " IPS at " + fmt(effect_phase_deg, 0) + " degrees, so the correction is " + fmt(correction_weight_g, 2) + " g at " + fmt(correction_phase_deg, 0) + " degrees";
  const at_target = has_balance && result_ips <= target_ips;
  const target_verdict = !has_balance
    ? "(no readings entered)"
    : at_target
      ? "the trial run already reads " + fmt(result_ips, 3) + " IPS, at or below the " + fmt(target_ips, 2) + " IPS target"
      : "the trial run reads " + fmt(result_ips, 3) + " IPS against a " + fmt(target_ips, 2) + " IPS target, so the correction above is the next move";
  if (![track_margin_in, effect_ips, effect_phase_deg, correction_weight_g, correction_phase_deg].every(Number.isFinite)) return { error: "Track and balance math is not a finite value." };
  return {
    track_margin_in, track_ok, track_verdict,
    has_balance, effect_ips, effect_phase_deg, trial_useful,
    correction_weight_g, correction_phase_deg, balance_verdict,
    at_target, target_verdict,
    note: "A propeller's track against its limit and, separately, the balance weight a trial run calls for. Track and balance are DIFFERENT faults with different fixes, and both produce vibration -- which is why checking track first is what stops a technician chasing a tracking fault with weight. Out of track means the blades are not sweeping the same plane, so each blade meets the air differently and the propeller generates a once-per-revolution AERODYNAMIC imbalance that no amount of weight corrects. Out of balance means the mass distribution is uneven, and that is what weight corrects. Reporting the track verdict before the balance arithmetic is deliberate: a balance run on an out-of-track propeller chases a moving target and can end with weight added that makes the aerodynamic problem no better and the mass distribution worse. The balance itself is the trial-weight vector method. A trial weight is placed at a known angle, the run repeated, and the EFFECT vector -- the difference between the two readings, not the second reading -- tells you what the propeller does per gram and at what phase lag. The correction is then the trial weight scaled by the ratio of the original vibration to that effect, rotated so its effect opposes the original. If the trial weight produces no change in the vector it has told you nothing, and that case is reported rather than divided by. A static bench check on knife edges is necessary but not sufficient: it finds a gross mass asymmetry and cannot find a dynamic couple, and a propeller that balances statically can still shake an engine. This computes a single-plane correction from ENTERED readings taken with a calibrated analyser; it does not measure anything, validate the phase reference or the tachometer pickup, address two-plane balancing, distinguish propeller imbalance from an engine or mount problem producing vibration at the same frequency, or set the limits. The propeller and airframe manufacturers' limits, the analyser's own procedure, and a certificated mechanic govern.",
  };
}
export const propellerTrackBalanceExample = { inputs: { track_in: 0.045, track_limit_in: 0.0625, initial_ips: 0.42, initial_phase_deg: 155, trial_weight_g: 12, trial_phase_deg: 0, result_ips: 0.19, result_phase_deg: 260, target_ips: 0.2 } };
MARINEAVIATION_RENDERERS["propeller-track-balance"] = _simpleRenderer({
  citation: "Citation: the track check against the manufacturer's limit (commonly about 1/16 in between blades on a fixed-pitch propeller) and the single-plane trial-weight vector method -- the EFFECT vector is the difference between the trial reading and the original, and the correction is the trial weight scaled by the ratio of the original to that effect, rotated to oppose the original. Readings are ENTERED from a calibrated analyser. It does not measure anything, validate the phase reference or tachometer pickup, address two-plane balancing, distinguish propeller imbalance from an engine or mount problem at the same frequency, or set the limits. The propeller and airframe manufacturers' limits and a certificated mechanic govern.",
  example: propellerTrackBalanceExample.inputs,
  fields: [
    { key: "track_in", label: "Track difference between blades (in)", kind: "number", attrs: { step: "any" } },
    { key: "track_limit_in", label: "Track limit (in)", kind: "number", default: 0.0625, attrs: { step: "any" } },
    { key: "initial_ips", label: "Initial vibration (IPS)", kind: "number", attrs: { step: "any" } },
    { key: "initial_phase_deg", label: "Initial phase (degrees)", kind: "number", attrs: { step: "any" } },
    { key: "trial_weight_g", label: "Trial weight (g)", kind: "number", attrs: { step: "any" } },
    { key: "trial_phase_deg", label: "Trial weight position (degrees)", kind: "number", attrs: { step: "any" } },
    { key: "result_ips", label: "Vibration with the trial weight (IPS)", kind: "number", attrs: { step: "any" } },
    { key: "result_phase_deg", label: "Its phase (degrees)", kind: "number", attrs: { step: "any" } },
    { key: "target_ips", label: "Target vibration (IPS)", kind: "number", default: 0.2, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "t", id: "ptb-out-t", label: "Track", value: (r) => r.track_verdict },
    { key: "b", id: "ptb-out-b", label: "Balance correction", value: (r) => r.balance_verdict },
    { key: "g", id: "ptb-out-g", label: "Against the target", value: (r) => r.target_verdict },
    { key: "n", id: "ptb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePropellerTrackBalance,
});

// =====================================================================
// spec-v1647: aviation fuel weight vs temperature and load sheet.
// =====================================================================
//
// spec-v1647 puts 95 degF at "roughly 44 degF above the 15 degC (59 degF)
// reference". It is 36 degF, and every number after it follows the wrong
// difference: the spec reports 6.628 lb/gal and a 46 lb shortfall where the
// arithmetic it describes gives 6.653 and 36.9 lb. Both temperatures are
// inputs here and the difference is computed.
// dims: in { gallons: L^3, standard_density_lb_gal: M L^-3, reference_temp_f: T, fuel_temp_f: T, density_change_pct_per_10f: dimensionless, arm_in: L, required_weight_lb: M L T^-2 } out: { temp_difference_f: T, actual_density_lb_gal: M L^-3, actual_weight_lb: M L T^-2, standard_weight_lb: M L T^-2, weight_difference_lb: M L T^-2, gallons_for_weight: L^3 }
export function computeAviationFuelWeight({
  gallons = 0, standard_density_lb_gal = _MEC_JET_A_LB_GAL, reference_temp_f = _MEC_REFERENCE_TEMP_F,
  fuel_temp_f = 59, density_change_pct_per_10f = 0.4, arm_in = 0, required_weight_lb = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gallons > 0)) return { error: "Fuel volume must be positive (gal)." };
  if (!(standard_density_lb_gal > 0)) return { error: "Standard density must be positive (lb/gal)." };
  if (density_change_pct_per_10f < 0) return { error: "The density change rate cannot be negative (% per 10 degF)." };
  if (required_weight_lb < 0) return { error: "The required weight cannot be negative (lb)." };
  // The difference is COMPUTED from the two temperatures, which is where the
  // spec went wrong.
  const temp_difference_f = fuel_temp_f - reference_temp_f;
  const density_change_fraction = density_change_pct_per_10f / 100 * temp_difference_f / 10;
  const actual_density_lb_gal = standard_density_lb_gal * (1 - density_change_fraction);
  if (!(actual_density_lb_gal > 0)) return { error: "The temperature correction drives density to zero or below -- check the temperatures and the change rate." };
  const standard_weight_lb = gallons * standard_density_lb_gal;
  const actual_weight_lb = gallons * actual_density_lb_gal;
  const weight_difference_lb = actual_weight_lb - standard_weight_lb;
  const warmer = temp_difference_f > 1e-9;
  const weight_verdict = Math.abs(temp_difference_f) < 0.01
    ? "at the reference temperature the weight is the standard " + fmt(standard_weight_lb, 0) + " lb"
    : warmer
      ? fmt(gallons, 0) + " gallons at " + fmt(fuel_temp_f, 0) + " degF is " + fmt(temp_difference_f, 0) + " degF above the reference, so the density is " + fmt(actual_density_lb_gal, 4) + " lb/gal and the fuel weighs " + fmt(actual_weight_lb, 0) + " lb -- " + fmt(-weight_difference_lb, 0) + " lb LIGHTER than the standard-density figure"
      : fmt(gallons, 0) + " gallons at " + fmt(fuel_temp_f, 0) + " degF is " + fmt(-temp_difference_f, 0) + " degF below the reference, so the density is " + fmt(actual_density_lb_gal, 4) + " lb/gal and the fuel weighs " + fmt(actual_weight_lb, 0) + " lb -- " + fmt(weight_difference_lb, 0) + " lb HEAVIER than the standard-density figure";
  // The direction that matters, and it is not symmetric.
  const direction_verdict = warmer
    ? "OVERSTATING fuel weight, which is what using the standard density on warm fuel does, understates the payload available -- conservative for weight and balance, and it also means loading to a WEIGHT by counting gallons puts less fuel aboard than intended, which shows up as shorter range than planned"
    : temp_difference_f < 0
      ? "UNDERSTATING fuel weight, which is what using the standard density on cold fuel does, is the dangerous direction: the load sheet reports less weight than is actually aboard"
      : "at the reference temperature there is no correction to get backwards";
  // The reverse question, and the moment.
  const has_required = required_weight_lb > 0;
  const gallons_for_weight = has_required ? required_weight_lb / actual_density_lb_gal : 0;
  const gallons_at_standard = has_required ? required_weight_lb / standard_density_lb_gal : 0;
  const gallons_verdict = !has_required
    ? "(no required weight entered)"
    : fmt(gallons_for_weight, 1) + " gallons are needed for " + fmt(required_weight_lb, 0) + " lb at this temperature, against " + fmt(gallons_at_standard, 1) + " at the standard density -- a " + fmt(Math.abs(gallons_for_weight - gallons_at_standard), 1) + " gallon difference";
  const has_arm = arm_in !== 0;
  const actual_moment_inlb = has_arm ? actual_weight_lb * arm_in : 0;
  const moment_difference_inlb = has_arm ? weight_difference_lb * arm_in : 0;
  const moment_verdict = !has_arm
    ? "(no fuel arm entered)"
    : "the fuel moment is " + fmt(actual_moment_inlb, 0) + " in-lb at a " + fmt(arm_in, 1) + " in arm, " + fmt(Math.abs(moment_difference_inlb), 0) + " in-lb from the standard-density figure -- a fuel weight error moves the centre of gravity as well as the total";
  if (![temp_difference_f, actual_density_lb_gal, actual_weight_lb, standard_weight_lb, weight_difference_lb, gallons_for_weight].every(Number.isFinite)) return { error: "Fuel weight math is not a finite value." };
  return {
    temp_difference_f, density_change_fraction, actual_density_lb_gal,
    standard_weight_lb, actual_weight_lb, weight_difference_lb, warmer, weight_verdict, direction_verdict,
    has_required, gallons_for_weight, gallons_at_standard, gallons_verdict,
    has_arm, actual_moment_inlb, moment_difference_inlb, moment_verdict,
    note: "What a quantity of aviation fuel actually weighs at its actual temperature, and what the standard-density figure gets wrong. The conversion is a multiplication and the trap is WHICH DENSITY. Published densities are quoted at a reference temperature, and fuel drawn from an above-ground tank on a hot day is materially less dense than that -- so a given number of gallons weighs less than the table says. The consequence runs in two directions and they are not the same kind of error. Loading to a WEIGHT by counting gallons at standard density puts LESS fuel aboard than intended, which is not a safety problem but shows up as shorter range than planned. Computing a load sheet with an overstated fuel weight understates the payload available, which is conservative. Computing one with an UNDERSTATED fuel weight -- which is what using the standard density on cold fuel does -- reports less weight aboard than there is, and that is the direction that matters. The temperature difference is computed from two entered temperatures here rather than taken as a figure, because that subtraction is exactly where this goes wrong. A fuel weight error moves the centre of gravity as well as the gross weight, which is why the moment is reported when an arm is entered: an aircraft can be within gross weight and outside its centre of gravity envelope, and fuel is usually a large moment at a fixed arm. Densities and the temperature coefficient are ENTERED because they vary by fuel and by batch: Jet A and 100LL differ substantially, the coefficient is an approximation to a real density curve, and a fuel receipt or a refueller's densitometer reading is better than any table. This computes a weight and a moment; it does not perform weight and balance, check the centre of gravity envelope, account for unusable fuel, tank geometry or attitude, address fuel expansion in the tank and the ullage it needs, or convert between mass and volume bases used in different countries. The aircraft flight manual, the operator's load sheet procedure, and the fuel supplier's density data govern.",
  };
}
export const aviationFuelWeightExample = { inputs: { gallons: 380, standard_density_lb_gal: 6.75, reference_temp_f: 59, fuel_temp_f: 95, density_change_pct_per_10f: 0.4, arm_in: 120, required_weight_lb: 2565 } };
MARINEAVIATION_RENDERERS["aviation-fuel-weight"] = _simpleRenderer({
  citation: "Citation: fuel weight = gallons x density at the ACTUAL fuel temperature, with density falling from its reference-temperature value at an entered rate (commonly quoted near 0.4 percent per 10 degF for hydrocarbon fuels) -- the temperature DIFFERENCE computed from two entered temperatures rather than taken as a figure. Densities and the coefficient are ENTERED because they vary by fuel and batch, and a fuel receipt or a refueller's densitometer beats any table. It does not perform weight and balance, check the centre of gravity envelope, account for unusable fuel, tank geometry or attitude, address expansion and ullage, or convert between the mass and volume bases used in different countries. The aircraft flight manual and the operator's load sheet procedure govern.",
  example: aviationFuelWeightExample.inputs,
  fields: [
    { key: "gallons", label: "Fuel quantity (gal)", kind: "number", attrs: { step: "any" } },
    { key: "standard_density_lb_gal", label: "Density at the reference temperature (lb/gal)", kind: "number", default: 6.75, attrs: { step: "any" } },
    { key: "reference_temp_f", label: "Reference temperature (°F)", kind: "number", default: 59, attrs: { step: "any" } },
    { key: "fuel_temp_f", label: "Actual fuel temperature (°F)", kind: "number", default: 59, attrs: { step: "any" } },
    { key: "density_change_pct_per_10f", label: "Density change (% per 10 °F)", kind: "number", default: 0.4, attrs: { step: "any" } },
    { key: "arm_in", label: "Fuel arm for the moment (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "required_weight_lb", label: "Weight to load (lb, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "w", id: "afw-out-w", label: "Weight", value: (r) => r.weight_verdict },
    { key: "d", id: "afw-out-d", label: "Which direction the error runs", value: (r) => r.direction_verdict },
    { key: "g", id: "afw-out-g", label: "Gallons for a target weight", value: (r) => r.gallons_verdict },
    { key: "m", id: "afw-out-m", label: "Moment", value: (r) => r.moment_verdict },
    { key: "n", id: "afw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAviationFuelWeight,
});
