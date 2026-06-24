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
  charger_voltage = 240,
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
    charger_voltage: 240,
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
  const volt = makeSelect("Charger voltage", "ev-v", [
    { value: "240", label: "240 V (Level 2 residential)", selected: true },
    { value: "208", label: "208 V (commercial wye)" },
  ]);
  const main = makeNumber("Panel main breaker (A)", "ev-main", { step: "any", min: "0", value: "200" });
  main.input.value = "200";
  const existing = makeNumber("Existing service load (A)", "ev-exist", { step: "any", min: "0", value: "130" });
  existing.input.value = "130";
  const busbar = makeNumber("Panel busbar rating (A; 0 if unknown)", "ev-busbar", { step: "any", min: "0", value: "200" });
  busbar.input.value = "200";
  const managed = makeCheckbox("Load-managed (NEC 625.42(A) EMS)", "ev-managed");
  for (const f of [ch, volt, main, existing, busbar, managed]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    ch.input.value = "48"; volt.select.value = "240"; main.input.value = "200";
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
      charger_voltage: Number(volt.select.value),
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
  for (const f of [ch.input, volt.select, main.input, existing.input, busbar.input, managed.input]) f.addEventListener("input", update);
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

// Renderer registry keyed by tool id. All tiles keep group: "A"; this
// registry is merged into the Group A renderer set by app.js (spec-v88).
export const SOLAR_RENDERERS = {
  "pv-string-sizing": renderPVStringSizing,
  "battery-runtime": renderBatteryRuntime,
  "pv-interconnection-busbar": renderPvInterconnectionBusbar,
  "off-grid-battery": renderOffGridBattery,
  "ev-charger-load": renderEvChargerLoad,
  "pv-circuit-ampacity": renderPvCircuitAmpacity,
};
