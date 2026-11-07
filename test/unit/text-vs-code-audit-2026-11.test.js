// 2026-11-07 text-vs-code audit of the 200 fixes dated after 2026-10-03.
// Most findings were stale prose; these five were the code printing or
// refusing something the page itself promised.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSoilBearingCapacity } from "../../calc-geotech.js";
import { computeMotorFeederMultiple } from "../../calc-feeder.js";
import { computeSnowStackingArea } from "../../calc-winterops.js";
import { computeTravelLiftSlingPlacement } from "../../calc-marineaviation.js";
import { computePortableLadderSetup } from "../../calc-safety.js";
import { computeConstantPressureWellVfd, constantPressureWellVfdExample } from "../../calc-water.js";
import { computeFlashGasSubcool } from "../../calc-refrigerant.js";

test("soil bearing: the Circular option the page offers is accepted, with the square shape factors", () => {
  const args = { c: 1000, phi: 0, b_ft: 4, df_ft: 3 };
  const circ = computeSoilBearingCapacity({ ...args, shape: "circular" });
  assert.equal(circ.error, undefined, JSON.stringify(circ));
  assert.deepEqual(circ, computeSoilBearingCapacity({ ...args, shape: "square" }));
  assert.ok(computeSoilBearingCapacity({ ...args, shape: "oval" }).error);
});

test("motor feeder: a 10 A sum is a standard 240.6(A) fuse and is not 'stepped down' to itself", () => {
  const r = computeMotorFeederMultiple({ motors: [{ flc_A: 4, branch_device_A: 10 }] });
  assert.equal(r.feeder_ocpd_max_A, 10);
  assert.ok(!JSON.stringify(r).includes("is not a standard rating"), JSON.stringify(r));
});

test("snow stacking: one small event gives the same footprint on the one-event and season lines", () => {
  const r = computeSnowStackingArea({ lot_area_ft2: 2000, accumulation_in: 6, events: 1 });
  assert.ok(Math.abs(r.season_footprint_ft2 - r.footprint_ft2) < 1e-9, r.footprint_ft2 + " vs " + r.season_footprint_ft2);
  // A season big enough to reach the height limit is still a windrow.
  const big = computeSnowStackingArea({ lot_area_ft2: 100000, accumulation_in: 12, events: 3 });
  assert.ok(Math.abs(big.season_footprint_ft2 - big.season_length_ft * big.base_width_ft) < 1e-6);
});

test("travel lift: the over-limit verdict prints the sling tension it compared, not the vertical share", () => {
  const r = computeTravelLiftSlingPlacement({ displacement_lb: 27000, sling_spacing_ft: 20, cg_from_fwd_ft: 10, sling_wll_lb: 14000, sling_angle_deg: 70 });
  assert.match(r.wll_verdict, /tension is 14,366 lb/);
  assert.match(r.wll_verdict, /OVER the 14,000 lb limit/);
});

test("portable ladder: the note's extension term is the one the total charges", () => {
  const r = computePortableLadderSetup({ ladder_length_ft: 28, landing_height_ft: 20, extension_above_landing_ft: 5 });
  const m = r.note.match(/takes ([\d.]+) ft of rail, plus ([\d.]+) ft more for the extension - ([\d.]+) ft/);
  assert.ok(m, r.note);
  assert.ok(Math.abs(Number(m[1]) + Number(m[2]) - Number(m[3])) <= 0.1, m[0]);
});

test("constant-pressure well: a pump that cannot hold the setpoint says so even with drawdown left blank", () => {
  const r = computeConstantPressureWellVfd({ ...constantPressureWellVfdExample.inputs, drawdown_at_design_ft: 0, pump_max_head_ft: 200 });
  assert.equal(r.cannot_hold, true);
  assert.match(r.drawdown_verdict, /CANNOT hold the setpoint/);
});

test("flash-gas subcooling: a requirement past the typical 8-12 F charge is called out, and one under 8 F is not a failure", () => {
  const low = computeFlashGasSubcool({ vertical_lift_ft: 40, friction_dp_psi: 15 });
  assert.equal(low.typical_charge_covers, true);
  assert.match(low.verdict, /already holds/);
  const high = computeFlashGasSubcool({ vertical_lift_ft: 160, friction_dp_psi: 15 });
  assert.equal(high.typical_charge_covers, false);
  assert.match(high.verdict, /MORE than a typical 8-12 F charge/);
});
