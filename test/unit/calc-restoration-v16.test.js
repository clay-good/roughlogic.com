// spec-v16 D.5 unit tests for the restoration equipment power-draw vs
// available circuit-capacity tile (NEC 210.20(A) 80%-continuous check).
// The worked example cross-checks the arithmetic the citation names.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeEquipmentCircuitLoad, equipmentCircuitLoadExample,
  RESTORATION_EQUIPMENT_AMPS, RESTORATION_RENDERERS,
} from "../../calc-restoration.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

test("equipment-power-draw: 4 air movers + 1 LGR on 20 A -> 18.5 A, 2 circuits", () => {
  const r = computeEquipmentCircuitLoad(equipmentCircuitLoadExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.total_amps, 18.5, 1e-9));
  assert.ok(close(r.continuous_limit_A, 16, 1e-9));
  assert.strictEqual(r.circuits_required, 2);
});

test("equipment-power-draw: total draw = sum(qty * nameplate amps) + other load", () => {
  const r = computeEquipmentCircuitLoad({ qty_lgr_dehu: 2, qty_air_mover: 3, qty_hepa_500: 1, other_amps: 1.5, breaker_A: 20 });
  const expected = 2 * 8.5 + 3 * 2.5 + 1 * 3.5 + 1.5;
  assert.ok(close(r.total_amps, expected, 1e-9));
});

test("equipment-power-draw: continuous limit is 80% of the breaker rating (NEC 210.20(A))", () => {
  assert.ok(close(computeEquipmentCircuitLoad({ qty_air_mover: 1, breaker_A: 15 }).continuous_limit_A, 12, 1e-9));
  assert.ok(close(computeEquipmentCircuitLoad({ qty_air_mover: 1, breaker_A: 20 }).continuous_limit_A, 16, 1e-9));
  assert.ok(close(computeEquipmentCircuitLoad({ qty_air_mover: 1, breaker_A: 30 }).continuous_limit_A, 24, 1e-9));
});

test("equipment-power-draw: circuits required = ceil(total / (0.8 * breaker))", () => {
  // 6 air movers = 15 A; 15 / 16 -> 1 circuit. 7 air movers = 17.5 A -> 2.
  assert.strictEqual(computeEquipmentCircuitLoad({ qty_air_mover: 6, breaker_A: 20 }).circuits_required, 1);
  assert.strictEqual(computeEquipmentCircuitLoad({ qty_air_mover: 7, breaker_A: 20 }).circuits_required, 2);
});

test("equipment-power-draw: a load over the per-circuit limit warns and needs more circuits", () => {
  const r = computeEquipmentCircuitLoad({ qty_air_mover: 4, qty_lgr_dehu: 1, breaker_A: 20 });
  assert.ok(r.total_amps > r.continuous_limit_A);
  assert.ok(r.warnings.some((w) => /210\.20/.test(w)));
});

test("equipment-power-draw: a single unit larger than its own circuit limit is flagged", () => {
  // Heat-drying unit draws 12 A; on a 15 A circuit the continuous limit is 12 A
  // (exactly fits), so on a 15 A circuit a 12 A unit does NOT trip the flag...
  const ok = computeEquipmentCircuitLoad({ qty_heat_dryer: 1, breaker_A: 15 });
  assert.ok(!ok.warnings.some((w) => /larger dedicated/.test(w)));
  // ...but two heat dryers exceed one 15 A circuit's continuous limit.
  const two = computeEquipmentCircuitLoad({ qty_heat_dryer: 2, breaker_A: 15 });
  assert.strictEqual(two.circuits_required, 2);
});

test("equipment-power-draw: total VA = total amps * circuit voltage", () => {
  const r = computeEquipmentCircuitLoad({ qty_air_mover: 4, qty_lgr_dehu: 1, breaker_A: 20, voltage: 120 });
  assert.ok(close(r.total_va, 18.5 * 120, 1e-9));
  const r240 = computeEquipmentCircuitLoad({ qty_air_mover: 4, qty_lgr_dehu: 1, breaker_A: 20, voltage: 240 });
  assert.ok(close(r240.total_va, 18.5 * 240, 1e-9));
});

test("equipment-power-draw: fractional and negative quantities are floored to whole non-negative counts", () => {
  const r = computeEquipmentCircuitLoad({ qty_air_mover: 2.9, qty_lgr_dehu: -1, breaker_A: 20 });
  // 2.9 -> 2 air movers; -1 -> 0 LGR.
  assert.ok(close(r.total_amps, 2 * 2.5, 1e-9));
});

test("equipment-power-draw: no equipment and no other load is rejected", () => {
  assert.ok("error" in computeEquipmentCircuitLoad({ breaker_A: 20 }));
  assert.ok("error" in computeEquipmentCircuitLoad({ qty_air_mover: 0, other_amps: 0, breaker_A: 20 }));
});

test("equipment-power-draw: a non-positive breaker rating is rejected", () => {
  assert.ok("error" in computeEquipmentCircuitLoad({ qty_air_mover: 4, breaker_A: 0 }));
  // Nameplate table carries the four equipment classes.
  assert.strictEqual(RESTORATION_EQUIPMENT_AMPS.lgr_dehu.amps, 8.5);
  assert.strictEqual(RESTORATION_EQUIPMENT_AMPS.air_mover.amps, 2.5);
});

test("v16 restoration renderer is registered in RESTORATION_RENDERERS", () => {
  assert.strictEqual(typeof RESTORATION_RENDERERS["equipment-power-draw"], "function");
});
