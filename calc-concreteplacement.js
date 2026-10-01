// Group E (cont.): concrete placement, post-tensioning, and tilt-up field operations.
// spec-v1862 moves the existing spec-v1617..v1621 bench out of calc-concrete.js
// so the reinforced-concrete module stays below its gzip cap. Calculator
// behavior, IDs, citations, examples, and Group E assignments are unchanged.

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

function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
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

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const CONCRETEPLACEMENT_RENDERERS = {};

// ===========================================================================
// spec-v1617..v1621: the 2026-09-08 trade-expansion concrete placement and
// tilt-up band. Five tiles, all group E, into this existing module.
//
//   v1617 concrete-pump-line-pressure   v1620 tilt-up-lift-stress
//   v1618 boom-pump-reach               v1621 tilt-up-brace-load
//   v1619 post-tension-elongation
//
// TWO OF THE FIVE SPECS WERE INTERNALLY WRONG:
//   spec-v1617 gives the static head as "about 0.043 psi per foot of rise per
//     pcf". It is 1/144 = 0.00694 -- its own "roughly 1 psi per foot for
//     normal weight concrete" is right, and 150/144 = 1.04 confirms it.
//   spec-v1619 states E = 2.8e7 psi and then prints 10.23 in of elongation,
//     which is the answer for 2.85e7. At the stated modulus it is 10.41 in.

// The unit conversions this band needs. 144 sq in per sq ft turns a unit
// weight in pcf into a pressure gradient in psi per foot; 12 in per ft; and
// 7.5 sqrt(f'c) is the ACI 318 modulus of rupture for normal weight concrete.
const _IN2_PER_FT2_CONC = 144;
const _IN_PER_FT_CONC = 12;
const _MODULUS_OF_RUPTURE_COEFF = 7.5;

// ============ spec-v1617: concrete pump line pressure ============

// dims: in { horizontal_length_ft: L, vertical_lift_ft: L, unit_weight_pcf: M L^-3, friction_psi_per_100ft: M L^-1 T^-2, bend_count: dimensionless, bend_equivalent_ft: L, hose_length_ft: L, hose_friction_multiple: dimensionless, pump_rated_psi: M L^-1 T^-2 } out: { static_psi: M L^-1 T^-2, friction_psi: M L^-1 T^-2, equivalent_length_ft: L, total_psi: M L^-1 T^-2, margin_psi: M L^-1 T^-2, additional_line_ft: L }
export function computeConcretePumpLinePressure({ horizontal_length_ft = 0, vertical_lift_ft = 0, unit_weight_pcf = 150, friction_psi_per_100ft = 0, bend_count = 0, bend_equivalent_ft = 10, hose_length_ft = 0, hose_friction_multiple = 3, pump_rated_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(horizontal_length_ft > 0)) return { error: "Horizontal line length must be positive (ft)." };
  if (vertical_lift_ft < 0) return { error: "Vertical lift cannot be negative (ft)." };
  if (!(unit_weight_pcf > 0)) return { error: "Concrete unit weight must be positive (pcf)." };
  if (!(friction_psi_per_100ft > 0)) return { error: "Friction loss must be positive (psi per 100 ft) -- read it off the pumping chart for this slump, line size, and rate." };
  if (bend_count < 0) return { error: "Bend count cannot be negative." };
  if (bend_equivalent_ft < 0) return { error: "The equivalent length per bend cannot be negative (ft)." };
  if (hose_length_ft < 0) return { error: "Flexible hose length cannot be negative (ft)." };
  if (!(hose_friction_multiple >= 1)) return { error: "Flexible hose cannot have less friction than steel line; the multiple is at least one." };
  if (!(pump_rated_psi > 0)) return { error: "The pump's rated CONCRETE pressure must be positive (psi) -- not its rated hydraulic pressure." };
  // Static head: a unit weight in pcf over 144 sq in per sq ft is the pressure
  // gradient in psi per foot. Normal weight concrete lands at 1.04 psi/ft.
  const psi_per_ft_of_lift = unit_weight_pcf / _IN2_PER_FT2_CONC;
  const static_psi = vertical_lift_ft * psi_per_ft_of_lift;
  const bend_equivalent_total_ft = bend_count * bend_equivalent_ft;
  const hose_equivalent_ft = hose_length_ft * hose_friction_multiple;
  const equivalent_length_ft = horizontal_length_ft + bend_equivalent_total_ft + hose_equivalent_ft;
  const friction_per_ft = friction_psi_per_100ft / 100;
  const friction_psi = equivalent_length_ft * friction_per_ft;
  const bend_psi = bend_equivalent_total_ft * friction_per_ft;
  const hose_psi = hose_equivalent_ft * friction_per_ft;
  const line_psi = horizontal_length_ft * friction_per_ft;
  const total_psi = static_psi + friction_psi;
  const margin_psi = pump_rated_psi - total_psi;
  const within_rating = total_psi <= pump_rated_psi;
  const utilization_pct = total_psi / pump_rated_psi * 100;
  // What a crew actually wants: how much more line is left before the limit.
  const additional_line_ft = friction_per_ft > 0 ? Math.max(0, margin_psi) / friction_per_ft : 0;
  const outs = [static_psi, friction_psi, equivalent_length_ft, total_psi, margin_psi, additional_line_ft];
  if (!outs.every(Number.isFinite)) return { error: "Pump-pressure math is not a finite value." };
  const verdict = within_rating
    ? "INSIDE the rating: " + fmt(total_psi, 0) + " psi against " + fmt(pump_rated_psi, 0) + " psi, " + fmt(utilization_pct, 0) + "% of the pump, with room for " + fmt(additional_line_ft, 0) + " more feet of line"
    : "OVER the rating: " + fmt(total_psi, 0) + " psi against " + fmt(pump_rated_psi, 0) + " psi, " + fmt(-margin_psi, 0) + " psi past it. Shorten the line, take out bends, or fix the mix -- pushing harder is not one of the options";
  return {
    horizontal_length_ft, vertical_lift_ft, unit_weight_pcf, psi_per_ft_of_lift,
    static_psi, friction_psi_per_100ft, line_psi, bend_count, bend_equivalent_total_ft,
    bend_psi, hose_length_ft, hose_equivalent_ft, hose_psi, equivalent_length_ft,
    friction_psi, total_psi, pump_rated_psi, margin_psi, within_rating,
    utilization_pct, additional_line_ft, verdict,
    note: "A concrete pump line has a pressure limit and a concrete mix has a pumpability, and where they meet decides whether the pour runs or the line plugs. THE STATIC TERM IS THE EASY ONE AND OFTEN THE LARGER ON A HIGH POUR. A unit weight in pounds per cubic foot divided by 144 square inches to the square foot is the pressure gradient in pounds per square inch per foot of rise, which for normal weight concrete is 1.04 -- so a fifteen storey lift is more than 150 psi before any friction at all. Horizontal friction depends most on slump and line diameter, and it is where a mix change shows up: a stiffer mix can double the friction per hundred feet, and a line that ran fine on a five inch slump plugs on a three inch one. BENDS AND REDUCERS ARE THE QUIET KILLERS, and they are handled here the way the field handles them -- as equivalent feet of straight line. Each 90 degree bend is worth several feet, flexible hose is worth several times its own length, and a reducer at the pump outlet can be worth more than a long run. That is why a line threading a congested site can hit the pump's limit at a fraction of its nominal reach, and why the equivalent length rather than the measured length is the number that matters. The limit to compare against is the pump's rated CONCRETE pressure, not its rated hydraulic pressure, and those are different numbers on the same data plate. The output worth having is the additional line length still available: a crew that knows it has forty feet of margin can plan the last placement, where a crew that discovers the limit by plugging the line loses the pour and spends the afternoon breaking couplings. THE FRICTION VALUE IS AN INPUT AND NO CHART IS SHIPPED. Friction loss in a concrete line is not a simple function of anything: it depends on slump, aggregate size and shape, sand content, fines, admixtures, temperature, and the condition of the line itself, and published charts give broad ranges rather than values. A mix's pumpability is a mix design question, and a marginal mix will block regardless of what any pressure calculation says -- blockages are usually a mix or segregation problem, not a pressure problem, and the correct response to a stiff mix is to fix it at the truck rather than push harder. This does not design a pump setup, size a pump, or address line restraint, which is a safety requirement rather than a preference: a line under pressure that separates whips, and couplings, restraints, and the exclusion zone are governed by the equipment manufacturer and by OSHA. Boom reach, setup, and outrigger ground bearing are separate. ACI 304.2R for pumping, the pump manufacturer's ratings, the concrete supplier's mix design, and the contractor's competent person govern.",
  };
}
const concretePumpLinePressureExample = { inputs: { horizontal_length_ft: 320, vertical_lift_ft: 60, unit_weight_pcf: 150, friction_psi_per_100ft: 4.5, bend_count: 6, bend_equivalent_ft: 10, hose_length_ft: 25, hose_friction_multiple: 3, pump_rated_psi: 1100 } };
CONCRETEPLACEMENT_RENDERERS["concrete-pump-line-pressure"] = _simpleRenderer({
  citation: "Citation: the static and friction pressure components of a concrete pump line by name -- static gradient = unit weight (pcf) / 144, so normal weight concrete is 1.04 psi per foot of rise; friction = equivalent length x the friction loss per 100 ft, with bends and flexible hose converted to equivalent feet of straight line -- with ACI 304.2R for pumping and the pump manufacturer's ratings named. NO FRICTION CHART IS SHIPPED: the loss per 100 ft depends on slump, aggregate, fines, admixtures, temperature, and line condition, and published charts give ranges. The limit compared against is the pump's rated CONCRETE pressure, not its hydraulic pressure. ACI 304.2R, the pump manufacturer's ratings, the concrete supplier's mix design, and the contractor's competent person govern.",
  example: concretePumpLinePressureExample.inputs,
  fields: [
    { key: "horizontal_length_ft", label: "Horizontal steel line (ft)", kind: "number", default: 320 },
    { key: "vertical_lift_ft", label: "Vertical lift (ft)", kind: "number", default: 60 },
    { key: "unit_weight_pcf", label: "Concrete unit weight (pcf)", kind: "number", default: 150 },
    { key: "friction_psi_per_100ft", label: "Friction loss from the chart (psi per 100 ft)", kind: "number", default: 4.5 },
    { key: "bend_count", label: "90 degree bends", kind: "number", default: 6 },
    { key: "bend_equivalent_ft", label: "Equivalent length per bend (ft)", kind: "number", default: 10 },
    { key: "hose_length_ft", label: "Flexible hose (ft)", kind: "number", default: 25 },
    { key: "hose_friction_multiple", label: "Hose friction, as a multiple of steel line", kind: "number", default: 3 },
    { key: "pump_rated_psi", label: "Pump rated CONCRETE pressure (psi)", kind: "number", default: 1100 },
  ],
  outputs: [
    { key: "s", id: "cplp-out-s", label: "Static pressure from lift", value: (r) => fmt(r.static_psi, 1) + " psi -- " + fmt(r.psi_per_ft_of_lift, 3) + " psi per foot at " + fmt(r.unit_weight_pcf, 0) + " pcf" },
    { key: "e", id: "cplp-out-e", label: "Equivalent length", value: (r) => fmt(r.equivalent_length_ft, 0) + " ft -- " + fmt(r.horizontal_length_ft, 0) + " of line, " + fmt(r.bend_equivalent_total_ft, 0) + " for " + fmt(r.bend_count, 0) + " bends, " + fmt(r.hose_equivalent_ft, 0) + " for " + fmt(r.hose_length_ft, 0) + " ft of hose" },
    { key: "f", id: "cplp-out-f", label: "Friction pressure", value: (r) => fmt(r.friction_psi, 1) + " psi -- line " + fmt(r.line_psi, 1) + ", bends " + fmt(r.bend_psi, 1) + ", hose " + fmt(r.hose_psi, 1) },
    { key: "t", id: "cplp-out-t", label: "Total required", value: (r) => fmt(r.total_psi, 1) + " psi" },
    { key: "v", id: "cplp-out-v", label: "Against the pump", value: (r) => r.verdict },
    { key: "n", id: "cplp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcretePumpLinePressure,
});

// ============ spec-v1618: concrete boom pump reach ============

// dims: in { boom_reach_ft: L, required_distance_ft: L, required_height_ft: L, boom_centre_offset_ft: L, outrigger_load_lb: M L T^-2, outrigger_pad_area_ft2: L^2, power_line_distance_ft: L, required_line_clearance_ft: L } out: { reach_at_height_ft: L, reach_margin_ft: L, max_height_at_distance_ft: L, setup_to_target_ft: L, outrigger_pressure_psf: M L^-1 T^-2, power_line_margin_ft: L }
export function computeBoomPumpReach({ boom_reach_ft = 0, required_distance_ft = 0, required_height_ft = 0, boom_centre_offset_ft = 0, outrigger_load_lb = 0, outrigger_pad_area_ft2 = 0, power_line_distance_ft = 0, required_line_clearance_ft = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(boom_reach_ft > 0)) return { error: "Boom reach must be positive (ft)." };
  if (!(required_distance_ft > 0)) return { error: "The required placement distance must be positive (ft)." };
  if (required_height_ft < 0) return { error: "The required height cannot be negative (ft)." };
  if (!(required_height_ft < boom_reach_ft)) return { error: "The required height is at or beyond the boom's total reach; nothing is left for horizontal distance." };
  if (boom_centre_offset_ft < 0) return { error: "The boom centre offset cannot be negative (ft)." };
  if (outrigger_load_lb < 0) return { error: "Outrigger load cannot be negative (lb)." };
  if (outrigger_pad_area_ft2 < 0) return { error: "Outrigger pad area cannot be negative (sq ft)." };
  if (outrigger_load_lb > 0 && !(outrigger_pad_area_ft2 > 0)) return { error: "Enter the pad or mat area to turn the outrigger load into a bearing pressure." };
  if (power_line_distance_ft < 0) return { error: "The distance to overhead lines cannot be negative (ft)." };
  if (!(required_line_clearance_ft > 0)) return { error: "The required power line clearance must be positive (ft)." };
  // The circle approximation: a screening tool, not the reach diagram.
  const reach_at_height_ft = Math.sqrt(boom_reach_ft * boom_reach_ft - required_height_ft * required_height_ft);
  const reach_lost_to_height_ft = boom_reach_ft - reach_at_height_ft;
  const setup_to_target_ft = required_distance_ft + boom_centre_offset_ft;
  const reach_margin_ft = reach_at_height_ft - required_distance_ft;
  const reaches = reach_margin_ft >= 0;
  const max_height_at_distance_ft = required_distance_ft < boom_reach_ft
    ? Math.sqrt(boom_reach_ft * boom_reach_ft - required_distance_ft * required_distance_ft)
    : 0;
  const outrigger_pressure_psf = outrigger_pad_area_ft2 > 0 ? outrigger_load_lb / outrigger_pad_area_ft2 : null;
  const power_line_margin_ft = power_line_distance_ft > 0 ? power_line_distance_ft - required_line_clearance_ft : null;
  const power_line_clear = power_line_margin_ft === null ? null : power_line_margin_ft >= 0;
  const outs = [reach_at_height_ft, reach_margin_ft, setup_to_target_ft, max_height_at_distance_ft];
  if (!outs.every(Number.isFinite)) return { error: "Boom reach math is not a finite value." };
  const verdict = reaches
    ? "REACHES with " + fmt(reach_margin_ft, 1) + " ft to spare: " + fmt(reach_at_height_ft, 1) + " ft available at " + fmt(required_height_ft, 0) + " ft up, against " + fmt(required_distance_ft, 0) + " ft needed"
    : "DOES NOT REACH, short by " + fmt(-reach_margin_ft, 1) + " ft: " + fmt(reach_at_height_ft, 1) + " ft available at " + fmt(required_height_ft, 0) + " ft up, against " + fmt(required_distance_ft, 0) + " ft needed. A different setup point, a larger pump, or line off the boom tip";
  const power_line_verdict = power_line_clear === null
    ? "Enter the distance to overhead lines. Clearance is absolute and governs the setup independently of reach."
    : power_line_clear
      ? "CLEAR by " + fmt(power_line_margin_ft, 1) + " ft: " + fmt(power_line_distance_ft, 0) + " ft to the line against a required " + fmt(required_line_clearance_ft, 0) + " ft"
      : "INSIDE THE CLEARANCE ENVELOPE by " + fmt(-power_line_margin_ft, 1) + " ft. A setup that reaches beautifully and puts the boom inside the clearance is not a setup";
  return {
    boom_reach_ft, required_distance_ft, required_height_ft, reach_at_height_ft,
    reach_lost_to_height_ft, boom_centre_offset_ft, setup_to_target_ft,
    reach_margin_ft, reaches, max_height_at_distance_ft,
    outrigger_load_lb, outrigger_pad_area_ft2, outrigger_pressure_psf,
    power_line_distance_ft, required_line_clearance_ft, power_line_margin_ft,
    power_line_clear, verdict, power_line_verdict,
    note: "A boom pump's advertised reach is a vertical number and a horizontal number that cannot both be achieved at once, and what a crew needs on a site visit is whether the boom reaches the far corner from the only place the truck can set up. That is a triangle. Treating the envelope as a circle of the boom's total reach gives the horizontal distance available at a working height as the square root of the reach squared less the height squared, and the amount lost to elevation is the number that surprises people reading a spec sheet: a boom advertised at 110 ft gives about 100 ft at 45 ft up. THE CIRCLE IS A SCREEN AND THE MANUFACTURER'S REACH DIAGRAM IS THE TRUTH. A multi-section boom's envelope is not a circle: it has dead zones close in and near the mast, and its reach at a given height depends on which unfolding configuration is used. The circle is good enough to answer whether a pour is plausible from a given setup and much faster than pulling the chart, and it is not good enough to commit to. THE TWO CONSTRAINTS THAT DECIDE A SETUP ARE ALMOST NEVER REACH. Outrigger ground bearing is the first: boom pump outrigger loads are concentrated and large, and one outrigger set over a utility vault, a basement wall, or soft backfill is how a pump goes over. The bearing pressure is reported here so the size of the problem is visible, and sizing the cribbing or mats against an allowable bearing from a geotechnical source is a separate calculation. Power line clearance is the second and it is absolute. A boom is a long conductor swinging near overhead lines, and OSHA excludes concrete pumps from the crane rule (1926.1400(c)(1)), so the clearance comes from ASME B30.27, the pump manufacturer and the utility rather than Subpart CC; a setup that reaches beautifully and puts the boom inside the clearance envelope is not a setup, whatever the reach diagram permits. This does not evaluate boom capacity, the weight of line and concrete in the boom, wind limits on boom operation, or machine stability, all of which are manufacturer limits, and it does not size outrigger mats or address line pressure. The pump manufacturer's reach and load charts, OSHA, and the contractor's competent person govern.",
  };
}
const boomPumpReachExample = { inputs: { boom_reach_ft: 110, required_distance_ft: 95, required_height_ft: 45, boom_centre_offset_ft: 8, outrigger_load_lb: 40000, outrigger_pad_area_ft2: 4, power_line_distance_ft: 25, required_line_clearance_ft: 20 } };
CONCRETEPLACEMENT_RENDERERS["boom-pump-reach"] = _simpleRenderer({
  citation: "Citation: the reach geometry approximation by name -- horizontal reach at a height = sqrt(total reach squared - height squared), a circle screening a multi-section boom whose real envelope is a published reach diagram with configuration-dependent limits and dead zones -- with the manufacturer's reach diagram and ASME B30.27 named as governing (OSHA 1926.1400(c)(1) excludes concrete pumps from the crane subpart). Outrigger bearing pressure = load / pad area; sizing mats against an allowable bearing is a separate calculation needing a geotechnical source. Power line clearance is absolute and governs the setup independently of reach. The pump manufacturer's charts, OSHA, and the contractor's competent person govern.",
  example: boomPumpReachExample.inputs,
  fields: [
    { key: "boom_reach_ft", label: "Boom total reach (ft)", kind: "number", default: 110 },
    { key: "required_distance_ft", label: "Horizontal distance to the placement (ft)", kind: "number", default: 95 },
    { key: "required_height_ft", label: "Height above the boom centre (ft)", kind: "number", default: 45 },
    { key: "boom_centre_offset_ft", label: "Boom centre offset from the truck (ft)", kind: "number", default: 8 },
    { key: "outrigger_load_lb", label: "Worst outrigger load (lb, 0 to skip)", kind: "number", default: 40000 },
    { key: "outrigger_pad_area_ft2", label: "Outrigger pad or mat area (sq ft)", kind: "number", default: 4 },
    { key: "power_line_distance_ft", label: "Distance to overhead lines (ft, 0 to skip)", kind: "number", default: 25 },
    { key: "required_line_clearance_ft", label: "Required power line clearance (ft)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "r", id: "bpr-out-r", label: "Reach at that height", value: (r) => fmt(r.reach_at_height_ft, 1) + " ft, against " + fmt(r.boom_reach_ft, 0) + " ft at low level -- " + fmt(r.reach_lost_to_height_ft, 1) + " ft lost to elevation" },
    { key: "v", id: "bpr-out-v", label: "Against the pour", value: (r) => r.verdict },
    { key: "h", id: "bpr-out-h", label: "Highest placement at that distance", value: (r) => fmt(r.max_height_at_distance_ft, 1) + " ft at " + fmt(r.required_distance_ft, 0) + " ft out" },
    { key: "s", id: "bpr-out-s", label: "Truck to the placement", value: (r) => fmt(r.setup_to_target_ft, 1) + " ft, with the boom centre " + fmt(r.boom_centre_offset_ft, 1) + " ft off the truck" },
    { key: "o", id: "bpr-out-o", label: "Outrigger bearing", value: (r) => r.outrigger_pressure_psf === null ? "(no outrigger load entered)" : fmt(r.outrigger_pressure_psf, 0) + " psf under " + fmt(r.outrigger_pad_area_ft2, 1) + " sq ft. Size the mats against an allowable bearing from a geotechnical source -- and no mat saves an outrigger set over a vault or a backfilled trench" },
    { key: "p", id: "bpr-out-p", label: "Power lines", value: (r) => r.power_line_verdict },
    { key: "n", id: "bpr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBoomPumpReach,
});

// ============ spec-v1619: post-tension tendon elongation ============

// dims: in { strand_area_in2: L^2, modulus_psi: M L^-1 T^-2, tendon_length_ft: L, jacking_stress_ksi: M L^-1 T^-2, curvature_friction: dimensionless, angular_change_rad: dimensionless, wobble_per_ft: dimensionless, anchor_set_in: L, measured_elongation_in: L, tolerance_pct: dimensionless } out: { jacking_force_lb: M L T^-2, far_end_force_lb: M L T^-2, average_force_lb: M L T^-2, theoretical_elongation_in: L, expected_measured_in: L, elongation_difference_pct: dimensionless }
export function computePostTensionElongation({ strand_area_in2 = 0, modulus_psi = 0, tendon_length_ft = 0, jacking_stress_ksi = 0, curvature_friction = 0.2, angular_change_rad = 0, wobble_per_ft = 0.0002, anchor_set_in = 0.25, measured_elongation_in = 0, tolerance_pct = 7 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(strand_area_in2 > 0)) return { error: "Strand area must be positive (sq in)." };
  if (!(modulus_psi > 0)) return { error: "Modulus of elasticity must be positive (psi)." };
  if (!(tendon_length_ft > 0)) return { error: "Tendon length must be positive (ft)." };
  if (!(jacking_stress_ksi > 0)) return { error: "Jacking stress must be positive (ksi)." };
  if (curvature_friction < 0) return { error: "The curvature friction coefficient cannot be negative." };
  if (angular_change_rad < 0) return { error: "Total angular change cannot be negative (radians)." };
  if (wobble_per_ft < 0) return { error: "The wobble coefficient cannot be negative (per ft)." };
  if (anchor_set_in < 0) return { error: "Anchor set cannot be negative (in)." };
  if (measured_elongation_in < 0) return { error: "Measured elongation cannot be negative (in)." };
  if (!(tolerance_pct > 0)) return { error: "The acceptance tolerance must be positive (%)." };
  const length_in = tendon_length_ft * _IN_PER_FT_CONC;
  const jacking_force_lb = jacking_stress_ksi * 1000 * strand_area_in2;
  // Friction and wobble decay the force along the tendon exponentially.
  const decay_exponent = curvature_friction * angular_change_rad + wobble_per_ft * tendon_length_ft;
  const far_end_ratio = Math.exp(-decay_exponent);
  const far_end_force_lb = jacking_force_lb * far_end_ratio;
  // The AVERAGE force over an exponential decay is the integral, which is
  // (1 - e^-k) / k. At zero decay that limit is exactly one, so a straight
  // tendon with no wobble reduces to the jacking force with no special case.
  const average_ratio = decay_exponent > 0 ? (1 - far_end_ratio) / decay_exponent : 1;
  const average_force_lb = jacking_force_lb * average_ratio;
  const theoretical_elongation_in = average_force_lb * length_in / (strand_area_in2 * modulus_psi);
  const no_friction_elongation_in = jacking_force_lb * length_in / (strand_area_in2 * modulus_psi);
  const friction_overstatement_in = no_friction_elongation_in - theoretical_elongation_in;
  const expected_measured_in = theoretical_elongation_in - anchor_set_in;
  const elongation_difference_in = measured_elongation_in > 0 ? measured_elongation_in - expected_measured_in : null;
  const elongation_difference_pct = elongation_difference_in === null ? null : elongation_difference_in / expected_measured_in * 100;
  // ACI 318 investigates only a difference that EXCEEDS 7%; the 1e-9 keeps 7.000000000000008
  // (exactly 7% long) from failing while exactly 7% short passed (fixed 2026-10-01).
  const within_tolerance = elongation_difference_pct === null ? null : Math.abs(elongation_difference_pct) <= tolerance_pct + 1e-9;
  const outs = [jacking_force_lb, far_end_force_lb, average_force_lb, theoretical_elongation_in, expected_measured_in];
  if (!outs.every(Number.isFinite)) return { error: "Elongation math is not a finite value." };
  const verdict = within_tolerance === null
    ? "Enter the measured elongation to check it against theoretical."
    : within_tolerance
      ? "ACCEPT: " + fmt(measured_elongation_in, 2) + " in measured against " + fmt(expected_measured_in, 2) + " in expected, " + fmt(elongation_difference_pct, 1) + "% -- inside the " + fmt(tolerance_pct, 1) + "% tolerance"
      : "INVESTIGATE, DO NOT GROUT: " + fmt(measured_elongation_in, 2) + " in measured against " + fmt(expected_measured_in, 2) + " in expected, " + fmt(elongation_difference_pct, 1) + "% -- outside the " + fmt(tolerance_pct, 1) + "% tolerance. "
        + (elongation_difference_pct < 0 ? "Short means the force is not getting there: a binding or crushed duct, or a strand not gripped" : "Long means the strand is stretching more than it should: a wrong area, a wrong modulus, or slip") + ". After grouting nothing can be corrected";
  return {
    strand_area_in2, modulus_psi, tendon_length_ft, jacking_stress_ksi, jacking_force_lb,
    curvature_friction, angular_change_rad, wobble_per_ft, decay_exponent, far_end_ratio,
    far_end_force_lb, average_ratio, average_force_lb, theoretical_elongation_in,
    no_friction_elongation_in, friction_overstatement_in, anchor_set_in, expected_measured_in,
    measured_elongation_in, elongation_difference_in, elongation_difference_pct,
    tolerance_pct, within_tolerance, verdict,
    note: "Elongation is a measurement of a tendon's whole length responding to the force actually in it, which is why it catches what a pressure gauge cannot. A gauge reads what the jack is pushing; it says nothing about whether that force reached the far end. A tendon binding in a crushed duct, or one strand of a bundle not gripped, shows up as elongation short of theoretical while the gauge reads exactly the specified pressure -- and the gauge is the instrument people trust. THE FRICTION TERMS ARE WHAT MAKE THE THEORETICAL NUMBER NON-TRIVIAL. Force decays along the tendon with the total angular change of its profile and with unintended wobble, so a draped tendon in a long slab develops noticeably less force at its far end than at the jack. The elongation follows the AVERAGE force along the length, not the jacking force, and the average of an exponential decay is its integral -- one minus the decay ratio, over the exponent. Using the jacking force directly overstates the expected elongation, and on a seven percent tolerance that overstatement is most of the allowance: it makes a perfectly good tendon look like a failing one, and the crew chases a problem that is in the arithmetic. THE TOLERANCE IS TWO-SIDED and both sides mean something. Elongation short means the force is not getting there -- a crushed or blocked duct, or a strand the wedges did not grip. Elongation long means the strand is stretching more than it should, which can mean a wrong strand area, a wrong modulus, or slip at the anchorage. Both require investigation before grouting, because after grouting nothing can be corrected and the tendon is permanent. Anchor set, the seating loss when the wedges bite, is subtracted from the theoretical stretch to give the number the crew should actually measure at the tail. Theoretical elongation from properties the reader supplies. The friction and wobble coefficients belong to the specific duct and tendon system and come from the post-tensioning supplier, not from a general table; the strand area and modulus come from the mill certificate for the reel actually installed, and using catalogue values where a certificate exists is one of the ways a tendon appears out of tolerance. This treats the tendon as one prismatic member at a single average force, which is the standard field method and not a stressing analysis: it does not compute the force profile along the length, elastic shortening, relaxation, creep and shrinkage losses, the sequence effects of stressing multiple tendons, or anything about grouting, duct filling, or corrosion protection. It does not evaluate the structure. The post-tensioning supplier's stressing calculations and elongation tables, ACI 318 and the PTI manuals, the mill certificates, and the engineer of record govern.",
  };
}
const postTensionElongationExample = { inputs: { strand_area_in2: 0.153, modulus_psi: 28000000, tendon_length_ft: 120, jacking_stress_ksi: 202.5, curvature_friction: 0.2, angular_change_rad: 0.3, wobble_per_ft: 0.0002, anchor_set_in: 0.25, measured_elongation_in: 8.35, tolerance_pct: 7 } };
CONCRETEPLACEMENT_RENDERERS["post-tension-elongation"] = _simpleRenderer({
  citation: "Citation: the post-tensioning elongation relation by name -- theoretical elongation = average force x length / (area x modulus), with the force decaying along the tendon as exp(-(mu x alpha + K x)) for curvature friction mu over a total angular change alpha and wobble K, and the average taken as the integral (1 - decay ratio) / exponent -- less the anchor set, checked against the measured value at an entered tolerance (about 7% is the usual acceptance). Friction and wobble coefficients belong to the specific duct and tendon system and come from the post-tensioning supplier; strand area and modulus come from the mill certificate for the reel installed. The supplier's stressing calculations and elongation tables, ACI 318 and the PTI manuals, and the engineer of record govern.",
  example: postTensionElongationExample.inputs,
  fields: [
    { key: "strand_area_in2", label: "Strand area (sq in)", kind: "number", default: 0.153 },
    { key: "modulus_psi", label: "Modulus of elasticity (psi)", kind: "number", default: 28000000 },
    { key: "tendon_length_ft", label: "Tendon length (ft)", kind: "number", default: 120 },
    { key: "jacking_stress_ksi", label: "Jacking stress (ksi)", kind: "number", default: 202.5 },
    { key: "curvature_friction", label: "Curvature friction coefficient mu", kind: "number", default: 0.2 },
    { key: "angular_change_rad", label: "Total angular change (radians)", kind: "number", default: 0.3 },
    { key: "wobble_per_ft", label: "Wobble coefficient K (per ft)", kind: "number", default: 0.0002 },
    { key: "anchor_set_in", label: "Anchor set (in)", kind: "number", default: 0.25 },
    { key: "measured_elongation_in", label: "Measured elongation (in, 0 to skip)", kind: "number", default: 8.35 },
    { key: "tolerance_pct", label: "Acceptance tolerance (%)", kind: "number", default: 7 },
  ],
  outputs: [
    { key: "j", id: "pte-out-j", label: "Jacking force", value: (r) => fmt(r.jacking_force_lb, 0) + " lb at " + fmt(r.jacking_stress_ksi, 1) + " ksi" },
    { key: "f", id: "pte-out-f", label: "Force along the tendon", value: (r) => fmt(r.far_end_force_lb, 0) + " lb at the far anchorage (" + fmt(r.far_end_ratio * 100, 1) + "% of jacking), averaging " + fmt(r.average_force_lb, 0) + " lb (" + fmt(r.average_ratio * 100, 1) + "%)" },
    { key: "t", id: "pte-out-t", label: "Theoretical elongation", value: (r) => fmt(r.theoretical_elongation_in, 2) + " in" },
    { key: "e", id: "pte-out-e", label: "Expected at the tail", value: (r) => fmt(r.expected_measured_in, 2) + " in, after " + fmt(r.anchor_set_in, 3) + " in of anchor set" },
    { key: "o", id: "pte-out-o", label: "What ignoring friction would cost", value: (r) => "the jacking force alone gives " + fmt(r.no_friction_elongation_in, 2) + " in, overstating by " + fmt(r.friction_overstatement_in, 2) + " in -- " + fmt(r.expected_measured_in > 0 ? 100 * r.friction_overstatement_in / r.expected_measured_in : 0, 1) + "% against a " + fmt(r.tolerance_pct, 0) + "% allowance, and it makes a good tendon look short" },
    { key: "v", id: "pte-out-v", label: "Against the measurement", value: (r) => r.verdict },
    { key: "n", id: "pte-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePostTensionElongation,
});

// ============ spec-v1620: tilt-up panel lifting stress ============

// dims: in { panel_width_ft: L, panel_height_ft: L, thickness_in: L, unit_weight_pcf: M L^-3, lift_day_strength_psi: M L^-1 T^-2, insert_rows: dimensionless, insert_columns: dimensionless, suction_fraction: dimensionless, safety_factor: dimensionless } out: { panel_weight_lb: M L T^-2, load_per_insert_lb: M L T^-2, span_between_rows_ft: L, bending_stress_psi: M L^-1 T^-2, modulus_of_rupture_psi: M L^-1 T^-2, allowable_stress_psi: M L^-1 T^-2, rows_required: dimensionless }
export function computeTiltUpLiftStress({ panel_width_ft = 0, panel_height_ft = 0, thickness_in = 0, unit_weight_pcf = 150, lift_day_strength_psi = 0, insert_rows = 2, insert_columns = 2, suction_fraction = 0, safety_factor = 1.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(panel_width_ft > 0)) return { error: "Panel width must be positive (ft)." };
  if (!(panel_height_ft > 0)) return { error: "Panel height must be positive (ft)." };
  if (!(thickness_in > 0)) return { error: "Panel thickness must be positive (in)." };
  if (!(unit_weight_pcf > 0)) return { error: "Concrete unit weight must be positive (pcf)." };
  if (!(lift_day_strength_psi > 0)) return { error: "Day-of-lift compressive strength must be positive (psi) -- from cylinder breaks on the day, not the mix design." };
  if (!(insert_rows >= 2)) return { error: "There must be at least two rows of inserts to span between." };
  if (!(insert_columns >= 1)) return { error: "There must be at least one column of inserts." };
  if (suction_fraction < 0) return { error: "The suction allowance cannot be negative." };
  if (!(safety_factor >= 1)) return { error: "The safety factor cannot be below one." };
  const thickness_ft = thickness_in / _IN_PER_FT_CONC;
  const panel_area_ft2 = panel_width_ft * panel_height_ft;
  const panel_weight_lb = panel_area_ft2 * thickness_ft * unit_weight_pcf;
  const suction_lb = panel_weight_lb * suction_fraction;
  const lift_load_lb = panel_weight_lb + suction_lb;
  const insert_count = insert_rows * insert_columns;
  const load_per_insert_lb = lift_load_lb / insert_count;
  // The panel spans between insert rows during the pick, carrying its own
  // weight sideways. For TWO rows a simple span of H / 2 runs about 15% above
  // Dayton Superior's printed R22 stresses (conservative). Beyond two rows the
  // rigging does not equalize to H / n spans: Dayton's R42 tables print 0.595 of
  // the R22 stress where H / n predicts 0.25, so the two-row stress is scaled by
  // (2 / n)^0.75. Until 2026-10-01 a 4 in x 37 ft panel on 4 rows read 201 psi
  // WITHIN CAPACITY where Dayton prints 418 psi, over every allowable it lists.
  const ROW_EXPONENT = 0.75;
  const span_between_rows_ft = panel_height_ft / 2;
  const load_per_area_psf = lift_load_lb / panel_area_ft2;
  // A one-foot-wide strip spanning between rows, treated as simply supported.
  const moment_lb_in_per_ft = load_per_area_psf * span_between_rows_ft * span_between_rows_ft / 8 * _IN_PER_FT_CONC;
  const section_modulus_in3_per_ft = _IN_PER_FT_CONC * thickness_in * thickness_in / 6;
  const two_row_stress_psi = moment_lb_in_per_ft / section_modulus_in3_per_ft;
  const bending_stress_psi = two_row_stress_psi * Math.pow(2 / insert_rows, ROW_EXPONENT);
  const modulus_of_rupture_psi = _MODULUS_OF_RUPTURE_COEFF * Math.sqrt(lift_day_strength_psi);
  const allowable_stress_psi = modulus_of_rupture_psi / safety_factor;
  const stress_margin_psi = allowable_stress_psi - bending_stress_psi;
  const within_capacity = bending_stress_psi <= allowable_stress_psi;
  const utilization_pct = bending_stress_psi / allowable_stress_psi * 100;
  // Rows needed to bring the stress inside capacity, on the same (2 / n)^0.75 fall.
  const rows_required = Math.max(2, Math.ceil(2 * Math.pow(two_row_stress_psi / allowable_stress_psi, 1 / ROW_EXPONENT) - 1e-9));
  const outs = [panel_weight_lb, load_per_insert_lb, span_between_rows_ft, bending_stress_psi, modulus_of_rupture_psi, allowable_stress_psi];
  if (!outs.every(Number.isFinite)) return { error: "Tilt-up lifting math is not a finite value." };
  const verdict = within_capacity
    ? "WITHIN CAPACITY: " + fmt(bending_stress_psi, 0) + " psi against an allowable " + fmt(allowable_stress_psi, 0) + " psi, " + fmt(utilization_pct, 0) + "% used, on " + fmt(insert_rows, 0) + " rows"
    : "OVER CAPACITY: " + fmt(bending_stress_psi, 0) + " psi against an allowable " + fmt(allowable_stress_psi, 0) + " psi. " + (rows_required <= 4 ? "Go to " + fmt(rows_required, 0) + " rows" : "More rows will not fix this -- beyond four rows the rigging is the manufacturer's design, so thicken the panel") + ", or wait for strength -- the day-of-lift break is what authorizes the pick";
  return {
    panel_width_ft, panel_height_ft, thickness_in, unit_weight_pcf, panel_area_ft2,
    panel_weight_lb, suction_fraction, suction_lb, lift_load_lb, insert_rows,
    insert_columns, insert_count, load_per_insert_lb, span_between_rows_ft,
    load_per_area_psf, moment_lb_in_per_ft, section_modulus_in3_per_ft,
    bending_stress_psi, lift_day_strength_psi, modulus_of_rupture_psi,
    safety_factor, allowable_stress_psi, stress_margin_psi, within_capacity,
    utilization_pct, rows_required, verdict,
    note: "A tilt-up panel is a slab spanning between its insert rows during the pick, being asked to carry its own weight at right angles to how it will eventually work. BUT MORE ROWS BUY LESS THAN THE SPAN SUGGESTS. A simple span between rows would cut the moment to a quarter going from two rows to four; real rigging does not equalize that well, and Dayton Superior's printed tables show four rows carrying about 60% of the two-row stress, so this scales the two-row stress by (2 / n)^0.75 and stays about 15% above Dayton's figures. Beyond four rows the rigging is the manufacturer's design. THE STRENGTH THAT MATTERS IS THE STRENGTH ON THE DAY OF LIFT, and that is the trap in this arithmetic. A mix that reaches 4,000 psi at 28 days may be at 2,200 psi on day five when the schedule wants the panel up, and the modulus of rupture scales with the square root of compressive strength -- so the panel's capacity on lift day is around three quarters of what a 28 day calculation suggests. Cylinder breaks on the day, not the mix design, are what authorize a pick, and a calculation run on 28 day strength is not a lift plan. SUCTION IS THE OTHER FORCE AND IT IS NOT SMALL. A panel cast on a slab bonds to it, and breaking that bond adds a force -- Dayton estimates negligible to 20 psf of panel area, about a fifth of a 7 in panel's weight. Bond breaker application is what controls it, and a panel that has not released cleanly is putting far more than its own weight into the inserts and into the crane at the moment of release -- so the suction allowance here multiplies the weight rather than being a rounding term. A screening calculation on a rectangular solid panel with a uniform insert grid, treated as a simply supported one-way strip between rows. IT IS NOT A LIFT DESIGN AND IT DOES NOT SELECT INSERTS. Real panels have openings, reveals, returns, and non-uniform thickness that change the moment distribution completely, and a panel with a door and two windows does not behave like a rectangle. Insert capacity, edge distance, embedment, shear cone, and the reinforcement around each insert are the insert manufacturer's design; rigging geometry, spreader bars, equalizing, and the number of lift points that actually share the load are the rigging engineer's; and the crane's capacity at radius, the strongback if one is used, and the bracing that receives the panel are all separate. Tilt-up panels kill people during erection. The insert manufacturer's engineering, ACI 551 and the TCA guidance, the specialty engineer who stamps the lift and bracing design, and the day's cylinder breaks govern.",
  };
}
const tiltUpLiftStressExample = { inputs: { panel_width_ft: 8, panel_height_ft: 24, thickness_in: 7.25, unit_weight_pcf: 150, lift_day_strength_psi: 2200, insert_rows: 2, insert_columns: 2, suction_fraction: 0, safety_factor: 1.5 } };
CONCRETEPLACEMENT_RENDERERS["tilt-up-lift-stress"] = _simpleRenderer({
  citation: "Citation: the tilt-up lifting stress relations by name -- panel weight = area x thickness x unit weight; the two-row stress is a simple span of H / 2 as a one-way strip, and n rows scale it by (2 / n)^0.75, fitted to Dayton Superior's printed R22 and R42 stress tables (02/17); section modulus = b t squared / 6; and the ACI 318 modulus of rupture f_r = 7.5 sqrt(f'c) taken at the DAY-OF-LIFT strength from the day's cylinder breaks, divided by an entered safety factor. Suction from the casting slab is an entered fraction of the panel weight. A screening calculation on a solid rectangular panel: it does not select inserts, size rigging, or handle openings. The insert manufacturer's engineering, ACI 551 and TCA guidance, the specialty engineer who stamps the lift and bracing design, and the day's cylinder breaks govern.",
  example: tiltUpLiftStressExample.inputs,
  fields: [
    { key: "panel_width_ft", label: "Panel width (ft)", kind: "number", default: 8 },
    { key: "panel_height_ft", label: "Panel height (ft)", kind: "number", default: 24 },
    { key: "thickness_in", label: "Panel thickness (in)", kind: "number", default: 7.25 },
    { key: "unit_weight_pcf", label: "Concrete unit weight (pcf)", kind: "number", default: 150 },
    { key: "lift_day_strength_psi", label: "Day-of-lift compressive strength (psi)", kind: "number", default: 2200 },
    { key: "insert_rows", label: "Insert rows (across the height)", kind: "number", default: 2 },
    { key: "insert_columns", label: "Insert columns (across the width)", kind: "number", default: 2 },
    { key: "suction_fraction", label: "Suction allowance, as a fraction of panel weight", kind: "number", default: 0 },
    { key: "safety_factor", label: "Safety factor on the modulus of rupture", kind: "number", default: 1.5 },
  ],
  outputs: [
    { key: "w", id: "tls-out-w", label: "Panel weight", value: (r) => fmt(r.panel_weight_lb, 0) + " lb (" + fmt(r.panel_weight_lb / 2000, 2) + " tons)" + (r.suction_fraction > 0 ? ", and " + fmt(r.lift_load_lb, 0) + " lb with the " + fmt(r.suction_fraction * 100, 0) + "% suction allowance" : "") },
    { key: "i", id: "tls-out-i", label: "Load per insert", value: (r) => fmt(r.load_per_insert_lb, 0) + " lb across " + fmt(r.insert_count, 0) + " inserts (" + fmt(r.insert_rows, 0) + " rows x " + fmt(r.insert_columns, 0) + " columns)" },
    { key: "s", id: "tls-out-s", label: "Bending stress", value: (r) => fmt(r.bending_stress_psi, 0) + " psi over a " + fmt(r.span_between_rows_ft, 1) + " ft span between rows" },
    { key: "r", id: "tls-out-r", label: "Modulus of rupture on lift day", value: (r) => fmt(r.modulus_of_rupture_psi, 0) + " psi at " + fmt(r.lift_day_strength_psi, 0) + " psi -- allowable " + fmt(r.allowable_stress_psi, 0) + " psi after the " + fmt(r.safety_factor, 2) + " factor" },
    { key: "v", id: "tls-out-v", label: "Against capacity", value: (r) => r.verdict },
    { key: "n", id: "tls-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTiltUpLiftStress,
});

// ============ spec-v1621: tilt-up temporary brace load ============

// dims: in { panel_width_ft: L, panel_height_ft: L, wind_pressure_psf: M L^-1 T^-2, resultant_height_ft: L, brace_attachment_height_ft: L, brace_angle_deg: dimensionless, brace_count: dimensionless, brace_capacity_lb: M L T^-2, alternate_angle_deg: dimensionless, brace_safety_factor: dimensionless } out: { design_axial_per_brace_lb: M L T^-2, wind_force_lb: M L T^-2, lateral_per_brace_lb: M L T^-2, axial_per_brace_lb: M L T^-2, anchor_horizontal_lb: M L T^-2, braces_required: dimensionless, alternate_axial_lb: M L T^-2 }
export function computeTiltUpBraceLoad({ panel_width_ft = 0, panel_height_ft = 0, wind_pressure_psf = 0, resultant_height_ft = 0, brace_attachment_height_ft = 0, brace_angle_deg = 55, brace_count = 2, brace_capacity_lb = 0, alternate_angle_deg = 45, brace_safety_factor = 1.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(panel_width_ft > 0)) return { error: "Panel width must be positive (ft)." };
  if (!(panel_height_ft > 0)) return { error: "Panel height must be positive (ft)." };
  if (!(wind_pressure_psf > 0)) return { error: "The erection design wind pressure must be positive (psf)." };
  if (!(brace_attachment_height_ft > 0)) return { error: "The brace attachment height must be positive (ft)." };
  if (!(brace_angle_deg > 0 && brace_angle_deg < 90)) return { error: "The brace angle must be between 0 and 90 degrees from horizontal." };
  if (!(alternate_angle_deg > 0 && alternate_angle_deg < 90)) return { error: "The comparison angle must be between 0 and 90 degrees from horizontal." };
  if (!(brace_count >= 1)) return { error: "There must be at least one brace." };
  if (brace_capacity_lb < 0) return { error: "Brace capacity cannot be negative (lb)." };
  if (!(brace_safety_factor >= 1)) return { error: "The brace safety factor cannot be below one." };
  const DEG_TO_RAD = Math.PI / 180;
  const panel_area_ft2 = panel_width_ft * panel_height_ft;
  const wind_force_lb = panel_area_ft2 * wind_pressure_psf;
  // The resultant defaults to mid-height on a uniform pressure.
  const resultant_ft = resultant_height_ft > 0 ? resultant_height_ft : panel_height_ft / 2;
  if (!(resultant_ft > 0)) return { error: "The height to the wind resultant must be positive (ft)." };
  // Moment about the panel base: the braces at their attachment height carry
  // the wind resultant at its height, so the lateral load scales by the ratio.
  const total_lateral_lb = wind_force_lb * resultant_ft / brace_attachment_height_ft;
  const lateral_per_brace_lb = total_lateral_lb / brace_count;
  const axial_per_brace_lb = lateral_per_brace_lb / Math.cos(brace_angle_deg * DEG_TO_RAD);
  const anchor_horizontal_lb = lateral_per_brace_lb;
  const anchor_vertical_lb = axial_per_brace_lb * Math.sin(brace_angle_deg * DEG_TO_RAD);
  const anchor_offset_ft = brace_attachment_height_ft / Math.tan(brace_angle_deg * DEG_TO_RAD);
  const alternate_axial_lb = lateral_per_brace_lb / Math.cos(alternate_angle_deg * DEG_TO_RAD);
  const alternate_offset_ft = brace_attachment_height_ft / Math.tan(alternate_angle_deg * DEG_TO_RAD);
  // The TCA / Kelly (Concrete International, 2007) brace force carries a factor
  // of 1.5 -- its 30 ft, 12.5 psf example prints 422 lb/ft where the bare statics
  // give 281 -- and the brace makers publish ULTIMATE (buckling) loads. Until
  // 2026-10-01 the unfactored load was checked against the rating, no margin.
  const design_axial_per_brace_lb = axial_per_brace_lb * brace_safety_factor;
  const braces_required = brace_capacity_lb > 0
    ? Math.max(1, Math.ceil(total_lateral_lb * brace_safety_factor / Math.cos(brace_angle_deg * DEG_TO_RAD) / brace_capacity_lb - 1e-9))
    : null;
  const within_capacity = brace_capacity_lb > 0 ? design_axial_per_brace_lb <= brace_capacity_lb : null;
  const outs = [wind_force_lb, lateral_per_brace_lb, axial_per_brace_lb, anchor_vertical_lb, anchor_offset_ft, alternate_axial_lb];
  if (!outs.every(Number.isFinite)) return { error: "Brace load math is not a finite value." };
  const verdict = within_capacity === null
    ? "Enter a brace capacity to check the count."
    : within_capacity
      ? "WITHIN CAPACITY: " + fmt(design_axial_per_brace_lb, 0) + " lb per brace at a " + fmt(brace_safety_factor, 2) + " safety factor (" + fmt(axial_per_brace_lb, 0) + " lb unfactored) against " + fmt(brace_capacity_lb, 0) + " lb ultimate, on " + fmt(brace_count, 0) + " braces"
      : "OVER CAPACITY: " + fmt(design_axial_per_brace_lb, 0) + " lb per brace at a " + fmt(brace_safety_factor, 2) + " safety factor (" + fmt(axial_per_brace_lb, 0) + " lb unfactored) against " + fmt(brace_capacity_lb, 0) + " lb ultimate. " + fmt(braces_required, 0) + " braces are needed at this angle";
  return {
    design_axial_per_brace_lb, brace_safety_factor,
    panel_width_ft, panel_height_ft, panel_area_ft2, wind_pressure_psf, wind_force_lb,
    resultant_height_ft: resultant_ft, brace_attachment_height_ft, brace_angle_deg,
    brace_count, total_lateral_lb, lateral_per_brace_lb, axial_per_brace_lb,
    anchor_horizontal_lb, anchor_vertical_lb, anchor_offset_ft,
    alternate_angle_deg, alternate_axial_lb, alternate_offset_ft,
    brace_capacity_lb, braces_required, within_capacity, verdict,
    note: "The temporary condition is genuinely the design case for a tilt-up building. A panel standing free is a large sail on a small base and only the braces hold it, so brace design uses a wind pressure appropriate to the erection period together with a defined shutdown wind speed above which panels are not set and, in some cases, additional bracing is added to panels already standing. The lateral load is not simply the wind force divided by the braces: the wind resultant acts at its own height and the braces attach at theirs, so the load scales by the ratio of the two, and a brace attached high on a panel carries less than one attached low. THE BRACE ANGLE TRADES TWO THINGS AND NEITHER IS UNIVERSALLY RIGHT. A steeper brace takes more axial load for the same lateral force but needs less floor area; a flatter one carries less axial load and pushes its anchor further out, where the slab may be thinner, greener, or absent. Both the axial load and the anchor offset are reported at the entered angle and at a comparison angle, because the constraint is almost always the site rather than the arithmetic. THE ELEMENT THAT GOVERNS MOST OFTEN IS NOT THE BRACE. It is the floor slab anchor, the deadman, because the slab has to have the thickness, the strength on the day, and the edge distance to develop the anchor -- and a brace anchored into slab that is too green or too thin fails at the anchor with the brace entirely intact. The horizontal and vertical components at the anchor are reported for that reason: the vertical component is the one that pulls an anchor out of a thin slab, and it is the larger of the two on a steep brace. Slab age and thickness at the anchor location deserve the same attention as the brace itself. Braces come off only when the permanent lateral system is complete, and removing them early is a recognized collapse mechanism. A screening calculation on a rectangular panel under a uniform pressure with equal braces sharing the load equally. It does not design the brace, which is a manufacturer's rated component with its own slenderness and connection limits; it does not design the anchor, which needs the slab's actual thickness, strength on the day, edge distance and the anchor manufacturer's data; and it does not set the erection design wind pressure or the shutdown wind speed, which come from the bracing design and the applicable standard. It does not address knee braces, panel-to-panel bracing, corner conditions, or the sequence in which panels are set and released. Tilt-up panels kill people during erection. The specialty engineer who stamps the bracing design, the brace manufacturer, ACI 551 and the TCA guidance, and the site's competent person govern.",
  };
}
const tiltUpBraceLoadExample = { inputs: { panel_width_ft: 24, panel_height_ft: 24, wind_pressure_psf: 12, resultant_height_ft: 12, brace_attachment_height_ft: 16, brace_angle_deg: 55, brace_count: 3, brace_capacity_lb: 4000, alternate_angle_deg: 45, brace_safety_factor: 1.5 } };
CONCRETEPLACEMENT_RENDERERS["tilt-up-brace-load"] = _simpleRenderer({
  citation: "Citation: the temporary bracing relations by name -- wind force = panel area x the erection design wind pressure; the lateral load at the braces = wind force x (height to the resultant / brace attachment height), divided among the braces; axial brace load = lateral / cos(angle from horizontal), with the anchor components as the horizontal and the axial x sin(angle). The erection design wind pressure and the shutdown wind speed come from the bracing design, not from here. It does not design the brace or the slab anchor. The specialty engineer who stamps the bracing design, the brace manufacturer, ACI 551 and TCA guidance, and the site's competent person govern.",
  example: tiltUpBraceLoadExample.inputs,
  fields: [
    { key: "panel_width_ft", label: "Panel width (ft)", kind: "number", default: 24 },
    { key: "panel_height_ft", label: "Panel height (ft)", kind: "number", default: 24 },
    { key: "wind_pressure_psf", label: "Erection design wind pressure (psf)", kind: "number", default: 12 },
    { key: "resultant_height_ft", label: "Height to the wind resultant (ft, 0 for mid-height)", kind: "number", default: 12 },
    { key: "brace_attachment_height_ft", label: "Brace attachment height on the panel (ft)", kind: "number", default: 16 },
    { key: "brace_angle_deg", label: "Brace angle from horizontal (deg)", kind: "number", default: 55 },
    { key: "brace_count", label: "Braces on this panel", kind: "number", default: 3 },
    { key: "brace_capacity_lb", label: "Brace ultimate (buckling) load at this length (lb, 0 to skip)", kind: "number", default: 4000 },
    { key: "brace_safety_factor", label: "Safety factor on the brace (TCA: 1.5)", kind: "number", default: 1.5 },
    { key: "alternate_angle_deg", label: "Comparison brace angle (deg)", kind: "number", default: 45 },
  ],
  outputs: [
    { key: "w", id: "tbl-out-w", label: "Wind force on the panel", value: (r) => fmt(r.wind_force_lb, 0) + " lb over " + fmt(r.panel_area_ft2, 0) + " sq ft at " + fmt(r.wind_pressure_psf, 1) + " psf" },
    { key: "l", id: "tbl-out-l", label: "Lateral load per brace", value: (r) => fmt(r.lateral_per_brace_lb, 0) + " lb -- the wind resultant at " + fmt(r.resultant_height_ft, 1) + " ft carried by braces at " + fmt(r.brace_attachment_height_ft, 1) + " ft, across " + fmt(r.brace_count, 0) + " braces" },
    { key: "a", id: "tbl-out-a", label: "Axial load per brace", value: (r) => fmt(r.axial_per_brace_lb, 0) + " lb at " + fmt(r.brace_angle_deg, 0) + " degrees, with the anchor " + fmt(r.anchor_offset_ft, 1) + " ft out from the panel" },
    { key: "c", id: "tbl-out-c", label: "At the comparison angle", value: (r) => fmt(r.alternate_axial_lb, 0) + " lb at " + fmt(r.alternate_angle_deg, 0) + " degrees, anchor " + fmt(r.alternate_offset_ft, 1) + " ft out -- flatter carries less and reaches further into the slab" },
    { key: "k", id: "tbl-out-k", label: "At the slab anchor", value: (r) => fmt(r.anchor_horizontal_lb, 0) + " lb horizontal and " + fmt(r.anchor_vertical_lb, 0) + " lb vertical. The vertical component is what pulls an anchor out of a thin or green slab" },
    { key: "v", id: "tbl-out-v", label: "Against the brace rating", value: (r) => r.verdict },
    { key: "n", id: "tbl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTiltUpBraceLoad,
});
