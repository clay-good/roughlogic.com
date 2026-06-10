// spec-v28 unit tests: low-voltage / data / security cabling (6 tiles) plus
// the EN.1 lv-dc-drop NAC end-of-line enhancement. The six tiles landed in a
// new calc-lowvoltage.js module registered under Group A (the spec's
// documented non-gated fallback; opening Group Z is gated on maintainer
// signoff). Pins the worked examples, the alternate modes, and the edge flags.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFiberLossBudget, computeCableTrayFill, computeCctvStorage,
  computeSpeaker70vLine, computeStandbyBatterySizing, computeCoaxRgLoss,
} from "../../calc-lowvoltage.js";
import { computeLVDCDrop } from "../../calc-electrical.js";

const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

// --- Z.1 fiber-loss-budget ---
test("fiber-loss-budget: total loss, margin, pass/fail, breakdown sum", () => {
  const r = computeFiberLossBudget({ length_m: 300, attenuation_db_km: 3.0, connector_count: 2, loss_per_connector_db: 0.75, splice_count: 0, max_channel_loss_db: 2.6 });
  assert.ok(near(r.total_loss_db, 2.4));
  assert.ok(near(r.margin_db, 0.2));
  assert.strictEqual(r.pass, true);
  // breakdown sums to the total (C-4)
  assert.ok(near(r.fiber_loss_db + r.connector_loss_db + r.splice_loss_db, r.total_loss_db));
  // a longer link pushes loss over budget -> fail
  const fail = computeFiberLossBudget({ length_m: 2000, attenuation_db_km: 3.0, connector_count: 2, loss_per_connector_db: 0.75, max_channel_loss_db: 2.6 });
  assert.strictEqual(fail.pass, false);
  assert.ok("error" in computeFiberLossBudget({ length_m: 0, attenuation_db_km: 3 }));
});

// --- Z.2 cable-tray-fill ---
test("cable-tray-fill: sum-of-diameters and area cases", () => {
  const big = computeCableTrayFill({ tray_type: "ladder", tray_width_in: 12, cables: [{ count: 6, diameter_in: 1.5, large: true }] });
  assert.strictEqual(big.fill_value, 9);
  assert.strictEqual(big.allowable, 12);
  assert.strictEqual(big.pass, true);
  // over-width fails
  const over = computeCableTrayFill({ tray_type: "ladder", tray_width_in: 12, cables: [{ count: 10, diameter_in: 1.5, large: true }] });
  assert.strictEqual(over.pass, false);
  // small-cable area against the column-2 allowable
  const small = computeCableTrayFill({ tray_type: "ladder", tray_width_in: 12, cables: [{ count: 20, diameter_in: 0.5, large: false }] });
  assert.ok(near(small.allowable, 14.0, 0.01)); // ~1.167 * 12
  assert.strictEqual(small.pass, true);
  assert.ok("error" in computeCableTrayFill({ tray_width_in: 0, cables: [{ count: 1, diameter_in: 1 }] }));
});

// --- Z.3 cctv-storage ---
test("cctv-storage: storage, aggregate bandwidth, motion halving", () => {
  const r = computeCctvStorage({ camera_count: 1, bitrate_mbps: 4, recording_mode: "continuous", retention_days: 30 });
  assert.ok(near(r.total_storage_gb, 1296, 0.1));
  assert.ok(near(r.total_storage_tb, 1.296, 0.001));
  assert.strictEqual(r.aggregate_bandwidth_mbps, 4);
  assert.strictEqual(computeCctvStorage({ camera_count: 16, bitrate_mbps: 4, recording_mode: "continuous", retention_days: 30 }).aggregate_bandwidth_mbps, 64);
  // 50% motion duty halves the storage (C-4)
  const motion = computeCctvStorage({ camera_count: 1, bitrate_mbps: 4, recording_mode: "motion", motion_duty_percent: 50, retention_days: 30 });
  assert.ok(near(motion.total_storage_gb, 648, 0.1));
  // retention 0 -> 0 storage with a note, not an error
  const zero = computeCctvStorage({ camera_count: 1, bitrate_mbps: 4, retention_days: 0 });
  assert.strictEqual(zero.total_storage_gb, 0);
  assert.ok("error" in computeCctvStorage({ camera_count: 1, bitrate_mbps: 0, retention_days: 30 }));
  assert.ok("error" in computeCctvStorage({ camera_count: 1, bitrate_mbps: 4, recording_mode: "motion", motion_duty_percent: 150, retention_days: 30 }));
});

// --- Z.4 speaker-70v-line ---
test("speaker-70v-line: budget, reflected impedance, open-line guard", () => {
  const r = computeSpeaker70vLine({ amp_rated_w: 200, headroom_percent: 20, tap_watts: 8, tap_count: 16, line_voltage_v: 70.7 });
  assert.strictEqual(r.total_tap_w, 128);
  assert.strictEqual(r.budget_limit_w, 160);
  assert.strictEqual(r.within_budget, true);
  assert.ok(near(r.reflected_impedance_ohm, 39.05, 0.1));
  // over-budget flagged
  const over = computeSpeaker70vLine({ amp_rated_w: 200, headroom_percent: 20, tap_watts: 8, tap_count: 24, line_voltage_v: 70.7 });
  assert.strictEqual(over.within_budget, false);
  // zero load -> impedance suppressed (no divide-by-zero)
  const open = computeSpeaker70vLine({ amp_rated_w: 200, headroom_percent: 20, tap_watts: 0, tap_count: 0, line_voltage_v: 70.7 });
  assert.strictEqual(open.reflected_impedance_ohm, null);
  assert.ok("error" in computeSpeaker70vLine({ amp_rated_w: 0, tap_watts: 8, tap_count: 16, line_voltage_v: 70.7 }));
});

// --- Z.5 standby-battery-sizing ---
test("standby-battery-sizing: required Ah, next standard, derate flag", () => {
  const r = computeStandbyBatterySizing({ standby_current_a: 0.5, standby_hours: 24, alarm_current_a: 2.0, alarm_minutes: 5, derate: 1.2 });
  assert.ok(near(r.required_ah, 14.6, 0.05));
  assert.strictEqual(r.next_standard_ah, 18);
  // 60 h standby case is larger
  const long = computeStandbyBatterySizing({ standby_current_a: 0.5, standby_hours: 60, alarm_current_a: 2.0, alarm_minutes: 5, derate: 1.2 });
  assert.ok(long.required_ah > r.required_ah);
  // derate below 1 is flagged
  const credit = computeStandbyBatterySizing({ standby_current_a: 0.5, standby_hours: 24, alarm_current_a: 2.0, alarm_minutes: 5, derate: 0.8 });
  assert.ok(credit.notes.some((n) => n.toLowerCase().includes("derate")));
  assert.ok("error" in computeStandbyBatterySizing({ standby_current_a: -1, standby_hours: 24, alarm_current_a: 2, alarm_minutes: 5 }));
});

// --- Z.6 coax-rg-loss ---
test("coax-rg-loss: loss, end level, max-run round-trip", () => {
  const r = computeCoaxRgLoss({ mode: "loss", loss_per_100ft_db: 6, length_ft: 100, source_level: 0 });
  assert.strictEqual(r.total_loss_db, 6);
  assert.strictEqual(r.end_level, -6);
  // 200 ft doubles it
  assert.strictEqual(computeCoaxRgLoss({ mode: "loss", loss_per_100ft_db: 6, length_ft: 200 }).total_loss_db, 12);
  // max-run round-trips
  const mr = computeCoaxRgLoss({ mode: "max-run", loss_per_100ft_db: 6, source_level: 0, target_level: -6 });
  assert.strictEqual(mr.max_run_ft, 100);
  assert.ok("error" in computeCoaxRgLoss({ mode: "loss", loss_per_100ft_db: 6, length_ft: 0 }));
  assert.ok("error" in computeCoaxRgLoss({ mode: "max-run", loss_per_100ft_db: 0, source_level: 0, target_level: -6 }));
});

// --- EN.1 lv-dc-drop NAC end-of-line enhancement ---
test("lv-dc-drop EN.1: NAC end-of-line check, backward-compatible default", () => {
  // no device minimum -> prior output, nac null
  const base = computeLVDCDrop({ system_V: 24, awg: "14", run_length_ft: 200, current_A: 0.5, application: "led_lighting" });
  assert.ok(base.drop_V > 0);
  assert.strictEqual(base.nac, null);
  // NAC mode: end-of-line = worst-case source - drop, pass vs device minimum
  const nac = computeLVDCDrop({ system_V: 24, awg: "14", run_length_ft: 200, current_A: 0.5, application: "led_lighting", device_min_voltage_V: 16, worst_case_source_V: 20.4 });
  assert.ok(nac.nac !== null);
  assert.ok(near(nac.nac.end_of_line_V, 20.4 - base.drop_V, 1e-6));
  assert.strictEqual(nac.nac.pass, nac.nac.end_of_line_V >= 16);
  // a NAC below the device minimum fails
  const fail = computeLVDCDrop({ system_V: 24, awg: "18", run_length_ft: 1000, current_A: 1.0, application: "led_lighting", device_min_voltage_V: 16, worst_case_source_V: 20.4 });
  assert.strictEqual(fail.nac.pass, fail.nac.end_of_line_V >= 16);
  // invalid NAC inputs error
  assert.ok("error" in computeLVDCDrop({ system_V: 24, awg: "14", run_length_ft: 200, current_A: 0.5, device_min_voltage_V: -1 }));
  assert.ok("error" in computeLVDCDrop({ system_V: 24, awg: "14", run_length_ft: 200, current_A: 0.5, device_min_voltage_V: 16, worst_case_source_V: 0 }));
});
