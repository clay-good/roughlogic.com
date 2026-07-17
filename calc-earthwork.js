// =====================================================================
// calc-earthwork.js - spec-v70 cap-relief split (extracted from
// calc-construction.js, which sat at 97.6% of its 70 KB gzip cap).
//
// Holds the spec-v67 earthwork / excavation production bench (Group E):
//   - soil-swell-shrink       Bank / loose / compacted volume conversion
//   - haul-cycle-production   Truck/loader haul-cycle production + fleet match
//   - loader-production       Wheel-loader / excavator bucket production rate
//   - dozer-production        Dozer slot / blade production rate
//   - compaction-roller-production  Roller compaction production rate
//   - ripper-production       Dozer ripper loosening production rate
//   - water-for-compaction    Water to reach optimum moisture for compaction
//   - rusle-soil-loss         RUSLE annual soil loss (erosion / SWPPP)
//   - riprap-d50              Riprap median stone size (Isbash)
//   - riprap-tonnage          Riprap layer volume and tonnage
//   - silt-fence-drainage     Silt fence drainage-area and length check
//   - check-dam-spacing       Rock check dam spacing
//   - sediment-basin-volume   Sediment basin / trap storage volume
//   - erosion-blanket-coverage  Erosion blanket (RECP) roll and staple takeoff
//   - hydroseed-mix           Hydroseed slurry mix and tank count
//   - rock-construction-entrance  Stabilized construction entrance stone
//   - dewatering-rate         Excavation dewatering pump rate
//   - spoil-setback           Spoil pile setback and surcharge (OSHA 1926.651)
//   - pipe-bedding-backfill   Trench bedding / embedment / backfill (ASTM D2321)
//   - pipe-flotation          Buried pipe flotation / anti-flotation backfill
//   - restrained-pipe-length  Restrained-joint length at a pipe bend
//   - hdd-pullback            HDD pullback force first-order estimate (ASTM F1962)
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

// --- loader-production: Wheel-Loader / Excavator Bucket Production Rate ---
//
// payload = bucket_cap x fill_factor; cycles/hr = eff_min / cycle;
// production = payload x cycles/hr; daily = production x hours.
// dims: in { bucket_cap_lcy: L^3, fill_factor: dimensionless, cycle_min: T, eff_min_per_hr: T, hours_per_day: T } out: { bucket_payload_lcy: L^3, cycles_per_hour: dimensionless, production_lcy_hr: L^3 T^-1, daily_lcy: L^3 }
// (Bucket capacity is L^3; the fill factor and cycles-per-hour are dimensionless;
//  every time is T; production is a volume-rate L^3 T^-1 and the daily volume L^3.)
export function computeLoaderProduction({ bucket_cap_lcy, fill_factor = 0.95, cycle_min, eff_min_per_hr = 50, hours_per_day = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cap = Number(bucket_cap_lcy);
  const fill = Number(fill_factor);
  const cycle = Number(cycle_min);
  const eff = Number(eff_min_per_hr);
  const hours = Number(hours_per_day);
  if (!Number.isFinite(cap) || cap <= 0) return { error: "Bucket capacity must be a positive finite number (lcy)." };
  if (!Number.isFinite(fill) || fill <= 0) return { error: "Fill factor must be a positive finite number." };
  if (!Number.isFinite(cycle) || cycle <= 0) return { error: "Cycle time must be a positive finite number (min)." };
  if (!Number.isFinite(eff) || eff <= 0) return { error: "Working minutes per hour must be a positive finite number." };
  if (!Number.isFinite(hours) || hours <= 0) return { error: "Hours per day must be a positive finite number." };
  const bucketPayloadLcy = cap * fill;
  const cyclesPerHour = eff / cycle;
  const productionLcyHr = bucketPayloadLcy * cyclesPerHour;
  const dailyLcy = productionLcyHr * hours;
  if (![bucketPayloadLcy, cyclesPerHour, productionLcyHr, dailyLcy].every(Number.isFinite)) return { error: "Production math is not a finite value." };
  return {
    bucket_payload_lcy: bucketPayloadLcy,
    cycles_per_hour: cyclesPerHour,
    production_lcy_hr: productionLcyHr,
    daily_lcy: dailyLcy,
    note: "The manufacturer's rated bucket capacity, the operator's fill factor (the material and bucket geometry set it, not a constant), and the machine's rated cycle time govern the answer. The 50-minute hour is a planning default for real-world delays, not a guarantee. Cycle time grows with tram distance and dig conditions and is the variable that moves the answer. Convert the loose yards back to bank (earned) quantity with soil-swell-shrink.",
  };
}

function _v809renderLoaderProduction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Caterpillar Performance Handbook cycle-time production method by name. production = bucket payload x cycles per hour; payload = rated capacity x fill factor; cycles/hr = working minutes / cycle time.";
  const cap = makeNumber("Heaped bucket capacity (loose cy)", "lp-cap", { step: "any", min: "0" });
  const fill = makeNumber("Bucket fill factor", "lp-fill", { step: "any", min: "0", value: "0.95" });
  fill.input.value = "0.95";
  const cycle = makeNumber("Dig-dump cycle time (min)", "lp-cycle", { step: "any", min: "0" });
  const eff = makeNumber("Working minutes per hour", "lp-eff", { step: "any", min: "0", value: "50" });
  eff.input.value = "50";
  const hours = makeNumber("Productive hours per day", "lp-hours", { step: "any", min: "0", value: "8" });
  hours.input.value = "8";
  for (const f of [cap, fill, cycle, eff, hours]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "3.5"; fill.input.value = "0.95"; cycle.input.value = "0.50"; eff.input.value = "50"; hours.input.value = "8"; update(); });
  const oPayload = makeOutputLine(outputRegion, "Bucket payload", "lp-out-payload");
  const oProd = makeOutputLine(outputRegion, "Production", "lp-out-prod");
  const oDaily = makeOutputLine(outputRegion, "Daily production", "lp-out-daily");
  const update = debounce(() => {
    const r = computeLoaderProduction({
      bucket_cap_lcy: Number(cap.input.value) || 0, fill_factor: fill.input.value === "" ? 0.95 : Number(fill.input.value),
      cycle_min: Number(cycle.input.value) || 0, eff_min_per_hr: eff.input.value === "" ? 50 : Number(eff.input.value),
      hours_per_day: hours.input.value === "" ? 8 : Number(hours.input.value),
    });
    if (r.error) { oPayload.textContent = r.error; for (const o of [oProd, oDaily]) o.textContent = "-"; return; }
    oPayload.textContent = fmt(r.bucket_payload_lcy, 3) + " lcy (" + fmt(r.cycles_per_hour, 1) + " cycles/hr)";
    oProd.textContent = fmt(r.production_lcy_hr, 1) + " lcy/hr";
    oDaily.textContent = fmt(r.daily_lcy, 0) + " lcy/day";
  }, DEBOUNCE_MS);
  for (const f of [cap, fill, cycle, eff, hours]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["loader-production"] = _v809renderLoaderProduction;

// --- dozer-production: Dozer Slot / Blade Production Rate ---
//
// cycle = push_dist/push_speed + push_dist/return_speed + fixed;
// cycles/hr = eff_min / cycle; production = blade x cycles/hr.
// dims: in { blade_cap_lcy: L^3, push_dist_ft: L, push_speed_fpm: L T^-1, return_speed_fpm: L T^-1, fixed_min: T, eff_min_per_hr: T } out: { cycle_min: T, cycles_per_hour: dimensionless, production_lcy_hr: L^3 T^-1 }
// (Blade capacity is L^3; push distance L; both speeds L T^-1; every time is T;
//  cycles-per-hour is dimensionless and production a volume-rate L^3 T^-1.)
export function computeDozerProduction({ blade_cap_lcy, push_dist_ft, push_speed_fpm, return_speed_fpm, fixed_min = 0.05, eff_min_per_hr = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const blade = Number(blade_cap_lcy);
  const push = Number(push_dist_ft);
  const pushSpeed = Number(push_speed_fpm);
  const retSpeed = Number(return_speed_fpm);
  const fixed = Number(fixed_min);
  const eff = Number(eff_min_per_hr);
  if (!Number.isFinite(blade) || blade <= 0) return { error: "Blade capacity must be a positive finite number (lcy)." };
  if (!Number.isFinite(push) || push <= 0) return { error: "Push distance must be a positive finite number (ft)." };
  if (!Number.isFinite(pushSpeed) || pushSpeed <= 0) return { error: "Push speed must be a positive finite number (ft/min)." };
  if (!Number.isFinite(retSpeed) || retSpeed <= 0) return { error: "Return speed must be a positive finite number (ft/min)." };
  if (!Number.isFinite(fixed) || fixed < 0) return { error: "Fixed time must be a non-negative finite number (min)." };
  if (!Number.isFinite(eff) || eff <= 0) return { error: "Working minutes per hour must be a positive finite number." };
  const cycleMin = push / pushSpeed + push / retSpeed + fixed;
  const cyclesPerHour = eff / cycleMin;
  const productionLcyHr = blade * cyclesPerHour;
  if (![cycleMin, cyclesPerHour, productionLcyHr].every(Number.isFinite)) return { error: "Production math is not a finite value." };
  return {
    cycle_min: cycleMin,
    cycles_per_hour: cyclesPerHour,
    production_lcy_hr: productionLcyHr,
    note: "The SAE J1265 blade capacity is manufacturer-rated. Grade helps or hurts: a downhill push boosts the blade load, an uphill push cuts it. Push distance is the variable that governs - production falls off fast as the push lengthens, which is why long moves belong to scrapers and trucks, not a dozer. The 50-minute hour is a planning default, not a guarantee. Convert the loose yards back to bank (earned) quantity with soil-swell-shrink.",
  };
}

function _v810renderDozerProduction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Caterpillar Performance Handbook slot-dozing cycle-time production method by name. cycle = push/push-speed + push/return-speed + fixed; cycles/hr = working minutes / cycle; production = blade capacity x cycles/hr.";
  const blade = makeNumber("Heaped blade capacity (loose cy)", "dz-blade", { step: "any", min: "0" });
  const push = makeNumber("One-way push distance (ft)", "dz-push", { step: "any", min: "0" });
  const pushSpeed = makeNumber("Loaded push speed (ft/min)", "dz-pspeed", { step: "any", min: "0" });
  const retSpeed = makeNumber("Empty return speed (ft/min)", "dz-rspeed", { step: "any", min: "0" });
  const fixed = makeNumber("Fixed gear-shift time (min)", "dz-fixed", { step: "any", min: "0", value: "0.05" });
  fixed.input.value = "0.05";
  const eff = makeNumber("Working minutes per hour", "dz-eff", { step: "any", min: "0", value: "50" });
  eff.input.value = "50";
  for (const f of [blade, push, pushSpeed, retSpeed, fixed, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { blade.input.value = "8"; push.input.value = "100"; pushSpeed.input.value = "200"; retSpeed.input.value = "400"; fixed.input.value = "0.05"; eff.input.value = "50"; update(); });
  const oCycle = makeOutputLine(outputRegion, "Cycle time", "dz-out-cycle");
  const oProd = makeOutputLine(outputRegion, "Production", "dz-out-prod");
  const update = debounce(() => {
    const r = computeDozerProduction({
      blade_cap_lcy: Number(blade.input.value) || 0, push_dist_ft: Number(push.input.value) || 0,
      push_speed_fpm: Number(pushSpeed.input.value) || 0, return_speed_fpm: Number(retSpeed.input.value) || 0,
      fixed_min: fixed.input.value === "" ? 0.05 : Number(fixed.input.value),
      eff_min_per_hr: eff.input.value === "" ? 50 : Number(eff.input.value),
    });
    if (r.error) { oCycle.textContent = r.error; oProd.textContent = "-"; return; }
    oCycle.textContent = fmt(r.cycle_min, 2) + " min (" + fmt(r.cycles_per_hour, 1) + " cycles/hr)";
    oProd.textContent = fmt(r.production_lcy_hr, 1) + " lcy/hr";
  }, DEBOUNCE_MS);
  for (const f of [blade, push, pushSpeed, retSpeed, fixed, eff]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["dozer-production"] = _v810renderDozerProduction;

// --- compaction-roller-production: Roller Compaction Production Rate ---
//
// area_sf/hr = width x speed x 5280 x efficiency / passes; area_sy/hr = area_sf/9;
// production_ccy/hr = area_sf/hr x (lift/12) / 27.
// dims: in { drum_width_ft: L, speed_mph: L T^-1, lift_in: L, passes: dimensionless, efficiency: dimensionless } out: { area_sf_hr: L^2 T^-1, area_sy_hr: L^2 T^-1, production_ccy_hr: L^3 T^-1 }
// (Drum width and lift are L; speed L T^-1; passes and efficiency dimensionless;
//  both area rates are L^2 T^-1 and the compacted-volume rate L^3 T^-1.)
export function computeCompactionRollerProduction({ drum_width_ft, speed_mph, lift_in, passes, efficiency = 0.75 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const width = Number(drum_width_ft);
  const speed = Number(speed_mph);
  const lift = Number(lift_in);
  const np = Number(passes);
  const eff = Number(efficiency);
  if (!Number.isFinite(width) || width <= 0) return { error: "Drum width must be a positive finite number (ft)." };
  if (!Number.isFinite(speed) || speed <= 0) return { error: "Roller speed must be a positive finite number (mph)." };
  if (!Number.isFinite(lift) || lift <= 0) return { error: "Lift thickness must be a positive finite number (in)." };
  if (!Number.isFinite(np) || np <= 0) return { error: "Passes must be a positive finite number." };
  if (!Number.isFinite(eff) || eff <= 0) return { error: "Efficiency must be a positive finite number." };
  const areaSfHr = width * speed * 5280 * eff / np;
  const areaSyHr = areaSfHr / 9;
  const productionCcyHr = areaSfHr * (lift / 12) / 27;
  if (![areaSfHr, areaSyHr, productionCcyHr].every(Number.isFinite)) return { error: "Production math is not a finite value." };
  return {
    area_sf_hr: areaSfHr,
    area_sy_hr: areaSyHr,
    production_ccy_hr: productionCcyHr,
    note: "The number of passes comes from a project test strip and the spec density, not the formula - it is the lever that moves the answer. The lift thickness is limited by the roller's ability to compact to the bottom of the lift. The 0.75 efficiency is a planning default for real-world delays. The surface-area rate is independent of lift thickness; only the volume rate scales with it.",
  };
}

function _v813renderCompactionRollerProduction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: roller production identity by name. compacted cy/hr = 16.3 x width x speed x lift x efficiency / passes, where 16.3 = 5280 / (12 x 27) folds the mile, the inch, and the cubic yard; area/hr = width x speed x 5280 x efficiency / passes.";
  const width = makeNumber("Compacting drum width (ft)", "cr-width", { step: "any", min: "0" });
  const speed = makeNumber("Roller speed (mph)", "cr-speed", { step: "any", min: "0" });
  const lift = makeNumber("Compacted lift thickness (in)", "cr-lift", { step: "any", min: "0" });
  const passes = makeNumber("Passes to reach spec density", "cr-passes", { step: "any", min: "0" });
  const eff = makeNumber("Job efficiency", "cr-eff", { step: "any", min: "0", value: "0.75" });
  eff.input.value = "0.75";
  for (const f of [width, speed, lift, passes, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { width.input.value = "7"; speed.input.value = "3"; lift.input.value = "8"; passes.input.value = "6"; eff.input.value = "0.75"; update(); });
  const oArea = makeOutputLine(outputRegion, "Surface coverage", "cr-out-area");
  const oProd = makeOutputLine(outputRegion, "Compacted production", "cr-out-prod");
  const update = debounce(() => {
    const r = computeCompactionRollerProduction({
      drum_width_ft: Number(width.input.value) || 0, speed_mph: Number(speed.input.value) || 0,
      lift_in: Number(lift.input.value) || 0, passes: Number(passes.input.value) || 0,
      efficiency: eff.input.value === "" ? 0.75 : Number(eff.input.value),
    });
    if (r.error) { oArea.textContent = r.error; oProd.textContent = "-"; return; }
    oArea.textContent = fmt(r.area_sf_hr, 0) + " sf/hr (" + fmt(r.area_sy_hr, 0) + " sy/hr)";
    oProd.textContent = fmt(r.production_ccy_hr, 1) + " compacted cy/hr";
  }, DEBOUNCE_MS);
  for (const f of [width, speed, lift, passes, eff]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["compaction-roller-production"] = _v813renderCompactionRollerProduction;

// --- ripper-production: Dozer Ripper Loosening Production Rate ---
//
// cross_section = spacing x penetration; production_bcy/hr = cross_section x
// speed x 60 x efficiency / 27 (60 min/hr, 27 ft^3/cy fold the units).
// dims: in { spacing_ft: L, penetration_ft: L, speed_fpm: L T^-1, efficiency: dimensionless } out: { cross_section_ft2: L^2, production_bcy_hr: L^3 T^-1 }
// (Shank spacing and penetration are L; ripping speed L T^-1; efficiency
//  dimensionless; the ripped cross-section L^2 and the loosened rate L^3 T^-1.)
export function computeRipperProduction({ spacing_ft, penetration_ft, speed_fpm, efficiency = 0.75 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const spacing = Number(spacing_ft);
  const pen = Number(penetration_ft);
  const speed = Number(speed_fpm);
  const eff = Number(efficiency);
  if (!Number.isFinite(spacing) || spacing <= 0) return { error: "Shank spacing must be a positive finite number (ft)." };
  if (!Number.isFinite(pen) || pen <= 0) return { error: "Penetration must be a positive finite number (ft)." };
  if (!Number.isFinite(speed) || speed <= 0) return { error: "Ripping speed must be a positive finite number (ft/min)." };
  if (!Number.isFinite(eff) || eff <= 0) return { error: "Efficiency must be a positive finite number." };
  const crossSectionFt2 = spacing * pen;
  const productionBcyHr = (crossSectionFt2 * speed * 60 * eff) / 27;
  if (![crossSectionFt2, productionBcyHr].every(Number.isFinite)) return { error: "Production math is not a finite value." };
  return {
    cross_section_ft2: crossSectionFt2,
    production_bcy_hr: productionBcyHr,
    note: "Ripping only loosens the material in place - pair it with dozer-production to move it. Whether the ground is rippable at all comes from a seismic-velocity judgment the operator makes, not from this tile. Overlapping passes and tooth wear cut the real number below the swept-prism ideal. Speed, which the rock's hardness limits, is the lever; deeper or wider passes rarely pay when they stall the tractor.",
  };
}

function _v820renderRipperProduction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: swept-prism production identity by name. production (bank cy/hr) = shank spacing x penetration x speed x 60 / 27 x efficiency, where 60 folds minutes to the hour and 27 the cubic yard.";
  const spacing = makeNumber("Shank spacing / pass width (ft)", "rp-spacing", { step: "any", min: "0" });
  const pen = makeNumber("Ripping depth (ft)", "rp-pen", { step: "any", min: "0" });
  const speed = makeNumber("Ripping speed (ft/min)", "rp-speed", { step: "any", min: "0" });
  const eff = makeNumber("Job efficiency", "rp-eff", { step: "any", min: "0", value: "0.75" });
  eff.input.value = "0.75";
  for (const f of [spacing, pen, speed, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { spacing.input.value = "3"; pen.input.value = "1.5"; speed.input.value = "132"; eff.input.value = "0.75"; update(); });
  const oCross = makeOutputLine(outputRegion, "Ripped cross-section", "rp-out-cross");
  const oProd = makeOutputLine(outputRegion, "Loosened production", "rp-out-prod");
  const update = debounce(() => {
    const r = computeRipperProduction({
      spacing_ft: Number(spacing.input.value) || 0, penetration_ft: Number(pen.input.value) || 0,
      speed_fpm: Number(speed.input.value) || 0, efficiency: eff.input.value === "" ? 0.75 : Number(eff.input.value),
    });
    if (r.error) { oCross.textContent = r.error; oProd.textContent = "-"; return; }
    oCross.textContent = fmt(r.cross_section_ft2, 2) + " ft^2";
    oProd.textContent = fmt(r.production_bcy_hr, 0) + " bank cy/hr";
  }, DEBOUNCE_MS);
  for (const f of [spacing, pen, speed, eff]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["ripper-production"] = _v820renderRipperProduction;

// --- water-for-compaction: Water to Reach Optimum Moisture for Compaction ---
//
// dry_weight = volume x 27 x dry_density; water_lb = (omc - field)/100 x dry_weight;
// gallons = water_lb / 8.34. A negative result (field > omc) signals aerate, not water.
// dims: in { volume_bcy: L^3, dry_density_pcf: M L^-3, omc_pct: dimensionless, field_pct: dimensionless } out: { dry_weight_lb: M, water_lb: M, water_gal: L^3 }
// (Lift volume is L^3; dry density M L^-3; both moisture contents dimensionless;
//  the dry and water weights M and the water gallons a volume L^3.)
export function computeWaterForCompaction({ volume_bcy, dry_density_pcf, omc_pct, field_pct } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vol = Number(volume_bcy);
  const dd = Number(dry_density_pcf);
  const omc = Number(omc_pct);
  const field = Number(field_pct);
  if (!Number.isFinite(vol) || vol <= 0) return { error: "Lift volume must be a positive finite number (bcy)." };
  if (!Number.isFinite(dd) || dd <= 0) return { error: "Dry density must be a positive finite number (pcf)." };
  if (!Number.isFinite(omc) || omc < 0) return { error: "Optimum moisture must be a non-negative finite percent." };
  if (!Number.isFinite(field) || field < 0) return { error: "Field moisture must be a non-negative finite percent." };
  const dryWeightLb = vol * 27 * dd;
  const waterLb = ((omc - field) / 100) * dryWeightLb;
  const waterGal = waterLb / 8.34;
  const needsDrying = field > omc;
  if (![dryWeightLb, waterLb, waterGal].every(Number.isFinite)) return { error: "Moisture math is not a finite value." };
  return {
    dry_weight_lb: dryWeightLb,
    water_lb: waterLb,
    water_gal: waterGal,
    needs_drying: needsDrying,
    note: "The optimum moisture and maximum dry density come from the Proctor (the geotech governs); the field moisture comes from a field test. Water is added and mixed before the roller - a dry surface skin over a wet core still fails. A lift wetter than optimum must be aerated and dried, not watered (a negative water figure is that signal).",
  };
}

function _v821renderWaterForCompaction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: gravimetric water-content identity by name. water to add = (optimum - field)/100 x dry soil weight; dry weight = volume x 27 x dry density; gallons = pounds / 8.34 (weight of a gallon of water).";
  const vol = makeNumber("Lift volume, bank measure (cy)", "wfc-vol", { step: "any", min: "0" });
  const dd = makeNumber("Maximum dry density, Proctor (pcf)", "wfc-dd", { step: "any", min: "0" });
  const omc = makeNumber("Optimum moisture content (%)", "wfc-omc", { step: "any", min: "0" });
  const field = makeNumber("Current field moisture (%)", "wfc-field", { step: "any", min: "0" });
  for (const f of [vol, dd, omc, field]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vol.input.value = "100"; dd.input.value = "105"; omc.input.value = "14"; field.input.value = "9"; update(); });
  const oWater = makeOutputLine(outputRegion, "Water to add", "wfc-out-water");
  const oDry = makeOutputLine(outputRegion, "Dry soil weight", "wfc-out-dry");
  const update = debounce(() => {
    const r = computeWaterForCompaction({
      volume_bcy: Number(vol.input.value) || 0, dry_density_pcf: Number(dd.input.value) || 0,
      omc_pct: omc.input.value === "" ? 0 : Number(omc.input.value), field_pct: field.input.value === "" ? 0 : Number(field.input.value),
    });
    if (r.error) { oWater.textContent = r.error; oDry.textContent = "-"; return; }
    if (r.needs_drying) {
      oWater.textContent = "Aerate and dry (field moisture is above optimum by " + fmt(-(r.water_lb) / (r.dry_weight_lb) * 100, 1) + "%)";
    } else {
      oWater.textContent = fmt(r.water_gal, 0) + " gal (" + fmt(r.water_lb, 0) + " lb)";
    }
    oDry.textContent = fmt(r.dry_weight_lb, 0) + " lb";
  }, DEBOUNCE_MS);
  for (const f of [vol, dd, omc, field]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["water-for-compaction"] = _v821renderWaterForCompaction;

// --- rusle-soil-loss: RUSLE Annual Soil Loss ---
//
// RUSLE (USDA public-domain): A = R x K x LS x C x P (tons/acre/yr);
// site loss = A x acres. Every factor is user-entered (no chart reproduced).
// dims: in { r_factor: dimensionless, k_factor: dimensionless, ls_factor: dimensionless, c_factor: dimensionless, p_factor: dimensionless, acres: L^2 } out: { a_tons_ac_yr: M, site_tons_yr: M }
// (The five RUSLE factors are dimensionless; the area is L^2; both soil-loss
//  figures are a mass M, with the per-acre-year implicit on the rate.)
export function computeRusleSoilLoss({ r_factor, k_factor, ls_factor, c_factor, p_factor, acres } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = Number(r_factor);
  const K = Number(k_factor);
  const LS = Number(ls_factor);
  const C = Number(c_factor);
  const P = Number(p_factor);
  const ac = Number(acres);
  for (const [v, n] of [[R, "R (rainfall erosivity)"], [K, "K (soil erodibility)"], [LS, "LS (slope length-steepness)"], [C, "C (cover-management)"], [P, "P (support-practice)"]]) {
    if (!Number.isFinite(v) || v < 0) return { error: n + " must be a non-negative finite number." };
  }
  if (!Number.isFinite(ac) || ac <= 0) return { error: "Disturbed area must be a positive finite number (acres)." };
  const aTonsAcYr = R * K * LS * C * P;
  const siteTonsYr = aTonsAcYr * ac;
  if (![aTonsAcYr, siteTonsYr].every(Number.isFinite)) return { error: "Soil-loss math is not a finite value." };
  return {
    a_tons_ac_yr: aTonsAcYr,
    site_tons_yr: siteTonsYr,
    note: "RUSLE is the USDA public-domain replacement for USLE. Every factor comes from the SWPPP designer or published state guidance you enter (this tile reproduces no isoerodent map or nomograph). It estimates long-term average sheet-and-rill loss only, not gully or channel erosion. The cover factor C is the lever a contractor controls with mulch, a blanket, or seed. The permitting AHJ governs the plan.",
  };
}

function _v822renderRusleSoilLoss(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: RUSLE identity by name (USDA public-domain). A = R x K x LS x C x P (tons/acre/yr); site loss = A x acres. Every factor is user-entered from the SWPPP designer or state guidance.";
  const r = makeNumber("Rainfall-runoff erosivity R", "rsl-r", { step: "any", min: "0" });
  const k = makeNumber("Soil erodibility K", "rsl-k", { step: "any", min: "0" });
  const ls = makeNumber("Slope length-steepness LS", "rsl-ls", { step: "any", min: "0" });
  const c = makeNumber("Cover-management C", "rsl-c", { step: "any", min: "0" });
  const p = makeNumber("Support-practice P", "rsl-p", { step: "any", min: "0" });
  const ac = makeNumber("Disturbed area (acres)", "rsl-ac", { step: "any", min: "0" });
  for (const f of [r, k, ls, c, p, ac]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { r.input.value = "150"; k.input.value = "0.32"; ls.input.value = "1.5"; c.input.value = "1.0"; p.input.value = "1.0"; ac.input.value = "5"; update(); });
  const oA = makeOutputLine(outputRegion, "Soil loss rate", "rsl-out-a");
  const oSite = makeOutputLine(outputRegion, "Site soil loss", "rsl-out-site");
  const update = debounce(() => {
    const res = computeRusleSoilLoss({
      r_factor: Number(r.input.value) || 0, k_factor: Number(k.input.value) || 0, ls_factor: Number(ls.input.value) || 0,
      c_factor: c.input.value === "" ? 0 : Number(c.input.value), p_factor: p.input.value === "" ? 0 : Number(p.input.value),
      acres: Number(ac.input.value) || 0,
    });
    if (res.error) { oA.textContent = res.error; oSite.textContent = "-"; return; }
    oA.textContent = fmt(res.a_tons_ac_yr, 1) + " tons/acre/yr";
    oSite.textContent = fmt(res.site_tons_yr, 0) + " tons/yr";
  }, DEBOUNCE_MS);
  for (const f of [r, k, ls, c, p, ac]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["rusle-soil-loss"] = _v822renderRusleSoilLoss;

// --- riprap-d50: Riprap Median Stone Size (Isbash) ---
//
// Isbash: D50 = SF x V^2 / (2 g C^2 (Ss - 1)). The turbulence coefficient C
// enters squared, so turbulence -- not just velocity -- sets the rock.
// dims: in { velocity_fps: L T^-1, specific_gravity: dimensionless, turbulence_coeff: dimensionless, safety_factor: dimensionless } out: { d50_ft: L, d50_in: L }
// (Velocity is L T^-1; Ss, C, and SF dimensionless; V^2/g reduces to a length,
//  so both stone sizes are L.)
export function computeRiprapD50({ velocity_fps, specific_gravity = 2.65, turbulence_coeff = 0.86, safety_factor = 1.2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(velocity_fps);
  const Ss = Number(specific_gravity);
  const C = Number(turbulence_coeff);
  const SF = Number(safety_factor);
  if (!Number.isFinite(V) || V <= 0) return { error: "Velocity must be a positive finite number (ft/s)." };
  if (!Number.isFinite(C) || C <= 0) return { error: "Turbulence coefficient must be a positive finite number." };
  if (!Number.isFinite(SF) || SF <= 0) return { error: "Safety factor must be a positive finite number." };
  if (!Number.isFinite(Ss) || Ss <= 1) return { error: "Specific gravity must be greater than 1 (stone denser than water)." };
  const d50_ft = (SF * V * V) / (2 * 32.2 * C * C * (Ss - 1));
  const d50_in = d50_ft * 12;
  if (![d50_ft, d50_in].every(Number.isFinite)) return { error: "Stone-size math is not a finite value." };
  return {
    d50_ft,
    d50_in,
    note: "The turbulence coefficient C is about 0.86 for high-turbulence zones (below outlets, at bends) and about 1.20 for low-turbulence straight channels - it enters squared, so it moves the answer as much as velocity. Isbash is a public-domain field estimate; the hydraulic engineer and the AHJ govern the channel design. The layer thickness (at least 1.5 x D50) and the gradation are taken off separately.",
  };
}

function _v823renderRiprapD50(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Isbash riprap-sizing identity by name. D50 = SF x V^2 / (2 g C^2 (Ss - 1)), g = 32.2 ft/s^2; C ~ 0.86 high-turbulence, ~1.20 low-turbulence. A public-domain field estimate; the hydraulic engineer governs.";
  const v = makeNumber("Flow velocity against the stone (ft/s)", "rrd-v", { step: "any", min: "0" });
  const ss = makeNumber("Stone specific gravity Ss", "rrd-ss", { step: "any", min: "0", value: "2.65" });
  ss.input.value = "2.65";
  const c = makeNumber("Isbash turbulence coefficient C", "rrd-c", { step: "any", min: "0", value: "0.86" });
  c.input.value = "0.86";
  const sf = makeNumber("Safety factor SF", "rrd-sf", { step: "any", min: "0", value: "1.2" });
  sf.input.value = "1.2";
  for (const f of [v, ss, c, sf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { v.input.value = "8"; ss.input.value = "2.65"; c.input.value = "0.86"; sf.input.value = "1.2"; update(); });
  const oD50 = makeOutputLine(outputRegion, "Median stone D50", "rrd-out-d50");
  const oLayer = makeOutputLine(outputRegion, "Minimum layer thickness (1.5 x D50)", "rrd-out-layer");
  const update = debounce(() => {
    const r = computeRiprapD50({
      velocity_fps: Number(v.input.value) || 0, specific_gravity: ss.input.value === "" ? 2.65 : Number(ss.input.value),
      turbulence_coeff: c.input.value === "" ? 0.86 : Number(c.input.value), safety_factor: sf.input.value === "" ? 1.2 : Number(sf.input.value),
    });
    if (r.error) { oD50.textContent = r.error; oLayer.textContent = "-"; return; }
    oD50.textContent = fmt(r.d50_in, 1) + " in (" + fmt(r.d50_ft, 3) + " ft)";
    oLayer.textContent = fmt(r.d50_in * 1.5, 1) + " in";
  }, DEBOUNCE_MS);
  for (const f of [v, ss, c, sf]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["riprap-d50"] = _v823renderRiprapD50;

// --- riprap-tonnage: Riprap Layer Volume and Tonnage ---
//
// The order-quantity companion to riprap-d50: volume = area x thickness / 27;
// tons = area x thickness x unit weight / 2000. Order to the PLACED density
// (voids) or the last loads sit unused.
// dims: in { area_sf: L^2, thickness_ft: L, unit_wt_pcf: M L^-3 } out: { volume_cy: L^3, tons: M }
// (Plan area is L^2; thickness L; unit weight M L^-3; the volume L^3 and the tonnage M.)
export function computeRiprapTonnage({ area_sf = 0, thickness_ft = 0, unit_wt_pcf = 165 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_sf > 0)) return { error: "Area must be positive (ft^2)." };
  if (!(thickness_ft > 0)) return { error: "Thickness must be positive (ft)." };
  if (!(unit_wt_pcf > 0)) return { error: "Unit weight must be positive (pcf)." };
  const volume_cy = (area_sf * thickness_ft) / 27;
  const tons = (area_sf * thickness_ft * unit_wt_pcf) / 2000;
  if (![volume_cy, tons].every(Number.isFinite)) return { error: "Riprap-tonnage math is not a finite value." };
  return {
    volume_cy,
    tons,
    note: "The layer should be at least 1.5 x D50 thick (from riprap-d50). A solid-rock unit weight of about 165 pcf overstates the delivered tonnage because placed riprap holds voids - a placed density near 120-135 pcf is closer for ordering, or the last few loads sit unused. A filter or bedding layer under the riprap is taken off separately.",
  };
}

function _v824renderRiprapTonnage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: layer take-off identity by name. volume (cy) = area x thickness / 27; tons = area x thickness x unit weight / 2000. Order to the placed density (voids), not the solid rock.";
  const area = makeNumber("Plan area of the riprap layer (ft^2)", "rrt-area", { step: "any", min: "0" });
  const thick = makeNumber("Layer thickness (ft, at least 1.5 x D50)", "rrt-thick", { step: "any", min: "0" });
  const uw = makeNumber("Stone unit weight (pcf)", "rrt-uw", { step: "any", min: "0", value: "165" });
  uw.input.value = "165";
  for (const f of [area, thick, uw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "500"; thick.input.value = "2"; uw.input.value = "165"; update(); });
  const oTons = makeOutputLine(outputRegion, "Stone to order", "rrt-out-tons");
  const oVol = makeOutputLine(outputRegion, "Layer volume", "rrt-out-vol");
  const update = debounce(() => {
    const r = computeRiprapTonnage({
      area_sf: Number(area.input.value) || 0, thickness_ft: Number(thick.input.value) || 0,
      unit_wt_pcf: uw.input.value === "" ? 165 : Number(uw.input.value),
    });
    if (r.error) { oTons.textContent = r.error; oVol.textContent = "-"; return; }
    oTons.textContent = fmt(r.tons, 1) + " tons";
    oVol.textContent = fmt(r.volume_cy, 1) + " cy";
  }, DEBOUNCE_MS);
  for (const f of [area, thick, uw]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["riprap-tonnage"] = _v824renderRiprapTonnage;

// --- silt-fence-drainage: Silt Fence Drainage-Area and Length Check ---
//
// Guideline: a quarter acre of drainage per 100 ft of fence, so required
// length = tributary acres x 400; the slope length behind must stay under the
// AHJ limit. Silt fence is for sheet flow only.
// dims: in { tributary_area_ac: L^2, fence_length_ft: L, slope_length_ft: L, max_slope_length_ft: L } out: { required_fence_len_ft: L, max_area_ac: L^2 }
// (Tributary and max area are L^2; the fence and slope lengths L; the two
//  adequacy outputs are dimensionless booleans, omitted from the dims list.)
export function computeSiltFenceDrainage({ tributary_area_ac = 0, fence_length_ft = 0, slope_length_ft = 0, max_slope_length_ft = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tributary_area_ac > 0)) return { error: "Tributary area must be positive (acres)." };
  if (!(fence_length_ft > 0)) return { error: "Fence length must be positive (ft)." };
  if (!(slope_length_ft > 0)) return { error: "Slope length must be positive (ft)." };
  if (!(max_slope_length_ft > 0)) return { error: "Maximum slope length must be positive (ft)." };
  const required_fence_len_ft = tributary_area_ac * 400;
  const max_area_ac = fence_length_ft / 400;
  const length_adequate = fence_length_ft >= required_fence_len_ft;
  const slope_ok = slope_length_ft <= max_slope_length_ft;
  if (![required_fence_len_ft, max_area_ac].every(Number.isFinite)) return { error: "Silt-fence math is not a finite value." };
  return {
    required_fence_len_ft,
    max_area_ac,
    length_adequate,
    slope_ok,
    note: "The quarter-acre-per-100-ft figure is a generic published guideline. The SWPPP designer and the permitting AHJ set the actual maximum slope length and fence spacing (entered here, not reproduced from a copyrighted table). Silt fence is for sheet flow only - never across a channel or in concentrated flow, where a rock check dam belongs.",
  };
}

function _v825renderSiltFenceDrainage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: silt-fence drainage-area guideline by name. required length = tributary acres x 400 (a quarter acre of drainage per 100 ft of fence); the AHJ-entered maximum slope length governs the spacing. Sheet flow only.";
  const area = makeNumber("Drainage area behind the fence (acres)", "sfd-area", { step: "any", min: "0" });
  const fence = makeNumber("Silt fence length provided (ft)", "sfd-fence", { step: "any", min: "0" });
  const slope = makeNumber("Slope length behind the fence (ft)", "sfd-slope", { step: "any", min: "0" });
  const maxSlope = makeNumber("AHJ maximum slope length (ft)", "sfd-maxslope", { step: "any", min: "0", value: "100" });
  maxSlope.input.value = "100";
  for (const f of [area, fence, slope, maxSlope]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "0.5"; fence.input.value = "250"; slope.input.value = "60"; maxSlope.input.value = "100"; update(); });
  const oLen = makeOutputLine(outputRegion, "Required fence length", "sfd-out-len");
  const oSlope = makeOutputLine(outputRegion, "Slope length check", "sfd-out-slope");
  const update = debounce(() => {
    const r = computeSiltFenceDrainage({
      tributary_area_ac: Number(area.input.value) || 0, fence_length_ft: Number(fence.input.value) || 0,
      slope_length_ft: Number(slope.input.value) || 0, max_slope_length_ft: maxSlope.input.value === "" ? 100 : Number(maxSlope.input.value),
    });
    if (r.error) { oLen.textContent = r.error; oSlope.textContent = "-"; return; }
    oLen.textContent = fmt(r.required_fence_len_ft, 0) + " ft (" + (r.length_adequate ? "provided fence OK, catches up to " + fmt(r.max_area_ac, 3) + " acre" : "PROVIDED FENCE SHORT") + ")";
    oSlope.textContent = r.slope_ok ? "OK (within the AHJ slope-length limit)" : "OVER the AHJ slope-length limit";
  }, DEBOUNCE_MS);
  for (const f of [area, fence, slope, maxSlope]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["silt-fence-drainage"] = _v825renderSiltFenceDrainage;

// --- check-dam-spacing: Rock Check Dam Spacing ---
//
// The toe of each upper dam sits at the crest of the next one down, so
// spacing = dam effective height / channel slope; dams = ceil(reach / spacing).
// dims: in { dam_height_ft: L, channel_slope_pct: dimensionless, reach_length_ft: L } out: { spacing_ft: L, dams: dimensionless }
// (Dam height and reach are L; channel slope dimensionless; spacing L and the
//  dam count dimensionless.)
export function computeCheckDamSpacing({ dam_height_ft = 0, channel_slope_pct = 0, reach_length_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(dam_height_ft > 0)) return { error: "Dam height must be positive (ft)." };
  if (!(channel_slope_pct > 0)) return { error: "Channel slope must be positive (percent)." };
  if (!(reach_length_ft > 0)) return { error: "Reach length must be positive (ft)." };
  const spacing_ft = dam_height_ft / (channel_slope_pct / 100);
  const dams = Math.ceil(reach_length_ft / spacing_ft);
  if (![spacing_ft, dams].every(Number.isFinite)) return { error: "Check-dam math is not a finite value." };
  return {
    spacing_ft,
    dams,
    note: "Check dams belong only in small channels and swales, not a perennial stream without a permit. The center of each dam is built lower than its edges so flow passes over the middle and not around the ends. The spacing rule sets the toe of each upper dam at the crest of the next one down. The AHJ governs the practice.",
  };
}

function _v826renderCheckDamSpacing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: crest-to-toe spacing identity by name. spacing = dam effective height / channel slope (the toe of each upper dam at the crest of the next); dams = ceil(reach / spacing). Small channels and swales only.";
  const h = makeNumber("Effective dam height, crest above channel (ft)", "cds-h", { step: "any", min: "0" });
  const s = makeNumber("Channel longitudinal slope (%)", "cds-s", { step: "any", min: "0" });
  const reach = makeNumber("Channel reach to protect (ft)", "cds-reach", { step: "any", min: "0" });
  for (const f of [h, s, reach]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { h.input.value = "2"; s.input.value = "4"; reach.input.value = "300"; update(); });
  const oSpacing = makeOutputLine(outputRegion, "Spacing (crest to toe)", "cds-out-spacing");
  const oDams = makeOutputLine(outputRegion, "Dams for the reach", "cds-out-dams");
  const update = debounce(() => {
    const r = computeCheckDamSpacing({
      dam_height_ft: Number(h.input.value) || 0, channel_slope_pct: Number(s.input.value) || 0, reach_length_ft: Number(reach.input.value) || 0,
    });
    if (r.error) { oSpacing.textContent = r.error; oDams.textContent = "-"; return; }
    oSpacing.textContent = fmt(r.spacing_ft, 1) + " ft";
    oDams.textContent = r.dams + " dams";
  }, DEBOUNCE_MS);
  for (const f of [h, s, reach]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["check-dam-spacing"] = _v826renderCheckDamSpacing;

// --- sediment-basin-volume: Sediment Basin / Trap Storage Volume ---
//
// The settling storage a construction general permit requires per disturbed
// acre: required volume = disturbed acres x per-acre rule; surface = volume / depth.
// dims: in { disturbed_ac: L^2, storage_rule_cf_per_ac: L, basin_depth_ft: L } out: { required_cf: L^3, required_cy: L^3, surface_area_sf: L^2 }
// (Disturbed area is L^2; the per-acre cf/acre rule reduces to a length L; the
//  depth L; the required volumes L^3 and the surface area L^2.)
export function computeSedimentBasinVolume({ disturbed_ac = 0, storage_rule_cf_per_ac = 3600, basin_depth_ft = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(disturbed_ac > 0)) return { error: "Disturbed area must be positive (acres)." };
  if (!(storage_rule_cf_per_ac > 0)) return { error: "Storage rule must be positive (cf/acre)." };
  if (!(basin_depth_ft > 0)) return { error: "Basin depth must be positive (ft)." };
  const required_cf = disturbed_ac * storage_rule_cf_per_ac;
  const required_cy = required_cf / 27;
  const surface_area_sf = required_cf / basin_depth_ft;
  if (![required_cf, required_cy, surface_area_sf].every(Number.isFinite)) return { error: "Basin-volume math is not a finite value." };
  return {
    required_cf,
    required_cy,
    surface_area_sf,
    note: "The per-acre storage figure (commonly around 3,600 cf/acre of wet storage, doubled where dry storage is also required) is set by the construction general permit or the AHJ and is entered here. This sizes settling storage only - the principal spillway, dewatering device, and emergency spillway are designed separately. The basin is cleaned out at about half its capacity.",
  };
}

function _v827renderSedimentBasinVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: sediment-basin storage identity by name. required volume = disturbed acres x per-acre storage rule (commonly ~3,600 cf/acre wet storage); surface area = volume / usable depth. The construction general permit or AHJ sets the per-acre rule.";
  const ac = makeNumber("Disturbed drainage area (acres)", "sbv-ac", { step: "any", min: "0" });
  const rule = makeNumber("Required storage per acre (cf/acre)", "sbv-rule", { step: "any", min: "0", value: "3600" });
  rule.input.value = "3600";
  const depth = makeNumber("Usable settling depth (ft)", "sbv-depth", { step: "any", min: "0", value: "3" });
  depth.input.value = "3";
  for (const f of [ac, rule, depth]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ac.input.value = "5"; rule.input.value = "3600"; depth.input.value = "3"; update(); });
  const oVol = makeOutputLine(outputRegion, "Required storage", "sbv-out-vol");
  const oSurf = makeOutputLine(outputRegion, "Pond footprint at depth", "sbv-out-surf");
  const update = debounce(() => {
    const r = computeSedimentBasinVolume({
      disturbed_ac: Number(ac.input.value) || 0, storage_rule_cf_per_ac: rule.input.value === "" ? 3600 : Number(rule.input.value),
      basin_depth_ft: depth.input.value === "" ? 3 : Number(depth.input.value),
    });
    if (r.error) { oVol.textContent = r.error; oSurf.textContent = "-"; return; }
    oVol.textContent = fmt(r.required_cf, 0) + " cf (" + fmt(r.required_cy, 0) + " cy)";
    oSurf.textContent = fmt(r.surface_area_sf, 0) + " sf";
  }, DEBOUNCE_MS);
  for (const f of [ac, rule, depth]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["sediment-basin-volume"] = _v827renderSedimentBasinVolume;

// --- erosion-blanket-coverage: Erosion Blanket (RECP) Roll and Staple Takeoff ---
//
// Rolls and staples for a slope-cover blanket; the side/end overlap drives the
// roll count above the nominal roll area.
// dims: in { area_sf: L^2, overlap_pct: dimensionless, roll_width_ft: L, roll_length_ft: L, staples_per_sy: dimensionless } out: { coverage_sy: L^2, roll_sy: L^2, rolls: dimensionless, staples: dimensionless }
export function computeErosionBlanketCoverage({ area_sf = 0, overlap_pct = 10, roll_width_ft = 8, roll_length_ft = 112.5, staples_per_sy = 1.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_sf > 0)) return { error: "Slope area must be positive (ft^2)." };
  if (!(roll_width_ft > 0)) return { error: "Roll width must be positive (ft)." };
  if (!(roll_length_ft > 0)) return { error: "Roll length must be positive (ft)." };
  if (!(staples_per_sy > 0)) return { error: "Staple rate must be positive (per sy)." };
  if (!(overlap_pct >= 0)) return { error: "Overlap must be non-negative (%)." };
  const coverage_sy = area_sf / 9;
  const roll_sy = (roll_width_ft * roll_length_ft) / 9;
  const rolls = Math.ceil((coverage_sy * (1 + overlap_pct / 100)) / roll_sy);
  const staples = Math.ceil(coverage_sy * staples_per_sy);
  if (![coverage_sy, roll_sy, rolls, staples].every(Number.isFinite)) return { error: "Blanket-takeoff math is not a finite value." };
  return {
    coverage_sy,
    roll_sy,
    rolls,
    staples,
    note: "The overlap and the staple pattern come from the manufacturer's installation guide - steeper and higher-flow slopes take more staples. The roll is anchored in a trench at the top of the slope. This is a purchase quantity, not an installation plan.",
  };
}

function _v828renderErosionBlanketCoverage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: lapped-roll takeoff identity by name. rolls = ceil(area x (1 + overlap) / roll area); staples = ceil(area (sy) x staples per sy). The manufacturer's guide sets the overlap and staple pattern.";
  const area = makeNumber("Slope area to cover (ft^2)", "ebc-area", { step: "any", min: "0" });
  const overlap = makeNumber("Side/end overlap allowance (%)", "ebc-overlap", { step: "any", min: "0", value: "10" });
  overlap.input.value = "10";
  const w = makeNumber("Blanket roll width (ft)", "ebc-w", { step: "any", min: "0", value: "8" });
  w.input.value = "8";
  const l = makeNumber("Blanket roll length (ft)", "ebc-l", { step: "any", min: "0", value: "112.5" });
  l.input.value = "112.5";
  const sr = makeNumber("Staples per square yard", "ebc-sr", { step: "any", min: "0", value: "1.5" });
  sr.input.value = "1.5";
  for (const f of [area, overlap, w, l, sr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "18000"; overlap.input.value = "10"; w.input.value = "8"; l.input.value = "112.5"; sr.input.value = "1.5"; update(); });
  const oRolls = makeOutputLine(outputRegion, "Rolls to order", "ebc-out-rolls");
  const oStaples = makeOutputLine(outputRegion, "Staples to order", "ebc-out-staples");
  const update = debounce(() => {
    const r = computeErosionBlanketCoverage({
      area_sf: Number(area.input.value) || 0, overlap_pct: overlap.input.value === "" ? 10 : Number(overlap.input.value),
      roll_width_ft: w.input.value === "" ? 8 : Number(w.input.value), roll_length_ft: l.input.value === "" ? 112.5 : Number(l.input.value),
      staples_per_sy: sr.input.value === "" ? 1.5 : Number(sr.input.value),
    });
    if (r.error) { oRolls.textContent = r.error; oStaples.textContent = "-"; return; }
    oRolls.textContent = r.rolls + " rolls (" + fmt(r.coverage_sy, 0) + " sy slope, " + fmt(r.roll_sy, 0) + " sy/roll)";
    oStaples.textContent = fmt(r.staples, 0) + " staples";
  }, DEBOUNCE_MS);
  for (const f of [area, overlap, w, l, sr]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["erosion-blanket-coverage"] = _v828renderErosionBlanketCoverage;

// --- hydroseed-mix: Hydroseed Slurry Mix and Tank Count ---
//
// Seed + mulch + tackifier solids for an area, and the tank loads to shoot it;
// the mulch dominates the solids and the machine's loading limit sets the count.
// dims: in { area_ac: L^2, seed_rate_lb_ac: dimensionless, mulch_rate_lb_ac: dimensionless, tackifier_rate_lb_ac: dimensionless, tank_gal: L^3, max_load_lb_per_gal: dimensionless } out: { seed_lb: M, mulch_lb: M, tackifier_lb: M, total_solids_lb: M, tanks: dimensionless }
export function computeHydroseedMix({ area_ac = 0, seed_rate_lb_ac = 5, mulch_rate_lb_ac = 2000, tackifier_rate_lb_ac = 50, tank_gal = 3000, max_load_lb_per_gal = 0.4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ac > 0)) return { error: "Area must be positive (acres)." };
  if (!(tank_gal > 0)) return { error: "Tank capacity must be positive (gal)." };
  if (!(max_load_lb_per_gal > 0)) return { error: "Maximum solids loading must be positive (lb/gal)." };
  for (const [v, n] of [[seed_rate_lb_ac, "Seed"], [mulch_rate_lb_ac, "Mulch"], [tackifier_rate_lb_ac, "Tackifier"]]) {
    if (!(v >= 0)) return { error: n + " rate must be non-negative (lb/acre)." };
  }
  const seed_lb = area_ac * seed_rate_lb_ac;
  const mulch_lb = area_ac * mulch_rate_lb_ac;
  const tackifier_lb = area_ac * tackifier_rate_lb_ac;
  const total_solids_lb = seed_lb + mulch_lb + tackifier_lb;
  const tanks = Math.ceil(total_solids_lb / (tank_gal * max_load_lb_per_gal));
  if (![seed_lb, mulch_lb, tackifier_lb, total_solids_lb, tanks].every(Number.isFinite)) return { error: "Hydroseed math is not a finite value." };
  return {
    seed_lb,
    mulch_lb,
    tackifier_lb,
    total_solids_lb,
    tanks,
    note: "The seed, mulch, and tackifier rates come from the spec or agronomist - a bonded fiber matrix on a steep slope runs a much higher mulch rate. The maximum solids loading is an agitation limit of the machine. The seed rate here is a slurry weight, not an agricultural planting density.",
  };
}

function _v829renderHydroseedMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: slurry loading identity by name. solids = area x (seed + mulch + tackifier rates); tanks = ceil(solids / (tank gallons x max loading)). The spec / agronomist sets the rates; the loading is the machine's agitation limit.";
  const ac = makeNumber("Area to hydroseed (acres)", "hsm-ac", { step: "any", min: "0" });
  const seed = makeNumber("Seed rate (lb/acre)", "hsm-seed", { step: "any", min: "0", value: "5" });
  seed.input.value = "5";
  const mulch = makeNumber("Mulch rate (lb/acre)", "hsm-mulch", { step: "any", min: "0", value: "2000" });
  mulch.input.value = "2000";
  const tack = makeNumber("Tackifier rate (lb/acre)", "hsm-tack", { step: "any", min: "0", value: "50" });
  tack.input.value = "50";
  const tank = makeNumber("Hydroseeder tank capacity (gal)", "hsm-tank", { step: "any", min: "0", value: "3000" });
  tank.input.value = "3000";
  const load = makeNumber("Max solids loading (lb/gal)", "hsm-load", { step: "any", min: "0", value: "0.4" });
  load.input.value = "0.4";
  for (const f of [ac, seed, mulch, tack, tank, load]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ac.input.value = "3"; seed.input.value = "5"; mulch.input.value = "2000"; tack.input.value = "50"; tank.input.value = "3000"; load.input.value = "0.4"; update(); });
  const oTanks = makeOutputLine(outputRegion, "Tank loads to shoot", "hsm-out-tanks");
  const oSolids = makeOutputLine(outputRegion, "Total slurry solids", "hsm-out-solids");
  const update = debounce(() => {
    const r = computeHydroseedMix({
      area_ac: Number(ac.input.value) || 0, seed_rate_lb_ac: seed.input.value === "" ? 5 : Number(seed.input.value),
      mulch_rate_lb_ac: mulch.input.value === "" ? 2000 : Number(mulch.input.value), tackifier_rate_lb_ac: tack.input.value === "" ? 50 : Number(tack.input.value),
      tank_gal: tank.input.value === "" ? 3000 : Number(tank.input.value), max_load_lb_per_gal: load.input.value === "" ? 0.4 : Number(load.input.value),
    });
    if (r.error) { oTanks.textContent = r.error; oSolids.textContent = "-"; return; }
    oTanks.textContent = r.tanks + " tank loads";
    oSolids.textContent = fmt(r.total_solids_lb, 0) + " lb (mulch " + fmt(r.mulch_lb, 0) + " lb, seed " + fmt(r.seed_lb, 0) + " lb, tackifier " + fmt(r.tackifier_lb, 0) + " lb)";
  }, DEBOUNCE_MS);
  for (const f of [ac, seed, mulch, tack, tank, load]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["hydroseed-mix"] = _v829renderHydroseedMix;

// --- rock-construction-entrance: Stabilized Construction Entrance Stone ---
//
// The pad of coarse stone at a site exit that knocks mud off tires:
// volume = L x W x depth / 27; tons = L x W x depth x unit weight / 2000.
// dims: in { length_ft: L, width_ft: L, depth_in: L, unit_wt_pcf: M L^-3 } out: { volume_cy: L^3, tons: M }
export function computeRockConstructionEntrance({ length_ft = 50, width_ft = 14, depth_in = 6, unit_wt_pcf = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(length_ft > 0)) return { error: "Length must be positive (ft)." };
  if (!(width_ft > 0)) return { error: "Width must be positive (ft)." };
  if (!(depth_in > 0)) return { error: "Depth must be positive (in)." };
  if (!(unit_wt_pcf > 0)) return { error: "Unit weight must be positive (pcf)." };
  const volume_cy = (length_ft * width_ft * (depth_in / 12)) / 27;
  const tons = (length_ft * width_ft * (depth_in / 12) * unit_wt_pcf) / 2000;
  if (![volume_cy, tons].every(Number.isFinite)) return { error: "Entrance-stone math is not a finite value." };
  return {
    volume_cy,
    tons,
    note: "The general permit or AHJ sets the pad dimensions - commonly at least 50 ft long, the full width of the exit, and 6 in of 1-4 in clean stone over a geotextile separator. The geotextile under the pad is taken off separately. The pad is topped up as it works into the subgrade.",
  };
}

function _v830renderRockConstructionEntrance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: pad take-off identity by name. volume (cy) = length x width x depth/12 / 27; tons = length x width x depth/12 x placed unit weight / 2000. The general permit / AHJ sets the pad dimensions.";
  const l = makeNumber("Entrance length (ft)", "rce-l", { step: "any", min: "0", value: "50" });
  l.input.value = "50";
  const w = makeNumber("Entrance width (ft)", "rce-w", { step: "any", min: "0", value: "14" });
  w.input.value = "14";
  const d = makeNumber("Stone depth (in)", "rce-d", { step: "any", min: "0", value: "6" });
  d.input.value = "6";
  const uw = makeNumber("Placed stone unit weight (pcf)", "rce-uw", { step: "any", min: "0", value: "100" });
  uw.input.value = "100";
  for (const f of [l, w, d, uw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { l.input.value = "50"; w.input.value = "14"; d.input.value = "6"; uw.input.value = "100"; update(); });
  const oTons = makeOutputLine(outputRegion, "Stone to order", "rce-out-tons");
  const oVol = makeOutputLine(outputRegion, "Pad volume", "rce-out-vol");
  const update = debounce(() => {
    const r = computeRockConstructionEntrance({
      length_ft: l.input.value === "" ? 50 : Number(l.input.value), width_ft: w.input.value === "" ? 14 : Number(w.input.value),
      depth_in: d.input.value === "" ? 6 : Number(d.input.value), unit_wt_pcf: uw.input.value === "" ? 100 : Number(uw.input.value),
    });
    if (r.error) { oTons.textContent = r.error; oVol.textContent = "-"; return; }
    oTons.textContent = fmt(r.tons, 1) + " tons";
    oVol.textContent = fmt(r.volume_cy, 1) + " cy";
  }, DEBOUNCE_MS);
  for (const f of [l, w, d, uw]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["rock-construction-entrance"] = _v830renderRockConstructionEntrance;

// --- pipe-flotation: Buried Pipe Flotation and Anti-Flotation Backfill ---
//
// An empty large-diameter pipe in a flooded trench is a boat: the buoyant
// uplift per foot is the weight of water it displaces (Archimedes), resisted
// by the pipe self-weight plus the backfill over it.
//   uplift_plf = water_unit_wt_pcf x (PI/4) x (od_in/12)^2
//   fs = (pipe_weight_plf + backfill_weight_plf) / uplift_plf
//   required_backfill_plf = target_fs x uplift_plf - pipe_weight_plf
// dims: in { pipe_od_in: L, pipe_weight_plf: M T^-2, backfill_weight_plf: M T^-2, target_fs: dimensionless, water_unit_wt_pcf: M L^-2 T^-2 } out: { uplift_plf: M T^-2, resisting_plf: M T^-2, fs: dimensionless, required_backfill_plf: M T^-2 }
export function computePipeFlotation({ pipe_od_in = 48, pipe_weight_plf = 200, backfill_weight_plf = 900, target_fs = 1.5, water_unit_wt_pcf = 62.4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_od_in > 0)) return { error: "Pipe outside diameter must be positive (in)." };
  if (!(water_unit_wt_pcf > 0)) return { error: "Water unit weight must be positive (pcf)." };
  if (!(target_fs > 0)) return { error: "Target factor of safety must be positive." };
  if (pipe_weight_plf < 0) return { error: "Pipe weight cannot be negative (lb/ft)." };
  if (backfill_weight_plf < 0) return { error: "Backfill weight cannot be negative (lb/ft)." };
  const uplift_plf = water_unit_wt_pcf * (Math.PI / 4) * Math.pow(pipe_od_in / 12, 2);
  const resisting_plf = pipe_weight_plf + backfill_weight_plf;
  const fs = resisting_plf / uplift_plf;
  const required_backfill_plf = target_fs * uplift_plf - pipe_weight_plf;
  if (![uplift_plf, resisting_plf, fs, required_backfill_plf].every(Number.isFinite)) return { error: "Flotation math is not a finite value." };
  return {
    uplift_plf,
    resisting_plf,
    fs,
    required_backfill_plf,
    pass: fs >= target_fs,
    note: "Flotation is critical when the pipe is empty and the trench is flooded - a high water table or saturated backfill. Submerged backfill counts only its buoyant (effective) weight, so use the submerged unit weight for any material below the water table. The fixes are more cover, concrete anti-flotation collars, or holding the empty pipe down (ballast) until the backfill is complete. The design engineer governs.",
  };
}

function _v831renderPipeFlotation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Archimedes flotation identity by name. uplift (lb/ft) = water unit weight x pi/4 x OD^2; FS = resisting weight / uplift. Submerged backfill counts only its buoyant weight; the design engineer governs.";
  const od = makeNumber("Pipe outside diameter (in)", "pf-od", { step: "any", min: "0", value: "48" });
  od.input.value = "48";
  const pw = makeNumber("Empty pipe weight (lb/ft)", "pf-pw", { step: "any", min: "0", value: "200" });
  pw.input.value = "200";
  const bw = makeNumber("Resisting backfill weight (lb/ft)", "pf-bw", { step: "any", min: "0", value: "900" });
  bw.input.value = "900";
  const tf = makeNumber("Target factor of safety", "pf-tf", { step: "any", min: "0", value: "1.5" });
  tf.input.value = "1.5";
  const uw = makeNumber("Water unit weight (pcf)", "pf-uw", { step: "any", min: "0", value: "62.4" });
  uw.input.value = "62.4";
  for (const f of [od, pw, bw, tf, uw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "48"; pw.input.value = "200"; bw.input.value = "900"; tf.input.value = "1.5"; uw.input.value = "62.4"; update(); });
  const oFs = makeOutputLine(outputRegion, "Factor of safety", "pf-out-fs");
  const oUplift = makeOutputLine(outputRegion, "Buoyant uplift", "pf-out-uplift");
  const oReq = makeOutputLine(outputRegion, "Backfill to meet the target", "pf-out-req");
  const update = debounce(() => {
    const r = computePipeFlotation({
      pipe_od_in: od.input.value === "" ? 48 : Number(od.input.value), pipe_weight_plf: pw.input.value === "" ? 200 : Number(pw.input.value),
      backfill_weight_plf: bw.input.value === "" ? 900 : Number(bw.input.value), target_fs: tf.input.value === "" ? 1.5 : Number(tf.input.value),
      water_unit_wt_pcf: uw.input.value === "" ? 62.4 : Number(uw.input.value),
    });
    if (r.error) { oFs.textContent = r.error; oUplift.textContent = "-"; oReq.textContent = "-"; return; }
    oFs.textContent = fmt(r.fs, 2) + " - " + (r.pass ? "PASS" : "FAIL") + " (target " + fmt(Number(tf.input.value) || 1.5, 2) + ")";
    oUplift.textContent = fmt(r.uplift_plf, 0) + " lb/ft";
    oReq.textContent = r.required_backfill_plf > 0 ? fmt(r.required_backfill_plf, 0) + " lb/ft" : "0 lb/ft (pipe self-weight alone holds it)";
  }, DEBOUNCE_MS);
  for (const f of [od, pw, bw, tf, uw]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["pipe-flotation"] = _v831renderPipeFlotation;

// --- restrained-pipe-length: Restrained-Joint Length at a Pipe Bend ---
//
// The run of restrained pipe on each side of a bend that mobilizes enough soil
// friction to hold the thrust when a concrete block will not fit.
//   area_in2 = (PI/4) x od_in^2
//   thrust_lb = 2 x pressure_psi x area_in2 x sin(bend_angle_deg/2)
//   length_each_side_ft = thrust_lb / unit_resistance_plf
// dims: in { pipe_od_in: L, pressure_psi: M L^-1 T^-2, bend_angle_deg: dimensionless, unit_resistance_plf: M T^-2 } out: { area_in2: L^2, thrust_lb: M L T^-2, length_each_side_ft: L }
export function computeRestrainedPipeLength({ pipe_od_in = 12, pressure_psi = 150, bend_angle_deg = 90, unit_resistance_plf = 600 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_od_in > 0)) return { error: "Pipe outside diameter must be positive (in)." };
  if (!(pressure_psi > 0)) return { error: "Pressure must be positive (psi)." };
  if (!(unit_resistance_plf > 0)) return { error: "Unit resistance must be positive (lb/ft)." };
  if (!(bend_angle_deg > 0 && bend_angle_deg < 180)) return { error: "Bend angle must be between 0 and 180 degrees." };
  const area_in2 = (Math.PI / 4) * pipe_od_in * pipe_od_in;
  const thrust_lb = 2 * pressure_psi * area_in2 * Math.sin((bend_angle_deg / 2) * (Math.PI / 180));
  const length_each_side_ft = thrust_lb / unit_resistance_plf;
  if (![area_in2, thrust_lb, length_each_side_ft].every(Number.isFinite)) return { error: "Restrained-length math is not a finite value." };
  return {
    area_in2,
    thrust_lb,
    length_each_side_ft,
    note: "The unit soil resistance (pipe friction plus fitting bearing per foot) comes from the restraint manufacturer's tables (EBAA / AWWA M41) with the site soil parameters; enter that value here. This is the restrained-joint alternative to a concrete thrust block. The sine of the half-angle sets how hard the bend pulls. The engineer and AHJ govern.",
  };
}

function _v832renderRestrainedPipeLength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: thrust / restrained-length identity by name. thrust (lb) = 2 x pressure x area x sin(bend/2); length each side (ft) = thrust / unit resistance. The unit resistance comes from the restraint manufacturer's tables (EBAA / AWWA M41).";
  const od = makeNumber("Pipe outside diameter (in)", "rpl-od", { step: "any", min: "0", value: "12" });
  od.input.value = "12";
  const p = makeNumber("Design (test) pressure (psi)", "rpl-p", { step: "any", min: "0", value: "150" });
  p.input.value = "150";
  const ba = makeNumber("Horizontal bend angle (deg)", "rpl-ba", { step: "any", min: "0", value: "90" });
  ba.input.value = "90";
  const ur = makeNumber("Soil resistance per foot (lb/ft)", "rpl-ur", { step: "any", min: "0", value: "600" });
  ur.input.value = "600";
  for (const f of [od, p, ba, ur]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "12"; p.input.value = "150"; ba.input.value = "90"; ur.input.value = "600"; update(); });
  const oLen = makeOutputLine(outputRegion, "Restrained length each side", "rpl-out-len");
  const oThrust = makeOutputLine(outputRegion, "Thrust at the bend", "rpl-out-thrust");
  const update = debounce(() => {
    const r = computeRestrainedPipeLength({
      pipe_od_in: od.input.value === "" ? 12 : Number(od.input.value), pressure_psi: p.input.value === "" ? 150 : Number(p.input.value),
      bend_angle_deg: ba.input.value === "" ? 90 : Number(ba.input.value), unit_resistance_plf: ur.input.value === "" ? 600 : Number(ur.input.value),
    });
    if (r.error) { oLen.textContent = r.error; oThrust.textContent = "-"; return; }
    oLen.textContent = fmt(r.length_each_side_ft, 1) + " ft each side";
    oThrust.textContent = fmt(r.thrust_lb, 0) + " lb";
  }, DEBOUNCE_MS);
  for (const f of [od, p, ba, ur]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["restrained-pipe-length"] = _v832renderRestrainedPipeLength;

// --- hdd-pullback: HDD Pullback Force First-Order Estimate ---
//
// A first-order estimate of the force to draw a product pipe back through a
// horizontal directional bore, per the ASTM F1962 basis (this tile omits the
// full capstan/bend and hydrokinetic drag terms):
//   pullback_lb = friction_coeff x eff_weight_plf x length_ft x bend_factor + fluid_drag_lb
//   utilization = safe pull > 0 ? pullback / safe pull : null
// dims: in { eff_weight_plf: M T^-2, length_ft: L, friction_coeff: dimensionless, bend_factor: dimensionless, fluid_drag_lb: M L T^-2, pipe_safe_pull_lb: M L T^-2 } out: { pullback_lb: M L T^-2, utilization: dimensionless }
export function computeHddPullback({ eff_weight_plf = 5, length_ft = 800, friction_coeff = 0.3, bend_factor = 1.5, fluid_drag_lb = 0, pipe_safe_pull_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(eff_weight_plf > 0)) return { error: "Effective pipe weight must be positive (lb/ft)." };
  if (!(length_ft > 0)) return { error: "Bore length must be positive (ft)." };
  if (!(friction_coeff > 0)) return { error: "Friction coefficient must be positive." };
  if (!(bend_factor > 0)) return { error: "Bend factor must be positive." };
  if (fluid_drag_lb < 0) return { error: "Fluid drag cannot be negative (lb)." };
  if (pipe_safe_pull_lb < 0) return { error: "Pipe safe pull cannot be negative (lb)." };
  const pullback_lb = friction_coeff * eff_weight_plf * length_ft * bend_factor + fluid_drag_lb;
  if (!Number.isFinite(pullback_lb)) return { error: "Pullback math is not a finite value." };
  const utilization = pipe_safe_pull_lb > 0 ? pullback_lb / pipe_safe_pull_lb : null;
  return {
    pullback_lb,
    utilization,
    note: "A first-order estimate: the full ASTM F1962 model adds capstan/bend and hydrokinetic drag terms this tile omits, so treat the result as a floor. The effective pipe weight already accounts for buoyancy in the drilling fluid (a ballasted or empty pipe can be near neutral). The drilling contractor and the rig's rated thrust govern the pull.",
  };
}

function _v833renderHddPullback(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: simplified pullback identity by name (ASTM F1962 basis). pullback (lb) = friction x effective weight x length x bend factor + fluid drag. A first-order estimate; the drilling contractor and rig thrust govern.";
  const ew = makeNumber("Effective pipe weight in fluid (lb/ft)", "hdd-ew", { step: "any", min: "0", value: "5" });
  ew.input.value = "5";
  const ln = makeNumber("Bore / pull length (ft)", "hdd-ln", { step: "any", min: "0", value: "800" });
  ln.input.value = "800";
  const fc = makeNumber("Friction coefficient", "hdd-fc", { step: "any", min: "0", value: "0.3" });
  fc.input.value = "0.3";
  const bf = makeNumber("Pull-path bend factor", "hdd-bf", { step: "any", min: "0", value: "1.5" });
  bf.input.value = "1.5";
  const fd = makeNumber("Hydrokinetic drag allowance (lb)", "hdd-fd", { step: "any", min: "0", value: "0" });
  fd.input.value = "0";
  const sp = makeNumber("Pipe safe pull strength (lb, 0 = skip)", "hdd-sp", { step: "any", min: "0", value: "20000" });
  sp.input.value = "20000";
  for (const f of [ew, ln, fc, bf, fd, sp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ew.input.value = "5"; ln.input.value = "800"; fc.input.value = "0.3"; bf.input.value = "1.5"; fd.input.value = "0"; sp.input.value = "20000"; update(); });
  const oPull = makeOutputLine(outputRegion, "Estimated pullback force", "hdd-out-pull");
  const oUtil = makeOutputLine(outputRegion, "Utilization vs safe pull", "hdd-out-util");
  const update = debounce(() => {
    const r = computeHddPullback({
      eff_weight_plf: ew.input.value === "" ? 5 : Number(ew.input.value), length_ft: ln.input.value === "" ? 800 : Number(ln.input.value),
      friction_coeff: fc.input.value === "" ? 0.3 : Number(fc.input.value), bend_factor: bf.input.value === "" ? 1.5 : Number(bf.input.value),
      fluid_drag_lb: fd.input.value === "" ? 0 : Number(fd.input.value), pipe_safe_pull_lb: sp.input.value === "" ? 0 : Number(sp.input.value),
    });
    if (r.error) { oPull.textContent = r.error; oUtil.textContent = "-"; return; }
    oPull.textContent = fmt(r.pullback_lb, 0) + " lb";
    oUtil.textContent = r.utilization === null ? "- (enter a safe pull to check)" : fmt(r.utilization * 100, 0) + "% of safe pull";
  }, DEBOUNCE_MS);
  for (const f of [ew, ln, fc, bf, fd, sp]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["hdd-pullback"] = _v833renderHddPullback;

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

// ===================== spec-v326..v328: soil characterization / QC batch =====================
// The earthwork and soil-testing numbers the volume-conversion tile never
// covers: the relative compaction of a placed lift, the three-phase relations
// (void ratio, porosity, saturation), and the Atterberg plasticity indices with
// the A-line USCS classification.
const _GAMMA_W = 62.4; // pcf, fresh water

// dims: in { wet_pcf: M L^-2 T^-2, w_pct: dimensionless, max_pcf: M L^-2 T^-2, spec_pct: dimensionless } out: { gd_field: M L^-2 T^-2, rc_pct: dimensionless }
export function computeRelativeCompaction({ wet_pcf = 0, w_pct = 0, max_pcf = 0, spec_pct = 95 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wet_pcf > 0)) return { error: "Field wet density must be positive (pcf)." };
  if (w_pct < 0) return { error: "Moisture content cannot be negative (%)." };
  if (!(max_pcf > 0)) return { error: "Proctor maximum dry density must be positive (pcf)." };
  if (!(spec_pct > 0)) return { error: "The required relative compaction must be positive (%)." };
  const gd_field = wet_pcf / (1 + w_pct / 100);
  const rc_pct = (gd_field / max_pcf) * 100;
  const pass = rc_pct >= spec_pct;
  return {
    gd_field, rc_pct, pass,
    note: "Relative compaction RC = (gamma_d,field / gamma_d,max) x 100, with the field dry density backed out of the measured wet density and moisture, gamma_d,field = gamma_wet / (1 + w). The Proctor maximum is from ASTM D698 (standard) or D1557 (modified), and typical specs run 90-95% (structural fill often 95%, pavement subgrade higher). The moisture reading is as important as the density - the same wet density fails when the extra water is not soil, which is why over-wet fill is rejected. Enter the Proctor maximum (it depends on the standard vs modified test and the soil); it does not compute the optimum-moisture window, the one-point Proctor, or the cohesionless relative density Dr. A QC aid; the project geotechnical specification and the testing agency govern.",
  };
}
export const relativeCompactionExample = { inputs: { wet_pcf: 128, w_pct: 12, max_pcf: 120, spec_pct: 95 } };

function _v326renderRelativeCompaction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: relative compaction RC = (gamma_d,field / gamma_d,max) x 100, field dry density gamma_d,field = gamma_wet / (1 + w), Proctor maximum from ASTM D698 / D1557, typical 90-95% specs, by name. Enter the Proctor maximum. A QC aid; the geotechnical spec governs.";
  const wet = makeNumber("Field wet density (pcf)", "rc-wet", { step: "any", min: "0" });
  const w = makeNumber("Field moisture content (%)", "rc-w", { step: "any", min: "0" });
  const max = makeNumber("Proctor maximum dry density (pcf)", "rc-max", { step: "any", min: "0" });
  const spec = makeNumber("Required relative compaction (%)", "rc-spec", { step: "any", min: "0" }); spec.input.value = "95";
  for (const f of [wet, w, max, spec]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wet.input.value = "128"; w.input.value = "12"; max.input.value = "120"; spec.input.value = "95"; update(); });
  const oGd = makeOutputLine(outputRegion, "Field dry density", "rc-out-gd");
  const oRc = makeOutputLine(outputRegion, "Relative compaction", "rc-out-rc");
  const oNote = makeOutputLine(outputRegion, "Note", "rc-out-note");
  const update = debounce(() => {
    const r = computeRelativeCompaction({ wet_pcf: Number(wet.input.value) || 0, w_pct: Number(w.input.value) || 0, max_pcf: Number(max.input.value) || 0, spec_pct: Number(spec.input.value) || 0 });
    if (r.error) { oGd.textContent = r.error; oRc.textContent = "-"; oNote.textContent = "-"; return; }
    oGd.textContent = fmt(r.gd_field, 1) + " pcf";
    oRc.textContent = fmt(r.rc_pct, 1) + "% - " + (r.pass ? "PASS" : "FAIL") + " (spec " + fmt(Number(spec.input.value) || 0, 0) + "%)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [wet, w, max, spec]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["relative-compaction"] = _v326renderRelativeCompaction;

// dims: in { gamma_pcf: M L^-2 T^-2, w_pct: dimensionless, gs: dimensionless } out: { gamma_d_pcf: M L^-2 T^-2, e_ratio: dimensionless, n_porosity: dimensionless, s_pct: dimensionless }
export function computeSoilPhaseRelations({ gamma_pcf = 0, w_pct = 0, gs = 2.70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gamma_pcf > 0)) return { error: "Total unit weight must be positive (pcf)." };
  if (w_pct < 0) return { error: "Water content cannot be negative (%)." };
  if (!(gs > 0)) return { error: "Specific gravity of solids must be positive (~2.65-2.72)." };
  const gamma_d_pcf = gamma_pcf / (1 + w_pct / 100);
  const e_ratio = (gs * _GAMMA_W) / gamma_d_pcf - 1;
  if (!(e_ratio > 0)) return { error: "The inputs give a non-positive void ratio - check the unit weight and Gs (an impossibly dense soil)." };
  const n_porosity = e_ratio / (1 + e_ratio);
  const s_pct = ((w_pct / 100) * gs) / e_ratio * 100;
  return {
    gamma_d_pcf, e_ratio, n_porosity, s_pct,
    note: "Soil three-phase relations from the total unit weight, water content, and specific gravity of solids: dry unit weight gamma_d = gamma/(1 + w), void ratio e = Gs gamma_w/gamma_d - 1, porosity n = e/(1 + e), degree of saturation S = w Gs/e, with gamma_w = 62.4 pcf (fresh water) and Gs ~ 2.65-2.72 for common soils. The void ratio feeds a consolidation settlement, the porosity a seepage calc, and the saturation says how much air is left to squeeze out. Enter Gs (measure or estimate by soil type); it does not compute the permeability, the effective stress, or the compaction relative density. An engineering aid; the soil test data govern.",
  };
}
export const soilPhaseRelationsExample = { inputs: { gamma_pcf: 120, w_pct: 15, gs: 2.70 } };

function _v327renderSoilPhaseRelations(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: soil phase relations gamma_d = gamma/(1 + w), e = Gs gamma_w/gamma_d - 1, n = e/(1 + e), S = w Gs/e, with gamma_w = 62.4 pcf and Gs ~ 2.65-2.72, per Das / NAVFAC, by name. Enter Gs; fresh water. An engineering aid; the soil test data govern.";
  const g = makeNumber("Total (moist) unit weight (pcf)", "spr-g", { step: "any", min: "0" });
  const w = makeNumber("Water content (%)", "spr-w", { step: "any", min: "0" });
  const gs = makeNumber("Specific gravity of solids Gs", "spr-gs", { step: "any", min: "0" }); gs.input.value = "2.70";
  for (const f of [g, w, gs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { g.input.value = "120"; w.input.value = "15"; gs.input.value = "2.70"; update(); });
  const oGd = makeOutputLine(outputRegion, "Dry unit weight", "spr-out-gd");
  const oEn = makeOutputLine(outputRegion, "Void ratio / porosity", "spr-out-en");
  const oS = makeOutputLine(outputRegion, "Degree of saturation", "spr-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "spr-out-note");
  const update = debounce(() => {
    const r = computeSoilPhaseRelations({ gamma_pcf: Number(g.input.value) || 0, w_pct: Number(w.input.value) || 0, gs: Number(gs.input.value) || 0 });
    if (r.error) { oGd.textContent = r.error; oEn.textContent = "-"; oS.textContent = "-"; oNote.textContent = "-"; return; }
    oGd.textContent = fmt(r.gamma_d_pcf, 1) + " pcf";
    oEn.textContent = "e = " + fmt(r.e_ratio, 3) + " / n = " + fmt(r.n_porosity, 3);
    oS.textContent = fmt(r.s_pct, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [g, w, gs]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["soil-phase-relations"] = _v327renderSoilPhaseRelations;

// dims: in { ll: dimensionless, pl: dimensionless, w_pct: dimensionless } out: { pi: dimensionless, aline: dimensionless, li: dimensionless }
export function computeAtterbergIndices({ ll = 0, pl = 0, w_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ll > 0)) return { error: "Liquid limit must be positive (%)." };
  if (!(pl > 0)) return { error: "Plastic limit must be positive (%)." };
  if (!(ll > pl)) return { error: "The liquid limit must exceed the plastic limit (a soil with PL >= LL is nonplastic)." };
  const pi = ll - pl;
  const aline = 0.73 * (ll - 20);
  const above_a = pi > aline;
  const group = above_a ? (ll < 50 ? "CL (lean clay)" : "CH (fat clay)") : (ll < 50 ? "ML (silt)" : "MH (elastic silt)");
  const li = w_pct > 0 ? (w_pct - pl) / pi : null;
  return {
    pi, aline, above_a, group, li,
    note: "Atterberg limits: the plasticity index PI = LL - PL (liquid minus plastic limit), the liquidity index LI = (w - PL)/PI (where the in-situ water content sits between the limits), and the USCS A-line PI = 0.73(LL - 20). A soil plotting above the A-line is a clay (CL/CH), below it a silt (ML/MH), with the LL = 50 line splitting low from high plasticity - and in the low-PI range the A-line, not PI alone, separates a silt from a lean clay. Classification by the A-line/LL=50 chart (the full USCS also needs the fines content and gradation for a coarse or dual classification), limits from ASTM D4318; it does not compute the shrink-swell potential, the activity, or the coarse-fraction sieve classification. An engineering aid; the soil test data and the geotechnical engineer govern.",
  };
}
export const atterbergIndicesExample = { inputs: { ll: 45, pl: 22, w_pct: 30 } };

function _v328renderAtterbergIndices(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Atterberg plasticity index PI = LL - PL, liquidity index LI = (w - PL)/PI, and the USCS A-line PI = 0.73(LL - 20) with the LL = 50 low/high split, ASTM D4318, by name. Fine-grained chart classification only. An engineering aid; the soil test data govern.";
  const ll = makeNumber("Liquid limit LL (%)", "att-ll", { step: "any", min: "0" });
  const pl = makeNumber("Plastic limit PL (%)", "att-pl", { step: "any", min: "0" });
  const w = makeNumber("In-situ water content (%, optional for LI)", "att-w", { step: "any", min: "0" });
  for (const f of [ll, pl, w]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ll.input.value = "45"; pl.input.value = "22"; w.input.value = "30"; update(); });
  const oPi = makeOutputLine(outputRegion, "Plasticity index (A-line PI)", "att-out-pi");
  const oGroup = makeOutputLine(outputRegion, "USCS group", "att-out-group");
  const oLi = makeOutputLine(outputRegion, "Liquidity index", "att-out-li");
  const oNote = makeOutputLine(outputRegion, "Note", "att-out-note");
  const update = debounce(() => {
    const r = computeAtterbergIndices({ ll: Number(ll.input.value) || 0, pl: Number(pl.input.value) || 0, w_pct: Number(w.input.value) || 0 });
    if (r.error) { oPi.textContent = r.error; oGroup.textContent = "-"; oLi.textContent = "-"; oNote.textContent = "-"; return; }
    oPi.textContent = fmt(r.pi, 1) + " (A-line " + fmt(r.aline, 1) + ", " + (r.above_a ? "above" : "below") + ")";
    oGroup.textContent = r.group;
    oLi.textContent = r.li === null ? "- (enter water content)" : fmt(r.li, 2);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ll, pl, w]) f.input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["atterberg-indices"] = _v328renderAtterbergIndices;

// ===================== spec-v799: aggregate fineness modulus (ASTM C136/C125) =====================
// FM = sum of the cumulative percent retained on the standard sieves / 100. For fine aggregate the
// contributing sieves are #4, #8, #16, #30, #50, #100 (coarser sieves retain ~0% of a sand).
// dims: in { r4: dimensionless, r8: dimensionless, r16: dimensionless, r30: dimensionless, r50: dimensionless, r100: dimensionless } out: { fm: dimensionless }
export function computeFinenessModulus({ r4 = 0, r8 = 0, r16 = 0, r30 = 0, r50 = 0, r100 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vals = [Number(r4), Number(r8), Number(r16), Number(r30), Number(r50), Number(r100)];
  if (!vals.every(Number.isFinite)) return { error: "Enter valid cumulative percent-retained values." };
  if (!vals.every((v) => v >= 0 && v <= 100)) return { error: "Each cumulative percent retained must be between 0 and 100." };
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] < vals[i - 1]) return { error: "Cumulative percent retained must not decrease from the coarse (#4) to the fine (#100) sieve." };
  }
  const fm = vals.reduce((a, b) => a + b, 0) / 100;
  if (!Number.isFinite(fm)) return { error: "Fineness-modulus math is not a finite value." };
  let band;
  if (fm < 2.3) band = "fine sand (below the ASTM C33 2.3-3.1 concrete-sand band -- more paste/water demand)";
  else if (fm <= 3.1) band = "within the ASTM C33 concrete-sand band (2.3-3.1)";
  else band = "coarse sand (above the ASTM C33 2.3-3.1 band -- harsh, less workable mix)";
  return {
    fm, band,
    note: "Fineness modulus (ASTM C136 / C125) = the sum of the cumulative percent retained on the standard sieves, divided by 100 -- a single number that captures how coarse or fine a sand is (a higher FM is coarser). For fine aggregate the contributing sieves are #4, #8, #16, #30, #50, and #100; coarser sieves retain essentially none of a sand, so they add 0. ASTM C33 holds concrete sand to an FM of 2.3-3.1, and the sand a mix was designed for should not drift more than 0.20 from batch to batch without a mix adjustment, because a coarser sand (higher FM) needs less paste and a finer one needs more water for the same slump. It is a gradation SUMMARY, not the full sieve analysis -- it does not check whether each sieve meets its C33 grading band, and two very different gradations can share an FM. A QC / mix-proportioning aid; the sieve analysis and the mix design govern.",
  };
}
export const finenessModulusExample = { inputs: { r4: 2, r8: 12, r16: 32, r30: 57, r50: 82, r100: 95 } };

function _v799renderFinenessModulus(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: aggregate fineness modulus (ASTM C136 sieve analysis / C125 definition): FM = sum of the cumulative percent retained on the #4, #8, #16, #30, #50, #100 sieves / 100. ASTM C33 holds concrete sand to FM 2.3-3.1, and it should not drift more than 0.20 without a mix adjustment. A gradation summary, not the full sieve check. A QC aid; the sieve analysis and mix design govern.";
  const defs = [["r4", "Cumulative % retained, #4"], ["r8", "#8"], ["r16", "#16"], ["r30", "#30"], ["r50", "#50"], ["r100", "#100"]];
  const fields = {};
  for (const [key, label] of defs) { fields[key] = makeNumber(label, "fm-" + key, { step: "any", min: "0", max: "100" }); inputRegion.appendChild(fields[key].wrap); }
  attachExampleButton(inputRegion, () => { fields.r4.input.value = "2"; fields.r8.input.value = "12"; fields.r16.input.value = "32"; fields.r30.input.value = "57"; fields.r50.input.value = "82"; fields.r100.input.value = "95"; update(); });
  const oFm = makeOutputLine(outputRegion, "Fineness modulus", "fm-out-fm");
  const oBand = makeOutputLine(outputRegion, "Against ASTM C33", "fm-out-band");
  const oNote = makeOutputLine(outputRegion, "Note", "fm-out-note");
  const update = debounce(() => {
    const args = {}; for (const [key] of defs) args[key] = Number(fields[key].input.value) || 0;
    const r = computeFinenessModulus(args);
    if (r.error) { oFm.textContent = r.error; oBand.textContent = "-"; oNote.textContent = "-"; return; }
    oFm.textContent = fmt(r.fm, 2);
    oBand.textContent = r.band;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const [key] of defs) fields[key].input.addEventListener("input", update);
}
EARTHWORK_RENDERERS["fineness-modulus"] = _v799renderFinenessModulus;
