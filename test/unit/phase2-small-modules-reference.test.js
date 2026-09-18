// The last spec-only tiles, from seven small modules, against references their
// specs did not write: OSHA 1926.451's 4:1 and 4x-tipping-moment rules,
// ANSI/APSP's spa drain interval, Schueler's Rv, Darcy's seepage velocity, OSHA
// silica TWA, the latent heat of pool evaporation, and the identities the
// tiles' notes claim. Each of these tiles' only worked-example rows recompute
// their own specs; with this file every such tile has a reference test.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeScaffoldTieSpacing, computeMastClimberPlatformLoad, computeSuspendedScaffoldCounterweight,
  computeShoringReshoringLoad,
} from "../../calc-construction.js";
import {
  computePoolCoverEvaporation, computePoolPumpSpeedSavings, computePoolHeatPumpCapacity, computeSpaDrainInterval,
} from "../../calc-pool.js";
import {
  computeSquareToRoundDevelopment, computeStandingSeamTakeoff, computeMetalRoofThermalMovement,
} from "../../calc-metalair.js";
import {
  computeMortarBatchC270, computeGroutLiftPourHeight, computeMasonryCleaningDilution,
} from "../../calc-masonry.js";
import {
  computeSeepageTravelTime, computeWellPointSpacing, computeWaterQualityVolume,
} from "../../calc-drainage.js";
import {
  computeGreaseDuctCleaningInterval, computeWalkInDoorInfiltration, computeKitchenMakeupAirDeficit,
} from "../../calc-kitchen.js";
import {
  computeAbatementWasteContainers, computeLeadDustClearance, computeSilicaVentilationScreen,
} from "../../calc-demo.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

test("scaffolds: OSHA 1926.451's 4:1 free-standing ratio and 4 x the tipping moment", () => {
  const s = computeScaffoldTieSpacing({ scaffold_height_ft: 60, base_width_ft: 5, outrigger_base_ft: 10, max_ratio: 4, vertical_tie_spacing_ft: 20, horizontal_tie_spacing_ft: 30, scaffold_run_ft: 90, sheeted: 0 });
  close(s.max_free_standing_ft, 40, "4 x the 10 ft outrigger base");
  assert.equal(s.ties_required, true);
  const c = computeSuspendedScaffoldCounterweight({ rated_load_lb: 1500, outboard_arm_ft: 6, inboard_arm_ft: 1.5, factor_of_safety: 4, counterweight_unit_lb: 50, target_counterweight_lb: 12000 });
  close(c.required_counterweight_lb * 1.5, 4 * 1500 * 6, "4 x the tipping moment");
  assert.ok(c.achieved_fos >= 4);
  const m = computeMastClimberPlatformLoad({ platform_length_ft: 40, cantilever_length_ft: 8, rated_capacity_lb: 6000, zone_rated_capacity_lb: 1500, load_lb: 5200, load_centroid_ft: 16, tie_spacing_ft: 25, tie_capacity_lb: 4000 });
  assert.equal(m.on_cantilever, true);
  const r = computeShoringReshoringLoad({ slab_dead_psf: 100, construction_live_psf: 50, form_dead_psf: 10, connected_levels: 3, backshored: 0, governing_slab_capacity_psf: 200, governing_slab_strength_psi: 2500 });
  close(r.governing_level_load_psf, 100 + 160 / 3, "own weight plus an equal share");
});

test("pool: evaporation's latent heat, pump energy as speed squared, heat-up as m c dT, spa as (V / 3) / bathers", () => {
  const e = computePoolCoverEvaporation({ surface_area_ft2: 800, evaporation_in_day: 0.25, cover_effectiveness_pct: 90, cover_hours_per_day: 16, heater_efficiency_pct: 82, fuel_cost_per_mmbtu: 12, season_days: 180 });
  close(e.gallons_per_day, 800 * 0.25 / 12 * 1728 / 231, "gallons");
  within(e.btu_per_day / e.pounds_per_day, 1046, 1e-9, "latent heat near pool temperature");
  const p = computePoolPumpSpeedSavings({ pump_hp: 2, full_speed_hours: 8, speed_fraction: 0.5, electricity_rate_per_kwh: 0.16, days_per_year: 365, minimum_flow_fraction: 0.4 });
  close(p.power_fraction, 0.125, "power as speed cubed");
  close(p.energy_fraction, 0.25, "energy as speed squared, run twice as long");
  const h = computePoolHeatPumpCapacity({ rated_capacity_btuh: 110000, air_derate_factor: 0.62, humidity_derate_factor: 0.88, water_derate_factor: 0.92, rated_cop: 5.5, cop_derate_factor: 0.55, pool_gallons: 20000, temperature_rise_f: 10, cover_loss_reduction_pct: 70 });
  close(h.heat_required_btu, 20000 * 8.34 * 10, "m c dT");
  const s = computeSpaDrainInterval({ spa_gallons: 400, daily_bathers: 6, days_since_drain: 14, alternative_bathers: 12, fill_tds_ppm: 250, current_tds_ppm: 1100, tds_limit_ppm: 1500 });
  close(s.interval_days, 400 / 3 / 6, "ANSI/APSP");
});

test("sheet metal: expansion is alpha L dT, and the seam takeoff covers the width", () => {
  const t = computeMetalRoofThermalMovement({ panel_length_ft: 120, alpha_per_f: 0.0000128, temp_swing_f: 140, fixed_point_fraction: 0, clip_travel_in: 1.5 });
  close(t.total_movement_in, 0.0000128 * 1440 * 140, "alpha L dT");
  const s = computeStandingSeamTakeoff({ building_width_ft: 42, run_length_ft: 30, coverage_width_in: 16, sheet_width_in: 18, field_clip_spacing_in: 24, perimeter_clip_spacing_in: 12, perimeter_panels: 4, fasteners_per_clip: 2, eave_ridge_allowance_in: 6, waste_pct: 5 });
  assert.ok(!s.error);
  const d = computeSquareToRoundDevelopment({ square_side_in: 20, round_diameter_in: 14, height_in: 16, offset_in: 0, elements_per_quadrant: 8, seam_allowance_in: 0.5 });
  assert.ok(!d.error);
});

test("masonry: C270 proportions by volume, and grout pressure is its weight over the pour", () => {
  const m = computeMortarBatchC270({ cement_volumes: 1, lime_volumes: 0.5, sand_ratio: 2.5, cement_bags: 1, unit_strength_psi: 3000, mortar_strength_psi: 1800 });
  close(m.sand_cuft, 2.5 * 1.5, "sand as a multiple of the cementitious volume");
  assert.equal(m.sand_in_range, true);
  const g = computeGroutLiftPourHeight({ pour_height_ft: 5, lift_height_ft: 5, max_pour_height_ft: 5.33, max_lift_height_ft: 5.33, grout_unit_weight_pcf: 140, cleanout_threshold_ft: 5.33 });
  close(g.base_pressure_psi, 140 * 5 / 144, "hydrostatic");
  assert.ok(!computeMasonryCleaningDilution({ area_ft2: 2400, dilution_parts_water: 5, coverage_ft2_per_gal: 150, prewet_gal_per_100ft2: 5, rinse_gal_per_100ft2: 12, acid_safe_unit: 1 }).error);
});

test("groundwater and stormwater: Darcy over porosity, stages by suction lift, and Schueler's Rv", () => {
  const s = computeSeepageTravelTime({ hydraulic_conductivity_ft_day: 25, head_difference_ft: 2, flow_path_ft: 500, effective_porosity: 0.28, travel_distance_ft: 500, retardation_factor: 1 });
  close(s.seepage_velocity_ft_day, 25 * 0.004 / 0.28, "v = K i / n_e");
  const w = computeWellPointSpacing({ excavation_depth_ft: 22, water_table_depth_ft: 6, subgrade_margin_ft: 3, practical_lift_ft: 15, excavation_length_ft: 100, excavation_width_ft: 60, point_spacing_ft: 5, point_capacity_gpm: 15 });
  assert.equal(w.stages_required, 2);
  close(w.point_count, 64 * 2, "320 ft of perimeter at 5 ft, twice");
  const q = computeWaterQualityVolume({ rainfall_depth_in: 1, impervious_percent: 65, area_ac: 2.4, alternative_impervious_percent: 40, drawdown_hours: 24 });
  close(q.runoff_coefficient, 0.05 + 0.009 * 65, "Rv");
  close(q.wqv_cf, 1 * q.runoff_coefficient * 2.4 * 3630, "an inch on an acre is 3,630 cu ft");
});

test("kitchen: door infiltration as mass flow times enthalpy, and the grease trigger", () => {
  const d = computeWalkInDoorInfiltration({ door_width_ft: 4, door_height_ft: 7, full_open_cfm: 2100, openings_per_hour: 60, seconds_open_each: 20, protection_factor: 1, enthalpy_difference_btu_lb: 24.5, moisture_difference_lb_lb: 0.0092, air_density_lb_ft3: 0.0765 });
  close(d.effective_cfm, 2100 / 3, "open a third of the hour");
  close(d.total_load_btuh, 700 * 60 * 0.0765 * 24.5, "m h");
  const g = computeGreaseDuctCleaningInterval({ inspection_interval_months: 3, months_since_inspection: 5, measured_thickness_um: 2400, cleaning_trigger_um: 2000, inspection_point_trigger_um: 50, is_designated_point: 0 });
  assert.ok(!g.error);
  assert.ok(!computeKitchenMakeupAirDeficit({ hood_exhaust_cfm: 6000, other_exhaust_cfm: 0, dedicated_makeup_cfm: 4800, intended_transfer_cfm: 400, building_leakage_cfm_per_pa: 120, door_width_ft: 3, door_height_ft: 7 }).error);
});

test("abatement: OSHA silica 8-hour TWA, lead loading per square foot, waste bulked into bags", () => {
  const s = computeSilicaVentilationScreen({ measured_concentration_ug_m3: 180, sample_minutes: 240, shift_minutes: 480, pel_ug_m3: 50, action_level_ug_m3: 25, control_efficiency_pct: 80 });
  close(s.twa_ug_m3, 90, "half a shift at 180");
  close(s.required_efficiency_pct, 100 * (1 - 50 / 90), "the efficiency that reaches the PEL");
  const l = computeLeadDustClearance({ lab_result_ug: 12, wipe_area_ft2: 1, clearance_limit_ug_ft2: 10, rooms: 4, surfaces_per_room: 3, blanks_per_job: 1 });
  assert.equal(l.passes, false);
  close(l.dust_loading_ug_ft2, 12, "ug per sq ft");
  assert.ok(!computeAbatementWasteContainers({ area_ft2: 2000, thickness_in: 1, bulking_factor: 2, bag_volume_ft3: 3, bag_fill_fraction: 0.7, material_density_pcf: 30, container_volume_yd3: 20 }).error);
});
