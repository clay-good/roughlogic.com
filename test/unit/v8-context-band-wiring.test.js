// v8 §D.2 - context-band helper wired into manual-j-cooling and
// manual-j-heating renderers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (name) => readFile(resolve(ROOT, name), "utf8");

test("calc-hvac.js imports formatContextBand from context-band.js", async () => {
  const t = await read("calc-hvac.js");
  assert.match(t, /import \{ formatContextBand \} from ".\/context-band.js"/);
});

test("manual-j-cooling renderer surfaces a BTU/hr-per-sq-ft band row at 15-30", async () => {
  const t = await read("calc-hvac.js");
  assert.match(t, /mjc-out-band/);
  assert.match(t, /BTU\/hr per sq ft \(typical 15-30\)/);
  assert.match(t, /formatContextBand\(r\.total_BTU_hr \/ floor_ft2, 15, 30/);
});

test("manual-j-heating renderer surfaces a BTU/hr-per-sq-ft band row at 25-50", async () => {
  const t = await read("calc-hvac.js");
  assert.match(t, /mjh-out-band/);
  assert.match(t, /BTU\/hr per sq ft \(typical 25-50\)/);
  assert.match(t, /formatContextBand\(r\.total_BTU_hr \/ floor_ft2, 25, 50/);
});
