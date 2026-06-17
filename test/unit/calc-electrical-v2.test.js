// Unit tests for calc-electrical.js v2 utilities (65-71). At least 10 cases per utility per spec section 13.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeServiceLoad,
  computeGeneratorSize,
  computeVoltageImbalance,
  computeGFCIReference,
  computeLightingDensity,
  STANDARD_SERVICE_AMPACITIES,
  GFCI_AFCI_AREAS,
  LIGHTING_DENSITY_W_PER_FT2,
  serviceLoadExample,
  generatorSizeExample,
  voltageImbalanceExample,
  gfciReferenceExample,
  lightingDensityExample,
} from "../../calc-electrical.js";
// spec-v88: pv-string-sizing + battery-runtime relocated to calc-solar.js.
import {
  computePVStringSizing,
  computeBatteryRuntime,
  pvStringSizingExample,
  batteryRuntimeExample,
} from "../../calc-solar.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 65: Service Load Calculation ---

test("Service load: example yields next-standard at or above 100 A", () => {
  const r = computeServiceLoad(serviceLoadExample.inputs);
  assert.ok(r.required_A > 0);
  assert.ok(r.next_standard_A >= 100);
  assert.ok(STANDARD_SERVICE_AMPACITIES.includes(r.next_standard_A));
});

test("Service load: small home picks 100 A or less", () => {
  const r = computeServiceLoad({ area_ft2: 800, fixed_appliances_W: 0, range_W: 0, dryer_W: 0, hvac_cooling_W: 0, hvac_heating_W: 0 });
  assert.ok(r.next_standard_A <= 100);
});

test("Service load: zero-area / zero-load returns dryer minimum 5 kW", () => {
  const r = computeServiceLoad({ small_appliance_circuits: 0, laundry_circuits: 0 });
  // dryer_demand floor is 5000 W -> 5000 / 240 ~ 20.83 A.
  assert.ok(close(r.required_A, 5000 / 240, 0.5));
});

test("Service load: HVAC takes the larger of cooling vs heating", () => {
  const r = computeServiceLoad({ hvac_cooling_W: 3000, hvac_heating_W: 8000 });
  assert.equal(r.breakdown.hvac_demand_W, 8000);
  const r2 = computeServiceLoad({ hvac_cooling_W: 9000, hvac_heating_W: 4000 });
  assert.equal(r2.breakdown.hvac_demand_W, 9000);
});

test("Service load: range first 8 kW at 100% then 40%", () => {
  const r = computeServiceLoad({ range_W: 12000 });
  assert.ok(close(r.breakdown.range_demand_W, 8000 + (12000 - 8000) * 0.4));
});

test("Service load: range under 8 kW counted at 100%", () => {
  const r = computeServiceLoad({ range_W: 6000 });
  assert.equal(r.breakdown.range_demand_W, 6000);
});

test("Service load: general demand under 3000 W counted at 100%", () => {
  const r = computeServiceLoad({ area_ft2: 0, small_appliance_circuits: 1, laundry_circuits: 0 });
  assert.ok(r.breakdown.general_demand_W <= 1500);
});

test("Service load: general demand above 3000 W applies 35% factor", () => {
  const r = computeServiceLoad({ area_ft2: 2000, small_appliance_circuits: 2, laundry_circuits: 1 });
  // 6000 (lighting) + 3000 + 1500 = 10500. 3000 + 7500*0.35 = 5625.
  assert.ok(close(r.breakdown.general_demand_W, 5625, 0.5));
});

test("Service load: rounds up to next standard ampacity", () => {
  const r = computeServiceLoad({ small_appliance_circuits: 0, laundry_circuits: 0, fixed_appliances_W: 24000 });
  // 24000 + 5000 dryer = 29000 W -> ~120.8 A. Next standard is 125 A.
  assert.equal(r.next_standard_A, 125);
});

test("Service load: very large load yields 400 A or above-table", () => {
  const r = computeServiceLoad({ fixed_appliances_W: 90000 });
  assert.ok(r.next_standard_A >= 400);
});

test("Service load: dryer input greater than 5 kW honored", () => {
  const r = computeServiceLoad({ dryer_W: 7500 });
  assert.equal(r.breakdown.dryer_demand_W, 7500);
});

// --- Utility 66: Generator Sizing ---

test("Generator: example running and surge match expected", () => {
  const r = computeGeneratorSize(generatorSizeExample.inputs);
  assert.equal(r.running_W, 1900);
  assert.equal(r.surge_W, 1900 + (2200 - 700));
});

test("Generator: empty list yields zero", () => {
  const r = computeGeneratorSize({ items: [] });
  assert.equal(r.running_W, 0);
  assert.equal(r.surge_W, 0);
});

test("Generator: items with starting equal to running have no surge excess", () => {
  const r = computeGeneratorSize({ items: [{ running_watts: 500, starting_watts: 500 }, { running_watts: 200, starting_watts: 200 }] });
  assert.equal(r.running_W, 700);
  assert.equal(r.surge_W, 700);
});

test("Generator: only the largest excess counts", () => {
  const r = computeGeneratorSize({ items: [
    { running_watts: 1000, starting_watts: 4000 },
    { running_watts: 1000, starting_watts: 5000 },
  ] });
  // Running 2000; biggest excess 4000 (5000 - 1000). Surge 6000.
  assert.equal(r.running_W, 2000);
  assert.equal(r.surge_W, 6000);
});

test("Generator: kW outputs are W/1000", () => {
  const r = computeGeneratorSize({ items: [{ running_watts: 3000, starting_watts: 3000 }] });
  assert.ok(close(r.running_kW, 3));
  assert.ok(close(r.surge_kW, 3));
});

test("Generator: no item with starting < running causes negative excess", () => {
  const r = computeGeneratorSize({ items: [{ running_watts: 500, starting_watts: 200 }] });
  assert.equal(r.surge_W, 500);
});

test("Generator: ten items sum correctly", () => {
  const items = Array.from({ length: 10 }, () => ({ running_watts: 100, starting_watts: 100 }));
  const r = computeGeneratorSize({ items });
  assert.equal(r.running_W, 1000);
  assert.equal(r.surge_W, 1000);
});

test("Generator: missing fields treated as 0", () => {
  const r = computeGeneratorSize({ items: [{ running_watts: 600 }, { starting_watts: 1200 }] });
  assert.equal(r.running_W, 600);
  // biggest excess from item 2: 1200 - 0 = 1200; surge = 600 + 1200 = 1800.
  assert.equal(r.surge_W, 1800);
});

test("Generator: surge never less than running", () => {
  const r = computeGeneratorSize({ items: [{ running_watts: 800, starting_watts: 100 }] });
  assert.ok(r.surge_W >= r.running_W);
});

test("Generator: large industrial load", () => {
  const r = computeGeneratorSize({ items: [{ running_watts: 50000, starting_watts: 200000 }] });
  assert.equal(r.surge_kW, 200);
});

// --- Utility 67: Solar PV String Sizing ---

test("PV string: example yields max>=min", () => {
  const r = computePVStringSizing(pvStringSizingExample.inputs);
  assert.ok(!r.error);
  assert.ok(r.max_series >= r.min_series);
  assert.equal(r.flag, false);
});

test("PV string: cold Voc inflates above nameplate", () => {
  const r = computePVStringSizing(pvStringSizingExample.inputs);
  assert.ok(r.cold_voc_V > pvStringSizingExample.inputs.module_voc_V);
});

test("PV string: warm Vmp deflates below nameplate", () => {
  const r = computePVStringSizing(pvStringSizingExample.inputs);
  assert.ok(r.warm_vmp_V < pvStringSizingExample.inputs.module_vmp_V);
});

test("PV string: missing Voc returns error", () => {
  const r = computePVStringSizing({ module_voc_V: 0, module_vmp_V: 33 });
  assert.ok(r.error);
});

test("PV string: tighter Vdc max lowers max_series", () => {
  const a = computePVStringSizing({ ...pvStringSizingExample.inputs, inverter_vdc_max_V: 600 });
  const b = computePVStringSizing({ ...pvStringSizingExample.inputs, inverter_vdc_max_V: 400 });
  assert.ok(b.max_series < a.max_series);
});

test("PV string: higher MPPT min raises min_series", () => {
  const a = computePVStringSizing({ ...pvStringSizingExample.inputs, inverter_mppt_min_V: 200 });
  const b = computePVStringSizing({ ...pvStringSizingExample.inputs, inverter_mppt_min_V: 300 });
  assert.ok(b.min_series >= a.min_series);
});

test("PV string: infeasible flag when min > max", () => {
  const r = computePVStringSizing({
    module_voc_V: 50, module_vmp_V: 40, voc_temp_coeff_pct_per_C: 0.3,
    record_low_C: -30, record_high_C: 60,
    inverter_mppt_min_V: 500, inverter_mppt_max_V: 500, inverter_vdc_max_V: 600,
  });
  assert.equal(r.flag, true);
});

test("PV string: zero coefficient leaves Voc and Vmp unchanged", () => {
  const r = computePVStringSizing({
    module_voc_V: 40, module_vmp_V: 33, voc_temp_coeff_pct_per_C: 0,
    record_low_C: -10, record_high_C: 45,
    inverter_mppt_min_V: 200, inverter_mppt_max_V: 480, inverter_vdc_max_V: 600,
  });
  assert.ok(close(r.cold_voc_V, 40));
  assert.ok(close(r.warm_vmp_V, 33));
});

test("PV string: max_series is a non-negative integer", () => {
  const r = computePVStringSizing(pvStringSizingExample.inputs);
  assert.equal(Number.isInteger(r.max_series), true);
  assert.ok(r.max_series >= 0);
});

test("PV string: lower record_low_C inflates cold Voc more", () => {
  const a = computePVStringSizing({ ...pvStringSizingExample.inputs, record_low_C: 0 });
  const b = computePVStringSizing({ ...pvStringSizingExample.inputs, record_low_C: -30 });
  assert.ok(b.cold_voc_V > a.cold_voc_V);
});

test("PV string: negative coefficient is treated by magnitude", () => {
  const inputs = { ...pvStringSizingExample.inputs, voc_temp_coeff_pct_per_C: -0.30 };
  const a = computePVStringSizing(inputs);
  const b = computePVStringSizing({ ...pvStringSizingExample.inputs });
  assert.ok(close(a.cold_voc_V, b.cold_voc_V));
});

// --- Utility 68: Battery Runtime ---

test("Battery runtime: example ~6.67 hours", () => {
  const r = computeBatteryRuntime(batteryRuntimeExample.inputs);
  // 100 Ah * 12 V * 0.8 / 120 = 8 hr.
  assert.ok(close(r.hours, 8));
});

test("Battery runtime: zero load returns error", () => {
  const r = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 100, load_W: 0 });
  assert.ok(r.error);
});

test("Battery runtime: 100% DoD doubles vs 50% DoD", () => {
  const a = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 50, load_W: 60 });
  const b = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 100, load_W: 60 });
  assert.ok(close(b.hours, 2 * a.hours, 0.05));
});

test("Battery runtime: minutes equals hours * 60", () => {
  const r = computeBatteryRuntime(batteryRuntimeExample.inputs);
  assert.ok(close(r.minutes, r.hours * 60));
});

test("Battery runtime: usable Wh = Ah * V * DoD", () => {
  const r = computeBatteryRuntime({ amp_hours: 100, system_V: 24, dod_percent: 50, load_W: 100 });
  assert.equal(r.usable_Wh, 100 * 24 * 0.5);
});

test("Battery runtime: Peukert k>1 reduces hours vs k=1 at high load", () => {
  const a = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 100, load_W: 600, peukert_k: 1 });
  const b = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 100, load_W: 600, peukert_k: 1.2 });
  assert.ok(b.hours < a.hours);
});

test("Battery runtime: invalid Ah returns error", () => {
  const r = computeBatteryRuntime({ amp_hours: 0, system_V: 12, load_W: 50 });
  assert.ok(r.error);
});

test("Battery runtime: doubled load halves time", () => {
  const a = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 100, load_W: 60 });
  const b = computeBatteryRuntime({ amp_hours: 100, system_V: 12, dod_percent: 100, load_W: 120 });
  assert.ok(close(b.hours, a.hours / 2, 0.01));
});

test("Battery runtime: invalid V returns error", () => {
  const r = computeBatteryRuntime({ amp_hours: 100, system_V: 0, load_W: 50 });
  assert.ok(r.error);
});

test("Battery runtime: 100 Ah at 48 V, 200 W, 100% DoD ~ 24 hr", () => {
  const r = computeBatteryRuntime({ amp_hours: 100, system_V: 48, dod_percent: 100, load_W: 200 });
  assert.ok(close(r.hours, 24));
});

// --- Utility 69: Voltage Imbalance ---

test("Voltage imbalance: example yields ~0.7%", () => {
  const r = computeVoltageImbalance(voltageImbalanceExample.inputs);
  assert.ok(r.imbalance_percent > 0.5 && r.imbalance_percent < 1.5);
});

test("Voltage imbalance: balanced lines yield 0%", () => {
  const r = computeVoltageImbalance({ V_a: 480, V_b: 480, V_c: 480 });
  assert.ok(close(r.imbalance_percent, 0));
  assert.ok(close(r.derate_factor, 1));
});

test("Voltage imbalance: average correct", () => {
  const r = computeVoltageImbalance({ V_a: 480, V_b: 470, V_c: 460 });
  assert.ok(close(r.average_V, 470));
});

test("Voltage imbalance: derate at 2% imbalance approx 0.9992", () => {
  // 1 - 2*(0.02)^2 = 1 - 0.0008 = 0.9992
  const v_avg = 470;
  // Want max deviation = 0.02 * 470 = 9.4 -> set V_a = v_avg + 9.4
  const r = computeVoltageImbalance({ V_a: 479.4, V_b: 470, V_c: 460.6 });
  assert.ok(Math.abs(r.imbalance_percent - 2.0) < 0.05);
  assert.ok(Math.abs(r.derate_factor - 0.9992) < 0.001);
});

test("Voltage imbalance: zero voltage returns error", () => {
  const r = computeVoltageImbalance({ V_a: 0, V_b: 480, V_c: 480 });
  assert.ok(r.error);
});

test("Voltage imbalance: max deviation captured correctly", () => {
  const r = computeVoltageImbalance({ V_a: 500, V_b: 480, V_c: 460 });
  assert.ok(close(r.average_V, 480));
  assert.ok(close(r.max_deviation_V, 20));
});

test("Voltage imbalance: percent symmetric to which line is high", () => {
  const a = computeVoltageImbalance({ V_a: 500, V_b: 480, V_c: 460 });
  const b = computeVoltageImbalance({ V_a: 460, V_b: 500, V_c: 480 });
  assert.ok(close(a.imbalance_percent, b.imbalance_percent));
});

test("Voltage imbalance: derate decreases as imbalance grows", () => {
  const a = computeVoltageImbalance({ V_a: 481, V_b: 480, V_c: 479 });
  const b = computeVoltageImbalance({ V_a: 490, V_b: 480, V_c: 470 });
  assert.ok(b.derate_factor < a.derate_factor);
});

test("Voltage imbalance: missing input returns error", () => {
  const r = computeVoltageImbalance({ V_a: 480, V_b: 480 });
  assert.ok(r.error);
});

test("Voltage imbalance: 5% imbalance gives derate ~0.995", () => {
  // 1 - 2 * 0.05^2 = 0.995
  const r = computeVoltageImbalance({ V_a: 504, V_b: 480, V_c: 456 });
  assert.ok(close(r.imbalance_percent, 5, 0.1));
  assert.ok(close(r.derate_factor, 0.995, 0.001));
});

// --- Utility 70: GFCI/AFCI Reference ---

test("GFCI reference: returns area list", () => {
  const r = computeGFCIReference();
  assert.ok(Array.isArray(r.areas));
  assert.equal(r.areas.length, GFCI_AFCI_AREAS.length);
});

test("GFCI reference: every entry has area, gfci, afci, nec_ref", () => {
  for (const a of GFCI_AFCI_AREAS) {
    assert.ok(typeof a.area === "string");
    assert.ok(typeof a.gfci === "string");
    assert.ok(typeof a.afci === "string");
    assert.ok(typeof a.nec_ref === "string");
  }
});

test("GFCI reference: includes kitchen and bathroom", () => {
  const titles = GFCI_AFCI_AREAS.map((a) => a.area.toLowerCase()).join("|");
  assert.ok(titles.includes("kitchen"));
  assert.ok(titles.includes("bathroom"));
});

test("GFCI reference: NEC references cite by section number, not text", () => {
  for (const a of GFCI_AFCI_AREAS) {
    assert.ok(/NEC\s+\d/.test(a.nec_ref));
  }
});

test("GFCI reference: example count equals areas length", () => {
  assert.equal(gfciReferenceExample.expected.count, GFCI_AFCI_AREAS.length);
});

test("GFCI reference: bedroom mentions AFCI", () => {
  const bedroom = GFCI_AFCI_AREAS.find((a) => /bedroom/i.test(a.area));
  assert.ok(bedroom);
  assert.ok(/AFCI|Required/i.test(bedroom.afci));
});

test("GFCI reference: outdoor mentions GFCI requirement", () => {
  const outdoor = GFCI_AFCI_AREAS.find((a) => /outdoor/i.test(a.area));
  assert.ok(outdoor);
  assert.ok(/Required/i.test(outdoor.gfci));
});

test("GFCI reference: kitchen requires GFCI on countertops", () => {
  const kitchen = GFCI_AFCI_AREAS.find((a) => /kitchen/i.test(a.area));
  assert.ok(kitchen);
  assert.ok(/countertop|sink/i.test(kitchen.gfci));
});

test("GFCI reference: garage requires GFCI", () => {
  const garage = GFCI_AFCI_AREAS.find((a) => /garage/i.test(a.area));
  assert.ok(garage);
  assert.ok(/Required/i.test(garage.gfci));
});

test("GFCI reference: gfci and afci texts are non-trivial", () => {
  for (const a of GFCI_AFCI_AREAS) {
    assert.ok(a.gfci.length > 20);
    assert.ok(a.afci.length > 10);
  }
});

// --- Utility 71: Lighting Density ---

test("Lighting density: example 1000 ft^2 office -> 1000 W", () => {
  const r = computeLightingDensity(lightingDensityExample.inputs);
  assert.equal(r.target_W, 1000);
  assert.equal(r.w_per_ft2, 1.0);
});

test("Lighting density: warehouse less than office for same area", () => {
  const a = computeLightingDensity({ area_ft2: 1000, occupancy_class: "office" });
  const b = computeLightingDensity({ area_ft2: 1000, occupancy_class: "warehouse" });
  assert.ok(b.target_W < a.target_W);
});

test("Lighting density: unknown class returns error", () => {
  const r = computeLightingDensity({ area_ft2: 100, occupancy_class: "spaceship" });
  assert.ok(r.error);
});

test("Lighting density: zero area returns error", () => {
  const r = computeLightingDensity({ area_ft2: 0, occupancy_class: "office" });
  assert.ok(r.error);
});

test("Lighting density: scales linearly with area", () => {
  const a = computeLightingDensity({ area_ft2: 500, occupancy_class: "office" });
  const b = computeLightingDensity({ area_ft2: 1500, occupancy_class: "office" });
  assert.ok(close(b.target_W, 3 * a.target_W));
});

test("Lighting density: parking_garage benchmark is 0.2", () => {
  assert.equal(LIGHTING_DENSITY_W_PER_FT2.parking_garage, 0.2);
});

test("Lighting density: every benchmark is positive and at most 2", () => {
  for (const v of Object.values(LIGHTING_DENSITY_W_PER_FT2)) {
    assert.ok(v > 0 && v <= 2);
  }
});

test("Lighting density: classroom 1000 ft^2 -> 1100 W", () => {
  const r = computeLightingDensity({ area_ft2: 1000, occupancy_class: "classroom" });
  assert.equal(r.target_W, 1100);
});

test("Lighting density: result preserves inputs", () => {
  const r = computeLightingDensity({ area_ft2: 1234, occupancy_class: "retail" });
  assert.equal(r.area_ft2, 1234);
});

test("Lighting density: 8 occupancy classes available", () => {
  assert.equal(Object.keys(LIGHTING_DENSITY_W_PER_FT2).length, 8);
});
