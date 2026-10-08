// Every tile's output region, after "Test with example" and after each input is
// blanked, each select option chosen, and each checkbox toggled, must not print
// "undefined", "NaN", "Infinity", or a bare "null". render-no-nan checks the same
// thing in a browser, but it reads after a debounce and passed twice over the
// inventory-turnover leak ("median undefinedx", 2026-09-09 to 2026-10-08). This
// drives the renderers against a fake DOM with the timers flushed by hand, so
// the result does not depend on timing, and it covers the bespoke renderers that
// formatted-output-guard cannot reach.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("render text: no tile prints undefined, NaN, Infinity, or null after its example or a perturbation", () => {
  const sweep = fileURLToPath(new URL("../fixtures/render-text-sweep.js", import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [sweep], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }));
  // A stub that stopped working would render nothing and pass; hold the floor.
  assert.ok(report.withExample > 2000, `only ${report.withExample} tiles reached their example under the fake DOM`);
  assert.deepEqual(report.crashes, []);
  assert.deepEqual(report.leaks, []);
});

// Until 2026-10-08 calc-hvacservice.js built every declared field as a number box,
// so four tiles with a select showed their own "must be X or Y" error after the
// example (condensate-trap-depth since 2026-07-27) and gave no way to choose.
test("render text: every worked example renders an answer, not the error layout", () => {
  const sweep = fileURLToPath(new URL("../fixtures/render-text-sweep.js", import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [sweep], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }));
  assert.deepEqual(report.exampleErrors, []);
});
