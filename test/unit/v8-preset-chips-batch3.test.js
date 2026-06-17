// v8 §C.1 + §C.3 preset-chip pattern extended to three more tiles:
// voltage-drop source voltage, breaker-sizing voltage, and refrigerant-pt
// outdoor air temp.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (name) => readFile(resolve(ROOT, name), "utf8");

test("COMMON_VOLTAGE_PRESETS lists 120 / 208 / 240 / 277 / 480 V", async () => {
  const t = await read("calc-electrical.js");
  assert.match(t, /id: "120".*volts: 120/s);
  assert.match(t, /id: "208".*volts: 208/s);
  assert.match(t, /id: "240".*volts: 240/s);
  assert.match(t, /id: "277".*volts: 277/s);
  assert.match(t, /id: "480".*volts: 480/s);
});

test("voltage-drop renderer emits a source-voltage chip group", async () => {
  const t = await read("calc-electrical.js");
  assert.match(t, /Source voltage presets/);
  assert.match(t, /COMMON_VOLTAGE_PRESETS/);
});

test("breaker-sizing renderer emits a voltage chip group for watts-input mode", async () => {
  const t = await read("calc-electrical.js");
  assert.match(t, /aria-label", "Voltage presets/);
});

test("REFRIGERANT_OAT_PRESETS lists mild / design / hot / extreme bands", async () => {
  const t = await read("calc-refrigerant.js");
  assert.match(t, /id: "mild".*oat_F: 75/s);
  assert.match(t, /id: "design".*oat_F: 85/s);
  assert.match(t, /id: "hot".*oat_F: 95/s);
  assert.match(t, /id: "extreme".*oat_F: 105/s);
});

test("refrigerant-pt renderer emits an outdoor-air-temp chip group", async () => {
  const t = await read("calc-refrigerant.js");
  assert.match(t, /Outdoor air temp presets/);
  assert.match(t, /REFRIGERANT_OAT_PRESETS/);
});
