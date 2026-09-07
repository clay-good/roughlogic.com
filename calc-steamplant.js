// calc-steamplant.js -- the steam plant and commercial laundry bench.
//
// specs/scope-trade-expansion-2.md found two adjacent trades unserved. The
// catalog had `steam-boiler-blowdown` (a TDS mass balance that stops at the
// blowdown rate), `flash-steam-pct`, and the Napier PRV pair -- and nothing
// that valued the heat in a blowdown stream, balanced a deaerator, audited an
// installed safety-valve set against the boiler's steaming rate, or fitted a
// fuel oil's viscosity-temperature line. On the laundry side it had nothing
// at all: `warewasher-hot-water` is a dish-machine booster, and
// `evaporation-load` is IICRC structural drying, not a tumble dryer.
//
// Tiles:
//   v1563 laundry-washer-turns          (G)   v1567 deaerator-steam-demand   (C)
//   v1564 laundry-cost-per-pound        (G)   v1569 safety-valve-capacity    (C)
//   v1565 laundry-dryer-evaporation     (G)   v1570 fuel-oil-atomizing-viscosity (C)
//   v1566 blowdown-heat-recovery        (C)
//
// spec-v1568 (`condensate-pump-flash-npsh`) was CUT: `npsh-a` in calc-hvac.js
// already returns h_atm - h_vapor + h_static - h_friction, which at saturation
// IS the spec's answer. Its distinctive outputs -- the margin in feet, the
// friction the arrangement tolerates, and the static height for a target
// margin -- landed additively on `npsh-a` instead.
//
// Three of the seven specs were internally wrong: v1567's two dollar figures
// charge DA heating steam from 60 degF when the boiler feedwater is already at
// the DA saturation temperature, and v1570's atomizing temperature (205 degF)
// does not follow from its own two data points (211.5 degF does).
//
// Steam plant operation is a licensed activity in many jurisdictions. Nothing
// here designs a relief system, certifies a valve, or sets a chemistry limit.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied verbatim
// from the sibling calc-* modules; non-exported, no corpus row).
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
// calc-diving.js / calc-wind.js / calc-sawmill.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _spRender = function (inputRegion, outputRegion, citationEl) {
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

  _spRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _spRender;
}

export const STEAMPLANT_RENDERERS = {};

// 8.34 lb per gallon of water, 1,200 BTU to evaporate a pound of water out of
// linen (latent plus the sensible heat of the water plus typical exhaust
// loss), 1.08 = 60 min/hr x 0.075 lb/cu ft x 0.24 BTU/lb-degF, 60 min/hr.
const _LB_PER_GAL = 8.34;
const _BTU_PER_LB_EVAPORATED = 1200;
const _SENSIBLE_AIR = 1.08;
const _MIN_PER_HOUR = 60;

// ============ spec-v1563: washer capacity and turns per day ============

// dims: in { machine_capacity_lb: M, wash_cycle_min: T, load_unload_min: T, idle_min: T, shift_hours: T, shifts_per_day: dimensionless, machine_count: dimensionless, required_lb_per_day: M } out: { total_cycle_min: T, turns_per_shift: dimensionless, lb_per_shift: M, lb_per_day: M, machines_required: dimensionless, idle_loss_lb_per_day: M }
export function computeLaundryWasherTurns({ machine_capacity_lb = 0, wash_cycle_min = 0, load_unload_min = 0, idle_min = 0, shift_hours = 0, shifts_per_day = 1, machine_count = 1, required_lb_per_day = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(machine_capacity_lb > 0)) return { error: "Machine rated capacity must be positive (lb)." };
  if (!(wash_cycle_min > 0)) return { error: "Wash cycle time must be positive (min)." };
  if (!(load_unload_min >= 0)) return { error: "Load and unload time cannot be negative (min)." };
  if (!(idle_min >= 0)) return { error: "Observed idle time cannot be negative (min)." };
  if (!(shift_hours > 0)) return { error: "Shift length must be positive (hours)." };
  if (!(shifts_per_day > 0)) return { error: "Shifts per day must be positive." };
  if (!(machine_count >= 1)) return { error: "Machine count must be at least 1." };
  if (!(required_lb_per_day > 0)) return { error: "Required pounds per day must be positive." };
  // Turns is the operational number: the shift divided by the cycle the
  // machine ACTUALLY occupies, idle waiting included.
  const total_cycle_min = wash_cycle_min + load_unload_min + idle_min;
  const productive_cycle_min = wash_cycle_min + load_unload_min;
  const shift_minutes = shift_hours * _MIN_PER_HOUR;
  const turns_per_shift = shift_minutes / total_cycle_min;
  const ideal_turns_per_shift = shift_minutes / productive_cycle_min;
  const lb_per_shift_per_machine = machine_capacity_lb * turns_per_shift;
  const ideal_lb_per_shift_per_machine = machine_capacity_lb * ideal_turns_per_shift;
  const lb_per_shift = lb_per_shift_per_machine * machine_count;
  const lb_per_day = lb_per_shift * shifts_per_day;
  const idle_loss_lb_per_machine = ideal_lb_per_shift_per_machine - lb_per_shift_per_machine;
  const idle_loss_lb_per_day = idle_loss_lb_per_machine * machine_count * shifts_per_day;
  const idle_loss_pct = ideal_lb_per_shift_per_machine > 0 ? idle_loss_lb_per_machine / ideal_lb_per_shift_per_machine * 100 : 0;
  const machines_exact = required_lb_per_day / (machine_capacity_lb * turns_per_shift * shifts_per_day);
  const machines_required = Math.ceil(machines_exact);
  const ideal_machines_exact = required_lb_per_day / (machine_capacity_lb * ideal_turns_per_shift * shifts_per_day);
  const ideal_machines_required = Math.ceil(ideal_machines_exact);
  const meets_requirement = lb_per_day >= required_lb_per_day;
  const outs = [total_cycle_min, turns_per_shift, lb_per_shift, lb_per_day, machines_exact, idle_loss_lb_per_day];
  if (!outs.every(Number.isFinite)) return { error: "Washer throughput math is not a finite value." };
  return {
    total_cycle_min, productive_cycle_min, turns_per_shift, ideal_turns_per_shift,
    lb_per_shift_per_machine, ideal_lb_per_shift_per_machine, lb_per_shift, lb_per_day,
    idle_loss_lb_per_machine, idle_loss_lb_per_day, idle_loss_pct,
    machines_exact, machines_required, ideal_machines_exact, ideal_machines_required,
    machine_count, required_lb_per_day, idle_min, meets_requirement,
    machines_verdict: machines_required > ideal_machines_required
      ? "the idle time has cost a whole machine: " + fmt(machines_required, 0) + " where the cycle-time-only figure says " + fmt(ideal_machines_required, 0)
      : "the same " + fmt(machines_required, 0) + " the cycle-time-only figure gives",
    throughput_verdict: meets_requirement
      ? "covers the " + fmt(required_lb_per_day, 0) + " lb a day required"
      : "SHORT of the " + fmt(required_lb_per_day, 0) + " lb a day required by " + fmt(required_lb_per_day - lb_per_day, 0) + " lb",
    note: "Rated capacity is a machine specification and turns is an operational one, and turns is where a plant loses its throughput. The cycle that matters is not the wash cycle on the data plate but the whole time the machine is occupied: wash, plus loading and unloading, plus the minutes it stands full because nobody was there to empty it. That last term is usually the largest and it is the one nobody measures. A 125 lb washer on a 38 minute working cycle turns 12.6 times in an eight hour shift and makes 1,579 lb; let each load sit 12 minutes waiting and the effective cycle is 50 minutes, turns fall to 9.6, and the same machine makes 1,200 lb. That is 379 lb a shift, 24% of the machine, lost to scheduling rather than to equipment. The sizing consequence is the expensive one. Working from the theoretical figure, 4,000 lb a day looks like 2.5 machines and three are bought; working from the real figure it is 3.3 and four are needed -- so a plant that sizes on cycle time alone is short from the day it opens, and the usual response is to buy another washer, which is a very expensive way to solve an unloading problem. The other lever is not in this arithmetic at all: extraction. A higher G-force extract removes far more water mechanically, and mechanical removal costs roughly a tenth of what evaporating the same water costs in the dryer. It does not shorten the wash cycle, so it never appears in a turns calculation, but it shortens the DRYER cycle and cuts the gas bill, which is why a washer decision made only on wash time misses most of its own consequences. A throughput calculation from cycle times the user supplies. It does not select machines, design the wash formula, or evaluate whether a cycle achieves the required cleanliness -- healthcare and food-service laundry carry temperature, chemistry, and time requirements that constrain the cycle and that this does not address. It does not size the water, sewer, hot water, or steam services, the drying capacity downstream (a plant washes faster than it dries far more often than the reverse), or the finishing equipment, and it does not evaluate the linen inventory required to support the throughput, which is usually what actually limits a plant. The equipment manufacturer's data, the chemical supplier's wash formulas, and any applicable healthcare or food-safety laundry standard govern.",
  };
}
const laundryWasherTurnsExample = { inputs: { machine_capacity_lb: 125, wash_cycle_min: 33, load_unload_min: 5, idle_min: 12, shift_hours: 8, shifts_per_day: 1, machine_count: 3, required_lb_per_day: 4000 } };
STEAMPLANT_RENDERERS["laundry-washer-turns"] = _simpleRenderer({
  citation: "Citation: the on-premise laundry throughput relations by name -- turns per shift = shift minutes / total occupied cycle, pounds = rated capacity x turns x machines, and machines required = ceil(required pounds / (capacity x turns)). The total occupied cycle includes loading, unloading, and observed idle waiting, not the data-plate wash cycle alone. The equipment manufacturer's data, the chemical supplier's wash formulas, and any applicable healthcare or food-safety laundry standard govern.",
  example: laundryWasherTurnsExample.inputs,
  fields: [
    { key: "machine_capacity_lb", label: "Machine rated capacity (lb)", kind: "number", default: 125 },
    { key: "wash_cycle_min", label: "Wash cycle time (min)", kind: "number", default: 33 },
    { key: "load_unload_min", label: "Load and unload time (min)", kind: "number", default: 5 },
    { key: "idle_min", label: "Observed idle time waiting to be unloaded (min)", kind: "number", default: 12 },
    { key: "shift_hours", label: "Shift length (hours)", kind: "number", default: 8 },
    { key: "shifts_per_day", label: "Shifts per day", kind: "number", default: 1 },
    { key: "machine_count", label: "Machines installed", kind: "number", default: 3 },
    { key: "required_lb_per_day", label: "Required throughput (lb per day)", kind: "number", default: 4000 },
  ],
  outputs: [
    { key: "c", id: "lwt-out-c", label: "Total occupied cycle", value: (r) => fmt(r.total_cycle_min, 0) + " min, not the " + fmt(r.productive_cycle_min, 0) + " min of work -- " + fmt(r.idle_min, 0) + " min of it is standing full" },
    { key: "t", id: "lwt-out-t", label: "Turns per shift", value: (r) => fmt(r.turns_per_shift, 1) + " turns against a theoretical " + fmt(r.ideal_turns_per_shift, 1) },
    { key: "p", id: "lwt-out-p", label: "Throughput installed", value: (r) => fmt(r.lb_per_shift, 0) + " lb per shift, " + fmt(r.lb_per_day, 0) + " lb per day -- " + r.throughput_verdict },
    { key: "i", id: "lwt-out-i", label: "Lost to idle time", value: (r) => fmt(r.idle_loss_lb_per_day, 0) + " lb a day, " + fmt(r.idle_loss_pct, 0) + "% of capacity -- scheduling, not equipment" },
    { key: "m", id: "lwt-out-m", label: "Machines required", value: (r) => fmt(r.machines_required, 0) + " (" + fmt(r.machines_exact, 1) + " exact) -- " + r.machines_verdict },
    { key: "n", id: "lwt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLaundryWasherTurns,
});

// ============ spec-v1564: laundry cost per pound ============

// dims: in { lb_per_day: M, gal_per_lb: L^3 / M, water_rate_per_gal: dimensionless, sewer_rate_per_gal: dimensionless, incoming_temp_f: T, wash_temp_f: T, hot_fraction: dimensionless, heater_efficiency: dimensionless, fuel_cost_per_mmbtu: dimensionless, retained_moisture_fraction: dimensionless, improved_retained_moisture_fraction: dimensionless, dryer_efficiency: dimensionless, chem_cost_per_cwt: dimensionless, labor_hours_per_day: T, labor_rate_per_hour: dimensionless, days_per_year: dimensionless } out: { total_cost_per_lb: dimensionless, cost_per_cwt: dimensionless, annual_cost: dimensionless, energy_share_of_utilities_pct: dimensionless, extraction_saving_annual: dimensionless }
export function computeLaundryCostPerPound({ lb_per_day = 0, gal_per_lb = 0, water_rate_per_gal = 0, sewer_rate_per_gal = 0, incoming_temp_f = 60, wash_temp_f = 140, hot_fraction = 0.6, heater_efficiency = 0.8, fuel_cost_per_mmbtu = 0, retained_moisture_fraction = 0.45, improved_retained_moisture_fraction = 0.35, dryer_efficiency = 0.7, chem_cost_per_cwt = 0, labor_hours_per_day = 0, labor_rate_per_hour = 0, days_per_year = 300 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lb_per_day > 0)) return { error: "Pounds processed per day must be positive." };
  if (!(gal_per_lb > 0)) return { error: "Water use must be positive (gallons per pound)." };
  if (!(water_rate_per_gal >= 0)) return { error: "Water rate cannot be negative." };
  if (!(sewer_rate_per_gal >= 0)) return { error: "Sewer rate cannot be negative." };
  if (!(wash_temp_f > incoming_temp_f)) return { error: "The wash temperature must exceed the incoming water temperature." };
  if (!(hot_fraction > 0 && hot_fraction <= 1)) return { error: "Hot water fraction must be over 0 and at most 1." };
  if (!(heater_efficiency > 0 && heater_efficiency <= 1)) return { error: "Water heater efficiency must be over 0 and at most 1." };
  if (!(fuel_cost_per_mmbtu >= 0)) return { error: "Fuel cost cannot be negative ($ per MMBTU)." };
  if (!(retained_moisture_fraction > 0 && retained_moisture_fraction < 1)) return { error: "Retained moisture after extraction must be between 0 and 1." };
  if (!(improved_retained_moisture_fraction > 0 && improved_retained_moisture_fraction < 1)) return { error: "The improved retained moisture must be between 0 and 1." };
  if (!(dryer_efficiency > 0 && dryer_efficiency <= 1)) return { error: "Dryer efficiency must be over 0 and at most 1." };
  if (!(chem_cost_per_cwt >= 0)) return { error: "Chemical cost cannot be negative ($ per hundredweight)." };
  if (!(labor_hours_per_day >= 0)) return { error: "Labor hours cannot be negative." };
  if (!(labor_rate_per_hour >= 0)) return { error: "Labor rate cannot be negative." };
  if (!(days_per_year > 0)) return { error: "Operating days per year must be positive." };
  // Six components, all per pound of linen. The two energy lines are the ones
  // that get left out, and together they are the larger half of the utilities.
  const water_cost_per_lb = gal_per_lb * water_rate_per_gal;
  const sewer_cost_per_lb = gal_per_lb * sewer_rate_per_gal;
  const delta_t_f = wash_temp_f - incoming_temp_f;
  const hot_water_btu_per_lb = gal_per_lb * hot_fraction * _LB_PER_GAL * delta_t_f / heater_efficiency;
  const hot_water_cost_per_lb = hot_water_btu_per_lb * fuel_cost_per_mmbtu / 1e6;
  const drying_btu_per_lb = retained_moisture_fraction * _BTU_PER_LB_EVAPORATED / dryer_efficiency;
  const drying_cost_per_lb = drying_btu_per_lb * fuel_cost_per_mmbtu / 1e6;
  const chemistry_cost_per_lb = chem_cost_per_cwt / 100;
  const labor_cost_per_lb = labor_hours_per_day * labor_rate_per_hour / lb_per_day;
  const utilities_cost_per_lb = water_cost_per_lb + sewer_cost_per_lb + hot_water_cost_per_lb + drying_cost_per_lb;
  const energy_cost_per_lb = hot_water_cost_per_lb + drying_cost_per_lb;
  const energy_share_of_utilities_pct = utilities_cost_per_lb > 0 ? energy_cost_per_lb / utilities_cost_per_lb * 100 : 0;
  const total_cost_per_lb = utilities_cost_per_lb + chemistry_cost_per_lb + labor_cost_per_lb;
  const cost_per_cwt = total_cost_per_lb * 100;
  const labor_share_pct = total_cost_per_lb > 0 ? labor_cost_per_lb / total_cost_per_lb * 100 : 0;
  const daily_cost = total_cost_per_lb * lb_per_day;
  const annual_cost = daily_cost * days_per_year;
  const improved_drying_btu_per_lb = improved_retained_moisture_fraction * _BTU_PER_LB_EVAPORATED / dryer_efficiency;
  const improved_drying_cost_per_lb = improved_drying_btu_per_lb * fuel_cost_per_mmbtu / 1e6;
  const extraction_saving_per_lb = drying_cost_per_lb - improved_drying_cost_per_lb;
  const extraction_saving_annual = extraction_saving_per_lb * lb_per_day * days_per_year;
  const outs = [total_cost_per_lb, cost_per_cwt, annual_cost, energy_share_of_utilities_pct, extraction_saving_annual];
  if (!outs.every(Number.isFinite)) return { error: "Laundry cost math is not a finite value." };
  return {
    water_cost_per_lb, sewer_cost_per_lb, delta_t_f,
    hot_water_btu_per_lb, hot_water_cost_per_lb,
    drying_btu_per_lb, drying_cost_per_lb,
    chemistry_cost_per_lb, labor_cost_per_lb,
    utilities_cost_per_lb, energy_cost_per_lb, energy_share_of_utilities_pct,
    total_cost_per_lb, cost_per_cwt, labor_share_pct, daily_cost, annual_cost,
    improved_drying_cost_per_lb, extraction_saving_per_lb, extraction_saving_annual,
    retained_moisture_fraction, improved_retained_moisture_fraction,
    labor_verdict: labor_share_pct >= 50
      ? "over half the cost per pound -- throughput that reduces handling moves this number more than any utility rate negotiation"
      : "under half the cost per pound, which is unusually low for an on-premise laundry -- check that every touch is counted",
    note: "Cost per pound is the number that decides whether to wash in house or send it out, and it has six parts that get counted very unevenly. Water and sewer are always counted. The energy to heat the wash water and the energy to evaporate the water out of the linen usually are not, and together they are the larger share of the utility bill: at 1.8 gallons per pound heated from 60 to 140 degF, and 45% retained moisture dried at 70% efficiency, the two energy lines are 37% of the utilities against 63% for the water and sewer people look at. Sewer deserves its own caution, because it is often billed on water consumed and is frequently the larger of the two rates, so a reuse or ozone system saves on both lines at once. Labor exceeds all of it. In most on-premise laundries labor is half or more of the cost per pound, which means a cost-per-pound figure that omits labor makes in-house laundry look far cheaper than outsourcing -- and that is the error that actually gets made. The lever with the best return is extraction. Water removed mechanically costs roughly a tenth of water evaporated, so dropping retained moisture from 45% to 35% takes the drying line from $0.0069 to $0.0054 a pound, worth $1,851 a year at 4,000 lb a day over 300 days, from the washer's extract speed rather than from anything the dryer does. A cost model from rates and factors the user supplies, and only as good as they are: gallons per pound and retained moisture vary widely with the equipment, the wash formula, and the classification of goods, and should be measured rather than assumed. It excludes equipment depreciation, maintenance, water treatment, and the linen replacement driven by wash severity, which on a healthcare account can exceed the utility cost. It does not evaluate water reuse, ozone, or heat recovery systems, and it does not address the compliance costs of healthcare or food-service laundry. A comparison against commercial laundry service pricing must account for what that price includes, which is usually linen, delivery, and loss replacement. The utility tariffs, the chemical supplier, and the equipment manufacturer's data govern.",
  };
}
const laundryCostPerPoundExample = { inputs: { lb_per_day: 4000, gal_per_lb: 1.8, water_rate_per_gal: 0.006, sewer_rate_per_gal: 0.008, incoming_temp_f: 60, wash_temp_f: 140, hot_fraction: 0.6, heater_efficiency: 0.8, fuel_cost_per_mmbtu: 9, retained_moisture_fraction: 0.45, improved_retained_moisture_fraction: 0.35, dryer_efficiency: 0.7, chem_cost_per_cwt: 4.5, labor_hours_per_day: 16, labor_rate_per_hour: 22, days_per_year: 300 } };
STEAMPLANT_RENDERERS["laundry-cost-per-pound"] = _simpleRenderer({
  citation: "Citation: the on-premise laundry cost-per-pound build-up by name -- water and sewer at gallons per pound times the tariffs, wash-water energy from the sensible-heat relation gal x 8.34 lb/gal x rise / heater efficiency, drying energy at about 1,200 BTU per pound of water evaporated divided by dryer efficiency, chemistry per hundredweight, and labor hours at the labor rate. The 1,200 BTU per pound figure covers latent heat plus the sensible heat of the water and typical exhaust loss. The utility tariffs, the chemical supplier, and the equipment manufacturer's data govern.",
  example: laundryCostPerPoundExample.inputs,
  fields: [
    { key: "lb_per_day", label: "Pounds processed per day", kind: "number", default: 4000 },
    { key: "gal_per_lb", label: "Water use (gallons per pound)", kind: "number", default: 1.8 },
    { key: "water_rate_per_gal", label: "Water rate ($ per gallon)", kind: "number", default: 0.006 },
    { key: "sewer_rate_per_gal", label: "Sewer rate ($ per gallon)", kind: "number", default: 0.008 },
    { key: "incoming_temp_f", label: "Incoming water temperature (F)", kind: "number", default: 60 },
    { key: "wash_temp_f", label: "Wash temperature (F)", kind: "number", default: 140 },
    { key: "hot_fraction", label: "Fraction of the water heated (0-1)", kind: "number", default: 0.6 },
    { key: "heater_efficiency", label: "Water heater efficiency (0-1)", kind: "number", default: 0.8 },
    { key: "fuel_cost_per_mmbtu", label: "Fuel cost ($ per MMBTU)", kind: "number", default: 9 },
    { key: "retained_moisture_fraction", label: "Retained moisture after extraction (0-1)", kind: "number", default: 0.45 },
    { key: "improved_retained_moisture_fraction", label: "Retained moisture after better extraction (0-1)", kind: "number", default: 0.35 },
    { key: "dryer_efficiency", label: "Dryer efficiency (0-1)", kind: "number", default: 0.7 },
    { key: "chem_cost_per_cwt", label: "Chemical cost ($ per hundredweight)", kind: "number", default: 4.5 },
    { key: "labor_hours_per_day", label: "Labor hours per day", kind: "number", default: 16 },
    { key: "labor_rate_per_hour", label: "Labor rate ($ per hour)", kind: "number", default: 22 },
    { key: "days_per_year", label: "Operating days per year", kind: "number", default: 300 },
  ],
  outputs: [
    { key: "w", id: "lcp-out-w", label: "Water and sewer", value: (r) => "$" + fmt(r.water_cost_per_lb + r.sewer_cost_per_lb, 4) + " per lb -- the line everybody counts" },
    { key: "e", id: "lcp-out-e", label: "Energy, the line nobody counts", value: (r) => "$" + fmt(r.hot_water_cost_per_lb, 4) + " to heat the wash water and $" + fmt(r.drying_cost_per_lb, 4) + " to dry -- " + fmt(r.energy_share_of_utilities_pct, 0) + "% of the utilities" },
    { key: "l", id: "lcp-out-l", label: "Labor", value: (r) => "$" + fmt(r.labor_cost_per_lb, 4) + " per lb, " + fmt(r.labor_share_pct, 0) + "% of the total -- " + r.labor_verdict },
    { key: "t", id: "lcp-out-t", label: "Total cost", value: (r) => "$" + fmt(r.total_cost_per_lb, 4) + " per lb, $" + fmt(r.cost_per_cwt, 2) + " per hundredweight" },
    { key: "a", id: "lcp-out-a", label: "Annual operating cost", value: (r) => "$" + fmt(r.annual_cost, 0) + " a year, $" + fmt(r.daily_cost, 0) + " a day" },
    { key: "x", id: "lcp-out-x", label: "Better extraction is worth", value: (r) => "$" + fmt(r.extraction_saving_annual, 0) + " a year going from " + fmt(r.retained_moisture_fraction * 100, 0) + "% to " + fmt(r.improved_retained_moisture_fraction * 100, 0) + "% retained moisture" },
    { key: "n", id: "lcp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLaundryCostPerPound,
});

// ============ spec-v1565: tumble dryer evaporation load and makeup air ============

// dims: in { dry_weight_lb_per_day: M, retained_moisture_fraction: dimensionless, improved_retained_moisture_fraction: dimensionless, dryer_efficiency: dimensionless, temp_rise_f: T, operating_hours_per_day: T, fuel_cost_per_mmbtu: dimensionless, days_per_year: dimensionless, louver_face_velocity_fpm: L / T, louver_free_area_fraction: dimensionless } out: { water_lb_per_day: M, heat_btu_per_day: M L^2 T^-2, exhaust_cfm: L^3 / T, makeup_cfm: L^3 / T, louver_gross_ft2: L^2, extraction_saving_annual: dimensionless }
export function computeLaundryDryerEvaporation({ dry_weight_lb_per_day = 0, retained_moisture_fraction = 0.45, improved_retained_moisture_fraction = 0.35, dryer_efficiency = 0.7, temp_rise_f = 100, operating_hours_per_day = 8, fuel_cost_per_mmbtu = 0, days_per_year = 300, louver_face_velocity_fpm = 500, louver_free_area_fraction = 0.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(dry_weight_lb_per_day > 0)) return { error: "Dry weight processed must be positive (lb per day)." };
  if (!(retained_moisture_fraction > 0 && retained_moisture_fraction < 1)) return { error: "Retained moisture must be between 0 and 1." };
  if (!(improved_retained_moisture_fraction > 0 && improved_retained_moisture_fraction < 1)) return { error: "The improved retained moisture must be between 0 and 1." };
  if (!(dryer_efficiency > 0 && dryer_efficiency <= 1)) return { error: "Dryer efficiency must be over 0 and at most 1." };
  if (!(temp_rise_f > 0)) return { error: "The temperature rise across the dryer must be positive (F)." };
  if (!(operating_hours_per_day > 0)) return { error: "Operating hours per day must be positive." };
  if (!(fuel_cost_per_mmbtu >= 0)) return { error: "Fuel cost cannot be negative ($ per MMBTU)." };
  if (!(days_per_year > 0)) return { error: "Operating days per year must be positive." };
  if (!(louver_face_velocity_fpm > 0)) return { error: "Louver face velocity must be positive (fpm)." };
  if (!(louver_free_area_fraction > 0 && louver_free_area_fraction <= 1)) return { error: "Louver free-area fraction must be over 0 and at most 1." };
  // A dryer is an evaporator. Its load is the pounds of water it has to boil
  // off, and everything else -- gas input, exhaust, makeup air -- follows.
  const water_lb_per_day = dry_weight_lb_per_day * retained_moisture_fraction;
  const heat_btu_per_day = water_lb_per_day * _BTU_PER_LB_EVAPORATED / dryer_efficiency;
  const heat_btuh = heat_btu_per_day / operating_hours_per_day;
  const exhaust_cfm = heat_btuh / (_SENSIBLE_AIR * temp_rise_f);
  const makeup_cfm = exhaust_cfm;
  const louver_free_area_ft2 = makeup_cfm / louver_face_velocity_fpm;
  const louver_gross_ft2 = louver_free_area_ft2 / louver_free_area_fraction;
  const daily_fuel_cost = heat_btu_per_day * fuel_cost_per_mmbtu / 1e6;
  const annual_fuel_cost = daily_fuel_cost * days_per_year;
  const improved_water_lb_per_day = dry_weight_lb_per_day * improved_retained_moisture_fraction;
  const improved_heat_btu_per_day = improved_water_lb_per_day * _BTU_PER_LB_EVAPORATED / dryer_efficiency;
  const heat_saved_btu_per_day = heat_btu_per_day - improved_heat_btu_per_day;
  const extraction_saving_annual = heat_saved_btu_per_day * fuel_cost_per_mmbtu / 1e6 * days_per_year;
  const outs = [water_lb_per_day, heat_btu_per_day, exhaust_cfm, louver_gross_ft2, extraction_saving_annual];
  if (!outs.every(Number.isFinite)) return { error: "Dryer evaporation math is not a finite value." };
  return {
    water_lb_per_day, heat_btu_per_day, heat_btuh, exhaust_cfm, makeup_cfm,
    louver_free_area_ft2, louver_gross_ft2, daily_fuel_cost, annual_fuel_cost,
    improved_water_lb_per_day, improved_heat_btu_per_day, heat_saved_btu_per_day,
    extraction_saving_annual, retained_moisture_fraction, improved_retained_moisture_fraction,
    operating_hours_per_day,
    water_saved_lb_per_day: water_lb_per_day - improved_water_lb_per_day,
    note: "A tumble dryer is an evaporator and its load is the pounds of water it has to boil off, so the number that sets the gas bill is not the weight of linen but the retained moisture after extraction. Evaporating water is expensive and mechanical extraction is cheap, and the ratio between them is roughly ten to one -- which makes the washer's extract speed the single most consequential number in a laundry's energy bill. Ten points of retained moisture on four thousand pounds of linen is four hundred pounds of water a day that either leaves in the extractor for pennies or leaves in the dryer for dollars: 45% down to 35% saves 685,714 BTU a day, $1,851 a year at $9 per MMBTU over 300 days, and the dryer does nothing differently. The airflow consequence is the one that causes building problems. Heat divided by 1.08 times the temperature rise gives the exhaust, and 4,000 lb a day at 45% over an eight hour shift is about 3,571 cfm continuous -- which is also 3,571 cfm of makeup air the room has to admit. At a 500 fpm louver face velocity that is 7.1 sq ft of free area, and after a 50% free-area fraction about 14 sq ft of gross louver. A laundry room with a 4 sq ft transfer grille is going to run negative, and it will pull the difference through the building: down water heater flues, under doors, past every combustion appliance in the mechanical room. That is a combustion safety problem as well as a performance one, because a dryer that cannot get air dries slowly and runs long, which costs more gas to remove the same water. The third consequence is lint, and it is a fire problem rather than an arithmetic one: exhaust ducting sized and routed for the calculated airflow still fails if it is not cleanable. The 1,200 BTU per pound figure covers latent heat plus the sensible heat of the water and typical exhaust losses and is a working approximation; a specific dryer's fuel consumption per pound of water from its manufacturer is better. This does not size the dryer, select the exhaust duct or evaluate its static pressure, or address lint accumulation and the cleaning access that fire safety requires -- dryer exhaust fires are a recognized hazard and duct design is governed by the mechanical code and NFPA rather than by an airflow number. It does not evaluate makeup air tempering, which in a cold climate is a substantial heating load of its own, or the combustion safety consequences of running the room negative, which must be checked separately. The dryer manufacturer's data, the adopted mechanical code, and NFPA govern.",
  };
}
const laundryDryerEvaporationExample = { inputs: { dry_weight_lb_per_day: 4000, retained_moisture_fraction: 0.45, improved_retained_moisture_fraction: 0.35, dryer_efficiency: 0.7, temp_rise_f: 100, operating_hours_per_day: 8, fuel_cost_per_mmbtu: 9, days_per_year: 300, louver_face_velocity_fpm: 500, louver_free_area_fraction: 0.5 } };
STEAMPLANT_RENDERERS["laundry-dryer-evaporation"] = _simpleRenderer({
  citation: "Citation: the tumble dryer evaporation and airflow relations by name -- water to remove = dry weight x retained moisture, heat = water x about 1,200 BTU per pound / dryer efficiency, and exhaust cfm = BTU/hr / (1.08 x temperature rise), with 1.08 = 60 min/hr x 0.075 lb/cu ft x 0.24 BTU/lb-F. The makeup air equals the exhaust. Exhaust duct sizing, routing, and lint cleaning access are governed by the adopted mechanical code and NFPA, cited not mirrored; the dryer manufacturer's data governs the fuel per pound of water.",
  example: laundryDryerEvaporationExample.inputs,
  fields: [
    { key: "dry_weight_lb_per_day", label: "Dry weight processed (lb per day)", kind: "number", default: 4000 },
    { key: "retained_moisture_fraction", label: "Retained moisture after extraction (0-1)", kind: "number", default: 0.45 },
    { key: "improved_retained_moisture_fraction", label: "Retained moisture after better extraction (0-1)", kind: "number", default: 0.35 },
    { key: "dryer_efficiency", label: "Dryer efficiency (0-1)", kind: "number", default: 0.7 },
    { key: "temp_rise_f", label: "Temperature rise across the dryer (F)", kind: "number", default: 100 },
    { key: "operating_hours_per_day", label: "Operating hours per day", kind: "number", default: 8 },
    { key: "fuel_cost_per_mmbtu", label: "Fuel cost ($ per MMBTU)", kind: "number", default: 9 },
    { key: "days_per_year", label: "Operating days per year", kind: "number", default: 300 },
    { key: "louver_face_velocity_fpm", label: "Makeup louver face velocity (fpm)", kind: "number", default: 500 },
    { key: "louver_free_area_fraction", label: "Louver free-area fraction (0-1)", kind: "number", default: 0.5 },
  ],
  outputs: [
    { key: "w", id: "lde-out-w", label: "Water to evaporate", value: (r) => fmt(r.water_lb_per_day, 0) + " lb a day -- this, not the linen weight, is the dryer's load" },
    { key: "h", id: "lde-out-h", label: "Heat required", value: (r) => fmt(r.heat_btu_per_day / 1e6, 2) + " MMBTU a day, " + fmt(r.heat_btuh, 0) + " BTU/hr while running -- $" + fmt(r.annual_fuel_cost, 0) + " a year" },
    { key: "e", id: "lde-out-e", label: "Exhaust airflow", value: (r) => fmt(r.exhaust_cfm, 0) + " cfm continuous over the " + fmt(r.operating_hours_per_day, 0) + " hour run" },
    { key: "m", id: "lde-out-m", label: "Makeup air the room must admit", value: (r) => fmt(r.makeup_cfm, 0) + " cfm -- " + fmt(r.louver_free_area_ft2, 1) + " sq ft of free area, about " + fmt(r.louver_gross_ft2, 0) + " sq ft of gross louver, or the room runs negative" },
    { key: "x", id: "lde-out-x", label: "Better extraction is worth", value: (r) => fmt(r.water_saved_lb_per_day, 0) + " lb of water a day and $" + fmt(r.extraction_saving_annual, 0) + " a year -- from the washer, not the dryer" },
    { key: "n", id: "lde-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLaundryDryerEvaporation,
});

// ============ spec-v1566: blowdown heat recovery ============

// dims: in { steam_rate_lb_hr: M / T, cycles_of_concentration: dimensionless, alt_cycles_of_concentration: dimensionless, blowdown_liquid_enthalpy_btu_lb: L^2 T^-2, flash_liquid_enthalpy_btu_lb: L^2 T^-2, flash_latent_btu_lb: L^2 T^-2, makeup_temp_f: T, heat_exchanger_effectiveness: dimensionless, boiler_efficiency: dimensionless, fuel_cost_per_mmbtu: dimensionless, hours_per_year: T } out: { blowdown_lb_hr: M / T, blowdown_pct_of_steam: dimensionless, heat_in_blowdown_btuh: M L^2 T^-3, flash_steam_lb_hr: M / T, annual_recovery_saving: dimensionless, alt_cycles_annual_saving: dimensionless }
export function computeBlowdownHeatRecovery({ steam_rate_lb_hr = 0, cycles_of_concentration = 0, alt_cycles_of_concentration = 0, blowdown_liquid_enthalpy_btu_lb = 338.5, flash_liquid_enthalpy_btu_lb = 196.2, flash_latent_btu_lb = 960.2, makeup_temp_f = 60, heat_exchanger_effectiveness = 0.85, boiler_efficiency = 0.8, fuel_cost_per_mmbtu = 0, hours_per_year = 8000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(steam_rate_lb_hr > 0)) return { error: "Steam rate must be positive (lb/hr)." };
  if (!(cycles_of_concentration > 1)) return { error: "Cycles of concentration must exceed 1 -- at 1 the boiler water is the feedwater and there is nothing to hold back." };
  if (!(alt_cycles_of_concentration > 1)) return { error: "The compared cycles of concentration must exceed 1." };
  if (!(makeup_temp_f >= 32)) return { error: "Makeup water temperature must be at or above 32 F." };
  const makeup_enthalpy_btu_lb = makeup_temp_f - 32;
  if (!(blowdown_liquid_enthalpy_btu_lb > flash_liquid_enthalpy_btu_lb)) return { error: "The boiler saturated-liquid enthalpy must exceed the flash tank's, or nothing flashes." };
  if (!(flash_liquid_enthalpy_btu_lb > makeup_enthalpy_btu_lb)) return { error: "The flash tank liquid must be hotter than the makeup water for the heat exchanger to do anything." };
  if (!(flash_latent_btu_lb > 0)) return { error: "The flash tank latent heat must be positive (BTU/lb)." };
  if (!(heat_exchanger_effectiveness > 0 && heat_exchanger_effectiveness <= 1)) return { error: "Heat exchanger effectiveness must be over 0 and at most 1." };
  if (!(boiler_efficiency > 0 && boiler_efficiency <= 1)) return { error: "Boiler efficiency must be over 0 and at most 1." };
  if (!(fuel_cost_per_mmbtu >= 0)) return { error: "Fuel cost cannot be negative ($ per MMBTU)." };
  if (!(hours_per_year > 0)) return { error: "Operating hours per year must be positive." };
  // Same TDS mass balance `steam-boiler-blowdown` uses: blowdown as a share of
  // STEAM is FW_TDS / (BW_TDS - FW_TDS), which is 1 / (cycles - 1). The two
  // tiles must not disagree about how much blowdown a boiler makes.
  const blowdown_lb_hr = steam_rate_lb_hr / (cycles_of_concentration - 1);
  const blowdown_pct_of_steam = blowdown_lb_hr / steam_rate_lb_hr * 100;
  const heat_per_lb_btu = blowdown_liquid_enthalpy_btu_lb - makeup_enthalpy_btu_lb;
  const heat_in_blowdown_btuh = blowdown_lb_hr * heat_per_lb_btu;
  const annual_cost_of_blowdown = heat_in_blowdown_btuh / boiler_efficiency * fuel_cost_per_mmbtu / 1e6 * hours_per_year;
  // Stage one: let the blowdown down to the flash tank. Same relation as
  // `flash-steam-pct`: the fraction is the enthalpy drop over the low-side
  // latent heat.
  const flash_fraction = (blowdown_liquid_enthalpy_btu_lb - flash_liquid_enthalpy_btu_lb) / flash_latent_btu_lb;
  const flash_steam_lb_hr = blowdown_lb_hr * flash_fraction;
  const flash_steam_enthalpy_btu_lb = flash_liquid_enthalpy_btu_lb + flash_latent_btu_lb;
  const flash_heat_btuh = flash_steam_lb_hr * (flash_steam_enthalpy_btu_lb - makeup_enthalpy_btu_lb);
  // Stage two: the liquid left behind is still near boiling, and goes through
  // a heat exchanger to preheat makeup water.
  const residual_liquid_lb_hr = blowdown_lb_hr - flash_steam_lb_hr;
  const exchanger_heat_btuh = residual_liquid_lb_hr * (flash_liquid_enthalpy_btu_lb - makeup_enthalpy_btu_lb) * heat_exchanger_effectiveness;
  const recovered_btuh = flash_heat_btuh + exchanger_heat_btuh;
  const recovered_pct = heat_in_blowdown_btuh > 0 ? recovered_btuh / heat_in_blowdown_btuh * 100 : 0;
  const annual_recovery_saving = recovered_btuh / boiler_efficiency * fuel_cost_per_mmbtu / 1e6 * hours_per_year;
  // The chemistry lever, which comes first: fewer pounds blown down at all.
  const alt_blowdown_lb_hr = steam_rate_lb_hr / (alt_cycles_of_concentration - 1);
  const blowdown_reduction_lb_hr = blowdown_lb_hr - alt_blowdown_lb_hr;
  const alt_cycles_annual_saving = blowdown_reduction_lb_hr * heat_per_lb_btu / boiler_efficiency * fuel_cost_per_mmbtu / 1e6 * hours_per_year;
  const outs = [blowdown_lb_hr, heat_in_blowdown_btuh, flash_steam_lb_hr, recovered_btuh, annual_recovery_saving, alt_cycles_annual_saving];
  if (!outs.every(Number.isFinite)) return { error: "Blowdown heat recovery math is not a finite value." };
  return {
    blowdown_lb_hr, blowdown_pct_of_steam, heat_per_lb_btu, heat_in_blowdown_btuh,
    annual_cost_of_blowdown, flash_fraction, flash_steam_lb_hr, flash_heat_btuh,
    residual_liquid_lb_hr, exchanger_heat_btuh, recovered_btuh, recovered_pct,
    annual_recovery_saving, alt_blowdown_lb_hr, blowdown_reduction_lb_hr,
    alt_cycles_annual_saving, cycles_of_concentration, alt_cycles_of_concentration,
    makeup_enthalpy_btu_lb,
    lever_verdict: alt_cycles_annual_saving > annual_recovery_saving
      ? "the treatment lever is worth MORE than the heat recovery here -- fewer pounds blown down beats recovering heat from the pounds you blow down"
      : "the heat recovery is worth more than this treatment change, but the treatment change costs no capital",
    note: "Blowdown volume is set by chemistry, not by a valve position. A boiler concentrates dissolved solids as it makes steam, and blowdown is what holds the concentration at the limit, so the blowdown rate is steam rate / (cycles - 1) -- the same TDS mass balance the blowdown-rate calculator uses, stated in cycles rather than in ppm. A plant running 5 cycles blows down 25% of its steam production; one running 10 blows down 11%. That is why water treatment and blowdown rate are one decision and not two. The heat is the part that goes down the drain. Blowdown leaves at saturation temperature, so 5,000 lb/hr at 150 psig carries about 310 BTU a pound above 60 degF makeup, which is 1.55 MMBTU an hour, and at 80% boiler efficiency, $9 per MMBTU and 8,000 hours that is roughly $140,000 a year of fuel. Recovery has two stages and both are worth taking. Let the blowdown down to a flash tank and about 15% of it flashes to steam that goes straight to the deaerator, displacing live steam; the liquid that remains is still near boiling and goes through a heat exchanger to preheat makeup water. Together they recover most of the stream's energy, with payback measured in months on a plant of any size. But treatment comes first, because it removes the pounds rather than chasing their heat: going from 5 cycles to 10 more than halves the blowdown and is worth tens of thousands a year on its own, before any heat exchanger is bought. The other reason to compute it is that continuous blowdown control is often mis-set -- a plant blowing down on a manual valve rather than on measured conductivity is usually blowing down too much, and this shows what that costs directly. The achievable cycles are set by the boiler water chemistry limits for the pressure and by the makeup water quality, and pushing cycles beyond what the treatment program supports causes scale and carryover, which costs far more than the blowdown saved. Those limits come from the water treatment specialist and the boiler manufacturer, not from an optimization. This does not size the flash tank, the heat exchanger, or the blowdown control valve, and it does not address the separate bottom blowdown that removes sludge and which is not continuous. It does not evaluate discharge temperature limits on blowdown to sewer, which are commonly regulated. Steam boiler operation is a licensed activity in many jurisdictions: the boiler manufacturer, the water treatment program, ASME, and the jurisdiction's boiler inspector govern.",
  };
}
const blowdownHeatRecoveryExample = { inputs: { steam_rate_lb_hr: 20000, cycles_of_concentration: 5, alt_cycles_of_concentration: 10, blowdown_liquid_enthalpy_btu_lb: 338.5, flash_liquid_enthalpy_btu_lb: 196.2, flash_latent_btu_lb: 960.2, makeup_temp_f: 60, heat_exchanger_effectiveness: 0.85, boiler_efficiency: 0.8, fuel_cost_per_mmbtu: 9, hours_per_year: 8000 } };
STEAMPLANT_RENDERERS["blowdown-heat-recovery"] = _simpleRenderer({
  citation: "Citation: the continuous surface blowdown relation by name -- blowdown / steam = feedwater TDS / (boiler TDS - feedwater TDS) = 1 / (cycles - 1), the same TDS mass balance the blowdown-rate calculator uses -- and the flash fraction (h_f high - h_f low) / h_fg low at the flash tank pressure. Saturated water enthalpies are entered from the steam tables for the boiler and flash tank pressures. ASME, the boiler manufacturer, the water treatment program, and the jurisdiction's boiler inspector govern.",
  example: blowdownHeatRecoveryExample.inputs,
  fields: [
    { key: "steam_rate_lb_hr", label: "Steam rate (lb/hr)", kind: "number", default: 20000 },
    { key: "cycles_of_concentration", label: "Cycles of concentration", kind: "number", default: 5 },
    { key: "alt_cycles_of_concentration", label: "Cycles after a treatment improvement", kind: "number", default: 10 },
    { key: "blowdown_liquid_enthalpy_btu_lb", label: "Saturated liquid enthalpy at boiler pressure (BTU/lb)", kind: "number", default: 338.5 },
    { key: "flash_liquid_enthalpy_btu_lb", label: "Saturated liquid enthalpy at flash tank pressure (BTU/lb)", kind: "number", default: 196.2 },
    { key: "flash_latent_btu_lb", label: "Latent heat at flash tank pressure (BTU/lb)", kind: "number", default: 960.2 },
    { key: "makeup_temp_f", label: "Makeup water temperature (F)", kind: "number", default: 60 },
    { key: "heat_exchanger_effectiveness", label: "Blowdown heat exchanger effectiveness (0-1)", kind: "number", default: 0.85 },
    { key: "boiler_efficiency", label: "Boiler efficiency (0-1)", kind: "number", default: 0.8 },
    { key: "fuel_cost_per_mmbtu", label: "Fuel cost ($ per MMBTU)", kind: "number", default: 9 },
    { key: "hours_per_year", label: "Operating hours per year", kind: "number", default: 8000 },
  ],
  outputs: [
    { key: "b", id: "bhr-out-b", label: "Blowdown rate", value: (r) => fmt(r.blowdown_lb_hr, 0) + " lb/hr, " + fmt(r.blowdown_pct_of_steam, 1) + "% of steam -- set by the cycles, not by the valve" },
    { key: "h", id: "bhr-out-h", label: "Heat going down the drain", value: (r) => fmt(r.heat_in_blowdown_btuh / 1e6, 2) + " MMBTU/hr at " + fmt(r.heat_per_lb_btu, 0) + " BTU/lb above makeup -- $" + fmt(r.annual_cost_of_blowdown, 0) + " a year of fuel" },
    { key: "f", id: "bhr-out-f", label: "Flash steam to the deaerator", value: (r) => fmt(r.flash_steam_lb_hr, 0) + " lb/hr, " + fmt(r.flash_fraction * 100, 1) + "% of the blowdown -- it displaces live steam" },
    { key: "x", id: "bhr-out-x", label: "Heat exchanger on the remaining liquid", value: (r) => fmt(r.exchanger_heat_btuh / 1e6, 2) + " MMBTU/hr from " + fmt(r.residual_liquid_lb_hr, 0) + " lb/hr still near boiling" },
    { key: "r", id: "bhr-out-r", label: "Recovered, both stages", value: (r) => fmt(r.recovered_pct, 0) + "% of the stream, worth $" + fmt(r.annual_recovery_saving, 0) + " a year" },
    { key: "c", id: "bhr-out-c", label: "Treatment first", value: (r) => "at " + fmt(r.alt_cycles_of_concentration, 0) + " cycles blowdown falls to " + fmt(r.alt_blowdown_lb_hr, 0) + " lb/hr, worth $" + fmt(r.alt_cycles_annual_saving, 0) + " a year with no capital -- " + r.lever_verdict },
    { key: "n", id: "bhr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBlowdownHeatRecovery,
});

// ============ spec-v1567: deaerator steam demand and vent rate ============

// dims: in { feedwater_lb_hr: M / T, condensate_fraction: dimensionless, alt_condensate_fraction: dimensionless, condensate_temp_f: T, makeup_temp_f: T, da_saturation_temp_f: T, latent_heat_btu_lb: L^2 T^-2, steam_enthalpy_btu_lb: L^2 T^-2, vent_fraction: dimensionless, boiler_efficiency: dimensionless, fuel_cost_per_mmbtu: dimensionless, hours_per_year: T } out: { mixed_temp_f: T, heating_steam_lb_hr: M / T, heating_steam_pct: dimensionless, vent_steam_lb_hr: M / T, vent_annual_cost: dimensionless, condensate_return_annual_saving: dimensionless }
export function computeDeaeratorSteamDemand({ feedwater_lb_hr = 0, condensate_fraction = 0.6, alt_condensate_fraction = 0.8, condensate_temp_f = 190, makeup_temp_f = 60, da_saturation_temp_f = 227, latent_heat_btu_lb = 960.2, steam_enthalpy_btu_lb = 1156.4, vent_fraction = 0.003, boiler_efficiency = 0.8, fuel_cost_per_mmbtu = 0, hours_per_year = 8000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(feedwater_lb_hr > 0)) return { error: "Feedwater flow must be positive (lb/hr)." };
  if (!(condensate_fraction >= 0 && condensate_fraction < 1)) return { error: "Condensate return fraction must be at least 0 and below 1." };
  if (!(alt_condensate_fraction >= 0 && alt_condensate_fraction < 1)) return { error: "The compared condensate return fraction must be at least 0 and below 1." };
  if (!(condensate_temp_f > 32)) return { error: "Condensate temperature must be above 32 F." };
  if (!(makeup_temp_f > 32)) return { error: "Makeup temperature must be above 32 F." };
  if (!(latent_heat_btu_lb > 0)) return { error: "The latent heat at the deaerator pressure must be positive (BTU/lb)." };
  if (!(steam_enthalpy_btu_lb > latent_heat_btu_lb)) return { error: "Steam enthalpy must exceed the latent heat (it carries the liquid enthalpy too)." };
  if (!(vent_fraction >= 0 && vent_fraction < 1)) return { error: "Vent rate must be at least 0 and below 1 of throughput." };
  if (!(boiler_efficiency > 0 && boiler_efficiency <= 1)) return { error: "Boiler efficiency must be over 0 and at most 1." };
  if (!(fuel_cost_per_mmbtu >= 0)) return { error: "Fuel cost cannot be negative ($ per MMBTU)." };
  if (!(hours_per_year > 0)) return { error: "Operating hours per year must be positive." };
  // The incoming water is a mixture, and the colder it is the more steam the
  // deaerator takes to bring it to saturation.
  const mixed_temp_f = condensate_fraction * condensate_temp_f + (1 - condensate_fraction) * makeup_temp_f;
  if (!(da_saturation_temp_f > mixed_temp_f)) return { error: "The deaerator saturation temperature must exceed the mixed incoming temperature, or there is nothing to heat." };
  const heat_required_btuh = feedwater_lb_hr * (da_saturation_temp_f - mixed_temp_f);
  const heating_steam_lb_hr = heat_required_btuh / latent_heat_btu_lb;
  const heating_steam_pct = heating_steam_lb_hr / feedwater_lb_hr * 100;
  // A pound of steam costs the boiler the enthalpy rise from FEEDWATER, and
  // the feedwater is already at the deaerator's saturation temperature -- so
  // charging DA steam from the makeup temperature double-counts this heat.
  const feedwater_enthalpy_btu_lb = steam_enthalpy_btu_lb - latent_heat_btu_lb;
  const fuel_per_lb_steam_btu = (steam_enthalpy_btu_lb - feedwater_enthalpy_btu_lb) / boiler_efficiency;
  const alt_mixed_temp_f = alt_condensate_fraction * condensate_temp_f + (1 - alt_condensate_fraction) * makeup_temp_f;
  const alt_heat_required_btuh = feedwater_lb_hr * Math.max(da_saturation_temp_f - alt_mixed_temp_f, 0);
  const alt_heating_steam_lb_hr = alt_heat_required_btuh / latent_heat_btu_lb;
  const alt_heating_steam_pct = alt_heating_steam_lb_hr / feedwater_lb_hr * 100;
  const steam_saved_lb_hr = heating_steam_lb_hr - alt_heating_steam_lb_hr;
  const condensate_return_annual_saving = steam_saved_lb_hr * fuel_per_lb_steam_btu / 1e6 * fuel_cost_per_mmbtu * hours_per_year;
  // The vent is small, continuous, and mis-set in both directions.
  const vent_steam_lb_hr = feedwater_lb_hr * vent_fraction;
  const vent_annual_cost = vent_steam_lb_hr * fuel_per_lb_steam_btu / 1e6 * fuel_cost_per_mmbtu * hours_per_year;
  const outs = [mixed_temp_f, heating_steam_lb_hr, heating_steam_pct, vent_steam_lb_hr, vent_annual_cost, condensate_return_annual_saving];
  if (!outs.every(Number.isFinite)) return { error: "Deaerator heat balance is not a finite value." };
  return {
    mixed_temp_f, heat_required_btuh, heating_steam_lb_hr, heating_steam_pct,
    alt_mixed_temp_f, alt_heating_steam_lb_hr, alt_heating_steam_pct,
    steam_saved_lb_hr, condensate_return_annual_saving,
    vent_steam_lb_hr, vent_annual_cost, fuel_per_lb_steam_btu, feedwater_enthalpy_btu_lb,
    da_saturation_temp_f, condensate_fraction, alt_condensate_fraction, vent_fraction,
    vent_verdict: vent_fraction === 0
      ? "CLOSED, which defeats the deaerator entirely -- the non-condensables it has just liberated have nowhere to go and stay in the water"
      : "a small steady plume, and the cost of it is the price of the deaeration working",
    note: "A deaerator heats feedwater to saturation to drive out oxygen, and the steam it takes to do that is a real load on the boiler that plants routinely leave out of their steam balance. The heating steam is a mixing calculation: enough steam condenses into the feedwater to bring it from whatever temperature the condensate and makeup arrive at up to the saturation temperature for the operating pressure -- about 227 degF at 5 psig, 212 degF atmospheric. Because it is a mixing calculation, the colder the incoming water the more steam it takes, which is why condensate return moves this number directly. Returning 60% of a 25,000 lb/hr feedwater flow at 190 degF against 40% makeup at 60 degF puts the mixture at 138 degF and calls for about 2,318 lb/hr of steam, 9.3% of throughput; raise the return to 80% and the mixture is 164 degF, the demand falls to 1,641 lb/hr, and 677 lb/hr of steam stops being raised at all. Condensate return pays twice -- once for the water and the treatment it does not need, and once here. One caution on valuing that saving: a pound of steam costs the boiler the enthalpy rise from its FEEDWATER, and the feedwater is already at the deaerator's saturation temperature, so charging deaerator steam all the way from the makeup temperature double-counts heat the deaerator is what supplies. The vent is the part that gets mis-set, and it fails in both directions. Vented too little and the non-condensables the deaerator has just liberated have nowhere to go, so they stay in the water and an expensive vessel is doing nothing while corrosion continues downstream. Vented too much and usable steam goes to atmosphere continuously. The correct setting is a small steady plume, typically a few tenths of a percent of throughput, and the point of putting a dollar figure on it is to make it a deliberate choice rather than a valve someone cracked. The consequence of getting deaeration wrong is not energy, it is boiler tube and condensate line corrosion, which is why the vent is never closed to save steam. This does not size the deaerator, its storage section, or the pegging steam control, and it does not establish whether the unit achieves its rated oxygen removal, which is a dissolved oxygen measurement rather than a calculation. It does not address the net positive suction head available to the boiler feed pumps, which the deaerator's elevation and operating pressure govern and which is the usual reason a feed pump cavitates. It does not cover chemical oxygen scavenging, which is required regardless because mechanical deaeration alone does not reach the required residual. Steam plant operation is a licensed activity in many jurisdictions: the deaerator manufacturer, the water treatment program, ASME, and the jurisdiction's boiler inspector govern.",
  };
}
const deaeratorSteamDemandExample = { inputs: { feedwater_lb_hr: 25000, condensate_fraction: 0.6, alt_condensate_fraction: 0.8, condensate_temp_f: 190, makeup_temp_f: 60, da_saturation_temp_f: 227, latent_heat_btu_lb: 960.2, steam_enthalpy_btu_lb: 1156.4, vent_fraction: 0.003, boiler_efficiency: 0.8, fuel_cost_per_mmbtu: 9, hours_per_year: 8000 } };
STEAMPLANT_RENDERERS["deaerator-steam-demand"] = _simpleRenderer({
  citation: "Citation: the deaerating feedwater heater mixing heat balance by name -- mixed incoming temperature from the condensate and makeup proportions, heat = flow x (saturation temperature - mixed temperature), and heating steam = heat / the latent heat at the deaerator operating pressure. Saturation temperature, latent heat, and steam enthalpy are entered from the steam tables for that pressure. ASME, the deaerator manufacturer, the water treatment program, and the jurisdiction's boiler inspector govern.",
  example: deaeratorSteamDemandExample.inputs,
  fields: [
    { key: "feedwater_lb_hr", label: "Feedwater flow (lb/hr)", kind: "number", default: 25000 },
    { key: "condensate_fraction", label: "Condensate return fraction (0-1)", kind: "number", default: 0.6 },
    { key: "alt_condensate_fraction", label: "Condensate return after an improvement (0-1)", kind: "number", default: 0.8 },
    { key: "condensate_temp_f", label: "Returned condensate temperature (F)", kind: "number", default: 190 },
    { key: "makeup_temp_f", label: "Makeup water temperature (F)", kind: "number", default: 60 },
    { key: "da_saturation_temp_f", label: "Deaerator saturation temperature (F)", kind: "number", default: 227 },
    { key: "latent_heat_btu_lb", label: "Latent heat at deaerator pressure (BTU/lb)", kind: "number", default: 960.2 },
    { key: "steam_enthalpy_btu_lb", label: "Steam enthalpy at deaerator pressure (BTU/lb)", kind: "number", default: 1156.4 },
    { key: "vent_fraction", label: "Vent rate as a fraction of throughput", kind: "number", default: 0.003 },
    { key: "boiler_efficiency", label: "Boiler efficiency (0-1)", kind: "number", default: 0.8 },
    { key: "fuel_cost_per_mmbtu", label: "Fuel cost ($ per MMBTU)", kind: "number", default: 9 },
    { key: "hours_per_year", label: "Operating hours per year", kind: "number", default: 8000 },
  ],
  outputs: [
    { key: "m", id: "dsd-out-m", label: "Mixed incoming temperature", value: (r) => fmt(r.mixed_temp_f, 0) + " F, to be raised to " + fmt(r.da_saturation_temp_f, 0) + " F" },
    { key: "s", id: "dsd-out-s", label: "Heating steam required", value: (r) => fmt(r.heating_steam_lb_hr, 0) + " lb/hr, " + fmt(r.heating_steam_pct, 1) + "% of throughput -- a real boiler load most steam balances omit" },
    { key: "c", id: "dsd-out-c", label: "More condensate return", value: (r) => "at " + fmt(r.alt_condensate_fraction * 100, 0) + "% return the mixture is " + fmt(r.alt_mixed_temp_f, 0) + " F and the demand " + fmt(r.alt_heating_steam_lb_hr, 0) + " lb/hr -- " + fmt(r.steam_saved_lb_hr, 0) + " lb/hr saved" },
    { key: "a", id: "dsd-out-a", label: "That saving is worth", value: (r) => "$" + fmt(r.condensate_return_annual_saving, 0) + " a year, valuing steam at " + fmt(r.fuel_per_lb_steam_btu, 0) + " BTU of fuel a pound from feedwater already at saturation" },
    { key: "v", id: "dsd-out-v", label: "The vent", value: (r) => fmt(r.vent_steam_lb_hr, 0) + " lb/hr, $" + fmt(r.vent_annual_cost, 0) + " a year -- " + r.vent_verdict },
    { key: "n", id: "dsd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDeaeratorSteamDemand,
});

// ============ spec-v1569: boiler safety valve relieving capacity ============

// dims: in { rated_steaming_capacity_lb_hr: M / T, fuel_input_btuh: M L^2 T^-3, boiler_efficiency: dimensionless, steam_enthalpy_rise_btu_lb: L^2 T^-2, mawp_psig: M L^-1 T^-2, accumulation_limit_pct: dimensionless, valve1_set_psig: M L^-1 T^-2, valve1_capacity_lb_hr: M / T, valve2_set_psig: M L^-1 T^-2, valve2_capacity_lb_hr: M / T, valve3_set_psig: M L^-1 T^-2, valve3_capacity_lb_hr: M / T, uprated_capacity_lb_hr: M / T } out: { required_capacity_lb_hr: M / T, installed_capacity_lb_hr: M / T, margin_lb_hr: M / T, margin_pct: dimensionless, accumulation_pressure_psig: M L^-1 T^-2, uprated_shortfall_lb_hr: M / T }
export function computeSafetyValveCapacity({ rated_steaming_capacity_lb_hr = 0, fuel_input_btuh = 0, boiler_efficiency = 0.8, steam_enthalpy_rise_btu_lb = 1000, mawp_psig = 0, accumulation_limit_pct = 6, valve1_set_psig = 0, valve1_capacity_lb_hr = 0, valve2_set_psig = 0, valve2_capacity_lb_hr = 0, valve3_set_psig = 0, valve3_capacity_lb_hr = 0, uprated_capacity_lb_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_steaming_capacity_lb_hr > 0)) return { error: "The boiler's maximum designed steaming capacity must be positive (lb/hr)." };
  if (!(fuel_input_btuh >= 0)) return { error: "Fuel input cannot be negative (BTU/hr)." };
  if (!(boiler_efficiency > 0 && boiler_efficiency <= 1)) return { error: "Boiler efficiency must be over 0 and at most 1." };
  if (!(steam_enthalpy_rise_btu_lb > 0)) return { error: "The steam enthalpy rise above feedwater must be positive (BTU/lb)." };
  if (!(mawp_psig > 0)) return { error: "Maximum allowable working pressure must be positive (psig)." };
  if (!(accumulation_limit_pct > 0)) return { error: "The accumulation limit must be positive (percent)." };
  if (!(valve1_capacity_lb_hr > 0)) return { error: "At least one valve must have a positive stamped capacity (lb/hr)." };
  if (!(valve1_set_psig > 0)) return { error: "The first valve's set pressure must be positive (psig)." };
  const valves = [
    { set_psig: valve1_set_psig, capacity_lb_hr: valve1_capacity_lb_hr },
    { set_psig: valve2_set_psig, capacity_lb_hr: valve2_capacity_lb_hr },
    { set_psig: valve3_set_psig, capacity_lb_hr: valve3_capacity_lb_hr },
  ].filter((v) => v.capacity_lb_hr > 0);
  if (valves.some((v) => !(v.set_psig > 0))) return { error: "Every valve with a stamped capacity needs a set pressure (psig)." };
  if (uprated_capacity_lb_hr < 0) return { error: "The compared (uprated) steaming capacity cannot be negative." };
  // The requirement is the greater of the plate rating and what the fuel input
  // can actually make: a burner uprate moves the required capacity even though
  // the nameplate does not.
  const capacity_from_fuel_lb_hr = fuel_input_btuh > 0 ? fuel_input_btuh * boiler_efficiency / steam_enthalpy_rise_btu_lb : 0;
  const required_capacity_lb_hr = Math.max(rated_steaming_capacity_lb_hr, capacity_from_fuel_lb_hr);
  const fuel_governs = capacity_from_fuel_lb_hr > rated_steaming_capacity_lb_hr;
  const installed_capacity_lb_hr = valves.reduce((a, v) => a + v.capacity_lb_hr, 0);
  const margin_lb_hr = installed_capacity_lb_hr - required_capacity_lb_hr;
  const margin_pct = margin_lb_hr / required_capacity_lb_hr * 100;
  const passes = margin_lb_hr >= 0;
  const lowest_set_psig = Math.min(...valves.map((v) => v.set_psig));
  const highest_set_psig = Math.max(...valves.map((v) => v.set_psig));
  const lowest_set_compliant = lowest_set_psig <= mawp_psig;
  const accumulation_pressure_psig = mawp_psig * (1 + accumulation_limit_pct / 100);
  const supplementary_above_mawp = highest_set_psig > mawp_psig;
  const uprated_shortfall_lb_hr = uprated_capacity_lb_hr > 0 ? uprated_capacity_lb_hr - installed_capacity_lb_hr : 0;
  const uprate_passes = uprated_shortfall_lb_hr <= 0;
  const outs = [required_capacity_lb_hr, installed_capacity_lb_hr, margin_lb_hr, margin_pct, accumulation_pressure_psig];
  if (!outs.every(Number.isFinite)) return { error: "Safety valve capacity math is not a finite value." };
  return {
    capacity_from_fuel_lb_hr, required_capacity_lb_hr, fuel_governs,
    installed_capacity_lb_hr, valve_count: valves.length, margin_lb_hr, margin_pct, passes,
    lowest_set_psig, highest_set_psig, lowest_set_compliant, supplementary_above_mawp,
    accumulation_pressure_psig, accumulation_limit_pct, mawp_psig,
    uprated_capacity_lb_hr, uprated_shortfall_lb_hr, uprate_passes,
    capacity_verdict: passes
      ? "PASSES with " + fmt(margin_lb_hr, 0) + " lb/hr, " + fmt(margin_pct, 1) + "% above required"
      : "FAILS by " + fmt(-margin_lb_hr, 0) + " lb/hr -- the boiler is outside its code case",
    set_pressure_verdict: lowest_set_compliant
      ? "the lowest set pressure is at or below the maximum allowable working pressure, which the code requires"
      : "the LOWEST set pressure is ABOVE the maximum allowable working pressure, which no valve may be",
    uprate_verdict: uprate_passes
      ? "still covered by the installed valves"
      : "short by " + fmt(uprated_shortfall_lb_hr, 0) + " lb/hr -- the valves were never revisited",
    note: "The requirement is simple to state and easy to fail after twenty years of modifications: the safety valves must pass everything the boiler can generate at full fire with the outlet shut, without the pressure climbing more than the permitted accumulation above the maximum allowable working pressure. The accumulation test is what proves it. Where plants get into trouble is that the burner has been uprated, or the boiler re-rated, or a valve replaced with one of a different stamped capacity, and nobody re-ran the sum. A boiler rated 20,700 lb/hr with valves stamped 11,500 and 10,200 has 21,700 lb/hr installed and passes; uprate the burner to 24,000 lb/hr and the same valves are 2,300 lb/hr short, nothing was done to them, and the boiler is now outside its code case. Two details carry weight. Stamped capacity is at a specific set pressure -- the same valve passes more at a higher one -- so the sum has to be taken at the pressures actually installed, not at a catalogue figure, and a supplementary valve set above the maximum allowable working pressure carries its stamp at THAT pressure. And where two valves are fitted the code governs both the set pressures and the spread between them, so a plant cannot simply install two of whatever adds up. The required capacity itself is not always the nameplate: for a fired boiler it is at least the maximum output the fuel input supports, which is why the fuel input and efficiency are entered here and the larger of the two figures governs. Safety valves are also a maintenance item with a testing interval, and a valve that has not lifted in years may not lift at its set pressure -- its stamped capacity is a statement about a valve that works. This is a capacity comparison from stamped and rated values the user supplies. It is not a relief system design and it does not substitute for the ASME code calculation or for the accumulation test, which is the actual demonstration of compliance. It does not select valves, determine set pressures and their permitted spread, size discharge piping and drip pans -- a discharge line that imposes back pressure or that puts thrust on the valve body defeats it -- evaluate economizer or superheater relief requirements, or address reheaters and other special cases. It does not evaluate valve condition or testing interval. Safety valves are the last line of protection on a pressure vessel that can fail catastrophically: ASME Boiler and Pressure Vessel Code Sections I and IV as applicable, the National Board inspection code, the valve manufacturer, and the jurisdiction's boiler inspector govern.",
  };
}
const safetyValveCapacityExample = { inputs: { rated_steaming_capacity_lb_hr: 20700, fuel_input_btuh: 25900000, boiler_efficiency: 0.8, steam_enthalpy_rise_btu_lb: 1000, mawp_psig: 150, accumulation_limit_pct: 6, valve1_set_psig: 150, valve1_capacity_lb_hr: 11500, valve2_set_psig: 155, valve2_capacity_lb_hr: 10200, valve3_set_psig: 0, valve3_capacity_lb_hr: 0, uprated_capacity_lb_hr: 24000 } };
STEAMPLANT_RENDERERS["safety-valve-capacity"] = _simpleRenderer({
  citation: "Citation: the ASME Section I and IV relieving-capacity requirement, cited not mirrored -- the sum of the stamped capacities of the installed safety valves at their installed set pressures must be at least the boiler's maximum designed steaming capacity, and for a fired boiler at least the output the fuel input supports; no valve is set above the maximum allowable working pressure except as the code permits for supplementary valves, and pressure must not rise more than the permitted accumulation. The accumulation test is the demonstration of compliance. ASME BPVC Sections I and IV, the National Board inspection code, the valve manufacturer, and the jurisdiction's boiler inspector govern.",
  example: safetyValveCapacityExample.inputs,
  fields: [
    { key: "rated_steaming_capacity_lb_hr", label: "Boiler maximum designed steaming capacity (lb/hr)", kind: "number", default: 20700 },
    { key: "fuel_input_btuh", label: "Maximum fuel input (BTU/hr, 0 to skip)", kind: "number", default: 25900000 },
    { key: "boiler_efficiency", label: "Boiler efficiency (0-1)", kind: "number", default: 0.8 },
    { key: "steam_enthalpy_rise_btu_lb", label: "Steam enthalpy rise above feedwater (BTU/lb)", kind: "number", default: 1000 },
    { key: "mawp_psig", label: "Maximum allowable working pressure (psig)", kind: "number", default: 150 },
    { key: "accumulation_limit_pct", label: "Permitted accumulation (percent of MAWP)", kind: "number", default: 6 },
    { key: "valve1_set_psig", label: "Valve 1 set pressure (psig)", kind: "number", default: 150 },
    { key: "valve1_capacity_lb_hr", label: "Valve 1 stamped capacity (lb/hr)", kind: "number", default: 11500 },
    { key: "valve2_set_psig", label: "Valve 2 set pressure (psig)", kind: "number", default: 155 },
    { key: "valve2_capacity_lb_hr", label: "Valve 2 stamped capacity (lb/hr, 0 if not fitted)", kind: "number", default: 10200 },
    { key: "valve3_set_psig", label: "Valve 3 set pressure (psig)", kind: "number", default: 0 },
    { key: "valve3_capacity_lb_hr", label: "Valve 3 stamped capacity (lb/hr, 0 if not fitted)", kind: "number", default: 0 },
    { key: "uprated_capacity_lb_hr", label: "Steaming capacity after an uprate (lb/hr, 0 to skip)", kind: "number", default: 24000 },
  ],
  outputs: [
    { key: "r", id: "svc-out-r", label: "Required relieving capacity", value: (r) => fmt(r.required_capacity_lb_hr, 0) + " lb/hr -- " + (r.fuel_governs ? "the FUEL INPUT governs, not the nameplate: it supports " + fmt(r.capacity_from_fuel_lb_hr, 0) + " lb/hr" : "the nameplate rating governs") },
    { key: "i", id: "svc-out-i", label: "Installed stamped capacity", value: (r) => fmt(r.installed_capacity_lb_hr, 0) + " lb/hr across " + fmt(r.valve_count, 0) + " valves, at the set pressures actually fitted" },
    { key: "m", id: "svc-out-m", label: "Capacity check", value: (r) => r.capacity_verdict },
    { key: "s", id: "svc-out-s", label: "Set pressures", value: (r) => "lowest " + fmt(r.lowest_set_psig, 0) + " psig against a " + fmt(r.mawp_psig, 0) + " psig MAWP -- " + r.set_pressure_verdict + (r.supplementary_above_mawp ? "; the highest at " + fmt(r.highest_set_psig, 0) + " psig is a supplementary valve, and its stamp applies THERE" : "") },
    { key: "a", id: "svc-out-a", label: "Accumulation limit", value: (r) => "pressure must not exceed " + fmt(r.accumulation_pressure_psig, 1) + " psig with the valves relieving (" + fmt(r.accumulation_limit_pct, 0) + "% over MAWP)" },
    { key: "u", id: "svc-out-u", label: "After an uprate", value: (r) => fmt(r.uprated_capacity_lb_hr, 0) + " lb/hr would be " + r.uprate_verdict },
    { key: "n", id: "svc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSafetyValveCapacity,
});

// ============ spec-v1570: fuel oil heating for atomizing viscosity ============

// The ASTM D341 (Walther) form: log10(log10(v + 0.7)) is linear in
// log10(absolute temperature). Two points off the oil's data sheet define the
// line; everything else is interpolation on it.
const _WALTHER_OFFSET = 0.7;
const _RANKINE_OFFSET = 459.67;
const _walther = (v) => Math.log10(Math.log10(v + _WALTHER_OFFSET));
const _unWalther = (x) => Math.pow(10, Math.pow(10, x)) - _WALTHER_OFFSET;

// dims: in { v1_ssu: L^2 / T, t1_f: T, v2_ssu: L^2 / T, t2_f: T, target_ssu: L^2 / T, pumping_limit_ssu: L^2 / T, check_temp_f: T } out: { slope_b: dimensionless, temp_for_target_f: T, temp_for_pumping_f: T, viscosity_at_check_ssu: L^2 / T, setpoint_spread_f: T }
export function computeFuelOilAtomizingViscosity({ v1_ssu = 0, t1_f = 0, v2_ssu = 0, t2_f = 0, target_ssu = 150, pumping_limit_ssu = 4000, check_temp_f = 185 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(v1_ssu > 1)) return { error: "The first viscosity must exceed 1 SSU." };
  if (!(v2_ssu > 1)) return { error: "The second viscosity must exceed 1 SSU." };
  if (!(target_ssu > 1)) return { error: "The target atomizing viscosity must exceed 1 SSU." };
  if (!(pumping_limit_ssu > 1)) return { error: "The pumping viscosity limit must exceed 1 SSU." };
  if (!(t1_f > -_RANKINE_OFFSET)) return { error: "The first temperature must be above absolute zero (F)." };
  if (!(t2_f > -_RANKINE_OFFSET)) return { error: "The second temperature must be above absolute zero (F)." };
  if (!(check_temp_f > -_RANKINE_OFFSET)) return { error: "The check temperature must be above absolute zero (F)." };
  if (t1_f === t2_f) return { error: "The two data points must be at different temperatures -- one point does not define a line." };
  if (v1_ssu === v2_ssu) return { error: "The two data points must have different viscosities." };
  if ((v1_ssu - v2_ssu) * (t1_f - t2_f) > 0) return { error: "Viscosity must fall as temperature rises: check which point goes with which temperature." };
  const y1 = Math.log10(t1_f + _RANKINE_OFFSET);
  const y2 = Math.log10(t2_f + _RANKINE_OFFSET);
  const x1 = _walther(v1_ssu);
  const x2 = _walther(v2_ssu);
  // x = A - B y, so B is positive for a real oil (viscosity falls with heat).
  const slope_b = (x1 - x2) / (y2 - y1);
  const intercept_a = x1 + slope_b * y1;
  const tempFor = (v) => Math.pow(10, (intercept_a - _walther(v)) / slope_b) - _RANKINE_OFFSET;
  const viscosityAt = (t) => _unWalther(intercept_a - slope_b * Math.log10(t + _RANKINE_OFFSET));
  const temp_for_target_f = tempFor(target_ssu);
  const temp_for_pumping_f = tempFor(pumping_limit_ssu);
  const viscosity_at_check_ssu = viscosityAt(check_temp_f);
  const setpoint_spread_f = temp_for_target_f - temp_for_pumping_f;
  const outs = [slope_b, intercept_a, temp_for_target_f, temp_for_pumping_f, viscosity_at_check_ssu, setpoint_spread_f];
  if (!outs.every(Number.isFinite)) return { error: "The viscosity-temperature fit is not a finite value -- check the two data points." };
  const check_in_band = viscosity_at_check_ssu <= target_ssu;
  return {
    slope_b, intercept_a, temp_for_target_f, temp_for_pumping_f,
    viscosity_at_check_ssu, setpoint_spread_f, target_ssu, pumping_limit_ssu, check_temp_f,
    check_shortfall_f: temp_for_target_f - check_temp_f,
    check_verdict: check_in_band
      ? "at or under the atomizing target -- this oil will atomize at that temperature"
      : "well outside the atomizing band, and it will show at the stack as smoke and unburned carbon",
    note: "Heavy fuel oil will not atomize unless it is thin enough, and thin enough is a viscosity number rather than a temperature. Viscosity falls very steeply with heat and the relationship is log-log linear -- log10(log10(v + 0.7)) against log10(absolute temperature) -- so two points off the oil's data sheet define the line and the temperature for any target viscosity follows from it. That is what lets a plant set the heater for the grade actually delivered rather than for the grade the setpoint was chosen for, which matters because grade designations cover a wide range: a No. 6 running 7,000 SSU at 100 degF and 340 at 180 wants about 212 degF to reach 150 SSU, while a lighter delivery running 4,000 SSU at 100 degF and 200 at 180 reaches the same target at 191 degF -- twenty-one degrees lower. Run the lighter oil at the heavier oil's setpoint and it is hotter than it needs to be, which risks vapour lock in the line; run the heavier oil at the lighter one's 191 degF and it arrives at the burner near 251 SSU, well outside the atomizing band. Storage and pumping have their own, much looser limit -- around 4,000 SSU -- reached at a far lower temperature, and confusing the two is how an oil system ends up designed to pump oil it cannot burn. The tank heater keeps the oil movable; a separate final heater at the burner brings it to atomizing viscosity, and they are two setpoints for two different jobs. The symptom of getting it wrong is visible from the stack. Oil too viscous atomizes into large droplets that do not burn completely: smoke, soot, unburned carbon, fouled tubes, and in the worst case an uncontrolled fire in the furnace. Oil too hot can vaporize in the line and starve the burner, so the target is a band rather than a floor. This is an interpolation from two data points the user supplies and it requires the actual oil's data; a table value for a grade can be far from a specific delivery, which is the whole reason to run it per delivery. It does not select a burner, size the heater or the piping, or evaluate the atomizing steam or air requirement, and it does not address the flash point, which limits how hot oil may safely be heated and which the fire code and the oil's own data sheet govern. It does not address water and sediment in the oil, which cause more burner trouble than viscosity does, or sulphur, ash, and the emissions consequences of the fuel, and it does not evaluate combustion, excess air, or stack condition. The burner manufacturer's atomizing viscosity requirement, the oil supplier's data sheet, the adopted fire and mechanical codes, and the jurisdiction's boiler inspector govern.",
  };
}
const fuelOilAtomizingViscosityExample = { inputs: { v1_ssu: 7000, t1_f: 100, v2_ssu: 340, t2_f: 180, target_ssu: 150, pumping_limit_ssu: 4000, check_temp_f: 185 } };
STEAMPLANT_RENDERERS["fuel-oil-atomizing-viscosity"] = _simpleRenderer({
  citation: "Citation: the ASTM D341 (Walther) viscosity-temperature relation by name -- log10(log10(v + 0.7)) is linear in log10(absolute temperature) -- fitted through two viscosity-temperature points from the oil's data sheet. Typical atomizing viscosity is about 100 to 150 SSU and typical pumping limits about 4,000 SSU; both are entered, not assumed. The burner manufacturer's atomizing viscosity requirement, the oil supplier's data sheet, the adopted fire and mechanical codes, and the jurisdiction's boiler inspector govern.",
  example: fuelOilAtomizingViscosityExample.inputs,
  fields: [
    { key: "v1_ssu", label: "Data sheet viscosity 1 (SSU)", kind: "number", default: 7000 },
    { key: "t1_f", label: "Data sheet temperature 1 (F)", kind: "number", default: 100 },
    { key: "v2_ssu", label: "Data sheet viscosity 2 (SSU)", kind: "number", default: 340 },
    { key: "t2_f", label: "Data sheet temperature 2 (F)", kind: "number", default: 180 },
    { key: "target_ssu", label: "Target atomizing viscosity (SSU)", kind: "number", default: 150 },
    { key: "pumping_limit_ssu", label: "Pumping viscosity limit (SSU)", kind: "number", default: 4000 },
    { key: "check_temp_f", label: "Check a heater setpoint (F)", kind: "number", default: 185 },
  ],
  outputs: [
    { key: "a", id: "foa-out-a", label: "Atomizing setpoint at the burner", value: (r) => fmt(r.temp_for_target_f, 0) + " F to reach " + fmt(r.target_ssu, 0) + " SSU" },
    { key: "p", id: "foa-out-p", label: "Pumping setpoint in the tank", value: (r) => fmt(r.temp_for_pumping_f, 0) + " F to reach " + fmt(r.pumping_limit_ssu, 0) + " SSU -- a different job and a much looser limit" },
    { key: "s", id: "foa-out-s", label: "Spread between the two setpoints", value: (r) => fmt(r.setpoint_spread_f, 0) + " F -- heat the tank to the pumping figure and send it straight to the burner and it will smoke" },
    { key: "c", id: "foa-out-c", label: "At the setpoint you entered", value: (r) => fmt(r.check_temp_f, 0) + " F leaves this oil at " + fmt(r.viscosity_at_check_ssu, 0) + " SSU -- " + r.check_verdict },
    { key: "b", id: "foa-out-b", label: "Fitted slope", value: (r) => fmt(r.slope_b, 3) + " -- the log-log slope, so a fixed rise buys much more thinning at the cold end than at the hot end" },
    { key: "n", id: "foa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFuelOilAtomizingViscosity,
});
