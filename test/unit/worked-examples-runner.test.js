// v10 Phase C migration runner (spec-v10.md §5.1).
//
// Reads test/fixtures/worked-examples.json and, for each fixture whose
// tile_id has a registered compute function in COMPUTE_MAP below,
// dynamically imports the calc module, calls compute(inputs), and
// asserts every declared output matches its `value` within `tolerance`
// (abs or pct). This is the contract the spec promised: a tile cannot
// regress its publisher-known answers without CI failing.
//
// Fixtures whose tile_id is not yet in COMPUTE_MAP are skipped (the
// registry can grow ahead of the runner). The check-worked-examples
// linter still validates the schema for every row.
//
// Adding a new tile to the runner: append to COMPUTE_MAP (now in
// test/fixtures/compute-map.js, shared with the v18 tile-contract sweep)
// a row with the module path and the named export of the compute
// function. No other change is needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPUTE_MAP } from "../fixtures/compute-map.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = resolve(ROOT, "test", "fixtures", "worked-examples.json");


function withinTolerance(actual, expected, tol) {
  // String-valued outputs (e.g., table-lookup AWG sizes, recommended pipe
  // trade sizes) compare by strict equality; `tolerance` is ignored. This
  // lets a fixture pin "10" for the EGC table or "0.75" for a Spitzglass
  // gas-pipe lookup without inventing a numeric coercion.
  if (typeof expected === "string") return String(actual) === expected;
  // Booleans coerce to 0/1 so a fixture can declare `value: 1` for a
  // pass-flag and `value: 0` for a fail-flag with abs tolerance 0.
  if (typeof actual === "boolean") actual = actual ? 1 : 0;
  if (typeof actual !== "number" || !Number.isFinite(actual)) return false;
  if (tol.abs !== undefined) {
    return Math.abs(actual - expected) <= tol.abs;
  }
  if (tol.pct !== undefined) {
    const ref = Math.max(Math.abs(expected), 1e-12);
    const diff = Math.abs(actual - expected);
    return (diff / ref) * 100 <= tol.pct;
  }
  return false;
}

let _fixturesPromise = null;
function loadFixtures() {
  if (!_fixturesPromise) {
    _fixturesPromise = readFile(FIXTURE, "utf8").then((s) => JSON.parse(s));
  }
  return _fixturesPromise;
}

test("worked-examples runner has at least one registered tile", () => {
  assert.ok(Object.keys(COMPUTE_MAP).length > 0);
});

test("every fixture for a registered tile passes the runner", async () => {
  const json = await loadFixtures();
  let runCount = 0;
  let skipCount = 0;
  for (const row of json.rows) {
    const reg = COMPUTE_MAP[row.tile_id];
    if (!reg) { skipCount += 1; continue; }
    const mod = await import(reg.module);
    const fn = mod[reg.fn];
    assert.equal(typeof fn, "function", "missing compute export: " + reg.module + " " + reg.fn);
    const out = fn({ ...row.inputs });
    assert.ok(out && typeof out === "object", row.tile_id + ": compute returned non-object");
    assert.ok(!out.error, row.tile_id + ": compute returned error: " + out.error);
    for (const [name, exp] of Object.entries(row.outputs)) {
      assert.ok(name in out, row.tile_id + ": compute output missing key '" + name + "'");
      const ok = withinTolerance(out[name], exp.value, exp.tolerance);
      assert.ok(
        ok,
        row.tile_id + " output '" + name + "': got " + out[name] + ", expected " + exp.value + " ± " + JSON.stringify(exp.tolerance),
      );
    }
    runCount += 1;
  }
  // Sanity: at least one fixture actually ran.
  assert.ok(runCount > 0, "no fixtures matched COMPUTE_MAP; did the registry shrink?");
  // Useful diagnostic.
  console.log("worked-examples runner: ran " + runCount + " / skipped " + skipCount);
});

test("ohms-law happy path: V=120 I=10 -> R=12, P=1200", async () => {
  const mod = await import("../../calc-electrical.js");
  const r = mod.computeOhmsLaw({ V: 120, I: 10, R: null, P: null });
  assert.ok(!r.error);
  assert.ok(withinTolerance(r.R, 12, { pct: 0.5 }));
  assert.ok(withinTolerance(r.P, 1200, { pct: 0.5 }));
});

test("bridge-formula at 80,000 lb interstate cap (5-axle Class 8 example)", async () => {
  const mod = await import("../../calc-trucking.js");
  const r = mod.computeBridgeFormula({
    axle_weights_lb: [12000, 17000, 17000, 17000, 17000],
    axle_spacings_ft: [12, 4, 30, 4],
  });
  assert.ok(!r.error);
  assert.equal(r.total_weight_lb, 80000);
  assert.equal(r.interstate_cap_lb, 80000);
  assert.equal(r.over_interstate, false);
});

test("wind-chill at 10F / 20mph yields ~ -9F", async () => {
  const mod = await import("../../calc-cross.js");
  const r = mod.computeWindChill({ T_F: 10, wind_mph: 20 });
  assert.ok(!r.error);
  // The published NWS calculator returns -9F for these inputs (rounded
  // to the nearest integer); our implementation is the same formula.
  assert.ok(withinTolerance(r.wind_chill_F, -9, { abs: 1 }));
});
