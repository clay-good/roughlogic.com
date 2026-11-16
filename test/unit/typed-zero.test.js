// A typed 0 reaches the compute as 0 (see render-typed-zero-sweep.js): 65 tiles
// replaced it with a default until 2026-11-15, and a dozen computes did the
// same inside (`Number(k) || 1`). A blank box still takes the default.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("typed zero: no number box turns a typed 0 into a default", () => {
  const sweep = fileURLToPath(new URL("../fixtures/render-typed-zero-sweep.js", import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [sweep], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }));
  assert.ok(report.compared > 5000, `only ${report.compared} number boxes were traced to a compute argument`);
  // duct-sizing computes in a Web Worker (async); the fake DOM does not await it, and the
  // renderer's own r.error branch is read by eye.
  assert.deepEqual(report.silentErrors.filter((x) => !x.startsWith("duct-sizing ")), [], "add `if (r.error) { first.textContent = r.error; ...; return; }` after the compute call");
  assert.deepEqual(report.unshownInputs, [], "add the argument's key to the stepsFor key list so Show the steps lists it");
  assert.deepEqual(report.staleTables, [], "clear the table/plot/list container in the r.error branch");
  assert.deepEqual(report.blankDefault, [], "a box whose label states a default must run with it when left blank");
  assert.deepEqual(report.droppedLines, [], "a list box dropped an unreadable line without a word: name the line in the error instead");
  assert.deepEqual(report.outOfRange, [], "a worked example must sit inside its box's own min/max, or the page strikes through its own answer");
  assert.deepEqual(Object.entries(report.mismatches).map(([k, m]) => `${k}: ${m}`), [], 'read the box as `x.value === "" ? DEFAULT : Number(x.value)`, and let the compute refuse a 0 it cannot use');
});
