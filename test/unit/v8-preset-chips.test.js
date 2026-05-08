// v8 §C.1: wire-ampacity ambient preset chips render as a labeled
// button group below the ambient input. Each chip prefills the field
// and re-runs compute. Honors the 48 px touch-min via .preset-chip.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (name) => readFile(resolve(ROOT, name), "utf8");

test("wire-ampacity renderer emits a preset-chip-row with chips for each ambient preset", async () => {
  const t = await read("calc-electrical.js");
  assert.match(t, /preset-chip-row/);
  assert.match(t, /preset-chip"/);
  assert.match(t, /Ambient temperature presets/);
  assert.match(t, /WIRE_AMPACITY_AMBIENT_PRESETS/);
});

test("WIRE_AMPACITY_AMBIENT_PRESETS lists indoor, field, and extreme presets", async () => {
  const t = await read("calc-electrical.js");
  assert.match(t, /id: "indoor".*ambient_C: 30/s);
  assert.match(t, /id: "field".*ambient_C: 45/s);
  assert.match(t, /id: "extreme".*ambient_C: 60/s);
});

test("styles.css carries .preset-chip with platform touch-min", async () => {
  const t = await read("styles.css");
  assert.match(t, /\.preset-chip-row/);
  assert.match(t, /\.preset-chip\b/);
  assert.match(t, /min-height: var\(--touch-min\)/);
});

test("docs/citation-discipline.md exists and lists at least the NEC + IPC + IRC editions", async () => {
  const t = await read("docs/citation-discipline.md");
  assert.match(t, /NEC.*2023/);
  assert.match(t, /IPC.*2021/);
  assert.match(t, /IRC.*2021/);
  assert.match(t, /nfpa\.org\/freeaccess/);
  assert.match(t, /codes\.iccsafe\.org/);
});

test("docs/accessibility.md notes the v8 preset-chip pattern", async () => {
  const t = await read("docs/accessibility.md");
  assert.match(t, /Preset chip rows/);
  assert.match(t, /wire-ampacity/);
  assert.match(t, /touch-min/);
});
