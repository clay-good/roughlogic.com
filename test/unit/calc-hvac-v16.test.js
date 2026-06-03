// spec-v16 Group C unit tests for the three first-principles HVAC tiles
// landed in v16: C.3 chiller-tons, C.5 hx-lmtd-ntu, and C.9
// air-changes-hour. Worked examples cross-check against the published
// references named in each tile's citation (ASHRAE Fundamentals Ch. 31,
// the TEMA standards / Incropera, and ASHRAE 62.1 / 170).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeChillerTons, chillerTonsExample, CHILLER_FLUID_FACTORS,
  computeHxLmtdNtu, hxLmtdNtuExample,
  computeAirChangesPerHour, airChangesPerHourExample, ACH_TARGET_BANDS,
  HVAC_RENDERERS,
} from "../../calc-hvac.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

// --- C.3 Chiller tonnage (10 tests) ----------------------------------

test("chiller-tons: 240 GPM water at 54->44 F -> exactly 100 tons", () => {
  const r = computeChillerTons(chillerTonsExample.inputs);
  assert.ok(!r.error);
  assert.strictEqual(r.delta_T_F, 10);
  assert.strictEqual(r.q_btu_hr, 1200000);
  assert.ok(close(r.tons, 100, 1e-9));
});

test("chiller-tons: Q follows gpm * factor * delta-T for water (factor 500)", () => {
  const r = computeChillerTons({ gpm: 100, ewt_F: 55, lwt_F: 43, fluid: "water" });
  assert.strictEqual(r.factor, 500);
  assert.ok(close(r.q_btu_hr, 100 * 500 * 12, 1e-9));
});

test("chiller-tons: kW = Q / 3412", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44 });
  assert.ok(close(r.kw, 1200000 / 3412, 1e-9));
});

test("chiller-tons: glycol factors are below water and ordered 50% < 30% < water", () => {
  assert.ok(CHILLER_FLUID_FACTORS.glycol_50 < CHILLER_FLUID_FACTORS.glycol_30);
  assert.ok(CHILLER_FLUID_FACTORS.glycol_30 < CHILLER_FLUID_FACTORS.water);
  const w = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "water" });
  const g30 = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "glycol_30" });
  const g50 = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "glycol_50" });
  assert.ok(g50.tons < g30.tons && g30.tons < w.tons);
});

test("chiller-tons: required flow at nameplate inverts the identity", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "water", nameplate_tons: 100 });
  assert.ok(close(r.required_gpm, 240, 1e-6));
});

test("chiller-tons: required flow is null without a nameplate", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44 });
  assert.strictEqual(r.required_gpm, null);
});

test("chiller-tons: delta-T outside 5-20 F is flagged", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 50 });
  assert.ok(r.warnings.some((w) => /delta-T/i.test(w)));
});

test("chiller-tons: glycol selection carries the manufacturer-table caveat", () => {
  const r = computeChillerTons({ gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "glycol_50" });
  assert.ok(r.warnings.some((w) => /manufacturer/i.test(w)));
});

test("chiller-tons: more flow at the same delta-T is more tons (monotonic)", () => {
  const a = computeChillerTons({ gpm: 200, ewt_F: 54, lwt_F: 44 });
  const b = computeChillerTons({ gpm: 300, ewt_F: 54, lwt_F: 44 });
  assert.ok(b.tons > a.tons);
});

test("chiller-tons: zero flow and inverted temperatures are rejected", () => {
  assert.ok("error" in computeChillerTons({ gpm: 0 }));
  assert.ok("error" in computeChillerTons({ gpm: 240, ewt_F: 44, lwt_F: 54 }));
});

// --- C.5 Heat exchanger LMTD and effectiveness-NTU (12 tests) --------

test("hx-lmtd-ntu: counter-flow Incropera example pins LMTD 49.33, eff 0.714, NTU 2.03", () => {
  const r = computeHxLmtdNtu(hxLmtdNtuExample.inputs);
  assert.ok(!r.error);
  assert.ok(closePct(r.lmtd_F, 49.326, 0.5));
  assert.ok(closePct(r.q_btu_hr, 2500000, 0.5));
  assert.ok(closePct(r.effectiveness, 0.7143, 0.5));
  assert.ok(closePct(r.ntu, 2.027, 0.5));
});

test("hx-lmtd-ntu: LMTD = (dT1 - dT2)/ln(dT1/dT2) for counter-flow", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  const dT1 = 200 - 140, dT2 = 100 - 60;
  assert.ok(close(r.lmtd_F, (dT1 - dT2) / Math.log(dT1 / dT2), 1e-9));
});

test("hx-lmtd-ntu: heat duty Q = C_hot * (Th_in - Th_out)", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  assert.ok(close(r.q_btu_hr, 50 * 500 * 100, 1e-9));
});

test("hx-lmtd-ntu: UA = Q / LMTD", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  assert.ok(close(r.ua_btu_hr_F, r.q_btu_hr / r.lmtd_F, 1e-6));
});

test("hx-lmtd-ntu: capacity-rate ratio Cr = C_min / C_max", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  // C_h = 25000, C_c = 31250 -> Cr = 0.8.
  assert.ok(close(r.c_ratio, 0.8, 1e-9));
});

test("hx-lmtd-ntu: NTU = UA / C_min", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 62.5 });
  assert.ok(close(r.ntu, r.ua_btu_hr_F / 25000, 1e-9));
});

test("hx-lmtd-ntu: parallel-flow LMTD is smaller than counter-flow for the same temperatures", () => {
  // Outlets must not cross for parallel flow (Th_out > Tc_out): 200->120 hot,
  // 60->100 cold. Counter-flow LMTD = 78.3 F, parallel LMTD = 61.7 F.
  const cf = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 120, tc_in_F: 60, tc_out_F: 100, hot_gpm: 50, cold_gpm: 50 });
  const pf = computeHxLmtdNtu({ config: "parallel", th_in_F: 200, th_out_F: 120, tc_in_F: 60, tc_out_F: 100, hot_gpm: 50, cold_gpm: 50 });
  assert.ok(!cf.error && !pf.error);
  assert.ok(pf.lmtd_F < cf.lmtd_F);
});

test("hx-lmtd-ntu: effectiveness and NTU are null when only one flow is given", () => {
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50 });
  assert.ok(r.q_btu_hr != null);
  assert.strictEqual(r.effectiveness, null);
  assert.strictEqual(r.ntu, null);
});

test("hx-lmtd-ntu: equal end differences give LMTD = the common difference", () => {
  // Counter-flow with dT1 = dT2 = 40: both ends 40 F apart.
  const r = computeHxLmtdNtu({ config: "counterflow", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 160, hot_gpm: 50, cold_gpm: 50 });
  // dT1 = 200-160 = 40, dT2 = 100-60 = 40.
  assert.ok(close(r.lmtd_F, 40, 1e-9));
});

test("hx-lmtd-ntu: hot fluid that does not cool down is rejected", () => {
  assert.ok("error" in computeHxLmtdNtu({ th_in_F: 100, th_out_F: 120, tc_in_F: 60, tc_out_F: 80 }));
});

test("hx-lmtd-ntu: cold outlet above hot inlet is rejected (thermodynamic limit)", () => {
  assert.ok("error" in computeHxLmtdNtu({ th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 220 }));
});

test("hx-lmtd-ntu: parallel-flow with crossing outlets is rejected", () => {
  // Parallel dT2 = Th_out - Tc_out must stay positive.
  assert.ok("error" in computeHxLmtdNtu({ config: "parallel", th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140, hot_gpm: 50, cold_gpm: 50 }));
});

// --- C.9 Air changes per hour (8 tests) ------------------------------

test("air-changes-hour: 10,000 ft^3 classroom at 1,000 CFM -> 6.0 ACH, within band", () => {
  const r = computeAirChangesPerHour(airChangesPerHourExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.ach, 6, 1e-9));
  assert.ok(/within/.test(r.comparison));
});

test("air-changes-hour: ACH = supply CFM * 60 / volume", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 8000, supply_cfm: 400 });
  assert.ok(close(r.ach, (400 * 60) / 8000, 1e-9));
});

test("air-changes-hour: return defaults to supply (balanced) when blank", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 10000, supply_cfm: 1000 });
  assert.strictEqual(r.return_cfm, 1000);
  assert.strictEqual(r.pressurization_cfm, 0);
});

test("air-changes-hour: lower return positively pressurizes and lowers net ACH", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 10000, supply_cfm: 1000, return_cfm: 800 });
  assert.ok(r.pressurization_cfm > 0);
  assert.ok(r.net_ach < r.ach);
  assert.ok(/pressurized/.test(r.pressure_state));
});

test("air-changes-hour: higher return negatively pressurizes", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 10000, supply_cfm: 1000, return_cfm: 1200 });
  assert.ok(r.pressurization_cfm < 0);
  assert.ok(/negatively/.test(r.pressure_state));
});

test("air-changes-hour: an operating-room target band flags a 6 ACH room as below", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 10000, supply_cfm: 1000, occupancy: "operating_room" });
  assert.ok(/below/.test(r.comparison));
  assert.strictEqual(ACH_TARGET_BANDS.operating_room.lo, 20);
});

test("air-changes-hour: ACH above 50 is flagged outside the typical range", () => {
  const r = computeAirChangesPerHour({ volume_ft3: 1000, supply_cfm: 1000 });
  assert.ok(r.ach > 50);
  assert.ok(r.warnings.some((w) => /50/.test(w)));
});

test("air-changes-hour: zero volume and zero supply are rejected", () => {
  assert.ok("error" in computeAirChangesPerHour({ volume_ft3: 0, supply_cfm: 100 }));
  assert.ok("error" in computeAirChangesPerHour({ volume_ft3: 1000, supply_cfm: 0 }));
});

// --- Wiring sentinel -------------------------------------------------

test("v16 HVAC renderers are registered in HVAC_RENDERERS", () => {
  for (const id of ["chiller-tons", "hx-lmtd-ntu", "air-changes-hour"]) {
    assert.strictEqual(typeof HVAC_RENDERERS[id], "function", id + " renderer missing");
  }
});
