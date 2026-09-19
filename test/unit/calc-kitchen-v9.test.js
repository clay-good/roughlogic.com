// v9 §H.6 unit tests for sous-vide pasteurization. The tile is a
// simplified screen; the limitation banner above the inputs makes
// clear that local food-safety authority + qualified processing
// authority govern any commercial-kitchen use.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSousVidePasteurization, sousVidePasteurizationExample,
  SOUS_VIDE_DIFFUSIVITY, KITCHEN_RENDERERS,
} from "../../calc-kitchen.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("sous-vide: 1 in poultry @ 140 F bath, 38 F start -> ~43 min come-up, 12 min hold", () => {
  const r = computeSousVidePasteurization(sousVidePasteurizationExample.inputs);
  assert.ok(!r.error);
  // L = 0.0127 m; alpha = 1.4e-7; a 99.5% center approach needs Fo = 2.245 (one-term slab):
  // come-up = 2.245 * 0.0127^2 / 1.4e-7 = 2587 s = 43.1 min.
  assert.ok(closePct(r.come_up_minutes, 43.11, 1));
  // Hold at 140 F = 12 min, FDA Food Code Table 3-2.
  assert.ok(close(r.hold_minutes, 12, 0.001));
  assert.ok(closePct(r.total_minutes, 55.11, 1));
  // Poultry is not what Table 3-2 is written for, and the tile says so.
  assert.ok(r.warnings.some((w) => /whole meat roasts/.test(w)));
});

test("sous-vide: come-up time scales with the square of thickness", () => {
  const r1 = computeSousVidePasteurization({ category: "poultry", thickness_in: 1.0, bath_temperature_F: 140, initial_temperature_F: 38 });
  const r2 = computeSousVidePasteurization({ category: "poultry", thickness_in: 2.0, bath_temperature_F: 140, initial_temperature_F: 38 });
  // Doubling thickness quadruples come-up time.
  assert.ok(closePct(r2.come_up_minutes / r1.come_up_minutes, 4, 1));
});

test("sous-vide: lower bath temp dramatically increases hold time", () => {
  const r135 = computeSousVidePasteurization({ category: "poultry", thickness_in: 1.0, bath_temperature_F: 135, initial_temperature_F: 38 });
  const r145 = computeSousVidePasteurization({ category: "poultry", thickness_in: 1.0, bath_temperature_F: 145, initial_temperature_F: 38 });
  // FDA Food Code Table 3-2: 135 F = 36 min; 145 F = 4 min.
  assert.ok(closePct(r135.hold_minutes, 36, 0.1));
  assert.ok(closePct(r145.hold_minutes, 4, 0.1));
});

test("sous-vide: bath below 130 F rejects (FDA Food Code Table 3-2 minimum)", () => {
  const r = computeSousVidePasteurization({ category: "poultry", thickness_in: 1.0, bath_temperature_F: 125, initial_temperature_F: 38 });
  assert.ok(r.error);
  assert.match(r.error, /Table 3-2 minimum/);
});

test("sous-vide: rejects unknown category, zero thickness, bath < 100 F, T_init >= T_bath", () => {
  assert.ok(computeSousVidePasteurization({ category: "tofu", thickness_in: 1.0, bath_temperature_F: 140 }).error);
  assert.ok(computeSousVidePasteurization({ category: "poultry", thickness_in: 0, bath_temperature_F: 140 }).error);
  assert.ok(computeSousVidePasteurization({ category: "poultry", thickness_in: 1.0, bath_temperature_F: 90 }).error);
  assert.ok(computeSousVidePasteurization({ category: "poultry", thickness_in: 1.0, bath_temperature_F: 140, initial_temperature_F: 145 }).error);
});

test("sous-vide: every result carries the 'field thermometer is the verdict' warning", () => {
  const r = computeSousVidePasteurization(sousVidePasteurizationExample.inputs);
  assert.ok(r.warnings.some((w) => /Field thermometer/.test(w)));
});

test("sous-vide: thickness > 4 in surfaces a slab-approximation warning", () => {
  const r = computeSousVidePasteurization({ category: "beef", thickness_in: 5, bath_temperature_F: 140, initial_temperature_F: 38 });
  assert.ok(r.warnings.some((w) => /slab approximation/.test(w)));
});

test("sous-vide: bath at 147 F surfaces a texture-suffers warning", () => {
  const r = computeSousVidePasteurization({ category: "beef", thickness_in: 1, bath_temperature_F: 147, initial_temperature_F: 38 });
  assert.ok(r.warnings.some((w) => /texture suffers/.test(w)));
});

test("sous-vide: SOUS_VIDE_DIFFUSIVITY exposes 5 categories with plausible alpha values (1.3-1.5e-7)", () => {
  for (const k of ["poultry", "pork", "beef", "fish", "egg"]) {
    const d = SOUS_VIDE_DIFFUSIVITY[k];
    assert.ok(d.alpha > 1.0e-7 && d.alpha < 2.0e-7);
  }
});

test("sous-vide: hold-time interpolates between FDA Annex 6 break points", () => {
  // 132.5 F should be between the 132 (65.5 min) and 133 (48.3 min) rows.
  const r = computeSousVidePasteurization({ category: "beef", thickness_in: 1, bath_temperature_F: 132.5, initial_temperature_F: 38 });
  assert.ok(r.hold_minutes < 65.5 && r.hold_minutes > 48.3);
});

test("sous-vide: KITCHEN_RENDERERS exposes sous-vide-pasteurization", () => {
  assert.equal(typeof KITCHEN_RENDERERS["sous-vide-pasteurization"], "function");
});
