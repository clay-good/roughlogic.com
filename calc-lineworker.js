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
