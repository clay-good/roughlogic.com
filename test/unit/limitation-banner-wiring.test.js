// v10 Phase B.3 wiring tests: assert each simplified-screening tile's
// renderer imports the limitation-banner shared component and calls
// renderLimitationBanner with the canonical copy for that tile id.
//
// Source-text assertions (consistent with the v8 renderer-wiring tests)
// rather than DOM exercises; this catches the most common regression
// (someone deletes the banner call) without requiring a jsdom harness.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readSrc = (name) => readFile(resolve(ROOT, name), "utf8");

test("calc-hvac.js imports the limitation-banner helpers", async () => {
  const t = await readSrc("calc-hvac.js");
  assert.match(
    t,
    /import\s+\{\s*renderLimitationBanner\s*,\s*getLimitationCopy\s*\}\s+from\s+"\.\/limitation-banner\.js";/,
  );
});

test("renderManualJCooling renders the limitation banner", async () => {
  const t = await readSrc("calc-hvac.js");
  // Find the function body and assert the banner call is inside.
  const m = t.match(
    /export function renderManualJCooling[\s\S]*?renderLimitationBanner\(inputRegion,\s*getLimitationCopy\("manual-j-cooling"\)\)/,
  );
  assert.ok(m, "renderManualJCooling must call renderLimitationBanner with the manual-j-cooling copy");
});

test("renderManualJHeating renders the limitation banner", async () => {
  const t = await readSrc("calc-hvac.js");
  const m = t.match(
    /export function renderManualJHeating[\s\S]*?renderLimitationBanner\(inputRegion,\s*getLimitationCopy\("manual-j-heating"\)\)/,
  );
  assert.ok(m, "renderManualJHeating must call renderLimitationBanner with the manual-j-heating copy");
});

test("renderOutdoorAirMix renders the ASHRAE 62.1 limitation banner", async () => {
  const t = await readSrc("calc-hvac.js");
  const m = t.match(
    /export function renderOutdoorAirMix[\s\S]*?renderLimitationBanner\(inputRegion,\s*getLimitationCopy\("outdoor-air-mix"\)\)/,
  );
  assert.ok(m, "renderOutdoorAirMix must call renderLimitationBanner with the outdoor-air-mix copy");
});

test("calc-septic.js imports the limitation-banner helpers", async () => {
  // spec-v86 split: the only calc-plumbing.js consumer of the banner was the
  // septic-drainfield renderer, which moved to calc-septic.js with the import.
  const t = await readSrc("calc-septic.js");
  assert.match(
    t,
    /import\s+\{\s*renderLimitationBanner\s*,\s*getLimitationCopy\s*\}\s+from\s+"\.\/limitation-banner\.js";/,
  );
});

test("septic-drainfield renderer renders the state-primacy limitation banner", async () => {
  const t = await readSrc("calc-septic.js"); // relocated from calc-plumbing.js (spec-v86 split)
  const m = t.match(
    /_v7p_renderSepticDrainfield[\s\S]*?renderLimitationBanner\(inputRegion,\s*getLimitationCopy\("septic-drainfield"\)\)/,
  );
  assert.ok(m, "septic-drainfield renderer must call renderLimitationBanner");
});

test("calc-electrical.js imports the limitation-banner helpers", async () => {
  const t = await readSrc("calc-electrical.js");
  assert.match(
    t,
    /import\s+\{\s*renderLimitationBanner\s*,\s*getLimitationCopy\s*\}\s+from\s+"\.\/limitation-banner\.js";/,
  );
});

test("renderServiceLoad renders the AHJ-governs limitation banner", async () => {
  const t = await readSrc("calc-electrical.js");
  const m = t.match(
    /export function renderServiceLoad[\s\S]*?renderLimitationBanner\(inputRegion,\s*getLimitationCopy\("service-load"\)\)/,
  );
  assert.ok(m, "renderServiceLoad must call renderLimitationBanner");
});

test("slope-avalanche tile passes limitationId through the field _r helper", async () => {
  const t = await readSrc("calc-field.js");
  // The Group P renderer factory _r() reads spec.limitationId; the slope
  // tile spec must declare limitationId: "slope-avalanche".
  assert.match(t, /import\s+\{\s*renderLimitationBanner\s*,\s*getLimitationCopy\s*\}\s+from\s+"\.\/limitation-banner\.js";/);
  assert.match(
    t,
    /spec\.limitationId[\s\S]*?renderLimitationBanner\(inputRegion,\s*getLimitationCopy\(spec\.limitationId\)\)/,
  );
  // And the slope spec passes the right id.
  const m = t.match(/const renderSlope = _r\(\{[\s\S]*?limitationId:\s*"slope-avalanche"/);
  assert.ok(m, "slope-avalanche spec must pass limitationId");
});

test("renderStairStringer renders the AHJ-governs limitation banner", async () => {
  const t = await readSrc("calc-construction.js");
  assert.match(t, /import\s+\{\s*renderLimitationBanner\s*,\s*getLimitationCopy\s*\}\s+from\s+"\.\/limitation-banner\.js";/);
  const m = t.match(
    /export function renderStairStringer[\s\S]*?renderLimitationBanner\(inputRegion,\s*getLimitationCopy\("stair-stringer"\)\)/,
  );
  assert.ok(m, "renderStairStringer must call renderLimitationBanner");
});
