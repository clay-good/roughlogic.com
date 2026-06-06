// v18 §2/§5 tile-contract assertions (node --test surface).
//
// The exhaustive sweep + Tier-2 ratchet lives in
// scripts/check-tile-contract.mjs (run in a worker so a regression that
// reintroduces an unbounded loop cannot hang CI). This unit test asserts
// the Tier-1 (crasher) invariants in-process: over every registered
// fixture, no compute function may throw, return a non-object, mutate its
// input, return a different result on a second identical call (impurity),
// or leak a non-finite field on its canonical source-verified input. The
// Tier-1 backlog must stay at zero - these are real bugs reachable with
// real inputs.
//
// It also pins the regression fixtures for the seven crash/hang/OOM
// defects removed in the first v18 hardening pass: each was a perturbed
// numeric input (Infinity / NaN) that previously hung, exhausted memory,
// or threw, and now returns a clean {error}.

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFixtures, sweepRow } from "../fixtures/tile-contract.js";
import { computeUpgradeROI } from "../../calc-cross.js";
import { computeAmortization, computeMacrs } from "../../calc-accounting.js";
import { computeSerialDilution } from "../../calc-lab.js";
import { computeHipValleyRafter } from "../../calc-construction.js";
import { computeDeadline } from "../../calc-legal.js";
import { computeSolarTimes } from "../../calc-field.js";

test("tile contract: no Tier-1 (crasher) violations over the registered fixtures", async () => {
  const rows = await loadFixtures();
  const tier1 = [];
  for (const row of rows) {
    const recs = await sweepRow(row);
    for (const r of recs) if (r.tier === 1) tier1.push(r.message);
  }
  assert.equal(
    tier1.length,
    0,
    `Tier-1 contract violations (must be zero):\n  ${tier1.join("\n  ")}`,
  );
});

// --- Regression: the seven crash/hang/OOM defects (v18 C-6/D-6/D-7) ---

test("upgrade-roi: years = Infinity errors instead of looping forever", () => {
  const r = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 1000, years: Infinity });
  assert.ok(r.error, "expected an error for non-finite years");
});

test("loan-amortization: term_months = Infinity errors instead of OOM", () => {
  const r = computeAmortization({ principal: 250000, annual_rate_pct: 6.5, term_months: Infinity });
  assert.ok(r.error, "expected an error for non-finite term");
  // A realistic 30-year term still produces a full schedule.
  const ok = computeAmortization({ principal: 250000, annual_rate_pct: 6.5, term_months: 360 });
  assert.ok(!ok.error && Array.isArray(ok.schedule) && ok.schedule.length === 360);
});

test("macrs: year_of_interest = NaN errors instead of throwing", () => {
  const r = computeMacrs({ cost: 10000, class_life: 5, convention: "half_year", year_of_interest: NaN });
  assert.ok(r.error, "expected an error for non-finite year_of_interest");
  // Canonical year still works.
  const ok = computeMacrs({ cost: 10000, class_life: 5, convention: "half_year", year_of_interest: 1 });
  assert.ok(!ok.error && Math.abs(ok.year_depreciation - 2000) < 1);
});

test("serial-dilution: number_of_steps = Infinity errors instead of OOM", () => {
  const r = computeSerialDilution({ starting_concentration: 1, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: Infinity });
  assert.ok(r.error, "expected an error for non-finite number_of_steps");
  const ok = computeSerialDilution({ starting_concentration: 1, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 5 });
  assert.ok(!ok.error && ok.tubes.length === 5);
});

test("hip-valley-rafter: run_ft = Infinity and non-positive spacing error instead of OOM", () => {
  assert.ok(computeHipValleyRafter({ run_ft: Infinity, pitch: 6 }).error, "expected an error for non-finite run");
  assert.ok(computeHipValleyRafter({ run_ft: 14, pitch: 6, jack_oc_in: -1 }).error, "expected an error for non-positive jack spacing");
  assert.ok(!computeHipValleyRafter({ run_ft: 14, pitch: 6, jack_oc_in: 16 }).error);
});

test("court-deadline: days = Infinity errors instead of throwing/looping", () => {
  assert.ok(computeDeadline({ trigger_date: "2025-07-01", days: Infinity, day_type: "calendar" }).error);
  assert.ok(computeDeadline({ trigger_date: "2025-07-01", days: Infinity, day_type: "court" }).error);
  assert.ok(!computeDeadline({ trigger_date: "2025-07-01", days: 30, day_type: "calendar" }).error);
});

test("solar-times: tz_offset_hours = Infinity errors instead of looping forever", () => {
  const r = computeSolarTimes({ lat_deg: 39.7392, lon_deg: -104.9903, date_iso: "2026-06-21", tz_offset_hours: Infinity });
  assert.ok(r.error, "expected an error for non-finite tz offset");
  assert.ok(!computeSolarTimes({ lat_deg: 39.7392, lon_deg: -104.9903, date_iso: "2026-06-21", tz_offset_hours: -6 }).error);
});
