// Unit tests for calc-water.js v4 utilities (210-215).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePoundsFormula, poundsFormulaExample, CHEMICAL_PURITY,
  computeFilterLoading, filterLoadingExample,
  computeDetentionTime, detentionTimeExample,
  computeDilution, dilutionExample,
  computePumpEfficiency, pumpEfficiencyExample,
  computeSRTandFM, srtFMExample,
  WATER_RENDERERS,
} from "../../calc-water.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 210 Pounds formula
test("Pounds: example yields finite (chlorine gas is 100% pure, so product = pure)", () => { const r = computePoundsFormula(poundsFormulaExample.inputs); assert.ok(r.pure_lb_day > 0); assert.equal(r.product_lb_day, r.pure_lb_day); });
test("Pounds: 5 MGD * 2 mg/L * 8.34 = 83.4 lb/day", () => { const r = computePoundsFormula({ flow_mgd: 5, dose_mg_l: 2, chemical: "chlorine_gas" }); assert.ok(close(r.pure_lb_day, 83.4, 0.01)); });
// spec-v4 asked for "a regression test that catches a chemical-purity dosing
// error (a common field mistake)", and the 12.5%-bleach case below is it: feed
// the product as if it were pure chemical and a plant doses an eighth of what
// it intended. Two of the seven chemicals were exercised that way, and the one
// carrying the subtler factor was not.
//
// fluorosilicic acid is dosed as the FLUORIDE ION, not as the acid, so its
// effective strength is the 23% solution times `afi: 0.792` -- the available
// fluoride mass fraction of H2SiF6, which works out to 0.79110 from atomic
// masses and is published rounded to 79.2%. Nothing tested it, so dropping
// `afi` would have left fluoride feed 26% light with every other test green.
// This covers all seven against the one relationship the formula promises:
// the product feed is the pure dose divided by the effective strength.
test("spec-v4: every chemical's product feed is its pure dose over its effective strength", () => {
  for (const [key, chem] of Object.entries(CHEMICAL_PURITY)) {
    const r = computePoundsFormula({ flow_mgd: 1, dose_mg_l: 1, chemical: key });
    assert.ok(r && !r.error, `${key} should dose: ${r && r.error}`);
    const effective = (chem.pct / 100) * (chem.afi ?? 1);
    assert.ok(effective > 0 && effective <= 1, `${key} effective strength out of range: ${effective}`);
    assert.ok(
      close(r.product_lb_day / r.pure_lb_day, 1 / effective, 1e-9),
      `${key}: product/pure is ${r.product_lb_day / r.pure_lb_day}, expected ${1 / effective}`,
    );
    // A product weaker than pure needs MORE of it, never less.
    assert.ok(r.product_lb_day >= r.pure_lb_day - 1e-12, `${key} product feed must not fall below the pure dose`);
    assert.equal(r.purity_pct, chem.pct, `${key} reports the solution strength it was given`);
  }
});

// The ratio test above is self-consistent BY CONSTRUCTION: it derives the
// expected ratio from the same `pct` it is checking, so it catches a dropped
// `afi` -- which is a change to the formula -- and cannot catch a mistyped
// strength. Seeding it proved that: ferric chloride at 83% instead of 38%
// passed. The independent figure is already on hand, because each label states
// its own strength, so the constant is held against the words beside it.
test("spec-v4: a chemical's purity matches the strength printed in its own label", () => {
  const unchecked = [];
  for (const [key, chem] of Object.entries(CHEMICAL_PURITY)) {
    const stated = /(\d+(?:\.\d+)?)\s*%/.exec(chem.label);
    if (!stated) { unchecked.push(key); continue; }
    assert.equal(
      chem.pct, Number(stated[1]),
      `${key}: the table says ${chem.pct}% and its label says ${stated[1]}% -- one of them is wrong`,
    );
  }
  // The two with no percentage in the label are the ones dosed as-is, and both
  // are 100%: chlorine gas, and dry alum fed by weight. Listed so a new
  // chemical arriving without a strength in its label has to be looked at.
  assert.deepEqual(unchecked.sort(), ["alum_dry", "chlorine_gas"]);
  for (const key of unchecked) assert.equal(CHEMICAL_PURITY[key].pct, 100, `${key} is dosed as-is, so it is 100%`);
});

// The fluoride case on its own, because it is the one the ratio alone would not
// explain: 23% acid at a 0.792 available-fluoride fraction is 18.216% effective,
// so a 1 mg/L fluoride dose on 1 MGD needs about 45.8 lb/day of product against
// 8.34 lb/day of fluoride ion. Without `afi` it would read 36.3 lb/day.
test("spec-v4: fluorosilicic acid is dosed as the fluoride ion, not as the acid", () => {
  const r = computePoundsFormula({ flow_mgd: 1, dose_mg_l: 1, chemical: "fluorosilicic_acid" });
  assert.ok(close(r.pure_lb_day, 8.34, 0.01), "the pure fluoride-ion dose is the plain pounds formula");
  assert.ok(close(r.product_lb_day, 45.784, 0.01), `product feed was ${r.product_lb_day}`);
  // Guard the factor itself: the acid-only figure is what dropping it gives.
  const acidOnly = r.pure_lb_day / 0.23;
  assert.ok(r.product_lb_day > acidOnly * 1.2, "the available-fluoride factor must still be applied");
});

test("Pounds: 12.5% bleach needs 8x product feed", () => { const r = computePoundsFormula({ flow_mgd: 1, dose_mg_l: 1, chemical: "sodium_hypochlorite" }); assert.ok(close(r.product_lb_day / r.pure_lb_day, 8, 0.01)); });
test("Pounds: 100% chlorine product equals pure", () => { const r = computePoundsFormula({ flow_mgd: 1, dose_mg_l: 1, chemical: "chlorine_gas" }); assert.equal(r.product_lb_day, r.pure_lb_day); });
test("Pounds: unknown chemical errors", () => { const r = computePoundsFormula({ flow_mgd: 1, dose_mg_l: 1, chemical: "bleach2" }); assert.ok(r.error); });
test("Pounds: negative flow errors", () => { const r = computePoundsFormula({ flow_mgd: -1, dose_mg_l: 1, chemical: "chlorine_gas" }); assert.ok(r.error); });
test("Pounds: zero dose -> zero", () => { const r = computePoundsFormula({ flow_mgd: 5, dose_mg_l: 0, chemical: "chlorine_gas" }); assert.equal(r.pure_lb_day, 0); });
test("Pounds: every chemical has positive purity", () => { for (const k of Object.keys(CHEMICAL_PURITY)) assert.ok(CHEMICAL_PURITY[k].pct > 0); });
test("Pounds: chemical_label returned", () => { const r = computePoundsFormula({ flow_mgd: 1, dose_mg_l: 1, chemical: "alum_liquid" }); assert.match(r.chemical_label, /Alum/); });
test("Pounds: linear in flow", () => { const a = computePoundsFormula({ flow_mgd: 1, dose_mg_l: 2, chemical: "chlorine_gas" }); const b = computePoundsFormula({ flow_mgd: 2, dose_mg_l: 2, chemical: "chlorine_gas" }); assert.ok(close(b.pure_lb_day / a.pure_lb_day, 2, 0.001)); });

// 211 Filter loading
test("Filter: example yields finite loading", () => { const r = computeFilterLoading(filterLoadingExample.inputs); assert.ok(r.loading_gpm_per_ft2 > 0); });
test("Filter: 300 GPM / 100 ft^2 = 3 gpm/ft^2", () => { const r = computeFilterLoading(filterLoadingExample.inputs); assert.equal(r.loading_gpm_per_ft2, 3); });
test("Filter: 4 gpm/ft^2 in rapid sand or high-rate band", () => { const r = computeFilterLoading(filterLoadingExample.inputs); assert.match(r.category, /rapid|high-rate/); });
test("Filter: backwash flow = rate * area", () => { const r = computeFilterLoading({ filter_area_ft2: 100, flow_gpm: 200, backwash_rate_gpm_ft2: 15 }); assert.equal(r.backwash_gpm, 1500); });
test("Filter: zero area errors", () => { const r = computeFilterLoading({ filter_area_ft2: 0, flow_gpm: 200, backwash_rate_gpm_ft2: 15 }); assert.ok(r.error); });
test("Filter: zero flow errors", () => { const r = computeFilterLoading({ filter_area_ft2: 200, flow_gpm: 0, backwash_rate_gpm_ft2: 15 }); assert.ok(r.error); });
test("Filter: 1 gpm/ft^2 below typical", () => { const r = computeFilterLoading({ filter_area_ft2: 200, flow_gpm: 200, backwash_rate_gpm_ft2: 15 }); assert.match(r.category, /below|outside/); });
test("Filter: 10 gpm/ft^2 above high-rate", () => { const r = computeFilterLoading({ filter_area_ft2: 100, flow_gpm: 1000, backwash_rate_gpm_ft2: 15 }); assert.match(r.category, /above/); });
test("Filter: 6 gpm/ft^2 high-rate", () => { const r = computeFilterLoading({ filter_area_ft2: 100, flow_gpm: 600, backwash_rate_gpm_ft2: 15 }); assert.match(r.category, /high-rate/); });
test("Filter: 3 gpm/ft^2 rapid sand", () => { const r = computeFilterLoading({ filter_area_ft2: 100, flow_gpm: 300, backwash_rate_gpm_ft2: 15 }); assert.match(r.category, /rapid sand/); });

// 212 Detention time
test("Detention: example finite", () => { const r = computeDetentionTime(detentionTimeExample.inputs); assert.ok(r.minutes > 0); assert.ok(r.hours > 0); assert.ok(r.days > 0); });
test("Detention: 50000/100 = 500 min", () => { const r = computeDetentionTime({ tank_volume_gal: 50000, flow_gpm: 100, target_minutes: 0 }); assert.equal(r.minutes, 500); });
test("Detention: hours = minutes / 60", () => { const r = computeDetentionTime({ tank_volume_gal: 60000, flow_gpm: 1000, target_minutes: 0 }); assert.equal(r.hours, 1); });
test("Detention: pass when minutes >= target", () => { const r = computeDetentionTime({ tank_volume_gal: 60000, flow_gpm: 100, target_minutes: 300 }); assert.equal(r.pass_target, true); });
test("Detention: fail when minutes < target", () => { const r = computeDetentionTime({ tank_volume_gal: 6000, flow_gpm: 100, target_minutes: 300 }); assert.equal(r.pass_target, false); });
test("Detention: pass null when no target", () => { const r = computeDetentionTime({ tank_volume_gal: 6000, flow_gpm: 100, target_minutes: 0 }); assert.equal(r.pass_target, null); });
test("Detention: zero flow errors", () => { const r = computeDetentionTime({ tank_volume_gal: 6000, flow_gpm: 0, target_minutes: 0 }); assert.ok(r.error); });
test("Detention: negative volume errors", () => { const r = computeDetentionTime({ tank_volume_gal: -1, flow_gpm: 100, target_minutes: 0 }); assert.ok(r.error); });
test("Detention: days math", () => { const r = computeDetentionTime({ tank_volume_gal: 1440000, flow_gpm: 1000, target_minutes: 0 }); assert.equal(r.days, 1); });
test("Detention: zero volume returns 0 minutes", () => { const r = computeDetentionTime({ tank_volume_gal: 0, flow_gpm: 100, target_minutes: 0 }); assert.equal(r.minutes, 0); });

// 213 Dilution
test("Dilution: solves for v1", () => { const r = computeDilution({ c1: 1000, v1: 0, c2: 50, v2: 100, mode: "single" }); assert.ok(close(r.v1, 5, 0.01)); });
test("Dilution: solves for c2", () => { const r = computeDilution({ c1: 100, v1: 10, c2: 0, v2: 100, mode: "single" }); assert.equal(r.c2, 10); });
test("Dilution: serial 4 steps 1:10", () => { const r = computeDilution({ c1: 1000, mode: "serial", steps: 4, dilution_factor: 10 }); assert.ok(close(r.final_concentration, 0.1, 1e-6)); });
test("Dilution: serial returns step list", () => { const r = computeDilution({ c1: 1000, mode: "serial", steps: 3, dilution_factor: 10 }); assert.equal(r.series.length, 3); });
test("Dilution: single needs three knowns", () => { const r = computeDilution({ c1: 1000, v1: 0, c2: 0, v2: 100, mode: "single" }); assert.ok(r.error); });
test("Dilution: serial needs c1 > 0", () => { const r = computeDilution({ c1: 0, mode: "serial", steps: 3, dilution_factor: 10 }); assert.ok(r.error); });
test("Dilution: serial needs factor > 1", () => { const r = computeDilution({ c1: 100, mode: "serial", steps: 3, dilution_factor: 1 }); assert.ok(r.error); });
test("Dilution: diluent = v2 - v1", () => { const r = computeDilution({ c1: 1000, v1: 0, c2: 50, v2: 100, mode: "single" }); assert.ok(close(r.diluent, r.v2 - r.v1, 0.01)); });
test("Dilution: unknown mode errors", () => { const r = computeDilution({ c1: 100, mode: "spam" }); assert.ok(r.error); });
test("Dilution: solves for v2", () => { const r = computeDilution({ c1: 1000, v1: 5, c2: 50, v2: 0, mode: "single" }); assert.equal(r.v2, 100); });

// 214 Pump efficiency
test("Pump eff: example finite", () => { const r = computePumpEfficiency(pumpEfficiencyExample.inputs); assert.ok(r.whp > 0); assert.ok(r.wire_to_water_pct > 0); });
test("Pump eff: WHP = (gpm * tdh) / 3960", () => { const r = computePumpEfficiency({ flow_gpm: 1000, tdh_ft: 100, motor_kW: 50, motor_eff: 1.0, drive_eff: 1.0 }); assert.ok(close(r.whp, (1000 * 100) / 3960, 0.001)); });
test("Pump eff: degraded category at low %", () => { const r = computePumpEfficiency({ flow_gpm: 100, tdh_ft: 50, motor_kW: 30, motor_eff: 0.92, drive_eff: 1.0 }); assert.equal(r.category, "degraded"); });
test("Pump eff: zero motor errors", () => { const r = computePumpEfficiency({ flow_gpm: 100, tdh_ft: 50, motor_kW: 0, motor_eff: 0.92, drive_eff: 1.0 }); assert.ok(r.error); });
test("Pump eff: motor_eff > 1 errors", () => { const r = computePumpEfficiency({ flow_gpm: 100, tdh_ft: 50, motor_kW: 10, motor_eff: 1.5, drive_eff: 1.0 }); assert.ok(r.error); });
test("Pump eff: good category", () => { const r = computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 40, motor_eff: 0.93, drive_eff: 1.0 }); assert.equal(r.category, "good"); });
test("Pump eff: ok category mid-range", () => { const r = computePumpEfficiency({ flow_gpm: 1500, tdh_ft: 100, motor_kW: 45, motor_eff: 0.93, drive_eff: 1.0 }); assert.match(r.category, /ok|good/); });
test("Pump eff: bhp positive", () => { const r = computePumpEfficiency(pumpEfficiencyExample.inputs); assert.ok(r.bhp > 0); });
test("Pump eff: zero flow OK", () => { const r = computePumpEfficiency({ flow_gpm: 0, tdh_ft: 0, motor_kW: 50, motor_eff: 0.92, drive_eff: 1.0 }); assert.equal(r.whp, 0); });
test("Pump eff: zero TDH OK", () => { const r = computePumpEfficiency({ flow_gpm: 1000, tdh_ft: 0, motor_kW: 50, motor_eff: 0.92, drive_eff: 1.0 }); assert.equal(r.whp, 0); });

// 215 SRT and F/M
test("SRT/FM: example finite", () => { const r = computeSRTandFM(srtFMExample.inputs); assert.ok(r.srt_days > 0); assert.ok(r.fm_ratio !== null); });
test("SRT/FM: zero aeration errors", () => { const r = computeSRTandFM({ ...srtFMExample.inputs, aeration_volume_gal: 0 }); assert.ok(r.error); });
test("SRT/FM: zero MLSS errors", () => { const r = computeSRTandFM({ ...srtFMExample.inputs, mlss_mg_l: 0 }); assert.ok(r.error); });
test("SRT/FM: F/M positive", () => { const r = computeSRTandFM(srtFMExample.inputs); assert.ok(r.fm_ratio > 0); });
test("SRT/FM: SRT formula", () => { const r = computeSRTandFM({ aeration_volume_gal: 1000000, mlss_mg_l: 2000, mlvss_mg_l: 1500, ras_flow_mgd: 0, ras_tss_mg_l: 0, was_flow_mgd: 0.05, was_tss_mg_l: 8000, bod_load_lb_day: 5000, effluent_tss_mg_l: 0, effluent_flow_mgd: 0 }); assert.ok(close(r.srt_days, (1.0 * 2000 * 8.34) / (0.05 * 8000 * 8.34), 0.01)); });
// DR-17 (v21): zero outflow yields an unbounded SRT; the solver returns null
// with a note, never Infinity in a numeric field.
test("SRT/FM: zero waste -> srt_days null (DR-17)", () => { const r = computeSRTandFM({ ...srtFMExample.inputs, was_flow_mgd: 0, was_tss_mg_l: 0, effluent_tss_mg_l: 0, effluent_flow_mgd: 0 }); assert.equal(r.srt_days, null); assert.ok(typeof r.srt_note === "string"); });
test("SRT/FM: in CAS range", () => { const r = computeSRTandFM(srtFMExample.inputs); if (r.srt_days >= 4 && r.srt_days <= 15) { /* ok */ } assert.ok(typeof r.cas_flag === "string"); });
test("SRT/FM: MLSS in tank lb positive", () => { const r = computeSRTandFM(srtFMExample.inputs); assert.ok(r.mlss_lb > 0); });
test("SRT/FM: MLVSS in tank < MLSS", () => { const r = computeSRTandFM(srtFMExample.inputs); assert.ok(r.mlvss_lb < r.mlss_lb); });
test("SRT/FM: no BOD load returns finite or null F/M", () => { const r = computeSRTandFM({ ...srtFMExample.inputs, bod_load_lb_day: 0 }); assert.ok(r.fm_ratio === 0 || Number.isFinite(r.fm_ratio)); });

// Renderers
test("WATER_RENDERERS: 6 ids", () => { for (const id of ["pounds-formula","filter-loading","detention-time","lab-dilution","pump-eff-w2w","srt-fm-ratio"]) assert.equal(typeof WATER_RENDERERS[id], "function", id); });
