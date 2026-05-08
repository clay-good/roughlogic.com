// Unit tests for calc-cross.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  convertUnit,
  convertTemperature,
  computeMaterialCost,
  computeMarkup,
  computeTimeAndMaterials,
  computeSalesTax,
  computeTipOut,
  unitConverterExample,
  materialCostExample,
  markupExample,
  salesTaxExample,
  tipOutExample,
} from "../../calc-cross.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 59: Unit Converter ---

test("Unit conversion example: 100 ft -> ~30.48 m", () => {
  const r = convertUnit(unitConverterExample.inputs);
  assert.ok(r.value > unitConverterExample.expectedRange.value.min);
  assert.ok(r.value < unitConverterExample.expectedRange.value.max);
});

test("Unit conversion: 1 gal_us -> ~3.785 L", () => {
  const r = convertUnit({ category: "volume", value: 1, from: "gal_us", to: "L" });
  assert.ok(close(r.value, 3.785411784, 1e-6));
});

test("Unit conversion: 1 atm -> 14.696 psi", () => {
  const r = convertUnit({ category: "pressure", value: 1, from: "atm", to: "psi" });
  assert.ok(close(r.value, 14.696, 0.01));
});

test("Unit conversion: 1 hp -> 745.7 W", () => {
  const r = convertUnit({ category: "power", value: 1, from: "hp", to: "W" });
  assert.ok(close(r.value, 745.6998715822702, 1e-6));
});

test("Unit conversion: 100 cfm -> ~47.2 L/s", () => {
  const r = convertUnit({ category: "flow", value: 100, from: "cfm", to: "L/s" });
  assert.ok(close(r.value, 47.1947443, 1e-3));
});

test("Unit conversion: 1 acre -> ~43560 ft^2", () => {
  const r = convertUnit({ category: "area", value: 1, from: "acre", to: "ft^2" });
  assert.ok(close(r.value, 43560, 0.01));
});

test("Unit conversion: round trip is identity", () => {
  const a = convertUnit({ category: "energy", value: 1000, from: "btu", to: "J" });
  const b = convertUnit({ category: "energy", value: a.value, from: "J", to: "btu" });
  assert.ok(close(b.value, 1000, 1e-9));
});

test("Unit conversion: unknown category returns error", () => {
  const r = convertUnit({ category: "unobtanium", value: 1, from: "x", to: "y" });
  assert.ok(r.error);
});

test("Temperature: 32 F -> 0 C", () => {
  const r = convertTemperature({ value: 32, from: "F", to: "C" });
  assert.ok(close(r.value, 0, 1e-9));
});

test("Temperature: 100 C -> 212 F", () => {
  const r = convertTemperature({ value: 100, from: "C", to: "F" });
  assert.ok(close(r.value, 212, 1e-9));
});

test("Temperature: 0 C -> 273.15 K", () => {
  const r = convertTemperature({ value: 0, from: "C", to: "K" });
  assert.ok(close(r.value, 273.15, 1e-9));
});

// --- Utility 60: Material Cost ---

test("Material cost example: 12.50 * 80 = 1000 subtotal", () => {
  const r = computeMaterialCost(materialCostExample.inputs);
  assert.ok(close(r.subtotal, 1000, 1e-9));
  assert.ok(close(r.tax, 82.5, 1e-9));
  assert.ok(close(r.total, 1132.5, 1e-9));
});

test("Material cost: negative input returns error", () => {
  const r = computeMaterialCost({ unit_price: -1, quantity: 1 });
  assert.ok(r.error);
});

// --- Utility 61: Markup ---

test("Markup example: cost 100, markup 50 percent -> price 150, margin ~33.33", () => {
  const r = computeMarkup(markupExample.inputs);
  assert.ok(close(r.selling_price, 150, 1e-9));
  assert.ok(close(r.margin_percent, 33.333, 0.01));
});

test("Markup: margin 25 percent on cost 75 -> price 100", () => {
  const r = computeMarkup({ cost: 75, mode: "margin_percent", value: 25 });
  assert.ok(close(r.selling_price, 100, 1e-9));
});

test("Markup: from selling price -> derives both percents", () => {
  const r = computeMarkup({ cost: 80, mode: "selling_price", value: 100 });
  assert.ok(close(r.profit, 20, 1e-9));
  assert.ok(close(r.markup_percent, 25, 1e-9));
  assert.ok(close(r.margin_percent, 20, 1e-9));
});

test("Markup: zero cost returns error", () => {
  const r = computeMarkup({ cost: 0, mode: "markup_percent", value: 10 });
  assert.ok(r.error);
});

// --- Utility 62: Time and Materials ---

test("T&M: 8 hr * 95 + 250 + 15% OH + 10% profit", () => {
  const r = computeTimeAndMaterials({ hours: 8, labor_rate_per_hour: 95, material_cost: 250, overhead_percent: 15, profit_percent: 10 });
  // labor 760, direct 1010, OH 151.5, subtotal 1161.5, profit 116.15, total 1277.65
  assert.ok(close(r.labor, 760, 1e-9));
  assert.ok(close(r.subtotal, 1161.5, 1e-9));
  assert.ok(close(r.total, 1277.65, 1e-9));
});

// --- Utility 63: Sales Tax ---

test("Sales tax example: TX 6.25 percent on 1000 -> 62.5 tax, 1062.5 total", () => {
  const r = computeSalesTax(salesTaxExample.inputs);
  assert.ok(close(r.rate_percent, salesTaxExample.expected.rate_percent, 1e-9));
  assert.ok(close(r.tax, salesTaxExample.expected.tax, 1e-9));
  assert.ok(close(r.total, salesTaxExample.expected.total, 1e-9));
});

test("Sales tax: unknown state returns error", () => {
  const r = computeSalesTax({ state: "XX", subtotal: 100 });
  assert.ok(r.error);
});

test("Sales tax: custom rate overrides state", () => {
  const r = computeSalesTax({ state: "CA", subtotal: 1000, custom_rate_percent: 10 });
  assert.equal(r.rate_percent, 10);
  assert.ok(close(r.tax, 100, 1e-9));
});

// --- Utility 64: Tip Out ---

test("Tip out example: 600 across 8/4/4 -> 300/150/150", () => {
  const r = computeTipOut(tipOutExample.inputs);
  assert.equal(r.splits.length, 3);
  assert.ok(close(r.splits[0].share, tipOutExample.expected.A, 1e-9));
  assert.ok(close(r.splits[1].share, tipOutExample.expected.B, 1e-9));
  assert.ok(close(r.splits[2].share, tipOutExample.expected.C, 1e-9));
});

test("Tip out: empty members returns error", () => {
  const r = computeTipOut({ total_amount: 100, members: [] });
  assert.ok(r.error);
});

test("Tip out: zero hours returns error", () => {
  const r = computeTipOut({ total_amount: 100, members: [{ name: "A", hours: 0 }] });
  assert.ok(r.error);
});
