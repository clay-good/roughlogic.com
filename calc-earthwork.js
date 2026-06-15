// =====================================================================
// calc-earthwork.js - spec-v70 cap-relief split (extracted from
// calc-construction.js, which sat at 97.6% of its 70 KB gzip cap).
//
// Holds the spec-v67 earthwork / excavation production bench (Group E):
//   - soil-swell-shrink       Bank / loose / compacted volume conversion
//   - haul-cycle-production   Truck/loader haul-cycle production + fleet match
//   - dewatering-rate         Excavation dewatering pump rate
//   - spoil-setback           Spoil pile setback and surcharge (OSHA 1926.651)
//   - pipe-bedding-backfill   Trench bedding / embedment / backfill (ASTM D2321)
//
// Group letters are independent of the module (the spec-v28/v30/v36/v39
// precedent): all five KEEP group "E"; only the on-disk module changes.
// No tile is added or removed and no calculator output changes - this is a
// housekeeping relocation that restores headroom to calc-construction.js so
// the active Group E bench can keep growing. Pure exported compute functions
// plus their renderers and the EARTHWORK_RENDERERS map, mirroring every other
// calc-*.js module (the calc-metalair.js / calc-fab.js pattern).
// =====================================================================

import {
  DEBOUNCE_MS, debounce, makeNumber, makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard (copied from calc-construction.js; non-exported, so
// it adds no v14 derivation-corpus row). Rejects a non-finite numeric input
// so a solver returns {error} rather than leaking a non-finite output field.
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

export const EARTHWORK_RENDERERS = {};

// --- soil-swell-shrink: Bank / Loose / Compacted Volume Conversion ---
//
// loose = bank x (1 + swell/100); load_factor = 1/(1+swell/100);
// compacted = bank x (1 - shrink/100); fill_shortage = bank - compacted.
// dims: in { bank_cy: L^3, swell_pct: dimensionless, shrink_pct: dimensionless } out: { loose_cy: L^3, load_factor: dimensionless, compacted_cy: L^3, fill_shortage_cy: L^3 }
// (Bank volume is L^3; swell and shrinkage are dimensionless percents; the
//  loose, compacted, and shortfall volumes are L^3 and the load factor dimensionless.)
export function computeSoilSwellShrink({ bank_cy, swell_pct = 25, shrink_pct = 15 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bank = Number(bank_cy);
  const swell = Number(swell_pct);
  const shrink = Number(shrink_pct);
  if (!Number.isFinite(bank) || bank <= 0) return { error: "Bank volume must be a positive finite number (cy)." };
  if (!Number.isFinite(swell) || swell < 0) return { error: "Swell must be a non-negative finite percent." };
  if (!Number.isFinite(shrink) || shrink < 0 || shrink >= 100) return { error: "Shrinkage must be between 0 and 100 percent." };
  const looseCy = bank * (1 + swell / 100);
  const loadFactor = 1 / (1 + swell / 100);
  const compactedCy = bank * (1 - shrink / 100);
  const fillShortageCy = bank - compactedCy;
  const borrowPerCompacted = 1 / (1 - shrink / 100);
  if (![looseCy, loadFactor, compactedCy, fillShortageCy, borrowPerCompacted].every(Number.isFinite)) return { error: "Volume conversion is not a finite value." };
  return {
    loose_cy: looseCy,
    load_factor: loadFactor,
    compacted_cy: compactedCy,
    fill_shortage_cy: fillShortageCy,
    borrow_per_compacted: borrowPerCompacted,
    note: "Swell and shrinkage are soil properties from the geotech report or a published table, not constants - wet clay, dry sand, and shot rock differ widely. The load factor converts a loose truck ticket back to bank yards for earned-quantity payment. Compaction to a spec (percent of a Proctor maximum) is verified in the field, not assumed.",
  };
}

function _v67renderSoilSwellShrink(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Caterpillar Performance Handbook soil-conversion method (swell / shrinkage / load factor) by name. loose = bank x (1 + swell/100); compacted = bank x (1 - shrink/100). The geotech report governs the percentages.";
  const bank = makeNumber("Bank (in-place) volume (cy)", "ss-bank", { step: "any", min: "0" });
  const swell = makeNumber("Swell when excavated (%)", "ss-swell", { step: "any", min: "0", value: "25" });
  swell.input.value = "25";
  const shrink = makeNumber("Shrinkage when compacted (%)", "ss-shrink", { step: "any", min: "0", value: "15" });
  shrink.input.value = "15";
  for (const f of [bank, swell, shrink]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bank.input.value = "100"; swell.input.value = "25"; shrink.input.value = "15"; update(); });
  const oLoose = makeOutputLine(outputRegion, "Loose (truck / stockpile) volume", "ss-out-loose");
  const oLf = makeOutputLine(outputRegion, "Load factor (bank per loose)", "ss-out-lf");
  const oComp = makeOutputLine(outputRegion, "Compacted (placed) volume", "ss-out-comp");
  const oShort = makeOutputLine(outputRegion, "Bank-to-compacted shortfall", "ss-out-short");
  const update = debounce(() => {
    const r = computeSoilSwellShrink({ bank_cy: Number(bank.input.value) || 0, swell_pct: swell.input.value === "" ? 25 : Number(swell.input.value), shrink_pct: shrink.input.value === "" ? 15 : Number(shrink.input.value) });
    if (r.error) { oLoose.textContent = r.error; for (const o of [oLf, oComp, oShort]) o.textContent = "-"; return; }
    oLoose.textContent = fmt(r.loose_cy, 1) + " cy";
    oLf.textContent = fmt(r.load_factor, 3);
    oComp.textContent = fmt(r.compacted_cy, 1) + " cy";
    oShort.textContent = fmt(r.fill_shortage_cy, 1) + " cy (borrow " + fmt(r.borrow_per_compacted, 3) + "x compacted)";
  }, DEBOUNCE_MS);
  for (const f of [bank, swell, shrink]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["soil-swell-shrink"] = _v67renderSoilSwellShrink;

// --- haul-cycle-production: Truck/Loader Haul-Cycle Production and Fleet Match ---
//
// cycle = load + haul + dump + return + spot; loads/hr = eff_min / cycle;
// production = cap x loads/hr; trucks = ceil(cycle / load); fleet = production x trucks.
// dims: in { truck_cap_lcy: L^3, load_min: T, haul_min: T, dump_min: T, return_min: T, spot_min: T, eff_min_per_hr: T } out: { cycle_min: T, loads_per_hour: dimensionless, production_lcy_hr: L^3 T^-1, trucks_to_match: dimensionless, fleet_production_lcy_hr: L^3 T^-1 }
// (Truck capacity is L^3; every time is T; production is a volume-rate L^3 T^-1
//  and the loads-per-hour and truck count are dimensionless.)
export function computeHaulCycleProduction({ truck_cap_lcy, load_min, haul_min = 0, dump_min = 0, return_min = 0, spot_min = 0.5, eff_min_per_hr = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cap = Number(truck_cap_lcy);
  const load = Number(load_min);
  const haul = Number(haul_min) || 0;
  const dump = Number(dump_min) || 0;
  const ret = Number(return_min) || 0;
  const spot = Number(spot_min);
  const eff = Number(eff_min_per_hr);
  if (!Number.isFinite(cap) || cap <= 0) return { error: "Truck capacity must be a positive finite number (lcy)." };
  if (!Number.isFinite(load) || load <= 0) return { error: "Load time must be a positive finite number (min)." };
  for (const [v, n] of [[haul, "Haul"], [dump, "Dump"], [ret, "Return"], [spot, "Spot"]]) {
    if (!Number.isFinite(v) || v < 0) return { error: n + " time must be a non-negative finite number (min)." };
  }
  if (!Number.isFinite(eff) || eff <= 0) return { error: "Working minutes per hour must be a positive finite number." };
  const cycleMin = load + haul + dump + ret + spot;
  const loadsPerHour = eff / cycleMin;
  const productionLcyHr = cap * loadsPerHour;
  const trucksToMatch = Math.ceil(cycleMin / load);
  const fleetProductionLcyHr = productionLcyHr * trucksToMatch;
  if (![cycleMin, loadsPerHour, productionLcyHr, trucksToMatch, fleetProductionLcyHr].every(Number.isFinite)) return { error: "Production math is not a finite value." };
  return {
    cycle_min: cycleMin,
    loads_per_hour: loadsPerHour,
    production_lcy_hr: productionLcyHr,
    trucks_to_match: trucksToMatch,
    fleet_production_lcy_hr: fleetProductionLcyHr,
    note: "The 50-minute hour accounts for real-world delays and is a planning default, not a guarantee. Haul and return times grow with distance, grade, and traffic - they are the variable that moves the answer. The matched count keeps the loader (the expensive machine) working: one truck short idles the loader, one over queues the trucks. Convert the loose production back to bank yards with soil-swell-shrink for earned quantity.",
  };
}

function _v67renderHaulCycleProduction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Caterpillar Performance Handbook cycle-time production method by name. cycle = load + haul + dump + return + spot; loads/hr = working minutes / cycle; trucks = ceil(cycle / load time).";
  const cap = makeNumber("Truck capacity (loose cy)", "hc-cap", { step: "any", min: "0" });
  const load = makeNumber("Loader fill time (min)", "hc-load", { step: "any", min: "0" });
  const haul = makeNumber("Loaded haul time (min)", "hc-haul", { step: "any", min: "0" });
  const dump = makeNumber("Dump / maneuver time (min)", "hc-dump", { step: "any", min: "0" });
  const ret = makeNumber("Empty return time (min)", "hc-return", { step: "any", min: "0" });
  const spot = makeNumber("Spot time (min)", "hc-spot", { step: "any", min: "0", value: "0.5" });
  spot.input.value = "0.5";
  const eff = makeNumber("Working minutes per hour", "hc-eff", { step: "any", min: "0", value: "50" });
  eff.input.value = "50";
  for (const f of [cap, load, haul, dump, ret, spot, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "12"; load.input.value = "2.0"; haul.input.value = "8.0"; dump.input.value = "1.5"; ret.input.value = "6.0"; spot.input.value = "0.5"; eff.input.value = "50"; update(); });
  const oCycle = makeOutputLine(outputRegion, "Cycle time", "hc-out-cycle");
  const oProd = makeOutputLine(outputRegion, "Production per truck", "hc-out-prod");
  const oTrucks = makeOutputLine(outputRegion, "Trucks to match the loader", "hc-out-trucks");
  const oFleet = makeOutputLine(outputRegion, "Matched fleet production", "hc-out-fleet");
  const update = debounce(() => {
    const r = computeHaulCycleProduction({
      truck_cap_lcy: Number(cap.input.value) || 0, load_min: Number(load.input.value) || 0,
      haul_min: Number(haul.input.value) || 0, dump_min: Number(dump.input.value) || 0,
      return_min: Number(ret.input.value) || 0, spot_min: spot.input.value === "" ? 0.5 : Number(spot.input.value),
      eff_min_per_hr: eff.input.value === "" ? 50 : Number(eff.input.value),
    });
    if (r.error) { oCycle.textContent = r.error; for (const o of [oProd, oTrucks, oFleet]) o.textContent = "-"; return; }
    oCycle.textContent = fmt(r.cycle_min, 1) + " min (" + fmt(r.loads_per_hour, 2) + " loads/hr)";
    oProd.textContent = fmt(r.production_lcy_hr, 1) + " lcy/hr";
    oTrucks.textContent = r.trucks_to_match + " trucks";
    oFleet.textContent = fmt(r.fleet_production_lcy_hr, 0) + " lcy/hr";
  }, DEBOUNCE_MS);
  for (const f of [cap, load, haul, dump, ret, spot, eff]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["haul-cycle-production"] = _v67renderHaulCycleProduction;

// --- dewatering-rate: Excavation Dewatering Pump Rate ---
//
// drawdown_gal = L x W x H x 7.48052; pump = drawdown_gal/drawdown_min + inflow;
// sized = pump x (1 + safety/100).
// dims: in { pit_len_ft: L, pit_wid_ft: L, drawdown_ft: L, drawdown_min: T, inflow_gpm: L^3 T^-1, safety_pct: dimensionless } out: { drawdown_gal: L^3, pump_gpm: L^3 T^-1, sized_gpm: L^3 T^-1 }
// (Pit dimensions are lengths L; the 7.48052 gal/ft^3 constant gives the volume
//  L^3; inflow and the pump rates are volume-rates L^3 T^-1.)
export function computeDewateringRate({ pit_len_ft, pit_wid_ft, drawdown_ft = 0, drawdown_min, inflow_gpm = 0, safety_pct = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const len = Number(pit_len_ft);
  const wid = Number(pit_wid_ft);
  const draw = Number(drawdown_ft);
  const drawMin = Number(drawdown_min);
  const inflow = Number(inflow_gpm) || 0;
  const safety = Number(safety_pct);
  if (!Number.isFinite(len) || len <= 0) return { error: "Pit length must be a positive finite number (ft)." };
  if (!Number.isFinite(wid) || wid <= 0) return { error: "Pit width must be a positive finite number (ft)." };
  if (!Number.isFinite(draw) || draw < 0) return { error: "Drawdown depth must be a non-negative finite number (ft)." };
  if (!Number.isFinite(drawMin) || drawMin <= 0) return { error: "Drawdown time must be a positive finite number (min)." };
  if (!Number.isFinite(inflow) || inflow < 0) return { error: "Inflow must be a non-negative finite number (gpm)." };
  if (!Number.isFinite(safety) || safety < 0) return { error: "Safety margin must be a non-negative finite percent." };
  const drawdownGal = len * wid * draw * 7.48052;
  const pumpGpm = drawdownGal / drawMin + inflow;
  const sizedGpm = pumpGpm * (1 + safety / 100);
  if (![drawdownGal, pumpGpm, sizedGpm].every(Number.isFinite)) return { error: "Dewatering math is not a finite value." };
  return {
    drawdown_gal: drawdownGal,
    pump_gpm: pumpGpm,
    sized_gpm: sizedGpm,
    note: "7.48 gallons per cubic foot is exact. The inflow is the number that actually matters and must be estimated from the soil, head, and a pumping test, not guessed. Discharge water is managed for sediment and permitted discharge, not run into the storm drain. Dewatering changes effective stress and can destabilize the wall and adjacent foundations - a competent-person and engineering call. The pump's total dynamic head (pump-tdh) sets the model; this tile sets the flow.",
  };
}

function _v67renderDewateringRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles volume / pumping rate by name. drawdown gallons = length x width x depth x 7.48052; pump = drawdown / time + inflow; sized = pump x (1 + margin). The inflow must be estimated from a pumping test.";
  const len = makeNumber("Pit length at water surface (ft)", "dw-len", { step: "any", min: "0" });
  const wid = makeNumber("Pit width at water surface (ft)", "dw-wid", { step: "any", min: "0" });
  const draw = makeNumber("Drawdown depth (ft)", "dw-draw", { step: "any", min: "0" });
  const drawMin = makeNumber("Time to draw down (min)", "dw-min", { step: "any", min: "0" });
  const inflow = makeNumber("Steady inflow / seepage (gpm)", "dw-inflow", { step: "any", min: "0", value: "0" });
  inflow.input.value = "0";
  const safety = makeNumber("Pump-sizing margin (%)", "dw-safety", { step: "any", min: "0", value: "25" });
  safety.input.value = "25";
  for (const f of [len, wid, draw, drawMin, inflow, safety]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { len.input.value = "20"; wid.input.value = "12"; draw.input.value = "3"; drawMin.input.value = "30"; inflow.input.value = "40"; safety.input.value = "25"; update(); });
  const oGal = makeOutputLine(outputRegion, "Gallons to remove", "dw-out-gal");
  const oPump = makeOutputLine(outputRegion, "Pump rate (draw down + hold)", "dw-out-pump");
  const oSized = makeOutputLine(outputRegion, "Safety-sized pump rate", "dw-out-sized");
  const update = debounce(() => {
    const r = computeDewateringRate({
      pit_len_ft: Number(len.input.value) || 0, pit_wid_ft: Number(wid.input.value) || 0,
      drawdown_ft: Number(draw.input.value) || 0, drawdown_min: Number(drawMin.input.value) || 0,
      inflow_gpm: inflow.input.value === "" ? 0 : Number(inflow.input.value), safety_pct: safety.input.value === "" ? 25 : Number(safety.input.value),
    });
    if (r.error) { oGal.textContent = r.error; oPump.textContent = "-"; oSized.textContent = "-"; return; }
    oGal.textContent = fmt(r.drawdown_gal, 0) + " gal";
    oPump.textContent = fmt(r.pump_gpm, 1) + " gpm";
    oSized.textContent = fmt(r.sized_gpm, 1) + " gpm";
  }, DEBOUNCE_MS);
  for (const f of [len, wid, draw, drawMin, inflow, safety]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["dewatering-rate"] = _v67renderDewateringRate;

// --- spoil-setback: Spoil Pile Setback and Surcharge ---
//
// base_halfwidth = spoil_height / tan(repose); setback = max(min_setback,
// trench_depth); total_clear = setback + base_halfwidth.
// dims: in { trench_depth_ft: L, spoil_height_ft: L, repose_deg: dimensionless, min_setback_ft: L } out: { base_halfwidth_ft: L, setback_ft: L, total_clear_ft: L }
// (Trench depth, spoil height, setback, and clear distance are lengths L; the
//  angle of repose is dimensionless.)
export function computeSpoilSetback({ trench_depth_ft, spoil_height_ft, repose_deg = 34, min_setback_ft = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const depth = Number(trench_depth_ft);
  const height = Number(spoil_height_ft);
  const repose = Number(repose_deg);
  const minSetback = Number(min_setback_ft);
  if (!Number.isFinite(depth) || depth <= 0) return { error: "Trench depth must be a positive finite number (ft)." };
  if (!Number.isFinite(height) || height <= 0) return { error: "Spoil height must be a positive finite number (ft)." };
  if (!Number.isFinite(repose) || repose <= 0 || repose >= 90) return { error: "Angle of repose must be between 0 and 90 degrees." };
  if (!Number.isFinite(minSetback) || minSetback < 0) return { error: "Minimum setback must be a non-negative finite number (ft)." };
  const baseHalfwidth = height / Math.tan(repose * Math.PI / 180);
  const surchargeSetback = depth;
  const setback = Math.max(minSetback, surchargeSetback);
  const totalClear = setback + baseHalfwidth;
  if (![baseHalfwidth, setback, totalClear].every(Number.isFinite)) return { error: "Setback math is not a finite value." };
  return {
    base_halfwidth_ft: baseHalfwidth,
    setback_ft: setback,
    total_clear_ft: totalClear,
    surcharge_governs: surchargeSetback > minSetback,
    note: "2 ft is the absolute OSHA 1926.651(j)(2) minimum, not a design. A deep trench's failure wedge reaches about one trench depth back, so a surcharge pile inside that zone must be set back farther or the wall protected. The protective system (slope, bench, shield) is a competent-person decision under Subpart P, and equipment, traffic, and stockpiled pipe are surcharges too.",
  };
}

function _v67renderSpoilSetback(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: OSHA 29 CFR 1926.651(j) (2 ft spoil setback) and Subpart P (protective systems) by name. base half-width = spoil height / tan(repose); setback = max(2 ft, trench depth). The competent person governs.";
  const depth = makeNumber("Trench depth (ft)", "sp-depth", { step: "any", min: "0" });
  const height = makeNumber("Spoil pile height (ft)", "sp-height", { step: "any", min: "0" });
  const repose = makeNumber("Angle of repose (deg)", "sp-repose", { step: "any", min: "0", value: "34" });
  repose.input.value = "34";
  const minSetback = makeNumber("Code minimum setback (ft)", "sp-min", { step: "any", min: "0", value: "2" });
  minSetback.input.value = "2";
  for (const f of [depth, height, repose, minSetback]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { depth.input.value = "10"; height.input.value = "4"; repose.input.value = "34"; minSetback.input.value = "2"; update(); });
  const oBase = makeOutputLine(outputRegion, "Spoil pile toe spread", "sp-out-base");
  const oSet = makeOutputLine(outputRegion, "Governing setback", "sp-out-set");
  const oClear = makeOutputLine(outputRegion, "Total clear from trench edge", "sp-out-clear");
  const update = debounce(() => {
    const r = computeSpoilSetback({ trench_depth_ft: Number(depth.input.value) || 0, spoil_height_ft: Number(height.input.value) || 0, repose_deg: repose.input.value === "" ? 34 : Number(repose.input.value), min_setback_ft: minSetback.input.value === "" ? 2 : Number(minSetback.input.value) });
    if (r.error) { oBase.textContent = r.error; oSet.textContent = "-"; oClear.textContent = "-"; return; }
    oBase.textContent = fmt(r.base_halfwidth_ft, 2) + " ft";
    oSet.textContent = fmt(r.setback_ft, 2) + " ft" + (r.surcharge_governs ? " (surcharge governs)" : " (code minimum)");
    oClear.textContent = fmt(r.total_clear_ft, 2) + " ft";
  }, DEBOUNCE_MS);
  for (const f of [depth, height, repose, minSetback]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["spoil-setback"] = _v67renderSpoilSetback;

// --- pipe-bedding-backfill: Trench Bedding, Embedment, and Backfill Take-Off ---
//
// bedding_cy = width x (bedding/12) x length / 27; bedding_tons = bedding_cy x
// density; embed_area = width x od_ft - (pi/4) od_ft^2; embedment_cy =
// embed_area x length / 27; backfill_cy = width x cover x length / 27.
// dims: in { trench_width_ft: L, pipe_od_in: L, bedding_depth_in: L, cover_ft: L, length_ft: L, stone_density_tcy: dimensionless } out: { bedding_cy: L^3, bedding_tons: M, embedment_cy: L^3, backfill_cy: L^3 }
// (Trench width, pipe OD, bedding, cover, and length are lengths L; the bedding
//  density converts the volume to a mass M; the volumes are L^3.)
export function computePipeBeddingBackfill({ trench_width_ft, pipe_od_in, bedding_depth_in = 0, cover_ft = 0, length_ft, stone_density_tcy = 1.4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const width = Number(trench_width_ft);
  const odIn = Number(pipe_od_in);
  const bedding = Number(bedding_depth_in);
  const cover = Number(cover_ft);
  const length = Number(length_ft);
  const density = Number(stone_density_tcy);
  if (!Number.isFinite(width) || width <= 0) return { error: "Trench width must be a positive finite number (ft)." };
  if (!Number.isFinite(odIn) || odIn <= 0) return { error: "Pipe OD must be a positive finite number (in)." };
  if (!Number.isFinite(bedding) || bedding < 0) return { error: "Bedding depth must be a non-negative finite number (in)." };
  if (!Number.isFinite(cover) || cover < 0) return { error: "Cover must be a non-negative finite number (ft)." };
  if (!Number.isFinite(length) || length <= 0) return { error: "Run length must be a positive finite number (ft)." };
  if (!Number.isFinite(density) || density <= 0) return { error: "Stone density must be a positive finite number (tons/cy)." };
  const odFt = odIn / 12;
  if (odFt >= width) return { error: "Pipe OD must be smaller than the trench width." };
  const beddingCy = width * (bedding / 12) * length / 27;
  const beddingTons = beddingCy * density;
  const embedAreaFt2 = width * odFt - Math.PI / 4 * odFt * odFt;
  const embedmentCy = embedAreaFt2 * length / 27;
  const backfillCy = width * cover * length / 27;
  if (![beddingCy, beddingTons, embedmentCy, backfillCy].every(Number.isFinite)) return { error: "Take-off math is not a finite value." };
  return {
    bedding_cy: beddingCy,
    bedding_tons: beddingTons,
    embedment_cy: embedmentCy,
    backfill_cy: backfillCy,
    note: "The embedment zone is the structural support for a flexible pipe and is placed and compacted in lifts per ASTM D2321 / the project detail, not dumped. The bedding density is a loose stone estimate and the supplier's ticket governs the actual tonnage. The pipe-zone aggregate excludes the pipe's own volume. The trench width, bedding, and compaction all come from the approved detail.",
  };
}

function _v67renderPipeBeddingBackfill(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASTM D2321 (installation of thermoplastic pipe) and the municipal bedding detail by name. bedding / embedment / backfill volumes from trench and pipe dimensions; embedment excludes the pipe's own volume. The approved detail governs.";
  const width = makeNumber("Trench width (ft)", "pb-width", { step: "any", min: "0" });
  const odIn = makeNumber("Pipe outside diameter (in)", "pb-od", { step: "any", min: "0" });
  const bedding = makeNumber("Bedding depth below pipe (in)", "pb-bed", { step: "any", min: "0" });
  const cover = makeNumber("Cover above pipe (ft)", "pb-cover", { step: "any", min: "0" });
  const length = makeNumber("Run length (ft)", "pb-len", { step: "any", min: "0" });
  const density = makeNumber("Stone density (tons/cy)", "pb-dens", { step: "any", min: "0", value: "1.4" });
  density.input.value = "1.4";
  for (const f of [width, odIn, bedding, cover, length, density]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { width.input.value = "2"; odIn.input.value = "12"; bedding.input.value = "4"; cover.input.value = "3"; length.input.value = "100"; density.input.value = "1.4"; update(); });
  const oBed = makeOutputLine(outputRegion, "Bedding stone", "pb-out-bed");
  const oEmbed = makeOutputLine(outputRegion, "Embedment (pipe-zone) aggregate", "pb-out-embed");
  const oBack = makeOutputLine(outputRegion, "Backfill above pipe", "pb-out-back");
  const update = debounce(() => {
    const r = computePipeBeddingBackfill({
      trench_width_ft: Number(width.input.value) || 0, pipe_od_in: Number(odIn.input.value) || 0,
      bedding_depth_in: Number(bedding.input.value) || 0, cover_ft: Number(cover.input.value) || 0,
      length_ft: Number(length.input.value) || 0, stone_density_tcy: density.input.value === "" ? 1.4 : Number(density.input.value),
    });
    if (r.error) { oBed.textContent = r.error; oEmbed.textContent = "-"; oBack.textContent = "-"; return; }
    oBed.textContent = fmt(r.bedding_cy, 2) + " cy (" + fmt(r.bedding_tons, 2) + " tons)";
    oEmbed.textContent = fmt(r.embedment_cy, 2) + " cy";
    oBack.textContent = fmt(r.backfill_cy, 1) + " cy";
  }, DEBOUNCE_MS);
  for (const f of [width, odIn, bedding, cover, length, density]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["pipe-bedding-backfill"] = _v67renderPipeBeddingBackfill;
