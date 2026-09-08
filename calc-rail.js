// calc-rail.js -- Group E (cont.): railroad track and equipment bench.
//
// specs/scope-trade-expansion-2.md probed the live catalog for the
// vocabulary of thirty US trades and found railroad track work returned
// zero. A track inspector, a surfacing gang, and a signal-and-track
// engineer all work from fixed, checkable arithmetic -- curve elevation,
// degree of curve, restrained rail thermal force, wear limits, warp,
// ballast section, frog geometry -- and none of it was here.
//
// Tiles (all group "E", the existing Carpentry and Construction category;
// a module is independent of the group letter per the v28/v70..v103 split
// precedent):
//   v1539 track-superelevation        v1543 track-warp-fra-class
//   v1540 degree-of-curve             v1544 ballast-section-volume
//   v1541 cwr-neutral-temperature     v1545 turnout-frog-lead
//   v1542 rail-wear-condemning-limit
//
// Every tile is GOVERNANCE.general: the FRA Track Safety Standards at
// 49 CFR 213, the railroad's own engineering instructions and standard
// plans, and the track owner govern. See spec-v1539.md through
// spec-v1545.md.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied
// verbatim from the sibling calc-* modules; non-exported, no corpus row).
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
// calc-disinfect.js / calc-finish.js _simpleRenderer).
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

export const RAIL_RENDERERS = {};

// The equilibrium-elevation coefficient for degrees of curve, miles per
// hour, and inches, and the arc-definition degree constant 18,000 / pi
// (a one degree arc-definition curve turns one degree in 100 ft).
const _E_EQ_COEFF = 0.0007;
const _DEG_ARC_CONST = 18000 / Math.PI;
const _DEG = 180 / Math.PI;
const _RAD = Math.PI / 180;

// ===================== spec-v1539: curve superelevation and unbalance =====================

// dims: in { degree_of_curve: dimensionless, speed_mph: L T^-1, actual_elevation_in: L, allowable_unbalance_in: L, max_elevation_in: L, target_speed_mph: L T^-1 } out: { equilibrium_in: L, unbalance_in: L, max_speed_mph: L T^-1, equilibrium_at_target_in: L, required_elevation_in: L }
export function computeTrackSuperelevation({ degree_of_curve = 0, speed_mph = 0, actual_elevation_in = 0, allowable_unbalance_in = 3, max_elevation_in = 6, target_speed_mph = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(degree_of_curve > 0)) return { error: "Degree of curve must be positive." };
  if (!(speed_mph > 0)) return { error: "Operating speed must be positive." };
  if (!(actual_elevation_in >= 0)) return { error: "Actual superelevation cannot be negative." };
  if (!(allowable_unbalance_in >= 0)) return { error: "Allowable unbalance cannot be negative." };
  if (!(max_elevation_in > 0)) return { error: "Maximum permitted elevation must be positive." };
  if (!(target_speed_mph > 0)) return { error: "Target speed must be positive." };
  const k = _E_EQ_COEFF * degree_of_curve;
  const equilibrium_in = k * speed_mph * speed_mph;
  const unbalance_in = equilibrium_in - actual_elevation_in;
  const max_speed_mph = Math.sqrt((actual_elevation_in + allowable_unbalance_in) / k);
  const equilibrium_at_target_in = k * target_speed_mph * target_speed_mph;
  const required_elevation_in = Math.max(0, equilibrium_at_target_in - allowable_unbalance_in);
  const condition = unbalance_in > 1e-9 ? "underbalanced (leaning to the high rail)"
    : unbalance_in < -1e-9 ? "overbalanced (leaning to the low rail)" : "at equilibrium";
  const over_elevation = actual_elevation_in > max_elevation_in;
  const over_unbalance = unbalance_in > allowable_unbalance_in;
  const required_over_cap = required_elevation_in > max_elevation_in;
  return {
    equilibrium_in, unbalance_in, max_speed_mph, equilibrium_at_target_in, required_elevation_in,
    condition, over_elevation, over_unbalance, required_over_cap,
    flag: over_elevation ? "OVER the entered elevation cap"
      : over_unbalance ? "OVER the allowable unbalance at this speed"
        : "within both entered caps",
    note: "Equilibrium elevation is the bank at which nothing pushes sideways on either rail. Freight track is deliberately underelevated, because a curve elevated for the fastest train punishes the slowest one, so the operating rule is written on UNBALANCE rather than on elevation. Actual elevation is commonly capped near 6 in and unbalance near 3 in, with more only by specific approval for specific equipment. Elevation cannot be applied without adequate spiral transitions to run it in and out, which usually governs whether a given elevation is achievable at all. The FRA Track Safety Standards at 49 CFR 213, the railroad's engineering instructions and timetable special instructions, and the track owner govern.",
  };
}
const trackSuperelevationExample = { inputs: { degree_of_curve: 4, speed_mph: 50, actual_elevation_in: 4, allowable_unbalance_in: 3, max_elevation_in: 6, target_speed_mph: 57 } };
RAIL_RENDERERS["track-superelevation"] = _simpleRenderer({
  citation: "Citation: the classic equilibrium-elevation relation E = 0.0007 x D x V squared for degrees of curve, mph, and inches, with 49 CFR 213 (FRA Track Safety Standards) named for the elevation and unbalance limits. Elevation and unbalance caps are entered, not shipped. The railroad's engineering instructions and the track owner govern.",
  example: trackSuperelevationExample.inputs,
  fields: [
    { key: "degree_of_curve", label: "Degree of curve (deg)", kind: "number", default: 4 },
    { key: "speed_mph", label: "Operating speed (mph)", kind: "number", default: 50 },
    { key: "actual_elevation_in", label: "Actual superelevation (in)", kind: "number", default: 4 },
    { key: "allowable_unbalance_in", label: "Allowable unbalance (in)", kind: "number", default: 3 },
    { key: "max_elevation_in", label: "Maximum permitted elevation (in)", kind: "number", default: 6 },
    { key: "target_speed_mph", label: "Target speed to elevate for (mph)", kind: "number", default: 57 },
  ],
  outputs: [
    { key: "e", id: "tse-out-e", label: "Equilibrium elevation at the operating speed", value: (r) => fmt(r.equilibrium_in, 2) + " in" },
    { key: "u", id: "tse-out-u", label: "Unbalance at the actual elevation", value: (r) => fmt(r.unbalance_in, 2) + " in (" + r.condition + ")" },
    { key: "v", id: "tse-out-v", label: "Maximum speed at the actual elevation", value: (r) => fmt(r.max_speed_mph, 1) + " mph" },
    { key: "t", id: "tse-out-t", label: "Elevation required for the target speed", value: (r) => fmt(r.required_elevation_in, 2) + " in (equilibrium " + fmt(r.equilibrium_at_target_in, 2) + " in)" },
    { key: "f", id: "tse-out-f", label: "Regulatory cap check", value: (r) => r.flag },
    { key: "n", id: "tse-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTrackSuperelevation,
});

// ===================== spec-v1540: degree of curve, radius, middle ordinate =====================

// dims: in { degree_of_curve: dimensionless, radius_ft: L, chord_length_ft: L, central_angle_deg: dimensionless, measured_ordinate_in: L } out: { radius_arc_ft: L, radius_chord_ft: L, radius_difference_ft: L, middle_ordinate_in: L, degree_from_radius_arc: dimensionless, degree_from_radius_chord: dimensionless, degree_from_ordinate: dimensionless, curve_length_ft: L }
export function computeDegreeOfCurve({ degree_of_curve = 0, radius_ft = 0, chord_length_ft = 62, central_angle_deg = 0, measured_ordinate_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(degree_of_curve > 0)) return { error: "Degree of curve must be positive." };
  if (!(radius_ft > 50)) return { error: "Radius for the reverse conversion must be greater than 50 ft (the chord definition has no solution below the half-chord)." };
  if (!(chord_length_ft > 0)) return { error: "Chord length must be positive." };
  if (!(central_angle_deg > 0)) return { error: "Total central angle must be positive." };
  if (!(measured_ordinate_in > 0)) return { error: "Measured middle ordinate must be positive." };
  const halfDeg = degree_of_curve / 2;
  if (!(halfDeg < 90)) return { error: "Degree of curve must be less than 180 degrees." };
  const radius_arc_ft = _DEG_ARC_CONST / degree_of_curve;
  const radius_chord_ft = 50 / Math.sin(halfDeg * _RAD);
  const radius_difference_ft = radius_chord_ft - radius_arc_ft;
  if (!(chord_length_ft < 2 * radius_chord_ft)) return { error: "Chord length must be less than twice the radius." };
  const theta = 2 * Math.asin(chord_length_ft / (2 * radius_chord_ft));
  const middle_ordinate_in = radius_chord_ft * (1 - Math.cos(theta / 2)) * 12;
  const degree_from_radius_arc = _DEG_ARC_CONST / radius_ft;
  const degree_from_radius_chord = 2 * Math.asin(50 / radius_ft) * _DEG;
  // Field check: the middle ordinate of a 62 ft chord, in inches, is very
  // nearly the degree of curve. Exact inverse for the entered ordinate.
  const m_ft = measured_ordinate_in / 12;
  const r_from_ord = (62 * 62) / (8 * m_ft) + m_ft / 2;
  const degree_from_ordinate = 2 * Math.asin(50 / r_from_ord) * _DEG;
  const curve_length_ft = 100 * central_angle_deg / degree_of_curve;
  return {
    radius_arc_ft, radius_chord_ft, radius_difference_ft, middle_ordinate_in,
    degree_from_radius_arc, degree_from_radius_chord, degree_from_ordinate, curve_length_ft,
    note: "A one degree curve turns one degree over a hundred feet, and the useful field consequence is the 62 ft chord rule: the middle ordinate of a 62 ft chord, measured in inches, is very nearly the degree of curve, which a track inspector can get with a string and a rule. The chord and arc definitions are not the same thing. The gap is under a foot of radius on flat curves and grows as they sharpen, so a radius handed between a railroad and a highway designer without stating which definition it uses can be wrong by enough to matter at a crossing or a clearance check. String-lining a curve to find where it needs to move takes a series of ordinates along the curve, not one. Spirals, compound and reverse curves, and vertical curves are separate. The FRA Track Safety Standards at 49 CFR 213 and the track owner govern.",
  };
}
const degreeOfCurveExample = { inputs: { degree_of_curve: 4, radius_ft: 1432.4, chord_length_ft: 62, central_angle_deg: 20, measured_ordinate_in: 4 } };
RAIL_RENDERERS["degree-of-curve"] = _simpleRenderer({
  citation: "Citation: the chord definition D = 2 arcsin(50 / R) and the arc definition R = 18,000 / pi / D, with the middle-ordinate relation M = R (1 - cos(theta / 2)) and the 62 ft chord field rule; 49 CFR 213 named for the alignment limits this does not evaluate. First-principles curve trigonometry. The railroad's engineering instructions and the track owner govern.",
  example: degreeOfCurveExample.inputs,
  fields: [
    { key: "degree_of_curve", label: "Degree of curve (deg)", kind: "number", default: 4 },
    { key: "radius_ft", label: "Radius to convert back to a degree (ft)", kind: "number", default: 1432.4 },
    { key: "chord_length_ft", label: "Chord length for the middle ordinate (ft)", kind: "number", default: 62 },
    { key: "central_angle_deg", label: "Total central angle (deg)", kind: "number", default: 20 },
    { key: "measured_ordinate_in", label: "Measured ordinate on a 62 ft chord (in)", kind: "number", default: 4 },
  ],
  outputs: [
    { key: "ra", id: "doc-out-ra", label: "Radius, arc definition", value: (r) => fmt(r.radius_arc_ft, 1) + " ft" },
    { key: "rc", id: "doc-out-rc", label: "Radius, chord definition", value: (r) => fmt(r.radius_chord_ft, 1) + " ft" },
    { key: "rd", id: "doc-out-rd", label: "Difference between the definitions", value: (r) => fmt(r.radius_difference_ft, 2) + " ft" },
    { key: "dr", id: "doc-out-dr", label: "Degree from the entered radius", value: (r) => fmt(r.degree_from_radius_chord, 3) + " deg chord (" + fmt(r.degree_from_radius_arc, 3) + " deg arc)" },
    { key: "mo", id: "doc-out-mo", label: "Middle ordinate for the entered chord", value: (r) => fmt(r.middle_ordinate_in, 2) + " in" },
    { key: "do", id: "doc-out-do", label: "Degree implied by the measured ordinate", value: (r) => fmt(r.degree_from_ordinate, 2) + " deg" },
    { key: "cl", id: "doc-out-cl", label: "Curve length for the central angle", value: (r) => fmt(r.curve_length_ft, 1) + " ft" },
    { key: "n", id: "doc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDegreeOfCurve,
});

// ===================== spec-v1541: CWR neutral temperature and thermal force =====================

// dims: in { rail_area_in2: L^2, modulus_psi: M L^-1 T^-2, alpha_per_degf: dimensionless, neutral_temp_f: T, air_temp_f: T, sun_adder_f: T } out: { force_per_degf_lb: M L T^-2, rail_temp_f: T, differential_f: T, force_per_rail_lb: M L T^-2, force_track_lb: M L T^-2 }
export function computeCwrThermalForce({ rail_area_in2 = 0, modulus_psi = 30000000, alpha_per_degf = 0.0000065, neutral_temp_f = 95, air_temp_f = 95, sun_adder_f = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rail_area_in2 > 0)) return { error: "Rail section area must be positive." };
  if (!(modulus_psi > 0)) return { error: "Modulus of elasticity must be positive." };
  if (!(alpha_per_degf > 0)) return { error: "Coefficient of thermal expansion must be positive." };
  if (!(sun_adder_f >= 0)) return { error: "Sun adder cannot be negative." };
  const force_per_degf_lb = rail_area_in2 * modulus_psi * alpha_per_degf;
  const rail_temp_f = air_temp_f + sun_adder_f;
  const differential_f = rail_temp_f - neutral_temp_f;
  const force_per_rail_lb = Math.abs(force_per_degf_lb * differential_f);
  const force_track_lb = 2 * force_per_rail_lb;
  const state = differential_f > 0 ? "compression (buckling is the risk)"
    : differential_f < 0 ? "tension (a pull-apart is the risk)" : "no thermal force";
  return {
    force_per_degf_lb, rail_temp_f, differential_f, force_per_rail_lb, force_track_lb, state,
    note: "The force does not depend on the length of the rail, only on its area, its modulus, and how far it is from neutral, which is why a mile of continuous welded rail and a hundred feet of it develop the same force per degree. Rail in direct sun runs roughly 20 to 30 degF hotter than the air, and it is rail temperature that matters. Above neutral the rail is in compression and the ballast section and the fastenings hold it laterally; when that resistance is reduced by freshly surfaced track, disturbed shoulders, or thin ballast, the track buckles, which is why hot-weather work that disturbs ballast carries slow orders. This assumes FULLY restrained rail, which is the design intent but is not true near rail ends, at joints, at bridge expansion arrangements, or where fastenings have degraded. It does not predict the buckling temperature, which needs a track buckling analysis. This is a derailment-hazard subject: 49 CFR 213 including the CWR plan requirements, the railroad's own CWR procedures, and the track owner govern.",
  };
}
const cwrThermalForceExample = { inputs: { rail_area_in2: 13.0, modulus_psi: 30000000, alpha_per_degf: 0.0000065, neutral_temp_f: 95, air_temp_f: 95, sun_adder_f: 25 } };
RAIL_RENDERERS["cwr-neutral-temperature"] = _simpleRenderer({
  citation: "Citation: the restrained thermal force relation F = A x E x alpha x (T - T neutral), with 49 CFR 213 named for the continuous welded rail plan requirements. Rail modulus and coefficient of expansion are entered. The railroad's own CWR procedures and the track owner govern.",
  example: cwrThermalForceExample.inputs,
  fields: [
    { key: "rail_area_in2", label: "Rail section area (sq in)", kind: "number", default: 13.0 },
    { key: "modulus_psi", label: "Modulus of elasticity (psi)", kind: "number", default: 30000000 },
    { key: "alpha_per_degf", label: "Coefficient of expansion (per degF)", kind: "number", default: 0.0000065 },
    { key: "neutral_temp_f", label: "Rail neutral temperature (degF)", kind: "number", default: 95, attrs: { step: "any" } },
    { key: "air_temp_f", label: "Air temperature (degF)", kind: "number", default: 95, attrs: { step: "any" } },
    { key: "sun_adder_f", label: "Sun adder, rail above air (degF)", kind: "number", default: 25 },
  ],
  outputs: [
    { key: "p", id: "cwr-out-p", label: "Force per degF per rail", value: (r) => fmt(r.force_per_degf_lb, 0) + " lb/degF" },
    { key: "t", id: "cwr-out-t", label: "Rail temperature", value: (r) => fmt(r.rail_temp_f, 1) + " degF" },
    { key: "d", id: "cwr-out-d", label: "Differential from neutral", value: (r) => fmt(r.differential_f, 1) + " degF" },
    { key: "f", id: "cwr-out-f", label: "Thermal force in one rail", value: (r) => fmt(r.force_per_rail_lb, 0) + " lb " + r.state },
    { key: "k", id: "cwr-out-k", label: "Thermal force in the track", value: (r) => fmt(r.force_track_lb, 0) + " lb" },
    { key: "n", id: "cwr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCwrThermalForce,
});

// ===================== spec-v1542: rail head wear and condemning limit =====================

// dims: in { new_head_height_in: L, new_head_width_in: L, new_head_area_in2: L^2, vertical_wear_in: L, gauge_face_wear_in: L, combined_limit_in: L, tonnage_mgt: dimensionless } out: { combined_wear_in: L, remaining_in: L, head_area_loss_pct: dimensionless, wear_rate_in_per_mgt: L, remaining_mgt: dimensionless }
export function computeRailWearLimit({ new_head_height_in = 0, new_head_width_in = 0, new_head_area_in2 = 0, vertical_wear_in = 0, gauge_face_wear_in = 0, combined_limit_in = 0, tonnage_mgt = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(new_head_height_in > 0)) return { error: "New-rail head height must be positive." };
  if (!(new_head_width_in > 0)) return { error: "New-rail head width must be positive." };
  if (!(new_head_area_in2 > 0)) return { error: "New-rail head area must be positive." };
  if (!(vertical_wear_in >= 0)) return { error: "Vertical wear cannot be negative." };
  if (!(gauge_face_wear_in >= 0)) return { error: "Gauge face wear cannot be negative." };
  if (vertical_wear_in >= new_head_height_in) return { error: "Vertical wear cannot reach or exceed the new head height." };
  if (gauge_face_wear_in >= new_head_width_in) return { error: "Gauge face wear cannot reach or exceed the new head width." };
  if (!(combined_limit_in > 0)) return { error: "Combined wear limit must be positive." };
  if (!(tonnage_mgt > 0)) return { error: "Tonnage since installation must be positive (MGT)." };
  const combined_wear_in = vertical_wear_in + gauge_face_wear_in / 2;
  const remaining_in = combined_limit_in - combined_wear_in;
  const condemned = combined_wear_in >= combined_limit_in;
  // Rectangular screen of the metal removed: the vertical loss across the
  // full head width, plus the gauge-face loss over what head height is left.
  const lost_area_in2 = vertical_wear_in * new_head_width_in + gauge_face_wear_in * (new_head_height_in - vertical_wear_in);
  const head_area_loss_pct = (lost_area_in2 / new_head_area_in2) * 100;
  const wear_rate_in_per_mgt = combined_wear_in / tonnage_mgt;
  const remaining_mgt = wear_rate_in_per_mgt > 0 ? Math.max(0, remaining_in) / wear_rate_in_per_mgt : Infinity;
  return {
    combined_wear_in, remaining_in, condemned, lost_area_in2, head_area_loss_pct,
    wear_rate_in_per_mgt,
    remaining_mgt: Number.isFinite(remaining_mgt) ? remaining_mgt : 0,
    unworn: !Number.isFinite(remaining_mgt),
    verdict: condemned ? "CONDEMN -- at or past the entered limit" : "keep -- inside the entered limit",
    note: "Vertical wear takes section and bending strength out of the rail. Gauge face wear is the more consequential one on a curve, because as the high rail's gauge face wears back the gauge widens and the wheel-to-rail contact moves toward the angle at which a flange can climb, which is why the combined criterion weights the two together. The measurement is against the NEW rail section, so the original weight and section have to be known, and wear rates differ enormously between the high and low rail of a curve and between curve and tangent. Limits are railroad-specific and the combined-wear formula itself differs between railroads. The area figure is a rectangular screen, not a section property. Most rail is actually removed for something other than wear: internal defects found by ultrasonic testing, shelling, spalling, head checks, squats, corrugation, engine burns, joint batter, bolt hole cracks, and defective welds. The FRA Track Safety Standards at 49 CFR 213, the railroad's engineering instructions, and the track owner govern.",
  };
}
const railWearExample = { inputs: { new_head_height_in: 1.5, new_head_width_in: 3.0, new_head_area_in2: 3.9, vertical_wear_in: 0.375, gauge_face_wear_in: 0.5, combined_limit_in: 0.75, tonnage_mgt: 180 } };
RAIL_RENDERERS["rail-wear-condemning-limit"] = _simpleRenderer({
  citation: "Citation: the vertical and gauge-face wear criteria and the common combined form, vertical + gauge face / 2, with 49 CFR 213 and the track owner's engineering instructions named as the source of the limits. Limits are entered, not shipped, because they are railroad-specific. The track owner governs.",
  example: railWearExample.inputs,
  fields: [
    { key: "new_head_height_in", label: "New-rail head height (in)", kind: "number", default: 1.5 },
    { key: "new_head_width_in", label: "New-rail head width (in)", kind: "number", default: 3.0 },
    { key: "new_head_area_in2", label: "New-rail head area (sq in)", kind: "number", default: 3.9 },
    { key: "vertical_wear_in", label: "Measured vertical wear (in)", kind: "number", default: 0.375 },
    { key: "gauge_face_wear_in", label: "Measured gauge face wear (in)", kind: "number", default: 0.5 },
    { key: "combined_limit_in", label: "Railroad combined wear limit (in)", kind: "number", default: 0.75 },
    { key: "tonnage_mgt", label: "Tonnage since installation (MGT)", kind: "number", default: 180 },
  ],
  outputs: [
    { key: "c", id: "rwl-out-c", label: "Combined wear, vertical + gauge face / 2", value: (r) => fmt(r.combined_wear_in, 3) + " in" },
    { key: "r", id: "rwl-out-r", label: "Remaining wear allowance", value: (r) => fmt(r.remaining_in, 3) + " in" },
    { key: "v", id: "rwl-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "a", id: "rwl-out-a", label: "Head area removed (rectangular screen)", value: (r) => fmt(r.head_area_loss_pct, 1) + "% (" + fmt(r.lost_area_in2, 3) + " sq in)" },
    { key: "w", id: "rwl-out-w", label: "Wear rate", value: (r) => fmt(r.wear_rate_in_per_mgt, 5) + " in per MGT" },
    { key: "m", id: "rwl-out-m", label: "Tonnage to the limit", value: (r) => fmt(r.remaining_mgt, 0) + " MGT" },
    { key: "n", id: "rwl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRailWearLimit,
});

// ===================== spec-v1543: cross-level, warp, and the class limit =====================

// dims: in { measured_a_in: L, designed_a_in: L, measured_b_in: L, designed_b_in: L, distance_ft: L, warp_limit_in: L } out: { deviation_a_in: L, deviation_b_in: L, warp_in: L, margin_in: L, warp_per_31ft_in: L, pct_of_limit: dimensionless }
export function computeTrackWarp({ measured_a_in = 0, designed_a_in = 0, measured_b_in = 0, designed_b_in = 0, distance_ft = 0, warp_limit_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(distance_ft > 0)) return { error: "Distance between the two points must be positive." };
  if (!(warp_limit_in > 0)) return { error: "Applicable warp limit must be positive." };
  const deviation_a_in = measured_a_in - designed_a_in;
  const deviation_b_in = measured_b_in - designed_b_in;
  const warp_in = deviation_a_in - deviation_b_in;
  const warp_magnitude_in = Math.abs(warp_in);
  const margin_in = warp_limit_in - warp_magnitude_in;
  const pass = warp_magnitude_in <= warp_limit_in;
  const warp_per_31ft_in = warp_magnitude_in * 31 / distance_ft;
  const pct_of_limit = (warp_magnitude_in / warp_limit_in) * 100;
  const against_zero_in = Math.abs(measured_a_in - measured_b_in);
  return {
    deviation_a_in, deviation_b_in, warp_in, warp_magnitude_in, margin_in, pass,
    warp_per_31ft_in, pct_of_limit, against_zero_in,
    verdict: pass ? "PASS -- inside the entered limit" : "FAIL -- over the entered limit",
    note: "Warp is a twist, and a twist unloads a wheel. A rigid truck bridging track that rises on one rail and falls on the other has one wheel carrying much less than its share, and a lightly loaded wheel on a curve with lateral force is the wheel that climbs. That is why warp limits tighten faster with class than most other parameters. The reference is the whole exercise: on a curve the track is SUPPOSED to have cross level, so warp is deviation from the DESIGNED elevation profile, not from level. Measured against zero on an elevated curve the elevation itself reads as a defect, and on a spiral the intended runoff reads as warp that is not there. The FRA limit tables are not shipped here; the limit for the class and the measurement length has to be entered from 49 CFR 213 as adopted. Gauge, alignment, and surface each have their own limits and any one of them can independently restrict speed, and special limits apply near a joint, on a bridge, and through a turnout. Track geometry defects are a derailment hazard: 49 CFR 213, the qualified track inspector, and the track owner govern.",
  };
}
const trackWarpExample = { inputs: { measured_a_in: 4.6, designed_a_in: 4.0, measured_b_in: 3.2, designed_b_in: 4.0, distance_ft: 62, warp_limit_in: 1.75 } };
RAIL_RENDERERS["track-warp-fra-class"] = _simpleRenderer({
  citation: "Citation: the cross-level and warp definitions -- warp is the change in cross-level deviation between two points a stated distance apart, referenced to the DESIGNED cross level -- with 49 CFR 213 named as the source of the limits by class of track. The limit tables are not reproduced; the applicable limit is entered. The qualified track inspector and the track owner govern.",
  example: trackWarpExample.inputs,
  fields: [
    { key: "measured_a_in", label: "Measured cross level at A (in)", kind: "number", default: 4.6, attrs: { step: "any" } },
    { key: "designed_a_in", label: "Designed cross level at A (in)", kind: "number", default: 4.0, attrs: { step: "any" } },
    { key: "measured_b_in", label: "Measured cross level at B (in)", kind: "number", default: 3.2, attrs: { step: "any" } },
    { key: "designed_b_in", label: "Designed cross level at B (in)", kind: "number", default: 4.0, attrs: { step: "any" } },
    { key: "distance_ft", label: "Distance between A and B (ft)", kind: "number", default: 62 },
    { key: "warp_limit_in", label: "Applicable warp limit for the class (in)", kind: "number", default: 1.75 },
  ],
  outputs: [
    { key: "a", id: "twf-out-a", label: "Cross level deviation at A", value: (r) => fmt(r.deviation_a_in, 2) + " in" },
    { key: "b", id: "twf-out-b", label: "Cross level deviation at B", value: (r) => fmt(r.deviation_b_in, 2) + " in" },
    { key: "w", id: "twf-out-w", label: "Warp over the entered distance", value: (r) => fmt(r.warp_magnitude_in, 2) + " in" },
    { key: "v", id: "twf-out-v", label: "Against the entered limit", value: (r) => r.verdict + ", margin " + fmt(r.margin_in, 2) + " in (" + fmt(r.pct_of_limit, 0) + "% of limit)" },
    { key: "s", id: "twf-out-s", label: "Same twist scaled to a 31 ft base", value: (r) => fmt(r.warp_per_31ft_in, 2) + " in" },
    { key: "z", id: "twf-out-z", label: "What measuring against zero would have read", value: (r) => fmt(r.against_zero_in, 2) + " in" },
    { key: "n", id: "twf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTrackWarp,
});

// ===================== spec-v1544: ballast section volume and tonnage =====================

// dims: in { top_width_ft: L, depth_in: L, side_slope_ratio: dimensionless, length_ft: L, density_ton_per_cy: M L^-3, raise_in: L } out: { bottom_width_ft: L, area_sqft: L^2, volume_cy: L^3, tons: M, cy_per_mile: L^3, tons_per_mile: M, raise_volume_cy: L^3 }
export function computeBallastSection({ top_width_ft = 0, depth_in = 0, side_slope_ratio = 1.5, length_ft = 0, density_ton_per_cy = 1.4, raise_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(top_width_ft > 0)) return { error: "Top width of the ballast section must be positive." };
  if (!(depth_in > 0)) return { error: "Section depth must be positive." };
  if (!(side_slope_ratio >= 0)) return { error: "Side slope ratio cannot be negative." };
  if (!(length_ft > 0)) return { error: "Project length must be positive." };
  if (!(density_ton_per_cy > 0)) return { error: "Placed density must be positive (tons per cubic yard)." };
  if (!(raise_in >= 0)) return { error: "Raise height cannot be negative." };
  const depth_ft = depth_in / 12;
  const bottom_width_ft = top_width_ft + 2 * side_slope_ratio * depth_ft;
  const area_sqft = ((top_width_ft + bottom_width_ft) / 2) * depth_ft;
  const volume_cy = area_sqft * length_ft / 27;
  const tons = volume_cy * density_ton_per_cy;
  const cy_per_mile = area_sqft * 5280 / 27;
  const tons_per_mile = cy_per_mile * density_ton_per_cy;
  const raise_volume_cy = top_width_ft * (raise_in / 12) * length_ft / 27;
  const rectangle_area_sqft = top_width_ft * depth_ft;
  const understated_pct = ((area_sqft - rectangle_area_sqft) / area_sqft) * 100;
  const understated_tons_per_mile = (area_sqft - rectangle_area_sqft) * 5280 / 27 * density_ton_per_cy;
  return {
    bottom_width_ft, area_sqft, volume_cy, tons, cy_per_mile, tons_per_mile,
    raise_volume_cy, rectangle_area_sqft, understated_pct, understated_tons_per_mile,
    note: "The section is wider at the bottom than at the top because of the side slopes, and on a 1.5 to 1 slope with a foot of depth that is three extra feet of width. Taking the section off as a rectangle at the top width understates the volume substantially and the understatement grows with depth. The distinction that decides a surfacing order is between the full section and the RAISE: lifting existing track two inches does not need a new section, it needs the volume of the lift plus what fills the crib and shoulder the lift opens up, and ordering the full section for a raise buys several times what is wanted. Placed density is the other quiet term, roughly 1.35 to 1.45 tons per placed cubic yard for typical granite, and using loose density instead overstates the yards a ton will cover. This does not deduct the ballast displaced by ties, or the crib volume on a raise, and it does not account for ballast lost into a soft subgrade, which on bad track can consume a large multiple of the calculated volume. The railroad's standard plans and engineering instructions govern the section.",
  };
}
const ballastSectionExample = { inputs: { top_width_ft: 8, depth_in: 12, side_slope_ratio: 1.5, length_ft: 5280, density_ton_per_cy: 1.4, raise_in: 2 } };
RAIL_RENDERERS["ballast-section-volume"] = _simpleRenderer({
  citation: "Citation: the trapezoidal prism -- bottom width = top + 2 x slope x depth, area = mean width x depth, 27 cubic ft per cubic yard, 5,280 ft per mile -- and a placed-density conversion in tons per cubic yard read off the supplier's material. Standard track surfacing practice; the railroad's standard plans set the section.",
  example: ballastSectionExample.inputs,
  fields: [
    { key: "top_width_ft", label: "Top width of the section (ft)", kind: "number", default: 8 },
    { key: "depth_in", label: "Section depth (in)", kind: "number", default: 12 },
    { key: "side_slope_ratio", label: "Side slope, run per rise", kind: "number", default: 1.5 },
    { key: "length_ft", label: "Project length (ft)", kind: "number", default: 5280 },
    { key: "density_ton_per_cy", label: "Placed density (tons per cu yd)", kind: "number", default: 1.4 },
    { key: "raise_in", label: "Surfacing raise height (in)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "b", id: "bsv-out-b", label: "Bottom width", value: (r) => fmt(r.bottom_width_ft, 2) + " ft" },
    { key: "a", id: "bsv-out-a", label: "Cross-sectional area", value: (r) => fmt(r.area_sqft, 2) + " sq ft" },
    { key: "v", id: "bsv-out-v", label: "Volume over the entered length", value: (r) => fmt(r.volume_cy, 0) + " cu yd" },
    { key: "t", id: "bsv-out-t", label: "Tonnage at the entered density", value: (r) => fmt(r.tons, 0) + " tons" },
    { key: "m", id: "bsv-out-m", label: "Per track mile", value: (r) => fmt(r.cy_per_mile, 0) + " cu yd, " + fmt(r.tons_per_mile, 0) + " tons" },
    { key: "r", id: "bsv-out-r", label: "Volume of the raise alone", value: (r) => fmt(r.raise_volume_cy, 0) + " cu yd" },
    { key: "u", id: "bsv-out-u", label: "What a rectangle at the top width would miss", value: (r) => fmt(r.understated_pct, 1) + "% (" + fmt(r.understated_tons_per_mile, 0) + " tons per mile)" },
    { key: "n", id: "bsv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBallastSection,
});

// ===================== spec-v1545: turnout frog number and closure geometry =====================

// dims: in { frog_number: dimensionless, distance_beyond_frog_ft: L, required_separation_ft: L, lead_ft: L } out: { frog_angle_deg: dimensionless, frog_angle_min: dimensionless, separation_at_distance_ft: L, clearance_point_ft: L, total_from_switch_point_ft: L }
export function computeTurnoutFrogGeometry({ frog_number = 0, distance_beyond_frog_ft = 0, required_separation_ft = 0, lead_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(frog_number >= 1)) return { error: "Frog number must be at least 1." };
  if (!(distance_beyond_frog_ft > 0)) return { error: "Distance beyond the frog must be positive." };
  if (!(required_separation_ft > 0)) return { error: "Required separation must be positive." };
  if (!(lead_ft > 0)) return { error: "Lead from the standard plan must be positive." };
  const frog_angle_deg = 2 * Math.asin(1 / (2 * frog_number)) * _DEG;
  const frog_angle_min = frog_angle_deg * 60;
  const separation_at_distance_ft = distance_beyond_frog_ft / frog_number;
  const clearance_point_ft = required_separation_ft * frog_number;
  const total_from_switch_point_ft = lead_ft + clearance_point_ft;
  const fouls = separation_at_distance_ft < required_separation_ft;
  return {
    frog_angle_deg, frog_angle_min, separation_at_distance_ft, clearance_point_ft,
    total_from_switch_point_ft, fouls,
    slope_text: "1 in " + fmt(frog_number, 1),
    verdict: fouls
      ? "FOULING -- inside the clearance point"
      : "clear -- at or beyond the clearance point",
    note: "The frog number is a slope: a number 10 frog spreads one unit sideways for every ten units along, which makes the angle a shade under six degrees. Higher numbers are flatter, faster, and longer, and that length is the practical constraint, which is why yards use low numbers and main line crossovers use high ones. The number a crew needs on the ground is the separation at a distance, because that locates the clearance point, where a car may stand on the diverging track without fouling the main. The separation relation is a straight-line approximation that ignores the closure curve: good enough to find a clearance point with a tape, not good enough to design with. Lead, switch point length, closure curve radius, guard rail and frog dimensions, and tie spacing all come from the railroad's standard plan for that specific turnout, and no formula substitutes for the plan. Diverging speed is set by the railroad and the turnout design rather than by frog number alone. Turnouts in curved track have their own geometry entirely. The standard plans, 49 CFR 213, and the track owner govern.",
  };
}
const turnoutFrogExample = { inputs: { frog_number: 10, distance_beyond_frog_ft: 150, required_separation_ft: 13, lead_ft: 78 } };
RAIL_RENDERERS["turnout-frog-lead"] = _simpleRenderer({
  citation: "Citation: the frog-number geometry relations -- angle F = 2 arcsin(1 / (2 N)) exactly, and a diverging track separating by about 1 in N beyond the frog -- with 49 CFR 213 and the railroad's standard plans named. Lead and the other layout dimensions come from the standard plan and are entered, not computed. The track owner governs.",
  example: turnoutFrogExample.inputs,
  fields: [
    { key: "frog_number", label: "Frog number", kind: "number", default: 10 },
    { key: "distance_beyond_frog_ft", label: "Distance beyond the frog (ft)", kind: "number", default: 150 },
    { key: "required_separation_ft", label: "Required separation at the clearance point (ft)", kind: "number", default: 13 },
    { key: "lead_ft", label: "Lead from the standard plan (ft)", kind: "number", default: 78 },
  ],
  outputs: [
    { key: "a", id: "tfl-out-a", label: "Frog angle", value: (r) => fmt(r.frog_angle_deg, 3) + " deg (" + fmt(r.frog_angle_min, 1) + " min, " + r.slope_text + ")" },
    { key: "s", id: "tfl-out-s", label: "Separation at the entered distance", value: (r) => fmt(r.separation_at_distance_ft, 2) + " ft -- " + r.verdict },
    { key: "c", id: "tfl-out-c", label: "Clearance point beyond the frog", value: (r) => fmt(r.clearance_point_ft, 1) + " ft" },
    { key: "t", id: "tfl-out-t", label: "Track consumed from the point of switch", value: (r) => fmt(r.total_from_switch_point_ft, 1) + " ft" },
    { key: "n", id: "tfl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTurnoutFrogGeometry,
});

// ===========================================================================
// spec-v1546..v1549: the 2026-09-08 trade-expansion rail logistics half.
// Four tiles finish `calc-rail.js`, all group J -- the track half of this
// module is group E, and a tile's group letter is independent of its module.
//
//   v1546 railcar-load-limit      v1548 train-brake-reduction
//   v1547 tonnage-rating-grade    v1549 clearance-plate-envelope
//
// ONE SPEC WAS INTERNALLY WRONG, and it is the threshold-backwards failure
// this program keeps finding. spec-v1547 computes an adhesion-limited
// tractive effort of 302,400 lb on wet rail and says "the tonnage rating
// falls to 10,286 tons". The consist's ACTUAL tractive effort is 140,000 lb,
// which is far below 302,400 -- so adhesion never governs in that example,
// the rating stays 4,762 tons, and 10,286 is HIGHER than the number it is
// said to have fallen from. The tile takes the LOWER of the two and prints
// which one governs.
//
// spec-v1549 calls its curve "4 degree (R = 1,146 ft)". 5,729.58 / 4 is
// 1,432 ft; 1,146 ft is a FIVE degree curve. Its arithmetic follows 1,146
// consistently, so the degree is what is wrong. It also reports 62.0 in of
// remaining clearance as "less than five inches".

// Train resistance in pounds per ton. 20 lb/ton per 1% of grade is just the
// component of weight along the slope, and it is the SAME constant
// `haul-road-resistance` uses for a truck on a haul road, so the two cannot
// disagree about what a grade costs. 0.8 lb/ton per degree of curve is the
// long-standing railroad allowance.
const _GRADE_RESISTANCE_LB_PER_TON_PER_PCT = 20;
const _CURVE_RESISTANCE_LB_PER_TON_PER_DEG = 0.8;

// ============ spec-v1546: railcar load limit ============

// dims: in { gross_rail_load_lb: M L T^-2, light_weight_lb: M L T^-2, lading_net_lb: M L T^-2, cubic_capacity_ft3: L^3, lading_density_pcf: M L^-3, route_gross_rail_load_lb: M L T^-2 } out: { load_limit_lb: M L T^-2, gross_on_rail_lb: M L T^-2, utilization_pct: dimensionless, remaining_capacity_lb: M L T^-2, route_load_limit_lb: M L T^-2, cube_limited_weight_lb: M L T^-2 }
export function computeRailcarLoadLimit({ gross_rail_load_lb = 0, light_weight_lb = 0, lading_net_lb = 0, cubic_capacity_ft3 = 0, lading_density_pcf = 0, route_gross_rail_load_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gross_rail_load_lb > 0)) return { error: "Gross rail load must be positive (lb)." };
  if (!(light_weight_lb > 0)) return { error: "Light weight must be positive (lb) -- read it off the car's stencil." };
  if (!(light_weight_lb < gross_rail_load_lb)) return { error: "Light weight cannot equal or exceed the gross rail load; the car would have no capacity." };
  if (lading_net_lb < 0) return { error: "Lading net weight cannot be negative (lb)." };
  if (cubic_capacity_ft3 < 0) return { error: "Cubic capacity cannot be negative (cu ft)." };
  if (lading_density_pcf < 0) return { error: "Lading density cannot be negative (pcf)." };
  if (route_gross_rail_load_lb < 0) return { error: "The route gross rail load cannot be negative (lb)." };
  const load_limit_lb = gross_rail_load_lb - light_weight_lb;
  const gross_on_rail_lb = light_weight_lb + lading_net_lb;
  const utilization_pct = lading_net_lb > 0 ? lading_net_lb / load_limit_lb * 100 : 0;
  const remaining_capacity_lb = load_limit_lb - lading_net_lb;
  const within_car = gross_on_rail_lb <= gross_rail_load_lb;
  // The constraint that gets missed: the ROUTE's own limit, which is invisible
  // on the car and which the stencil knows nothing about.
  const route_load_limit_lb = route_gross_rail_load_lb > 0 ? route_gross_rail_load_lb - light_weight_lb : null;
  const governing_load_limit_lb = route_load_limit_lb === null ? load_limit_lb : Math.min(load_limit_lb, route_load_limit_lb);
  const route_shortfall_lb = route_load_limit_lb === null ? null : load_limit_lb - route_load_limit_lb;
  const within_route = route_gross_rail_load_lb > 0 ? gross_on_rail_lb <= route_gross_rail_load_lb : null;
  const route_governs = route_load_limit_lb !== null && route_load_limit_lb < load_limit_lb;
  // Weight or cube: light bulky lading fills the car before it reaches the
  // load limit, dense lading reaches the limit with the car half empty.
  const cube_limited_weight_lb = (cubic_capacity_ft3 > 0 && lading_density_pcf > 0) ? cubic_capacity_ft3 * lading_density_pcf : null;
  const cube_governs = cube_limited_weight_lb === null ? null : cube_limited_weight_lb < governing_load_limit_lb;
  const outs = [load_limit_lb, gross_on_rail_lb, remaining_capacity_lb];
  if (!outs.every(Number.isFinite)) return { error: "Load limit math is not a finite value." };
  const verdict = within_car
    ? "INSIDE the car at " + fmt(gross_on_rail_lb, 0) + " lb on rail against " + fmt(gross_rail_load_lb, 0) + " lb, " + fmt(utilization_pct, 1) + "% of the load limit"
    : "OVERLOADED: " + fmt(gross_on_rail_lb, 0) + " lb on rail against a " + fmt(gross_rail_load_lb, 0) + " lb car, " + fmt(gross_on_rail_lb - gross_rail_load_lb, 0) + " lb over";
  const route_verdict = within_route === null
    ? "Enter the route's maximum gross rail load. It is frequently below the car's, and the difference is invisible on the car."
    : within_route
      ? "INSIDE the route limit of " + fmt(route_gross_rail_load_lb, 0) + " lb" + (route_governs ? ", which allows " + fmt(route_load_limit_lb, 0) + " lb of lading -- " + fmt(route_shortfall_lb, 0) + " lb LESS than the stencil" : "")
      : "OVER THE ROUTE at " + fmt(gross_on_rail_lb, 0) + " lb against " + fmt(route_gross_rail_load_lb, 0) + " lb. Loading to the stencil has overloaded the ROUTE, not the car, and that distinction is invisible on the car itself";
  const governs_verdict = cube_governs === null
    ? "Enter a cubic capacity and a lading density to see whether weight or cube governs."
    : cube_governs
      ? "CUBE GOVERNS: the car fills at " + fmt(cube_limited_weight_lb, 0) + " lb, well under the " + fmt(governing_load_limit_lb, 0) + " lb allowed, so the weight capacity is irrelevant for this commodity"
      : "WEIGHT GOVERNS: the car reaches " + fmt(governing_load_limit_lb, 0) + " lb with " + fmt(governing_load_limit_lb / lading_density_pcf, 0) + " cu ft loaded, of " + fmt(cubic_capacity_ft3, 0) + " available";
  return {
    gross_rail_load_lb, light_weight_lb, load_limit_lb, lading_net_lb, gross_on_rail_lb,
    utilization_pct, remaining_capacity_lb, within_car, route_gross_rail_load_lb,
    route_load_limit_lb, governing_load_limit_lb, route_shortfall_lb, within_route,
    route_governs, cubic_capacity_ft3, lading_density_pcf, cube_limited_weight_lb,
    cube_governs, verdict, route_verdict, governs_verdict,
    note: "The car's stencil gives light weight and load limit, and their sum is the gross rail load the car is built for. Load limit is what a shipper may put in, and it is a property of the SPECIFIC CAR rather than of its class: light weights differ between cars of the same nominal rating, and a repaired or rebuilt car can be several hundred pounds heavier than its sister and has exactly that much less capacity. Reading the stencil on the car in front of you, rather than the class, is the whole discipline. THE CONSTRAINT THAT GETS MISSED IS THE ROUTE. A 286,000 lb car is not permitted everywhere: bridges and track on light density lines and on many short lines are rated below it, and a car loaded to its own limit can be refused, restricted, or held. The governing gross rail load is the LOWER of the car's and the route's, and a shipper loading to the stencil without checking the route has overloaded the route rather than the car -- a distinction that is completely invisible on the car itself, because the stencil has no idea where the car is going. THE OTHER EVERYDAY QUESTION IS WHETHER WEIGHT OR CUBE GOVERNS. A car has a cubic capacity as well as a weight limit, and light bulky lading fills the car long before it reaches the load limit while dense lading reaches the limit with the car half empty. Which one binds is what sizes a shipment and what decides whether a different car type would carry more, and it changes with the commodity rather than with the car. Common gross rail load classes run 220,000, 263,000, 286,000, and 315,000 lb. This is the load limit arithmetic and the two checks around it. It does not address weight distribution within the car, which has its own limits -- a load concentrated over one truck can overload it while the car's gross is fine -- or eccentric and off-centre loading, load securement, or the AAR loading rules for the commodity. It does not determine whether a specific route accepts a specific car, which is a routing question for the carrier, and it does not address dimensional or excess-height loads, high-wide clearance, or the open-top loading rules. The car's stencil, the AAR loading rules, the carrier's route restrictions, and the shipper's own weighing govern.",
  };
}
const railcarLoadLimitExample = { inputs: { gross_rail_load_lb: 286000, light_weight_lb: 63000, lading_net_lb: 200000, cubic_capacity_ft3: 5200, lading_density_pcf: 30, route_gross_rail_load_lb: 263000 } };
RAIL_RENDERERS["railcar-load-limit"] = _simpleRenderer({
  citation: "Citation: the railcar load limit identity by name -- load limit = gross rail load - light weight, gross on rail = light weight + lading, with the governing limit taken as the LOWER of the car's and the route's -- and the cube-versus-weight check as cubic capacity x lading density against that limit. Common gross rail load classes are 220,000, 263,000, 286,000 and 315,000 lb. Light weight and load limit come from the car's own stencil, not from its class. The car's stencil, the AAR loading rules, the carrier's route restrictions, and the shipper's weighing govern.",
  example: railcarLoadLimitExample.inputs,
  fields: [
    { key: "gross_rail_load_lb", label: "Car gross rail load (lb)", kind: "number", default: 286000 },
    { key: "light_weight_lb", label: "Light weight from the stencil (lb)", kind: "number", default: 63000 },
    { key: "lading_net_lb", label: "Lading net weight (lb)", kind: "number", default: 200000 },
    { key: "cubic_capacity_ft3", label: "Cubic capacity (cu ft, 0 to skip)", kind: "number", default: 5200 },
    { key: "lading_density_pcf", label: "Lading density (pcf, 0 to skip)", kind: "number", default: 30 },
    { key: "route_gross_rail_load_lb", label: "Route maximum gross rail load (lb, 0 to skip)", kind: "number", default: 263000 },
  ],
  outputs: [
    { key: "l", id: "rll-out-l", label: "Load limit", value: (r) => fmt(r.load_limit_lb, 0) + " lb of lading -- " + fmt(r.gross_rail_load_lb, 0) + " less the " + fmt(r.light_weight_lb, 0) + " lb stencilled light weight" },
    { key: "v", id: "rll-out-v", label: "Against the car", value: (r) => r.verdict },
    { key: "r", id: "rll-out-r", label: "Against the route", value: (r) => r.route_verdict },
    { key: "c", id: "rll-out-c", label: "Remaining capacity", value: (r) => fmt(r.remaining_capacity_lb, 0) + " lb on the car" + (r.route_load_limit_lb === null ? "" : ", " + fmt(r.route_load_limit_lb - r.lading_net_lb, 0) + " lb on the route") },
    { key: "g", id: "rll-out-g", label: "Weight or cube", value: (r) => r.governs_verdict },
    { key: "n", id: "rll-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRailcarLoadLimit,
});

// ============ spec-v1547: locomotive tonnage rating on a ruling grade ============

// dims: in { tractive_effort_lb: M L T^-2, ruling_grade_pct: dimensionless, rolling_resistance_lb_per_ton: M L T^-2, curve_degrees: dimensionless, weight_on_drivers_lb: M L T^-2, adhesion_factor: dimensionless, alternate_grade_pct: dimensionless } out: { grade_resistance_lb_per_ton: M L T^-2, curve_resistance_lb_per_ton: M L T^-2, total_resistance_lb_per_ton: M L T^-2, adhesion_limited_te_lb: M L T^-2, governing_te_lb: M L T^-2, tonnage_rating_tons: M }
export function computeTonnageRatingGrade({ tractive_effort_lb = 0, ruling_grade_pct = 0, rolling_resistance_lb_per_ton = 3, curve_degrees = 0, weight_on_drivers_lb = 0, adhesion_factor = 0.3, alternate_grade_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tractive_effort_lb > 0)) return { error: "Available tractive effort must be positive (lb)." };
  if (ruling_grade_pct < 0) return { error: "The ruling grade cannot be negative (%); a descending ruling grade is a braking problem, not a tonnage one." };
  if (!(rolling_resistance_lb_per_ton > 0)) return { error: "Rolling resistance must be positive (lb per ton)." };
  if (curve_degrees < 0) return { error: "Curvature cannot be negative (degrees)." };
  if (weight_on_drivers_lb < 0) return { error: "Weight on drivers cannot be negative (lb)." };
  if (!(adhesion_factor > 0 && adhesion_factor <= 1)) return { error: "The adhesion factor must be greater than zero and no more than one." };
  if (alternate_grade_pct < 0) return { error: "The comparison grade cannot be negative (%)." };
  const grade_resistance_lb_per_ton = _GRADE_RESISTANCE_LB_PER_TON_PER_PCT * ruling_grade_pct;
  const curve_resistance_lb_per_ton = _CURVE_RESISTANCE_LB_PER_TON_PER_DEG * curve_degrees;
  const total_resistance_lb_per_ton = grade_resistance_lb_per_ton + rolling_resistance_lb_per_ton + curve_resistance_lb_per_ton;
  if (!(total_resistance_lb_per_ton > 0)) return { error: "Total resistance is not positive; check the grade, rolling resistance, and curvature." };
  // A locomotive cannot deliver more tractive effort than friction between
  // wheel and rail allows. The rating follows whichever is LOWER.
  const adhesion_limited_te_lb = weight_on_drivers_lb > 0 ? weight_on_drivers_lb * adhesion_factor : null;
  const adhesion_governs = adhesion_limited_te_lb !== null && adhesion_limited_te_lb < tractive_effort_lb;
  const governing_te_lb = adhesion_governs ? adhesion_limited_te_lb : tractive_effort_lb;
  const tonnage_rating_tons = governing_te_lb / total_resistance_lb_per_ton;
  const rating_on_te_alone_tons = tractive_effort_lb / total_resistance_lb_per_ton;
  const level_resistance_lb_per_ton = rolling_resistance_lb_per_ton + curve_resistance_lb_per_ton;
  const level_tonnage_tons = governing_te_lb / level_resistance_lb_per_ton;
  const grade_penalty_x = level_tonnage_tons > 0 ? level_tonnage_tons / tonnage_rating_tons : null;
  const alternate_resistance_lb_per_ton = alternate_grade_pct > 0
    ? _GRADE_RESISTANCE_LB_PER_TON_PER_PCT * alternate_grade_pct + rolling_resistance_lb_per_ton + curve_resistance_lb_per_ton
    : null;
  const alternate_tonnage_tons = alternate_resistance_lb_per_ton === null ? null : governing_te_lb / alternate_resistance_lb_per_ton;
  const drivers_needed_for_te_lb = tractive_effort_lb / adhesion_factor;
  const outs = [grade_resistance_lb_per_ton, total_resistance_lb_per_ton, tonnage_rating_tons, level_tonnage_tons];
  if (!outs.every(Number.isFinite)) return { error: "Tonnage rating math is not a finite value." };
  const adhesion_verdict = adhesion_limited_te_lb === null
    ? "Enter the weight on drivers to check whether the locomotives can actually put this tractive effort down."
    : adhesion_governs
      ? "ADHESION GOVERNS: " + fmt(weight_on_drivers_lb, 0) + " lb on drivers at " + fmt(adhesion_factor * 100, 0) + "% delivers only " + fmt(adhesion_limited_te_lb, 0) + " lb, below the " + fmt(tractive_effort_lb, 0) + " lb rating. The train stalls before the engines run out of power -- helpers or doubling the hill"
      : "TRACTIVE EFFORT GOVERNS: " + fmt(weight_on_drivers_lb, 0) + " lb on drivers at " + fmt(adhesion_factor * 100, 0) + "% could put down " + fmt(adhesion_limited_te_lb, 0) + " lb, above the " + fmt(tractive_effort_lb, 0) + " lb the consist makes, so adhesion is NOT the limit here";
  return {
    tractive_effort_lb, ruling_grade_pct, rolling_resistance_lb_per_ton, curve_degrees,
    grade_resistance_lb_per_ton, curve_resistance_lb_per_ton, total_resistance_lb_per_ton,
    weight_on_drivers_lb, adhesion_factor, adhesion_limited_te_lb, adhesion_governs,
    governing_te_lb, tonnage_rating_tons, rating_on_te_alone_tons,
    level_resistance_lb_per_ton, level_tonnage_tons, grade_penalty_x,
    alternate_grade_pct, alternate_resistance_lb_per_ton, alternate_tonnage_tons,
    drivers_needed_for_te_lb, adhesion_verdict,
    note: "Twenty pounds per ton per percent of grade is the number to carry: it is just the component of weight along the slope, and it dwarfs everything else on the list. On the level a train resists at three to five pounds per ton; put it on a one percent grade and grade resistance alone adds twenty, so a modest hill multiplies the required pull several times over. THAT IS WHY THE RULING GRADE SETS THE TRAIN. The steepest sustained grade on the route, curve resistance included, determines the tonnage rating for the whole run, and a single short hill sets the makeup for hundreds of level miles behind it. Curvature adds about eight tenths of a pound per ton per degree, which is small beside a grade and large beside nothing, and it belongs in the ruling grade calculation rather than beside it. THE SECOND CONSTRAINT IS ADHESION AND IT IS A SEPARATE CEILING. A locomotive cannot deliver more tractive effort than friction between wheel and rail allows -- roughly twenty five to thirty five percent of the weight on its drivers with modern adhesion control, and much less on wet, leafy, or contaminated rail. The rating follows whichever of the two is LOWER, and which one governs is reported here in words, because it is easy to compute an adhesion limit, find it larger than the consist's own tractive effort, and mistakenly use it. A tonnage rating that assumes tractive effort the locomotives cannot put down is a train that stalls, and the fall-back on a rated hill is helpers or doubling the hill -- both planned from this same arithmetic. A steady-state rating at constant speed. It does not address acceleration, starting resistance -- which is higher than running resistance and is why a train that stalls may be unable to restart on a grade -- train dynamics, slack action, or drawbar and coupler limits, which cap how much tonnage may be pulled behind a given point regardless of power. It does not compute the Davis or any other speed-dependent resistance formula: rolling resistance is entered, and it rises at low speed and again at high speed. It says nothing about braking, dynamic brake capacity, or the descending side of the hill, which is a different and often harder problem. The railroad's own tonnage tables, the locomotive builder's tractive effort curves, and the operating department govern.",
  };
}
const tonnageRatingGradeExample = { inputs: { tractive_effort_lb: 140000, ruling_grade_pct: 1.2, rolling_resistance_lb_per_ton: 3, curve_degrees: 3, weight_on_drivers_lb: 1680000, adhesion_factor: 0.3, alternate_grade_pct: 0.5 } };
RAIL_RENDERERS["tonnage-rating-grade"] = _simpleRenderer({
  citation: "Citation: the train resistance components by name -- grade resistance 20 lb/ton per 1% (the same constant the haul-road resistance calculation uses, so the two cannot disagree about what a grade costs), rolling resistance entered, and curve resistance about 0.8 lb/ton per degree -- with the tonnage rating = governing tractive effort / total resistance. The adhesion ceiling is weight on drivers x an adhesion factor (roughly 0.25 to 0.35 dry with modern control, much less on wet or contaminated rail), and the rating follows the LOWER of the two. Steady state at constant speed; no starting resistance, slack action, drawbar limits, or braking. The railroad's own tonnage tables, the locomotive builder's tractive effort curves, and the operating department govern.",
  example: tonnageRatingGradeExample.inputs,
  fields: [
    { key: "tractive_effort_lb", label: "Available tractive effort (lb)", kind: "number", default: 140000 },
    { key: "ruling_grade_pct", label: "Ruling grade (%)", kind: "number", default: 1.2 },
    { key: "rolling_resistance_lb_per_ton", label: "Rolling resistance (lb per ton)", kind: "number", default: 3 },
    { key: "curve_degrees", label: "Curvature on the ruling grade (degrees)", kind: "number", default: 3 },
    { key: "weight_on_drivers_lb", label: "Locomotive weight on drivers (lb, 0 to skip)", kind: "number", default: 1680000 },
    { key: "adhesion_factor", label: "Adhesion factor (0 to 1)", kind: "number", default: 0.3 },
    { key: "alternate_grade_pct", label: "Comparison grade (%, 0 to skip)", kind: "number", default: 0.5 },
  ],
  outputs: [
    { key: "r", id: "trg-out-r", label: "Resistance", value: (r) => fmt(r.total_resistance_lb_per_ton, 2) + " lb/ton -- grade " + fmt(r.grade_resistance_lb_per_ton, 1) + ", rolling " + fmt(r.rolling_resistance_lb_per_ton, 1) + ", curve " + fmt(r.curve_resistance_lb_per_ton, 1) },
    { key: "t", id: "trg-out-t", label: "Tonnage rating", value: (r) => fmt(r.tonnage_rating_tons, 0) + " tons over that hill" },
    { key: "a", id: "trg-out-a", label: "Adhesion", value: (r) => r.adhesion_verdict },
    { key: "l", id: "trg-out-l", label: "The hill, not the railroad", value: (r) => "on level track the same power moves " + fmt(r.level_tonnage_tons, 0) + " tons at " + fmt(r.level_resistance_lb_per_ton, 2) + " lb/ton -- " + fmt(r.grade_penalty_x, 1) + "x as much" },
    { key: "c", id: "trg-out-c", label: "At the comparison grade", value: (r) => r.alternate_tonnage_tons === null ? "(no comparison grade entered)" : fmt(r.alternate_tonnage_tons, 0) + " tons at " + fmt(r.alternate_grade_pct, 2) + "%, " + fmt(r.alternate_resistance_lb_per_ton, 2) + " lb/ton" },
    { key: "d", id: "trg-out-d", label: "Drivers needed for this tractive effort", value: (r) => fmt(r.drivers_needed_for_te_lb, 0) + " lb at " + fmt(r.adhesion_factor * 100, 0) + "% adhesion" },
    { key: "n", id: "trg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTonnageRatingGrade,
});

// ============ spec-v1548: train air brake reduction ============

// dims: in { charged_pressure_psi: M L^-1 T^-2, reduction_psi: M L^-1 T^-2, cylinder_ratio: dimensionless, full_service_reduction_psi: M L^-1 T^-2, car_count: dimensionless, propagation_rate_cars_per_second: dimensionless } out: { brake_pipe_psi: M L^-1 T^-2, cylinder_psi: M L^-1 T^-2, remaining_reduction_psi: M L^-1 T^-2, full_service_cylinder_psi: M L^-1 T^-2, wasted_reduction_psi: M L^-1 T^-2, propagation_seconds: T }
export function computeTrainBrakeReduction({ charged_pressure_psi = 90, reduction_psi = 0, cylinder_ratio = 2.5, full_service_reduction_psi = 26, car_count = 0, propagation_rate_cars_per_second = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(charged_pressure_psi > 0)) return { error: "Brake pipe charged pressure must be positive (psi)." };
  if (reduction_psi < 0) return { error: "The service reduction cannot be negative (psi)." };
  if (!(reduction_psi <= charged_pressure_psi)) return { error: "The reduction cannot exceed the charged pressure; that is a complete venting, not a service reduction." };
  if (!(cylinder_ratio > 0)) return { error: "The cylinder-to-reduction ratio must be positive." };
  if (!(full_service_reduction_psi > 0)) return { error: "The full-service reduction point must be positive (psi)." };
  if (car_count < 0) return { error: "Car count cannot be negative." };
  if (car_count > 0 && !(propagation_rate_cars_per_second > 0)) return { error: "Enter a propagation rate in cars per second to estimate the delay to the rear." };
  const brake_pipe_psi = charged_pressure_psi - reduction_psi;
  // Cylinder pressure rises with the reduction until the auxiliary reservoir
  // and the cylinder equalize, which is what full service means. Past that
  // point further reduction is air spent for nothing.
  const effective_reduction_psi = Math.min(reduction_psi, full_service_reduction_psi);
  const cylinder_psi = effective_reduction_psi * cylinder_ratio;
  const full_service_cylinder_psi = full_service_reduction_psi * cylinder_ratio;
  const at_or_past_full_service = reduction_psi >= full_service_reduction_psi;
  const remaining_reduction_psi = Math.max(0, full_service_reduction_psi - reduction_psi);
  const wasted_reduction_psi = Math.max(0, reduction_psi - full_service_reduction_psi);
  const remaining_cylinder_psi = full_service_cylinder_psi - cylinder_psi;
  const equalizing_reservoir_psi = brake_pipe_psi;
  const propagation_seconds = car_count > 0 ? car_count / propagation_rate_cars_per_second : null;
  const outs = [brake_pipe_psi, cylinder_psi, full_service_cylinder_psi, remaining_reduction_psi];
  if (!outs.every(Number.isFinite)) return { error: "Brake reduction math is not a finite value." };
  const verdict = at_or_past_full_service
    ? (wasted_reduction_psi > 0
      ? "PAST FULL SERVICE: the last " + fmt(wasted_reduction_psi, 1) + " psi of reduction bought NOTHING -- the cylinders were already at " + fmt(full_service_cylinder_psi, 1) + " psi at " + fmt(full_service_reduction_psi, 0) + " psi of reduction, and that air still has to be pumped back before the brakes will release"
      : "AT FULL SERVICE: " + fmt(cylinder_psi, 1) + " psi in the cylinders, and there is no more service braking available. Anything further is emergency")
    : "IN SERVICE RANGE: " + fmt(cylinder_psi, 1) + " psi in the cylinders, with " + fmt(remaining_reduction_psi, 1) + " psi of reduction still available -- worth " + fmt(remaining_cylinder_psi, 1) + " psi more in the cylinders";
  return {
    charged_pressure_psi, reduction_psi, brake_pipe_psi, cylinder_ratio,
    effective_reduction_psi, cylinder_psi, full_service_reduction_psi,
    full_service_cylinder_psi, at_or_past_full_service, remaining_reduction_psi,
    remaining_cylinder_psi, wasted_reduction_psi, equalizing_reservoir_psi,
    car_count, propagation_rate_cars_per_second, propagation_seconds, verdict,
    note: "A freight brake pipe is charged to a regulated pressure, commonly 90 psi, and the brakes apply when that pressure DROPS. The multiplication is roughly two and a half: a ten pound brake pipe reduction produces about twenty five pounds in the brake cylinders. That continues until the auxiliary reservoir and the brake cylinder equalize, which happens at around a twenty six pound reduction, and BEYOND THAT POINT ADDITIONAL REDUCTION PRODUCES NO ADDITIONAL BRAKING. An engineer who keeps reducing past full service has spent the air and gained nothing, which is the situation that precedes losing a train on a grade -- so the wasted reduction is reported here as its own number rather than left to be inferred. THE PART THAT HAS NO FORMULA MATTERS MOST, AND IT IS RECHARGE TIME. Releasing the brakes requires pumping the brake pipe back up from the head end, and on a long train that takes minutes -- during which the rear of the train may still be applying while the head end is already releasing. That is why cycle braking on a descending grade is dangerous and why dynamic brake, not air, is the primary means of controlling a train downhill. Nothing here estimates recharge; it reports the approximate cylinder pressure and the full service point so the remaining air is visible as a quantity rather than as a feeling. Propagation is the same effect on the way in. A reduction takes time to travel to the rear, so the head end is braking before the tail is, which is what produces slack run-in, and the same delay on release means the rear is still applied while the head end pulls. The propagation estimate here is a rate the reader enters against the car count, not a model of the brake pipe. AN APPROXIMATION OF A SYSTEM WITH MANY VARIABLES. The cylinder ratio depends on the brake equipment, the piston travel, the cylinder and reservoir volumes, and the brake rigging ratio, and it differs between car types and between empty and loaded cars on an empty-load device. This does not model emergency applications, which vent the pipe rapidly and reach a higher cylinder pressure than full service, retainers, hand brakes, dynamic brake, or the interaction between them. It does not calculate stopping distance, which depends on tonnage, grade, speed, brake shoe condition, wheel condition, and the percentage of operative brakes, and it is not a substitute for the air brake test. It says nothing about a train's ability to hold or stop on any particular grade. The railroad's air brake and train handling rules, the equipment manufacturer's data, and 49 CFR 232 govern.",
  };
}
const trainBrakeReductionExample = { inputs: { charged_pressure_psi: 90, reduction_psi: 30, cylinder_ratio: 2.5, full_service_reduction_psi: 26, car_count: 100, propagation_rate_cars_per_second: 10 } };
RAIL_RENDERERS["train-brake-reduction"] = _simpleRenderer({
  citation: "Citation: the freight air brake service relations by name -- brake cylinder pressure is about 2.5 times the brake pipe reduction until the auxiliary reservoir and the cylinder equalize at full service, commonly a 26 psi reduction from a 90 psi charged pipe, beyond which further reduction adds no braking. The cylinder ratio depends on the brake equipment, piston travel, cylinder and reservoir volumes and rigging ratio and is ENTERED. Emergency applications, retainers, hand brakes, dynamic brake, recharge time and stopping distance are all outside it. The railroad's air brake and train handling rules, the equipment manufacturer's data, and 49 CFR 232 govern.",
  example: trainBrakeReductionExample.inputs,
  fields: [
    { key: "charged_pressure_psi", label: "Brake pipe charged pressure (psi)", kind: "number", default: 90 },
    { key: "reduction_psi", label: "Service reduction made (psi)", kind: "number", default: 30 },
    { key: "cylinder_ratio", label: "Cylinder pressure per psi of reduction", kind: "number", default: 2.5 },
    { key: "full_service_reduction_psi", label: "Full-service reduction point (psi)", kind: "number", default: 26 },
    { key: "car_count", label: "Cars in the train (0 to skip propagation)", kind: "number", default: 100 },
    { key: "propagation_rate_cars_per_second", label: "Propagation rate (cars per second)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "p", id: "tbr-out-p", label: "Brake pipe now", value: (r) => fmt(r.brake_pipe_psi, 1) + " psi, down from " + fmt(r.charged_pressure_psi, 0) },
    { key: "c", id: "tbr-out-c", label: "Brake cylinder", value: (r) => fmt(r.cylinder_psi, 1) + " psi" },
    { key: "v", id: "tbr-out-v", label: "Against full service", value: (r) => r.verdict },
    { key: "f", id: "tbr-out-f", label: "Full service is", value: (r) => fmt(r.full_service_reduction_psi, 0) + " psi of reduction, worth " + fmt(r.full_service_cylinder_psi, 1) + " psi in the cylinders" },
    { key: "t", id: "tbr-out-t", label: "Propagation to the rear", value: (r) => r.propagation_seconds === null ? "(no car count entered)" : "about " + fmt(r.propagation_seconds, 1) + " s over " + fmt(r.car_count, 0) + " cars -- the head end brakes before the tail does, which is where slack run-in comes from" },
    { key: "n", id: "tbr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTrainBrakeReduction,
});

// ============ spec-v1549: railcar clearance plate and dynamic envelope ============

// dims: in { truck_centres_ft: L, car_length_ft: L, car_width_in: L, degree_of_curve: dimensionless, clearance_to_obstruction_in: L, required_clearance_in: L } out: { radius_ft: L, mid_ordinate_in: L, end_overhang_in: L, effective_half_width_in: L, remaining_clearance_in: L, sharpest_curve_deg: dimensionless }
export function computeClearancePlateEnvelope({ truck_centres_ft = 0, car_length_ft = 0, car_width_in = 0, degree_of_curve = 0, clearance_to_obstruction_in = 0, required_clearance_in = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(truck_centres_ft > 0)) return { error: "The distance between truck centres must be positive (ft)." };
  if (!(car_length_ft > 0)) return { error: "Car or load length must be positive (ft)." };
  if (!(car_length_ft >= truck_centres_ft)) return { error: "The car cannot be shorter than the distance between its truck centres." };
  if (!(car_width_in > 0)) return { error: "Car or load width must be positive (in)." };
  if (!(degree_of_curve > 0)) return { error: "Degree of curve must be positive." };
  if (clearance_to_obstruction_in < 0) return { error: "The measured clearance cannot be negative (in)." };
  if (required_clearance_in < 0) return { error: "The required clearance cannot be negative (in)." };
  const radius_ft = _DEG_ARC_CONST / degree_of_curve;
  // A long rigid car on a curve is a chord across an arc. Its CENTRE sits
  // inside the arc by the mid-ordinate of its truck-centre span; its CORNERS
  // swing outside it. Both matter, in opposite directions.
  const mid_ordinate_ft = truck_centres_ft * truck_centres_ft / (8 * radius_ft);
  const mid_ordinate_in = mid_ordinate_ft * 12;
  const overhang_ft = (car_length_ft - truck_centres_ft) / 2;
  const end_overhang_ft = (car_length_ft * car_length_ft - truck_centres_ft * truck_centres_ft) / (8 * radius_ft);
  const end_overhang_in = end_overhang_ft * 12;
  const half_width_in = car_width_in / 2;
  const effective_half_width_in = half_width_in + Math.max(mid_ordinate_in, end_overhang_in);
  const inside_half_width_in = half_width_in + mid_ordinate_in;
  const outside_half_width_in = half_width_in + end_overhang_in;
  const remaining_clearance_in = clearance_to_obstruction_in > 0 ? clearance_to_obstruction_in - effective_half_width_in : null;
  const fits = remaining_clearance_in === null ? null : remaining_clearance_in >= required_clearance_in;
  // Worked backwards: the sharpest curve that still leaves the required
  // clearance, given the measured distance to the obstruction.
  let sharpest_curve_deg = null;
  if (clearance_to_obstruction_in > 0) {
    const allowable_swing_in = clearance_to_obstruction_in - required_clearance_in - half_width_in;
    if (allowable_swing_in > 0) {
      const allowable_swing_ft = allowable_swing_in / 12;
      const radius_for_mid = truck_centres_ft * truck_centres_ft / (8 * allowable_swing_ft);
      const radius_for_end = (car_length_ft * car_length_ft - truck_centres_ft * truck_centres_ft) / (8 * allowable_swing_ft);
      const controlling_radius_ft = Math.max(radius_for_mid, radius_for_end);
      sharpest_curve_deg = _DEG_ARC_CONST / controlling_radius_ft;
    }
  }
  const outs = [radius_ft, mid_ordinate_in, end_overhang_in, effective_half_width_in];
  if (!outs.every(Number.isFinite)) return { error: "Clearance envelope math is not a finite value." };
  const verdict = fits === null
    ? "Measure the distance from track centre to the obstruction to check it."
    : fits
      ? "FITS with " + fmt(remaining_clearance_in, 1) + " in of clearance against a required " + fmt(required_clearance_in, 1) + " in -- the car occupies " + fmt(effective_half_width_in, 1) + " in from track centre on this curve"
      : (remaining_clearance_in < 0
        ? "DOES NOT FIT: the car occupies " + fmt(effective_half_width_in, 1) + " in from track centre and the obstruction is at " + fmt(clearance_to_obstruction_in, 1) + " in. It STRIKES by " + fmt(-remaining_clearance_in, 1) + " in"
        : "TOO TIGHT: " + fmt(remaining_clearance_in, 1) + " in of clearance against a required " + fmt(required_clearance_in, 1) + " in. A different route, a different car, or a shift of the load on the deck");
  return {
    truck_centres_ft, car_length_ft, car_width_in, degree_of_curve, radius_ft,
    mid_ordinate_ft, mid_ordinate_in, overhang_ft, end_overhang_ft, end_overhang_in,
    half_width_in, inside_half_width_in, outside_half_width_in, effective_half_width_in,
    clearance_to_obstruction_in, required_clearance_in, remaining_clearance_in,
    fits, sharpest_curve_deg, verdict,
    note: "A long rigid car on a curve is a chord across an arc. Its centre sits INSIDE the arc by the mid-ordinate of its truck-centre span, and its corners swing OUTSIDE it. Both matter and they matter in opposite directions: the middle of the car is the problem on the inside of a curve, near a platform or a signal, and the ends are the problem on the outside, near a structure or an adjacent track -- so a car that clears a platform may still catch a pole on the other side of the same curve. THE SWING GROWS WITH THE SQUARE OF LENGTH, which is the whole reason this is a routing question and not a car question. An eighty-nine foot car swings nearly six times as far as a forty-five foot one on the same curve, on identical track. That is why long cars, multi-level autoracks, and long flat loads carry routing restrictions that an ordinary boxcar does not, and why a dimensional load moves on an approved route rather than on any route -- the track is the same, the car is not. The job in the field is a fast go or no-go: given the car, the curve, and the measured distance to the obstruction, does it fit, and if not by how much. That last number is what decides whether the answer is a different route, a different car, or a shift of the load on the deck, and it is worth having before the car is loaded rather than after. The sharpest curve the load can negotiate at a stated clearance is the same relation worked backwards. A GEOMETRIC SCREEN ON ONE CURVE AND ONE OBSTRUCTION. It does not reproduce the AAR clearance plates, which define tangent-track envelopes by height as well as width and which the load has to fit inside before any of this applies. It does not account for superelevation, which leans a car toward the inside of a curve and moves the whole envelope; for lateral play in the trucks, worn centre plates, spring travel, or dynamic sway, all of which add to the static geometry; for the vertical envelope over crests and sags; or for the height of the obstruction against the height of the load, which is a separate check and often the governing one. Clearances measured from a nominal track centre do not account for track that has shifted. Dimensional and excess-dimension loads move under the carrier's clearance department and their approved route, and that approval is not this arithmetic. The AAR clearance plates and loading rules, the carrier's clearance department and route approval, and a field measurement govern.",
  };
}
const clearancePlateEnvelopeExample = { inputs: { truck_centres_ft: 73, car_length_ft: 89, car_width_in: 126, degree_of_curve: 5, clearance_to_obstruction_in: 132, required_clearance_in: 6 } };
RAIL_RENDERERS["clearance-plate-envelope"] = _simpleRenderer({
  citation: "Citation: the chord-offset relations by name -- R = 5,729.58 / degree of curve (the arc definition, the same one the degree-of-curve calculation uses); the car centre's mid-ordinate = truck centres squared / (8 R), swinging toward the INSIDE of the curve; and the end overhang = (car length squared - truck centres squared) / (8 R), swinging toward the OUTSIDE. A geometric screen on one curve and one obstruction: it does not reproduce the AAR clearance plates, or account for superelevation, truck lateral play, spring travel, dynamic sway, or the vertical envelope. The AAR clearance plates and loading rules, the carrier's clearance department and route approval, and a field measurement govern.",
  example: clearancePlateEnvelopeExample.inputs,
  fields: [
    { key: "truck_centres_ft", label: "Distance between truck centres (ft)", kind: "number", default: 73 },
    { key: "car_length_ft", label: "Car or load length over ends (ft)", kind: "number", default: 89 },
    { key: "car_width_in", label: "Car or load width (in)", kind: "number", default: 126 },
    { key: "degree_of_curve", label: "Degree of curve", kind: "number", default: 5 },
    { key: "clearance_to_obstruction_in", label: "Track centre to the obstruction (in, 0 to skip)", kind: "number", default: 132 },
    { key: "required_clearance_in", label: "Required clearance (in)", kind: "number", default: 6 },
  ],
  outputs: [
    { key: "r", id: "cpe-out-r", label: "Curve radius", value: (r) => fmt(r.radius_ft, 0) + " ft at " + fmt(r.degree_of_curve, 2) + " degrees" },
    { key: "m", id: "cpe-out-m", label: "Mid-ordinate at the car centre", value: (r) => fmt(r.mid_ordinate_in, 2) + " in toward the INSIDE of the curve -- the platform and signal side" },
    { key: "e", id: "cpe-out-e", label: "End overhang", value: (r) => fmt(r.end_overhang_in, 2) + " in toward the OUTSIDE -- the structure and adjacent-track side" },
    { key: "w", id: "cpe-out-w", label: "Effective half width", value: (r) => fmt(r.effective_half_width_in, 1) + " in from track centre, against " + fmt(r.half_width_in, 1) + " in on tangent" },
    { key: "v", id: "cpe-out-v", label: "Against the obstruction", value: (r) => r.verdict },
    { key: "s", id: "cpe-out-s", label: "Sharpest curve this load can take", value: (r) => r.sharpest_curve_deg === null ? "(no measured clearance, or none available at this width)" : (r.sharpest_curve_deg > 30 ? "sharper than any track this car would run on (" + fmt(r.sharpest_curve_deg, 0) + " degrees), so this obstruction does not restrict it" : fmt(r.sharpest_curve_deg, 2) + " degrees at the required clearance") },
    { key: "n", id: "cpe-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeClearancePlateEnvelope,
});
