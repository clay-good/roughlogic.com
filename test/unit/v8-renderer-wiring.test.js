// v8 renderer-wiring regression tests.
//
// Asserts that the new output lines and fields surfaced in the six
// renderer-polish wirings are present in the source. Reading the calc
// modules as text avoids spinning up a DOM stub for what is essentially
// a string-presence check.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readCalc = (name) => readFile(resolve(ROOT, name), "utf8");

// transformer-sizing surfaces ANSI step + at_step_cap text.
test("renderer transformer-sizing renders ANSI/IEEE C57 step badge", async () => {
  const t = await readCalc("calc-electrical.js");
  assert.match(t, /ANSI\/IEEE C57 step/);
  assert.match(t, /above 1000 kVA cap/);
});

// voltage-drop surfaces voltage_at_load + flag output lines.
test("renderer voltage-drop adds 'Voltage at load' and 'Status' output lines", async () => {
  const t = await readCalc("calc-electrical.js");
  assert.match(t, /vd-out-at-load/);
  assert.match(t, /vd-out-flag/);
  assert.match(t, /Voltage at load/);
});

// friction-loss surfaces velocity + velocity_flag output lines.
test("renderer friction-loss adds 'Velocity' + 'Velocity status' output lines", async () => {
  const t = await readCalc("calc-plumbing.js");
  assert.match(t, /fl-out-vel/);
  assert.match(t, /fl-out-vel-flag/);
  assert.match(t, /"Velocity"/);
});

// concrete surfaces 60lb / 80lb bag count output lines.
test("renderer concrete adds 60 lb and 80 lb bag-count output lines", async () => {
  const t = await readCalc("calc-construction.js");
  assert.match(t, /co-out-bag60/);
  assert.match(t, /co-out-bag80/);
  assert.match(t, /60 lb bags/);
  assert.match(t, /80 lb bags/);
});

// dim-weight surfaces billing_basis + breakeven cube output lines.
test("renderer dim-weight adds 'Billing basis' and 'Break-even cube' rows", async () => {
  const t = await readCalc("calc-trucking.js");
  assert.match(t, /dim-out-ba/);
  assert.match(t, /dim-out-be/);
  assert.match(t, /Billing basis/);
  assert.match(t, /Break-even cube/);
});

// fuel-range surfaces optional cost field + cost output lines.
test("renderer fuel-range exposes price_per_gal field + cost output rows", async () => {
  const t = await readCalc("calc-mechanic.js");
  assert.match(t, /price_per_gal/);
  assert.match(t, /fr-out-fc/);
  assert.match(t, /fr-out-cm/);
  assert.match(t, /Fuel cost \(if \$\/gal supplied\)/);
  assert.match(t, /Cost per mile/);
});

// Citation strings consistent with cost-output disclosure rule.
test("fuel-range citation calls out the optional-cost / never-persisted rule", async () => {
  const t = await readCalc("calc-mechanic.js");
  assert.match(t, /never persisted, never reported/);
});
