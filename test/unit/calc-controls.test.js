// calc-controls.js (spec-v1818..v1823) against references the specs did not
// write: a time-stepped simulation of the on-off thermostat the cycling tile
// models in closed form, BACnet MS/TP bit timing, and the balances the tiles'
// notes claim. The worked-example fixture recomputes each spec's own example,
// so an error a spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTransmitterSpanScaling, computeDeadbandCyclingRate, computeTrendLogStorage,
  computeMstpSegmentLoading, computeDamperActuatorTorque, computeLoopErrorStackup,
} from "../../calc-controls.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const cyclingBase = { capacitance_btu_f: 1000, ua_btu_hr_f: 500, setpoint_f: 70, outdoor_f: 30, capacity_btu_hr: 25000, deadband_f: 2, alt_deadband_f: 1, alt_capacity_btu_hr: 50000 };

// ---- independent references ----

test("deadband cycling: a time-stepped thermostat cycles as often as the closed form says", () => {
  // C dT/dt = Q x on - UA (T - T_out), switching on at setpoint - db/2 and
  // off at setpoint + db/2. The tile holds the load at UA (setpoint - T_out);
  // the simulation lets it vary with the room temperature, which moves the
  // answer by well under 1% across a 2 degF band.
  const simulate = ({ capacitance_btu_f: C, ua_btu_hr_f: UA, setpoint_f: sp, outdoor_f: out, capacity_btu_hr: Q, deadband_f: db }) => {
    const dt = 1e-5; // hours
    let T = sp - db / 2, on = true, starts = 0, t = 0;
    while (t < 20) {
      T += (Q * (on ? 1 : 0) - UA * (T - out)) / C * dt;
      if (on && T >= sp + db / 2) on = false;
      else if (!on && T <= sp - db / 2) { on = true; if (t > 2) starts++; }
      t += dt;
    }
    return starts / 18;
  };
  for (const inputs of [cyclingBase, { ...cyclingBase, outdoor_f: 45 }, { ...cyclingBase, capacity_btu_hr: 50000 }]) {
    within(computeDeadbandCyclingRate(inputs).cycles_per_hour, simulate(inputs), 1.5, `outdoor ${inputs.outdoor_f}, Q ${inputs.capacity_btu_hr}`);
  }
});

test("deadband cycling: the rate peaks at half load at Q / (4 C db)", () => {
  const Q = 25000, C = 1000, db = 2, UA = 500;
  const r = computeDeadbandCyclingRate(cyclingBase);
  close(r.max_cycles_per_hour, Q / (4 * C * db), "peak");
  const half = computeDeadbandCyclingRate({ ...cyclingBase, outdoor_f: 70 - Q / 2 / UA });
  close(half.cycles_per_hour, r.max_cycles_per_hour, "at half load");
  close(half.duty_pct, 50, "half load is half duty");
});

test("MS/TP: each octet is ten bit times and the turnaround is forty", () => {
  const r = computeMstpSegmentLoading({ baud: 76800, device_count: 32, token_octets: 8, turnaround_bits: 40, frame_octets: 50, transmitting_share: 0.5, alt_device_count: 64, alt_baud: 38400 });
  close(r.token_frame_ms, 80 / 76800 * 1000, "token");
  close(r.turnaround_ms, 40 / 76800 * 1000, "turnaround");
  close(r.idle_rotation_ms, 32 * 120 / 76800 * 1000, "idle rotation");
  close(r.alt_baud_ratio, 2, "half the baud, twice the loop");
  close(r.alt_devices_ratio, 2, "twice the devices, twice the loop");
});

// ---- balances the notes claim ----

test("4-20 mA: 12 mA is mid-span, and the URL basis costs the turndown", () => {
  const r = computeTransmitterSpanScaling({ lower_range_value: 0, upper_range_value: 100, upper_range_limit: 250, loop_ma: 12, accuracy_pct: 0.1, low_reading_value: 20, alt_upper_range_value: 25 });
  close(r.value_eng, 50, "mid-span");
  close(r.basis_ratio, r.turndown, "URL over span");
  const low = computeTransmitterSpanScaling({ lower_range_value: -50, upper_range_value: 150, upper_range_limit: 250, loop_ma: 4, accuracy_pct: 0.1, low_reading_value: 20, alt_upper_range_value: 25 });
  close(low.value_eng, -50, "4 mA is the lower range value");
});

test("trend log: samples are points x rate x time, and the buffer loss is the overflow", () => {
  const r = computeTrendLogStorage({ point_count: 5000, interval_min: 5, retention_years: 2, bytes_per_sample: 16, controller_points: 200, controller_buffer_samples: 1000, poll_interval_min: 60, cov_changes_per_point_day: 100, alt_interval_min: 1 });
  close(r.total_samples, 5000 * 12 * 24 * 365 * 2, "samples");
  close(r.alt_storage_gb, 5 * r.storage_gb, "a fifth of the interval");
  close(r.buffer_fill_min, 1000 / 2400 * 60, "buffer fill");
  close(r.poll_loss_pct, 100 * (2400 - 1000) / 2400, "overwritten");
});

test("actuator: torque is area x the factor, and the selection is the smallest size that covers the design", () => {
  const r = computeDamperActuatorTorque({ damper_width_in: 48, damper_height_in: 36, torque_factor_in_lb_ft2: 5, sealed_torque_factor_in_lb_ft2: 9, safety_factor: 1.5 });
  close(r.required_torque_in_lb, 12 * 5, "12 sq ft at 5 in-lb");
  assert.ok(r.selected_actuator_in_lb >= r.design_torque_in_lb);
});

test("error stack-up: worst case adds, RSS adds in quadrature, and RSS never exceeds worst case", () => {
  const r = computeLoopErrorStackup({ span_eng: 100, element_err_eng: 0.5, transmitter_err_pct_span: 0.2, input_err_pct_span: 0.1, installation_err_eng: 4, averaging_err_eng: 0.5, deadband_eng: 1 });
  close(r.worst_case_eng, 0.8, "worst case");
  close(r.rss_eng, Math.sqrt(0.25 + 0.04 + 0.01), "RSS");
  close(r.total_with_installation_eng, Math.sqrt(0.3 + 16), "installation in quadrature");
  assert.ok(r.rss_eng <= r.worst_case_eng);
});
