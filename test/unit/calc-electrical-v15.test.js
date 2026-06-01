// spec-v15 unit tests for the two v15 Group A tiles landed in this pass:
//   A.8 PV interconnection 120% busbar rule (NEC 705.12)
//   A.9 Off-grid battery bank sizing (IEEE 1013 / 1561)
//
// Both are pure arithmetic. The assertions pin the published-rule constants
// (the 1.20 busbar multiplier; the usable_Wh -> nameplate_Wh -> Ah chain) so a
// future edit that changed a constant or swapped an operator fails loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePvInterconnectionBusbar, pvInterconnectionBusbarExample,
  computeOffGridBattery, offGridBatteryExample,
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
