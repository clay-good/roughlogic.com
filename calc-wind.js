// calc-wind.js -- Group A (cont.): the wind-energy bench.
//
// specs/scope-trade-expansion-2.md found "wind" in the catalog fourteen times
// and every one of them was a STRUCTURAL load: ASCE 7 velocity pressure,
// components and cladding, wind on a sign, wind on a suspended load. Not one
// tile treated wind as a resource. Nothing computed tip speed ratio, the
// Betz limit, shear to hub height, a Weibull distribution, a density
// correction against a warranted power curve, or the cost of a yaw error --
// the arithmetic a wind technician and a small-wind buyer actually run.
//
// Tiles (all group "A", the existing Electrical category):
//   v1550 tip-speed-ratio           v1554 turbine-density-correction
//   v1551 wind-power-density-betz   v1555 yaw-error-loss
//   v1552 wind-shear-hub-height     v1556 gin-pole-uptower-lift
//   v1553 weibull-capacity-factor
//
// See spec-v1550.md through spec-v1556.md.

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
// calc-sawmill.js / calc-trenchless.js / calc-rail.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _wdRender = function (inputRegion, outputRegion, citationEl) {
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

  _wdRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _wdRender;
}

export const WIND_RENDERERS = {};

// 1.4666667 ft/s per mph, 32.174 ft/s^2, 550 ft-lb/s per horsepower,
// 0.745699872 kW per horsepower, 8,760 hours in a year, the Betz coefficient
// 16/27, and the IEC/ISO reference air density 0.0765 lb/cu ft at 59 degF
// (518.67 degR) and sea level.
const _FPS_PER_MPH = 1.4666667;
const _G_FPS2 = 32.174;
const _FTLB_S_PER_HP = 550;
const _KW_PER_HP = 0.745699872;
const _HOURS_PER_YEAR = 8760;
const _BETZ = 16 / 27;
const _RHO_REF_PCF = 0.0765;
const _T_REF_R = 518.67;

// ============ spec-v1550: tip speed ratio ============

// dims: in { rotor_diameter_ft: L, rotor_rpm: T^-1, wind_speed_mph: L T^-1, design_tsr: dimensionless, tip_speed_cap_fps: L T^-1 } out: { tip_speed_fps: L T^-1, tip_speed_ratio: dimensionless, rpm_for_design_tsr: T^-1, rpm_at_tip_cap: T^-1 }
export function computeTipSpeedRatio({ rotor_diameter_ft = 0, rotor_rpm = 0, wind_speed_mph = 0, design_tsr = 7, tip_speed_cap_fps = 280 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rotor_diameter_ft > 0)) return { error: "Rotor diameter must be positive." };
  if (!(rotor_rpm > 0)) return { error: "Rotor speed must be positive (rpm)." };
  if (!(wind_speed_mph > 0)) return { error: "Wind speed must be positive." };
  if (!(design_tsr > 0)) return { error: "Design tip speed ratio must be positive." };
  if (!(tip_speed_cap_fps > 0)) return { error: "Tip speed cap must be positive." };
  const tip_speed_fps = Math.PI * rotor_diameter_ft * rotor_rpm / 60;
  const tip_speed_mph = tip_speed_fps / _FPS_PER_MPH;
  const wind_fps = wind_speed_mph * _FPS_PER_MPH;
  const tip_speed_ratio = tip_speed_fps / wind_fps;
  const deviation = tip_speed_ratio - design_tsr;
  // The reverse check a technician runs: what rpm holds the design ratio at
  // the wind actually blowing, and what rpm hits the acoustic tip cap.
  const rpm_for_design_tsr = design_tsr * wind_fps * 60 / (Math.PI * rotor_diameter_ft);
  const rpm_at_tip_cap = tip_speed_cap_fps * 60 / (Math.PI * rotor_diameter_ft);
  // Above this wind the machine cannot hold the design ratio without going
  // past the tip cap, so the ratio has to fall whatever the controller wants.
  const wind_at_cap_mph = tip_speed_cap_fps / design_tsr / _FPS_PER_MPH;
  const over_tip_cap = tip_speed_fps > tip_speed_cap_fps;
  return {
    tip_speed_fps, tip_speed_mph, wind_fps, tip_speed_ratio, deviation,
    rpm_for_design_tsr, rpm_at_tip_cap, wind_at_cap_mph, over_tip_cap,
    tip_cap_verdict: over_tip_cap
      ? "OVER the entered tip speed cap -- acoustics and leading-edge erosion, not aerodynamics, are what set that limit"
      : "under the entered tip speed cap, which is set by acoustics and blade erosion rather than by aerodynamics",
    note: "Below rated wind a modern machine varies rotor speed to hold the tip speed ratio at its design point, because the power coefficient peaks sharply there and a few units either side costs several percent of output. Above rated it stops trying: it holds power constant by pitching, and the ratio falls away deliberately. THAT IS WHY THE SAME LOW RATIO MEANS TWO OPPOSITE THINGS. In a high wind it is the machine doing its job; at the same wind BELOW rated it means the rotor is not being allowed to speed up, which is a controller or converter fault worth chasing, and the reverse check here is the one-line version of that diagnosis. TIP SPEED IS BOUNDED BY THINGS OTHER THAN AERODYNAMICS. Acoustic emission rises steeply with tip speed, so noise-constrained sites cap rotor rpm and accept a lower ratio, and leading-edge erosion from rain and dust scales hard with it and is a major maintenance cost on large machines. That is why bigger rotors turn slower: a large rotor at a low rpm and a small one at a high rpm end up with similar tip speeds, which is not a coincidence. A kinematic ratio from rotor speed and wind speed. It does not predict power or the power coefficient, which depends on blade design, pitch angle, and Reynolds number as well as on the ratio, and it does not evaluate whether a controller is behaving correctly across its whole operating envelope. Wind speed must be the hub-height free-stream speed: a nacelle anemometer sits in the rotor's wake and reads low, and the manufacturer's transfer function that corrects it is not known here. It does not address blade pitch, yaw, structural loads, or noise emission modelling, and it does not evaluate performance against a warranted power curve, which is a formal measurement to IEC 61400-12. The turbine manufacturer's operating parameters and control strategy govern.",
  };
}
const tipSpeedRatioExample = { inputs: { rotor_diameter_ft: 380, rotor_rpm: 11.5, wind_speed_mph: 26, design_tsr: 7, tip_speed_cap_fps: 280 } };
WIND_RENDERERS["tip-speed-ratio"] = _simpleRenderer({
  citation: "Citation: the tip speed ratio definition by name -- tip speed = pi x rotor diameter x rpm / 60, and the ratio is that speed divided by the hub-height free-stream wind speed -- with 6 to 8 as the design band for a modern three-blade upwind machine and IEC 61400 named for the performance measurement this does not perform. The turbine manufacturer's operating parameters and control strategy govern.",
  example: tipSpeedRatioExample.inputs,
  fields: [
    { key: "rotor_diameter_ft", label: "Rotor diameter (ft)", kind: "number", default: 380 },
    { key: "rotor_rpm", label: "Rotor speed (rpm)", kind: "number", default: 11.5 },
    { key: "wind_speed_mph", label: "Hub-height wind speed (mph)", kind: "number", default: 26 },
    { key: "design_tsr", label: "Design tip speed ratio", kind: "number", default: 7 },
    { key: "tip_speed_cap_fps", label: "Acoustic tip speed cap (ft/s)", kind: "number", default: 280 },
  ],
  outputs: [
    { key: "t", id: "tsr-out-t", label: "Tip speed", value: (r) => fmt(r.tip_speed_fps, 0) + " ft/s, " + fmt(r.tip_speed_mph, 0) + " mph -- " + r.tip_cap_verdict },
    { key: "r", id: "tsr-out-r", label: "Tip speed ratio", value: (r) => fmt(r.tip_speed_ratio, 2) + ", " + (r.deviation >= 0 ? "+" : "") + fmt(r.deviation, 2) + " against the design ratio" },
    { key: "d", id: "tsr-out-d", label: "Rotor speed that would hold the design ratio", value: (r) => fmt(r.rpm_for_design_tsr, 1) + " rpm at this wind" },
    { key: "c", id: "tsr-out-c", label: "Rotor speed at the tip cap", value: (r) => fmt(r.rpm_at_tip_cap, 1) + " rpm" },
    { key: "w", id: "tsr-out-w", label: "Wind above which the design ratio breaks the cap", value: (r) => fmt(r.wind_at_cap_mph, 1) + " mph -- past it the ratio has to fall whatever the controller wants" },
    { key: "n", id: "tsr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTipSpeedRatio,
});

// ============ spec-v1551: wind power density and the Betz limit ============

// dims: in { wind_speed_mph: L T^-1, air_density_pcf: M L^-3, rotor_diameter_ft: L, power_coefficient: dimensionless, alt_wind_speed_mph: L T^-1 } out: { swept_area_ft2: L^2, power_in_wind_kw: M L^2 T^-3, betz_power_kw: M L^2 T^-3, extracted_power_kw: M L^2 T^-3, power_density_w_ft2: M T^-3 }
export function computeWindPowerDensityBetz({ wind_speed_mph = 0, air_density_pcf = _RHO_REF_PCF, rotor_diameter_ft = 0, power_coefficient = 0.45, alt_wind_speed_mph = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wind_speed_mph > 0)) return { error: "Wind speed must be positive." };
  if (!(air_density_pcf > 0)) return { error: "Air density must be positive (lb/cu ft)." };
  if (!(rotor_diameter_ft > 0)) return { error: "Rotor diameter must be positive." };
  if (!(power_coefficient > 0)) return { error: "Power coefficient must be positive." };
  if (!(power_coefficient <= _BETZ)) return { error: "A power coefficient above the Betz limit of 0.593 is not physically possible, at any price, with any blade." };
  if (!(alt_wind_speed_mph > 0)) return { error: "The wind speed to compare must be positive." };
  const swept_area_ft2 = Math.PI / 4 * rotor_diameter_ft * rotor_diameter_ft;
  const v_fps = wind_speed_mph * _FPS_PER_MPH;
  // Weight density over g is the mass density in slugs per cubic foot.
  const rho_slug = air_density_pcf / _G_FPS2;
  const power_ftlb_s = 0.5 * rho_slug * swept_area_ft2 * v_fps * v_fps * v_fps;
  const power_in_wind_kw = power_ftlb_s / _FTLB_S_PER_HP * _KW_PER_HP;
  const power_density_w_ft2 = power_in_wind_kw * 1000 / swept_area_ft2;
  const betz_power_kw = power_in_wind_kw * _BETZ;
  const extracted_power_kw = power_in_wind_kw * power_coefficient;
  // The cube law, stated as a ratio so it is checkable without the rotor.
  const alt_ratio = Math.pow(alt_wind_speed_mph / wind_speed_mph, 3);
  const alt_extracted_kw = extracted_power_kw * alt_ratio;
  return {
    swept_area_ft2, power_in_wind_kw, power_density_w_ft2,
    betz_power_kw, extracted_power_kw, betz_limit: _BETZ,
    alt_ratio, alt_extracted_kw,
    coefficient_of_betz_pct: power_coefficient / _BETZ * 100,
    note: "The cube law is the single most important fact in wind energy and the one most often underweighted: a site averaging 20% more wind has 73% more energy in it, which is why met tower data and hub height matter enormously and why moving a machine a short distance to better exposure can beat any equipment choice. Half the wind speed is one eighth the power. BETZ THEN SETS THE CEILING. A rotor that extracted all the wind's energy would have to stop the air completely, and stopped air cannot get out of the way of the air behind it; the optimum slows the flow to a third of its upstream speed and captures 16/27, or 59.3%. No rotor of any design beats it. Real machines reach 0.35 to 0.48 including drivetrain losses, so a claim above 0.593 is not an engineering breakthrough, it is an error or a fraud -- and being able to check that in one line is worth having in front of a small-wind buyer. THIS IS NOT AN ENERGY ESTIMATE. Annual output depends on the DISTRIBUTION of wind speeds over the year, not on any single speed, and because power is cubic the average of the cubes is much larger than the cube of the average, so putting a mean wind speed into this relation understates energy substantially. It does not account for cut-in and cut-out speeds, rated power and the clipping above rated, availability, wake losses in an array, blade soiling and icing, or electrical losses, and air density must be corrected for site elevation and temperature. The manufacturer's warranted power curve and a site-specific energy assessment govern any production estimate.",
  };
}
const windPowerDensityBetzExample = { inputs: { wind_speed_mph: 20, air_density_pcf: 0.0765, rotor_diameter_ft: 380, power_coefficient: 0.45, alt_wind_speed_mph: 25 } };
WIND_RENDERERS["wind-power-density-betz"] = _simpleRenderer({
  citation: "Citation: the power in a free stream by name -- P = 0.5 x rho x A x v cubed, with the mass density taken as the entered weight density over g = 32.174 ft/s squared -- and the Betz limit of 16/27 = 0.593 as the theoretical maximum fraction any rotor can extract. Real machines reach 0.35 to 0.48 including drivetrain losses. The manufacturer's warranted power curve and a site-specific energy assessment govern any production estimate.",
  example: windPowerDensityBetzExample.inputs,
  fields: [
    { key: "wind_speed_mph", label: "Wind speed (mph)", kind: "number", default: 20 },
    { key: "air_density_pcf", label: "Air density (lb/cu ft; 0.0765 at sea level, 59 degF)", kind: "number", default: 0.0765 },
    { key: "rotor_diameter_ft", label: "Rotor diameter (ft)", kind: "number", default: 380 },
    { key: "power_coefficient", label: "Power coefficient Cp (0.35 to 0.48 real)", kind: "number", default: 0.45 },
    { key: "alt_wind_speed_mph", label: "Wind speed to compare (mph)", kind: "number", default: 25 },
  ],
  outputs: [
    { key: "a", id: "wpd-out-a", label: "Swept area", value: (r) => fmt(r.swept_area_ft2, 0) + " sq ft" },
    { key: "p", id: "wpd-out-p", label: "Power in the wind through the rotor", value: (r) => fmt(r.power_in_wind_kw, 0) + " kW, a power density of " + fmt(r.power_density_w_ft2, 1) + " W per sq ft" },
    { key: "b", id: "wpd-out-b", label: "Betz ceiling", value: (r) => fmt(r.betz_power_kw, 0) + " kW -- 59.3% of the wind, and no rotor of any design beats it" },
    { key: "e", id: "wpd-out-e", label: "Extracted at the entered coefficient", value: (r) => fmt(r.extracted_power_kw, 0) + " kW, " + fmt(r.coefficient_of_betz_pct, 0) + "% of the Betz ceiling" },
    { key: "c", id: "wpd-out-c", label: "At the compared wind speed", value: (r) => fmt(r.alt_extracted_kw, 0) + " kW -- " + fmt(r.alt_ratio, 3) + " times, because power goes as the CUBE of speed" },
    { key: "n", id: "wpd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWindPowerDensityBetz,
});

// ============ spec-v1552: wind shear to hub height ============

// dims: in { measured_speed_mph: L T^-1, measured_height_ft: L, hub_height_ft: L, shear_exponent: dimensionless, alt_shear_exponent: dimensionless, second_speed_mph: L T^-1, second_height_ft: L } out: { hub_speed_mph: L T^-1, energy_ratio: dimensionless, alt_hub_speed_mph: L T^-1, derived_exponent: dimensionless }
export function computeWindShearHubHeight({ measured_speed_mph = 0, measured_height_ft = 0, hub_height_ft = 0, shear_exponent = 0.2, alt_shear_exponent = 0.14, second_speed_mph = 0, second_height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(measured_speed_mph > 0)) return { error: "Measured wind speed must be positive." };
  if (!(measured_height_ft > 0)) return { error: "Measurement height must be positive." };
  if (!(hub_height_ft > 0)) return { error: "Hub height must be positive." };
  if (!(shear_exponent >= 0)) return { error: "The shear exponent cannot be negative." };
  if (!(alt_shear_exponent >= 0)) return { error: "The compared shear exponent cannot be negative." };
  if (!(second_speed_mph > 0)) return { error: "The second measured speed must be positive." };
  if (!(second_height_ft > 0)) return { error: "The second measurement height must be positive." };
  if (second_height_ft === measured_height_ft) return { error: "The two measurement heights must differ to derive a shear exponent." };
  const height_ratio = hub_height_ft / measured_height_ft;
  const speed_ratio = Math.pow(height_ratio, shear_exponent);
  const hub_speed_mph = measured_speed_mph * speed_ratio;
  const energy_ratio = Math.pow(speed_ratio, 3);
  const alt_hub_speed_mph = measured_speed_mph * Math.pow(height_ratio, alt_shear_exponent);
  const alt_energy_vs_entered = Math.pow(alt_hub_speed_mph / hub_speed_mph, 3);
  // Two anemometer levels on the same mast give the exponent by measurement,
  // which is worth far more than any table -- and is why met masts carry them.
  const derived_exponent = Math.log(second_speed_mph / measured_speed_mph) / Math.log(second_height_ft / measured_height_ft);
  const derived_hub_speed_mph = measured_speed_mph * Math.pow(height_ratio, derived_exponent);
  // Extrapolating much past twice the measurement height is not defensible.
  const extrapolation_ratio = height_ratio;
  return {
    height_ratio, speed_ratio, hub_speed_mph, energy_ratio,
    alt_hub_speed_mph, alt_energy_vs_entered,
    derived_exponent, derived_hub_speed_mph, extrapolation_ratio,
    extrapolation_verdict: extrapolation_ratio <= 2
      ? "within roughly twice the measurement height, which is about as far as a power law can be defended"
      : "MORE than twice the measurement height -- past the point a single power law can be defended for an energy assessment",
    note: "The exponent is the whole calculation and it is site-specific. The 1/7 value of 0.14 that gets used as a default belongs to flat open country in neutral stability; over crops, brush, or trees the profile is much steeper, and over water much flatter. Getting it from measurement -- two anemometer heights on the same mast, which is what the derived exponent here is -- is worth far more than any table, and it is the reason met masts carry multiple levels. THE AMPLIFICATION IS WHAT MAKES IT CONSEQUENTIAL. Because power is cubic, a shear exponent wrong by a few hundredths produces a wind speed error of a few percent and an ENERGY error of roughly three times that. On a twenty-year project that difference is the whole margin, which is why bankable energy assessments measure shear rather than assume it and increasingly measure at hub height directly with remote sensing. SHEAR ALSO VARIES THROUGH THE DAY AND THE YEAR. Nights are typically far more sheared than afternoons because the atmosphere stabilizes, so a short measurement campaign taken in one season can mislead in both directions. A power-law extrapolation with a single exponent. Real wind profiles are not power laws: they change with atmospheric stability, they distort over complex terrain and near forest canopies where the profile can be displaced upward or even reversed, and a single annual-average exponent hides large diurnal variation. Extrapolating far above the measurement height compounds all of it. It does not compute turbulence intensity, wind veer across the rotor, or the inflow angle, all of which affect both energy and loads, and it does not produce an energy estimate, which needs a full distribution and a power curve. A bankable assessment uses measured hub-height data or remote sensing to IEC 61400-12 and an independent energy assessor, which govern.",
  };
}
const windShearHubHeightExample = { inputs: { measured_speed_mph: 15, measured_height_ft: 160, hub_height_ft: 330, shear_exponent: 0.2, alt_shear_exponent: 0.14, second_speed_mph: 13.2, second_height_ft: 100 } };
WIND_RENDERERS["wind-shear-hub-height"] = _simpleRenderer({
  citation: "Citation: the power-law wind shear relation by name -- v2 = v1 x (z2 / z1) raised to the shear exponent alpha -- with the customary exponents 0.10 over water and smooth ground, 0.14 the open-country default, 0.20 over crops and scattered obstacles, and 0.25 to 0.40 over woodland and suburbs, and IEC 61400-12 named for the hub-height measurement this does not replace. An independent energy assessor governs a bankable estimate.",
  example: windShearHubHeightExample.inputs,
  fields: [
    { key: "measured_speed_mph", label: "Measured wind speed (mph)", kind: "number", default: 15 },
    { key: "measured_height_ft", label: "Measurement height (ft)", kind: "number", default: 160 },
    { key: "hub_height_ft", label: "Hub height (ft)", kind: "number", default: 330 },
    { key: "shear_exponent", label: "Shear exponent alpha", kind: "number", default: 0.2 },
    { key: "alt_shear_exponent", label: "Alpha to compare (the 0.14 default)", kind: "number", default: 0.14 },
    { key: "second_speed_mph", label: "Second anemometer speed (mph)", kind: "number", default: 13.2 },
    { key: "second_height_ft", label: "Second anemometer height (ft)", kind: "number", default: 100 },
  ],
  outputs: [
    { key: "v", id: "wsh-out-v", label: "Wind speed at hub height", value: (r) => fmt(r.hub_speed_mph, 2) + " mph, " + fmt(r.speed_ratio, 4) + " times the measured speed" },
    { key: "e", id: "wsh-out-e", label: "Energy at the hub against the measurement height", value: (r) => fmt(r.energy_ratio, 3) + " times -- " + fmt((r.energy_ratio - 1) * 100, 0) + "% more energy from height alone" },
    { key: "a", id: "wsh-out-a", label: "At the compared exponent", value: (r) => fmt(r.alt_hub_speed_mph, 2) + " mph, worth " + fmt(r.alt_energy_vs_entered, 3) + " times the entered case -- " + fmt(Math.abs(1 - r.alt_energy_vs_entered) * 100, 0) + "% of the energy estimate on the exponent alone" },
    { key: "d", id: "wsh-out-d", label: "Exponent measured from the two anemometers", value: (r) => fmt(r.derived_exponent, 3) + ", giving " + fmt(r.derived_hub_speed_mph, 2) + " mph at the hub" },
    { key: "x", id: "wsh-out-x", label: "How far this extrapolates", value: (r) => fmt(r.extrapolation_ratio, 2) + " times the measurement height -- " + r.extrapolation_verdict },
    { key: "n", id: "wsh-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWindShearHubHeight,
});

// ============ spec-v1553: Weibull distribution and capacity factor ============

// Lanczos gamma, g = 7, n = 9. Non-exported helper; the Weibull mean and the
// energy pattern factor both need Gamma(1 + 1/k) and Gamma(1 + 3/k).
const _LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
function _gamma(z) {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * _gamma(1 - z));
  z -= 1;
  let x = _LANCZOS[0];
  for (let i = 1; i < 9; i++) x += _LANCZOS[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// dims: in { weibull_k: dimensionless, weibull_c_mph: L T^-1, rated_power_kw: M L^2 T^-3, cut_in_mph: L T^-1, rated_speed_mph: L T^-1, cut_out_mph: L T^-1, loss_factor_pct: dimensionless } out: { mean_speed_mph: L T^-1, energy_pattern_factor: dimensionless, gross_aep_mwh: M L^2 T^-2, capacity_factor: dimensionless, hours_below_cut_in: T }
export function computeWeibullCapacityFactor({ weibull_k = 2, weibull_c_mph = 0, rated_power_kw = 0, cut_in_mph = 7, rated_speed_mph = 0, cut_out_mph = 55, loss_factor_pct = 15 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(weibull_k > 0)) return { error: "The Weibull shape parameter k must be positive." };
  if (!(weibull_c_mph > 0)) return { error: "The Weibull scale parameter c must be positive." };
  if (!(rated_power_kw > 0)) return { error: "Rated power must be positive (kW)." };
  if (!(cut_in_mph > 0)) return { error: "Cut-in speed must be positive." };
  if (!(rated_speed_mph > cut_in_mph)) return { error: "Rated speed must be above the cut-in speed." };
  if (!(cut_out_mph > rated_speed_mph)) return { error: "Cut-out speed must be above the rated speed." };
  if (!(loss_factor_pct >= 0 && loss_factor_pct < 100)) return { error: "The loss factor must be between 0 and 100 percent." };
  const mean_speed_mph = weibull_c_mph * _gamma(1 + 1 / weibull_k);
  // The energy pattern factor: the mean of the cubes over the cube of the
  // mean. This is the number that makes an average-speed estimate wrong.
  const energy_pattern_factor = _gamma(1 + 3 / weibull_k) / Math.pow(_gamma(1 + 1 / weibull_k), 3);
  const cdf = (v) => 1 - Math.exp(-Math.pow(v / weibull_c_mph, weibull_k));
  const pdf = (v) => (weibull_k / weibull_c_mph) * Math.pow(v / weibull_c_mph, weibull_k - 1) * Math.exp(-Math.pow(v / weibull_c_mph, weibull_k));
  const hours_below_cut_in = _HOURS_PER_YEAR * cdf(cut_in_mph);
  const hours_above_cut_out = _HOURS_PER_YEAR * (1 - cdf(cut_out_mph));
  const hours_operating = _HOURS_PER_YEAR - hours_below_cut_in - hours_above_cut_out;
  // The curve entered is the standard idealisation: cubic between cut-in and
  // rated, flat at rated up to cut-out. Integrated against the distribution,
  // which is the whole point -- a mean speed put into the cube law is not this.
  const steps = 2000;
  const dv = (rated_speed_mph - cut_in_mph) / steps;
  let below_rated_kwh = 0;
  for (let i = 0; i < steps; i++) {
    const v = cut_in_mph + (i + 0.5) * dv;
    below_rated_kwh += rated_power_kw * Math.pow(v / rated_speed_mph, 3) * pdf(v) * dv;
  }
  below_rated_kwh *= _HOURS_PER_YEAR;
  const at_rated_kwh = rated_power_kw * _HOURS_PER_YEAR * (cdf(cut_out_mph) - cdf(rated_speed_mph));
  const gross_aep_mwh = (below_rated_kwh + at_rated_kwh) / 1000;
  const net_aep_mwh = gross_aep_mwh * (1 - loss_factor_pct / 100);
  const rated_annual_mwh = rated_power_kw * _HOURS_PER_YEAR / 1000;
  const capacity_factor = net_aep_mwh / rated_annual_mwh;
  const gross_capacity_factor = gross_aep_mwh / rated_annual_mwh;
  return {
    mean_speed_mph, energy_pattern_factor,
    hours_below_cut_in, hours_above_cut_out, hours_operating,
    gross_aep_mwh, net_aep_mwh, rated_annual_mwh,
    capacity_factor, gross_capacity_factor,
    hours_at_rated: _HOURS_PER_YEAR * (cdf(cut_out_mph) - cdf(rated_speed_mph)),
    cf_verdict: capacity_factor > 0.6
      ? "ABOVE 60% -- onshore that deserves the same scepticism as a power coefficient above Betz"
      : capacity_factor >= 0.35
        ? "in the 35 to 45% band a modern onshore machine reaches at a decent site"
        : "below the 35 to 45% band a modern onshore machine reaches at a decent site",
    note: "The energy pattern factor is the number that makes the point: at a shape parameter of 2 the mean of the cubes is about 1.9 times the cube of the mean, so an energy estimate built on average wind speed alone is low by nearly half. Every serious wind calculation is an integral of the power curve against the distribution for exactly that reason, and the shape parameter controls how pronounced the effect is -- a low k means a broad distribution with more very windy hours and a higher pattern factor, a high k means steadier wind and less of the effect. CAPACITY FACTOR PUTS THE RESULT IN A COMPARABLE FORM. It is the honest measure of a site and a machine together, and it is what makes a large rotor on a modest tower comparable with a small rotor on a tall one. A modern onshore machine at a decent site runs 35 to 45% and offshore runs higher; a capacity factor claimed above about 60% onshore deserves the same scepticism as a power coefficient above Betz. THE HOURS MATTER AS MUCH AS THE ENERGY. A site can look windy on its mean and still spend a large share of the year below cut-in making nothing at all, and those hours are what a mean speed hides completely. A distribution and capacity-factor calculation from Weibull parameters the user supplies, integrated against an idealised curve that is cubic between cut-in and rated and flat at rated to cut-out. Fitting the parameters requires a year or more of measured data at or near hub height; parameters from a wind atlas or a nearby station are indicative only and are routinely wrong for a specific site, especially in complex terrain. A real machine's curve is not the idealisation used here, and the manufacturer's warranted curve governs. The loss factor entered stands for wake losses within an array, availability, electrical and transformer losses, blade soiling and icing, curtailment for noise, shadow flicker or wildlife, and high-wind hysteresis at cut-out, which typically remove 10 to 20% combined. A bankable energy assessment to IEC 61400-12 by an independent assessor governs.",
  };
}
const weibullCapacityFactorExample = { inputs: { weibull_k: 2, weibull_c_mph: 18, rated_power_kw: 2500, cut_in_mph: 7, rated_speed_mph: 27, cut_out_mph: 55, loss_factor_pct: 15 } };
WIND_RENDERERS["weibull-capacity-factor"] = _simpleRenderer({
  citation: "Citation: the two-parameter Weibull distribution by name -- f(v) = (k/c)(v/c) raised to (k-1), times exp of minus (v/c) raised to k -- with the mean speed c x Gamma(1 + 1/k), the energy pattern factor Gamma(1 + 3/k) over Gamma(1 + 1/k) cubed, and the capacity factor as annual energy over rated power times 8,760 hours. IEC 61400-12 and an independent energy assessor govern a bankable estimate.",
  example: weibullCapacityFactorExample.inputs,
  fields: [
    { key: "weibull_k", label: "Weibull shape k (2.0 is Rayleigh)", kind: "number", default: 2 },
    { key: "weibull_c_mph", label: "Weibull scale c (mph)", kind: "number", default: 18 },
    { key: "rated_power_kw", label: "Rated power (kW)", kind: "number", default: 2500 },
    { key: "cut_in_mph", label: "Cut-in wind speed (mph)", kind: "number", default: 7 },
    { key: "rated_speed_mph", label: "Rated wind speed (mph)", kind: "number", default: 27 },
    { key: "cut_out_mph", label: "Cut-out wind speed (mph)", kind: "number", default: 55 },
    { key: "loss_factor_pct", label: "Wake, availability, and electrical losses (%)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "m", id: "wcf-out-m", label: "Mean wind speed from the distribution", value: (r) => fmt(r.mean_speed_mph, 2) + " mph" },
    { key: "e", id: "wcf-out-e", label: "Energy pattern factor", value: (r) => fmt(r.energy_pattern_factor, 3) + " -- an estimate built on the mean speed alone is low by that factor" },
    { key: "h", id: "wcf-out-h", label: "Hours of the year", value: (r) => fmt(r.hours_below_cut_in, 0) + " below cut-in, " + fmt(r.hours_operating, 0) + " running, " + fmt(r.hours_at_rated, 0) + " of them at rated" },
    { key: "a", id: "wcf-out-a", label: "Annual energy", value: (r) => fmt(r.gross_aep_mwh, 0) + " MWh gross, " + fmt(r.net_aep_mwh, 0) + " MWh after the entered losses" },
    { key: "c", id: "wcf-out-c", label: "Capacity factor", value: (r) => fmt(r.capacity_factor * 100, 1) + "% net (" + fmt(r.gross_capacity_factor * 100, 1) + "% gross) -- " + r.cf_verdict },
    { key: "n", id: "wcf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWeibullCapacityFactor,
});

// ============ spec-v1554: air-density correction against a power curve ============

// dims: in { elevation_ft: L, air_temp_f: T, reference_density_pcf: M L^-3, measured_power_kw: M L^2 T^-3, curve_power_kw: M L^2 T^-3, wind_speed_mph: L T^-1, alt_air_temp_f: T } out: { site_density_pcf: M L^-3, density_ratio: dimensionless, corrected_curve_power_kw: M L^2 T^-3, iec_corrected_wind_mph: L T^-1 }
export function computeTurbineDensityCorrection({ elevation_ft = 0, air_temp_f = 59, reference_density_pcf = _RHO_REF_PCF, measured_power_kw = 0, curve_power_kw = 0, wind_speed_mph = 0, alt_air_temp_f = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(elevation_ft >= 0)) return { error: "Elevation cannot be negative." };
  if (!(459.67 + air_temp_f > 0)) return { error: "Air temperature is below absolute zero." };
  if (!(459.67 + alt_air_temp_f > 0)) return { error: "The compared air temperature is below absolute zero." };
  if (!(reference_density_pcf > 0)) return { error: "Reference density must be positive (lb/cu ft)." };
  if (!(measured_power_kw > 0)) return { error: "Measured power must be positive (kW)." };
  if (!(curve_power_kw > 0)) return { error: "The power curve's value at this wind speed must be positive (kW)." };
  if (!(wind_speed_mph > 0)) return { error: "Wind speed must be positive." };
  // The ISA barometric power law, the same relation `air-density-correction`
  // uses for HVAC air, so the two calculators agree about the air at a site.
  // Its reference differs: a wind power curve is warranted at 59 degF, where
  // standard HVAC air is 70 degF.
  const altitude_factor = Math.pow(1 - 6.73e-6 * elevation_ft, 5.258);
  if (!(altitude_factor > 0)) return { error: "Elevation is outside the range this barometric relation covers." };
  const temperature_factor = _T_REF_R / (459.67 + air_temp_f);
  const site_density_pcf = reference_density_pcf * temperature_factor * altitude_factor;
  const density_ratio = site_density_pcf / reference_density_pcf;
  // Power is LINEAR in density and cubic in speed, so the two corrections are
  // applied differently -- and the IEC performance test scales the SPEED.
  const corrected_curve_power_kw = curve_power_kw * density_ratio;
  const measured_of_curve_pct = measured_power_kw / curve_power_kw * 100;
  const measured_of_corrected_pct = measured_power_kw / corrected_curve_power_kw * 100;
  const iec_speed_factor = Math.cbrt(density_ratio);
  const iec_corrected_wind_mph = wind_speed_mph * iec_speed_factor;
  const alt_density_pcf = reference_density_pcf * (_T_REF_R / (459.67 + alt_air_temp_f)) * altitude_factor;
  const alt_vs_entered = alt_density_pcf / site_density_pcf;
  return {
    altitude_factor, temperature_factor, site_density_pcf, density_ratio,
    corrected_curve_power_kw, curve_power_kw, measured_of_curve_pct, measured_of_corrected_pct,
    iec_speed_factor, iec_corrected_wind_mph,
    alt_density_pcf, alt_vs_entered,
    performance_verdict: measured_of_corrected_pct >= 97
      ? "at or above the density-corrected curve -- performing correctly, not faulted"
      : "below the density-corrected curve even after the correction, which is where a real performance question starts",
    note: "Power is linear in density and cubic in speed, so the two corrections are applied differently and must not be mixed up. Density falls with altitude and with temperature, and both effects run the same way on a hot summer afternoon at elevation -- which is precisely when the grid wants the power most. THE DIAGNOSTIC USE IS THE PRACTICAL ONE. A machine that looks like it is underperforming its curve on a hot day at altitude may be performing exactly as it should, and this correction is what distinguishes a fault from physics; the same reading against the uncorrected curve looks like a problem and against the corrected one does not. THE IEC CONVENTION IS WORTH KNOWING because it is what a performance test actually uses: rather than scaling power, it scales the measured WIND SPEED by the cube root of the density ratio and then reads the standard curve. The two approaches agree in the region where power is roughly cubic in speed and diverge near rated, where the machine is power-limited and density affects only where rated is reached, not the rated value itself. That is also the limit of the linear correction here: applying it to RATED power is wrong. A density correction using the ISA barometric relation. Where a measured barometric pressure is available it is better than an elevation estimate, and humidity has a small further effect not modelled. Pitch-regulated and stall-regulated machines respond differently to density and the manufacturer's method governs. It does not evaluate whether a machine meets its warranted curve, which is a formal measurement to IEC 61400-12 with defined sectors, filtering, and uncertainty. The turbine manufacturer's power curve, its stated reference conditions and correction method, and IEC 61400-12 govern.",
  };
}
const turbineDensityCorrectionExample = { inputs: { elevation_ft: 5200, air_temp_f: 95, reference_density_pcf: 0.0765, measured_power_kw: 1850, curve_power_kw: 2200, wind_speed_mph: 20, alt_air_temp_f: 20 } };
WIND_RENDERERS["turbine-density-correction"] = _simpleRenderer({
  citation: "Citation: the ISA barometric density relation by name -- the altitude factor (1 - 6.73e-6 x elevation) raised to 5.258, times the temperature factor 518.67 / (459.67 + degF) -- against the IEC/ISO reference of 0.0765 lb/cu ft at 59 degF and sea level, with the IEC 61400-12 cube-root wind-speed correction named. Power is linear in density below rated only. The turbine manufacturer's power curve, its stated reference conditions and correction method, and IEC 61400-12 govern.",
  example: turbineDensityCorrectionExample.inputs,
  fields: [
    { key: "elevation_ft", label: "Site elevation (ft)", kind: "number", default: 5200 },
    { key: "air_temp_f", label: "Air temperature (degF)", kind: "number", attrs: { step: "any" }, default: 95 },
    { key: "reference_density_pcf", label: "Power curve reference density (lb/cu ft)", kind: "number", default: 0.0765 },
    { key: "measured_power_kw", label: "Measured power (kW)", kind: "number", default: 1850 },
    { key: "curve_power_kw", label: "Power curve value at this wind (kW)", kind: "number", default: 2200 },
    { key: "wind_speed_mph", label: "Measured wind speed (mph)", kind: "number", default: 20 },
    { key: "alt_air_temp_f", label: "Temperature to compare (degF)", kind: "number", attrs: { step: "any" }, default: 20 },
  ],
  outputs: [
    { key: "d", id: "tdc-out-d", label: "Site air density", value: (r) => fmt(r.site_density_pcf, 5) + " lb/cu ft, " + fmt(r.density_ratio * 100, 1) + "% of the curve's reference" },
    { key: "p", id: "tdc-out-p", label: "Density-corrected curve value", value: (r) => fmt(r.corrected_curve_power_kw, 0) + " kW, against " + fmt(r.curve_power_kw, 0) + " kW warranted" },
    { key: "m", id: "tdc-out-m", label: "How the machine is actually doing", value: (r) => fmt(r.measured_of_curve_pct, 0) + "% of the raw curve but " + fmt(r.measured_of_corrected_pct, 0) + "% of the corrected one -- " + r.performance_verdict },
    { key: "i", id: "tdc-out-i", label: "The IEC form, correcting the wind instead", value: (r) => fmt(r.iec_corrected_wind_mph, 2) + " mph reads against the standard curve (a cube-root factor of " + fmt(r.iec_speed_factor, 4) + ")" },
    { key: "a", id: "tdc-out-a", label: "At the compared temperature", value: (r) => fmt(r.alt_density_pcf, 5) + " lb/cu ft -- " + fmt(r.alt_vs_entered * 100, 0) + "% of the entered day, so the same wind makes " + fmt((r.alt_vs_entered - 1) * 100, 0) + "% more power" },
    { key: "n", id: "tdc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTurbineDensityCorrection,
});

// ============ spec-v1555: yaw misalignment power loss ============

// dims: in { yaw_error_deg: dimensionless, rated_power_kw: M L^2 T^-3, capacity_factor_pct: dimensionless, energy_price_per_mwh: dimensionless, turbine_count: dimensionless, acceptable_loss_pct: dimensionless } out: { loss_cubed_pct: dimensionless, loss_squared_pct: dimensionless, annual_mwh: M L^2 T^-2, lost_mwh: M L^2 T^-2, acceptable_angle_deg: dimensionless }
export function computeYawErrorLoss({ yaw_error_deg = 0, rated_power_kw = 0, capacity_factor_pct = 40, energy_price_per_mwh = 40, turbine_count = 1, acceptable_loss_pct = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(yaw_error_deg >= 0 && yaw_error_deg < 90)) return { error: "Yaw error must be at least 0 and less than 90 degrees." };
  if (!(rated_power_kw > 0)) return { error: "Rated power must be positive (kW)." };
  if (!(capacity_factor_pct > 0 && capacity_factor_pct <= 100)) return { error: "Capacity factor must be between 0 and 100 percent." };
  if (!(energy_price_per_mwh >= 0)) return { error: "Energy price cannot be negative." };
  if (!(turbine_count >= 1)) return { error: "Turbine count must be at least 1." };
  if (!(acceptable_loss_pct > 0 && acceptable_loss_pct < 100)) return { error: "The acceptable loss must be between 0 and 100 percent." };
  const c = Math.cos(yaw_error_deg * Math.PI / 180);
  // The cubed form comes from the rotor seeing only the along-axis component
  // of the wind, carried through the cubic power relation. The true exponent
  // is machine-specific and between 2 and 3, so both are reported and the
  // cubed result is the pessimistic bound.
  const retained_cubed = Math.pow(c, 3);
  const retained_squared = Math.pow(c, 2);
  const loss_cubed_pct = (1 - retained_cubed) * 100;
  const loss_squared_pct = (1 - retained_squared) * 100;
  const annual_mwh = rated_power_kw * _HOURS_PER_YEAR * (capacity_factor_pct / 100) / 1000;
  const lost_mwh = annual_mwh * (loss_cubed_pct / 100);
  const lost_mwh_squared = annual_mwh * (loss_squared_pct / 100);
  const lost_usd = lost_mwh * energy_price_per_mwh;
  const fleet_lost_usd = lost_usd * turbine_count;
  // The inverse a technician actually wants: how far off is worth chasing.
  const acceptable_angle_deg = Math.acos(Math.cbrt(1 - acceptable_loss_pct / 100)) * 180 / Math.PI;
  return {
    retained_cubed, retained_squared, loss_cubed_pct, loss_squared_pct,
    annual_mwh, lost_mwh, lost_mwh_squared, lost_usd, fleet_lost_usd,
    acceptable_angle_deg, turbine_count,
    chase_verdict: yaw_error_deg <= acceptable_angle_deg
      ? "inside the entered acceptable loss -- scatter this size is the controller doing its job"
      : "past the entered acceptable loss, and a PERSISTENT error this size is a calibration rather than a repair",
    note: "What makes yaw error expensive is not the magnitude but the persistence. A gust that swings the wind twenty degrees for a minute costs nothing worth measuring; a wind vane that reads a few degrees off, all year, costs a few percent of annual revenue on every hour the machine runs -- silently, with no alarm and no visible symptom. Static yaw misalignment is routinely found on machines that have been running for years, and correcting it is a calibration rather than a repair, which makes it among the cheapest faults in the industry to fix and one of the most commonly missed. THE FIELD PROCEDURE THIS SUPPORTS is comparing nacelle position against the free-stream wind direction over a period and looking for a persistent BIAS rather than scatter. Scatter is the controller doing its job; a bias is money. THE EXPONENT IS AN APPROXIMATION AND BOTH FORMS ARE REPORTED. The true exponent is machine-specific and lies between 2 and 3, and real measured losses often fall closer to the squared form at small angles, so the cubed result should be read as the pessimistic bound rather than as the answer. It does not account for the increased fatigue loading that yaw misalignment causes, which on a persistent error can matter more than the energy, or for wind veer and shear across the rotor which produce an effective misalignment that no yaw correction removes. It does not distinguish static misalignment from dynamic yaw error and does not evaluate nacelle anemometer or vane transfer functions, which is what a proper yaw calibration campaign does using a met mast or remote sensing, and it does not address cable twist, yaw drive loading, or yaw system faults. The turbine manufacturer's yaw calibration procedure and the operator's performance engineer govern.",
  };
}
const yawErrorLossExample = { inputs: { yaw_error_deg: 12, rated_power_kw: 2500, capacity_factor_pct: 40, energy_price_per_mwh: 40, turbine_count: 30, acceptable_loss_pct: 2 } };
WIND_RENDERERS["yaw-error-loss"] = _simpleRenderer({
  citation: "Citation: the cosine-power yaw loss convention by name -- retained power = cosine of the yaw error raised to the third power, from the rotor seeing only the along-axis wind component carried through the cubic power relation -- with the squared form reported beside it because the true exponent is machine-specific and lies between 2 and 3. The turbine manufacturer's yaw calibration procedure and the operator's performance engineer govern.",
  example: yawErrorLossExample.inputs,
  fields: [
    { key: "yaw_error_deg", label: "Persistent yaw error (deg)", kind: "number", default: 12 },
    { key: "rated_power_kw", label: "Rated power (kW)", kind: "number", default: 2500 },
    { key: "capacity_factor_pct", label: "Capacity factor (%)", kind: "number", default: 40 },
    { key: "energy_price_per_mwh", label: "Energy price ($ per MWh)", kind: "number", default: 40 },
    { key: "turbine_count", label: "Turbines with this error", kind: "number", default: 30 },
    { key: "acceptable_loss_pct", label: "Loss worth chasing (%)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "l", id: "yel-out-l", label: "Power lost", value: (r) => fmt(r.loss_cubed_pct, 2) + "% on the cubed form, " + fmt(r.loss_squared_pct, 2) + "% on the squared -- read the cubed as the pessimistic bound" },
    { key: "e", id: "yel-out-e", label: "Annual energy lost, one machine", value: (r) => fmt(r.lost_mwh, 0) + " MWh of " + fmt(r.annual_mwh, 0) + " MWh" },
    { key: "d", id: "yel-out-d", label: "Annual revenue lost, one machine", value: (r) => "$" + fmt(r.lost_usd, 0) },
    { key: "f", id: "yel-out-f", label: "Across the entered fleet", value: (r) => "$" + fmt(r.fleet_lost_usd, 0) + " a year from " + fmt(r.turbine_count, 0) + " machines, on a wind vane calibration" },
    { key: "a", id: "yel-out-a", label: "Error worth chasing", value: (r) => "anything past " + fmt(r.acceptable_angle_deg, 1) + " deg -- " + r.chase_verdict },
    { key: "n", id: "yel-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeYawErrorLoss,
});

// ============ spec-v1556: gin-pole and uptower lift load ============

// dims: in { component_weight_lb: M, haul_angle_deg: dimensionless, pole_length_ft: L, mount_rated_lb: M, hauled_line_angle_deg: dimensionless } out: { head_resultant_lb: M, head_horizontal_lb: M, mount_moment_ftlb: M L, direct_line_pull_lb: M, max_component_lb: M }
export function computeGinPoleUptowerLift({ component_weight_lb = 0, haul_angle_deg = 0, pole_length_ft = 0, mount_rated_lb = 0, hauled_line_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(component_weight_lb > 0)) return { error: "Component weight including rigging must be positive." };
  if (!(haul_angle_deg >= 0 && haul_angle_deg < 180)) return { error: "The haul line's angle from vertical must be at least 0 and less than 180 degrees." };
  if (!(pole_length_ft > 0)) return { error: "Pole or davit length must be positive." };
  if (!(mount_rated_lb > 0)) return { error: "The mounting's rated capacity must be positive." };
  if (!(hauled_line_angle_deg >= 0 && hauled_line_angle_deg < 90)) return { error: "The direct-haul angle from vertical must be at least 0 and less than 90 degrees." };
  const beta = haul_angle_deg * Math.PI / 180;
  // A sheave at the pole head with the load hanging on one side and the haul
  // line leaving on the other: the head carries the VECTOR SUM of two line
  // tensions, which for a frictionless single sheave are both the weight.
  // The resultant is 2 W cos(beta/2) -- exactly 2 W when the haul line is
  // vertical, and FALLING as the haul line opens out.
  const head_resultant_lb = 2 * component_weight_lb * Math.cos(beta / 2);
  const head_horizontal_lb = component_weight_lb * Math.sin(beta);
  const head_vertical_lb = component_weight_lb * (1 + Math.cos(beta));
  const resultant_multiple = head_resultant_lb / component_weight_lb;
  // The moment the mounting has to carry is the horizontal component acting
  // at the head, on the pole's own length as the lever.
  const mount_moment_ftlb = head_horizontal_lb * pole_length_ft;
  const mount_margin_pct = (mount_rated_lb / head_resultant_lb - 1) * 100;
  const max_component_lb = mount_rated_lb / (2 * Math.cos(beta / 2));
  // The other configuration, and the one the sling calculators already cover:
  // hauling the load directly at an angle rather than over a sheave.
  const theta = hauled_line_angle_deg * Math.PI / 180;
  const direct_line_pull_lb = component_weight_lb / Math.cos(theta);
  const direct_side_load_lb = direct_line_pull_lb * Math.sin(theta);
  const angle_premium_lb = direct_line_pull_lb - component_weight_lb;
  return {
    head_resultant_lb, head_horizontal_lb, head_vertical_lb, resultant_multiple,
    mount_moment_ftlb, mount_margin_pct, max_component_lb,
    direct_line_pull_lb, direct_side_load_lb, angle_premium_lb, component_weight_lb,
    mount_verdict: mount_margin_pct >= 0
      ? "within the entered mounting rating, with " + fmt(mount_margin_pct, 0) + "% margin"
      : "OVER the entered mounting rating by " + fmt(-mount_margin_pct, 0) + "% -- the mount, not the pole, is what fails",
    note: "The number that surprises people is the head resultant. A sheave at the pole head has the load hanging on one side and the haul line leaving on the other, so the head carries the VECTOR SUM of two tensions rather than one: with the haul line vertical that is exactly TWICE the part's weight, and a mounting rated for the part is rated for half of what it is actually being asked to carry. The resultant then FALLS as the haul line opens away from vertical while the moment at the base RISES, so the two effects run opposite ways and the geometry that is easiest on the mount in one respect is worst in the other. THAT MOUNT IS THE PART THAT FAILS. It is a bracket bolted to a casting or a frame that was designed for a specific geometry, and the reaction depends on where the crew leads the line in the field rather than on anything the manufacturer fixed. THE OTHER CONFIGURATION -- hauling the load directly at an angle rather than over a sheave -- raises the line pull above the weight by one over the cosine of the angle, which is the same relation the sling calculators apply to a leg angle, and it is reported here so the two cases are not confused. On an uptower lift the crew has limited control over that angle because the ground rigging is hundreds of feet below and the wind is moving the load, which is why uptower lifts carry tight wind limits and why tag lines matter more here than on the ground. A statics screen for one lift at one geometry. It does not design or rate a gin pole, davit, or its mounting: the turbine manufacturer supplies the uptower lifting provisions with their rated capacities, allowable geometries, and permitted wind speeds, and those ratings govern absolutely. It does not evaluate the pole in buckling, the mounting bolts, or the nacelle structure the mount attaches to, and it does not model dynamic amplification from starting and stopping the hoist, which on a long line is significant, or the wind load and swing on a suspended component. Uptower lifting is a fall-and-dropped-object hazard at height: the turbine manufacturer's service instructions and rated lifting provisions, the site lift plan, a qualified rigger, and OSHA govern.",
  };
}
const ginPoleUptowerLiftExample = { inputs: { component_weight_lb: 3800, haul_angle_deg: 25, pole_length_ft: 12, mount_rated_lb: 6000, hauled_line_angle_deg: 15 } };
WIND_RENDERERS["gin-pole-uptower-lift"] = _simpleRenderer({
  citation: "Citation: single-line rigging statics by name -- a sheave at the pole head carries the vector sum of the load line and the haul line, giving a resultant of 2 W cos(half the haul angle) with a horizontal component W sin(haul angle), and a direct haul at an angle from vertical pulls W over the cosine of that angle. The turbine manufacturer's uptower lifting provisions and their rated capacities, the site lift plan, a qualified rigger, and OSHA govern.",
  example: ginPoleUptowerLiftExample.inputs,
  fields: [
    { key: "component_weight_lb", label: "Component weight including rigging (lb)", kind: "number", default: 3800 },
    { key: "haul_angle_deg", label: "Haul line angle from vertical at the head (deg)", kind: "number", default: 25 },
    { key: "pole_length_ft", label: "Pole or davit length (ft)", kind: "number", default: 12 },
    { key: "mount_rated_lb", label: "Mounting rated capacity (lb)", kind: "number", default: 6000 },
    { key: "hauled_line_angle_deg", label: "Direct-haul angle from vertical (deg)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "r", id: "gpu-out-r", label: "Resultant at the pole head", value: (r) => fmt(r.head_resultant_lb, 0) + " lb -- " + fmt(r.resultant_multiple, 2) + " times the part's own weight" },
    { key: "h", id: "gpu-out-h", label: "Split at the head", value: (r) => fmt(r.head_vertical_lb, 0) + " lb down, " + fmt(r.head_horizontal_lb, 0) + " lb sideways" },
    { key: "m", id: "gpu-out-m", label: "Moment at the mounting", value: (r) => fmt(r.mount_moment_ftlb, 0) + " ft-lb on the pole's own length" },
    { key: "c", id: "gpu-out-c", label: "Against the mounting rating", value: (r) => r.mount_verdict + "; the heaviest part this geometry supports is " + fmt(r.max_component_lb, 0) + " lb" },
    { key: "d", id: "gpu-out-d", label: "Hauled directly at an angle instead", value: (r) => fmt(r.direct_line_pull_lb, 0) + " lb of line pull for a " + fmt(r.component_weight_lb || 0, 0) + " lb part -- " + fmt(r.angle_premium_lb, 0) + " lb bought purely by the angle, and " + fmt(r.direct_side_load_lb, 0) + " lb of it horizontal" },
    { key: "n", id: "gpu-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGinPoleUptowerLift,
});
