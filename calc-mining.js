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

// ===================== spec-v1517: underground face ventilation =====================

// dims: in { heading_width_ft: L, heading_height_ft: L, fan_airflow_cfm: L^3 T^-1, tubing_efficiency_pct: dimensionless, diesel_units: dimensionless, diesel_cfm_each: L^3 T^-1, min_face_velocity_fpm: L T^-1 } out: { heading_area_sqft: L^2, delivered_cfm: L^3 T^-1, face_velocity_fpm: L T^-1, velocity_required_cfm: L^3 T^-1, diesel_required_cfm: L^3 T^-1, leakage_cfm: L^3 T^-1 }
export function computeMineFaceVentilation({ heading_width_ft = 0, heading_height_ft = 0, fan_airflow_cfm = 0, tubing_efficiency_pct = 70, diesel_units = 1, diesel_cfm_each = 0, min_face_velocity_fpm = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(heading_width_ft > 0)) return { error: "Heading width must be positive." };
  if (!(heading_height_ft > 0)) return { error: "Heading height must be positive." };
  if (!(fan_airflow_cfm > 0)) return { error: "Fan airflow must be positive." };
  if (!(tubing_efficiency_pct > 0 && tubing_efficiency_pct <= 100)) return { error: "Tubing efficiency must be in (0, 100] percent." };
  if (!(diesel_units >= 0)) return { error: "Diesel equipment count cannot be negative." };
  if (!(diesel_cfm_each > 0)) return { error: "Diesel ventilation rate per machine must be positive." };
  if (!(min_face_velocity_fpm > 0)) return { error: "Minimum face velocity must be positive." };
  const heading_area_sqft = heading_width_ft * heading_height_ft;
  const delivered_cfm = fan_airflow_cfm * tubing_efficiency_pct / 100;
  const leakage_cfm = fan_airflow_cfm - delivered_cfm;
  const face_velocity_fpm = delivered_cfm / heading_area_sqft;
  const velocity_required_cfm = heading_area_sqft * min_face_velocity_fpm;
  const diesel_required_cfm = diesel_units * diesel_cfm_each;
  const governing_cfm = Math.max(velocity_required_cfm, diesel_required_cfm);
  const governing = diesel_required_cfm >= velocity_required_cfm ? "diesel dilution" : "face sweep velocity";
  const velocity_ok = face_velocity_fpm >= min_face_velocity_fpm;
  const diesel_ok = delivered_cfm >= diesel_required_cfm;
  const meets_governing = delivered_cfm >= governing_cfm;
  const max_diesel_units = Math.floor(delivered_cfm / diesel_cfm_each);
  const efficiency_needed_pct = governing_cfm / fan_airflow_cfm * 100;
  return {
    heading_area_sqft, delivered_cfm, leakage_cfm, face_velocity_fpm,
    velocity_required_cfm, diesel_required_cfm, governing_cfm, governing,
    velocity_ok, diesel_ok, meets_governing, max_diesel_units, efficiency_needed_pct,
    verdict: meets_governing
      ? "the delivered air meets the governing requirement"
      : "SHORT of the governing requirement by " + fmt(governing_cfm - delivered_cfm, 0) + " cfm",
    note: "Four requirements compete and the largest wins: enough velocity to sweep the face, enough volume to dilute diesel exhaust for every machine working there, enough to clear blast fumes in the required re-entry time, and enough to control dust and any gas the strata make. Diesel dilution is very often the governing one, because the required air per unit of engine power is large and it is ADDITIVE across machines -- so a heading can pass the velocity check comfortably and still be short. The number that gets missed is TUBING LEAKAGE. A long run with bad couplings delivers a fraction of what the fan moves, and the crew at the face experiences the delivered flow, not the fan's rating. Measuring at the face rather than at the fan is the discipline, the gap between the two is the maintenance finding, and repairing couplings routinely buys more air than a bigger fan would -- with no new fan and no new tubing. The tubing END SETBACK matters as much as the quantity: air discharged too far back does not reach the face at all, it short-circuits and returns along the heading, leaving a dead zone exactly where people work. This is a comparison of delivered airflow against requirements the user supplies. It does not calculate tubing leakage, pressure loss, or fan selection, and it does not determine the required diesel ventilation rate, which is set by regulation per unit of engine power and differs between jurisdictions. It does not evaluate methane or other strata gas, which in gassy mines governs everything and carries its own statutory limits and monitoring, and it does not evaluate radon, silica, or diesel particulate exposure, which are health standards with their own sampling requirements. Underground ventilation is a regulated, engineered system: the mine ventilation plan, the ventilation engineer, and MSHA govern.",
  };
}
const faceVentExample = { inputs: { heading_width_ft: 18, heading_height_ft: 14, fan_airflow_cfm: 25000, tubing_efficiency_pct: 70, diesel_units: 2, diesel_cfm_each: 10000, min_face_velocity_fpm: 60 } };
MINING_RENDERERS["mine-face-ventilation"] = _simpleRenderer({
  citation: "Citation: face velocity = delivered airflow / heading cross-section, with the delivered flow being the fan's rating times the tubing efficiency, and the governing requirement being the LARGEST of the sweep-velocity and diesel-dilution demands. The diesel rate per unit of engine power is set by regulation and entered. The mine ventilation plan, the ventilation engineer, and MSHA govern.",
  example: faceVentExample.inputs,
  fields: [
    { key: "heading_width_ft", label: "Heading width (ft)", kind: "number", default: 18 },
    { key: "heading_height_ft", label: "Heading height (ft)", kind: "number", default: 14 },
    { key: "fan_airflow_cfm", label: "Fan rated airflow (cfm)", kind: "number", default: 25000 },
    { key: "tubing_efficiency_pct", label: "Tubing delivery efficiency (%)", kind: "number", default: 70 },
    { key: "diesel_units", label: "Diesel machines in the heading", kind: "number", default: 2 },
    { key: "diesel_cfm_each", label: "Ventilation required per machine (cfm)", kind: "number", default: 10000 },
    { key: "min_face_velocity_fpm", label: "Minimum face sweep velocity (fpm)", kind: "number", default: 60 },
  ],
  outputs: [
    { key: "a", id: "mfv-out-a", label: "Heading cross-section", value: (r) => fmt(r.heading_area_sqft, 0) + " sq ft" },
    { key: "d", id: "mfv-out-d", label: "Air delivered at the face", value: (r) => fmt(r.delivered_cfm, 0) + " cfm (" + fmt(r.leakage_cfm, 0) + " cfm lost in the tubing)" },
    { key: "v", id: "mfv-out-v", label: "Face velocity", value: (r) => fmt(r.face_velocity_fpm, 0) + " fpm -- " + (r.velocity_ok ? "meets the sweep minimum" : "BELOW the sweep minimum") },
    { key: "g", id: "mfv-out-g", label: "Governing requirement", value: (r) => fmt(r.governing_cfm, 0) + " cfm from " + r.governing + " -- " + r.verdict },
    { key: "m", id: "mfv-out-m", label: "Diesel machines the delivered air supports", value: (r) => fmt(r.max_diesel_units, 0) },
    { key: "e", id: "mfv-out-e", label: "Tubing efficiency that would clear it", value: (r) => fmt(r.efficiency_needed_pct, 0) + "% -- couplings and repairs, not a bigger fan" },
    { key: "n", id: "mfv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMineFaceVentilation,
});

// ===================== spec-v1518: pit dewatering head and staging =====================

// dims: in { static_lift_ft: L, friction_head_ft: L, discharge_pressure_ft: L, head_per_pump_ft: L, suction_lift_ft: L, practical_suction_limit_ft: L, flow_gpm: L^3 T^-1, pump_efficiency_pct: dimensionless } out: { total_head_ft: L, stages: dimensionless, head_per_stage_ft: L, water_hp: M L^2 T^-3, brake_hp: M L^2 T^-3 }
export function computePitDewateringStaging({ static_lift_ft = 0, friction_head_ft = 0, discharge_pressure_ft = 0, head_per_pump_ft = 0, suction_lift_ft = 0, practical_suction_limit_ft = 25, flow_gpm = 0, pump_efficiency_pct = 65 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(static_lift_ft > 0)) return { error: "Static lift must be positive." };
  if (!(friction_head_ft >= 0)) return { error: "Friction head cannot be negative." };
  if (!(discharge_pressure_ft >= 0)) return { error: "Discharge pressure head cannot be negative." };
  if (!(head_per_pump_ft > 0)) return { error: "Head developed per pump must be positive." };
  if (!(suction_lift_ft >= 0)) return { error: "Suction lift cannot be negative." };
  if (!(practical_suction_limit_ft > 0)) return { error: "Practical suction limit must be positive." };
  if (!(flow_gpm > 0)) return { error: "Flow must be positive." };
  if (!(pump_efficiency_pct > 0 && pump_efficiency_pct <= 100)) return { error: "Pump efficiency must be in (0, 100] percent." };
  const total_head_ft = static_lift_ft + friction_head_ft + discharge_pressure_ft;
  const stages = Math.ceil(total_head_ft / head_per_pump_ft);
  const head_per_stage_ft = total_head_ft / stages;
  const suction_ok = suction_lift_ft <= practical_suction_limit_ft;
  const suction_excess_ft = Math.max(0, suction_lift_ft - practical_suction_limit_ft);
  // Water horsepower for clear water, and the brake horsepower at the entered
  // efficiency: gpm x head / 3,960.
  const water_hp = flow_gpm * total_head_ft / 3960;
  const brake_hp = water_hp / (pump_efficiency_pct / 100);
  const static_share_pct = static_lift_ft / total_head_ft * 100;
  return {
    total_head_ft, stages, head_per_stage_ft, suction_ok, suction_excess_ft,
    water_hp, brake_hp, static_share_pct,
    suction_verdict: suction_ok
      ? "the suction lift is inside the entered practical limit"
      : "BEYOND the practical suction lift by " + fmt(suction_excess_ft, 1) + " ft -- the pump will cavitate or fail to prime regardless of its rating, and the fix is to move it down to the sump or use a submersible, not to buy a bigger pump",
    note: "Total head is static lift plus friction plus any discharge pressure, and in a deep pit the static lift dominates -- a 180 ft pit is 180 ft of head before a single foot of pipe friction. When that exceeds one pump's capability the system is staged: pumps placed on benches, each lifting to the next, each seeing only its share. THE CONSTRAINT THAT SURPRISES PEOPLE IS ON THE SUCTION SIDE. A pump sitting above the water can only lift water to itself by atmospheric pressure, which is about 34 ft in theory and 20 to 25 ft in practice once friction, vapour pressure, and net positive suction head margin are accounted for -- and less at altitude, roughly 17 to 20 ft at 5,000 ft of elevation. That is why deep pit dewatering uses submersibles in the sump or pumps mounted low with flooded suction, and why a plan showing a pump on the rim drawing from the bottom does not work at any horsepower. This is head and staging arithmetic, not a pump selection. It does not size the pump, select the impeller, or evaluate the pump's curve against the system curve, which is where the actual operating point is found; it does not compute net positive suction head available in full, which requires water temperature, altitude, and suction line details and which is the real limit rather than the rule of thumb used here. It does not address the inflow rate the pit actually produces -- groundwater inflow and storm response determine the required capacity and come from a hydrogeological assessment -- and it does not address discharge permitting, sediment control, or water quality, all of which are regulated. The pump manufacturer's curves, the site hydrogeologist, and the discharge permit govern.",
  };
}
const dewateringStagingExample = { inputs: { static_lift_ft: 180, friction_head_ft: 42, discharge_pressure_ft: 0, head_per_pump_ft: 120, suction_lift_ft: 28, practical_suction_limit_ft: 25, flow_gpm: 500, pump_efficiency_pct: 65 } };
MINING_RENDERERS["pit-dewatering-staging"] = _simpleRenderer({
  citation: "Citation: total head = static lift + friction + discharge pressure; stages = ceil(total head / the head one pump develops); water horsepower = gpm x head / 3,960 divided by the pump efficiency. The practical suction lift of roughly 20 to 25 ft at sea level is named as a rule of thumb, not a net-positive-suction-head calculation. The pump manufacturer's curves govern.",
  example: dewateringStagingExample.inputs,
  fields: [
    { key: "static_lift_ft", label: "Static lift, water surface to discharge (ft)", kind: "number", default: 180 },
    { key: "friction_head_ft", label: "Friction head in the pipe run (ft)", kind: "number", default: 42 },
    { key: "discharge_pressure_ft", label: "Discharge pressure head (ft)", kind: "number", default: 0 },
    { key: "head_per_pump_ft", label: "Head one pump develops at this flow (ft)", kind: "number", default: 120 },
    { key: "suction_lift_ft", label: "Suction lift at the worst stage (ft)", kind: "number", default: 28 },
    { key: "practical_suction_limit_ft", label: "Practical suction lift limit (ft)", kind: "number", default: 25 },
    { key: "flow_gpm", label: "Required flow (gpm)", kind: "number", default: 500 },
    { key: "pump_efficiency_pct", label: "Pump efficiency (%)", kind: "number", default: 65 },
  ],
  outputs: [
    { key: "h", id: "pds-out-h", label: "Total dynamic head", value: (r) => fmt(r.total_head_ft, 0) + " ft (" + fmt(r.static_share_pct, 0) + "% of it static lift)" },
    { key: "s", id: "pds-out-s", label: "Stages required", value: (r) => fmt(r.stages, 0) + " at " + fmt(r.head_per_stage_ft, 0) + " ft each" },
    { key: "u", id: "pds-out-u", label: "Suction side", value: (r) => r.suction_verdict },
    { key: "p", id: "pds-out-p", label: "Power for the duty", value: (r) => fmt(r.water_hp, 1) + " water hp, " + fmt(r.brake_hp, 1) + " brake hp at the entered efficiency" },
    { key: "n", id: "pds-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePitDewateringStaging,
});

// ===================== spec-v1519: highwall bench geometry =====================

// dims: in { bench_height_ft: L, bench_width_ft: L, face_angle_deg: dimensionless, bench_count: dimensionless, alternative_bench_width_ft: L, target_overall_angle_deg: dimensionless } out: { run_per_bench_ft: L, overall_angle_deg: dimensionless, total_height_ft: L, total_run_ft: L, alternative_overall_angle_deg: dimensionless, width_for_target_ft: L }
export function computeHighwallBenchGeometry({ bench_height_ft = 0, bench_width_ft = 0, face_angle_deg = 0, bench_count = 1, alternative_bench_width_ft = 0, target_overall_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bench_height_ft > 0)) return { error: "Bench height must be positive." };
  if (!(bench_width_ft > 0)) return { error: "Bench width must be positive." };
  if (!(face_angle_deg > 0 && face_angle_deg < 90)) return { error: "Face angle must be in (0, 90) degrees." };
  if (!(bench_count >= 1)) return { error: "Bench count must be at least 1." };
  if (!(alternative_bench_width_ft > 0)) return { error: "Alternative bench width must be positive." };
  if (!(target_overall_angle_deg > 0 && target_overall_angle_deg < 90)) return { error: "Target overall angle must be in (0, 90) degrees." };
  const face_run_ft = bench_height_ft / Math.tan(face_angle_deg * Math.PI / 180);
  const run_per_bench_ft = face_run_ft + bench_width_ft;
  const overall_angle_deg = Math.atan(bench_height_ft / run_per_bench_ft) * 180 / Math.PI;
  const total_height_ft = bench_height_ft * bench_count;
  const total_run_ft = run_per_bench_ft * bench_count;
  const alternative_run_ft = face_run_ft + alternative_bench_width_ft;
  const alternative_overall_angle_deg = Math.atan(bench_height_ft / alternative_run_ft) * 180 / Math.PI;
  const width_for_target_ft = bench_height_ft / Math.tan(target_overall_angle_deg * Math.PI / 180) - face_run_ft;
  const flattening_deg = face_angle_deg - overall_angle_deg;
  return {
    face_run_ft, run_per_bench_ft, overall_angle_deg, total_height_ft, total_run_ft,
    alternative_overall_angle_deg, width_for_target_ft, flattening_deg,
    target_reachable: width_for_target_ft > 0,
    note: "Stack benches and the wall gets flatter overall even though every face is steep. Each bench contributes its own horizontal setback -- the face's own run plus the bench width -- and the overall angle is the total height over the total run. Faces at 65 degrees on generous catch benches can give a wall well under 40 degrees overall, and quoting the FACE angle to a regulator or an engineer instead of the overall one understates the wall substantially. The overall angle is what a slope stability analysis evaluates. Widening benches by a few feet each flattens the whole wall measurably, which costs stripping and buys stability and catchment, and the lever runs both ways: narrowing benches recovers ore, steepens the wall, and reduces catchment all at once. Bench width does two jobs and they are worth separating. Geometrically it sets the overall angle. Operationally it is the CATCH bench that has to stop rock falling from above from reaching people and equipment below, and that requirement -- the Ritchie criterion and the modern work refining it -- often demands a wider bench than the stability analysis alone would. A bench too narrow to catch anything is a bench that only exists on the plan. This is slope geometry only and says NOTHING about whether the wall is stable, which depends on rock mass strength, discontinuity orientation and persistence, groundwater pressure, blast damage to the face, and the failure mode that geometry permits -- planar, wedge, toppling, or circular. A geometrically modest wall in adversely oriented jointing can be far more dangerous than a steep one in massive rock, and only a slope stability analysis by a qualified engineer distinguishes them. It does not evaluate catch bench effectiveness against rockfall, or address ramp design, drainage, scaling, monitoring, or the ground control plan. MSHA ground control requirements, the site's ground control plan, and a qualified geotechnical engineer govern.",
  };
}
const highwallExample = { inputs: { bench_height_ft: 40, bench_width_ft: 30, face_angle_deg: 65, bench_count: 5, alternative_bench_width_ft: 20, target_overall_angle_deg: 35 } };
MINING_RENDERERS["highwall-bench-geometry"] = _simpleRenderer({
  citation: "Citation: the bench-stacking geometry by name -- horizontal run per bench = bench height / tan(face angle) + bench width, and the overall slope angle = arctan(bench height / run per bench). Geometry only; MSHA ground control requirements, the site's ground control plan, and a qualified geotechnical engineer govern stability.",
  example: highwallExample.inputs,
  fields: [
    { key: "bench_height_ft", label: "Bench height (ft)", kind: "number", default: 40 },
    { key: "bench_width_ft", label: "Catch bench width (ft)", kind: "number", default: 30 },
    { key: "face_angle_deg", label: "Individual face angle (deg)", kind: "number", default: 65 },
    { key: "bench_count", label: "Number of benches", kind: "number", default: 5 },
    { key: "alternative_bench_width_ft", label: "Alternative bench width to compare (ft)", kind: "number", default: 20 },
    { key: "target_overall_angle_deg", label: "Target overall slope angle (deg)", kind: "number", default: 35 },
  ],
  outputs: [
    { key: "r", id: "hbg-out-r", label: "Horizontal run per bench", value: (r) => fmt(r.run_per_bench_ft, 2) + " ft (" + fmt(r.face_run_ft, 2) + " ft of face plus the bench)" },
    { key: "o", id: "hbg-out-o", label: "Overall slope angle", value: (r) => fmt(r.overall_angle_deg, 2) + " deg, " + fmt(r.flattening_deg, 1) + " deg flatter than the face" },
    { key: "t", id: "hbg-out-t", label: "Whole wall", value: (r) => fmt(r.total_height_ft, 0) + " ft high over " + fmt(r.total_run_ft, 0) + " ft of run" },
    { key: "a", id: "hbg-out-a", label: "At the alternative bench width", value: (r) => fmt(r.alternative_overall_angle_deg, 2) + " deg overall" },
    { key: "w", id: "hbg-out-w", label: "Bench width for the target overall angle", value: (r) => r.target_reachable ? fmt(r.width_for_target_ft, 2) + " ft" : "unreachable -- the face angle alone is flatter than the target" },
    { key: "n", id: "hbg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHighwallBenchGeometry,
});

// ===================== spec-v1521: rock bolt pattern and support pressure =====================

// dims: in { bolt_capacity_lb: M L T^-2, spacing_1_ft: L, spacing_2_ft: L, span_ft: L, rock_unit_weight_pcf: M L^-3, loosened_zone_ft: L, target_support_psf: M L^-1 T^-2 } out: { area_per_bolt_sqft: L^2, support_psf: M L^-1 T^-2, support_psi: M L^-1 T^-2, dead_weight_required_psf: M L^-1 T^-2, spacing_for_target_ft: L, bolt_length_ft: L }
export function computeRockBoltSupportPressure({ bolt_capacity_lb = 0, spacing_1_ft = 0, spacing_2_ft = 0, span_ft = 0, rock_unit_weight_pcf = 0, loosened_zone_ft = 0, target_support_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bolt_capacity_lb > 0)) return { error: "Bolt working capacity must be positive." };
  if (!(spacing_1_ft > 0)) return { error: "Bolt spacing must be positive in both directions." };
  if (!(spacing_2_ft > 0)) return { error: "Bolt spacing must be positive in both directions." };
  if (!(span_ft > 0)) return { error: "Span must be positive." };
  if (!(rock_unit_weight_pcf > 0)) return { error: "Rock unit weight must be positive." };
  if (!(loosened_zone_ft > 0)) return { error: "Loosened-zone height must be positive." };
  if (!(target_support_psf > 0)) return { error: "Target support pressure must be positive." };
  const area_per_bolt_sqft = spacing_1_ft * spacing_2_ft;
  const support_psf = bolt_capacity_lb / area_per_bolt_sqft;
  const support_psi = support_psf / _SQIN_PER_SQFT;
  const dead_weight_required_psf = rock_unit_weight_pcf * loosened_zone_ft;
  const dead_weight_ratio = support_psf / dead_weight_required_psf;
  const dead_weight_ok = support_psf >= dead_weight_required_psf;
  const spacing_for_target_ft = Math.sqrt(bolt_capacity_lb / target_support_psf);
  const spacing_for_dead_weight_ft = Math.sqrt(bolt_capacity_lb / dead_weight_required_psf);
  // Length is tied to spacing (about twice it) and to span (about a third),
  // and the longer of the two governs.
  const length_from_spacing_ft = 2 * Math.max(spacing_1_ft, spacing_2_ft);
  const length_from_span_ft = span_ft / 3;
  const bolt_length_ft = Math.max(length_from_spacing_ft, length_from_span_ft);
  return {
    area_per_bolt_sqft, support_psf, support_psi, dead_weight_required_psf,
    dead_weight_ratio, dead_weight_ok, spacing_for_target_ft, spacing_for_dead_weight_ft,
    length_from_spacing_ft, length_from_span_ft, bolt_length_ft,
    verdict: dead_weight_ok
      ? "the pattern carries the entered loosened zone, with a ratio of " + fmt(dead_weight_ratio, 2)
      : "FAILS the dead-weight check at a ratio of " + fmt(dead_weight_ratio, 2) + " -- this pattern does not hold the loose ground it is there to hold",
    note: "Each bolt is responsible for the ground in its own tributary area, so the pressure it supplies is its capacity divided by that area. The relation is what makes patterns comparable: a 5 ft pattern of 15 ton bolts and a 4 ft pattern of 10 ton bolts are not the same thing, and the division says which is stronger in one line. Two rules of thumb travel with it. Bolt LENGTH is tied to spacing, roughly twice it, because bolts closer together than half their length interact to build a compressed rock beam -- which is the actual mechanism in bedded ground -- while bolts spaced further apart act as individual anchors and do not; length is also tied to the span, about a third of it, and the longer of the two governs. And the minimum useful check is DEAD WEIGHT: the pattern must at least hold up the loosened zone it is stitching, so support pressure has to exceed the unit weight of the rock times the height of that zone. A pattern that fails the dead-weight check is not a pattern, whatever else the design says, and because support pressure falls as the SQUARE of spacing, opening a pattern by a foot costs far more than it looks. This is a pressure conversion and a dead-weight screen, not a ground support design. It does not determine the loosened-zone height, which depends on rock mass quality, span, stress, and excavation method and which is the input that dominates the answer; empirical systems such as Q, RMR, or the GSI-based approaches, or a numerical analysis, are what establish it. It does not evaluate bolt type and anchorage, corrosion protection and design life, pull testing and quality assurance, the interaction between bolts and shotcrete or mesh, dynamic loading in burst-prone ground, or wedge and block analysis, which in jointed rock usually governs bolt length and orientation rather than any pressure criterion. Ground support is a life-safety system: MSHA ground control requirements, the site's ground control plan, and a qualified geotechnical engineer govern.",
  };
}
const rockBoltExample = { inputs: { bolt_capacity_lb: 12000, spacing_1_ft: 4, spacing_2_ft: 4, span_ft: 20, rock_unit_weight_pcf: 165, loosened_zone_ft: 6, target_support_psf: 990 } };
MINING_RENDERERS["rock-bolt-support-pressure"] = _simpleRenderer({
  citation: "Citation: support pressure = bolt working capacity / the tributary area per bolt, with the dead-weight screen requiring that pressure to exceed the rock unit weight times the loosened-zone height, and bolt length taken as the longer of about twice the spacing and about a third of the span. A screen, not a ground support design: MSHA ground control requirements and a qualified geotechnical engineer govern.",
  example: rockBoltExample.inputs,
  fields: [
    { key: "bolt_capacity_lb", label: "Bolt working capacity (lb)", kind: "number", default: 12000 },
    { key: "spacing_1_ft", label: "Bolt spacing, one direction (ft)", kind: "number", default: 4 },
    { key: "spacing_2_ft", label: "Bolt spacing, the other direction (ft)", kind: "number", default: 4 },
    { key: "span_ft", label: "Excavation span (ft)", kind: "number", default: 20 },
    { key: "rock_unit_weight_pcf", label: "Rock unit weight (lb per cu ft)", kind: "number", default: 165 },
    { key: "loosened_zone_ft", label: "Estimated loosened-zone height (ft)", kind: "number", default: 6 },
    { key: "target_support_psf", label: "Target support pressure (psf)", kind: "number", default: 990 },
  ],
  outputs: [
    { key: "a", id: "rbs-out-a", label: "Area per bolt", value: (r) => fmt(r.area_per_bolt_sqft, 1) + " sq ft" },
    { key: "p", id: "rbs-out-p", label: "Support pressure", value: (r) => fmt(r.support_psf, 0) + " psf (" + fmt(r.support_psi, 2) + " psi)" },
    { key: "d", id: "rbs-out-d", label: "Dead-weight check", value: (r) => fmt(r.dead_weight_required_psf, 0) + " psf required -- " + r.verdict },
    { key: "s", id: "rbs-out-s", label: "Spacing for the target pressure", value: (r) => fmt(r.spacing_for_target_ft, 2) + " ft square (" + fmt(r.spacing_for_dead_weight_ft, 2) + " ft to carry the loosened zone)" },
    { key: "l", id: "rbs-out-l", label: "Bolt length the geometry implies", value: (r) => fmt(r.bolt_length_ft, 1) + " ft (" + fmt(r.length_from_spacing_ft, 1) + " ft from spacing, " + fmt(r.length_from_span_ft, 1) + " ft from span)" },
    { key: "n", id: "rbs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRockBoltSupportPressure,
});

// ===================== spec-v1522: blast fume clearance time =====================

// dims: in { heading_volume_cuft: L^3, delivered_cfm: L^3 T^-1, target_fraction_pct: dimensionless, wait_time_min: T, target_time_min: T } out: { air_change_min: T, air_changes_required: dimensionless, clearance_min: T, remaining_pct_at_wait: dimensionless, airflow_for_target_time_cfm: L^3 T^-1 }
export function computeBlastFumeClearanceTime({ heading_volume_cuft = 0, delivered_cfm = 0, target_fraction_pct = 1, wait_time_min = 0, target_time_min = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(heading_volume_cuft > 0)) return { error: "Heading volume must be positive." };
  if (!(delivered_cfm > 0)) return { error: "Delivered airflow must be positive." };
  if (!(target_fraction_pct > 0 && target_fraction_pct < 100)) return { error: "Target fraction must be in (0, 100) percent." };
  if (!(wait_time_min > 0)) return { error: "Wait time must be positive." };
  if (!(target_time_min > 0)) return { error: "Target clearance time must be positive." };
  const air_change_min = heading_volume_cuft / delivered_cfm;
  const air_changes_required = Math.log(100 / target_fraction_pct);
  const clearance_min = air_change_min * air_changes_required;
  const remaining_pct_at_wait = 100 * Math.exp(-wait_time_min / air_change_min);
  const wait_is_enough = wait_time_min >= clearance_min;
  const airflow_for_target_time_cfm = heading_volume_cuft * air_changes_required / target_time_min;
  const after_one_change_pct = 100 * Math.exp(-1);
  const after_two_changes_pct = 100 * Math.exp(-2);
  return {
    air_change_min, air_changes_required, clearance_min, remaining_pct_at_wait,
    wait_is_enough, airflow_for_target_time_cfm,
    after_one_change_pct, after_two_changes_pct,
    wait_verdict: wait_is_enough
      ? "the entered wait reaches the target"
      : "the entered wait leaves " + fmt(remaining_pct_at_wait, 1) + "% of the blast concentration in the heading",
    note: "Perfect-mixing dilution decays exponentially, so each air change removes the same FRACTION rather than the same amount. One change takes a heading to 37% of the starting concentration, two to 14%, three to 5%, and 4.6 to 1%. That is the shape that makes intuition fail: the first minute does most of the work and the last decade of concentration takes as long as everything before it, so a crew re-entering early on the belief that most of it clears fast is walking into a real fraction of the original fume load. Two field cautions belong with the number. Real headings do not mix perfectly -- dead corners, the muck pile, and a tubing end set too far back all leave pockets that clear far more slowly than the average, which is why the required practice is to TEST the atmosphere with a calibrated instrument before re-entry rather than to trust a clock. And fumes continue to be released from the muck pile and from any misfire long after the shot, so a heading that tests clean at the portal can still be unsafe at the face. The calculation sets the MINIMUM wait; the gas detector sets the actual one. The airflow lever is worth seeing: repairing tubing to raise the delivered flow cuts clearance proportionally, and on a heading turning several rounds a day that is real time. This does not determine the applicable re-entry criterion, which is set by regulation and by the mine's own ventilation plan, and it does not substitute for atmospheric testing, which is the actual requirement and the only thing that establishes a heading is safe. It does not address misfire procedures or the separate waiting periods those require. The mine ventilation plan, the blaster in charge, and MSHA govern.",
  };
}
const fumeClearanceExample = { inputs: { heading_volume_cuft: 48000, delivered_cfm: 17500, target_fraction_pct: 1, wait_time_min: 10, target_time_min: 10 } };
MINING_RENDERERS["blast-fume-clearance-time"] = _simpleRenderer({
  citation: "Citation: the perfect-mixing dilution relation by name -- concentration decays as exp(-Q t / V), so one air change reaches 37% and 4.6 changes reach 1% -- with atmospheric testing by calibrated instrument named as the actual re-entry requirement. The mine ventilation plan, the blaster in charge, and MSHA govern.",
  example: fumeClearanceExample.inputs,
  fields: [
    { key: "heading_volume_cuft", label: "Heading volume (cu ft)", kind: "number", default: 48000 },
    { key: "delivered_cfm", label: "Airflow delivered at the face (cfm)", kind: "number", default: 17500 },
    { key: "target_fraction_pct", label: "Target, as a percent of the blast concentration", kind: "number", default: 1 },
    { key: "wait_time_min", label: "Wait being considered (min)", kind: "number", default: 10 },
    { key: "target_time_min", label: "Clearance time wanted (min)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "a", id: "bfc-out-a", label: "One air change", value: (r) => fmt(r.air_change_min, 2) + " min" },
    { key: "c", id: "bfc-out-c", label: "Air changes to the target", value: (r) => fmt(r.air_changes_required, 2) },
    { key: "t", id: "bfc-out-t", label: "Minimum clearance time", value: (r) => fmt(r.clearance_min, 1) + " min -- and the instrument, not the clock, sets the actual wait" },
    { key: "w", id: "bfc-out-w", label: "At the wait being considered", value: (r) => r.wait_verdict },
    { key: "s", id: "bfc-out-s", label: "The exponential shape", value: (r) => fmt(r.after_one_change_pct, 0) + "% left after one change, " + fmt(r.after_two_changes_pct, 0) + "% after two" },
    { key: "q", id: "bfc-out-q", label: "Airflow that would clear it in the target time", value: (r) => fmt(r.airflow_for_target_time_cfm, 0) + " cfm" },
    { key: "n", id: "bfc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlastFumeClearanceTime,
});

// ===================== spec-v1523: mine hoist rope factor of safety =====================

// dims: in { conveyance_lb: M L T^-2, people_count: dimensionless, person_weight_lb: M L T^-2, rope_length_ft: L, rope_weight_per_ft: M T^-2, rope_count: dimensionless, rope_breaking_lb: M L T^-2, minimum_fs: dimensionless } out: { rope_weight_lb: M L T^-2, payload_lb: M L T^-2, total_load_lb: M L T^-2, factor_of_safety: dimensionless, max_payload_lb: M L T^-2, depth_at_limit_ft: L }
export function computeHoistRopeSafetyFactor({ conveyance_lb = 0, people_count = 0, person_weight_lb = 180, rope_length_ft = 0, rope_weight_per_ft = 0, rope_count = 0, rope_breaking_lb = 0, minimum_fs = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(conveyance_lb > 0)) return { error: "Conveyance weight must be positive." };
  if (!(people_count >= 1)) return { error: "Occupant count must be at least 1." };
  if (!(person_weight_lb > 0)) return { error: "Weight per person must be positive." };
  if (!(rope_length_ft > 0)) return { error: "Rope length must be positive." };
  if (!(rope_weight_per_ft > 0)) return { error: "Rope weight per foot must be positive." };
  if (!(rope_count >= 1)) return { error: "Rope count must be at least 1." };
  if (!(rope_breaking_lb > 0)) return { error: "Rope breaking strength must be positive." };
  if (!(minimum_fs > 0)) return { error: "Statutory minimum factor of safety must be positive." };
  // Every rope hangs the full length, so the count multiplies -- the term the
  // spec's own formula line carries and its arithmetic dropped.
  const rope_weight_lb = rope_count * rope_length_ft * rope_weight_per_ft;
  const payload_lb = people_count * person_weight_lb;
  const load_without_rope_lb = conveyance_lb + payload_lb;
  const total_load_lb = load_without_rope_lb + rope_weight_lb;
  const rope_share_pct = rope_weight_lb / total_load_lb * 100;
  const breaking_total_lb = rope_count * rope_breaking_lb;
  const factor_of_safety = breaking_total_lb / total_load_lb;
  const fs_without_rope = breaking_total_lb / load_without_rope_lb;
  const overstatement = fs_without_rope - factor_of_safety;
  const margin = factor_of_safety - minimum_fs;
  const allowable_load_lb = breaking_total_lb / minimum_fs;
  const max_payload_lb = allowable_load_lb - (conveyance_lb + rope_weight_lb);
  const depth_at_limit_ft = (allowable_load_lb - load_without_rope_lb) / (rope_count * rope_weight_per_ft);
  return {
    rope_weight_lb, payload_lb, total_load_lb, rope_share_pct, breaking_total_lb,
    factor_of_safety, fs_without_rope, overstatement, margin,
    pass: factor_of_safety >= minimum_fs,
    max_payload_lb: Math.max(0, max_payload_lb),
    depth_at_limit_ft: Math.max(0, depth_at_limit_ft),
    verdict: factor_of_safety >= minimum_fs ? "above the entered statutory minimum" : "BELOW the entered statutory minimum",
    note: "On a shallow shaft the rope's own weight is a footnote; on a deep one it can exceed the payload, and because it hangs from the sheave the whole of it is carried at the top where the factor of safety is checked. A calculation that includes the cage and the people but not the rope produces a comfortable-looking number that is simply wrong, and it is wrong in the UNSAFE direction and by more as the shaft gets deeper. Note also that every rope hangs the full length, so the rope weight carries the rope COUNT as a multiplier -- dropping it is the same class of error as dropping the rope entirely. Depth, not payload, is what consumes the margin: doubling the shaft depth on the same cage and the same people takes a substantial bite out of the factor of safety. The second half matters more in practice. A rope with an adequate factor of safety can still be due for retirement, because ropes are retired on CONDITION and on TIME rather than on calculated stress: broken wires per rope lay, loss of diameter, corrosion, distortion, and in many jurisdictions a maximum service life regardless of condition. A hoist rope that passes this arithmetic and fails the broken-wire count comes out of service, and no factor of safety argument changes that. This is a static calculation. It does not model dynamic loads from acceleration, deceleration, emergency braking, or shock, all of which add substantially and which the statutory factors are partly there to cover; it does not evaluate friction hoist traction, which is a separate and governing check on a Koepe installation, or rope stretch, sheave and drum diameter ratios and their effect on rope life, attachments and terminations, or the brake system. It does not perform the statutory rope inspection. Hoisting people is among the most heavily regulated activities in mining: MSHA, the applicable ASME and state hoisting requirements, the hoist and rope manufacturers, and the mine's hoisting plan govern.",
  };
}
const hoistRopeExample = { inputs: { conveyance_lb: 4200, people_count: 8, person_weight_lb: 180, rope_length_ft: 1400, rope_weight_per_ft: 1.8, rope_count: 4, rope_breaking_lb: 128000, minimum_fs: 8 } };
MINING_RENDERERS["hoist-rope-safety-factor"] = _simpleRenderer({
  citation: "Citation: the suspended-load factor of safety -- (rope count x breaking strength) / (conveyance + payload + rope weight below the sheave), where rope weight = count x length x weight per foot -- with the statutory minimum entered because it varies by service and depth and is highest for personnel hoisting. MSHA and the mine's hoisting plan govern.",
  example: hoistRopeExample.inputs,
  fields: [
    { key: "conveyance_lb", label: "Conveyance (cage or skip) weight (lb)", kind: "number", default: 4200 },
    { key: "people_count", label: "Occupants", kind: "number", default: 8 },
    { key: "person_weight_lb", label: "Weight allowed per occupant (lb)", kind: "number", default: 180 },
    { key: "rope_length_ft", label: "Rope length below the sheave (ft)", kind: "number", default: 1400 },
    { key: "rope_weight_per_ft", label: "Rope weight (lb per ft, each)", kind: "number", default: 1.8 },
    { key: "rope_count", label: "Number of ropes", kind: "number", default: 4 },
    { key: "rope_breaking_lb", label: "Rope breaking strength (lb, each)", kind: "number", default: 128000 },
    { key: "minimum_fs", label: "Statutory minimum factor of safety", kind: "number", default: 8 },
  ],
  outputs: [
    { key: "w", id: "hrs-out-w", label: "Rope weight below the sheave", value: (r) => fmt(r.rope_weight_lb, 0) + " lb -- " + fmt(r.rope_share_pct, 0) + "% of the suspended load" },
    { key: "t", id: "hrs-out-t", label: "Total suspended load", value: (r) => fmt(r.total_load_lb, 0) + " lb" },
    { key: "f", id: "hrs-out-f", label: "Factor of safety", value: (r) => fmt(r.factor_of_safety, 2) + " -- " + r.verdict + ", margin " + fmt(r.margin, 2) },
    { key: "o", id: "hrs-out-o", label: "Leaving the rope out would read", value: (r) => fmt(r.fs_without_rope, 2) + " (" + fmt(r.overstatement, 2) + " better than the truth, in the unsafe direction)" },
    { key: "m", id: "hrs-out-m", label: "Payload at the statutory minimum", value: (r) => fmt(r.max_payload_lb, 0) + " lb" },
    { key: "d", id: "hrs-out-d", label: "Depth at which the factor reaches the minimum", value: (r) => fmt(r.depth_at_limit_ft, 0) + " ft of rope" },
    { key: "n", id: "hrs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHoistRopeSafetyFactor,
});
