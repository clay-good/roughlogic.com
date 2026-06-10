// spec-v30 unit tests: metal / air / refrigerant bench (3 tiles).
// Deepens existing groups per the spec-v28 §7 roadmap (v30 = §7.4-7.6):
// groove-weld-strength (Group E, AWS D1.1 / AISC 360 §J2), duct-static-
// pressure-total (Group C, ACCA Manual D), compression-ratio-refrig (Group C,
// ASHRAE). The three land in a new calc-metalair.js module (calc-construction
// and calc-hvac are at their size caps). Pins the worked examples and guards.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGrooveWeldStrength, computeDuctStaticTotal, computeCompressionRatio,
} from "../../calc-metalair.js";

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// --- 30.1 groove-weld-strength ---
test("groove-weld-strength: PJP/CJP throat, ASD/LRFD shear, utilization", () => {
  const r = computeGrooveWeldStrength({ weld_type: "PJP", effective_throat_in: 0.25, length_in: 6, electrode: "E70", method: "LRFD" });
  assert.strictEqual(r.throat_in, 0.25);
  assert.ok(near(r.stress_ksi, 31.5));         // 0.75 * 0.60 * 70
  assert.ok(near(r.capacity_lb, 47250, 1e-3)); // 31.5 ksi * 0.25 in * 6 in (fp: 47249.9999)
  // ASD is the lower allowable
  const asd = computeGrooveWeldStrength({ weld_type: "PJP", effective_throat_in: 0.25, length_in: 6, electrode: "E70", method: "ASD" });
  assert.ok(near(asd.stress_ksi, 21));          // 0.30 * 70
  assert.strictEqual(asd.capacity_lb, 31500);
  // CJP throat = thinner part thickness; the note flags base-metal development
  const cjp = computeGrooveWeldStrength({ weld_type: "CJP", base_thickness_in: 0.5, length_in: 4, electrode: "E70", method: "LRFD" });
  assert.strictEqual(cjp.throat_in, 0.5);
  assert.ok(cjp.notes.join(" ").includes("base metal"));
  // utilization from an applied load
  const u = computeGrooveWeldStrength({ weld_type: "PJP", effective_throat_in: 0.25, length_in: 6, electrode: "E70", method: "LRFD", applied_load_lb: 47250 });
  assert.ok(near(u.utilization, 1));
  // guards
  assert.ok("error" in computeGrooveWeldStrength({ weld_type: "PJP", effective_throat_in: 0.25, length_in: 0 }));
  assert.ok("error" in computeGrooveWeldStrength({ weld_type: "PJP", effective_throat_in: 0, length_in: 6 }));
  assert.ok("error" in computeGrooveWeldStrength({ weld_type: "CJP", base_thickness_in: 0, length_in: 6 }));
});

// --- 30.2 duct-static-pressure-total ---
test("duct-static-pressure-total: sum, rating verdict, breakdown", () => {
  const comps = [{ label: "filter", drop_in_wc: 0.10 }, { label: "supply registers", drop_in_wc: 0.03 }, { label: "return grille", drop_in_wc: 0.03 }, { label: "wet coil", drop_in_wc: 0.30 }, { label: "supply duct", drop_in_wc: 0.10 }, { label: "return duct", drop_in_wc: 0.08 }];
  const r = computeDuctStaticTotal({ components: comps, rated_esp_in_wc: 0.50 });
  assert.ok(near(r.total_esp_in_wc, 0.64));
  assert.ok(near(r.remaining_in_wc, -0.14));
  assert.strictEqual(r.within_rating, false);    // 0.64 > 0.50
  assert.strictEqual(r.breakdown.length, 6);
  // within rating when total <= rated
  const ok = computeDuctStaticTotal({ components: [{ label: "filter", drop_in_wc: 0.20 }], rated_esp_in_wc: 0.50 });
  assert.strictEqual(ok.within_rating, true);
  assert.ok(near(ok.remaining_in_wc, 0.30));
  // no rating suppresses the verdict, not an error
  const noRate = computeDuctStaticTotal({ components: [{ label: "x", drop_in_wc: 0.4 }] });
  assert.strictEqual(noRate.within_rating, null);
  assert.strictEqual(noRate.remaining_in_wc, null);
  // guards
  assert.ok("error" in computeDuctStaticTotal({ components: [], rated_esp_in_wc: 0.5 }));
  assert.ok("error" in computeDuctStaticTotal({ components: [{ drop_in_wc: -0.1 }], rated_esp_in_wc: 0.5 }));
});

// --- 30.3 compression-ratio-refrig ---
test("compression-ratio-refrig: absolute pressures, ratio, high-ratio flag, altitude", () => {
  const r = computeCompressionRatio({ suction_psig: 70, discharge_psig: 260, atmospheric_psia: 14.696 });
  assert.ok(near(r.suction_psia, 84.696));
  assert.ok(near(r.discharge_psia, 274.696));
  assert.ok(near(r.compression_ratio, 274.696 / 84.696, 1e-6));
  assert.strictEqual(r.high_ratio, false);
  // a deep low side drives the ratio over 10 -> flagged
  const high = computeCompressionRatio({ suction_psig: 5, discharge_psig: 250, atmospheric_psia: 14.696 });
  assert.strictEqual(high.high_ratio, true);
  // altitude (lower atmospheric) raises the ratio
  const alt = computeCompressionRatio({ suction_psig: 70, discharge_psig: 260, atmospheric_psia: 12.0 });
  assert.ok(alt.compression_ratio > r.compression_ratio);
  // guards: a full-vacuum suction and discharge below suction
  assert.ok("error" in computeCompressionRatio({ suction_psig: -20, discharge_psig: 260, atmospheric_psia: 14.696 }));
  assert.ok("error" in computeCompressionRatio({ suction_psig: 100, discharge_psig: 50, atmospheric_psia: 14.696 }));
});
