// Twenty-one structural, concrete, earthwork and steam-plant tiles against
// references the specs did not write. The worked-example fixture recomputes
// each spec's own example, so a spec and its tile that share an error agree
// with each other; these tests hold the tiles to statics, to conservation of
// mass and energy, to geometry computed a second way, and to the published
// tables and conventions their citations name.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLaundryWasherTurns,
  computeLaundryCostPerPound,
  computeLaundryDryerEvaporation,
  computeDeaeratorSteamDemand,
  computeFuelOilAtomizingViscosity,
} from "../../calc-steamplant.js";
import {
  computeConcreteStairVolume,
  computeConcreteIsolationJoint,
  computeCuringCompoundCoverage,
  computeConcreteCrackedInertiaTee,
} from "../../calc-concrete.js";
import {
  computeRiprapTonnage,
  computeRockConstructionEntrance,
  computeHddPullback,
  computeDumpTruckLoads,
} from "../../calc-earthwork.js";
import {
  computeMasonryJointReinforcement,
  computeBrickVeneerWeepCount,
  computeBrickVeneerAnchorSpacing,
} from "../../calc-masonry.js";
import { computeSptRequiredN60, computeSlopeStabilitySeepage } from "../../calc-geotech.js";
import { computeShearwallOverturning } from "../../calc-lateral.js";
import { computeCompositeBeamFlexure } from "../../calc-steel.js";
import { computeSoilRelativeDensity } from "../../calc-soilproperties.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ============================================================ steam plant ==

// ---- laundry-washer-turns: machine-minutes accounting ----

const LWT_CASES = [
  { machine_capacity_lb: 125, wash_cycle_min: 33, load_unload_min: 5, idle_min: 12, shift_hours: 8, shifts_per_day: 1, machine_count: 3, required_lb_per_day: 4000 },
  { machine_capacity_lb: 60, wash_cycle_min: 25, load_unload_min: 4, idle_min: 0, shift_hours: 10, shifts_per_day: 2, machine_count: 2, required_lb_per_day: 5000 },
  { machine_capacity_lb: 400, wash_cycle_min: 45, load_unload_min: 10, idle_min: 25, shift_hours: 7.5, shifts_per_day: 3, machine_count: 1, required_lb_per_day: 12000 },
];

test("washer turns: the day's linen uses exactly the machine-minutes the plant owns", () => {
  // Independent of the turns arithmetic: every pound processed occupies one
  // machine for the whole occupied cycle, so
  //   (lb per day / capacity) x occupied cycle = machines x shifts x shift minutes.
  for (const c of LWT_CASES) {
    const r = computeLaundryWasherTurns(c);
    const machine_minutes_used = (r.lb_per_day / c.machine_capacity_lb) * r.total_cycle_min;
    const machine_minutes_owned = c.machine_count * c.shifts_per_day * c.shift_hours * 60;
    within(machine_minutes_used, machine_minutes_owned, 1e-9, "machine-minutes balance");
    within(r.total_cycle_min, c.wash_cycle_min + c.load_unload_min + c.idle_min, 1e-9, "occupied cycle");
  }
});

test("washer turns: the machine count is the smallest that covers the requirement, and no smaller", () => {
  // A fencepost check on ceil(): N machines must cover the day and N-1 must not.
  for (const c of LWT_CASES) {
    const r = computeLaundryWasherTurns(c);
    const perMachinePerDay = r.lb_per_day / c.machine_count;
    assert.ok(r.machines_required * perMachinePerDay >= c.required_lb_per_day * (1 - 1e-9),
      `${r.machines_required} machines must cover ${c.required_lb_per_day} lb`);
    assert.ok((r.machines_required - 1) * perMachinePerDay < c.required_lb_per_day * (1 - 1e-9),
      `${r.machines_required - 1} machines must NOT cover ${c.required_lb_per_day} lb`);
  }
});

test("washer turns: idle time is pure loss -- the pounds lost are the pounds the idle minutes would have washed", () => {
  for (const c of LWT_CASES) {
    const r = computeLaundryWasherTurns(c);
    const noIdle = computeLaundryWasherTurns({ ...c, idle_min: 0 });
    within(r.lb_per_day + r.idle_loss_lb_per_day, noIdle.lb_per_day, 1e-9, "idle loss closes against the zero-idle run");
    if (c.idle_min === 0) within(r.idle_loss_lb_per_day, 0, 1e-9, "no idle, no loss");
    assert.ok(r.lb_per_day <= noIdle.lb_per_day + 1e-9, "idle can never raise throughput");
  }
});

// ---- laundry-cost-per-pound: energy balance and cross-tile agreement ----

const LCP_CASE = {
  lb_per_day: 4000, gal_per_lb: 2.2, water_rate_per_gal: 0.006, sewer_rate_per_gal: 0.008,
  incoming_temp_f: 55, wash_temp_f: 150, hot_fraction: 0.6, heater_efficiency: 0.8,
  fuel_cost_per_mmbtu: 9, retained_moisture_fraction: 0.45, improved_retained_moisture_fraction: 0.35,
  dryer_efficiency: 0.7, chem_cost_per_cwt: 18, labor_hours_per_day: 24, labor_rate_per_hour: 22,
  days_per_year: 300,
};

test("laundry cost: the hot-water line is a sensible-heat balance -- 1 BTU per pound of water per degree F", () => {
  // Water weighs 8.34 lb/gal and takes 1 BTU per lb per degF; the heater's
  // inefficiency is fuel bought and not delivered.
  const r = computeLaundryCostPerPound(LCP_CASE);
  const hot_gal_per_lb = LCP_CASE.gal_per_lb * LCP_CASE.hot_fraction;
  const delivered_btu = hot_gal_per_lb * 8.34 * (LCP_CASE.wash_temp_f - LCP_CASE.incoming_temp_f);
  within(r.hot_water_btu_per_lb * LCP_CASE.heater_efficiency, delivered_btu, 1e-9, "heat delivered to the water");
  within(r.delta_t_f, 95, 1e-9, "temperature rise");
  // $9/MMBTU on 11.606 BTU... the dollars are the BTU priced at the fuel rate.
  within(r.hot_water_cost_per_lb, r.hot_water_btu_per_lb * 9 / 1e6, 1e-9, "BTU priced at the fuel rate");
});

test("laundry cost: the six components sum to the total, and the hundredweight and annual figures are the same money", () => {
  const r = computeLaundryCostPerPound(LCP_CASE);
  const parts = r.water_cost_per_lb + r.sewer_cost_per_lb + r.hot_water_cost_per_lb
    + r.drying_cost_per_lb + r.chemistry_cost_per_lb + r.labor_cost_per_lb;
  within(parts, r.total_cost_per_lb, 1e-9, "components sum to the total");
  within(r.cost_per_cwt, r.total_cost_per_lb * 100, 1e-9, "a hundredweight is 100 lb");
  within(r.annual_cost, r.total_cost_per_lb * LCP_CASE.lb_per_day * LCP_CASE.days_per_year, 1e-9, "annual = per lb x lb/day x days");
  // Labor is a daily crew cost spread over the day's pounds, not a rate per pound.
  within(r.labor_cost_per_lb * LCP_CASE.lb_per_day, 24 * 22, 1e-9, "the crew's day costs $528");
});

test("laundry cost: its drying line agrees with the dryer tile's own evaporation load, pound for pound", () => {
  // Two tiles, one physical quantity: the water carried out of the washer.
  const r = computeLaundryCostPerPound(LCP_CASE);
  const dryer = computeLaundryDryerEvaporation({
    dry_weight_lb_per_day: LCP_CASE.lb_per_day,
    retained_moisture_fraction: LCP_CASE.retained_moisture_fraction,
    improved_retained_moisture_fraction: LCP_CASE.improved_retained_moisture_fraction,
    dryer_efficiency: LCP_CASE.dryer_efficiency,
    fuel_cost_per_mmbtu: LCP_CASE.fuel_cost_per_mmbtu,
    days_per_year: LCP_CASE.days_per_year,
  });
  within(r.drying_btu_per_lb * LCP_CASE.lb_per_day, dryer.heat_btu_per_day, 1e-9, "same drying heat per day");
  within(r.extraction_saving_annual, dryer.extraction_saving_annual, 1e-9, "same extraction saving");
});

// ---- laundry-dryer-evaporation: mass and energy balance, and the 1.08 ----

const LDE_CASE = {
  dry_weight_lb_per_day: 4000, retained_moisture_fraction: 0.45, improved_retained_moisture_fraction: 0.35,
  dryer_efficiency: 0.7, temp_rise_f: 100, operating_hours_per_day: 8, fuel_cost_per_mmbtu: 9,
  days_per_year: 300, louver_face_velocity_fpm: 500, louver_free_area_fraction: 0.5,
};

test("dryer evaporation: the water is a mass balance and the heat is that water boiled off at 1,200 BTU/lb", () => {
  const r = computeLaundryDryerEvaporation(LDE_CASE);
  // 4,000 lb of linen holding 45% of its dry weight in water carries 1,800 lb of water.
  within(r.water_lb_per_day, 1800, 1e-9, "water removed");
  // Energy delivered to the water is latent + superheat, about 1,200 BTU/lb;
  // the dryer's inefficiency is fuel bought and not delivered.
  within(r.heat_btu_per_day * LDE_CASE.dryer_efficiency, r.water_lb_per_day * 1200, 1e-9, "energy delivered to the water");
  within(r.heat_btuh * LDE_CASE.operating_hours_per_day, r.heat_btu_per_day, 1e-9, "the day's heat over the day's run hours");
});

test("dryer evaporation: the exhaust air carries the heat away -- an air-side sensible balance from first principles", () => {
  // 1.08 = 60 min/hr x 0.075 lb/cu ft x 0.24 BTU/lb-F. Rebuild it rather than
  // trust the constant: mass flow x specific heat x rise must equal the BTU/hr.
  const r = computeLaundryDryerEvaporation(LDE_CASE);
  const lb_air_per_hour = r.exhaust_cfm * 60 * 0.075;
  within(lb_air_per_hour * 0.24 * LDE_CASE.temp_rise_f, r.heat_btuh, 1e-9, "air-side sensible balance");
  within(r.makeup_cfm, r.exhaust_cfm, 1e-9, "what leaves must come back in");
  // The louver passes the makeup air at its face velocity through its free area only.
  within(r.louver_free_area_ft2 * LDE_CASE.louver_face_velocity_fpm, r.makeup_cfm, 1e-9, "free area x face velocity = cfm");
  within(r.louver_gross_ft2 * LDE_CASE.louver_free_area_fraction, r.louver_free_area_ft2, 1e-9, "half-free louver needs twice the gross");
});

test("dryer evaporation: better extraction saves exactly the water it leaves behind, and the airflow halves when the rise doubles", () => {
  const r = computeLaundryDryerEvaporation(LDE_CASE);
  within(r.water_saved_lb_per_day, 4000 * (0.45 - 0.35), 1e-9, "100 lb of water a day per point of moisture");
  within(r.heat_saved_btu_per_day * LDE_CASE.dryer_efficiency, r.water_saved_lb_per_day * 1200, 1e-9, "the saving is that water not boiled");
  const hotter = computeLaundryDryerEvaporation({ ...LDE_CASE, temp_rise_f: 200 });
  within(hotter.exhaust_cfm * 2, r.exhaust_cfm, 1e-9, "twice the rise, half the air");
  within(hotter.heat_btu_per_day, r.heat_btu_per_day, 1e-9, "the evaporation load does not care about the air temperature");
});

// ---- deaerator-steam-demand: the mixing heat balance closes ----

const DSD_CASE = {
  feedwater_lb_hr: 25000, condensate_fraction: 0.6, alt_condensate_fraction: 0.8,
  condensate_temp_f: 190, makeup_temp_f: 60, da_saturation_temp_f: 227,
  latent_heat_btu_lb: 960.2, steam_enthalpy_btu_lb: 1156.4, vent_fraction: 0.003,
  boiler_efficiency: 0.8, fuel_cost_per_mmbtu: 9, hours_per_year: 8000,
};

test("deaerator: the vessel's enthalpy balance closes -- condensate + makeup + steam in equals feedwater at saturation", () => {
  // Enthalpy in (datum 32 F, liquid cp = 1 BTU/lb-F) must equal enthalpy out.
  // The condensing steam gives up its latent heat and leaves as water at
  // saturation along with everything else.
  const r = computeDeaeratorSteamDemand(DSD_CASE);
  const cond_lb = DSD_CASE.feedwater_lb_hr * DSD_CASE.condensate_fraction;
  const makeup_lb = DSD_CASE.feedwater_lb_hr - cond_lb;
  const heat_in = cond_lb * (DSD_CASE.condensate_temp_f - 32)
    + makeup_lb * (DSD_CASE.makeup_temp_f - 32)
    + r.heating_steam_lb_hr * (DSD_CASE.latent_heat_btu_lb + (DSD_CASE.da_saturation_temp_f - 32));
  const heat_out = (DSD_CASE.feedwater_lb_hr + r.heating_steam_lb_hr) * (DSD_CASE.da_saturation_temp_f - 32);
  within(heat_in, heat_out, 1e-6, "deaerator enthalpy balance");
  // The mixed temperature is a mass-weighted average and must lie between its two inputs.
  assert.ok(r.mixed_temp_f > DSD_CASE.makeup_temp_f && r.mixed_temp_f < DSD_CASE.condensate_temp_f, "mixture lies between");
  within(r.mixed_temp_f, 138, 1e-9, "0.6 x 190 + 0.4 x 60 = 138 F");
});

test("deaerator: a pound of steam costs the boiler the latent heat only, because the feedwater is already at saturation", () => {
  // hg - hf(DA) = hfg(DA); charging it from the makeup temperature would
  // double-count the heat the deaerator itself supplies.
  const r = computeDeaeratorSteamDemand(DSD_CASE);
  within(r.feedwater_enthalpy_btu_lb, DSD_CASE.steam_enthalpy_btu_lb - DSD_CASE.latent_heat_btu_lb, 1e-9, "hf = hg - hfg");
  within(r.fuel_per_lb_steam_btu * DSD_CASE.boiler_efficiency, DSD_CASE.latent_heat_btu_lb, 1e-9, "fuel per lb of steam");
  // The dollars are that fuel priced and run out over the year.
  within(r.vent_annual_cost, r.vent_steam_lb_hr * r.fuel_per_lb_steam_btu / 1e6 * 9 * 8000, 1e-9, "vent cost");
  within(r.vent_steam_lb_hr, 25000 * 0.003, 1e-9, "the vent is 0.3% of throughput");
});

test("deaerator: more condensate return is less steam, and the saving is the steam it stops raising", () => {
  const r = computeDeaeratorSteamDemand(DSD_CASE);
  const alt = computeDeaeratorSteamDemand({ ...DSD_CASE, condensate_fraction: DSD_CASE.alt_condensate_fraction });
  within(r.alt_heating_steam_lb_hr, alt.heating_steam_lb_hr, 1e-9, "the alternative case is the tile run at that return");
  within(r.steam_saved_lb_hr, r.heating_steam_lb_hr - alt.heating_steam_lb_hr, 1e-9, "steam saved");
  within(r.condensate_return_annual_saving, r.steam_saved_lb_hr * r.fuel_per_lb_steam_btu / 1e6 * 9 * 8000, 1e-9, "saving in dollars");
  assert.ok(alt.heating_steam_lb_hr < r.heating_steam_lb_hr, "warmer feed, less steam");
});

// ---- fuel-oil-atomizing-viscosity: the fit must honour its own two points ----

const FOA_CASE = { v1_ssu: 7000, t1_f: 100, v2_ssu: 340, t2_f: 180, target_ssu: 150, pumping_limit_ssu: 4000, check_temp_f: 185 };

test("fuel oil viscosity: the fitted line passes through both data-sheet points it was given", () => {
  // Interpolation on two points must reproduce those two points exactly; a
  // fit that does not is not the line through them.
  const r = computeFuelOilAtomizingViscosity(FOA_CASE);
  const at1 = computeFuelOilAtomizingViscosity({ ...FOA_CASE, target_ssu: FOA_CASE.v1_ssu });
  const at2 = computeFuelOilAtomizingViscosity({ ...FOA_CASE, target_ssu: FOA_CASE.v2_ssu });
  within(at1.temp_for_target_f, FOA_CASE.t1_f, 1e-6, "7,000 SSU is reached at 100 F");
  within(at2.temp_for_target_f, FOA_CASE.t2_f, 1e-6, "340 SSU is reached at 180 F");
  // And the inverse direction agrees: asking the viscosity at the temperature
  // the tile just named for 150 SSU must give 150 SSU back.
  const back = computeFuelOilAtomizingViscosity({ ...FOA_CASE, check_temp_f: r.temp_for_target_f });
  within(back.viscosity_at_check_ssu, 150, 1e-6, "round trip through the fit");
});

test("fuel oil viscosity: hotter oil is thinner, and the atomizing setpoint is far above the pumping setpoint", () => {
  const r = computeFuelOilAtomizingViscosity(FOA_CASE);
  assert.ok(r.temp_for_target_f > r.temp_for_pumping_f, "150 SSU needs more heat than 4,000 SSU");
  within(r.setpoint_spread_f, r.temp_for_target_f - r.temp_for_pumping_f, 1e-9, "the spread is the difference");
  let prev = Infinity;
  for (const t of [100, 120, 140, 160, 180, 200, 220]) {
    const v = computeFuelOilAtomizingViscosity({ ...FOA_CASE, check_temp_f: t }).viscosity_at_check_ssu;
    assert.ok(v < prev, `viscosity must fall with temperature (${t} F)`);
    prev = v;
  }
  // A No. 6 oil of this grade is heated to roughly 200-230 F to atomize; a
  // figure far outside that band would mean the fit or the SSU conversion is wrong.
  assert.ok(r.temp_for_target_f > 190 && r.temp_for_target_f < 240,
    `atomizing setpoint ${r.temp_for_target_f} F outside the 190-240 F band published practice uses for No. 6 oil`);
  // 185 F therefore cannot be enough, and the tile must say so.
  assert.equal(r.check_verdict.startsWith("ABOVE"), true, "185 F is short of the atomizing target");
});

test("fuel oil viscosity: two points that do not describe a thinning oil are refused", () => {
  const swapped = computeFuelOilAtomizingViscosity({ ...FOA_CASE, v1_ssu: 340, v2_ssu: 7000 });
  assert.ok(swapped.error, "viscosity rising with temperature must be refused");
  assert.ok(computeFuelOilAtomizingViscosity({ ...FOA_CASE, t2_f: 100 }).error, "one point does not define a line");
});

// ================================================================ concrete ==

// ---- concrete-stair-volume: the cross-section by shoelace on the real polygon ----

const stairCrossSectionByShoelace = (n, R, T, t) => {
  // The polygon a stair actually is: the sawtooth top, a perpendicular cut at
  // each end, and a soffit parallel to the line through the nosings at the
  // throat distance below it. Shoelace on these vertices owes nothing to the
  // tile's "triangles plus rake slab" decomposition.
  const L = Math.hypot(R, T);
  const nx = R / L, ny = -T / L;   // unit normal pointing below the rake
  const pts = [[0, 0]];
  for (let i = 1; i <= n; i++) { pts.push([(i - 1) * T, i * R]); pts.push([i * T, i * R]); }
  pts.push([n * T + t * nx, n * R + t * ny]);
  pts.push([t * nx, t * ny]);
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

const CSV_CASES = [
  { num_risers: 4, riser_in: 7, tread_in: 11, width_in: 48, throat_in: 4 },
  { num_risers: 12, riser_in: 7.5, tread_in: 10, width_in: 42, throat_in: 5 },
  { num_risers: 1, riser_in: 6, tread_in: 12, width_in: 60, throat_in: 6 },
];

test("stair volume: the cross-section matches a shoelace sum over the stair's actual outline", () => {
  for (const c of CSV_CASES) {
    const r = computeConcreteStairVolume(c);
    const area_in2 = stairCrossSectionByShoelace(c.num_risers, c.riser_in, c.tread_in, c.throat_in);
    within(r.volume_in3, area_in2 * c.width_in, 1e-9, `shoelace cross-section x width (${c.num_risers} risers)`);
  }
});

test("stair volume: the unit conversions are the real ones -- 1,728 cu in a cu ft, 27 cu ft a cu yd", () => {
  for (const c of CSV_CASES) {
    const r = computeConcreteStairVolume(c);
    within(r.volume_ft3, r.volume_in3 / (12 * 12 * 12), 1e-9, "cu in to cu ft");
    within(r.volume_cy, r.volume_ft3 / 27, 1e-9, "cu ft to cu yd");
    within(r.volume_cy, r.volume_in3 / (36 * 36 * 36), 1e-9, "a cubic yard is 36 in cubed");
  }
});

test("stair volume: a flight is bounded below by its waist slab and above by the box that contains it", () => {
  for (const c of CSV_CASES) {
    const r = computeConcreteStairVolume(c);
    const n = c.num_risers;
    const slab_only = c.throat_in * Math.hypot(n * c.riser_in, n * c.tread_in) * c.width_in;
    const box = n * c.riser_in * n * c.tread_in * c.width_in + slab_only;
    assert.ok(r.volume_in3 > slab_only, "more concrete than the bare waist slab");
    assert.ok(r.volume_in3 < box, "less than the full rectangular prism plus slab");
    // Twice as wide is exactly twice the concrete.
    const wide = computeConcreteStairVolume({ ...c, width_in: c.width_in * 2 });
    within(wide.volume_cy, r.volume_cy * 2, 1e-9, "linear in width");
  }
});

// ---- concrete-isolation-joint: perimeter geometry and strip coverage ----

const CIJ_CASES = [
  { slab_length_ft: 40, slab_width_ft: 30, num_columns: 6, column_perimeter_ft: 4, strip_length_ft: 10 },
  { slab_length_ft: 120, slab_width_ft: 80, num_columns: 0, column_perimeter_ft: 4, strip_length_ft: 20 },
  { slab_length_ft: 25.5, slab_width_ft: 25.5, num_columns: 3, column_perimeter_ft: 5.33, strip_length_ft: 8 },
];

test("isolation joint: the filler is the rectangle's perimeter plus one wrap around each column", () => {
  for (const c of CIJ_CASES) {
    const r = computeConcreteIsolationJoint(c);
    // Perimeter walked side by side rather than as 2(L+W).
    const walked = c.slab_length_ft + c.slab_width_ft + c.slab_length_ft + c.slab_width_ft;
    within(r.slab_perimeter_ft, walked, 1e-9, "four sides walked");
    within(r.filler_lf, walked + c.num_columns * c.column_perimeter_ft, 1e-9, "perimeter plus columns");
    // A 12 in square column is 4 ft around; the geometry must agree with that.
    const oneFoot = computeConcreteIsolationJoint({ ...c, num_columns: 1, column_perimeter_ft: 4 * 1 });
    within(oneFoot.filler_lf - oneFoot.slab_perimeter_ft, 4, 1e-9, "a 12 in square column takes 4 LF");
  }
});

test("isolation joint: the strip count covers the run and one strip fewer does not", () => {
  for (const c of CIJ_CASES) {
    const r = computeConcreteIsolationJoint(c);
    assert.ok(r.strips * c.strip_length_ft >= r.filler_lf - 1e-9, "strips cover the filler");
    assert.ok((r.strips - 1) * c.strip_length_ft < r.filler_lf - 1e-9, "one fewer strip comes up short");
    assert.ok(Number.isInteger(r.strips), "strips are whole");
  }
});

test("isolation joint: for a fixed area the squarest slab needs the least filler", () => {
  // An isoperimetric check the tile cannot shortcut: 60 x 60 beats 90 x 40 beats 180 x 20.
  const base = { num_columns: 0, column_perimeter_ft: 0, strip_length_ft: 10 };
  const square = computeConcreteIsolationJoint({ ...base, slab_length_ft: 60, slab_width_ft: 60 }).filler_lf;
  const oblong = computeConcreteIsolationJoint({ ...base, slab_length_ft: 90, slab_width_ft: 40 }).filler_lf;
  const strip = computeConcreteIsolationJoint({ ...base, slab_length_ft: 180, slab_width_ft: 20 }).filler_lf;
  assert.ok(square < oblong && oblong < strip, `expected 240 < 260 < 400, got ${square}, ${oblong}, ${strip}`);
  within(square, 240, 1e-9, "a 60 ft square is 240 LF around");
});

// ---- curing-compound-coverage: the gallons really cover the slab ----

const CCC_CASES = [
  { slab_area_sf: 2500, coats: 1, coverage_sf_per_gal: 200, waste_pct: 0 },
  { slab_area_sf: 8600, coats: 2, coverage_sf_per_gal: 300, waste_pct: 10 },
  { slab_area_sf: 400, coats: 1, coverage_sf_per_gal: 200, waste_pct: 0 },
];

test("curing compound: the gallons bought spread over the area at the label rate, waste included", () => {
  for (const c of CCC_CASES) {
    const r = computeCuringCompoundCoverage(c);
    // Area the exact gallons cover at the label rate, less the waste allowance.
    const covered = r.gallons_exact * c.coverage_sf_per_gal / (1 + c.waste_pct / 100);
    within(covered, c.slab_area_sf * c.coats, 1e-9, "the material covers the coats ordered");
    assert.ok(r.gallons_needed * c.coverage_sf_per_gal >= c.slab_area_sf * c.coats - 1e-9,
      "whole gallons still cover the slab");
  }
});

test("curing compound: whole gallons and whole pails, rounded up and no further", () => {
  for (const c of CCC_CASES) {
    const r = computeCuringCompoundCoverage(c);
    assert.ok(Number.isInteger(r.gallons_needed) && Number.isInteger(r.pails_5gal), "whole units");
    assert.ok(r.gallons_needed >= r.gallons_exact - 1e-9 && r.gallons_needed < r.gallons_exact + 1, "up, by less than a gallon");
    assert.ok(r.pails_5gal * 5 >= r.gallons_needed, "the pails hold the gallons");
    assert.ok((r.pails_5gal - 1) * 5 < r.gallons_needed, "one pail fewer does not");
  }
  // An exact multiple must not tip into an extra unit: 2,500 sf at 200 sf/gal
  // is 12.5 gal -> 13 gal -> 3 pails; 2,000 sf is exactly 10 gal and 2 pails.
  const exact = computeCuringCompoundCoverage({ slab_area_sf: 2000, coats: 1, coverage_sf_per_gal: 200, waste_pct: 0 });
  assert.equal(exact.gallons_needed, 10);
  assert.equal(exact.pails_5gal, 2);
});

test("curing compound: waste and coats are multipliers on the same material", () => {
  const one = computeCuringCompoundCoverage({ slab_area_sf: 9000, coats: 1, coverage_sf_per_gal: 300, waste_pct: 0 });
  const two = computeCuringCompoundCoverage({ slab_area_sf: 9000, coats: 2, coverage_sf_per_gal: 300, waste_pct: 0 });
  const wasted = computeCuringCompoundCoverage({ slab_area_sf: 9000, coats: 1, coverage_sf_per_gal: 300, waste_pct: 25 });
  within(two.gallons_exact, one.gallons_exact * 2, 1e-9, "two coats, twice the material");
  within(wasted.gallons_exact, one.gallons_exact * 1.25, 1e-9, "25% waste, 25% more material");
});

// ---- concrete-cracked-inertia-tee: the transformed section, integrated ----

// Independent of the tile's quadratics: find the neutral axis where the first
// moments balance and integrate the second moment numerically, both from the
// definition of a cracked transformed section.
const teeTransformed = (b, hf, bw, d, As, fc) => {
  const n = 29000000 / (57000 * Math.sqrt(fc));     // ACI 318-19 19.2.2.1.a
  const widthAt = (y) => (y < hf ? b : bw);
  const integrate = (c, f) => {
    // Integrate 0..c, splitting at the flange so each piece has a constant width.
    const edges = c <= hf ? [0, c] : [0, hf, c];
    let sum = 0;
    for (let s = 0; s < edges.length - 1; s++) {
      const lo = edges[s], hi = edges[s + 1], N = 20000, dy = (hi - lo) / N;
      const w = widthAt((lo + hi) / 2);
      for (let i = 0; i < N; i++) sum += w * f(lo + (i + 0.5) * dy) * dy;
    }
    return sum;
  };
  // Neutral axis: first moment of the compression concrete ABOUT THAT AXIS
  // equals n As (d - c), the transformed steel's first moment about it.
  let lo = 1e-9, hi = d;
  for (let i = 0; i < 200; i++) {
    const c = (lo + hi) / 2;
    if (integrate(c, (y) => c - y) - n * As * (d - c) < 0) lo = c; else hi = c;
  }
  const kd = (lo + hi) / 2;
  // Icr is the second moment of the same areas about the same axis.
  const icr = integrate(kd, (y) => (kd - y) ** 2) + n * As * (d - kd) ** 2;
  return { n, kd, icr };
};

const CIT_CASES = [
  { b_in: 48, hf_in: 4, bw_in: 12, d_in: 17.5, as_in2: 6.0, fc_psi: 4000 },   // NA in the web
  { b_in: 60, hf_in: 6, bw_in: 10, d_in: 24, as_in2: 2.0, fc_psi: 5000 },      // NA in the flange
  { b_in: 14, hf_in: 3, bw_in: 14, d_in: 20, as_in2: 4.0, fc_psi: 3000 },      // bw = b, a rectangle
];

test("cracked T-beam: the neutral axis and Icr match a transformed section found by balancing first moments and integrating", () => {
  for (const c of CIT_CASES) {
    const r = computeConcreteCrackedInertiaTee(c);
    const ref = teeTransformed(c.b_in, c.hf_in, c.bw_in, c.d_in, c.as_in2, c.fc_psi);
    within(r.n, ref.n, 1e-9, "modular ratio");
    within(r.kd_in, ref.kd, 0.01, `kd (b=${c.b_in}, As=${c.as_in2})`);
    within(r.icr_in4, ref.icr, 0.05, `Icr (b=${c.b_in}, As=${c.as_in2})`);
    assert.equal(r.neutral_axis_in, ref.kd <= c.hf_in ? "flange" : "web", "which part the axis falls in");
  }
});

test("cracked T-beam: the neutral axis is where the compression and tension first moments balance, exactly", () => {
  // State the equilibrium the section must satisfy, whichever branch ran.
  for (const c of CIT_CASES) {
    const r = computeConcreteCrackedInertiaTee(c);
    const kd = r.kd_in, { b_in: b, hf_in: hf, bw_in: bw } = c;
    const qc = kd <= hf
      ? b * kd * kd / 2
      : b * hf * (kd - hf / 2) + bw * (kd - hf) * (kd - hf) / 2;
    within(qc, r.n * c.as_in2 * (c.d_in - kd), 1e-6, "first moments balance about the neutral axis");
    assert.ok(kd > 0 && kd < c.d_in, "the axis lies in the section");
    // Icr must exceed the steel's own contribution and stay under the gross flanged inertia.
    assert.ok(r.icr_in4 > r.n * c.as_in2 * (c.d_in - kd) ** 2, "concrete adds to the steel term");
  }
});

test("cracked T-beam: more steel pushes the axis down and stiffens the section, monotonically", () => {
  const base = { b_in: 48, hf_in: 4, bw_in: 12, d_in: 17.5, fc_psi: 4000 };
  let lastKd = 0, lastIcr = 0;
  for (const as of [1, 2, 4, 6, 9, 12]) {
    const r = computeConcreteCrackedInertiaTee({ ...base, as_in2: as });
    assert.ok(r.kd_in > lastKd, `kd must rise with As (${as} in^2)`);
    assert.ok(r.icr_in4 > lastIcr, `Icr must rise with As (${as} in^2)`);
    lastKd = r.kd_in; lastIcr = r.icr_in4;
  }
  // A stronger concrete is stiffer, so n falls and so does the transformed steel.
  const soft = computeConcreteCrackedInertiaTee({ ...base, as_in2: 6, fc_psi: 3000 });
  const hard = computeConcreteCrackedInertiaTee({ ...base, as_in2: 6, fc_psi: 6000 });
  assert.ok(hard.n < soft.n && hard.kd_in < soft.kd_in, "higher f'c, lower n, shallower axis");
  within(soft.n * Math.sqrt(3000), hard.n * Math.sqrt(6000), 1e-9, "n goes as 1/sqrt(f'c)");
});

// =============================================================== earthwork ==

// ---- riprap-tonnage: the ton and the cubic yard are what they are ----

const RIP_CASES = [
  { area_sf: 1200, thickness_ft: 1.5, unit_wt_pcf: 165 },
  { area_sf: 450, thickness_ft: 2, unit_wt_pcf: 140 },
  { area_sf: 10000, thickness_ft: 0.75, unit_wt_pcf: 165 },
];

test("riprap: a cubic yard is 27 cubic feet and a ton is 2,000 lb -- the tonnage follows from the two", () => {
  for (const c of RIP_CASES) {
    const r = computeRiprapTonnage(c);
    const cubic_feet = c.area_sf * c.thickness_ft;
    within(r.volume_cy * 27, cubic_feet, 1e-9, "27 cu ft a cu yd");
    within(r.tons * 2000, cubic_feet * c.unit_wt_pcf, 1e-9, "2,000 lb a ton");
    // So a cubic yard of 165 pcf stone is 4,455 lb, or 2.2275 tons.
    within(r.tons / r.volume_cy, 27 * c.unit_wt_pcf / 2000, 1e-9, "tons per cubic yard");
  }
  within(computeRiprapTonnage({ area_sf: 27, thickness_ft: 1, unit_wt_pcf: 165 }).tons, 2.2275, 1e-9,
    "one cubic yard of 165 pcf riprap");
});

test("riprap: a thickness typed in inches is caught rather than silently multiplied by twelve", () => {
  assert.ok(computeRiprapTonnage({ area_sf: 1200, thickness_ft: 18, unit_wt_pcf: 165 }).error,
    "18 (inches) must be refused as a thickness in feet");
  assert.ok(!computeRiprapTonnage({ area_sf: 1200, thickness_ft: 10, unit_wt_pcf: 165 }).error,
    "10 ft is heavy riprap but legitimate");
});

// ---- rock-construction-entrance: the same stone, measured in inches deep ----

test("construction entrance: the depth in inches is a twelfth of a foot, and the pad agrees with the riprap tile", () => {
  const c = { length_ft: 50, width_ft: 14, depth_in: 6, unit_wt_pcf: 100 };
  const r = computeRockConstructionEntrance(c);
  const cubic_feet = 50 * 14 * 0.5;
  within(r.volume_cy * 27, cubic_feet, 1e-9, "27 cu ft a cu yd");
  within(r.tons * 2000, cubic_feet * 100, 1e-9, "2,000 lb a ton");
  within(r.volume_cy, 12.963, 0.01, "50 x 14 x 0.5 ft = 350 cu ft = 12.96 cy");
  // Same geometry, same stone: the riprap tile must give the same answer.
  const rip = computeRiprapTonnage({ area_sf: 50 * 14, thickness_ft: 0.5, unit_wt_pcf: 100 });
  within(r.volume_cy, rip.volume_cy, 1e-9, "two tiles, one prism");
  within(r.tons, rip.tons, 1e-9, "two tiles, one tonnage");
});

test("construction entrance: doubling any one dimension doubles the stone", () => {
  const base = { length_ft: 50, width_ft: 14, depth_in: 6, unit_wt_pcf: 100 };
  const r = computeRockConstructionEntrance(base);
  for (const k of ["length_ft", "width_ft", "depth_in"]) {
    const d = computeRockConstructionEntrance({ ...base, [k]: base[k] * 2 });
    within(d.tons, r.tons * 2, 1e-9, `linear in ${k}`);
  }
});

// ---- hdd-pullback: friction, and the capstan relation ----

const HDD_CASE = { eff_weight_plf: 5, length_ft: 800, friction_coeff: 0.3, bend_factor: 1.5, fluid_drag_lb: 500, pipe_safe_pull_lb: 12000, total_bend_deg: 60, rig_rated_pull_lb: 20000 };

test("HDD pullback: the straight drag is Coulomb friction on the pipe's own weight", () => {
  const r = computeHddPullback(HDD_CASE);
  // mu x W, with W the effective (buoyant) weight of 800 ft at 5 lb/ft.
  within(r.straight_drag_lb, 0.3 * (5 * 800), 1e-9, "mu x weight");
  within(r.straight_drag_lb, 1200, 1e-9, "1,200 lb of drag");
  // The lumped bend factor is a multiplier on the drag; the fluid drag is added after.
  within(r.pullback_lb, 1200 * 1.5 + 500, 1e-9, "bend factor applied to the drag only");
});

test("HDD pullback: the capstan term is e^(mu theta) with theta in radians -- hand-evaluated", () => {
  const r = computeHddPullback(HDD_CASE);
  // 60 degrees is pi/3 rad; e^(0.3 x 1.0471976) = e^0.3141593 = 1.369115.
  within(r.capstan_factor, Math.E ** (0.3 * Math.PI / 3), 1e-9, "capstan factor");
  within(r.capstan_factor, 1.369115, 0.001, "e^0.31416 = 1.3691");
  within(r.capstan_pullback_lb, 1200 * r.capstan_factor + 500, 1e-9, "capstan pull");
  // The assumed 1.5 factor is generous here, so it governs; the tile must take the worse of the two.
  within(r.governing_pullback_lb, Math.max(r.pullback_lb, r.capstan_pullback_lb), 1e-9, "the worse case governs");
  // A straight bore has no capstan amplification at all.
  within(computeHddPullback({ ...HDD_CASE, total_bend_deg: 0 }).capstan_factor, 1, 1e-9, "no bend, no amplification");
});

test("HDD pullback: a curvy bore overtakes the assumed factor at the angle where e^(mu theta) = 1.5", () => {
  // Solve it independently: theta = ln(1.5)/0.3 = 1.35155 rad = 77.44 degrees.
  const theta_deg = Math.log(1.5) / 0.3 * 180 / Math.PI;
  within(theta_deg, 77.438, 0.01, "the break-even bend angle");
  const under = computeHddPullback({ ...HDD_CASE, total_bend_deg: theta_deg - 10 });
  const over = computeHddPullback({ ...HDD_CASE, total_bend_deg: theta_deg + 10 });
  within(under.governing_pullback_lb, under.pullback_lb, 1e-9, "below it the assumed factor governs");
  within(over.governing_pullback_lb, over.capstan_pullback_lb, 1e-9, "above it the capstan governs");
  // The smaller of the pipe and the rig is what the pull has to fit inside.
  assert.equal(over.governing_limit_lb, 12000);
  assert.equal(over.governing_limit, "the product pipe's safe pull");
  assert.equal(over.within_limit, over.governing_pullback_lb <= 12000);
});

// ---- dump-truck-loads: payload governance and the fencepost ----

const DTL_CASES = [
  { total_lcy: 625, box_vol_cy: 12, weight_limit_lb: 40000, material_density_lb_per_lcy: 2800 },
  { total_lcy: 1000, box_vol_cy: 10, weight_limit_lb: 50000, material_density_lb_per_lcy: 2200 },
  { total_lcy: 48, box_vol_cy: 12, weight_limit_lb: 40000, material_density_lb_per_lcy: 2500 },
];

test("dump truck loads: the payload is whichever of the box and the axle limit fills first", () => {
  for (const c of DTL_CASES) {
    const r = computeDumpTruckLoads(c);
    within(r.weight_limited_cy * c.material_density_lb_per_lcy, c.weight_limit_lb, 1e-9, "weight-limited volume");
    within(r.payload_cy, Math.min(r.weight_limited_cy, c.box_vol_cy), 1e-9, "the tighter limit");
    // The load actually weighs no more than the limit and fits in the box.
    assert.ok(r.payload_cy * c.material_density_lb_per_lcy <= c.weight_limit_lb + 1e-9, "legal weight");
    assert.ok(r.payload_cy <= c.box_vol_cy + 1e-9, "fits the box");
    assert.equal(r.governs, r.weight_limited_cy < c.box_vol_cy ? "weight" : "volume");
  }
  // 40,000 lb of 2,800 lb/cy material is 14.29 cy, so a 12 cy box governs.
  const r0 = computeDumpTruckLoads(DTL_CASES[0]);
  within(r0.weight_limited_cy, 14.2857, 0.01, "40,000 / 2,800");
  assert.equal(r0.governs, "volume");
});

test("dump truck loads: the trucks haul the dirt, and one truck fewer does not", () => {
  for (const c of DTL_CASES) {
    const r = computeDumpTruckLoads(c);
    assert.ok(Number.isInteger(r.loads), "whole loads");
    assert.ok(r.loads * r.payload_cy >= c.total_lcy - 1e-9, "the loads move the dirt");
    assert.ok((r.loads - 1) * r.payload_cy < c.total_lcy - 1e-9, "one load fewer leaves dirt behind");
  }
  // 48 cy at a 16 cy weight limit against a 12 cy box is exactly 4 loads, not 5.
  assert.equal(computeDumpTruckLoads(DTL_CASES[2]).loads, 4);
});

test("dump truck loads: a payload limit typed in tons is caught", () => {
  assert.ok(computeDumpTruckLoads({ total_lcy: 625, box_vol_cy: 12, weight_limit_lb: 20, material_density_lb_per_lcy: 2800 }).error,
    "20 (tons) must be refused as a limit in pounds");
});

// ================================================================= masonry ==

// ---- masonry-joint-reinforcement: the wire really reaches the end of the wall ----

const MJR_CASES = [
  { wall_length_ft: 40, wall_height_ft: 12, vertical_spacing_in: 16, piece_length_ft: 10, lap_in: 6 },
  { wall_length_ft: 100, wall_height_ft: 20, vertical_spacing_in: 8, piece_length_ft: 12, lap_in: 9 },
  { wall_length_ft: 9, wall_height_ft: 8, vertical_spacing_in: 16, piece_length_ft: 10, lap_in: 6 },
];

test("joint reinforcement: the pieces laid end to end, less each lap, span the wall -- and one fewer does not", () => {
  for (const c of MJR_CASES) {
    const r = computeMasonryJointReinforcement(c);
    const lap_ft = c.lap_in / 12;
    // A run of P pieces each lapping the last covers piece + (P-1)(piece - lap).
    const covered = (p) => c.piece_length_ft + (p - 1) * (c.piece_length_ft - lap_ft);
    assert.ok(covered(r.pieces_per_course) >= c.wall_length_ft - 1e-9,
      `${r.pieces_per_course} pieces must reach ${c.wall_length_ft} ft`);
    if (r.pieces_per_course > 1) {
      assert.ok(covered(r.pieces_per_course - 1) < c.wall_length_ft - 1e-9,
        `${r.pieces_per_course - 1} pieces must fall short of ${c.wall_length_ft} ft`);
    }
    // A 40 ft wall in 10 ft pieces lapped 6 in takes five pieces, not four.
    within(r.total_pieces, r.reinforced_courses * r.pieces_per_course, 1e-9, "total = courses x pieces");
  }
  assert.equal(computeMasonryJointReinforcement(MJR_CASES[0]).pieces_per_course, 5);
  assert.equal(computeMasonryJointReinforcement(MJR_CASES[2]).pieces_per_course, 1);
});

test("joint reinforcement: the courses are spaced up the wall at the code cap, counted by fencepost from the first bed joint", () => {
  // 12 ft of wall at 16 in o.c. is 144/16 = 9 reinforced bed joints.
  assert.equal(computeMasonryJointReinforcement(MJR_CASES[0]).reinforced_courses, 9);
  // 20 ft at 8 in is 30 -- halving the spacing doubles the wire.
  assert.equal(computeMasonryJointReinforcement(MJR_CASES[1]).reinforced_courses, 30);
  const wide = computeMasonryJointReinforcement({ ...MJR_CASES[0], vertical_spacing_in: 32 });
  assert.equal(wide.reinforced_courses, 5, "a loose 32 in spacing halves the courses (rounding up)");
  // The lap is not free: a longer lap is more pieces for the same wall.
  const long = computeMasonryJointReinforcement({ ...MJR_CASES[0], lap_in: 24 });
  assert.ok(long.pieces_per_course >= computeMasonryJointReinforcement(MJR_CASES[0]).pieces_per_course,
    "a bigger lap never needs fewer pieces");
  assert.ok(computeMasonryJointReinforcement({ ...MJR_CASES[0], lap_in: 120 }).error, "a lap as long as the piece is refused");
});

// ---- brick-veneer-weep-count: IRC R703.8.6 / TMS 402 spacing, as a fencepost ----

const BVW_CASES = [
  { wall_length_ft: 30, max_spacing_in: 33, flashing_lines: 1 },
  { wall_length_ft: 64, max_spacing_in: 24, flashing_lines: 3 },
  { wall_length_ft: 11, max_spacing_in: 33, flashing_lines: 1 },
];

test("brick veneer weeps: the holes sit at both ends with no gap over the code's 33 in", () => {
  // Weeps at the ends and evenly between: N weeps leave N-1 gaps, each of
  // which must satisfy the code maximum. N-1 weeps must violate it.
  for (const c of BVW_CASES) {
    const r = computeBrickVeneerWeepCount(c);
    const length_in = c.wall_length_ft * 12;
    const gap = length_in / (r.weeps_per_line - 1);
    assert.ok(gap <= c.max_spacing_in + 1e-9, `gap ${gap} in exceeds the ${c.max_spacing_in} in maximum`);
    if (r.weeps_per_line > 2) {
      assert.ok(length_in / (r.weeps_per_line - 2) > c.max_spacing_in + 1e-9, "one weep fewer would exceed the spacing");
    }
    within(r.total_weeps, r.weeps_per_line * c.flashing_lines, 1e-9, "one line of weeps above every flashing line");
  }
  // 30 ft at 33 in o.c.: 360/33 = 10.9 -> 11 spaces -> 12 weeps.
  assert.equal(computeBrickVeneerWeepCount(BVW_CASES[0]).weeps_per_line, 12);
  // 64 ft at the IRC's 24 in: 768/24 = 32 exactly -> 33 weeps, and 3 lines of them.
  assert.equal(computeBrickVeneerWeepCount(BVW_CASES[1]).weeps_per_line, 33);
  assert.equal(computeBrickVeneerWeepCount(BVW_CASES[1]).total_weeps, 99);
});

test("brick veneer weeps: a wall shorter than one spacing still gets a weep at each end", () => {
  const r = computeBrickVeneerWeepCount({ wall_length_ft: 2, max_spacing_in: 33, flashing_lines: 1 });
  assert.equal(r.weeps_per_line, 2, "both ends of a 2 ft wall");
  assert.ok(computeBrickVeneerWeepCount({ wall_length_ft: 30, max_spacing_in: 33, flashing_lines: 1.5 }).error,
    "flashing lines are whole");
});

// ---- brick-veneer-anchor-spacing: TMS 402 / IBC 1405 area and grid caps ----

test("brick veneer anchors: both the area limit and the 32 x 25 in grid are satisfied, and the grid is re-derived", () => {
  // TMS 402 / IBC 1405: one anchor per 2.67 ft^2 (a 16 x 24 in pattern) with
  // a maximum 32 in horizontal and 25 in vertical spacing. 32 x 25 in is
  // 800/144 = 5.56 ft^2, so with the standard caps the AREA limit governs.
  within(16 * 24 / 144, 2.67, 0.2, "2.67 ft^2 is a 16 x 24 in pattern");
  const r = computeBrickVeneerAnchorSpacing({ area_ft2: 200, area_per: 2.67, max_horiz_in: 32, max_vert_in: 25 });
  within(r.max_grid_ft2, 800 / 144, 1e-9, "the grid cap in square feet");
  assert.equal(r.spacing_governs, false, "with the standard caps the area limit governs");
  assert.ok(r.grid_ft2 <= 2.67 + 1e-9, "each anchor covers no more than its allowance");
  assert.ok(r.grid_ft2 <= r.max_grid_ft2 + 1e-9, "and no more than the grid");
  assert.equal(r.anchors, 75, "200 / 2.67 = 74.9 -> 75 anchors");
  assert.ok((r.anchors - 1) * 2.67 < 200, "74 anchors would leave veneer unanchored");
});

test("brick veneer anchors: a tight spacing grid takes over from the area limit when it is the smaller of the two", () => {
  // A 16 x 16 in grid is 1.78 ft^2, tighter than the 2.67 ft^2 area rule, so
  // the grid has to govern or the stated cap would never bind.
  const r = computeBrickVeneerAnchorSpacing({ area_ft2: 200, area_per: 2.67, max_horiz_in: 16, max_vert_in: 16 });
  within(r.max_grid_ft2, 256 / 144, 1e-9, "16 x 16 in is 1.78 ft^2");
  assert.equal(r.spacing_governs, true);
  assert.ok(r.grid_ft2 <= 256 / 144 + 1e-9, "the achieved coverage honours the tighter grid");
  assert.ok(r.anchors > computeBrickVeneerAnchorSpacing({ area_ft2: 200, area_per: 2.67 }).anchors, "more anchors than the area rule alone");
  // The high-wind and SDC D reductions are area limits and must raise the count.
  const sdcD = computeBrickVeneerAnchorSpacing({ area_ft2: 200, area_per: 2.0, max_horiz_in: 32, max_vert_in: 25 });
  assert.equal(sdcD.anchors, 100, "200 / 2.0 = 100 anchors");
  const highWind = computeBrickVeneerAnchorSpacing({ area_ft2: 200, area_per: 1.87, max_horiz_in: 32, max_vert_in: 25 });
  assert.ok(highWind.anchors > sdcD.anchors, "the high-wind reduction is the tightest of the three");
});

// ================================================================= geotech ==

// ---- spt-required-n60: Meyerhof, hand-evaluated ----

test("required N60: the Meyerhof allowable is re-derived by hand for the wide-footing branch", () => {
  // Meyerhof, settlement-controlled: qa = (N60/6)((B+1)/B)^2 for B > 4 ft,
  // times Kd = min(1 + 0.33 D/B, 1.33).
  // B = 6, D = 2: (1/6)(7/6)^2 = 0.226852 ksf per blow; Kd = 1 + 0.33(2/6) = 1.11.
  // qa per blow = 0.251806; N60 for 5 ksf = 19.86, design 20.
  const r = computeSptRequiredN60({ qa_target_ksf: 5, b_ft: 6, d_ft: 2 });
  within(r.kd, 1.11, 1e-9, "depth factor");
  within(r.qa_per_n60_ksf, (1 / 6) * (7 / 6) ** 2 * 1.11, 1e-9, "allowable per blow");
  within(r.n60, 5 / ((1 / 6) * (7 / 6) ** 2 * 1.11), 1e-9, "required N60");
  within(r.n60, 19.857, 0.01, "19.9 blows");
  assert.equal(r.n60_design, 20, "rounded up for design");
  assert.equal(r.small_footing, false);
});

test("required N60: the narrow-footing branch is qa = N60/4, and the depth factor caps at 1.33", () => {
  // B = 3 ft, D = 0 (surface footing, Kd = 1): qa = N60/4, so 4 ksf needs N60 = 16.
  const narrow = computeSptRequiredN60({ qa_target_ksf: 4, b_ft: 3, d_ft: 0 });
  within(narrow.kd, 1, 1e-9, "a surface footing gets no depth credit");
  within(narrow.n60, 16, 1e-9, "4 ksf / 0.25 ksf per blow");
  assert.equal(narrow.small_footing, true);
  // Kd saturates at 1.33, which is 1 + 0.33 D/B at D/B = 1: deeper buys nothing.
  const atCap = computeSptRequiredN60({ qa_target_ksf: 4, b_ft: 3, d_ft: 3 });
  const deeper = computeSptRequiredN60({ qa_target_ksf: 4, b_ft: 3, d_ft: 30 });
  within(atCap.kd, 1.33, 1e-9, "Kd at D = B");
  within(deeper.kd, 1.33, 1e-9, "Kd capped");
  within(deeper.n60, 16 / 1.33, 1e-9, "the capped credit");
});

test("required N60: blows scale with the pressure asked for and ease with embedment", () => {
  const one = computeSptRequiredN60({ qa_target_ksf: 3, b_ft: 8, d_ft: 4 });
  const two = computeSptRequiredN60({ qa_target_ksf: 6, b_ft: 8, d_ft: 4 });
  within(two.n60, one.n60 * 2, 1e-9, "twice the bearing, twice the blows");
  const shallow = computeSptRequiredN60({ qa_target_ksf: 3, b_ft: 8, d_ft: 0 });
  assert.ok(shallow.n60 > one.n60, "embedment reduces the blow count required");
  assert.ok(Number.isInteger(one.n60_design) && one.n60_design >= one.n60, "design value rounds up");
});

// ---- slope-stability-seepage: the infinite-slope closed form, hand-evaluated ----

const SSS_CASES = [
  { beta_deg: 18, phi_deg: 32, c_psf: 0, gamma_sat: 125, h_ft: 8 },
  { beta_deg: 26.57, phi_deg: 35, c_psf: 0, gamma_sat: 130, h_ft: 12 },
  { beta_deg: 20, phi_deg: 30, c_psf: 150, gamma_sat: 120, h_ft: 6 },
];

test("slope with seepage: for a cohesionless soil FS reduces to (gamma_b/gamma_sat)(tan phi / tan beta)", () => {
  // The depth and the slope length cancel out of the infinite-slope form when
  // c' = 0 -- so the factor of safety must be independent of H entirely.
  for (const c of SSS_CASES.filter((x) => x.c_psf === 0)) {
    const r = computeSlopeStabilitySeepage(c);
    const gamma_b = c.gamma_sat - 62.4;
    const want = (gamma_b / c.gamma_sat) * Math.tan(c.phi_deg * Math.PI / 180) / Math.tan(c.beta_deg * Math.PI / 180);
    within(r.fs_seep, want, 1e-9, "the cohesionless closed form");
    const deeper = computeSlopeStabilitySeepage({ ...c, h_ft: c.h_ft * 10 });
    within(deeper.fs_seep, r.fs_seep, 1e-9, "depth cancels when c' = 0");
  }
  // 18 deg slope, phi 32, 125 pcf: (62.6/125)(0.62487/0.32492) = 0.9631.
  within(computeSlopeStabilitySeepage(SSS_CASES[0]).fs_seep, 0.9631, 0.1, "hand-evaluated FS");
});

test("slope with seepage: the pore water cuts the friction term to the buoyant weight while the driving weight stays saturated", () => {
  for (const c of SSS_CASES) {
    const r = computeSlopeStabilitySeepage(c);
    const b = c.beta_deg * Math.PI / 180;
    // Driving shear on a slope-parallel plane: the full saturated weight resolved.
    within(r.driving_psf, c.gamma_sat * c.h_ft * Math.sin(b) * Math.cos(b), 1e-9, "driving shear");
    within(r.fs_seep, r.resisting_psf / r.driving_psf, 1e-9, "FS is resistance over demand");
    assert.ok(r.fs_seep < r.fs_dry, "seepage must lower the factor of safety");
    // For c' = 0 the ratio is exactly the buoyant-to-saturated unit weight ratio.
    if (c.c_psf === 0) within(r.fs_seep / r.fs_dry, (c.gamma_sat - 62.4) / c.gamma_sat, 1e-9, "the seepage penalty");
  }
});

test("slope with seepage: a slope at its friction angle is on the brink dry, and the verdict bands follow the number", () => {
  // The classic result: dry cohesionless, FS = tan phi / tan beta, so beta = phi gives 1.0.
  const atAngle = computeSlopeStabilitySeepage({ beta_deg: 30, phi_deg: 30, c_psf: 0, gamma_sat: 125, h_ft: 10 });
  within(atAngle.fs_dry, 1, 1e-9, "dry FS = 1 at the angle of repose");
  assert.ok(atAngle.fs_seep < 1, "and under seepage it slides");
  assert.ok(atAngle.verdict.includes("below 1.0"));
  const safe = computeSlopeStabilitySeepage({ beta_deg: 10, phi_deg: 36, c_psf: 0, gamma_sat: 130, h_ft: 8 });
  assert.ok(safe.fs_seep >= 1.5 && safe.verdict.includes("1.5"), "a flat slope holds");
  // Cohesion helps less as the failure plane deepens, so FS must fall with H.
  const shallow = computeSlopeStabilitySeepage({ ...SSS_CASES[2], h_ft: 3 });
  assert.ok(shallow.fs_seep > computeSlopeStabilitySeepage(SSS_CASES[2]).fs_seep, "cohesion is diluted with depth");
});

// ================================================================= lateral ==

// ---- shearwall-overturning: sum of moments about the toe ----

test("shear wall: moments about the toe balance -- V h = (0.6 - 0.14 SDS) W b/2 + T b", () => {
  // Statics by hand. V = 8,000 lb at h = 10 ft gives Mot = 80,000 lb-ft about
  // the toe. The dead load of 3,000 lb acts at mid-length, b/2 = 4 ft, and the
  // wind combination keeps 0.6 of it: Mr = 0.6 x 3,000 x 4 = 7,200 lb-ft. The
  // holdown at the heel carries the rest over the lever arm b:
  // T = (80,000 - 7,200) / 8 = 9,100 lb.
  const r = computeShearwallOverturning({ v_lb: 8000, b_ft: 8, h_ft: 10, w_lb: 3000, sds: 0 });
  within(r.mot_ftlb, 80000, 1e-9, "overturning moment");
  within(r.mr_ftlb, 7200, 1e-9, "resisting moment, W x b/2 at 0.6D");
  within(r.t_lb, 9100, 1e-9, "holdown tension");
  within(r.v_plf, 1000, 1e-9, "unit shear V/b");
  // And the balance closes: the three moments about the toe sum to zero.
  within(r.mr_ftlb + r.t_lb * 8, r.mot_ftlb, 1e-9, "sum of moments about the toe");
});

test("shear wall: the seismic combination takes dead load away -- (0.6 - 0.14 SDS) D, not 0.6 D", () => {
  // ASCE 7 2.4.5 combination 7 with Ev = 0.2 SDS D acting upward.
  for (const [sds, factor] of [[0, 0.6], [0.5, 0.53], [1.0, 0.46], [1.5, 0.39]]) {
    const r = computeShearwallOverturning({ v_lb: 8000, b_ft: 8, h_ft: 10, w_lb: 3000, sds });
    within(r.dead_factor, factor, 1e-9, `dead factor at SDS ${sds}`);
    within(r.mr_ftlb, factor * 3000 * 4, 1e-9, `resisting moment at SDS ${sds}`);
    within(r.t_lb, (80000 - factor * 3000 * 4) / 8, 1e-9, `holdown at SDS ${sds}`);
  }
  // A higher SDS can only make the holdown worse, never better.
  const low = computeShearwallOverturning({ v_lb: 8000, b_ft: 8, h_ft: 10, w_lb: 3000, sds: 0 });
  const high = computeShearwallOverturning({ v_lb: 8000, b_ft: 8, h_ft: 10, w_lb: 3000, sds: 1 });
  assert.ok(high.t_lb > low.t_lb, "more seismic, more uplift");
  // The factor cannot go negative however large SDS is.
  within(computeShearwallOverturning({ v_lb: 8000, b_ft: 8, h_ft: 10, w_lb: 3000, sds: 9 }).dead_factor, 0, 1e-9, "clamped at zero");
});

test("shear wall: a wall heavy enough to stabilize itself needs no holdown, and the aspect ratio drives the uplift", () => {
  // W b/2 x 0.6 >= V h: with V = 1,000, h = 10, b = 10, the dead load needed
  // is 2 V h / (0.6 b) = 20,000/6 = 3,333 lb. Above that, no tension.
  const heavy = computeShearwallOverturning({ v_lb: 1000, b_ft: 10, h_ft: 10, w_lb: 5000, sds: 0 });
  assert.equal(heavy.holdown_required, false);
  within(heavy.t_lb, 0, 1e-9, "uplift clamps at zero, never negative");
  assert.ok(heavy.mr_ftlb > heavy.mot_ftlb, "the dead load wins");
  const light = computeShearwallOverturning({ v_lb: 1000, b_ft: 10, h_ft: 10, w_lb: 3000, sds: 0 });
  assert.equal(light.holdown_required, true);
  // A narrow wall of the same shear and height has a much worse holdown.
  const narrow = computeShearwallOverturning({ v_lb: 2000, b_ft: 4, h_ft: 10, w_lb: 0, sds: 0 });
  const wide = computeShearwallOverturning({ v_lb: 2000, b_ft: 16, h_ft: 10, w_lb: 0, sds: 0 });
  within(narrow.t_lb, 2000 * 10 / 4, 1e-9, "T = V h / b with no dead load");
  within(narrow.t_lb / wide.t_lb, 4, 1e-9, "a quarter the length, four times the uplift");
});

// =================================================================== steel ==

// ---- composite-beam-flexure: a force couple, checked about two datums ----

const CBF_CASE = { as_in2: 8.0, fy_ksi: 50, d_in: 16, tslab_in: 4, be_in: 90, fc_ksi: 4 };

test("composite beam: the section is a force couple -- the concrete block carries exactly the steel's yield force", () => {
  const r = computeCompositeBeamFlexure(CBF_CASE);
  const T = CBF_CASE.as_in2 * CBF_CASE.fy_ksi;             // 400 kip
  within(r.c_kip, T, 1e-9, "C = T = As Fy");
  // The Whitney block must deliver that force at 0.85 f'c over be x a.
  within(0.85 * CBF_CASE.fc_ksi * CBF_CASE.be_in * r.a_in, T, 1e-9, "0.85 f'c be a = C");
  within(r.a_in, 400 / (0.85 * 4 * 90), 1e-9, "a = 1.307 in");
  assert.equal(r.pna_in_slab, true, "1.31 in of a 4 in slab: the PNA is in the slab");
});

test("composite beam: the nominal moment is the couple's moment, and it is the same about any datum", () => {
  // Measure from the top of the slab: T acts at tslab + d/2 = 12 in down,
  // C acts at a/2 = 0.654 in down. Mn = 400(12) - 400(0.654) = 4,538.6 kip-in
  // = 378.2 kip-ft. Measuring from the steel centroid instead must agree,
  // which is the test that C and T really are an equal and opposite pair.
  const r = computeCompositeBeamFlexure(CBF_CASE);
  const T = 400, a = r.a_in;
  const fromSlabTop = T * (4 + 16 / 2) - T * (a / 2);
  const fromSteelCentroid = T * ((4 + 16 / 2) - a / 2);
  within(fromSlabTop, fromSteelCentroid, 1e-9, "the couple's moment is datum-independent");
  within(r.mn_kipft, fromSlabTop / 12, 1e-9, "Mn in kip-ft");
  within(r.mn_kipft, 378.2, 0.1, "hand-computed 378 kip-ft");
  within(r.phi_mn_kipft, 0.90 * r.mn_kipft, 1e-9, "phi = 0.90 for a composite beam in flexure");
  within(r.phi_mn_kipft, 340.4, 0.1, "hand-computed 340 kip-ft");
});

test("composite beam: the method stands down when the block runs out of slab, and strength scales as it should", () => {
  // Same steel on a 3 in slab: a = 1.31 in still fits; on a 1 in slab it does not.
  const thin = computeCompositeBeamFlexure({ ...CBF_CASE, tslab_in: 1 });
  assert.equal(thin.pna_in_slab, false);
  assert.equal(thin.mn_kipft, null, "the PNA is in the steel -- the general method is needed");
  // A narrower effective width deepens the block; narrow enough and it breaks out.
  const narrow = computeCompositeBeamFlexure({ ...CBF_CASE, be_in: 20 });
  within(narrow.a_in, 400 / (0.85 * 4 * 20), 1e-9, "a = 5.88 in exceeds the 4 in slab");
  assert.equal(narrow.pna_in_slab, false);
  // Doubling the steel area doubles the force but less than doubles the moment,
  // because the deeper block shortens the lever arm.
  const twice = computeCompositeBeamFlexure({ ...CBF_CASE, as_in2: 16 });
  within(twice.c_kip, 2 * 400, 1e-9, "twice the force");
  assert.ok(twice.mn_kipft < 2 * computeCompositeBeamFlexure(CBF_CASE).mn_kipft, "a deeper block shortens the arm");
  // Raising the slab's f'c shortens the block and so lengthens the arm.
  const strong = computeCompositeBeamFlexure({ ...CBF_CASE, fc_ksi: 6 });
  assert.ok(strong.a_in < r0CbfA() && strong.mn_kipft > computeCompositeBeamFlexure(CBF_CASE).mn_kipft, "stronger slab, more moment");
});
const r0CbfA = () => computeCompositeBeamFlexure(CBF_CASE).a_in;

// ======================================================== soil properties ==

// ---- soil-relative-density: back through the void ratios it came from ----

const SRD_CASES = [
  { field_wet_pcf: 117.6, w_pct: 12, gamma_dmin_pcf: 90, gamma_dmax_pcf: 115 },
  { field_wet_pcf: 104, w_pct: 4, gamma_dmin_pcf: 88, gamma_dmax_pcf: 112 },
  { field_wet_pcf: 95, w_pct: 0, gamma_dmin_pcf: 85, gamma_dmax_pcf: 118 },
];

test("relative density: Dr computed the long way, through void ratios, matches -- for any specific gravity", () => {
  // Dr = (e_max - e)/(e_max - e_min) with e = Gs gamma_w / gamma_d - 1. The
  // dry-density form is only a shortcut; the void-ratio definition is the
  // reference, and the answer must not depend on Gs at all.
  for (const c of SRD_CASES) {
    const r = computeSoilRelativeDensity(c);
    for (const Gs of [2.60, 2.65, 2.72]) {
      const e = (gd) => Gs * 62.4 / gd - 1;
      const dr = (e(c.gamma_dmin_pcf) - e(r.gd_field_pcf)) / (e(c.gamma_dmin_pcf) - e(c.gamma_dmax_pcf));
      within(r.dr_pct, dr * 100, 1e-6, `Dr via void ratios at Gs = ${Gs}`);
    }
  }
});

test("relative density: the field dry density is the moisture backed out by mass balance", () => {
  for (const c of SRD_CASES) {
    const r = computeSoilRelativeDensity(c);
    // A cubic foot weighing gamma_wet is gamma_d of solids plus w% of that in water.
    within(r.gd_field_pcf * (1 + c.w_pct / 100), c.field_wet_pcf, 1e-9, "wet = dry + its own water");
  }
  within(computeSoilRelativeDensity(SRD_CASES[0]).gd_field_pcf, 105, 1e-9, "117.6 / 1.12 = 105 pcf");
  within(computeSoilRelativeDensity(SRD_CASES[0]).dr_pct, 65.71, 0.05, "hand-computed 65.7%");
});

test("relative density: the index densities anchor the scale at 0 and 100, and the Terzaghi-Peck bands follow", () => {
  // At the loosest index density Dr = 0; at the densest, Dr = 100.
  const loose = computeSoilRelativeDensity({ field_wet_pcf: 90, w_pct: 0, gamma_dmin_pcf: 90, gamma_dmax_pcf: 115 });
  const dense = computeSoilRelativeDensity({ field_wet_pcf: 115, w_pct: 0, gamma_dmin_pcf: 90, gamma_dmax_pcf: 115 });
  within(loose.dr_pct, 0, 1e-9, "Dr = 0 at the minimum index density");
  within(dense.dr_pct, 100, 1e-9, "Dr = 100 at the maximum index density");
  assert.equal(loose.out_of_range, false);
  assert.equal(dense.out_of_range, false);
  // Terzaghi-Peck descriptive bands: 0-15 very loose, 15-35 loose, 35-65
  // medium dense, 65-85 dense, 85-100 very dense.
  const bands = [[0.05, "very loose"], [0.25, "loose"], [0.50, "medium dense"], [0.75, "dense"], [0.95, "very dense"]];
  for (const [target, label] of bands) {
    // Solve the dry-density form for the gamma_d that gives this Dr.
    const gmin = 90, gmax = 115;
    const gd = gmin * gmax / (gmax - target * (gmax - gmin));
    const r = computeSoilRelativeDensity({ field_wet_pcf: gd, w_pct: 0, gamma_dmin_pcf: gmin, gamma_dmax_pcf: gmax });
    within(r.dr_pct, target * 100, 1e-6, `Dr at the ${label} band`);
    assert.equal(r.state, label, `${(target * 100).toFixed(0)}% should read ${label}`);
  }
  // A reading outside the laboratory index range is flagged, not quietly reported.
  const over = computeSoilRelativeDensity({ field_wet_pcf: 125, w_pct: 0, gamma_dmin_pcf: 90, gamma_dmax_pcf: 115 });
  assert.equal(over.above_max, true);
  assert.equal(over.out_of_range, true);
  assert.ok(over.dr_pct > 100, "and the number itself says so");
});
