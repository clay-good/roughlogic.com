// v8 renderer-wiring batch 2 - 8 more tile renderers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readCalc = (name) => readFile(resolve(ROOT, name), "utf8");

test("renderer voltage-imbalance shows NEMA MG-1 HP derate", async () => {
  const t = await readCalc("calc-electrical.js");
  assert.match(t, /vi-out-nema/);
  assert.match(t, /NEMA MG-1 HP derate/);
  assert.match(t, /do NOT operate/);
});

test("renderer conduit-fill leads with PASS\\/FAIL badge + margin", async () => {
  const t = await readCalc("calc-electrical.js");
  assert.match(t, /margin /);
  assert.match(t, /pass_flag \+/);
});

test("renderer gas-pipe-sizing surfaces dP_achieved row", async () => {
  const t = await readCalc("calc-gas.js"); // relocated from calc-plumbing.js (spec-v42 split)
  assert.match(t, /gp-out-d/);
  assert.match(t, /Achieved pressure drop/);
  assert.match(t, /no size fits the load/);
});

test("renderer expansion-tank surfaces precharge + placement_note", async () => {
  const t = await readCalc("calc-plumbing.js");
  assert.match(t, /et-out-pc/);
  assert.match(t, /et-out-note/);
  assert.match(t, /Pre-charge \(set air side\)/);
});

test("renderer manual-j-heating surfaces tons row", async () => {
  const t = await readCalc("calc-hvac.js");
  assert.match(t, /mjh-out-tons/);
  assert.match(t, /1 ton = 12 000 BTU\/hr/);
});

test("renderer superheat-subcool surfaces diagnostic line", async () => {
  const t = await readCalc("calc-hvac.js");
  assert.match(t, /ss-out-diag/);
  assert.match(t, /Diagnostic/);
});

test("renderer lumber-spans surfaces deflection row", async () => {
  const t = await readCalc("calc-construction.js");
  assert.match(t, /ls-out-def/);
  assert.match(t, /Deflection at allowable span/);
});

test("renderer asphalt-tonnage exposes paving_width_ft input + paving distance / per-truck rows", async () => {
  const t = await readCalc("calc-construction.js");
  assert.match(t, /paving_width_ft/);
  assert.match(t, /at-out-pd/);
  assert.match(t, /at-out-dpt/);
  assert.match(t, /Paving distance/);
  assert.match(t, /Length per truck/);
});
