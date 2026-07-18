// Group A: motor analysis bench (spec-v121..v124).
//
// spec-v129 batch cap-relief split: the cohesive four-tile motor bench
// (motor-synchronous-speed-slip, motor-shaft-torque, motor-operating-cost,
// multi-motor-feeder) was extracted verbatim from calc-electrical.js, which
// the spec-v121..v128 batch had pushed to 100.1% of its gzip cap -- the
// tightest renderer module. The four share a theme distinct from the basic
// Group A core: how a polyphase induction motor turns, what torque it makes,
// what it costs to run, and how a feeder serving several of them is sized
// (NEC 430.24 / 430.62). Each KEEPS group "A" -- a tile's group letter is
// independent of the module that holds it (the v79/v88/v101 precedent).
// Their ids, citations, worked examples, dimensional annotations, and behavior
// are byte-for-byte unchanged. The non-exported _finiteGuard is copied in (it
// adds no v14 derivation-corpus row). Lazy-loaded on first open of one of its
// tiles, so it is not in the home-view first-paint payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

export const MOTOR_RENDERERS = {};

// v18 §7 contract guard: reject a non-finite numeric input (copied from
// calc-electrical.js; non-exported, so it adds no v14 derivation-corpus row).
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

// dims: in { line_freq_hz: T^-1, poles: dimensionless, rated_rpm: T^-1 } out: { sync_rpm: T^-1, slip: dimensionless, slip_pct: dimensionless, rotor_freq_hz: T^-1 }
export function computeMotorSyncSlip({ line_freq_hz = 60, poles = 4, rated_rpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(line_freq_hz > 0)) return { error: "Line frequency must be positive (Hz)." };
  if (!(poles > 0)) return { error: "Pole count must be a positive even integer." };
  if (!Number.isInteger(poles) || poles % 2 !== 0) return { error: "Pole count must be an even integer (2, 4, 6, 8, ...)." };
  if (!(rated_rpm >= 0)) return { error: "Rated speed cannot be negative (rpm)." };
  const sync_rpm = (120 * line_freq_hz) / poles; // poles > 0 forces this positive
  const slip = (sync_rpm - rated_rpm) / sync_rpm;
  const slip_pct = slip * 100;
  const rotor_freq_hz = slip * line_freq_hz;
  return {
    sync_rpm, slip, slip_pct, rotor_freq_hz,
    note: "Synchronous speed Ns = 120 x f / P (the 120 carries the 60 s/min x 2 poles-per-pole-pair bridge). Slip = (Ns - nameplate rpm) / Ns; the nameplate full-load speed governs. A speed near synchronous indicates a lightly loaded machine; rising slip indicates loading or a rotor fault.",
  };
}
export const motorSyncSlipExample = { inputs: { line_freq_hz: 60, poles: 4, rated_rpm: 1750 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderMotorSyncSlip(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles AC-machine relation Ns = 120 x f / P and slip = (Ns - rpm) / Ns; rotor (slip) frequency = slip x f. The motor nameplate and the manufacturer govern the rated full-load speed.";
  const freq = makeNumber("Line frequency (Hz)", "mss-freq", { step: "any", min: "0", value: "60" });
  freq.input.value = "60";
  const poles = makeNumber("Poles (even integer)", "mss-poles", { step: "2", min: "2", value: "4" });
  poles.input.value = "4";
  const rpm = makeNumber("Nameplate full-load speed (rpm)", "mss-rpm", { step: "any", min: "0" });
  for (const f of [freq, poles, rpm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { freq.input.value = "60"; poles.input.value = "4"; rpm.input.value = "1750"; update(); });
  const oSync = makeOutputLine(outputRegion, "Synchronous speed", "mss-out-sync");
  const oSlip = makeOutputLine(outputRegion, "Slip", "mss-out-slip");
  const oRotor = makeOutputLine(outputRegion, "Rotor (slip) frequency", "mss-out-rotor");
  const oNote = makeOutputLine(outputRegion, "Note", "mss-out-note");
  const update = debounce(() => {
    const r = computeMotorSyncSlip({ line_freq_hz: Number(freq.input.value) || 0, poles: Number(poles.input.value) || 0, rated_rpm: Number(rpm.input.value) || 0 });
    if (r.error) { oSync.textContent = r.error; oSlip.textContent = "-"; oRotor.textContent = "-"; oNote.textContent = "-"; return; }
    oSync.textContent = fmt(r.sync_rpm, 0) + " rpm";
    oSlip.textContent = fmt(r.slip_pct, 2) + " % (slip " + fmt(r.slip, 4) + ")";
    oRotor.textContent = fmt(r.rotor_freq_hz, 2) + " Hz";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [freq.input, poles.input, rpm.input]) el.addEventListener("input", update);
}
MOTOR_RENDERERS["motor-synchronous-speed-slip"] = renderMotorSyncSlip;

// dims: in { rated_rpm: T^-1, line_freq_hz: T^-1 } out: { poles: dimensionless, sync_rpm: T^-1, slip: dimensionless, slip_pct: dimensionless }
export function computeMotorPoleIdentification({ rated_rpm = 0, line_freq_hz = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_rpm > 0)) return { error: "Nameplate full-load speed must be positive (rpm)." };
  if (!(line_freq_hz > 0)) return { error: "Line frequency must be positive (Hz)." };
  const pole_pairs = Math.round((60 * line_freq_hz) / rated_rpm);
  const poles = Math.max(2, 2 * pole_pairs);
  const sync_rpm = (120 * line_freq_hz) / poles;
  const slip = (sync_rpm - rated_rpm) / sync_rpm;
  const slip_pct = slip * 100;
  const at_or_above_sync = slip <= 0;
  return {
    poles, sync_rpm, slip, slip_pct, at_or_above_sync,
    note: "Identify an induction motor's pole count from the nameplate full-load speed and the line frequency, the inverse of the synchronous-speed relation Ns = 120 x f / P. The synchronous speed sits just above the running speed, so the pole count is the nearest even integer: pole-pairs = round(60 x f / rpm), poles = 2 x pole-pairs, then Ns = 120 x f / poles and slip = (Ns - rpm)/Ns. A 1750 rpm 60 Hz motor is a 4-pole machine (Ns 1800, 2.78% slip); 1150 rpm is 6-pole, 3450 rpm is 2-pole. If the entered speed is at or above the identified synchronous speed the slip is zero or negative, which an induction-motor nameplate never shows - recheck the rpm or frequency. The nameplate and the manufacturer govern.",
  };
}
export const motorPoleIdentificationExample = { inputs: { rated_rpm: 1750, line_freq_hz: 60 } };
function renderMotorPoleIdentification(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles AC-machine relation Ns = 120 x f / P inverted to identify the poles - pole-pairs = round(60 x f / rpm), poles = 2 x pole-pairs, then Ns = 120 x f / poles and slip = (Ns - rpm)/Ns. The motor nameplate and the manufacturer govern the rated full-load speed.";
  const rpm = makeNumber("Nameplate full-load speed (rpm)", "mpi-rpm", { step: "any", min: "0", value: "1750" });
  rpm.input.value = "1750";
  const freq = makeNumber("Line frequency (Hz)", "mpi-freq", { step: "any", min: "0", value: "60" });
  freq.input.value = "60";
  for (const f of [rpm, freq]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rpm.input.value = "1750"; freq.input.value = "60"; update(); });
  const oPoles = makeOutputLine(outputRegion, "Poles / synchronous speed", "mpi-out-poles");
  const oSlip = makeOutputLine(outputRegion, "Full-load slip", "mpi-out-slip");
  const oNote = makeOutputLine(outputRegion, "Note", "mpi-out-note");
  const update = debounce(() => {
    const r = computeMotorPoleIdentification({ rated_rpm: Number(rpm.input.value) || 0, line_freq_hz: Number(freq.input.value) || 0 });
    if (r.error) { oPoles.textContent = r.error; oSlip.textContent = "-"; oNote.textContent = "-"; return; }
    oPoles.textContent = fmt(r.poles, 0) + "-pole (Ns " + fmt(r.sync_rpm, 0) + " rpm)";
    oSlip.textContent = r.at_or_above_sync ? fmt(r.slip_pct, 2) + " % - at/above synchronous, recheck the rpm/frequency" : fmt(r.slip_pct, 2) + " % (slip " + fmt(r.slip, 4) + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [rpm.input, freq.input]) el.addEventListener("input", update);
}
MOTOR_RENDERERS["motor-pole-identification"] = renderMotorPoleIdentification;

// dims: in { rpm: T^-1, hp: M L^2 T^-3, torque_lbft: M L^2 T^-2 } out: { hp: M L^2 T^-3, torque_lbft: M L^2 T^-2, rpm: T^-1 }
export function computeMotorShaftTorque({ rpm = 0, hp = null, torque_lbft = null } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const HP = num(hp), TQ = num(torque_lbft);
  if (!(rpm > 0)) return { error: "Shaft speed must be positive (rpm)." };
  if ((HP === null) === (TQ === null)) return { error: "Supply exactly one of horsepower or torque; the tile solves for the other." };
  let out_hp, out_torque;
  if (HP !== null) {
    if (!(HP > 0)) return { error: "Horsepower must be positive." };
    out_hp = HP; out_torque = (5252 * HP) / rpm;
  } else {
    if (!(TQ > 0)) return { error: "Torque must be positive (lb-ft)." };
    out_torque = TQ; out_hp = (TQ * rpm) / 5252;
  }
  return {
    hp: out_hp, torque_lbft: out_torque, rpm,
    note: "T = 5252 x HP / RPM (the 5252 = 33,000 ft-lb/min per HP divided by 2 pi, the rev/min-to-rad/s bridge); equivalently HP = T x RPM / 5252. The nameplate and the driven load govern the service-factor margin.",
  };
}
export const motorShaftTorqueExample = { inputs: { rpm: 1750, hp: 10 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderMotorShaftTorque(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles rotational-power identity T = 5252 x HP / RPM (5252 = 33,000 / 2 pi); supply HP to solve torque or torque to solve HP. The motor nameplate and the driven-load data govern the design torque.";
  const rpm = makeNumber("Shaft speed (rpm)", "mst-rpm", { step: "any", min: "0" });
  const hp = makeNumber("Horsepower (blank to solve from torque)", "mst-hp", { step: "any", min: "0" });
  const torque = makeNumber("Torque (lb-ft; blank to solve from HP)", "mst-torque", { step: "any", min: "0" });
  for (const f of [rpm, hp, torque]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rpm.input.value = "1750"; hp.input.value = "10"; torque.input.value = ""; update(); });
  const oTorque = makeOutputLine(outputRegion, "Shaft torque", "mst-out-torque");
  const oHp = makeOutputLine(outputRegion, "Horsepower", "mst-out-hp");
  const oNote = makeOutputLine(outputRegion, "Note", "mst-out-note");
  const readNum = (input) => (input.value === "" ? null : (Number.isFinite(Number(input.value)) ? Number(input.value) : null));
  const update = debounce(() => {
    const r = computeMotorShaftTorque({ rpm: Number(rpm.input.value) || 0, hp: readNum(hp.input), torque_lbft: readNum(torque.input) });
    if (r.error) { oTorque.textContent = r.error; oHp.textContent = "-"; oNote.textContent = "-"; return; }
    oTorque.textContent = fmt(r.torque_lbft, 2) + " lb-ft";
    oHp.textContent = fmt(r.hp, 2) + " HP";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [rpm.input, hp.input, torque.input]) el.addEventListener("input", update);
}
MOTOR_RENDERERS["motor-shaft-torque"] = renderMotorShaftTorque;

// dims: in { hp: M L^2 T^-3, efficiency_pct: dimensionless, load_factor_pct: dimensionless, hours_per_year: T, rate_usd_per_kwh: dimensionless } out: { input_kw: M L^2 T^-3, annual_kwh: M L^2 T^-2, annual_cost: dimensionless }
export function computeMotorOperatingCost({ hp = 0, efficiency_pct = 93, load_factor_pct = 100, hours_per_year = 0, rate_usd_per_kwh = 0.12 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hp > 0)) return { error: "Horsepower must be positive." };
  if (!(hours_per_year > 0)) return { error: "Annual run hours must be positive." };
  if (!(efficiency_pct > 0 && efficiency_pct <= 100)) return { error: "Efficiency must be in (0, 100] percent." };
  if (!(load_factor_pct >= 0)) return { error: "Load factor cannot be negative (percent)." };
  if (!(rate_usd_per_kwh >= 0)) return { error: "Energy rate cannot be negative ($/kWh)." };
  const input_kw = (hp * 0.746 * (load_factor_pct / 100)) / (efficiency_pct / 100);
  const annual_kwh = input_kw * hours_per_year;
  const annual_cost = annual_kwh * rate_usd_per_kwh;
  return {
    input_kw, annual_kwh, annual_cost,
    note: "input_kW = HP x 0.746 x load / efficiency; annual_kWh = input_kW x run-hours; cost = kWh x rate. This is the energy charge only -- the utility tariff (demand charges, time-of-use, power-factor penalties) governs the full bill.",
  };
}
export const motorOperatingCostExample = { inputs: { hp: 25, efficiency_pct: 93, load_factor_pct: 100, hours_per_year: 4000, rate_usd_per_kwh: 0.12 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderMotorOperatingCost(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles input_kW = HP x 0.746 x load / efficiency, then annual kWh x rate. The 0.746 kW/HP is the mechanical-to-electrical conversion; the result is the energy-charge component only and excludes demand / time-of-use / power-factor penalties. The utility tariff governs the bill.";
  const hp = makeNumber("Rated horsepower", "moc-hp", { step: "any", min: "0" });
  const eff = makeNumber("Full-load efficiency (%)", "moc-eff", { step: "any", min: "0", max: "100", value: "93" });
  eff.input.value = "93";
  const load = makeNumber("Average load (% of rated)", "moc-load", { step: "any", min: "0", value: "100" });
  load.input.value = "100";
  const hours = makeNumber("Run hours per year", "moc-hours", { step: "any", min: "0" });
  const rate = makeNumber("Energy rate ($/kWh)", "moc-rate", { step: "any", min: "0", value: "0.12" });
  rate.input.value = "0.12";
  for (const f of [hp, eff, load, hours, rate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hp.input.value = "25"; eff.input.value = "93"; load.input.value = "100"; hours.input.value = "4000"; rate.input.value = "0.12"; update(); });
  const oKw = makeOutputLine(outputRegion, "Input power", "moc-out-kw");
  const oKwh = makeOutputLine(outputRegion, "Annual energy", "moc-out-kwh");
  const oCost = makeOutputLine(outputRegion, "Annual energy cost", "moc-out-cost");
  const oNote = makeOutputLine(outputRegion, "Note", "moc-out-note");
  const update = debounce(() => {
    const r = computeMotorOperatingCost({ hp: Number(hp.input.value) || 0, efficiency_pct: Number(eff.input.value) || 0, load_factor_pct: Number(load.input.value) || 0, hours_per_year: Number(hours.input.value) || 0, rate_usd_per_kwh: Number(rate.input.value) || 0 });
    if (r.error) { oKw.textContent = r.error; oKwh.textContent = "-"; oCost.textContent = "-"; oNote.textContent = "-"; return; }
    oKw.textContent = fmt(r.input_kw, 2) + " kW";
    oKwh.textContent = fmt(r.annual_kwh, 0) + " kWh/yr";
    oCost.textContent = "$" + fmt(r.annual_cost, 0) + "/yr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [hp.input, eff.input, load.input, hours.input, rate.input]) el.addEventListener("input", update);
}
MOTOR_RENDERERS["motor-operating-cost"] = renderMotorOperatingCost;

// motor-run-hours-for-budget: inverse of motor-operating-cost. The forward tile gives the annual cost from the run-hours;
// the inverse recovers the run-hours a cost budget buys, hours = budget / (input_kW x rate), with
// input_kW = HP x 0.746 x load / efficiency. It answers "how many hours can I run before I hit the energy budget" and
// reports the input power and the annual kWh at that budget.
// dims: in { hp: dimensionless, efficiency_pct: dimensionless, load_factor_pct: dimensionless, rate_usd_per_kwh: dimensionless, cost_budget_usd: dimensionless } out: { max_hours_per_year: T, input_kw: dimensionless, annual_kwh: dimensionless }
export function computeMotorRunHoursForBudget({ hp = 0, efficiency_pct = 93, load_factor_pct = 100, rate_usd_per_kwh = 0.12, cost_budget_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hp > 0)) return { error: "Horsepower must be positive." };
  if (!(cost_budget_usd > 0)) return { error: "Cost budget must be positive ($)." };
  if (!(efficiency_pct > 0 && efficiency_pct <= 100)) return { error: "Efficiency must be in (0, 100] percent." };
  if (!(load_factor_pct > 0)) return { error: "Load factor must be positive (a motor at zero load draws no billable energy)." };
  if (!(rate_usd_per_kwh > 0)) return { error: "Energy rate must be positive ($/kWh)." };
  const input_kw = (hp * 0.746 * (load_factor_pct / 100)) / (efficiency_pct / 100);
  const max_hours_per_year = cost_budget_usd / (input_kw * rate_usd_per_kwh);
  const annual_kwh = input_kw * max_hours_per_year;
  if (![input_kw, max_hours_per_year, annual_kwh].every(Number.isFinite)) return { error: "Run-hours math is not a finite value." };
  return {
    input_kw, max_hours_per_year, annual_kwh,
    note: "max run-hours = budget / (input_kW x rate), input_kW = HP x 0.746 x load / efficiency. This is the energy charge only -- the utility tariff (demand charges, time-of-use, power-factor penalties) governs the full bill, so the real hours before a bill target are fewer. There are about 8,760 hours in a year; if this exceeds that, the budget covers continuous running with room to spare.",
  };
}
export const motorRunHoursForBudgetExample = { inputs: { hp: 25, efficiency_pct: 93, load_factor_pct: 100, rate_usd_per_kwh: 0.12, cost_budget_usd: 5000 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderMotorRunHoursForBudget(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles run-hours = budget / (input_kW x rate), input_kW = HP x 0.746 x load / efficiency. The 0.746 kW/HP is the mechanical-to-electrical conversion; the result is the energy-charge component only and excludes demand / time-of-use / power-factor penalties. The utility tariff governs the bill.";
  const hp = makeNumber("Rated horsepower", "mrh-hp", { step: "any", min: "0" });
  const eff = makeNumber("Full-load efficiency (%)", "mrh-eff", { step: "any", min: "0", max: "100", value: "93" });
  eff.input.value = "93";
  const load = makeNumber("Average load (% of rated)", "mrh-load", { step: "any", min: "0", value: "100" });
  load.input.value = "100";
  const rate = makeNumber("Energy rate ($/kWh)", "mrh-rate", { step: "any", min: "0", value: "0.12" });
  rate.input.value = "0.12";
  const budget = makeNumber("Annual energy budget ($)", "mrh-budget", { step: "any", min: "0" });
  for (const f of [hp, eff, load, rate, budget]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hp.input.value = "25"; eff.input.value = "93"; load.input.value = "100"; rate.input.value = "0.12"; budget.input.value = "5000"; update(); });
  const oHours = makeOutputLine(outputRegion, "Max run hours per year", "mrh-out-hours");
  const oKw = makeOutputLine(outputRegion, "Input power", "mrh-out-kw");
  const oKwh = makeOutputLine(outputRegion, "Energy at that budget", "mrh-out-kwh");
  const oNote = makeOutputLine(outputRegion, "Note", "mrh-out-note");
  const update = debounce(() => {
    const r = computeMotorRunHoursForBudget({ hp: Number(hp.input.value) || 0, efficiency_pct: Number(eff.input.value) || 0, load_factor_pct: Number(load.input.value) || 0, rate_usd_per_kwh: Number(rate.input.value) || 0, cost_budget_usd: Number(budget.input.value) || 0 });
    if (r.error) { oHours.textContent = r.error; oKw.textContent = "-"; oKwh.textContent = "-"; oNote.textContent = "-"; return; }
    oHours.textContent = fmt(r.max_hours_per_year, 0) + " hr/yr";
    oKw.textContent = fmt(r.input_kw, 2) + " kW";
    oKwh.textContent = fmt(r.annual_kwh, 0) + " kWh/yr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [hp.input, eff.input, load.input, rate.input, budget.input]) el.addEventListener("input", update);
}
MOTOR_RENDERERS["motor-run-hours-for-budget"] = renderMotorRunHoursForBudget;

const _OCPD_STANDARD_SIZES = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];
function _standardOcpdAtOrBelow(a) {
  let chosen = null;
  for (const s of _OCPD_STANDARD_SIZES) { if (s <= a) chosen = s; else break; }
  return chosen; // null if below the smallest standard size
}

// dims: in { largest_flc_a: I, sum_other_flc_a: I, largest_branch_ocpd_a: I } out: { min_feeder_ampacity_a: I, max_feeder_ocpd_a: I, standard_feeder_ocpd_a: I }
export function computeMultiMotorFeeder({ largest_flc_a = 0, sum_other_flc_a = 0, largest_branch_ocpd_a = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(largest_flc_a >= 0)) return { error: "Largest motor full-load current cannot be negative (A)." };
  if (!(sum_other_flc_a >= 0)) return { error: "Sum of other motor full-load currents cannot be negative (A)." };
  if (!(largest_branch_ocpd_a >= 0)) return { error: "Largest branch overcurrent device rating cannot be negative (A)." };
  const min_feeder_ampacity_a = 1.25 * largest_flc_a + sum_other_flc_a; // 430.24
  const max_feeder_ocpd_a = largest_branch_ocpd_a + sum_other_flc_a; // 430.62 ceiling
  const standard_feeder_ocpd_a = _standardOcpdAtOrBelow(max_feeder_ocpd_a); // round DOWN, cannot exceed
  return {
    min_feeder_ampacity_a, max_feeder_ocpd_a, standard_feeder_ocpd_a,
    note: "430.24: feeder conductors >= 125% of the largest motor FLC + the sum of the other motor FLCs. 430.62: feeder OCPD <= the largest motor's branch OCPD + the sum of the other FLCs, then the NEXT STANDARD SIZE DOWN (it may not exceed the limit). Use the NEC FLC table value (430.248/430.250), not the nameplate amps. The AHJ governs.",
  };
}
export const multiMotorFeederExample = { inputs: { largest_flc_a: 28, sum_other_flc_a: 26, largest_branch_ocpd_a: 70 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderMultiMotorFeeder(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 430.24 (feeder conductor = 1.25 x largest FLC + sum of others) and 430.62 (feeder OCPD <= largest branch OCPD + sum of others, next standard size down). Full-load currents are the NEC table values (430.248/430.250), user-supplied; the tile bundles no FLC table. The AHJ governs. Free read-only at nfpa.org/freeaccess.";
  const largest = makeNumber("Largest motor FLC (A, table value)", "mmf-largest", { step: "any", min: "0" });
  const others = makeNumber("Sum of other motor FLCs (A)", "mmf-others", { step: "any", min: "0" });
  const ocpd = makeNumber("Largest motor branch OCPD (A)", "mmf-ocpd", { step: "any", min: "0" });
  for (const f of [largest, others, ocpd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { largest.input.value = "28"; others.input.value = "26"; ocpd.input.value = "70"; update(); });
  const oAmp = makeOutputLine(outputRegion, "Min feeder ampacity (430.24)", "mmf-out-amp");
  const oMax = makeOutputLine(outputRegion, "Max feeder OCPD (430.62)", "mmf-out-max");
  const oStd = makeOutputLine(outputRegion, "Standard OCPD (round down)", "mmf-out-std");
  const oNote = makeOutputLine(outputRegion, "Note", "mmf-out-note");
  const update = debounce(() => {
    const r = computeMultiMotorFeeder({ largest_flc_a: Number(largest.input.value) || 0, sum_other_flc_a: Number(others.input.value) || 0, largest_branch_ocpd_a: Number(ocpd.input.value) || 0 });
    if (r.error) { oAmp.textContent = r.error; oMax.textContent = "-"; oStd.textContent = "-"; oNote.textContent = "-"; return; }
    oAmp.textContent = fmt(r.min_feeder_ampacity_a, 1) + " A (size conductors at 75 C >= this)";
    oMax.textContent = fmt(r.max_feeder_ocpd_a, 1) + " A ceiling";
    oStd.textContent = r.standard_feeder_ocpd_a === null ? "(below the smallest standard size; review)" : r.standard_feeder_ocpd_a + " A standard";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [largest.input, others.input, ocpd.input]) el.addEventListener("input", update);
}
MOTOR_RENDERERS["multi-motor-feeder"] = renderMultiMotorFeeder;

// =====================================================================
// spec-v278: motor running overload protection (NEC 430.32), Group A.
// The companion device to motor-branch-protection (430.52): the branch
// device is sized on the table FLC; the running overload on the
// nameplate FLA. 125%/140% for a marked SF >= 1.15 or rise <= 40 degC,
// 115%/130% otherwise.
// =====================================================================

// dims: in { fla_A: I, sf: dimensionless, rise_C: T } out: { ol_A: I, ol_max_A: I, mult: dimensionless, mult_max: dimensionless }
export function computeMotorOverloadSizing({ fla_A = 0, sf = 0, rise_C = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fla_A > 0)) return { error: "Nameplate full-load current must be positive (A)." };
  if (sf < 0) return { error: "Service factor cannot be negative." };
  if (rise_C < 0) return { error: "Temperature rise cannot be negative (degC)." };
  // 430.32(A)(1): the higher class needs a MARKED SF >= 1.15 or a MARKED
  // rise <= 40 degC; a blank (zero) entry means unmarked and does not qualify.
  const hi_class = sf >= 1.15 || (rise_C > 0 && rise_C <= 40);
  const mult = hi_class ? 1.25 : 1.15;
  const mult_max = hi_class ? 1.40 : 1.30;
  const ol_A = fla_A * mult;
  const ol_max_A = fla_A * mult_max;
  return {
    hi_class, mult, mult_max, ol_A, ol_max_A,
    note: "NEC 430.32(A)(1) running overload on the motor NAMEPLATE FLA (not the table FLC the 430.52 branch device uses): 125% of FLA for a continuous-duty motor over 1 hp with a marked service factor of 1.15 or more or a marked temperature rise of 40 degC or less, 115% otherwise. Where the motor will not start or carry its load at that setting, 430.32(C) permits up to 140% (130% for the lower class). Leave an unmarked service factor or rise blank - an unmarked motor takes the lower class. Small-motor (430.32(B)), fuse-as-overload (430.36), and thermally protected cases are separate. A design aid; the AHJ governs.",
  };
}
export const motorOverloadSizingExample = { inputs: { fla_A: 26, sf: 1.15, rise_C: 40 } };

function renderMotorOverloadSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 430.32(A)(1) running-overload sizing on the nameplate FLA (125% for marked SF >= 1.15 or rise <= 40 degC, else 115%) with the 430.32(C) 140%/130% will-not-start ceiling, by name. The separate device from the 430.52 branch protection. The AHJ governs.";
  const fla = makeNumber("Nameplate full-load current FLA (A)", "mos-fla", { step: "any", min: "0" });
  const sf = makeNumber("Marked service factor (blank if unmarked)", "mos-sf", { step: "any", min: "0" });
  const rise = makeNumber("Marked temperature rise (degC, blank if unmarked)", "mos-rise", { step: "any", min: "0" });
  for (const f of [fla, sf, rise]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fla.input.value = "26"; sf.input.value = "1.15"; rise.input.value = "40"; update(); });
  const oClass = makeOutputLine(outputRegion, "430.32(A)(1) class", "mos-out-class");
  const oOl = makeOutputLine(outputRegion, "Overload setting", "mos-out-ol");
  const oMax = makeOutputLine(outputRegion, "430.32(C) maximum (will not start)", "mos-out-max");
  const oNote = makeOutputLine(outputRegion, "Note", "mos-out-note");
  const update = debounce(() => {
    const r = computeMotorOverloadSizing({ fla_A: Number(fla.input.value) || 0, sf: Number(sf.input.value) || 0, rise_C: Number(rise.input.value) || 0 });
    if (r.error) { oClass.textContent = r.error; oOl.textContent = "-"; oMax.textContent = "-"; oNote.textContent = "-"; return; }
    oClass.textContent = r.hi_class ? "higher (SF >= 1.15 or rise <= 40 degC): 125% base" : "lower (unmarked or outside): 115% base";
    oOl.textContent = fmt(r.ol_A, 1) + " A (" + fmt(r.mult * 100, 0) + "% of FLA)";
    oMax.textContent = fmt(r.ol_max_A, 1) + " A (" + fmt(r.mult_max * 100, 0) + "% of FLA)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [fla, sf, rise]) f.input.addEventListener("input", update);
}
MOTOR_RENDERERS["motor-overload-sizing"] = renderMotorOverloadSizing;

// ===================== spec-v499: motor locked-rotor current from code letter (NEC Table 430.7(B)) =====================
// NEC Table 430.7(B): code letter -> upper bound of the locked-rotor kVA/hp band (I, O, Q are not used).
const _NEC_430_7B_KVA_PER_HP = {
  A: 3.14, B: 3.54, C: 3.99, D: 4.49, E: 4.99, F: 5.59, G: 6.29, H: 7.09, J: 7.99,
  K: 8.99, L: 9.99, M: 11.19, N: 12.49, P: 13.99, R: 15.99, S: 17.99, T: 19.99, U: 22.39, V: 22.4,
};
// dims: in { horsepower: M L^2 T^-3, code_letter: dimensionless, voltage_v: M L^2 T^-3 I^-1, phase: dimensionless } out: { kva_per_hp: dimensionless, locked_rotor_kva: M L^2 T^-3, lra_a: I }
export function computeMotorLockedRotorKva({ horsepower = 0, code_letter = "G", voltage_v = 0, phase = 3 } = {}) {
  const _g = _finiteGuard({ horsepower, voltage_v }); if (_g) return _g;
  const hp = Number(horsepower) || 0;
  const v = Number(voltage_v) || 0;
  const ph = Number(phase) === 1 ? 1 : (Number(phase) === 3 ? 3 : 0);
  const letter = String(code_letter || "").trim().toUpperCase();
  if (!(hp > 0)) return { error: "Horsepower must be positive." };
  if (!(v > 0)) return { error: "Voltage must be positive (V)." };
  if (ph !== 1 && ph !== 3) return { error: "Phase must be 1 or 3." };
  const kva_per_hp = _NEC_430_7B_KVA_PER_HP[letter];
  if (kva_per_hp === undefined) return { error: "Code letter must be a NEC Table 430.7(B) letter (A-V, excluding I, O, Q)." };
  const locked_rotor_kva = hp * kva_per_hp;
  const lra_a = ph === 3 ? locked_rotor_kva * 1000 / (Math.sqrt(3) * v) : locked_rotor_kva * 1000 / v;
  if (![locked_rotor_kva, lra_a].every(Number.isFinite)) return { error: "Locked-rotor math is not a finite value." };
  return {
    kva_per_hp, locked_rotor_kva, lra_a,
    note: "NEC Table 430.7(B) locked-rotor code letter: the letter maps to a band of locked-rotor (starting) kVA per horsepower; this tile uses the upper end of the band for a conservative starting current. locked_rotor_kva = hp x kVA/hp and LRA = kVA x 1000 / (sqrt(3) x V) three-phase (kVA x 1000 / V single-phase). The code letter is about starting kVA and is NOT the design letter (A/B/C/D), which describes the torque-speed curve -- the two are routinely confused. The '6x FLA' rule of thumb holds only for mid-range code letters and undersizes high-code motors that draw 7-8x FLA at start, which the instantaneous-trip breaker, the SCCR check, and the voltage-dip calculation must account for. The actual measured inrush and the motor nameplate govern. A design aid, not a substitute for the nameplate.",
  };
}
export const motorLockedRotorKvaExample = { inputs: { horsepower: 25, code_letter: "G", voltage_v: 460, phase: 3 } };
function renderMotorLockedRotorKva(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Table 430.7(B) locked-rotor indicating code letters: the letter gives the locked-rotor kVA/hp band (upper end used here); locked_rotor_kva = hp x kVA/hp; LRA = kVA x 1000 / (sqrt(3) x V) three-phase. The code letter is not the design letter. A design aid; the nameplate and measured inrush govern.";
  const hp = makeNumber("Motor horsepower (hp)", "mlr-hp", { step: "any", min: "0" }); hp.input.value = "25";
  const code = makeSelect("Code letter (NEC 430.7(B))", "mlr-code", Object.keys(_NEC_430_7B_KVA_PER_HP).map((k) => ({ value: k, label: k + " (" + _NEC_430_7B_KVA_PER_HP[k] + " kVA/hp)", selected: k === "G" })));
  const v = makeNumber("Voltage (V)", "mlr-v", { step: "any", min: "0" }); v.input.value = "460";
  const ph = makeSelect("Phase", "mlr-ph", [
    { value: "3", label: "Three-phase", selected: true },
    { value: "1", label: "Single-phase" },
  ]);
  for (const f of [hp, code, v, ph]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hp.input.value = "25"; code.select.value = "G"; v.input.value = "460"; ph.select.value = "3"; update(); });
  const oKva = makeOutputLine(outputRegion, "Locked-rotor kVA", "mlr-out-kva");
  const oLra = makeOutputLine(outputRegion, "Locked-rotor amps (LRA)", "mlr-out-lra");
  const oNote = makeOutputLine(outputRegion, "Note", "mlr-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMotorLockedRotorKva({ horsepower: readNum(hp.input), code_letter: code.select.value, voltage_v: readNum(v.input), phase: Number(ph.select.value) });
    if (r.error) { oKva.textContent = r.error; oLra.textContent = "-"; oNote.textContent = ""; return; }
    oKva.textContent = fmt(r.locked_rotor_kva, 1) + " kVA (" + fmt(r.kva_per_hp, 2) + " kVA/hp)";
    oLra.textContent = fmt(r.lra_a, 1) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [hp, v]) f.input.addEventListener("input", update);
  for (const f of [code, ph]) f.select.addEventListener("change", update);
}
MOTOR_RENDERERS["motor-locked-rotor-kva"] = renderMotorLockedRotorKva;

// motor-max-hp-for-starting-current: inverse of motor-locked-rotor-kva. The
// forward tile gives the locked-rotor amps from a horsepower; sizing the largest
// motor a starting-current budget (a breaker, a generator, a soft-start rating)
// can start is the inverse. Since LRA is linear in hp for a given code letter and
// voltage, max_hp = target_LRA / LRA(at hp = 1); the forward is reused at hp = 1
// to carry the code-letter band and the 1-/3-phase current relation.
// dims: in { max_starting_current_a: I, code_letter: dimensionless, voltage_v: M L^2 T^-3 I^-1, phase: dimensionless } out: { max_horsepower: M L^2 T^-3, kva_per_hp: dimensionless, lra_per_hp_a: I }
export function computeMotorMaxHpForStartingCurrent({ max_starting_current_a = 0, code_letter = "G", voltage_v = 0, phase = 3 } = {}) {
  const _g = _finiteGuard({ max_starting_current_a, voltage_v }); if (_g) return _g;
  const lra = Number(max_starting_current_a) || 0;
  if (!(lra > 0)) return { error: "Max starting current must be positive (A)." };
  const base = computeMotorLockedRotorKva({ horsepower: 1, code_letter, voltage_v, phase });
  if (base.error) return { error: base.error };
  const lra_per_hp_a = base.lra_a;
  const max_horsepower = lra / lra_per_hp_a;
  if (![max_horsepower, lra_per_hp_a].every(Number.isFinite)) return { error: "Locked-rotor math is not a finite value." };
  return {
    max_horsepower, kva_per_hp: base.kva_per_hp, lra_per_hp_a,
    note: "NEC Table 430.7(B) locked-rotor code letter solved for the horsepower: the largest motor whose starting (locked-rotor) current stays within the budget, since LRA = hp x kVA/hp x 1000 / (sqrt(3) x V) three-phase is linear in hp. Use it to size a motor against an instantaneous-trip breaker, a generator's starting-kVA limit, or an SCCR / voltage-dip ceiling. The code letter is the STARTING-kVA letter, not the design (A/B/C/D torque) letter - the two are routinely confused - and this uses the conservative upper end of the band. The nameplate code letter and the measured inrush govern; a soft starter or wye-delta start lowers the real starting current. A design aid, not a substitute for the nameplate.",
  };
}
export const motorMaxHpForStartingCurrentExample = { inputs: { max_starting_current_a: 300, code_letter: "G", voltage_v: 460, phase: 3 } };
function _v722renderMotorMaxHpForStartingCurrent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Table 430.7(B) locked-rotor code letters solved for the horsepower: max hp = starting-current budget / (kVA/hp x 1000 / (sqrt(3) x V)) three-phase. The code letter is the starting-kVA letter, not the design letter. A design aid; the nameplate and measured inrush govern.";
  const lra = makeNumber("Max starting current budget (A)", "mmh-lra", { step: "any", min: "0" }); lra.input.value = "300";
  const code = makeSelect("Code letter (NEC 430.7(B))", "mmh-code", Object.keys(_NEC_430_7B_KVA_PER_HP).map((k) => ({ value: k, label: k + " (" + _NEC_430_7B_KVA_PER_HP[k] + " kVA/hp)", selected: k === "G" })));
  const v = makeNumber("Voltage (V)", "mmh-v", { step: "any", min: "0" }); v.input.value = "460";
  const ph = makeSelect("Phase", "mmh-ph", [
    { value: "3", label: "Three-phase", selected: true },
    { value: "1", label: "Single-phase" },
  ]);
  for (const f of [lra, code, v, ph]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lra.input.value = "300"; code.select.value = "G"; v.input.value = "460"; ph.select.value = "3"; update(); });
  const oHp = makeOutputLine(outputRegion, "Max motor horsepower", "mmh-out-hp");
  const oLra = makeOutputLine(outputRegion, "Starting current per hp", "mmh-out-lra");
  const oNote = makeOutputLine(outputRegion, "Note", "mmh-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMotorMaxHpForStartingCurrent({ max_starting_current_a: readNum(lra.input), code_letter: code.select.value, voltage_v: readNum(v.input), phase: Number(ph.select.value) });
    if (r.error) { oHp.textContent = r.error; oLra.textContent = "-"; oNote.textContent = ""; return; }
    oHp.textContent = fmt(r.max_horsepower, 1) + " hp (" + fmt(r.kva_per_hp, 2) + " kVA/hp)";
    oLra.textContent = fmt(r.lra_per_hp_a, 1) + " A/hp";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [lra, v]) f.input.addEventListener("input", update);
  for (const f of [code, ph]) f.select.addEventListener("change", update);
}
MOTOR_RENDERERS["motor-max-hp-for-starting-current"] = _v722renderMotorMaxHpForStartingCurrent;

// ===================== spec-v521: motor short-circuit contribution (first cycle) =====================
// dims: in { motor_fla_a: I, x_subtransient_pu: dimensionless, utility_fault_a: I } out: { contribution_a: I, total_a: I, multiple: dimensionless }
export function computeMotorFaultContribution({ motor_fla_a = 0, x_subtransient_pu = 0.167, utility_fault_a = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fla = Number(motor_fla_a) || 0;
  const xd = Number(x_subtransient_pu) || 0;
  const util = Number(utility_fault_a) || 0;
  if (!(fla > 0)) return { error: "Summed motor full-load current must be positive (A)." };
  if (!(xd > 0 && xd <= 1)) return { error: "Subtransient reactance must be over 0 and at most 1 per unit." };
  if (util < 0) return { error: "Utility fault current cannot be negative (A)." };
  const contribution_a = fla / xd;
  const total_a = util + contribution_a;
  const multiple = contribution_a / fla;
  if (![contribution_a, total_a, multiple].every(Number.isFinite)) return { error: "Motor-contribution math is not a finite value." };
  return {
    contribution_a, total_a, multiple,
    note: "Motor short-circuit contribution (first cycle): for the first cycle after a fault, every spinning motor becomes a generator -- its rotating inertia drives current INTO the fault at roughly its full-load current divided by its subtransient reactance (about 4 to 6 times FLA). contribution = motor_FLA / x_subtransient, and the total first-cycle fault = utility_fault + contribution. Ignore it and the interrupting duty is under-reported, which can leave a panel's AIC rating exceeded by the real first-cycle current. This is a FIRST-CYCLE effect that decays within a few cycles -- it matters for the momentary and interrupting ratings, not the steady-state fault. Grouped small motors are often taken at a lumped 4x FLA per IEEE C37.13 while a single large machine uses its own reactance. A design aid, not the engineer of record; a full short-circuit study governs.",
  };
}
export const motorFaultContributionExample = { inputs: { motor_fla_a: 500, x_subtransient_pu: 0.167, utility_fault_a: 22000 } };
function renderMotorFaultContribution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-cycle motor short-circuit contribution (IEEE C37.13 / IEEE 141): contribution = summed motor FLA / subtransient reactance (~4-6x FLA), total = utility fault + contribution. A first-cycle effect for the momentary and interrupting duty; grouped small motors often lumped at 4x FLA per IEEE C37.13. A design aid; a full short-circuit study governs.";
  const fla = makeNumber("Summed motor full-load current (A)", "mfc-fla", { step: "any", min: "0" }); fla.input.value = "500";
  const xd = makeNumber("Subtransient reactance (per unit, 0.167 = 16.7%)", "mfc-xd", { step: "any", min: "0", max: "1" }); xd.input.value = "0.167";
  const util = makeNumber("Utility / transformer fault current (A)", "mfc-util", { step: "any", min: "0" }); util.input.value = "22000";
  for (const f of [fla, xd, util]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fla.input.value = "500"; xd.input.value = "0.167"; util.input.value = "22000"; update(); });
  const oC = makeOutputLine(outputRegion, "Motor contribution (first cycle)", "mfc-out-c");
  const oT = makeOutputLine(outputRegion, "Total first-cycle fault", "mfc-out-t");
  const oNote = makeOutputLine(outputRegion, "Note", "mfc-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMotorFaultContribution({ motor_fla_a: readNum(fla.input), x_subtransient_pu: xd.input.value === "" ? 0.167 : readNum(xd.input), utility_fault_a: readNum(util.input) });
    if (r.error) { oC.textContent = r.error; oT.textContent = "-"; oNote.textContent = ""; return; }
    oC.textContent = fmt(r.contribution_a, 0) + " A (" + fmt(r.multiple, 1) + "x FLA)";
    oT.textContent = fmt(r.total_a, 0) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [fla, xd, util]) f.input.addEventListener("input", update);
}
MOTOR_RENDERERS["motor-fault-contribution"] = renderMotorFaultContribution;

// ===================== spec-v522: reduced-voltage starter current and torque =====================
// dims: in { across_line_lra_a: I, across_line_lrt_pct: dimensionless, starter_type: dimensionless, tap_fraction: dimensionless } out: { motor_current_a: I, line_current_a: I, torque_pct: dimensionless }
export function computeReducedVoltageStarter({ across_line_lra_a = 0, across_line_lrt_pct = 100, starter_type = "autotransformer", tap_fraction = 0.65 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const lra = Number(across_line_lra_a) || 0;
  const lrt = Number(across_line_lrt_pct) || 0;
  const type = String(starter_type);
  const tap = Number(tap_fraction) || 0;
  if (!(lra > 0)) return { error: "Across-the-line LRA must be positive (A)." };
  if (lrt < 0) return { error: "Across-the-line torque basis cannot be negative (%)." };
  if (type !== "autotransformer" && type !== "wye-delta" && type !== "solid-state") return { error: "Starter type must be autotransformer, wye-delta, or solid-state." };
  let motor_current_a, line_current_a, torque_pct;
  if (type === "wye-delta") {
    motor_current_a = 0.333 * lra;
    line_current_a = 0.333 * lra;
    torque_pct = 0.333 * lrt;
  } else {
    if (!(tap > 0 && tap <= 1)) return { error: "Tap / voltage fraction must be over 0 and at most 1." };
    if (type === "autotransformer") {
      motor_current_a = tap * lra;
      line_current_a = tap * tap * lra;
      torque_pct = tap * tap * lrt;
    } else { // solid-state / reactor
      motor_current_a = tap * lra;
      line_current_a = tap * lra;
      torque_pct = tap * tap * lrt;
    }
  }
  if (![motor_current_a, line_current_a, torque_pct].every(Number.isFinite)) return { error: "Reduced-voltage-starter math is not a finite value." };
  return {
    motor_current_a, line_current_a, torque_pct, starter_type: type,
    note: "Reduced-voltage-starter current and torque (NEMA ICS 2; torque proportional to voltage squared). Torque falls with the SQUARE of the applied voltage, so a 65% voltage delivers only 42% of locked-rotor torque -- reduce the inrush too far and the motor will not break the load away. The catch that trips techs: an AUTOTRANSFORMER draws a LINE current of the tap SQUARED times the across-the-line value (not the tap), because it trades voltage for current -- at a 65% tap the motor sees 65% current but the line sees only 42%. That squared line-current cut is why an autotransformer beats a reactor or solid-state start at equal reduced voltage. Wye-delta gives a fixed one-third of current and torque. A design aid, not the engineer of record; the motor speed-torque curve and the load govern.",
  };
}
export const reducedVoltageStarterExample = { inputs: { across_line_lra_a: 600, across_line_lrt_pct: 100, starter_type: "autotransformer", tap_fraction: 0.65 } };
function renderReducedVoltageStarter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: reduced-voltage-starter current and torque (NEMA ICS 2; torque ~ voltage^2): autotransformer motor = tap x LRA, line = tap^2 x LRA, torque = tap^2 x LRT; wye-delta = 0.333x on current and torque; solid-state/reactor = tap x LRA on both with tap^2 x LRT. An autotransformer's line current is the tap squared. A design aid; the motor speed-torque curve and the load govern.";
  const lra = makeNumber("Across-the-line LRA (A)", "rvs-lra", { step: "any", min: "0" }); lra.input.value = "600";
  const lrt = makeNumber("Across-the-line torque basis (%)", "rvs-lrt", { step: "any", min: "0" }); lrt.input.value = "100";
  const type = makeSelect("Starter type", "rvs-type", [
    { value: "autotransformer", label: "Autotransformer (line = tap^2)", selected: true },
    { value: "wye-delta", label: "Wye-delta (fixed 1/3)" },
    { value: "solid-state", label: "Solid-state / reactor (line = tap)" },
  ]);
  const tap = makeNumber("Tap / voltage fraction (e.g. 0.65)", "rvs-tap", { step: "any", min: "0", max: "1" }); tap.input.value = "0.65";
  for (const f of [lra, lrt, type, tap]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lra.input.value = "600"; lrt.input.value = "100"; type.select.value = "autotransformer"; tap.input.value = "0.65"; update(); });
  const oM = makeOutputLine(outputRegion, "Motor current", "rvs-out-m");
  const oL = makeOutputLine(outputRegion, "Line current", "rvs-out-l");
  const oT = makeOutputLine(outputRegion, "Starting torque", "rvs-out-t");
  const oNote = makeOutputLine(outputRegion, "Note", "rvs-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeReducedVoltageStarter({ across_line_lra_a: readNum(lra.input), across_line_lrt_pct: lrt.input.value === "" ? 100 : readNum(lrt.input), starter_type: type.select.value, tap_fraction: tap.input.value === "" ? 0.65 : readNum(tap.input) });
    if (r.error) { oM.textContent = r.error; oL.textContent = "-"; oT.textContent = "-"; oNote.textContent = ""; return; }
    oM.textContent = fmt(r.motor_current_a, 0) + " A";
    oL.textContent = fmt(r.line_current_a, 0) + " A";
    oT.textContent = fmt(r.torque_pct, 1) + "% of locked-rotor torque";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [lra, lrt, tap]) f.input.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
MOTOR_RENDERERS["reduced-voltage-starter"] = renderReducedVoltageStarter;

// --- spec-v557 A: VFD reflected-wave cable-length limit (NEMA MG-1 Part 31) ---
// cable_velocity = 0.01 x velocity_pct x 984. L_crit = rise_time x cable_velocity / 2. V_peak doubles past L_crit.
// dims: in { rise_time_us: T, velocity_pct: dimensionless, system_voltage_v: dimensionless, run_length_ft: L } out: { l_crit_ft: L, v_peak_v: dimensionless, limit_invduty_v: dimensionless }
export function computeVfdReflectedWave({ rise_time_us = 0, velocity_pct = 50, system_voltage_v = 0, run_length_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rt = Number(rise_time_us) || 0;
  const vp = Number(velocity_pct) || 0;
  const Vll = Number(system_voltage_v) || 0;
  const run = Number(run_length_ft) || 0;
  if (!(rt > 0)) return { error: "Rise time must be positive (us)." };
  if (!(vp > 0)) return { error: "Cable velocity percent must be positive." };
  if (!(Vll > 0)) return { error: "System voltage must be positive (V)." };
  if (!(run > 0)) return { error: "Run length must be positive (ft)." };
  const cable_velocity_ft_us = 0.01 * vp * 984;
  const l_crit_ft = rt * cable_velocity_ft_us / 2;
  const v_bus_v = Math.SQRT2 * Vll;
  const v_peak_v = run > l_crit_ft ? 2 * v_bus_v : v_bus_v * (1 + run / l_crit_ft);
  const limit_invduty_v = 3.1 * Vll;
  const limit_genpurpose_v = 1000;
  return {
    cable_velocity_ft_us, l_crit_ft, v_bus_v, v_peak_v, limit_invduty_v, limit_genpurpose_v,
    exceeds_invduty: v_peak_v > limit_invduty_v,
    exceeds_genpurpose: v_peak_v > limit_genpurpose_v,
    note: "The limit is set by the drive rise time, not the motor horsepower. Above the critical length the reflection fully develops and the peak terminal voltage reaches twice the DC bus. NEMA MG-1 Part 31 inverter-duty insulation withstands about 3.1 times the line-to-line, while a general-purpose motor is limited near 1000 V. The fix is a dV/dt or sine-wave filter or an inverter-duty motor. The drive and motor data govern.",
  };
}
export const vfdReflectedWaveExample = { inputs: { rise_time_us: 0.1, velocity_pct: 50, system_voltage_v: 480, run_length_ft: 100 } };

function renderVfdReflectedWave(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: VFD reflected-wave cable-length limit (NEMA MG-1 Part 31; transmission-line reflection): cable_velocity = 0.01 x velocity_pct x 984; L_crit = rise_time x cable_velocity / 2; V_bus = sqrt(2) x V_LL; V_peak = 2 V_bus past L_crit; limits 3.1 x V_LL (inverter-duty) and ~1000 V (general-purpose). The limit is the drive rise time, not the horsepower. The fix is a dV/dt filter or an inverter-duty motor. The drive and motor data govern.";
  const rt = makeNumber("Drive rise time (us)", "rw-rt", { step: "any", min: "0", value: "0.1" }); rt.input.value = "0.1";
  const vp = makeNumber("Cable velocity (% of light)", "rw-vp", { step: "any", min: "0", value: "50" }); vp.input.value = "50";
  const Vll = makeNumber("System voltage V_LL (V)", "rw-v", { step: "any", min: "0", value: "480" }); Vll.input.value = "480";
  const run = makeNumber("Cable run length (ft)", "rw-run", { step: "any", min: "0", value: "100" }); run.input.value = "100";
  for (const f of [rt, vp, Vll, run]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rt.input.value = "0.1"; vp.input.value = "50"; Vll.input.value = "480"; run.input.value = "100"; update(); });
  const oL = makeOutputLine(outputRegion, "Critical length", "rw-out-l");
  const oV = makeOutputLine(outputRegion, "Peak terminal voltage", "rw-out-v");
  const oLim = makeOutputLine(outputRegion, "Limit check", "rw-out-lim");
  const oNote = makeOutputLine(outputRegion, "Note", "rw-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeVfdReflectedWave({ rise_time_us: readNum(rt.input), velocity_pct: readNum(vp.input), system_voltage_v: readNum(Vll.input), run_length_ft: readNum(run.input) });
    if (r.error) { oL.textContent = r.error; oV.textContent = "-"; oLim.textContent = "-"; oNote.textContent = ""; return; }
    oL.textContent = fmt(r.l_crit_ft, 1) + " ft (run " + (readNum(run.input) > r.l_crit_ft ? "past - reflection develops" : "under - safe") + ")";
    oV.textContent = fmt(r.v_peak_v, 0) + " V (bus " + fmt(r.v_bus_v, 0) + " V)";
    oLim.textContent = (r.exceeds_invduty ? "OVER inverter-duty " : "under inverter-duty ") + fmt(r.limit_invduty_v, 0) + " V; " + (r.exceeds_genpurpose ? "OVER" : "under") + " general-purpose ~1000 V";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [rt, vp, Vll, run]) f.input.addEventListener("input", update);
}
MOTOR_RENDERERS["vfd-reflected-wave"] = renderVfdReflectedWave;

// ===================== spec-v925: rotary phase converter idler sizing =====================
// dims: in { largest_motor_hp: M L^2 T^-3, total_running_hp: M L^2 T^-3, start_factor: dimensionless } out: { idler_hp_min: M L^2 T^-3, start_demand_hp: M L^2 T^-3 }
export function computeRotaryPhaseConverter({ largest_motor_hp = 10, total_running_hp = 15, start_factor = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(largest_motor_hp > 0)) return { error: "Largest motor HP must be positive." };
  if (!(total_running_hp > 0)) return { error: "Total running HP must be positive." };
  if (!(start_factor >= 1)) return { error: "Start factor must be at least 1." };
  if (total_running_hp < largest_motor_hp) return { error: "Total running HP cannot be less than the largest single motor." };
  // The idler must both START the largest motor across the line and RUN the whole aggregate load.
  const start_demand_hp = start_factor * largest_motor_hp;
  const idler_hp_min = Math.max(start_demand_hp, total_running_hp);
  const governed_by = start_demand_hp >= total_running_hp ? "starting the largest motor" : "the total running load";
  if (![idler_hp_min, start_demand_hp].every(Number.isFinite)) return { error: "Phase-converter math is not a finite value." };
  return {
    idler_hp_min,
    start_demand_hp,
    governed_by,
    note: "A rotary phase converter's idler is sized on the GREATER of the load needed to start the largest motor across the line and the total load running at once: idler HP = max(start factor x largest motor, total running HP). Use a 2x start factor for a normal load and 3x for a high-inertia or hard-starting load (a big compressor, a loaded saw); a soft-start or VFD on the big motor lowers the factor. A 10 HP lathe (largest) with a 5 HP mill also running is max(2x10, 15) = 20 HP. Undersized, the converter stalls or will not start the load; oversized, it wastes idle power. A rule-of-thumb sizing screen; the converter manufacturer's data and the actual motor locked-rotor current govern.",
  };
}

export const rotaryPhaseConverterExample = { inputs: { largest_motor_hp: 10, total_running_hp: 15, start_factor: 2 } };

function _v925renderRotaryPhaseConverter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: rotary phase converter idler sizing by name. idler HP = max(start factor x largest motor HP, total running HP); ~2x start factor for normal loads, 3x for high-inertia. The converter manufacturer's data and the motor locked-rotor current govern.";
  const lg = makeNumber("Largest single motor (HP)", "rpc-lg", { step: "any", min: "0", value: "10" });
  lg.input.value = "10";
  const tot = makeNumber("Total HP running at once", "rpc-tot", { step: "any", min: "0", value: "15" });
  tot.input.value = "15";
  const sf = makeNumber("Start factor (2 normal, 3 high-inertia)", "rpc-sf", { step: "any", min: "1", value: "2" });
  sf.input.value = "2";
  for (const f of [lg, tot, sf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lg.input.value = "10"; tot.input.value = "15"; sf.input.value = "2"; update(); });
  const oIdler = makeOutputLine(outputRegion, "Minimum idler size", "rpc-out-i");
  const oGov = makeOutputLine(outputRegion, "Governed by", "rpc-out-g");
  const update = debounce(() => {
    const r = computeRotaryPhaseConverter({
      largest_motor_hp: lg.input.value === "" ? 10 : Number(lg.input.value), total_running_hp: tot.input.value === "" ? 15 : Number(tot.input.value),
      start_factor: sf.input.value === "" ? 2 : Number(sf.input.value),
    });
    if (r.error) { oIdler.textContent = r.error; oGov.textContent = "-"; return; }
    oIdler.textContent = fmt(r.idler_hp_min, 1) + " HP idler";
    oGov.textContent = r.governed_by + " (start " + fmt(r.start_demand_hp, 1) + " HP vs run " + fmt(Number(tot.input.value) || 15, 1) + " HP)";
  }, DEBOUNCE_MS);
  for (const f of [lg, tot, sf]) f.input.addEventListener("input", update);
}
MOTOR_RENDERERS["rotary-phase-converter-sizing"] = _v925renderRotaryPhaseConverter;

// ===================== spec-v944: motor across-the-line acceleration time =====================
// dims: in { inertia_lbft2: dimensionless, speed_change_rpm: T^-1, net_accel_torque_lbft: M L^2 T^-2 } out: { accel_time_s: T }
export function computeMotorAccelerationTime({ inertia_lbft2 = 100, speed_change_rpm = 1750, net_accel_torque_lbft = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(inertia_lbft2 > 0)) return { error: "Inertia WK^2 must be positive (lb-ft^2)." };
  if (!(speed_change_rpm > 0)) return { error: "Speed change must be positive (rpm)." };
  if (!(net_accel_torque_lbft > 0)) return { error: "Net accelerating torque must be positive (lb-ft) -- the motor must out-torque the load to start." };
  // Rotational form of F = ma: t = WK^2 x dN / (308 x T_net). The 308 folds 2*pi/60 and g (32.174 ft/s^2).
  const accel_time_s = inertia_lbft2 * speed_change_rpm / (308 * net_accel_torque_lbft);
  if (!Number.isFinite(accel_time_s)) return { error: "Acceleration-time math is not a finite value." };
  return {
    accel_time_s,
    note: "The time to bring a motor and its driven load up to speed across the line: t = WK^2 x dN / (308 x T_net), the rotational form of F = m x a, where WK^2 is the total inertia (lb-ft^2) reflected to the motor shaft, dN is the speed change (rpm), and T_net is the AVERAGE net accelerating torque (motor torque minus load torque, lb-ft). The 308 constant folds the rad/s and gravitational conversions. A 100 lb-ft^2 inertia reaching 1,750 rpm on 50 lb-ft of net torque takes 100 x 1750 / (308 x 50) = 11.4 s. Double the inertia or halve the net torque and the time doubles. A long acceleration heats the rotor and can trip the overload or exceed the motor's safe locked-rotor / stall time -- check the motor's thermal-limit (t-vs-speed) curve. A screen: the motor's speed-torque and thermal-damage curves, the actual reflected load inertia, and the drive govern.",
  };
}

export const motorAccelerationTimeExample = { inputs: { inertia_lbft2: 100, speed_change_rpm: 1750, net_accel_torque_lbft: 50 } };

function _v944renderMotorAccelerationTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: motor across-the-line acceleration time by name. t = WK^2 x dN / (308 x T_net), the rotational F = m x a, with WK^2 the reflected inertia (lb-ft^2), dN the speed change (rpm), and T_net the average net accelerating torque (lb-ft). The motor's speed-torque and thermal-limit curves and the reflected load inertia govern.";
  const wk = makeNumber("Total inertia WK^2 (lb-ft^2)", "mat-wk", { step: "any", min: "0", value: "100" });
  wk.input.value = "100";
  const dn = makeNumber("Speed change (rpm)", "mat-dn", { step: "any", min: "0", value: "1750" });
  dn.input.value = "1750";
  const tq = makeNumber("Avg net accelerating torque (lb-ft)", "mat-tq", { step: "any", min: "0", value: "50" });
  tq.input.value = "50";
  for (const f of [wk, dn, tq]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wk.input.value = "100"; dn.input.value = "1750"; tq.input.value = "50"; update(); });
  const oTime = makeOutputLine(outputRegion, "Acceleration time", "mat-out-t");
  const update = debounce(() => {
    const r = computeMotorAccelerationTime({
      inertia_lbft2: wk.input.value === "" ? 100 : Number(wk.input.value), speed_change_rpm: dn.input.value === "" ? 1750 : Number(dn.input.value),
      net_accel_torque_lbft: tq.input.value === "" ? 50 : Number(tq.input.value),
    });
    if (r.error) { oTime.textContent = r.error; return; }
    oTime.textContent = fmt(r.accel_time_s, 2) + " s to reach speed";
  }, DEBOUNCE_MS);
  for (const f of [wk, dn, tq]) f.input.addEventListener("input", update);
}
MOTOR_RENDERERS["motor-acceleration-time"] = _v944renderMotorAccelerationTime;
