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
  DEBOUNCE_MS, debounce, makeNumber,
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
