// aFig picks "a" or "an" by how a printed figure is said. Added 2026-11-14.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aFig, fmt } from "../../ui-fields.js";

test("aFig: an before eight, eleven and eighteen, their tens and thousands", () => {
  for (const t of ["8", "8.5", "80", "85", "800", "8,000", "8:1", "11", "11.5", "11,000", "18", "18,250", "80%"]) assert.equal(aFig(t), "an " + t, t);
  for (const t of ["1", "1.8", "10", "110", "118", "180", "1,100", "1,800", "2", "-8", "$80", "eight", "aluminum"]) assert.equal(aFig(t), "a " + t, t);
  assert.equal(aFig("85", true), "An 85");
  assert.equal(aFig("50", true), "A 50");
});

test("fmt: a figure that rounds to zero prints without a minus sign", () => {
  assert.equal(fmt(-0.00001, 4), "0.0000");
  assert.equal(fmt(-0.4, 0), "0");
  assert.equal(fmt(-0, 2), "0.00");
  assert.equal(fmt(-0.00051, 3), "-0.001");
  assert.equal(fmt(-12345.6, 1), "-12,345.6");
});

test("fmt: a figure past 1e21 prints three figures, not every digit of the double", () => {
  assert.equal(fmt(3.6537540933272573e49, 1), "3.65e+49");
  assert.equal(fmt(-1.5000000000000003e35, 0), "-1.50e+35");
  assert.equal(fmt(9.99e20, 0), "999,000,000,000,000,000,000");
});
