// Group G: Air quality, emissions, and control equipment.
//
// spec-v1717..v1726 (scope-trade-expansion-2, the air quality band): stack
// emissions and the control equipment that reduces them, a trade the charter's
// keyword probe found at ZERO tiles. Two threads run through it. The first is
// that the REGULATORY number is rarely the one a plant tracks: potential to
// emit is computed at 8,760 hours whatever the plant actually runs, a coating's
// VOC is measured less water rather than as supplied, and an opacity finding is
// a six-minute average rather than the worst moment anyone saw. The second is
// that the control equipment is governed by exponentials and expansions that
// make intuition unreliable -- the Deutsch equation, the threefold gas expansion
// in a thermal oxidizer, and the cliff at a carbon bed's breakthrough.
//
// Every tile is a screen. The permit, the applicable subpart, and a qualified
// air quality professional govern; none of this is a compliance determination.

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

// Compact renderer factory, copied verbatim from calc-masonry.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _aqRender = function (inputRegion, outputRegion, citationEl) {
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

  _aqRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _aqRender;
}


export const AIRQUALITY_RENDERERS = {};

// Unit constants, each with a leading-underscore name of its own.
//
// Exact by definition: the short ton is 2,000 lb; the US gallon is 231 cubic
// inches; a foot is 0.3048 m and a mile 1,609.344 m, both exact.
const _AQ_LB_PER_TON = 2000;
const _AQ_GAL_PER_CUFT = 1728 / 231;
const _AQ_M_PER_FT = 0.3048;
const _AQ_MPS_PER_MPH = 1609.344 / 3600;
const _AQ_RANKINE_OFFSET = 459.67;
const _AQ_KELVIN_PER_RANKINE = 5 / 9;
// A non-leap year, which is the basis potential to emit is computed on.
const _AQ_HOURS_PER_YEAR = 8760;
// EPA Method 9: readings at 15-second intervals, 24 to a six-minute block.
const _AQ_READINGS_PER_BLOCK = 24;
// The customary pump constant, 33,000 ft-lb/min per hp over the 8.33 lb/gal
// water basis, and the exact mechanical horsepower.
const _AQ_PUMP_HP_CONST = 3960;
const _AQ_KW_PER_HP = 0.745699872;
// Briggs plume rise is published in SI, so the calculation converts into it:
// standard gravity, and the neutral-condition coefficients either side of the
// 55 m^4/s^3 buoyancy flux break.
const _AQ_G_SI = 9.80665;
const _AQ_BRIGGS_F_BREAK = 55;
const _AQ_BRIGGS_COEFF_LOW = 21.425;
const _AQ_BRIGGS_EXP_LOW = 0.75;
const _AQ_BRIGGS_COEFF_HIGH = 38.71;
const _AQ_BRIGGS_EXP_HIGH = 0.6;

// Fahrenheit to absolute, in both scales. Non-exported helpers above the first
// export, each returning an arithmetic expression rather than a bare
// identifier so check-render-output-keys reads the computes that call them.
const _aqRankine = (f) => f + _AQ_RANKINE_OFFSET;
const _aqKelvin = (f) => (f + _AQ_RANKINE_OFFSET) * _AQ_KELVIN_PER_RANKINE;

// =====================================================================
// spec-v1717: stack emission rate and potential to emit.
// =====================================================================
//
// The 8,760 hours is what surprises everyone: a source that runs one shift a
// day still has a potential to emit computed as though it ran every hour of
// the year at full capacity, because it COULD, absent an enforceable
// restriction. spec-v1717's worked example is an unfinished edit -- it starts
// at 5.5 lb/h, trails off mid-sentence, and restarts at 11.0 "for clarity".
// dims: in { hourly_rate_lb_h: M T^-1, actual_hours_per_year: T, permitted_hours_per_year: T, major_threshold_tpy: M T^-1, control_efficiency_pct: dimensionless } out: { actual_tpy: M T^-1, pte_tpy: M T^-1, pte_with_limit_tpy: M T^-1, hours_for_minor: T, controlled_rate_lb_h: M T^-1 }
export function computeStackEmissionPte({
  hourly_rate_lb_h = 0, actual_hours_per_year = 0, permitted_hours_per_year = 0,
  major_threshold_tpy = 100, control_efficiency_pct = 0, control_enforceable = "no",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hourly_rate_lb_h > 0)) return { error: "The uncontrolled hourly emission rate must be positive (lb/h)." };
  if (actual_hours_per_year < 0 || actual_hours_per_year > _AQ_HOURS_PER_YEAR) return { error: "Actual operating hours must be between 0 and 8,760." };
  if (permitted_hours_per_year < 0 || permitted_hours_per_year > _AQ_HOURS_PER_YEAR) return { error: "Permitted hours must be between 0 and 8,760." };
  if (!(major_threshold_tpy > 0)) return { error: "The major source threshold must be positive (tons per year)." };
  if (control_efficiency_pct < 0 || control_efficiency_pct >= 100) return { error: "Control efficiency must be at least 0 and below 100 percent." };
  // Control counts toward PTE only when its operation is federally
  // enforceable. An installed baghouse that no permit condition requires is
  // not a reduction in potential to emit, and that is not a technicality.
  const control_counts = control_enforceable === "yes" && control_efficiency_pct > 0;
  const controlled_rate_lb_h = control_counts ? hourly_rate_lb_h * (1 - control_efficiency_pct / 100) : hourly_rate_lb_h;
  const actual_tpy = controlled_rate_lb_h * actual_hours_per_year / _AQ_LB_PER_TON;
  const pte_tpy = controlled_rate_lb_h * _AQ_HOURS_PER_YEAR / _AQ_LB_PER_TON;
  const pte_ratio = actual_hours_per_year > 0 ? pte_tpy / actual_tpy : 0;
  const actual_is_major = actual_tpy >= major_threshold_tpy;
  const pte_is_major = pte_tpy >= major_threshold_tpy;
  const control_verdict = control_efficiency_pct <= 0
    ? "(no control efficiency entered)"
    : control_counts
      ? "the " + fmt(control_efficiency_pct, 1) + "% control is federally enforceable, so it reduces the rate to " + fmt(controlled_rate_lb_h, 2) + " lb/h for both figures"
      : "the " + fmt(control_efficiency_pct, 1) + "% control is NOT federally enforceable, so it does not reduce potential to emit at all -- equipment that is installed but not required by a permit condition counts for nothing here, which is the point people find hardest to accept";
  const status_verdict = pte_is_major && !actual_is_major
    ? "the source emits " + fmt(actual_tpy, 1) + " tons and its POTENTIAL to emit is " + fmt(pte_tpy, 1) + " tons -- actual emissions are comfortably minor against the " + fmt(major_threshold_tpy, 0) + " ton threshold and the potential is not, and it is potential that determines the permit"
    : pte_is_major
      ? "both actual and potential emissions are at or above the " + fmt(major_threshold_tpy, 0) + " ton threshold"
      : "potential to emit is " + fmt(pte_tpy, 1) + " tons, below the " + fmt(major_threshold_tpy, 0) + " ton threshold, so the source is a minor source without needing a limit";
  // The way out: a synthetic minor limit. The hours that would put potential
  // to emit exactly at the threshold, and what a stated permitted limit gives.
  const hours_for_minor = major_threshold_tpy * _AQ_LB_PER_TON / controlled_rate_lb_h;
  const has_permit_limit = permitted_hours_per_year > 0;
  const pte_with_limit_tpy = has_permit_limit ? controlled_rate_lb_h * permitted_hours_per_year / _AQ_LB_PER_TON : 0;
  const limit_makes_minor = has_permit_limit && pte_with_limit_tpy < major_threshold_tpy;
  const limit_verdict = !has_permit_limit
    ? (hours_for_minor >= _AQ_HOURS_PER_YEAR
      ? "no hours limit is needed: even at 8,760 hours the source stays under the threshold"
      : "a federally enforceable limit below " + fmt(hours_for_minor, 0) + " hours a year would make this a synthetic minor source -- the trade is that the limit is enforceable, with recordkeeping and reporting, and exceeding it is a violation rather than a busy month")
    : limit_makes_minor
      ? "a permitted " + fmt(permitted_hours_per_year, 0) + " hours gives a potential to emit of " + fmt(pte_with_limit_tpy, 1) + " tons, under the threshold -- a synthetic minor source"
      : "a permitted " + fmt(permitted_hours_per_year, 0) + " hours still gives " + fmt(pte_with_limit_tpy, 1) + " tons, at or above the threshold; the limit would have to fall below " + fmt(hours_for_minor, 0) + " hours to work";
  if (![actual_tpy, pte_tpy, pte_with_limit_tpy, hours_for_minor, controlled_rate_lb_h].every(Number.isFinite)) return { error: "Potential to emit math is not a finite value." };
  return {
    controlled_rate_lb_h, control_counts, control_verdict,
    actual_tpy, pte_tpy, pte_ratio, actual_is_major, pte_is_major, status_verdict,
    hours_for_minor, has_permit_limit, pte_with_limit_tpy, limit_makes_minor, limit_verdict,
    major_threshold_tpy,
    note: "A source's actual emissions and its POTENTIAL to emit, which are different numbers and which do different jobs. Actual emissions are what gets reported annually and what fees are based on. Potential to emit is the maximum capacity to emit, computed at 8,760 hours a year at full design capacity regardless of what the source actually runs -- and it is potential, not actual, that decides whether a source needs a major source permit. The 8,760 hours is what surprises everyone. A source running one shift a day, five days a week, still has a potential computed as though it ran every hour of the year, because it COULD absent an enforceable restriction. A boiler used only for winter heating has a potential based on year-round continuous firing, and a generator used for four hours of testing a month has one based on running continuously. The way out is a synthetic minor limit, and understanding it is the practical value of the concept: if the source accepts a federally enforceable permit condition limiting its hours, its throughput or its fuel, potential is recomputed against that limit, and a source that would be major at 8,760 hours becomes minor at a permitted fraction of it. The hours that would achieve that are reported here. The trade is real -- the limit is enforceable, it carries recordkeeping and reporting obligations, and exceeding it is a violation rather than a busy month. Control equipment counts only when its operation is federally enforceable, which is why that is a separate input rather than a percentage applied automatically. A baghouse that is installed but not required by any permit condition does not reduce potential to emit, because nothing obliges the source to run it. This is a screening calculation on an ENTERED hourly rate, which itself comes from an emission factor, a stack test, or a manufacturer's data and carries all of that uncertainty. It does not select the emission factor, apply the many source-category-specific rules for what counts toward potential, address fugitive emissions and which categories must include them, aggregate emission units into a single source, or determine applicability of any permitting program. The permit, the applicable subpart, the reviewing authority, and a qualified air quality professional govern.",
  };
}
export const stackEmissionPteExample = { inputs: { hourly_rate_lb_h: 11.0, actual_hours_per_year: 2000, permitted_hours_per_year: 0, major_threshold_tpy: 100, control_efficiency_pct: 0, control_enforceable: "no" } };
AIRQUALITY_RENDERERS["stack-emission-pte"] = _simpleRenderer({
  citation: "Citation: potential to emit as EPA's permitting programs define it -- the maximum capacity to emit at 8,760 hours a year at full design capacity, with control equipment and operational limits counted only where they are FEDERALLY ENFORCEABLE -- against actual emissions computed on the hours the source runs, at 2,000 lb per short ton (exact). The hourly rate is ENTERED from an emission factor, a stack test or manufacturer data. A screening calculation: it does not select the emission factor, apply source-category-specific rules for what counts toward potential, address fugitive emissions, aggregate emission units, or determine applicability of any permitting program. The permit, the applicable subpart, the reviewing authority, and a qualified air quality professional govern.",
  example: stackEmissionPteExample.inputs,
  fields: [
    { key: "hourly_rate_lb_h", label: "Maximum hourly emission rate (lb/h)", kind: "number", attrs: { step: "any" } },
    { key: "actual_hours_per_year", label: "Actual operating hours per year", kind: "number" },
    { key: "permitted_hours_per_year", label: "Permitted hours limit (0 if none)", kind: "number" },
    { key: "major_threshold_tpy", label: "Major source threshold (tons per year)", kind: "number", default: 100 },
    { key: "control_efficiency_pct", label: "Control device efficiency (%, 0 if none)", kind: "number", attrs: { step: "any" } },
    { key: "control_enforceable", label: "Is the control federally enforceable?", kind: "select", default: "no", options: [{ value: "no", label: "No (installed but not required)" }, { value: "yes", label: "Yes (a permit condition requires it)" }] },
  ],
  outputs: [
    { key: "a", id: "sep-out-a", label: "Actual emissions", value: (r) => fmt(r.actual_tpy, 2) + " tons per year" },
    { key: "p", id: "sep-out-p", label: "Potential to emit", value: (r) => fmt(r.pte_tpy, 2) + " tons per year at 8,760 hours" },
    { key: "s", id: "sep-out-s", label: "Against the threshold", value: (r) => r.status_verdict },
    { key: "c", id: "sep-out-c", label: "Control equipment", value: (r) => r.control_verdict },
    { key: "l", id: "sep-out-l", label: "Synthetic minor limit", value: (r) => r.limit_verdict },
    { key: "n", id: "sep-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStackEmissionPte,
});

// =====================================================================
// spec-v1718: visible emission opacity six-minute average (Method 9).
// =====================================================================
//
// spec-v1718's own 24 readings sum to 305, not the 300 it states, so its
// average is 12.71% rather than 12.5%. The conclusion survives -- both are
// under a 20% limit -- but the sum does not reproduce, so the block sum is an
// input here and everything is computed from it.
// dims: in { readings_sum_pct: dimensionless, reading_count: dimensionless, peak_reading_pct: dimensionless, limit_pct: dimensionless, steady_reading_pct: dimensionless } out: { block_average_pct: dimensionless, margin_pct: dimensionless, peak_over_average_pct: dimensionless, readings_at_peak_allowed: dimensionless }
export function computeOpacitySixMinute({
  readings_sum_pct = 0, reading_count = 24, peak_reading_pct = 0,
  limit_pct = 20, steady_reading_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(reading_count > 0)) return { error: "The reading count must be positive." };
  if (!Number.isInteger(reading_count)) return { error: "The reading count must be a whole number of readings." };
  if (readings_sum_pct < 0) return { error: "The sum of the readings cannot be negative." };
  if (peak_reading_pct < 0 || peak_reading_pct > 100) return { error: "The peak reading must be between 0 and 100 percent opacity." };
  if (!(limit_pct > 0 && limit_pct <= 100)) return { error: "The opacity limit must be above 0 and at most 100 percent." };
  if (steady_reading_pct < 0 || steady_reading_pct > 100) return { error: "The steady reading must be between 0 and 100 percent opacity." };
  if (readings_sum_pct > reading_count * 100) return { error: "The sum exceeds what that many readings can total -- each reading is at most 100 percent." };
  const block_average_pct = readings_sum_pct / reading_count;
  const complies = block_average_pct <= limit_pct;
  const margin_pct = limit_pct - block_average_pct;
  const full_block = reading_count === _AQ_READINGS_PER_BLOCK;
  const block_verdict = complies
    ? fmt(block_average_pct, 2) + "% average against a " + fmt(limit_pct, 1) + "% limit -- COMPLIANT, with " + fmt(margin_pct, 2) + " points of margin"
    : fmt(block_average_pct, 2) + "% average against a " + fmt(limit_pct, 1) + "% limit -- EXCEEDS it by " + fmt(-margin_pct, 2) + " points";
  // The contrast the method exists to make: a dark peak inside a compliant
  // block, against a steady haze that never looks as bad and is a violation.
  const has_peak = peak_reading_pct > 0;
  const peak_over_average_pct = has_peak ? peak_reading_pct - block_average_pct : 0;
  const peak_over_limit = has_peak && peak_reading_pct > limit_pct;
  const peak_verdict = !has_peak
    ? "(no peak reading entered)"
    : peak_over_limit && complies
      ? "the block contains a reading of " + fmt(peak_reading_pct, 1) + "%, well over the limit, and the block still COMPLIES -- a short dark plume contributes only its own readings to a block of " + fmt(reading_count, 0) + ", and the average is the finding"
      : peak_over_limit
        ? "the peak of " + fmt(peak_reading_pct, 1) + "% is over the limit and so is the block average"
        : "the peak of " + fmt(peak_reading_pct, 1) + "% is itself within the limit";
  // Run backwards: how many readings at the peak a block could carry and still
  // comply, if the rest were clear.
  const readings_at_peak_allowed = has_peak && peak_reading_pct > 0
    ? Math.floor(limit_pct * reading_count / peak_reading_pct)
    : 0;
  const capacity_verdict = !has_peak
    ? "(no peak reading entered)"
    : "with the rest of the block at zero, " + fmt(readings_at_peak_allowed, 0) + " of the " + fmt(reading_count, 0) + " readings could sit at " + fmt(peak_reading_pct, 1) + "% before the average reaches the limit";
  // The steady haze, which is the case operators get backwards.
  const has_steady = steady_reading_pct > 0;
  const steady_complies = has_steady && steady_reading_pct <= limit_pct;
  const steady_darker_than_peak = has_steady && has_peak && steady_reading_pct > peak_reading_pct;
  const steady_verdict = !has_steady
    ? "(no steady reading entered)"
    : steady_complies
      ? "a block of readings all at " + fmt(steady_reading_pct, 1) + "% averages exactly that and complies"
      : "a block of readings all at " + fmt(steady_reading_pct, 1) + "% averages exactly that and EXCEEDS the limit" + (has_peak && !steady_darker_than_peak ? " -- never as dark at any instant as the " + fmt(peak_reading_pct, 1) + "% peak above, and a violation where that block was not. An operator judging by the worst moment gets both of these backwards" : "");
  if (![block_average_pct, margin_pct, peak_over_average_pct, readings_at_peak_allowed].every(Number.isFinite)) return { error: "Opacity math is not a finite value." };
  return {
    block_average_pct, complies, margin_pct, full_block, reading_count, block_verdict,
    has_peak, peak_over_average_pct, peak_over_limit, peak_verdict,
    readings_at_peak_allowed, capacity_verdict,
    has_steady, steady_complies, steady_darker_than_peak, steady_verdict,
    note: "The six-minute opacity average an EPA Method 9 observation produces, and why it is the finding rather than the worst moment anyone saw. Twenty-four readings at fifteen-second intervals make one six-minute block, and the block's arithmetic mean is what is compared against the limit. That structure is what makes a short puff and a steady haze different findings. A soot blow producing a very dark plume for thirty seconds contributes two readings to a block of twenty-four, and the average can remain in compliance; a faint plume that never clears contributes twenty-four readings at a lower value and can exceed the same limit. Operators who watch the stack and judge by the worst moment consistently misread which condition is the violation, so both cases are computed side by side here. Method 9's observation conditions are as binding as the arithmetic, and nothing in this calculation can substitute for them. The observer stands at a specified distance with the sun in a specified sector behind them, reads against a contrasting background, and records the conditions -- and a reading taken with the sun in the wrong quadrant, against a bright sky, or through the plume at the wrong angle is not a valid reading regardless of what the observer saw. That is why an operator's own observation is not equivalent to a certified reading. Certification matters and it lapses: observers are certified against a smoke generator and must recertify on a stated interval, and readings by a lapsed observer are not enforceable readings. The sum of the block is entered here rather than the individual readings, because the field form records them and the sum is what a person transcribes -- and transcription is where the arithmetic goes wrong. This computes an average from entered readings; it does not validate the observation conditions, the observer's certification, the applicable limit or its short-duration exceptions (many standards allow one six-minute period per hour at a higher opacity), or whether a continuous opacity monitor's data would govern instead. 40 CFR Part 60 Appendix A Method 9, the applicable subpart, and the reviewing authority govern.",
  };
}
export const opacitySixMinuteExample = { inputs: { readings_sum_pct: 305, reading_count: 24, peak_reading_pct: 60, limit_pct: 20, steady_reading_pct: 22 } };
AIRQUALITY_RENDERERS["opacity-six-minute"] = _simpleRenderer({
  citation: "Citation: EPA Method 9 (40 CFR Part 60 Appendix A) by name -- readings at 15-second intervals, 24 to a six-minute block, and the block's ARITHMETIC MEAN compared against the limit, which is why a short dark puff and a steady faint haze are different findings. The block sum and the limit are ENTERED. It does not validate the observation conditions (sun position, background, distance and angle are specified by the method and a reading outside them is not valid), the observer's certification and its expiry, the applicable limit or its short-duration exceptions, or whether continuous opacity monitoring data would govern instead. The applicable subpart and the reviewing authority govern.",
  example: opacitySixMinuteExample.inputs,
  fields: [
    { key: "readings_sum_pct", label: "Sum of the readings in the block (%)", kind: "number", attrs: { step: "any" } },
    { key: "reading_count", label: "Readings in the block", kind: "number", default: 24, attrs: { step: "1", min: "1" } },
    { key: "peak_reading_pct", label: "Highest single reading (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "limit_pct", label: "Opacity limit (%)", kind: "number", default: 20, attrs: { step: "any" } },
    { key: "steady_reading_pct", label: "Steady-haze comparison, every reading at (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "a", id: "osm-out-a", label: "Block average", value: (r) => r.block_verdict + (r.full_block ? "" : " (note: " + fmt(r.reading_count, 0) + " readings, not the 24 a full six-minute block carries)") },
    { key: "p", id: "osm-out-p", label: "The peak inside it", value: (r) => r.peak_verdict },
    { key: "c", id: "osm-out-c", label: "How much dark it can carry", value: (r) => r.capacity_verdict },
    { key: "s", id: "osm-out-s", label: "A steady haze instead", value: (r) => r.steady_verdict },
    { key: "n", id: "osm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeOpacitySixMinute,
});

// =====================================================================
// spec-v1719: baghouse pressure drop and pulse cleaning interval.
// =====================================================================
//
// The BASELINE is the diagnostic, not the peak. The trigger sets the peak, so
// a blinding baghouse shows nothing wrong at the top of the cycle for months.
// dims: in { baseline_inwc: M L^-1 T^-2, trigger_inwc: M L^-1 T^-2, cycle_minutes: T, original_baseline_inwc: M L^-1 T^-2, original_cycle_minutes: T, elapsed_months: T, operating_hours_per_day: T } out: { baseline_rise_inwc: M L^-1 T^-2, baseline_rise_pct: dimensionless, cycle_change_pct: dimensionless, pulses_per_day: dimensionless, months_to_trigger: T }
export function computeBaghouseCleaningInterval({
  baseline_inwc = 0, trigger_inwc = 0, cycle_minutes = 0,
  original_baseline_inwc = 0, original_cycle_minutes = 0, elapsed_months = 0,
  operating_hours_per_day = 24, cleaning_mode = "on_demand",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(baseline_inwc > 0)) return { error: "The current clean-bag baseline must be positive (in wc)." };
  if (!(trigger_inwc > 0)) return { error: "The cleaning trigger pressure must be positive (in wc)." };
  if (!(trigger_inwc > baseline_inwc)) return { error: "The trigger must be above the baseline -- a baghouse whose clean-bag pressure has reached its trigger cannot complete a cycle." };
  if (cycle_minutes < 0 || original_cycle_minutes < 0) return { error: "Cycle times cannot be negative (minutes)." };
  if (original_baseline_inwc < 0) return { error: "The original baseline cannot be negative (in wc)." };
  if (elapsed_months < 0) return { error: "Elapsed time cannot be negative (months)." };
  if (!(operating_hours_per_day > 0 && operating_hours_per_day <= 24)) return { error: "Operating hours per day must be above 0 and at most 24." };
  const working_range_inwc = trigger_inwc - baseline_inwc;
  // The baseline trend, which is the whole diagnostic.
  const has_history = original_baseline_inwc > 0;
  const baseline_rise_inwc = has_history ? baseline_inwc - original_baseline_inwc : 0;
  const baseline_rise_pct = has_history ? baseline_rise_inwc / original_baseline_inwc * 100 : 0;
  const blinding = has_history && baseline_rise_inwc > 0;
  const original_range_inwc = has_history ? trigger_inwc - original_baseline_inwc : 0;
  const range_lost_pct = has_history && original_range_inwc > 0 ? baseline_rise_inwc / original_range_inwc * 100 : 0;
  // How long until the baseline reaches the trigger at the observed rate, at
  // which point the collector cannot complete a cycle at all.
  const rise_per_month = has_history && elapsed_months > 0 ? baseline_rise_inwc / elapsed_months : 0;
  const months_to_trigger = rise_per_month > 0 ? working_range_inwc / rise_per_month : 0;
  const baseline_verdict = !has_history
    ? "(no original baseline entered -- the baseline trend is the diagnostic, so a log of it is what this needs)"
    : blinding
      ? "the baseline has risen " + fmt(baseline_rise_inwc, 2) + " in wc (" + fmt(baseline_rise_pct, 0) + "%), consuming " + fmt(range_lost_pct, 0) + "% of the working range -- the bags are not returning to their clean pressure after a pulse, which is BLINDING and is not recoverable by more cleaning"
      : "the baseline is at or below where it started, so the bags are still releasing their cake";
  const trend_verdict = rise_per_month <= 0
    ? "(no rise, or no elapsed time entered)"
    : "at " + fmt(rise_per_month, 3) + " in wc per month the baseline reaches the " + fmt(trigger_inwc, 2) + " in wc trigger in about " + fmt(months_to_trigger, 1) + " more months, at which point the collector cannot complete a cycle and the bags are consumed";
  // The cycle, which shortens as the cake builds faster against a smaller range.
  const has_cycle_history = cycle_minutes > 0 && original_cycle_minutes > 0;
  const cycle_change_pct = has_cycle_history ? (cycle_minutes - original_cycle_minutes) / original_cycle_minutes * 100 : 0;
  const cycle_shortening = has_cycle_history && cycle_minutes < original_cycle_minutes;
  const pulses_per_day = cycle_minutes > 0 ? operating_hours_per_day * 60 / cycle_minutes : 0;
  const original_pulses_per_day = original_cycle_minutes > 0 ? operating_hours_per_day * 60 / original_cycle_minutes : 0;
  const cycle_verdict = !has_cycle_history
    ? (cycle_minutes > 0 ? fmt(pulses_per_day, 0) + " cleaning cycles a day at the entered interval" : "(no cycle time entered)")
    : cycle_shortening
      ? "the cycle has shortened " + fmt(-cycle_change_pct, 0) + "%, from " + fmt(original_pulses_per_day, 0) + " to " + fmt(pulses_per_day, 0) + " pulses a day -- more compressed air, more fabric flexing, and shorter bag life, all as a consequence of the smaller working range"
      : "the cycle is at or longer than it was, at " + fmt(pulses_per_day, 0) + " pulses a day";
  // Over-cleaning, which is the opposite error and is what timers produce.
  const is_timer = cleaning_mode === "timer";
  const mode_verdict = is_timer
    ? "TIMER cleaning pulses bags that did not need it: the residual dust cake that does most of the fine filtration is removed, emissions rise briefly after each pulse, the fabric is flexed more often and fails sooner, and compressed air is spent for nothing. On-demand cleaning triggered by differential pressure avoids all four"
    : "ON-DEMAND cleaning triggered by differential pressure is the preferred mode, and it is what makes the baseline readable in the first place";
  if (![working_range_inwc, baseline_rise_inwc, baseline_rise_pct, cycle_change_pct, pulses_per_day, months_to_trigger].every(Number.isFinite)) return { error: "Baghouse math is not a finite value." };
  return {
    working_range_inwc, has_history, baseline_rise_inwc, baseline_rise_pct, blinding,
    range_lost_pct, rise_per_month, months_to_trigger, baseline_verdict, trend_verdict,
    has_cycle_history, cycle_change_pct, cycle_shortening, pulses_per_day, original_pulses_per_day, cycle_verdict,
    is_timer, mode_verdict,
    note: "Whether a baghouse is healthy, read from the pressure it returns to after a pulse rather than the pressure it reaches before one. The BASELINE is the diagnostic and the peak is not, because the trigger sets the peak: a healthy collector cycles between a stable clean-bag pressure and its trigger, and the clean-bag value holds steady over weeks. When that baseline creeps upward the cake is not releasing -- dust has embedded in the fabric, often from moisture, from a sticky dust, or from operating below the gas dew point -- and no amount of additional cleaning brings it back. Blinding is irreversible and the bags are consumed. The consequence of watching the wrong number is months of lost warning. A collector whose baseline has climbed while its trigger has not shows an unchanged peak the entire time; what has changed is the working range, which shrinks from both ends, so the cycle shortens and the collector pulses more often. That shortening is the second symptom and it is reported here beside the first, because it is visible on any cleaning log even where the baseline was not recorded. Over-cleaning is the opposite error and it is what timer-based cleaning produces. A timer cleans on a schedule regardless of pressure, which pulses bags that did not need it: the residual dust cake that does most of the fine filtration is removed, emissions rise briefly after each pulse, the fabric is flexed more often and fails sooner, and compressed air -- often the most expensive utility in the plant -- is spent for nothing. On-demand cleaning triggered by differential pressure avoids all four, and it is also what makes the baseline readable at all. This tracks ENTERED pressures and cycle times: it does not compute pressure drop from air-to-cloth ratio and dust loading, predict when blinding will begin, diagnose its cause, size the pulse system or its compressed air, or evaluate emissions. The collector manufacturer's data, the bag supplier, and the plant's own cleaning log govern.",
  };
}
export const baghouseCleaningIntervalExample = { inputs: { baseline_inwc: 3.9, trigger_inwc: 6.0, cycle_minutes: 14, original_baseline_inwc: 2.0, original_cycle_minutes: 45, elapsed_months: 6, operating_hours_per_day: 24, cleaning_mode: "on_demand" } };
AIRQUALITY_RENDERERS["baghouse-cleaning-interval"] = _simpleRenderer({
  citation: "Citation: fabric filter cleaning practice as baghouse operation states it -- a healthy collector cycles between a stable clean-bag BASELINE and its cleaning trigger, and a rising baseline means the cake is not releasing (blinding), which is irreversible; the trigger sets the peak, so the peak shows nothing. On-demand cleaning by differential pressure is preferred over timer cleaning, which removes the residual cake that does the fine filtration, flexes the fabric more often and spends compressed air for nothing. Pressures and cycle times are ENTERED from the plant's own log. It does not compute pressure drop from air-to-cloth ratio and dust loading, predict or diagnose blinding, size the pulse system, or evaluate emissions. The collector manufacturer's data and the bag supplier govern.",
  example: baghouseCleaningIntervalExample.inputs,
  fields: [
    { key: "baseline_inwc", label: "Current clean-bag baseline (in wc)", kind: "number", attrs: { step: "any" } },
    { key: "trigger_inwc", label: "Cleaning trigger pressure (in wc)", kind: "number", attrs: { step: "any" } },
    { key: "cycle_minutes", label: "Current cycle time (minutes, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "original_baseline_inwc", label: "Original clean-bag baseline (in wc, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "original_cycle_minutes", label: "Original cycle time (minutes)", kind: "number", attrs: { step: "any" } },
    { key: "elapsed_months", label: "Months between the two observations", kind: "number", attrs: { step: "any" } },
    { key: "operating_hours_per_day", label: "Operating hours per day", kind: "number", default: 24 },
    { key: "cleaning_mode", label: "Cleaning mode", kind: "select", default: "on_demand", options: [{ value: "on_demand", label: "On demand (differential pressure)" }, { value: "timer", label: "Timer" }] },
  ],
  outputs: [
    { key: "r", id: "bci-out-r", label: "Working range", value: (r) => fmt(r.working_range_inwc, 2) + " in wc between baseline and trigger" },
    { key: "b", id: "bci-out-b", label: "The baseline", value: (r) => r.baseline_verdict },
    { key: "t", id: "bci-out-t", label: "Where it is heading", value: (r) => r.trend_verdict },
    { key: "c", id: "bci-out-c", label: "The cycle", value: (r) => r.cycle_verdict },
    { key: "m", id: "bci-out-m", label: "Cleaning mode", value: (r) => r.mode_verdict },
    { key: "n", id: "bci-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBaghouseCleaningInterval,
});

// =====================================================================
// spec-v1720: wet scrubber liquid-to-gas ratio and removal.
// =====================================================================
//
// The distinction between particulate and gas scrubbing matters because the
// CONTROLLING VARIABLE differs: a venturi is a pressure-drop machine and L/G
// supplies the liquid that pressure drop works on, while a packed tower's
// removal follows contact between the gas and a continuously renewed surface.
// dims: in { gas_acfm: L^3 T^-1, lg_ratio_gpm_per_1000: dimensionless, pump_head_ft: L, pump_efficiency: dimensionless, specific_gravity: dimensionless, annual_hours: T, energy_rate_per_kwh: dimensionless, alternate_lg_ratio: dimensionless, pressure_drop_inwc: M L^-1 T^-2, fan_efficiency: dimensionless } out: { liquid_gpm: L^3 T^-1, pump_bhp: M L^2 T^-3, annual_kwh: M L^2 T^-2, fan_bhp: M L^2 T^-3, alternate_liquid_gpm: L^3 T^-1 }
export function computeScrubberLgRatio({
  gas_acfm = 0, lg_ratio_gpm_per_1000 = 0, pump_head_ft = 0, pump_efficiency = 0.65,
  specific_gravity = 1.0, annual_hours = 0, energy_rate_per_kwh = 0,
  alternate_lg_ratio = 0, pressure_drop_inwc = 0, fan_efficiency = 0.65,
  scrubber_type = "packed_tower",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gas_acfm > 0)) return { error: "Gas flow must be positive (acfm)." };
  if (!(lg_ratio_gpm_per_1000 > 0)) return { error: "The liquid-to-gas ratio must be positive (gpm per 1,000 acfm)." };
  if (pump_head_ft < 0) return { error: "Pump head cannot be negative (ft)." };
  if (!(pump_efficiency > 0 && pump_efficiency <= 1)) return { error: "Pump efficiency must be above 0 and at most 1." };
  if (!(fan_efficiency > 0 && fan_efficiency <= 1)) return { error: "Fan efficiency must be above 0 and at most 1." };
  if (!(specific_gravity > 0)) return { error: "Specific gravity must be positive." };
  if (annual_hours < 0 || annual_hours > 8784) return { error: "Annual hours must be between 0 and 8,784." };
  if (energy_rate_per_kwh < 0) return { error: "The energy rate cannot be negative." };
  if (alternate_lg_ratio < 0) return { error: "The alternative L/G cannot be negative." };
  if (pressure_drop_inwc < 0) return { error: "Pressure drop cannot be negative (in wc)." };
  const liquid_gpm = gas_acfm / 1000 * lg_ratio_gpm_per_1000;
  const has_pump = pump_head_ft > 0;
  const pump_bhp = has_pump ? liquid_gpm * pump_head_ft * specific_gravity / (_AQ_PUMP_HP_CONST * pump_efficiency) : 0;
  const pump_kw = pump_bhp * _AQ_KW_PER_HP;
  // The fan side, which is where a venturi spends its energy. Fan bhp from
  // flow and static pressure at 6,356 = 33,000 ft-lb/min per hp over 5.192
  // lb/sq ft per in wc.
  const has_fan = pressure_drop_inwc > 0;
  const fan_bhp = has_fan ? gas_acfm * pressure_drop_inwc / (6356 * fan_efficiency) : 0;
  const fan_kw = fan_bhp * _AQ_KW_PER_HP;
  const total_kw = pump_kw + fan_kw;
  const annual_kwh = total_kw * annual_hours;
  const annual_cost = annual_kwh * energy_rate_per_kwh;
  const is_venturi = scrubber_type === "venturi";
  const type_verdict = is_venturi
    ? "a VENTURI removing particulate is a pressure-drop machine: removal follows the energy of the gas past the throat, and the liquid-to-gas ratio supplies the liquid that pressure drop atomizes and works on. Fine particulate is where the energy cost becomes severe, because removal of submicron particles rises steeply with pressure drop and pressure drop is fan power spent continuously"
    : "a PACKED TOWER absorbing a gas is a contact machine: removal follows the contact between the gas and a continuously renewed liquid surface, so the liquid-to-gas ratio and the packing height are the controls and pressure drop is a cost rather than a mechanism";
  const energy_verdict = !has_pump && !has_fan
    ? "(no pump head or pressure drop entered)"
    : fmt(pump_bhp, 2) + " bhp of pumping" + (has_fan ? " and " + fmt(fan_bhp, 2) + " bhp of fan against the pressure drop" : "") + (annual_hours > 0 ? ", " + fmt(annual_kwh, 0) + " kWh a year" + (energy_rate_per_kwh > 0 ? " at $" + fmt(annual_cost, 0) : "") : "");
  // Raising L/G to improve absorption, and what it costs.
  const has_alternate = alternate_lg_ratio > 0;
  const alternate_liquid_gpm = has_alternate ? gas_acfm / 1000 * alternate_lg_ratio : 0;
  const alternate_pump_bhp = has_alternate && has_pump ? alternate_liquid_gpm * pump_head_ft * specific_gravity / (_AQ_PUMP_HP_CONST * pump_efficiency) : 0;
  const liquid_ratio = has_alternate && liquid_gpm > 0 ? alternate_liquid_gpm / liquid_gpm : 0;
  const alternate_verdict = !has_alternate
    ? "(no alternative L/G entered)"
    : "at an L/G of " + fmt(alternate_lg_ratio, 1) + " the circulation is " + fmt(alternate_liquid_gpm, 0) + " gpm, " + fmt(liquid_ratio, 2) + " times this one" + (has_pump ? ", and the pumping rises to " + fmt(alternate_pump_bhp, 2) + " bhp -- pumping is linear in L/G, while removal rises with diminishing returns, so the last increment of absorption is the expensive one" : "");
  if (![liquid_gpm, pump_bhp, annual_kwh, fan_bhp, alternate_liquid_gpm].every(Number.isFinite)) return { error: "Scrubber math is not a finite value." };
  return {
    liquid_gpm, has_pump, pump_bhp, pump_kw, has_fan, fan_bhp, fan_kw,
    total_kw, annual_kwh, annual_cost, energy_verdict,
    is_venturi, type_verdict,
    has_alternate, alternate_liquid_gpm, alternate_pump_bhp, liquid_ratio, alternate_verdict,
    note: "The liquid a wet scrubber circulates at a given liquid-to-gas ratio, and what moving it and the gas costs. The ratio is expressed in gallons per minute per thousand actual cubic feet per minute of gas, and it is the primary sizing variable -- but which mechanism it serves depends on what the scrubber is removing, and that distinction is the useful part. In a venturi removing PARTICULATE, the energy of the gas passing the throat atomizes the liquid, and removal follows the PRESSURE DROP; the liquid-to-gas ratio supplies the liquid that pressure drop works on. In a packed tower absorbing a GAS, removal follows the contact between the gas and a continuously renewed liquid surface, so the ratio and the packing height are the controls and pressure drop is a cost rather than a mechanism. Fine particulate is where the energy cost becomes severe. Removal of submicron particles in a venturi rises steeply with pressure drop, and pressure drop is fan power spent continuously for the life of the installation -- so a scrubber achieving a high efficiency on fine particulate is an expensive machine to run, and that operating cost, not the capital cost, is usually what decides against it. Two consequences sit outside the arithmetic and neither should be forgotten. Dissolved material accumulates in the recirculating liquid, so a blowdown or purge is required and its rate sets the chemistry the scrubber actually runs at. And a wet scrubber does not destroy the pollutant, it TRANSFERS it to water -- which then has to be treated, discharged under its own permit, or hauled. A scrubber's real cost includes that stream. This computes circulation and the power to move it from an ENTERED ratio; it does not predict removal efficiency, which depends on the contactor design, the chemistry, the particle size distribution and the solubility, and which is measured rather than calculated. It does not size the packing or the vessel, compute the blowdown rate or the resulting chemistry, or address mist eliminators, reheat, and the visible plume. The scrubber manufacturer's performance data, the permit, and a qualified air quality engineer govern.",
  };
}
export const scrubberLgRatioExample = { inputs: { gas_acfm: 15000, lg_ratio_gpm_per_1000: 10, pump_head_ft: 40, pump_efficiency: 0.65, specific_gravity: 1.0, annual_hours: 6000, energy_rate_per_kwh: 0.10, alternate_lg_ratio: 20, pressure_drop_inwc: 6, fan_efficiency: 0.65, scrubber_type: "packed_tower" } };
AIRQUALITY_RENDERERS["scrubber-lg-ratio"] = _simpleRenderer({
  citation: "Citation: the wet scrubber liquid-to-gas ratio as air pollution control practice writes it -- liquid gpm = gas acfm / 1,000 x the L/G ratio -- with pump brake horsepower = gpm x head x specific gravity / (3,960 x efficiency) and fan brake horsepower = acfm x in wc / (6,356 x efficiency). It does not predict removal efficiency, which depends on contactor design, chemistry, particle size distribution and solubility and is MEASURED rather than calculated; it does not size the packing or vessel, compute blowdown rate or the resulting chemistry, or address mist eliminators, reheat and the visible plume. A wet scrubber transfers the pollutant to water, which carries its own treatment and discharge obligations. The manufacturer's performance data and the permit govern.",
  example: scrubberLgRatioExample.inputs,
  fields: [
    { key: "scrubber_type", label: "Scrubber type", kind: "select", default: "packed_tower", options: [{ value: "packed_tower", label: "Packed tower (gas absorption)" }, { value: "venturi", label: "Venturi (particulate)" }] },
    { key: "gas_acfm", label: "Gas flow (acfm)", kind: "number" },
    { key: "lg_ratio_gpm_per_1000", label: "L/G ratio (gpm per 1,000 acfm)", kind: "number", attrs: { step: "any" } },
    { key: "pump_head_ft", label: "Pump head (ft, 0 to skip)", kind: "number" },
    { key: "pump_efficiency", label: "Pump efficiency (0-1)", kind: "number", default: 0.65 },
    { key: "specific_gravity", label: "Liquid specific gravity", kind: "number", default: 1 },
    { key: "pressure_drop_inwc", label: "Scrubber pressure drop (in wc, 0 to skip the fan)", kind: "number", attrs: { step: "any" } },
    { key: "fan_efficiency", label: "Fan efficiency (0-1)", kind: "number", default: 0.65 },
    { key: "annual_hours", label: "Annual operating hours", kind: "number" },
    { key: "energy_rate_per_kwh", label: "Energy rate ($/kWh)", kind: "number" },
    { key: "alternate_lg_ratio", label: "Alternative L/G to compare (0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "l", id: "slg-out-l", label: "Liquid circulation", value: (r) => fmt(r.liquid_gpm, 0) + " gpm" },
    { key: "t", id: "slg-out-t", label: "Which variable controls", value: (r) => r.type_verdict },
    { key: "e", id: "slg-out-e", label: "Energy", value: (r) => r.energy_verdict },
    { key: "a", id: "slg-out-a", label: "At the alternative L/G", value: (r) => r.alternate_verdict },
    { key: "n", id: "slg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeScrubberLgRatio,
});

// =====================================================================
// spec-v1721: thermal oxidizer residence time and chamber volume.
// =====================================================================
//
// The gas expansion is the arithmetic trap and it is close to a factor of
// four, not the "roughly threefold" the spec's own summary states: a chamber
// sized on inlet standard flow gives a residence time that many times what the
// unit actually achieves.
// dims: in { inlet_scfm: L^3 T^-1, chamber_temp_f: T, standard_temp_f: T, required_residence_s: T, chamber_volume_ft3: L^3 } out: { expansion_factor: dimensionless, actual_acfm: L^3 T^-1, volume_required_ft3: L^3, actual_residence_s: T, standard_basis_residence_s: T }
export function computeThermalOxidizerResidence({
  inlet_scfm = 0, chamber_temp_f = 0, standard_temp_f = 70,
  required_residence_s = 0.75, chamber_volume_ft3 = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(inlet_scfm > 0)) return { error: "Inlet flow must be positive (scfm)." };
  if (!(required_residence_s > 0)) return { error: "Required residence time must be positive (seconds)." };
  if (chamber_volume_ft3 < 0) return { error: "Chamber volume cannot be negative (cu ft)." };
  const chamber_r = _aqRankine(chamber_temp_f);
  const standard_r = _aqRankine(standard_temp_f);
  if (!(chamber_r > 0)) return { error: "Chamber temperature must be above absolute zero." };
  if (!(standard_r > 0)) return { error: "The standard reference temperature must be above absolute zero." };
  if (!(chamber_r > standard_r)) return { error: "The chamber must be hotter than the reference temperature -- an oxidizer that does not heat the gas has no expansion to account for." };
  // Ideal-gas expansion on ABSOLUTE temperature. This is the whole trap.
  const expansion_factor = chamber_r / standard_r;
  const actual_acfm = inlet_scfm * expansion_factor;
  const volume_required_ft3 = actual_acfm * required_residence_s / 60;
  // What sizing on the standard flow would have given, and the residence that
  // chamber actually delivers.
  const standard_basis_volume_ft3 = inlet_scfm * required_residence_s / 60;
  const standard_basis_residence_s = actual_acfm > 0 ? standard_basis_volume_ft3 * 60 / actual_acfm : 0;
  const trap_verdict = "sizing on the " + fmt(inlet_scfm, 0) + " scfm inlet flow instead would give a " + fmt(standard_basis_volume_ft3, 0) + " cu ft chamber, which at the actual " + fmt(actual_acfm, 0) + " acfm delivers only " + fmt(standard_basis_residence_s, 3) + " seconds -- a unit that appears to have " + fmt(required_residence_s, 2) + " seconds of residence on standard flow has " + fmt(standard_basis_residence_s, 3) + " in reality";
  // Against an entered chamber.
  const has_chamber = chamber_volume_ft3 > 0;
  const actual_residence_s = has_chamber && actual_acfm > 0 ? chamber_volume_ft3 * 60 / actual_acfm : 0;
  const residence_adequate = has_chamber && actual_residence_s >= required_residence_s;
  const chamber_verdict = !has_chamber
    ? "(no chamber volume entered)"
    : residence_adequate
      ? "the " + fmt(chamber_volume_ft3, 0) + " cu ft chamber gives " + fmt(actual_residence_s, 3) + " seconds at the actual flow, meeting the " + fmt(required_residence_s, 2) + " second requirement"
      : "the " + fmt(chamber_volume_ft3, 0) + " cu ft chamber gives only " + fmt(actual_residence_s, 3) + " seconds at the actual flow, SHORT of the " + fmt(required_residence_s, 2) + " second requirement -- and residence is one of the three T's, so the shortfall is not made up by temperature alone without a kinetic evaluation";
  if (![expansion_factor, actual_acfm, volume_required_ft3, actual_residence_s, standard_basis_residence_s].every(Number.isFinite)) return { error: "Oxidizer residence math is not a finite value." };
  return {
    chamber_r, standard_r, expansion_factor, actual_acfm, volume_required_ft3,
    standard_basis_volume_ft3, standard_basis_residence_s, trap_verdict,
    has_chamber, actual_residence_s, residence_adequate, chamber_verdict,
    note: "The chamber volume a thermal oxidizer needs for a required residence time, computed at the flow the chamber actually sees. The gas expansion is the arithmetic trap and it is close to a factor of four at ordinary operating temperatures, not the threefold that gets quoted: gas at 1,600 degF occupies nearly four times the volume it did at 70, so it moves through the chamber that much faster. A chamber sized on the inlet flow in STANDARD cubic feet therefore gives a residence time several times what the unit achieves, and a unit that appears to have a full second on standard flow can have a quarter of that in reality. Sizing must use the actual flow at chamber temperature, and the difference between the two is reported here rather than described. Destruction needs three things and residence is only one of them. Temperature, time and turbulence all have to be present, and they trade against each other but not freely: destruction is a kinetic process, so a lower temperature can in principle be compensated by longer residence, but the relationship is exponential in temperature and roughly linear in time, so a modest temperature shortfall takes a large time increase to make up. Turbulence is not in the arithmetic at all -- a chamber with the right volume and the wrong mixing has dead zones and short-circuits, and its measured destruction efficiency will not match its calculated residence. Halogenated compounds and high destruction efficiency requirements both push the temperature and the time upward, and destruction efficiency itself is MEASURED by stack test rather than calculated, which is why permit language states it as a performance requirement. This computes an ideal-gas expansion and a residence time from ENTERED conditions; it does not compute destruction efficiency, model the kinetics of any compound, size the burner or the heat recovery, address the flame arrestor and the lower explosive limit constraints on the inlet stream, or evaluate the products of combustion, which for halogenated streams include acid gases needing their own control. The oxidizer manufacturer, the stack test, and the permit govern.",
  };
}
export const thermalOxidizerResidenceExample = { inputs: { inlet_scfm: 8000, chamber_temp_f: 1600, standard_temp_f: 70, required_residence_s: 0.75, chamber_volume_ft3: 389 } };
AIRQUALITY_RENDERERS["thermal-oxidizer-residence"] = _simpleRenderer({
  citation: "Citation: residence time = chamber volume / the ACTUAL gas flow at chamber conditions, with the ideal-gas expansion taken on absolute temperature (degrees Rankine, offset 459.67) -- the correction a standard-flow sizing omits. The three T's of thermal destruction (temperature, time and turbulence) are all required and only time is computed here. It does not compute destruction efficiency, which is MEASURED by stack test, model the kinetics of any compound, size the burner or heat recovery, address flame arrestor and lower-explosive-limit constraints on the inlet, or evaluate combustion products, which for halogenated streams include acid gases needing their own control. The oxidizer manufacturer, the stack test, and the permit govern.",
  example: thermalOxidizerResidenceExample.inputs,
  fields: [
    { key: "inlet_scfm", label: "Inlet flow (scfm)", kind: "number" },
    { key: "chamber_temp_f", label: "Chamber operating temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "standard_temp_f", label: "Standard reference temperature (°F)", kind: "number", default: 70, attrs: { step: "any" } },
    { key: "required_residence_s", label: "Required residence time (seconds)", kind: "number", default: 0.75, attrs: { step: "any" } },
    { key: "chamber_volume_ft3", label: "Chamber volume (cu ft, 0 to skip the check)", kind: "number" },
  ],
  outputs: [
    { key: "e", id: "tor-out-e", label: "Gas expansion", value: (r) => fmt(r.expansion_factor, 2) + " times, from " + fmt(r.standard_r, 0) + " to " + fmt(r.chamber_r, 0) + " °R" },
    { key: "a", id: "tor-out-a", label: "Actual flow in the chamber", value: (r) => fmt(r.actual_acfm, 0) + " acfm" },
    { key: "v", id: "tor-out-v", label: "Chamber volume required", value: (r) => fmt(r.volume_required_ft3, 0) + " cu ft" },
    { key: "t", id: "tor-out-t", label: "The standard-flow trap", value: (r) => r.trap_verdict },
    { key: "c", id: "tor-out-c", label: "Against the entered chamber", value: (r) => r.chamber_verdict },
    { key: "n", id: "tor-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeThermalOxidizerResidence,
});

// =====================================================================
// spec-v1722: coating VOC content and compliance rate.
// =====================================================================
//
// The less-water basis exists to prevent compliance by dilution: measuring VOC
// per gallon of coating as supplied would let anyone pass by adding water,
// without reducing the solvent applied per square foot.
// dims: in { coating_gal: L^3, voc_lb: M, water_gal: L^3, exempt_gal: L^3, thinner_gal: L^3, thinner_voc_lb_per_gal: M L^-3, limit_lb_per_gal: M L^-3 } out: { voc_as_supplied: M L^-3, voc_less_water: M L^-3, applied_voc_as_supplied: M L^-3, applied_voc_less_water: M L^-3, margin_lb_per_gal: M L^-3 }
export function computeCoatingVocCompliance({
  coating_gal = 1, voc_lb = 0, water_gal = 0, exempt_gal = 0,
  thinner_gal = 0, thinner_voc_lb_per_gal = 0, limit_lb_per_gal = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(coating_gal > 0)) return { error: "Coating volume must be positive (gal)." };
  if (voc_lb < 0) return { error: "VOC mass cannot be negative (lb)." };
  if (water_gal < 0 || exempt_gal < 0) return { error: "Water and exempt solvent volumes cannot be negative (gal)." };
  if (thinner_gal < 0 || thinner_voc_lb_per_gal < 0) return { error: "Thinner volume and its VOC content cannot be negative." };
  if (limit_lb_per_gal < 0) return { error: "The limit cannot be negative (lb/gal)." };
  const non_voc_gal = water_gal + exempt_gal;
  if (!(non_voc_gal < coating_gal)) return { error: "Water plus exempt solvent must be less than the coating volume -- the less-water basis divides by what remains." };
  // As supplied is the label number; less water is the regulatory one.
  const voc_as_supplied = voc_lb / coating_gal;
  const less_water_gal = coating_gal - non_voc_gal;
  const voc_less_water = voc_lb / less_water_gal;
  const basis_ratio = voc_as_supplied > 0 ? voc_less_water / voc_as_supplied : 0;
  const basis_verdict = non_voc_gal > 0
    ? fmt(voc_as_supplied, 2) + " lb/gal on the can and " + fmt(voc_less_water, 2) + " lb/gal on the regulatory basis, " + fmt(basis_ratio, 2) + " times higher -- because " + fmt(non_voc_gal, 2) + " gal of water and exempt solvent come out of the denominator, and a coating that is mostly water has a small denominator"
    : "with no water or exempt solvent the two bases are the same number";
  // As applied, after thinning. Thinner adds VOC and volume, and the water is
  // unchanged, so the less-water figure rises on both counts.
  const has_thinner = thinner_gal > 0;
  const applied_voc_lb = voc_lb + thinner_gal * thinner_voc_lb_per_gal;
  const applied_gal = coating_gal + thinner_gal;
  const applied_less_water_gal = applied_gal - non_voc_gal;
  const applied_voc_as_supplied = applied_voc_lb / applied_gal;
  const applied_voc_less_water = applied_voc_lb / applied_less_water_gal;
  const governing_voc = has_thinner ? applied_voc_less_water : voc_less_water;
  const thinner_verdict = !has_thinner
    ? "(no thinner entered -- the as-supplied coating is what is applied)"
    : "adding " + fmt(thinner_gal, 2) + " gal of thinner at " + fmt(thinner_voc_lb_per_gal, 2) + " lb/gal takes the as-applied figure to " + fmt(applied_voc_less_water, 2) + " lb/gal less water, up from " + fmt(voc_less_water, 2) + " -- thinner adds VOC to the numerator and volume that is not water to the denominator, and the numerator wins";
  // Compliance against the entered limit, on the governing basis.
  const has_limit = limit_lb_per_gal > 0;
  const complies = has_limit && governing_voc <= limit_lb_per_gal;
  const margin_lb_per_gal = has_limit ? limit_lb_per_gal - governing_voc : 0;
  const label_would_pass = has_limit && voc_as_supplied <= limit_lb_per_gal;
  const limit_verdict = !has_limit
    ? "(no limit entered)"
    : complies
      ? "COMPLIES: " + fmt(governing_voc, 2) + " lb/gal " + (has_thinner ? "as applied " : "") + "less water against a " + fmt(limit_lb_per_gal, 2) + " lb/gal limit, with " + fmt(margin_lb_per_gal, 2) + " lb/gal of margin"
      : "EXCEEDS: " + fmt(governing_voc, 2) + " lb/gal " + (has_thinner ? "as applied " : "") + "less water against a " + fmt(limit_lb_per_gal, 2) + " lb/gal limit, over by " + fmt(-margin_lb_per_gal, 2) + " lb/gal" + (label_would_pass ? " -- and the LABEL number of " + fmt(voc_as_supplied, 2) + " lb/gal would have suggested it passed" : "");
  if (![voc_as_supplied, voc_less_water, applied_voc_as_supplied, applied_voc_less_water, margin_lb_per_gal].every(Number.isFinite)) return { error: "Coating VOC math is not a finite value." };
  return {
    voc_as_supplied, less_water_gal, voc_less_water, basis_ratio, non_voc_gal, basis_verdict,
    has_thinner, applied_voc_lb, applied_gal, applied_voc_as_supplied, applied_voc_less_water, thinner_verdict,
    governing_voc, has_limit, complies, margin_lb_per_gal, label_would_pass, limit_verdict,
    note: "A coating's VOC content on the two bases that matter, and which one the rule is written against. VOC as supplied is pounds of VOC per gallon of the coating as it comes, and it is the number on the can. VOC LESS WATER divides the same VOC by the coating volume minus its water and minus any exempt solvents, and it is the regulatory basis in most coating rules. The less-water basis exists to prevent compliance by dilution: if VOC were measured per gallon as supplied, adding water to a solvent coating would lower the number without reducing the solvent applied per square foot of surface. So the rule subtracts the water and the exempt compounds and measures the VOC against what remains, which is roughly the material that forms the film plus the solvent in it. The consequence is that waterborne coatings can fail limits they appear to pass. A coating that is mostly water with a modest amount of coalescing solvent has a low VOC per gallon as supplied and can have a high VOC less water, because the denominator is small -- and the smaller the denominator, the larger the gap between the two numbers. That is a genuine and frequent surprise, and it is why a technical data sheet reports both and why the regulatory one governs. Thinning moves it further. Thinner adds VOC to the numerator and adds volume to the denominator, but the added volume is not water, so it does not come back out -- and a coating with comfortable margin as supplied can exceed its limit as applied. That is the number a rule is enforced against, so it is the one this reports as governing whenever a thinner is entered. Exempt solvents are compounds EPA has determined are negligibly photochemically reactive, and the list is specific and changes; treating a solvent as exempt because it seems similar to one that is will produce a wrong answer. This computes content from ENTERED volumes and masses off a technical data sheet. It does not determine which compounds are exempt, apply transfer efficiency credits that some rules allow for high-efficiency application equipment, address VOC limits expressed per gallon of SOLIDS, compute emissions from usage, or determine which rule applies. The technical data sheet, the applicable coating rule, and the permit govern.",
  };
}
export const coatingVocComplianceExample = { inputs: { coating_gal: 1.0, voc_lb: 0.5, water_gal: 0.55, exempt_gal: 0, thinner_gal: 0.2, thinner_voc_lb_per_gal: 7.0, limit_lb_per_gal: 2.8 } };
AIRQUALITY_RENDERERS["coating-voc-compliance"] = _simpleRenderer({
  citation: "Citation: the VOC content bases as coating rules define them -- VOC as supplied = lb of VOC per gallon of coating, and VOC LESS WATER = lb of VOC per (gallons of coating minus water minus exempt solvents), which is the regulatory basis in most rules and exists to prevent compliance by dilution. The as-applied figure includes thinner, which adds VOC to the numerator and non-water volume to the denominator. Volumes and masses are ENTERED from the technical data sheet. It does not determine which compounds are exempt (the list is specific and changes), apply transfer-efficiency credits some rules allow, address limits expressed per gallon of SOLIDS, compute emissions from usage, or determine which rule applies. The applicable coating rule and the permit govern.",
  example: coatingVocComplianceExample.inputs,
  fields: [
    { key: "coating_gal", label: "Coating volume as supplied (gal)", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "voc_lb", label: "VOC in that volume (lb)", kind: "number", attrs: { step: "any" } },
    { key: "water_gal", label: "Water in it (gal)", kind: "number", attrs: { step: "any" } },
    { key: "exempt_gal", label: "Exempt solvent in it (gal)", kind: "number", attrs: { step: "any" } },
    { key: "thinner_gal", label: "Thinner added (gal, 0 if none)", kind: "number", attrs: { step: "any" } },
    { key: "thinner_voc_lb_per_gal", label: "Thinner VOC content (lb/gal)", kind: "number", attrs: { step: "any" } },
    { key: "limit_lb_per_gal", label: "Limit, less water (lb/gal, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "s", id: "cvc-out-s", label: "As supplied", value: (r) => fmt(r.voc_as_supplied, 3) + " lb/gal" },
    { key: "w", id: "cvc-out-w", label: "Less water", value: (r) => fmt(r.voc_less_water, 3) + " lb/gal over " + fmt(r.less_water_gal, 3) + " gal" },
    { key: "b", id: "cvc-out-b", label: "Why they differ", value: (r) => r.basis_verdict },
    { key: "t", id: "cvc-out-t", label: "As applied", value: (r) => r.thinner_verdict },
    { key: "c", id: "cvc-out-c", label: "Against the limit", value: (r) => r.limit_verdict },
    { key: "n", id: "cvc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCoatingVocCompliance,
});

// =====================================================================
// spec-v1723: SPCC secondary containment volume and freeboard.
// =====================================================================
//
// The DISPLACEMENT subtraction is what gets missed. A dike sized to hold the
// largest tank looks adequate until you notice that the other tanks, their
// foundations and a pump skid all stand inside it and occupy volume that oil
// cannot.
// dims: in { largest_tank_gal: L^3, freeboard_pct: dimensionless, dike_length_ft: L, dike_width_ft: L, dike_height_ft: L, other_tank_count: dimensionless, other_tank_diameter_ft: L, other_equipment_ft3: L^3 } out: { required_gal: L^3, gross_ft3: L^3, displacement_ft3: L^3, net_gal: L^3, margin_gal: L^3 }
export function computeSpccContainmentVolume({
  largest_tank_gal = 0, freeboard_pct = 10,
  dike_length_ft = 0, dike_width_ft = 0, dike_height_ft = 0,
  other_tank_count = 0, other_tank_diameter_ft = 0, other_equipment_ft3 = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(largest_tank_gal > 0)) return { error: "The largest single container's capacity must be positive (gal)." };
  if (freeboard_pct < 0) return { error: "Freeboard cannot be negative (%)." };
  if (!(dike_length_ft > 0)) return { error: "Dike length must be positive (ft)." };
  if (!(dike_width_ft > 0)) return { error: "Dike width must be positive (ft)." };
  if (!(dike_height_ft > 0)) return { error: "Dike wall height must be positive (ft)." };
  if (other_tank_count < 0 || !Number.isInteger(other_tank_count)) return { error: "The number of other tanks must be a whole number, zero or more." };
  if (other_tank_diameter_ft < 0) return { error: "Other tank diameter cannot be negative (ft)." };
  if (other_equipment_ft3 < 0) return { error: "Other equipment displacement cannot be negative (cu ft)." };
  const required_gal = largest_tank_gal * (1 + freeboard_pct / 100);
  const required_ft3 = required_gal / _AQ_GAL_PER_CUFT;
  const gross_ft3 = dike_length_ft * dike_width_ft * dike_height_ft;
  const gross_gal = gross_ft3 * _AQ_GAL_PER_CUFT;
  // Displacement: everything standing inside the dike, up to the containment
  // height. Foundations and skids count as much as tanks do.
  const tank_displacement_ft3 = other_tank_count * (Math.PI / 4) * other_tank_diameter_ft * other_tank_diameter_ft * dike_height_ft;
  const displacement_ft3 = tank_displacement_ft3 + other_equipment_ft3;
  const displacement_gal = displacement_ft3 * _AQ_GAL_PER_CUFT;
  const displacement_pct = gross_ft3 > 0 ? displacement_ft3 / gross_ft3 * 100 : 0;
  const net_ft3 = gross_ft3 - displacement_ft3;
  const net_gal = net_ft3 * _AQ_GAL_PER_CUFT;
  if (!(net_ft3 > 0)) return { error: "Displacement equals or exceeds the dike's gross volume -- there is no containment capacity left." };
  const adequate = net_gal >= required_gal;
  const margin_gal = net_gal - required_gal;
  const gross_would_pass = gross_gal >= required_gal;
  const verdict = adequate
    ? "ADEQUATE: " + fmt(net_gal, 0) + " gal net against " + fmt(required_gal, 0) + " gal required, with " + fmt(margin_gal, 0) + " gal to spare"
    : "NOT ADEQUATE: " + fmt(net_gal, 0) + " gal net against " + fmt(required_gal, 0) + " gal required, short by " + fmt(-margin_gal, 0) + " gal" + (gross_would_pass ? " -- the GROSS volume of " + fmt(gross_gal, 0) + " gal would have passed, and the displacement is the whole difference" : "");
  const displacement_verdict = displacement_ft3 <= 0
    ? "(nothing entered as standing inside the dike -- on a congested tank farm that is rarely true)"
    : fmt(displacement_ft3, 0) + " cu ft (" + fmt(displacement_gal, 0) + " gal) of the dike is occupied by things oil cannot fill, " + fmt(displacement_pct, 1) + "% of its gross volume";
  // The wall height that would work, holding the footprint fixed. Tank
  // displacement scales WITH the wall height, so it comes out of the footprint
  // as an AREA rather than being subtracted as a fixed volume; only the
  // equipment displacement is a fixed volume. Solving
  //   h (L W - tank area) - equipment = required
  // is the honest inversion, and treating the tanks' volume as fixed would
  // under-report the height every time.
  const tank_footprint_ft2 = other_tank_count * (Math.PI / 4) * other_tank_diameter_ft * other_tank_diameter_ft;
  const free_footprint_ft2 = dike_length_ft * dike_width_ft - tank_footprint_ft2;
  const height_needed_ft = free_footprint_ft2 > 0
    ? (required_ft3 + other_equipment_ft3) / free_footprint_ft2
    : 0;
  const height_verdict = free_footprint_ft2 <= 0
    ? "the tanks inside cover the whole footprint, so no wall height gives capacity"
    : adequate
      ? "a wall of " + fmt(height_needed_ft, 2) + " ft would be the minimum on this footprint; the dike has " + fmt(dike_height_ft, 2) + " ft"
      : "on this footprint the wall would have to reach " + fmt(height_needed_ft, 2) + " ft, against the " + fmt(dike_height_ft, 2) + " ft it has -- and note the tanks displace more as the wall rises, so the height is solved on the free footprint rather than by adding their volume once";
  if (![required_gal, gross_ft3, displacement_ft3, net_gal, margin_gal, height_needed_ft].every(Number.isFinite)) return { error: "Containment volume math is not a finite value." };
  return {
    required_gal, required_ft3, gross_ft3, gross_gal,
    tank_displacement_ft3, displacement_ft3, displacement_gal, displacement_pct,
    net_ft3, net_gal, adequate, margin_gal, gross_would_pass, verdict, displacement_verdict,
    tank_footprint_ft2, free_footprint_ft2, height_needed_ft, height_verdict,
    note: "Whether a diked tank farm actually holds what an SPCC plan requires it to hold. The requirement is the capacity of the LARGEST SINGLE container, plus freeboard for precipitation -- not the sum of the tanks, because the design event is one container failing rather than all of them. Freeboard is commonly sized for a 25-year, 24-hour storm or stated as a percentage, and which applies is a matter for the rule and the certifying professional engineer rather than for arithmetic. The DISPLACEMENT subtraction is what gets missed, and it is why this exists. A dike sized to hold the largest tank looks adequate until you notice that the other tanks, their ring foundations, and a pump skid all stand inside it and occupy volume that oil cannot. Net capacity is the gross volume minus everything inside it up to the containment height, and on a congested tank farm that displacement can be a substantial fraction of the total -- large enough to turn a comfortable margin into a deficiency, which is exactly what the gross-versus-net comparison here reports. Two conditions matter as much as the volume and neither is arithmetic. A dike with an open drain valve has NO capacity at all: valves are normally closed and secured, and their operation is a plan requirement with recordkeeping attached. And the containment must be sufficiently impervious to hold the oil long enough to recover it -- a bermed area over permeable soil holds a number on paper and nothing in practice. This computes volumes from ENTERED dimensions and treats the dike as a rectangular prism, which a real dike with sloped walls or an irregular footprint is not. It does not determine SPCC applicability or the required freeboard, address the alternative sized-containment provisions for loading racks, mobile containers or oil-filled equipment, evaluate imperviousness, drainage control or the general containment requirements, or substitute for the PE certification the rule requires. 40 CFR Part 112, the facility's SPCC plan, and the certifying professional engineer govern.",
  };
}
export const spccContainmentVolumeExample = { inputs: { largest_tank_gal: 12000, freeboard_pct: 10, dike_length_ft: 80, dike_width_ft: 60, dike_height_ft: 3, other_tank_count: 3, other_tank_diameter_ft: 12, other_equipment_ft3: 0 } };
AIRQUALITY_RENDERERS["spcc-containment-volume"] = _simpleRenderer({
  citation: "Citation: secondary containment sizing as SPCC practice states it -- capacity for the LARGEST SINGLE container plus freeboard for precipitation, with the NET capacity being the dike's gross volume minus the displacement of everything standing inside it up to the containment height. Gallons convert at 1728/231 cubic inches, exact by definition. It treats the dike as a rectangular prism. It does not determine SPCC applicability or the required freeboard, address the alternative sized-containment provisions for loading racks, mobile containers or oil-filled equipment, evaluate imperviousness or drainage control (a dike with an open drain valve has no capacity), or substitute for the PE certification the rule requires. 40 CFR Part 112, the facility's SPCC plan, and the certifying professional engineer govern.",
  example: spccContainmentVolumeExample.inputs,
  fields: [
    { key: "largest_tank_gal", label: "Largest single container capacity (gal)", kind: "number" },
    { key: "freeboard_pct", label: "Freeboard for precipitation (%)", kind: "number", default: 10, attrs: { step: "any" } },
    { key: "dike_length_ft", label: "Dike length (ft)", kind: "number", attrs: { step: "any" } },
    { key: "dike_width_ft", label: "Dike width (ft)", kind: "number", attrs: { step: "any" } },
    { key: "dike_height_ft", label: "Dike wall height (ft)", kind: "number", attrs: { step: "any" } },
    { key: "other_tank_count", label: "Other tanks standing inside the dike", kind: "number", attrs: { step: "1", min: "0" } },
    { key: "other_tank_diameter_ft", label: "Diameter of each (ft)", kind: "number", attrs: { step: "any" } },
    { key: "other_equipment_ft3", label: "Foundations, skids and other displacement (cu ft)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "r", id: "scv-out-r", label: "Required", value: (r) => fmt(r.required_gal, 0) + " gal (" + fmt(r.required_ft3, 0) + " cu ft) with freeboard" },
    { key: "g", id: "scv-out-g", label: "Dike gross volume", value: (r) => fmt(r.gross_ft3, 0) + " cu ft = " + fmt(r.gross_gal, 0) + " gal" },
    { key: "d", id: "scv-out-d", label: "Displacement", value: (r) => r.displacement_verdict },
    { key: "v", id: "scv-out-v", label: "Net capacity", value: (r) => r.verdict },
    { key: "h", id: "scv-out-h", label: "Wall height needed", value: (r) => r.height_verdict },
    { key: "n", id: "scv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSpccContainmentVolume,
});

// =====================================================================
// spec-v1724: electrostatic precipitator collection efficiency (Deutsch).
// =====================================================================
//
// The exponential is unforgiving at the top end: each equal increment of plate
// area removes the same FRACTION of the remaining penetration, so going from
// 99 to 99.9 percent takes exactly as much additional area as going from 0 to
// 90 did. That identity is asserted in the bounds test.
// dims: in { plate_area_ft2: L^2, gas_acfm: L^3 T^-1, migration_velocity_fps: L T^-1, target_efficiency_pct: dimensionless } out: { efficiency_pct: dimensionless, penetration_pct: dimensionless, deutsch_exponent: dimensionless, area_for_target_ft2: L^2, additional_area_ft2: L^2 }
export function computeEspDeutschEfficiency({
  plate_area_ft2 = 0, gas_acfm = 0, migration_velocity_fps = 0, target_efficiency_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(plate_area_ft2 > 0)) return { error: "Collecting plate area must be positive (sq ft)." };
  if (!(gas_acfm > 0)) return { error: "Gas flow must be positive (acfm)." };
  if (!(migration_velocity_fps > 0)) return { error: "Migration velocity must be positive (ft/s)." };
  if (target_efficiency_pct < 0 || target_efficiency_pct >= 100) return { error: "The target efficiency must be at least 0 and below 100 percent -- the Deutsch equation approaches 100 asymptotically and never reaches it." };
  // Deutsch: eta = 1 - exp(-A w / Q), with Q in cubic feet per SECOND so the
  // migration velocity's own units cancel.
  const gas_cfs = gas_acfm / 60;
  const deutsch_exponent = plate_area_ft2 * migration_velocity_fps / gas_cfs;
  const penetration = Math.exp(-deutsch_exponent);
  const efficiency_pct = (1 - penetration) * 100;
  const penetration_pct = penetration * 100;
  const specific_collection_area = plate_area_ft2 / (gas_acfm / 1000);
  // The area a target needs, and what the increment costs.
  const has_target = target_efficiency_pct > 0;
  const area_for_target_ft2 = has_target
    ? -Math.log(1 - target_efficiency_pct / 100) * gas_cfs / migration_velocity_fps
    : 0;
  const additional_area_ft2 = has_target ? area_for_target_ft2 - plate_area_ft2 : 0;
  const area_ratio = has_target && plate_area_ft2 > 0 ? area_for_target_ft2 / plate_area_ft2 : 0;
  const target_verdict = !has_target
    ? "(no target efficiency entered)"
    : additional_area_ft2 > 0
      ? fmt(target_efficiency_pct, 2) + "% needs " + fmt(area_for_target_ft2, 0) + " sq ft, which is " + fmt(additional_area_ft2, 0) + " sq ft more -- " + fmt(area_ratio, 2) + " times the plate installed"
      : fmt(target_efficiency_pct, 2) + "% needs only " + fmt(area_for_target_ft2, 0) + " sq ft, which the installed " + fmt(plate_area_ft2, 0) + " sq ft already exceeds";
  // The shape of the economics, stated as the identity that drives it: the
  // area from 99 to 99.9 equals the area from 0 to 90, because each is one
  // factor of ten off the penetration.
  const area_per_decade_ft2 = Math.log(10) * gas_cfs / migration_velocity_fps;
  const area_90 = area_per_decade_ft2;
  const area_99 = 2 * area_per_decade_ft2;
  const area_999 = 3 * area_per_decade_ft2;
  const decade_verdict = "each factor of ten off the penetration costs the same " + fmt(area_per_decade_ft2, 0) + " sq ft: " + fmt(area_90, 0) + " sq ft reaches 90%, " + fmt(area_99, 0) + " reaches 99%, and " + fmt(area_999, 0) + " reaches 99.9% -- so the last nine costs exactly as much plate as the first ninety percent did, which is the whole economics of precipitator design";
  if (![deutsch_exponent, efficiency_pct, penetration_pct, area_for_target_ft2, additional_area_ft2, area_per_decade_ft2].every(Number.isFinite)) return { error: "Deutsch math is not a finite value." };
  return {
    gas_cfs, deutsch_exponent, efficiency_pct, penetration_pct, specific_collection_area,
    has_target, area_for_target_ft2, additional_area_ft2, area_ratio, target_verdict,
    area_per_decade_ft2, area_90, area_99, area_999, decade_verdict,
    note: "The collection efficiency an electrostatic precipitator reaches, by the Deutsch equation, and what buying more of it costs. Efficiency is one minus the exponential of the plate area times the migration velocity over the gas flow, and the exponential is what governs ESP design and economics. Each equal increment of plate area removes the same FRACTION of the remaining penetration rather than the same amount of dust, so efficiency approaches 100 percent asymptotically and never reaches it -- and going from 99 to 99.9 percent requires exactly as much additional plate as going from zero to 90 percent did. That is why high-efficiency precipitators are enormous and why the last increment of performance is the expensive one, and it is reported here as a per-decade area rather than left as an observation. The migration velocity is the weak input and it is entered rather than predicted. It is the speed at which charged particles drift toward the plate, and it depends on particle size, on the electrical field, and above all on the dust's RESISTIVITY -- so in practice it is fitted backwards from the performance of a similar installation on a similar dust rather than calculated from first principles. A Deutsch calculation is therefore only as good as the migration velocity it was given, and quoting one to three figures overstates what is known. Resistivity is the dominant variable in real performance and it cuts both ways. Too high and the collected layer holds its charge, the field across it breaks down, and back corona destroys collection; too low and particles lose their charge on contact and re-entrain. Conditioning the gas, usually by temperature or by an additive, is how resistivity is managed, and it can matter more than plate area. Rapping is the other loss: the plates must be rapped to release the cake, and each rap re-entrains some of it, which is why measured efficiency falls short of the Deutsch value. The modified Deutsch-Anderson form with a fitted exponent is often used instead for that reason. This is a screening calculation on an ENTERED migration velocity; it does not model resistivity, conditioning, rapping re-entrainment, sneakage around the fields, or gas distribution, and it does not size the fields, the transformer-rectifier sets or the hoppers. The precipitator manufacturer's data and a qualified air quality engineer govern.",
  };
}
export const espDeutschEfficiencyExample = { inputs: { plate_area_ft2: 12000, gas_acfm: 60000, migration_velocity_fps: 0.2, target_efficiency_pct: 99.0 } };
AIRQUALITY_RENDERERS["esp-deutsch-efficiency"] = _simpleRenderer({
  citation: "Citation: the Deutsch equation for electrostatic precipitator collection, eta = 1 - exp(-A w / Q), with A the collecting plate area, w the migration velocity and Q the gas flow on a consistent time basis. The migration velocity is ENTERED because it depends on particle size, field strength and above all dust RESISTIVITY, and in practice is fitted from the performance of a similar installation rather than predicted. A screening calculation: it does not model resistivity, back corona, gas conditioning, rapping re-entrainment, sneakage around the fields or gas distribution, and it does not size the fields, transformer-rectifier sets or hoppers. Measured efficiency commonly falls short of the Deutsch value, which is why a modified form with a fitted exponent is often used. The manufacturer's data govern.",
  example: espDeutschEfficiencyExample.inputs,
  fields: [
    { key: "plate_area_ft2", label: "Collecting plate area (sq ft)", kind: "number" },
    { key: "gas_acfm", label: "Gas flow (acfm)", kind: "number" },
    { key: "migration_velocity_fps", label: "Migration velocity (ft/s)", kind: "number", attrs: { step: "any" } },
    { key: "target_efficiency_pct", label: "Target efficiency (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "e", id: "ede-out-e", label: "Collection efficiency", value: (r) => fmt(r.efficiency_pct, 2) + "%, leaving " + fmt(r.penetration_pct, 2) + "% penetration" },
    { key: "x", id: "ede-out-x", label: "Deutsch exponent", value: (r) => fmt(r.deutsch_exponent, 3) + " (A w / Q), at " + fmt(r.specific_collection_area, 0) + " sq ft per 1,000 acfm" },
    { key: "t", id: "ede-out-t", label: "For the target", value: (r) => r.target_verdict },
    { key: "d", id: "ede-out-d", label: "What each nine costs", value: (r) => r.decade_verdict },
    { key: "n", id: "ede-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEspDeutschEfficiency,
});

// =====================================================================
// spec-v1725: activated carbon adsorber bed life and breakthrough.
// =====================================================================
//
// spec-v1725 left THREE unrendered python placeholders in its worked example
// (5.95 days, 18 operating days, 40 percent shorter) -- the seventh, eighth and
// ninth of this program. All three are computed here.
// dims: in { carbon_lb: M, working_capacity_pct: dimensionless, loading_lb_h: M T^-1, operating_hours_per_day: T, degraded_capacity_pct: dimensionless } out: { bed_capacity_lb: M, bed_life_hours: T, bed_life_days: T, operating_days: T, degraded_life_hours: T, life_lost_pct: dimensionless }
export function computeCarbonBedLife({
  carbon_lb = 0, working_capacity_pct = 0, loading_lb_h = 0,
  operating_hours_per_day = 8, degraded_capacity_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(carbon_lb > 0)) return { error: "Carbon mass must be positive (lb)." };
  if (!(working_capacity_pct > 0 && working_capacity_pct <= 100)) return { error: "Working capacity must be above 0 and at most 100 percent." };
  if (!(loading_lb_h > 0)) return { error: "The solvent loading rate must be positive (lb/h)." };
  if (!(operating_hours_per_day > 0 && operating_hours_per_day <= 24)) return { error: "Operating hours per day must be above 0 and at most 24." };
  if (degraded_capacity_pct < 0 || degraded_capacity_pct > 100) return { error: "The degraded working capacity must be between 0 and 100 percent." };
  const bed_capacity_lb = carbon_lb * working_capacity_pct / 100;
  const bed_life_hours = bed_capacity_lb / loading_lb_h;
  const bed_life_days = bed_life_hours / 24;
  const operating_days = bed_life_hours / operating_hours_per_day;
  // The degraded case. Humidity is the usual cause: water competes for the
  // same adsorption sites, and capacity falls with temperature too.
  const has_degraded = degraded_capacity_pct > 0 && degraded_capacity_pct < working_capacity_pct;
  const degraded_capacity_lb = has_degraded ? carbon_lb * degraded_capacity_pct / 100 : 0;
  const degraded_life_hours = has_degraded ? degraded_capacity_lb / loading_lb_h : 0;
  const degraded_operating_days = has_degraded ? degraded_life_hours / operating_hours_per_day : 0;
  const life_lost_pct = has_degraded ? (1 - degraded_life_hours / bed_life_hours) * 100 : 0;
  const degraded_verdict = !has_degraded
    ? "(no degraded working capacity entered, or it is not below the design one)"
    : "at a " + fmt(degraded_capacity_pct, 1) + "% working capacity the bed lasts " + fmt(degraded_life_hours, 0) + " hours (" + fmt(degraded_operating_days, 1) + " operating days), " + fmt(life_lost_pct, 0) + "% shorter -- from humidity or temperature alone, with nothing else changed. A bed sized on dry-air capacity and installed on a humid stream reaches breakthrough that much sooner than its change-out schedule expects";
  // The reason a schedule is not a substitute for monitoring.
  const breakthrough_verdict = "breakthrough is a CLIFF, not a slope: the bed removes essentially everything until its mass transfer zone reaches the outlet, and then the outlet concentration rises quickly toward the inlet. A bed at 95% of its life is performing perfectly and one at 105% is doing nothing, so there is no gradual degradation to notice and outlet monitoring is the only reliable detection -- a timer set to " + fmt(operating_days, 1) + " operating days is a guess about the capacity, not a measurement of the outlet";
  if (![bed_capacity_lb, bed_life_hours, bed_life_days, operating_days, degraded_life_hours, life_lost_pct].every(Number.isFinite)) return { error: "Carbon bed math is not a finite value." };
  return {
    bed_capacity_lb, bed_life_hours, bed_life_days, operating_days,
    has_degraded, degraded_capacity_lb, degraded_life_hours, degraded_operating_days, life_lost_pct,
    degraded_verdict, breakthrough_verdict,
    note: "How long an activated carbon bed lasts before breakthrough, and why a change-out schedule built on that number is not a control strategy. Bed life is the carbon's mass times its working capacity divided by the rate solvent arrives -- simple arithmetic whose every term is uncertain. Working capacity is pounds of solvent held per pound of carbon at the ACTUAL operating conditions, commonly a fraction of the isotherm capacity, and it is entered rather than assumed because it depends on the solvent, the concentration, the temperature and the humidity. Humidity is the term that surprises people. Water competes for the same adsorption sites, so a stream at high relative humidity can cut the working capacity by a third or more, and a bed sized on dry-air data and installed on a humid stream reaches breakthrough far sooner than its schedule expects. Temperature works the same way: capacity falls as the gas warms, which is why an adsorber downstream of a process that has warmed up performs worse in the afternoon than it did at start-up. Both cases are the same arithmetic with a smaller capacity, which is why the degraded case is computed here beside the design one. Breakthrough is a CLIFF and that is what makes bed life different from filter life. A carbon bed removes essentially everything until its mass transfer zone reaches the outlet, and then the outlet concentration rises quickly toward the inlet -- so a bed at 95 percent of its life is performing perfectly and a bed at 105 percent is doing nothing. There is no gradual degradation to notice, no rising pressure drop to trend, and the only reliable detection is monitoring the outlet. A timer is a guess about capacity rather than a measurement of performance, and it fails silently in the direction of emissions. This computes life from ENTERED capacity and loading; it does not derive working capacity from an isotherm, model the mass transfer zone or its length, size the bed for a residence time or a face velocity, address regeneration by steam or hot gas and the recovered solvent it produces, evaluate bed fires (a real hazard with ketones and with high-temperature regeneration), or address the vessel and its ducting. The carbon supplier's isotherm data at the operating conditions, outlet monitoring, and the permit govern.",
  };
}
export const carbonBedLifeExample = { inputs: { carbon_lb: 2000, working_capacity_pct: 10, loading_lb_h: 1.4, operating_hours_per_day: 8, degraded_capacity_pct: 6 } };
AIRQUALITY_RENDERERS["carbon-bed-life"] = _simpleRenderer({
  citation: "Citation: adsorber bed life = carbon mass x working capacity / the solvent loading rate, as activated carbon practice writes it, with working capacity ENTERED at the ACTUAL operating conditions because water competes for adsorption sites and capacity falls with humidity and with temperature. Breakthrough is a cliff rather than a slope, so outlet monitoring rather than a timer is what detects it. It does not derive working capacity from an isotherm, model the mass transfer zone, size the bed for residence time or face velocity, address regeneration and the recovered solvent, evaluate bed fires (a real hazard with ketones and with high-temperature regeneration), or address the vessel and ducting. The carbon supplier's isotherm data at the operating conditions and the permit govern.",
  example: carbonBedLifeExample.inputs,
  fields: [
    { key: "carbon_lb", label: "Carbon in the bed (lb)", kind: "number" },
    { key: "working_capacity_pct", label: "Working capacity (% of carbon mass)", kind: "number", attrs: { step: "any" } },
    { key: "loading_lb_h", label: "Solvent loading rate (lb/h)", kind: "number", attrs: { step: "any" } },
    { key: "operating_hours_per_day", label: "Operating hours per day", kind: "number", default: 8, attrs: { step: "any" } },
    { key: "degraded_capacity_pct", label: "Degraded working capacity, humid or warm (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "c", id: "cbl-out-c", label: "Bed capacity", value: (r) => fmt(r.bed_capacity_lb, 1) + " lb of solvent" },
    { key: "l", id: "cbl-out-l", label: "Bed life", value: (r) => fmt(r.bed_life_hours, 0) + " hours -- " + fmt(r.bed_life_days, 1) + " days continuous, or " + fmt(r.operating_days, 1) + " operating days at the entered schedule" },
    { key: "d", id: "cbl-out-d", label: "If capacity degrades", value: (r) => r.degraded_verdict },
    { key: "b", id: "cbl-out-b", label: "Why a timer is not enough", value: (r) => r.breakthrough_verdict },
    { key: "n", id: "cbl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCarbonBedLife,
});

// =====================================================================
// spec-v1726: stack plume rise and effective stack height (Briggs).
// =====================================================================
//
// spec-v1726 declines to compute its own headline: it asserts the rise for its
// worked stack is "on the order of a hundred feet" and totals 220 ft of
// effective height. Briggs on those inputs gives 185 ft of rise and 305 ft
// effective -- and the spec's "factor of about four" on concentration follows
// from the asserted height, not the computed one. It is 6.5.
// dims: in { stack_height_ft: L, stack_diameter_ft: L, exit_velocity_fps: L T^-1, exit_temp_f: T, ambient_temp_f: T, wind_mph: L T^-1 } out: { buoyancy_flux: L^4 T^-3, plume_rise_ft: L, effective_height_ft: L, height_ratio: dimensionless, concentration_factor: dimensionless }
export function computePlumeRiseBriggs({
  stack_height_ft = 0, stack_diameter_ft = 0, exit_velocity_fps = 0,
  exit_temp_f = 0, ambient_temp_f = 0, wind_mph = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(stack_height_ft > 0)) return { error: "Stack height must be positive (ft)." };
  if (!(stack_diameter_ft > 0)) return { error: "Stack diameter must be positive (ft)." };
  if (!(exit_velocity_fps > 0)) return { error: "Exit velocity must be positive (ft/s)." };
  if (!(wind_mph > 0)) return { error: "Wind speed must be positive (mph) -- plume rise goes as the reciprocal of wind, and calm conditions need a different treatment entirely." };
  const exit_k = _aqKelvin(exit_temp_f);
  const ambient_k = _aqKelvin(ambient_temp_f);
  if (!(exit_k > 0) || !(ambient_k > 0)) return { error: "Temperatures must be above absolute zero." };
  if (!(exit_k > ambient_k)) return { error: "The stack gas must be warmer than ambient for a buoyant plume -- a cool plume rises on momentum alone, which this does not compute." };
  // Briggs is published in SI, so the calculation converts into it and back.
  const velocity_ms = exit_velocity_fps * _AQ_M_PER_FT;
  const diameter_m = stack_diameter_ft * _AQ_M_PER_FT;
  const wind_ms = wind_mph * _AQ_MPS_PER_MPH;
  const buoyancy_flux = _AQ_G_SI * velocity_ms * diameter_m * diameter_m * (exit_k - ambient_k) / (4 * exit_k);
  const is_low_flux = buoyancy_flux < _AQ_BRIGGS_F_BREAK;
  const plume_rise_m = is_low_flux
    ? _AQ_BRIGGS_COEFF_LOW * Math.pow(buoyancy_flux, _AQ_BRIGGS_EXP_LOW) / wind_ms
    : _AQ_BRIGGS_COEFF_HIGH * Math.pow(buoyancy_flux, _AQ_BRIGGS_EXP_HIGH) / wind_ms;
  const plume_rise_ft = plume_rise_m / _AQ_M_PER_FT;
  const effective_height_ft = stack_height_ft + plume_rise_ft;
  const height_ratio = effective_height_ft / stack_height_ft;
  // Ground-level concentration falls roughly with the SQUARE of effective
  // height, so ignoring plume rise overstates it by that ratio squared.
  const concentration_factor = height_ratio * height_ratio;
  const rise_exceeds_stack = plume_rise_ft > stack_height_ft;
  const rise_verdict = rise_exceeds_stack
    ? "the plume rises " + fmt(plume_rise_ft, 0) + " ft, MORE than the " + fmt(stack_height_ft, 0) + " ft stack itself, for an effective height of " + fmt(effective_height_ft, 0) + " ft"
    : "the plume rises " + fmt(plume_rise_ft, 0) + " ft above the " + fmt(stack_height_ft, 0) + " ft stack, for an effective height of " + fmt(effective_height_ft, 0) + " ft";
  const branch_verdict = "buoyancy flux " + fmt(buoyancy_flux, 1) + " m^4/s^3, " + (is_low_flux ? "BELOW" : "at or above") + " the 55 m^4/s^3 break, so the rise follows F^" + (is_low_flux ? "0.75" : "0.6") + " over the wind speed";
  const concentration_verdict = "ground-level concentration falls roughly with the SQUARE of effective height, so ignoring plume rise entirely would overstate it by a factor of about " + fmt(concentration_factor, 1) + " -- which is why a dispersion estimate without plume rise is not a useful estimate";
  // Wind is the term that trades against itself: rise is exactly inverse in it.
  const double_wind_rise_ft = plume_rise_ft / 2;
  const double_wind_effective_ft = stack_height_ft + double_wind_rise_ft;
  const wind_verdict = "rise is exactly inverse in wind speed, so at " + fmt(2 * wind_mph, 1) + " mph it halves to " + fmt(double_wind_rise_ft, 0) + " ft and the effective height falls to " + fmt(double_wind_effective_ft, 0) + " ft -- a strong wind dilutes the plume more AND holds it down, and the two effects trade against each other";
  if (![buoyancy_flux, plume_rise_ft, effective_height_ft, height_ratio, concentration_factor].every(Number.isFinite)) return { error: "Plume rise math is not a finite value." };
  return {
    buoyancy_flux, is_low_flux, plume_rise_ft, effective_height_ft, height_ratio,
    concentration_factor, rise_exceeds_stack, rise_verdict, branch_verdict,
    concentration_verdict, double_wind_rise_ft, double_wind_effective_ft, wind_verdict,
    note: "The height a buoyant plume actually reaches, which is what governs ground-level concentration rather than the height of the stack. Briggs computes a buoyancy flux from the stack gas velocity, the stack diameter and the temperature difference, and the final rise in neutral conditions follows that flux to a fractional power divided by the wind speed. The rise is frequently LARGER than the stack itself: a hot plume from a modest stack can rise well over a hundred feet on a light wind, so the effective release height can be double the physical one. Ignoring plume rise makes a dispersion estimate wildly conservative; assuming too much makes it dangerously optimistic, and since ground-level concentration falls roughly with the square of effective height, the error compounds. Wind is the term that trades against itself, and that is the counterintuitive part. A strong wind dilutes the plume more, but it also bends it over and reduces the rise, lowering the effective height -- and the rise is exactly inverse in wind speed, so doubling the wind halves it. The two effects work in opposite directions and the worst-case wind for ground-level concentration is neither the calmest nor the strongest, which is why a real dispersion analysis runs a full year of hourly meteorology rather than a design condition. Two limits bound this hard. Stability is not modelled: the neutral-condition relations used here are suppressed by stable air, where a plume can be trapped, and enhanced by unstable air. And DOWNWASH is not modelled at all -- a stack too short relative to nearby buildings has its plume pulled down into the building wake, which can eliminate the rise entirely and is why the good engineering practice stack height rules exist. A plume that downwashes has an effective height at or below the stack, and no buoyancy calculation will say so. This is a screening estimate of FINAL rise in neutral conditions on a buoyant plume; it does not compute momentum rise for a cool high-velocity plume, transitional rise close to the stack, stability effects, downwash, or any ground-level concentration. A regulatory dispersion model, the applicable modelling guideline, and a qualified meteorologist or air quality professional govern.",
  };
}
export const plumeRiseBriggsExample = { inputs: { stack_height_ft: 120, stack_diameter_ft: 5, exit_velocity_fps: 55, exit_temp_f: 350, ambient_temp_f: 60, wind_mph: 12 } };
AIRQUALITY_RENDERERS["plume-rise-briggs"] = _simpleRenderer({
  citation: "Citation: the Briggs plume rise relations by name -- buoyancy flux F = g v d^2 (Ts - Ta) / (4 Ts), and neutral-condition FINAL rise of 21.425 F^0.75 / u below a 55 m^4/s^3 flux and 38.71 F^0.6 / u at or above it -- published in SI and converted here at 0.3048 m per foot and 1,609.344 m per mile, both exact. A screening estimate for a BUOYANT plume: it does not compute momentum rise for a cool high-velocity plume, transitional rise close to the stack, atmospheric stability effects, building DOWNWASH (which can eliminate the rise entirely and is why good engineering practice stack height rules exist), or any ground-level concentration. A regulatory dispersion model, the applicable modelling guideline, and a qualified air quality professional govern.",
  example: plumeRiseBriggsExample.inputs,
  fields: [
    { key: "stack_height_ft", label: "Stack height (ft)", kind: "number", attrs: { step: "any" } },
    { key: "stack_diameter_ft", label: "Stack exit diameter (ft)", kind: "number", attrs: { step: "any" } },
    { key: "exit_velocity_fps", label: "Exit velocity (ft/s)", kind: "number", attrs: { step: "any" } },
    { key: "exit_temp_f", label: "Exit gas temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "ambient_temp_f", label: "Ambient temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "wind_mph", label: "Wind speed at stack top (mph)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "f", id: "prb-out-f", label: "Buoyancy flux", value: (r) => r.branch_verdict },
    { key: "r", id: "prb-out-r", label: "Plume rise", value: (r) => r.rise_verdict },
    { key: "c", id: "prb-out-c", label: "Why it matters", value: (r) => r.concentration_verdict },
    { key: "w", id: "prb-out-w", label: "At double the wind", value: (r) => r.wind_verdict },
    { key: "n", id: "prb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePlumeRiseBriggs,
});
