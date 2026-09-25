// Refrigerant saturation data held to the published charts, read 2026-09-24:
// Arkema Forane 22 / 404A / 407C / 134a saturation P-T charts (psig, NIST
// REFPROP 9.0) and the Chemours Opteon A/C P-T guide OPTXLPTAC-2 (black
// cells = saturated vapor, bold = saturated liquid).
//
// The defect these pin: a zeotropic blend has two saturation curves, and a
// table that carries only one reads either superheat or subcooling against
// the wrong one. R-407C's glide is about 10 F.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REFRIGERANTS, REFRIGERANT_PT_TABLES_v7, REFRIGERANT_DEW_TABLES_v7,
  computeSuperheatSubcool, computeRefrigerantCharging,
} from "../../calc-refrigerant.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const at = (pairs, psig) => pairs.find((p) => p.pressure_psig === psig).temperature_F;

test("R-407C: dew point (Vapor column) for superheat, bubble point (Liquid column) for subcooling", () => {
  const r = REFRIGERANTS["R-407C"];
  // [psig, vapor F, liquid F] from the Arkema chart.
  for (const [p, dew, bub] of [[30, 12.2, 0.6], [60, 37.8, 26.6], [100, 61.6, 51.1], [150, 83.8, 73.9], [200, 101.2, 92.0]]) {
    assert.ok(close(at(r.pt_pairs, p), dew, 0.05), `dew @ ${p}`);
    assert.ok(close(at(r.bubble_pairs, p), bub, 0.05), `bubble @ ${p}`);
  }
  // The case the single-curve table got wrong: 200 psig, 90 F liquid line.
  const sc = computeSuperheatSubcool({ refrigerant: "R-407C", system_pressure_psig: 200, line_temperature_F: 90, mode: "subcool" });
  assert.ok(close(sc.subcool_F, 2.0, 1e-9), `subcool ${sc.subcool_F}`);
  const sh = computeSuperheatSubcool({ refrigerant: "R-407C", system_pressure_psig: 60, line_temperature_F: 50, mode: "superheat" });
  assert.ok(close(sh.superheat_F, 50 - 37.8, 1e-9));
});

test("R-404A carries both curves too (about 1 F of glide)", () => {
  const r = REFRIGERANTS["R-404A"];
  for (const [p, dew, bub] of [[30, -2.8, -3.8], [100, 48.1, 47.3], [200, 89.2, 88.5]]) {
    assert.ok(close(at(r.pt_pairs, p), dew, 0.05) && close(at(r.bubble_pairs, p), bub, 0.05), `@ ${p}`);
  }
});

test("R-22 psig table matches the Arkema chart (it read up to 2 F off until 2026-09-24)", () => {
  const r = REFRIGERANTS["R-22"];
  for (const [p, t] of [[30, 6.9], [50, 26.0], [75, 44.3], [100, 59.1], [150, 82.7], [200, 101.4]]) {
    assert.ok(close(at(r.pt_pairs, p), t, 0.05), `R-22 @ ${p}`);
  }
});

test("R-454B: suction superheat reads the dew point, liquid subcooling the bubble point", () => {
  // Opteon guide: 44 F vapor = 115.6 psig, 42 F = 111.2 -> 115.3 psig is 43.9 F dew.
  assert.deepEqual(REFRIGERANT_DEW_TABLES_v7.R_454B.find((r) => r.psia === 130), { psia: 130, T_F: 43.9 });
  const r = computeRefrigerantCharging({ refrigerant: "R_454B", suction_pressure: 115.304, liquid_pressure: 300, suction_line_temp_F: 54, liquid_line_temp_F: 95 });
  assert.ok(close(r.T_sat_suction_F, 43.9, 0.01), `suction sat ${r.T_sat_suction_F}`);
  // The bubble table (the one liquid reads) is about 2 F lower at the same pressure.
  assert.equal(REFRIGERANT_PT_TABLES_v7.R_454B.find((x) => x.psia === 130).T_F, 42);
  // Past the dew table (50 F, 144 psia) the suction side declines rather than guessing.
  assert.ok("error" in computeRefrigerantCharging({ refrigerant: "R_454B", suction_pressure: 140, liquid_pressure: 300, suction_line_temp_F: 60, liquid_line_temp_F: 95 }));
});

test("R-134a psia table's first row is the chart's 0.3 psig (-14.3 F, not -16)", () => {
  assert.equal(REFRIGERANT_PT_TABLES_v7.R_134a[0].T_F, -14.3);
});
