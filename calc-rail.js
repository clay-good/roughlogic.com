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
