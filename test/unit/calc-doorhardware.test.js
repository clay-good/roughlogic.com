// Independent checks for calc-doorhardware.js tiles whose only other coverage
// is the project's own derivation (hardening, 2026-10-15). Each test holds the
// compute to something its derivation did not write: a published code limit,
// standard prep dimensions as exact fractions, a time-stepped integration, a
// moment balance, a compartment-by-compartment count, or an invariant.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeElectricLockPowerBudget, computeLockBacksetLayout, computePanicHardwareForce,
  computeMaglockLeverage, computeDoorUndercutTransferAir, computeFireDoorClearance,
  computeRevolvingDoorThroughput,
} from "../../calc-doorhardware.js";

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// ---- electric-lock-power-budget ----
// NFPA 72 secondary power: 24 h of standby followed by 5 min of alarm. Integrate
// the current profile minute by minute instead of using the closed form.
test("electric-lock-power-budget: defaults are NFPA 72's 24 h standby + 5 min alarm, and Ah equals a minute-by-minute integral", () => {
  const inp = { device_count: 14, holding_current_a: 0.45, inrush_current_a: 1.5, supply_rating_a: 12, installed_battery_ah: 12, alarm_current_a: 2.2 };
  const r = computeElectricLockPowerBudget(inp);
  let ah = 0;
  for (let m = 0; m < 24 * 60; m++) ah += 14 * 0.45 / 60;
  for (let m = 0; m < 5; m++) ah += 2.2 / 60;
  assert.ok(rel(r.amp_hours_required, ah) < 1e-9);
  assert.ok(rel(r.amp_hours_after_derate, ah / 0.8) < 1e-9);
  // 14 x 0.45 = 6.3 A steady; 14 x 1.5 = 21 A all re-energizing at once on a 12 A supply.
  assert.ok(Math.abs(r.steady_current_a - 6.3) < 1e-9);
  assert.equal(r.supply_ok, true);
  assert.equal(r.inrush_ok, false);
  // The battery count is the fewest batteries whose capacity covers the derated need.
  let n = 0; while (n * 12 < ah / 0.8) n++;
  assert.equal(r.batteries_needed, n);
});

// ---- lock-backset-strike-layout ----
// ANSI/BHMA A156.2 / DHI A115.2 cylindrical prep: 2-3/8 or 2-3/4 backset, 2-1/8
// cross bore, 1 in edge bore, 1-3/4 door. In exact sixteenths.
test("lock-backset-strike-layout: standard cylindrical prep dimensions in exact fractions", () => {
  const a = computeLockBacksetLayout({ backset_in: 38 / 16, cross_bore_dia_in: 34 / 16, edge_bore_dia_in: 1, door_thickness_in: 28 / 16, lock_height_in: 38, stile_width_in: 5 });
  assert.equal(a.cross_bore_far_side_in, 55 / 16); // 3-7/16 in
  assert.equal(a.cross_bore_near_side_in, 21 / 16); // 1-5/16 in
  assert.equal(a.edge_bore_side_wall_in, 6 / 16); // 3/8 in each side
  assert.equal(a.other_backset_in, 2.75);
  assert.equal(a.backset_mismatch_in, 6 / 16);
  const b = computeLockBacksetLayout({ backset_in: 44 / 16, stile_width_in: 3.75 });
  assert.equal(b.cross_bore_far_side_in, 61 / 16); // 3-13/16 in
  assert.equal(b.stile_ok, false); // a 3-3/4 in stile is 1/16 short of a 2-3/4 prep
  assert.equal(b.other_backset_in, 2.375);
  // ADA 2010 / ICC A117.1 309.4 and 404.2.7: operable parts 34 to 48 in AFF.
  assert.equal(computeLockBacksetLayout({ stile_width_in: 5, lock_height_in: 48 }).height_ok, true);
  assert.equal(computeLockBacksetLayout({ stile_width_in: 5, lock_height_in: 48.1 }).height_ok, false);
  assert.equal(computeLockBacksetLayout({ stile_width_in: 5, lock_height_in: 33.9 }).height_ok, false);
});

// ---- panic-hardware-force ----
// IBC 1010.1.3: 15 lbf to release the latch, 30 lbf to set in motion, 15 lbf to
// swing to full open. IBC 1010.2.9.1 (2021): actuating portion at least half the
// leaf width, mounted 34 to 48 in above the floor.
test("panic-hardware-force: default limits are IBC 1010.1.3's 15/30/15 lbf and the half-leaf / 34-48 in rules hold at their edges", () => {
  const base = { release_force_lbf: 15, set_in_motion_lbf: 30, swing_force_lbf: 15, door_leaf_width_in: 36, actuating_portion_in: 18, mounting_height_in: 34 };
  const r = computePanicHardwareForce(base);
  assert.equal(r.all_ok, true);
  assert.equal(r.required_actuating_in, 18);
  assert.equal(computePanicHardwareForce({ ...base, actuating_portion_in: 17.9 }).actuating_ok, false);
  assert.equal(computePanicHardwareForce({ ...base, mounting_height_in: 48 }).height_ok, true);
  assert.equal(computePanicHardwareForce({ ...base, mounting_height_in: 48.5 }).height_ok, false);
  assert.equal(computePanicHardwareForce({ ...base, release_force_lbf: 15.1 }).release_ok, false);
  assert.equal(computePanicHardwareForce({ ...base, set_in_motion_lbf: 30.1 }).set_in_motion_ok, false);
  assert.equal(computePanicHardwareForce({ ...base, swing_force_lbf: 15.1 }).swing_ok, false);
});

// ---- maglock-holding-leverage ----
// Moment balance about the hinge: the pull at the handle times its arm equals
// the magnet force times its arm. Electromagnet force F = B^2 A / (2 mu0) with
// B proportional to coil current, hence to V for a fixed coil resistance.
test("maglock-holding-leverage: handle force satisfies the moment balance about the hinge; force follows V^2", () => {
  for (const [F, dl, dh, w] of [[1200, 3, 36, 36], [600, 33, 34, 36], [1200, 36, 36, 36], [1500, 10, 40, 42]]) {
    const r = computeMaglockLeverage({ rated_holding_lb: F, lock_distance_from_hinge_in: dl, handle_distance_from_hinge_in: dh, door_width_in: w, target_resistance_lb: 100 });
    assert.ok(Math.abs(r.force_at_handle_lb * dh - F * dl) < 1e-9 * F * dl);
    assert.ok(Math.abs(r.rating_needed_lb * dl - 100 * dh) < 1e-9 * 100 * dh);
  }
  // Same coil, 12 V on a 24 V magnet: B halves, so B^2 A/(2 mu0) quarters.
  const mu0 = 4e-7 * Math.PI, A = 0.01, B24 = 1.0, B12 = 0.5;
  const physRatio = (B12 ** 2 * A / (2 * mu0)) / (B24 ** 2 * A / (2 * mu0));
  const r = computeMaglockLeverage({ rated_holding_lb: 1200, lock_distance_from_hinge_in: 34, handle_distance_from_hinge_in: 34, door_width_in: 36, voltage_at_lock: 12, rated_voltage: 24, target_resistance_lb: 100 });
  assert.ok(Math.abs(r.voltage_factor - physRatio) < 1e-12);
  assert.ok(Math.abs(r.effective_force_lb - 300) < 1e-9);
});

// ---- door-undercut-transfer-air ----
// Cross-check the outputs against each other in different units: a 36 x 1 in
// gap is 0.25 ft^2, 75 cfm at 300 fpm; the undercut the tile asks for must run
// at exactly the velocity ceiling, and the grille area spread over the door
// width must be that same undercut.
test("door-undercut-transfer-air: the needed undercut runs at the velocity ceiling and equals the grille area over the door width", () => {
  const one = computeDoorUndercutTransferAir({ door_width_in: 36, undercut_in: 1, required_cfm: 100, max_velocity_fpm: 300 });
  assert.equal(one.free_area_sqft, 0.25);
  assert.equal(one.cfm_at_velocity, 75);
  assert.ok(Math.abs(one.velocity_at_required_fpm - 400) < 1e-9);
  assert.equal(one.noisy, true);
  for (const [w, cfm, v] of [[36, 250, 300], [30, 80, 250], [42, 150, 400]]) {
    const r = computeDoorUndercutTransferAir({ door_width_in: w, undercut_in: 0.75, required_cfm: cfm, max_velocity_fpm: v });
    const atNeeded = computeDoorUndercutTransferAir({ door_width_in: w, undercut_in: r.undercut_needed_in, required_cfm: cfm, max_velocity_fpm: v });
    assert.ok(rel(atNeeded.velocity_at_required_fpm, v) < 1e-12);
    assert.ok(rel(r.grille_free_area_sqft * 144 / w, r.undercut_needed_in) < 1e-12);
  }
});

// ---- fire-door-clearance ----
// NFPA 80 (2019) 4.8.4 / 6.3.1.7: steel doors 1/8 in +/- 1/16 in at head, jambs
// and meeting edges (so 3/16 in maximum), and 3/4 in maximum from the bottom of
// the door to a noncombustible floor.
test("fire-door-clearance: NFPA 80 steel-door limits pass exactly at 3/16 in and 3/4 in and fail just past them", () => {
  const nfpa = { perimeter_limit_in: 3 / 16, meeting_limit_in: 3 / 16, bottom_limit_in: 3 / 4 };
  const at = { head_in: 3 / 16, hinge_jamb_in: 3 / 16, strike_jamb_in: 3 / 16, meeting_edge_in: 3 / 16, bottom_in: 0.75 };
  assert.equal(computeFireDoorClearance({ ...at, ...nfpa }).pass, true);
  assert.equal(computeFireDoorClearance({ ...at }).bottom_margin_in, 0); // default bottom limit is NFPA 80's 3/4 in
  const over = computeFireDoorClearance({ ...at, strike_jamb_in: 0.25, bottom_in: 1.25, ...nfpa });
  assert.equal(over.pass, false);
  assert.equal(over.failing_locations, "strike jamb, bottom");
  assert.equal(over.bottom_reduction_needed_in, 0.5);
  // The example's 3/16 in strike jamb fails the 1/8 in wood-door default but passes the steel-door limit.
  const ex = { head_in: 0.125, hinge_jamb_in: 0.125, strike_jamb_in: 0.1875, meeting_edge_in: 0.125, bottom_in: 0.5 };
  assert.equal(computeFireDoorClearance(ex).pass, false);
  assert.equal(computeFireDoorClearance({ ...ex, ...nfpa }).pass, true);
});

// ---- revolving-door-throughput ----
// Count compartments: every minute rpm x wings compartments pass the entry
// point, each carrying people_per_compartment. Then step the peak window minute
// by minute with every installed door running to find the queue left over.
test("revolving-door-throughput: hourly capacity and peak queue match a compartment-by-compartment count", () => {
  const inp = { rpm: 3, wings: 4, people_per_compartment: 2, utilization_pct: 60, building_population: 2000, peak_fraction_pct: 70, peak_window_min: 20, device_count: 3, operating_hours: 8 };
  const r = computeRevolvingDoorThroughput(inp);
  let compartments = 0;
  for (let min = 0; min < 60; min++) for (let rev = 0; rev < 3; rev++) compartments += 4;
  assert.equal(r.theoretical_per_hour, compartments * 2); // 1,440
  assert.ok(Math.abs(r.effective_per_hour - 864) < 1e-9);
  let arrived = 0, served = 0;
  for (let min = 0; min < 20; min++) {
    arrived += 1400 / 20;
    served = Math.min(arrived, served + 3 * 864 / 60);
  }
  assert.ok(Math.abs(r.queue_at_peak - (arrived - served)) < 1e-6); // 536 people
  // The fewest doors whose combined rate covers 4,200 people/hour at 864 each.
  let n = 0; while (n * 864 < 4200) n++;
  assert.equal(r.devices_required, n);
  assert.equal(r.installed_enough, false);
  // With enough doors, no queue.
  assert.equal(computeRevolvingDoorThroughput({ ...inp, device_count: n }).queue_at_peak, 0);
});
