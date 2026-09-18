// calc-finishing.js (spec-v1824..v1827) against references the specs did not
// write: zinc's density behind the ounces-per-mil factor, the exact steady-
// state mass balance of a counterflow rinse, and the balances the tiles'
// notes claim. The worked-example fixture recomputes each spec's own example,
// so an error a spec and its tile share passes it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGalvanizeCoatingWeight, computePretreatmentBathDragout,
  computeGalvanizeKettleThroughput, computePhosphateCoatingWeight,
} from "../../calc-finishing.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

const rinseBase = { dragout_gal_per_1000ft2: 1.5, area_ft2_per_day: 20000, bath_volume_gal: 2000, bath_concentrate_pct: 5, dilution_ratio: 1000, rinse_stages: 2 };

// ---- independent references ----

test("galvanizing: a mil of zinc on a square foot weighs what zinc's density says", () => {
  // 0.001 in x 144 sq in = 0.144 cu in = 2.3597 cm^3; at 7.14 g/cm^3 that is
  // 16.85 g, or 0.594 oz. ASTM A90's 1 oz/sq ft = 305 g/m^2 agrees within 0.2%.
  const ozPerMil = 0.144 * 2.54 ** 3 * 7.14 / 28.349523125;
  const r = computeGalvanizeCoatingWeight({ coating_grade_um: 25.4, steel_tons: 1, area_per_ton_ft2: 400, alt_area_per_ton_ft2: 120 });
  within(r.coating_oz_ft2, ozPerMil, 0.1, "one mil");
  const astm = 305 / 1e4 / 7.14 * 1e4 / 25.4; // g/m^2 -> um of zinc -> mils per oz/sq ft
  within(1 / r.coating_oz_ft2, astm, 0.3, "mils per oz/sq ft");
});

test("counterflow rinse: the R^(1/n) rule is the conservative side of the exact mass balance", () => {
  // Steady state in n counterflowing tanks with feed rate r = Q / D (flow over
  // drag-out): C0 / Cn = 1 + r + r^2 + ... + r^n exactly. The tile uses the
  // standard shortcut r = R^(1/n), which asks for slightly MORE water than the
  // exact balance -- 1.6% at two stages and 3.7% at three for R = 1,000.
  const exactFlowRatio = (R, n) => {
    let lo = 0, hi = R;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      let s = 0;
      for (let k = 0; k <= n; k++) s += mid ** k;
      if (s < R) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };
  for (const n of [1, 2, 3]) {
    const r = computePretreatmentBathDragout({ ...rinseBase, rinse_stages: n });
    const exact = r.dragout_gal_day * exactFlowRatio(1000, n);
    assert.ok(r.rinse_flow_gal_day >= exact, `${n} stages is conservative`);
    within(r.rinse_flow_gal_day, exact, 4, `${n} stages`);
  }
});

// ---- balances the notes claim ----

test("drag-out: the concentrate carried out is replaced, and the bath turns over at the drag-out rate", () => {
  const r = computePretreatmentBathDragout(rinseBase);
  close(r.dragout_gal_day, 30, "1.5 gal per 1,000 sq ft over 20,000");
  close(r.concentrate_gal_day + r.makeup_water_gal_day, r.dragout_gal_day, "makeup");
  close(r.bath_turnover_days * 30, 2000, "turnover");
  close(r.two_stage_gal_day, 30 * Math.sqrt(1000), "two stages");
});

test("kettle: the burners must heat every pound of steel to the bath", () => {
  const r = computeGalvanizeKettleThroughput({ lower_min: 1, immerse_min: 5, withdraw_min: 2, travel_min: 2, load_lb_per_lift: 2000, area_per_ton_ft2: 400, steel_specific_heat_btu_lb_f: 0.12, bath_temp_f: 830, ambient_temp_f: 70, burner_btu_hr: 1500000 });
  close(r.throughput_lb_hr, 6 * 2000, "six lifts an hour");
  close(r.heat_demand_btu_hr, 12000 * 0.12 * 760, "m c dT");
  close(r.heat_limited_lb_hr * 0.12 * 760, 1500000, "burner-limited rate");
  close(r.governing_tons_hr, Math.min(r.throughput_tons_hr, r.heat_limited_tons_hr), "the lesser governs");
});

test("phosphate: coating weight is the stripped mass over the coated area", () => {
  const r = computePhosphateCoatingWeight({ panel_length_in: 4, panel_width_in: 6, faces_coated: 2, mass_before_g: 45.682, mass_after_g: 45.647, spec_min_mg_ft2: 150, spec_max_mg_ft2: 300 });
  close(r.area_coated_ft2, 2 * 24 / 144, "both faces");
  within(r.coating_mg_ft2, 35 / (48 / 144), 1e-6, "mg per sq ft");
  close(r.one_sided_mg_ft2, 2 * r.coating_mg_ft2, "the one-face mistake doubles it");
  within(r.coating_g_m2, r.coating_mg_ft2 / 1000 / (0.3048 * 0.3048), 1e-3, "g/m^2");
});
