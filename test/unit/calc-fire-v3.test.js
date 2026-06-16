// Unit tests for the v3 technical-rescue utilities (159-161). Relocated from
// calc-fire.js to calc-rescue.js by the spec-v82 cap-relief split; the moved
// compute functions, examples, and tables are byte-for-byte unchanged.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeConfinedSpacePurge, confinedSpacePurgeExample,
  computeRopeMA, ropeMAExample, ROPE_RIGS,
  computeSlingAngle, slingAngleExample,
} from "../../calc-rescue.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 159 Confined space purge
test("Purge: example 1000 ft^3 / 200 cfm / 7 -> 35 min", () => { const r = computeConfinedSpacePurge(confinedSpacePurgeExample.inputs); assert.ok(close(r.minutes, 35, 0.01)); });
test("Purge: bigger volume -> more time", () => { const a = computeConfinedSpacePurge({ volume_ft3: 500, blower_cfm: 200, target_purges: 7 }); const b = computeConfinedSpacePurge({ volume_ft3: 2000, blower_cfm: 200, target_purges: 7 }); assert.ok(b.minutes > a.minutes); });
test("Purge: more cfm -> less time", () => { const a = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 100, target_purges: 7 }); const b = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 500, target_purges: 7 }); assert.ok(b.minutes < a.minutes); });
test("Purge: zero volume errors", () => { const r = computeConfinedSpacePurge({ volume_ft3: 0, blower_cfm: 200, target_purges: 7 }); assert.ok(r.error); });
test("Purge: zero cfm errors", () => { const r = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 0, target_purges: 7 }); assert.ok(r.error); });
test("Purge: zero purges errors", () => { const r = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 0 }); assert.ok(r.error); });
test("Purge: scales linearly with N", () => { const a = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 5 }); const b = computeConfinedSpacePurge({ volume_ft3: 1000, blower_cfm: 200, target_purges: 10 }); assert.ok(close(b.minutes / a.minutes, 2, 0.001)); });
test("Purge: big space small blower long time", () => { const r = computeConfinedSpacePurge({ volume_ft3: 50000, blower_cfm: 100, target_purges: 7 }); assert.ok(r.minutes > 100); });
test("Purge: identity check 1*1/1 = 1", () => { const r = computeConfinedSpacePurge({ volume_ft3: 1, blower_cfm: 1, target_purges: 1 }); assert.equal(r.minutes, 1); });
test("Purge: returns finite for normal inputs", () => { const r = computeConfinedSpacePurge({ volume_ft3: 800, blower_cfm: 250, target_purges: 7 }); assert.ok(Number.isFinite(r.minutes)); });

// 160 Rope MA
test("Rope MA: example 4:1 0.9 efficiency", () => { const r = computeRopeMA(ropeMAExample.inputs); const expected_ma = 4 * Math.pow(0.9, 3); assert.ok(close(r.actual_ma, expected_ma, 0.001)); });
test("Rope MA: theoretical from rig", () => { const r = computeRopeMA({ rig: "5:1", efficiency: 1.0, load_lb: 100 }); assert.equal(r.theoretical_ma, 5); });
test("Rope MA: 1:1 has no pulley losses", () => { const r = computeRopeMA({ rig: "1:1", efficiency: 0.5, load_lb: 100 }); assert.equal(r.actual_ma, 1); });
test("Rope MA: lower efficiency -> lower actual MA", () => { const a = computeRopeMA({ rig: "5:1", efficiency: 0.95, load_lb: 100 }); const b = computeRopeMA({ rig: "5:1", efficiency: 0.7, load_lb: 100 }); assert.ok(b.actual_ma < a.actual_ma); });
test("Rope MA: haul force = load / actual MA", () => { const r = computeRopeMA({ rig: "3:1", efficiency: 0.9, load_lb: 600 }); assert.ok(close(r.haul_force_lb, 600 / r.actual_ma, 0.001)); });
test("Rope MA: unknown rig errors", () => { const r = computeRopeMA({ rig: "x", efficiency: 0.9, load_lb: 100 }); assert.ok(r.error); });
test("Rope MA: bad efficiency errors", () => { const r = computeRopeMA({ rig: "3:1", efficiency: 1.5, load_lb: 100 }); assert.ok(r.error); });
test("Rope MA: negative load errors", () => { const r = computeRopeMA({ rig: "3:1", efficiency: 0.9, load_lb: -100 }); assert.ok(r.error); });
test("Rope MA: every rig has positive MA", () => { for (const k of Object.keys(ROPE_RIGS)) assert.ok(ROPE_RIGS[k].ma > 0); });
test("Rope MA: T-method ~ 5", () => { const r = computeRopeMA({ rig: "T_method", efficiency: 1.0, load_lb: 100 }); assert.equal(r.theoretical_ma, 5); });

// 161 Sling angle
test("Sling: example basket 60 deg yields tension > load/2", () => { const r = computeSlingAngle(slingAngleExample.inputs); assert.ok(r.tension_per_leg_lb > 1000); });
test("Sling: small angle blows up tension (limit case)", () => { const r = computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 1, n_legs: 2 }); assert.ok(r.tension_per_leg_lb > 50000); });
test("Sling: vertical = load/n", () => { const r = computeSlingAngle({ load_lb: 1000, sling_config: "vertical", included_angle_deg: 60, n_legs: 2 }); assert.equal(r.tension_per_leg_lb, 500); });
test("Sling: choker has reduction factor 0.75", () => { const a = computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 }); const b = computeSlingAngle({ load_lb: 1000, sling_config: "choker", included_angle_deg: 60, n_legs: 2 }); assert.ok(close(b.tension_per_leg_lb / a.tension_per_leg_lb, 1 / 0.75, 0.001)); });
test("Sling: 180 deg out of range", () => { const r = computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 180, n_legs: 2 }); assert.ok(r.error); });
test("Sling: zero angle errors", () => { const r = computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 0, n_legs: 2 }); assert.ok(r.error); });
test("Sling: zero legs errors", () => { const r = computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 60, n_legs: 0 }); assert.ok(r.error); });
test("Sling: negative load errors", () => { const r = computeSlingAngle({ load_lb: -1, sling_config: "basket", included_angle_deg: 60, n_legs: 2 }); assert.ok(r.error); });
test("Sling: unknown config errors", () => { const r = computeSlingAngle({ load_lb: 1000, sling_config: "x", included_angle_deg: 60, n_legs: 2 }); assert.ok(r.error); });
test("Sling: 60 deg basket scales 1/sin(30) per leg", () => { const r = computeSlingAngle({ load_lb: 1000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 }); assert.ok(close(r.tension_per_leg_lb, 1000 / (2 * Math.sin(Math.PI / 6)), 0.001)); });
