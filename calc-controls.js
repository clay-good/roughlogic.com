// Group A and Group C: building automation and controls bench.
// spec-v1818..v1823 (scope-trade-expansion-3) establish this new lazy-loaded
// renderer module for the arithmetic a controls engineer and a BAS technician
// do: what a 4-20 mA loop actually resolves, how often two-position equipment
// starts, how much trend data a site makes and where it is silently lost, how
// long a field bus takes to pass its token, how much torque a damper needs,
// and what a measurement chain is really worth. Tiles:
//   v1818 transmitter-span-scaling   v1819 deadband-cycling-rate
//   v1820 trend-log-storage          v1821 mstp-segment-loading
//   v1822 damper-actuator-torque     v1823 loop-error-stackup
// Two keep group: "A" (the two instrumentation tiles) and four take "C" (a
// tile group letter is independent of the module that holds it -- the
// v28/v70..v100 split precedent). All GOVERNANCE.general: the manufacturers
// specifications, ASHRAE Standard 135, a traceable calibration, and the
// controls engineer govern. See spec-v1818.md through spec-v1823.md.
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

export const CONTROLS_RENDERERS = {};

// A 4-20 mA loop spans 16 mA between its two endpoints.
const _MA_LO = 4, _MA_HI = 20, _MA_SPAN = 16;
// The standard damper actuator size ladder spec-v1822 names. Bundled as a
// constant rather than taken as a structured list input: it is a product
// ladder, not per-row user data, and every figure in the spec's worked example
// comes from these four sizes.
const _ACTUATOR_SIZES_IN_LB = [35, 70, 140, 180];

// ===================== spec-v1818: transmitter span, accuracy, 4-20 mA scaling =====================

// dims: in { lower_range_value: dimensionless, upper_range_value: dimensionless, upper_range_limit: dimensionless, loop_ma: I, accuracy_pct: dimensionless, low_reading_value: dimensionless, alt_upper_range_value: dimensionless } out: { value_eng: dimensionless, span_eng: dimensionless, turndown: dimensionless, err_span_eng: dimensionless, err_url_eng: dimensionless }
export function computeTransmitterSpanScaling({ lower_range_value = 0, upper_range_value = 0, upper_range_limit = 0, loop_ma = 12, accuracy_pct = 0.1, low_reading_value = 0, alt_upper_range_value = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(upper_range_value > lower_range_value)) return { error: "Upper range value must exceed the lower range value." };
  if (!(upper_range_limit > 0)) return { error: "Sensor upper range limit must be positive." };
  if (!(accuracy_pct > 0)) return { error: "Quoted accuracy must be positive (percent)." };
  const span_eng = upper_range_value - lower_range_value;
  if (span_eng > upper_range_limit) return { error: "Calibrated span cannot exceed the sensor upper range limit." };
  if (!(loop_ma >= _MA_LO && loop_ma <= _MA_HI)) return { error: "Loop current must be between 4 and 20 mA." };
  const value_eng = lower_range_value + (loop_ma - _MA_LO) / _MA_SPAN * span_eng;
  const turndown = upper_range_limit / span_eng;
  const a = accuracy_pct / 100;
  // The same published figure on the three bases a datasheet may be using.
  const err_span_eng = a * span_eng;
  const err_url_eng = a * upper_range_limit;
  const err_reading_eng = a * Math.abs(value_eng);
  // What the URL basis actually costs, expressed the way the span basis reads.
  const err_url_as_pct_of_span = 100 * err_url_eng / span_eng;
  const basis_ratio = err_url_eng / err_span_eng;
  const low_used = low_reading_value > 0;
  const err_url_at_low_reading_pct = low_used ? 100 * err_url_eng / low_reading_value : null;
  const low_reading_pct_of_span = low_used ? 100 * low_reading_value / span_eng : null;
  const compared = alt_upper_range_value > lower_range_value;
  const alt_span_eng = compared ? alt_upper_range_value - lower_range_value : null;
  const alt_turndown = compared ? upper_range_limit / alt_span_eng : null;
  const alt_err_url_as_pct_of_span = compared ? 100 * err_url_eng / alt_span_eng : null;
  return {
    value_eng, span_eng, turndown, err_span_eng, err_url_eng, err_reading_eng,
    err_url_as_pct_of_span, basis_ratio, err_url_at_low_reading_pct, low_reading_pct_of_span,
    alt_span_eng, alt_turndown, alt_err_url_as_pct_of_span,
    note: "READ THE ACCURACY BASIS: '0.1% of span' and '0.1% of URL' are the same statement ONLY at a turndown of 1:1, and a specification that does not state a basis has not stated an accuracy. The absolute error on the URL basis is FIXED by the sensor limit, so as a percentage of the calibrated span it grows in direct proportion to turndown -- a device ranged to a tenth of its limit performs exactly to a 0.1% specification and delivers 1.0% of its span. Selecting a wide-range device and turning it down for flexibility is a reasonable engineering choice that costs accuracy in a way the datasheet does not make obvious. THE BOTTOM OF THE RANGE IS WORSE AGAIN and it is where control frequently lives: a fixed absolute error is a large percentage of a small reading, and low-flow, low-pressure and low-load are exactly the conditions a modern control sequence spends most of its time in. This does not calibrate anything -- the actual error is established against a traceable standard at the range in use, and the published figure is a REFERENCE accuracy that excludes ambient temperature effect, static pressure effect, long-term drift, mounting position and vibration, all specified separately and frequently larger. The sensing element's installation error commonly dominates everything the instrument contributes. This is the LINEAR case; a differential-pressure flow transmitter maps to the square root of the signal and has a steeper problem at the bottom of its range. The transmitter manufacturer's specification with its stated accuracy basis, a calibration against a traceable standard, and the controls engineer govern.",
  };
}
const transmitterSpanScalingExample = { inputs: { lower_range_value: 0, upper_range_value: 100, upper_range_limit: 250, loop_ma: 12, accuracy_pct: 0.1, low_reading_value: 20, alt_upper_range_value: 25 } };
CONTROLS_RENDERERS["transmitter-span-scaling"] = _simpleRenderer({
  citation: "Citation: the linear 4-20 mA scaling relation value = LRV + (mA - 4)/16 x span, and the three accuracy bases a datasheet may use -- percent of calibrated SPAN, percent of sensor UPPER RANGE LIMIT, and percent of READING. Turndown is URL / span. The transmitter manufacturer's specification with its stated accuracy basis and a calibration against a traceable standard govern.",
  example: transmitterSpanScalingExample.inputs,
  fields: [
    { key: "lower_range_value", label: "Lower range value (LRV, eng units)", kind: "number", default: 0, attrs: { step: "any" } },
    { key: "upper_range_value", label: "Upper range value (URV, eng units)", kind: "number" },
    { key: "upper_range_limit", label: "Sensor upper range limit (URL, eng units)", kind: "number" },
    { key: "loop_ma", label: "Loop current (mA)", kind: "number", default: 12 },
    { key: "accuracy_pct", label: "Quoted accuracy (%)", kind: "number", default: 0.1 },
    { key: "low_reading_value", label: "Low reading of interest (eng units, 0 to skip)", kind: "number", default: 0 },
    { key: "alt_upper_range_value", label: "Narrower calibrated URV (eng units, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "v", id: "tss-out-v", label: "Value at the loop current", value: (r) => fmt(r.value_eng, 2) + " eng units" },
    { key: "s", id: "tss-out-s", label: "Calibrated span and turndown", value: (r) => fmt(r.span_eng, 2) + " span, " + fmt(r.turndown, 2) + ":1 turndown" },
    { key: "e", id: "tss-out-e", label: "Error on each basis", value: (r) => fmt(r.err_span_eng, 3) + " of span, " + fmt(r.err_url_eng, 3) + " of URL, " + fmt(r.err_reading_eng, 3) + " of reading (eng units)" },
    { key: "u", id: "tss-out-u", label: "URL basis as percent of span", value: (r) => fmt(r.err_url_as_pct_of_span, 2) + " % (" + fmt(r.basis_ratio, 2) + " x the span-basis error)" },
    { key: "l", id: "tss-out-l", label: "At the low reading", value: (r) => r.err_url_at_low_reading_pct === null ? "no low reading entered" : fmt(r.err_url_at_low_reading_pct, 2) + " % of reading at " + fmt(r.low_reading_pct_of_span, 0) + " % of span" },
    { key: "a", id: "tss-out-a", label: "At the narrower span", value: (r) => r.alt_span_eng === null ? "not compared" : fmt(r.alt_span_eng, 2) + " span, " + fmt(r.alt_turndown, 2) + ":1 turndown, URL basis " + fmt(r.alt_err_url_as_pct_of_span, 2) + " % of span" },
    { key: "n", id: "tss-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTransmitterSpanScaling,
});

// ===================== spec-v1819: deadband, differential, equipment cycling =====================

// dims: in { capacitance_btu_f: M L^2 T^-2, ua_btu_hr_f: M L^2 T^-3, setpoint_f: T, outdoor_f: T, capacity_btu_hr: M L^2 T^-3, deadband_f: T, alt_deadband_f: T, alt_capacity_btu_hr: M L^2 T^-3 } out: { load_btu_hr: M L^2 T^-3, on_min: T, off_min: T, cycles_per_hour: T^-1, duty_pct: dimensionless }
export function computeDeadbandCyclingRate({ capacitance_btu_f = 0, ua_btu_hr_f = 0, setpoint_f = 70, outdoor_f = 30, capacity_btu_hr = 0, deadband_f = 2, alt_deadband_f = 0, alt_capacity_btu_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(capacitance_btu_f > 0)) return { error: "Space thermal capacitance must be positive (Btu/degF)." };
  if (!(ua_btu_hr_f > 0)) return { error: "Loss coefficient UA must be positive (Btu/hr-degF)." };
  if (!(capacity_btu_hr > 0)) return { error: "Equipment capacity must be positive (Btu/hr)." };
  if (!(deadband_f > 0)) return { error: "Deadband must be positive (degF)." };
  if (!(outdoor_f < setpoint_f)) return { error: "Outdoor temperature must be below the setpoint." };
  const load_btu_hr = ua_btu_hr_f * (setpoint_f - outdoor_f);
  if (!(capacity_btu_hr > load_btu_hr)) return { error: "Equipment capacity must exceed the load, or it never cycles off." };
  const cycleAt = (Q, db) => {
    const on_hr = capacitance_btu_f * db / (Q - load_btu_hr);
    const off_hr = capacitance_btu_f * db / load_btu_hr;
    return {
      on_min: on_hr * 60, off_min: off_hr * 60,
      cycles_per_hour: 1 / (on_hr + off_hr),
      duty_pct: 100 * load_btu_hr / Q,
      max_cycles_per_hour: Q / (4 * capacitance_btu_f * db),
      load_at_max_btu_hr: Q / 2,
      outdoor_at_max_f: setpoint_f - (Q / 2) / ua_btu_hr_f,
    };
  };
  const base = cycleAt(capacity_btu_hr, deadband_f);
  const dbCompared = alt_deadband_f > 0;
  const capCompared = alt_capacity_btu_hr > load_btu_hr;
  const altDb = dbCompared ? cycleAt(capacity_btu_hr, alt_deadband_f) : null;
  const altCap = capCompared ? cycleAt(alt_capacity_btu_hr, deadband_f) : null;
  return {
    load_btu_hr,
    on_min: base.on_min, off_min: base.off_min, cycles_per_hour: base.cycles_per_hour,
    duty_pct: base.duty_pct, max_cycles_per_hour: base.max_cycles_per_hour,
    load_at_max_btu_hr: base.load_at_max_btu_hr, outdoor_at_max_f: base.outdoor_at_max_f,
    alt_deadband_cycles_per_hour: altDb ? altDb.cycles_per_hour : null,
    alt_deadband_on_min: altDb ? altDb.on_min : null,
    alt_deadband_duty_pct: altDb ? altDb.duty_pct : null,
    alt_capacity_cycles_per_hour: altCap ? altCap.cycles_per_hour : null,
    alt_capacity_duty_pct: altCap ? altCap.duty_pct : null,
    alt_capacity_max_cycles_per_hour: altCap ? altCap.max_cycles_per_hour : null,
    alt_capacity_outdoor_at_max_f: altCap ? altCap.outdoor_at_max_f : null,
    note: "DEADBAND AND CYCLING ARE INVERSELY PROPORTIONAL, so halving the band to hold a tighter temperature exactly DOUBLES the number of starts -- and starts are what wear equipment, cost efficiency through repeated warm-up and purge, and in a compressor risk liquid slugging on a short restart. Control tightness is bought in equipment life at one for one. THE DUTY CYCLE DOES NOT DEPEND ON THE DEADBAND AT ALL: the device runs for the fraction of time the load demands regardless of how the band is set, so a narrow band does not make equipment run more, it makes it START more, which is a different and more damaging thing. OVERSIZING WORKS THROUGH THE MAXIMUM RATHER THAN THE AVERAGE. The peak cycling rate is capacity / (4 x capacitance x deadband), so it scales DIRECTLY with capacity, and the peak occurs at 50% duty -- which an oversized unit reaches on a COLDER day than a right-sized one, not a milder one. An oversized unit cycles more than a right-sized one at EVERY load, not only in mild weather. This is a first-order model for understanding the trade, not a simulation: a real space is not a single capacitance with a single loss coefficient, and effective capacitance is not measurable with any precision. Equipment is not instantaneous either -- start-up transients, purge and post-purge, compressor pull-down, and anti-short-cycle timers change the real cycle, and a timer enforcing a minimum off period decouples the rate from this relation entirely. Modulating, staged and variable-speed equipment does not cycle this way at all and is the usual answer to oversizing. Most equipment wants no more than about 6 cycles per hour. The equipment manufacturer's minimum cycle and off-time requirements and the controls engineer govern.",
  };
}
const deadbandCyclingRateExample = { inputs: { capacitance_btu_f: 1000, ua_btu_hr_f: 500, setpoint_f: 70, outdoor_f: 30, capacity_btu_hr: 25000, deadband_f: 2, alt_deadband_f: 1, alt_capacity_btu_hr: 50000 } };
CONTROLS_RENDERERS["deadband-cycling-rate"] = _simpleRenderer({
  citation: "Citation: the first-order two-position cycling relation -- on time = C x deadband / (Q - L), off time = C x deadband / L, cycles per hour = L (Q - L) / (C x deadband x Q), with a maximum of Q / (4 C x deadband) at 50 percent duty. A first-order model for the trade, not a simulation. The equipment manufacturer's minimum cycle and off-time requirements govern.",
  example: deadbandCyclingRateExample.inputs,
  fields: [
    { key: "capacitance_btu_f", label: "Space thermal capacitance C (Btu/degF)", kind: "number" },
    { key: "ua_btu_hr_f", label: "Loss coefficient UA (Btu/hr-degF)", kind: "number" },
    { key: "setpoint_f", label: "Setpoint (degF)", kind: "number", default: 70 },
    { key: "outdoor_f", label: "Outdoor temperature (degF)", kind: "number", default: 30, attrs: { step: "any" } },
    { key: "capacity_btu_hr", label: "Equipment capacity Q (Btu/hr)", kind: "number" },
    { key: "deadband_f", label: "Deadband (degF)", kind: "number", default: 2 },
    { key: "alt_deadband_f", label: "Narrower deadband (degF, 0 to skip)", kind: "number", default: 1 },
    { key: "alt_capacity_btu_hr", label: "Larger equipment capacity (Btu/hr, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "l", id: "dcr-out-l", label: "Load at this condition", value: (r) => fmt(r.load_btu_hr, 0) + " Btu/hr" },
    { key: "c", id: "dcr-out-c", label: "Cycle", value: (r) => fmt(r.on_min, 1) + " min on, " + fmt(r.off_min, 1) + " min off, " + fmt(r.cycles_per_hour, 2) + " cycles/hr" },
    { key: "d", id: "dcr-out-d", label: "Duty cycle", value: (r) => fmt(r.duty_pct, 0) + " % (independent of the deadband)" },
    { key: "b", id: "dcr-out-b", label: "At the narrower deadband", value: (r) => r.alt_deadband_cycles_per_hour === null ? "not compared" : fmt(r.alt_deadband_cycles_per_hour, 2) + " cycles/hr, " + fmt(r.alt_deadband_on_min, 1) + " min on, duty still " + fmt(r.alt_deadband_duty_pct, 0) + " %" },
    { key: "q", id: "dcr-out-q", label: "At the larger capacity", value: (r) => r.alt_capacity_cycles_per_hour === null ? "not compared" : fmt(r.alt_capacity_cycles_per_hour, 2) + " cycles/hr at " + fmt(r.alt_capacity_duty_pct, 0) + " % duty" },
    { key: "m", id: "dcr-out-m", label: "Worst case", value: (r) => fmt(r.max_cycles_per_hour, 2) + " cycles/hr at 50 % duty, which this equipment meets at " + fmt(r.outdoor_at_max_f, 0) + " degF outdoor" },
    { key: "x", id: "dcr-out-x", label: "Worst case at the larger capacity", value: (r) => r.alt_capacity_max_cycles_per_hour === null ? "not compared" : fmt(r.alt_capacity_max_cycles_per_hour, 2) + " cycles/hr, met at " + fmt(r.alt_capacity_outdoor_at_max_f, 0) + " degF -- a COLDER day, not a milder one" },
    { key: "n", id: "dcr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDeadbandCyclingRate,
});

// ===================== spec-v1820: trend log sample interval and storage =====================

// dims: in { point_count: dimensionless, interval_min: T, retention_years: T, bytes_per_sample: dimensionless, controller_points: dimensionless, controller_buffer_samples: dimensionless, poll_interval_min: T, cov_changes_per_point_day: T^-1, alt_interval_min: T } out: { samples_per_point_year: dimensionless, total_samples: dimensionless, storage_gb: dimensionless, buffer_fill_min: T }
export function computeTrendLogStorage({ point_count = 0, interval_min = 0, retention_years = 0, bytes_per_sample = 16, controller_points = 0, controller_buffer_samples = 0, poll_interval_min = 60, cov_changes_per_point_day = 0, alt_interval_min = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(point_count > 0)) return { error: "Point count must be positive." };
  if (!(interval_min > 0)) return { error: "Sample interval must be positive (min)." };
  if (!(retention_years > 0)) return { error: "Retention period must be positive (years)." };
  if (!(bytes_per_sample > 0)) return { error: "Bytes per sample must be positive." };
  if (!(controller_buffer_samples > 0)) return { error: "Controller buffer depth must be positive (samples)." };
  const samples_per_point_year = (60 / interval_min) * 24 * 365;
  const total_samples = point_count * samples_per_point_year * retention_years;
  const storage_gb = total_samples * bytes_per_sample / 1e9;
  const altUsed = alt_interval_min > 0;
  const alt_total_samples = altUsed ? point_count * (60 / alt_interval_min) * 24 * 365 * retention_years : null;
  const alt_storage_gb = altUsed ? alt_total_samples * bytes_per_sample / 1e9 : null;
  const ctrlUsed = controller_points > 0;
  const controller_samples_per_hour = ctrlUsed ? controller_points * (60 / interval_min) : null;
  const buffer_fill_min = ctrlUsed ? 60 * controller_buffer_samples / controller_samples_per_hour : null;
  const max_poll_interval_min = buffer_fill_min;
  const poll_overruns = ctrlUsed ? poll_interval_min > buffer_fill_min : null;
  // Per poll the controller generates this many samples but can only hand over
  // a bufferful; the rest were overwritten before anyone collected them.
  const samples_per_poll = ctrlUsed ? controller_samples_per_hour * (poll_interval_min / 60) : null;
  const poll_loss_pct = ctrlUsed ? (samples_per_poll > controller_buffer_samples ? 100 * (samples_per_poll - controller_buffer_samples) / samples_per_poll : 0) : null;
  const covUsed = cov_changes_per_point_day > 0;
  const cov_total_samples = covUsed ? point_count * cov_changes_per_point_day * 365 * retention_years : null;
  const cov_storage_gb = covUsed ? cov_total_samples * bytes_per_sample / 1e9 : null;
  const cov_reduction_pct = covUsed ? 100 * (total_samples - cov_total_samples) / total_samples : null;
  const periodic_samples_per_day = 1440 / interval_min;
  const buffer_verdict = !ctrlUsed ? "no controller entered"
    : (poll_overruns
      ? "THE BUFFER OVERRUNS. It fills in " + buffer_fill_min.toFixed(0) + " min and the archive polls every " + poll_interval_min.toFixed(0) + ", so " + poll_loss_pct.toFixed(0) + "% of every poll period is overwritten before it is collected -- and nothing reports an error. The trend plots as a continuous line because the graph joins the points it has."
      : "The archive polls every " + poll_interval_min.toFixed(0) + " min against a buffer that fills in " + buffer_fill_min.toFixed(0) + ", so nothing is lost.");
  return {
    samples_per_point_year, total_samples, storage_gb,
    alt_total_samples, alt_storage_gb,
    controller_samples_per_hour, buffer_fill_min, max_poll_interval_min,
    poll_overruns, poll_loss_pct, samples_per_poll,
    cov_total_samples, cov_storage_gb, cov_reduction_pct, periodic_samples_per_day,
    buffer_verdict,
    note: "STORAGE IS RARELY WHAT STOPS A TREND SYSTEM. A 5,000 point site at a 5 minute interval kept two years is under 20 GB, which is nothing on a modern server -- trend systems fail by collecting too MUCH rather than too little, and the volume itself becomes the reason the data is eventually purged. Choose the interval from the question: 15 minutes for energy analysis, 5 for fault detection, 1 or faster for control diagnosis; energy work wants two years to compare like seasons, commissioning wants weeks. THE CONTROLLER BUFFER IS THE FAILURE THAT ACTUALLY CAUSES TROUBLE AND IT LEAVES NO TRACE. A field controller holds a fixed number of samples and WRAPS when full, so a supervisory poll slower than the fill rate discards the oldest samples before collecting them. The archive receives a continuous-looking series with unmarked gaps, the trend plots as a line because the graph joins the points it has, and any analysis built on it is quietly wrong. The poll interval has to be shorter than the fill time, which the buffer depth and the point count on EACH controller set -- not a preference and not the same number site-wide. CHANGE-OF-VALUE IS THE RIGHT TOOL FOR THE RIGHT POINT, NOT A GENERAL ANSWER: a binary status compresses by orders of magnitude, and a noisy analogue input crossing a small deadband can generate MORE records than periodic sampling would. Bytes per sample varies widely with the historian -- a compressed columnar store is a fraction of the naive figure, a relational table with indexes several times it -- so this is an order-of-magnitude planning number rather than a disk requirement. The controller and historian manufacturers' documentation and the controls engineer govern.",
  };
}
const trendLogStorageExample = { inputs: { point_count: 5000, interval_min: 5, retention_years: 2, bytes_per_sample: 16, controller_points: 200, controller_buffer_samples: 1000, poll_interval_min: 60, cov_changes_per_point_day: 100, alt_interval_min: 1 } };
CONTROLS_RENDERERS["trend-log-storage"] = _simpleRenderer({
  citation: "Citation: the trend volume relation (points x 60/interval x 24 x 365 x years x bytes per sample) and the controller buffer fill relation (buffer depth / the controller's own sample rate), which sets the maximum archive poll interval. Bytes per sample and buffer depth are ENTERED. The controller and historian manufacturers' documentation govern.",
  example: trendLogStorageExample.inputs,
  fields: [
    { key: "point_count", label: "Points logged site-wide", kind: "number" },
    { key: "interval_min", label: "Sample interval (min)", kind: "number", default: 5 },
    { key: "retention_years", label: "Retention (years)", kind: "number", default: 2 },
    { key: "bytes_per_sample", label: "Bytes per sample", kind: "number", default: 16 },
    { key: "alt_interval_min", label: "Faster interval to compare (min, 0 to skip)", kind: "number", default: 1 },
    { key: "controller_points", label: "Points on one controller (0 to skip)", kind: "number", default: 200 },
    { key: "controller_buffer_samples", label: "Controller buffer depth (samples)", kind: "number", default: 1000 },
    { key: "poll_interval_min", label: "Archive poll interval (min)", kind: "number", default: 60 },
    { key: "cov_changes_per_point_day", label: "Change-of-value changes per point per day (0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "y", id: "tls-out-y", label: "Samples per point per year", value: (r) => fmt(r.samples_per_point_year, 0) },
    { key: "t", id: "tls-out-t", label: "Total over the retention", value: (r) => fmt(r.total_samples, 0) + " samples, " + fmt(r.storage_gb, 1) + " GB" },
    { key: "f", id: "tls-out-f", label: "At the faster interval", value: (r) => r.alt_storage_gb === null ? "not compared" : fmt(r.alt_storage_gb, 1) + " GB" },
    { key: "b", id: "tls-out-b", label: "Controller buffer", value: (r) => r.buffer_fill_min === null ? "no controller entered" : fmt(r.controller_samples_per_hour, 0) + " samples/hr, fills in " + fmt(r.buffer_fill_min, 0) + " min -- the maximum poll interval" },
    { key: "o", id: "tls-out-o", label: "Against the poll interval", value: (r) => r.buffer_verdict },
    { key: "v", id: "tls-out-v", label: "Under change-of-value", value: (r) => r.cov_storage_gb === null ? "not compared" : fmt(r.cov_storage_gb, 1) + " GB, " + fmt(r.cov_reduction_pct, 0) + " % less -- and only because it is fewer than the " + fmt(r.periodic_samples_per_day, 0) + " periodic samples a day" },
    { key: "n", id: "tls-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTrendLogStorage,
});

// ===================== spec-v1821: BACnet MS/TP segment loading =====================

// dims: in { baud: T^-1, device_count: dimensionless, token_octets: dimensionless, turnaround_bits: dimensionless, frame_octets: dimensionless, transmitting_share: dimensionless, alt_device_count: dimensionless, alt_baud: T^-1 } out: { token_frame_ms: T, turnaround_ms: T, idle_rotation_ms: T, frame_time_ms: T, loop_time_ms: T }
export function computeMstpSegmentLoading({ baud = 76800, device_count = 0, token_octets = 8, turnaround_bits = 40, frame_octets = 50, transmitting_share = 0.5, alt_device_count = 0, alt_baud = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(baud > 0)) return { error: "Baud rate must be positive." };
  if (!(device_count > 0)) return { error: "Device count must be positive." };
  if (!(token_octets > 0)) return { error: "Token frame length must be positive (octets)." };
  if (!(frame_octets > 0)) return { error: "Data frame length must be positive (octets)." };
  if (!(turnaround_bits >= 0)) return { error: "Turnaround delay cannot be negative (bit times)." };
  if (!(transmitting_share >= 0 && transmitting_share <= 1)) return { error: "Transmitting share must be in [0, 1]." };
  const at = (b, n) => {
    const token_frame_ms = token_octets * 10 / b * 1000;
    const turnaround_ms = turnaround_bits / b * 1000;
    const per_device_ms = token_frame_ms + turnaround_ms;
    const idle_rotation_ms = n * per_device_ms;
    const frame_time_ms = frame_octets * 10 / b * 1000;
    const transmitting_devices = n * transmitting_share;
    const data_ms = transmitting_devices * frame_time_ms;
    return {
      token_frame_ms, turnaround_ms, per_device_ms, idle_rotation_ms,
      frame_time_ms, transmitting_devices, data_ms,
      loop_time_ms: idle_rotation_ms + data_ms,
    };
  };
  const base = at(baud, device_count);
  const moreDevices = alt_device_count > 0 ? at(baud, alt_device_count) : null;
  const lowerBaud = alt_baud > 0 ? at(alt_baud, device_count) : null;
  return {
    token_frame_ms: base.token_frame_ms, turnaround_ms: base.turnaround_ms,
    per_device_ms: base.per_device_ms, idle_rotation_ms: base.idle_rotation_ms,
    frame_time_ms: base.frame_time_ms, transmitting_devices: base.transmitting_devices,
    data_ms: base.data_ms, loop_time_ms: base.loop_time_ms,
    worst_case_response_ms: base.loop_time_ms,
    alt_devices_idle_ms: moreDevices ? moreDevices.idle_rotation_ms : null,
    alt_devices_loop_ms: moreDevices ? moreDevices.loop_time_ms : null,
    alt_devices_ratio: moreDevices ? moreDevices.loop_time_ms / base.loop_time_ms : null,
    alt_baud_loop_ms: lowerBaud ? lowerBaud.loop_time_ms : null,
    alt_baud_ratio: lowerBaud ? lowerBaud.loop_time_ms / base.loop_time_ms : null,
    note: "THE TOKEN IS A SERIALISING MECHANISM AND EVERYTHING FOLLOWS FROM IT. Only one device transmits at a time, so the bus's total throughput is FIXED and adding devices divides it rather than expanding it. A segment is not a network where more nodes means more capacity; it is a queue, and every device added lengthens the wait for every other one. THE 127 MASTER ADDRESSES THE PROTOCOL PERMITS ARE A NAMING LIMIT, NOT A CAPACITY. A segment carrying anything near that has a token rotation in the high hundreds of milliseconds before any useful traffic, which makes coordinated control sluggish and real-time interlocking unworkable. Roughly 32 devices at 76,800 baud is a common design limit. The worst-case response to any command is ONE FULL ROTATION -- fine for scheduled and reset sequences, not fine for a safety interlock or a coordinated shutdown, and that judgement is what the number is for. RAISING THE BAUD RATE IS THE FIRST REMEDY AND IT IS BOUNDED: maximum cable length falls as the rate rises and the bus becomes far less tolerant of stubs, missing termination and grounding faults, so on a long existing run the faster rate will not run at all and the answer is another segment rather than another setting. This is a simplified model of the master node state machine: the real rotation depends on Nmax_master and how the token skips absent addresses, on Nmax_info_frames, on the timeouts governing token recovery, and on the poll-for-master cycle -- and TOKEN LOSS AND RECOVERY, not steady-state rotation, is what makes a marginal segment behave badly. Most MS/TP problems live in the physical layer this does not touch. ASHRAE Standard 135 and the controller manufacturers' documentation, the applicable cable length limits for the baud rate, and the controls engineer govern.",
  };
}
const mstpSegmentLoadingExample = { inputs: { baud: 76800, device_count: 32, token_octets: 8, turnaround_bits: 40, frame_octets: 50, transmitting_share: 0.5, alt_device_count: 64, alt_baud: 38400 } };
CONTROLS_RENDERERS["mstp-segment-loading"] = _simpleRenderer({
  citation: "Citation: the BACnet MS/TP token rotation timing relation -- idle rotation = devices x (token frame + turnaround), frame time = octets x 10 / baud, loop time = idle rotation + the data frames sent in that rotation, and the worst-case response is one full rotation. A simplified model of the master node state machine. ASHRAE Standard 135 and the controller manufacturers' documentation govern.",
  example: mstpSegmentLoadingExample.inputs,
  fields: [
    { key: "baud", label: "Baud rate", kind: "number", default: 76800 },
    { key: "device_count", label: "Master devices on the segment", kind: "number", default: 32, attrs: { step: "1", min: "1" } },
    { key: "token_octets", label: "Token frame length (octets)", kind: "number", default: 8 },
    { key: "turnaround_bits", label: "Turnaround delay (bit times)", kind: "number", default: 40 },
    { key: "frame_octets", label: "Typical data frame (octets)", kind: "number", default: 50 },
    { key: "transmitting_share", label: "Share of devices sending each rotation (0 to 1)", kind: "number", default: 0.5 },
    { key: "alt_device_count", label: "Compare at device count (0 to skip)", kind: "number", default: 64, attrs: { step: "1", min: "0" } },
    { key: "alt_baud", label: "Compare at baud rate (0 to skip)", kind: "number", default: 38400 },
  ],
  outputs: [
    { key: "p", id: "msl-out-p", label: "Per device", value: (r) => fmt(r.token_frame_ms, 3) + " ms token + " + fmt(r.turnaround_ms, 3) + " ms turnaround = " + fmt(r.per_device_ms, 3) + " ms" },
    { key: "i", id: "msl-out-i", label: "Idle token rotation", value: (r) => fmt(r.idle_rotation_ms, 1) + " ms with nothing to say" },
    { key: "d", id: "msl-out-d", label: "Data added", value: (r) => fmt(r.frame_time_ms, 2) + " ms per frame x " + fmt(r.transmitting_devices, 0) + " devices = " + fmt(r.data_ms, 1) + " ms" },
    { key: "l", id: "msl-out-l", label: "Loop time (worst-case response)", value: (r) => fmt(r.loop_time_ms, 1) + " ms" },
    { key: "a", id: "msl-out-a", label: "At the larger device count", value: (r) => r.alt_devices_loop_ms === null ? "not compared" : fmt(r.alt_devices_loop_ms, 1) + " ms (" + fmt(r.alt_devices_ratio, 2) + " x), idle alone " + fmt(r.alt_devices_idle_ms, 1) + " ms" },
    { key: "b", id: "msl-out-b", label: "At the lower baud rate", value: (r) => r.alt_baud_loop_ms === null ? "not compared" : fmt(r.alt_baud_loop_ms, 1) + " ms (" + fmt(r.alt_baud_ratio, 2) + " x)" },
    { key: "n", id: "msl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMstpSegmentLoading,
});

// ===================== spec-v1822: damper actuator torque and sizing =====================

// dims: in { damper_width_in: L, damper_height_in: L, torque_factor_in_lb_ft2: M T^-2, sealed_torque_factor_in_lb_ft2: M T^-2, safety_factor: dimensionless } out: { damper_area_ft2: L^2, required_torque_in_lb: M L^2 T^-2, design_torque_in_lb: M L^2 T^-2, selected_actuator_in_lb: M L^2 T^-2, actuator_count: dimensionless }
export function computeDamperActuatorTorque({ damper_width_in = 0, damper_height_in = 0, torque_factor_in_lb_ft2 = 5, sealed_torque_factor_in_lb_ft2 = 9, safety_factor = 1.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(damper_width_in > 0)) return { error: "Damper width must be positive (in)." };
  if (!(damper_height_in > 0)) return { error: "Damper height must be positive (in)." };
  if (!(torque_factor_in_lb_ft2 > 0)) return { error: "Torque factor must be positive (in-lb per sq ft)." };
  if (!(safety_factor > 0)) return { error: "Safety factor must be positive." };
  const damper_area_ft2 = damper_width_in * damper_height_in / 144;
  const largest = _ACTUATOR_SIZES_IN_LB[_ACTUATOR_SIZES_IN_LB.length - 1];
  const select = (design) => {
    const fit = _ACTUATOR_SIZES_IN_LB.find((s) => s >= design);
    return fit === undefined ? null : fit;
  };
  const required_torque_in_lb = damper_area_ft2 * torque_factor_in_lb_ft2;
  const design_torque_in_lb = required_torque_in_lb * safety_factor;
  const selected_actuator_in_lb = select(design_torque_in_lb);
  const actuator_count = selected_actuator_in_lb === null ? Math.ceil(design_torque_in_lb / largest) : 1;
  const sealed_used = sealed_torque_factor_in_lb_ft2 > 0;
  const sealed_required_torque_in_lb = sealed_used ? damper_area_ft2 * sealed_torque_factor_in_lb_ft2 : null;
  const sealed_design_torque_in_lb = sealed_used ? sealed_required_torque_in_lb * safety_factor : null;
  const sealed_selected_actuator_in_lb = sealed_used ? select(sealed_design_torque_in_lb) : null;
  const sealed_actuator_count = sealed_used ? (sealed_selected_actuator_in_lb === null ? Math.ceil(sealed_design_torque_in_lb / largest) : 1) : null;
  const seals_move_the_selection = sealed_used && (sealed_selected_actuator_in_lb !== selected_actuator_in_lb || sealed_actuator_count !== actuator_count);
  const selection_verdict = selected_actuator_in_lb !== null
    ? "One " + selected_actuator_in_lb + " in-lb actuator covers the " + design_torque_in_lb.toFixed(0) + " in-lb design torque."
    : "NO SINGLE ACTUATOR COVERS IT. The " + design_torque_in_lb.toFixed(0) + " in-lb design torque exceeds the largest standard size (" + largest + " in-lb), so it takes " + actuator_count + " actuators or one actuator driving a jackshaft. A multi-section damper is normally sized and driven SECTION BY SECTION rather than as one area, which changes the arithmetic and is the manufacturer's arrangement to specify.";
  return {
    damper_area_ft2, required_torque_in_lb, design_torque_in_lb,
    selected_actuator_in_lb, actuator_count,
    sealed_required_torque_in_lb, sealed_design_torque_in_lb,
    sealed_selected_actuator_in_lb, sealed_actuator_count, seals_move_the_selection,
    largest_actuator_in_lb: largest, selection_verdict,
    note: "SEALS ARE THE WHOLE STORY IN ACTUATOR SIZING AND THEY ARE SPECIFIED BY SOMEONE ELSE. A low-leakage damper is chosen for its leakage class -- an outside air intake that must shut tight in freezing weather, an isolation damper holding a pressure boundary -- and that specification travels to the DAMPER schedule and not necessarily to the ACTUATOR schedule. The seals then roughly double the torque needed, and an actuator sized from the ordinary table stalls short of closed. THE FAILURE IS CHARACTERISTIC AND EASY TO MISDIAGNOSE: the damper strokes almost fully, the actuator sits at stall against the last few degrees of seal compression, and the control system reports the COMMANDED position rather than the achieved one. Leakage continues, the freeze stat trips or the space will not hold pressure, and the actuator is eventually found warm and buzzing at ninety-eight percent closed. CLOSE-OFF IS A SEPARATE RATING FROM RUNNING TORQUE and is the one that matters for isolation service: moving a damper through still air is a modest demand, holding it shut against fan pressure trying to push it open is another, and manufacturers publish the two separately. An actuator adequate to STROKE a damper can be inadequate to KEEP IT CLOSED once the fan starts. Torque factors are entered and are properties of the specific damper -- blade style, bearing type, linkage, frame size, velocity and pressure across it, and seal type all move the figure, and the damper manufacturer publishes the required torque for their product rather than leaving it to a table. Roughly 3 to 5 in-lb per sq ft for an ordinary low-pressure damper, 5 to 7 at higher velocity and pressure, and 7 to 10 or more with blade and jamb seals. A spring-return actuator delivers LESS torque than the same frame size without one. This does not size the power supply, address stroke time, or address the mounting, linkage and shaft coupling, which is where field installations actually fail. The damper and actuator manufacturers' published torque and close-off data and the controls engineer govern.",
  };
}
const damperActuatorTorqueExample = { inputs: { damper_width_in: 48, damper_height_in: 36, torque_factor_in_lb_ft2: 5, sealed_torque_factor_in_lb_ft2: 9, safety_factor: 1.5 } };
CONTROLS_RENDERERS["damper-actuator-torque"] = _simpleRenderer({
  citation: "Citation: the damper torque factor convention -- required torque = damper area x in-lb per sq ft, times a safety factor, selected against the standard actuator ladder 35 / 70 / 140 / 180 in-lb. Torque factors are ENTERED: roughly 3 to 5 for an ordinary low-pressure damper, 5 to 7 at higher velocity and pressure, and 7 to 10 or more for a low-leakage damper with blade and jamb seals. Close-off torque is a SEPARATE published rating and is not computed here. The damper and actuator manufacturers' published torque and close-off data govern.",
  example: damperActuatorTorqueExample.inputs,
  fields: [
    { key: "damper_width_in", label: "Damper width (in)", kind: "number" },
    { key: "damper_height_in", label: "Damper height (in)", kind: "number" },
    { key: "torque_factor_in_lb_ft2", label: "Torque factor, unsealed (in-lb per sq ft)", kind: "number", default: 5 },
    { key: "sealed_torque_factor_in_lb_ft2", label: "Torque factor with seals (in-lb per sq ft, 0 to skip)", kind: "number", default: 9 },
    { key: "safety_factor", label: "Safety factor", kind: "number", default: 1.5 },
  ],
  outputs: [
    { key: "a", id: "dat-out-a", label: "Damper area", value: (r) => fmt(r.damper_area_ft2, 2) + " sq ft" },
    { key: "t", id: "dat-out-t", label: "Torque, unsealed", value: (r) => fmt(r.required_torque_in_lb, 0) + " in-lb required, " + fmt(r.design_torque_in_lb, 0) + " in-lb design" },
    { key: "s", id: "dat-out-s", label: "Selection, unsealed", value: (r) => r.selected_actuator_in_lb === null ? r.actuator_count + " actuators or a jackshaft" : r.selected_actuator_in_lb + " in-lb" },
    { key: "e", id: "dat-out-e", label: "Torque with seals", value: (r) => r.sealed_design_torque_in_lb === null ? "not compared" : fmt(r.sealed_required_torque_in_lb, 0) + " in-lb required, " + fmt(r.sealed_design_torque_in_lb, 0) + " in-lb design" },
    { key: "f", id: "dat-out-f", label: "Selection with seals", value: (r) => r.sealed_design_torque_in_lb === null ? "not compared" : (r.sealed_selected_actuator_in_lb === null ? r.sealed_actuator_count + " actuators or a jackshaft" : r.sealed_selected_actuator_in_lb + " in-lb") + (r.seals_move_the_selection ? " -- THE SEALS MOVED THE SELECTION, and the leakage spec that required them lives on the damper schedule, not this one" : " -- same selection as unsealed") },
    { key: "v", id: "dat-out-v", label: "Verdict", value: (r) => r.selection_verdict },
    { key: "n", id: "dat-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDamperActuatorTorque,
});

// ===================== spec-v1823: instrument loop total error stackup =====================

// dims: in { span_eng: dimensionless, element_err_eng: dimensionless, transmitter_err_pct_span: dimensionless, input_err_pct_span: dimensionless, installation_err_eng: dimensionless, averaging_err_eng: dimensionless, deadband_eng: dimensionless } out: { worst_case_eng: dimensionless, rss_eng: dimensionless, ratio: dimensionless, total_with_installation_eng: dimensionless }
export function computeLoopErrorStackup({ span_eng = 0, element_err_eng = 0, transmitter_err_pct_span = 0, input_err_pct_span = 0, installation_err_eng = 0, averaging_err_eng = 0, deadband_eng = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(span_eng > 0)) return { error: "Measurement span must be positive (engineering units)." };
  if (!(deadband_eng > 0)) return { error: "Control deadband must be positive (engineering units)." };
  if (element_err_eng < 0) return { error: "Element error cannot be negative." };
  if (transmitter_err_pct_span < 0) return { error: "Transmitter error cannot be negative." };
  if (input_err_pct_span < 0) return { error: "Controller input error cannot be negative." };
  if (installation_err_eng < 0) return { error: "Installation error cannot be negative." };
  if (averaging_err_eng < 0) return { error: "Averaging sensor residual error cannot be negative." };
  // Every element converted to the SAME engineering units before combining.
  const element_eng = element_err_eng;
  const transmitter_eng = transmitter_err_pct_span / 100 * span_eng;
  const input_eng = input_err_pct_span / 100 * span_eng;
  const parts = [element_eng, transmitter_eng, input_eng];
  const worst_case_eng = parts.reduce((a, b) => a + b, 0);
  const rss_eng = Math.sqrt(parts.reduce((a, b) => a + b * b, 0));
  const ratio = rss_eng > 0 ? worst_case_eng / rss_eng : null;
  const element_share_of_worst_pct = worst_case_eng > 0 ? 100 * element_eng / worst_case_eng : null;
  const instrument_within_deadband = rss_eng <= deadband_eng;
  const installUsed = installation_err_eng > 0;
  const total_with_installation_eng = installUsed ? Math.sqrt(rss_eng * rss_eng + installation_err_eng * installation_err_eng) : null;
  const installation_multiple = installUsed ? total_with_installation_eng / rss_eng : null;
  const installed_within_deadband = installUsed ? total_with_installation_eng <= deadband_eng : null;
  const avgUsed = averaging_err_eng > 0;
  const total_with_averaging_eng = avgUsed ? Math.sqrt(rss_eng * rss_eng + averaging_err_eng * averaging_err_eng) : null;
  const averaging_within_deadband = avgUsed ? total_with_averaging_eng <= deadband_eng : null;
  const deadband_verdict = !installUsed
    ? (instrument_within_deadband ? "The instrument chain alone is INSIDE the deadband." : "The instrument chain alone already EXCEEDS the deadband.")
    : (installed_within_deadband
      ? "Inside the deadband even with the installation error."
      : "OUTSIDE THE DEADBAND. A loop cannot control tighter than it can measure: it will hunt, chase a measurement that depends on where the element sits, and produce a trend that looks like an unstable loop rather than a misplaced sensor." + (avgUsed && averaging_within_deadband ? " An averaging element brings it back inside -- THE REMEDY IS A SENSOR, NOT A TUNING SESSION." : ""));
  return {
    element_eng, transmitter_eng, input_eng, worst_case_eng, rss_eng, ratio,
    element_share_of_worst_pct, instrument_within_deadband,
    total_with_installation_eng, installation_multiple, installed_within_deadband,
    total_with_averaging_eng, averaging_within_deadband, deadband_verdict,
    note: "WORST CASE AND ROOT SUM SQUARE ANSWER DIFFERENT QUESTIONS AND BOTH ARE LEGITIMATE. The arithmetic sum is what every element erring in the same direction simultaneously would produce -- a real possibility and the right basis where a single excursion has serious consequences. The root sum square is what independent errors actually combine to most of the time and is the right basis for judging whether a loop can do its job. Quoting one and meaning the other over- or understates by a consistent factor, typically 1.3 to 1.7 for a three-element chain. RSS IS VALID ONLY FOR INDEPENDENT RANDOM ERRORS: a calibration offset, a common temperature effect, or a shared reference affects several elements in the same direction and must be SUMMED rather than combined in quadrature. THE UNIT CONVERSION IS WHERE STACKUPS GO WRONG BEFORE ANY COMBINATION IS ATTEMPTED -- each element quotes against its own basis (degrees, percent of span, percent of reading, counts) and those bases refer to different quantities; converting everything to the same engineering units at the measured condition is the work. AND THEN THE SENSING ELEMENT'S PLACEMENT MAKES THE WHOLE EXERCISE ACADEMIC. A temperature sensor in a stratified duct, a pressure tap in a turbulent region, a flow element without its straight run, a wall sensor above a heat source -- these produce errors that exceed the entire instrument chain by an order of magnitude. The first question about any loop is WHERE ITS SENSOR SITS, and the stackup is worth computing mainly so the answer to that question can be put beside it. Published accuracies are reference accuracies excluding ambient temperature, drift, supply voltage, mounting position and vibration, all of which belong in a complete stackup. Installation error is ESTIMATED and can only be established by measurement, typically by traversing the duct. This does not address dynamic error, where a sensor's time constant means it reports a temperature the process had some time ago. The manufacturers' complete specifications, a field verification of the installed measurement, and the controls engineer govern.",
  };
}
const loopErrorStackupExample = { inputs: { span_eng: 100, element_err_eng: 0.5, transmitter_err_pct_span: 0.2, input_err_pct_span: 0.1, installation_err_eng: 4.0, averaging_err_eng: 0.5, deadband_eng: 1.0 } };
CONTROLS_RENDERERS["loop-error-stackup"] = _simpleRenderer({
  citation: "Citation: the worst-case (arithmetic sum) and root-sum-square uncertainty combination conventions, with every element converted to the SAME engineering units before combining. RSS is the total probable error and is valid only for INDEPENDENT errors; systematic ones must be summed. Installation error is ENTERED and estimated. The manufacturers' complete specifications and a field verification of the installed measurement govern.",
  example: loopErrorStackupExample.inputs,
  fields: [
    { key: "span_eng", label: "Measurement span (eng units)", kind: "number" },
    { key: "element_err_eng", label: "Sensing element error (eng units)", kind: "number" },
    { key: "transmitter_err_pct_span", label: "Transmitter error (% of span)", kind: "number", default: 0.2 },
    { key: "input_err_pct_span", label: "Controller input error (% of span)", kind: "number", default: 0.1 },
    { key: "deadband_eng", label: "Control deadband (eng units)", kind: "number", default: 1 },
    { key: "installation_err_eng", label: "Estimated installation error (eng units, 0 to skip)", kind: "number", default: 0 },
    { key: "averaging_err_eng", label: "Averaging element residual error (eng units, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "e", id: "les-out-e", label: "Each element in eng units", value: (r) => fmt(r.element_eng, 3) + " element, " + fmt(r.transmitter_eng, 3) + " transmitter, " + fmt(r.input_eng, 3) + " input" },
    { key: "w", id: "les-out-w", label: "Worst case (arithmetic sum)", value: (r) => fmt(r.worst_case_eng, 3) + " eng units" },
    { key: "r", id: "les-out-r", label: "Total probable error (RSS)", value: (r) => fmt(r.rss_eng, 3) + " eng units" },
    { key: "f", id: "les-out-f", label: "Worst case over RSS", value: (r) => r.ratio === null ? "-" : fmt(r.ratio, 2) + " x; the element supplies " + fmt(r.element_share_of_worst_pct, 0) + " % of the worst case on its own" },
    { key: "i", id: "les-out-i", label: "With installation error", value: (r) => r.total_with_installation_eng === null ? "not entered" : fmt(r.total_with_installation_eng, 2) + " eng units -- " + fmt(r.installation_multiple, 1) + " times the instrument chain alone" },
    { key: "a", id: "les-out-a", label: "With an averaging element", value: (r) => r.total_with_averaging_eng === null ? "not compared" : fmt(r.total_with_averaging_eng, 2) + " eng units" },
    { key: "v", id: "les-out-v", label: "Against the deadband", value: (r) => r.deadband_verdict },
    { key: "n", id: "les-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLoopErrorStackup,
});
