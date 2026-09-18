// calc-datacenter.js (spec-v1800..v1808) against references the specs did not
// write: dew points from a second saturation equation, the derivations of the 1.08
// and 4005 air constants, and the balances the tiles' notes claim. The
// worked-example fixture recomputes each spec's own example, so an error a
// spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDatacenterPue, computeRackPowerDensityAirflow, computeUpsModuleRedundancy,
  computeCracSensibleDerate, computeContainmentBypassAirflow, computePduBranchLoading,
  computeChilledWaterRideThrough, computeServerInletEnvelope, computeRaisedFloorTileAirflow,
} from "../../calc-datacenter.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const inletBase = { dry_bulb_f: 78, relative_humidity_pct: 45, recommended_min_f: 64.4, recommended_max_f: 80.6, allowable_min_f: 59, allowable_max_f: 89.6, upper_dew_point_f: 59, upper_rh_pct: 60, alternative_temp_f: 82, alternative_rh_pct: 50 };

// ---- independent references ----

test("dew point agrees with an independent saturation equation within 0.3 degF", () => {
  // The tile uses Magnus (17.27, 237.7). Buck (1996) is a separate fit:
  // e_s = 0.61121 exp((18.678 - T / 234.5)(T / (257.14 + T))) kPa, T in degC.
  // Solve e_s(Td) = RH x e_s(T) by bisection.
  const buck = (c) => 0.61121 * Math.exp((18.678 - c / 234.5) * (c / (257.14 + c)));
  const dewPointF = (f, rh) => {
    const target = rh / 100 * buck((f - 32) / 1.8);
    let lo = -40, hi = 60;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (buck(mid) < target) lo = mid; else hi = mid;
    }
    return ((lo + hi) / 2) * 1.8 + 32;
  };
  for (const [t, rh] of [[77, 50], [68, 60], [86, 40], [59, 80], [95, 20]]) {
    const r = computeServerInletEnvelope({ ...inletBase, dry_bulb_f: t, relative_humidity_pct: rh });
    const want = dewPointF(t, rh);
    assert.ok(Math.abs(r.dew_point_f - want) <= 0.3, `${t} degF / ${rh}%: got ${r.dew_point_f}, want ${want}`);
  }
  // At saturation the dew point is the dry bulb.
  within(computeServerInletEnvelope({ ...inletBase, relative_humidity_pct: 100 }).dew_point_f, 78, 1e-9, "saturated");
});

test("the 1.08 and 4005 air constants are what they claim", () => {
  // 1.08 = 60 min/h x 0.075 lb/cu ft x 0.24 Btu/lb-degF; 4005 fpm is the
  // velocity whose velocity pressure is 1 in. w.c. in 0.075 lb/cu ft air.
  within(60 * 0.075 * 0.24, 1.08, 1e-9, "sensible factor");
  const fpm = 60 * Math.sqrt(2 * 32.174 * (62.4 / 12) / 0.075);
  within(fpm, 4005, 0.2, "velocity at 1 in. w.c.");
  const r = computeRackPowerDensityAirflow({ rack_load_kw: 8, equipment_delta_t_f: 20, standard_tile_cfm: 500, comparison_rack_kw: 15, high_flow_tile_cfm: 900, alternative_delta_t_f: 30 });
  close(r.required_cfm, 8 * 3412 / (1.08 * 20), "cfm = Btu/h / (1.08 dT)");
  close(r.alternative_delta_t_cfm / r.comparison_required_cfm, 20 / 30, "airflow as 1 / dT");
});

// ---- balances the notes claim ----

test("PUE: total over IT, with DCiE its reciprocal", () => {
  const r = computeDatacenterPue({ it_load_kw: 500, cooling_kw: 210, ups_loss_kw: 35, miscellaneous_kw: 15, tariff_per_kwh: 0.1, target_pue: 1.3, reduced_it_kw: 400, reduced_cooling_kw: 175, reduced_ups_loss_kw: 30 });
  close(r.pue, 760 / 500, "PUE");
  close(r.pue * r.dcie_pct, 100, "DCiE");
  close(r.annual_cost, 760 * 8760 * 0.1, "a year");
});

test("UPS: the loss is the load over the efficiency, less the load", () => {
  const r = computeUpsModuleRedundancy({ it_load_kw: 500, power_factor: 0.9, module_rating_kva: 250, n_plus_one_efficiency_pct: 95.5, two_n_efficiency_pct: 94, tariff_per_kwh: 0.1, cooling_cop: 3 });
  close(r.n_plus_one_loss_kw, 500 / 0.955 - 500, "N+1 loss");
  assert.equal(r.required_modules, Math.ceil(500 / 0.9 / 250));
  assert.equal(r.two_n_modules, 2 * r.required_modules);
  close(r.annual_cooling_delta * 3, r.annual_metered_delta, "cooling the loss at a COP of 3");
});

test("CRAC: sensible capacity follows the return temperature linearly", () => {
  const r = computeCracSensibleDerate({ airflow_cfm: 12000, supply_temp_f: 55, return_temp_f: 75, contained_return_temp_f: 85, bypass_return_temp_f: 68 });
  close(r.capacity_btu_h, 1.08 * 12000 * 20, "capacity");
  close(r.contained_capacity_btu_h / r.capacity_btu_h, 30 / 20, "containment");
});

test("bypass: the return air is the mixture, and the heat it carries is the IT load", () => {
  const r = computeContainmentBypassAirflow({ it_load_kw: 500, equipment_delta_t_f: 20, unit_count: 8, airflow_per_unit_cfm: 12000, supply_temp_f: 65, exhaust_temp_f: 85, fan_power_per_unit_kw: 7.5, tariff_per_kwh: 0.1 });
  close(r.supply_airflow_cfm, r.it_airflow_cfm + r.bypass_cfm, "airflow balance");
  close(r.heat_removed_btu_h, 500 * 3412, "energy balance");
  close(r.matched_fan_power_kw, 60 * Math.pow(r.it_airflow_cfm / 96000, 3), "fan affinity");
});

test("PDU: three-phase capacity is sqrt(3) V I at the continuous limit", () => {
  const r = computePduBranchLoading({ line_voltage_v: 208, phase_configuration: "three_phase", breaker_rating_a: 30, continuous_load_pct: 80, power_factor: 0.99, device_draw_w: 450 });
  close(r.branch_capacity_kva, Math.sqrt(3) * 208 * 24 / 1000, "kVA");
  assert.ok(r.supported_device_count * 450 <= r.branch_capacity_kw * 1000);
  assert.ok((r.supported_device_count + 1) * 450 > r.branch_capacity_kw * 1000);
  const single = computePduBranchLoading({ line_voltage_v: 208, phase_configuration: "single_phase", breaker_rating_a: 30, continuous_load_pct: 80, power_factor: 0.99, device_draw_w: 450 });
  close(r.branch_capacity_kva / single.branch_capacity_kva, Math.sqrt(3), "phase factor");
});

test("ride-through: the stored cooling carries the IT heat for exactly the minutes stated", () => {
  const r = computeChilledWaterRideThrough({ loop_volume_gal: 5000, it_load_kw: 500, supply_temp_f: 45, max_temp_f: 60, generator_transfer_min: 0.5, chiller_restart_min: 7, smaller_loop_volume_gal: 1200 });
  close(r.stored_cooling_btu, 5000 * 8.34 * 15, "stored");
  close(r.ride_through_min / 60 * 500 * 3412, r.stored_cooling_btu, "ride-through");
  const exact = computeChilledWaterRideThrough({ loop_volume_gal: r.required_volume_gal, it_load_kw: 500, supply_temp_f: 45, max_temp_f: 60, generator_transfer_min: 0.5, chiller_restart_min: 7, smaller_loop_volume_gal: 1200 });
  close(exact.ride_through_min, 7.5, "the required volume rides exactly the restart");
});

test("floor tiles: flow goes as the root of plenum pressure, and the pressure solves back", () => {
  const r = computeRaisedFloorTileAirflow({ tile_area_ft2: 4, open_area_pct: 25, discharge_coefficient: 0.7, plenum_pressure_in_wc: 0.05, total_supply_cfm: 96000, open_tile_count: 150, high_flow_open_pct: 56, reduced_pressure_in_wc: 0.02, increased_tile_count: 200 });
  close(r.reduced_pressure_airflow_cfm / r.tile_airflow_cfm, Math.sqrt(0.02 / 0.05), "root of pressure");
  const back = computeRaisedFloorTileAirflow({ tile_area_ft2: 4, open_area_pct: 25, discharge_coefficient: 0.7, plenum_pressure_in_wc: r.required_plenum_pressure_in_wc, total_supply_cfm: 96000, open_tile_count: 150, high_flow_open_pct: 56, reduced_pressure_in_wc: 0.02, increased_tile_count: 200 });
  close(back.tile_airflow_cfm, 96000 / 150, "round trip");
});
