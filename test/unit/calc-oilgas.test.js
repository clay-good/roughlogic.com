// calc-oilgas.js, the pipeline and drilling bench of spec-v1524..v1538, against
// references the specs did not write: ASME B31G's own ceiling on its safe
// pressure, the unit derivations behind 0.052 / 1029.4 / 24.5, the Weymouth
// and Panhandle A equations evaluated independently, the ideal-gas density of
// the separator gas, and the identities the tiles' notes claim. These 15
// tiles' only worked-example rows recompute their own specs, so an error a spec
// and its tile share passes that fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePipelineMaoBarlow, computeGasPipelineFlow, computeLiquidPipelineStationSpacing,
  computePigBatchVolume, computeCathodicAnodeCountLife, computeCorrodedPipeB31g,
  computeCasingCementVolume, computeMudHydrostaticPressure, computeKillMudWeight,
  computeAnnularVelocityCleaning, computeTankStrappingVolume, computeTankVentApi2000,
  computeSeparatorRetentionSizing, computeFlareRadiationDistance, computeWellDeclineReserves,
} from "../../calc-oilgas.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const CUFT_PER_BBL = 42 * 231 / 1728;
const b31gBase = { od_in: 12.75, wall_in: 0.25, smys_psi: 52000, defect_depth_in: 0.105, defect_length_in: 4.0, safety_factor: 1.39, maop_psig: 1468 };

// ---- independent references ----

test("B31G: the safe pressure may not exceed the design pressure of sound pipe", () => {
  // ASME B31G: P' = 1.1 P x (bulging ratio), with P' <= P. A 20%-deep, 1 in
  // pit has a ratio of 0.98, so without the ceiling P' reads 8% above P.
  const shallow = computeCorrodedPipeB31g({ ...b31gBase, defect_depth_in: 0.05, defect_length_in: 1 });
  const P = 52000 * 2 * 0.25 / 12.75 / 1.39;
  close(shallow.design_pressure_psi, P, "design pressure");
  close(shallow.safe_pressure_psi, P, "held at P");
  assert.equal(shallow.capped_at_design, true);
  // The worked defect is well inside the ceiling and follows the parabolic form.
  const r = computeCorrodedPipeB31g(b31gBase);
  const M = Math.sqrt(1 + 0.8 * 16 / (12.75 * 0.25));
  const dt = 0.105 / 0.25;
  close(r.failure_pressure_psi, 1.1 * 52000 * (2 * 0.25 / 12.75) * (1 - 2 / 3 * dt) / (1 - 2 / 3 * dt / M), "parabolic B31G");
  assert.equal(r.capped_at_design, false);
  // Past A = 4 the rectangular form, and past 80% of wall no evaluation.
  const long = computeCorrodedPipeB31g({ ...b31gBase, defect_length_in: 20 });
  assert.equal(long.is_parabolic, false);
  close(long.failure_pressure_psi, 1.1 * 52000 * (2 * 0.25 / 12.75) * (1 - dt), "rectangular B31G");
  assert.equal(computeCorrodedPipeB31g({ ...b31gBase, defect_depth_in: 0.21 }).over_depth_limit, true);
});

test("drilling constants are unit conversions: 0.052, 1029.4 and 24.5", () => {
  // 0.052 psi/ft per ppg: 12 cu in of a 1 lb/231 cu in fluid on a square inch.
  within(12 / 231, 0.052, 0.2, "psi/ft per ppg");
  // bbl/ft = D^2 (in) / 1029.4: pi/4 x D^2/144 sq ft over 5.6146 cu ft/bbl.
  within(144 * 4 * CUFT_PER_BBL / Math.PI, 1029.4, 0.01, "annular capacity");
  // ft/min = 24.5 gpm / (D^2 - d^2): 231/1728 cu ft per gal over pi/4 x A/144.
  within(231 / 1728 * 144 * 4 / Math.PI, 24.5, 0.1, "annular velocity");
  const r = computeMudHydrostaticPressure({ mud_weight_ppg: 12.5, tvd_ft: 9800, measured_depth_ft: 12000, formation_pressure_psi: 6100 });
  close(r.hydrostatic_psi, 0.052 * 12.5 * 9800, "hydrostatic at TVD, not MD");
});

test("gas flow: Weymouth and Panhandle A evaluated independently", () => {
  const base = { id_in: 15.5, length_mi: 42, inlet_psig: 850, outlet_psig: 600, gravity: 0.6, flowing_temp_f: 60, z_factor: 1, efficiency: 0.92, alternate_id_in: 19.25 };
  const p1 = 864.7, p2 = 614.7, T = 519.67, Tb = 520, Pb = 14.73;
  const wey = 433.5 * 0.92 * (Tb / Pb) * Math.sqrt((p1 * p1 - p2 * p2) / (0.6 * T * 42 * 1)) * Math.pow(15.5, 2.667);
  const pan = 435.87 * 0.92 * Math.pow(Tb / Pb, 1.0788) * Math.pow((p1 * p1 - p2 * p2) / (Math.pow(0.6, 0.8539) * T * 42 * 1), 0.5394) * Math.pow(15.5, 2.6182);
  within(computeGasPipelineFlow({ ...base, equation: "weymouth" }).q_scfd, wey, 1e-9, "Weymouth");
  within(computeGasPipelineFlow({ ...base, equation: "panhandle_a" }).q_scfd, pan, 1e-9, "Panhandle A");
});

test("separator: the gas density is the ideal-gas density at pressure, over Z", () => {
  const r = computeSeparatorRetentionSizing({ vessel_diameter_ft: 4, seam_to_seam_ft: 12, liquid_fraction: 0.5, liquid_rate_bpd: 1200, required_retention_min: 3, gas_rate_mmscfd: 3.5, pressure_psig: 400, temperature_f: 100, z_factor: 0.92, gas_gravity: 0.7, liquid_density_lb_ft3: 52, k_factor: 0.35 });
  close(r.gas_density_lb_ft3, 414.696 * 0.7 * 28.964 / (0.92 * 10.7316 * 559.67), "rho = P M / (Z R T)");
  close(r.max_velocity_fps, 0.35 * Math.sqrt((52 - r.gas_density_lb_ft3) / r.gas_density_lb_ft3), "Souders-Brown");
  close(r.liquid_volume_bbl, Math.PI * 4 * 12 * 0.5 / CUFT_PER_BBL, "a half-full 4 ft vessel");
});

// ---- identities the notes claim ----

test("Barlow: MAOP is 2 S t F E T / D, class by class", () => {
  const r = computePipelineMaoBarlow({ od_in: 12.75, wall_in: 0.25, smys_psi: 52000, class_location: "class_1", joint_factor: 1, temperature_factor: 1, operating_pressure_psig: 1468, target_pressure_psig: 0 });
  close(r.maop_psig, 2 * 52000 * 0.25 / 12.75 * 0.72, "class 1");
  close(r.maop_class_4 / r.maop_class_1, 0.4 / 0.72, "class 4 over class 1");
});

test("station spacing: the head available over the combined gradient, friction going as flow squared", () => {
  const r = computeLiquidPipelineStationSpacing({ total_length_mi: 120, friction_gradient_ft_per_mi: 12, elevation_change_ft: 400, maop_head_ft: 2300, min_suction_head_ft: 150, flow_bpd: 60000, alternate_flow_bpd: 90000 });
  close(r.max_spacing_mi, 2150 / (12 + 400 / 120), "spacing");
  close(r.alternate_gradient_ft_per_mi, 12 * 2.25, "1.5 x the flow, 2.25 x the friction");
});

test("pig batch: line fill in barrels per mile, and velocity from the flow", () => {
  const r = computePigBatchVolume({ id_in: 15.5, length_mi: 42, flow_bpd: 60000, tool_min_fps: 3, tool_max_fps: 12 });
  close(r.bbl_per_mile, Math.PI / 4 * (15.5 / 12) ** 2 * 5280 / CUFT_PER_BBL, "line fill");
  close(r.velocity_fps * 3600 / 5280 * r.bbl_per_mile * 24, 60000, "velocity round trip");
});

test("anodes: the current is the bare area times the density, and life is the mass over consumption", () => {
  const r = computeCathodicAnodeCountLife({ od_in: 12.75, length_mi: 42, coating_efficiency_pct: 99.9, current_density_ma_per_ft2: 1.5, anode_weight_lb: 50, consumption_lb_per_a_yr: 1, utilization: 0.85, current_per_anode_a: 3, degraded_efficiency_pct: 99, target_life_years: 20 });
  close(r.current_required_a, Math.PI * 12.75 / 12 * 42 * 5280 * 0.001 * 1.5 / 1000, "current");
  close(r.anode_life_years, 50 * 0.85 / 3, "life");
  close(r.current_multiple, 10, "a tenth of the coating efficiency, ten times the bare steel");
});

test("cement: the annulus in bbl/ft times the column, with excess and yield", () => {
  const r = computeCasingCementVolume({ hole_dia_in: 12.25, casing_od_in: 9.625, casing_id_in: 8.535, cement_column_ft: 4200, excess_pct: 35, float_collar_ft: 4160, slurry_yield_ft3_per_sack: 1.18, low_excess_pct: 25, high_excess_pct: 60 });
  close(r.annular_volume_bbl, (12.25 ** 2 - 9.625 ** 2) / 1029.4 * 4200, "annulus");
  assert.ok(r.sacks * 1.18 >= r.slurry_volume_ft3 && (r.sacks - 1) * 1.18 < r.slurry_volume_ft3);
});

test("kill mud: the weight-up balances the shut-in drill-pipe pressure", () => {
  const r = computeKillMudWeight({ original_mw_ppg: 12.5, tvd_ft: 9800, sidpp_psi: 380, scr_pressure_psi: 600, safety_margin_ppg: 0, rounded_mw_ppg: 13.0, drillpipe_capacity_bbl_ft: 0.01776, measured_depth_ft: 9800, pump_output_bbl_stroke: 0.117, pump_spm: 30 });
  close(0.052 * r.kill_mw_ppg * 9800, r.formation_pressure_psi, "kill mud balances the formation");
  close(r.icp_psi, 980, "ICP = SIDPP + SCR");
  close(r.fcp_psi, 600 * r.kill_mw_ppg / 12.5, "FCP = SCR x KMW / OMW");
});

test("annular velocity and bottoms-up", () => {
  const r = computeAnnularVelocityCleaning({ hole_dia_in: 8.75, pipe_od_in: 5, flow_gpm: 420, slip_velocity_ft_min: 30, measured_depth_ft: 9800, pump_output_bbl_stroke: 0.117, pump_spm: 30, target_velocity_ft_min: 0 });
  close(r.annular_velocity_ft_min, 24.5 * 420 / (8.75 ** 2 - 25), "AV");
  close(r.bottoms_up_min * 30 * 0.117, r.annular_volume_bbl, "bottoms up");
});

test("strapping: a round tank holds pi/4 D^2 per foot, net of temperature and S&W", () => {
  const r = computeTankStrappingVolume({ tank_diameter_ft: 30, gauge_ft: 14, gauge_in: 6, closing_gauge_ft: 9, closing_gauge_in: 6, volume_correction_factor: 0.985, sediment_water_pct: 0.5 });
  close(r.bbl_per_ft, Math.PI / 4 * 900 / CUFT_PER_BBL, "bbl/ft");
  close(r.net_bbl, r.bbl_per_ft * 5 * 0.985 * 0.995, "net of a 5 ft delivery");
});

test("venting: liquid movement is volume for volume, and the requirements add", () => {
  const r = computeTankVentApi2000({ pump_in_bph: 3000, pump_out_bph: 2000, volatile_factor: 1, thermal_out_ft3h: 1200, thermal_in_ft3h: 3600, fire_case_ft3h: 742000, installed_pressure_ft3h: 20000, installed_vacuum_ft3h: 12000 });
  close(r.required_out_ft3h, 3000 * CUFT_PER_BBL + 1200, "outbreathing");
  close(r.required_in_ft3h, 2000 * CUFT_PER_BBL + 3600, "inbreathing");
});

test("flare: the point-source distance returns exactly the allowable flux", () => {
  const r = computeFlareRadiationDistance({ heat_release_btuh: 2.5e8, radiant_fraction: 0.15, allowable_btuh_ft2: 500, solar_btuh_ft2: 300, available_distance_ft: 100 });
  close(0.15 * 2.5e8 / (4 * Math.PI * r.required_distance_ft ** 2), 200, "flux at the distance");
});

test("decline: effective and nominal rates describe the same well, and reserves integrate the rate", () => {
  const nominal = computeWellDeclineReserves({ initial_rate_bpd: 420, decline_rate: 0.28, rate_is_effective: "no", economic_limit_bpd: 15, years_ahead: 5 });
  const effective = computeWellDeclineReserves({ initial_rate_bpd: 420, decline_rate: 1 - Math.exp(-0.28), rate_is_effective: "yes", economic_limit_bpd: 15, years_ahead: 5 });
  close(effective.remaining_reserves_bbl, nominal.remaining_reserves_bbl, "same well");
  // Trapezoidal integral of q(t) = 420 e^(-0.28 t) bbl/d to the economic limit.
  const tEnd = Math.log(420 / 15) / 0.28, n = 20000, h = tEnd / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) sum += (i === 0 || i === n ? 0.5 : 1) * 420 * Math.exp(-0.28 * i * h);
  within(nominal.remaining_reserves_bbl, sum * h * 365, 1e-6, "integrated");
});
