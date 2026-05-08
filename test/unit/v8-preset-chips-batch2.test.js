// v8 §C.1 / accessibility.md preset-chip pattern extended to two more
// tiles: duct-sizing friction-rate (ACCA Manual D bands) and
// water-hammer-arrestor system pressure (residential / commercial typicals).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (name) => readFile(resolve(ROOT, name), "utf8");

test("duct-sizing renderer emits a friction-rate preset chip group", async () => {
  const t = await read("calc-hvac.js");
  assert.match(t, /DUCT_FRICTION_PRESETS/);
  assert.match(t, /Friction-rate presets/);
  assert.match(t, /preset-chip-row/);
});

test("DUCT_FRICTION_PRESETS lists low / typical / high ACCA Manual D bands", async () => {
  const t = await read("calc-hvac.js");
  assert.match(t, /id: "low".*friction: 0\.06/s);
  assert.match(t, /id: "typical".*friction: 0\.08/s);
  assert.match(t, /id: "high".*friction: 0\.10/s);
});

test("water-hammer-arrestor renderer emits a system-pressure preset chip group", async () => {
  const t = await read("calc-plumbing.js");
  assert.match(t, /WHA_SYSTEM_PRESSURE_PRESETS/);
  assert.match(t, /System pressure presets/);
});

test("WHA_SYSTEM_PRESSURE_PRESETS lists low 40 / typical 60 / high 80 psi presets", async () => {
  const t = await read("calc-plumbing.js");
  assert.match(t, /id: "low".*psi: 40/s);
  assert.match(t, /id: "typical".*psi: 60/s);
  assert.match(t, /id: "high".*psi: 80/s);
});
