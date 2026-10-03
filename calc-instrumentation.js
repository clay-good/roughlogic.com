// =====================================================================
// calc-instrumentation.js - spec-v1865 instrumentation bench.
//
// Extracted from calc-lowvoltage.js to keep both lazy-loaded modules
// within their gzip budgets. Calculator behavior is unchanged.
// =====================================================================

import {
  DEBOUNCE_MS, debounce, makeNumber,
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

export const INSTRUMENTATION_RENDERERS = {};

// ===================== spec-v946: 4-20 mA current-loop signal scaling =====================
// dims: in { signal_ma: I, range_low: L T^-1, range_high: L T^-1 } out: { percent_of_span: dimensionless, engineering_value: dimensionless, status: dimensionless }
export function computeLoopSignalScaling({ signal_ma = 12, range_low = 0, range_high = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (range_high === range_low) return { error: "Range high and low must differ (the span cannot be zero)." };
  // Linear live-zero scaling: 4 mA = range_low (0% of span), 20 mA = range_high (100% of span).
  const percent_of_span = (signal_ma - 4) / 16 * 100;
  const engineering_value = range_low + (percent_of_span / 100) * (range_high - range_low);
  // NAMUR NE43 valid measuring range is ~3.8 to 20.5 mA; <=3.6 or >=21 mA signals a sensor/loop fault.
  let status;
  if (signal_ma <= 3.6) status = "fault-low (<=3.6 mA: sensor/loop fault or open circuit, NAMUR NE43)";
  else if (signal_ma < 3.8) status = "underrange (3.6-3.8 mA)";
  else if (signal_ma < 4) status = "underrange (below 4 mA live zero)";
  else if (signal_ma >= 21) status = "fault-high (>=21 mA: sensor/loop fault, NAMUR NE43)";
  else if (signal_ma > 20.5) status = "overrange (above 20.5 mA)";
  else if (signal_ma > 20) status = "overrange (above 20 mA full scale)";
  else status = "in range (4-20 mA)";
  if (![percent_of_span, engineering_value].every(Number.isFinite)) return { error: "Loop-scaling math is not a finite value." };
  return {
    percent_of_span,
    engineering_value,
    status,
    note: "The engineering value a 4-20 mA current-loop signal represents, the number an instrumentation tech reads off a loop meter: the loop is a linear LIVE ZERO where 4 mA = the low end of the range (0% of span) and 20 mA = the high end (100%), so percent of span = (mA - 4) / 16 x 100 and the value = range_low + percent/100 x (range_high - range_low). A transmitter ranged 0-100 psi reads 50 psi at 12 mA and 75 psi at 16 mA. The live zero (4 mA, not 0) is what lets the loop tell a real zero reading apart from a dead wire: per NAMUR NE43, 3.8-20.5 mA is the valid measuring band, while <=3.6 mA or >=21 mA is driven deliberately to flag a sensor or loop fault (an open circuit reads 0 mA). Below 4 or above 20 mA is under/overrange. This is the linear scaling only; a square-root-extracted flow transmitter (differential-pressure flow) needs the sqrt of the fraction, and the transmitter's actual range, damping, and calibration govern.",
  };
}

export const loopSignalScalingExample = { inputs: { signal_ma: 12, range_low: 0, range_high: 100 } };

function _v946renderLoopSignalScaling(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 4-20 mA current-loop (live-zero) signal scaling, by name; ANSI/ISA-50.00.01 analog signal ranges and NAMUR NE43 fault levels. percent = (mA - 4)/16 x 100; value = range_low + percent/100 x (range_high - range_low). Linear scaling only (a DP-flow transmitter is square-root); the transmitter's range and calibration govern.";
  const ma = makeNumber("Loop signal (mA)", "lss-ma", { step: "any" });
  const lo = makeNumber("Range low (value at 4 mA)", "lss-lo", { step: "any" });
  const hi = makeNumber("Range high (value at 20 mA)", "lss-hi", { step: "any" });
  for (const f of [ma, lo, hi]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ma.input.value = "12"; lo.input.value = "0"; hi.input.value = "100"; update(); });
  const oVal = makeOutputLine(outputRegion, "Engineering value", "lss-out-v");
  const oPct = makeOutputLine(outputRegion, "Percent of span", "lss-out-p");
  const oStatus = makeOutputLine(outputRegion, "Signal status", "lss-out-s");
  const update = debounce(() => {
    const r = computeLoopSignalScaling({
      signal_ma: ma.input.value === "" ? 12 : Number(ma.input.value),
      range_low: lo.input.value === "" ? 0 : Number(lo.input.value), range_high: hi.input.value === "" ? 100 : Number(hi.input.value),
    });
    if (r.error) { oVal.textContent = r.error; oPct.textContent = "-"; oStatus.textContent = "-"; return; }
    oVal.textContent = fmt(r.engineering_value, 3);
    oPct.textContent = fmt(r.percent_of_span, 2) + "%";
    oStatus.textContent = r.status;
  }, DEBOUNCE_MS);
  for (const f of [ma, lo, hi]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["loop-signal-scaling"] = _v946renderLoopSignalScaling;

// ===================== spec-v1226: DP (square-root-extracted) flow transmitter scaling =====================
// The loop-signal-scaling tile is LINEAR and its own note says "a square-root-extracted flow transmitter
// (differential-pressure flow) needs the sqrt of the fraction." This adds it: an orifice/venturi DP flow
// transmitter outputs DP linearly on 4-20 mA, but flow ~ sqrt(DP), so flow% = sqrt((mA-4)/16), with a
// low-flow cutoff to kill the noisy sqrt near zero. Loop linearization only (the primary element's Cd is
// already in the transmitter's calibration).
// dims: in { signal_ma: I, flow_low: dimensionless, flow_high: dimensionless, low_flow_cutoff_pct: dimensionless } out: { flow_percent: dimensionless, flow_value: dimensionless, linear_percent: dimensionless }
export function computeDpFlowSignalScaling({ signal_ma = 12, flow_low = 0, flow_high = 100, low_flow_cutoff_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const I = Number(signal_ma);
  const qLo = Number(flow_low) || 0;
  const qHi = Number(flow_high) || 0;
  const cutoff = Number(low_flow_cutoff_pct) || 0;
  if (!Number.isFinite(I)) return { error: "Loop signal must be a number (mA)." };
  if (qHi === qLo) return { error: "Flow at 20 mA and at 4 mA must differ (the span cannot be zero)." };
  if (!(cutoff >= 0 && cutoff < 100)) return { error: "Low-flow cutoff must be between 0 and 100% (exclusive of 100)." };
  const fraction = (I - 4) / 16; // linear DP fraction of span
  const linear_percent = fraction * 100;
  let flow_percent = fraction > 0 ? Math.sqrt(fraction) * 100 : 0;
  const below_cutoff = flow_percent > 0 && flow_percent < cutoff;
  if (below_cutoff) flow_percent = 0;
  const flow_value = qLo + (flow_percent / 100) * (qHi - qLo);
  let status;
  if (I <= 3.6) status = "fault-low (<=3.6 mA: sensor/loop fault, NAMUR NE43)";
  else if (I < 4) status = "underrange (below 4 mA live zero)";
  else if (I >= 21) status = "fault-high (>=21 mA: sensor/loop fault, NAMUR NE43)";
  else if (I > 20.5) status = "overrange (above 20.5 mA)";
  else if (I > 20) status = "overrange (above 20 mA full scale)";
  else status = below_cutoff ? "in range, below low-flow cutoff (forced to 0)" : "in range (4-20 mA)";
  if (![flow_percent, flow_value, linear_percent].every(Number.isFinite)) return { error: "DP-flow scaling math is not a finite value." };
  return {
    flow_percent, flow_value, linear_percent, status,
    note: "The flow a differential-pressure (orifice, venturi, flow-nozzle, or averaging-pitot) transmitter's 4-20 mA signal represents, which the linear loop-scaling tile gets wrong. A DP transmitter measures the differential PRESSURE across the primary element and outputs it linearly on the loop, but flow is proportional to the SQUARE ROOT of that pressure, so the flow is the square root of the signal fraction: flow% = sqrt((mA - 4)/16). That means midscale is not midflow -- 12 mA (50% of the signal) is sqrt(0.5) = 70.7% of flow, and 8 mA (25% signal) is 50% flow -- the classic error when a DP flow loop is scaled linearly. The value = flow_low + flow% x (flow_high - flow_low), where flow_high is the flow at 20 mA (full scale). Modern smart transmitters can do the square-root extraction internally and output flow linearly (then use the linear loop-scaling tile instead); this tile is for the traditional case where the extraction happens in the receiver/PLC. A low-flow cutoff (commonly 5-10%) forces the reading to zero near 4 mA, where the steep square root amplifies noise and zero drift into a phantom flow. This is loop linearization only: the primary element's discharge coefficient and beta ratio are already baked into the transmitter's calibrated range. The transmitter range, damping, and the flow element's calibration govern.",
  };
}
export const dpFlowSignalScalingExample = { inputs: { signal_ma: 12, flow_low: 0, flow_high: 500, low_flow_cutoff_pct: 0 } };
function renderDpFlowSignalScaling(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: differential-pressure flow transmitter square-root extraction on a 4-20 mA loop, by name (ISA / instrumentation practice; NAMUR NE43 fault levels). flow% = sqrt((mA - 4)/16), value = flow_low + flow% x (flow_high - flow_low); a low-flow cutoff zeroes the noisy square root near 4 mA. Loop linearization only (the flow element's Cd is in the transmitter calibration). The transmitter range and calibration govern.";
  const ma = makeNumber("Loop signal (mA)", "dfs-ma", { step: "any" });
  const lo = makeNumber("Flow at 4 mA (usually 0)", "dfs-lo", { step: "any" });
  const hi = makeNumber("Flow at 20 mA (full scale)", "dfs-hi", { step: "any" });
  const cut = makeNumber("Low-flow cutoff (% of flow, e.g. 5)", "dfs-cut", { step: "any", min: "0", max: "100" });
  for (const f of [ma, lo, hi, cut]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ma.input.value = "12"; lo.input.value = "0"; hi.input.value = "500"; cut.input.value = "0"; update(); });
  const oVal = makeOutputLine(outputRegion, "Flow value", "dfs-out-v");
  const oPct = makeOutputLine(outputRegion, "Flow % (vs linear %)", "dfs-out-p");
  const oStatus = makeOutputLine(outputRegion, "Signal status", "dfs-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "dfs-out-n");
  const update = debounce(() => {
    const r = computeDpFlowSignalScaling({
      signal_ma: ma.input.value === "" ? 12 : Number(ma.input.value),
      flow_low: lo.input.value === "" ? 0 : Number(lo.input.value),
      flow_high: hi.input.value === "" ? 500 : Number(hi.input.value),
      low_flow_cutoff_pct: cut.input.value === "" ? 0 : Number(cut.input.value),
    });
    if (r.error) { oVal.textContent = r.error; oPct.textContent = "-"; oStatus.textContent = "-"; oNote.textContent = ""; return; }
    oVal.textContent = fmt(r.flow_value, 2);
    oPct.textContent = fmt(r.flow_percent, 2) + "% (linear would read " + fmt(r.linear_percent, 2) + "%)";
    oStatus.textContent = r.status;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ma, lo, hi, cut]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["dp-flow-signal-scaling"] = renderDpFlowSignalScaling;

// ===================== spec-v947: RTD (Pt100 / Pt1000) resistance to temperature =====================
// dims: in { resistance_ohms: M L^2 T^-3 I^-2, r0_ohms: M L^2 T^-3 I^-2, temperature_f: T } out: { temperature_c: T, temperature_f: T }
export function computeRtdResistanceToTemp({ resistance_ohms = 119.397, r0_ohms = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(resistance_ohms > 0)) return { error: "Measured resistance must be positive (ohms)." };
  if (!(r0_ohms > 0)) return { error: "R0 (ice-point resistance) must be positive (100 for Pt100, 1000 for Pt1000)." };
  // Callendar-Van Dusen inverse (IEC 60751 standard coefficients). Exact for T >= 0 C (R >= R0) via the quadratic
  // R = R0(1 + A T + B T^2). Below 0 C the full curve adds C (T - 100) T^3, C = -4.183e-12, solved by Newton from
  // the quadratic root. Until 2026-09-25 that term was dropped: 0.2 C off at -100 C (the Pyromation / WIKA 60.26 ohm
  // row read -100.20) and about 2.5 C at -200 C.
  const A = 3.9083e-3, B = -5.775e-7, C = -4.183e-12;
  const ratio = resistance_ohms / r0_ohms;
  const disc = A * A - 4 * B * (1 - ratio);
  if (!(disc >= 0)) return { error: "Resistance is outside the platinum RTD range (no real temperature solution)." };
  let temperature_c = (-A + Math.sqrt(disc)) / (2 * B);
  if (temperature_c < 0) {
    for (let i = 0; i < 20; i++) {
      const T = temperature_c;
      const f = 1 + A * T + B * T * T + C * (T - 100) * T * T * T - ratio;
      const df = A + 2 * B * T + C * (4 * T * T * T - 300 * T * T);
      const step = f / df;
      temperature_c = T - step;
      if (Math.abs(step) < 1e-12) break;
    }
  }
  const temperature_f = temperature_c * 9 / 5 + 32;
  if (![temperature_c, temperature_f].every(Number.isFinite)) return { error: "RTD temperature math is not a finite value." };
  return {
    temperature_c,
    temperature_f,
    note: "The temperature a platinum RTD's measured resistance corresponds to, by the IEC 60751 Callendar-Van Dusen relation R = R0 (1 + A T + B T^2) with the standard coefficients A = 3.9083e-3 and B = -5.775e-7 per C, solved for T. R0 is the ice-point (0 C) resistance -- 100 ohms for a Pt100, 1000 ohms for a Pt1000. A Pt100 reading 119.40 ohms is at 50 C, 138.51 ohms is 100 C, and exactly 100.00 ohms is 0 C; a Pt1000 uses the same curve scaled x10. The inverse is exact for T at or above 0 C (R >= R0); below 0 C the standard adds a C (T - 100) T^3 term (C = -4.183e-12), and the tile solves the full curve there, so 60.26 ohms reads -100 C and 18.52 ohms -200 C, as the IEC 60751 tables print. This assumes a 3- or 4-wire measurement (or a lead-resistance-compensated 2-wire) so the reading is the RTD element alone -- uncompensated 2-wire lead resistance ADDS to R and reads high (hotter). The sensor's calibration, tolerance class (A/B), and self-heating govern the field accuracy.",
  };
}

export const rtdResistanceToTempExample = { inputs: { resistance_ohms: 119.397, r0_ohms: 100 } };

function _v947renderRtdResistanceToTemp(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IEC 60751 platinum RTD (Callendar-Van Dusen) resistance-temperature relation, by name; standard coefficients A = 3.9083e-3, B = -5.775e-7 per C. R = R0(1 + A T + B T^2), solved for T at and above 0 C; below 0 C the full R = R0(1 + A T + B T^2 + C (T - 100) T^3), C = -4.183e-12, solved numerically. Assumes a lead-compensated (3/4-wire) reading; the sensor calibration and class govern.";
  const rm = makeNumber("Measured resistance (ohms)", "rtd-rm", { step: "any", min: "0" });
  const r0 = makeNumber("R0 at 0 C (100 = Pt100, 1000 = Pt1000)", "rtd-r0", { step: "any", min: "0" });
  for (const f of [rm, r0]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rm.input.value = "119.397"; r0.input.value = "100"; update(); });
  const oC = makeOutputLine(outputRegion, "Temperature (°C)", "rtd-out-c");
  const oF = makeOutputLine(outputRegion, "Temperature (°F)", "rtd-out-f");
  const update = debounce(() => {
    const r = computeRtdResistanceToTemp({
      resistance_ohms: rm.input.value === "" ? 119.397 : Number(rm.input.value), r0_ohms: r0.input.value === "" ? 100 : Number(r0.input.value),
    });
    if (r.error) { oC.textContent = r.error; oF.textContent = "-"; return; }
    oC.textContent = fmt(r.temperature_c, 2) + " C";
    oF.textContent = fmt(r.temperature_f, 2) + " F";
  }, DEBOUNCE_MS);
  for (const f of [rm, r0]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["rtd-resistance-to-temp"] = _v947renderRtdResistanceToTemp;

// ===================== spec-v948: pulse (turbine/paddlewheel) flowmeter K-factor scaling =====================
// dims: in { frequency_hz: T^-1, k_factor_pulses_per_gal: L^-3 } out: { flow_gpm: L^3 T^-1, flow_gph: L^3 T^-1 }
export function computePulseFlowmeterRate({ frequency_hz = 100, k_factor_pulses_per_gal = 200 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(frequency_hz >= 0)) return { error: "Pulse frequency cannot be negative (Hz)." };
  if (!(k_factor_pulses_per_gal > 0)) return { error: "K-factor must be positive (pulses per gallon)." };
  // A turbine/paddlewheel/PD meter emits K pulses per gallon; rate = pulses/sec x 60 sec/min / (pulses/gal).
  const flow_gpm = frequency_hz * 60 / k_factor_pulses_per_gal;
  const flow_gph = flow_gpm * 60;
  if (![flow_gpm, flow_gph].every(Number.isFinite)) return { error: "Flowmeter rate math is not a finite value." };
  return {
    flow_gpm,
    flow_gph,
    note: "The flow rate a pulse-output flowmeter (turbine, paddlewheel, or positive-displacement) reports from its output frequency: the meter emits a fixed number of pulses per gallon -- its K-factor, stamped on the meter or its calibration certificate -- so rate = frequency (Hz = pulses/sec) x 60 / K-factor, and the totalized volume is simply the pulse count divided by the K-factor. A 200 pulse/gal meter reading 100 Hz is 30 gpm; a coarser 100 pulse/gal meter at the same 100 Hz is 60 gpm, because each pulse is worth twice the volume. The K-factor is not truly constant: it drifts with fluid viscosity and shifts at the low end of the meter's range (below its linear turndown), so a viscous fluid or a near-zero flow reads off. Some meters are rated in pulses per liter or per cubic foot -- convert first. This is the linear frequency-to-rate scaling; the meter's calibration certificate, its linear flow range, and the fluid govern the field accuracy.",
  };
}

export const pulseFlowmeterRateExample = { inputs: { frequency_hz: 100, k_factor_pulses_per_gal: 200 } };

function _v948renderPulseFlowmeterRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: pulse-output flowmeter (turbine/paddlewheel/PD) K-factor scaling, by name. rate = frequency_Hz x 60 / K-factor (pulses per gallon); totalized volume = pulse count / K-factor. The K-factor is stamped on the meter or its calibration certificate; it drifts with viscosity and at low flow. The calibration cert, linear range, and fluid govern.";
  const fr = makeNumber("Output frequency (Hz = pulses/sec)", "pfm-fr", { step: "any", min: "0" });
  const kf = makeNumber("K-factor (pulses per gallon)", "pfm-kf", { step: "any", min: "0" });
  for (const f of [fr, kf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fr.input.value = "100"; kf.input.value = "200"; update(); });
  const oGpm = makeOutputLine(outputRegion, "Flow rate", "pfm-out-gpm");
  const oGph = makeOutputLine(outputRegion, "Flow rate (gph)", "pfm-out-gph");
  const update = debounce(() => {
    const r = computePulseFlowmeterRate({
      frequency_hz: fr.input.value === "" ? 100 : Number(fr.input.value), k_factor_pulses_per_gal: kf.input.value === "" ? 200 : Number(kf.input.value),
    });
    if (r.error) { oGpm.textContent = r.error; oGph.textContent = "-"; return; }
    oGpm.textContent = fmt(r.flow_gpm, 2) + " gpm";
    oGph.textContent = fmt(r.flow_gph, 1) + " gph";
  }, DEBOUNCE_MS);
  for (const f of [fr, kf]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["pulse-flowmeter-k-factor"] = _v948renderPulseFlowmeterRate;

// ===================== spec-v949: loop-powered 2-wire 4-20 mA transmitter voltage budget =====================
// dims: in { supply_v: M L^2 T^-3 I^-1, transmitter_min_v: M L^2 T^-3 I^-1, load_resistance_ohms: M L^2 T^-3 I^-2, wire_resistance_ohms: M L^2 T^-3 I^-2 } out: { max_loop_resistance_ohms: M L^2 T^-3 I^-2, voltage_at_transmitter_v: M L^2 T^-3 I^-1, margin_v: M L^2 T^-3 I^-1, within_spec: dimensionless }
export function computeLoopVoltageBudget({ supply_v = 24, transmitter_min_v = 10.5, load_resistance_ohms = 250, wire_resistance_ohms = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(supply_v > 0)) return { error: "Loop supply voltage must be positive (Vdc)." };
  if (!(transmitter_min_v >= 0)) return { error: "Transmitter minimum (compliance) voltage cannot be negative." };
  if (!(transmitter_min_v < supply_v)) return { error: "Supply voltage must exceed the transmitter minimum for the loop to operate." };
  if (!(load_resistance_ohms >= 0)) return { error: "Load (sense) resistance cannot be negative." };
  if (!(wire_resistance_ohms >= 0)) return { error: "Wire resistance cannot be negative." };
  // At the 20 mA worst case the loop supply drives all series resistance; the transmitter needs its minimum left over.
  const I_MAX = 0.020;
  const max_loop_resistance_ohms = (supply_v - transmitter_min_v) / I_MAX;
  const total_series_ohms = load_resistance_ohms + wire_resistance_ohms;
  const voltage_at_transmitter_v = supply_v - I_MAX * total_series_ohms;
  const margin_v = voltage_at_transmitter_v - transmitter_min_v;
  const headroom_ohms = max_loop_resistance_ohms - total_series_ohms;
  const within_spec = margin_v >= -1e-9 * Math.abs(transmitter_min_v);
  if (![max_loop_resistance_ohms, voltage_at_transmitter_v, margin_v].every(Number.isFinite)) return { error: "Loop-budget math is not a finite value." };
  return {
    max_loop_resistance_ohms,
    voltage_at_transmitter_v,
    margin_v,
    headroom_ohms,
    within_spec,
    verdict: within_spec ? "OK -- the loop drives 20 mA with margin" : "FAIL -- the transmitter starves at 20 mA",
    note: "Whether a loop-powered (2-wire) 4-20 mA transmitter has enough voltage to operate. The transmitter needs a minimum terminal (compliance / lift-off) voltage to work -- commonly 8-12 Vdc -- and at the 20 mA top of range the loop supply must push that current through ALL the series resistance (the sense/load resistor at the receiver, the round-trip wire resistance, plus any barriers or isolators) and still leave the transmitter its minimum. So the maximum total loop resistance = (supply - transmitter minimum) / 0.020 A, and the voltage left at the transmitter = supply - 0.020 x total series resistance. A 24 Vdc loop into a 250 ohm sense resistor with 50 ohm of wire (300 ohm total) leaves 18 V at the transmitter -- well above a 10.5 V minimum -- and could carry up to 675 ohm; push the run to 600 ohm of wire (850 ohm total) and the transmitter starves at 7 V, below its minimum, so the loop pins or reads wrong. The 250 ohm sense resistor (for a 1-5 V input) is the usual big consumer. This is the DC worst case at 20 mA; the transmitter datasheet's actual compliance voltage, the barrier/isolator burden, and the real wire resistance govern.",
  };
}

export const loopVoltageBudgetExample = { inputs: { supply_v: 24, transmitter_min_v: 10.5, load_resistance_ohms: 250, wire_resistance_ohms: 50 } };

function _v949renderLoopVoltageBudget(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: loop-powered (2-wire) 4-20 mA transmitter voltage budget, by name. Max total loop resistance = (supply - transmitter minimum) / 0.020 A; voltage at the transmitter = supply - 0.020 x (load + wire + barrier resistance), which must exceed the transmitter's compliance (lift-off) voltage at the 20 mA worst case. The transmitter datasheet's compliance voltage and the barrier burden govern.";
  const sv = makeNumber("Loop supply (Vdc)", "lvb-sv", { step: "any", min: "0" });
  const tv = makeNumber("Transmitter minimum voltage (V)", "lvb-tv", { step: "any", min: "0" });
  const lr = makeNumber("Load / sense resistor (ohms)", "lvb-lr", { step: "any", min: "0" });
  const wr = makeNumber("Wire (both conductors, out and back) + barrier resistance (ohms)", "lvb-wr", { step: "any", min: "0" });
  for (const f of [sv, tv, lr, wr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sv.input.value = "24"; tv.input.value = "10.5"; lr.input.value = "250"; wr.input.value = "50"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "lvb-out-v");
  const oVat = makeOutputLine(outputRegion, "Voltage at transmitter (20 mA)", "lvb-out-vat");
  const oMax = makeOutputLine(outputRegion, "Max total loop resistance", "lvb-out-max");
  const update = debounce(() => {
    const r = computeLoopVoltageBudget({
      supply_v: sv.input.value === "" ? 24 : Number(sv.input.value), transmitter_min_v: tv.input.value === "" ? 10.5 : Number(tv.input.value),
      load_resistance_ohms: lr.input.value === "" ? 250 : Number(lr.input.value), wire_resistance_ohms: wr.input.value === "" ? 50 : Number(wr.input.value),
    });
    if (r.error) { oV.textContent = r.error; oVat.textContent = "-"; oMax.textContent = "-"; return; }
    oV.textContent = r.verdict + " (" + (r.margin_v >= 0 ? "+" : "") + fmt(r.margin_v, 2) + " V margin)";
    oVat.textContent = fmt(r.voltage_at_transmitter_v, 2) + " V (need " + fmt(Number(tv.input.value) || 10.5, 1) + " V)";
    oMax.textContent = fmt(r.max_loop_resistance_ohms, 0) + " ohm ceiling (" + (r.headroom_ohms >= 0 ? "+" : "") + fmt(r.headroom_ohms, 0) + " ohm headroom)";
  }, DEBOUNCE_MS);
  for (const f of [sv, tv, lr, wr]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["loop-voltage-budget"] = _v949renderLoopVoltageBudget;

// ===================== spec-v950: NTC thermistor resistance to temperature (beta equation) =====================
// dims: in { resistance_ohms: M L^2 T^-3 I^-2, r0_ohms: M L^2 T^-3 I^-2, beta_k: T, ref_temp_c: T } out: { temperature_c: T, temperature_f: T }
export function computeThermistorBetaTemp({ resistance_ohms = 10000, r0_ohms = 10000, beta_k = 3950, ref_temp_c = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(resistance_ohms > 0)) return { error: "Measured resistance must be positive (ohms)." };
  if (!(r0_ohms > 0)) return { error: "R0 (nominal resistance at the reference temperature) must be positive." };
  if (!(beta_k > 0)) return { error: "Beta coefficient must be positive (K)." };
  if (!(ref_temp_c > -273.15)) return { error: "Reference temperature must be above absolute zero (C)." };
  // NTC thermistor beta (B-parameter) equation: 1/T = 1/T0 + (1/B) ln(R/R0), temperatures in kelvin.
  const t0_k = ref_temp_c + 273.15;
  const inv_t = 1 / t0_k + (1 / beta_k) * Math.log(resistance_ohms / r0_ohms);
  if (!(inv_t > 0)) return { error: "Resistance is outside the thermistor's valid range (no positive temperature solution)." };
  const t_k = 1 / inv_t;
  const temperature_c = t_k - 273.15;
  const temperature_f = temperature_c * 9 / 5 + 32;
  if (![temperature_c, temperature_f].every(Number.isFinite)) return { error: "Thermistor temperature math is not a finite value." };
  return {
    temperature_c,
    temperature_f,
    note: "The temperature an NTC (negative-temperature-coefficient) thermistor's measured resistance corresponds to, by the beta (B-parameter) equation 1/T = 1/T0 + (1/B) ln(R/R0) with temperatures in kelvin. R0 is the nominal resistance at the reference temperature T0 (almost always 10 kohm at 25 C for the HVAC-standard sensor), and B (commonly 3435-3950 K) is the thermistor's material constant -- both come from the sensor datasheet. Because it is NEGATIVE-coefficient, resistance FALLS as temperature RISES: a 10 kohm/3950 K sensor reads 25 C at 10 kohm, 41.5 C at 5 kohm, and 10.2 C at 20 kohm. The beta equation is a two-point fit and is accurate to about +/-0.2 to 1 C over a moderate span around T0; a wider or tighter job uses the 3-constant Steinhart-Hart equation instead. This is distinct from a platinum RTD, which is POSITIVE-coefficient and follows the Callendar-Van Dusen curve. Assumes a lead-compensated reading; the sensor's datasheet R-T curve, tolerance, and self-heating govern the field accuracy.",
  };
}

export const thermistorBetaTempExample = { inputs: { resistance_ohms: 20000, r0_ohms: 10000, beta_k: 3950, ref_temp_c: 25 } };

function _v950renderThermistorBetaTemp(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NTC thermistor beta (B-parameter) equation, by name. 1/T = 1/T0 + (1/B) ln(R/R0), temperatures in kelvin; R0 and B (e.g. 10 kohm at 25 C, B ~ 3950 K) come from the sensor datasheet. A two-point fit (accurate ~+/-0.2-1 C near T0); a wider span uses Steinhart-Hart. Distinct from a positive-coefficient platinum RTD. The datasheet R-T curve and tolerance govern.";
  const rm = makeNumber("Measured resistance (ohms)", "th-rm", { step: "any", min: "0" });
  const r0 = makeNumber("R0 at reference temp (ohms, e.g. 10000)", "th-r0", { step: "any", min: "0" });
  const bk = makeNumber("Beta B (K, e.g. 3950)", "th-bk", { step: "any", min: "0" });
  const rt = makeNumber("Reference temp T0 in C (usually 25)", "th-rt", { step: "any" });
  for (const f of [rm, r0, bk, rt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rm.input.value = "20000"; r0.input.value = "10000"; bk.input.value = "3950"; rt.input.value = "25"; update(); });
  const oC = makeOutputLine(outputRegion, "Temperature (°C)", "th-out-c");
  const oF = makeOutputLine(outputRegion, "Temperature (°F)", "th-out-f");
  const update = debounce(() => {
    const r = computeThermistorBetaTemp({
      resistance_ohms: rm.input.value === "" ? 20000 : Number(rm.input.value), r0_ohms: r0.input.value === "" ? 10000 : Number(r0.input.value),
      beta_k: bk.input.value === "" ? 3950 : Number(bk.input.value), ref_temp_c: rt.input.value === "" ? 25 : Number(rt.input.value),
    });
    if (r.error) { oC.textContent = r.error; oF.textContent = "-"; return; }
    oC.textContent = fmt(r.temperature_c, 2) + " C";
    oF.textContent = fmt(r.temperature_f, 2) + " F";
  }, DEBOUNCE_MS);
  for (const f of [rm, r0, bk, rt]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["thermistor-beta-temp"] = _v950renderThermistorBetaTemp;

// ===================== spec-v1223: NTC thermistor Steinhart-Hart equation (3-constant) =====================
// The thermistor-beta-temp tile's own note says a wider/tighter job "uses the 3-constant Steinhart-Hart
// equation instead" -- the accurate temperature-sensor form the beta 2-point equation approximates. This
// adds it: 1/T = A + B ln(R) + C (ln R)^3, T in kelvin, A/B/C from the datasheet or a 3-point calibration.
// dims: in { resistance_ohms: M L^2 T^-3 I^-2, coeff_a: dimensionless, coeff_b: dimensionless, coeff_c: dimensionless } out: { temperature_c: T, temperature_f: T, temperature_k: T }
export function computeThermistorSteinhartHart({ resistance_ohms = 10000, coeff_a = 0.001125308852122, coeff_b = 0.000234711863267, coeff_c = 0.000000085663516, } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = Number(resistance_ohms) || 0;
  const A = Number(coeff_a);
  const B = Number(coeff_b);
  const C = Number(coeff_c);
  if (!(R > 0)) return { error: "Measured resistance must be positive (ohms)." };
  if (![A, B, C].every(Number.isFinite)) return { error: "The Steinhart-Hart coefficients A, B, and C must be finite numbers (from the datasheet)." };
  const lnR = Math.log(R);
  const inv_t = A + B * lnR + C * lnR * lnR * lnR;
  if (!(inv_t > 0)) return { error: "Resistance is outside the thermistor's valid range (no positive temperature solution); check the coefficients and resistance." };
  const temperature_k = 1 / inv_t;
  const temperature_c = temperature_k - 273.15;
  const temperature_f = temperature_c * 9 / 5 + 32;
  if (![temperature_k, temperature_c, temperature_f].every(Number.isFinite)) return { error: "Steinhart-Hart temperature math is not a finite value." };
  return {
    temperature_k, temperature_c, temperature_f,
    note: "The temperature an NTC (negative-temperature-coefficient) thermistor's measured resistance corresponds to, by the 3-constant Steinhart-Hart equation 1/T = A + B ln(R) + C (ln R)^3 with T in kelvin -- the accurate standard the beta (B-parameter) equation is the cheap two-point simplification of. The coefficients A, B, and C come from the sensor datasheet, or are fit from three known (resistance, temperature) calibration points; C is usually tiny (about 1e-7), and dropping it leaves a two-constant form. Because it curve-fits three points instead of two, Steinhart-Hart holds to roughly +/-0.01 to 0.02 C across a wide span (about -50 to 150 C) where the beta equation drifts to +/-0.2 to 1 C away from its reference point. Being NEGATIVE-coefficient, resistance FALLS as temperature RISES. A typical 10 kohm sensor with A 1.1253e-3, B 2.3471e-4, C 8.566e-8 reads about 25 C at 10 kohm, about 2 C at ~29 kohm and about 48 C at ~3.9 kohm (0 C falls near 32.7 kohm). This is distinct from a platinum RTD, which is POSITIVE-coefficient and follows the Callendar-Van Dusen curve. Assumes a lead-compensated reading; the datasheet R-T curve, tolerance, and self-heating govern the field accuracy.",
  };
}
export const thermistorSteinhartHartExample = { inputs: { resistance_ohms: 10000, coeff_a: 0.001125308852122, coeff_b: 0.000234711863267, coeff_c: 0.000000085663516 } };
function renderThermistorSteinhartHart(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NTC thermistor 3-constant Steinhart-Hart equation, by name: 1/T = A + B ln(R) + C (ln R)^3, T in kelvin; A, B, C from the datasheet or a 3-point calibration. The accurate form the beta (B-parameter) equation approximates (~+/-0.01-0.02 C over a wide span). Distinct from a positive-coefficient platinum RTD. The datasheet R-T curve, tolerance, and self-heating govern.";
  const rm = makeNumber("Measured resistance (ohms)", "sh-rm", { step: "any", min: "0" });
  const a = makeNumber("Coefficient A", "sh-a", { step: "any" });
  const b = makeNumber("Coefficient B", "sh-b", { step: "any" });
  const c = makeNumber("Coefficient C", "sh-c", { step: "any" });
  for (const f of [rm, a, b, c]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rm.input.value = "10000"; a.input.value = "0.001125308852122"; b.input.value = "0.000234711863267"; c.input.value = "0.000000085663516"; update(); });
  const oC = makeOutputLine(outputRegion, "Temperature (°C)", "sh-out-c");
  const oF = makeOutputLine(outputRegion, "Temperature (°F)", "sh-out-f");
  const oNote = makeOutputLine(outputRegion, "Note", "sh-out-n");
  const update = debounce(() => {
    const r = computeThermistorSteinhartHart({
      resistance_ohms: rm.input.value === "" ? 10000 : Number(rm.input.value),
      coeff_a: a.input.value === "" ? 0.001125308852122 : Number(a.input.value),
      coeff_b: b.input.value === "" ? 0.000234711863267 : Number(b.input.value),
      // Blank C means the two-constant form (C = 0) once A and B are your own; all three
      // blank uses the bundled 10k NTC set.
      coeff_c: c.input.value === "" ? (a.input.value === "" && b.input.value === "" ? 0.000000085663516 : 0) : Number(c.input.value),
    });
    if (r.error) { oC.textContent = r.error; oF.textContent = "-"; oNote.textContent = ""; return; }
    oC.textContent = fmt(r.temperature_c, 2) + " C";
    oF.textContent = fmt(r.temperature_f, 2) + " F";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [rm, a, b, c]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["thermistor-steinhart-hart"] = renderThermistorSteinhartHart;

// ===================== spec-v958: hydrostatic DP level transmitter (head to level) =====================
// dims: in { measured_pressure_psi: M L^-1 T^-2, specific_gravity: dimensionless, max_level_ft: L } out: { level_ft: L, level_pct: dimensionless, span_psi: M L^-1 T^-2 }
export function computeDpLevelHydrostatic({ measured_pressure_psi = 4.33, specific_gravity = 1.0, max_level_ft = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(measured_pressure_psi >= 0)) return { error: "Measured pressure cannot be negative (psi)." };
  if (!(specific_gravity > 0)) return { error: "Specific gravity must be positive." };
  if (!(max_level_ft > 0)) return { error: "Maximum (full-span) level must be positive (ft)." };
  // Hydrostatic head: P (psi) = 0.433 x SG x H (ft). 0.433 psi/ft is water at ~60 F (62.3 lb/ft^3 / 144).
  const PSI_PER_FT_WATER = 0.433;
  const level_ft = measured_pressure_psi / (PSI_PER_FT_WATER * specific_gravity);
  const span_psi = PSI_PER_FT_WATER * specific_gravity * max_level_ft;
  const level_pct = 100 * level_ft / max_level_ft;
  if (![level_ft, span_psi, level_pct].every(Number.isFinite)) return { error: "DP-level math is not a finite value." };
  return {
    level_ft,
    level_in: level_ft * 12,
    level_pct,
    span_psi,
    note: "The liquid level a hydrostatic (differential-pressure) level transmitter reports from the head it measures: pressure P = 0.433 x SG x H, so level H = P / (0.433 x SG), where 0.433 psi per foot is water at about 60 F and SG scales it for a denser or lighter fluid. A tap reading 4.33 psi in water (SG 1.0) is 10 ft of level; the full-span (URV) pressure for a 20-ft tank is 0.433 x 1.0 x 20 = 8.66 psi, so 4.33 psi is 50% of span. A denser fluid (higher SG) produces more pressure per foot, so the same 4.33 psi in a 1.2-SG fluid is only 8.3 ft. This assumes an OPEN (vented) tank with the transmitter tap at the zero-level (tank bottom), no zero elevation or suppression: an elevated dry-leg tap needs zero SUPPRESSION and a wet-leg (sealed/pressurized tank) needs zero ELEVATION, both set at calibration, and the SG must be taken at the operating temperature (it changes with temperature). The transmitter's configured range and calibration and the tank geometry govern the reading.",
  };
}

export const dpLevelHydrostaticExample = { inputs: { measured_pressure_psi: 4.33, specific_gravity: 1.0, max_level_ft: 20 } };

function _v958renderDpLevelHydrostatic(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: hydrostatic DP level transmitter (head to level), by name. P = 0.433 x SG x H (psi), so level H = P / (0.433 x SG); 0.433 psi/ft is water at ~60 F. Full-span (URV) = 0.433 x SG x max level. Assumes an open (vented) tank, tap at zero level, no elevation/suppression; a wet leg or elevated tap needs zero suppression/elevation set at calibration. The transmitter range and calibration govern.";
  const pp = makeNumber("Measured pressure (psi)", "dpl-pp", { step: "any", min: "0" });
  const sg = makeNumber("Fluid specific gravity", "dpl-sg", { step: "any", min: "0" });
  const ml = makeNumber("Full-span (max) level (ft)", "dpl-ml", { step: "any", min: "0" });
  for (const f of [pp, sg, ml]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pp.input.value = "4.33"; sg.input.value = "1.0"; ml.input.value = "20"; update(); });
  const oL = makeOutputLine(outputRegion, "Level", "dpl-out-l");
  const oP = makeOutputLine(outputRegion, "Percent of span", "dpl-out-p");
  const oS = makeOutputLine(outputRegion, "Full-span pressure (URV)", "dpl-out-s");
  const update = debounce(() => {
    const r = computeDpLevelHydrostatic({
      measured_pressure_psi: pp.input.value === "" ? 4.33 : Number(pp.input.value), specific_gravity: sg.input.value === "" ? 1.0 : Number(sg.input.value),
      max_level_ft: ml.input.value === "" ? 20 : Number(ml.input.value),
    });
    if (r.error) { oL.textContent = r.error; oP.textContent = "-"; oS.textContent = "-"; return; }
    oL.textContent = fmt(r.level_ft, 2) + " ft (" + fmt(r.level_in, 1) + " in)";
    oP.textContent = fmt(r.level_pct, 1) + "% of span";
    oS.textContent = fmt(r.span_psi, 2) + " psi at full level";
  }, DEBOUNCE_MS);
  for (const f of [pp, sg, ml]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["dp-level-hydrostatic"] = _v958renderDpLevelHydrostatic;

// ===================== spec-v961: Ziegler-Nichols closed-loop PID tuning =====================
// dims: in { ultimate_gain_ku: dimensionless, ultimate_period_tu_sec: T } out: { pid_kp: dimensionless, pid_ti_sec: T, pid_td_sec: T, proportional_band_pct: dimensionless }
export function computePidTuningZieglerNichols({ ultimate_gain_ku = 4, ultimate_period_tu_sec = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ultimate_gain_ku > 0)) return { error: "Ultimate gain Ku must be positive." };
  if (!(ultimate_period_tu_sec > 0)) return { error: "Ultimate period Tu must be positive (s)." };
  // Ziegler-Nichols closed-loop (ultimate-sensitivity) PID: Kp = 0.6 Ku, Ti = 0.5 Tu, Td = 0.125 Tu.
  const pid_kp = 0.6 * ultimate_gain_ku;
  const pid_ti_sec = 0.5 * ultimate_period_tu_sec;
  const pid_td_sec = 0.125 * ultimate_period_tu_sec;
  const proportional_band_pct = 100 / pid_kp;
  // The P-only and PI variants (for legacy or noise-sensitive loops).
  const p_kp = 0.5 * ultimate_gain_ku;
  const pi_kp = 0.45 * ultimate_gain_ku;
  const pi_ti_sec = ultimate_period_tu_sec / 1.2;
  if (![pid_kp, pid_ti_sec, pid_td_sec, proportional_band_pct].every(Number.isFinite)) return { error: "PID-tuning math is not a finite value." };
  return {
    pid_kp,
    pid_ti_sec,
    pid_td_sec,
    proportional_band_pct,
    p_kp,
    pi_kp,
    pi_ti_sec,
    note: "Starting PID gains from the Ziegler-Nichols closed-loop (ultimate-sensitivity) method: with integral and derivative off, raise the proportional gain until the loop just oscillates steadily -- that gain is the ultimate gain Ku and the oscillation period is the ultimate period Tu. Then a PID controller starts at Kp = 0.6 Ku, integral time Ti = 0.5 Tu, derivative time Td = 0.125 Tu; a PI controller (for a noisy or fast loop where derivative amplifies noise) at Kp = 0.45 Ku, Ti = Tu/1.2; and a P-only at Kp = 0.5 Ku. With Ku = 4 and Tu = 2 s, a PID starts at Kp 2.4, Ti 1.0 s, Td 0.25 s (a 42% proportional band). Note that a legacy controller may want the equivalent proportional band PB = 100/Kp and reset in repeats per minute (60/Ti with Ti in seconds) rather than gain and seconds, and that some controllers use a non-interacting (parallel) form whose Ki and Kd differ. Ziegler-Nichols is deliberately aggressive -- tuned for a fast quarter-amplitude-decay response, which overshoots; back the gain off for a gentler loop, and re-tune on the running process. A starting point, not a final tune; the process dynamics, the controller's algorithm form, and the commissioning technician govern.",
  };
}

export const pidTuningZieglerNicholsExample = { inputs: { ultimate_gain_ku: 4, ultimate_period_tu_sec: 2 } };

function _v961renderPidTuningZieglerNichols(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Ziegler-Nichols closed-loop (ultimate-sensitivity) PID tuning, by name. PID: Kp = 0.6 Ku, Ti = 0.5 Tu, Td = 0.125 Tu; PI: Kp = 0.45 Ku, Ti = Tu/1.2; P: Kp = 0.5 Ku. Ku/Tu are the gain and period at the stability limit. Aggressive (quarter-amplitude decay); a starting point, not a final tune. The process, the controller algorithm form, and the technician govern.";
  const ku = makeNumber("Ultimate gain Ku (gain at steady oscillation)", "pid-ku", { step: "any", min: "0" });
  const tu = makeNumber("Ultimate period Tu (s, oscillation period)", "pid-tu", { step: "any", min: "0" });
  for (const f of [ku, tu]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ku.input.value = "4"; tu.input.value = "2"; update(); });
  const oPid = makeOutputLine(outputRegion, "PID: Kp / Ti / Td", "pid-out-pid");
  const oPb = makeOutputLine(outputRegion, "Proportional band", "pid-out-pb");
  const oPi = makeOutputLine(outputRegion, "PI / P variants", "pid-out-pi");
  const update = debounce(() => {
    const r = computePidTuningZieglerNichols({
      ultimate_gain_ku: ku.input.value === "" ? 4 : Number(ku.input.value), ultimate_period_tu_sec: tu.input.value === "" ? 2 : Number(tu.input.value),
    });
    if (r.error) { oPid.textContent = r.error; oPb.textContent = "-"; oPi.textContent = "-"; return; }
    oPid.textContent = fmt(r.pid_kp, 3) + " / " + fmt(r.pid_ti_sec, 3) + " s / " + fmt(r.pid_td_sec, 3) + " s";
    oPb.textContent = fmt(r.proportional_band_pct, 1) + "% (PB = 100/Kp)";
    oPi.textContent = "PI Kp " + fmt(r.pi_kp, 3) + ", Ti " + fmt(r.pi_ti_sec, 3) + " s; P Kp " + fmt(r.p_kp, 3);
  }, DEBOUNCE_MS);
  for (const f of [ku, tu]) f.input.addEventListener("input", update);
}
INSTRUMENTATION_RENDERERS["pid-tuning-ziegler-nichols"] = _v961renderPidTuningZieglerNichols;
