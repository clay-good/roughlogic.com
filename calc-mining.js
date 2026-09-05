// calc-mining.js -- Group E (cont.): mining, quarry, and drill-and-blast bench.
//
// specs/scope-trade-expansion-2.md probed the live catalog for the vocabulary
// of thirty US trades. Mining, quarry, and drill-and-blast came back ZERO --
// no powder factor, no pattern geometry, no vibration or airblast screen, no
// crusher or screen arithmetic, no dust collector ratio, no deflagration vent.
//
// Tiles (all group "E", the existing Carpentry and Construction category; a
// module is independent of the group letter per the v28/v70..v103 split
// precedent):
//   v1507 blast-powder-factor         v1512 crusher-reduction-ratio
//   v1508 blast-burden-spacing        v1513 screen-deck-capacity
//   v1509 blast-scaled-distance-ppv   v1514 belt-feeder-capacity
//   v1510 blast-airblast-overpressure v1515 dust-collector-air-to-cloth
//   v1511 blast-stemming-length       v1516 dust-deflagration-vent-area
//
// Blasting is a licensed activity and flyrock is a fatality mechanism;
// combustible dust deflagration is a life-safety design. None of these ships
// a regulatory limit: every limit, constant, and tested dust property is
// ENTERED. GOVERNANCE.general throughout -- the blaster in charge, the state
// and federal explosives regulations, MSHA or OSHA jurisdiction, the site's
// blast plan, NFPA 652/68/69, and a qualified engineer govern. See
// spec-v1507.md through spec-v1516.md.

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
// calc-rail.js / calc-elevator.js / calc-doorhardware.js _simpleRenderer).
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

export const MINING_RENDERERS = {};

// Water at 62.4 lb per cubic foot (the reference an explosive's specific
// gravity is taken against), 27 cubic ft per cubic yard, 2,000 lb per ton,
// and 144 square inches per square foot.
const _WATER_PCF = 62.4;
const _CUFT_PER_CY = 27;
const _LB_PER_TON = 2000;
const _SQIN_PER_SQFT = 144;
// The airblast decibel reference pressure, 2.9e-9 psi, and the SI conversions
// the NFPA 68 vent relation is written in.
const _AIRBLAST_REF_PSI = 2.9e-9;
const _M3_PER_FT3 = 0.028316846592;
const _M2_PER_FT2 = 0.09290304;
const _BAR_PER_PSI = 0.0689475729;

// ===================== spec-v1507: powder factor and explosive load =====================

// dims: in { burden_ft: L, spacing_ft: L, bench_height_ft: L, hole_diameter_in: L, subdrill_ft: L, stemming_ft: L, explosive_sg: dimensionless, rock_density_pcf: M L^-3, hole_count: dimensionless } out: { loading_density_lb_per_ft: M L^-1, charge_length_ft: L, charge_weight_lb: M L T^-2, rock_tons_per_hole: M, powder_factor_lb_per_ton: dimensionless }
export function computeBlastPowderFactor({ burden_ft = 0, spacing_ft = 0, bench_height_ft = 0, hole_diameter_in = 0, subdrill_ft = 0, stemming_ft = 0, explosive_sg = 0.82, rock_density_pcf = 0, hole_count = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(burden_ft > 0)) return { error: "Burden must be positive." };
  if (!(spacing_ft > 0)) return { error: "Spacing must be positive." };
  if (!(bench_height_ft > 0)) return { error: "Bench height must be positive." };
  if (!(hole_diameter_in > 0)) return { error: "Hole diameter must be positive." };
  if (!(subdrill_ft >= 0)) return { error: "Subdrill cannot be negative." };
  if (!(stemming_ft >= 0)) return { error: "Stemming cannot be negative." };
  if (!(explosive_sg > 0)) return { error: "Explosive specific gravity must be positive." };
  if (!(rock_density_pcf > 0)) return { error: "Rock density must be positive." };
  if (!(hole_count >= 1)) return { error: "Hole count must be at least 1." };
  const charge_length_ft = bench_height_ft + subdrill_ft - stemming_ft;
  if (!(charge_length_ft > 0)) return { error: "Stemming exceeds the hole depth -- there is no charge column." };
  const d_ft = hole_diameter_in / 12;
  const loading_density_lb_per_ft = (Math.PI / 4) * d_ft * d_ft * _WATER_PCF * explosive_sg;
  const charge_weight_lb = charge_length_ft * loading_density_lb_per_ft;
  const rock_volume_cuft = burden_ft * spacing_ft * bench_height_ft;
  const rock_volume_cy = rock_volume_cuft / _CUFT_PER_CY;
  const rock_tons_per_hole = rock_volume_cuft * rock_density_pcf / _LB_PER_TON;
  const powder_factor_lb_per_ton = charge_weight_lb / rock_tons_per_hole;
  const powder_factor_lb_per_cy = charge_weight_lb / rock_volume_cy;
  const total_explosive_lb = charge_weight_lb * hole_count;
  const total_tons = rock_tons_per_hole * hole_count;
  const hole_depth_ft = bench_height_ft + subdrill_ft;
  return {
    loading_density_lb_per_ft, charge_length_ft, charge_weight_lb, hole_depth_ft,
    rock_volume_cuft, rock_volume_cy, rock_tons_per_hole,
    powder_factor_lb_per_ton, powder_factor_lb_per_cy,
    total_explosive_lb, total_tons,
    note: "The pattern and the hole do the work together. Burden and spacing set how much rock a hole is responsible for; diameter and explosive density set how much energy is in it. Powder factor is just the ratio, and its value is that it is comparable across shots, benches, and years in a way that an eight by ten pattern is not. The two lengths that do not appear in the pattern matter as much as the ones that do. Subdrilling below grade, typically a third of the burden, is what keeps the toe from being left high, and a shot that leaves toe costs more in secondary breakage than the extra drilling ever did. Stemming, typically about seven tenths of the burden, is what keeps the gases in the hole long enough to break rock instead of venting; short stemming is the direct cause of flyrock and airblast. The charge weight per hole is also the number that goes into the vibration check -- per DELAY rather than per shot. This is pattern and charge arithmetic for a vertical production hole with a single continuous column charge. It does not design a blast, select an explosive, evaluate its suitability for wet holes, handle decked charges, air decks, or bottom-loaded holes with different products, or account for hole angle, which changes the true burden. It does not predict fragmentation, which powder factor is a proxy for and which depends on rock structure, jointing, and initiation timing far more than on the ratio itself, and it does not evaluate vibration, airblast, or flyrock, none of which are optional. Blasting is a licensed activity: the blaster in charge, the state and federal explosives regulations, MSHA or OSHA jurisdiction, and the site's blast plan govern.",
  };
}
const powderFactorExample = { inputs: { burden_ft: 8, spacing_ft: 10, bench_height_ft: 30, hole_diameter_in: 3.5, subdrill_ft: 2.4, stemming_ft: 5.6, explosive_sg: 1.25, rock_density_pcf: 165, hole_count: 40 } };
MINING_RENDERERS["blast-powder-factor"] = _simpleRenderer({
  citation: "Citation: the loading-density relation (pi / 4) x diameter squared x 62.4 lb per cubic foot x the explosive's specific gravity, with charge length = bench height + subdrill - stemming and powder factor = charge weight / rock tonnage, by name. Pattern and charge arithmetic only; the blaster in charge and the site's blast plan govern.",
  example: powderFactorExample.inputs,
  fields: [
    { key: "burden_ft", label: "Burden (ft)", kind: "number", default: 8 },
    { key: "spacing_ft", label: "Spacing (ft)", kind: "number", default: 10 },
    { key: "bench_height_ft", label: "Bench height (ft)", kind: "number", default: 30 },
    { key: "hole_diameter_in", label: "Hole diameter (in)", kind: "number", default: 3.5 },
    { key: "subdrill_ft", label: "Subdrill below grade (ft)", kind: "number", default: 2.4 },
    { key: "stemming_ft", label: "Stemming length (ft)", kind: "number", default: 5.6 },
    { key: "explosive_sg", label: "Explosive specific gravity", kind: "number", default: 1.25 },
    { key: "rock_density_pcf", label: "Rock density (lb per cu ft)", kind: "number", default: 165 },
    { key: "hole_count", label: "Holes in the shot", kind: "number", default: 40 },
  ],
  outputs: [
    { key: "l", id: "bpf-out-l", label: "Loading density", value: (r) => fmt(r.loading_density_lb_per_ft, 2) + " lb per ft of hole" },
    { key: "c", id: "bpf-out-c", label: "Charge column and weight per hole", value: (r) => fmt(r.charge_length_ft, 1) + " ft, " + fmt(r.charge_weight_lb, 0) + " lb" },
    { key: "r", id: "bpf-out-r", label: "Rock per hole", value: (r) => fmt(r.rock_tons_per_hole, 0) + " tons (" + fmt(r.rock_volume_cy, 0) + " cu yd)" },
    { key: "p", id: "bpf-out-p", label: "Powder factor", value: (r) => fmt(r.powder_factor_lb_per_ton, 3) + " lb per ton (" + fmt(r.powder_factor_lb_per_cy, 3) + " lb per cu yd)" },
    { key: "t", id: "bpf-out-t", label: "Whole shot", value: (r) => fmt(r.total_explosive_lb, 0) + " lb of explosive over " + fmt(r.total_tons, 0) + " tons" },
    { key: "d", id: "bpf-out-d", label: "Hole depth drilled", value: (r) => fmt(r.hole_depth_ft, 1) + " ft" },
    { key: "n", id: "bpf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlastPowderFactor,
});

// ===================== spec-v1508: burden and spacing layout =====================

// dims: in { hole_diameter_in: L, burden_ratio: dimensionless, bench_height_ft: L, spacing_ratio: dimensionless, subdrill_ratio: dimensionless, stemming_ratio: dimensionless } out: { burden_ft: L, spacing_ft: L, subdrill_ft: L, stemming_ft: L, stiffness_ratio: dimensionless, max_diameter_in: L }
export function computeBlastBurdenSpacing({ hole_diameter_in = 0, burden_ratio = 25, bench_height_ft = 0, spacing_ratio = 1.15, subdrill_ratio = 0.3, stemming_ratio = 0.7 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hole_diameter_in > 0)) return { error: "Hole diameter must be positive." };
  if (!(burden_ratio > 0)) return { error: "Burden ratio must be positive." };
  if (!(bench_height_ft > 0)) return { error: "Bench height must be positive." };
  if (!(spacing_ratio > 0)) return { error: "Spacing-to-burden ratio must be positive." };
  if (!(subdrill_ratio >= 0)) return { error: "Subdrill ratio cannot be negative." };
  if (!(stemming_ratio >= 0)) return { error: "Stemming ratio cannot be negative." };
  const burden_ft = burden_ratio * hole_diameter_in / 12;
  const spacing_ft = spacing_ratio * burden_ft;
  const subdrill_ft = subdrill_ratio * burden_ft;
  const stemming_ft = stemming_ratio * burden_ft;
  const stiffness_ratio = bench_height_ft / burden_ft;
  const stiff_ok = stiffness_ratio >= 2;
  const pattern_area_sqft = burden_ft * spacing_ft;
  const rock_volume_cy = pattern_area_sqft * bench_height_ft / _CUFT_PER_CY;
  // The largest hole this bench supports at the entered burden ratio, from
  // the stiffness requirement H / B >= 2.
  const max_diameter_in = bench_height_ft * 12 / (2 * burden_ratio);
  return {
    burden_ft, spacing_ft, subdrill_ft, stemming_ft, stiffness_ratio, stiff_ok,
    pattern_area_sqft, rock_volume_cy, max_diameter_in,
    stiff_verdict: stiff_ok
      ? "the bench will break properly to the free face"
      : "BELOW 2 -- this charge behaves like a crater and will vent rather than break; the fix is a SMALLER hole, not a wider pattern",
    note: "Every dimension in a blast pattern is a multiple of either the hole diameter or the burden, which is why one ratio propagates through the whole design. The burden ratio itself carries the rock and the explosive: a low ratio near 20 suits hard rock or a low-energy product, a high one near 35 suits soft rock and a high-energy product, and 25 is a common starting point for ANFO in medium rock. Stiffness ratio is the check that stops a bad pattern before it is drilled. A bench whose height is less than about twice the burden cannot break properly to the free face -- the charge behaves like a crater instead, venting upward, and the result is airblast, flyrock, and poor fragmentation. On a shallow bench the answer is a smaller diameter and a tighter pattern, not the same holes spread further apart, and this ratio is what makes that argument quantitatively. These are starting-point geometries from published ratio ranges, a first design to be adjusted against the rock actually in the face: jointing, bedding, mud seams, voids, and a variable free face all move the correct burden more than the ratios do, and a burden that is right on one end of a bench can be wrong on the other. The ratios assume a vertical or near-vertical hole to a clean free face with adequate relief; angled holes, choked faces, presplit lines, trim rows, and secondary blasting all follow different rules. It does not design the initiation sequence and timing, which controls relief, fragmentation, and vibration as much as the pattern does, and it does not evaluate flyrock, vibration, or airblast. Blasting is a licensed activity: the blaster in charge, the state and federal explosives regulations, MSHA or OSHA jurisdiction, and the site's blast plan govern.",
  };
}
const burdenSpacingExample = { inputs: { hole_diameter_in: 3.5, burden_ratio: 25, bench_height_ft: 30, spacing_ratio: 1.15, subdrill_ratio: 0.3, stemming_ratio: 0.7 } };
MINING_RENDERERS["blast-burden-spacing"] = _simpleRenderer({
  citation: "Citation: the published pattern ratios by name -- burden = burden ratio x hole diameter / 12 (ratio typically 20 to 35), spacing 1.15 to 1.4 x burden staggered, subdrill 0.2 to 0.5 x burden, stemming 0.7 to 1.0 x burden -- with the stiffness check bench height / burden >= 2. Starting-point geometry; the blaster in charge and the site's blast plan govern.",
  example: burdenSpacingExample.inputs,
  fields: [
    { key: "hole_diameter_in", label: "Hole diameter (in)", kind: "number", default: 3.5 },
    { key: "burden_ratio", label: "Burden ratio (burden per inch of diameter)", kind: "number", default: 25 },
    { key: "bench_height_ft", label: "Bench height (ft)", kind: "number", default: 30 },
    { key: "spacing_ratio", label: "Spacing-to-burden ratio", kind: "number", default: 1.15 },
    { key: "subdrill_ratio", label: "Subdrill-to-burden ratio", kind: "number", default: 0.3 },
    { key: "stemming_ratio", label: "Stemming-to-burden ratio", kind: "number", default: 0.7 },
  ],
  outputs: [
    { key: "b", id: "bbs-out-b", label: "Burden and spacing", value: (r) => fmt(r.burden_ft, 2) + " ft by " + fmt(r.spacing_ft, 2) + " ft" },
    { key: "j", id: "bbs-out-j", label: "Subdrill and stemming", value: (r) => fmt(r.subdrill_ft, 2) + " ft and " + fmt(r.stemming_ft, 2) + " ft" },
    { key: "s", id: "bbs-out-s", label: "Stiffness ratio", value: (r) => fmt(r.stiffness_ratio, 2) + " -- " + r.stiff_verdict },
    { key: "a", id: "bbs-out-a", label: "Rock per hole", value: (r) => fmt(r.pattern_area_sqft, 1) + " sq ft of pattern, " + fmt(r.rock_volume_cy, 1) + " cu yd" },
    { key: "d", id: "bbs-out-d", label: "Largest hole this bench supports", value: (r) => fmt(r.max_diameter_in, 2) + " in at the entered burden ratio" },
    { key: "n", id: "bbs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlastBurdenSpacing,
});

// ===================== spec-v1509: scaled distance and peak particle velocity =====================

// dims: in { distance_ft: L, charge_per_delay_lb: M L T^-2, site_k: dimensionless, site_b: dimensionless, ppv_limit_in_s: L T^-1, required_scaled_distance: dimensionless } out: { scaled_distance: dimensionless, predicted_ppv_in_s: L T^-1, max_charge_lb: M L T^-2, compliant_distance_ft: L }
export function computeBlastScaledDistancePPV({ distance_ft = 0, charge_per_delay_lb = 0, site_k = 160, site_b = 1.6, ppv_limit_in_s = 1, required_scaled_distance = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(distance_ft > 0)) return { error: "Distance to the structure must be positive." };
  if (!(charge_per_delay_lb > 0)) return { error: "Charge weight per delay must be positive." };
  if (!(site_k > 0)) return { error: "Site constant K must be positive." };
  if (!(site_b > 0)) return { error: "Site exponent b must be positive." };
  if (!(ppv_limit_in_s > 0)) return { error: "PPV limit must be positive." };
  if (!(required_scaled_distance > 0)) return { error: "Required scaled distance must be positive." };
  const scaled_distance = distance_ft / Math.sqrt(charge_per_delay_lb);
  const predicted_ppv_in_s = site_k * Math.pow(scaled_distance, -site_b);
  const margin_in_s = ppv_limit_in_s - predicted_ppv_in_s;
  const ppv_ok = predicted_ppv_in_s <= ppv_limit_in_s;
  const sd_ok = scaled_distance >= required_scaled_distance;
  const max_charge_lb = Math.pow(distance_ft / required_scaled_distance, 2);
  // The distance at which this charge meets the PPV limit: from
  // limit = K x (D / sqrt(W))^-b, D = sqrt(W) x (K / limit)^(1/b).
  const compliant_distance_ft = Math.sqrt(charge_per_delay_lb) * Math.pow(site_k / ppv_limit_in_s, 1 / site_b);
  const charge_headroom_lb = max_charge_lb - charge_per_delay_lb;
  return {
    scaled_distance, predicted_ppv_in_s, margin_in_s, ppv_ok, sd_ok,
    max_charge_lb, compliant_distance_ft, charge_headroom_lb,
    ppv_verdict: ppv_ok ? "under the entered PPV limit" : "OVER the entered PPV limit",
    sd_verdict: sd_ok
      ? "at or above the entered minimum scaled distance, so the no-monitoring path is available"
      : "BELOW the entered minimum scaled distance -- the no-monitoring path does not apply",
    note: "Vibration scales with charge weight per DELAY, not per shot, which is the whole reason delay initiation exists. A 10,000 lb shot fired on forty delays of 250 lb each produces the vibration of a 250 lb shot, and that single fact is what lets a quarry work near a town at all. Reading the charge weight per shot into this relation instead of per delay overstates the vibration enormously and is the most common misuse of it. The propagation constants are site-specific and vary widely with geology; the generic values are a starting point, and a site-specific regression from actual seismograph records is what a serious operation uses -- generic constants can be wrong by a factor of two in either direction. That is why most regulations offer two compliance paths: monitor every shot with a seismograph, or stay above a prescribed minimum scaled distance and skip the monitoring. The second path is conservative by design, and both are computed here. What this does NOT evaluate is frequency, and every modern vibration limit is frequency-dependent: the same peak particle velocity is acceptable at 40 Hz and not at 6 Hz, because low frequencies couple into structures. It does not address airblast, which is a separate limit and a separate calculation, or flyrock, and it does not perform a preblast survey, which is what actually resolves damage claims. Where a regulation requires monitoring this calculation does not substitute for it. Blasting is a licensed activity: the blaster in charge, the state and federal explosives regulations, MSHA or OSHA jurisdiction as applicable, and the site's blast plan govern.",
  };
}
const scaledDistanceExample = { inputs: { distance_ft: 1200, charge_per_delay_lb: 340, site_k: 160, site_b: 1.6, ppv_limit_in_s: 1, required_scaled_distance: 50 } };
MINING_RENDERERS["blast-scaled-distance-ppv"] = _simpleRenderer({
  citation: "Citation: the square-root scaled distance SD = distance / sqrt(charge per delay) and the propagation relation PPV = K x SD raised to minus b, by name, with the regulatory minimum-scaled-distance compliance path named as an alternative to seismograph monitoring. Site constants are entered; a site-specific regression is the defensible basis. The blaster in charge governs.",
  example: scaledDistanceExample.inputs,
  fields: [
    { key: "distance_ft", label: "Distance to the nearest protected structure (ft)", kind: "number", default: 1200 },
    { key: "charge_per_delay_lb", label: "Charge weight per DELAY (lb)", kind: "number", default: 340 },
    { key: "site_k", label: "Site propagation constant K", kind: "number", default: 160 },
    { key: "site_b", label: "Site propagation exponent b", kind: "number", default: 1.6 },
    { key: "ppv_limit_in_s", label: "Regulatory PPV limit (in/s)", kind: "number", default: 1 },
    { key: "required_scaled_distance", label: "Minimum scaled distance for the no-monitoring path", kind: "number", default: 50 },
  ],
  outputs: [
    { key: "s", id: "bsd-out-s", label: "Scaled distance", value: (r) => fmt(r.scaled_distance, 1) + " -- " + r.sd_verdict },
    { key: "p", id: "bsd-out-p", label: "Predicted peak particle velocity", value: (r) => fmt(r.predicted_ppv_in_s, 3) + " in/s -- " + r.ppv_verdict + ", margin " + fmt(r.margin_in_s, 3) + " in/s" },
    { key: "m", id: "bsd-out-m", label: "Largest charge per delay at the minimum scaled distance", value: (r) => fmt(r.max_charge_lb, 0) + " lb (" + fmt(r.charge_headroom_lb, 0) + " lb of headroom)" },
    { key: "d", id: "bsd-out-d", label: "Distance at which this charge meets the limit", value: (r) => fmt(r.compliant_distance_ft, 0) + " ft" },
    { key: "n", id: "bsd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlastScaledDistancePPV,
});

// ===================== spec-v1510: airblast overpressure =====================

// dims: in { distance_ft: L, charge_per_delay_lb: M L T^-2, airblast_k: dimensionless, airblast_b: dimensionless, limit_db: dimensionless } out: { cube_root_scaled_distance: dimensionless, overpressure_psi: M L^-1 T^-2, overpressure_db: dimensionless, limit_psi: M L^-1 T^-2, max_charge_lb: M L T^-2 }
export function computeBlastAirblastOverpressure({ distance_ft = 0, charge_per_delay_lb = 0, airblast_k = 0.2, airblast_b = 1.2, limit_db = 133, confinement_penalty_db = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(distance_ft > 0)) return { error: "Distance to the structure must be positive." };
  if (!(charge_per_delay_lb > 0)) return { error: "Charge weight per delay must be positive." };
  if (!(airblast_k > 0)) return { error: "Airblast constant K must be positive." };
  if (!(airblast_b > 0)) return { error: "Airblast exponent b must be positive." };
  if (!(limit_db > 0)) return { error: "Decibel limit must be positive." };
  if (!(confinement_penalty_db >= 0)) return { error: "Confinement penalty cannot be negative." };
  const cube_root_scaled_distance = distance_ft / Math.cbrt(charge_per_delay_lb);
  const overpressure_psi = airblast_k * Math.pow(cube_root_scaled_distance, -airblast_b);
  const overpressure_db = 20 * Math.log10(overpressure_psi / _AIRBLAST_REF_PSI);
  const limit_psi = _AIRBLAST_REF_PSI * Math.pow(10, limit_db / 20);
  const margin_db = limit_db - overpressure_db;
  const db_ok = overpressure_db <= limit_db;
  // The cube-root scaled distance that lands on the limit, and the charge and
  // distance that reach it.
  const sd_at_limit = Math.pow(limit_psi / airblast_k, -1 / airblast_b);
  const max_charge_lb = Math.pow(distance_ft / sd_at_limit, 3);
  const compliant_distance_ft = sd_at_limit * Math.cbrt(charge_per_delay_lb);
  // Halving the charge moves a cube-root scaled distance by 2^(1/3) where it
  // would move a square-root one by 2^(1/2): charge weight is the weaker
  // lever on airblast than it is on ground vibration.
  const halved_charge_sd = distance_ft / Math.cbrt(charge_per_delay_lb / 2);
  const halving_gain_pct = (halved_charge_sd / cube_root_scaled_distance - 1) * 100;
  // What the same shot reads if it vents: decibels are logarithmic, so a
  // 20 dB penalty is a factor of ten in pressure and no pattern change
  // recovers it.
  const vented_db = overpressure_db + confinement_penalty_db;
  const vented_psi = _AIRBLAST_REF_PSI * Math.pow(10, vented_db / 20);
  const vented_ok = vented_db <= limit_db;
  const vented_pressure_factor = Math.pow(10, confinement_penalty_db / 20);
  return {
    cube_root_scaled_distance, overpressure_psi, overpressure_db, limit_psi,
    margin_db, db_ok, sd_at_limit, max_charge_lb, compliant_distance_ft,
    halved_charge_sd, halving_gain_pct,
    vented_db, vented_psi, vented_ok, vented_pressure_factor,
    verdict: db_ok ? "under the entered decibel limit" : "OVER the entered decibel limit",
    note: "The cube root is the physical difference from ground vibration. Airblast is an expanding spherical pressure wave in air, so it scales with the cube root of energy, while ground vibration scales with the square root -- which means charge weight has LESS leverage on airblast than on vibration, and halving a charge buys about a quarter more scaled distance where the same halving buys about forty percent on the ground side. What matters more is confinement and weather. Confinement dominates. A properly stemmed hole releases almost nothing to the air; a hole with short stemming, an exposed detonating cord trunkline, a mud seam that vents, or an unstemmed secondary charge can be tens of decibels worse for the same pounds, and because decibels are logarithmic, 20 dB is a factor of ten in pressure. No adjustment to the pattern buys that back: the fix is stemming, covered trunklines, and not shooting into a wind or an inversion. Weather is the other multiplier, and a temperature inversion or a wind toward the neighbours can focus airblast well above any flat-ground prediction, which is why blast plans carry wind and inversion restrictions that no formula replaces. The constants depend heavily on confinement and this cannot know whether a hole will vent. It does not address ground vibration, flyrock, or the structure-response question of what overpressure actually damages what, and decibel limits and their measurement weighting differ between jurisdictions. Blasting is a licensed activity: the blaster in charge, the state and federal explosives regulations, MSHA or OSHA jurisdiction, and the site's blast plan govern.",
  };
}
const airblastExample = { inputs: { distance_ft: 1200, charge_per_delay_lb: 340, airblast_k: 0.02, airblast_b: 1.2, limit_db: 133 } };
MINING_RENDERERS["blast-airblast-overpressure"] = _simpleRenderer({
  citation: "Citation: the cube-root scaled distance SD = distance / cube root of the charge per delay, the overpressure relation P = K x SD raised to minus b, and the decibel conversion 20 log10(P / 2.9e-9 psi), by name. Site constants depend heavily on confinement and are entered. The blaster in charge and the site's blast plan govern.",
  example: airblastExample.inputs,
  fields: [
    { key: "distance_ft", label: "Distance to the nearest structure (ft)", kind: "number", default: 1200 },
    { key: "charge_per_delay_lb", label: "Charge weight per delay (lb)", kind: "number", default: 340 },
    { key: "airblast_k", label: "Airblast constant K (psi)", kind: "number", default: 0.2 },
    { key: "airblast_b", label: "Airblast exponent b", kind: "number", default: 1.2 },
    { key: "limit_db", label: "Regulatory limit (dB linear peak)", kind: "number", default: 133 },
    { key: "confinement_penalty_db", label: "Penalty if the hole vents (dB)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "s", id: "bao-out-s", label: "Cube-root scaled distance", value: (r) => fmt(r.cube_root_scaled_distance, 1) },
    { key: "p", id: "bao-out-p", label: "Predicted overpressure", value: (r) => fmt(r.overpressure_db, 1) + " dB (" + fmt(r.overpressure_psi, 6) + " psi) -- " + r.verdict + ", margin " + fmt(r.margin_db, 1) + " dB" },
    { key: "v", id: "bao-out-v", label: "The same shot if the hole vents", value: (r) => fmt(r.vented_db, 1) + " dB, " + fmt(r.vented_pressure_factor, 0) + " times the pressure -- " + (r.vented_ok ? "still under the limit" : "OVER the limit") },
    { key: "l", id: "bao-out-l", label: "The limit as a pressure", value: (r) => fmt(r.limit_psi, 6) + " psi" },
    { key: "m", id: "bao-out-m", label: "Largest charge that meets the limit here", value: (r) => fmt(r.max_charge_lb, 0) + " lb per delay" },
    { key: "d", id: "bao-out-d", label: "Distance at which this charge meets it", value: (r) => fmt(r.compliant_distance_ft, 0) + " ft" },
    { key: "h", id: "bao-out-h", label: "What halving the charge buys", value: (r) => fmt(r.halving_gain_pct, 0) + "% more scaled distance (the square-root law would give 41%)" },
    { key: "n", id: "bao-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlastAirblastOverpressure,
});

// ===================== spec-v1511: stemming length and flyrock screen =====================

// dims: in { burden_ft: L, hole_diameter_in: L, proposed_stemming_ft: L, burden_ratio_low: dimensionless, burden_ratio_high: dimensionless, diameter_multiple: dimensionless } out: { by_burden_ft: L, by_diameter_ft: L, governing_ft: L, achieved_ratio: dimensionless, stone_min_in: L, stone_max_in: L }
export function computeBlastStemmingLength({ burden_ft = 0, hole_diameter_in = 0, proposed_stemming_ft = 0, burden_ratio_low = 0.7, burden_ratio_high = 1.0, diameter_multiple = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(burden_ft > 0)) return { error: "Burden must be positive." };
  if (!(hole_diameter_in > 0)) return { error: "Hole diameter must be positive." };
  if (!(proposed_stemming_ft > 0)) return { error: "Proposed stemming length must be positive." };
  if (!(burden_ratio_low > 0)) return { error: "Low stemming ratio must be positive." };
  if (!(burden_ratio_high >= burden_ratio_low)) return { error: "High stemming ratio cannot be below the low one." };
  if (!(diameter_multiple > 0)) return { error: "Diameter multiple must be positive." };
  const by_burden_ft = burden_ratio_low * burden_ft;
  const by_burden_high_ft = burden_ratio_high * burden_ft;
  const by_diameter_ft = diameter_multiple * hole_diameter_in / 12;
  const governing_ft = Math.max(by_burden_ft, by_diameter_ft);
  const achieved_ratio = proposed_stemming_ft / burden_ft;
  const meets_governing = proposed_stemming_ft >= governing_ft;
  const flyrock_risk = achieved_ratio < burden_ratio_low;
  const shortfall_ft = Math.max(0, governing_ft - proposed_stemming_ft);
  const stone_min_in = hole_diameter_in / 20;
  const stone_max_in = hole_diameter_in / 10;
  return {
    by_burden_ft, by_burden_high_ft, by_diameter_ft, governing_ft, achieved_ratio,
    meets_governing, flyrock_risk, shortfall_ft, stone_min_in, stone_max_in,
    verdict: meets_governing
      ? "the proposed stemming meets the governing length"
      : "SHORT by " + fmt(shortfall_ft, 2) + " ft of the governing length",
    risk_verdict: flyrock_risk
      ? "FLYROCK RISK -- the stemming-to-burden ratio is below the low end of the range; this hole will vent and the material above the charge is going somewhere"
      : "the stemming-to-burden ratio is inside the range",
    note: "Stemming is the plug that keeps explosive gases in the hole long enough to break rock instead of blowing out the top. When it is too short the gases take the path of least resistance straight up, and everything above the charge leaves at speed. The collar region is also where the burden is least confined, so it is doubly the place where things go wrong. The material matters nearly as much as the length. Angular crushed stone sized around a tenth to a twentieth of the hole diameter locks and holds; drill cuttings, which are free and right there, fluidize and blow out, and using them is a documented contributor to flyrock incidents. The recommended stone size is reported alongside the length because in the field those two decisions are made at the same moment, by the same person, standing at the collar. One more field reality: this check belongs against the SHORTEST stemming in the shot, not the average, because one short hole is enough. Where a nearby structure, road, or occupied area is in play, the practice is to move toward the high end of the ratio range rather than the low one, accept the slightly worse fragmentation at the collar, and deal with the oversize at the crusher instead of on the neighbour's roof. This does not predict flyrock distance or throw, which depends on rock structure, voids and mud seams, face burden variation, initiation timing, and confinement -- and face burden variation, not the design burden, is the usual real cause, which measuring the actual face profile before loading is what catches. It does not design blast area security, determine the blast danger zone or evacuation radius, or address mats and covers. Blasting is a licensed activity and flyrock is a fatality mechanism: the blaster in charge, the state and federal explosives regulations, MSHA or OSHA jurisdiction, and the site's blast plan govern.",
  };
}
const stemmingExample = { inputs: { burden_ft: 8, hole_diameter_in: 3.5, proposed_stemming_ft: 4, burden_ratio_low: 0.7, burden_ratio_high: 1.0, diameter_multiple: 20 } };
MINING_RENDERERS["blast-stemming-length"] = _simpleRenderer({
  citation: "Citation: the published stemming rules by name -- 0.7 to 1.0 times the burden, and at least 20 hole diameters -- with the LARGER of the two governing, and angular crushed stone sized a tenth to a twentieth of the hole diameter rather than drill cuttings. Flyrock is a fatality mechanism; the blaster in charge and the site's blast plan govern.",
  example: stemmingExample.inputs,
  fields: [
    { key: "burden_ft", label: "Burden (ft)", kind: "number", default: 8 },
    { key: "hole_diameter_in", label: "Hole diameter (in)", kind: "number", default: 3.5 },
    { key: "proposed_stemming_ft", label: "Proposed (or shortest measured) stemming (ft)", kind: "number", default: 4 },
    { key: "burden_ratio_low", label: "Low stemming-to-burden ratio", kind: "number", default: 0.7 },
    { key: "burden_ratio_high", label: "High stemming-to-burden ratio", kind: "number", default: 1.0 },
    { key: "diameter_multiple", label: "Minimum stemming in hole diameters", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "b", id: "bsl-out-b", label: "By the burden rule", value: (r) => fmt(r.by_burden_ft, 2) + " ft (up to " + fmt(r.by_burden_high_ft, 2) + " ft where flyrock matters)" },
    { key: "d", id: "bsl-out-d", label: "By the diameter rule", value: (r) => fmt(r.by_diameter_ft, 2) + " ft" },
    { key: "g", id: "bsl-out-g", label: "Governing stemming length", value: (r) => fmt(r.governing_ft, 2) + " ft -- " + r.verdict },
    { key: "r", id: "bsl-out-r", label: "Achieved stemming-to-burden ratio", value: (r) => fmt(r.achieved_ratio, 2) + " -- " + r.risk_verdict },
    { key: "s", id: "bsl-out-s", label: "Stemming stone size", value: (r) => fmt(r.stone_min_in, 2) + " to " + fmt(r.stone_max_in, 2) + " in angular crushed stone, NOT drill cuttings" },
    { key: "n", id: "bsl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlastStemmingLength,
});

// ===================== spec-v1512: crusher reduction ratio =====================

// dims: in { feed_size_in: L, product_size_in: L, stages: dimensionless, machine_ratio_low: dimensionless, machine_ratio_high: dimensionless, actual_intermediate_in: L } out: { total_ratio: dimensionless, per_stage_ratio: dimensionless, first_intermediate_in: L, second_intermediate_in: L, stages_required: dimensionless, actual_downstream_ratio: dimensionless }
export function computeCrusherReductionRatio({ feed_size_in = 0, product_size_in = 0, stages = 2, machine_ratio_low = 3, machine_ratio_high = 6, actual_intermediate_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(feed_size_in > 0)) return { error: "Feed size must be positive." };
  if (!(product_size_in > 0)) return { error: "Product size must be positive." };
  if (!(feed_size_in > product_size_in)) return { error: "Feed size must exceed product size." };
  if (!(stages >= 1)) return { error: "Stage count must be at least 1." };
  if (!(machine_ratio_low > 1)) return { error: "The low end of the machine ratio range must exceed 1." };
  if (!(machine_ratio_high >= machine_ratio_low)) return { error: "The high end of the machine ratio range cannot be below the low end." };
  if (!(actual_intermediate_in > product_size_in)) return { error: "The measured intermediate size must exceed the product size." };
  const total_ratio = feed_size_in / product_size_in;
  const per_stage_ratio = Math.pow(total_ratio, 1 / stages);
  const in_range = per_stage_ratio >= machine_ratio_low && per_stage_ratio <= machine_ratio_high;
  const first_intermediate_in = feed_size_in / per_stage_ratio;
  const second_intermediate_in = first_intermediate_in / per_stage_ratio;
  // Stages needed to keep every machine at the top of its range.
  const stages_required = Math.ceil(Math.log(total_ratio) / Math.log(machine_ratio_high));
  const comfortable_ratio = Math.pow(total_ratio, 1 / stages_required);
  // The diagnostic: what the downstream machine is actually being asked for
  // when the upstream one is not reducing as planned.
  const actual_downstream_ratio = actual_intermediate_in / product_size_in;
  const downstream_in_range = actual_downstream_ratio <= machine_ratio_high;
  return {
    total_ratio, per_stage_ratio, in_range, first_intermediate_in, second_intermediate_in,
    stages_required, comfortable_ratio, actual_downstream_ratio, downstream_in_range,
    stage_verdict: in_range
      ? "each stage sits inside the entered machine range"
      : per_stage_ratio > machine_ratio_high
        ? "OVER the entered machine range -- this circuit needs more stages"
        : "under the entered range, so a stage is doing less than it could",
    diagnostic: downstream_in_range
      ? "the downstream machine is inside its range at the measured intermediate size"
      : "the downstream machine is being asked for a ratio OUTSIDE its range -- the problem is upstream of it and no adjustment there fixes it",
    note: "Ratios MULTIPLY through a circuit, which is why a plant reducing two-foot feed to a three-quarter-inch product needs a total ratio in the thirties and cannot get there in one machine. Splitting it across two stages is workable for a jaw then a cone, but puts both machines at the top of their range, which means wear, heat, and no margin when the feed gets blocky. Across three stages every machine sits in the comfortable middle, which is why most aggregate plants are three-stage and why the third crusher usually pays for itself in liner life and uptime rather than in tonnage. The field value here is diagnostic rather than design. When a plant is not making spec or a machine is running hot and passing oversize, computing the ratio each machine is ACTUALLY being asked to perform usually identifies the offender in one line: a cone being fed material the jaw did not reduce enough is being asked for a ratio outside its range, and no adjustment at the cone fixes a problem upstream of it. This is reduction ratio arithmetic on 80 percent passing sizes. It does not size a crusher, predict capacity or power draw, or generate a product gradation -- those come from the manufacturer's capacity tables and closed-side-setting curves for the specific machine and material, and gradation depends strongly on rock friability and on whether the circuit is open or closed. Closed-circuit operation with recirculating load changes the effective ratio and the tonnage through the machine substantially and is not modelled. It does not evaluate feed gradation, moisture, clay content, or the surge and screening capacity between stages, which is usually what actually limits a plant. The crusher manufacturer's selection data and the plant designer govern.",
  };
}
const crusherExample = { inputs: { feed_size_in: 24, product_size_in: 0.75, stages: 2, machine_ratio_low: 3, machine_ratio_high: 6, actual_intermediate_in: 6 } };
MINING_RENDERERS["crusher-reduction-ratio"] = _simpleRenderer({
  citation: "Citation: the reduction ratio R = feed size / product size on 80 percent passing sizes, with circuit ratios MULTIPLYING through the stages so an even split is the total raised to one over the stage count, by name. Typical machine ranges (jaw 4 to 6, gyratory 4 to 7, cone 3 to 6, impactor 10 to 20, roll 2 to 4) are entered. The crusher manufacturer's selection data governs.",
  example: crusherExample.inputs,
  fields: [
    { key: "feed_size_in", label: "Feed size, 80% passing (in)", kind: "number", default: 24 },
    { key: "product_size_in", label: "Product size, 80% passing (in)", kind: "number", default: 0.75 },
    { key: "stages", label: "Crushing stages in the circuit", kind: "number", default: 2 },
    { key: "machine_ratio_low", label: "Machine ratio range, low", kind: "number", default: 3 },
    { key: "machine_ratio_high", label: "Machine ratio range, high", kind: "number", default: 6 },
    { key: "actual_intermediate_in", label: "Measured size out of the first stage (in)", kind: "number", default: 6 },
  ],
  outputs: [
    { key: "t", id: "crr-out-t", label: "Circuit reduction ratio", value: (r) => fmt(r.total_ratio, 2) + " to 1" },
    { key: "s", id: "crr-out-s", label: "Per stage at the entered stage count", value: (r) => fmt(r.per_stage_ratio, 2) + " to 1 -- " + r.stage_verdict },
    { key: "i", id: "crr-out-i", label: "Intermediate sizes an even split implies", value: (r) => fmt(r.first_intermediate_in, 2) + " in, then " + fmt(r.second_intermediate_in, 2) + " in" },
    { key: "n2", id: "crr-out-n2", label: "Stages the target actually needs", value: (r) => fmt(r.stages_required, 0) + " at " + fmt(r.comfortable_ratio, 2) + " to 1 each" },
    { key: "d", id: "crr-out-d", label: "What the next machine is really being asked for", value: (r) => fmt(r.actual_downstream_ratio, 2) + " to 1 -- " + r.diagnostic },
    { key: "n", id: "crr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCrusherReductionRatio,
});

// ===================== spec-v1513: vibrating screen deck capacity =====================

// dims: in { deck_width_ft: L, deck_length_ft: L, base_capacity_tph_per_sqft: M T^-1 L^-2, oversize_factor: dimensionless, halfsize_factor: dimensionless, deck_factor: dimensionless, wet_factor: dimensionless, efficiency_factor: dimensionless, actual_feed_tph: M T^-1 } out: { screen_area_sqft: L^2, combined_multiplier: dimensionless, capacity_tph: M T^-1, percent_of_capacity: dimensionless, area_required_sqft: L^2 }
export function computeScreenDeckCapacity({ deck_width_ft = 0, deck_length_ft = 0, base_capacity_tph_per_sqft = 0, oversize_factor = 1, halfsize_factor = 1, deck_factor = 1, wet_factor = 1, efficiency_factor = 1, actual_feed_tph = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(deck_width_ft > 0)) return { error: "Deck width must be positive." };
  if (!(deck_length_ft > 0)) return { error: "Deck length must be positive." };
  if (!(base_capacity_tph_per_sqft > 0)) return { error: "Base capacity must be positive." };
  for (const [name, v] of [["oversize", oversize_factor], ["halfsize", halfsize_factor], ["deck position", deck_factor], ["wet screening", wet_factor], ["efficiency", efficiency_factor]]) {
    if (!(v > 0)) return { error: "The " + name + " factor must be positive." };
  }
  if (!(actual_feed_tph > 0)) return { error: "Actual feed rate must be positive." };
  const screen_area_sqft = deck_width_ft * deck_length_ft;
  const combined_multiplier = oversize_factor * halfsize_factor * deck_factor * wet_factor * efficiency_factor;
  const capacity_tph = screen_area_sqft * base_capacity_tph_per_sqft * combined_multiplier;
  const percent_of_capacity = actual_feed_tph / capacity_tph * 100;
  const over_capacity = actual_feed_tph > capacity_tph;
  const area_required_sqft = actual_feed_tph / (base_capacity_tph_per_sqft * combined_multiplier);
  const headroom_tph = capacity_tph - actual_feed_tph;
  return {
    screen_area_sqft, combined_multiplier, capacity_tph, percent_of_capacity,
    over_capacity, area_required_sqft, headroom_tph,
    verdict: over_capacity
      ? "OVER capacity -- the bed is too deep for particles to reach the wire, and oversize in the product is an AREA problem with no mechanical fault anywhere"
      : "inside capacity at the entered feed rate",
    note: "Every factor in the chain is a departure from a reference condition, and the chain is multiplicative, so the errors compound rather than average. The two that dominate are the halfsize and oversize factors: a feed with a lot of material smaller than half the opening screens far faster than the base rate, and a feed sitting right at the opening size screens far slower. That is why a screen comfortable on one gradation blinds and floods on another from the same pit, and why tightening a crusher upstream can cost a deck a third of its capacity without anyone touching the screen. For field use the important output is not the capacity number, it is the comparison against what the deck is actually being fed. A deck running above its calculated capacity carries a bed too deep for particles to reach the wire, and the symptom is oversize in the product with no mechanical fault anywhere -- the screen is working correctly and is simply out of area. Knowing that stops a crew from chasing stroke, slope, and wire tension for a problem none of them can fix. The base capacity and every factor come from the screen manufacturer's published tables and differ between manufacturers and between media types; this does not ship them and the result is only as good as the values entered. It does not size the drive, select stroke, speed, or slope, choose screen media, or evaluate blinding and pegging, which are material-property problems -- clay, moisture, flaky particles, near-size material -- that no capacity formula predicts. It does not compute screening efficiency or the recirculating load in a closed circuit, both of which change the tonnage the deck actually sees, and structural capacity and the deck's rated load are separate limits. The screen manufacturer's selection data and the plant designer govern.",
  };
}
const screenDeckExample = { inputs: { deck_width_ft: 8, deck_length_ft: 20, base_capacity_tph_per_sqft: 3.5, oversize_factor: 1.1, halfsize_factor: 1.15, deck_factor: 0.9, wet_factor: 1.25, efficiency_factor: 0.95, actual_feed_tph: 400 } };
MINING_RENDERERS["screen-deck-capacity"] = _simpleRenderer({
  citation: "Citation: the multiplicative factor method by name -- capacity = screen area x base capacity for the opening x the product of the oversize, halfsize, deck position, wet screening, and efficiency factors. Every factor comes from the screen manufacturer's published tables and is entered rather than shipped. The manufacturer's selection data governs.",
  example: screenDeckExample.inputs,
  fields: [
    { key: "deck_width_ft", label: "Deck width (ft)", kind: "number", default: 8 },
    { key: "deck_length_ft", label: "Deck length (ft)", kind: "number", default: 20 },
    { key: "base_capacity_tph_per_sqft", label: "Base capacity for the opening (TPH per sq ft)", kind: "number", default: 3.5 },
    { key: "oversize_factor", label: "Oversize factor", kind: "number", default: 1.1 },
    { key: "halfsize_factor", label: "Halfsize factor", kind: "number", default: 1.15 },
    { key: "deck_factor", label: "Deck position factor", kind: "number", default: 0.9 },
    { key: "wet_factor", label: "Wet screening factor", kind: "number", default: 1.25 },
    { key: "efficiency_factor", label: "Efficiency factor", kind: "number", default: 0.95 },
    { key: "actual_feed_tph", label: "Actual feed to the deck (TPH)", kind: "number", default: 400 },
  ],
  outputs: [
    { key: "a", id: "sdc-out-a", label: "Screen area", value: (r) => fmt(r.screen_area_sqft, 0) + " sq ft" },
    { key: "m", id: "sdc-out-m", label: "Combined multiplier", value: (r) => fmt(r.combined_multiplier, 3) },
    { key: "c", id: "sdc-out-c", label: "Calculated capacity", value: (r) => fmt(r.capacity_tph, 0) + " TPH" },
    { key: "p", id: "sdc-out-p", label: "Actual feed against it", value: (r) => fmt(r.percent_of_capacity, 0) + "% of capacity -- " + r.verdict },
    { key: "r", id: "sdc-out-r", label: "Area the actual feed requires", value: (r) => fmt(r.area_required_sqft, 0) + " sq ft" },
    { key: "n", id: "sdc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeScreenDeckCapacity,
});

// ===================== spec-v1514: belt feeder volumetric capacity =====================

// dims: in { opening_width_in: L, opening_height_in: L, belt_speed_fpm: L T^-1, bulk_density_pcf: M L^-3, target_tph: M T^-1, alternative_density_pcf: M L^-3 } out: { volumetric_cfh: L^3 T^-1, tph: M T^-1, required_speed_fpm: L T^-1, required_opening_in: L, alternative_tph: M T^-1 }
export function computeBeltFeederCapacity({ opening_width_in = 0, opening_height_in = 0, belt_speed_fpm = 0, bulk_density_pcf = 0, target_tph = 0, alternative_density_pcf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(opening_width_in > 0)) return { error: "Opening width must be positive." };
  if (!(opening_height_in > 0)) return { error: "Gate opening height must be positive." };
  if (!(belt_speed_fpm > 0)) return { error: "Belt speed must be positive." };
  if (!(bulk_density_pcf > 0)) return { error: "Bulk density must be positive." };
  if (!(target_tph > 0)) return { error: "Target tonnage must be positive." };
  if (!(alternative_density_pcf > 0)) return { error: "Alternative bulk density must be positive." };
  const w_ft = opening_width_in / 12;
  const h_ft = opening_height_in / 12;
  const cross_section_sqft = w_ft * h_ft;
  const volumetric_cfh = cross_section_sqft * belt_speed_fpm * 60;
  const tph = volumetric_cfh * bulk_density_pcf / _LB_PER_TON;
  const required_speed_fpm = target_tph * _LB_PER_TON / (cross_section_sqft * bulk_density_pcf * 60);
  const required_opening_in = target_tph * _LB_PER_TON / (w_ft * belt_speed_fpm * bulk_density_pcf * 60) * 12;
  const alternative_tph = volumetric_cfh * alternative_density_pcf / _LB_PER_TON;
  const density_change_pct = (alternative_tph / tph - 1) * 100;
  return {
    cross_section_sqft, volumetric_cfh, tph, required_speed_fpm, required_opening_in,
    alternative_tph, density_change_pct,
    note: "A belt feeder is a metering device: the material sits in a hopper and the belt pulls a ribbon out from under it whose cross-section is fixed by the gate opening. Output is therefore linear in speed, which is what makes a feeder controllable, and linear in the opening, which is what makes it adjustable. A conveyor, by contrast, carries whatever is put on it in a surcharged profile, and its capacity relation does not apply here at all. The density check is worth running in the field, because it is the quiet way a plant changes its tonnage without changing a setting: the same feeder on a heavier ore delivers proportionally more at exactly the same gate and speed, so a feeder calibrated on one material is not calibrated on another. The failure the arithmetic does not capture is ratholing. A feeder that draws material from only part of the hopper opening -- because the belt speed profile is uneven or the interface is badly designed -- creates a flow channel while the rest of the hopper stays static, and the static material eventually consolidates into an arch that stops flow entirely. The fix is an interface that increases in cross-section in the direction of travel so the belt draws progressively along the whole opening, and it is a design feature rather than an adjustment. This assumes the material fills the opening uniformly and flows freely, which is exactly what does not happen with wet, sticky, or cohesive material: arching, ratholing, and flushing depend on the material's shear properties and the hopper's geometry and are resolved by a flow-properties test and a hopper design. It does not compute the belt pull or drive power a feeder requires, which is much higher than a conveyor's because the belt is shearing material under a full hopper load, and which is a common undersizing error. The feeder manufacturer, a material flow-properties test, and the plant designer govern.",
  };
}
const beltFeederExample = { inputs: { opening_width_in: 36, opening_height_in: 8, belt_speed_fpm: 60, bulk_density_pcf: 100, target_tph: 400, alternative_density_pcf: 160 } };
MINING_RENDERERS["belt-feeder-capacity"] = _simpleRenderer({
  citation: "Citation: the metering relation for a fixed rectangular gate by name -- volumetric flow = opening width x opening height x belt speed, and tonnage = that volume x bulk density / 2,000 -- which is a feeder's relation and NOT a conveyor's surcharged-profile one. The feeder manufacturer and a material flow-properties test govern.",
  example: beltFeederExample.inputs,
  fields: [
    { key: "opening_width_in", label: "Gate opening width (in)", kind: "number", default: 36 },
    { key: "opening_height_in", label: "Gate opening height (in)", kind: "number", default: 8 },
    { key: "belt_speed_fpm", label: "Belt speed (fpm)", kind: "number", default: 60 },
    { key: "bulk_density_pcf", label: "Material bulk density (lb per cu ft)", kind: "number", default: 100 },
    { key: "target_tph", label: "Target tonnage (TPH)", kind: "number", default: 400 },
    { key: "alternative_density_pcf", label: "Alternative material density (lb per cu ft)", kind: "number", default: 160 },
  ],
  outputs: [
    { key: "q", id: "bfc-out-q", label: "Volumetric flow", value: (r) => fmt(r.volumetric_cfh, 0) + " cu ft/h from " + fmt(r.cross_section_sqft, 3) + " sq ft of opening" },
    { key: "t", id: "bfc-out-t", label: "Mass flow", value: (r) => fmt(r.tph, 1) + " TPH" },
    { key: "s", id: "bfc-out-s", label: "Belt speed for the target tonnage", value: (r) => fmt(r.required_speed_fpm, 1) + " fpm" },
    { key: "o", id: "bfc-out-o", label: "Gate opening for the target at the current speed", value: (r) => fmt(r.required_opening_in, 2) + " in" },
    { key: "d", id: "bfc-out-d", label: "Same setting on the alternative material", value: (r) => fmt(r.alternative_tph, 1) + " TPH (" + fmt(r.density_change_pct, 0) + "% change)" },
    { key: "n", id: "bfc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBeltFeederCapacity,
});

// ===================== spec-v1515: dust collector air-to-cloth ratio =====================

// dims: in { airflow_cfm: L^3 T^-1, bag_count: dimensionless, bag_diameter_in: L, bag_length_ft: L, range_low: L T^-1, range_high: L T^-1, bags_out_of_service: dimensionless } out: { cloth_area_sqft: L^2, air_to_cloth: L T^-1, derated_cloth_area_sqft: L^2, derated_air_to_cloth: L T^-1, max_airflow_cfm: L^3 T^-1 }
export function computeDustCollectorAirToCloth({ airflow_cfm = 0, bag_count = 0, bag_diameter_in = 0, bag_length_ft = 0, range_low = 3, range_high = 5, bags_out_of_service = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(airflow_cfm > 0)) return { error: "System airflow must be positive." };
  if (!(bag_count >= 1)) return { error: "Bag count must be at least 1." };
  if (!(bag_diameter_in > 0)) return { error: "Bag diameter must be positive." };
  if (!(bag_length_ft > 0)) return { error: "Bag length must be positive." };
  if (!(range_low > 0)) return { error: "The low end of the range must be positive." };
  if (!(range_high >= range_low)) return { error: "The high end of the range cannot be below the low end." };
  if (!(bags_out_of_service >= 0)) return { error: "Bags out of service cannot be negative." };
  if (!(bags_out_of_service < bag_count)) return { error: "Bags out of service must be fewer than the bag count." };
  const area_per_bag_sqft = Math.PI * (bag_diameter_in / 12) * bag_length_ft;
  const cloth_area_sqft = bag_count * area_per_bag_sqft;
  const air_to_cloth = airflow_cfm / cloth_area_sqft;
  const in_range = air_to_cloth >= range_low && air_to_cloth <= range_high;
  const derated_cloth_area_sqft = (bag_count - bags_out_of_service) * area_per_bag_sqft;
  const derated_air_to_cloth = airflow_cfm / derated_cloth_area_sqft;
  const derated_increase_pct = (derated_air_to_cloth / air_to_cloth - 1) * 100;
  const derated_in_range = derated_air_to_cloth >= range_low && derated_air_to_cloth <= range_high;
  const max_airflow_cfm = cloth_area_sqft * range_high;
  const airflow_headroom_cfm = max_airflow_cfm - airflow_cfm;
  return {
    area_per_bag_sqft, cloth_area_sqft, air_to_cloth, in_range,
    derated_cloth_area_sqft, derated_air_to_cloth, derated_increase_pct, derated_in_range,
    max_airflow_cfm, airflow_headroom_cfm,
    verdict: in_range ? "inside the entered range for this cleaning type"
      : air_to_cloth > range_high
        ? "ABOVE the entered range -- the dust cake is being driven into the weave rather than sitting on it, and the blinding that follows is not recoverable by cleaning"
        : "below the entered range, which is conservative rather than harmful",
    note: "The ratio is a velocity: how fast air is being pushed through the fabric. Push too fast and the dust cake is driven into the weave instead of sitting on it, the cleaning pulse can no longer release it, and the collector blinds permanently -- a failure that shows up as rising differential pressure over weeks and is not recoverable by cleaning. Push slowly enough and the cake stays on the surface where it belongs and does most of the filtering. Two things make this a field check rather than a design one. First, a plant that adds a hood or a pickup point to an existing collector raises the airflow without raising the cloth area, and the ratio silently moves outside range; computing it after the change is a thirty-second check that predicts a failure months in advance. Second, bags out of service change the denominator directly -- a collector running with a tenth of its bags plugged or blanked off is running at a ratio a tenth higher than its design, and that is often exactly why the remaining bags are failing too, which is how bag failures cascade once they start. The typical ranges are broad conventions, and the correct ratio for a specific dust depends on particle size, shape, cohesiveness, moisture, temperature, and loading; a fine cohesive dust may need a ratio well below the generic range for its cleaning type. This does not select fabric or media treatment, size the cleaning system, evaluate can velocity (the upward velocity between bags, which independently causes re-entrainment on tall collectors), size the hopper and discharge, or address the interstitial and inlet velocities that cause bag abrasion. It does not evaluate explosion protection, which is mandatory for combustible dust and is a separate calculation, and it does not size hoods or ductwork or verify capture velocity at the source, which is where dust control actually succeeds or fails. The collector manufacturer's data, ACGIH Industrial Ventilation, and NFPA 652 where the dust is combustible govern.",
  };
}
const airToClothExample = { inputs: { airflow_cfm: 12000, bag_count: 200, bag_diameter_in: 6, bag_length_ft: 8, range_low: 3, range_high: 5, bags_out_of_service: 30 } };
MINING_RENDERERS["dust-collector-air-to-cloth"] = _simpleRenderer({
  citation: "Citation: cloth area = bag count x pi x bag diameter x bag length for round bags, and the air-to-cloth ratio (filtration velocity) = airflow / cloth area, by name. Typical ranges -- shaker 2 to 3, reverse-air 1.5 to 2.5, pulse-jet 3 to 5, cartridge 0.5 to 1.5 -- are entered as broad conventions. The collector manufacturer's data and ACGIH Industrial Ventilation govern.",
  example: airToClothExample.inputs,
  fields: [
    { key: "airflow_cfm", label: "System airflow (cfm)", kind: "number", default: 12000 },
    { key: "bag_count", label: "Number of bags", kind: "number", default: 200 },
    { key: "bag_diameter_in", label: "Bag diameter (in)", kind: "number", default: 6 },
    { key: "bag_length_ft", label: "Bag length (ft)", kind: "number", default: 8 },
    { key: "range_low", label: "Range for this cleaning type, low (ft/min)", kind: "number", default: 3 },
    { key: "range_high", label: "Range for this cleaning type, high (ft/min)", kind: "number", default: 5 },
    { key: "bags_out_of_service", label: "Bags plugged or blanked off", kind: "number", default: 30 },
  ],
  outputs: [
    { key: "a", id: "dac-out-a", label: "Cloth area", value: (r) => fmt(r.cloth_area_sqft, 0) + " sq ft (" + fmt(r.area_per_bag_sqft, 2) + " sq ft per bag)" },
    { key: "r", id: "dac-out-r", label: "Air-to-cloth ratio", value: (r) => fmt(r.air_to_cloth, 2) + " ft/min -- " + r.verdict },
    { key: "o", id: "dac-out-o", label: "With the bags out of service", value: (r) => fmt(r.derated_air_to_cloth, 2) + " ft/min on " + fmt(r.derated_cloth_area_sqft, 0) + " sq ft, " + fmt(r.derated_increase_pct, 0) + "% harder per bag" + (r.derated_in_range ? "" : " -- and now OUT of range") },
    { key: "m", id: "dac-out-m", label: "Airflow the collector supports at the range limit", value: (r) => fmt(r.max_airflow_cfm, 0) + " cfm (" + fmt(r.airflow_headroom_cfm, 0) + " cfm of headroom)" },
    { key: "n", id: "dac-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDustCollectorAirToCloth,
});

// ===================== spec-v1516: dust deflagration vent area (NFPA 68) =====================

// dims: in { volume_cuft: L^3, kst_bar_m_s: dimensionless, p_red_psig: M L^-1 T^-2, p_stat_psig: M L^-1 T^-2, length_to_diameter: dimensionless, stronger_p_red_psig: M L^-1 T^-2, available_vent_area_sqft: L^2 } out: { vent_area_sqft: L^2, vent_area_at_stronger_sqft: L^2, dust_class: dimensionless }
export function computeDustDeflagrationVentArea({ volume_cuft = 0, kst_bar_m_s = 0, p_red_psig = 0, p_stat_psig = 0, length_to_diameter = 2, stronger_p_red_psig = 0, available_vent_area_sqft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(volume_cuft > 0)) return { error: "Enclosure volume must be positive." };
  if (!(kst_bar_m_s > 0)) return { error: "Kst must be positive -- and it comes from testing the actual dust, not from a table." };
  if (!(p_red_psig > 0)) return { error: "Enclosure reduced-pressure strength must be positive." };
  if (!(p_stat_psig > 0)) return { error: "Vent panel static activation pressure must be positive." };
  if (!(p_stat_psig < p_red_psig)) return { error: "The vent must open below the pressure the enclosure can hold." };
  if (!(length_to_diameter >= 1)) return { error: "Length-to-diameter ratio must be at least 1." };
  if (!(stronger_p_red_psig > p_red_psig)) return { error: "The comparison strength must exceed the entered enclosure strength." };
  if (!(available_vent_area_sqft > 0)) return { error: "Available vent area must be positive." };
  const dust_class = kst_bar_m_s <= 200 ? "St1" : kst_bar_m_s <= 300 ? "St2" : "St3";
  const volume_m3 = volume_cuft * _M3_PER_FT3;
  const ventArea = (pred_psig) => {
    const p_red_bar = pred_psig * _BAR_PER_PSI;
    const p_stat_bar = p_stat_psig * _BAR_PER_PSI;
    let a_m2 = 1e-4 * (1 + 1.54 * Math.pow(p_stat_bar, 4 / 3)) * kst_bar_m_s * Math.pow(volume_m3, 0.75) / Math.sqrt(p_red_bar);
    // NFPA 68 elongation correction for a vessel longer than two diameters.
    if (length_to_diameter > 2) {
      a_m2 *= 1 + 0.6 * Math.pow(length_to_diameter - 2, 0.75) * Math.exp(-0.95 * p_red_bar * p_red_bar);
    }
    return a_m2 / _M2_PER_FT2;
  };
  const vent_area_sqft = ventArea(p_red_psig);
  const vent_area_at_stronger_sqft = ventArea(stronger_p_red_psig);
  const stronger_saving_pct = (1 - vent_area_at_stronger_sqft / vent_area_sqft) * 100;
  const fits = available_vent_area_sqft >= vent_area_sqft;
  const shortfall_sqft = Math.max(0, vent_area_sqft - available_vent_area_sqft);
  return {
    dust_class, volume_m3, vent_area_sqft, vent_area_at_stronger_sqft, stronger_saving_pct,
    fits, shortfall_sqft, available_vent_area_sqft,
    verdict: fits
      ? "the available area covers the requirement"
      : "SHORT by " + fmt(shortfall_sqft, 1) + " sq ft -- this enclosure cannot be vented adequately as built, and the responses are a stronger enclosure, suppression instead of venting, or relocation outdoors where venting to a safe location is possible",
    note: "Venting works by opening a large enough hole fast enough that the pressure inside never exceeds what the enclosure can hold. Three quantities set it: how big the enclosure is, how violently the dust burns, and how much pressure the enclosure can take. The last is the one people get wrong. A standard dust collector housing may hold only one or two pounds per square inch, and a low reduced-pressure rating demands a very large vent, which is often why an existing collector cannot be vented adequately and needs suppression or isolation instead -- and why building a stronger enclosure cuts the requirement so sharply. THE HONEST FIRST OUTPUT IS UPSTREAM OF THE ARITHMETIC. A dust's Kst and minimum ignition energy come from laboratory testing of a sample of the ACTUAL dust; published values for a generic material span a range wide enough to change the answer by a factor of two, and a facility that has not tested its dust does not know whether it has a combustible dust hazard at all. NFPA 652 requires a dust hazard analysis to establish exactly that, and it precedes all of this. The other half is isolation. Venting the collector does nothing about the flame front travelling back up the duct into the building, and NFPA 69 isolation -- a chemical barrier, a rotary valve, or a back-blast damper -- is a separate and equally mandatory requirement that no vent area substitutes for. This is a screening calculation only. Deflagration venting is a life-safety design that must be performed by a qualified engineer to the current edition of NFPA 68, using tested values for the actual dust and accounting for vent panel inertia, duct length on the vent, and the safe discharge location, none of which this evaluates in full. It does not address ignition source control, or housekeeping and fugitive dust accumulation, which is what actually causes secondary explosions and which kills far more people than the primary event. NFPA 652, 68, 69, and a qualified engineer govern.",
  };
}
const deflagrationExample = { inputs: { volume_cuft: 3500, kst_bar_m_s: 150, p_red_psig: 1.5, p_stat_psig: 0.5, length_to_diameter: 2, stronger_p_red_psig: 5, available_vent_area_sqft: 12 } };
MINING_RENDERERS["dust-deflagration-vent-area"] = _simpleRenderer({
  citation: "Citation: the NFPA 68 vent-area relation by name, in enclosure volume, the dust's tested Kst, the enclosure's reduced-pressure strength, and the vent panel's static activation pressure, with the standard elongation correction above a length-to-diameter ratio of 2. Kst comes from laboratory testing of the ACTUAL dust. A screening calculation only: NFPA 652, 68, 69, and a qualified engineer govern.",
  example: deflagrationExample.inputs,
  fields: [
    { key: "volume_cuft", label: "Enclosure volume (cu ft)", kind: "number", default: 3500 },
    { key: "kst_bar_m_s", label: "Tested Kst (bar-m/s)", kind: "number", default: 150 },
    { key: "p_red_psig", label: "Enclosure reduced-pressure strength (psig)", kind: "number", default: 1.5 },
    { key: "p_stat_psig", label: "Vent panel static activation pressure (psig)", kind: "number", default: 0.5 },
    { key: "length_to_diameter", label: "Enclosure length-to-diameter ratio", kind: "number", default: 2 },
    { key: "stronger_p_red_psig", label: "Stronger enclosure to compare (psig)", kind: "number", default: 5 },
    { key: "available_vent_area_sqft", label: "Vent area the enclosure can provide (sq ft)", kind: "number", default: 12 },
  ],
  outputs: [
    { key: "c", id: "ddv-out-c", label: "Dust class from the tested Kst", value: (r) => r.dust_class },
    { key: "a", id: "ddv-out-a", label: "Required vent area", value: (r) => fmt(r.vent_area_sqft, 2) + " sq ft" },
    { key: "v", id: "ddv-out-v", label: "Against what the enclosure can provide", value: (r) => r.verdict },
    { key: "s", id: "ddv-out-s", label: "At the stronger enclosure", value: (r) => fmt(r.vent_area_at_stronger_sqft, 2) + " sq ft, " + fmt(r.stronger_saving_pct, 0) + "% less" },
    { key: "f", id: "ddv-out-f", label: "Before any of this", value: () => "Kst must come from testing the actual dust, and NFPA 652 requires a dust hazard analysis first; NFPA 69 flame-front isolation is separately mandatory and no vent area substitutes for it" },
    { key: "n", id: "ddv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDustDeflagrationVentArea,
});
