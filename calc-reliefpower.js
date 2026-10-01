// calc-reliefpower.js -- Group A Electrical and Group J Trucking and Logistics:
// emergency and temporary power for disaster response.
//
// Band "Emergency and temporary power" of specs/scope-disaster-response.md,
// specs v1888 through v1896. US sources only: manufacturers' published data
// sheets (Cummins, Morningstar, Motorola Solutions), the EPA Power Resilience
// Guide for Water and Wastewater Utilities, Woodward Application Note 01302,
// the WINCO load balancing guide, and NFPA 70 / NFPA 110 cited by number. No
// code table is reproduced; every rating, curve, and threshold is entered
// from the unit's own data sheet.
//
// Tiles (eight keep group "A", Electrical; the fleet fuel tile keeps group
// "J", Trucking and Logistics -- a module is independent of the group letter):
//   v1888 generator-altitude-temp-derate   v1893 critical-load-shed-tiers
//   v1889 generator-part-load-fuel         v1894 mppt-controller-output-current
//   v1890 generator-fleet-fuel-resupply    v1895 radio-site-duty-cycle-battery
//   v1891 generator-droop-load-share       v1896 generator-battery-hybrid-fuel
//   v1892 split-phase-leg-balance

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const value of Object.values(o)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};

function _simpleRenderer(spec) {
  const render = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select"
        ? makeSelect(f.label, f.id || f.key, f.options)
        : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field[f.kind === "select" ? "select" : "input"].value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function update() {
      const params = {};
      for (const f of spec.fields) {
        const el = fields[f.key][f.kind === "select" ? "select" : "input"];
        params[f.key] = f.kind === "select" ? el.value : Number(el.value) || 0;
      }
      const result = spec.compute(params);
      if (result.error) {
        for (const out of Object.values(outs)) out.textContent = "-";
        outs[spec.outputs[0].key].textContent = result.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(result);
    }
    const debounced = debounce(update, DEBOUNCE_MS);
    for (const f of spec.fields) {
      fields[f.key][f.kind === "select" ? "select" : "input"].addEventListener("input", debounced);
    }
    attachExampleButton(inputRegion, () => {
      for (const f of spec.fields) {
        if (spec.example[f.key] !== undefined) fields[f.key][f.kind === "select" ? "select" : "input"].value = String(spec.example[f.key]);
      }
      update();
    });
  };
  render.schema = {
    inputs: spec.fields.map((f) => ({
      key: f.key, label: f.label, kind: f.kind || "number",
      options: f.options || null, default: f.default ?? null, attrs: f.attrs ?? null,
    })),
    outputs: spec.outputs.map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation,
    scope: spec.scope ?? null,
  };
  return render;
}

export const RELIEFPOWER_RENDERERS = {};

// USACE planning rule of thumb recorded in the EPA Power Resilience Guide:
// 0.07 gallons of diesel per hour per kW of generator rating, at full load.
const USACE_GPH_PER_KW = 0.07;
// The EPA guide's comparison practice of stocking for 70% load.
const EPA_COMPARISON_LOAD_FRACTION = 0.7;
// NFPA 110 8.4.2: exercise at not less than 30% of the standby nameplate kW.
const NFPA110_MIN_LOAD_FRACTION = 0.3;
// Split-phase leg voltage and line-to-line voltage.
const LEG_V = 120;
const LINE_V = 240;
// Common MPPT controller output ratings, amperes.
const MPPT_STANDARD_A = [20, 30, 40, 45, 60, 80, 100];

// Straight-line interpolation of a four-point fuel curve (1/4, 1/2, 3/4, full
// of the rating in use). Below 1/4 load the first segment is extended and the
// result is flagged; the caller refuses a non-positive extrapolated burn.
function _fuelAt(load_kw, rating_kw, pts) {
  const xs = [0.25, 0.5, 0.75, 1].map((f) => f * rating_kw);
  let i = 0;
  if (load_kw > xs[1]) i = load_kw > xs[2] ? 2 : 1;
  const gph = pts[i] + (load_kw - xs[i]) / (xs[i + 1] - xs[i]) * (pts[i + 1] - pts[i]);
  return { gph, extrapolated: load_kw < xs[0] };
}

function _curveError(pts) {
  if (!pts.every((p) => p > 0)) return "Every fuel-curve point must be positive.";
  for (let i = 1; i < pts.length; i += 1) {
    if (pts[i] < pts[i - 1]) return "Fuel-curve points cannot decrease as the load rises.";
  }
  return null;
}

// ===================== spec-v1888: generator output derate for altitude and temperature =====================

// dims: in { rated_kw: M L^2 T^-3, site_elevation_ft: L, site_ambient_f: T, altitude_threshold_ft: L, altitude_step_ft: L, altitude_rate_pct: dimensionless, temp_threshold_f: T, temp_step_f: T, temp_rate_pct: dimensionless } out: { altitude_derate_pct: dimensionless, temperature_derate_pct: dimensionless, total_derate_pct: dimensionless, multiplied_derate_pct: dimensionless, available_kw: M L^2 T^-3, available_multiplied_kw: M L^2 T^-3, lost_kw: M L^2 T^-3, method_difference_kw: M L^2 T^-3 }
export function computeGeneratorAltitudeTempDerate({ rated_kw = 0, site_elevation_ft = 0, site_ambient_f = 0, altitude_threshold_ft = 0, altitude_step_ft = 0, altitude_rate_pct = 0, temp_threshold_f = 0, temp_step_f = 0, temp_rate_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_kw > 0)) return { error: "Rated kW must be positive." };
  if (!(altitude_step_ft > 0) || !(temp_step_f > 0)) return { error: "The altitude and temperature derate steps must be positive." };
  if (!(altitude_rate_pct > 0) || !(temp_rate_pct > 0)) return { error: "The altitude and temperature derate rates must be positive." };
  const altitude_derate_pct = altitude_rate_pct * Math.max(0, site_elevation_ft - altitude_threshold_ft) / altitude_step_ft;
  const temperature_derate_pct = temp_rate_pct * Math.max(0, site_ambient_f - temp_threshold_f) / temp_step_f;
  // The tile uses the ADDED combination (conservative) and shows the multiplied one.
  const total_derate_pct = altitude_derate_pct + temperature_derate_pct;
  if (!(total_derate_pct < 100)) return { error: "The combined derate is 100% or more -- the unit makes no usable power at these conditions." };
  const multiplied_factor = (1 - altitude_derate_pct / 100) * (1 - temperature_derate_pct / 100);
  const multiplied_derate_pct = 100 * (1 - multiplied_factor);
  const available_kw = rated_kw * (1 - total_derate_pct / 100);
  const available_multiplied_kw = rated_kw * multiplied_factor;
  return {
    rated_kw, altitude_derate_pct, temperature_derate_pct, total_derate_pct, multiplied_derate_pct,
    available_kw, available_multiplied_kw,
    lost_kw: rated_kw - available_kw,
    method_difference_kw: available_multiplied_kw - available_kw,
    available_pct_of_rated: 100 * available_kw / rated_kw,
    governing_derate: total_derate_pct === 0 ? "none -- the site is inside both thresholds" : altitude_derate_pct >= temperature_derate_pct ? "altitude" : "temperature",
    note: "A diesel engine makes power by burning air, and thin or hot air carries less of it. Every generator data sheet states full output up to an altitude and an ambient temperature, then a percentage off for each step beyond, and the thresholds differ by model, by rating (standby or prime), and by fuel, so they are entered from the unit being used rather than supplied as a generic curve. When both thresholds are exceeded the data sheets say the derates must be combined and rarely say how: adding the percentages is the conservative reading and is what the available kW uses; multiplying the factors gives a slightly higher figure, shown beside it. The derate matters most where a unit sized at sea level for a critical load is dispatched to a high, hot site -- the load it was sized for may no longer fit, and the first symptom is a voltage dip or a stall on a motor start. Feed the available kW to generator-sizing and generator-motor-starting as the real capacity. This does not supply derate rates, address humidity, fuel quality, cooling-system capacity at altitude, or separate alternator derates. The manufacturer's data sheet, NFPA 110 as adopted (the EPSS must be rated for its site conditions), and the AHJ govern.",
  };
}

export const generatorAltitudeTempDerateExample = { inputs: { rated_kw: 300, site_elevation_ft: 5000, site_ambient_f: 110, altitude_threshold_ft: 1800, altitude_step_ft: 1312, altitude_rate_pct: 7, temp_threshold_f: 104, temp_step_f: 18, temp_rate_pct: 7 } };
RELIEFPOWER_RENDERERS["generator-altitude-temp-derate"] = _simpleRenderer({
  citation: "Citation: the generator manufacturer's published derate statement (full output to a stated altitude and ambient, then a percentage per step beyond; worked example from the Cummins DQDAC data sheet), combined by addition as the conservative reading; NFPA 110 cited by number for the EPSS rated for its site conditions. The unit's data sheet governs.",
  example: generatorAltitudeTempDerateExample.inputs,
  fields: [
    { key: "rated_kw", label: "Rated output, standby or prime (kW)" },
    { key: "site_elevation_ft", label: "Site elevation (ft)", attrs: { step: "any" } },
    { key: "site_ambient_f", label: "Site design ambient temperature (degF)", attrs: { step: "any" } },
    { key: "altitude_threshold_ft", label: "Data sheet altitude threshold (ft)", attrs: { step: "any" } },
    { key: "altitude_step_ft", label: "Altitude step (ft)" },
    { key: "altitude_rate_pct", label: "Derate per altitude step (%)" },
    { key: "temp_threshold_f", label: "Data sheet temperature threshold (degF)", attrs: { step: "any" } },
    { key: "temp_step_f", label: "Temperature step (degF)" },
    { key: "temp_rate_pct", label: "Derate per temperature step (%)" },
  ],
  outputs: [
    { key: "available_kw", id: "gatd-out-kw", label: "Available output (derates added)", unit: "kW", value: (r) => fmt(r.available_kw, 1) + " kW (" + fmt(r.available_pct_of_rated, 1) + "% of " + fmt(r.rated_kw, 0) + " kW rated)" },
    { key: "altitude_derate_pct", id: "gatd-out-alt", label: "Altitude derate", value: (r) => fmt(r.altitude_derate_pct, 2) + "%" },
    { key: "temperature_derate_pct", id: "gatd-out-temp", label: "Temperature derate", value: (r) => fmt(r.temperature_derate_pct, 2) + "%" },
    { key: "total_derate_pct", id: "gatd-out-tot", label: "Combined derate, added", value: (r) => fmt(r.total_derate_pct, 2) + "% (" + fmt(r.lost_kw, 1) + " kW lost; mostly " + r.governing_derate + ")" },
    { key: "available_multiplied_kw", id: "gatd-out-mult", label: "Available output (derates multiplied)", unit: "kW", value: (r) => fmt(r.available_multiplied_kw, 1) + " kW (" + fmt(r.multiplied_derate_pct, 2) + "% derate; " + fmt(r.method_difference_kw, 1) + " kW above the added figure)" },
    { key: "note", id: "gatd-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeGeneratorAltitudeTempDerate,
});

// ===================== spec-v1889: generator fuel at part load and minimum-load check =====================

// dims: in { standby_kw: M L^2 T^-3, rating_kw: M L^2 T^-3, fuel_quarter_gph: L^3 T^-1, fuel_half_gph: L^3 T^-1, fuel_three_quarter_gph: L^3 T^-1, fuel_full_gph: L^3 T^-1, load_kw: M L^2 T^-3 } out: { fuel_gph: L^3 T^-1, kwh_per_gal: M L^-1 T^-2, full_load_kwh_per_gal: M L^-1 T^-2, efficiency_penalty_pct: dimensionless, load_pct_of_standby: dimensionless, min_load_kw: M L^2 T^-3, load_bank_kw: M L^2 T^-3 }
export function computeGeneratorPartLoadFuel({ standby_kw = 0, rating_kw = 0, fuel_quarter_gph = 0, fuel_half_gph = 0, fuel_three_quarter_gph = 0, fuel_full_gph = 0, load_kw = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(standby_kw > 0) || !(rating_kw > 0)) return { error: "The standby nameplate and the rating in use must be positive." };
  if (rating_kw > standby_kw) return { error: "The rating in use cannot exceed the standby nameplate." };
  const pts = [fuel_quarter_gph, fuel_half_gph, fuel_three_quarter_gph, fuel_full_gph];
  const ce = _curveError(pts); if (ce) return { error: ce };
  if (!(load_kw > 0)) return { error: "The actual load must be positive." };
  if (load_kw > rating_kw) return { error: "The load is above the rating in use." };
  const { gph: fuel_gph, extrapolated } = _fuelAt(load_kw, rating_kw, pts);
  if (!(fuel_gph > 0)) return { error: "The fuel curve extended below 1/4 load reaches zero at this load -- the load is too far below the published points to estimate." };
  const kwh_per_gal = load_kw / fuel_gph;
  const full_load_kwh_per_gal = rating_kw / fuel_full_gph;
  const load_pct_of_standby = 100 * load_kw / standby_kw;
  const min_load_kw = NFPA110_MIN_LOAD_FRACTION * standby_kw;
  const meets_minimum = load_kw >= min_load_kw;
  const load_bank_kw = Math.max(0, min_load_kw - load_kw);
  return {
    fuel_gph, kwh_per_gal, full_load_kwh_per_gal,
    efficiency_penalty_pct: 100 * (1 - kwh_per_gal / full_load_kwh_per_gal),
    load_pct_of_standby, min_load_kw, meets_minimum, load_bank_kw, extrapolated,
    minimum_verdict: meets_minimum ? "meets the NFPA 110 30% floor -- no load bank" : "BELOW the NFPA 110 30% floor -- add a supplemental load bank",
    extrapolation_verdict: extrapolated ? "EXTRAPOLATED below the 1/4-load point the manufacturer published" : "interpolated between published points",
    note: "A generator's fuel curve is not proportional to its load: the fixed losses of turning the engine over do not shrink with the load, so every kilowatt-hour delivered at light load carries more of them. Interpolating the manufacturer's four published points captures this without modelling the engine; the straight-line fit is least reliable below the first point, where the result is flagged. Light load has a mechanical cost too -- a diesel run long and lightly does not burn its fuel completely and wet-stacks. NFPA 110 Section 8.4.2 exercises an emergency power supply at not less than 30% of the standby nameplate kW and permits a supplemental load bank to reach it; the shortfall reported is the size of load bank to rent. The load fraction is taken against the standby nameplate even on a prime rating, which is the number an inspector checks. This does not derate for altitude or temperature (generator-altitude-temp-derate), compute tank runtime (generator-fuel-runtime), or size a generator. The manufacturer's data sheet and minimum continuous load guidance, NFPA 110 as adopted, and the AHJ govern.",
  };
}

export const generatorPartLoadFuelExample = { inputs: { standby_kw: 60, rating_kw: 55, fuel_quarter_gph: 1.5, fuel_half_gph: 2.5, fuel_three_quarter_gph: 3.4, fuel_full_gph: 4.6, load_kw: 20 } };
RELIEFPOWER_RENDERERS["generator-part-load-fuel"] = _simpleRenderer({
  citation: "Citation: the manufacturer's published fuel consumption at 1/4, 1/2, 3/4, and full load (worked example from the Cummins C60D6R rental generator data sheet D-6567), interpolated in straight lines; NFPA 110 Section 8.4.2 cited by number for exercise at not less than 30% of the standby nameplate kW with a supplemental load bank permitted.",
  example: generatorPartLoadFuelExample.inputs,
  fields: [
    { key: "standby_kw", label: "Standby nameplate (kW)" },
    { key: "rating_kw", label: "Rating in use, standby or prime (kW)" },
    { key: "fuel_quarter_gph", label: "Fuel at 1/4 load (gph)" },
    { key: "fuel_half_gph", label: "Fuel at 1/2 load (gph)" },
    { key: "fuel_three_quarter_gph", label: "Fuel at 3/4 load (gph)" },
    { key: "fuel_full_gph", label: "Fuel at full load (gph)" },
    { key: "load_kw", label: "Actual load (kW)" },
  ],
  outputs: [
    { key: "fuel_gph", id: "gplf-out-gph", label: "Fuel at this load", unit: "gph", value: (r) => fmt(r.fuel_gph, 3) + " gph (" + r.extrapolation_verdict + ")" },
    { key: "kwh_per_gal", id: "gplf-out-eff", label: "Energy per gallon", value: (r) => fmt(r.kwh_per_gal, 2) + " kWh/gal against " + fmt(r.full_load_kwh_per_gal, 2) + " at full load (" + fmt(r.efficiency_penalty_pct, 1) + "% less)" },
    { key: "load_pct_of_standby", id: "gplf-out-pct", label: "Load as a share of standby nameplate", value: (r) => fmt(r.load_pct_of_standby, 1) + "% (floor " + fmt(r.min_load_kw, 1) + " kW)" },
    { key: "load_bank_kw", id: "gplf-out-bank", label: "NFPA 110 minimum-load check", value: (r) => r.minimum_verdict + (r.load_bank_kw > 0 ? ": " + fmt(r.load_bank_kw, 1) + " kW" : "") },
    { key: "note", id: "gplf-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeGeneratorPartLoadFuel,
});

// ===================== spec-v1890: generator fleet fuel resupply =====================

// dims: in { size1_count: dimensionless, size1_kw: M L^2 T^-3, size1_tank_gal: L^3, size1_burn_gph: L^3 T^-1, size2_count: dimensionless, size2_kw: M L^2 T^-3, size2_tank_gal: L^3, size2_burn_gph: L^3 T^-1, size3_count: dimensionless, size3_kw: M L^2 T^-3, size3_tank_gal: L^3, size3_burn_gph: L^3 T^-1, usable_fraction: dimensionless, truck_gal: L^3 } out: { fleet_kw: M L^2 T^-3, size1_unit_gph: L^3 T^-1, size2_unit_gph: L^3 T^-1, size3_unit_gph: L^3 T^-1, fleet_fuel_gal_per_day: L^3 T^-1, fleet_fuel_70_gal_per_day: L^3 T^-1, trips_per_day: dimensionless, trips_per_day_70: dimensionless, size1_interval_hours: T, size2_interval_hours: T, size3_interval_hours: T, shortest_interval_hours: T }
export function computeGeneratorFleetFuelResupply({ size1_count = 0, size1_kw = 0, size1_tank_gal = 0, size1_burn_gph = 0, size2_count = 0, size2_kw = 0, size2_tank_gal = 0, size2_burn_gph = 0, size3_count = 0, size3_kw = 0, size3_tank_gal = 0, size3_burn_gph = 0, usable_fraction = 0.9, truck_gal = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(usable_fraction > 0 && usable_fraction <= 1)) return { error: "The usable tank fraction must be greater than 0 and no more than 1." };
  if (!(truck_gal > 0)) return { error: "The fuel truck's deliverable gallons must be positive." };
  const sizes = [
    [size1_count, size1_kw, size1_tank_gal, size1_burn_gph],
    [size2_count, size2_kw, size2_tank_gal, size2_burn_gph],
    [size3_count, size3_kw, size3_tank_gal, size3_burn_gph],
  ];
  // A size row with a count of 0 is unused; any other row must be complete.
  for (const [n, kw, tank, burn] of sizes) {
    if (!(n >= 0) || !Number.isInteger(n)) return { error: "Unit counts must be whole numbers, 0 for an unused size." };
    if (n === 0) continue;
    if (!(kw > 0)) return { error: "Each size in use needs a positive kW rating." };
    if (!(tank > 0)) return { error: "Each size in use needs a positive tank size." };
    if (!(burn >= 0)) return { error: "An entered burn rate cannot be negative (0 uses the USACE rule)." };
  }
  if (!sizes.some(([n]) => n > 0)) return { error: "Enter at least one generator size with a unit count." };
  const unit_gph = sizes.map(([n, kw, , burn]) => (n > 0 ? (burn > 0 ? burn : USACE_GPH_PER_KW * kw) : 0));
  const interval = sizes.map(([n, , tank], i) => (n > 0 ? tank * usable_fraction / unit_gph[i] : null));
  const fleet_kw = sizes.reduce((s, [n, kw]) => s + n * kw, 0);
  const fleet_fuel_gal_per_day = sizes.reduce((s, [n], i) => s + n * unit_gph[i] * 24, 0);
  const fleet_fuel_70_gal_per_day = EPA_COMPARISON_LOAD_FRACTION * USACE_GPH_PER_KW * fleet_kw * 24;
  const trips_per_day = Math.ceil(fleet_fuel_gal_per_day / truck_gal - 1e-9);
  const trips_per_day_70 = Math.ceil(fleet_fuel_70_gal_per_day / truck_gal - 1e-9);
  const used = interval.filter((v) => v !== null);
  const shortest_interval_hours = Math.min(...used);
  const shortest_sizes = interval
    .map((v, i) => (v !== null && Math.abs(v - shortest_interval_hours) <= 1e-9 * shortest_interval_hours ? "size " + (i + 1) + " (" + sizes[i][1] + " kW)" : null))
    .filter(Boolean).join(" and ");
  return {
    fleet_kw,
    size1_unit_gph: unit_gph[0], size2_unit_gph: unit_gph[1], size3_unit_gph: unit_gph[2],
    size1_interval_hours: interval[0], size2_interval_hours: interval[1], size3_interval_hours: interval[2],
    fleet_fuel_gal_per_day, fleet_fuel_70_gal_per_day, trips_per_day, trips_per_day_70,
    shortest_interval_hours, shortest_sizes,
    basis: sizes.some(([n, , , burn]) => n > 0 && burn > 0) ? "entered burn rates where given, USACE 0.07 gph per kW elsewhere" : "USACE 0.07 gph per kW at full load for every size",
    note: "A generator fleet is a fuel logistics problem wearing an electrical label. The USACE rule of thumb recorded in the EPA Power Resilience Guide -- 0.07 gallons an hour per kW of rating -- is a full-load figure and deliberately conservative, which is what a fuel plan wants before the loads are known; summed across the fleet over 24 hours it is the gallons a day the fuel contractor must deliver, and dividing by the truck's deliverable volume gives the trips. The daily total is not usually the constraint that bites. The unit that runs dry first is: small units on day tanks and large units on sub-base tanks can have similar intervals, and the route must reach every one of them inside the shortest, with road closures and curfews in the way. Where a unit's actual burn at its real load is known (generator-part-load-fuel), enter it in place of the rule; the 70% line shows how far a partly loaded fleet falls below the full-load figure. This does not route trucks, account for travel time or access, or address fuel storage, spill containment, or fuel quality. The EPA guide, the fuel supplier, the manufacturers' data, and the incident's logistics section govern.",
  };
}

export const generatorFleetFuelResupplyExample = { inputs: { size1_count: 4, size1_kw: 60, size1_tank_gal: 100, size1_burn_gph: 0, size2_count: 6, size2_kw: 150, size2_tank_gal: 300, size2_burn_gph: 0, size3_count: 2, size3_kw: 300, size3_tank_gal: 500, size3_burn_gph: 0, usable_fraction: 0.9, truck_gal: 2400 } };
RELIEFPOWER_RENDERERS["generator-fleet-fuel-resupply"] = _simpleRenderer({
  citation: "Citation: EPA, Power Resilience Guide for Water and Wastewater Utilities (2023), Section 4, recording the U.S. Army Corps of Engineers rule of thumb of 0.07 gallons per hour per kW at full load and the practice of stocking for 70% load; each unit's published fuel curve governs where known.",
  example: generatorFleetFuelResupplyExample.inputs,
  fields: [
    { key: "size1_count", label: "Size 1: number of units", attrs: { step: "1", min: "0" } },
    { key: "size1_kw", label: "Size 1: rating (kW)" },
    { key: "size1_tank_gal", label: "Size 1: tank (gal)" },
    { key: "size1_burn_gph", label: "Size 1: actual burn if known (gph, 0 = USACE rule)" },
    { key: "size2_count", label: "Size 2: number of units (0 if unused)", attrs: { step: "1", min: "0" } },
    { key: "size2_kw", label: "Size 2: rating (kW)" },
    { key: "size2_tank_gal", label: "Size 2: tank (gal)" },
    { key: "size2_burn_gph", label: "Size 2: actual burn if known (gph, 0 = USACE rule)" },
    { key: "size3_count", label: "Size 3: number of units (0 if unused)", attrs: { step: "1", min: "0" } },
    { key: "size3_kw", label: "Size 3: rating (kW)" },
    { key: "size3_tank_gal", label: "Size 3: tank (gal)" },
    { key: "size3_burn_gph", label: "Size 3: actual burn if known (gph, 0 = USACE rule)" },
    { key: "usable_fraction", label: "Usable fraction of each tank", default: 0.9, attrs: { step: "any", min: "0", max: "1" } },
    { key: "truck_gal", label: "Fuel truck deliverable volume (gal)" },
  ],
  outputs: [
    { key: "shortest_interval_hours", id: "gffr-out-short", label: "Route must return within", unit: "h", value: (r) => fmt(r.shortest_interval_hours, 1) + " h, set by " + r.shortest_sizes },
    { key: "fleet_fuel_gal_per_day", id: "gffr-out-day", label: "Fleet fuel per day", value: (r) => fmt(r.fleet_fuel_gal_per_day, 0) + " gal/day for " + fmt(r.fleet_kw, 0) + " kW (" + r.basis + ")" },
    { key: "trips_per_day", id: "gffr-out-trips", label: "Truck trips per day", value: (r) => r.trips_per_day + " trips" },
    { key: "fleet_fuel_70_gal_per_day", id: "gffr-out-70", label: "At 70% load (USACE rule)", value: (r) => fmt(r.fleet_fuel_70_gal_per_day, 0) + " gal/day, " + r.trips_per_day_70 + " trips" },
    { key: "size1_interval_hours", id: "gffr-out-s1", label: "Size 1 burn and refuel interval", value: (r) => (r.size1_interval_hours === null ? "unused" : fmt(r.size1_unit_gph, 2) + " gph each; " + fmt(r.size1_interval_hours, 1) + " h") },
    { key: "size2_interval_hours", id: "gffr-out-s2", label: "Size 2 burn and refuel interval", value: (r) => (r.size2_interval_hours === null ? "unused" : fmt(r.size2_unit_gph, 2) + " gph each; " + fmt(r.size2_interval_hours, 1) + " h") },
    { key: "size3_interval_hours", id: "gffr-out-s3", label: "Size 3 burn and refuel interval", value: (r) => (r.size3_interval_hours === null ? "unused" : fmt(r.size3_unit_gph, 2) + " gph each; " + fmt(r.size3_interval_hours, 1) + " h") },
    { key: "note", id: "gffr-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeGeneratorFleetFuelResupply,
});

// ===================== spec-v1891: paralleled generator droop load sharing =====================

// dims: in { unit1_kw: M L^2 T^-3, unit1_droop_pct: dimensionless, unit1_no_load_hz: T^-1, unit2_kw: M L^2 T^-3, unit2_droop_pct: dimensionless, unit2_no_load_hz: T^-1, unit3_kw: M L^2 T^-3, unit3_droop_pct: dimensionless, unit3_no_load_hz: T^-1, rated_hz: T^-1, load_kw: M L^2 T^-3 } out: { unit1_kw_per_hz: M L^2 T^-2, unit2_kw_per_hz: M L^2 T^-2, unit3_kw_per_hz: M L^2 T^-2, bus_hz: T^-1, unit1_load_kw: M L^2 T^-3, unit2_load_kw: M L^2 T^-3, unit3_load_kw: M L^2 T^-3, unit1_load_pct: dimensionless, unit2_load_pct: dimensionless, unit3_load_pct: dimensionless, first_full_load_kw: M L^2 T^-3, first_full_bus_hz: T^-1, matched_droop_pct: dimensionless, matched_bus_hz: T^-1, matched_load_pct: dimensionless }
export function computeGeneratorDroopLoadShare({ unit1_kw = 0, unit1_droop_pct = 0, unit1_no_load_hz = 0, unit2_kw = 0, unit2_droop_pct = 0, unit2_no_load_hz = 0, unit3_kw = 0, unit3_droop_pct = 0, unit3_no_load_hz = 0, rated_hz = 60, load_kw = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_hz > 0)) return { error: "Rated frequency must be positive." };
  const raw = [
    [unit1_kw, unit1_droop_pct, unit1_no_load_hz],
    [unit2_kw, unit2_droop_pct, unit2_no_load_hz],
    [unit3_kw, unit3_droop_pct, unit3_no_load_hz],
  ];
  // Unit 3 is optional: a rating of 0 leaves it off the bus.
  if (!(unit3_kw >= 0)) return { error: "A unit rating cannot be negative." };
  const units = raw.filter(([kw], i) => i < 2 || kw !== 0);
  for (const [kw, d, fnl] of units) {
    if (!(kw > 0)) return { error: "At least two units are needed, each with a positive kW rating." };
    if (!(d > 0 && d < 100)) return { error: "Each droop must be greater than 0% and less than 100%." };
    if (!(fnl > rated_hz)) return { error: "Each no-load frequency setpoint must be above the rated frequency." };
  }
  const total_rating_kw = units.reduce((s, [kw]) => s + kw, 0);
  if (!(load_kw > 0)) return { error: "The total load must be positive." };
  if (!(load_kw < total_rating_kw)) return { error: "The load is at or above the combined rating of the units." };
  const k = units.map(([kw, d]) => kw / (d / 100 * rated_hz));
  const sum_k = k.reduce((s, v) => s + v, 0);
  const bus_hz = (units.reduce((s, [, , fnl], i) => s + k[i] * fnl, 0) - load_kw) / sum_k;
  const p = units.map(([, , fnl], i) => k[i] * (fnl - bus_hz));
  const pct = units.map(([kw], i) => 100 * p[i] / kw);
  const overloaded = units.map(([kw], i) => p[i] > kw * (1 + 1e-12));
  const motoring = p.map((v) => v < 0);
  // As load rises the bus frequency falls; the first unit to reach its rating
  // is the one whose full-load frequency is highest.
  const full_hz = units.map(([kw, , fnl], i) => fnl - kw / k[i]);
  const first_full_bus_hz = Math.max(...full_hz);
  const first_full_index = full_hz.indexOf(first_full_bus_hz);
  const first_full_load_kw = units.reduce((s, [, , fnl], i) => s + k[i] * (fnl - first_full_bus_hz), 0);
  const tied = full_hz.filter((f) => Math.abs(f - first_full_bus_hz) <= 1e-9 * first_full_bus_hz).length;
  // Matched comparison: every unit at the mean of the entered droops and the
  // no-load setpoint that gives rated frequency at full load.
  const matched_droop_pct = units.reduce((s, [, d]) => s + d, 0) / units.length;
  const matched_load_pct = 100 * load_kw / total_rating_kw;
  const matched_bus_hz = rated_hz * (1 + matched_droop_pct / 100) - matched_droop_pct / 100 * rated_hz * load_kw / total_rating_kw;
  const out = (i, a) => (i < units.length ? a[i] : null);
  const unitLabel = (i) => "unit " + (i + 1);
  return {
    unit_count: units.length, total_rating_kw, bus_hz,
    unit1_kw_per_hz: out(0, k), unit2_kw_per_hz: out(1, k), unit3_kw_per_hz: out(2, k),
    unit1_load_kw: out(0, p), unit2_load_kw: out(1, p), unit3_load_kw: out(2, p),
    unit1_load_pct: out(0, pct), unit2_load_pct: out(1, pct), unit3_load_pct: out(2, pct),
    unit1_overloaded: out(0, overloaded), unit2_overloaded: out(1, overloaded), unit3_overloaded: out(2, overloaded),
    any_overloaded: overloaded.some(Boolean), any_motoring: motoring.some(Boolean),
    first_full_unit: tied === units.length ? "all units together" : unitLabel(first_full_index),
    first_full_load_kw, first_full_bus_hz,
    matched_droop_pct, matched_bus_hz, matched_load_pct,
    verdict: overloaded.some(Boolean)
      ? "OVERLOAD -- " + overloaded.map((v, i) => (v ? unitLabel(i) : null)).filter(Boolean).join(" and ") + " above rating while the total is not"
      : motoring.some(Boolean) ? "REVERSE POWER -- a unit's no-load setpoint is below the bus frequency and it is being driven as a motor"
      : "every unit within its rating",
    note: "On an isolated bus with every governor in droop, the units agree on one frequency and each delivers whatever load its droop line gives at that frequency. A unit's share is set by the slope of its line and where it starts -- the governor setting, not the nameplate. Units of different sizes share in proportion to their ratings only when their droop percentages and no-load setpoints match; otherwise one unit can reach its rating while the bus total is still under the combined rating, trip on overload, and hand the whole load to the other. The tile solves the straight-line system (Woodward Application Note 01302: droop is a straight-line function of speed reference against fuel position) for each unit's stiffness in kW per Hz, the common bus frequency, and each unit's load, and it reports the total at which the first unit reaches its rating. Bus frequency falls as load rises in all-droop operation, which is normal; check it against any frequency-sensitive load. The matched comparison sets every unit to the mean droop with a no-load setpoint giving rated frequency at full load. This does not model isochronous load sharing, utility paralleling, transient response, reactive (kvar) sharing, or synchronizing, and real droop characteristics are only approximately linear. The governor and paralleling-switchgear manufacturers, the qualified technician setting them up, and the AHJ govern.",
  };
}

export const generatorDroopLoadShareExample = { inputs: { unit1_kw: 100, unit1_droop_pct: 3, unit1_no_load_hz: 61.8, unit2_kw: 200, unit2_droop_pct: 5, unit2_no_load_hz: 63, unit3_kw: 0, unit3_droop_pct: 0, unit3_no_load_hz: 0, rated_hz: 60, load_kw: 180 } };
RELIEFPOWER_RENDERERS["generator-droop-load-share"] = _simpleRenderer({
  citation: "Citation: Woodward Application Note 01302, Speed Droop and Power Generation (droop as a straight-line function of speed reference against fuel position), solved for a common bus frequency on an isolated bus. The governor and paralleling-controls manufacturers govern.",
  example: generatorDroopLoadShareExample.inputs,
  fields: [
    { key: "unit1_kw", label: "Unit 1 rating (kW)" },
    { key: "unit1_droop_pct", label: "Unit 1 droop (%)" },
    { key: "unit1_no_load_hz", label: "Unit 1 no-load frequency setpoint (Hz)" },
    { key: "unit2_kw", label: "Unit 2 rating (kW)" },
    { key: "unit2_droop_pct", label: "Unit 2 droop (%)" },
    { key: "unit2_no_load_hz", label: "Unit 2 no-load frequency setpoint (Hz)" },
    { key: "unit3_kw", label: "Unit 3 rating (kW, 0 if none)" },
    { key: "unit3_droop_pct", label: "Unit 3 droop (%)" },
    { key: "unit3_no_load_hz", label: "Unit 3 no-load frequency setpoint (Hz)" },
    { key: "rated_hz", label: "Rated frequency (Hz)", default: 60 },
    { key: "load_kw", label: "Total bus load (kW)" },
  ],
  outputs: [
    { key: "verdict", id: "gdls-out-v", label: "Load share check", value: (r) => r.verdict },
    { key: "bus_hz", id: "gdls-out-f", label: "Bus frequency", unit: "Hz", value: (r) => fmt(r.bus_hz, 2) + " Hz" },
    { key: "unit1_load_kw", id: "gdls-out-u1", label: "Unit 1", value: (r) => fmt(r.unit1_load_kw, 1) + " kW (" + fmt(r.unit1_load_pct, 1) + "% of rating; " + fmt(r.unit1_kw_per_hz, 1) + " kW/Hz)" },
    { key: "unit2_load_kw", id: "gdls-out-u2", label: "Unit 2", value: (r) => fmt(r.unit2_load_kw, 1) + " kW (" + fmt(r.unit2_load_pct, 1) + "% of rating; " + fmt(r.unit2_kw_per_hz, 1) + " kW/Hz)" },
    { key: "unit3_load_kw", id: "gdls-out-u3", label: "Unit 3", value: (r) => (r.unit3_load_kw === null ? "not on the bus" : fmt(r.unit3_load_kw, 1) + " kW (" + fmt(r.unit3_load_pct, 1) + "% of rating; " + fmt(r.unit3_kw_per_hz, 1) + " kW/Hz)") },
    { key: "first_full_load_kw", id: "gdls-out-first", label: "First unit to reach its rating", value: (r) => r.first_full_unit + " at a total of " + fmt(r.first_full_load_kw, 1) + " of " + fmt(r.total_rating_kw, 0) + " kW (" + fmt(r.first_full_bus_hz, 2) + " Hz)" },
    { key: "matched_load_pct", id: "gdls-out-match", label: "With matched settings", value: (r) => "all units at " + fmt(r.matched_load_pct, 1) + "% of rating, " + fmt(r.matched_bus_hz, 2) + " Hz (" + fmt(r.matched_droop_pct, 2) + "% droop each)" },
    { key: "note", id: "gdls-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeGeneratorDroopLoadShare,
});

// ===================== spec-v1892: 120/240 V generator leg balance =====================

// dims: in { rated_w: M L^2 T^-3, per_leg_rating_a: I, load_240_a: I, l1_load1_a: I, l1_load2_a: I, l1_load3_a: I, l1_load4_a: I, l2_load1_a: I, l2_load2_a: I, l2_load3_a: I, l2_load4_a: I } out: { leg_rating_a: I, l1_a: I, l2_a: I, l1_pct: dimensionless, l2_pct: dimensionless, neutral_a: I, total_w: M L^2 T^-3, total_pct: dimensionless, balanced_leg_a: I }
export function computeSplitPhaseLegBalance({ rated_w = 0, per_leg_rating_a = 0, load_240_a = 0, l1_load1_a = 0, l1_load2_a = 0, l1_load3_a = 0, l1_load4_a = 0, l2_load1_a = 0, l2_load2_a = 0, l2_load3_a = 0, l2_load4_a = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_w > 0)) return { error: "Generator rated watts must be positive." };
  if (!(per_leg_rating_a >= 0)) return { error: "The per-leg rating cannot be negative (0 derives it from the watts)." };
  const l1 = [l1_load1_a, l1_load2_a, l1_load3_a, l1_load4_a];
  const l2 = [l2_load1_a, l2_load2_a, l2_load3_a, l2_load4_a];
  if (![load_240_a, ...l1, ...l2].every((v) => v >= 0)) return { error: "Load currents cannot be negative." };
  const leg_rating_a = per_leg_rating_a > 0 ? per_leg_rating_a : rated_w / LINE_V;
  const l1_120_a = l1.reduce((s, v) => s + v, 0);
  const l2_120_a = l2.reduce((s, v) => s + v, 0);
  const l1_a = load_240_a + l1_120_a;
  const l2_a = load_240_a + l2_120_a;
  const total_w = load_240_a * LINE_V + (l1_120_a + l2_120_a) * LEG_V;
  const l1_pct = 100 * l1_a / leg_rating_a;
  const l2_pct = 100 * l2_a / leg_rating_a;
  const total_pct = 100 * total_w / rated_w;
  const leg_over = l1_a > leg_rating_a || l2_a > leg_rating_a;
  const total_over = total_w > rated_w;
  return {
    leg_rating_a, l1_a, l2_a, l1_pct, l2_pct,
    neutral_a: Math.abs(l1_120_a - l2_120_a),
    total_w, total_pct,
    balanced_leg_a: load_240_a + (l1_120_a + l2_120_a) / 2,
    heavier_leg: l1_a === l2_a ? "neither" : l1_a > l2_a ? "L1" : "L2",
    leg_over, total_over,
    leg_over_while_total_not: leg_over && !total_over,
    verdict: leg_over && !total_over ? "A LEG IS OVER its rating while the total wattage is not -- move 120 V loads to the lighter leg"
      : total_over ? "OVER the generator's rated watts"
      : "both legs within the per-leg rating",
    note: "A 120/240 V generator is two 120 V sources sharing a neutral, and its rated wattage assumes both are loaded equally. A 240 V load draws the same current on both legs; a 120 V load draws only on the leg it is plugged into (WINCO, Portable Generator Load Balancing Guide). So the total wattage says little about whether a leg is overloaded, and the leg that trips first is the one carrying the refrigerator, the sump pump, and the microwave together. Each leg is added separately and compared with the per-leg rating -- the rated watts divided by 240 V unless the data sheet states it. The neutral carries the difference between the legs' 120 V loads, and the balanced split shows the equal current both legs would carry; the practical fix is usually one or two plugs moved. Many manufacturers treat about 80% of the leg rating as the continuous limit. The same arithmetic applies to a spider box or temporary panel fed from a 120/240 V source. Loads are running amperes; motor starting is a separate check (generator-motor-starting). This does not address three-phase sources, conductor sizing, GFCI protection and grounding under OSHA 1926.404 and NEC 590, or connection to a building, which needs a transfer switch or interlock to prevent backfeed. The generator manufacturer's ratings, the NEC as adopted (Articles 445 and 590), and the AHJ govern.",
  };
}

export const splitPhaseLegBalanceExample = { inputs: { rated_w: 10800, per_leg_rating_a: 0, load_240_a: 10, l1_load1_a: 6, l1_load2_a: 8, l1_load3_a: 12, l1_load4_a: 0, l2_load1_a: 5, l2_load2_a: 3, l2_load3_a: 7, l2_load4_a: 0 } };
RELIEFPOWER_RENDERERS["split-phase-leg-balance"] = _simpleRenderer({
  citation: "Citation: WINCO, Portable Generator Load Balancing Guide (L-1008): a 240 V ampere loads both legs, a 120 V ampere loads one; NEC Articles 445 and 590 cited by number for generators and temporary installations. The generator manufacturer's per-leg rating governs.",
  example: splitPhaseLegBalanceExample.inputs,
  fields: [
    { key: "rated_w", label: "Generator rated running watts (W)" },
    { key: "per_leg_rating_a", label: "Per-leg rating from the data sheet (A, 0 = watts / 240)" },
    { key: "load_240_a", label: "240 V loads, total running current (A)" },
    { key: "l1_load1_a", label: "L1: 120 V load 1 (A)" },
    { key: "l1_load2_a", label: "L1: 120 V load 2 (A)" },
    { key: "l1_load3_a", label: "L1: 120 V load 3 (A)" },
    { key: "l1_load4_a", label: "L1: 120 V load 4 (A)" },
    { key: "l2_load1_a", label: "L2: 120 V load 1 (A)" },
    { key: "l2_load2_a", label: "L2: 120 V load 2 (A)" },
    { key: "l2_load3_a", label: "L2: 120 V load 3 (A)" },
    { key: "l2_load4_a", label: "L2: 120 V load 4 (A)" },
  ],
  outputs: [
    { key: "verdict", id: "splb-out-v", label: "Leg check", value: (r) => r.verdict },
    { key: "l1_a", id: "splb-out-l1", label: "L1", unit: "A", value: (r) => fmt(r.l1_a, 1) + " A (" + fmt(r.l1_pct, 0) + "% of " + fmt(r.leg_rating_a, 1) + " A)" },
    { key: "l2_a", id: "splb-out-l2", label: "L2", unit: "A", value: (r) => fmt(r.l2_a, 1) + " A (" + fmt(r.l2_pct, 0) + "% of " + fmt(r.leg_rating_a, 1) + " A)" },
    { key: "neutral_a", id: "splb-out-n", label: "Neutral current", unit: "A", value: (r) => fmt(r.neutral_a, 1) + " A" },
    { key: "total_w", id: "splb-out-w", label: "Total running load", unit: "W", value: (r) => fmt(r.total_w, 0) + " W (" + fmt(r.total_pct, 0) + "% of rated watts)" },
    { key: "balanced_leg_a", id: "splb-out-bal", label: "Balanced current per leg", unit: "A", value: (r) => fmt(r.balanced_leg_a, 1) + " A (heavier leg now: " + r.heavier_leg + ")" },
    { key: "note", id: "splb-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeSplitPhaseLegBalance,
});

// ===================== spec-v1893: critical load priority shedding =====================

// dims: in { source_kw: M L^2 T^-3, tier1_kw: M L^2 T^-3, tier2_kw: M L^2 T^-3, tier3_kw: M L^2 T^-3, tier4_kw: M L^2 T^-3, usable_kwh: M L^2 T^-2 } out: { served_kw: M L^2 T^-3, shed_kw: M L^2 T^-3, total_kw: M L^2 T^-3, served_pct: dimensionless, utilization_pct: dimensionless, headroom_kw: M L^2 T^-3, runtime_tier1_hours: T, runtime_tiers12_hours: T, runtime_tiers123_hours: T, runtime_all_hours: T, runtime_served_hours: T }
export function computeCriticalLoadShedTiers({ source_kw = 0, tier1_kw = 0, tier2_kw = 0, tier3_kw = 0, tier4_kw = 0, usable_kwh = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(source_kw > 0)) return { error: "The available source capacity must be positive." };
  const tiers = [tier1_kw, tier2_kw, tier3_kw, tier4_kw];
  if (!tiers.every((v) => v >= 0)) return { error: "A tier load cannot be negative." };
  if (!(usable_kwh >= 0)) return { error: "Usable energy must be positive when entered (0 for a fuel-fed source)." };
  const total_kw = tiers.reduce((s, v) => s + v, 0);
  if (!(total_kw > 0)) return { error: "Enter the connected load of at least one tier." };
  // Whole tiers in priority order; the first that does not fit and all below it are shed.
  let tiers_served = 0;
  let served_kw = 0;
  for (const t of tiers) {
    if (served_kw + t > source_kw) break;
    served_kw += t;
    tiers_served += 1;
  }
  const cumulative = tiers.map((_, i) => tiers.slice(0, i + 1).reduce((s, v) => s + v, 0));
  const runtime = (kw) => (usable_kwh > 0 && kw > 0 ? usable_kwh / kw : null);
  const names = ["emergency (Art. 700)", "legally required standby (Art. 701)", "optional standby (Art. 702)", "user tier 4"];
  return {
    total_kw, served_kw, shed_kw: total_kw - served_kw, tiers_served,
    served_pct: 100 * served_kw / total_kw,
    utilization_pct: 100 * served_kw / source_kw,
    headroom_kw: source_kw - served_kw,
    runtime_tier1_hours: runtime(cumulative[0]),
    runtime_tiers12_hours: runtime(cumulative[1]),
    runtime_tiers123_hours: runtime(cumulative[2]),
    runtime_all_hours: runtime(cumulative[3]),
    runtime_served_hours: runtime(served_kw),
    served_tiers: tiers_served === 0 ? "none -- even the emergency tier exceeds the source" : names.slice(0, tiers_served).join(", "),
    shed_tiers: tiers_served === 4 ? "none" : names.slice(tiers_served).join(", "),
    note: "The NEC ranks the loads an emergency source may carry, and when capacity runs short it ranks them for shedding too: emergency systems (Article 700) first, legally required standby (Article 701) next, optional standby (Article 702) last, with the selective load pickup and load shedding provision of 700.4(B) -- verify that numbering against the adopted edition. The tile takes the connected load in each tier and the source actually available, often the derated figure from generator-altitude-temp-derate, and sheds whole tiers rather than fractions, because that is how shedding schemes are wired: a tier is on a transfer switch or a shunt-tripped breaker and is either connected or not. Utilization is the served load over the source, and the headroom is what is left for motor starting and growth. For an energy-limited source -- a battery, or a fixed fuel supply converted to kWh -- the runtime at each shed level turns the order into a decision: how many hours the emergency tier alone buys against how many hours everything buys. Which loads belong to which article is the AHJ's classification. This does not design the shedding controls or selective coordination, address motor starting on the served tiers, or derate a battery for depth of discharge and temperature (off-grid-battery). The NEC as adopted and the AHJ govern.",
  };
}

export const criticalLoadShedTiersExample = { inputs: { source_kw: 128, tier1_kw: 40, tier2_kw: 55, tier3_kw: 70, tier4_kw: 0, usable_kwh: 400 } };
RELIEFPOWER_RENDERERS["critical-load-shed-tiers"] = _simpleRenderer({
  citation: "Citation: NFPA 70 Articles 700 (emergency), 701 (legally required standby), and 702 (optional standby), and the selective load pickup and load shedding provision of 700.4(B), cited by number with the edition to be verified; runtime = usable kWh / served kW. The AHJ governs the classification.",
  example: criticalLoadShedTiersExample.inputs,
  fields: [
    { key: "source_kw", label: "Available source capacity (kW)" },
    { key: "tier1_kw", label: "Tier 1, emergency loads, Art. 700 (kW)" },
    { key: "tier2_kw", label: "Tier 2, legally required standby, Art. 701 (kW)" },
    { key: "tier3_kw", label: "Tier 3, optional standby, Art. 702 (kW)" },
    { key: "tier4_kw", label: "Tier 4, further user tier (kW)" },
    { key: "usable_kwh", label: "Usable stored energy if energy-limited (kWh, 0 if none)" },
  ],
  outputs: [
    { key: "served_kw", id: "clst-out-served", label: "Served", unit: "kW", value: (r) => fmt(r.served_kw, 1) + " of " + fmt(r.total_kw, 1) + " kW (" + fmt(r.served_pct, 0) + "%): " + r.served_tiers },
    { key: "shed_kw", id: "clst-out-shed", label: "Shed", unit: "kW", value: (r) => fmt(r.shed_kw, 1) + " kW: " + r.shed_tiers },
    { key: "utilization_pct", id: "clst-out-util", label: "Source utilization", value: (r) => fmt(r.utilization_pct, 0) + "% (" + fmt(r.headroom_kw, 1) + " kW headroom)" },
    { key: "runtime_served_hours", id: "clst-out-rt", label: "Runtime at the served level", unit: "h", value: (r) => (r.runtime_served_hours === null ? "no stored energy entered" : fmt(r.runtime_served_hours, 2) + " h") },
    { key: "runtime_tier1_hours", id: "clst-out-rts", label: "Runtime by shed level", value: (r) => (r.runtime_all_hours === null && r.runtime_tier1_hours === null ? "no stored energy entered" : "tier 1 only " + fmt(r.runtime_tier1_hours, 2) + " h; tiers 1-2 " + fmt(r.runtime_tiers12_hours, 2) + " h; tiers 1-3 " + fmt(r.runtime_tiers123_hours, 2) + " h; all " + fmt(r.runtime_all_hours, 2) + " h") },
    { key: "note", id: "clst-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeCriticalLoadShedTiers,
});

// ===================== spec-v1894: MPPT charge controller output current =====================

// dims: in { array_w: M L^2 T^-3, battery_v: M L^2 T^-3 I^-1, chosen_controller_a: I } out: { output_current_a: I, controller_a: I, controller_count: dimensionless, array_ratio: dimensionless, min_conductor_a: I, controller_capacity_w: M L^2 T^-3 }
export function computeMpptControllerOutputCurrent({ array_w = 0, battery_v = 0, chosen_controller_a = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(array_w > 0)) return { error: "Array wattage must be positive." };
  if (!(battery_v > 0)) return { error: "Battery nominal voltage must be positive." };
  if (!(chosen_controller_a >= 0)) return { error: "A chosen controller rating cannot be negative (0 picks the next standard rating)." };
  const output_current_a = array_w / battery_v;
  const largest = MPPT_STANDARD_A[MPPT_STANDARD_A.length - 1];
  const next_standard = MPPT_STANDARD_A.find((a) => a >= output_current_a - 1e-9);
  const controller_a = chosen_controller_a > 0 ? chosen_controller_a : (next_standard ?? largest);
  // A chosen rating is one controller, which clips when the array outruns it;
  // above the largest common rating, 100 A controllers are paralleled.
  const controller_count = chosen_controller_a > 0 ? 1 : Math.max(1, Math.ceil(output_current_a / controller_a - 1e-9));
  const controller_capacity_w = controller_count * controller_a * battery_v;
  const array_ratio = array_w / controller_capacity_w;
  return {
    output_current_a, controller_a, controller_count, controller_capacity_w, array_ratio,
    min_conductor_a: 1.25 * controller_a,
    rating_basis: chosen_controller_a > 0 ? "the chosen rating, one controller" : next_standard === undefined ? "the largest common rating (" + largest + " A), paralleled" : "the next common rating",
    clipping: array_ratio > 1 ? "the array exceeds the controller, which clips at its limit -- by design, not by fault" : "no clipping at STC",
    note: "An MPPT controller converts the array's high-voltage, low-current power into the battery's low-voltage, high-current charge, so its size is an output-current rating: power in is roughly power out, and the output voltage is the battery's, so the current is the array watts divided by the battery voltage. That is why battery voltage is the largest lever in a small off-grid system -- quadrupling it from 12 V to 48 V cuts the controller current, the cable, and the fuse to a quarter. Manufacturers rate controllers this way and permit a larger array because the controller limits its output (the Morningstar ProStar MPPT data sheet says so); oversizing the array is a normal choice, and the ratio makes it explicit. The output conductor is sized on the controller's rated continuous output, not the calculated current, because the controller can deliver its full rating whenever the array drives it; the 125% figure follows NEC 690.8 (verify the subsection against the adopted edition), and the ampacity itself comes from the NEC tables. Common ratings run 20, 30, 40, 45, 60, 80, and 100 A; above 100 A the tile counts 100 A controllers in parallel. This does not check maximum input voltage against the array's cold open-circuit voltage (pv-string-sizing), the PV source-circuit current (pv-circuit-ampacity), or temperature derating of the array, and it does not apply to PWM controllers. The controller manufacturer's specifications, the NEC as adopted, and the AHJ govern.",
  };
}

export const mpptControllerOutputCurrentExample = { inputs: { array_w: 3200, battery_v: 48, chosen_controller_a: 0 } };
RELIEFPOWER_RENDERERS["mppt-controller-output-current"] = _simpleRenderer({
  citation: "Citation: the controller manufacturer's nominal-power rating convention (rated output amperes at the battery voltage; worked example after the Morningstar ProStar MPPT data sheet), I = array STC watts / battery nominal volts; NEC 690.8 cited by number for conductors at 125% of the controller's continuous output, subsection to be verified.",
  example: mpptControllerOutputCurrentExample.inputs,
  fields: [
    { key: "array_w", label: "Array STC wattage (W)" },
    { key: "battery_v", label: "Battery nominal voltage (V)" },
    { key: "chosen_controller_a", label: "Chosen controller rating (A, 0 = next common rating)" },
  ],
  outputs: [
    { key: "output_current_a", id: "mppt-out-i", label: "Controller output current", unit: "A", value: (r) => fmt(r.output_current_a, 1) + " A" },
    { key: "controller_a", id: "mppt-out-c", label: "Controller", value: (r) => r.controller_count + " x " + fmt(r.controller_a, 0) + " A (" + r.rating_basis + ")" },
    { key: "array_ratio", id: "mppt-out-r", label: "Array-to-controller ratio", value: (r) => fmt(r.array_ratio, 2) + " -- " + r.clipping },
    { key: "min_conductor_a", id: "mppt-out-w", label: "Output conductor minimum current (125%)", unit: "A", value: (r) => fmt(r.min_conductor_a, 0) + " A per controller output circuit" },
    { key: "note", id: "mppt-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeMpptControllerOutputCurrent,
});

// ===================== spec-v1895: radio and communications site duty-cycle battery =====================

// dims: in { transmit_a: I, receive_a: I, standby_a: I, transmit_duty_pct: dimensionless, receive_duty_pct: dimensionless, standby_duty_pct: dimensionless, runtime_hours: T, depth_of_discharge_fraction: dimensionless } out: { average_a: I, runtime_ah: I T, battery_nameplate_ah: I T, daily_ah: I T, transmit_energy_share_pct: dimensionless }
export function computeRadioSiteDutyCycleBattery({ transmit_a = 0, receive_a = 0, standby_a = 0, transmit_duty_pct = 5, receive_duty_pct = 5, standby_duty_pct = 90, runtime_hours = 0, depth_of_discharge_fraction = 0.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (![transmit_a, receive_a, standby_a].every((v) => v >= 0)) return { error: "Currents cannot be negative." };
  if (![transmit_duty_pct, receive_duty_pct, standby_duty_pct].every((v) => v >= 0)) return { error: "Duty fractions cannot be negative." };
  if (Math.abs(transmit_duty_pct + receive_duty_pct + standby_duty_pct - 100) > 1e-6) return { error: "The transmit, receive, and standby duty must add to 100%." };
  if (!(runtime_hours > 0)) return { error: "Required runtime must be positive." };
  if (!(depth_of_discharge_fraction > 0)) return { error: "Usable depth of discharge must be positive." };
  if (depth_of_discharge_fraction > 1) return { error: "Usable depth of discharge cannot exceed 1.0." };
  const tx_part = transmit_duty_pct / 100 * transmit_a;
  const rx_part = receive_duty_pct / 100 * receive_a;
  const sb_part = standby_duty_pct / 100 * standby_a;
  const average_a = tx_part + rx_part + sb_part;
  const runtime_ah = average_a * runtime_hours;
  return {
    average_a, runtime_ah,
    battery_nameplate_ah: runtime_ah / depth_of_discharge_fraction,
    daily_ah: average_a * 24,
    transmit_energy_share_pct: average_a > 0 ? 100 * tx_part / average_a : 0,
    duty_basis: transmit_duty_pct <= 5 ? "the 5-5-90 convention or lighter -- for a REPEATER, which retransmits every user, enter the site's measured or expected duty instead" : "a site duty heavier than the 5-5-90 convention",
    note: "Transmit current is many times receive current, but a radio spends most of its time listening, so the average sits much nearer the standby draw than the transmit draw. The 5-5-90 split (5% transmit, 5% receive, 90% standby) is the convention radio manufacturers use to state battery life (for example the Motorola Solutions BPR40 data sheet) and a reasonable default for a base station or a portable in routine use. The weighted average times the runtime gives the ampere-hours, and dividing by the usable depth of discharge gives the nameplate battery. A repeater is where the default is wrong: it retransmits every user on the channel, so during an incident its transmit fraction can be several times 5% and its battery empties accordingly -- enter the site's measured or expected duty. The daily ampere-hours are reported separately because a site that must run indefinitely is sized by its recharge: the solar array or generator run hours must replace a day's use every day. This does not account for battery temperature derating, aging, or Peukert effects (off-grid-battery, battery-runtime), converter losses, or auxiliary equipment unless added. The equipment manufacturer's current specifications, the site's measured traffic, and the system's engineer govern.",
  };
}

export const radioSiteDutyCycleBatteryExample = { inputs: { transmit_a: 12, receive_a: 1.2, standby_a: 0.8, transmit_duty_pct: 5, receive_duty_pct: 5, standby_duty_pct: 90, runtime_hours: 72, depth_of_discharge_fraction: 0.5 } };
RELIEFPOWER_RENDERERS["radio-site-duty-cycle-battery"] = _simpleRenderer({
  citation: "Citation: the 5-5-90 duty cycle convention (5% transmit, 5% receive, 90% standby) as published in radio manufacturers' battery-life specifications, for example the Motorola Solutions BPR40 data sheet; I_avg = sum of duty x current, Ah = I_avg x hours / usable depth of discharge. The manufacturer's current draws and the site's measured traffic govern.",
  example: radioSiteDutyCycleBatteryExample.inputs,
  fields: [
    { key: "transmit_a", label: "Transmit current (A)" },
    { key: "receive_a", label: "Receive current (A)" },
    { key: "standby_a", label: "Standby current (A)" },
    { key: "transmit_duty_pct", label: "Transmit duty (%)", default: 5 },
    { key: "receive_duty_pct", label: "Receive duty (%)", default: 5 },
    { key: "standby_duty_pct", label: "Standby duty (%)", default: 90 },
    { key: "runtime_hours", label: "Required runtime (h)" },
    { key: "depth_of_discharge_fraction", label: "Usable depth of discharge (0 to 1)", default: 0.5, attrs: { step: "any", min: "0", max: "1" } },
  ],
  outputs: [
    { key: "average_a", id: "rsdc-out-avg", label: "Duty-weighted average current", unit: "A", value: (r) => fmt(r.average_a, 3) + " A (transmit is " + fmt(r.transmit_energy_share_pct, 0) + "% of the energy)" },
    { key: "runtime_ah", id: "rsdc-out-ah", label: "Energy for the runtime", unit: "Ah", value: (r) => fmt(r.runtime_ah, 1) + " Ah" },
    { key: "battery_nameplate_ah", id: "rsdc-out-batt", label: "Nameplate battery", unit: "Ah", value: (r) => fmt(r.battery_nameplate_ah, 1) + " Ah" },
    { key: "daily_ah", id: "rsdc-out-day", label: "Daily recharge", unit: "Ah", value: (r) => fmt(r.daily_ah, 1) + " Ah per day" },
    { key: "duty_basis", id: "rsdc-out-duty", label: "Duty basis", value: (r) => r.duty_basis },
    { key: "note", id: "rsdc-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeRadioSiteDutyCycleBattery,
});

// ===================== spec-v1896: generator-battery hybrid fuel savings =====================

// dims: in { load_kw: M L^2 T^-3, rating_kw: M L^2 T^-3, fuel_quarter_gph: L^3 T^-1, fuel_half_gph: L^3 T^-1, fuel_three_quarter_gph: L^3 T^-1, fuel_full_gph: L^3 T^-1, setpoint_kw: M L^2 T^-3, round_trip_efficiency: dimensionless, cycles_per_day: dimensionless } out: { generator_hours_per_day: dimensionless, setpoint_gph: L^3 T^-1, load_gph: L^3 T^-1, hybrid_gal_per_day: L^3 T^-1, continuous_gal_per_day: L^3 T^-1, saving_gal_per_day: L^3 T^-1, saving_pct: dimensionless, battery_kwh_per_cycle: M L^2 T^-2, run_hour_reduction_pct: dimensionless }
export function computeGeneratorBatteryHybridFuel({ load_kw = 0, rating_kw = 0, fuel_quarter_gph = 0, fuel_half_gph = 0, fuel_three_quarter_gph = 0, fuel_full_gph = 0, setpoint_kw = 0, round_trip_efficiency = 0.85, cycles_per_day = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_kw > 0)) return { error: "The average load must be positive." };
  if (!(rating_kw > 0)) return { error: "The generator rating must be positive." };
  const pts = [fuel_quarter_gph, fuel_half_gph, fuel_three_quarter_gph, fuel_full_gph];
  const ce = _curveError(pts); if (ce) return { error: ce };
  if (!(setpoint_kw > 0)) return { error: "The ON set point must be positive." };
  if (!(setpoint_kw > load_kw)) return { error: "The ON set point must be above the load, or there is no surplus to charge the battery." };
  if (setpoint_kw > rating_kw) return { error: "The ON set point cannot exceed the generator rating." };
  if (!(round_trip_efficiency > 0)) return { error: "Round-trip efficiency must be positive." };
  if (round_trip_efficiency > 1) return { error: "Round-trip efficiency cannot exceed 1.0." };
  if (!(cycles_per_day > 0)) return { error: "Charge cycles per day must be positive." };
  const at_load = _fuelAt(load_kw, rating_kw, pts);
  const at_set = _fuelAt(setpoint_kw, rating_kw, pts);
  if (!(at_load.gph > 0) || !(at_set.gph > 0)) return { error: "The fuel curve extended below 1/4 load reaches zero at this load -- the load is too far below the published points to estimate." };
  // Energy balance: (P_g - L) x eta x h = L x (24 - h).
  const generator_hours_per_day = 24 * load_kw / (load_kw + (setpoint_kw - load_kw) * round_trip_efficiency);
  const hybrid_gal_per_day = generator_hours_per_day * at_set.gph;
  const continuous_gal_per_day = 24 * at_load.gph;
  const saving_gal_per_day = continuous_gal_per_day - hybrid_gal_per_day;
  return {
    generator_hours_per_day, setpoint_gph: at_set.gph, load_gph: at_load.gph,
    hybrid_gal_per_day, continuous_gal_per_day, saving_gal_per_day,
    saving_pct: 100 * saving_gal_per_day / continuous_gal_per_day,
    battery_kwh_per_cycle: load_kw * (24 - generator_hours_per_day) / cycles_per_day,
    run_hour_reduction_pct: 100 * (24 - generator_hours_per_day) / 24,
    setpoint_pct_of_rating: 100 * setpoint_kw / rating_kw,
    load_pct_of_rating: 100 * load_kw / rating_kw,
    continuous_extrapolated: at_load.extrapolated,
    setpoint_extrapolated: at_set.extrapolated,
    fuel_verdict: saving_gal_per_day >= 0 ? "the hybrid saves fuel at these settings" : "the hybrid BURNS MORE fuel at these settings -- the round-trip loss outweighs the curve",
    note: "Run the generator where it is efficient and let the battery cover the rest. During the ON hours the generator carries the load and charges the battery with its surplus; during the OFF hours the battery carries the load alone. The daily energy balance -- surplus stored, less the round-trip loss, equals the energy drawn -- gives the generator hours directly, and the manufacturer's four-point fuel curve (interpolated as in generator-part-load-fuel, and flagged below 1/4 load) converts hours to gallons for both the hybrid and continuous light-load running. The battery is sized per cycle and the cycle count is the lever: one long OFF period needs a battery covering most of a day's load, four shorter ones a quarter of that, but more cycles mean more generator starts, which manufacturers limit. The fuel saving does not depend on how the OFF hours are divided; only the battery does. The saving is often modest; the larger benefit is usually mechanical -- the generator never runs in the light-load region where it wet-stacks, its run hours fall by more than half, and the site is quiet most of the day. This assumes a constant average load and a fixed set point, and does not model load variation, charge acceptance limits, battery depth-of-discharge and temperature derating (off-grid-battery), inverter losses, start limits, or controller logic. The generator, battery, and inverter manufacturers and the AHJ govern.",
  };
}

export const generatorBatteryHybridFuelExample = { inputs: { load_kw: 15, rating_kw: 55, fuel_quarter_gph: 1.5, fuel_half_gph: 2.5, fuel_three_quarter_gph: 3.4, fuel_full_gph: 4.6, setpoint_kw: 41.25, round_trip_efficiency: 0.85, cycles_per_day: 1 } };
RELIEFPOWER_RENDERERS["generator-battery-hybrid-fuel"] = _simpleRenderer({
  citation: "Citation: a first-principles daily energy balance, (P_g - L) x eta x h = L x (24 - h), with fuel read from the manufacturer's four-point fuel curve as in generator-part-load-fuel (worked example from the Cummins C60D6R data sheet D-6567). The generator and battery manufacturers govern.",
  example: generatorBatteryHybridFuelExample.inputs,
  fields: [
    { key: "load_kw", label: "Average load (kW)" },
    { key: "rating_kw", label: "Generator rating in use (kW)" },
    { key: "fuel_quarter_gph", label: "Fuel at 1/4 load (gph)" },
    { key: "fuel_half_gph", label: "Fuel at 1/2 load (gph)" },
    { key: "fuel_three_quarter_gph", label: "Fuel at 3/4 load (gph)" },
    { key: "fuel_full_gph", label: "Fuel at full load (gph)" },
    { key: "setpoint_kw", label: "Generator output while ON (kW)" },
    { key: "round_trip_efficiency", label: "Battery round-trip efficiency (0 to 1)", default: 0.85, attrs: { step: "any", min: "0", max: "1" } },
    { key: "cycles_per_day", label: "Charge cycles per day", default: 1 },
  ],
  outputs: [
    { key: "generator_hours_per_day", id: "gbhf-out-h", label: "Generator run hours per day", unit: "h", value: (r) => fmt(r.generator_hours_per_day, 2) + " h (" + fmt(r.run_hour_reduction_pct, 0) + "% fewer than continuous)" },
    { key: "hybrid_gal_per_day", id: "gbhf-out-hy", label: "Hybrid fuel", value: (r) => fmt(r.hybrid_gal_per_day, 1) + " gal/day at " + fmt(r.setpoint_gph, 3) + " gph (" + fmt(r.setpoint_pct_of_rating, 0) + "% load)" },
    { key: "continuous_gal_per_day", id: "gbhf-out-co", label: "Continuous fuel at the light load", value: (r) => fmt(r.continuous_gal_per_day, 1) + " gal/day at " + fmt(r.load_gph, 3) + " gph (" + fmt(r.load_pct_of_rating, 0) + "% load" + (r.continuous_extrapolated ? ", EXTRAPOLATED below 1/4 load" : "") + ")" },
    { key: "saving_gal_per_day", id: "gbhf-out-save", label: "Fuel saving", value: (r) => fmt(r.saving_gal_per_day, 1) + " gal/day (" + fmt(r.saving_pct, 1) + "%): " + r.fuel_verdict },
    { key: "battery_kwh_per_cycle", id: "gbhf-out-batt", label: "Usable battery energy per cycle", unit: "kWh", value: (r) => fmt(r.battery_kwh_per_cycle, 1) + " kWh" },
    { key: "note", id: "gbhf-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeGeneratorBatteryHybridFuel,
});
