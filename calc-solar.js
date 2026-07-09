// Group A: Solar PV, battery storage, and EV-charging bench.
//
// spec-v88 cap-relief split: this cohesive electrification bench -- solar PV
// string sizing and the NEC 705.12 interconnection busbar rule, off-grid and
// runtime battery sizing, and the NEC 625 EV-charger panel-impact tile -- was
// extracted out of calc-electrical.js (which had reached 94.7% of its gzip
// cap, the tightest remaining renderer module) into this module. All five
// tiles KEEP group: "A" (a tile's group letter is independent of the module
// that holds it, the v42/v70..v87 precedent); their ids, citations, worked
// examples, dimensional annotations, and behavior are byte-for-byte unchanged.
//
// Each calculator exports two things:
//   - compute(inputs): pure function returning the calculator output object.
//   - example: a known test case used by the "Test with example" button and
//     by the unit tests, with the expected output.
//
// The calculator views (renderXxx) wire DOM events and use compute().
// All DOM manipulation uses textContent / createElement only.

import { ampacityFromPhysics } from "./pure-math.js";
import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row. Copied verbatim
// from calc-electrical.js at the spec-v88 split (that module keeps its own
// copy for its remaining tiles, so the split leaves no cross-module import).
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

// --- Utility 67: Solar PV String Sizing ---

// dims: in { args: dimensionless } out: { max_series: dimensionless, min_series: dimensionless, cold_voc_V: M L^2 T^-3 I^-1, warm_vmp_V: M L^2 T^-3 I^-1 }
export function computePVStringSizing({
  module_voc_V, module_vmp_V, voc_temp_coeff_pct_per_C,
  record_low_C, record_high_C,
  inverter_mppt_min_V, inverter_mppt_max_V, inverter_vdc_max_V,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!module_voc_V || !module_vmp_V) return { error: "Module Voc and Vmp are required." };
  const coeff = Math.abs(Number(voc_temp_coeff_pct_per_C) || 0);
  const cold_voc = module_voc_V * (1 + coeff * (25 - record_low_C) / 100);
  const warm_vmp = module_vmp_V * (1 - coeff * (record_high_C - 25) / 100);
  const max_series = Math.floor((Number(inverter_vdc_max_V) || 0) / cold_voc);
  const min_series = Math.ceil((Number(inverter_mppt_min_V) || 0) / warm_vmp);
  const flag = min_series > max_series;
  return { cold_voc_V: cold_voc, warm_vmp_V: warm_vmp, max_series, min_series, mppt_max_V: inverter_mppt_max_V, flag };
}

export const pvStringSizingExample = {
  inputs: {
    module_voc_V: 40, module_vmp_V: 33, voc_temp_coeff_pct_per_C: 0.30,
    record_low_C: -10, record_high_C: 45,
    inverter_mppt_min_V: 200, inverter_mppt_max_V: 480, inverter_vdc_max_V: 600,
  },
  expectedRange: { max_series: { min: 12, max: 14 }, min_series: { min: 6, max: 8 } },
};

// --- Utility 68: Battery Runtime ---

// dims: in { amp_hours: I T, system_V: M L^2 T^-3 I^-1, dod_percent: dimensionless, load_W: M L^2 T^-3, peukert_k: dimensionless } out: { usable_wh: M L^2 T^-3 T, hours: T }
export function computeBatteryRuntime({ amp_hours, system_V, dod_percent = 100, load_W, peukert_k = 1 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Ah = Number(amp_hours) || 0;
  const V = Number(system_V) || 0;
  const dod = (Number(dod_percent) || 0) / 100;
  const load = Number(load_W) || 0;
  if (Ah <= 0 || V <= 0 || load <= 0) return { error: "Provide positive Ah, system V, and load W." };
  const usable_Ah = Ah * dod;
  const usable_Wh = usable_Ah * V;
  const k = Number(peukert_k) || 1;
  let hours;
  if (k > 1) {
    // Peukert form per spec-v2 section 2: t = C / I^k, C in Ah, I in A.
    // Reduces to C / I (the simple form) when k = 1.
    const I = load / V;
    if (I <= 0) return { error: "Computed current is non-positive." };
    hours = usable_Ah / Math.pow(I, k);
  } else {
    hours = usable_Wh / load;
  }
  return { hours, minutes: hours * 60, usable_Wh };
}

export const batteryRuntimeExample = {
  inputs: { amp_hours: 100, system_V: 12, dod_percent: 80, load_W: 120, peukert_k: 1 },
  expectedRange: { hours: { min: 7, max: 9 } },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPVStringSizing(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Cold-temperature Voc inflation (V_oc_cold = V_oc * (1 + |coeff| * (25 - T_low) / 100)) and warm-temperature Vmp depression (V_mp_warm = V_mp * (1 - |coeff| * (T_high - 25) / 100)). See docs/derivations.md.";
  attachExampleButton(inputRegion, () => fillExample(pvStringSizingExample.inputs));

  const voc = makeNumber("Module Voc (V)", "pv-voc", { step: "any", min: "0" });
  const vmp = makeNumber("Module Vmp (V)", "pv-vmp", { step: "any", min: "0" });
  const coeff = makeNumber("Voc temp coeff (% per C, magnitude)", "pv-coeff", { step: "any" });
  const tlow = makeNumber("Record low temp (C)", "pv-tlow", { step: "any" });
  const thigh = makeNumber("Record high temp (C)", "pv-thigh", { step: "any" });
  const mppt_min = makeNumber("Inverter MPPT min (V)", "pv-mppt-min", { step: "any", min: "0" });
  const mppt_max = makeNumber("Inverter MPPT max (V)", "pv-mppt-max", { step: "any", min: "0" });
  const vdc_max = makeNumber("Inverter Vdc max (V)", "pv-vdc-max", { step: "any", min: "0" });
  for (const f of [voc, vmp, coeff, tlow, thigh, mppt_min, mppt_max, vdc_max]) inputRegion.appendChild(f.wrap);

  const oCold = makeOutputLine(outputRegion, "Cold Voc per module", "pv-out-cold");
  const oWarm = makeOutputLine(outputRegion, "Warm Vmp per module", "pv-out-warm");
  const oMax = makeOutputLine(outputRegion, "Max series count", "pv-out-max");
  const oMin = makeOutputLine(outputRegion, "Min series count", "pv-out-min");
  const oFlag = makeOutputLine(outputRegion, "Result", "pv-out-flag");

  function fillExample(v) {
    voc.input.value = v.module_voc_V; vmp.input.value = v.module_vmp_V; coeff.input.value = v.voc_temp_coeff_pct_per_C;
    tlow.input.value = v.record_low_C; thigh.input.value = v.record_high_C;
    mppt_min.input.value = v.inverter_mppt_min_V; mppt_max.input.value = v.inverter_mppt_max_V; vdc_max.input.value = v.inverter_vdc_max_V;
    update();
  }
  const update = debounce(() => {
    const r = computePVStringSizing({
      module_voc_V: Number(voc.input.value) || 0,
      module_vmp_V: Number(vmp.input.value) || 0,
      voc_temp_coeff_pct_per_C: Number(coeff.input.value) || 0,
      record_low_C: Number(tlow.input.value),
      record_high_C: Number(thigh.input.value),
      inverter_mppt_min_V: Number(mppt_min.input.value) || 0,
      inverter_mppt_max_V: Number(mppt_max.input.value) || 0,
      inverter_vdc_max_V: Number(vdc_max.input.value) || 0,
    });
    if (r.error) { oCold.textContent = r.error; oWarm.textContent = "-"; oMax.textContent = "-"; oMin.textContent = "-"; oFlag.textContent = "-"; return; }
    oCold.textContent = fmt(r.cold_voc_V, 2) + " V";
    oWarm.textContent = fmt(r.warm_vmp_V, 2) + " V";
    oMax.textContent = String(r.max_series);
    oMin.textContent = String(r.min_series);
    oFlag.textContent = r.flag ? "Infeasible: min series exceeds max series." : "Feasible";
  }, DEBOUNCE_MS);

  for (const el of [voc.input, vmp.input, coeff.input, tlow.input, thigh.input, mppt_min.input, mppt_max.input, vdc_max.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderBatteryRuntime(inputRegion, outputRegion, citationEl, params) {
  citationEl.textContent = "Citation: Runtime = (Ah * V * DoD) / load_W. Peukert form t = C * (C / I)^(k - 1) when k > 1 (battery technical bulletins).";
  attachExampleButton(inputRegion, () => fillExample(batteryRuntimeExample.inputs));

  const ah = makeNumber("Battery capacity (Ah)", "br-ah", { step: "any", min: "0" });
  const v = makeNumber("System voltage (V)", "br-v", { step: "any", min: "0" });
  const dod = makeNumber("Depth of discharge (%)", "br-dod", { step: "any", min: "0", max: "100", value: "100" });
  dod.input.value = "100";
  const load = makeNumber("Load (W)", "br-load", { step: "any", min: "0" });
  const k = makeNumber("Peukert exponent k (1 if unknown)", "br-k", { step: "any", min: "1", value: "1" });
  k.input.value = "1";
  for (const f of [ah, v, dod, load, k]) inputRegion.appendChild(f.wrap);

  const oH = makeOutputLine(outputRegion, "Runtime (hours)", "br-out-h");
  const oM = makeOutputLine(outputRegion, "Runtime (minutes)", "br-out-m");
  const oWh = makeOutputLine(outputRegion, "Usable energy", "br-out-wh");

  function fillExample(x) {
    ah.input.value = x.amp_hours; v.input.value = x.system_V; dod.input.value = x.dod_percent;
    load.input.value = x.load_W; k.input.value = x.peukert_k;
    update();
  }
  const update = debounce(() => {
    const r = computeBatteryRuntime({
      amp_hours: Number(ah.input.value) || 0,
      system_V: Number(v.input.value) || 0,
      dod_percent: Number(dod.input.value) || 0,
      load_W: Number(load.input.value) || 0,
      peukert_k: Number(k.input.value) || 1,
    });
    if (r.error) { oH.textContent = r.error; oM.textContent = "-"; oWh.textContent = "-"; return; }
    oH.textContent = fmt(r.hours, 2) + " hr";
    oM.textContent = fmt(r.minutes, 0) + " min";
    oWh.textContent = fmt(r.usable_Wh, 0) + " Wh";
  }, DEBOUNCE_MS);

  for (const el of [ah.input, v.input, dod.input, load.input, k.input]) el.addEventListener("input", update);
}

// --- v15 A.8: PV interconnection 120% busbar rule (NEC 705.12) ---
// The load-side connection of a PV inverter to an existing panel is limited
// by the busbar rating. A breaker landed at the opposite end of the busbar
// from the main gets the 120% allowance (705.12(B)(3)(2)); any other load-
// side position uses the plain sum-of-breakers <= busbar rule. A supply-side
// tap (705.11) is ahead of the service disconnect and is not subject to the
// busbar rule at all. The AHJ inspector reads the panel to verify position.

// dims: in { args: dimensionless } out: { sum_of_breakers_a: I, limit_a: I, passes: dimensionless }
export function computePvInterconnectionBusbar({
  main_breaker_a = 0,
  busbar_rating_a = 0,
  pv_existing_a = 0,
  pv_proposed_a = 0,
  method = "opposite_end_load_side",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const main = Number(main_breaker_a) || 0;
  const busbar = Number(busbar_rating_a) || 0;
  const pvE = Number(pv_existing_a) || 0;
  const pvP = Number(pv_proposed_a) || 0;
  if (!(main > 0)) return { error: "Main breaker rating must be positive (A)." };
  if (!(busbar > 0)) return { error: "Busbar rating must be positive (A)." };
  if (pvE < 0 || pvP < 0) return { error: "PV breaker ratings cannot be negative (A)." };
  const METHODS = new Set(["opposite_end_load_side", "load_side_other", "supply_side_tap"]);
  if (!METHODS.has(method)) {
    return { error: "Method must be one of: opposite_end_load_side, load_side_other, supply_side_tap." };
  }

  const warnings = [];
  if (main > busbar) warnings.push("Main breaker rating exceeds the busbar rating; that is a pre-existing NEC 408.36 condition independent of the PV interconnection.");
  if (pvP > 0.80 * main) warnings.push("Proposed PV breaker exceeds 80 percent of the main; a main-breaker downsize or a supply-side connection is usually required.");

  const sum = main + pvE + pvP;
  let limit_a = null;
  let passes;
  let basis;
  if (method === "supply_side_tap") {
    // NEC 705.11: a supply-side connection is ahead of the service disconnect
    // and is not subject to the 705.12 busbar loading rule; service-conductor
    // ampacity (705.11(B)) governs instead.
    passes = true;
    basis = "supply_side_705_11";
    warnings.push("Supply-side tap is not subject to the 705.12 busbar rule. Verify service-conductor ampacity per NEC 705.11(B); the AHJ governs.");
  } else if (method === "opposite_end_load_side") {
    limit_a = 1.20 * busbar; // NEC 705.12(B)(3)(2) 120% rule (breaker opposite the main)
    passes = sum <= limit_a + 1e-9;
    basis = "load_side_120_percent";
  } else {
    limit_a = busbar; // NEC 705.12(B)(3)(1) sum-of-breakers <= busbar rating
    passes = sum <= limit_a + 1e-9;
    basis = "load_side_100_percent";
  }

  let recommendation = "";
  if (!passes && limit_a !== null) {
    const downsized_main = Math.max(0, Math.floor(limit_a - pvE - pvP));
    recommendation = "Sum (" + sum + " A) exceeds the limit (" + limit_a + " A). Move the PV breaker to the opposite end of the busbar from the main for the 120% allowance, downsize the main to " + downsized_main + " A or less, or use a supply-side tap per NEC 705.11.";
  }

  return {
    sum_of_breakers_a: sum,
    limit_a,
    passes,
    basis,
    method,
    recommendation,
    warnings,
  };
}

export const pvInterconnectionBusbarExample = {
  // Canonical NEC 705.12 case: 200 A busbar, 200 A main, 40 A PV breaker at
  // the opposite end of the busbar. 1.20 * 200 = 240 A limit; 200 + 40 = 240
  // A sum; lands exactly at the limit and passes.
  inputs: {
    main_breaker_a: 200,
    busbar_rating_a: 200,
    pv_existing_a: 0,
    pv_proposed_a: 40,
    method: "opposite_end_load_side",
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPvInterconnectionBusbar(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NEC 2023 Article 705 (Interconnected Electric Power Production Sources). 705.12(B)(3) governs load-side interconnection (the 120% busbar allowance for a breaker at the opposite end of the busbar from the main); 705.11 governs supply-side connections. 'Opposite end of busbar' is a code term of art the AHJ inspector verifies at the panel. AHJ governs. Free at nfpa.org/freeaccess for the NEC table of contents.";

  const method = makeSelect("Interconnection method", "bb-method", [
    { value: "opposite_end_load_side", label: "Load-side breaker, opposite end from main (120% rule)", selected: true },
    { value: "load_side_other", label: "Load-side, other position / line-tap (100% rule)" },
    { value: "supply_side_tap", label: "Supply-side tap (NEC 705.11; not a busbar rule)" },
  ]);
  const main = makeNumber("Main breaker rating (A)", "bb-main", { step: "any", min: "0", value: "200" });
  main.input.value = "200";
  const busbar = makeNumber("Panel busbar rating (A)", "bb-busbar", { step: "any", min: "0", value: "200" });
  busbar.input.value = "200";
  const pvE = makeNumber("Existing PV breaker (A; 0 if none)", "bb-pve", { step: "any", min: "0", value: "0" });
  pvE.input.value = "0";
  const pvP = makeNumber("Proposed PV breaker (A)", "bb-pvp", { step: "any", min: "0", value: "40" });
  pvP.input.value = "40";
  for (const f of [method, main, busbar, pvE, pvP]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    method.select.value = "opposite_end_load_side";
    main.input.value = "200"; busbar.input.value = "200"; pvE.input.value = "0"; pvP.input.value = "40";
    update();
  });

  const oSum = makeOutputLine(outputRegion, "Sum of breakers (A)", "bb-out-sum");
  const oLim = makeOutputLine(outputRegion, "Busbar limit (A)", "bb-out-lim");
  const oPass = makeOutputLine(outputRegion, "Verdict", "bb-out-pass");
  const oRec = makeOutputLine(outputRegion, "Notes", "bb-out-rec");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computePvInterconnectionBusbar({
      main_breaker_a: readNum(main.input),
      busbar_rating_a: readNum(busbar.input),
      pv_existing_a: readNum(pvE.input),
      pv_proposed_a: readNum(pvP.input),
      method: method.select.value,
    });
    if (r.error) {
      oSum.textContent = r.error; oLim.textContent = ""; oPass.textContent = ""; oRec.textContent = "";
      return;
    }
    oSum.textContent = fmt(r.sum_of_breakers_a, 1) + " A";
    oLim.textContent = r.limit_a === null ? "Not applicable (supply-side)" : fmt(r.limit_a, 1) + " A";
    oPass.textContent = r.passes ? "PASS" : "FAIL";
    const notes = [];
    if (r.recommendation) notes.push(r.recommendation);
    if (r.warnings.length) notes.push(...r.warnings);
    oRec.textContent = notes.length ? notes.join(" ") : "Within the NEC 705.12 busbar limit. AHJ verifies breaker position at the panel.";
  }, DEBOUNCE_MS);
  for (const f of [method.select, main.input, busbar.input, pvE.input, pvP.input]) f.addEventListener("input", update);
}

// --- v15 A.9: Off-grid battery bank sizing (IEEE 1013 / 1561) ---
// Required nameplate capacity from a daily energy budget, days of autonomy,
// the usable depth-of-discharge for the chemistry, and the round-trip
// efficiency. LFP industry practice uses ~80% DoD; flooded lead-acid ~50%.
// The manufacturer datasheet governs chemistry-specific derates.

// dims: in { args: dimensionless } out: { usable_wh: M L^2 T^-3 T, nameplate_wh: M L^2 T^-3 T, nameplate_ah: I T }
export function computeOffGridBattery({
  daily_load_wh = 0,
  days_autonomy = 3,
  dod_limit = 0.5,
  system_voltage_v = 48,
  round_trip_efficiency = 0.85,
  temperature_derate = 1.0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const daily = Number(daily_load_wh) || 0;
  const days = Number(days_autonomy) || 0;
  const dod = Number(dod_limit) || 0;
  const V = Number(system_voltage_v) || 0;
  const eta = Number(round_trip_efficiency) || 0;
  const derate = Number(temperature_derate) || 0;
  if (!(daily > 0)) return { error: "Daily load must be positive (Wh/day)." };
  if (!(days > 0)) return { error: "Days of autonomy must be positive." };
  if (!(dod > 0 && dod <= 1)) return { error: "Depth-of-discharge limit must be in (0, 1]." };
  if (!(V > 0)) return { error: "System voltage must be positive (V)." };
  if (!(eta > 0 && eta <= 1)) return { error: "Round-trip efficiency must be in (0, 1]." };
  if (!(derate > 0 && derate <= 1)) return { error: "Temperature derate must be in (0, 1]." };

  const warnings = [];
  if (days > 5) warnings.push("Days of autonomy above 5 is a cost-driven edge case; most off-grid PV designs use 3 to 5 days.");
  if (dod < 0.3) warnings.push("Depth-of-discharge below 0.30 is conservative; verify against the chemistry datasheet.");
  if (![12, 24, 48].includes(V)) warnings.push("System voltage is not one of the standard 12 / 24 / 48 V; verify the bank configuration.");

  const usable_wh = daily * days;
  const nameplate_wh = usable_wh / (dod * eta * derate);
  const nameplate_ah = nameplate_wh / V;

  return {
    usable_wh,
    nameplate_wh,
    nameplate_ah,
    daily_load_wh: daily,
    days_autonomy: days,
    warnings,
  };
}

export const offGridBatteryExample = {
  // Flooded lead-acid 12 V off-grid example: 2,400 Wh/day, 3 days autonomy,
  // 50% DoD, 85% round-trip efficiency, no temperature derate.
  // usable = 2400 * 3 = 7,200 Wh; nameplate = 7200 / (0.5 * 0.85) = 16,941 Wh;
  // Ah = 16,941 / 12 = 1,412 Ah.
  inputs: {
    daily_load_wh: 2400,
    days_autonomy: 3,
    dod_limit: 0.5,
    system_voltage_v: 12,
    round_trip_efficiency: 0.85,
    temperature_derate: 1.0,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderOffGridBattery(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per IEEE 1013 (Sizing Lead-Acid Batteries for Stand-Alone PV Systems) and IEEE 1561 (PV / Hybrid Power Systems). Flooded lead-acid uses ~50% usable depth-of-discharge; lithium-iron-phosphate (LFP) uses ~80%. The manufacturer datasheet governs the chemistry-specific derate. Free at standards.ieee.org for IEEE 1013 bibliographic data.";

  const daily = makeNumber("Daily load (Wh/day)", "ob-daily", { step: "any", min: "0", value: "2400" });
  daily.input.value = "2400";
  const days = makeNumber("Days of autonomy", "ob-days", { step: "any", min: "0", value: "3" });
  days.input.value = "3";
  const dod = makeNumber("Depth-of-discharge limit (0-1; 0.5 lead-acid / 0.8 LFP)", "ob-dod", { step: "any", min: "0", value: "0.5" });
  dod.input.value = "0.5";
  const volts = makeSelect("System DC voltage", "ob-v", [
    { value: "12", label: "12 V", selected: true },
    { value: "24", label: "24 V" },
    { value: "48", label: "48 V" },
  ]);
  const eta = makeNumber("Round-trip efficiency (0-1; 0.85 lead-acid / 0.95 LFP)", "ob-eta", { step: "any", min: "0", value: "0.85" });
  eta.input.value = "0.85";
  const derate = makeNumber("Temperature derate (0-1; 1.0 if none)", "ob-derate", { step: "any", min: "0", value: "1" });
  derate.input.value = "1";
  for (const f of [daily, days, dod, volts, eta, derate]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    daily.input.value = "2400"; days.input.value = "3"; dod.input.value = "0.5";
    volts.select.value = "12"; eta.input.value = "0.85"; derate.input.value = "1";
    update();
  });

  const oUse = makeOutputLine(outputRegion, "Usable energy required (Wh)", "ob-out-use");
  const oNp = makeOutputLine(outputRegion, "Nameplate capacity (Wh)", "ob-out-np");
  const oAh = makeOutputLine(outputRegion, "Nameplate capacity (Ah)", "ob-out-ah");
  const oW = makeOutputLine(outputRegion, "Notes", "ob-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeOffGridBattery({
      daily_load_wh: readNum(daily.input),
      days_autonomy: readNum(days.input),
      dod_limit: readNum(dod.input),
      system_voltage_v: Number(volts.select.value),
      round_trip_efficiency: readNum(eta.input),
      temperature_derate: readNum(derate.input),
    });
    if (r.error) {
      oUse.textContent = r.error; oNp.textContent = ""; oAh.textContent = ""; oW.textContent = "";
      return;
    }
    oUse.textContent = fmt(r.usable_wh, 0) + " Wh";
    oNp.textContent = fmt(r.nameplate_wh, 0) + " Wh";
    oAh.textContent = fmt(r.nameplate_ah, 0) + " Ah";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Manufacturer datasheet governs the chemistry-specific derate.";
  }, DEBOUNCE_MS);
  for (const f of [daily.input, days.input, dod.input, volts.select, eta.input, derate.input]) f.addEventListener("input", update);
}

// --- v15 A.6: EV charger continuous-load and panel impact (NEC Article 625) ---
// EVSE is a continuous load: the branch circuit and overcurrent device are
// sized at 125% of the charger nameplate (625.41 / 625.42). The new load is
// added to the existing service demand to test panel headroom. Conductor sizing
// uses the same first-principles ampacity path as the v1 wire-ampacity tile
// (copper, 75 C terminations, 30 C ambient); verify against NEC 310.16.

const _EV_BREAKER_SIZES = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200];
const _EV_CU_AWG = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0"];

// dims: in { args: dimensionless } out: { continuous_circuit_a: I, recommended_breaker_a: I, new_panel_load_a: I, headroom_a: I }
export function computeEvChargerLoad({
  charger_amps = 0,
  main_breaker_a = 0,
  existing_load_a = 0,
  busbar_rating_a = 0,
  load_managed = false,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ch = Number(charger_amps) || 0;
  const main = Number(main_breaker_a) || 0;
  const existing = Number(existing_load_a) || 0;
  const busbar = Number(busbar_rating_a) || 0;
  if (!(ch > 0)) return { error: "Charger nameplate amperes must be positive (A)." };
  if (!(main > 0)) return { error: "Panel main breaker rating must be positive (A)." };
  if (existing < 0) return { error: "Existing service load cannot be negative (A)." };
  if (main <= 100 && ch > 80) return { error: "An 80 A+ charger on a 100 A or smaller panel is not feasible; a service upgrade is required." };

  const warnings = [];
  const continuous_circuit_a = ch * 1.25; // NEC 625.41 / 625.42 continuous load
  const recommended_breaker_a = _EV_BREAKER_SIZES.find((s) => s >= continuous_circuit_a) ?? continuous_circuit_a;

  // First-principles conductor pick: smallest copper AWG whose 75 C ampacity
  // covers the continuous circuit ampacity.
  let recommended_conductor_awg = null;
  for (const awg of _EV_CU_AWG) {
    const amp = ampacityFromPhysics({ material: "copper", awg, insulation_rating_C: 75, ambient_C: 30, bundle_count: 1 });
    if (amp >= continuous_circuit_a) { recommended_conductor_awg = awg; break; }
  }

  const new_panel_load_a = existing + continuous_circuit_a;
  const headroom_a = main - new_panel_load_a;
  const headroom_pct = main > 0 ? (headroom_a / main) * 100 : 0;

  if (load_managed) warnings.push("With a 625.42(A) energy-management system the EVSE may be sized to its controlled output rather than full nameplate; use the controller's rated demand.");
  if (busbar > 0 && busbar < new_panel_load_a) warnings.push("Panel busbar rating (" + busbar + " A) is below the new total load; the busbar, not just the main, governs (NEC 408.36).");
  if (headroom_a < 0) warnings.push("New total load exceeds the main breaker rating; load management or a service upgrade is required.");
  else if (headroom_pct < 10) warnings.push("Panel headroom is under 10 percent; a NEC 220.83/220.87 load study or load management is recommended.");

  return {
    continuous_circuit_a,
    recommended_breaker_a,
    recommended_conductor_awg,
    new_panel_load_a,
    headroom_a,
    headroom_pct,
    warnings,
  };
}

export const evChargerLoadExample = {
  // 48 A charger on a 200 A service with 130 A existing load:
  // I_circuit = 48 * 1.25 = 60 A; 60 A breaker; new load = 190 A;
  // headroom = 10 A (5%, flagged marginal). (Mike Holt EV-charger article.)
  inputs: {
    charger_amps: 48,
    main_breaker_a: 200,
    existing_load_a: 130,
    busbar_rating_a: 200,
    load_managed: false,
  },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderEvChargerLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NEC 2023 Article 625 (EV charging). 625.41/625.42 classify the EVSE as a continuous load (circuit and breaker at 125% of nameplate); 625.42(A) covers energy-management sizing. Panel load per NEC 220.83/220.87. Conductor is a first-principles estimate (copper, 75 C, 30 C ambient); verify against NEC 310.16. AHJ governs. Free at nfpa.org/freeaccess for the NEC table of contents.";

  const ch = makeNumber("Charger nameplate (A)", "ev-ch", { step: "any", min: "0", value: "48" });
  ch.input.value = "48";
  const main = makeNumber("Panel main breaker (A)", "ev-main", { step: "any", min: "0", value: "200" });
  main.input.value = "200";
  const existing = makeNumber("Existing service load (A)", "ev-exist", { step: "any", min: "0", value: "130" });
  existing.input.value = "130";
  const busbar = makeNumber("Panel busbar rating (A; 0 if unknown)", "ev-busbar", { step: "any", min: "0", value: "200" });
  busbar.input.value = "200";
  const managed = makeCheckbox("Load-managed (NEC 625.42(A) EMS)", "ev-managed");
  for (const f of [ch, main, existing, busbar, managed]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    ch.input.value = "48"; main.input.value = "200";
    existing.input.value = "130"; busbar.input.value = "200"; managed.input.checked = false;
    update();
  });

  const oCirc = makeOutputLine(outputRegion, "Continuous circuit ampacity (A)", "ev-out-circ");
  const oBrk = makeOutputLine(outputRegion, "Recommended breaker (A)", "ev-out-brk");
  const oCond = makeOutputLine(outputRegion, "Conductor (Cu, est.)", "ev-out-cond");
  const oLoad = makeOutputLine(outputRegion, "New panel total (A)", "ev-out-load");
  const oHead = makeOutputLine(outputRegion, "Panel headroom (A)", "ev-out-head");
  const oW = makeOutputLine(outputRegion, "Notes", "ev-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeEvChargerLoad({
      charger_amps: readNum(ch.input),
      main_breaker_a: readNum(main.input),
      existing_load_a: readNum(existing.input),
      busbar_rating_a: readNum(busbar.input),
      load_managed: managed.input.checked,
    });
    if (r.error) {
      oCirc.textContent = r.error; oBrk.textContent = ""; oCond.textContent = ""; oLoad.textContent = ""; oHead.textContent = ""; oW.textContent = "";
      return;
    }
    oCirc.textContent = fmt(r.continuous_circuit_a, 1) + " A";
    oBrk.textContent = r.recommended_breaker_a + " A";
    oCond.textContent = r.recommended_conductor_awg ? r.recommended_conductor_awg + " AWG" : "above bundled range";
    oLoad.textContent = fmt(r.new_panel_load_a, 1) + " A";
    oHead.textContent = fmt(r.headroom_a, 1) + " A (" + fmt(r.headroom_pct, 1) + "%)";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Within panel headroom. Verify the conductor against NEC 310.16; AHJ governs.";
  }, DEBOUNCE_MS);
  for (const f of [ch.input, main.input, existing.input, busbar.input, managed.input]) f.addEventListener("input", update);
}

// =====================================================================
// spec-v182 - Group A: Electrical (1 tile)
// PV source/output circuit maximum current and minimum conductor
// ampacity (NEC 690.8(A)/(B), the stacked-125% "156%" rule).
// =====================================================================

// dims: in { module_isc_a: I, parallel_strings: dimensionless, ocpd_a: I } out: { max_current_a: I, min_ampacity_a: I, stacked_factor: dimensionless }
export function computePvCircuitAmpacity({ module_isc_a = 0, parallel_strings = 1, ocpd_a = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const isc = Number(module_isc_a) || 0;
  if (!(isc > 0)) return { error: "Module short-circuit current must be positive (A)." };
  const strings = Number(parallel_strings) || 0;
  if (!(strings >= 1)) return { error: "Parallel strings must be at least 1." };
  // 690.8(A)(1): maximum current = Isc x strings x 125%.
  const max_current_a = isc * strings * 1.25;
  // 690.8(B)(1): minimum conductor ampacity = max current x 125% (before any
  // temperature / conduit conditions-of-use adjustment under (B)(2)).
  const min_ampacity_a = max_current_a * 1.25;
  const stacked_factor = 1.25 * 1.25; // 1.5625 -> the "156%" of Isc
  const ocpd = Number(ocpd_a) || 0;
  const ocpd_ok = ocpd > 0 ? ocpd >= max_current_a : null;
  return {
    max_current_a,
    min_ampacity_a,
    stacked_factor,
    ocpd_a: ocpd,
    ocpd_ok,
    note: "NEC 690.8(A)(1): the maximum PV source/output-circuit current is the rated Isc times the number of paralleled strings times 125%. 690.8(B)(1): the conductor ampacity is at least that maximum current times another 125% (the two factors stack to 156% of Isc) before any temperature/conduit conditions-of-use derate; the conductor must also satisfy 690.8(B)(2) after conditions of use, and the greater governs. The engineer governs.",
  };
}
export const pvCircuitAmpacityExample = { inputs: { module_isc_a: 10, parallel_strings: 2, ocpd_a: 0 } };

function renderPvCircuitAmpacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 690.8(A)(1) (max current = Isc x strings x 125%) and 690.8(B)(1) (min ampacity = max current x 125%; the factors stack to 156% of Isc). Also size for 690.8(B)(2) after conditions of use and take the greater. The engineer governs. Free at nfpa.org/freeaccess.";
  const isc = makeNumber("Module Isc per source circuit (A)", "pca-isc", { step: "any", min: "0", value: "10" });
  isc.input.value = "10";
  const strings = makeNumber("Parallel source circuits (strings)", "pca-strings", { step: "1", min: "1", value: "2" });
  strings.input.value = "2";
  const ocpd = makeNumber("Series fuse / OCPD rating to check (A, optional)", "pca-ocpd", { step: "any", min: "0", value: "0" });
  for (const f of [isc, strings, ocpd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { isc.input.value = "10"; strings.input.value = "2"; ocpd.input.value = "0"; update(); });

  const oMax = makeOutputLine(outputRegion, "Maximum current (690.8(A))", "pca-out-max");
  const oMin = makeOutputLine(outputRegion, "Min conductor ampacity (690.8(B))", "pca-out-min");
  const oFactor = makeOutputLine(outputRegion, "Stacked factor on Isc", "pca-out-factor");
  const oOcpd = makeOutputLine(outputRegion, "OCPD check", "pca-out-ocpd");
  const oNote = makeOutputLine(outputRegion, "Note", "pca-out-note");

  const update = debounce(() => {
    const r = computePvCircuitAmpacity({ module_isc_a: Number(isc.input.value) || 0, parallel_strings: Number(strings.input.value) || 0, ocpd_a: Number(ocpd.input.value) || 0 });
    if (r.error) { oMax.textContent = r.error; oMin.textContent = "-"; oFactor.textContent = "-"; oOcpd.textContent = "-"; oNote.textContent = ""; return; }
    oMax.textContent = fmt(r.max_current_a, 2) + " A";
    oMin.textContent = fmt(r.min_ampacity_a, 2) + " A";
    oFactor.textContent = fmt(r.stacked_factor, 4) + " (156%)";
    oOcpd.textContent = r.ocpd_ok === null ? "-" : (r.ocpd_ok ? "OCPD " + fmt(r.ocpd_a, 0) + " A >= max current, OK" : "OCPD " + fmt(r.ocpd_a, 0) + " A below max current");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [isc, strings, ocpd]) f.input.addEventListener("input", update);
}

// ===================== spec-v221: PV annual energy yield =====================

// dims: in { dc_kw: M L^2 T^-3, psh: T, perf_ratio: dimensionless } out: { annual_kwh: M L^2 T^-2, specific_yield: T, capacity_factor: dimensionless, monthly_kwh_avg: M L^2 T^-2 }
export function computePvEnergyYield({ dc_kw = 0, psh = 5.0, perf_ratio = 0.77 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(dc_kw > 0)) return { error: "DC nameplate must be positive (kW)." };
  if (!(psh > 0)) return { error: "Peak-sun-hours must be positive." };
  if (!(perf_ratio > 0 && perf_ratio <= 1)) return { error: "Performance ratio must be in (0, 1]." };
  const annual_kwh = dc_kw * psh * 365 * perf_ratio;
  const specific_yield = annual_kwh / dc_kw;
  const capacity_factor = annual_kwh / (dc_kw * 8760);
  const monthly_kwh_avg = annual_kwh / 12;
  return {
    annual_kwh, specific_yield, capacity_factor, monthly_kwh_avg,
    note: "NREL PVWatts energy model: annual energy = DC nameplate x peak-sun-hours x 365 x performance ratio. The peak-sun-hours is the plane-of-array daily irradiation from NREL NSRDB / PVWatts for the site, tilt, and azimuth (not a fixed 5). The performance ratio (default 0.77, the PVWatts all-loss default) rolls up soiling, shading, mismatch, wiring, inverter, and availability losses and is the single biggest lever; the first-year figure degrades roughly half a percent a year. A pre-design estimate, not a bankable production model.",
  };
}
function renderPvEnergyYield(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NREL PVWatts energy model E = Pdc x PSH x 365 x PR, with specific yield = E / Pdc and capacity factor = E / (Pdc x 8760) (by name). The peak-sun-hours is the plane-of-array daily irradiation from NREL NSRDB / PVWatts for the site, tilt, and azimuth; the performance ratio (default 0.77, the PVWatts all-loss default) is the single biggest lever. A pre-design estimate, not a bankable production model.";
  const dc = makeNumber("Array DC nameplate (kW)", "pey-dc", { step: "any", min: "0", value: "8" });
  dc.input.value = "8";
  const psh = makeNumber("Peak-sun-hours (kWh/m2/day)", "pey-psh", { step: "any", min: "0", value: "5" });
  psh.input.value = "5";
  const pr = makeNumber("Performance ratio (0-1)", "pey-pr", { step: "any", min: "0", value: "0.77" });
  pr.input.value = "0.77";
  for (const f of [dc, psh, pr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dc.input.value = "8"; psh.input.value = "5"; pr.input.value = "0.77"; update(); });
  const oAnnual = makeOutputLine(outputRegion, "Annual energy", "pey-out-annual");
  const oYield = makeOutputLine(outputRegion, "Specific yield", "pey-out-yield");
  const oCf = makeOutputLine(outputRegion, "Capacity factor", "pey-out-cf");
  const oMonthly = makeOutputLine(outputRegion, "Monthly average", "pey-out-monthly");
  const oNote = makeOutputLine(outputRegion, "Note", "pey-out-note");
  const update = debounce(() => {
    const r = computePvEnergyYield({ dc_kw: Number(dc.input.value) || 0, psh: Number(psh.input.value) || 0, perf_ratio: Number(pr.input.value) || 0 });
    if (r.error) { oAnnual.textContent = r.error; oYield.textContent = "-"; oCf.textContent = "-"; oMonthly.textContent = "-"; oNote.textContent = ""; return; }
    oAnnual.textContent = fmt(r.annual_kwh, 0) + " kWh/yr";
    oYield.textContent = fmt(r.specific_yield, 0) + " kWh/kWp";
    oCf.textContent = fmt(r.capacity_factor * 100, 1) + "%";
    oMonthly.textContent = fmt(r.monthly_kwh_avg, 0) + " kWh/month";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [dc, psh, pr]) f.input.addEventListener("input", update);
}

// ===================== spec-v222: PV inter-row spacing and GCR =====================

// dims: in { module_length_ft: L, tilt_deg: dimensionless, profile_angle_deg: dimensionless } out: { rise_ft: L, base_ft: L, shadow_ft: L, pitch_ft: L, gap_ft: L, gcr: dimensionless }
export function computePvRowSpacing({ module_length_ft = 0, tilt_deg = 0, profile_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(module_length_ft > 0)) return { error: "Module slope length must be positive (ft)." };
  if (!(tilt_deg >= 0 && tilt_deg <= 90)) return { error: "Tilt must be 0 to 90 degrees." };
  if (!(profile_angle_deg > 0 && profile_angle_deg <= 90)) return { error: "Profile angle must be over 0 and up to 90 degrees (a sun on the horizon throws an infinite shadow)." };
  const rad = Math.PI / 180;
  const rise_ft = module_length_ft * Math.sin(tilt_deg * rad);
  const base_ft = module_length_ft * Math.cos(tilt_deg * rad);
  const shadow_ft = rise_ft / Math.tan(profile_angle_deg * rad);
  const pitch_ft = base_ft + shadow_ft;
  const gap_ft = shadow_ft;
  const gcr = module_length_ft / pitch_ft;
  return {
    rise_ft, base_ft, shadow_ft, pitch_ft, gap_ft, gcr,
    note: "NREL / Sandia row-spacing geometry: pitch = L x cos(tilt) + L x sin(tilt) / tan(profile angle), GCR = L / pitch. The minimum solar profile angle is the winter-design sun elevation at the site (commonly the solar altitude at 9 a.m. to 3 p.m. on the winter solstice, read from latitude or from solar-times). The relation assumes due-south rows and a level field; an azimuth offset or a graded slope is a separate correction. A no-shadow layout geometry, not an annual inter-row shading-loss model.",
  };
}
function renderPvRowSpacing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NREL / Sandia PV array row-spacing geometry pitch = L x cos(tilt) + L x sin(tilt) / tan(profile angle), GCR = L / pitch (by name). The minimum profile angle is the winter-design sun elevation (from latitude or solar-times). Assumes due-south rows and a level field. A layout geometry, not an annual shading-loss model.";
  const len = makeNumber("Module slope length (ft)", "prs-len", { step: "any", min: "0", value: "6.5" });
  len.input.value = "6.5";
  const tilt = makeNumber("Array tilt (degrees)", "prs-tilt", { step: "any", min: "0", value: "30" });
  tilt.input.value = "30";
  const prof = makeNumber("Min solar profile angle (degrees)", "prs-prof", { step: "any", min: "0", value: "22" });
  prof.input.value = "22";
  for (const f of [len, tilt, prof]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { len.input.value = "6.5"; tilt.input.value = "30"; prof.input.value = "22"; update(); });
  const oPitch = makeOutputLine(outputRegion, "Row pitch (front to front)", "prs-out-pitch");
  const oGap = makeOutputLine(outputRegion, "Clear gap between rows", "prs-out-gap");
  const oGcr = makeOutputLine(outputRegion, "Ground-coverage ratio", "prs-out-gcr");
  const oRiseBase = makeOutputLine(outputRegion, "Rise / footprint", "prs-out-rb");
  const oNote = makeOutputLine(outputRegion, "Note", "prs-out-note");
  const update = debounce(() => {
    const r = computePvRowSpacing({ module_length_ft: Number(len.input.value) || 0, tilt_deg: Number(tilt.input.value) || 0, profile_angle_deg: Number(prof.input.value) || 0 });
    if (r.error) { oPitch.textContent = r.error; oGap.textContent = "-"; oGcr.textContent = "-"; oRiseBase.textContent = "-"; oNote.textContent = ""; return; }
    oPitch.textContent = fmt(r.pitch_ft, 2) + " ft";
    oGap.textContent = fmt(r.gap_ft, 2) + " ft";
    oGcr.textContent = fmt(r.gcr, 3);
    oRiseBase.textContent = fmt(r.rise_ft, 2) + " ft rise / " + fmt(r.base_ft, 2) + " ft footprint";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [len, tilt, prof]) f.input.addEventListener("input", update);
}

// ===================== spec-v223: PV inverter loading ratio (DC:AC) =====================

// dims: in { dc_kw: M L^2 T^-3, ac_kw: M L^2 T^-3, inv_eff: dimensionless } out: { ilr: dimensionless, clip_dc_kw: M L^2 T^-3, clip_fraction: dimensionless }
export function computePvInverterRatio({ dc_kw = 0, ac_kw = 0, inv_eff = 0.96 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(dc_kw > 0)) return { error: "DC nameplate must be positive (kW)." };
  if (!(ac_kw > 0)) return { error: "Inverter AC rating must be positive (kW)." };
  if (!(inv_eff > 0 && inv_eff <= 1)) return { error: "Inverter efficiency must be in (0, 1]." };
  const ilr = dc_kw / ac_kw;
  const clip_dc_kw = ac_kw / inv_eff;
  const clip_fraction = clip_dc_kw / dc_kw;
  const verdict = ilr < 1.1
    ? "Inverter oversized - ratio below the typical 1.1-1.3 band; it rarely fills"
    : ilr <= 1.3
      ? "In the typical cost-optimal 1.1-1.3 band"
      : "Inverter undersized - ratio above 1.3; expect frequent clipping of array peaks";
  return {
    ilr, clip_dc_kw, clip_fraction, verdict,
    note: "Inverter loading ratio ILR = DC nameplate / AC rating; clipping begins where the array's DC output exceeds AC / inverter efficiency, which as a fraction of STC nameplate is the clipping-onset fraction. The cost-optimal band (commonly 1.1 to 1.3) shifts with the site's irradiance distribution, the module-to-inverter price ratio, and the energy value. The clipping-onset fraction is a screening threshold (the array clips only when its instantaneous DC output rises above that fraction of STC, near peak on cool clear days); an accurate annual clipping loss needs an 8760-hour simulation. A sizing sanity check, not a clipping-loss model.",
  };
}
function renderPvInverterRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: inverter loading ratio ILR = Pdc / Pac and NREL inverter-sizing guidance; clipping begins where the array DC output exceeds Pac / inverter efficiency (by name). The cost-optimal 1.1-1.3 band shifts with irradiance, equipment price, and energy value; an accurate annual clipping loss needs an 8760-hour simulation. A sizing sanity check, not a clipping-loss model.";
  const dc = makeNumber("Array DC nameplate (kW)", "pir-dc", { step: "any", min: "0", value: "8" });
  dc.input.value = "8";
  const ac = makeNumber("Inverter AC rating (kW)", "pir-ac", { step: "any", min: "0", value: "6.6" });
  ac.input.value = "6.6";
  const eff = makeNumber("Inverter peak efficiency (0-1)", "pir-eff", { step: "any", min: "0", value: "0.96" });
  eff.input.value = "0.96";
  for (const f of [dc, ac, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dc.input.value = "8"; ac.input.value = "6.6"; eff.input.value = "0.96"; update(); });
  const oIlr = makeOutputLine(outputRegion, "Loading ratio (DC:AC)", "pir-out-ilr");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "pir-out-verdict");
  const oClip = makeOutputLine(outputRegion, "Clipping onset (DC power)", "pir-out-clip");
  const oFrac = makeOutputLine(outputRegion, "Clipping onset (% of nameplate)", "pir-out-frac");
  const oNote = makeOutputLine(outputRegion, "Note", "pir-out-note");
  const update = debounce(() => {
    const r = computePvInverterRatio({ dc_kw: Number(dc.input.value) || 0, ac_kw: Number(ac.input.value) || 0, inv_eff: Number(eff.input.value) || 0 });
    if (r.error) { oIlr.textContent = r.error; oVerdict.textContent = "-"; oClip.textContent = "-"; oFrac.textContent = "-"; oNote.textContent = ""; return; }
    oIlr.textContent = fmt(r.ilr, 2);
    oVerdict.textContent = r.verdict;
    oClip.textContent = fmt(r.clip_dc_kw, 3) + " kW";
    oFrac.textContent = fmt(r.clip_fraction * 100, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [dc, ac, eff]) f.input.addEventListener("input", update);
}

// ===================== spec-v236: battery time-of-use arbitrage value =====================

// dims: in { nameplate_kwh: M L^2 T^-2, dod: dimensionless, rte: dimensionless, peak_price: dimensionless, offpeak_price: dimensionless, cycles_per_year: dimensionless } out: { usable_kwh: M L^2 T^-2, charge_kwh: M L^2 T^-2, daily_value: dimensionless, annual_value: dimensionless, breakeven_ratio: dimensionless }
export function computeBatteryTouArbitrage({ nameplate_kwh = 0, dod = 0.90, rte = 0.86, peak_price = 0, offpeak_price = 0, cycles_per_year = 365 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(nameplate_kwh > 0)) return { error: "Battery nameplate energy must be positive (kWh)." };
  if (!(dod > 0 && dod <= 1)) return { error: "Depth of discharge must be over 0 and up to 1." };
  if (!(rte > 0 && rte <= 1)) return { error: "Round-trip efficiency must be over 0 and up to 1." };
  if (peak_price < 0 || offpeak_price < 0) return { error: "Prices must be non-negative." };
  if (!(cycles_per_year > 0)) return { error: "Cycles per year must be positive." };
  const usable_kwh = nameplate_kwh * dod;
  const charge_kwh = usable_kwh / rte;
  const daily_value = usable_kwh * peak_price - charge_kwh * offpeak_price;
  const annual_value = daily_value * cycles_per_year;
  const breakeven_ratio = 1 / rte;
  return {
    usable_kwh, charge_kwh, daily_value, annual_value, breakeven_ratio,
    note: "Energy-arbitrage value: daily = usable x peak - (usable / RTE) x offpeak, usable = nameplate x DoD, break-even when peak > offpeak / RTE (the NREL battery round-trip framing). The round-trip efficiency is the AC-to-AC value (inverter plus cells; a DC-coupled solar charge avoids one conversion), and the depth of discharge is the warranty-usable fraction. One cycle per day is the common assumption, but a battery cannot capture two non-overlapping peaks it lacks the energy for; throughput degrades the cells, a cost this gross value does not net out. A spread-value aid, not a financed payback.",
  };
}
function renderBatteryTouArbitrage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: energy-arbitrage value daily = usable x peak - (usable / RTE) x offpeak, break-even when peak > offpeak / RTE, and the NREL battery round-trip / degradation framing (by name). RTE is AC-to-AC; DoD is the warranty-usable fraction. A gross spread-value aid, not a financed payback.";
  const kwh = makeNumber("Battery nameplate (kWh)", "bta-kwh", { step: "any", min: "0", value: "13.5" });
  kwh.input.value = "13.5";
  const dod = makeNumber("Depth of discharge (0-1)", "bta-dod", { step: "any", min: "0", value: "0.9" });
  dod.input.value = "0.9";
  const rte = makeNumber("Round-trip efficiency (0-1)", "bta-rte", { step: "any", min: "0", value: "0.9" });
  rte.input.value = "0.9";
  const peak = makeNumber("On-peak price ($/kWh)", "bta-peak", { step: "any", min: "0", value: "0.45" });
  peak.input.value = "0.45";
  const off = makeNumber("Off-peak price ($/kWh)", "bta-off", { step: "any", min: "0", value: "0.15" });
  off.input.value = "0.15";
  const cyc = makeNumber("Cycles per year", "bta-cyc", { step: "any", min: "0", value: "365" });
  cyc.input.value = "365";
  for (const f of [kwh, dod, rte, peak, off, cyc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kwh.input.value = "13.5"; dod.input.value = "0.9"; rte.input.value = "0.9"; peak.input.value = "0.45"; off.input.value = "0.15"; cyc.input.value = "365"; update(); });
  const oUsable = makeOutputLine(outputRegion, "Usable energy per cycle", "bta-out-usable");
  const oDaily = makeOutputLine(outputRegion, "Daily arbitrage value", "bta-out-daily");
  const oAnnual = makeOutputLine(outputRegion, "Annual value", "bta-out-annual");
  const oBreak = makeOutputLine(outputRegion, "Break-even price ratio", "bta-out-break");
  const oNote = makeOutputLine(outputRegion, "Note", "bta-out-note");
  const update = debounce(() => {
    const r = computeBatteryTouArbitrage({ nameplate_kwh: Number(kwh.input.value) || 0, dod: Number(dod.input.value) || 0, rte: Number(rte.input.value) || 0, peak_price: Number(peak.input.value) || 0, offpeak_price: Number(off.input.value) || 0, cycles_per_year: Number(cyc.input.value) || 0 });
    if (r.error) { oUsable.textContent = r.error; oDaily.textContent = "-"; oAnnual.textContent = "-"; oBreak.textContent = "-"; oNote.textContent = ""; return; }
    oUsable.textContent = fmt(r.usable_kwh, 2) + " kWh";
    oDaily.textContent = "$" + fmt(r.daily_value, 2) + "/day";
    oAnnual.textContent = "$" + fmt(r.annual_value, 0) + "/yr";
    oBreak.textContent = fmt(r.breakeven_ratio, 3) + "x (peak must beat off-peak by this)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [kwh, dod, rte, peak, off, cyc]) f.input.addEventListener("input", update);
}

// ===================== spec-v237: battery peak-shaving demand-charge savings =====================

// dims: in { nameplate_kwh: M L^2 T^-2, dod: dimensionless, event_duration_h: T, target_shave_kw: M L^2 T^-3, demand_per_kw_mo: dimensionless } out: { usable_kwh: M L^2 T^-2, sustainable_kw: M L^2 T^-3, actual_shave_kw: M L^2 T^-3, annual_savings: dimensionless }
export function computeBatteryPeakShaving({ nameplate_kwh = 0, dod = 0.90, event_duration_h = 0, target_shave_kw = 0, demand_per_kw_mo = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(nameplate_kwh > 0)) return { error: "Battery nameplate energy must be positive (kWh)." };
  if (!(dod > 0 && dod <= 1)) return { error: "Depth of discharge must be over 0 and up to 1." };
  if (!(event_duration_h > 0)) return { error: "Peak-event duration must be positive (h)." };
  if (!(target_shave_kw > 0)) return { error: "Target shave must be positive (kW)." };
  if (!(demand_per_kw_mo > 0)) return { error: "Demand charge must be positive ($/kW-month)." };
  const usable_kwh = nameplate_kwh * dod;
  const sustainable_kw = usable_kwh / event_duration_h;
  const actual_shave_kw = Math.min(target_shave_kw, sustainable_kw);
  const annual_savings = actual_shave_kw * demand_per_kw_mo * 12;
  const energy_limited = sustainable_kw < target_shave_kw;
  return {
    usable_kwh, sustainable_kw, actual_shave_kw, annual_savings, energy_limited,
    note: "Demand-charge peak-shaving method: sustainable shave = usable / duration, actual shave = min(target, sustainable), savings = actual shave x $/kW-month x 12. The peak-event duration is how long the facility's demand stays above the shave target (from an interval-meter load profile). The actual reduction depends on the battery discharging on exactly the right intervals (a controls problem this sizing does not solve), and a coincident-peak or ratchet tariff changes the billing. A demand-savings estimate, not a metered bill.",
  };
}
function renderBatteryPeakShaving(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: demand-charge peak-shaving method sustainable shave = usable / duration, actual = min(target, sustainable), savings = actual x $/kW-month x 12 (by name). The shave is energy-limited when the peak outlasts the usable energy. A demand-savings estimate, not a metered bill.";
  const kwh = makeNumber("Battery nameplate (kWh)", "bps-kwh", { step: "any", min: "0", value: "100" });
  kwh.input.value = "100";
  const dod = makeNumber("Depth of discharge (0-1)", "bps-dod", { step: "any", min: "0", value: "0.9" });
  dod.input.value = "0.9";
  const dur = makeNumber("Peak-event duration (h)", "bps-dur", { step: "any", min: "0", value: "3" });
  dur.input.value = "3";
  const tgt = makeNumber("Target demand reduction (kW)", "bps-tgt", { step: "any", min: "0", value: "40" });
  tgt.input.value = "40";
  const demand = makeNumber("Demand charge ($/kW-month)", "bps-demand", { step: "any", min: "0", value: "18" });
  demand.input.value = "18";
  for (const f of [kwh, dod, dur, tgt, demand]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kwh.input.value = "100"; dod.input.value = "0.9"; dur.input.value = "3"; tgt.input.value = "40"; demand.input.value = "18"; update(); });
  const oUsable = makeOutputLine(outputRegion, "Usable energy", "bps-out-usable");
  const oSust = makeOutputLine(outputRegion, "Sustainable shave", "bps-out-sust");
  const oActual = makeOutputLine(outputRegion, "Actual shave", "bps-out-actual");
  const oAnnual = makeOutputLine(outputRegion, "Annual demand savings", "bps-out-annual");
  const oNote = makeOutputLine(outputRegion, "Note", "bps-out-note");
  const update = debounce(() => {
    const r = computeBatteryPeakShaving({ nameplate_kwh: Number(kwh.input.value) || 0, dod: Number(dod.input.value) || 0, event_duration_h: Number(dur.input.value) || 0, target_shave_kw: Number(tgt.input.value) || 0, demand_per_kw_mo: Number(demand.input.value) || 0 });
    if (r.error) { oUsable.textContent = r.error; oSust.textContent = "-"; oActual.textContent = "-"; oAnnual.textContent = "-"; oNote.textContent = ""; return; }
    oUsable.textContent = fmt(r.usable_kwh, 1) + " kWh";
    oSust.textContent = fmt(r.sustainable_kw, 1) + " kW";
    oActual.textContent = fmt(r.actual_shave_kw, 1) + " kW" + (r.energy_limited ? " (energy-limited)" : "");
    oAnnual.textContent = "$" + fmt(r.annual_savings, 0) + "/yr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [kwh, dod, dur, tgt, demand]) f.input.addEventListener("input", update);
}

// ===================== spec-v238: battery C-rate deliverable power and duration =====================

// dims: in { nameplate_kwh: M L^2 T^-2, c_rate: T^-1, dod: dimensionless, inverter_kw: M L^2 T^-3 } out: { c_rate_power_kw: M L^2 T^-3, deliverable_kw: M L^2 T^-3, usable_kwh: M L^2 T^-2, discharge_time_h: T }
export function computeBatteryCRate({ nameplate_kwh = 0, c_rate = 0.5, dod = 0.90, inverter_kw = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(nameplate_kwh > 0)) return { error: "Battery nameplate energy must be positive (kWh)." };
  if (!(c_rate > 0)) return { error: "C-rate must be positive." };
  if (!(dod > 0 && dod <= 1)) return { error: "Depth of discharge must be over 0 and up to 1." };
  if (inverter_kw < 0) return { error: "Inverter rating must be non-negative (0 = no inverter limit)." };
  const c_rate_power_kw = nameplate_kwh * c_rate;
  const deliverable_kw = inverter_kw > 0 ? Math.min(c_rate_power_kw, inverter_kw) : c_rate_power_kw;
  const usable_kwh = nameplate_kwh * dod;
  const discharge_time_h = usable_kwh / deliverable_kw;
  const inverter_limited = inverter_kw > 0 && inverter_kw < c_rate_power_kw;
  return {
    c_rate_power_kw, deliverable_kw, usable_kwh, discharge_time_h, inverter_limited,
    note: "Battery C-rate definition: power = nameplate x C, full discharge time = 1 / C, and the deliverable power is the lesser of the C-rate power and the inverter rating (0 = no inverter limit). The continuous C-rate is the sustained rating not the brief surge (a pack delivers more for seconds than for an hour); the usable energy uses the depth of discharge; high discharge rates lose a few points of capacity and add heat. A nameplate power check, not a cell-level thermal model.",
  };
}
function renderBatteryCRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: battery C-rate definition power = nameplate x C, discharge time = 1 / C, deliverable = min(C-rate power, inverter rating) (by name). Continuous, not surge; usable uses DoD. A nameplate power check, not a cell-level thermal model.";
  const kwh = makeNumber("Battery nameplate (kWh)", "bcr-kwh", { step: "any", min: "0", value: "40" });
  kwh.input.value = "40";
  const c = makeNumber("Continuous C-rate (0.5 = 0.5C)", "bcr-c", { step: "any", min: "0", value: "0.5" });
  c.input.value = "0.5";
  const dod = makeNumber("Depth of discharge (0-1)", "bcr-dod", { step: "any", min: "0", value: "0.9" });
  dod.input.value = "0.9";
  const inv = makeNumber("Inverter rating (kW, 0 = no limit)", "bcr-inv", { step: "any", min: "0", value: "15" });
  inv.input.value = "15";
  for (const f of [kwh, c, dod, inv]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kwh.input.value = "40"; c.input.value = "0.5"; dod.input.value = "0.9"; inv.input.value = "15"; update(); });
  const oCPower = makeOutputLine(outputRegion, "C-rate power (cells)", "bcr-out-cpower");
  const oDeliv = makeOutputLine(outputRegion, "Deliverable power", "bcr-out-deliv");
  const oUsable = makeOutputLine(outputRegion, "Usable energy", "bcr-out-usable");
  const oTime = makeOutputLine(outputRegion, "Discharge time at deliverable", "bcr-out-time");
  const oNote = makeOutputLine(outputRegion, "Note", "bcr-out-note");
  const update = debounce(() => {
    const r = computeBatteryCRate({ nameplate_kwh: Number(kwh.input.value) || 0, c_rate: Number(c.input.value) || 0, dod: Number(dod.input.value) || 0, inverter_kw: Number(inv.input.value) || 0 });
    if (r.error) { oCPower.textContent = r.error; oDeliv.textContent = "-"; oUsable.textContent = "-"; oTime.textContent = "-"; oNote.textContent = ""; return; }
    oCPower.textContent = fmt(r.c_rate_power_kw, 1) + " kW";
    oDeliv.textContent = fmt(r.deliverable_kw, 1) + " kW" + (r.inverter_limited ? " (inverter-limited)" : "");
    oUsable.textContent = fmt(r.usable_kwh, 1) + " kWh";
    oTime.textContent = fmt(r.discharge_time_h, 2) + " h";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [kwh, c, dod, inv]) f.input.addEventListener("input", update);
}

// spec-v488: EV charge time (AC Level 2). energy = capacity x (target - start);
// AC power is capped by the vehicle onboard charger (min(EVSE, onboard)); time =
// energy / (power x efficiency). The onboard-charger limit is the field gotcha.
// dims: in { battery_capacity_kwh: M L^2 T^-2, start_soc_pct: dimensionless, target_soc_pct: dimensionless, evse_power_kw: M L^2 T^-3, onboard_charger_kw: M L^2 T^-3, efficiency_pct: dimensionless } out: { energy_needed_kwh: M L^2 T^-2, charge_power_kw: M L^2 T^-3, time_hr: T }
export function computeEvChargeTime({ battery_capacity_kwh = 0, start_soc_pct = 0, target_soc_pct = 80, evse_power_kw = 0, onboard_charger_kw = 0, efficiency_pct = 88 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cap = Number(battery_capacity_kwh) || 0;
  const start = Number(start_soc_pct) || 0;
  const target = Number(target_soc_pct) || 0;
  const evse = Number(evse_power_kw) || 0;
  const onboard = Number(onboard_charger_kw) || 0;
  const eff = Number(efficiency_pct) || 0;
  if (!(cap > 0)) return { error: "Battery capacity must be positive (kWh)." };
  if (!(start >= 0 && start < 100)) return { error: "Start state of charge must be 0 to under 100 percent." };
  if (!(target > start && target <= 100)) return { error: "Target state of charge must exceed the start and be at most 100 percent." };
  if (!(evse > 0)) return { error: "EVSE power must be positive (kW)." };
  if (onboard < 0) return { error: "Onboard charger rating must be non-negative (0 = DC fast / no AC cap)." };
  if (!(eff > 0 && eff <= 100)) return { error: "Charging efficiency must be over 0 and at most 100 percent." };
  const energy_needed_kwh = cap * (target - start) / 100;
  const charge_power_kw = onboard > 0 ? Math.min(evse, onboard) : evse;
  const power_to_battery_kw = charge_power_kw * eff / 100;
  const time_hr = energy_needed_kwh / power_to_battery_kw;
  const onboard_limited = onboard > 0 && onboard < evse;
  if (![energy_needed_kwh, charge_power_kw, time_hr].every(Number.isFinite)) return { error: "Charge-time math is not a finite value." };
  return {
    energy_needed_kwh, charge_power_kw, power_to_battery_kw, time_hr, onboard_limited,
    note: "AC Level 2 charge time = energy needed / (charge power x efficiency), where the charge power is the LESSER of the wall EVSE output and the vehicle's onboard charger - and it is almost always the onboard charger that governs, so a bigger EVSE does not speed up a car with a small onboard charger (the onboard-limited flag calls this out). Charging from the start to the target state of charge; the efficiency (default 88%) covers the AC-to-DC and thermal losses, so the grid draws more than the battery stores. This constant-power model holds for AC Level 2 to the target but NOT for DC fast charging, which tapers sharply above about 80% state of charge and would take longer than this predicts near full. A planning estimate; the vehicle's actual charging curve and the installed equipment govern.",
  };
}
function renderEvChargeTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AC Level 2 charge time (SAE J1772 onboard-charger limit): energy = capacity x (target - start); charge power = min(EVSE, onboard charger); time = energy / (power x efficiency). AC is capped by the onboard charger; DC fast charging tapers and is not this model. A planning estimate; the vehicle's charging curve governs.";
  const cap = makeNumber("Battery capacity (kWh)", "ect-cap", { step: "any", min: "0", value: "75" }); cap.input.value = "75";
  const start = makeNumber("Start state of charge (%)", "ect-start", { step: "any", min: "0", max: "100", value: "20" }); start.input.value = "20";
  const target = makeNumber("Target state of charge (%)", "ect-target", { step: "any", min: "0", max: "100", value: "80" }); target.input.value = "80";
  const evse = makeNumber("EVSE output power (kW)", "ect-evse", { step: "any", min: "0", value: "11.5" }); evse.input.value = "11.5";
  const onboard = makeNumber("Vehicle onboard charger (kW, 0 = DC fast)", "ect-onboard", { step: "any", min: "0", value: "7.7" }); onboard.input.value = "7.7";
  const eff = makeNumber("Charging efficiency (%)", "ect-eff", { step: "any", min: "0", max: "100", value: "88" }); eff.input.value = "88";
  for (const f of [cap, start, target, evse, onboard, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "75"; start.input.value = "20"; target.input.value = "80"; evse.input.value = "11.5"; onboard.input.value = "7.7"; eff.input.value = "88"; update(); });
  const oEnergy = makeOutputLine(outputRegion, "Energy needed", "ect-out-energy");
  const oPower = makeOutputLine(outputRegion, "Charge power (governing)", "ect-out-power");
  const oTime = makeOutputLine(outputRegion, "Charge time", "ect-out-time");
  const oNote = makeOutputLine(outputRegion, "Note", "ect-out-note");
  const update = debounce(() => {
    const r = computeEvChargeTime({ battery_capacity_kwh: Number(cap.input.value) || 0, start_soc_pct: Number(start.input.value) || 0, target_soc_pct: Number(target.input.value) || 0, evse_power_kw: Number(evse.input.value) || 0, onboard_charger_kw: Number(onboard.input.value) || 0, efficiency_pct: eff.input.value === "" ? 88 : Number(eff.input.value) });
    if (r.error) { oEnergy.textContent = r.error; oPower.textContent = "-"; oTime.textContent = "-"; oNote.textContent = ""; return; }
    oEnergy.textContent = fmt(r.energy_needed_kwh, 1) + " kWh";
    oPower.textContent = fmt(r.charge_power_kw, 1) + " kW" + (r.onboard_limited ? " (onboard-charger limited -- EVSE oversized)" : "");
    oTime.textContent = fmt(r.time_hr, 1) + " hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [cap, start, target, evse, onboard, eff]) f.input.addEventListener("input", update);
}

// Renderer registry keyed by tool id. All tiles keep group: "A"; this
// registry is merged into the Group A renderer set by app.js (spec-v88).
export const SOLAR_RENDERERS = {
  "pv-string-sizing": renderPVStringSizing,
  "battery-runtime": renderBatteryRuntime,
  "pv-interconnection-busbar": renderPvInterconnectionBusbar,
  "off-grid-battery": renderOffGridBattery,
  "ev-charger-load": renderEvChargerLoad,
  "ev-charge-time": renderEvChargeTime,
  "pv-circuit-ampacity": renderPvCircuitAmpacity,
  // spec-v221..v223 PV system-design batch
  "pv-energy-yield": renderPvEnergyYield,
  "pv-row-spacing": renderPvRowSpacing,
  "pv-inverter-ratio": renderPvInverterRatio,
  // spec-v236..v238 grid-tied battery-economics batch
  "battery-tou-arbitrage": renderBatteryTouArbitrage,
  "battery-peak-shaving": renderBatteryPeakShaving,
  "battery-c-rate": renderBatteryCRate,
};

// ===================== spec-v350..v352: PV performance & protection batch (Group A) =====================
// The field-condition and code numbers the STC-nameplate PV tiles never give:
// the cell temperature and its power derate (v350), the multiplicative loss
// stack that becomes the performance ratio (v351), and the NEC 690.9 source-
// circuit fuse selection with the module-label check (v352).

// dims: in { T_amb_C: T, G_wm2: M T^-3, NOCT_C: T, P_stc_W: M L^2 T^-3, gamma: dimensionless } out: { T_cell_C: T, P_W: M L^2 T^-3, loss_pct: dimensionless }
export function computePvCellTemperaturePower({ T_amb_C = 0, G_wm2 = 0, NOCT_C = 45, P_stc_W = 0, gamma = -0.35 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Ta = Number(T_amb_C);
  const G = Number(G_wm2) || 0;
  const noct = Number(NOCT_C) || 0;
  const Pstc = Number(P_stc_W) || 0;
  const g = Number(gamma);
  if (!Number.isFinite(Ta)) return { error: "Enter a valid ambient temperature (C)." };
  if (!(G > 0)) return { error: "Plane-of-array irradiance must be positive (W/m^2)." };
  if (!(noct > 0)) return { error: "NOCT must be positive (C)." };
  if (!(Pstc > 0)) return { error: "Module STC power must be positive (W)." };
  if (!Number.isFinite(g)) return { error: "Enter a valid power temperature coefficient (%/C)." };
  const T_cell_C = Ta + (noct - 20) * G / 800;
  const P_W = Pstc * (1 + (g / 100) * (T_cell_C - 25));
  const loss_pct = (1 - P_W / Pstc) * 100;
  return {
    T_cell_C, P_W, loss_pct,
    note: "PV cell temperature from the NOCT model T_cell = T_amb + (NOCT - 20) x G/800, and the temperature-derated power P = P_stc x (1 + gamma/100 x (T_cell - 25)) with gamma the datasheet power coefficient (about -0.35%/C for silicon). Cells run well above air temperature in sun, so a hot midsummer module makes less than its cool-morning nameplate - the reason spring often out-produces a hotter summer. This is the temperature derate only; it does not include soiling, wiring, inverter, or shading losses (see the performance-ratio tile). A design aid; the module datasheet governs.",
  };
}
const pvCellTemperaturePowerExample = { inputs: { T_amb_C: 30, G_wm2: 800, NOCT_C: 45, P_stc_W: 400, gamma: -0.35 } };
function renderPvCellTemperaturePower(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: PV NOCT cell-temperature model T_cell = T_amb + (NOCT - 20) x G/800 and the datasheet power temperature coefficient (about -0.35%/C for crystalline silicon), by name. Temperature derate only (no soiling/wiring/inverter/shading). A design aid; the module datasheet governs.";
  const Ta = makeNumber("Ambient temperature (C)", "pctp-ta", { step: "any", value: "30" }); Ta.input.value = "30";
  const G = makeNumber("Plane-of-array irradiance (W/m^2)", "pctp-g", { step: "any", min: "0", value: "800" }); G.input.value = "800";
  const noct = makeNumber("NOCT (C, datasheet, default 45)", "pctp-noct", { step: "any", min: "0", value: "45" }); noct.input.value = "45";
  const Pstc = makeNumber("Module STC power (W)", "pctp-p", { step: "any", min: "0", value: "400" }); Pstc.input.value = "400";
  const g = makeNumber("Power temp coefficient (%/C, e.g. -0.35)", "pctp-gamma", { step: "any", value: "-0.35" }); g.input.value = "-0.35";
  for (const f of [Ta, G, noct, Pstc, g]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Ta.input.value = "30"; G.input.value = "800"; noct.input.value = "45"; Pstc.input.value = "400"; g.input.value = "-0.35"; update(); });
  const oTc = makeOutputLine(outputRegion, "Cell temperature", "pctp-out-tc");
  const oP = makeOutputLine(outputRegion, "Power at cell temperature", "pctp-out-p");
  const oLoss = makeOutputLine(outputRegion, "Temperature loss", "pctp-out-loss");
  const oNote = makeOutputLine(outputRegion, "Note", "pctp-out-note");
  const update = debounce(() => {
    const r = computePvCellTemperaturePower({ T_amb_C: Number(Ta.input.value), G_wm2: Number(G.input.value) || 0, NOCT_C: Number(noct.input.value) || 0, P_stc_W: Number(Pstc.input.value) || 0, gamma: Number(g.input.value) });
    if (r.error) { oTc.textContent = r.error; oP.textContent = "-"; oLoss.textContent = "-"; oNote.textContent = ""; return; }
    oTc.textContent = fmt(r.T_cell_C, 1) + " C";
    oP.textContent = fmt(r.P_W, 0) + " W";
    oLoss.textContent = fmt(r.loss_pct, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [Ta, G, noct, Pstc, g]) f.input.addEventListener("input", update);
}
SOLAR_RENDERERS["pv-cell-temperature-power"] = renderPvCellTemperaturePower;

// dims: in { soiling: dimensionless, temperature: dimensionless, wiring_dc: dimensionless, wiring_ac: dimensionless, inverter: dimensionless, mismatch: dimensionless, shading: dimensionless, availability: dimensionless, nameplate: dimensionless, lid: dimensionless, connections: dimensionless } out: { pr: dimensionless, total_loss_pct: dimensionless }
export function computePvPerformanceRatio(inputs = {}) {
  const _g = _finiteGuard(inputs); if (_g) return _g;
  const keys = ["soiling", "temperature", "wiring_dc", "wiring_ac", "inverter", "mismatch", "shading", "availability", "nameplate", "lid", "connections"];
  let pr = 1;
  let anyEntered = false;
  for (const k of keys) {
    const v = Number(inputs[k]) || 0;
    if (v === 0) continue;
    if (!(v > 0 && v < 100)) return { error: "Each loss must be at least 0 and under 100 percent (" + k + ")." };
    pr *= (1 - v / 100);
    anyEntered = true;
  }
  if (!anyEntered) return { error: "Enter at least one loss percentage." };
  const total_loss_pct = (1 - pr) * 100;
  return {
    pr, total_loss_pct,
    note: "Performance ratio PR = product of (1 - loss_i) over the entered derate factors (soiling, temperature, wiring, inverter, mismatch, shading, availability, nameplate tolerance, LID, connections). Because the losses compound multiplicatively, attacking the two or three largest factors moves the PR far more than trimming an already-small loss. This PR feeds the energy-yield estimate; a typical rooftop stack lands near 0.75-0.82. A screening stack, not a measured performance ratio (which comes from metered production vs. modeled irradiance). A design aid.",
  };
}
const pvPerformanceRatioExample = { inputs: { soiling: 2, temperature: 8, wiring_dc: 2, inverter: 4, mismatch: 2, shading: 3 } };
function renderPvPerformanceRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: PV performance ratio as the product of (1 - loss) over the NREL/PVWatts-style derate stack (soiling, temperature, wiring, inverter, mismatch, shading, availability, nameplate, LID, connections), by name. A screening stack, not a metered performance ratio. A design aid.";
  const fields = [
    ["soiling", "Soiling loss (%)", "2"],
    ["temperature", "Temperature loss (%)", "8"],
    ["wiring_dc", "DC wiring loss (%)", "2"],
    ["wiring_ac", "AC wiring loss (%)", ""],
    ["inverter", "Inverter loss (%)", "4"],
    ["mismatch", "Mismatch loss (%)", "2"],
    ["shading", "Shading loss (%)", "3"],
    ["availability", "Availability loss (%)", ""],
    ["nameplate", "Nameplate tolerance loss (%)", ""],
    ["lid", "Light-induced degradation loss (%)", ""],
    ["connections", "Connections loss (%)", ""],
  ];
  const inp = {};
  for (const [key, label, val] of fields) {
    const f = makeNumber(label, "ppr-" + key, { step: "any", min: "0", max: "100" });
    if (val) f.input.value = val;
    inp[key] = f;
    inputRegion.appendChild(f.wrap);
  }
  attachExampleButton(inputRegion, () => {
    for (const [key, , val] of fields) inp[key].input.value = val;
    update();
  });
  const oPR = makeOutputLine(outputRegion, "Performance ratio (PR)", "ppr-out-pr");
  const oLoss = makeOutputLine(outputRegion, "Total loss", "ppr-out-loss");
  const oNote = makeOutputLine(outputRegion, "Note", "ppr-out-note");
  const update = debounce(() => {
    const params = {};
    for (const [key] of fields) params[key] = Number(inp[key].input.value) || 0;
    const r = computePvPerformanceRatio(params);
    if (r.error) { oPR.textContent = r.error; oLoss.textContent = "-"; oNote.textContent = ""; return; }
    oPR.textContent = fmt(r.pr, 3);
    oLoss.textContent = fmt(r.total_loss_pct, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const [key] of fields) inp[key].input.addEventListener("input", update);
}
SOLAR_RENDERERS["pv-performance-ratio"] = renderPvPerformanceRatio;

// NEC 240.6(A) standard overcurrent-device ampere ratings (the range PV source circuits use).
const _PV_STD_OCPD_A = [1, 3, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200];
// dims: in { Isc_A: I, max_fuse_A: I, n_strings: dimensionless } out: { req_A: I, fuse_A: I }
export function computePvStringFusing({ Isc_A = 0, max_fuse_A = 0, n_strings = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const isc = Number(Isc_A) || 0;
  const maxf = Number(max_fuse_A) || 0;
  const n = Number(n_strings) || 0;
  if (!(isc > 0)) return { error: "Module short-circuit current Isc must be positive (A)." };
  if (!(maxf > 0)) return { error: "Module maximum series fuse rating must be positive (A)." };
  if (!(n >= 1)) return { error: "Number of source circuits must be at least 1." };
  const req_A = 1.56 * isc; // NEC 690.9(B): 1.25 x 1.25 x Isc
  let fuse_A = null;
  for (const s of _PV_STD_OCPD_A) { if (s >= req_A) { fuse_A = s; break; } }
  if (fuse_A === null) return { error: "Required fuse exceeds the standard ratings table (check the design)." };
  const compliant = fuse_A <= maxf;
  const fuse_required = n >= 3; // 690.9(A): fuses required with 3+ paralleled source circuits
  return {
    req_A, fuse_A, compliant, fuse_required, n,
    note: "PV source-circuit overcurrent per NEC 690.9(B): the fuse must be at least 1.56 x Isc (1.25 continuous x 1.25 PV) and is rounded UP to the next NEC 240.6(A) standard rating, then checked against the module label's maximum series fuse rating. Overcurrent protection is required only where three or more source circuits are paralleled (690.9(A)); with one or two, a fault has no back-feed path large enough to require a fuse. If the selected fuse exceeds the module maximum, fewer strings per combiner or a different module is needed. A design aid; the NEC and the AHJ govern.",
  };
}
const pvStringFusingExample = { inputs: { Isc_A: 10, max_fuse_A: 20, n_strings: 4 } };
function renderPvStringFusing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 690.9(B) PV source-circuit overcurrent: OCPD >= 1.56 x Isc (1.25 x 1.25), rounded up to a 240.6(A) standard rating, checked against the module label maximum series fuse; fuses required with 3+ paralleled source circuits (690.9(A)), by name. A design aid; the NEC and the AHJ govern.";
  const isc = makeNumber("Module Isc (A)", "psf-isc", { step: "any", min: "0", value: "10" }); isc.input.value = "10";
  const maxf = makeNumber("Module max series fuse (A, from label)", "psf-max", { step: "any", min: "0", value: "20" }); maxf.input.value = "20";
  const n = makeNumber("Paralleled source circuits", "psf-n", { step: "1", min: "1", value: "4" }); n.input.value = "4";
  for (const f of [isc, maxf, n]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { isc.input.value = "10"; maxf.input.value = "20"; n.input.value = "4"; update(); });
  const oReq = makeOutputLine(outputRegion, "Minimum OCPD (1.56 x Isc)", "psf-out-req");
  const oFuse = makeOutputLine(outputRegion, "Selected standard fuse", "psf-out-fuse");
  const oComp = makeOutputLine(outputRegion, "Within module maximum?", "psf-out-comp");
  const oReqd = makeOutputLine(outputRegion, "Fuses required?", "psf-out-reqd");
  const oNote = makeOutputLine(outputRegion, "Note", "psf-out-note");
  const update = debounce(() => {
    const r = computePvStringFusing({ Isc_A: Number(isc.input.value) || 0, max_fuse_A: Number(maxf.input.value) || 0, n_strings: Number(n.input.value) || 0 });
    if (r.error) { oReq.textContent = r.error; oFuse.textContent = "-"; oComp.textContent = "-"; oReqd.textContent = "-"; oNote.textContent = ""; return; }
    oReq.textContent = fmt(r.req_A, 2) + " A";
    oFuse.textContent = fmt(r.fuse_A, 0) + " A";
    oComp.textContent = r.compliant ? "yes (" + fmt(r.fuse_A, 0) + " <= " + fmt(Number(maxf.input.value) || 0, 0) + " A module max)" : "NO -- fuse exceeds the module maximum; use fewer strings or a different module";
    oReqd.textContent = r.fuse_required ? "yes (3+ paralleled source circuits)" : "no (only " + r.n + " source circuit(s); 690.9(A) requires fuses at 3+)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [isc, maxf, n]) f.input.addEventListener("input", update);
}
SOLAR_RENDERERS["pv-string-fusing"] = renderPvStringFusing;

// dims: in { battery_capacity_kwh: M L^2 T^-2, start_soc_pct: dimensionless, target_soc_pct: dimensionless, electricity_rate: dimensionless, efficiency_pct: dimensionless, miles_per_kwh: dimensionless } out: { energy_to_battery_kwh: M L^2 T^-2, grid_energy_kwh: M L^2 T^-2, cost: dimensionless, cost_per_stored_kwh: dimensionless, cost_per_mile: dimensionless }
export function computeEvChargeCost({ battery_capacity_kwh = 0, start_soc_pct = 0, target_soc_pct = 80, electricity_rate = 0, efficiency_pct = 88, miles_per_kwh = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cap = Number(battery_capacity_kwh) || 0;
  const start = Number(start_soc_pct) || 0;
  const target = Number(target_soc_pct) || 0;
  const rate = Number(electricity_rate) || 0;
  const eff = Number(efficiency_pct) || 0;
  const mpk = Number(miles_per_kwh) || 0;
  if (!(cap > 0)) return { error: "Battery capacity must be positive (kWh)." };
  if (!(rate >= 0)) return { error: "Electricity rate must be non-negative ($/kWh)." };
  if (!(start >= 0 && start < 100)) return { error: "Start state of charge must be 0 to under 100 percent." };
  if (!(target > start && target <= 100)) return { error: "Target state of charge must exceed the start and be at most 100 percent." };
  if (!(eff > 0 && eff <= 100)) return { error: "Charging efficiency must be over 0 and at most 100 percent (a positive efficiency is required so the grid draw is finite)." };
  if (mpk < 0) return { error: "Vehicle efficiency must be non-negative (mi/kWh; 0 = skip the cost per mile)." };
  const energy_to_battery_kwh = cap * (target - start) / 100;
  const grid_energy_kwh = energy_to_battery_kwh / (eff / 100);
  const cost = grid_energy_kwh * rate;
  const cost_per_stored_kwh = rate / (eff / 100);
  const cost_per_mile = mpk > 0 ? cost / (energy_to_battery_kwh * mpk) : null;
  if (![energy_to_battery_kwh, grid_energy_kwh, cost, cost_per_stored_kwh].every(Number.isFinite)) return { error: "Charge-cost math is not a finite value." };
  return {
    energy_to_battery_kwh, grid_energy_kwh, cost, cost_per_stored_kwh, cost_per_mile,
    note: "You pay for kWh at the meter, not at the battery. The energy that lands in the pack is capacity x (target - start), but AC Level 2 charging loses roughly 10-15% to the onboard rectifier and thermal load, so the utility meter always draws more: grid energy = battery energy / efficiency (default 88%). Pricing the battery energy alone under-counts the bill by that loss every time. The effective cost per stored kWh = rate / efficiency, always above the meter rate. This constant-rate model ignores tiered and time-of-use pricing and demand charges; the local tariff and the vehicle's actual charging behavior govern. A planning estimate, not a metered invoice.",
  };
}
function renderEvChargeCost(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: EV charge-cost-at-the-meter model. energy to battery = capacity x (target - start); grid energy = energy / efficiency (the meter draws more than the pack stores, because AC Level 2 loses about 10-15% to the onboard rectifier and thermal load); cost = grid energy x rate; cost per stored kWh = rate / efficiency. Ignores tiered, time-of-use, and demand pricing. A planning estimate; the local tariff governs.";
  const cap = makeNumber("Battery capacity (kWh)", "ecc-cap", { step: "any", min: "0", value: "75" }); cap.input.value = "75";
  const start = makeNumber("Start state of charge (%)", "ecc-start", { step: "any", min: "0", max: "100", value: "20" }); start.input.value = "20";
  const target = makeNumber("Target state of charge (%)", "ecc-target", { step: "any", min: "0", max: "100", value: "80" }); target.input.value = "80";
  const rate = makeNumber("Electricity rate ($/kWh)", "ecc-rate", { step: "any", min: "0", value: "0.15" }); rate.input.value = "0.15";
  const eff = makeNumber("Charging efficiency (%)", "ecc-eff", { step: "any", min: "0", max: "100", value: "88" }); eff.input.value = "88";
  const mpk = makeNumber("Vehicle efficiency (mi/kWh, 0 = skip)", "ecc-mpk", { step: "any", min: "0", value: "3.5" }); mpk.input.value = "3.5";
  for (const f of [cap, start, target, rate, eff, mpk]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "75"; start.input.value = "20"; target.input.value = "80"; rate.input.value = "0.15"; eff.input.value = "88"; mpk.input.value = "3.5"; update(); });
  const oEnergy = makeOutputLine(outputRegion, "Energy to battery", "ecc-out-energy");
  const oGrid = makeOutputLine(outputRegion, "Grid energy (metered)", "ecc-out-grid");
  const oCost = makeOutputLine(outputRegion, "Cost", "ecc-out-cost");
  const oPerKwh = makeOutputLine(outputRegion, "Cost per stored kWh", "ecc-out-perkwh");
  const oPerMile = makeOutputLine(outputRegion, "Cost per mile", "ecc-out-permile");
  const oNote = makeOutputLine(outputRegion, "Note", "ecc-out-note");
  const update = debounce(() => {
    const r = computeEvChargeCost({ battery_capacity_kwh: Number(cap.input.value) || 0, start_soc_pct: Number(start.input.value) || 0, target_soc_pct: Number(target.input.value) || 0, electricity_rate: Number(rate.input.value) || 0, efficiency_pct: eff.input.value === "" ? 88 : Number(eff.input.value), miles_per_kwh: Number(mpk.input.value) || 0 });
    if (r.error) { oEnergy.textContent = r.error; oGrid.textContent = "-"; oCost.textContent = "-"; oPerKwh.textContent = "-"; oPerMile.textContent = "-"; oNote.textContent = ""; return; }
    oEnergy.textContent = fmt(r.energy_to_battery_kwh, 1) + " kWh";
    oGrid.textContent = fmt(r.grid_energy_kwh, 1) + " kWh";
    oCost.textContent = "$" + fmt(r.cost, 2);
    oPerKwh.textContent = "$" + fmt(r.cost_per_stored_kwh, 3) + "/kWh";
    oPerMile.textContent = r.cost_per_mile === null ? "-- (enter a mi/kWh above)" : "$" + fmt(r.cost_per_mile, 3) + "/mi";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [cap, start, target, rate, eff, mpk]) f.input.addEventListener("input", update);
}
SOLAR_RENDERERS["ev-charge-cost"] = renderEvChargeCost;

// dims: in { usable_capacity_kwh: M L^2 T^-2, start_soc_pct: dimensionless, target_soc_pct: dimensionless, charger_power_kw: M L^2 T^-3, acceptance_kw: M L^2 T^-3 } out: { cc_power_kw: M L^2 T^-3, time_to_80_hr: T, time_8090_hr: T, time_90100_hr: T, time_total_hr: T, energy_total_kwh: M L^2 T^-2 }
export function computeEvDcfcTime({ usable_capacity_kwh = 0, start_soc_pct = 0, target_soc_pct = 80, charger_power_kw = 0, acceptance_kw = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cap = Number(usable_capacity_kwh) || 0;
  const start = Number(start_soc_pct) || 0;
  const target = Number(target_soc_pct) || 0;
  const charger = Number(charger_power_kw) || 0;
  const accept = Number(acceptance_kw) || 0;
  if (!(cap > 0)) return { error: "Usable capacity must be positive (kWh)." };
  if (!(charger > 0)) return { error: "Charger power must be positive (kW)." };
  if (!(accept > 0)) return { error: "Vehicle acceptance must be positive (kW)." };
  if (!(start >= 0 && start < 100)) return { error: "Start state of charge must be 0 to under 100 percent." };
  if (!(target > start && target <= 100)) return { error: "Target state of charge must exceed the start and be at most 100 percent." };
  const cc_power_kw = Math.min(charger, accept);
  const bands = [[0, 80, 1.0], [80, 90, 0.5], [90, 100, 0.25]];
  const times = [];
  let time_total_hr = 0, energy_total_kwh = 0;
  for (const [lo, hi, frac] of bands) {
    const span = Math.max(0, Math.min(hi, target) - Math.max(lo, start));
    const energy = cap * span / 100;
    const bt = span > 0 ? energy / (cc_power_kw * frac) : 0;
    times.push(bt);
    time_total_hr += bt;
    energy_total_kwh += energy;
  }
  const [time_to_80_hr, time_8090_hr, time_90100_hr] = times;
  if (![cc_power_kw, time_to_80_hr, time_8090_hr, time_90100_hr, time_total_hr].every(Number.isFinite)) return { error: "Fast-charge math is not a finite value." };
  return {
    cc_power_kw, time_to_80_hr, time_8090_hr, time_90100_hr, time_total_hr, energy_total_kwh,
    note: "DC fast charging holds a constant high power -- the lesser of the station's rating and the vehicle's peak acceptance -- only to about 80% state of charge, then the battery management system tapers the current to protect the cells: this model uses three constant-power bands (0-80% at full power, 80-90% at about 50%, 90-100% at about 25%). The result is that the last 20% can take as long as the entire fast leg, which is why fast-charge etiquette is to unplug at 80%. Dividing the whole energy by the rated power under-predicts a to-full session roughly two-fold. The 80/90/100 breakpoints and the 1.0/0.5/0.25 fractions approximate a smooth manufacturer curve that varies by chemistry and temperature; cold cells taper earlier. A planning estimate, not the vehicle's charging profile.",
  };
}
function renderEvDcfcTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: DC fast-charge CC-CV taper model. cc_power = min(charger, vehicle acceptance); three constant-power bands (0-80% at full power, 80-90% at ~50%, 90-100% at ~25%); per-band time = energy / (cc_power x band_fraction). DC fast charging holds constant power only to ~80% and then tapers to protect the cells, so the naive energy / rated-power estimate under-predicts a to-full session. A planning estimate; the vehicle's charging curve governs.";
  const cap = makeNumber("Usable capacity (kWh)", "edt-cap", { step: "any", min: "0", value: "60" }); cap.input.value = "60";
  const start = makeNumber("Start state of charge (%)", "edt-start", { step: "any", min: "0", max: "100", value: "10" }); start.input.value = "10";
  const target = makeNumber("Target state of charge (%)", "edt-target", { step: "any", min: "0", max: "100", value: "100" }); target.input.value = "100";
  const charger = makeNumber("Charger rated power (kW)", "edt-charger", { step: "any", min: "0", value: "150" }); charger.input.value = "150";
  const accept = makeNumber("Vehicle peak DC acceptance (kW)", "edt-accept", { step: "any", min: "0", value: "100" }); accept.input.value = "100";
  for (const f of [cap, start, target, charger, accept]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "60"; start.input.value = "10"; target.input.value = "100"; charger.input.value = "150"; accept.input.value = "100"; update(); });
  const oPower = makeOutputLine(outputRegion, "Constant-current power", "edt-out-power");
  const oFast = makeOutputLine(outputRegion, "Fast leg (time to 80%)", "edt-out-fast");
  const oBand2 = makeOutputLine(outputRegion, "80-90% band", "edt-out-band2");
  const oBand3 = makeOutputLine(outputRegion, "90-100% band", "edt-out-band3");
  const oTotal = makeOutputLine(outputRegion, "Total time", "edt-out-total");
  const oNote = makeOutputLine(outputRegion, "Note", "edt-out-note");
  const update = debounce(() => {
    const r = computeEvDcfcTime({ usable_capacity_kwh: Number(cap.input.value) || 0, start_soc_pct: Number(start.input.value) || 0, target_soc_pct: Number(target.input.value) || 0, charger_power_kw: Number(charger.input.value) || 0, acceptance_kw: Number(accept.input.value) || 0 });
    if (r.error) { oPower.textContent = r.error; oFast.textContent = "-"; oBand2.textContent = "-"; oBand3.textContent = "-"; oTotal.textContent = "-"; oNote.textContent = ""; return; }
    oPower.textContent = fmt(r.cc_power_kw, 0) + " kW" + (r.cc_power_kw < Number(charger.input.value) ? " (vehicle-acceptance limited)" : "");
    oFast.textContent = fmt(r.time_to_80_hr * 60, 1) + " min";
    oBand2.textContent = fmt(r.time_8090_hr * 60, 1) + " min";
    oBand3.textContent = fmt(r.time_90100_hr * 60, 1) + " min";
    oTotal.textContent = fmt(r.time_total_hr * 60, 1) + " min (" + fmt(r.time_total_hr, 2) + " hr)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [cap, start, target, charger, accept]) f.input.addEventListener("input", update);
}
SOLAR_RENDERERS["ev-dcfc-time"] = renderEvDcfcTime;
