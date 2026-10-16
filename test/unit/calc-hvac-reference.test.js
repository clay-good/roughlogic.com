// The HVAC / hydronic tiles against references the specs did not write. The
// worked-example fixture recomputes each spec's own example, so a spec and its
// tile that share an error agree with each other; these tests hold the tiles to
// conservation laws, to first-principles geometry and psychrometrics, and to
// published values the specs never cite.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFanMotorMaxAirflow, computeHeatPumpColdCapacity, computeCompressedAirPower,
  computeSnowmeltLoad, computeWallCondensationGradient, computeEconomizerEnthalpyChangeover,
} from "../../calc-hvac.js";
import {
  computeWindowSolarHeatGain, computeCoilFaceVelocity, computeRefractoryShellTemperature,
} from "../../calc-hvacsystems.js";
import { computeDrybulbFromEnthalpy, computeMoistAirEnthalpy } from "../../calc-hvacairside.js";
import { computeVacuumDecayTest } from "../../calc-hvacservice.js";
import { computeRefrigerantRecoveryTime } from "../../calc-refrigerant.js";
import { computePitotTraverseCfm } from "../../calc-velocity.js";
import {
  computeSolarThermalCollector, computeHeatTraceSizing, computePipePurgeVolume,
  computeHydronicSystemVolume, computePexHomerunTakeoff,
} from "../../calc-plumbingtakeoff.js";
import { computeBernoulliHead } from "../../calc-plumbing.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ---- fan-motor-max-airflow: the air power the motor has to supply ----

test("fan-motor-max-airflow: the airflow is the one that makes the air power equal the brake power", () => {
  // Air power from first principles, no 6356: one inch of water column is
  // 62.37 lb/ft^3 / 12 = 5.198 lb/ft^2, so a fan moving Q ft^3/min against TSP
  // inches does Q x 5.198 x TSP ft-lb/min, and 33,000 ft-lb/min is one hp.
  // BHP = that work / fan static efficiency.
  for (const c of [
    { power_hp: 1.936, power_basis: "brake", tsp_inwc: 2.0, eta_fan: 0.65, eta_drive: 1 },
    { power_hp: 7.5, power_basis: "brake", tsp_inwc: 3.5, eta_fan: 0.58, eta_drive: 1 },
    { power_hp: 0.5, power_basis: "brake", tsp_inwc: 0.75, eta_fan: 0.45, eta_drive: 1 },
  ]) {
    const r = computeFanMotorMaxAirflow(c);
    const air_power_hp = r.max_cfm * 5.198 * c.tsp_inwc / 33000;
    within(air_power_hp / c.eta_fan, c.power_hp, 0.3, "brake power closes on the air power");
  }
});

test("fan-motor-max-airflow: the fan laws hold -- airflow is linear in power and inverse in static", () => {
  const base = { power_hp: 5, power_basis: "brake", tsp_inwc: 2, eta_fan: 0.6, eta_drive: 1 };
  const r = computeFanMotorMaxAirflow(base);
  // At a fixed static, air power is proportional to flow, so twice the hp is twice the CFM.
  within(computeFanMotorMaxAirflow({ ...base, power_hp: 10 }).max_cfm / r.max_cfm, 2, 1e-9, "linear in power");
  // At a fixed power the product CFM x TSP is the constant.
  const r2 = computeFanMotorMaxAirflow({ ...base, tsp_inwc: 4 });
  within(r2.max_cfm * 4, r.max_cfm * 2, 1e-9, "CFM x TSP is the power");
  // A dirty filter raising the static cuts the airflow the motor can carry.
  assert.ok(r2.max_cfm < r.max_cfm, "airflow falls as the static rises");
});

test("fan-motor-max-airflow: a nameplate HP is the brake HP divided by the belt -- the two bases agree", () => {
  const d = 0.94;
  const motor = computeFanMotorMaxAirflow({ power_hp: 10, power_basis: "motor", tsp_inwc: 2.5, eta_fan: 0.62, eta_drive: d });
  const brake = computeFanMotorMaxAirflow({ power_hp: 10 * d, power_basis: "brake", tsp_inwc: 2.5, eta_fan: 0.62, eta_drive: 1 });
  within(motor.max_cfm, brake.max_cfm, 1e-9, "motor HP x drive efficiency is the brake HP");
  assert.ok(motor.max_cfm < computeFanMotorMaxAirflow({ power_hp: 10, power_basis: "brake", tsp_inwc: 2.5, eta_fan: 0.62, eta_drive: 1 }).max_cfm,
    "the belt loss costs airflow");
});

// ---- heat-pump-cold-capacity: the AHRI rating points are fixed anchors ----

test("heat-pump cold capacity: the interpolation passes through both AHRI rating points", () => {
  // A straight line through (17, cap_17) and (47, cap_47) must return each
  // rated capacity at its own rating temperature, and their mean at 32 F.
  const c = { cap_47_btuh: 36000, cap_17_btuh: 22000, design_load_btuh: 30000 };
  within(computeHeatPumpColdCapacity({ ...c, design_temp_f: 47 }).cap_design, 36000, 1e-9, "the 47 F point");
  within(computeHeatPumpColdCapacity({ ...c, design_temp_f: 17 }).cap_design, 22000, 1e-9, "the 17 F point");
  within(computeHeatPumpColdCapacity({ ...c, design_temp_f: 32 }).cap_design, 29000, 1e-9, "the midpoint is the mean");
});

test("heat-pump cold capacity: the shortfall closes and the aux heat is that shortfall in kW", () => {
  // 1 kW = 3,412 Btu/h (the published electrical-to-thermal equivalent).
  for (const t of [-10, 0, 5, 20, 40]) {
    const r = computeHeatPumpColdCapacity({ cap_47_btuh: 36000, cap_17_btuh: 22000, design_temp_f: t, design_load_btuh: 30000 });
    within(r.cap_design + r.shortfall, Math.max(30000, r.cap_design), 1e-9, "capacity plus shortfall meets the load");
    within(r.aux_kw * 3412, r.shortfall, 1e-9, "aux kW is the shortfall at 3,412 Btu/h per kW");
    assert.equal(r.covers, r.shortfall === 0);
  }
});

test("heat-pump cold capacity: capacity falls monotonically as the outdoor air gets colder", () => {
  let last = Infinity;
  for (const t of [40, 30, 20, 10, 0, -10, -20]) {
    const cap = computeHeatPumpColdCapacity({ cap_47_btuh: 36000, cap_17_btuh: 22000, design_temp_f: t, design_load_btuh: 30000 }).cap_design;
    assert.ok(cap <= last, `capacity must not rise as it cools: ${t} F gave ${cap}`);
    assert.ok(cap >= 0, "capacity is never negative");
    last = cap;
  }
});

// ---- compressed-air-power: the thermodynamic bounds ----

test("compressed air power: the adiabatic work sits above the isothermal bound and below the ideal-gas ceiling", () => {
  // Isothermal (perfectly intercooled) work is the thermodynamic floor:
  // W = P1 V ln(P2/P1). hp = 144 x P1(psia) x Q(cfm) x ln(r) / 33,000.
  for (const c of [
    { free_air_cfm: 100, inlet_psia: 14.7, discharge_psig: 100, overall_eff: 0.75, run_hours: 4000, rate_kwh: 0.1 },
    { free_air_cfm: 450, inlet_psia: 14.7, discharge_psig: 60, overall_eff: 0.8, run_hours: 2000, rate_kwh: 0.09 },
    { free_air_cfm: 25, inlet_psia: 12.2, discharge_psig: 125, overall_eff: 0.7, run_hours: 6000, rate_kwh: 0.14 },
  ]) {
    const r = computeCompressedAirPower(c);
    const ratio = r.p2_abs / c.inlet_psia;
    const iso_hp = 144 * c.inlet_psia * c.free_air_cfm * Math.log(ratio) / 33000;
    assert.ok(r.theo_hp > iso_hp, `adiabatic ${r.theo_hp} must exceed isothermal ${iso_hp}`);
    // For k = 1.4 the adiabatic/isothermal ratio is modest at field pressures.
    assert.ok(r.theo_hp / iso_hp < 1.5, "the adiabatic penalty stays under 50% at these ratios");
  }
});

test("compressed air power: a 100 cfm, 100 psig plant lands on the published 22-24 bhp per 100 cfm", () => {
  // Compressed-air handbooks size a 100 psig rotary screw at roughly 22-24
  // brake hp per 100 acfm. The wire power divided by 0.746 is that figure.
  const r = computeCompressedAirPower({ free_air_cfm: 100, inlet_psia: 14.7, discharge_psig: 100, overall_eff: 0.75, run_hours: 4000, rate_kwh: 0.10 });
  const wire_hp = r.input_kw / 0.746;
  assert.ok(wire_hp > 20 && wire_hp < 26, `100 cfm at 100 psig should be ~22-24 hp at the wire, got ${wire_hp}`);
  // Energy and cost are the straight product of power, hours and rate.
  within(r.annual_kwh, r.input_kw * 4000, 1e-9, "annual kWh");
  within(r.annual_cost, r.annual_kwh * 0.10, 1e-9, "annual cost");
});

test("compressed air power: gauge pressure is referenced to the LOCAL atmosphere, so altitude costs work", () => {
  // At 5,000 ft the barometer is about 12.2 psia. Holding 100 psig there is a
  // higher compression RATIO than at sea level, so the ratio must rise even
  // though the inlet pressure (and with it the mass flow) is lower.
  const sea = computeCompressedAirPower({ free_air_cfm: 100, inlet_psia: 14.7, discharge_psig: 100, overall_eff: 0.75, run_hours: 1, rate_kwh: 0 });
  const alt = computeCompressedAirPower({ free_air_cfm: 100, inlet_psia: 12.2, discharge_psig: 100, overall_eff: 0.75, run_hours: 1, rate_kwh: 0 });
  within(alt.p2_abs, 112.2, 1e-9, "psig is above the local barometer");
  assert.ok(alt.p2_abs / 12.2 > sea.p2_abs / 14.7, "the compression ratio is higher at altitude");
});

// ---- snowmelt-load: the component coefficients are a mass-and-energy balance ----

test("snowmelt load: the 746 and 2.6 coefficients are the latent and sensible heat of the falling snow", () => {
  // 1 in/hr of water equivalent over a square foot is 62.4 lb/ft^3 / 12
  // = 5.2 lb/hr-ft^2. Melting it takes the 143.4 Btu/lb heat of fusion
  // (5.2 x 143.4 = 746 Btu/hr-ft^2), and warming the snow to 32 F takes the
  // 0.5 Btu/lb-F specific heat of ice (5.2 x 0.5 = 2.6 per degree below 32).
  const lb_per_hr_ft2 = 62.4 / 12;
  for (const s of [0.05, 0.1, 0.35]) {
    for (const ta of [31, 20, 0, -15]) {
      const r = computeSnowmeltLoad({ s_inhr: s, t_air_f: ta, wind_mph: 0, rh_pct: 0, ar: 0, area_ft2: 100, back_loss_pct: 0 });
      within(r.q_m, s * lb_per_hr_ft2 * 143.4, 0.1, "latent melt load");
      within(r.q_s, s * lb_per_hr_ft2 * 0.5 * (32 - ta), 0.1, "sensible load warming the snow to 32 F");
      // With A_r = 0 the surface flux is exactly the snow's own heat demand.
      within(r.q_o, r.q_s + r.q_m, 1e-9, "A_r = 0 drops the convection and evaporation terms");
    }
  }
});

test("snowmelt load: the boiler output is the flux over the slab grossed up for the back loss", () => {
  const c = { s_inhr: 0.1, t_air_f: 20, wind_mph: 10, rh_pct: 80, ar: 0.5, area_ft2: 500, back_loss_pct: 20 };
  const r = computeSnowmeltLoad(c);
  within(r.boiler_btu_hr, r.q_o * 500 * 1.2, 1e-9, "flux x area x (1 + back loss)");
  within(r.mbh * 1000, r.boiler_btu_hr, 1e-9, "MBH is thousands of Btu/hr");
  // A slab twice the size needs twice the boiler; the flux is per unit area.
  const big = computeSnowmeltLoad({ ...c, area_ft2: 1000 });
  within(big.boiler_btu_hr / r.boiler_btu_hr, 2, 1e-9, "linear in area");
  within(big.q_o, r.q_o, 1e-9, "flux independent of area");
  // A_r weights the convection and evaporation terms, nothing else.
  const cls1 = computeSnowmeltLoad({ ...c, ar: 0 });
  const cls3 = computeSnowmeltLoad({ ...c, ar: 1 });
  within(cls3.q_o - cls1.q_o, r.q_h + r.q_e, 1e-9, "A_r spans exactly q_h + q_e");
  within(r.q_o, (cls1.q_o + cls3.q_o) / 2, 1e-9, "A_r = 0.5 is the midpoint");
});

// ---- wall-condensation-gradient: series conduction and a published dew point ----

test("wall condensation: the drop across each side is proportional to its R and the flux matches", () => {
  for (const c of [
    { r_inside: 13.5, r_outside: 4, t_in_f: 70, t_out_f: 20, rh_in_pct: 40 },
    { r_inside: 3, r_outside: 20, t_in_f: 68, t_out_f: -5, rh_in_pct: 35 },
    { r_inside: 11, r_outside: 11, t_in_f: 72, t_out_f: 32, rh_in_pct: 50 },
  ]) {
    const r = computeWallCondensationGradient(c);
    const flux_in = (c.t_in_f - r.t_plane_f) / c.r_inside;
    const flux_out = (r.t_plane_f - c.t_out_f) / c.r_outside;
    within(flux_in, flux_out, 1e-9, "the same heat passes through both sides");
    within(flux_in, (c.t_in_f - c.t_out_f) / (c.r_inside + c.r_outside), 1e-9, "flux is the total drop over the total R");
  }
  // Equal R on both sides puts the plane exactly halfway.
  within(computeWallCondensationGradient({ r_inside: 11, r_outside: 11, t_in_f: 72, t_out_f: 32, rh_in_pct: 50 }).t_plane_f, 52, 1e-9, "equal R, midpoint");
});

test("wall condensation: the indoor dew point matches the published psychrometric values", () => {
  // ASHRAE psychrometric chart, sea level: 70 F at 40% RH dews at about 44.2 F;
  // 70 F at 50% at about 50.5 F; saturated air dews at its own dry-bulb.
  const dp = (t, rh) => computeWallCondensationGradient({ r_inside: 10, r_outside: 10, t_in_f: t, t_out_f: 0, rh_in_pct: rh }).t_dew_f;
  within(dp(70, 40), 44.2, 1.5, "70 F / 40%");
  within(dp(70, 50), 50.5, 1.5, "70 F / 50%");
  within(dp(80, 60), 65.2, 1.5, "80 F / 60%");
  within(dp(70, 100), 70, 0.5, "saturated air dews at the dry-bulb");
});

test("wall condensation: exterior insulation warms the plane, which is the whole point of the ratio rule", () => {
  const base = { r_inside: 13.5, r_outside: 1, t_in_f: 70, t_out_f: 40, rh_in_pct: 45 };
  const bare = computeWallCondensationGradient(base);
  const ci = computeWallCondensationGradient({ ...base, r_outside: 6 });
  assert.ok(ci.t_plane_f > bare.t_plane_f, "continuous exterior insulation raises the sheathing temperature");
  assert.ok(bare.condensing && !ci.condensing, "and carries the sheathing from wet to dry");
  within(ci.margin_f, ci.t_plane_f - ci.t_dew_f, 1e-9, "margin is plane less dew point");
});

// ---- economizer-enthalpy-changeover: the control logic, checked against real air states ----

test("economizer: a cool but humid outdoor state carries MORE total heat than a warm dry return", () => {
  // Two real air states, enthalpies from the ASHRAE moist-air relation (the
  // separate moist-air-enthalpy tile, not this one's arithmetic):
  // 65 F / W = 0.0120 outdoor against 78 F / W = 0.0065 return.
  const h_oa = computeMoistAirEnthalpy({ t_db_f: 65, w_lb_lb: 0.0120 }).h;
  const h_ra = computeMoistAirEnthalpy({ t_db_f: 78, w_lb_lb: 0.0065 }).h;
  assert.ok(h_oa > h_ra, "the cool humid air is the heavier one");
  const enth = computeEconomizerEnthalpyChangeover({ mode: "differential_enthalpy", h_outdoor: h_oa, h_return: h_ra });
  assert.equal(enth.enable, false, "differential enthalpy locks that air out");
  // The dry-bulb control, blind to moisture, would have opened the damper.
  const db = computeEconomizerEnthalpyChangeover({ mode: "fixed_drybulb", t_outdoor_f: 65, setpoint_f: 70 });
  assert.equal(db.enable, true, "a 65 F dry-bulb is under a 70 F high limit");
});

test("economizer: the combined 90.1 control is the AND of the two limits, each on its own", () => {
  const run = (h_oa, h_ra, toa, sp) => computeEconomizerEnthalpyChangeover({ mode: "differential_enthalpy_drybulb", h_outdoor: h_oa, h_return: h_ra, t_outdoor_f: toa, setpoint_f: sp });
  for (const [h_oa, h_ra, toa, sp, want] of [
    [24, 28, 70, 75, true],   // both limits met
    [30, 28, 70, 75, false],  // enthalpy fails
    [24, 28, 80, 75, false],  // dry-bulb fails
    [30, 28, 80, 75, false],  // both fail
  ]) {
    const r = run(h_oa, h_ra, toa, sp);
    assert.equal(r.enable, want, `hOA ${h_oa} hRA ${h_ra} TOA ${toa} SP ${sp}`);
    assert.equal(r.enable, r.enth_ok && r.db_ok, "enable is the conjunction");
  }
  // Equality economizes at both limits -- the code shuts off only when exceeded.
  assert.equal(run(28, 28, 75, 75).enable, true, "equality is not an exceedance");
  assert.equal(computeEconomizerEnthalpyChangeover({ mode: "differential_enthalpy", h_outdoor: 28, h_return: 28 }).enable, true, "equal enthalpies still economize");
  assert.equal(computeEconomizerEnthalpyChangeover({ mode: "fixed_drybulb", t_outdoor_f: 65, setpoint_f: 65 }).enable, true, "at the setpoint is not above it");
});

// ---- window-solar-heat-gain: superposition of two independent load paths ----

test("window solar: the conduction term is the plain UA x deltaT every other load method uses", () => {
  const c = { area_ft2: 40, shgc: 0.30, psf: 200, u_factor: 0.30, cltd_f: 14 };
  const r = computeWindowSolarHeatGain(c);
  within(r.q_cond, 40 * 0.30 * 14, 1e-9, "UA deltaT = 168 Btu/h");
  within(r.q_total, r.q_solar + r.q_cond, 1e-9, "the two paths superpose");
  // Each path isolates cleanly when the other's driver is zero.
  within(computeWindowSolarHeatGain({ ...c, shgc: 0 }).q_total, r.q_cond, 1e-9, "no SHGC, conduction only");
  within(computeWindowSolarHeatGain({ ...c, cltd_f: 0 }).q_total, r.q_solar, 1e-9, "no CLTD, solar only");
});

test("window solar: both terms are linear in area, and a cool outdoor hour makes the conduction a loss", () => {
  const c = { area_ft2: 40, shgc: 0.30, psf: 200, u_factor: 0.30, cltd_f: 14 };
  const r = computeWindowSolarHeatGain(c);
  const r3 = computeWindowSolarHeatGain({ ...c, area_ft2: 120 });
  for (const k of ["q_solar", "q_cond", "q_total"]) within(r3[k] / r[k], 3, 1e-9, `${k} linear in area`);
  const cool = computeWindowSolarHeatGain({ ...c, cltd_f: -10 });
  assert.ok(cool.q_cond < 0, "a negative CLTD is heat leaving through the glass");
  within(cool.q_total, cool.q_solar + cool.q_cond, 1e-9, "the loss offsets the solar gain");
});

// ---- coil-face-velocity: continuity, with the area from first geometry ----

test("coil face velocity: continuity holds -- velocity times face area returns the airflow", () => {
  for (const c of [
    { cfm: 2000, face_width_in: 24, face_height_in: 18 },
    { cfm: 8000, face_width_in: 60, face_height_in: 36 },
    { cfm: 400, face_width_in: 12, face_height_in: 10 },
  ]) {
    const r = computeCoilFaceVelocity(c);
    within(r.face_velocity_fpm * r.face_area_ft2, c.cfm, 1e-9, "Q = V A");
    within(r.face_area_ft2, c.face_width_in * c.face_height_in / 144, 1e-9, "144 square inches to the square foot");
  }
  // 24 x 18 in is exactly 3 ft^2, so 2,000 cfm is 666.7 fpm by hand.
  within(computeCoilFaceVelocity({ cfm: 2000, face_width_in: 24, face_height_in: 18 }).face_velocity_fpm, 2000 / 3, 1e-9, "hand check");
});

test("coil face velocity: a bigger face slows the air, and the carryover flag turns at the threshold", () => {
  const r = computeCoilFaceVelocity({ cfm: 2000, face_width_in: 24, face_height_in: 18 });
  const bigger = computeCoilFaceVelocity({ cfm: 2000, face_width_in: 48, face_height_in: 18 });
  within(bigger.face_velocity_fpm * 2, r.face_velocity_fpm, 1e-9, "twice the face, half the velocity");
  // 3 ft^2 at 1,500 cfm is exactly 500 fpm: at the limit, not over it.
  assert.equal(computeCoilFaceVelocity({ cfm: 1500, face_width_in: 24, face_height_in: 18 }).carryover, false, "500 fpm exactly is not over");
  assert.equal(computeCoilFaceVelocity({ cfm: 1501, face_width_in: 24, face_height_in: 18 }).carryover, true, "just over is over");
});

// ---- refractory-shell-temperature: series resistances and the hotter-inside trap ----

const REFRACTORY = {
  hot_face_f: 2100, ambient_f: 90, film_coeff_btu_hr_ft2_f: 2.0, film_mode: "entered",
  layer1_thickness_in: 4.5, layer1_k: 8.5, layer1_limit_f: 3000,
  layer2_thickness_in: 2.5, layer2_k: 1.9, layer2_limit_f: 2000,
  layer3_thickness_in: 2.0, layer3_k: 0.55, layer3_limit_f: 1200,
  shell_limit_f: 140, acid_dew_point_f: 0,
};

test("refractory shell: the same flux passes through every layer and the film", () => {
  const r = computeRefractoryShellTemperature(REFRACTORY);
  const drops = [
    { dt: REFRACTORY.hot_face_f - r.interface1_f, R: 4.5 / 8.5 },
    { dt: r.interface1_f - r.interface2_f, R: 2.5 / 1.9 },
    { dt: r.interface2_f - r.interface3_f, R: 2.0 / 0.55 },
    { dt: r.shell_temp_f - REFRACTORY.ambient_f, R: 1 / 2.0 },
  ];
  for (const d of drops) within(d.dt / d.R, r.flux_btu_hr_ft2, 1e-7, "flux through each resistance");
  within(drops.reduce((a, d) => a + d.dt, 0), REFRACTORY.hot_face_f - REFRACTORY.ambient_f, 1e-7, "the drops sum to the total");
  within(r.total_resistance, 4.5 / 8.5 + 2.5 / 1.9 + 2.0 / 0.55 + 0.5, 1e-9, "resistances add in series");
  // The last interface is the shell: the back of layer 3 is the steel.
  within(r.interface3_f, r.shell_temp_f, 1e-7, "the back of the last layer is the shell");
});

test("refractory shell: insulating the OUTSIDE makes the inside hotter -- the failure this tile exists to catch", () => {
  const two = computeRefractoryShellTemperature({ ...REFRACTORY, layer3_thickness_in: 0 });
  const three = computeRefractoryShellTemperature(REFRACTORY);
  assert.ok(three.flux_btu_hr_ft2 < two.flux_btu_hr_ft2, "less heat escapes with the added block");
  assert.ok(three.interface1_f > two.interface1_f, "and every interface behind the hot face runs hotter");
  assert.ok(three.interface2_f > two.interface2_f, "including the backup layer");
  assert.ok(three.shell_temp_f < two.shell_temp_f, "while the shell itself runs cooler");
  // A layer's limit is checked at its HOT face, not the cooler side behind it.
  const cooked = computeRefractoryShellTemperature({ ...REFRACTORY, layer2_limit_f: 1500 });
  assert.ok(cooked.layer2_hot_face_f > 1500 && cooked.any_interface_over, "a hot face above its service limit is flagged");
});

test("refractory shell: a better film coefficient cools the shell but barely moves the flux", () => {
  const h2 = computeRefractoryShellTemperature(REFRACTORY);
  const h6 = computeRefractoryShellTemperature({ ...REFRACTORY, film_coeff_btu_hr_ft2_f: 6.0 });
  within(h6.film_resistance, 1 / 6, 1e-9, "film resistance is 1/h");
  assert.ok(h6.shell_temp_f < h2.shell_temp_f, "a stronger film pulls the shell toward ambient");
  assert.ok(h6.flux_btu_hr_ft2 > h2.flux_btu_hr_ft2, "and lets slightly more heat out");
  // The film is a small part of 5.3 hr-ft^2-F/BTU, so the flux hardly changes.
  within(h6.flux_btu_hr_ft2, h2.flux_btu_hr_ft2, 12, "the lining, not the film, governs");
});

// ---- drybulb-from-enthalpy: the psychrometric round trip ----

test("drybulb from enthalpy: the round trip through moist-air-enthalpy returns the dry-bulb it started at", () => {
  for (const [t, w] of [[80, 0.0112], [55, 0.0070], [95, 0.0200], [32, 0.0], [105, 0.0280]]) {
    const h = computeMoistAirEnthalpy({ t_db_f: t, w_lb_lb: w }).h;
    const back = computeDrybulbFromEnthalpy({ enthalpy_btu: h, w_lb_lb: w });
    within(back.t_db_f, t, 1e-7, `round trip at ${t} F, W ${w}`);
    within(back.h_sensible + back.h_latent, h, 1e-9, "the split closes on the enthalpy");
  }
});

test("drybulb from enthalpy: dry air is just the 0.240 Btu/lb-F specific heat", () => {
  // With no moisture the relation collapses to h = 0.240 t, so 24 Btu/lb is 100 F.
  within(computeDrybulbFromEnthalpy({ enthalpy_btu: 24, w_lb_lb: 0 }).t_db_f, 100, 1e-9, "dry air");
  within(computeDrybulbFromEnthalpy({ enthalpy_btu: 0, w_lb_lb: 0 }).t_db_f, 0, 1e-9, "zero enthalpy is 0 F dry air");
  // At a fixed W, enthalpy rises with temperature -- the inverse is monotonic.
  let last = -Infinity;
  for (const h of [10, 20, 30, 40, 50]) {
    const t = computeDrybulbFromEnthalpy({ enthalpy_btu: h, w_lb_lb: 0.010 }).t_db_f;
    assert.ok(t > last, "monotonic in enthalpy");
    last = t;
  }
});

// ---- vacuum-decay-test: the rise rate and the pass criterion ----

test("vacuum decay: the rate is the rise per minute and reconstructs the hold", () => {
  for (const c of [
    { start_micron: 300, end_micron: 450, hold_min: 15, pass_ceiling_micron: 500 },
    { start_micron: 250, end_micron: 2500, hold_min: 10, pass_ceiling_micron: 500 },
    { start_micron: 400, end_micron: 400, hold_min: 30, pass_ceiling_micron: 500 },
  ]) {
    const r = computeVacuumDecayTest(c);
    within(r.rise_micron, c.end_micron - c.start_micron, 1e-9, "rise");
    within(r.rate_micron_per_min * c.hold_min, r.rise_micron, 1e-9, "rate x hold is the rise");
    // Twice the hold over the same endpoints is half the rate.
    const slower = computeVacuumDecayTest({ ...c, hold_min: c.hold_min * 2 });
    within(slower.rate_micron_per_min * 2, r.rate_micron_per_min, 1e-9, "rate is per minute");
    within(slower.rise_micron, r.rise_micron, 1e-9, "the rise does not depend on the clock");
  }
});

test("vacuum decay: the verdict turns on the level reached, not on how fast it got there", () => {
  // 500 microns is the ANSI/ACCA 5 QI evacuation ceiling: at it, pass.
  const at = computeVacuumDecayTest({ start_micron: 200, end_micron: 500, hold_min: 15 });
  const over = computeVacuumDecayTest({ start_micron: 200, end_micron: 501, hold_min: 15 });
  assert.ok(/ok to charge/.test(at.verdict), "500 exactly holds");
  assert.ok(/not ready/.test(over.verdict), "501 does not");
  // A slow creep that ends high fails; a fast rise that ends low passes.
  assert.ok(/not ready/.test(computeVacuumDecayTest({ start_micron: 300, end_micron: 900, hold_min: 120 }).verdict), "slow but high");
  assert.ok(/ok to charge/.test(computeVacuumDecayTest({ start_micron: 100, end_micron: 480, hold_min: 2 }).verdict), "fast but low");
  // A deepening vacuum with the pump valved off is physically impossible.
  assert.ok(computeVacuumDecayTest({ start_micron: 500, end_micron: 300, hold_min: 10 }).error, "a falling reading is rejected");
});

// ---- refrigerant-recovery-time: the mass balance across the two phases ----

test("refrigerant recovery: every pound of charge is accounted for at its own phase rate", () => {
  for (const c of [
    { total_charge_lb: 45, liquid_charge_lb: 30, liquid_rate_lb_min: 8, vapor_rate_lb_min: 3, evacuation_min: 10, cylinder_net_lb: 40.4 },
    { total_charge_lb: 200, liquid_charge_lb: 170, liquid_rate_lb_min: 8, vapor_rate_lb_min: 3, evacuation_min: 20, cylinder_net_lb: 40.4 },
    { total_charge_lb: 12, liquid_charge_lb: 0, liquid_rate_lb_min: 8, vapor_rate_lb_min: 2.5, evacuation_min: 0, cylinder_net_lb: 0 },
  ]) {
    const r = computeRefrigerantRecoveryTime(c);
    const lb_moved = r.liquid_min * c.liquid_rate_lb_min + r.vapor_min * c.vapor_rate_lb_min;
    within(lb_moved, c.total_charge_lb, 1e-9, "mass balance: pounds moved equal the charge");
    within(r.total_min, r.recovery_min + c.evacuation_min, 1e-9, "evacuation is the tail");
    within(r.all_vapor_min * c.vapor_rate_lb_min, c.total_charge_lb, 1e-9, "the all-vapor comparison moves the same charge");
    within(r.speedup_factor * r.recovery_min, r.all_vapor_min, 1e-9, "speed-up is the ratio of the two times");
    within(r.minutes_saved, r.all_vapor_min - r.recovery_min, 1e-9, "minutes saved");
  }
});

test("refrigerant recovery: an all-vapor job saves nothing, and a bigger charge saves proportionally more", () => {
  const allVapor = computeRefrigerantRecoveryTime({ total_charge_lb: 30, liquid_charge_lb: 0, liquid_rate_lb_min: 8, vapor_rate_lb_min: 3, evacuation_min: 0, cylinder_net_lb: 0 });
  within(allVapor.speedup_factor, 1, 1e-9, "no liquid, no speed-up");
  within(allVapor.minutes_saved, 0, 1e-9, "and nothing saved");
  // Scaling the whole job scales every time linearly; the speed-up is a ratio.
  const small = computeRefrigerantRecoveryTime({ total_charge_lb: 45, liquid_charge_lb: 30, liquid_rate_lb_min: 8, vapor_rate_lb_min: 3, evacuation_min: 0, cylinder_net_lb: 0 });
  const big = computeRefrigerantRecoveryTime({ total_charge_lb: 90, liquid_charge_lb: 60, liquid_rate_lb_min: 8, vapor_rate_lb_min: 3, evacuation_min: 0, cylinder_net_lb: 0 });
  within(big.recovery_min / small.recovery_min, 2, 1e-9, "linear in charge at a fixed liquid fraction");
  within(big.speedup_factor, small.speedup_factor, 1e-9, "the ratio is scale-free at a fixed fraction");
  // Cylinders: a 45 lb charge into 40.4 lb jugs is two; an exact fit is one.
  assert.equal(computeRefrigerantRecoveryTime({ total_charge_lb: 45, liquid_charge_lb: 0, liquid_rate_lb_min: 8, vapor_rate_lb_min: 3, evacuation_min: 0, cylinder_net_lb: 40.4 }).cylinders, 2);
  assert.equal(computeRefrigerantRecoveryTime({ total_charge_lb: 40.4, liquid_charge_lb: 0, liquid_rate_lb_min: 8, vapor_rate_lb_min: 3, evacuation_min: 0, cylinder_net_lb: 40.4 }).cylinders, 1);
});

// ---- pitot-traverse-cfm: the pitot velocity straight from Bernoulli ----

test("pitot traverse: the velocity is Bernoulli's, not a memorized 4005", () => {
  // VP in inches of water is a pressure: 62.37 lb/ft^3 / 12 = 5.198 lb/ft^2
  // per inch. From VP = rho V^2 / 2g_c, V(ft/s) = sqrt(2 x 32.174 x p / rho),
  // and 60 s/min converts to fpm. No 4005 anywhere.
  for (const [vp, rho] of [[0.15, 0.075], [0.02, 0.075], [1.2, 0.075], [0.15, 0.060], [0.40, 0.095]]) {
    const r = computePitotTraverseCfm({ vp_avg_inwc: vp, w_in: 24, h_in: 12, air_density_lb_ft3: rho });
    const p_psf = vp * (62.37 / 12);
    const v_fpm = Math.sqrt(2 * 32.174 * p_psf / rho) * 60;
    within(r.v_fpm, v_fpm, 0.3, `velocity at VP ${vp}, rho ${rho}`);
  }
});

test("pitot traverse: velocity goes as the square root of VP and the inverse root of density", () => {
  const base = { vp_avg_inwc: 0.15, w_in: 24, h_in: 12, air_density_lb_ft3: 0.075 };
  const r = computePitotTraverseCfm(base);
  // Four times the VP is twice the velocity -- the square root, not a factor of 4.
  within(computePitotTraverseCfm({ ...base, vp_avg_inwc: 0.60 }).v_fpm / r.v_fpm, 2, 1e-9, "sqrt in VP");
  // Thin air at altitude reads a lower VP for the same velocity, so K rises as 1/sqrt(rho).
  const thin = computePitotTraverseCfm({ ...base, air_density_lb_ft3: 0.0375 });
  within(thin.v_fpm / r.v_fpm, Math.SQRT2, 1e-9, "half the density, root-two the velocity");
  // Continuity closes: CFM is the velocity over the duct's own area.
  within(r.area_ft2, 24 * 12 / 144, 1e-9, "2 ft^2 of duct");
  within(r.cfm, r.v_fpm * r.area_ft2, 1e-9, "Q = V A");
});

// ---- solar-thermal-collector: the Hottel-Whillier-Bliss line, by its endpoints ----

test("solar thermal: at inlet equal to ambient the efficiency IS the optical intercept", () => {
  // The y-intercept of the ASHRAE 93 line is by definition the efficiency when
  // the fluid runs at air temperature, whatever the sun is doing.
  for (const g of [150, 300, 420]) {
    const r = computeSolarThermalCollector({ optical_efficiency: 0.70, loss_coeff: 0.85, inlet_temp_f: 70, ambient_temp_f: 70, irradiance_btu: g, area_sqft: 40 });
    within(r.efficiency, 0.70, 1e-9, `intercept at ${g} Btu/hr-ft^2`);
    within(r.useful_btu_hr, g * 0.70 * 40, 1e-9, "output is irradiance x efficiency x area");
  }
});

test("solar thermal: the line depends only on the reduced temperature (Ti - Ta)/G", () => {
  // Same x-coordinate, same efficiency: the defining property of the HWB line.
  const a = computeSolarThermalCollector({ optical_efficiency: 0.70, loss_coeff: 0.85, inlet_temp_f: 120, ambient_temp_f: 70, irradiance_btu: 300, area_sqft: 40 });
  const b = computeSolarThermalCollector({ optical_efficiency: 0.70, loss_coeff: 0.85, inlet_temp_f: 170, ambient_temp_f: 70, irradiance_btu: 600, area_sqft: 40 });
  within(b.efficiency, a.efficiency, 1e-9, "(Ti - Ta)/G of 1/6 either way");
  // Stagnation: at (Ti - Ta)/G = intercept/slope the collector delivers nothing.
  const stag = computeSolarThermalCollector({ optical_efficiency: 0.70, loss_coeff: 0.85, inlet_temp_f: 70 + 0.70 / 0.85 * 300, ambient_temp_f: 70, irradiance_btu: 300, area_sqft: 40 });
  assert.ok(Math.abs(stag.efficiency) < 1e-12, `the stagnation point is the x-intercept: ${stag.efficiency}`);
  assert.ok(stag.useful_btu_hr < 1e-9, "and delivers nothing");
  // Past it the useful heat clamps at zero -- a collector does not pump heat out.
  const past = computeSolarThermalCollector({ optical_efficiency: 0.70, loss_coeff: 0.85, inlet_temp_f: 200, ambient_temp_f: 20, irradiance_btu: 150, area_sqft: 40 });
  assert.ok(past.efficiency < 0 && past.useful_btu_hr === 0, "no negative output");
});

test("solar thermal: an unglazed pool collector beats a glazed one near ambient and loses badly when hot", () => {
  // Published SRCC shapes: glazed flat plate ~0.70 / 0.85; unglazed ~0.90 / 3.5.
  const glazed = (dt) => computeSolarThermalCollector({ optical_efficiency: 0.70, loss_coeff: 0.85, inlet_temp_f: 70 + dt, ambient_temp_f: 70, irradiance_btu: 300, area_sqft: 1 });
  const unglazed = (dt) => computeSolarThermalCollector({ optical_efficiency: 0.90, loss_coeff: 3.5, inlet_temp_f: 70 + dt, ambient_temp_f: 70, irradiance_btu: 300, area_sqft: 1 });
  assert.ok(unglazed(5).useful_btu_per_sqft > glazed(5).useful_btu_per_sqft, "near ambient the unglazed panel wins");
  assert.ok(unglazed(60).useful_btu_per_sqft < glazed(60).useful_btu_per_sqft, "hot, it does not");
  assert.ok(unglazed(90).useful_btu_per_sqft === 0, "an unglazed panel stagnates early");
});

// ---- heat-trace-sizing: the power law and the NEC continuous-load rule ----

test("heat trace: watts, volts and amps close on each other, and the cable length is the run plus its heat sinks", () => {
  for (const c of [
    { pipe_ft: 150, allowance_pct: 10, num_valves: 1, valve_allow_ft: 3, rated_w_per_ft: 5, voltage: 120, breaker_a: 20, start_factor: 3 },
    { pipe_ft: 400, allowance_pct: 0, num_valves: 6, valve_allow_ft: 3, rated_w_per_ft: 8, voltage: 240, breaker_a: 30, start_factor: 2 },
  ]) {
    const r = computeHeatTraceSizing(c);
    within(r.amps * c.voltage, r.watts, 1e-9, "P = V I");
    within(r.watts / r.cable_ft, c.rated_w_per_ft, 1e-9, "the cable draws its rated W/ft");
    within(r.cable_ft, c.pipe_ft + c.pipe_ft * c.allowance_pct / 100 + c.num_valves * c.valve_allow_ft, 1e-9, "run + spiral allowance + heat sinks");
    within(r.start_amps, r.amps * c.start_factor, 1e-9, "the cold start is the running current times the multiple");
  }
});

test("heat trace: the NEC 80% continuous rule and the cold-start current are BOTH gates", () => {
  // 20 A breaker: the continuous limit is 16 A, and the cold start must still
  // sit inside 20 A. A circuit can pass one and fail the other.
  const at = (w) => computeHeatTraceSizing({ pipe_ft: 100, allowance_pct: 0, num_valves: 0, valve_allow_ft: 0, rated_w_per_ft: w, voltage: 120, breaker_a: 20, start_factor: 3 });
  within(at(19.2).amps, 16, 1e-9, "1,920 W on 120 V is exactly 16 A");
  assert.equal(at(19.2).breaker_ok, false, "16 A running is 48 A at a 3x cold start -- the start gate catches it");
  assert.equal(at(8).breaker_ok, true, "6.67 A running, 20 A starting -- both gates met");
  assert.equal(at(8.1).breaker_ok, false, "a hair more and the cold start exceeds the breaker");
  // Doubling the voltage halves the current for the same heat.
  const v120 = computeHeatTraceSizing({ pipe_ft: 150, allowance_pct: 0, num_valves: 0, valve_allow_ft: 0, rated_w_per_ft: 5, voltage: 120, breaker_a: 20, start_factor: 3 });
  const v240 = computeHeatTraceSizing({ pipe_ft: 150, allowance_pct: 0, num_valves: 0, valve_allow_ft: 0, rated_w_per_ft: 5, voltage: 240, breaker_a: 20, start_factor: 3 });
  within(v240.watts, v120.watts, 1e-9, "same heat either way");
  within(v240.amps * 2, v120.amps, 1e-9, "half the current at twice the volts");
});

// ---- pipe-purge-volume: the pipe's own geometry, against the published gal/ft ----

test("pipe purge: the pipe volume is the published gallons per foot of the same pipe", () => {
  // A foot of 1 in Schedule 40 (ID 1.049 in) holds 0.0449 gal, and a foot of
  // 2 in Schedule 40 (ID 2.067 in) holds 0.174 gal -- the pipe-data figures
  // every plumber's table prints. 7.48052 gal to the cubic foot.
  for (const [id, gal_per_ft] of [[1.049, 0.0449], [2.067, 0.174], [4.026, 0.661], [0.622, 0.0158]]) {
    const r = computePipePurgeVolume({ pipe_id_in: id, length_ft: 100, air_changes: 1, flow_scfh: 60 });
    within(r.pipe_volume_ft3 * 7.48052 / 100, gal_per_ft, 1, `${id} in ID`);
  }
});

test("pipe purge: the sweep is that volume over again, and the time is it at the meter's flow", () => {
  const c = { pipe_id_in: 2.067, length_ft: 100, air_changes: 5, flow_scfh: 60 };
  const r = computePipePurgeVolume(c);
  within(r.purge_volume_ft3, r.pipe_volume_ft3 * 5, 1e-9, "five volume changes");
  // scfh over 60 minutes to the hour: 60 scfh is 1 ft^3/min.
  within(r.purge_min, r.purge_volume_ft3 / 1.0, 1e-9, "60 scfh is a cubic foot a minute");
  within(computePipePurgeVolume({ ...c, flow_scfh: 120 }).purge_min * 2, r.purge_min, 1e-9, "twice the flow, half the time");
  // Volume goes as the square of the diameter, not the diameter.
  within(computePipePurgeVolume({ ...c, pipe_id_in: 4.134 }).pipe_volume_ft3 / r.pipe_volume_ft3, 4, 1e-9, "ID squared");
  within(computePipePurgeVolume({ ...c, length_ft: 300 }).pipe_volume_ft3 / r.pipe_volume_ft3, 3, 1e-9, "linear in length");
});

// ---- hydronic-system-volume: the fill splits, and the pipe gal/ft is real geometry ----

test("hydronic volume: the glycol and the water add back up to the system fill", () => {
  for (const c of [
    { pipe_length_ft: 500, gal_per_ft: 0.025, terminal_gal: 8, boiler_tank_gal: 5, glycol_fraction: 0.30 },
    { pipe_length_ft: 1800, gal_per_ft: 0.018, terminal_gal: 0, boiler_tank_gal: 40, glycol_fraction: 0.50 },
    { pipe_length_ft: 120, gal_per_ft: 0.045, terminal_gal: 3, boiler_tank_gal: 0, glycol_fraction: 0 },
  ]) {
    const r = computeHydronicSystemVolume(c);
    within(r.glycol_gal + r.water_gal, r.system_gal, 1e-9, "the mix closes");
    within(r.system_gal, r.pipe_gal + c.terminal_gal + c.boiler_tank_gal, 1e-9, "pipe + terminals + boiler");
    within(r.pipe_gal, c.pipe_length_ft * c.gal_per_ft, 1e-9, "the pipe holds its length times its gal/ft");
    if (r.system_gal > 0) within(r.glycol_gal / r.system_gal, c.glycol_fraction, 1e-9, "the fraction is of the whole fill");
  }
});

test("hydronic volume: the note's 0.025 gal/ft for 3/4 in Type L copper is the tube's own geometry", () => {
  // 3/4 in Type L has a 0.785 in ID: pi/4 x 0.785^2 / 144 ft^2 x 7.48052 gal/ft^3
  // = 0.0251 gal/ft. Filling 500 ft of it is about 12.6 gal.
  const geom_gal_per_ft = (Math.PI / 4) * Math.pow(0.785 / 12, 2) * 7.48052;
  within(geom_gal_per_ft, 0.025, 2, "the note's figure is the real tube volume");
  const r = computeHydronicSystemVolume({ pipe_length_ft: 500, gal_per_ft: geom_gal_per_ft, terminal_gal: 0, boiler_tank_gal: 0, glycol_fraction: 0 });
  within(r.system_gal, 12.6, 2, "500 ft of 3/4 Type L holds about 12.6 gal");
});

// ---- pex-homerun-takeoff: one line per fixture, counted two ways ----

test("PEX home run: the ports are one per cold fixture plus one per hot, counted separately", () => {
  for (const c of [
    { fixtures: 8, hot_fixtures: 6, avg_run_ft: 35, waste_pct: 10 },
    { fixtures: 14, hot_fixtures: 14, avg_run_ft: 48, waste_pct: 0 },
    { fixtures: 3, hot_fixtures: 0, avg_run_ft: 20, waste_pct: 25 },
  ]) {
    const r = computePexHomerunTakeoff(c);
    assert.equal(r.cold_ports, c.fixtures, "every fixture takes a cold line");
    assert.equal(r.hot_ports, c.hot_fixtures, "only the hot ones take a hot line");
    assert.equal(r.total_ports, r.cold_ports + r.hot_ports);
    // The footage summed run by run, then wasted, then rounded up to a whole foot.
    let runs = 0;
    for (let i = 0; i < c.fixtures; i++) runs += c.avg_run_ft;
    for (let i = 0; i < c.hot_fixtures; i++) runs += c.avg_run_ft;
    const want = Math.ceil(runs * (1 + c.waste_pct / 100) - 1e-9);
    assert.equal(r.tubing_lf, want, "tubing counted line by line");
    assert.ok(r.tubing_lf >= runs, "the waste allowance never shortens the order");
  }
});

test("PEX home run: a cold-only job is half the ports of an all-hot job, and the order rounds up", () => {
  const coldOnly = computePexHomerunTakeoff({ fixtures: 10, hot_fixtures: 0, avg_run_ft: 30, waste_pct: 0 });
  const allHot = computePexHomerunTakeoff({ fixtures: 10, hot_fixtures: 10, avg_run_ft: 30, waste_pct: 0 });
  assert.equal(allHot.total_ports, 2 * coldOnly.total_ports);
  assert.equal(allHot.tubing_lf, 2 * coldOnly.tubing_lf);
  // 14 ports x 35.5 ft = 497 ft exactly, so no spurious extra foot appears.
  assert.equal(computePexHomerunTakeoff({ fixtures: 8, hot_fixtures: 6, avg_run_ft: 35.5, waste_pct: 0 }).tubing_lf, 497);
  // A fractional total buys the next whole foot.
  assert.equal(computePexHomerunTakeoff({ fixtures: 1, hot_fixtures: 0, avg_run_ft: 10.2, waste_pct: 0 }).tubing_lf, 11);
});

// ---- bernoulli-head: energy conservation along a streamline ----

test("Bernoulli head: in a frictionless contraction the total head is conserved", () => {
  // Continuity through a 4 in to 2 in reducer quadruples the velocity; the
  // pressure that must accompany it comes from the energy equation, not from
  // the tile. If the tile's head is the real total head, H1 = H2.
  const gamma = 62.4, g = 32.2;
  const V1 = 4, V2 = 16, z = 12, P1 = 55;
  const P2 = P1 - gamma * (V2 * V2 - V1 * V1) / (2 * g) / 144;
  const h1 = computeBernoulliHead({ P_psi: P1, V_fps: V1, z_ft: z, gamma });
  const h2 = computeBernoulliHead({ P_psi: P2, V_fps: V2, z_ft: z, gamma });
  within(h2.H_ft, h1.H_ft, 1e-7, "total head conserved through the reducer");
  assert.ok(h2.h_press_ft < h1.h_press_ft && h2.h_vel_ft > h1.h_vel_ft, "pressure head converts to velocity head");
  // Trading elevation for pressure at a fixed velocity is also free.
  const up = computeBernoulliHead({ P_psi: P1 - 20 * gamma / 144, V_fps: V1, z_ft: z + 20, gamma });
  within(up.H_ft, h1.H_ft, 1e-7, "20 ft of lift costs exactly 20 ft of pressure head");
});

test("Bernoulli head: each term matches its own textbook conversion", () => {
  const r = computeBernoulliHead({ P_psi: 30, V_fps: 6, z_ft: 10, gamma: 62.4 });
  // 1 psi of water is 2.31 ft of head (144 / 62.4).
  within(r.h_press_ft, 30 * 2.31, 0.2, "2.31 ft per psi of water");
  // Velocity head v^2/2g: 6 fps is 0.559 ft, the same height a body falls from.
  within(r.h_vel_ft, 36 / (2 * 32.2), 1e-9, "v^2 / 2g");
  within(r.h_vel_ft, 0.559, 1, "6 fps is just over half a foot");
  within(r.H_ft, r.h_press_ft + r.h_vel_ft + 10, 1e-9, "the three terms add");
  // Velocity head is quadratic, and a denser fluid shortens the pressure head.
  within(computeBernoulliHead({ P_psi: 30, V_fps: 12, z_ft: 0, gamma: 62.4 }).h_vel_ft / r.h_vel_ft, 4, 1e-9, "quadratic in velocity");
  const brine = computeBernoulliHead({ P_psi: 30, V_fps: 6, z_ft: 10, gamma: 74.9 });
  within(brine.h_press_ft * 74.9, r.h_press_ft * 62.4, 1e-9, "P/gamma: heavier fluid, fewer feet for the same psi");
});
