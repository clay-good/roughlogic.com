// calc-hvacsystems.js, the TAB and acoustics bench of spec-v1622..v1636, against
// references the specs did not write: ASHRAE's duct-breakout and room
// equations, AMCA 201's effective duct length, the affinity laws, the constants
// behind 1.08 / 4.5 / 500, and the identities the tiles' notes claim. These 15
// tiles' only worked-example rows recompute their own specs, so an error a spec
// and its tile share passes that fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFlowHoodCorrection, computeFanSystemEffect, computeProportionalBalanceRatio,
  computePumpImpellerTrim, computeCoilCapacityVerification, computeValveActuatorCloseOff,
  computeChillerStagingPoint, computeVariablePrimaryBypass, computeLouverFreeArea,
  computePlenumReturnDrop, computeGrilleNeckNc, computeDuctBreakoutNoise,
  computeSilencerInsertionLoss, computeMechanicalRoomNc, computeRooftopCurbUplift,
} from "../../calc-hvacsystems.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const breakoutBase = { duct_width_in: 48, duct_height_in: 12, exposed_length_ft: 20, sound_power_db: 85, breakout_tl_db: 22, room_absorption_sabins: 250, room_criterion_db: 40, lagging_improvement_db: 0 };

// ---- independent references ----

test("breakout: ASHRAE's Lw_out = Lw_in + 10 log(S / A_duct) - TL, then the room equation", () => {
  // The in-duct intensity is the sound power over the duct's own section; the
  // wall passes a fraction tau of it over the radiating area S. The tile had
  // used the partition relation with the ROOM absorption in place of the duct
  // section and no room term, and read 62.0 dB where this gives 72.5.
  const r = computeDuctBreakoutNoise(breakoutBase);
  const lwOut = 85 + 10 * Math.log10(200 / (48 * 12 / 144)) - 22;
  close(r.breakout_lw_db, lwOut, "breakout sound power");
  const lp = lwOut + 10 * Math.log10(4 / 250) + 10.5;
  close(r.room_spl_db, lp, "reverberant room level");
  within(r.room_spl_db, 72.5, 0.1, "the worked duct");
  // Breakout cannot put more power in the room than the duct carries.
  const thin = computeDuctBreakoutNoise({ ...breakoutBase, breakout_tl_db: 1 });
  close(thin.breakout_lw_db, 85, "capped at the in-duct power");
  // The TL the criterion needs, fed back, lands on the criterion.
  const fixed = computeDuctBreakoutNoise({ ...breakoutBase, breakout_tl_db: r.tl_required_db });
  close(fixed.room_spl_db, 40, "round trip");
});

test("the room equation's 10.5 is the sq ft to sq m conversion, 10.3 dB, plus about 0.2 for rho c", () => {
  // Lp = Lw + 10 log(4/R) + 10.5 in IP units is the SI Lp = Lw + 10 log(4/R)
  // with R converted from sq ft: 10 log(10.7639) = 10.32, plus the rho c
  // correction of about 0.2 dB at standard air.
  within(10 * Math.log10(1 / (0.3048 * 0.3048)), 10.32, 0.1, "sq ft to sq m");
});

test("fan system effect: AMCA 201's effective duct length", () => {
  // 100% effective length is 2.5 equivalent diameters up to 2,500 fpm, plus one
  // diameter for every further 1,000 fpm; D_e = sqrt(4 A / pi).
  const slow = computeFanSystemEffect({ flow_cfm: 10000, outlet_width_in: 30, outlet_height_in: 24, straight_duct_ft: 3, inlet_condition: "clear", fan_curve_tp_inwg: 0, measured_tp_inwg: 0 });
  close(slow.equivalent_diameter_ft, Math.sqrt(4 * 5 / Math.PI), "D_e");
  close(slow.diameters_required, 2.5, "at 2,000 fpm");
  const fast = computeFanSystemEffect({ flow_cfm: 20000, outlet_width_in: 30, outlet_height_in: 24, straight_duct_ft: 3, inlet_condition: "clear", fan_curve_tp_inwg: 0, measured_tp_inwg: 0 });
  close(fast.diameters_required, 2.5 + 1.5, "at 4,000 fpm");
});

test("pump trim: the affinity laws, flow as D, head as D^2, power as D^3", () => {
  const r = computePumpImpellerTrim({ current_diameter_in: 9.5, current_flow_gpm: 520, required_flow_gpm: 430, current_head_ft: 95, required_head_ft: 62, max_diameter_in: 10.5, min_trim_fraction: 0.75, motor_hp: 15, annual_hours: 6000, energy_rate_per_kwh: 0.1 });
  const k = 430 / 520;
  close(r.required_diameter_in, 9.5 * k, "diameter");
  close(r.head_at_trim_ft, 95 * k * k, "head");
  close(r.power_ratio, k ** 3, "power");
  close(r.current_kwh, 15 * 0.745699872 * 6000, "one horsepower is 745.7 W");
});

test("coil: 4.5 and 500 are the air and water constants they claim", () => {
  // 4.5 = 60 min/h x 0.075 lb/cu ft; 500 = 60 min/h x 8.33 lb/gal x 1 Btu/lb-degF.
  within(60 * 0.075, 4.5, 1e-9, "air mass constant");
  within(60 * 8.33, 500, 0.1, "water constant");
  const r = computeCoilCapacityVerification({ airflow_cfm: 8000, entering_air_db_f: 80, leaving_air_db_f: 58, enthalpy_drop_btu_lb: 5.5, water_gpm: 40, entering_water_f: 44, leaving_water_f: 56, fluid_factor: 500, design_capacity_btuh: 240000, tolerance_pct: 10 });
  close(r.air_total_btuh, 4.5 * 8000 * 5.5, "air total");
  close(r.water_btuh, 500 * 40 * 12, "water");
  close(r.latent_btuh, r.air_total_btuh - 1.08 * 8000 * 22, "latent is total less sensible");
});

// ---- identities the notes claim ----

test("flow hood: the correction factor is the traverse over the hood, applied across the report", () => {
  const r = computeFlowHoodCorrection({ hood_reading_cfm: 420, correction_factor: 1, reference_traverse_cfm: 462, design_cfm: 400, system_reading_total_cfm: 16000 });
  close(r.factor_used, 1.1, "derived factor");
  close(r.corrected_cfm, 462, "corrected");
  close(r.system_error_cfm, 1600, "the error is systematic");
});

test("proportional balancing: every outlet takes the reference ratio, and the branch opens by its reciprocal", () => {
  const r = computeProportionalBalanceRatio({ design_1_cfm: 250, measured_1_cfm: 310, design_2_cfm: 300, measured_2_cfm: 285, design_3_cfm: 200, measured_3_cfm: 250, design_4_cfm: 400, measured_4_cfm: 365, design_5_cfm: 250, measured_5_cfm: 300, design_6_cfm: 0, measured_6_cfm: 0 });
  close(r.reference_ratio, 365 / 400, "the lowest ratio is the reference");
  assert.equal(r.reference_label, "D");
  close(r.branch_after_equalizing_cfm * r.branch_adjustment_factor, r.branch_design_cfm, "the branch comes back to design");
});

test("close-off: the seat force is the differential times the seat area, at minimum flow", () => {
  const r = computeValveActuatorCloseOff({ seat_area_in2: 12, design_differential_psi: 8, minimum_flow_differential_psi: 45, actuator_closeoff_psi: 20, spring_closeoff_psi: 0, is_spring_return: "no" });
  close(r.worst_case_seat_force_lb, 540, "45 psi on 12 sq in");
  close(r.force_shortfall_lb, 540 - 240, "shortfall");
  assert.equal(r.driven_adequate, false);
});

test("chiller staging: each option's power is load x interpolated kW/ton plus the auxiliaries it runs", () => {
  const r = computeChillerStagingPoint({ machine_tons: 500, plant_load_tons: 450, kw_per_ton_100: 0.62, kw_per_ton_75: 0.55, kw_per_ton_50: 0.52, kw_per_ton_30: 0.61, auxiliary_kw_per_machine: 45, staging_setpoint_pct: 80 });
  // One machine at 90%: 0.55 + (0.62 - 0.55) x 15/25; two at 45%: 0.61 + (0.52 - 0.61) x 15/20.
  close(r.one_machine_kw, 450 * (0.55 + 0.07 * 0.6) + 45, "one machine");
  close(r.two_machine_kw, 450 * (0.61 - 0.09 * 0.75) + 90, "two machines");
});

test("variable primary: the bypass makes up the chillers' minimum, and Cv is flow over root dP", () => {
  const r = computeVariablePrimaryBypass({ machine_design_gpm: 1000, minimum_flow_fraction: 0.45, machines_running: 2, system_flow_gpm: 600, bypass_differential_psi: 24, design_differential_psi: 12 });
  close(r.bypass_gpm, 900 - 600, "bypass");
  close(r.required_cv, 300 / Math.sqrt(24), "Cv");
  close(r.oversize_ratio, Math.SQRT2, "sized at half the differential");
});

test("louver: velocity through the FREE area, not the gross", () => {
  const r = computeLouverFreeArea({ width_ft: 4, height_ft: 4, free_area_ratio: 0.45, airflow_cfm: 3600, water_penetration_fpm: 700, allowable_velocity_fpm: 0, application: "intake" });
  close(r.free_velocity_fpm, 3600 / 7.2, "free-area velocity");
  close(r.free_velocity_fpm * 0.45, r.gross_velocity_fpm, "the ratio");
  close(r.gross_area_for_allowable_ft2 * 0.45 * 700, 3600, "the gross area the limit needs");
});

test("plenum return: velocity at the pinch, and the width that brings it to target", () => {
  const r = computePlenumReturnDrop({ return_cfm: 18000, pinch_width_ft: 4, pinch_clear_in: 14, target_velocity_fpm: 400, measured_room_to_plenum_inwg: 0.04, measured_plenum_to_shaft_inwg: 0.11, assumed_return_inwg: 0.02 });
  close(r.pinch_velocity_fpm, 18000 / (4 * 14 / 12), "pinch");
  close(r.width_for_target_ft * (14 / 12) * 400, 18000, "width at target");
});

test("grille NC: the level goes as 50 log of the neck velocity, and the target velocity solves back", () => {
  const r = computeGrilleNeckNc({ airflow_cfm: 600, neck_free_area_ft2: 1, rated_nc: 34, next_size_free_area_ft2: 1.4, room_nc_target: 30, room_correction_db: 0, damper_at_neck: "yes" });
  close(r.nc_change_db, 50 * Math.log10(1 / 1.4), "velocity to the fifth power");
  const atTarget = computeGrilleNeckNc({ airflow_cfm: r.cfm_at_target, neck_free_area_ft2: 1, rated_nc: 34, next_size_free_area_ft2: 600 / r.cfm_at_target * 1, room_nc_target: 30, room_correction_db: 0, damper_at_neck: "no" });
  close(atTarget.next_nc, 30, "target velocity");
});

test("silencer: pressure drop goes as the velocity squared, and regenerated noise adds as energy", () => {
  const r = computeSilencerInsertionLoss({ airflow_cfm: 9000, face_width_in: 36, face_height_in: 24, reference_drop_in_wc: 0.35, reference_velocity_fpm: 1500, alt_face_width_in: 30, alt_face_height_in: 20, target_velocity_fpm: 1500, upstream_lw_db: 95, insertion_loss_db: 25, regenerated_lw_db: 72, fan_available_static_in_wc: 2.5 });
  close(r.pressure_drop_in_wc, 0.35 * (1500 / 1500) ** 2, "at the reference velocity");
  close(r.drop_ratio, (36 * 24 / (30 * 20)) ** 2, "squeeze");
  close(r.downstream_lw_db, 10 * Math.log10(10 ** 7 + 10 ** 7.2), "70 dB plus 72 dB");
});

test("mechanical room: the partition equation, L2 = L1 - TL + 10 log(S / A)", () => {
  const r = computeMechanicalRoomNc({ source_spl_db: 85, partition_tl_db: 38, partition_area_ft2: 200, receiving_absorption_sabins: 300, criterion_db: 40, measured_spl_db: 55, flanking_threshold_db: 5 });
  close(r.received_spl_db, 85 - 38 + 10 * Math.log10(200 / 300), "room-to-room");
  assert.equal(r.flanking_likely, true);
});

test("curb uplift: net uplift less the weight, plus the overturning couple on the windward fasteners", () => {
  const r = computeRooftopCurbUplift({ unit_length_ft: 8, unit_width_ft: 5, unit_height_ft: 4, unit_weight_lb: 1400, uplift_psf: 28, lateral_psf: 22, fastener_count: 8, windward_fastener_count: 4, fastener_capacity_lb: 400 });
  close(r.uplift_lb, 40 * 28, "plan area x uplift");
  close(r.couple_tension_lb, r.lateral_lb * 2 / 5, "M / width");
  close(r.per_windward_lb, (1120 - 1400) / 8 + r.couple_tension_lb / 4, "per windward fastener");
});

test("pump-impeller-trim: a throttled pump (same flow, excess head) points to the head-based trim DOE Tip Sheet #7 prints (14 in -> 12.76 in)", () => {
  const r = computePumpImpellerTrim({ current_diameter_in: 14, current_flow_gpm: 3000, required_flow_gpm: 3000, current_head_ft: 165, required_head_ft: 125, max_diameter_in: 0, min_trim_fraction: 0.75, motor_hp: 156, annual_hours: 8000, energy_rate_per_kwh: 0.05 });
  assert.equal(r.throttled, true);
  assert.match(r.head_verdict, /HEAD-based trim/);
  assert.match(r.head_verdict, /12\.76 in/);
  // A flow reduction is not the throttled case.
  assert.equal(computePumpImpellerTrim({ current_diameter_in: 9.5, current_flow_gpm: 520, required_flow_gpm: 430, current_head_ft: 95, required_head_ft: 62 }).throttled, false);
});
