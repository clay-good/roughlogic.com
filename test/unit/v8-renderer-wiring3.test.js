// v8 renderer-wiring batch 3 - 8 more tile renderers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readCalc = (name) => readFile(resolve(ROOT, name), "utf8");

test("renderer breaker-sizing exposes watts + voltage + phase + pf inputs and watts->amps row", async () => {
  const t = await readCalc("calc-electrical.js");
  assert.match(t, /bs-out-wa/);
  assert.match(t, /derived from W \/ V/);
  assert.match(t, /Load \(W, optional\)/);
  assert.match(t, /Voltage \(V, optional\)/);
});

test("renderer displacement-cr surfaces premium-octane flag row", async () => {
  const t = await readCalc("calc-mechanic.js");
  assert.match(t, /dc-out-po/);
  assert.match(t, /likely requires premium octane/);
});

test("renderer brake-pad-life surfaces cost-per-100k row + pad-set cost input", async () => {
  const t = await readCalc("calc-mechanic.js");
  assert.match(t, /bp-out-c/);
  assert.match(t, /pad_set_cost_usd/);
  assert.match(t, /Cost per 100k mi/);
});

test("renderer pallet-loadout surfaces binding margin + slack utilization rows", async () => {
  const t = await readCalc("calc-trucking.js");
  assert.match(t, /pl-out-bm/);
  assert.match(t, /pl-out-su/);
  assert.match(t, /headroom over the slack limit/);
  assert.match(t, /Slack utilization/);
});

test("renderer reefer-burn surfaces fuel-reserve row + haul-distance input", async () => {
  const t = await readCalc("calc-trucking.js");
  assert.match(t, /rf-out-rs/);
  assert.match(t, /haul_miles/);
  assert.match(t, /Fuel reserve at end of haul/);
  assert.match(t, /refuel mid-haul/);
});

test("renderer cfm-per-ton surfaces climate-hint row", async () => {
  const t = await readCalc("calc-hvac.js");
  assert.match(t, /cpt-out-h/);
  assert.match(t, /Climate hint/);
});

test("renderer duct-sizing surfaces friction-rate badge row", async () => {
  const t = await readCalc("calc-hvac.js");
  assert.match(t, /ds-out-f/);
  assert.match(t, /Friction rate band/);
  assert.match(t, /friction_color\.toUpperCase/);
});
