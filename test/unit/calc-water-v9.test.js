// v9 §E.1 unit tests for SVI (sludge volume index). Spec-v9 §E.1
// calls for 8 unit tests covering conventional / extended-aeration /
// high-rate plants. The companion F:M ratio is the existing v4
// srt-fm-ratio tile and is exercised by its own tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSVI, sviExample, computeDisinfectionCT, disinfectionCTExample, WATER_RENDERERS } from "../../calc-water.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

test("svi: example SV30=300 mL/L, MLSS=2500 mg/L -> SVI=120 mL/g typical band", () => {
  const r = computeSVI(sviExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.svi_ml_per_g, 120, 0.001));
  assert.match(r.band, /typical conventional/);
});

test("svi: bulking conditions (SVI > 200) flagged", () => {
  // 500 mL/L settled volume with 2000 mg/L MLSS -> SVI = 250.
  const r = computeSVI({ sv30_ml_per_l: 500, mlss_mg_per_l: 2000 });
  assert.ok(close(r.svi_ml_per_g, 250, 0.001));
  assert.match(r.band, /bulking/);
});

test("svi: filamentous-developing band 150-200", () => {
  // SVI = 175: 350 / 2000.
  const r = computeSVI({ sv30_ml_per_l: 350, mlss_mg_per_l: 2000 });
  assert.ok(close(r.svi_ml_per_g, 175, 0.001));
  assert.match(r.band, /filamentous/);
});

test("svi: pin-floc / under-aerated (< 80)", () => {
  // SVI = 50: 100 / 2000.
  const r = computeSVI({ sv30_ml_per_l: 100, mlss_mg_per_l: 2000 });
  assert.ok(close(r.svi_ml_per_g, 50, 0.001));
  assert.match(r.band, /pin floc/);
});

test("svi: rejects zero / negative MLSS and out-of-range SV30", () => {
  assert.ok(computeSVI({ sv30_ml_per_l: 300, mlss_mg_per_l: 0 }).error);
  assert.ok(computeSVI({ sv30_ml_per_l: 300, mlss_mg_per_l: -100 }).error);
  assert.ok(computeSVI({ sv30_ml_per_l: 1500, mlss_mg_per_l: 2000 }).error);
  assert.ok(computeSVI({ sv30_ml_per_l: -50, mlss_mg_per_l: 2000 }).error);
});

test("svi: warns when MLSS outside the 500-8000 mg/L typical range", () => {
  const lo = computeSVI({ sv30_ml_per_l: 100, mlss_mg_per_l: 200 });
  const hi = computeSVI({ sv30_ml_per_l: 800, mlss_mg_per_l: 10000 });
  assert.ok(lo.warnings.some((w) => /below 500 mg\/L/.test(w)));
  assert.ok(hi.warnings.some((w) => /above 8000 mg\/L/.test(w)));
});

test("svi: 30-min settled fraction is sv30 / 1000 (sample volume in a 1 L cylinder)", () => {
  const r = computeSVI({ sv30_ml_per_l: 300, mlss_mg_per_l: 2500 });
  assert.ok(closePct(r.sv30_settled_fraction, 0.30, 0.001));
});

test("svi: extended-aeration plant typical (lower MLSS, higher SVI tolerable)", () => {
  // SV30 = 350, MLSS = 3500 -> SVI = 100 (still typical).
  const r = computeSVI({ sv30_ml_per_l: 350, mlss_mg_per_l: 3500 });
  assert.ok(closePct(r.svi_ml_per_g, 100, 0.001));
  assert.match(r.band, /typical/);
});

test("svi: high-rate plant near upper typical band", () => {
  // SV30 = 200, MLSS = 1500 -> SVI = 133 (still typical).
  const r = computeSVI({ sv30_ml_per_l: 200, mlss_mg_per_l: 1500 });
  assert.ok(closePct(r.svi_ml_per_g, 133.33, 0.5));
  assert.match(r.band, /typical/);
});

test("svi: WATER_RENDERERS exposes svi-sludge-index", () => {
  assert.equal(typeof WATER_RENDERERS["svi-sludge-index"], "function");
});

// v9 §E.2 disinfection-CT (SWTR free-chlorine 3-log Giardia)

test("disinfection-ct: example C=1.0, t10=150, T=5, pH=7 -> CT 150 vs 139 -> passes 3-log Giardia", () => {
  const r = computeDisinfectionCT(disinfectionCTExample.inputs);
  assert.ok(!r.error);
  assert.ok(close(r.CT_achieved, 150, 1e-9));
  assert.ok(close(r.CT_required_3log_Giardia, 139, 1e-9)); // SWTR Table A-1: pH 7.0 / 5 C
  assert.equal(r.pass_3log_giardia, true);
  assert.equal(r.pass_4log_virus, true);
});

test("disinfection-ct: low-residual (< 0.2 mg/L) returns zero CT achieved with a warning", () => {
  const r = computeDisinfectionCT({ chlorine_mg_l: 0.1, t10_minutes: 300, temperature_C: 5, pH: 7 });
  assert.ok(!r.error);
  assert.equal(r.CT_achieved, 0);
  assert.equal(r.pass_3log_giardia, false);
  assert.equal(r.warnings.length >= 1, true);
});

test("disinfection-ct: temperature outside 0.5-25 C is rejected (no extrapolation)", () => {
  assert.match(computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 0, pH: 7 }).error, /Temperature/);
  assert.match(computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 30, pH: 7 }).error, /Temperature/);
});

test("disinfection-ct: pH outside 6.0-9.0 is rejected (no extrapolation)", () => {
  assert.match(computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 5.5 }).error, /pH/);
  assert.match(computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 9.5 }).error, /pH/);
});

test("disinfection-ct: t10 must be positive; chlorine non-negative", () => {
  assert.ok(computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 0, temperature_C: 5, pH: 7 }).error);
  assert.ok(computeDisinfectionCT({ chlorine_mg_l: -0.1, t10_minutes: 300, temperature_C: 5, pH: 7 }).error);
});

test("disinfection-ct: bilinear interpolation matches table corners exactly", () => {
  // 5 C, pH 6.0 -> 97 from the SWTR Table A-1.
  const r = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 1, temperature_C: 5, pH: 6 });
  assert.ok(close(r.CT_required_3log_Giardia, 97, 1e-9));
  // 25 C, pH 9.0 -> 70 from the SWTR Table A-1.
  const r2 = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 1, temperature_C: 25, pH: 9 });
  assert.ok(close(r2.CT_required_3log_Giardia, 70, 1e-9));
});

test("disinfection-ct: bilinear interpolation midpoint between known corners", () => {
  // Midpoint between (5 C, pH 7 = 139) and (10 C, pH 7 = 104) is 121.5 at 7.5 C.
  const r = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 1, temperature_C: 7.5, pH: 7 });
  assert.ok(closePct(r.CT_required_3log_Giardia, 121.5, 0.5));
});

test("disinfection-ct: high residual (>0.4 mg/L) still computes but warns about band", () => {
  const r = computeDisinfectionCT({ chlorine_mg_l: 1.0, t10_minutes: 100, temperature_C: 5, pH: 7 });
  assert.ok(!r.error);
  assert.equal(r.warnings.length >= 1, true);
});

test("disinfection-ct: failing case (low CT achieved) flags 3-log Giardia not met", () => {
  // C=0.2, t10=60 -> CT=12 mg-min/L vs 139 at 5/7 -> well under.
  const r = computeDisinfectionCT({ chlorine_mg_l: 0.2, t10_minutes: 60, temperature_C: 5, pH: 7 });
  assert.equal(r.pass_3log_giardia, false);
  assert.equal(r.pass_4log_virus, false);
});

test("disinfection-ct: log inactivation scales linearly with CT achieved", () => {
  const r1 = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 300, temperature_C: 5, pH: 7 });
  const r2 = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 600, temperature_C: 5, pH: 7 });
  assert.ok(close(r2.log_inactivation, r1.log_inactivation * 2, 1e-6));
});

test("disinfection-ct: cold-water / high-pH worst corner inflates CT requirement", () => {
  const r = computeDisinfectionCT({ chlorine_mg_l: 0.4, t10_minutes: 1, temperature_C: 0.5, pH: 9 });
  // 0.5 C, pH 9 corner is 390 mg-min/L (SWTR Table A-1, the coldest / highest-pH worst case).
  assert.ok(close(r.CT_required_3log_Giardia, 390, 1e-9));
});

// Physical invariant over the whole SWTR Table A-1 (3-log Giardia, free chlorine):
// required CT rises with pH (higher pH is harder to disinfect) and falls with
// temperature (warmer water disinfects faster), across every grid point. The bug
// fixed 2026-07-17 was a pH-column MISLABEL; independent point pins catch the shift
// at the pinned cells, and this two-axis monotonicity guards the rest of the table
// against a row/column transcription error a few points would miss. Public-health critical.
test("disinfection-ct: CT_required is monotone in pH (increasing) and temperature (decreasing) across the whole SWTR grid", () => {
  const CT = (temperature_C, pH) =>
    computeDisinfectionCT({ chlorine_mg_l: 1, t10_minutes: 1, temperature_C, pH }).CT_required_3log_Giardia;
  const temps = [0.5, 5, 10, 15, 20, 25];
  const phs = [6, 7, 8, 9];
  // Strictly increasing in pH at every temperature.
  for (const T of temps) {
    for (let i = 1; i < phs.length; i++) {
      assert.ok(CT(T, phs[i]) > CT(T, phs[i - 1]),
        `CT must rise with pH at ${T} C: pH ${phs[i]} (${CT(T, phs[i])}) <= pH ${phs[i - 1]} (${CT(T, phs[i - 1])})`);
    }
  }
  // Strictly decreasing in temperature at every pH.
  for (const p of phs) {
    for (let i = 1; i < temps.length; i++) {
      assert.ok(CT(temps[i], p) < CT(temps[i - 1], p),
        `CT must fall with temperature at pH ${p}: ${temps[i]} C (${CT(temps[i], p)}) >= ${temps[i - 1]} C (${CT(temps[i - 1], p)})`);
    }
  }
});

test("disinfection-ct: WATER_RENDERERS exposes disinfection-ct", () => {
  assert.equal(typeof WATER_RENDERERS["disinfection-ct"], "function");
});
