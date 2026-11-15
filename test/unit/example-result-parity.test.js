// The static page prints a tile's worked example ("You enter ... / You get ...")
// from the first fixture row; its "Test with example" button is meant to load
// the same case. check-example-parity compares the button's INPUTS with the
// row's; nothing compared what the page then COMPUTED. On 2026-11-15
// irrigation-uniformity read its blank catch-can rows as dry cans and printed
// DU 0.0% against the row's 99, and about twenty other buttons loaded a
// different case than the one printed above them (a 2024 edition beside a
// printed 2021 row, a bitting nobody published, a cap rate with no debt
// service). The sweep clicks every example under a compute spy and holds each
// output the row declares against the compute run on the row's inputs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Reviewed: the page cannot show the row's case, or shows it to a precision the
// row did not use. Each entry says which.
const REVIEWED = {
  "rebar-schedule": "the form edits one bar row with one bend; the printed example is a three-row schedule",
  "flocculation-g-value": "the row is metric (300 W, 100 m3, 10 C); the form is imperial and the button types the rounded conversion (0.4 hp, 26,400 gal, 50 F)",
  "mileage-rollup": "the trips box takes date, miles, purpose; the row's odometer readings have no column, and the implied-mile figures they feed are not printed on the page",
  "grout-lift-pour-height": "the row rounds the limit to 5.33 ft; the page carries 16/3, and a 0.33 ft margin magnifies the 0.003 difference",
  "vibration-severity-zone": "the row rounds the zone boundaries to 0.044 / 0.11 / 0.28 in/s; the page converts the ISO mm/s values exactly, and the margin magnifies it",
};

test("example result parity: the example button computes the worked example the page prints", () => {
  const sweep = fileURLToPath(new URL("../fixtures/render-example-result-sweep.js", import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [sweep], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }));
  assert.ok(report.compared > 2200, `only ${report.compared} tiles compared`);
  const fresh = Object.entries(report.mismatches).filter(([id]) => !(id in REVIEWED)).map(([id, m]) => `${id}: ${m}`);
  assert.deepEqual(fresh, [], "the button loads a different case than the printed example: make the button load the first fixture row, or move a matching verified row first");
  const gone = Object.keys(REVIEWED).filter((id) => !(id in report.mismatches));
  assert.deepEqual(gone, [], "fixed or gone: remove these from REVIEWED");
});
