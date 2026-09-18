// calc-containment.js (spec-v1692..v1696) against references the specs did not
// write: the radon pipe's Blasius friction factor checked against Colebrook's
// smooth-pipe equation solved iteratively, the 5.192 lb/sq ft per in. w.c.
// conversion, and the identities the tiles' notes claim. These tiles' only
// worked-example rows recompute their own specs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeRadonFanStatic, computeSubSlabSuctionField, computeAcidWasteNeutralization,
  computeFumeHoodFaceVelocity, computeLabContainmentPressure,
} from "../../calc-containment.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

test("radon pipe: the Blasius loss agrees with Colebrook's smooth-pipe equation within 3%", () => {
  const r = computeRadonFanStatic({ flow_cfm: 80, pipe_diameter_in: 4, pipe_length_ft: 30, fan_static_in_wc: 1.2, measured_vacuum_in_wc: 1, alt_pipe_diameter_in: 6 });
  const d = 4 / 12, v = 80 / (Math.PI / 4 * d * d) / 60, re = v * d / 1.57e-4;
  assert.ok(re > 4000 && re < 1e5, "Blasius range");
  let f = 0.02;
  for (let i = 0; i < 50; i++) f = Math.pow(-2 * Math.log10(2.51 / (re * Math.sqrt(f))), -2);
  const colebrookInWc = f * (30 / d) * v * v / 64.4 * 0.075 / 5.192;
  within(r.pipe_loss_in_wc, colebrookInWc, 3, "pipe loss");
  within(62.3 / 12, 5.192, 0.01, "5.192 lb/sq ft is an inch of water at about 68 degF (62.3 lb/cu ft)");
});

test("sub-slab: points cover the area AND span the slab's longest side", () => {
  const r = computeSubSlabSuctionField({ slab_area_ft2: 1600, reaches_ft: 25, fails_ft: 40, slab_length_ft: 80, slab_width_ft: 20, existing_points: 1 });
  assert.equal(r.points_required, Math.max(1, Math.ceil(1600 / (Math.PI * 625))));
  assert.equal(r.points_by_length, Math.ceil(80 / 50));
  assert.equal(r.governing_points, Math.max(r.points_required, r.points_by_length));
});

test("neutralization: volume is peak flow times retention", () => {
  const r = computeAcidWasteNeutralization({ peak_flow_gpm: 25, retention_minutes: 30, slug_volume_gal: 5, tank_volume_gal: 750, discharge_ph_min: 5.5, discharge_ph_max: 10, measured_ph: 7.2 });
  close(r.required_volume_gal, 750, "25 gpm x 30 min");
  assert.equal(r.in_window, true);
});

test("fume hood: exhaust is the sash opening times face velocity, and the heat follows the extra air", () => {
  const r = computeFumeHoodFaceVelocity({ sash_width_ft: 6, sash_height_in: 18, face_velocity_fpm: 100, alt_sash_height_in: 30, heating_rise_f: 60, hours_per_year: 8760, energy_cost_per_mmbtu: 12, too_fast_fpm: 125 });
  close(r.exhaust_cfm, 900, "6 ft x 1.5 ft x 100 fpm");
  close(r.heating_btuh, 1.08 * 600 * 60, "the extra 600 cfm, heated");
});

test("lab pressure: the offset is exhaust less supply, and the ACH floor can govern", () => {
  const r = computeLabContainmentPressure({ room_volume_ft3: 9600, required_ach: 8, hood_exhaust_cfm: 1200, general_exhaust_cfm: 80, supply_cfm: 1180, hood_sash_closed_cfm: 400, supply_drift_pct: 10 });
  close(r.ach_airflow_cfm, 1280, "8 ACH");
  close(r.offset_cfm, 100, "offset");
  assert.equal(r.drift_swamps, true);
});
