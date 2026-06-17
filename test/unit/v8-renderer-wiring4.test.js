// v8 renderer-wiring batch 4 - 7 final tile renderers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readCalc = (name) => readFile(resolve(ROOT, name), "utf8");

test("renderer dehumidifier surfaces operational guidance row", async () => {
  const t = await readCalc("calc-restoration.js");
  assert.match(t, /dh-out-g/);
  assert.match(t, /Operational guidance/);
});

test("renderer air-movers surfaces placement pattern + note rows", async () => {
  const t = await readCalc("calc-restoration.js");
  assert.match(t, /am-out-p/);
  assert.match(t, /am-out-n/);
  assert.match(t, /Placement pattern/);
  assert.match(t, /Placement note/);
});

test("renderer hepa-filter-life surfaces full-job filter count + total cost rows + job-day input", async () => {
  const t = await readCalc("calc-restoration.js");
  assert.match(t, /hl-out-fj/);
  assert.match(t, /hl-out-tc/);
  assert.match(t, /Job duration \(days, optional\)/);
  assert.match(t, /Filters for full job/);
  assert.match(t, /Total filter cost/);
});

test("renderer timber-cruise surfaces stand-value row + price input", async () => {
  const t = await readCalc("calc-agriculture.js");
  assert.match(t, /tc-out-v/);
  assert.match(t, /price_per_bf/);
  assert.match(t, /Estimated stand value/);
});

test("renderer water-hammer-arrestor surfaces pre-charge + placement rows + system pressure input", async () => {
  const t = await readCalc("calc-plumbing.js");
  assert.match(t, /wha-out-pc/);
  assert.match(t, /wha-out-pn/);
  assert.match(t, /System pressure \(psi, optional\)/);
  assert.match(t, /Pre-charge \(set air side, system depressurized\)/);
});

test("renderer hos-math surfaces next-drive-start row + current-time input", async () => {
  const t = await readCalc("calc-trucking.js");
  assert.match(t, /hos-out-nt/);
  assert.match(t, /Current time \(ISO, optional\)/);
  assert.match(t, /Next legal drive start/);
});

test("renderer refrigerant-pt surfaces target-superheat row + OAT + WB inputs", async () => {
  const t = await readCalc("calc-refrigerant.js"); // spec-v89 relocation
  assert.match(t, /rp-out-tsh/);
  assert.match(t, /Outdoor air temp \(F, optional\)/);
  assert.match(t, /Indoor wet-bulb \(F, optional\)/);
  assert.match(t, /Target superheat/);
});
