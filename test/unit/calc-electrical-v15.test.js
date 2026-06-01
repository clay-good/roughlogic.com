// spec-v15 unit tests for the Group A tiles landed in the v15 expansion:
//   A.8 PV interconnection 120% busbar rule (NEC 705.12)
//   A.9 Off-grid battery bank sizing (IEEE 1013 / 1561)
//   A.1 Three-phase voltage drop with reactance (NEC Chapter 9 Table 9)
//   A.3 Power triangle solver (IEEE 1459)
//   A.6 EV charger continuous load and panel impact (NEC Article 625)
//   A.10 Conductor ambient + fill ampacity adjustment (NEC 310.15)
//   A.11 Service load, NEC 220.82 optional method
//
// All pure arithmetic. The assertions pin the published-rule constants so a
// future edit that changed a constant or swapped an operator fails loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePvInterconnectionBusbar, pvInterconnectionBusbarExample,
  computeOffGridBattery, offGridBatteryExample,
  computeVoltageDropReactance, voltageDropReactanceExample,
  computePowerTriangle, powerTriangleExample,
  computeEvChargerLoad, evChargerLoadExample,
  computeAmbientAmpacityAdjust, ambientAmpacityAdjustExample,
  computeServiceLoadOptional, serviceLoadOptionalExample,
} from "../../calc-electrical.js";

// ---------------------------------------------------------------------------
// A.8 PV interconnection 120% busbar rule
// ---------------------------------------------------------------------------

test("busbar: canonical 200/200/40 opposite-end lands exactly at the 240 A limit and passes", () => {
  const r = computePvInterconnectionBusbar(pvInterconnectionBusbarExample.inputs);
  assert.strictEqual(r.sum_of_breakers_a, 240);
  assert.strictEqual(r.limit_a, 240);
  assert.strictEqual(r.passes, true);
  assert.strictEqual(r.basis, "load_side_120_percent");
});

test("busbar: 50 A PV breaker exceeds the 120% limit (250 > 240) and fails", () => {
  const r = computePvInterconnectionBusbar({ main_breaker_a: 200, busbar_rating_a: 200, pv_proposed_a: 50, method: "opposite_end_load_side" });
  assert.strictEqual(r.sum_of_breakers_a, 250);
  assert.strictEqual(r.limit_a, 240);
  assert.strictEqual(r.passes, false);
  assert.ok(r.recommendation.length > 0);
});

test("busbar: the 120% multiplier is exactly 1.20 of the busbar rating", () => {
  for (const busbar of [100, 125, 200, 225, 400]) {
    const r = computePvInterconnectionBusbar({ main_breaker_a: busbar, busbar_rating_a: busbar, pv_proposed_a: 0, method: "opposite_end_load_side" });
    assert.ok(Math.abs(r.limit_a - 1.2 * busbar) < 1e-9, `limit at busbar=${busbar}`);
  }
});

test("busbar: non-opposite-end load-side uses the 100% (sum <= busbar) rule", () => {
  const r = computePvInterconnectionBusbar({ main_breaker_a: 200, busbar_rating_a: 200, pv_proposed_a: 40, method: "load_side_other" });
  assert.strictEqual(r.limit_a, 200);
  assert.strictEqual(r.passes, false); // 240 > 200
  assert.strictEqual(r.basis, "load_side_100_percent");
});

test("busbar: a 20 A PV breaker passes the 100% rule when the main leaves room", () => {
  // Under the 100% rule the sum must stay at or below the busbar rating. A
  // 175 A main leaves room for 20 A of PV: 175 + 20 = 195 <= 200.
  const r = computePvInterconnectionBusbar({ main_breaker_a: 175, busbar_rating_a: 200, pv_proposed_a: 20, method: "load_side_other" });
  assert.strictEqual(r.sum_of_breakers_a, 195);
  assert.strictEqual(r.passes, true);
});

test("busbar: existing PV breaker counts toward the sum", () => {
  const r = computePvInterconnectionBusbar({ main_breaker_a: 200, busbar_rating_a: 225, pv_existing_a: 20, pv_proposed_a: 40, method: "opposite_end_load_side" });
  assert.strictEqual(r.sum_of_breakers_a, 260); // 200 + 20 + 40
  assert.strictEqual(r.limit_a, 270); // 1.2 * 225
  assert.strictEqual(r.passes, true);
});

test("busbar: supply-side tap is exempt from the busbar rule (limit not applicable, always passes the 705.12 check)", () => {
  const r = computePvInterconnectionBusbar({ main_breaker_a: 200, busbar_rating_a: 200, pv_proposed_a: 200, method: "supply_side_tap" });
  assert.strictEqual(r.limit_a, null);
  assert.strictEqual(r.passes, true);
  assert.strictEqual(r.basis, "supply_side_705_11");
  assert.ok(r.warnings.some((w) => w.includes("705.11")));
});

test("busbar: main exceeding the busbar rating is flagged as a pre-existing condition", () => {
  const r = computePvInterconnectionBusbar({ main_breaker_a: 250, busbar_rating_a: 200, pv_proposed_a: 10, method: "opposite_end_load_side" });
  assert.ok(r.warnings.some((w) => w.includes("408.36")));
});

test("busbar: a proposed PV breaker above 80% of the main is flagged", () => {
  const r = computePvInterconnectionBusbar({ main_breaker_a: 100, busbar_rating_a: 225, pv_proposed_a: 90, method: "opposite_end_load_side" });
  assert.ok(r.warnings.some((w) => w.includes("80 percent")));
});

test("busbar: rejection paths (non-positive ratings, negative PV, unknown method)", () => {
  assert.ok("error" in computePvInterconnectionBusbar({ main_breaker_a: 0, busbar_rating_a: 200 }));
  assert.ok("error" in computePvInterconnectionBusbar({ main_breaker_a: 200, busbar_rating_a: 0 }));
  assert.ok("error" in computePvInterconnectionBusbar({ main_breaker_a: 200, busbar_rating_a: 200, pv_proposed_a: -5 }));
  assert.ok("error" in computePvInterconnectionBusbar({ main_breaker_a: 200, busbar_rating_a: 200, method: "bogus" }));
});

// ---------------------------------------------------------------------------
// A.9 Off-grid battery bank sizing
// ---------------------------------------------------------------------------

test("battery: lead-acid worked example (2400 Wh/day, 3 days, 50% DoD, 85% eta, 12 V)", () => {
  const r = computeOffGridBattery(offGridBatteryExample.inputs);
  assert.strictEqual(r.usable_wh, 7200);
  assert.ok(Math.abs(r.nameplate_wh - 16941.176470588234) < 1e-6);
  assert.ok(Math.abs(r.nameplate_ah - 1411.7647058823528) < 1e-6);
});

test("battery: usable_Wh is daily load times days of autonomy (exact)", () => {
  for (const [daily, days] of [[1000, 1], [1000, 3], [2400, 5], [5000, 2]]) {
    const r = computeOffGridBattery({ daily_load_wh: daily, days_autonomy: days, dod_limit: 0.5, system_voltage_v: 48, round_trip_efficiency: 0.85 });
    assert.strictEqual(r.usable_wh, daily * days);
  }
});

test("battery: nameplate_Wh = usable / (DoD * eta * derate)", () => {
  const r = computeOffGridBattery({ daily_load_wh: 3000, days_autonomy: 2, dod_limit: 0.8, system_voltage_v: 48, round_trip_efficiency: 0.95, temperature_derate: 0.9 });
  const expected = (3000 * 2) / (0.8 * 0.95 * 0.9);
  assert.ok(Math.abs(r.nameplate_wh - expected) < 1e-6);
});

test("battery: nameplate_Ah = nameplate_Wh / system voltage", () => {
  const r = computeOffGridBattery({ daily_load_wh: 4800, days_autonomy: 3, dod_limit: 0.8, system_voltage_v: 48, round_trip_efficiency: 0.95 });
  assert.ok(Math.abs(r.nameplate_ah - r.nameplate_wh / 48) < 1e-9);
});

test("battery: LFP 48 V draws fewer amp-hours than lead-acid 12 V for the same energy", () => {
  const lfp = computeOffGridBattery({ daily_load_wh: 5000, days_autonomy: 3, dod_limit: 0.8, system_voltage_v: 48, round_trip_efficiency: 0.95 });
  const pb = computeOffGridBattery({ daily_load_wh: 5000, days_autonomy: 3, dod_limit: 0.5, system_voltage_v: 12, round_trip_efficiency: 0.85 });
  assert.ok(lfp.nameplate_ah < pb.nameplate_ah);
});

test("battery: doubling daily load doubles nameplate Ah (linear)", () => {
  const a = computeOffGridBattery({ daily_load_wh: 2000, days_autonomy: 3, dod_limit: 0.5, system_voltage_v: 24, round_trip_efficiency: 0.85 });
  const b = computeOffGridBattery({ daily_load_wh: 4000, days_autonomy: 3, dod_limit: 0.5, system_voltage_v: 24, round_trip_efficiency: 0.85 });
  assert.ok(Math.abs(b.nameplate_ah - 2 * a.nameplate_ah) < 1e-6);
});

test("battery: a lower depth-of-discharge raises the required nameplate capacity", () => {
  const deep = computeOffGridBattery({ daily_load_wh: 3000, days_autonomy: 3, dod_limit: 0.8, system_voltage_v: 48, round_trip_efficiency: 0.9 });
  const shallow = computeOffGridBattery({ daily_load_wh: 3000, days_autonomy: 3, dod_limit: 0.4, system_voltage_v: 48, round_trip_efficiency: 0.9 });
  assert.ok(shallow.nameplate_wh > deep.nameplate_wh);
});

test("battery: a non-standard system voltage is flagged", () => {
  const r = computeOffGridBattery({ daily_load_wh: 3000, days_autonomy: 3, dod_limit: 0.5, system_voltage_v: 36, round_trip_efficiency: 0.85 });
  assert.ok(r.warnings.some((w) => w.includes("standard")));
});

test("battery: more than 5 days of autonomy is flagged as cost-driven", () => {
  const r = computeOffGridBattery({ daily_load_wh: 3000, days_autonomy: 7, dod_limit: 0.5, system_voltage_v: 48, round_trip_efficiency: 0.85 });
  assert.ok(r.warnings.some((w) => w.includes("autonomy")));
});

test("battery: rejection paths (non-positive load, DoD out of range, zero efficiency)", () => {
  assert.ok("error" in computeOffGridBattery({ daily_load_wh: 0 }));
  assert.ok("error" in computeOffGridBattery({ daily_load_wh: 100, dod_limit: 1.5 }));
  assert.ok("error" in computeOffGridBattery({ daily_load_wh: 100, dod_limit: 0 }));
  assert.ok("error" in computeOffGridBattery({ daily_load_wh: 100, round_trip_efficiency: 0 }));
  assert.ok("error" in computeOffGridBattery({ daily_load_wh: 100, system_voltage_v: 0 }));
});

// ---------------------------------------------------------------------------
// A.1 Three-phase voltage drop with reactance
// ---------------------------------------------------------------------------

test("vd-reactance: worked example (100 A, 200 ft, 1/0 Cu steel, 480 V 3ph, PF 0.85) ~ 4.63 V", () => {
  const r = computeVoltageDropReactance(voltageDropReactanceExample.inputs);
  assert.ok(Math.abs(r.drop_v - 4.6307569) < 1e-4);
  assert.ok(Math.abs(r.drop_percent - 0.964741) < 1e-4);
  assert.ok(Math.abs(r.voltage_at_load_v - 475.3692) < 1e-3);
  assert.strictEqual(r.advisory, "within the 3% branch / 5% total advisory band");
});

test("vd-reactance: three-phase uses sqrt(3), single-phase uses 2", () => {
  const base = { system_voltage_v: 240, current_a: 50, length_ft: 100, r_ohm_per_kft: 0.2, x_ohm_per_kft: 0.05, power_factor: 0.9 };
  const three = computeVoltageDropReactance({ ...base, phase: "three" });
  const single = computeVoltageDropReactance({ ...base, phase: "single" });
  assert.ok(Math.abs(single.drop_v / three.drop_v - 2 / Math.sqrt(3)) < 1e-9);
});

test("vd-reactance: X = 0 matches the resistance-only formula", () => {
  const r = computeVoltageDropReactance({ system_voltage_v: 480, current_a: 100, length_ft: 200, r_ohm_per_kft: 0.13, x_ohm_per_kft: 0, power_factor: 0.85, phase: "three" });
  const expected = Math.sqrt(3) * 100 * 0.13 * 0.85 * 200 / 1000;
  assert.ok(Math.abs(r.drop_v - expected) < 1e-9);
  assert.ok(r.warnings.some((w) => w.includes("resistance-only")));
});

test("vd-reactance: a long run trips the 5% advisory", () => {
  const r = computeVoltageDropReactance({ system_voltage_v: 240, current_a: 60, length_ft: 400, r_ohm_per_kft: 0.4, x_ohm_per_kft: 0.05, power_factor: 0.85, phase: "single" });
  assert.ok(r.drop_percent > 5);
  assert.ok(r.advisory.includes("5%"));
});

test("vd-reactance: rejection paths (zero voltage/current/length, PF out of range, negative R/X)", () => {
  assert.ok("error" in computeVoltageDropReactance({ system_voltage_v: 0, current_a: 100, length_ft: 200, r_ohm_per_kft: 0.13 }));
  assert.ok("error" in computeVoltageDropReactance({ system_voltage_v: 480, current_a: 0, length_ft: 200, r_ohm_per_kft: 0.13 }));
  assert.ok("error" in computeVoltageDropReactance({ system_voltage_v: 480, current_a: 100, length_ft: 0, r_ohm_per_kft: 0.13 }));
  assert.ok("error" in computeVoltageDropReactance({ system_voltage_v: 480, current_a: 100, length_ft: 200, r_ohm_per_kft: 0.13, power_factor: 1.2 }));
  assert.ok("error" in computeVoltageDropReactance({ system_voltage_v: 480, current_a: 100, length_ft: 200, r_ohm_per_kft: -0.1 }));
});

// ---------------------------------------------------------------------------
// A.3 Power triangle solver
// ---------------------------------------------------------------------------

test("power-triangle: canonical 100 kW at 0.80 PF -> 125 kVA, 75 kVAR, 36.87 deg", () => {
  const r = computePowerTriangle(powerTriangleExample.inputs);
  assert.ok(Math.abs(r.kva - 125) < 1e-9);
  assert.ok(Math.abs(r.kvar - 75) < 1e-9);
  assert.ok(Math.abs(r.pf - 0.8) < 1e-12);
  assert.ok(Math.abs(r.angle_deg - 36.8699) < 1e-3);
});

test("power-triangle: kVA + kVAR solves real power", () => {
  const r = computePowerTriangle({ kva: 125, kvar: 75 });
  assert.ok(Math.abs(r.kw - 100) < 1e-9);
});

test("power-triangle: kW + kVAR solves apparent power", () => {
  const r = computePowerTriangle({ kw: 100, kvar: 75 });
  assert.ok(Math.abs(r.kva - 125) < 1e-9);
});

test("power-triangle: kVA + angle solves both legs", () => {
  const r = computePowerTriangle({ kva: 125, angle_deg: 36.86989764584402 });
  assert.ok(Math.abs(r.kw - 100) < 1e-6);
  assert.ok(Math.abs(r.kvar - 75) < 1e-6);
});

test("power-triangle: leading vs lagging is reflected in the label", () => {
  const lag = computePowerTriangle({ kw: 100, pf: 0.8, sign: "lagging" });
  const lead = computePowerTriangle({ kw: 100, pf: 0.8, sign: "leading" });
  assert.ok(lag.kvar_label.includes("lagging") && lag.kvar_label.startsWith("-"));
  assert.ok(lead.kvar_label.includes("leading") && lead.kvar_label.startsWith("+"));
});

test("power-triangle: PF and angle alone (shape only) is rejected", () => {
  assert.ok("error" in computePowerTriangle({ pf: 0.8, angle_deg: 36.87 }));
});

test("power-triangle: rejection paths (one input, PF>1, kW>kVA, kVAR>kVA, inconsistent PF/angle)", () => {
  assert.ok("error" in computePowerTriangle({ kw: 100 }));
  assert.ok("error" in computePowerTriangle({ kw: 100, pf: 1.5 }));
  assert.ok("error" in computePowerTriangle({ kw: 130, kva: 125 }));
  assert.ok("error" in computePowerTriangle({ kva: 100, kvar: 130 }));
  assert.ok("error" in computePowerTriangle({ pf: 0.8, angle_deg: 10, kw: 50 }));
});

// ---------------------------------------------------------------------------
// A.6 EV charger continuous load and panel impact
// ---------------------------------------------------------------------------

test("ev-charger: worked example (48 A on 200 A / 130 A existing) -> 60 A circuit, 190 A load, 10 A headroom", () => {
  const r = computeEvChargerLoad(evChargerLoadExample.inputs);
  assert.strictEqual(r.continuous_circuit_a, 60);
  assert.strictEqual(r.recommended_breaker_a, 60);
  assert.strictEqual(r.new_panel_load_a, 190);
  assert.strictEqual(r.headroom_a, 10);
  assert.ok(Math.abs(r.headroom_pct - 5) < 1e-9);
});

test("ev-charger: circuit ampacity is exactly 125% of nameplate", () => {
  for (const a of [16, 24, 32, 40, 48, 80]) {
    const r = computeEvChargerLoad({ charger_amps: a, main_breaker_a: 200, existing_load_a: 0 });
    assert.ok(Math.abs(r.continuous_circuit_a - a * 1.25) < 1e-9);
  }
});

test("ev-charger: conductor recommendation covers the continuous circuit ampacity", () => {
  const r = computeEvChargerLoad({ charger_amps: 48, main_breaker_a: 200, existing_load_a: 0 });
  assert.strictEqual(r.recommended_conductor_awg, "6");
});

test("ev-charger: headroom under 10% is flagged; busbar below new total is flagged", () => {
  const tight = computeEvChargerLoad({ charger_amps: 48, main_breaker_a: 200, existing_load_a: 130, busbar_rating_a: 150 });
  assert.ok(tight.warnings.some((w) => w.includes("headroom")));
  assert.ok(tight.warnings.some((w) => w.includes("busbar")));
});

test("ev-charger: load exceeding the main is flagged negative headroom", () => {
  const over = computeEvChargerLoad({ charger_amps: 80, main_breaker_a: 200, existing_load_a: 150 });
  assert.ok(over.headroom_a < 0);
  assert.ok(over.warnings.some((w) => w.includes("exceeds the main")));
});

test("ev-charger: rejection paths (80A+ on 100A panel, zero charger, zero main)", () => {
  assert.ok("error" in computeEvChargerLoad({ charger_amps: 90, main_breaker_a: 100 }));
  assert.ok("error" in computeEvChargerLoad({ charger_amps: 0, main_breaker_a: 200 }));
  assert.ok("error" in computeEvChargerLoad({ charger_amps: 40, main_breaker_a: 0 }));
});

// ---------------------------------------------------------------------------
// A.10 Conductor ambient + fill ampacity adjustment
// ---------------------------------------------------------------------------

test("ambient-adjust: worked example (75 A base, 90 C col, 50 C ambient, 12 conductors) -> 30.75 A", () => {
  const r = computeAmbientAmpacityAdjust(ambientAmpacityAdjustExample.inputs);
  assert.strictEqual(r.ambient_factor, 0.82);
  assert.strictEqual(r.fill_factor, 0.5);
  assert.ok(Math.abs(r.combined_factor - 0.41) < 1e-9);
  assert.ok(Math.abs(r.adjusted_ampacity_a - 30.75) < 1e-6);
});

test("ambient-adjust: 26-30 C ambient with <=3 conductors is no derate", () => {
  const r = computeAmbientAmpacityAdjust({ base_ampacity_a: 100, temp_column: 75, ambient_c: 30, conductor_count: 3 });
  assert.strictEqual(r.ambient_factor, 1.0);
  assert.strictEqual(r.fill_factor, 1.0);
  assert.strictEqual(r.adjusted_ampacity_a, 100);
});

test("ambient-adjust: fill factor steps (4-6, 7-9, 10-20, 21-30, 31-40, 41+)", () => {
  const f = (n) => computeAmbientAmpacityAdjust({ base_ampacity_a: 100, temp_column: 75, ambient_c: 30, conductor_count: n }).fill_factor;
  assert.strictEqual(f(5), 0.80);
  assert.strictEqual(f(8), 0.70);
  assert.strictEqual(f(15), 0.50);
  assert.strictEqual(f(25), 0.45);
  assert.strictEqual(f(35), 0.40);
  assert.strictEqual(f(50), 0.35);
});

test("ambient-adjust: each temperature column has the correct 31-35 C factor", () => {
  assert.strictEqual(computeAmbientAmpacityAdjust({ base_ampacity_a: 100, temp_column: 60, ambient_c: 35, conductor_count: 1 }).ambient_factor, 0.91);
  assert.strictEqual(computeAmbientAmpacityAdjust({ base_ampacity_a: 100, temp_column: 75, ambient_c: 35, conductor_count: 1 }).ambient_factor, 0.94);
  assert.strictEqual(computeAmbientAmpacityAdjust({ base_ampacity_a: 100, temp_column: 90, ambient_c: 35, conductor_count: 1 }).ambient_factor, 0.96);
});

test("ambient-adjust: more than 40 conductors applies the 0.35 floor with a warning", () => {
  const r = computeAmbientAmpacityAdjust({ base_ampacity_a: 100, temp_column: 75, ambient_c: 30, conductor_count: 45 });
  assert.strictEqual(r.fill_factor, 0.35);
  assert.ok(r.warnings.some((w) => w.includes("40")));
});

test("ambient-adjust: rejection paths (zero base, bad column, ambient above column range, below -10 C)", () => {
  assert.ok("error" in computeAmbientAmpacityAdjust({ base_ampacity_a: 0, temp_column: 75, ambient_c: 30 }));
  assert.ok("error" in computeAmbientAmpacityAdjust({ base_ampacity_a: 50, temp_column: 70, ambient_c: 30 }));
  assert.ok("error" in computeAmbientAmpacityAdjust({ base_ampacity_a: 50, temp_column: 60, ambient_c: 58 }));
  assert.ok("error" in computeAmbientAmpacityAdjust({ base_ampacity_a: 50, temp_column: 75, ambient_c: -20 }));
});

// ---------------------------------------------------------------------------
// A.11 Service load, NEC 220.82 optional method
// ---------------------------------------------------------------------------

test("service-optional: 2400 ft^2 worked example -> 20,680 VA general demand, 29,680 VA total, 123.67 A", () => {
  const r = computeServiceLoadOptional(serviceLoadOptionalExample.inputs);
  assert.strictEqual(r.general_va, 36700);
  assert.strictEqual(r.general_demand_va, 20680);
  assert.strictEqual(r.hvac_demand_va, 9000);
  assert.strictEqual(r.optional_total_va, 29680);
  assert.ok(Math.abs(r.optional_demand_a - 123.6667) < 1e-3);
});

test("service-optional: first 10 kVA at 100%, remainder at 40%", () => {
  // A 12,000 VA general load -> 10000 + 0.4*2000 = 10,800 VA.
  // Construct general = 12,000 from area + circuits + appliances.
  const r = computeServiceLoadOptional({ area_ft2: 1000, small_appliance_circuits: 0, laundry_circuits: 0, fixed_appliances_kw: 9, service_voltage: 240 });
  // general = 3*1000 + 0 + 9000 = 12,000.
  assert.strictEqual(r.general_va, 12000);
  assert.strictEqual(r.general_demand_va, 10800);
});

test("service-optional: general load at or below 10 kVA is taken at 100%", () => {
  const r = computeServiceLoadOptional({ area_ft2: 800, small_appliance_circuits: 2, laundry_circuits: 1, service_voltage: 240 });
  assert.strictEqual(r.general_demand_va, r.general_va);
});

test("service-optional: HVAC adds the larger of heating vs cooling", () => {
  const heatBig = computeServiceLoadOptional({ area_ft2: 2000, hvac_heating_kw: 10, hvac_cooling_kw: 4 });
  const coolBig = computeServiceLoadOptional({ area_ft2: 2000, hvac_heating_kw: 4, hvac_cooling_kw: 10 });
  assert.strictEqual(heatBig.hvac_demand_va, 10000);
  assert.strictEqual(coolBig.hvac_demand_va, 10000);
});

test("service-optional: EV charger nameplate adds to the general load", () => {
  const noEv = computeServiceLoadOptional({ area_ft2: 2000, service_voltage: 240 });
  const withEv = computeServiceLoadOptional({ area_ft2: 2000, ev_charger_a: 40, service_voltage: 240 });
  assert.strictEqual(withEv.general_va - noEv.general_va, 40 * 240);
});

test("service-optional: tiny and huge dwellings are flagged", () => {
  assert.ok(computeServiceLoadOptional({ area_ft2: 300 }).warnings.some((w) => w.includes("below")));
  assert.ok(computeServiceLoadOptional({ area_ft2: 12000 }).warnings.some((w) => w.includes("above")));
});

test("service-optional: rejection paths (zero area, negative appliance kW)", () => {
  assert.ok("error" in computeServiceLoadOptional({ area_ft2: 0 }));
  assert.ok("error" in computeServiceLoadOptional({ area_ft2: 2000, range_kw: -1 }));
});
