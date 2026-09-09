// Group M: pool and spa service.
//
// spec-v1701..v1704 (scope-trade-expansion-2, the pool and spa band): the
// four numbers a pool service business actually runs on -- what evaporation
// costs and what a cover saves, what slowing the pump saves once the turnover
// is held constant, what a heat pump delivers in the shoulder season it was
// bought for, and how often a spa has to be drained.
//
// Split into its own module rather than added to calc-treatment.js, which
// sits at 99.6% of its size cap. The `pool-service` trade already exists.
//
// The thread through all four is that the headline number is not the one that
// governs. Evaporation is the largest heat loss on an outdoor pool and it is
// invisible. The cube law promises a 87.5% pump saving and delivers 75% once
// the water still has to be turned over. A heat pump's rating is a summer
// condition and the owner bought it for spring. And a spa's drain interval is
// set by bather load against a small volume, which is why the same rule that
// drains a spa every three weeks leaves a pool for three years.

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
// Compact renderer factory, copied verbatim from calc-hygiene.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _plRender = function (inputRegion, outputRegion, citationEl) {
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

  _plRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _plRender;
}

export const POOL_RENDERERS = {};

// =====================================================================
// spec-v1701: pool cover evaporation and heat loss savings.
// =====================================================================
const _POOL_GAL_PER_CU_FT = 7.481;
const _POOL_LB_PER_GAL = 8.34;
const _POOL_LATENT_BTU_PER_LB = 1046;
// dims: in { surface_area_ft2: L^2, evaporation_in_day: L T^-1, cover_effectiveness_pct: dimensionless, cover_hours_per_day: T, heater_efficiency_pct: dimensionless, fuel_cost_per_mmbtu: dimensionless, season_days: T } out: { gallons_per_day: L^3 T^-1, pounds_per_day: M T^-1, mmbtu_per_day: L^2 M T^-2, cover_saving_mmbtu_day: L^2 M T^-2, season_saving_mmbtu: L^2 M T^-2, season_saving_cost: dimensionless }
export function computePoolCoverEvaporation({
  surface_area_ft2 = 0, evaporation_in_day = 0, cover_effectiveness_pct = 90,
  cover_hours_per_day = 0, heater_efficiency_pct = 82, fuel_cost_per_mmbtu = 0, season_days = 180,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(surface_area_ft2 > 0)) return { error: "Pool surface area must be positive (ft^2)." };
  if (!(evaporation_in_day > 0)) return { error: "The evaporation rate must be positive (in/day)." };
  if (cover_effectiveness_pct < 0 || cover_effectiveness_pct > 100) return { error: "Cover effectiveness must be between 0 and 100 percent." };
  if (cover_hours_per_day < 0 || cover_hours_per_day > 24) return { error: "Cover hours must be between 0 and 24." };
  if (!(heater_efficiency_pct > 0) || heater_efficiency_pct > 100) return { error: "Heater efficiency must be above 0 and no more than 100 percent." };
  if (fuel_cost_per_mmbtu < 0 || season_days < 0) return { error: "Fuel cost and season length cannot be negative." };
  const cu_ft_per_day = surface_area_ft2 * evaporation_in_day / 12;
  const gallons_per_day = cu_ft_per_day * _POOL_GAL_PER_CU_FT;
  const pounds_per_day = gallons_per_day * _POOL_LB_PER_GAL;
  const btu_per_day = pounds_per_day * _POOL_LATENT_BTU_PER_LB;
  const mmbtu_per_day = btu_per_day / 1e6;
  const loss_verdict = "a " + fmt(surface_area_ft2, 0) + " sq ft pool losing " + fmt(evaporation_in_day, 3) + " in a day evaporates " + fmt(gallons_per_day, 0) + " gallons (" + fmt(pounds_per_day, 0) + " lb), and at " + fmt(_POOL_LATENT_BTU_PER_LB, 0) + " BTU per pound of latent heat that is " + fmt(mmbtu_per_day, 2) + " MMBTU a day -- to evaporation ALONE, on a pool losing only a quarter inch";
  const has_cover = cover_hours_per_day > 0 && cover_effectiveness_pct > 0;
  const cover_fraction = has_cover ? (cover_effectiveness_pct / 100) * (cover_hours_per_day / 24) : 0;
  const cover_saving_mmbtu_day = mmbtu_per_day * cover_fraction;
  const cover_verdict = !has_cover
    ? "(no cover hours and effectiveness entered)"
    : "a cover at " + fmt(cover_effectiveness_pct, 0) + "% effectiveness on for " + fmt(cover_hours_per_day, 0) + " hours a day saves " + fmt(cover_saving_mmbtu_day, 2) + " MMBTU a day -- " + fmt(cover_fraction * 100, 0) + "% of the evaporative loss, because it only works while it is ON. The hours matter as much as the effectiveness, and a cover that is on overnight catches the coldest, driest hours when evaporation is fastest";
  const has_cost = fuel_cost_per_mmbtu > 0 && season_days > 0 && has_cover;
  const season_saving_mmbtu = has_cover ? cover_saving_mmbtu_day * season_days : 0;
  const fuel_mmbtu = has_cover ? season_saving_mmbtu / (heater_efficiency_pct / 100) : 0;
  const season_saving_cost = has_cost ? fuel_mmbtu * fuel_cost_per_mmbtu : 0;
  const cost_verdict = !has_cost
    ? "(no fuel cost and season length entered)"
    : "over a " + fmt(season_days, 0) + " day season that is " + fmt(season_saving_mmbtu, 1) + " MMBTU of pool heat, or " + fmt(fuel_mmbtu, 1) + " MMBTU of FUEL at " + fmt(heater_efficiency_pct, 0) + "% heater efficiency -- " + fmt(season_saving_cost, 0) + " at " + fmt(fuel_cost_per_mmbtu, 2) + " per MMBTU. Note the division by efficiency: the saving is fuel not bought, so it is larger than the heat saved";
  const water_verdict = "AND THE WATER IS A SECOND SAVING that the heat figure hides. " + fmt(gallons_per_day, 0) + " gallons a day is " + fmt(gallons_per_day * (season_days > 0 ? season_days : 180), 0) + " gallons over the season, all of it treated and chemically balanced, and all of it replaced with cold water that then has to be heated. A cover reduces that in the same proportion it reduces the heat";
  const dominance_verdict = "EVAPORATION IS THE LARGEST LOSS ON MOST OUTDOOR POOLS and it is the one nobody sees. Radiation, convection and conduction to the ground are all real and all smaller, and a pool owner reasoning about heat loss usually reasons about the air temperature -- which is why the single most effective thing available is a cover, and why the second is a windbreak. Wind drives evaporation hard: the rate entered here is not a constant, it rises steeply with wind speed and falls with humidity, so a sheltered pool and an exposed one at the same air temperature lose quite different amounts";
  if (![gallons_per_day, pounds_per_day, mmbtu_per_day, cover_saving_mmbtu_day, season_saving_mmbtu, season_saving_cost].every(Number.isFinite)) return { error: "Pool evaporation math is not a finite value." };
  return {
    cu_ft_per_day, gallons_per_day, pounds_per_day, btu_per_day, mmbtu_per_day, loss_verdict,
    has_cover, cover_fraction, cover_saving_mmbtu_day, cover_verdict,
    season_saving_mmbtu, fuel_mmbtu, has_cost, season_saving_cost, cost_verdict,
    water_verdict, dominance_verdict,
    note: "What evaporation costs a pool and what a cover saves. On most outdoor pools it is the largest item in the heating bill. Every pound of water that leaves the surface takes its latent heat of vaporisation with it -- about 1,046 BTU -- so a quarter inch a day off a modest pool is over a million BTU a day, before any consideration of the air temperature. EVAPORATION DOMINATES, AND THE INTUITION DOES NOT. Radiation, convection and conduction to the ground are all real and all smaller, and an owner reasoning about pool heat loss reasons about how cold the air is. That is why the most effective single measure is a cover and the second is a windbreak: wind drives evaporation hard, so a sheltered pool and an exposed one at the same air temperature lose quite different amounts. The evaporation rate is entered rather than derived precisely because it depends on wind, humidity and the water-to-air temperature difference together, and a single figure for a site is worth more than a formula applied to the wrong conditions. A COVER ONLY WORKS WHILE IT IS ON, which is the arithmetic owners skip. Effectiveness and hours multiply: a 90 percent cover on for two thirds of the day saves 60 percent of the evaporative loss, not 90. The hours that matter most are overnight, when the air is coldest and driest and evaporation is fastest, so a cover pulled on at dusk and off in the morning captures more than its hours alone suggest. THE FUEL SAVING IS LARGER THAN THE HEAT SAVING, by the heater's efficiency. Heat not lost is fuel not bought, and dividing by the efficiency is the step that turns a thermal figure into a bill -- an 82 percent heater means every MMBTU of pool heat saved is 1.22 MMBTU of fuel. And the water is a second saving the heat figure hides: the gallons evaporated are treated, balanced water, replaced with cold make-up that then has to be heated and re-balanced. This computes from an entered evaporation rate. It does not predict evaporation from weather conditions (which needs wind speed, humidity, and water and air temperatures, and is the largest uncertainty here), model the other loss paths or the pool's total heat load, size a heater, account for splash-out, backwash or leaks -- which a make-up water figure cannot distinguish from evaporation -- evaluate a cover's insulating value when the pool is warmer than the air, or address the safety requirements a pool cover carries. ASHRAE Applications for pool evaporation, the cover manufacturer's data, and the pool professional govern.",
  };
}
export const poolCoverEvaporationExample = { inputs: { surface_area_ft2: 800, evaporation_in_day: 0.25, cover_effectiveness_pct: 90, cover_hours_per_day: 16, heater_efficiency_pct: 82, fuel_cost_per_mmbtu: 12, season_days: 180 } };
POOL_RENDERERS["pool-cover-evaporation"] = _simpleRenderer({
  citation: "Citation: evaporative heat loss = surface area × evaporation depth × 7.481 gal/ft³ × 8.34 lb/gal × 1,046 BTU/lb latent heat; a cover's saving is that loss times its effectiveness times the fraction of the day it is on, and the FUEL saving divides by the heater efficiency. The evaporation rate is ENTERED because it depends on wind, humidity and the water-to-air temperature difference together, and is the largest uncertainty here. It does not predict evaporation from weather, model the other loss paths or the total heat load, size a heater, distinguish evaporation from splash-out or leaks, or address pool cover safety requirements. ASHRAE Applications and the pool professional govern.",
  example: poolCoverEvaporationExample.inputs,
  fields: [
    { key: "surface_area_ft2", label: "Pool surface area (ft²)", kind: "number", attrs: { step: "any" } },
    { key: "evaporation_in_day", label: "Evaporation rate (in/day)", kind: "number", attrs: { step: "any" } },
    { key: "cover_effectiveness_pct", label: "Cover effectiveness (%)", kind: "number", default: 90, attrs: { step: "any" } },
    { key: "cover_hours_per_day", label: "Hours the cover is on (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "heater_efficiency_pct", label: "Heater efficiency (%)", kind: "number", default: 82, attrs: { step: "any" } },
    { key: "fuel_cost_per_mmbtu", label: "Fuel cost per MMBTU (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "season_days", label: "Season length (days)", kind: "number", default: 180, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "l", id: "pce-out-l", label: "Evaporative loss", value: (r) => r.loss_verdict },
    { key: "c", id: "pce-out-c", label: "What a cover saves", value: (r) => r.cover_verdict },
    { key: "s", id: "pce-out-s", label: "Over a season", value: (r) => r.cost_verdict },
    { key: "w", id: "pce-out-w", label: "The water as well", value: (r) => r.water_verdict },
    { key: "d", id: "pce-out-d", label: "Why evaporation dominates", value: (r) => r.dominance_verdict },
    { key: "n", id: "pce-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoolCoverEvaporation,
});

// =====================================================================
// spec-v1702: pool pump speed reduction, at constant turnover.
// =====================================================================
//
// The spec left an unrendered python placeholder for its annual saving:
// `${8.9*365*0.16:,.0f}`, which resolves to $520. The surrounding arithmetic
// is sound and is reproduced here.
//
// NOT a duplicate of `vfd-energy-savings`, which sums power over FIXED HOUR
// BINS. A pool must still turn its water over, so halving the speed takes an
// eighth of the power and TWICE the run time -- a quarter of the energy, not
// an eighth. Same affinity relation, different binding constraint, and the
// difference is the number an owner is quoted.
// =====================================================================
const _POOL_KW_PER_HP = 0.7457;
// dims: in { pump_hp: L^2 M T^-3, full_speed_hours: T, speed_fraction: dimensionless, electricity_rate_per_kwh: dimensionless, days_per_year: dimensionless, minimum_flow_fraction: dimensionless } out: { full_kw: L^2 M T^-3, reduced_kw: L^2 M T^-3, reduced_hours: T, full_kwh_day: L^2 M T^-2, reduced_kwh_day: L^2 M T^-2, saving_kwh_day: L^2 M T^-2, annual_saving_cost: dimensionless, energy_fraction: dimensionless }
export function computePoolPumpSpeedSavings({
  pump_hp = 0, full_speed_hours = 0, speed_fraction = 0.5,
  electricity_rate_per_kwh = 0, days_per_year = 365, minimum_flow_fraction = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pump_hp > 0)) return { error: "Pump horsepower must be positive." };
  if (!(full_speed_hours > 0)) return { error: "Full-speed run hours must be positive." };
  if (!(speed_fraction > 0) || speed_fraction >= 1) return { error: "The speed fraction must be above 0 and below 1." };
  if (electricity_rate_per_kwh < 0 || days_per_year < 0) return { error: "Electricity rate and days per year cannot be negative." };
  if (minimum_flow_fraction < 0 || minimum_flow_fraction > 1) return { error: "The minimum flow fraction must be between 0 and 1." };
  const full_kw = pump_hp * _POOL_KW_PER_HP;
  // Affinity: flow with N, power with N^3.
  const power_fraction = Math.pow(speed_fraction, 3);
  const reduced_kw = full_kw * power_fraction;
  // The turnover is held constant, so the run time extends inversely with flow.
  const reduced_hours = full_speed_hours / speed_fraction;
  const energy_fraction = power_fraction / speed_fraction;
  const full_kwh_day = full_kw * full_speed_hours;
  const reduced_kwh_day = reduced_kw * reduced_hours;
  const saving_kwh_day = full_kwh_day - reduced_kwh_day;
  const affinity_verdict = "at " + fmt(speed_fraction * 100, 0) + "% speed the pump moves " + fmt(speed_fraction * 100, 0) + "% of the flow and draws " + fmt(power_fraction * 100, 1) + "% of the power -- the cube law. But the same water still has to be turned over, so the run time goes from " + fmt(full_speed_hours, 1) + " to " + fmt(reduced_hours, 1) + " hours";
  const energy_verdict = "ENERGY PER TURNOVER IS THE NUMBER THAT COUNTS, and it is " + fmt(energy_fraction * 100, 1) + "% of full speed -- the cube of the speed divided by the speed, which is the SQUARE. A " + fmt(speed_fraction * 100, 0) + "% speed gives a " + fmt((1 - energy_fraction) * 100, 0) + "% saving, not the " + fmt((1 - power_fraction) * 100, 1) + "% the power figure alone suggests. Quoting the power saving for a pool overstates it by " + fmt((1 - power_fraction) / (1 - energy_fraction), 2) + " times";
  const daily_verdict = fmt(full_kw, 2) + " kW for " + fmt(full_speed_hours, 1) + " h is " + fmt(full_kwh_day, 1) + " kWh a day at full speed, against " + fmt(reduced_kw, 2) + " kW for " + fmt(reduced_hours, 1) + " h -- " + fmt(reduced_kwh_day, 1) + " kWh, a saving of " + fmt(saving_kwh_day, 1) + " kWh a day";
  const has_cost = electricity_rate_per_kwh > 0 && days_per_year > 0;
  const annual_saving_cost = has_cost ? saving_kwh_day * days_per_year * electricity_rate_per_kwh : 0;
  const cost_verdict = !has_cost
    ? "(no electricity rate entered)"
    : "over " + fmt(days_per_year, 0) + " days at " + fmt(electricity_rate_per_kwh, 3) + " per kWh that is " + fmt(annual_saving_cost, 0) + " a year -- which on most pools pays for a variable speed pump inside two or three seasons, and is the reason many jurisdictions now require one";
  const has_minimum = minimum_flow_fraction > 0;
  const below_minimum = has_minimum && speed_fraction < minimum_flow_fraction;
  const equipment_verdict = !has_minimum
    ? "(no equipment minimum flow entered -- and heaters, chlorinators, cleaners and some filters have one)"
    : below_minimum
      ? "BUT " + fmt(speed_fraction * 100, 0) + "% SPEED IS BELOW THE " + fmt(minimum_flow_fraction * 100, 0) + "% MINIMUM FLOW the equipment needs. A heater will not fire, a salt cell will not generate, a suction cleaner will not drive, and a solar system will not lift. The usual answer is a schedule: a short high-speed period for the equipment that needs flow, and the rest of the turnover at low speed"
      : fmt(speed_fraction * 100, 0) + "% speed is above the " + fmt(minimum_flow_fraction * 100, 0) + "% minimum the equipment needs, so a single low-speed schedule works here";
  const filtration_verdict = "AND FILTRATION IS BETTER AT LOW FLOW, NOT WORSE, which is the counterintuitive part. Slower water through a sand or cartridge bed gives finer particles time to be captured rather than driven through, so long slow filtration cleans better than short fast filtration as well as costing less. The instinct that a pump on low speed is 'not really doing anything' has it backwards";
  if (![full_kw, reduced_kw, reduced_hours, full_kwh_day, reduced_kwh_day, saving_kwh_day, annual_saving_cost, energy_fraction].every(Number.isFinite)) return { error: "Pool pump math is not a finite value." };
  return {
    full_kw, power_fraction, reduced_kw, reduced_hours, energy_fraction,
    full_kwh_day, reduced_kwh_day, saving_kwh_day,
    affinity_verdict, energy_verdict, daily_verdict,
    has_cost, annual_saving_cost, cost_verdict,
    has_minimum, below_minimum, equipment_verdict, filtration_verdict,
    note: "What slowing a pool pump actually saves, once the pool still has to be turned over. The affinity laws give flow proportional to speed and power to the CUBE of speed, so half speed is an eighth of the power -- and that is the figure a variable speed pump is sold on. IT IS NOT THE SAVING, BECAUSE THE TURNOVER IS FIXED. A pool needs its volume moved through the filter regardless of how fast the pump runs, so halving the speed doubles the run time. An eighth of the power for twice as long is a QUARTER of the energy: the cube divided by the speed, which is the square. That is still an excellent saving, and it is half again less than the number the power ratio alone suggests, so quoting the cube law to a pool owner overstates the result. THE EQUIPMENT MINIMUM IS THE REAL CONSTRAINT and it is what stops the answer being 'run as slow as possible'. A gas heater will not fire below its minimum flow, a salt chlorine generator will not produce, a pressure or suction cleaner will not drive, and a solar collector will not lift water to the roof. The usual resolution is a schedule rather than a single speed: a short high-speed period for whatever needs flow, and the balance of the turnover at the lowest speed the filter and the plumbing allow. AND FILTRATION IMPROVES AT LOW FLOW, which surprises people. Slower water through the medium gives fine particles time to be intercepted instead of being driven through, so a long slow cycle filters better than a short fast one as well as costing less. The instinct that a pump idling on low speed is not doing real work is exactly backwards, and it is the reason single-speed pumps ran short and hard for decades. This computes energy from entered figures. It does not model the pump curve or the system curve (the affinity relations assume the pump follows its curve on a fixed system, and a real installation has static head from the solar or the spa spillway that flattens it), determine the turnover a pool needs or the flow its filter is rated for, size a pump or a filter, account for motor and drive efficiency changing with speed, or evaluate what any code requires. The pump manufacturer's curve, the filter's rated flow, and the pool professional govern.",
  };
}
export const poolPumpSpeedSavingsExample = { inputs: { pump_hp: 2, full_speed_hours: 8, speed_fraction: 0.5, electricity_rate_per_kwh: 0.16, days_per_year: 365, minimum_flow_fraction: 0.4 } };
POOL_RENDERERS["pool-pump-speed-savings"] = _simpleRenderer({
  citation: "Citation: the pump affinity laws -- flow ∝ speed, power ∝ speed³ -- with the TURNOVER held constant, so the run time extends inversely with flow and the energy per turnover is speed³/speed = speed². Half speed is ⅛ the power but 2× the hours, giving ¼ the energy, not ⅛. Equipment minimum flow (heater, salt cell, cleaner, solar) is ENTERED because it is what stops the answer being 'as slow as possible'. It does not model the pump or system curve (static head from solar or a spillway flattens it), determine the required turnover or the filter's rated flow, size a pump, or account for motor and drive efficiency changing with speed. The pump manufacturer's curve and the pool professional govern.",
  example: poolPumpSpeedSavingsExample.inputs,
  fields: [
    { key: "pump_hp", label: "Pump horsepower", kind: "number", attrs: { step: "any" } },
    { key: "full_speed_hours", label: "Full-speed run hours per day", kind: "number", attrs: { step: "any" } },
    { key: "speed_fraction", label: "Reduced speed (fraction of full)", kind: "number", default: 0.5, attrs: { step: "any" } },
    { key: "electricity_rate_per_kwh", label: "Electricity rate per kWh (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "days_per_year", label: "Operating days per year", kind: "number", default: 365, attrs: { step: "any" } },
    { key: "minimum_flow_fraction", label: "Equipment minimum flow (fraction, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "a", id: "pps-out-a", label: "Speed, power, and run time", value: (r) => r.affinity_verdict },
    { key: "e", id: "pps-out-e", label: "Energy per turnover", value: (r) => r.energy_verdict },
    { key: "d", id: "pps-out-d", label: "Daily energy", value: (r) => r.daily_verdict },
    { key: "c", id: "pps-out-c", label: "Annual saving", value: (r) => r.cost_verdict },
    { key: "m", id: "pps-out-m", label: "Equipment minimum flow", value: (r) => r.equipment_verdict },
    { key: "f", id: "pps-out-f", label: "Filtration at low flow", value: (r) => r.filtration_verdict },
    { key: "n", id: "pps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoolPumpSpeedSavings,
});

// =====================================================================
// spec-v1703: pool heat pump capacity vs air, water, and humidity.
// =====================================================================
//
// The spec ASSERTS its headline rather than computing it: "Manufacturer
// capacity tables commonly show such a unit at half its rated output or
// less", "perhaps 55,000", "COP has fallen from 5 or 6 toward 3". There is
// no derate arithmetic anywhere in it. The honest build takes the derate
// factors from the manufacturer's OWN capacity table as inputs and computes
// what they imply -- inventing a correlation the spec declined to state
// would be worse than asking for the table. Same resolution as spec-v1715
// and spec-v1672.
// =====================================================================
const _POOL_BTU_PER_GAL_DEGF = 8.34;
// dims: in { rated_capacity_btuh: L^2 M T^-3, air_derate_factor: dimensionless, humidity_derate_factor: dimensionless, water_derate_factor: dimensionless, rated_cop: dimensionless, cop_derate_factor: dimensionless, pool_gallons: L^3, temperature_rise_f: T, cover_loss_reduction_pct: dimensionless } out: { derated_capacity_btuh: L^2 M T^-3, capacity_pct_of_rating: dimensionless, derated_cop: dimensionless, heat_required_btu: L^2 M T^-2, heat_up_hours: T, heat_up_hours_with_cover: T }
export function computePoolHeatPumpCapacity({
  rated_capacity_btuh = 0, air_derate_factor = 1, humidity_derate_factor = 1, water_derate_factor = 1,
  rated_cop = 0, cop_derate_factor = 1,
  pool_gallons = 0, temperature_rise_f = 0, cover_loss_reduction_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_capacity_btuh > 0)) return { error: "Rated capacity must be positive (BTU/h)." };
  for (const [n, v] of [["air", air_derate_factor], ["humidity", humidity_derate_factor], ["water", water_derate_factor], ["COP", cop_derate_factor]]) {
    if (!(v > 0) || v > 2) return { error: "The " + n + " factor must be above 0 and no more than 2 (1 means no change)." };
  }
  if (rated_cop < 0 || pool_gallons < 0 || temperature_rise_f < 0) return { error: "COP, pool volume and temperature rise cannot be negative." };
  if (cover_loss_reduction_pct < 0 || cover_loss_reduction_pct > 100) return { error: "The cover loss reduction must be between 0 and 100 percent." };
  const combined_factor = air_derate_factor * humidity_derate_factor * water_derate_factor;
  const derated_capacity_btuh = rated_capacity_btuh * combined_factor;
  const capacity_pct_of_rating = combined_factor * 100;
  const capacity_verdict = "the three factors multiply: " + fmt(air_derate_factor, 3) + " for air x " + fmt(humidity_derate_factor, 3) + " for humidity x " + fmt(water_derate_factor, 3) + " for water is " + fmt(combined_factor, 3) + ", so a " + fmt(rated_capacity_btuh, 0) + " BTU/h unit delivers " + fmt(derated_capacity_btuh, 0) + " BTU/h -- " + fmt(capacity_pct_of_rating, 0) + "% of its rating";
  const direction_verdict = "AND THE THREE MOVE IN DIFFERENT DIRECTIONS, which is why a rating is a summer number. Cooler air cuts capacity, because the evaporator has less heat to collect. WARMER WATER also cuts it, because the condensing temperature rises with it -- so the harder you push the setpoint the less the unit delivers. And HIGHER HUMIDITY RAISES capacity, because latent heat is available at the evaporator: that is why pool heat pumps like humid climates and why a dry spring evening is worse than a damp one at the same temperature";
  const has_cop = rated_cop > 0;
  const derated_cop = has_cop ? rated_cop * cop_derate_factor : 0;
  const cop_verdict = !has_cop
    ? "(no rated COP entered)"
    : "the COP falls with the same conditions: " + fmt(rated_cop, 1) + " at rating becomes " + fmt(derated_cop, 1) + " at the entered factor. A unit advertised at a COP of 5 or 6 can be near 3 in the shoulder season, so the running cost per BTU roughly doubles at exactly the time of year the owner bought it for";
  const has_heatup = pool_gallons > 0 && temperature_rise_f > 0;
  const heat_required_btu = has_heatup ? pool_gallons * _POOL_BTU_PER_GAL_DEGF * temperature_rise_f : 0;
  const heat_up_hours = has_heatup && derated_capacity_btuh > 0 ? heat_required_btu / derated_capacity_btuh : 0;
  const heatup_verdict = !has_heatup
    ? "(no pool volume and temperature rise entered)"
    : "raising " + fmt(pool_gallons, 0) + " gallons by " + fmt(temperature_rise_f, 0) + " degF takes " + fmt(heat_required_btu / 1e6, 2) + " MMBTU, which at " + fmt(derated_capacity_btuh, 0) + " BTU/h is " + fmt(heat_up_hours, 1) + " hours -- " + fmt(heat_up_hours / 24, 1) + " days of continuous running, and that is BEFORE any loss from the surface while it heats";
  const has_cover = cover_loss_reduction_pct > 0 && has_heatup;
  // A cover does not add capacity; it removes the loss the heater is fighting.
  const heat_up_hours_with_cover = has_cover ? heat_up_hours / (1 + cover_loss_reduction_pct / 100) : 0;
  const cover_verdict = !has_cover
    ? "(no cover loss reduction entered)"
    : "with a cover cutting the concurrent loss by " + fmt(cover_loss_reduction_pct, 0) + "%, the effective heat-up shortens to about " + fmt(heat_up_hours_with_cover, 1) + " hours. A COVER DOES NOT ADD CAPACITY -- it removes the loss the heat pump is fighting while it works, and on a slow heat-up that is a large share of the output. On an uncovered pool in cool weather a heat pump can run continuously and gain almost nothing, because the surface sheds heat as fast as the unit adds it";
  const cutoff_verdict = "AND THERE IS AN AIR TEMPERATURE BELOW WHICH THE UNIT PRODUCES NOTHING USEFUL -- commonly around 50 degF for an air-source pool heat pump, as the evaporator approaches frost and the capacity curve collapses. That is a manufacturer figure rather than a calculation, and it is the number that decides whether a heat pump can open the season or whether a gas heater is needed alongside it";
  if (![derated_capacity_btuh, capacity_pct_of_rating, derated_cop, heat_required_btu, heat_up_hours, heat_up_hours_with_cover].every(Number.isFinite)) return { error: "Pool heat pump math is not a finite value." };
  return {
    combined_factor, derated_capacity_btuh, capacity_pct_of_rating, capacity_verdict, direction_verdict,
    has_cop, derated_cop, cop_verdict,
    has_heatup, heat_required_btu, heat_up_hours, heatup_verdict,
    has_cover, heat_up_hours_with_cover, cover_verdict, cutoff_verdict,
    note: "What a pool heat pump delivers at the conditions it runs in, rather than the ones it was rated at. A rating is stated at one air temperature, one humidity and one water temperature -- commonly a summer combination -- and the shoulder season an owner bought the unit for is a different set of numbers entirely. THE THREE FACTORS MULTIPLY AND THEY DO NOT MOVE TOGETHER. Cooler air cuts capacity because the evaporator has less heat available to collect. Warmer water also cuts it, because the condensing temperature rises with the water temperature -- so pushing the setpoint up reduces the very output that has to reach it. And higher humidity RAISES capacity, because latent heat is available at the evaporator, which is why pool heat pumps perform well in humid climates and why a dry spring evening is worse than a damp one at the same air temperature. That third term is the one nobody expects. THE FACTORS ARE ENTERED FROM THE MANUFACTURER'S OWN CAPACITY TABLE and are not derived here. Published tables give capacity across a grid of air, humidity and water temperatures, and the shape of that surface differs between units and refrigerants enough that a generic correlation would be wrong for most of them. Reading the three factors off the table and multiplying is the honest operation; inventing a curve is not. THE COP FALLS ON THE SAME CONDITIONS, so the running cost per BTU rises at the same time the output drops. A unit advertised near 5 or 6 can be near 3 in the shoulder season, which roughly doubles the cost of every BTU exactly when the pool needs the most of them. AND A COVER DOES NOT ADD CAPACITY -- it removes the loss the heater is fighting. On a slow heat-up that distinction is the whole result: an uncovered pool in cool weather can run a heat pump continuously and gain almost nothing, because the surface sheds heat as fast as the unit adds it. The heat-up figure here is the pool's own thermal mass and takes no account of concurrent loss, so it is a floor rather than an estimate -- and it uses the DERATED capacity rather than the nameplate, which is the whole difference between this and a heat-up computed from a rating. The same pool and the same unit give quite different hours depending on which capacity goes in. This applies entered factors to an entered rating. It does not supply capacity or COP factors for any unit, model the refrigerant cycle or predict the frost-limited cutoff (commonly around 50 degF, and a manufacturer figure), compute the concurrent surface loss during heat-up, size a heat pump against a heat loss calculation, evaluate electrical service or defrost behaviour, or address the flow rate the unit requires. The manufacturer's capacity tables and the pool professional govern.",
  };
}
export const poolHeatPumpCapacityExample = { inputs: { rated_capacity_btuh: 110000, air_derate_factor: 0.62, humidity_derate_factor: 0.88, water_derate_factor: 0.92, rated_cop: 5.5, cop_derate_factor: 0.55, pool_gallons: 20000, temperature_rise_f: 10, cover_loss_reduction_pct: 70 } };
POOL_RENDERERS["pool-heat-pump-capacity"] = _simpleRenderer({
  citation: "Citation: delivered capacity = rated capacity × the air, humidity and water derate factors multiplied together, with all three ENTERED from the manufacturer's own capacity table. They do not move together: cooler air cuts capacity, WARMER WATER also cuts it (the condensing temperature rises), and HIGHER HUMIDITY raises it (latent heat at the evaporator). Heat required = gallons × 8.34 × °F rise. A cover does not add capacity; it removes the concurrent loss. It does not supply factors for any unit, model the refrigerant cycle or the frost-limited cutoff (commonly about 50 °F), compute concurrent surface loss during heat-up, or size a unit against a heat loss calculation. The manufacturer's capacity tables govern.",
  example: poolHeatPumpCapacityExample.inputs,
  fields: [
    { key: "rated_capacity_btuh", label: "Rated capacity (BTU/h)", kind: "number", attrs: { step: "any" } },
    { key: "air_derate_factor", label: "Air temperature factor (1 = at rating)", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "humidity_derate_factor", label: "Humidity factor (1 = at rating)", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "water_derate_factor", label: "Water temperature factor (1 = at rating)", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "rated_cop", label: "Rated COP (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "cop_derate_factor", label: "COP factor at these conditions", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "pool_gallons", label: "Pool volume (gal, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "temperature_rise_f", label: "Temperature rise wanted (°F, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "cover_loss_reduction_pct", label: "Cover loss reduction during heat-up (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "c", id: "phc-out-c", label: "Delivered capacity", value: (r) => r.capacity_verdict },
    { key: "d", id: "phc-out-d", label: "Why the three differ", value: (r) => r.direction_verdict },
    { key: "p", id: "phc-out-p", label: "COP at these conditions", value: (r) => r.cop_verdict },
    { key: "h", id: "phc-out-h", label: "Heat-up time", value: (r) => r.heatup_verdict },
    { key: "v", id: "phc-out-v", label: "With a cover", value: (r) => r.cover_verdict },
    { key: "o", id: "phc-out-o", label: "The cutoff", value: (r) => r.cutoff_verdict },
    { key: "n", id: "phc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoolHeatPumpCapacity,
});

// =====================================================================
// spec-v1704: spa drain interval and refill volume.
// =====================================================================
// dims: in { spa_gallons: L^3, daily_bathers: dimensionless, days_since_drain: T, alternative_bathers: dimensionless, fill_tds_ppm: dimensionless, current_tds_ppm: dimensionless, tds_limit_ppm: dimensionless } out: { interval_days: T, interval_weeks: T, days_remaining: T, alternative_interval_days: T, tds_rise_ppm: dimensionless, refill_gallons: L^3 }
export function computeSpaDrainInterval({
  spa_gallons = 0, daily_bathers = 0, days_since_drain = 0, alternative_bathers = 0,
  fill_tds_ppm = 0, current_tds_ppm = 0, tds_limit_ppm = 1500,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(spa_gallons > 0)) return { error: "Spa volume must be positive (gallons)." };
  if (!(daily_bathers > 0)) return { error: "Average daily bathers must be positive." };
  if (days_since_drain < 0 || alternative_bathers < 0) return { error: "Days since drain and alternative bather load cannot be negative." };
  if (fill_tds_ppm < 0 || current_tds_ppm < 0 || tds_limit_ppm < 0) return { error: "TDS values cannot be negative." };
  // The one-third rule: days = gallons / (3 x average daily bathers).
  const interval_days = spa_gallons / (3 * daily_bathers);
  const interval_weeks = interval_days / 7;
  const interval_verdict = fmt(spa_gallons, 0) + " gallons at " + fmt(daily_bathers, 1) + " bathers a day gives a drain interval of " + fmt(interval_days, 1) + " days -- about " + fmt(interval_weeks, 1) + " weeks. The rule is volume over three times the daily bathers, and the three is a convention rather than a measurement";
  const days_remaining = interval_days - days_since_drain;
  const overdue = days_since_drain > interval_days;
  const status_verdict = days_since_drain <= 0
    ? "(no days since the last drain entered)"
    : overdue
      ? "at " + fmt(days_since_drain, 0) + " days since the last drain this spa is " + fmt(-days_remaining, 0) + " days OVERDUE"
      : "at " + fmt(days_since_drain, 0) + " days since the last drain there are " + fmt(days_remaining, 0) + " days left in the interval";
  const has_alt = alternative_bathers > 0;
  const alternative_interval_days = has_alt ? spa_gallons / (3 * alternative_bathers) : 0;
  const alt_verdict = !has_alt
    ? "(no alternative bather load entered)"
    : "at " + fmt(alternative_bathers, 1) + " bathers a day the interval becomes " + fmt(alternative_interval_days, 0) + " days. THE INTERVAL IS INVERSE IN BATHER LOAD, so a spa used twice as hard needs draining twice as often -- and a rule set for a quiet household is wrong for the week the family visits";
  const has_tds = current_tds_ppm > 0 && fill_tds_ppm > 0;
  const tds_rise_ppm = has_tds ? current_tds_ppm - fill_tds_ppm : 0;
  const over_tds = has_tds && current_tds_ppm > tds_limit_ppm;
  const tds_verdict = !has_tds
    ? "(no fill and current TDS entered -- and a TDS reading is the measurement the interval rule stands in for)"
    : "TDS has risen " + fmt(tds_rise_ppm, 0) + " ppm above the " + fmt(fill_tds_ppm, 0) + " ppm fill water, to " + fmt(current_tds_ppm, 0) + " ppm"
      + (over_tds
        ? " -- OVER the " + fmt(tds_limit_ppm, 0) + " ppm limit entered, so drain regardless of what the interval rule says. A measurement beats a convention"
        : ", within the " + fmt(tds_limit_ppm, 0) + " ppm limit entered");
  const refill_gallons = spa_gallons;
  const why_verdict = "WHY A SPA AND NOT A POOL. Dissolved solids, body oils and disinfection byproducts accumulate with bather load and are removed only by replacing water, so the interval is volume divided by load -- and a spa is a small volume with a heavy load. The same " + fmt(daily_bathers, 1) + " bathers on a 20,000 gallon pool give an interval of " + fmt(20000 / (3 * daily_bathers), 0) + " days, or " + fmt(20000 / (3 * daily_bathers) / 365, 1) + " years, which is why pools are not drained on a schedule and spas are";
  const commercial_verdict = "AND A COMMERCIAL SPA IS A DIFFERENT QUESTION. Health codes commonly require far more frequent draining, continuous monitoring and recorded testing, independent of this rule -- and the bather load on a commercial spa is both higher and far less predictable. This convention is for a residential spa; a public one follows its jurisdiction";
  if (![interval_days, interval_weeks, days_remaining, alternative_interval_days, tds_rise_ppm, refill_gallons].every(Number.isFinite)) return { error: "Spa drain interval math is not a finite value." };
  return {
    interval_days, interval_weeks, interval_verdict,
    days_remaining, overdue, status_verdict,
    has_alt, alternative_interval_days, alt_verdict,
    has_tds, tds_rise_ppm, over_tds, tds_verdict,
    refill_gallons, why_verdict, commercial_verdict,
    note: "How often a residential spa needs draining: the volume in gallons over three times the daily bathers. The rule is arithmetic on a habit rather than a measurement, and its value is that it turns a vague sense that the water is getting tired into a date. WHY A SPA AND NOT A POOL is the whole insight, and it falls straight out of the relation. Dissolved solids, body oils, cosmetics and disinfection byproducts accumulate in proportion to bather load, and nothing removes them except replacing water -- filtration and sanitiser do not. So the interval is volume over load, and a spa is a small volume carrying a heavy load. The same handful of bathers on a full-size pool gives an interval measured in years, which is exactly why pools are not drained on a schedule and spas are, and why the two get managed so differently despite being the same chemistry. THE INTERVAL IS INVERSE IN BATHER LOAD, so a spa used twice as hard needs draining twice as often. A schedule set for a quiet household is wrong for the week the family visits, and the failure mode is not dramatic -- the water goes dull, foams, resists sanitiser and starts to scale, and the owner adds more chemicals to a problem that only fresh water solves. A TDS READING BEATS THE CONVENTION where one is available, because it measures the thing the rule estimates. Rising total dissolved solids makes sanitiser less effective and pushes the water toward scaling, and comparing a current reading against the fill water shows how much of the total is accumulation rather than what came out of the tap -- which matters where the supply is already hard. And a commercial spa is a different question: health codes commonly require far more frequent draining, continuous monitoring and recorded testing, independent of any rule of thumb, and a public bather load is both higher and much less predictable. This computes an interval from an entered volume and load. It does not measure or predict TDS, evaluate water balance, saturation index, sanitiser demand or the chemistry of the refill, account for supplementary treatment such as enzymes, clarifiers or a mineral system, determine what any health code requires for a public spa, or address the draining, disposal and refill chemistry themselves -- a refill starts a new balance and needs its own testing. The NSPF CPO handbook, the spa manufacturer's instructions, and the applicable health code govern.",
  };
}
export const spaDrainIntervalExample = { inputs: { spa_gallons: 400, daily_bathers: 6, days_since_drain: 14, alternative_bathers: 12, fill_tds_ppm: 250, current_tds_ppm: 1100, tds_limit_ppm: 1500 } };
POOL_RENDERERS["spa-drain-interval"] = _simpleRenderer({
  citation: "Citation: the one-third rule -- drain interval in days = spa gallons / (3 × average daily bathers). Dissolved solids, body oils and disinfection byproducts accumulate with bather load and are removed only by replacing water, so the interval is volume over load; the same bathers on a full-size pool give an interval measured in years. A TDS reading, where available, beats the convention because it measures what the rule estimates. It does not measure or predict TDS, evaluate water balance, saturation index or sanitiser demand, account for enzymes or mineral systems, or determine what a health code requires for a PUBLIC spa, which is a separate and stricter question. The NSPF CPO handbook, the manufacturer's instructions and the health code govern.",
  example: spaDrainIntervalExample.inputs,
  fields: [
    { key: "spa_gallons", label: "Spa volume (gal)", kind: "number", attrs: { step: "any" } },
    { key: "daily_bathers", label: "Average daily bathers", kind: "number", attrs: { step: "any" } },
    { key: "days_since_drain", label: "Days since the last drain (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alternative_bathers", label: "Alternative bather load (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "fill_tds_ppm", label: "Fill water TDS (ppm, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "current_tds_ppm", label: "Current TDS (ppm, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "tds_limit_ppm", label: "TDS limit (ppm)", kind: "number", default: 1500, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "i", id: "sdi-out-i", label: "Drain interval", value: (r) => r.interval_verdict },
    { key: "s", id: "sdi-out-s", label: "Where this spa stands", value: (r) => r.status_verdict },
    { key: "a", id: "sdi-out-a", label: "At another bather load", value: (r) => r.alt_verdict },
    { key: "t", id: "sdi-out-t", label: "Against a TDS reading", value: (r) => r.tds_verdict },
    { key: "w", id: "sdi-out-w", label: "Why a spa and not a pool", value: (r) => r.why_verdict },
    { key: "c", id: "sdi-out-c", label: "Commercial spas", value: (r) => r.commercial_verdict },
    { key: "n", id: "sdi-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSpaDrainInterval,
});
