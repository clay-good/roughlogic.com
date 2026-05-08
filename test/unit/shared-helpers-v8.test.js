// v8 Phase D - shared helpers (cost-output, context-band, standard-sizes).

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCost, formatCostOutput } from "../../cost-output.js";
import { formatContextBand } from "../../context-band.js";
import { roundToStandard, STANDARD_SIZES } from "../../standard-sizes.js";

// --- D.1 cost-output ---

test("formatCost renders USD with two decimals", () => {
  assert.equal(formatCost(3.5), "$3.50");
  assert.equal(formatCost(1234.567), "$1,234.57");
  assert.equal(formatCost(0), "$0.00");
});

test("formatCost handles non-finite gracefully", () => {
  assert.equal(formatCost(NaN), "-");
  assert.equal(formatCost(undefined), "-");
});

test("formatCostOutput total = quantity × unitPrice", () => {
  const r = formatCostOutput(10, 3.50, "sheet");
  assert.equal(r.total_usd, 35);
  assert.equal(r.total_text, "$35.00");
  assert.match(r.per_unit_text, /\$3\.50 per sheet/);
});

test("formatCostOutput returns null for negative inputs", () => {
  assert.equal(formatCostOutput(-1, 3.50, "sheet"), null);
  assert.equal(formatCostOutput(10, -3.50, "sheet"), null);
});

test("formatCostOutput returns null for non-finite inputs", () => {
  assert.equal(formatCostOutput("abc", 3.50, "sheet"), null);
  assert.equal(formatCostOutput(10, NaN, "sheet"), null);
});

// --- D.2 context-band ---

test("formatContextBand classifies low / normal / high", () => {
  assert.equal(formatContextBand(3, 5, 10).band, "low");
  assert.equal(formatContextBand(7, 5, 10).band, "normal");
  assert.equal(formatContextBand(15, 5, 10).band, "high");
});

test("formatContextBand boundaries are inclusive", () => {
  assert.equal(formatContextBand(5, 5, 10).band, "normal");
  assert.equal(formatContextBand(10, 5, 10).band, "normal");
});

test("formatContextBand text contains value, unit, band, and range", () => {
  const r = formatContextBand(7.5, 5, 10, "ft/s");
  assert.match(r.text, /7\.50 ft\/s/);
  assert.match(r.text, /normal/);
  assert.match(r.text, /typical 5-10 ft\/s/);
});

test("formatContextBand: integer values rendered as integer (no .00)", () => {
  const r = formatContextBand(7, 5, 10, "psi");
  assert.match(r.text, /^7 psi/);
});

test("formatContextBand errors on non-finite or low >= high", () => {
  assert.ok(formatContextBand(NaN, 5, 10).error);
  assert.ok(formatContextBand(7, "x", 10).error);
  assert.ok(formatContextBand(7, 10, 5).error);
  assert.ok(formatContextBand(7, 10, 10).error);
});

test("formatContextBand exposes is_low / is_normal / is_high booleans", () => {
  const r = formatContextBand(15, 5, 10);
  assert.equal(r.is_high, true);
  assert.equal(r.is_low, false);
  assert.equal(r.is_normal, false);
});

// --- D.3 standard-sizes ---

test("roundToStandard returns next size at or above value", () => {
  const r = roundToStandard(38, STANDARD_SIZES.transformer_kVA);
  assert.equal(r.recommended, 45);
  assert.equal(r.at_floor, false);
  assert.equal(r.at_cap, false);
});

test("roundToStandard returns floor when value <= smallest size", () => {
  const r = roundToStandard(5, STANDARD_SIZES.transformer_kVA);
  assert.equal(r.recommended, 15);
  assert.equal(r.at_floor, true);
});

test("roundToStandard caps at largest size when value exceeds table", () => {
  const r = roundToStandard(5000, STANDARD_SIZES.transformer_kVA);
  assert.equal(r.recommended, 1000);
  assert.equal(r.at_cap, true);
});

test("roundToStandard exact match returns same size", () => {
  const r = roundToStandard(75, STANDARD_SIZES.transformer_kVA);
  assert.equal(r.recommended, 75);
});

test("roundToStandard breaker amps ladder works at boundaries", () => {
  assert.equal(roundToStandard(35, STANDARD_SIZES.breaker_amps).recommended, 35);
  assert.equal(roundToStandard(36, STANDARD_SIZES.breaker_amps).recommended, 40);
});

test("roundToStandard pump HP includes fractional sizes (0.25, 0.333)", () => {
  assert.equal(roundToStandard(0.2, STANDARD_SIZES.pump_HP).recommended, 0.25);
  assert.equal(roundToStandard(0.3, STANDARD_SIZES.pump_HP).recommended, 0.333);
});

test("roundToStandard water-heater ladder picks 50 for 45 gal demand", () => {
  assert.equal(roundToStandard(45, STANDARD_SIZES.water_heater_gal).recommended, 50);
});

test("roundToStandard service-amps ladder picks 200 for 195 A demand", () => {
  assert.equal(roundToStandard(195, STANDARD_SIZES.service_amps).recommended, 200);
});

test("roundToStandard errors on non-finite value", () => {
  assert.ok(roundToStandard("abc", STANDARD_SIZES.transformer_kVA).error);
});

test("roundToStandard errors on empty / non-array sizes", () => {
  assert.ok(roundToStandard(50, []).error);
  assert.ok(roundToStandard(50, null).error);
});

test("roundToStandard errors on out-of-order sizes", () => {
  assert.ok(roundToStandard(50, [30, 100, 50]).error);
});

test("STANDARD_SIZES ladders are all sorted ascending", () => {
  for (const k of Object.keys(STANDARD_SIZES)) {
    const arr = STANDARD_SIZES[k];
    for (let i = 1; i < arr.length; i++) {
      assert.ok(arr[i] >= arr[i - 1], k + " not ascending at index " + i);
    }
  }
});
