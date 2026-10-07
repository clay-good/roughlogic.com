// The dead-input gate must not take a parameter's name in a note string or a
// comment as a use of it. Seeded failures for scripts/check-dead-inputs.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findings, stripStringsAndComments } from "../../scripts/check-dead-inputs.mjs";

test("check-dead-inputs: a parameter named only in a note string is dead", () => {
  const src = `export function computeX({ v = 0, gamma = 62.4 } = {}) {
  return { h: v * v / 64.4, note: "Water defaults: gamma 62.4 lb/ft^3." };
}`;
  assert.deepEqual(findings(src), [{ fnName: "computeX", name: "gamma" }]);
});

test("check-dead-inputs: a parameter named only in a comment is dead", () => {
  const src = `export function computeX({ v = 0, process } = {}) {
  // the process k-factor is applied by the page
  return { h: v };
}`;
  assert.deepEqual(findings(src), [{ fnName: "computeX", name: "process" }]);
});

test("check-dead-inputs: a use inside a template expression counts", () => {
  const src = "export function computeX({ v = 0, unit } = {}) {\n  return { h: v, label: `${v} ${unit}` };\n}";
  assert.deepEqual(findings(src), []);
});

test("check-dead-inputs: stripping keeps code and the quotes around blanked text", () => {
  assert.equal(stripStringsAndComments('a + "gamma" /* gamma */ + b // gamma'), 'a + ""  + b ');
});
