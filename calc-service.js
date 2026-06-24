// Group B: post-rough-in plumbing service bench (appliance hookup, relief,
// support, and treatment).
// spec-v78 cap-relief split: the cohesive spec-v63 + spec-v64 service bench
// (gas-appliance-demand, tpr-discharge, pipe-support-spacing, softener-sizing)
// relocated verbatim out of calc-plumbing.js (which had reached 95.2% of cap --
// the tightest remaining calc module). All four are decisions a plumber makes
// at appliance hookup and final tie-in rather than at supply/DWV rough-in: the
// fuel-gas connected-load demand, the water-heater T&P relief and discharge
// check, the hanger spacing/count for a run, and the water-softener grain
// budget. Each keeps group: "B" (group letter independent of module, the
// v42/v70..v77 precedent). See spec-v63 and spec-v64.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeTextarea, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row.
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

export const SERVICE_RENDERERS = {};

// =====================================================================
// spec-v63: Gas appliance demand and relief discharge (Group B).
// =====================================================================

// --- gas-appliance-demand: Connected Load to CFH ---
//
// total_btuh = sum(appliance input ratings); cfh = total_btuh / heating_value.
// Fuel-gas piping is sized for the full connected load (no diversity) unless the
// AHJ accepts a demand factor (IFGC 402.2). Default heating values: natural gas
// ~1,000 BTU/ft^3, propane ~2,516 BTU/ft^3 (both editable).
const GAS_HEATING_VALUE = { natural_gas: 1000, propane: 2516 };
// dims: in { appliances: M L^2 T^-3, fuel: dimensionless, heating_value: M L^-1 T^-2 } out: { total_btuh: M L^2 T^-3, cfh: L^3 T^-1 }
// (Each appliance input rating is an energy rate M L^2 T^-3 (BTU/hr); the
//  heating value is an energy density M L^-1 T^-2 (BTU/ft^3), so the connected
//  load divided by it gives the volumetric demand L^3 T^-1 (CFH).)
export function computeGasApplianceDemand({ appliances = [], fuel = "natural_gas", heating_value = null } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!Array.isArray(appliances) || appliances.length === 0) return { error: "Add at least one appliance input rating (BTU/hr)." };
  const hv = heating_value != null ? Number(heating_value) : (GAS_HEATING_VALUE[fuel] || GAS_HEATING_VALUE.natural_gas);
  if (!Number.isFinite(hv) || hv <= 0) return { error: "Heating value must be a positive finite number (BTU/ft^3)." };
  let total = 0;
  for (const a of appliances) {
    const v = Number(a);
    if (!Number.isFinite(v) || v < 0) return { error: "Each appliance input must be a non-negative finite number (BTU/hr)." };
    total += v;
  }
  const cfh = total / hv;
  if (!Number.isFinite(cfh)) return { error: "Demand is not a finite value." };
  return {
    total_btuh: total,
    cfh,
    heating_value: hv,
    fuel: fuel === "propane" ? "propane" : "natural gas",
    appliance_count: appliances.length,
    note: "Fuel-gas piping is sized for the full connected load unless the AHJ accepts a demand factor (IFGC 402.2). Propane delivers more energy per cubic foot, so the same BTU load is fewer CFH and sizes a smaller pipe for the same length. This CFH plus the longest run length feed gas-pipe-sizing - it is the demand, not the pipe size.",
  };
}

export const gasApplianceDemandExample = {
  inputs: { appliances: [100000, 40000, 65000, 35000], fuel: "natural_gas" },
  expectedRange: { total_btuh: { min: 239999, max: 240001 }, cfh: { min: 239.9, max: 240.1 } },
};

function renderGasApplianceDemand(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IFGC 2021 Section 402 / NFPA 54 (National Fuel Gas Code) by name. cfh = total connected BTU/hr / heating value; default heating values (1,000 BTU/ft^3 natural gas, 2,516 BTU/ft^3 propane) are editable.";
  const DEFAULT = "furnace,100000\nwater heater,40000\nrange,65000\ndryer,35000";
  const list = makeTextarea("Appliances, one per line as name,BTU/hr (or just BTU/hr)", "gad-list", { rows: "4" });
  list.input.value = DEFAULT;
  const fuel = makeSelect("Fuel", "gad-fuel", [
    { value: "natural_gas", label: "Natural gas (~1,000 BTU/ft^3)", selected: true }, { value: "propane", label: "Propane (~2,516 BTU/ft^3)" },
  ]);
  const hv = makeNumber("Heating value override (BTU/ft^3, optional)", "gad-hv", { step: "any", min: "0" });
  for (const f of [list, fuel, hv]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { list.input.value = DEFAULT; fuel.select.value = "natural_gas"; hv.input.value = ""; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total connected load", "gad-out-total");
  const oCfh = makeOutputLine(outputRegion, "Demand", "gad-out-cfh");
  const oList = makeOutputLine(outputRegion, "Per appliance", "gad-out-list");
  function parseAppliances(text) {
    const vals = [], labels = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const parts = line.split(",");
      const num = Number(parts[parts.length - 1].trim());
      if (!Number.isFinite(num)) return null;
      vals.push(num);
      labels.push(parts.length > 1 ? parts.slice(0, -1).join(",").trim() : "appliance " + vals.length);
    }
    return { vals, labels };
  }
  const update = debounce(() => {
    const parsed = parseAppliances(list.input.value);
    if (parsed === null || parsed.vals.length === 0) { oTotal.textContent = "Each line needs a finite BTU/hr value."; oCfh.textContent = "-"; oList.textContent = "-"; return; }
    const r = computeGasApplianceDemand({ appliances: parsed.vals, fuel: fuel.select.value, heating_value: hv.input.value === "" ? null : Number(hv.input.value) });
    if (r.error) { oTotal.textContent = r.error; oCfh.textContent = "-"; oList.textContent = "-"; return; }
    oTotal.textContent = fmt(r.total_btuh, 0) + " BTU/hr";
    oCfh.textContent = fmt(r.cfh, 1) + " CFH (" + r.fuel + ", " + fmt(r.heating_value, 0) + " BTU/ft^3)";
    oList.textContent = parsed.labels.map((l, i) => l + " " + fmt(parsed.vals[i], 0)).join("; ");
  }, DEBOUNCE_MS);
  for (const el of [list.input, fuel.select, hv.input]) el.addEventListener("input", update);
}
SERVICE_RENDERERS["gas-appliance-demand"] = renderGasApplianceDemand;

// --- tpr-discharge: Water-Heater Relief Valve and Discharge Check ---
//
// rating_ok = valve_rating >= heater_input; the discharge line is the full valve
// outlet, never reduced. Output is a verdict plus the IPC 504.6 discharge
// checklist, not a continuous quantity.
const TPR_OUTLET_LABEL = { 0.75: "3/4", 1: "1" };
const TPR_CHECKLIST = [
  "Full valve-outlet size, no reduction along the run",
  "Gravity drain, downhill, no traps",
  "Terminate 6 in above an air gap over an approved receptor / drain",
  "Of an approved material rated for 210 F",
  "Run to the outdoors or an indoor receptor per the AHJ; serves no other valve",
];
// dims: in { heater_input: M L^2 T^-3, valve_rating: M L^2 T^-3, outlet_size: L } out: { discharge_in: L, rating_margin_btuh: M L^2 T^-3, rating_ok: dimensionless }
// (Heater input and valve relief capacity are energy rates M L^2 T^-3 (BTU/hr);
//  the discharge size is a length L equal to the valve outlet, never reduced.)
export function computeTprDischarge({ heater_input, valve_rating, outlet_size = 0.75 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const input = Number(heater_input);
  const rating = Number(valve_rating);
  const outlet = Number(outlet_size);
  if (!Number.isFinite(input) || input <= 0) return { error: "Heater input must be a positive finite number (BTU/hr)." };
  if (!Number.isFinite(rating) || rating <= 0) return { error: "Valve relief rating must be a positive finite number (BTU/hr)." };
  if (!Number.isFinite(outlet) || outlet <= 0) return { error: "Valve outlet size must be a positive finite number (in)." };
  const ratingOk = rating >= input;
  return {
    rating_ok: ratingOk,
    verdict: ratingOk ? "pass" : "fail - valve undersized for the heater input",
    discharge_in: outlet,
    rating_margin_btuh: rating - input,
    heater_input: input,
    valve_rating: rating,
    checklist: TPR_CHECKLIST,
    note: "An undersized or missing T&P valve is the top water-heater safety failure. The discharge pipe must be the full outlet size, may not serve any other valve, and follows IPC 504.6. A replacement valve must match the heater's input and working pressure (ANSI Z21.22 / CSA 4.4).",
  };
}

export const tprDischargeExample = {
  inputs: { heater_input: 50000, valve_rating: 150000, outlet_size: 0.75 },
  expectedRange: { discharge_in: { min: 0.749, max: 0.751 }, rating_margin_btuh: { min: 99999, max: 100001 } },
};

function renderTprDischarge(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 2021 Section 504 (504.4 valve rating vs heater input, 504.6 discharge piping) and ANSI Z21.22 / CSA 4.4 by name. The discharge line is the full valve outlet, never reduced.";
  const input = makeNumber("Heater input rating (BTU/hr)", "tpr-input", { step: "any", min: "0" });
  const rating = makeNumber("T&P valve marked relief capacity (BTU/hr)", "tpr-rating", { step: "any", min: "0" });
  const outlet = makeSelect("Valve discharge-outlet size", "tpr-outlet", [
    { value: "0.75", label: "3/4 in", selected: true }, { value: "1", label: "1 in" },
  ]);
  for (const f of [input, rating, outlet]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { input.input.value = "50000"; rating.input.value = "150000"; outlet.select.value = "0.75"; update(); });
  const oVerdict = makeOutputLine(outputRegion, "Rating check", "tpr-out-verdict");
  const oDisch = makeOutputLine(outputRegion, "Minimum discharge pipe", "tpr-out-disch");
  const oList = makeOutputLine(outputRegion, "IPC 504.6 discharge checklist", "tpr-out-list");
  const update = debounce(() => {
    const r = computeTprDischarge({ heater_input: Number(input.input.value) || 0, valve_rating: Number(rating.input.value) || 0, outlet_size: Number(outlet.select.value) });
    if (r.error) { oVerdict.textContent = r.error; oDisch.textContent = "-"; oList.textContent = "-"; return; }
    oVerdict.textContent = r.verdict + " (valve " + fmt(r.valve_rating, 0) + " vs input " + fmt(r.heater_input, 0) + " BTU/hr; margin " + fmt(r.rating_margin_btuh, 0) + ")";
    oDisch.textContent = (TPR_OUTLET_LABEL[r.discharge_in] || fmt(r.discharge_in, 2)) + " in (full outlet, no reduction)";
    oList.textContent = r.checklist.join("; ");
  }, DEBOUNCE_MS);
  for (const el of [input.input, rating.input, outlet.select]) el.addEventListener("input", update);
}
SERVICE_RENDERERS["tpr-discharge"] = renderTprDischarge;

// =====================================================================
// spec-v64: Pipe support spacing and softener sizing (Group B).
// =====================================================================

// --- pipe-support-spacing: Hanger Spacing and Count for a Run ---
//
// max_spacing = lookup(table, material, size, orientation);
// hangers = ceil(run_length / max_spacing) + 1 (both ends plus interior).
// The bundled table is editable [material, max_size_in, horiz_ft, vert_ft]
// breakpoints approximating IPC 2021 Table 308.5 / MSS SP-58. Helpers sit
// ABOVE the dims block so the v14 lint associates it with the export.
const SUPPORT_SPACING_TABLE = [
  ["copper", 1.25, 6, 10], ["copper", 999, 10, 10],
  ["steel", 999, 12, 15],
  ["cpvc", 1, 3, 10], ["cpvc", 999, 4, 10],
  ["pvc", 999, 4, 10],
  ["pex", 999, 2.67, 10],
  ["cast_iron", 999, 5, 15],
];
const _supportLookup = (table, material, size, orientation) => {
  const rows = table.filter((r) => r[0] === material).sort((a, b) => a[1] - b[1]);
  for (const r of rows) {
    if (size <= Number(r[1])) return orientation === "vertical" ? Number(r[3]) : Number(r[2]);
  }
  return null;
};
// dims: in { pipe_size: L, run_length: L, material: dimensionless, orientation: dimensionless } out: { max_spacing_ft: L, hangers: dimensionless }
// (Pipe size and run length are lengths L; the support spacing read from the
//  table is a length L; the hanger count is a dimensionless ceil ratio.)
export function computePipeSupportSpacing({ material = "copper", pipe_size, run_length, orientation = "horizontal", table = null } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const size = Number(pipe_size);
  const run = Number(run_length);
  if (!Number.isFinite(size) || size <= 0) return { error: "Pipe size must be a positive finite number (in)." };
  if (!Number.isFinite(run) || run <= 0) return { error: "Run length must be a positive finite number (ft)." };
  const tbl = Array.isArray(table) ? table : SUPPORT_SPACING_TABLE;
  const spacing = _supportLookup(tbl, material, size, orientation);
  if (!Number.isFinite(spacing) || spacing <= 0) return { error: "No support-spacing entry for that material and size." };
  const hangers = Math.ceil(run / spacing) + 1;
  if (!Number.isFinite(hangers)) return { error: "Hanger count is not a finite value." };
  return {
    max_spacing_ft: spacing,
    hangers,
    material,
    orientation,
    note: "Plastic pipe (PVC/CPVC/PEX) supports closer than metal and needs continuous support or mid-story guides on vertical runs. These are maximums - closer is always allowed, and required near valves, heavy fittings, and changes of direction. Vertical piping is also supported at each floor/story regardless of the interval (IPC 308.5). The spacing table is editable; tune it to the adopted edition.",
  };
}

export const pipeSupportSpacingExample = {
  inputs: { material: "copper", pipe_size: 1, run_length: 24, orientation: "horizontal" },
  expectedRange: { max_spacing_ft: { min: 5.99, max: 6.01 }, hangers: { min: 4.99, max: 5.01 } },
};

function renderPipeSupportSpacing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 2021 Table 308.5 (hanger spacing) and MSS SP-58 by name; the spacing table ships as editable breakpoints by material and size. hangers = ceil(run / max_spacing) + 1.";
  const material = makeSelect("Pipe material", "pss-mat", [
    { value: "copper", label: "Copper tube", selected: true }, { value: "steel", label: "Steel" }, { value: "cpvc", label: "CPVC" },
    { value: "pvc", label: "PVC" }, { value: "pex", label: "PEX" }, { value: "cast_iron", label: "Cast iron" },
  ]);
  const size = makeNumber("Nominal pipe size (in)", "pss-size", { step: "any", min: "0" });
  const run = makeNumber("Horizontal run to support (ft)", "pss-run", { step: "any", min: "0" });
  const orient = makeSelect("Orientation", "pss-orient", [
    { value: "horizontal", label: "Horizontal", selected: true }, { value: "vertical", label: "Vertical" },
  ]);
  for (const f of [material, size, run, orient]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { material.select.value = "copper"; size.input.value = "1"; run.input.value = "24"; orient.select.value = "horizontal"; update(); });
  const oSpacing = makeOutputLine(outputRegion, "Maximum support spacing", "pss-out-spacing");
  const oHangers = makeOutputLine(outputRegion, "Hangers for the run", "pss-out-hangers");
  const update = debounce(() => {
    const r = computePipeSupportSpacing({ material: material.select.value, pipe_size: Number(size.input.value) || 0, run_length: Number(run.input.value) || 0, orientation: orient.select.value });
    if (r.error) { oSpacing.textContent = r.error; oHangers.textContent = "-"; return; }
    oSpacing.textContent = fmt(r.max_spacing_ft, 2) + " ft (" + r.material + ", " + r.orientation + ")";
    oHangers.textContent = r.hangers + " hangers";
  }, DEBOUNCE_MS);
  for (const el of [size.input, run.input]) el.addEventListener("input", update);
  for (const el of [material.select, orient.select]) el.addEventListener("change", update);
}
SERVICE_RENDERERS["pipe-support-spacing"] = renderPipeSupportSpacing;

// --- softener-sizing: Grain Load, Regeneration Interval, and Salt ---
//
// comp_hardness = hardness_gpg + iron_ppm x 4 (WQA iron compensation);
// daily_gal = people x use_per_cap; grain_load = daily_gal x comp_hardness;
// days_between = floor(capacity / grain_load); annual_salt =
// salt_per_regen x (365 / days_between).
// dims: in { people: dimensionless, use_per_cap: L^3, hardness_gpg: dimensionless, iron_ppm: dimensionless, capacity: dimensionless, salt_per_regen: M } out: { comp_hardness: dimensionless, daily_gal: L^3, grain_load: dimensionless, days_between: dimensionless, annual_salt: M }
// (Daily use is a volume L^3 (gal); hardness and grain capacity are grain
//  counts (dimensionless); salt is a mass M (lb).)
export function computeSoftenerSizing({ people, use_per_cap = 75, hardness_gpg, iron_ppm = 0, capacity, salt_per_regen = null } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ppl = Number(people);
  const use = Number(use_per_cap);
  const hardness = Number(hardness_gpg);
  const iron = Number(iron_ppm);
  const cap = Number(capacity);
  if (!Number.isFinite(ppl) || ppl <= 0) return { error: "Occupancy must be a positive finite number." };
  if (!Number.isFinite(use) || use <= 0) return { error: "Water use per person must be a positive finite number (gal/day)." };
  if (!Number.isFinite(hardness) || hardness < 0) return { error: "Hardness must be a non-negative finite number (gpg)." };
  if (!Number.isFinite(iron) || iron < 0) return { error: "Iron must be a non-negative finite number (ppm)." };
  if (!Number.isFinite(cap) || cap <= 0) return { error: "Resin capacity must be a positive finite number (grains)." };
  const salt = salt_per_regen != null ? Number(salt_per_regen) : cap / 2000;
  if (!Number.isFinite(salt) || salt < 0) return { error: "Salt per regeneration must be a non-negative finite number (lb)." };
  const compHardness = hardness + iron * 4;
  const dailyGal = ppl * use;
  const grainLoad = dailyGal * compHardness;
  if (!(grainLoad > 0)) return { error: "Grain load must be positive; raise hardness or usage." };
  const daysBetween = Math.floor(cap / grainLoad);
  const annualSalt = salt * 365 / Math.max(daysBetween, 1);
  if (![compHardness, dailyGal, grainLoad, daysBetween, annualSalt].every(Number.isFinite)) return { error: "Softener math is not a finite value." };
  return {
    comp_hardness: compHardness,
    daily_gal: dailyGal,
    grain_load: grainLoad,
    days_between: daysBetween,
    salt_per_regen: salt,
    annual_salt: annualSalt,
    undersized: daysBetween < 1,
    note: "Dissolved iron, manganese, and high TDS each raise the effective load and may exceed a softener's rating (pre-treatment may be required). A higher salt dose buys more capacity per cubic foot but at lower salt efficiency. The capacity used must match the dose the control valve is programmed for (NSF/ANSI 44).",
  };
}

export const softenerSizingExample = {
  inputs: { people: 4, use_per_cap: 75, hardness_gpg: 20, iron_ppm: 2, capacity: 32000, salt_per_regen: 15 },
  expectedRange: { grain_load: { min: 8399, max: 8401 }, days_between: { min: 2.99, max: 3.01 } },
};

function renderSoftenerSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NSF/ANSI 44 and the Water Quality Association (WQA) hardness/iron-compensation practice by name. comp_hardness = hardness + iron x 4 gpg/ppm; grain_load = people x use x comp_hardness; 1 gpg = 17.1 ppm.";
  const people = makeNumber("Occupants", "sof-people", { step: "any", min: "0" });
  const use = makeNumber("Water use per person (gal/day)", "sof-use", { step: "any", min: "0", value: "75" });
  use.input.value = "75";
  const hardness = makeNumber("Total hardness (grains/gal)", "sof-hard", { step: "any", min: "0" });
  const iron = makeNumber("Dissolved iron (ppm, optional)", "sof-iron", { step: "any", min: "0", value: "0" });
  iron.input.value = "0";
  const cap = makeNumber("Usable resin capacity (grains)", "sof-cap", { step: "any", min: "0" });
  const salt = makeNumber("Salt per regeneration (lb)", "sof-salt", { step: "any", min: "0" });
  for (const f of [people, use, hardness, iron, cap, salt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { people.input.value = "4"; use.input.value = "75"; hardness.input.value = "20"; iron.input.value = "2"; cap.input.value = "32000"; salt.input.value = "15"; update(); });
  const oComp = makeOutputLine(outputRegion, "Compensated hardness", "sof-out-comp");
  const oLoad = makeOutputLine(outputRegion, "Daily grain load", "sof-out-load");
  const oDays = makeOutputLine(outputRegion, "Days between regenerations", "sof-out-days");
  const oSalt = makeOutputLine(outputRegion, "Salt per regen / per year", "sof-out-salt");
  const update = debounce(() => {
    const r = computeSoftenerSizing({
      people: Number(people.input.value) || 0,
      use_per_cap: use.input.value === "" ? 75 : Number(use.input.value),
      hardness_gpg: Number(hardness.input.value) || 0,
      iron_ppm: iron.input.value === "" ? 0 : Number(iron.input.value),
      capacity: Number(cap.input.value) || 0,
      salt_per_regen: salt.input.value === "" ? null : Number(salt.input.value),
    });
    if (r.error) { oComp.textContent = r.error; for (const o of [oLoad, oDays, oSalt]) o.textContent = "-"; return; }
    oComp.textContent = fmt(r.comp_hardness, 1) + " gpg (" + fmt(r.daily_gal, 0) + " gal/day)";
    oLoad.textContent = fmt(r.grain_load, 0) + " grains/day";
    oDays.textContent = r.days_between + " days" + (r.undersized ? " (regenerates daily - undersized)" : "");
    oSalt.textContent = fmt(r.salt_per_regen, 1) + " lb/regen, " + fmt(r.annual_salt, 0) + " lb/yr";
  }, DEBOUNCE_MS);
  for (const el of [people.input, use.input, hardness.input, iron.input, cap.input, salt.input]) el.addEventListener("input", update);
}
SERVICE_RENDERERS["softener-sizing"] = renderSoftenerSizing;

// =====================================================================
// spec-v167..v169 - Group A: dwelling demand-factor trio (NEC 220.xx).
// =====================================================================

// NEC Table 220.55 Column C demand (kW) for equal-rated household ranges,
// indexed by range count (1..). Past the bundled count, the table's
// published continuation governs; the AHJ decides large counts.
const _RANGE_COL_C_KW = {
  1: 8, 2: 11, 3: 14, 4: 17, 5: 20, 6: 21, 7: 22, 8: 23, 9: 24, 10: 25,
  11: 26, 12: 27, 13: 28, 14: 29, 15: 30, 16: 31,
};

// dims: in { num_ranges: dimensionless, nameplate_kw: dimensionless, supply_v: M L^2 T^-3 I^-1 } out: { col_c_kw: dimensionless, demand_kw: dimensionless, demand_a: I }
export function computeRangeDemand22055({ num_ranges = 1, nameplate_kw = 0, supply_v = 240 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Math.round(Number(num_ranges) || 0);
  const kw = Number(nameplate_kw) || 0;
  const v = Number(supply_v) || 0;
  if (!(kw > 0)) return { error: "Range nameplate rating must be positive (kW)." };
  if (!(n >= 1)) return { error: "Number of ranges must be at least 1." };
  if (!(v > 0)) return { error: "Service voltage must be positive (V)." };

  const maxCount = 16;
  const col_c_kw = n <= maxCount ? _RANGE_COL_C_KW[n] : _RANGE_COL_C_KW[maxCount];
  const over_table = n > maxCount;
  // Note 1: ranges over 12 kW add 5% to Column C per kW (or major fraction) over 12.
  const increase = kw > 12 ? Math.ceil(kw - 12) * 0.05 : 0;
  const demand_kw = col_c_kw * (1 + increase);
  const demand_a = demand_kw * 1000 / v;
  return {
    col_c_kw,
    increase_pct: increase * 100,
    demand_kw: Number.isFinite(demand_kw) ? demand_kw : null,
    demand_a: Number.isFinite(demand_a) ? demand_a : null,
    over_table,
    note: "NEC Table 220.55 Column C (equal-rating ranges 8.75-27 kW). Note 1: a range over 12 kW adds 5% to Column C per kW (or major fraction) above 12 kW. This is the common equal-rating Column C path; Notes 2-4 (the under-3.5 kW and 3.5-8.75 kW Columns A/B, and unequal-rating averaging) and the AHJ govern the other cases." + (over_table ? " Range count exceeds the bundled table; the published Column C continuation governs." : ""),
  };
}
export const rangeDemand22055Example = { inputs: { num_ranges: 1, nameplate_kw: 12, supply_v: 240 } };

function _v167renderRangeDemand(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Table 220.55 Column C and its Notes (household electric ranges, wall ovens, counter cooktops). One 12 kW range demands 8 kW, not 12; a range over 12 kW gets a 5%-per-kW Column C increase (Note 1). The AHJ-adopted edition governs. Free at nfpa.org/freeaccess.";
  const n = makeNumber("Number of ranges (equal rating)", "rd-n", { step: "1", min: "1", value: "1" });
  n.input.value = "1";
  const kw = makeNumber("Each range nameplate (kW)", "rd-kw", { step: "any", min: "0", value: "12" });
  kw.input.value = "12";
  const v = makeNumber("Service voltage (V)", "rd-v", { step: "any", min: "0", value: "240" });
  v.input.value = "240";
  for (const f of [n, kw, v]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n.input.value = "1"; kw.input.value = "12"; v.input.value = "240"; update(); });

  const oCol = makeOutputLine(outputRegion, "Column C demand (kW)", "rd-out-col");
  const oDemand = makeOutputLine(outputRegion, "Demand load", "rd-out-demand");
  const oNote = makeOutputLine(outputRegion, "Note", "rd-out-note");
  const update = debounce(() => {
    const r = computeRangeDemand22055({ num_ranges: Number(n.input.value) || 0, nameplate_kw: Number(kw.input.value) || 0, supply_v: Number(v.input.value) || 0 });
    if (r.error) { oCol.textContent = r.error; oDemand.textContent = "-"; oNote.textContent = ""; return; }
    oCol.textContent = fmt(r.col_c_kw, 0) + " kW" + (r.increase_pct > 0 ? " (+" + fmt(r.increase_pct, 0) + "% over-12 kW adder)" : "");
    oDemand.textContent = fmt(r.demand_kw, 2) + " kW = " + fmt(r.demand_a, 1) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n.input, kw.input, v.input]) f.addEventListener("input", update);
}
SERVICE_RENDERERS["range-demand-220-55"] = _v167renderRangeDemand;

// Table 220.54 demand factors for household electric clothes dryers, by count.
const _DRYER_DEMAND_FACTOR = {
  1: 1.00, 2: 1.00, 3: 1.00, 4: 1.00, 5: 0.85, 6: 0.75, 7: 0.65, 8: 0.60,
  9: 0.55, 10: 0.50, 11: 0.47, 12: 0.45, 13: 0.43, 14: 0.41, 15: 0.40,
};

// dims: in { num_dryers: dimensionless, nameplate_w: M L^2 T^-3, supply_v: M L^2 T^-3 I^-1 } out: { per_dryer_w: M L^2 T^-3, demand_w: M L^2 T^-3, demand_a: I }
export function computeDryerDemand22054({ num_dryers = 1, nameplate_w = 5000, supply_v = 240 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Math.round(Number(num_dryers) || 0);
  const w = Number(nameplate_w) || 0;
  const v = Number(supply_v) || 0;
  if (!(w > 0)) return { error: "Dryer nameplate rating must be positive (W)." };
  if (!(n >= 1)) return { error: "Number of dryers must be at least 1." };
  if (!(v > 0)) return { error: "Service voltage must be positive (V)." };

  const per_dryer_w = Math.max(w, 5000);          // 220.54: 5000 W or nameplate, larger
  const connected_w = per_dryer_w * n;
  const maxCount = 15;
  // Past the bundled table the standard's continuation declines further; the
  // 15-dryer 40% factor is held as a conservative floor for larger counts.
  const demand_factor = n <= maxCount ? _DRYER_DEMAND_FACTOR[n] : _DRYER_DEMAND_FACTOR[maxCount];
  const over_table = n > maxCount;
  const demand_w = connected_w * demand_factor;
  const demand_a = demand_w / v;
  return {
    per_dryer_w,
    connected_w,
    demand_factor,
    demand_w: Number.isFinite(demand_w) ? demand_w : null,
    demand_a: Number.isFinite(demand_a) ? demand_a : null,
    over_table,
    note: "NEC 220.54 and Table 220.54: each dryer counts at the larger of 5,000 W or its nameplate; the demand factor is 100% for 1-4 dryers, then declines (5 -> 85%, 6 -> 75%, ...). Past the bundled table the published continuation governs; the AHJ decides large counts." + (over_table ? " Dryer count exceeds the bundled table; the 40% floor is applied." : ""),
  };
}
export const dryerDemand22054Example = { inputs: { num_dryers: 4, nameplate_w: 4500, supply_v: 240 } };

function _v168renderDryerDemand(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 220.54 and Table 220.54 (household electric clothes dryers). Each dryer counts at the larger of 5,000 W or nameplate; the Table 220.54 demand factor applies once there are five or more. The AHJ-adopted edition governs. Free at nfpa.org/freeaccess.";
  const n = makeNumber("Number of dryers", "dd-n", { step: "1", min: "1", value: "4" });
  n.input.value = "4";
  const w = makeNumber("Each dryer nameplate (W)", "dd-w", { step: "any", min: "0", value: "4500" });
  w.input.value = "4500";
  const v = makeNumber("Service voltage (V)", "dd-v", { step: "any", min: "0", value: "240" });
  v.input.value = "240";
  for (const f of [n, w, v]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n.input.value = "4"; w.input.value = "4500"; v.input.value = "240"; update(); });

  const oPer = makeOutputLine(outputRegion, "Per-dryer load (5000 W floor)", "dd-out-per");
  const oFactor = makeOutputLine(outputRegion, "Demand factor", "dd-out-factor");
  const oDemand = makeOutputLine(outputRegion, "Demand load", "dd-out-demand");
  const oNote = makeOutputLine(outputRegion, "Note", "dd-out-note");
  const update = debounce(() => {
    const r = computeDryerDemand22054({ num_dryers: Number(n.input.value) || 0, nameplate_w: Number(w.input.value) || 0, supply_v: Number(v.input.value) || 0 });
    if (r.error) { oPer.textContent = r.error; oFactor.textContent = "-"; oDemand.textContent = "-"; oNote.textContent = ""; return; }
    oPer.textContent = fmt(r.per_dryer_w, 0) + " W x " + Math.round(r.connected_w / r.per_dryer_w) + " = " + fmt(r.connected_w, 0) + " W connected";
    oFactor.textContent = fmt(r.demand_factor * 100, 0) + "%";
    oDemand.textContent = fmt(r.demand_w, 0) + " W = " + fmt(r.demand_a, 1) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n.input, w.input, v.input]) f.addEventListener("input", update);
}
SERVICE_RENDERERS["dryer-demand-220-54"] = _v168renderDryerDemand;

// dims: in { max_unbalanced_a: I, nonlinear_excluded: dimensionless } out: { neutral_demand_a: I, first_200_a: I, excess_a: I }
export function computeNeutralDemand22061({ max_unbalanced_a = 0, nonlinear_excluded = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(max_unbalanced_a) || 0;
  const excluded = Number(nonlinear_excluded) ? 1 : 0;
  if (load < 0) return { error: "Maximum unbalanced load must be non-negative (A)." };

  let neutral_demand_a, first_200_a, excess_a;
  if (excluded) {
    first_200_a = load;
    excess_a = 0;
    neutral_demand_a = load;                      // 220.61(C): no reduction permitted
  } else {
    first_200_a = Math.min(load, 200);            // first 200 A at 100%
    excess_a = Math.max(load - 200, 0);           // portion over 200 A at 70%
    neutral_demand_a = first_200_a + 0.70 * excess_a;
  }
  return {
    neutral_demand_a: Number.isFinite(neutral_demand_a) ? neutral_demand_a : null,
    first_200_a,
    excess_a,
    nonlinear_excluded: !!excluded,
    note: excluded
      ? "NEC 220.61(C): the unbalanced load is nonlinear (electric-discharge lighting, data/electronic loads), so NO 70% reduction is permitted - the neutral carries the full unbalanced load."
      : "NEC 220.61(B)(1): the neutral carries the maximum unbalanced load; the first 200 A at 100%, the portion over 200 A at 70%. 220.61(C) prohibits the reduction for nonlinear-load portions (set the load type to nonlinear). The AHJ and the load classification govern.",
  };
}
export const neutralDemand22061Example = { inputs: { max_unbalanced_a: 250, nonlinear_excluded: 0 } };

function _v169renderNeutralDemand(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 220.61 (feeder and service neutral load). The neutral carries the maximum unbalanced load; 220.61(B) permits 70% on the portion over 200 A, and 220.61(C) prohibits any reduction for nonlinear-load portions. The AHJ governs. Free at nfpa.org/freeaccess.";
  const load = makeNumber("Maximum unbalanced load (A)", "nd-load", { step: "any", min: "0", value: "250" });
  load.input.value = "250";
  const excl = makeSelect("Load type", "nd-excl", [
    { value: "0", label: "Ordinary (70% on the part over 200 A)" },
    { value: "1", label: "Nonlinear (220.61(C) - no reduction)" },
  ]);
  for (const f of [load, excl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "250"; excl.select.value = "0"; update(); });

  const oFirst = makeOutputLine(outputRegion, "First 200 A / excess split", "nd-out-first");
  const oDemand = makeOutputLine(outputRegion, "Neutral demand (A)", "nd-out-demand");
  const oNote = makeOutputLine(outputRegion, "Note", "nd-out-note");
  const update = debounce(() => {
    const r = computeNeutralDemand22061({ max_unbalanced_a: Number(load.input.value) || 0, nonlinear_excluded: Number(excl.select.value) });
    if (r.error) { oFirst.textContent = r.error; oDemand.textContent = "-"; oNote.textContent = ""; return; }
    oFirst.textContent = r.nonlinear_excluded ? "(no reduction - full load)" : fmt(r.first_200_a, 0) + " A at 100% + " + fmt(r.excess_a, 0) + " A at 70%";
    oDemand.textContent = fmt(r.neutral_demand_a, 1) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  load.input.addEventListener("input", update);
  excl.select.addEventListener("input", update);
}
SERVICE_RENDERERS["neutral-demand-220-61"] = _v169renderNeutralDemand;

// =====================================================================
// spec-v180 - Group A: Electrical (1 tile)
// Commercial general-lighting + receptacle demand (NEC 220.12 / 220.14(I)
// / 220.44).
// =====================================================================

// dims: in { floor_area_ft2: L^2, unit_load_va_ft2: dimensionless, receptacle_count: dimensionless, supply_v: dimensionless } out: { lighting_va: dimensionless, recep_va: dimensionless, recep_demand_va: dimensionless, total_va: dimensionless, total_a: I }
export function computeCommercialLightingLoad({ floor_area_ft2 = 0, unit_load_va_ft2 = 0, receptacle_count = 0, supply_v = 208 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(floor_area_ft2) || 0;
  if (!(area >= 0)) return { error: "Floor area must be non-negative (ft^2)." };
  const unit = Number(unit_load_va_ft2) || 0;
  if (!(unit >= 0)) return { error: "Unit load must be non-negative (VA/ft^2)." };
  const count = Number(receptacle_count) || 0;
  if (!(count >= 0)) return { error: "Receptacle count must be non-negative." };
  const v = Number(supply_v) || 0;
  if (!(v > 0)) return { error: "Supply voltage must be positive (V)." };
  const lighting_va = area * unit;
  const recep_va = count * 180;
  // NEC 220.44: receptacle load >10 kVA is 100% of the first 10 kVA + 50% of
  // the remainder.
  const recep_demand_va = recep_va <= 10000 ? recep_va : 10000 + 0.50 * (recep_va - 10000);
  const total_va = lighting_va + recep_demand_va;
  const total_a = total_va / v;
  return {
    lighting_va,
    recep_va,
    recep_demand_va,
    total_va,
    total_a,
    note: "NEC 220.12 sets the general-lighting unit load by occupancy (Table 220.12); 220.14(I) counts each general-use receptacle strap at 180 VA; 220.44 applies a 100%/50% demand to the receptacle load above 10 kVA. The continuous-lighting 125% factor (210.20(A)) is applied at the OCPD, not here, and the energy code may set the lighting unit load. The AHJ governs.",
  };
}
export const commercialLightingLoadExample = { inputs: { floor_area_ft2: 5000, unit_load_va_ft2: 3, receptacle_count: 60, supply_v: 208 } };

function _v180renderCommercialLightingLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Table 220.12 (general-lighting unit load), 220.14(I) (180 VA per receptacle strap), and 220.44 (receptacle demand factor over 10 kVA). The 125% continuous factor is applied at the OCPD; the energy code may set the lighting load. The AHJ governs. Free at nfpa.org/freeaccess.";
  const area = makeNumber("Gross floor area (ft^2)", "cll-area", { step: "any", min: "0", value: "5000" });
  area.input.value = "5000";
  const unit = makeNumber("Unit load (VA/ft^2, Table 220.12)", "cll-unit", { step: "any", min: "0", value: "3" });
  unit.input.value = "3";
  const count = makeNumber("General-use receptacle straps", "cll-count", { step: "1", min: "0", value: "60" });
  count.input.value = "60";
  const volt = makeNumber("Supply voltage (V)", "cll-v", { step: "any", min: "0", value: "208" });
  volt.input.value = "208";
  for (const f of [area, unit, count, volt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "5000"; unit.input.value = "3"; count.input.value = "60"; volt.input.value = "208"; update(); });

  const oLight = makeOutputLine(outputRegion, "Lighting load (VA)", "cll-out-light");
  const oRecep = makeOutputLine(outputRegion, "Receptacle connected (VA)", "cll-out-recep");
  const oDemand = makeOutputLine(outputRegion, "Receptacle demand (220.44)", "cll-out-demand");
  const oTotal = makeOutputLine(outputRegion, "Total demand (VA)", "cll-out-total");
  const oAmps = makeOutputLine(outputRegion, "Total current (A)", "cll-out-amps");
  const oNote = makeOutputLine(outputRegion, "Note", "cll-out-note");

  const update = debounce(() => {
    const r = computeCommercialLightingLoad({
      floor_area_ft2: Number(area.input.value) || 0, unit_load_va_ft2: Number(unit.input.value) || 0,
      receptacle_count: Number(count.input.value) || 0, supply_v: Number(volt.input.value) || 0,
    });
    if (r.error) { oLight.textContent = r.error; oRecep.textContent = "-"; oDemand.textContent = "-"; oTotal.textContent = "-"; oAmps.textContent = "-"; oNote.textContent = ""; return; }
    oLight.textContent = fmt(r.lighting_va, 0) + " VA";
    oRecep.textContent = fmt(r.recep_va, 0) + " VA";
    oDemand.textContent = fmt(r.recep_demand_va, 0) + " VA";
    oTotal.textContent = fmt(r.total_va, 0) + " VA";
    oAmps.textContent = fmt(r.total_a, 1) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [area, unit, count, volt]) f.input.addEventListener("input", update);
}
SERVICE_RENDERERS["commercial-lighting-load"] = _v180renderCommercialLightingLoad;

// =====================================================================
// spec-v181 - Group A: Electrical (1 tile)
// Noncoincident loads: larger of heating vs air-conditioning (NEC 220.60).
// =====================================================================

// dims: in { load_a_va: dimensionless, load_b_va: dimensionless, both_can_run: dimensionless } out: { counted_va: dimensionless, omitted_va: dimensionless }
export function computeNoncoincidentLoad({ load_a_va = 0, load_b_va = 0, both_can_run = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = Number(load_a_va) || 0;
  const b = Number(load_b_va) || 0;
  if (a < 0 || b < 0) return { error: "Loads must be non-negative (VA)." };
  const both = (Number(both_can_run) || 0) === 1;
  const counted_va = both ? a + b : Math.max(a, b);
  const omitted_va = both ? 0 : Math.min(a, b);
  return {
    counted_va,
    omitted_va,
    both_can_run: both,
    note: both
      ? "NEC 220.60 exception: the two loads operate simultaneously (e.g. a heat-pump compressor with supplemental strip heat that energizes with it), so both are counted -- nothing is omitted."
      : "NEC 220.60: where two loads are unlikely to operate at the same time (electric heat vs air-conditioning), the service calc carries only the larger and omits the smaller. The AHJ judges noncoincidence; set both-can-run when the loads are coincident.",
  };
}
export const noncoincidentLoadExample = { inputs: { load_a_va: 9000, load_b_va: 6000, both_can_run: 0 } };

function _v181renderNoncoincidentLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 220.60 (noncoincident loads) - where two loads are unlikely to be in use at the same time, the larger is counted and the smaller omitted; the exception adds both where they operate simultaneously. The AHJ judges noncoincidence. Free at nfpa.org/freeaccess.";
  const a = makeNumber("Load A - e.g. electric heat (VA)", "ncl-a", { step: "any", min: "0", value: "9000" });
  a.input.value = "9000";
  const b = makeNumber("Load B - e.g. air-conditioning (VA)", "ncl-b", { step: "any", min: "0", value: "6000" });
  b.input.value = "6000";
  const both = makeSelect("Can both run at the same time?", "ncl-both", [
    { value: "0", label: "No - noncoincident (count the larger)" },
    { value: "1", label: "Yes - simultaneous (add both, exception)" },
  ]);
  for (const f of [a, b, both]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "9000"; b.input.value = "6000"; both.select.value = "0"; update(); });

  const oCounted = makeOutputLine(outputRegion, "Counted load (VA)", "ncl-out-counted");
  const oOmitted = makeOutputLine(outputRegion, "Omitted load (VA)", "ncl-out-omitted");
  const oNote = makeOutputLine(outputRegion, "Note", "ncl-out-note");

  const update = debounce(() => {
    const r = computeNoncoincidentLoad({ load_a_va: Number(a.input.value) || 0, load_b_va: Number(b.input.value) || 0, both_can_run: Number(both.select.value) || 0 });
    if (r.error) { oCounted.textContent = r.error; oOmitted.textContent = "-"; oNote.textContent = ""; return; }
    oCounted.textContent = fmt(r.counted_va, 0) + " VA";
    oOmitted.textContent = fmt(r.omitted_va, 0) + " VA";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [a.input, b.input, both.select]) el.addEventListener("input", update);
}
SERVICE_RENDERERS["noncoincident-load"] = _v181renderNoncoincidentLoad;
