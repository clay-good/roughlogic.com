// Unit tests for calc-agriculture.js v4 utilities (203-209).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGPA, gpaExample,
  computeTimberCruise, timberCruiseExample, SCRIBNER_TABLE_16FT,
  computeSeedRate, seedRateExample,
  computeDrawbarPower, drawbarPowerExample, TRACTIVE_EFFICIENCY,
  computeUniformity, uniformityExample,
  computeBulkDensity, bulkDensityExample, COMPACTION_THRESHOLDS_PCC,
  computeCropYield, cropYieldExample, STD_MOISTURE_PCT,
  AGRICULTURE_RENDERERS,
} from "../../calc-agriculture.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 203 GPA
test("GPA: example yields finite GPA", () => { const r = computeGPA(gpaExample.inputs); assert.ok(r.gpa > 0); assert.ok(r.required_gpm > 0); });
test("GPA: formula 5940*GPM/(speed*spacing)", () => { const r = computeGPA({ gpm: 0.5, spacing_in: 20, speed_mph: 5, target_gpa: 0 }); assert.ok(close(r.gpa, (5940 * 0.5) / (5 * 20), 0.001)); });
test("GPA: zero speed errors", () => { const r = computeGPA({ gpm: 0.5, spacing_in: 20, speed_mph: 0, target_gpa: 0 }); assert.ok(r.error); });
test("GPA: zero spacing errors", () => { const r = computeGPA({ gpm: 0.5, spacing_in: 0, speed_mph: 5, target_gpa: 0 }); assert.ok(r.error); });
test("GPA: faster speed lowers GPA", () => { const a = computeGPA({ gpm: 0.5, spacing_in: 20, speed_mph: 5, target_gpa: 0 }); const b = computeGPA({ gpm: 0.5, spacing_in: 20, speed_mph: 10, target_gpa: 0 }); assert.ok(b.gpa < a.gpa); });
test("GPA: target gpa solves for required gpm", () => { const r = computeGPA({ gpm: 0, spacing_in: 20, speed_mph: 5, target_gpa: 25 }); assert.ok(close(r.required_gpm, (25 * 5 * 20) / 5940, 0.001)); });
test("GPA: no target -> required_gpm null", () => { const r = computeGPA({ gpm: 0.5, spacing_in: 20, speed_mph: 5, target_gpa: 0 }); assert.equal(r.required_gpm, null); });
test("GPA: zero gpm yields zero GPA", () => { const r = computeGPA({ gpm: 0, spacing_in: 20, speed_mph: 5, target_gpa: 0 }); assert.equal(r.gpa, 0); });
test("GPA: linear in gpm", () => { const a = computeGPA({ gpm: 0.5, spacing_in: 20, speed_mph: 5, target_gpa: 0 }); const b = computeGPA({ gpm: 1.0, spacing_in: 20, speed_mph: 5, target_gpa: 0 }); assert.ok(close(b.gpa / a.gpa, 2, 0.001)); });
test("GPA: bigger spacing lowers GPA", () => { const a = computeGPA({ gpm: 0.5, spacing_in: 20, speed_mph: 5, target_gpa: 0 }); const b = computeGPA({ gpm: 0.5, spacing_in: 40, speed_mph: 5, target_gpa: 0 }); assert.ok(close(b.gpa / a.gpa, 0.5, 0.001)); });

// 204 Timber cruise
test("Timber: Doyle (D-4)^2*L/16", () => { const r = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "doyle" }); assert.equal(r.board_feet, 100); });
test("Timber: International formula", () => { const r = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "international" }); assert.ok(close(r.board_feet, 0.22 * 196 - 0.71 * 14, 0.01)); });
test("Timber: Scribner table 14 in -> 114 BF", () => { const r = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "scribner" }); assert.equal(r.board_feet, 114); });
test("Timber: scales linearly with length", () => { const a = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "doyle" }); const b = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 32, rule: "doyle" }); assert.ok(close(b.board_feet / a.board_feet, 2, 0.001)); });
test("Timber: zero diameter errors", () => { const r = computeTimberCruise({ small_end_dib_in: 0, log_length_ft: 16, rule: "doyle" }); assert.ok(r.error); });
test("Timber: zero length errors", () => { const r = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 0, rule: "doyle" }); assert.ok(r.error); });
test("Timber: unknown rule errors", () => { const r = computeTimberCruise({ small_end_dib_in: 14, log_length_ft: 16, rule: "x" }); assert.ok(r.error); });
test("Timber: Doyle clamps to zero at D <= 4", () => { const r = computeTimberCruise({ small_end_dib_in: 4, log_length_ft: 16, rule: "doyle" }); assert.equal(r.board_feet, 0); });
test("Timber: Scribner table monotonic", () => { const keys = Object.keys(SCRIBNER_TABLE_16FT).map(Number).sort((a, b) => a - b); for (let i = 1; i < keys.length; i++) assert.ok(SCRIBNER_TABLE_16FT[keys[i]] > SCRIBNER_TABLE_16FT[keys[i - 1]]); });
test("Timber: notes string set per rule", () => { const r = computeTimberCruise(timberCruiseExample.inputs); assert.ok(r.note.length > 0); });

// 205 Seed rate
test("Seed rate: example finite", () => { const r = computeSeedRate(seedRateExample.inputs); assert.ok(r.seeds_per_acre > 0); assert.ok(r.lbs_per_acre > 0); });
test("Seed rate: target population / germ", () => { const r = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 30000, seeds_per_lb: 1500, germination_pct: 100, seed_price_per_lb: 0 }); assert.equal(r.seeds_per_acre, 30000); });
test("Seed rate: low germ raises seed count", () => { const a = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 30000, seeds_per_lb: 1500, germination_pct: 100, seed_price_per_lb: 0 }); const b = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 30000, seeds_per_lb: 1500, germination_pct: 50, seed_price_per_lb: 0 }); assert.ok(b.seeds_per_acre > a.seeds_per_acre); });
test("Seed rate: in-row spacing path", () => { const r = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 6, target_pop_per_acre: 0, seeds_per_lb: 1500, germination_pct: 100, seed_price_per_lb: 0 }); assert.ok(close(r.seeds_per_acre, 6272640 / (30 * 6), 0.5)); });
test("Seed rate: cost null without price", () => { const r = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 30000, seeds_per_lb: 1500, germination_pct: 95, seed_price_per_lb: 0 }); assert.equal(r.cost_per_acre, null); });
test("Seed rate: cost positive with price", () => { const r = computeSeedRate(seedRateExample.inputs); assert.ok(r.cost_per_acre > 0); });
test("Seed rate: no target / no spacing errors", () => { const r = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 0, seeds_per_lb: 1500, germination_pct: 95, seed_price_per_lb: 0 }); assert.ok(r.error); });
test("Seed rate: zero seeds/lb errors", () => { const r = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 30000, seeds_per_lb: 0, germination_pct: 95, seed_price_per_lb: 0 }); assert.ok(r.error); });
test("Seed rate: germ > 100 errors", () => { const r = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 30000, seeds_per_lb: 1500, germination_pct: 150, seed_price_per_lb: 0 }); assert.ok(r.error); });
test("Seed rate: lbs = seeds / seedsPerLb", () => { const r = computeSeedRate({ row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 30000, seeds_per_lb: 1500, germination_pct: 100, seed_price_per_lb: 0 }); assert.ok(close(r.lbs_per_acre, 30000 / 1500, 0.001)); });

// 206 Drawbar power
test("Drawbar: example finite", () => { const r = computeDrawbarPower(drawbarPowerExample.inputs); assert.ok(r.drawbar_hp > 0); });
test("Drawbar: HP = pull*speed/375", () => { const r = computeDrawbarPower({ pull_lb: 3750, speed_mph: 5, surface: "firm_soil" }); assert.equal(r.drawbar_hp, 50); });
test("Drawbar: PTO = DBHP / efficiency", () => { const r = computeDrawbarPower({ pull_lb: 3750, speed_mph: 5, surface: "firm_soil" }); assert.ok(close(r.pto_hp_estimate, 50 / 0.72, 0.01)); });
test("Drawbar: zero pull errors", () => { const r = computeDrawbarPower({ pull_lb: 0, speed_mph: 5, surface: "firm_soil" }); assert.ok(r.error); });
test("Drawbar: unknown surface errors", () => { const r = computeDrawbarPower({ pull_lb: 1000, speed_mph: 5, surface: "x" }); assert.ok(r.error); });
test("Drawbar: concrete most efficient", () => { assert.ok(TRACTIVE_EFFICIENCY.concrete > TRACTIVE_EFFICIENCY.sand); });
test("Drawbar: faster speed -> more HP", () => { const a = computeDrawbarPower({ pull_lb: 1000, speed_mph: 3, surface: "firm_soil" }); const b = computeDrawbarPower({ pull_lb: 1000, speed_mph: 6, surface: "firm_soil" }); assert.ok(close(b.drawbar_hp / a.drawbar_hp, 2, 0.001)); });
test("Drawbar: every efficiency 0-1", () => { for (const k of Object.keys(TRACTIVE_EFFICIENCY)) { const e = TRACTIVE_EFFICIENCY[k]; assert.ok(e > 0 && e <= 1); } });
test("Drawbar: tractive_efficiency returned", () => { const r = computeDrawbarPower({ pull_lb: 1000, speed_mph: 4, surface: "tilled_soil" }); assert.equal(r.tractive_efficiency, 0.55); });
test("Drawbar: zero speed errors", () => { const r = computeDrawbarPower({ pull_lb: 1000, speed_mph: 0, surface: "firm_soil" }); assert.ok(r.error); });

// 207 Uniformity
test("Uniformity: uniform readings -> CU 100", () => { const r = computeUniformity({ catch_volumes: [1, 1, 1, 1, 1, 1, 1, 1] }); assert.ok(close(r.CU, 100, 0.001)); });
test("Uniformity: example finite", () => { const r = computeUniformity(uniformityExample.inputs); assert.ok(r.CU > 0 && r.CU <= 100); });
test("Uniformity: <4 readings errors", () => { const r = computeUniformity({ catch_volumes: [1, 1, 1] }); assert.ok(r.error); });
test("Uniformity: pass at CU >= 85", () => { const r = computeUniformity({ catch_volumes: [1, 1, 1, 1, 1, 1, 1, 1] }); assert.equal(r.pass_CU_85, true); });
test("Uniformity: fail when very uneven", () => { const r = computeUniformity({ catch_volumes: [1, 1, 1, 1, 0.1, 0.1, 0.1, 0.1] }); assert.equal(r.pass_CU_85, false); });
test("Uniformity: DU returns finite", () => { const r = computeUniformity(uniformityExample.inputs); assert.ok(r.DU > 0 && r.DU <= 100); });
test("Uniformity: zero readings filtered", () => { const r = computeUniformity({ catch_volumes: [1, 1, 1, 1, 0, 0] }); assert.ok(r.CU !== undefined); });
test("Uniformity: mean returned positive", () => { const r = computeUniformity(uniformityExample.inputs); assert.ok(r.mean > 0); });
test("Uniformity: extreme low quartile fails DU 75", () => { const r = computeUniformity({ catch_volumes: [10, 10, 10, 10, 10, 10, 10, 1] }); assert.equal(r.pass_DU_75, false); });
test("Uniformity: many readings still works", () => { const arr = []; for (let i = 0; i < 24; i++) arr.push(1); const r = computeUniformity({ catch_volumes: arr }); assert.ok(close(r.CU, 100, 0.001)); });

// 208 Bulk density
test("Bulk density: example finite", () => { const r = computeBulkDensity(bulkDensityExample.inputs); assert.ok(r.bulk_density > 0); assert.ok(r.total_porosity > 0 && r.total_porosity < 1); });
test("Bulk density: 200/150 = 1.333", () => { const r = computeBulkDensity(bulkDensityExample.inputs); assert.ok(close(r.bulk_density, 200 / 150, 0.001)); });
test("Bulk density: porosity = 1 - bulk/particle", () => { const r = computeBulkDensity(bulkDensityExample.inputs); assert.ok(close(r.total_porosity, 1 - (r.bulk_density / 2.65), 0.001)); });
test("Bulk density: compacted flag at threshold", () => { const r = computeBulkDensity({ dry_mass_g: 200, core_volume_cc: 100, particle_density_pcc: 2.65, texture: "loam" }); assert.equal(r.compacted, true); });
test("Bulk density: not compacted below threshold", () => { const r = computeBulkDensity({ dry_mass_g: 100, core_volume_cc: 100, particle_density_pcc: 2.65, texture: "loam" }); assert.equal(r.compacted, false); });
test("Bulk density: zero mass errors", () => { const r = computeBulkDensity({ dry_mass_g: 0, core_volume_cc: 100, particle_density_pcc: 2.65, texture: "loam" }); assert.ok(r.error); });
test("Bulk density: zero volume errors", () => { const r = computeBulkDensity({ dry_mass_g: 100, core_volume_cc: 0, particle_density_pcc: 2.65, texture: "loam" }); assert.ok(r.error); });
test("Bulk density: unknown texture errors", () => { const r = computeBulkDensity({ dry_mass_g: 100, core_volume_cc: 100, particle_density_pcc: 2.65, texture: "x" }); assert.ok(r.error); });
test("Bulk density: every threshold positive", () => { for (const k of Object.keys(COMPACTION_THRESHOLDS_PCC)) assert.ok(COMPACTION_THRESHOLDS_PCC[k] > 0); });
test("Bulk density: clay threshold lowest", () => { assert.ok(COMPACTION_THRESHOLDS_PCC.clay < COMPACTION_THRESHOLDS_PCC.sand); });

// 209 Crop yield
test("Crop yield: example finite", () => { const r = computeCropYield(cropYieldExample.inputs); assert.ok(r.yield_bu_per_acre > 0); });
test("Crop yield: drier crop higher yield (after moisture adj)", () => { const a = computeCropYield({ ...cropYieldExample.inputs, current_moisture_pct: 25 }); const b = computeCropYield({ ...cropYieldExample.inputs, current_moisture_pct: 15 }); assert.ok(b.yield_bu_per_acre > a.yield_bu_per_acre); });
test("Crop yield: unknown crop errors", () => { const r = computeCropYield({ ...cropYieldExample.inputs, crop: "rutabaga" }); assert.ok(r.error); });
test("Crop yield: zero length errors", () => { const r = computeCropYield({ ...cropYieldExample.inputs, measured_length_ft: 0 }); assert.ok(r.error); });
test("Crop yield: zero rows errors", () => { const r = computeCropYield({ ...cropYieldExample.inputs, rows_per_pass: 0 }); assert.ok(r.error); });
test("Crop yield: moisture > 100 errors", () => { const r = computeCropYield({ ...cropYieldExample.inputs, current_moisture_pct: 150 }); assert.ok(r.error); });
test("Crop yield: harvest_loss_pct null without inputs", () => { const r = computeCropYield(cropYieldExample.inputs); assert.equal(r.harvest_loss_pct, null); });
test("Crop yield: harvest_loss_pct positive with ground-loss", () => { const r = computeCropYield({ ...cropYieldExample.inputs, ground_loss_lb_in_area: 1, ground_loss_area_ft2: 100 }); assert.ok(r.harvest_loss_pct > 0); });
test("Crop yield: corn standard moisture 15.5", () => { assert.equal(STD_MOISTURE_PCT.corn, 15.5); });
test("Crop yield: soy standard moisture 13", () => { assert.equal(STD_MOISTURE_PCT.soy, 13); });

// Renderers
test("AGRICULTURE_RENDERERS: 7 ids", () => { for (const id of ["gpa-rate","timber-cruise","seed-rate","drawbar-power","irrigation-uniformity","bulk-density","crop-yield"]) assert.equal(typeof AGRICULTURE_RENDERERS[id], "function", id); });
