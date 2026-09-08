// calc-lineworker.js -- the overhead line and distribution bench.
//
// specs/scope-trade-expansion-2.md probed thirty US trades against the live
// registry and overhead line work came back at ZERO. The catalog had
// `spanline-sag-tension` -- the static parabola `H = w L^2 / (8 d)` for a
// rigging highline at ONE condition -- and `guy-wire-tension`, which gives the
// pull in a guy and says nothing about whether the ground will hold it. What
// line work needs is the move BETWEEN conditions, the loading case that sets
// the weight per foot in the first place, and the structure check at the other
// end of it.
//
// Tiles (all group "A", the existing Electrical category):
//   v1450 ruling-span                v1456 guy-anchor-holding-capacity
//   v1451 conductor-sag-at-temperature  v1457 transverse-wind-load-conductor
//   v1452 conductor-blowout          v1458 nesc-district-loading
//   v1453 conductor-uplift-check     v1459 conductor-creep-elongation
//   v1454 line-ground-clearance-nesc v1460 sagging-return-wave
//   v1455 pole-class-groundline-moment
//
// THREE OF THE ELEVEN SPECS WERE INTERNALLY WRONG, and two of them the same
// way: spec-v1454 and spec-v1459 both cite spec-v1451's worked example as
// having bought "8.0 ft of sag" over sixty degrees. It bought 3.03 ft; 8.21 ft
// is that example's INITIAL sag, which both specs picked up by mistake.
// spec-v1453 puts the uplift threshold at 1,140 lb where its own relation gives
// `w L^2 / (2 h)` = 2,279 lb -- it divided by the elevation term twice.
//
// NO NESC TABLE IS SHIPPED. Required clearances depend on voltage, on what is
// under the line, and on the edition the jurisdiction adopted, so they are
// entered -- the same reason `pole-embedment-depth` takes lateral bearing as an
// input. A table copied into a calculator is a table that goes stale silently.

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
// calc-steamplant.js / calc-diving.js / calc-wind.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _lwRender = function (inputRegion, outputRegion, citationEl) {
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

  _lwRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _lwRender;
}

export const LINEWORKER_RENDERERS = {};

// 0.00256 is the ASCE 7 velocity-pressure constant `wind-pressure` uses, so
// the two calculators cannot disagree about the pressure at a given speed.
// 57.3 lb/ft^3 is the density of ice; 144 sq in per sq ft; 12 in per ft.
const _ASCE_VELOCITY_PRESSURE = 0.00256;
const _ICE_DENSITY_PCF = 57.3;
const _IN2_PER_FT2 = 144;
const _IN_PER_FT = 12;

// The change-of-state equation is a cubic in the final horizontal tension:
//   H2^2 (H2 + K) = C
// with K = -H1 + E A alpha (t2 - t1) + w1^2 L^2 E A / (24 H1^2) and
// C = w2^2 L^2 E A / 24. C > 0, so by Descartes there is exactly ONE positive
// real root whatever the sign of K. Bisect to bracket it, then polish with
// Newton -- no closed form is worth writing on a tailboard, which is the whole
// reason this belongs in a calculator.
function _changeOfStateTension(K, C) {
  const f = (H) => H * H * H + K * H * H - C;
  let hi = Math.max(2 * Math.cbrt(C), 2 * Math.abs(K), 1);
  for (let i = 0; i < 200 && f(hi) < 0; i++) hi *= 2;
  if (!(f(hi) >= 0)) return NaN;
  let lo = 0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid; else hi = mid;
  }
  let H = (lo + hi) / 2;
  for (let i = 0; i < 40; i++) {
    const d = 3 * H * H + 2 * K * H;
    if (!(Math.abs(d) > 0)) break;
    const step = f(H) / d;
    H -= step;
    if (!Number.isFinite(H) || H <= 0) return (lo + hi) / 2;
    if (Math.abs(step) < 1e-10 * Math.max(1, H)) break;
  }
  return H;
}

// ============ spec-v1450: ruling (equivalent) span ============

// dims: in { span_1_ft: L, span_2_ft: L, span_3_ft: L, span_4_ft: L, span_5_ft: L, span_6_ft: L, span_7_ft: L, span_8_ft: L, ruling_span_sag_ft: L } out: { ruling_span_ft: L, average_span_ft: L, field_approximation_ft: L, longest_span_sag_ft: L, shortest_span_sag_ft: L }
export function computeRulingSpan({ span_1_ft = 0, span_2_ft = 0, span_3_ft = 0, span_4_ft = 0, span_5_ft = 0, span_6_ft = 0, span_7_ft = 0, span_8_ft = 0, ruling_span_sag_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const entered = [span_1_ft, span_2_ft, span_3_ft, span_4_ft, span_5_ft, span_6_ft, span_7_ft, span_8_ft];
  if (entered.some((s) => s < 0)) return { error: "A span length cannot be negative (ft)." };
  const spans = entered.filter((s) => s > 0);
  if (spans.length === 0) return { error: "Enter at least one span length (ft). Leave the unused slots at zero." };
  if (ruling_span_sag_ft < 0) return { error: "The reference sag cannot be negative (ft)." };
  // The ruling span is a CUBE-weighted mean, so the long spans dominate it.
  const sum_l = spans.reduce((a, s) => a + s, 0);
  const sum_l3 = spans.reduce((a, s) => a + s * s * s, 0);
  const ruling_span_ft = Math.sqrt(sum_l3 / sum_l);
  const average_span_ft = sum_l / spans.length;
  // reduce rather than a spread into Math.max: a spread reads as an opaque
  // construction to check-render-output-keys, which has a budget of seven.
  const longest_span_ft = spans.reduce((a, s) => (s > a ? s : a), spans[0]);
  const shortest_span_ft = spans.reduce((a, s) => (s < a ? s : a), spans[0]);
  const field_approximation_ft = average_span_ft + (2 / 3) * (longest_span_ft - average_span_ft);
  const approximation_error_ft = field_approximation_ft - ruling_span_ft;
  const approximation_error_pct = ruling_span_ft > 0 ? approximation_error_ft / ruling_span_ft * 100 : 0;
  const ruling_to_average_ratio = average_span_ft > 0 ? ruling_span_ft / average_span_ft : 0;
  // Sag in any individual span scales as the SQUARE of its own length over the
  // ruling span. Sagging every span to the ruling-span sag is the classic error.
  const sagFor = (L) => ruling_span_sag_ft * (L / ruling_span_ft) * (L / ruling_span_ft);
  const longest_span_sag_ft = sagFor(longest_span_ft);
  const shortest_span_sag_ft = sagFor(shortest_span_ft);
  const sag_spread_ratio = shortest_span_sag_ft > 0 ? longest_span_sag_ft / shortest_span_sag_ft : 0;
  const per_span_sag_ft = spans.map(sagFor);
  const outs = [ruling_span_ft, average_span_ft, field_approximation_ft, longest_span_sag_ft, shortest_span_sag_ft];
  if (!outs.every(Number.isFinite)) return { error: "Ruling-span math is not a finite value." };
  return {
    span_count: spans.length, sum_l, sum_l3, ruling_span_ft, average_span_ft,
    longest_span_ft, shortest_span_ft, field_approximation_ft,
    approximation_error_ft, approximation_error_pct, ruling_to_average_ratio,
    ruling_span_sag_ft, longest_span_sag_ft, shortest_span_sag_ft, sag_spread_ratio,
    per_span_sag_ft,
    approximation_verdict: Math.abs(approximation_error_pct) <= 5
      ? "within 5% of the exact value -- the spans are similar enough that the tailboard rule holds"
      : "off by " + fmt(Math.abs(approximation_error_pct), 1) + "%, which is what the rule does when one span dominates: use the exact value",
    note: "The ruling span is not the average span and it is not the longest span. It is a cube-weighted mean, so the long spans dominate it: a section of four spans where one is nearly twice the others lands well above the arithmetic average, because that long span governs how the whole section moves when the conductor heats up. Two consequences a crew acts on. First, the stringing chart is entered at the ruling span, not at the span in front of the truck. Second, once the section is sagged to one tension, the sag in any individual span scales as the SQUARE of its own length over the ruling span -- so on a 300, 450, 380, 520 ft section with a 435.96 ft ruling span sagged to 12.0 ft, the 300 ft span sags 5.68 ft and the 520 ft span sags 17.07 ft. That is a factor of three across the same conductor at the same tension on the same day, and pulling all four to 12 ft leaves the short spans badly overtensioned and the long ones in the road. The tailboard approximation, average plus two thirds of the difference between the longest and the average, is reported beside the exact value because it is what actually gets used -- and seeing the two together shows when it is good enough. On that same section it lands at 484.2 ft against 435.96, 11.1% high, which is exactly the case its own rule of thumb warns about: it is close when the spans are similar and it drifts when one span dominates. Eight span slots are provided and the unused ones are left at zero; a deadend-to-deadend section longer than that is rare, and a section is defined by its deadends rather than by how many structures it crosses. This is section geometry only. It does not compute a sag or a tension -- enter a reference sag and it distributes that -- and it does not check clearance, evaluate whether the section should be broken at a deadend, or address inclined spans, where the ruling-span assumption of equal tension throughout the section is weaker. Long, unequal sections and sections with large elevation differences depart from the ruling-span idealization enough that the utility's own stringing charts and standards govern.",
  };
}
const rulingSpanExample = { inputs: { span_1_ft: 300, span_2_ft: 450, span_3_ft: 380, span_4_ft: 520, span_5_ft: 0, span_6_ft: 0, span_7_ft: 0, span_8_ft: 0, ruling_span_sag_ft: 12 } };
LINEWORKER_RENDERERS["ruling-span"] = _simpleRenderer({
  citation: "Citation: the ruling (equivalent) span relation by name -- RS = sqrt(sum of L^3 / sum of L) over the spans between deadends -- with the sag in an individual span scaling as sag_RS x (L / RS)^2, and the field approximation average + (2/3)(longest - average) reported beside it. The utility's stringing charts, sag tables, and construction standards govern.",
  example: rulingSpanExample.inputs,
  fields: [
    { key: "span_1_ft", label: "Span 1 (ft)", kind: "number", default: 300 },
    { key: "span_2_ft", label: "Span 2 (ft, 0 if unused)", kind: "number", default: 450 },
    { key: "span_3_ft", label: "Span 3 (ft, 0 if unused)", kind: "number", default: 380 },
    { key: "span_4_ft", label: "Span 4 (ft, 0 if unused)", kind: "number", default: 520 },
    { key: "span_5_ft", label: "Span 5 (ft, 0 if unused)", kind: "number", default: 0 },
    { key: "span_6_ft", label: "Span 6 (ft, 0 if unused)", kind: "number", default: 0 },
    { key: "span_7_ft", label: "Span 7 (ft, 0 if unused)", kind: "number", default: 0 },
    { key: "span_8_ft", label: "Span 8 (ft, 0 if unused)", kind: "number", default: 0 },
    { key: "ruling_span_sag_ft", label: "Sag at the ruling span (ft, 0 to skip)", kind: "number", default: 12 },
  ],
  outputs: [
    { key: "r", id: "rsp-out-r", label: "Ruling span", value: (r) => fmt(r.ruling_span_ft, 2) + " ft across " + fmt(r.span_count, 0) + " spans -- enter the stringing chart HERE, not at the span in front of the truck" },
    { key: "a", id: "rsp-out-a", label: "Against the arithmetic average", value: (r) => fmt(r.average_span_ft, 1) + " ft average, so the ruling span is " + fmt(r.ruling_span_ft - r.average_span_ft, 1) + " ft higher -- pulled up by the " + fmt(r.longest_span_ft, 0) + " ft span" },
    { key: "f", id: "rsp-out-f", label: "Tailboard approximation", value: (r) => fmt(r.field_approximation_ft, 1) + " ft -- " + r.approximation_verdict },
    { key: "s", id: "rsp-out-s", label: "Sag in the longest span", value: (r) => fmt(r.longest_span_sag_ft, 2) + " ft in the " + fmt(r.longest_span_ft, 0) + " ft span, against " + fmt(r.shortest_span_sag_ft, 2) + " ft in the " + fmt(r.shortest_span_ft, 0) + " ft one" },
    { key: "p", id: "rsp-out-p", label: "Spread across the section", value: (r) => fmt(r.sag_spread_ratio, 2) + "x between the shortest and longest span, same conductor, same tension, same day -- sag every span to the ruling-span figure and the short ones are massively overtensioned" },
    { key: "n", id: "rsp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRulingSpan,
});

// ============ spec-v1451: conductor sag change with temperature ============

// dims: in { span_ft: L, area_in2: L^2, weight1_lb_per_ft: M / L, weight2_lb_per_ft: M / L, modulus_psi: M L^-1 T^-2, alpha_per_f: dimensionless, tension1_lb: M L T^-2, temp1_f: T, temp2_f: T, rated_strength_lb: M L T^-2 } out: { sag1_ft: L, tension2_lb: M L T^-2, sag2_ft: L, sag_increase_ft: L, tension_change_lb: M L T^-2 }
export function computeConductorSagAtTemperature({ span_ft = 0, area_in2 = 0, weight1_lb_per_ft = 0, weight2_lb_per_ft = 0, modulus_psi = 0, alpha_per_f = 0, tension1_lb = 0, temp1_f = 60, temp2_f = 120, rated_strength_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(span_ft > 0)) return { error: "Span must be positive (ft)." };
  if (!(area_in2 > 0)) return { error: "Conductor area must be positive (sq in)." };
  if (!(weight1_lb_per_ft > 0)) return { error: "Weight per foot at the initial condition must be positive (lb/ft)." };
  const w2 = weight2_lb_per_ft > 0 ? weight2_lb_per_ft : weight1_lb_per_ft;
  if (!(modulus_psi > 0)) return { error: "Modulus of elasticity must be positive (psi)." };
  if (!(alpha_per_f > 0)) return { error: "Coefficient of thermal expansion must be positive (per degF)." };
  if (!(tension1_lb > 0)) return { error: "Initial horizontal tension must be positive (lb)." };
  if (rated_strength_lb < 0) return { error: "Rated strength cannot be negative (lb)." };
  const EA = modulus_psi * area_in2;
  const L = span_ft;
  const sag1_ft = weight1_lb_per_ft * L * L / (8 * tension1_lb);
  const thermal_term_lb = EA * alpha_per_f * (temp2_f - temp1_f);
  const C = w2 * w2 * L * L * EA / 24;
  const initial_curve_term = weight1_lb_per_ft * weight1_lb_per_ft * L * L * EA / 24 / (tension1_lb * tension1_lb);
  const K = -tension1_lb + thermal_term_lb + initial_curve_term;
  const tension2_lb = _changeOfStateTension(K, C);
  if (!(tension2_lb > 0) || !Number.isFinite(tension2_lb)) return { error: "The change-of-state equation has no positive tension for these values -- check the modulus, area, and initial tension." };
  const sag2_ft = w2 * L * L / (8 * tension2_lb);
  const sag_increase_ft = sag2_ft - sag1_ft;
  const sag_increase_pct = sag1_ft > 0 ? sag_increase_ft / sag1_ft * 100 : 0;
  const tension_change_lb = tension2_lb - tension1_lb;
  const tension_change_pct = tension1_lb > 0 ? tension_change_lb / tension1_lb * 100 : 0;
  const tension1_pct_rated = rated_strength_lb > 0 ? tension1_lb / rated_strength_lb * 100 : null;
  const tension2_pct_rated = rated_strength_lb > 0 ? tension2_lb / rated_strength_lb * 100 : null;
  const outs = [sag1_ft, tension2_lb, sag2_ft, sag_increase_ft, tension_change_lb];
  if (!outs.every(Number.isFinite)) return { error: "Change-of-state math is not a finite value." };
  return {
    sag1_ft, sag2_ft, sag_increase_ft, sag_increase_pct,
    tension2_lb, tension_change_lb, tension_change_pct,
    thermal_term_lb, initial_curve_term, cubic_k: K, cubic_c: C, ea_lb: EA,
    tension1_lb, tension1_pct_rated, tension2_pct_rated, temp1_f, temp2_f,
    weight2_used_lb_per_ft: w2,
    direction: temp2_f >= temp1_f
      ? "hotter: tension falls and sag grows, and the clearance question is the one that matters"
      : "colder: tension climbs toward the conductor's limit and the structure loading climbs with it",
    note: "Two things fight each other when a conductor heats up. The metal grows -- alpha times the temperature change of free thermal strain -- and that growth has to go somewhere, so it goes into sag. But sagging lowers the tension, and lower tension lets the elastic stretch relax, which pulls some length back. The change-of-state equation states that total length is conserved across the two conditions once both effects are counted, and because the sag term carries the tension squared in its denominator the result is a CUBIC in the final tension. There is no closed form worth writing on a tailboard, which is precisely why this is a calculator. The magnitude is always larger than people expect and the direction is always the same. ACSR Drake on a 600 ft ruling span strung to 6,000 lb at 60 degF comes back at 4,380 lb at 120 degF: sixty degrees cost 1,620 lb of tension, 27.0%, and bought 3.03 ft of sag, taking the conductor from 8.21 ft to 11.24 ft. That is a 37% sag increase from a 27% tension drop, because sag is inversely proportional to tension and so it always moves further than the tension does. A crew that sagged that span in spring and left 3 ft of clearance margin has none left on a hot August afternoon with the line loaded. Run backwards it handles the cold case, where the concern is not clearance but tension climbing toward the conductor's limit and the structure loading that comes with it. And it takes a LOAD change as well as a temperature change: enter a different weight per foot for the second condition and it answers the ice case, where the weight climbs at the same time the metal is cold and stiff. Enter the resultant from the district loading calculator to get that case right. This is the single-span parabolic change of state with the conductor treated as one homogeneous material. It does not model ACSR as separate aluminium and steel components with their own moduli and expansion coefficients, which matters at high temperature where the aluminium goes slack and the steel takes the load -- the knee-point behaviour is real and it is not here. It does not include creep, which is permanent and additive and is handled separately, and it does not use the exact catenary, which departs from the parabola on very long or very slack spans. It does not check clearance, evaluate inclined spans, or produce a stringing chart. The conductor manufacturer's stress-strain data, the utility's sag-tension program and stringing charts, and the applicable NESC edition govern.",
  };
}
const conductorSagAtTemperatureExample = { inputs: { span_ft: 600, area_in2: 0.7264, weight1_lb_per_ft: 1.094, weight2_lb_per_ft: 1.094, modulus_psi: 11200000, alpha_per_f: 0.0000106, tension1_lb: 6000, temp1_f: 60, temp2_f: 120, rated_strength_lb: 31500 } };
LINEWORKER_RENDERERS["conductor-sag-at-temperature"] = _simpleRenderer({
  citation: "Citation: the parabolic change-of-state (change-of-condition) relation by name -- H2^2 [H2 - H1 + E A alpha (t2 - t1) + w1^2 L^2 E A / (24 H1^2)] = w2^2 L^2 E A / 24, solved for the single positive real root -- with sag S = w L^2 / (8 H). Single homogeneous material, parabolic approximation; ACSR knee-point behaviour and creep are not modelled. The conductor manufacturer's stress-strain data, the utility's sag-tension program and stringing charts, and the applicable NESC edition govern.",
  example: conductorSagAtTemperatureExample.inputs,
  fields: [
    { key: "span_ft", label: "Ruling span (ft)", kind: "number", default: 600 },
    { key: "area_in2", label: "Conductor area (sq in)", kind: "number", default: 0.7264 },
    { key: "weight1_lb_per_ft", label: "Weight per foot, initial condition (lb/ft)", kind: "number", default: 1.094 },
    { key: "weight2_lb_per_ft", label: "Weight per foot, final condition (lb/ft, 0 to reuse)", kind: "number", default: 1.094 },
    { key: "modulus_psi", label: "Modulus of elasticity (psi)", kind: "number", default: 11200000 },
    { key: "alpha_per_f", label: "Coefficient of thermal expansion (per degF)", kind: "number", default: 0.0000106 },
    { key: "tension1_lb", label: "Initial horizontal tension (lb)", kind: "number", default: 6000 },
    { key: "temp1_f", label: "Initial temperature (F)", kind: "number", default: 60 },
    { key: "temp2_f", label: "Final temperature (F)", kind: "number", default: 120 },
    { key: "rated_strength_lb", label: "Rated breaking strength (lb, 0 to skip)", kind: "number", default: 31500 },
  ],
  outputs: [
    { key: "i", id: "cst-out-i", label: "Sag at the initial condition", value: (r) => fmt(r.sag1_ft, 2) + " ft at " + fmt(r.tension1_lb, 0) + " lb and " + fmt(r.temp1_f, 0) + " F" },
    { key: "t", id: "cst-out-t", label: "Tension at the final condition", value: (r) => fmt(r.tension2_lb, 0) + " lb -- " + fmt(r.tension_change_lb, 0) + " lb, " + fmt(r.tension_change_pct, 1) + "%" },
    { key: "s", id: "cst-out-s", label: "Sag at the final condition", value: (r) => fmt(r.sag2_ft, 2) + " ft, up " + fmt(r.sag_increase_ft, 2) + " ft -- a " + fmt(r.sag_increase_pct, 0) + "% sag change from a " + fmt(Math.abs(r.tension_change_pct), 0) + "% tension change, because sag goes as 1/H" },
    { key: "d", id: "cst-out-d", label: "Direction", value: (r) => r.direction },
    { key: "r", id: "cst-out-r", label: "Against rated strength", value: (r) => r.tension1_pct_rated === null ? "(no rated strength entered)" : fmt(r.tension1_pct_rated, 1) + "% initially, " + fmt(r.tension2_pct_rated, 1) + "% finally" },
    { key: "n", id: "cst-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConductorSagAtTemperature,
});

// ============ spec-v1452: conductor blowout and horizontal clearance ============

// dims: in { conductor_diameter_in: L, weight_lb_per_ft: M / L, wind_pressure_psf: M L^-1 T^-2, wind_speed_mph: L / T, sag_ft: L, still_air_clearance_ft: L } out: { wind_load_lb_per_ft: M / L, swing_angle_deg: dimensionless, blowout_ft: L, remaining_clearance_ft: L, pressure_at_zero_clearance_psf: M L^-1 T^-2 }
export function computeConductorBlowout({ conductor_diameter_in = 0, weight_lb_per_ft = 0, wind_pressure_psf = 0, wind_speed_mph = 0, sag_ft = 0, still_air_clearance_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(conductor_diameter_in > 0)) return { error: "Conductor diameter must be positive (in)." };
  if (!(weight_lb_per_ft > 0)) return { error: "Conductor weight per foot must be positive (lb/ft)." };
  if (!(sag_ft > 0)) return { error: "Midspan sag must be positive (ft)." };
  if (still_air_clearance_ft < 0) return { error: "Still-air clearance cannot be negative (ft)." };
  if (wind_pressure_psf < 0) return { error: "Wind pressure cannot be negative (psf)." };
  if (wind_speed_mph < 0) return { error: "Wind speed cannot be negative (mph)." };
  // An entered pressure governs; a speed is converted with the same ASCE 7
  // constant `wind-pressure` uses, so the two cannot disagree.
  const pressure_from_speed_psf = _ASCE_VELOCITY_PRESSURE * wind_speed_mph * wind_speed_mph;
  const pressure_psf = wind_pressure_psf > 0 ? wind_pressure_psf : pressure_from_speed_psf;
  if (!(pressure_psf > 0)) return { error: "Enter a wind pressure (psf) or a wind speed (mph)." };
  const projected_area_ft2_per_ft = conductor_diameter_in / _IN_PER_FT;
  const wind_load_lb_per_ft = pressure_psf * projected_area_ft2_per_ft;
  // The swing angle depends ONLY on the ratio of wind load to weight -- not on
  // span and not on tension. The blowout DISTANCE is what carries the sag.
  const swing_angle_rad = Math.atan(wind_load_lb_per_ft / weight_lb_per_ft);
  const swing_angle_deg = swing_angle_rad * 180 / Math.PI;
  const blowout_ft = sag_ft * Math.sin(swing_angle_rad);
  const remaining_clearance_ft = still_air_clearance_ft - blowout_ft;
  // The pressure at which the blowout exactly eats the still-air clearance:
  // sag sin(theta) = C, so sin(theta) = C/sag, and p = w tan(theta) x 12/d.
  let pressure_at_zero_clearance_psf = null;
  if (still_air_clearance_ft > 0 && still_air_clearance_ft < sag_ft) {
    const sinT = still_air_clearance_ft / sag_ft;
    const tanT = sinT / Math.sqrt(1 - sinT * sinT);
    pressure_at_zero_clearance_psf = weight_lb_per_ft * tanT / projected_area_ft2_per_ft;
  }
  const outs = [wind_load_lb_per_ft, swing_angle_deg, blowout_ft, remaining_clearance_ft];
  if (!outs.every(Number.isFinite)) return { error: "Blowout math is not a finite value." };
  return {
    pressure_psf, pressure_from_speed_psf, projected_area_ft2_per_ft,
    wind_load_lb_per_ft, swing_angle_deg, blowout_ft,
    still_air_clearance_ft, remaining_clearance_ft, pressure_at_zero_clearance_psf,
    sag_ft, clears: remaining_clearance_ft >= 0,
    clearance_verdict: still_air_clearance_ft <= 0
      ? "(no still-air clearance entered)"
      : remaining_clearance_ft >= 0
        ? fmt(remaining_clearance_ft, 2) + " ft left"
        : "the conductor reaches the object with " + fmt(-remaining_clearance_ft, 2) + " ft to spare on the wrong side",
    exhaust_verdict: pressure_at_zero_clearance_psf === null
      ? (still_air_clearance_ft >= sag_ft ? "no wind exhausts this clearance: the sag is smaller than the clearance, so the conductor cannot reach the object however hard it blows" : "(no still-air clearance entered)")
      : fmt(pressure_at_zero_clearance_psf, 2) + " psf exhausts it, about " + fmt(Math.sqrt(pressure_at_zero_clearance_psf / _ASCE_VELOCITY_PRESSURE), 0) + " mph",
    note: "Ground clearance is checked straight down and nothing checks sideways, but a conductor in wind swings out of the plane of the poles like a hinged sheet, through the angle whose tangent is the wind load per foot over the weight per foot. The conductor does not stretch to do it -- the sag along the swung plane is the same sag, just tilted -- so the horizontal displacement at midspan is the sag times the sine of that angle. Two things fall out. The swing angle is independent of span and of tension: it depends only on the ratio of wind load to weight, so it is the same for a short span and a long one in the same wind. But the blowout DISTANCE is proportional to sag, so the long, slack spans blow out furthest, and they do it on exactly the hot, sagging days when vertical clearance is also at its worst. And a light conductor blows out far further than a heavy one in the same wind: ACSR Drake at 1.108 in and 1.094 lb/ft in a 9 psf wind swings 37.2 degrees and moves 7.26 ft, and at half that weight in the same wind it swings 56.7 degrees and moves 10.0 ft. That is why small distribution conductor near buildings and tree lines is the recurring problem rather than the transmission line overhead. The pressure at which a stated clearance is exhausted is reported so a span can be judged against a design wind rather than against one arbitrary gust. This is midspan blowout on a level span with the conductor treated as swinging rigidly about the chord between attachment points. It does not model the restraint a suspension insulator string imposes near the structures, which reduces blowout there and is why midspan is the governing point; it does not evaluate conductor-to-conductor clearance under differential swing, where adjacent phases swing by different amounts and can approach each other; and it does not address galloping, aeolian vibration, or the dynamic response of a conductor in gusty wind. It does not check vertical clearance. The applicable NESC edition, the utility's construction standards, and the right-of-way requirements govern.",
  };
}
const conductorBlowoutExample = { inputs: { conductor_diameter_in: 1.108, weight_lb_per_ft: 1.094, wind_pressure_psf: 9, wind_speed_mph: 0, sag_ft: 12, still_air_clearance_ft: 10 } };
LINEWORKER_RENDERERS["conductor-blowout"] = _simpleRenderer({
  citation: "Citation: the transverse blowout relation by name -- wind load per foot = pressure x diameter / 12, swing angle = atan(wind load / weight per foot), and blowout = sag x sin(swing angle). A wind speed entered instead of a pressure is converted with the ASCE 7 constant 0.00256 V^2, the same relation the wind-pressure calculator uses. The applicable NESC edition, the utility's construction standards, and the right-of-way requirements govern.",
  example: conductorBlowoutExample.inputs,
  fields: [
    { key: "conductor_diameter_in", label: "Conductor diameter (in)", kind: "number", default: 1.108 },
    { key: "weight_lb_per_ft", label: "Conductor weight (lb/ft)", kind: "number", default: 1.094 },
    { key: "wind_pressure_psf", label: "Wind pressure (psf, 0 to use the speed)", kind: "number", default: 9 },
    { key: "wind_speed_mph", label: "Wind speed (mph, used when no pressure is entered)", kind: "number", default: 0 },
    { key: "sag_ft", label: "Midspan sag at the condition checked (ft)", kind: "number", default: 12 },
    { key: "still_air_clearance_ft", label: "Still-air horizontal clearance to the object (ft)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "w", id: "cbo-out-w", label: "Wind load per foot", value: (r) => fmt(r.wind_load_lb_per_ft, 4) + " lb/ft at " + fmt(r.pressure_psf, 1) + " psf on " + fmt(r.projected_area_ft2_per_ft, 4) + " sq ft per foot of conductor" },
    { key: "a", id: "cbo-out-a", label: "Swing angle", value: (r) => fmt(r.swing_angle_deg, 1) + " degrees -- set by the load-to-weight ratio alone, the same for any span or tension" },
    { key: "b", id: "cbo-out-b", label: "Midspan blowout", value: (r) => fmt(r.blowout_ft, 2) + " ft sideways on " + fmt(r.sag_ft, 1) + " ft of sag -- the slack spans blow out furthest" },
    { key: "c", id: "cbo-out-c", label: "Remaining horizontal clearance", value: (r) => r.clearance_verdict },
    { key: "e", id: "cbo-out-e", label: "Wind that exhausts the clearance", value: (r) => r.exhaust_verdict },
    { key: "n", id: "cbo-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConductorBlowout,
});

// ============ spec-v1453: suspension insulator uplift check ============

// dims: in { span_ft: L, elevation_rise_ft: L, weight_lb_per_ft: M / L, tension_lb: M L T^-2, back_span_ft: L, back_span_rise_ft: L } out: { vertical_load_low_lb: M L T^-2, vertical_load_high_lb: M L T^-2, low_point_offset_ft: L, uplift_tension_lb: M L T^-2, structure_vertical_load_lb: M L T^-2 }
export function computeConductorUpliftCheck({ span_ft = 0, elevation_rise_ft = 0, weight_lb_per_ft = 0, tension_lb = 0, back_span_ft = 0, back_span_rise_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(span_ft > 0)) return { error: "Span must be positive (ft)." };
  if (!(elevation_rise_ft > 0)) return { error: "Elevation rise to the far support must be positive (ft) -- a level span cannot uplift." };
  if (!(weight_lb_per_ft > 0)) return { error: "Conductor weight per foot must be positive (lb/ft)." };
  if (!(tension_lb > 0)) return { error: "Horizontal tension must be positive (lb). Cold, high tension is the governing case." };
  if (back_span_ft < 0) return { error: "The back span cannot be negative (ft)." };
  // The horizontal tension acting along a sloped chord adds a downward
  // component at the high support and an equal UPWARD one at the low support.
  const half_weight_lb = weight_lb_per_ft * span_ft / 2;
  const slope_component_lb = tension_lb * elevation_rise_ft / span_ft;
  const vertical_load_low_lb = half_weight_lb - slope_component_lb;
  const vertical_load_high_lb = half_weight_lb + slope_component_lb;
  const low_point_offset_ft = span_ft / 2 - tension_lb * elevation_rise_ft / (weight_lb_per_ft * span_ft);
  const low_point_inside_span = low_point_offset_ft >= 0 && low_point_offset_ft <= span_ft;
  // V_low = 0 when H = w L^2 / (2 h). Above that the structure is being lifted.
  const uplift_tension_lb = weight_lb_per_ft * span_ft * span_ft / (2 * elevation_rise_ft);
  const uplift = vertical_load_low_lb < 0;
  // The real load at the structure is BOTH adjacent spans together.
  let back_span_contribution_lb = null, structure_vertical_load_lb = null;
  if (back_span_ft > 0) {
    back_span_contribution_lb = weight_lb_per_ft * back_span_ft / 2 + tension_lb * back_span_rise_ft / back_span_ft;
    structure_vertical_load_lb = vertical_load_low_lb + back_span_contribution_lb;
  }
  const outs = [vertical_load_low_lb, vertical_load_high_lb, low_point_offset_ft, uplift_tension_lb];
  if (!outs.every(Number.isFinite)) return { error: "Uplift math is not a finite value." };
  return {
    half_weight_lb, slope_component_lb, vertical_load_low_lb, vertical_load_high_lb,
    low_point_offset_ft, low_point_inside_span, uplift_tension_lb, uplift,
    back_span_contribution_lb, structure_vertical_load_lb, tension_lb, span_ft,
    structure_uplift: structure_vertical_load_lb !== null && structure_vertical_load_lb < 0,
    verdict: uplift
      ? "UPLIFT: the lower structure is being lifted with " + fmt(-vertical_load_low_lb, 0) + " lb. This wants a tension assembly or a hold-down, not a suspension clamp"
      : "no uplift on this span alone -- " + fmt(vertical_load_low_lb, 0) + " lb still bearing down, and uplift begins at " + fmt(uplift_tension_lb, 0) + " lb of tension",
    structure_verdict: structure_vertical_load_lb === null
      ? "(no back span entered -- the real load at the structure is BOTH adjacent spans together)"
      : structure_vertical_load_lb < 0
        ? "with the back span counted the structure is STILL being lifted, with " + fmt(-structure_vertical_load_lb, 0) + " lb net"
        : "with the back span counted the structure carries " + fmt(structure_vertical_load_lb, 0) + " lb net downward",
    note: "In hilly country a suspension structure sitting in a sag between two higher structures can be lifted rather than loaded, and uplift unseats a suspension clamp, inverts a post insulator, and is a listed cause of structure damage. An inclined span's weight does not split evenly: the horizontal tension acting along the sloped chord adds a downward component at the high support and an equal UPWARD component at the low one, so the vertical load at the low structure is half the conductor weight less that component. When the component wins, the load goes negative. A 500 ft span rising 60 ft at 1.094 lb/ft and a cold 5,000 lb of tension puts 273.5 lb of conductor weight against 600.0 lb of upward pull, for -326.5 lb: the structure is being lifted with 326 lb. The same arithmetic says where the low point of the curve sits, and it lands 298 ft OUTSIDE the span -- which is the geometric statement of the identical condition, because a span whose low point falls outside itself is a span pulling up at one end. The threshold is worth stating exactly: uplift begins when the tension reaches the weight per foot times the span squared, over twice the rise, which on that span is 2,279 lb, so anything above that lifts. The condition worsens in COLD weather, because cold means high tension and the tension is the term doing the lifting -- which is the opposite of the intuition built on clearance problems, where hot is the bad case. The check must be run at the structure against BOTH adjacent spans together, since the real vertical load there is the sum of what each side contributes; enter the back span and its rise and the net is reported. This is a static vertical-load check on the conductor at one condition. It does not size or select a suspension, tension, or hold-down assembly, evaluate insulator swing under wind, or address the longitudinal loads a hold-down arrangement introduces. It does not compute the tension -- enter the cold, high-tension governing case from the change-of-state calculation -- and it assumes the same horizontal tension in both adjacent spans, which is the ruling-span idealization and is weakest on exactly the steep, unequal spans where uplift occurs. The utility's construction standards, the applicable NESC edition, and the line designer govern.",
  };
}
const conductorUpliftCheckExample = { inputs: { span_ft: 500, elevation_rise_ft: 60, weight_lb_per_ft: 1.094, tension_lb: 5000, back_span_ft: 400, back_span_rise_ft: 40 } };
LINEWORKER_RENDERERS["conductor-uplift-check"] = _simpleRenderer({
  citation: "Citation: the inclined-span vertical reaction relation by name -- V_low = w L / 2 - H h / L and V_high = w L / 2 + H h / L, with the low-point offset from the lower support x0 = L/2 - H h / (w L) and uplift beginning at H = w L^2 / (2 h). Cold, high tension is the governing case. The utility's construction standards, the applicable NESC edition, and the line designer govern.",
  example: conductorUpliftCheckExample.inputs,
  fields: [
    { key: "span_ft", label: "Span to the higher structure (ft)", kind: "number", default: 500 },
    { key: "elevation_rise_ft", label: "Elevation rise over that span (ft)", kind: "number", default: 60 },
    { key: "weight_lb_per_ft", label: "Conductor weight (lb/ft)", kind: "number", default: 1.094 },
    { key: "tension_lb", label: "Horizontal tension, cold condition (lb)", kind: "number", default: 5000 },
    { key: "back_span_ft", label: "Back span (ft, 0 to skip)", kind: "number", default: 400 },
    { key: "back_span_rise_ft", label: "Elevation rise over the back span (ft)", kind: "number", default: 40 },
  ],
  outputs: [
    { key: "l", id: "cup-out-l", label: "Vertical load at the low structure", value: (r) => fmt(r.vertical_load_low_lb, 1) + " lb -- " + fmt(r.half_weight_lb, 1) + " lb of conductor weight against " + fmt(r.slope_component_lb, 1) + " lb pulling up" },
    { key: "h", id: "cup-out-h", label: "Vertical load at the high structure", value: (r) => fmt(r.vertical_load_high_lb, 1) + " lb -- the same slope term, acting downward there" },
    { key: "v", id: "cup-out-v", label: "Uplift check", value: (r) => r.verdict },
    { key: "x", id: "cup-out-x", label: "Low point of the curve", value: (r) => fmt(r.low_point_offset_ft, 1) + " ft from the lower support -- " + (r.low_point_inside_span ? "inside the span" : "OUTSIDE the span, which is the same condition stated geometrically") },
    { key: "s", id: "cup-out-s", label: "At the structure, both spans", value: (r) => r.structure_verdict },
    { key: "n", id: "cup-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConductorUpliftCheck,
});

// ============ spec-v1454: overhead line ground clearance ============

// dims: in { attachment_height_ft: L, max_condition_sag_ft: L, required_clearance_ft: L } out: { clearance_ft: L, margin_ft: L, max_allowable_sag_ft: L, min_attachment_height_ft: L, sag_headroom_ft: L }
export function computeLineGroundClearanceNesc({ attachment_height_ft = 0, max_condition_sag_ft = 0, required_clearance_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(attachment_height_ft > 0)) return { error: "Attachment height above ground must be positive (ft)." };
  if (!(max_condition_sag_ft > 0)) return { error: "Maximum-condition sag must be positive (ft)." };
  if (!(required_clearance_ft > 0)) return { error: "Enter the required clearance from the adopted NESC table (ft). No table is shipped: it depends on voltage, on what is under the line, and on the edition the jurisdiction adopted." };
  if (!(max_condition_sag_ft < attachment_height_ft)) return { error: "The sag exceeds the attachment height: the conductor is on the ground." };
  const clearance_ft = attachment_height_ft - max_condition_sag_ft;
  const margin_ft = clearance_ft - required_clearance_ft;
  const max_allowable_sag_ft = attachment_height_ft - required_clearance_ft;
  const sag_headroom_ft = max_allowable_sag_ft - max_condition_sag_ft;
  const min_attachment_height_ft = required_clearance_ft + max_condition_sag_ft;
  const height_shortfall_ft = min_attachment_height_ft - attachment_height_ft;
  const passes = margin_ft >= 0;
  const outs = [clearance_ft, margin_ft, max_allowable_sag_ft, min_attachment_height_ft, sag_headroom_ft];
  if (!outs.every(Number.isFinite)) return { error: "Clearance math is not a finite value." };
  return {
    clearance_ft, margin_ft, max_allowable_sag_ft, sag_headroom_ft,
    min_attachment_height_ft, height_shortfall_ft, passes,
    attachment_height_ft, max_condition_sag_ft, required_clearance_ft,
    verdict: passes
      ? "PASSES with " + fmt(margin_ft, 2) + " ft of margin"
      : "FAILS by " + fmt(-margin_ft, 2) + " ft -- the conductor is " + fmt(clearance_ft, 2) + " ft up where " + fmt(required_clearance_ft, 2) + " ft is required",
    height_verdict: height_shortfall_ft <= 0
      ? "the attachment is " + fmt(-height_shortfall_ft, 2) + " ft higher than it needs to be"
      : "the attachment must come up " + fmt(height_shortfall_ft, 2) + " ft, which is what sizes the pole",
    note: "Clearance is the reason sag matters, and the arithmetic connecting them is a subtraction nobody writes down: the conductor's height above ground is the attachment height minus the sag AT THE WORST CONDITION, not at the condition it was strung in. That is the whole difficulty. NESC checks clearance at the maximum conductor temperature the line is designed to operate at, or at the final-sag ice condition, whichever gives the greater sag -- not at 60 degF on the day the crew strung it. A line sagged in spring with a comfortable margin can be out of compliance at design temperature, and the difference is routinely several feet: on a 600 ft ruling span, sixty degrees of heating adds about 3 ft of sag, and creep adds the equivalent of another forty-odd degrees permanently over the life of the line. One relation is run four ways. Given a sag it returns the clearance and the margin. Given a required clearance it returns the maximum sag the span may be strung to, which is the number a crew wants at the pole. Given a sag and a requirement it returns the minimum attachment height, which is what sizes the structure. And the margin is reported SIGNED, so a failing span reads as a negative number of feet rather than as a passing-looking small one. NO NESC TABLE IS SHIPPED. The required clearance depends on the voltage, on what is under the line -- road, driveway, pedestrian-only, water, rail -- and on the edition the jurisdiction has adopted, and it is taken as an input for the same reason the pole-embedment calculator takes lateral bearing as an input: a table copied into a calculator is a table that goes stale silently, and a wrong clearance is not a rounding error. This checks one point, midspan on a level span, against one entered requirement. It does not find the governing point on an inclined span or over uneven ground, where the low point of the curve and the high point of the ground are not at the same place; it does not evaluate clearance to buildings, other conductors, or communication lines, which have their own requirements; it does not address blowout, which is the horizontal question; and it does not determine which condition governs. The adopted NESC edition, the utility's construction standards, and the authority having jurisdiction govern.",
  };
}
const lineGroundClearanceNescExample = { inputs: { attachment_height_ft: 42, max_condition_sag_ft: 11.5, required_clearance_ft: 18.5 } };
LINEWORKER_RENDERERS["line-ground-clearance-nesc"] = _simpleRenderer({
  citation: "Citation: the ground-clearance subtraction by name -- height above ground = attachment height - sag at the maximum condition; margin = that less the required clearance; maximum allowable sag = attachment height - required clearance; minimum attachment height = required clearance + sag. NO NESC TABLE IS SHIPPED: the required clearance is entered from the edition the jurisdiction has adopted, because it depends on voltage and on what is under the line. NESC checks at the maximum operating temperature or the final-sag ice condition, whichever sags more. The adopted NESC edition, the utility's construction standards, and the authority having jurisdiction govern.",
  example: lineGroundClearanceNescExample.inputs,
  fields: [
    { key: "attachment_height_ft", label: "Attachment height above ground at the low support (ft)", kind: "number", default: 42 },
    { key: "max_condition_sag_ft", label: "Sag at the maximum condition (ft)", kind: "number", default: 11.5 },
    { key: "required_clearance_ft", label: "Required clearance from the adopted table (ft)", kind: "number", default: 18.5 },
  ],
  outputs: [
    { key: "c", id: "lgc-out-c", label: "Conductor height above ground", value: (r) => fmt(r.clearance_ft, 2) + " ft at midspan, at the maximum condition -- not at the condition it was strung in" },
    { key: "m", id: "lgc-out-m", label: "Margin against the requirement", value: (r) => (r.margin_ft >= 0 ? "+" : "") + fmt(r.margin_ft, 2) + " ft -- " + r.verdict },
    { key: "s", id: "lgc-out-s", label: "Maximum allowable sag", value: (r) => fmt(r.max_allowable_sag_ft, 2) + " ft, so there is " + fmt(r.sag_headroom_ft, 2) + " ft of sag headroom left" },
    { key: "h", id: "lgc-out-h", label: "Minimum attachment height", value: (r) => fmt(r.min_attachment_height_ft, 2) + " ft -- " + r.height_verdict },
    { key: "n", id: "lgc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLineGroundClearanceNesc,
});

// ============ spec-v1455: wood pole class and groundline moment ============

// dims: in { groundline_circumference_in: L, fiber_stress_psi: M L^-1 T^-2, load_1_lb: M L T^-2, height_1_ft: L, load_2_lb: M L T^-2, height_2_ft: L, load_3_lb: M L T^-2, height_3_ft: L, check_height_ft: L } out: { groundline_diameter_in: L, section_modulus_in3: L^3, moment_capacity_ftlb: M L^2 T^-2, applied_moment_ftlb: M L^2 T^-2, utilization_pct: dimensionless, remaining_load_lb: M L T^-2 }
export function computePoleClassGroundlineMoment({ groundline_circumference_in = 0, fiber_stress_psi = 8000, load_1_lb = 0, height_1_ft = 0, load_2_lb = 0, height_2_ft = 0, load_3_lb = 0, height_3_ft = 0, check_height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(groundline_circumference_in > 0)) return { error: "Groundline circumference must be positive (in)." };
  if (!(fiber_stress_psi > 0)) return { error: "Designated fiber stress must be positive (psi) -- 8,000 for Southern Pine and Douglas Fir, 6,000 for Western Red Cedar." };
  const pairs = [[load_1_lb, height_1_ft], [load_2_lb, height_2_ft], [load_3_lb, height_3_ft]];
  if (pairs.some(([p, h]) => p < 0 || h < 0)) return { error: "A load and its height cannot be negative." };
  const acting = pairs.filter(([p]) => p > 0);
  if (acting.length === 0) return { error: "Enter at least one horizontal load (lb) with its height above the groundline." };
  if (acting.some(([, h]) => !(h > 0))) return { error: "Every load with a value needs a height above the groundline (ft)." };
  if (check_height_ft < 0) return { error: "The check height cannot be negative (ft)." };
  // A pole is a cantilever fixed at the groundline and it fails in bending
  // there. Section modulus goes as the CUBE of diameter.
  const groundline_diameter_in = groundline_circumference_in / Math.PI;
  const section_modulus_in3 = Math.PI * Math.pow(groundline_diameter_in, 3) / 32;
  const moment_capacity_inlb = fiber_stress_psi * section_modulus_in3;
  const moment_capacity_ftlb = moment_capacity_inlb / _IN_PER_FT;
  const applied_moment_ftlb = acting.reduce((a, [p, h]) => a + p * h, 0);
  const utilization_pct = applied_moment_ftlb / moment_capacity_ftlb * 100;
  const remaining_moment_ftlb = moment_capacity_ftlb - applied_moment_ftlb;
  const tallest_height_ft = Math.max(...acting.map(([, h]) => h));
  const at_height_ft = check_height_ft > 0 ? check_height_ft : tallest_height_ft;
  const remaining_load_lb = remaining_moment_ftlb / at_height_ft;
  // The cube law is the finding: one inch of tape is roughly eight percent.
  const one_inch_less_in = Math.max(groundline_circumference_in - 1, 0.001);
  const one_inch_less_capacity_ftlb = fiber_stress_psi * Math.PI * Math.pow(one_inch_less_in / Math.PI, 3) / 32 / _IN_PER_FT;
  const one_inch_loss_pct = (moment_capacity_ftlb - one_inch_less_capacity_ftlb) / moment_capacity_ftlb * 100;
  const outs = [groundline_diameter_in, section_modulus_in3, moment_capacity_ftlb, applied_moment_ftlb, utilization_pct, remaining_load_lb];
  if (!outs.every(Number.isFinite)) return { error: "Pole moment math is not a finite value." };
  return {
    groundline_diameter_in, section_modulus_in3, moment_capacity_inlb, moment_capacity_ftlb,
    applied_moment_ftlb, utilization_pct, remaining_moment_ftlb, remaining_load_lb,
    at_height_ft, load_count: acting.length, one_inch_less_capacity_ftlb, one_inch_loss_pct,
    passes: utilization_pct <= 100,
    verdict: utilization_pct <= 100
      ? fmt(utilization_pct, 1) + "% of bending capacity, with " + fmt(remaining_moment_ftlb, 0) + " ft-lb left"
      : "OVER capacity at " + fmt(utilization_pct, 1) + "% -- the applied moment exceeds what the stick can carry at the groundline",
    note: "A wood pole is rated by class, and the class is a statement about ONE number: the horizontal load it can take two feet from the top. What a crew actually has is a load at some other height, a groundline circumference off a tape, and a species. A pole is a cantilever fixed at the groundline and it fails in bending there, so its capacity is the designated fiber stress of the species times the section modulus of the circle at the groundline. Because the section modulus goes as the CUBE of the diameter, small differences in circumference are large differences in strength -- a pole an inch under its class circumference has lost roughly eight percent of its capacity, not one -- and that is why the tape reading matters more than the class stamp. A Class 3 Southern Pine measuring 37.5 in at the groundline at 8,000 psi has 111,315 ft-lb of capacity; re-measure it at 36.5 in and it is 102,647, a 7.8% loss from one inch. The applied side is a SUM of moments, not a single load. Conductor tension at the crossarm, wind on the pole itself, wind on the conductors, and a down-guy's horizontal reaction all act at their own heights, and each contributes its force times its height above the groundline. That is also why a guy attached high is worth so much: it subtracts a large moment at the height where the moment arm is longest. Species enters directly through the fiber stress -- Southern Pine and Douglas Fir at 8,000 psi, Western Red Cedar at 6,000 -- so the same stick in cedar is a quarter weaker. This is a groundline bending check on a solid circular section from values the user supplies. It does not apply the overload capacity factors, strength reduction factors, or load cases that NESC Grade B and Grade C construction require, and it is therefore a screen rather than a design. It does not evaluate decay, checks, shell rot, woodpecker damage, or through-boring and preservative treatment, all of which reduce the effective section and none of which a tape reading reveals -- a groundline circumference on a hollow pole is a misleading number. It does not check buckling under vertical load, embedment or soil capacity, the guy and anchor system, or bolt-hole reductions at the attachment. ANSI O5.1, the applicable NESC edition and grade of construction, the utility's construction standards, and a qualified line designer govern.",
  };
}
const poleClassGroundlineMomentExample = { inputs: { groundline_circumference_in: 37.5, fiber_stress_psi: 8000, load_1_lb: 600, height_1_ft: 38, load_2_lb: 0, height_2_ft: 0, load_3_lb: 0, height_3_ft: 0, check_height_ft: 38 } };
LINEWORKER_RENDERERS["pole-class-groundline-moment"] = _simpleRenderer({
  citation: "Citation: the groundline bending check by name -- groundline diameter d = circumference / pi, section modulus S = pi d^3 / 32, moment capacity = designated fiber stress x S, applied moment = the sum of each horizontal load times its height above the groundline, utilization = applied / capacity. Designated fiber stresses are ANSI O5.1 species values entered by the user (8,000 psi Southern Pine and Douglas Fir, 6,000 psi Western Red Cedar), cited not mirrored. A screen, not a design: NESC grade-of-construction overload factors are not applied. ANSI O5.1, the applicable NESC edition, the utility's construction standards, and a qualified line designer govern.",
  example: poleClassGroundlineMomentExample.inputs,
  fields: [
    { key: "groundline_circumference_in", label: "Groundline circumference from the tape (in)", kind: "number", default: 37.5 },
    { key: "fiber_stress_psi", label: "Designated fiber stress (psi)", kind: "number", default: 8000 },
    { key: "load_1_lb", label: "Horizontal load 1 (lb)", kind: "number", default: 600 },
    { key: "height_1_ft", label: "Height of load 1 above the groundline (ft)", kind: "number", default: 38 },
    { key: "load_2_lb", label: "Horizontal load 2 (lb, 0 if none)", kind: "number", default: 0 },
    { key: "height_2_ft", label: "Height of load 2 (ft)", kind: "number", default: 0 },
    { key: "load_3_lb", label: "Horizontal load 3 (lb, 0 if none)", kind: "number", default: 0 },
    { key: "height_3_ft", label: "Height of load 3 (ft)", kind: "number", default: 0 },
    { key: "check_height_ft", label: "Height to report the remaining load at (ft, 0 for the tallest)", kind: "number", default: 38 },
  ],
  outputs: [
    { key: "d", id: "pgm-out-d", label: "Groundline diameter and section modulus", value: (r) => fmt(r.groundline_diameter_in, 2) + " in, " + fmt(r.section_modulus_in3, 1) + " cu in" },
    { key: "c", id: "pgm-out-c", label: "Moment capacity", value: (r) => fmt(r.moment_capacity_ftlb, 0) + " ft-lb at the groundline" },
    { key: "a", id: "pgm-out-a", label: "Applied moment", value: (r) => fmt(r.applied_moment_ftlb, 0) + " ft-lb across " + fmt(r.load_count, 0) + " load(s) -- a sum of moments, not a single load" },
    { key: "u", id: "pgm-out-u", label: "Utilization", value: (r) => r.verdict },
    { key: "l", id: "pgm-out-l", label: "Horizontal load still available", value: (r) => fmt(r.remaining_load_lb, 0) + " lb at " + fmt(r.at_height_ft, 0) + " ft" },
    { key: "t", id: "pgm-out-t", label: "One inch of tape is worth", value: (r) => fmt(r.one_inch_loss_pct, 1) + "% of capacity -- the cube law does not forgive, and a class stamp is not a measurement" },
    { key: "n", id: "pgm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoleClassGroundlineMoment,
});

// ============ spec-v1456: guy anchor holding capacity in soil ============

// dims: in { helix_diameter_in: L, installed_depth_ft: L, cohesion_psf: M L^-1 T^-2, friction_bearing_factor: dimensionless, soil_unit_weight_pcf: M L^-3, factor_of_safety: dimensionless, installing_torque_ftlb: M L^2 T^-2, torque_factor_per_ft: dimensionless, guy_tension_lb: M L T^-2 } out: { helix_area_ft2: L^2, ultimate_capacity_lb: M L T^-2, allowable_capacity_lb: M L T^-2, torque_capacity_lb: M L T^-2, margin_lb: M L T^-2 }
export function computeGuyAnchorHoldingCapacity({ helix_diameter_in = 0, installed_depth_ft = 0, cohesion_psf = 0, friction_bearing_factor = 0, soil_unit_weight_pcf = 0, factor_of_safety = 2, installing_torque_ftlb = 0, torque_factor_per_ft = 10, guy_tension_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(helix_diameter_in > 0)) return { error: "Helix or plate diameter must be positive (in)." };
  if (!(installed_depth_ft > 0)) return { error: "Installed depth must be positive (ft)." };
  if (!(soil_unit_weight_pcf > 0)) return { error: "Soil unit weight must be positive (pcf)." };
  if (cohesion_psf < 0) return { error: "Cohesion cannot be negative (psf)." };
  if (friction_bearing_factor < 0) return { error: "The bearing factor cannot be negative." };
  if (!(cohesion_psf > 0 || friction_bearing_factor > 0)) return { error: "Enter a cohesion (cohesive soil) or a bearing factor (granular soil). An anchor in a soil with neither holds nothing." };
  if (!(factor_of_safety > 0)) return { error: "Factor of safety must be positive." };
  if (installing_torque_ftlb < 0) return { error: "Installing torque cannot be negative (ft-lb)." };
  if (!(torque_factor_per_ft > 0)) return { error: "The torque correlation factor must be positive (per ft)." };
  if (guy_tension_lb < 0) return { error: "Guy tension cannot be negative (lb)." };
  const helix_diameter_ft = helix_diameter_in / _IN_PER_FT;
  const helix_area_ft2 = Math.PI / 4 * helix_diameter_ft * helix_diameter_ft;
  const overburden_psf = soil_unit_weight_pcf * installed_depth_ft;
  // Cohesive: 9c plus the overburden. Granular: overburden times a bearing
  // factor that climbs steeply with friction angle. Same anchor, same depth,
  // four-to-one difference in what it holds.
  const cohesive_capacity_lb = cohesion_psf > 0 ? helix_area_ft2 * (9 * cohesion_psf + overburden_psf) : 0;
  const granular_capacity_lb = friction_bearing_factor > 0 ? helix_area_ft2 * overburden_psf * friction_bearing_factor : 0;
  const governs = cohesion_psf > 0 && friction_bearing_factor > 0
    ? (cohesive_capacity_lb <= granular_capacity_lb ? "cohesive" : "granular")
    : (cohesion_psf > 0 ? "cohesive" : "granular");
  const ultimate_capacity_lb = cohesion_psf > 0 && friction_bearing_factor > 0
    ? Math.min(cohesive_capacity_lb, granular_capacity_lb)
    : (cohesion_psf > 0 ? cohesive_capacity_lb : granular_capacity_lb);
  const allowable_capacity_lb = ultimate_capacity_lb / factor_of_safety;
  // Torque measures the soil that is actually there rather than the soil
  // somebody guessed at, which is why it is the better number when available.
  const torque_capacity_lb = installing_torque_ftlb > 0 ? torque_factor_per_ft * installing_torque_ftlb : null;
  const torque_allowable_lb = torque_capacity_lb === null ? null : torque_capacity_lb / factor_of_safety;
  const method_ratio = torque_capacity_lb === null ? null : torque_capacity_lb / ultimate_capacity_lb;
  const margin_lb = guy_tension_lb > 0 ? allowable_capacity_lb - guy_tension_lb : null;
  const outs = [helix_area_ft2, ultimate_capacity_lb, allowable_capacity_lb];
  if (!outs.every(Number.isFinite)) return { error: "Anchor capacity math is not a finite value." };
  return {
    helix_area_ft2, overburden_psf, cohesive_capacity_lb, granular_capacity_lb, governs,
    ultimate_capacity_lb, allowable_capacity_lb, torque_capacity_lb, torque_allowable_lb,
    method_ratio, guy_tension_lb, margin_lb, factor_of_safety,
    holds: margin_lb === null ? null : margin_lb >= 0,
    margin_verdict: margin_lb === null
      ? "(no guy tension entered)"
      : margin_lb >= 0
        ? fmt(margin_lb, 0) + " lb of allowable capacity to spare against the " + fmt(guy_tension_lb, 0) + " lb guy"
        : "SHORT by " + fmt(-margin_lb, 0) + " lb against the " + fmt(guy_tension_lb, 0) + " lb guy",
    torque_verdict: torque_capacity_lb === null
      ? "(no installing torque entered -- it is the better number when the machine reads one, because it measures the soil that is actually there)"
      : Math.abs(Math.log(method_ratio)) > Math.log(1.5)
        ? "the two methods disagree by " + fmt(method_ratio, 2) + "x, and THAT DISAGREEMENT IS THE FINDING: the assumed soil is not the soil the anchor went into"
        : "within " + fmt(Math.abs(method_ratio - 1) * 100, 0) + "% of the soil-property estimate, which is agreement",
    note: "The guy-tension calculator gives the pull in the guy. Nothing says whether the ground will hold it, and an anchor that pulls is the failure mode that takes the pole with it. An anchor in tension fails by pulling a cone or cylinder of soil up with it, and for an anchor deep relative to its bearing area the capacity is a bearing-capacity problem turned upside down: the helix or plate area times the strength the soil can mobilize at that depth. In clay that strength is dominated by cohesion and the depth term is small; in sand there is no cohesion at all and the whole capacity comes from overburden times a bearing factor that climbs steeply with friction angle. A 12 in helix at 7 ft in a stiff clay at 1,000 psf cohesion holds 7,673 lb ultimate and 3,837 allowable at a factor of safety of 2; the same anchor at the same depth in a loose sand with no cohesion holds 6,048 ultimate and 3,024 allowable. Same hardware, same depth, and the soil is the whole variable. For power-installed screw anchors there is a second and better number: installing torque. The torque the machine reads at final depth correlates with capacity through an empirical factor set by shaft size, and it has the enormous advantage of measuring the soil that is actually there rather than the soil someone guessed at from a boring two hundred feet away. Both are reported, and where they disagree by a wide margin THAT DISAGREEMENT IS THE FINDING -- it means the assumed soil is not the soil the anchor went into, and the torque reading is the one to believe. This is a single-helix bearing estimate from soil properties the user supplies, and it is only as good as they are. It does not sum multiple helices, apply the spacing rules that stop them from acting as one block, or check whether the anchor is deep enough for the deep-failure assumption to hold -- a shallow anchor fails by lifting a soil cone to the surface, which is a different and weaker mechanism this does not model. It does not evaluate the shaft, the eye, the guy hardware, or the rod's own tensile capacity, which can govern instead of the soil; it does not address group effects, cyclic or sustained loading, frost heave, corrosion, or installation in fill, rock, or saturated soil. The torque correlation factor is empirical and manufacturer-specific. The anchor manufacturer's data, a geotechnical evaluation of the actual site, the utility's construction standards, and the applicable NESC edition govern.",
  };
}
const guyAnchorHoldingCapacityExample = { inputs: { helix_diameter_in: 12, installed_depth_ft: 7, cohesion_psf: 1000, friction_bearing_factor: 0, soil_unit_weight_pcf: 110, factor_of_safety: 2, installing_torque_ftlb: 800, torque_factor_per_ft: 10, guy_tension_lb: 707 } };
LINEWORKER_RENDERERS["guy-anchor-holding-capacity"] = _simpleRenderer({
  citation: "Citation: the deep-anchor uplift bearing relations by name -- cohesive Q_u = A (9c + gamma D), granular Q_u = A gamma D N_q, allowable = ultimate / factor of safety -- with the empirical screw-anchor torque correlation Q_u = K_t x T reported alongside where an installing torque is entered. Single helix, deep-failure assumption. The anchor manufacturer's data, a geotechnical evaluation of the actual site, the utility's construction standards, and the applicable NESC edition govern.",
  example: guyAnchorHoldingCapacityExample.inputs,
  fields: [
    { key: "helix_diameter_in", label: "Helix or plate diameter (in)", kind: "number", default: 12 },
    { key: "installed_depth_ft", label: "Installed depth (ft)", kind: "number", default: 7 },
    { key: "cohesion_psf", label: "Cohesion, cohesive soil (psf, 0 if granular)", kind: "number", default: 1000 },
    { key: "friction_bearing_factor", label: "Bearing factor N_q, granular soil (0 if cohesive)", kind: "number", default: 0 },
    { key: "soil_unit_weight_pcf", label: "Soil unit weight (pcf)", kind: "number", default: 110 },
    { key: "factor_of_safety", label: "Factor of safety", kind: "number", default: 2 },
    { key: "installing_torque_ftlb", label: "Installing torque at final depth (ft-lb, 0 to skip)", kind: "number", default: 800 },
    { key: "torque_factor_per_ft", label: "Torque correlation factor by shaft size (per ft)", kind: "number", default: 10 },
    { key: "guy_tension_lb", label: "Guy tension to check against (lb, 0 to skip)", kind: "number", default: 707 },
  ],
  outputs: [
    { key: "a", id: "gah-out-a", label: "Bearing area and overburden", value: (r) => fmt(r.helix_area_ft2, 3) + " sq ft at " + fmt(r.overburden_psf, 0) + " psf of overburden" },
    { key: "u", id: "gah-out-u", label: "Ultimate holding capacity", value: (r) => fmt(r.ultimate_capacity_lb, 0) + " lb from the " + r.governs + " relation" },
    { key: "l", id: "gah-out-l", label: "Allowable capacity", value: (r) => fmt(r.allowable_capacity_lb, 0) + " lb at a factor of safety of " + fmt(r.factor_of_safety, 1) },
    { key: "t", id: "gah-out-t", label: "From installing torque", value: (r) => (r.torque_capacity_lb === null ? "" : fmt(r.torque_capacity_lb, 0) + " lb ultimate, " + fmt(r.torque_allowable_lb, 0) + " lb allowable -- ") + r.torque_verdict },
    { key: "m", id: "gah-out-m", label: "Margin against the guy", value: (r) => r.margin_verdict },
    { key: "n", id: "gah-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGuyAnchorHoldingCapacity,
});

// ============ spec-v1457: transverse wind load on conductor and pole ============

// dims: in { wind_pressure_psf: M L^-1 T^-2, wind_speed_mph: L / T, conductor_diameter_in: L, wind_span_ft: L, conductor_count: dimensionless, conductor_height_ft: L, pole_top_diameter_in: L, pole_groundline_diameter_in: L, pole_height_above_ground_ft: L } out: { pressure_psf: M L^-1 T^-2, conductor_force_lb: M L T^-2, pole_force_lb: M L T^-2, total_force_lb: M L T^-2, groundline_moment_ftlb: M L^2 T^-2 }
export function computeTransverseWindLoadConductor({ wind_pressure_psf = 0, wind_speed_mph = 0, conductor_diameter_in = 0, wind_span_ft = 0, conductor_count = 1, conductor_height_ft = 0, pole_top_diameter_in = 0, pole_groundline_diameter_in = 0, pole_height_above_ground_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (wind_pressure_psf < 0 || wind_speed_mph < 0) return { error: "Wind pressure and speed cannot be negative." };
  const pressure_from_speed_psf = _ASCE_VELOCITY_PRESSURE * wind_speed_mph * wind_speed_mph;
  const pressure_psf = wind_pressure_psf > 0 ? wind_pressure_psf : pressure_from_speed_psf;
  if (!(pressure_psf > 0)) return { error: "Enter a wind pressure (psf) or a wind speed (mph)." };
  if (!(conductor_diameter_in > 0)) return { error: "Conductor diameter must be positive (in)." };
  if (!(wind_span_ft > 0)) return { error: "Wind span must be positive (ft) -- half the span on each side of the structure, which is NOT the ruling span and NOT the weight span." };
  if (!(conductor_count >= 1)) return { error: "Conductor count must be at least 1." };
  if (!(conductor_height_ft > 0)) return { error: "Conductor attachment height above the groundline must be positive (ft)." };
  if (pole_top_diameter_in < 0 || pole_groundline_diameter_in < 0 || pole_height_above_ground_ft < 0) return { error: "Pole dimensions cannot be negative." };
  // Projected area of a cylinder is diameter x length, so a conductor's wind
  // load per foot is its diameter in inches over twelve, times the pressure.
  const conductor_force_per_ft_lb = pressure_psf * (conductor_diameter_in / _IN_PER_FT);
  const conductor_force_each_lb = conductor_force_per_ft_lb * wind_span_ft;
  const conductor_force_lb = conductor_force_each_lb * conductor_count;
  const conductor_moment_ftlb = conductor_force_lb * conductor_height_ft;
  // The pole carries its own wind on a tapered projected area, and because it
  // is distributed the resultant acts at roughly mid-height.
  const has_pole = pole_top_diameter_in > 0 && pole_groundline_diameter_in > 0 && pole_height_above_ground_ft > 0;
  const pole_projected_area_ft2 = has_pole
    ? ((pole_top_diameter_in + pole_groundline_diameter_in) / 2 / _IN_PER_FT) * pole_height_above_ground_ft : 0;
  const pole_force_lb = pressure_psf * pole_projected_area_ft2;
  const pole_resultant_height_ft = has_pole ? pole_height_above_ground_ft / 2 : 0;
  const pole_moment_ftlb = pole_force_lb * pole_resultant_height_ft;
  const total_force_lb = conductor_force_lb + pole_force_lb;
  const groundline_moment_ftlb = conductor_moment_ftlb + pole_moment_ftlb;
  const pole_share_pct = groundline_moment_ftlb > 0 ? pole_moment_ftlb / groundline_moment_ftlb * 100 : 0;
  const outs = [pressure_psf, conductor_force_lb, pole_force_lb, total_force_lb, groundline_moment_ftlb];
  if (!outs.every(Number.isFinite)) return { error: "Transverse wind load math is not a finite value." };
  return {
    pressure_psf, pressure_from_speed_psf, conductor_force_per_ft_lb, conductor_force_each_lb,
    conductor_force_lb, conductor_moment_ftlb, conductor_count,
    pole_projected_area_ft2, pole_force_lb, pole_resultant_height_ft, pole_moment_ftlb,
    total_force_lb, groundline_moment_ftlb, pole_share_pct, has_pole,
    pole_verdict: !has_pole
      ? "(no pole dimensions entered)"
      : pole_share_pct >= 20
        ? fmt(pole_share_pct, 0) + "% of the total moment, which is not a rounding error -- on a tall pole with light conductor it can be the larger term"
        : fmt(pole_share_pct, 0) + "% of the total moment, small here because the conductors dominate",
    note: "The load that governs a distribution structure on a windy day is not the conductor tension, it is the wind on the conductors and on the pole itself, and both land at different heights and become a moment. Wind on a conductor is pressure times projected area, and the projected area of a cylinder is simply its diameter times its length -- so the wind load per foot is the diameter in inches over twelve, times the pressure, and nothing else. THE LENGTH THAT COUNTS IS THE WIND SPAN, half the span on each side of the structure, which is not the same as the ruling span and not the same as the weight span that carries vertical load. Confusing wind span with weight span is the standard error on an angle or a hillside structure, where the two differ substantially. The pole carries its own wind on a tapered projected area, and because that load is distributed the resultant acts at roughly mid-height. The force is small next to the conductors but its moment arm is not, and on a tall pole with light conductor it can be the larger term: a 9 psf wind on one ACSR Drake at a 400 ft wind span gives 332 lb at 38 ft, while the 45 ft pole standing 39 ft out of the ground contributes 293 lb at 19.5 ft -- 31% of an 18,335 ft-lb total, which is not a rounding error. Hand that moment to the pole capacity check and the Class 3 pole in that example runs 16% utilized on wind alone, before any conductor tension or angle pull is added. Under ice the conductor diameter grows and so does the wind area, which is why the NESC district cases combine ice AND wind rather than checking them separately -- enter the iced diameter here to build that case, or take the combined resultant from the district loading calculator. This is transverse wind only, on a tangent structure, with a round-shape factor of 1.0 and no gust response factor, height adjustment, or terrain exposure category applied -- all of which the applicable NESC edition and grade of construction require and none of which is here, so this is a screen rather than a design. It does not compute the longitudinal load at a deadend or the transverse component of line tension at an angle structure, both of which can exceed the wind; it does not evaluate the pole's capacity, which is a separate check; and it does not address wind on insulators, hardware, equipment, or a communications underbuild. The applicable NESC edition, the utility's construction standards, and a qualified line designer govern.",
  };
}
const transverseWindLoadConductorExample = { inputs: { wind_pressure_psf: 9, wind_speed_mph: 0, conductor_diameter_in: 1.108, wind_span_ft: 400, conductor_count: 1, conductor_height_ft: 38, pole_top_diameter_in: 8, pole_groundline_diameter_in: 12, pole_height_above_ground_ft: 39 } };
LINEWORKER_RENDERERS["transverse-wind-load-conductor"] = _simpleRenderer({
  citation: "Citation: the transverse wind load relations by name -- force on a conductor = pressure x (diameter / 12) x wind span, force on a pole = pressure x its tapered projected area with the resultant at mid-height, and the groundline moment = the sum of each force times its height. A wind speed entered instead of a pressure is converted with the ASCE 7 constant 0.00256 V^2, the same relation the wind-pressure calculator uses. Round shape factor 1.0; no gust, height, or exposure factor is applied. The applicable NESC edition, the utility's construction standards, and a qualified line designer govern.",
  example: transverseWindLoadConductorExample.inputs,
  fields: [
    { key: "wind_pressure_psf", label: "Wind pressure (psf, 0 to use the speed)", kind: "number", default: 9 },
    { key: "wind_speed_mph", label: "Wind speed (mph, used when no pressure is entered)", kind: "number", default: 0 },
    { key: "conductor_diameter_in", label: "Conductor diameter, iced if that is the case (in)", kind: "number", default: 1.108 },
    { key: "wind_span_ft", label: "Wind span (ft) -- half the span each side", kind: "number", default: 400 },
    { key: "conductor_count", label: "Number of conductors at this height", kind: "number", default: 1 },
    { key: "conductor_height_ft", label: "Attachment height above the groundline (ft)", kind: "number", default: 38 },
    { key: "pole_top_diameter_in", label: "Pole diameter at the top (in, 0 to skip the pole)", kind: "number", default: 8 },
    { key: "pole_groundline_diameter_in", label: "Pole diameter at the groundline (in)", kind: "number", default: 12 },
    { key: "pole_height_above_ground_ft", label: "Pole height above ground (ft)", kind: "number", default: 39 },
  ],
  outputs: [
    { key: "p", id: "twl-out-p", label: "Wind pressure", value: (r) => fmt(r.pressure_psf, 2) + " psf" },
    { key: "c", id: "twl-out-c", label: "Force on the conductors", value: (r) => fmt(r.conductor_force_lb, 1) + " lb across " + fmt(r.conductor_count, 0) + " -- " + fmt(r.conductor_force_per_ft_lb, 4) + " lb/ft over the wind span, NOT the ruling span" },
    { key: "o", id: "twl-out-o", label: "Force on the pole", value: (r) => fmt(r.pole_force_lb, 1) + " lb on " + fmt(r.pole_projected_area_ft2, 2) + " sq ft, acting at " + fmt(r.pole_resultant_height_ft, 1) + " ft" },
    { key: "t", id: "twl-out-t", label: "Total transverse force", value: (r) => fmt(r.total_force_lb, 1) + " lb" },
    { key: "m", id: "twl-out-m", label: "Groundline moment", value: (r) => fmt(r.groundline_moment_ftlb, 0) + " ft-lb -- hand this to the pole capacity check" },
    { key: "s", id: "twl-out-s", label: "The pole's own share", value: (r) => r.pole_verdict },
    { key: "n", id: "twl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTransverseWindLoadConductor,
});

// ============ spec-v1458: NESC ice-and-wind district loading ============

// District radial ice (in), wind pressure (psf), constant k (lb/ft), and
// design temperature (degF). Entered as a district number so the selection
// does real work; 0 takes the custom values instead.
const _NESC_DISTRICTS = {
  1: { name: "Heavy", ice_in: 0.50, wind_psf: 4, k: 0.30, temp_f: 0 },
  2: { name: "Medium", ice_in: 0.25, wind_psf: 4, k: 0.20, temp_f: 15 },
  3: { name: "Light", ice_in: 0.00, wind_psf: 9, k: 0.05, temp_f: 30 },
};

// dims: in { bare_diameter_in: L, bare_weight_lb_per_ft: M / L, district: dimensionless, custom_ice_in: L, custom_wind_psf: M L^-1 T^-2, custom_k_lb_per_ft: M / L, custom_temp_f: T } out: { iced_diameter_in: L, ice_weight_lb_per_ft: M / L, vertical_lb_per_ft: M / L, horizontal_lb_per_ft: M / L, resultant_lb_per_ft: M / L }
export function computeNescDistrictLoading({ bare_diameter_in = 0, bare_weight_lb_per_ft = 0, district = 1, custom_ice_in = 0, custom_wind_psf = 0, custom_k_lb_per_ft = 0, custom_temp_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bare_diameter_in > 0)) return { error: "Bare conductor diameter must be positive (in)." };
  if (!(bare_weight_lb_per_ft > 0)) return { error: "Bare conductor weight must be positive (lb/ft)." };
  const d = Math.round(district);
  if (![0, 1, 2, 3].includes(d)) return { error: "District must be 1 (Heavy), 2 (Medium), 3 (Light), or 0 to enter custom ice, wind, and constant." };
  if (custom_ice_in < 0 || custom_wind_psf < 0 || custom_k_lb_per_ft < 0) return { error: "Custom ice, wind, and constant cannot be negative." };
  const preset = _NESC_DISTRICTS[d];
  const district_name = preset ? preset.name : "Custom";
  const ice_in = preset ? preset.ice_in : custom_ice_in;
  const wind_psf = preset ? preset.wind_psf : custom_wind_psf;
  const k_lb_per_ft = preset ? preset.k : custom_k_lb_per_ft;
  const design_temp_f = preset ? preset.temp_f : custom_temp_f;
  if (!(wind_psf > 0)) return { error: "Enter a wind pressure for the custom case (psf)." };
  // The ice is an ANNULUS, not a coating of the bare diameter, so its weight
  // goes as the difference of squares.
  const iced_diameter_in = bare_diameter_in + 2 * ice_in;
  const ice_area_in2 = Math.PI / 4 * (iced_diameter_in * iced_diameter_in - bare_diameter_in * bare_diameter_in);
  const ice_weight_lb_per_ft = ice_area_in2 / _IN2_PER_FT2 * _ICE_DENSITY_PCF;
  const vertical_lb_per_ft = bare_weight_lb_per_ft + ice_weight_lb_per_ft;
  // The wind acts on the ICED diameter, not the bare one.
  const horizontal_lb_per_ft = wind_psf * iced_diameter_in / _IN_PER_FT;
  const vector_sum_lb_per_ft = Math.sqrt(vertical_lb_per_ft * vertical_lb_per_ft + horizontal_lb_per_ft * horizontal_lb_per_ft);
  const resultant_lb_per_ft = vector_sum_lb_per_ft + k_lb_per_ft;
  const ratio_to_bare = resultant_lb_per_ft / bare_weight_lb_per_ft;
  const k_share_pct = resultant_lb_per_ft > 0 ? k_lb_per_ft / resultant_lb_per_ft * 100 : 0;
  const outs = [iced_diameter_in, ice_weight_lb_per_ft, vertical_lb_per_ft, horizontal_lb_per_ft, resultant_lb_per_ft];
  if (!outs.every(Number.isFinite)) return { error: "District loading math is not a finite value." };
  return {
    district_name, ice_in, wind_psf, k_lb_per_ft, design_temp_f,
    iced_diameter_in, ice_area_in2, ice_weight_lb_per_ft,
    vertical_lb_per_ft, horizontal_lb_per_ft, vector_sum_lb_per_ft,
    resultant_lb_per_ft, ratio_to_bare, k_share_pct, bare_weight_lb_per_ft,
    ice_multiple: bare_weight_lb_per_ft > 0 ? vertical_lb_per_ft / bare_weight_lb_per_ft : 0,
    note: "Everything downstream of a conductor -- sag, tension, pole moment, guy pull -- starts from its resultant weight per foot under the governing load case, and that case is not the bare conductor. NESC defines three loading districts, each a combination of radial ice, wind pressure, temperature, and a constant adder, and building that resultant is four steps of arithmetic done wrong more often than it is done. THE ICE IS AN ANNULUS, not a coating of the bare diameter, so its weight goes as the difference of squares -- which means the ice load on a small conductor is proportionally far worse than on a large one. Half an inch of radial ice on a 1.1 in conductor nearly doubles its weight; the same half inch on a 0.4 in neutral more than triples it, and that is why the light conductors come down first. The wind then acts on the ICED diameter rather than the bare one, and the two are combined as a VECTOR because they act at right angles. Last comes the constant, a flat adder to the resultant -- 0.30, 0.20, and 0.05 lb/ft for Heavy, Medium, and Light -- which is not physics but a deliberate margin, and it matters most on the light conductors where it is a large fraction of the total. Run ACSR Drake through all three and the Heavy district loads it at 2.30 times its bare weight, Medium at 1.65, and Light at 1.30 -- and the Light case has no ice at all, so that entire 30% is the wind vector and the constant. Feed the resultant rather than the bare weight into the change-of-state calculation and every tension and sag downstream changes by that factor. The district values are entered by selection here and are the NESC district definitions cited by name, not a reproduction of the code's tables; the district that applies is a matter of geography and of the edition the jurisdiction has adopted, and a utility may specify heavier loading than its district requires. This builds one combined load case on one conductor. It does not select the district, apply the overload capacity factors that the grade of construction requires, or evaluate the extreme-wind and extreme-ice-with-concurrent-wind cases that NESC requires separately for taller structures and that can govern instead. It does not model ice shedding, unbalanced ice between spans, or the longitudinal loads either produces, and it does not address galloping, which is an ice-and-wind phenomenon this arithmetic says nothing about. It does not compute a sag, a tension, or a structure load. The applicable NESC edition and its district map, the utility's construction standards, and a qualified line designer govern.",
  };
}
const nescDistrictLoadingExample = { inputs: { bare_diameter_in: 1.108, bare_weight_lb_per_ft: 1.094, district: 1, custom_ice_in: 0, custom_wind_psf: 0, custom_k_lb_per_ft: 0, custom_temp_f: 0 } };
LINEWORKER_RENDERERS["nesc-district-loading"] = _simpleRenderer({
  citation: "Citation: the NESC district loading combination by name -- iced diameter = bare + 2 x radial ice; ice weight per foot = (pi/4)(iced^2 - bare^2)/144 x 57.3 lb/cu ft; vertical = bare weight + ice weight; horizontal = wind pressure x iced diameter / 12; resultant = sqrt(vertical^2 + horizontal^2) + k. The Heavy, Medium, and Light district values (0.50/0.25/0.00 in of radial ice, 4/4/9 psf, k of 0.30/0.20/0.05 lb/ft, at 0/15/30 degF) are the NESC district definitions cited by name; the district that applies is geography and the adopted edition. Overload capacity factors and the separate extreme-wind and extreme-ice cases are NOT applied. The applicable NESC edition, the utility's construction standards, and a qualified line designer govern.",
  example: nescDistrictLoadingExample.inputs,
  fields: [
    { key: "bare_diameter_in", label: "Bare conductor diameter (in)", kind: "number", default: 1.108 },
    { key: "bare_weight_lb_per_ft", label: "Bare conductor weight (lb/ft)", kind: "number", default: 1.094 },
    { key: "district", label: "District: 1 Heavy, 2 Medium, 3 Light, 0 custom", kind: "number", default: 1 },
    { key: "custom_ice_in", label: "Custom radial ice (in, district 0 only)", kind: "number", default: 0 },
    { key: "custom_wind_psf", label: "Custom wind pressure (psf, district 0 only)", kind: "number", default: 0 },
    { key: "custom_k_lb_per_ft", label: "Custom constant k (lb/ft, district 0 only)", kind: "number", default: 0 },
    { key: "custom_temp_f", label: "Custom design temperature (F, district 0 only)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "d", id: "ndl-out-d", label: "District applied", value: (r) => r.district_name + ": " + fmt(r.ice_in, 2) + " in of radial ice, " + fmt(r.wind_psf, 1) + " psf, k = " + fmt(r.k_lb_per_ft, 2) + " lb/ft, at " + fmt(r.design_temp_f, 0) + " F" },
    { key: "i", id: "ndl-out-i", label: "Iced diameter and ice weight", value: (r) => fmt(r.iced_diameter_in, 3) + " in carrying " + fmt(r.ice_weight_lb_per_ft, 4) + " lb/ft of ice -- an annulus, so it goes as the difference of squares" },
    { key: "v", id: "ndl-out-v", label: "Vertical and horizontal", value: (r) => fmt(r.vertical_lb_per_ft, 4) + " lb/ft down, " + fmt(r.horizontal_lb_per_ft, 4) + " lb/ft across -- the wind acts on the ICED diameter" },
    { key: "r", id: "ndl-out-r", label: "Resultant weight per foot", value: (r) => fmt(r.resultant_lb_per_ft, 4) + " lb/ft -- vector sum " + fmt(r.vector_sum_lb_per_ft, 4) + " plus the " + fmt(r.k_lb_per_ft, 2) + " constant" },
    { key: "b", id: "ndl-out-b", label: "Against the bare conductor", value: (r) => fmt(r.ratio_to_bare, 2) + "x bare weight -- feed THIS into the change-of-state calculation, not " + fmt(r.bare_weight_lb_per_ft, 3) + ". The constant alone is " + fmt(r.k_share_pct, 0) + "% of it" },
    { key: "n", id: "ndl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeNescDistrictLoading,
});

// ============ spec-v1459: conductor long-term creep ============

// dims: in { creep_strain: dimensionless, alpha_per_f: dimensionless, span_ft: L, area_in2: L^2, weight_lb_per_ft: M / L, modulus_psi: M L^-1 T^-2, tension1_lb: M L T^-2, design_temp_f: T } out: { equivalent_temp_rise_f: T, sag_design_ft: L, sag_after_creep_ft: L, creep_sag_increase_ft: L, initial_stringing_sag_ft: L }
export function computeConductorCreepElongation({ creep_strain = 0, alpha_per_f = 0, span_ft = 0, area_in2 = 0, weight_lb_per_ft = 0, modulus_psi = 0, tension1_lb = 0, design_temp_f = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(creep_strain > 0)) return { error: "Creep strain must be positive (a few times 1e-4 over the life of an aluminium conductor)." };
  if (!(alpha_per_f > 0)) return { error: "Coefficient of thermal expansion must be positive (per degF)." };
  if (!(span_ft > 0)) return { error: "Span must be positive (ft)." };
  if (!(area_in2 > 0)) return { error: "Conductor area must be positive (sq in)." };
  if (!(weight_lb_per_ft > 0)) return { error: "Conductor weight per foot must be positive (lb/ft)." };
  if (!(modulus_psi > 0)) return { error: "Modulus of elasticity must be positive (psi)." };
  if (!(tension1_lb > 0)) return { error: "Tension at the design condition must be positive (lb)." };
  // Creep strain over the coefficient of thermal expansion is the temperature
  // rise that would produce the same elongation -- so creep becomes just
  // another temperature offset, and the change-of-state equation already knows
  // how to move a conductor by a temperature.
  const equivalent_temp_rise_f = creep_strain / alpha_per_f;
  const sag_design_ft = weight_lb_per_ft * span_ft * span_ft / (8 * tension1_lb);
  const afterCreep = computeConductorSagAtTemperature({
    span_ft, area_in2, weight1_lb_per_ft: weight_lb_per_ft, weight2_lb_per_ft: weight_lb_per_ft,
    modulus_psi, alpha_per_f, tension1_lb, temp1_f: design_temp_f,
    temp2_f: design_temp_f + equivalent_temp_rise_f,
  });
  if (afterCreep.error) return { error: afterCreep.error };
  const sag_after_creep_ft = afterCreep.sag2_ft;
  const tension_after_creep_lb = afterCreep.tension2_lb;
  const creep_sag_increase_ft = sag_after_creep_ft - sag_design_ft;
  const creep_sag_increase_pct = sag_design_ft > 0 ? creep_sag_increase_ft / sag_design_ft * 100 : 0;
  // The stringing instruction: sag the new conductor as though it were the
  // equivalent temperature COLDER, and it lands on the design sag once the
  // creep is spent instead of sailing past it.
  const beforeCreep = computeConductorSagAtTemperature({
    span_ft, area_in2, weight1_lb_per_ft: weight_lb_per_ft, weight2_lb_per_ft: weight_lb_per_ft,
    modulus_psi, alpha_per_f, tension1_lb, temp1_f: design_temp_f,
    temp2_f: design_temp_f - equivalent_temp_rise_f,
  });
  if (beforeCreep.error) return { error: beforeCreep.error };
  const initial_stringing_sag_ft = beforeCreep.sag2_ft;
  const initial_stringing_tension_lb = beforeCreep.tension2_lb;
  const stringing_offset_ft = sag_design_ft - initial_stringing_sag_ft;
  const outs = [equivalent_temp_rise_f, sag_design_ft, sag_after_creep_ft, creep_sag_increase_ft, initial_stringing_sag_ft];
  if (!outs.every(Number.isFinite)) return { error: "Creep math is not a finite value." };
  return {
    creep_strain, equivalent_temp_rise_f, sag_design_ft, sag_after_creep_ft,
    creep_sag_increase_ft, creep_sag_increase_pct, tension_after_creep_lb,
    initial_stringing_sag_ft, initial_stringing_tension_lb, stringing_offset_ft,
    design_temp_f, string_at_temp_f: design_temp_f - equivalent_temp_rise_f,
    note: "A conductor sags more in year ten than in year one, at the same temperature and the same load, because aluminium creeps. Creep is permanent, non-elastic elongation under sustained load, and in aluminium conductor it is large enough to matter -- strains of a few times ten to the minus four over the life of a line are ordinary, with most of it spent in the first year or two and the rest accumulating slowly. Steel barely creeps at all, which is why ACSR creeps less than all-aluminium conductor and why the effect concentrates in the aluminium strands. The clean way to use it is the TEMPERATURE EQUIVALENT. Creep strain divided by the coefficient of thermal expansion is the temperature rise that would produce the same elongation, and since the change-of-state equation already knows how to move a conductor by a temperature, creep becomes just another temperature offset. An ordinary ten-year ACSR value of 5.0e-04 against an alpha of 1.06e-05 per degF is 47.2 degF equivalent -- which is not a correction, it is a bigger move than most seasonal swings, and it runs in the SAME direction as a hot day rather than against it. That is the whole reason utilities sag new conductor deliberately high. The practical instruction follows directly: sag the new line as though it were the equivalent temperature COLDER than it actually is, and it will arrive at the design sag once the creep is spent instead of sailing past it. A crew that sags to the design number on installation day has already spent the entire clearance margin before the line is a decade old, and the line will fail an inspection it passed at commissioning with nothing having gone wrong. The creep strain itself is an INPUT and it must come from the conductor manufacturer's creep data for the conductor, the tension, and the elapsed time in question. This does not predict it. Creep is a function of stress history, temperature history, and time, it differs by construction and by aluminium alloy, and a conductor that has been through a heavy ice event has had its creep partly displaced by that overload -- so a single strain figure is a working approximation to a path-dependent process. This treats the conductor as one homogeneous material with a single modulus, which understates the difference between the aluminium and steel components of ACSR at high temperature. It does not evaluate clearance, produce a stringing chart, or address the prestressing and overtensioning procedures that some utilities use to spend creep deliberately at installation. The conductor manufacturer's creep and stress-strain data, the utility's sag-tension program and stringing charts, and the applicable NESC edition govern.",
  };
}
const conductorCreepElongationExample = { inputs: { creep_strain: 0.0005, alpha_per_f: 0.0000106, span_ft: 600, area_in2: 0.7264, weight_lb_per_ft: 1.094, modulus_psi: 11200000, tension1_lb: 6000, design_temp_f: 60 } };
LINEWORKER_RENDERERS["conductor-creep-elongation"] = _simpleRenderer({
  citation: "Citation: the creep temperature-equivalent method by name -- equivalent temperature rise = creep strain / coefficient of thermal expansion -- with the resulting condition evaluated through the same parabolic change-of-state relation the sag-at-temperature calculator uses, so the two cannot disagree. The creep strain is an input from the conductor manufacturer's creep data for the conductor, tension, and elapsed time; none is predicted here. The conductor manufacturer's creep and stress-strain data, the utility's sag-tension program and stringing charts, and the applicable NESC edition govern.",
  example: conductorCreepElongationExample.inputs,
  fields: [
    { key: "creep_strain", label: "Creep strain from the manufacturer's data", kind: "number", default: 0.0005 },
    { key: "alpha_per_f", label: "Coefficient of thermal expansion (per degF)", kind: "number", default: 0.0000106 },
    { key: "span_ft", label: "Ruling span (ft)", kind: "number", default: 600 },
    { key: "area_in2", label: "Conductor area (sq in)", kind: "number", default: 0.7264 },
    { key: "weight_lb_per_ft", label: "Conductor weight (lb/ft)", kind: "number", default: 1.094 },
    { key: "modulus_psi", label: "Modulus of elasticity (psi)", kind: "number", default: 11200000 },
    { key: "tension1_lb", label: "Tension at the design condition (lb)", kind: "number", default: 6000 },
    { key: "design_temp_f", label: "Design temperature (F)", kind: "number", default: 60 },
  ],
  outputs: [
    { key: "e", id: "cce-out-e", label: "Equivalent temperature rise", value: (r) => fmt(r.equivalent_temp_rise_f, 1) + " F -- bigger than most seasonal swings, permanent, and running the SAME way as a hot day" },
    { key: "d", id: "cce-out-d", label: "Design sag today", value: (r) => fmt(r.sag_design_ft, 2) + " ft at " + fmt(r.design_temp_f, 0) + " F" },
    { key: "a", id: "cce-out-a", label: "Sag once the creep is spent", value: (r) => fmt(r.sag_after_creep_ft, 2) + " ft at the same temperature -- up " + fmt(r.creep_sag_increase_ft, 2) + " ft, " + fmt(r.creep_sag_increase_pct, 0) + "%, with nothing having gone wrong" },
    { key: "s", id: "cce-out-s", label: "Sag the new conductor to", value: (r) => fmt(r.initial_stringing_sag_ft, 2) + " ft, which is " + fmt(r.stringing_offset_ft, 2) + " ft HIGH -- string it as though it were " + fmt(r.string_at_temp_f, 0) + " F" },
    { key: "t", id: "cce-out-t", label: "Stringing tension for that sag", value: (r) => fmt(r.initial_stringing_tension_lb, 0) + " lb against the " + fmt(r.sag_design_ft > 0 ? r.tension_after_creep_lb : 0, 0) + " lb it settles to" },
    { key: "n", id: "cce-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConductorCreepElongation,
});

// ============ spec-v1460: sagging by stopwatch (return-wave method) ============

// The constant carries the unit conversion for feet and seconds: a transverse
// wave's round trip and the sag are two readings of one physical state, and
// the span length cancels out of the relation entirely.
const _RETURN_WAVE_CONSTANT = 12.075;

// dims: in { elapsed_seconds: T, return_waves: dimensionless, target_sag_ft: L, stopwatch_error_seconds: T } out: { sag_from_timing_ft: L, target_time_seconds: T, period_per_wave_seconds: T, sag_error_ft: L, single_wave_sag_error_ft: L }
export function computeSaggingReturnWave({ elapsed_seconds = 0, return_waves = 3, target_sag_ft = 0, stopwatch_error_seconds = 0.2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const N = return_waves;
  if (!(N >= 1)) return { error: "Count at least one return wave." };
  if (elapsed_seconds < 0) return { error: "Elapsed time cannot be negative (s)." };
  if (target_sag_ft < 0) return { error: "Target sag cannot be negative (ft)." };
  if (stopwatch_error_seconds < 0) return { error: "Stopwatch error cannot be negative (s)." };
  if (!(elapsed_seconds > 0 || target_sag_ft > 0)) return { error: "Enter an elapsed time (to read the sag) or a target sag (to get the time to listen for)." };
  const sagFromTime = (t) => _RETURN_WAVE_CONSTANT * (t / N) * (t / N);
  const sag_from_timing_ft = elapsed_seconds > 0 ? sagFromTime(elapsed_seconds) : null;
  const target_time_seconds = target_sag_ft > 0 ? N * Math.sqrt(target_sag_ft / _RETURN_WAVE_CONSTANT) : null;
  const reference_time = elapsed_seconds > 0 ? elapsed_seconds : target_time_seconds;
  const period_per_wave_seconds = reference_time / N;
  // Because the relation is SQUARED, a tenth of a second on one wave is a
  // large sag error and the same tenth over five waves is a small one.
  const reference_sag = sag_from_timing_ft !== null ? sag_from_timing_ft : target_sag_ft;
  const sag_at_error_ft = sagFromTime(reference_time + stopwatch_error_seconds);
  const sag_error_ft = sag_at_error_ft - reference_sag;
  const single_wave_time = Math.sqrt(reference_sag / _RETURN_WAVE_CONSTANT);
  const single_wave_sag_error_ft = _RETURN_WAVE_CONSTANT * Math.pow(single_wave_time + stopwatch_error_seconds, 2) - reference_sag;
  const error_advantage = sag_error_ft > 0 ? single_wave_sag_error_ft / sag_error_ft : null;
  const outs = [period_per_wave_seconds, sag_error_ft, single_wave_sag_error_ft];
  if (!outs.every(Number.isFinite)) return { error: "Return-wave math is not a finite value." };
  return {
    sag_from_timing_ft, target_time_seconds, period_per_wave_seconds,
    return_waves: N, stopwatch_error_seconds, sag_error_ft, sag_at_error_ft,
    single_wave_sag_error_ft, single_wave_time, error_advantage, reference_sag,
    note: "Sagging by eye against a target works when a crew can see both structures, and often they cannot -- a hill, a curve, trees, a long span. The stopwatch method needs neither line of sight nor an instrument: strike the conductor near one support and a transverse wave runs to the far structure, reflects, and comes back. Its travel speed is set by the tension and the mass per unit length, which is exactly the same pair of quantities that set the sag, so the round-trip time and the sag are two readings of one physical state -- AND THE SPAN LENGTH CANCELS OUT OF THE RELATION ENTIRELY. That is what makes the method work with no line of sight: the crew never needs to know how far away the other pole is. The constant 12.075 carries the unit conversion for feet and seconds. Timing several return waves rather than one is the whole accuracy trick, and it is not fussiness. Because the relation is SQUARED, a tenth of a second of stopwatch error on a single wave is a large sag error while the same tenth spread over five waves is a small one: for a 12 ft sag, three waves want 2.99 seconds and two tenths of error costs 1.66 ft, while one wave wants 1.00 second and the same two tenths costs 5.30 ft -- more than three times worse for the identical stopwatch and the identical hand. Three to five waves is normal practice, and the sensitivity is reported here so a crew can see what its own timing is worth rather than taking that on faith. This is the ideal taut-string relation. It assumes a free span with the wave reflecting cleanly at both ends, so it degrades where the conductor is not free to move -- through running blocks, against a hold-down, on a span with an armour rod or damper near the end, or in a section not yet clipped in. It does not account for damping, for wind moving the conductor while the wave travels, or for the sag being unequal in adjacent spans. It says nothing about tension, clearance, or whether the resulting sag is the right one: the target sag must come from the stringing chart at the ruling span and the temperature at the moment of sagging. The utility's stringing charts and construction standards and the crew's own sagging procedure govern.",
  };
}
const saggingReturnWaveExample = { inputs: { elapsed_seconds: 0, return_waves: 3, target_sag_ft: 12, stopwatch_error_seconds: 0.2 } };
LINEWORKER_RENDERERS["sagging-return-wave"] = _simpleRenderer({
  citation: "Citation: the return-wave (stopwatch) sagging relation by name -- S = 12.075 (t / N)^2 with S in feet, t the elapsed seconds and N the number of return waves counted, inverted as t = N sqrt(S / 12.075). The wave speed sqrt(H / m) and the sag are set by the same tension and mass per unit length, which is why the span length cancels. Ideal taut string, free span. The utility's stringing charts and construction standards and the crew's own sagging procedure govern.",
  example: saggingReturnWaveExample.inputs,
  fields: [
    { key: "elapsed_seconds", label: "Elapsed time counted (s, 0 if solving for the time)", kind: "number", default: 0 },
    { key: "return_waves", label: "Return waves counted", kind: "number", default: 3 },
    { key: "target_sag_ft", label: "Target sag (ft, 0 if solving for the sag)", kind: "number", default: 12 },
    { key: "stopwatch_error_seconds", label: "Stopwatch error to test (s)", kind: "number", default: 0.2 },
  ],
  outputs: [
    { key: "s", id: "srw-out-s", label: "Sag from the timing", value: (r) => r.sag_from_timing_ft === null ? "(no elapsed time entered)" : fmt(r.sag_from_timing_ft, 2) + " ft over " + fmt(r.return_waves, 0) + " return waves" },
    { key: "t", id: "srw-out-t", label: "Time to listen for", value: (r) => r.target_time_seconds === null ? "(no target sag entered)" : fmt(r.target_time_seconds, 2) + " s for " + fmt(r.return_waves, 0) + " returns" },
    { key: "p", id: "srw-out-p", label: "Period per wave", value: (r) => fmt(r.period_per_wave_seconds, 3) + " s" },
    { key: "e", id: "srw-out-e", label: "What your stopwatch error is worth", value: (r) => fmt(r.stopwatch_error_seconds, 2) + " s of error is " + fmt(r.sag_error_ft, 2) + " ft of sag error at " + fmt(r.return_waves, 0) + " waves" },
    { key: "o", id: "srw-out-o", label: "The same error on ONE wave", value: (r) => fmt(r.single_wave_sag_error_ft, 2) + " ft" + (r.error_advantage === null ? "" : " -- " + fmt(r.error_advantage, 1) + "x worse for the identical stopwatch. Counting more waves is the method, not fussiness") },
    { key: "n", id: "srw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSaggingReturnWave,
});

// ===========================================================================
// spec-v1461..v1467: the 2026-09-08 trade-expansion second lineworker band --
// the distribution side of line work. The first band was mechanical: sag,
// tension, ice, wind, poles and guys. This one is what the same crew does
// once the wire is up -- loading a pot, switching a bank, setting a
// regulator, coordinating a fuse, costing the losses, checking a meter
// multiplier, and grounding a structure in rock.
//
//   v1461 transformer-diversity-loading   v1465 feeder-loss-load-factor
//   v1462 capacitor-bank-voltage-rise     v1466 meter-ct-pt-multiplier
//   v1463 regulator-tap-bandwidth         v1467 counterpoise-resistance
//   v1464 recloser-fuse-coordination
//
// THREE OF THE SEVEN SPECS WERE INTERNALLY WRONG, and two of them the same
// way the millwright band's were -- correct arithmetic followed by a sentence
// that points the wrong way:
//   spec-v1462 computes 124 + 1.11 = 125.1 V and calls that "past the ANSI
//     C84.1 Range A limit of 126". 125.1 is INSIDE 126, by 0.9 V.
//   spec-v1466 computes an implied 456 A behind a 200:5 CT and calls it
//     "comfortably inside a 200 A CT". 456 A is 2.3 TIMES that CT's primary
//     rating -- which is exactly the failure the plausibility check exists to
//     catch, so the worked example here is kept and reported as a FAIL.
//   spec-v1467 calls its soil "100 ohm-metre" and then puts 100 into a
//     foot-based relation. 100 ohm-m is 10,000 ohm-cm, not 100 ohm-ft, and
//     the resistance is 6.51 ohms rather than the 1.98 the spec prints.
// Every threshold in this band is therefore reported as a computed verdict in
// WORDS, driven off a boolean the compute returns, so that a number and the
// sentence beside it cannot disagree.
//
// Soil resistivity is entered in ohm-cm here because `grounding-electrode`
// and `soil-resistivity-wenner` already read it that way, and two grounding
// calculators must not disagree about the dirt under one structure.

// ============ spec-v1461: distribution transformer diversified loading ============

// dims: in { customers: dimensionless, individual_peak_kva: M L^2 T^-3, diversity_factor: dimensionless, continuous_rating_kva: M L^2 T^-3, short_time_rating_kva: M L^2 T^-3, average_demand_kva: M L^2 T^-3 } out: { connected_kva: M L^2 T^-3, diversified_kva: M L^2 T^-3, continuous_loading_pct: dimensionless, short_time_loading_pct: dimensionless, headroom_customers: dimensionless, load_factor: dimensionless }
export function computeTransformerDiversityLoading({ customers = 0, individual_peak_kva = 0, diversity_factor = 0, continuous_rating_kva = 0, short_time_rating_kva = 0, average_demand_kva = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(customers >= 1)) return { error: "Customer count must be at least one." };
  if (!(individual_peak_kva > 0)) return { error: "Individual customer peak demand must be positive (kVA)." };
  if (!(diversity_factor > 0 && diversity_factor <= 1)) return { error: "The coincidence (diversity) factor must be greater than zero and no more than one." };
  if (!(continuous_rating_kva > 0)) return { error: "Transformer continuous rating must be positive (kVA)." };
  if (short_time_rating_kva < 0) return { error: "Short-time rating cannot be negative (kVA)." };
  if (average_demand_kva < 0) return { error: "Average demand cannot be negative (kVA)." };
  const connected_kva = customers * individual_peak_kva;
  const diversified_kva = connected_kva * diversity_factor;
  const continuous_loading_pct = diversified_kva / continuous_rating_kva * 100;
  const connected_loading_pct = connected_kva / continuous_rating_kva * 100;
  const short_time_loading_pct = short_time_rating_kva > 0 ? diversified_kva / short_time_rating_kva * 100 : null;
  // The classic "diversity factor" of the textbooks is connected over
  // diversified and is at least one; the "coincidence factor" is its
  // reciprocal and is at most one. The input here is the coincidence factor,
  // which is the number utilities actually tabulate, and both are reported
  // because the two names get swapped constantly.
  const classic_diversity_factor = 1 / diversity_factor;
  const customers_at_continuous = continuous_rating_kva / (individual_peak_kva * diversity_factor);
  const headroom_customers = customers_at_continuous - customers;
  const load_factor = average_demand_kva > 0 ? average_demand_kva / diversified_kva : null;
  const within_continuous = continuous_loading_pct <= 100;
  const within_short_time = short_time_rating_kva > 0 ? diversified_kva <= short_time_rating_kva : null;
  const outs = [connected_kva, diversified_kva, continuous_loading_pct, customers_at_continuous, headroom_customers];
  if (!outs.every(Number.isFinite)) return { error: "Diversified-loading math is not a finite value." };
  const verdict = within_continuous
    ? "UNDER the continuous rating: " + fmt(continuous_loading_pct, 1) + "% of " + fmt(continuous_rating_kva, 0) + " kVA, with room for " + fmt(headroom_customers, 1) + " more customers at this coincidence factor"
    : "OVER the continuous rating: " + fmt(continuous_loading_pct, 1) + "% of " + fmt(continuous_rating_kva, 0) + " kVA, which is " + fmt(-headroom_customers, 1) + " customers past it"
      + (within_short_time === true ? " but INSIDE the entered " + fmt(short_time_rating_kva, 0) + " kVA short-time rating, so the question is duration and loss of life, not nameplate" : within_short_time === false ? " and OVER the entered " + fmt(short_time_rating_kva, 0) + " kVA short-time rating as well" : "");
  return {
    customers, individual_peak_kva, diversity_factor, continuous_rating_kva, short_time_rating_kva,
    connected_kva, diversified_kva, continuous_loading_pct, connected_loading_pct, short_time_loading_pct,
    classic_diversity_factor, customers_at_continuous, headroom_customers, load_factor,
    within_continuous, within_short_time, verdict,
    note: "A 25 kVA pot serving eight houses is not serving eight times one house's peak, because the peaks do not coincide. Sizing a distribution transformer on connected load oversizes it enormously, and the term that closes the gap is the coincidence factor. Diversity strengthens as the group grows: two houses on one transformer coincide badly, thirty houses hardly coincide at all, so the factor falls from near 1.0 at a single customer toward an asymptote somewhere around 0.4 to 0.6 for a large residential group. Each utility carries its own curve, derived from its own metered data, and NO CURVE IS SHIPPED HERE for the same reason no clearance table is: a factor that is right for one system's housing stock and climate is wrong for another's, and a shipped curve would be believed. The two names for this quantity are swapped constantly and both are reported: the coincidence factor is diversified over connected and is at most one, the classic diversity factor is its reciprocal and is at least one. Distribution transformers are also allowed to run past nameplate for a few hours, because their thermal time constant is measured in hours -- a pot that peaks above 100% for two evening hours and sits at 40% overnight can have an entirely ordinary loss of life. That is why loading is reported against both the continuous rating and an entered short-time rating, and why load factor is worth carrying beside peak: peak alone says nothing about how long the peak lasts. What this does not do is decide whether a given overload is acceptable. Loss of life needs a full load cycle against an ambient profile through IEEE C57.91, and a short-time rating used without that study is a guess with a number on it. Electric vehicle charging and electric heat break residential diversity assumptions badly, and are exactly the case where an old factor misleads: several vehicles on one pot charge on the same timer, which is coincidence rather than diversity. One transformer, one customer class, one factor supplied by the reader. Secondary voltage drop is a separate calculation. The utility's transformer loading guide, IEEE C57.91, and the transformer manufacturer's ratings govern.",
  };
}
const transformerDiversityLoadingExample = { inputs: { customers: 8, individual_peak_kva: 9.5, diversity_factor: 0.62, continuous_rating_kva: 25, short_time_rating_kva: 50, average_demand_kva: 18 } };
LINEWORKER_RENDERERS["transformer-diversity-loading"] = _simpleRenderer({
  citation: "Citation: the diversified-demand relation by name -- diversified demand = customer count x individual peak x coincidence factor, with the classic diversity factor reported as its reciprocal -- and IEEE C57.91 named for loading beyond nameplate. NO DIVERSITY CURVE IS SHIPPED: the factor is entered from the utility's own metered data, because a curve right for one system's housing stock is wrong for another's. Loss of life is not computed; it needs a full load cycle against an ambient profile. The utility's transformer loading guide, IEEE C57.91, and the transformer manufacturer's ratings govern.",
  example: transformerDiversityLoadingExample.inputs,
  fields: [
    { key: "customers", label: "Customers served", kind: "number", default: 8 },
    { key: "individual_peak_kva", label: "Individual customer peak demand (kVA)", kind: "number", default: 9.5 },
    { key: "diversity_factor", label: "Coincidence factor for that group size (0 to 1)", kind: "number", default: 0.62 },
    { key: "continuous_rating_kva", label: "Transformer continuous rating (kVA)", kind: "number", default: 25 },
    { key: "short_time_rating_kva", label: "Short-time rating (kVA, 0 to skip)", kind: "number", default: 50 },
    { key: "average_demand_kva", label: "Average demand (kVA, 0 to skip)", kind: "number", default: 18 },
  ],
  outputs: [
    { key: "c", id: "tdl-out-c", label: "Connected load", value: (r) => fmt(r.connected_kva, 1) + " kVA -- " + fmt(r.connected_loading_pct, 0) + "% of the rating, which is the number that sells an oversized transformer" },
    { key: "d", id: "tdl-out-d", label: "Diversified demand", value: (r) => fmt(r.diversified_kva, 2) + " kVA -- " + fmt(r.continuous_loading_pct, 1) + "% of the continuous rating" },
    { key: "v", id: "tdl-out-v", label: "Against the ratings", value: (r) => r.verdict },
    { key: "s", id: "tdl-out-s", label: "Short-time loading", value: (r) => r.short_time_loading_pct === null ? "(no short-time rating entered)" : fmt(r.short_time_loading_pct, 1) + "% of " + fmt(r.short_time_rating_kva, 0) + " kVA" },
    { key: "h", id: "tdl-out-h", label: "Customers to the continuous rating", value: (r) => fmt(r.customers_at_continuous, 1) + " at this coincidence factor -- " + fmt(r.headroom_customers, 1) + " from where you are. Each new customer also lowers the factor slightly, which a straight division misses" },
    { key: "f", id: "tdl-out-f", label: "Both names for the factor", value: (r) => "coincidence " + fmt(r.diversity_factor, 3) + ", classic diversity factor " + fmt(r.classic_diversity_factor, 3) + (r.load_factor === null ? "" : "; load factor " + fmt(r.load_factor, 3)) },
    { key: "n", id: "tdl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTransformerDiversityLoading,
});

// ============ spec-v1462: line capacitor bank voltage rise ============

// dims: in { bank_kvar: M L^2 T^-3, line_voltage_kv: M L^2 T^-3 I^-1, reactance_to_source_ohm: M L^2 T^-3 I^-2, peak_load_voltage_v: M L^2 T^-3 I^-1, light_load_voltage_v: M L^2 T^-3 I^-1, upper_limit_v: M L^2 T^-3 I^-1 } out: { rise_pct: dimensionless, rise_volts_120_base: M L^2 T^-3 I^-1, leading_current_a: I, peak_load_result_v: M L^2 T^-3 I^-1, light_load_result_v: M L^2 T^-3 I^-1, max_bank_kvar: M L^2 T^-3 }
export function computeCapacitorBankVoltageRise({ bank_kvar = 0, line_voltage_kv = 0, reactance_to_source_ohm = 0, peak_load_voltage_v = 118, light_load_voltage_v = 124, upper_limit_v = 126 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(line_voltage_kv > 0)) return { error: "Line-to-line system voltage must be positive (kV)." };
  if (!(reactance_to_source_ohm > 0)) return { error: "Line reactance from the source to the bank must be positive (ohm)." };
  if (bank_kvar < 0) return { error: "Bank rating cannot be negative (kVAR)." };
  if (!(peak_load_voltage_v > 0)) return { error: "Pre-switching voltage at peak load must be positive (V on a 120 V base)." };
  if (!(light_load_voltage_v > 0)) return { error: "Pre-switching voltage at light load must be positive (V on a 120 V base)." };
  if (!(upper_limit_v > 0)) return { error: "The upper voltage limit must be positive (V on a 120 V base)." };
  // The standard distribution relation. kVAR x X / (10 kV^2) lands in percent
  // directly: the 10 carries the kVAR-to-VAR and volt-to-kilovolt scaling
  // together with the factor of 100 that makes it a percentage.
  const rise_pct = bank_kvar * reactance_to_source_ohm / (10 * line_voltage_kv * line_voltage_kv);
  const rise_volts_120_base = rise_pct * 120 / 100;
  const leading_current_a = bank_kvar / (Math.sqrt(3) * line_voltage_kv);
  const peak_load_result_v = peak_load_voltage_v + rise_volts_120_base;
  const light_load_result_v = light_load_voltage_v + rise_volts_120_base;
  const light_load_margin_v = upper_limit_v - light_load_result_v;
  const within_limit_light = light_load_result_v <= upper_limit_v;
  const within_limit_peak = peak_load_result_v <= upper_limit_v;
  // Working the relation backwards at the binding condition, which is light
  // load: the largest fixed bank whose rise still fits under the limit.
  const headroom_v = Math.max(0, upper_limit_v - light_load_voltage_v);
  const max_bank_kvar = headroom_v / 120 * 100 * 10 * line_voltage_kv * line_voltage_kv / reactance_to_source_ohm;
  const outs = [rise_pct, rise_volts_120_base, leading_current_a, peak_load_result_v, light_load_result_v, max_bank_kvar];
  if (!outs.every(Number.isFinite)) return { error: "Capacitor voltage-rise math is not a finite value." };
  const verdict = within_limit_light
    ? "INSIDE the limit at light load: " + fmt(light_load_result_v, 2) + " V against " + fmt(upper_limit_v, 1) + " V, with " + fmt(light_load_margin_v, 2) + " V to spare"
    : "OVER the limit at light load: " + fmt(light_load_result_v, 2) + " V against " + fmt(upper_limit_v, 1) + " V, " + fmt(-light_load_margin_v, 2) + " V past it -- which is the case for switching this bank rather than fixing it";
  return {
    bank_kvar, line_voltage_kv, reactance_to_source_ohm, upper_limit_v,
    rise_pct, rise_volts_120_base, leading_current_a,
    peak_load_voltage_v, light_load_voltage_v, peak_load_result_v, light_load_result_v,
    light_load_margin_v, within_limit_light, within_limit_peak, max_bank_kvar, verdict,
    note: "Switching a capacitor bank onto a feeder raises the voltage, and the rise is what decides whether the bank helps the end of the line or pushes the head of it over limit. A capacitor injects leading reactive current; that current flowing back through the reactance between the bank and the source raises the voltage at the point of connection. The rise depends on the reactance BETWEEN the bank and the source, so the further out the bank sits the bigger its voltage effect and the smaller its loss-reduction effect per kVAR -- the two goals pull in opposite directions, and this one line of arithmetic is where the trade shows. The number that gets people is the light-load case, and it is the reason this reports the result at two conditions rather than one. A fixed bank sized for peak-load power factor is still connected at three in the morning, when the load is a fifth of peak, the drop it was cancelling is gone, and the rise it produces is the whole story. A feeder head sitting comfortably at peak can be over the ANSI C84.1 Range A upper limit at light load with the same bank, the same reactance, and nothing having changed but the hour. That is why banks get switched rather than fixed, and the largest bank that still fits under the limit at light load is reported so the size question is answered rather than argued. Steady state, one bank, one location, radial feeder. It does not model switching transients, which is where capacitor problems actually live: inrush on back-to-back switching, restrike across the switch contacts, and the voltage magnification that damages customer equipment and trips adjustable-speed drives. It does not check harmonic resonance, which is a separate screen and the other reason a bank sizing fails. It does not produce a voltage profile along the feeder or coordinate the bank against a regulator's bandwidth, and a bank inside a regulator's zone will interact with it. ANSI C84.1, IEEE 1036, the utility's capacitor application guide, and a distribution power-flow study govern.",
  };
}
const capacitorBankVoltageRiseExample = { inputs: { bank_kvar: 600, line_voltage_kv: 12.47, reactance_to_source_ohm: 2.4, peak_load_voltage_v: 118, light_load_voltage_v: 124, upper_limit_v: 126 } };
LINEWORKER_RENDERERS["capacitor-bank-voltage-rise"] = _simpleRenderer({
  citation: "Citation: the distribution capacitor voltage-rise relation by name -- percent rise = bank kVAR x reactance to the source / (10 x line-to-line kV squared) -- with ANSI C84.1 Range A named for the voltage limit the result is tested against. The limit and both pre-switching voltages are entered, because the adopted range and the feeder's own profile are local. Steady state; no switching transient, no harmonic resonance check, no feeder voltage profile. ANSI C84.1, IEEE 1036, the utility's capacitor application guide, and a distribution power-flow study govern.",
  example: capacitorBankVoltageRiseExample.inputs,
  fields: [
    { key: "bank_kvar", label: "Bank rating (kVAR)", kind: "number", default: 600 },
    { key: "line_voltage_kv", label: "Line-to-line system voltage (kV)", kind: "number", default: 12.47 },
    { key: "reactance_to_source_ohm", label: "Line reactance, source to bank (ohm)", kind: "number", default: 2.4 },
    { key: "peak_load_voltage_v", label: "Pre-switching voltage at peak load (V on a 120 V base)", kind: "number", default: 118 },
    { key: "light_load_voltage_v", label: "Pre-switching voltage at light load (V on a 120 V base)", kind: "number", default: 124 },
    { key: "upper_limit_v", label: "Upper voltage limit (V on a 120 V base)", kind: "number", default: 126 },
  ],
  outputs: [
    { key: "p", id: "cbv-out-p", label: "Voltage rise", value: (r) => fmt(r.rise_pct, 2) + "% -- " + fmt(r.rise_volts_120_base, 2) + " V on a 120 V base, a bit over one regulator tap step" },
    { key: "v", id: "cbv-out-v", label: "At light load", value: (r) => r.verdict },
    { key: "k", id: "cbv-out-k", label: "At peak load", value: (r) => fmt(r.peak_load_result_v, 2) + " V, " + (r.within_limit_peak ? "inside" : "OVER") + " the " + fmt(r.upper_limit_v, 1) + " V limit -- the condition the bank was sized for, and not the one that binds" },
    { key: "i", id: "cbv-out-i", label: "Leading current the bank draws", value: (r) => fmt(r.leading_current_a, 2) + " A" },
    { key: "m", id: "cbv-out-m", label: "Largest fixed bank that fits", value: (r) => fmt(r.max_bank_kvar, 0) + " kVAR at this location, judged at light load. Anything larger has to be switched" },
    { key: "n", id: "cbv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCapacitorBankVoltageRise,
});

// ============ spec-v1463: step voltage regulator tap and bandwidth ============

// dims: in { base_voltage_v: M L^2 T^-3 I^-1, bandwidth_v: M L^2 T^-3 I^-1, tap_position: dimensionless, load_current_a: I, power_factor: dimensionless, ldc_r_volts: M L^2 T^-3 I^-1, ldc_x_volts: M L^2 T^-3 I^-1, ct_rating_a: I } out: { volts_per_step: M L^2 T^-3 I^-1, bandwidth_steps: dimensionless, band_half_v: M L^2 T^-3 I^-1, full_range_v: M L^2 T^-3 I^-1, output_voltage_v: M L^2 T^-3 I^-1, simulated_drop_v: M L^2 T^-3 I^-1 }
export function computeRegulatorTapBandwidth({ base_voltage_v = 120, bandwidth_v = 0, tap_position = 0, load_current_a = 0, power_factor = 0.9, ldc_r_volts = 0, ldc_x_volts = 0, ct_rating_a = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(base_voltage_v > 0)) return { error: "Base voltage must be positive (V)." };
  if (!(bandwidth_v > 0)) return { error: "Bandwidth must be positive (V)." };
  if (!(Math.abs(tap_position) <= 16)) return { error: "Tap position must be between -16 and +16 -- an ANSI regulator has 32 steps." };
  if (load_current_a < 0) return { error: "Load current cannot be negative (A)." };
  if (!(power_factor > 0 && power_factor <= 1)) return { error: "Power factor must be greater than zero and no more than one." };
  if (ldc_r_volts < 0 || ldc_x_volts < 0) return { error: "Line drop compensation settings cannot be negative (V)." };
  if (ct_rating_a < 0) return { error: "CT rating cannot be negative (A)." };
  if (load_current_a > 0 && !(ct_rating_a > 0)) return { error: "Enter the CT rating to scale the line drop compensation to the load current." };
  // ANSI ranging: 32 steps of 5/8 of one percent, plus or minus 10 percent.
  const volts_per_step = 0.00625 * base_voltage_v;
  const bandwidth_steps = bandwidth_v / volts_per_step;
  const hunting_risk = bandwidth_steps <= 1;
  const band_half_v = bandwidth_v / 2;
  const full_range_v = 16 * volts_per_step;
  const full_range_pct = 10;
  const output_voltage_v = base_voltage_v * (1 + 0.00625 * tap_position);
  const tap_change_v = output_voltage_v - base_voltage_v;
  // Line drop compensation. The R and X dials are in volts at RATED CT
  // secondary current, so the simulated drop scales with the current ratio.
  const current_ratio = ct_rating_a > 0 ? load_current_a / ct_rating_a : 0;
  const sin_phi = Math.sqrt(Math.max(0, 1 - power_factor * power_factor));
  const simulated_drop_v = current_ratio * (ldc_r_volts * power_factor + ldc_x_volts * sin_phi);
  const terminal_for_set_point_v = output_voltage_v + simulated_drop_v;
  const outs = [volts_per_step, bandwidth_steps, band_half_v, full_range_v, output_voltage_v, simulated_drop_v];
  if (!outs.every(Number.isFinite)) return { error: "Regulator tap math is not a finite value." };
  const verdict = hunting_risk
    ? "HUNTING RISK: " + fmt(bandwidth_steps, 2) + " tap steps of bandwidth is at or below one step, so a correction overshoots out the far side of the deadband and has to come straight back. Widen it to at least " + fmt(volts_per_step * 1.5, 2) + " V"
    : "OK: " + fmt(bandwidth_steps, 2) + " tap steps of bandwidth, inside the usual 1.5 to 2 step practice at " + fmt(volts_per_step, 3) + " V per step";
  return {
    base_voltage_v, bandwidth_v, tap_position, volts_per_step, bandwidth_steps, hunting_risk,
    band_half_v, full_range_v, full_range_pct, output_voltage_v, tap_change_v,
    load_current_a, ct_rating_a, current_ratio, power_factor, sin_phi,
    ldc_r_volts, ldc_x_volts, simulated_drop_v, terminal_for_set_point_v, verdict,
    note: "A step voltage regulator has three settings that interact -- set voltage, bandwidth, and time delay -- and getting them wrong produces either a feeder that sags at the end or a tap changer that wears itself out. An ANSI regulator ranges over 32 steps of five-eighths of one percent each, plus or minus ten percent, so on a 120 V base one step is 0.750 V and the full range is 12.0 V. THE BANDWIDTH IS A DEADBAND, not a target: the control does nothing while the sensed voltage stays inside it and moves one tap when it leaves. The first hard rule is that the bandwidth must exceed one tap step. A deadband narrower than the regulator's own correction means every operation overshoots out the far side and has to come straight back, which is hunting, and it spends a tap changer's rated operations in a fraction of its life. Ordinary practice is about one and a half to two steps, which on a 120 V base is a bandwidth somewhere near 1.5 to 2.0 V. Line drop compensation makes the regulator hold voltage at a point out on the feeder rather than at its own terminals, by subtracting a synthetic drop proportional to load current so the control sees what the regulation point sees. The R and X dials are in volts at rated CT secondary current and they encode the impedance out to that point, so the simulated drop reported here scales with the ratio of actual current to CT rating and with the load power factor. Set them too high and the regulator overcorrects at peak; set them to zero and the far end of the feeder sags exactly as far as the line drops. One single-phase regulator, steady state, ANSI 32-step ranging. It does not set the time delay, which is the third setting and the one that coordinates cascaded regulators and a regulator against a switched capacitor -- a downstream device must be slower than the upstream one or they fight each other. It does not derive the R and X settings from the impedance to the regulation point, which is where they should come from, and it does not produce a feeder voltage profile. Reverse power flow from distributed generation behind the regulator breaks the compensation logic entirely and needs a reverse-sensing mode this knows nothing about. ANSI C57.15, IEEE 1783, the regulator manufacturer's control manual, and the utility's voltage regulation practice govern.",
  };
}
const regulatorTapBandwidthExample = { inputs: { base_voltage_v: 120, bandwidth_v: 2.0, tap_position: 6, load_current_a: 200, power_factor: 0.9, ldc_r_volts: 3, ldc_x_volts: 6, ct_rating_a: 200 } };
LINEWORKER_RENDERERS["regulator-tap-bandwidth"] = _simpleRenderer({
  citation: "Citation: ANSI 32-step regulator ranging by name -- 32 steps of 5/8 of one percent, plus or minus 10 percent, so volts per step = 0.00625 x base voltage -- with ANSI C57.15 named, and the line drop compensation relation drop = (I / CT rating) x (R x cos phi + X x sin phi) with the R and X dials in volts at rated CT secondary current. The bandwidth-above-one-step rule is reported as a computed verdict rather than assumed. ANSI C57.15, IEEE 1783, the regulator manufacturer's control manual, and the utility's voltage regulation practice govern.",
  example: regulatorTapBandwidthExample.inputs,
  fields: [
    { key: "base_voltage_v", label: "Base voltage (V)", kind: "number", default: 120 },
    { key: "bandwidth_v", label: "Bandwidth (V)", kind: "number", default: 2.0 },
    { key: "tap_position", label: "Tap position (-16 to +16)", kind: "number", default: 6, attrs: { step: "any", min: "-16", max: "16" } },
    { key: "load_current_a", label: "Load current (A)", kind: "number", default: 200 },
    { key: "power_factor", label: "Load power factor (0 to 1)", kind: "number", default: 0.9 },
    { key: "ldc_r_volts", label: "Line drop compensation R (V at rated CT current)", kind: "number", default: 3 },
    { key: "ldc_x_volts", label: "Line drop compensation X (V at rated CT current)", kind: "number", default: 6 },
    { key: "ct_rating_a", label: "CT rating (A)", kind: "number", default: 200 },
  ],
  outputs: [
    { key: "s", id: "rtb-out-s", label: "Volts per tap step", value: (r) => fmt(r.volts_per_step, 3) + " V -- full range " + fmt(r.full_range_v, 2) + " V either way, which is the " + fmt(r.full_range_pct, 0) + "% an ANSI regulator ranges over" },
    { key: "b", id: "rtb-out-b", label: "Bandwidth check", value: (r) => r.verdict },
    { key: "d", id: "rtb-out-d", label: "The deadband", value: (r) => "plus or minus " + fmt(r.band_half_v, 2) + " V around the set voltage" },
    { key: "o", id: "rtb-out-o", label: "Output at this tap", value: (r) => fmt(r.output_voltage_v, 2) + " V, " + (r.tap_change_v >= 0 ? "up " : "down ") + fmt(Math.abs(r.tap_change_v), 2) + " V from base at tap " + fmt(r.tap_position, 0) },
    { key: "l", id: "rtb-out-l", label: "Line drop compensation", value: (r) => r.simulated_drop_v === 0 ? "no compensation (zero current or zero settings) -- the far end sags exactly as far as the line drops" : fmt(r.simulated_drop_v, 2) + " V of simulated drop at " + fmt(r.current_ratio, 2) + "x rated CT current, so the regulator holds its terminals " + fmt(r.simulated_drop_v, 2) + " V high to keep the regulation point on target" },
    { key: "n", id: "rtb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRegulatorTapBandwidth,
});

// ============ spec-v1464: recloser-to-fuse coordination screen ============

// dims: in { fault_current_a: I, fast_curve_s: T, slow_curve_s: T, fuse_min_melt_s: T, fuse_total_clear_s: T, heating_factor: dimensionless, system_frequency_hz: T^-1 } out: { heated_fast_s: T, coordination_ratio: dimensionless, margin_s: T, margin_cycles: dimensionless, longest_fast_curve_s: T, blowing_margin_s: T }
export function computeRecloserFuseCoordination({ fault_current_a = 0, fast_curve_s = 0, slow_curve_s = 0, fuse_min_melt_s = 0, fuse_total_clear_s = 0, heating_factor = 1.35, system_frequency_hz = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fault_current_a > 0)) return { error: "Fault current at the branch must be positive (A)." };
  if (!(fast_curve_s > 0)) return { error: "The recloser fast-curve time must be positive (s)." };
  if (!(slow_curve_s > 0)) return { error: "The recloser slow-curve time must be positive (s)." };
  if (!(fuse_min_melt_s > 0)) return { error: "Fuse minimum-melt time must be positive (s)." };
  if (!(fuse_total_clear_s > 0)) return { error: "Fuse total-clearing time must be positive (s)." };
  if (!(heating_factor >= 1)) return { error: "The fuse heating factor cannot be below one -- the element retains heat between operations, it does not shed extra." };
  if (!(system_frequency_hz > 0)) return { error: "System frequency must be positive (Hz)." };
  if (!(fuse_total_clear_s >= fuse_min_melt_s)) return { error: "Total clearing time cannot be shorter than minimum melt for the same fuse." };
  const heated_fast_s = fast_curve_s * heating_factor;
  const coordination_ratio = fuse_min_melt_s / heated_fast_s;
  const fuse_saving_holds = coordination_ratio > 1;
  const margin_s = fuse_min_melt_s - heated_fast_s;
  const margin_cycles = margin_s * system_frequency_hz;
  // The other end of the band: the fuse-blowing scheme wants the fuse to
  // clear entirely before the recloser's slow curve operates.
  const fuse_blowing_holds = fuse_total_clear_s < slow_curve_s;
  const blowing_margin_s = slow_curve_s - fuse_total_clear_s;
  const blowing_margin_cycles = blowing_margin_s * system_frequency_hz;
  // The longest fast curve that would still coordinate, and the headroom as a
  // multiple, so a crew can see how much room the setting actually has.
  const longest_fast_curve_s = fuse_min_melt_s / heating_factor;
  const outs = [heated_fast_s, coordination_ratio, margin_s, margin_cycles, longest_fast_curve_s, blowing_margin_s];
  if (!outs.every(Number.isFinite)) return { error: "Coordination-screen math is not a finite value." };
  const verdict = fuse_saving_holds
    ? "FUSE SAVING HOLDS at " + fmt(fault_current_a, 0) + " A: the heated fast curve at " + fmt(heated_fast_s, 4) + " s clears " + fmt(margin_s, 4) + " s -- " + fmt(margin_cycles, 2) + " cycles -- ahead of minimum melt"
    : "FUSE SAVING FAILS at " + fmt(fault_current_a, 0) + " A: the heated fast curve at " + fmt(heated_fast_s, 4) + " s is " + fmt(-margin_s, 4) + " s PAST minimum melt, so the fuse is damaged or blown by the fast operation";
  const blowing_verdict = fuse_blowing_holds
    ? "FUSE BLOWING HOLDS: total clear " + fmt(fuse_total_clear_s, 3) + " s beats the slow curve at " + fmt(slow_curve_s, 3) + " s by " + fmt(blowing_margin_s, 3) + " s"
    : "FUSE BLOWING FAILS: total clear " + fmt(fuse_total_clear_s, 3) + " s is not inside the slow curve at " + fmt(slow_curve_s, 3) + " s, so the recloser locks out on a branch fault";
  return {
    fault_current_a, fast_curve_s, slow_curve_s, fuse_min_melt_s, fuse_total_clear_s,
    heating_factor, system_frequency_hz, heated_fast_s, coordination_ratio,
    fuse_saving_holds, margin_s, margin_cycles, fuse_blowing_holds,
    blowing_margin_s, blowing_margin_cycles, longest_fast_curve_s, verdict, blowing_verdict,
    note: "A recloser's fast curve is supposed to clear a temporary fault before the branch fuse melts, so a tree limb costs nobody a fuse change. Whether it does is a comparison of two published curves at one fault current, and the multiplier that makes the comparison honest is the part crews get wrong. Fuse saving works when the fast-curve time, MULTIPLIED BY A HEATING FACTOR that accounts for the element retaining heat between operations, still sits below the fuse's minimum-melt time at the maximum fault current on the branch. Two fast operations heat the element more than one, which is why the factor rises with the number of fast shots -- roughly 1.2 for one and 1.35 for two are the figures in common use, and both are entered here rather than assumed, because they belong to the fuse family. A comparison made without the factor looks comfortable and is not. The band is bounded at BOTH ends and that is the part missed. Coordination holds only between the minimum fault current where the fuse still clears inside the recloser's slow curve and the maximum fault current where the heated fast curve still beats minimum melt. Outside that window the scheme does not work, and on a modern feeder with high available fault current at the head, the upper bound often falls inside the zone the scheme is supposed to protect. Both ends are therefore screened here: the fuse-saving check against minimum melt and the fuse-blowing check of total clearing against the slow curve. The margin is reported in cycles as well as seconds because that is the unit protection people argue in. This is a comparison of times a reader takes off the published time-current characteristics at one current. NO CURVE DATA IS SHIPPED -- recloser and fuse curves are manufacturer publications that change, and a copy would go stale silently -- and it does not sweep the current range to find where coordination begins and ends, which is what a protection study does. It ignores asymmetry, pre-loading of the fuse by load current, ambient temperature, and fuse damage curves distinct from minimum melt, and it says nothing about sectionalizers downstream, substation relays upstream, or distributed generation changing the current the fuse actually sees. A screen, not a study: the manufacturer's time-current curves, IEEE C37.230, and the utility's protection engineer govern.",
  };
}
const recloserFuseCoordinationExample = { inputs: { fault_current_a: 1200, fast_curve_s: 0.045, slow_curve_s: 0.4, fuse_min_melt_s: 0.08, fuse_total_clear_s: 0.14, heating_factor: 1.35, system_frequency_hz: 60 } };
LINEWORKER_RENDERERS["recloser-fuse-coordination"] = _simpleRenderer({
  citation: "Citation: the fuse-saving coordination criterion by name -- heated fast-curve time = fast curve x fuse heating factor, which must stay below the fuse minimum-melt time, with the fuse-blowing criterion that total clearing must beat the slow curve -- and IEEE C37.230 named. Heating factors near 1.2 for one fast operation and 1.35 for two are in common use and are ENTERED, not assumed. NO RECLOSER OR FUSE CURVE DATA IS SHIPPED: both times are read off the manufacturer's published time-current characteristics at the fault current in question. A screen, not a protection study. The manufacturer's curves, IEEE C37.230, and the utility's protection engineer govern.",
  example: recloserFuseCoordinationExample.inputs,
  fields: [
    { key: "fault_current_a", label: "Fault current at the branch (A)", kind: "number", default: 1200 },
    { key: "fast_curve_s", label: "Recloser fast-curve time at that current (s)", kind: "number", default: 0.045 },
    { key: "slow_curve_s", label: "Recloser slow-curve time at that current (s)", kind: "number", default: 0.4 },
    { key: "fuse_min_melt_s", label: "Fuse minimum-melt time at that current (s)", kind: "number", default: 0.08 },
    { key: "fuse_total_clear_s", label: "Fuse total-clearing time at that current (s)", kind: "number", default: 0.14 },
    { key: "heating_factor", label: "Fuse heating factor (1.2 one fast shot, 1.35 two)", kind: "number", default: 1.35 },
    { key: "system_frequency_hz", label: "System frequency (Hz)", kind: "number", default: 60 },
  ],
  outputs: [
    { key: "h", id: "rfc-out-h", label: "Heated fast-curve time", value: (r) => fmt(r.heated_fast_s, 4) + " s -- " + fmt(r.fast_curve_s, 4) + " s multiplied by the " + fmt(r.heating_factor, 2) + " heating factor" },
    { key: "c", id: "rfc-out-c", label: "Coordination ratio", value: (r) => fmt(r.coordination_ratio, 2) + " against minimum melt" },
    { key: "v", id: "rfc-out-v", label: "Fuse saving", value: (r) => r.verdict },
    { key: "b", id: "rfc-out-b", label: "Fuse blowing", value: (r) => r.blowing_verdict },
    { key: "l", id: "rfc-out-l", label: "Longest fast curve that still coordinates", value: (r) => fmt(r.longest_fast_curve_s, 4) + " s at this current and this heating factor" },
    { key: "n", id: "rfc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRecloserFuseCoordination,
});

// ============ spec-v1465: distribution feeder I2R loss and loss factor ============

// dims: in { peak_current_a: I, resistance_ohm_per_mile: M L^2 T^-3 I^-2, length_miles: L, load_factor: dimensionless, energy_cost_per_kwh: dimensionless, peak_demand_kw: M L^2 T^-3 } out: { total_resistance_ohm: M L^2 T^-3 I^-2, peak_loss_kw: M L^2 T^-3, loss_factor: dimensionless, annual_loss_kwh: M L^2 T^-2, annual_cost: dimensionless, loss_percent_of_delivered: dimensionless }
export function computeFeederLossLoadFactor({ peak_current_a = 0, resistance_ohm_per_mile = 0, length_miles = 0, load_factor = 0, energy_cost_per_kwh = 0, peak_demand_kw = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(peak_current_a > 0)) return { error: "Peak current per phase must be positive (A)." };
  if (!(resistance_ohm_per_mile > 0)) return { error: "Conductor resistance must be positive (ohm per mile)." };
  if (!(length_miles > 0)) return { error: "Feeder length must be positive (miles)." };
  if (!(load_factor > 0 && load_factor <= 1)) return { error: "Load factor must be greater than zero and no more than one." };
  if (energy_cost_per_kwh < 0) return { error: "Energy cost cannot be negative." };
  if (peak_demand_kw < 0) return { error: "Peak demand cannot be negative (kW)." };
  const HOURS_PER_YEAR = 8760;
  const total_resistance_ohm = resistance_ohm_per_mile * length_miles;
  const peak_loss_kw = 3 * peak_current_a * peak_current_a * total_resistance_ohm / 1000;
  // The standard 0.3 / 0.7 blend between the two bounds. A perfectly flat
  // load loses at the load factor; a load that is either at peak or off
  // loses at its square; every real load sits between them.
  const loss_factor = 0.3 * load_factor + 0.7 * load_factor * load_factor;
  const annual_loss_kwh = peak_loss_kw * loss_factor * HOURS_PER_YEAR;
  const annual_cost = annual_loss_kwh * energy_cost_per_kwh;
  const peak_all_year_kwh = peak_loss_kw * HOURS_PER_YEAR;
  const using_load_factor_kwh = peak_loss_kw * load_factor * HOURS_PER_YEAR;
  const peak_overstatement_x = annual_loss_kwh > 0 ? peak_all_year_kwh / annual_loss_kwh : null;
  const load_factor_overstatement_pct = annual_loss_kwh > 0 ? (using_load_factor_kwh / annual_loss_kwh - 1) * 100 : null;
  const delivered_kwh = peak_demand_kw > 0 ? peak_demand_kw * load_factor * HOURS_PER_YEAR : null;
  const loss_percent_of_delivered = delivered_kwh > 0 ? annual_loss_kwh / delivered_kwh * 100 : null;
  const outs = [total_resistance_ohm, peak_loss_kw, loss_factor, annual_loss_kwh, annual_cost];
  if (!outs.every(Number.isFinite)) return { error: "Feeder loss math is not a finite value." };
  return {
    peak_current_a, total_resistance_ohm, peak_loss_kw, load_factor, loss_factor,
    annual_loss_kwh, annual_cost, energy_cost_per_kwh, peak_all_year_kwh,
    using_load_factor_kwh, peak_overstatement_x, load_factor_overstatement_pct,
    delivered_kwh, loss_percent_of_delivered, hours_per_year: HOURS_PER_YEAR,
    note: "Feeder losses are not average current squared times resistance, and the gap is wide enough to change a decision. Loss is quadratic in current while the current varies all day, so the average of the square is not the square of the average, and the ratio between them is the LOSS FACTOR. It is bounded at both ends by quantities anyone can name: a perfectly flat load loses at its load factor, a load that is either at peak or entirely off loses at the square of it, and every real load sits between. The long-standing utility approximation blends the two as 0.3 times load factor plus 0.7 times its square, and that blend is what turns a peak loss into an annual energy. Take the peak loss for all 8,760 hours and the answer comes out several times too high; use the load factor alone and it is still tens of percent high. The practical consequence cuts in a direction people do not expect. A feeder with a poor load factor loses much LESS energy than its peak loss suggests, which means the savings from reconductoring, from moving a capacitor bank, or from balancing phases are smaller than a peak-based estimate promises. The economic case for any of them has to be built on the loss factor, not on the peak, and a payback computed the other way will not arrive. Conductor loss on one balanced three-phase feeder with the load treated as CONCENTRATED AT THE FAR END. A real feeder has load distributed along it, and for a uniformly distributed load the effective loss is about a third of the concentrated value -- a correction large enough to matter and one this does not apply, so read the answer as an upper bound unless the load genuinely is at the end. It does not include transformer core and copper losses, which on a distribution system are usually the larger share of total losses, nor neutral, secondary, or service losses, nor unbalance, nor the temperature dependence of the conductor's own resistance. The 0.3 and 0.7 coefficients are a widely used approximation rather than a measurement, and utilities carry their own. The utility's loss study and its metered load data govern.",
  };
}
const feederLossLoadFactorExample = { inputs: { peak_current_a: 180, resistance_ohm_per_mile: 0.29, length_miles: 4.2, load_factor: 0.55, energy_cost_per_kwh: 0.09, peak_demand_kw: 3887 } };
LINEWORKER_RENDERERS["feeder-loss-load-factor"] = _simpleRenderer({
  citation: "Citation: the three-phase I2R loss relation and the standard distribution loss-factor approximation by name -- loss factor = 0.3 x load factor + 0.7 x load factor squared, bounded below by the square and above by the load factor itself -- applied over 8,760 hours. The coefficients are a widely used approximation, not a measurement, and utilities carry their own. Load treated as concentrated at the far end, so the answer is an upper bound. The utility's loss study and metered load data govern.",
  example: feederLossLoadFactorExample.inputs,
  fields: [
    { key: "peak_current_a", label: "Peak current per phase (A)", kind: "number", default: 180 },
    { key: "resistance_ohm_per_mile", label: "Conductor resistance (ohm per mile)", kind: "number", default: 0.29 },
    { key: "length_miles", label: "Feeder length (miles)", kind: "number", default: 4.2 },
    { key: "load_factor", label: "Load factor (0 to 1)", kind: "number", default: 0.55 },
    { key: "energy_cost_per_kwh", label: "Energy cost per kWh", kind: "number", default: 0.09 },
    { key: "peak_demand_kw", label: "Feeder peak demand (kW, 0 to skip the loss percentage)", kind: "number", default: 3887 },
  ],
  outputs: [
    { key: "r", id: "flf-out-r", label: "Total resistance", value: (r) => fmt(r.total_resistance_ohm, 3) + " ohms" },
    { key: "p", id: "flf-out-p", label: "Peak loss", value: (r) => fmt(r.peak_loss_kw, 2) + " kW at " + fmt(r.peak_current_a, 0) + " A per phase" },
    { key: "l", id: "flf-out-l", label: "Loss factor", value: (r) => fmt(r.loss_factor, 3) + " from a load factor of " + fmt(r.load_factor, 2) },
    { key: "e", id: "flf-out-e", label: "Annual loss energy", value: (r) => fmt(r.annual_loss_kwh, 0) + " kWh a year" + (r.energy_cost_per_kwh > 0 ? ", " + fmt(r.annual_cost, 0) + " at the entered price" : "") },
    { key: "c", id: "flf-out-c", label: "What the shortcuts would have said", value: (r) => "peak loss for all 8,760 hours reads " + fmt(r.peak_all_year_kwh, 0) + " kWh, " + fmt(r.peak_overstatement_x, 1) + "x too high; the load factor alone reads " + fmt(r.using_load_factor_kwh, 0) + " kWh, still " + fmt(r.load_factor_overstatement_pct, 0) + "% high" },
    { key: "d", id: "flf-out-d", label: "Share of energy delivered", value: (r) => r.loss_percent_of_delivered === null ? "(no peak demand entered)" : fmt(r.loss_percent_of_delivered, 2) + "% of the " + fmt(r.delivered_kwh, 0) + " kWh this feeder delivers in a year" },
    { key: "n", id: "flf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFeederLossLoadFactor,
});

// ============ spec-v1466: watt-hour meter CT / PT multiplier ============

// dims: in { ct_primary_a: I, ct_secondary_a: I, pt_primary_v: M L^2 T^-3 I^-1, pt_secondary_v: M L^2 T^-3 I^-1, register_constant: dimensionless, register_reading_kwh: M L^2 T^-2, demand_register_kw: M L^2 T^-3, service_voltage_kv: M L^2 T^-3 I^-1 } out: { ct_ratio: dimensionless, pt_ratio: dimensionless, multiplier: dimensionless, billed_kwh: M L^2 T^-2, implied_demand_kw: M L^2 T^-3, implied_current_a: I }
export function computeMeterCtPtMultiplier({ ct_primary_a = 0, ct_secondary_a = 5, pt_primary_v = 0, pt_secondary_v = 120, register_constant = 1, register_reading_kwh = 0, demand_register_kw = 0, service_voltage_kv = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ct_primary_a > 0)) return { error: "CT primary rating must be positive (A)." };
  if (!(ct_secondary_a > 0)) return { error: "CT secondary rating must be positive (A)." };
  if (!(pt_primary_v > 0)) return { error: "PT primary rating must be positive (V)." };
  if (!(pt_secondary_v > 0)) return { error: "PT secondary rating must be positive (V)." };
  if (!(register_constant > 0)) return { error: "The register constant must be positive." };
  if (register_reading_kwh < 0) return { error: "Register reading cannot be negative (kWh)." };
  if (demand_register_kw < 0) return { error: "Demand register reading cannot be negative (kW)." };
  if (service_voltage_kv < 0) return { error: "Service voltage cannot be negative (kV)." };
  const ct_ratio = ct_primary_a / ct_secondary_a;
  const pt_ratio = pt_primary_v / pt_secondary_v;
  const multiplier = ct_ratio * pt_ratio * register_constant;
  const billed_kwh = register_reading_kwh * multiplier;
  const implied_demand_kw = demand_register_kw * multiplier;
  // The dimensional check that catches a wrong multiplier: turn the metered
  // demand into a primary current and hold it against the CT that is supposed
  // to be carrying it. A multiplier off by a factor of two puts the implied
  // load somewhere the installation physically cannot go.
  const implied_current_a = (demand_register_kw > 0 && service_voltage_kv > 0)
    ? implied_demand_kw * 1000 / (Math.sqrt(3) * service_voltage_kv * 1000)
    : null;
  const ct_utilization_pct = implied_current_a === null ? null : implied_current_a / ct_primary_a * 100;
  const within_ct_rating = implied_current_a === null ? null : implied_current_a <= ct_primary_a;
  const outs = [ct_ratio, pt_ratio, multiplier, billed_kwh, implied_demand_kw];
  if (!outs.every(Number.isFinite)) return { error: "Metering multiplier math is not a finite value." };
  const verdict = within_ct_rating === null
    ? "Enter a demand register reading and the service voltage to run the plausibility check."
    : within_ct_rating
      ? "PLAUSIBLE: the implied " + fmt(implied_current_a, 1) + " A is " + fmt(ct_utilization_pct, 0) + "% of the " + fmt(ct_primary_a, 0) + " A CT primary, which is a load this installation can actually carry"
      : "NOT PLAUSIBLE: the implied " + fmt(implied_current_a, 1) + " A is " + fmt(ct_utilization_pct, 0) + "% of the " + fmt(ct_primary_a, 0) + " A CT primary. A CT does not pass " + fmt(ct_utilization_pct / 100, 2) + " times its rating in normal service, so the multiplier, the CT record, or the register reading is wrong -- and this is exactly the discrepancy the check exists to surface";
  return {
    ct_primary_a, ct_secondary_a, pt_primary_v, pt_secondary_v, register_constant,
    ct_ratio, pt_ratio, multiplier, register_reading_kwh, billed_kwh,
    demand_register_kw, implied_demand_kw, implied_current_a, ct_utilization_pct,
    within_ct_rating, service_voltage_kv, verdict,
    note: "A transformer-rated meter does not read energy, it reads a scaled fraction of it, and the multiplier that converts the register to real kilowatt-hours is the product of two instrument transformer ratios and a register constant. The multiplier is a pure product, and that is exactly why it goes wrong: swapping a 200:5 current transformer for a 400:5 during a load upgrade doubles the correct multiplier, and if the billing record is not changed with it the customer is billed half, indefinitely. The same happens with a potential transformer changed on a voltage conversion. Neither error announces itself, because the meter keeps working and the register keeps advancing -- there is nothing to see in the field, and a billing error of this kind commonly runs for years in either direction before anyone catches it. THE CHECK THAT CATCHES IT IS DIMENSIONAL RATHER THAN CLERICAL. Take the metered demand, multiply it out to the primary, turn it into a current at the service voltage, and hold that current against the current transformer that is supposed to be carrying it. A multiplier off by a factor of two puts the implied load somewhere the service physically cannot go, and the discrepancy shows up in one line of arithmetic rather than in an audit. A current transformer is not passing two or three times its primary rating in normal service, so an implied current above it means the multiplier, the CT record, or the reading is wrong. This is the multiplier arithmetic for a transformer-rated installation and the plausibility check on it. It does not verify instrument transformer accuracy class, burden, or polarity: a reversed CT polarity, or a current transformer paired with the wrong phase's potential transformer, produces a wrong reading that no multiplier fixes and that this cannot see. It does not detect a meter wired to the wrong phase, a shorted CT secondary, or a blown PT fuse, which are the field failures. Ratio-correction and phase-angle-correction factors from the instrument transformer test report are not applied, and transformer-loss compensation, used where the metering sits on the low side of a customer-owned transformer, is a separate adjustment. ANSI C12.1, the instrument transformer test reports, and the utility's metering standard govern.",
  };
}
const meterCtPtMultiplierExample = { inputs: { ct_primary_a: 200, ct_secondary_a: 5, pt_primary_v: 7200, pt_secondary_v: 120, register_constant: 1, register_reading_kwh: 1480, demand_register_kw: 4.1, service_voltage_kv: 12.47 } };
LINEWORKER_RENDERERS["meter-ct-pt-multiplier"] = _simpleRenderer({
  citation: "Citation: the transformer-rated metering multiplier relation by name -- multiplier = CT ratio x PT ratio x register constant, billed energy = register reading x multiplier -- with ANSI C12.1 named. The plausibility check turns the metered demand into an implied primary current at the entered service voltage and holds it against the CT primary rating. Accuracy class, burden, polarity, ratio-correction and phase-angle-correction factors, and transformer-loss compensation are not applied. ANSI C12.1, the instrument transformer test reports, and the utility's metering standard govern.",
  example: meterCtPtMultiplierExample.inputs,
  fields: [
    { key: "ct_primary_a", label: "CT primary rating (A)", kind: "number", default: 200 },
    { key: "ct_secondary_a", label: "CT secondary rating (A)", kind: "number", default: 5 },
    { key: "pt_primary_v", label: "PT primary rating (V)", kind: "number", default: 7200 },
    { key: "pt_secondary_v", label: "PT secondary rating (V)", kind: "number", default: 120 },
    { key: "register_constant", label: "Register constant", kind: "number", default: 1 },
    { key: "register_reading_kwh", label: "Register reading (kWh)", kind: "number", default: 1480 },
    { key: "demand_register_kw", label: "Demand register reading (kW, 0 to skip the check)", kind: "number", default: 4.1 },
    { key: "service_voltage_kv", label: "Service voltage, line to line (kV)", kind: "number", default: 12.47 },
  ],
  outputs: [
    { key: "r", id: "mcm-out-r", label: "The two ratios", value: (r) => "CT " + fmt(r.ct_ratio, 1) + " to 1, PT " + fmt(r.pt_ratio, 1) + " to 1" },
    { key: "m", id: "mcm-out-m", label: "Billing multiplier", value: (r) => fmt(r.multiplier, 1) + " -- CT ratio x PT ratio x a register constant of " + fmt(r.register_constant, 3) },
    { key: "b", id: "mcm-out-b", label: "Billed energy", value: (r) => fmt(r.billed_kwh, 0) + " kWh from a register reading of " + fmt(r.register_reading_kwh, 0) },
    { key: "d", id: "mcm-out-d", label: "Implied primary demand", value: (r) => fmt(r.implied_demand_kw, 0) + " kW" + (r.implied_current_a === null ? "" : ", which is " + fmt(r.implied_current_a, 1) + " A at " + fmt(r.service_voltage_kv, 2) + " kV three-phase") },
    { key: "p", id: "mcm-out-p", label: "Plausibility check", value: (r) => r.verdict },
    { key: "n", id: "mcm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMeterCtPtMultiplier,
});

// ============ spec-v1467: counterpoise and radial ground array resistance ============

// dims: in { soil_resistivity_ohm_cm: M L^3 T^-3 I^-2, length_ft: L, burial_depth_in: L, wire_diameter_in: L, radials: dimensionless, coupling_penalty: dimensionless, target_resistance_ohm: M L^2 T^-3 I^-2 } out: { single_wire_ohm: M L^2 T^-3 I^-2, array_ohm: M L^2 T^-3 I^-2, ideal_parallel_ohm: M L^2 T^-3 I^-2, coupling_cost_ohm: M L^2 T^-3 I^-2, length_for_target_ft: L }
export function computeCounterpoiseResistance({ soil_resistivity_ohm_cm = 0, length_ft = 0, burial_depth_in = 0, wire_diameter_in = 0, radials = 1, coupling_penalty = 1.5, target_resistance_ohm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(soil_resistivity_ohm_cm > 0)) return { error: "Soil resistivity must be positive (ohm-cm)." };
  if (!(length_ft > 0)) return { error: "Counterpoise length must be positive (ft)." };
  if (!(burial_depth_in > 0)) return { error: "Burial depth must be positive (in)." };
  if (!(wire_diameter_in > 0)) return { error: "Conductor diameter must be positive (in)." };
  if (!(radials >= 1)) return { error: "There must be at least one radial." };
  if (!(coupling_penalty >= 1)) return { error: "The mutual-coupling penalty cannot be below one -- radials interfere with each other, they do not help each other." };
  if (target_resistance_ohm < 0) return { error: "Target resistance cannot be negative (ohm)." };
  const CM_PER_FT = 30.48;
  const CM_PER_IN = 2.54;
  const d_cm = wire_diameter_in * CM_PER_IN;
  const h_cm = burial_depth_in * CM_PER_IN;
  // Horizontal buried electrode, Dwight form: the wire sheds current along its
  // whole length, so resistance falls roughly as one over length with a
  // logarithmic correction. That is a different length dependence from a
  // driven rod, where each extra foot reaches ground no less resistive.
  const singleWire = (Lft) => {
    const L_cm = Lft * CM_PER_FT;
    const logTerm = Math.log(2 * L_cm / Math.sqrt(d_cm * h_cm)) - 1;
    if (!(logTerm > 0)) return Number.NaN;
    return soil_resistivity_ohm_cm / (Math.PI * L_cm) * logTerm;
  };
  const single_wire_ohm = singleWire(length_ft);
  if (!Number.isFinite(single_wire_ohm)) return { error: "The wire is too short relative to its depth and diameter for the horizontal-electrode relation; lengthen it or check the units." };
  const penalty = radials > 1 ? coupling_penalty : 1;
  const ideal_parallel_ohm = single_wire_ohm / radials;
  const array_ohm = ideal_parallel_ohm * penalty;
  const coupling_cost_ohm = array_ohm - ideal_parallel_ohm;
  const double_length_ohm = singleWire(2 * length_ft);
  const doubling_improvement_x = Number.isFinite(double_length_ohm) && double_length_ohm > 0 ? single_wire_ohm / double_length_ohm : null;
  // Length per radial to reach a target, bisected on the same relation --
  // resistance falls monotonically with length, so a bracket and a halving
  // converge without a closed form.
  let length_for_target_ft = null;
  if (target_resistance_ohm > 0) {
    const arrayAt = (Lft) => {
      const R1 = singleWire(Lft);
      return Number.isFinite(R1) ? R1 / radials * penalty : Infinity;
    };
    let lo = 1, hi = Math.max(2 * length_ft, 10);
    for (let i = 0; i < 60 && arrayAt(hi) > target_resistance_ohm; i++) hi *= 2;
    if (arrayAt(hi) <= target_resistance_ohm) {
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (arrayAt(mid) > target_resistance_ohm) lo = mid; else hi = mid;
      }
      length_for_target_ft = (lo + hi) / 2;
    }
  }
  const meets_target = target_resistance_ohm > 0 ? array_ohm <= target_resistance_ohm : null;
  const outs = [single_wire_ohm, ideal_parallel_ohm, array_ohm, coupling_cost_ohm];
  if (!outs.every(Number.isFinite)) return { error: "Counterpoise math is not a finite value." };
  const verdict = meets_target === null
    ? "Enter a target resistance to size the wire."
    : meets_target
      ? "MEETS the " + fmt(target_resistance_ohm, 2) + " ohm target at " + fmt(array_ohm, 2) + " ohms"
      : "MISSES the " + fmt(target_resistance_ohm, 2) + " ohm target at " + fmt(array_ohm, 2) + " ohms" + (length_for_target_ft === null ? " -- no practical length reaches it in this soil, so lower the resistivity with treatment or add radials" : ", which wants " + fmt(length_for_target_ft, 0) + " ft per radial instead of " + fmt(length_ft, 0));
  return {
    soil_resistivity_ohm_cm, length_ft, burial_depth_in, wire_diameter_in, radials,
    coupling_penalty: penalty, single_wire_ohm, ideal_parallel_ohm, array_ohm,
    coupling_cost_ohm, double_length_ohm, doubling_improvement_x,
    target_resistance_ohm, length_for_target_ft, meets_target, verdict,
    note: "A driven rod is the standard electrode and in rock it is not an option. A transmission or distribution structure on a ridgeline, on frozen ground, or in shallow soil over bedrock is grounded with buried horizontal wire instead, and the counterpoise relation has a different length dependence from a rod's -- which is the whole reason to reach for it. A buried horizontal conductor sheds current along its entire length, so its resistance falls roughly as one over length with a logarithmic correction: DOUBLING A COUNTERPOISE NEARLY HALVES THE RESISTANCE, where doubling a driven rod barely helps, because each additional foot of rod reaches ground no less resistive than the last. Multiple radials do not divide the resistance by their count, and assuming they do is the ordinary way this gets oversold. Each wire sits in the others' potential field, so the current it sheds has to fight ground that its neighbours have already raised. The mutual-coupling penalty grows with the number of radials and shrinks as they are spread further apart, and it is ENTERED here rather than modeled, because it belongs to the length and spread of the particular array. That has a consequence worth stating plainly: comparing four long radials against eight short ones of the same total wire is only honest if each array is given ITS OWN penalty. Hold one penalty fixed across both and more radials win on paper every time, which is precisely the assumption that oversells a radial array in the field. Both numbers are reported -- the ideal parallel value and the coupled one -- so the penalty is visible rather than assumed away. Resistivity is read in ohm-cm, the same unit the driven-rod and four-pin resistivity calculations use, so two grounding answers for one structure cannot disagree about the dirt. A horizontal electrode in UNIFORM soil at power frequency. Soil is almost never uniform, and a two-layer structure -- conductive topsoil over rock, or the reverse -- changes the answer substantially; a four-pin survey run at several spacings is what reveals it, and one spacing does not. This gives power-frequency resistance and NOT the impulse impedance that governs lightning performance, which is lower than this for a short counterpoise and HIGHER for a long one, because a surge does not have time to reach the far end before the stroke is over. Seasonal variation with moisture and frost is large and is not modeled, and a resistivity measured in a wet spring is not the number the line lives with in February. It does not evaluate step and touch potential or ground potential rise, which are separate screens, and it does not size the conductor for fault current. IEEE 80, IEEE 81 for measurement, and the utility's grounding standard govern.",
  };
}
const counterpoiseResistanceExample = { inputs: { soil_resistivity_ohm_cm: 10000, length_ft: 100, burial_depth_in: 6, wire_diameter_in: 0.5, radials: 4, coupling_penalty: 1.5, target_resistance_ohm: 5 } };
LINEWORKER_RENDERERS["counterpoise-resistance"] = _simpleRenderer({
  citation: "Citation: the buried horizontal electrode (counterpoise) resistance relation by name -- R = rho / (pi L) x [ ln( 2L / sqrt(d x h) ) - 1 ] with rho in ohm-cm and L, d and h in centimetres -- with IEEE 80 and IEEE 81 named. Resistivity is read in ohm-cm to match the driven-rod and four-pin resistivity calculations. The mutual-coupling penalty for multiple radials is ENTERED, not modeled: it depends on radial length and spread. Power-frequency resistance in uniform soil, NOT impulse impedance. IEEE 80, IEEE 81 for measurement, and the utility's grounding standard govern.",
  example: counterpoiseResistanceExample.inputs,
  fields: [
    { key: "soil_resistivity_ohm_cm", label: "Soil resistivity (ohm-cm)", kind: "number", default: 10000 },
    { key: "length_ft", label: "Length of one radial (ft)", kind: "number", default: 100 },
    { key: "burial_depth_in", label: "Burial depth (in)", kind: "number", default: 6 },
    { key: "wire_diameter_in", label: "Conductor diameter (in)", kind: "number", default: 0.5 },
    { key: "radials", label: "Number of radials", kind: "number", default: 4 },
    { key: "coupling_penalty", label: "Mutual-coupling penalty (1 = none)", kind: "number", default: 1.5 },
    { key: "target_resistance_ohm", label: "Target resistance (ohm, 0 to skip)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "s", id: "cpr-out-s", label: "One radial on its own", value: (r) => fmt(r.single_wire_ohm, 2) + " ohms at " + fmt(r.length_ft, 0) + " ft" },
    { key: "a", id: "cpr-out-a", label: "The array as built", value: (r) => fmt(r.array_ohm, 2) + " ohms from " + fmt(r.radials, 0) + " radial" + (r.radials === 1 ? "" : "s") },
    { key: "i", id: "cpr-out-i", label: "What the coupling costs", value: (r) => "the ideal parallel value is " + fmt(r.ideal_parallel_ohm, 2) + " ohms, so the " + fmt(r.coupling_penalty, 2) + "x penalty adds " + fmt(r.coupling_cost_ohm, 2) + " ohms. Radials interfere; they do not simply divide" },
    { key: "d", id: "cpr-out-d", label: "Doubling the length", value: (r) => r.doubling_improvement_x === null ? "-" : fmt(r.double_length_ohm, 2) + " ohms at " + fmt(2 * r.length_ft, 0) + " ft -- " + fmt(r.doubling_improvement_x, 2) + "x better, which is the one-over-length behaviour a driven rod does not have" },
    { key: "t", id: "cpr-out-t", label: "Against the target", value: (r) => r.verdict },
    { key: "n", id: "cpr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCounterpoiseResistance,
});
