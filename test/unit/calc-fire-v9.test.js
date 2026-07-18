// v9 §C.3 unit tests for SCBA cylinder work time. Spec-v9 calls for
// 8 unit tests minimum; the worked example is the standard 4500 psi /
// 60-minute (88 scf) bottle at 100% fill with 40 scfm work.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeScbaCylinderTime, scbaCylinderExample,
  computeNFPA1142WaterSupply, nfpa1142Example,
  NFPA1142_OCCUPANCY, NFPA1142_CONSTRUCTION,
  computeConfinedSpaceVent, confinedSpaceVentExample,
  CONFINED_SPACE_CONTAMINANTS,
  FIRE_RENDERERS,
} from "../../calc-fire.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("scba-cylinder-time: 60-min 4500 psi 88 scf, full fill, 33% alarm, 40 L/min light work -> ~42 min to alarm, ~62 to empty", () => {
  const r = computeScbaCylinderTime(scbaCylinderExample.inputs);
  assert.ok(!r.error);
  // Consumption is entered in L/min (NIOSH rates SCBA at 40 L/min light
  // work) and converted to scf/min by 28.3168 L/ft^3: 40 L/min = 1.4126 scfm.
  //   available_scf_to_alarm = (4500 - 1485)/4500 * 88 = 0.67 * 88 = 58.96 scf
  //   time_to_alarm = 58.96 / 1.4126 = 41.74 min
  //   time_to_empty = 88 / 1.4126 = 62.30 min  (matches the 60-min rating)
  assert.ok(closePct(r.available_scf_to_alarm, 58.96, 0.5));
  assert.ok(closePct(r.time_to_alarm_min, 41.74, 0.5));
  assert.ok(closePct(r.time_to_empty_min, 62.30, 0.5));
});

test("scba-cylinder-time: heavy fireground work (100 L/min) drains a 60-min bottle in ~25 min", () => {
  const r = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 4500, P_alarm_psi: 1485, consumption_lpm: 100 });
  // 100 L/min = 3.531 scfm; time_to_empty = 88 / 3.531 = 24.92 min.
  assert.ok(closePct(r.time_to_empty_min, 24.92, 1));
});

test("scba-cylinder-time: rejects start pressure > rated pressure", () => {
  const r = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 4600, P_alarm_psi: 1485, consumption_lpm: 40 });
  assert.ok(r.error);
});

test("scba-cylinder-time: rejects alarm pressure >= start pressure", () => {
  const r = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 1500, P_alarm_psi: 1500, consumption_lpm: 40 });
  assert.ok(r.error);
});

test("scba-cylinder-time: rejects zero / negative consumption", () => {
  const r = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 4500, P_alarm_psi: 1485, consumption_lpm: 0 });
  assert.ok(r.error);
});

test("scba-cylinder-time: warns when consumption is below 20 or above 200 L/min", () => {
  const r1 = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 4500, P_alarm_psi: 1485, consumption_lpm: 10 });
  const r2 = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 4500, P_alarm_psi: 1485, consumption_lpm: 250 });
  assert.ok(r1.warnings.some((w) => /below 20 L\/min/.test(w)));
  assert.ok(r2.warnings.some((w) => /above 200 L\/min/.test(w)));
});

test("scba-cylinder-time: every result includes the 'do not plan to empty' warning", () => {
  const r = computeScbaCylinderTime(scbaCylinderExample.inputs);
  assert.ok(r.warnings.some((w) => /do not plan to empty/.test(w)));
});

test("scba-cylinder-time: partial bottle at 3000 psi delivers proportional scf", () => {
  const r = computeScbaCylinderTime({ V_rated_scf: 88, P_rated_psi: 4500, P_start_psi: 3000, P_alarm_psi: 1485, consumption_lpm: 40 });
  // available = (3000-1485)/4500 * 88 = 0.337 * 88 = 29.6 (independent of consumption)
  assert.ok(closePct(r.available_scf_to_alarm, 29.6, 1));
});

test("scba-cylinder-time: FIRE_RENDERERS exposes scba-cylinder-time", () => {
  assert.equal(typeof FIRE_RENDERERS["scba-cylinder-time"], "function");
});

// --- §C.1 NFPA 1142 rural water-supply ---

test("nfpa-1142: 30,000 ft^3 wood-frame dwelling (OHC 7) example -> 6,429 gal", () => {
  const r = computeNFPA1142WaterSupply(nfpa1142Example.inputs);
  assert.ok(!r.error);
  // WS = (V * CCN) / OHC = 30000 * 1.5 / 7 = 6428.57.
  assert.ok(closePct(r.Q_min_gal, 6428.57, 0.5));
});

test("nfpa-1142: 1.5x exposure multiplier applied before sprinkler reduction", () => {
  const base = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 7, construction_class: "V" });
  const exp = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 7, construction_class: "V", exposure_within_50_ft: true });
  assert.ok(closePct(exp.Q_min_gal, base.Q_min_gal * 1.5, 0.5));
});

test("nfpa-1142: 0.5x sprinkler reduction stacks after exposure", () => {
  const exp_only = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 7, construction_class: "V", exposure_within_50_ft: true });
  const exp_spr = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 7, construction_class: "V", exposure_within_50_ft: true, sprinkler_listed: true });
  assert.ok(closePct(exp_spr.Q_min_gal, exp_only.Q_min_gal * 0.5, 0.5));
});

test("nfpa-1142: tanker-count round up for each standard tanker size", () => {
  const r = computeNFPA1142WaterSupply(nfpa1142Example.inputs);
  // 6428.57 gal -> ceil(6428.57/1000)=7, ceil(/2000)=4, ceil(/3000)=3.
  assert.equal(r.tanker_count[1000], 7);
  assert.equal(r.tanker_count[2000], 4);
  assert.equal(r.tanker_count[3000], 3);
});

test("nfpa-1142: rejects zero / negative volume, unknown occupancy, unknown construction", () => {
  assert.ok(computeNFPA1142WaterSupply({ volume_ft3: 0, occupancy_class: 7, construction_class: "V" }).error);
  assert.ok(computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 8, construction_class: "V" }).error);
  assert.ok(computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 7, construction_class: "VI" }).error);
});

test("nfpa-1142: volume under 8,000 ft^3 surfaces an 'AHJ may waive' warning", () => {
  const r = computeNFPA1142WaterSupply({ volume_ft3: 5000, occupancy_class: 7, construction_class: "V" });
  assert.ok(r.warnings.some((w) => /AHJ may waive/.test(w)));
});

test("nfpa-1142: sprinkler reduction surfaces the UL-listed contingency note", () => {
  const r = computeNFPA1142WaterSupply({ volume_ft3: 30000, occupancy_class: 7, construction_class: "V", sprinkler_listed: true });
  assert.ok(r.warnings.some((w) => /UL-listed/.test(w)));
});

test("nfpa-1142: occupancy (OHC 3-7) and construction (5) factor tables expose every category", () => {
  for (const k of [3, 4, 5, 6, 7]) {
    assert.ok(NFPA1142_OCCUPANCY[k] && NFPA1142_OCCUPANCY[k].factor === k);
  }
  for (const k of ["I", "II", "III", "IV", "V"]) {
    assert.ok(NFPA1142_CONSTRUCTION[k] && NFPA1142_CONSTRUCTION[k].factor > 0);
  }
});

test("nfpa-1142: FIRE_RENDERERS exposes nfpa-1142-water-supply", () => {
  assert.equal(typeof FIRE_RENDERERS["nfpa-1142-water-supply"], "function");
});

// v9 §C.6 confined-space pre-entry ventilation.

test("confined-space-vent: example 10x10x10 / 200 cfm / general -> 35 min, steady ACH 12", () => {
  const r = computeConfinedSpaceVent(confinedSpaceVentExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.volume_ft3, 1000, 1e-9));
  assert.ok(close(r.minutes_to_purge, 35, 1e-9));
  assert.ok(close(r.steady_ACH, 12, 1e-9));
  assert.equal(r.target_purges, 7);
});

test("confined-space-vent: H2S and CO contaminants raise the default target to 10 ACH", () => {
  const h2s = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 200, contaminant: "h2s" });
  const co = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 200, contaminant: "co" });
  assert.equal(h2s.target_purges, 10);
  assert.equal(co.target_purges, 10);
  assert.ok(h2s.minutes_to_purge > 35);
});

test("confined-space-vent: explicit target_purges override the contaminant default", () => {
  const r = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 200, contaminant: "h2s", target_purges: 5 });
  assert.equal(r.target_purges, 5);
});

test("confined-space-vent: operator can pass volume_ft3 directly instead of L x W x H", () => {
  const r = computeConfinedSpaceVent({ volume_ft3: 1000, blower_cfm: 200, contaminant: "general" });
  assert.equal(r.volume_ft3, 1000);
  assert.ok(close(r.minutes_to_purge, 35, 1e-9));
});

test("confined-space-vent: every result surfaces the OSHA 1910.146(d)(5) 4-gas-meter reminder", () => {
  for (const k of Object.keys(CONFINED_SPACE_CONTAMINANTS)) {
    const r = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 200, contaminant: k });
    assert.ok(r.warnings.length >= 1, "no warnings for " + k);
  }
});

test("confined-space-vent: zero / negative dimensions or CFM rejected", () => {
  assert.ok(computeConfinedSpaceVent({ length_ft: 0, width_ft: 10, height_ft: 10, blower_cfm: 200 }).error);
  assert.ok(computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 0 }).error);
  assert.ok(computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 200, target_purges: 0 }).error);
});

test("confined-space-vent: unknown contaminant class rejected", () => {
  const r = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 200, contaminant: "radon" });
  assert.match(r.error, /Unknown contaminant/);
});

test("confined-space-vent: purge time above 60 minutes warns 'higher-capacity blower'", () => {
  // 1000 ft^3 / 100 cfm / 7 purges = 70 min.
  const r = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 100, contaminant: "general" });
  assert.ok(r.warnings.some((w) => /higher-capacity blower/i.test(w)));
});

test("confined-space-vent: steady-state ACH below 6 warns 'verify blower placement'", () => {
  // 1000 ft^3 / 50 cfm -> 3 ACH.
  const r = computeConfinedSpaceVent({ length_ft: 10, width_ft: 10, height_ft: 10, blower_cfm: 50, contaminant: "general" });
  assert.ok(r.warnings.some((w) => /verify blower/i.test(w)));
});

test("confined-space-vent: CONFINED_SPACE_CONTAMINANTS exposes 5 classes with labels and reminders", () => {
  const ks = Object.keys(CONFINED_SPACE_CONTAMINANTS);
  assert.equal(ks.length, 5);
  for (const k of ks) {
    assert.ok(CONFINED_SPACE_CONTAMINANTS[k].label);
    assert.ok(CONFINED_SPACE_CONTAMINANTS[k].reminder);
    assert.ok(CONFINED_SPACE_CONTAMINANTS[k].default_purges > 0);
  }
});

test("confined-space-vent: FIRE_RENDERERS exposes confined-space-vent", () => {
  assert.equal(typeof FIRE_RENDERERS["confined-space-vent"], "function");
});
