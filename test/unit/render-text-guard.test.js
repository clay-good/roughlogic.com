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

// Until 2026-10-08 ten bespoke renderers built a field and never listened to it
// (battery-runtime's inverter efficiency, timesheet's hourly rate, the truss model
// and span, the HOS duty profile, ...): editing it left the answer stale until some
// other field changed.
test("render text: every input, select, and textarea a tile renders is listened to", () => {
  const sweep = fileURLToPath(new URL("../fixtures/render-text-sweep.js", import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [sweep], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }));
  assert.deepEqual(report.unlistened, []);
});

// A tile's page prints its first registered worked example, and "Test with
// example" must load that same example. check-example-parity compares the two
// only for tiles that export their example constant; the rest (401 of them)
// were left to a one-minute browser sweep that runs in CI alone, which is where
// saturated-steam-properties was caught on 2026-10-10 printing 130.34 psig
// beside a button that loaded 100. This is that sweep's comparison against the
// fake DOM, for every tile, so `npm test` sees it.
//
// The four listed tiles register their fixture in metric and render a US form
// holding the same example (0.4 hp for 300 W, 26,400 gal for 100 m3), so their
// numbers legitimately differ. Anything else is a different example.
const METRIC_FIXTURE_US_FORM = ["dyno-correction-sae", "flocculation-g-value", "search-track-spacing", "spl-atmospheric"];
test("render text: the example button loads the worked example the page prints", () => {
  const sweep = fileURLToPath(new URL("../fixtures/render-text-sweep.js", import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [sweep], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }));
  assert.ok(report.exampleCompared > 2000, `only ${report.exampleCompared} tiles had an example and a fixture to compare`);
  const flagged = report.exampleMismatch.map((line) => line.split(":")[0]).sort();
  const unexpected = report.exampleMismatch.filter((line) => !METRIC_FIXTURE_US_FORM.includes(line.split(":")[0]));
  assert.deepEqual(unexpected, []);
  // The exemption list may only shrink: a listed tile that now matches must come off it.
  assert.deepEqual(flagged, METRIC_FIXTURE_US_FORM);
});
